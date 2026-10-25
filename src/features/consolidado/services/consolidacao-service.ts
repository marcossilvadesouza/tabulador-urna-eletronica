import fs from 'fs';
import { listAllSecoes, getSecaoFiles } from '../../storage/storage-service';
import { parseBoletimUrnaBuffer } from '../../boletim-urna/services/bu-parser';
import { CargoApuracao, CandidatoVotacao, PartidoResumo, BoletimUrnaData } from '../../boletim-urna/types';
import { ResultadoConsolidadoData, SecaoResumoConsolidado } from '../types';

export function consolidarResultados(turno: 1 | 2 = 1): ResultadoConsolidadoData {
  const allSecoes = listAllSecoes();

  let totalEleitoresAptos = 0;
  let totalComparecimento = 0;
  let totalFaltosos = 0;
  let habilitacaoBiometrica = 0;
  let habilitacaoBiografica = 0;
  let habilitacaoSemBiometria = 0;

  const secoesResumo: SecaoResumoConsolidado[] = [];
  const buList: BoletimUrnaData[] = [];

  for (const s of allSecoes) {
    const { boletimPath } = getSecaoFiles(s.zona, s.secao, turno);
    if (!boletimPath || !fs.existsSync(boletimPath)) continue;

    try {
      const buf = fs.readFileSync(boletimPath);
      const bu = parseBoletimUrnaBuffer(buf, boletimPath);
      buList.push(bu);

      totalEleitoresAptos += bu.votacao.eleitoresAptos;
      totalComparecimento += bu.votacao.comparecimento;
      totalFaltosos += bu.votacao.faltosos;
      habilitacaoBiometrica += bu.votacao.habilitacaoBiometrica;
      habilitacaoBiografica += bu.votacao.habilitacaoBiografica;
      habilitacaoSemBiometria += bu.votacao.habilitacaoSemBiometria;

      secoesResumo.push({
        zona: bu.secao.zonaFormatada,
        secao: bu.secao.secaoFormatada,
        municipioNome: bu.secao.municipioNome,
        municipioCodigo: bu.secao.municipioCodigo,
        uf: bu.secao.uf,
        comparecimento: bu.votacao.comparecimento,
        eleitoresAptos: bu.votacao.eleitoresAptos,
        percentualComparecimento: bu.votacao.percentualComparecimento,
        dataHoraFechamento: bu.votacao.dataHoraFechamentoFormatada,
        codigoIdentificacaoUE: bu.urna.codigoIdentificacaoUE,
      });
    } catch (err) {
      console.error(`Erro ao consolidar seção ${s.zona}/${s.secao}:`, err);
    }
  }

  // Consolidate cargos
  const cargosMap: Record<number, {
    cargoId: number;
    cargoNome: string;
    eleicaoId: number;
    eleicaoNome: string;
    votosNominais: number;
    votosLegenda: number;
    votosBrancos: number;
    votosNulos: number;
    candidatosMap: Record<string, CandidatoVotacao>;
    legendaMap: Record<string, number>;
  }> = {};

  for (const bu of buList) {
    for (const c of bu.cargos) {
      if (!cargosMap[c.cargoId]) {
        cargosMap[c.cargoId] = {
          cargoId: c.cargoId,
          cargoNome: c.cargoNome,
          eleicaoId: c.eleicaoId,
          eleicaoNome: c.eleicaoNome,
          votosNominais: 0,
          votosLegenda: 0,
          votosBrancos: 0,
          votosNulos: 0,
          candidatosMap: {},
          legendaMap: {},
        };
      }

      const cg = cargosMap[c.cargoId];
      cg.votosNominais += c.votosNominais;
      cg.votosLegenda += c.votosLegenda;
      cg.votosBrancos += c.votosBrancos;
      cg.votosNulos += c.votosNulos;

      // Consolidate candidates
      for (const cand of c.candidatos) {
        if (!cg.candidatosMap[cand.numero]) {
          cg.candidatosMap[cand.numero] = {
            ...cand,
            votos: 0,
            percentualValidos: 0,
            percentualTotal: 0,
          };
        }
        cg.candidatosMap[cand.numero].votos += cand.votos;
        // If current name is better than a generic fallback, keep it
        if (!cg.candidatosMap[cand.numero].nome.startsWith('Candidato') && cand.nome.startsWith('Candidato')) {
          // keep existing
        } else if (cand.nome && !cand.nome.startsWith('Candidato')) {
          cg.candidatosMap[cand.numero].nome = cand.nome;
          cg.candidatosMap[cand.numero].partidoNome = cand.partidoNome;
        }
      }

      // Consolidate legenda
      for (const p of c.partidos) {
        if (p.votosLegenda > 0) {
          cg.legendaMap[p.numero] = (cg.legendaMap[p.numero] || 0) + p.votosLegenda;
        }
      }
    }
  }

  // Format final consolidated CargoApuracao list
  const cargosConsolidados: CargoApuracao[] = [];

  for (const [cargoIdStr, cg] of Object.entries(cargosMap)) {
    const cargoId = parseInt(cargoIdStr, 10);
    const totalValidos = cg.votosNominais + cg.votosLegenda;
    const totalApurado = totalValidos + cg.votosBrancos + cg.votosNulos;

    const candidatos = Object.values(cg.candidatosMap).sort((a, b) => b.votos - a.votos);

    for (const cand of candidatos) {
      cand.percentualValidos =
        totalValidos > 0 ? Number(((cand.votos / totalValidos) * 100).toFixed(2)) : 0;
      cand.percentualTotal =
        totalApurado > 0 ? Number(((cand.votos / totalApurado) * 100).toFixed(2)) : 0;
    }

    // Consolidate parties
    const partidosMap: Record<string, PartidoResumo> = {};
    for (const cand of candidatos) {
      const pNum = cand.partidoNumero;
      if (!partidosMap[pNum]) {
        partidosMap[pNum] = {
          numero: pNum,
          nome: cand.partidoNome,
          votosNominais: 0,
          votosLegenda: cg.legendaMap[pNum] || 0,
          totalVotos: 0,
          candidatos: [],
        };
      }
      partidosMap[pNum].votosNominais += cand.votos;
      partidosMap[pNum].candidatos.push(cand);
    }

    for (const [pNum, legVotes] of Object.entries(cg.legendaMap)) {
      if (!partidosMap[pNum]) {
        partidosMap[pNum] = {
          numero: pNum,
          nome: `Partido ${pNum}`,
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

    cargosConsolidados.push({
      cargoId,
      cargoNome: cg.cargoNome,
      eleicaoId: cg.eleicaoId,
      eleicaoNome: cg.eleicaoNome,
      eleitoresAptos: totalEleitoresAptos,
      eleitoresAptosOriginais: totalEleitoresAptos,
      eleitoresAptosTemporarios: 0,
      votosNominais: cg.votosNominais,
      votosLegenda: cg.votosLegenda,
      votosBrancos: cg.votosBrancos,
      votosNulos: cg.votosNulos,
      totalValidos,
      totalApurado,
      candidatos,
      partidos,
    });
  }

  // Sort in ballot order: 1 (Presidente), 3 (Governador), 5 (Senador), 6 (Deputado Federal), 7 (Deputado Estadual)
  cargosConsolidados.sort((a, b) => {
    const order = [1, 3, 5, 6, 7];
    return order.indexOf(a.cargoId) - order.indexOf(b.cargoId);
  });

  const percentualComparecimento =
    totalEleitoresAptos > 0
      ? Number(((totalComparecimento / totalEleitoresAptos) * 100).toFixed(2))
      : 0;

  const percentualAbstencao =
    totalEleitoresAptos > 0
      ? Number(((totalFaltosos / totalEleitoresAptos) * 100).toFixed(2))
      : 0;

  return {
    turno,
    turnoNome: turno === 1 ? '1º Turno' : '2º Turno',
    totalSecoesApuradas: secoesResumo.length,
    totalEleitoresAptos,
    totalComparecimento,
    totalFaltosos,
    percentualComparecimento,
    percentualAbstencao,
    habilitacaoBiometrica,
    habilitacaoBiografica,
    habilitacaoSemBiometria,
    secoes: secoesResumo,
    cargos: cargosConsolidados,
  };
}
