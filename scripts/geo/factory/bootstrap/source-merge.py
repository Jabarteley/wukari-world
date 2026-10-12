"""Merge a pinned Geofabrik country extract with same-snapshot neighbour extracts into ONE PBF.

Why: Geofabrik clips each country by its own polygon, so a few admin-0 member ways (a border segment, an exclave ring,
a maritime closing line) or the coastline beyond a border can be absent from the country file. The same ways are in
the neighbouring country's extract of the SAME snapshot. The fix is a complete compatible source, not splicing: the
whole primary and the whole neighbour files (same publisher, same snapshot date, same replication timestamp) are
merged object by object; every later stage runs unchanged on the merged file (see README-batch.md, Neighbour extracts).

Merge rule: a sorted union by (type, id). An object present in several inputs is written once and must be the same
version in every input (one snapshot, so identical); a version or content difference is a HOLD, never a choice.
Uses pyosmium (the workflow's pinned osmium 4.3.1), streaming, so memory does not grow with the inputs.
"""
import argparse
import json
from pathlib import Path
import re
import sys

GEOFABRIK = re.compile(r'https://download\.geofabrik\.de/(?:[a-z0-9-]+/)*([a-z0-9-]+)-([0-9]{6})\.osm\.pbf')
NEIGHBOUR_KEYS = {'url', 'bytes', 'md5', 'snapshotDate', 'reason'}
MAX_NEIGHBOURS = 3
TYPE_ORDER = {'n': 0, 'w': 1, 'r': 2}
TYPE_NAME = {'n': 'node', 'w': 'way', 'r': 'relation'}
TOOL = 'source-merge.py: pyosmium streaming sorted union; duplicate ids must carry the same version and content'


class MergeError(ValueError):
    pass


def snapshot_compact(date_text):
    return date_text[2:].replace('-', '')


def validate_neighbours(source):
    """Table field countrySource.neighbours: dated Geofabrik files of the SAME snapshot as the primary. [] when absent."""
    if 'neighbours' not in source:
        return []
    neighbours = source['neighbours']
    if not isinstance(neighbours, list) or not 1 <= len(neighbours) <= MAX_NEIGHBOURS:
        raise ValueError(f'countrySource.neighbours must list 1 to {MAX_NEIGHBOURS} neighbour extracts')
    primary = GEOFABRIK.fullmatch(source.get('url', ''))
    if not primary:
        raise ValueError('neighbour extracts need a dated Geofabrik primary URL')
    seen = {source['url']}
    for neighbour in neighbours:
        if not isinstance(neighbour, dict) or set(neighbour) != NEIGHBOUR_KEYS:
            raise ValueError('each neighbour must contain exactly ' + ', '.join(sorted(NEIGHBOUR_KEYS)))
        url = neighbour['url']
        match = GEOFABRIK.fullmatch(url) if isinstance(url, str) else None
        if not match:
            raise ValueError(f'neighbour URL must be a dated official Geofabrik .osm.pbf: {url}')
        if url in seen:
            raise ValueError(f'neighbour URL repeats the primary or another neighbour: {url}')
        seen.add(url)
        if neighbour['snapshotDate'] != source['snapshotDate'] or match[2] != primary[2] or match[2] != snapshot_compact(source['snapshotDate']):
            raise ValueError(f'neighbour {url} is not the same snapshot as the primary ({source["snapshotDate"]}); mixed snapshots are refused')
        if type(neighbour['bytes']) is not int or neighbour['bytes'] <= 0:
            raise ValueError(f'neighbour {url} needs a positive integer byte pin')
        if not isinstance(neighbour['md5'], str) or not re.fullmatch(r'[0-9a-f]{32}', neighbour['md5']):
            raise ValueError(f'neighbour {url} needs a 32-hex MD5 pin')
        if not isinstance(neighbour['reason'], str) or not neighbour['reason'].strip() or neighbour['reason'] != neighbour['reason'].strip():
            raise ValueError(f'neighbour {url} needs a non-empty reason (which absent ways or coast it supplies)')
    return neighbours


def header_record(path):
    import osmium
    with osmium.io.Reader(str(path), osmium.osm.NOTHING) as reader:
        header = reader.header()
        box = header.box()
        record = {key: header.get(key, '') for key in ('osmosis_replication_timestamp', 'osmosis_replication_sequence_number',
                                                     'osmosis_replication_base_url')}
        record['box'] = ([box.bottom_left.lon, box.bottom_left.lat, box.top_right.lon, box.top_right.lat]
                         if box.valid() else None)
    return record


def _same(first, other):
    if first.version != other.version:
        return f'versions {first.version} and {other.version}'
    if first.is_node():
        if (first.location.x, first.location.y) != (other.location.x, other.location.y):
            return 'node locations'
    elif first.is_way():
        if [node.ref for node in first.nodes] != [node.ref for node in other.nodes]:
            return 'way node lists'
    elif [(m.type, m.ref, m.role) for m in first.members] != [(m.type, m.ref, m.role) for m in other.members]:
        return 'relation member lists'
    if dict(first.tags) != dict(other.tags):
        return 'tags'
    return None


def merge(paths, out, header_values):
    """Streaming k-way merge of PBFs sorted by (type, id). Returns per-type counts and duplicate counts."""
    import osmium
    header = osmium.io.Header()
    for key, value in header_values.items():
        if value:
            header.set(key, value)
    header.set('generator', 'Allworld source-merge.py (pyosmium)')
    iterators = [iter(osmium.FileProcessor(str(path))) for path in paths]
    current, keys = [None] * len(paths), [None] * len(paths)
    per_input = [{'node': 0, 'way': 0, 'relation': 0} for _ in paths]
    written = {'node': 0, 'way': 0, 'relation': 0}
    duplicates = {'node': 0, 'way': 0, 'relation': 0}

    def advance(index):
        obj = next(iterators[index], None)
        if obj is None:
            current[index] = keys[index] = None
            return
        kind = obj.type_str()
        if kind not in TYPE_ORDER:
            raise MergeError(f'{paths[index].name}: unsupported OSM object type {kind!r}')
        key = (TYPE_ORDER[kind], obj.id)
        if keys[index] is not None and key <= keys[index]:
            raise MergeError(f'{paths[index].name}: input is not sorted by type and id at {TYPE_NAME[kind]}/{obj.id}')
        current[index], keys[index] = obj, key
        per_input[index][TYPE_NAME[kind]] += 1

    for index in range(len(paths)):
        advance(index)
    with osmium.SimpleWriter(str(out), header=header) as writer:
        while True:
            live = [key for key in keys if key is not None]
            if not live:
                break
            low = min(live)
            holders = [index for index, key in enumerate(keys) if key == low]
            first = current[holders[0]]
            kind = TYPE_NAME[first.type_str()]
            for index in holders[1:]:
                difference = _same(first, current[index])
                if difference:
                    raise MergeError(f'{kind}/{first.id} differs between {paths[holders[0]].name} and {paths[index].name} '
                                     f'({difference}); the inputs are not one snapshot; HOLD')
            if len(holders) > 1:
                duplicates[kind] += 1
            writer.add(first)
            written[kind] += 1
            for index in holders:
                advance(index)
    return {'written': written, 'duplicatesCollapsed': duplicates, 'perInput': per_input}


def merge_sources(paths, out, snapshot_date):
    """Header checks (one replication timestamp for every input, dated as the table says), then merge."""
    paths = [Path(path) for path in paths]
    if len(paths) < 2:
        raise MergeError('a merge needs the primary and at least one neighbour')
    headers = [header_record(path) for path in paths]
    timestamps = {record['osmosis_replication_timestamp'] for record in headers}
    if len(timestamps) != 1 or not next(iter(timestamps)).startswith(snapshot_date + 'T'):
        raise MergeError('inputs do not share one replication timestamp on the snapshot date '
                         f'{snapshot_date}: {[record["osmosis_replication_timestamp"] for record in headers]}; HOLD')
    primary = headers[0]
    stats = merge(paths, out, {key: primary[key] for key in ('osmosis_replication_timestamp',
                                                            'osmosis_replication_sequence_number',
                                                            'osmosis_replication_base_url')})
    merged_header = header_record(out)
    if merged_header['osmosis_replication_timestamp'] != primary['osmosis_replication_timestamp']:
        raise MergeError('merged PBF lost the replication timestamp')
    return {'tool': TOOL, 'headerTimestamp': primary['osmosis_replication_timestamp'],
            'inputHeaders': headers, 'primaryBox': primary['box'], **stats}


def box_inside(inner, outer):
    """inner is an extraction box [south, west, north, east]; outer is a header box [west, south, east, north]."""
    south, west, north, east = inner
    return outer[0] <= west and outer[1] <= south and east <= outer[2] and north <= outer[3]


def primary_scope(city_id, centre, boxes, boundary_geojson, primary_box):
    """A merged source may add data beyond the primary clip; the city itself must stay in the primary country.

    centre: inside the exact admin-0 polygon assembled from the merged file. play/core/outline boxes: inside the primary
    extract's own header box (its declared coverage). The water box may reach into the neighbour: that is what the
    neighbour is for (coast or water continuing across the border).
    """
    from shapely.geometry import Point, shape
    country = shape(json.loads(Path(boundary_geojson).read_text()))
    point = Point(centre['lon'], centre['lat'])
    if not country.contains(point):
        raise MergeError(f'{city_id}: city centre lies outside the exact admin-0 boundary of the primary country; HOLD')
    if primary_box is None:
        raise MergeError(f'{city_id}: primary extract header has no bounding box, so the city boxes cannot be proved inside it; HOLD')
    outside = [label for label in ('play', 'core', 'outline') if not box_inside(boxes[label], primary_box)]
    if outside:
        raise MergeError(f'{city_id}: extraction boxes {outside} reach beyond the primary extract box {primary_box}; HOLD')
    return {'city': city_id, 'centreInsideAdmin0': True, 'boxesInsidePrimaryExtract': ['play', 'core', 'outline'],
            'primaryHeaderBox': primary_box}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', required=True)
    parser.add_argument('--snapshot-date', required=True)
    parser.add_argument('inputs', nargs='+', help='primary PBF first, then neighbour PBFs')
    args = parser.parse_args()
    if Path(args.out).exists():
        raise SystemExit('output exists')
    print(json.dumps(merge_sources(args.inputs, Path(args.out), args.snapshot_date), indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main())
