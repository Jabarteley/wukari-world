"""Prepare a complete ISO-keyed OSM admin-0 boundary from a pinned country PBF.

Requires pyosmium and Shapely (existing geo runtime). Separate boundary artifacts;
never edits the five destination-detail extraction layers. Missing or incomplete
relations HOLD. This is mapped OSM administration, not legal-border authority.
"""
import argparse
from collections import Counter
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import shutil
import sys
import tempfile
import time
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent
TAG_EXCEPTION_KEYS = {'boundary', 'admin_level'}


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


def digest_sha_md5(path):
    sha, md5 = hashlib.sha256(), hashlib.md5()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(4 * 1024 * 1024), b''):
            sha.update(block)
            md5.update(block)
    return sha.hexdigest(), md5.hexdigest()


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

    Owner decision 2026-10-13 (France as the metropolitan extract): an evidence file that sets `"wholeSeparateRings": true`
    and a written `reason` (at least 20 characters) may also list non-maritime admin_level=2 boundary ways, for overseas
    departments and territories that lie as whole separate rings far outside the clip. The ring-closure and
    touches-no-present-way proofs below are unchanged and decide; a main-ring omission still HOLDs.
    """
    require(args.absent_evidence, 'country boundary member ways absent from PBF and no --absent-evidence file')
    path = Path(args.absent_evidence)
    evidence = json.loads(path.read_text())
    require(evidence.get('schemaVersion') == 1 and evidence.get('countryISO') == args.country, 'absent-way evidence schema/country mismatch')
    # The evidence names the --pbf it was reviewed against: by SHA-256, or (when that hash is not published in advance, e.g. a
    # 12 GB national file) by the dated URL, byte count and MD5 that the download was verified with. Exactly one of the two.
    binding = evidence.get('dataset')
    require(('datasetSha256' in evidence) != (binding is not None), 'absent-way evidence must name its PBF by datasetSha256 or by dataset {url, bytes, md5}')
    if binding is None:
        require(evidence['datasetSha256'] == args.expected_sha256, 'absent-way evidence PBF mismatch (datasetSha256)')
    else:
        require(isinstance(binding, dict) and set(binding) == {'url', 'bytes', 'md5'} and binding['url'] == args.dataset_url
                and binding['bytes'] == args.expected_bytes and binding['md5'] == args.actual_md5,
                'absent-way evidence PBF mismatch (dataset url/bytes/md5)')
    ways = evidence.get('ways')
    require(isinstance(ways, list) and ways, 'absent-way evidence has no ways')
    whole_rings = evidence.get('wholeSeparateRings') is True
    require(not whole_rings or (isinstance(evidence.get('reason'), str) and len(evidence['reason'].strip()) >= 20),
            'wholeSeparateRings evidence needs a written reason of at least 20 characters')
    records = {}
    for way in ways:
        tags = way.get('tags') or {}
        require(isinstance(way.get('id'), int) and way['id'] not in records, 'absent-way evidence ids must be unique integers')
        exception = way.get('tagException')
        if exception is not None:
            # A reviewed, written exception for a member way that carries maritime=yes but lacks boundary/admin_level tags
            # (US way 42296616, USVI Saint Croix ring). Only absent keys may be excused, never a different value.
            missing = exception.get('missingKeys') if isinstance(exception, dict) else None
            require(isinstance(exception, dict) and set(exception) == {'missingKeys', 'reason'} and isinstance(missing, list) and missing
                    and set(missing) <= TAG_EXCEPTION_KEYS and len(set(missing)) == len(missing) and not set(missing) & set(tags)
                    and isinstance(exception['reason'], str) and len(exception['reason'].strip()) >= 20,
                    f"absent way {way['id']} tagException must list only absent boundary/admin_level keys with a written reason; HOLD")
        excused = set(exception['missingKeys']) if exception else set()
        require((whole_rings or tags.get('maritime') == 'yes') and ('boundary' in excused or tags.get('boundary') == 'administrative')
                and ('admin_level' in excused or tags.get('admin_level') == '2'),
                f"absent way {way['id']} is not a maritime=yes admin_level=2 boundary way (and the evidence does not declare wholeSeparateRings); HOLD")
        require(isinstance(way.get('version'), int) and isinstance(way.get('timestamp'), str) and way['timestamp'] <= timestamp,
                f"absent way {way['id']} evidence is newer than the PBF snapshot")
        require(isinstance(way.get('firstNode'), int) and isinstance(way.get('lastNode'), int),
                f"absent way {way['id']} evidence has no firstNode/lastNode")
        records[way['id']] = {'id': way['id'], 'version': way['version'], 'timestamp': way['timestamp'], 'tags': tags,
                              'firstNode': way['firstNode'], 'lastNode': way['lastNode'], **({'tagException': exception} if exception else {})}
    # Only whole separate rings may be omitted: every endpoint node must be shared in pairs among the absent ways themselves
    # (a closed way pairs with itself), so the absent ways close on their own and no gap is left in another ring.
    endpoints = Counter(node for record in records.values() for node in (record['firstNode'], record['lastNode']))
    require(all(count % 2 == 0 for count in endpoints.values()),
            'absent ways do not close into rings of their own (a gap in a land or maritime ring would remain); HOLD')
    return records, digest(path), set(endpoints), (evidence['reason'].strip() if whole_rings else None)


def load_source_inputs(args):
    """Dated Geofabrik inputs behind --pbf, recorded in the receipt's source (README-batch.md).

    Two shapes. Neighbour merge: --pbf is the merged file (pinned by --expected-sha256); the list names the primary and
    the neighbours it was merged from. City sub-extract: --pbf is the full national (primary) file itself, --neighbour-pbf
    gives the neighbour files in list order (only the admin-0 closure is read from them), and the last entry, role
    city-extract, names the regional sub-extract the city metadata and layers are read from; this stage does not read it,
    the receipt only binds the boundary to it. All entries share the snapshot date; the primary equals --dataset-url.
    """
    if not args.source_inputs:
        require(not args.neighbour_pbf, '--neighbour-pbf requires --source-inputs')
        return None
    inputs = json.loads(Path(args.source_inputs).read_text())
    require(isinstance(inputs, list) and len(inputs) >= 2, 'source inputs must list the primary and at least one neighbour or city extract')
    require(inputs[0].get('role') == 'primary' and inputs[0].get('url') == args.dataset_url, 'first source input must be the primary dataset URL')
    city = inputs[-1].get('role') == 'city-extract'
    for index, item in enumerate(inputs):
        role = 'primary' if index == 0 else 'city-extract' if city and index == len(inputs) - 1 else 'neighbour'
        require(item.get('role') == role, 'source input roles must be primary, then neighbours, then at most one city-extract (last)')
        require(item.get('snapshotDate') == args.dataset_date, 'every source input must be of the dataset snapshot date')
        require(re.fullmatch(r'[a-f0-9]{64}', item.get('sha256', '')) and re.fullmatch(r'[a-f0-9]{32}', item.get('md5', ''))
                and isinstance(item.get('bytes'), int) and item['bytes'] > 0, 'source input pins required')
    require(len({item['url'] for item in inputs}) == len(inputs), 'duplicate source input URL')
    neighbours = [item for item in inputs if item['role'] == 'neighbour']
    if city:
        # Sub-extract mode: --pbf is the primary itself, and every neighbour file is read for the admin-0 closure only.
        require(inputs[0]['sha256'] == args.expected_sha256 and inputs[0]['bytes'] == args.expected_bytes,
                'city sub-extract mode: --pbf must be the primary input itself')
        require(len(args.neighbour_pbf) == len(neighbours), 'one --neighbour-pbf per neighbour source input, in order')
    else:
        require(not args.neighbour_pbf, '--neighbour-pbf is only for the city sub-extract mode (neighbour merges pass the merged --pbf)')
    return inputs


def _detached_way(way):
    return way.replace(nodes=[node.ref for node in way.nodes], tags={tag.k: tag.v for tag in way.tags})


def _detached_relation(relation):
    return relation.replace(members=[(m.type, m.ref, m.role) for m in relation.members], tags={tag.k: tag.v for tag in relation.tags})


def admin0_candidates(osmium, path, country):
    """Relations-only pass: every boundary=administrative admin_level=2 relation carrying the ISO code."""
    found = {}
    for relation in osmium.FileProcessor(str(path), osmium.osm.RELATION):
        tags = relation.tags
        if tags.get('boundary') != 'administrative' or tags.get('admin_level') != '2':
            continue
        if country in [tags.get(key) for key in ('ISO3166-1:alpha2', 'ISO3166-1') if key in tags]:
            found[relation.id] = _detached_relation(relation)
    return found


def stream_closure(osmium, paths, country, timestamp, workdir, diagnostic):
    """Memory-bounded admin-0 closure: the relation, its member ways and their nodes, streamed out of each input.

    Three passes per input with the pinned pyosmium, each reading one object type and filtering ids in C++ (osmium getid
    semantics): relations -> member ways -> their nodes. No location index of the whole file is built, so memory follows
    the size of the boundary (thousands of ways, a few million nodes), not of the input (a 12 GB national file). Each
    input gives one small sorted PBF; several inputs (primary + same-snapshot neighbours) are united with the
    source-merge.py rules (an object in several inputs must be identical, else HOLD). Every later step (member checks,
    area assembly, segment proof) reads this closure exactly as it read the whole file before: same objects, same result.
    """
    started = time.monotonic()
    diagnostic['stage'] = 'admin0-closure-stream'
    per_input = [admin0_candidates(osmium, path, country) for path in paths]
    ids = sorted(set().union(*per_input))
    diagnostic['candidateRelationIds'] = ids
    require(len(ids) == 1, f'expected one ISO admin-0 relation, found {len(ids)}; HOLD')
    relation_id = ids[0]
    require(relation_id in per_input[0], 'the admin-0 relation is absent from the primary PBF; HOLD')
    member_ways = {ref for kind, ref, _ in per_input[0][relation_id].members if kind == 'w'}
    header = osmium.io.Header()
    header.set('osmosis_replication_timestamp', timestamp)
    minis, summary = [], []
    for index, (path, relations) in enumerate(zip(paths, per_input)):
        ways = sorted((_detached_way(way) for way in
                       osmium.FileProcessor(str(path), osmium.osm.WAY).with_filter(osmium.filter.IdFilter(member_ways))),
                      key=lambda way: way.id) if member_ways else []
        node_ids = {ref for way in ways for ref in way.nodes}
        mini, nodes = workdir / f'closure-{index}.osm.pbf', 0
        with osmium.SimpleWriter(str(mini), header=header) as writer:
            if node_ids:
                for node in osmium.FileProcessor(str(path), osmium.osm.NODE).with_filter(osmium.filter.IdFilter(node_ids)):
                    writer.add_node(node)
                    nodes += 1
            for way in ways:
                writer.add_way(way)
            if relation_id in relations:
                writer.add_relation(relations[relation_id])
        summary.append({'input': index, 'role': 'primary' if index == 0 else 'neighbour', 'relation': relation_id in relations,
                        'memberWays': len(ways), 'nodes': nodes, 'nodeRefs': len(node_ids)})
        minis.append(mini)
    merged = None
    if len(minis) == 1:
        closure = minis[0]
    else:
        spec = importlib.util.spec_from_file_location('closure_source_merge', HERE / 'source-merge.py')
        merge = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(merge)
        closure = workdir / 'closure.osm.pbf'
        merged = merge.merge(minis, closure, {'osmosis_replication_timestamp': timestamp})
    record = {'method': 'streamed admin-0 closure: relations pass, member-way id pass, way-node id pass per input (pyosmium IdFilter); '
                        'inputs united with the source-merge.py identity rule',
              'relationId': relation_id, 'inputs': summary, 'seconds': round(time.monotonic() - started, 1),
              **({'merge': {key: merged[key] for key in ('written', 'duplicatesCollapsed')}} if merged else {})}
    diagnostic['closure'] = record
    return closure, record


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
    actual_sha, args.actual_md5 = digest_sha_md5(pbf)
    require(actual_sha == args.expected_sha256, 'PBF SHA-256 mismatch')
    with osmium.io.Reader(str(pbf), osmium.osm.NOTHING) as reader:
        timestamp = reader.header().get('osmosis_replication_timestamp')
    require(timestamp and timestamp.startswith(args.dataset_date), 'PBF header date mismatch')
    neighbour_paths = [Path(path) for path in args.neighbour_pbf]
    neighbour_pins = [item for item in (args.source_inputs_record or []) if item['role'] == 'neighbour'] if neighbour_paths else []
    for path, pin in zip(neighbour_paths, neighbour_pins):
        require(path.stat().st_size == pin['bytes'] and digest(path) == pin['sha256'], f'neighbour PBF pin mismatch: {pin["url"]}')
        with osmium.io.Reader(str(path), osmium.osm.NOTHING) as reader:
            require(reader.header().get('osmosis_replication_timestamp') == timestamp,
                    f'neighbour {pin["url"]} has another replication timestamp than the primary; mixed snapshots are refused')
    workdir = Path(tempfile.mkdtemp(prefix='country-boundary-'))
    args.cleanup.append(workdir)
    scan, closure_record = stream_closure(osmium, [pbf, *neighbour_paths], args.country, timestamp, workdir, args.diagnostic)
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

    Relations().apply_file(str(scan))
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

    Ways().apply_file(str(scan), locations=True)
    missing_member_ways = sorted(set(boundary_members) - set(way_records))
    args.diagnostic.update({'presentBoundaryMemberWayCount': len(way_records),
                            'missingMemberWayIds': missing_member_ways})
    absent_policy, area_source = None, scan
    if missing_member_ways:
        absent, evidence_sha, absent_endpoints, ring_reason = load_absent_evidence(args, timestamp)
        require(not absent_endpoints & node_refs,
                'an absent way ends on a node of a present boundary way, so it belongs to the main ring; HOLD')
        require(set(absent) == set(missing_member_ways),
                f'country boundary member ways absent from PBF {missing_member_ways} differ from evidence {sorted(absent)}; HOLD')
        derived = workdir / 'derived.osm.pbf'
        write_without_absent_members(osmium, scan, derived, relation['id'], set(absent), set(way_records), node_refs)
        area_source = derived
        absent_policy = {'rule': ('admin_level=2 member ways that form whole separate rings outside the clipped PBF (overseas territories; ' + ring_reason + ') are omitted; '
                                  if ring_reason else 'maritime=yes admin_level=2 member ways absent from the clipped PBF are omitted; ')
                                 + 'every other member must be present and the remaining rings must assemble and match every present segment; '
                                 + 'a tagException excuses only absent boundary/admin_level keys of an evidence way, with a written reason',
                         **({'wholeSeparateRings': True, 'reason': ring_reason} if ring_reason else {}),
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
               'closure': closure_record, 'relation': relation, 'memberRolePolicy': {'sourceUrl': 'https://wiki.openstreetmap.org/wiki/Relation:boundary',
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
                               *(['member ways forming whole separate rings lying wholly outside the Geofabrik clip are omitted (see absentMemberPolicy); nothing inside the clip is affected'] if absent_policy else []),
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
    parser.add_argument('--absent-evidence', help='JSON evidence for member ways absent from the clipped PBF (maritime=yes, or whole separate rings when the evidence declares wholeSeparateRings)')
    parser.add_argument('--source-inputs', help='JSON list of the dated Geofabrik inputs: primary first, then neighbours, then an optional city-extract (README-batch.md)')
    parser.add_argument('--neighbour-pbf', action='append', default=[], help='city sub-extract mode: neighbour PBFs, in source-input order; only the admin-0 closure is read')
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
