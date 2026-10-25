import React from 'react';
import { CandidatoVotacao } from '../types';

export function CandidateCard({
  candidato,
  rank,
  maxVotes,
}: {
  candidato: CandidatoVotacao;
  rank: number;
  maxVotes: number;
}) {
  const relativePercent = maxVotes > 0 ? (candidato.votos / maxVotes) * 100 : 0;

  return (
    <div className="bg-[#0b1626] border border-[#1e3557] rounded-xl p-3.5 hover:border-blue-500/60 transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                rank === 1
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : rank === 2
                  ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
                  : rank === 3
                  ? 'bg-amber-700/20 text-amber-400 border border-amber-700/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {rank}º
            </span>
            <div>
              <span className="font-mono font-bold text-blue-400 text-base">{candidato.numero}</span>
              <h4 className="text-sm font-semibold text-white tracking-wide leading-tight line-clamp-1">
                {candidato.nome}
              </h4>
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg font-bold text-white font-mono">{candidato.votos}</div>
            <div className="text-xs text-slate-400">{candidato.percentualValidos}% válidos</div>
          </div>
        </div>

        <div className="mt-2 text-xs text-slate-400 truncate">
          Partido: <span className="text-slate-300 font-medium">{candidato.partidoNumero} - {candidato.partidoNome}</span>
        </div>
      </div>

      {/* Relative visual bar */}
      <div className="mt-3">
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full rounded-full transition-all duration-300"
            style={{ width: `${relativePercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
