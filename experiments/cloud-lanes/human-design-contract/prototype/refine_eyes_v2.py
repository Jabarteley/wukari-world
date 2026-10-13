"""Eye-only derivative of frozen 3ee5882c. Never writes the original master files.

Keeps eye centres, head geometry/UV, topology, materials, hair and body intact.
Narrows the actual lid aperture and rebuilds its blink/height correctives.
"""
import hashlib
import json
import math
from pathlib import Path
import sys
import bpy
import numpy as np
from mathutils import Vector

ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT))
from build_character import face_y,smooth,set_values,camera_view,DOC

FROZEN='3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a'
OUT=ROOT/'eye-refinement-v2';OUT.mkdir(exist_ok=True)
IMAGES=DOC/'eye-refinement-v2';IMAGES.mkdir(exist_ok=True)
fit=json.loads((ROOT/'fit-frame.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(ROOT/'original-human-prototype.blend')==fit['sourceBlendSha256']
assert sha(ROOT/'original-human-prototype.glb')==fit['sourceGlbSha256']

def position_hash(obj):
    return hashlib.sha256(np.array([tuple(v.co) for v in obj.data.vertices],dtype='<f8').tobytes()).hexdigest()

before={obj.name:position_hash(obj) for obj in bpy.context.scene.objects if obj.type=='MESH' and not obj.name.startswith('STUDIO')}
changed=[]
for side,tag in [(1,'Left'),(-1,'Right')]:
    cx=side*.032;cy=-.036;cz=1.635
    for upper in [True,False]:
        name=('UpperLid_' if upper else 'LowerLid_')+tag
        obj=bpy.data.objects[name];changed.append(name)
        keys=obj.data.shape_keys.key_blocks
        assert len(obj.data.vertices)==165
        source=[];closed=[]
        for index in range(165):
            t=(index//33)/4;u=-1+2*(index%33)/32;arc=math.sqrt(max(0,1-u*u))
            inner=.0148;opening=.0048 if upper else -.0038
            x=cx+u*(inner*(1-t)+.024*t)
            z=cz+opening*(1-t)*arc+(.019 if upper else -.017)*t*arc+(x-cx)/inner*side*.0012
            def surface_y(at_z):
                globe=1-((x-cx)/.018)**2-((at_z-cz)/.014)**2
                y=face_y(x,at_z)+.0003*smooth(.85,1,t)
                return min(y,cy-.014*math.sqrt(globe)-.001) if globe>0 else y
            source.append(Vector((x,surface_y(z),z)))
            z_closed=z-opening*arc*(1-t)
            closed.append(Vector((x,surface_y(z_closed),z_closed)))
        for key in keys:
            for index,p in enumerate(source):
                value=p.copy()
                if key.name=='body.height':value.z+=(p.z-.010)*.05
                elif key.name=='expression.blink'+tag:value=closed[index]
                elif key.name=='corrective.height.blink'+tag:value.z+=(closed[index].z-p.z)*.05
                elif key.name!='Basis':raise AssertionError('Unexpected lid key '+key.name)
                key.data[index].co=value
        for index,p in enumerate(source):obj.data.vertices[index].co=p
        obj.data.update();obj.data.update_tag()

for obj in bpy.context.scene.objects:
    if obj.type=='MESH' and obj.name in before and obj.name not in changed:
        assert before[obj.name]==position_hash(obj), 'Changed protected geometry '+obj.name

# Check actual dependency-graph evaluated mesh positions, not just the formula.
checks=[]
for height in [-1,0,1]:
    for blink in [0,.5,1]:
        values={'body.height':height,'expression.blinkLeft':blink,'expression.blinkRight':blink}
        set_values(values)
        deps=bpy.context.evaluated_depsgraph_get()
        for name in changed:
            obj=bpy.data.objects[name];keys=obj.data.shape_keys.key_blocks
            tag='Left' if name.endswith('Left') else 'Right'
            basis=np.array([tuple(v.co) for v in keys['Basis'].data])
            expected=basis.copy()
            for key,value in [('body.height',height),('expression.blink'+tag,blink),('corrective.height.blink'+tag,height*blink)]:
                expected+=(np.array([tuple(v.co) for v in keys[key].data])-basis)*value
            evaluated=np.array([tuple(v.co) for v in obj.evaluated_get(deps).data.vertices])
            delta=float(np.abs(evaluated-expected).max())
            assert delta<2e-6, (name,height,blink,delta)
            obj.data.calc_loop_triangles();tri=np.array([tuple(t.vertices) for t in obj.data.loop_triangles])
            before_n=np.cross(basis[tri[:,1]]-basis[tri[:,0]],basis[tri[:,2]]-basis[tri[:,0]])
            after_n=np.cross(evaluated[tri[:,1]]-evaluated[tri[:,0]],evaluated[tri[:,2]]-evaluated[tri[:,0]])
            assert np.isfinite(evaluated).all()
            assert np.all(np.linalg.norm(after_n,axis=1)*.5>1e-14)
            assert not np.any(before_n[:,1]*after_n[:,1]<-(before_n[:,1]**2)*1e-4)
            checks.append({'mesh':name,'height':height,'blink':blink,'maximumEvaluatedErrorMetres':delta})

set_values({})
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.context.scene.objects:
    if obj.type=='MESH' and not obj.name.startswith('STUDIO'):obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'eye-refinement-v2.glb'),export_format='GLB',use_selection=True,
    export_animations=False,export_morph=True,export_morph_normal=False,export_morph_tangent=False,
    export_cameras=False,export_lights=False,export_yup=True,export_extras=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'eye-refinement-v2.blend'),compress=True)

for label,values in [('neutral',{}),('blink',{'expression.blinkLeft':1,'expression.blinkRight':1})]:
    set_values(values);camera_view('portrait',0)
    bpy.context.scene.camera.data.ortho_scale=.32
    bpy.context.scene.render.resolution_x=600;bpy.context.scene.render.resolution_y=720
    bpy.context.scene.cycles.samples=32;bpy.context.scene.cycles.use_denoising=False
    bpy.context.scene.render.filepath=str(IMAGES/(label+'.png'))
    bpy.ops.render.render(write_still=True)

assert sha(ROOT/'original-human-prototype.blend')==fit['sourceBlendSha256']
assert sha(ROOT/'original-human-prototype.glb')==fit['sourceGlbSha256']
report={
    'schemaVersion':1,'derivative':'eye-refinement-v2','frozenMasterCommit':FROZEN,
    'changedObjects':changed,'protectedGeometryUnchanged':True,'originalMasterBytesUnchanged':True,
    'change':'Lid aperture narrowed to 29.6 mm width and 8.6 mm central height; body, head, eyes, materials, hair and UV/index topology retained.',
    'blenderEyeCenters':{'left':[.032,-.036,1.635],'right':[-.032,-.036,1.635]},
    'fitFrame':'Inherits prototype-geometry coordinates from fit-frame.json. Lid positions/morphs only are a derivative; do not substitute it for the frozen master silently.',
    'blendSha256':sha(OUT/'eye-refinement-v2.blend'),'glbSha256':sha(OUT/'eye-refinement-v2.glb'),
    'evaluatedCases':len(checks),'checks':checks,
    'acceptance':'Geometry checks passed; neutral/blink pixels require review. Unfinished stylized prototype, no production or realistic-human acceptance.',
}
(IMAGES/'refinement-receipt.json').write_text(json.dumps(report,indent=2)+'\n')
print('EYE_REFINEMENT_COMPLETE',json.dumps({'evaluatedCases':len(checks),'protectedGeometryUnchanged':True,'originalMasterBytesUnchanged':True}),flush=True)
