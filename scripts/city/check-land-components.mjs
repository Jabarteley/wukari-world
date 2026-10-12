import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { GENERATED_CITY_CATALOGUE_ROWS } from '../../src/game/cities/catalogue.generated.ts';
import { GENERATED_CITY_LAND_COMPONENTS, CITY_LAND_COMPONENT_PROVENANCE } from '../../src/game/cities/land-components.generated.ts';

/** @param {string} relative */
const hashFile = relative => createHash('sha256').update(readFileSync(fileURLToPath(new URL(relative, import.meta.url)))).digest('hex');
try {
  const provenance = CITY_LAND_COMPONENT_PROVENANCE;
  assert.equal(provenance.schemaVersion, 1);
  assert.equal(provenance.sourceSha256, '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255');
  assert.equal(provenance.sourceBytes, 13287234);
  assert.equal(provenance.sourceUrl, 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_10m_admin_0_countries.geojson');
  assert.equal(provenance.catalogueSha256, hashFile('../../src/game/cities/catalogue.generated.ts'), 'City catalogue changed');
  assert.equal(provenance.generatorSha256, hashFile('./build-land-components.py'), 'Land component generator changed');
  assert.equal(GENERATED_CITY_LAND_COMPONENTS.length, GENERATED_CITY_CATALOGUE_ROWS.length, 'City land table is incomplete');
  /** @type {Map<string, import('../../src/game/cities/generatedLinks.ts').CityLandComponentRow>} */
  const land = new Map(GENERATED_CITY_LAND_COMPONENTS.map(row => [row[0], row]));
  assert.equal(land.size, GENERATED_CITY_LAND_COMPONENTS.length, 'Duplicate city land row');
  for (const row of GENERATED_CITY_CATALOGUE_ROWS) {
    const match = land.get(row[0]);
    assert.ok(match, `Missing land row: ${row[0]}`);
    assert.deepEqual(match.slice(0, 4), [row[0], row[4], row[5], row[7] ?? 'ng'], `Stale land endpoint: ${row[0]}`);
    assert.ok(match[4] === null || /^[0-9]+:[0-9]+$/.test(match[4]), `Invalid source land component: ${row[0]}`);
  }
  console.log(`Land components current: ${land.size} cities, ${GENERATED_CITY_LAND_COMPONENTS.filter(row => row[4] === null).length} unresolved (generated roads held).`);
} catch (error) {
  console.error('Land component freshness failed:', error instanceof Error ? error.message : String(error));
  console.error('Regenerate from the cached pinned source using docs/TRAVEL-LAND-COMPONENTS.md; no network fallback.');
  process.exitCode = 1;
}
