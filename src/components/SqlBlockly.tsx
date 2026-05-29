import React, { useEffect, useRef } from "react";
import * as Blockly from "blockly";
import { parseSqlStringToData } from "../parser.ts";
import { Columns, Database, Filter, Layers, ArrowDownAZ, GitMerge } from "lucide-react";

// Define the mutable list of support functions for the function item dropdown
const DYNAMIC_FUNCTIONS: [string, string][] = [
  ["COUNT", "COUNT"],
  ["SUM", "SUM"],
  ["AVG", "AVG"],
  ["MIN", "MIN"],
  ["MAX", "MAX"],
  ["UPPER", "UPPER"],
  ["LOWER", "LOWER"],
  ["ROUND", "ROUND"],
  ["SUBSTRING", "SUBSTRING"]
];

// Define the blocks configuration JSON array
const BLOCKS_JSON = [
  {
    "type": "sql_query",
    "message0": "SELECT %1",
    "args0": [
      { "type": "input_value", "name": "FIELDS", "check": "SelectItem" }
    ],
    "message1": "FROM %1",
    "args1": [
      { "type": "input_value", "name": "TABLES", "check": "TableOrJoin" }
    ],
    "message2": "WHERE %1",
    "args2": [
      { "type": "input_value", "name": "WHERE", "check": "Condition" }
    ],
    "message3": "GROUP BY %1",
    "args3": [
      { "type": "input_value", "name": "GROUP_BY", "check": "GroupByItem" }
    ],
    "message4": "ORDER BY %1",
    "args4": [
      { "type": "input_value", "name": "ORDER_BY", "check": "OrderItem" }
    ],
    "message5": "LIMIT %1",
    "args5": [
      { "type": "field_input", "name": "LIMIT", "text": "" }
    ],
    "inputsInline": false,
    "colour": "#4f46e5",
    "tooltip": "Query SQL principal estruturada",
    "helpUrl": ""
  },
  {
    "type": "sql_select_item",
    "message0": "%1 %2",
    "args0": [
      { "type": "field_input", "name": "FIELD_NAME", "text": "id" },
      { "type": "input_value", "name": "NEXT", "check": "SelectItem" }
    ],
    "output": "SelectItem",
    "colour": "#06b6d4",
    "tooltip": "Um campo/coluna selecionado na consulta",
    "helpUrl": ""
  },
  {
    "type": "sql_function_item",
    "message0": "%1(%2) AS %3 %4",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "FUNC_NAME",
        "options": DYNAMIC_FUNCTIONS
      },
      { "type": "field_input", "name": "PARAM", "text": "*" },
      { "type": "field_input", "name": "ALIAS", "text": "total" },
      { "type": "input_value", "name": "NEXT", "check": "SelectItem" }
    ],
    "output": "SelectItem",
    "colour": "#06b6d4",
    "tooltip": "Uma função SQL no SELECT (ex: COUNT(*))",
    "helpUrl": ""
  },
  {
    "type": "sql_table_item",
    "message0": "%1 %2",
    "args0": [
      { "type": "field_input", "name": "TABLE_NAME", "text": "users" },
      { "type": "input_value", "name": "NEXT", "check": "TableOrJoin" }
    ],
    "output": "TableOrJoin",
    "colour": "#ec4899",
    "tooltip": "Uma tabela na cláusula FROM",
    "helpUrl": ""
  },
  {
    "type": "sql_join_item",
    "message0": "%1 %2 ON %3 %4",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "JOIN_TYPE",
        "options": [
          ["INNER JOIN", "INNER JOIN"],
          ["LEFT JOIN", "LEFT JOIN"],
          ["RIGHT JOIN", "RIGHT JOIN"],
          ["FULL JOIN", "FULL JOIN"],
          ["CROSS JOIN", "CROSS JOIN"],
          ["JOIN", "JOIN"]
        ]
      },
      { "type": "field_input", "name": "TABLE_NAME", "text": "orders" },
      { "type": "input_value", "name": "ON", "check": "Condition" },
      { "type": "input_value", "name": "NEXT", "check": "TableOrJoin" }
    ],
    "output": "TableOrJoin",
    "colour": "#ec4899",
    "tooltip": "Junção (JOIN) com condição de conexão",
    "helpUrl": ""
  },
  {
    "type": "sql_group_by_item",
    "message0": "%1 %2",
    "args0": [
      { "type": "field_input", "name": "FIELD_NAME", "text": "category" },
      { "type": "input_value", "name": "NEXT", "check": "GroupByItem" }
    ],
    "output": "GroupByItem",
    "colour": "#f59e0b",
    "tooltip": "Coluna para agrupamento (GROUP BY)",
    "helpUrl": ""
  },
  {
    "type": "sql_order_by_item",
    "message0": "%1 %2 %3",
    "args0": [
      { "type": "field_input", "name": "COLUMN", "text": "created_at" },
      {
        "type": "field_dropdown",
        "name": "DIRECTION",
        "options": [
          ["ASC", "ASC"],
          ["DESC", "DESC"]
        ]
      },
      { "type": "input_value", "name": "NEXT", "check": "OrderItem" }
    ],
    "output": "OrderItem",
    "colour": "#8b5cf6",
    "tooltip": "Coluna e direção de ordenação (ORDER BY)",
    "helpUrl": ""
  },
  {
    "type": "sql_where_compare",
    "message0": "%1 %2 %3",
    "args0": [
      { "type": "field_input", "name": "FIELD", "text": "age" },
      {
        "type": "field_dropdown",
        "name": "OPERATOR",
        "options": [
          ["=", "="],
          [">", ">"],
          ["<", "<"],
          [">=", ">="],
          ["<=", "<="],
          ["<>", "<>"],
          ["LIKE", "LIKE"],
          ["IN", "IN"],
          ["BETWEEN", "BETWEEN"]
        ]
      },
      { "type": "field_input", "name": "VALUE", "text": "18" }
    ],
    "output": "Condition",
    "colour": "#10b981",
    "tooltip": "Compara um campo com um valor",
    "helpUrl": ""
  },
  {
    "type": "sql_where_and",
    "message0": "%1 AND %2",
    "args0": [
      { "type": "input_value", "name": "LEFT", "check": "Condition" },
      { "type": "input_value", "name": "RIGHT", "check": "Condition" }
    ],
    "output": "Condition",
    "colour": "#10b981",
    "tooltip": "Combina duas condições com operador lógico AND",
    "helpUrl": ""
  },
  {
    "type": "sql_where_or",
    "message0": "%1 OR %2",
    "args0": [
      { "type": "input_value", "name": "LEFT", "check": "Condition" },
      { "type": "input_value", "name": "RIGHT", "check": "Condition" }
    ],
    "output": "Condition",
    "colour": "#10b981",
    "tooltip": "Combina duas condições com operador lógico OR",
    "helpUrl": ""
  }
];

// Register custom blocks safely, redefining them if already existing to avoid hot reload cache issues
try {
  for (const block of BLOCKS_JSON) {
    if ((Blockly as any).Blocks[block.type]) {
      delete (Blockly as any).Blocks[block.type];
    }
  }
  Blockly.defineBlocksWithJsonArray(BLOCKS_JSON);
} catch (e) {
  console.error("Erro ao definir blocos do Blockly:", e);
}

// Tool box XML with simplified compact categories matching each block type perfectly
const TOOLBOX_XML = `
  <xml xmlns="https://developers.google.com/blockly/xml" id="toolbox" style="display: none">
    <category name="Query" colour="210">
      <block type="sql_query"></block>
    </category>
    <category name="Campos" colour="160">
      <block type="sql_select_item"></block>
      <block type="sql_function_item"></block>
    </category>
    <category name="Tabelas" colour="330">
      <block type="sql_table_item"></block>
      <block type="sql_join_item"></block>
    </category>
    <category name="Filtros" colour="125">
      <block type="sql_where_compare"></block>
      <block type="sql_where_and"></block>
      <block type="sql_where_or"></block>
    </category>
    <category name="Grupo" colour="45">
      <block type="sql_group_by_item"></block>
    </category>
    <category name="Ordem" colour="280">
      <block type="sql_order_by_item"></block>
    </category>
  </xml>
`;

interface SqlBlocklyProps {
  onSqlChange: (sql: string) => void;
  editorTriggerRef: React.MutableRefObject<((sql: string) => void) | null>;
}

// Translate deep condition block into correct query clause string
export function parseConditionBlock(block: any): string {
  if (!block) return "";
  const type = block.type;

  if (type === "sql_where_compare") {
    const field = block.getFieldValue("FIELD") || "";
    const op = block.getFieldValue("OPERATOR") || "=";
    const val = block.getFieldValue("VALUE") || "";
    if (!field) return "";
    return `${field} ${op} ${val ? val : "''"}`;
  }

  if (type === "sql_where_and") {
    const leftBlock = block.getInputTargetBlock("LEFT");
    const rightBlock = block.getInputTargetBlock("RIGHT");
    const left = parseConditionBlock(leftBlock);
    const right = parseConditionBlock(rightBlock);
    if (left && right) {
      return `(${left} AND ${right})`;
    } else if (left) {
      return left;
    } else if (right) {
      return right;
    }
    return "";
  }

  if (type === "sql_where_or") {
    const leftBlock = block.getInputTargetBlock("LEFT");
    const rightBlock = block.getInputTargetBlock("RIGHT");
    const left = parseConditionBlock(leftBlock);
    const right = parseConditionBlock(rightBlock);
    if (left && right) {
      return `(${left} OR ${right})`;
    } else if (left) {
      return left;
    } else if (right) {
      return right;
    }
    return "";
  }

  return "";
}

// Compiles the entire visual tree of blocks into a clean SQL string
export function workspaceToSql(workspace: any): string {
  const allBlocks = workspace.getTopBlocks(true);
  const queryBlock = allBlocks.find((b: any) => b.type === "sql_query");

  if (!queryBlock) {
    return "";
  }

  // 1. SELECT fields connection
  const fieldsArray: string[] = [];
  let fieldBlock = queryBlock.getInputTargetBlock("FIELDS");
  while (fieldBlock) {
    if (fieldBlock.type === "sql_select_item") {
      const colName = fieldBlock.getFieldValue("FIELD_NAME")?.trim();
      if (colName) {
        fieldsArray.push(colName);
      }
      fieldBlock = fieldBlock.getInputTargetBlock("NEXT");
    } else if (fieldBlock.type === "sql_function_item") {
      const func = fieldBlock.getFieldValue("FUNC_NAME") || "COUNT";
      const param = fieldBlock.getFieldValue("PARAM")?.trim() || "*";
      const alias = fieldBlock.getFieldValue("ALIAS")?.trim() || "";
      let expr = `${func}(${param})`;
      if (alias) {
        expr += ` AS ${alias}`;
      }
      fieldsArray.push(expr);
      fieldBlock = fieldBlock.getInputTargetBlock("NEXT");
    } else {
      break;
    }
  }
  const fields = fieldsArray.length > 0 ? fieldsArray.join(", ") : "*";

  // 2. FROM tables and JOINs statements
  let fromClause = "";
  let tableBlock = queryBlock.getInputTargetBlock("TABLES");
  while (tableBlock) {
    if (tableBlock.type === "sql_table_item") {
      const tblName = tableBlock.getFieldValue("TABLE_NAME")?.trim() || "table_name";
      if (fromClause) {
        fromClause += `, ${tblName}`;
      } else {
        fromClause = tblName;
      }
      tableBlock = tableBlock.getInputTargetBlock("NEXT");
    } else if (tableBlock.type === "sql_join_item") {
      const joinType = tableBlock.getFieldValue("JOIN_TYPE") || "INNER JOIN";
      const tblName = tableBlock.getFieldValue("TABLE_NAME")?.trim() || "table_name";
      const onBlock = tableBlock.getInputTargetBlock("ON");
      const onClause = parseConditionBlock(onBlock);
      const onStr = onClause ? ` ON ${onClause}` : "";
      
      if (fromClause) {
        fromClause += ` ${joinType} ${tblName}${onStr}`;
      } else {
        fromClause = `${tblName}${onStr}`;
      }
      tableBlock = tableBlock.getInputTargetBlock("NEXT");
    } else {
      break;
    }
  }

  if (!fromClause) {
    fromClause = "table_name";
  }

  // 3. WHERE condition
  const whereBlock = queryBlock.getInputTargetBlock("WHERE");
  const whereClause = parseConditionBlock(whereBlock);

  // 4. GROUP BY fields
  const groupByArray: string[] = [];
  let gbBlock = queryBlock.getInputTargetBlock("GROUP_BY");
  while (gbBlock) {
    if (gbBlock.type === "sql_group_by_item") {
      const gbName = gbBlock.getFieldValue("FIELD_NAME")?.trim();
      if (gbName) {
        groupByArray.push(gbName);
      }
      gbBlock = gbBlock.getInputTargetBlock("NEXT");
    } else {
      break;
    }
  }
  const groupBy = groupByArray.length > 0 ? groupByArray.join(", ") : "";

  // 5. ORDER BY fields
  const orderByArray: string[] = [];
  let ordBlock = queryBlock.getInputTargetBlock("ORDER_BY");
  while (ordBlock) {
    if (ordBlock.type === "sql_order_by_item") {
      const col = ordBlock.getFieldValue("COLUMN")?.trim() || "";
      const dir = ordBlock.getFieldValue("DIRECTION") || "ASC";
      if (col) {
        orderByArray.push(`${col} ${dir}`);
      }
      ordBlock = ordBlock.getInputTargetBlock("NEXT");
    } else {
      break;
    }
  }
  const orderByClause = orderByArray.length > 0 ? orderByArray.join(", ") : "";

  // 6. LIMIT
  const limit = queryBlock.getFieldValue("LIMIT")?.trim() || "";

  let sql = `SELECT ${fields} FROM ${fromClause}`;
  if (whereClause) {
    sql += ` WHERE ${whereClause}`;
  }
  if (groupBy) {
    sql += ` GROUP BY ${groupBy}`;
  }
  if (orderByClause) {
    sql += ` ORDER BY ${orderByClause}`;
  }
  if (limit) {
    sql += ` LIMIT ${limit}`;
  }

  return sql;
}

// Build WHERE and ON conditions recursively
export function buildWhereBlockRecursively(whereStr: string, workspace: any): any {
  whereStr = whereStr.trim();
  if (!whereStr) return null;

  // Stripping outer parentheses
  if (whereStr.startsWith("(") && whereStr.endsWith(")")) {
    let depth = 0;
    let balanced = true;
    for (let i = 0; i < whereStr.length; i++) {
      const char = whereStr[i];
      if (char === "\\" && i > 0 && whereStr[i - 1] !== "\\") {
        i++;
        continue;
      }
      if (char === "(") depth++;
      else if (char === ")") {
        depth--;
        if (depth === 0 && i < whereStr.length - 1) {
          balanced = false;
        }
      }
    }
    if (balanced && depth === 0) {
      return buildWhereBlockRecursively(whereStr.substring(1, whereStr.length - 1), workspace);
    }
  }

  // Find top-level target words AND / OR safely
  let parenDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let orIdx = -1;
  let andIdx = -1;
  let betweenCount = 0;

  for (let i = 0; i < whereStr.length; i++) {
    const char = whereStr[i];

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

    if (inSingleQuote || inDoubleQuote || inBacktick) {
      continue;
    }

    if (char === "(") parenDepth++;
    else if (char === ")") parenDepth--;

    if (parenDepth === 0) {
      // Track BETWEEN to avoid splitting AND inside BETWEEN
      const subBetween = whereStr.substring(i, i + 7).toUpperCase();
      if (subBetween === "BETWEEN" && (i === 0 || !/[A-Za-z0-9_]/.test(whereStr[i - 1])) && (i + 7 === whereStr.length || !/[A-Za-z0-9_]/.test(whereStr[i + 7]))) {
        betweenCount++;
      }

      const sub4 = whereStr.substring(i, i + 4).toUpperCase();
      if (sub4 === " OR " || sub4 === "OR\t" || sub4 === "\tOR ") {
        orIdx = i;
        break;
      }

      const sub5 = whereStr.substring(i, i + 5).toUpperCase();
      if (sub5 === " AND " || sub5 === "AND\t" || sub5 === "\tAND ") {
        if (betweenCount > 0) {
          betweenCount--;
        } else {
          if (andIdx === -1) {
            andIdx = i;
          }
        }
      }
    }
  }

  if (orIdx !== -1) {
    const leftStr = whereStr.substring(0, orIdx).trim();
    const rightStr = whereStr.substring(orIdx + 4).trim();
    const block = workspace.newBlock("sql_where_or");
    block.initSvg();
    block.render();
    const leftBlock = buildWhereBlockRecursively(leftStr, workspace);
    const rightBlock = buildWhereBlockRecursively(rightStr, workspace);
    if (leftBlock) {
      block.getInput("LEFT")?.connection?.connect(leftBlock.outputConnection);
    }
    if (rightBlock) {
      block.getInput("RIGHT")?.connection?.connect(rightBlock.outputConnection);
    }
    return block;
  }

  if (andIdx !== -1) {
    const leftStr = whereStr.substring(0, andIdx).trim();
    const rightStr = whereStr.substring(andIdx + 5).trim();
    const block = workspace.newBlock("sql_where_and");
    block.initSvg();
    block.render();
    const leftBlock = buildWhereBlockRecursively(leftStr, workspace);
    const rightBlock = buildWhereBlockRecursively(rightStr, workspace);
    if (leftBlock) {
      block.getInput("LEFT")?.connection?.connect(leftBlock.outputConnection);
    }
    if (rightBlock) {
      block.getInput("RIGHT")?.connection?.connect(rightBlock.outputConnection);
    }
    return block;
  }

  // Operators comparison builder
  const operators = [
    { op: ">=" },
    { op: "<=" },
    { op: "<>" },
    { op: "=" },
    { op: ">" },
    { op: "<" },
    { op: "LIKE" },
    { op: "IN" },
    { op: "BETWEEN" }
  ];

  let foundOp = null;
  parenDepth = 0;
  inSingleQuote = false;
  inDoubleQuote = false;
  inBacktick = false;

  for (let i = 0; i < whereStr.length; i++) {
    const char = whereStr[i];

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

    if (inSingleQuote || inDoubleQuote || inBacktick) {
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
      for (const opItem of operators) {
        const op = opItem.op;
        if (op === "LIKE" || op === "IN" || op === "BETWEEN") {
          if (i > 0 && /\w/.test(whereStr[i - 1])) continue;
          const len = op.length;
          const sub = whereStr.substring(i, i + len).toUpperCase();
          if (sub === op) {
            const after = whereStr[i + len];
            if (!after || !/\w/.test(after)) {
              foundOp = { op, index: i, length: len };
              break;
            }
          }
        } else {
          if (whereStr.substring(i, i + op.length) === op) {
            foundOp = { op, index: i, length: op.length };
            break;
          }
        }
      }
      if (foundOp) break;
    }
  }

  if (foundOp) {
    const field = whereStr.substring(0, foundOp.index).trim();
    const value = whereStr.substring(foundOp.index + foundOp.length).trim();

    const block = workspace.newBlock("sql_where_compare");
    block.initSvg();
    block.render();
    block.setFieldValue(field, "FIELD");
    block.setFieldValue(foundOp.op, "OPERATOR");
    block.setFieldValue(value, "VALUE");
    return block;
  }

  // Fallback
  const block = workspace.newBlock("sql_where_compare");
  block.initSvg();
  block.render();
  block.setFieldValue(whereStr, "FIELD");
  block.setFieldValue("=", "OPERATOR");
  block.setFieldValue("", "VALUE");
  return block;
}

export default function SqlBlockly({ onSqlChange, editorTriggerRef }: SqlBlocklyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<any>(null);

  // Hook workspace to build blocks safely from SQL string
  const rebuildWorkspaceFromSql = (sql: string) => {
    if (!workspaceRef.current) return;
    const ws = workspaceRef.current;

    ws.removeChangeListener(onWorkspaceChange);

    try {
      ws.clear();
      const data = parseSqlStringToData(sql);

      // Create main query block
      const queryBlock = ws.newBlock("sql_query");
      queryBlock.initSvg();
      queryBlock.render();
      queryBlock.moveBy(40, 40);

      // 1. Populate SELECT fields in connection statement FIELDS
      if (data.selectFields && data.selectFields.length > 0) {
        let parentInputConnection = queryBlock.getInput("FIELDS")?.connection;
        for (const fieldName of data.selectFields) {
          const cleanField = fieldName.trim();
          if (!cleanField || cleanField === "*") continue;

          // Check if it's an aggregate function expression like COUNT(*) or SUM(amount) AS total
          const funcMatch = /^([A-Za-z0-9_]+)\s*\(([^)]*)\)(?:\s+(?:AS\s+)?([A-Za-z0-9_]+))?$/i.exec(cleanField);
          if (funcMatch) {
            const funcName = funcMatch[1].toUpperCase();
            const param = funcMatch[2].trim();
            const alias = funcMatch[3] ? funcMatch[3].trim() : "";

            // Dynamic check: if funcName is not in option list, add it dynamically (Requirement 2)
            if (!DYNAMIC_FUNCTIONS.some(opt => opt[1] === funcName)) {
              DYNAMIC_FUNCTIONS.push([funcName, funcName]);
            }

            const selectItemBlock = ws.newBlock("sql_function_item");
            selectItemBlock.initSvg();
            selectItemBlock.render();

            // Settle instance dropdown options directly to ensure correct visual rendering
            const dropdown = selectItemBlock.getField("FUNC_NAME") as any;
            if (dropdown && Array.isArray(dropdown.menuGenerator_)) {
              if (!dropdown.menuGenerator_.some((opt: any) => opt[1] === funcName)) {
                dropdown.menuGenerator_.push([funcName, funcName]);
              }
            }

            selectItemBlock.setFieldValue(funcName, "FUNC_NAME");
            selectItemBlock.setFieldValue(param, "PARAM");
            selectItemBlock.setFieldValue(alias, "ALIAS");

            if (parentInputConnection && selectItemBlock.outputConnection) {
              parentInputConnection.connect(selectItemBlock.outputConnection);
              parentInputConnection = selectItemBlock.getInput("NEXT")?.connection;
            }
          } else {
            const selectItemBlock = ws.newBlock("sql_select_item");
            selectItemBlock.initSvg();
            selectItemBlock.render();
            selectItemBlock.setFieldValue(cleanField, "FIELD_NAME");

            if (parentInputConnection && selectItemBlock.outputConnection) {
              parentInputConnection.connect(selectItemBlock.outputConnection);
              parentInputConnection = selectItemBlock.getInput("NEXT")?.connection;
            }
          }
        }
      }

      // 2. Populate TABLES and JOINs in TABLES connection statement
      let tablesConnection = queryBlock.getInput("TABLES")?.connection;

      if (data.mainTable) {
        const tableItemBlock = ws.newBlock("sql_table_item");
        tableItemBlock.initSvg();
        tableItemBlock.render();
        tableItemBlock.setFieldValue(data.mainTable, "TABLE_NAME");

        if (tablesConnection && tableItemBlock.outputConnection) {
          tablesConnection.connect(tableItemBlock.outputConnection);
          tablesConnection = tableItemBlock.getInput("NEXT")?.connection;
        }
      }

      if (data.joins && data.joins.length > 0) {
        for (const join of data.joins) {
          const joinBlock = ws.newBlock("sql_join_item");
          joinBlock.initSvg();
          joinBlock.render();
          joinBlock.setFieldValue(join.joinType, "JOIN_TYPE");
          joinBlock.setFieldValue(join.table, "TABLE_NAME");

          if (tablesConnection && joinBlock.outputConnection) {
            tablesConnection.connect(joinBlock.outputConnection);
            tablesConnection = joinBlock.getInput("NEXT")?.connection;
          }

          if (join.onCondition) {
            const onCondBlock = buildWhereBlockRecursively(join.onCondition, ws);
            if (onCondBlock) {
              const onInput = joinBlock.getInput("ON");
              if (onInput && onInput.connection && onCondBlock.outputConnection) {
                onInput.connection.connect(onCondBlock.outputConnection);
              }
            }
          }
        }
      }

      // 3. Connect WHERE block recursively
      if (data.whereCondition) {
        const whereBlock = buildWhereBlockRecursively(data.whereCondition, ws);
        if (whereBlock) {
          const input = queryBlock.getInput("WHERE");
          if (input && input.connection && whereBlock.outputConnection) {
            input.connection.connect(whereBlock.outputConnection);
          }
        }
      }

      // 4. GROUP BY fields statement
      if (data.groupByFields && data.groupByFields.length > 0) {
        let parentInputConnection = queryBlock.getInput("GROUP_BY")?.connection;
        for (const gbField of data.groupByFields) {
          const cleanGbField = gbField.trim();
          if (!cleanGbField) continue;
          const gbItemBlock = ws.newBlock("sql_group_by_item");
          gbItemBlock.initSvg();
          gbItemBlock.render();
          gbItemBlock.setFieldValue(cleanGbField, "FIELD_NAME");

          if (parentInputConnection && gbItemBlock.outputConnection) {
            parentInputConnection.connect(gbItemBlock.outputConnection);
            parentInputConnection = gbItemBlock.getInput("NEXT")?.connection;
          }
        }
      }

      // 5. ORDER BY fields statement
      if (data.orderByFields && data.orderByFields.length > 0) {
        let parentInputConnection = queryBlock.getInput("ORDER_BY")?.connection;
        for (const orderItem of data.orderByFields) {
          const orderBlock = ws.newBlock("sql_order_by_item");
          orderBlock.initSvg();
          orderBlock.render();
          orderBlock.setFieldValue(orderItem.column, "COLUMN");
          orderBlock.setFieldValue(orderItem.direction, "DIRECTION");

          if (parentInputConnection && orderBlock.outputConnection) {
            parentInputConnection.connect(orderBlock.outputConnection);
            parentInputConnection = orderBlock.getInput("NEXT")?.connection;
          }
        }
      }

      // 6. Set LIMIT
      if (data.limit) {
        queryBlock.setFieldValue(data.limit, "LIMIT");
      }

      ws.scrollCenter();
    } catch (err) {
      console.error("Erro ao remontar blocos a partir do SQL:", err);
    } finally {
      ws.addChangeListener(onWorkspaceChange);
    }
  };

  useEffect(() => {
    editorTriggerRef.current = rebuildWorkspaceFromSql;
    return () => {
      editorTriggerRef.current = null;
    };
  }, [editorTriggerRef]);

  const onWorkspaceChange = (event?: any) => {
    if (!workspaceRef.current) return;

    if (event) {
      if (event.isUiEvent) return;

      // Verify if it is a block move event, and ignore coordinate drags that do not couple/decouple
      if (event.type === "move" || event.type === "BLOCK_MOVE") {
        const oldParent = event.oldParentId;
        const newParent = event.newParentId;
        const oldInput = event.oldInputName;
        const newInput = event.newInputName;

        if (oldParent === newParent && oldInput === newInput) {
          return;
        }
      }
    }

    const sql = workspaceToSql(workspaceRef.current);
    onSqlChange(sql);
  };

  const getOrCreateQueryBlock = (ws: any) => {
    const allBlocks = ws.getTopBlocks(true);
    let queryBlock = allBlocks.find((b: any) => b.type === "sql_query");
    if (!queryBlock) {
      queryBlock = ws.newBlock("sql_query");
      queryBlock.initSvg();
      queryBlock.render();
      queryBlock.moveBy(40, 40);
      ws.scrollCenter();
    }
    return queryBlock;
  };

  const spawnBlock = (type: string) => {
    if (!workspaceRef.current) return;
    const ws = workspaceRef.current;
    try {
      getOrCreateQueryBlock(ws);

      const block = ws.newBlock(type);
      block.initSvg();
      block.render();

      const scrollX = ws.scrollX || 0;
      const scrollY = ws.scrollY || 0;
      const scale = ws.scale || 1;
      
      const x = -scrollX / scale + 150;
      const y = -scrollY / scale + 100 + (Math.random() * 40 - 20);

      block.moveBy(x, y);
      ws.select(block);
      
      onWorkspaceChange();
    } catch (err) {
      console.error("Erro ao criar bloco:", err);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const workspace = Blockly.inject(containerRef.current, {
      toolbox: undefined,
      grid: {
        spacing: 20,
        length: 3,
        colour: "#e2e8f0",
        snap: true,
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2,
      },
      trashcan: true,
      scrollbars: {
        horizontal: true,
        vertical: false,
      },
    });

    workspaceRef.current = workspace;

    onWorkspaceChange();

    workspace.addChangeListener(onWorkspaceChange);

    const resizeObserver = new ResizeObserver(() => {
      Blockly.svgResize(workspace);
    });
    if (containerRef.current.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }

    return () => {
      workspace.removeChangeListener(onWorkspaceChange);
      workspace.dispose();
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div id="blockly-editor-container" className="relative w-full h-[580px] border border-slate-200 rounded-xl overflow-hidden shadow-md bg-white flex flex-col font-sans">
      {/* Visual styling overrides for hiding the toolbox completely and setting up workspace */}
      <style>{`
        /* Hide traditional toolbox since we use footer actions */
        #blockly-editor-container .blocklyToolboxDiv,
        #blockly-editor-container .blocklyToolboxContainer,
        #blockly-editor-container .blocklyTreeRoot,
        #blockly-editor-container .blocklyTreeRootContainer,
        .blocklyToolboxDiv,
        .blocklyToolboxContainer,
        .blocklyTreeRoot {
          display: none !important;
          width: 0px !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }

        /* Smaller text font and tracking tailored for high contrast */
        .blocklyTreeLabel {
          font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          text-color: #000000 !important;
          font-color: #000000 !important;
          color: #000000 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          padding-left: 0px !important;
          text-shadow: 0 1px 2px rgba(0,0,0,0.4) !important;
        }

        /* Compact folder category row item spacing */
        .blocklyTreeRow {
          height: 30px !important;
          margin: 4px 6px !important;
          padding: 2px 4px !important;
          border-radius: 6px !important;
          border: 1px solid transparent !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          cursor: pointer !important;
          transition: all 0.15s ease-in-out !important;
        }

        .blocklyTreeRow:hover {
          opacity: 0.9 !important;
          filter: brightness(0.95) !important;
          border-color: rgba(0, 0, 0, 0.15) !important;
        }

        .blocklyTreeSelected {
          border-color: #0f172a !important;
          box-shadow: 0 0 12px rgba(0,0,0,0.15), inset 0 0 0 1px #0f172a !important;
        }

        .blocklyTreeSelected .blocklyTreeLabel {
          color: #000000 !important;
          font-weight: 850 !important;
        }

        /* Totally hide default folder expand/collapse icons */
        .blocklyTreeIcon {
          display: none !important;
        }

        /* Fresh light themed sliding drawer (Flyout Background) */
        .blocklyFlyoutBackground {
          fill: #f1f5f9 !important;
          fill-opacity: 0.35 !important;
        }

        /* Clean workspace background for light theme with high contrast grid compatibility */
        .blocklySvg {
          background-color: #f8fafc !important;
        }

        /* Hide vertical scroll handles in SVG */
        .blocklyScrollbarVertical,
        .blocklyScrollbarVertical .blocklyScrollbarHandle,
        .blocklyScrollbarVertical .blocklyScrollbarBackground {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
          visibility: hidden !important;
        }
      `}</style>

      {/* Workspace Area */}
      <div className="flex-1 w-full relative">
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2 bg-white/95 text-slate-805 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-mono shadow-md select-none border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Blockly Ativo
        </div>
        <div ref={containerRef} className="w-full h-full" style={{ textAlign: "left" }} />
      </div>

      {/* Visual Footer Block Builder Toolbar with organized grouped buttons */}
      <div className="bg-slate-50 border-t border-slate-200 p-3 select-none">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
          Gerador de Blocos (Clique para adicionar ao canvas)
        </div>
        <div className="flex flex-col xl:flex-row gap-2.5 items-stretch">
          {/* Campos Group (SELECT) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-cyan-50/50 border border-cyan-100 rounded-lg flex-1">
            <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider px-1 shrink-0">SELECT</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                id="btn-add-field"
                onClick={() => spawnBlock("sql_select_item")}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1 bg-white hover:bg-cyan-100 text-cyan-800 border border-cyan-200 rounded-md text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-sm shrink-0"
              >
                <Columns size={12} className="text-cyan-500" />
                <span>+ Campo</span>
              </button>
              <button
                id="btn-add-function"
                onClick={() => spawnBlock("sql_function_item")}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1 bg-white hover:bg-cyan-100 text-cyan-800 border border-cyan-200 rounded-md text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-sm shrink-0"
              >
                <span>+ Função</span>
              </button>
            </div>
          </div>

          {/* Tables Group (FROM / JOIN) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-pink-50/55 border border-pink-100 rounded-lg flex-1">
            <span className="text-[10px] font-bold text-pink-700 uppercase tracking-wider px-1 shrink-0">FROM</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                id="btn-add-table"
                onClick={() => spawnBlock("sql_table_item")}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1 bg-white hover:bg-pink-100 text-pink-800 border border-pink-200 rounded-md text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-sm shrink-0"
              >
                <Database size={12} className="text-pink-500" />
                <span>+ Tabela</span>
              </button>
              <button
                id="btn-add-join"
                onClick={() => spawnBlock("sql_join_item")}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1 bg-white hover:bg-pink-100 text-pink-800 border border-pink-200 rounded-md text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-sm shrink-0"
              >
                <GitMerge size={12} className="text-pink-500" />
                <span>+ JOIN</span>
              </button>
            </div>
          </div>

          {/* Filters Group (WHERE) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-emerald-50/50 border border-emerald-100 rounded-lg flex-1">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider px-1 shrink-0">WHERE</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                id="btn-add-where"
                onClick={() => spawnBlock("sql_where_compare")}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-sm shrink-0"
              >
                <Filter size={12} className="text-emerald-500" />
                <span>+ Filtro</span>
              </button>
              <button
                id="btn-add-and"
                onClick={() => spawnBlock("sql_where_and")}
                className="flex items-center justify-center gap-1 px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-sm shrink-0"
              >
                <span>+ E (AND)</span>
              </button>
              <button
                id="btn-add-or"
                onClick={() => spawnBlock("sql_where_or")}
                className="flex items-center justify-center gap-1 px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-sm shrink-0"
              >
                <span>+ OU (OR)</span>
              </button>
            </div>
          </div>

          {/* Analytical (GROUP BY / ORDER BY) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 bg-amber-50/55 border border-amber-100 rounded-lg flex-1">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider px-1 shrink-0">ANÁLISE</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                id="btn-add-groupby"
                onClick={() => spawnBlock("sql_group_by_item")}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-sm shrink-0"
              >
                <Layers size={12} className="text-amber-500" />
                <span>+ GROUP BY</span>
              </button>
              <button
                id="btn-add-orderby"
                onClick={() => spawnBlock("sql_order_by_item")}
                className="flex items-center justify-center gap-1.5 px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-850 border border-purple-200 rounded-md text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-sm shrink-0"
              >
                <ArrowDownAZ size={12} className="text-purple-500" />
                <span>+ ORDER BY</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
