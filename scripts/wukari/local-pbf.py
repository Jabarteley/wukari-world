"""Read-only, three-pass complete-way extract using the pinned Wukari polygon.

Install PyOsmium outside tracked dependencies; put its directory on PYTHONPATH.
No clipping, coordinate changes or campus extent inference. Relations touching
selected objects are retained but not recursively completed or assembled.
"""
import argparse
import hashlib
import importlib.metadata
import json
from pathlib import Path
import sys
from datetime import datetime, timezone

import osmium

ROOT = Path(__file__).resolve().parents[2]
BOUNDARY_HASH = 'fdf3cf2421d730ca7bb0f0297b8a0b8a32058f5d95b4c1a4ced6e8c959c7a1fc'


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def inside_ring(x, y, ring):
    inside = False
    for a, b in zip(ring, ring[1:]):
        if (a[1] > y) != (b[1] > y):
            if x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
                inside = not inside
    return inside


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    source = args.input.resolve(strict=True)
    boundary = ROOT / 'data/wukari/verified/wukari-adm2.geojson'
    if digest(boundary) != BOUNDARY_HASH:
        raise ValueError('Pinned Wukari polygon hash mismatch')
    area = json.loads(boundary.read_text())['features'][0]['geometry']
    polygons = [area['coordinates']] if area['type'] == 'Polygon' else area['coordinates']
    vertices = [p for polygon in polygons for ring in polygon for p in ring]
    west, east = min(p[0] for p in vertices), max(p[0] for p in vertices)
    south, north = min(p[1] for p in vertices), max(p[1] for p in vertices)
    selected_nodes, selected_ways, required_nodes = set(), set(), set()
    counts = dict(nodes=0, ways=0, relations=0)
    original_hash = digest(source)
    with osmium.io.Reader(str(source)) as reader:
        header = reader.header()
        header_info = {key: header.get(key) for key in ['generator', 'osmosis_replication_timestamp', 'osmosis_replication_sequence_number', 'osmosis_replication_base_url']}
    out = args.out.resolve()
    out.mkdir(parents=False, exist_ok=False)

    class Nodes(osmium.SimpleHandler):
        def node(self, n):
            counts['nodes'] += 1
            x, y = n.location.lon, n.location.lat
            if west <= x <= east and south <= y <= north and any(inside_ring(x, y, p[0]) and not any(inside_ring(x, y, hole) for hole in p[1:]) for p in polygons):
                selected_nodes.add(n.id)

        def way(self, w):
            counts['ways'] += 1

        def relation(self, r):
            counts['relations'] += 1

    print('Pass 1: validate entire PBF and select polygon nodes', flush=True)
    Nodes().apply_file(str(source))

    class Ways(osmium.SimpleHandler):
        def way(self, w):
            if any(n.ref in selected_nodes for n in w.nodes):
                selected_ways.add(w.id)
                required_nodes.update(n.ref for n in w.nodes)

    print('Pass 2: select complete ways and original node references', flush=True)
    Ways().apply_file(str(source))
    elements = []
    writer = osmium.SimpleWriter(str(out / 'wukari-complete.osm.pbf'))

    def record(o, kind):
        item = dict(type=kind, id=o.id, version=o.version, tags=dict(o.tags))
        if o.timestamp:
            item['timestamp'] = o.timestamp.isoformat()
        if kind == 'node':
            item.update(lon=o.location.lon, lat=o.location.lat)
        elif kind == 'way':
            item['nodes'] = [n.ref for n in o.nodes]
        else:
            item['members'] = [dict(type={'n': 'node', 'w': 'way', 'r': 'relation'}[m.type], ref=m.ref, role=m.role) for m in o.members]
        elements.append(item)

    class Write(osmium.SimpleHandler):
        def node(self, n):
            if n.id in selected_nodes or n.id in required_nodes:
                writer.add_node(n)
                record(n, 'node')

        def way(self, w):
            if w.id in selected_ways:
                writer.add_way(w)
                record(w, 'way')

        def relation(self, r):
            if any((m.type == 'n' and m.ref in selected_nodes) or (m.type == 'w' and m.ref in selected_ways) for m in r.members):
                writer.add_relation(r)
                record(r, 'relation')

    print('Pass 3: preserve selected original records', flush=True)
    try:
        Write().apply_file(str(source))
    finally:
        writer.close()
    if digest(source) != original_hash:
        raise ValueError('Original changed during extraction')
    (out / 'wukari-complete.json').write_text(json.dumps(dict(version=0.6, generator='Wukari read-only PyOsmium selection', elements=elements), ensure_ascii=False) + '\n', encoding='utf-8')
    evidence = dict(schemaVersion=1, sourceFile=source.name, sourceBytes=source.stat().st_size, sourceSha256=original_hash,
                    validatedAt=datetime.now(timezone.utc).isoformat(), header=header_info, nationalRecords=counts,
                    boundarySha256=BOUNDARY_HASH, tool='PyOsmium ' + importlib.metadata.version('osmium'),
                    command=sys.argv, selectedPolygonNodes=len(selected_nodes), completeWays=len(selected_ways),
                    extractedRecords=len(elements), relations='touching selected nodes/ways; not recursively completed or assembled',
                    operation='Polygon node selection, complete original ways, complete referenced nodes; no clipping or coordinate changes',
                    outputs={p.name: dict(bytes=p.stat().st_size, sha256=digest(p)) for p in out.iterdir() if p.is_file()})
    (out / 'extraction.json').write_text(json.dumps(evidence, indent=2) + '\n')
    candidates = [e for e in elements if e['tags'].get('amenity') == 'university' or 'wukari' in e['tags'].get('name', '').lower() or 'federal' in e['tags'].get('name', '').lower()]
    (out / 'discovery.json').write_text(json.dumps(candidates, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps(dict(nationalRecords=counts, extractedRecords=len(elements), discovery=candidates), ensure_ascii=True), flush=True)


if __name__ == '__main__':
    main()
