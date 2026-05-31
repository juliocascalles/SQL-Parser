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

// Helper to find the top level operator (e.g. =, >, <, >=, <=, !=, <>) outside of parentheses and quotes
export function findTopLevelOperator(str: string): { op: string, index: number } | null {
  const operators = [">=", "<=", "!=", "<>", "=", ">", "<"]; // order matches larger length operators first
  let parenDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === "(") {
      parenDepth++;
      continue;
    }
    if (char === ")") {
      parenDepth--;
      continue;
    }
    if (char === "'") {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (char === '"') {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (parenDepth === 0 && !inSingleQuote && !inDoubleQuote) {
      const remaining = str.substring(i);
      for (const op of operators) {
        if (remaining.startsWith(op)) {
          return { op, index: i };
        }
      }
    }
  }
  return null;
}

// Get the single variable/field name in an expression if it has exactly one unique variable
export function getSingleVariable(expr: string): string | null {
  // Strip out numeric values first to avoid confusing dot in floats with dots in table aliases
  const cleanExpr = expr.replace(/\b\d+(?:\.\d+)?\b/g, " ").replace(/\b\.\d+\b/g, " ");
  // Match word characters representing variables (like field names: a.field, field etc.)
  const words = cleanExpr.match(/\b[A-Za-z_][A-Za-z0-9_.]*\b/g) || [];
  
  const ignored = new Set(["and", "or", "not", "in", "like", "between", "is", "null", "year", "month", "day", "date", "as"]);
  const varsObj = new Set<string>();
  for (const word of words) {
    if (!ignored.has(word.toLowerCase())) {
      varsObj.add(word);
    }
  }
  if (varsObj.size === 1) {
    return Array.from(varsObj)[0];
  }
  return null;
}

// Safely replaces the occurrences of the exact variable name with a number value in expression
export function replaceVariable(expr: string, variableName: string, val: number): string {
  const escaped = variableName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`(?<![A-Za-z0-9_.])${escaped}(?![A-Za-z0-9_.])`, 'g');
  return expr.replace(regex, val.toString());
}

// Check if string contains ONLY algebraic operations, numbers, brackets and spaces
export function isPureMathExpr(str: string): boolean {
  return /^[0-9.+\-*/()\s]+$/.test(str);
}

// Safe recursive descent math evaluator to safely evaluate arithmetic expression string (without eval)
export function safeEval(str: string): number {
  const tokens = str.match(/\d+(?:\.\d+)?|\.\d+|[-+*/()]/g) || [];
  let pos = 0;

  function parsePrimary(): number {
    let token = tokens[pos];
    if (token === "-") {
      pos++;
      return -parsePrimary();
    }
    if (token === "+") {
      pos++;
      return parsePrimary();
    }
    if (token === "(") {
      pos++;
      const val = parseExpr();
      if (tokens[pos] === ")") {
        pos++;
      }
      return val;
    }
    pos++;
    return parseFloat(token || "0");
  }

  function parseMultiplicative(): number {
    let val = parsePrimary();
    while (tokens[pos] === "*" || tokens[pos] === "/") {
      const op = tokens[pos];
      pos++;
      const nextVal = parsePrimary();
      if (op === "*") {
        val *= nextVal;
      } else {
        val /= nextVal;
      }
    }
    return val;
  }

  function parseExpr(): number {
    let val = parseMultiplicative();
    while (tokens[pos] === "+" || tokens[pos] === "-") {
      const op = tokens[pos];
      pos++;
      const nextVal = parseMultiplicative();
      if (op === "+") {
        val += nextVal;
      } else {
        val -= nextVal;
      }
    }
    return val;
  }

  return parseExpr();
}

// Helper to flip the comparison operator around
export function flipOperator(op: string): string {
  if (op === ">") return "<";
  if (op === "<") return ">";
  if (op === ">=") return "<=";
  if (op === "<=") return ">=";
  return op;
}

// Format number into clean representation preserving clean integers and reasonably rounded floats
export function formatConst(n: number): string {
  const fixed = Number(n.toFixed(6));
  return fixed.toString();
}

// Main helper to optimize single leaf conditions with linear expressions on single variables
export function optimizeLeafArithmetic(leaf: string): string {
  const clean = stripOuterParens(leaf).trim();
  const match = findTopLevelOperator(clean);
  if (!match) return leaf;

  let { op, index } = match;
  let leftExpr = clean.substring(0, index).trim();
  let rightExpr = clean.substring(index + op.length).trim();

  // If there are comments inside, skip optimizing
  if (leftExpr.includes("--") || leftExpr.includes("/*") || rightExpr.includes("--") || rightExpr.includes("/*")) {
    return leaf;
  }

  const leftVar = getSingleVariable(leftExpr);
  const rightVar = getSingleVariable(rightExpr);

  let varName: string;
  let varOnLeft: boolean;

  if (leftVar !== null && rightVar === null) {
    varName = leftVar;
    varOnLeft = true;
  } else if (rightVar !== null && leftVar === null) {
    varName = rightVar;
    varOnLeft = false;
  } else {
    return leaf;
  }

  if (!varOnLeft) {
    const temp = leftExpr;
    leftExpr = rightExpr;
    rightExpr = temp;
    op = flipOperator(op);
  }

  if (!isPureMathExpr(rightExpr)) {
    return leaf;
  }

  // Substitutes the variable with 0 in the left expression to ensure it is clean math
  const leftSub0 = replaceVariable(leftExpr, varName, 0);
  if (!isPureMathExpr(leftSub0)) {
    return leaf;
  }

  try {
    const C = safeEval(rightExpr);
    const L0 = safeEval(leftSub0);
    const L1 = safeEval(replaceVariable(leftExpr, varName, 1));
    const L2 = safeEval(replaceVariable(leftExpr, varName, 2));

    const B = L0;
    const A = L1 - L0;

    // Linear equation check: L(2) must equal 2 * A + B
    if (Math.abs(L2 - (2 * A + B)) > 1e-9) {
      return leaf;
    }

    if (Math.abs(A) < 1e-9) {
      return leaf;
    }

    const newVal = (C - B) / A;
    let finalOp = op;
    if (A < 0) {
      finalOp = flipOperator(op);
    }

    const newValStr = formatConst(newVal);
    return `${varName} ${finalOp} ${newValStr}`;
  } catch (err) {
    console.error("Leaf arithmetic optimization error:", err);
    return leaf;
  }
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

export function generateTableAliases(rawTables: string[]): Record<string, string> {
  const cleanTables = rawTables.map(t => {
    const match = /^[A-Za-z0-9_]+/.exec(t.trim().split(/\s+/)[0]);
    return match ? match[0] : t.trim().split(/\s+/)[0];
  });
  
  const uniqueTables = Array.from(new Set(cleanTables)).filter(Boolean);
  
  const lengths: Record<string, number> = {};
  for (const t of uniqueTables) {
    lengths[t] = 1;
  }
  
  let hasCollision = true;
  let iterations = 0;
  while (hasCollision && iterations < 20) {
    iterations++;
    hasCollision = false;
    
    const currentAliases: Record<string, string> = {};
    const aliasToTables: Record<string, string[]> = {};
    
    for (const t of uniqueTables) {
      const len = lengths[t];
      const alias = t.substring(0, Math.min(len, t.length)).toLowerCase();
      currentAliases[t] = alias;
      if (!aliasToTables[alias]) {
        aliasToTables[alias] = [];
      }
      aliasToTables[alias].push(t);
    }
    
    for (const alias of Object.keys(aliasToTables)) {
      const colliding = aliasToTables[alias];
      if (colliding.length > 1) {
        hasCollision = true;
        for (const t of colliding) {
          if (lengths[t] === 1) {
            lengths[t] = 3;
          } else {
            lengths[t] = lengths[t] + 1;
          }
        }
      }
    }
  }
  
  const finalMap: Record<string, string> = {};
  for (let i = 0; i < rawTables.length; i++) {
    const raw = rawTables[i];
    const clean = cleanTables[i];
    finalMap[raw] = clean.substring(0, Math.min(lengths[clean] || 1, clean.length)).toLowerCase();
  }
  return finalMap;
}

export function prefixIdentifiersInString(sqlSnippet: string, alias: string): string {
  let result = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  
  let currentWord = "";
  
  const keywords = new Set([
    "select", "from", "where", "join", "on", "and", "or", "not", "in", "like", 
    "between", "is", "null", "as", "year", "month", "day", "date", "count", 
    "sum", "avg", "max", "min", "case", "when", "then", "else", "end", "group", "by", "order", "limit", "asc", "desc", "null"
  ]);
  
  function flushWord(word: string, nextChar: string, prevChar: string): string {
    if (!word) return "";
    if (/^\d+$/.test(word) || keywords.has(word.toLowerCase())) {
      return word;
    }
    if (prevChar === "." || nextChar === ".") {
      return word;
    }
    return `${alias}.${word}`;
  }
  
  for (let i = 0; i < sqlSnippet.length; i++) {
    const char = sqlSnippet[i];
    
    if (char === "'" && !inDoubleQuote) {
      if (currentWord) {
        const prev = sqlSnippet[i - currentWord.length - 1] || "";
        result += flushWord(currentWord, char, prev);
        currentWord = "";
      }
      inSingleQuote = !inSingleQuote;
      result += char;
      continue;
    }
    if (char === '"' && !inSingleQuote) {
      if (currentWord) {
        const prev = sqlSnippet[i - currentWord.length - 1] || "";
        result += flushWord(currentWord, char, prev);
        currentWord = "";
      }
      inDoubleQuote = !inDoubleQuote;
      result += char;
      continue;
    }
    
    if (inSingleQuote || inDoubleQuote) {
      result += char;
      continue;
    }
    
    if (/[A-Za-z0-9_]/.test(char)) {
      currentWord += char;
    } else {
      if (currentWord) {
        const prev = sqlSnippet[i - currentWord.length - 1] || "";
        result += flushWord(currentWord, char, prev);
        currentWord = "";
      }
      result += char;
    }
  }
  
  if (currentWord) {
    const prev = sqlSnippet[sqlSnippet.length - currentWord.length - 1] || "";
    result += flushWord(currentWord, "", prev);
  }
  
  return result;
}

export function prefixSelectField(f: string, alias: string): string {
  const parts = f.split(/\s+as\s+/i);
  if (parts.length > 1) {
    const expr = prefixIdentifiersInString(parts[0], alias);
    const right = parts[1].trim();
    return `${expr} AS ${right}`;
  }
  
  const lastSpaceIdx = f.lastIndexOf(" ");
  if (lastSpaceIdx !== -1 && !f.includes(")")) {
    const potentialAlias = f.substring(lastSpaceIdx + 1).trim();
    if (/^[A-Za-z0-9_]+$/.test(potentialAlias)) {
      const expr = prefixIdentifiersInString(f.substring(0, lastSpaceIdx), alias);
      return `${expr} ${potentialAlias}`;
    }
  }
  
  return prefixIdentifiersInString(f, alias);
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
      
      const mainTableClean = currentParsed.mainTable.trim().split(/\s+/)[0];
      const subTableClean = subParsed.mainTable.trim().split(/\s+/)[0];
      
      const aliases = generateTableAliases([mainTableClean, subTableClean]);
      const mainAlias = aliases[mainTableClean] || "v";
      const subAlias = aliases[subTableClean] || "p";
      
      // Prefix current query elements with mainAlias
      currentParsed.selectFields = currentParsed.selectFields.map(f => prefixSelectField(f, mainAlias));
      currentParsed.groupByFields = currentParsed.groupByFields.map(g => prefixIdentifiersInString(g, mainAlias));
      currentParsed.orderByFields = currentParsed.orderByFields.map(o => ({
        column: prefixIdentifiersInString(o.column, mainAlias),
        direction: o.direction
      }));
      currentParsed.mainTable = `${mainTableClean} ${mainAlias}`;
      
      // Prefix sub query elements with subAlias
      const subSelectsPrefixed = subParsed.selectFields.map(f => prefixSelectField(f, subAlias));
      const subWherePrefixed = subParsed.whereCondition ? prefixIdentifiersInString(subParsed.whereCondition, subAlias) : "";
      const subGroupByPrefixed = subParsed.groupByFields.map(g => prefixIdentifiersInString(g, subAlias));
      const subOrderByPrefixed = subParsed.orderByFields.map(o => ({
        column: prefixIdentifiersInString(o.column, subAlias),
        direction: o.direction
      }));
      const subTableWithAlias = `${subTableClean} ${subAlias}`;
      
      const firstSubField = subSelectsPrefixed[0];
      const mainSelectsLower = new Set(currentParsed.selectFields.map(f => f.toLowerCase().trim()));
      
      const extraSelects: string[] = [];
      // Move other select fields (slice(1))
      for (const f of subSelectsPrefixed.slice(1)) {
        if (!mainSelectsLower.has(f.toLowerCase().trim())) {
          extraSelects.push(f);
          mainSelectsLower.add(f.toLowerCase().trim());
        }
      }
      // Move fields from whereCondition
      const whereFields = extractFieldsFromCondition(subWherePrefixed);
      for (const wf of whereFields) {
        if (!mainSelectsLower.has(wf.toLowerCase().trim()) && wf.toLowerCase() !== firstSubField.toLowerCase()) {
          extraSelects.push(wf);
          mainSelectsLower.add(wf.toLowerCase().trim());
        }
      }
      
      currentParsed.selectFields = [...currentParsed.selectFields, ...extraSelects];
      currentParsed.orderByFields = [...currentParsed.orderByFields, ...subOrderByPrefixed];
      
      const currentGroupByLower = new Set(currentParsed.groupByFields.map(g => g.toLowerCase().trim()));
      for (const gb of subGroupByPrefixed) {
        if (!currentGroupByLower.has(gb.toLowerCase().trim())) {
          currentParsed.groupByFields.push(gb);
        }
      }
      
      // Add join condition
      const joinCondition = `(${prefixIdentifiersInString(field, mainAlias)} = ${firstSubField})`;
      currentParsed.joins.push({
        joinType: "JOIN",
        table: subTableWithAlias,
        onCondition: joinCondition
      });
      
      const subJoinsPrefixed = subParsed.joins.map(join => ({
        ...join,
        onCondition: join.onCondition ? prefixIdentifiersInString(join.onCondition, subAlias) : ""
      }));
      currentParsed.joins.push(...subJoinsPrefixed);
      
      // Update where condition: replace the exact matched subquery with its internal conditions (or 1=1 if none)
      const replacement = subWherePrefixed ? `(${subWherePrefixed})` : "1=1";
      const idx = currentParsed.whereCondition.indexOf(fullMatchString);
      if (idx !== -1) {
        currentParsed.whereCondition = 
          currentParsed.whereCondition.substring(0, idx) + 
          replacement + 
          currentParsed.whereCondition.substring(idx + fullMatchString.length);
      }
      
      currentParsed.whereCondition = prefixIdentifiersInString(currentParsed.whereCondition, mainAlias);
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
    // Leaf node: Optimize arithmetic and Year filters inside single conditions
    let leaf = optimizeLeafArithmetic(clean);
    leaf = optimizeYearFilter(leaf);
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

export function formatSqlWithIndentation(sql: string): string {
  if (!sql || !sql.trim()) return "";
  try {
    const parsed = parseSqlStringToData(sql);
    const lines: string[] = [];
    
    // 1. SELECT
    lines.push("SELECT");
    if (parsed.selectFields.length > 0) {
      parsed.selectFields.forEach((f, idx) => {
        const comma = idx < parsed.selectFields.length - 1 ? "," : "";
        lines.push(`${formatCaseInExpression(f.trim(), "    ")}${comma}`);
      });
    } else {
      lines.push("    *");
    }
    
    // 2. FROM
    lines.push("FROM");
    const mainTableClean = parsed.mainTable.trim();
    lines.push(`    ${mainTableClean}`);
    
    // 3. JOINS
    for (const j of parsed.joins) {
      lines.push(j.joinType.toUpperCase());
      let joinLine = j.table.trim();
      if (j.onCondition) {
        joinLine += ` ON ${j.onCondition.trim()}`;
      }
      lines.push(`    ${joinLine}`);
    }
    
    // 4. WHERE
    if (parsed.whereCondition && parsed.whereCondition.trim()) {
      lines.push("WHERE");
      const formattedWhere = formatWhereConditionWithIndentation(parsed.whereCondition, "    ");
      lines.push(...formattedWhere);
    }
    
    // 5. GROUP BY
    if (parsed.groupByFields.length > 0) {
      lines.push("GROUP BY");
      parsed.groupByFields.forEach((g, idx) => {
        const comma = idx < parsed.groupByFields.length - 1 ? "," : "";
        lines.push(`    ${g.trim()}${comma}`);
      });
    }
    
    // 6. ORDER BY
    if (parsed.orderByFields.length > 0) {
      lines.push("ORDER BY");
      parsed.orderByFields.forEach((o, idx) => {
        const comma = idx < parsed.orderByFields.length - 1 ? "," : "";
        lines.push(`    ${o.column.trim()} ${o.direction}${comma}`);
      });
    }
    
    // 7. LIMIT
    if (parsed.limit && parsed.limit.trim()) {
      lines.push("LIMIT");
      lines.push(`    ${parsed.limit.trim()}`);
    }
    
    return lines.join("\n");
  } catch (err) {
    console.error("Formatting error, defaulting to fallback formatter:", err);
    return sql;
  }
}

export function formatWhereConditionWithIndentation(cond: string, indent: string = "    "): string[] {
  const clean = cond.trim();
  if (!clean) return [];
  
  const result = splitTopLevelJunction(clean);
  if (!result.type || result.parts.length <= 1) {
    if (clean.startsWith("(") && clean.endsWith(")")) {
      const inner = clean.slice(1, -1).trim();
      const innerResult = splitTopLevelJunction(inner);
      if (innerResult.type && innerResult.parts.length > 1) {
        const formattedInner = formatWhereConditionWithIndentation(inner, "    ");
        if (formattedInner.length > 0) {
          const firstLineTrimmed = formattedInner[0].trimStart();
          formattedInner[0] = "    (" + firstLineTrimmed;
          formattedInner[formattedInner.length - 1] = formattedInner[formattedInner.length - 1] + ")";
          return formattedInner;
        }
      }
    }
    return ["    " + clean];
  }
  
  const lines: string[] = [];
  const op = result.type; // "AND" or "OR"
  
  // Format the first part
  const firstParts = formatWhereConditionWithIndentation(result.parts[0], "    ");
  lines.push(...firstParts);
  
  // For subsequent parts, format and prepend op
  for (let i = 1; i < result.parts.length; i++) {
    const partLines = formatWhereConditionWithIndentation(result.parts[i], "    ");
    if (partLines.length > 0) {
      const trimmedLine = partLines[0].trimStart();
      partLines[0] = `    ${op} ${trimmedLine}`;
      lines.push(...partLines);
    }
  }
  
  return lines;
}

interface Token {
  type: 'word' | 'string' | 'whitespace' | 'symbol';
  value: string;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const char = input[i];
    
    // Single quote string
    if (char === "'") {
      let val = "'";
      i++;
      while (i < input.length) {
        val += input[i];
        if (input[i] === "'") {
          if (i + 1 < input.length && input[i + 1] === "'") {
            val += "'";
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      tokens.push({ type: 'string', value: val });
      continue;
    }
    
    // Double quote string
    if (char === '"') {
      let val = '"';
      i++;
      while (i < input.length) {
        val += input[i];
        if (input[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      tokens.push({ type: 'string', value: val });
      continue;
    }
    
    // Whitespace
    if (/\s/.test(char)) {
      let val = "";
      while (i < input.length && /\s/.test(input[i])) {
        val += input[i];
        i++;
      }
      tokens.push({ type: 'whitespace', value: val });
      continue;
    }
    
    // Word (letters, digits, underscore)
    if (/[A-Za-z0-9_]/.test(char)) {
      let val = "";
      while (i < input.length && /[A-Za-z0-9_]/.test(input[i])) {
        val += input[i];
        i++;
      }
      tokens.push({ type: 'word', value: val });
      continue;
    }
    
    // Symbol
    tokens.push({ type: 'symbol', value: char });
    i++;
  }
  return tokens;
}

function parseCaseBlock(tokens: Token[], startIdx: number, baseIndent: string): { formatted: string, nextIdx: number } {
  let depth = 0;
  const whenIndices: number[] = [];
  const elseIndices: number[] = [];
  let endIdx = -1;
  
  for (let j = startIdx + 1; j < tokens.length; j++) {
    const tok = tokens[j];
    if (tok.type === 'word') {
      const valLower = tok.value.toLowerCase();
      if (valLower === 'case') {
        depth++;
      } else if (valLower === 'end') {
        if (depth === 0) {
          endIdx = j;
          break;
        } else {
          depth--;
        }
      } else if (valLower === 'when' && depth === 0) {
        whenIndices.push(j);
      } else if (valLower === 'else' && depth === 0) {
        elseIndices.push(j);
      }
    }
  }
  
  if (endIdx === -1) {
    endIdx = tokens.length;
  }
  
  const headerTokens = tokens.slice(startIdx + 1, whenIndices.length > 0 ? whenIndices[0] : (elseIndices.length > 0 ? elseIndices[0] : endIdx));
  const headerText = rebuildExpressionString(headerTokens, baseIndent);
  let formatted = "CASE" + (headerText ? " " + headerText : "");
  
  for (let k = 0; k < whenIndices.length; k++) {
    const startOfWhen = whenIndices[k];
    const endOfWhen = (k + 1 < whenIndices.length) 
      ? whenIndices[k + 1] 
      : (elseIndices.length > 0 ? elseIndices[0] : endIdx);
    
    const whenTokens = tokens.slice(startOfWhen, endOfWhen);
    const whenText = rebuildExpressionString(whenTokens, baseIndent + "    ");
    formatted += "\n" + baseIndent + "    " + whenText;
  }
  
  if (elseIndices.length > 0) {
    const elseTokens = tokens.slice(elseIndices[0], endIdx);
    const elseText = rebuildExpressionString(elseTokens, baseIndent + "    ");
    formatted += "\n" + baseIndent + "    " + elseText;
  }
  
  formatted += "\n" + baseIndent + "END";
  return { formatted, nextIdx: endIdx + 1 };
}

function rebuildExpressionString(exprTokens: Token[], baseIndent: string): string {
  let s = "";
  let lastWasWordOrString = false;
  for (let i = 0; i < exprTokens.length; i++) {
    const tok = exprTokens[i];
    if (tok.type === 'whitespace') {
      continue;
    }
    
    if (tok.type === 'word' && tok.value.toLowerCase() === 'case') {
      const { formatted, nextIdx } = parseCaseBlock(exprTokens, i, baseIndent);
      if (s.length > 0 && !s.endsWith(" ") && !s.endsWith("(")) {
        s += " ";
      }
      s += formatted;
      i = nextIdx - 1;
      lastWasWordOrString = false;
      continue;
    }
    
    const val = tok.value;
    const isWordOrString = tok.type === 'word' || tok.type === 'string';
    
    if (s.length > 0) {
      const lastChar = s[s.length - 1];
      
      let needSpace = false;
      if (val === ',' || val === ')' || val === '.' || val === '(') {
        needSpace = false;
      } else if (lastChar === '(' || lastChar === '.') {
        needSpace = false;
      } else if (isWordOrString && lastWasWordOrString) {
        needSpace = true;
      } else if ("+-*/%=<>".includes(lastChar) || "+-*/%=<>".includes(val[0])) {
        needSpace = true;
      } else if (lastWasWordOrString || isWordOrString) {
        needSpace = true;
      }
      
      if (needSpace && !s.endsWith(" ")) {
        s += " ";
      }
    }
    
    s += val;
    lastWasWordOrString = isWordOrString;
  }
  return s;
}

export function formatCaseInExpression(expr: string, baseIndent: string): string {
  if (!expr.toLowerCase().includes("case")) {
    return baseIndent + expr;
  }
  
  const tokens = tokenize(expr);
  const hasCaseWord = tokens.some(t => t.type === 'word' && t.value.toLowerCase() === 'case');
  if (!hasCaseWord) {
    return baseIndent + expr;
  }
  
  const formatted = rebuildExpressionString(tokens, baseIndent);
  return baseIndent + formatted;
}
