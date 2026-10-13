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
import { ANCHORS, LANDMARK_MAPPINGS } from './layout.ts';
import { landmarkBuildingIds, standalones } from './standalone.ts';
import { landmarkLabel } from './spot-names.ts';
import { signLetters } from '../shared/signs.ts';

export type FacadeStyle = 'tower' | 'podium' | 'hall' | 'library' | 'institutional' | 'auditorium' | 'mosque' | 'chapel' | 'engineering' | 'arts' | 'law' | 'social' | 'science';
export interface ArchitectureInfo { id: string; label: string; style: FacadeStyle; accent: string; sign: boolean; kind: string; wall: string; roof: string; variant: number }

export const SENATE_OSM_ID = 653186158;
export const SENATE_TOWER_HEIGHT = 43;
export const isSenateTower = (b: Pick<CampusMapBuilding, 'osm' | 'height'>): boolean => b.osm.id === SENATE_OSM_ID && b.height === SENATE_TOWER_HEIGHT;

const STYLE_BY_LANDMARK: Record<string, FacadeStyle> = { senate: 'podium', library: 'library', auditorium: 'auditorium', 'central-mosque': 'mosque', 'education-chapel': 'chapel', engineering: 'engineering', arts: 'arts', law: 'law', 'social-sciences': 'social', science: 'science' };

/**
 * Per-landmark palette and layout variant (estimates for variety). variant picks the hall layout:
 * 0 full balconies, 1 staggered balconies + louvres, 2 louvre ribbons + sun-shade slabs, 3 stair towers, 4 ground arcade.
 */
const PALETTE: Record<string, { wall: string; accent: string; roof?: string; variant?: number }> = {
  'moremi-hall': { wall: '#f4d9dd', accent: '#c2467a', roof: '#7a2f45', variant: 1 },
  'jaja-hall': { wall: '#d8e3f0', accent: '#2a6fb0', roof: '#46586b', variant: 2 },
  'mariere-hall': { wall: '#dcebd2', accent: '#2f8a4c', roof: '#4f6b4a', variant: 3 },
  'kofo-hall': { wall: '#f6e3a6', accent: '#d08a14', roof: '#b4562f', variant: 0 },
  'makama-hall': { wall: '#e4dced', accent: '#6d3fa0', roof: '#3f4448', variant: 4 },
  'eni-njoku-hall': { wall: '#f0c8aa', accent: '#b8432a', roof: '#9a3f2f', variant: 0 },
  'queen-amina-hall': { wall: '#efe0e4', accent: '#933a58', roof: '#7a5560', variant: 1 },
  'biobaku-hall': { wall: '#dfe8e4', accent: '#2a8a86', roof: '#5f716f', variant: 2 },
  'honours-hall': { wall: '#e6e8ee', accent: '#2c4c8c', roof: '#59606e', variant: 3 },
  auditorium: { wall: '#d9d3c1', accent: '#c9a13e', roof: '#bdb7a5' },
  library: { wall: '#dcd5c2', accent: '#8f7552', roof: '#b9b3a2' },
  senate: { wall: '#ded6c1', accent: '#a79c82', roof: '#c4bba4' },
  'central-mosque': { wall: '#f1eee2', accent: '#3f8f6b', roof: '#b8c4bb' },
  'education-chapel': { wall: '#efe9dc', accent: '#7a5a3c', roof: '#7d6a5a' },
  // Faculty identities are stylisation: only Engineering's heavy louvres and roof Y-beams are sourced (transnationalarchitecture.group, Jan 2024).
  engineering: { wall: '#bdb9ae', accent: '#8d8a80', roof: '#6c6f6d' },
  arts: { wall: '#e6cfae', accent: '#8a4a38', roof: '#9a5a44' },
  law: { wall: '#dcdcd4', accent: '#27406a', roof: '#6d747a' },
  'social-sciences': { wall: '#e5e2d2', accent: '#2f8a86', roof: '#6f7d7a' },
  science: { wall: '#dfe3dc', accent: '#4f7f5c', roof: '#6a7873' },
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

const WALLS = ['#e4d8bc', '#e9e4d2', '#dccaa8', '#d9d3bf', '#e2dccb', '#d6cdb6', '#e8d2c6', '#d4dccb', '#e6d29e', '#d3d9d8', '#d9bfa6', '#ece6dc'];
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
export const floorsOf = (height: number): number => Math.max(1, Math.min(5, Math.round(height / 4.2)));
/** Bay width follows floor height (1.2x) so windows keep their proportions and stay large at any storey count. */
export const baysOf = (length: number, height: number): number => Math.max(1, Math.floor((length - 1.5) / (1.2 * (height / floorsOf(height)))));
export interface Budget { left: number }
let texturedWalls = false;
/** When the facade atlas is active, plain OSM buildings take their windows and piers from the texture. */
export const setTexturedWalls = (on: boolean): void => { texturedWalls = on; };
const LIT_TONES = ['#ffd68a', '#ffe6b0', '#f6c978'];
const CONCRETE = '#e4d9bf', SHADE = '#cdc3aa', FRAME = '#d9d0b8';
const MOSAIC = ['#efe6cf', '#9b9a8d', '#d9b45e', '#7f8a86', '#e2d7bb', '#c9c2ad'];
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
  const bays = Math.max(1, Math.round(L / 4.2)), bw = L / bays;
  batch.box(0, .7, 1.1, L, 1.4, 2.2, '#9c957f');
  for (let f = 0; f < floors; f++) {
    const y = f * fh;
    // Deep slabs read as dark shadow lines on the facade.
    if (f) batch.box(0, y - .1, 1.2, L, .5, 2.4, f % 2 ? '#b4ac96' : '#a9a18b');
    for (let i = 0; i < bays; i++) {
      const x = -L / 2 + bw * (i + .5);
      if (f) batch.quad(x, y + .52, .06, bw - .6, .75, MOSAIC[(f + i) % 3 === 0 ? 2 : (f + i) % 2 ? 0 : 1]!);
      windowPane(batch, x, y + fh * .55 + (f ? .1 : .4), .06, bw - 1.3, fh * .52, seed + i, isLit(seed, f, i), false);
    }
  }
  batch.box(0, H + .1, 1.1, L + .5, .9, 2.3, '#d8cdb0');
  // Scooped fins: four mosaic-clad segments in cream, grey and gold so the tile pattern reads from far away.
  const seg = H / 4;
  for (let i = 0; i <= bays; i++) {
    const x = -L / 2 + i * bw;
    for (let s = 0; s < 4; s++) {
      batch.box(x, seg * (s + .5) + .4, 1.1, .6, seg - .05, 2.2, MOSAIC[(i * 2 + s * 5 + seed) % 6]!);
      if ((i + s) % 4 === 0) batch.box(x, seg * (s + .5) + .4, 2.35, .3, seg - .6, .5, MOSAIC[(i + s + 3) % 6]!);
    }
  }
  void info;
};

/** Senate tower, far LOD: slabs, one glazing band per floor and plain fins. */
export const towerFar: Painter = (batch, L, H, _info, seed) => {
  const floors = Math.max(2, Math.round(H / 3.07)), fh = H / floors, bays = Math.max(1, Math.round(L / 6)), bw = L / bays;
  batch.box(0, .6, .9, L, 1.2, 1.8, '#a9a18c');
  batch.quad(0, H / 2 + .3, .08, L - .2, H - 1.4, '#4d6b75');
  for (let f = 2; f < floors; f += 2) batch.box(0, f * fh - .2, .85, L, .5, 1.7, CONCRETE);
  batch.box(0, H - .1, .95, L + .4, .8, 1.9, '#d8cdb0');
  for (let i = 0; i <= bays; i++) batch.box(-L / 2 + i * bw, H / 2 + .4, .7, .6, H - .8, 1.4, MOSAIC[(i + seed) % 2]!);
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
  const rooms = baysOf(L, H), rw = L / rooms, acc = info.accent;
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
  // Yard life: laundry on balcony lines and wall-mounted AC boxes (verified nowhere: plausible hostel detail).
  const LAUNDRY = ['#f2f2f2', '#e8c24a', '#3f78c4', '#d9534f', '#6fb06f'];
  for (let f = 1; f < floors; f++) {
    const y = f * fh;
    if (v === 0 || v === 3 || v === 4) for (let r = (seed + f) % 3; r < rooms; r += 3) {
      const x = -L / 2 + rw * (r + .5);
      batch.quad(x, y + 1.6, 1.34, rw * .8, .05, '#777');
      for (let k = 0; k < 3; k++) batch.quad(x + (k - 1) * rw * .24, y + 1.15, 1.35, .5, .8, LAUNDRY[(r + k + f) % 5]!);
    }
    for (let r = (seed + f * 2) % 4; r < rooms; r += 4) batch.box(-L / 2 + rw * (r + .5) + rw * .36, y + fh * .3, .3, .85, .55, .5, '#d9ddd9');
  }
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
  const floors = floorsOf(H), fh = H / floors;
  const n = baysOf(L, H), step = L / n;
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

const CONC = ['#aaa79c', '#9b988d', '#b9b6ab', '#a3a095'];

/** Engineering: heavy interlocking concrete louvres at first-floor level, deep slabs, and Y-beams projecting past the roof line (sourced: Jan 2024 TAG visit; colour inferred raw concrete). */
const engineering: Painter = (batch, L, H, _info, seed) => {
  const floors = floorsOf(H), fh = H / floors, n = baysOf(L, H), step = L / n;
  batch.box(0, .6, .7, L, 1.2, 1.4, '#8f8c82');
  // The louvres are the facade: two heavy blades per bay on every floor above the ground, over deep slabs.
  for (let f = 1; f < floors; f++) {
    const y = f * fh;
    batch.box(0, y, .8, L, .6, 1.8, CONC[1]!);
    for (let i = 0; i < n; i++) for (let k = 0; k < 2; k++) batch.box(-L / 2 + step * (i + .5), y + fh * (.3 + k * .38), 1.0, step * .94, .42, 2.0, CONC[(i + k + f) % 4]!);
  }
  for (let i = 0; i <= n; i++) batch.box(-L / 2 + step * i, H / 2, .6, .9, H, 1.3, CONC[(i + seed) % 3]!);
  batch.box(0, H + .25, .6, L + .4, .6, 1.4, CONC[1]!);
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + step * (i + .5);
    batch.box(x, H + 1.5, 1.2, .5, 2.6, .7, CONC[0]!);
    batch.box(x - .95, H + 3.5, 1.2, .45, 2.7, .7, CONC[2]!, { rz: .52 });
    batch.box(x + .95, H + 3.5, 1.2, .45, 2.7, .7, CONC[2]!, { rz: -.52 });
  }
};

/** Arts: a quadrangle arcade: pointed arches over a deep ground-floor gallery, balustraded gallery above, finialled cornice. */
const arts: Painter = (batch, L, H, info, seed) => {
  const floors = floorsOf(H), fh = H / floors, n = baysOf(L, H), step = L / n, g = Math.min(4.2, fh + .3);
  batch.box(0, .35, .9, L, .7, 1.8, '#b99d7e');
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + step * (i + .5), w = step * .62;
    batch.quad(x, g * .42 + .35, .08, w, g * .62, '#3a2c26');
    batch.quad(x, g * .73 + .35, .08, w * .72, w * .72, '#3a2c26', { rz: Math.PI / 4 });
    batch.box(x + step / 2, g / 2, 1.5, .62, g, .62, '#efe3cd');
    batch.box(x, g + .15, 1.5, step, .45, .7, info.accent);
    batch.box(x, H + .55, .3, .4, .9, .4, '#efe3cd');
  }
  batch.box(-L / 2, g / 2, 1.5, .62, g, .62, '#efe3cd');
  batch.box(0, g + .55, 1.3, L, .22, 1.2, '#efe3cd');
  for (let i = 0; i <= n * 2; i++) batch.box(-L / 2 + (L * i) / (n * 2), g + 1, 1.8, .14, .75, .14, '#d6c7ac');
  batch.box(0, H + .1, .5, L, .5, 1, info.accent);
  void seed;
};

/** Law: a courtyard colonnade of giant columns carrying a plain entablature and a central pediment. */
const law: Painter = (batch, L, H, info, seed) => {
  const floors = floorsOf(H), fh = H / floors, n = baysOf(L, H), step = L / n, ch = Math.min(H - .8, fh * 2);
  batch.box(0, .3, 1.2, L, .6, 2.4, '#bfc0b8');
  batch.quad(0, ch / 2 + .5, .1, L - .3, ch - .4, '#6a5c44');
  batch.quad(0, ch / 2 + .2, .14, L - 1, ch * .7, '#ffe2a0', { layer: 'glow' });
  for (let s = 0; s < 3; s++) batch.box(0, .08 + s * .16, 3.4 - s * .75, L + 1, .16, 1, '#d4d4cc');
  for (let i = 0; i <= n; i++) batch.cyl(-L / 2 + step * i, ch / 2 + .6, 1.7, .42, ch, '#ecece4', { seg: 8 });
  batch.box(0, ch + .95, 1.5, L + .5, .9, 2.2, '#e4e4dc');
  batch.box(0, ch + 1.65, 1.5, L + .8, .35, 2.5, info.accent);
  const peak = Math.min(2.4, L * .12);
  for (const s of [-1, 1]) batch.box(s * L * .12, ch + 2.4 + peak * .35, 1.5, L * .26, .4, 2.2, '#e4e4dc', { rz: s * .27 });
  void seed;
};

/** Social Sciences: a block raised on pilotis, a deep-shaded upper volume with accent panels and framed ribbon windows. */
const social: Painter = (batch, L, H, info, seed) => {
  const floors = floorsOf(H), fh = H / floors, n = baysOf(L, H), step = L / n;
  batch.quad(0, fh * .5, .1, L, fh - .2, '#33464a');
  for (let i = 0; i <= n; i++) batch.cyl(-L / 2 + step * i, fh / 2, 1.4, .26, fh, '#e9e5d6', { seg: 6 });
  batch.box(0, fh + (H - fh) / 2, .9, L + .4, H - fh, 1.8, '#e3dfcf');
  for (let f = 1; f < floors; f++) {
    const y = f * fh;
    batch.box(0, y + fh - .15, 1.2, L + .6, .4, 2.6, '#cfcabb');
    for (let i = 0; i < n; i++) {
      const x = -L / 2 + step * (i + .5);
      windowPane(batch, x, y + fh * .5, 1.82, step * .62, fh * .5, seed + i + f, isLit(seed, f, i));
      if ((i + f) % 3 === 0) batch.quad(x, y + fh * .5, 1.84, step * .85, fh * .85, info.accent);
    }
  }
  batch.box(0, H + .2, .9, L + .6, .5, 1.8, info.accent);
};

/** Science: framed ribbon glazing per floor with mullions, a glazed stair tower at one end and lab vent stacks on the roof. */
const science: Painter = (batch, L, H, info, seed) => {
  const floors = floorsOf(H), fh = H / floors, n = baysOf(L, H), step = L / n;
  for (let f = 0; f < floors; f++) {
    const y = f * fh;
    batch.box(0, y + fh - .2, .55, L, .4, 1.1, '#cfd3cb');
    batch.quad(0, y + fh * .5, .08, L - 1.2, fh * .52, '#34545a');
    batch.quad(0, y + fh * .62, .1, L - 1.2, fh * .22, '#7fa4b0');
    for (let i = 0; i <= n; i++) batch.box(-L / 2 + .6 + (L - 1.2) * i / n, y + fh * .5, .2, .14, fh * .54, .3, '#e4e7e0');
  }
  batch.box(L / 2 - 1.8, H / 2 + 1, 1.2, 3.2, H + 2, 2.4, info.accent);
  batch.quad(L / 2 - 1.8, H / 2 + 1, 2.42, 1.6, H - .5, '#7fa4b0');
  for (let k = 0; k < 3; k++) batch.cyl(-L / 2 + 3 + k * 2.2, H + 1.1, .2, .38, 2.2, '#9a9e98', { seg: 6 });
  void seed;
};

const PAINTERS: Record<FacadeStyle, Painter> = { tower: towerNear, podium, hall, library, institutional, auditorium, mosque, chapel, engineering, arts, law, social, science };

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
    // The circular plaza and glazed rotunda stand at the tower's foot (drawSenateTower); the podium keeps its plate and a canopy.
    batch.box(0, 4.4, 2.6, Math.min(L - 2, 18), .4, 2.6, '#e6dcc4');
    signBoard(batch, info.label, 6.4, Math.min(L - 2, 16), 2.0, 1, bud);
    return;
  }
  batch.box(0, bayH / 2, 1.25, w, bayH, 2.5, bayColour);
  if (info.style === 'auditorium') {
    for (let r = 0; r < Math.floor(bayH / 1.8); r++) for (let c = 0; c < Math.floor(w / 1.8); c++) batch.quad(-w / 2 + .9 + c * 1.8, .9 + r * 1.8, 2.52, 1.7, 1.7, (r + c + seed) % 2 ? '#d7b04e' : '#b88f33');
  }
  // Door with a warm lit interior (glow at night) rather than a black void, and a landing.
  batch.quad(0, 1.35, 2.54, 3.4, 2.5, '#5b4a36');
  batch.quad(0, 1.35, 2.56, 3.0, 2.2, '#8a7350');
  batch.quad(0, 1.45, 2.58, 2.6, 1.9, '#ffe2a0', { layer: 'glow' });
  batch.box(0, 1.35, 2.58, .1, 2.4, .08, '#3a2f22');
  batch.box(0, 3.55, 3.0, w + 1.4, .35, 4.6, '#dcd2ba');
  for (const s of [-1, 1]) batch.cyl(s * (w / 2 - .3), 1.75, 4.9, .26, 3.5, '#eadfc7', { seg: 6 });
  if (info.style === 'library') {
    for (let s = 0; s < 6; s++) batch.box(0, .12 + s * .16, 5.3 + (5 - s) * .7, w + 6, .16, .8, '#d7ccb2');
    batch.box(0, .08, 12.5, w + 12, .16, 9, '#d0c7ae');
    for (let i = -2; i <= 2; i++) batch.quad(i * 5, .18, 12.5, 1.2, 8.5, i % 2 ? '#bfb49b' : '#c9bea5', { rx: -Math.PI / 2 });
  } else for (let s = 0; s < 3; s++) batch.box(0, .08 + s * .15, 5.5 + (2 - s) * .8, w + 1, .15, .9, '#d4cab1');
  signBoard(batch, info.label, signY0 + 2 + labelH / 2, w - .6, 2.65, design, bud);
  if (info.style === 'hall') {
    // Hostel notice board beside the door.
    batch.box(w / 2 + 1.6, 1.7, 2.7, 2.2, 1.5, .12, '#6b4a2f');
    batch.quad(w / 2 + 1.6, 1.7, 2.78, 2, 1.3, '#efe8cf');
    for (let k = 0; k < 4; k++) batch.quad(w / 2 + 1.0 + (k % 2) * .9, 1.35 + Math.floor(k / 2) * .6, 2.8, .6, .45, ['#e8c24a', '#8fc3e8', '#e89a9a', '#a8d8a0'][k]!);
  }
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
  const info = architectureOf(b), paint = PAINTERS[info.style] ?? institutional, H = b.height;
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
  const an = ANCHORS.senate;
  if (an) {
    // Circular paved plaza in front of the tower and a glazed rotunda lobby: shallow so props stand on it.
    const px = an.x, pz = an.z + 14, R = 15;
    batch.cyl(px, .07, pz, R, .12, '#c9bc9a', { seg: 32 });
    batch.cyl(px, .12, pz, R - 3, .12, '#dcd2b6', { seg: 32 });
    for (let k = 0; k < 8; k++) batch.quad(px + Math.sin(k * .785) * R * .5, .2, pz + Math.cos(k * .785) * R * .5, 1.4, R * .55, k % 2 ? '#b3a688' : '#e8dfc6', { rx: -Math.PI / 2, ry: k * .785 });
    batch.cyl(px, 2.4, an.z + 6.5, 3.6, 4.8, '#e8dec4', { seg: 20 });
    batch.cyl(px, 1.9, an.z + 6.5, 3.66, 2.8, '#2f4c56', { seg: 20 });
    batch.cyl(px, 4.95, an.z + 6.5, 3.9, .35, '#cfc4a8', { seg: 20 });
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
  // Pitches: the soccer ground gets a stand on its far side, floodlight masts and full markings; athletics strips get lane lines; the oval a few masts.
  for (const p of pitches) {
    const [x0, z0, x1, z1] = boundsOf(p.ring), w = x1 - x0, d = z1 - z0, long = Math.max(w, d), short = Math.min(w, d), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, alongX = w >= d;
    if (p.sport === 'athletics') {
      for (let k = 1; k < 5; k++) { const o = (k / 5 - .5) * (alongX ? d : w) * .8; batch.quad(alongX ? cx : cx + o, .09, alongX ? cz + o : cz, alongX ? w * .88 : .12, alongX ? .12 : d * .88, '#f2e8dc', { rx: -Math.PI / 2 }); }
      continue;
    }
    if (long < 60 || short < 24 || (p.sport !== 'soccer' && p.sport !== 'cricket')) continue;
    if (p.sport === 'soccer') {
      batch.cyl(cx, .08, cz, 9, .02, '#e8f0e0', { seg: 24 }); batch.cyl(cx, .09, cz, 8.8, .02, '#5b8055', { seg: 24 });
      batch.quad(cx, .1, cz, alongX ? .15 : short * .94, alongX ? short * .94 : .15, '#e8f0e0', { rx: -Math.PI / 2 });
      for (const e of [-1, 1]) {
        const bx = alongX ? cx + e * (long / 2 - 8.2) : cx, bz = alongX ? cz : cz + e * (long / 2 - 8.2);
        batch.quad(bx, .1, bz, alongX ? .15 : 40, alongX ? 40 : .15, '#e8f0e0', { rx: -Math.PI / 2 });
        for (const s of [-1, 1]) batch.quad(alongX ? bx + e * 8.2 / 2 + 0 : bx + s * 20, .1, alongX ? bz + s * 20 : bz + e * 8.2 / 2, alongX ? 8.2 : .15, alongX ? .15 : 8.2, '#e8f0e0', { rx: -Math.PI / 2 });
      }
      // Stand on the far (east or south) side, seen from the default preview approach; stepped rows, a roof and a name plate.
      const len = Math.min(52, long * .6);
      for (let s = 0; s < 7; s++) {
        const off = short / 2 + 3 + s * 1.5, y = .6 + s * .75;
        if (alongX) batch.box(cx, y, cz + off - (short / 2 - d / 2), len, 1.1, 1.5, s % 2 ? '#c9c2ad' : '#a8a18c'); else batch.box(cx + off - (short / 2 - w / 2), y, cz, 1.5, 1.1, len, s % 2 ? '#c9c2ad' : '#a8a18c');
      }
      for (let k = 0; k < 6; k++) {
        const t = (k / 5 - .5) * (len - 2);
        if (alongX) batch.box(cx + t, 3.2, cz + d / 2 + 13.5, .5, 6.4, .5, '#8a8f90'); else batch.box(x1 + 13.5, 3.2, cz + t, .5, 6.4, .5, '#8a8f90');
      }
      if (alongX) batch.box(cx, 6.6, cz + d / 2 + 9.5, len, .35, 10.5, '#46667a'); else batch.box(x1 + 9.5, 6.6, cz, 10.5, .35, len, '#46667a');
      if (!alongX) batch.at(x1 + 4.2, 8.3, cz, -Math.PI / 2, () => signBoard(batch, 'STADIUM', 0, 16, 0, 0, { left: 10000 }));
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const mx = cx + sx * (w / 2 + 2), mz = cz + sz * (d / 2 + 2);
      batch.cyl(mx, 9, mz, .22, 18, '#8a8f90', { seg: 5 });
      // Lamp head: dark frame, pale lenses (lit warm at night) in a 3x2 grid, facing the pitch.
      batch.at(mx, 18.4, mz, Math.atan2(-sx, -sz), () => {
        batch.box(0, 0, -.1, 3.4, 1.9, .2, '#2d3236');
        for (const y of [-.95, .95]) batch.box(0, y, .05, 3.5, .1, .12, '#454b50');
        for (const x of [-1.15, 0, 1.15]) {
          batch.quad(x, 0, .13, .95, 1.3, '#c9cfcc');
          batch.quad(x, 0, .15, .85, 1.2, '#fff1c0', { layer: 'glow' });
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
