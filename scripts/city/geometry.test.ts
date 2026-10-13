import assert from 'node:assert/strict'
import test from 'node:test'
import { OPEN_CITY_ENCLAVES, assertNoOpenCityGeometryOverlap, isDeclaredEnclave, polygonsContainedIn } from './geometry.ts'
import type { Polygon } from '../geo/nigeria-boundaries.ts'

const square = (minLon: number, minLat: number, size: number): Polygon => [[[minLon, minLat], [minLon + size, minLat], [minLon + size, minLat + size], [minLon, minLat + size], [minLon, minLat]]]
const outer = [square(0, 0, 10)]
const inside = [square(4, 4, 1)]
const straddling = [square(8, 8, 4)]
const far = [square(20, 20, 1)]

test('every declared enclave names a distinct outer and inner city and a written reason', () => {
  assert.ok(OPEN_CITY_ENCLAVES.length > 0)
  for (const [outerId, innerId, reason] of OPEN_CITY_ENCLAVES) {
    assert.notEqual(outerId, innerId)
    assert.ok(reason.length > 20, `${outerId}/${innerId}: the exception needs a written reason`)
  }
  assert.ok(OPEN_CITY_ENCLAVES.some(([o, i]) => o === 'rome' && i === 'vatican-city'))
})

test('polygonsContainedIn accepts only a wholly contained polygon', () => {
  assert.equal(polygonsContainedIn(inside, outer), true)
  assert.equal(polygonsContainedIn(straddling, outer), false)
  assert.equal(polygonsContainedIn(far, outer), false)
  assert.equal(polygonsContainedIn(outer, inside), false)
  assert.equal(polygonsContainedIn([], outer), false)
  // A polygon that lies in the outer polygon's hole is not contained.
  const donut: Polygon = [square(0, 0, 10)[0]!, square(3, 3, 4)[0]!]
  assert.equal(polygonsContainedIn(inside, [donut]), false)
  assert.equal(polygonsContainedIn([square(1, 1, 1)], [donut]), true)
})

test('a declared enclave pair may nest, in either argument order, but nothing else may overlap', () => {
  const rome = { cityId: 'rome', polygons: outer }
  const vatican = { cityId: 'vatican-city', polygons: inside }
  assert.equal(isDeclaredEnclave(rome, vatican), true)
  assert.equal(isDeclaredEnclave(vatican, rome), true)
  assert.doesNotThrow(() => assertNoOpenCityGeometryOverlap([rome, vatican]))
  assert.doesNotThrow(() => assertNoOpenCityGeometryOverlap([vatican, rome]))
  // The same nesting between cities that are not declared enclaves still fails.
  assert.throws(() => assertNoOpenCityGeometryOverlap([{ cityId: 'rome', polygons: outer }, { cityId: 'paris', polygons: inside }]), /rome and paris have overlapping/)
  // The declared pair in the wrong direction (the outer city inside the inner one) still fails.
  assert.throws(() => assertNoOpenCityGeometryOverlap([{ cityId: 'rome', polygons: inside }, { cityId: 'vatican-city', polygons: outer }]), /overlapping/)
  // A declared pair that only partly overlaps still fails.
  assert.throws(() => assertNoOpenCityGeometryOverlap([rome, { cityId: 'vatican-city', polygons: straddling }]), /overlapping/)
  // Disjoint cities are fine.
  assert.doesNotThrow(() => assertNoOpenCityGeometryOverlap([rome, { cityId: 'paris', polygons: far }]))
})
