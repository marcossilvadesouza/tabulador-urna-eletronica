import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import { parseBoletimUrnaBuffer } from '@/features/boletim-urna/services/bu-parser';
import { parseLogJezBuffer } from '@/features/log-urna/services/log-parser';
import { decodeAsn1Buffer } from '@/features/asn1-inspector/services/asn1-decoder';
import { saveSecaoFile, listAllSecoes, padCode } from '@/features/storage/storage-service';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name;
    const fileNameLower = fileName.toLowerCase();

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

      // 1. Process BU entry first - most authoritative source for Zona, Seção and Turno!
      let buBuffer: Buffer | null = null;
      if (buEntry) {
        buBuffer = buEntry.getData();
        try {
          buResult = parseBoletimUrnaBuffer(buBuffer, buEntry.entryName);
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

      // 3. Fallback to entry name or zip name regex (e.g. o03220ba3306500520115...)
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
        const sRes = saveSecaoFile(buBuffer, buEntry.entryName, finalZona, finalSecao, detectedTurno, 'BOLETIM');
        savedFiles.push(buEntry.entryName);
        if (sRes.overwritten) anyOverwritten = true;
      }

      // Save Log
      if (logEntry && logBuffer) {
        const sRes = saveSecaoFile(logBuffer, logEntry.entryName, finalZona, finalSecao, detectedTurno, 'LOG');
        savedFiles.push(logEntry.entryName);
        if (sRes.overwritten) anyOverwritten = true;
      }

      // Save RDV
      if (rdvEntry) {
        const rdvBuffer = rdvEntry.getData();
        const sRes = saveSecaoFile(rdvBuffer, rdvEntry.entryName, finalZona, finalSecao, detectedTurno, 'RDV');
        savedFiles.push(rdvEntry.entryName);
        if (sRes.overwritten) anyOverwritten = true;
      }

      // Save VSC
      if (vscEntry) {
        const vscBuffer = vscEntry.getData();
        const sRes = saveSecaoFile(vscBuffer, vscEntry.entryName, finalZona, finalSecao, detectedTurno, 'VSC');
        savedFiles.push(vscEntry.entryName);
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
        savedPath: saveRes.savedPath,
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
          savedPath: saveRes.savedPath,
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
