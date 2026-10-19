import type { MeasuredAsset, RegionId, HostSceneryByVenue } from './contract.ts';
import { KIT_PROP_IDS, REGION_IDS, RECIPE_LIMITS, parseHostSceneryByVenue } from './contract.ts';

export interface RecipeAssetRef { url: string; measurement: MeasuredAsset }
export interface RecipeRuntimeMetadata {
  schema: 'allworld-recipe-runtime'; version: 1; city: string; region: RegionId;
  recipeSha256: string; recipeBytes: number; targetVenueIds: string[];
  assets: { kit: RecipeAssetRef; hero?: RecipeAssetRef };
  hostScenery: HostSceneryByVenue;
}
export interface RecipeCityPack { text: string; metadata: RecipeRuntimeMetadata }

export function requireRecipe(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`Recipe: ${message}`);
}
export function record(value: unknown, fields: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  requireRecipe(value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype, 'expected JSON object');
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    requireRecipe(typeof key === 'string' && [...fields, ...optional].includes(key) && descriptor?.enumerable && 'value' in descriptor, 'unexpected object field');
  }
  for (const field of fields) requireRecipe(Object.hasOwn(value, field), `missing ${field}`);
  return value as Record<string, unknown>;
}
const digest = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const identifier = (value: unknown): value is string => typeof value === 'string' && /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/.test(value) && value.length <= 100;
function integer(value: unknown, maximum: number, minimum = 0): number {
  requireRecipe(typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum, 'integer outside bound');
  return value;
}
function vector(value: unknown): [number, number, number] {
  requireRecipe(Array.isArray(value) && value.length === 3 && value.every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 256), 'invalid bounds vector');
  return [value[0], value[1], value[2]];
}
export function parseAssetRef(input: unknown, kind: 'kit' | 'hero', id: string): RecipeAssetRef {
  const ref = record(input, ['url', 'measurement']);
  const m = record(ref.measurement, ['version', 'kind', 'id', 'sha256', 'rawBytes', 'brotliBytes', 'triangles', 'parts'], ['atlas']);
  requireRecipe(m.version === 1 && m.kind === kind && m.id === id && digest(m.sha256), 'asset identity/hash mismatch');
  requireRecipe(typeof ref.url === 'string' && ref.url === `/assets/scene-factory/${kind === 'kit' ? 'kits' : 'heroes'}/${id}-${m.sha256}.glb`, 'unexpected asset URL');
  requireRecipe(Array.isArray(m.parts) && m.parts.length > 0 && m.parts.length <= KIT_PROP_IDS.length, 'invalid measured parts');
  const parts = m.parts.map(input => {
    const p = record(input, ['node', 'triangles', 'bounds']), bounds = record(p.bounds, ['min', 'max']);
    requireRecipe(typeof p.node === 'string' && (kind === 'kit' ? KIT_PROP_IDS.some(id => id === p.node) : p.node === id), 'unexpected measured node');
    const min = vector(bounds.min), max = vector(bounds.max);
    requireRecipe(min.every((n, axis) => n < max[axis]!) && Math.abs(min[1]) <= 0.03, 'invalid measured bounds');
    return { node: p.node, triangles: integer(p.triangles, kind === 'kit' ? 1500 : 4000, 1), bounds: { min, max } };
  });
  requireRecipe(new Set(parts.map(p => p.node)).size === parts.length, 'duplicate measured node');
  requireRecipe(kind === 'kit' ? parts.length === KIT_PROP_IDS.length : parts.length === 1, 'incomplete measured asset');
  const triangles = integer(m.triangles, 100_000, 1);
  requireRecipe(triangles === parts.reduce((sum, p) => sum + p.triangles, 0), 'measured triangle total mismatch');
  let atlas: MeasuredAsset['atlas'];
  if (kind === 'kit' || m.atlas !== undefined) {
    const a = record(m.atlas, ['width', 'height', 'mimeType', 'sha256']);
    requireRecipe(a.width === 1024 && a.height === 1024 && a.mimeType === 'image/webp' && digest(a.sha256), 'invalid measured atlas');
    atlas = { width: 1024, height: 1024, mimeType: 'image/webp', sha256: a.sha256 };
  }
  return { url: ref.url, measurement: { version: 1, kind, id, sha256: m.sha256, triangles, parts,
    rawBytes: integer(m.rawBytes, kind === 'kit' ? 2 * 1024 * 1024 : 60_000, 1),
    brotliBytes: integer(m.brotliBytes, kind === 'kit' ? 300_000 : 60_000, 1), ...(atlas ? { atlas } : {}) } };
}
export async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
}
export async function parseRecipePack(input: unknown, city: string): Promise<RecipeCityPack> {
  const pack = record(input, ['text', 'metadata']), m = record(pack.metadata, ['schema', 'version', 'city', 'region', 'recipeSha256', 'recipeBytes', 'targetVenueIds', 'assets', 'hostScenery']);
  requireRecipe(identifier(city) && m.schema === 'allworld-recipe-runtime' && m.version === 1 && m.city === city && REGION_IDS.some(r => r === m.region), 'invalid city metadata');
  requireRecipe(typeof pack.text === 'string' && digest(m.recipeSha256), 'invalid recipe text/hash');
  const bytes = new TextEncoder().encode(pack.text);
  requireRecipe(bytes.length === integer(m.recipeBytes, RECIPE_LIMITS.cityBytes, 1) && await sha256(bytes) === m.recipeSha256, 'recipe byte/hash mismatch');
  requireRecipe(Array.isArray(m.targetVenueIds) && m.targetVenueIds.length <= 256 && m.targetVenueIds.every(identifier) && new Set(m.targetVenueIds).size === m.targetVenueIds.length, 'invalid target IDs');
  const assets = record(m.assets, ['kit'], ['hero']), region = m.region as RegionId;
  const kit = parseAssetRef(assets.kit, 'kit', region), hero = assets.hero === undefined ? undefined : parseAssetRef(assets.hero, 'hero', city);
  requireRecipe(!hero?.measurement.atlas || hero.measurement.atlas.sha256 === kit.measurement.atlas?.sha256, 'hero atlas differs from selected regional kit');
  const hostScenery = parseHostSceneryByVenue(m.hostScenery, m.targetVenueIds);
  return { text: pack.text, metadata: { schema: 'allworld-recipe-runtime', version: 1, city, region,
    recipeSha256: m.recipeSha256, recipeBytes: bytes.length, targetVenueIds: [...m.targetVenueIds],
    assets: { kit, ...(hero ? { hero } : {}) }, hostScenery } };
}
