"""Original authored garments, metres. No external art or production body inputs.
Run with Blender 4.3.2 --background --threads 2 --python this_file.py.
"""
import bpy, math, json, sys
from pathlib import Path
from mathutils import Vector
from math import sin, cos, pi, sqrt, exp
import numpy as np
HERE=Path(__file__).resolve().parent
OUT=HERE/'artifacts'; OUT.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name!='Collection': bpy.data.collections.remove(c)
root=bpy.context.scene.collection
base=bpy.data.collections.get('Collection'); base.name='00_PRESENTATION_NOT_EXPORTED'
def collection(name):
    c=bpy.data.collections.new(name); root.children.link(c); return c
shirt=collection('01_OVERSHIRT_editable_panels')
pants=collection('02_TROUSERS_editable_panels')
form=collection('90_ORIGINAL_TAILORING_FORM_NOT_HUMAN_MASTER')
anchors=collection('03_PROPOSED_ANCHORS_NOT_BOUND')

def move(o,c):
    for old in list(o.users_collection): old.objects.unlink(o)
    c.objects.link(o)

def mat(name,col,rough=.7,metal=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*col,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    m.diffuse_color=(*col,1);return m

def fabric(name,color):
    m=mat(name,color,.78); nt=m.node_tree;p=nt.nodes.get('Principled BSDF')
    n=256; yy,xx=np.mgrid[0:n,0:n]; rng=np.random.default_rng(2741)
    weave=.94+.025*np.cos(xx*pi)+.022*np.sin(yy*pi/2)+.018*np.cos((xx-yy)*pi/4)+rng.normal(0,.009,(n,n))
    # Byte values are sRGB; convert the authored linear colour for the texture.
    srgb=np.array([12.92*c if c<=.0031308 else 1.055*c**(1/2.4)-.055 for c in color])
    pixels=np.ones((n,n,4),dtype=np.float32);pixels[:,:,:3]=np.clip(weave[:,:,None]*srgb,0,1)
    im=bpy.data.images.new(name+'_original_woven_256',n,n,alpha=False);im.pixels.foreach_set(pixels.ravel());im.filepath_raw=str(OUT/(name+'.png'));im.file_format='PNG';im.save();im.pack()
    tex=nt.nodes.new('ShaderNodeTexImage');tex.image=im;tex.label='Original numeric weave; no external image';tex.location=(-450,200)
    nt.links.new(tex.outputs['Color'],p.inputs['Base Color'])
    # Supported tangent-space normal from a small original periodic thread relief.
    height=.08*np.sin(xx*pi/2)+.08*np.cos(yy*pi/2)+.03*np.sin((xx-yy)*pi/4)
    dy,dx=np.gradient(height);v=np.stack([-dx,-dy,np.ones_like(dx)],axis=-1);v/=np.linalg.norm(v,axis=-1)[:,:,None]
    pix=np.ones((n,n,4),dtype=np.float32);pix[:,:,:3]=v*.5+.5
    norm=bpy.data.images.get('original_thread_normal_256')
    if not norm:
        norm=bpy.data.images.new('original_thread_normal_256',n,n,alpha=False);norm.colorspace_settings.name='Non-Color';norm.pixels.foreach_set(pix.ravel());norm.filepath_raw=str(OUT/'thread-normal.png');norm.file_format='PNG';norm.save();norm.pack()
    t=nt.nodes.new('ShaderNodeTexImage');t.image=norm;t.location=(-450,-60)
    nm=nt.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.35;nm.location=(-190,-60);nt.links.new(t.outputs['Color'],nm.inputs['Color']);nt.links.new(nm.outputs['Normal'],p.inputs['Normal'])
    return m
sage=fabric('river_sage_cotton',(.105,.215,.179))
khaki=fabric('warm_sand_twill',(.38,.265,.148))
threadS=mat('sage_topstitch',(.21,.32,.26),.88)
threadP=mat('sand_topstitch',(.48,.35,.215),.9)
buttonmat=mat('dark_corozo_buttons',(.052,.043,.031),.5)
fixturemat=mat('FIXTURE_clay_no_skin_claim',(.30,.24,.20),.87)
baseMat=mat('display_base',(.16,.18,.18),.8)
groundmat=mat('studio',(.105,.13,.145),.92)

# Meshes retain low-resolution panel topology with non-destructive subdivision and thickness.
def mesh(name,verts,faces,material,c,sub=0,thick=0,uv=None):
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
    # Winding is outward on mirrored panels, so tangent normals agree across sides.
    score=sum(p.normal.dot(Vector((p.center.x,p.center.y,0))) for p in me.polygons)
    if score<0:
        for p in me.polygons:p.flip()
        me.update()
    o=bpy.data.objects.new(name,me);c.objects.link(o);o.data.materials.append(material)
    for p in me.polygons:p.use_smooth=True
    layer=me.uv_layers.new(name='Authored_panel_UV')
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi=me.loops[li].vertex_index;v=me.vertices[vi].co
            layer.data[li].uv=uv[vi] if uv else (v.x*5,v.z*5)
    if sub:
        mod=o.modifiers.new('Editable cloth surface smoothing','SUBSURF');mod.levels=sub;mod.render_levels=sub
    if thick:
        mod=o.modifiers.new('Real cloth thickness metres','SOLIDIFY');mod.thickness=thick;mod.offset=-.5;mod.use_even_offset=True
    o['authorship']='Original procedural hand-authored surface; Allworld wardrobe lane'
    o['fit_status']='TAILORING_FORM_ONLY_UNBOUND'
    return o

def grid(name,fn,nu,nv,material,c,sub=1,thick=.0018):
    verts=[fn(i/nu,j/nv) for j in range(nv+1) for i in range(nu+1)]
    faces=[]
    for j in range(nv):
        for i in range(nu):
            a=j*(nu+1)+i;faces.append((a,a+1,a+nu+2,a+nu+1))
    return mesh(name,verts,faces,material,c,sub,thick,[(i/nu*2,j/nv*4) for j in range(nv+1) for i in range(nu+1)])

def tube(name,pts,r,material,c,closed=False,sides=5):
    # Actual low-poly seam piping, retained as an editable curve source.
    cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=1;cu.bevel_depth=r;cu.bevel_resolution=0;cu.resolution_u=1
    sp=cu.splines.new('POLY');sp.points.add(len(pts)-1)
    for p,v in zip(sp.points,pts):p.co=(*v,1)
    sp.use_cyclic_u=closed;cu.resolution_u=1
    o=bpy.data.objects.new(name,cu);c.objects.link(o);cu.materials.append(material);o['detail']='Geometric topstitch/piping approximation, not individual thread loops';return o

def ring_mesh(name,fn,nz,na,material,c,sub=1,thick=.002):
    vv=[fn(i/na,j/nz) for j in range(nz+1) for i in range(na)]
    ff=[(j*na+i,j*na+(i+1)%na,(j+1)*na+(i+1)%na,(j+1)*na+i) for j in range(nz) for i in range(na)]
    return mesh(name,vv,ff,material,c,sub,thick,[(i/na*3,j/nz*5) for j in range(nz+1) for i in range(na)])

def interp(table,v):
    for a,b in zip(table,table[1:]):
        if a[0]<=v<=b[0]:
            t=(v-a[0])/(b[0]-a[0]);return [x*(1-t)+y*t for x,y in zip(a[1:],b[1:])]
    return table[0][1:] if v<table[0][0] else table[-1][1:]

# Tailored torso panel, negative Y is front. Hem .965m, shoulder 1.52m.
def panel(u,v,side=1,back=False):
    z=.965+.555*v
    w,d=interp([(0,.236,.174),(.23,.229,.167),(.55,.230,.154),(.75,.227,.142),(1,.232,.112)],v)
    upper=max(0,(v-.74)/.26);upper=upper*upper*(3-2*upper)
    neck_shift=upper if not back else max(0,(v-.94)/.06)
    x=w*u*(1-neck_shift)+(.073+(.232-.073)*u)*neck_shift
    y=-d*sqrt(max(.018,1-(u*.984)**2))
    y=y*(1-upper)+(-.070+.014*u)*upper
    z-=upper*(.006+.031*u)
    if not back:z-=upper*.034*(1-u)**4
    else:z+=upper*.010*(1-u)
    # restrained hanging folds, side waist gathers and hem compression
    wave=(.0025*sin(u*29+v*4)+.0016*sin(u*49-v*6))*sin(pi*v)**.8
    wave+=.0048*sin(v*56+u*7)*exp(-((v-.19)/.15)**2)*u**2
    y-=wave
    if back:y=-y*.95
    return (side*x,y,z)

for side,label in [(-1,'R'),(1,'L')]:
    for back in [False,True]:
        name=f'Shirt_{label}_{"back" if back else "front"}_panel'
        o=grid(name,lambda u,v:panel(u,v,side,back),18,24,sage,shirt,1,.0016)
        o['body_region_mask_proposal']='torso; upper arm except exposed neckline and cuffs'
        # Closed side seam below armhole and double hem topstitch.
        if not back:
            tube(f'Shirt_{label}_side_seam',[panel(1,k/40*.72,side,back) for k in range(41)],.00085,threadS,shirt)
        for v in [.010,.023]:
            pts=[panel(i/44,v,side,back) for i in range(45)]
            pts=[(x,y+(.0018 if back else -.0018),z) for x,y,z in pts]
            tube(f'Shirt_{label}_{back}_double_hem_{v}',pts,.0006,threadS,shirt)
    # shoulder bridge front to back, leaving the neckline open.
    def shoulder(u,v,s=side):
        a=Vector(panel(u,1,s,False));b=Vector(panel(u,1,s,True));p=a.lerp(b,v);p.z+=.006*sin(pi*v);return tuple(p)
    grid(f'Shirt_{label}_shoulder_separate_piece',shoulder,18,6,sage,shirt,1,.0016)
    tube(f'Shirt_{label}_shoulder_topstitch',[shoulder(i/30,.12) for i in range(31)],.00075,threadS,shirt)

# Separate side gussets close the front/back seams below each armhole.
for side,label in [(-1,'R'),(1,'L')]:
    def gusset(u,v,s=side):
        a=Vector(panel(1,v*.71,s,False));b=Vector(panel(1,v*.71,s,True))
        p=a.lerp(b,u);p.x+=s*.003*sin(pi*u);return tuple(p)
    grid('Shirt_'+label+'_side_gusset',gusset,4,18,sage,shirt,1,.0016)
    tube('Shirt_'+label+'_gusset_hem',[gusset(i/20,.014) for i in range(21)],.00065,threadS,shirt)

# Sleeves are cut separate from the torso; smooth oval sleeve cap to tailored cuff.
for side,label in [(-1,'R'),(1,'L')]:
    def sleeve(a,t,s=side):
        th=2*pi*a
        cx=.216+.112*t;cz=1.405-.163*t
        # Oval cap is in yz at t0; its cuff tilts 30 degrees.
        ry=.073*(1-t)+.075*t; rz=.098*(1-t)+.063*t
        ripple=.002*sin(3*th+t*12)*sin(pi*t)+.003*sin(t*26+th)*exp(-((t-.85)/.23)**2)
        return(s*(cx+(.034*t)*cos(th)),(ry+ripple)*sin(th),cz+(rz+ripple)*cos(th))
    ring_mesh(f'Shirt_{label}_sleeve',sleeve,12,32,sage,shirt,1,.0016)
    # Folded cuff actual layered geometry, subtle shape/roughness same as cloth.
    ring_mesh(f'Shirt_{label}_cuff_facing',lambda a,t:(lambda p:(p[0]*1.003,p[1]*1.009,p[2]))(sleeve(a,.88+.12*t)),3,32,sage,shirt,1,.0022)
    for t in [.02,.90,.98]:tube(f'Shirt_{label}_sleeve_seam_{t}',[sleeve(i/64,t) for i in range(64)],.0007,threadS,shirt,True)

# Front plackets follow the centre line; buttons sit on the visible outer placket.
for side,label in [(1,'upper'),(-1,'under')]:
    def placket(u,v,s=side):
        z=.969+.492*v;x=s*(.001+.022*u)
        q=panel(abs(x)/.215,min(1,(z-.965)/.555),1,False)
        return (x,q[1]-.0035,z)
    grid('Shirt_front_'+label+'_placket',placket,4,24,sage,shirt,1,.0020)
    for u in [.12,.9]:tube(f'Placket_{label}_stitch_{u}',[placket(u,j/50) for j in range(51)],.00065,threadS,shirt)

def button(name,loc,r=.006):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=.003,location=loc,rotation=(pi/2,0,0));o=bpy.context.object;o.name=name;move(o,shirt);o.data.materials.append(buttonmat)
    be=o.modifiers.new('Button rounded rim','BEVEL');be.width=.001;be.segments=2
    for k in [-1,1]:
        tube(name+'_thread_'+str(k),[(loc[0]+k*.0018,loc[1]-.002,loc[2]-.0018),(loc[0]+k*.0018,loc[1]-.002,loc[2]+.0018)],.00055,threadS,shirt)
for i,z in enumerate([1.009,1.090,1.171,1.252,1.333,1.408]):
    p=panel(.045,(z-.965)/.555,1,False);button('Shirt_button_'+str(i),(.010,p[1]-.007,z))

# Open camp collar; radial fold with two pointed ends. Independent editable halves.
for side,label in [(-1,'R'),(1,'L')]:
    def collar(u,v,s=side):
        th=.26+u*(pi-.26)
        x=s*(.076+.040*v)*sin(th);y=-(.079+.046*v)*cos(th)
        z=1.518-.012*cos(th)+.015*sin(pi*v)-.045*v
        z-=.035*(1-u)**5*v
        return(x,y,z)
    grid(f'Shirt_{label}_camp_collar',collar,24,6,sage,shirt,1,.0024)
    tube(f'Collar_{label}_edge_stitch',[collar(i/60,.90) for i in range(61)],.00065,threadS,shirt)

# Open patch pockets with rounded lower corners, raised lip and actual thickness.
def shirtPocket(side):
    def point(u,v):
        x=side*(.080+.092*u); z=1.235+.111*v
        z+=.009*(abs(u-.5)*2)**5*(1-v)
        p=panel(abs(x)/.220,(z-.965)/.555,1,False)
        y=p[1]-.005-.003*sin(pi*u)*sin(pi*v)
        return(x,y,z)
    label='L' if side>0 else 'R'
    grid('Shirt_'+label+'_open_patch_pocket',point,10,10,sage,shirt,1,.0018)
    grid('Shirt_'+label+'_pocket_folded_lip',lambda u,v:point(u,.86+.14*v),10,2,sage,shirt,1,.002)
    for u in [.05,.95]:tube('Pocket_'+label+'_side_stitch_'+str(u),[point(u,i/32) for i in range(33)],.00065,threadS,shirt)
    for v in [.045,.91]:tube('Pocket_'+label+'_cross_stitch_'+str(v),[point(i/32,v) for i in range(33)],.00065,threadS,shirt)
shirtPocket(1);shirtPocket(-1)

# Trousers: four individually editable panels, paired at the rise and inseam.
# Each leg cross-section follows authored hip/thigh/knee/calf/ankle measurements.
legTable=[(0,.104,.094,.069,.006),(.10,.108,.092,.072,.006),(.36,.109,.093,.087,.005),(.53,.104,.100,.100,-.005),(.70,.105,.112,.122,.0),(.85,.103,.116,.135,.005),(1,.092,.099,.116,.004)]
def leg(a,t,side=1):
    th=2*pi*a;cx,rx,ry,cy=interp(legTable,t);z=.125+.920*t
    x=cx+rx*sin(th);y=cy-ry*cos(th)
    # Both legs merge along the centre rise above the crotch. Keep shared seam on x0.
    if t>.73 and sin(th)<-.25:
        w=min(1,(t-.73)/.12)*max(0,(-sin(th)-.25)/.75)
        x=x*(1-w)+max(.001,x)*w
    if t>.73:
        blend=min(1,(t-.73)/.16);blend=blend*blend*(3-2*blend)
        tx=.098*(1+sin(th));sgn=1 if cos(th)>=0 else -1
        ty=.004-sgn*.121*sqrt(max(0,1-(tx/.196)**2))
        x=x*(1-blend)+tx*blend;y=y*(1-blend)+ty*blend
    wave=.0032*sin(t*47+th*2)*exp(-((t-.49)/.10)**2)
    wave+=.0025*sin(t*61-th*2)*exp(-((t-.08)/.09)**2)
    wave+=.0018*sin(th*8+t*9)*sin(pi*t)
    wave*=abs(cos(th)) if t>.73 and sin(th)<0 else 1
    x+=wave*sin(th);y-=wave*cos(th)
    return(side*x,y,z)
for side,label in [(-1,'R'),(1,'L')]:
    for half,title in [(0,'front'),(.5,'back')]:
        # split along inner and outer seam at +/- pi/2
        start=-.25 if half==0 else .25
        o=grid(f'Trousers_{label}_{title}_panel',lambda u,v:leg(start+.5*u,v,side),20,36,khaki,pants,1,.002)
        o['body_region_mask_proposal']='pelvis; left and right leg above cuff'
    for a,title in [(.25,'outseam'),(.75,'inseam')]:
        tube(f'Trousers_{label}_{title}',[leg(a,i/90,side) for i in range(91)],.0007,threadP,pants)
    # turned cuff is separate and double stitched
    ring_mesh(f'Trousers_{label}_turned_hem',lambda a,t:leg(a,.002+.035*t,side),3,48,khaki,pants,1,.0026)
    for t in [.012,.027]:tube(f'Trouser_{label}_hem_stitch_{t}',[leg(i/80,t,side) for i in range(80)],.0007,threadP,pants,True)
    # curved front pocket entry; an inset welt follows the cloth near hip
    pts=[]
    for i in range(40):
        s=i/39;a=.15-.12*s;t=.98-.16*s;p=leg(a,t,side);pts.append((p[0],p[1]-.002,p[2]))
    tube(f'Trousers_{label}_slant_pocket_welt',pts,.0023,khaki,pants)
    tube(f'Trousers_{label}_slant_pocket_stitch',[(x,y-.001,z-.003) for x,y,z in pts],.00065,threadP,pants)
    # rear welt: separate shaped rectangle on rear upper leg
    def rear(u,v,s=side):
        x=.065+.087*u;z=.937+.012*v
        a=.5+math.asin(max(-1,min(1,(.103-x)/.112)))/(2*pi)
        p=leg(a,(z-.125)/.920,1)
        return(s*x,p[1]+.003,z)
    grid(f'Trousers_{label}_back_welt',rear,10,2,khaki,pants,1,.002)
    tube(f'Trousers_{label}_back_welt_stitch',[rear(i/32,.5) for i in range(33)],.00065,threadP,pants)
# Shaped waist band is mostly hidden under the untucked shirt, retained for editing.
def waistband(a,t):
    th=2*pi*a;return(.195*sin(th),-.121*cos(th)+.004,1.002+.044*t)
ring_mesh('Trousers_continuous_waistband',waistband,3,56,khaki,pants,1,.0026)
for a in [.10,.24,.4,.60,.76,.90]:
    grid('Trousers_belt_loop_'+str(a),lambda u,v,a=a:(lambda p:(p[0]*1.018,p[1]*1.024,p[2]))(waistband(a+(u-.5)*.011,v)),2,6,khaki,pants,1,.0028)
# Fly concealed below shirt but actual geometry exists.
grid('Trousers_fly_facing',lambda u,v:(.004+.024*u,-.124-.005*sin(v*pi),.950+.081*v),4,12,khaki,pants,1,.002)

# Original non-anatomical tailor fixture. No face, hands, rig or human identity controls.
def formring(a,t):
    th=2*pi*a;w,d,z=interp([(0,.174,.106,.90),(.35,.171,.108,1.12),(.70,.205,.113,1.36),(1,.203,.084,1.49)],t)
    return(w*sin(th),-d*cos(th),z)
ring_mesh('FIXTURE_original_torso_not_producer_body',formring,12,48,fixturemat,form,1,0)
ring_mesh('FIXTURE_neck_no_head',lambda a,t:(.057*sin(2*pi*a),-.055*cos(2*pi*a),1.46+.135*t),6,32,fixturemat,form,1,0)
for side,label in [(-1,'R'),(1,'L')]:
    ring_mesh('FIXTURE_'+label+'_upper_arm_stub',lambda a,t,s=side:(s*(.229+.099*t+.020*cos(2*pi*a)),.056*sin(2*pi*a),1.382-.140*t+.040*cos(2*pi*a)),6,32,fixturemat,form,1,0)
    ring_mesh('FIXTURE_'+label+'_leg_form',lambda a,t,s=side:(s*(.101+(.060+.025*t)*sin(2*pi*a)),-(.050+.036*t)*cos(2*pi*a),.096+.925*t),12,32,fixturemat,form,1,0)
for c in [form]:
    for o in c.objects:o['fixture']='Original tailoring gauge, no anatomy/fit authority';o['exclude_from_garment_counts']=True
for name,loc in [('waist_reference',(0,0,1.024)),('neck_reference',(0,0,1.52)),('ground_reference',(0,0,0)),('left_cuff',( .329,0,1.242)),('right_cuff',(-.329,0,1.242))]:
    o=bpy.data.objects.new('PROPOSED_'+name,None);anchors.objects.link(o);o.location=loc;o.empty_display_size=.025;o['binding']='UNBOUND; fixture coordinates only';o['human_mesh_sha256']='PENDING_PARENT_HANDOFF'
# Presentation base and background, never included in garment export.
bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=.33,depth=.035,location=(0,0,.052));o=bpy.context.object;o.name='STUDIO_fixture_plinth';move(o,base);o.data.materials.append(baseMat);be=o.modifiers.new('rim','BEVEL');be.width=.008;be.segments=3
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.03));o=bpy.context.object;o.name='STUDIO_ground';move(o,base);o.data.materials.append(groundmat)
# Neutral diffuse studio rig
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.32,.38,.43,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45

def area(name,loc,power,size):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);base.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,.9))-o.location).to_track_quat('-Z','Y').to_euler()
area('STUDIO_key',(-2,-3,4),260,3);area('STUDIO_fill',(2,-1,2.3),130,2.5);area('STUDIO_rim',(0,2,3),220,2)
camdat=bpy.data.cameras.new('Neutral_orthographic');cam=bpy.data.objects.new('Neutral_orthographic',camdat);base.objects.link(cam);bpy.context.scene.camera=cam;camdat.type='ORTHO';camdat.ortho_scale=1.82
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=False;scene.cycles.max_bounces=4;scene.render.threads_mode='FIXED';scene.render.threads=2
scene.render.resolution_x=440;scene.render.resolution_y=620;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene['asset_family']='allworld-original-everyday-01';scene['version']='0.1.0';scene['fit_status']='Original tailoring form only; no producer mesh supplied; static garments are NOT tested wearable fit'
scene['source']='Original math-authored cloth panels and generated weave; no purchased/downloaded art, imagery or scans'
scene['license']='AGPL-3.0-or-later per repository LICENSE'
bpy.context.preferences.filepaths.save_version=0
# Keep a full editable .blend, then convert only temporary export duplicates.
def camera(loc):cam.location=loc;cam.rotation_euler=(Vector((0,0,.845))-cam.location).to_track_quat('-Z','Y').to_euler()
camera((2.5,-4,1.4))
# source mesh/curve and evaluated geometry report
rows=[];deps=bpy.context.evaluated_depsgraph_get()
for c in [shirt,pants,form]:
 for o in c.objects:
    ev=o.evaluated_get(deps);me=ev.to_mesh();me.calc_loop_triangles()
    rows.append({'name':o.name,'collection':c.name,'sourceType':o.type,'sourceVertices':len(o.data.vertices) if o.type=='MESH' else None,'evaluatedVertices':len(me.vertices),'evaluatedTriangles':len(me.loop_triangles),'materials':[m.name for m in o.data.materials],'modifiers':[{'type':m.type,'name':m.name} for m in o.modifiers]});ev.to_mesh_clear()
(OUT/'source-measurements.json').write_text(json.dumps({'units':'metres','axes':'Blender Z up / -Y forward','sourceObjects':rows,'rigs':0,'morphTargets':0,'fitStatus':'form-only-unbound'},indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'everyday-01-tailoring-form.blend'),compress=True)
# Evaluated curves become geometry in glTF; individual authored pieces keep names.
def export(filename,includeform=False):
    bpy.ops.object.select_all(action='DESELECT');copies=[]
    for c in [shirt,pants]+([form] if includeform else []):
      for original in c.objects:
        ev=original.evaluated_get(deps);me=bpy.data.meshes.new_from_object(ev);o=bpy.data.objects.new(original.name,me);base.objects.link(o);o.matrix_world=original.matrix_world.copy();o.select_set(True);copies.append(o)
    bpy.context.view_layer.objects.active=copies[0]
    bpy.ops.export_scene.gltf(filepath=str(OUT/filename),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_materials='EXPORT',export_extras=True,export_animations=False,export_cameras=False,export_lights=False)
    for o in copies:bpy.data.objects.remove(o,do_unlink=True)
export('everyday-01-on-form.glb',True)
if '--no-render' not in sys.argv:
 for label,loc in [('front',(0,-4,.92)),('profile',(4,0,.92)),('back',(0,4,.92))]:
    camera(loc);scene.render.filepath=str(OUT/(label+'.png'));bpy.ops.render.render(write_still=True)
print('WARDROBE_EXPORT_COMPLETE')
