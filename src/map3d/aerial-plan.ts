/**
 * OWNER: world
 * The aerial city of the dive (./dive.ts, ./aerial.ts): what the city map shows from the clouds down to the swoop, so that a city
 * reads as dense and tall from above and not as a flat board. Pure data and arithmetic: no three, no DOM, and no value imports at all,
 * so the lazy chunk it lives in pulls nothing new into the maps chunk, the shared scene chunk or the first download.
 *
 *   skylineOf(pack)        'low' | 'mid' | 'high': how tall the city's core may grow, from its built-up area and how many places and
 *                          neighbourhoods it has (no per-city table, no new data); peakOf(sizeScore(pack)) is the city's own peak in metres
 *   downtownOf(pack, hints) the downtown core: the densest cluster of commercial and civic venues (by kind) round the catalogue point
 *                          (the pack's frame origin, the OSM city node), on land; the origin of the density and the height model
 *   densityAt(field, x, z) 0..1: how built-up a point is, from the distance to the downtown, the land use (the pack's fabric styles and
 *                          old/planned areas), the city's places and named neighbourhoods as sub-centres, and a seeded noise
 *   heightM(density, peak, u, v)  the height model: low-rise at the edge, towers in the core, a log-normal spread, a few landmarks;
 *                          the peak tapers from the downtown outwards (tallnessAt)
 *   footprintHeightM(fp, ...)        an OSM footprint's own height (height tag, else building:levels), else the model. No pack carries
 *                          footprints or heights today (every city's `buildings` is empty), so every height is modelled
 *   planAerial(pack, opts) the massing (instanced boxes), parks, emphasised road ribbons and their triangle counts, inside the caps
 *   planClouds(...)        cloud sprites between the dive's start and end altitudes, around its path
 *   aerialFade(k, street)  how much of the massing shows at `k` of the city map's part of the dive (it is gone before the dive ends)
 *
 * Everything is a function of the pack and the city id (seeded), so every device sees the same skyline.
 */
import type { PackFabric, PackLand, PackRoad, PackWater, Point2, Rect, XZ } from './types.ts';

// ---- caps ------------------------------------------------------------------------------------------------------------------
/** The most triangles one frame of the city map may draw during the aerial pass of the dive: the city itself plus everything here. */
export const AERIAL_TRIANGLES = 120_000;
/** Kept back from the aerial cap for what the map adds over the city (overlays, the route, an estate's houses, the player's piece). */
export const AERIAL_RESERVE = 12_000;
/** The extra draw calls of the aerial pass: massing, parks, road ribbons, clouds. */
export const AERIAL_DRAW_CALLS = 4;
/** One massing box: a top and four sides, no bottom. */
export const BOX_TRIANGLES = 10;
export type AerialTier = 'full' | 'lite';
/** Per device tier (./dive.ts diveTier; a 'cut' device has no dive at all): massing, road ribbons, park patches and clouds. */
export const AERIAL_CAPS: Readonly<Record<AerialTier, { massing: number; ribbons: number; parks: number; clouds: number }>> = Object.freeze({
  full: { massing: 64_000, ribbons: 9_000, parks: 500, clouds: 28 },
  lite: { massing: 30_000, ribbons: 4_500, parks: 250, clouds: 14 },
});
/** Heights are drawn this many times life size: the map is a miniature whose landmarks are larger than life, and from the clouds a true-scale tower is a speck. */
export const VERTICAL = 3;
/** Metres per map unit (packs are 10 units to the km). */
export const UNIT_M = 100;
/** The tallest a core grows (metres) for each skyline, before the landmark lift. */
export const SKYLINE_PEAK_M: Readonly<Record<Skyline, number>> = Object.freeze({ low: 32, mid: 110, high: 240 });
/** Storey height for an OSM building:levels tag, and the roof added on top. */
export const LEVEL_M = 3.2, ROOF_M = 2;
/** Nothing stands this close to a place's landmark (map units): the icons stay readable from above. */
export const CLEAR_PLACE = 4.6;
/** Drawn heights (map units) from which a building is mid-rise (30 m) and a tower (80 m): slimmer, and in glass. */
export const LOW_RISE_UNITS = (30 / UNIT_M) * VERTICAL, TOWER_UNITS = (80 / UNIT_M) * VERTICAL;

export type Skyline = 'low' | 'mid' | 'high';

// ---- seeded numbers -------------------------------------------------------------------------------------------------------
/** FNV-1a of a string: the seed of a city. */
export function seedOf(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}
/** mulberry32: a small seeded generator in [0, 1). */
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const lattice = (seed: number, ix: number, iz: number): number => { let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ seed; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** Smooth value noise in [0, 1) with features about `cell` map units across. */
export function noiseAt(seed: number, x: number, z: number, cell: number): number {
  const fx = x / cell, fz = z / cell, ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz, sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
  const a = lattice(seed, ix, iz), b = lattice(seed, ix + 1, iz), c = lattice(seed, ix, iz + 1), d = lattice(seed, ix + 1, iz + 1);
  return (a * (1 - sx) + b * sx) * (1 - sz) + (c * (1 - sx) + d * sx) * sz;
}
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const smooth = (value: number): number => { const x = clamp01(value); return x * x * (3 - 2 * x); };

// ---- what the plan reads of a city pack ---------------------------------------------------------------------------------------
/** An OSM building footprint as a box (map units), with its height tag or its level count when the source had one. */
export interface Footprint { x: number; z: number; w: number; d: number; ry?: number; heightM?: number; levels?: number }
/** The part of a city pack (./types.ts CityPack) the aerial plan reads; `footprints` is optional and no city pack carries it yet. */
export interface AerialPack {
  id: string;
  /** The map's projection frame: a pack that has one is drawn round its origin, the city's catalogue point (the OSM city node). */
  frame?: { unitsPerKm: number };
  rails?: readonly { stations: readonly XZ[] }[];
  land: readonly PackLand[];
  roads: readonly PackRoad[];
  fabric?: readonly PackFabric[];
  areas?: readonly { x: number; z: number; r: number; tone: 'old' | 'planned' }[];
  districts?: readonly { x: number; z: number; size: number; water?: boolean }[];
  sites: Readonly<Record<string, XZ>>;
  homes?: Readonly<Record<string, XZ>>;
  water?: readonly { points: readonly Point2[]; holes?: readonly (readonly Point2[])[] }[];
  waters?: readonly PackWater[];
  core?: Rect;
  roadScale?: number;
  footprints?: readonly Footprint[];
}

/** The area of a ring (map units squared). */
function ringArea(points: readonly Point2[]): number {
  let sum = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) sum += (points[j]![0] + points[i]![0]) * (points[j]![1] - points[i]![1]);
  return Math.abs(sum) / 2;
}
/** The built-up land of a pack, in km² (sand and holes left out). */
export function landKm2(pack: Pick<AerialPack, 'land'>): number {
  let units = 0;
  for (const entry of pack.land) if (entry.kind !== 'sand') units += ringArea(entry.points) - (entry.holes ?? []).reduce((sum, hole) => sum + ringArea(hole), 0);
  return Math.max(0, units) * (UNIT_M / 1000) ** 2;
}
/**
 * The city's size class as a number: the log of its built-up area (km²), more for many places and neighbourhoods and a dense main-road
 * network, less for a small place with hardly any main roads (an atoll, a station, a village). No pack carries a population, and every open
 * city has about the same number of venues, so the area and the roads are what tell a metropolis from a town.
 */
export function sizeScore(pack: Pick<AerialPack, 'land' | 'sites' | 'districts' | 'roads'>): number {
  const km2 = landKm2(pack), named = (pack.districts?.length ?? 0) + Object.keys(pack.sites).length, roads = pack.roads.length;
  return Math.log10(Math.max(1, km2)) + (named >= 40 ? 0.3 : 0) + (roads >= 300 ? 0.3 : roads >= 100 ? 0.15 : roads < 30 && km2 < 120 ? -0.3 : 0);
}
/** The tallest a core grows (metres) by size score: a village or an atoll stays at three or four storeys, a metropolis reaches 240 m. */
export const PEAK_BY_SCORE: readonly (readonly [number, number])[] = Object.freeze([[1, 12], [1.5, 20], [2, 32], [2.35, 70], [2.7, 110], [3, 240]]);
export function peakOf(score: number): number {
  const table = PEAK_BY_SCORE, first = table[0]!, last = table[table.length - 1]!;
  if (score <= first[0]) return first[1];
  if (score >= last[0]) return last[1];
  for (let i = 1; i < table.length; i++) {
    const [s1, m1] = table[i]!, [s0, m0] = table[i - 1]!;
    if (score <= s1) return Math.exp(Math.log(m0) + (Math.log(m1) - Math.log(m0)) * ((score - s0) / (s1 - s0)));
  }
  return last[1];
}
/**
 * How tall the city's core may grow. A big built-up area with many places and neighbourhoods is a metropolis with a skyline; a small
 * capital stays low-rise. Derived from the pack alone, so it costs no per-city data. The class's top is SKYLINE_PEAK_M; peakOf gives
 * the city's own peak inside it.
 */
export function skylineOf(pack: Pick<AerialPack, 'land' | 'sites' | 'districts' | 'roads'>): Skyline {
  const score = sizeScore(pack);
  return score >= 2.7 ? 'high' : score >= 2 ? 'mid' : 'low';
}

// ---- the downtown ----------------------------------------------------------------------------------------------------------
/** A venue of the city with its kind (src/types/content.ts SceneKind), when the caller knows it. */
export interface AerialVenue extends XZ { kind?: string }
/**
 * How much a venue of each kind says "downtown": offices, the seat of government, malls, rooftop bars and markets most; parks, beaches and
 * hills hardly; the airport and the refinery not at all (they stand out of town). A kind not listed counts 1.
 */
export const KIND_WEIGHT: Readonly<Record<string, number>> = Object.freeze({
  office: 3, statehouse: 2.5, mall: 2.5, rooftop: 2.5, market: 2, polling: 1.5, radio: 1.5, club: 1.5, hospital: 1.5, police: 1.5, hub: 1.5,
  viewing: 1, worship: 1, buka: 1, salon: 1, gym: 1, quad: 0.5, walk: 0.5, shrine: 0.5, unilag: 0.5, lakeside: 0.3, park: 0.3, hilltop: 0.2, beach: 0.2,
  airport: 0, refinery: 0, home: 0,
});
/** The downtown search: how far from the catalogue point (map units), the kernel's width, the prior's scale. */
export const DOWNTOWN_SEARCH = 100, DOWNTOWN_KERNEL = 10, DOWNTOWN_PRIOR = 12;
/** The point the city is drawn round when nothing better is known: the catalogue point (a pack's frame origin), else the middle of its places. */
export function priorOf(pack: Pick<AerialPack, 'sites' | 'core' | 'frame'>): XZ {
  return pack.frame ? { x: 0, z: 0 } : centreOf(pack);
}
/**
 * The downtown core: the densest cluster of commercial and civic points round the city's catalogue point. A kernel density over the
 * venues (weighted by kind), a 'towers' land use, the stations and the named neighbourhoods, times a broad prior round the catalogue
 * point (`prior`, the OSM city node the city was made from), so a clear cluster a few km off wins (Lagos Island over the mainland point)
 * and a city whose venues are scattered keeps its catalogue point. Searched on land only, never on water.
 */
export function downtownOf(pack: AerialPack, hints: { prior?: XZ; venues?: readonly AerialVenue[] } = {}): XZ {
  const prior = hints.prior ?? priorOf(pack);
  const points: { x: number; z: number; w: number }[] = [];
  for (const venue of hints.venues ?? Object.values(pack.sites)) {
    const w = 'kind' in venue && typeof venue.kind === 'string' ? KIND_WEIGHT[venue.kind] ?? 1 : 1;
    if (w > 0) points.push({ x: venue.x, z: venue.z, w });
  }
  for (const area of pack.fabric ?? []) if (area.style === 'towers') points.push({ x: area.circle?.[0] ?? (area.box[0] + area.box[2]) / 2, z: area.circle?.[1] ?? (area.box[1] + area.box[3]) / 2, w: 4 });
  for (const rail of pack.rails ?? []) for (const station of rail.stations) points.push({ x: station.x, z: station.z, w: 0.5 });
  for (const item of pack.districts ?? []) if (!item.water) points.push({ x: item.x, z: item.z, w: 0.3 });
  const mask = groundMask(pack, { x: prior.x, z: prior.z, r: DOWNTOWN_SEARCH }, [], false);
  const near = points.filter((point) => Math.hypot(point.x - prior.x, point.z - prior.z) <= DOWNTOWN_SEARCH + DOWNTOWN_KERNEL * 3);
  const step = 1.5, span = Math.floor(DOWNTOWN_SEARCH / step), k2 = 2 * DOWNTOWN_KERNEL * DOWNTOWN_KERNEL;
  let best: XZ | null = null, bestScore = -1;
  for (let j = -span; j <= span; j++) for (let i = -span; i <= span; i++) {
    const x = prior.x + i * step, z = prior.z + j * step, d2 = (i * i + j * j) * step * step;
    if (d2 > DOWNTOWN_SEARCH * DOWNTOWN_SEARCH) continue;
    const col = Math.floor((x - mask.x0) / mask.cell), row = Math.floor((z - mask.z0) / mask.cell);
    if (col < 0 || row < 0 || col >= mask.size || row >= mask.size) continue;
    const bits = mask.bits[row * mask.size + col]!;
    if (!(bits & LAND) || bits & WATER) continue;
    let sum = 0.5;
    for (const point of near) { const dx = x - point.x, dz = z - point.z, q = dx * dx + dz * dz; if (q < k2 * 4.5) sum += point.w * Math.exp(-q / k2); }
    const score = sum / (1 + d2 / (DOWNTOWN_PRIOR * DOWNTOWN_PRIOR));
    if (score > bestScore + 1e-9) { bestScore = score; best = { x, z }; }
  }
  return best ?? prior;
}
/** How far the tower core reaches from the downtown (map units): about 0.6 km in a town, 3 km in a metropolis. */
export function coreReachOf(peakM: number): number { return 6 + 24 * clamp01((peakM - 12) / 228); }
/** Outside the core, heights taper to this share of the peak: sub-centres get mid-rise, not a second skyline. */
export const OUTER_SHARE = 0.3;
/** The middle of the city: the median of its places (they cluster downtown), else the core's middle, else the origin. */
export function centreOf(pack: Pick<AerialPack, 'sites' | 'core'>): XZ {
  const sites = Object.values(pack.sites);
  if (sites.length >= 3) {
    const xs = sites.map((site) => site.x).sort((a, b) => a - b), zs = sites.map((site) => site.z).sort((a, b) => a - b);
    return { x: xs[xs.length >> 1]!, z: zs[zs.length >> 1]! };
  }
  return pack.core ? { x: (pack.core.minX + pack.core.maxX) / 2, z: (pack.core.minZ + pack.core.maxZ) / 2 } : { x: 0, z: 0 };
}
export const MIN_RADIUS = 24, MAX_RADIUS = 150;
/** The aerial city round the dive's destination reaches this far (map units), wherever the destination is. */
export const HUB_REACH = 22;
/** A tight budget pulls the aerial city in to no less than this share of its radius before its blocks grow. */
export const MIN_REACH = 0.5;
/** How far the aerial city reaches from the centre (map units): past most of the places, a little less for a low-rise town. */
export function radiusOf(pack: Pick<AerialPack, 'sites'>, centre: XZ, skyline: Skyline): number {
  const far = Object.values(pack.sites).map((site) => Math.hypot(site.x - centre.x, site.z - centre.z)).sort((a, b) => a - b);
  const reach = far.length ? far[Math.min(far.length - 1, Math.floor(far.length * 0.8))]! * 1.25 : MIN_RADIUS;
  return Math.max(MIN_RADIUS, Math.min(skyline === 'low' ? 90 : MAX_RADIUS, reach));
}

// ---- the density field and the height model ---------------------------------------------------------------------------------------
/** How built-up each land use is, before the distance to the centre (the pack's fabric styles, ./types.ts FabricStyle). */
export const STYLE_DENSITY: Readonly<Record<string, number>> = Object.freeze({ towers: 1.15, blocks: 1, dense: 0.9, villas: 0.55, green: 0.6, none: 0.8 });
export interface DensityField {
  seed: number;
  /** The downtown (downtownOf): the origin of the density and the height model. */
  centre: XZ;
  radius: number;
  skyline: Skyline;
  /** The city's own peak (metres, peakOf), inside its skyline class. */
  peakM: number;
  /** How far the tower core reaches round the centre (map units, coreReachOf). */
  core: number;
  fabric: readonly PackFabric[];
  areas: readonly { x: number; z: number; r: number; tone: 'old' | 'planned' }[];
  /** Sub-centres: places and named neighbourhoods, with their pull (0..1) and reach (map units). */
  hubs: readonly { x: number; z: number; pull: number; reach: number }[];
}
/** What the caller knows beyond the pack: the catalogue point and the venues' kinds (./map3d.ts passes both). */
export interface CityHints { prior?: XZ; venues?: readonly AerialVenue[] }
export function densityField(pack: AerialPack, extra: readonly XZ[] = [], hints: CityHints = {}): DensityField {
  const seed = seedOf(pack.id), score = sizeScore(pack), skyline: Skyline = score >= 2.7 ? 'high' : score >= 2 ? 'mid' : 'low', peakM = peakOf(score);
  const centre = downtownOf(pack, hints), radius = radiusOf(pack, centre, skyline);
  const reach = Math.max(6, radius * 0.14);
  // A venue pulls by its kind: an office block is a local peak, a park or a beach hardly one (parks stay low).
  const venues = hints.venues ?? Object.values(pack.sites);
  const pullOf = (venue: AerialVenue): number => Math.max(0.15, Math.min(0.6, 0.15 + 0.12 * (typeof venue.kind === 'string' ? KIND_WEIGHT[venue.kind] ?? 1 : 1)));
  const hubs = [
    ...venues.map((site) => ({ x: site.x, z: site.z, pull: pullOf(site), reach })),
    ...(pack.districts ?? []).filter((item) => !item.water).map((item) => ({ x: item.x, z: item.z, pull: 0.4, reach: Math.max(reach, item.size * 0.5) })),
    ...extra.map((item) => ({ x: item.x, z: item.z, pull: 0.55, reach })),
  ];
  return { seed, centre, radius, skyline, peakM, core: coreReachOf(peakM), fabric: pack.fabric ?? [], areas: pack.areas ?? [], hubs };
}
/** The share of the city's peak a building may reach here: whole in the tower core round the downtown, tapering to OUTER_SHARE outside it. */
export function tallnessAt(field: Pick<DensityField, 'centre' | 'core'>, x: number, z: number): number {
  const d = Math.hypot(x - field.centre.x, z - field.centre.z) / field.core;
  return OUTER_SHARE + (1 - OUTER_SHARE) * Math.exp(-d * d);
}
/** The land use under a point: the first fabric area that holds it (as the city builder decides), or 'none'. */
function styleAt(field: DensityField, x: number, z: number): string {
  for (const area of field.fabric) {
    const [x0, z0, x1, z1] = area.box;
    if (x < x0 || x > x1 || z < z0 || z > z1) continue;
    if (area.circle && Math.hypot(x - area.circle[0], z - area.circle[1]) > area.circle[2]) continue;
    return area.style;
  }
  return 'none';
}
/** 0..1: how built-up the point is. Downtown is near 1, the edge of the aerial city near 0; places and neighbourhoods are local peaks. */
export function densityAt(field: DensityField, x: number, z: number): number {
  const d = Math.hypot(x - field.centre.x, z - field.centre.z), c = Math.max(0, 1 - d / field.radius), central = Math.pow(c, 1.4);
  let hub = 0;
  for (const item of field.hubs) {
    const dx = x - item.x, dz = z - item.z, q = (dx * dx + dz * dz) / (item.reach * item.reach);
    if (q < 9) hub = Math.max(hub, item.pull * Math.exp(-q));
  }
  let tone = 1;
  for (const area of field.areas) if (Math.hypot(x - area.x, z - area.z) <= area.r) { tone = area.tone === 'old' ? 0.9 : 0.75; break; }
  const style = STYLE_DENSITY[styleAt(field, x, z)] ?? 0.8;
  const base = Math.max(central, hub * (0.55 + 0.45 * c));
  return clamp01(base * style * tone + (noiseAt(field.seed, x, z, 7) - 0.5) * 0.24);
}
/** How much an old, dense quarter is held down: old towns are built up but low. */
export function heightCapAt(field: DensityField, x: number, z: number): number {
  for (const area of field.areas) if (Math.hypot(x - area.x, z - area.z) <= area.r) return area.tone === 'old' ? 0.45 : 0.8;
  return 1;
}
/**
 * The height model (metres): a floor of two or three storeys, rising steeply with density to the skyline's peak, with a log-normal spread
 * (u and v are uniform numbers in [0, 1) from the city's seed), and a few landmark towers in the densest blocks.
 */
export function heightM(density: number, skyline: Skyline | number, u: number, v: number): number {
  // A peak in metres (the city's own, tapered by tallnessAt), or a skyline class's top; never under three storeys.
  const peak = typeof skyline === 'number' ? Math.max(10, skyline) : SKYLINE_PEAK_M[skyline], floor = 7;
  const gauss = Math.max(-2, Math.min(2, Math.sqrt(-2 * Math.log(Math.max(1e-9, 1 - u))) * Math.cos(2 * Math.PI * v)));
  const landmark = density > 0.78 && u < 0.05 ? 1.45 : 1;
  const height = (floor + (peak - floor) * Math.pow(clamp01(density), 2.4)) * Math.exp(0.38 * gauss) * landmark;
  return Math.max(4, Math.min(peak * 1.6, height));
}
/** An OSM footprint's own height (the height tag, else building:levels), else the model's. */
export function footprintHeightM(footprint: Footprint, density: number, skyline: Skyline | number, u: number, v: number): number {
  if (typeof footprint.heightM === 'number' && Number.isFinite(footprint.heightM) && footprint.heightM > 0) return footprint.heightM;
  if (typeof footprint.levels === 'number' && Number.isFinite(footprint.levels) && footprint.levels > 0) return footprint.levels * LEVEL_M + ROOF_M;
  return heightM(density, skyline, u, v);
}

// ---- the plan ------------------------------------------------------------------------------------------------------------------
export type MassKind = 'block' | 'tower' | 'canopy';
/** One instanced box: centre on the ground, footprint, drawn height (map units, VERTICAL already applied), turn, and its colour. */
export interface Mass { x: number; z: number; w: number; d: number; h: number; ry: number; colour: string; kind: MassKind; density: number }
export interface Patch { x: number; z: number; w: number; d: number; ry: number; colour: string }
export interface Ribbon { points: readonly XZ[]; width: number; trunk: boolean }
export interface AerialPlan {
  id: string;
  skyline: Skyline;
  /** The city's own peak (metres, before VERTICAL): no modelled building passes 1.6 times it. */
  peakM: number;
  /** The downtown (downtownOf): the middle of the aerial city and the origin of its height model. */
  centre: XZ;
  radius: number;
  masses: Mass[];
  parks: Patch[];
  ribbons: Ribbon[];
  triangles: { massing: number; parks: number; ribbons: number };
  /** True when the caps thinned what the city asked for. */
  thinned: boolean;
}
export interface AerialOptions {
  tier?: AerialTier;
  /** What the city itself already draws: the plan stays inside AERIAL_TRIANGLES with it (and AERIAL_RESERVE). */
  cityTriangles?: number;
  /** Venue parks (and anything else green) to keep as parks. */
  parks?: readonly XZ[];
  /** More sub-centres (the dive's destination). */
  hubs?: readonly XZ[];
  /** More clearings round points (map units). */
  clear?: readonly { x: number; z: number; r: number }[];
  /** The city's catalogue point in map units (downtownOf's prior); the pack's frame origin when not given. */
  prior?: XZ;
  /** The venues with their kinds (downtownOf and the sub-centres); the pack's places, kind unknown, when not given. */
  venues?: readonly AerialVenue[];
}
/** The triangles each part of the aerial pass may use on this tier next to a city of `cityTriangles`. */
export function aerialBudget(tier: AerialTier, cityTriangles: number): { massing: number; ribbons: number; parks: number; clouds: number } {
  const caps = AERIAL_CAPS[tier], room = Math.max(0, AERIAL_TRIANGLES - AERIAL_RESERVE - Math.max(0, cityTriangles));
  const clouds = caps.clouds * 2, parks = Math.min(caps.parks * 2, Math.floor(room * 0.05)), ribbons = Math.min(caps.ribbons, Math.floor(room * 0.15));
  const massing = Math.max(0, Math.min(caps.massing, room - clouds - parks - ribbons));
  return { massing, ribbons, parks, clouds: room >= clouds ? clouds : 0 };
}

/** A raster of what the ground is under the aerial city: land, water, road, a clearing, already built. */
const LAND = 1, WATER = 2, ROAD = 4, CLEAR = 8, TAKEN = 16;
interface Mask { x0: number; z0: number; cell: number; size: number; bits: Uint8Array; angle: Float32Array }
/** Even-odd fill of rings over the mask's cell centres. Edge by edge (each edge only visits the rows it crosses), so a long coast costs its length, not its length times the rows. */
function scanFill(rings: readonly (readonly Point2[])[], mask: Mask, apply: (index: number) => void): void {
  const { x0, z0, cell, size } = mask, x1 = x0 + size * cell, z1 = z0 + size * cell;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const point of rings[0] ?? []) { minX = Math.min(minX, point[0]); maxX = Math.max(maxX, point[0]); minZ = Math.min(minZ, point[1]); maxZ = Math.max(maxZ, point[1]); }
  if (maxX < x0 || minX > x1 || maxZ < z0 || minZ > z1) return;
  const rows = new Map<number, number[]>();
  for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, az] = ring[i]!, [bx, bz] = ring[j]!;
    if (az === bz) continue;
    // The rows whose centre line z0 + (row + 0.5) * cell lies in [min(az, bz), max(az, bz)) with the half-open rule of the crossing test.
    const low = Math.min(az, bz), high = Math.max(az, bz);
    const first = Math.max(0, Math.ceil((low - z0) / cell - 0.5)), last = Math.min(size - 1, Math.ceil((high - z0) / cell - 0.5) - 1);
    for (let row = first; row <= last; row++) {
      const z = z0 + (row + 0.5) * cell;
      if ((az > z) === (bz > z)) continue;
      let hits = rows.get(row);
      if (!hits) rows.set(row, hits = []);
      hits.push(((bx - ax) * (z - az)) / (bz - az) + ax);
    }
  }
  for (const [row, hits] of rows) {
    hits.sort((a, b) => a - b);
    for (let k = 0; k + 1 < hits.length; k += 2) {
      const from = Math.max(0, Math.ceil((hits[k]! - x0) / cell - 0.5)), to = Math.min(size - 1, Math.floor((hits[k + 1]! - x0) / cell - 0.5));
      for (let col = from; col <= to; col++) apply(row * size + col);
    }
  }
}
function stroke(points: readonly XZ[], half: number, mask: Mask, bit: number): void {
  const { x0, z0, cell, size } = mask, reach = Math.ceil(half / cell);
  const x1 = x0 + size * cell, z1 = z0 + size * cell;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!;
    if (Math.max(a.x, b.x) < x0 - half || Math.min(a.x, b.x) > x1 + half || Math.max(a.z, b.z) < z0 - half || Math.min(a.z, b.z) > z1 + half) continue;
    const length = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.max(1, Math.ceil(length / (cell * 0.5))), angle = Math.atan2(b.x - a.x, b.z - a.z);
    for (let s = 0; s <= steps; s++) {
      const x = a.x + ((b.x - a.x) * s) / steps, z = a.z + ((b.z - a.z) * s) / steps, cx = Math.floor((x - x0) / cell), cz = Math.floor((z - z0) / cell);
      for (let dz = -reach; dz <= reach; dz++) for (let dx = -reach; dx <= reach; dx++) {
        const col = cx + dx, row = cz + dz;
        if (col < 0 || row < 0 || col >= size || row >= size) continue;
        if (Math.hypot(x0 + (col + 0.5) * cell - x, z0 + (row + 0.5) * cell - z) > half + cell * 0.5) continue;
        const index = row * size + col;
        mask.bits[index]! |= bit;
        if (bit === ROAD) mask.angle[index] = angle;
      }
    }
  }
}
function disc(x: number, z: number, r: number, mask: Mask, bit: number): void {
  const { x0, z0, cell, size } = mask;
  for (let row = Math.max(0, Math.floor((z - r - z0) / cell)); row <= Math.min(size - 1, Math.floor((z + r - z0) / cell)); row++) {
    for (let col = Math.max(0, Math.floor((x - r - x0) / cell)); col <= Math.min(size - 1, Math.floor((x + r - x0) / cell)); col++) {
      if (Math.hypot(x0 + (col + 0.5) * cell - x, z0 + (row + 0.5) * cell - z) <= r) mask.bits[row * size + col]! |= bit;
    }
  }
}
const toXZ = (points: readonly Point2[]): XZ[] => points.map(([x, z]) => ({ x, z }));
const roadHalf = (road: PackRoad, scale: number): number => (road.trunk ? 0.6 : road.major ? 0.48 : 0.32) * scale;

/** Roof and wall colours, from the ground up: warm low-rise roofs, pale mid-rise, blue-grey glass towers. */
export const LOW_ROOFS = ['#b9a58a', '#a8593f', '#c9bfae', '#8f8a80', '#d8d0bf', '#9b6a4c', '#b4ada0'];
export const MID_TONES = ['#cfc8ba', '#bfc4c4', '#d9d2c2', '#aeb5b8', '#c6bba6'];
export const GLASS_TONES = ['#7f98a8', '#8fa7b5', '#6d8797', '#a3b6bf', '#5f7889', '#9aa9ad'];
export const PARK_TONES = ['#6f9c5a', '#7aa863', '#5f8f52', '#86ad6a'];
export const CANOPY_TONES = ['#3f7a45', '#4b8a4e', '#356b3e', '#5a9455'];

/** The raster of the ground round one area of the aerial city: land, water, roads (and their directions), clearings round the places. */
function groundMask(pack: AerialPack, area: { x: number; z: number; r: number }, clear: readonly { x: number; z: number; r: number }[], streets = true): Mask {
  const cell = Math.max(0.5, (area.r * 2) / 440), size = Math.ceil((area.r * 2) / cell) + 2;
  const mask: Mask = { x0: area.x - area.r - cell, z0: area.z - area.r - cell, cell, size, bits: new Uint8Array(size * size), angle: new Float32Array(size * size).fill(NaN) };
  for (const entry of pack.land) if (entry.kind !== 'sand') scanFill([entry.points, ...(entry.holes ?? [])], mask, (i) => { mask.bits[i]! |= LAND; });
  for (const entry of pack.water ?? []) scanFill([entry.points, ...(entry.holes ?? [])], mask, (i) => { mask.bits[i]! |= WATER; });
  for (const entry of pack.waters ?? []) {
    if (entry.kind === 'lake') scanFill([entry.points], mask, (i) => { mask.bits[i]! |= WATER; });
    else stroke(toXZ(entry.points), Math.max(0.4, (entry.width ?? 1) / 2), mask, WATER);
  }
  if (!streets) return mask;
  const roadScale = pack.roadScale ?? 1;
  for (const road of pack.roads) stroke(toXZ(road.points), roadHalf(road, roadScale) + 0.22, mask, ROAD);
  for (const site of [...Object.values(pack.sites), ...Object.values(pack.homes ?? {})]) disc(site.x, site.z, CLEAR_PLACE, mask, CLEAR);
  for (const spot of clear) disc(spot.x, spot.z, spot.r, mask, CLEAR);
  return mask;
}

const plans = new Map<string, AerialPlan>();
/** Forget the cached plans (tests: a plan made again must be the same). */
export function forgetPlans(): void { plans.clear(); }
/**
 * The aerial city of one pack. The ground is rastered once (land, water, roads, clearings round places); a coarse grid over the disc
 * of `radius` is split finer near the centre and coarser at the edge, so the blocks are small and close downtown and wide apart
 * in the suburbs; each cell is a building, a park or nothing, by the density there. The caps then thin the edge first.
 */
export function planAerial(pack: AerialPack, options: AerialOptions = {}): AerialPlan {
  const tier = options.tier ?? 'full', budget = aerialBudget(tier, options.cityTriangles ?? 0);
  const spot = (item: XZ) => `${item.x.toFixed(1)},${item.z.toFixed(1)}`;
  const key = `${pack.id}|${tier}|${Math.round(budget.massing / 500)}|${(options.hubs ?? []).map(spot).join(';')}|${options.prior ? spot(options.prior) : ''}|${options.venues?.length ?? ''}`;
  const cached = plans.get(key);
  if (cached) return cached;
  const field = densityField(pack, options.hubs ?? [], { ...(options.prior ? { prior: options.prior } : {}), ...(options.venues ? { venues: options.venues } : {}) });
  const { centre, radius, skyline, seed, peakM } = field, rng = random(seed ^ 0x9e3779b9);
  // The peak here: the city's own in the tower core round the downtown, tapering outwards (tallnessAt).
  const peakAt = (x: number, z: number): number => peakM * tallnessAt(field, x, z);
  // Where the aerial city stands: a disc round the centre, and a smaller one round the dive's destination wherever it is (the swoop
  // comes down there). Each has its own raster of the ground, so a far destination does not coarsen the middle's.
  const quarters = (options.hubs ?? []).filter((item) => Math.hypot(item.x - centre.x, item.z - centre.z) > radius - HUB_REACH * 0.5);
  const masks = [{ x: centre.x, z: centre.z, r: radius }, ...quarters.map((item) => ({ x: item.x, z: item.z, r: HUB_REACH }))].map((area) => groundMask(pack, area, options.clear ?? []));
  const maskAt = (x: number, z: number): Mask | null => masks.find((mask) => x >= mask.x0 && z >= mask.z0 && x < mask.x0 + mask.size * mask.cell && z < mask.z0 + mask.size * mask.cell) ?? null;
  const at = (x: number, z: number): number => { const mask = maskAt(x, z); if (!mask) return 0; const col = Math.floor((x - mask.x0) / mask.cell), row = Math.floor((z - mask.z0) / mask.cell); return mask.bits[row * mask.size + col]!; };
  const angleAt = (x: number, z: number): number => { const mask = maskAt(x, z); if (!mask) return NaN; const col = Math.floor((x - mask.x0) / mask.cell), row = Math.floor((z - mask.z0) / mask.cell); return mask.angle[row * mask.size + col]!; };
  // Nothing stands on the shore's raster edge: the ground one cell away on every side must be land too, so no building's middle is over
  // the water or off the land (the raster alone lets a box stand up to half a cell over the real shore).
  const inland = (x: number, z: number): boolean => {
    const cell = maskAt(x, z)?.cell ?? 0;
    for (let k = 0; k < 4; k++) { const bits = at(x + (k === 0 ? cell : k === 1 ? -cell : 0), z + (k === 2 ? cell : k === 3 ? -cell : 0)); if (!(bits & LAND) || bits & WATER) return false; }
    return true;
  };
  const inQuarter = (x: number, z: number): boolean => quarters.some((item) => Math.hypot(x - item.x, z - item.z) <= HUB_REACH);
  const inside = (x: number, z: number, r: number): boolean => Math.hypot(x - centre.x, z - centre.z) <= r || inQuarter(x, z);
  const parkSpots = options.parks ?? [], roadScale = pack.roadScale ?? 1;

  const masses: Mass[] = [], parks: Patch[] = [];
  const colourOf = (h: number, u: number): string => (h < LOW_RISE_UNITS ? LOW_ROOFS[Math.floor(u * LOW_ROOFS.length)]! : h < TOWER_UNITS ? MID_TONES[Math.floor(u * MID_TONES.length)]! : GLASS_TONES[Math.floor(u * GLASS_TONES.length)]!);
  // OSM footprints first, with their own heights; the procedural blocks keep off them.
  for (const footprint of pack.footprints ?? []) {
    if (Math.hypot(footprint.x - centre.x, footprint.z - centre.z) > radius) continue;
    const density = densityAt(field, footprint.x, footprint.z), u = rng(), h = (footprintHeightM(footprint, density, peakAt(footprint.x, footprint.z), u, rng()) / UNIT_M) * VERTICAL;
    masses.push({ x: footprint.x, z: footprint.z, w: footprint.w, d: footprint.d, h, ry: footprint.ry ?? 0, colour: colourOf(h, rng()), kind: h >= TOWER_UNITS ? 'tower' : 'block', density });
    for (const mask of masks) disc(footprint.x, footprint.z, Math.max(footprint.w, footprint.d) / 2, mask, TAKEN);
  }
  // Coarse cells of COARSE units, split into n x n blocks: n from the block size wanted at that distance.
  const COARSE = 4;
  const blockAt = (d: number, base: number): number => base * (1 + 2.2 * Math.min(1, d / radius));
  const cells: { x: number; z: number; n: number; angle: number; d: number }[] = [];
  // `d` sets the grain: the distance to the centre, or, round the destination, as if its quarter were a third of the way out.
  const grid = (cx: number, cz: number, r: number, skip: (x: number, z: number) => boolean, quarter = false) => {
    const span = Math.ceil(r / COARSE);
    for (let gz = -span; gz < span; gz++) for (let gx = -span; gx < span; gx++) {
      const x = cx + (gx + 0.5) * COARSE, z = cz + (gz + 0.5) * COARSE;
      if (Math.hypot(x - cx, z - cz) > r || skip(x, z)) continue;
      // The blocks follow the streets: the direction of a road through the coarse cell, else the grid.
      let angle = 0;
      for (let k = 0; k < 9; k++) {
        const value = angleAt(x + ((k % 3) - 1) * 1.3, z + (Math.floor(k / 3) - 1) * 1.3);
        if (!Number.isNaN(value)) { angle = ((value % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2); break; }
      }
      const d = Math.hypot(x - centre.x, z - centre.z);
      cells.push({ x, z, n: 0, angle, d: quarter ? Math.min(d, radius * 0.3 + Math.hypot(x - cx, z - cz)) : d });
    }
  };
  grid(centre.x, centre.z, radius, () => false);
  for (const item of quarters) grid(item.x, item.z, HUB_REACH, (x, z) => Math.hypot(x - centre.x, z - centre.z) <= radius, true);
  // How fine to split: aim at the massing budget with the coverage the density gives (a first pass that only counts).
  // A tight budget (a heavy city, a lite device) pulls the edge in first, so what is drawn stays dense; only then do the blocks grow.
  const coverage = (density: number): number => 0.3 + 0.66 * density;
  const split = (base: number, reach: number): number => {
    // The density falls off over what is drawn: towers in the middle, low-rise at its edge, whatever the reach.
    field.radius = reach;
    let expected = 0;
    for (const item of cells) {
      item.n = 0;
      if (!inside(item.x, item.z, reach) || !(at(item.x, item.z) & LAND)) continue;
      const n = Math.max(1, Math.min(5, Math.round(COARSE / blockAt(item.d, base))));
      item.n = n;
      expected += n * n * coverage(densityAt(field, item.x, item.z));
    }
    return expected;
  };
  const want = budget.massing / BOX_TRIANGLES;
  let base = 0.95, reach = radius;
  for (let pass = 0; pass < 8; pass++) {
    const expected = split(base, reach);
    if (expected <= want * 1.1) break;
    if (reach > radius * MIN_REACH + 1) reach = Math.max(radius * MIN_REACH, reach * Math.sqrt(want / expected) * 1.02);
    else base *= Math.sqrt(expected / want);
  }
  for (const item of cells) {
    if (!item.n) continue;
    const sub = COARSE / item.n, cos = Math.cos(item.angle), sin = Math.sin(item.angle);
    for (let j = 0; j < item.n; j++) for (let i = 0; i < item.n; i++) {
      const ox = (i + 0.5) * sub - COARSE / 2, oz = (j + 0.5) * sub - COARSE / 2;
      const x = item.x + ox * cos + oz * sin + (rng() - 0.5) * sub * 0.12, z = item.z - ox * sin + oz * cos + (rng() - 0.5) * sub * 0.12;
      const bits = at(x, z), roll = rng(), u = rng(), v = rng(), tint = rng();
      if (!(bits & LAND) || bits & (WATER | ROAD | CLEAR | TAKEN)) continue;
      if (!inland(x, z)) continue;
      const density = densityAt(field, x, z);
      const nearPark = parkSpots.some((spot) => Math.hypot(spot.x - x, spot.z - z) < CLEAR_PLACE + 3.5);
      const green = nearPark || (density > 0.22 && noiseAt(seed ^ 0x51ed27, x, z, 9) < 0.14);
      if (green) {
        parks.push({ x, z, w: sub * 0.98, d: sub * 0.98, ry: item.angle, colour: PARK_TONES[Math.floor(tint * PARK_TONES.length)]! });
        // A few tree crowns on it, as low green boxes in the same instanced mesh.
        const crowns = 1 + Math.floor(u * 3);
        for (let c = 0; c < crowns; c++) {
          const cx = x + (rng() - 0.5) * sub * 0.7, cz = z + (rng() - 0.5) * sub * 0.7, s = sub * (0.18 + rng() * 0.16);
          masses.push({ x: cx, z: cz, w: s, d: s, h: 0.12 + rng() * 0.18, ry: rng() * Math.PI, colour: CANOPY_TONES[Math.floor(rng() * CANOPY_TONES.length)]!, kind: 'canopy', density: 0 });
        }
        continue;
      }
      if (roll > coverage(density)) continue;
      const h = (heightM(density, peakAt(x, z), u, v) / UNIT_M) * VERTICAL * heightCapAt(field, x, z), tower = h >= TOWER_UNITS;
      // Towers are slender; low-rise fills its block.
      const fill = tower ? 0.42 + rng() * 0.2 : 0.7 + rng() * 0.22, aspect = 0.8 + rng() * 0.4;
      masses.push({ x, z, w: sub * fill * aspect, d: (sub * fill) / aspect, h, ry: item.angle, colour: colourOf(h, tint), kind: tower ? 'tower' : 'block', density });
    }
  }
  // The caps: the masses in order of how much they matter (OSM footprints, then the densest), so a cap, and the dissolve at the end of
  // the dive (./aerial.ts draws the first n), take the edge first and keep the core whole.
  const footprintCount = (pack.footprints ?? []).filter((footprint) => Math.hypot(footprint.x - centre.x, footprint.z - centre.z) <= radius).length;
  const ranked = masses.map((mass, i) => ({ mass, score: i < footprintCount ? 2 : mass.kind === 'canopy' ? 0.5 : mass.density + lattice(seed, i, 7) * 0.15 })).sort((a, b) => b.score - a.score);
  const maxMasses = Math.floor(budget.massing / BOX_TRIANGLES);
  let thinned = ranked.length > maxMasses;
  masses.length = 0; masses.push(...ranked.slice(0, maxMasses).map((item) => item.mass));
  const maxParks = Math.floor(budget.parks / 2);
  parks.sort((a, b) => Math.hypot(a.x - centre.x, a.z - centre.z) - Math.hypot(b.x - centre.x, b.z - centre.z));
  if (parks.length > maxParks) { thinned = true; parks.length = maxParks; }
  // The roads, wider and firmer than on the map, so the network reads between the blocks: trunk roads first, then the nearest.
  const ribbons: Ribbon[] = [];
  let ribbonTriangles = 0;
  const candidates = pack.roads.flatMap((road) => insideRuns(densify(simplify(toXZ(road.points), 1.2), 6), (point) => inside(point.x, point.z, reach * 1.05)).map((points) => {
    const near = Math.min(...points.map((point) => Math.hypot(point.x - centre.x, point.z - centre.z)));
    return { road, points, near };
  })).sort((a, b) => Number(Boolean(b.road.trunk || b.road.major)) - Number(Boolean(a.road.trunk || a.road.major)) || a.near - b.near);
  for (const { road, points } of candidates) {
    const cost = (points.length - 1) * RIBBON_TRIANGLES_PER_SEGMENT;
    if (ribbonTriangles + cost > budget.ribbons) { thinned = true; continue; }
    ribbonTriangles += cost;
    ribbons.push({ points, width: roadHalf(road, roadScale) * 2 * 1.35, trunk: Boolean(road.trunk) });
  }
  const plan: AerialPlan = {
    id: pack.id, skyline, peakM, centre, radius: reach, masses, parks, ribbons, thinned,
    triangles: { massing: masses.length * BOX_TRIANGLES, parks: parks.length * 2, ribbons: ribbonTriangles },
  };
  if (plans.size > 6) plans.delete(plans.keys().next().value!);
  plans.set(key, plan);
  return plan;
}
/** A road ribbon is three strips across (kerb, asphalt, kerb): six triangles a segment. */
export const RIBBON_TRIANGLES_PER_SEGMENT = 6;
/** Add points so that no segment is longer than `step`. */
export function densify(points: readonly XZ[], step: number): XZ[] {
  const out: XZ[] = points.length ? [points[0]!] : [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!, n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / step));
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n });
  }
  return out;
}
/** The runs of a line whose points pass `keep` (two points at least each). */
export function insideRuns(points: readonly XZ[], keep: (point: XZ) => boolean): XZ[][] {
  const runs: XZ[][] = [];
  let run: XZ[] = [];
  for (const point of points) {
    if (keep(point)) run.push(point);
    else { if (run.length >= 2) runs.push(run); run = []; }
  }
  if (run.length >= 2) runs.push(run);
  return runs;
}
/** Drop points closer than `step` to the last one kept (the ends stay). */
export function simplify(points: readonly XZ[], step: number): XZ[] {
  if (points.length <= 2) return [...points];
  const out: XZ[] = [points[0]!];
  for (let i = 1; i < points.length - 1; i++) { const last = out[out.length - 1]!; if (Math.hypot(points[i]!.x - last.x, points[i]!.z - last.z) >= step) out.push(points[i]!); }
  out.push(points[points.length - 1]!);
  return out;
}

// ---- clouds and the fade ---------------------------------------------------------------------------------------------------------
export interface Cloud { x: number; y: number; z: number; size: number; ry: number }
/**
 * Cloud sprites for one dive: flat puffs at altitudes between where the camera ends (`endY`) and where it starts (`startY`), around
 * the path (`from` to `to`). As the camera comes down they grow and slide out of the picture, the near ones faster (parallax), and
 * those it passes through thin out (./aerial.ts fades them by their distance to the camera). None when the descent is too short.
 */
export function planClouds(seed: number, from: XZ, to: XZ, startY: number, endY: number, count: number): Cloud[] {
  const high = startY * 0.88, low = Math.max(endY * 1.15, startY * 0.25);
  if (count <= 0 || !(high > low * 1.08)) return [];
  const rng = random(seed ^ 0x2c1b3c6d), clouds: Cloud[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i + rng()) / count, y = high - (high - low) * t;
    // Where the camera is above when it passes this altitude, and how much ground the picture showed there from the start.
    const along = clamp01((startY - y) / Math.max(1, startY - endY)), cx = from.x + (to.x - from.x) * along, cz = from.z + (to.z - from.z) * along;
    const view = Math.max(4, (startY - y) * 0.32), angle = rng() * Math.PI * 2, r = view * (0.35 + rng() * 1.25);
    clouds.push({ x: cx + Math.cos(angle) * r, y, z: cz + Math.sin(angle) * r, size: view * (0.55 + rng() * 0.7), ry: rng() * Math.PI * 2 });
  }
  return clouds;
}
/** How much of the massing shows (0..1) at `k` of the city map's dive: whole on the way down, dissolved before the end (the map, or the venue, takes over). */
export function aerialFade(k: number, street: boolean): number {
  const [from, to] = street ? [0.72, 0.92] : [0.62, 0.94];
  return 1 - smooth((k - from) / (to - from));
}
/** How much of the clouds shows: thick as the clouds part, gone by the time the camera is over the towers. */
export function cloudFade(k: number): number { return 1 - smooth((k - 0.05) / 0.4); }

// ---- device tier -----------------------------------------------------------------------------------------------------------------
/**
 * ./dive.ts diveTier, repeated so this chunk imports nothing (a test holds the two equal): 'cut' gets no dive and no aerial city,
 * 'lite' gets half of everything.
 */
export function aerialTier({ reduced = false, cores, memory, saveData = false }: { reduced?: boolean; cores?: number | undefined; memory?: number | undefined; saveData?: boolean } = {}): AerialTier | 'cut' {
  if (reduced || saveData) return 'cut';
  const known = (value: number | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
  if ((known(cores) && cores <= 2) || (known(memory) && memory < 2)) return 'cut';
  if ((known(cores) && cores <= 4) || (known(memory) && memory <= 2)) return 'lite';
  return 'full';
}
