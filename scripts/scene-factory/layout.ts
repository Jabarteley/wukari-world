import { createHash } from 'node:crypto';
import { RETAINED_LAYOUT_SEEDS } from './layout-seeds.ts';
import { METRES_TO_SCENE, RECIPE_LIMITS, isRecipeSignText, parseCityRecipes, parseHostSceneryByVenue, validateRecipe } from '../../src/scene/recipe/contract.ts';
import type { CityRecipesV2, RecipeSky, MeasuredPart, RecipeAssets, CityRecipeContext, RecipeProp, RegionId, SceneRecipeV1, HostSceneryByVenue, SignTextFilter, ValidatedRecipe } from '../../src/scene/recipe/contract.ts';
import { createWalkGrid } from '../../src/scene/walk-grid.ts';
import type { SceneVenue } from '../../src/scene/types.ts';
import type { CityBriefV1, CityBriefVenueV1 } from './facts.ts';

/** Explicit art direction, independent of city latitude, atlas colors and weather. Indoor/club grading is neutral. */
export function factoryRecipeSky(mood: SceneRecipeV1['mood']): RecipeSky {
  return mood === 'outdoor'
    ? { horizon: [1, 0.98, 0.95], zenith: [0.94, 0.98, 1] }
    : { horizon: [1, 1, 1], zenith: [1, 1, 1] };
}

type Palette = SceneRecipeV1['palette'];
type Profile = 'market' | 'park' | 'transit' | 'meal' | 'civic';
export type LayoutCandidateResult =
  | { kind: 'accepted'; city: string; venue: string; candidate: number }
  | { kind: 'rejected'; city: string; venue: string; candidate: number; reason: string };
export interface LayoutInput {
  brief: CityBriefV1;
  assets: RecipeAssets;
  screenText: SignTextFilter;
  hostScenery: HostSceneryByVenue;
  /** One decorative reference in a chosen public venue; never an invented surveyed location. */
  heroVenueId?: string;
  /** Name of a city reference model when its subject differs from the host venue. */
  heroReferenceLabel?: string;
  /** Offline-only diagnostics. Observer failures propagate and never affect candidate classification. */
  onCandidateResult?: (result: LayoutCandidateResult) => void;
}

const PALETTES: Record<RegionId, readonly [string, string, string, string, string]> = {
  'niger-delta': ['#9b9878', '#dfd3b0', '#6c5550', '#347b6b', '#b96543'],
  'yoruba-southwest': ['#b29a77', '#dfc3a0', '#915b47', '#276e66', '#dfac4d'],
  'sahel-north': ['#c4ac83', '#dac5a1', '#9d7654', '#537b77', '#bc7447'],
  'igbo-southeast': ['#aa9578', '#d2bbaa', '#8c604d', '#366b55', '#c68c4f'],
  'gulf-guinea': ['#b4a785', '#e6d8b7', '#8b5d44', '#397352', '#c05b32'],
  'sahel-francophone': ['#c6ae85', '#e0c4a2', '#a56c4d', '#4c7679', '#cf9247'],
  'east-africa': ['#9e9c78', '#d2cbb1', '#886c57', '#527b56', '#b96546'],
  'swahili-coast': ['#c1b58e', '#e8dfc9', '#96785b', '#3f8689', '#b97f48'],
  'southern-africa': ['#a99e88', '#d9d2bd', '#8c7267', '#5e8167', '#a86245'],
  maghreb: ['#c5b398', '#e9dfc8', '#96735c', '#467b83', '#bc8450'],
  'western-europe': ['#aaa9a1', '#e1dace', '#6b7278', '#477366', '#a97656'],
  'east-asia': ['#a9aaa2', '#e3decd', '#626a70', '#497b72', '#b26549'],
  'south-asia': ['#b8a687', '#e5d4b8', '#8d6d59', '#477b68', '#c38642'],
  'americas-oceania': ['#aaa78d', '#ded5bf', '#83706a', '#4a7f73', '#b37849'],
};
const PROPS: Record<Profile, readonly RecipeProp['id'][]> = {
  market: ['market-stall', 'produce-stand', 'crate-stack', 'cooking-stand', 'kiosk', 'canopy'],
  park: ['broadleaf-tree', 'bench', 'planter', 'broadleaf-tree', 'bench', 'street-lamp'],
  transit: ['minibus', 'three-wheeler', 'bench', 'bollard', 'kiosk', 'gate'],
  meal: ['cooking-stand', 'canopy', 'planter', 'bench', 'kiosk', 'crate-stack'],
  civic: ['planter', 'bench', 'gate', 'broadleaf-tree', 'bollard', 'street-lamp'],
};
type Anchor = readonly [x: number, z: number, ry: number];
interface Composition { w: number; d: number; propWidth: number; propDepth: number; anchors: readonly Anchor[] }
/** Pinned to src/scene/venue-scenes.ts; layout-host.test.ts verifies the integration boundary. */
export const LAYOUT_SPOT_BEHIND = 1.3, LAYOUT_SPOT_FRONT = 3.4, LAYOUT_SPOT_SIDE = 1.7;
const COMPOSITIONS: Record<Profile, Composition> = {
  market: { w: 26, d: 21, propWidth: 4.8, propDepth: 4.4, anchors: [[-.31, -.25, 0], [-.35, -.04, Math.PI / 2], [-.29, .14, 0], [.31, -.26, 0], [.35, -.05, -Math.PI / 2], [.29, .13, 0]] },
  park: { w: 28, d: 24, propWidth: 4.6, propDepth: 4.6, anchors: [[-.30, -.22, .18], [-.35, .01, Math.PI / 2], [-.27, .18, -.2], [.31, -.19, -.12], [.35, .04, -Math.PI / 2], [.25, .20, .24]] },
  transit: { w: 29, d: 21, propWidth: 5.2, propDepth: 4.2, anchors: [[-.31, -.24, Math.PI / 2], [-.35, -.02, Math.PI / 2], [-.30, .16, Math.PI / 2], [.31, -.25, -Math.PI / 2], [.35, -.03, -Math.PI / 2], [.30, .15, -Math.PI / 2]] },
  meal: { w: 22, d: 19, propWidth: 4.2, propDepth: 4, anchors: [[-.30, -.25, 0], [-.35, -.03, Math.PI / 2], [-.29, .16, 0], [.30, -.25, 0], [.35, -.03, -Math.PI / 2], [.29, .16, 0]] },
  civic: { w: 25, d: 21, propWidth: 4.4, propDepth: 4.2, anchors: [[-.30, -.24, .1], [-.35, -.02, Math.PI / 2], [-.28, .17, -.1], [.30, -.24, -.1], [.35, -.02, -Math.PI / 2], [.28, .17, .1]] },
};
const digest = (value: string): Buffer => createHash('sha256').update(value).digest();

/** Layout art remains stable across provenance-only changes; semantic revisions get a fresh deterministic seed. */
export function layoutSeed(brief: CityBriefV1): { kind: 'retained-v1' | 'semantic-v1'; contentSha256: string; seedSha256: string } {
  const contentSha256 = brief.digests.contentSha256, retained = RETAINED_LAYOUT_SEEDS[brief.city.id];
  return retained?.contentSha256 === contentSha256
    ? { kind: 'retained-v1', contentSha256, seedSha256: retained.seedSha256 }
    : { kind: 'semantic-v1', contentSha256, seedSha256: digest(`allworld-layout-seed-v1/${brief.city.id}/${contentSha256}`).toString('hex') };
}

const rounded = (n: number): number => Math.round(n * 1e6) / 1e6;
function tint(hex: string, delta: number): string {
  return '#' + [1, 3, 5].map(at => Math.max(0, Math.min(255, Number.parseInt(hex.slice(at, at + 2), 16) + delta)).toString(16).padStart(2, '0')).join('');
}
function paletteOf(region: RegionId, seed: Buffer): Palette {
  const row = PALETTES[region];
  if (!row) throw new Error(`Unknown art palette: ${region}`);
  const values = row.map((c, i) => tint(c, (seed[i]! % 15) - 7));
  return { ground: values[0]!, wall: values[1]!, roof: values[2]!, accent: values[3]!, trim: values[4]! };
}
function profileOf(venue: CityBriefVenueV1): Profile {
  const kind = venue.scene.kind;
  if (/market|shop|mall|retail/.test(kind)) return 'market';
  if (/park|garden|lakeside|hilltop|viewpoint|beach|quad/.test(kind)) return 'park';
  if (/transit|station|airport|transport|junction|motor|hub/.test(kind)) return 'transit';
  if (/meal|food|restaurant|cafe|canteen|bar|club|buka/.test(kind)) return 'meal';
  return 'civic';
}

function spotLayout(venue: CityBriefVenueV1, seed: Buffer): { spots: SceneRecipeV1['spots']; width: number; depth: number } {
  const n = venue.effectiveSpots.length;
  if (n > 64) throw new Error('Too many effective venue spots');
  const cols = Math.min(8, Math.max(1, Math.ceil(Math.sqrt(n)))), rows = Math.max(1, Math.ceil(n / cols)), gap = 2.7;
  const angle = ((seed[18]! % 9) - 4) * 0.035, c = Math.cos(angle), s = Math.sin(angle);
  const spots = venue.effectiveSpots.map((spot, index) => {
    const gx = ((index % cols) - (Math.min(cols, n) - 1) / 2) * gap;
    const gz = (Math.floor(index / cols) - (rows - 1) / 2) * gap;
    return { key: spot.id, x: rounded(c * gx + s * gz), z: rounded(-s * gx + c * gz), ry: rounded(Math.PI + angle) };
  });
  return { spots, width: Math.max(0, Math.min(cols, n) - 1) * gap, depth: n ? (rows - 1) * gap : 0 };
}

/** Match the host's normal landscape-camera marker rectangle without importing its runtime graph. */
export function clearOfCameraFacingSpotMarkers(
  x: number,
  z: number,
  spots: readonly { x: number; z: number }[],
  landscape: readonly [number, number, number],
): boolean {
  const [cx, , cz] = landscape, size = Math.hypot(cx, cz) || 1, tx = cx / size, tz = cz / size;
  return spots.every(spot => {
    const dx = x - spot.x, dz = z - spot.z;
    const along = dx * tx + dz * tz, side = dx * tz - dz * tx;
    return !(along > -LAYOUT_SPOT_BEHIND && along < LAYOUT_SPOT_FRONT && Math.abs(side) < LAYOUT_SPOT_SIDE);
  });
}

function groupedCrowd(base: ValidatedRecipe, seed: Buffer, attempt: number): SceneRecipeV1['crowd'] | null {
  const grid = createWalkGrid(base.walk), [ex, ez] = base.recipe.entrance, selected: SceneRecipeV1['crowd'] = [];
  const fractions = [-.32, -.16, 0, .16, .32].flatMap((x, column) => [-.30, -.10, .10, .30].map((z, row) => ({ x, z, column, row })));
  const candidates = fractions.map((candidate, index) => {
    const rank = digest(`${seed.toString('hex')}/${attempt}/${index}`);
    return { ...candidate, rank: rank.readUInt32BE(0), angle: rank[4]! / 255 * Math.PI * 2 };
  }).sort((a, b) => a.rank - b.rank || a.row - b.row || a.column - b.column);
  const usable = (x: number, z: number): boolean => {
    if (!grid.free(x, z) || Math.hypot(x - ex, z - ez) < 2.4) return false;
    if (base.recipe.spots.some(spot => Math.hypot(x - spot.x, z - spot.z) < 1.7)) return false;
    if (!clearOfCameraFacingSpotMarkers(x, z, base.recipe.spots, base.recipe.camera.landscape)) return false;
    const path = grid.path(ex, ez, x, z), end = path?.at(-1);
    return path !== null && (end ? Math.hypot(end.x - x, end.z - z) <= 1e-8 : ex === x && ez === z);
  };
  for (const candidate of candidates) {
    const jitterX = ((seed[(candidate.column * 5 + candidate.row + 7) % seed.length]! / 255) - .5) * .5;
    const jitterZ = ((seed[(candidate.column * 3 + candidate.row + 19) % seed.length]! / 255) - .5) * .45;
    const cx = candidate.x * base.recipe.footprint.w + jitterX, cz = candidate.z * base.recipe.footprint.d + jitterZ;
    const ox = Math.cos(candidate.angle) * 1.25, oz = Math.sin(candidate.angle) * 1.25;
    const pair: SceneRecipeV1['crowd'] = [[rounded(cx - ox), rounded(cz - oz), rounded(Math.atan2(ox, oz))], [rounded(cx + ox), rounded(cz + oz), rounded(Math.atan2(-ox, -oz))]];
    if (!pair.every(([x, z]) => usable(x, z) && selected.every(([sx, sz]) => Math.hypot(x - sx, z - sz) >= 2.4 - 1e-6))) continue;
    selected.push(...pair);
    if (selected.length === RECIPE_LIMITS.crowd) return selected;
  }
  return null;
}

/** Metadata is the final decoder measurement; this only chooses a bounded placement. */
function atCell(part: MeasuredPart, x: number, z: number, ry: number, width: number, depth: number, height: number) {
  const c = Math.cos(ry), s = Math.sin(ry), xs: number[] = [], zs: number[] = [];
  for (const px of [part.bounds.min[0], part.bounds.max[0]]) for (const pz of [part.bounds.min[2], part.bounds.max[2]]) {
    xs.push(c * px + s * pz); zs.push(-s * px + c * pz);
  }
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const extentY = part.bounds.max[1] - part.bounds.min[1];
  if (![x0, x1, z0, z1, extentY].every(Number.isFinite) || x1 <= x0 || z1 <= z0 || extentY <= 0) throw new Error('Invalid measured part bounds');
  const scale = rounded(Math.min(1, width / ((x1 - x0) * METRES_TO_SCENE), depth / ((z1 - z0) * METRES_TO_SCENE), height / (extentY * METRES_TO_SCENE)) * 0.99);
  return { x: rounded(x - (x0 + x1) / 2 * scale * METRES_TO_SCENE), z: rounded(z - (z0 + z1) / 2 * scale * METRES_TO_SCENE), ry, s: scale };
}

export function venueForRecipe(venue: CityBriefVenueV1): SceneVenue {
  return { id: venue.id, label: venue.name, scene: { kind: venue.scene.kind, spots: venue.effectiveSpots.map(spot => ({ id: spot.id, label: spot.name })) } };
}

export function draftVenueRecipe(venue: CityBriefVenueV1, input: LayoutInput): SceneRecipeV1 {
  if (venue.scene.disposition !== 'target-recipe' || !input.brief.targetVenueIds.includes(venue.id)) throw new Error('Authored and home scenes cannot be recipe targets');
  const hostScenery = parseHostSceneryByVenue(input.hostScenery, input.brief.targetVenueIds)[venue.id]!;
  const city = input.brief.city.id, region = input.brief.style.region;
  if (input.assets.kit.id !== region) throw new Error('Kit does not match the explicitly selected art palette');
  if (input.heroVenueId !== undefined && !input.brief.targetVenueIds.includes(input.heroVenueId)) throw new Error('Hero venue must be a recipe target');
  const seed = digest(`${city}/${venue.id}/${layoutSeed(input.brief).seedSha256}`), palette = paletteOf(region, seed);
  const profile = profileOf(venue), composition = COMPOSITIONS[profile], spotPlan = spotLayout(venue, seed);
  const heroBackBand = input.heroVenueId === venue.id ? 18 - 2 * Math.min(0, ...spotPlan.spots.map(spot => spot.z)) : 0;
  const budget = RECIPE_LIMITS.meshes - hostScenery.meshes - 1 - 1 - (input.heroVenueId === venue.id ? 1 : 0);
  const count = Math.min(6, budget);
  if (count < 3) throw new Error('Host leaves too few scenery meshes for a recipe');
  const parts = new Map(input.assets.kit.parts.map(part => [part.node, part]));
  let signText = '';
  const displayName = input.heroVenueId === venue.id && input.heroReferenceLabel ? `Model: ${input.heroReferenceLabel}` : venue.name;
  for (const character of displayName) {
    if (signText.length + character.length > RECIPE_LIMITS.signCharacters) break;
    signText += character;
  }
  signText = signText.trim();
  let last: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const w = Math.max(composition.w + seed[5]! % 3, spotPlan.width + 12) + attempt;
    const d = rounded(Math.max(composition.d + seed[6]! % 3, spotPlan.depth + 12, heroBackBand) + attempt);
    if (w > 64 || d > 64) throw new Error('Effective venue spots exceed the recipe footprint limit');
    const mirror = seed[11]! % 2 ? -1 : 1, choices = PROPS[profile], props: RecipeProp[] = [];
    for (let index = 0; index < count; index++) {
      const [nx, nz, yaw] = composition.anchors[index]!;
      const id = choices[(index + seed[8]! % choices.length) % choices.length]!, part = parts.get(id);
      if (!part) throw new Error(`Kit is missing ${id}`);
      const jitterX = ((seed[(24 + index) % seed.length]! / 255) - .5) * .5;
      const jitterZ = ((seed[(2 + index * 2) % seed.length]! / 255) - .5) * .45;
      const ry = rounded(mirror < 0 ? Math.PI - yaw : yaw);
      props.push({ id, ...atCell(part, mirror * nx * w + jitterX, nz * d + jitterZ, ry, composition.propWidth, composition.propDepth, 7.5) });
    }
    let hero: NonNullable<SceneRecipeV1['hero']> | undefined;
    if (input.heroVenueId === venue.id) {
      const measured = input.assets.hero;
      if (!measured || measured.id !== city || measured.parts.length !== 1) throw new Error('Selected hero is missing or belongs to another city');
      const part = measured.parts[0]!;
      const depth = Math.min(6.5, d * .34);
      hero = { id: city, ...atCell(part, 0, -d / 2 + 1.25 + depth / 2, 0, Math.min(10, w * .4), depth, 9) };
    }
    const signs: SceneRecipeV1['signs'] = isRecipeSignText(signText) && input.screenText(signText, { contact: true, what: 'Recipe sign' }) === null ? [{ text: signText, position: [0, 3.1, -d / 2 + 0.7], width: 5, height: 0.6, ry: 0 }] : [];
    const recipe: SceneRecipeV1 = {
      schema: 'allworld-scene', version: 1, units: 'scene', city, venue: venue.id, kind: venue.scene.kind, region,
      mood: profile === 'meal' ? 'indoor' : 'outdoor', palette, footprint: { w, d }, entrance: [0, d / 2 - 2.5, Math.PI],
      shell: [{ position: [0, 1.8, -d / 2 + 0.2], size: [w - 1, 3.6, 0.4], ry: 0, colour: palette.wall }], props, signs, spots: spotPlan.spots,
      crowd: [], lamps: [], camera: { landscape: [rounded(w * .42 + seed[9]! % 3), rounded(Math.max(15, d * .72)), rounded(d * .78)], portrait: [rounded((seed[10]! % 5 - 2) * .35), rounded(Math.max(19, d * .95)), rounded(d * .94)] }, ...(hero ? { hero } : {}),
    };
    let accepted: SceneRecipeV1 | null = null;
    let rejection: unknown = null;
    try {
      const context = { city, venue: venueForRecipe(venue), assets: input.assets, screenText: input.screenText, hostScenery };
      const base = validateRecipe(recipe, context), crowd = groupedCrowd(base, seed, attempt);
      if (!crowd) rejection = new Error('No six-pair crowd allocation fits the validated walk grid');
      else {
        recipe.crowd = crowd;
        validateRecipe(recipe, context);
        accepted = recipe;
      }
    } catch (error) { rejection = error; }
    if (accepted) {
      input.onCandidateResult?.({ kind: 'accepted', city, venue: venue.id, candidate: attempt + 1 });
      return accepted;
    }
    last = rejection;
    const reason = rejection instanceof Error ? rejection.message : 'Candidate validation failed';
    input.onCandidateResult?.({ kind: 'rejected', city, venue: venue.id, candidate: attempt + 1, reason });
  }
  const reason = last instanceof Error ? `: ${last.message}` : '';
  throw new Error(`Exhausted bounded layout candidates for ${city}/${venue.id}${reason}`);
}

export function draftCityRecipes(input: LayoutInput): CityRecipesV2 {
  parseHostSceneryByVenue(input.hostScenery, input.brief.targetVenueIds);
  const targets = input.brief.venues.filter(venue => venue.scene.disposition === 'target-recipe');
  const pack: CityRecipesV2 = { schema: 'allworld-city-scenes', version: 2, city: input.brief.city.id, recipes: targets.map(venue => {
    const core = draftVenueRecipe(venue, input);
    return { ...core, version: 2, sky: factoryRecipeSky(core.mood), surfaceStyle: 'physical-atlas-v1' };
  }) };
  const context: CityRecipeContext = { city: pack.city, assets: input.assets, screenText: input.screenText, hostScenery: input.hostScenery, venues: targets.map(venueForRecipe) };
  parseCityRecipes(JSON.stringify(pack), context);
  return pack;
}
