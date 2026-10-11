"""Recover complete mapped facility ways for station-scope review; never register destinations."""
import hashlib
import json
import math
import sys
from pathlib import Path
import osmium

source, seeds_file, output = map(Path, sys.argv[1:])
expected = 'd5453f349c4e628ca5109d751c0dd41d7a9b4b2186c039abb013797f0689de66'
assert hashlib.sha256(source.read_bytes()).hexdigest() == expected
seeds = json.loads(seeds_file.read_text())

def km(a, b):
    x, y, u, v = map(math.radians, [*a, *b])
    h = math.sin((v-y)/2)**2 + math.cos(y)*math.cos(v)*math.sin((u-x)/2)**2
    return 12742.0176 * math.asin(min(1, math.sqrt(h)))

class Facilities(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.features = []
    def way(self, way):
        tags = {t.k: t.v for t in way.tags}
        if not (tags.get('building') or tags.get('aeroway') or tags.get('amenity') == 'research_institute' or tags.get('landuse') or tags.get('office') == 'research'):
            return
        points = [[n.lon, n.lat] if n.location.valid() else None for n in way.nodes]
        nearby = [s['id'] for s in seeds if any(p and km(s['point'], p) <= 20 for p in points)]
        if not nearby:
            return
        refs = [n.ref for n in way.nodes]
        self.features.append({'ref': f'way/{way.id}', 'version': way.version, 'tags': tags, 'nearbyQueries': nearby, 'nodeRefs': refs, 'points': points, 'complete': all(p is not None for p in points), 'closedByNodeIdentity': bool(refs) and refs[0] == refs[-1]})

reader = Facilities()
reader.apply_file(str(source), locations=True, idx='flex_mem')
result = {'sourceSha256': expected, 'scriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'seedSha256': hashlib.sha256(seeds_file.read_bytes()).hexdigest(), 'attribution': 'OpenStreetMap contributors; ODbL-1.0', 'status': 'GEOMETRY_REVIEW_CANDIDATE', 'limitation': '20km queries select candidates only. Complete closed rings do not prove station membership, current operations, polygon validity or venue suitability.', 'features': reader.features}
output.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n')
print(json.dumps({'features': len(reader.features), 'incomplete': sum(not f['complete'] for f in reader.features), 'sourceSha256': expected}))
