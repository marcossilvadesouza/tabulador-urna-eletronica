export interface LogEntry {
  id: number;
  dataHora: string;
  dataHoraFormatada: string;
  timestamp: number;
  nivel: 'INFO' | 'ALERTA' | 'ERRO';
  urnaId: string;
  modulo: 'LOGD' | 'SCUE' | 'GAP' | 'ATUE' | 'VOTA' | 'INITJE' | string;
  mensagem: string;
  hash: string;
  categoria?: 'BOOT' | 'ZERESIMA' | 'VOTACAO' | 'BIOMETRIA' | 'FECHAMENTO' | 'SISTEMA' | 'MIDIA';
}

export interface LogMilestone {
  tipo: 'CARGA' | 'BOOT' | 'ZERESIMA' | 'ABERTURA' | 'PRIMEIRO_VOTO' | 'ULTIMO_VOTO' | 'ENCERRAMENTO' | 'BU_IMPRESSO' | 'GERACAO_ARQUIVOS';
  titulo: string;
  descricao: string;
  dataHora: string;
  modulo: string;
  logLineId: number;
}

export interface HourlyVoterFlow {
  hora: string;
  votosRegistrados: number;
  biometriasSucesso: number;
  biometriasFalha: number;
}

export interface LogAnalysisResult {
  totalLinhas: number;
  urnaId: string;
  zona?: string;
  secao?: string;
  turno: 1 | 2;
  turnoNome: string;
  dataHoraInicio: string;
  dataHoraFim: string;
  versaoSoftware: string;
  contagemPorModulo: Record<string, number>;
  contagemPorNivel: Record<string, number>;
  marcosOperacionais: LogMilestone[];
  fluxoPorHora: HourlyVoterFlow[];
  estatisticasBiometria: {
    totalTentativas: number;
    sucessoBiometria: number;
    liberacaoMesario: number;
  };
  linhas: LogEntry[];
}
