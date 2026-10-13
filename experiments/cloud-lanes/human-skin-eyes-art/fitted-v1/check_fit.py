"""New derivative checks: frozen data preservation, eye/lid overlap and UV stretch.
Does not rerun the producer's 112 geometry tests or claim continuous collision proof.
"""
import bpy,json,hashlib,itertools
import numpy as np
from pathlib import Path
from mathutils.bvhtree import BVHTree
P=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(P/'artifacts/fitted-human-skin-eyes-v1.blend'))
ref=json.loads((P/'inputs/geometry-checks.json').read_text());frame=json.loads((P/'inputs/fit-frame.json').read_text())
objects={};verified=[]
for ob in bpy.context.scene.objects:
 if ob.type!='MESH' or ob.name.startswith('STUDIO'):continue
 ob.data.calc_loop_triangles();base=np.array([tuple(v.co) for v in ob.data.vertices],dtype='<f8');tri=np.array([tuple(t.vertices) for t in ob.data.loop_triangles],dtype='<u4');uv=np.array([tuple(v.uv) for v in ob.data.uv_layers.active.data],dtype='<f8')
 deltas={k.name:np.array([tuple(v.co) for v in k.data],dtype='<f8')-base for k in ob.data.shape_keys.key_blocks if k.name!='Basis'}
 objects[ob.name]=(base,tri,deltas)
 source=next((r for r in ref['meshes'] if r['name']==ob.name),None)
 if source:
  for key,a in [('positionSha256',base),('triangleOrderSha256',tri),('uvSha256',uv)]:assert hashlib.sha256(a.tobytes()).hexdigest()==source[key],(ob.name,key)
  for k,v in source['morphs'].items():assert hashlib.sha256(deltas[k].tobytes()).hexdigest()==v['sha256'],(ob.name,k)
  assert set(deltas)==set(source['morphs'])
  verified.append(ob.name)
assert len(verified)==31
cases=[('neutral',{})]
for c in frame['implementedIdentityControls']:
 for v in [-1,1]:cases.append((c+':'+str(v),{c:v}))
for v in [-1,1]:cases.append(('all-six:'+str(v),{c:v for c in frame['implementedIdentityControls']}))
for name in ['happy','sad','blink']:cases.append((name,frame['expressionPresets'][name]))
for v in [-1,1]:cases.append(('height:'+str(v)+'/blink',{'body.height':v,**frame['expressionPresets']['blink']}))
cases.extend([('half-blink',{'expression.blinkLeft':.5,'expression.blinkRight':.5}),('left-blink',{'expression.blinkLeft':1}),('right-blink',{'expression.blinkRight':1})])
def points(name,values):
 base,tri,deltas=objects[name];out=base.copy()
 for key,value in values.items():
  if key in deltas:out+=value*deltas[key]
  correct='corrective.height.'+key.split('.')[-1]
  if key.startswith('expression.') and correct in deltas:out+=value*values.get('body.height',0)*deltas[correct]
 return out

def tree(name,values):return BVHTree.FromPolygons(points(name,values).tolist(),objects[name][1].tolist(),all_triangles=True,epsilon=1e-9)
rows=[];new_intersections=0;baseline_intersections=0;min_clearance=100.;stretch=[]
for label,values in cases:
 pairs=[]
 for side in ['Left','Right']:
  cor='Fitted_Cornea_'+side;eye='Eye_'+side;ct=tree(cor,values);et=tree(eye,values)
  for lid in ['UpperLid_'+side,'LowerLid_'+side]:
   lt=tree(lid,values);newpairs=ct.overlap(lt);oldpairs=et.overlap(lt)
   distances=[lt.find_nearest(tuple(p))[3] for p in points(cor,values)]+[ct.find_nearest(tuple(p))[3] for p in points(lid,values)]
   gap=min(d for d in distances if d is not None);min_clearance=min(min_clearance,gap)
   pairs.append({'cornea':cor,'lid':lid,'newTriangleIntersectionPairs':len(newpairs),'baselineEyeLidTriangleIntersectionPairs':len(oldpairs),'sampledMinimumSurfaceDistanceM':gap})
   new_intersections+=len(newpairs);baseline_intersections+=len(oldpairs)
  hp=ct.overlap(tree('Head_continuous_anatomy',values));new_intersections+=len(hp)
  pairs.append({'cornea':cor,'surface':'Head_continuous_anatomy','newTriangleIntersectionPairs':len(hp)})
 for name in verified:
  if not (name.startswith(('Head','Ear','UpperLid','LowerLid','Neck','Forearm','Lip'))):continue
  base,tri,_=objects[name];out=points(name,values)
  a=np.linalg.norm(np.cross(base[tri[:,1]]-base[tri[:,0]],base[tri[:,2]]-base[tri[:,0]]),axis=1)
  b=np.linalg.norm(np.cross(out[tri[:,1]]-out[tri[:,0]],out[tri[:,2]]-out[tri[:,0]]),axis=1)
  valid=a>1e-12;ratio=b[valid]/a[valid]
  stretch.append({'case':label,'mesh':name,'minAreaRatio':float(ratio.min()),'maxAreaRatio':float(ratio.max())})
 rows.append({'case':label,'values':values,'pairs':pairs})
triangles=sum(len(v[1]) for v in objects.values());assert triangles<=34000
r={'status':'PASS' if new_intersections==0 else 'FIT_INTERSECTIONS_FOUND','inputCommit':'3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a','originalMeshesWithExactPositionTriangleUVMorphHashes':verified,'cases':len(cases),'triangles':triangles,'meshCount':len(objects),'addedCorneaTriangles':sum(len(t) for n,(_,t,_) in objects.items() if n.startswith('Fitted_Cornea')),'newCorneaLidOrHeadTriangleIntersectionPairs':new_intersections,'baselineEyeLidTriangleIntersectionPairs':baseline_intersections,'minimumSampledCorneaLidDistanceM':min_clearance,'caseResults':rows,'skinTriangleAreaRatios':stretch,'limits':'BVH sampled triangle intersections and vertex-to-surface distances only; no continuous collision, exact global minimum distance, volumetric tear film, skeleton, skinning or wearable-animation proof. Master geometry intersections outside tested eye pairs are unchanged and not tested.'}
(P/'receipts/morph-fit.json').write_text(json.dumps(r,indent=2)+'\n')
print(json.dumps({k:v for k,v in r.items() if k not in ['caseResults','skinTriangleAreaRatios','originalMeshesWithExactPositionTriangleUVMorphHashes']},indent=2))
assert not new_intersections
