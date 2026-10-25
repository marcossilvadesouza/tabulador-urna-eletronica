import React from 'react';
import { LogAnalysisResult } from '../types';
import { StatCard, Card, Badge } from '@/components/ui/Card';
import { Activity, ShieldAlert, Cpu, CheckCircle2, Clock } from 'lucide-react';

export function LogMetrics({ logData }: { logData: LogAnalysisResult }) {
  const maxHourlyVotes = Math.max(...logData.fluxoPorHora.map((h) => h.votosRegistrados), 1);

  return (
    <div className="space-y-6">
      {/* High-level stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Eventos Registrados"
          value={logData.totalLinhas.toLocaleString('pt-BR')}
          description="Linhas de auditoria no logd.dat"
          icon={<Activity className="w-5 h-5 text-blue-400" />}
        />
        <StatCard
          title="Alertas Registrados"
          value={logData.contagemPorNivel['ALERTA'] || 0}
          description="Tentativas ou avisos operacionais"
          icon={<ShieldAlert className="w-5 h-5 text-amber-400" />}
        />
        <StatCard
          title="Módulo de Votação (VOTA)"
          value={(logData.contagemPorModulo['VOTA'] || 0).toLocaleString('pt-BR')}
          description="Operações de votação de eleitores"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
        />
        <StatCard
          title="Período Registrado"
          value="21/09 a 04/10"
          description="Da carga oficial até apuração"
          icon={<Clock className="w-5 h-5 text-cyan-400" />}
        />
      </div>

      {/* Hourly Flow Chart & Module Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Flow */}
        <Card
          title="Fluxo de Votação por Hora (04/10/2026)"
          subtitle="Distribuição dos 278 eleitores ao longo do dia da eleição"
          className="lg:col-span-2"
        >
          <div className="h-44 flex items-end gap-2 pt-6 pb-2 px-2">
            {logData.fluxoPorHora.map((item) => {
              const heightPct = Math.round((item.votosRegistrados / maxHourlyVotes) * 100);
              return (
                <div key={item.hora} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-900 border border-slate-700 text-white text-[11px] px-2 py-1 rounded shadow-lg pointer-events-none z-10 whitespace-nowrap">
                    {item.hora}: <strong>{item.votosRegistrados} eleitores</strong>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 font-semibold">
                    {item.votosRegistrados > 0 ? item.votosRegistrados : ''}
                  </span>

                  <div className="w-full bg-slate-800/80 rounded-t-md overflow-hidden flex items-end h-28">
                    <div
                      className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-md transition-all duration-500 group-hover:brightness-125"
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                    />
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 mt-1">{item.hora.slice(0, 2)}h</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Modules Breakdown */}
        <Card title="Distribuição por Módulo da Urna" subtitle="Componentes de software do TSE">
          <div className="space-y-3">
            {Object.entries(logData.contagemPorModulo)
              .sort((a, b) => b[1] - a[1])
              .map(([mod, count]) => {
                const pct = ((count / logData.totalLinhas) * 100).toFixed(1);
                return (
                  <div key={mod}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-mono font-bold text-slate-200">{mod}</span>
                      <span className="text-slate-400 font-mono">
                        {count.toLocaleString('pt-BR')} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>
    </div>
  );
}
