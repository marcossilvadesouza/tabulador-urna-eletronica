import React from 'react';
import { SecaoInfo } from '../types';
import { Layers, MapPin, Calendar, Check, AlertCircle } from 'lucide-react';

export function SecaoTurnoSelector({
  secoes,
  selectedZona,
  selectedSecao,
  selectedTurno,
  onSelectSecao,
  onSelectTurno,
  hideSecaoSelector = false,
}: {
  secoes: SecaoInfo[];
  selectedZona: string;
  selectedSecao: string;
  selectedTurno: 1 | 2;
  onSelectSecao: (zona: string, secao: string) => void;
  onSelectTurno: (turno: 1 | 2) => void;
  hideSecaoSelector?: boolean;
}) {
  const currentSecao = secoes.find(
    (s) => s.zona === selectedZona && s.secao === selectedSecao
  ) || secoes[0];

  const turno1Info = currentSecao?.turnosDisponiveis.find((t) => t.turno === 1);
  const turno2Info = currentSecao?.turnosDisponiveis.find((t) => t.turno === 2);

  const hasTurno1 = hideSecaoSelector
    ? secoes.some((s) => s.turnosDisponiveis.some((t) => t.turno === 1 && t.hasBoletim))
    : Boolean(turno1Info?.hasBoletim);

  const hasTurno2 = hideSecaoSelector
    ? secoes.some((s) => s.turnosDisponiveis.some((t) => t.turno === 2 && t.hasBoletim))
    : Boolean(turno2Info?.hasBoletim);

  return (
    <div className={`bg-[#0b1626] border border-[#1b2f4c] rounded-xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center ${hideSecaoSelector ? 'justify-between' : 'justify-between'} gap-4 shadow-md`}>
      {/* Section Selector (oculto na aba de consolidado) */}
      {!hideSecaoSelector ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="font-semibold uppercase tracking-wider text-[11px]">Seção / Zona:</span>
          </div>

          <select
            value={`${selectedZona}_${selectedSecao}`}
            onChange={(e) => {
              const [z, s] = e.target.value.split('_');
              onSelectSecao(z, s);
            }}
            className="bg-[#0f1d32] border border-blue-900/80 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
          >
            {secoes.map((s) => (
              <option key={`${s.zona}_${s.secao}`} value={`${s.zona}_${s.secao}`}>
                Zona {s.zona} &bull; Seção {s.secao} ({s.municipioNome})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
          <span className="font-semibold text-slate-200">Escopo:</span>
          <span>Todas as seções e zonas apuradas</span>
        </div>
      )}

      {/* Turno Switcher Navigation */}
      <div className="flex items-center gap-2 self-start md:self-auto">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          Turno:
        </div>

        <div className="flex rounded-lg bg-slate-900/90 p-1 border border-slate-700/80">
          {/* Button 1o Turno */}
          <button
            onClick={() => onSelectTurno(1)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              selectedTurno === 1
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>1º Turno</span>
            {hasTurno1 && (
              <span
                className={`w-2 h-2 rounded-full ${
                  selectedTurno === 1 ? 'bg-emerald-300' : 'bg-emerald-500'
                }`}
                title="Dados disponíveis para o 1º turno"
              />
            )}
          </button>

          {/* Button 2o Turno */}
          <button
            onClick={() => onSelectTurno(2)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              selectedTurno === 2
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>2º Turno</span>
            {hasTurno2 ? (
              <span
                className={`w-2 h-2 rounded-full ${
                  selectedTurno === 2 ? 'bg-emerald-300' : 'bg-emerald-500'
                }`}
                title="Dados disponíveis para o 2º turno"
              />
            ) : (
              <span
                className="w-2 h-2 rounded-full bg-slate-600"
                title="Sem dados para o 2º turno (clique para importar)"
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
