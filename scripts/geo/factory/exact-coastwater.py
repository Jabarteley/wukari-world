#!/usr/bin/env python3
"""Replace generated coastal water with unsimplified source polygons (Shapely 2.1.2)."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import time

ALGORITHM = 'osm-directed-coast-closed-land-v2'
WATER_TOLERANCE_DEGREES = 0.00005
MAX_SIMPLIFICATION_AREA_FRACTION = 0.0001
SCHEMA = 'exact-coastwater-report-v1'
LIMIT = 5 * 1024 * 1024


def sha(data):
    return hashlib.sha256(data).hexdigest()


def decoded(text, pattern):
    hits = list(re.finditer(pattern, text))
    if len(hits) != 1:
        raise ValueError('Expected one unambiguous JSON source anchor: ' + pattern)
    value, length = json.JSONDecoder().raw_decode(text[hits[0].end():].lstrip())
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ['city-directory', 'recipe', 'extract-dir', 'report']:
        parser.add_argument('--' + flag, required=True, type=Path)
    args = parser.parse_args()
    started = time.perf_counter()
    args.report.parent.mkdir(parents=True, exist_ok=True)
    recipe_text = args.recipe.read_text()
    config = decoded(recipe_text, r'export const CONFIG\s*=\s*\{\s*\.\.\.\s*')
    report = {'schema': SCHEMA, 'algorithm': ALGORITHM, 'recipeSha256': sha(args.recipe.read_bytes())}
    if config.get('sea', {}).get('kind') != 'coast':
        report['status'] = 'not-applicable'
        with args.report.open('x') as f:
            json.dump(report, f, indent=2)
        return
    import numpy as np
    import shapely
    from shapely.geometry import LineString, Point, Polygon, box
    from shapely.ops import polygonize_full, unary_union
    report['shapelyVersion'] = shapely.__version__
    if shapely.__version__ != '2.1.2':
        raise ValueError('Requires pinned Shapely 2.1.2')
    extracts = {}
    hashes = {}
    for name in ['places', 'extras', 'landuse', 'roads', 'water']:
        raw = (args.extract_dir / (name + '.json')).read_bytes()
        hashes[name] = sha(raw)
        extracts[name] = json.loads(raw)
    boxes = extracts['water']['source']['boxes']
    play, wide = boxes['play'], boxes['wide']
    if play != config['box'] or wide != [play[0] - .6, play[1] - .6, play[2] + .6, play[3] + .6]:
        raise ValueError('Recipe/extract ground bounds disagree')
    for name, data in extracts.items():
        if data['source']['boxes'] != boxes:
            raise ValueError('Extract bounds disagree: ' + name)
    def bounds(b):
        if len(b) != 4 or not all(math.isfinite(v) for v in b) or not (-90 < b[0] < b[2] < 90 and -180 <= b[1] < b[3] <= 180 and b[3] - b[1] < 180):
            raise ValueError('Invalid/unsupported bounds')
        return box(b[1], b[0], b[3], b[2])
    clip = bounds(wide)
    coast = [e for e in extracts['water']['elements'] if e.get('tags', {}).get('natural') == 'coastline' and e['type'] == 'way']
    if not coast:
        raise ValueError('No source coast')
    lines, segments, closed = [], [], []
    for e in coast:
        cs = [(p['lon'], p['lat']) for p in e.get('geometry', [])]
        if len(cs) < 2 or not all(math.isfinite(v) for p in cs for v in p):
            raise ValueError('Invalid source coast geometry')
        line = LineString(cs)
        if not line.is_simple:
            raise ValueError('Self-intersecting source coastline')
        lines.append(line.intersection(clip))
        segments.extend((a, b) for a, b in zip(cs, cs[1:]) if a != b)
        if cs[0] == cs[-1]:
            p = Polygon(cs)
            if not p.is_valid:
                raise ValueError('Invalid closed coast ring')
            closed.append((str(e['id']), p))
    faces, cuts, dangles, invalid = polygonize_full(unary_union(lines + [clip.boundary]))
    if any(not g.is_empty for g in [cuts, dangles, invalid]) or faces.is_empty:
        raise ValueError('Unclosed coastline topology (cuts/dangles/invalid rings)')
    scale = np.array([111320 * math.cos(math.radians((wide[0] + wide[2]) / 2)), 111320])
    seg = np.asarray(segments) * scale
    a, v = seg[:, 0], seg[:, 1] - seg[:, 0]
    v2 = (v * v).sum(axis=1)
    def side(point):
        xy = np.array([point.x, point.y]) * scale
        u = np.clip(((xy - a) * v).sum(axis=1) / v2, 0, 1)
        distance = ((a + u[:, None] * v - xy) ** 2).sum(axis=1)
        i = int(distance.argmin())
        cross = v[i, 0] * (xy[1] - a[i, 1]) - v[i, 1] * (xy[0] - a[i, 0])
        if cross == 0:
            raise ValueError('Ambiguous coast side')
        return bool(cross > 0), float(math.sqrt(distance[i]))
    land = unary_union([p for p in faces.geoms if side(p.representative_point())[0]] + [p.intersection(clip) for _, p in closed])
    sea = clip.difference(land)
    if not sea.is_valid or sea.is_empty or land.is_empty:
        raise ValueError('Invalid land/water partition')
    # Retain source inland water above the generator minimum, including relation holes.
    inland = []
    selected_water = []
    def area_polygons(g):
        if g.is_empty:
            return []
        if g.geom_type == 'Polygon':
            return [g]
        if g.geom_type == 'MultiPolygon':
            return list(g.geoms)
        raise ValueError('Non-polygon water result')
    for e in extracts['water']['elements']:
        tags = e.get('tags', {})
        if tags.get('natural') != 'water' and tags.get('waterway') != 'riverbank':
            continue
        if e['type'] == 'way':
            cs = [(p['lon'], p['lat']) for p in e.get('geometry', [])]
            if len(cs) < 4 or cs[0] != cs[-1]:
                raise ValueError('Unclosed inland water way')
            geom = Polygon(cs)
        elif e['type'] == 'relation':
            rings = {}
            for role in ['outer', 'inner']:
                ls = [LineString([(p['lon'], p['lat']) for p in m['geometry']]) for m in e.get('members', []) if m.get('role', 'outer') == role and len(m.get('geometry', [])) > 1]
                if not ls:
                    rings[role] = Polygon()
                    continue
                fs, c, d, bad = polygonize_full(unary_union(ls))
                if any(not g.is_empty for g in [c, d, bad]):
                    raise ValueError('Unclosed inland relation')
                rings[role] = unary_union(list(fs.geoms))
            geom = rings['outer'].difference(rings['inner'])
        else:
            continue
        if not geom.is_valid:
            raise ValueError('Invalid inland water')
        kept = [p for p in area_polygons(geom.intersection(clip)) if p.area * scale[0] * scale[1] >= config.get('minWaterKm2', .4) * 1e6]
        if kept:
            inland.extend(kept)
            selected_water.append(e['type'] + '/' + str(e['id']))
    water = unary_union([sea] + inland)
    if not water.is_valid:
        raise ValueError('Invalid combined water')
    exact_water = water
    water = exact_water.simplify(WATER_TOLERANCE_DEGREES, preserve_topology=True)
    if not exact_water.is_valid or not water.is_valid:
        raise ValueError('Invalid exact/simplified water')
    def water_counts(g):
        ps = area_polygons(g)
        return {'polygons': len(ps), 'holes': sum(len(p.interiors) for p in ps), 'vertices': sum(len(p.exterior.coords) + sum(len(r.coords) for r in p.interiors) for p in ps)}
    exact_counts, simplified_counts = water_counts(exact_water), water_counts(water)
    if (exact_counts['polygons'], exact_counts['holes']) != (simplified_counts['polygons'], simplified_counts['holes']):
        raise ValueError('Simplification changed water topology')
    area_fraction = exact_water.symmetric_difference(water).area / exact_water.area
    if area_fraction > MAX_SIMPLIFICATION_AREA_FRACTION:
        raise ValueError('Simplification area change exceeds 0.01%')
    simplification = {
        'toleranceDegrees': WATER_TOLERANCE_DEGREES,
        'preserveTopology': True,
        'maximumAreaSymmetricDifferenceFraction': MAX_SIMPLIFICATION_AREA_FRACTION,
        'areaSymmetricDifferenceFraction': area_fraction,
        'signedAreaDeltaDegrees2': water.area - exact_water.area,
        'boundaryHausdorffDegreesApprox': exact_water.boundary.hausdorff_distance(water.boundary),
        'boundaryHausdorffMetresApprox': exact_water.boundary.hausdorff_distance(water.boundary) * 111320,
        'unsimplified': exact_counts,
        'simplified': simplified_counts,
        'sceneBudgetVerification': 'Requires authoritative cloud sourceScene; no triangle proxy acceptance',
    }
    island_rows = [{'ref': ident, 'preserved': not water.covers(p.representative_point()), 'exactPreserved': exact_water.intersection(p.intersection(clip)).area == 0} for ident, p in closed if not p.intersection(clip).is_empty]
    if not all(r['preserved'] for r in island_rows):
        raise ValueError('Water simplification would cover a closed coastline island representative')
    elements = {e['type'] + '/' + str(e['id']): e for name in ['places', 'extras'] for e in extracts[name]['elements']}
    anchor_rows = []
    for choice in config['places'] + [n for n in config['names'] if n['kind'] == 'neighbourhood']:
        e = elements[choice['ref']]
        p = e.get('center', e)
        point = Point(p['lon'], p['lat'])
        directed, distance = side(point)
        row = {'ref': choice['ref'], 'name': choice.get('label') or e.get('tags', {}).get('name:en') or e.get('tags', {}).get('name'), 'sourceLonLat': [point.x, point.y], 'vectorClass': 'water' if water.covers(point) else 'land', 'directedClass': 'land' if directed else 'water', 'coastDistanceM': distance}
        anchor_rows.append(row)
        if not clip.covers(point) or not land.covers(point) or water.covers(point):
            raise ValueError('Source anchor is not dry land: ' + json.dumps(row))
    generated_places = decoded((args.city_directory / 'places.ts').read_text(), r'export const PLACES[^=]*=\s*')
    facts = decoded((args.city_directory / 'facts.ts').read_text(), r'export const FACTS\s*=\s*')
    if facts['bounds'] != [play[1], play[0], play[3], play[2]]:
        raise ValueError('Generated facts bounds disagree')
    generated_anchors = []
    for place in generated_places:
        point = Point(place['lon'], place['lat'])
        row = {'name': place['name'], 'ref': place['osm'], 'vectorClass': 'water' if water.covers(point) else 'land'}
        generated_anchors.append(row)
        if not land.covers(point) or water.covers(point):
            raise ValueError('Rounded generated place is not dry land: ' + json.dumps(row))
    fixture_names = {'Apia Ferry Terminal', 'Anoamaa District Hospital', 'Narain Jetty', 'Novotel Lami Restaurant'}
    fixture_anchors = []
    for ref, e in elements.items():
        name = e.get('tags', {}).get('name')
        if name in fixture_names:
            p = e.get('center', e)
            point = Point(p['lon'], p['lat'])
            directed, distance = side(point)
            row = {'name': name, 'ref': ref, 'vectorClass': 'water' if water.covers(point) else 'land', 'directedClass': 'land' if directed else 'water', 'coastDistanceM': distance}
            fixture_anchors.append(row)
            if not land.covers(point) or water.covers(point):
                raise ValueError('Fixture anchor is not dry: ' + json.dumps(row))
    geometry_path = args.city_directory / 'geometry.ts'
    if geometry_path.stat().st_size > LIMIT:
        raise ValueError('Input geometry exceeds 5 MiB')
    geometry_before = geometry_path.read_text()
    if len(re.findall(r'export const GEOMETRY: DestinationGeometry = \{', geometry_before)) != 1:
        raise ValueError('Ambiguous GEOMETRY declaration')
    def geometry_property(key):
        hits = list(re.finditer(r'(?m)^  ' + key + r': (\[.*\]),$', geometry_before))
        if len(hits) != 1:
            raise ValueError('Ambiguous GEOMETRY.' + key)
        h = hits[0]
        arrays = json.loads(h.group(1))
        polys = [Polygon(p[0], p[1:]) for p in arrays]
        if not polys or any(not p.is_valid for p in polys):
            raise ValueError('Invalid generated GEOMETRY.' + key)
        return h, unary_union(polys)
    _, development_land = geometry_property('land')
    play_hit, old_play = geometry_property('playArea')
    overlap = development_land.intersection(water)
    # Land owns any legacy coastal sliver; never draw both layers at the same point.
    water = water.difference(development_land)
    exact_play_water = water.intersection(bounds(play))
    tile_union = unary_union([development_land, exact_play_water])
    if not water.is_valid or not tile_union.is_valid:
        raise ValueError('Invalid canonical land/water union')
    play_arrays = [[list(p.exterior.coords)] + [list(r.coords) for r in p.interiors] for p in area_polygons(tile_union)]
    play_encoded = json.dumps(play_arrays, separators=(',', ':'), allow_nan=False)
    geometry_after = geometry_before[:play_hit.start(1)] + play_encoded + geometry_before[play_hit.end(1):]
    geometry_raw = geometry_after.encode()
    if len(geometry_raw) > LIMIT:
        raise ValueError('Output geometry exceeds 5 MiB')
    tiling = {
        'originalPlayAreaDegrees2': old_play.area,
        'canonicalPlayAreaDegrees2': tile_union.area,
        'originalSymmetricDifferenceFraction': old_play.symmetric_difference(tile_union).area / old_play.area,
        'excludedPriorAreaFraction': old_play.difference(tile_union).area / old_play.area,
        'addedPriorAreaFraction': tile_union.difference(old_play).area / old_play.area,
        'landWaterOverlapRemovedDegrees2': overlap.area,
        'landWaterOverlapRemovedM2Approx': overlap.area * scale[0] * scale[1],
        'landWaterOverlapAfterDegrees2': development_land.intersection(water).area,
        'canonicalTileUnionSymmetricDifferenceDegrees2': tile_union.symmetric_difference(unary_union([development_land, exact_play_water])).area,
        'landUnchanged': True,
        'playAreaPolygons': len(play_arrays),
        'playAreaHoles': sum(len(p) - 1 for p in play_arrays),
        'playAreaVertices': sum(len(r) for p in play_arrays for r in p),
    }
    terrain_path = args.city_directory / 'terrain.ts'
    before = terrain_path.read_text()
    if len(re.findall(r'export const TERRAIN: DestinationTerrain = \{', before)) != 1:
        raise ValueError('Ambiguous TERRAIN declaration')
    stats, edits = {}, []
    for key, b in [('water', play), ('reachWater', wide)]:
        polygons = area_polygons(water.intersection(bounds(b)))
        arrays = [[list(p.exterior.coords)] + [list(r.coords) for r in p.interiors] for p in polygons]
        encoded = json.dumps(arrays, separators=(',', ':'), allow_nan=False)
        hits = list(re.finditer(r'(?m)^  ' + key + r': (\[.*\]),$', before))
        if len(hits) != 1:
            raise ValueError('Ambiguous TERRAIN.' + key)
        h = hits[0]
        json.loads(h.group(1))
        edits.append((h.start(1), h.end(1), encoded))
        stats[key] = {'polygons': len(polygons), 'rings': sum(len(p) for p in arrays), 'holes': sum(len(p) - 1 for p in arrays), 'vertices': sum(len(r) for p in arrays for r in p), 'rawTsBytes': len(encoded.encode())}
    after = before
    for start, end, encoded in sorted(edits, reverse=True):
        after = after[:start] + encoded + after[end:]
    raw_after = after.encode()
    if len(raw_after) > LIMIT:
        raise ValueError('Terrain exceeds 5 MiB')
    for path in args.city_directory.glob('*.ts'):
        if path.stat().st_size > LIMIT:
            raise ValueError('Output exceeds 5 MiB: ' + str(path))
    report.update({'status': 'passed', 'sourceHashes': hashes, 'selectedWaterRefs': selected_water, 'selectedWaterRefCount': len(coast) + len(selected_water), 'coastCount': len(coast), 'closedCoastCount': len(closed), 'islands': island_rows, 'anchors': anchor_rows, 'generatedAnchors': generated_anchors, 'fixtureAnchors': fixture_anchors, 'geometry': stats, 'simplification': simplification, 'tiling': tiling, 'outputFiles': [{'path': str(terrain_path), 'bytes': len(raw_after), 'sha256Before': sha(before.encode()), 'sha256After': sha(raw_after)}, {'path': str(geometry_path), 'bytes': len(geometry_raw), 'sha256Before': sha(geometry_before.encode()), 'sha256After': sha(geometry_raw)}], 'preferred2MiB': max(len(raw_after), len(geometry_raw)) <= 2 * 1024 * 1024, 'elapsedSeconds': time.perf_counter() - started})
    # Reserve a new report before generated-source mutations.
    with args.report.open('x') as f:
        terrain_path.write_bytes(raw_after)
        geometry_path.write_bytes(geometry_raw)
        json.dump(report, f, indent=2)
    print(json.dumps({'status': report['status'], 'report': str(args.report), 'outputFiles': report['outputFiles'], 'geometry': stats}))


if __name__ == '__main__':
    main()
