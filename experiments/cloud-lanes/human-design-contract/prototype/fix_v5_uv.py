"""Correct one v5 UV vertex; preserve every geometry/control/material value."""
import ast,bpy,hashlib,json,math,struct,sys
from pathlib import Path
from types import SimpleNamespace
import numpy as np
ROOT=Path(__file__).resolve().parent
DOC=ROOT.parents[3]/'docs/agent-plans/cloud-lanes/human-design-contract/prototype'
OUT=ROOT/'anatomy-candidate-v5-uv1';EVIDENCE=DOC/'anatomy-candidate-v5-uv1'
OUT.mkdir(exist_ok=True);EVIDENCE.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
original=ROOT/'anatomy-candidate-v5/anatomy-candidate-v5.blend'
assert sha(original)=='4152f4deb9acf722b5327a95fbab7201c7f8f1ef87cfafb8b0b3acb19e33e09d'
for filename,name in [('check_lid_candidate_v3.py','uv_check'),('verify_lid_export_v3.py','decode')]:
    source=ROOT/filename;fn=next(n for n in ast.parse(source.read_text()).body if isinstance(n,ast.FunctionDef) and n.name==name)
    exec(compile(ast.Module(body=[fn],type_ignores=[]),str(source),'exec'))
bpy.ops.wm.open_mainfile(filepath=str(original))
def hashes(obj):
    m=obj.data;m.calc_loop_triangles();h=lambda v,d='<f8':hashlib.sha256(np.array(v,dtype=d).tobytes()).hexdigest()
    drivers=[]
    animation=m.shape_keys.animation_data if m.shape_keys else None
    for curve in animation.drivers if animation else []:
        driver=curve.driver
        drivers.append({'path':curve.data_path,'index':curve.array_index,'type':driver.type,'expression':driver.expression,
            'variables':[(v.name,v.type,[(t.id.name if t.id else None,t.data_path) for t in v.targets]) for v in driver.variables]})
    return {'positions':h([tuple(v.co) for v in m.vertices]),'triangles':h([tuple(t.vertices) for t in m.loop_triangles],'<u4'),
        'cornerNormals':h([tuple(n.vector) for n in m.corner_normals]),
        'uv':{u.name:h([tuple(v.uv) for v in u.data]) for u in m.uv_layers},
        'keys':{k.name:h([tuple(v.co) for v in k.data]) for k in m.shape_keys.key_blocks} if m.shape_keys else {},
        'keySettings':hashlib.sha256(json.dumps([(k.name,k.value,k.slider_min,k.slider_max,k.relative_key.name,k.vertex_group) for k in m.shape_keys.key_blocks] if m.shape_keys else [],separators=(',',':')).encode()).hexdigest(),
        'drivers':hashlib.sha256(json.dumps(drivers,sort_keys=True).encode()).hexdigest(),'matrix':h([list(row) for row in obj.matrix_world]),
        'materialNames':[x.name for x in m.materials],'materialIndices':hashlib.sha256(json.dumps([p.material_index for p in m.polygons],separators=(',',':')).encode()).hexdigest()}
objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.name.startswith('STUDIO')]
before={o.name:hashes(o) for o in objects}
head=bpy.data.objects['Head_continuous_anatomy'].data;uv=head.uv_layers.active.data
before_uv=[tuple(v.uv) for v in uv]
# Keep V and the complete original seam fixed. Move only new vertex 5074 to
# the correct side of the linear continuation of edge 1851 -> 1915.
by_vertex={loop.vertex_index:uv[loop.index].uv.copy() for loop in head.loops}
a,b,p=[by_vertex[i] for i in [1851,1915,5074]]
assert max(abs(p[i]-[.41507062315940857,.4725876450538635][i]) for i in range(2))<1e-10
edge_u=a.x+(b.x-a.x)*(p.y-a.y)/(b.y-a.y)
target_u=edge_u+0.00005
changed=[]
for loop in head.loops:
    if loop.vertex_index==5074:
        uv[loop.index].uv.x=target_u
        changed.append({'loop':loop.index,'before':before_uv[loop.index],'after':list(uv[loop.index].uv)})
assert changed and all(item['before'][1]==item['after'][1] for item in changed)
assert all(tuple(v.uv)==before_uv[i] for i,v in enumerate(uv) if head.loops[i].vertex_index!=5074)
head.update()
after={o.name:hashes(o) for o in objects}
for name,previous in before.items():
    for key,value in previous.items():
        if name=='Head_continuous_anatomy' and key=='uv':continue
        assert after[name][key]==value,(name,key)
count=7888;head.calc_loop_triangles()
subset=lambda triangles:SimpleNamespace(calc_loop_triangles=lambda:None,uv_layers=head.uv_layers,loop_triangles=triangles)
old=uv_check(subset(list(head.loop_triangles)[:count]));new=uv_check(subset(list(head.loop_triangles)[count:]));all_uv=uv_check(head)
assert old['positiveAreaOverlapPairs']==2102 and new['positiveAreaOverlapPairs']==0
assert all_uv['positiveAreaOverlapPairs']-old['positiveAreaOverlapPairs']==0
assert all(tuple(uv[i].uv)==before_uv[i] for t in list(head.loop_triangles)[:count] for i in t.loops)
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
glb=OUT/'anatomy-candidate-v5-uv1.glb';blend=OUT/'anatomy-candidate-v5-uv1.blend'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_animations=False,
 export_morph=True,export_morph_normal=True,export_cameras=False,export_lights=False,export_yup=True,export_extras=True)
bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
old_export=decode(ROOT/'anatomy-candidate-v5/anatomy-candidate-v5.glb');new_export=decode(glb)
assert old_export['triangles']==new_export['triangles']==30194
assert old_export['objects'].keys()==new_export['objects'].keys()
for name,previous in old_export['objects'].items():
    for key,value in previous.items():
        if name=='Head_continuous_anatomy' and key=='uv':continue
        assert new_export['objects'][name][key]==value,(name,key)
report={'status':'UV-only correction verified; unchanged full checker is next','inputCommit':'c54141c1eb809f1c529e5808e46d228f3451e20f',
 'inputBlendSha256':sha(original),'inputGlbSha256':old_export['sha256'],'blendSha256':sha(blend),'glbSha256':sha(glb),
 'vertex':5074,'uvCoordinate':'U only','oldUv':list(p),'newUv':[float(uv[changed[0]['loop']].uv.x),float(p.y)],
 'deltaU':float(uv[changed[0]['loop']].uv.x-p.x),'edgeContinuationU':edge_u,'clearanceU':.00005,'changedUvCorners':changed,
 'unchangedOriginalHeadUvTriangles':count,'preservedGeometryAndControlsMeshes':len(objects),'unchangedOtherMeshUvs':len(objects)-1,
 'allOtherHeadUvCornersExact':True,'triangles':30194,'meshes':27,'sourceBefore':before,'sourceAfter':after,
 'exportGeometryAndMorphsExact':True,'exportObjects':new_export['objects'],
 'uvCounts':{'originalOriginal':old['positiveAreaOverlapPairs'],'newNew':new['positiveAreaOverlapPairs'],'newOriginal':all_uv['positiveAreaOverlapPairs']-old['positiveAreaOverlapPairs']},
 'checkerSha256':sha(ROOT/'check_anatomy_v5.py'),'rendered':False,'skinRefit':False,'visualAcceptance':False}
(EVIDENCE/'correction-receipt.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['sourceBefore','sourceAfter','exportObjects','changedUvCorners']},indent=2))
