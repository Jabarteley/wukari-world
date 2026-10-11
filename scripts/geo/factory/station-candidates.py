"""Build source-review candidates only. This does not open or register destinations."""
import argparse
import hashlib
import json
from pathlib import Path


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def cross(a, b, c):
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def on_segment(a, b, p):
    return abs(cross(a, b, p)) < 1e-14 and min(a[0], b[0]) <= p[0] <= max(a[0], b[0]) and min(a[1], b[1]) <= p[1] <= max(a[1], b[1])


def intersects(a, b, c, d):
    return any((on_segment(a, b, c), on_segment(a, b, d), on_segment(c, d, a), on_segment(c, d, b))) or (cross(a, b, c) * cross(a, b, d) < 0 and cross(c, d, a) * cross(c, d, b) < 0)


def simple_ring(feature):
    ring = feature['points']
    if not feature['complete'] or not feature['closedByNodeIdentity'] or len(ring) < 4 or ring[0] != ring[-1]:
        return False
    if any(abs(a[0] - b[0]) > 180 for a, b in zip(ring, ring[1:])):
        return False
    edges = list(zip(ring, ring[1:]))
    if any(a == b for a, b in edges):
        return False
    if abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in edges)) < 1e-14:
        return False
    return not any(intersects(a, b, c, d) for i, (a, b) in enumerate(edges) for j, (c, d) in enumerate(edges) if j > i + 1 and not (i == 0 and j == len(edges) - 1))


def inside(point, ring):
    result = False
    for a, b in zip(ring, ring[1:]):
        if on_segment(a, b, point):
            return False
        if (a[1] > point[1]) != (b[1] > point[1]) and point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]:
            result = not result
    return result


def contained(feature, scope):
    return simple_ring(feature) and all(inside(p, scope) for p in feature['points']) and not any(intersects(a, b, c, d) for a, b in zip(feature['points'], feature['points'][1:]) for c, d in zip(scope, scope[1:]))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('artifact', type=Path)
    parser.add_argument('table', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    table = json.loads(args.table.read_text())
    inventory_path = args.artifact / 'inventory.json'
    geometry_path = args.artifact / 'station-geometry.json'
    inventory = json.loads(inventory_path.read_text())
    geometry = json.loads(geometry_path.read_text())
    if inventory['source']['sha256'] != table['sourceSha256'] or geometry['sourceSha256'] != table['sourceSha256']:
        raise ValueError('Source SHA mismatch')
    if digest(geometry_path) != table['geometryArtifactSha256']:
        raise ValueError('Geometry artifact SHA mismatch')
    objects = {o['ref']: o for o in inventory['objects']}
    features = {f['ref']: f for f in geometry['features']}
    candidates = []
    for row in table['stations']:
        station = objects[row['stationRef']]
        scope = features.get(row.get('campusRef'))
        if scope and (not simple_ring(scope) or scope['tags'].get('amenity') != 'research_institute'):
            raise ValueError('Campus needs a complete simple mapped research-site ring')
        named_buildings = [f for f in features.values() if row['id'] in f['nearbyQueries'] and f['tags'].get('building') and (f['tags'].get('name') or f['tags'].get('name:en'))]
        buildings = []
        for feature in named_buildings:
            membership = 'unverified' if scope is None else 'inside' if contained(feature, scope['points']) else 'outside-or-contact'
            buildings.append({'ref': feature['ref'], 'version': feature['version'], 'name': feature['tags'].get('name:en', feature['tags'].get('name')), 'sourceBuildingTag': feature['tags']['building'], 'membership': membership})
        accepted = [f for f in buildings if f['membership'] == 'inside']
        holds = ['station-runtime-projection-pending', 'transport-scope-and-arrival-pending', 'station-service-contract-pending', 'five-layer-factory-extraction-pending', 'browser-and-release-gates-pending']
        if scope is None:
            holds.append('campus-membership-unverified')
        if len({f['name'] for f in accepted}) < 20:
            holds.append('ordinary-city-twenty-name-gate-not-met')
        candidates.append({'id': row['id'], 'kind': 'research-station', 'regionISO': 'AQ', 'operatorFromSource': station['tags'].get('operator'), 'stationRef': row['stationRef'], 'stationSourcePoint': station['point'], 'pointMethod': 'mapped-node' if row['stationRef'].startswith('node/') else 'first-way-node-not-arrival-anchor', 'campusRef': row.get('campusRef'), 'requiredExcludedStationRefs': row.get('requiredExcludedStationRefs', []), 'buildings': buildings, 'containedDistinctNames': len({f['name'] for f in accepted}), 'status': 'HOLD', 'holds': holds})
    receipt = {'schemaVersion': 1, 'kind': 'station-source-review', 'sourceSha256': table['sourceSha256'], 'inventorySha256': digest(inventory_path), 'geometryArtifactSha256': digest(geometry_path), 'tableSha256': digest(args.table), 'scriptSha256': digest(Path(__file__)), 'registrationAllowed': False, 'limitation': 'Source feature containment is not current occupancy, service availability, venue anchoring, transport access or release acceptance. No ordinary city gate is relaxed.', 'candidates': candidates}
    args.output.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps([{'id': c['id'], 'containedDistinctNames': c['containedDistinctNames'], 'status': c['status']} for c in candidates]))


if __name__ == '__main__':
    main()
