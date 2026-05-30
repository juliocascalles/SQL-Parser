import { parseSqlStringToData, ParsedSqlQuery, JoinData, OrderByItem, splitSmart } from "./parser";

// Interface for condition structures
interface SingleCondition {
  field: string;
  operator: string; // "=", ">", "<", ">=", "<=", "!=", "<>", "LIKE"
  value: string;
}

// Format line: split lines > 40 at the next comma, opening parenthesis, space, or operator (+, -, *, /)
export function formatLine(line: string): string[] {
  if (line.length <= 40) {
    return [line];
  }

  const breakChars = [",", "(", " ", "+", "-", "*", "/"];
  let breakIdx = -1;
  // Search forward from index 40
  for (let i = 40; i < line.length; i++) {
    if (breakChars.includes(line[i])) {
      breakIdx = i;
      break;
    }
  }

  // Search backward from index 39 if no forward match can be found
  if (breakIdx === -1) {
    for (let i = 39; i >= 0; i--) {
      if (breakChars.includes(line[i])) {
        breakIdx = i;
        break;
      }
    }
  }

  if (breakIdx !== -1) {
    const char = line[breakIdx];
    let part1 = "";
    let part2 = "";
    if (char === " ") {
      part1 = line.substring(0, breakIdx);
      part2 = line.substring(breakIdx + 1);
    } else if (char === "(") {
      part1 = line.substring(0, breakIdx);
      part2 = line.substring(breakIdx);
    } else {
      part1 = line.substring(0, breakIdx + 1);
      part2 = line.substring(breakIdx + 1);
    }

    const trimmedPart2 = part2.trim();
    if (trimmedPart2 && trimmedPart2.length < line.length) {
      return [part1.trimEnd(), ...formatLine(trimmedPart2)];
    } else {
      return [part1.trimEnd(), trimmedPart2].filter(Boolean);
    }
  }

  return [line];
}

// Format pandas line: split lines > 25 at bracket, parenthesis, comma, space, operator (+, -, *, /) or dot (.)
export function formatPandasLine(line: string): string[] {
  if (line.length <= 25) {
    return [line];
  }

  const breakChars = ["[", "]", "(", ")", ",", " ", "+", "-", "/", "*", "."];
  let breakIdx = -1;

  // Track quote states to avoid splitting inside string literals if possible
  const inQuote = new Array(line.length).fill(false);
  let currentQuote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === "'" || char === '"') {
      if (currentQuote === char) {
        currentQuote = null;
      } else if (currentQuote === null) {
        currentQuote = char;
      }
    }
    inQuote[i] = (currentQuote !== null);
  }

  // Search forward from 25, preferring indices not in quotes
  for (let i = 25; i < line.length; i++) {
    if (breakChars.includes(line[i]) && !inQuote[i]) {
      breakIdx = i;
      break;
    }
  }

  // Backtrack from 24 down to 0, preferring indices not in quotes
  if (breakIdx === -1) {
    for (let i = 24; i >= 0; i--) {
      if (breakChars.includes(line[i]) && !inQuote[i]) {
        breakIdx = i;
        break;
      }
    }
  }

  // Fallback: search ignoring quote rules if no safe breaks found
  if (breakIdx === -1) {
    for (let i = 25; i < line.length; i++) {
      if (breakChars.includes(line[i])) {
        breakIdx = i;
        break;
      }
    }
  }
  if (breakIdx === -1) {
    for (let i = 24; i >= 0; i--) {
      if (breakChars.includes(line[i])) {
        breakIdx = i;
        break;
      }
    }
  }

  if (breakIdx !== -1) {
    const part1 = line.substring(0, breakIdx + 1);
    const part2 = line.substring(breakIdx + 1);

    const trimmedPart2 = part2.trim();
    if (trimmedPart2 && trimmedPart2.length < line.length) {
      return [part1.trimEnd(), ...formatPandasLine(trimmedPart2)];
    } else {
      return [part1.trimEnd(), trimmedPart2].filter(Boolean);
    }
  }

  return [line];
}

// Format MongoDB line: split lines > 30 and insert a line break right after {
export function formatMongoLine(line: string): string[] {
  if (line.length <= 30) {
    return [line];
  }

  // Track quote states to avoid splitting inside string literals if possible
  const inQuote = new Array(line.length).fill(false);
  let currentQuote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === "'" || char === '"') {
      if (currentQuote === char) {
        currentQuote = null;
      } else if (currentQuote === null) {
        currentQuote = char;
      }
    }
    inQuote[i] = (currentQuote !== null);
  }

  // Find the first '{' not in a quote
  let breakIdx = -1;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "{" && !inQuote[i]) {
      breakIdx = i;
      break;
    }
  }

  // Fallback: finding any '{' in case all are quoted but we still need to break
  if (breakIdx === -1) {
    breakIdx = line.indexOf("{");
  }

  if (breakIdx !== -1) {
    const part1 = line.substring(0, breakIdx + 1);
    const part2 = line.substring(breakIdx + 1);

    const leadingSpaces = line.match(/^\s*/)?.[0] || "";
    const trimmedPart2 = part2.trim();
    const indentedPart2 = leadingSpaces + "  " + trimmedPart2;

    if (trimmedPart2 && trimmedPart2.length < line.length) {
      return [part1.trimEnd(), ...formatMongoLine(indentedPart2)];
    } else {
      return [part1.trimEnd(), trimmedPart2].filter(Boolean);
    }
  }

  return [line];
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

// Replace comments with space characters of the same length to preserve indices
export function replaceCommentsWithSpaces(str: string): string {
  let result = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let inSingleLineComment = false;
  let inMultiLineComment = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    
    if (inSingleLineComment) {
      if (char === "\n") {
        inSingleLineComment = false;
        result += "\n";
      } else if (char === "\r") {
        result += "\r";
      } else {
        result += " ";
      }
      continue;
    }
    
    if (inMultiLineComment) {
      if (char === "*" && str[i + 1] === "/") {
        inMultiLineComment = false;
        result += "  ";
        i++;
      } else if (char === "\n") {
        result += "\n";
      } else if (char === "\r") {
        result += "\r";
      } else {
        result += " ";
      }
      continue;
    }

    if (char === "\\" && (inSingleQuote || inDoubleQuote || inBacktick)) {
      result += char;
      if (i + 1 < str.length) {
        result += str[i + 1];
        i++;
      }
      continue;
    }

    if (char === "'" && !inDoubleQuote && !inBacktick) {
      inSingleQuote = !inSingleQuote;
      result += char;
      continue;
    }
    if (char === '"' && !inSingleQuote && !inBacktick) {
      inDoubleQuote = !inDoubleQuote;
      result += char;
      continue;
    }
    if (char === "`" && !inSingleQuote && !inDoubleQuote) {
      inBacktick = !inBacktick;
      result += char;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      if (char === "/" && str[i + 1] === "*") {
        inMultiLineComment = true;
        result += "  ";
        i++;
        continue;
      }
      if (char === "-" && str[i + 1] === "-") {
        inSingleLineComment = true;
        result += "  ";
        i++;
        continue;
      }
    }

    result += char;
  }
  return result;
}

// Find top-level junctions and split SQL expressions
export function splitTopLevelJunction(str: string): { parts: string[]; type: "AND" | "OR" | null } {
  const clean = str.trim();
  if (!clean) return { parts: [], type: null };

  const cleanNoComments = replaceCommentsWithSpaces(clean);

  let parenDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let betweenCount = 0;

  const orIndices: number[] = [];
  const andIndices: number[] = [];

  for (let i = 0; i < cleanNoComments.length; i++) {
    const char = cleanNoComments[i];
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
        // Track BETWEEN to avoid splitting AND inside BETWEEN
        const subBetween = cleanNoComments.substring(i, i + 7).toUpperCase();
        if (subBetween === "BETWEEN" && (i === 0 || !/[A-Za-z0-9_]/.test(cleanNoComments[i - 1])) && (i + 7 === cleanNoComments.length || !/[A-Za-z0-9_]/.test(cleanNoComments[i + 7]))) {
          betweenCount++;
        }

        // Look for OR
        if (cleanNoComments.substring(i, i + 2).toUpperCase() === "OR" &&
            (i === 0 || !/[A-Za-z0-9_]/.test(cleanNoComments[i - 1])) &&
            (i + 2 === cleanNoComments.length || !/[A-Za-z0-9_]/.test(cleanNoComments[i + 2]))) {
          orIndices.push(i);
        }
        // Look for AND
        else if (cleanNoComments.substring(i, i + 3).toUpperCase() === "AND" &&
            (i === 0 || !/[A-Za-z0-9_]/.test(cleanNoComments[i - 1])) &&
            (i + 3 === cleanNoComments.length || !/[A-Za-z0-9_]/.test(cleanNoComments[i + 3]))) {
          if (betweenCount > 0) {
            betweenCount--;
          } else {
            andIndices.push(i);
          }
        }
      }
    }
  }

  if (orIndices.length > 0) {
    const parts: string[] = [];
    let lastIndex = 0;
    for (const idx of orIndices) {
      parts.push(clean.substring(lastIndex, idx).trim());
      lastIndex = idx + 2;
    }
    parts.push(clean.substring(lastIndex).trim());
    return { parts, type: "OR" };
  }

  if (andIndices.length > 0) {
    const parts: string[] = [];
    let lastIndex = 0;
    for (const idx of andIndices) {
      parts.push(clean.substring(lastIndex, idx).trim());
      lastIndex = idx + 3;
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
  let betweenCount = 0;
  
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
        // Track BETWEEN to avoid splitting AND inside BETWEEN
        const subBetween = str.substring(i, i + 7).toUpperCase();
        if (subBetween === "BETWEEN" && (i === 0 || !/[A-Za-z0-9_]/.test(str[i - 1])) && (i + 7 === str.length || !/[A-Za-z0-9_]/.test(str[i + 7]))) {
          betweenCount++;
        }

        if (str.substring(i, i + 4).toUpperCase() === " OR " || str.substring(i, i + 4).toUpperCase() === "\nOR ") {
          indices.push(i);
          types.push("OR");
          hasOr = true;
        } else if (str.substring(i, i + 5).toUpperCase() === " AND " || str.substring(i, i + 5).toUpperCase() === "\nAND ") {
          if (betweenCount > 0) {
            betweenCount--;
          } else {
            indices.push(i);
            types.push("AND");
          }
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
  
  const ops = [">=", "<=", "!=", "<>", ">", "<", "=", "LIKE", "IN", "BETWEEN"];
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
          } else if (op === "IN") {
            if (sub.toUpperCase() === "IN" && (i === 0 || /\s/.test(clean[i - 1])) && (i + op.length === clean.length || /\s/.test(clean[i + op.length]))) {
              foundOp = "IN";
              opIndex = i;
              break;
            }
          } else if (op === "BETWEEN") {
            if (sub.toUpperCase() === "BETWEEN" && (i === 0 || /\s/.test(clean[i - 1])) && (i + op.length === clean.length || /\s/.test(clean[i + op.length]))) {
              foundOp = "BETWEEN";
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
  } else if (parsed.operator === "BETWEEN") {
    const parts = parsed.value.split(/\s+AND\s+/i);
    const val1 = formatValueForMongo(parts[0]?.trim() || "");
    const val2 = formatValueForMongo(parts[1]?.trim() || "");
    return `${f}: { $gte: ${val1}, $lte: ${val2} }`;
  } else if (parsed.operator === "IN") {
    let inVal = parsed.value.trim();
    if (inVal.startsWith("(") && inVal.endsWith(")")) {
      const inner = inVal.substring(1, inVal.length - 1);
      const items = inner.split(",").map(x => formatValueForMongo(x.trim()));
      return `${f}: { $in: [${items.join(", ")}] }`;
    }
    return `${f}: { $in: [${formatValueForMongo(inVal)}] }`;
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

export interface FunctionTranslation {
  original: string;
  alias: string;
  pandasFormula: string;
  targetCol: string;
}

export function tryTranslateFunction(selectExpr: string): FunctionTranslation | null {
  const parts = selectExpr.split(/\s+AS\s+/i);
  const expr = parts[0].trim();
  const alias = parts[1] ? parts[1].trim() : "";
  
  const lowerExpr = expr.toLowerCase();
  
  if (lowerExpr.startsWith("coalesce(")) {
    const match = /^coalesce\((.*)\)$/i.exec(expr);
    if (match) {
      const inner = match[1].trim();
      const params = splitSmart(inner, ",");
      if (params.length > 0) {
        const fieldName = cleanFieldName(params[0]);
        const otherParams = params.slice(1).map(p => cleanValueQuotes(p).trim()).join(", ");
        const finalCol = alias || fieldName;
        return {
          original: selectExpr,
          alias: finalCol,
          pandasFormula: `df['${fieldName}'].fillna(${otherParams})`,
          targetCol: finalCol
        };
      }
    }
  }
  
  if (lowerExpr.startsWith("cast(")) {
    const match = /^cast\((.*)\)$/i.exec(expr);
    if (match) {
      const inner = match[1].trim();
      let fieldName = "";
      let dataType = "";
      const innerAsMatch = /\s+AS\s+/i.exec(inner);
      if (innerAsMatch) {
         fieldName = cleanFieldName(inner.substring(0, innerAsMatch.index).trim());
         dataType = inner.substring(innerAsMatch.index + innerAsMatch[0].length).trim();
      } else {
         const params = splitSmart(inner, ",");
         if (params.length > 0) {
           fieldName = cleanFieldName(params[0]);
           dataType = params.slice(1).join(", ").trim();
         }
      }
      
      if (fieldName) {
        let pyType = cleanValueQuotes(dataType).toLowerCase().trim();
        if (pyType === "varchar" || pyType === "char" || pyType === "string") {
          pyType = "str";
        } else if (pyType === "integer") {
          pyType = "int";
        } else if (pyType === "double" || pyType === "numeric" || pyType === "real" || pyType === "float") {
          pyType = "float";
        }
        const finalCol = alias || fieldName;
        return {
          original: selectExpr,
          alias: finalCol,
          pandasFormula: `df['${fieldName}'].astype(${pyType})`,
          targetCol: finalCol
        };
      }
    }
  }
  
  if (lowerExpr.startsWith("trim(")) {
    const match = /^trim\((.*)\)$/i.exec(expr);
    if (match) {
      const inner = match[1].trim();
      const fieldName = cleanFieldName(inner);
      const finalCol = alias || fieldName;
      return {
        original: selectExpr,
        alias: finalCol,
        pandasFormula: `df['${fieldName}'].str.strip()`,
        targetCol: finalCol
      };
    }
  }
  
  if (lowerExpr.startsWith("percentile_cont(")) {
    const withinGroupRegex = /percentile_cont\s*\(\s*([^)]+)\s*\)\s*within\s+group\s*\(\s*order\s+by\s+([^)]+)\s*\)/i;
    const withinMatch = withinGroupRegex.exec(expr);
    if (withinMatch) {
      const val = withinMatch[1].trim();
      const colName = cleanFieldName(withinMatch[2]);
      const finalCol = alias || `quantile_${colName}`;
      return {
        original: selectExpr,
        alias: finalCol,
        pandasFormula: `df['${colName}'].quantile(${val})`,
        targetCol: finalCol
      };
    } else {
      const match = /^percentile_cont\((.*)\)$/i.exec(expr);
      if (match) {
        const inner = match[1].trim();
        const params = splitSmart(inner, ",");
        if (params.length > 0) {
          const val = params[0].trim();
          const colName = params[1] ? cleanFieldName(params[1]) : "campo";
          const finalCol = alias || `quantile_${colName}`;
          return {
            original: selectExpr,
            alias: finalCol,
            pandasFormula: `df['${colName}'].quantile(${val})`,
            targetCol: finalCol
          };
        }
      }
    }
  }
  
  return null;
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
  } else if (cond.operator === "BETWEEN") {
    const parts = cond.value.split(/\s+AND\s+/i);
    let val1 = cleanValueQuotes(parts[0]?.trim() || "");
    let val2 = cleanValueQuotes(parts[1]?.trim() || "");
    if (isNaN(Number(val1)) || val1 === "") {
      val1 = `'${val1}'`;
    }
    if (isNaN(Number(val2)) || val2 === "") {
      val2 = `'${val2}'`;
    }
    return `(${colExpr} >= ${val1}) & (${colExpr} <= ${val2})`;
  } else if (cond.operator === "IN") {
    let inVal = cond.value.trim();
    if (inVal.startsWith("(") && inVal.endsWith(")")) {
      const inner = inVal.substring(1, inVal.length - 1);
      const items = inner.split(",").map(x => {
        const itemClean = cleanValueQuotes(x.trim());
        if (isNaN(Number(itemClean)) || itemClean === "") {
          return `'${itemClean}'`;
        }
        return itemClean;
      });
      inVal = `(${items.join(", ")})`;
    }
    return `${colExpr} in ${inVal}`;
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
    
    const lines = resultMongo.split("\n");
    const formattedLines = lines.flatMap(line => {
      if (line.trim().startsWith("//") || !line.trim()) {
        return [line];
      }
      return formatMongoLine(line);
    });
    return formattedLines.join("\n");
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
    
    // Parse functions in select fields
    const cleanSelFields: string[] = [];
    const functionAssignments: string[] = [];
    
    for (const f of parsed.selectFields) {
      const parts = f.split(/\s+as\s+/i);
      const expr = parts[0].trim();
      const alias = parts[1] ? parts[1].trim() : "";
      
      const translated = tryTranslateFunction(f);
      if (translated) {
        functionAssignments.push(`df['${translated.targetCol}'] = ${translated.pandasFormula}`);
        cleanSelFields.push(translated.targetCol);
      } else {
        if (expr !== "*") {
          cleanSelFields.push(alias || cleanFieldName(expr));
        }
      }
    }
    
    if (functionAssignments.length > 0) {
      resultPandas += `# Aplicações de funções do SELECT\n` + functionAssignments.join("\n") + "\n\n";
    }
    
    // Rule 2.4 - Chain DataFrame procedures
    let chain = "df";
    
    const filterExpr = translateWhereForPandas(parsed.whereCondition);
    if (filterExpr) {
      chain += `[${filterExpr}]`;
    }
    
    // Fields lists
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

    const lines = resultPandas.split("\n");
    const formattedLines = lines.flatMap(line => {
      if (line.trim().startsWith("#") || !line.trim()) {
        return [line];
      }
      return formatPandasLine(line);
    });
    return formattedLines.join("\n");
  }
  
  // -------------------------------- Oracle, SqlServer, PostgreSQL Translations --------------------------------
  // Rule 3 - Dialog convert mapping
  const translated = parseAndTranslateDialects(sql, targetLanguage);
  
  if (targetLanguage === "Oracle" || targetLanguage === "SqlServer" || targetLanguage === "Postgre") {
    // Format the translated result: line length > 40 should be broken at next comma, open paren, space or +, -, *, /
    const lines = translated.split("\n");
    const formattedLines = lines.flatMap(line => formatLine(line));
    return formattedLines.join("\n");
  }
  
  return translated;
}
