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
import shutil
import sys
import tempfile
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


def load_absent_evidence(args, timestamp):
    """Evidence that member ways absent from the clipped PBF are maritime sea-limit ways (see README-batch.md).

    The PBF cannot describe a way it does not contain, so the tags come from a reviewed file pinned by SHA-256 in the
    receipt, and the evidence must name the PBF by SHA-256. Only maritime=yes admin-0 ways recorded at a version no newer
    than the PBF that form whole rings of their own, touching no present boundary way, may be omitted.
    """
    require(args.absent_evidence, 'country boundary member ways absent from PBF and no --absent-evidence file')
    path = Path(args.absent_evidence)
    evidence = json.loads(path.read_text())
    require(evidence.get('schemaVersion') == 1 and evidence.get('countryISO') == args.country
            and evidence.get('datasetSha256') == args.expected_sha256, 'absent-way evidence schema/country/PBF mismatch')
    ways = evidence.get('ways')
    require(isinstance(ways, list) and ways, 'absent-way evidence has no ways')
    records = {}
    for way in ways:
        tags = way.get('tags') or {}
        require(isinstance(way.get('id'), int) and way['id'] not in records, 'absent-way evidence ids must be unique integers')
        require(tags.get('boundary') == 'administrative' and tags.get('admin_level') == '2' and tags.get('maritime') == 'yes',
                f"absent way {way['id']} is not a maritime=yes admin_level=2 boundary way; HOLD")
        require(isinstance(way.get('version'), int) and isinstance(way.get('timestamp'), str) and way['timestamp'] <= timestamp,
                f"absent way {way['id']} evidence is newer than the PBF snapshot")
        require(isinstance(way.get('firstNode'), int) and isinstance(way.get('lastNode'), int),
                f"absent way {way['id']} evidence has no firstNode/lastNode")
        records[way['id']] = {'id': way['id'], 'version': way['version'], 'timestamp': way['timestamp'], 'tags': tags,
                              'firstNode': way['firstNode'], 'lastNode': way['lastNode']}
    # Only whole separate rings may be omitted: every endpoint node must be shared in pairs among the absent ways themselves
    # (a closed way pairs with itself), so the absent ways close on their own and no gap is left in another ring.
    endpoints = Counter(node for record in records.values() for node in (record['firstNode'], record['lastNode']))
    require(all(count % 2 == 0 for count in endpoints.values()),
            'absent ways do not close into rings of their own (a gap in a land or maritime ring would remain); HOLD')
    return records, digest(path), set(endpoints)


def load_source_inputs(args):
    """Inputs of a merged primary+neighbour PBF (batch-run.py, source-merge.py), recorded in the receipt's source.

    The PBF itself is pinned by --expected-sha256 (the merged file); this list names the dated Geofabrik files it was
    merged from, all of the snapshot date, the primary first and equal to --dataset-url.
    """
    if not args.source_inputs:
        return None
    inputs = json.loads(Path(args.source_inputs).read_text())
    require(isinstance(inputs, list) and len(inputs) >= 2, 'source inputs must list the primary and at least one neighbour')
    require(inputs[0].get('role') == 'primary' and inputs[0].get('url') == args.dataset_url, 'first source input must be the primary dataset URL')
    for item in inputs:
        require(item.get('role') in ({'primary'} if item is inputs[0] else {'neighbour'}), 'source input roles must be primary then neighbours')
        require(item.get('snapshotDate') == args.dataset_date, 'every source input must be of the dataset snapshot date')
        require(re.fullmatch(r'[a-f0-9]{64}', item.get('sha256', '')) and re.fullmatch(r'[a-f0-9]{32}', item.get('md5', ''))
                and isinstance(item.get('bytes'), int) and item['bytes'] > 0, 'source input pins required')
    require(len({item['url'] for item in inputs}) == len(inputs), 'duplicate source input URL')
    return inputs


def write_without_absent_members(osmium, pbf, out, relation_id, absent, way_ids, node_refs):
    """Derived mini-PBF: the pinned relation minus the evidence-listed absent ways, plus the present ways and their nodes."""
    with osmium.SimpleWriter(str(out)) as writer:
        for obj in osmium.FileProcessor(str(pbf)):
            if obj.is_node():
                if obj.id in node_refs:
                    writer.add_node(obj)
            elif obj.is_way():
                if obj.id in way_ids:
                    writer.add_way(obj)
            elif obj.is_relation() and obj.id == relation_id:
                writer.add_relation(obj.replace(members=[(m.type, m.ref, m.role) for m in obj.members
                                                         if not (m.type == 'w' and m.ref in absent)]))


def extract(args):
    import osmium
    from shapely.geometry import Point, mapping, shape

    pbf = Path(args.pbf)
    args.source_inputs_record = load_source_inputs(args)
    require(pbf.stat().st_size == args.expected_bytes, 'PBF byte pin mismatch')
    require(digest(pbf) == args.expected_sha256, 'PBF SHA-256 mismatch')
    with osmium.io.Reader(str(pbf), osmium.osm.NOTHING) as reader:
        timestamp = reader.header().get('osmosis_replication_timestamp')
    require(timestamp and timestamp.startswith(args.dataset_date), 'PBF header date mismatch')
    candidates = []
    args.diagnostic['stage'] = 'admin0-relation-selection'

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
    args.diagnostic['candidateRelations'] = [{key: candidate[key] for key in ('id', 'version', 'timestamp', 'tags')} for candidate in candidates]
    require(len(candidates) == 1, f'expected one ISO admin-0 relation, found {len(candidates)}; HOLD')
    relation = candidates[0]
    boundary_members = {}
    excluded, unsupported, boundary_records = [], [], []
    for member in relation['members']:
        # OSM Relation:boundary defines subarea relations as hierarchy references. A node cannot be a boundary edge, so
        # every node member (admin_centre, label, capital, highest_point, ...) is a non-boundary reference, listed in the receipt.
        if member['type'] == 'n' or (member['type'] == 'r' and member['role'] == 'subarea'):
            excluded.append(member)
        elif member['type'] == 'w' and member['role'] in {'', 'outer', 'inner'}:
            boundary_records.append(member)
        else:
            unsupported.append(member)
    args.diagnostic.update({'stage': 'boundary-member-classification',
                            'relation': {key: relation[key] for key in ('id', 'version', 'timestamp', 'tags')},
                            'unsupportedMembers': unsupported, 'excludedNonBoundaryMembers': excluded,
                            'boundaryMemberCount': len(boundary_records)})
    require(not unsupported, 'unsupported/nested country boundary member; refusing incomplete assembly')
    for member in boundary_records:
        require(member['ref'] not in boundary_members, 'duplicate country boundary way member')
        boundary_members[member['ref']] = member['role']
    require(boundary_members, 'country relation has no boundary ways')
    args.diagnostic['stage'] = 'boundary-member-way-resolution'
    way_records, expected_edges, node_refs = {}, Counter(), set()

    class Ways(osmium.SimpleHandler):
        def way(self, way):
            if way.id not in boundary_members:
                return
            require(way.id not in way_records, 'duplicate country boundary way record')
            require(len(way.nodes) >= 2, 'country boundary way has fewer than two nodes')
            require(all(node.location.valid() for node in way.nodes), 'country boundary way has unresolved node')
            coordinates = [[node.lon, node.lat] for node in way.nodes]
            node_refs.update(node.ref for node in way.nodes)
            for a, b in zip(coordinates, coordinates[1:]):
                expected_edges[edge(a, b)] += 1
            way_records[way.id] = {**metadata(way), 'role': boundary_members[way.id],
                                   'nodeCount': len(way.nodes), 'nodeRefsSha256': value_hash([node.ref for node in way.nodes]),
                                   'geometrySha256': value_hash(coordinates)}

    Ways().apply_file(str(pbf), locations=True)
    missing_member_ways = sorted(set(boundary_members) - set(way_records))
    args.diagnostic.update({'presentBoundaryMemberWayCount': len(way_records),
                            'missingMemberWayIds': missing_member_ways})
    absent_policy, area_source = None, pbf
    if missing_member_ways:
        absent, evidence_sha, absent_endpoints = load_absent_evidence(args, timestamp)
        require(not absent_endpoints & node_refs,
                'an absent way ends on a node of a present boundary way, so it belongs to the main ring; HOLD')
        require(set(absent) == set(missing_member_ways),
                f'country boundary member ways absent from PBF {missing_member_ways} differ from evidence {sorted(absent)}; HOLD')
        workdir = Path(tempfile.mkdtemp(prefix='country-boundary-'))
        args.cleanup.append(workdir)
        derived = workdir / 'derived.osm.pbf'
        write_without_absent_members(osmium, pbf, derived, relation['id'], set(absent), set(way_records), node_refs)
        area_source = derived
        absent_policy = {'rule': 'maritime=yes admin_level=2 member ways absent from the clipped PBF are omitted; every other member must be present and the remaining rings must assemble and match every present segment',
                         'evidenceSha256': evidence_sha, 'omittedAbsentMaritimeWays': [absent[key] for key in sorted(absent)],
                         'derivedFile': 'same pinned PBF; relation member list reduced; present ways and their nodes copied unchanged'}
    require(all(count == 1 for count in expected_edges.values()), 'repeated country boundary segment; HOLD')
    args.diagnostic['stage'] = 'area-assembly'
    factory = osmium.geom.GeoJSONFactory()
    geometries = []
    country_tags = osmium.filter.TagFilter(('ISO3166-1:alpha2', args.country), ('ISO3166-1', args.country))
    processor = osmium.FileProcessor(str(area_source)).with_areas(country_tags).with_filter(osmium.filter.EntityFilter(osmium.osm.AREA))
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
    args.diagnostic['stage'] = 'complete-segment-proof'
    require(actual_edges == expected_edges, 'assembled rings did not preserve every source member segment exactly; HOLD')
    args.diagnostic['stage'] = 'fixture-membership'
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
                          'bytes': args.expected_bytes, 'sha256': args.expected_sha256, 'license': 'ODbL-1.0',
                          **({'sourceInputs': args.source_inputs_record} if args.source_inputs_record else {})},
               'relation': relation, 'memberRolePolicy': {'sourceUrl': 'https://wiki.openstreetmap.org/wiki/Relation:boundary',
                   'excludedNonBoundaryMembers': excluded, 'unsupportedMembers': []}, 'memberWays': [way_records[key] for key in sorted(way_records)],
               'assembly': {'method': 'pyosmium-area-assembly', 'completeMemberSegments': sum(expected_edges.values()),
                            'polygonCount': len(polygons), 'holeCount': sum(len(p.interiors) for p in polygons),
                            'sourceMemberEdgesSha256': value_hash(sorted(expected_edges.items()))},
               'geometry': {'path': 'boundary.geojson', 'bytes': len(geometry_bytes),
                            'sha256': hashlib.sha256(geometry_bytes).hexdigest()},
               'absentMemberPolicy': absent_policy, 'scriptSha256': digest(__file__), 'fixtureSha256': digest(args.fixture) if args.fixture else None,
               'fixtureResults': fixture_results,
               'limitations': ['OSM mapped administrative boundary, not legal-border authority',
                               'fixture points are caller-supplied pinned source samples; their origin remains in fixture receipts',
                               *(['maritime sea-limit member ways lying wholly outside the Geofabrik clip are omitted (see absentMemberPolicy); nothing inside the clip is affected'] if absent_policy else []),
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
    parser.add_argument('--absent-evidence', help='JSON evidence for maritime=yes member ways absent from the clipped PBF')
    parser.add_argument('--source-inputs', help='JSON list of the dated Geofabrik files a merged --pbf was built from (primary first)')
    parser.add_argument('--out', required=True, help='New separate output directory')
    args = parser.parse_args()
    args.diagnostic, args.cleanup = {}, []
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
        result = {'status': 'HOLD', 'reason': str(error), 'countryISO': args.country, 'scriptSha256': digest(__file__), 'diagnostic': args.diagnostic}
        (out / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
        print(json.dumps(result))
        return 1
    finally:
        for folder in args.cleanup:
            shutil.rmtree(folder, ignore_errors=True)
    out.mkdir(parents=True)
    (out / 'boundary.geojson').write_bytes(geometry)
    (out / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    (out / 'result.json').write_text(json.dumps({'status': receipt['status'], 'countryISO': args.country,
                                              'geometrySha256': receipt['geometry']['sha256']}, indent=2) + '\n')
    print(json.dumps({'status': receipt['status'], 'countryISO': args.country, 'out': str(out)}))
    return 0


if __name__ == '__main__':
    sys.exit(main())
