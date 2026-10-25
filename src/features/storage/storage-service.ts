import fs from 'fs';
import path from 'path';
import os from 'os';
import { SecaoInfo, TurnoInfo } from './types';
import { getMunicipioInfo } from '../boletim-urna/services/municipio-lookup';

// Base directory for read-only static bundled sections
const BUNDLED_STORAGE_DIR = path.join(process.cwd(), 'storage');

// Check if running on Vercel or read-only serverless environment
const IS_VERCEL = process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
const RUNTIME_STORAGE_DIR = IS_VERCEL
  ? path.join(os.tmpdir(), 'urna_storage')
  : BUNDLED_STORAGE_DIR;

export function ensureStorageInit() {
  try {
    if (!fs.existsSync(RUNTIME_STORAGE_DIR)) {
      fs.mkdirSync(RUNTIME_STORAGE_DIR, { recursive: true });
    }
  } catch (e) {
    // Graceful fallback for read-only environments
  }
}

export function padCode(val: string | number, len = 4): string {
  const str = String(val).replace(/\D/g, '');
  return str.padStart(len, '0');
}

export function sanitizeFileName(fileName: string): string {
  const base = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!base || base === '.' || base === '..') {
    return `urna_${Date.now()}.dat`;
  }
  return base;
}

export function saveSecaoFile(
  buffer: Buffer,
  originalFileName: string,
  zona: string | number,
  secao: string | number,
  turno: 1 | 2,
  fileType: 'BOLETIM' | 'LOG' | 'RDV' | 'VSC' | 'GENERIC' = 'GENERIC'
): { savedPath: string; overwritten: boolean; targetDir: string } {
  ensureStorageInit();

  const safeFileName = sanitizeFileName(originalFileName);
  const zonaStr = padCode(zona, 4);
  const secaoStr = padCode(secao, 4);
  const targetDir = path.join(RUNTIME_STORAGE_DIR, `zona_${zonaStr}`, `secao_${secaoStr}`, `turno_${turno}`);

  let overwritten = false;

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const existingFiles = fs.readdirSync(targetDir);

    for (const f of existingFiles) {
      const fLower = f.toLowerCase();
      const isLog = fLower.endsWith('.jez') || fLower.includes('log');
      const isBu = (fLower.endsWith('.dat') || fLower.endsWith('.bu')) && !fLower.includes('rdv');
      const isRdv = fLower.includes('rdv');
      const isVsc = fLower.endsWith('.vsc') || fLower.includes('vota');

      if (
        (fileType === 'LOG' && isLog) ||
        (fileType === 'BOLETIM' && isBu) ||
        (fileType === 'RDV' && isRdv) ||
        (fileType === 'VSC' && isVsc) ||
        f.toLowerCase() === safeFileName.toLowerCase()
      ) {
        overwritten = true;
        if (f !== safeFileName) {
          try {
            fs.unlinkSync(path.join(targetDir, f));
          } catch (e) {}
        }
        break;
      }
    }

    const finalPath = path.join(targetDir, safeFileName);
    if (fs.existsSync(finalPath)) {
      overwritten = true;
    }
    fs.writeFileSync(finalPath, buffer);

    return {
      savedPath: safeFileName,
      overwritten,
      targetDir,
    };
  } catch (err) {
    return {
      savedPath: safeFileName,
      overwritten: false,
      targetDir,
    };
  }
}

export function listAllSecoes(): SecaoInfo[] {
  ensureStorageInit();

  const secoesMap = new Map<string, SecaoInfo>();
  const storageDirs = [BUNDLED_STORAGE_DIR];
  if (RUNTIME_STORAGE_DIR !== BUNDLED_STORAGE_DIR && fs.existsSync(RUNTIME_STORAGE_DIR)) {
    storageDirs.push(RUNTIME_STORAGE_DIR);
  }

  for (const storageDir of storageDirs) {
    if (!fs.existsSync(storageDir)) continue;

    let zonaDirs: string[] = [];
    try {
      zonaDirs = fs.readdirSync(storageDir).filter((d) => d.startsWith('zona_'));
    } catch {
      continue;
    }

    for (const zDir of zonaDirs) {
      const zona = zDir.replace('zona_', '');
      const zPath = path.join(storageDir, zDir);
      let secaoDirs: string[] = [];
      try {
        if (!fs.statSync(zPath).isDirectory()) continue;
        secaoDirs = fs.readdirSync(zPath).filter((d) => d.startsWith('secao_'));
      } catch {
        continue;
      }

      for (const sDir of secaoDirs) {
        const secao = sDir.replace('secao_', '');
        const sPath = path.join(zPath, sDir);
        try {
          if (!fs.statSync(sPath).isDirectory()) continue;
        } catch {
          continue;
        }

        const turnosDisponiveis: TurnoInfo[] = [];
        let detectedMunCodigo = 90514;
        let detectedUf = 'MS';

        for (const t of [1, 2] as (1 | 2)[]) {
          const tPath = path.join(sPath, `turno_${t}`);
          let hasBoletim = false;
          let hasLog = false;
          let boletimFileName: string | undefined;
          let logFileName: string | undefined;
          let updatedAt: string | undefined;

          if (fs.existsSync(tPath)) {
            try {
              const files = fs.readdirSync(tPath);
              for (const f of files) {
                const fLower = f.toLowerCase();
                const filePath = path.join(tPath, f);
                const stats = fs.statSync(filePath);
                updatedAt = stats.mtime.toISOString();

                if (fLower.endsWith('.jez') || fLower.includes('log')) {
                  hasLog = true;
                  logFileName = f;

                  const mMatchLog = f.match(/o\d{5}([a-zA-Z]{2})(\d{5})/i);
                  if (mMatchLog) {
                    detectedUf = mMatchLog[1].toUpperCase();
                    detectedMunCodigo = parseInt(mMatchLog[2], 10);
                  }
                } else if ((fLower.endsWith('.dat') || fLower.endsWith('.bu')) && !fLower.includes('rdv')) {
                  hasBoletim = true;
                  boletimFileName = f;

                  const mMatch = f.match(/o\d{5}([a-zA-Z]{2})(\d{5})/i);
                  if (mMatch) {
                    detectedUf = mMatch[1].toUpperCase();
                    detectedMunCodigo = parseInt(mMatch[2], 10);
                  }
                }
              }
            } catch {}
          }

          if (hasBoletim || hasLog) {
            turnosDisponiveis.push({
              turno: t,
              hasBoletim,
              hasLog,
              boletimFileName,
              logFileName,
              updatedAt,
            });
          }
        }

        if (turnosDisponiveis.length > 0) {
          const munInfo = getMunicipioInfo(detectedMunCodigo, detectedUf);
          const key = `${zona}-${secao}`;

          // If entry exists from previous directory, merge turnos
          const existing = secoesMap.get(key);
          if (existing) {
            const mergedTurnos = [...existing.turnosDisponiveis];
            for (const newT of turnosDisponiveis) {
              const idx = mergedTurnos.findIndex((t) => t.turno === newT.turno);
              if (idx >= 0) {
                mergedTurnos[idx] = newT;
              } else {
                mergedTurnos.push(newT);
              }
            }
            secoesMap.set(key, { ...existing, turnosDisponiveis: mergedTurnos });
          } else {
            secoesMap.set(key, {
              municipioCodigo: detectedMunCodigo,
              municipioNome: `${munInfo.nome} / ${munInfo.uf}`,
              zona,
              secao,
              turnosDisponiveis,
            });
          }
        }
      }
    }
  }

  return Array.from(secoesMap.values()).sort((a, b) => {
    if (a.zona !== b.zona) return a.zona.localeCompare(b.zona);
    return a.secao.localeCompare(b.secao);
  });
}

export function getSecaoFiles(
  zona: string | number,
  secao: string | number,
  turno: 1 | 2
): { boletimPath?: string; logPath?: string; exists: boolean } {
  ensureStorageInit();

  const zonaStr = padCode(zona, 4);
  const secaoStr = padCode(secao, 4);

  const searchDirs = [
    path.join(RUNTIME_STORAGE_DIR, `zona_${zonaStr}`, `secao_${secaoStr}`, `turno_${turno}`),
  ];
  if (RUNTIME_STORAGE_DIR !== BUNDLED_STORAGE_DIR) {
    searchDirs.push(path.join(BUNDLED_STORAGE_DIR, `zona_${zonaStr}`, `secao_${secaoStr}`, `turno_${turno}`));
  }

  for (const tDir of searchDirs) {
    if (fs.existsSync(tDir)) {
      try {
        const files = fs.readdirSync(tDir);
        let boletimPath: string | undefined;
        let logPath: string | undefined;

        for (const f of files) {
          const fLower = f.toLowerCase();
          const full = path.join(tDir, f);
          if (fLower.endsWith('.jez') || fLower.includes('log')) {
            logPath = full;
          } else if ((fLower.endsWith('.dat') || fLower.endsWith('.bu')) && !fLower.includes('rdv')) {
            boletimPath = full;
          }
        }

        if (boletimPath || logPath) {
          return {
            boletimPath,
            logPath,
            exists: true,
          };
        }
      } catch {}
    }
  }

  return { exists: false };
}
