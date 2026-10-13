import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { profileFor, emptySlotReason, slotPredicatesFor, profileAddedKind, sensitiveTags, excludesSensitive, allowsNoRoads, authoredLinkFacts, SLOT_SOURCE_RULES } from './profile.mjs';
import { mapTestText } from './acceptance.mjs';
import { districtLabels } from './district-labels.mjs';
import { catalogueRowBytes } from './catalogue-budget.mjs';
import { loadCountryScope, validateCountryScopePolicy, TREATY_RING } from './country-scope.mjs';

const STANDARD_SLOTS = { transit: t => t.railway === 'station' || t.amenity === 'bus_station' || t.public_transport === 'station', community: t => ['university', 'college', 'library', 'community_centre', 'conference_centre'].includes(t.amenity), meal: t => ['restaurant', 'cafe'].includes(t.amenity) };

test('outpost and wilderness: the documented numbers, gateway, authored links and extraction rules', () => {
  const outpost = profileFor('outpost'), wilderness = profileFor('wilderness');
  assert.deepEqual([outpost.minimumPlaces, outpost.minimumNeighbourhoodLabels, outpost.maximumEmptySlots], [3, 2, 9]);
  assert.deepEqual([wilderness.minimumPlaces, wilderness.minimumNeighbourhoodLabels, wilderness.maximumEmptySlots], [0, 2, 9]);
  for (const name of ['outpost', 'wilderness']) {
    assert.ok(profileFor(name).hubGateway && profileFor(name).authoredLinks);
    assert.ok(excludesSensitive(name) && allowsNoRoads(name));
  }
  for (const name of [undefined, 'microstate']) assert.ok(!excludesSensitive(name) && !allowsNoRoads(name) && !profileFor(name).authoredLinks, `${name ?? 'standard'} is unchanged`);
});

test('slot extras widen only the outpost slots: a ferry terminal is transit, a research station is community', () => {
  const outpost = slotPredicatesFor('outpost', STANDARD_SLOTS), standard = slotPredicatesFor(undefined, STANDARD_SLOTS), micro = slotPredicatesFor('microstate', STANDARD_SLOTS);
  assert.ok(outpost.transit({ amenity: 'ferry_terminal' }) && outpost.community({ office: 'research' }) && outpost.community({ amenity: 'research_institute' }));
  assert.ok(outpost.transit({ railway: 'station' }) && outpost.meal({ amenity: 'cafe' }), 'the standard predicates still hold');
  assert.ok(!standard.transit({ amenity: 'ferry_terminal' }) && !micro.community({ office: 'research' }));
  for (const slot of Object.keys(STANDARD_SLOTS)) assert.equal(standard[slot], STANDARD_SLOTS[slot], 'a profile without extras keeps the very same predicate');
  assert.equal(outpost.meal, STANDARD_SLOTS.meal);
  assert.throws(() => slotPredicatesFor('outpost', { meal: STANDARD_SLOTS.meal }), /unknown slot transit/);
});

test('empty slot reasons are unchanged for standard and microstate and name the extras for an outpost', () => {
  for (const slot of Object.keys(SLOT_SOURCE_RULES)) {
    assert.equal(emptySlotReason(slot), emptySlotReason(slot, 'microstate'));
    assert.ok(!emptySlotReason(slot).includes('(or '));
  }
  assert.match(emptySlotReason('transit', 'outpost'), /\(or amenity=ferry_terminal\)/);
  assert.match(emptySlotReason('community', 'outpost'), /\(or office=research or amenity=research_institute\)/);
  assert.equal(emptySlotReason('market', 'outpost'), emptySlotReason('market'));
});

test('added outpost venues and the sensitive-feature rule', () => {
  assert.equal(profileAddedKind({ amenity: 'post_office' }, 'outpost'), 'walk');
  assert.equal(profileAddedKind({ office: 'research' }, 'outpost'), 'walk');
  assert.equal(profileAddedKind({ amenity: 'ferry_terminal' }, 'outpost'), 'walk');
  assert.equal(profileAddedKind({ amenity: 'post_office' }, undefined), null);
  assert.equal(profileAddedKind({ amenity: 'post_office' }, 'wilderness'), null, 'wilderness has no post office filter');
  assert.equal(profileAddedKind({ natural: 'peak' }, 'wilderness'), null, 'a natural name is a label, never a venue');
  for (const tags of [{ military: 'base' }, { landuse: 'military' }, { aeroway: 'helipad' }, { aeroway: 'aerodrome', name: 'x' }]) assert.ok(sensitiveTags(tags));
  for (const tags of [{ amenity: 'cafe' }, { landuse: 'residential' }, { historic: 'wreck' }]) assert.ok(!sensitiveTags(tags));
});

test('the emitted map test: an outpost needs no road and checks its authored links; the standard text is untouched', () => {
  const outpost = mapTestText('xyz', { profile: 'outpost', emptySlots: [{ slot: 'market', reason: 'r' }] });
  assert.match(outpost, /PLACES\.length >= 3/);
  assert.ok(!outpost.includes('TERRAIN.roads.length > 0'));
  assert.match(outpost, /a place with no mapped road is allowed/);
  assert.match(outpost, /assert\.equal\(FACTS\.generatedLinkPolicy, 'authored-only'\)/);
  assert.match(outpost, /city\.rules\.links\.length, \(FACTS\.links\?\.length \?\? 0\) \+ 1/);
  assert.match(mapTestText('xyz', { profile: 'wilderness' }), /PLACES\.length >= 0/);
  const standard = mapTestText('xyz'), micro = mapTestText('xyz', { profile: 'microstate' });
  assert.equal(createHash('sha256').update(standard).digest('hex'), 'cc2a477e3590a28984c8570f7d601b2182c65dab7fc3b586ea4e27eddce2c402');
  for (const text of [standard, micro]) {
    assert.match(text, /assert\.ok\(TERRAIN\.roads\.length > 0\)/);
    assert.ok(!text.includes('authored-only'));
  }
});

test('wilderness labels: named peaks and passes after every place tier; a standard pool gives exactly its old labels', () => {
  const at = (id, tags, lon = 76.9, lat = 35.6) => ({ type: 'node', id, lon, lat, tags });
  const pool = [at(1, { natural: 'peak', name: 'Sia Kangri' }), at(2, { mountain_pass: 'yes', name: 'Indira Col' }, 76.92), at(3, { natural: 'glacier', name: 'Teram Shehr' }, 77),
    at(4, { natural: 'tree', name: 'Lone Tree' }), at(5, { place: 'locality', name: 'Camp Field' })];
  const common = { pool, name: el => el.tags.name, ref: el => `${el.type}/${el.id}`, normal: x => x.toLowerCase(), centre: { lon: 76.9, lat: 35.62 }, minimumLabels: 2 };
  const wild = districtLabels({ ...common, naturalLabels: profileFor('wilderness').districtNaturalLabels });
  assert.deepEqual(wild.labels.map(label => label.ref), ['node/5', 'node/1', 'node/2', 'node/3'], 'the locality first, then the natural names; never the tree');
  assert.deepEqual(wild.naturalRefs, ['node/1', 'node/2', 'node/3']);
  assert.equal(wild.placeTags['node/2'], 'mountain_pass=yes');
  const plain = districtLabels(common);
  assert.deepEqual(plain.labels.map(label => label.ref), ['node/5']);
  assert.deepEqual(plain.naturalRefs, []);
});

test('the catalogue row of an outpost is two bytes longer (the authored-only flag)', () => {
  const facts = { id: 'adamstown', name: 'Adamstown', country: { idISOlower: 'pn', name: 'Pitcairn' }, state: { idunique: 'pn', name: 'Adamstown' }, centre: { lon: -130.1, lat: -25.07 } };
  assert.equal(catalogueRowBytes({ ...facts, generatedLinkPolicy: 'authored-only' }), catalogueRowBytes(facts) + 2);
});

test('authored link facts: open catalogue cities only, whole great-circle km and the city name', () => {
  const catalogue = [{ id: 'santiago', name: 'Santiago', lon: -70.65, lat: -33.44, open: true }, { id: 'buenos-aires', name: 'Buenos Aires', lon: -58.38, lat: -34.6, open: true }, { id: 'kaduna', name: 'Kaduna', lon: 7.4, lat: 10.5, open: false }];
  const facts = { id: 'villa-las-estrellas', centre: { lon: -58.98, lat: -62.2 } };
  const km = (a, b) => Math.hypot(a.lon - b.lon, a.lat - b.lat) * 111.2;
  const links = authoredLinkFacts(facts, [{ to: 'santiago', kind: 'charter' }, { to: 'buenos-aires', kind: 'ship' }], catalogue, km);
  assert.deepEqual(links.map(link => [link.to, link.name, link.kind, Number.isInteger(link.km)]), [['santiago', 'Santiago', 'charter', true], ['buenos-aires', 'Buenos Aires', 'ship', true]]);
  assert.throws(() => authoredLinkFacts(facts, [{ to: 'santiago', kind: 'charter' }], catalogue, km), /2 to 4/);
  assert.throws(() => authoredLinkFacts(facts, [{ to: 'kaduna', kind: 'charter' }, { to: 'santiago', kind: 'ship' }], catalogue, km), /not another open city/);
  assert.throws(() => authoredLinkFacts(facts, [{ to: 'santiago', kind: 'rail' }, { to: 'buenos-aires', kind: 'ship' }], catalogue, km), /kind rail/);
  assert.throws(() => authoredLinkFacts(facts, [{ to: 'santiago', kind: 'ship' }, { to: 'santiago', kind: 'ship' }], catalogue, km), /twice/);
});

test('the Antarctic Treaty scope policy has no relation, and only AQ may use it', () => {
  const base = { kind: 'osm-admin0-boundary-v1', countryISO: 'AQ', datasetSha256: 'a'.repeat(64), receiptSha256: 'b'.repeat(64), geometrySha256: 'c'.repeat(64), scriptSha256: 'd'.repeat(64), receiptBytes: 10, geometryBytes: 10 };
  validateCountryScopePolicy({ ...base, treatyScope: 'antarctic-treaty-area' }, 'aq', 'a'.repeat(64));
  assert.throws(() => validateCountryScopePolicy({ ...base, treatyScope: 'antarctic-treaty-area', relationId: 1 }, 'aq', 'a'.repeat(64)), /without a relation/);
  assert.throws(() => validateCountryScopePolicy({ ...base, countryISO: 'TF', treatyScope: 'antarctic-treaty-area' }, 'tf', 'a'.repeat(64)), /only the AQ/);
  assert.throws(() => validateCountryScopePolicy(base, 'aq', 'a'.repeat(64)), /relationId pin required/);
  assert.ok(TREATY_RING.slice(1).every((point, index) => Math.abs(point[0] - TREATY_RING[index][0]) <= 180), 'every edge passes the antimeridian guard');
});

test('a treaty receipt whose polygon is not exactly the area south of 60 S is refused', () => {
  const dir = mkdtempSync(join(tmpdir(), 'treaty-scope-'));
  try {
    const hash = bytes => createHash('sha256').update(bytes).digest('hex');
    const write = ring => {
      const geometry = Buffer.from(JSON.stringify({ coordinates: [ring], type: 'Polygon' }) + '\n');
      const receipt = { schemaVersion: 1, status: 'OSM_COUNTRY_BOUNDARY_CANDIDATE', countryISO: 'AQ', source: { url: 'https://download.geofabrik.de/antarctica-261012.osm.pbf', date: '2026-10-12', headerTimestamp: '2026-10-12T20:21:06Z', bytes: 1, sha256: 'a'.repeat(64) },
        relation: null, treatyScope: { kind: 'antarctic-treaty-area', southOfLatitude: -60, countryISO: 'AQ', reason: 'Owner decision: Antarctica is playable (test).', evidenceSha256: 'e'.repeat(64) },
        memberWays: [], assembly: { method: 'antarctic-treaty-area', completeMemberSegments: ring.length - 1, polygonCount: 1, holeCount: 0, sourceMemberEdgesSha256: 'f'.repeat(64) },
        geometry: { path: 'boundary.geojson', bytes: geometry.length, sha256: hash(geometry) }, scriptSha256: 'd'.repeat(64), fixtureResults: [] };
      const raw = Buffer.from(JSON.stringify(receipt));
      writeFileSync(join(dir, 'boundary.geojson'), geometry); writeFileSync(join(dir, 'receipt.json'), raw);
      return { kind: 'osm-admin0-boundary-v1', countryISO: 'AQ', datasetSha256: 'a'.repeat(64), receiptSha256: hash(raw), receiptBytes: raw.length, geometrySha256: hash(geometry), geometryBytes: geometry.length, scriptSha256: 'd'.repeat(64), treatyScope: 'antarctic-treaty-area', directory: dir };
    };
    const scope = loadCountryScope('/', write(TREATY_RING), 'aq', 'a'.repeat(64));
    assert.equal(scope.classify([-58.98, -62.19]), 'inside');
    assert.equal(scope.classify([166.67, -77.85]), 'inside');
    assert.equal(scope.classify([-57.86, -51.69]), 'outside');
    const wider = TREATY_RING.map(([lon, lat]) => [lon, lat === -60 ? -50 : lat]);
    assert.throws(() => loadCountryScope('/', write(wider), 'aq', 'a'.repeat(64)), /exactly the area south of 60 degrees South/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('bounds policy: a gateway is the airport point of an outpost, checked for its mode and node', async () => {
  const { proposeBounds } = await import('./bootstrap/bounds-policy.mjs');
  const geometry = { OUTLINE_MARGIN: 0.02, reachFor: () => 0.3 };
  const facts = { id: 'adamstown', name: 'Adamstown', country: { idISOlower: 'pn', name: 'Pitcairn' }, timezone: 'Pacific/Pitcairn', centre: { lon: -130.1, lat: -25.066 },
    airport: { id: 'adamstown-airport', name: 'Pitcairn', lon: -130.09, lat: -25.07, sourceUrl: 'https://www.openstreetmap.org/node/9392374700' }, gateway: { mode: 'sea', osmRef: 'node/9392374700' } };
  const { gateway, ...standard } = facts;
  assert.deepEqual(proposeBounds(facts, {}, geometry).boxes, proposeBounds(standard, {}, geometry).boxes, 'the gateway point bounds the play box exactly as an airport does');
  for (const bad of [{ mode: 'boat', osmRef: 'node/9392374700' }, { mode: 'sea', osmRef: 'way/9392374700' }, { mode: 'sea', osmRef: 'node/1' }]) assert.throws(() => proposeBounds({ ...facts, gateway: bad }, {}, geometry), /Invalid gateway/);
  assert.ok(gateway);
});
