import '../../src/scene/recipe/node-test-fixture.ts'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import test from 'node:test'
import { screenText } from '../../server/moderation/text.ts'
import { cityContent, loadCityContent } from '../../src/game/cities/registry.ts'
import { spotsOf } from '../../src/life.ts'
import { createKit } from '../../src/scene/kit.ts'
import { loadCityScenes } from '../../src/scene/city-scenes.ts'
import { parseCityRecipes } from '../../src/scene/recipe/contract.ts'
import { fixtureFetch, fixturePack } from '../../src/scene/recipe/runtime.test-support.ts'
import { awaitNativeSceneGeometry } from '../../src/testing/nativeGeometry.test-fixture.ts'
import { buildVenueScene, SPOT_BEHIND, SPOT_FRONT, SPOT_SIDE } from '../../src/scene/venue-scenes.ts'
import type { SceneEntry, SceneVenue } from '../../src/scene/types.ts'
import { sceneVenue } from '../../src/venue-world.ts'
import { tablesAt } from '../../src/tables/city-places.ts'
import { preloadLooks } from '../../src/scene/character-lab/native-body.ts'
import { DEFAULT_LOOK } from '../../src/game/content/traits.ts'
import {
  clearOfCameraFacingSpotMarkers,
  LAYOUT_SPOT_BEHIND,
  LAYOUT_SPOT_FRONT,
  LAYOUT_SPOT_SIDE,
} from './layout.ts'

const fixtureUrl = new URL('../../src/scene/recipe/runtime.test-support.ts', import.meta.url).href
const registryUrl = new URL('../../src/scene/recipe/registry.generated.ts', import.meta.url).href
const hook = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === './registry.generated.ts' && context.parentURL?.endsWith('/recipe/load.ts')) return { url: registryUrl, shortCircuit: true }
    return next(specifier, context)
  },
  load(url, context, next) {
    if (url === registryUrl) return { format: 'module', shortCircuit: true, source: `import { fixturePack } from ${JSON.stringify(fixtureUrl)}; export const RECIPE_CITY_LOADERS = {accra: async () => ({default: await fixturePack()})};` }
    return next(url, context)
  },
})

test('factory crowd positions survive the normal host marker-clearance path unchanged', async t => {
  t.after(() => hook.deregister())
  assert.deepEqual(
    [LAYOUT_SPOT_BEHIND, LAYOUT_SPOT_FRONT, LAYOUT_SPOT_SIDE],
    [SPOT_BEHIND, SPOT_FRONT, SPOT_SIDE],
    'the pure compiler remains pinned to the host marker rectangle',
  )
  const v7Spots = [
    { key: 'aisle', x: -1.35, z: -1.35 },
    { key: 'people', x: 1.35, z: -1.35 },
    { key: 'work', x: -1.35, z: 1.35 },
  ] as const
  const v7Camera = [10.92, 15.84, 17.16] as const
  const shifted = [
    { id: 'recipe-resident-8', x: -0.271359, z: 3.216699, marker: 'work' },
    { id: 'recipe-resident-9', x: 0.383123, z: 0.803889, marker: 'aisle' },
  ] as const
  for (const point of shifted) {
    const marker = v7Spots.find(spot => spot.key === point.marker)
    assert.ok(marker)
    assert.ok(Math.hypot(point.x - marker.x, point.z - marker.z) > LAYOUT_SPOT_SIDE, `${point.id} passed the V7 radial-only gate`)
    assert.equal(clearOfCameraFacingSpotMarkers(point.x, point.z, v7Spots, v7Camera), false, `${point.id} is inside the frozen V7 host marker rectangle`)
  }

  const files = await fixtureFetch()
  t.after(() => files.restore())
  const kit = createKit()
  let entry: SceneEntry | undefined
  t.after(() => { entry?.dispose(); kit.dispose() })
  const pack = await fixturePack()
  await loadCityContent('accra')
  const venue = sceneVenue('accra-market-game', 'accra') as SceneVenue | null
  assert.ok(venue)
  const targets = cityContent('accra').venues.filter(row => pack.metadata.targetVenueIds.includes(row.id)).map(row => ({
    ...row.definition,
    scene: { ...row.definition.scene, spots: spotsOf(row.id, 'accra').map(spot => ({ id: spot.id, label: spot.label })) },
  }))
  const parsed = parseCityRecipes(pack.text, {
    city: 'accra',
    venues: targets,
    assets: { kit: pack.metadata.assets.kit.measurement, hero: pack.metadata.assets.hero!.measurement },
    hostScenery: pack.metadata.hostScenery,
    screenText,
  })
  const checked = parsed.recipes.find(row => row.recipe.venue === venue.id)
  assert.ok(checked)

  assert.ok(checked.recipe.crowd.every(([x, z]) => clearOfCameraFacingSpotMarkers(x, z, checked.recipe.spots, checked.recipe.camera.landscape)))

  await loadCityScenes('accra')
  entry = buildVenueScene(kit, venue, 'accra')
  const people = checked.recipe.crowd.map((_, index) => ({ id: `recipe-resident-${index}`, name: `Resident ${index}`, kind: 'player', look: DEFAULT_LOOK, seed: `marker-resident-${index}` }))
  await preloadLooks(people)
  entry.setCrowd(people)
  const native = await awaitNativeSceneGeometry(entry, 'durable fixture marker placement')
  assert.deepEqual(native.errors, [])
  assert.equal(native.pendingCharacters, 0)
  const placed = new Map(entry.walk.people().map(person => [person.id, person]))
  assert.equal(placed.size, 12)
  for (const [index, [x, z]] of checked.recipe.crowd.entries()) {
    const person = placed.get(`recipe-resident-${index}`)
    assert.ok(person)
    assert.deepEqual([person.x, person.z], [x, z], `resident ${index} remains at the declared position`)
  }
  for (const spot of checked.recipe.spots) assert.deepEqual([entry.anchors[spot.key]?.x, entry.anchors[spot.key]?.z], [spot.x, spot.z])
  assert.deepEqual(entry.walk.things().map(item => item.table).sort(), tablesAt('accra', venue.id!).map(item => item.id).sort())
})
