import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDestinationRules } from './rules.ts'
import { buildDestinationContent } from './contentBuilder.ts'
import { createDestinationModule } from './module.ts'
import { destinationHubIds, destinationVenueIds, validateDestinationFacts } from './types.ts'
import type { DestinationFacts } from './types.ts'
import { FACTS as stanley } from '../stanley/facts.ts'
import { GENERATED_LINKS, charterFare, generateCityLinks, generatedAirFare, generatedRoadFare, greatCircleKm, shipFare } from '../generatedLinks.ts'
import { INTERCITY_TIME } from '../../content/travel.ts'
import { catalogueFromRows } from '../catalogue.ts'
import { CITY_CATALOGUE } from '../network.ts'
import { linksFrom, loadCityContent, playableCityIds, registerCityForTest } from '../registry.ts'
import { planHomewardRoute } from '../homewardRoute.ts'
import { OUTPOST_LINKS } from '../generatedLinks.ts'

// A test outpost on the facts of a real generated city (Stanley), so only the outpost fields differ.
const outpost = (extra: Partial<DestinationFacts> = {}): DestinationFacts => ({
  ...stanley, id: 'test-outpost', name: 'Test Outpost', state: { idunique: 'fk-test-outpost', name: 'Test Outpost' },
  gateway: { mode: 'sea', osmRef: 'node/9392374700' }, generatedLinkPolicy: 'authored-only',
  links: [{ to: 'santiago', name: 'Santiago', kind: 'charter', km: 3300 }, { to: 'buenos-aires', name: 'Buenos Aires', kind: 'ship', km: 3063 }],
  ...extra,
})

test('the outpost fare rule: 1.5 x the air formula for a charter (cap 900k), the road formula on great-circle km for a ship', () => {
  // The plan's worked example (Villa Las Estrellas): Santiago charter 426,000, Buenos Aires ship 50,500.
  assert.equal(charterFare(3300), 426_000)
  assert.equal(shipFare(3063), 50_500)
  assert.equal(shipFare(3063), generatedRoadFare(3063))
  assert.equal(charterFare(12_000), GENERATED_LINKS.maxAirFare, 'a charter never costs more than a generated flight can')
  assert.ok(charterFare(1000) > generatedAirFare(1000), 'a charter costs more than a scheduled flight of the same length')
})

test('outpost facts: a gateway node, authored links and the authored-only policy are validated together', () => {
  validateDestinationFacts(outpost())
  assert.throws(() => validateDestinationFacts(outpost({ gateway: { mode: 'boat' as 'sea', osmRef: 'node/1' } })), /gateway mode/)
  assert.throws(() => validateDestinationFacts(outpost({ gateway: { mode: 'sea', osmRef: 'way/1' } })), /OpenStreetMap node/)
  assert.throws(() => validateDestinationFacts(outpost({ generatedLinkPolicy: undefined })), /go together/)
  assert.throws(() => validateDestinationFacts(outpost({ links: undefined })), /go together/)
  assert.throws(() => validateDestinationFacts(outpost({ links: [{ to: 'santiago', name: 'Santiago', kind: 'charter', km: 3300 }] })), /at least two/)
  assert.throws(() => validateDestinationFacts(outpost({ links: [{ to: 'lagos', name: 'Lagos', kind: 'charter', km: 9000 }, { to: 'santiago', name: 'Santiago', kind: 'ship', km: 3300 }] })), /than Lagos/)
  assert.throws(() => validateDestinationFacts(outpost({ links: [{ to: 'santiago', name: 'Santiago', kind: 'charter', km: 3300 }, { to: 'santiago', name: 'Santiago', kind: 'charter', km: 3300 }] })), /twice/)
  assert.throws(() => validateDestinationFacts(outpost({ links: [{ to: 'santiago', name: 'Santiago', kind: 'charter', km: 3300.5 }, { to: 'buenos-aires', name: 'Buenos Aires', kind: 'ship', km: 3063 }] })), /whole/)
  assert.throws(() => validateDestinationFacts(outpost({ links: [{ to: 'santiago', name: 'Santiago', kind: 'train' as 'ship', km: 3300 }, { to: 'buenos-aires', name: 'Buenos Aires', kind: 'ship', km: 3063 }] })), /charter, ship or overland/)
})

test('outpost rules: the Lagos connection at the normal fare plus the authored charter and ship, nothing else', () => {
  const rules = buildDestinationRules(outpost())
  assert.equal(rules.generatedLinkPolicy, 'authored-only')
  const hubs = destinationHubIds('test-outpost')
  assert.deepEqual(rules.hubs.map(hub => [hub.id, hub.mode]), [[hubs.air, 'air'], [hubs.road, 'road']], 'the air hub keeps `<id>-air`, so the Lagos flight and the driver still work')
  assert.equal(rules.links.length, 3)
  const [lagos, charter, ship] = rules.links
  const lagosKm = Math.round(greatCircleKm(stanley.centre, { lon: 3.4, lat: 6.45 }))
  assert.deepEqual([lagos?.a, lagos?.b, lagos?.mode, lagos?.label, lagos?.fare, lagos?.km], ['lagos', 'test-outpost', 'air', 'Connecting flight between Lagos and Test Outpost', generatedAirFare(lagosKm), lagosKm])
  assert.ok((lagos?.fare ?? Infinity) <= GENERATED_LINKS.maxAirFare, 'the homeward trip to Lagos stays under the ticket cap')
  assert.deepEqual([charter?.a, charter?.b, charter?.mode, charter?.icon, charter?.label, charter?.fare], ['santiago', 'test-outpost', 'air', '🛩️', 'Charter flight between Santiago and Test Outpost', 426_000])
  assert.deepEqual([ship?.a, ship?.b, ship?.mode, ship?.icon, ship?.label, ship?.fare], ['buenos-aires', 'test-outpost', 'road', '🚢', 'Ship between Buenos Aires and Test Outpost', 50_500])
  assert.ok((charter?.seconds ?? 99) <= INTERCITY_TIME.air.max && (ship?.seconds ?? 99) <= INTERCITY_TIME.road.max)
  // An air gateway keeps the plain flight label (and its compact generated route row).
  assert.equal(buildDestinationRules(outpost({ gateway: { mode: 'air', osmRef: 'node/1' } })).links[0]?.label, 'Flight between Lagos and Test Outpost')
})

test('a city without the outpost fields builds exactly the rules it always did', () => {
  const rules = buildDestinationRules(stanley)
  assert.equal('generatedLinkPolicy' in rules, false)
  assert.deepEqual(rules.links.map(link => [link.a, link.b, link.label]), [['lagos', 'stanley', 'Flight between Lagos and Stanley']])
  const venue = buildDestinationContent(stanley).venues.find(item => item.id === destinationVenueIds('stanley', stanley.airport.id).airport)
  assert.match(venue?.definition.note ?? '', /airport location: https:\/\/ourairports\.com\/airports\/SFAL\//)
})

test('the gateway venue names its OpenStreetMap node instead of an airport record', () => {
  const facts = outpost()
  const venue = buildDestinationContent(facts).venues.find(item => item.id === destinationVenueIds(facts.id, facts.airport.id).airport)
  assert.match(venue?.definition.note ?? '', /sea gateway: OpenStreetMap node\/9392374700/)
})

test('generated links never reach an authored-only city, and still join every other pair', () => {
  const cities = [
    { id: 'a', name: 'A', lon: 0, lat: 0, airport: true, countryId: 'xx' },
    { id: 'b', name: 'B', lon: 10, lat: 0, airport: true, countryId: 'yy' },
    { id: 'post', name: 'Post', lon: 5, lat: -1, airport: true, countryId: 'zz', generatedLinkPolicy: 'authored-only' as const },
  ]
  const made = generateCityLinks(cities, [])
  assert.deepEqual(made.map(link => `${link.a}|${link.b}|${link.mode}`), ['a|b|air'])
})

test('catalogue rows: a tenth element 1 marks an authored-only outpost; every other row is read as before', () => {
  const entries = catalogueFromRows([
    ['stanley', 'Stanley', 'fk-stanley', '', -57.86, -51.69, 1, 'fk', 'Falkland Islands'],
    ['test-outpost', 'Test Outpost', 'aq', '', -58.98, -62.2, 1, 'aq', 'Antarctica', 1],
  ])
  const of = (id: string) => entries.find(entry => entry.id === id)
  assert.equal(of('test-outpost')?.generatedLinkPolicy, 'authored-only')
  assert.equal(of('stanley') && 'generatedLinkPolicy' in of('stanley')!, false)
  assert.ok(CITY_CATALOGUE.every(city => city.generatedLinkPolicy === undefined || city.generatedLinkPolicy === 'authored-only'), 'a catalogue city has generated links, or is an authored-only outpost')
})

test('a registered outpost is reached by exactly its three authored links in both directions', async (t) => {
  await loadCityContent('lagos')
  const module = createDestinationModule(outpost(), async () => { throw new Error('no map in this test') })
  const registration = registerCityForTest(module)
  t.after(() => registration.dispose())
  const from = linksFrom('test-outpost')
  assert.deepEqual(from.map(link => [link.to, link.mode]).sort(), [['buenos-aires', 'road'], ['lagos', 'air'], ['santiago', 'air']])
  assert.ok(linksFrom('santiago').some(link => link.to === 'test-outpost' && link.label.startsWith('Charter flight')))
  assert.ok(linksFrom('buenos-aires').some(link => link.to === 'test-outpost' && link.mode === 'road' && link.icon === '🚢'))
})

test('an outpost needs one surface leg the feeder allowance pays; an overland trip is a road link', () => {
  const charters = outpost({ links: [{ to: 'delhi', name: 'Delhi', kind: 'charter', km: 700 }, { to: 'lahore', name: 'Lahore', kind: 'charter', km: 650 }] })
  assert.throws(() => buildDestinationRules(charters), /ship or overland link of at most/)
  const farShip = outpost({ links: [{ to: 'santiago', name: 'Santiago', kind: 'charter', km: 3300 }, { to: 'auckland', name: 'Auckland', kind: 'ship', km: 7000 }] })
  assert.ok(shipFare(7000) > OUTPOST_LINKS.surfaceFeederFare)
  assert.throws(() => buildDestinationRules(farShip), /ship or overland link of at most/)
  const overland = buildDestinationRules(outpost({ gateway: { mode: 'land', osmRef: 'node/1' }, links: [{ to: 'delhi', name: 'Delhi', kind: 'overland', km: 700 }, { to: 'lahore', name: 'Lahore', kind: 'charter', km: 650 }] }))
  const road = overland.links.find(link => link.a === 'delhi')
  assert.deepEqual([road?.mode, road?.icon, road?.label, road?.fare], ['road', '🚙', 'Overland between Delhi and Test Outpost', shipFare(700)])
})

test('a registered outpost has a homeward quote under the cap to every open home', async (t) => {
  await loadCityContent('lagos')
  const registration = registerCityForTest(createDestinationModule(outpost(), async () => { throw new Error('no map in this test') }))
  t.after(() => registration.dispose())
  const open = new Set([...playableCityIds(), 'test-outpost'])
  const missing = [...open].filter(home => home !== 'test-outpost' && !planHomewardRoute('test-outpost', home, linksFrom, id => open.has(id)))
  assert.deepEqual(missing, [], 'the ship leg plus one generated flight reaches every home')
})

test('every catalogued outpost: its authored link km is the great-circle distance between the two atlas points, and both ends are open', async () => {
  const outposts = CITY_CATALOGUE.filter(city => city.generatedLinkPolicy === 'authored-only')
  for (const entry of outposts) {
    const { FACTS } = await import(`../${entry.id}/facts.ts`) as { FACTS: DestinationFacts }
    for (const link of FACTS.links ?? []) {
      const other = CITY_CATALOGUE.find(city => city.id === link.to && city.open)
      assert.ok(other, `${entry.id}: ${link.to} is an open city`)
      assert.ok(Math.abs(Math.round(greatCircleKm(other, FACTS.centre)) - link.km) <= 1, `${entry.id} to ${link.to}: ${link.km} km`)
      assert.equal(link.name, other.name)
    }
  }
})
