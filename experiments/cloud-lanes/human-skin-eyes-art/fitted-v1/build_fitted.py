"""Derive materials from the pinned human bytes. Never rebuild or save the input master.
Preserve its mesh/UV/morph data; analytically raster-bake into Prototype_UV_v1.
"""
import bpy,math,json,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
from mathutils import Vector
P=Path(__file__).resolve().parent;CAL=P.parent
bpy.ops.wm.open_mainfile(filepath=str(P/'inputs/original-human-prototype.blend'))
S=bpy.context.scene
S.render.threads_mode='FIXED';S.render.threads=2;S.cycles.samples=32;S.cycles.use_denoising=False
S.render.resolution_x=520;S.render.resolution_y=600
VARIANTS=['01_umber','02_copper','03_rose'];BASE=np.array([[.36,.205,.14],[.60,.37,.235],[.77,.57,.45]])
SOURCE={name:np.asarray(Image.open(CAL/'textures'/name).convert('RGB'),dtype=float)/255 for name in ['skin_normal.png','skin_roughness.png','iris_basecolor.png','sclera_basecolor.png']+[f'skin_{v}_basecolor.png' for v in VARIANTS]}
material_sets={};raster_receipt=[]

def save(name,a):
    Image.fromarray(np.uint8(np.clip(a,0,1)*255+.5)).save(P/'textures'/name,optimize=True)

def sample(a,u,v):
    # Image arrays are top-down, Blender UV +V is up.
    x=np.floor((u%1)*a.shape[1]).astype(int);y=np.floor((1-v%1)*a.shape[0]).astype(int)%a.shape[0]
    return a[y,x]

def raster(obj,n):
    me=obj.data;me.calc_loop_triangles();pos=np.zeros((n,n,3));normal=np.zeros_like(pos);hits=np.zeros((n,n),np.uint8)
    uv=me.uv_layers['Prototype_UV_v1'];p=np.array([tuple(v.co) for v in me.vertices]);norm=np.array([tuple(v.normal) for v in me.vertices])
    for tri in me.loop_triangles:
        t=np.array([tuple(uv.data[i].uv) for i in tri.loops]);ind=list(tri.vertices)
        for shift in [-1,0,1]:
            q=t.copy();q[:,0]+=shift;q[:,0]*=n;q[:,1]=(1-q[:,1])*n
            lo=np.maximum(np.floor(q.min(0)).astype(int),0);hi=np.minimum(np.ceil(q.max(0)).astype(int),n)
            if (hi<=lo).any():continue
            xx,yy=np.meshgrid(np.arange(lo[0],hi[0])+.5,np.arange(lo[1],hi[1])+.5)
            den=(q[1,1]-q[2,1])*(q[0,0]-q[2,0])+(q[2,0]-q[1,0])*(q[0,1]-q[2,1])
            if abs(den)<1e-8:continue
            a=((q[1,1]-q[2,1])*(xx-q[2,0])+(q[2,0]-q[1,0])*(yy-q[2,1]))/den
            b=((q[2,1]-q[0,1])*(xx-q[2,0])+(q[0,0]-q[2,0])*(yy-q[2,1]))/den
            c=1-a-b;mask=(a>=-1e-8)&(b>=-1e-8)&(c>=-1e-8)
            sub=(slice(lo[1],hi[1]),slice(lo[0],hi[0]));weights=np.stack([a,b,c],axis=-1)
            pos[sub][mask]=(weights@p[ind])[mask];normal[sub][mask]=(weights@norm[ind])[mask];hits[sub][mask]+=1
    covered=hits>0
    # Bounded gutter extension fills only immediately adjacent unused UV pixels.
    valid=covered.copy()
    for it in range(8):
        for axis,shift in [(0,1),(0,-1),(1,1),(1,-1)]:
            neighbor=np.roll(valid,shift,axis);take=(~valid)&neighbor
            pos[take]=np.roll(pos,shift,axis)[take];normal[take]=np.roll(normal,shift,axis)[take];valid[take]=True
    lengths=np.linalg.norm(normal,axis=-1,keepdims=True);normal/=np.maximum(lengths,1e-9)
    raster_receipt.append({'object':obj.name,'size':n,'uvLayer':uv.name,'coveredPixels':int(covered.sum()),'multiplyCoveredPixels':int((hits>1).sum()),'uncoveredAfterGutter':int((~valid).sum())})
    return pos,normal

def projected_sample(file,pos,norm):
    weights=np.abs(norm)**4;weights/=np.maximum(weights.sum(-1,keepdims=True),1e-9)
    q=pos/.046
    return sum(sample(SOURCE[file],q[...,a],q[...,b])*weights[...,k,None] for k,(a,b) in enumerate([(1,2),(0,2),(0,1)]))

def image_node(m,name,data=False,x=-500,y=0):
    node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=bpy.data.images.load(str(P/'textures'/name),check_existing=True)
    node.image.colorspace_settings.name='Non-Color' if data else 'sRGB';node.location=(x,y);node.label=name;return node

def pbr(name,color=None,normal=None,rough=None,r=.5):
    m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Roughness'].default_value=r;b.inputs['Metallic'].default_value=0
    b.inputs['Subsurface Weight'].default_value=0;b.location=(160,0)
    if color:node=image_node(m,color,y=240);m.node_tree.links.new(node.outputs['Color'],b.inputs['Base Color'])
    if rough:node=image_node(m,rough,True,y=-10);m.node_tree.links.new(node.outputs['Color'],b.inputs['Roughness'])
    if normal:
        node=image_node(m,normal,True,y=-260);nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.location=(-160,-150);nm.inputs['Strength'].default_value=.35
        m.node_tree.links.new(node.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],b.inputs['Normal'])
    return m

# Only exposed skin and lip material bindings change. Original geometry and UVs stay exact.
for ob in list(S.objects):
    if ob.type!='MESH' or not ob.data.materials:continue
    skin=ob.data.materials[0].name.startswith('Skin |');lip=ob.name.startswith('Lip_')
    if not (skin or lip):continue
    key=ob.name.replace('-','minus');n=256 if ob.name.startswith('Head') else 64
    pos,norm=raster(ob,n);x,y,z=pos[...,0],pos[...,1],pos[...,2]
    normal=projected_sample('skin_normal.png',pos,norm);normal[...,2]=np.maximum(normal[...,2],.9)
    save(key+'_normal.png',normal)
    rough=projected_sample('skin_roughness.png',pos,norm)[...,0]
    face=(np.exp(-((x/.060)**2))*np.exp(-((z-1.62)/.11)**2)*(y<-.025))
    rough=np.clip(rough+.055-face*.065,.38,.65)
    if lip:rough=np.clip(rough-.10,.32,.55)
    save(key+'_roughness.png',rough)
    material_sets[ob.name]={}
    for i,v in enumerate(VARIANTS):
        color=projected_sample(f'skin_{v}_basecolor.png',pos,norm)
        color=BASE[i]+(color-BASE[i])*.45
        warmth=np.exp(-((np.abs(x)-.040)/.022)**2-((z-1.596)/.026)**2)*(y<-.02)
        color+=warmth[...,None]*np.array([.018,-.006,-.009])
        if lip:color=color*np.array([.90,.74,.79])+np.array([.018,.002,.002])
        file=key+'_'+v+'_basecolor.png';save(file,color)
        m=pbr('Fitted_'+v+'_'+ob.name,file,key+'_normal.png',key+'_roughness.png');m.use_fake_user=True
        m['inputUV']='Prototype_UV_v1';m['appearance']='Artistic variation, not a person or ethnicity';material_sets[ob.name][v]=m

# Bake eye color into the master's actual cylindrical UVs; preserve its ellipse and morphs.
for side in ['Left','Right']:
    cx=.032 if side=='Left' else -.032
    for prefix,file,rough in [('Eye_','sclera_basecolor.png',.24),('Iris_','iris_basecolor.png',.34)]:
        ob=bpy.data.objects[prefix+side];pos,norm=raster(ob,256)
        d=pos-np.array([cx,-.036,1.635])
        if prefix=='Iris_':u=.5+d[...,0]/.012;v=.5+d[...,2]/.012
        else:
            theta=np.arccos(np.clip(-d[...,1]/.014,-1,1));u=(np.arctan2(d[...,2]/.014,d[...,0]/.018)/math.tau)%1;v=theta/math.pi
        a=sample(SOURCE[file],u,v);name=ob.name+'_basecolor.png';save(name,a)
        ob.data.materials.clear();ob.data.materials.append(pbr('Fitted_'+ob.name,name,r=rough))
    pupil=bpy.data.objects['Pupil_'+side];m=pbr('Fitted_Pupil_'+side,r=.5);m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.0004,.00025,.00015,1);pupil.data.materials.clear();pupil.data.materials.append(m)
    # Thin optical overlay, at most 0.45 mm anterior to the existing iris center.
    vs=[(cx,-.05070,1.635)];uvs=[(.5,.5)];faces=[];segs=40;rings=8;radius=.00625
    for j in range(1,rings+1):
        r=radius*j/rings
        for k in range(segs):
            a=math.tau*k/segs;dx=r*math.cos(a);dz=r*math.sin(a)
            y=-.036-.014*math.sqrt(max(0,1-(dx/.018)**2-(dz/.014)**2))-.00025-.00045*(1-(r/radius)**2)
            vs.append((cx+dx,y,1.635+dz));uvs.append((.5+dx/(2*radius),.5+dz/(2*radius)))
    for k in range(segs):faces.append((0,1+k,1+(k+1)%segs))
    for j in range(rings-1):
        for k in range(segs):
            a=1+j*segs+k;b=1+j*segs+(k+1)%segs;faces.append((a,a+segs,b+segs,b))
    me=bpy.data.meshes.new('Fitted_Cornea_'+side);me.from_pydata(vs,[],faces);me.update();ob=bpy.data.objects.new(me.name,me);S.collection.objects.link(ob)
    layer=me.uv_layers.new(name='Fitted_Cornea_UV_v1')
    for poly in me.polygons:
        poly.use_smooth=True
        for loop in poly.loop_indices:layer.data[loop].uv=uvs[me.loops[loop].vertex_index]
    # Ensure the front faces -Y; open cap winding above is already -Y.
    if sum(p.normal.y for p in me.polygons)>0:
        import bmesh
        bm=bmesh.new();bm.from_mesh(me);bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
    ob.shape_key_add(name='Basis');h=ob.shape_key_add(name='body.height');h.slider_min=-1
    for p in h.data:p.co.z+=(p.co.z-.010)*.05
    m=pbr('Fitted_Cornea_'+side,r=.025);bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Transmission Weight'].default_value=1;bs.inputs['IOR'].default_value=1.376
    ob.data.materials.append(m);ob['fitMasterCommit']='3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a';ob['opticalApproximation']='thin corneal overlay, no volumetric thickness/tear film'

# Export three temporary material states; merge only material/image payloads later.
def set_appearance(v):
    for name,looks in material_sets.items():bpy.data.objects[name].data.materials[0]=looks[v]
def set_values(values):
    for ob in S.objects:
        if ob.type=='MESH' and ob.data.shape_keys:
            for k in ob.data.shape_keys.key_blocks:
                if k.name!='Basis' and not k.name.startswith('corrective.'):k.value=values.get(k.name,0)
            ob.data.update_tag()
    S.frame_set(S.frame_current);bpy.context.view_layer.update()
set_values({})
bpy.ops.object.select_all(action='DESELECT')
for ob in S.objects:
    if ob.type=='MESH' and not ob.name.startswith('STUDIO'):ob.select_set(True)
for v in VARIANTS:
    set_appearance(v)
    bpy.ops.export_scene.gltf(filepath=str(P/'inputs'/('fitted-'+v+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_morph=True,export_morph_normal=False,export_morph_tangent=False,export_cameras=False,export_lights=False,export_yup=True,export_extras=True,export_tangents=True)
set_appearance('02_copper')
for im in bpy.data.images:
    if im.source=='FILE':im.pack()
for name in ['build_fitted.py']:
    text=bpy.data.texts.new('FIT_SOURCE_'+name);text.write((P/name).read_text())
text=bpy.data.texts.new('FITTED_README');text.write('Derivative of exact master 3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a. Original topology, UVs and morphs retained. Added only thin corneal caps. No rig/skinning. PBR materials in three artistic appearances, baked into original Prototype_UV_v1.\nUse Fitted_<variant>_<object> materials (01_umber / 02_copper / 03_rose) on matching objects. Runtime must compute existing height*expression product corrective weights.\n')
S['fitted_input_commit']='3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a';S['fitted_appearance']='02_copper'
cam=S.camera;cam.location=(.17,-2.7,1.635);cam.rotation_euler=(Vector((0,-.005,1.61))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=.35
bpy.ops.wm.save_as_mainfile(filepath=str(P/'artifacts/fitted-human-skin-eyes-v1.blend'),compress=True)
(P/'receipts/uv-rasterization.json').write_text(json.dumps({'method':'original procedural maps analytically sampled in 3D and rasterized into exact input UVs; pigment contrast 0.45; tangent micro-normal approximation','surfaces':raster_receipt,'sourceUVsUnchanged':True},indent=2)+'\n')
# One early actual portrait per appearance; no full suite or master reconstruction.
for v in VARIANTS:
    set_appearance(v);S.render.filepath=str(P/'proof'/('portrait-'+v+'.png'));bpy.ops.render.render(write_still=True)
print('FITTED_MATERIAL_BUILD_COMPLETE')
