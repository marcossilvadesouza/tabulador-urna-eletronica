export interface Asn1Node {
  tag: number;
  tagHex: string;
  tagNum: number;
  tagClass: 'UNIVERSAL' | 'APPLICATION' | 'CONTEXT-SPECIFIC' | 'PRIVATE';
  tagClassName: string;
  isConstructed: boolean;
  length: number;
  offset: number;
  headerLength: number;
  depth: number;
  typeName: string;
  path: string;
  text?: string;
  number?: string;
  hex?: string;
  rawBytesPreview?: string;
  children?: Asn1Node[];
}

export interface Asn1DecodeResult {
  fileName: string;
  fileSizeBytes: number;
  root: Asn1Node;
  nodesCount: number;
}
