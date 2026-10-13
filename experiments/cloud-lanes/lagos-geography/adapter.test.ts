import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createAdapter, MAX_RADIUS_METRES, modelPointToScene } from './adapter.ts'
import type { Geographic, LocalPoint, StreetPoint } from './adapter.ts'
import { CONFIG, PROPOSED_BOUNDARY, SYNTHETIC_FEATURES, point } from './fixture.ts'
import { ORIGINS, toLocal } from '../../../src/geo/frame.ts'
import { mapPointToMetres } from '../../../src/street/frame.ts'

const close = (actual: number, expected: number, tolerance = 1e-9): void => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} within ${tolerance}`)
const distance = (a: LocalPoint, b: LocalPoint): number => Math.hypot(a.east - b.east, a.north - b.north, a.up - b.up)
const a = createAdapter(CONFIG)
const metreAsset = { near: 'synthetic:cube', metresPerModelUnit: 1, groundAnchorModel: { x: 0, y: 0, z: 0 }, forward: '+z' as const }

test('pinned anchor independently agrees with rounded Lagos origin and existing frame functions', () => {
  assert.deepEqual(ORIGINS.lagos, { x: -5052, z: 2835 })
  const city = a.geographicToCity(CONFIG.anchor)
  close(city.x, -19.768571967337266); close(city.z, -63.4626251791924)
  assert.deepEqual([city.x, city.z], toLocal(ORIGINS.lagos, 3.382, 6.5075))
  const projected = a.cityToStreet(city)
  assert.deepEqual({ x: projected.x, z: projected.z }, mapPointToMetres({ frame: { origin: ORIGINS.lagos, unitsPerKm: 10 } }, city))
  const nominal = toLocal(ORIGINS.lagos, 3.4, 6.45)
  assert.ok(Math.hypot(...nominal) > 0.01, 'nominal origin anchor is not the rounded origin')
})

test('independent geographic steps establish axis signs and scale, not just inverse agreement', () => {
  const north: Geographic = { ...CONFIG.anchor, lat: CONFIG.anchor.lat + 0.001 }
  const east: Geographic = { ...CONFIG.anchor, lon: CONFIG.anchor.lon + 0.001 }
  close(a.geographicToLocal(north, 0).north, 111.1950802335329, 1e-7)
  // Independent Python math witness: R*pi/180*cos(radians(6.5075))*0.001.
  close(a.geographicToLocal(east, 0).east, 110.47865354493775, 1e-6)
  const o = a.geographicToCity(CONFIG.anchor)
  assert.ok(a.geographicToCity(north).z < o.z)
  assert.ok(a.geographicToCity(east).x > o.x)
  close(a.mapEastScaleRelativeToLocal, 0.9940932547076073, 1e-12)
  const left = a.cityToStreet(a.geographicToCity(a.localToGeographic(point(-100, 0))))
  const right = a.cityToStreet(a.geographicToCity(a.localToGeographic(point(100, 0))))
  close(right.x - left.x, 198.81865094152147, 1e-7)
})

test('one-metre cube has expected east/up/north axes and unit edges in the proposed scene', () => {
  const cube = [point(0, 0), point(1, 0), point(1, 1), point(0, 1), point(0, 0, 1), point(1, 0, 1), point(1, 1, 1), point(0, 1, 1)].map(a.localToScene)
  assert.deepEqual(cube[0], { frame: 'pilot-scene-units', x: 0, y: 0, z: 0 })
  assert.deepEqual([cube[6]!.x, cube[6]!.y, cube[6]!.z], [1, 1, -1])
  for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) {
    const p = cube[i!]!, q = cube[j!]!
    close(Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z), 1)
  }
  const b = createAdapter({ anchor: CONFIG.anchor, scene: { unitsPerMetre: 1.4, yawRadians: Math.PI / 2, translation: { x: 10, y: 20, z: 30 } } })
  const east = b.localToScene(point(1, 0)), north = b.localToScene(point(0, 1)), up = b.localToScene(point(0, 0, 1))
  close(east.x, 10); close(east.z, 28.6); close(north.x, 8.6); close(north.z, 30); close(up.y, 21.4)
})

test('486 grid samples round-trip geographic/city/street and translated rotated scaled scene within 1 cm', t => {
  let samples = 0, maxCoordinateError = 0, maxSceneError = 0, maxQuantizedError = 0
  for (const scene of [CONFIG.scene, { unitsPerMetre: 1.4, yawRadians: 0.73, translation: { x: 91, y: 7, z: -44 } }]) {
    const b = createAdapter({ anchor: CONFIG.anchor, scene })
    for (let east = -100; east <= 100; east += 25) for (let north = -100; north <= 100; north += 25) for (const up of [-2, 0.15, 12]) {
      const p = point(east, north, up), g = b.localToGeographic(p), c = b.geographicToCity(g), s = b.cityToStreet(c)
      const back = b.geographicToLocal(b.cityToGeographic(b.streetToCity(s)), up)
      const quantized = b.geographicToLocal(b.cityToGeographic(b.streetToCity(b.decodeStreetPoint(b.encodeStreetPoint(s)))), up)
      maxCoordinateError = Math.max(maxCoordinateError, distance(p, back))
      maxSceneError = Math.max(maxSceneError, distance(p, b.sceneToLocal(b.localToScene(p))))
      maxQuantizedError = Math.max(maxQuantizedError, distance(p, quantized))
      samples++
    }
  }
  assert.equal(samples, 486)
  assert.ok(maxCoordinateError < 1e-7)
  assert.ok(maxSceneError < 1e-10)
  assert.ok(maxQuantizedError <= 0.01)
  t.diagnostic(JSON.stringify({ samples, maxCoordinateErrorMetres: maxCoordinateError, maxSceneErrorMetres: maxSceneError, maxQuantizedErrorMetres: maxQuantizedError }))
})

test('declared 500 m domain has edge witnesses and rejects beyond it', () => {
  for (const p of [point(MAX_RADIUS_METRES, 0), point(-500, 0), point(0, 500), point(0, -500), point(300, 400)]) {
    assert.ok(distance(p, a.geographicToLocal(a.localToGeographic(p), p.up)) < 1e-7)
  }
  assert.throws(() => a.localToGeographic(point(500.01, 0)), /500 m/)
  assert.throws(() => a.geographicToLocal({ ...CONFIG.anchor, lon: 4 }, 0), /500 m/)
})

test('proposal sides are approximately 200 spherical ground metres by independent haversine witness', () => {
  const radians = (v: number) => v * Math.PI / 180
  function sphericalDistance(p: Geographic, q: Geographic): number {
    const dlat = radians(q.lat - p.lat), dlon = radians(q.lon - p.lon)
    const h = Math.sin(dlat / 2) ** 2 + Math.cos(radians(p.lat)) * Math.cos(radians(q.lat)) * Math.sin(dlon / 2) ** 2
    return 2 * 6371008.8 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  }
  for (let i = 1; i < PROPOSED_BOUNDARY.length; i++) close(sphericalDistance(a.localToGeographic(PROPOSED_BOUNDARY[i - 1]!), a.localToGeographic(PROPOSED_BOUNDARY[i]!)), 200, 0.001)
})

test('headings independently orient model +z north/east/south/west and wrap', () => {
  for (const [heading, x, z] of [[0, 0, -1], [90, 1, 0], [180, 0, 1], [270, -1, 0], [450, 1, 0], [-90, -1, 0]]) {
    const p = modelPointToScene({ x: 0, y: 0, z: 1 }, a.place(metreAsset, point(0, 0), heading!))
    close(p.x, x!); close(p.z, z!); close(p.y, 0)
  }
})

test('centimetre asset scale, nonzero pivot and local ground height are preserved', () => {
  const b = createAdapter({ anchor: CONFIG.anchor, scene: { unitsPerMetre: 1.4, yawRadians: 0.73, translation: { x: 7, y: 2, z: -4 } } })
  const f = SYNTHETIC_FEATURES[1]!, placement = b.place(f.asset, f.ground, f.headingDegrees)
  close(placement.scale, 0.014)
  assert.equal(placement.routeAuthorized, false)
  const anchor = modelPointToScene(f.asset.groundAnchorModel, placement)
  assert.ok(distance(b.sceneToLocal(anchor), f.ground) < 1e-10)
  const top = modelPointToScene({ ...f.asset.groundAnchorModel, y: f.asset.groundAnchorModel.y + 100 }, placement)
  close(top.y - anchor.y, 1.4)
})

test('negative tiles and rounded seam ownership use half-open centimetre coordinates', () => {
  for (const x of [-2048.006, -2048.004, -2048, -1920.006, -1920.004, -1920, -1920 + 0.006]) {
    const p: StreetPoint = { frame: 'lagos-street-projected-metres', x, z: -6400.006 }
    const encoded = a.encodeStreetPoint(p), decoded = a.decodeStreetPoint(encoded)
    assert.equal(encoded.tile.x, Math.floor((Math.round(x * 100) / 100) / 128))
    assert.ok(encoded.centimetres.x >= 0 && encoded.centimetres.x < 12800)
    assert.equal(encoded.tile.z, -51); assert.equal(encoded.centimetres.z, 12799)
    assert.ok(Math.hypot(decoded.x - p.x, decoded.z - p.z) <= Math.SQRT2 * 0.005 + 1e-9)
  }
  const seam = a.encodeStreetPoint({ frame: 'lagos-street-projected-metres', x: -1920.004, z: -6400 })
  assert.equal(seam.tile.x, -15); assert.equal(seam.centimetres.x, 0)
  assert.throws(() => a.decodeStreetPoint({ ...seam, centimetres: { x: 12800, z: 0 } }), /outside tile/)
  assert.throws(() => a.decodeStreetPoint({ ...seam, tile: { x: 0.5, z: 0 } }), /integers/)
})

test('invalid numbers, swapped coordinate order, foreign frames and bad scales fail clearly', () => {
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.throws(() => a.localToScene(point(value, 0)), /finite/)
    assert.throws(() => a.geographicToLocal({ ...CONFIG.anchor, lon: value }, 0), /finite/)
    assert.throws(() => a.geographicToLocal(CONFIG.anchor, value), /finite/)
    assert.throws(() => a.place(metreAsset, point(0, 0), value), /finite/)
  }
  assert.throws(() => a.geographicToLocal({ ...CONFIG.anchor, lon: 6.5075, lat: 3.382 }, 0), /500 m/)
  assert.throws(() => a.geographicToLocal({ ...CONFIG.anchor, lat: 91 }, 0), /range/)
  assert.throws(() => a.streetToCity({ frame: 'lagos-map-units', x: 0, z: 0 } as unknown as StreetPoint), /Expected/)
  for (const scale of [0, -1, NaN]) assert.throws(() => createAdapter({ ...CONFIG, scene: { ...CONFIG.scene, unitsPerMetre: scale } }))
  assert.throws(() => createAdapter({ ...CONFIG, anchor: { ...CONFIG.anchor, lat: 89 } }), /Polar/)
  assert.throws(() => a.place({ ...metreAsset, metresPerModelUnit: 0 }, point(0, 0), 0), /positive/)
})

test('caller mutation cannot change a created adapter and altitude is never silently inferred', () => {
  const input = structuredClone(CONFIG), b = createAdapter(input)
  input.anchor.lon = 0; input.scene.translation.x = 500; input.scene.unitsPerMetre = 7
  close(b.localToGeographic(point(0, 0)).lon, 3.382)
  close(b.localToScene(point(1, 0)).x, 1)
  assert.throws(() => b.geographicToLocal(CONFIG.anchor, undefined as unknown as number), /finite/)
  close(b.geographicToLocal(CONFIG.anchor, 7.25).up, 7.25)
})
