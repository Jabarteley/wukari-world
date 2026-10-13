"""Separate four-lid candidate; clears eye/head envelope, replaces lid UVs.

Only four lid datablocks change. All other mesh/UV/morph bytes are verified.
The frozen head intersects the frozen eyes: residual rim contacts are reported,
not hidden or repaired by unauthorized head/eye changes.
"""
import hashlib, json, math, sys
from collections import Counter
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform

ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT))
from build_character import face_y,smooth,set_values,camera_view,DOC
OUT=ROOT/'eyelid-candidate-v3';OUT.mkdir(exist_ok=True)
PROOF=DOC/'eyelid-candidate-v3';PROOF.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
fit=json.loads((ROOT/'fit-frame.json').read_text())
assert sha(ROOT/'original-human-prototype.blend')==fit['sourceBlendSha256']
assert sha(ROOT/'original-human-prototype.glb')==fit['sourceGlbSha256']
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'original-human-prototype.blend'))

def mesh_hashes(obj):
    m=obj.data;m.calc_loop_triangles()
    def digest(values,dtype='<f8'):return hashlib.sha256(np.array(values,dtype=dtype).tobytes()).hexdigest()
    return {'positions':digest([tuple(v.co) for v in m.vertices]),
            'triangles':digest([tuple(t.vertices) for t in m.loop_triangles],'<u4'),
            'uv':{uv.name:digest([tuple(v.uv) for v in uv.data]) for uv in m.uv_layers},
            'shapeKeys':{k.name:digest([tuple(v.co) for v in k.data]) for k in m.shape_keys.key_blocks} if m.shape_keys else {},
            'materialNames':[mat.name for mat in m.materials]}

before={o.name:mesh_hashes(o) for o in bpy.context.scene.objects if o.type=='MESH' and not o.name.startswith('STUDIO')}
head=bpy.data.objects['Head_continuous_anatomy'].data
edges=Counter(tuple(sorted((p.vertices[i],p.vertices[(i+1)%len(p.vertices)]))) for p in head.polygons for i in range(len(p.vertices)))
boundary=[e for e,n in edges.items() if n==1]
head_keys={k.name:[v.co.copy() for v in k.data] for k in head.shape_keys.key_blocks}
head.calc_loop_triangles()
head_tri=[tuple(t.vertices) for t in head.loop_triangles]
head_tree=BVHTree.FromPolygons([v.co for v in head.vertices],head_tri,all_triangles=True)
changed=[];bindings={}

for side,tag in [(1,'Left'),(-1,'Right')]:
    cx=side*.032;cy=-.036;cz=1.635
    selected=[]
    for polygon in head.polygons:
        center=sum((head.vertices[i].co for i in polygon.vertices),Vector())/len(polygon.vertices)
        if center.y<0 and ((center.x-cx)/.027)**2+((center.z-cz)/.023)**2<1:selected.append(polygon)
    selected_edges=Counter(tuple(sorted((p.vertices[i],p.vertices[(i+1)%len(p.vertices)]))) for p in selected for i in range(len(p.vertices)))
    outer_edges=[e for e,n in selected_edges.items() if n==1 and e not in boundary]
    outer_ids={i for edge in outer_edges for i in edge}
    rim=sorted((math.atan2(head.vertices[i].co.z-cz,head.vertices[i].co.x-cx)%(2*math.pi),i) for i in outer_ids)
    angles=sorted(set([a for a,i in rim]+[2*math.pi*i/64 for i in range(65)]))
    def head_sample(x,z):
        hit,normal,index,distance=head_tree.ray_cast(Vector((x,-.2,z)),Vector((0,1,0)))
        if hit is None or hit.y>=0:return None
        tri=head_tri[index]
        weights=barycentric_transform(hit,*(head.vertices[i].co for i in tri),Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1)))
        return hit,tri,weights
    def outer(angle):
        direction=Vector((math.cos(angle),math.sin(angle)))
        cross=lambda p,q:p.x*q.y-p.y*q.x
        for index,(a,ia) in enumerate(rim):
            b,ib=rim[(index+1)%len(rim)];b=b if b>a else b+2*math.pi
            theta=angle if angle>=a else angle+2*math.pi
            if a-1e-9<=theta<=b+1e-9:
                pa=head.vertices[ia].co;pb=head.vertices[ib].co
                a2=Vector((pa.x-cx,pa.z-cz));delta=Vector((pb.x-pa.x,pb.z-pa.z))
                f=max(0,min(1,-cross(a2,direction)/cross(delta,direction)))
                return pa.lerp(pb,f),(ia,ib,ib),Vector((1-f,f,0))
        raise AssertionError(angle)
    for upper in [True,False]:
        name=('UpperLid_' if upper else 'LowerLid_')+tag
        changed.append(name);obj=bpy.data.objects[name]
        half=[a for a in angles if (0-1e-9<=a<=math.pi+1e-9 if upper else math.pi-1e-9<=a<=2*math.pi+1e-9)]
        samples=[outer(a) for a in half];count=len(half);radial=12
        def position(angle,t,o,blink):
            inner=.0132
            ix=cx+inner*math.cos(angle)
            tilt=(ix-cx)/inner*side*.0012
            iz=cz+tilt+(.0052 if upper else .0037)*math.sin(angle)*(1-blink)
            x=o.x*(1-t)+ix*t;z=o.z*(1-t)+iz*t
            # The frozen rim is partly inside the globe. This separate skin patch
            # covers that rim without editing the head. It is not a welded repair.
            sample=head_sample(x,z)
            face=(o.y if t==0 else sample[0].y if sample is not None else face_y(x,z))-(.000002+.000498*smooth(0,.07,t))
            globe=1-((x-cx)/.0195)**2-((z-cz)/.0155)**2
            y=face
            if globe>0:
                support=cy-.015*math.sqrt(globe)-.00015
                k=.0012;h=max(k-abs(face-support),0)/k
                supported=min(face,support)-h*h*k*.25
                y=supported
            return Vector((x,y,z))
        def points(blink):
            return [position(a,row/radial,o,blink) for row in range(radial+1) for a,(o,tri,weights) in zip(half,samples)]
        base=points(0);closed=points(1);halfway=points(.5)
        faces=[]
        for row in range(radial):
            for j in range(count-1):
                i=row*count+j;faces.append((i,i+1,i+count+1,i+count))
        materials=list(obj.data.materials)
        mesh=bpy.data.meshes.new(name+'-v3-envelope-clearance');mesh.from_pydata(base,[],faces);mesh.update()
        obj.data=mesh
        for mat in materials:mesh.materials.append(mat)
        for p in mesh.polygons:p.use_smooth=True
        # Correct winding faces outward toward -Y; both upper/lower follow increasing angle.
        if sum(p.normal.y for p in mesh.polygons)>0:
            mesh.flip_normals()
        uv=mesh.uv_layers.new(name='Eyelid_UV_v3')
        start=0 if upper else math.pi
        for loop in mesh.loops:
            index=loop.vertex_index;row,j=divmod(index,count)
            uv.data[loop.index].uv=((half[j]-start)/math.pi,row/radial)
        obj.shape_key_add(name='Basis')
        for key,source in head_keys.items():
            if key=='Basis':continue
            block=obj.shape_key_add(name=key);block.slider_min=-1 if not key.startswith('expression.') else 0
            for index,p in enumerate(base):
                row,j=divmod(index,count);t=row/radial;o,tri,weights=samples[j]
                if key=='body.height':delta=Vector((0,0,(p.z-.01)*.05))
                else:
                    sample=head_sample(p.x,p.z)
                    if sample is not None:_,tri,weights=sample
                    delta=sum(((source[i]-head_keys['Basis'][i])*w for i,w in zip(tri,weights)),Vector())
                    if sample is None:delta*=1-smooth(0,1,t)
                block.data[index].co=p+delta
        blink_name='expression.blink'+tag
        for key,values in [(blink_name,closed),('corrective.blinkArc'+tag,[p+h-(p+c)*.5 for p,c,h in zip(base,closed,halfway)]),
                           ('corrective.height.blink'+tag,[p+Vector((0,0,(c.z-p.z)*.05)) for p,c in zip(base,closed)])]:
            block=obj.shape_key_add(name=key)
            if key.startswith('corrective.height.'):block.slider_min=-1
            for v,p in zip(block.data,values):v.co=p
        keys=mesh.shape_keys.key_blocks
        for key in keys:
            if not key.name.startswith('corrective.'):continue
            driver=key.driver_add('value').driver
            if key.name.startswith('corrective.height.'):
                inputs=[('height','body.height'),('expression','expression.'+key.name.split('.')[-1])]
                driver.expression='height * expression'
            else:
                inputs=[('blink',blink_name)];driver.expression='4 * blink * (1 - blink)'
            for varname,path in inputs:
                assert path in keys,(name,path)
                var=driver.variables.new();var.name=varname;var.type='SINGLE_PROP'
                var.targets[0].id_type='KEY';var.targets[0].id=mesh.shape_keys
                var.targets[0].data_path='key_blocks["'+path+'"].value'
        # Blend outer normals into the unchanged head's interpolated normals.
        # This changes only lid normals, avoiding a hard shading seam at its edge.
        normals=[]
        for index,vertex in enumerate(mesh.vertices):
            row,j=divmod(index,count);t=row/radial
            sample=head_sample(vertex.co.x,vertex.co.z)
            normal=vertex.normal.copy()
            if row==0 or sample is not None:
                if row==0:_,tri,weights=samples[j]
                else:_,tri,weights=sample
                target=sum((head.vertices[i].normal*w for i,w in zip(tri,weights)),Vector()).normalized()
                normal=target.lerp(normal,smooth(0,.35,t)).normalized()
            normals.append(normal)
        mesh.normals_split_custom_set_from_vertices(normals)
        bindings[name]={'radialSegments':radial,'angularSamples':count,'headSurfaceBindings':[{'vertex':j,'headTriangle':list(tri),'barycentric':list(weights)} for j,(o,tri,weights) in enumerate(samples)],
                        'uvLayer':'Eyelid_UV_v3','shapeKeys':list(keys.keys())}
        obj['candidate_version']='eyelid-candidate-v3; review required; only lid geometry/UV changed'
        obj['blink_arc_rule']='corrective.blinkArc'+tag+' = 4 * expression.blink'+tag+' * (1 - expression.blink'+tag+')'

protected=[]
for name,source in before.items():
    if name not in changed:
        assert mesh_hashes(bpy.data.objects[name])==source,name
        protected.append(name)
set_values({})
triangles=0
for obj in bpy.context.scene.objects:
    if obj.type=='MESH' and not obj.name.startswith('STUDIO'):
        obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
assert triangles<=34000,triangles
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.context.scene.objects:
    if obj.type=='MESH' and not obj.name.startswith('STUDIO'):obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'eyelid-candidate-v3.glb'),export_format='GLB',use_selection=True,
    export_animations=False,export_morph=True,export_morph_normal=True,export_morph_tangent=False,
    export_cameras=False,export_lights=False,export_yup=True,export_extras=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'eyelid-candidate-v3.blend'),compress=True)
(PROOF/'build-receipt.json').write_text(json.dumps({'schemaVersion':3,'frozenMasterCommit':'3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a',
 'changedMeshes':changed,'exactPreservedMeshes':protected,'protectedHashes':{n:before[n] for n in protected},'meshCount':31,'triangles':triangles,
 'bindings':bindings,'blendSha256':sha(OUT/'eyelid-candidate-v3.blend'),'glbSha256':sha(OUT/'eyelid-candidate-v3.glb'),
 'compatibility':'All 27 other mesh positions, ordered triangles, UVs, all shape keys and material bindings are exact. Four lid topology/UVs change and need new lid textures only if parent adopts. Six identity control semantics retained. New blink-arc corrective rule is required by glTF consumers. No receiving lane should rebind until review.',
 'status':'UNREVIEWED_CANDIDATE; overlapping lid/head skin patch rather than weld; collision/visual checks follow; inherited eye/head crossing not repaired.'},indent=2)+'\n')
for name,blink in ([] if '--no-render' in sys.argv else [('neutral',0),('half-blink',.5),('full-blink',1)]):
    set_values({'expression.blinkLeft':blink,'expression.blinkRight':blink});camera_view('portrait',0)
    scene=bpy.context.scene;scene.camera.data.ortho_scale=.32
    scene.render.resolution_x=600;scene.render.resolution_y=720;scene.cycles.samples=24;scene.cycles.use_denoising=False
    scene.render.filepath=str(PROOF/(name+'.png'));bpy.ops.render.render(write_still=True)
assert sha(ROOT/'original-human-prototype.blend')==fit['sourceBlendSha256']
assert sha(ROOT/'original-human-prototype.glb')==fit['sourceGlbSha256']
print('LID_CANDIDATE_CREATED',json.dumps({'triangles':triangles,'protectedMeshes':len(protected),'changedMeshes':changed}))
