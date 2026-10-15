import assert from 'node:assert/strict'
import test from 'node:test'
import { loadCityContent } from '../game/cities/registry.ts'
import { loadAllCityScenes } from './city-scenes.ts'
import { createKit } from './kit.ts'
import { buildVenueScene } from './venue-scenes.ts'
import { sceneVenue } from '../venue-world.ts'
import type { SceneVenue } from './types.ts'

await loadCityContent('lagos')
await loadCityContent('abuja')
await loadAllCityScenes()

const stops = [
  ['lagos', 'canopy-walk', 'wildlife-stop', ['canopy-listen-birds', 'canopy-observe-habitat']],
  ['abuja', 'millennium-park', 'garden-bench', ['fct-millennium-sketch', 'fct-millennium-shade']],
  ['abuja', 'jabi-lake-park', 'picnic-lawn', ['fct-jabi-lawn-rest', 'fct-jabi-sketch']],
] as const

for (const [cityId, venueId, spotId, activityIds] of stops) {
  test(`${cityId}/${venueId}/${spotId}: distinct, reachable beta activities`, async () => {
    const content = await loadCityContent(cityId)
    const venue = content.venues.find(v => v.id === venueId)!
    const spot = venue.definition.spots[spotId]!
    assert.ok(spot)
    assert.deepEqual(spot.activities.map(a => a.id), [...activityIds])
    const ids = content.venues.flatMap(v => Object.values(v.definition.spots).flatMap(s => s.activities.map(a => a.id)))
    for (const activity of spot.activities) {
      assert.equal(ids.filter(id => id === activity.id).length, 1)
      assert.equal(activity.beta, true)
      assert.equal(activity.cost, 0)
      assert.ok(activity.duration > 0)
      assert.equal(activity.reward, undefined)
    }
    const kit = createKit()
    const entry = buildVenueScene(kit, sceneVenue(venueId, cityId) as unknown as SceneVenue, cityId)
    try {
      const { grid, entrance } = entry.walk
      const target = entry.walk.spots().find(s => s.id === spotId)
      assert.ok(target && grid && entrance)
      const at = grid.nearest(target.x, target.z)
      assert.ok(at)
      assert.ok(Math.hypot(at.x - target.x, at.z - target.z) < 1.5)
      assert.ok(grid.path(entrance.x, entrance.z, at.x, at.z)?.length)
      assert.ok(grid.path(at.x, at.z, entrance.x, entrance.z)?.length)
      const others = entry.walk.spots().filter(s => s.id !== spotId)
      assert.ok(others.some(s => Math.hypot(s.x - target.x, s.z - target.z) > 2), 'new stop is spatially separate from an existing stop')
    } finally { entry.dispose(); kit.dispose() }
  })
}
