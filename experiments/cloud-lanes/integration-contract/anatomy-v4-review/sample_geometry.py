"""Five targeted v4 export states; no skin/caps, render, or producer-suite replay."""
from pathlib import Path
import sys,ast,json,time
import numpy as np
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from audit import load,DOC,PLACEHOLDER
from glb import pose,sha
start=time.monotonic();models=load();body=[p for p in models['human'].parts if p['name']!=PLACEHOLDER]
source=HERE/'scratch/prior/human/prototype/check_lid_candidate_v3.py'
fn=next(n for n in ast.parse(source.read_text()).body if isinstance(n,ast.FunctionDef) and n.name=='strict_hits')
exec(compile(ast.Module(body=[fn],type_ignores=[]),str(source),'exec'))
test_a=(np.array([[0.,-1,0],[0,1,0],[1,0,0]]),np.array([[0,1,2]]),None)
for vertices,expected in [([[-.5,0,-1],[.5,0,1],[1.5,0,-1]],True),([[-1.,0,1],[.5,0,1],[2,0,-.1]],False),([[1.,0,-1],[1,0,1],[2,0,0]],False)]:
 assert bool(strict_hits(test_a,(np.array(vertices),np.array([[0,1,2]]),None),[(0,0)]))==expected
frame=json.loads((HERE/'scratch/fit-frame-candidate-v4.json').read_text())
cases=[('neutral',{}),('half-blink',{'expression.blinkLeft':.5,'expression.blinkRight':.5}),('full-blink',{'expression.blinkLeft':1,'expression.blinkRight':1})]
for endpoint in [-1,1]:cases.append((f'all-six-controls:{endpoint}/half-blink',{**{k:endpoint for k in frame['implementedIdentityControls']},'expression.blinkLeft':.5,'expression.blinkRight':.5}))
def data(part,values):
 v=pose(part,values);t=part['indices'].reshape(-1,3)
 return v,t,BVHTree.FromPolygons(v.tolist(),t.tolist(),all_triangles=True,epsilon=1e-9)
def merge(items):
 vs=[];ts=[];offset=0
 for v,t,_ in items:vs.append(v);ts.append(t+offset);offset+=len(v)
 v=np.concatenate(vs);t=np.concatenate(ts)
 return v,t,BVHTree.FromPolygons(v.tolist(),t.tolist(),all_triangles=True,epsilon=1e-9)
def hits(a,b):
 raw=a[2].overlap(b[2]);return {'rawPairs':len(raw),'properCrossings':len(strict_hits(a,b,raw))}
def clearance(a,b):
 vertices,tri,_=a;samples=np.concatenate([vertices,vertices[tri].mean(axis=1)]);signed=[]
 for p in samples:
  nearest,normal,_,distance=b[2].find_nearest(p);signed.append(float(np.dot(p-np.asarray(nearest),np.asarray(normal))))
 return {'samples':len(samples),'minimumSignedNearestNormalMetres':min(signed),'negativeBeyond0_2mm':sum(x<-.0002 for x in signed),'negativeBeyond0_1mm':sum(x<-.0001 for x in signed)}
head=next(p for p in body if p['name']=='Head_continuous_anatomy');oldhead=next(p for p in models['master'].parts if p['name']==head['name'])
newtri=head['indices'].reshape(-1,3)[len(oldhead['indices'])//3:]
neutral=pose(head,{});normal0=np.cross(neutral[newtri[:,1]]-neutral[newtri[:,0]],neutral[newtri[:,2]]-neutral[newtri[:,0]])
before={k:sha(g.bytes) for k,g in models.items()};rows=[]
for label,weights in cases:
 bd={p['name']:data(p,weights) for p in body};h=bd[head['name']];merged=merge(list(bd.values()))
 normals=np.cross(h[0][newtri[:,1]]-h[0][newtri[:,0]],h[0][newtri[:,2]]-h[0][newtri[:,0]])
 pairrows=[{'surface':name,**hits(bd[name],h)} for name in ['Eye_Left','Eye_Right','Iris_Left','Iris_Right','Pupil_Left','Pupil_Right']]
 hairrows=[]
 for style in ['cropProxy','bunProxy']:
  hair=merge([data(p,weights) for p in models[style].parts]);hairrows.append({'style':style,**hits(hair,merged),'clearance':clearance(hair,merged)})
 ward=merge([data(p,weights) for p in models['wardrobe'].parts])
 invalid=[]
 for p in [*body,*models['wardrobe'].parts,*models['cropProxy'].parts,*models['bunProxy'].parts]:
  v=pose(p,weights);t=p['indices'].reshape(-1,3);area2=np.linalg.norm(np.cross(v[t[:,1]]-v[t[:,0]],v[t[:,2]]-v[t[:,0]]),axis=1)
  if not np.isfinite(v).all() or np.any(area2<1e-14):invalid.append(p['name'])
 rows.append({'state':label,'weights':weights,'eyeHead':pairrows,'newLidNormalFlags':int(((normals*normal0).sum(axis=1)<=0).sum()),'minimumNewLidAreaM2':float(np.linalg.norm(normals,axis=1).min()/2),'hair':hairrows,'wardrobe':{**hits(ward,merged),'clearance':clearance(ward,merged)},'invalidGeometry':invalid})
summary={'distinctStates':len(rows),'hairStateCombinations':sum(len(r['hair']) for r in rows),'eyeHeadProperCrossings':sum(p['properCrossings'] for r in rows for p in r['eyeHead']),'newLidNormalFlags':sum(r['newLidNormalFlags'] for r in rows),'hairProperCrossings':sum(h['properCrossings'] for r in rows for h in r['hair']),'wardrobeProperCrossings':sum(r['wardrobe']['properCrossings'] for r in rows),'invalidGeometryStates':sum(bool(r['invalidGeometry']) for r in rows),'hairPenetrationStates':sum(h['clearance']['negativeBeyond0_2mm']>0 for r in rows for h in r['hair']),'wardrobePenetrationStates':sum(r['wardrobe']['clearance']['negativeBeyond0_1mm']>0 for r in rows),'minimumHairSignedSampleMetres':min(h['clearance']['minimumSignedNearestNormalMetres'] for r in rows for h in r['hair']),'minimumWardrobeSignedSampleMetres':min(r['wardrobe']['clearance']['minimumSignedNearestNormalMetres'] for r in rows),'minimumNewLidAreaM2':min(r['minimumNewLidAreaM2'] for r in rows)}
failurekeys=['eyeHeadProperCrossings','newLidNormalFlags','hairProperCrossings','wardrobeProperCrossings','invalidGeometryStates','hairPenetrationStates','wardrobePenetrationStates']
assert before=={k:sha(g.path.read_bytes()) for k,g in models.items()}
assert np.array_equal(neutral,pose(head,{}))
report={'status':'TARGETED_PRE_SKIN_GEOMETRY_PASS' if not any(summary[k] for k in failurekeys) else 'TARGETED_GEOMETRY_FAILED','summary':summary,'seconds':time.monotonic()-start,'classifierSourceSha256':sha(source.read_bytes()),'classifierFixturesPassed':3,'properCrossingToleranceMetres':2.5e-7,'inputFilesUnchanged':True,'neutralResetExact':True,'cases':rows,'limits':'Five discrete exported morph states, ten hairstyle/state combinations, no skin/caps or renders. Not exhaustive/continuous/self/coplanar collision certification, skeletal fit or realism. Producer 35/448/17/3003 suites not rerun.'}
(DOC/'targeted-geometry-checks.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['cases','limits']}))
assert not any(summary[k] for k in failurekeys),summary
