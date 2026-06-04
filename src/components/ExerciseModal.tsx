import React, { useState, useEffect } from "react";
import { 
  X, 
  CheckCircle, 
  XCircle, 
  Database, 
  BookOpen, 
  Trophy, 
  Sparkles, 
  Table,
  Info
} from "lucide-react";
import { 
  EXERCISES, 
  executeSqlQuery, 
  verifySolution 
} from "../training";

interface ExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSqlQuery: string;
  activeExerciseId: string | null;
  setActiveExerciseId: (id: string) => void;
  onLoadExerciseSql: (query: string) => void;
}

export default function ExerciseModal({
  isOpen,
  onClose,
  currentSqlQuery,
  activeExerciseId,
  setActiveExerciseId,
  onLoadExerciseSql
}: ExerciseModalProps) {
  const [executionResult, setExecutionResult] = useState<any[] | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [validation, setValidation] = useState<{ solved: boolean; message: string } | null>(null);

  const selectedExercise = EXERCISES.find(e => e.id === activeExerciseId) || EXERCISES[0];

  const handleRunQuery = () => {
    setExecutionError(null);
    setExecutionResult(null);
    setValidation(null);

    const result = executeSqlQuery(currentSqlQuery);
    if (result.success) {
      setExecutionResult(result.data || []);
      if (activeExerciseId) {
        const val = verifySolution(activeExerciseId, result.data || []);
        setValidation(val);
      }
    } else {
      setExecutionError(result.error || "Erro ao executar query.");
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleRunQuery();
    }
  }, [isOpen, activeExerciseId, currentSqlQuery]);

  if (!isOpen) return null;

  const renderTableData = (data: any[]) => {
    if (!data || data.length === 0) {
      return (
        <div className="py-12 text-center text-slate-500 font-mono text-xs">
          Nenhum registro encontrado.
        </div>
      );
    }

    const headers = Object.keys(data[0]);

    return (
      <div className="overflow-x-auto border border-slate-850 rounded-xl max-h-[300px] overflow-y-auto w-full shadow-inner bg-[#05070c]/50">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead className="bg-[#0b0e14] text-slate-400 font-semibold border-b border-slate-850 sticky top-0 md:text-xs">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-5 py-3.5 capitalize tracking-wider text-slate-450">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850/50">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-cyan-950/15 transition-colors">
                {headers.map((h, colIndex) => (
                  <td key={colIndex} className="px-5 py-3 text-slate-300 max-w-[200px] truncate">
                    {row[h] === null || row[h] === undefined ? (
                      <span className="text-slate-600 italic font-medium">null</span>
                    ) : (
                      String(row[h])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020204]/80 backdrop-blur-sm animate-fade-in">
      <div 
        id="exercise-popup-container"
        className="w-full max-w-3xl bg-[#080c14] border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-in"
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-850 flex items-center justify-between bg-[#0a0f1b]">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white font-display">
                Resultados do Exercício
              </h2>
              <p className="text-[10px] text-slate-400">
                Verifique os registros retornados pela query em memória
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-950/80 text-slate-400 hover:text-white border border-slate-850 hover:bg-slate-900 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          
          {/* Top: Enunciado do Desafio */}
          <div className="p-5 rounded-xl border border-slate-850 bg-[#0c1220]/60 shadow-sm">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs mb-1 bg-amber-500/5 px-2.5 py-0.5 rounded border border-amber-500/10 w-fit">
                <BookOpen className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>{selectedExercise.title}</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed font-sans mt-2">
                {selectedExercise.description}
              </p>
              <div className="flex items-center gap-1.5 mt-3">
                <span className="text-[9px] text-slate-450 font-semibold uppercase tracking-wider">Tabela alvo:</span>
                <span className="text-[9px] font-mono bg-slate-950 px-2 py-0.5 border border-slate-850 rounded text-amber-300 font-bold uppercase">{selectedExercise.targetTable}</span>
              </div>
            </div>
          </div>

          {/* Middle: Somente os dados obtidos com a execução da query */}
          <div className="flex flex-col flex-1 min-h-[220px] justify-start p-1 bg-[#04060b]/40 border border-slate-850/60 rounded-xl">
            {/* Execution Error */}
            {executionError && (
              <div className="p-4 bg-[#140608] border border-rose-500/20 rounded-xl text-rose-300 text-xs flex gap-3 m-2 shadow-inner">
                <XCircle className="w-5 h-5 text-rose-450 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-400 text-xs">Erro na Execução da Query</div>
                  <p className="mt-1 font-mono text-xs text-rose-300/80">{executionError}</p>
                </div>
              </div>
            )}

            {/* Database Query Result Grid */}
            {!executionError && (
              <div className="p-1.5 flex-1 flex flex-col justify-stretch">
                {executionResult === null ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center gap-3 flex-1">
                    <Database className="w-8 h-8 text-slate-600 animate-pulse" />
                    <div>
                      <p className="text-slate-400 font-bold text-xs animate-pulse">Carregando resultado...</p>
                    </div>
                  </div>
                ) : (
                  renderTableData(executionResult)
                )}
              </div>
            )}
          </div>

        </div>

        {/* Footer: status dizendo se o resultado está correto ou não */}
        <div className="px-6 py-4.5 border-t border-slate-850 bg-[#090d16] flex flex-col gap-3">
          {validation ? (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 transition-all ${
              validation.solved
                ? "bg-emerald-955/20 border-emerald-500/30 text-emerald-350 shadow-inner animate-fade-in"
                : "bg-rose-955/20 border-rose-500/30 text-rose-350 shadow-inner animate-fade-in"
            }`}>
              {validation.solved ? (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-extrabold flex items-center gap-1 text-emerald-400 text-xs uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                      Status: Desafio Concluído com Sucesso!
                    </div>
                    <p className="mt-1 leading-relaxed text-slate-200 font-medium">{validation.message}</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-extrabold text-rose-400 text-xs uppercase tracking-wider">
                      Status: Resposta Incorreta
                    </div>
                    <p className="mt-1 leading-relaxed text-slate-200 font-medium">{validation.message}</p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="p-3.5 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-400 text-xs flex items-center gap-3">
              <Info className="w-5 h-5 text-slate-500 shrink-0" />
              <div>
                <span className="font-bold text-slate-300 uppercase tracking-wider">Status: Aguardando Execução</span>
                <p className="mt-0.5 text-slate-400">Escreva o SQL ou monte os blocos e execute para validar.</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
