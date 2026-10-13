"""Bounded owned-cap candidates; immutable master geometry. No writes to assets."""
import bpy,json
import numpy as np
from pathlib import Path
from mathutils.bvhtree import BVHTree
P=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(P/'inputs/fitted-human-skin-eyes-v1.blend'))
parts={}
for side in ['Left','Right']:
 for prefix in ['Fitted_Cornea_','UpperLid_','LowerLid_','Eye_','Iris_','Pupil_']:
  o=bpy.data.objects[prefix+side];o.data.calc_loop_triangles();a=np.array([tuple(v.co) for v in o.data.vertices]);t=np.array([tuple(v.vertices) for v in o.data.loop_triangles]);d={k.name:np.array([tuple(v.co) for v in k.data])-a for k in o.data.shape_keys.key_blocks if k.name!='Basis'};parts[o.name]=(a,t,d)
def tree(p,t):return BVHTree.FromPolygons(p.tolist(),t.tolist(),all_triangles=True,epsilon=1e-9)
# 101 evenly spaced states include .5 and expose intervals the earlier 23 cases did not sample.
blink_values=np.linspace(0,1,101)
lidtrees={}
for side in ['Left','Right']:
 for pre in ['UpperLid_','LowerLid_']:
  a,t,d=parts[pre+side];lidtrees[pre+side]=[tree(a+v*d['expression.blink'+side],t) for v in blink_values]
rows=[]
for dome in [.00045,.00030,.00020,.00015,.00010,.00005]:
 pairs=0;failed=[];inside=[]
 for side in ['Left','Right']:
  name='Fitted_Cornea_'+side;a,t,d=parts[name];a=a.copy();cx=.032 if side=='Left' else -.032
  radius2=((a[:,0]-cx)**2+(a[:,2]-1.635)**2)/(.00625**2);a[:,1]+=(.00045-dome)*np.maximum(0,1-radius2)
  ct=tree(a,t)
  for i,amount in enumerate(blink_values):
   total=sum(len(ct.overlap(lidtrees[p+side][i])) for p in ['UpperLid_','LowerLid_'])
   pairs+=total
   if total:failed.append({'side':side,'blink':float(amount),'trianglePairs':total})
  for prefix in ['Eye_','Iris_','Pupil_']:
   x,tt,_=parts[prefix+side];overlap=ct.overlap(tree(x,tt));inside.append({'side':side,'surface':prefix+side,'trianglePairs':len(overlap)})
 rows.append({'domeMetres':dome,'sampledBlinkValues':101,'corneaLidPairSum':pairs,'failingStates':failed,'innerSurfacePairs':inside})
 print('dome',dome,'lid pairs',pairs,'failed states',len(failed),'eye/iris/pupil',sum(r['trianglePairs'] for r in inside),flush=True)
(P/'receipts/candidate-scan.json').write_text(json.dumps({'inputCommit':'f504d2f450a95d5f411abca6f63b9401f1401fc5','candidates':rows,'limits':'101 blink samples at neutral height, candidate screen only; final dense sweep required'},indent=2)+'\n')
