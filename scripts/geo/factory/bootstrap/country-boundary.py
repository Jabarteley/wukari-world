"""Prepare a complete ISO-keyed OSM admin-0 boundary from a pinned country PBF.

Requires pyosmium and Shapely (existing geo runtime). Separate boundary artifacts;
never edits the five destination-detail extraction layers. Missing or incomplete
relations HOLD. This is mapped OSM administration, not legal-border authority.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlparse


class Hold(RuntimeError):
    pass


def require(condition, message):
    if not condition:
        raise Hold(message)


def digest(path):
    result = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            result.update(block)
    return result.hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False)


def value_hash(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def metadata(obj):
    return {'id': obj.id, 'version': obj.version, 'timestamp': str(obj.timestamp)}


def edge(a, b):
    # OSM's stored coordinate resolution is 1e-7 degrees; no spatial tolerance.
    a, b = tuple(round(x, 7) for x in a), tuple(round(x, 7) for x in b)
    require(a != b, 'degenerate country boundary segment')
    require(abs(a[0] - b[0]) <= 180, 'antimeridian boundary support pending; HOLD')
    return tuple(sorted((a, b)))


def extract(args):
    import osmium
    from shapely.geometry import Point, mapping, shape

    pbf = Path(args.pbf)
    require(pbf.stat().st_size == args.expected_bytes, 'PBF byte pin mismatch')
    require(digest(pbf) == args.expected_sha256, 'PBF SHA-256 mismatch')
    with osmium.io.Reader(str(pbf), osmium.osm.NOTHING) as reader:
        timestamp = reader.header().get('osmosis_replication_timestamp')
    require(timestamp and timestamp.startswith(args.dataset_date), 'PBF header date mismatch')
    candidates = []

    class Relations(osmium.SimpleHandler):
        def relation(self, relation):
            tags = dict(relation.tags)
            if tags.get('boundary') != 'administrative' or tags.get('admin_level') != '2':
                return
            codes = [tags[key] for key in ('ISO3166-1:alpha2', 'ISO3166-1') if key in tags]
            if args.country not in codes:
                return
            require(all(code == args.country for code in codes), 'conflicting country ISO tags')
            require(tags.get('type') in {'boundary', 'multipolygon'}, 'unsupported country relation type')
            candidates.append({**metadata(relation), 'tags': tags,
                               'members': [{'type': m.type, 'ref': m.ref, 'role': m.role} for m in relation.members]})

    Relations().apply_file(str(pbf))
    require(len(candidates) == 1, f'expected one ISO admin-0 relation, found {len(candidates)}; HOLD')
    relation = candidates[0]
    boundary_members = {}
    for member in relation['members']:
        if member['type'] == 'n' and member['role'] in {'admin_centre', 'label'}:
            continue
        require(member['type'] == 'w' and member['role'] in {'', 'outer', 'inner'},
                'unsupported/nested country boundary member; refusing incomplete assembly')
        require(member['ref'] not in boundary_members, 'duplicate country boundary way member')
        boundary_members[member['ref']] = member['role']
    require(boundary_members, 'country relation has no boundary ways')
    way_records, expected_edges = {}, Counter()

    class Ways(osmium.SimpleHandler):
        def way(self, way):
            if way.id not in boundary_members:
                return
            require(way.id not in way_records, 'duplicate country boundary way record')
            require(len(way.nodes) >= 2, 'country boundary way has fewer than two nodes')
            require(all(node.location.valid() for node in way.nodes), 'country boundary way has unresolved node')
            coordinates = [[node.lon, node.lat] for node in way.nodes]
            for a, b in zip(coordinates, coordinates[1:]):
                expected_edges[edge(a, b)] += 1
            way_records[way.id] = {**metadata(way), 'role': boundary_members[way.id],
                                   'nodeCount': len(way.nodes), 'nodeRefsSha256': value_hash([node.ref for node in way.nodes]),
                                   'geometrySha256': value_hash(coordinates)}

    Ways().apply_file(str(pbf), locations=True)
    require(set(way_records) == set(boundary_members), 'country boundary member ways absent from PBF')
    require(all(count == 1 for count in expected_edges.values()), 'repeated country boundary segment; HOLD')
    factory = osmium.geom.GeoJSONFactory()
    geometries = []
    country_tags = osmium.filter.TagFilter(('ISO3166-1:alpha2', args.country), ('ISO3166-1', args.country))
    processor = osmium.FileProcessor(str(pbf)).with_areas(country_tags).with_filter(osmium.filter.EntityFilter(osmium.osm.AREA))
    for area in processor:
        if area.from_way() or area.orig_id() != relation['id']:
            continue
        area_tags = dict(area.tags)
        for key in ('boundary', 'admin_level', 'ISO3166-1:alpha2', 'ISO3166-1'):
            if key in relation['tags']:
                require(area_tags.get(key) == relation['tags'][key], 'assembled country identity tags differ from source relation')
        geometry = shape(json.loads(factory.create_multipolygon(area)))
        require(geometry.geom_type in {'Polygon', 'MultiPolygon'} and not geometry.is_empty and geometry.is_valid,
                'country area assembly yielded empty/invalid/nonpolygon geometry')
        geometries.append(geometry)
    require(len(geometries) == 1, f'expected one assembled country area, found {len(geometries)}; HOLD')
    geometry = geometries[0]
    actual_edges = Counter()
    polygons = list(geometry.geoms) if geometry.geom_type == 'MultiPolygon' else [geometry]
    for polygon in polygons:
        for ring in [polygon.exterior, *polygon.interiors]:
            coordinates = list(ring.coords)
            for a, b in zip(coordinates, coordinates[1:]):
                actual_edges[edge(a, b)] += 1
    require(actual_edges == expected_edges, 'assembled rings did not preserve every source member segment exactly; HOLD')
    fixture_results = []
    if args.fixture:
        fixture = json.loads(Path(args.fixture).read_text())
        require(fixture.get('schemaVersion') == 1 and fixture.get('countryISO') == args.country,
                'fixture schema/country mismatch')
        require(fixture.get('datasetSha256') == args.expected_sha256, 'fixture PBF pin mismatch')
        require(isinstance(fixture.get('checks'), list) and fixture['checks'], 'fixture checks required')
        seen = set()
        for check in fixture['checks']:
            require(check['ref'] not in seen, 'duplicate fixture reference')
            seen.add(check['ref'])
            point = check['point']
            require(isinstance(point, list) and len(point) == 2 and all(isinstance(v, (int, float)) for v in point),
                    'invalid fixture point')
            probe = Point(point)
            classification = 'inside' if geometry.contains(probe) else 'boundary' if geometry.covers(probe) else 'outside'
            require(check['expected'] in {'inside', 'outside'}, 'fixture expected membership unsupported')
            fixture_results.append({**check, 'actual': classification})
        require(all(check['actual'] == check['expected'] for check in fixture_results),
                'real fixture country membership failed: ' + canonical(fixture_results))
    output_geometry = mapping(geometry)
    geometry_bytes = (canonical(output_geometry) + '\n').encode()
    receipt = {'schemaVersion': 1, 'status': 'OSM_COUNTRY_BOUNDARY_CANDIDATE', 'countryISO': args.country,
               'source': {'url': args.dataset_url, 'date': args.dataset_date, 'headerTimestamp': timestamp,
                          'bytes': args.expected_bytes, 'sha256': args.expected_sha256, 'license': 'ODbL-1.0'},
               'relation': relation, 'memberWays': [way_records[key] for key in sorted(way_records)],
               'assembly': {'method': 'pyosmium-area-assembly', 'completeMemberSegments': sum(expected_edges.values()),
                            'polygonCount': len(polygons), 'holeCount': sum(len(p.interiors) for p in polygons),
                            'sourceMemberEdgesSha256': value_hash(sorted(expected_edges.items()))},
               'geometry': {'path': 'boundary.geojson', 'bytes': len(geometry_bytes),
                            'sha256': hashlib.sha256(geometry_bytes).hexdigest()},
               'scriptSha256': digest(__file__), 'fixtureSha256': digest(args.fixture) if args.fixture else None,
               'fixtureResults': fixture_results,
               'limitations': ['OSM mapped administrative boundary, not legal-border authority',
                               'fixture points are caller-supplied pinned source samples; their origin remains in fixture receipts',
                               'no city limits, selection/scaffold integration, or browser acceptance proved']}
    return geometry_bytes, receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pbf', required=True)
    parser.add_argument('--country', required=True)
    parser.add_argument('--expected-sha256', required=True)
    parser.add_argument('--expected-bytes', type=int, required=True)
    parser.add_argument('--dataset-url', required=True)
    parser.add_argument('--dataset-date', required=True)
    parser.add_argument('--fixture')
    parser.add_argument('--out', required=True, help='New separate output directory')
    args = parser.parse_args()
    out = Path(args.out)
    if out.exists():
        raise SystemExit('Output exists; use a new private folder')
    try:
        require(re.fullmatch(r'[A-Z]{2}', args.country), 'uppercase country ISO required')
        require(re.fullmatch(r'[a-f0-9]{64}', args.expected_sha256), 'PBF SHA-256 required')
        require(args.expected_bytes > 0, 'positive PBF byte pin required')
        require(re.fullmatch(r'\d{4}-\d{2}-\d{2}', args.dataset_date), 'dated PBF required')
        url = urlparse(args.dataset_url)
        require(url.scheme == 'https' and url.netloc == 'download.geofabrik.de' and url.path.endswith('.osm.pbf')
                and not url.query and not url.fragment, 'official Geofabrik PBF URL required')
        geometry, receipt = extract(args)
    except Exception as error:
        out.mkdir(parents=True)
        result = {'status': 'HOLD', 'reason': str(error), 'countryISO': args.country, 'scriptSha256': digest(__file__)}
        (out / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
        print(json.dumps(result))
        return 1
    out.mkdir(parents=True)
    (out / 'boundary.geojson').write_bytes(geometry)
    (out / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    (out / 'result.json').write_text(json.dumps({'status': receipt['status'], 'countryISO': args.country,
                                              'geometrySha256': receipt['geometry']['sha256']}, indent=2) + '\n')
    print(json.dumps({'status': receipt['status'], 'countryISO': args.country, 'out': str(out)}))
    return 0


if __name__ == '__main__':
    sys.exit(main())
