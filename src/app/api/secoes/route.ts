import { NextResponse } from 'next/server';
import { listAllSecoes } from '@/features/storage/storage-service';

export async function GET() {
  try {
    const secoes = listAllSecoes();
    return NextResponse.json({ secoes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao listar seções' }, { status: 500 });
  }
}
