export interface TurnoInfo {
  turno: 1 | 2;
  hasBoletim: boolean;
  hasLog: boolean;
  boletimFileName?: string;
  logFileName?: string;
  updatedAt?: string;
}

export interface SecaoInfo {
  municipioCodigo: number;
  municipioNome: string;
  zona: string;
  secao: string;
  localVotacao?: number;
  turnosDisponiveis: TurnoInfo[];
}

export interface StorageRegistry {
  secoes: SecaoInfo[];
}
