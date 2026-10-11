"""Join pinned factory layers and station facility geometry for subsequent map generation."""
import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    p = argparse.ArgumentParser()
    p.add_argument('geometry_artifact', type=Path)
    p.add_argument('layer_artifact', type=Path)
    p.add_argument('table', type=Path)
    p.add_argument('station')
    p.add_argument('output', type=Path)
    args = p.parse_args()
    if args.output.exists():
        raise ValueError('Output must be new; preserve prior candidate evidence')
    with tempfile.TemporaryDirectory() as tmp:
        review_file = Path(tmp) / 'review.json'
        subprocess.run([sys.executable, str(Path(__file__).with_name('station-candidates.py')), str(args.geometry_artifact), str(args.table), str(review_file)], check=True, stdout=subprocess.DEVNULL)
        review = json.loads(review_file.read_text())
    candidates = [c for c in review['candidates'] if c['id'] == args.station]
    if len(candidates) != 1:
        raise ValueError('Exactly one pinned station identity required')
    station = candidates[0]
    if station['campusRef'] is None:
        raise ValueError('Station campus membership is unverified; HOLD')
    geometry_file = args.geometry_artifact / 'station-geometry.json'
    geometry = json.loads(geometry_file.read_text())
    features = {f['ref']: f for f in geometry['features']}
    layer_receipt_file = args.layer_artifact / 'layer-receipt.json'
    layer_receipt = json.loads(layer_receipt_file.read_text())
    layers = {}
    for name in ('places', 'extras', 'water', 'landuse', 'roads'):
        key = f'extract/{args.station}/{name}.json'
        pin = layer_receipt[key]
        path = args.layer_artifact / key
        if sha(path) != pin['sha256'] or path.stat().st_size != pin['bytes']:
            raise ValueError(f'{name}: layer bytes/hash mismatch')
        layer = json.loads(path.read_text())
        if layer['source']['datasetSha256'] != review['sourceSha256'] or layer['source']['cityId'] != args.station:
            raise ValueError(f'{name}: source or destination mismatch')
        layers[name] = layer
    if len({l['source']['adapterSha256'] for l in layers.values()}) != 1:
        raise ValueError('Factory layers use different adapters')
    if len({json.dumps(l['source']['boxes'], sort_keys=True) for l in layers.values()}) != 1:
        raise ValueError('Factory layers use different sampling bounds')
    facilities, withheld = [], []
    for building in station['buildings']:
        target = facilities if building['membership'] == 'inside' and building['sourceDispute'] is None else withheld
        target.append({'review': building, 'sourceGeometry': features[building['ref']]})
    transport = [f for f in features.values() if args.station in f['nearbyQueries'] and f['tags'].get('aeroway')]
    holds = [h for h in station['holds'] if h != 'five-layer-factory-extraction-pending']
    result = {'schemaVersion': 1, 'kind': 'research-station-source-bundle', 'status': 'HOLD', 'registrationAllowed': False,
              'station': {k: v for k, v in station.items() if k not in ('buildings', 'holds')},
              'provenance': {'sourceSha256': review['sourceSha256'], 'geometryArtifactSha256': sha(geometry_file), 'layerReceiptSha256': sha(layer_receipt_file), 'tableSha256': sha(args.table), 'builderSha256': sha(Path(__file__)), 'reviewBuilderSha256': review['scriptSha256'], 'layerPins': {k: v for k, v in layer_receipt.items() if k.startswith(f'extract/{args.station}/')}},
              'campus': features[station['campusRef']], 'facilityCandidates': facilities, 'withheldFacilities': withheld,
              'transportGeometryCandidates': transport, 'factoryLayers': layers, 'holds': holds,
              'limitations': ['Facility candidate is not confirmed present operation or game venue.', 'Campus polygon is membership evidence, not land/coast geometry.', 'Transport is unapproved source geometry; it has no inferred public routes or service.', 'Empty urban layers are retained; no roads, landuse or services are invented.', 'No scene, runtime registration, visual acceptance or release is produced.']}
    args.output.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(json.dumps({'station': args.station, 'facilityCandidates': len(facilities), 'withheld': len(withheld), 'transportCandidates': len(transport), 'layerCounts': {k: len(v['elements']) for k, v in layers.items()}, 'bytes': args.output.stat().st_size, 'sha256': sha(args.output), 'status': 'HOLD'}))


if __name__ == '__main__':
    main()
