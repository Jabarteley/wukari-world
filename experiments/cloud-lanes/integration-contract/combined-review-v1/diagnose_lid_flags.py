"""Classify the three flagged faces at already-sampled blink weights; retain uncertainty."""
from pathlib import Path
import sys,ast,json
import numpy as np
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from review_inputs import load,DOC
from glb import pose
source=HERE/'scratch/human/prototype/check_lid_candidate_v3.py'
fn=next(n for n in ast.parse(source.read_text()).body if isinstance(n,ast.FunctionDef) and n.name=='strict_hits')
exec(compile(ast.Module(body=[fn],type_ignores=[]),str(source),'exec'))
parts={p['name']:p for p in load()['human'].parts}
rows=[]
for name in ['UpperLid_Left','UpperLid_Right','LowerLid_Right']:
 p=parts[name];t=p['indices'].reshape(-1,3);v=pose(p,{})
 neutral=np.cross(v[t[:,1]]-v[t[:,0]],v[t[:,2]]-v[t[:,0]])
 v=pose(p,{'expression.blinkLeft':1,'expression.blinkRight':1});full=np.cross(v[t[:,1]]-v[t[:,0]],v[t[:,2]]-v[t[:,0]])
 ids=np.flatnonzero((neutral*full).sum(axis=1)<0)
 for i in ids:
  samples=[]
  for blink in [0,.25,.5,.75,1]:
   v=pose(p,{'expression.blinkLeft':blink,'expression.blinkRight':blink});tri=v[t[i]];n=np.cross(tri[1]-tri[0],tri[2]-tri[0]);samples.append({'blink':blink,'areaM2':float(np.linalg.norm(n)/2),'cosineToNeutral':float(np.dot(n,neutral[i])/(np.linalg.norm(n)*np.linalg.norm(neutral[i])))})
  rows.append({'mesh':name,'triangle':int(i),'samples':samples})
def d(name):
 p=parts[name];v=pose(p,{});t=p['indices'].reshape(-1,3);return v,t,BVHTree.FromPolygons(v.tolist(),t.tolist(),all_triangles=True,epsilon=1e-9)
h=d('Head_continuous_anatomy');inherited=[]
for name in ['Eye_Left','Eye_Right']:
 a=d(name);raw=a[2].overlap(h[2]);inherited.append({'eye':name,'rawPairs':len(raw),'properPairs':len(strict_hits(a,h,raw))})
r={'flaggedTriangles':rows,'neutralInheritedEyeHead':inherited,'interpretation':'Three lid faces point opposite their own neutral normals at full closure, but retain positive finite areas at the five already-sampled blink values. This is not sufficient to classify a fold or certify continuous orientation; retained for anatomy-owner inspection. No extra morph-state combinations were added.'}
(DOC/'lid-diagnostic.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({'faces':len(rows),'inheritedNeutralProperPairs':sum(x['properPairs'] for x in inherited),'minSampleAreaM2':min(s['areaM2'] for r in rows for s in r['samples'])}))
