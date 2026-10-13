import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { budgetOverrunOnly, remainingRungs, rungArguments, attemptRecord, ladderRecord, validateWaterBudgetLadder, LADDER_RUNGS_DEGREES, LADDER_AREA_CAP, STANDARD_AREA_CAP } from './water-ladder.mjs';

const scene = (changes = {}) => ({ sourceProblems: [], unknownKinds: [], minimumPlaces: 20, places: 24, venues: 24, airportMinimumBoxMarginMetres: 1500, wetEmptySlots: [], triangles: 121181, triangleLimit: 90000, drawCalls: 120, drawCallLimit: 400, ...changes });

test('the ladder is off unless the target says true, and the key must be a boolean', () => {
  assert.equal(validateWaterBudgetLadder(undefined, 'x'), false);
  assert.equal(validateWaterBudgetLadder(false, 'x'), false);
  assert.equal(validateWaterBudgetLadder(true, 'x'), true);
  for (const bad of ['true', 1, null, {}]) assert.throws(() => validateWaterBudgetLadder(bad, 'x'), /waterBudgetLadder must be true or false/);
});

test('only a scene that fails on the triangle count alone is a budget overrun', () => {
  assert.equal(budgetOverrunOnly(scene()), true);
  assert.equal(budgetOverrunOnly(scene({ triangles: 90000 })), true, 'the budget is a strict limit');
  assert.equal(budgetOverrunOnly(scene({ triangles: 89999 })), false, 'a scene inside the budget is not an overrun');
  assert.equal(budgetOverrunOnly(scene({ sourceProblems: [{ ref: 'node/1', problem: 'missing' }] })), false);
  assert.equal(budgetOverrunOnly(scene({ wetEmptySlots: [{ slot: 'transit' }] })), false);
  assert.equal(budgetOverrunOnly(scene({ places: 3 })), false);
  assert.equal(budgetOverrunOnly(scene({ drawCalls: 999 })), false, 'a draw-call overrun is not a water problem');
  assert.equal(budgetOverrunOnly(null), false);
  assert.equal(budgetOverrunOnly({ triangles: 'x' }), false);
});

test('rungs are fixed, strictly coarser than the attempt that overflowed, and in order', () => {
  assert.deepEqual([...LADDER_RUNGS_DEGREES], [0.00001, 0.000015, 0.00002, 0.00003]);
  assert.deepEqual(remainingRungs(0.000005), [0.00001, 0.000015, 0.00002, 0.00003], 'Amsterdam: the standard stage ended at 0.56 m');
  assert.deepEqual(remainingRungs(0.00001), [0.000015, 0.00002, 0.00003]);
  assert.deepEqual(remainingRungs(0.000015), [0.00002, 0.00003]);
  assert.deepEqual(remainingRungs(0.00002), [0.00003], 'the stage already used 2.2 m: only 3.3 m is left');
  assert.deepEqual(remainingRungs(0.00003), []);
  assert.throws(() => remainingRungs(undefined));
});

test('a rung names its tolerance and the documented area cap, and nothing else', () => {
  assert.deepEqual(rungArguments(0.00002), ['--ladder-tolerance-degrees', '0.00002', '--ladder-area-cap', '0.001']);
  assert.throws(() => rungArguments(0.00005), /unknown ladder rung/);
  assert.ok(LADDER_AREA_CAP > STANDARD_AREA_CAP && LADDER_AREA_CAP <= 0.001, 'cap is documented and bounded (0.1%)');
});

test('the record carries every attempt with area error and triangles, and says what was accepted', () => {
  const first = attemptRecord({ rung: 0, toleranceDegrees: 0.00001, report: { waterVertices: 12000, geometry: { water: { sourceSymmetricDifferenceFraction: 3.1e-4 } }, simplification: { areaSymmetricDifferenceFraction: 9.1e-5, maximumAreaSymmetricDifferenceFraction: 1e-4 } }, scene: scene({ triangles: 99800 }), outcome: 'over-budget' });
  const second = attemptRecord({ rung: 1, toleranceDegrees: 0.00002, report: { waterVertices: 7000, geometry: { water: { sourceSymmetricDifferenceFraction: 8e-4 } }, simplification: { areaSymmetricDifferenceFraction: 2.2e-4, maximumAreaSymmetricDifferenceFraction: 1e-3 } }, scene: scene({ triangles: 74000 }), outcome: 'fits' });
  assert.equal(first.toleranceMetresApprox, 1.11);
  assert.equal(second.areaCap, 1e-3);
  const record = ladderRecord({ attempts: [first, second], accepted: true });
  assert.deepEqual(record.accepted, { rung: 1, toleranceDegrees: 0.00002, triangles: 74000, playWaterAreaFraction: 8e-4, wholeWaterAreaFraction: 2.2e-4 });
  assert.equal(record.attempts.length, 2);
  assert.equal(record.standardAreaCap, 1e-4);
  assert.equal(ladderRecord({ attempts: [first], accepted: false }).accepted, null);
});

test('the python stage refuses a half-named or out-of-range rung and the standard tolerance', () => {
  const stage = join(dirname(fileURLToPath(import.meta.url)), 'exact-coastwater.py');
  const run = (...args) => spawnSync('python3', [stage, '--city-directory', '/nonexistent', '--recipe', '/nonexistent', '--extract-dir', '/nonexistent', '--report', '/nonexistent/r.json', ...args], { encoding: 'utf8' });
  assert.match(run('--ladder-tolerance-degrees', '0.00002').stderr, /go together/);
  assert.match(run('--ladder-tolerance-degrees', '0.000005', '--ladder-area-cap', '0.0005').stderr, /outside its documented range/);
  assert.match(run('--ladder-tolerance-degrees', '0.00002', '--ladder-area-cap', '0.002').stderr, /outside its documented range/);
  assert.match(run('--ladder-tolerance-degrees', '0.001', '--ladder-area-cap', '0.0005').stderr, /outside its documented range/);
});
