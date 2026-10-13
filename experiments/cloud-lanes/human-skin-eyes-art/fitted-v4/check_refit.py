"""Finite regression for ONLY added corneas, plus v4 driver and preservation witnesses.
No repeat of the anatomy owner's exhaustive/master-only scans.
"""
import bpy,ast,json,sys,time,hashlib
from pathlib import Path
import numpy as np
from mathutils.bvhtree import BVHTree
P=Path(__file__).resolve().parent;sys.path.insert(0,str(P))
from geometry import geometry_snapshot,set_values,explicit_weight
start=time.monotonic()
source=P/'inputs/check_lid_candidate_v3.py'
fn=next(n for n in ast.parse(source.read_text()).body if isinstance(n,ast.FunctionDef) and n.name=='strict_hits')
exec(compile(ast.Module(body=[fn],type_ignores=[]),str(source),'exec'))
bpy.ops.wm.open_mainfile(filepath=str(P/'inputs/anatomy-candidate-v4.blend'));before=geometry_snapshot()
bpy.ops.wm.open_mainfile(filepath=str(P/'artifacts/fitted-human-skin-eyes-v4.blend'));after=geometry_snapshot()
assert len(before)==27 and len(after)==29
assert all(after[n]==h for n,h in before.items()),'Candidate geometry, UV, morph or driver changed'
frame=json.loads((P/'inputs/fit-frame-candidate-v4.json').read_text())
assert not any(n in bpy.data.objects for n in frame['removedNodes'])
head=bpy.data.objects['Head_continuous_anatomy'];me=head.data;me.calc_loop_triangles()
keys={k.name:np.array([tuple(v.co) for v in k.data]) for k in me.shape_keys.key_blocks}
basis=keys['Basis'];delta={k:v-basis for k,v in keys.items() if k!='Basis'}
cases=[]
for height in [-1,0,1]:
    for step in range(21):
        b=step/20;cases.append((f'height={height}/blink={b}',{'body.height':height,'expression.blinkLeft':b,'expression.blinkRight':b}))
for end in [-1,1]:
    for b in [k/20 for k in range(21)]:cases.append((f'all-six={end}/blink={b}',{**{c:end for c in frame['implementedIdentityControls']},'expression.blinkLeft':b,'expression.blinkRight':b}))
for side in ['Left','Right']:
    for b in [.25,.5,.75]:cases.append((f'independent-{side}={b}',{'expression.blink'+side:b}))
rows=[];failures=[];maxerror=0.;near_head=1.;near_inner=1.
for label,values in cases:
    set_values(values);dg=bpy.context.evaluated_depsgraph_get();cache={}
    def data(name):
        if name not in cache:
            o=bpy.data.objects[name];m=o.evaluated_get(dg).data;m.calc_loop_triangles()
            v=np.array([tuple(x.co) for x in m.vertices]);t=np.array([tuple(x.vertices) for x in m.loop_triangles])
            assert np.isfinite(v).all()
            cache[name]=(v,t,BVHTree.FromPolygons(v.tolist(),t.tolist(),all_triangles=True,epsilon=1e-9))
        return cache[name]
    h=data(head.name);expected=basis.copy()
    for key,d in delta.items():expected+=d*explicit_weight(key,values)
    error=float(abs(h[0]-expected).max());maxerror=max(maxerror,error)
    if error>2e-6:failures.append({'case':label,'driverErrorM':error})
    pairs=[]
    for side in ['Left','Right']:
        cap=data('Fitted_Cornea_'+side)
        for other in [head.name,'Eye_'+side,'Iris_'+side,'Pupil_'+side]:
            target=data(other);raw=cap[2].overlap(target[2]);hits=strict_hits(cap,target,raw)
            nearest=min(target[2].find_nearest(tuple(v))[3] for v in cap[0])
            if other==head.name:near_head=min(near_head,nearest)
            else:near_inner=min(near_inner,nearest)
            pairs.append({'cap':side,'other':other,'rawBvhPairs':len(raw),'properCrossings':len(hits),'minimumCapVertexToSurfaceM':nearest})
            if raw:failures.append({'case':label,'cap':side,'other':other,'raw':len(raw),'proper':len(hits)})
    rows.append({'case':label,'values':values,'headDriverErrorM':error,'pairs':pairs})
r={'status':'PASS' if not failures else 'FAIL','candidateCommit':'2921534bdc8959a8489713f9b1652381702808a5','scope':'Only added caps against evaluated Head, Eye, Iris and Pupil. Candidate master-only anatomy gates are inherited, not rerun.','candidateMeshesExact':27,'poseSamples':len(cases),'pairTests':sum(len(r['pairs']) for r in rows),'blinkStepMainSweep':.05,'properCrossingToleranceM':2.5e-7,'totalRawBvhPairs':sum(p['rawBvhPairs'] for r in rows for p in r['pairs']),'totalProperCrossings':sum(p['properCrossings'] for r in rows for p in r['pairs']),'maximumHeadDriverErrorM':maxerror,'minimumSampledCapVertexToHeadM':near_head,'minimumSampledCapVertexToInnerEyeM':near_inner,'caveat':'Finite tests and cap-vertex distances, not a continuous or global minimum clearance certificate. No anatomical realism or production acceptance.','filterSourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'elapsedSeconds':time.monotonic()-start,'failures':failures,'cases':rows}
(P/'receipts/finite-refit.json').write_text(json.dumps(r,separators=(',',':'))+'\n')
print(json.dumps({k:v for k,v in r.items() if k!='cases'},indent=2));assert not failures
