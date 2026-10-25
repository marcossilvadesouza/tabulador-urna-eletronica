import { NextResponse } from 'next/server';
import { consolidarResultados } from '@/features/consolidado/services/consolidacao-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const turnoParam = searchParams.get('turno');
    const turno: 1 | 2 = turnoParam === '2' ? 2 : 1;

    const data = consolidarResultados(turno);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao consolidar resultados' }, { status: 500 });
  }
}
