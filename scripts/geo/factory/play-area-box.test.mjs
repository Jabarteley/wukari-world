// Run: node --test scripts/geo/factory/play-area-box.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { playAreaWithinBox } from './inputs.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const policy = extra => ({ metadataSources: { bounds: { policy: { playKm: 20, coreKm: 5, airportClearanceMetres: 1000, maximumAbsoluteLatitude: 75, ...extra } } } });

test('play area box cut: only a one-sided play box extent asks for it', () => {
  assert.equal(playAreaWithinBox(policy({})), false);
  assert.equal(playAreaWithinBox(policy({ playKm: 12 })), false);
  assert.equal(playAreaWithinBox({}), false);
  for (const key of ['westKm', 'eastKm', 'southKm', 'northKm']) assert.equal(playAreaWithinBox(policy({ [key]: 10 })), true, key);
});

test('play area box cut: the committed drafts ask for it exactly where the seed table sets a side', () => {
  const dir = join(here, 'country-factory');
  for (const file of readdirSync(dir).filter(name => name.endsWith('-factory-targets.json'))) {
    const iso = file.slice(0, 2), seeds = JSON.parse(readFileSync(join(here, 'country-tables', `${iso}.json`), 'utf8')).seeds;
    for (const target of JSON.parse(readFileSync(join(dir, file), 'utf8')).targets) {
      const seed = seeds.find(s => s.id === target.id);
      if (!seed || !target.metadataSources?.bounds?.policy) continue;
      const sided = ['westKm', 'eastKm', 'southKm', 'northKm'].some(key => seed.playBox?.[key] !== undefined);
      assert.equal(playAreaWithinBox(target), sided, target.id);
    }
  }
});
