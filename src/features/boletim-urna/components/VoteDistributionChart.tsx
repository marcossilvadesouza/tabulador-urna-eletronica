import React from 'react';
import { CargoApuracao } from '../types';

export function VoteDistributionChart({ cargo }: { cargo: CargoApuracao }) {
  const nomPct = cargo.totalApurado > 0 ? ((cargo.votosNominais / cargo.totalApurado) * 100).toFixed(1) : '0';
  const legPct = cargo.totalApurado > 0 ? ((cargo.votosLegenda / cargo.totalApurado) * 100).toFixed(1) : '0';
  const brPct = cargo.totalApurado > 0 ? ((cargo.votosBrancos / cargo.totalApurado) * 100).toFixed(1) : '0';
  const nlPct = cargo.totalApurado > 0 ? ((cargo.votosNulos / cargo.totalApurado) * 100).toFixed(1) : '0';

  return (
    <div className="bg-[#0b1626] border border-[#1b2f4c] rounded-xl p-4 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-slate-300">Composição Geral dos Votos</span>
        <span className="text-slate-400 font-mono">Total Apurado: {cargo.totalApurado}</span>
      </div>

      {/* Multi-segment Progress Bar */}
      <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-900 border border-slate-700/50">
        {Number(nomPct) > 0 && (
          <div
            className="bg-blue-500 h-full transition-all duration-500"
            style={{ width: `${nomPct}%` }}
            title={`Votos Nominais: ${cargo.votosNominais} (${nomPct}%)`}
          />
        )}
        {Number(legPct) > 0 && (
          <div
            className="bg-indigo-400 h-full transition-all duration-500"
            style={{ width: `${legPct}%` }}
            title={`Votos Legenda: ${cargo.votosLegenda} (${legPct}%)`}
          />
        )}
        {Number(brPct) > 0 && (
          <div
            className="bg-slate-400 h-full transition-all duration-500"
            style={{ width: `${brPct}%` }}
            title={`Votos em Branco: ${cargo.votosBrancos} (${brPct}%)`}
          />
        )}
        {Number(nlPct) > 0 && (
          <div
            className="bg-rose-500 h-full transition-all duration-500"
            style={{ width: `${nlPct}%` }}
            title={`Votos Nulos: ${cargo.votosNulos} (${nlPct}%)`}
          />
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
          <span className="text-slate-400">Nominais:</span>
          <strong className="text-white font-mono">{cargo.votosNominais} ({nomPct}%)</strong>
        </div>
        {cargo.votosLegenda > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-400 inline-block" />
            <span className="text-slate-400">Legenda:</span>
            <strong className="text-white font-mono">{cargo.votosLegenda} ({legPct}%)</strong>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-400 inline-block" />
          <span className="text-slate-400">Brancos:</span>
          <strong className="text-white font-mono">{cargo.votosBrancos} ({brPct}%)</strong>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
          <span className="text-slate-400">Nulos:</span>
          <strong className="text-white font-mono">{cargo.votosNulos} ({nlPct}%)</strong>
        </div>
      </div>
    </div>
  );
}
