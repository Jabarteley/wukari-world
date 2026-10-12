import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
assert.equal(args.length, 8);
assert.deepEqual(args.filter((_, i) => i % 2 === 0), ['--baseline', '--workspace', '--evidence', '--out']);
const [baseline, workspace, evidence, out] = args.filter((_, i) => i % 2 === 1).map(path => resolve(path));
const moduleAt = path => import(pathToFileURL(path).href);
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const before = await Promise.all(['geometry', 'terrain', 'places'].map(file => moduleAt(join(baseline, `${file}.ts`))));
const after = await Promise.all(['geometry', 'terrain', 'places'].map(file => moduleAt(join(workspace, `src/game/cities/singapore/${file}.ts`))));
const oldManifest = json(join(baseline, 'manifest.json'));
const newManifest = json(join(evidence, 'selection/singapore-manifest.json'));
const without = (object, key) => Object.fromEntries(Object.entries(object).filter(([name]) => name !== key));
assert.equal(oldManifest.config.farWaterTolerance ?? 0.0008, 0.0008);
assert.equal(newManifest.config.farWaterTolerance, 0.0012);
const protectedValues = {
  geometry: [before[0].GEOMETRY, after[0].GEOMETRY],
  terrainExceptReachWater: [without(before[1].TERRAIN, 'reachWater'), without(after[1].TERRAIN, 'reachWater')],
  places: [before[2].PLACES, after[2].PLACES],
  configExceptFarWaterTolerance: [without(oldManifest.config, 'farWaterTolerance'), without(newManifest.config, 'farWaterTolerance')],
  extractHashes: [oldManifest.extract.sha256, newManifest.extract.sha256],
};
const checks = Object.fromEntries(Object.entries(protectedValues).map(([key, values]) => {
  const hashes = values.map(digest);
  return [key, { beforeSha256: hashes[0], afterSha256: hashes[1], equal: hashes[0] === hashes[1] }];
}));
const vertices = value => Array.isArray(value)
  ? (value.length === 2 && value.every(item => typeof item === 'number') ? 1 : value.reduce((sum, item) => sum + vertices(item), 0))
  : 0;
const receipt = {
  kind: 'singapore-far-water-protected-output-comparison-v1',
  baselineRunId: 38208407941, baselineArtifactId: 11728512149,
  baselineTolerance: 0.0008, candidateTolerance: 0.0012, checks,
  reachWater: { beforeVertices: vertices(before[1].TERRAIN.reachWater), afterVertices: vertices(after[1].TERRAIN.reachWater) },
  scope: 'Exact protected output equality; reachWater rendering may differ. Scene budget and visual/browser gates are separate.',
};
writeFileSync(out, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
for (const [key, value] of Object.entries(checks)) assert.ok(value.equal, `Protected ${key} changed`);
