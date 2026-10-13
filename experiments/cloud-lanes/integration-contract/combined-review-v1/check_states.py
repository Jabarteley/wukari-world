"""42 bounded exported-GLB morph states; no producer source edits or broad suite reruns."""
import sys,json,ast,time
from pathlib import Path
import numpy as np
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from review_inputs import load,LIDS,PLACEHOLDER,DOC
from glb import pose,sha
start=time.monotonic();models=load();body=[p for p in models['human'].parts if p['name']!=PLACEHOLDER]
caps=[p for p in models['skin'].parts if p['name'].startswith('Fitted_Cornea_')]
ward=models['wardrobe'].parts
# Reuse only the audited pure classifier function from the pinned human checker.
source=HERE/'scratch/human/prototype/check_lid_candidate_v3.py'
fn=next(n for n in ast.parse(source.read_text()).body if isinstance(n,ast.FunctionDef) and n.name=='strict_hits')
exec(compile(ast.Module(body=[fn],type_ignores=[]),str(source),'exec'))
test_a=(np.array([[0.,-1,0],[0,1,0],[1,0,0]]),np.array([[0,1,2]]),None)
for vertices,expected in [([[-.5,0,-1],[.5,0,1],[1.5,0,-1]],True),([[-1.,0,1],[.5,0,1],[2,0,-.1]],False),([[1.,0,-1],[1,0,1],[2,0,0]],False)]:
 assert bool(strict_hits(test_a,(np.array(vertices),np.array([[0,1,2]]),None),[(0,0)]))==expected
fit=json.loads((HERE/'scratch/human/prototype/eyelid-candidate-v3/fit-frame-candidate-v3.json').read_text())
cases=[('neutral',{})]
for c in fit['implementedIdentityControls']:
 for v in [-1,1]:cases.append((c+':'+str(v),{c:v}))
for b in [.25,.5,.75,1]:cases.append(('blink:'+str(b),{'expression.blinkLeft':b,'expression.blinkRight':b}))
for v in [.5,1]:cases.append(('happy:'+str(v),{'expression.smileLeft':v,'expression.smileRight':v}))
for c in ['body.height','body.shoulderWidth']:cases.append((c+':max/half-blink',{c:1,'expression.blinkLeft':.5,'expression.blinkRight':.5}))
assert len(cases)==21

def data(part,values):
 v=pose(part,values);t=part['indices'].reshape(-1,3)
 return v,t,BVHTree.FromPolygons(v.tolist(),t.tolist(),all_triangles=True,epsilon=1e-9)
def merge(items):
 vs=[];ts=[];offset=0
 for v,t,_ in items:vs.append(v);ts.append(t+offset);offset+=len(v)
 v=np.concatenate(vs);t=np.concatenate(ts)
 return v,t,BVHTree.FromPolygons(v.tolist(),t.tolist(),all_triangles=True,epsilon=1e-9)
def hits(a,b):
 raw=a[2].overlap(b[2]);proper=strict_hits(a,b,raw)
 return {'rawPairs':len(raw),'properCrossings':len(proper)}
def clearance(a,b):
 vertices,tri,_=a;samples=np.concatenate([vertices,vertices[tri].mean(axis=1)])
 signed=[]
 for p in samples:
  nearest,normal,_,distance=b[2].find_nearest(p)
  signed.append(float(np.dot(p-np.asarray(nearest),np.asarray(normal))))
 return {'samples':len(samples),'minimumSignedNearestNormalMetres':min(signed),'negativeBeyond0_2mm':sum(v<-.0002 for v in signed),'negativeBeyond0_1mm':sum(v<-.0001 for v in signed)}
rows=[];before={k:sha(g.bytes) for k,g in models.items()};neutral={}
for g in [*body,*caps,*ward,*models['cropProxy'].parts,*models['bunProxy'].parts]:
 neutral[id(g)]=pose(g,{})
for label,values in cases:
 bd={p['name']:data(p,values) for p in body};cap={p['name']:data(p,values) for p in caps};clothes=merge([data(p,values) for p in ward]);mergedBody=merge(list(bd.values()))
 capRows=[];lidRows=[]
 for side in ['Left','Right']:
  for other in ['UpperLid_'+side,'LowerLid_'+side,'Eye_'+side,'Iris_'+side,'Pupil_'+side,'Head_continuous_anatomy']:
   capRows.append({'cap':side,'other':other,**hits(cap['Fitted_Cornea_'+side],bd[other])})
  lidRows.append({'side':side,**hits(bd['UpperLid_'+side],bd['LowerLid_'+side])})
 for style in ['cropProxy','bunProxy']:
  hair=merge([data(p,values) for p in models[style].parts]);allParts=[*body,*caps,*ward,*models[style].parts]
  invalid=[];reversedTriangles=[]
  for p in allParts:
   v=pose(p,values);t=p['indices'].reshape(-1,3);n=np.cross(v[t[:,1]]-v[t[:,0]],v[t[:,2]]-v[t[:,0]])
   if not np.isfinite(v).all() or np.any(np.linalg.norm(n,axis=1)<1e-14):invalid.append(p['name'])
   old=neutral[id(p)];on=np.cross(old[t[:,1]]-old[t[:,0]],old[t[:,2]]-old[t[:,0]])
   count=int(np.count_nonzero((n*on).sum(axis=1)<0))
   if count:reversedTriangles.append({'mesh':p['name'],'count':count,'interpretation':'orientation relative to neutral, diagnostic not continuous proof'})
  row={'state':label,'weights':values,'hair':style,'capPairs':capRows,'oppositeLidPairs':lidRows,'hairVsBody':hits(hair,mergedBody),'wardrobeVsBody':hits(clothes,mergedBody),'hairClearance':clearance(hair,mergedBody),'wardrobeClearance':clearance(clothes,mergedBody),'invalidGeometry':invalid,'orientationReversals':reversedTriangles}
  rows.append(row)
assert len(rows)==42
assert all(np.array_equal(pose(p,{}),neutral[id(p)]) for p in allParts)
assert before=={k:sha(g.path.read_bytes()) for k,g in models.items()}
summary={'states':42,'newCapProperCrossings':sum(p['properCrossings'] for r in rows for p in r['capPairs']),'hairProperCrossings':sum(r['hairVsBody']['properCrossings'] for r in rows),'wardrobeProperCrossings':sum(r['wardrobeVsBody']['properCrossings'] for r in rows),'oppositeLidProperCrossings':sum(p['properCrossings'] for r in rows for p in r['oppositeLidPairs']),'invalidGeometryStates':sum(bool(r['invalidGeometry']) for r in rows),'orientationReversalStates':sum(bool(r['orientationReversals']) for r in rows),'hairPenetrationStates':sum(r['hairClearance']['negativeBeyond0_2mm']>0 for r in rows),'wardrobePenetrationStates':sum(r['wardrobeClearance']['negativeBeyond0_1mm']>0 for r in rows),'minimumHairSignedSampleMetres':min(r['hairClearance']['minimumSignedNearestNormalMetres'] for r in rows),'minimumWardrobeSignedSampleMetres':min(r['wardrobeClearance']['minimumSignedNearestNormalMetres'] for r in rows)}
report={'summary':summary,'status':'SAMPLED_GEOMETRY_PASS_WITH_BINDING_VISUAL_RUNTIME_BLOCKERS' if not any(summary[k] for k in ['newCapProperCrossings','hairProperCrossings','wardrobeProperCrossings','oppositeLidProperCrossings','invalidGeometryStates','hairPenetrationStates','wardrobePenetrationStates']) else 'SAMPLED_GEOMETRY_BLOCKED','seconds':time.monotonic()-start,'classifierSourceSha256':sha(source.read_bytes()),'properCrossingToleranceMetres':2.5e-7,'classifierFixturesPassed':3,'inputFilesUnchanged':True,'resetNeutralExact':True,'caseResults':rows,'limits':'42 finite exported-morph states; not continuous, undressed/skeletal fit, exhaustive coplanar/self-intersection or new anatomy acceptance. Cap counts repeated across two hairstyle variants.'}
(DOC/'state-checks.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['caseResults','limits']}))
