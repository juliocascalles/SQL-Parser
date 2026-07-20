// Database datasets and in-memory SQL execution engine for interactive exercises.
import { parseSqlStringToData } from "./parser";
import { customDatabase } from "./insert";

import aline_nobre from "../assets/images/aline_nobre.svg";
import ana_clara from "../assets/images/ana_clara.svg";
import carlos_oliver from "../assets/images/carlos_oliver.svg";
import djavan_costa from "../assets/images/djavan_costa.svg";
import elena_rostova from "../assets/images/elena_rostova.svg";
import gustavo_lins from "../assets/images/gustavo_lins.svg";
import igor_cruz from "../assets/images/igor_cruz.svg";
import jean_pierre from "../assets/images/jean_pierre.svg";
import juliana_mendes from "../assets/images/juliana_mendes.svg";
import kenji_tanaka from "../assets/images/kenji_tanaka.svg";
import leticia_silva from "../assets/images/leticia_silva.svg";
import marcos_paz from "../assets/images/marcos_paz.svg";
import mei_lin from "../assets/images/mei_lin.svg";
import patricia_lima from "../assets/images/patricia_lima.svg";
import pedro_rocha from "../assets/images/pedro_rocha.svg";
import roberta_santos from "../assets/images/roberta_santos.svg";
import rodrigo_faro from "../assets/images/rodrigo_faro.svg";
import sabrina_sato from "../assets/images/sabrina_sato.svg";
import thiago_ramos from "../assets/images/thiago_ramos.svg";
import valeria_garcia from "../assets/images/valeria_garcia.svg";

export const customers = [
  { id: 1, name: "Alice Smith", email: "alice@example.com", age: 24, country: "USA" },
  { id: 2, name: "Bob Johnson", email: "bob@example.com", age: 19, country: "Canada" },
  { id: 3, name: "Charlie Brown", email: "charlie@example.com", age: 32, country: "UK" },
  { id: 4, name: "Diana Prince", email: "diana@example.com", age: 28, country: "USA" },
  { id: 5, name: "Evan Wright", email: "evan@example.com", age: 21, country: "UK" },
  { id: 6, name: "Fiona Gallagher", email: "fiona@example.com", age: 20, country: "Canada" },
  { id: 7, name: "George Costanza", email: "george@example.com", age: 41, country: "USA" },
  { id: 8, name: "Hannah Abbott", email: "hannah@example.com", age: 22, country: "Australia" },
  { id: 9, name: "Ian Malcolm", email: "ian@example.com", age: 45, country: "USA" },
  { id: 10, name: "Julia Roberts", email: "julia@example.com", age: 34, country: "UK" },
  { id: 11, name: "Kevin Bacon", email: "kevin@example.com", age: 50, country: "USA" },
  { id: 12, name: "Laura Croft", email: "laura@example.com", age: 29, country: "UK" },
  { id: 13, name: "Michael Scott", email: "michael@example.com", age: 43, country: "USA" },
  { id: 14, name: "Nina Simone", email: "nina@example.com", age: 37, country: "France" },
  { id: 15, name: "Oscar Martinez", email: "oscar@example.com", age: 35, country: "Mexico" },
  { id: 16, name: "Pam Beesly", email: "pam@example.com", age: 26, country: "USA" },
  { id: 17, name: "Quentin Tarantino", email: "quentin@example.com", age: 52, country: "USA" },
  { id: 18, name: "Rachel Green", email: "rachel@example.com", age: 25, country: "USA" },
  { id: 19, name: "Steve Rogers", email: "steve@example.com", age: 95, country: "USA" },
  { id: 20, name: "Tony Stark", email: "tony@example.com", age: 48, country: "USA" }
];

export const sales = [
  { id: 1, product_id: 3, quantity: 150, customer_id: 11 },
  { id: 2, product_id: 4, quantity: 80, customer_id: 11 },
  { id: 3, product_id: 6, quantity: 120, customer_id: 11 },
  { id: 4, product_id: 3, quantity: 90, customer_id: 2 },
  { id: 5, product_id: 4, quantity: 200, customer_id: 2 },
  { id: 6, product_id: 8, quantity: 300, customer_id: 11 },
  { id: 7, product_id: 5, quantity: 45, customer_id: 2 },
  { id: 8, product_id: 8, quantity: 50, customer_id: 2 },
  { id: 9, product_id: 3, quantity: 110, customer_id: 11 },
  { id: 10, product_id: 10, quantity: 15, customer_id: 11 },
  { id: 11, product_id: 4, quantity: 130, customer_id: 11 },
  { id: 12, product_id: 9, quantity: 110, customer_id: 2 }
];

export const products = [
  { id: 1, item: "iPhone 15 Pro", price: 5999, category: "technology", stock: 15 },
  { id: 2, item: "Asus Zenbook", price: 4500, category: "technology", stock: 8 },
  { id: 3, item: "Logitech Keyboard", price: 350, category: "technology", stock: 50 },
  { id: 4, item: "Razer Mouse", price: 250, category: "technology", stock: 75 },
  { id: 5, item: "Samsung TV 55", price: 2900, category: "appliances", stock: 12 },
  { id: 6, item: "Eletrolux Geladeira", price: 3400, category: "appliances", stock: 10 },
  { id: 7, item: "Dell Latitude Notebook", price: 1200, category: "technology", stock: 20 },
  { id: 8, item: "Sony WH-1005 Headset", price: 1350, category: "technology", stock: 35 },
  { id: 9, item: "HyperX SoloCast Mic", price: 450, category: "technology", stock: 40 },
  { id: 10, item: "Cafeteira Nespresso", price: 600, category: "appliances", stock: 30 }
];

export interface Suspect {
  id: number;
  nome: string;
  sexo: "masculino" | "feminino";
  cor_cabelo: "preto" | "castanho" | "loiro" | "ruivo";
  tamanho_cabelo: "longo" | "curto";
  expressao: "desconfiado" | "piscando" | "surpresa" | "sorridente";
  bigode: "sim" | "não";
  barba: "sim" | "não";
  pele: "branca" | "negra" | "parda" | "amarela";
  imagem: string;
}

export const suspeitos: Suspect[] = [
  { id: 1, nome: "Carlos Oliver", sexo: "masculino", cor_cabelo: "preto", tamanho_cabelo: "curto", expressao: "surpresa", bigode: "sim", barba: "não", pele: "parda", imagem: carlos_oliver },
  { id: 2, nome: "Ana Clara", sexo: "feminino", cor_cabelo: "ruivo", tamanho_cabelo: "longo", expressao: "desconfiado", bigode: "não", barba: "não", pele: "branca", imagem: ana_clara },
  { id: 3, nome: "Jean Pierre", sexo: "masculino", cor_cabelo: "loiro", tamanho_cabelo: "curto", expressao: "piscando", bigode: "não", barba: "sim", pele: "branca", imagem: jean_pierre },
  { id: 4, nome: "Roberta Santos", sexo: "feminino", cor_cabelo: "preto", tamanho_cabelo: "curto", expressao: "sorridente", bigode: "não", barba: "não", pele: "negra", imagem: roberta_santos },
  { id: 5, nome: "Kenji Tanaka", sexo: "masculino", cor_cabelo: "preto", tamanho_cabelo: "curto", expressao: "sorridente", bigode: "não", barba: "não", pele: "amarela", imagem: kenji_tanaka },
  { id: 6, nome: "Leticia Silva", sexo: "feminino", cor_cabelo: "loiro", tamanho_cabelo: "longo", expressao: "surpresa", bigode: "não", barba: "não", pele: "parda", imagem: leticia_silva },
  { id: 7, nome: "Marcos Paz", sexo: "masculino", cor_cabelo: "castanho", tamanho_cabelo: "curto", expressao: "desconfiado", bigode: "sim", barba: "sim", pele: "branca", imagem: marcos_paz },
  { id: 8, nome: "Elena Rostova", sexo: "feminino", cor_cabelo: "loiro", tamanho_cabelo: "longo", expressao: "piscando", bigode: "não", barba: "não", pele: "branca", imagem: elena_rostova },
  { id: 9, nome: "Djavan Costa", sexo: "masculino", cor_cabelo: "preto", tamanho_cabelo: "curto", expressao: "sorridente", bigode: "sim", barba: "não", pele: "negra", imagem: djavan_costa },
  { id: 10, nome: "Mei Lin", sexo: "feminino", cor_cabelo: "preto", tamanho_cabelo: "longo", expressao: "surpresa", bigode: "não", barba: "não", pele: "amarela", imagem: mei_lin },
  { id: 11, nome: "Igor Cruz", sexo: "masculino", cor_cabelo: "ruivo", tamanho_cabelo: "curto", expressao: "surpresa", bigode: "não", barba: "sim", pele: "parda", imagem: igor_cruz },
  { id: 12, nome: "Patricia Lima", sexo: "feminino", cor_cabelo: "castanho", tamanho_cabelo: "longo", expressao: "desconfiado", bigode: "não", barba: "não", pele: "branca", imagem: patricia_lima },
  { id: 13, nome: "Rodrigo Faro", sexo: "masculino", cor_cabelo: "castanho", tamanho_cabelo: "curto", expressao: "piscando", bigode: "não", barba: "não", pele: "branca", imagem: rodrigo_faro },
  { id: 14, nome: "Sabrina Sato", sexo: "feminino", cor_cabelo: "preto", tamanho_cabelo: "longo", expressao: "sorridente", bigode: "não", barba: "não", pele: "amarela", imagem: sabrina_sato },
  { id: 15, nome: "Valeria Garcia", sexo: "feminino", cor_cabelo: "ruivo", tamanho_cabelo: "curto", expressao: "surpresa", bigode: "não", barba: "não", pele: "parda", imagem: valeria_garcia },
  { id: 16, nome: "Gustavo Lins", sexo: "masculino", cor_cabelo: "loiro", tamanho_cabelo: "longo", expressao: "desconfiado", bigode: "não", barba: "não", pele: "branca", imagem: gustavo_lins },
  { id: 17, nome: "Juliana Mendes", sexo: "feminino", cor_cabelo: "castanho", tamanho_cabelo: "curto", expressao: "piscando", bigode: "não", barba: "não", pele: "negra", imagem: juliana_mendes },
  { id: 18, nome: "Pedro Rocha", sexo: "masculino", cor_cabelo: "castanho", tamanho_cabelo: "longo", expressao: "sorridente", bigode: "não", barba: "sim", pele: "parda", imagem: pedro_rocha },
  { id: 19, nome: "Aline Nobre", sexo: "feminino", cor_cabelo: "preto", tamanho_cabelo: "longo", expressao: "piscando", bigode: "não", barba: "não", pele: "negra", imagem: aline_nobre },
  { id: 20, nome: "Thiago Ramos", sexo: "masculino", cor_cabelo: "ruivo", tamanho_cabelo: "curto", expressao: "sorridente", bigode: "sim", barba: "sim", pele: "amarela", imagem: thiago_ramos }
];

export interface Exercise {
  id: string;
  title: string;
  description: string;
  query: string;
  templateQuery: string;
  targetTable: string;
}

export const EXERCISES: Exercise[] = [
  {
    id: "customers",
    title: "Exercício 1: Filtragem de Clientes",
    description: "Recupere o nome (name) e o email de clientes da tabela 'customers' com idade maior ou igual a 21 (age >= 21). Ordene os resultados por nome em ordem crescente (ASC) e limite em 15 registros.",
    query: "SELECT name, email FROM customers WHERE age >= 21 ORDER BY name ASC LIMIT 15",
    templateQuery: "SELECT * FROM customers WHERE age < 18",
    targetTable: "customers"
  },
  {
    id: "sales",
    title: "Exercício 2: Agrupamento de Vendas",
    description: "Siga o fluxo de análise e agrupe a tabela 'sales' por id do produto (product_id). Filtre apenas vendas do cliente com id igual a 11 (customer_id = 11). Retorne o id do produto (product_id) e a soma das quantidades identificada como 'total'. Ordene os resultados pelo total em ordem decrescente (DESC).",
    query: "SELECT product_id, Sum(quantity) As total FROM sales WHERE customer_id = 11 GROUP BY product_id ORDER BY total DESC",
    templateQuery: "SELECT * FROM sales WHERE customer_id = 15 GROUP BY product_id ORDER BY quantity DESC",
    targetTable: "sales"
  },
  {
    id: "complex",
    title: "Exercício 3: Filtragem por Categoria (Technology)",
    description: "Realize um JOIN entre as tabelas 'sales' e 'products' para obter as vendas de todos os produtos que pertencem à categoria 'technology'. Retorne o ID da venda (id), o nome do item (item), a quantidade vendida (quantity) e o preço (price). Ordene os resultados de forma crescente pelo ID da venda.",
    query: "SELECT sales.id, products.item, sales.quantity, products.price FROM sales JOIN products ON sales.product_id = products.id WHERE products.category = 'technology' ORDER BY sales.id ASC",
    templateQuery: "SELECT sales.id, products.item FROM sales JOIN customers ON sales.product_id = products.id WHERE products.category = 'appliances' ORDER BY sales.id ASC",
    targetTable: "sales"
  },
  {
    id: "suspeito",
    title: "Exercício Especial: Encontre o Suspeito",
    description: "Um crime foi cometido! Analise as pistas fornecidas e monte uma consulta SQL na tabela 'suspeitos' para identificar o suspeito com os atributos exatos descritos.",
    query: "SELECT * FROM suspeitos WHERE id = 1",
    templateQuery: "SELECT * FROM suspeitos WHERE sexo = 'feminino' AND pele = 'branca' AND cor_cabelo = 'castanho'",
    targetTable: "suspeitos"
  }
];

export function getRandomSuspect(): Suspect {
  const index = Math.floor(Math.random() * suspeitos.length);
  return suspeitos[index];
}

// SQL helper functions mimicking database alias/extract semantics
function extractTableName(tableStr: string): string {
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

function getTableAlias(tableStr: string): string {
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

function getTableData(tableName: string): any[] | null {
  const name = tableName.toLowerCase().trim();
  if (name === "customers" || name === "clientes") return customers;
  if (name === "sales" || name === "vendas") return sales;
  if (name === "products" || name === "produtos" || name === "product") return products;
  if (name === "suspeitos") return suspeitos;
  if (customDatabase && customDatabase[name]) {
    return customDatabase[name];
  }
  return null;
}

function normalizeFilterValue(val: string): string {
  let clean = val.trim().toLowerCase();
  
  if (clean.startsWith("masculin")) return "masculino";
  if (clean.startsWith("feminin")) return "feminino";
  
  if (clean === "negra" || clean === "negro") return "negra";
  if (clean === "branca" || clean === "branco") return "branca";
  if (clean === "parda" || clean === "pardo") return "parda";
  if (clean === "amarela" || clean === "amarelo") return "amarela";
  
  if (clean === "nao" || clean === "não" || clean === "nâo") return "não";
  if (clean === "sim") return "sim";
  
  if (clean === "desconfiado" || clean === "desconfiada") return "desconfiado";
  if (clean === "piscando") return "piscando";
  if (clean === "surpresa" || clean === "surpreso" || clean === "surpreendido") return "surpresa";
  if (clean === "sorridente") return "sorridente";
  
  if (clean === "preto" || clean === "preta") return "preto";
  if (clean === "castanho" || clean === "castanha") return "castanho";
  if (clean === "loiro" || clean === "loira") return "loiro";
  if (clean === "ruivo" || clean === "ruiva") return "ruivo";
  if (clean === "longo" || clean === "longa") return "longo";
  if (clean === "curto" || clean === "curta") return "curto";

  return clean;
}

function evaluateCondition(conditionStr: string, context: Record<string, any>): boolean {
  try {
    const keys = Object.keys(context);
    const values = Object.values(context);
    
    // Check if we are checking fields of suspects table
    const isSuspectTable = ("sexo" in context) || ("pele" in context) || ("bigode" in context);
    if (isSuspectTable) {
      conditionStr = conditionStr.replace(/'([^']*)'/g, (match, p1) => {
        return `'${normalizeFilterValue(p1)}'`;
      });
      conditionStr = conditionStr.replace(/"([^"]*)"/g, (match, p1) => {
        return `"${normalizeFilterValue(p1)}"`;
      });
    }

    let jsCond = conditionStr
      .replace(/\bAND\b/gi, " && ")
      .replace(/\bOR\b/gi, " || ")
      .replace(/(?<![<>!=])=(?![=])/g, " === ")
      .replace(/<>/g, " !== ");

    const f = new Function(...keys, `return (${jsCond});`);
    return !!f(...values);
  } catch (e) {
    console.warn("Error evaluating condition:", conditionStr, e);
    return false;
  }
}

function getValueFromRow(expr: string, row: any): any {
  const cleanExpr = expr.trim();
  
  if (cleanExpr.toLowerCase() === "count(*)") {
    return row["count_all"] !== undefined ? row["count_all"] : (row["COUNT(*)"] !== undefined ? row["COUNT(*)"] : null);
  }
  
  if (row[cleanExpr] !== undefined) {
    return row[cleanExpr];
  }
  const flatMatchedKey = Object.keys(row).find(k => k.toLowerCase() === cleanExpr.toLowerCase());
  if (flatMatchedKey !== undefined && flatMatchedKey !== "_tables") {
    return row[flatMatchedKey];
  }

  if (cleanExpr.includes(".")) {
    const parts = cleanExpr.split(".");
    const tblOrAlias = parts[0].toLowerCase().trim();
    const colName = parts[1].toLowerCase().trim();
    if (row._tables && row._tables[tblOrAlias]) {
      const tblRow = row._tables[tblOrAlias];
      const matchedKey = Object.keys(tblRow).find(k => k.toLowerCase() === colName);
      if (matchedKey !== undefined) {
        return tblRow[matchedKey];
      }
    }
  }

  if (row._tables) {
    for (const tbl of Object.keys(row._tables)) {
      const tblRow = row._tables[tbl];
      const matchedKey = Object.keys(tblRow).find(k => k.toLowerCase() === cleanExpr.toLowerCase());
      if (matchedKey !== undefined) {
        return tblRow[matchedKey];
      }
    }
  }

  return undefined;
}

export function executeSqlQuery(sql: string): { success: boolean; data?: any[]; error?: string } {
  try {
    if (!sql || !sql.trim()) {
      return { success: false, error: "Nenhuma query fornecida." };
    }

    const parsed = parseSqlStringToData(sql);
    const mainTableName = extractTableName(parsed.mainTable);
    const mainTableAlias = getTableAlias(parsed.mainTable) || mainTableName;

    let sourceData = getTableData(mainTableName);
    if (!sourceData) {
      return { success: false, error: `Tabela '${mainTableName}' não encontrada no banco de dados em memória. As tabelas disponíveis são: customers, sales, products, suspeitos.` };
    }

    // Initialize joined rows with mapping metadata
    let joinedRows = sourceData.map(row => ({
      _tables: {
        [mainTableName.toLowerCase()]: row,
        [mainTableAlias.toLowerCase()]: row
      },
      ...row
    }));

    if (parsed.joins && parsed.joins.length > 0) {
      for (const join of parsed.joins) {
        const joinTableName = extractTableName(join.table);
        const joinTableAlias = getTableAlias(join.table) || joinTableName;
        const rightData = getTableData(joinTableName);
        if (!rightData) {
          return { success: false, error: `Tabela '${joinTableName}' para JOIN não foi encontrada.` };
        }

        const isLeftJoin = join.joinType.toUpperCase().includes("LEFT");
        const nextJoinedRows: any[] = [];

        for (const leftCombined of joinedRows) {
          let matchedAny = false;

          for (const rightRow of rightData) {
            const context: Record<string, any> = {
              ...leftCombined._tables,
              [joinTableName.toLowerCase()]: rightRow,
              [joinTableAlias.toLowerCase()]: rightRow,
              ...leftCombined,
              ...rightRow
            };
            delete context["_tables"];

            if (evaluateCondition(join.onCondition, context)) {
              matchedAny = true;
              nextJoinedRows.push({
                ...leftCombined,
                ...rightRow,
                _tables: {
                  ...leftCombined._tables,
                  [joinTableName.toLowerCase()]: rightRow,
                  [joinTableAlias.toLowerCase()]: rightRow
                }
              });
            }
          }

          if (!matchedAny && isLeftJoin) {
            const nullRightRow: Record<string, any> = {};
            if (rightData.length > 0) {
              Object.keys(rightData[0]).forEach(k => {
                nullRightRow[k] = null;
              });
            }
            nextJoinedRows.push({
              ...leftCombined,
              ...nullRightRow,
              _tables: {
                ...leftCombined._tables,
                [joinTableName.toLowerCase()]: nullRightRow,
                [joinTableAlias.toLowerCase()]: nullRightRow
              }
            });
          }
        }
        joinedRows = nextJoinedRows;
      }
    }

    // 1. Filter using WHERE
    let filtered = [...joinedRows];
    if (parsed.whereCondition && parsed.whereCondition.trim()) {
      filtered = filtered.filter(row => {
        const context = {
          ...row._tables,
          ...row
        };
        delete context["_tables"];
        return evaluateCondition(parsed.whereCondition, context);
      });
    }

    // 2. GROUP BY and aggregates
    let grouped: any[] = [];
    const hasGroupBy = parsed.groupByFields && parsed.groupByFields.length > 0;
    const selectFieldsStr = parsed.selectFields.join(", ");
    const hasAggsInSelect = /COUNT\s*\(|SUM\s*\(|AVG\s*\(|MAX\s*\(|MIN\s*\(/i.test(selectFieldsStr) || /COUNT\s*\(|SUM\s*\(|AVG\s*\(|MAX\s*\(|MIN\s*\(/i.test(parsed.havingCondition);

    if (hasGroupBy) {
      const groups: Record<string, any[]> = {};
      const gbKeys = parsed.groupByFields.map(f => f.trim());

      filtered.forEach(row => {
        const valuesKey = gbKeys.map(k => String(getValueFromRow(k, row) !== undefined ? getValueFromRow(k, row) : "")).join("||");
        if (!groups[valuesKey]) {
          groups[valuesKey] = [];
        }
        groups[valuesKey].push(row);
      });

      Object.keys(groups).forEach(gKey => {
        const groupRows = groups[gKey];
        const repRow = groupRows[0];
        const rowResult: Record<string, any> = {};

        gbKeys.forEach(k => {
          rowResult[k] = getValueFromRow(k, repRow);
        });

        const count_all = groupRows.length;
        rowResult["COUNT(*)"] = count_all;
        rowResult["count_all"] = count_all;

        const numericCols: string[] = [];
        Object.keys(repRow).forEach(k => {
          if (k !== "_tables" && typeof repRow[k] === "number") {
            numericCols.push(k);
          }
        });
        if (repRow._tables) {
          Object.keys(repRow._tables).forEach(tbl => {
            const tblRow = repRow._tables[tbl];
            Object.keys(tblRow).forEach(k => {
              if (typeof tblRow[k] === "number" && !numericCols.includes(`${tbl}.${k}`)) {
                numericCols.push(`${tbl}.${k}`);
              }
            });
          });
        }

        numericCols.forEach(col => {
          let sum = 0;
          let max = -Infinity;
          let min = Infinity;
          groupRows.forEach(r => {
            const v = Number(getValueFromRow(col, r));
            if (!isNaN(v)) {
              sum += v;
              if (v > max) max = v;
              if (v < min) min = v;
            }
          });
          const avg = groupRows.length > 0 ? sum / groupRows.length : 0;

          rowResult[`SUM(${col})`] = sum;
          rowResult[`AVG(${col})`] = avg;
          rowResult[`MAX(${col})`] = max === -Infinity ? 0 : max;
          rowResult[`MIN(${col})`] = min === Infinity ? 0 : min;
          rowResult[`COUNT(${col})`] = groupRows.filter(r => getValueFromRow(col, r) !== undefined && getValueFromRow(col, r) !== null).length;

          rowResult[`sum_${col.toLowerCase()}`] = sum;
          rowResult[`avg_${col.toLowerCase()}`] = avg;
          rowResult[`max_${col.toLowerCase()}`] = max;
          rowResult[`min_${col.toLowerCase()}`] = min;
        });

        rowResult["_tables"] = repRow._tables;
        grouped.push(rowResult);
      });
    } else if (hasAggsInSelect) {
      const rowResult: Record<string, any> = {};
      const count_all = filtered.length;
      rowResult["COUNT(*)"] = count_all;
      rowResult["count_all"] = count_all;

      const numericCols: string[] = [];
      if (filtered.length > 0) {
        const repRow = filtered[0];
        Object.keys(repRow).forEach(k => {
          if (k !== "_tables" && typeof repRow[k] === "number") {
            numericCols.push(k);
          }
        });
        if (repRow._tables) {
          Object.keys(repRow._tables).forEach(tbl => {
            const tblRow = repRow._tables[tbl];
            Object.keys(tblRow).forEach(k => {
              if (typeof tblRow[k] === "number" && !numericCols.includes(`${tbl}.${k}`)) {
                numericCols.push(`${tbl}.${k}`);
              }
            });
          });
        }
      }

      numericCols.forEach(col => {
        let sum = 0;
        let max = -Infinity;
        let min = Infinity;
        filtered.forEach(r => {
          const v = Number(getValueFromRow(col, r));
          if (!isNaN(v)) {
            sum += v;
            if (v > max) max = v;
            if (v < min) min = v;
          }
        });
        const avg = filtered.length > 0 ? sum / filtered.length : 0;

        rowResult[`SUM(${col})`] = sum;
        rowResult[`AVG(${col})`] = avg;
        rowResult[`MAX(${col})`] = max === -Infinity ? 0 : max;
        rowResult[`MIN(${col})`] = min === Infinity ? 0 : min;
        rowResult[`COUNT(${col})`] = filtered.filter(r => getValueFromRow(col, r) !== undefined && getValueFromRow(col, r) !== null).length;

        rowResult[`sum_${col.toLowerCase()}`] = sum;
        rowResult[`avg_${col.toLowerCase()}`] = avg;
        rowResult[`max_${col.toLowerCase()}`] = max;
        rowResult[`min_${col.toLowerCase()}`] = min;
      });

      if (filtered.length > 0) {
        rowResult["_tables"] = filtered[0]._tables;
      }
      grouped = [rowResult];
    } else {
      grouped = filtered.map(row => ({ ...row }));
    }

    // 3. HAVING filter
    if (parsed.havingCondition && parsed.havingCondition.trim()) {
      grouped = grouped.filter(row => {
        try {
          const keys = Object.keys(row);
          let jsCond = parsed.havingCondition
            .replace(/\bAND\b/gi, " && ")
            .replace(/\bOR\b/gi, " || ")
            .replace(/(?<![<>!=])=(?![=])/g, " === ")
            .replace(/<>/g, " !== ");

          jsCond = jsCond.replace(/COUNT\s*\(\s*\*\s*\)/gi, "count_all");

          keys.forEach(k => {
            const escapedK = k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const rx = new RegExp(escapedK, "g");
            jsCond = jsCond.replace(rx, `row['${k}']`);
          });

          const f = new Function("row", "count_all", `return (${jsCond});`);
          return !!f(row, row["count_all"] || 0);
        } catch (e: any) {
          console.warn("Error evaluating HAVING condition:", parsed.havingCondition, e);
          return true;
        }
      });
    }

    // 4. Projection
    let projected: any[] = [];
    const parsedFields = parsed.selectFields.map(f => {
      f = f.trim();
      const asMatch = /\s+AS\s+([A-Za-z0-9_]+)$/i.exec(f);
      if (asMatch) {
         const expr = f.substring(0, asMatch.index).trim();
         const alias = asMatch[1].trim();
         return { expr, alias };
      }
      
      const spaceMatch = /([A-Za-z0-9_*()]+)\s+([A-Za-z0-9_]+)$/i.exec(f);
      if (spaceMatch && !/^(AND|OR|AS)$/i.test(spaceMatch[2])) {
         const expr = spaceMatch[1].trim();
         const alias = spaceMatch[2].trim();
         return { expr, alias };
      }
      
      return { expr: f, alias: f };
    });

    if (parsedFields.length > 0) {
      projected = grouped.map(row => {
        const projRow: Record<string, any> = {};
        parsedFields.forEach(pf => {
          let val = getValueFromRow(pf.expr, row);
          
          if (val === undefined) {
            const expKey = Object.keys(row).find(k => k.toLowerCase() === pf.expr.toLowerCase());
            if (expKey) {
              val = row[expKey];
            }
          }
          
          let aliasName = pf.alias;
          if (aliasName.includes(".")) {
            aliasName = aliasName.split(".").pop()!;
          }
          projRow[aliasName] = val !== undefined ? val : null;
        });
        return projRow;
      });
    } else {
      projected = grouped.map(row => {
        const cleanRow = { ...row };
        delete cleanRow["count_all"];
        delete cleanRow["_tables"];
        Object.keys(cleanRow).forEach(k => {
          if (k.startsWith("SUM(") || k.startsWith("sum_") || k.startsWith("AVG(") || k.startsWith("avg_") || k.includes("(")) {
            delete cleanRow[k];
          }
        });
        return cleanRow;
      });
    }

    // 5. ORDER BY
    if (parsed.orderByFields && parsed.orderByFields.length > 0) {
      projected.sort((a, b) => {
        for (const order of parsed.orderByFields) {
          const col = order.column;
          const dir = order.direction;

          let valA = getValueFromRow(col, a);
          if (valA === undefined) valA = a[col];
          let valB = getValueFromRow(col, b);
          if (valB === undefined) valB = b[col];

          if (valA === undefined) {
             const matchedKey = Object.keys(a).find(k => k.toLowerCase() === col.toLowerCase());
             if (matchedKey) {
               valA = a[matchedKey];
               valB = b[matchedKey];
             }
          }

          if (valA === undefined || valB === undefined) continue;

          let compare = 0;
          if (typeof valA === "number" && typeof valB === "number") {
            compare = valA - valB;
          } else {
            compare = String(valA).localeCompare(String(valB));
          }

          if (compare !== 0) {
            return dir === "ASC" ? compare : -compare;
          }
        }
        return 0;
      });
    }

    // 6. LIMIT
    if (parsed.limit) {
      const limitVal = parseInt(parsed.limit, 10);
      if (!isNaN(limitVal)) {
        projected = projected.slice(0, limitVal);
      }
    }

    return { success: true, data: projected };

  } catch (e: any) {
    return { success: false, error: e.message || "Erro de execução da query." };
  }
}

export function verifySolution(exerciseId: string, userResult: any[]): { solved: boolean; message: string } {
  const exercise = EXERCISES.find(ex => ex.id === exerciseId);
  if (!exercise) {
    return { solved: false, message: "Exercício não cadastrado." };
  }

  const expectedRes = executeSqlQuery(exercise.query);
  if (!expectedRes.success || !expectedRes.data) {
    return { solved: false, message: "Erro ao carregar o gabarito." };
  }

  const expected = expectedRes.data;

  if (userResult.length === 0) {
    return { solved: false, message: "A sua query retornou 0 resultados. Revise os argumentos e filtros!" };
  }

  if (userResult.length !== expected.length) {
    return { solved: false, message: `O resultado esperado possui ${expected.length} linhas, mas a sua consulta em memória retornou ${userResult.length} linhas.` };
  }

  // Normalize helper to disregard table prefixes and make keys case-insensitive
  const normalizeRowKeys = (row: any): Record<string, any> => {
    const normalized: Record<string, any> = {};
    for (const key of Object.keys(row)) {
      if (key === "_tables" || key === "count_all") continue;
      const shortKey = key.includes(".") ? key.split(".").pop()! : key;
      normalized[shortKey.toLowerCase()] = row[key];
    }
    return normalized;
  };

  // Row compare
  for (let i = 0; i < expected.length; i++) {
    const expRow = expected[i];
    const usrRow = userResult[i];

    const normalizedExp = normalizeRowKeys(expRow);
    const normalizedUsr = normalizeRowKeys(usrRow);

    const expKeys = Object.keys(normalizedExp).sort();
    const usrKeys = Object.keys(normalizedUsr).sort();

    if (expKeys.length !== usrKeys.length) {
      return { solved: false, message: "As colunas retornadas não possuem a mesma quantidade do gabarito." };
    }

    for (let j = 0; j < expKeys.length; j++) {
      if (expKeys[j] !== usrKeys[j]) {
         return { solved: false, message: `O campo retornado '${usrKeys[j]}' não coincide com o esperado '${expKeys[j]}'.` };
      }
    }

    for (const key of expKeys) {
      if (String(normalizedExp[key]) !== String(normalizedUsr[key])) {
        return { solved: false, message: `Diferença de valores encontrada na linha ${i + 1}, coluna '${key}'. Esperado: '${normalizedExp[key]}', Obtido: '${normalizedUsr[key]}'.` };
      }
    }
  }

  return { solved: true, message: `Fantástico! A consulta em memória é perfeitamente idêntica à solução ideal para o exercício: "${exercise.title}".` };
}
