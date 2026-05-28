import { parseSqlStringToData, ParsedSqlQuery, JoinData, OrderByItem } from "./parser";

// Interface for condition structures
interface SingleCondition {
  field: string;
  operator: string; // "=", ">", "<", ">=", "<=", "!=", "<>", "LIKE"
  value: string;
}

// Strip outer quotes of string literals
export function cleanValueQuotes(val: string): string {
  let cleanValue = val.trim();
  if ((cleanValue.startsWith("'") && cleanValue.endsWith("'")) ||
      (cleanValue.startsWith('"') && cleanValue.endsWith('"'))) {
    return cleanValue.substring(1, cleanValue.length - 1);
  }
  return cleanValue;
}

// Remove dot prefixes and brackets/backticks/quotes from table fields (e.g., c.[regiao] -> regiao)
export function cleanFieldName(field: string): string {
  const parts = field.split(".");
  return parts[parts.length - 1].trim().replace(/[\[\]`"]/g, "");
}

// Extract table name from table reference like 'Cliente c' or 'Cliente AS c'
export function extractTableName(tableStr: string): string {
  let clean = tableStr.trim();
  // Look for " AS " case insensitive
  const asRegex = /\s+AS\s+/i;
  if (asRegex.test(clean)) {
    const parts = clean.split(asRegex);
    return parts[0].trim().replace(/[\[\]`"]/g, "");
  }
  
  // Otherwise split by whitespace
  const parts = clean.split(/\s+/);
  if (parts.length > 1) {
    return parts[0].trim().replace(/[\[\]`"]/g, "");
  }
  
  return clean.replace(/[\[\]`"]/g, "");
}

// Extract the alias of a table reference (if exists)
export function getTableAlias(tableStr: string): string {
  const clean = tableStr.trim();
  const asRegex = /\s+AS\s+/i;
  if (asRegex.test(clean)) {
    const parts = clean.split(asRegex);
    return parts[1] ? parts[1].trim() : "";
  }
  const parts = clean.split(/\s+/);
  if (parts.length > 1) {
    return parts[1].trim();
  }
  return "";
}

// Strip outer parentheses protecting the entire expression
export function stripOuterParens(str: string): string {
  let clean = str.trim();
  while (clean.startsWith("(") && clean.endsWith(")")) {
    let parenDepth = 0;
    let isOuterMatch = true;
    for (let i = 0; i < clean.length - 1; i++) {
      if (clean[i] === "(") parenDepth++;
      else if (clean[i] === ")") parenDepth--;
      if (i > 0 && parenDepth === 0) {
        isOuterMatch = false;
        break;
      }
    }
    if (isOuterMatch) {
      clean = clean.substring(1, clean.length - 1).trim();
    } else {
      break;
    }
  }
  return clean;
}

// Find top-level junctions and split SQL expressions
export function splitTopLevelJunction(str: string): { parts: string[]; type: "AND" | "OR" | null } {
  const clean = str.trim();
  if (!clean) return { parts: [], type: null };

  let parenDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;

  const orIndices: number[] = [];
  const andIndices: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === "\\" && (inSingleQuote || inDoubleQuote || inBacktick)) {
      i++;
      continue;
    }
    if (char === "'" && !inDoubleQuote && !inBacktick) inSingleQuote = !inSingleQuote;
    else if (char === '"' && !inSingleQuote && !inBacktick) inDoubleQuote = !inDoubleQuote;
    else if (char === "`" && !inSingleQuote && !inDoubleQuote) inBacktick = !inBacktick;
    else if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      if (char === "(") parenDepth++;
      else if (char === ")") parenDepth--;

      if (parenDepth === 0) {
        // Look for OR
        if (clean.substring(i, i + 4).toUpperCase() === " OR " || clean.substring(i, i + 4).toUpperCase() === "\nOR " || clean.substring(i, i + 4).toUpperCase() === "\r\nOR ") {
          orIndices.push(i);
        }
        // Look for AND
        else if (clean.substring(i, i + 5).toUpperCase() === " AND " || clean.substring(i, i + 5).toUpperCase() === "\nAND " || clean.substring(i, i + 5).toUpperCase() === "\r\nAND ") {
          andIndices.push(i);
        }
      }
    }
  }

  if (orIndices.length > 0) {
    const parts: string[] = [];
    let lastIndex = 0;
    for (const idx of orIndices) {
      parts.push(clean.substring(lastIndex, idx).trim());
      const sub = clean.substring(idx, idx + 6);
      if (sub.toUpperCase().startsWith("\r\nOR ")) {
        lastIndex = idx + 5;
      } else if (sub.toUpperCase().startsWith("\nOR ")) {
        lastIndex = idx + 4;
      } else {
        lastIndex = idx + 4;
      }
    }
    parts.push(clean.substring(lastIndex).trim());
    return { parts, type: "OR" };
  }

  if (andIndices.length > 0) {
    const parts: string[] = [];
    let lastIndex = 0;
    for (const idx of andIndices) {
      parts.push(clean.substring(lastIndex, idx).trim());
      const sub = clean.substring(idx, idx + 7);
      if (sub.toUpperCase().startsWith("\r\nAND ")) {
        lastIndex = idx + 6;
      } else if (sub.toUpperCase().startsWith("\nAND ")) {
        lastIndex = idx + 5;
      } else {
        lastIndex = idx + 5;
      }
    }
    parts.push(clean.substring(lastIndex).trim());
    return { parts, type: "AND" };
  }

  return { parts: [clean], type: null };
}

// Convert search input string into a list of conditions and its junction type
export function splitByJunctions(str: string): { parts: string[]; isOr: boolean } {
  let parenDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let hasOr = false;
  
  const indices: number[] = [];
  const types: string[] = []; // "OR" or "AND"
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === "\\" && (inSingleQuote || inDoubleQuote || inBacktick)) {
      i++;
      continue;
    }
    if (char === "'" && !inDoubleQuote && !inBacktick) inSingleQuote = !inSingleQuote;
    else if (char === '"' && !inSingleQuote && !inBacktick) inDoubleQuote = !inDoubleQuote;
    else if (char === "`" && !inSingleQuote && !inDoubleQuote) inBacktick = !inBacktick;
    else if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      if (char === "(") parenDepth++;
      else if (char === ")") parenDepth--;
      
      if (parenDepth === 0) {
        if (str.substring(i, i + 4).toUpperCase() === " OR " || str.substring(i, i + 4).toUpperCase() === "\nOR ") {
          indices.push(i);
          types.push("OR");
          hasOr = true;
        } else if (str.substring(i, i + 5).toUpperCase() === " AND " || str.substring(i, i + 5).toUpperCase() === "\nAND ") {
          indices.push(i);
          types.push("AND");
        }
      }
    }
  }
  
  const parts: string[] = [];
  if (indices.length === 0) {
    parts.push(str.trim());
    return { parts, isOr: false };
  }
  
  const primaryJunction = hasOr ? "OR" : "AND";
  
  let lastIndex = 0;
  for (let k = 0; k < indices.length; k++) {
    const idx = indices[k];
    const type = types[k];
    if (type === primaryJunction) {
      parts.push(str.substring(lastIndex, idx).trim());
      lastIndex = idx + (primaryJunction === "OR" ? 4 : 5);
    }
  }
  parts.push(str.substring(lastIndex).trim());
  
  return {
    parts: parts.filter(p => p.length > 0),
    isOr: primaryJunction === "OR"
  };
}

// Parse single comparison condition string into field, operator and operand
export function parseSingleCondition(str: string): SingleCondition | null {
  let clean = str.trim();
  while (clean.startsWith("(") && clean.endsWith(")")) {
    clean = clean.substring(1, clean.length - 1).trim();
  }
  
  const ops = [">=", "<=", "!=", "<>", ">", "<", "=", "LIKE"];
  let foundOp = "";
  let opIndex = -1;
  
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let parenDepth = 0;
  
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === "\\" && (inSingleQuote || inDoubleQuote || inBacktick)) {
      i++;
      continue;
    }
    if (char === "'" && !inDoubleQuote && !inBacktick) inSingleQuote = !inSingleQuote;
    else if (char === '"' && !inSingleQuote && !inBacktick) inDoubleQuote = !inDoubleQuote;
    else if (char === "`" && !inSingleQuote && !inDoubleQuote) inBacktick = !inBacktick;
    else if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      if (char === "(") parenDepth++;
      else if (char === ")") parenDepth--;
      
      if (parenDepth === 0) {
        for (const op of ops) {
          const sub = clean.substring(i, i + op.length);
          if (op === "LIKE") {
            if (sub.toUpperCase() === "LIKE" && (i === 0 || /\s/.test(clean[i - 1])) && (i + op.length === clean.length || /\s/.test(clean[i + op.length]))) {
              foundOp = "LIKE";
              opIndex = i;
              break;
            }
          } else {
            if (sub === op) {
              foundOp = op;
              opIndex = i;
              break;
            }
          }
        }
      }
    }
    if (foundOp) break;
  }
  
  if (opIndex === -1) {
    return null;
  }
  
  const field = clean.substring(0, opIndex).trim();
  const value = clean.substring(opIndex + foundOp.length).trim();
  
  return {
    field,
    operator: foundOp.toUpperCase(),
    value
  };
}

// Convert string to Mongo values
export function formatValueForMongo(val: string): string {
  const clean = cleanValueQuotes(val);
  if (!isNaN(Number(clean)) && clean !== "") {
    return clean;
  }
  return `"${clean}"`;
}

// Determine Mongo specific operator prefix
export function getMongoOperator(op: string): string {
  switch (op) {
    case "=": return "$eq";
    case ">": return "$gt";
    case "<": return "$lt";
    case ">=": return "$gte";
    case "<=": return "$lte";
    case "!=":
    case "<>": return "$ne";
    default: return "$eq";
  }
}

// Translate SQL LIKE wildcard into regex modes
export function translateLikePattern(val: string): { type: "startswith" | "endswith" | "contains" | "eq"; cleanVal: string } {
  const clean = cleanValueQuotes(val);
  if (clean.startsWith("%") && clean.endsWith("%")) {
    return { type: "contains", cleanVal: clean.substring(1, clean.length - 1) };
  } else if (clean.startsWith("%")) {
    return { type: "endswith", cleanVal: clean.substring(1) };
  } else if (clean.endsWith("%")) {
    return { type: "startswith", cleanVal: clean.substring(0, clean.length - 1) };
  }
  return { type: "eq", cleanVal: clean };
}

// Map SQL aggregates into structured objects
interface AggMap {
  alias: string;
  field: string;
  op: string; // "$sum", "$max", "$min", "$avg"
}

export function parseAggFields(selectFields: string[]): AggMap[] {
  const aggs: AggMap[] = [];
  const regex = /\b(SUM|COUNT|AVG|MIN|MAX)\(([^)]*)\)(?:\s+AS\s+(\w+))?/i;
  
  for (const field of selectFields) {
    const match = regex.exec(field);
    if (match) {
      const opRaw = match[1].toUpperCase();
      const colRaw = match[2].trim();
      const aliasRaw = match[3] ? match[3].trim() : `${opRaw.toLowerCase()}_${cleanFieldName(colRaw || "count")}`;
      
      let op = "$sum";
      if (opRaw === "SUM") op = "$sum";
      else if (opRaw === "AVG") op = "$avg";
      else if (opRaw === "MAX") op = "$max";
      else if (opRaw === "MIN") op = "$min";
      else if (opRaw === "COUNT") op = "$sum"; // COUNT vira sum: 1
      
      const col = colRaw && colRaw !== "*" ? `$${cleanFieldName(colRaw)}` : "1";
      aggs.push({
        alias: aliasRaw,
        field: col,
        op
      });
    }
  }
  return aggs;
}

// Translation helpers for MongoDB
export function translateWhereForMongoRec(whereStr: string): string {
  let clean = stripOuterParens(whereStr);
  if (!clean) return "";

  const { parts, type } = splitTopLevelJunction(clean);

  if (type === "OR") {
    const partsTranslated = parts
      .map(part => {
        const trans = translateWhereForMongoRec(part);
        if (!trans) return "";
        const trimmed = trans.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          return trimmed;
        }
        return `{ ${trimmed} }`;
      })
      .filter(x => x !== "");
    
    if (partsTranslated.length === 0) return "";
    return `$or: [\n  ${partsTranslated.join(",\n  ")}\n]`;
  }

  if (type === "AND") {
    const partsTranslated = parts
      .map(part => translateWhereForMongoRec(part))
      .filter(x => x !== "");
    
    if (partsTranslated.length === 0) return "";
    return partsTranslated.join(", ");
  }

  // Leaf condition
  const parsed = parseSingleCondition(clean);
  if (!parsed) return "";
  const f = cleanFieldName(parsed.field);
  const val = formatValueForMongo(parsed.value);
  if (parsed.operator === "LIKE") {
    const like = translateLikePattern(parsed.value);
    if (like.type === "startswith") return `${f}: { $regex: "^${like.cleanVal}" }`;
    if (like.type === "endswith") return `${f}: { $regex: "${like.cleanVal}$" }`;
    if (like.type === "contains") return `${f}: { $regex: "${like.cleanVal}" }`;
    return `${f}: { $eq: "${like.cleanVal}" }`;
  } else {
    const mOp = getMongoOperator(parsed.operator);
    return `${f}: { ${mOp}: ${val} }`;
  }
}

export function translateWhereForMongo(whereCondition: string, indent: string = "  "): string {
  const inner = translateWhereForMongoRec(whereCondition);
  if (!inner) return "{}";
  if (inner.includes("\n")) {
    const lines = inner.split("\n");
    const formatted = lines.map(line => indent + line).join("\n");
    return `{\n${formatted}\n${indent.replace("  ", "")}}`;
  }
  return `{ ${inner} }`;
}

// Translation helpers for Pandas Filter Expressions with nested AND/OR operators translation
export function translateWhereForPandas(whereStr: string): string {
  let clean = whereStr.trim();
  if (!clean) return "";

  // Helper to find top-level AND/OR outside of quotes and parens
  let parenDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;

  let bestJunctionIndex = -1;
  let bestJunctionType: "AND" | "OR" | null = null;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === "\\" && (inSingleQuote || inDoubleQuote || inBacktick)) {
      i++;
      continue;
    }
    if (char === "'" && !inDoubleQuote && !inBacktick) inSingleQuote = !inSingleQuote;
    else if (char === '"' && !inSingleQuote && !inBacktick) inDoubleQuote = !inDoubleQuote;
    else if (char === "`" && !inSingleQuote && !inDoubleQuote) inBacktick = !inBacktick;
    else if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      if (char === "(") parenDepth++;
      else if (char === ")") parenDepth--;

      if (parenDepth === 0) {
        // Look for OR (lower precedence, parsed first so it is evaluated last)
        if (clean.substring(i, i + 4).toUpperCase() === " OR " || clean.substring(i, i + 4).toUpperCase() === "\nOR ") {
          bestJunctionIndex = i;
          bestJunctionType = "OR";
          break; // We found an OR, which is the lowest precedence junction. Stop searching and split here.
        }
        // Look for AND (higher precedence, only set if we haven't found OR yet)
        if (bestJunctionType !== "OR") {
          if (clean.substring(i, i + 5).toUpperCase() === " AND " || clean.substring(i, i + 5).toUpperCase() === "\nAND ") {
            bestJunctionIndex = i;
            bestJunctionType = "AND";
          }
        }
      }
    }
  }

  if (bestJunctionIndex !== -1 && bestJunctionType) {
    const leftPart = clean.substring(0, bestJunctionIndex).trim();
    const rightPart = clean.substring(bestJunctionIndex + (bestJunctionType === "OR" ? 4 : 5)).trim();
    
    const leftTrans = translateWhereForPandas(leftPart);
    const rightTrans = translateWhereForPandas(rightPart);
    
    const pandasOp = bestJunctionType === "OR" ? " | " : " & ";
    return `(${leftTrans})${pandasOp}(${rightTrans})`;
  }

  // If there are surrounding parentheses around the whole leaf-expression, strip them and recurse
  if (clean.startsWith("(") && clean.endsWith(")")) {
    let pDepth = 0;
    let isOuterMatch = true;
    for (let i = 0; i < clean.length - 1; i++) {
      if (clean[i] === "(") pDepth++;
      else if (clean[i] === ")") pDepth--;
      if (i > 0 && pDepth === 0) {
        isOuterMatch = false;
        break;
      }
    }
    if (isOuterMatch) {
      return translateWhereForPandas(clean.substring(1, clean.length - 1));
    }
  }

  const cond = parseSingleCondition(clean);
  if (!cond) return clean;
  
  const field = cleanFieldName(cond.field);
  let colExpr = `df['${field}']`;
  if (cond.field.toUpperCase().includes("COALESCE(")) {
    colExpr = `df['${field}'].fillna(...)`;
  } else if (cond.field.toUpperCase().includes("TRIM(")) {
    colExpr = `df['${field}'].str.strip()`;
  } else if (cond.field.toUpperCase().includes("CAST(")) {
    colExpr = `df['${field}'].astype(...)`;
  }

  const operatorMap: Record<string, string> = {
    "=": "==",
    ">": ">",
    "<": "<",
    ">=": ">=",
    "<=": "<=",
    "!=": "!=",
    "<>": "!="
  };

  if (cond.operator === "LIKE") {
    const like = translateLikePattern(cond.value);
    if (like.type === "startswith") {
      return `${colExpr}.str.startswith('${like.cleanVal}')`;
    } else if (like.type === "endswith") {
      return `${colExpr}.str.endswith('${like.cleanVal}')`;
    } else if (like.type === "contains") {
      return `${colExpr}.str.contains('${like.cleanVal}')`;
    }
    return `${colExpr} == '${like.cleanVal}'`;
  } else {
    const pOp = operatorMap[cond.operator] || "==";
    let pVal = cleanValueQuotes(cond.value);
    if (isNaN(Number(pVal)) || pVal === "") {
      pVal = `'${pVal}'`;
    }
    return `${colExpr} ${pOp} ${pVal}`;
  }
}

// Unified dialect helper to parse and translate Oracle, SQL Server & PostgreSQL specific queries
export function parseAndTranslateDialects(sql: string, targetDialect: string): string {
  let result = sql.trim();
  
  if (targetDialect === "Oracle") {
    // 3. Dialect Oracle Conversions
    result = result.replace(/\bLEN\(([^)]+)\)/gi, "LENGTH($1)");
    result = result.replace(/\bCHAR_LENGTH\(([^)]+)\)/gi, "LENGTH($1)");
    result = result.replace(/\bSUBSTRING\(([^)]+)\)/gi, "SUBSTR($1)");
    result = result.replace(/\bROUND\(([^,]+),\s*(\d+),\s*1\)/gi, "TRUNC($1)");
    result = result.replace(/\bCEILING\(([^)]+)\)/gi, "CEIL($1)");
    result = result.replace(/\bISNULL\(([^)]+)\)/gi, "NVL($1)");
    result = result.replace(/\bCOALESCE\(([^)]+)\)/gi, "NVL($1)");
    result = result.replace(/\bGETDATE\(\)/gi, "SYSDATE");
    result = result.replace(/\bCURRENT_DATE\b/gi, "SYSDATE");
    result = result.replace(/\bCURRENT_TIMESTAMP\b/gi, "SYSTIMESTAMP");
    result = result.replace(/\bNOW\(\)/gi, "SYSTIMESTAMP");
    result = result.replace(/\bDATEADD\(([^)]+)\)/gi, "ADD_MONTHS($1)");
    result = result.replace(/\bDATEDIFF\(([^)]+)\)/gi, "$1");
    
    // Limits
    const limitMatch = /\bLIMIT\s+(\d+)/i.exec(result);
    if (limitMatch) {
      result = result.replace(/\bLIMIT\s+\d+/gi, "").trim();
      result += ` FETCH FIRST ${limitMatch[1]} ROWS ONLY`;
    }
    result = result.replace(/\bOFFSET\s+(\d+)/gi, "OFFSET $1 ROWS");
  } 
  
  else if (targetDialect === "SqlServer") {
    // 3. Dialect SQL Server Conversions
    result = result.replace(/\bLENGTH\(([^)]+)\)/gi, "LEN($1)");
    result = result.replace(/\bCHAR_LENGTH\(([^)]+)\)/gi, "LEN($1)");
    result = result.replace(/\bSUBSTR\(([^)]+)\)/gi, "SUBSTRING($1)");
    result = result.replace(/\bTRUNC\(([^)]+)\)/gi, "ROUND($1, 0, 1)");
    result = result.replace(/\bCEIL\(([^)]+)\)/gi, "CEILING($1)");
    result = result.replace(/\bNVL\(([^)]+)\)/gi, "ISNULL($1)");
    result = result.replace(/\bCOALESCE\(([^)]+)\)/gi, "ISNULL($1)");
    result = result.replace(/\bSYSDATE\b/gi, "GETDATE()");
    result = result.replace(/\bCURRENT_DATE\b/gi, "GETDATE()");
    result = result.replace(/\bSYSTIMESTAMP\b/gi, "CURRENT_TIMESTAMP");
    result = result.replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP");
    result = result.replace(/\bADD_MONTHS\(([^,]+),\s*([^)]+)\)/gi, "DATEADD(month, $2, $1)");
    
    // Strip Postgres casts
    result = result.replace(/(\w+)::(\w+)/g, "CAST($1 AS $2)");
    
    // Handle LIMIT n -> TOP (n)
    const limitMatch = /\bLIMIT\s+(\d+)/i.exec(result);
    if (limitMatch) {
      const limitVal = limitMatch[1];
      result = result.replace(/\bLIMIT\s+\d+/gi, "").trim();
      result = result.replace(/\bSELECT\s+(DISTINCT\s+)?/gi, `SELECT $1TOP (${limitVal}) `);
    }
    result = result.replace(/\bOFFSET\s+(\d+)/gi, "OFFSET $1 ROWS");
  } 
  
  else if (targetDialect === "Postgre") {
    // 3. Dialect PostgreSQL Conversions
    result = result.replace(/\bLEN\(([^)]+)\)/gi, "LENGTH($1)");
    result = result.replace(/\bCHAR_LENGTH\(([^)]+)\)/gi, "LENGTH($1)");
    result = result.replace(/\bSUBSTR\(([^)]+)\)/gi, "SUBSTRING($1)");
    result = result.replace(/\bROUND\(([^,]+),\s*(\d+),\s*1\)/gi, "TRUNC($1)");
    result = result.replace(/\bCEILING\(([^)]+)\)/gi, "CEIL($1)");
    result = result.replace(/\bNVL\(([^)]+)\)/gi, "COALESCE($1)");
    result = result.replace(/\bISNULL\(([^)]+)\)/gi, "COALESCE($1)");
    result = result.replace(/\bSYSDATE\b/gi, "CURRENT_DATE");
    result = result.replace(/\bGETDATE\(\)/gi, "CURRENT_DATE");
    result = result.replace(/\bSYSTIMESTAMP\b/gi, "CURRENT_TIMESTAMP");
    result = result.replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP");
    result = result.replace(/\bADD_MONTHS\(([^,]+),\s*([^)]+)\)/gi, "$1 + INTERVAL '$2 month'");
    
    // SQL Server TOP(n) to Postgres LIMIT n
    const topMatch = /\bSELECT\s+(DISTINCT\s+)?TOP\s*\(?(\d+)\)?\s+/i.exec(result);
    if (topMatch) {
      const limitVal = topMatch[2];
      result = result.replace(/\bTOP\s*\(?\d+\)?\s+/gi, "");
      result = result.trim() + " LIMIT " + limitVal;
    }
    result = result.replace(/\bOFFSET\s+(\d+)\s+ROWS/gi, "OFFSET $1");
  }
  
  return result;
}

// Primary Driver for SQL translation
export function translateSql(sql: string, targetLanguage: string): string {
  if (!sql || !sql.trim()) return "";
  
  const parsed = parseSqlStringToData(sql);
  
  // -------------------------------- MongoDB Translation --------------------------------
  if (targetLanguage === "MongoDB") {
    const tbl = cleanFieldName(parsed.mainTable || "colecao");
    const hasGroupBy = parsed.groupByFields.length > 0;
    const hasWhere = parsed.whereCondition.trim() !== "";
    const hasOrderBy = parsed.orderByFields.length > 0;
    
    let resultMongo = "";
    
    if (hasGroupBy) {
      // Rule 1.5 - aggregate params setup
      const idField = parsed.groupByFields.map(f => `"$${cleanFieldName(f)}"`).join(", ");
      const idObjStr = parsed.groupByFields.length > 1 ? `{ ${parsed.groupByFields.map(f => `${cleanFieldName(f)}` + `: "$${cleanFieldName(f)}"`).join(", ")} }` : `"$${cleanFieldName(parsed.groupByFields[0])}"`;
      
      const aggs = parseAggFields(parsed.selectFields);
      const groupStageParts = [
        `_id: ${idObjStr}`
      ];
      
      for (const agg of aggs) {
        if (agg.field === "1") {
          groupStageParts.push(`${agg.alias}: { $sum: 1 }`);
        } else {
          groupStageParts.push(`${agg.alias}: { ${agg.op}: "${agg.field}" }`);
        }
      }
      
      const groupStageBody = groupStageParts.map(part => `      ${part}`).join(",\n");
      const groupStage = `  {\n    $group: {\n${groupStageBody}\n    }\n  }`;
      
      if (hasWhere) {
        const whereMongo = translateWhereForMongo(parsed.whereCondition, "      ");
        resultMongo = `db.${tbl}.aggregate([\n  {\n    $match: ${whereMongo}\n  },\n${groupStage}\n])`;
      } else {
        resultMongo = `db.${tbl}.aggregate([\n${groupStage}\n])`;
      }
    } else {
      // No Group By -> Rule 1.1 / 1.2
      const isMultiline = hasWhere && (splitByJunctions(parsed.whereCondition).parts.length > 1);
      
      // Get fields for projection (second argument of find)
      const projectionFields = parsed.selectFields
        .map(f => cleanFieldName(f.split(/\s+as\s+/i)[0]))
        .filter(f => f !== "*" && f !== "" && !f.includes("("));
      
      const hasProjection = projectionFields.length > 0;

      if (isMultiline) {
        const whereMongo = translateWhereForMongo(parsed.whereCondition, "  ");
        if (hasProjection) {
          const projParts = projectionFields.map(f => `  ${f}: 1`).join(",\n");
          const projMongo = `{\n${projParts}\n}`;
          resultMongo = `db.${tbl}.find(\n  ${whereMongo.split("\n").join("\n  ")},\n  ${projMongo.split("\n").join("\n  ")}\n)`;
        } else {
          resultMongo = `db.${tbl}.find(\n  ${whereMongo.split("\n").join("\n  ")}\n)`;
        }
      } else {
        const whereMongo = hasWhere ? translateWhereForMongo(parsed.whereCondition, "  ") : "{}";
        if (hasProjection) {
          const projParts = projectionFields.map(f => `${f}: 1`).join(", ");
          const projMongo = `{ ${projParts} }`;
          resultMongo = `db.${tbl}.find(${whereMongo}, ${projMongo})`;
        } else {
          resultMongo = `db.${tbl}.find(${whereMongo})`;
        }
      }
    }
    
    // Rule 1.4 - Order By Sort
    if (hasOrderBy) {
      const sortPairs = parsed.orderByFields
        .map(o => `${cleanFieldName(o.column)}: ${o.direction === "DESC" ? -1 : 1}`)
        .join(", ");
      resultMongo += `\n  .sort({ ${sortPairs} })`;
    }
    
    if (parsed.limit) {
      resultMongo += `\n  .limit(${parsed.limit})`;
    }
    
    return resultMongo;
  }
  
  // -------------------------------- Pandas Translation --------------------------------
  if (targetLanguage === "Pandas") {
    // Rule 2.1
    let resultPandas = "import pandas as pd\n\n";
    
    // Rule 2.2 - Load CSV representation of DataFrames
    const mainTbl = extractTableName(parsed.mainTable || "tabela");
    const mainAlias = getTableAlias(parsed.mainTable || "tabela");
    resultPandas += `# Carregar as tabelas como DataFrames\ndf_${mainTbl} = pd.read_csv('${mainTbl}.csv')\n`;
    
    for (const join of parsed.joins) {
      const rightTbl = extractTableName(join.table);
      resultPandas += `df_${rightTbl} = pd.read_csv('${rightTbl}.csv')\n`;
    }
    
    resultPandas += "\n# Realizar Joins (se houver)\n";
    let currentLeft = mainTbl;
    
    // Rule 2.2.1 & 2.2.2 - Merge joins setup
    for (const join of parsed.joins) {
      const rightTbl = extractTableName(join.table);
      const rightAlias = getTableAlias(join.table);
      let leftOn = "None";
      let rightOn = "None";
      const cond = parseSingleCondition(join.onCondition);
      
      if (cond) {
        const f1 = cond.field.trim();
        const f2 = cond.value.trim();
        const f1Prefix = f1.includes(".") ? f1.split(".")[0] : "";
        const f1Clean = cleanFieldName(f1);
        const f2Clean = cleanFieldName(f2);
        
        if (f1Prefix && (f1Prefix === rightAlias || f1Prefix === rightTbl)) {
          rightOn = `'${f1Clean}'`;
          leftOn = `'${f2Clean}'`;
        } else if (f1Prefix && (f1Prefix === mainAlias || f1Prefix === currentLeft)) {
          leftOn = `'${f1Clean}'`;
          rightOn = `'${f2Clean}'`;
        } else {
          leftOn = `'${f1Clean}'`;
          rightOn = `'${f2Clean}'`;
        }
      }
      
      let how = "inner";
      const jt = join.joinType.toUpperCase();
      if (jt.includes("LEFT")) how = "left";
      else if (jt.includes("RIGHT")) how = "right";
      else if (jt.includes("OUTER") || jt.includes("FULL")) how = "outer";
      else if (jt.includes("CROSS")) how = "cross";
      
      resultPandas += `df_${currentLeft} = pd.merge(\n    df_${currentLeft}, df_${rightTbl}, left_on=${leftOn}, right_on=${rightOn}, how='${how}'\n)\n`;
    }
    
    // Rule 2.3 - Temporary df assignment
    resultPandas += `\n# Atribuição simplificada\ndf = df_${mainTbl}\n\n`;
    
    // Rule 2.4 - Chain DataFrame procedures
    let chain = "df";
    
    const filterExpr = translateWhereForPandas(parsed.whereCondition);
    if (filterExpr) {
      chain += `[${filterExpr}]`;
    }
    
    // Fields lists
    const cleanSelFields = parsed.selectFields
      .map(f => cleanFieldName(f.split(/\s+as\s+/i)[0]))
      .filter(f => f !== "*" && !f.includes("("));
      
    if (cleanSelFields.length > 0) {
      const formattedSel = cleanSelFields.map(f => `'${f}'`).join(", ");
      chain += `[ [${formattedSel}] ]`;
    }
    
    // Rule 2.4.1 & 2.4.2 - GroupBy procedures
    if (parsed.groupByFields.length > 0) {
      const groups = parsed.groupByFields.map(f => `'${cleanFieldName(f)}'`).join(", ");
      chain += `\n    .groupby([${groups}])`;
      
      const aggs = parseAggFields(parsed.selectFields);
      if (aggs.length > 0) {
        const aggDict = aggs.map(a => {
          let pyOp = "sum";
          if (a.op === "$avg") pyOp = "mean";
          else if (a.op === "$sum" && a.field === "1") pyOp = "size";
          else if (a.op === "$sum") pyOp = "sum";
          else if (a.op === "$max") pyOp = "max";
          else if (a.op === "$min") pyOp = "min";
          const fn = cleanFieldName(a.field === "1" ? "*" : a.field.replace("$", ""));
          return `'${fn}': ['${pyOp}']`;
        });
        chain += `.agg({ ${aggDict.join(", ")} })`;
      }
    }
    
    // Ordering
    if (parsed.orderByFields.length > 0) {
      const orderCols = parsed.orderByFields.map(o => `'${cleanFieldName(o.column)}'`).join(", ");
      const isAscending = parsed.orderByFields[0].direction !== "DESC" ? "True" : "False";
      chain += `\n    .sort_values(${orderCols}, ascending=${isAscending})`;
    }
    
    if (parsed.limit) {
      chain += `\n    .head(${parsed.limit})`;
    }
    
    resultPandas += `df = ${chain}`;
    return resultPandas;
  }
  
  // -------------------------------- Oracle, SqlServer, PostgreSQL Translations --------------------------------
  // Rule 3 - Dialog convert mapping
  return parseAndTranslateDialects(sql, targetLanguage);
}
