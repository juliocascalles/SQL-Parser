import { parseSqlStringToData, ParsedSqlQuery, OrderByItem, splitSmart } from "./parser";
import { splitTopLevelJunction } from "./translate";

export interface ParsedCond {
  field: string;
  op: string; // "=" or "IN"
  vals: string[]; // list of values, e.g. ["18", "'abc'"]
}

// Strip outer parentheses of a expression string safely
export function stripOuterParens(str: string): string {
  let clean = str.trim();
  while (clean.startsWith("(") && clean.endsWith(")")) {
    let depth = 0;
    let matched = true;
    for (let i = 0; i < clean.length - 1; i++) {
      const char = clean[i];
      if (char === "(") depth++;
      else if (char === ")") {
        depth--;
        if (depth === 0) {
          matched = false;
          break;
        }
      }
    }
    if (matched && depth === 1 && clean[clean.length - 1] === ")") {
      clean = clean.substring(1, clean.length - 1).trim();
    } else {
      break;
    }
  }
  return clean;
}

// Parse a clean filter expression part into a Field, Operator, and Values structure
export function tryParseSimpleFilter(part: string): ParsedCond | null {
  const clean = stripOuterParens(part);
  
  // Look for IN clause, e.g., "categoria IN (18, 35, 74)"
  const inMatch = /^([A-Za-z0-9_.]+)\s+IN\s*\(([^)]+)\)$/i.exec(clean);
  if (inMatch) {
    const vals = inMatch[2].split(",").map(v => v.trim()).filter(Boolean);
    return {
      field: inMatch[1].trim(),
      op: "IN",
      vals
    };
  }

  // Look for equals clause, e.g., "categoria = 18" or "status = 'A'"
  const eqMatch = /^([A-Za-z0-9_.]+)\s*=\s*('[^']+'|"[^"]+"|[A-Za-z0-9_.-]+)$/i.exec(clean);
  if (eqMatch) {
    return {
      field: eqMatch[1].trim(),
      op: "=",
      vals: [eqMatch[2].trim()]
    };
  }
  
  return null;
}

// 1. Convert YEAR(field) = year to field BETWEEN 'year-01-01' AND 'year-12-31'
export function optimizeYearFilter(sql: string): string {
  return sql.replace(/\bYEAR\s*\(\s*([A-Za-z0-9_.]+)\s*\)\s*=\s*['"]?(\d{4})['"]?/gi, (match, field, year) => {
    return `${field} BETWEEN '${year}-01-01' AND '${year}-12-31'`;
  });
}

// Helper to extract base name for table prefix matching (e.g. "t.id" -> "id")
export function getColumnBaseName(expr: string): string {
  const parts = expr.split(".");
  return parts[parts.length - 1].trim().toLowerCase();
}

// 2. Ensure fields in GROUP BY or ORDER BY are in the SELECT clause
export function addMissingSelectFields(parsed: ParsedSqlQuery): ParsedSqlQuery {
  const hasStar = parsed.selectFields.some(f => f.trim() === "*");
  
  // Track existing select fields, aliases and base column names
  const existingSelects = new Set<string>();
  const existingBases = new Set<string>();
  
  for (const f of parsed.selectFields) {
    const cleanF = f.trim();
    if (!cleanF) continue;
    
    existingSelects.add(cleanF.toLowerCase());
    
    // Check "expr AS alias" or space-separated alias "expr alias"
    const aliasMatch = /\s+AS\s+(.+)$/i.exec(cleanF);
    let expr = cleanF;
    if (aliasMatch) {
      expr = cleanF.substring(0, aliasMatch.index).trim();
      existingSelects.add(aliasMatch[1].trim().toLowerCase());
      existingBases.add(getColumnBaseName(aliasMatch[1].trim()));
    } else {
      const lastSpaceIdx = cleanF.lastIndexOf(" ");
      if (lastSpaceIdx !== -1 && !cleanF.includes(")")) {
        const potentialAlias = cleanF.substring(lastSpaceIdx + 1).trim();
        if (/^[A-Za-z0-9_]+$/.test(potentialAlias)) {
          expr = cleanF.substring(0, lastSpaceIdx).trim();
          existingSelects.add(potentialAlias.toLowerCase());
          existingBases.add(getColumnBaseName(potentialAlias));
        }
      }
    }
    
    existingSelects.add(expr.toLowerCase());
    existingBases.add(getColumnBaseName(expr));
  }

  const toAdd: string[] = [];
  
  // Check GROUP BY fields
  for (const gb of parsed.groupByFields) {
    const cleanGb = gb.trim();
    if (!cleanGb) continue;
    const gbLower = cleanGb.toLowerCase();
    const gbBase = getColumnBaseName(cleanGb);
    
    if (!existingSelects.has(gbLower) && !existingBases.has(gbBase)) {
      toAdd.push(cleanGb);
      existingSelects.add(gbLower);
      existingBases.add(gbBase);
    }
  }
  
  // Check ORDER BY fields
  for (const ob of parsed.orderByFields) {
    const cleanOb = ob.column.trim();
    if (!cleanOb) continue;
    const obLower = cleanOb.toLowerCase();
    const obBase = getColumnBaseName(cleanOb);
    
    if (!existingSelects.has(obLower) && !existingBases.has(obBase)) {
      toAdd.push(cleanOb);
      existingSelects.add(obLower);
      existingBases.add(obBase);
    }
  }
  
  if (toAdd.length > 0) {
    // If SELECT *, technically it has everything but users are explicit or we can keep "*" and append
    return {
      ...parsed,
      selectFields: [...parsed.selectFields, ...toAdd]
    };
  }
  
  return parsed;
}

// 3. Recursive condition optimizer to group multiple OR filters into single IN
export function optimizeCondition(condStr: string): string {
  const trimmed = condStr.trim();
  if (!trimmed) return "";
  
  // Handle matching outer parentheses safely
  let clean = trimmed;
  let hasOuterParens = false;
  while (clean.startsWith("(") && clean.endsWith(")")) {
    let depth = 0;
    let matched = true;
    for (let i = 0; i < clean.length - 1; i++) {
      if (clean[i] === "(") depth++;
      else if (clean[i] === ")") {
        depth--;
        if (depth === 0) {
          matched = false;
          break;
        }
      }
    }
    if (matched && depth === 1 && clean[clean.length - 1] === ")") {
      clean = clean.substring(1, clean.length - 1).trim();
      hasOuterParens = true;
    } else {
      break;
    }
  }
  
  // Split by top-level AND/OR junctions
  const junction = splitTopLevelJunction(clean);
  if (!junction.type) {
    // Leaf node: Optimize Year filters inside single conditions
    let leaf = optimizeYearFilter(clean);
    return hasOuterParens ? `(${leaf})` : leaf;
  }
  
  // Recursively process child condition parts
  const optimizedParts = junction.parts.map(p => optimizeCondition(p));
  
  if (junction.type === "OR") {
    // Group identical fields in flat OR arrays
    const counts: Record<string, number> = {};
    const parsed: (ParsedCond | null)[] = [];
    
    for (const part of optimizedParts) {
      const p = tryParseSimpleFilter(part);
      parsed.push(p);
      if (p) {
        counts[p.field] = (counts[p.field] || 0) + 1;
      }
    }
    
    const combinedFields = new Set<string>();
    for (const field of Object.keys(counts)) {
      if (counts[field] >= 2) {
        combinedFields.add(field);
      }
    }
    
    const finalParts: string[] = [];
    const fieldValues: Record<string, string[]> = {};
    
    for (let i = 0; i < optimizedParts.length; i++) {
      const part = optimizedParts[i];
      const p = parsed[i];
      
      if (p && combinedFields.has(p.field)) {
        if (!fieldValues[p.field]) {
          fieldValues[p.field] = [];
        }
        for (const val of p.vals) {
          if (!fieldValues[p.field].includes(val)) {
            fieldValues[p.field].push(val);
          }
        }
      } else {
        finalParts.push(part);
      }
    }
    
    // Add consolidated IN statements first for clean UI representation
    for (const field of combinedFields) {
      const vals = fieldValues[field];
      finalParts.unshift(`${field} IN (${vals.join(", ")})`);
    }
    
    const rebuilt = finalParts.join(" OR ");
    return hasOuterParens ? `(${rebuilt})` : rebuilt;
  } else {
    // Junction type AND -> Join recursively optimized parts
    const rebuilt = optimizedParts.join(" AND ");
    return hasOuterParens ? `(${rebuilt})` : rebuilt;
  }
}

// Master Optimizer Function
export function optimizeSqlQuery(sql: string): string {
  if (!sql.trim()) return "";
  
  try {
    const rawParsed = parseSqlStringToData(sql);
    
    // 1 & 3: Run recursive condition optimizer on WHERE string and each JOIN's ON conditions
    const optimizedWhere = rawParsed.whereCondition ? optimizeCondition(rawParsed.whereCondition) : "";
    
    const optimizedJoins = rawParsed.joins.map(join => {
      const optimizedOn = join.onCondition ? optimizeCondition(join.onCondition) : "";
      return {
        ...join,
        onCondition: optimizedOn
      };
    });
    
    let parsed = {
      ...rawParsed,
      whereCondition: optimizedWhere,
      joins: optimizedJoins
    };

    // 2: Force append missing select fields referenced in ORDER BY and GROUP BY
    parsed = addMissingSelectFields(parsed);

    // Reconstruct the safe SQL Statement
    const selectClause = parsed.selectFields.length > 0 ? parsed.selectFields.join(", ") : "*";
    let optimizedSql = `SELECT ${selectClause} FROM ${parsed.mainTable}`;
    
    for (const join of parsed.joins) {
      const onStr = join.onCondition ? ` ON ${join.onCondition}` : "";
      optimizedSql += ` ${join.joinType} ${join.table}${onStr}`;
    }
    
    if (parsed.whereCondition) {
      optimizedSql += ` WHERE ${parsed.whereCondition}`;
    }
    
    if (parsed.groupByFields.length > 0) {
      optimizedSql += ` GROUP BY ${parsed.groupByFields.join(", ")}`;
    }
    
    if (parsed.orderByFields.length > 0) {
      const orders = parsed.orderByFields.map(o => `${o.column} ${o.direction}`).join(", ");
      optimizedSql += ` ORDER BY ${orders}`;
    }
    
    if (parsed.limit) {
      optimizedSql += ` LIMIT ${parsed.limit}`;
    }
    
    return optimizedSql;
  } catch (err) {
    console.error("Failed to parse and optimize SQL:", err);
    // Return original if query optimization crashes to preserve user inputs
    return sql;
  }
}
