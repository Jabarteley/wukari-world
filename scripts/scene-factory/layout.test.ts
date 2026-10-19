import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { screenText } from '../../server/moderation/text.ts'
import { spotsOf } from '../../src/life.ts'
import { KIT_PROP_IDS, type MeasuredAsset, type MeasuredPart, type RecipeAssets, type RecipeContext, type SceneRecipeV1 } from '../../src/scene/recipe/contract.ts'
import { validateRecipe } from '../../src/scene/recipe/contract.ts'
import { AVATAR_RADIUS } from '../../src/scene/walk-grid.ts'
import { extractCityBrief, type CityBriefV1, type CityBriefVenueV1 } from './facts.ts'
import { PHYSICAL_MARKET_RECIPE_ASSETS } from './fixtures/physical-market-measurements.ts'
import { draftCityRecipes, draftVenueRecipe, layoutSeed, venueForRecipe } from './layout.ts'

const request = {
  accra: { cityId: 'accra', region: 'gulf-guinea' },
  tokyo: { cityId: 'tokyo', region: 'east-asia' },
  lagos: { cityId: 'lagos', region: 'yoruba-southwest' },
  kano: { cityId: 'kano', region: 'sahel-north' },
} as const
type CityId = keyof typeof request
const briefs = new Map<CityId, Promise<CityBriefV1>>()
function brief(city: CityId): Promise<CityBriefV1> {
  const cached = briefs.get(city) ?? extractCityBrief(request[city])
  briefs.set(city, cached)
  return cached
}

// Synthetic contract fixtures only. These measurements do not accept or describe production assets.
function measuredAssets(region: string, city: string): RecipeAssets {
  const parts: MeasuredPart[] = KIT_PROP_IDS.map((node, i) => ({
    node,
    triangles: 36 + i,
    bounds: { min: [-0.65 - i * 0.003, 0, -1.15 - i * 0.002], max: [0.95 + i * 0.002, 2.4 + i * 0.004, 0.72] },
  }))
  const kit: MeasuredAsset = {
    version: 1, kind: 'kit', id: region, sha256: 'a'.repeat(64), rawBytes: 20_000, brotliBytes: 8_000,
    triangles: parts.reduce((sum, part) => sum + part.triangles, 0), parts,
    atlas: { width: 1024, height: 1024, mimeType: 'image/webp', sha256: 'b'.repeat(64) },
  }
  const heroPart: MeasuredPart = { node: city, triangles: 180, bounds: { min: [-0.8, 0, -1.2], max: [1.1, 2.8, 0.7] } }
  const hero: MeasuredAsset = {
    version: 1, kind: 'hero', id: city, sha256: 'c'.repeat(64), rawBytes: 9_000, brotliBytes: 3_000,
    triangles: heroPart.triangles, parts: [heroPart],
  }
  return { kit, hero }
}

function inputFor(briefValue: CityBriefV1, changes: Partial<{ hostScenery: RecipeContext['hostScenery']; screenText: RecipeContext['screenText'] }> = {}) {
  return {
    brief: briefValue,
    assets: measuredAssets(briefValue.style.region, briefValue.city.id),
    screenText: changes.screenText ?? screenText,
    hostScenery: Object.fromEntries(briefValue.targetVenueIds.map(id => [id, changes.hostScenery ?? { triangles: 720, meshes: 3, lights: 2 }])),
  }
}

function sceneContext(briefValue: CityBriefV1, venue: CityBriefVenueV1, input: ReturnType<typeof inputFor>): RecipeContext {
  return { city: briefValue.city.id, venue: venueForRecipe(venue), assets: input.assets, screenText: input.screenText, hostScenery: input.hostScenery[venue.id]! }
}

function firstTarget(value: CityBriefV1): CityBriefVenueV1 {
  const found = value.venues.find(venue => value.targetVenueIds.includes(venue.id))
  assert.ok(found, `${value.city.id} has a recipe target`)
  return found
}

function withMirror(source: CityBriefV1, venue: CityBriefVenueV1, expected: -1 | 1): CityBriefV1 {
  for (let index = 0; index < 256; index++) {
    const contentSha256 = createHash('sha256').update(`layout-mirror/${index}`).digest('hex')
    const candidate = { ...source, digests: { ...source.digests, contentSha256 } }
    const seed = createHash('sha256').update(`${source.city.id}/${venue.id}/${layoutSeed(candidate).seedSha256}`).digest()
    if ((seed[11]! % 2 ? -1 : 1) === expected) return candidate
  }
  throw new Error('Could not construct both deterministic mirror fixtures')
}

function geometrySignature(recipe: Omit<SceneRecipeV1, 'version'>): string {
  return JSON.stringify({
    footprint: recipe.footprint, entrance: recipe.entrance,
    shell: recipe.shell.map(({ position, size, ry }) => ({ position, size, ry })),
    props: recipe.props.map(({ id, x, z, ry, s }) => ({ id, x, z, ry, s })),
    hero: recipe.hero ? { x: recipe.hero.x, z: recipe.hero.z, ry: recipe.hero.ry, s: recipe.hero.s } : null,
    signs: recipe.signs.map(({ position, width, height, ry }) => ({ position, width, height, ry })),
    spots: recipe.spots.map(({ x, z, ry, approach }) => ({ x, z, ry, ...(approach ? { approach } : {}) })),
    crowd: recipe.crowd, lamps: recipe.lamps.map(({ position, intensity, distance }) => ({ position, intensity, distance })), camera: recipe.camera,
  })
}

test('drafts a deterministic city pack from actual Accra targets', async () => {
  const city = await brief('accra'), input = inputFor(city)
  const first = draftCityRecipes(input), second = draftCityRecipes(input)
  assert.deepEqual(first, second)
  assert.equal(first.version, 2)
  assert.ok(first.recipes.every(recipe => recipe.version === 2))
  for (const recipe of first.recipes) assert.deepEqual(recipe.sky, recipe.mood === 'outdoor'
    ? { horizon: [1, 0.98, 0.95], zenith: [0.94, 0.98, 1] }
    : { horizon: [1, 1, 1], zenith: [1, 1, 1] })
  assert.deepEqual(first.recipes.map(recipe => recipe.venue), city.targetVenueIds)
  assert.ok(first.recipes.length > 0)
  assert.ok(first.recipes.every(recipe => recipe.city === 'accra' && recipe.region === 'gulf-guinea'))
})

test('offline candidate diagnostics preserve the recipe and propagate observer failures', async () => {
  const city = await brief('accra'), venue = firstTarget(city), input = inputFor(city)
  const baseline = draftVenueRecipe(venue, input), events: unknown[] = []
  const observed = draftVenueRecipe(venue, { ...input, onCandidateResult: result => events.push(result) })
  assert.deepEqual(observed, baseline)
  assert.deepEqual(events, [
    { kind: 'rejected', city: city.city.id, venue: venue.id, candidate: 1, reason: 'crowd[6]: exact target is blocked' },
    { kind: 'accepted', city: city.city.id, venue: venue.id, candidate: 2 },
  ])
  assert.throws(() => draftVenueRecipe(venue, {
    ...input,
    onCandidateResult: () => { throw new Error('observer failure') },
  }), /observer failure/)
})

test('Lagos authored precedence and home exclusion leave no recipe targets', async () => {
  const city = await brief('lagos')
  assert.deepEqual(city.targetVenueIds, [])
  assert.deepEqual(city.excludedVenueIds, ['home'])
  const pack = draftCityRecipes(inputFor(city))
  assert.ok(!pack.recipes.some(recipe => recipe.venue === 'home'))
  assert.deepEqual(pack.recipes, [])
})

test('recipes use each actual registered effective spot and the entrance yaw', async () => {
  for (const cityId of ['accra', 'tokyo', 'kano'] as const) {
    const city = await brief(cityId), input = inputFor(city), venue = firstTarget(city)
    const recipe = draftVenueRecipe(venue, input)
    const actualIds = spotsOf(venue.id, cityId).map(spot => spot.id).sort()
    assert.deepEqual(venue.effectiveSpots.map(spot => spot.id), actualIds, `${cityId}/${venue.id} brief targets`)
    assert.deepEqual(recipe.spots.map(spot => spot.key), actualIds, `${cityId}/${venue.id} recipe targets`)
    assert.equal(recipe.entrance[2], Math.PI)
    const checked = validateRecipe(recipe, sceneContext(city, venue, input))
    assert.equal(checked.evidence, 'recipe-validation-only')
    assert.equal(checked.estimate.triangles, input.hostScenery[venue.id]!.triangles + 12 * (1 + recipe.shell.length) + recipe.signs.length * 2 + checked.placements.reduce((n, placement) => n + placement.triangles, 0))
    assert.equal(checked.estimate.meshes, input.hostScenery[venue.id]!.meshes + 1 + checked.placements.length + recipe.signs.length)
    assert.equal(checked.estimate.lights, input.hostScenery[venue.id]!.lights + recipe.lamps.length)
    assert.ok(checked.placements.every(placement => placement.bounds.min[0] >= -recipe.footprint.w / 2 && placement.bounds.max[0] <= recipe.footprint.w / 2))
  }
})

test('actual profile layouts stay compact and place twelve residents in separated small groups', async () => {
  const dimensions = new Set<string>()
  for (const cityId of ['accra', 'tokyo', 'kano'] as const) {
    const city = await brief(cityId), input = inputFor(city)
    for (const venue of city.venues.filter(item => city.targetVenueIds.includes(item.id))) {
      const recipe = draftVenueRecipe(venue, input)
      assert.ok(recipe.footprint.w <= 32 && recipe.footprint.d <= 28, `${cityId}/${venue.id} compact footprint`)
      assert.equal(recipe.crowd.length, 12)
      assert.ok(new Set(recipe.crowd.map(([x]) => x)).size > 4, `${cityId}/${venue.id} crowd is not two lines`)
      assert.ok(new Set(recipe.crowd.map(([, z]) => z)).size > 4, `${cityId}/${venue.id} crowd has grouped depth`)
      for (let left = 0; left < recipe.crowd.length; left++) for (let right = left + 1; right < recipe.crowd.length; right++) {
        assert.ok(Math.hypot(recipe.crowd[left]![0] - recipe.crowd[right]![0], recipe.crowd[left]![1] - recipe.crowd[right]![1]) >= 2.4 - 1e-6, `${cityId}/${venue.id} crowd separation`)
      }
      const checked = validateRecipe(recipe, sceneContext(city, venue, input))
      assert.equal(checked.recipe.spots.length, venue.effectiveSpots.length)
      dimensions.add(`${recipe.footprint.w}x${recipe.footprint.d}`)
    }
  }
  assert.ok(dimensions.size >= 5, 'market, park, transit, meal and civic profiles do not collapse to one floor')
})

test('a larger effective-spot inventory remains exact and reachable', async () => {
  const source = await brief('accra'), original = firstTarget(source)
  const venue: CityBriefVenueV1 = { ...original, effectiveSpots: Array.from({ length: 24 }, (_, index) => ({ id: `activity-${index}`, name: `Activity ${index}`, source: 'system' as const })) }
  const city: CityBriefV1 = { ...source, venues: source.venues.map(item => item.id === venue.id ? venue : item), digests: { ...source.digests, inputSha256: 'd'.repeat(64) } }
  const input = inputFor(city), recipe = draftVenueRecipe(venue, input), checked = validateRecipe(recipe, sceneContext(city, venue, input))
  assert.deepEqual(recipe.spots.map(spot => spot.key), venue.effectiveSpots.map(spot => spot.id))
  assert.equal(checked.recipe.spots.length, 24)
  assert.ok(recipe.footprint.w <= 32 && recipe.footprint.d <= 28)
})

test('preserved and home venues cannot be drafted as recipes', async () => {
  const city = await brief('kano'), input = inputFor(city)
  const authored = city.venues.find(venue => venue.scene.disposition === 'preserve-authored')
  const home = city.venues.find(venue => venue.id === 'home')
  assert.ok(authored); assert.ok(home)
  assert.throws(() => draftVenueRecipe(authored, input), /Authored and home scenes cannot be recipe targets/)
  assert.throws(() => draftVenueRecipe(home, input), /Authored and home scenes cannot be recipe targets/)
})

test('a selected hero appears only at its explicitly selected target', async () => {
  const city = await brief('tokyo'), input = inputFor(city), selectedId = city.targetVenueIds[0]
  assert.ok(selectedId)
  const pack = draftCityRecipes({ ...input, heroVenueId: selectedId })
  assert.deepEqual(pack.recipes.filter(recipe => recipe.hero).map(recipe => recipe.venue), [selectedId])
  const selected = pack.recipes.find(recipe => recipe.venue === selectedId)
  assert.equal(selected?.hero?.id, 'tokyo'); assert.equal(selected?.props.length, 6); assert.equal(selected?.crowd.length, 12)
  const nonTarget = city.venues.find(venue => venue.id === 'home')
  assert.ok(nonTarget)
  assert.throws(() => draftVenueRecipe(firstTarget(city), { ...input, heroVenueId: nonTarget.id }), /Hero venue must be a recipe target/)
  const venue = firstTarget(city), recipes: SceneRecipeV1[] = []
  for (const mirror of [-1, 1] as const) {
    const mirrored = withMirror(city, venue, mirror), mirroredInput = inputFor(mirrored), recipe = draftVenueRecipe(venue, { ...mirroredInput, heroVenueId: venue.id })
    assert.equal(recipe.props.length, 6); assert.ok(recipe.hero); assert.equal(recipe.crowd.length, 12)
    validateRecipe(recipe, sceneContext(mirrored, venue, mirroredInput)); recipes.push(recipe)
  }
  assert.ok(recipes[0]!.props[0]!.x * recipes[1]!.props[0]!.x < 0)
})

test('completed physical market measurements reserve a disjoint resident lane', async () => {
  const city = await brief('accra'), venue = city.venues.find(item => item.name === 'Makola Market')
  assert.ok(venue && city.targetVenueIds.includes(venue.id))
  const input = inputFor(city, { hostScenery: { triangles: 580, meshes: 7, lights: 3 } })
  input.assets = PHYSICAL_MARKET_RECIPE_ASSETS
  const recipe = draftVenueRecipe(venue, { ...input, heroVenueId: venue.id }), checked = validateRecipe(recipe, sceneContext(city, venue, input))
  const hero = checked.placements.find(placement => placement.source === 'hero')
  assert.ok(hero); assert.equal(recipe.props.length, 3); assert.equal(recipe.crowd.length, 12); assert.ok(Math.abs(recipe.hero!.x) < 1 && recipe.hero!.z < 0)
  for (const [x, z] of recipe.crowd) {
    assert.ok(x < hero.footprint[0] - AVATAR_RADIUS || x > hero.footprint[2] + AVATAR_RADIUS || z < hero.footprint[1] - AVATAR_RADIUS || z > hero.footprint[3] + AVATAR_RADIUS)
  }
})

test('city references use the existing sign to identify a model without changing geometry or budgets', async () => {
  const city = await brief('tokyo'), venue = firstTarget(city), input = inputFor(city)
  const baseline = draftVenueRecipe(venue, { ...input, heroVenueId: venue.id })
  const labelled = draftVenueRecipe(venue, { ...input, heroVenueId: venue.id, heroReferenceLabel: 'Shakujii Park' })
  assert.equal(labelled.signs[0]?.text, 'Model: Shakujii Park')
  assert.equal(geometrySignature(labelled), geometrySignature(baseline))
  assert.deepEqual(validateRecipe(labelled, sceneContext(city, venue, input)).estimate, validateRecipe(baseline, sceneContext(city, venue, input)).estimate)
  const ordinary = draftVenueRecipe(venue, { ...input, heroReferenceLabel: 'Shakujii Park ponds' })
  assert.notEqual(ordinary.signs[0]?.text, labelled.signs[0]?.text)
  const long = draftVenueRecipe(venue, { ...input, heroVenueId: venue.id, heroReferenceLabel: 'A very long descriptive city landmark' })
  assert.ok(long.signs[0]?.text.startsWith('Model: '))
  assert.ok(long.signs[0] && long.signs[0].text.length <= 24)
  const unsafe = draftVenueRecipe(venue, { ...input, heroVenueId: venue.id, heroReferenceLabel: 'https://example.invalid' })
  assert.deepEqual(unsafe.signs, [])
})

test('recipe validation rejects a missing actual effective spot instead of accepting a partial route', async () => {
  const city = await brief('accra'), input = inputFor(city), venue = firstTarget(city)
  const recipe = draftVenueRecipe(venue, input)
  const broken: SceneRecipeV1 = { ...recipe, spots: recipe.spots.slice(1) }
  assert.throws(() => validateRecipe(broken, sceneContext(city, venue, input)), /all and only actual venue spot IDs/)
})

test('kit mismatch and host mesh limits stop layout generation', async () => {
  const city = await brief('accra'), venue = firstTarget(city), input = inputFor(city)
  const wrongKit = { ...input, assets: { ...input.assets, kit: { ...input.assets.kit, id: 'east-asia' } } }
  assert.throws(() => draftVenueRecipe(venue, wrongKit), /Kit does not match the explicitly selected art palette/)
  const crowdedHost = inputFor(city, { hostScenery: { triangles: 720, meshes: 11, lights: 2 } })
  assert.throws(() => draftVenueRecipe(venue, crowdedHost), /Host leaves too few scenery meshes/)
})

test('filtered venue signs stay out and unsafe manual signs fail the recipe contract', async () => {
  const city = await brief('accra'), venue = firstTarget(city)
  const blocked = inputFor(city, { screenText: () => ({ code: 'blocked', category: 'contact', reason: 'test filter' }) })
  const recipe = draftVenueRecipe(venue, blocked)
  assert.deepEqual(recipe.signs, [])
  const unsafe = { ...recipe, signs: [{ text: 'https://example.invalid', position: [0, 3.1, -recipe.footprint.d / 2 + 0.7] as [number, number, number], width: 5, height: 0.6, ry: 0 }] }
  assert.throws(() => validateRecipe(unsafe, sceneContext(city, venue, inputFor(city))), /unsafe sign text/)
})

test('actual Belize transit label is preserved while its unsupported sign stays out', async () => {
  const city = await extractCityBrief({ cityId: 'belize-city', region: 'americas-oceania' })
  const venue = city.venues.find(item => item.id === 'belize-city-transit')
  assert.ok(venue)
  assert.equal(venue.name, 'Belize City => Corozal Town')
  const input = inputFor(city), pack = draftCityRecipes(input)
  assert.deepEqual(pack.recipes.find(recipe => recipe.venue === venue.id)?.signs, [])
  assert.equal(venue.name, 'Belize City => Corozal Town')
  const invalid = draftVenueRecipe(venue, input)
  invalid.signs = [{ text: 'Belize City => Corozal T', position: [0, 3.1, -invalid.footprint.d / 2 + 0.7], width: 5, height: 0.6, ry: 0 }]
  assert.throws(() => validateRecipe(invalid, sceneContext(city, venue, input)), /invalid sign text/)
})

test('same-kind Accra venues differ in layout data without relying on venue labels', async () => {
  const city = await brief('accra'), input = inputFor(city), grouped = new Map<string, CityBriefVenueV1[]>()
  for (const venue of city.venues.filter(item => city.targetVenueIds.includes(item.id))) {
    const rows = grouped.get(venue.scene.kind) ?? []
    rows.push(venue); grouped.set(venue.scene.kind, rows)
  }
  const pair = [...grouped.values()].find(rows => rows.length >= 2)
  assert.ok(pair, 'Accra has two recipe targets with the same scene kind')
  const [left, right] = pair
  assert.ok(left); assert.ok(right)
  const a = draftVenueRecipe(left, input), b = draftVenueRecipe(right, input)
  assert.notEqual(geometrySignature(a), geometrySignature(b))
})

test('focused actual-city geometry signatures do not collide without identity, text, palette or material fields', async () => {
  const signatures = new Map<string, string>()
  for (const cityId of ['accra', 'tokyo', 'kano'] as const) {
    const city = await brief(cityId), input = inputFor(city)
    for (const recipe of draftCityRecipes(input).recipes) {
      const signature = geometrySignature(recipe), previous = signatures.get(signature)
      assert.equal(previous, undefined, `${cityId}/${recipe.venue} repeats ${previous}`)
      signatures.set(signature, `${cityId}/${recipe.venue}`)
    }
  }
  assert.ok(signatures.size > 40)
})


test('city layout requires exact venue support maps and allocates each venue independently', async () => {
  const city = await brief('accra'), input = inputFor(city), venue = firstTarget(city);
  assert.throws(() => draftCityRecipes({ ...input, hostScenery: {} }), /missing field/);
  assert.throws(() => draftCityRecipes({ ...input, hostScenery: { ...input.hostScenery, default: { triangles: 720, meshes: 3, lights: 2 } } }), /unknown field/);
  input.hostScenery[venue.id] = { triangles: 434, meshes: 7, lights: 3 };
  const recipes = draftCityRecipes(input).recipes;
  assert.equal(recipes.find(r => r.venue === venue.id)!.props.length, 4);
  assert.ok(recipes.filter(r => r.venue !== venue.id).every(r => r.props.length === 6));
});


test('a broad reference model leaves every actual meal activity reachable', async () => {
  const city = await extractCityBrief({ cityId: 'abeokuta', region: 'yoruba-southwest' })
  const venue = city.venues.find(item => item.id === 'kuto-kitchen')
  assert.ok(venue && city.targetVenueIds.includes(venue.id))
  const input = inputFor(city, { hostScenery: { triangles: 1264, meshes: 7, lights: 3 } })
  input.assets.hero!.parts[0]!.bounds = { min: [-3.7, 0, -2.815], max: [3.7, 2.463, 2.815] }
  const recipe = draftVenueRecipe(venue, { ...input, heroVenueId: venue.id })
  const checked = validateRecipe(recipe, sceneContext(city, venue, input))
  const hero = checked.placements.find(placement => placement.source === 'hero')
  assert.ok(hero)
  assert.deepEqual(recipe.spots.map(spot => spot.key), venue.effectiveSpots.map(spot => spot.id))
  for (const spot of recipe.spots) assert.ok(spot.z > hero.footprint[3] + AVATAR_RADIUS)
  assert.equal(recipe.crowd.length, 12)
})


test('retained art seeds keep layouts stable across source provenance changes; semantic changes select fresh seeds', async () => {
  const city = await brief('accra'), retained = layoutSeed(city)
  assert.equal(retained.kind, 'retained-v1')
  const repinned = { ...city, digests: { ...city.digests, inputSha256: 'f'.repeat(64) }, provenance: { ...city.provenance, files: city.provenance.files.map(file => ({ ...file, sha256: 'e'.repeat(64) })) } }
  assert.deepEqual(layoutSeed(repinned), retained)
  assert.deepEqual(draftCityRecipes(inputFor(repinned)), draftCityRecipes(inputFor(city)))
  const revised = { ...repinned, digests: { ...repinned.digests, contentSha256: 'd'.repeat(64) } }
  const fresh = layoutSeed(revised)
  assert.equal(fresh.kind, 'semantic-v1')
  assert.notEqual(fresh.seedSha256, retained.seedSha256)
  assert.deepEqual(layoutSeed({ ...revised, digests: { ...revised.digests, inputSha256: 'a'.repeat(64) } }), fresh)
  assert.notDeepEqual(draftCityRecipes(inputFor(revised)), draftCityRecipes(inputFor(city)))
  const unknown = { ...city, city: { ...city.city, id: 'new-art-city' } }
  assert.equal(layoutSeed(unknown).kind, 'semantic-v1')
  assert.deepEqual(layoutSeed(unknown), layoutSeed({ ...unknown, digests: { ...unknown.digests, inputSha256: 'b'.repeat(64) } }))
})
