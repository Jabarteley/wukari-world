import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const FACTORY_SHA = '0786c00510f2827d6495a53fc3299f3112d0d6b4';
const APP_SHA = 'a29a52bb77738874705c991685b34f001a1dfdf0';
const REPOSITORY = 'kromate/joinallworld';
const PRODUCER = {
  sourceRunId: 38178165871,
  sourceSha: 'ab6e99e05ff1ca5a9b15307aba9d75458e234631',
  sourceArtifact: 'asia-source-ab6e99e05ff1ca5a9b15307aba9d75458e234631',
};
const args = process.argv.slice(2);
const options = new Map();
for (let i = 0; i < args.length; i += 2) {
  assert.ok(['--table', '--factory-source', '--sandbox-root'].includes(args[i]), `Unknown option ${args[i]}`);
  assert.ok(args[i + 1] && !args[i + 1].startsWith('--'), `Missing value for ${args[i]}`);
  assert.ok(!options.has(args[i]), `Duplicate option ${args[i]}`);
  options.set(args[i], args[i + 1]);
}
for (const flag of ['--table', '--factory-source', '--sandbox-root']) assert.ok(options.has(flag), `Missing ${flag}`);
const factory = resolve(options.get('--factory-source'));
const command = (name, argv) => {
  const result = spawnSync(name, argv, { encoding: 'utf8', timeout: 900000, maxBuffer: 16 * 1024 * 1024 });
  assert.ok(result.status === 0 && !result.error, `${name} failed: ${result.error?.message ?? result.stderr}`);
  return result.stdout;
};
assert.equal(command('git', ['-C', factory, 'rev-parse', 'HEAD']).trim(), FACTORY_SHA, 'factory must be the exact committed helper checkout');
assert.equal(command('git', ['-C', factory, 'status', '--porcelain', '--untracked-files=all', '--', 'scripts']).trim(), '', 'factory helper scripts must be clean');
const { cloudInputs } = await import(pathToFileURL(join(factory, 'scripts/geo/factory/cloud-inputs.mjs')).href);
const { insideSandbox } = await import(pathToFileURL(join(factory, 'scripts/geo/factory/paths.mjs')).href);
const { loadCountryScope } = await import(pathToFileURL(join(factory, 'scripts/geo/factory/country-scope.mjs')).href);
const sandbox = resolve(options.get('--sandbox-root'));
mkdirSync(sandbox, { recursive: true });
const input = cloudInputs(options.get('--table'));
assert.deepEqual(input.holds, [], 'invalid factory table');
assert.equal(input.table.expectedSourceGitSHA, APP_SHA);
assert.equal(input.table.targets.length, 1, 'unknown Asia producer layout: only the pinned Dubai target is supported');
const target = input.table.targets[0];
assert.equal(target.id, 'dubai', 'unknown Asia producer layout');
assert.equal(target.country, 'ae');
assert.equal(target.extractKey, 'dubai');
const policy = target.countryScope ?? input.table.countryScope;
assert.equal(policy.boundaryKey, 'ae');
for (const [key, value] of Object.entries(PRODUCER)) {
  assert.equal(target.sourceJob[key], value, `unknown source producer ${key}`);
  assert.equal(policy.boundaryJob[key], value, `unknown boundary producer ${key}`);
}
assert.equal(process.env.GITHUB_REPOSITORY ?? REPOSITORY, REPOSITORY, 'source repository differs');
const provenance = insideSandbox(join(sandbox, 'provenance'), sandbox);
mkdirSync(provenance, { recursive: true });
const rows = [{ id: target.id, status: 'HOLD', reasons: [] }];
try {
  const producer = JSON.parse(command('gh', ['api', `repos/${REPOSITORY}/actions/runs/${PRODUCER.sourceRunId}`]));
  assert.equal(producer.repository?.full_name, REPOSITORY);
  assert.equal(producer.id, PRODUCER.sourceRunId);
  assert.equal(producer.head_sha, PRODUCER.sourceSha);
  assert.equal(producer.status, 'completed');
  assert.equal(producer.conclusion, 'success');
  const producerReceipt = { repository: REPOSITORY, runId: producer.id, sourceSha: producer.head_sha, artifact: PRODUCER.sourceArtifact, status: producer.status, conclusion: producer.conclusion };
  writeFileSync(join(provenance, 'producer.json'), JSON.stringify(producerReceipt, null, 2));
  const download = insideSandbox(join(sandbox, 'downloads', PRODUCER.sourceArtifact), sandbox);
  mkdirSync(download, { recursive: true });
  command('gh', ['run', 'download', String(PRODUCER.sourceRunId), '--repo', REPOSITORY, '--name', PRODUCER.sourceArtifact, '--dir', download]);
  const cityRoot = join(download, 'dubai');
  const publishedJob = JSON.parse(readFileSync(join(cityRoot, 'receipts/source-job.json')));
  assert.deepEqual(target.sourceJob, publishedJob, 'table must preserve the original source producer receipt');
  const sourceResult = JSON.parse(readFileSync(join(cityRoot, 'receipts/result.json')));
  assert.equal(sourceResult.status, 'SOURCE_CANDIDATE');
  assert.equal(sourceResult.id, target.id);
  assert.deepEqual(sourceResult.sourceJob, publishedJob);
  const metadata = JSON.parse(readFileSync(join(cityRoot, 'metadata/candidate/metadata.json')));
  assert.equal(metadata.status, 'METADATA_CANDIDATE');
  assert.equal(metadata.id, target.id);
  assert.equal(metadata.country, target.country);
  assert.deepEqual(target.facts, metadata.facts, 'table facts differ from published metadata');
  const metadataSources = { ...metadata.metadataSources, airport: { ...metadata.metadataSources.airport, sourceUrl: metadata.facts.airport.sourceUrl } };
  assert.deepEqual(target.metadataSources, metadataSources, 'table metadata provenance differs beyond the factory airport URL convention');
  writeFileSync(join(provenance, 'published-holds.json'), JSON.stringify({ metadata: metadata.holds, source: sourceResult.holds }, null, 2));
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const layers = ['places', 'extras', 'water', 'landuse', 'roads'];
  const extracts = layers.map(layer => {
    const bytes = readFileSync(join(cityRoot, 'dubai', layer + '.json'));
    assert.equal(hash(bytes), target.extractSha256[layer], `${layer} SHA-256 mismatch`);
    const source = JSON.parse(bytes).source;
    assert.equal(source.cityId, target.id);
    assert.equal(source.kind, 'geofabrik-pbf');
    assert.equal(source.datasetSha256, publishedJob.datasetSha256);
    assert.equal(source.adapterSha256, publishedJob.adapterSha256);
    assert.ok(!source.coastSupplement, 'coast supplements are unsupported');
    return [layer, bytes];
  });
  const boundary = join(cityRoot, 'boundary');
  const scope = loadCountryScope(boundary, { ...policy, directory: boundary }, target.country, publishedJob.datasetSha256);
  const extractDestination = insideSandbox(join(sandbox, 'extracts/dubai'), sandbox);
  const boundaryDestination = insideSandbox(join(sandbox, 'boundaries/ae'), sandbox);
  mkdirSync(extractDestination, { recursive: true });
  mkdirSync(boundaryDestination, { recursive: true });
  for (const [layer, bytes] of extracts) writeFileSync(join(extractDestination, layer + '.json'), bytes, { flag: 'wx' });
  for (const file of ['receipt.json', 'boundary.geojson']) writeFileSync(join(boundaryDestination, file), readFileSync(join(boundary, file)), { flag: 'wx' });
  writeFileSync(join(boundaryDestination, 'producer.json'), JSON.stringify(producerReceipt, null, 2), { flag: 'wx' });
  loadCountryScope(boundaryDestination, { ...policy, directory: boundaryDestination }, target.country, publishedJob.datasetSha256);
  cpSync(join(cityRoot, 'receipts'), join(provenance, 'dubai/receipts'), { recursive: true });
  cpSync(join(cityRoot, 'metadata'), join(provenance, 'dubai/metadata'), { recursive: true });
  rows[0] = { id: target.id, status: 'PINNED_SOURCE_AND_BOUNDARY_READY', extractKey: target.extractKey, boundaryKey: policy.boundaryKey, countryScopeReceipt: scope.receipt, reasons: [] };
} catch (error) {
  rows[0].reasons.push(error.message);
  throw error;
} finally {
  writeFileSync(join(provenance, 'source-holds.json'), JSON.stringify(rows, null, 2));
}
console.log(JSON.stringify({ sourceGroups: 1, boundaryGroups: 1, rows }));
