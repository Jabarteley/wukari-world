// Procedural textures, made per pixel and written as PNG: two original ankara-style prints, a plain-cloth weave and the
// two hair textures. Nothing is copied from any print or brand; the motifs are circles, petals, diamonds and zigzags.
import { encodePng, rng } from './png.ts';

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function render(size: number, shade: (x: number, y: number) => RGB, samples = 2): Buffer {
  const px = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0;
    for (let sy = 0; sy < samples; sy++) for (let sx = 0; sx < samples; sx++) {
      const c = shade(x + (sx + 0.5) / samples, y + (sy + 0.5) / samples);
      r += c[0]; g += c[1]; b += c[2];
    }
    const n = samples * samples, i = (y * size + x) * 4;
    px[i] = Math.round(r / n); px[i + 1] = Math.round(g / n); px[i + 2] = Math.round(b / n); px[i + 3] = 255;
  }
  return encodePng(size, size, px, 3);
}

const wrap = (v: number, p: number): number => ((v % p) + p) % p;
/** Signed offset to the nearest lattice point of period p. */
const near = (v: number, p: number): number => { const w = wrap(v, p); return w > p / 2 ? w - p : w; };

export function ankaraA(): Buffer {
  const P = hex('#e9822b'), CREAM = hex('#f6ead0'), RED = hex('#c2352c'), GREEN = hex('#2f7f5f'), BROWN = hex('#6b2f1a'), GOLD = hex('#f0b43c');
  return render(256, (x, y) => {
    let c = P;
    // lattice of fine diagonal lines
    const d1 = Math.abs(near(x + y, 128)), d2 = Math.abs(near(x - y, 128));
    if (Math.min(d1, d2) < 1.4) c = GOLD;
    // zigzag bands across the tile at y = 0 and y = 128
    const zz = (v: number): number => Math.abs(near(v, 32)) * 0.5;
    const bandY = Math.abs(near(y, 128) - (zz(x) - 4));
    if (Math.abs(near(y, 128)) < 14 && bandY < 2.2) c = CREAM;
    // rosettes at (64,64) and (192,192)
    for (const [cx, cy] of [[64, 64], [192, 192]] as const) {
      const dx = near(x - cx, 256), dy = near(y - cy, 256), r = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
      if (r < 33) c = RED;
      if (r < 27 && r > 22) c = CREAM;
      if (r < 21) { const petal = 8 + 11 * (0.45 + 0.55 * Math.abs(Math.cos(4 * th))); c = r < petal ? GREEN : CREAM; if (r < 9) c = BROWN; if (r < 4) c = GOLD; }
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + Math.PI / 8, px = cx + Math.cos(a) * 41, py = cy + Math.sin(a) * 41; if (Math.hypot(near(x - px, 256), near(y - py, 256)) < 3.2) c = CREAM; }
    }
    // diamonds at (192,64) and (64,192)
    for (const [cx, cy] of [[192, 64], [64, 192]] as const) {
      const dx = Math.abs(near(x - cx, 256)), dy = Math.abs(near(y - cy, 256));
      if (dx + dy < 31) c = BROWN;
      if (dx + dy < 25) c = CREAM;
      if (dx + dy < 17) c = RED;
      if (dx + dy < 8) c = GOLD;
      for (const [ox, oy] of [[44, 0], [-44, 0], [0, 44], [0, -44]] as const) if (Math.hypot(near(x - (cx + ox), 256), near(y - (cy + oy), 256)) < 4) c = GREEN;
    }
    return c;
  });
}

export function ankaraB(): Buffer {
  const INDIGO = hex('#1f2f6b'), WHITE = hex('#f2efe6'), RUST = hex('#b4502a'), GOLD = hex('#e3a92e'), SKY = hex('#5d86c4');
  return render(256, (x, y) => {
    let c = INDIGO;
    // staggered scales
    const row = Math.floor(y / 32), ox = row % 2 ? 32 : 0;
    const sx = near(x - ox, 64), sy = wrap(y, 32);
    const sr = Math.hypot(sx, sy - 0);
    if (sr < 30 && sr > 26) c = SKY;
    if (sr < 20 && sr > 17) c = WHITE;
    // large circles with a flower
    for (const [cx, cy] of [[128, 128], [0, 0], [256, 0], [0, 256], [256, 256]] as const) {
      const r = Math.hypot(x - cx, y - cy), th = Math.atan2(y - cy, x - cx);
      if (r < 52) c = RUST;
      if (r < 47 && r > 43) c = GOLD;
      if (r < 40) c = WHITE;
      if (r < 34) { const pe = 10 + 22 * Math.abs(Math.sin(3 * th + 0.5)) ** 0.8; c = r < pe ? INDIGO : GOLD; if (r < 12) c = RUST; if (r < 5) c = WHITE; }
    }
    // dots on the axes
    for (const [px, py] of [[128, 36], [128, 220], [36, 128], [220, 128]] as const) if (Math.hypot(x - px, y - py) < 3.6) c = GOLD;
    return c;
  });
}

export function clothWeave(): Buffer {
  const rand = rng(11);
  const noise = new Float32Array(64 * 64); for (let i = 0; i < noise.length; i++) noise[i] = rand();
  return render(128, (x, y) => {
    const u = wrap(Math.floor(x / 2), 64), v = wrap(Math.floor(y / 2), 64);
    const warp = 0.5 + 0.5 * Math.sin(x * 1.57), weft = 0.5 + 0.5 * Math.sin(y * 1.57);
    const w = ((Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? warp : weft);
    const l = 0.84 + 0.1 * w + 0.06 * noise[v * 64 + u]!;
    const c = Math.round(255 * Math.min(1, l));
    return [c, c, c];
  }, 1);
}

function coilHeight(): (x: number, y: number) => { v: number; hi: number } {
  const rand = rng(5);
  const coils = Array.from({ length: 220 }, () => ({ x: rand() * 128, y: rand() * 128, r: 4 + rand() * 5, ph: rand() * 6.28 }));
  return (x, y) => {
    let v = 0.3, hi = 0;
    for (const c of coils) {
      const dx = near(x - c.x, 128), dy = near(y - c.y, 128), r = Math.hypot(dx, dy);
      if (r < c.r) { const a = Math.atan2(dy, dx) + c.ph; const ring = Math.abs(Math.sin(r * 1.35 + a * 0.5)); v = Math.max(v, 0.34 + 0.4 * ring * (1 - r / c.r * 0.35)); if (r < c.r * 0.55 && ring > 0.85) hi = Math.max(hi, 0.22); }
    }
    return { v, hi };
  };
}

export function hairCoil(): Buffer {
  const h = coilHeight();
  return render(128, (x, y) => { const { v, hi } = h(x, y); const c = Math.round(255 * Math.min(1, 0.45 + (v + hi) * 0.8)); return [c, c, c]; }, 1);
}

/** The same coils as a tangent-space normal map (strong, so the clumps read from far away). */
export function hairCoilNormal(): Buffer {
  const h = coilHeight();
  const H = (x: number, y: number): number => { const r = h(wrap(x, 128), wrap(y, 128)); return r.v + r.hi; };
  return render(128, (x, y) => {
    const px = Math.floor(x), py = Math.floor(y), k = 5;
    const dx = (H(px + 1, py) - H(px - 1, py)) * k, dy = (H(px, py + 1) - H(px, py - 1)) * k;
    const len = Math.hypot(dx, dy, 1);
    return [Math.round((-dx / len * 0.5 + 0.5) * 255), Math.round((dy / len * 0.5 + 0.5) * 255), Math.round((1 / len * 0.5 + 0.5) * 255)];
  }, 1);
}

/** u runs around a strand, v along it; plait chevrons, a darker rim and a soft highlight band. */
export function hairBraid(): Buffer {
  return render(128, (x, y) => {
    const u = x / 128, v = y / 128;
    const chev = 0.5 + 0.5 * Math.sin((v * 8 + Math.abs(u - 0.5) * 2.6) * Math.PI * 2);
    let l = 0.34 + 0.4 * chev;
    l *= 0.72 + 0.28 * Math.sin(u * Math.PI);
    l += 0.36 * Math.exp(-(((u - 0.3) / 0.1) ** 2));
    const c = Math.round(255 * Math.min(1, l));
    return [c, c, c];
  }, 2);
}
