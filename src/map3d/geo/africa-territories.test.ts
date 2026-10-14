// The Africa sheet carries every African territory the World sheet does, so each has a row in the Africa list (Saint Helena was missing).
import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD } from './data/world.ts';
import { AFRICA } from './data/africa.ts';
import { addWorldTerritories, decodeTopology } from './topo.ts';
import { ATLAS_LEVELS, regionEntry } from '../regions.ts';
import { cityCatalogue } from '../../game/cities/registry.ts';

const africaSheet = async () => (await ATLAS_LEVELS.find(level => level.id === 'africa')!.data() as { AFRICA: typeof AFRICA }).AFRICA;

test('the Africa level loads Saint Helena from the World sheet, with the generated Africa data left alone', async () => {
  assert.equal(AFRICA.features.length, 56);
  const loaded = await africaSheet();
  assert.deepEqual(loaded.features.map(feature => feature.id), [...AFRICA.features.map(feature => feature.id), 'sh']);
  assert.equal(AFRICA.features.length, 56, 'the generated module is not changed');
  const sheet = decodeTopology(loaded), original = decodeTopology(AFRICA), sh = sheet.byId.get('sh')!, source = decodeTopology(WORLD).byId.get('sh')!;
  assert.equal(sh.name, 'Saint Helena');
  assert.equal(sh.sub, 'west');
  assert.ok(sh.bounds.minLon > -6.5 && sh.bounds.maxLon < -5 && sh.bounds.minLat > -16.5 && sh.bounds.maxLat < -15.5, JSON.stringify(sh.bounds));
  assert.ok(Math.abs(sh.bounds.minLon - source.bounds.minLon) < 0.02 && Math.abs(sh.bounds.maxLat - source.bounds.maxLat) < 0.02, 're-quantised arcs keep the island where it was');
  for (const feature of original.features) assert.deepEqual(sheet.byId.get(feature.id)!.rings, feature.rings, `${feature.id} is unchanged`);
  assert.equal(addWorldTerritories(loaded, WORLD, { sh: 'west' }), loaded, 'nothing is added twice');
});

test('every open city of an African country or territory is on the Africa sheet, and the country opens there', async () => {
  const onSheet = new Set((await africaSheet()).features.map(feature => feature.id));
  const africanOpen = cityCatalogue().filter(city => city.open && city.countryISO && city.countryISO !== 'ng' && WORLD.features.find(feature => feature.id === city.countryISO)?.c === 'af');
  assert.ok(africanOpen.some(city => city.countryISO === 'sh'), 'Saint Helena has an open city');
  for (const city of africanOpen) {
    assert.ok(onSheet.has(city.countryISO!), `${city.countryISO} is on the Africa sheet`);
    assert.equal(regionEntry('country', city.countryISO!).status, 'open', `${city.countryISO} is open`);
  }
});
