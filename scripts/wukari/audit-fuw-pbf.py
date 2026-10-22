"""Read the existing complete-way LGA PBF directly; never modify it or re-extract Nigeria."""
import sys,json,pathlib,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'.cache/wukari/python-tools'))
import osmium
source=ROOT/'.cache/wukari/local-pbf-20261020/wukari-complete.osm.pbf';before=hashlib.sha256(source.read_bytes()).hexdigest()
box=[9.762370,7.828357,9.792370,7.858357];records=[];counts={'nodes':0,'ways':0,'relations':0}
class Audit(osmium.SimpleHandler):
 def node(self,n):
  counts['nodes']+=1
  if box[0]<=n.location.lon<=box[2] and box[1]<=n.location.lat<=box[3] and len(n.tags):records.append({'type':'node','id':n.id,'coordinates':[n.location.lon,n.location.lat],'tags':dict(n.tags)})
 def way(self,w):
  counts['ways']+=1
  if any(t.k in ['amenity','entrance','barrier','name','operator','landuse','leisure'] for t in w.tags):
   points=[[n.lon,n.lat] for n in w.nodes if n.location.valid()]
   if any(box[0]<=p[0]<=box[2] and box[1]<=p[1]<=box[3] for p in points):records.append({'type':'way','id':w.id,'coordinates':points,'tags':dict(w.tags)})
 def relation(self,r):counts['relations']+=1
Audit().apply_file(str(source),locations=True)
after=hashlib.sha256(source.read_bytes()).hexdigest();assert before==after
result={'sourcePath':'.cache/wukari/local-pbf-20261020/wukari-complete.osm.pbf','sha256':before,'unchangedAfterRead':after==before,'counts':counts,'bbox':box,'taggedRecords':records,'conclusion':'Tagged feature presence is not gate identity or university ownership; no automatic spawn.'}
(ROOT/'data/wukari/phase10b/pbf-audit.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print(json.dumps(result,indent=2))
