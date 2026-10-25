import tseMunicipiosRaw from './tse-municipios.json';

export interface MunicipioInfo {
  nome: string;
  uf: string;
}

const tseMunicipios: Record<string, MunicipioInfo> = tseMunicipiosRaw as Record<string, MunicipioInfo>;

export function getMunicipioInfo(codigo: number | string, fallbackUf?: string): MunicipioInfo {
  const codeStr = String(codigo).trim();
  if (tseMunicipios[codeStr]) {
    return tseMunicipios[codeStr];
  }
  return {
    nome: `Município ${codigo}`,
    uf: fallbackUf || 'BR',
  };
}
