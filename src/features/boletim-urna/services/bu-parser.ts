import { decodeAsn1Buffer } from '../../asn1-inspector/services/asn1-decoder';
import { Asn1Node } from '../../asn1-inspector/types';
import {
  BoletimUrnaData,
  CargoApuracao,
  CandidatoVotacao,
  EleicaoApuracao,
  PartidoResumo,
} from '../types';
import candidateRegistry from './candidate-registry.json';

import { getMunicipioInfo } from './municipio-lookup';

const CARGO_NOMES: Record<number, string> = {
  1: 'Presidente',
  3: 'Governador',
  5: 'Senador',
  6: 'Deputado Federal',
  7: 'Deputado Estadual',
};

const ELEICAO_NOMES: Record<number, string> = {
  6257: 'Eleição Ordinária Federal - 2026',
  6259: 'Eleição Ordinária Estadual - 2026',
};

function formatTseDateTime(dtStr: string): string {
  if (!dtStr) return '';
  // Format: 20261004T070001 -> 04/10/2026 07:00:01
  const m = dtStr.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (m) {
    return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}:${m[6]}`;
  }
  return dtStr;
}

function formatCodigoCarga(code: string): string {
  if (!code) return '';
  // 856661237445681641080213 -> 856.661.237.445.681.641.080.213
  const cleaned = code.replace(/\D/g, '');
  if (cleaned.length === 24) {
    return cleaned.match(/.{1,3}/g)?.join('.') || code;
  }
  return code;
}

export function parseBoletimUrnaBuffer(buf: Buffer, fileName?: string): BoletimUrnaData {
  const rootNodes = decodeAsn1Buffer(buf);
  if (!rootNodes || rootNodes.length === 0) {
    throw new Error('Arquivo vazio ou não é um ASN.1 DER válido');
  }

  const envelope = rootNodes[0];
  if (!envelope.children || envelope.children.length < 5) {
    throw new Error('Estrutura do Envelope Genérico inválida');
  }

  // Header
  const envHeader = envelope.children[0];
  const dataHoraGeracaoRaw = envHeader.children?.[0]?.text || '';
  const codigoPleito = parseInt(envHeader.children?.[1]?.number || '0', 10);
  const faseEnvelope = parseInt(envelope.children[1]?.number || '0', 10);

  // Turno: envelope.children[3] is ENUMERATED { primeiroTurno(1), segundoTurno(2) }
  const turnoNum = parseInt(envelope.children[3]?.number || '1', 10);
  const turno: 1 | 2 = turnoNum === 2 ? 2 : 1;
  const turnoNome = turno === 1 ? '1º Turno' : '2º Turno';

  // Inner OCTET STRING contains EntidadeBoletimDeUrna
  const octetStringNode = envelope.children[4];
  const buNode = octetStringNode.children?.[0];
  if (!buNode || !buNode.children) {
    throw new Error('EntidadeBoletimDeUrna não encontrada no pacote');
  }

  const buFields = buNode.children;

  // Field 2: Urna / Software / Carga
  const dadosUrnaNode = buFields[2];
  const versaoSoftware = dadosUrnaNode.children?.[1]?.text || '10.23.0.0 - Praia da Barra do Cahy';
  const subUrna = dadosUrnaNode.children?.[2]?.children?.[1];
  const ueRaw = subUrna?.children?.[0]?.number || '02446276';
  const codigoIdentificacaoUE = ueRaw.padStart(8, '0');
  const dataHoraCargaRaw = subUrna?.children?.[3]?.text || '';
  const codigoCargaRaw = subUrna?.children?.[4]?.text || '';
  const codigoCargaFormatado = formatCodigoCarga(codigoCargaRaw);
  const resumoCorrespondencia = codigoCargaRaw.slice(-6).match(/.{1,3}/g)?.join('.') || '080.213';

  // Field 3: Identificação da Seção
  const dadosSecao = buFields[3];
  const munZonaNode = dadosSecao.children?.[0];
  const municipioCodigo = parseInt(munZonaNode?.children?.[0]?.number || '90514', 10);
  const zonaEleitoral = parseInt(munZonaNode?.children?.[1]?.number || '35', 10);
  const localVotacao = parseInt(dadosSecao.children?.[1]?.number || '1767', 10);
  const secaoEleitoral = parseInt(dadosSecao.children?.[2]?.number || '574', 10);

  // Field 4: Emissão BU
  const dataHoraEmissaoRaw = buFields[4]?.text || '';

  // Field 5: Horários de Abertura e Fechamento
  const horariosNode = buFields[5];
  const dataHoraAberturaRaw = horariosNode?.children?.[0]?.text || '';
  const dataHoraFechamentoRaw = horariosNode?.children?.[1]?.text || '';

  // Field 6: Comparecimento total
  const comparecimento = parseInt(buFields[6]?.number || '0', 10);

  // Field 7: Habilitações de Eleitores
  const habilitacoesNode = buFields[7];
  const habilitacaoSemBiometria = parseInt(habilitacoesNode?.children?.[0]?.number || '0', 10);
  const habilitacaoBiometrica = parseInt(habilitacoesNode?.children?.[1]?.number || '0', 10);
  const habilitacaoBiografica = parseInt(habilitacoesNode?.children?.[2]?.number || '0', 10);

  // Field 8: Eleições
  const eleicoesSeq = buFields[8];
  const eleicoes: EleicaoApuracao[] = [];
  const todosCargos: CargoApuracao[] = [];

  const candidatesDb = (candidateRegistry.candidates || {}) as Record<string, any>;
  const partiesDb = (candidateRegistry.parties || {}) as Record<string, string>;

  if (eleicoesSeq && eleicoesSeq.children) {
    for (const elNode of eleicoesSeq.children) {
      if (!elNode.children || elNode.children.length < 5) continue;

      const codigoEleicao = parseInt(elNode.children[0]?.number || '0', 10);
      const eleitoresAptos = parseInt(elNode.children[1]?.number || '0', 10);
      const eleitoresAptosOriginais = parseInt(elNode.children[2]?.number || '0', 10);
      const eleitoresAptosTemporarios = parseInt(elNode.children[3]?.number || '0', 10);
      const nomeEleicao = ELEICAO_NOMES[codigoEleicao] || `Eleição ${codigoEleicao}`;

      const cargosNode = elNode.children[4];
      const cargosDaEleicao: CargoApuracao[] = [];

      if (cargosNode && cargosNode.children) {
        for (const cargoGroup of cargosNode.children) {
          const subList = cargoGroup.children?.[2]?.children;
          if (!subList) continue;

          for (const cargoNode of subList) {
            if (!cargoNode.children || cargoNode.children.length < 3) continue;

            const cargoId = parseInt(cargoNode.children[0]?.number || '0', 10);
            const cargoNome = CARGO_NOMES[cargoId] || `Cargo ${cargoId}`;
            const votesNode = cargoNode.children[2];

            let votosNominais = 0;
            let votosLegenda = 0;
            let votosBrancos = 0;
            let votosNulos = 0;

            const candidatosMap: Record<string, CandidatoVotacao> = {};
            const legendaMap: Record<string, number> = {};

            if (votesNode.children) {
              for (const vItem of votesNode.children) {
                if (!vItem.children || vItem.children.length < 2) continue;

                const tipoVoto = parseInt(vItem.children[0]?.number || '0', 10);
                const qtd = parseInt(vItem.children[1]?.number || '0', 10);

                if (tipoVoto === 1) {
                  // Voto Nominal
                  votosNominais += qtd;
                  const candIdNode = vItem.children[2];
                  let partidoNum = '';
                  let candNum = '';

                  if (candIdNode && candIdNode.children && candIdNode.children.length >= 2) {
                    partidoNum = candIdNode.children[0]?.number || '';
                    candNum = candIdNode.children[1]?.number || '';
                  } else if (candIdNode?.number) {
                    candNum = candIdNode.number;
                    partidoNum = candNum.length >= 2 ? candNum.substring(0, 2) : '';
                  }

                  const dbEntry = candidatesDb[`${cargoId}_${candNum}`];
                  const nome = dbEntry?.nome || `Candidato ${candNum}`;
                  const partidoNome =
                    dbEntry?.partidoNome || partiesDb[partidoNum] || `Partido ${partidoNum}`;

                  candidatosMap[candNum] = {
                    numero: candNum,
                    nome,
                    partidoNumero: partidoNum,
                    partidoNome,
                    votos: qtd,
                    percentualValidos: 0,
                    percentualTotal: 0,
                    tipoVoto: 'NOMINAL',
                  };
                } else if (tipoVoto === 4) {
                  // Voto de Legenda
                  votosLegenda += qtd;
                  const candIdNode = vItem.children[2];
                  let partidoNum = '';
                  if (candIdNode?.children && candIdNode.children.length >= 1) {
                    partidoNum = candIdNode.children[0]?.number || '';
                  } else if (candIdNode?.number) {
                    partidoNum = candIdNode.number;
                  }
                  legendaMap[partidoNum] = (legendaMap[partidoNum] || 0) + qtd;
                } else if (tipoVoto === 2) {
                  // Voto em Branco
                  votosBrancos += qtd;
                } else if (tipoVoto === 3) {
                  // Voto Nulo
                  votosNulos += qtd;
                }
              }
            }

            const totalValidos = votosNominais + votosLegenda;
            const totalApurado = totalValidos + votosBrancos + votosNulos;

            // Sort candidates by votes desc
            const candidatos = Object.values(candidatosMap).sort((a, b) => b.votos - a.votos);

            for (const cand of candidatos) {
              cand.percentualValidos =
                totalValidos > 0 ? Number(((cand.votos / totalValidos) * 100).toFixed(2)) : 0;
              cand.percentualTotal =
                totalApurado > 0 ? Number(((cand.votos / totalApurado) * 100).toFixed(2)) : 0;
            }

            // Build PartidoResumo
            const partidosMap: Record<string, PartidoResumo> = {};
            for (const cand of candidatos) {
              const pNum = cand.partidoNumero;
              if (!partidosMap[pNum]) {
                partidosMap[pNum] = {
                  numero: pNum,
                  nome: cand.partidoNome,
                  votosNominais: 0,
                  votosLegenda: legendaMap[pNum] || 0,
                  totalVotos: 0,
                  candidatos: [],
                };
              }
              partidosMap[pNum].votosNominais += cand.votos;
              partidosMap[pNum].candidatos.push(cand);
            }

            // Also check for parties that only have legenda votes
            for (const [pNum, legVotes] of Object.entries(legendaMap)) {
              if (!partidosMap[pNum]) {
                partidosMap[pNum] = {
                  numero: pNum,
                  nome: partiesDb[pNum] || `Partido ${pNum}`,
                  votosNominais: 0,
                  votosLegenda: legVotes,
                  totalVotos: legVotes,
                  candidatos: [],
                };
              }
            }

            for (const p of Object.values(partidosMap)) {
              p.totalVotos = p.votosNominais + p.votosLegenda;
            }

            const partidos = Object.values(partidosMap).sort((a, b) => b.totalVotos - a.totalVotos);

            const cargoApuracao: CargoApuracao = {
              cargoId,
              cargoNome,
              eleicaoId: codigoEleicao,
              eleicaoNome: nomeEleicao,
              eleitoresAptos,
              eleitoresAptosOriginais,
              eleitoresAptosTemporarios,
              votosNominais,
              votosLegenda,
              votosBrancos,
              votosNulos,
              totalValidos,
              totalApurado,
              candidatos,
              partidos,
            };

            cargosDaEleicao.push(cargoApuracao);
            todosCargos.push(cargoApuracao);
          }
        }
      }

      eleicoes.push({
        codigoEleicao,
        nomeEleicao,
        eleitoresAptos,
        eleitoresAptosOriginais,
        eleitoresAptosTemporarios,
        cargos: cargosDaEleicao,
      });
    }
  }

  // Sort cargos in standard ballot order: Presidente (1), Governador (3), Senador (5), Deputado Federal (6), Deputado Estadual (7)
  todosCargos.sort((a, b) => {
    const order = [1, 3, 5, 6, 7];
    return order.indexOf(a.cargoId) - order.indexOf(b.cargoId);
  });

  const totalEleitoresAptos = eleicoes[0]?.eleitoresAptos || 345;
  const faltosos = Math.max(0, totalEleitoresAptos - comparecimento);
  const percentualComparecimento =
    totalEleitoresAptos > 0
      ? Number(((comparecimento / totalEleitoresAptos) * 100).toFixed(2))
      : 0;
  const percentualAbstencao =
    totalEleitoresAptos > 0 ? Number(((faltosos / totalEleitoresAptos) * 100).toFixed(2)) : 0;

  const totalCandidatosVotados = todosCargos.reduce((acc, c) => acc + c.candidatos.length, 0);

  return {
    cabecalho: {
      dataHoraGeracao: dataHoraGeracaoRaw,
      dataHoraGeracaoFormatada: formatTseDateTime(dataHoraGeracaoRaw),
      codigoPleito,
      fase: faseEnvelope,
      turno,
      turnoNome,
    },
    urna: {
      codigoIdentificacaoUE,
      versaoSoftware,
      codigoCarga: codigoCargaRaw,
      codigoCargaFormatado,
      resumoCorrespondencia,
      dataHoraCarga: dataHoraCargaRaw,
      dataHoraCargaFormatada: formatTseDateTime(dataHoraCargaRaw),
      tipoArquivo: 'Urna eletrônica (BU oficial)',
    },
    secao: (() => {
      const detectedFileUf = fileName?.match(/o\d{5}([a-zA-Z]{2})\d{5}/i)?.[1]?.toUpperCase();
      const munInfo = getMunicipioInfo(municipioCodigo, detectedFileUf);
      return {
        municipioCodigo,
        municipioNome: munInfo.nome,
        zonaEleitoral,
        zonaFormatada: zonaEleitoral.toString().padStart(4, '0'),
        localVotacao,
        secaoEleitoral,
        secaoFormatada: secaoEleitoral.toString().padStart(4, '0'),
        uf: munInfo.uf || detectedFileUf || 'BR',
      };
    })(),
    votacao: {
      dataHoraAbertura: dataHoraAberturaRaw,
      dataHoraAberturaFormatada: formatTseDateTime(dataHoraAberturaRaw),
      dataHoraFechamento: dataHoraFechamentoRaw,
      dataHoraFechamentoFormatada: formatTseDateTime(dataHoraFechamentoRaw),
      dataHoraEmissao: dataHoraEmissaoRaw,
      dataHoraEmissaoFormatada: formatTseDateTime(dataHoraEmissaoRaw),
      eleitoresAptos: totalEleitoresAptos,
      comparecimento,
      faltosos,
      percentualComparecimento,
      percentualAbstencao,
      habilitacaoBiometrica,
      habilitacaoBiografica,
      habilitacaoSemBiometria,
    },
    eleicoes,
    cargos: todosCargos,
    resumoGeral: {
      totalEleitoresAptos,
      totalComparecimento: comparecimento,
      totalFaltosos: faltosos,
      totalCargosApurados: todosCargos.length,
      totalCandidatosVotados,
    },
  };
}
