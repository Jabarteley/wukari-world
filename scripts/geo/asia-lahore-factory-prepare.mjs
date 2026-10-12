import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPOSITORY = 'kromate/joinallworld';
const FACTORY_SHA = '0786c00510f2827d6495a53fc3299f3112d0d6b4';
const APP_SHA = '04e0cf1d96a35b1fe57c520d174c41fc2a9eec48';
const PRODUCER = {
  city: 'lahore',
  sourceRunId: 38194120672,
  sourceSha: '57b0817b73e522f4e244eebc8f7a27f6337db07c',
  sourceArtifact: 'city-bootstrap-pk-57b0817b73e522f4e244eebc8f7a27f6337db07c',
};
const ARTIFACT_ID = 11722749267;
const ARTIFACT_SIZE = 1215495;
const ARTIFACT_DIGEST = 'sha256:0bf9dfee01aa5f9a00c0427cbb730f64650ad836a12c0216901363f323e84815';
const PBF = {
  url: 'https://download.geofabrik.de/asia/pakistan-261010.osm.pbf',
  bytes: 156780958,
  md5: 'b9a9d43d1d5014e8db565d47de8491de',
  snapshotDate: '2026-10-10',
  sha256: '6536081804ecf3fc312f7b60909288f48beac6dbcf3828dc7e8eecb4962c4c82',
};
const AIRPORT_CSV = {
  url: 'https://raw.githubusercontent.com/davidmegginson/ourairports-data/ecead39624006017b34acf27a4b098c9cc8a4635/airports.csv',
  commit: 'ecead39624006017b34acf27a4b098c9cc8a4635',
  snapshotDate: '2026-10-11',
};
const LAYERS = ['places', 'extras', 'water', 'landuse', 'roads'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = path => JSON.parse(readFileSync(path, 'utf8'));

function command(name, args) {
  const result = spawnSync(name, args, { encoding: 'utf8', timeout: 900000, maxBuffer: 16 * 1024 * 1024 });
  assert.ok(result.status === 0 && !result.error, `${name} failed: ${result.error?.message ?? result.stderr}`);
  return result.stdout;
}

function artifactFile(root, relative) {
  const path = join(root, relative);
  assert.ok(lstatSync(path).isFile(), `Artifact file is missing or is not regular: ${relative}`);
  return path;
}

function writeSameOrNew(path, bytes, sandbox, insideSandbox) {
  insideSandbox(path, sandbox);
  const expected = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (existsSync(path)) {
    assert.ok(lstatSync(path).isFile(), `existing output is not a regular file: ${path}`);
    assert.deepEqual(readFileSync(path), expected, `existing output differs: ${path}`);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, expected, { flag: 'wx' });
}

function copyOriginals(source, destination, sandbox, insideSandbox) {
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = join(source, entry.name), to = join(destination, entry.name);
    if (entry.isDirectory()) copyOriginals(from, to, sandbox, insideSandbox);
    else {
      assert.ok(entry.isFile(), `unsupported source artifact entry: ${from}`);
      writeSameOrNew(to, readFileSync(from), sandbox, insideSandbox);
    }
  }
}

async function pinnedFactory(factorySource) {
  const factory = resolve(factorySource);
  assert.equal(command('git', ['-C', factory, 'rev-parse', 'HEAD']).trim(), FACTORY_SHA, 'factory helper SHA differs');
  assert.equal(command('git', ['-C', factory, 'status', '--porcelain', '--untracked-files=all', '--', 'scripts']).trim(), '', 'factory helper scripts must be clean');
  const { cloudInputs } = await import(pathToFileURL(join(factory, 'scripts/geo/factory/cloud-inputs.mjs')).href);
  const { insideSandbox } = await import(pathToFileURL(join(factory, 'scripts/geo/factory/paths.mjs')).href);
  const { loadCountryScope, assertCountryFacts } = await import(pathToFileURL(join(factory, 'scripts/geo/factory/country-scope.mjs')).href);
  return { cloudInputs, insideSandbox, loadCountryScope, assertCountryFacts };
}

function pinnedTable(tablePath, cloudInputs) {
  const input = cloudInputs(tablePath);
  assert.deepEqual(input.holds, [], 'invalid Lahore factory table');
  assert.equal(input.table.expectedSourceGitSHA, APP_SHA);
  assert.equal(input.table.targets.length, 1, 'Lahore preparer accepts one target');
  const target = input.table.targets[0];
  assert.equal(target.id, 'lahore');
  assert.equal(target.name, 'Lahore');
  assert.equal(target.country, 'pk');
  assert.equal(target.extractKey, 'lahore');
  for (const [key, value] of Object.entries(PRODUCER)) assert.equal(target.sourceJob[key], value, `source ${key} differs`);
  assert.equal(target.sourceJob.datasetSha256, PBF.sha256);
  const policy = target.countryScope;
  assert.ok(policy, 'Lahore needs a target-specific Pakistan boundary policy');
  assert.equal(policy.countryISO, 'PK');
  assert.equal(policy.boundaryKey, 'pk');
  assert.equal(policy.datasetSha256, PBF.sha256);
  for (const key of ['sourceRunId', 'sourceSha', 'sourceArtifact']) assert.equal(policy.boundaryJob[key], PRODUCER[key], `boundary ${key} differs`);
  assert.equal(target.metadataSources.pbf.url, PBF.url);
  assert.equal(target.metadataSources.pbf.bytes, PBF.bytes);
  assert.equal(target.metadataSources.pbf.sha256, PBF.sha256);
  return target;
}

export async function prepareLahoreArtifact({ sourceRoot, factorySource, sandboxRoot, tablePath }) {
  assert.ok(sourceRoot && factorySource && sandboxRoot && tablePath, 'sourceRoot, factorySource, sandboxRoot and tablePath are required');
  const { cloudInputs, insideSandbox, loadCountryScope, assertCountryFacts } = await pinnedFactory(factorySource);
  const target = pinnedTable(tablePath, cloudInputs);
  const sandbox = resolve(sandboxRoot), artifact = resolve(sourceRoot);
  assert.ok(existsSync(sandbox), 'sandbox root must already exist');
  insideSandbox(artifact, sandbox);
  const provenance = insideSandbox(join(sandbox, 'provenance'), sandbox);
  const extractDestination = insideSandbox(join(sandbox, 'extracts/lahore'), sandbox);
  const boundaryDestination = insideSandbox(join(sandbox, 'boundaries/pk'), sandbox);

  const publishedJob = json(artifactFile(artifact, 'receipts/lahore-source-job.json'));
  assert.deepEqual(publishedJob, target.sourceJob, 'published source job differs from static table');
  const result = json(artifactFile(artifact, 'receipts/result.json'));
  assert.equal(result.status, 'SOURCE_CANDIDATE');
  assert.deepEqual(result.ids, ['lahore']);
  assert.deepEqual(result.sourceJobs, [publishedJob]);
  assert.deepEqual(result.cityResults, [{ id: 'lahore', status: 'SOURCE_CANDIDATE', sourceJob: publishedJob }]);
  assert.deepEqual(result.countryBoundary, {
    countryISO: 'PK',
    path: 'country-boundary/boundary.geojson',
    sha256: target.countryScope.geometrySha256,
    receiptPath: 'country-boundary/receipt.json',
    receiptSha256: target.countryScope.receiptSha256,
  });
  assert.ok(Array.isArray(result.holds) && result.holds.length > 0, 'source stage holds must be preserved');

  const downloads = json(artifactFile(artifact, 'receipts/downloads.json'));
  for (const [key, value] of Object.entries(PBF)) assert.equal(downloads.pbf?.[key], value, `PBF ${key} differs`);
  assert.equal(downloads.extractorSha256, publishedJob.adapterSha256);
  assert.equal(downloads.geometrySourceSha, target.metadataSources.bounds.geometrySourceGitSHA);
  assert.equal(downloads.airports?.url, AIRPORT_CSV.url);
  assert.equal(downloads.airports?.commit, AIRPORT_CSV.commit);
  assert.equal(downloads.airports?.snapshotDate, AIRPORT_CSV.snapshotDate);
  const metadata = json(artifactFile(artifact, 'metadata/lahore/candidate/metadata.json'));
  assert.equal(metadata.status, 'METADATA_CANDIDATE');
  assert.equal(metadata.id, 'lahore');
  assert.equal(metadata.name, target.name);
  assert.equal(metadata.country, 'pk');
  assert.deepEqual(metadata.facts, target.facts, 'metadata facts differ from static table');
  const metadataSources = {
    ...metadata.metadataSources,
    airport: { ...metadata.metadataSources.airport, sourceUrl: metadata.facts.airport.sourceUrl },
  };
  assert.deepEqual(metadataSources, target.metadataSources, 'metadata provenance differs from static table');
  assert.equal(downloads.airports?.sha256, target.metadataSources.airport.csvSha256, 'airport CSV SHA-256 differs from metadata provenance');
  assert.deepEqual(metadata.sourceInput.boxes, metadata.metadataSources.bounds.boxes, 'source boxes differ from metadata bounds');
  assert.ok(metadata.metadataSources.bounds.airportMarginMetres >= metadata.metadataSources.bounds.policy.airportClearanceMetres, 'airport misses the generated-box clearance policy');
  assert.equal(target.metadataSources.airport.row.iso_country, 'PK');
  assert.equal(target.metadataSources.airport.row.municipality, 'Lahore');
  assert.equal(target.metadataSources.airport.row.icao_code, 'OPLA');
  assert.equal(target.metadataSources.airport.row.iata_code, 'LHE');
  assert.equal(metadata.metadataSources.pbf.sha256, PBF.sha256);
  assert.equal(metadata.metadataSources.adapterSha256, publishedJob.adapterSha256);
  assert.ok(Array.isArray(metadata.holds) && metadata.holds.length > 0, 'metadata stage holds must be preserved');

  const extracts = LAYERS.map(layer => {
    const bytes = readFileSync(artifactFile(artifact, `lahore/${layer}.json`));
    assert.equal(hash(bytes), target.extractSha256[layer], `${layer} SHA-256 differs`);
    const source = JSON.parse(bytes).source;
    assert.equal(source.cityId, 'lahore');
    assert.equal(source.kind, 'geofabrik-pbf');
    assert.equal(source.datasetSha256, PBF.sha256);
    assert.equal(source.adapterSha256, publishedJob.adapterSha256);
    assert.ok(!source.coastSupplement, 'coast supplements are unsupported');
    return [layer, bytes];
  });
  const boundary = join(artifact, 'country-boundary');
  artifactFile(artifact, 'country-boundary/receipt.json');
  artifactFile(artifact, 'country-boundary/boundary.geojson');
  const policy = target.countryScope;
  const scope = loadCountryScope(boundary, { ...policy, directory: boundary }, 'pk', PBF.sha256);
  assertCountryFacts(scope, target.facts);
  assert.equal(json(join(boundary, 'receipt.json')).fixtureResults.length, 0, 'Pakistan boundary fixture status changed; review before use');

  for (const [layer, bytes] of extracts) writeSameOrNew(join(extractDestination, `${layer}.json`), bytes, sandbox, insideSandbox);
  for (const file of ['receipt.json', 'boundary.geojson']) writeSameOrNew(join(boundaryDestination, file), readFileSync(join(boundary, file)), sandbox, insideSandbox);
  const producerReceipt = { repository: REPOSITORY, runId: PRODUCER.sourceRunId, sourceSha: PRODUCER.sourceSha, artifact: PRODUCER.sourceArtifact, artifactId: ARTIFACT_ID };
  writeSameOrNew(join(boundaryDestination, 'producer.json'), JSON.stringify(producerReceipt, null, 2), sandbox, insideSandbox);
  const copiedScope = loadCountryScope(boundaryDestination, { ...policy, directory: boundaryDestination }, 'pk', PBF.sha256);
  assertCountryFacts(copiedScope, target.facts);
  copyOriginals(join(artifact, 'receipts'), join(provenance, 'lahore/receipts'), sandbox, insideSandbox);
  copyOriginals(join(artifact, 'metadata'), join(provenance, 'lahore/metadata'), sandbox, insideSandbox);
  writeSameOrNew(join(provenance, 'producer.json'), JSON.stringify(producerReceipt, null, 2), sandbox, insideSandbox);
  writeSameOrNew(join(provenance, 'published-holds.json'), JSON.stringify({ metadata: metadata.holds, source: result.holds }, null, 2), sandbox, insideSandbox);
  const rows = [{ id: 'lahore', status: 'PINNED_SOURCE_AND_BOUNDARY_READY', extractKey: 'lahore', boundaryKey: 'pk', countryScopeReceipt: copiedScope.receipt, fixtureLimitation: 'Pakistan admin0 receipt has zero fixtureResults; geometry and centre/airport membership were checked, but no fixture assertion was available', reasons: [] }];
  writeSameOrNew(join(provenance, 'source-holds.json'), JSON.stringify(rows, null, 2), sandbox, insideSandbox);
  return { sourceGroups: 1, boundaryGroups: 1, rows };
}

async function main() {
  const args = process.argv.slice(2), options = new Map();
  assert.equal(args.length, 6, 'Usage: asia-lahore-factory-prepare.mjs --table JSON --factory-source DIR --sandbox-root DIR');
  for (let i = 0; i < args.length; i += 2) {
    assert.ok(['--table', '--factory-source', '--sandbox-root'].includes(args[i]), `Unknown option ${args[i]}`);
    assert.ok(args[i + 1] && !args[i + 1].startsWith('--'), `Missing value for ${args[i]}`);
    assert.ok(!options.has(args[i]), `Duplicate option ${args[i]}`);
    options.set(args[i], args[i + 1]);
  }
  for (const flag of ['--table', '--factory-source', '--sandbox-root']) assert.ok(options.has(flag), `Missing ${flag}`);
  assert.equal(process.env.GITHUB_REPOSITORY, REPOSITORY, 'source repository differs');
  const tablePath = options.get('--table'), factorySource = options.get('--factory-source'), sandboxRoot = resolve(options.get('--sandbox-root'));
  assert.equal(command('git', ['-C', resolve(factorySource), 'rev-parse', 'HEAD']).trim(), FACTORY_SHA);
  const run = jsonFromCommand('gh', ['api', `repos/${REPOSITORY}/actions/runs/${PRODUCER.sourceRunId}`]);
  assert.equal(run.repository?.full_name, REPOSITORY);
  assert.equal(run.id, PRODUCER.sourceRunId);
  assert.equal(run.path, '.github/workflows/asia-lahore-source.yml');
  assert.equal(run.event, 'push');
  assert.equal(run.head_branch, 'codex/world-asia-20261011');
  assert.equal(run.head_sha, PRODUCER.sourceSha);
  assert.equal(run.status, 'completed');
  assert.equal(run.conclusion, 'success');
  const artifact = jsonFromCommand('gh', ['api', `repos/${REPOSITORY}/actions/artifacts/${ARTIFACT_ID}`]);
  assert.equal(artifact.id, ARTIFACT_ID);
  assert.equal(artifact.name, PRODUCER.sourceArtifact);
  assert.equal(artifact.size_in_bytes, ARTIFACT_SIZE);
  assert.equal(artifact.digest, ARTIFACT_DIGEST);
  assert.equal(artifact.expired, false, 'pinned source artifact expired');
  assert.ok(Date.parse(artifact.expires_at) > Date.now(), 'pinned source artifact has expired');
  assert.equal(artifact.workflow_run?.id, PRODUCER.sourceRunId);
  assert.equal(artifact.workflow_run?.head_sha, PRODUCER.sourceSha);
  mkdirSync(sandboxRoot, { recursive: true });
  const { insideSandbox } = await pinnedFactory(factorySource);
  const download = insideSandbox(join(sandboxRoot, 'downloads', PRODUCER.sourceArtifact), sandboxRoot);
  if (!existsSync(download)) {
    mkdirSync(download, { recursive: true });
    command('gh', ['run', 'download', String(PRODUCER.sourceRunId), '--repo', REPOSITORY, '--name', PRODUCER.sourceArtifact, '--dir', download]);
  } else assert.ok(lstatSync(download).isDirectory(), 'existing source download is not a regular directory');
  const prepared = await prepareLahoreArtifact({ tablePath, factorySource, sandboxRoot, sourceRoot: download });
  writeSameOrNew(join(sandboxRoot, 'provenance', 'producer-api.json'), JSON.stringify({ repository: REPOSITORY, runId: run.id, sourceSha: run.head_sha, status: run.status, conclusion: run.conclusion, artifactId: ARTIFACT_ID, artifact: PRODUCER.sourceArtifact, artifactDigest: ARTIFACT_DIGEST, artifactSize: ARTIFACT_SIZE }, null, 2), sandboxRoot, insideSandbox);
  console.log(JSON.stringify(prepared));
}

function jsonFromCommand(name, args) { return JSON.parse(command(name, args)); }

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();
