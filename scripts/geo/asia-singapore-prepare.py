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


def prepare_table(pin, artifact, extracts, run_id, source_sha):
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
    producer = {'city': 'singapore', 'sourceRunId': run_id, 'sourceArtifact': 'asia-singapore-source-' + source_sha, 'sourceSha': source_sha, 'datasetSha256': pin['pbf']['sha256'], 'adapterSha256': pin['adapterSha256'], 'extractSha256': hashes}
    scope = {'kind': 'osm-admin0-boundary-v1', 'countryISO': 'SG', 'datasetSha256': pin['pbf']['sha256'], 'receiptSha256': pin['files']['country-boundary/receipt.json'], 'geometrySha256': pin['files']['country-boundary/boundary.geojson'], 'scriptSha256': receipt['scriptSha256'], 'receiptBytes': (artifact / 'country-boundary/receipt.json').stat().st_size, 'geometryBytes': receipt['geometry']['bytes'], 'relationId': 536780, 'boundaryKey': 'sg', 'boundaryJob': {'sourceRunId': run_id, 'sourceSha': source_sha, 'sourceArtifact': 'asia-singapore-boundary-' + source_sha}}
    sources = {**metadata['metadataSources'], 'adapterSha256': pin['adapterSha256']}
    sources['priorCandidateAdapterSha256'] = metadata['metadataSources']['adapterSha256']
    return {'expectedSourceGitSHA': pin['appSha'], 'geometryPreset': 'standard', 'targets': [{'id': 'singapore', 'name': 'Singapore', 'country': 'sg', 'extractKey': 'singapore', 'facts': metadata['facts'], 'metadataSources': sources, 'sourceJob': producer, 'extractSha256': hashes, 'countryScope': scope, 'arrivalPolicy': pin['arrivalPolicy']}]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', required=True)
    parser.add_argument('--factory-source', required=True)
    parser.add_argument('--sandbox-root', required=True)
    args = parser.parse_args()
    require(os.environ.get('GITHUB_ACTIONS') == 'true', 'Cloud-only preparation: no Mac downloads/extraction')
    root = Path(args.sandbox_root).resolve()
    require(root.is_relative_to(Path(os.environ['RUNNER_TEMP']).resolve()) and root != Path(os.environ['RUNNER_TEMP']).resolve(), 'sandbox must be below RUNNER_TEMP')
    require(not root.exists(), 'use a new sandbox')
    pin = read(args.manifest)
    require(pin['schemaVersion'] == 1, 'manifest schema mismatch')
    require(os.environ['GITHUB_REPOSITORY'] == pin['repository'], 'repository mismatch')
    factory = Path(args.factory_source).resolve()
    require(command(['git', '-C', str(factory), 'rev-parse', 'HEAD']).strip() == pin['factorySha'], 'factory SHA mismatch')
    adapter = Path(__file__).with_name('offline-extract.py')
    require(digest(adapter) == pin['adapterSha256'], 'commit the exact reviewed adapter before running')
    root.mkdir()
    provenance = root / 'provenance'
    provenance.mkdir()
    write(provenance / 'lane-manifest.json', pin)
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
    table = prepare_table(pin, artifact, root / 'extracts/singapore', int(os.environ['GITHUB_RUN_ID']), os.environ['GITHUB_SHA'])
    write(root / 'targets.json', table)
    source_publish = root / 'source-publish' / 'singapore'
    source_publish.mkdir(parents=True)
    for layer in LAYERS:
        shutil.copy2(root / 'extracts/singapore' / (layer + '.json'), source_publish / (layer + '.json'))
    boundary_publish = root / 'boundary-publish'
    boundary_publish.mkdir()
    for file in ('receipt.json', 'boundary.geojson'):
        shutil.copy2(artifact / 'country-boundary' / file, boundary_publish / file)
    write(provenance / 'source-job.json', table['targets'][0]['sourceJob'])
    write(provenance / 'source-result.json', {'status': 'SOURCE_CANDIDATE', 'holds': pin['holds'], 'arrivalPolicy': pin['arrivalPolicy'], 'priorFailedRelation': old['failedRelation']})


if __name__ == '__main__':
    main()
