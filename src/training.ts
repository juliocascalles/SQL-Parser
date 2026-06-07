// Database datasets and in-memory SQL execution engine for interactive exercises.
import { parseSqlStringToData } from "./parser";

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
  { id: 1, product: "Teclado", quantity: 150, price: 120, customer_id: 11 },
  { id: 2, product: "Mouse", quantity: 80, price: 60, customer_id: 11 },
  { id: 3, product: "Monitor", quantity: 120, price: 1200, customer_id: 11 },
  { id: 4, product: "Teclado", quantity: 90, price: 110, customer_id: 20 },
  { id: 5, product: "Mouse", quantity: 200, price: 50, customer_id: 20 },
  { id: 6, product: "Headset", quantity: 300, price: 250, customer_id: 11 },
  { id: 7, product: "Monitor", quantity: 45, price: 1300, customer_id: 20 },
  { id: 8, product: "Headset", quantity: 50, price: 280, customer_id: 20 },
  { id: 9, product: "Teclado", quantity: 110, price: 120, customer_id: 11 },
  { id: 10, product: "Gabinete", quantity: 15, price: 400, customer_id: 11 },
  { id: 11, product: "Mouse", quantity: 130, price: 65, customer_id: 11 },
  { id: 12, product: "Gabinete", quantity: 110, price: 380, customer_id: 20 }
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

export const Pessoas = [
  { id: 1, nome: "Ana Paula", sexo: "Feminino", idade: 25, cidade: "São Paulo" },
  { id: 2, nome: "Bruno Silva", sexo: "Masculino", idade: 31, cidade: "Rio de Janeiro" },
  { id: 3, nome: "Carla Souza", sexo: "Feminino", idade: 19, cidade: "Belo Horizonte" },
  { id: 4, nome: "Daniel Costa", sexo: "Masculino", idade: 42, cidade: "Curitiba" },
  { id: 5, nome: "Eliane Rocha", sexo: "Feminino", idade: 28, cidade: "Porto Alegre" },
  { id: 6, nome: "Fabio Santos", sexo: "Masculino", idade: 35, cidade: "Salvador" },
  { id: 7, nome: "Gabriela Lima", sexo: "Feminino", idade: 22, cidade: "Recife" },
  { id: 8, nome: "Hugo Pereira", sexo: "Masculino", idade: 29, cidade: "Brasília" },
  { id: 9, nome: "Isabela Alves", sexo: "Feminino", idade: 27, cidade: "São Paulo" },
  { id: 10, nome: "João Medeiros", sexo: "Masculino", idade: 48, cidade: "Rio de Janeiro" },
  { id: 11, nome: "Karina Dias", sexo: "Feminino", idade: 33, cidade: "Belo Horizonte" },
  { id: 12, nome: "Leonardo Gomes", sexo: "Masculino", idade: 24, cidade: "Curitiba" },
  { id: 13, nome: "Mariana Naves", sexo: "Feminino", idade: 26, cidade: "Porto Alegre" },
  { id: 14, nome: "Natan Ribeiro", sexo: "Masculino", idade: 38, cidade: "Salvador" },
  { id: 15, nome: "Olivia Castro", sexo: "Feminino", idade: 30, cidade: "Recife" },
  { id: 16, nome: "Pedro Barros", sexo: "Masculino", idade: 21, cidade: "Brasília" },
  { id: 17, nome: "Raquel Martins", sexo: "Feminino", idade: 41, cidade: "São Paulo" },
  { id: 18, nome: "Samuel Viana", sexo: "Masculino", idade: 18, cidade: "Rio de Janeiro" },
  { id: 19, nome: "Tatiana Ferraz", sexo: "Feminino", idade: 32, cidade: "Belo Horizonte" },
  { id: 20, nome: "Vitor Barbosa", sexo: "Masculino", idade: 36, cidade: "Curitiba" },
  { id: 21, nome: "Beatriz Mota", sexo: "Feminino", idade: 23, cidade: "Salvador" },
  { id: 22, nome: "Camila Ortiz", sexo: "Feminino", idade: 29, cidade: "Porto Alegre" },
  { id: 23, nome: "Diana Leitão", sexo: "Feminino", idade: 34, cidade: "São Paulo" },
  { id: 24, nome: "Fernanda Lins", sexo: "Feminino", idade: 45, cidade: "Rio de Janeiro" },
  { id: 25, nome: "Helena Moreira", sexo: "Feminino", idade: 50, cidade: "Belo Horizonte" },
  { id: 26, nome: "Julia Guedes", sexo: "Feminino", idade: 20, cidade: "Curitiba" },
  { id: 27, nome: "Luana Flores", sexo: "Feminino", idade: 27, cidade: "Porto Alegre" },
  { id: 28, nome: "William Santos", sexo: "Masculino", idade: 33, cidade: "Porto Alegre" },
  { id: 29, nome: "Thiago Ramos", sexo: "Masculino", idade: 31, cidade: "São Paulo" },
  { id: 30, nome: "Felipe Melo", sexo: "Masculino", idade: 28, cidade: "Rio de Janeiro" },
  { id: 31, nome: "Guilherme Reis", sexo: "Masculino", idade: 22, city: "Salvador" }
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
    description: "Siga o fluxo de análise e agrupe a tabela 'sales' por produto (product). Filtre apenas vendas do cliente com id igual a 11 (customer_id = 11). Retorne o produto (product) e a soma das quantidades identificada como 'total'. Ordene os resultados pelo total em ordem decrescente (DESC).",
    query: "SELECT product, Sum(quantity) As total FROM sales WHERE customer_id = 11 GROUP BY product ORDER BY total DESC",
    templateQuery: "SELECT * FROM sales WHERE customer_id = 15 GROUP BY product ORDER BY quantity DESC",
    targetTable: "sales"
  },
  {
    id: "complex",
    title: "Exercício 3: Notebooks e Tecnologia",
    description: "Filtre a tabela 'products' selecionando os campos item e preço (price) apenas para produtos da categoria 'technology' com valor abaixo de 1500 (price < 1500). Ordene por preço de forma decrescente (DESC).",
    query: "SELECT item, price FROM products WHERE category = 'technology' AND price < 1500 ORDER BY price DESC",
    templateQuery: "SELECT item, price, category FROM products WHERE category = 'appliances' ORDER BY price ASC",
    targetTable: "products"
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

export function executeSqlQuery(sql: string): { success: boolean; data?: any[]; error?: string } {
  try {
    if (!sql || !sql.trim()) {
      return { success: false, error: "Nenhuma query fornecida." };
    }

    const parsed = parseSqlStringToData(sql);
    const tableNameLower = parsed.mainTable.toLowerCase().trim();

    let sourceData: any[] = [];
    if (tableNameLower === "customers" || tableNameLower === "clientes") {
      sourceData = customers;
    } else if (tableNameLower === "sales" || tableNameLower === "vendas") {
      sourceData = sales;
    } else if (tableNameLower === "products" || tableNameLower === "produtos" || tableNameLower === "product") {
      sourceData = products;
    } else if (tableNameLower === "pessoas" || tableNameLower === "pessoas") {
      sourceData = Pessoas;
    } else if (tableNameLower === "suspeitos") {
      sourceData = suspeitos;
    } else {
      return { success: false, error: `Tabela '${parsed.mainTable}' não encontrada no banco de dados em memória. As tabelas disponíveis são: customers, sales, products, Pessoas, suspeitos.` };
    }

    // 1. Filter using WHERE
    let filtered = [...sourceData];
    if (parsed.whereCondition && parsed.whereCondition.trim()) {
      filtered = filtered.filter(row => {
        try {
          const keys = Object.keys(row);
          const values = Object.values(row);
          let jsCond = parsed.whereCondition
            .replace(/\bAND\b/gi, " && ")
            .replace(/\bOR\b/gi, " || ")
            .replace(/(?<![<>!=])=(?![=])/g, " === ")
            .replace(/<>/g, " !== ");

          // Safeguard quotes
          const f = new Function(...keys, `return (${jsCond});`);
          return !!f(...values);
        } catch (e: any) {
          console.warn("Error evaluating WHERE:", parsed.whereCondition, e);
          return true; // Fallback
        }
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
        const valuesKey = gbKeys.map(k => String((row as any)[k] !== undefined ? (row as any)[k] : "")).join("||");
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
          rowResult[k] = (repRow as any)[k];
        });

        const count_all = groupRows.length;
        rowResult["COUNT(*)"] = count_all;
        rowResult["count_all"] = count_all;

        const numericCols = ["quantity", "price", "idade", "stock"];
        numericCols.forEach(col => {
          let sum = 0;
          let max = -Infinity;
          let min = Infinity;
          groupRows.forEach(r => {
            const v = Number((r as any)[col]);
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
          rowResult[`COUNT(${col})`] = groupRows.filter(r => (r as any)[col] !== undefined && (r as any)[col] !== null).length;

          rowResult[`sum_${col}`] = sum;
          rowResult[`avg_${col}`] = avg;
          rowResult[`max_${col}`] = max;
          rowResult[`min_${col}`] = min;
        });

        if (tableNameLower === "sales" || tableNameLower === "vendas") {
          rowResult["quantity"] = rowResult["SUM(quantity)"] || 150; // Use sum quantity for grouped sales
        }

        grouped.push(rowResult);
      });
    } else if (hasAggsInSelect) {
      const rowResult: Record<string, any> = {};
      const count_all = filtered.length;
      rowResult["COUNT(*)"] = count_all;
      rowResult["count_all"] = count_all;

      const numericCols = ["quantity", "price", "idade", "stock"];
      numericCols.forEach(col => {
        let sum = 0;
        let max = -Infinity;
        let min = Infinity;
        filtered.forEach(r => {
          const v = Number((r as any)[col]);
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
        rowResult[`COUNT(${col})`] = filtered.filter(r => (r as any)[col] !== undefined && (r as any)[col] !== null).length;

        rowResult[`sum_${col}`] = sum;
        rowResult[`avg_${col}`] = avg;
        rowResult[`max_${col}`] = max;
        rowResult[`min_${col}`] = min;
      });

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
        const rowKeys = Object.keys(row);
        parsedFields.forEach(pf => {
          let val = undefined;
          const targetKey = rowKeys.find(k => k.toLowerCase() === pf.expr.toLowerCase());
          if (targetKey !== undefined) {
            val = row[targetKey];
          } else {
            if (pf.expr.toLowerCase() === "count(*)") {
              val = row["count_all"];
            } else {
              val = row[pf.expr];
            }
          }
          projRow[pf.alias] = val !== undefined ? val : null;
        });
        return projRow;
      });
    } else {
      projected = grouped.map(row => {
        const cleanRow = { ...row };
        delete cleanRow["count_all"];
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

          let valA = a[col];
          let valB = b[col];

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

  // Row compare
  for (let i = 0; i < expected.length; i++) {
    const expRow = expected[i];
    const usrRow = userResult[i];

    const expKeys = Object.keys(expRow).sort();
    const usrKeys = Object.keys(usrRow).sort();

    if (expKeys.length !== usrKeys.length) {
      return { solved: false, message: "As colunas retornadas não possuem a mesma quantidade do gabarito." };
    }

    for (let j = 0; j < expKeys.length; j++) {
      if (expKeys[j].toLowerCase() !== usrKeys[j].toLowerCase()) {
         return { solved: false, message: `O campo retornado '${usrKeys[j]}' não coincide com o esperado '${expKeys[j]}'.` };
      }
    }

    for (const key of expKeys) {
      const usrKey = Object.keys(usrRow).find(k => k.toLowerCase() === key.toLowerCase()) || key;
      if (String(expRow[key]) !== String(usrRow[usrKey])) {
        return { solved: false, message: `Diferença de valores encontrada na linha ${i + 1}, coluna '${key}'. Esperado: '${expRow[key]}', Obtido: '${usrRow[usrKey]}'.` };
      }
    }
  }

  return { solved: true, message: `Fantástico! A consulta em memória é perfeitamente idêntica à solução ideal para o exercício: "${exercise.title}".` };
}
