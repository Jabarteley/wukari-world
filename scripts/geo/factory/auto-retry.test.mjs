import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { planSceneBudget, planWetPlaces, wetAnchorsFromExactCoastLog, wetPlacesFromProofs, anchorGuard, applyChange, afterRecord, catalogueRecord, metresBetween, MAXIMUM_AUTO_EXCLUSIONS } from './auto-retry.mjs';
import { fitCatalogueBudget } from './catalogue-budget.mjs';

// Fixtures are real files of the offline replays of hosted batch 11 and 12 (app baseline 31e7799c, source artifacts of runs 38329177114 and 38336723526):
//   id-scene-over-budget.json   Jakarta scene-source.json with the table key removed (90,971 of 90,000 triangles)
//   ca-proof-ground-wet.json    Toronto proofGround (wetPlaces 1: the shipwreck way/1304570821 in Lake Ontario), trimmed to the keys the check reads
//   ca-places-sample.json       two rows of the generated Toronto places.ts (the Bay hub, and the shipwreck as the proof names it)
//   sg-exact-coast-wet.log      Singapore exact-coast log with Pasir Ris Park left in (the final error line)
const here = dirname(fileURLToPath(import.meta.url)), fixture = name => join(here, 'fixtures', 'auto-retry', name);
const json = name => JSON.parse(readFileSync(fixture(name), 'utf8')), text = name => readFileSync(fixture(name), 'utf8');
const toronto = { id: 'toronto', selectionExclusions: [] };
const torontoFacts = { centre: { lon: -79.3839347, lat: 43.6534817 }, airport: { lon: -79.629421, lat: 43.675935 } };
const torontoConfig = { places: [{ slot: 'transit', ref: 'node/25991314' }, { slot: 'meal', ref: 'node/1' }] };
const guard = anchorGuard({ target: toronto, config: torontoConfig, facts: torontoFacts });

test('scene-budget: a budget-only overrun with the key unset retries with sceneWaterExtent play and records the numbers', () => {
  const plan = planSceneBudget({ target: { id: 'jakarta' }, scene: json('id-scene-over-budget.json') });
  assert.equal(plan.class, 'scene-budget');
  assert.deepEqual(plan.change, { sceneWaterExtent: 'play' });
  assert.deepEqual(plan.before, { stage: 'sourceScene', triangles: 90971, triangleLimit: 90000, sceneWaterExtent: null });
  assert.deepEqual(applyChange({ id: 'jakarta', geometry: { maxRoads: 600 } }, plan), { id: 'jakarta', geometry: { maxRoads: 600 }, sceneWaterExtent: 'play' });
});

test('scene-budget: never when the target chose a water extent, when it already ran, or when anything but the triangles failed', () => {
  const scene = json('id-scene-over-budget.json');
  assert.equal(planSceneBudget({ target: { id: 'x', sceneWaterExtent: 'play' }, scene }), null);
  assert.equal(planSceneBudget({ target: { id: 'x', sceneWaterExtent: 'reach' }, scene }), null);
  assert.equal(planSceneBudget({ target: { id: 'x' }, scene, used: ['scene-budget'] }), null);
  assert.equal(planSceneBudget({ target: { id: 'x' }, scene: { ...scene, sourceProblems: [{ ref: 'node/1', problem: 'missing source or recipe reference' }] } }), null);
  assert.equal(planSceneBudget({ target: { id: 'x' }, scene: { ...scene, triangles: 80000 } }), null);
  assert.equal(planSceneBudget({ target: { id: 'x' }, scene: null }), null);
});

test('wet-places (proofs): the shipwreck is named from the proof through the generated places and excluded with the generated reason', () => {
  const wet = wetPlacesFromProofs([json('ca-proof-ground-wet.json')], json('ca-places-sample.json'));
  assert.deepEqual(wet, [{ ref: 'way/1304570821', name: 'SS William E. Corey', lon: -79.575604, lat: 43.547997 }]);
  const plan = planWetPlaces({ target: toronto, stage: 'proofGround', wet, guard, run: 'run 38350032298' });
  assert.equal(plan.class, 'wet-places');
  assert.deepEqual(plan.change.selectionExclusions, [{ ref: 'way/1304570821', reason: 'auto: place point is water (proofGround run 38350032298)' }]);
  assert.deepEqual(plan.before.wetPlaces, wet);
  assert.deepEqual(applyChange({ ...toronto, selectionExclusions: [{ ref: 'way/9', reason: 'earlier' }] }, plan).selectionExclusions.map(e => e.ref), ['way/9', 'way/1304570821']);
});

test('wet-places (proofs): a proof that failed for any other reason too is not a wet-place case', () => {
  const proof = json('ca-proof-ground-wet.json'), places = json('ca-places-sample.json');
  assert.equal(wetPlacesFromProofs([{ ...proof, sourcePoints: { ...proof.sourcePoints, airport: { ...proof.sourcePoints.airport, wet: [{ name: 'Airport', lon: 1, lat: 1 }] } } }], places), null);
  assert.equal(wetPlacesFromProofs([{ ...proof, sourcePoints: { ...proof.sourcePoints, labels: { ...proof.sourcePoints.labels, wet: [{ name: 'Label', lon: 1, lat: 1 }] } } }], places), null);
  assert.equal(wetPlacesFromProofs([{ ...proof, sourcePoints: { ...proof.sourcePoints, places: { ...proof.sourcePoints.places, outsideBounds: [{ name: 'Far', lon: 1, lat: 1 }] } } }], places), null);
  assert.equal(wetPlacesFromProofs([{ ...proof, pack: { roadPointCoverageWithinGround: 0.9 } }], places), null);
  assert.equal(wetPlacesFromProofs([{ ...proof, polygonProof: { ...proof.polygonProof, water: { ...Object.values(proof.polygonProof)[0], polygonProblem: 'self-intersection' } } }], places), null);
  assert.equal(wetPlacesFromProofs([proof], []), null, 'a wet point that is not a generated place cannot be named');
  // the water-label list is not a failure (the proof ignores it): the fixture has one wet water label and still reads as the wreck alone
  assert.equal(proof.sourcePoints.waterLabels.wet.length, 1);
  assert.equal(wetPlacesFromProofs([proof], places).length, 1);
});

test('wet-places (exact coast): the final error line names every wet anchor; any other error or a malformed line names none', () => {
  const log = text('sg-exact-coast-wet.log'), wet = wetAnchorsFromExactCoastLog(log);
  assert.ok(wet.length >= 1 && wet.length <= MAXIMUM_AUTO_EXCLUSIONS, JSON.stringify(wet));
  assert.ok(wet.some(place => place.ref === 'relation/8752029' && place.name === 'Pasir Ris Park'));
  assert.equal(wetAnchorsFromExactCoastLog(log + '\nValueError: Unclosed coastline topology (cuts/dangles/invalid rings): {}'), null);
  assert.equal(wetAnchorsFromExactCoastLog('Traceback\nValueError: No source coast inside the country scope'), null);
  assert.equal(wetAnchorsFromExactCoastLog('ValueError: Source anchors are not dry land: [{"ref":"not a ref","sourceLonLat":[1,2]}]'), null);
  assert.equal(wetAnchorsFromExactCoastLog('ValueError: Source anchors are not dry land: [truncated'), null);
  assert.equal(wetAnchorsFromExactCoastLog(''), null);
  const plan = planWetPlaces({ target: { id: 'singapore', selectionExclusions: [] }, stage: 'exactCoast', wet, guard: { refs: new Set(), points: [] }, run: 'local 0a1b2c3d' });
  assert.deepEqual(plan.change.selectionExclusions.map(e => e.ref), wet.map(place => place.ref));
  assert.ok(plan.change.selectionExclusions.every(e => e.reason === 'auto: place point is water (exactCoast local 0a1b2c3d)'));
});

test('wet-places: more than three refs, a protected ref, a repeat, or a second use of the class stays a HOLD', () => {
  const place = (ref, lon = -79.57, lat = 43.54) => ({ ref, name: ref, lon, lat });
  const ask = (wet, extra = {}) => planWetPlaces({ target: toronto, stage: 'proofGround', wet, guard, run: 'r', ...extra });
  assert.ok(ask([place('node/2'), place('node/3'), place('node/4')]));
  assert.equal(ask([place('node/2'), place('node/3'), place('node/4'), place('node/5')]), null, 'at most 3 refs');
  assert.equal(ask([]), null);
  assert.equal(ask(null), null);
  assert.equal(ask([place('node/25991314')]), null, 'the hub (transit slot) is never excluded');
  assert.equal(ask([place('node/2', torontoFacts.airport.lon + 0.001, torontoFacts.airport.lat)]), null, 'a point on the airport is never excluded');
  assert.equal(ask([place('node/2', torontoFacts.centre.lon, torontoFacts.centre.lat + 0.001)]), null, 'a point on the city centre is never excluded');
  assert.ok(ask([place('node/2', torontoFacts.centre.lon, torontoFacts.centre.lat + 0.01)]), 'a place 1 km from the centre is an ordinary place');
  assert.equal(planWetPlaces({ target: { ...toronto, selectionExclusions: [{ ref: 'node/2', reason: 'earlier' }] }, stage: 'proofGround', wet: [place('node/2')], guard, run: 'r' }), null);
  assert.equal(ask([place('node/2')], { used: ['wet-places'] }), null, 'retry once per class');
  assert.equal(planWetPlaces({ target: toronto, stage: 'proofGround', wet: [place('node/2')], guard: anchorGuard({ target: { ...toronto, cityOsmRef: 'node/2' }, config: torontoConfig, facts: torontoFacts }), run: 'r' }), null, 'the city\'s own ref is never excluded');
});

test('distances use metres: 0.001 degree of latitude is about 111 m', () => {
  assert.ok(Math.abs(metresBetween([0, 0], [0, 0.001]) - 110.6) < 1);
  assert.ok(Math.abs(metresBetween([10, 60], [10.001, 60]) - 55.7) < 1);
});

test('the outcome record names the six deciding stages and the scene numbers, nothing else', () => {
  const pass = afterRecord({ generation: true, exactCoast: true, sourceScene: true, acceptance: true, proofGround: true, proofCity: true, proof: true, receipt: false }, { triangles: 69828, triangleLimit: 90000, places: 24 });
  assert.deepEqual(pass, { passed: true, stages: { generation: true, exactCoast: true, sourceScene: true, acceptance: true, proofGround: true, proofCity: true }, triangles: 69828, triangleLimit: 90000 });
  assert.equal(afterRecord({ generation: true, exactCoast: false }, null).passed, false);
  assert.equal('triangles' in afterRecord({ generation: true }, null), false);
});

test('the shortened state id is recorded with the bytes it saved (do 162 to under 150), and an untouched row records nothing', () => {
  const facts = JSON.parse(readFileSync(join(here, 'country-factory', 'do-factory-targets.json'), 'utf8')).targets[0].facts;
  const { compacted } = fitCatalogueBudget(facts), record = catalogueRecord(compacted);
  assert.equal(record.class, 'catalogue-row');
  assert.equal(record.change.stateId.to, 'do');
  assert.equal(record.before.catalogueBytes, 162);
  assert.ok(record.after.passed && record.after.catalogueBytes <= 150);
  assert.equal(catalogueRecord(undefined), null);
});

test('an unknown class is refused instead of being applied', () => {
  assert.throws(() => applyChange({ id: 'x' }, { class: 'maxRoads', change: {} }), /unknown auto-retry class/);
});
