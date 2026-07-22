// SQL-Parser custom grammar parser for Blockly state rebuilding.
// Built to handle commas outside quotes/parens for SELECT, GROUP BY, and ORDER BY;
// separates JOIN clauses with individual ON conditions; and parses WHERE conditions recursively.

import { customDatabase } from "./insert";

const KNOWN_STRING_OR_DATE_FIELDS = new Set([
  "name", "email", "country", "item", "category",
  "nome", "sexo", "cor_cabelo", "tamanho_cabelo", "expressao", "bigode", "barba", "pele", "imagem",
  "sale_date", "date", "data", "created_at", "updated_at", "birth_date", "data_nascimento"
]);

const KNOWN_NUMERIC_FIELDS = new Set([
  "id", "age", "price", "quantity", "stock", "customer_id", "product_id"
]);

export function isCharOrDateField(fieldName: string, sampleVal?: string): boolean {
  if (!fieldName) return false;

  let clean = fieldName.trim().toLowerCase();
  if (clean.includes(".")) {
    clean = clean.split(".").pop() || clean;
  }

  if (KNOWN_STRING_OR_DATE_FIELDS.has(clean)) return true;
  if (KNOWN_NUMERIC_FIELDS.has(clean)) return false;

  if (customDatabase) {
    for (const tbl of Object.keys(customDatabase)) {
      const rows = customDatabase[tbl];
      if (Array.isArray(rows) && rows.length > 0) {
        for (const r of rows) {
          if (r && r[clean] !== undefined && r[clean] !== null) {
            if (typeof r[clean] === "string") return true;
            if (typeof r[clean] === "number") return false;
          }
        }
      }
    }
  }

  const charDatePattern = /(name|nome|email|mail|country|pais|estado|uf|city|cidade|address|end|rua|bairro|sexo|gender|cor|color|cabelo|hair|tamanho|expressao|bigode|barba|pele|skin|image|imagem|img|category|categoria|item|produto|product|desc|descricao|description|title|titulo|tipo|type|status|situacao|cpf|cnpj|rg|phone|tel|codigo|code|cep|varchar|char|text|date|data|dt_|_dt|time|tempo|nascimento|created|updated)/i;

  if (charDatePattern.test(clean)) return true;

  if (sampleVal) {
    const s = sampleVal.trim().replace(/^['"]|['"]$/g, "");
    if (/^\d{4}[-/.]\d{2}[-/.]\d{2}/.test(s) || /^\d{2}[-/.]\d{2}[-/.]\d{4}/.test(s)) return true;
    if (isNaN(Number(s)) && !/^(true|false|null)$/i.test(s)) return true;
  }

  return false;
}

export function ensureQuotesOnWhereValue(field: string, op: string, val: string): string {
  if (!val) return "''";

  let cleanVal = val.trim();
  const upperOp = (op || "=").toUpperCase().trim();

  // If already enclosed in single quotes or double quotes
  if ((cleanVal.startsWith("'") && cleanVal.endsWith("'")) || (cleanVal.startsWith('"') && cleanVal.endsWith('"'))) {
    if (cleanVal.startsWith('"') && cleanVal.endsWith('"')) {
      cleanVal = `'${cleanVal.slice(1, -1)}'`;
    }
    return cleanVal;
  }

  // Handle NULL / TRUE / FALSE keywords
  if (/^(NULL|TRUE|FALSE)$/i.test(cleanVal)) {
    return cleanVal;
  }

  // Handle column-to-column comparison (e.g. pedido.produto_id = produto.id or alias.col)
  if (cleanVal.includes(".") && /^[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*$/.test(cleanVal)) {
    return cleanVal;
  }

  // Handle IN operator
  if (upperOp === "IN") {
    let inner = cleanVal;
    let hasParens = false;
    if (inner.startsWith("(") && inner.endsWith(")")) {
      inner = inner.substring(1, inner.length - 1).trim();
      hasParens = true;
    }

    if (/^SELECT\b/i.test(inner)) {
      return cleanVal;
    }

    const items = inner.split(",").map(item => {
      const trimmed = item.trim();
      if (!trimmed) return "''";
      if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        return trimmed.startsWith('"') ? `'${trimmed.slice(1, -1)}'` : trimmed;
      }
      if (/^(NULL|TRUE|FALSE)$/i.test(trimmed)) return trimmed;
      if (/^-?\d+(?:\.\d+)?$/.test(trimmed) && !isCharOrDateField(field, trimmed)) {
        return trimmed;
      }
      return `'${trimmed.replace(/'/g, "''")}'`;
    });

    const formattedList = items.join(", ");
    return hasParens ? `(${formattedList})` : formattedList;
  }

  // Handle BETWEEN operator
  if (upperOp === "BETWEEN") {
    const andMatch = /\bAND\b/i.exec(cleanVal);
    if (andMatch) {
      const part1 = cleanVal.substring(0, andMatch.index).trim();
      const part2 = cleanVal.substring(andMatch.index + 3).trim();
      const q1 = ensureQuotesOnWhereValue(field, "=", part1);
      const q2 = ensureQuotesOnWhereValue(field, "=", part2);
      return `${q1} AND ${q2}`;
    }
  }

  const isCharOrDate = isCharOrDateField(field, cleanVal);
  const isNumeric = /^-?\d+(?:\.\d+)?$/.test(cleanVal);
  const isDatePattern = /^\d{4}[-/.]\d{2}[-/.]\d{2}/.test(cleanVal) || /^\d{2}[-/.]\d{2}[-/.]\d{4}/.test(cleanVal);

  if (isCharOrDate || isDatePattern || !isNumeric) {
    if (isCharOrDate || !isNumeric || isDatePattern) {
      const escaped = cleanVal.replace(/'/g, "''");
      return `'${escaped}'`;
    }
  }

  return cleanVal;
}

export function autoQuoteWhereClause(whereStr: string): string {
  if (!whereStr || !whereStr.trim()) return whereStr;
  return processWhereBranch(whereStr);
}

function processWhereBranch(expr: string): string {
  const clean = expr.trim();
  if (!clean) return clean;

  if (/^CASE\b/i.test(clean) || /^SELECT\b/i.test(clean)) {
    return clean;
  }

  if (clean.startsWith("(") && clean.endsWith(")")) {
    let depth = 0;
    let balanced = true;
    for (let i = 0; i < clean.length; i++) {
      if (clean[i] === "(") depth++;
      else if (clean[i] === ")") {
        depth--;
        if (depth === 0 && i < clean.length - 1) {
          balanced = false;
        }
      }
    }
    if (balanced && depth === 0) {
      return "(" + processWhereBranch(clean.slice(1, -1)) + ")";
    }
  }

  let parenDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let betweenCount = 0;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === "'" && !inDoubleQuote) inSingleQuote = !inSingleQuote;
    else if (char === '"' && !inSingleQuote) inDoubleQuote = !inDoubleQuote;

    if (inSingleQuote || inDoubleQuote) continue;

    if (char === "(") parenDepth++;
    else if (char === ")") parenDepth--;

    if (parenDepth === 0) {
      const subBetween = clean.substring(i, i + 7).toUpperCase();
      if (subBetween === "BETWEEN" && (i === 0 || !/\w/.test(clean[i - 1])) && (i + 7 === clean.length || !/\w/.test(clean[i + 7]))) {
        betweenCount++;
      }

      const subOR = clean.substring(i, i + 4).toUpperCase();
      if ((subOR === " OR " || subOR === "\tOR ") && i > 0) {
        const left = clean.substring(0, i);
        const right = clean.substring(i + 4);
        return `${processWhereBranch(left)} OR ${processWhereBranch(right)}`;
      }

      const subAND = clean.substring(i, i + 5).toUpperCase();
      if ((subAND === " AND " || subAND === "\tAND ") && i > 0) {
        if (betweenCount > 0) {
          betweenCount--;
        } else {
          const left = clean.substring(0, i);
          const right = clean.substring(i + 5);
          return `${processWhereBranch(left)} AND ${processWhereBranch(right)}`;
        }
      }
    }
  }

  const ops = ["NOT LIKE", "LIKE", "IN", "BETWEEN", ">=", "<=", "!=", "<>", "=", ">", "<"];
  for (const op of ops) {
    const regex = new RegExp(`^(.+?)\\s+(${op})\\s+(.+)$`, "i");
    const match = regex.exec(clean);
    if (match) {
      const field = match[1].trim();
      const rawVal = match[3].trim();

      const quotedVal = ensureQuotesOnWhereValue(field, match[2], rawVal);
      return `${field} ${match[2]} ${quotedVal}`;
    }
  }

  return clean;
}

export interface JoinData {
  joinType: string;
  table: string;
  onCondition: string;
}

export interface OrderByItem {
  column: string;
  direction: "ASC" | "DESC";
}

export interface ParsedSqlQuery {
  selectFields: string[];
  mainTable: string;
  joins: JoinData[];
  whereCondition: string;
  groupByFields: string[];
  havingCondition: string;
  orderByFields: OrderByItem[];
  limit: string;
}

// Strip SQL comments cleanly
export function stripSqlComments(sql: string): string {
  let clean = sql.replace(/\/\*[\s\S]*?\*\//g, "");
  const lines = clean.split("\n");
  const filtered = lines.map(line => {
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inBacktick = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === "\\" && (inSingleQuote || inDoubleQuote || inBacktick)) {
        i++;
        continue;
      }
      if (char === "'" && !inDoubleQuote && !inBacktick) inSingleQuote = !inSingleQuote;
      else if (char === '"' && !inSingleQuote && !inBacktick) inDoubleQuote = !inDoubleQuote;
      else if (char === "`" && !inSingleQuote && !inDoubleQuote) inBacktick = !inBacktick;
      else if (!inSingleQuote && !inDoubleQuote && !inBacktick && line[i] === "-" && line[i + 1] === "-") {
        return line.substring(0, i);
      }
    }
    return line;
  });
  return filtered.join("\n");
}

// Split a string by a given character (e.g. comma) only when outside parentheses and quotes
export function splitSmart(str: string, delimiter: string = ","): string[] {
  const result: string[] = [];
  let current = "";
  let parenDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    // Handle escapes inside quotes
    if (char === "\\" && (inSingleQuote || inDoubleQuote || inBacktick)) {
      current += char;
      if (i + 1 < str.length) {
        current += str[i + 1];
        i++;
      }
      continue;
    }

    if (char === "'" && !inDoubleQuote && !inBacktick) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && !inBacktick) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === "`" && !inSingleQuote && !inDoubleQuote) {
      inBacktick = !inBacktick;
    }

    if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      if (char === "(") parenDepth++;
      else if (char === ")") parenDepth--;
    }

    // If delimiter is found and we are not in parentheses or quotes, split
    if (char === delimiter && parenDepth === 0 && !inSingleQuote && !inDoubleQuote && !inBacktick) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  const trimmed = current.trim();
  if (trimmed) {
    result.push(trimmed);
  }

  return result.filter(item => item.length > 0);
}

// High-fidelity SQL Clause Extractor using a single sequential scan
export function extractRawClauses(sql: string): Record<string, string> {
  const cleanSql = stripSqlComments(sql).trim().replace(/\s+/g, " ");

  // Identify matching boundaries for clauses
  const keywords = [
    { key: "SELECT", regex: /\bSELECT\b/i },
    { key: "FROM", regex: /\bFROM\b/i },
    { key: "WHERE", regex: /\bWHERE\b/i },
    { key: "GROUP BY", regex: /\bGROUP\s+BY\b/i },
    { key: "HAVING", regex: /\bHAVING\b/i },
    { key: "ORDER BY", regex: /\bORDER\s+BY\b/i },
    { key: "LIMIT", regex: /\bLIMIT\b/i }
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

  for (let i = 0; i < cleanSql.length; i++) {
    const char = cleanSql[i];

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

    if (inSingleQuote || inDoubleQuote || inBacktick) continue;

    if (char === "(") {
      parenDepth++;
      continue;
    }
    if (char === ")") {
      parenDepth--;
      continue;
    }

    if (parenDepth === 0) {
      // Check each keyword
      for (const kw of keywords) {
        // Word boundary check before keyword
        if (i > 0 && /\w/.test(cleanSql[i - 1])) {
          continue;
        }

        const len = kw.key.length;
        const sub = cleanSql.substring(i, i + len).toUpperCase();
        
        // Match base keyword or multi-word keyword (GROUP BY or ORDER BY with extra spaces)
        let matchedKey = false;
        let matchedLen = len;
        
        if (kw.key === "GROUP BY" || kw.key === "ORDER BY") {
          const firstWord = kw.key.split(" ")[0];
          const secondWord = kw.key.split(" ")[1];
          if (cleanSql.substring(i, i + firstWord.length).toUpperCase() === firstWord) {
            let nextIndex = i + firstWord.length;
            while (nextIndex < cleanSql.length && /\s/.test(cleanSql[nextIndex])) {
              nextIndex++;
            }
            if (cleanSql.substring(nextIndex, nextIndex + secondWord.length).toUpperCase() === secondWord) {
              // Word boundary check after second word
              const afterChar = cleanSql[nextIndex + secondWord.length];
              if (!afterChar || !/\w/.test(afterChar)) {
                matchedKey = true;
                matchedLen = nextIndex + secondWord.length - i;
              }
            }
          }
        } else {
          if (sub === kw.key) {
            // Word boundary after keyword
            const afterChar = cleanSql[i + len];
            if (!afterChar || !/\w/.test(afterChar)) {
              matchedKey = true;
            }
          }
        }

        if (matchedKey) {
          matches.push({ key: kw.key, index: i, length: matchedLen });
          i += matchedLen - 1;
          break;
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
    HAVING: "",
    ORDER_BY: "",
    LIMIT: ""
  };

  for (let k = 0; k < matches.length; k++) {
    const current = matches[k];
    const valStart = current.index + current.length;
    const valEnd = (k + 1 < matches.length) ? matches[k + 1].index : cleanSql.length;
    let snippet = cleanSql.substring(valStart, valEnd).trim();

    if (snippet.endsWith(";")) {
      snippet = snippet.slice(0, -1).trim();
    }

    const dictKey = current.key.replace(" ", "_"); // GROUP BY -> GROUP_BY
    rawClauses[dictKey] = snippet;
  }

  return rawClauses;
}

// Parse Join conditions after the FROM clause
// Recognizes format: "table_1 LEFT JOIN table_2 ON cond1 INNER JOIN table_3 ON cond2"
export function parseFromAndJoins(fromStr: string): { mainTable: string; joins: JoinData[] } {
  const joins: JoinData[] = [];
  const cleanFrom = fromStr.trim();

  // Find occurrences of JOIN keywords outside quotes & parentheses
  // Supported joins: INNER JOIN, LEFT JOIN, RIGHT JOIN, FULL JOIN, CROSS JOIN, JOIN
  const joinTypeRegex = /\b(LEFT\s+OUTER\s+JOIN|LEFT\s+JOIN|RIGHT\s+OUTER\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN|FULL\s+OUTER\s+JOIN|FULL\s+JOIN|CROSS\s+JOIN|JOIN)\b/gi;
  
  // Find all match starts
  const matches: { type: string; index: number; length: number }[] = [];
  let item;
  while ((item = joinTypeRegex.exec(cleanFrom)) !== null) {
    // Confirm we are not in parentheses or quotes
    let parenDepth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inBacktick = false;

    for (let c = 0; c < item.index; c++) {
      const char = cleanFrom[c];
      if (char === "\\" && (inSingleQuote || inDoubleQuote || inBacktick)) {
        c++;
        continue;
      }
      if (char === "'" && !inDoubleQuote && !inBacktick) inSingleQuote = !inSingleQuote;
      else if (char === '"' && !inSingleQuote && !inBacktick) inDoubleQuote = !inDoubleQuote;
      else if (char === "`" && !inSingleQuote && !inDoubleQuote) inBacktick = !inBacktick;
      else if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
        if (char === "(") parenDepth++;
        else if (char === ")") parenDepth--;
      }
    }

    if (parenDepth === 0 && !inSingleQuote && !inDoubleQuote && !inBacktick) {
      matches.push({
        type: item[1],
        index: item.index,
        length: item[1].length
      });
    }
  }

  if (matches.length === 0) {
    return { mainTable: cleanFrom, joins: [] };
  }

  // Segment FROM string into mainTable and Joins
  const mainTable = cleanFrom.substring(0, matches[0].index).trim();

  for (let j = 0; j < matches.length; j++) {
    const start = matches[j].index + matches[j].length;
    const end = (j + 1 < matches.length) ? matches[j + 1].index : cleanFrom.length;
    const chunk = cleanFrom.substring(start, end).trim();

    // Split chunk into target table and query condition based on ON or USING keyword
    const onIndex = chunk.search(/\bON\b/i);
    let table = chunk;
    let onCondition = "";

    if (onIndex !== -1) {
      table = chunk.substring(0, onIndex).trim();
      onCondition = chunk.substring(onIndex + 2).trim();
    } else {
      const usingIndex = chunk.search(/\bUSING\b/i);
      if (usingIndex !== -1) {
        table = chunk.substring(0, usingIndex).trim();
        onCondition = chunk.substring(usingIndex).trim();
      }
    }

    joins.push({
      joinType: matches[j].type.toUpperCase().replace(/\s+/g, " "),
      table,
      onCondition
    });
  }

  return { mainTable, joins };
}

// Full parser driver
export function parseSqlStringToData(sql: string): ParsedSqlQuery {
  const clauses = extractRawClauses(sql);

  // 1. SELECT fields split by comma
  let selectFields = clauses.SELECT ? splitSmart(clauses.SELECT) : [];
  selectFields = selectFields.map(f => f.trim()).filter(f => f && f !== "*");

  // 2. FROM and JOIN parser
  const { mainTable, joins } = parseFromAndJoins(clauses.FROM);

  // 3. WHERE clause string format mapping
  const whereCondition = clauses.WHERE ? autoQuoteWhereClause(clauses.WHERE) : "";

  // 4. GROUP BY fields split by comma
  const groupByFields = clauses.GROUP_BY ? splitSmart(clauses.GROUP_BY) : [];

  // New: HAVING clause
  const havingCondition = clauses.HAVING || "";

  // 5. ORDER BY fields split by comma, with sorting parsed: e.g. "age DESC, name ASC"
  const orderByFields: OrderByItem[] = [];
  if (clauses.ORDER_BY) {
    const rawOrders = splitSmart(clauses.ORDER_BY);
    for (const orderItem of rawOrders) {
      const match = /\s(ASC|DESC)\s*$/i.exec(orderItem);
      let col = orderItem;
      let dir: "ASC" | "DESC" = "ASC";
      if (match) {
        col = orderItem.substring(0, match.index).trim();
        dir = match[1].toUpperCase() as "ASC" | "DESC";
      }
      if (col.trim()) {
        orderByFields.push({ column: col.trim(), direction: dir });
      }
    }
  }

  // 6. LIMIT value extraction
  const limit = clauses.LIMIT || "";

  return {
    selectFields,
    mainTable,
    joins,
    whereCondition,
    groupByFields,
    havingCondition,
    orderByFields,
    limit
  };
}
