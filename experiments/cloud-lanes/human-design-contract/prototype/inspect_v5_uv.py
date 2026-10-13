"""List exact overlapping v5 UV triangles; no candidate writes or renders."""
import bpy,ast,json,sys
import numpy as np
from pathlib import Path
ROOT=Path(__file__).resolve().parent
DOC=ROOT.parents[3]/'docs/agent-plans/cloud-lanes/human-design-contract/prototype'
source=ROOT/'check_lid_candidate_v3.py'
fn=next(n for n in ast.parse(source.read_text()).body if isinstance(n,ast.FunctionDef) and n.name=='uv_check')
# Diagnostic only: return the existing pair list without changing its algorithm.
ret=next(n for n in fn.body if isinstance(n,ast.Return));ret.value.keys.append(ast.Constant('overlapPairs'));ret.value.values.append(ast.Name(id='overlaps',ctx=ast.Load()))
exec(compile(ast.fix_missing_locations(ast.Module(body=[fn],type_ignores=[])),str(source),'exec'))
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'anatomy-candidate-v5/anatomy-candidate-v5.blend'))
mesh=bpy.data.objects['Head_continuous_anatomy'].data;mesh.calc_loop_triangles();nold=7888
result=uv_check(mesh);pairs=[p for p in result.pop('overlapPairs') if max(p[:2])>=nold]
triangles={}
for i in sorted({i for a,b,_ in pairs for i in [a,b]}):
    t=mesh.loop_triangles[i]
    triangles[i]={'vertices':list(t.vertices),'loops':list(t.loops),'uv':[list(mesh.uv_layers.active.data[j].uv) for j in t.loops],'xyz':[list(mesh.vertices[j].co) for j in t.vertices]}
report={'pairs':pairs,'triangles':triangles,'overall':result}
(DOC/'anatomy-candidate-v5-uv1/overlap-diagnostic.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
