// Hair and headwear.  Styles that are a shape of the scalp (low cut, fade, afro, puff, cornrows, locs, head tie, cap) are made here, in the page, from the head that is on the figure:
// the triangles of the head above a hairline are lifted along their normals, so the hair fits every head exactly, covers the scalp completely (no scalp shows through) and can be any
// colour.  Styles that need real modelled strands (long braids, the gele) are read from small generated pieces, cut away from their original head and re-fitted to the head's box.
import * as THREE from 'three';
import type { Library, HeadMeta, Look } from './parts.ts';

export interface HairPiece { mesh: THREE.SkinnedMesh; tinted?: { dispose(): void; material: THREE.Material }[] }
export interface HairStyle { id: string; label: string; sex?: 'male' | 'female'; kind: 'hair' | 'wear' }
export const HAIR_STYLES: HairStyle[] = [
  { id: 'none', label: 'Bald', kind: 'hair' }, { id: 'low', label: 'Low cut', kind: 'hair' }, { id: 'fade', label: 'Fade', kind: 'hair' }, { id: 'afro', label: 'Afro', kind: 'hair' },
  { id: 'cornrows', label: 'Cornrows', kind: 'hair' }, { id: 'puff', label: 'Puff', kind: 'hair' }, { id: 'locs', label: 'Locs', kind: 'hair' }, { id: 'braids', label: 'Long braids', kind: 'hair', sex: 'female' },
];
export const WEAR_STYLES: HairStyle[] = [
  { id: 'none', label: 'None', kind: 'wear' }, { id: 'fila', label: 'Cap (fila)', kind: 'wear', sex: 'male' }, { id: 'scarf', label: 'Headscarf', kind: 'wear', sex: 'female' }, { id: 'gele', label: 'Gele', kind: 'wear', sex: 'female' },
];

const smooth = (t: number): number => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const hash = (x: number, y: number, z: number): number => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi, u = smooth(xf), v = smooth(yf), w = smooth(zf);
  const l = (a: number, b: number, t: number): number => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number): number => hash(xi + dx, yi + dy, zi + dz);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
}

interface Ctx {
  pos: ArrayLike<number>; nrm: ArrayLike<number>; index: ArrayLike<number>; eyeY: number; cx: number; cz: number; halfW: number; halfD: number; crown: number; chin: number;
  skin: THREE.Color; hairCol: THREE.Color; headBone: number; spine: number; neck: number;
}

/** The hairline: how far above the eye line the hair starts, by how far forward the point is (1 at the brow, 0 at the ear, -1 at the nape). */
function hairline(style: string, t: number): number {
  const front = 0.082, temple = 0.05, back = style === 'fade' ? -0.02 : -0.05;
  const a = t > 0.5 ? front : t > -0.1 ? temple + (front - temple) * smooth((t + 0.1) / 0.6) : temple + (back - temple) * smooth((-0.1 - t) / 0.9);
  return a;
}

function selectCap(c: Ctx, style: string): number[] {
  const sel: number[] = [];
  for (let i = 0; i < c.index.length; i += 3) {
    const a = c.index[i]!, b = c.index[i + 1]!, d = c.index[i + 2]!;
    const x = (c.pos[a * 3]! + c.pos[b * 3]! + c.pos[d * 3]!) / 3, y = (c.pos[a * 3 + 1]! + c.pos[b * 3 + 1]! + c.pos[d * 3 + 1]!) / 3, z = (c.pos[a * 3 + 2]! + c.pos[b * 3 + 2]! + c.pos[d * 3 + 2]!) / 3;
    const t = (z - c.cz) / c.halfD, dx = Math.abs(x - c.cx) / c.halfW;
    if (y < c.eyeY + hairline(style, t)) continue;
    if (dx > 0.80 && y < c.eyeY + 0.085 && t > -0.6 && t < 0.45) continue;      // the ears
    sel.push(a, b, d);
  }
  return sel;
}

function binding(n: number, bone: number, spine: number, w: (i: number) => number = () => 0): { idx: THREE.Uint16BufferAttribute; wt: THREE.Float32BufferAttribute } {
  const idx = new Uint16Array(n * 4), wt = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { const s = w(i); idx[i * 4] = bone; wt[i * 4] = 1 - s; idx[i * 4 + 1] = spine; wt[i * 4 + 1] = s; }
  return { idx: new THREE.Uint16BufferAttribute(idx, 4), wt: new THREE.Float32BufferAttribute(wt, 4) };
}

function material(color: THREE.Color, map?: THREE.Texture | null, vertexColors = false): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: vertexColors ? 0xffffff : color, map: map ?? null, vertexColors, roughness: 0.82, metalness: 0, side: THREE.DoubleSide });
}

function stripes(hair: THREE.Color, skin: THREE.Color): THREE.CanvasTexture {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d')!;
  const css = (c: THREE.Color, k = 1): string => { const s = c.clone().convertLinearToSRGB(); return `rgb(${Math.min(255, s.r * 255 * k) | 0},${Math.min(255, s.g * 255 * k) | 0},${Math.min(255, s.b * 255 * k) | 0})`; };
  g.fillStyle = css(hair, 0.8); g.fillRect(0, 0, S, S);
  const rows = 9;
  for (let i = -(rows - 1) / 2; i <= (rows - 1) / 2; i++) {
    const x0 = S * (0.5 + i * 0.095), x1 = S * (0.5 + i * 0.055);
    g.lineCap = 'round';
    g.strokeStyle = css(hair, 1.35); g.lineWidth = 9; g.beginPath(); g.moveTo(x0, S * 0.02); g.quadraticCurveTo((x0 + x1) / 2 + i * 2, S * 0.5, x1, S * 0.98); g.stroke();
    g.strokeStyle = css(hair, 0.55); g.lineWidth = 2; g.beginPath(); g.moveTo(x0 + 6, S * 0.02); g.quadraticCurveTo((x0 + x1) / 2 + 6 + i * 2, S * 0.5, x1 + 6, S * 0.98); g.stroke();
    g.strokeStyle = css(skin, 0.7); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0 - 6, S * 0.02); g.quadraticCurveTo((x0 + x1) / 2 - 6 + i * 2, S * 0.5, x1 - 6, S * 0.98); g.stroke();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

function capMesh(c: Ctx, style: string, sel: number[]): { geometry: THREE.BufferGeometry; vcol: boolean } {
  const remap = new Map<number, number>(), src: number[] = [];
  for (const v of sel) if (!remap.has(v)) { remap.set(v, src.length); src.push(v); }
  const n = src.length, pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
  const C = new THREE.Vector3(c.cx, c.eyeY + 0.05, c.cz);
  for (let k = 0; k < n; k++) {
    const v = src[k]!;
    let x = c.pos[v * 3]!, y = c.pos[v * 3 + 1]!, z = c.pos[v * 3 + 2]!; const nx = c.nrm[v * 3]!, ny = c.nrm[v * 3 + 1]!, nz = c.nrm[v * 3 + 2]!;
    const t = (z - c.cz) / c.halfD, hl = c.eyeY + hairline(style, t), edge = smooth((y - hl) / 0.05);
    let lift = 0.0045;
    if (style === 'afro') {
      const taper = 0.25 + 0.75 * edge, k2 = 1 + 0.2 * taper;
      x = C.x + (x - C.x) * k2; y = C.y + (y - C.y) * (1 + 0.14 * taper); z = C.z + (z - C.z) * k2;
      lift = 0.012 + 0.018 * taper + 0.018 * taper * (noise3(x * 60, y * 60, z * 60) - 0.3);
    } else if (style === 'puff' || style === 'locs') lift = 0.006;
    else if (style === 'fade') lift = 0.003 + 0.002 * edge;
    pos[k * 3] = x + nx * lift; pos[k * 3 + 1] = y + ny * lift; pos[k * 3 + 2] = z + nz * lift;
    nrm[k * 3] = nx; nrm[k * 3 + 1] = ny; nrm[k * 3 + 2] = nz;
    uv[k * 2] = (x - c.cx) / (2 * c.halfW) + 0.5; uv[k * 2 + 1] = (z - c.cz) / (2 * c.halfD) + 0.5;
    // fade: hair on top, skin-dark at the sides and back
    let f = 1;
    if (style === 'fade') f = t > 0.5 ? 1 : smooth((y - (c.eyeY + 0.085 + 0.02 * (t > 0 ? 1 : 0) - 0.015)) / 0.07);
    const base = c.hairCol, sk = c.skin;
    col[k * 3] = sk.r * 0.55 + (base.r - sk.r * 0.55) * f; col[k * 3 + 1] = sk.g * 0.55 + (base.g - sk.g * 0.55) * f; col[k * 3 + 2] = sk.b * 0.55 + (base.b - sk.b * 0.55) * f;
  }
  const ix = new Uint16Array(sel.length); for (let i = 0; i < sel.length; i++) ix[i] = remap.get(sel[i]!)!;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geometry.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3)); geometry.setIndex(new THREE.BufferAttribute(ix, 1));
  const b = binding(n, c.headBone, c.spine); geometry.setAttribute('skinIndex', b.idx); geometry.setAttribute('skinWeight', b.wt);
  return { geometry, vcol: style === 'fade' };
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // all parts carry position, normal, uv, color (optional), skinIndex, skinWeight and an index
  let nv = 0, ni = 0; for (const p of parts) { nv += p.getAttribute('position').count; ni += p.index!.count; }
  const attr = (name: string, size: number, Type: typeof Float32Array | typeof Uint16Array): THREE.BufferAttribute => {
    const a = new Type(nv * size); let o = 0;
    for (const p of parts) { const s = p.getAttribute(name); const cnt = p.getAttribute('position').count; if (s) for (let i = 0; i < cnt; i++) for (let k = 0; k < size; k++) a[o + i * size + k] = s.getComponent(i, k); o += cnt * size; }
    return new THREE.BufferAttribute(a, size);
  };
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', attr('position', 3, Float32Array)); g.setAttribute('normal', attr('normal', 3, Float32Array)); g.setAttribute('uv', attr('uv', 2, Float32Array));
  g.setAttribute('color', attr('color', 3, Float32Array)); g.setAttribute('skinIndex', attr('skinIndex', 4, Uint16Array)); g.setAttribute('skinWeight', attr('skinWeight', 4, Float32Array));
  const ix = new Uint16Array(ni); let o = 0, base = 0; for (const p of parts) { const a = p.index!.array; for (let i = 0; i < a.length; i++) ix[o + i] = a[i]! + base; o += a.length; base += p.getAttribute('position').count; }
  g.setIndex(new THREE.BufferAttribute(ix, 1)); return g;
}

function withAttrs(g: THREE.BufferGeometry, bone: number, spine: number, color: THREE.Color): THREE.BufferGeometry {
  const n = g.getAttribute('position').count;
  if (!g.getAttribute('color')) { const c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { c[i * 3] = color.r; c[i * 3 + 1] = color.g; c[i * 3 + 2] = color.b; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
  if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (!g.getAttribute('skinIndex')) { const b = binding(n, bone, spine); g.setAttribute('skinIndex', b.idx); g.setAttribute('skinWeight', b.wt); }
  return g;
}

/** A tapering three-sided strand from a root, going out a little and then down. */
function strand(root: THREE.Vector3, out: THREE.Vector3, len: number, r: number, segs: number, sway: number): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segs; i++) { const t = i / segs; pts.push(new THREE.Vector3(root.x + out.x * 0.03 * Math.sin(Math.PI * Math.min(1, t * 1.4) * 0.5) + sway * t * t, root.y - len * t + out.y * 0.01, root.z + out.z * 0.03 * Math.sin(Math.PI * Math.min(1, t * 1.4) * 0.5))); }
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= segs; i++) { const rr = r * (1 - 0.55 * i / segs); for (let s = 0; s < 3; s++) { const a = s * Math.PI * 2 / 3; pos.push(pts[i]!.x + Math.cos(a) * rr, pts[i]!.y, pts[i]!.z + Math.sin(a) * rr); } }
  for (let i = 0; i < segs; i++) for (let s = 0; s < 3; s++) { const a = i * 3 + s, b = i * 3 + (s + 1) % 3, c = a + 3, d = b + 3; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

function lathe(rings: { y: number; rx: number; rz: number; dz?: number }[], seg: number, cx: number, cz: number): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = [];
  for (const r of rings) for (let s = 0; s < seg; s++) { const a = s / seg * Math.PI * 2; pos.push(cx + Math.cos(a) * r.rx, r.y, cz + (r.dz ?? 0) + Math.sin(a) * r.rz); }
  for (let i = 0; i < rings.length - 1; i++) for (let s = 0; s < seg; s++) { const a = i * seg + s, b = i * seg + (s + 1) % seg, c = a + seg, d = b + seg; idx.push(a, c, b, b, c, d); }
  const top = pos.length / 3; pos.push(cx, rings[rings.length - 1]!.y, cz + (rings[rings.length - 1]!.dz ?? 0));
  const last = (rings.length - 1) * seg; for (let s = 0; s < seg; s++) idx.push(last + s, top, last + (s + 1) % seg);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

export interface HairArgs { lib: Library; look: Look; head: HeadMeta; dy: number; geometry: THREE.BufferGeometry; skeleton: THREE.Skeleton; bindMatrix: THREE.Matrix4 }

export async function buildHair(a: HairArgs): Promise<HairPiece[]> {
  const { look } = a;
  const style = look.hair ?? 'none', wear = look.headwear ?? 'none';
  if (style === 'none' && wear === 'none') return [];
  const names = a.skeleton.bones.map((b) => b.name);
  const pos = a.geometry.getAttribute('position').array, nrm = a.geometry.getAttribute('normal');
  const nArr = new Float32Array(nrm.count * 3); for (let i = 0; i < nrm.count; i++) { nArr[i * 3] = nrm.getX(i); nArr[i * 3 + 1] = nrm.getY(i); nArr[i * 3 + 2] = nrm.getZ(i); }
  const box = a.head.box, eyeY = (a.head.eyes.eyeL[1] + a.head.eyes.eyeR[1]) / 2 + a.dy;
  const hairCol = new THREE.Color(look.hairColor ?? '#1b1512'), skin = new THREE.Color(look.skin);
  const ctx: Ctx = {
    pos, nrm: nArr, index: a.geometry.index!.array, eyeY, cx: (box.xmin + box.xmax) / 2, cz: (box.zmin + box.zmax) / 2, halfW: (box.xmax - box.xmin) / 2, halfD: (box.zmax - box.zmin) / 2,
    crown: a.head.crownY + a.dy, chin: a.head.chinY + a.dy, skin, hairCol, headBone: names.indexOf('Head'), spine: names.indexOf('spine_03'), neck: names.indexOf('neck_01'),
  };
  const geoms: THREE.BufferGeometry[] = [], mats: THREE.Material[] = [];
  const out: HairPiece[] = [];
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material): void => {
    const m = new THREE.SkinnedMesh(geo, mat); m.frustumCulled = false; m.bind(a.skeleton, a.bindMatrix); out.push({ mesh: m, tinted: [{ material: mat, dispose: () => mat.dispose() }] }); void geoms; void mats;
  };
  const wearOn = wear !== 'none';
  if (style !== 'none' && !(wearOn && (wear === 'gele' || wear === 'scarf'))) {
    const sel = selectCap(ctx, style === 'braids' || style === 'locs' ? 'low' : style);
    const { geometry, vcol } = capMesh(ctx, style === 'braids' || style === 'locs' ? 'low' : style, sel);
    const parts = [geometry];
    if (style === 'puff') {
      const s = new THREE.SphereGeometry(0.062, 12, 9); s.translate(ctx.cx, ctx.crown - 0.045, ctx.cz - ctx.halfD * 0.62);
      const p = s.getAttribute('position'); for (let i = 0; i < p.count; i++) { const k = 1 + 0.12 * (noise3(p.getX(i) * 70, p.getY(i) * 70, p.getZ(i) * 70) - 0.4); const cx = ctx.cx, cy = ctx.crown - 0.045, cz = ctx.cz - ctx.halfD * 0.62; p.setXYZ(i, cx + (p.getX(i) - cx) * k, cy + (p.getY(i) - cy) * k, cz + (p.getZ(i) - cz) * k); }
      s.computeVertexNormals(); parts.push(withAttrs(s, ctx.headBone, ctx.spine, hairCol));
    }
    if (style === 'locs') {
      const n = 46, rnd = (i: number, k: number): number => hash(i * 3.1, k * 7.7, 1.3);
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + rnd(i, 1) * 0.3, rr = 0.93;
        const root = new THREE.Vector3(ctx.cx + Math.cos(ang) * ctx.halfW * rr, ctx.eyeY + 0.1 + rnd(i, 2) * 0.06 - (Math.sin(ang) < 0 ? 0.05 : 0), ctx.cz + Math.sin(ang) * ctx.halfD * rr);
        if (Math.sin(ang) > 0.55 && Math.abs(Math.cos(ang)) < 0.5) root.y += 0.01;   // the front stays clear of the face
        const out2 = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
        const front = Math.sin(ang) > 0.35;
        const s = strand(root, out2, front ? 0.07 + rnd(i, 3) * 0.04 : 0.16 + rnd(i, 3) * 0.13, 0.0085, 6, 0.0);
        parts.push(withAttrs(s, ctx.headBone, ctx.spine, hairCol));
      }
    }
    if (style === 'braids') {
      const g = await loadPiece(a, 'hair-braids', ctx);
      if (g) parts.push(g);
    }
    const mergedGeo = merge(parts.map((p) => withAttrs(p, ctx.headBone, ctx.spine, hairCol)));
    const map: THREE.Texture | null = style === 'cornrows' ? stripes(hairCol, skin) : null;
    const mat = material(hairCol, map, style !== 'cornrows');
    add(mergedGeo, mat);
  }
  if (wearOn) {
    const mk = (g: THREE.BufferGeometry, c: THREE.Color, rough = 0.8): void => add(withAttrs(g, ctx.headBone, ctx.spine, c), new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: rough, side: THREE.DoubleSide }));
    const wc = new THREE.Color(look.headwearColor ?? '#e9e2cf');
    if (wear === 'fila') {
      const yb = ctx.eyeY + 0.062, rx = ctx.halfW * 0.93 + 0.012, rz = ctx.halfD * 0.93 + 0.012;
      mk(lathe([{ y: yb - 0.01, rx, rz }, { y: yb + 0.005, rx: rx * 1.01, rz: rz * 1.01 }, { y: yb + 0.05, rx: rx * 0.98, rz: rz * 0.98 }, { y: yb + 0.09, rx: rx * 0.94, rz: rz * 0.9, dz: -0.01 }, { y: yb + 0.12, rx: rx * 0.84, rz: rz * 0.78, dz: -0.02 }, { y: yb + 0.128, rx: rx * 0.6, rz: rz * 0.55, dz: -0.025 }], 28, ctx.cx, ctx.cz), wc);
    } else if (wear === 'scarf') {
      const sel = selectCap(ctx, 'low'); const { geometry } = capMesh(ctx, 'low', sel);
      const p = geometry.getAttribute('position'), nn = geometry.getAttribute('normal'); for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + nn.getX(i) * 0.006, p.getY(i) + nn.getY(i) * 0.006, p.getZ(i) + nn.getZ(i) * 0.006);
      const parts = [withAttrs(geometry, ctx.headBone, ctx.spine, wc)];
      const knot = new THREE.SphereGeometry(0.034, 10, 8); knot.scale(1.3, 0.9, 1); knot.translate(ctx.cx, ctx.eyeY + 0.07, ctx.cz - ctx.halfD * 0.95); parts.push(withAttrs(knot, ctx.headBone, ctx.spine, wc));
      for (const sx of [-1, 1]) { const tail = strand(new THREE.Vector3(ctx.cx + sx * 0.02, ctx.eyeY + 0.05, ctx.cz - ctx.halfD - 0.02), new THREE.Vector3(0, 0, -1), 0.12, 0.018, 4, sx * 0.02); parts.push(withAttrs(tail, ctx.headBone, ctx.spine, wc)); }
      mk(merge(parts), wc);
    } else if (wear === 'gele') {
      const g = await loadPiece(a, 'hair-gele', ctx, true);
      if (g) { const m = new THREE.SkinnedMesh(g, new THREE.MeshStandardMaterial({ map: (g.userData['map'] as THREE.Texture) ?? null, roughness: 0.75, side: THREE.DoubleSide })); m.frustumCulled = false; m.bind(a.skeleton, a.bindMatrix); out.push({ mesh: m, tinted: [{ material: m.material as THREE.Material, dispose: () => (m.material as THREE.Material).dispose() }] }); }
    }
  }
  return out;
}

/** A generated piece (long braids, the gele) re-fitted to this head: its own head box is stored next to it, and the piece is scaled and moved from that box to this one. */
async function loadPiece(a: HairArgs, name: string, c: Ctx, keepMap = false): Promise<THREE.BufferGeometry | null> {
  const meta = await a.lib.meta<{ ref: { xmin: number; xmax: number; zmin: number; zmax: number; crownY: number; eyeY: number } }>(`/m/${name}.json`);
  const gltf = await a.lib.glb(`/m/${name}.glb`);
  let src: THREE.Mesh | null = null; gltf.scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) src = o as THREE.Mesh; });
  if (!src) return null;
  const s = src as THREE.Mesh; const geo = s.geometry.clone(); const r = meta.ref;
  const sx = (c.halfW * 2) / (r.xmax - r.xmin), sz = (c.halfD * 2) / (r.zmax - r.zmin), sy = (c.crown - c.eyeY) / (r.crownY - r.eyeY);
  const p = geo.getAttribute('position'), n = p.count;
  const rcx = (r.xmin + r.xmax) / 2, rcz = (r.zmin + r.zmax) / 2;
  const idx = new Uint16Array(n * 4), wt = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const x = c.cx + (p.getX(i) - rcx) * sx, y = c.eyeY + (p.getY(i) - r.eyeY) * sy, z = c.cz + (p.getZ(i) - rcz) * sz;
    p.setXYZ(i, x, y, z);
    const low = smooth((c.chin - y) / 0.28) * 0.75;
    idx[i * 4] = c.headBone; wt[i * 4] = 1 - low; idx[i * 4 + 1] = c.spine; wt[i * 4 + 1] = low;
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wt, 4));
  const col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { col[i * 3] = c.hairCol.r; col[i * 3 + 1] = c.hairCol.g; col[i * 3 + 2] = c.hairCol.b; }
  if (!keepMap) { geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.deleteAttribute('uv'); geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2)); }
  else geo.userData['map'] = (s.material as THREE.MeshStandardMaterial).map;
  if (!geo.index) { const ix = new Uint16Array(n); for (let i = 0; i < n; i++) ix[i] = i; geo.setIndex(new THREE.BufferAttribute(ix, 1)); }
  geo.computeVertexNormals();
  return geo;
}
