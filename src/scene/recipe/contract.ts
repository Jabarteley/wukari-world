import type { SceneCamera, SceneVenue, Vec3 } from '../types.ts';
import { AVATAR_RADIUS, createWalkGrid } from '../walk-grid.ts';
import type { WalkDescription, WalkRect } from '../walk-grid.ts';

export const METRES_TO_SCENE = 2.45 / 1.75;
export const RECIPE_LIMITS = Object.freeze({ cityBytes: 120_000, triangles: 15_000, meshes: 13, lights: 4, props: 40, signs: 4, signCharacters: 24, crowd: 12 });
export function isRecipeSignText(text: unknown): text is string {
  return typeof text === 'string' && text.trim() === text && text.length > 0 && text.length <= RECIPE_LIMITS.signCharacters && !/[\x00-\x1f\x7f<>\u202a-\u202e\u2066-\u2069]/u.test(text);
}
export const REGION_IDS = ['niger-delta', 'yoruba-southwest', 'sahel-north', 'igbo-southeast', 'gulf-guinea', 'sahel-francophone', 'east-africa', 'swahili-coast', 'southern-africa', 'maghreb', 'western-europe', 'east-asia', 'south-asia', 'americas-oceania'] as const;
export const KIT_PROP_IDS = ['market-stall', 'canopy', 'crate-stack', 'produce-stand', 'cooking-stand', 'water-tank', 'generator', 'minibus', 'three-wheeler', 'bench', 'bollard', 'planter', 'broadleaf-tree', 'palm', 'acacia', 'wall', 'gate', 'kiosk', 'street-lamp', 'sign-frame'] as const;
export type RegionId = typeof REGION_IDS[number];
export type KitPropId = typeof KIT_PROP_IDS[number];
export interface Bounds3 { min: Vec3; max: Vec3 }

/** Structural projections of final AssetReport data. No factory or Node dependency reaches the browser. */
export interface MeasuredPart { node: string; triangles: number; bounds: Bounds3 }
export interface MeasuredAsset {
  version: 1; kind: 'kit' | 'hero'; id: string; sha256: string;
  rawBytes: number; brotliBytes: number; triangles: number; parts: readonly MeasuredPart[];
  atlas?: { width: 1024; height: 1024; mimeType: 'image/webp'; sha256: string };
}
export interface RecipeAssets { kit: MeasuredAsset; hero?: MeasuredAsset }
export interface RecipeTransform { x: number; z: number; ry: number; s: number }
export interface RecipeProp extends RecipeTransform { id: KitPropId }
export interface RecipeHero extends RecipeTransform { id: string }
/** V1 shells are solid Batch boxes in scene units. Every box blocks; no unverified openings. */
export interface RecipeBox { position: Vec3; size: Vec3; ry: number; colour: string }
export interface RecipeSpot { key: string; x: number; z: number; ry: number; approach?: [number, number] }
export interface RecipeSign { text: string; position: Vec3; width: number; height: number; ry: number }
export interface RecipeLamp { position: Vec3; colour: string; intensity: number; distance: number }
export interface SceneRecipeV1 {
  schema: 'allworld-scene'; version: 1; units: 'scene';
  city: string; venue: string; kind: string; region: RegionId; mood: 'outdoor' | 'indoor' | 'club';
  palette: { ground: string; wall: string; roof: string; accent: string; trim: string };
  footprint: { w: number; d: number };
  entrance: [number, number, number];
  shell: RecipeBox[]; props: RecipeProp[]; hero?: RecipeHero;
  signs: RecipeSign[]; spots: RecipeSpot[]; crowd: [number, number, number][]; lamps: RecipeLamp[];
  camera: Pick<SceneCamera, 'landscape' | 'portrait'>;
}
export interface CityRecipesV1 { schema: 'allworld-city-scenes'; version: 1; city: string; recipes: SceneRecipeV1[] }
export interface SceneryEstimate { triangles: number; meshes: number; lights: number }
export type HostSceneryByVenue = Readonly<Record<string, SceneryEstimate>>;
/** Exact target coverage; no inherited, default, kind-level or legacy allowance. */
export function parseHostSceneryByVenue(input: unknown, targetVenueIds: readonly string[]): HostSceneryByVenue {
  const ids = list(targetVenueIds, 256, 'hostScenery.targetVenueIds').map(id => identifier(id, 'hostScenery.targetVenueIds'));
  requireValue(new Set(ids).size === ids.length, 'hostScenery', 'duplicate target venue IDs');
  const map = object(input, ids, [], 'hostScenery');
  return Object.freeze(Object.fromEntries(ids.map(id => {
    const host = object(map[id], ['triangles', 'meshes', 'lights'], [], `hostScenery.${id}`);
    return [id, Object.freeze({ triangles: integer(host.triangles, 0, 15_000, `hostScenery.${id}.triangles`),
      meshes: integer(host.meshes, 0, 13, `hostScenery.${id}.meshes`), lights: integer(host.lights, 0, 4, `hostScenery.${id}.lights`) })];
  })));
}
/** Compatible with server/moderation/text.ts screenText. A null verdict is the only acceptance. */
export type SignTextFilter = (text: unknown, options: { contact: boolean; what: string }) => null | { code: string; category: string; reason: string };
export interface RecipeContext {
  city: string; venue: SceneVenue; assets: RecipeAssets; screenText: SignTextFilter;
  /** Complete host scenery outside recipe geometry, including sky/tables and all host lights. No default. */
  hostScenery: SceneryEstimate;
}
export interface ValidatedPlacement {
  source: 'kit' | 'hero'; id: string; node: string; assetSha256: string;
  x: number; z: number; ry: number;
  /** Rendering must use this scale exactly once, with no additional root or source scaling. */
  scale: number; bounds: Bounds3; footprint: WalkRect; triangles: number;
}
export interface ValidatedRecipe {
  recipe: SceneRecipeV1; placements: ValidatedPlacement[]; walk: WalkDescription;
  solids: Bounds3[]; estimate: SceneryEstimate;
  evidence: 'recipe-validation-only';
}
export const REQUIRES_SCENE_PROOF = Object.freeze([
  'Final decoded asset hashes, node names, UVs, textures and measured geometry match the supplied reports.',
  'Compiler draws the declared floor, shells and transforms; host tables and other added blockers preserve exact routes.',
  'Loaded scenery meshes, triangles, recursive lights and full-host draw/shadow costs fit their runtime budgets.',
  'Every required model decoded and was attached without drops or stand-ins; a resolved load promise is insufficient.',
  'Camera clearance, full crowd cost, authored-scene precedence, lazy loading and disposal pass integration checks.',
]);

function requireValue(condition: unknown, path: string, message: string): asserts condition {
  if (!condition) throw new Error(`${path}: ${message}`);
}
function object(value: unknown, required: readonly string[], optional: readonly string[], path: string): Record<string, unknown> {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), path, 'expected object');
  requireValue(Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null, path, 'expected plain JSON object');
  const allowed = new Set([...required, ...optional]);
  for (const key of Reflect.ownKeys(value)) {
    requireValue(typeof key === 'string' && allowed.has(key), path, 'unknown field');
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    requireValue(descriptor?.enumerable && 'value' in descriptor, path, 'expected JSON data field');
  }
  for (const key of required) requireValue(Object.hasOwn(value, key), `${path}.${key}`, 'missing field');
  return value as Record<string, unknown>;
}
function list(value: unknown, max: number, path: string): unknown[] {
  requireValue(Array.isArray(value) && value.length <= max, path, `expected array of at most ${max}`);
  requireValue(Reflect.ownKeys(value).length === value.length + 1, path, 'expected dense JSON array');
  for (let i = 0; i < value.length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, i);
    requireValue(descriptor?.enumerable && 'value' in descriptor, path, 'expected dense JSON data array');
  }
  return value;
}
function number(value: unknown, min: number, max: number, path: string): number {
  requireValue(typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max, path, 'number out of range');
  return value;
}
function integer(value: unknown, min: number, max: number, path: string): number {
  const result = number(value, min, max, path); requireValue(Number.isSafeInteger(result), path, 'expected integer'); return result;
}
function identifier(value: unknown, path: string): string {
  requireValue(typeof value === 'string' && /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/.test(value) && value.length <= 100, path, 'invalid identifier');
  return value;
}
function choice<T extends string>(value: unknown, choices: readonly T[], path: string): T {
  requireValue(typeof value === 'string' && choices.some(item => item === value), path, 'unknown value'); return value as T;
}
function tuple(value: unknown, size: number, min: number, max: number, path: string): number[] {
  const rows = list(value, size, path); requireValue(rows.length === size, path, `expected ${size} coordinates`);
  return rows.map((v, i) => number(v, min, max, `${path}[${i}]`));
}
function triple(value: unknown, path: string): Vec3 { const [x, y, z] = tuple(value, 3, -256, 256, path); return [x!, y!, z!]; }
function colour(value: unknown, path: string): string {
  requireValue(typeof value === 'string' && /^#[a-f0-9]{6}$/i.test(value), path, 'expected hex colour'); return value;
}
function bounds(value: unknown, path: string): Bounds3 {
  const b = object(value, ['min', 'max'], [], path), min = triple(b.min, `${path}.min`), max = triple(b.max, `${path}.max`);
  requireValue(min.every((v, axis) => v < max[axis]!), path, 'empty or inverted bounds'); return { min, max };
}
function transform(value: Record<string, unknown>, path: string): RecipeTransform {
  return { x: number(value.x, -64, 64, `${path}.x`), z: number(value.z, -64, 64, `${path}.z`),
    ry: number(value.ry, -Math.PI * 2, Math.PI * 2, `${path}.ry`), s: number(value.s, 0.01, 10, `${path}.s`) };
}
/** T * Ry * S, matching the model layer's Y rotation. Input bounds stay in their source units. */
function transformed(local: Bounds3, at: Vec3, yaw: number, scale: number): Bounds3 {
  const xs: number[] = [], ys: number[] = [], zs: number[] = [], c = Math.cos(yaw), s = Math.sin(yaw);
  for (const x of [local.min[0], local.max[0]]) for (const y of [local.min[1], local.max[1]]) for (const z of [local.min[2], local.max[2]]) {
    xs.push(at[0] + scale * (c * x + s * z)); ys.push(at[1] + scale * y); zs.push(at[2] + scale * (-s * x + c * z));
  }
  return { min: [Math.min(...xs), Math.min(...ys), Math.min(...zs)], max: [Math.max(...xs), Math.max(...ys), Math.max(...zs)] };
}
const footprintOf = (b: Bounds3): WalkRect => [b.min[0], b.min[2], b.max[0], b.max[2]];
const overlap = (a: WalkRect, b: WalkRect): boolean => Math.min(a[2], b[2]) - Math.max(a[0], b[0]) > 1e-8 && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > 1e-8;
function within(rect: WalkRect, floor: WalkRect, path: string): void {
  requireValue(rect[0] >= floor[0] - 1e-8 && rect[1] >= floor[1] - 1e-8 && rect[2] <= floor[2] + 1e-8 && rect[3] <= floor[3] + 1e-8, path, 'outside footprint');
}
function assetParts(asset: MeasuredAsset, kind: 'kit' | 'hero', id: string): Map<string, MeasuredPart> {
  const path = `assets.${kind}`;
  requireValue(asset && asset.version === 1 && asset.kind === kind && asset.id === id, path, 'asset identity mismatch');
  requireValue(typeof asset.sha256 === 'string' && /^[a-f0-9]{64}$/.test(asset.sha256), path, 'missing measured hash');
  integer(asset.rawBytes, 1, kind === 'hero' ? 60_000 : 2 * 1024 * 1024, `${path}.rawBytes`);
  integer(asset.brotliBytes, 1, kind === 'hero' ? 60_000 : 300_000, `${path}.brotliBytes`);
  if (kind === 'kit' || asset.atlas !== undefined) requireValue(asset.atlas?.width === 1024 && asset.atlas.height === 1024 && asset.atlas.mimeType === 'image/webp' && /^[a-f0-9]{64}$/.test(asset.atlas.sha256), path, 'expected measured 1K WebP atlas');
  const parts = new Map<string, MeasuredPart>();
  requireValue(Array.isArray(asset.parts) && asset.parts.length > 0 && asset.parts.length <= KIT_PROP_IDS.length, path, 'missing measured parts');
  for (const part of asset.parts) {
    requireValue(part && !parts.has(part.node), path, 'duplicate or missing part');
    if (kind === 'kit') choice(part.node, KIT_PROP_IDS, `${path}.node`);
    else requireValue(part.node === id, path, 'hero node must match city');
    integer(part.triangles, 1, kind === 'kit' ? 1500 : 4000, `${path}.triangles`);
    const measuredBounds = bounds(part.bounds, `${path}.${part.node}.bounds`);
    requireValue(Math.abs(measuredBounds.min[1]) <= 0.03, path, 'part must be grounded');
    parts.set(part.node, { node: part.node, triangles: part.triangles, bounds: measuredBounds });
  }
  requireValue(kind !== 'hero' || parts.size === 1, path, 'expected one hero node');
  requireValue(asset.triangles === [...parts.values()].reduce((sum, part) => sum + part.triangles, 0), path, 'triangle total mismatch');
  return parts;
}

/** Validates data and conservative estimates only; see REQUIRES_SCENE_PROOF before runtime acceptance. */
export function validateRecipe(input: unknown, context: RecipeContext): ValidatedRecipe {
  const r = object(input, ['schema', 'version', 'units', 'city', 'venue', 'kind', 'region', 'mood', 'palette', 'footprint', 'entrance', 'shell', 'props', 'signs', 'spots', 'crowd', 'lamps', 'camera'], ['hero'], 'recipe');
  requireValue(r.schema === 'allworld-scene' && r.version === 1 && r.units === 'scene', 'recipe', 'unsupported schema, version or units');
  const city = identifier(r.city, 'city'), venue = identifier(r.venue, 'venue'), kind = identifier(r.kind, 'kind');
  requireValue(city === context.city && venue === context.venue.id && kind === (context.venue.scene?.kind ?? 'generic'), 'recipe', 'venue identity mismatch');
  requireValue(typeof context.screenText === 'function', 'screenText', 'explicit portable filter required');
  const region = choice(r.region, REGION_IDS, 'region'), mood = choice(r.mood, ['outdoor', 'indoor', 'club'] as const, 'mood');
  const p = object(r.palette, ['ground', 'wall', 'roof', 'accent', 'trim'], [], 'palette');
  const palette = { ground: colour(p.ground, 'palette.ground'), wall: colour(p.wall, 'palette.wall'), roof: colour(p.roof, 'palette.roof'), accent: colour(p.accent, 'palette.accent'), trim: colour(p.trim, 'palette.trim') };
  const f = object(r.footprint, ['w', 'd'], [], 'footprint');
  const footprint = { w: number(f.w, 4, 64, 'footprint.w'), d: number(f.d, 4, 64, 'footprint.d') };
  const floor: WalkRect = [-footprint.w / 2, -footprint.d / 2, footprint.w / 2, footprint.d / 2];
  const entrance = triple(r.entrance, 'entrance');
  number(entrance[2], -Math.PI * 2, Math.PI * 2, 'entrance.yaw');
  const kit = assetParts(context.assets.kit, 'kit', region);
  const heroParts = context.assets.hero ? assetParts(context.assets.hero, 'hero', city) : undefined;
  if (context.assets.hero?.atlas) requireValue(context.assets.hero.atlas.sha256 === context.assets.kit.atlas?.sha256, 'assets.hero.atlas', 'hero must share the selected regional atlas');
  const placements: ValidatedPlacement[] = [], solids: Bounds3[] = [], blockers: WalkRect[] = [];
  function addSolid(b: Bounds3, path: string) {
    const rect = footprintOf(b); within(rect, floor, path);
    requireValue(!blockers.some(other => overlap(rect, other)), path, 'overlapping blocking footprints');
    blockers.push(rect); solids.push(b);
  }
  const shell = list(r.shell, 64, 'shell').map((value, i): RecipeBox => {
    const path = `shell[${i}]`, v = object(value, ['position', 'size', 'ry', 'colour'], [], path);
    const position = triple(v.position, `${path}.position`), size = triple(v.size, `${path}.size`);
    requireValue(size.every(n => n > 0 && n <= 64), path, 'box size must be positive');
    const ry = number(v.ry, -Math.PI * 2, Math.PI * 2, `${path}.ry`);
    const local: Bounds3 = { min: [-size[0] / 2, -size[1] / 2, -size[2] / 2], max: [size[0] / 2, size[1] / 2, size[2] / 2] };
    const b = transformed(local, position, ry, 1); requireValue(b.min[1] >= -1e-8, path, 'box below floor'); addSolid(b, path);
    return { position, size, ry, colour: colour(v.colour, `${path}.colour`) };
  });
  function place(v: Record<string, unknown>, source: 'kit' | 'hero', id: string, path: string): RecipeTransform {
    const t = transform(v, path), part = (source === 'kit' ? kit : heroParts)?.get(id);
    requireValue(part, path, 'unapproved or unmeasured part');
    const scale = METRES_TO_SCENE * t.s, b = transformed(part.bounds, [t.x, 0, t.z], t.ry, scale);
    addSolid(b, path);
    placements.push({ source, id, node: part.node, assetSha256: (source === 'kit' ? context.assets.kit : context.assets.hero)!.sha256,
      x: t.x, z: t.z, ry: t.ry, scale, bounds: b, footprint: footprintOf(b), triangles: part.triangles });
    return t;
  }
  const props = list(r.props, RECIPE_LIMITS.props, 'props').map((value, i): RecipeProp => {
    const path = `props[${i}]`, v = object(value, ['id', 'x', 'z', 'ry', 's'], [], path), id = choice(v.id, KIT_PROP_IDS, `${path}.id`);
    return { id, ...place(v, 'kit', id, path) };
  });
  let hero: RecipeHero | undefined;
  if (Object.hasOwn(r, 'hero')) {
    const v = object(r.hero, ['id', 'x', 'z', 'ry', 's'], [], 'hero'), id = identifier(v.id, 'hero.id');
    requireValue(id === city, 'hero.id', 'hero must belong to this city'); hero = { id, ...place(v, 'hero', id, 'hero') };
  }
  const signs = list(r.signs, RECIPE_LIMITS.signs, 'signs').map((value, i): RecipeSign => {
    const path = `signs[${i}]`, v = object(value, ['text', 'position', 'width', 'height', 'ry'], [], path);
    requireValue(isRecipeSignText(v.text), path, 'invalid sign text');
    requireValue(context.screenText(v.text, { contact: true, what: 'Recipe sign' }) === null, path, 'unsafe sign text');
    const position = triple(v.position, `${path}.position`), width = number(v.width, 0.1, 8, `${path}.width`), height = number(v.height, 0.1, 3, `${path}.height`), ry = number(v.ry, -Math.PI * 2, Math.PI * 2, `${path}.ry`);
    requireValue(position[1] - height / 2 >= 2.45, path, 'sign must be above avatar clearance');
    const b = transformed({ min: [-width / 2, -height / 2, -0.01], max: [width / 2, height / 2, 0.01] }, position, ry, 1);
    within(footprintOf(b), floor, path); solids.push(b);
    return { text: v.text, position, width, height, ry };
  });
  const spots = list(r.spots, 64, 'spots').map((value, i): RecipeSpot => {
    const path = `spots[${i}]`, v = object(value, ['key', 'x', 'z', 'ry'], ['approach'], path);
    const result: RecipeSpot = { key: identifier(v.key, `${path}.key`), x: number(v.x, -64, 64, `${path}.x`), z: number(v.z, -64, 64, `${path}.z`), ry: number(v.ry, -Math.PI * 2, Math.PI * 2, `${path}.ry`) };
    if (Object.hasOwn(v, 'approach')) { const [x, z] = tuple(v.approach, 2, -64, 64, `${path}.approach`); result.approach = [x!, z!]; }
    return result;
  });
  const actual = Array.isArray(context.venue.scene?.spots) ? context.venue.scene.spots : Object.values(context.venue.spots ?? {});
  const expected = actual.map(s => s.id), got = spots.map(s => s.key);
  requireValue(new Set(expected).size === expected.length && expected.every(id => typeof id === 'string'), 'venue.spots', 'invalid expected spot IDs');
  requireValue(new Set(got).size === got.length && got.length === expected.length && expected.every(id => got.includes(id)), 'spots', 'must contain all and only actual venue spot IDs');
  const crowd = list(r.crowd, RECIPE_LIMITS.crowd, 'crowd').map((v, i) => { const at = triple(v, `crowd[${i}]`); number(at[2], -Math.PI * 2, Math.PI * 2, `crowd[${i}].yaw`); return at; });
  const lamps = list(r.lamps, 4, 'lamps').map((value, i): RecipeLamp => {
    const path = `lamps[${i}]`, v = object(value, ['position', 'colour', 'intensity', 'distance'], [], path), position = triple(v.position, `${path}.position`);
    requireValue(position[1] >= 0, path, 'light below floor'); within([position[0], position[2], position[0], position[2]], floor, path);
    return { position, colour: colour(v.colour, `${path}.colour`), intensity: number(v.intensity, 0, 4, `${path}.intensity`), distance: number(v.distance, 0.1, 64, `${path}.distance`) };
  });
  const c = object(r.camera, ['landscape', 'portrait'], [], 'camera');
  const camera = { landscape: triple(c.landscape, 'camera.landscape'), portrait: triple(c.portrait, 'camera.portrait') };
  requireValue(camera.landscape[1] > 0 && camera.portrait[1] > 0, 'camera', 'camera must be above floor');
  const recipe: SceneRecipeV1 = { schema: 'allworld-scene', version: 1, units: 'scene', city, venue, kind, region, mood, palette, footprint, entrance, shell, props, signs, spots, crowd, lamps, camera, ...(hero ? { hero } : {}) };
  requireValue(new TextEncoder().encode(JSON.stringify(recipe)).length <= RECIPE_LIMITS.cityBytes, 'recipe', 'UTF-8 byte budget exceeded');

  const host = object(context.hostScenery, ['triangles', 'meshes', 'lights'], [], 'hostScenery');
  // Batch boxes have 12 triangles and one shared solid layer; a sign quad has two triangles.
  // Count every imported placement/sign separately until a real compiler proves tighter grouping.
  const estimate = { triangles: integer(host.triangles, 0, 15_000, 'hostScenery.triangles') + 12 * (1 + shell.length) + signs.length * 2 + placements.reduce((sum, p) => sum + p.triangles, 0),
    meshes: integer(host.meshes, 0, 13, 'hostScenery.meshes') + 1 + placements.length + signs.length,
    lights: integer(host.lights, 0, 4, 'hostScenery.lights') + lamps.length };
  for (const key of ['triangles', 'meshes', 'lights'] as const) requireValue(estimate[key] <= RECIPE_LIMITS[key], `estimate.${key}`, 'scenery budget exceeded');

  // Explicit outside walls cover the grid's rounded partial edge cells and avatar radius.
  const [x0, z0, x1, z1] = floor;
  const edges: WalkRect[] = [[x0 - 1, z0 - 1, x0, z1 + 1], [x1, z0 - 1, x1 + 1, z1 + 1], [x0 - 1, z0 - 1, x1 + 1, z0], [x0 - 1, z1, x1 + 1, z1 + 1]];
  const walk: WalkDescription = { bounds: floor, block: [...edges, ...blockers], entrance: [...entrance] };
  const grid = createWalkGrid(walk);
  function exactFree(x: number, z: number, path: string) {
    requireValue(x >= x0 + AVATAR_RADIUS && x <= x1 - AVATAR_RADIUS && z >= z0 + AVATAR_RADIUS && z <= z1 - AVATAR_RADIUS, path, 'target outside supported footprint');
    requireValue(!blockers.some(b => x >= b[0] - AVATAR_RADIUS && x <= b[2] + AVATAR_RADIUS && z >= b[1] - AVATAR_RADIUS && z <= b[3] + AVATAR_RADIUS), path, 'exact target is blocked');
    requireValue(grid.free(x, z), path, 'exact target is blocked');
  }
  exactFree(entrance[0], entrance[1], 'entrance');
  function route(ax: number, az: number, bx: number, bz: number, path: string) {
    exactFree(bx, bz, path);
    const points = grid.path(ax, az, bx, bz), end = points?.at(-1);
    requireValue(points !== null && (end ? Math.hypot(end.x - bx, end.z - bz) <= 1e-8 : ax === bx && az === bz), path, 'exact target is unreachable');
  }
  for (const spot of spots) {
    exactFree(spot.x, spot.z, `spots.${spot.key}`);
    if (spot.approach) { route(entrance[0], entrance[1], ...spot.approach, `spots.${spot.key}.approach`); route(...spot.approach, spot.x, spot.z, `spots.${spot.key}`); }
    else route(entrance[0], entrance[1], spot.x, spot.z, `spots.${spot.key}`);
  }
  crowd.forEach(([x, z], i) => route(entrance[0], entrance[1], x, z, `crowd[${i}]`));
  return { recipe, placements, walk, solids, estimate, evidence: 'recipe-validation-only' };
}

/** Counts the received UTF-8 document, including whitespace, before parsing or allocating grids. */
export type CityRecipeContext = Omit<RecipeContext, 'venue' | 'hostScenery'> & { venues: readonly SceneVenue[]; hostScenery: HostSceneryByVenue };
export function parseCityRecipes(json: string, context: CityRecipeContext): { recipes: ValidatedRecipe[]; utf8Bytes: number } {
  const utf8Bytes = new TextEncoder().encode(json).length;
  requireValue(utf8Bytes <= RECIPE_LIMITS.cityBytes, 'city', 'UTF-8 byte budget exceeded');
  const input: unknown = JSON.parse(json), pack = object(input, ['schema', 'version', 'city', 'recipes'], [], 'city');
  requireValue(pack.schema === 'allworld-city-scenes' && pack.version === 1 && pack.city === context.city, 'city', 'unsupported schema, version or city');
  const seen = new Set<string>(), venues = new Map(context.venues.map(venue => [venue.id, venue]));
  requireValue(venues.size === context.venues.length, 'venues', 'duplicate venue IDs');
  const hostScenery = parseHostSceneryByVenue(context.hostScenery, context.venues.map(venue => identifier(venue.id, 'venue.id')));
  const recipes = list(pack.recipes, 256, 'city.recipes').map(value => {
    const r = object(value, ['schema', 'version', 'units', 'city', 'venue', 'kind', 'region', 'mood', 'palette', 'footprint', 'entrance', 'shell', 'props', 'signs', 'spots', 'crowd', 'lamps', 'camera'], ['hero'], 'recipe');
    const id = identifier(r.venue, 'recipe.venue'), venue = venues.get(id);
    requireValue(venue && !seen.has(id), 'recipe.venue', 'unknown or duplicate venue'); seen.add(id);
    return validateRecipe(value, { ...context, venue, hostScenery: hostScenery[id]! });
  });
  requireValue(seen.size === venues.size, 'city.recipes', 'must contain all and only target venue IDs');
  return { recipes, utf8Bytes };
}
