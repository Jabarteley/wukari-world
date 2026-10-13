import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { BASELINE, SYNTHETIC_FEATURES, point } from './fixture.ts'
import { buildManifest, canonicalJson } from './manifest.ts'

test('committed sample is byte-deterministic and independent of input feature order', () => {
  const expected = readFileSync(new URL('sample-manifest.json', import.meta.url), 'utf8')
  assert.equal(canonicalJson(buildManifest()), expected)
  assert.equal(canonicalJson(buildManifest([...SYNTHETIC_FEATURES].reverse())), expected)
  assert.equal(canonicalJson(JSON.parse(expected)), expected)
  assert.ok(Buffer.byteLength(expected) < 64000)
})

test('source pins verify all 14 read-only contracts against current bytes', () => {
  const pins = JSON.parse(readFileSync(new URL('source-pins.json', import.meta.url), 'utf8')) as { baseline: string; sources: { path: string; bytes: number; sha256: string }[] }
  assert.equal(pins.baseline, BASELINE); assert.equal(pins.sources.length, 14)
  for (const source of pins.sources) {
    const bytes = readFileSync(new URL(`../../../${source.path}`, import.meta.url))
    assert.equal(bytes.length, source.bytes)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256, source.path)
  }
})

test('proposed area is closed, counter-clockwise and 200 x 200 local metres; geography is lon/lat', () => {
  const manifest = buildManifest(), boundary = manifest.boundaryProposal, ring = boundary.ring.map(p => p.local)
  assert.deepEqual(ring[0], ring.at(-1))
  assert.deepEqual(boundary.dimensionsLocalMetres, [200, 200])
  let twiceArea = 0
  for (let i = 1; i < ring.length; i++) twiceArea += ring[i - 1]!.east * ring[i]!.north - ring[i]!.east * ring[i - 1]!.north
  assert.equal(twiceArea / 2, 40000)
  for (const [lon, lat] of boundary.geojson.geometry.coordinates[0]!) {
    assert.ok(lon! > 3.38 && lon! < 3.384); assert.ok(lat! > 6.506 && lat! < 6.509)
  }
  for (const f of manifest.features) for (const p of f.footprint) assert.ok(Math.abs(p.east) <= 100 && Math.abs(p.north) <= 100)
})

test('provenance, unknown real heights/datum and non-admission status survive serialization', () => {
  const m = buildManifest()
  assert.equal(m.status, 'proposal-synthetic-only'); assert.equal(m.integrationReady, false); assert.equal(m.routeAuthorized, false)
  assert.equal(m.boundaryProposal.realWorldBoundaryErrorBoundMetres, null)
  assert.equal(m.boundaryProposal.geojson.properties.surveyed, false)
  assert.match(m.coordinateContract.vertical, /not sea level/)
  for (const source of m.provenance) { assert.equal(source.externalSurvey, false); assert.equal(source.imageryUsed, false); assert.ok(source.licence) }
  for (const f of m.features) {
    assert.equal(f.geometryStatus, 'synthetic'); assert.equal(f.height.method, 'synthetic-assumption')
    assert.equal(f.height.realWorldErrorBoundMetres, null); assert.equal(f.groundElevationErrorBoundMetres, null)
    assert.equal(f.height.confidence, 'not-measured'); assert.equal(f.model.filesExist, false)
    assert.equal(f.placement.routeAuthorized, false)
    const ground = f.ground.scene, placed = f.placedGroundAnchor
    assert.ok(Math.hypot(ground.x - placed.x, ground.y - placed.y, ground.z - placed.z) < 1e-10)
  }
})

test('malformed synthetic manifests reject duplicate IDs, false certainty and out-of-bound footprints', () => {
  assert.throws(() => buildManifest([SYNTHETIC_FEATURES[0]!, SYNTHETIC_FEATURES[0]!]), /unique/)
  const bad = structuredClone(SYNTHETIC_FEATURES[0]!)
  bad.height.nominalMetres = NaN; assert.throws(() => buildManifest([bad]), /finite/)
  bad.height.nominalMetres = 100; assert.throws(() => buildManifest([bad]), /uncertainty/)
  bad.height.nominalMetres = 8; bad.ground = point(99, 99); assert.throws(() => buildManifest([bad]), /boundary/)
  bad.ground = point(0, 0); bad.asset.near = 'real:building'; assert.throws(() => buildManifest([bad]), /Synthetic/)
  assert.throws(() => canonicalJson({ fakeHeight: Infinity }), /Nonfinite/)
})

test('building output does not mutate inputs or retain writable references to them', () => {
  const input = structuredClone(SYNTHETIC_FEATURES), before = canonicalJson(input), m = buildManifest(input)
  assert.equal(canonicalJson(input), before)
  m.features[0]!.height.scenarioRangeMetres[0] = 999
  m.features[0]!.ground.local.east = 999
  m.features[0]!.model.groundAnchorModel.x = 999
  assert.equal(canonicalJson(input), before)
})
