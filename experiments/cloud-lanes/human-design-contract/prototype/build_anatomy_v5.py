"""V5 bounded curved-loop eye/socket experiment from protected v4.
No downloaded geometry, material change, shared runtime or frozen-asset mutation.
"""
import bpy,math,json,hashlib,sys
import numpy as np
from pathlib import Path
from collections import Counter
from mathutils import Vector
from mathutils.geometry import tessellate_polygon,barycentric_transform
ROOT=Path(__file__).resolve().parent;sys.path.insert(0,str(ROOT))
from build_character import smooth,set_values,camera_view,DOC,face_y
OUT=ROOT/'anatomy-candidate-v5';OUT.mkdir(exist_ok=True)
PROOF=DOC/'anatomy-candidate-v5';PROOF.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
INPUT=ROOT/'anatomy-candidate-v4/anatomy-candidate-v4.blend'
assert sha(INPUT)=='fb6f488c55b01083fc23803a79e677ae957ecc237004de62a78bd8804ee76302'
fit=json.loads((ROOT/'anatomy-candidate-v4/fit-frame-candidate-v4.json').read_text())
prior=json.loads((DOC/'anatomy-candidate-v4/build-receipt.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(INPUT))
def hashes(obj):
    m=obj.data;m.calc_loop_triangles()
    h=lambda a,d='<f8':hashlib.sha256(np.array(a,dtype=d).tobytes()).hexdigest()
    return {'positions':h([tuple(v.co) for v in m.vertices]),'triangles':h([tuple(t.vertices) for t in m.loop_triangles],'<u4'),
            'uv':{uv.name:h([tuple(v.uv) for v in uv.data]) for uv in m.uv_layers},
            'keys':{k.name:h([tuple(v.co) for v in k.data]) for k in m.shape_keys.key_blocks} if m.shape_keys else {},
            'materials':[m.name for m in m.materials]}
before={o.name:hashes(o) for o in bpy.context.scene.objects if o.type=='MESH' and not o.name.startswith('STUDIO')}
headobj=bpy.data.objects['Head_continuous_anatomy'];head=headobj.data;head.calc_loop_triangles()
nold=prior['originalHeadVertexCount'];old=[v.co.copy() for v in head.vertices[:nold]]
keys0={k.name:[v.co.copy() for v in k.data[:nold]] for k in head.shape_keys.key_blocks}
# Remove the entire prior lid/bridge field and the coarse surrounding socket
# faces. Revert the v4 Y displacement so its sharp radial cutoff is not retained.
for change in prior['headPositionChanges']:
    i=change['vertex'];d=Vector(change['deltaMetres']);old[i]-=d
    for points in keys0.values():points[i]-=d
oldtri=[];oldfaceuv=[];removed_old_faces=[]
for j,t in enumerate(list(head.loop_triangles)[:prior['originalHeadTriangleCount']]):
    centre=sum((old[i] for i in t.vertices),Vector())/3
    inside=centre.y<0 and any(((centre.x-s*.032)/.027)**2+((centre.z-1.635)/.025)**2<1 for s in [-1,1])
    if inside:removed_old_faces.append(j);continue
    oldtri.append(tuple(t.vertices));oldfaceuv.append([tuple(head.uv_layers.active.data[i].uv) for i in t.loops])
vertexuv={loop.vertex_index:head.uv_layers.active.data[loop.index].uv.copy() for loop in head.loops if loop.vertex_index<nold}
edges=Counter(tuple(sorted((t[j],t[(j+1)%3]))) for t in oldtri for j in range(3));boundary=[e for e,c in edges.items() if c==1]
base=[p.copy() for p in old];positions={k:[p.copy() for p in v] for k,v in keys0.items()}
faces=list(oldtri);faceuv=list(oldfaceuv);regions={}
for side,tag in [(1,'Left'),(-1,'Right')]:
    cx,cy,cz=side*.032,-.036,1.635
    # Widen the globe about its unchanged anchor. Iris and pupil topology/UVs
    # stay v4-exact; only their spherical support depth changes.
    for prefix in ['Eye','Iris','Pupil']:
        obj=bpy.data.objects[prefix+'_'+tag];new=[]
        for v in obj.data.vertices:
            p=v.co
            if prefix=='Eye':q=Vector((cx+(p.x-cx)*(.0148/.012),cy+(p.y-cy)*(.013/.012),cz+(p.z-cz)*(.013/.012)))
            else:
                dx=p.x-cx;dz=p.z-cz;offset=.00016 if prefix=='Iris' else .00023
                q=Vector((p.x,cy-.013*math.sqrt(max(0,1-(dx/.0148)**2-(dz/.013)**2))-offset,p.z))
            new.append(q)
        for key in obj.data.shape_keys.key_blocks:
            for v,q in zip(key.data,new):
                value=q.copy()
                if key.name=='body.height':value.z+=(q.z-.01)*.05
                elif key.name!='Basis':raise AssertionError((obj.name,key.name))
                v.co=value
        for v,q in zip(obj.data.vertices,new):v.co=q
        obj.data.update()
    ids={i for edge in boundary for i in edge if old[i].x*side>0}
    loop=sorted(ids,key=lambda i:math.atan2((old[i].z-cz)/.025,(old[i].x-cx)/.027)%(2*math.pi))
    polygon=[Vector((old[i].x,old[i].z,0)) for i in loop]
    lookup={tuple(v):i for v,i in zip(polygon,loop)}
    uvtris=[tuple(loop[v] if isinstance(v,int) else lookup[tuple(v)] for v in tri) for tri in tessellate_polygon([polygon])]
    def weights_at(x,z):
        p=Vector((x,z,0))
        for tri in uvtris:
            a,b,c=[Vector((old[i].x,old[i].z,0)) for i in tri]
            w=barycentric_transform(p,a,b,c,Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1)))
            if min(w)>-2e-5 and max(w)<1+2e-5:return tri,w
        raise AssertionError(('Outside socket',tag,x,z))
    def interpolate(x,z,values):
        tri,w=weights_at(x,z)
        return sum((values[i]*v for i,v in zip(tri,w)),Vector((0,)*len(values[tri[0]])))
    samples=64;fractions=[0,.065,.16,.29,.46,.65,.83,1.0];grid=[];params={};newuv={}
    startface=len(faces);startvertex=len(base)
    def point(angle,t,blink):
        u=math.cos(angle);arc=math.sin(angle);tilt=side*.001*u
        open_z=(.0068 if arc>=0 else .0048)*arc+tilt
        closed_z=-.0016*(1-u*u)+tilt
        ix=.0142*u;iz=open_z*(1-blink)+closed_z*blink
        ox=.023*math.cos(angle);oz=.019*math.sin(angle)+tilt
        dx=ox-ix;dz=oz-iz;x=cx+ix+dx*t;z=cz+iz+dz*t
        root=math.sqrt(max(.025,1-(ix/.0148)**2-(iz/.013)**2))
        yi=cy-.013*root-.00065
        mi=.013*((ix/.0148**2)*dx+(iz/.013**2)*dz)/root
        yo=face_y(cx+ox,cz+oz)
        eps=.0001
        mo=(face_y(cx+ox+dx*eps,cz+oz+dz*eps)-face_y(cx+ox-dx*eps,cz+oz-dz*eps))/(2*eps)
        # C1 Hermite blend: globe tangent at the lid margin, original face
        # tangent at the orbital boundary. No rectangular intermediate sheet.
        y=(2*t**3-3*t*t+1)*yi+(t**3-2*t*t+t)*mi+(-2*t**3+3*t*t)*yo+(t**3-t*t)*mo
        return Vector((x,y,z))
    for t in fractions:
        ring=[]
        for j in range(samples):
            angle=2*math.pi*j/samples;p=point(angle,t,0);index=len(base);base.append(p);ring.append(index)
            params[index]=(angle,t);newuv[index]=interpolate(p.x,p.z,vertexuv)
            for key,original in keys0.items():
                if key=='Basis':value=p.copy()
                elif key=='body.height':value=p+Vector((0,0,(p.z-.01)*.05))
                elif key.startswith(('expression.blink','corrective.blinkArc','corrective.height.blink')):value=p.copy()
                else:
                    outer=point(angle,1,0);delta=interpolate(outer.x,outer.z,{i:original[i]-keys0['Basis'][i] for i in ids})
                    value=p+delta*smooth(0,1,t)
                positions[key].append(value)
        grid.append(ring)
    for row in range(len(grid)-1):
        for j in range(samples):
            a,b,c,d=grid[row][j],grid[row][(j+1)%samples],grid[row+1][(j+1)%samples],grid[row+1][j]
            for tri in [(a,b,c),(a,c,d)]:
                p,q,r=[base[i] for i in tri]
                if (q-p).cross(r-p).y>0:tri=tuple(reversed(tri))
                faces.append(tri);faceuv.append([tuple(newuv[i]) for i in tri])
    outer=sorted(loop,key=lambda i:math.atan2(base[i].z-cz,base[i].x-cx)%(2*math.pi))
    inner=sorted(grid[-1],key=lambda i:math.atan2(base[i].z-cz,base[i].x-cx)%(2*math.pi))
    # A visible cut from the rightmost outer vertex to the nearest rectangle
    # point makes a simple polygon with a hole. Angular zipper triangulation
    # can cross the rectangular corner, so use constrained polygon tessellation.
    oa=max(outer,key=lambda i:base[i].x)
    candidates=inner
    ia=min(candidates,key=lambda i:(base[i]-base[oa]).length)
    oi=outer.index(oa);clockwise=list(reversed(inner));ii=clockwise.index(ia)
    cut=outer[oi:]+outer[:oi]+[oa]+clockwise[ii:]+clockwise[:ii]+[ia]
    flat=[Vector((base[i].x,base[i].z,0)) for i in cut]
    flatlookup={tuple(p):i for p,i in zip(flat,cut)}
    queue=[]
    for result in tessellate_polygon([flat]):
        triangle=tuple(cut[i] if isinstance(i,int) else flatlookup[tuple(i)] for i in result)
        p,q,r=[base[i] for i in triangle]
        if abs((q-p).cross(r-p).y)>1e-12:queue.append(triangle)
    # Preserve collinear original boundary vertices: the tessellator may omit
    # them or emit zero-projected-area ears. Split spanning triangle edges at
    # those exact vertices instead of retaining degenerate faces/T-junctions.
    boundaryids=set(outer+inner);steps=0
    while queue:
        tri=queue.pop();steps+=1;assert steps<10000
        split=False
        for edge in range(3):
            a,b,c=tri[edge],tri[(edge+1)%3],tri[(edge+2)%3]
            va=Vector((base[a].x,base[a].z));vb=Vector((base[b].x,base[b].z));direction=vb-va
            for i in boundaryids-set(tri):
                p=Vector((base[i].x,base[i].z));t=(p-va).dot(direction)/direction.length_squared
                if 1e-6<t<1-1e-6 and (p-(va+direction*t)).length<1e-8:
                    queue.extend([(a,i,c),(i,b,c)]);split=True;break
            if split:break
        if split:continue
        p,q,r=[base[i] for i in tri]
        assert abs((q-p).cross(r-p).y)>1e-12,('Degenerate socket bridge',tri)
        if (q-p).cross(r-p).y>0:tri=tuple(reversed(tri))
        faces.append(tri);faceuv.append([tuple(newuv[i] if i in newuv else vertexuv[i]) for i in tri])
    regions[tag]={'firstNewVertex':startvertex,'lastNewVertexExclusive':len(base),'firstTriangle':startface,'lastTriangleExclusive':len(faces),'ringFractions':fractions,'ringSamples':samples,'apertureLoop':grid[0],
                  'aperturePairs':[(grid[0][j],grid[0][(-j)%samples]) for j in range(samples//2+1)]}
    for index,(angle,t) in params.items():
        neutral=base[index];closed=point(angle,t,1);half=point(angle,t,.5)
        positions['expression.blink'+tag][index]=closed
        positions['corrective.blinkArc'+tag][index]=neutral+half-(neutral+closed)*.5
        positions['corrective.height.blink'+tag][index]=neutral+Vector((0,0,(closed.z-neutral.z)*.05))

mesh=bpy.data.meshes.new('Head_curved_orbital_loops_v5');mesh.from_pydata(base,[],faces);mesh.update()
for material in head.materials:mesh.materials.append(material)
uv=mesh.uv_layers.new(name='Head_orbital_UV_v5')
for polygon,coords in zip(mesh.polygons,faceuv):
    polygon.use_smooth=True
    for index,p in zip(polygon.loop_indices,coords):uv.data[index].uv=p
headobj.data=mesh
for name,points in positions.items():
    assert len(points)==len(base),(name,len(points),len(base))
    block=headobj.shape_key_add(name=name)
    if name!='Basis' and not name.startswith('expression.'):block.slider_min=-1
    for v,p in zip(block.data,points):v.co=p
for block in mesh.shape_keys.key_blocks:
    if not block.name.startswith('corrective.'):continue
    driver=block.driver_add('value').driver
    if block.name.startswith('corrective.height.'):
        inputs=[('height','body.height'),('expression','expression.'+block.name.split('.')[-1])];driver.expression='height * expression'
    else:
        inputs=[('blink','expression.blink'+('Left' if block.name.endswith('Left') else 'Right'))];driver.expression='4 * blink * (1 - blink)'
    for name,key in inputs:
        variable=driver.variables.new();variable.name=name;variable.type='SINGLE_PROP'
        variable.targets[0].id_type='KEY';variable.targets[0].id=mesh.shape_keys;variable.targets[0].data_path='key_blocks["'+key+'"].value'
changed=['Head_continuous_anatomy']+[p+'_'+s for s in ['Left','Right'] for p in ['Eye','Iris','Pupil']]
protected=[]
for name,expected in before.items():
    if name not in changed:assert hashes(bpy.data.objects[name])==expected,name;protected.append(name)
set_values({});triangles=0
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.context.scene.objects:
    if obj.type=='MESH' and not obj.name.startswith('STUDIO'):
        obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles);obj.select_set(True)
# Preserve the 34k combined silhouette-bun allowance, including pinned caps/wardrobe.
assert triangles-2518+1200+502+2324<=34000,triangles
bpy.ops.export_scene.gltf(filepath=str(OUT/'anatomy-candidate-v5.glb'),export_format='GLB',use_selection=True,export_animations=False,
 export_morph=True,export_morph_normal=True,export_cameras=False,export_lights=False,export_yup=True,export_extras=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'anatomy-candidate-v5.blend'),compress=True)
report={'version':5,'inputCommit':'2921534bdc8959a8489713f9b1652381702808a5','inputBlendSha256':sha(INPUT),'triangles':triangles,'meshes':27,
 'changedMeshes':changed,'removedSeparateLids':[],'exactPreservedMeshes':protected,'protectedHashes':{n:before[n] for n in protected},
 'originalHeadVertexCount':nold,'originalHeadTriangleCount':len(oldtri),'removedOriginalHeadFaceIndices':removed_old_faces,'lidRegions':regions,
 'eyeCentresBlender':{'Left':[.032,-.036,1.635],'Right':[-.032,-.036,1.635]},'eyeRadiiMetres':[.0148,.013,.013],
 'nominalApertureWidthM':.0284,'centralNeutralApertureHeightM':.0116,'centralClosedSeamOffsetM':-.0016,
 'sharedAnchorsBlender':fit['anchorsBlenderMetres'],'blendSha256':sha(OUT/'anatomy-candidate-v5.blend'),'glbSha256':sha(OUT/'anatomy-candidate-v5.glb'),
 'status':'First curved orbital topology build; geometry checks and parent visual review pending.'}
(PROOF/'build-receipt.json').write_text(json.dumps(report,indent=2)+'\n')
for name,blink in ([] if '--no-render' in sys.argv else [('neutral',0),('half-blink',.5),('full-blink',1)]):
    set_values({'expression.blinkLeft':blink,'expression.blinkRight':blink});camera_view('portrait',0)
    scene=bpy.context.scene;scene.camera.data.ortho_scale=.32;scene.render.resolution_x=600;scene.render.resolution_y=720
    scene.cycles.samples=24;scene.cycles.use_denoising=False;scene.render.filepath=str(PROOF/(name+'.png'));bpy.ops.render.render(write_still=True)
print('ANATOMY_V5_BUILT',json.dumps({'triangles':triangles,'meshes':27,'preservedMeshes':len(protected),'removedOldFaces':len(removed_old_faces)}))
