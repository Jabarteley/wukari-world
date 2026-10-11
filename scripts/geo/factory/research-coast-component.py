"""Recover the complete source coastline component nearest a station sampling point."""
import hashlib,json,math,sys
from collections import defaultdict
from pathlib import Path
import osmium
pbf,water_file,out=map(Path,sys.argv[1:4]);lon,lat=map(float,sys.argv[4:6])
water=json.loads(water_file.read_text());expected=water['source']['datasetSha256']
assert hashlib.sha256(pbf.read_bytes()).hexdigest()==expected
ways=[e for e in water['elements'] if e['type']=='way' and e.get('tags',{}).get('natural')=='coastline']
def distance(e):
    return min(((g['lon']-lon)*math.cos(math.radians(lat)))**2+(g['lat']-lat)**2 for g in e['geometry'])
seed=min(ways,key=distance)['id']
class Topology(osmium.SimpleHandler):
    def __init__(self):super().__init__();self.edges={};self.at=defaultdict(list)
    def way(self,w):
        if w.tags.get('natural')!='coastline' or len(w.nodes)<2:return
        a,b=w.nodes[0].ref,w.nodes[-1].ref;self.edges[w.id]=(a,b)
        self.at[a].append(w.id);self.at[b].append(w.id)
top=Topology();top.apply_file(str(pbf))
selected=set();todo=[seed]
while todo:
    ref=todo.pop()
    if ref in selected:continue
    selected.add(ref)
    for node in top.edges[ref]:todo.extend(r for r in top.at[node] if r not in selected)
class Geometry(osmium.SimpleHandler):
    def __init__(self):super().__init__();self.features=[]
    def way(self,w):
        if w.id not in selected:return
        if any(not n.location.valid() for n in w.nodes):raise ValueError('Incomplete coastline coordinates')
        self.features.append({'type':'way','id':w.id,'version':w.version,'tags':{t.k:t.v for t in w.tags},'nodeRefs':[n.ref for n in w.nodes],'geometry':[{'lon':n.lon,'lat':n.lat} for n in w.nodes]})
g=Geometry();g.apply_file(str(pbf),locations=True,idx='flex_mem')
assert len(g.features)==len(selected)
ends={n for ref in selected for n in top.edges[ref]};bad=[{'node':n,'degree':len(top.at[n])} for n in sorted(ends) if len(top.at[n])!=2]
result={'source':water['source'],'componentProof':{'seedWay':seed,'queryPoint':[lon,lat],'sourceSha256':expected,'inputWaterSha256':hashlib.sha256(water_file.read_bytes()).hexdigest(),'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'ways':len(selected),'badEndpointDegrees':bad,'status':'CLOSED_TOPOLOGY_CANDIDATE' if not bad else 'HOLD','limitation':'Expanded complete source component, not restricted to original sampling bounds. Polygon validity, land orientation, clipping and rendering remain unverified.'},'elements':sorted(g.features,key=lambda e:e['id'])}
# Preserve original sampling provenance without mislabelling expanded component coverage.
result['source']={**water['source'],'filter':'Complete connected OSM coastline component selected by nearest extracted source vertex; node-identity traversal across pinned PBF','originalSamplingBoxes':water['source']['boxes']}
result['source'].pop('boxes',None);result['source'].pop('selectionBounds',None)
out.write_text(json.dumps(result,separators=(',',':'))+'\n');print(json.dumps(result['componentProof']))
