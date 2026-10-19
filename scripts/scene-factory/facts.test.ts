import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { extractCityBrief, writeCityBrief, type CityBriefV1 } from './facts.ts'
import { spotsOf } from '../../src/life.ts'

const requests = {
  lagos: { cityId: 'lagos', region: 'yoruba-southwest' },
  kano: { cityId: 'kano', region: 'sahel-north' },
  accra: { cityId: 'accra', region: 'gulf-guinea' },
  tokyo: { cityId: 'tokyo', region: 'east-asia' },
  lilongwe: { cityId: 'lilongwe', region: 'east-africa' },
} as const
const cache = new Map<keyof typeof requests, Promise<CityBriefV1>>()
const brief = (city: keyof typeof requests): Promise<CityBriefV1> => {
  const found = cache.get(city) ?? extractCityBrief(requests[city])
  cache.set(city, found)
  return found
}

test('same explicit input is deterministic and unknown city or region is refused', async () => {
  const first = await brief('accra'), second = await extractCityBrief(requests.accra)
  assert.deepEqual(first, second)
  assert.match(first.digests.inputSha256, /^[a-f0-9]{64}$/)
  assert.match(first.digests.contentSha256, /^[a-f0-9]{64}$/)
  assert.deepEqual(first.style, { region: 'gulf-guinea', selection: 'explicit-input' })

  const otherRegion = await extractCityBrief({ cityId: 'accra', region: 'western-europe' })
  assert.notEqual(otherRegion.digests.inputSha256, first.digests.inputSha256)
  assert.equal(otherRegion.digests.contentSha256, first.digests.contentSha256)
  await assert.rejects(extractCityBrief({ cityId: 'accra', region: undefined }), /region must be one of/)
  await assert.rejects(extractCityBrief({ cityId: 'accra', region: 'inferred-west-africa' }), /region must be one of/)
  await assert.rejects(extractCityBrief({ cityId: 'not-a-city', region: 'gulf-guinea' }), /unknown catalogue city/)
})

test('authored Lagos and Kano city scenes are preserved and never recipe targets', async () => {
  const [lagos, kano] = await Promise.all([brief('lagos'), brief('kano')])
  for (const id of ['park', 'market', 'unilag']) {
    assert.equal(lagos.venues.find(venue => venue.id === id)?.scene.disposition, 'preserve-authored', id)
    assert.ok(lagos.preservedVenueIds.includes(id), id)
    assert.ok(!lagos.targetVenueIds.includes(id), id)
  }

  for (const id of ['nassarawa-garden', 'kurmi-market', 'kwari-market', 'central-mosque']) {
    assert.equal(kano.venues.find(venue => venue.id === id)?.scene.disposition, 'preserve-authored', id)
    assert.ok(kano.preservedVenueIds.includes(id), id)
    assert.ok(!kano.targetVenueIds.includes(id), id)
  }
  assert.deepEqual(lagos.excludedVenueIds, ['home'])
  assert.deepEqual(kano.excludedVenueIds, ['home'])
  for (const city of [lagos, kano]) {
    const home = city.venues.find(venue => venue.id === 'home')
    assert.ok(home)
    assert.equal(home.scene.disposition, 'exclude-home')
    assert.deepEqual(home.effectiveSpots.map(spot => spot.id), spotsOf('home', city.city.id).map(spot => spot.id).sort())
    assert.ok(!home.effectiveSpots.some(spot => spot.id === 'people' && spot.source === 'system'))
  }
})

test('shared campus fallback scenes in Accra and Tokyo remain factory targets', async () => {
  const [accra, tokyo] = await Promise.all([brief('accra'), brief('tokyo')])
  for (const city of [accra, tokyo]) {
    const quads = city.venues.filter(venue => venue.scene.kind === 'quad')
    assert.ok(quads.length > 0, `${city.city.id} has a quad fixture`)
    for (const venue of quads) {
      assert.equal(venue.scene.disposition, 'target-recipe', `${city.city.id}/${venue.id}`)
      assert.ok(city.targetVenueIds.includes(venue.id), `${city.city.id}/${venue.id}`)
      assert.ok(!city.preservedVenueIds.includes(venue.id), `${city.city.id}/${venue.id}`)
    }
  }
})

test('Accra and Tokyo briefs retain actual sourced names, points, spots and regular identities', async () => {
  const [accra, tokyo] = await Promise.all([brief('accra'), brief('tokyo')])
  const makola = accra.venues.find(venue => venue.name === 'Makola Market')
  assert.ok(makola)
  assert.deepEqual(makola.spots.map(spot => spot.id), ['aisle', 'work'])
  assert.deepEqual(makola.effectiveSpots.map(spot => spot.id), spotsOf(makola.id, 'accra').map(spot => spot.id).sort())
  assert.deepEqual(makola.effectiveSpots.map(spot => [spot.id, spot.source]), [['aisle', 'content'], ['people', 'system'], ['work', 'content']])
  assert.equal(makola.effectiveSpots.find(spot => spot.id === 'people')?.name, 'People')
  assert.deepEqual(makola.provenance.sourceIds, [{ kind: 'osm', value: 'node/7514623108' }, { kind: 'wikidata', value: 'Q6739865' }])
  assert.equal(makola.provenance.sourceKind, 'market')
  assert.equal(makola.position.kind, 'lon-lat')
  assert.equal(makola.regularIds.length, 2)
  for (const id of makola.regularIds) {
    const regular = accra.regulars.find(item => item.id === id)
    assert.equal(regular?.venueId, makola.id)
    assert.ok(regular?.name && regular.role)
  }
  assert.equal(accra.provenance.sourceLabel, 'Natural Earth, OpenStreetMap contributors and national aeronautical information sources')
  assert.ok(accra.provenance.sourceUrls.includes('https://www.openstreetmap.org/copyright'))
  assert.match(accra.provenance.licence ?? '', /ODbL-1\.0/)

  const government = tokyo.venues.find(venue => venue.name === 'Tokyo Metropolitan Government Main Building 1')
  assert.ok(government)
  assert.deepEqual(government.spots.map(spot => spot.id), ['notices'])
  assert.deepEqual(government.effectiveSpots.map(spot => spot.id), spotsOf(government.id, 'tokyo').map(spot => spot.id).sort())
  assert.deepEqual(government.provenance.sourceIds, [{ kind: 'osm', value: 'way/89877471' }, { kind: 'wikidata', value: 'Q111973' }])
  assert.equal(government.provenance.sourceKind, 'statehouse')
  const university = tokyo.venues.find(venue => venue.name === 'Tsurumi University')
  assert.ok(university)
  assert.deepEqual(university.spots.map(spot => spot.id), ['visit'])
  assert.deepEqual(university.effectiveSpots.map(spot => spot.id), spotsOf(university.id, 'tokyo').map(spot => spot.id).sort())
  assert.ok(tokyo.provenance.files.some(file => file.path.endsWith('/facts.ts')))
  assert.ok(tokyo.provenance.files.some(file => file.path.endsWith('/places.ts')))
})

test('Lilongwe keeps the recreation slot runtime kind without turning it into a sourced stadium kind claim', async () => {
  const lilongwe = await brief('lilongwe')
  const stadium = lilongwe.venues.find(venue => venue.id === 'lilongwe-recreation')
  assert.ok(stadium)
  assert.equal(stadium.name, 'Bingu National Stadium')
  assert.equal(stadium.kind, 'park')
  assert.equal(stadium.provenance.status, 'sourced')
  assert.equal(stadium.provenance.sourceKind, 'viewing')
  assert.deepEqual(stadium.provenance.sourceIds, [
    { kind: 'osm', value: 'way/893629092' },
    { kind: 'wikidata', value: 'Q28457050' },
  ])
  assert.deepEqual(stadium.position, { kind: 'lon-lat', lon: 33.753197, lat: -13.943867 })
})

test('legacy provenance gaps stay unknown and briefs carry no raw geometry or fictional prose fields', async () => {
  const [lagos, kano] = await Promise.all([brief('lagos'), brief('kano')])
  for (const city of [lagos, kano]) {
    assert.equal(city.provenance.status, 'unknown')
    assert.equal(city.provenance.sourceLabel, null)
    assert.equal(city.provenance.licence, null)
    assert.deepEqual(city.provenance.sourceUrls, [])
    assert.ok(city.provenance.gaps.some(gap => gap.includes('No trusted facts.ts')))
    assert.ok(city.venues.every(venue => venue.provenance.status === 'unknown' && venue.provenance.sourceKind === null))
  }

  const forbidden = new Set(['activities', 'ambient', 'bounds', 'description', 'footprint', 'geometry', 'history', 'line', 'polygon', 'price', 'quotes', 'story', 'tale'])
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) { for (const item of value) visit(item); return }
    if (!value || typeof value !== 'object') return
    for (const [key, item] of Object.entries(value)) { assert.equal(forbidden.has(key), false, `forbidden brief field ${key}`); visit(item) }
  }
  visit(await brief('tokyo'))
})

test('explicit CLI output writes one new JSON file and refuses overwrite', async t => {
  const folder = await mkdtemp(join(tmpdir(), 'allworld-city-brief-'))
  t.after(() => rm(folder, { recursive: true, force: true }))
  const path = join(folder, 'accra.json'), accra = await brief('accra')
  await writeCityBrief(path, accra)
  assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), accra)
  await assert.rejects(writeCityBrief(path, accra), /EEXIST/)
})
