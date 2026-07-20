import React, { useState, useEffect } from "react";
import { 
  X, 
  Plus, 
  Trash2, 
  Save, 
  Database, 
  BookOpen, 
  AlertCircle 
} from "lucide-react";
import { TableFieldInfo, generateSqlExerciseFile, CustomExercise } from "../insert";
import { formatSqlWithIndentation } from "../optimization";

interface InsertDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: TableFieldInfo[];
  originalQuery: string;
  showFeedback: (type: "success" | "error", text: string) => void;
}

export default function InsertDataModal({
  isOpen,
  onClose,
  tables,
  originalQuery,
  showFeedback
}: InsertDataModalProps) {
  const [title, setTitle] = useState("");
  const [enunciado, setEnunciado] = useState("");
  
  // Maps tableName -> list of rows. Each row maps fieldName -> cell value
  const [rowsData, setRowsData] = useState<Record<string, Record<string, string>[]>>({});
  const [error, setError] = useState<string | null>(null);

  // Initialize tables with at least 1 empty row each
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, Record<string, string>[]> = {};
      for (const table of tables) {
        const rowObj: Record<string, string> = {};
        for (const field of table.fields) {
          rowObj[field] = "";
        }
        initial[table.tableName] = [rowObj];
      }
      setRowsData(initial);
      setTitle("");
      setEnunciado("");
      setError(null);
    }
  }, [isOpen, tables]);

  if (!isOpen) return null;

  const handleAddRow = (tableName: string) => {
    const table = tables.find(t => t.tableName === tableName);
    if (!table) return;

    const newRow: Record<string, string> = {};
    for (const field of table.fields) {
      newRow[field] = "";
    }

    setRowsData(prev => {
      const currentRows = prev[tableName] || [];
      const newIndex = currentRows.length;
      
      // Auto focus the first field of the newly added row on the next tick
      setTimeout(() => {
        const firstField = table.fields[0];
        const nextInputId = `input-${tableName}-${newIndex}-${firstField}`;
        const inputEl = document.getElementById(nextInputId);
        if (inputEl) {
          inputEl.focus();
        }
      }, 50);

      return {
        ...prev,
        [tableName]: [...currentRows, newRow]
      };
    });
  };

  const handleRemoveRow = (tableName: string, index: number) => {
    setRowsData(prev => {
      const currentRows = prev[tableName] || [];
      if (currentRows.length <= 1) {
        return prev; // keep at least 1 row
      }
      const updated = [...currentRows];
      updated.splice(index, 1);
      return {
        ...prev,
        [tableName]: updated
      };
    });
  };

  const handleCellChange = (tableName: string, rowIndex: number, field: string, value: string) => {
    setRowsData(prev => {
      const currentRows = prev[tableName] || [];
      const updated = [...currentRows];
      updated[rowIndex] = {
        ...updated[rowIndex],
        [field]: value
      };
      return {
        ...prev,
        [tableName]: updated
      };
    });
  };

  const handleSave = () => {
    setError(null);

    // 1. Validation: Title and Enunciado are mandatory
    if (!title.trim()) {
      setError("O campo 'Título do Exercício' é obrigatório.");
      return;
    }
    if (!enunciado.trim()) {
      setError("O campo 'Enunciado do Exercício' é obrigatório.");
      return;
    }

    // 2. Validation: Table names must not exist in base database
    const forbiddenTables = ["customers", "clientes", "sales", "vendas", "products", "produtos", "product", "suspeitos"];
    for (const table of tables) {
      if (forbiddenTables.includes(table.tableName.toLowerCase())) {
        setError(`A tabela '${table.tableName}' já existe na base de dados usada nos exercícios. Use outro nome.`);
        return;
      }
    }

    // 3. Validation: All fields in all rows are mandatory
    for (const table of tables) {
      const rows = rowsData[table.tableName] || [];
      if (rows.length === 0) {
        setError(`A tabela '${table.tableName}' precisa ter pelo menos 1 linha de dados.`);
        return;
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        for (const field of table.fields) {
          const val = row[field];
          if (val === undefined || val === null || val.trim() === "") {
            setError(`Todos os campos são obrigatórios! Preencha a linha ${i + 1}, campo '${field}' da tabela '${table.tableName}'.`);
            return;
          }
        }
      }
    }

    // Generate SQL file content with formatted query
    const formattedQuery = formatSqlWithIndentation(originalQuery);
    const sqlContent = generateSqlExerciseFile(enunciado, tables, rowsData, formattedQuery);

    // Download the .SQL file
    const blob = new Blob([sqlContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.trim()}.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Notify user to upload the generated file to activate
    showFeedback("success", "Para habilitar esse exercício carregue o arquivo gerado.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl bg-[#0b1329] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-850 flex items-center justify-between bg-[#070d1d]">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Inserir Dados do Novo Exercício
              </h3>
              <p className="text-[10px] text-slate-400">
                Gere comandos SQL INSERT para simular dados e salvar um novo desafio personalizado.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-350 flex items-center gap-2.5">
              <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Exercise Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                Título do Exercício *
              </label>
              <input 
                type="text"
                placeholder="Ex: Alunos do curso de TI"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-[#050914] border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Enunciado / Descrição do Exercício *
              </label>
              <textarea 
                placeholder="Ex: Selecione o nome e a idade dos alunos que pertencem à turma de TI..."
                rows={2}
                value={enunciado}
                onChange={e => setEnunciado(e.target.value)}
                className="w-full px-3 py-2 bg-[#050914] border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all resize-none"
              />
            </div>
          </div>

          {/* Tables Data Entry */}
          <div className="space-y-5">
            <h4 className="text-xs font-extrabold text-amber-500 uppercase tracking-widest border-b border-slate-800 pb-1">
              Inserir registros nas tabelas da query
            </h4>

            {tables.map(table => (
              <div key={table.tableName} className="bg-[#050813]/60 rounded-xl border border-slate-850 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-200 font-mono">
                      Tabela: {table.tableName}
                    </span>
                    <span className="hidden sm:inline-block text-[10px] text-slate-500 font-semibold bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-800">
                      Atalho: Enter no campo para nova linha
                    </span>
                  </div>
                  <button
                    onClick={() => handleAddRow(table.tableName)}
                    className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                    title="Adicionar Linha (Atalho: Pressione Enter em qualquer campo)"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar Linha <kbd className="text-[9px] px-1 bg-slate-950 border border-slate-800 rounded font-sans ml-1 text-slate-350">Enter</kbd></span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-900 bg-slate-950/40">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-900 bg-[#070b16]">
                        {table.fields.map(field => (
                          <th key={field} className="px-3 py-2 font-bold text-slate-400 font-mono text-[11px]">
                            {field}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-center w-12 text-slate-500 font-bold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(rowsData[table.tableName] || []).map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-slate-900 hover:bg-[#080d19]/40 transition-colors">
                          {table.fields.map(field => (
                            <td key={field} className="px-2 py-1.5">
                              <input 
                                id={`input-${table.tableName}-${rIdx}-${field}`}
                                type="text"
                                placeholder={`Insira ${field}`}
                                value={row[field] || ""}
                                onChange={e => handleCellChange(table.tableName, rIdx, field, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddRow(table.tableName);
                                  }
                                }}
                                className="w-full px-2 py-1 bg-[#03050a] border border-slate-850 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/30 transition-all font-mono"
                              />
                            </td>
                          ))}
                          <td className="px-2 py-1.5 text-center">
                            <button
                              onClick={() => handleRemoveRow(table.tableName, rIdx)}
                              disabled={(rowsData[table.tableName] || []).length <= 1}
                              className={`p-1 rounded-lg transition-all ${
                                (rowsData[table.tableName] || []).length <= 1
                                  ? "text-slate-700 cursor-not-allowed"
                                  : "text-rose-400 hover:text-rose-350 hover:bg-rose-950/20 cursor-pointer"
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4.5 border-t border-slate-850 bg-[#090d16] flex items-center justify-between">
          <p className="text-[10px] text-slate-400">
            * Todos os campos nas tabelas e no cabeçalho são obrigatórios.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4 text-slate-950" />
              <span>Salvar</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
