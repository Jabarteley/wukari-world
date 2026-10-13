"""Independent before/after collision sweep. No visibility filtering or ignored faces.
1001 blink levels per height, both eyes and both lids; inner eye surfaces also checked.
"""
import bpy,json,hashlib,time
import numpy as np
from pathlib import Path
from mathutils.bvhtree import BVHTree
P=Path(__file__).resolve().parent;F=P.parent;start=time.monotonic()

def read(path):
 bpy.ops.wm.open_mainfile(filepath=str(path));out={};flags={}
 for ob in bpy.context.scene.objects:
  if ob.type!='MESH' or ob.name.startswith('STUDIO'):continue
  ob.data.calc_loop_triangles();a=np.array([tuple(v.co) for v in ob.data.vertices],dtype='<f8');t=np.array([tuple(v.vertices) for v in ob.data.loop_triangles],dtype='<u4');u=np.array([tuple(v.uv) for v in ob.data.uv_layers.active.data],dtype='<f8')
  d={k.name:np.array([tuple(v.co) for v in k.data],dtype='<f8')-a for k in ob.data.shape_keys.key_blocks if k.name!='Basis'}
  out[ob.name]=(a,t,u,d);flags[ob.name]={'hide_render':ob.hide_render,'hide_viewport':ob.hide_viewport,'materials':[m.name for m in ob.data.materials]}
 return out,flags
before,bflags=read(P/'inputs/fitted-human-skin-eyes-v1.blend');after,aflags=read(F/'artifacts/fitted-human-skin-eyes-v1.blend')
assert set(before)==set(after) and bflags==aflags
ref=json.loads((F/'inputs/geometry-checks.json').read_text())
for row in ref['meshes']:
 name=row['name'];a,t,u,d=after[name]
 for key,v in [('positionSha256',a),('triangleOrderSha256',t),('uvSha256',u)]:assert hashlib.sha256(v.tobytes()).hexdigest()==row[key]
 for k,v in d.items():assert hashlib.sha256(v.tobytes()).hexdigest()==row['morphs'][k]['sha256']
for name,(a,t,u,d) in before.items():
 aa,tt,uu,dd=after[name];assert np.array_equal(t,tt) and np.array_equal(u,uu) and set(d)==set(dd)
 for k in d:assert np.array_equal(d[k],dd[k]),(name,k)
 if not name.startswith('Fitted_Cornea'):assert np.array_equal(a,aa),name
 else:
  assert np.array_equal(a[:,[0,2]],aa[:,[0,2]])
  shift=aa[:,1]-a[:,1];assert shift.min()>-1e-8 and abs(shift.max()-.0002)<1e-8
  tri=aa[tt];cross=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);assert (np.linalg.norm(cross,axis=1)>1e-14).all() and (cross[:,1]<0).all()

def points(data,name,height,blink=0):
 a,t,u,d=data[name];out=a.copy()
 if 'body.height' in d:out+=height*d['body.height']
 for side in ['Left','Right']:
  k='expression.blink'+side
  if k in d:out+=blink*d[k]
  k='corrective.height.blink'+side
  if k in d:out+=height*blink*d[k]
 return out

def tree(p,t):return BVHTree.FromPolygons(p.tolist(),t.tolist(),all_triangles=True,epsilon=1e-9)
heights=[-1,0,1];blinks=np.linspace(0,1,1001);counts=np.zeros((3,1001,2,2,3),dtype=np.int32);nearest=np.zeros((3,1001,2,2))
inner=[];step_bound=0.;independence=[]
for hi,height in enumerate(heights):
 for si,side in enumerate(['Left','Right']):
  name='Fitted_Cornea_'+side;bp=points(before,name,height);ap=points(after,name,height);ct=after[name][1];btree=tree(bp,ct);atree=tree(ap,ct)
  eye='Eye_'+side;etree=tree(points(after,eye,height),after[eye][1])
  # Verify each lid only has its own blink and its exact master height correction.
  for pre in ['UpperLid_','LowerLid_']:
   ks=set(after[pre+side][3]);assert ks=={'body.height','expression.blink'+side,'corrective.height.blink'+side}
  assert set(after[name][3])=={'body.height'}
  for surface in ['Eye_'+side,'Iris_'+side,'Pupil_'+side,'Head_continuous_anatomy']:
   p=points(after,surface,height);st=tree(p,after[surface][1]);pairs=atree.overlap(st)
   distances=[st.find_nearest(tuple(v))[3] for v in ap]+[atree.find_nearest(tuple(v))[3] for v in p]
   inner.append({'height':height,'cornea':name,'surface':surface,'trianglePairs':len(pairs),'minimumSampledDistanceM':min(x for x in distances if x is not None)})
  for li,pre in enumerate(['UpperLid_','LowerLid_']):
   lid=pre+side;p0=points(after,lid,height,0);p1=points(after,lid,height,1);step_bound=max(step_bound,float(np.linalg.norm(p1-p0,axis=1).max()/1000))
   for bi,blink in enumerate(blinks):
    lp=points(after,lid,height,float(blink));lt=tree(lp,after[lid][1]);counts[hi,bi,si,li]=[len(etree.overlap(lt)),len(btree.overlap(lt)),len(atree.overlap(lt))]
    distances=[lt.find_nearest(tuple(v))[3] for v in ap]+[atree.find_nearest(tuple(v))[3] for v in lp]
    nearest[hi,bi,si,li]=min(x for x in distances if x is not None)
 print('height',height,'before',int(counts[hi,:,:,:,1].sum()),'after',int(counts[hi,:,:,:,2].sum()),flush=True)
np.savez_compressed(P/'receipts/dense-samples.npz',heights=np.array(heights),blink=blinks,counts=counts,nearest_after_m=nearest)
summary=[]
for hi,height in enumerate(heights):
 b=counts[hi,:,:,:,1].sum(axis=(1,2));a=counts[hi,:,:,:,2].sum(axis=(1,2));bad=np.flatnonzero(b)
 summary.append({'height':height,'beforeTrianglePairSum':int(b.sum()),'beforeFailingBlinkAmounts':len(bad),'beforeFailingBlinkInterval':[float(blinks[bad[0]]),float(blinks[bad[-1]])] if len(bad) else None,'afterTrianglePairSum':int(a.sum()),'afterFailingBlinkAmounts':int((a>0).sum()),'afterMinimumSampledDistanceM':float(nearest[hi].min()),'neutralHalfFullBeforePairs':[int(b[i]) for i in [0,500,1000]],'neutralHalfFullAfterPairs':[int(a[i]) for i in [0,500,1000]]})
new_pairs=int(counts[:,:,:,:,2].sum());inner_pairs=sum(x['trianglePairs'] for x in inner)
r={'status':'PASS' if not(new_pairs or inner_pairs) else 'FAIL','beforeCommit':'f504d2f450a95d5f411abca6f63b9401f1401fc5','beforeBlendSha256':hashlib.sha256((P/'inputs/fitted-human-skin-eyes-v1.blend').read_bytes()).hexdigest(),'afterBlendSha256':hashlib.sha256((F/'artifacts/fitted-human-skin-eyes-v1.blend').read_bytes()).hexdigest(),'masterCommit':'3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a','blinkLevels':1001,'blinkStep':.001,'heights':heights,'pairedEyePoseSamples':3003,'corneaLidPairTestsPerVersion':12012,'allOriginalMeshesAndMorphsExact':31,'corneaTopologyUVAndHeightMorphUnchanged':True,'visibilityAndMaterialsUnchanged':True,'crossEyeBlinkIndependenceVerified':True,'beforeCorneaLidTrianglePairSum':int(counts[:,:,:,:,1].sum()),'afterCorneaLidTrianglePairSum':new_pairs,'inheritedEyeLidTrianglePairSum':int(counts[:,:,:,:,0].sum()),'afterCorneaInnerEyeOrHeadTrianglePairs':inner_pairs,'afterMinimumSampledLidDistanceM':float(nearest.min()),'maximumLidVertexMovementPerBlinkStepM':step_bound,'heightsSummary':summary,'innerSurfaceChecks':inner,'samplesSha256':hashlib.sha256((P/'receipts/dense-samples.npz').read_bytes()).hexdigest(),'sampleArrayAxes':'height, blink, side [Left,Right], lid [Upper,Lower], count kind [inherited eye,before cornea,after cornea]','elapsedSeconds':round(time.monotonic()-start,3),'limits':'Dense discrete sampling, not a continuous collision certificate. Distances are bidirectional vertex-to-triangle samples, not exact global minima. Inherited eye/lid defects remain separately counted; no alpha, visibility, face exclusion, shrinking aperture or new blink deformation.'}
(P/'receipts/dense-blink.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items() if k not in ['innerSurfaceChecks','heightsSummary']},indent=2))
assert not new_pairs and not inner_pairs
