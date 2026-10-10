// Assembles an animated PNG from same-sized PNG frames without decoding them: the compressed image data of each frame is reused.
import { crc32 } from 'node:zlib';

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8); head.writeUInt32BE(data.length, 0); head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

function parts(png: Buffer): { ihdr: Buffer; idat: Buffer; others: Buffer[] } {
  let at = 8; const idat: Buffer[] = []; let ihdr: Buffer = Buffer.alloc(0);
  while (at < png.length) {
    const len = png.readUInt32BE(at), type = png.toString('ascii', at + 4, at + 8), data = png.subarray(at + 8, at + 8 + len);
    if (type === 'IHDR') ihdr = data; else if (type === 'IDAT') idat.push(data);
    at += 12 + len;
  }
  return { ihdr, idat: Buffer.concat(idat), others: [] };
}

export function apng(frames: Buffer[], delayMs: number): Buffer {
  const first = parts(frames[0]!);
  const width = first.ihdr.readUInt32BE(0), height = first.ihdr.readUInt32BE(4);
  const actl = Buffer.alloc(8); actl.writeUInt32BE(frames.length, 0); actl.writeUInt32BE(0, 4);
  const list: Buffer[] = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', first.ihdr), chunk('acTL', actl)];
  let seq = 0;
  const fctl = (): Buffer => {
    const d = Buffer.alloc(26); d.writeUInt32BE(seq++, 0); d.writeUInt32BE(width, 4); d.writeUInt32BE(height, 8); d.writeUInt32BE(0, 12); d.writeUInt32BE(0, 16);
    d.writeUInt16BE(delayMs, 20); d.writeUInt16BE(1000, 22); d[24] = 0; d[25] = 0; return chunk('fcTL', d);
  };
  frames.forEach((f, i) => {
    const p = parts(f);
    list.push(fctl());
    if (i === 0) list.push(chunk('IDAT', p.idat));
    else { const d = Buffer.alloc(4 + p.idat.length); d.writeUInt32BE(seq++, 0); p.idat.copy(d, 4); list.push(chunk('fdAT', d)); }
  });
  list.push(chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(list);
}
