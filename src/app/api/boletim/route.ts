import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSecaoFiles, listAllSecoes } from '@/features/storage/storage-service';
import { parseBoletimUrnaBuffer } from '@/features/boletim-urna/services/bu-parser';

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

    const { boletimPath } = getSecaoFiles(zona, secao, turno);
    if (!boletimPath || !fs.existsSync(boletimPath)) {
      return NextResponse.json(
        {
          error: `Boletim de Urna não encontrado para Zona ${zona}, Seção ${secao}, ${turno}º Turno`,
          notFound: true,
          zona,
          secao,
          turno,
        },
        { status: 404 }
      );
    }

    const buf = fs.readFileSync(boletimPath);
    const data = parseBoletimUrnaBuffer(buf, path.basename(boletimPath));
    return NextResponse.json({ ...data, fileName: path.basename(boletimPath) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao processar Boletim de Urna' }, { status: 500 });
  }
}
