import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSecaoFiles, listAllSecoes } from '@/features/storage/storage-service';
import { decodeAsn1Buffer } from '@/features/asn1-inspector/services/asn1-decoder';

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
          error: `Arquivo .dat não encontrado para Zona ${zona}, Seção ${secao}, ${turno}º Turno`,
          notFound: true,
          zona,
          secao,
          turno,
        },
        { status: 404 }
      );
    }

    const buf = fs.readFileSync(boletimPath);
    const nodes = decodeAsn1Buffer(buf);

    let totalNodes = 0;
    const countNodes = (list: any[]) => {
      for (const n of list) {
        totalNodes++;
        if (n.children) countNodes(n.children);
      }
    };
    countNodes(nodes);

    return NextResponse.json({
      fileName: path.basename(boletimPath),
      fileSizeBytes: buf.length,
      nodesCount: totalNodes,
      root: nodes[0],
      zona,
      secao,
      turno,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao decodificar ASN.1' }, { status: 500 });
  }
}
