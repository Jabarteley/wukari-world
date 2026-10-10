import assert from 'node:assert/strict'
import test from 'node:test'
import { firstPolygonProblem, signedArea } from './polygonCheck.ts'
import type { Poly } from './polygonCheck.ts'

const CITIES = ['cairo', 'kigali', 'kampala', 'rabat', 'lusaka', 'accra', 'nairobi', 'addis-ababa', 'abidjan', 'dakar', 'cape-town', 'algiers', 'cotonou', 'lome', 'yaounde']

// Water, land and the play area of every detailed foreign city are cut into triangles by the renderer. A ring that crosses itself or its neighbours,
// a repeated vertex, a hole outside its outer ring, a wrong winding or a number that is not finite draws black streaks across the map (Dakar and Algiers did).
for (const id of CITIES) test(`${id}: water, land and play-area polygons are valid, closed, wound the same way and finite`, async () => {
  const { GEOMETRY } = await import(`../${id}/geometry.ts`) as { GEOMETRY: { land: readonly Poly[]; playArea?: readonly Poly[] } }
  const { TERRAIN } = await import(`../${id}/terrain.ts`) as { TERRAIN: { water: readonly Poly[]; reachWater?: readonly Poly[] } }
  const layers: Record<string, readonly Poly[]> = { land: GEOMETRY.land, playArea: GEOMETRY.playArea ?? [], water: TERRAIN.water, reachWater: TERRAIN.reachWater ?? [] }
  for (const [name, polys] of Object.entries(layers)) {
    assert.equal(firstPolygonProblem(polys), null, `${id} ${name}`)
    for (const poly of polys) {
      assert.ok(signedArea(poly[0]!) > 0, `${id} ${name}: an outer ring runs clockwise`)
      for (const [lon, lat] of poly.flat()) assert.ok(Math.abs(lon) <= 180 && Math.abs(lat) <= 90, `${id} ${name}: a point is off the globe`)
    }
  }
  // Area sanity: the traced land is a city, not nothing and not a continent (square degrees; the box is a few tenths of a degree across).
  const landArea = GEOMETRY.land.reduce((sum, poly) => sum + Math.abs(signedArea(poly[0]!)) - poly.slice(1).reduce((s, hole) => s + Math.abs(signedArea(hole)), 0), 0)
  assert.ok(landArea > 0.001 && landArea < 1, `${id}: land area ${landArea} square degrees`)
})
