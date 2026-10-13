"""Blender 4.3 original skin/eye calibration, in metres, -Y forward / Z up.
Run via the repository heavy slot. Analytic raster bakes from make_textures.py.
"""
import bpy, math, json, sys
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=False
scene.render.threads_mode='FIXED';scene.render.threads=2
scene.render.resolution_x=1200;scene.render.resolution_y=380;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX'
scene.world=bpy.data.worlds.new('Calibration world');scene.world.use_nodes=True
assets=bpy.data.collections.new('01_CALIBRATION_ASSETS_NOT_HUMAN_FIT');scene.collection.children.link(assets)
studio=bpy.data.collections.new('02_PROOF_RIG');scene.collection.children.link(studio)

def into(obj,col):
    for c in list(obj.users_collection): c.objects.unlink(obj)
    col.objects.link(obj)

def mesh(name,verts,faces,uvs,mat):
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
    ob=bpy.data.objects.new(name,me);assets.objects.link(ob)
    layer=me.uv_layers.new(name='CalibrationUV_v1')
    for poly in me.polygons:
        poly.use_smooth=True
        for loop in poly.loop_indices: layer.data[loop].uv=uvs[me.loops[loop].vertex_index]
    ob.data.materials.append(mat);ob['family']='allworld-skin-eyes-calibration-v1';ob['humanFitVerified']=False
    return ob

def material(name):
    m=bpy.data.materials.new(name);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Metallic'].default_value=0
    return m,bs

def tex(m,file,xy,data=False):
    n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(str(P/'textures'/file),check_existing=True)
    n.image.colorspace_settings.name='Non-Color' if data else 'sRGB';n.location=xy;n.label=file
    n.interpolation='Linear';return n

skin=[]
for i,name in enumerate(['01_umber','02_copper','03_rose']):
    m,b=material('Skin_'+name+'_BAKED_PBR');b.location=(260,50)
    b.inputs['Roughness'].default_value=.49;b.inputs['IOR'].default_value=1.4
    b.inputs['Subsurface Weight'].default_value=0
    c=tex(m,'skin_'+name+'_basecolor.png',(-540,220));m.node_tree.links.new(c.outputs['Color'],b.inputs['Base Color'])
    r=tex(m,'skin_roughness.png',(-540,-30),True);m.node_tree.links.new(r.outputs['Color'],b.inputs['Roughness'])
    n=tex(m,'skin_normal.png',(-540,-300),True);nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.location=(-140,-180);nm.inputs['Strength'].default_value=.7
    m.node_tree.links.new(n.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],b.inputs['Normal'])
    m['source']='Original analytic raster bakes; seed 7108; make_textures.py';m['appearanceClassification']='artistic, not ethnicity or a scanned individual'
    # Artist can switch to these clearly named source looks; exports select core PBR.
    source=m.copy();source.name='Skin_'+name+'_BLENDER_SSS_SOURCE';source.use_fake_user=True
    sb=source.node_tree.nodes.get('Principled BSDF');sb.inputs['Subsurface Weight'].default_value=.11
    sb.inputs['Subsurface Radius'].default_value=(1,.45,.22);sb.inputs['Subsurface Scale'].default_value=.00065
    source['exportLoss']='Subsurface scattering omitted in core glTF. PBR approximation uses same texture maps.'
    skin.append(m)
    # Custom curved cheek-like material swatch, a non-anatomical calibration fixture.
    vs=[];uv=[];faces=[];K=36
    for j in range(K+1):
        v=j/K;z=(v-.5)*.061
        for k in range(K+1):
            u=k/K;x=(u-.5)*.049
            # Bowed surface plus subtle lower fold; no borrowed human face topology.
            y=.008*(x/.0245)**2+.004*(z/.0305)**2+.0008*math.exp(-((z+.014)/.004)**2)*(1-(x/.0245)**2)
            vs.append((x,y,z));uv.append((u,v))
    for j in range(K):
        for k in range(K):
            q=j*(K+1)+k;faces.append((q,q+1,q+K+2,q+K+1))
    ob=mesh('SkinPatch_'+name,vs,faces,uv,m);ob.location=((i-1.5)*.068,0,.044)
    ob['authoredWidthM']=.049;ob['authoredHeightM']=.061;ob['purpose']='Curved material calibration only; not body geometry'

scl,bs=material('Eye_Sclera_BAKED_PBR');bs.inputs['Roughness'].default_value=.24;bs.inputs['IOR'].default_value=1.376
im=tex(scl,'sclera_basecolor.png',(-360,20));scl.node_tree.links.new(im.outputs['Color'],bs.inputs['Base Color'])
iris,bs=material('Eye_Iris_BAKED_PBR');bs.inputs['Roughness'].default_value=.34
im=tex(iris,'iris_basecolor.png',(-580,160));iris.node_tree.links.new(im.outputs['Color'],bs.inputs['Base Color'])
im=tex(iris,'iris_normal.png',(-580,-140),True);nm=iris.node_tree.nodes.new('ShaderNodeNormalMap');nm.location=(-240,-100);nm.inputs['Strength'].default_value=.35
iris.node_tree.links.new(im.outputs['Color'],nm.inputs['Color']);iris.node_tree.links.new(nm.outputs['Normal'],bs.inputs['Normal'])
pupil,bs=material('Eye_Pupil');bs.inputs['Base Color'].default_value=(.0004,.00025,.00015,1);bs.inputs['Roughness'].default_value=.6
cornea,bs=material('Eye_Cornea_TRANSMISSION');bs.inputs['Base Color'].default_value=(1,1,1,1);bs.inputs['Transmission Weight'].default_value=1;bs.inputs['Roughness'].default_value=.045;bs.inputs['IOR'].default_value=1.376
cornea['alphaMode']='OPAQUE: optical transmission, no alpha blending';cornea['runtimeDependency']='KHR_materials_transmission + KHR_materials_ior; isolated GLTFLoader proof only'
origin=(.102,0,.044)
R=.012;segs=80;rings=36
vs=[];uv=[];fs=[]
start=math.asin(.0055/R)
for j in range(rings+1):
    theta=start+(math.pi-start)*j/rings
    for k in range(segs+1):
        a=2*math.pi*k/segs
        vs.append((R*math.sin(theta)*math.cos(a),-R*math.cos(theta),R*math.sin(theta)*math.sin(a)))
        uv.append((k/segs,theta/math.pi))
for j in range(rings):
    for k in range(segs):
        q=j*(segs+1)+k;fs.append((q,q+1,q+segs+2,q+segs+1))
ob=mesh('Eye_ScleralShell_24mm',vs,fs,uv,scl);ob.location=origin

def disk(name,lo,hi,depth,mat,rings=12):
    vs=[];uv=[];fs=[]
    for j in range(rings+1):
        rad=lo+(hi-lo)*j/rings
        for k in range(segs+1):
            a=math.tau*k/segs;x=rad*math.cos(a);z=rad*math.sin(a)
            vs.append((x,depth(rad),z));uv.append((.5+x/.0112,.5+z/.0112))
    for j in range(rings):
        for k in range(segs):
            q=j*(segs+1)+k;fs.append((q,q+segs+1,q+segs+2,q+1))
    ob=mesh(name,vs,fs,uv,mat);ob.location=origin;return ob

disk('Eye_ConcaveIris_11p2mm',.0022,.0056,lambda r:-.01025-.00055*(r/.0056)**2,iris)
disk('Eye_RecessedPupil_4p4mm',0,.00221,lambda r:-.0102,pupil,1)
disk('Eye_CorneaCap',0,.00565,lambda r:-.01072-.0021*max(0,1-(r/.00565)**2),cornea)
# Remove zero-area center and posterior pole quads produced by the radial meshes.
import bmesh
for ob in assets.objects:
    bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00000001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free();ob.data.update()
# Disc surfaces need outward (-Y) front normals after open-surface recalculation.
for name in ['Eye_ConcaveIris_11p2mm','Eye_RecessedPupil_4p4mm','Eye_CorneaCap']:
    ob=bpy.data.objects[name]
    if sum(p.normal.y for p in ob.data.polygons)>0:
        bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()

# Neutral matte backdrop, kept out of calibration GLB.
bg,bs=material('Studio slate');bs.inputs['Base Color'].default_value=(.012,.019,.026,1);bs.inputs['Roughness'].default_value=.92
bpy.ops.mesh.primitive_plane_add(size=2,location=(0,.029,.06),rotation=(math.pi/2,0,0));back=bpy.context.object;back.name='Proof_Backdrop';back.data.materials.append(bg);into(back,studio)

def area(name,loc,power,color,size,ratio=1):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='RECTANGLE';data.size=size;data.size_y=size*ratio
    ob=bpy.data.objects.new(name,data);studio.objects.link(ob);ob.location=loc;ob.rotation_euler=(Vector((0,0,.04))-ob.location).to_track_quat('-Z','Y').to_euler();return ob
key=area('Key',(-.10,-.17,.18),4,(1,1,1),.13,.5)
fill=area('Fill',(.17,-.12,.08),1,(.7,.83,1),.09)
rim=area('Rim',(.0,.02,.19),2,(1,.8,.6),.10)
camdata=bpy.data.cameras.new('Calibration camera');cam=bpy.data.objects.new('Calibration camera',camdata);studio.objects.link(cam);scene.camera=cam
cam.location=(0,-.32,.107);cam.rotation_euler=(Vector((0,0,.044))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=.278
camdata.lens=60;camdata.clip_start=.001;camdata.clip_end=10
# Store lighting definitions and measured mesh data before render.
lighting={'neutral':[(4,(1,1,1)),(1,(.76,.86,1)),(1.5,(1,.88,.74)),.25], 'day':[(5,(1,.90,.76)),(1.6,(.61,.78,1)),(2,(.76,.86,1)),.38], 'night':[(.45,(.40,.60,1)),(1.2,(1,.45,.16)),(.7,(.28,.50,1)),.04]}
def set_light(label):
    values=lighting[label]
    for ob,(power,color) in zip([key,fill,rim],values[:3]):ob.data.energy=power;ob.data.color=color
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.15,.2,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=values[3]
set_light('neutral')
bpy.ops.object.select_all(action='DESELECT')
for ob in assets.objects:ob.select_set(True)
bpy.context.view_layer.objects.active=next(iter(assets.objects))
bpy.ops.export_scene.gltf(filepath=str(P/'artifacts'/'skin-eyes-calibration-v1.glb'),export_format='GLB',use_selection=True,export_yup=True,export_texcoords=True,export_normals=True,export_tangents=True,export_materials='EXPORT',export_extras=True,export_draco_mesh_compression_enable=False)
measure=[]
for ob in assets.objects:
    ob.data.calc_loop_triangles()
    measure.append(dict(name=ob.name,vertices=len(ob.data.vertices),triangles=len(ob.data.loop_triangles),materialSlots=len(ob.data.materials),boundsLocalM=[[min(v.co[a] for v in ob.data.vertices) for a in range(3)],[max(v.co[a] for v in ob.data.vertices) for a in range(3)]],translationBlenderM=list(ob.location),uvLayers=[l.name for l in ob.data.uv_layers],morphs=0,joints=0))
(P/'receipts'/'blender-measurements.json').write_text(json.dumps(dict(blender=bpy.app.version_string,objects=measure,lighting=lighting,renderSamples=40,threads=2,calibrationOnly=True),indent=2)+'\n')
for im in bpy.data.images:
    if im.source=='FILE':im.pack()
text=bpy.data.texts.new('README_CALIBRATION_ONLY');text.write('Original artistic material calibration, not fitted human art. Units metres; forward -Y.\nTexture generator make_textures.py is the editable procedural source. Skin *_BAKED_PBR exports use core PBR; *_BLENDER_SSS_SOURCE have unexportable SSS for comparison.\nEye requires KHR_materials_transmission and KHR_materials_ior. No external images, scans or likenesses.\nParent must supply exact human commit, mesh/UV hashes and material binding before fitting.\n')
for name in ['make_textures.py','build.py']:
    t=bpy.data.texts.new(name);t.write((P/name).read_text())
bpy.ops.wm.save_as_mainfile(filepath=str(P/'artifacts'/'skin-eyes-calibration-v1.blend'),compress=True)
for label in ['neutral','day','night']:
    set_light(label);scene.render.filepath=str(P/'proof'/f'blender-{label}.png');bpy.ops.render.render(write_still=True)
# Close-up at a slight angle reveals iris recess and cornea highlight.
set_light('neutral');cam.location=(.109,-.062,.050);cam.rotation_euler=(Vector(origin)-cam.location).to_track_quat('-Z','Y').to_euler();camdata.ortho_scale=.032
scene.render.resolution_x=440;scene.render.resolution_y=440
scene.render.filepath=str(P/'proof'/'eye-detail.png');bpy.ops.render.render(write_still=True)
print('CALIBRATION_BUILD_COMPLETE')
