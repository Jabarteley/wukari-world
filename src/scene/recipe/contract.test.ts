import assert from 'node:assert/strict';
import test from 'node:test';
import { screenText } from '../../../server/moderation/text.ts';
import { createWalkGrid } from '../walk-grid.ts';
import { METRES_TO_SCENE, RECIPE_LIMITS, REQUIRES_SCENE_PROOF, parseCityRecipes, parseHostSceneryByVenue, validateRecipe } from './contract.ts';
import type { CityRecipesV1, MeasuredAsset, RecipeContext, SceneRecipeV1 } from './contract.ts';

function fixture(): { recipe: SceneRecipeV1; context: RecipeContext } {
  const kit: MeasuredAsset = { version: 1, kind: 'kit', id: 'gulf-guinea', sha256: 'a'.repeat(64), rawBytes: 2000, brotliBytes: 1000,
    triangles: 48, parts: [
      { node: 'bench', triangles: 24, bounds: { min: [-1, 0, -2], max: [1, 3, 2] } },
      { node: 'bollard', triangles: 24, bounds: { min: [-0.1, 0, -0.1], max: [0.1, 1, 0.1] } },
    ], atlas: { width: 1024, height: 1024, mimeType: 'image/webp', sha256: 'b'.repeat(64) } };
  const hero: MeasuredAsset = { version: 1, kind: 'hero', id: 'accra', sha256: 'c'.repeat(64), rawBytes: 2000, brotliBytes: 1000,
    triangles: 100, parts: [{ node: 'accra', triangles: 100, bounds: { min: [-1, 0, -1], max: [1, 2, 1] } }] };
  return {
    recipe: { schema: 'allworld-scene', version: 1, units: 'scene', city: 'accra', venue: 'market', kind: 'market', region: 'gulf-guinea', mood: 'outdoor',
      palette: { ground: '#aaaaaa', wall: '#bbbbbb', roof: '#cccccc', accent: '#dddddd', trim: '#eeeeee' }, footprint: { w: 32, d: 24 },
      entrance: [0, 9, Math.PI], shell: [], props: [{ id: 'bench', x: 4, z: -3, ry: Math.PI / 2, s: 0.5 }],
      signs: [], spots: [{ key: 'buy', x: 0, z: 4, ry: 0 }], crowd: [[-5, 4, 0]], lamps: [], camera: { landscape: [18, 20, 24], portrait: [20, 24, 30] } },
    context: { city: 'accra', venue: { id: 'market', scene: { kind: 'market' }, spots: { buy: { id: 'buy' } } },
      assets: { kit, hero }, screenText, hostScenery: { triangles: 100, meshes: 2, lights: 3 } },
  };
}
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
function pack(recipe: SceneRecipeV1): CityRecipesV1 { return { schema: 'allworld-city-scenes', version: 1, city: recipe.city, recipes: [recipe] }; }
function invalid(change: (recipe: SceneRecipeV1, context: RecipeContext) => void, pattern: RegExp) {
  const { recipe, context } = fixture(); change(recipe, context); assert.throws(() => validateRecipe(recipe, context), pattern);
}

test('measured asymmetric bounds rotate and scale once; placements and collision share the same frame', () => {
  const { recipe, context } = fixture(), before = JSON.stringify(context.assets);
  const checked = validateRecipe(recipe, context), part = checked.placements[0]!;
  close(METRES_TO_SCENE, 1.4); close(part.scale, 0.7);
  [2.6, 0, -3.7].forEach((n, i) => close(part.bounds.min[i]!, n));
  [5.4, 2.1, -2.3].forEach((n, i) => close(part.bounds.max[i]!, n));
  assert.deepEqual(part.footprint, [part.bounds.min[0], part.bounds.min[2], part.bounds.max[0], part.bounds.max[2]]);
  assert.ok(checked.walk.block?.some(b => JSON.stringify(b) === JSON.stringify(part.footprint)));
  assert.equal(JSON.stringify(context.assets), before);
  assert.deepEqual(checked.estimate, { triangles: 136, meshes: 4, lights: 3 });
  assert.equal(checked.evidence, 'recipe-validation-only');
  assert.ok(REQUIRES_SCENE_PROOF.some(text => text.includes('resolved load promise')));
});

test('shell uses scene units, hero uses measured metres and exact city node', () => {
  const { recipe, context } = fixture();
  recipe.shell.push({ position: [-5, 1, -3], size: [2, 2, 1], ry: Math.PI / 2, colour: '#eeeeee' });
  recipe.hero = { id: 'accra', x: 10, z: -5, ry: 0, s: 1 };
  const result = validateRecipe(recipe, context), box = result.solids[0]!, hero = result.placements[1]!;
  close(box.min[0], -5.5); close(box.max[2], -2); close(box.max[1], 2);
  close(hero.bounds.max[1], 2.8); assert.equal(hero.assetSha256, 'c'.repeat(64));
  invalid(r => { r.hero = { id: 'paris', x: 10, z: -5, ry: 0, s: 1 }; }, /hero must belong/);
});

test('textured heroes require the selected regional atlas without changing geometry or byte caps', () => {
  const { recipe, context } = fixture();
  context.assets.hero!.atlas = { ...context.assets.kit.atlas! };
  recipe.hero = { id: 'accra', x: 10, z: -5, ry: 0, s: 1 };
  assert.equal(validateRecipe(recipe, context).placements.at(-1)?.assetSha256, context.assets.hero!.sha256);
  invalid((_r, c) => { c.assets.hero!.atlas = { ...c.assets.kit.atlas!, sha256: 'd'.repeat(64) }; }, /share the selected regional atlas/);
  invalid((_r, c) => { c.assets.hero!.atlas = { ...c.assets.kit.atlas!, width: 512 as 1024 }; }, /measured 1K WebP/);
  invalid((_r, c) => { c.assets.hero!.atlas = { ...c.assets.kit.atlas! }; c.assets.hero!.brotliBytes = 60_001; }, /number out of range/);
});

test('overlapping conservative footprints and transformed bounds outside floor fail', () => {
  invalid(r => { r.props.push({ ...r.props[0]! }); }, /overlapping blocking/);
  invalid(r => { r.shell.push({ position: [4, 1, -3], size: [1, 2, 1], ry: 0, colour: '#ffffff' }); }, /overlapping blocking/);
  invalid(r => { r.props[0]!.x = 15; }, /outside footprint/);
  invalid(r => { r.props[0]!.s = 10; }, /outside footprint/);
});

test('blocked exact targets fail even though the existing grid can snap them to a free location', () => {
  const { recipe, context } = fixture(), result = validateRecipe(recipe, context), grid = createWalkGrid(result.walk);
  assert.equal(grid.free(4, -3), false); assert.notEqual(grid.nearest(4, -3), null);
  assert.ok(grid.path(0, 9, 4, -3));
  invalid(r => { r.spots[0]!.x = 4; r.spots[0]!.z = -3; }, /exact target is blocked/);
  invalid(r => { r.entrance = [4, -3, 0]; }, /exact target is blocked/);
  invalid(r => { r.spots[0]!.approach = [4, -3]; }, /exact target is blocked/);
  invalid(r => { r.crowd = [[4, -3, 0]]; }, /exact target is blocked/);
});

test('free but disconnected exact target fails instead of accepting partial path', () => {
  invalid(r => {
    r.props = []; r.shell = [{ position: [0, 1, 0], size: [32, 2, 0.4], ry: 0, colour: '#eeeeee' }];
    r.spots[0]!.z = -4;
  }, /exact target is unreachable/);
});

test('floor edges and partial grid cells cannot supply target support', () => {
  invalid(r => { r.footprint.w = 31.9; r.spots[0]!.x = 15.9; }, /target outside supported footprint/);
  invalid(r => { r.entrance = [0, 12, 0]; }, /target outside supported footprint/);
});

test('requires exactly the host-selected venue spot IDs including scene override semantics', () => {
  invalid(r => { r.spots = []; }, /all and only actual venue spot IDs/);
  invalid(r => { r.spots.push({ ...r.spots[0]! }); }, /all and only actual venue spot IDs/);
  invalid(r => { r.spots[0]!.key = 'invented'; }, /all and only actual venue spot IDs/);
  const { recipe, context } = fixture(); context.venue.scene!.spots = [{ id: 'work' }]; recipe.spots[0]!.key = 'work';
  assert.equal(validateRecipe(recipe, context).recipe.spots[0]!.key, 'work');
});

test('safe signs use existing portable text filter with public contact protection', () => {
  const sign = { text: 'Fresh produce', position: [0, 3.1, -8] as [number, number, number], width: 2, height: 0.5, ry: 0 };
  const { recipe, context } = fixture(); recipe.signs = [sign];
  let options: unknown;
  context.screenText = (text, passed) => { options = passed; return screenText(text, passed); };
  assert.equal(validateRecipe(recipe, context).recipe.signs[0]!.text, sign.text);
  assert.deepEqual(options, { contact: true, what: 'Recipe sign' });
  for (const text of ['https://example.com', 'WhatsApp: marketdesk', 'Call 08012345678']) {
    invalid(r => { r.signs = [{ ...sign, text }]; }, /unsafe sign text/);
  }
  invalid(r => { r.signs = [{ ...sign, text: '<img>' }]; }, /invalid sign text/);
  invalid(r => { r.signs = [{ ...sign, position: [0, 1, -8] }]; }, /above avatar clearance/);
  invalid((r, c) => { r.signs = [sign]; c.screenText = (() => undefined) as unknown as typeof screenText; }, /unsafe sign text/);
});

test('unknown fields, versions, external URLs, raw colliders and malformed data fail closed', () => {
  const mutations: Array<(r: SceneRecipeV1) => void> = [
    r => Object.assign(r, { version: 2 }), r => Object.assign(r, { units: 'metres' }),
    r => Object.assign(r, { url: 'https://example.com/model.glb' }), r => Object.assign(r, { block: [[0, 0, 1, 1]] }),
    r => Object.assign(r.props[0]!, { footprint: [0, 0, 1, 1] }), r => Object.assign(r.palette, { extra: '#ffffff' }),
    r => Object.assign(r.camera, { bounds: [0, 0, 1, 1] }), r => Object.assign(r.props[0]!, { id: 'unknown-model' }),
    r => { r.props[0]!.s = NaN; }, r => { r.props[0]!.s = 0; }, r => { r.props[0]!.s = -1; },
    r => { r.props[0]!.x = Infinity; }, r => { r.camera.portrait[1] = NaN; },
    r => { r.spots[0]!.x = Infinity; }, r => { r.footprint.w = NaN; },
    r => { r.props = new Array(1); }, r => { Object.defineProperty(r, 'venue', { get: () => 'market', enumerable: true }); },
  ];
  for (const mutate of mutations) invalid(mutate, /unknown|unsupported|range|dense|data field/);
});

test('asset report metadata is mandatory and malformed measurements or byte caps fail', () => {
  invalid((r, c) => { r.props[0]!.id = 'canopy'; }, /unapproved or unmeasured/);
  invalid((r, c) => { c.assets.kit.parts[0]!.bounds.min[0] = 5; }, /empty or inverted bounds/);
  invalid((r, c) => { c.assets.kit.parts[0]!.bounds.max[1] = Infinity; }, /number out of range/);
  invalid((r, c) => { c.assets.kit.parts[0]!.triangles = 1501; }, /number out of range/);
  invalid((r, c) => { c.assets.kit.triangles++; }, /triangle total mismatch/);
  invalid((r, c) => { c.assets.kit.brotliBytes = 300001; }, /number out of range/);
  invalid((r, c) => { c.assets.hero!.rawBytes = 60001; }, /number out of range/);
  invalid((r, c) => { c.assets.kit.sha256 = ''; }, /measured hash/);
  invalid((r, c) => { Object.assign(c.assets.kit.atlas!, { width: 512 }); }, /1K WebP/);
});

test('counts each placed instance and includes explicit host scenery and light allowance', () => {
  invalid((r, c) => { c.hostScenery.triangles = 14980; }, /estimate.triangles/);
  invalid((r, c) => { c.hostScenery.meshes = 12; }, /estimate.meshes/);
  invalid((r, c) => {
    r.lamps = [0, 1].map(x => ({ position: [x, 3, -9], colour: '#ffffff', intensity: 1, distance: 10 }));
  }, /estimate.lights/);
  const { recipe, context } = fixture();
  recipe.props = Array.from({ length: 5 }, (_, i) => ({ id: 'bollard', x: -10 + i * 2, z: -4, ry: 0, s: 1 }));
  assert.equal(validateRecipe(recipe, context).estimate.triangles, 100 + 12 + 5 * 24);
});

test('city parser validates aggregate UTF-8 bytes, strict wrapper and venue uniqueness', () => {
  const { recipe, context } = fixture(), cityContext = { ...context, venues: [context.venue], hostScenery: { market: context.hostScenery } };
  const json = JSON.stringify(pack(recipe));
  const result = parseCityRecipes(json, cityContext);
  assert.equal(result.utf8Bytes, Buffer.byteLength(json)); assert.equal(result.recipes.length, 1);
  assert.throws(() => parseCityRecipes(json + ' '.repeat(RECIPE_LIMITS.cityBytes), cityContext), /UTF-8 byte budget/);
  assert.throws(() => parseCityRecipes(JSON.stringify({ ...pack(recipe), version: 2 }), cityContext), /unsupported/);
  assert.throws(() => parseCityRecipes(JSON.stringify({ ...pack(recipe), provider: 'remote' }), cityContext), /unknown field/);
  assert.throws(() => parseCityRecipes(JSON.stringify({ ...pack(recipe), recipes: [recipe, recipe] }), cityContext), /duplicate venue/);
  assert.throws(() => parseCityRecipes(json, { ...cityContext, venues: [], hostScenery: {} }), /unknown or duplicate venue/);
  const multibyteRecipe: SceneRecipeV1 = { ...recipe, signs: [{ text: '石'.repeat(24), position: [0, 3.1, -8], width: 2, height: 0.5, ry: 0 }] };
  assert.equal(validateRecipe(multibyteRecipe, context).recipe.signs[0]!.text.length, 24);
  const count = Math.floor(RECIPE_LIMITS.cityBytes / Buffer.byteLength(JSON.stringify(multibyteRecipe))) + 1;
  const many = Array.from({ length: count }, (_, i): SceneRecipeV1 => ({ ...multibyteRecipe, venue: `market-${i}` }));
  const multi = JSON.stringify({ ...pack(recipe), recipes: many });
  assert.ok(multi.length < RECIPE_LIMITS.cityBytes && Buffer.byteLength(multi) > RECIPE_LIMITS.cityBytes);
  assert.throws(() => parseCityRecipes(multi, cityContext), /UTF-8 byte budget/);
});


test('declared prop, sign, sign-text and crowd caps reject unsupported increases', () => {
  assert.deepEqual([RECIPE_LIMITS.props, RECIPE_LIMITS.signs, RECIPE_LIMITS.signCharacters, RECIPE_LIMITS.crowd], [40, 4, 24, 12]);
  invalid(r => { r.props = Array.from({ length: 41 }, () => ({ ...r.props[0]! })); }, /props: expected array of at most 40/);
  const sign = { text: 'Fresh produce', position: [0, 3.1, -8] as [number, number, number], width: 2, height: 0.5, ry: 0 };
  invalid(r => { r.signs = Array.from({ length: 5 }, () => ({ ...sign })); }, /signs: expected array of at most 4/);
  invalid(r => { r.signs = [{ ...sign, text: 'a'.repeat(25) }]; }, /invalid sign text/);
  invalid(r => { r.crowd = Array.from({ length: 13 }, () => [-5, 4, 0]); }, /crowd: expected array of at most 12/);
  const { recipe, context } = fixture();
  recipe.signs = Array.from({ length: 4 }, () => ({ ...sign, text: 'a'.repeat(24) }));
  recipe.crowd = Array.from({ length: 12 }, () => [-5, 4, 0]);
  const result = validateRecipe(recipe, context);
  assert.equal(result.recipe.signs.length, 4); assert.equal(result.recipe.crowd.length, 12);
});

test('city parser covers exactly all supplied non-authored target venues', () => {
  const { recipe, context } = fixture();
  const otherVenue = { ...context.venue, id: 'market-other' };
  const cityContext = { ...context, venues: [context.venue, otherVenue], hostScenery: { market: context.hostScenery, 'market-other': context.hostScenery } };
  const empty = JSON.stringify({ ...pack(recipe), recipes: [] });
  assert.throws(() => parseCityRecipes(empty, cityContext), /all and only target venue IDs/);
  assert.throws(() => parseCityRecipes(JSON.stringify(pack(recipe)), cityContext), /all and only target venue IDs/);
  const complete = JSON.stringify({ ...pack(recipe), recipes: [recipe, { ...recipe, venue: otherVenue.id }] });
  assert.equal(parseCityRecipes(complete, cityContext).recipes.length, 2);
  assert.equal(parseCityRecipes(empty, { ...cityContext, venues: [], hostScenery: {} }).recipes.length, 0);
});


test('host measurements require every exact venue, reject defaults and freeze copied numeric estimates', () => {
  const estimate = { triangles: 434, meshes: 5, lights: 3 };
  const parsed = parseHostSceneryByVenue({ market: estimate }, ['market']);
  assert.deepEqual(parsed, { market: estimate }); assert.notEqual(parsed.market, estimate);
  assert.ok(Object.isFrozen(parsed) && Object.isFrozen(parsed.market));
  assert.deepEqual(parseHostSceneryByVenue({}, []), {});
  for (const input of [estimate, {}, { market: estimate, default: estimate }, { market: estimate, home: estimate }])
    assert.throws(() => parseHostSceneryByVenue(input, ['market']), /hostScenery/);
  assert.throws(() => parseHostSceneryByVenue({ market: estimate }, ['market', 'market']), /duplicate/);
  for (const bad of [{ ...estimate, triangles: -1 }, { ...estimate, meshes: 14 }, { ...estimate, lights: 5 }, { ...estimate, triangles: 1.1 }, { ...estimate, note: 'default' }])
    assert.throws(() => parseHostSceneryByVenue({ market: bad }, ['market']), /hostScenery/);
  const accessor = Object.defineProperty({}, 'market', { enumerable: true, get() { throw new Error('must not execute'); } });
  assert.throws(() => parseHostSceneryByVenue(accessor, ['market']), /expected JSON data field/);
  const { recipe, context } = fixture();
  const value = parseCityRecipes(JSON.stringify({ ...pack(recipe), recipes: [recipe, { ...recipe, venue: 'second' }] }), {
    ...context, venues: [context.venue, { ...context.venue, id: 'second' }], hostScenery: { market: estimate, second: { ...estimate, triangles: 718 } },
  });
  assert.equal(value.recipes[1]!.estimate.triangles - value.recipes[0]!.estimate.triangles, 284);
});
