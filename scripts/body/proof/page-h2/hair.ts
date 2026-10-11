// Hair and headwear, made in the page from the head that is on the figure so that every style fits every head, covers the scalp completely and takes any colour.
// Short styles are a skin-hugging cap whose edge is trimmed per pixel by a hairline function (soft, irregular at the temples and nape); a fade is the same cap
// whose opacity falls off down the sides and back.  An afro is a rounded shell of real volume above the cap.  Braids and locs are many thin tapering strands.
// A fila is a seated cap with a rolled brim.  Only the gele is a generated piece (cut away from its mannequin), re-fitted to the head's box.
import * as THREE from 'three';
import type { Library, HeadMeta, Look } from './parts.ts';

export interface HairPiece { mesh: THREE.SkinnedMesh; tinted?: { dispose(): void; material: THREE.Material }[] }
export interface HairStyle { id: string; label: string; sex?: 'male' | 'female'; kind: 'hair' | 'wear' }
export const HAIR_STYLES: HairStyle[] = [
  { id: 'none', label: 'Bald', kind: 'hair' }, { id: 'low', label: 'Low cut', kind: 'hair' }, { id: 'fade', label: 'Fade', kind: 'hair', sex: 'male' }, { id: 'lineup', label: 'Lined-up fade', kind: 'hair', sex: 'male' },
  { id: 'afroShort', label: 'Short afro', kind: 'hair' }, { id: 'afro', label: 'Full afro', kind: 'hair' }, { id: 'cornrows', label: 'Cornrows', kind: 'hair' }, { id: 'puff', label: 'Puff', kind: 'hair' }, { id: 'locs', label: 'Locs', kind: 'hair' }, { id: 'braids', label: 'Long braids', kind: 'hair', sex: 'female' },
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

/** How far above the eye line the hair starts: t is 1 at the brow, 0 at the ear, -1 at the nape. */
function hairline(style: string, t: number): number {
  if (style === 'fila') return 0.058;
  if (style === 'lineup') return 0.086 - 0.04 * smooth((0.45 - t) / 0.5) - 0.03 * smooth((-0.2 - t) / 0.8);
  const front = 0.082, temple = 0.05, back = style === 'fade' ? -0.02 : -0.05;
  return t > 0.5 ? front : t > -0.1 ? temple + (front - temple) * smooth((t + 0.1) / 0.6) : temple + (back - temple) * smooth((-0.1 - t) / 0.9);
}

/** The triangles of the head above the hairline, with a margin: the shader trims the edge exactly. */
function selectCap(c: Ctx, style: string, margin = 0.03): number[] {
  const sel: number[] = [];
  for (let i = 0; i < c.index.length; i += 3) {
    const a = c.index[i]!, b = c.index[i + 1]!, d = c.index[i + 2]!;
    const x = (c.pos[a * 3]! + c.pos[b * 3]! + c.pos[d * 3]!) / 3, y = (c.pos[a * 3 + 1]! + c.pos[b * 3 + 1]! + c.pos[d * 3 + 1]!) / 3, z = (c.pos[a * 3 + 2]! + c.pos[b * 3 + 2]! + c.pos[d * 3 + 2]!) / 3;
    const t = (z - c.cz) / c.halfD, dx = Math.abs(x - c.cx) / c.halfW;
    if (y < c.eyeY + hairline(style, t) - margin) continue;
    if (dx > 0.82 && y < c.eyeY + 0.07 && t > -0.6 && t < 0.45) continue;      // the ears
    sel.push(a, b, d);
  }
  return sel;
}

function binding(n: number, bone: number, spine: number, w: (i: number) => number = () => 0): { idx: THREE.Uint16BufferAttribute; wt: THREE.Float32BufferAttribute } {
  const idx = new Uint16Array(n * 4), wt = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { const s = w(i); idx[i * 4] = bone; wt[i * 4] = 1 - s; idx[i * 4 + 1] = spine; wt[i * 4 + 1] = s; }
  return { idx: new THREE.Uint16BufferAttribute(idx, 4), wt: new THREE.Float32BufferAttribute(wt, 4) };
}

export interface HairShade { eyeY: number; cx: number; cz: number; halfD: number; style: string; mode: number }

/** The hair material: the vertex colour is the hair colour; the shader adds strand streaks or curl shading and trims the cap's edge with the hairline. */
function hairMaterial(sh: HairShade, map?: THREE.Texture | null): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, map: map ?? null, roughness: 0.78, metalness: 0, side: THREE.DoubleSide, transparent: true, alphaTest: 0.02 });
  const front = sh.style === 'lineup' ? 1 : 0, fade = sh.style === 'fade' || sh.style === 'lineup' ? 1 : 0;
  const uniforms = { uEye: { value: sh.eyeY }, uCx: { value: sh.cx }, uCz: { value: sh.cz }, uHalfD: { value: sh.halfD }, uMode: { value: sh.mode }, uLine: { value: front }, uFade: { value: fade } };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRest;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vRest; uniform float uEye, uCx, uCz, uHalfD, uMode, uLine, uFade;
float h31(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float n31(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y), mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float sm1(float a, float b, float x){ return smoothstep(a, b, x); }
float lineAt(float t){
  if (uLine > 0.5) return 0.086 - 0.04 * sm1(0.0, 1.0, (0.45 - t) / 0.5) - 0.03 * sm1(0.0, 1.0, (-0.2 - t) / 0.8);
  float back = uFade > 0.5 ? -0.02 : -0.05;
  return t > 0.5 ? 0.082 : (t > -0.1 ? mix(0.05, 0.082, sm1(0.0, 1.0, (t + 0.1) / 0.6)) : mix(0.05, back, sm1(0.0, 1.0, (-0.1 - t) / 0.9)));
}`).replace('#include <map_fragment>', `#include <map_fragment>
{
  vec3 p = vRest; float t = (p.z - uCz) / uHalfD;
  float shade = 1.0;
  if (uMode < 0.5) {            // a cap: trim at the hairline, streaks along the head, fade down the sides and back
    float irr = (n31(vec3(p.x * 160.0, p.y * 160.0, p.z * 160.0)) - 0.5) * (uLine > 0.5 ? 0.0015 : 0.011) * (1.0 - 0.6 * sm1(0.4, 1.0, t)) + (n31(p * 40.0) - 0.5) * (uLine > 0.5 ? 0.0 : 0.012);
    float hh = p.y - (uEye + lineAt(t) + irr);
    float a = sm1(0.0, uLine > 0.5 ? 0.0025 : 0.012, hh);
    if (uFade > 0.5) { float side = sm1(0.1, 0.7, abs(t) * 0.0 + (1.0 - sm1(0.45, 0.95, t))); float f = sm1(uEye + 0.075, uEye + 0.165, p.y); a *= mix(1.0, 0.12 + 0.88 * f, side); }
    diffuseColor.a *= a;
    float ang = atan(p.x - uCx, p.z - uCz);
    shade = 0.80 + 0.32 * n31(vec3(ang * 70.0, p.y * 90.0, 3.0)) + 0.10 * (n31(p * 220.0) - 0.5);
  } else if (uMode < 1.5) {     // the afro: curl pockets
    float c = 0.55 * n31(p * 150.0) + 0.3 * n31(p * 320.0) + 0.15 * n31(p * 70.0);
    shade = 0.55 + 0.75 * c;
    float hhA = p.y - (uEye + lineAt(t) + 0.014 + (n31(p * 55.0) - 0.5) * 0.02);
    diffuseColor.a *= sm1(0.0, 0.02, hhA) * (0.6 + 0.8 * n31(p * 90.0));
  } else if (uMode < 2.5) {     // braids and locs: plaits
    shade = 0.78 + 0.30 * sin(p.y * 210.0 + h31(floor(p * 60.0)) * 6.0);
  }
  diffuseColor.rgb *= shade;
}`);
  };
  m.customProgramCacheKey = () => `hair${sh.mode}${sh.style === 'lineup' ? 'L' : sh.style === 'fade' ? 'F' : ''}`;
  return m;
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
    g.strokeStyle = css(skin, 0.7); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0 - 6, S * 0.02); g.quadraticCurveTo((x0 + x1) / 2 - 6 + i * 2, S * 0.5, x1 - 6, S * 0.98); g.stroke();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/** The cap: head triangles above the hairline, each vertex lifted along its normal; vertex colour is the hair colour. */
function capMesh(c: Ctx, style: string, sel: number[], lift: number, mold?: (p: THREE.Vector3, t: number) => void): THREE.BufferGeometry {
  const remap = new Map<number, number>(), src: number[] = [];
  for (const v of sel) if (!remap.has(v)) { remap.set(v, src.length); src.push(v); }
  const n = src.length, pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
  const P = new THREE.Vector3();
  for (let k = 0; k < n; k++) {
    const v = src[k]!;
    const nx = c.nrm[v * 3]!, ny = c.nrm[v * 3 + 1]!, nz = c.nrm[v * 3 + 2]!;
    P.set(c.pos[v * 3]! + nx * lift, c.pos[v * 3 + 1]! + ny * lift, c.pos[v * 3 + 2]! + nz * lift);
    const t = (P.z - c.cz) / c.halfD; if (mold) mold(P, t);
    pos[k * 3] = P.x; pos[k * 3 + 1] = P.y; pos[k * 3 + 2] = P.z; nrm[k * 3] = nx; nrm[k * 3 + 1] = ny; nrm[k * 3 + 2] = nz;
    uv[k * 2] = (P.x - c.cx) / (2 * c.halfW) + 0.5; uv[k * 2 + 1] = (P.z - c.cz) / (2 * c.halfD) + 0.5;
    col[k * 3] = c.hairCol.r; col[k * 3 + 1] = c.hairCol.g; col[k * 3 + 2] = c.hairCol.b;
  }
  void style;
  const ix = new Uint16Array(sel.length); for (let i = 0; i < sel.length; i++) ix[i] = remap.get(sel[i]!)!;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geometry.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3)); geometry.setIndex(new THREE.BufferAttribute(ix, 1));
  const b = binding(n, c.headBone, c.spine); geometry.setAttribute('skinIndex', b.idx); geometry.setAttribute('skinWeight', b.wt);
  return geometry;
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let nv = 0, ni = 0; for (const p of parts) { nv += p.getAttribute('position').count; ni += p.index!.count; }
  const attr = (name: string, size: number, Type: typeof Float32Array | typeof Uint16Array): THREE.BufferAttribute => {
    const a = new Type(nv * size); let o = 0;
    for (const p of parts) { const s = p.getAttribute(name); const cnt = p.getAttribute('position').count; if (s) for (let i = 0; i < cnt; i++) for (let k = 0; k < size; k++) a[o + i * size + k] = s.getComponent(i, k); o += cnt * size; }
    return new THREE.BufferAttribute(a, size);
  };
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', attr('position', 3, Float32Array)); g.setAttribute('normal', attr('normal', 3, Float32Array)); g.setAttribute('uv', attr('uv', 2, Float32Array));
  g.setAttribute('color', attr('color', 3, Float32Array)); g.setAttribute('skinIndex', attr('skinIndex', 4, Uint16Array)); g.setAttribute('skinWeight', attr('skinWeight', 4, Float32Array));
  const ix = new Uint32Array(ni); let o = 0, base = 0; for (const p of parts) { const a = p.index!.array; for (let i = 0; i < a.length; i++) ix[o + i] = a[i]! + base; o += a.length; base += p.getAttribute('position').count; }
  g.setIndex(new THREE.BufferAttribute(ix, 1)); return g;
}

function withAttrs(g: THREE.BufferGeometry, bone: number, spine: number, color: THREE.Color, lowWeight?: (i: number) => number): THREE.BufferGeometry {
  const n = g.getAttribute('position').count;
  if (!g.getAttribute('color')) { const c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { c[i * 3] = color.r; c[i * 3 + 1] = color.g; c[i * 3 + 2] = color.b; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
  if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (!g.getAttribute('skinIndex')) { const b = binding(n, bone, spine, lowWeight); g.setAttribute('skinIndex', b.idx); g.setAttribute('skinWeight', b.wt); }
  return g;
}

/** A tapering three-sided strand from a root, going out a little and then down. */
function strand(root: THREE.Vector3, out: THREE.Vector3, len: number, r: number, segs: number, sway: number, outReach = 0.03): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segs; i++) { const t = i / segs; const o = Math.sin(Math.PI * Math.min(1, t * 1.6) * 0.5); pts.push(new THREE.Vector3(root.x + out.x * outReach * o + sway * t * t, root.y - len * t, root.z + out.z * outReach * o)); }
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= segs; i++) { const rr = r * (1 - 0.5 * i / segs); for (let s = 0; s < 3; s++) { const a = s * Math.PI * 2 / 3; pos.push(pts[i]!.x + Math.cos(a) * rr, pts[i]!.y, pts[i]!.z + Math.sin(a) * rr); } }
  for (let i = 0; i < segs; i++) for (let s = 0; s < 3; s++) { const a = i * 3 + s, b = i * 3 + (s + 1) % 3, c = a + 3, d = b + 3; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

export interface HairArgs { lib: Library; look: Look; head: HeadMeta; dy: number; geometry: THREE.BufferGeometry; skeleton: THREE.Skeleton; bindMatrix: THREE.Matrix4; /** A crowd figure: fewer strands and segments, exact hairline by triangles. */ lod?: boolean }

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
  const out: HairPiece[] = [];
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material): void => {
    const m = new THREE.SkinnedMesh(geo, mat); m.frustumCulled = false; m.renderOrder = 2; m.bind(a.skeleton, a.bindMatrix); out.push({ mesh: m, tinted: [{ material: mat, dispose: () => mat.dispose() }] });
  };
  const covered = wear === 'gele' || wear === 'scarf';
  const cx = ctx.cx, cz = ctx.cz, hw = ctx.halfW, hd = ctx.halfD;
  const sh = (s: string, mode: number): HairShade => ({ eyeY, cx, cz, halfD: hd, style: s, mode });
  if (style !== 'none' && !covered) {
    const baseStyle = style === 'braids' || style === 'locs' ? 'low' : style;
    if (style === 'afro' || style === 'afroShort') {
      // a rounded mass standing clear of the skull all round: an upper dome whose rim sits on the hairline plane, a few centimetres wider than the head, noise-displaced
      const full = style === 'afro', lift = full ? 0.105 : 0.06, wide = full ? 0.055 : 0.034;
      const cap = capMesh(ctx, 'low', selectCap(ctx, 'low', a.lod ? 0.0 : 0.03), 0.004);
      const cy = eyeY + 0.07, rx = hw * 0.97 + wide, rz = hd * 0.97 + wide, ry = (ctx.crown - cy) + lift;
      const sph = new THREE.SphereGeometry(1, a.lod ? 16 : 40, a.lod ? 8 : 18, 0, Math.PI * 2, 0, Math.PI * 0.6), p = sph.getAttribute('position');
      for (let i = 0; i < p.count; i++) {
        const dx = p.getX(i), dy = p.getY(i), dz = p.getZ(i);
        const bump = 1 + (full ? 0.05 : 0.035) * (noise3(dx * 7, dy * 7, dz * 7) - 0.5) * 2 + 0.018 * (noise3(dx * 19, dy * 19, dz * 19) - 0.5) * 2;
        const front = Math.max(0, dz * -1);       // the face looks along -z... the hairline is lower in front, so the dome is pushed back there a little
        void front;
        p.setXYZ(i, cx + dx * rx * bump, cy + dy * ry * bump - 0.012 * Math.max(0, 1 - dy * 4), cz + dz * rz * bump + 0.0);
      }
      sph.computeVertexNormals();
      add(merge([cap, withAttrs(sph, ctx.headBone, ctx.spine, hairCol)]), hairMaterial(sh('afro', 1)));
    } else if (style === 'puff') {
      const cap = capMesh(ctx, 'low', selectCap(ctx, 'low', a.lod ? 0.0 : 0.03), 0.005);
      const s = new THREE.SphereGeometry(0.066, 16, 12), p = s.getAttribute('position'); const bx = cx, by = ctx.crown - 0.03, bz = cz - hd * 0.55;
      for (let i = 0; i < p.count; i++) { const k = 1 + 0.10 * (noise3(p.getX(i) * 60, p.getY(i) * 60, p.getZ(i) * 60) - 0.4); p.setXYZ(i, bx + p.getX(i) * k, by + p.getY(i) * k * 0.9, bz + p.getZ(i) * k); }
      s.computeVertexNormals(); add(merge([cap, withAttrs(s, ctx.headBone, ctx.spine, hairCol)]), hairMaterial(sh('low', 0)));
    } else if (style === 'locs' || style === 'braids') {
      const cap = capMesh(ctx, 'low', selectCap(ctx, 'low', a.lod ? 0.0 : 0.03), 0.005);
      const parts: THREE.BufferGeometry[] = [cap];
      const braids = style === 'braids', n1 = a.lod ? (braids ? 20 : 14) : braids ? 64 : 34, n2 = a.lod ? 0 : braids ? 40 : 0, segs = a.lod ? 3 : 6, rnd = (i: number, k: number): number => hash(i * 3.1, k * 7.7, 1.3);
      const fallFor = (ang: number): number => { const back = (1 - Math.cos(ang)) / 2; return braids ? 0.26 + 0.30 * back : 0.10 + 0.14 * back; };
      for (let i = 0; i < n1 + n2; i++) {
        const tier = i < n1 ? 0 : 1, j = tier === 0 ? i : i - n1, m = tier === 0 ? n1 : n2;
        const lo = 0.55, hi = Math.PI * 2 - 0.55; // keep clear of the face
        const ang = lo + (hi - lo) * (j + 0.5 * tier + rnd(i, 1) * 0.3) / m;     // 0 is the front
        const rr = tier === 0 ? 0.97 : 0.86;
        const root = new THREE.Vector3(cx + Math.sin(ang) * hw * rr, eyeY + (tier === 0 ? 0.07 : 0.115) + rnd(i, 2) * 0.012 - (Math.cos(ang) < -0.2 ? 0.045 : 0), cz + Math.cos(ang) * hd * rr);
        const outv = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang));
        const len = fallFor(ang) * (0.85 + 0.3 * rnd(i, 3));
        const sideKeep = Math.abs(Math.sin(ang)) > 0.7 ? Math.sign(Math.sin(ang)) * 0.012 : 0;
        const s = strand(root, outv, len, a.lod ? 0.009 : braids ? 0.0042 : 0.009, segs, sideKeep, braids ? 0.034 : 0.03);
        const ps = s.getAttribute('position'), cnt = ps.count, ww = new Float32Array(cnt);
        if (braids) for (let k = 0; k < cnt; k++) { const drop = Math.max(0, root.y - ps.getY(k)), push = Math.min(1, drop / 0.3); ps.setXYZ(k, ps.getX(k) + Math.sign(Math.sin(ang)) * Math.min(Math.abs(Math.sin(ang)), 1) * 0.045 * push, ps.getY(k), ps.getZ(k) - Math.max(0, -Math.cos(ang)) * 0.05 * push + Math.max(0, Math.cos(ang)) * 0.02 * push); }
        const idxLow = new Uint16Array(cnt * 4), wt = new Float32Array(cnt * 4);
        for (let k = 0; k < cnt; k++) { const y = ps.getY(k), low = smooth((ctx.chin + 0.03 - y) / 0.22) * 0.8; ww[k] = low; idxLow[k * 4] = ctx.headBone; wt[k * 4] = 1 - low; idxLow[k * 4 + 1] = ctx.spine; wt[k * 4 + 1] = low; }
        s.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idxLow, 4)); s.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wt, 4));
        parts.push(withAttrs(s, ctx.headBone, ctx.spine, hairCol));
      }
      add(merge(parts), hairMaterial(sh('low', 2)));
    } else {
      const cap = capMesh(ctx, baseStyle, selectCap(ctx, baseStyle, a.lod ? 0.0 : 0.03), style === 'fade' || style === 'lineup' ? 0.0035 : 0.0045);
      const map = style === 'cornrows' ? stripes(hairCol, skin) : null;
      const mat = hairMaterial(sh(baseStyle, 0), map);
      if (style === 'cornrows') { mat.vertexColors = false; mat.color.set(0xffffff); }
      add(withAttrs(cap, ctx.headBone, ctx.spine, hairCol), mat);
    }
  }
  const wc = new THREE.Color(look.headwearColor ?? '#e9e2cf');
  const solid = (g: THREE.BufferGeometry, rough = 0.8): void => add(withAttrs(g, ctx.headBone, ctx.spine, wc), new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: rough, side: THREE.DoubleSide }));
  if (wear === 'fila') {
    // a soft folded cap: it hugs the head down to a rolled brim at the brow, rises into a gently flattened, back-leaning crown
    const cap = capMesh(ctx, 'fila', selectCap(ctx, 'fila', 0.0), 0.010, (p, t) => {
      const up = smooth((p.y - (eyeY + 0.10)) / 0.07), back = smooth((0.3 - t) / 0.8);
      p.x = cx + (p.x - cx) * (1 + 0.07 * up); p.z = cz + (p.z - cz) * (1 + 0.05 * up) - 0.012 * up * back; p.y += 0.022 * up + 0.012 * up * back;
      const top = ctx.crown + 0.026; if (p.y > top) p.y = top + (p.y - top) * 0.2;
    });
    const brim = new THREE.TorusGeometry(1, 0.0105, a.lod ? 4 : 8, a.lod ? 16 : 36); brim.rotateX(Math.PI / 2);
    const bp = brim.getAttribute('position'); for (let i = 0; i < bp.count; i++) { const x = bp.getX(i), z = bp.getZ(i); const t = z; bp.setXYZ(i, cx + x * (hw * 0.97 + 0.013), eyeY + 0.056 + 0.006 * Math.max(0, -t), cz + z * (hd * 0.96 + 0.012)); }
    brim.computeVertexNormals();
    solid(merge([withAttrs(cap, ctx.headBone, ctx.spine, wc), withAttrs(brim, ctx.headBone, ctx.spine, wc)]), 0.85);
  } else if (wear === 'scarf') {
    const cap = capMesh(ctx, 'low', selectCap(ctx, 'low', 0.0), 0.011);
    const parts = [cap];
    const knot = new THREE.SphereGeometry(0.034, 10, 8); knot.scale(1.3, 0.9, 1); knot.translate(cx, eyeY + 0.075, cz - hd * 0.95); parts.push(withAttrs(knot, ctx.headBone, ctx.spine, wc));
    for (const sx of [-1, 1]) { const tail = strand(new THREE.Vector3(cx + sx * 0.02, eyeY + 0.055, cz - hd - 0.02), new THREE.Vector3(0, 0, -1), 0.13, 0.018, 4, sx * 0.02); parts.push(withAttrs(tail, ctx.headBone, ctx.spine, wc)); }
    solid(merge(parts));
  } else if (wear === 'gele') {
    const g = await loadPiece(a, 'hair-gele', ctx, true);
    if (g) { const m = new THREE.SkinnedMesh(g, new THREE.MeshStandardMaterial({ map: (g.userData['map'] as THREE.Texture) ?? null, roughness: 0.75, side: THREE.DoubleSide })); m.frustumCulled = false; m.bind(a.skeleton, a.bindMatrix); out.push({ mesh: m, tinted: [{ material: m.material as THREE.Material, dispose: () => (m.material as THREE.Material).dispose() }] }); }
  }
  return out;
}

/** The generated piece (the gele), cut away from its mannequin, re-fitted to this head: scaled and moved from the head box it was made on to this one. */
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
  if (keepMap) geo.userData['map'] = (s.material as THREE.MeshStandardMaterial).map;
  if (!geo.index) { const ix = new Uint16Array(n); for (let i = 0; i < n; i++) ix[i] = i; geo.setIndex(new THREE.BufferAttribute(ix, 1)); }
  geo.computeVertexNormals();
  return geo;
}
