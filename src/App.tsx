import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Database,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
  Code,
  Terminal,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Settings,
  HelpCircle
} from "lucide-react";
import SqlBlockly from "./components/SqlBlockly";

// Define supported translation target languages
interface LanguageOption {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  exampleMatch: string;
}

const LANGUAGES: LanguageOption[] = [
  {
    id: "MongoDB",
    name: "MongoDB",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: "🍃",
    exampleMatch: "db.collection.find(...)"
  },
  {
    id: "Pandas",
    name: "Pandas (Python)",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    icon: "🐼",
    exampleMatch: "df.query(...)"
  },
  {
    id: "Oracle",
    name: "Oracle",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: "🔴",
    exampleMatch: "SELECT * FROM (SELECT ...)"
  },
  {
    id: "SqlServer",
    name: "SQL Server",
    color: "text-sky-600",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
    icon: "🛢️",
    exampleMatch: "SELECT TOP 10 ..."
  },
  {
    id: "Postgre",
    name: "PostgreSQL",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: "🐘",
    exampleMatch: "SELECT * FROM ... LIMIT ..."
  }
];

export default function App() {
  const [sqlQuery, setSqlQuery] = useState<string>("");
  const [targetLanguage, setTargetLanguage] = useState<string>("MongoDB");
  const [translationResult, setTranslationResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | null; text: string }>({
    type: null,
    text: ""
  });
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Reference callback to invoke the Block reconstruction on SqlBlockly
  const blocklyRebuiltCallbackRef = useRef<((sql: string) => void) | null>(null);

  // Triggered on Blockly block configuration change
  const handleBlocklySqlChange = (newSql: string) => {
    setSqlQuery(newSql);
  };

  // Pre-configured query examples to help the user test instantly
  const loadExample = (type: "customers" | "sales" | "complex") => {
    let query = "";
    if (type === "customers") {
      query = "SELECT name, email FROM customers WHERE age >= 21 ORDER BY name ASC LIMIT 15";
    } else if (type === "sales") {
      query = "SELECT product, quantity FROM sales WHERE quantity > 100 GROUP BY product ORDER BY quantity DESC LIMIT 5";
    } else {
      query = "SELECT item, price FROM products WHERE category = 'technology' AND price < 1500 ORDER BY price DESC";
    }
    setSqlQuery(query);
    // Auto-update blockly
    if (blocklyRebuiltCallbackRef.current) {
      blocklyRebuiltCallbackRef.current(query);
    }
    showFeedback("success", "Exemplo carregado! Clique em 'Atualizar' se deseja remontar blocos.");
  };

  const showFeedback = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage({ type: null, text: "" });
    }, 4500);
  };

  // Rebuild Blockly workspace blocks programmatically (Rule 2.1)
  const handleUpdateBlockly = () => {
    if (blocklyRebuiltCallbackRef.current) {
      if (!sqlQuery.trim()) {
        showFeedback("error", "Área de texto vazia. Escreva SQL para atualizar.");
        return;
      }
      blocklyRebuiltCallbackRef.current(sqlQuery);
      showFeedback("success", "Interface de blocos atualizada com sucesso!");
    } else {
      showFeedback("error", "Erro ao acessar o inicializador do Blockly.");
    }
  };

  // Call the translate API (Rule 2.2)
  const handleTranslateQuery = async () => {
    if (!sqlQuery.trim() || sqlQuery.startsWith("--")) {
      showFeedback("error", "Escreva ou monte uma query SQL válida para traduzir.");
      return;
    }

    setIsLoading(true);
    setTranslationResult("");
    showFeedback("success", `Iniciando tradução para ${targetLanguage}...`);

    try {
      // Hit our robust backend endpoint proxy to bypass modern browser CORS restrictions
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: sqlQuery,
          language: targetLanguage
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API (${response.status})`);
      };

      
      await showFeedback("success", `Resposta recebida : ${response}`);

      const data = await response.json();
      
      // Handle multiple potential JSON structure responses cleanly
      let resultText = "";
      if (data && typeof data === "object") {
        resultText = data.result || data.translatedText || data.translation || JSON.stringify(data, null, 2);
      } else {
        resultText = String(data);
      }

      setTranslationResult(resultText);
      showFeedback("success", "Tradução concluída com sucesso!");
    } catch (err: any) {
      console.error(err);     
      setTranslationResult("");
      showFeedback("error", `Falha ao traduzir: ${err.message || "Verifique a API de tradução."}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy translated code to clipboard
  const handleCopyToClipboard = () => {
    if (!translationResult) return;
    navigator.clipboard.writeText(translationResult);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-200 font-sans antialiased pb-12 selection:bg-cyan-500/20">
      
      {/* Dynamic Alert Banner */}
      <AnimatePresence>
        {statusMessage.text && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border text-sm max-w-md backdrop-blur-md ${
              statusMessage.type === "success"
                ? "bg-slate-900/95 border-emerald-500/30 text-emerald-350 shadow-emerald-500/10"
                : "bg-slate-900/95 border-rose-500/30 text-rose-350 shadow-rose-500/10"
            }`}
          >
            {statusMessage.type === "success" ? (
              <Check className="w-5 h-5 text-emerald-450 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-450 shrink-0" />
            )}
            <p className="font-medium">{statusMessage.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header */}
      <header className="border-b border-slate-900 bg-[#080c14]/80 shadow-md sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/15">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold tracking-tight text-white flex items-center gap-2">
                SQL-Parser
                <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-400 font-bold border border-cyan-800">
                  v1.2026.05.26
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Monte queries SQL visualmente e traduza para linguagens NoSQL e DataFrames
              </p>
            </div>
          </div>

          {/* Quick Examples Loader */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-slate-850">
            <span className="text-[10px] font-semibold text-slate-400 px-2 uppercase tracking-wider">
              Exemplos:
            </span>
            <button
              id="example-btn-customers"
              onClick={() => loadExample("customers")}
              className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-cyan-400 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
            >
              Clientes
            </button>
            <button
              id="example-btn-sales"
              onClick={() => loadExample("sales")}
              className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-cyan-400 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
            >
              Vendas
            </button>
            <button
              id="example-btn-complex"
              onClick={() => loadExample("complex")}
              className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-cyan-400 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
            >
              Filtro Tech
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Interactive Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUMN 1: Visual Blockly Editor (7 cols) */}
          <section className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-lg shadow-cyan-500/50"></div>
                  <h2 className="text-xs font-bold tracking-wider font-display text-white uppercase">
                    1. Editor Visual (Blockly)
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                  <span>Arraste blocos para montar a query</span>
                </div>
              </div>

              {/* The Blockly Component wrapper */}
              <SqlBlockly
                onSqlChange={handleBlocklySqlChange}
                editorTriggerRef={blocklyRebuiltCallbackRef}
              />
            </div>
          </section>

          {/* COLUMN 2: Raw Code Area & Utilities (5 cols) */}
          <section className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Box 1: SQL Code Input and Actions */}
            <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400 shadow-lg shadow-amber-400/50"></div>
                  <h2 className="text-xs font-bold tracking-wider font-display text-white uppercase">
                    2. Query SQL (Editor Manual)
                  </h2>
                </div>
                <span className="text-[10px] font-mono font-bold bg-amber-955/55 text-amber-300 px-2.5 py-0.5 rounded-lg border border-amber-900/60">
                  ANSI SQL
                </span>
              </div>

              <div className="relative">
                <textarea
                  id="sql-text-area"
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="SELECT * FROM table_name WHERE condition..."
                  className="w-full h-[180px] p-4 bg-slate-950 text-emerald-400 font-mono text-sm leading-relaxed rounded-xl border border-slate-850 shadow-inner focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40 transition-colors"
                  spellCheck="false"
                />
                
                {/* Micro instructions overlay */}
                <div className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-400 bg-slate-900/90 px-2 py-1 rounded border border-slate-800">
                  Modo Manual Ativo
                </div>
              </div>

              {/* Action Buttons below Code Area (2.1 & 2.2) */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Button 2.1: Atualizar */}
                <button
                  id="update-blockly-btn"
                  onClick={handleUpdateBlockly}
                  className="w-full py-3 px-4 bg-slate-950 text-slate-350 hover:bg-slate-900 active:bg-slate-850 hover:text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all border border-slate-850 hover:border-slate-700 cursor-pointer select-none"
                  title="Atualiza os blocos visuais para corresponder ao código escrito acima"
                >
                  <RefreshCw className="w-4 h-4 text-slate-400" />
                  Atualizar Blocos
                </button>

                {/* Button 2.2: Traduzir */}
                <button
                  id="translate-btn"
                  onClick={handleTranslateQuery}
                  disabled={isLoading}
                  className={`w-full py-3 px-4 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-950/25 cursor-pointer select-none ${
                    isLoading
                      ? "bg-cyan-950 text-cyan-700 cursor-not-allowed border border-cyan-900"
                      : "bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-350 hover:to-indigo-400"
                  }`}
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isLoading ? "Traduzindo..." : "Traduzir Query"}
                </button>
              </div>
            </div>

            {/* Box 2: Target Database / Language Selector */}
            <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest font-display">
                  Escolha o Alvo para Tradução:
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {LANGUAGES.map((lang) => {
                  const isSelected = targetLanguage === lang.id;
                  return (
                    <button
                      key={lang.id}
                      id={`lang-tab-${lang.id}`}
                      onClick={() => setTargetLanguage(lang.id)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? `bg-cyan-950/40 border-cyan-500/80 shadow-lg shadow-cyan-950/40`
                          : "border-slate-850/80 bg-slate-950/30 hover:bg-slate-850/50 text-slate-400 hover:border-slate-750 hover:text-slate-200"
                      }`}
                    >
                      <span className="text-lg mb-1">{lang.icon}</span>
                      <span className={`text-[10px] font-bold tracking-tight ${isSelected ? "text-cyan-400" : "text-slate-400"}`}>
                        {lang.id}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Box 3: Translation Results Section */}
            <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest font-display">
                    Resultado da Tradução
                  </span>
                </div>
                
                {translationResult && (
                  <button
                    id="copy-result-btn"
                    onClick={handleCopyToClipboard}
                    className="p-1 px-2.5 rounded-lg hover:bg-slate-800 hover:border-slate-700 bg-slate-950/80 text-xs font-bold text-cyan-400 flex items-center gap-1.5 cursor-pointer border border-slate-850 transition-all shadow-md"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar Código
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="min-h-[140px] bg-[#04060a] p-4 rounded-xl border border-slate-850 font-mono text-xs flex flex-col justify-between overflow-x-auto">
                <code id="translation-output-code" className="text-cyan-400 whitespace-pre leading-relaxed block text-[13px]">
                  {translationResult || (
                    <span className="text-slate-500 italic block py-4 text-center">
                      Nenhuma tradução solicitada ainda. Escolha a linguagem alvo acima e clique em 'Traduzir Query'.
                    </span>
                  )}
                </code>

                {translationResult && (
                  <div className="mt-4 pt-3 border-t border-slate-850 flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">Sintaxe otimizada para:</span>
                    <span className="text-cyan-400 font-bold uppercase tracking-wider">{targetLanguage}</span>
                  </div>
                )}
              </div>
            </div>

          </section>

        </div>

        {/* Informative Help Guide Section */}
        <section className="mt-12 bg-slate-900/40 rounded-2xl border border-slate-800 p-6 shadow-2xl backdrop-blur-sm max-w-7xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-cyan-950/70 border border-cyan-900 text-cyan-400 rounded-xl shrink-0 shadow-lg shadow-cyan-950/10">
              <Code className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-display font-medium text-white">Como usar o SQL-Parser?</h3>
              <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                Esta aplicação integra uma montagem visual baseada no biblioteca <strong>Blockly</strong> com a flexibilidade de digitação textual tradicional SQL.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 pt-4 border-t border-slate-850">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest font-display">A – Montar por Blocos</span>
                  <p className="text-xs text-slate-450 leading-relaxed">
                    Arraste ou preencha dados nos blocos Blockly. A área de texto "Query SQL" se altera em tempo real conforme você faz qualquer modificação visual.
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-extrabold text-amber-400 uppercase tracking-widest font-display">B – Atualizar Manualmente</span>
                  <p className="text-xs text-slate-450 leading-relaxed">
                    Se preferir digitar/colar SQL na caixa de texto, clique em <strong>"Atualizar Blocos"</strong> para recriar e re-conectar a árvore de blocos Blockly correspondente.
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest font-display">C – Traduzir Sintaxe</span>
                  <p className="text-xs text-slate-450 leading-relaxed">
                    Selecione a linguagem desejada (MongoDB, Pandas, Oracle, SQL Server ou PostgreSQL) e clique em <strong>Traduzir Query</strong> para consultar e ver o código traduzido na hora.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
