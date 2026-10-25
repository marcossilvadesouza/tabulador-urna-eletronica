import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import path from 'path';
import { parseBoletimUrnaBuffer } from '@/features/boletim-urna/services/bu-parser';
import { parseLogJezBuffer } from '@/features/log-urna/services/log-parser';
import { decodeAsn1Buffer } from '@/features/asn1-inspector/services/asn1-decoder';
import { saveSecaoFile, listAllSecoes, padCode } from '@/features/storage/storage-service';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB limit
const MAX_ZIP_ENTRIES = 25;
const MAX_DECOMPRESSED_BYTES = 50 * 1024 * 1024; // 50MB limit
const ALLOWED_EXTENSIONS = ['.zip', '.dat', '.bu', '.jez', '.vsc'];

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo excede o tamanho máximo permitido de 15MB' },
        { status: 413 }
      );
    }

    const fileName = path.basename(file.name);
    const fileNameLower = fileName.toLowerCase();

    const isAllowedExt = ALLOWED_EXTENSIONS.some((ext) => fileNameLower.endsWith(ext));
    if (!isAllowedExt) {
      return NextResponse.json(
        { error: 'Extensão de arquivo não permitida. Apenas .zip, .dat, .bu, .jez ou .vsc são aceitos.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check if uploaded file is a ZIP package (like DadosDeUrna_...zip)
    const isZipPackage =
      fileNameLower.endsWith('.zip') ||
      (buffer.length >= 4 &&
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        !fileNameLower.endsWith('.jez') &&
        !fileNameLower.includes('log'));

    if (isZipPackage) {
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();

      if (entries.length === 0) {
        return NextResponse.json({ error: 'O arquivo ZIP está vazio' }, { status: 400 });
      }

      if (entries.length > MAX_ZIP_ENTRIES) {
        return NextResponse.json(
          { error: 'O pacote ZIP contém arquivos em excesso.' },
          { status: 400 }
        );
      }

      let totalDecompressed = 0;
      for (const entry of entries) {
        if (entry.entryName.includes('..') || path.isAbsolute(entry.entryName)) {
          return NextResponse.json(
            { error: 'Caminho inválido detectado no pacote ZIP (Path Traversal prevenido).' },
            { status: 400 }
          );
        }
        totalDecompressed += entry.header.size;
        if (totalDecompressed > MAX_DECOMPRESSED_BYTES) {
          return NextResponse.json(
            { error: 'Tamanho descompactado excede o limite de segurança.' },
            { status: 413 }
          );
        }
      }

      let buEntry = entries.find(
        (e) =>
          !e.isDirectory &&
          (e.entryName.toLowerCase().includes('-bu.dat') ||
            e.entryName.toLowerCase().includes('boletim') ||
            ((e.entryName.toLowerCase().endsWith('.dat') || e.entryName.toLowerCase().endsWith('.bu')) &&
              !e.entryName.toLowerCase().includes('rdv')))
      );

      let logEntry = entries.find(
        (e) =>
          !e.isDirectory &&
          (e.entryName.toLowerCase().endsWith('.jez') ||
            e.entryName.toLowerCase().includes('logd') ||
            e.entryName.toLowerCase().includes('-log.'))
      );

      let rdvEntry = entries.find(
        (e) => !e.isDirectory && e.entryName.toLowerCase().includes('rdv')
      );

      let vscEntry = entries.find(
        (e) => !e.isDirectory && (e.entryName.toLowerCase().endsWith('.vsc') || e.entryName.toLowerCase().includes('vota'))
      );

      let buResult = null;
      let logResult = null;
      let asn1Root = null;
      let detectedZona: string | null = null;
      let detectedSecao: string | null = null;
      let detectedTurno: 1 | 2 = 1;

      // 1. Process BU entry first
      let buBuffer: Buffer | null = null;
      if (buEntry) {
        buBuffer = buEntry.getData();
        try {
          buResult = parseBoletimUrnaBuffer(buBuffer, path.basename(buEntry.entryName));
          const asn1Tree = decodeAsn1Buffer(buBuffer);
          asn1Root = asn1Tree[0];

          detectedZona = buResult.secao.zonaFormatada;
          detectedSecao = buResult.secao.secaoFormatada;
          detectedTurno = buResult.cabecalho.turno;
        } catch (err: any) {
          console.error('Erro ao processar BU dentro do ZIP:', err);
        }
      }

      // 2. Process Log entry
      let logBuffer: Buffer | null = null;
      if (logEntry) {
        logBuffer = logEntry.getData();
        try {
          logResult = parseLogJezBuffer(logBuffer);
          if (!detectedZona && logResult.zona) detectedZona = logResult.zona;
          if (!detectedSecao && logResult.secao) detectedSecao = logResult.secao;
          if (!detectedTurno && logResult.turno) detectedTurno = logResult.turno;
        } catch (err: any) {
          console.error('Erro ao processar LOG dentro do ZIP:', err);
        }
      }

      // 3. Fallback to entry name or zip name regex
      const nameToCheck = buEntry?.entryName || logEntry?.entryName || fileName;
      const nameMatch = nameToCheck.match(/o\d{5}[a-zA-Z]{2}\d{5}(\d{4})(\d{4})/i);
      if (nameMatch) {
        if (!detectedZona) detectedZona = nameMatch[1];
        if (!detectedSecao) detectedSecao = nameMatch[2];
      }

      if (!detectedTurno) {
        if (
          fileNameLower.includes('o03221') ||
          fileNameLower.includes('o03222') ||
          fileNameLower.includes('turno2') ||
          fileNameLower.includes('turno_2')
        ) {
          detectedTurno = 2;
        } else {
          detectedTurno = 1;
        }
      }

      const finalZona = padCode(detectedZona || '0035', 4);
      const finalSecao = padCode(detectedSecao || '0574', 4);
      const savedFiles: string[] = [];
      let anyOverwritten = false;

      // Save BU
      if (buEntry && buBuffer) {
        const safeEntryName = path.basename(buEntry.entryName);
        const sRes = saveSecaoFile(buBuffer, safeEntryName, finalZona, finalSecao, detectedTurno, 'BOLETIM');
        savedFiles.push(safeEntryName);
        if (sRes.overwritten) anyOverwritten = true;
      }

      // Save Log
      if (logEntry && logBuffer) {
        const safeEntryName = path.basename(logEntry.entryName);
        const sRes = saveSecaoFile(logBuffer, safeEntryName, finalZona, finalSecao, detectedTurno, 'LOG');
        savedFiles.push(safeEntryName);
        if (sRes.overwritten) anyOverwritten = true;
      }

      // Save RDV
      if (rdvEntry) {
        const safeEntryName = path.basename(rdvEntry.entryName);
        const rdvBuffer = rdvEntry.getData();
        const sRes = saveSecaoFile(rdvBuffer, safeEntryName, finalZona, finalSecao, detectedTurno, 'RDV');
        savedFiles.push(safeEntryName);
        if (sRes.overwritten) anyOverwritten = true;
      }

      // Save VSC
      if (vscEntry) {
        const safeEntryName = path.basename(vscEntry.entryName);
        const vscBuffer = vscEntry.getData();
        const sRes = saveSecaoFile(vscBuffer, safeEntryName, finalZona, finalSecao, detectedTurno, 'VSC');
        savedFiles.push(safeEntryName);
        if (sRes.overwritten) anyOverwritten = true;
      }

      const allSecoes = listAllSecoes();

      return NextResponse.json({
        type: 'ZIP',
        zona: finalZona,
        secao: finalSecao,
        turno: detectedTurno,
        turnoNome: detectedTurno === 1 ? '1º Turno' : '2º Turno',
        savedFiles,
        overwritten: anyOverwritten,
        data: buResult || logResult,
        buData: buResult,
        logData: logResult,
        asn1Root,
        secoes: allSecoes,
      });
    }

    // Individual .jez log file
    if (fileNameLower.endsWith('.jez') || fileNameLower.includes('log')) {
      const logResult = parseLogJezBuffer(buffer);

      let zona = logResult.zona;
      let secao = logResult.secao;
      let turno: 1 | 2 = logResult.turno || 1;

      const nameMatch = fileName.match(/o\d{5}[a-zA-Z]{2}\d{5}(\d{4})(\d{4})/i);
      if (nameMatch) {
        if (!zona) zona = nameMatch[1];
        if (!secao) secao = nameMatch[2];
      }

      if (
        fileNameLower.includes('t2') ||
        fileNameLower.includes('turno2') ||
        fileNameLower.includes('turno_2') ||
        fileNameLower.includes('o03221') ||
        fileNameLower.includes('o03222')
      ) {
        turno = 2;
      }

      const finalZona = padCode(zona || '0035', 4);
      const finalSecao = padCode(secao || '0574', 4);

      const saveRes = saveSecaoFile(buffer, fileName, finalZona, finalSecao, turno, 'LOG');
      const allSecoes = listAllSecoes();

      return NextResponse.json({
        type: 'LOG',
        data: logResult,
        logData: logResult,
        zona: finalZona,
        secao: finalSecao,
        turno,
        turnoNome: turno === 1 ? '1º Turno' : '2º Turno',
        overwritten: saveRes.overwritten,
        secoes: allSecoes,
      });
    } else {
      // Individual Boletim de Urna (.dat / .bu)
      try {
        const buResult = parseBoletimUrnaBuffer(buffer, fileName);
        const asn1Result = decodeAsn1Buffer(buffer);

        let zona = buResult.secao.zonaFormatada;
        let secao = buResult.secao.secaoFormatada;
        let turno: 1 | 2 = buResult.cabecalho.turno;

        const nameMatch = fileName.match(/o\d{5}[a-zA-Z]{2}\d{5}(\d{4})(\d{4})/i);
        if (nameMatch) {
          if (!zona) zona = nameMatch[1];
          if (!secao) secao = nameMatch[2];
        }

        const finalZona = padCode(zona || '0035', 4);
        const finalSecao = padCode(secao || '0574', 4);

        const saveRes = saveSecaoFile(buffer, fileName, finalZona, finalSecao, turno, 'BOLETIM');
        const allSecoes = listAllSecoes();

        return NextResponse.json({
          type: 'BOLETIM',
          data: buResult,
          buData: buResult,
          asn1Root: asn1Result[0],
          fileSizeBytes: buffer.length,
          zona: finalZona,
          secao: finalSecao,
          turno,
          turnoNome: turno === 1 ? '1º Turno' : '2º Turno',
          overwritten: saveRes.overwritten,
          secoes: allSecoes,
        });
      } catch (err: any) {
        return NextResponse.json(
          { error: `Falha ao processar arquivo ${fileName}: ${err.message}` },
          { status: 422 }
        );
      }
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro no upload' }, { status: 500 });
  }
}
