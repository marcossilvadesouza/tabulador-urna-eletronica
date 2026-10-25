import { Asn1Node } from '../types';

const TAG_NAMES: Record<number, string> = {
  0x01: 'BOOLEAN',
  0x02: 'INTEGER',
  0x03: 'BIT STRING',
  0x04: 'OCTET STRING',
  0x05: 'NULL',
  0x06: 'OBJECT IDENTIFIER',
  0x0a: 'ENUMERATED',
  0x0c: 'UTF8String',
  0x12: 'NumericString',
  0x13: 'PrintableString',
  0x14: 'TeletexString',
  0x16: 'IA5String',
  0x17: 'UTCTime',
  0x18: 'GeneralizedTime',
  0x1a: 'VisibleString',
  0x1b: 'GeneralString',
  0x1c: 'UniversalString',
  0x1e: 'BMPString',
  0x30: 'SEQUENCE',
  0x31: 'SET',
};

export function decodeAsn1Buffer(
  buf: Buffer,
  start = 0,
  end = buf.length,
  depth = 0,
  parentPath = ''
): Asn1Node[] {
  const nodes: Asn1Node[] = [];
  let p = start;
  let indexInParent = 0;

  while (p < end) {
    const itemOffset = p;
    if (p >= buf.length) break;

    const tag = buf[p++];
    if (tag === 0x00 && p < end && buf[p] === 0x00) {
      // EOC (End of Content)
      p++;
      continue;
    }

    // Length decoding
    if (p >= end) break;
    let lenByte = buf[p++];
    let length = 0;
    if (lenByte & 0x80) {
      const numBytes = lenByte & 0x7f;
      if (numBytes > 4) {
        length = 0;
      } else {
        for (let i = 0; i < numBytes; i++) {
          length = (length << 8) | buf[p++];
        }
      }
    } else {
      length = lenByte;
    }

    const headerLength = p - itemOffset;
    const valueOffset = p;
    const itemEnd = Math.min(valueOffset + length, end);
    p = itemEnd;

    const valBuf = buf.subarray(valueOffset, itemEnd);
    const isConstructed = (tag & 0x20) !== 0;
    const tagNum = tag & 0x1f;
    const classNum = tag >> 6;
    let tagClass: Asn1Node['tagClass'] = 'UNIVERSAL';
    if (classNum === 1) tagClass = 'APPLICATION';
    else if (classNum === 2) tagClass = 'CONTEXT-SPECIFIC';
    else if (classNum === 3) tagClass = 'PRIVATE';

    let typeName = tagClass === 'UNIVERSAL' ? (TAG_NAMES[tag] || `TAG_${tagNum}`) : `[${tagNum}]`;
    const path = parentPath ? `${parentPath}/${indexInParent}[${typeName}]` : `0[${typeName}]`;

    const node: Asn1Node = {
      tag,
      tagHex: '0x' + tag.toString(16).padStart(2, '0').toUpperCase(),
      tagNum,
      tagClass,
      tagClassName: tagClass,
      isConstructed,
      length,
      offset: itemOffset,
      headerLength,
      depth,
      typeName,
      path,
      rawBytesPreview: valBuf.subarray(0, 32).toString('hex'),
    };

    // Check if this node is constructed OR an encapsulated OCTET STRING with inner ASN.1
    const looksLikeInnerAsn1 =
      tag === 0x04 &&
      valBuf.length >= 2 &&
      (valBuf[0] === 0x30 || valBuf[0] === 0x04 || valBuf[0] === 0xa0);

    if (isConstructed || looksLikeInnerAsn1) {
      try {
        const children = decodeAsn1Buffer(buf, valueOffset, itemEnd, depth + 1, path);
        if (children.length > 0) {
          node.children = children;
        }
      } catch (err) {
        // Fall back to raw
      }
    }

    if (!node.children || node.children.length === 0) {
      // Primitive decoding
      if (tag === 0x02 || (tagClass === 'CONTEXT-SPECIFIC' && length <= 8 && length > 0)) {
        // Integer
        try {
          let v = 0n;
          for (const b of valBuf) {
            v = (v << 8n) | BigInt(b);
          }
          node.number = v.toString();
        } catch {
          // ignore
        }
      }

      // Check printable text
      const isPrintable =
        valBuf.length > 0 &&
        valBuf.every((b) => (b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13);
      if (isPrintable) {
        node.text = valBuf.toString('utf-8');
      } else {
        node.hex = valBuf.toString('hex');
      }
    }

    nodes.push(node);
    indexInParent++;
  }

  return nodes;
}
