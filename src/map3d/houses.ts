/**
 * OWNER: world
 * THE HOUSES ON THE 3D MAP, at whatever scale the city has grown to.
 *
 * Every player has a house on a plot of an estate (src/game/content/world.ts); a local government
 * holds up to 100,352 of them. Nothing here draws a house per DOM node or a mesh per house:
 *
 *   FAR      the whole city: per local government, its estates are gathered into at most
 *            BINS × BINS blocks (plus one for the first, big estate), each as tall as it is
 *            full. ONE instanced mesh for the city, built from the city summary (512 counters per
 *            local government) — two million residents cost the same as twenty.
 *   NEARER   the local government under the middle of the view: one flat pad per estate, tinted
 *            by how full it is. ONE instanced mesh.
 *   CLOSE    the estates in the middle of the view, as real houses: instanced by part (walls,
 *            doors, windows, roofs by shape, fences, yard pieces, plots, the green light of an
 *            owner who is online, scaffolding round an upgrade). The look of a house is a few
 *            small numbers (unpackStyle), written as per-instance colours. Estates are detailed
 *            nearest-first until the DETAIL_BUDGET of triangles is used; the rest stay pads.
 *
 *   createHouses(kit, pack) → {
 *     group, triangles, level,
 *     setSummary(Map<lga, { occ }>)                 rebuild FAR
 *     update(view, data, { own, serverNow })        choose the level for this view; returns the estates it wants loaded
 *     detailed() → [{ lga, estate }]                 the estates drawn as houses right now
 *     dispose()
 *   }
 * Pure geometry work on typed arrays: it runs under `node --test` without a WebGL context.
 */
import { createBatch } from '../scene/build.ts';
import { leanGeometry } from './city-build.ts';
import { PLOTS_PER_ESTATE, HOUSE_STYLE, HOUSE_TIERS } from '../game/content/world.ts';
import { unpackStyle } from '../scene/house-style.ts';
import { estateLayout } from './estates.ts';
import { lgaAt } from './lga.ts';
import type * as THREE from 'three';
import type { CityPack } from './types.ts';
import type { WorldData, WorldHouse } from './world-data.ts';
import { HOUSES_DETAIL_TRIANGLES, HOUSES_MAX_DETAILED } from '../budgets.ts';

/** What createHouses needs of the scene kit (src/scene/kit.ts): Three.js itself, which is loaded lazily and so is never imported here as a value. */
export interface Kit { THREE: typeof THREE }
/** The level of detail the layer draws at: the whole city as blocks, one local government as pads, the estates in view as houses. */
export type HouseLevel = 'far' | 'near' | 'close';
/** One local government's counters, as much as the layer reads of a city summary (world-data.ts CitySummary). */
export interface HouseSummary { occ: Uint8Array; houses?: number }
/** The view the layer chooses its level for: the middle of the view, how far the camera is, and CSS pixels one map unit covers there. */
export interface HouseView { x: number; z: number; distance: number; pixels: number }
/** The player's own plot, drawn as a lit plot. */
export interface OwnPlot { lga: string; estate: number; plot: number }
export interface HouseOptions { own?: OwnPlot | null; serverNow?: number; visible?: boolean }
/** An estate the layer wants loaded, or has drawn. */
export interface EstateRef { lga: string; estate: number }
export interface HouseCounts { far: number; pads: number; detail: number; estates: number; calls: number }
export interface Houses {
  group: THREE.Group
  readonly level: HouseLevel
  readonly triangles: number
  counts: () => HouseCounts
  perHouse: number
  setSummary: (next: ReadonlyMap<string, HouseSummary> | null) => void
  update: (view: HouseView, data: Pick<WorldData, 'estate'> | null | undefined, options?: HouseOptions) => EstateRef[]
  detailed: () => EstateRef[]
  dispose: () => void
}
type Batch = ReturnType<typeof createBatch>;
interface Layer { mesh: THREE.InstancedMesh; capacity: number; geometryName: string }
/** An instance of a box-shaped part (walls, roofs, fences, ...): its middle, width and height. */
interface Part { x: number; z: number; w: number; h: number; colour: string; pitch?: number; /** Paint variation, -1..1: no two walls or roofs are quite the same shade. */ j?: number }
interface Plot { x: number; z: number; s: number; colour: string }
interface Dot { x: number; y: number; z: number; w: number; colour: string }
interface FarBlock { x: number; z: number; w: number; d: number; fill: number; colour: string; front?: boolean }
interface Pad { cell: { x: number; z: number; size: number }; fill: number }
interface DetailEstate extends EstateRef { houses: Map<number, WorldHouse>; at: number }
/** The look of a house as unpackStyle returns it: one index per field of HOUSE_STYLE. */
interface HouseStyleIndexes { shape: number; wall: number; roof: number; door: number; windows: number; fence: number; yard: number; sign: number }
/** HOUSE_STYLE read by field name: the lists of options; `hex` is the colour of those that have one. */
const STYLE_OPTIONS: Readonly<Record<string, readonly { id: string; hex?: string }[]>> = HOUSE_STYLE;

export const BINS = 4;
// With the city itself (about 67,000 triangles), the far blocks and the pads, this keeps the whole frame under CITY_TRIANGLE_BUDGET (city-build.ts):
// one full estate of 196 houses, or several that are filling up.
export const DETAIL_BUDGET = HOUSES_DETAIL_TRIANGLES.value;
export const PAD_DISTANCE = 150;
/** Houses get frames, bars, awnings, a plinth and a gate (a few more triangles each) when a plot is at least this many CSS pixels wide and the estates in view still fit DETAIL_BUDGET. */
export const RICH_PIXELS = 16;
const MAX_DETAILED = HOUSES_MAX_DETAILED.value;
const SHAPES = HOUSE_STYLE.shape.map((shape) => shape.id);
/** How big a house is on its plot, by tier rank: the starter is small, a villa fills the plot. */
const TIER_SCALE = [0.62, 0.7, 0.78, 0.86, 0.94], TIER_HEIGHT = [0.5, 0.56, 0.62, 0.86, 0.96];
const YARD: Record<string, readonly [string, string, number]> = { flowers: ['green', '#e86a8a', 0.5], tree: ['green', '#3f8a57', 1], palm: ['green', '#4f9a5f', 1.25], tank: ['box', '#2f3b46', 0.9], gen: ['box', '#c9423a', 0.6], car: ['box', '#2b5fa8', 0.7], kiosk: ['box', '#e8a13a', 0.8] };

export function createHouses(kit: Kit, pack: CityPack): Houses {
  const { THREE } = kit;
  const group = new THREE.Group();
  group.name = 'houses';
  const lit = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
  const flat = new THREE.MeshBasicMaterial({ vertexColors: true });
  const block = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, transparent: true, opacity: 0.92 });
  const dummy = new THREE.Object3D(), tint = new THREE.Color(), tintB = new THREE.Color();
  const unit = (draw: (batch: Batch) => void) => { const batch = createBatch(THREE); draw(batch); return batch.build({ solid: lit, glow: lit, glass: lit }).meshes[0]!.geometry; };
  // One unit house: 1 wide, 1 deep, walls 1 high; the roof sits on top. Everything is white and takes its colour per instance.
  // Vertex colours are grey tones that multiply that colour: a darker plinth, shaded eaves, dark window bars cost nothing to draw.
  const shade = (geometry: THREE.BufferGeometry, tone: (y: number, ny: number) => number) => {
    const { position, normal, color } = geometry.attributes as Record<string, THREE.BufferAttribute>;
    for (let i = 0; i < position!.count; i++) { const t = tone(position!.getY(i), normal!.getY(i)); color!.setXYZ(i, t, t, t); }
    return geometry;
  };
  /** A mesh from flat faces: each is its corner points, its normal and its grey tone. */
  const faces = (list: readonly (readonly [number[][], number[], number])[]) => {
    const pos: number[] = [], nor: number[] = [], col: number[] = [], idx: number[] = [];
    for (const [points, normal, tone] of list) {
      const base = pos.length / 3;
      for (const point of points) { pos.push(...point); nor.push(...normal); col.push(tone, tone, tone); }
      for (let i = 1; i < points.length - 1; i++) idx.push(base, base + i, base + i + 1);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
    geometry.setIndex(idx);
    return geometry;
  };
  /** A flat panel on the front wall (facing +z) from x0..x1, y0..y1 at depth z. */
  const panel = (x0: number, x1: number, y0: number, y1: number, z: number, tone: number): [number[][], number[], number] => [[[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], [0, 0, 1], tone];
  const roofShade = (kind: 'gable' | 'pyramid') => shade(leanGeometry(THREE, kind), (y) => 0.78 + 0.22 * Math.min(1, y / 0.5));
  /** The walls of the CLOSE detail tier: a dark plinth band, then the paint (16 triangles; no top, the roof covers it). */
  const richWalls = () => {
    const list: (readonly [number[][], number[], number])[] = [];
    for (const [nx, nz] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
      // Along the wall, left to right as seen from outside.
      const point = (u: number, y: number) => [nx ? nx * 0.5 : (nz > 0 ? u : -u), y, nz ? nz * 0.5 : (nx > 0 ? -u : u)];
      for (const [y0, y1, t0, t1] of [[0, 0.1, 0.62, 0.62], [0.1, 1, 0.9, 1]] as const) {
        const quad = [point(-0.5, y0), point(0.5, y0), point(0.5, y1), point(-0.5, y1)];
        list.push([quad, [nx, 0, nz], (t0 + t1) / 2]);
      }
    }
    return faces(list);
  };
  const geometries: Record<string, THREE.BufferGeometry> = {
    walls: shade(leanGeometry(THREE, 'box'), (y, ny) => ny > 0.5 ? 1 : 0.8 + 0.2 * y),
    'walls+': richWalls(),
    door: unit((u) => u.quad(0, 0.3, 0.506, 0.24, 0.6, '#ffffff')),
    // A frame round the door and an awning over it (a sloped sheet and its front edge).
    'door+': faces([panel(-0.14, 0.14, 0, 0.64, 0.505, 0.5), panel(-0.12, 0.12, 0, 0.6, 0.506, 1), [[[-0.17, 0.65, 0.6], [0.17, 0.65, 0.6], [0.17, 0.7, 0.51], [-0.17, 0.7, 0.51]], [0, 0.88, 0.47], 1], panel(-0.17, 0.17, 0.62, 0.65, 0.6, 0.72)]),
    glass: unit((u) => { u.quad(-0.3, 0.58, 0.506, 0.2, 0.26, '#ffffff'); u.quad(0.3, 0.58, 0.506, 0.2, 0.26, '#ffffff'); }),
    // Each window: a dark frame, the glass, two burglar-proof bars across it.
    'glass+': faces([-0.3, 0.3].flatMap((x) => [panel(x - 0.125, x + 0.125, 0.44, 0.73, 0.505, 0.38), panel(x - 0.1, x + 0.1, 0.45, 0.71, 0.506, 1), panel(x - 0.04, x - 0.025, 0.45, 0.71, 0.507, 0.3), panel(x + 0.025, x + 0.04, 0.45, 0.71, 0.507, 0.3)])),
    // Roofs: a ridge (a three-sided prism lying along the house), a pyramid, a slab, two small pyramids. Twelve triangles or so each.
    gable: roofShade('gable'),
    hip: roofShade('pyramid'),
    flat: unit((u) => u.box(0, 0.06, 0, 1.1, 0.12, 1.1, '#ffffff')),
    twin: (() => { const a = roofShade('gable'); a.scale(0.5, 0.9, 1); const left = a.clone().translate(-0.28, 0, 0), right = a.translate(0.28, 0, 0); const merged = new THREE.BufferGeometry(); for (const name of ['position', 'normal', 'color']) merged.setAttribute(name, new THREE.BufferAttribute(Float32Array.from([...left.attributes[name]!.array, ...right.attributes[name]!.array]), 3)); const n = left.attributes.position!.count; merged.setIndex([...left.index!.array, ...Array.from(right.index!.array, (i) => i + n)]); left.dispose(); right.dispose(); return merged; })(),
    fence: unit((u) => { for (const [x, z, ry] of [[0, 0.5, 0], [0, -0.5, Math.PI], [0.5, 0, Math.PI / 2], [-0.5, 0, -Math.PI / 2]] as [number, number, number][]) u.quad(x, 0.11, z, 1, 0.22, '#ffffff', { ry }); }),
    // The same wall with a gate in the front: two leaves of dark steel between the piers.
    'fence+': faces([panel(-0.5, -0.1, 0, 0.24, 0.5, 1), panel(0.1, 0.5, 0, 0.24, 0.5, 1), panel(-0.1, 0.1, 0, 0.3, 0.5, 0.36),
      [[[0.5, 0, -0.5], [-0.5, 0, -0.5], [-0.5, 0.24, -0.5], [0.5, 0.24, -0.5]], [0, 0, -1], 0.95], [[[0.5, 0, 0.5], [0.5, 0, -0.5], [0.5, 0.24, -0.5], [0.5, 0.24, 0.5]], [1, 0, 0], 0.88], [[[-0.5, 0, -0.5], [-0.5, 0, 0.5], [-0.5, 0.24, 0.5], [-0.5, 0.24, -0.5]], [-1, 0, 0], 0.88]]),
    green: unit((u) => u.cone(0, 0.42, 0, 0.3, 0.84, '#ffffff', { seg: 4 })),
    box: unit((u) => u.box(0, 0.2, 0, 0.3, 0.4, 0.3, '#ffffff')),
    // The "online" light: a small flat diamond over the roof (two triangles, unlit green).
    dot: (() => { const geometry = new THREE.PlaneGeometry(1, 1); geometry.rotateX(-Math.PI / 2); geometry.rotateY(Math.PI / 4); geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(12).fill(1), 3)); return geometry; })(),
    scaffold: unit((u) => { for (const [x, z] of [[-0.56, -0.56], [0.56, -0.56], [-0.56, 0.56], [0.56, 0.56]] as [number, number][]) u.box(x, 0.75, z, 0.05, 1.5, 0.05, '#ffffff'); for (const y of [0.5, 1.0, 1.5]) { u.box(0, y, 0.56, 1.17, 0.04, 0.05, '#ffffff'); u.box(0, y, -0.56, 1.17, 0.04, 0.05, '#ffffff'); u.box(0.56, y, 0, 0.05, 0.04, 1.17, '#ffffff'); u.box(-0.56, y, 0, 0.05, 0.04, 1.17, '#ffffff'); } }),
    pad: (() => { const geometry = new THREE.PlaneGeometry(1, 1); geometry.rotateX(-Math.PI / 2); const colours = new Float32Array(12).fill(1); geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3)); return geometry; })(),
    block: leanGeometry(THREE, 'box'),
  };
  const trianglesOf = (name: string) => geometries[name]!.index!.count / 3;

  // ---- instanced layers: created once, grown when needed, refilled when the level or the data changes --------
  const layers = new Map<string, Layer>();
  function layer(name: string, geometryName: string, material: THREE.Material, capacity: number) {
    let entry = layers.get(name);
    if (!entry || entry.capacity < capacity) {
      if (entry) { group.remove(entry.mesh); entry.mesh.dispose?.(); }
      const size = Math.max(16, Math.ceil(capacity * 1.3));
      const mesh = new THREE.InstancedMesh(geometries[geometryName]!, material, size);
      mesh.name = `houses-${name}`; mesh.frustumCulled = false; mesh.count = 0; mesh.matrixAutoUpdate = false; mesh.renderOrder = name === 'far' ? 1 : 0;
      mesh.setColorAt(0, tint.set('#ffffff'));
      group.add(mesh);
      entry = { mesh, capacity: size, geometryName };
      layers.set(name, entry);
    }
    return entry.mesh;
  }
  function fill<T>(name: string, geometryName: string, material: THREE.Material, items: readonly T[], place: ((item: T, o: THREE.Object3D, colour: THREE.Color) => void) | null) {
    if (!items.length) { const entry = layers.get(name); if (entry) { entry.mesh.count = 0; entry.mesh.visible = false; } return 0; }
    const mesh = layer(name, geometryName, material, items.length);
    items.forEach((item, i) => { place!(item, dummy, tint); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); mesh.setColorAt(i, tint); });
    mesh.count = items.length; mesh.visible = true;
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor!.needsUpdate = true;
    return items.length * trianglesOf(geometryName);
  }

  // ---- FAR: the city as blocks -------------------------------------------------------------------
  let summary: ReadonlyMap<string, HouseSummary> | null = null, farKey = '', farTriangles = 0, hiddenLga: string | null = null;
  function buildFar() {
    const items: FarBlock[] = [];
    if (summary) for (const lga of pack.lgas) {
      const occ = summary.get(lga.id)?.occ;
      if (!occ || lga.id === hiddenLga) continue;
      const layout = estateLayout(pack, lga.id)!, front = layout.cells[0]!;
      if (occ[0]) items.push({ x: front.x, z: front.z, w: front.size * 0.92, d: front.size * 0.92, fill: occ[0] / PLOTS_PER_ESTATE, colour: lga.tint, front: true });
      // The compact estates are gathered into a few blocks, each hugging the estates it stands for.
      const xs = lga.polygon.map((point) => point[0]), zs = lga.polygon.map((point) => point[1]);
      const minX = Math.min(...xs), minZ = Math.min(...zs), stepX = (Math.max(...xs) - minX) / BINS || 1, stepZ = (Math.max(...zs) - minZ) / BINS || 1;
      const bins = new Map<number, { x0: number; x1: number; z0: number; z1: number; houses: number; estates: number }>();
      for (let i = 1; i < layout.count; i++) {
        if (!occ[i]) continue;
        const cell = layout.cells[i]!, key = Math.min(BINS - 1, Math.floor((cell.x - minX) / stepX)) + BINS * Math.min(BINS - 1, Math.floor((cell.z - minZ) / stepZ));
        let bin = bins.get(key);
        if (!bin) bins.set(key, bin = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity, houses: 0, estates: 0 });
        bin.x0 = Math.min(bin.x0, cell.x - cell.size / 2); bin.x1 = Math.max(bin.x1, cell.x + cell.size / 2); bin.z0 = Math.min(bin.z0, cell.z - cell.size / 2); bin.z1 = Math.max(bin.z1, cell.z + cell.size / 2);
        bin.houses += occ[i]!; bin.estates += 1;
      }
      for (const bin of bins.values()) items.push({ x: (bin.x0 + bin.x1) / 2, z: (bin.z0 + bin.z1) / 2, w: bin.x1 - bin.x0, d: bin.z1 - bin.z0, fill: bin.houses / (bin.estates * PLOTS_PER_ESTATE), colour: lga.tint });
    }
    farTriangles = fill('far', 'block', block, items, (item, o, colour) => {
      o.position.set(item.x, 0.03, item.z); o.rotation.set(0, 0, 0); o.scale.set(item.w, 0.12 + item.fill * (item.front ? 1.0 : 1.5), item.d);
      colour.set('#f4ead2').lerp(tintB.set('#b5593c'), 0.25 + item.fill * 0.6);
    });
  }

  // ---- NEARER: one pad per estate of the local government in view ---------------------------------
  let padsKey = '', padTriangles = 0;
  function buildPads(lga: string, occ: Uint8Array | undefined, skip: Set<number>) {
    const layout = estateLayout(pack, lga)!, items: Pad[] = [];
    for (let i = 0; i < layout.count; i++) if (!skip.has(i)) items.push({ cell: layout.cells[i]!, fill: (occ?.[i] || 0) / PLOTS_PER_ESTATE });
    padTriangles = fill('pads', 'pad', flat, items, (item, o, colour) => {
      o.position.set(item.cell.x, 0.025, item.cell.z); o.rotation.set(0, 0, 0); o.scale.set(item.cell.size * 0.92, 1, item.cell.size * 0.92);
      if (item.fill > 0) colour.set('#efe3c6').lerp(tintB.set('#b5593c'), 0.2 + item.fill * 0.65); else colour.set('#d3dfb6');
    });
  }

  // ---- CLOSE: the estates in view as houses ----------------------------------------------------------
  let detailKey = '', detailTriangles = 0, drawn: EstateRef[] = [];
  const hex = (field: string, index: number) => STYLE_OPTIONS[field]![index]?.hex ?? '#ffffff';
  function buildDetail(list: readonly DetailEstate[], serverNow: number, own: OwnPlot | null, rich: boolean) {
    const plots: Plot[] = [], walls: Part[] = [], doors: Part[] = [], glass: Part[] = [], roofs: Record<string, Part[]> = Object.fromEntries(SHAPES.map((shape): [string, Part[]] => [shape, []])), fences: Part[] = [], greens: Part[] = [], boxes: Part[] = [], dots: Dot[] = [], scaffolds: Part[] = [];
    for (const { lga, estate, houses } of list) {
      const layout = estateLayout(pack, lga)!, pitch = layout.pitch(estate);
      for (let plot = 0; plot < PLOTS_PER_ESTATE; plot++) {
        const at = layout.plot(estate, plot), house = houses.get(plot);
        const mine = own && own.lga === lga && own.estate === estate && own.plot === plot;
        plots.push({ x: at.x, z: at.z, s: pitch * 0.9, colour: mine ? '#ffe08a' : house ? '#e9e4d2' : '#cdd9b2' });
        if (!house) continue;
        const { tier, style } = unpackStyle(house.s) as { tier: keyof typeof HOUSE_TIERS; style: HouseStyleIndexes }, rank = HOUSE_TIERS[tier].rank, w = pitch * 0.9 * TIER_SCALE[rank]! * 0.72, h = pitch * 0.9 * TIER_HEIGHT[rank]! * 0.7;
        const item = { x: at.x, z: at.z - pitch * 0.06, w, h, pitch };
        // Two coats of paint are never the same: a small, fixed shade difference per plot.
        const seed = Math.imul(plot + 1, 2654435761) ^ Math.imul(estate + 7, 40503) ^ Math.imul(lga.length, 97), wallJ = ((seed >>> 3) % 1000) / 500 - 1, roofJ = ((seed >>> 13) % 1000) / 500 - 1;
        walls.push({ ...item, colour: hex('wall', style.wall), j: wallJ }); doors.push({ ...item, colour: hex('door', style.door) }); glass.push({ ...item, colour: hex('windows', style.windows) });
        roofs[SHAPES[style.shape]!]!.push({ ...item, colour: hex('roof', style.roof), j: roofJ });
        if (style.fence) fences.push({ x: at.x, z: at.z, w: pitch * 0.84, h: pitch * 0.7, colour: hex('fence', style.fence) });
        const yard = YARD[HOUSE_STYLE.yard[style.yard]!.id];
        if (yard) (yard[0] === 'green' ? greens : boxes).push({ x: at.x + pitch * 0.3, z: at.z + pitch * 0.3, w: pitch * 0.5 * yard[2], h: pitch * 0.5 * yard[2], colour: yard[1] });
        if (house.online) dots.push({ x: at.x, z: at.z - pitch * 0.06, y: h + w * 0.62, w: pitch * 0.2, colour: '#33d17a' });
        if (house.u > serverNow) scaffolds.push({ ...item, colour: '#c9a35a' });
      }
    }
    const stand = (item: Part, o: THREE.Object3D, colour: THREE.Color) => { o.position.set(item.x, 0.03, item.z); o.rotation.set(0, 0, 0); o.scale.set(item.w, item.h, item.w); colour.set(item.colour); if (item.j) colour.offsetHSL(0, 0, item.j * 0.035); };
    // A part with a richer form for the CLOSE tier: the same layer, drawn with the geometry named `+`; the other is emptied.
    const part = (name: string, geometryName: string, material: THREE.Material, items: readonly Part[]) => {
      fill(rich ? name : `${name}+`, rich ? geometryName : `${geometryName}+`, material, [], null);
      return fill(rich ? `${name}+` : name, rich ? `${geometryName}+` : geometryName, material, items, stand);
    };
    let total = fill('plots', 'pad', flat, plots, (item, o, colour) => { o.position.set(item.x, 0.028, item.z); o.rotation.set(0, 0, 0); o.scale.set(item.s, 1, item.s); colour.set(item.colour); });
    total += part('walls', 'walls', lit, walls) + part('doors', 'door', flat, doors) + part('glass', 'glass', flat, glass);
    for (const shape of SHAPES) total += fill(`roof-${shape}`, shape, lit, roofs[shape]!, (item, o, colour) => { o.position.set(item.x, 0.03 + item.h, item.z); o.rotation.set(0, 0, 0); o.scale.set(item.w, item.w, item.w); colour.set(item.colour); if (item.j) colour.offsetHSL(0, 0, item.j * 0.035); });
    total += part('fences', 'fence', lit, fences) + fill('greens', 'green', lit, greens, stand) + fill('boxes', 'box', lit, boxes, stand);
    total += fill('dots', 'dot', flat, dots, (item, o, colour) => { o.position.set(item.x, item.y, item.z); o.rotation.set(0, 0, 0); o.scale.set(item.w, item.w, item.w); colour.set(item.colour); });
    total += fill('scaffold', 'scaffold', lit, scaffolds, (item, o, colour) => { o.position.set(item.x, 0.03, item.z); o.rotation.set(0, 0, 0); o.scale.set(item.w, Math.max(item.h, item.w) * 0.8, item.w); colour.set(item.colour); });
    detailTriangles = total;
    drawn = list.map(({ lga, estate }) => ({ lga, estate }));
  }
  /** Triangles a list of estates would cost as houses (worst case per house: every part). */
  const PER_HOUSE = trianglesOf('walls') + trianglesOf('door') + trianglesOf('glass') + trianglesOf('gable') + trianglesOf('fence') + trianglesOf('green') + trianglesOf('dot');
  /** What the richer geometry adds to a house (the walls, door, windows and fence in their `+` forms). */
  const RICH_EXTRA = ['walls', 'door', 'glass', 'fence'].reduce((sum, name) => sum + trianglesOf(`${name}+`) - trianglesOf(name), 0);
  const costOf = (houses: number, rich = false) => PLOTS_PER_ESTATE * trianglesOf('pad') + houses * (PER_HOUSE + (rich ? RICH_EXTRA : 0));

  let level: HouseLevel = 'far';
  const api: Houses = {
    group,
    get level() { return level; },
    get triangles() { return farTriangles + padTriangles + detailTriangles; },
    counts: () => ({ far: farTriangles, pads: padTriangles, detail: detailTriangles, estates: drawn.length, calls: [...layers.values()].filter((entry) => entry.mesh.visible && entry.mesh.count > 0).length }),
    perHouse: PER_HOUSE,
    setSummary(next) { summary = next; farKey = ''; padsKey = ''; },
    /**
     * Choose what to draw for this view. `view` = { x, z, distance, pixels } (pixels = CSS pixels one
     * map unit covers at the middle of the view). Returns the estates to load: [{ lga, estate }].
     */
    update(view, data, { own = null, serverNow = 0, visible = true }: HouseOptions = {}) {
      group.visible = visible;
      if (!visible || !pack.lgas?.length) return [];
      const focus = view.distance < PAD_DISTANCE ? lgaAt(pack, view.x, view.z) : null;
      const wanted: EstateRef[] = [];
      let detail: DetailEstate[] = [], richCost = 0;
      if (focus) {
        // The estates whose houses would be big enough to tell apart, nearest the middle of the view first.
        const layout = estateLayout(pack, focus)!, occ = summary?.get(focus)?.occ;
        const near: { estate: number; far: number; houses: number }[] = [];
        for (let i = 0; i < layout.count; i++) {
          const cell = layout.cells[i]!, far = Math.hypot(cell.x - view.x, cell.z - view.z);
          if (layout.pitch(i) * view.pixels >= 7 && far < cell.size * 1.2 + 260 / view.pixels) near.push({ estate: i, far, houses: occ?.[i] ?? 0 });
        }
        near.sort((a, b) => a.far - b.far);
        let budget = DETAIL_BUDGET;
        for (const item of near.slice(0, MAX_DETAILED)) {
          const cost = costOf(item.houses);
          if (cost > budget) break;
          budget -= cost; richCost += costOf(item.houses, true);
          wanted.push({ lga: focus, estate: item.estate });
          const loaded = data?.estate(focus, item.estate);
          if (loaded) detail.push({ lga: focus, estate: item.estate, houses: loaded.houses, at: loaded.at });
        }
      }
      // Close enough to see windows, and the richer houses fit the same budget: frames, bars, awnings and gates. Otherwise the plain ones.
      const rich = detail.length > 0 && richCost <= DETAIL_BUDGET && view.pixels * Math.min(...detail.map((item) => estateLayout(pack, item.lga)!.pitch(item.estate))) >= RICH_PIXELS;
      level = detail.length ? 'close' : focus ? 'near' : 'far';
      // FAR is always there for the rest of the city; the local government in focus shows its pads instead.
      const nextFar = `${focus || ''}|${summary ? [...summary.values()].map((item) => item.houses).join(',') : ''}`;
      if (nextFar !== farKey) { farKey = nextFar; hiddenLga = focus; buildFar(); }
      const skip = new Set(detail.map((item) => item.estate));
      const nextPads = focus ? `${focus}|${[...skip].join(',')}|${summary?.get(focus)?.houses ?? 0}` : '';
      if (nextPads !== padsKey) { padsKey = nextPads; if (focus) buildPads(focus, summary?.get(focus)?.occ, skip); else padTriangles = fill('pads', 'pad', flat, [], null); }
      const nextDetail = detail.map((item) => `${item.lga}/${item.estate}@${item.at}`).join('|') + `|${own ? `${own.lga}/${own.estate}/${own.plot}` : ''}|${Math.floor(serverNow / 30000)}|${rich ? 1 : 0}`;
      if (nextDetail !== detailKey) { detailKey = nextDetail; buildDetail(detail, serverNow, own, rich); }
      return wanted;
    },
    detailed: () => drawn,
    dispose() {
      for (const entry of layers.values()) entry.mesh.dispose?.();
      for (const geometry of Object.values(geometries)) geometry.dispose();
      lit.dispose(); flat.dispose(); block.dispose();
      group.parent?.remove(group);
    },
  };
  return api;
}
