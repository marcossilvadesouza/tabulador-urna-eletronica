import React, { useState, useMemo } from 'react';
import { LogEntry } from '../types';
import { Search, Filter, ShieldCheck, Download, Copy, Check } from 'lucide-react';
import { Badge } from '@/components/ui/Card';

export function LogViewer({
  initialLines,
  totalLinhas,
}: {
  initialLines: LogEntry[];
  totalLinhas: number;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('TODOS');
  const [selectedLevel, setSelectedLevel] = useState('TODOS');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const pageSize = 50;

  const modules = ['TODOS', 'VOTA', 'GAP', 'SCUE', 'ATUE', 'LOGD', 'INITJE'];
  const levels = ['TODOS', 'INFO', 'ALERTA'];

  const filtered = useMemo(() => {
    return initialLines.filter((l) => {
      if (selectedModule !== 'TODOS' && l.modulo !== selectedModule) return false;
      if (selectedLevel !== 'TODOS' && l.nivel !== selectedLevel) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          l.mensagem.toLowerCase().includes(q) ||
          l.dataHora.includes(q) ||
          l.modulo.toLowerCase().includes(q) ||
          l.hash.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [initialLines, selectedModule, selectedLevel, searchTerm]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="bg-[#0f1d32] border border-[#1e3557] rounded-xl shadow-lg overflow-hidden">
      {/* Filter Header */}
      <div className="p-5 border-b border-[#1e3557] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              Explorador de Linhas de Log (logd.dat)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Exibindo {filtered.length.toLocaleString('pt-BR')} de {totalLinhas.toLocaleString('pt-BR')} registros
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar em mensagens, módulos, horários..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-3 py-1.5 bg-[#091322] border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-full sm:w-72"
            />
          </div>
        </div>

        {/* Filters pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
          <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Módulo:
          </span>
          {modules.map((m) => (
            <button
              key={m}
              onClick={() => {
                setSelectedModule(m);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
                selectedModule === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}

          <span className="text-xs text-slate-400 ml-3 mr-1">Nível:</span>
          {levels.map((lvl) => (
            <button
              key={lvl}
              onClick={() => {
                setSelectedLevel(lvl);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
                selectedLevel === lvl
                  ? lvl === 'ALERTA'
                    ? 'bg-amber-600 text-white'
                    : 'bg-blue-600 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Table of logs */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#0a1424] text-slate-400 uppercase font-mono text-[11px] border-b border-[#1e3557]">
            <tr>
              <th className="py-3 px-4 w-16"># Linha</th>
              <th className="py-3 px-4 w-44">Data / Hora</th>
              <th className="py-3 px-4 w-20">Nível</th>
              <th className="py-3 px-4 w-24">Módulo</th>
              <th className="py-3 px-4">Mensagem de Auditoria</th>
              <th className="py-3 px-4 w-36">Hash Criptográfico</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {paginated.map((l) => (
              <tr key={l.id} className="hover:bg-blue-950/20 transition-colors">
                <td className="py-2.5 px-4 text-slate-500 font-semibold">{l.id}</td>
                <td className="py-2.5 px-4 text-slate-300 whitespace-nowrap">{l.dataHora}</td>
                <td className="py-2.5 px-4">
                  <Badge variant={l.nivel === 'ALERTA' ? 'warning' : 'primary'}>
                    {l.nivel}
                  </Badge>
                </td>
                <td className="py-2.5 px-4">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold border border-slate-700">
                    {l.modulo}
                  </span>
                </td>
                <td className="py-2.5 px-4 font-sans text-white text-xs">{l.mensagem}</td>
                <td className="py-2.5 px-4">
                  {l.hash ? (
                    <button
                      onClick={() => handleCopy(l.hash)}
                      className="group flex items-center gap-1.5 text-slate-400 hover:text-cyan-300 transition-colors"
                      title="Copiar hash de integridade"
                    >
                      <span className="truncate max-w-[90px]">{l.hash}</span>
                      {copiedHash === l.hash ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 shrink-0" />
                      )}
                    </button>
                  ) : (
                    <span className="text-slate-600">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-[#1e3557] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          Página <strong className="text-white">{currentPage}</strong> de <strong className="text-white">{totalPages}</strong>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
          >
            Anterior
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
