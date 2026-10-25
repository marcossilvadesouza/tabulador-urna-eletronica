import React, { useState } from 'react';
import { RelatorioAuditoria, ItemAuditoria } from '../types';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Check,
  Search,
  Calculator,
  Binary,
  Clock,
  Layers,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { Badge, StatCard } from '@/components/ui/Card';

export function PdfReconciliationView({
  relatorio,
}: {
  relatorio: RelatorioAuditoria;
}) {
  const [filterCategory, setFilterCategory] = useState<string>('TODOS');
  const [onlyInconsistencies, setOnlyInconsistencies] = useState(false);
  const [search, setSearch] = useState('');

  const categories = [
    { id: 'TODOS', label: 'Todas as Regras', count: relatorio.itens.length },
    {
      id: 'ELEITORES',
      label: 'Eleitores & Comparecimento',
      count: relatorio.itens.filter((i) => i.categoria === 'ELEITORES').length,
    },
    {
      id: 'CARGOS',
      label: 'Apuração dos Cargos',
      count: relatorio.itens.filter((i) => i.categoria === 'CARGOS').length,
    },
    {
      id: 'LOG_OPERACIONAL',
      label: 'Cruzamento BU vs Log',
      count: relatorio.itens.filter((i) => i.categoria === 'LOG_OPERACIONAL').length,
    },
    {
      id: 'CRONOLOGIA',
      label: 'Cronologia & Horários',
      count: relatorio.itens.filter((i) => i.categoria === 'CRONOLOGIA').length,
    },
    {
      id: 'INTEGRIDADE_CARGA',
      label: 'Integridade da Carga & Urna',
      count: relatorio.itens.filter((i) => i.categoria === 'INTEGRIDADE_CARGA').length,
    },
  ];

  const filteredItens = relatorio.itens.filter((item) => {
    if (onlyInconsistencies && item.status === 'CORRETO') return false;
    if (filterCategory !== 'TODOS' && item.categoria !== filterCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.campo.toLowerCase().includes(q) ||
        item.regraAplicada.toLowerCase().includes(q) ||
        String(item.valorExtraidoBU).toLowerCase().includes(q) ||
        String(item.valorEsperadoCalculado).toLowerCase().includes(q) ||
        (item.observacao && item.observacao.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const temDivergencia = relatorio.totalDivergencias > 0;

  return (
    <div className="space-y-6">
      {/* Top Banner de Auditoria e Consistência */}
      <div
        className={`bg-gradient-to-r ${
          temDivergencia
            ? 'from-rose-950/70 via-[#1e0f18] to-[#0c1f38] border-rose-500/50'
            : 'from-emerald-950/60 via-[#0a2335] to-[#0c1f38] border-emerald-500/40'
        } border rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors`}
      >
        <div>
          <div className="flex items-center gap-3">
            <span
              className={`p-2.5 rounded-xl border ${
                temDivergencia
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {temDivergencia ? (
                <AlertTriangle className="w-7 h-7" />
              ) : (
                <ShieldCheck className="w-7 h-7" />
              )}
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Auditoria de Consistência e Regras Matemáticas
                </h2>
                {temDivergencia ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-900/80 text-rose-200 border border-rose-600 animate-pulse">
                    {relatorio.totalDivergencias} Inconsistência(s)
                  </span>
                ) : (
                  <Badge variant="success">100% Consistente</Badge>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Verificação automatizada sem depender de relatórios externos: validação das equações de eleitorado, balanço de votos por cargo, integridade criptográfica e cruzamento unitário com o log operacional.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 bg-[#081524]/90 px-6 py-3.5 rounded-xl border border-slate-700/60 shrink-0">
          <div className="text-center">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Score de Integridade
            </div>
            <div
              className={`text-3xl font-extrabold font-mono ${
                relatorio.scoreConformidade === 100
                  ? 'text-emerald-400'
                  : relatorio.scoreConformidade >= 90
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {relatorio.scoreConformidade}%
            </div>
          </div>
          <div className="h-10 w-px bg-slate-700" />
          <div className="text-xs text-slate-300 space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">Regras Conformes:</span>
              <strong className="text-emerald-400 font-mono">{relatorio.totalConformes}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">Inconsistências:</span>
              <strong
                className={`font-mono ${
                  relatorio.totalDivergencias > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'
                }`}
              >
                {relatorio.totalDivergencias}
              </strong>
            </div>
            {relatorio.totalAvisos > 0 && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Avisos / Pendências:</span>
                <strong className="text-amber-400 font-mono">{relatorio.totalAvisos}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 Cards de Resumo dos Motores de Auditoria */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Regras Matemáticas"
          value={`${relatorio.resumoRegras?.matematicas.conformes || 0} / ${relatorio.resumoRegras?.matematicas.total || 0}`}
          description={
            relatorio.resumoRegras?.matematicas.divergentes === 0
              ? 'Todas as equações fecham sem sobra'
              : `${relatorio.resumoRegras?.matematicas.divergentes} divergência(s) matemática(s)`
          }
          icon={<Calculator className="w-5 h-5 text-blue-400" />}
        />

        <StatCard
          title="Cruzamento com Log (.jez)"
          value={
            relatorio.reconciliacaoLogUrna.logPresente
              ? `${relatorio.reconciliacaoLogUrna.comparecimentoVersusLog.eleitoresComputadosLog} votos`
              : 'Log Não Importado'
          }
          description={
            relatorio.reconciliacaoLogUrna.logPresente
              ? relatorio.reconciliacaoLogUrna.comparecimentoVersusLog.confere
                ? 'Eventos de voto conferem rigorosamente'
                : 'Divergência entre votos no log e BU'
              : 'Faça upload do .jez para cruzar'
          }
          icon={<Binary className="w-5 h-5 text-cyan-400" />}
        />

        <StatCard
          title="Cronologia da Seção"
          value={`${relatorio.resumoRegras?.cronologia.conformes || 0} / ${relatorio.resumoRegras?.cronologia.total || 0}`}
          description="Ordem temporal de abertura e encerramento"
          icon={<Clock className="w-5 h-5 text-indigo-400" />}
        />

        <StatCard
          title="Integridade da Carga"
          value={`${relatorio.resumoRegras?.integridade.conformes || 0} / ${relatorio.resumoRegras?.integridade.total || 0}`}
          description="Resumo de correspondência e chaves TSE"
          icon={<Layers className="w-5 h-5 text-emerald-400" />}
        />
      </div>

      {/* Área da Tabela de Regras e Filtros */}
      <div className="bg-[#0f1d32] border border-[#1e3557] rounded-xl shadow-lg p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Matriz de Regras e Verificações Analíticas
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              ({filteredItens.length} de {relatorio.totalVerificacoes} regras)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Botão de Toggle para Apenas Inconsistências */}
            <button
              onClick={() => setOnlyInconsistencies(!onlyInconsistencies)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                onlyInconsistencies
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Apenas Inconsistências</span>
              {relatorio.totalDivergencias > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-950 text-rose-200 text-[10px]">
                  {relatorio.totalDivergencias}
                </span>
              )}
            </button>

            {/* Input de Busca */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar regra, cargo, valor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-[#091322] border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-full sm:w-60"
              />
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                filterCategory === c.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{c.label}</span>
              <span className="text-[10px] opacity-75 font-mono">({c.count})</span>
            </button>
          ))}
        </div>

        {/* Tabela de Regras */}
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0a1424] text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Regra / Verificação</th>
                <th className="py-3 px-4">Critério de Validação</th>
                <th className="py-3 px-4">Valor Encontrado no BU (.dat)</th>
                <th className="py-3 px-4">Valor Esperado / Calculado</th>
                <th className="py-3 px-4 w-28 text-center">Status</th>
                <th className="py-3 px-4">Diagnóstico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredItens.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                    Nenhuma regra encontrada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredItens.map((item, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      item.status === 'DIVERGENTE'
                        ? 'bg-rose-950/30 hover:bg-rose-950/50'
                        : item.status === 'AVISO'
                        ? 'bg-amber-950/15 hover:bg-amber-950/25'
                        : 'hover:bg-blue-950/20'
                    }`}
                  >
                    {/* Campo / Regra */}
                    <td className="py-2.5 px-4 font-sans font-semibold text-white">
                      <div className="flex flex-col">
                        <span>{item.campo}</span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {item.tipoRegra} &bull; {item.severidade}
                        </span>
                      </div>
                    </td>

                    {/* Critério */}
                    <td className="py-2.5 px-4 font-sans text-slate-400 text-[11px] max-w-xs">
                      {item.regraAplicada}
                    </td>

                    {/* Valor Extraído */}
                    <td className="py-2.5 px-4 text-cyan-300 font-semibold">
                      {String(item.valorExtraidoBU)}
                    </td>

                    {/* Valor Esperado Calculado */}
                    <td className="py-2.5 px-4 text-emerald-300">
                      {String(item.valorEsperadoCalculado)}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-4 text-center">
                      {item.status === 'CORRETO' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700">
                          <Check className="w-3 h-3" /> Conforme
                        </span>
                      ) : item.status === 'AVISO' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950 text-amber-300 border border-amber-700">
                          <AlertCircle className="w-3 h-3" /> Aviso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950 text-rose-300 border border-rose-700 font-bold animate-pulse">
                          <AlertTriangle className="w-3 h-3" /> Inconsistente
                        </span>
                      )}
                    </td>

                    {/* Observação / Diagnóstico */}
                    <td className="py-2.5 px-4 font-sans text-slate-400 text-[11px] max-w-sm">
                      {item.observacao || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
