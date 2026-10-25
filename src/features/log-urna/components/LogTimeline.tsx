import React from 'react';
import { LogMilestone } from '../types';
import {
  Clock,
  ShieldCheck,
  FileText,
  KeyRound,
  FileCheck,
  Flame,
  CheckCircle,
} from 'lucide-react';

const ICONS: Record<string, any> = {
  CARGA: KeyRound,
  BOOT: Flame,
  ZERESIMA: FileCheck,
  ABERTURA: Clock,
  ENCERRAMENTO: CheckCircle,
  BU_IMPRESSO: FileText,
  GERACAO_ARQUIVOS: ShieldCheck,
};

export function LogTimeline({ milestones }: { milestones: LogMilestone[] }) {
  return (
    <div className="bg-[#0f1d32] border border-[#1e3557] rounded-xl p-6 shadow-lg">
      <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-400" />
        Linha do Tempo dos Marcos Operacionais da Urna
      </h3>

      <div className="relative pl-6 border-l-2 border-blue-600/40 space-y-8 ml-3">
        {milestones.map((m, idx) => {
          const IconComp = ICONS[m.tipo] || Clock;
          return (
            <div key={idx} className="relative group">
              {/* Dot Icon */}
              <div className="absolute -left-[35px] top-0.5 w-7 h-7 rounded-full bg-[#0c234b] border-2 border-blue-500 flex items-center justify-center text-blue-300 group-hover:scale-110 group-hover:border-cyan-400 transition-all shadow-md">
                <IconComp className="w-3.5 h-3.5" />
              </div>

              <div className="bg-[#0b1626] border border-[#1b2f4c] rounded-xl p-4 group-hover:border-blue-500/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <h4 className="text-sm font-bold text-white tracking-wide">{m.titulo}</h4>
                  <span className="font-mono text-xs text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-800/40 self-start sm:self-auto">
                    {m.dataHora}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{m.descricao}</p>
                <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-3 font-mono">
                  <span>Módulo: <strong>{m.modulo}</strong></span>
                  <span>Linha #{m.logLineId}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
