/**
 * Facade and landmark architecture for the mapped UNILAG campus.
 *
 * Footprints and heights come from OpenStreetMap (map.generated.ts). Everything drawn here is an
 * interpretation, merged into one Batch: no textures, no downloads. Evidence used:
 *  - Senate House: 14 storeys, designed 1980, completed 1985 (James Cubitt & Partners), concrete facade with
 *    deep external sun-shading (hollow brise-soleil finished in cement and mosaic). Cream and red accents follow
 *    the Transnational Architecture Group photograph recorded in docs/unilag-data/FIDELITY.md.
 *  - Main Library and the early-1960s core are Tropical Modernist (flat overhanging roofs, louvre screens).
 *  - Main gate: pointed walls plus steel canopy (Ei'eke photograph, FIDELITY.md); the lettering is required by the brief.
 * Dimensions, hall colours and facade rhythm are estimates, not measurements.
 */
import type { Batch } from '../../scene/types.ts';
import type { CampusMapBuilding, MetrePoint } from './geo.ts';
import { boundsOf } from './geo.ts';
import { LANDMARK_MAPPINGS } from './layout.ts';
import { landmarkBuildingIds, standalones } from './standalone.ts';
import { landmarkLabel } from './spot-names.ts';
import { signLetters } from '../shared/signs.ts';

export type FacadeStyle = 'tower' | 'hall' | 'library' | 'institutional' | 'auditorium';
export interface ArchitectureInfo { id: string; label: string; style: FacadeStyle; accent: string; sign: boolean; kind: string }

export const SENATE_OSM_ID = 653186158;
export const SENATE_TOWER_HEIGHT = 43;
export const isSenateTower = (b: Pick<CampusMapBuilding, 'osm' | 'height'>): boolean => b.osm.id === SENATE_OSM_ID && b.height === SENATE_TOWER_HEIGHT;

const STYLE_BY_LANDMARK: Record<string, FacadeStyle> = { senate: 'tower', library: 'library', auditorium: 'auditorium' };

/** osm building id -> what the landmark layout says it is. Nodes resolve to the footprint that contains them. */
const LANDMARK_BUILDINGS: ReadonlyMap<number, ArchitectureInfo> = (() => {
  const result = new Map<number, ArchitectureInfo>();
  for (const [id, osmId] of landmarkBuildingIds()) {
    const mapping = LANDMARK_MAPPINGS[id]!;
    const style = STYLE_BY_LANDMARK[id] ?? (mapping.kind === 'hall' ? 'hall' : 'institutional');
    result.set(osmId, { id, label: landmarkLabel(id), style, accent: mapping.color, sign: true, kind: mapping.kind });
  }
  for (const s of standalones()) {
    const style: FacadeStyle = s.kind === 'hall' ? 'hall' : 'institutional';
    result.set(s.building.osm.id, { id: s.id, label: s.label, style, accent: s.accent, sign: true, kind: s.kind });
  }
  return result;
})();

const PLAIN: ArchitectureInfo = { id: '', label: '', style: 'institutional', accent: '#b9ad92', sign: false, kind: '' };
export function architectureOf(b: CampusMapBuilding): ArchitectureInfo {
  if (isSenateTower(b)) return { id: 'senate', label: 'Senate House', style: 'tower', accent: '#a24b3b', sign: false, kind: 'administration' };
  return LANDMARK_BUILDINGS.get(b.osm.id) ?? PLAIN;
}

const WALLS = ['#e4d8bc', '#e9e4d2', '#dccaa8', '#d9d3bf'];
export function bodyColour(b: CampusMapBuilding): string {
  const info = architectureOf(b);
  if (info.style === 'tower') return '#e8dec6';
  if (info.style === 'hall') return '#ece4d0';
  if (info.style === 'library') return '#e6dfcb';
  return WALLS[b.osm.id % WALLS.length]!;
}
export function roofColour(b: CampusMapBuilding): string {
  const info = architectureOf(b);
  if (info.style === 'tower') return '#cfc4a8';
  if (info.style === 'library' || info.style === 'auditorium') return '#cbc2a8';
  return b.osm.id % 4 === 0 ? '#88584a' : '#687271';
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

export interface Budget { left: number }
const GLASS = '#41606a', LIT = '#d8c98f', CONCRETE = '#e4d9bf', SHADE = '#cdc3aa';
/** Glass pane; a lit pane adds a glow quad that mapped-geometry shows only at dusk and night. */
function pane(batch: Batch, x: number, y: number, z: number, w: number, h: number, lit: boolean): void {
  batch.quad(x, y, z, w, h, GLASS);
  if (lit) batch.quad(x, y, z + .02, w * .94, h * .92, LIT, { layer: 'glow' });
}
const hash = (a: number, b: number): number => {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
};

/** Winding-correct outward normals, so concave halls face the right way. */
function area(ring: readonly MetrePoint[]): number {
  let sum = 0;
  for (let i = 1; i < ring.length; i++) sum += ring[i - 1]![0] * ring[i]![1] - ring[i]![0] * ring[i - 1]![1];
  return sum;
}

type Painter = (batch: Batch, length: number, height: number, info: ArchitectureInfo, seed: number) => void;

/** The Senate House curtain: deep concrete floor slabs and full-height fins around recessed glazing. */
const tower: Painter = (batch, L, H, info, seed) => {
  const floors = Math.max(2, Math.round(H / 3.07)), fh = H / floors;
  const bays = Math.max(1, Math.round(L / 3)), bw = L / bays;
  batch.box(0, .6, .9, L, 1.2, 1.8, '#b7ab90');
  for (let f = 0; f < floors; f++) {
    const y = f * fh;
    const lit = hash(seed, f) % 12 === 0;
    pane(batch, 0, y + fh * .5 + (f ? 0 : .3), .1, L - .2, fh - (f ? 1.1 : .5), lit);
    if (f) batch.box(0, y - .2, .85, L, .55, 1.7, CONCRETE);
  }
  batch.box(0, H - .1, .95, L + .4, .7, 1.9, CONCRETE);
  for (let i = 0; i <= bays; i++) batch.box(-L / 2 + i * bw, H / 2 + .4, .7, .5, H - .8, 1.4, i % 3 === 0 ? info.accent : '#eee4cc');
};

const hall: Painter = (batch, L, H, info, seed) => {
  const floors = Math.max(2, Math.min(6, Math.round(H / 3.2))), fh = H / floors;
  const rooms = Math.max(1, Math.round(L / 3.3)), rw = L / rooms;
  for (let f = 0; f < floors; f++) {
    const y = f * fh;
    if (f) {
      batch.box(0, y + .1, .75, L, .22, 1.5, '#efe8d6');
      batch.quad(0, y + .7, 1.52, L - .1, .9, info.accent);
    }
    for (let r = 0; r < rooms; r++) {
      const lit = hash(seed + f, r) % 9 === 0;
      pane(batch, -L / 2 + rw * (r + .5), y + fh * .6, .06, rw * .5, fh * .42, lit);
    }
  }
  for (let i = 0; i <= rooms; i += 2) batch.box(-L / 2 + i * rw, H / 2, .35, .32, H, .7, info.accent);
  batch.box(0, H + .2, .2, L, .45, .5, '#d8cfb6');
};

const library: Painter = (batch, L, H, _info, seed) => {
  batch.box(0, .25, .8, L, .5, 1.6, '#b9ae96');
  batch.quad(0, 1.6, .08, L, 2.2, GLASS);
  batch.quad(0, H * .6 + 1, .08, L, Math.max(1, H - 4.4), hash(seed, 1) % 3 ? GLASS : '#4c6d72');
  const fins = Math.max(2, Math.round(L / 1.2));
  for (let i = 0; i <= fins; i++) batch.box(-L / 2 + (L * i) / fins, H * .55 + .5, .55, .24, H - 2.6, 1.1, '#ebe4d0');
  batch.box(0, H + .35, 1.1, L + 1.4, .7, 2.8, '#d9d0b6');
};

const institutional: Painter = (batch, L, H, _info, seed) => {
  const floors = Math.max(1, Math.floor(H / 3.4)), fh = H / floors;
  const n = Math.max(1, Math.floor((L - 1.5) / 3.8)), step = L / n;
  for (let f = 0; f < floors; f++) {
    const y = f * fh;
    batch.box(0, y + fh - .25, .5, L, .4, 1, SHADE);
    for (let i = 0; i < n; i++) {
      const lit = hash(seed + f, i) % 9 === 0;
      pane(batch, -L / 2 + step * (i + .5), y + fh * .5, .06, Math.min(2.2, step * .55), fh * .5, lit);
    }
  }
  for (let i = 0; i <= n; i += 2) batch.box(-L / 2 + step * i, H / 2, .22, .3, H, .45, '#d9cfb4');
  batch.box(0, H + .2, .12, L, .45, .4, '#e1d8c2');
};

const auditorium: Painter = (batch, L, H, info, seed) => {
  institutional(batch, L, H, info, seed);
  batch.box(0, H + .5, 1.3, L + 1.6, .9, 3.4, '#cdbd8e');
};

const PAINTERS: Record<FacadeStyle, Painter> = { tower, hall, library, institutional, auditorium };

/** A canopy, steps, doors and a name plate on the front of a landmark. Local frame: x along the wall, +z outward. */
function entrance(batch: Batch, L: number, H: number, info: ArchitectureInfo, bud: Budget): void {
  const w = Math.min(7, Math.max(3.5, L * .3)), signW = Math.min(L - 1, 15);
  batch.box(0, .12, 1.5, w + 1, .24, 3, '#c9bfa6');
  batch.box(0, .3, 1.0, w, .2, 1.4, '#d4cab1');
  batch.quad(0, 1.4, .1, Math.min(w - 1.5, 3), 2.5, '#2f4a4f');
  batch.box(0, 3.55, 2.4, w + .8, .35, 4, '#dad0b8');
  for (const s of [-1, 1]) batch.cyl(s * (w / 2 - .2), 1.8, 4.1, .24, 3.6, '#eadfc7', { seg: 6 });
  const y = Math.min(H - 1, 5.2);
  batch.box(0, y, .28, signW, 1.3, .24, '#244d49');
  if (info.label.length <= 26 && bud.left > 700) signLetters(batch, info.label, 0, y, .43, signW - .8);
}

/** Paint every wall of a building. Spends the shared triangle budget; returns the remaining count. */
export function paintBuilding(batch: Batch, b: CampusMapBuilding, bud: Budget): void {
  const info = architectureOf(b), paint = PAINTERS[info.style], H = b.height;
  const winding = area(b.ring) >= 0 ? 1 : -1;
  let doorEdge = -1;
  if (info.sign) {
    let best = 0;
    for (let i = 1; i < b.ring.length; i++) {
      const [ax, az] = b.ring[i - 1]!, [bx, bz] = b.ring[i]!, len = Math.hypot(bx - ax, bz - az);
      const south = Math.max(0, -winding * (bx - ax) / (len || 1)); // outward z component
      const score = len >= 7 ? len * (1 + 2 * south) : 0;
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
      if (i === doorEdge) entrance(batch, L, H, info, bud);
    });
    bud.left -= batch.triangles - before;
  }
}

/** Always-resident landmark crowns and the Senate tower, so the skyline icon reads from across campus. */
export function drawLandmarkCrowns(batch: Batch, buildings: readonly CampusMapBuilding[]): void {
  for (const b of buildings) {
    const info = architectureOf(b), [x0, z0, x1, z1] = boundsOf(b.ring), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    if (info.style === 'tower') {
      paintBuilding(batch, b, { left: 6000 });
      batch.box(cx, b.height + 1.8, cz, Math.min(w, 9) * .6, 3.4, Math.min(d, 9) * .6, '#cfc4a8');
      batch.cyl(cx + 2, b.height + 5, cz, .9, 2.6, '#9aa5a5', { seg: 8 });
      batch.cyl(cx - 3, b.height + 6, cz + 1, .08, 5, '#6b6f70', { seg: 4 });
    } else if (info.id === 'central-mosque') {
      batch.ball(cx, b.height + .3, cz, Math.min(w, d) * .22, Math.min(w, d) * .18, Math.min(w, d) * .22, '#6fa08d', { seg: 10 });
      batch.cyl(x0 + 1.5, b.height + 7, z0 + 1.5, 1.1, 14, '#efe7d2', { seg: 8 });
      batch.cone(x0 + 1.5, b.height + 15.5, z0 + 1.5, 1.4, 3, '#6fa08d', { seg: 8 });
    } else if (info.id === 'education-chapel') {
      batch.box(cx, b.height + 3.2, cz, .45, 5.5, .45, '#efe5ce');
      batch.box(cx, b.height + 4.4, cz, 2.6, .45, .45, '#efe5ce');
    }
  }
}

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
