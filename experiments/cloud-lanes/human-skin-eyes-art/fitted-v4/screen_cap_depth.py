"""Bounded four-candidate response to the first v4 extreme-control refit failure."""
import bpy,ast,json,sys,time,math
from pathlib import Path
import numpy as np
from mathutils.bvhtree import BVHTree
P=Path(__file__).resolve().parent;sys.path.insert(0,str(P))
from geometry import set_values
source=P/'inputs/check_lid_candidate_v3.py'
fn=next(n for n in ast.parse(source.read_text()).body if isinstance(n,ast.FunctionDef) and n.name=='strict_hits')
exec(compile(ast.Module(body=[fn],type_ignores=[]),str(source),'exec'))
bpy.ops.wm.open_mainfile(filepath=str(P/'artifacts/fitted-human-skin-eyes-v4.blend'))
failed=json.loads((P/'receipts/finite-refit-initial.json').read_text());poses=[r for r in failed['cases'] if 'all-six=-1' in r['case']]
# Only the failing control packet, nine blink values plus neutral ocular surfaces.
poses=[{'case':f'all-six=-1/blink={k/8}','values':{**{n:-1 for n in ['body.height','body.shoulderWidth','nose.projection','nose.alarWidth','earLeft.protrusion','earRight.protrusion']},'expression.blinkLeft':k/8,'expression.blinkRight':k/8}} for k in range(9)]
choices=[(.00025,.00010),(.00025,.00005),(.00025,.00002),(.00024,.00001)]
rows=[]
for offset,dome in choices:
    caps={}
    for side in ['Left','Right']:
        o=bpy.data.objects['Fitted_Cornea_'+side];o.data.calc_loop_triangles();points=np.array([tuple(v.co) for v in o.data.vertices]);cx=.032 if side=='Left' else -.032
        r2=(points[:,0]-cx)**2+(points[:,2]-1.635)**2
        points[:,1]=-.036-.012*np.sqrt(np.maximum(0,1-r2/.012**2))-offset-dome*(1-r2/.00625**2)
        triangles=np.array([tuple(t.vertices) for t in o.data.loop_triangles]);caps[side]=(points,triangles)
    result={'offsetM':offset,'domeM':dome,'headRawPairs':0,'headProperPairs':0,'innerRawPairs':0,'innerProperPairs':0}
    for case in poses:
        values=case['values'];set_values(values);dg=bpy.context.evaluated_depsgraph_get()
        for side,(original,t) in caps.items():
            p=original.copy();p[:,2]+=(p[:,2]-.01)*.05*values.get('body.height',0);cap=(p,t,BVHTree.FromPolygons(p.tolist(),t.tolist(),all_triangles=True))
            for name in ['Head_continuous_anatomy','Eye_'+side,'Iris_'+side,'Pupil_'+side]:
                m=bpy.data.objects[name].evaluated_get(dg).data;m.calc_loop_triangles();v=np.array([tuple(x.co) for x in m.vertices]);ind=np.array([tuple(x.vertices) for x in m.loop_triangles]);target=(v,ind,BVHTree.FromPolygons(v.tolist(),ind.tolist(),all_triangles=True))
                raw=cap[2].overlap(target[2]);hits=strict_hits(cap,target,raw);key='head' if name.startswith('Head') else 'inner'
                result[key+'RawPairs']+=len(raw);result[key+'ProperPairs']+=len(hits)
    rows.append(result)
r={'purpose':'Four bounded depth candidates after all-controls-minimum cap crossings; no master geometry changes.','blinkSamplesPerDepth':9,'packet':'all six implemented controls = -1','depths':rows}
(P/'receipts/cap-depth-screen.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
