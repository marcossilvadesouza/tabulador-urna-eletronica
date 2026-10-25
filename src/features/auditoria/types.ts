export type CategoriaAuditoria =
  | 'ELEITORES'
  | 'CARGOS'
  | 'LOG_OPERACIONAL'
  | 'CRONOLOGIA'
  | 'INTEGRIDADE_CARGA';

export interface ItemAuditoria {
  id: string;
  campo: string;
  categoria: CategoriaAuditoria;
  tipoRegra: 'MATEMATICA' | 'CRUZAMENTO_LOG' | 'CRONOLOGIA' | 'INTEGRIDADE';
  regraAplicada: string;
  valorExtraidoBU: string | number;
  valorEsperadoCalculado: string | number;
  status: 'CORRETO' | 'DIVERGENTE' | 'AVISO';
  observacao?: string;
  severidade: 'CRITICA' | 'ALTA' | 'MEDIA' | 'INFO';
}

export interface RelatorioAuditoria {
  scoreConformidade: number; // 0-100%
  totalVerificacoes: number;
  totalConformes: number;
  totalDivergencias: number;
  totalAvisos: number;
  itens: ItemAuditoria[];
  resumoRegras: {
    matematicas: { total: number; conformes: number; divergentes: number };
    cruzamentoLog: { total: number; conformes: number; divergentes: number; logPresente: boolean };
    integridade: { total: number; conformes: number; divergentes: number };
    cronologia: { total: number; conformes: number; divergentes: number };
  };
  reconciliacaoLogUrna: {
    logPresente: boolean;
    urnaIdConfere: boolean;
    horarioAberturaConfere: boolean;
    horarioFechamentoConfere: boolean;
    codigoCargaConfere: boolean;
    comparecimentoVersusLog: {
      comparecimentoBU: number;
      eleitoresComputadosLog: number;
      confere: boolean;
    };
  };
}
