#!/usr/bin/env python3
"""Replace generated coastal water with bounded source-preserving polygons (Shapely 2.1.2)."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time

ALGORITHM = 'osm-directed-coast-closed-land-v3'
WATER_TOLERANCES_DEGREES = [0.00001, 0.00002]
COARSE_STEPS = [0.000015, 0.00002]
WATER_TOLERANCE_DEGREES = WATER_TOLERANCES_DEGREES[0]
# Water vertices of the play layer and the reach layer together. A city scene is limited to 90000 triangles (budgets.ts CITY_TRIANGLE_BUDGET); measured on
# Port Louis, 14450 vertices gave 86701 triangles and 16400 gave about 94000. The shore is first simplified to 1 m; a coast too long for the budget to 2 m.
TOTAL_WATER_VERTEX_BUDGET = 15000
GENERATOR_SEA_MARGIN_METRES = 150
GENERATOR_SEA_DISAGREEMENT = 0.01


class CoarserWater(Exception):
    pass


class FinerWater(ValueError):
    pass


class ClipTooWide(Exception):
    pass
MAX_RING_VERTICES = 6000
MAX_SERIALIZATION_AREA_FRACTION = 1e-12
MAX_GAP_SLIVER_M2 = 5000
# A face with ring contacts that has more vertices than this has a small window round each contact cut out before any constrained triangulation. Set well above the faces of the
# cities that already pass (Port Louis: a face of about 8,000 vertices, whose constrained triangulation is within budget) so their terrain and geometry stay byte-identical; Helsinki (65,064) and Stockholm (61,414) are far above it.
CONTACT_WINDOW_VERTICES = 30000
CONTACT_WINDOW_DEGREES = 0.0003
# Width of a gap sliver (area over half its perimeter) that is filled: at most this many shore-simplification tolerances (the shore of the water moves by up to one).
MAX_GAP_SLIVER_TOLERANCES = 4
# A triangle thinner than this (square degrees; about 1e-3 m2) has a signed area that rounds to zero in the renderer's ring check.
MIN_TRIANGLE_AREA_DEGREES2 = 1e-13
MAX_SIMPLIFICATION_AREA_FRACTION = 0.0001
# The area guard actually applied. Equal to the standard 0.01% except in a budget-ladder rung (below), where the runner names a documented, larger cap.
MAX_WATER_AREA_FRACTION = MAX_SIMPLIFICATION_AREA_FRACTION
# Budget ladder (target `waterBudgetLadder: true`, driven by runner.mjs / water-ladder.mjs): when the scene would exceed the triangle budget the runner restores the
# generated terrain and runs this stage again with `--ladder-tolerance-degrees` (a coarser shore) and `--ladder-area-cap` (the cap the measured area error must stay under).
# A rung is a single attempt: it never steps coarser or finer by itself, and a guard it misses exits with RUNG_INFEASIBLE_EXIT instead of retrying.
RUNG_INFEASIBLE_EXIT = 3
LADDER_RUNG = None
# A sub-extract (Geofabrik region) ends along its own polygon, so a coast chain in the wide box (play +/- 0.6 degrees) can end where the next way lies in a neighbouring region that the
# extract does not hold (Shanghai: six ends 0.4 to 11 km outside the extract, Jiangsu and Zhejiang; a country-border extension does not apply, the ends lie inside China). When the target draws
# only the play box (`sceneWaterExtent: play`) the coast beyond the outline box is never drawn, so the stage then repeats ONCE with the coast clipped to the outline box (play +/- 0.05, the
# generator's outline margin) instead of the wide box. Only a run that would have failed 'Unclosed coastline topology' ever reaches this; no passing city changes.
CLIP_FALLBACK_MARGIN_DEGREES = 0.05
CLIP_MARGIN = None
SCHEMA = 'exact-coastwater-report-v2'
LIMIT = 5 * 1024 * 1024
# A ferry terminal, jetty or promenade is often mapped on a pier a few tens of metres off the shore (Nassau: 24 m, 15 m): the shore is cleared around such an anchor.
ANCHOR_CLEARANCE_METRES = 30
BORDER_END_TOLERANCE_METRES = 10000
BORDER_END_DIRECTION_METRES = 300
BORDER_EXTENSION_MAX_INSIDE_METRES = 200
# A source extract can lose the far part of a coast: the chain ends a little short of the wide box (the next way lies outside the extract), and the end is no
# border cut either (Tel Aviv: the Gaza coast ends 1.5 km short of the south edge, 12 km from Israel's border). An unmatched end outside the pinned country within this
# distance of the wide box edge continues in its last direction to that edge, under the same rule as a border end (it may not run through the country).
CLIP_END_TOLERANCE_METRES = 3000
REACH_VERTEX_BUDGET = 6000
# The sea beyond the play box is a backdrop (the generator drew it at about 90 m): its water may differ from the source by up to 2% of its area (the play box stays within 0.01%).
REACH_MAX_AREA_FRACTION = 0.02
# Beyond the play box an islet smaller than this is not drawn in the backdrop (it cannot be seen there, and each costs scene triangles). Reported.
REACH_MIN_ISLET_M2 = 2000
REACH_RING_CLEARANCE_METRES = 3
REACH_TOLERANCES = [0.00005, 0.0001, 0.0002, 0.0003, 0.0005, 0.0008]


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
    # Optional pinned admin-0 boundary: a country extract ends at the border, so a coast way can end there (see the border extension below).
    parser.add_argument('--country-boundary', type=Path)
    # Budget-ladder rung (see LADDER_RUNG): handled by drive(); accepted here so the one parser serves both.
    parser.add_argument('--ladder-tolerance-degrees', type=float)
    parser.add_argument('--ladder-area-cap', type=float)
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
    from shapely.ops import polygonize_full, split, unary_union
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
    clip_bounds = wide if CLIP_MARGIN is None else [play[0] - CLIP_MARGIN, play[1] - CLIP_MARGIN, play[2] + CLIP_MARGIN, play[3] + CLIP_MARGIN]
    clip = bounds(clip_bounds)
    if CLIP_MARGIN is not None:
        report['coastClip'] = {'kind': 'outline-box-fallback', 'marginDegrees': CLIP_MARGIN, 'box': clip_bounds, 'reason': 'the coast chain in the wide box was not closed by the extract (a neighbouring region holds the next way) and the scene draws the play box only'}
    coast = [e for e in extracts['water']['elements'] if e.get('tags', {}).get('natural') == 'coastline' and e['type'] == 'way']
    if not coast:
        raise ValueError('No source coast')
    # A country extract is cut along Geofabrik's polygon, a little beyond the border, so it can hold short fragments of the neighbour's coast (a way of 2 or 3 vertices cut
    # at that polygon). A chain of coast ways that lies wholly outside the pinned country and ends in the open farther than BORDER_END_TOLERANCE_METRES from the border
    # is not part of this country's shore and can be neither continued nor closed; it is dropped and reported. A chain that touches the country, or whose open ends are
    # all within the tolerance, is handled by the border extension below as before.
    foreign_fragments = []
    if args.country_boundary:
        from shapely.geometry import shape
        country_early = shape(json.loads(args.country_boundary.read_bytes()))
        open_ways = [e for e in coast if e['geometry'][0] != e['geometry'][-1]]
        ends_of = {}
        for e in open_ways:
            for p in (e['geometry'][0], e['geometry'][-1]):
                ends_of.setdefault((p['lon'], p['lat']), []).append(e['id'])
        parent = {e['id']: e['id'] for e in open_ways}
        def find(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i
        for ids in ends_of.values():
            for other in ids[1:]:
                parent[find(other)] = find(ids[0])
        chains = {}
        for e in open_ways:
            chains.setdefault(find(e['id']), []).append(e)
        border_early = country_early.boundary
        dropped_ids = set()
        for ways in chains.values():
            if any(country_early.intersects(Point(p['lon'], p['lat'])) for e in ways for p in e['geometry']):
                continue
            far_open_ends = [(p['lon'], p['lat']) for e in ways for p in (e['geometry'][0], e['geometry'][-1]) if len(ends_of[(p['lon'], p['lat'])]) % 2 == 1 and Point(p['lon'], p['lat']).distance(border_early) * 111320 > BORDER_END_TOLERANCE_METRES]
            if far_open_ends:
                dropped_ids.update(e['id'] for e in ways)
                foreign_fragments.append({'ways': ['way/' + str(e['id']) for e in ways], 'openEnds': [list(c) for c in far_open_ends]})
        coast = [e for e in coast if e['id'] not in dropped_ids]
        # Closed rings (islets, ponds, a reef) are never chains, so they stay when the open chain of a neighbour's shore is dropped (Vatican City: the whole Tyrrhenian
        # chain is Italian and 24 km away, twelve closed Italian islets remain). A shore with no way inside the border tolerance of the country is not this country's shore,
        # and without the open chain the sea would otherwise be "everywhere but the islets": the country itself would be wet. Such a country has no shore.
        if coast and not any(country_early.distance(LineString([(p['lon'], p['lat']) for p in e['geometry']])) * 111320 <= BORDER_END_TOLERANCE_METRES for e in coast):
            foreign_fragments.append({'ways': ['way/' + str(e['id']) for e in coast], 'openEnds': [], 'reason': 'closed coast rings none of which lies within the border tolerance of the country'})
            coast = []
        if not coast:
            # Every coastline way of the wide box is a chain of the neighbouring country that never comes within BORDER_END_TOLERANCE_METRES of the pinned country
            # (San Marino: the Adriatic shore of Rimini, 10.7 km away): the country has no shore, so the stage reports not-applicable like an inland city (the ground is
            # masked to the country; nothing of that sea can be drawn).
            report['status'] = 'not-applicable'
            report['reason'] = 'every source coastline way lies in a neighbouring country, none within the border tolerance of the pinned country'
            report['foreignCoastFragmentsDropped'] = foreign_fragments
            with args.report.open('x') as f:
                json.dump(report, f, indent=2)
            return
    report['foreignCoastFragmentsDropped'] = foreign_fragments
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
    # A country PBF is cut at (a little beyond) the border, so a coastline way can end there while the shore goes on across it. Such an end (an end
    # that no other way meets, inside the ground box, outside the pinned admin-0 polygon but within BORDER_END_TOLERANCE_METRES of it: Geofabrik cuts
    # extracts along its own polygon, a few km past the border) continues in the direction of its last
    # BORDER_END_DIRECTION_METRES to the edge of the box. The continuation lies in the neighbouring country, where no ground is drawn (surfaces are
    # masked to the country); it only decides which side of the border end is sea. Every other unmatched end still fails below.
    border_extensions, rejected_extensions = [], []
    if args.country_boundary:
        from shapely.geometry import shape
        country = shape(json.loads(args.country_boundary.read_bytes()))
        if not country.is_valid:
            raise ValueError('Invalid country boundary')
        border_line = country.boundary
        degree = {}
        for e in coast:
            cs = [(p['lon'], p['lat']) for p in e['geometry']]
            if cs[0] != cs[-1]:
                for end in (cs[0], cs[-1]):
                    degree[end] = degree.get(end, 0) + 1
        metres = np.array([111320 * math.cos(math.radians((wide[0] + wide[2]) / 2)), 111320])
        for e in coast:
            cs = [(p['lon'], p['lat']) for p in e['geometry']]
            if cs[0] == cs[-1]:
                continue
            for at in (0, -1):
                end = cs[at]
                if degree[end] % 2 == 0 or not clip.contains(Point(end)):
                    continue
                border_distance = Point(end).distance(border_line) * 111320
                edge_distance = Point(end).distance(clip.boundary) * 111320
                near_edge = edge_distance <= CLIP_END_TOLERANCE_METRES
                if (border_distance > BORDER_END_TOLERANCE_METRES and not near_edge) or country.contains(Point(end)):
                    continue
                walk = cs[::-1] if at == 0 else cs
                # Walk back from the end to a vertex far enough away to give a steady direction.
                back = next((q for q in reversed(walk[:-1]) if math.dist(np.array(q) * metres, np.array(end) * metres) >= BORDER_END_DIRECTION_METRES), walk[0])
                vector = (np.array(end) - np.array(back)) * metres
                length = float(np.hypot(*vector))
                if length == 0:
                    raise ValueError('Coast end has no direction')
                far = tuple(np.array(end) + (vector / length * 400000) / metres)
                extension = LineString([end, far]).intersection(clip)
                parts = [g for g in (extension.geoms if hasattr(extension, 'geoms') else [extension]) if g.geom_type == 'LineString' and not g.is_empty]
                if len(parts) != 1 or tuple(parts[0].coords[0]) != end:
                    raise ValueError('Coast end extension is not a single line from the end')
                ext = list(parts[0].coords)
                inside_country = float(parts[0].intersection(country).length * 111320)
                if inside_country > BORDER_EXTENSION_MAX_INSIDE_METRES:
                    # The continuation would cut through the country itself: this end is not a plain cut at the border (a river mouth or estuary across it), so no
                    # direction is guessed; the end stays open and the stage fails naming it.
                    rejected_extensions.append({'ref': 'way/' + str(e['id']), 'end': 'start' if at == 0 else 'finish', 'lonLat': list(end), 'borderDistanceMetres': border_distance, 'metresInsideCountry': inside_country})
                    continue
                lines.append(parts[0])
                # Keep the way's own direction (land on the left) for the side test: a start end continues backwards.
                directed = ext if at == -1 else ext[::-1]
                segments.extend((a, b) for a, b in zip(directed, directed[1:]) if a != b)
                border_extensions.append({'ref': 'way/' + str(e['id']), 'end': 'start' if at == 0 else 'finish', 'borderDistanceMetres': border_distance, 'clipEdgeDistanceMetres': edge_distance, 'viaClipEdge': border_distance > BORDER_END_TOLERANCE_METRES, 'extensionMetres': float(parts[0].length * 111320), 'metresInsideCountry': inside_country})
    report['borderCoastExtensions'] = border_extensions
    faces, cuts, dangles, invalid = polygonize_full(unary_union(lines + [clip.boundary]))
    if any(not g.is_empty for g in [cuts, dangles, invalid]) or faces.is_empty:
        if CLIP_MARGIN is None and config.get('sceneWaterExtent') == 'play':
            raise ClipTooWide()
        def endpoints(g):
            return [[round(c, 6) for c in pt] for part in (g.geoms if hasattr(g, 'geoms') else [g]) if not part.is_empty for pt in (part.coords[0], part.coords[-1])]
        raise ValueError('Unclosed coastline topology (cuts/dangles/invalid rings): ' + json.dumps({'cutEnds': endpoints(cuts), 'dangleEnds': endpoints(dangles), 'invalid': len(invalid.geoms) if hasattr(invalid, 'geoms') else int(not invalid.is_empty), 'borderExtensions': len(border_extensions), 'rejectedBorderExtensions': rejected_extensions}))
    scale = np.array([111320 * math.cos(math.radians((wide[0] + wide[2]) / 2)), 111320])
    seg = np.asarray(segments) * scale
    a, v = seg[:, 0], seg[:, 1] - seg[:, 0]
    v2 = (v * v).sum(axis=1)
    a_all, v_all, v2_all = a, v, v2
    # A point is classified against the nearest shore segments only: the segments are indexed (in metres, the same scale as the arithmetic below), so a coast of hundreds of thousands
    # of segments (the Stockholm archipelago: 25,122 coastline ways) costs a lookup per point and not a pass over all segments (that took more than the runner's 15 minutes).
    segment_tree = shapely.STRtree(shapely.linestrings(np.stack([seg[:, 0], seg[:, 1]], axis=1)))
    def side(point):
        xy_all = np.array([point.x, point.y]) * scale
        probe = shapely.points(xy_all)
        first = int(segment_tree.query_nearest(probe)[0])
        first_distance = float(np.sqrt(((a[first] + np.clip(((xy_all - a[first]) * v[first]).sum() / v2[first], 0, 1) * v[first] - xy_all) ** 2).sum()))
        # Every segment within a hair of the nearest one, in their original order (ties are broken by the first, as before), then the same arithmetic on that subset.
        near = np.sort(segment_tree.query(probe, predicate='dwithin', distance=first_distance * (1 + 1e-6) + 1e-6))
        return side_among(xy_all, near)
    def side_among(xy, near):
        a, v, v2 = a_all[near], v_all[near], v2_all[near]
        u = np.clip(((xy - a) * v).sum(axis=1) / v2, 0, 1)
        distance = ((a + u[:, None] * v - xy) ** 2).sum(axis=1)
        i = int(distance.argmin())
        cross = v[i, 0] * (xy[1] - a[i, 1]) - v[i, 1] * (xy[0] - a[i, 0])
        # When the nearest point of the shore is a vertex (a point far from the shore is nearest to a corner of it), two segments tie and the sign of either one alone
        # can be wrong (the point lies in the corner's outer wedge). The left normals of all the tied segments are added (the vertex's angle-weighted normal) and the point
        # is tested against that.
        tied = np.flatnonzero(distance <= distance[i] * (1 + 1e-9) + 1e-12)
        if len(tied) > 1:
            normals = np.stack([-v[tied, 1], v[tied, 0]], axis=1) / np.sqrt(v2[tied])[:, None]
            nearest = a[i] + u[i] * v[i]
            vertex_cross = float(((xy - nearest) * normals.sum(axis=0)).sum())
            if vertex_cross != 0:
                return bool(vertex_cross > 0), float(math.sqrt(distance[i]))
        if cross == 0:
            # Exactly on a coastline segment (a shore place): the shoreline itself belongs to land; the sampled face side is never used for it.
            return True, float(math.sqrt(distance[i]))
        return bool(cross > 0), float(math.sqrt(distance[i]))
    land = unary_union([p for p in faces.geoms if side(p.representative_point())[0]] + [p.intersection(clip) for _, p in closed])
    sea = clip.difference(land)
    if not sea.is_valid or sea.is_empty or land.is_empty:
        raise ValueError('Invalid land/water partition')
    # Retain source inland water above the generator minimum, including relation holes.
    inland = []
    selected_water = []
    skipped_inland = []
    repaired_inland = []
    def area_polygons(g):
        if g.is_empty:
            return []
        if g.geom_type == 'Polygon':
            return [g]
        if g.geom_type == 'MultiPolygon':
            return list(g.geoms)
        if g.geom_type == 'GeometryCollection':
            return [p for part in g.geoms for p in area_polygons(part)]
        raise ValueError('Non-polygon water result')
    for e in extracts['water']['elements']:
        tags = e.get('tags', {})
        if tags.get('natural') != 'water' and tags.get('waterway') != 'riverbank':
            continue
        if e['type'] == 'way':
            cs = [(p['lon'], p['lat']) for p in e.get('geometry', [])]
            if len(cs) < 4 or cs[0] != cs[-1]:
                # An open natural=water way cannot be an area (cut by the extract or mis-mapped): left out and reported, never closed by guess.
                skipped_inland.append(e['type'] + '/' + str(e['id']) + ': unclosed way')
                continue
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
                    skipped_inland.append(e['type'] + '/' + str(e['id']) + ': unclosed relation rings')
                    rings = None
                    break
                rings[role] = unary_union(list(fs.geoms))
            if rings is None:
                continue
            geom = rings['outer'].difference(rings['inner'])
        else:
            continue
        if not geom.is_valid:
            # A self-intersecting water ring (a mis-drawn bow-tie: Playa Cabo Rojo, Haiti, way/1532112219) is repaired with the GEOS rule (each lobe kept as its own
            # polygon, nothing added) and listed in the report; anything that does not repair into polygons is still a failure.
            from shapely.validation import make_valid
            fixed = make_valid(geom)
            parts = [q for g in getattr(fixed, 'geoms', [fixed]) if g.geom_type in ('Polygon', 'MultiPolygon') for q in area_polygons(g)]
            if not parts or not unary_union(parts).is_valid:
                raise ValueError('Invalid inland water')
            geom = unary_union(parts)
            repaired_inland.append(e['type'] + '/' + str(e['id']))
        kept = [p for p in area_polygons(geom.intersection(clip)) if p.area * scale[0] * scale[1] >= config.get('minWaterKm2', .4) * 1e6]
        if kept:
            inland.extend(kept)
            selected_water.append(e['type'] + '/' + str(e['id']))
    water = unary_union([sea] + inland)
    source_elements = {e['type'] + '/' + str(e['id']): e for name in ['places', 'extras'] for e in extracts[name]['elements']}
    anchor_candidates = []
    for choice in config['places'] + [n for n in config['names'] if n['kind'] != 'water']:
        q = source_elements[choice['ref']]
        q = q.get('center', q)
        anchor_candidates.append((choice['ref'], Point(q['lon'], q['lat'])))
    for q in decoded((args.city_directory / 'places.ts').read_text(), r'export const PLACES[^=]*=\s*'):
        anchor_candidates.append((q['osm'], Point(q['lon'], q['lat'])))
    # The airport (every city has one: the flights, the airport venue) must be dry too. Its point is not a place or a name, so it was never an anchor and a heliport
    # on a quay or reclaimed platform (Monaco, LNMC) stayed in the generated or exact sea until the proof reported it wet. As an anchor it keeps the generator's sea only
    # when dry, and within ANCHOR_CLEARANCE_METRES of the coast the shore is cleared around it like any other shoreline anchor.
    airport_facts = decoded((args.city_directory / 'facts.ts').read_text(), r'export const FACTS\s*=\s*').get('airport')
    if airport_facts:
        anchor_candidates.append(('airport/' + str(airport_facts['id']), Point(airport_facts['lon'], airport_facts['lat'])))
    # The generator draws a sea of its own (a grid flood fill that needs the shore to be closed). Where that sea already agrees with the directed source
    # coast, it is kept as generated: away from the shore (GENERATOR_SEA_MARGIN_METRES) the generated water may not miss source sea or drown source land
    # over more than GENERATOR_SEA_DISAGREEMENT of the ground box, and no place or land name may lie in it. Where it does not (a sea left out, or land and sea swapped), the exact sea replaces it.
    terrain_text = (args.city_directory / 'terrain.ts').read_text()
    def generated_water(key):
        hits = list(re.finditer(r'(?m)^  ' + key + r': (\[.*\]),$', terrain_text))
        if len(hits) != 1:
            return None
        return unary_union([Polygon(p[0], p[1:]).buffer(0) for p in json.loads(hits[0].group(1))])
    generated = generated_water('reachWater') or generated_water('water')
    if generated is None:
        raise ValueError('Generated terrain has no water layer to compare')
    margin = GENERATOR_SEA_MARGIN_METRES / 111320
    missing = water.buffer(-margin).intersection(clip).difference(generated).area
    drowned = clip.difference(water).buffer(-margin).intersection(generated).area
    disagreement = (missing + drowned) / clip.area
    report['generatorSea'] = {'marginMetres': GENERATOR_SEA_MARGIN_METRES, 'maximumDisagreement': GENERATOR_SEA_DISAGREEMENT, 'disagreement': disagreement, 'missingSeaFraction': missing / clip.area, 'drownedLandFraction': drowned / clip.area}
    wet_in_generated = [ref for ref, point in anchor_candidates if generated.covers(point)]
    report['generatorSea']['wetPlaceRefs'] = wet_in_generated
    if disagreement <= GENERATOR_SEA_DISAGREEMENT and not wet_in_generated:
        report['status'] = 'generator-validated'
        report['sourceHashes'] = hashes
        report['coastCount'] = len(coast)
        report['borderCoastExtensions'] = border_extensions
        # Target `sceneWaterExtent: play` also holds when the generator's sea is kept: the scene draws only the water inside the play box, so the generated
        # reach layer (the backdrop beyond it) is replaced by a copy of the generated play layer, exactly as the replaced-sea path does. Nothing else changes.
        if config.get('sceneWaterExtent') == 'play':
            play_hits = list(re.finditer(r'(?m)^  water: (\[.*\]),$', terrain_text))
            reach_hits = list(re.finditer(r'(?m)^  reachWater: (\[.*\]),$', terrain_text))
            if len(play_hits) != 1 or len(reach_hits) != 1:
                raise ValueError('Ambiguous TERRAIN.water/reachWater for sceneWaterExtent play')
            played = terrain_text[:reach_hits[0].start(1)] + play_hits[0].group(1) + terrain_text[reach_hits[0].end(1):]
            (args.city_directory / 'terrain.ts').write_text(played)
            report['sceneWaterExtent'] = {'extent': 'play', 'reachWaterReplacedByPlayWater': True,
                                         'terrainSha256Before': sha(terrain_text.encode()), 'terrainSha256After': sha(played.encode())}
        with args.report.open('x') as f:
            json.dump(report, f, indent=2)
        print(json.dumps({'status': report['status'], 'report': str(args.report), 'generatorSea': report['generatorSea']}))
        return
    # A port, jetty or ferry place is often mapped exactly on the shoreline (its node is a coastline vertex), so it lies on the boundary that land and
    # water share and would count as wet. Water is removed (never added) in a small disc round such a place, so the place is dry; a place that is wet
    # by more than ANCHOR_CLEARANCE_METRES from the coast is left wet and fails the dry-anchor checks below.
    coast_boundary = unary_union(lines)
    clearances = []
    for ref, point in anchor_candidates:
        if not water.covers(point):
            continue
        distance_m = point.distance(coast_boundary) * 111320
        if distance_m > ANCHOR_CLEARANCE_METRES:
            continue
        disc = point.buffer(ANCHOR_CLEARANCE_METRES / 111320, 16)
        water = water.difference(disc)
        land = land.union(disc)
        clearances.append({'ref': ref, 'coastDistanceMetres': distance_m, 'clearanceRadiusMetres': ANCHOR_CLEARANCE_METRES})
    if not water.is_valid or not land.is_valid:
        raise ValueError('Invalid water/land after shoreline anchor clearance')
    report['shorelineAnchorClearances'] = clearances
    report['skippedInlandWater'] = skipped_inland
    report['repairedInlandWater'] = repaired_inland
    if not water.is_valid:
        raise ValueError('Invalid combined water')
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
    exact_water = water
    water = exact_water.simplify(WATER_TOLERANCE_DEGREES, preserve_topology=True)
    # A mapped islet that the simplified shore would drown is put back exactly.
    drowned_islets = [p.intersection(clip) for _, p in closed if not p.intersection(clip).is_empty and water.covers(p.representative_point()) and not exact_water.covers(p.representative_point())]
    water = water.difference(unary_union([development_land] + drowned_islets))
    if not exact_water.is_valid or not water.is_valid:
        raise ValueError('Invalid exact/simplified water')
    def water_counts(g):
        ps = area_polygons(g)
        return {'polygons': len(ps), 'holes': sum(len(p.interiors) for p in ps), 'vertices': sum(len(p.exterior.coords) + sum(len(r.coords) for r in p.interiors) for p in ps)}
    exact_counts, simplified_counts = water_counts(exact_water), water_counts(water)
    if (exact_counts['polygons'], exact_counts['holes']) != (simplified_counts['polygons'], simplified_counts['holes']):
        raise FinerWater('Simplification changed water topology')
    area_fraction = exact_water.symmetric_difference(water).area / exact_water.area
    if area_fraction > MAX_WATER_AREA_FRACTION:
        raise FinerWater('Simplification area change exceeds ' + ('%.4g%%' % (MAX_WATER_AREA_FRACTION * 100)))
    def sampled_boundary_distance(a, b, sample_limit=256):
        # Deterministic samples bound diagnostic work; this is not a Hausdorff bound.
        distances, sample_counts = [], []
        for source, target in [(a, b), (b, a)]:
            coords = shapely.get_coordinates(source.boundary)
            indices = np.unique(np.linspace(0, len(coords) - 1, min(sample_limit, len(coords)), dtype=int))
            distances.append(float(shapely.distance(shapely.points(coords[indices]), target.boundary).max()))
            sample_counts.append(len(indices))
        return max(distances), sample_counts
    sampled_distance, sample_counts = sampled_boundary_distance(exact_water, water)
    simplification = {
        'toleranceDegrees': WATER_TOLERANCE_DEGREES,
        'preserveTopology': True,
        'maximumAreaSymmetricDifferenceFraction': MAX_WATER_AREA_FRACTION,
        'areaSymmetricDifferenceFraction': area_fraction,
        'signedAreaDeltaDegrees2': water.area - exact_water.area,
        'boundaryVertexSampledDistanceDegreesApprox': sampled_distance,
        'boundaryVertexSampledDistanceMetresApprox': sampled_distance * 111320,
        'boundaryVertexSampleCounts': sample_counts,
        'boundaryVertexSamplingMethod': 'At most 256 evenly indexed vertices per direction; not a Hausdorff upper bound',
        'unsimplified': exact_counts,
        'simplified': simplified_counts,
        'sceneBudgetVerification': 'Requires authoritative cloud sourceScene; no triangle proxy acceptance',
    }
    if LADDER_RUNG is not None:
        # Recorded in the report: the shore of this rung is coarser than the standard ladder allows, and its measured area error is under the named cap (the guard above enforced it).
        report['toleranceLadder'] = {
            'rungToleranceDegrees': WATER_TOLERANCE_DEGREES, 'rungToleranceMetresApprox': WATER_TOLERANCE_DEGREES * 111320,
            'measuredWholeWaterAreaFraction': area_fraction, 'cap': MAX_WATER_AREA_FRACTION,
            'standardMaximum': MAX_SIMPLIFICATION_AREA_FRACTION,
            'rule': 'budget ladder: the standard shore overflowed the scene triangle budget, the runner asked for a coarser shore; its measured area error must stay under the cap',
        }
    island_rows = []
    for ident, p in closed:
        if p.intersection(clip).is_empty:
            continue
        point = p.representative_point()
        exact_wet, final_wet = exact_water.covers(point), water.covers(point)
        island_rows.append({
            'ref': ident, 'preserved': not final_wet,
            'exactPreserved': exact_water.intersection(p.intersection(clip)).area == 0,
            'exactRepresentativeClass': 'water' if exact_wet else 'land',
            'simplifiedRepresentativeClass': 'water' if final_wet else 'land',
            'newlyWet': not exact_wet and final_wet,
        })
    if any(r['newlyWet'] for r in island_rows):
        raise ValueError('Water simplification would newly cover a closed coastline island representative')
    elements = {e['type'] + '/' + str(e['id']): e for name in ['places', 'extras'] for e in extracts[name]['elements']}
    anchor_rows, wet_anchors = [], []
    for choice in config['places'] + [n for n in config['names'] if n['kind'] != 'water']:
        e = elements[choice['ref']]
        p = e.get('center', e)
        point = Point(p['lon'], p['lat'])
        directed, distance = side(point)
        row = {'ref': choice['ref'], 'name': choice.get('label') or e.get('tags', {}).get('name:en') or e.get('tags', {}).get('name'), 'sourceLonLat': [point.x, point.y], 'vectorClass': 'water' if water.covers(point) else 'land', 'directedClass': 'land' if directed else 'water', 'coastDistanceM': distance}
        anchor_rows.append(row)
        if not clip.covers(point) or not land.covers(point) or water.covers(point):
            wet_anchors.append(row)
    if wet_anchors:
        # All of them at once, so that one table edit (selectionExclusions) can clear every offshore place.
        raise ValueError('Source anchors are not dry land: ' + json.dumps(wet_anchors))
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
    exact_play_water = water.intersection(bounds(play))
    tile_union = unary_union([development_land, exact_play_water])
    # Where the generated land and the source water meet along a shore, a hair-thin gap (a few shore-simplification tolerances wide) can be left between them, and a triangulation of
    # that gap makes triangles with no area. Such a gap is filled (it is in neither layer, and is at most a few metres of shore); a larger hole is a real gap and stays. Reported.
    gap_slivers = [Polygon(r) for part in area_polygons(tile_union) for r in part.interiors]
    gap_slivers = [h for h in gap_slivers if h.area * scale[0] * scale[1] <= MAX_GAP_SLIVER_M2 and h.area * scale[0] * scale[1] / (h.length * scale[1] / 2) <= MAX_GAP_SLIVER_TOLERANCES * WATER_TOLERANCE_DEGREES * 111320]
    if gap_slivers:
        tile_union = unary_union([tile_union] + gap_slivers)
    report['gapSliversFilled'] = {'count': len(gap_slivers), 'areaM2': sum(h.area for h in gap_slivers) * scale[0] * scale[1]}
    if not water.is_valid or not tile_union.is_valid:
        raise ValueError('Invalid canonical land/water union')
    def touching_rings(p):
        # Pairs (i, j), i < j, of rings of the polygon that intersect: one indexed bulk query, not a test of every pair (a face of 1,058 rings is 560,000 pairs).
        rings = [p.exterior, *p.interiors]
        if len(rings) < 2:
            return rings, []
        first, second = shapely.STRtree(rings).query(rings, predicate='intersects')
        return rings, sorted({(int(i), int(j)) for i, j in zip(first, second) if i < j})
    def ring_contacts(p):
        return bool(touching_rings(p)[1])
    def topology(g):
        counts = water_counts(g)
        return {'components': counts['polygons'], 'holes': counts['holes']}

    def ring_contact_points(p):
        rings, pairs = touching_rings(p)
        found = []
        for i, j in pairs:
            touch = rings[i].intersection(rings[j])
            if not touch.is_empty:
                found.append(touch if touch.geom_type == 'Point' else touch.representative_point())
        return found

    def cut_out_contact(face):
        # Cut a small window (CONTACT_WINDOW_DEGREES, about 35 m) round the face's first ring contact out of the face: the window pieces hold the contact and are small enough to
        # triangulate exactly, the rest of the face keeps its rings and loses that contact. The pieces tile the face (checked by area), so no coast moves.
        # None when the cut does not tile the face (the caller then triangulates the whole face).
        at = ring_contact_points(face)[0]
        window = box(at.x - CONTACT_WINDOW_DEGREES * 1.0137, at.y - CONTACT_WINDOW_DEGREES * 0.9931, at.x + CONTACT_WINDOW_DEGREES * 1.0071, at.y + CONTACT_WINDOW_DEGREES * 0.9913)
        pieces = area_polygons(face.intersection(window)) + area_polygons(face.difference(window))
        if len(pieces) >= 2 and abs(sum(q.area for q in pieces) - face.area) <= face.area * 1e-12:
            return pieces
        return None

    def merge_flat_triangles(triangles):
        # The triangulation of a face with point contacts can return a triangle of (nearly) collinear vertices; the renderer rejects a ring with no area. Such a triangle is
        # merged with the neighbour it shares the longest edge with (the union covers exactly the same area, so no coast moves).
        flat = [i for i, t in enumerate(triangles) if t.area < MIN_TRIANGLE_AREA_DEGREES2]
        if not flat:
            return triangles
        tree = shapely.STRtree(triangles)
        gone, extra = set(), []
        for i in flat:
            if i in gone:
                continue
            best, best_length = None, 0
            for j in tree.query(triangles[i]):
                if j == i or j in gone:
                    continue
                shared = triangles[i].intersection(triangles[j]).length
                if shared > best_length:
                    best, best_length = int(j), shared
            if best is None:
                raise ValueError('A flat triangle has no neighbour to merge with')
            merged = unary_union([triangles[i], triangles[best]])
            if merged.geom_type != 'Polygon':
                raise ValueError('Flat triangle merge is not one polygon')
            gone.update([i, best])
            extra.append(merged)
        return [t for k, t in enumerate(triangles) if k not in gone] + extra

    def serializeNoRingContacts(g):
        faces, cuts, dangles, invalid = polygonize_full(unary_union(g.boundary))
        if any(not part.is_empty for part in [cuts, dangles, invalid]):
            raise ValueError('Invalid polygon boundary linework')
        # A face is water when the water covers most of it. The representative point alone is not enough: for a tiny face that is exactly an island of the water
        # (Singapore, two islets near Tuas) the point can fall on the boundary the two share and then `covers` is true although the face is land.
        selected = [p for p in faces.geoms if g.covers(p.representative_point()) and g.intersection(p).area > p.area / 2]
        clean, contact_splits, partition_splits, contact_windows = [], 0, 0, 0
        queue = list(selected)
        while queue:
            face = queue.pop()
            if ring_contacts(face):
                # A big face with a few point contacts (Helsinki: 1,058 rings, 2 contacts; Stockholm: 806 rings, 15) first has a small window round each contact cut out, so that constrained
                # triangles are only made of those windows; triangulating the whole face gave 66,138 triangles and a 6.7 MB geometry.ts against the 5 MiB limit.
                if sum(len(r.coords) for r in [face.exterior, *face.interiors]) > CONTACT_WINDOW_VERTICES and contact_windows < 2000:
                    pieces = cut_out_contact(face)
                    if pieces:
                        contact_windows += 1
                        queue.extend(pieces)
                        continue
                # Exact constrained triangles separate point contacts without moving a coast.
                contact_splits += 1
                queue.extend(merge_flat_triangles(list(shapely.constrained_delaunay_triangles(face).geoms)))
                continue
            largest_ring = max(len(r.coords) for r in [face.exterior, *face.interiors])
            if largest_ring <= MAX_RING_VERTICES:
                clean.append(face)
                continue
            partition_splits += 1
            if partition_splits > 10000:
                raise ValueError('Water ring partition did not converge')
            minx, miny, maxx, maxy = face.bounds
            if maxx - minx >= maxy - miny:
                x = (minx + maxx) / 2
                cutter = LineString([(x, miny - 1), (x, maxy + 1)])
            else:
                y = (miny + maxy) / 2
                cutter = LineString([(minx - 1, y), (maxx + 1, y)])
            pieces = area_polygons(split(face, cutter))
            if len(pieces) < 2:
                raise ValueError('Water ring partition made no progress')
            queue.extend(pieces)
        represented = unary_union(clean)
        difference = g.symmetric_difference(represented).area
        fraction = difference / g.area
        if (fraction > MAX_SERIALIZATION_AREA_FRACTION
                or topology(g) != topology(represented)
                or any(not p.is_valid or ring_contacts(p) for p in clean)):
            raise FinerWater('Serialization changed coverage/topology or retained ring contacts: ' + json.dumps({
                'areaFraction': fraction, 'maximumAreaFraction': MAX_SERIALIZATION_AREA_FRACTION,
                'sourceTopology': topology(g), 'representedTopology': topology(represented),
                'invalidParts': sum(not p.is_valid for p in clean), 'partsWithRingContacts': sum(ring_contacts(p) for p in clean)}))
        arrays = [[list(p.exterior.coords)] + [list(r.coords) for r in p.interiors] for p in clean]
        largest_ring = max((len(r) for p in arrays for r in p), default=0)
        if largest_ring > MAX_RING_VERTICES:
            raise ValueError('Serialized water ring exceeds vertex limit')
        return arrays, {
            'method': 'topology-preserving simplification then recursive longest-axis exact line split',
            'boundaryFaces': len(selected), 'touchFacesSplit': contact_splits,
            'partitionSplits': partition_splits,
            'serializedSymmetricDifferenceDegrees2': difference,
            'serializedSymmetricDifferenceFraction': fraction,
            'maximumSerializationAreaSymmetricDifferenceFraction': MAX_SERIALIZATION_AREA_FRACTION,
            'unionTopology': topology(represented),
            'maximumRingVertices': MAX_RING_VERTICES, 'maxRingVertices': largest_ring,
            'ringContacts': 0, 'addedPolygons': len(clean) - len(selected),
        }
    app_root = args.city_directory.resolve().parents[3]
    triangulation_helper = Path(__file__).resolve().parent / 'coast-triangulation.mjs'
    def triangulation_problems(arrays):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'polygons.json'
            path.write_text(json.dumps(arrays, allow_nan=False))
            done = subprocess.run(['node', '--experimental-strip-types', str(triangulation_helper), str(app_root), args.city_directory.name, str(path)], capture_output=True, text=True, timeout=600)
            if done.returncode != 0:
                raise ValueError('Triangulation check failed to run: ' + done.stderr[-400:])
            return json.loads(done.stdout.strip().splitlines()[-1])
    def triangulation_safe(arrays, label):
        # The renderer cuts a polygon into triangles by ear clipping, which on a long many-sided shore can fail depending on where the ring starts. Moving the start
        # vertex changes no point of the shore; the first start vertex that triangulates faithfully is kept (a polygon with none is a failure, never drawn wrong).
        arrays = [list(p) for p in arrays]
        problems = triangulation_problems(arrays)
        for fraction in [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]:
            bad = [i for i, problem in enumerate(problems) if problem]
            if not bad:
                break
            trials = []
            for i in bad:
                ring = arrays[i][0][:-1]
                k = len(ring) // fraction
                trials.append([ring[k:] + ring[:k] + [ring[k]]] + arrays[i][1:])
            for i, trial, problem in zip(bad, trials, triangulation_problems(trials)):
                if not problem:
                    arrays[i], problems[i] = trial, None
        left = [{'polygon': i, 'problem': problem} for i, problem in enumerate(problems) if problem]
        if left:
            raise ValueError(label + ' has polygons the renderer would triangulate wrongly: ' + json.dumps(left[:3]))
        return arrays
    play_arrays, play_serialization = serializeNoRingContacts(tile_union)
    play_arrays = triangulation_safe(play_arrays, 'playArea')
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
        'playAreaBoundaryFaces': play_serialization['boundaryFaces'],
        'playAreaTouchFacesSplit': play_serialization['touchFacesSplit'],
        'playAreaSerializedSymmetricDifferenceDegrees2': play_serialization['serializedSymmetricDifferenceDegrees2'],
        'playAreaRingContacts': play_serialization['ringContacts'],
        'playAreaPolygons': len(play_arrays),
        'playAreaHoles': sum(len(p) - 1 for p in play_arrays),
        'playAreaVertices': sum(len(r) for p in play_arrays for r in p),
    }
    terrain_path = args.city_directory / 'terrain.ts'
    before = terrain_path.read_text()
    if len(re.findall(r'export const TERRAIN: DestinationTerrain = \{', before)) != 1:
        raise ValueError('Ambiguous TERRAIN declaration')
    stats, edits = {}, []
    protected = [Point(r['sourceLonLat']) for r in anchor_rows]
    protected.extend(Point(p['lon'], p['lat']) for p in generated_places)
    protected.extend(p.representative_point() for _, p in closed if not p.intersection(clip).is_empty)
    play_area_box = bounds(play)
    dropped = {'islets': Polygon()}
    def serialized_layer(key, layer, baseline, maximum_fraction=MAX_WATER_AREA_FRACTION, same_topology=True):
        arrays, serialization = serializeNoRingContacts(layer)
        represented = unary_union([Polygon(p[0], p[1:]) for p in arrays])
        fraction = baseline.symmetric_difference(represented).area / baseline.area
        if fraction > maximum_fraction or (same_topology and topology(baseline) != topology(represented)):
            # The play-box water is serialized from the simplified shore: a coarser shore that misses the limit is retried with a finer one (drive); the reach layer tries its own ladder.
            raise (FinerWater if key == 'water' else ValueError)('Serialized ' + key + ' changed source coverage/topology beyond tolerance: ' + json.dumps({'areaFraction': fraction, 'maximum': maximum_fraction, 'baselineTopology': topology(baseline), 'representedTopology': topology(represented)}))
        checked = protected if key == 'water' else [pt for pt in protected if not dropped['islets'].covers(pt)]
        newly_wet = sum(not baseline.covers(point) and represented.covers(point) for point in checked)
        if newly_wet:
            raise ValueError('Serialized ' + key + ' newly covers a protected dry representative: ' + json.dumps([[round(pt.x, 6), round(pt.y, 6)] for pt in checked if not baseline.covers(pt) and represented.covers(pt)][:5]))
        serialization.update({
            'sourceSymmetricDifferenceDegrees2': baseline.symmetric_difference(represented).area,
            'sourceSymmetricDifferenceFraction': fraction,
            'maximumSourceAreaSymmetricDifferenceFraction': maximum_fraction,
            'sourceUnionTopology': topology(baseline),
            'protectedRepresentativeCount': len(checked), 'newlyWetRepresentativeCount': newly_wet,
        })
        return arrays, serialization
    def reach_candidate(fine, tolerance):
        # Beyond the play box nobody reads a shore to the metre (the generator drew it at about 130 m); the play box and a strip round it stay exact,
        # so the shore is continuous across the box edge and the play area is untouched. Water is only ever added (by up to the tolerance), outside the play box.
        if tolerance is None:
            return fine
        play_box = bounds(play)
        coarse = fine.simplify(tolerance, preserve_topology=True)
        # A mapped islet that the coarse shore would drown is put back exactly.
        drowned = [p for _, p in closed if not p.intersection(clip).is_empty and coarse.covers(p.representative_point())]
        merged = unary_union([fine.intersection(play_box.buffer(3 * tolerance, join_style=2)), coarse.difference(play_box)]).difference(unary_union(drowned))
        kept, small = [], []
        for part in area_polygons(merged):
            holes = []
            for r in part.interiors:
                if Polygon(r).intersects(play_box) or Polygon(r).area * scale[0] * scale[1] >= REACH_MIN_ISLET_M2:
                    holes.append(r)
                else:
                    small.append(Polygon(r))
            part = Polygon(part.exterior, holes)
            # A hole a hair's breadth from another ring of its polygon (a spit of land or a mangrove island that nearly touches the shore) cannot be triangulated
            # reliably by the scene's ear clipping. Such a hole is merged into the land beside it, by taking the water within REACH_RING_CLEARANCE_METRES of it
            # away: land only ever grows here, by at most that distance (in the reach layer only; the play water layer is untouched).
            rings = [part.exterior, *part.interiors]
            merge = []
            for i, ring in enumerate(rings[1:], 1):
                if any(ring.distance(other) < REACH_RING_CLEARANCE_METRES / 111320 for j, other in enumerate(rings) if j != i):
                    merge.append(Polygon(ring).buffer(REACH_RING_CLEARANCE_METRES / 111320, 8))
            kept.append(part.difference(unary_union(merge)) if merge else part)
        dropped['islets'] = unary_union(small)
        return unary_union(kept)
    # config.sceneWaterExtent 'play': the scene draws only the water inside the play box, so the reach layer is written as a copy of the play layer (no backdrop beyond it).
    play_scene = config.get('sceneWaterExtent') == 'play'
    for key, b in [('water', play)] + ([] if play_scene else [('reachWater', wide)]):
        baseline = exact_water.intersection(bounds(b))
        fine = water.intersection(bounds(b))
        if key == 'water':
            arrays, serialization = serialized_layer(key, fine, baseline)
            reach_tolerance = None
        else:
            failures, chosen = [], None
            for candidate_tolerance in [None] + REACH_TOLERANCES:
                try:
                    candidate = serialized_layer(key, reach_candidate(fine, candidate_tolerance), baseline, REACH_MAX_AREA_FRACTION if candidate_tolerance else MAX_WATER_AREA_FRACTION, candidate_tolerance is None)
                except ValueError as error:
                    failures.append({'toleranceDegrees': candidate_tolerance, 'error': str(error)})
                    continue
                chosen = (candidate, candidate_tolerance, len(area_polygons(dropped['islets'])))
                if sum(len(r) for p in candidate[0] for r in p) <= REACH_VERTEX_BUDGET:
                    break
            if chosen is None:
                raise ValueError('No reach water candidate kept the source coverage: ' + json.dumps(failures))
            (arrays, serialization), reach_tolerance, dropped_holes = chosen
            serialization['reachToleranceDegrees'] = reach_tolerance
            serialization['reachIslets'] = {'minimumAreaMetres2': REACH_MIN_ISLET_M2, 'droppedHoles': dropped_holes}
            serialization['reachRejectedCandidates'] = failures
        arrays = triangulation_safe(arrays, key)
        encoded = json.dumps(arrays, separators=(',', ':'), allow_nan=False)
        hits = list(re.finditer(r'(?m)^  ' + key + r': (\[.*\]),$', before))
        if len(hits) != 1:
            raise ValueError('Ambiguous TERRAIN.' + key)
        h = hits[0]
        json.loads(h.group(1))
        edits.append((h.start(1), h.end(1), encoded))
        stats[key] = {**serialization, 'polygons': len(arrays), 'rings': sum(len(p) for p in arrays), 'holes': sum(len(p) - 1 for p in arrays), 'vertices': sum(len(r) for p in arrays for r in p), 'rawTsBytes': len(encoded.encode())}
        if play_scene:
            copies = list(re.finditer(r'(?m)^  reachWater: (\[.*\]),$', before))
            if len(copies) != 1:
                raise ValueError('Ambiguous TERRAIN.reachWater')
            edits.append((copies[0].start(1), copies[0].end(1), encoded))
            stats['reachWater'] = {**stats[key], 'sceneWaterExtent': 'play'}
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
    if LADDER_RUNG is not None:
        # The cap is enforced on the fraction of the PLAY-box water that differs from the exact source water (the stricter figure); both are recorded.
        play_fraction = stats['water']['sourceSymmetricDifferenceFraction']
        report['toleranceLadder'].update({'measuredPlayWaterAreaFraction': play_fraction, 'relaxesStandardGuard': max(play_fraction, area_fraction) > MAX_SIMPLIFICATION_AREA_FRACTION})
    # Reserve a new report before generated-source mutations.
    water_vertices = stats['water']['vertices'] + (0 if play_scene else stats['reachWater']['vertices'])
    report['waterVertices'] = water_vertices
    if water_vertices > TOTAL_WATER_VERTEX_BUDGET and COARSE_STEPS:
        raise CoarserWater()
    with args.report.open('x') as f:
        terrain_path.write_bytes(raw_after)
        geometry_path.write_bytes(geometry_raw)
        json.dump(report, f, indent=2)
    print(json.dumps({'status': report['status'], 'report': str(args.report), 'outputFiles': report['outputFiles'], 'geometry': stats}))


def main_with_clip_fallback():
    global CLIP_MARGIN
    try:
        return main()
    except ClipTooWide:
        CLIP_MARGIN = CLIP_FALLBACK_MARGIN_DEGREES
        return main()


def drive():
    # Shore simplification: 1 m first; 2 m when the water is too big for the scene budget; finer (0.5, 0.2, 0.1 m) when a guard rejects the simplified shore.
    global WATER_TOLERANCE_DEGREES, MAX_WATER_AREA_FRACTION, LADDER_RUNG
    # A budget-ladder rung (runner.mjs): exactly one attempt at the named tolerance under the named area cap; no automatic stepping either way.
    rung = argparse.ArgumentParser(add_help=False)
    rung.add_argument('--ladder-tolerance-degrees', type=float)
    rung.add_argument('--ladder-area-cap', type=float)
    named, _ = rung.parse_known_args()
    if (named.ladder_tolerance_degrees is None) != (named.ladder_area_cap is None):
        raise SystemExit('--ladder-tolerance-degrees and --ladder-area-cap go together')
    if named.ladder_tolerance_degrees is not None:
        if not (0.000005 < named.ladder_tolerance_degrees <= 0.0001) or not (MAX_SIMPLIFICATION_AREA_FRACTION < named.ladder_area_cap <= 0.001):
            raise SystemExit('budget ladder rung outside its documented range (coarser than 0.56 m and at most about 11 m; cap above 0.01% and at most 0.1%)')
        WATER_TOLERANCE_DEGREES, MAX_WATER_AREA_FRACTION, LADDER_RUNG = named.ladder_tolerance_degrees, named.ladder_area_cap, True
        COARSE_STEPS.clear()
        try:
            return main_with_clip_fallback()
        except FinerWater as error:
            print(json.dumps({'status': 'rung-infeasible', 'toleranceDegrees': WATER_TOLERANCE_DEGREES, 'cap': MAX_WATER_AREA_FRACTION, 'error': str(error)[:1500]}))
            sys.exit(RUNG_INFEASIBLE_EXIT)
    # 1.5 m before 2 m: a 2 m shore can miss the 0.01% source-area limit on a small play box by a hair (Doha: 0.0100060% against 0.0100000%).
    coarse, fine = list(COARSE_STEPS), [0.000005, 0.000002, 0.000001]
    tolerance = WATER_TOLERANCES_DEGREES[0]
    while True:
        WATER_TOLERANCE_DEGREES = tolerance
        try:
            return main_with_clip_fallback()
        except CoarserWater:
            tolerance = coarse.pop(0)
            COARSE_STEPS[:] = coarse
        except FinerWater:
            if not fine:
                raise
            tolerance = fine.pop(0)
            coarse.clear()
            COARSE_STEPS.clear()


if __name__ == '__main__':
    drive()
