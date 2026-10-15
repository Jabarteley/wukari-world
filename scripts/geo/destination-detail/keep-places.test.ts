import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { gunzipSync } from 'node:zlib';
import { builtUp, inRing, keptPlacePoints } from './geometry-tools.ts';
import type { Box, P, Ring } from './geometry-tools.ts';

// The inputs of builtUp exactly as scripts/geo/build-destination-detail.ts passed them for three generated cities (factory source artifacts:
// west-island run 38670193219, adamstown run 38494007308, laayoune run 38431865880): land-use rings, place and label discs, roads, water,
// the outline box, the options with the country boundary, the recipe profile and the places. The hashes are of builtUp's output before the
// keep rule existed: a city where no place's region was a speck must come out byte for byte the same.
interface Fixture {
  areas: Ring[]; anchors: { at: P; metres: number }[]; roads: P[][]; water: Ring[][]; box: Box; profile?: string; places: { osm: string; at: P }[];
  options: { cell: number; split: number; closeMetres: number; minIslandKm2: number; minHoleKm2: number; shore: number; joinMetres: number; country?: Ring[][] };
}
const fixture = (id: string): Fixture => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/builtup-${id}.json.gz`, import.meta.url))).toString('utf8')) as Fixture;
const run = (f: Fixture, keep?: readonly P[]) => builtUp(f.areas, f.anchors, f.roads, f.water, f.box, { ...f.options, ...(keep ? { keep } : {}) });
const sha = (value: unknown): string => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const inside = (polygons: Ring[][], point: P): boolean => polygons.some((polygon) => inRing(point, polygon[0]!) && !polygon.slice(1).some((hole) => inRing(point, hole)));
const keepFor = (f: Fixture) => keptPlacePoints(f.profile, f.places.map((place) => place.at));

test('keptPlacePoints: only outpost and wilderness keep a lone place; microstate, standard and no profile are unchanged', () => {
  const points: P[] = [[96.884097, -12.090456]];
  assert.deepEqual(keptPlacePoints('outpost', points), points);
  assert.deepEqual(keptPlacePoints('wilderness', points), points);
  for (const profile of ['microstate', 'standard', undefined]) assert.equal(keptPlacePoints(profile, points), undefined);
  assert.equal(keptPlacePoints('outpost', []), undefined);
});

test('builtUp keeps a lone place disc that the speck rule would drop', () => {
  // A built-up square and one place 2 km east of it, at latitude 60: the place's 450 m disc (441 fine cells) is under the 0.6 km2 speck limit (876 cells there).
  const box: Box = [59.95, -0.05, 60.05, 0.05], lone: P = [0.04, 60];
  const square: Ring = [[-0.02, 59.99], [0.0, 59.99], [0.0, 60.01], [-0.02, 60.01], [-0.02, 59.99]];
  const options = { cell: 0.004, split: 12, closeMetres: 600, minIslandKm2: 0.6, minHoleKm2: 0.4, shore: 0, joinMetres: 0 };
  const anchors = [{ at: lone, metres: 450 }];
  const without = builtUp([square], anchors, [], [], box, options);
  const kept = builtUp([square], anchors, [], [], box, { ...options, keep: [lone] });
  assert.equal(inside(without.play, lone), false, 'the speck rule drops the lone disc');
  assert.equal(inside(kept.land, lone) && inside(kept.play, lone), true, 'the kept disc holds the place');
  assert.equal(inside(kept.land, [-0.01, 60]), true);
  // A keep point inside a region that is no speck changes nothing.
  assert.equal(sha(builtUp([square], [], [], [], box, { ...options, keep: [[-0.01, 60]] })), sha(builtUp([square], [], [], [], box, options)));
});

test('west-island (outpost): Ferry to Home Island is inside the land and the play area; without the rule it was not', () => {
  const f = fixture('west-island'), ferry = f.places.find((place) => place.osm === 'node/3024982382')!.at;
  const before = run(f);
  assert.equal(sha(before), '6e8c6319a772ce5d5bcd5991a52539f49c3269a018544e995cbec21ec22b2857');
  assert.equal(inside(before.play, ferry), false);
  const after = run(f, keepFor(f));
  for (const place of f.places) assert.equal(inside(after.land, place.at) && inside(after.play, place.at), true, `${place.osm} inside the land and the play area`);
});

test('adamstown (outpost) and laayoune (standard) regenerate byte for byte', () => {
  const adamstown = fixture('adamstown'), laayoune = fixture('laayoune');
  assert.equal(adamstown.profile, 'outpost');
  assert.equal(laayoune.profile, undefined);
  assert.equal(keepFor(laayoune), undefined);
  assert.equal(sha(run(adamstown, keepFor(adamstown))), 'bda4983824f6f9454049cdd5d390a72dbe5f726e28b97c847e87bf742385c7e2');
  assert.equal(sha(run(laayoune, keepFor(laayoune))), '92e4bcf3f010141e25f67177679af4ef839fc3d8fd57e72dfac141f50bbf85d1');
});
