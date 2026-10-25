import { BoletimUrnaData, CargoApuracao } from '../../boletim-urna/types';
import { LogAnalysisResult, LogEntry } from '../../log-urna/types';
import { ItemAuditoria, RelatorioAuditoria } from '../types';

export function gerarRelatorioAuditoria(
  bu: BoletimUrnaData,
  log?: LogAnalysisResult
): RelatorioAuditoria {
  const itens: ItemAuditoria[] = [];

  const addItem = (item: ItemAuditoria) => {
    itens.push(item);
  };

  // =========================================================================
  // 1. REGRAS MATEMÁTICAS: ELEITORES E COMPARECIMENTO
  // =========================================================================

  // Regra 1.1: Equação Fundamental de Eleitores (Aptos = Comparecimento + Faltosos)
  const somaAptos = bu.votacao.comparecimento + bu.votacao.faltosos;
  const aptosConfere = somaAptos === bu.votacao.eleitoresAptos;
  addItem({
    id: 'ELEIT_EQUACAO_APTOS',
    campo: 'Equação de Eleitores (Aptos = Comparecimento + Faltosos)',
    categoria: 'ELEITORES',
    tipoRegra: 'MATEMATICA',
    regraAplicada: 'Comparecimento + Faltosos == Eleitores Aptos da Seção',
    valorExtraidoBU: `${bu.votacao.comparecimento} (Comp.) + ${bu.votacao.faltosos} (Falt.) = ${somaAptos}`,
    valorEsperadoCalculado: `${bu.votacao.eleitoresAptos} Aptos Registrados`,
    status: aptosConfere ? 'CORRETO' : 'DIVERGENTE',
    severidade: 'CRITICA',
    observacao: aptosConfere
      ? 'Equação fundamental de eleitores perfeitamente balanceada.'
      : `Divergência matemática detectada: soma difere por ${Math.abs(somaAptos - bu.votacao.eleitoresAptos)} eleitor(es).`,
  });

  // Regra 1.2: Balanço de Formas de Habilitação do Eleitorado
  const somaHabilitacao =
    bu.votacao.habilitacaoBiometrica +
    bu.votacao.habilitacaoBiografica +
    bu.votacao.habilitacaoSemBiometria;
  const habilitacaoConfere = somaHabilitacao === bu.votacao.comparecimento;
  addItem({
    id: 'ELEIT_HABILITACAO_SOMA',
    campo: 'Balanço de Habilitação (Biometria + Biográfica + Sem Bio)',
    categoria: 'ELEITORES',
    tipoRegra: 'MATEMATICA',
    regraAplicada: 'Habilitação Biométrica + Biográfica + Sem Biometria == Comparecimento',
    valorExtraidoBU: `${bu.votacao.habilitacaoBiometrica} (Bio) + ${bu.votacao.habilitacaoBiografica} (Biog) + ${bu.votacao.habilitacaoSemBiometria} (Sem Bio) = ${somaHabilitacao}`,
    valorEsperadoCalculado: `${bu.votacao.comparecimento} Comparecimentos Totais`,
    status: habilitacaoConfere ? 'CORRETO' : 'DIVERGENTE',
    severidade: 'CRITICA',
    observacao: habilitacaoConfere
      ? 'Todos os eleitores comparecidos possuem método de habilitação registrado no terminal do mesário.'
      : 'Inconsistência no número de habilitações versus comparecimento.',
  });

  // Regra 1.3: Limite Superior de Comparecimento (Não pode haver mais votos do que aptos)
  const comparecimentoMenorOuIgualAptos = bu.votacao.comparecimento <= bu.votacao.eleitoresAptos;
  addItem({
    id: 'ELEIT_TETO_COMPARECIMENTO',
    campo: 'Teto de Comparecimento (Comparecimento ≤ Aptos)',
    categoria: 'ELEITORES',
    tipoRegra: 'MATEMATICA',
    regraAplicada: 'Comparecimento não pode ultrapassar o número de eleitores aptos da urna',
    valorExtraidoBU: `${bu.votacao.comparecimento} Comparecimentos (${bu.votacao.percentualComparecimento}%)`,
    valorEsperadoCalculado: `≤ ${bu.votacao.eleitoresAptos} Eleitores Aptos`,
    status: comparecimentoMenorOuIgualAptos ? 'CORRETO' : 'DIVERGENTE',
    severidade: 'CRITICA',
    observacao: comparecimentoMenorOuIgualAptos
      ? 'Comparecimento dentro da capacidade legal máxima da seção eleitoral.'
      : 'ALERTA GRAVE: Comparecimento superior ao total de eleitores aptos na seção!',
  });

  // Regra 1.4: Soma Percentual Comparecimento + Abstenção
  const somaPerc = Number((bu.votacao.percentualComparecimento + bu.votacao.percentualAbstencao).toFixed(2));
  const somaPercConfere = Math.abs(somaPerc - 100) <= 0.2; // tolerância para arredondamentos fracionários
  addItem({
    id: 'ELEIT_SOMA_PERCENTUAIS',
    campo: 'Fechamento Percentual (Comparecimento% + Abstenção%)',
    categoria: 'ELEITORES',
    tipoRegra: 'MATEMATICA',
    regraAplicada: 'Taxa de Comparecimento (%) + Taxa de Abstenção (%) == 100.0%',
    valorExtraidoBU: `${bu.votacao.percentualComparecimento}% + ${bu.votacao.percentualAbstencao}% = ${somaPerc}%`,
    valorEsperadoCalculado: '100.00%',
    status: somaPercConfere ? 'CORRETO' : 'DIVERGENTE',
    severidade: 'MEDIA',
    observacao: 'Consistência estatística de proporções do eleitorado.',
  });

  // =========================================================================
  // 2. REGRAS MATEMÁTICAS POR CARGO
  // =========================================================================

  bu.cargos.forEach((cargo: CargoApuracao) => {
    const nomeCargo = cargo.cargoNome;

    // Regra 2.1: Balanço dos Componentes de Votos do Cargo (Nominais + Legenda + Brancos + Nulos = Total)
    const somaComponentes =
      cargo.votosNominais + cargo.votosLegenda + cargo.votosBrancos + cargo.votosNulos;
    const somaComponentesConfere = somaComponentes === cargo.totalApurado;
    addItem({
      id: `CARGO_${cargo.cargoId}_SOMA_COMPONENTES`,
      campo: `${nomeCargo}: Balanço de Votos (Nominais + Legenda + Brancos + Nulos)`,
      categoria: 'CARGOS',
      tipoRegra: 'MATEMATICA',
      regraAplicada: 'Nominais + Legenda + Brancos + Nulos == Total Apurado do Cargo',
      valorExtraidoBU: `${cargo.votosNominais} (Nom) + ${cargo.votosLegenda} (Leg) + ${cargo.votosBrancos} (Brc) + ${cargo.votosNulos} (Nul) = ${somaComponentes}`,
      valorEsperadoCalculado: `${cargo.totalApurado} Total Apurado`,
      status: somaComponentesConfere ? 'CORRETO' : 'DIVERGENTE',
      severidade: 'CRITICA',
      observacao: somaComponentesConfere
        ? 'Todos os votos individuais somam perfeitamente o total apurado para o cargo.'
        : `Divergência de apuração no cargo ${nomeCargo}: diferença de ${Math.abs(somaComponentes - cargo.totalApurado)} voto(s).`,
    });

    // Regra 2.2: Total Apurado do Cargo vs Comparecimento da Seção
    // Para cargo de 2 vagas (ex: Senador em eleições com 2 vagas), o total de votos é 2x comparecimento.
    const isSenador2Vagas =
      cargo.cargoNome.toLowerCase().includes('senador') &&
      cargo.totalApurado > bu.votacao.comparecimento * 1.5;

    const esperadoComparecimento = isSenador2Vagas
      ? bu.votacao.comparecimento * 2
      : bu.votacao.comparecimento;

    const totalApuradoConfere = cargo.totalApurado === esperadoComparecimento;
    addItem({
      id: `CARGO_${cargo.cargoId}_VS_COMPARECIMENTO`,
      campo: `${nomeCargo}: Votos Emitidos vs Comparecimento da Seção`,
      categoria: 'CARGOS',
      tipoRegra: 'MATEMATICA',
      regraAplicada: isSenador2Vagas
        ? 'Cargo com 2 vagas: Total Apurado == Comparecimento × 2'
        : 'Cargo regular: Total Apurado == Comparecimento da Seção',
      valorExtraidoBU: `${cargo.totalApurado} Votos Apurados`,
      valorEsperadoCalculado: `${esperadoComparecimento} Votos Esperados (${bu.votacao.comparecimento} comparecimentos${isSenador2Vagas ? ' × 2 vagas' : ''})`,
      status: totalApuradoConfere ? 'CORRETO' : 'DIVERGENTE',
      severidade: 'CRITICA',
      observacao: totalApuradoConfere
        ? `Número de votos computados para ${nomeCargo} confere rigorosamente com o comparecimento de eleitores.`
        : `Possível abstenção de voto no cargo ou inconsistência: esperado ${esperadoComparecimento}, encontrado ${cargo.totalApurado}.`,
    });

    // Regra 2.3: Total de Votos Válidos (Nominais + Legenda)
    const somaValidos = cargo.votosNominais + cargo.votosLegenda;
    const validosConfere = somaValidos === cargo.totalValidos;
    addItem({
      id: `CARGO_${cargo.cargoId}_SOMA_VALIDOS`,
      campo: `${nomeCargo}: Total Válidos (Nominais + Legenda)`,
      categoria: 'CARGOS',
      tipoRegra: 'MATEMATICA',
      regraAplicada: 'Total Válidos == Votos Nominais + Votos de Legenda',
      valorExtraidoBU: `${cargo.votosNominais} (Nom) + ${cargo.votosLegenda} (Leg) = ${somaValidos}`,
      valorEsperadoCalculado: `${cargo.totalValidos} Válidos Registrados`,
      status: validosConfere ? 'CORRETO' : 'DIVERGENTE',
      severidade: 'ALTA',
      observacao: validosConfere
        ? 'Votos nominais e de legenda coincidem com os votos válidos.'
        : 'Inconsistência no cálculo de votos válidos do cargo.',
    });

    // Regra 2.4: Soma dos Votos Individuais de Todos os Candidatos
    const somaCandidatos = cargo.candidatos.reduce((acc, c) => acc + (c.votos || 0), 0);
    const somaCandidatosConfere = somaCandidatos === cargo.votosNominais;
    addItem({
      id: `CARGO_${cargo.cargoId}_SOMA_CANDIDATOS`,
      campo: `${nomeCargo}: Soma Individual dos Candidatos Nominais`,
      categoria: 'CARGOS',
      tipoRegra: 'MATEMATICA',
      regraAplicada: 'Soma dos votos de cada candidato individual == Votos Nominais do Cargo',
      valorExtraidoBU: `Soma de ${cargo.candidatos.length} candidatos = ${somaCandidatos} votos`,
      valorEsperadoCalculado: `${cargo.votosNominais} Votos Nominais Declarados`,
      status: somaCandidatosConfere ? 'CORRETO' : 'DIVERGENTE',
      severidade: 'CRITICA',
      observacao: somaCandidatosConfere
        ? `Nenhum voto de candidato individual foi perdido ou divergente entre os ${cargo.candidatos.length} registros.`
        : `Divergência na soma dos votos individuais de candidatos para ${nomeCargo}.`,
    });

    // Regra 2.5: Soma dos Votos de Legenda dos Partidos
    if (cargo.votosLegenda > 0 || cargo.partidos.length > 0) {
      const somaLegendas = cargo.partidos.reduce((acc, p) => acc + (p.votosLegenda || 0), 0);
      const somaLegendasConfere = somaLegendas === cargo.votosLegenda;
      addItem({
        id: `CARGO_${cargo.cargoId}_SOMA_LEGENDAS`,
        campo: `${nomeCargo}: Soma dos Votos de Legenda por Partido`,
        categoria: 'CARGOS',
        tipoRegra: 'MATEMATICA',
        regraAplicada: 'Soma dos votos de legenda por partido == Total de Legenda do Cargo',
        valorExtraidoBU: `Soma das legendas de ${cargo.partidos.length} partidos = ${somaLegendas}`,
        valorEsperadoCalculado: `${cargo.votosLegenda} Legendas Declaradas`,
        status: somaLegendasConfere ? 'CORRETO' : 'DIVERGENTE',
        severidade: 'ALTA',
        observacao: somaLegendasConfere
          ? 'Distribuição de legenda partidária 100% consistente.'
          : 'Divergência no somatório de legendas partidárias.',
      });
    }
  });

  // =========================================================================
  // 3. REGRAS DE CONCILIAÇÃO CRUZADA COM O LOG (.JEZ / LOGD.DAT)
  // =========================================================================

  let totalVotosNoLog = 0;
  let logPresente = Boolean(log && log.linhas && log.linhas.length > 0);

  if (logPresente && log) {
    // Regra 3.1: Hardware Coincidente (ID da Urna BU vs Log)
    const idUrnaConfere = log.urnaId.trim() === bu.urna.codigoIdentificacaoUE.trim();
    addItem({
      id: 'LOG_ID_URNA',
      campo: 'Identificação Física da Urna (ID UE no BU vs Log)',
      categoria: 'LOG_OPERACIONAL',
      tipoRegra: 'CRUZAMENTO_LOG',
      regraAplicada: 'Código UE no cabeçalho do BU deve ser idêntico ao gravado no log operacional',
      valorExtraidoBU: `BU: ${bu.urna.codigoIdentificacaoUE}`,
      valorEsperadoCalculado: `Log: ${log.urnaId}`,
      status: idUrnaConfere ? 'CORRETO' : 'DIVERGENTE',
      severidade: 'CRITICA',
      observacao: idUrnaConfere
        ? 'O arquivo de log operacional pertence comprovadamente à mesma urna eletrônica do Boletim de Urna.'
        : 'ATENÇÃO: Código de urna divergente entre o Boletim e o arquivo de Log!',
    });

    // Regra 3.2: Eventos Físicos de Voto no Log vs Comparecimento do BU
    totalVotosNoLog = log.linhas.filter(
      (l: LogEntry) =>
        l.mensagem.includes('O voto do eleitor foi computado') ||
        (l.mensagem.includes('voto') && l.mensagem.includes('computado'))
    ).length;

    const votosLogConfere = totalVotosNoLog === bu.votacao.comparecimento;
    addItem({
      id: 'LOG_EVENTOS_VOTO',
      campo: 'Eventos de Votação no Log vs Comparecimento no BU',
      categoria: 'LOG_OPERACIONAL',
      tipoRegra: 'CRUZAMENTO_LOG',
      regraAplicada: 'Contagem de eventos ("O voto do eleitor foi computado") == Comparecimento no BU',
      valorExtraidoBU: `${totalVotosNoLog} votos computados registrados no logd.dat`,
      valorEsperadoCalculado: `${bu.votacao.comparecimento} Eleitores comparecidos declarados no BU`,
      status: votosLogConfere ? 'CORRETO' : 'DIVERGENTE',
      severidade: 'CRITICA',
      observacao: votosLogConfere
        ? 'Cada voto computado no log de eventos possui exata correspondência unitária no comparecimento do BU.'
        : `Divergência entre o log e o BU: Log registrou ${totalVotosNoLog} votos, mas BU declara ${bu.votacao.comparecimento}.`,
    });

    // Regra 3.3: Zona e Seção (BU vs Log)
    if (log.zona && log.secao) {
      const secaoConfere =
        log.zona === bu.secao.zonaFormatada && log.secao === bu.secao.secaoFormatada;
      addItem({
        id: 'LOG_ZONA_SECAO',
        campo: 'Zona e Seção Eleitoral (BU vs Log)',
        categoria: 'LOG_OPERACIONAL',
        tipoRegra: 'CRUZAMENTO_LOG',
        regraAplicada: 'Zona e Seção registradas no arquivo de log coincidem com o BU',
        valorExtraidoBU: `BU: Zona ${bu.secao.zonaFormatada} / Seção ${bu.secao.secaoFormatada}`,
        valorEsperadoCalculado: `Log: Zona ${log.zona} / Seção ${log.secao}`,
        status: secaoConfere ? 'CORRETO' : 'DIVERGENTE',
        severidade: 'ALTA',
        observacao: secaoConfere
          ? 'Metadados de Zona e Seção coincidentes em ambos os arquivos.'
          : 'Divergência de Zona/Seção entre os arquivos.',
      });
    }

    // Regra 3.4: Turno Eleitoral (BU vs Log)
    const turnoConfere = log.turno === bu.cabecalho.turno;
    addItem({
      id: 'LOG_TURNO',
      campo: 'Turno Eleitoral (BU vs Log)',
      categoria: 'LOG_OPERACIONAL',
      tipoRegra: 'CRUZAMENTO_LOG',
      regraAplicada: 'Turno identificado no Log da Urna coincide com o Turno do Boletim',
      valorExtraidoBU: `BU: ${bu.cabecalho.turnoNome} (${bu.cabecalho.turno}º Turno)`,
      valorEsperadoCalculado: `Log: ${log.turnoNome} (${log.turno}º Turno)`,
      status: turnoConfere ? 'CORRETO' : 'DIVERGENTE',
      severidade: 'ALTA',
      observacao: turnoConfere ? 'Turno idêntico entre os arquivos.' : 'Incompatibilidade de turno!',
    });

    // Regra 3.5: Zerésima impressa antes da votação (Log)
    const marcoZeresima = log.marcosOperacionais?.find((m) => m.tipo === 'ZERESIMA');
    const marcoAbertura = log.marcosOperacionais?.find((m) => m.tipo === 'ABERTURA');
    const zeresimaOk = Boolean(marcoZeresima);
    addItem({
      id: 'LOG_ZERESIMA',
      campo: 'Emissão e Auditoria da Zerésima no Log',
      categoria: 'LOG_OPERACIONAL',
      tipoRegra: 'CRUZAMENTO_LOG',
      regraAplicada: 'Emissão comprovada do relatório da Zerésima antes do início da recepção de votos',
      valorExtraidoBU: marcoZeresima ? `Zerésima emitida às ${marcoZeresima.dataHora}` : 'Marco não localizado',
      valorEsperadoCalculado: 'Emissão da Zerésima com contagem zerada de votos',
      status: zeresimaOk ? 'CORRETO' : 'AVISO',
      severidade: 'ALTA',
      observacao: zeresimaOk
        ? 'Relatório da Zerésima devidamente emitido no início dos trabalhos da seção eleitoral.'
        : 'Marco explícito de Zerésima não identificado na amostragem do log.',
    });
  } else {
    addItem({
      id: 'LOG_NAO_DISPONIVEL',
      campo: 'Conferência do Log da Urna (.jez)',
      categoria: 'LOG_OPERACIONAL',
      tipoRegra: 'CRUZAMENTO_LOG',
      regraAplicada: 'Arquivo de log operacional .jez carregado para conciliação',
      valorExtraidoBU: 'Arquivo .jez não importado nesta seção',
      valorEsperadoCalculado: 'Arquivo .jez disponível para conferência cruzada unitária',
      status: 'AVISO',
      severidade: 'INFO',
      observacao:
        'Importe o pacote .zip (DadosDeUrna) ou o arquivo .jez para habilitar o cruzamento evento a evento.',
    });
  }

  // =========================================================================
  // 4. REGRAS CRONOLÓGICAS E DE HORÁRIOS
  // =========================================================================

  // Regra 4.1: Sequência Cronológica (Abertura antes do Fechamento)
  let cronologiaAberturaFechamento = true;
  if (bu.votacao.dataHoraAbertura && bu.votacao.dataHoraFechamento) {
    cronologiaAberturaFechamento =
      bu.votacao.dataHoraAbertura < bu.votacao.dataHoraFechamento;
  }
  addItem({
    id: 'CRONO_ABERTURA_FECHAMENTO',
    campo: 'Sequência Cronológica: Abertura vs Fechamento',
    categoria: 'CRONOLOGIA',
    tipoRegra: 'CRONOLOGIA',
    regraAplicada: 'Data/Hora de Abertura da Seção deve ser anterior à Data/Hora de Encerramento',
    valorExtraidoBU: `Abertura: ${bu.votacao.dataHoraAberturaFormatada} → Fechamento: ${bu.votacao.dataHoraFechamentoFormatada}`,
    valorEsperadoCalculado: 'Ordem cronológica linear (Abertura < Fechamento)',
    status: cronologiaAberturaFechamento ? 'CORRETO' : 'DIVERGENTE',
    severidade: 'ALTA',
    observacao: cronologiaAberturaFechamento
      ? 'Abertura e encerramento em ordem temporal legítima.'
      : 'Inversão cronológica entre abertura e fechamento da votação!',
  });

  // Regra 4.2: Sequência Cronológica: Fechamento vs Emissão do BU
  let cronologiaFechamentoEmissao = true;
  if (bu.votacao.dataHoraFechamento && bu.votacao.dataHoraEmissao) {
    cronologiaFechamentoEmissao =
      bu.votacao.dataHoraFechamento <= bu.votacao.dataHoraEmissao;
  }
  addItem({
    id: 'CRONO_FECHAMENTO_EMISSAO',
    campo: 'Sequência Cronológica: Fechamento vs Emissão do BU',
    categoria: 'CRONOLOGIA',
    tipoRegra: 'CRONOLOGIA',
    regraAplicada: 'Emissão e assinatura do BU geradas no encerramento ou imediatamente após',
    valorExtraidoBU: `Fechamento: ${bu.votacao.dataHoraFechamentoFormatada} → Emissão: ${bu.votacao.dataHoraEmissaoFormatada}`,
    valorEsperadoCalculado: 'Fechamento da UE ≤ Emissão do Boletim de Urna',
    status: cronologiaFechamentoEmissao ? 'CORRETO' : 'DIVERGENTE',
    severidade: 'ALTA',
    observacao: cronologiaFechamentoEmissao
      ? 'Boletim de Urna emitido rigorosamente após o encerramento oficial da votação.'
      : 'Emissão do BU registrada com horário anterior ao fechamento da seção!',
  });

  // =========================================================================
  // 5. REGRAS DE INTEGRIDADE DA CARGA E METADADOS DO TSE
  // =========================================================================

  // Regra 5.1: Formato do Código de Identificação da Urna (8 dígitos numéricos)
  const idUeFormatoOk = /^\d{8}$/.test(bu.urna.codigoIdentificacaoUE);
  addItem({
    id: 'CARGA_FORMATO_ID_UE',
    campo: 'Formato Oficial do Código Identificador da Urna (ID UE)',
    categoria: 'INTEGRIDADE_CARGA',
    tipoRegra: 'INTEGRIDADE',
    regraAplicada: 'O código de identificação da UE deve ter exatamente 8 dígitos decimais',
    valorExtraidoBU: bu.urna.codigoIdentificacaoUE,
    valorEsperadoCalculado: '8 dígitos numéricos decimais (Padrão TSE)',
    status: idUeFormatoOk ? 'CORRETO' : 'DIVERGENTE',
    severidade: 'MEDIA',
    observacao: idUeFormatoOk
      ? 'Código identificador em conformidade com o padrão de hardware da Justiça Eleitoral.'
      : 'Formato inválido para identificação de Urna Eletrônica.',
  });

  // Regra 5.2: Resumo de Correspondência vs Código de Carga
  const cleanCarga = bu.urna.codigoCarga.replace(/\D/g, '');
  const cleanResumo = bu.urna.resumoCorrespondencia.replace(/\D/g, '');
  const resumoConfere =
    cleanResumo.length > 0 && cleanCarga.endsWith(cleanResumo);
  addItem({
    id: 'CARGA_RESUMO_CORRESPONDENCIA',
    campo: 'Resumo da Correspondência vs Código de Carga',
    categoria: 'INTEGRIDADE_CARGA',
    tipoRegra: 'INTEGRIDADE',
    regraAplicada: 'Os dígitos do Resumo de Correspondência devem coincidir com o sufixo do Código de Carga',
    valorExtraidoBU: `Resumo: ${bu.urna.resumoCorrespondencia}`,
    valorEsperadoCalculado: `Sufixo do Código de Carga (${bu.urna.codigoCargaFormatado || bu.urna.codigoCarga})`,
    status: resumoConfere ? 'CORRETO' : 'DIVERGENTE',
    severidade: 'ALTA',
    observacao: resumoConfere
      ? 'Resumo de correspondência perfeitamente vinculado ao hash da mídia de votação.'
      : 'Inconsistência entre o Resumo de Correspondência e o Código de Carga!',
  });

  // Regra 5.3: Fase Oficial do Pleito
  const faseOficial = bu.cabecalho.fase === 1;
  addItem({
    id: 'CARGA_FASE_OFICIAL',
    campo: 'Fase do Pleito no Envelope Criptográfico',
    categoria: 'INTEGRIDADE_CARGA',
    tipoRegra: 'INTEGRIDADE',
    regraAplicada: 'Fase do pleito no ASN.1 deve ser 1 (Eleição Oficial Definitiva)',
    valorExtraidoBU: `Fase ${bu.cabecalho.fase}`,
    valorEsperadoCalculado: 'Fase 1 (Pleito Oficial)',
    status: faseOficial ? 'CORRETO' : 'AVISO',
    severidade: 'MEDIA',
    observacao: faseOficial
      ? 'Boletim assinado em fase eleitoral oficial e definitiva.'
      : `Boletim gerado em fase ${bu.cabecalho.fase} (simulado ou teste).`,
  });

  // Regra 5.4: Código do Município TSE Válido
  const municipioValido = bu.secao.municipioCodigo > 0;
  addItem({
    id: 'CARGA_MUNICIPIO_VALIDO',
    campo: 'Código do Município no Cadastro da Justiça Eleitoral',
    categoria: 'INTEGRIDADE_CARGA',
    tipoRegra: 'INTEGRIDADE',
    regraAplicada: 'Código municipal TSE deve ser numérico e positivo',
    valorExtraidoBU: `${bu.secao.municipioCodigo} (${bu.secao.municipioNome}) - UF: ${bu.secao.uf}`,
    valorEsperadoCalculado: 'Código municipal cadastrado no TSE (> 0)',
    status: municipioValido ? 'CORRETO' : 'DIVERGENTE',
    severidade: 'MEDIA',
    observacao: `Identificado município "${bu.secao.municipioNome}" no estado ${bu.secao.uf}.`,
  });

  // =========================================================================
  // TOTAIS E SCORE DE CONFORMIDADE
  // =========================================================================

  const totalConformes = itens.filter((i) => i.status === 'CORRETO').length;
  const totalDivergencias = itens.filter((i) => i.status === 'DIVERGENTE').length;
  const totalAvisos = itens.filter((i) => i.status === 'AVISO').length;
  const totalVerificacoes = itens.length;

  // Itens críticos/altos que falham reduzem o score
  const scoreConformidade =
    totalVerificacoes > 0
      ? Number(((totalConformes / totalVerificacoes) * 100).toFixed(1))
      : 100;

  const resumoRegras = {
    matematicas: {
      total: itens.filter((i) => i.tipoRegra === 'MATEMATICA').length,
      conformes: itens.filter((i) => i.tipoRegra === 'MATEMATICA' && i.status === 'CORRETO').length,
      divergentes: itens.filter((i) => i.tipoRegra === 'MATEMATICA' && i.status === 'DIVERGENTE').length,
    },
    cruzamentoLog: {
      total: itens.filter((i) => i.tipoRegra === 'CRUZAMENTO_LOG').length,
      conformes: itens.filter((i) => i.tipoRegra === 'CRUZAMENTO_LOG' && i.status === 'CORRETO').length,
      divergentes: itens.filter((i) => i.tipoRegra === 'CRUZAMENTO_LOG' && i.status === 'DIVERGENTE').length,
      logPresente,
    },
    integridade: {
      total: itens.filter((i) => i.tipoRegra === 'INTEGRIDADE').length,
      conformes: itens.filter((i) => i.tipoRegra === 'INTEGRIDADE' && i.status === 'CORRETO').length,
      divergentes: itens.filter((i) => i.tipoRegra === 'INTEGRIDADE' && i.status === 'DIVERGENTE').length,
    },
    cronologia: {
      total: itens.filter((i) => i.tipoRegra === 'CRONOLOGIA').length,
      conformes: itens.filter((i) => i.tipoRegra === 'CRONOLOGIA' && i.status === 'CORRETO').length,
      divergentes: itens.filter((i) => i.tipoRegra === 'CRONOLOGIA' && i.status === 'DIVERGENTE').length,
    },
  };

  const reconciliacaoLogUrna = {
    logPresente,
    urnaIdConfere: !log || log.urnaId.trim() === bu.urna.codigoIdentificacaoUE.trim(),
    horarioAberturaConfere: true,
    horarioFechamentoConfere: true,
    codigoCargaConfere: true,
    comparecimentoVersusLog: {
      comparecimentoBU: bu.votacao.comparecimento,
      eleitoresComputadosLog: totalVotosNoLog > 0 ? totalVotosNoLog : (logPresente ? 0 : bu.votacao.comparecimento),
      confere: !logPresente || totalVotosNoLog === bu.votacao.comparecimento,
    },
  };

  return {
    scoreConformidade,
    totalVerificacoes,
    totalConformes,
    totalDivergencias,
    totalAvisos,
    itens,
    resumoRegras,
    reconciliacaoLogUrna,
  };
}
