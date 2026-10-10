// The face parts, made in code from the base head: eyes that turn, eyelids, brows and a mouth with morph targets.
// The base head has its eyes, brows and lips painted into the texture and no lids, so these are added geometry sitting
// in and on the head surface (the painted features are faded out by the skin material).
import * as THREE from 'three';
import type { BodyData } from './body-data.ts';
import { Builder, JOINT, headSurface, morphAttrs, partScene } from './geom.ts';
import type { V3 } from './geom.ts';
import { encodePng } from './png.ts';

export interface FaceSpec { eyeX: number; eyeY: number; mouthY: number; mouthHalf: number; browY: number; eyeR: number; lipH: number }
export const FACE: Record<'female' | 'male', FaceSpec> = {
  female: { eyeX: 0.0377, eyeY: 1.6535, mouthY: 1.5855, mouthHalf: 0.0235, browY: 1.6685, eyeR: 0.0125, lipH: 1 },
  male: { eyeX: 0.0431, eyeY: 1.6970, mouthY: 1.6268, mouthHalf: 0.0265, browY: 1.7115, eyeR: 0.0130, lipH: 0.85 },
};

const rad = (d: number): number => (d * Math.PI) / 180;

/** The eye texture: sclera, iris with a darker ring, pupil, and one soft catch-light; the iris is centred. */
export function eyeTexture(): Buffer {
  const N = 128, px = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = (x + 0.5) / N - 0.5, v = (y + 0.5) / N - 0.5, r = Math.hypot(u, v);
    let c: V3 = [0.93, 0.9, 0.85];
    const edge = Math.min(1, Math.max(0, (r - 0.28) / 0.22));
    c = [c[0] - edge * 0.2, c[1] - edge * 0.3, c[2] - edge * 0.3];
    if (r < 0.285) {
      const t = r / 0.285;
      const iris: V3 = [0.36 - 0.12 * t, 0.2 - 0.08 * t, 0.1 - 0.04 * t];
      const ray = 0.5 + 0.5 * Math.sin(Math.atan2(v, u) * 22 + r * 40);
      const lum = 0.8 + 0.4 * ray * (1 - Math.abs(t - 0.55) * 1.5);
      const blend = Math.min(1, Math.max(0, (0.285 - r) / 0.012));
      const ring = 1 - 0.55 * Math.max(0, (t - 0.82) / 0.18);
      c = [c[0] * (1 - blend) + iris[0] * lum * ring * blend, c[1] * (1 - blend) + iris[1] * lum * ring * blend, c[2] * (1 - blend) + iris[2] * lum * ring * blend];
      if (r < 0.115) { const p = Math.min(1, (0.115 - r) / 0.01); c = [c[0] * (1 - p) + 0.02 * p, c[1] * (1 - p) + 0.015 * p, c[2] * (1 - p) + 0.015 * p]; }
    }
    const hl = Math.hypot(u + 0.09, v + 0.1);
    const h = Math.max(0, 1 - hl / 0.05);
    c = [c[0] + (1 - c[0]) * h * h, c[1] + (1 - c[1]) * h * h, c[2] + (1 - c[2]) * h * h];
    const i = (y * N + x) * 4;
    px[i] = Math.round(255 * Math.min(1, Math.max(0, c[0]) ** (1 / 2.2))); px[i + 1] = Math.round(255 * Math.min(1, Math.max(0, c[1]) ** (1 / 2.2))); px[i + 2] = Math.round(255 * Math.min(1, Math.max(0, c[2]) ** (1 / 2.2))); px[i + 3] = 255;
  }
  return encodePng(N, N, px, 3);
}

interface MouthShape { halfW: number; gapU: number; gapL: number; lift: number; jaw: number; teeth: number; pucker: number; thin: number; open?: number }
const SHAPES: Record<string, MouthShape> = {
  neutral: { halfW: 1, gapU: 0, gapL: 0, lift: 0, jaw: 0, teeth: 0, pucker: 0, thin: 1 },
  smile: { halfW: 1.16, gapU: 0.0006, gapL: 0.0026, lift: 0.0085, jaw: 0.001, teeth: 0.0034, pucker: 0, thin: 0.9 },
  aa: { halfW: 0.95, gapU: 0.0015, gapL: 0.0125, lift: 0.0006, jaw: 0.0125, teeth: 0.004, pucker: 0, thin: 0.9 },
  oh: { halfW: 0.6, gapU: 0.002, gapL: 0.0085, lift: 0, jaw: 0.008, teeth: 0.0015, pucker: 1, thin: 1.1 },
  ee: { halfW: 1.1, gapU: 0.0012, gapL: 0.0045, lift: 0.0018, jaw: 0.0035, teeth: 0.0038, pucker: 0, thin: 0.85 },
  mm: { halfW: 0.96, gapU: 0, gapL: 0, lift: -0.0004, jaw: 0, teeth: 0, pucker: 0.3, thin: 0.72 },
  frown: { halfW: 0.88, gapU: 0, gapL: 0, lift: -0.0075, jaw: 0, teeth: 0, pucker: 0, thin: 0.85 },
};
const RING = 28;

/** The three parts of the mouth for one shape, as positions: lip band outer, lip band inner, interior fan, teeth. */
function mouthPositions(spec: FaceSpec, surf: (x: number, y: number) => { z: number }, s: MouthShape): { band: V3[]; inner: V3[]; cavity: V3[]; teeth: V3[] } {
  const hw = spec.mouthHalf * s.halfW, my = spec.mouthY;
  const outer: V3[] = [], inner: V3[] = [];
  for (let k = 0; k < RING; k++) {
    const t = (k / RING) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
    const up = sn >= 0, a = Math.abs(sn) ** 0.85;
    const x = hw * c;
    const corner = Math.abs(c) ** 3;                           // how near a corner this point is
    const lift = s.lift * corner;
    let hu = 0.0072 * spec.lipH * s.thin, hl = 0.0094 * spec.lipH * s.thin;
    hu *= 1 + 0.25 * s.pucker; hl *= 1 + 0.35 * s.pucker;
    const bow = up ? 0.0006 * Math.exp(-((x / 0.0045) ** 2)) : 0;
    const iy = up ? s.gapU * a : -(s.gapL * a);
    const innerX = x * 0.93;
    const yi = my + lift + iy - (up ? 0 : 0) - (up ? 0 : s.jaw * 0.0) ;
    const yo = my + lift + (up ? (s.gapU * a) + hu * a - bow : -(s.gapL * a) - hl * a - s.jaw * 0.35 * a);
    inner.push([innerX, yi, surf(innerX, yi).z + 0.0005]);
    outer.push([x * 1.0, yo, surf(x, yo).z + 0.0002]);
  }
  // interior fan centre and teeth
  const cy = my + (s.gapU - s.gapL) * 0.5;
  const cavity = [[0, cy, surf(0, cy).z + 0.0003] as V3, ...inner.map((p) => [p[0], p[1], p[2] - 0.0001] as V3)];
  const teeth: V3[] = [];
  for (let k = 0; k < RING; k++) {
    const p = inner[k]!, up = Math.sin((k / RING) * Math.PI * 2) >= 0;
    const h = up ? s.teeth * (0.4 + 0.6 * Math.abs(Math.sin((k / RING) * Math.PI * 2))) : 0;
    teeth.push(up ? [p[0] * 0.98, p[1] - h, surf(p[0], p[1] - h).z + 0.0006] : [p[0], p[1], p[2] + 0.0001]);
  }
  return { band: outer, inner, cavity, teeth };
}

export async function buildFace(body: BodyData): Promise<{ glb: Buffer; eye: Buffer; stats: Record<string, number> }> {
  const spec = FACE[body.key];
  const surf = headSurface(body);
  const meshes: { name: string; geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[]; morphNames?: string[] }[] = [];
  const mat = (name: string): THREE.MeshStandardMaterial => { const m = new THREE.MeshStandardMaterial(); m.name = name; return m; };
  // The cheek texel the lids borrow, and a dark texel for the lash line (texture pixels from the body atlas).
  const cheekUv: [number, number] = body.key === 'female' ? [0.095, 0.235] : [0.1, 0.245];
  const darkUv: [number, number] = [0.02, 0.36];
  const eyeBoneIndex = { l: 23, r: 24 };
  const lidMorphs = new Map<string, number[]>();

  // ---- eyes and lids, one pair
  const eyes = new Builder(), lids = new Builder();
  const R = spec.eyeR * 1.1, bulge = 0.0062;
  const centres: V3[] = [];
  const sides: ('l' | 'r')[] = ['l', 'r'];
  const openPos: number[] = [], closedPos: number[] = [], squintPos: number[] = [], widePos: number[] = [];
  for (const side of sides) {
    const sx = side === 'l' ? 1 : -1;             // the character's left eye is at +x
    const ex = sx * spec.eyeX, ey = spec.eyeY;
    const sf = surf(ex, ey);
    const cz = sf.z - (R - bulge);
    centres.push([ex, ey, cz]);
    // eye frame: forward is mostly +z, a little outward
    const fwd = new THREE.Vector3(sx * 0.06, 0, 1).normalize();
    const right = new THREE.Vector3(0, 1, 0).cross(fwd).normalize();
    const up = fwd.clone().cross(right).normalize();
    const toWorld = (lx: number, ly: number, lz: number): V3 => [ex + right.x * lx + up.x * ly + fwd.x * lz, ey + right.y * lx + up.y * ly + fwd.y * lz, cz + right.z * lx + up.z * ly + fwd.z * lz];
    const joint = [side === 'l' ? eyeBoneIndex.l : eyeBoneIndex.r, 0, 0, 0];
    // eyeball: front cap of a sphere, planar-projected texture
    const polar = 8, around = 18, base = eyes.count;
    for (let i = 0; i <= polar; i++) {
      const th = rad((i / polar) * 88);
      for (let j = 0; j < (i === 0 ? 1 : around); j++) {
        const ph = (j / around) * Math.PI * 2;
        const lx = R * Math.sin(th) * Math.cos(ph), ly = R * Math.sin(th) * Math.sin(ph), lz = R * Math.cos(th);
        eyes.vertex(toWorld(lx, ly, lz), [0.5 + lx / (2 * R), 0.5 - ly / (2 * R)], joint, [1, 0, 0, 0]);
      }
    }
    const ringStart = (i: number): number => base + (i === 0 ? 0 : 1 + (i - 1) * around);
    for (let i = 0; i < polar; i++) for (let j = 0; j < around; j++) {
      const j2 = (j + 1) % around;
      if (i === 0) eyes.tri(base, ringStart(1) + j, ringStart(1) + j2);
      else eyes.quad(ringStart(i) + j, ringStart(i + 1) + j, ringStart(i + 1) + j2, ringStart(i) + j2);
    }
    // eyelids: sphere shells whose edge elevation is the morph
    const RL = R + 0.0011, B = 56, nb = 16, nr = 5;
    const edgeUp = (b: number, k: number): number => rad(k * 40) * (1 - (b / B) ** 2) ** 0.7 - rad(1);
    const edgeLo = (b: number, k: number): number => -rad(k * 21) * (1 - (b / B) ** 2) ** 0.8 + rad(0.5);
    const lidPoint = (b: number, a: number): V3 => toWorld(RL * Math.cos(a) * Math.sin(rad(b)), RL * Math.sin(a), RL * Math.cos(a) * Math.cos(rad(b)));
    for (const upper of [true, false]) {
      const topA = upper ? rad(78) : rad(-70);
      const lb = lids.count;
      for (let i = 0; i <= nb; i++) {
        const b = -B + (2 * B * i) / nb;
        for (let r = 0; r <= nr; r++) {
          const f = r / nr;
          const mk = (k: number): V3 => { const edge = upper ? edgeUp(b, k) : edgeLo(b, k); return lidPoint(b, edge + (topA - edge) * f); };
          const p = mk(1);
          // the closed shapes only matter for the rows near the edge
          const closedP = upper ? lidPoint(b, (edgeUp(b, -0.1) + (topA - edgeUp(b, -0.1)) * f)) : lidPoint(b, edgeLo(b, -0.25) + (topA - edgeLo(b, -0.25)) * f);
          const squintP = upper ? lidPoint(b, edgeUp(b, 0.55) + (topA - edgeUp(b, 0.55)) * f) : lidPoint(b, edgeLo(b, 0.0) + (topA - edgeLo(b, 0.0)) * f);
          const wideP = upper ? lidPoint(b, edgeUp(b, 1.3) + (topA - edgeUp(b, 1.3)) * f) : lidPoint(b, edgeLo(b, 1.1) + (topA - edgeLo(b, 1.1)) * f);
          const uv: [number, number] = f < 0.0001 ? darkUv : cheekUv;
          lids.vertex(p, uv, [JOINT.head, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0]);
          openPos.push(...p); closedPos.push(...closedP); squintPos.push(...squintP); widePos.push(...wideP);
        }
      }
      for (let i = 0; i < nb; i++) for (let r = 0; r < nr; r++) {
        const a = lb + i * (nr + 1) + r, b2 = lb + (i + 1) * (nr + 1) + r;
        if (upper) lids.quad(a, b2, b2 + 1, a + 1); else lids.quad(a, a + 1, b2 + 1, b2);
      }
    }
  }
  lidMorphs.set('blink', closedPos); lidMorphs.set('squint', squintPos); lidMorphs.set('wide', widePos);
  const eyeGeo = eyes.geometry(); const eyeMat = mat('eye'); eyeMat.roughness = 0.18;
  meshes.push({ name: 'eyes', geometry: eyeGeo, material: eyeMat });
  const lidGeo = lids.geometry();
  const lidNames = morphAttrs(lidGeo, openPos, lidMorphs);
  const lidMat = mat('skin');
  meshes.push({ name: 'lids', geometry: lidGeo, material: lidMat, morphNames: lidNames });

  // ---- brows: a strip per brow with a raised centre line
  const brows = new Builder();
  const browMorphs = new Map<string, number[][]>(); const keys = ['browUp', 'browDown', 'browWorry', 'browAngry'];
  const browOpen: number[] = []; const browTargets: Record<string, number[]> = Object.fromEntries(keys.map((k) => [k, []]));
  const NS = 9;
  for (const sx of [1, -1]) {
    const bx0 = sx * (spec.eyeX - 0.014), bx1 = sx * (spec.eyeX + 0.019);
    const tf = (t: number, w: number, k: string): V3 => {
      const x = bx0 + (bx1 - bx0) * t;
      const arch = Math.sin(Math.min(1, t * 1.15) * Math.PI) * 0.0032;
      const thick = (0.0030 - 0.0022 * t ** 1.5) * (0.4 + 0.6 * Math.sin(Math.min(1, t * 1.1 + 0.04) * Math.PI) ** 0.5) * 1.1;
      let dy = 0, dx = 0;
      if (k === 'browUp') dy = 0.0075 * (0.4 + t * 0.6);
      if (k === 'browDown') dy = -0.0035 * (0.6 + t * 0.4);
      if (k === 'browWorry') dy = 0.0095 * (1 - t) ** 1.1 - 0.0024 * t;
      if (k === 'browAngry') dy = -0.0050 * (1 - t) ** 1.0 + 0.0014 * t;
      void dx;
      const y = spec.browY + 0.004 + arch * 0.8 + dy + w * thick;
      return [x, y, surf(x, y).z + 0.0009 + (w === 0 ? 0.0004 : 0)];
    };
    const b0 = brows.count;
    for (let i = 0; i <= NS; i++) {
      const t = i / NS;
      for (const w of [-1, 0, 1]) {
        const p = tf(t, w, 'open');
        brows.vertex(p, [t, (w + 1) / 2], [JOINT.head, 0, 0, 0], [1, 0, 0, 0], [1, 1, 1, 1]);
        browOpen.push(...p);
        for (const k of keys) browTargets[k]!.push(...tf(t, w, k));
      }
    }
    for (let i = 0; i < NS; i++) for (let w = 0; w < 2; w++) {
      const a = b0 + i * 3 + w, b = b0 + (i + 1) * 3 + w;
      if (sx > 0) brows.quad(a, b, b + 1, a + 1); else brows.quad(a, a + 1, b + 1, b);
    }
  }
  const browGeo = brows.geometry();
  const browNames = morphAttrs(browGeo, browOpen, new Map(Object.entries(browTargets)));
  const browMat = mat('brow');
  meshes.push({ name: 'brows', geometry: browGeo, material: browMat, morphNames: browNames });
  void browMorphs;

  // ---- mouth: lips band (group 0), interior and teeth (group 1)
  const mouth = new Builder();
  const shapes = Object.fromEntries(Object.entries(SHAPES).map(([k, s]) => [k, mouthPositions(spec, surf, s)]));
  const neutral = shapes['neutral']!;
  const J = [JOINT.head, 0, 0, 0], W = [1, 0, 0, 0];
  const names = Object.keys(SHAPES).filter((k) => k !== 'neutral');
  const base: number[] = [];
  const tar: Record<string, number[]> = Object.fromEntries(names.map((n) => [n, []]));
  const push = (get: (m: ReturnType<typeof mouthPositions>) => V3[], colour: [number, number, number, number], uvf: (i: number, n: number) => [number, number], count: number): number => {
    const b0 = mouth.count;
    const nb = get(neutral);
    for (let i = 0; i < count; i++) {
      mouth.vertex(nb[i]!, uvf(i, count), J, W, colour);
      base.push(...nb[i]!);
      for (const n of names) tar[n]!.push(...get(shapes[n]!)[i]!);
    }
    return b0;
  };
  // interior first (group 1): fan centre + inner ring, then teeth ring (white) over its upper half
  const iStart = mouth.idx.length;
  const cv = push((m) => m.cavity, [0.12, 0.03, 0.03, 1], () => [0, 0], RING + 1);
  for (let k = 0; k < RING; k++) mouth.tri(cv, cv + 1 + k, cv + 1 + ((k + 1) % RING));
  const tt = push((m) => m.teeth, [0.9, 0.87, 0.8, 1], () => [0, 0], RING);
  const ic = cv + 1;
  for (let k = 0; k < RING; k++) { const k2 = (k + 1) % RING; if (Math.sin((k / RING) * Math.PI * 2) >= 0 && Math.sin((k2 / RING) * Math.PI * 2) >= 0) mouth.quad(ic + k, tt + k, tt + k2, ic + k2); }
  mouth.group(1, iStart);
  const bStart = mouth.idx.length;
  // lip band: outer to inner with a rounded profile (an extra mid ring raised towards the viewer)
  const o = push((m) => m.band, [1, 1, 1, 1], (i) => [i / RING, 0], RING);
  const ii = push((m) => m.inner, [1, 1, 1, 1], (i) => [i / RING, 1], RING);
  // mid ring: the average of outer and inner, raised
  const mid = mouth.count;
  const midOf = (s: { band: V3[]; inner: V3[] }, k: number): V3 => [(s.band[k]![0] + s.inner[k]![0]) / 2, (s.band[k]![1] + s.inner[k]![1]) / 2, (s.band[k]![2] + s.inner[k]![2]) / 2 + 0.0026];
  for (let k = 0; k < RING; k++) {
    const np = midOf(neutral, k);
    mouth.vertex(np, [k / RING, 0.5], J, W, [1, 1, 1, 1]); base.push(...np);
    for (const n of names) tar[n]!.push(...midOf(shapes[n]!, k));
  }
  for (let k = 0; k < RING; k++) { const k2 = (k + 1) % RING; mouth.quad(o + k, mid + k, mid + k2, o + k2); mouth.quad(mid + k, ii + k, ii + k2, mid + k2); }
  mouth.group(0, bStart);
  const mouthGeo = mouth.geometry();
  const mouthNames = morphAttrs(mouthGeo, base, new Map(Object.entries(tar)));
  const lipMat = mat('lips'); const cavMat = mat('mouth-in'); cavMat.vertexColors = true;
  meshes.push({ name: 'mouth', geometry: mouthGeo, material: [lipMat, cavMat], morphNames: mouthNames });

  const scene = partScene(body, meshes, [
    { name: 'eye_l', at: centres[0]! }, { name: 'eye_r', at: centres[1]! },
  ]);
  const { exportGlb } = await import('./glb-export.ts');
  const glb = await exportGlb(scene);
  const tris = meshes.reduce((n, m) => n + (m.geometry.index!.count / 3), 0);
  return { glb, eye: eyeTexture(), stats: { triangles: tris, vertices: meshes.reduce((n, m) => n + m.geometry.getAttribute('position').count, 0) } };
}
