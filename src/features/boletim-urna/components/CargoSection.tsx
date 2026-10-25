import React, { useState } from 'react';
import { CargoApuracao } from '../types';
import { CandidateCard } from './CandidateCard';
import { VoteDistributionChart } from './VoteDistributionChart';
import { Card, Badge } from '@/components/ui/Card';
import { Search, Trophy, Building2, ListFilter } from 'lucide-react';

export function CargoSection({ cargo }: { cargo: CargoApuracao }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'CANDIDATOS' | 'PARTIDOS'>('CANDIDATOS');

  const filteredCandidatos = cargo.candidatos.filter(
    (c) =>
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.numero.includes(searchTerm) ||
      c.partidoNome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPartidos = cargo.partidos.filter(
    (p) =>
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.numero.includes(searchTerm)
  );

  const maxVotes = cargo.candidatos[0]?.votos || 1;

  return (
    <div className="space-y-6">
      {/* Cargo Header Card */}
      <div className="bg-[#0f1d32] border border-[#1e3557] rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white tracking-wide">{cargo.cargoNome}</h3>
            <Badge variant="primary">{cargo.eleicaoNome}</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Total apurado: <strong className="text-white font-mono">{cargo.totalApurado} votos</strong> &bull; Votos Válidos:{' '}
            <strong className="text-emerald-400 font-mono">{cargo.totalValidos}</strong>
          </p>
        </div>

        {/* View Switcher & Search */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-700/60">
            <button
              onClick={() => setViewMode('CANDIDATOS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'CANDIDATOS'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Candidatos ({cargo.candidatos.length})
            </button>
            <button
              onClick={() => setViewMode('PARTIDOS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'PARTIDOS'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Partidos ({cargo.partidos.length})
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nome, número ou partido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-[#091322] border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-60"
            />
          </div>
        </div>
      </div>

      {/* Composition Chart */}
      <VoteDistributionChart cargo={cargo} />

      {/* Content depending on View Mode */}
      {viewMode === 'CANDIDATOS' ? (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredCandidatos.map((cand, index) => (
              <CandidateCard
                key={cand.numero}
                candidato={cand}
                rank={index + 1}
                maxVotes={maxVotes}
              />
            ))}
          </div>
          {filteredCandidatos.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">
              Nenhum candidato encontrado com o termo "{searchTerm}".
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPartidos.map((partido) => (
            <div
              key={partido.numero}
              className="bg-[#0b1626] border border-[#1e3557] rounded-xl p-4 hover:border-blue-500/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-950 text-blue-300 font-mono font-bold flex items-center justify-center text-xs border border-blue-800">
                    {partido.numero}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white">{partido.nome}</h4>
                    <span className="text-xs text-slate-400">
                      Votos Nominais: <strong className="text-slate-200">{partido.votosNominais}</strong> &bull; Votos de Legenda:{' '}
                      <strong className="text-slate-200">{partido.votosLegenda}</strong>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-bold text-white font-mono">{partido.totalVotos} votos</span>
                  <span className="text-xs text-slate-400 block">
                    {cargo.totalValidos > 0 ? ((partido.totalVotos / cargo.totalValidos) * 100).toFixed(1) : 0}% dos válidos
                  </span>
                </div>
              </div>

              {/* Candidates inside this party */}
              {partido.candidatos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {partido.candidatos.map((c) => (
                    <div
                      key={c.numero}
                      className="bg-[#08121f] p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="font-mono font-bold text-blue-400 mr-1.5">{c.numero}</span>
                        <span className="text-slate-200">{c.nome}</span>
                      </div>
                      <span className="font-mono font-bold text-white whitespace-nowrap">{c.votos} votos</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic">Apenas votos de legenda registrados neste partido.</div>
              )}
            </div>
          ))}
          {filteredPartidos.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">
              Nenhum partido encontrado com o termo "{searchTerm}".
            </div>
          )}
        </div>
      )}
    </div>
  );
}
