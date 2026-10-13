"""Eye/head/lid anatomical correction; original anchors and six controls retained.

Starts from frozen 3ee, not a previous overlay. Resizes globes about their fixed
centres, reshapes local orbital head vertices and fills each actual head opening
with connected lids. No overlapping skin overlay or unrelated geometry change.
"""
import bpy,math,json,hashlib,sys
import numpy as np
from pathlib import Path
from collections import Counter,defaultdict
from mathutils import Vector
from mathutils.geometry import tessellate_polygon,barycentric_transform
ROOT=Path(__file__).resolve().parent;sys.path.insert(0,str(ROOT))
from build_character import smooth,set_values,camera_view,DOC
OUT=ROOT/'anatomy-candidate-v4';OUT.mkdir(exist_ok=True)
PROOF=DOC/'anatomy-candidate-v4';PROOF.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
fit=json.loads((ROOT/'fit-frame.json').read_text())
assert sha(ROOT/'original-human-prototype.blend')==fit['sourceBlendSha256']
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'original-human-prototype.blend'))

def hashes(obj):
    m=obj.data;m.calc_loop_triangles()
    h=lambda a,d='<f8':hashlib.sha256(np.array(a,dtype=d).tobytes()).hexdigest()
    return {'positions':h([tuple(v.co) for v in m.vertices]),'triangles':h([tuple(t.vertices) for t in m.loop_triangles],'<u4'),
            'uv':{uv.name:h([tuple(v.uv) for v in uv.data]) for uv in m.uv_layers},
            'keys':{k.name:h([tuple(v.co) for v in k.data]) for k in m.shape_keys.key_blocks} if m.shape_keys else {},
            'materials':[m.name for m in m.materials]}
before={o.name:hashes(o) for o in bpy.context.scene.objects if o.type=='MESH' and not o.name.startswith('STUDIO')}
headobj=bpy.data.objects['Head_continuous_anatomy'];head=headobj.data;head.calc_loop_triangles()
old=[v.co.copy() for v in head.vertices];nold=len(old)
keys0={k.name:[v.co.copy() for v in k.data] for k in head.shape_keys.key_blocks}
oldtri=[tuple(t.vertices) for t in head.loop_triangles]
oldfaceuv=[[tuple(head.uv_layers.active.data[i].uv) for i in t.loops] for t in head.loop_triangles]
vertexuv={loop.vertex_index:head.uv_layers.active.data[loop.index].uv.copy() for loop in head.loops}
edges=Counter(tuple(sorted((p.vertices[i],p.vertices[(i+1)%len(p.vertices)]))) for p in head.polygons for i in range(len(p.vertices)))
boundary=[e for e,c in edges.items() if c==1]

def orbital_y(p):
    y=p.y
    if p.y>=0:return y
    for side in [-1,1]:
        dx=p.x-side*.032;dz=p.z-1.635
        r=math.sqrt((dx/.028)**2+(dz/.027)**2)
        w=1-smooth(.65,1,r)
        target=-.0485+.004*(dx/.018)**2+.002*(dz/.022)**2
        y+=(min(y,target)-y)*w
    return y

base=[Vector((p.x,orbital_y(p),p.z)) for p in old]
positions={k:[q+(p0-p) for q,p0,p in zip(v,base,old)] for k,v in keys0.items()}
faces=list(oldtri);faceuv=list(oldfaceuv);regions={};head_changes=[]
for i,(a,b) in enumerate(zip(old,base)):
    if (a-b).length>1e-9:head_changes.append({'vertex':i,'deltaMetres':list(b-a)})

for side,tag in [(1,'Left'),(-1,'Right')]:
    centre=Vector((side*.032,-.036,1.635));cx,cy,cz=centre
    # A 24 mm globe replaces the oversized 36×28×28 mm envelope at the same anchor.
    for prefix in ['Eye','Iris','Pupil']:
        obj=bpy.data.objects[prefix+'_'+tag]
        if prefix=='Iris':
            # A radial fan's long chords cut into the sphere after resizing.
            # Three short radial intervals conform without a new appearance feature.
            mat=list(obj.data.materials);points=[(cx,cy,cz)];irisfaces=[];segments=32;rings=3
            for row in range(1,rings+1):
                radius=.006*row/rings
                points.extend((cx+radius*math.cos(2*math.pi*j/segments),cy,cz+radius*math.sin(2*math.pi*j/segments)) for j in range(segments))
            for j in range(segments):irisfaces.append((0,1+j,1+(j+1)%segments))
            for row in range(rings-1):
                for j in range(segments):
                    a=1+row*segments+j;b=1+row*segments+(j+1)%segments
                    irisfaces.extend([(a,a+segments,b+segments),(a,b+segments,b)])
            data=bpy.data.meshes.new(obj.name+'-conforming-v4');data.from_pydata(points,[],irisfaces);data.update();obj.data=data
            for m in mat:data.materials.append(m)
            obj.shape_key_add(name='Basis');obj.shape_key_add(name='body.height').slider_min=-1
            for p in data.polygons:p.use_smooth=True
        oldpoints=[v.co.copy() for v in obj.data.vertices];new=[]
        for p in oldpoints:
            if prefix=='Eye':q=centre+Vector(((p.x-cx)*(.012/.018),(p.y-cy)*(.012/.014),(p.z-cz)*(.012/.014)))
            else:
                dx=p.x-cx;dz=p.z-cz;offset=.00016 if prefix=='Iris' else .00023
                q=Vector((p.x,cy-.012*math.sqrt(max(0,1-(dx/.012)**2-(dz/.012)**2))-offset,p.z))
            new.append(q)
        for key in obj.data.shape_keys.key_blocks:
            for i,q in enumerate(new):
                value=q.copy()
                if key.name=='body.height':value.z+=(q.z-.01)*.05
                elif key.name!='Basis':raise AssertionError((obj.name,key.name))
                key.data[i].co=value
        for v,q in zip(obj.data.vertices,new):v.co=q
        obj.data.update()
        if prefix in ['Iris','Pupil']:
            while obj.data.uv_layers:obj.data.uv_layers.remove(obj.data.uv_layers[0])
            uv=obj.data.uv_layers.new(name='Eye_disc_UV_v4');radius=.006 if prefix=='Iris' else .00265
            for loop in obj.data.loops:
                p=new[loop.vertex_index];uv.data[loop.index].uv=(.5+(p.x-cx)/(2*radius),.5+(p.z-cz)/(2*radius))

    # Original eye-opening loop is connected, not covered. No duplicated rim verts.
    ids={i for edge in boundary for i in edge if old[i].x*side>0}
    loop=sorted(ids,key=lambda i:math.atan2(old[i].z-cz,old[i].x-cx)%(2*math.pi))
    polygon=[Vector((old[i].x,old[i].z,0)) for i in loop]
    lookup={tuple(v):i for v,i in zip(polygon,loop)}
    uvtris=[tuple(loop[v] if isinstance(v,int) else lookup[tuple(v)] for v in tri) for tri in tessellate_polygon([polygon])]
    def weights_at(x,z):
        p=Vector((x,z,0))
        for tri in uvtris:
            a,b,c=[Vector((old[i].x,old[i].z,0)) for i in tri]
            w=barycentric_transform(p,a,b,c,Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1)))
            if min(w)>-2e-5 and max(w)<1+2e-5:return tri,w
        raise AssertionError(('Outside old socket polygon',x,z))
    def interpolate(x,z,values):
        tri,w=weights_at(x,z)
        return sum((values[i]*v for i,v in zip(tri,w)),Vector((0,)*len(values[tri[0]])))
    def surface(x,z):
        # Continuous orbital sheet around a smaller globe; transition to the
        # head is geometric and welded, without a raised duplicate patch.
        surrounding=interpolate(x,z,base).y
        globe=1-((x-cx)/.0125)**2-((z-cz)/.0125)**2
        if globe<=0:return surrounding
        supported=cy-.0125*math.sqrt(globe)-.00015
        k=.0005;h=max(k-abs(surrounding-supported),0)/k
        return min(surrounding,supported)-h*h*k*.25
    samples=25;rows=5;rect_width=.012;rect_height=.007
    grids={};params={};newuv={};rimids=[]
    startface=len(faces);startvertex=len(base)
    for upper in [True,False]:
        grid=[]
        for row in range(rows+1):
            t=row/rows;line=[]
            for j in range(samples):
                u=-1+2*j/(samples-1);x=cx+rect_width*u
                open_z=(.0045 if upper else -.0034)*math.sqrt(max(0,1-u*u))
                outer_z=rect_height if upper else -rect_height
                z=cz+outer_z*(1-t)+open_z*t
                # Canthus columns are stationary; lower/upper share their endpoint.
                shared=None
                if not upper and row==rows and j in [0,samples-1]:shared=grids[True][rows][j]
                if shared is not None:line.append(shared);continue
                p=Vector((x,surface(x,z),z));index=len(base);base.append(p);line.append(index)
                params[index]=(x,outer_z,open_z,t,tag)
                newuv[index]=interpolate(x,z,vertexuv)
                sample_z=z+(cz-z)*smooth(0,1,t)
                for key,original in keys0.items():
                    if key=='Basis':value=p.copy()
                    elif key=='body.height':value=p+Vector((0,0,(p.z-.01)*.05))
                    else:
                        delta=interpolate(x,sample_z,{i:original[i]-keys0['Basis'][i] for i in ids})
                        value=p+delta
                    positions[key].append(value)
            grid.append(line)
        grids[upper]=grid
        for row in range(rows):
            for j in range(samples-1):
                a,b,c,d=grid[row][j],grid[row][j+1],grid[row+1][j+1],grid[row+1][j]
                for tri in [(a,b,c),(a,c,d)]:
                    p,q,r=[base[i] for i in tri]
                    if (q-p).cross(r-p).y>0:tri=tuple(reversed(tri))
                    faces.append(tri);faceuv.append([tuple(newuv[i]) for i in tri])
        rimids+=grid[0]
        rimids+=[grid[row][j] for row in range(1,rows+1) for j in [0,samples-1]]
    # Bridge the rectangular connected lid boundary into the old head opening.
    outer=sorted(loop,key=lambda i:math.atan2(base[i].z-cz,base[i].x-cx)%(2*math.pi))
    inner=sorted(set(rimids),key=lambda i:math.atan2(base[i].z-cz,base[i].x-cx)%(2*math.pi))
    # A visible cut from the rightmost outer vertex to the nearest rectangle
    # point makes a simple polygon with a hole. Angular zipper triangulation
    # can cross the rectangular corner, so use constrained polygon tessellation.
    oa=max(outer,key=lambda i:base[i].x)
    candidates=[i for i in inner if abs(base[i].x-(cx+rect_width))<1e-7]
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
    regions[tag]={'firstNewVertex':startvertex,'lastNewVertexExclusive':len(base),'firstTriangle':startface,'lastTriangleExclusive':len(faces),'gridRows':rows,'gridSamples':samples,'aperturePairs':list(zip(grids[True][-1],grids[False][-1]))}
    for key in ['expression.blink'+tag,'corrective.blinkArc'+tag,'corrective.height.blink'+tag]:positions[key]=[p.copy() for p in base]
    for index,(x,oz,az,t,_) in params.items():
        def point(blink):
            z=cz+oz*(1-t)+az*t*(1-blink)
            return Vector((x,surface(x,z),z))
        neutral=base[index];closed=point(1);half=point(.5)
        positions['expression.blink'+tag][index]=closed
        positions['corrective.blinkArc'+tag][index]=neutral+half-(neutral+closed)*.5
        positions['corrective.height.blink'+tag][index]=neutral+Vector((0,0,(closed.z-neutral.z)*.05))
    # Append untouched basis values to the previous eye's new blink channels.
    for key in positions:
        if len(positions[key])<len(base):positions[key].extend(p.copy() for p in base[len(positions[key]):])

mesh=bpy.data.meshes.new('Head_socket_anatomy_v4');mesh.from_pydata(base,[],faces);mesh.update()
for material in head.materials:mesh.materials.append(material)
uv=mesh.uv_layers.new(name='Head_socket_UV_v4')
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
removed=['UpperLid_Left','LowerLid_Left','UpperLid_Right','LowerLid_Right']
for name in removed:bpy.data.objects.remove(bpy.data.objects[name],do_unlink=True)
changed=['Head_continuous_anatomy']+[p+'_'+s for s in ['Left','Right'] for p in ['Eye','Iris','Pupil']]
protected=[]
for name,expected in before.items():
    if name not in changed+removed:assert hashes(bpy.data.objects[name])==expected,name;protected.append(name)
set_values({});triangles=0
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.context.scene.objects:
    if obj.type=='MESH' and not obj.name.startswith('STUDIO'):
        obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles);obj.select_set(True)
assert triangles<=32482,triangles
bpy.ops.export_scene.gltf(filepath=str(OUT/'anatomy-candidate-v4.glb'),export_format='GLB',use_selection=True,export_animations=False,
 export_morph=True,export_morph_normal=True,export_cameras=False,export_lights=False,export_yup=True,export_extras=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'anatomy-candidate-v4.blend'),compress=True)
report={'version':4,'frozenMasterCommit':'3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a','triangles':triangles,'meshes':27,
 'changedMeshes':changed,'removedSeparateLids':removed,'exactPreservedMeshes':protected,'protectedHashes':{n:before[n] for n in protected},
 'originalHeadVertexCount':nold,'originalHeadTriangleCount':len(oldtri),'headPositionChanges':head_changes,'lidRegions':regions,
 'eyeCentresBlender':{'Left':[.032,-.036,1.635],'Right':[-.032,-.036,1.635]},'eyeRadiiMetres':[.012,.012,.012],
 'sharedAnchorsBlender':fit['anchorsBlenderMetres'],'blendSha256':sha(OUT/'anatomy-candidate-v4.blend'),'glbSha256':sha(OUT/'anatomy-candidate-v4.glb'),
 'status':'Built candidate, validation pending. No realism or adoption claim.'}
(PROOF/'build-receipt.json').write_text(json.dumps(report,indent=2)+'\n')
for name,blink in ([] if '--no-render' in sys.argv else [('neutral',0),('half-blink',.5),('full-blink',1)]):
    set_values({'expression.blinkLeft':blink,'expression.blinkRight':blink});camera_view('portrait',0)
    scene=bpy.context.scene;scene.camera.data.ortho_scale=.32;scene.render.resolution_x=600;scene.render.resolution_y=720
    scene.cycles.samples=24;scene.cycles.use_denoising=False;scene.render.filepath=str(PROOF/(name+'.png'));bpy.ops.render.render(write_still=True)
print('ANATOMY_V4_BUILT',json.dumps({'triangles':triangles,'meshes':27,'preservedMeshes':len(protected),'localHeadVerticesChanged':len(head_changes)}))
