import assert from 'node:assert/strict'
import test from 'node:test'
import { loadCityContent } from '../game/cities/registry.ts'
import { lagosCity } from '../game/cities/lagos/index.ts'
import { createKit } from '../scene/kit.ts'
import { buildCity, CITY_TRIANGLE_BUDGET } from './city-build.ts'
import { buildNetwork } from './roads.ts'

test('Lagos streets carry lamps and markings and still fit the city triangle budget', async () => {
  await loadCityContent('lagos')
  const pack = await (await lagosCity.loadMap()).loadScene(), kit = createKit(), city = buildCity(kit, pack, buildNetwork(pack))
  try {
    const lamps = city.group.getObjectByName('street-lamps') as { count: number } | undefined
    assert.ok(lamps && lamps.count > 20, 'lamps stand along the main roads')
    assert.ok(city.triangles <= CITY_TRIANGLE_BUDGET, `${city.triangles} triangles`)
  } finally {
    city.dispose()
    kit.dispose()
  }
})
