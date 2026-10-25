import { CargoApuracao } from '../boletim-urna/types';

export interface SecaoResumoConsolidado {
  zona: string;
  secao: string;
  municipioNome: string;
  municipioCodigo: number;
  uf: string;
  comparecimento: number;
  eleitoresAptos: number;
  percentualComparecimento: number;
  dataHoraFechamento?: string;
  codigoIdentificacaoUE: string;
}

export interface ResultadoConsolidadoData {
  turno: 1 | 2;
  turnoNome: string;
  totalSecoesApuradas: number;
  totalEleitoresAptos: number;
  totalComparecimento: number;
  totalFaltosos: number;
  percentualComparecimento: number;
  percentualAbstencao: number;
  habilitacaoBiometrica: number;
  habilitacaoBiografica: number;
  habilitacaoSemBiometria: number;
  secoes: SecaoResumoConsolidado[];
  cargos: CargoApuracao[];
}
