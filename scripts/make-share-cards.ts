/**
 * Draws the preview pictures of the share cards (public/og/card-table.png, card-wedding.png, card-election.png, card-news.png,
 * 1200x630) with no browser and no package: shapes are drawn pixel by pixel (signed-distance shapes, smooth edges) and written as
 * a PNG with node:zlib. Run once and commit the files; nothing runs on the server.
 *
 *   node --experimental-strip-types scripts/make-share-cards.ts
 *
 * WhatsApp does not draw SVG and wants a picture under about 300 KB; each file here is far smaller. The picture carries no words:
 * the words of a card (the names, the result) are in the page's og:title and og:description (server/growth/share.ts), so the
 * same picture serves every card of its kind and nothing a player typed is ever drawn into a file.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const W = 1200, H = 630;
const root = resolve(import.meta.dirname, '..');

type Rgb = readonly [number, number, number];
const hex = (value: string): Rgb => [parseInt(value.slice(1, 3), 16), parseInt(value.slice(3, 5), 16), parseInt(value.slice(5, 7), 16)];

/** A shape: its signed distance to a point (negative inside) and its colour. */
interface Shape { dist(x: number, y: number): number; colour: Rgb; alpha?: number }
const circle = (cx: number, cy: number, r: number, colour: string, alpha = 1): Shape => ({ dist: (x, y) => Math.hypot(x - cx, y - cy) - r, colour: hex(colour), alpha });
const ring = (cx: number, cy: number, r: number, width: number, colour: string): Shape => ({ dist: (x, y) => Math.abs(Math.hypot(x - cx, y - cy) - r) - width / 2, colour: hex(colour) });
const box = (x0: number, y0: number, w: number, h: number, radius: number, colour: string, alpha = 1): Shape => ({
  dist: (x, y) => { const qx = Math.abs(x - (x0 + w / 2)) - (w / 2 - radius), qy = Math.abs(y - (y0 + h / 2)) - (h / 2 - radius); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius; },
  colour: hex(colour), alpha,
});
const line = (x0: number, y0: number, x1: number, y1: number, width: number, colour: string): Shape => ({
  dist: (x, y) => { const dx = x1 - x0, dy = y1 - y0, t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy))); return Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy)) - width / 2; },
  colour: hex(colour),
});
interface Scene { top: string; bottom: string; accent: string; shapes: Shape[] }

/** The skyline every card shares: small houses along the bottom, in the game's greens. */
function skyline(accent: string): Shape[] {
  const out: Shape[] = [];
  const houses: [number, number, string][] = [[40, 150, '#256b45'], [210, 210, '#2f7d52'], [400, 130, '#1f5c3b'], [560, 240, '#2b7049'], [780, 170, '#256b45'], [960, 120, '#1f5c3b'], [1090, 190, '#2f7d52']];
  for (const [x, h, colour] of houses) {
    out.push(box(x, H - 90 - h, 130, h + 90, 0, colour));
    out.push(box(x - 10, H - 100 - h, 150, 14, 0, accent, 0.85));
    out.push(box(x + 24, H - 70 - h, 28, 28, 4, '#ffffff', 0.22), box(x + 78, H - 70 - h, 28, 28, 4, '#ffffff', 0.22));
  }
  out.push(box(0, H - 90, W, 90, 0, '#0c1c14', 0.72));
  return out;
}

/** A playing card: white, a pip in the middle. */
const card = (x: number, y: number, pip: string): Shape[] => [box(x, y, 170, 240, 18, '#ffffff'), circle(x + 85, y + 120, 38, pip), box(x + 16, y + 16, 22, 22, 6, pip), box(x + 132, y + 202, 22, 22, 6, pip)];

const SCENES: Record<string, Scene> = {
  // A table game won: two cards and a gold cup.
  table: { top: '#1d4a34', bottom: '#122b1f', accent: '#e8a643', shapes: [
    circle(600, 250, 230, '#e8a643', 0.14),
    ...card(380, 120, '#c8372d'), ...card(650, 120, '#20232c'),
    box(552, 330, 96, 20, 6, '#e8a643'), box(582, 300, 36, 40, 4, '#e8a643'), box(530, 190, 140, 120, 30, '#f5c21b'), ring(530, 230, 28, 10, '#f5c21b'), ring(670, 230, 28, 10, '#f5c21b'),
  ] },
  // A wedding: two gold rings and a few sparks.
  wedding: { top: '#3b2a4a', bottom: '#1f1630', accent: '#f0c46a', shapes: [
    circle(600, 270, 250, '#f0c46a', 0.12),
    ring(520, 290, 120, 30, '#f0c46a'), ring(680, 290, 120, 30, '#e8a643'),
    circle(600, 150, 26, '#ffffff'), line(600, 100, 600, 200, 6, '#ffffff'), line(550, 150, 650, 150, 6, '#ffffff'),
    circle(330, 130, 10, '#ffffff', 0.8), circle(880, 120, 14, '#ffffff', 0.8), circle(300, 330, 8, '#ffffff', 0.7), circle(910, 340, 10, '#ffffff', 0.7),
  ] },
  // An election result: a ballot box with a paper going in.
  election: { top: '#1d4a34', bottom: '#102a40', accent: '#e8a643', shapes: [
    circle(600, 270, 240, '#ffffff', 0.08),
    box(430, 270, 340, 230, 20, '#e8f1ec'), box(500, 296, 200, 18, 9, '#183b2a'),
    box(520, 90, 160, 230, 14, '#ffffff'), line(552, 190, 590, 230, 16, '#2f9e5b'), line(590, 230, 650, 150, 16, '#2f9e5b'),
    box(430, 440, 340, 22, 0, '#e8a643'),
  ] },
  // News: a page with a headline and columns.
  news: { top: '#1d4a34', bottom: '#122b1f', accent: '#e8a643', shapes: [
    circle(600, 270, 240, '#e8a643', 0.1),
    box(380, 90, 440, 380, 24, '#ffffff'), box(416, 126, 368, 56, 10, '#183b2a'),
    box(416, 210, 168, 120, 12, '#cfe0d7'), ...[220, 252, 284, 316].map((y) => box(604, y, 180, 14, 7, '#9fb4a9')),
    ...[360, 392, 424].map((y) => box(416, y, 368, 14, 7, '#9fb4a9')),
  ] },
};

/** Blend the scene into raw RGB pixels. */
function paint(scene: Scene): Buffer {
  const top = hex(scene.top), bottom = hex(scene.bottom), shapes = [...scene.shapes, ...skyline(scene.accent)];
  // The skyline sits over the picture's motif but under nothing else: draw it first, then the motif.
  const ordered = [...shapes.slice(scene.shapes.length), ...shapes.slice(0, scene.shapes.length)];
  const data = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1);
    for (let x = 0; x < W; x++) {
      let r = top[0] + (bottom[0] - top[0]) * t, g = top[1] + (bottom[1] - top[1]) * t, b = top[2] + (bottom[2] - top[2]) * t;
      for (const shape of ordered) {
        const d = shape.dist(x + 0.5, y + 0.5);
        if (d > 0.75) continue;
        const cover = Math.max(0, Math.min(1, 0.5 - d)) * (shape.alpha ?? 1);
        r += (shape.colour[0] - r) * cover; g += (shape.colour[1] - g) * cover; b += (shape.colour[2] - b) * cover;
      }
      const at = (y * W + x) * 3;
      data[at] = Math.round(r); data[at + 1] = Math.round(g); data[at + 2] = Math.round(b);
    }
  }
  return data;
}

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buffer: Buffer): number => { let c = 0xffffffff; for (const byte of buffer) c = (crcTable[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type: string, body: Buffer): Buffer {
  const head = Buffer.alloc(8); head.writeUInt32BE(body.length, 0); head.write(type, 4, 'ascii');
  const tail = Buffer.alloc(4); tail.writeUInt32BE(crc(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, tail]);
}
/** A PNG of raw RGB pixels. Every row uses the "up" filter, which makes the smooth gradients compress to almost nothing. */
export function png(pixels: Buffer, width = W, height = H): Buffer {
  const stride = width * 3, raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = y === 0 ? 0 : 2;
    for (let i = 0; i < stride; i++) {
      const here = pixels[y * stride + i] ?? 0, above = y === 0 ? 0 : pixels[(y - 1) * stride + i] ?? 0;
      raw[y * (stride + 1) + 1 + i] = (here - above) & 0xff;
    }
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const out = resolve(root, 'public/og');
  mkdirSync(out, { recursive: true });
  for (const [kind, scene] of Object.entries(SCENES)) {
    const file = png(paint(scene));
    writeFileSync(resolve(out, `card-${kind}.png`), file);
    console.log(`public/og/card-${kind}.png ${(file.length / 1024).toFixed(1)} KB`);
  }
}
