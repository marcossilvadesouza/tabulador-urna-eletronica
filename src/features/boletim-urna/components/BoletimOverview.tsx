import React from 'react';
import { BoletimUrnaData } from '../types';
import { StatCard, Badge, Card } from '@/components/ui/Card';
import {
  Users,
  Vote,
  Fingerprint,
  Clock,
  ShieldCheck,
  MapPin,
  Cpu,
  FileCheck2,
} from 'lucide-react';

export function BoletimOverview({ data }: { data: BoletimUrnaData }) {
  return (
    <div className="space-y-6">
      {/* Top Banner with Section Details */}
      <div className="bg-gradient-to-r from-[#0c234b] via-[#102d5e] to-[#0c234b] border border-blue-600/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30">
                <FileCheck2 className="w-6 h-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white tracking-wide">
                    Boletim de Urna Oficial
                  </h2>
                  <Badge variant="success">Totalizada</Badge>
                  <Badge variant="primary">Arquivo Decodificado (ASN.1)</Badge>
                </div>
                <p className="text-sm text-slate-300 mt-0.5">
                  Município: <strong className="text-white">{data.secao.municipioNome} ({data.secao.municipioCodigo})</strong> &bull; UF: <strong className="text-white">{data.secao.uf}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[#081528]/80 px-4 py-2.5 rounded-xl border border-blue-900/50">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <div className="text-xs">
              <div className="text-slate-400">Urna Eletrônica</div>
              <div className="font-mono font-bold text-emerald-300 text-sm">
                UE {data.urna.codigoIdentificacaoUE}
              </div>
            </div>
          </div>
        </div>

        {/* Section Quick Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-blue-800/40 text-sm">
          <div>
            <span className="text-slate-400 text-xs block">Zona Eleitoral</span>
            <span className="text-white font-semibold text-base font-mono">{data.secao.zonaFormatada}</span>
          </div>
          <div>
            <span className="text-slate-400 text-xs block">Seção Eleitoral</span>
            <span className="text-white font-semibold text-base font-mono">{data.secao.secaoFormatada}</span>
          </div>
          <div>
            <span className="text-slate-400 text-xs block">Local de Votação</span>
            <span className="text-white font-semibold text-base font-mono">{data.secao.localVotacao}</span>
          </div>
          <div>
            <span className="text-slate-400 text-xs block">Código do Pleito</span>
            <span className="text-white font-semibold text-base font-mono">{data.cabecalho.codigoPleito}</span>
          </div>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Eleitores Aptos"
          value={data.votacao.eleitoresAptos}
          description="Total cadastrado na folha de votação"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Comparecimento"
          value={data.votacao.comparecimento}
          trend={`${data.votacao.percentualComparecimento}%`}
          description="Eleitores que votaram nesta urna"
          icon={<Vote className="w-5 h-5 text-emerald-400" />}
        />
        <StatCard
          title="Abstenção (Faltosos)"
          value={data.votacao.faltosos}
          trend={`${data.votacao.percentualAbstencao}%`}
          description="Eleitores que não compareceram"
          icon={<Clock className="w-5 h-5 text-amber-400" />}
        />
        <StatCard
          title="Biometria Efetivada"
          value={data.votacao.habilitacaoBiometrica}
          trend={`${((data.votacao.habilitacaoBiometrica / data.votacao.comparecimento) * 100).toFixed(1)}%`}
          description="Habilitados via impressão digital"
          icon={<Fingerprint className="w-5 h-5 text-cyan-400" />}
        />
      </div>

      {/* Technical Metadata Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Identificação da Carga e Hardware" className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#091322] p-3 rounded-lg border border-[#1b2f4c]">
              <span className="text-slate-400 block mb-1">Código de Carga da Urna:</span>
              <span className="font-mono text-amber-300 font-semibold break-all text-xs">
                {data.urna.codigoCargaFormatado}
              </span>
            </div>
            <div className="bg-[#091322] p-3 rounded-lg border border-[#1b2f4c]">
              <span className="text-slate-400 block mb-1">Resumo da Correspondência:</span>
              <span className="font-mono text-cyan-300 font-bold text-sm">
                {data.urna.resumoCorrespondencia}
              </span>
            </div>
            <div className="bg-[#091322] p-3 rounded-lg border border-[#1b2f4c]">
              <span className="text-slate-400 block mb-1">Versão do Software Oficial:</span>
              <span className="text-white font-medium">
                {data.urna.versaoSoftware}
              </span>
            </div>
            <div className="bg-[#091322] p-3 rounded-lg border border-[#1b2f4c]">
              <span className="text-slate-400 block mb-1">Data/Hora da Carga da Urna:</span>
              <span className="text-slate-200 font-mono">
                {data.urna.dataHoraCargaFormatada}
              </span>
            </div>
          </div>
        </Card>

        <Card title="Habilitação dos Eleitores">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Biometria:</span>
                <span className="text-cyan-400 font-mono font-bold">
                  {data.votacao.habilitacaoBiometrica} ({((data.votacao.habilitacaoBiometrica / data.votacao.comparecimento) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-cyan-500 h-2 rounded-full"
                  style={{ width: `${(data.votacao.habilitacaoBiometrica / data.votacao.comparecimento) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Habilitação Biográfica:</span>
                <span className="text-amber-400 font-mono font-bold">
                  {data.votacao.habilitacaoBiografica} ({((data.votacao.habilitacaoBiografica / data.votacao.comparecimento) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full"
                  style={{ width: `${(data.votacao.habilitacaoBiografica / data.votacao.comparecimento) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Sem Biometria:</span>
                <span className="text-slate-400 font-mono font-bold">
                  {data.votacao.habilitacaoSemBiometria} ({((data.votacao.habilitacaoSemBiometria / data.votacao.comparecimento) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-slate-500 h-2 rounded-full"
                  style={{ width: `${(data.votacao.habilitacaoSemBiometria / data.votacao.comparecimento) * 100}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Habilitados:</span>
              <span className="text-white font-mono font-bold">{data.votacao.comparecimento}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
