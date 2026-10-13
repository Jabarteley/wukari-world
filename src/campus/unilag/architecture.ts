/**
 * Facade and landmark architecture for the mapped UNILAG campus.
 *
 * Footprints and heights come from OpenStreetMap (map.generated.ts). Everything drawn here is an
 * interpretation, merged into Batches: no textures, no downloads. Evidence used (critic research, FIDELITY.md):
 *  - Senate House (James Cubitt, 1980s): tower plus podiums facing the plaza, brise-soleil that are hollow
 *    cement forms clad in MOSAIC tile, curved extruded concrete. Cream and grey mosaic here; the number of
 *    storeys is disputed between sources (11 vs 14) and 14 is kept as an estimate.
 *  - Early-1960s core (McMillan): library, heavy concrete with vertical bays and fins, parapets, balustrades.
 *  - J.F. Ade Ajayi Auditorium: GOLD MOSAIC accent against sombre concrete.
 *  - Main gate: pointed pylons plus steel canopy (Ei'eke photograph); the lettering is required by the brief.
 * Hall colours, layouts and signage designs are plausible variety, NOT verified facts: no source gives them.
 * Baked vertex AO is applied by Batch.build (src/scene/build.ts) to every solid layer built here.
 */
import type { Batch } from '../../scene/types.ts';
import type { CampusMapBuilding, MetrePoint } from './geo.ts';
import { boundsOf, pointInRing } from './geo.ts';
import { LANDMARK_MAPPINGS } from './layout.ts';
import { landmarkBuildingIds, standalones } from './standalone.ts';
import { landmarkLabel } from './spot-names.ts';
import { signLetters } from '../shared/signs.ts';

export type FacadeStyle = 'tower' | 'podium' | 'hall' | 'library' | 'institutional' | 'auditorium' | 'mosque' | 'chapel';
export interface ArchitectureInfo { id: string; label: string; style: FacadeStyle; accent: string; sign: boolean; kind: string; wall: string; roof: string; variant: number }

export const SENATE_OSM_ID = 653186158;
export const SENATE_TOWER_HEIGHT = 43;
export const isSenateTower = (b: Pick<CampusMapBuilding, 'osm' | 'height'>): boolean => b.osm.id === SENATE_OSM_ID && b.height === SENATE_TOWER_HEIGHT;

const STYLE_BY_LANDMARK: Record<string, FacadeStyle> = { senate: 'podium', library: 'library', auditorium: 'auditorium', 'central-mosque': 'mosque', 'education-chapel': 'chapel' };

/**
 * Per-landmark palette and layout variant (estimates for variety). variant picks the hall layout:
 * 0 full balconies, 1 staggered balconies + louvres, 2 louvre ribbons + sun-shade slabs, 3 stair towers, 4 ground arcade.
 */
const PALETTE: Record<string, { wall: string; accent: string; roof?: string; variant?: number }> = {
  'moremi-hall': { wall: '#f1e4de', accent: '#c66a88', roof: '#8b4a4a', variant: 1 },
  'jaja-hall': { wall: '#e6e4cf', accent: '#2f78a0', roof: '#5f6f78', variant: 2 },
  'mariere-hall': { wall: '#eee9d8', accent: '#3d8a5a', roof: '#6b7a62', variant: 3 },
  'kofo-hall': { wall: '#f3e3bd', accent: '#d39a22', roof: '#a5654a', variant: 0 },
  'makama-hall': { wall: '#e4e4de', accent: '#7b52a4', roof: '#5d6366', variant: 4 },
  'eni-njoku-hall': { wall: '#ecd6c2', accent: '#b8512c', roof: '#98503f', variant: 0 },
  'queen-amina-hall': { wall: '#efe0e4', accent: '#933a58', roof: '#7a5560', variant: 1 },
  'biobaku-hall': { wall: '#dfe8e4', accent: '#2a8a86', roof: '#5f716f', variant: 2 },
  'honours-hall': { wall: '#e6e8ee', accent: '#2c4c8c', roof: '#59606e', variant: 3 },
  auditorium: { wall: '#d9d3c1', accent: '#c9a13e', roof: '#bdb7a5' },
  library: { wall: '#dcd5c2', accent: '#8f7552', roof: '#b9b3a2' },
  senate: { wall: '#ded6c1', accent: '#a79c82', roof: '#c4bba4' },
  'central-mosque': { wall: '#f1eee2', accent: '#3f8f6b', roof: '#b8c4bb' },
  'education-chapel': { wall: '#efe9dc', accent: '#7a5a3c', roof: '#7d6a5a' },
};

/** osm building id -> what the landmark layout says it is. Nodes resolve to a footprint (see standalone.ts). */
const LANDMARK_BUILDINGS: ReadonlyMap<number, ArchitectureInfo> = (() => {
  const result = new Map<number, ArchitectureInfo>();
  const make = (id: string, label: string, kind: string, mappingColour: string): ArchitectureInfo => {
    const style: FacadeStyle = STYLE_BY_LANDMARK[id] ?? (kind === 'hall' ? 'hall' : 'institutional');
    const p = PALETTE[id];
    return { id, label, style, kind, sign: true, accent: p?.accent ?? mappingColour, wall: p?.wall ?? '', roof: p?.roof ?? '', variant: p?.variant ?? 0 };
  };
  for (const [id, osmId] of landmarkBuildingIds()) result.set(osmId, make(id, landmarkLabel(id), LANDMARK_MAPPINGS[id]!.kind, LANDMARK_MAPPINGS[id]!.color));
  for (const s of standalones()) result.set(s.building.osm.id, make(s.id, s.label, s.kind, s.accent));
  return result;
})();

const PLAIN: ArchitectureInfo = { id: '', label: '', style: 'institutional', accent: '#b9ad92', sign: false, kind: '', wall: '', roof: '', variant: 0 };
const TOWER: ArchitectureInfo = { id: 'senate', label: 'Senate House', style: 'tower', accent: '#a79c82', sign: false, kind: 'administration', wall: '#e6dcc4', roof: '#cfc4a8', variant: 0 };
export function architectureOf(b: CampusMapBuilding): ArchitectureInfo {
  if (isSenateTower(b)) return TOWER;
  return LANDMARK_BUILDINGS.get(b.osm.id) ?? PLAIN;
}

const WALLS = ['#e4d8bc', '#e9e4d2', '#dccaa8', '#d9d3bf', '#e2dccb', '#d6cdb6'];
const ROOFS = ['#98564a', '#88584a', '#6a7472', '#7a7d78', '#6f8076', '#a86a4a', '#5f6a6b', '#8d6a58'];
export function bodyColour(b: CampusMapBuilding): string {
  const info = architectureOf(b);
  return info.wall || WALLS[b.osm.id % WALLS.length]!;
}
export function roofColour(b: CampusMapBuilding): string {
  const info = architectureOf(b);
  return info.roof || ROOFS[(b.osm.id * 7 + Math.floor(b.height)) % ROOFS.length]!;
}

/**
 * OSM leaves most buildings at an estimated 8 m. Landmarks get a credible storey count by type. These are
 * ESTIMATES (no surveyed storey counts were found): library 5 storeys, Main Auditorium 3-storey-equivalent hall,
 * halls of residence 4, faculties and administration 3-4, banks and services stay low.
 */
export function landmarkHeight(b: CampusMapBuilding): number {
  if (b.heightSource !== 'estimated' || isSenateTower(b)) return b.height;
  const info = LANDMARK_BUILDINGS.get(b.osm.id);
  if (!info || b.osm.id === SENATE_OSM_ID) return b.height;
  if (info.id === 'library') return 16.5;
  if (info.id === 'auditorium') return 13;
  if (info.style === 'hall') return 13.2;
  if (info.kind === 'faculty' || info.kind === 'academic' || info.kind === 'administration') return Math.max(b.height, 10);
  return b.height;
}

/** Floor and bay grid shared by the facade atlas and the window painters, so geometric panes cover texture windows exactly. */
export const floorsOf = (height: number): number => Math.max(1, Math.floor(height / 3.4));
export const baysOf = (length: number): number => Math.max(1, Math.floor((length - 1.5) / 3.8));
export interface Budget { left: number }
let texturedWalls = false;
/** When the facade atlas is active, plain OSM buildings take their windows and piers from the texture. */
export const setTexturedWalls = (on: boolean): void => { texturedWalls = on; };
const LIT_TONES = ['#ffd68a', '#ffe6b0', '#f6c978'];
const CONCRETE = '#e4d9bf', SHADE = '#cdc3aa', FRAME = '#d9d0b8';
const MOSAIC = ['#ece3cc', '#a6a495', '#dccfae', '#8f9893'];
export const hash = (a: number, b: number): number => {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
};

/**
 * Window: light frame, dark lower glass and a lighter sky-reflection upper half. A lit window adds a
 * warm glow quad that mapped-geometry shows only at dusk and night; lit windows are scattered, not in rows.
 */
export function windowPane(batch: Batch, x: number, y: number, z: number, w: number, h: number, seed: number, lit: boolean, framed = true): void {
  if (framed) batch.quad(x, y, z, w + .34, h + .34, FRAME);
  batch.quad(x, y, z + .02, w, h, '#32505a');
  batch.quad(x, y + h * .24, z + .035, w, h * .52, '#7fa4b0');
  if (lit) batch.quad(x, y, z + .05, w * .9, h * .88, LIT_TONES[seed % 3]!, { layer: 'glow' });
}
/** About 1 window in 4 is lit at night, scattered by a per-window hash. */
const isLit = (seed: number, f: number, i: number): boolean => hash(seed * 31 + f * 7, i * 13 + f) % 4 === 0;

/** Winding-correct outward normals, so concave halls face the right way. */
function area(ring: readonly MetrePoint[]): number {
  let sum = 0;
  for (let i = 1; i < ring.length; i++) sum += ring[i - 1]![0] * ring[i]![1] - ring[i]![0] * ring[i - 1]![1];
  return sum;
}

type Painter = (batch: Batch, length: number, height: number, info: ArchitectureInfo, seed: number) => void;

/** Senate tower, near LOD: mosaic spandrels, scooped cement fins in cream and grey mosaic, framed windows. */
export const towerNear: Painter = (batch, L, H, info, seed) => {
  const floors = Math.max(2, Math.round(H / 3.07)), fh = H / floors;
  const bays = Math.max(1, Math.round(L / 3.6)), bw = L / bays;
  batch.box(0, .7, .9, L, 1.4, 1.8, '#a9a18c');
  for (let f = 0; f < floors; f++) {
    const y = f * fh;
    if (f) batch.box(0, y - .1, .9, L, .5, 1.8, f % 2 ? '#e6dcc4' : '#ddd3b9');
    for (let i = 0; i < bays; i++) {
      const x = -L / 2 + bw * (i + .5);
      if (f) batch.quad(x, y + .52, .06, bw - .6, .75, MOSAIC[(f + i) % 2 ? 0 : 1]!);
      windowPane(batch, x, y + fh * .55 + (f ? .1 : .4), .06, bw - 1.1, fh * .52, seed + i, isLit(seed, f, i), false);
    }
  }
  batch.box(0, H + .1, .95, L + .5, .8, 1.9, '#d8cdb0');
  // Scooped fins: three mosaic-clad segments, a rib on the face of every second one.
  for (let i = 0; i <= bays; i++) {
    const x = -L / 2 + i * bw, seg = H / 3;
    for (let s = 0; s < 3; s++) {
      batch.box(x, seg * (s + .5) + .4, .75, .5, seg - .05, 1.5, MOSAIC[(i + s) % 4]!);
      if ((i + s) % 2 === 0) batch.box(x, seg * (s + .5) + .4, 1.55, .26, seg - .5, .7, MOSAIC[(i + s + 2) % 4]!);
    }
  }
  void info;
};

/** Senate tower, far LOD: slabs, one glazing band per floor and plain fins. */
export const towerFar: Painter = (batch, L, H, _info, seed) => {
  const floors = Math.max(2, Math.round(H / 3.07)), fh = H / floors, bays = Math.max(1, Math.round(L / 3.6)), bw = L / bays;
  batch.box(0, .6, .9, L, 1.2, 1.8, '#a9a18c');
  for (let f = 0; f < floors; f++) {
    const y = f * fh;
    batch.quad(0, y + fh * .5, .08, L - .2, fh - 1.1, '#4d6b75');
    if (f) batch.box(0, y - .2, .85, L, .5, 1.7, CONCRETE);
  }
  batch.box(0, H - .1, .95, L + .4, .8, 1.9, '#d8cdb0');
  for (let i = 0; i <= bays; i++) batch.box(-L / 2 + i * bw, H / 2 + .4, .7, .5, H - .8, 1.4, MOSAIC[(i + seed) % 2]!);
};

/** The Senate podium: ground-floor colonnade, mosaic upper band and framed ribbon windows. */
const podium: Painter = (batch, L, H, info, seed) => {
  const bays = Math.max(1, Math.round(L / 4)), bw = L / bays;
  batch.quad(0, 1.8, .1, L - .3, 3.2, '#3a5660');
  for (let i = 0; i <= bays; i++) batch.box(-L / 2 + i * bw, 1.9, 1.5, .7, 3.8, .7, '#e6dcc4');
  batch.box(0, 3.95, 1.4, L, .6, 2.6, '#ded3b8');
  for (let i = 0; i < bays; i++) {
    const x = -L / 2 + bw * (i + .5);
    batch.quad(x, 4.9, .06, bw - .5, .9, MOSAIC[i % 2 ? 0 : 1]!);
    windowPane(batch, x, Math.min(H - 1.4, 6.2), .06, bw - 1.2, 1.7, seed + i, isLit(seed, 1, i));
    if (i) batch.box(x - bw / 2, 6, .7, .4, 3.6, 1.2, MOSAIC[(i + 1) % 4]!);
  }
  batch.box(0, H + .3, .5, L + .2, .9, 1.4, '#cfc4a8');
  void info;
};

/** Halls: five layouts, each with its own accent so they read apart at a glance. */
const hall: Painter = (batch, L, H, info, seed) => {
  const floors = floorsOf(H), fh = H / floors, v = info.variant;
  const rooms = baysOf(L), rw = L / rooms, acc = info.accent;
  for (let f = 0; f < floors; f++) {
    const y = f * fh;
    if (f && v !== 2) {
      if (v === 1) { for (let r = f % 2; r < rooms; r += 2) batch.box(-L / 2 + rw * (r + .5), y + .1, .7, rw * .9, .22, 1.4, '#f0e9d8'); }
      else batch.box(0, y + .1, .75, L, .22, 1.5, '#efe8d6');
      if (v !== 1 && v !== 3) batch.quad(0, y + .7, 1.52, L - .1, .9, acc);
    }
    if (v === 2) { batch.box(0, y + fh - .35, .5, L, .22, 1.1, '#f0e9d8'); batch.quad(0, y + fh * .52, .06, L - .6, fh * .5, '#5d8190'); }
    for (let r = 0; r < rooms; r++) {
      const x = -L / 2 + rw * (r + .5);
      windowPane(batch, x, y + fh * .547, .06, rw * (v === 2 ? .8 : .62), fh * (v === 2 ? .42 : .5), seed + r + f, isLit(seed, f, r), v !== 2);
      if (v === 2 && r < rooms) batch.box(x + rw / 2, y + fh * .5, .3, .18, fh * .7, .6, acc);
    }
  }
  if (v === 3) for (const s of [-1, 1]) batch.box(s * (L / 2 - 1.1), H / 2 + .6, 1.1, 2.2, H + 1.2, 2.2, acc);
  else if (v === 4) { for (let i = 0; i <= rooms; i += 1) batch.box(-L / 2 + i * rw, 1.7, 1.5, .5, 3.4, .5, '#f3eddc'); batch.box(0, 3.5, 1.2, L, .5, 2.4, acc); }
  else for (let i = 0; i <= rooms; i += 2) batch.box(-L / 2 + i * rw, H / 2, .35, .3, H, .7, acc);
  batch.box(0, H + .22, .2, L, .5, .5, '#d8cfb6');
};

/** Library: tall louvre screen in timber-grain concrete tones over recessed glazing, overhanging roof. */
const library: Painter = (batch, L, H, _info, seed) => {
  batch.box(0, .3, .9, L, .6, 1.8, '#b0a58e');
  batch.quad(0, 2.1, .08, L, 3, '#35525c');
  batch.quad(0, H * .6 + 1.3, .08, L, Math.max(1, H - 5.6), '#6b8f9c');
  const fins = Math.max(2, Math.round(L / 1.3));
  for (let i = 0; i <= fins; i++) batch.box(-L / 2 + (L * i) / fins, H * .55 + .9, .6, .32, H - 3.4, 1.2, hash(seed, i) % 3 ? '#e1d6bd' : '#c9b99b');
  batch.box(0, 3.7, 1.0, L, .5, 2.2, '#d6ccb3');
  batch.box(0, H + .4, 1.1, L + 1.6, .8, 3, '#d9d0b6');
};

const institutional: Painter = (batch, L, H, info, seed) => {
  const floors = Math.max(1, Math.floor(H / 3.4)), fh = H / floors;
  const n = Math.max(1, Math.floor((L - 1.5) / 3.8)), step = L / n;
  if (texturedWalls && !info.id) {
    // Windows are in the atlas texture; geometry adds only the floor ledges and a parapet, on the same floor grid.
    for (let f = 0; f < floors; f++) batch.box(0, f * fh + fh - .25, .5, L, .4, 1, SHADE);
    batch.box(0, H + .2, .12, L, .45, .4, '#e1d8c2');
    return;
  }
  for (let f = 0; f < floors; f++) {
    const y = f * fh;
    batch.box(0, y + fh - .25, .5, L, .4, 1, SHADE);
    for (let i = 0; i < n; i++) {
      const x = -L / 2 + step * (i + .5);
      windowPane(batch, x, y + fh * .547, .06, step * .62, fh * .5, seed + i + f, isLit(seed, f, i));
      if (info.variant === 9) batch.box(x + step / 2, y + fh / 2, .35, .16, fh * .9, .6, SHADE);
    }
  }
  for (let i = 0; i <= n; i += 2) batch.box(-L / 2 + step * i, H / 2, .22, .3, H, .45, '#d9cfb4');
  batch.box(0, H + .2, .12, L, .45, .4, '#e1d8c2');
};

/** Auditorium: windows as institutional, then a gold-mosaic entrance panel and gold roof fascia. */
const auditorium: Painter = (batch, L, H, info, seed) => {
  institutional(batch, L, H, info, seed);
  batch.box(0, H + .5, 1.3, L + 1.6, .9, 3.4, '#cdbd8e');
  batch.box(0, H - .6, 1.0, L, .7, .4, '#c9a13e');
};

const mosque: Painter = (batch, L, H, info, seed) => {
  const n = Math.max(2, Math.floor(L / 3.4)), step = L / n;
  batch.box(0, .3, .6, L, .6, 1.2, '#d8d2c0');
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + step * (i + .5), w = step * .5;
    batch.quad(x, 2.0, .06, w, 3.0, '#2f5a50');
    batch.quad(x, 3.5, .06, w * .72, w * .72, '#2f5a50', { rz: Math.PI / 4 });
    batch.box(x + step / 2, 2.4, .3, .35, 4.6, .6, '#f6f3e8');
  }
  batch.box(0, 4.95, .5, L, .5, 1.2, info.accent);
  batch.quad(0, Math.max(6.2, H * .75), .06, L - 1, 1.2, '#3a6e62');
  batch.box(0, H + .2, .1, L, .55, .5, '#e9e6d8');
  void seed;
};

const chapel: Painter = (batch, L, H, info, seed) => {
  const n = Math.max(2, Math.floor(L / 4)), step = L / n;
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + step * (i + .5);
    batch.quad(x, H * .55, .06, 1.1, H * .5, '#3d5a78');
    batch.quad(x, H * .55 + H * .25 + .5, .06, .8, .8, '#3d5a78', { rz: Math.PI / 4 });
    batch.box(x + step / 2, H / 2, .3, .5, H, .7, info.accent);
  }
  batch.box(0, H + .2, .1, L, .5, .5, '#e5ddc8');
  void seed;
};

const PAINTERS: Record<FacadeStyle, Painter> = { tower: towerNear, podium, hall, library, institutional, auditorium, mosque, chapel };

const SIGN_DESIGNS = [
  { plate: '#14463f', ink: '#fff4db', rim: '#d1ad55' },
  { plate: '#16284a', ink: '#f6f1df', rim: '#c8b57a' },
  { plate: '#5a1f2b', ink: '#fff0d6', rim: '#d9b45a' },
  { plate: '#1c1a17', ink: '#f0c860', rim: '#8f7a3c' },
  { plate: '#f4efe0', ink: '#1a2a2e', rim: '#244d49' },
];

/** Big, high-contrast, unclipped plate on a projecting bay; two lines for long names. Local frame. */
function signBoard(batch: Batch, label: string, y: number, w: number, z: number, design: number, bud: Budget): number {
  const d = SIGN_DESIGNS[design % SIGN_DESIGNS.length]!, text = label.toUpperCase();
  let lines = [text];
  if (text.length > 12) {
    const mid = text.length / 2, spaces = [...text].flatMap((c, i) => (c === ' ' ? [i] : []));
    const cut = spaces.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0];
    if (cut !== undefined) lines = [text.slice(0, cut), text.slice(cut + 1)];
  }
  const chars = Math.max(...lines.map((l) => l.length)), pixel = Math.min(.3, (w - 1) / (chars * 6)), lineH = 7 * pixel + .35;
  const h = lines.length * lineH + .7;
  batch.box(0, y, z, w, h, .3, d.plate);
  batch.box(0, y + h / 2, z + .05, w + .3, .22, .4, d.rim); batch.box(0, y - h / 2, z + .05, w + .3, .22, .4, d.rim);
  if (bud.left > 600) lines.forEach((line, i) => signLetters(batch, line, 0, y + ((lines.length - 1) / 2 - i) * lineH, z + .18, w - 1, d.ink, .3));
  return h;
}

/** Entrance: projecting bay, door, canopy, steps and a big name plate. Landmark specifics: library stair+plaza, auditorium gold, senate plaza. Local frame. */
function entrance(batch: Batch, L: number, H: number, info: ArchitectureInfo, bud: Budget, seed: number): void {
  const w = Math.min(15, Math.max(8, L * .34)), design = hash(info.id.length * 17 + info.id.charCodeAt(0), 3);
  const labelH = info.label.length > 12 ? 4 : 2.3, signY0 = 4.6;
  const bayH = Math.max(info.style === 'hall' ? H + 1.2 : Math.min(H + .5, 9), signY0 + labelH + .6);
  const bayColour = info.style === 'hall' ? info.accent : info.style === 'auditorium' ? '#c9a13e' : info.style === 'library' ? '#d3c8ad' : '#e6dcc4';
  if (info.style === 'podium') {
    batch.box(0, .08, 8.5, Math.min(L, 42), .16, 15, '#d5ccb5');
    for (let i = -3; i <= 3; i++) batch.quad(i * 5, .18, 8.5, 1.4, 14, i % 2 ? '#bdb29a' : '#c8bda3', { rx: -Math.PI / 2 });
    for (let s = 0; s < 3; s++) batch.box(0, .16 + s * .15, 3.6 - s * .8, w + 4, .15, 1.2, '#e1d8c1');
    signBoard(batch, info.label, 6.2, Math.min(L - 2, 16), 3.1, 1, bud);
    batch.box(0, 4.4, 2.6, Math.min(L - 2, 18), .4, 2.6, '#e6dcc4');
    return;
  }
  batch.box(0, bayH / 2, .85, w, bayH, 1.7, bayColour);
  if (info.style === 'auditorium') {
    for (let r = 0; r < Math.floor(bayH / 1.8); r++) for (let c = 0; c < Math.floor(w / 1.8); c++) batch.quad(-w / 2 + .9 + c * 1.8, .9 + r * 1.8, 1.72, 1.7, 1.7, (r + c + seed) % 2 ? '#d7b04e' : '#b88f33');
  }
  batch.quad(0, 1.35, 1.74, 3.4, 2.5, '#2b464c');
  batch.box(0, 3.55, 3.0, w + 1.4, .35, 4.6, '#dcd2ba');
  for (const s of [-1, 1]) batch.cyl(s * (w / 2 - .3), 1.75, 4.9, .26, 3.5, '#eadfc7', { seg: 6 });
  if (info.style === 'library') {
    for (let s = 0; s < 6; s++) batch.box(0, .12 + s * .16, 5.3 + (5 - s) * .7, w + 6, .16, .8, '#d7ccb2');
    batch.box(0, .08, 12.5, w + 12, .16, 9, '#d0c7ae');
    for (let i = -2; i <= 2; i++) batch.quad(i * 5, .18, 12.5, 1.2, 8.5, i % 2 ? '#bfb49b' : '#c9bea5', { rx: -Math.PI / 2 });
  } else for (let s = 0; s < 3; s++) batch.box(0, .08 + s * .15, 5.5 + (2 - s) * .8, w + 1, .15, .9, '#d4cab1');
  signBoard(batch, info.label, signY0 + 2 + labelH / 2, w - .6, 1.85, design, bud);
}

/** Roof furniture near the camera: water tank, AC units, plant box and a ridge strip on tone-varied roofs. */
function roofClutter(batch: Batch, b: CampusMapBuilding, info: ArchitectureInfo): void {
  const [x0, z0, x1, z1] = boundsOf(b.ring), w = x1 - x0, d = z1 - z0, H = b.height + .04, seed = b.osm.id;
  if (w < 8 || d < 8) return;
  const spot = (k: number): [number, number] | null => {
    for (let t = 0; t < 4; t++) {
      const x = x0 + w * (.2 + .6 * (hash(seed + k, t) % 100) / 100), z = z0 + d * (.2 + .6 * (hash(seed - k, t + 5) % 100) / 100);
      if (pointInRing([x, z], b.ring) && pointInRing([x + 1.6, z + 1.6], b.ring) && pointInRing([x - 1.6, z - 1.6], b.ring)) return [x, z];
    }
    return null;
  };
  const tank = spot(1);
  if (tank) { batch.cyl(tank[0], H + .8, tank[1], .95, 1.6, hash(seed, 9) % 2 ? '#262c31' : '#2f5c8f', { seg: 8 }); batch.box(tank[0], H + .25, tank[1], 2.2, .5, 2.2, '#9a9a94'); }
  for (let k = 2; k < 4; k++) { const ac = spot(k); if (ac) batch.box(ac[0], H + .5, ac[1], 1.5, 1, 1, '#c9cdc9'); }
  if (info.style !== 'hall' && w > 14) { const s = spot(5); if (s) batch.box(s[0], H + 1.2, s[1], 3.4, 2.4, 3, '#cfc8b4'); }
  if (b.osm.id % 4 === 0 && w > 14) batch.box((x0 + x1) / 2, H + .16, (z0 + z1) / 2, w > d ? w * .7 : .5, .32, w > d ? .5 : d * .7, '#6e3f34');
}

/** Paint every wall of a building. Spends the shared triangle budget. */
export function paintBuilding(batch: Batch, b: CampusMapBuilding, bud: Budget): void {
  const info = architectureOf(b), paint = PAINTERS[info.style], H = b.height;
  const winding = area(b.ring) >= 0 ? 1 : -1;
  let doorEdge = -1;
  if (info.sign) {
    let best = 0;
    for (let i = 1; i < b.ring.length; i++) {
      const [ax, az] = b.ring[i - 1]!, [bx, bz] = b.ring[i]!, len = Math.hypot(bx - ax, bz - az);
      const south = Math.max(0, -winding * (bx - ax) / (len || 1)); // outward z component
      const score = len >= 9 ? len * (1 + 2 * south) : 0;
      if (score > best) { best = score; doorEdge = i; }
    }
  }
  for (let i = 1; i < b.ring.length && bud.left >= 40; i++) {
    const [ax, az] = b.ring[i - 1]!, [bx, bz] = b.ring[i]!, dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
    if (L < 3) continue;
    const nx = winding * dz / L, nz = -winding * dx / L, yaw = Math.atan2(nx, nz);
    const before = batch.triangles;
    batch.at((ax + bx) / 2 + nx * .03, 0, (az + bz) / 2 + nz * .03, yaw, () => {
      paint(batch, L, H, info, b.osm.id + i);
      if (i === doorEdge) entrance(batch, L, H, info, bud, b.osm.id);
    });
    bud.left -= batch.triangles - before;
  }
  if (bud.left > 300) { const before = batch.triangles; roofClutter(batch, b, info); bud.left -= batch.triangles - before; }
}

/** Senate House tower walls plus roof crown. rich = near LOD (mosaic, scooped fins, framed windows). */
export function drawSenateTower(batch: Batch, b: CampusMapBuilding, rich: boolean): void {
  const winding = area(b.ring) >= 0 ? 1 : -1, paint = rich ? towerNear : towerFar;
  for (let i = 1; i < b.ring.length; i++) {
    const [ax, az] = b.ring[i - 1]!, [bx, bz] = b.ring[i]!, dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
    if (L < 3) continue;
    const nx = winding * dz / L, nz = -winding * dx / L;
    batch.at((ax + bx) / 2 + nx * .03, 0, (az + bz) / 2 + nz * .03, Math.atan2(nx, nz), () => paint(batch, L, b.height, TOWER, b.osm.id + i));
  }
  const [x0, z0, x1, z1] = boundsOf(b.ring), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, H = b.height;
  batch.box(cx, H + 1.8, cz, 7, 3.4, 5.5, '#cfc4a8');
  batch.box(cx + 4.2, H + .7, cz - 1, 2.6, 1.4, 2.6, '#c8c0aa');
  batch.cyl(cx - 3.5, H + .9, cz + 3, 1.1, 1.8, '#2b3338', { seg: 8 });
  for (let k = 0; k < 4; k++) batch.box(cx - 5 + k * 1.7, H + .55, cz + 4.8, 1.4, 1.1, 1, '#c9cdc9');
  batch.cyl(cx + 2, H + 6.4, cz, .1, 6, '#6b6f70', { seg: 4 });
  batch.ball(cx + 2, H + 9.5, cz, .22, .22, .22, '#ff5a3c', { seg: 5, layer: 'glow' });
}

/** Mosque, chapel and sports crowns: always resident, cheap. */
export function drawLandmarkCrowns(batch: Batch, buildings: readonly CampusMapBuilding[], pitches: ReadonlyArray<{ ring: readonly MetrePoint[]; sport?: string }> = []): void {
  for (const b of buildings) {
    const info = architectureOf(b);
    if (info.style !== 'mosque' && info.style !== 'chapel') continue;
    const [x0, z0, x1, z1] = boundsOf(b.ring), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0, m = Math.min(w, d), H = b.height;
    if (info.style === 'mosque') {
      batch.cyl(cx, H + 1.8, cz, m * .2, 3.6, '#f2eee0', { seg: 12 });
      for (let k = 0; k < 8; k++) batch.quad(cx + Math.sin(k * .785) * m * .2, H + 2, cz + Math.cos(k * .785) * m * .2, 1.0, 1.9, '#3f8f6b', { ry: k * .785 });
      batch.ball(cx, H + 3.5, cz, m * .22, m * .17, m * .22, '#58a283', { seg: 12 });
      batch.cone(cx, H + 3.5 + m * .17 + .8, cz, .2, 1.6, '#d4b45a', { seg: 5 });
      for (const [sx, sz] of [[x0 + 1.4, z0 + 1.4], [x1 - 1.4, z0 + 1.4]] as const) {
        batch.cyl(sx, H + 7, sz, 1.0, 14, '#f4f1e4', { seg: 10 });
        batch.cyl(sx, H + 11.5, sz, 1.5, .5, '#3f8f6b', { seg: 10 });
        batch.cyl(sx, H + 15.6, sz, 1.3, 1.6, '#e8e4d2', { seg: 10 });
        batch.cone(sx, H + 17.4, sz, 1.1, 2.4, '#3f8f6b', { seg: 10 });
        batch.cone(sx, H + 19.2, sz, .1, 1, '#d4b45a', { seg: 4 });
      }
      for (const s of [-1, 1]) batch.ball(cx + s * m * .36, H + 1.3, cz, m * .09, m * .08, m * .09, '#58a283', { seg: 8 });
    } else {
      // Chapel: gabled nave roof ridge, steeple and cross at the front.
      batch.box(cx, H + .7, cz, w * .9, 1.4, .6, '#6d5a4a');
      batch.box(cx, H + 3, z1 - 2.2, 4, 6, 4, '#efe9dc');
      batch.cone(cx, H + 9, z1 - 2.2, 2.9, 7.5, '#6d5a4a', { seg: 4, ry: Math.PI / 4 });
      batch.box(cx, H + 13.6, z1 - 2.2, .22, 2.2, .22, '#efe5ce'); batch.box(cx, H + 13.9, z1 - 2.2, 1.2, .22, .22, '#efe5ce');
    }
  }
  // Large pitches: a stand along one long side and four floodlight masts with night-lit heads.
  for (const p of pitches) {
    const [x0, z0, x1, z1] = boundsOf(p.ring), w = x1 - x0, d = z1 - z0, long = Math.max(w, d), short = Math.min(w, d);
    if (long < 60 || short < 24 || (p.sport !== 'soccer' && p.sport !== 'athletics' && p.sport !== 'cricket')) continue;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, alongX = w >= d;
    if (p.sport !== 'cricket') {
      const len = Math.min(48, long * .6);
      for (let s = 0; s < 5; s++) {
        const off = short / 2 + 2.5 + s * 1.5, y = .5 + s * .6;
        if (alongX) batch.box(cx, y, z0 - (off - short / 2), len, 1, 1.5, s % 2 ? '#c9c2ad' : '#a8a18c');
        else batch.box(x0 - (off - short / 2), y, cz, 1.5, 1, len, s % 2 ? '#c9c2ad' : '#a8a18c');
      }
      if (alongX) batch.box(cx, 5.2, z0 - short / 2 - 5.5 + short / 2 - .2, len, .3, 9, '#46667a'); else batch.box(x0 - 7, 5.2, cz, 9, .3, len, '#46667a');
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const mx = cx + sx * (w / 2 + 2), mz = cz + sz * (d / 2 + 2);
      batch.cyl(mx, 9, mz, .22, 18, '#8a8f90', { seg: 5 });
      // Lamp head: dark frame, pale lenses (lit warm at night) in a 3x2 grid, facing the pitch.
      batch.at(mx, 18.4, mz, Math.atan2(-sx, -sz), () => {
        batch.box(0, 0, -.1, 3.4, 1.9, .2, '#2d3236');
        for (const y of [-.95, .95]) batch.box(0, y, .05, 3.5, .1, .12, '#454b50');
        for (const x of [-1.15, 0, 1.15]) for (const y of [-.48, .48]) {
          batch.quad(x, y, .13, .95, .7, '#c9cfcc');
          batch.quad(x, y, .15, .85, .6, '#fff1c0', { layer: 'glow' });
        }
      });
    }
  }
}

/** Plaza paving for the Senate precinct is drawn in entrance(); this re-exports the gate. */
/** Main gate: pointed pylons and steel canopies (interpretation of the 2025 photograph) with a lettered fascia. Runs inside a rotated frame. */
export function drawMainGate(gate: Batch): void {
  for (const x of [-16, 0, 16]) {
    gate.box(x, 3.4, 0, x === 0 ? 5 : 1.4, 6.8, 3, '#d6bd86');
    gate.box(x, 1.5, 1.6, x === 0 ? 5 : 1.4, 2.8, .2, '#87443f');
    gate.box(x, 1.5, -1.6, x === 0 ? 5 : 1.4, 2.8, .2, '#87443f');
    gate.box(x, .2, 0, (x === 0 ? 5 : 1.4) + 1.2, .4, 4.2, '#b9ae96');
  }
  for (const side of [-1, 1]) {
    const cx = side * 8;
    for (const z of [-2, 2]) {
      gate.box(cx, 7, z, 11, .22, .22, '#344143');
      gate.box(cx, 6.2, z, 11, .18, .18, '#344143');
      for (let k = 0; k < 6; k++) gate.box(side * 2.5 + side * k * 2, 6.6, z, 2.15, .13, .13, '#344143', { rz: k % 2 ? .4 : -.4 });
    }
    for (let k = 0; k < 7; k++) gate.box(cx - 5 + k * 1.65, 7, 0, .13, .13, 4, '#344143');
  }
  for (const face of [1, -1]) {
    gate.box(0, 8.6, face * 1.75, 30.6, 1.7, .3, '#1f5a4d');
    gate.box(0, 9.55, face * 1.75, 30.6, .18, .5, '#b99147');
    gate.at(0, 8.6, face * 1.92, face > 0 ? 0 : Math.PI, () => signLetters(gate, 'UNIVERSITY OF LAGOS', 0, 0, 0, 29.5));
  }
  for (const x of [-12, 12]) gate.box(x, 7.8, 0, .3, 1.6, 3.6, '#344143');
}
