import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSecaoFiles, listAllSecoes } from '@/features/storage/storage-service';
import { parseBoletimUrnaBuffer } from '@/features/boletim-urna/services/bu-parser';
import { parseLogJezBuffer } from '@/features/log-urna/services/log-parser';
import { gerarRelatorioAuditoria } from '@/features/auditoria/services/auditoria-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let zona = searchParams.get('zona');
    let secao = searchParams.get('secao');
    let turnoParam = searchParams.get('turno');
    let turno: 1 | 2 = turnoParam === '2' ? 2 : 1;

    if (!zona || !secao) {
      const all = listAllSecoes();
      if (all.length > 0) {
        zona = all[0].zona;
        secao = all[0].secao;
      } else {
        zona = '0035';
        secao = '0574';
      }
    }

    const { boletimPath, logPath } = getSecaoFiles(zona, secao, turno);
    if (!boletimPath || !fs.existsSync(boletimPath)) {
      return NextResponse.json(
        {
          error: `Boletim não encontrado para auditoria em Zona ${zona}, Seção ${secao}, ${turno}º Turno`,
          notFound: true,
          zona,
          secao,
          turno,
        },
        { status: 404 }
      );
    }

    const buBuf = fs.readFileSync(boletimPath);
    const buData = parseBoletimUrnaBuffer(buBuf, path.basename(boletimPath));

    let logData;
    if (logPath && fs.existsSync(logPath)) {
      const logBuf = fs.readFileSync(logPath);
      logData = parseLogJezBuffer(logBuf);
    }

    const relatorio = gerarRelatorioAuditoria(buData, logData);
    return NextResponse.json({ ...relatorio, zona, secao, turno });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao gerar auditoria' }, { status: 500 });
  }
}
