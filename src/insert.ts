import { parseSqlStringToData } from "./parser";

export interface TableFieldInfo {
  tableName: string;
  fields: string[];
}

export interface CustomExercise {
  id: string;
  title: string;
  description: string;
  query: string;
  templateQuery: string;
  targetTable: string;
}

// Global in-memory storage for loaded custom exercise data
export const customDatabase: Record<string, any[]> = {};

// Allows clearing or replacing custom database records
export function setCustomDatabase(db: Record<string, any[]>) {
  // Clear existing keys
  for (const key of Object.keys(customDatabase)) {
    delete customDatabase[key];
  }
  // Assign new keys
  Object.assign(customDatabase, db);
}

/**
 * Extracts table names and select fields from an active SELECT query to build INSERT inputs.
 */
export function extractFieldsAndTablesForInsert(sql: string): TableFieldInfo[] | null {
  if (!sql || !sql.trim()) return null;

  try {
    const parsed = parseSqlStringToData(sql);
    if (!parsed.mainTable) return null;

    // Extract main table name and its alias
    const mainTableName = extractCleanTableName(parsed.mainTable);
    const mainTableAlias = getCleanTableAlias(parsed.mainTable) || mainTableName;

    const tablesList: { name: string; alias: string }[] = [
      { name: mainTableName, alias: mainTableAlias }
    ];

    if (parsed.joins) {
      for (const j of parsed.joins) {
        const jName = extractCleanTableName(j.table);
        const jAlias = getCleanTableAlias(j.table) || jName;
        tablesList.push({ name: jName, alias: jAlias });
      }
    }

    // Map alias -> table name for dot prefixes
    const aliasMap: Record<string, string> = {};
    for (const t of tablesList) {
      aliasMap[t.alias.toLowerCase()] = t.name;
      aliasMap[t.name.toLowerCase()] = t.name;
    }

    // Group fields by table name
    const groupedFields: Record<string, Set<string>> = {};
    for (const t of tablesList) {
      groupedFields[t.name] = new Set<string>();
    }

    if (!parsed.selectFields || parsed.selectFields.length === 0) {
      return null;
    }

    for (const f of parsed.selectFields) {
      let expr = f.trim();

      // Trim "AS alias" or space-separated alias at the end of the select field
      const asMatch = /\s+AS\s+([A-Za-z0-9_]+)$/i.exec(expr);
      if (asMatch) {
        expr = expr.substring(0, asMatch.index).trim();
      } else {
        const spaceMatch = /([A-Za-z0-9_*()]+)\s+([A-Za-z0-9_]+)$/i.exec(expr);
        if (spaceMatch && !/^(AND|OR|AS)$/i.test(spaceMatch[2])) {
          expr = spaceMatch[1].trim();
        }
      }

      // Skip computed functions or count(*)
      if (expr.includes("(") || expr.includes(")") || expr === "*") {
        continue;
      }

      if (expr.includes(".")) {
        const parts = expr.split(".");
        const prefix = parts[0].trim().toLowerCase();
        const col = parts[1].trim();

        const targetTable = aliasMap[prefix];
        if (targetTable) {
          groupedFields[targetTable].add(col);
        } else {
          // Fallback to first table if prefix is not recognized
          groupedFields[tablesList[0].name].add(col);
        }
      } else {
        // No dot prefix, assign to the mainTable
        groupedFields[tablesList[0].name].add(expr);
      }
    }

    const result: TableFieldInfo[] = [];
    for (const t of tablesList) {
      const fields = Array.from(groupedFields[t.name]);
      if (fields.length > 0) {
        result.push({
          tableName: t.name,
          fields: fields
        });
      }
    }

    return result.length > 0 ? result : null;
  } catch (e) {
    console.error("Error parsing fields and tables:", e);
    return null;
  }
}

function extractCleanTableName(tableStr: string): string {
  let clean = tableStr.trim();
  const asRegex = /\s+AS\s+/i;
  if (asRegex.test(clean)) {
    const parts = clean.split(asRegex);
    return parts[0].trim().replace(/[\[\]`"]/g, "");
  }
  const parts = clean.split(/\s+/);
  if (parts.length > 1) {
    return parts[0].trim().replace(/[\[\]`"]/g, "");
  }
  return clean.replace(/[\[\]`"]/g, "");
}

function getCleanTableAlias(tableStr: string): string {
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

/**
 * High-fidelity sequential scanner for row values in an INSERT statement.
 * Supports string literals, numbers, and NULL.
 */
export function parseInsertValues(valuesPart: string): any[][] {
  const rows: any[][] = [];
  let inRow = false;
  let currentRowStr = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < valuesPart.length; i++) {
    const char = valuesPart[i];

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      currentRowStr += char;
      continue;
    }
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      currentRowStr += char;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (char === "(") {
        inRow = true;
        currentRowStr = "";
        continue;
      }
      if (char === ")") {
        inRow = false;
        const vals = parseRowValuesList(currentRowStr);
        rows.push(vals);
        continue;
      }
    }

    if (inRow) {
      currentRowStr += char;
    }
  }
  return rows;
}

function parseRowValuesList(rowStr: string): any[] {
  const vals: any[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (char === "," && !inSingleQuote && !inDoubleQuote) {
      vals.push(cleanParsedValue(current));
      current = "";
    } else {
      current += char;
    }
  }
  vals.push(cleanParsedValue(current));
  return vals;
}

function cleanParsedValue(valStr: string): any {
  const trimmed = valStr.trim();
  if (trimmed.toUpperCase() === "NULL") return null;

  // Check if enclosed in single quotes or double quotes
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }

  if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  if (/^-?\d*\.\d+$/.test(trimmed)) return parseFloat(trimmed);
  return trimmed;
}

/**
 * Translates a set of INSERT statements into in-memory table rows.
 */
export function populateCustomDatabaseFromInserts(inserts: string[]): Record<string, any[]> {
  const db: Record<string, any[]> = {};
  for (const insertSql of inserts) {
    // Parse table name
    const tableMatch = /INSERT\s+INTO\s+([A-Za-z0-9_]+)/i.exec(insertSql);
    if (!tableMatch) continue;
    const tableName = tableMatch[1].trim().toLowerCase();

    // Parse column names
    const colMatch = /INSERT\s+INTO\s+[A-Za-z0-9_]+\s*\(([^)]+)\)/i.exec(insertSql);
    if (!colMatch) continue;
    const cols = colMatch[1].split(",").map(c => c.trim());

    // Parse values part
    const valuesIndex = insertSql.toUpperCase().indexOf("VALUES");
    if (valuesIndex === -1) continue;

    const valuesPart = insertSql.substring(valuesIndex + 6).trim();
    const rows = parseInsertValues(valuesPart);

    const tableRows: any[] = [];
    for (const rowVals of rows) {
      const rowObj: Record<string, any> = {};
      cols.forEach((col, idx) => {
        rowObj[col] = rowVals[idx] !== undefined ? rowVals[idx] : null;
      });
      tableRows.push(rowObj);
    }
    db[tableName] = tableRows;
  }
  return db;
}

/**
 * Validates and parses a loaded .sql file to see if it qualifies as a Custom Exercise.
 * Must contain at least one INSERT statement and a final SELECT query.
 */
export function parseSqlFileToCustomExercise(fileContent: string, fileName: string): {
  exercise: CustomExercise;
  customDb: Record<string, any[]>;
} | null {
  const commentMatch = /\/\*([\s\S]*?)\*\//.exec(fileContent);
  let description = "Exercício personalizado carregado do arquivo.";
  if (commentMatch) {
    description = commentMatch[1].trim();
  }

  // Find all INSERT statements
  const insertRegex = /INSERT\s+INTO\s+[\s\S]*?;/gi;
  const inserts: string[] = [];
  let match;
  while ((match = insertRegex.exec(fileContent)) !== null) {
    inserts.push(match[0]);
  }

  if (inserts.length === 0) {
    return null; // Not a custom database exercise file
  }

  // Find the last SELECT statement in the file
  let selectQuery = "";
  const lastInsertIndex = fileContent.toUpperCase().lastIndexOf("INSERT INTO");
  if (lastInsertIndex !== -1) {
    const semiIndex = fileContent.indexOf(";", lastInsertIndex);
    if (semiIndex !== -1) {
      selectQuery = fileContent.substring(semiIndex + 1).trim();
    } else {
      selectQuery = fileContent.substring(lastInsertIndex).trim();
      // Remove the insert statement if it's there
      const firstSemicolon = selectQuery.indexOf(";");
      if (firstSemicolon !== -1) {
        selectQuery = selectQuery.substring(firstSemicolon + 1).trim();
      }
    }
  }

  if (!selectQuery.toUpperCase().includes("SELECT")) {
    return null; // No final SELECT query
  }

  const customDb = populateCustomDatabaseFromInserts(inserts);
  const parsedSelect = parseSqlStringToData(selectQuery);
  const mainTable = parsedSelect.mainTable ? extractCleanTableName(parsedSelect.mainTable) : "";

  const title = fileName.replace(/\.sql$/i, "");

  const exercise: CustomExercise = {
    id: "custom",
    title: `Exercício: ${title}`,
    description: description,
    query: selectQuery,
    templateQuery: mainTable ? `SELECT * FROM ${mainTable}` : selectQuery,
    targetTable: mainTable
  };

  return { exercise, customDb };
}

/**
 * Generates the full .SQL file content for the customized exercise.
 */
export function generateSqlExerciseFile(
  enunciado: string,
  tables: TableFieldInfo[],
  rowsData: Record<string, Record<string, string>[]>,
  originalQuery: string
): string {
  let fileContent = `/*\n${enunciado.trim()}\n*/\n\n`;

  for (const table of tables) {
    const rows = rowsData[table.tableName] || [];
    if (rows.length === 0) continue;

    const fieldsStr = table.fields.join(", ");
    fileContent += `INSERT INTO ${table.tableName}(${fieldsStr}) VALUES\n`;

    const valuesList = rows.map((row, idx) => {
      const values = table.fields.map(f => {
        const val = row[f] || "";
        // If it's a number, output it unquoted. Otherwise output as a single-quoted string literal.
        if (/^-?\d+$/.test(val) || /^-?\d*\.\d+$/.test(val)) {
          return val;
        }
        if (val.toUpperCase() === "NULL") {
          return "NULL";
        }
        // Escape single quotes inside single-quoted SQL string
        const escaped = val.replace(/'/g, "''");
        return `'${escaped}'`;
      });
      const isLast = idx === rows.length - 1;
      return `    (${values.join(", ")})${isLast ? "" : ","}`;
    });

    fileContent += valuesList.join("\n") + "\n;\n";
  }

  fileContent += `\n${originalQuery.trim()}\n;\n`;
  return fileContent;
}
