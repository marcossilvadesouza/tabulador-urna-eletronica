import React, { useState } from 'react';
import { ResultadoConsolidadoData } from '../types';
import { CargoApuracao } from '../../boletim-urna/types';
import { CargoSection } from '../../boletim-urna/components/CargoSection';
import { StatCard, Card, Badge } from '@/components/ui/Card';
import {
  Vote,
  Users,
  Clock,
  Fingerprint,
  Layers,
  MapPin,
  CheckCircle2,
  Trophy,
} from 'lucide-react';

export function ResultadoConsolidadoView({
  consolidado,
}: {
  consolidado: ResultadoConsolidadoData;
}) {
  const [selectedCargoId, setSelectedCargoId] = useState<number>(1); // Presidente by default

  const currentCargo: CargoApuracao | undefined =
    consolidado.cargos.find((c) => c.cargoId === selectedCargoId) ||
    consolidado.cargos[0];

  return (
    <div className="space-y-6">
      {/* Top Banner: Totalized Election Results */}
      <div className="bg-gradient-to-r from-[#0d2854] via-[#0f346c] to-[#0a1f3d] border border-blue-500/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400/10 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30">
                <Trophy className="w-7 h-7 text-amber-400" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white tracking-wide">
                    Resultado Consolidado da Eleição
                  </h2>
                  <Badge variant="success">Totalização Oficial</Badge>
                  <Badge variant="primary">{consolidado.turnoNome}</Badge>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Soma de votos de todas as zonas e seções importadas no sistema
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[#081528]/80 px-4 py-2.5 rounded-xl border border-blue-900/50">
            <Layers className="w-5 h-5 text-cyan-400" />
            <div className="text-xs">
              <div className="text-slate-400">Seções Totalizadas</div>
              <div className="font-mono font-bold text-cyan-300 text-sm">
                {consolidado.totalSecoesApuradas} {consolidado.totalSecoesApuradas === 1 ? 'Seção' : 'Seções'} (100%)
              </div>
            </div>
          </div>
        </div>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-5 border-t border-blue-800/40">
          <StatCard
            title="Total de Eleitores Aptos"
            value={consolidado.totalEleitoresAptos.toLocaleString('pt-BR')}
            description="Cadastrados nas seções importadas"
            icon={<Users className="w-5 h-5 text-blue-400" />}
          />
          <StatCard
            title="Total de Comparecimento"
            value={consolidado.totalComparecimento.toLocaleString('pt-BR')}
            trend={`${consolidado.percentualComparecimento}%`}
            description="Votos computados nas urnas"
            icon={<Vote className="w-5 h-5 text-emerald-400" />}
          />
          <StatCard
            title="Total de Abstenção"
            value={consolidado.totalFaltosos.toLocaleString('pt-BR')}
            trend={`${consolidado.percentualAbstencao}%`}
            description="Eleitores que não votaram"
            icon={<Clock className="w-5 h-5 text-amber-400" />}
          />
          <StatCard
            title="Biometrias Consolidadas"
            value={consolidado.habilitacaoBiometrica.toLocaleString('pt-BR')}
            trend={`${((consolidado.habilitacaoBiometrica / (consolidado.totalComparecimento || 1)) * 100).toFixed(1)}%`}
            description="Habilitações biométricas"
            icon={<Fingerprint className="w-5 h-5 text-cyan-400" />}
          />
        </div>
      </div>

      {/* Sections Included in this Totalization */}
      <Card
        title="Seções Eleitorais Computadas nesta Totalização"
        subtitle={`${consolidado.secoes.length} seções compõem este resultado consolidado`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {consolidado.secoes.map((sec, idx) => (
            <div
              key={`${sec.zona}_${sec.secao}`}
              className="bg-[#091322] border border-[#1b2f4c] rounded-xl p-3 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-blue-950 text-blue-300 border border-blue-800">
                  <MapPin className="w-4 h-4" />
                </span>
                <div>
                  <div className="font-bold text-white font-mono">
                    Zona {sec.zona} &bull; Seção {sec.secao}
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    {sec.municipioNome} ({sec.uf}) &bull; UE {sec.codigoIdentificacaoUE}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="font-mono font-bold text-emerald-400 block">
                  {sec.comparecimento} votos
                </span>
                <span className="text-[10px] text-slate-500">
                  de {sec.eleitoresAptos} aptos ({sec.percentualComparecimento}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Cargo Navigation Pills */}
      <div className="flex flex-wrap gap-2">
        {consolidado.cargos.map((cargo) => (
          <button
            key={cargo.cargoId}
            onClick={() => setSelectedCargoId(cargo.cargoId)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2 ${
              selectedCargoId === cargo.cargoId
                ? 'bg-blue-600 text-white shadow-blue-500/20'
                : 'bg-[#0f1d32] border border-[#1e3557] text-slate-400 hover:text-white hover:border-slate-600'
            }`}
          >
            <span>{cargo.cargoNome}</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                selectedCargoId === cargo.cargoId ? 'bg-blue-800 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {cargo.totalApurado} votos
            </span>
          </button>
        ))}
      </div>

      {/* Selected Cargo Section */}
      {currentCargo && <CargoSection cargo={currentCargo} />}
    </div>
  );
}
