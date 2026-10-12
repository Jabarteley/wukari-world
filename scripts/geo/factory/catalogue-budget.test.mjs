import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { catalogueRowBytes, fitCatalogueBudget, CATALOGUE_LIMIT } from './catalogue-budget.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const facts = cc => JSON.parse(readFileSync(join(here, 'country-factory', `${cc}-factory-targets.json`), 'utf8')).targets[0].facts;

test('row bytes equal the figures the app generator reported on the hosted run (bn 173, do 162, gt 157)', () => {
  assert.equal(catalogueRowBytes(facts('bn')), 173);
  assert.equal(catalogueRowBytes(facts('do')), 162);
  assert.equal(catalogueRowBytes(facts('gt')), 157);
});

test('a long derived state id is shortened to the country code and brings do and gt under the limit', () => {
  for (const cc of ['do', 'gt']) {
    const { facts: fitted, bytes, compacted } = fitCatalogueBudget(facts(cc));
    assert.equal(fitted.state.idunique, cc);
    assert.ok(bytes <= CATALOGUE_LIMIT, `${cc} ${bytes}`);
    assert.equal(compacted.stateId.to, cc);
    assert.equal(fitted.centre.lon, facts(cc).centre.lon, 'source facts stay untouched');
  }
});

test('bn stays over the limit after the only legitimate shortening: that needs an app change', () => {
  const { bytes, compacted } = fitCatalogueBudget(facts('bn'));
  assert.equal(bytes, 153);
  assert.equal(compacted.stateId.to, 'bn');
});

test('a row already inside the limit is not touched', () => {
  const nairobi = { id: 'nairobi', name: 'Nairobi', country: { idISOlower: 'ke', name: 'Kenya' }, state: { idunique: 'ke-nairobi', name: 'Nairobi' }, centre: { lon: 36.8, lat: -1.28 } };
  const result = fitCatalogueBudget(nairobi);
  assert.equal(result.facts, nairobi);
  assert.equal(result.compacted, undefined);
});
