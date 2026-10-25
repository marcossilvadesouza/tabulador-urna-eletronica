export interface CandidatoVotacao {
  numero: string;
  nome: string;
  partidoNumero: string;
  partidoNome: string;
  votos: number;
  percentualValidos: number;
  percentualTotal: number;
  tipoVoto: 'NOMINAL' | 'LEGENDA';
}

export interface PartidoResumo {
  numero: string;
  nome: string;
  votosNominais: number;
  votosLegenda: number;
  totalVotos: number;
  candidatos: CandidatoVotacao[];
}

export interface CargoApuracao {
  cargoId: number;
  cargoNome: string;
  eleicaoId: number;
  eleicaoNome: string;
  eleitoresAptos: number;
  eleitoresAptosOriginais: number;
  eleitoresAptosTemporarios: number;
  votosNominais: number;
  votosLegenda: number;
  votosBrancos: number;
  votosNulos: number;
  totalValidos: number;
  totalApurado: number;
  candidatos: CandidatoVotacao[];
  partidos: PartidoResumo[];
}

export interface EleicaoApuracao {
  codigoEleicao: number;
  nomeEleicao: string;
  eleitoresAptos: number;
  eleitoresAptosOriginais: number;
  eleitoresAptosTemporarios: number;
  cargos: CargoApuracao[];
}

export interface BoletimUrnaData {
  cabecalho: {
    dataHoraGeracao: string;
    dataHoraGeracaoFormatada: string;
    codigoPleito: number;
    fase: number;
    turno: 1 | 2;
    turnoNome: string;
  };
  urna: {
    codigoIdentificacaoUE: string;
    versaoSoftware: string;
    codigoCarga: string;
    codigoCargaFormatado: string;
    resumoCorrespondencia: string;
    dataHoraCarga: string;
    dataHoraCargaFormatada: string;
    tipoArquivo: string;
  };
  secao: {
    municipioCodigo: number;
    municipioNome: string;
    zonaEleitoral: number;
    zonaFormatada: string;
    localVotacao: number;
    secaoEleitoral: number;
    secaoFormatada: string;
    uf: string;
  };
  votacao: {
    dataHoraAbertura: string;
    dataHoraAberturaFormatada: string;
    dataHoraFechamento: string;
    dataHoraFechamentoFormatada: string;
    dataHoraEmissao: string;
    dataHoraEmissaoFormatada: string;
    eleitoresAptos: number;
    comparecimento: number;
    faltosos: number;
    percentualComparecimento: number;
    percentualAbstencao: number;
    habilitacaoBiometrica: number;
    habilitacaoBiografica: number;
    habilitacaoSemBiometria: number;
  };
  eleicoes: EleicaoApuracao[];
  cargos: CargoApuracao[];
  resumoGeral: {
    totalEleitoresAptos: number;
    totalComparecimento: number;
    totalFaltosos: number;
    totalCargosApurados: number;
    totalCandidatosVotados: number;
  };
}
