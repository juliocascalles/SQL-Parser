import React, { useEffect, useRef } from "react";
import * as Blockly from "blockly";
import { parseSqlStringToData } from "../parser.ts";

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
    "message0": "campo %1 %2",
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
    "message0": "função %1(%2) como %3 %4",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "FUNC_NAME",
        "options": [
          ["COUNT", "COUNT"],
          ["SUM", "SUM"],
          ["AVG", "AVG"],
          ["MIN", "MIN"],
          ["MAX", "MAX"],
          ["UPPER", "UPPER"],
          ["LOWER", "LOWER"]
        ]
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
    "message0": "tabela %1 %2",
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
    "message0": "%1 tabela %2 ON %3 %4",
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
    "message0": "grupo %1 %2",
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
    "message0": "coluna %1 %2 %3",
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
          ["IN", "IN"]
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
      const sub4 = whereStr.substring(i, i + 4).toUpperCase();
      if (sub4 === " OR " || sub4 === "OR\t" || sub4 === "\tOR ") {
        orIdx = i;
        break;
      }

      const sub5 = whereStr.substring(i, i + 5).toUpperCase();
      if (sub5 === " AND " || sub5 === "AND\t" || sub5 === "\tAND ") {
        if (andIdx === -1) {
          andIdx = i;
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
    { op: "IN" }
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
        if (op === "LIKE" || op === "IN") {
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
          if (!cleanField) continue;

          // Check if it's an aggregate function expression like COUNT(*) or SUM(amount) AS total
          const funcMatch = /^([A-Za-z0-9_]+)\s*\(([^)]*)\)(?:\s+(?:AS\s+)?([A-Za-z0-9_]+))?$/i.exec(cleanField);
          if (funcMatch) {
            const funcName = funcMatch[1].toUpperCase();
            const param = funcMatch[2].trim();
            const alias = funcMatch[3] ? funcMatch[3].trim() : "";

            const selectItemBlock = ws.newBlock("sql_function_item");
            selectItemBlock.initSvg();
            selectItemBlock.render();
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

  useEffect(() => {
    if (!containerRef.current) return;

    const workspace = Blockly.inject(containerRef.current, {
      toolbox: TOOLBOX_XML,
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

    const applyCategoryRowColors = () => {
      const rows = document.querySelectorAll("#blockly-editor-container .blocklyTreeRow");
      rows.forEach((row: any) => {
        const labelEl = row.querySelector(".blocklyTreeLabel");
        const categoryName = labelEl ? labelEl.textContent?.trim() : "";
        let color = "";

        if (categoryName === "Query") {
          color = "#4f46e5";
        } else if (categoryName === "Campos") {
          color = "#06b6d4";
        } else if (categoryName === "Tabelas") {
          color = "#ec4899";
        } else if (categoryName === "Filtros") {
          color = "#10b981";
        } else if (categoryName === "Grupo") {
          color = "#f59e0b";
        } else if (categoryName === "Ordem") {
          color = "#8b5cf6";
        }

        if (color) {
          row.style.setProperty("--category-color", color);
          row.style.setProperty("background-color", color, "important");
          row.style.setProperty("border-left-width", "0px", "important");
        }
      });
    };

    applyCategoryRowColors();
    const t1 = setTimeout(applyCategoryRowColors, 50);
    const t2 = setTimeout(applyCategoryRowColors, 200);
    const t3 = setTimeout(applyCategoryRowColors, 1000);

    const toolboxDiv = document.querySelector("#blockly-editor-container .blocklyToolboxDiv");
    let observer: MutationObserver | null = null;
    if (toolboxDiv) {
      observer = new MutationObserver(() => {
        applyCategoryRowColors();
      });
      observer.observe(toolboxDiv, {
        attributes: true,
        subtree: true,
        childList: true,
        attributeFilter: ["class", "style"]
      });
    }

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
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  return (
    <div id="blockly-editor-container" className="relative w-full h-[550px] border border-slate-200 rounded-xl overflow-hidden shadow-lg bg-white">
      {/* Visual styling overrides for custom elegant, narrow toolbox */}
      <style>{`
        /* Narrow compact toolbox container & categorizer div */
        #blockly-editor-container .blocklyToolboxDiv,
        #blockly-editor-container .blocklyToolboxContainer,
        #blockly-editor-container .blocklyTreeRoot,
        #blockly-editor-container .blocklyTreeRootContainer,
        .blocklyToolboxDiv,
        .blocklyToolboxContainer,
        .blocklyTreeRoot {
          width: 95px !important;
          background-color: #050508 !important;
          background: #050508 !important;
          border-right: 1px solid #cbd5e1 !important;
          box-shadow: inset -1px 0 2px rgba(0,0,0,0.05) !important;
          padding-top: 10px !important;
          
          /* Prevent vertical or horizontal scroll of categories */
          overflow-y: hidden !important;
          overflow-x: hidden !important;
          scrollbar-width: none !important; /* Firefox */
        }
        
        #blockly-editor-container .blocklyToolboxDiv::-webkit-scrollbar,
        #blockly-editor-container .blocklyToolboxContainer::-webkit-scrollbar,
        .blocklyToolboxDiv::-webkit-scrollbar,
        .blocklyToolboxContainer::-webkit-scrollbar {
          display: none !important; /* Chrome, Edge, Safari */
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

        /* Clean workspace background for light theme */
        .blocklySvg {
          background-color: #000000 !important;
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

      <div className="absolute top-2 right-2 z-10 flex items-center gap-2 bg-white/95 text-slate-800 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-mono shadow-md select-none border border-slate-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        Blockly Ativo
      </div>
      <div ref={containerRef} className="w-full h-full" style={{ textAlign: "left" }} />
    </div>
  );
}
