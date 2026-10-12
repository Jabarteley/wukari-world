"""Singapore-only exact-source preparation; downloads and extraction run on CI only."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import urllib.request

LAYERS = ('places', 'extras', 'water', 'landuse', 'roads')


SHORE_FILTER = r'''
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const input = JSON.parse(readFileSync(process.argv[1], 'utf8'));
const geometry = await import(pathToFileURL(input.geometryModule).href);
const country = await import(pathToFileURL(input.countryScopeModule).href);
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = value => createHash('sha256').update(value).digest('hex');
const ref = element => `${element.type}/${element.id}`;
const point = element => element.type === 'node' ? [element.lon, element.lat] : [element.center.lon, element.center.lat];
const name = element => (element.tags?.['name:en'] ?? element.tags?.['name:fr'] ?? element.tags?.name ?? '').replace(/\s+/g, ' ').trim();
const inBox = ([south, west, north, east], [lon, lat]) => lon >= west && lon <= east && lat >= south && lat <= north;
const elementPath = layer => input.layers[layer];
const layers = Object.fromEntries(Object.keys(input.layers).map(layer => [layer, json(elementPath(layer))]));
const boxes = layers.places.source.boxes;
const [south, west, north, east] = boxes.play;
const outline = [south - geometry.OUTLINE_MARGIN, west - geometry.OUTLINE_MARGIN, north + geometry.OUTLINE_MARGIN, east + geometry.OUTLINE_MARGIN];
const reach = geometry.reachFor(boxes.play);
const wide = [south - reach, west - reach, north + reach, east + reach];
if (JSON.stringify(wide) !== JSON.stringify(boxes.wide)) throw new Error('source wide box differs from pinned generator reachFor result');
const policy = input.geometry;
const coast = layers.water.elements.filter(element => element.type === 'way' && element.geometry && element.tags?.natural === 'coastline').map(element => element.geometry.map(vertex => [vertex.lon, vertex.lat]));
if (!coast.length) throw new Error('HOLD_SOURCE_CLASSIFICATION: Singapore source has no coastline ways');
const scope = country.loadCountryScope(input.sandboxRoot, { ...input.countryScope, directory: 'boundaries/sg' }, 'sg', input.datasetSha256);
const closedWater = layers.water.elements
  .filter(element => element.tags?.natural === 'water' || element.tags?.waterway === 'riverbank')
  .flatMap(element => geometry.polygonsOf(geometry.areaRings(element), wide, Math.max(policy.waterTolerance, .0008)))
  .filter(polygon => geometry.ringArea(polygon[0]) * 111.32 * Math.cos(polygon[0][0][1] * Math.PI / 180) * 110.57 >= (policy.minWaterKm2 ?? .4));
const onWater = candidate => closedWater.some(polygon => geometry.inRing(candidate, polygon[0]) && !polygon.slice(1).some(hole => geometry.inRing(candidate, hole)));
const unique = new Map([...layers.places.elements, ...layers.extras.elements].map(element => [ref(element), element]));
const inner = [south + .008, west + .008, north - .008, east - .008];
const eligible = [...unique.values()].filter(element => {
  const candidate = point(element);
  return scope.classify(candidate) === 'inside' && Boolean(name(element)) && inBox(inner, candidate) && !onWater(candidate);
});
const shore = geometry.shoreWater(coast, eligible.map(point), outline, wide, input.bandMetres, policy.cell / policy.split, { kind: 'coast' });
const classifications = new Map(eligible.map(element => [ref(element), shore.classify(point(element))]));
const excluded = eligible.filter(element => classifications.get(ref(element)) !== 'land').map(element => ({
  ref: ref(element), name: name(element), point: point(element), classification: classifications.get(ref(element)), tags: Object.fromEntries(Object.entries(element.tags ?? {}).sort(([a], [b]) => a.localeCompare(b))),
})).sort((a, b) => a.ref.localeCompare(b.ref, 'en', { numeric: true }));
for (const layer of ['places', 'extras']) {
  const before = layers[layer].elements;
  const filtered = before.filter(element => classifications.get(ref(element)) === undefined || classifications.get(ref(element)) === 'land');
  if (filtered.length !== before.length) {
    layers[layer].elements = filtered;
    writeFileSync(elementPath(layer), `${JSON.stringify(layers[layer], null, 2)}\n`);
  }
}
const byClassification = Object.fromEntries(['land', 'water', 'barrier', 'unresolved', 'outside'].map(kind => [kind, eligible.filter(element => classifications.get(ref(element)) === kind).length]));
const output = {
  kind: 'singapore-shore-anchor-filter-v1',
  rule: 'Remove only factory-eligible named places/extras whose exact pinned shoreWater classification is not land; preserve all other layers and coordinates.',
  geometry: {
    appSha: input.appSha,
    geometryHelperGitBlobSha: input.geometryHelperGitBlobSha,
    factorySha: input.factorySha,
    preset: input.geometry,
    play: boxes.play,
    outline,
    wide,
    reach,
    coastBandMetres: input.bandMetres,
    shoreWaterCell: policy.cell / policy.split,
    semantics: 'coast',
    coastWays: coast.length,
  },
  candidatePool: {
    eligibility: 'country inside, non-empty name, play box inset by 0.008 degrees, and not closed mapped inland water; identical to pinned factory batch.mjs before selection.',
    eligibleBefore: eligible.length,
    classifications: byClassification,
    eligibleAfter: byClassification.land,
    nonLandAfter: 0,
    excluded,
  },
  layers: Object.fromEntries(Object.keys(input.layers).map(layer => [layer, { sha256: hash(readFileSync(elementPath(layer))), elements: json(elementPath(layer)).elements.length }])),
};
writeFileSync(process.argv[2], `${JSON.stringify(output, null, 2)}\n`);
'''


def digest(path, algorithm='sha256'):
    result = hashlib.new(algorithm)
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            result.update(chunk)
    return result.hexdigest()


def read(path):
    return json.loads(Path(path).read_text())


def require(condition, message):
    if not condition:
        raise ValueError(message)


def command(args):
    return subprocess.check_output(args, text=True, timeout=1200)


def write(path, value):
    Path(path).write_text(json.dumps(value, indent=2) + '\n')


def factory_geometry_preset(factory):
    script = """import { pathToFileURL } from 'node:url';
const { GEOMETRY_PRESETS } = await import(pathToFileURL(process.argv[1]).href);
console.log(JSON.stringify(GEOMETRY_PRESETS.standard));"""
    return json.loads(command(['node', '--input-type=module', '-e', script, str(Path(factory) / 'scripts/geo/factory/inputs.mjs')]))


def prepare_table(pin, artifact, extracts, run_id, source_sha, preparation):
    """Validate existing source bytes and return a table; no network or extraction."""
    artifact, extracts = Path(artifact), Path(extracts)
    for file, expected in pin['files'].items():
        require(digest(artifact / file) == expected, 'artifact hash mismatch: ' + file)
    receipt = read(artifact / 'country-boundary/receipt.json')
    metadata = read(artifact / 'metadata/singapore/candidate/metadata.json')
    source_input = read(artifact / 'metadata/singapore/candidate/source-input.json')
    require(receipt['source']['sha256'] == pin['pbf']['sha256'], 'boundary PBF mismatch')
    require(receipt['source']['bytes'] == pin['pbf']['bytes'], 'boundary PBF bytes mismatch')
    require(receipt['relation']['id'] == 536780 and receipt['relation']['version'] == 78, 'SG relation mismatch')
    require(metadata['facts']['id'] == 'singapore', 'metadata city mismatch')
    require(source_input['boxes'] == metadata['metadataSources']['bounds']['boxes'], 'metadata boxes mismatch')
    bounds = metadata['metadataSources']['bounds']
    require(bounds['airportMarginMetres'] >= pin['arrivalPolicy']['minimumBoxMarginMetres'], 'airport clearance failed')
    hashes = {}
    for layer in LAYERS:
        file = extracts / (layer + '.json')
        raw = read(file)
        require(raw['source']['datasetSha256'] == pin['pbf']['sha256'], layer + ' PBF mismatch')
        require(raw['source']['adapterSha256'] == pin['adapterSha256'], layer + ' adapter mismatch')
        expected_boxes = {**source_input['boxes'], 'water': source_input['boxes']['wide']}
        require(raw['source']['boxes'] == expected_boxes, layer + ' boxes mismatch')
        hashes[layer] = digest(file)
    landuse = read(extracts / 'landuse.json')
    old = pin['priorFailedBoundaryArtifact']
    require(any(element['type'] == 'relation' and element['id'] == old['failedRelation'] for element in landuse['elements']), 'nested relation disappeared from landuse source')
    producer = {'city': 'singapore', 'sourceRunId': run_id, 'sourceArtifact': 'asia-singapore-source-' + source_sha, 'sourceSha': source_sha, 'datasetSha256': pin['pbf']['sha256'], 'adapterSha256': pin['adapterSha256'], 'extractSha256': hashes, 'preparationReceipt': preparation}
    scope = {'kind': 'osm-admin0-boundary-v1', 'countryISO': 'SG', 'datasetSha256': pin['pbf']['sha256'], 'receiptSha256': pin['files']['country-boundary/receipt.json'], 'geometrySha256': pin['files']['country-boundary/boundary.geojson'], 'scriptSha256': receipt['scriptSha256'], 'receiptBytes': (artifact / 'country-boundary/receipt.json').stat().st_size, 'geometryBytes': receipt['geometry']['bytes'], 'relationId': 536780, 'boundaryKey': 'sg', 'boundaryJob': {'sourceRunId': run_id, 'sourceSha': source_sha, 'sourceArtifact': 'asia-singapore-boundary-' + source_sha}}
    sources = {**metadata['metadataSources'], 'adapterSha256': pin['adapterSha256']}
    sources['priorCandidateAdapterSha256'] = metadata['metadataSources']['adapterSha256']
    return {'expectedSourceGitSHA': pin['appSha'], 'geometryPreset': 'standard', 'targets': [{'id': 'singapore', 'name': 'Singapore', 'country': 'sg', 'extractKey': 'singapore', 'facts': metadata['facts'], 'metadataSources': sources, 'sourceJob': producer, 'extractSha256': hashes, 'countryScope': scope, 'arrivalPolicy': pin['arrivalPolicy'], 'geometryOverrides': pin['farWaterRenderPolicy']['geometryOverrides']}]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', required=True)
    parser.add_argument('--app-source', required=True)
    parser.add_argument('--factory-source', required=True)
    parser.add_argument('--sandbox-root', required=True)
    args = parser.parse_args()
    require(os.environ.get('GITHUB_ACTIONS') == 'true', 'Cloud-only preparation: no Mac downloads/extraction')
    root = Path(args.sandbox_root).resolve()
    require(root.is_relative_to(Path(os.environ['RUNNER_TEMP']).resolve()) and root != Path(os.environ['RUNNER_TEMP']).resolve(), 'sandbox must be below RUNNER_TEMP')
    require(not root.exists(), 'use a new sandbox')
    pin = read(args.manifest)
    require(pin['schemaVersion'] == 2, 'manifest schema mismatch')
    require(os.environ['GITHUB_REPOSITORY'] == pin['repository'], 'repository mismatch')
    factory = Path(args.factory_source).resolve()
    require(command(['git', '-C', str(factory), 'rev-parse', 'HEAD']).strip() == pin['factorySha'], 'factory SHA mismatch')
    pinned_preset = factory_geometry_preset(factory)
    require(pin['shoreAnchorFilter']['factoryGeometryPreset'] == pinned_preset, 'lane geometry preset differs from pinned factory')
    require((pinned_preset.get('minWaterKm2') or 0.4) == 0.4, 'pinned factory inland-water threshold differs from shore filter')
    app = Path(args.app_source).resolve()
    require(command(['git', '-C', str(app), 'rev-parse', 'HEAD']).strip() == pin['appSha'], 'app SHA mismatch')
    helper = app / pin['shoreAnchorFilter']['geometryHelperPath']
    require(helper.is_file(), 'pinned geometry helper missing')
    helper_blob = command(['git', '-C', str(app), 'rev-parse', f"HEAD:{pin['shoreAnchorFilter']['geometryHelperPath']}"]).strip()
    require(helper_blob == pin['shoreAnchorFilter']['geometryHelperGitBlobSha'], 'pinned geometry helper mismatch')
    adapter = Path(__file__).with_name('offline-extract.py')
    require(digest(adapter) == pin['adapterSha256'], 'commit the exact reviewed adapter before running')
    root.mkdir()
    provenance = root / 'provenance'
    provenance.mkdir()
    write(provenance / 'lane-manifest.json', pin)
    write(provenance / 'far-water-render-policy.json', pin['farWaterRenderPolicy'])
    old = pin['priorFailedBoundaryArtifact']
    run = json.loads(command(['gh', 'api', f"repos/{pin['repository']}/actions/runs/{old['runId']}"]))
    job = json.loads(command(['gh', 'api', f"repos/{pin['repository']}/actions/jobs/{old['jobId']}"]))
    api = json.loads(command(['gh', 'api', f"repos/{pin['repository']}/actions/artifacts/{old['id']}"]))
    require(run['head_sha'] == old['sourceSha'] and run['conclusion'] == old['runConclusion'] and run['status'] == 'completed', 'old run provenance mismatch')
    require(job['run_id'] == old['runId'] and job['head_sha'] == old['sourceSha'] and job['conclusion'] == old['jobConclusion'] and job['status'] == 'completed', 'old job provenance mismatch')
    require(api['name'] == old['name'] and api['size_in_bytes'] == old['bytes'] and api['digest'] == old['digest'] and not api['expired'], 'boundary artifact API mismatch')
    require(api['workflow_run']['id'] == old['runId'] and api['workflow_run']['head_sha'] == old['sourceSha'], 'artifact producer mismatch')
    write(provenance / 'prior-failed-producer.json', {'run': run, 'job': job, 'artifact': api, 'reusePolicy': old['reusePolicy']})
    artifact = root / 'prior-source'
    command(['gh', 'run', 'download', str(old['runId']), '--repo', pin['repository'], '--name', old['name'], '--dir', str(artifact)])
    for file, expected in pin['files'].items():
        require(digest(artifact / file) == expected, 'artifact hash mismatch: ' + file)
    (root / 'boundaries').mkdir()
    shutil.copytree(artifact / 'country-boundary', root / 'boundaries/sg')
    pbf = root / 'source.osm.pbf'
    with urllib.request.urlopen(pin['pbf']['url'], timeout=120) as response, pbf.open('xb') as stream:
        shutil.copyfileobj(response, stream, 1024 * 1024)
    require(pbf.stat().st_size == pin['pbf']['bytes'], 'PBF bytes mismatch')
    for algorithm in ['sha256', 'md5']:
        require(digest(pbf, algorithm) == pin['pbf'][algorithm], 'PBF ' + algorithm + ' mismatch')
    with (provenance / 'extraction.log').open('w') as log:
        subprocess.run(['python', str(adapter), str(pbf), str(artifact / 'metadata/singapore/candidate/source-input.json'), '--dataset-url', pin['pbf']['url'], '--dataset-bytes', str(pin['pbf']['bytes']), '--dataset-md5', pin['pbf']['md5'], '--dataset-sha256', pin['pbf']['sha256'], '--output-root', str(root / 'extracts')], check=True, stdout=log, stderr=subprocess.STDOUT, timeout=1200)
    extracts = root / 'extracts/singapore'
    before = {layer: digest(extracts / (layer + '.json')) for layer in LAYERS}
    raw = read(extracts / 'places.json')
    water_recipe = raw['source']['waterRecipe']
    require(water_recipe['kind'] == 'coast' and water_recipe['sea']['kind'] == 'coast', 'Singapore water recipe is not pinned as coastal')
    require(water_recipe['sea']['bandMetres'] == pin['shoreAnchorFilter']['coastBandMetres'], 'manifest coast band differs from extracted source recipe')
    for layer in LAYERS:
        require(read(extracts / (layer + '.json'))['source']['waterRecipe'] == water_recipe, layer + ' water recipe mismatch')
    filter_input = provenance / 'shore-anchor-filter-input.json'
    filter_output = provenance / 'source-preparation.json'
    write(filter_input, {
        'appSha': pin['appSha'], 'factorySha': pin['factorySha'],
        'geometryHelperGitBlobSha': helper_blob,
        'geometryModule': str(helper),
        'countryScopeModule': str(factory / 'scripts/geo/factory/country-scope.mjs'),
        'sandboxRoot': str(root), 'countryScope': {'kind': 'osm-admin0-boundary-v1', 'countryISO': 'SG', 'datasetSha256': pin['pbf']['sha256'], 'receiptSha256': pin['files']['country-boundary/receipt.json'], 'geometrySha256': pin['files']['country-boundary/boundary.geojson'], 'scriptSha256': read(artifact / 'country-boundary/receipt.json')['scriptSha256'], 'receiptBytes': (artifact / 'country-boundary/receipt.json').stat().st_size, 'geometryBytes': read(artifact / 'country-boundary/receipt.json')['geometry']['bytes'], 'relationId': 536780, 'boundaryKey': 'sg', 'boundaryJob': {'sourceRunId': int(os.environ['GITHUB_RUN_ID']), 'sourceSha': os.environ['GITHUB_SHA'], 'sourceArtifact': 'asia-singapore-boundary-' + os.environ['GITHUB_SHA']}},
        'datasetSha256': pin['pbf']['sha256'], 'layers': {layer: str(extracts / (layer + '.json')) for layer in LAYERS},
        'geometry': pin['shoreAnchorFilter']['factoryGeometryPreset'], 'bandMetres': water_recipe['sea']['bandMetres'],
    })
    subprocess.run(['node', '--experimental-strip-types', '--input-type=module', '-e', SHORE_FILTER, str(filter_input), str(filter_output)], check=True, timeout=1200)
    preparation = read(filter_output)
    preparation['rawLayerSha256'] = before
    preparation['filteredLayerSha256'] = {layer: digest(extracts / (layer + '.json')) for layer in LAYERS}
    preparation['sourceIdentity'] = {'datasetSha256': raw['source']['datasetSha256'], 'adapterSha256': raw['source']['adapterSha256'], 'pbfHeaderTimestamp': raw['source']['pbfHeaderTimestamp']}
    preparation['sourcePreparationSha256'] = digest(Path(__file__))
    require(preparation['candidatePool']['nonLandAfter'] == 0, 'shore filter left a non-land candidate')
    write(filter_output, preparation)
    receipt = {'path': 'singapore/source-preparation.json', 'sha256': digest(filter_output), 'kind': preparation['kind'], 'sourcePreparationSha256': preparation['sourcePreparationSha256']}
    table = prepare_table(pin, artifact, extracts, int(os.environ['GITHUB_RUN_ID']), os.environ['GITHUB_SHA'], receipt)
    write(root / 'targets.json', table)
    source_publish = root / 'source-publish' / 'singapore'
    source_publish.mkdir(parents=True)
    for layer in LAYERS:
        shutil.copy2(root / 'extracts/singapore' / (layer + '.json'), source_publish / (layer + '.json'))
    shutil.copy2(filter_output, source_publish / 'source-preparation.json')
    boundary_publish = root / 'boundary-publish'
    boundary_publish.mkdir()
    for file in ('receipt.json', 'boundary.geojson'):
        shutil.copy2(artifact / 'country-boundary' / file, boundary_publish / file)
    write(provenance / 'source-job.json', table['targets'][0]['sourceJob'])
    write(provenance / 'source-result.json', {'status': 'SOURCE_CANDIDATE', 'holds': pin['holds'], 'arrivalPolicy': pin['arrivalPolicy'], 'priorFailedRelation': old['failedRelation'], 'farWaterRenderPolicy': pin['farWaterRenderPolicy']})


if __name__ == '__main__':
    main()
