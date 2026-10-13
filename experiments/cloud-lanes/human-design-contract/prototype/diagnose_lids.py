"""Reproduce inherited eye/lid BVH contacts without consuming material derivative geometry."""
import bpy, json, sys
from pathlib import Path
from collections import Counter, defaultdict
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT))
from build_character import set_values,DOC
OUT=DOC/'eyelid-candidate-v3';OUT.mkdir(exist_ok=True)
report={}
for label,path in [('frozen',ROOT/'original-human-prototype.blend'),('v2',ROOT/'eye-refinement-v2/eye-refinement-v2.blend')]:
    bpy.ops.wm.open_mainfile(filepath=str(path))
    cases=[]
    for blink in [0,.5,1]:
        set_values({'expression.blinkLeft':blink,'expression.blinkRight':blink})
        dg=bpy.context.evaluated_depsgraph_get()
        def tree(name):
            obj=bpy.data.objects[name].evaluated_get(dg);mesh=obj.data;mesh.calc_loop_triangles()
            return BVHTree.FromPolygons([v.co for v in mesh.vertices],[tuple(t.vertices) for t in mesh.loop_triangles],all_triangles=True,epsilon=1e-9)
        pairs=[]
        for side in ['Left','Right']:
            pairs.append({'lid':'Eye_'+side,'other':'Head_continuous_anatomy','trianglePairs':len(tree('Eye_'+side).overlap(tree('Head_continuous_anatomy')))})
            for lid in ['UpperLid_'+side,'LowerLid_'+side]:
                for other in ['Eye_'+side,'Iris_'+side,'Pupil_'+side,'Head_continuous_anatomy']:
                    hits=tree(lid).overlap(tree(other))
                    pairs.append({'lid':lid,'other':other,'trianglePairs':len(hits)})
        cases.append({'blink':blink,'pairs':pairs})
    report[label]=cases
    if label=='frozen':
        set_values({});head=bpy.data.objects['Head_continuous_anatomy'].data
        edges=Counter(tuple(sorted((p.vertices[i],p.vertices[(i+1)%len(p.vertices)]))) for p in head.polygons for i in range(len(p.vertices)))
        boundary=[e for e,n in edges.items() if n==1]
        record={'vertices':{str(i):list(head.vertices[i].co) for e in boundary for i in e},'edges':boundary}
        (OUT/'head-hole-boundary.json').write_text(json.dumps(record,indent=2)+'\n')
        print('HEAD_BOUNDARY',len(boundary),'edges',len(record['vertices']),'vertices')
(OUT/'inherited-intersections.json').write_text(json.dumps(report,indent=2)+'\n')
for label,cases in report.items():
    print(label,[{'blink':c['blink'],'eyeLidPairs':sum(p['trianglePairs'] for p in c['pairs'] if p['other'].startswith('Eye_')),'headLidPairs':sum(p['trianglePairs'] for p in c['pairs'] if p['other'].startswith('Head') and 'Lid' in p['lid']),'eyeHeadPairs':sum(p['trianglePairs'] for p in c['pairs'] if p['lid'].startswith('Eye_'))} for c in cases])
