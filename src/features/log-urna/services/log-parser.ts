import AdmZip from 'adm-zip';
import { HourlyVoterFlow, LogAnalysisResult, LogEntry, LogMilestone } from '../types';

function parseLogDate(dtStr: string): number {
  // 21/09/2026 08:43:35
  const parts = dtStr.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!parts) return 0;
  const d = new Date(
    parseInt(parts[3], 10),
    parseInt(parts[2], 10) - 1,
    parseInt(parts[1], 10),
    parseInt(parts[4], 10),
    parseInt(parts[5], 10),
    parseInt(parts[6], 10)
  );
  return d.getTime();
}

function categorizeMessage(modulo: string, msg: string): LogEntry['categoria'] {
  const m = msg.toLowerCase();
  if (m.includes('zerésima') || m.includes('zeresima')) return 'ZERESIMA';
  if (m.includes('voto') || m.includes('eleitor') || m.includes('votou') || m.includes('habilita')) {
    if (m.includes('biomet') || m.includes('digital') || m.includes('impressão')) return 'BIOMETRIA';
    return 'VOTACAO';
  }
  if (m.includes('abertura') || m.includes('iniciando') || m.includes('ligada') || m.includes('boot')) return 'BOOT';
  if (m.includes('encerramento') || m.includes('finalizada') || m.includes('fechamento')) return 'FECHAMENTO';
  if (m.includes('arquivo') || m.includes('mídia') || m.includes('midia') || m.includes('mr.ver') || m.includes('.jez')) return 'MIDIA';
  return 'SISTEMA';
}

export function parseLogJezBuffer(buffer: Buffer): LogAnalysisResult {
  let logContent = '';

  // Check if buffer is a ZIP (.jez starts with PK\x03\x04)
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    const logEntry = entries.find((e) => e.entryName.toLowerCase().includes('logd') || e.entryName.endsWith('.dat') || e.entryName.endsWith('.txt'));
    if (!logEntry) {
      throw new Error('Nenhum arquivo de log (logd.dat) encontrado no pacote .jez');
    }
    logContent = logEntry.getData().toString('latin1');
  } else {
    // Plain text logd.dat
    logContent = buffer.toString('latin1');
  }

  const rawLines = logContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const entries: LogEntry[] = [];
  const contagemPorModulo: Record<string, number> = {};
  const contagemPorNivel: Record<string, number> = {};
  const hourlyMap: Record<string, HourlyVoterFlow> = {};

  let urnaId = '';
  let versaoSoftware = '';
  let zona = '0035';
  let secao = '0574';
  let turno: 1 | 2 = 1;
  let biometriaTentativas = 0;
  let biometriaSucessos = 0;
  let liberacaoMesario = 0;

  const marcosOperacionais: LogMilestone[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const parts = line.split('\t');
    if (parts.length < 5) continue;

    const dataHora = parts[0].trim();
    const nivelRaw = parts[1].trim();
    const uId = parts[2].trim();
    const modulo = parts[3].trim();
    const mensagem = parts[4].trim();
    const hash = parts.length >= 6 ? parts[5].trim() : '';

    if (!urnaId && uId) urnaId = uId;

    const nivel: LogEntry['nivel'] =
      nivelRaw === 'ALERTA' ? 'ALERTA' : nivelRaw === 'ERRO' ? 'ERRO' : 'INFO';

    contagemPorModulo[modulo] = (contagemPorModulo[modulo] || 0) + 1;
    contagemPorNivel[nivel] = (contagemPorNivel[nivel] || 0) + 1;

    if (!versaoSoftware && mensagem.includes('Versão da aplicação:')) {
      versaoSoftware = mensagem.replace('Versão da aplicação:', '').trim();
    }

    // Identify Zona, Seção, Turno from log messages
    if (mensagem.includes('Zona Eleitoral:')) {
      const zm = mensagem.match(/Zona Eleitoral:\s*(\d+)/i);
      if (zm) zona = zm[1].padStart(4, '0');
    }
    if (mensagem.includes('Seção Eleitoral:')) {
      const sm = mensagem.match(/Seção Eleitoral:\s*(\d+)/i);
      if (sm) secao = sm[1].padStart(4, '0');
    }
    if (mensagem.includes('Turno da UE:') || mensagem.includes('Iniciando aplicação')) {
      if (mensagem.includes('2º turno') || mensagem.includes('segundo turno') || mensagem.includes('SEGUNDO TURNO')) {
        turno = 2;
      } else if (mensagem.includes('1º turno') || mensagem.includes('primeiro turno') || mensagem.includes('PRIMEIRO TURNO')) {
        turno = 1;
      }
    }

    const timestamp = parseLogDate(dataHora);
    const categoria = categorizeMessage(modulo, mensagem);

    const logEntryItem: LogEntry = {
      id: i + 1,
      dataHora,
      dataHoraFormatada: dataHora,
      timestamp,
      nivel,
      urnaId: uId,
      modulo,
      mensagem,
      hash,
      categoria,
    };
    entries.push(logEntryItem);

    // Milestones extraction
    if (mensagem.includes('Início das operações do logd') && marcosOperacionais.length === 0) {
      marcosOperacionais.push({
        tipo: 'BOOT',
        titulo: 'Inicialização do Logd',
        descricao: mensagem,
        dataHora,
        modulo,
        logLineId: i + 1,
      });
    } else if (mensagem.includes('Carga efetuada') || mensagem.includes('Carga da urna')) {
      marcosOperacionais.push({
        tipo: 'CARGA',
        titulo: 'Carga Oficial Efetivada',
        descricao: mensagem,
        dataHora,
        modulo,
        logLineId: i + 1,
      });
    } else if (mensagem.includes('Emissão da Zerésima') || mensagem.includes('Zerésima emitida')) {
      marcosOperacionais.push({
        tipo: 'ZERESIMA',
        titulo: 'Emissão da Zerésima',
        descricao: 'Comprovação de ausência de votos prévios antes do pleito',
        dataHora,
        modulo,
        logLineId: i + 1,
      });
    } else if (mensagem.includes('Abertura da urna') || mensagem.includes('Urna aberta para votação')) {
      marcosOperacionais.push({
        tipo: 'ABERTURA',
        titulo: 'Abertura da Seção',
        descricao: 'Início oficial do período de votação dos eleitores',
        dataHora,
        modulo,
        logLineId: i + 1,
      });
    } else if (mensagem.includes('Encerramento da eleição') || mensagem.includes('Encerramento da votação')) {
      marcosOperacionais.push({
        tipo: 'ENCERRAMENTO',
        titulo: 'Encerramento da Votação',
        descricao: 'Urna finalizou o processo de recepção de votos',
        dataHora,
        modulo,
        logLineId: i + 1,
      });
    } else if (mensagem.includes('Boletim de Urna') && mensagem.includes('impresso')) {
      marcosOperacionais.push({
        tipo: 'BU_IMPRESSO',
        titulo: 'Impressão do Boletim de Urna (BU)',
        descricao: 'Relatório físico oficial gerado pela urna eletrônica',
        dataHora,
        modulo,
        logLineId: i + 1,
      });
    } else if (mensagem.includes('Gerando arquivo de resultado') && mensagem.includes('[Início]')) {
      marcosOperacionais.push({
        tipo: 'GERACAO_ARQUIVOS',
        titulo: 'Geração de Arquivo Criptográfico',
        descricao: mensagem,
        dataHora,
        modulo,
        logLineId: i + 1,
      });
    }

    // Biometrics tracking
    if (mensagem.includes('Biometria') || mensagem.includes('digital')) {
      biometriaTentativas++;
      if (mensagem.includes('reconhecida') || mensagem.includes('sucesso') || mensagem.includes('identificado')) {
        biometriaSucessos++;
      }
    }
    if (mensagem.includes('mesário') && (mensagem.includes('libera') || mensagem.includes('código'))) {
      liberacaoMesario++;
    }

    // Hourly voter flow (only for day of election 04/10/2026)
    if (dataHora.startsWith('04/10/2026') && (mensagem.includes('O voto do eleitor foi computado') || mensagem.includes('computado') || mensagem.includes('voto confirmado'))) {
      const horaMatch = dataHora.match(/\s+(\d{2}):/);
      if (horaMatch) {
        const horaKey = `${horaMatch[1]}:00`;
        if (!hourlyMap[horaKey]) {
          hourlyMap[horaKey] = {
            hora: horaKey,
            votosRegistrados: 0,
            biometriasSucesso: 0,
            biometriasFalha: 0,
          };
        }
        hourlyMap[horaKey].votosRegistrados++;
      }
    }
  }

  // Fill in complete hour range from 07:00 to 16:00
  for (let h = 7; h <= 16; h++) {
    const hk = `${h.toString().padStart(2, '0')}:00`;
    if (!hourlyMap[hk]) {
      hourlyMap[hk] = {
        hora: hk,
        votosRegistrados: 0,
        biometriasSucesso: 0,
        biometriasFalha: 0,
      };
    }
  }

  const fluxoPorHora = Object.values(hourlyMap).sort((a, b) => a.hora.localeCompare(b.hora));

  return {
    totalLinhas: entries.length,
    urnaId,
    zona,
    secao,
    turno,
    turnoNome: turno === 1 ? '1º Turno' : '2º Turno',
    dataHoraInicio: entries[0]?.dataHora || '',
    dataHoraFim: entries[entries.length - 1]?.dataHora || '',
    versaoSoftware: versaoSoftware || '10.23.0.0 - Praia da Barra do Cahy',
    contagemPorModulo,
    contagemPorNivel,
    marcosOperacionais,
    fluxoPorHora,
    estatisticasBiometria: {
      totalTentativas: biometriaTentativas,
      sucessoBiometria: biometriaSucessos,
      liberacaoMesario,
    },
    linhas: entries,
  };
}
