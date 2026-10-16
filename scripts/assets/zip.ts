// Minimal zip reader (stored and deflate entries) so fetch-pack.ts needs no unzip tool and no dependency.
import { inflateRawSync } from 'node:zlib';

export interface ZipEntry { name: string; size: number; read: () => Buffer }

export function readZip(zip: Buffer): ZipEntry[] {
  let end = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 65535); i--) if (zip.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error('not a zip file (no end-of-directory record)');
  const count = zip.readUInt16LE(end + 10);
  let at = zip.readUInt32LE(end + 16);
  const out: ZipEntry[] = [];
  for (let n = 0; n < count; n++) {
    if (zip.readUInt32LE(at) !== 0x02014b50) throw new Error('bad zip directory');
    const method = zip.readUInt16LE(at + 10), compressed = zip.readUInt32LE(at + 20), size = zip.readUInt32LE(at + 24);
    const nameLength = zip.readUInt16LE(at + 28), extra = zip.readUInt16LE(at + 30), comment = zip.readUInt16LE(at + 32);
    const local = zip.readUInt32LE(at + 42);
    const name = zip.toString('utf8', at + 46, at + 46 + nameLength);
    if (compressed === 0xffffffff || size === 0xffffffff) throw new Error('zip64 is not supported');
    out.push({ name, size, read: () => {
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + compressed);
      if (method === 0) return Buffer.from(data);
      if (method === 8) return inflateRawSync(data);
      throw new Error(`zip method ${method} is not supported`);
    } });
    at += 46 + nameLength + extra + comment;
  }
  return out;
}
