import { parseSqlStringToData, ParsedSqlQuery, OrderByItem, splitSmart, JoinData } from "./parser";
import { splitTopLevelJunction, replaceCommentsWithSpaces } from "./translate";

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

// Check if a filter component is a trivial true check (e.g. 1=1)
export function isTrivialTrue(str: string): boolean {
  if (!str) return false;
  const clean = stripOuterParens(str).trim().replace(/\s+/g, "");
  return clean === "1=1" || clean === "1==1" || clean === "'1'='1'" || clean === "'1'=='1'" || clean === '"1"="1"' || clean === '"1"=="1"';
}

// Extract fields used in filter conditions to move them to SELECT clause safely
export function extractFieldsFromCondition(cond: string): string[] {
  if (!cond) return [];
  // Strip out string literals enclosed in single or double quotes
  let cleanCond = cond.replace(/'[^']*'/g, "");
  cleanCond = cleanCond.replace(/"[^"]*"/g, "");
  
  const words = cleanCond.match(/\b[A-Za-z_][A-Za-z0-9_.]*\b/g) || [];
  const keywords = new Set([
    "and", "or", "not", "in", "like", "between", "is", "null", "on", "join",
    "select", "from", "where", "group", "by", "order", "limit", "as", "year",
    "count", "sum", "avg", "max", "min"
  ]);
  const fields: string[] = [];
  for (const word of words) {
    if (!keywords.has(word.toLowerCase()) && isNaN(Number(word))) {
      fields.push(word);
    }
  }
  return fields;
}

export interface SubqueryMatch {
  field: string;
  subquerySql: string;
  fullMatchString: string; // the entire "field IN (SELECT ...)" substring to replace
}

// Walk through the WHERE clause and parse the subquery match safely returning balanced parentheses
export function findSubquery(where: string): SubqueryMatch | null {
  if (!where) return null;
  const cleanWhere = replaceCommentsWithSpaces(where);
  const regex = /\b([A-Za-z0-9_.-]+)\s+IN\s*\(\s*SELECT\b/gi;
  let match;
  while ((match = regex.exec(cleanWhere)) !== null) {
    const field = match[1];
    const startIndex = match.index;
    const firstOpenParenIndex = cleanWhere.indexOf("(", startIndex);
    if (firstOpenParenIndex === -1) continue;

    let parenDepth = 1;
    let endIndex = -1;
    for (let i = firstOpenParenIndex + 1; i < cleanWhere.length; i++) {
      const char = cleanWhere[i];
      if (char === "(") parenDepth++;
      else if (char === ")") parenDepth--;

      if (parenDepth === 0) {
        endIndex = i;
        break;
      }
    }

    if (endIndex !== -1) {
      const subquerySql = where.substring(firstOpenParenIndex + 1, endIndex).trim();
      const fullMatchString = where.substring(startIndex, endIndex + 1);
      return {
        field,
        subquerySql,
        fullMatchString
      };
    }
  }
  return null;
}

// 2. Identify and convert subqueries into flat JOIN relations
export function optimizeSubqueries(parsed: ParsedSqlQuery): ParsedSqlQuery {
  let hasMore = true;
  let currentParsed = { ...parsed };
  let loops = 0; // Prevent infinite loop in case of bad parse
  
  while (hasMore && loops < 10) {
    loops++;
    const subqueryMatch = findSubquery(currentParsed.whereCondition);
    if (!subqueryMatch) {
      hasMore = false;
      break;
    }
    
    try {
      const { field, subquerySql, fullMatchString } = subqueryMatch;
      const subParsed = parseSqlStringToData(subquerySql);
      if (!subParsed.mainTable || subParsed.selectFields.length === 0) {
        // Bad or empty subquery, skip optimizing
        hasMore = false;
        break;
      }
      
      const firstSubField = subParsed.selectFields[0];
      const mainSelectsLower = new Set(currentParsed.selectFields.map(f => f.toLowerCase().trim()));
      
      const extraSelects: string[] = [];
      // Move other select fields (slice(1))
      for (const f of subParsed.selectFields.slice(1)) {
        if (!mainSelectsLower.has(f.toLowerCase().trim())) {
          extraSelects.push(f);
          mainSelectsLower.add(f.toLowerCase().trim());
        }
      }
      // Move fields from whereCondition
      const whereFields = extractFieldsFromCondition(subParsed.whereCondition);
      for (const wf of whereFields) {
        if (!mainSelectsLower.has(wf.toLowerCase().trim()) && wf.toLowerCase() !== firstSubField.toLowerCase()) {
          extraSelects.push(wf);
          mainSelectsLower.add(wf.toLowerCase().trim());
        }
      }
      
      currentParsed.selectFields = [...currentParsed.selectFields, ...extraSelects];
      currentParsed.orderByFields = [...currentParsed.orderByFields, ...subParsed.orderByFields];
      
      const currentGroupByLower = new Set(currentParsed.groupByFields.map(g => g.toLowerCase().trim()));
      for (const gb of subParsed.groupByFields) {
        if (!currentGroupByLower.has(gb.toLowerCase().trim())) {
          currentParsed.groupByFields.push(gb);
        }
      }
      
      // Add join condition
      const joinCondition = `(${field} = ${firstSubField})`;
      currentParsed.joins.push({
        joinType: "JOIN",
        table: subParsed.mainTable,
        onCondition: joinCondition
      });
      currentParsed.joins.push(...subParsed.joins);
      
      // Update where condition: replace the exact matched subquery with its internal conditions (or 1=1 if none)
      const replacement = subParsed.whereCondition ? `(${subParsed.whereCondition})` : "1=1";
      const idx = currentParsed.whereCondition.indexOf(fullMatchString);
      if (idx !== -1) {
        currentParsed.whereCondition = 
          currentParsed.whereCondition.substring(0, idx) + 
          replacement + 
          currentParsed.whereCondition.substring(idx + fullMatchString.length);
      }
    } catch (err) {
      console.error("Subquery optimization error:", err);
      hasMore = false;
    }
  }
  
  return currentParsed;
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
    return {
      ...parsed,
      selectFields: [...parsed.selectFields, ...toAdd]
    };
  }
  
  return parsed;
}

// 3. Recursive condition optimizer to group multiple OR filters into single IN, remove 1=1 trivial conditions
export function optimizeCondition(condStr: string): string {
  const trimmed = condStr.trim();
  if (!trimmed) return "";
  
  if (isTrivialTrue(trimmed)) {
    return "";
  }
  
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

  if (isTrivialTrue(clean)) {
    return "";
  }
  
  // Split by top-level AND/OR junctions
  const junction = splitTopLevelJunction(clean);
  if (!junction.type) {
    // Leaf node: Optimize Year filters inside single conditions (even if they contain comments)
    let leaf = optimizeYearFilter(clean);
    return hasOuterParens ? `(${leaf})` : leaf;
  }
  
  // Recursively process child condition parts
  const optimizedParts = junction.parts
    .map(p => optimizeCondition(p))
    .filter(p => p.trim() !== "");
  
  if (optimizedParts.length === 0) {
    return "";
  }
  if (optimizedParts.length === 1) {
    const single = optimizedParts[0];
    return hasOuterParens ? `(${single})` : single;
  }
  
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
    
    const safeParts = finalParts.map(p => {
      if (p.includes("--") && !p.endsWith("\n")) {
        return p + "\n";
      }
      return p;
    });
    const rebuilt = safeParts.join(" OR ");
    return hasOuterParens ? `(${rebuilt})` : rebuilt;
  } else {
    // Junction type AND -> Join recursively optimized parts
    const safeParts = optimizedParts.map(p => {
      if (p.includes("--") && !p.endsWith("\n")) {
        return p + "\n";
      }
      return p;
    });
    const rebuilt = safeParts.join(" AND ");
    return hasOuterParens ? `(${rebuilt})` : rebuilt;
  }
}

// Custom high-fidelity clause extractor that preserves original comments
export function extractRawClausesWithComments(sql: string): Record<string, string> {
  const keywords = [
    { key: "SELECT", regex: /^SELECT\b/i },
    { key: "FROM", regex: /^FROM\b/i },
    { key: "WHERE", regex: /^WHERE\b/i },
    { key: "GROUP BY", regex: /^GROUP\s+BY\b/i },
    { key: "ORDER BY", regex: /^ORDER\s+BY\b/i },
    { key: "LIMIT", regex: /^LIMIT\b/i }
  ];

  interface Match {
    key: string;
    index: number;
    length: number;
  }

  const matches: Match[] = [];

  let parenDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let inSingleLineComment = false;
  let inMultiLineComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];

    if (inSingleLineComment) {
      if (char === "\n") {
        inSingleLineComment = false;
      }
      continue;
    }

    if (inMultiLineComment) {
      if (char === "*" && sql[i + 1] === "/") {
        inMultiLineComment = false;
        i++;
      }
      continue;
    }

    if (char === "\\" && (inSingleQuote || inDoubleQuote || inBacktick)) {
      i++;
      continue;
    }

    if (char === "'" && !inDoubleQuote && !inBacktick) {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (char === '"' && !inSingleQuote && !inBacktick) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    if (char === "`" && !inSingleQuote && !inDoubleQuote) {
      inBacktick = !inBacktick;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      if (char === "/" && sql[i + 1] === "*") {
        inMultiLineComment = true;
        i++;
        continue;
      }
      if (char === "-" && sql[i + 1] === "-") {
        inSingleLineComment = true;
        i++;
        continue;
      }

      if (char === "(") {
        parenDepth++;
        continue;
      }
      if (char === ")") {
        parenDepth--;
        continue;
      }

      if (parenDepth === 0) {
        const remaining = sql.substring(i);
        let matchedKey = false;
        let matchedLen = 0;
        let keyName = "";

        for (const kw of keywords) {
          if (kw.regex.test(remaining)) {
            const spacesMatch = kw.regex.exec(remaining);
            if (spacesMatch) {
              keyName = kw.key;
              matchedLen = spacesMatch[0].length;
              matchedKey = true;
              break;
            }
          }
        }

        if (matchedKey) {
          matches.push({ key: keyName, index: i, length: matchedLen });
          i += matchedLen - 1;
        }
      }
    }
  }

  // Sort matches by index
  matches.sort((a, b) => a.index - b.index);

  const rawClauses: Record<string, string> = {
    SELECT: "",
    FROM: "",
    WHERE: "",
    GROUP_BY: "",
    ORDER_BY: "",
    LIMIT: ""
  };

  for (let k = 0; k < matches.length; k++) {
    const current = matches[k];
    const valStart = current.index + current.length;
    const valEnd = (k + 1 < matches.length) ? matches[k + 1].index : sql.length;
    let snippet = sql.substring(valStart, valEnd).trim();

    if (snippet.endsWith(";")) {
      snippet = snippet.slice(0, -1).trim();
    }

    const dictKey = current.key.replace(" ", "_"); // GROUP BY -> GROUP_BY
    rawClauses[dictKey] = snippet;
  }

  return rawClauses;
}

// Master Optimizer Function
export function optimizeSqlQuery(sql: string): string {
  if (!sql.trim()) return "";
  
  try {
    let parsed = parseSqlStringToData(sql);
    
    // Load raw WHERE condition preserving comments
    const rawClauses = extractRawClausesWithComments(sql);
    if (rawClauses.WHERE) {
      parsed.whereCondition = rawClauses.WHERE;
    }
    
    // 1. Run recursive condition optimizer on WHERE string and each JOIN's ON conditions first
    const optimizedWhere = parsed.whereCondition ? optimizeCondition(parsed.whereCondition) : "";
    
    const optimizedJoins = parsed.joins.map(join => {
      const optimizedOn = join.onCondition ? optimizeCondition(join.onCondition) : "";
      return {
        ...join,
        onCondition: optimizedOn
      };
    });
    
    parsed = {
      ...parsed,
      whereCondition: optimizedWhere,
      joins: optimizedJoins
    };

    // 2. Force append missing select fields referenced in ORDER BY and GROUP BY
    parsed = addMissingSelectFields(parsed);

    // 3. Convert subqueries to JOIN relations LAST (as requested)
    parsed = optimizeSubqueries(parsed);
    
    // Run condition optimization one last time on final where strings
    if (parsed.whereCondition) {
      parsed.whereCondition = optimizeCondition(parsed.whereCondition);
    }
    parsed.joins = parsed.joins.map(join => ({
      ...join,
      onCondition: join.onCondition ? optimizeCondition(join.onCondition) : ""
    }));

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
