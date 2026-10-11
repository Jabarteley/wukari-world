"""Audit closure of exact extracted coastline segments without filling open source gaps."""
import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('water', type=Path)
p.add_argument('output', type=Path)
p.add_argument('--lon', type=float, required=True)
p.add_argument('--lat', type=float, required=True)
args = p.parse_args()
data = json.loads(args.water.read_text())
ways = {e['id']: [(g['lon'], g['lat']) for g in e['geometry']] for e in data['elements'] if e['type'] == 'way' and e.get('tags', {}).get('natural') == 'coastline'}
ends = defaultdict(list)
for ref, line in ways.items():
    if len(line) < 2:
        raise ValueError('Coastline needs at least two source points')
    if line[0] != line[-1]:
        ends[line[0]].append(ref)
        ends[line[-1]].append(ref)
used, rings, incomplete = set(), [], []
ordered = sorted(ways, key=lambda ref: not any(len(ends[point]) == 1 for point in (ways[ref][0], ways[ref][-1])))
for first in ordered:
    initial = ways[first]
    if initial[0] != initial[-1] and len(ends[initial[-1]]) == 1:
        initial = list(reversed(initial))
    if first in used:
        continue
    line, refs = list(initial), [first]
    used.add(first)
    while line[0] != line[-1]:
        candidates = [r for r in ends[line[-1]] if r not in used]
        if len(ends[line[-1]]) != 2 or len(candidates) != 1:
            break
        ref = candidates[0]
        part = ways[ref]
        if part[0] != line[-1]:
            part = list(reversed(part))
        line.extend(part[1:])
        refs.append(ref)
        used.add(ref)
    if line[0] == line[-1]:
        rings.append({'sourceWays': refs, 'points': line})
    else:
        incomplete.append({'sourceWays': refs, 'start': line[0], 'end': line[-1], 'vertices': len(line)})

def inside(point, ring):
    x, y = point
    result = False
    for a, b in zip(ring, ring[1:]):
        if (a[1] > y) != (b[1] > y) and x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:
            result = not result
    return result

containing = [ring for ring in rings if inside((args.lon, args.lat), ring['points'])]
result = {'kind': 'coastline-closure-diagnostic', 'waterSha256': hashlib.sha256(args.water.read_bytes()).hexdigest(), 'sourceSha256': data['source']['datasetSha256'], 'coastlineWays': len(ways), 'closedRings': len(rings), 'queryPoint': [args.lon,args.lat], 'containingRings': containing, 'openChains': incomplete, 'status': 'CLOSED_RING_CANDIDATE' if len(containing)==1 else 'HOLD', 'limitations': ['No open segment is bridged or closed synthetically.', 'Exact coordinate joins; no node identity or OSM relation completeness proof.', 'Polygon validity, orientation, holes, source currency and terrain triangulation remain unverified.', 'A diagnostic containing ring is not a generated or accepted station map.']}
args.output.write_text(json.dumps(result, separators=(',',':'))+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ('containingRings','openChains','limitations')} | {'containingRings':len(containing),'openChains':len(incomplete)}))
