import React from 'react';
import { Upload, AlertCircle, FileCode } from 'lucide-react';

export function EmptyTurnoState({
  zona,
  secao,
  turno,
  onUploadClick,
}: {
  zona: string;
  secao: string;
  turno: 1 | 2;
  onUploadClick: () => void;
}) {
  return (
    <div className="bg-[#0f1d32] border border-[#1e3557] rounded-2xl p-10 text-center space-y-4 max-w-xl mx-auto shadow-xl">
      <div className="w-14 h-14 rounded-2xl bg-blue-950 border border-blue-800 text-blue-400 flex items-center justify-center mx-auto">
        <AlertCircle className="w-8 h-8" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-white">
          Nenhum dado importado para o {turno}º Turno
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Zona <strong className="text-white font-mono">{zona}</strong> &bull; Seção <strong className="text-white font-mono">{secao}</strong>
        </p>
      </div>

      <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
        Faça o upload do arquivo <span className="font-mono text-cyan-300 font-semibold">.dat</span> (Boletim de Urna) ou <span className="font-mono text-cyan-300 font-semibold">.jez</span> (Log de Urna) correspondente ao {turno}º Turno.
        O sistema organizará o arquivo automaticamente no diretório:
      </p>

      <div className="bg-[#081322] border border-slate-800 p-2.5 rounded-lg text-xs font-mono text-amber-300 max-w-sm mx-auto">
        storage/zona_{zona}/secao_{secao}/turno_{turno}/
      </div>

      <div className="pt-2">
        <button
          onClick={onUploadClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg transition-colors cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          Importar Arquivo do {turno}º Turno
        </button>
      </div>
    </div>
  );
}
