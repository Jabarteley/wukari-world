import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { profileFor } from './profile.mjs';
/**
 * `options` = { profile, emptySlots } of the selected city (profile.mjs); without a profile the emitted map test is exactly the standard one
 * (20 places, every slot sourced, five labels). A profile only lowers the numbers and lists the slots the selection documented as empty.
 */
export function mapTestText(cityId, { profile, emptySlots = [] } = {}) {
    const rules = profileFor(profile), listed = JSON.stringify(emptySlots.map(item => item.slot));
    const slotCheck = profile === undefined
        ? "    if (slot !== 'airport') assert.ok(PLACES.some(p => p.slot === slot))"
        : "    if (slot !== 'airport' && !EMPTY_SLOTS.includes(slot)) assert.ok(PLACES.some(p => p.slot === slot))";
    const roadHub = profile === undefined
        ? "  assert.equal(FACTS.names?.roadHub, PLACES.find(p => p.slot === 'transit')?.name)"
        : "  assert.equal(FACTS.names?.roadHub, PLACES.find(p => p.slot === 'transit')?.name ?? content.venues.find(v => v.id === ids.transit)?.name)";
    const emptyChecks = profile === undefined ? '' : `  // ${profile} profile: these slots have no honest source, so they keep the game's own fictional venue (recorded in the recipe, the selection and the receipt).
  assert.deepEqual(EMPTY_SLOTS, Object.keys(ids).filter(slot => slot !== 'airport' && !PLACES.some(p => p.slot === slot)))
  for (const slot of EMPTY_SLOTS) assert.ok(content.venues.find(v => v.id === ids[slot as keyof typeof ids])?.name.endsWith('(game venue)'), slot + ' keeps its fictional game venue')
`;
    return `import assert from 'node:assert/strict'
import test from 'node:test'
import { assertCityContentContract, assertCityMapContract } from '../cityContractTest.test.ts'
import { city } from './index.ts'
import { FACTS } from './facts.ts'
import { PLACES } from './places.ts'
import { TERRAIN } from './terrain.ts'
import { GEOMETRY } from './geometry.ts'
import { destinationVenueIds } from '../africa/types.ts'
${profile === undefined ? '' : `
const EMPTY_SLOTS: readonly string[] = ${listed}
`}
test('${cityId}: generated map and content contracts', async () => {
  await assertCityMapContract(city, await city.loadMap())
  const content = await city.loadContent()
  assertCityContentContract(city, content, { profile: 'opened' })
  assert.ok(PLACES.length >= ${rules.minimumPlaces})
  assert.equal(new Set(PLACES.map(p => p.osm)).size, PLACES.length)
  assert.equal(new Set(PLACES.map(p => p.name.normalize('NFKC').toLowerCase())).size, PLACES.length)
  const ids = destinationVenueIds(FACTS.id, FACTS.airport.id)
  for (const [slot, id] of Object.entries(ids)) {
    assert.ok(content.venues.some(v => v.id === id))
${slotCheck}
  }
${emptyChecks}${roadHub}
  assert.ok(GEOMETRY.land.length > 0)
  assert.ok(TERRAIN.roads.length > 0)
  assert.ok(TERRAIN.names.filter(n => n.kind === 'neighbourhood').length >= ${rules.minimumNeighbourhoodLabels}, '${rules.minimumNeighbourhoodLabels === 5 ? 'five' : String(rules.minimumNeighbourhoodLabels)} source-backed neighbourhood labels remain required')
})
`;
}
export function ensureAcceptance(workspace, cityId, genericJourney, options = {}) {
    const directory = join(workspace, 'src/game/cities', cityId);
    mkdirSync(directory, { recursive: true });
    const mapPath = join(directory, 'map.test.ts');
    const journeyPath = join(directory, 'journey.test.ts');
    const emitted = [];
    if (!existsSync(mapPath)) {
        writeFileSync(mapPath, mapTestText(cityId, options), { flag: 'wx' });
        emitted.push(mapPath);
    }
    if (!existsSync(journeyPath)) {
        const template = readFileSync(genericJourney, 'utf8');
        writeFileSync(journeyPath, template.replaceAll('__CITY__', cityId), { flag: 'wx' });
        emitted.push(journeyPath);
    }
    return emitted;
}
