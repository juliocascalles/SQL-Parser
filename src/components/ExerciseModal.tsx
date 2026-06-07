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
  verifySolution,
  suspeitos
} from "../training";

interface ExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSqlQuery: string;
  activeExerciseId: string | null;
  setActiveExerciseId: (id: string) => void;
  onLoadExerciseSql: (query: string) => void;
  targetSuspect?: any;
  onDrawNewSuspect?: () => void;
}

function SuspectAvatar({ row }: { row: any }) {
  if (!row) {
    return (
      <svg viewBox="0 0 200 200" className="w-44 h-44 mx-auto" style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}>
        <circle cx="100" cy="95" r="45" fill="#1e293b" stroke="#475569" strokeWidth="2" />
        <path d="M60 170 C60 140, 140 140, 140 170" fill="#1e293b" stroke="#475569" strokeWidth="2" />
        <text x="100" y="110" fill="#64748b" fontSize="40" fontWeight="bold" textAnchor="middle">?</text>
      </svg>
    );
  }

  // Find the suspect in the master list
  const getVal = (field: string) => {
    const key = Object.keys(row).find(k => k.toLowerCase() === field.toLowerCase());
    return key ? String(row[key]) : "";
  };

  const idVal = getVal("id");
  const nomeVal = getVal("nome");

  const s = suspeitos.find(sus => {
    if (idVal && sus.id === Number(idVal)) return true;
    if (nomeVal && sus.nome.toLowerCase() === nomeVal.toLowerCase()) return true;
    return false;
  });

  if (s && s.imagem) {
    return (
      <div className="w-44 h-44 mx-auto relative flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden p-1">
        <img 
          src={s.imagem} 
          alt={s.nome} 
          className="w-full h-full object-contain filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Fallback to silhouette if we couldn't match or don't have an image
  return (
    <svg viewBox="0 0 200 200" className="w-44 h-44 mx-auto" style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}>
      <circle cx="100" cy="95" r="45" fill="#1e293b" stroke="#475569" strokeWidth="2" />
      <path d="M60 170 C60 140, 140 140, 140 170" fill="#1e293b" stroke="#475569" strokeWidth="2" />
      <text x="100" y="110" fill="#64748b" fontSize="40" fontWeight="bold" textAnchor="middle">?</text>
    </svg>
  );
}

export default function ExerciseModal({
  isOpen,
  onClose,
  currentSqlQuery,
  activeExerciseId,
  setActiveExerciseId,
  onLoadExerciseSql,
  targetSuspect,
  onDrawNewSuspect
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
        if (activeExerciseId === "suspeito") {
          const userResult = result.data || [];
          if (userResult.length === 0) {
            setValidation({
              solved: false,
              message: "A sua consulta retornou zero suspeitos! Revise os parâmetros de filtro na cláusula WHERE."
            });
          } else if (userResult.length > 1) {
            setValidation({
              solved: false,
              message: `Sua query retornou múltiplos suspeitos (${userResult.length} encontrados). Continue filtrando os atributos para isolar o culpado exato!`
            });
          } else {
            const matched = userResult[0];
            const isTarget = targetSuspect && (
              matched.id === targetSuspect.id ||
              (matched.nome && matched.nome.toLowerCase() === targetSuspect.nome.toLowerCase()) ||
              Object.keys(matched).every(key => {
                const lowerKey = key.toLowerCase();
                if (targetSuspect[lowerKey] !== undefined) {
                  return String(matched[key]).toLowerCase() === String(targetSuspect[lowerKey]).toLowerCase();
                }
                return true;
              })
            );

            if (isTarget && targetSuspect) {
              setValidation({
                solved: true,
                message: `Detetive primoroso! Você identificou corretamente o suspeito "${targetSuspect.nome}", o verdadeiro culpado do crime! Caso encerrado!`
              });
            } else {
              setValidation({
                solved: false,
                message: `Suspeito incorreto! Você deteve ${matched.nome || 'outro suspeito'}. Verifique as pistas e tente novamente.`
              });
            }
          }
        } else {
          const val = verifySolution(activeExerciseId, result.data || []);
          setValidation(val);
        }
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

    const headers = Object.keys(data[0]).filter(h => h.toLowerCase() !== "imagem");

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
              {activeExerciseId === "suspeito" && targetSuspect ? (
                <div className="text-slate-300 text-xs leading-relaxed font-sans mt-2 space-y-1.5">
                  <p className="text-slate-200 font-semibold mb-2">
                    🚨 Atenção, detetive! Um crime foi cometido e temos as seguintes pistas sobre o culpado:
                  </p>
                  <ul className="grid grid-cols-2 gap-2 bg-[#05070c]/50 p-3 rounded-lg border border-slate-850">
                    <li className="flex gap-2 text-xs font-mono">
                      <span className="text-slate-400">Sexo:</span>
                      <strong className="text-amber-300 capitalize">{targetSuspect.sexo}</strong>
                    </li>
                    <li className="flex gap-2 text-xs font-mono">
                      <span className="text-slate-400">Pele:</span>
                      <strong className="text-amber-300 capitalize">{targetSuspect.pele}</strong>
                    </li>
                    <li className="flex gap-2 text-xs font-mono">
                      <span className="text-slate-400">Olhar:</span>
                      <strong className="text-amber-300 capitalize">{targetSuspect.olhar}</strong>
                    </li>
                    <li className="flex gap-2 text-xs font-mono">
                      <span className="text-slate-400">Cabelo:</span>
                      <strong className="text-amber-300 capitalize">{targetSuspect.tamanho_cabelo} ({targetSuspect.cor_cabelo})</strong>
                    </li>
                    <li className="flex gap-2 text-xs font-mono">
                      <span className="text-slate-400">Bigode:</span>
                      <strong className="text-amber-300 capitalize">{targetSuspect.bigode}</strong>
                    </li>
                    <li className="flex gap-2 text-xs font-mono">
                      <span className="text-slate-400">Barba:</span>
                      <strong className="text-amber-300 capitalize">{targetSuspect.barba}</strong>
                    </li>
                  </ul>
                  <p className="text-slate-400 text-[10px] mt-2 italic leading-relaxed">
                    Escreva uma query na tabela <code className="text-amber-400 font-mono font-semibold">suspeitos</code>. O retrato falado se formará se você selecionar e filtrar os atributos corretos na query!
                  </p>
                </div>
              ) : (
                <p className="text-slate-300 text-xs leading-relaxed font-sans mt-2">
                  {selectedExercise.description}
                </p>
              )}
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
                ) : activeExerciseId === "suspeito" ? (
                  <div className="flex flex-col md:flex-row gap-5 items-stretch">
                    {/* Retrato Falado panel */}
                    <div className="w-full md:w-1/3 bg-[#05070c]/50 rounded-xl border border-slate-850 p-4 flex flex-col justify-center items-center gap-3.5">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-mono">
                        Composite Retrato Falado
                      </span>
                      <div className="bg-[#030408] p-1.5 rounded-xl border border-slate-900 shadow-inner flex items-center justify-center">
                        <SuspectAvatar row={executionResult[0]} />
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono text-center">
                        {executionResult.length > 0 
                          ? `Exibindo atributos: ${executionResult[0].nome || 'Encontrado'}`
                          : "Configure a query para revelar"}
                      </div>
                    </div>
                    {/* Records visualizer */}
                    <div className="flex-1 md:w-2/3 flex flex-col justify-between overflow-x-auto select-none">
                      {renderTableData(executionResult)}
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
                <div className="w-full flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-extrabold flex items-center gap-1 text-emerald-400 text-xs uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                        Status: Desafio Concluído com Sucesso!
                      </div>
                      <p className="mt-1 leading-relaxed text-slate-200 font-medium">{validation.message}</p>
                    </div>
                  </div>
                  {activeExerciseId === "suspeito" && (
                    <button
                      onClick={() => {
                        onDrawNewSuspect?.();
                        setValidation(null);
                        setExecutionResult(null);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg active:scale-95 cursor-pointer max-w-xs animate-pulse"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-current text-slate-950" />
                      <span>Sorteie Novo Caso 🔍</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-extrabold text-rose-400 text-xs uppercase tracking-wider">
                        Status: Resposta Incorreta
                      </div>
                      <p className="mt-1 leading-relaxed text-slate-200 font-medium">{validation.message}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      let correctQuery = selectedExercise.query;
                      if (activeExerciseId === "suspeito" && targetSuspect) {
                        correctQuery = `SELECT * FROM suspeitos WHERE sexo = '${targetSuspect.sexo}' AND pele = '${targetSuspect.pele}' AND expressao = '${targetSuspect.expressao}' AND tamanho_cabelo = '${targetSuspect.tamanho_cabelo}' AND cor_cabelo = '${targetSuspect.cor_cabelo}' AND bigode = '${targetSuspect.bigode}' AND barba = '${targetSuspect.barba}'`;
                      }
                      onLoadExerciseSql(correctQuery);
                      onClose();
                    }}
                    className="px-4 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-350 hover:text-rose-250 border border-rose-500/30 text-xs font-bold rounded-xl transition-all shadow-md shrink-0 cursor-pointer self-end md:self-center"
                  >
                    Desistir e ver a resposta
                  </button>
                </div>
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
