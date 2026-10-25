import { NextResponse } from 'next/server';
import fs from 'fs';
import { getSecaoFiles, listAllSecoes } from '@/features/storage/storage-service';
import { parseLogJezBuffer } from '@/features/log-urna/services/log-parser';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let zona = searchParams.get('zona');
    let secao = searchParams.get('secao');
    let turnoParam = searchParams.get('turno');
    let turno: 1 | 2 = turnoParam === '2' ? 2 : 1;

    const limitParam = searchParams.get('limit');
    const moduleParam = searchParams.get('module');
    const levelParam = searchParams.get('level');
    const queryParam = searchParams.get('q');

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

    const { logPath } = getSecaoFiles(zona, secao, turno);
    if (!logPath || !fs.existsSync(logPath)) {
      return NextResponse.json(
        {
          error: `Log da urna não encontrado para Zona ${zona}, Seção ${secao}, ${turno}º Turno`,
          notFound: true,
          zona,
          secao,
          turno,
        },
        { status: 404 }
      );
    }

    const buf = fs.readFileSync(logPath);
    const result = parseLogJezBuffer(buf);

    let filteredLinhas = result.linhas;

    if (moduleParam && moduleParam !== 'TODOS') {
      filteredLinhas = filteredLinhas.filter((l) => l.modulo === moduleParam);
    }
    if (levelParam && levelParam !== 'TODOS') {
      filteredLinhas = filteredLinhas.filter((l) => l.nivel === levelParam);
    }
    if (queryParam) {
      const q = queryParam.toLowerCase();
      filteredLinhas = filteredLinhas.filter((l) =>
        l.mensagem.toLowerCase().includes(q) ||
        l.dataHora.includes(q) ||
        l.modulo.toLowerCase().includes(q)
      );
    }

    const totalFiltradas = filteredLinhas.length;
    const limit = limitParam ? parseInt(limitParam, 10) : 500;
    const paginatedLinhas = filteredLinhas.slice(0, limit);

    return NextResponse.json({
      ...result,
      linhas: paginatedLinhas,
      totalFiltradas,
      filePath: logPath,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao processar log .jez' }, { status: 500 });
  }
}
