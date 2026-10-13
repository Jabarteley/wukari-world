"""Original editable synthetic street. Blender 4.3; metres, X east / Y north / Z up.

200m layout is planning massing only. The 24m street segment is the detailed art.
All widths, alignment and levels are chosen, not surveyed. No routing permission.
"""
import bpy
import math
import json
import random
from pathlib import Path
from mathutils import Vector

HERE = Path(__file__).resolve().parent
OUT = HERE / 'artifacts'
random.seed(13102026)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for col in list(bpy.data.collections):
    if col.name != 'Collection': bpy.data.collections.remove(col)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.cycles.use_denoising = False
scene.cycles.max_bounces = 4
scene.render.threads_mode = 'FIXED'
scene.render.threads = 2
scene.render.resolution_x = 960
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 88
scene.view_settings.view_transform = 'AgX'
scene.world.color = (.3,.3,.3)
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.64,.72,.84,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .6

def collection(name):
    c = bpy.data.collections.new(name); scene.collection.children.link(c); return c
NEAR = collection('01_STREET_NEAR_editable')
FAR = collection('02_STREET_FAR_alternative')
PLAN = collection('03_PLANNING_200m_not_detailed_art')
COLLISION = collection('04_COLLISION_PROPOSALS_routeAuthorized_FALSE')
STUDIO = collection('05_CAMERAS_LIGHTS')
active = NEAR

def material(name, color, rough=.85, texture=None, metal=0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    m.diffuse_color = (*color,1)
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color,1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if texture:
        nodes=m.node_tree.nodes; links=m.node_tree.links
        tex=nodes.new('ShaderNodeTexImage'); tex.label='Original seeded aggregate • 2m UV tile'
        tex.image=bpy.data.images.load(str(HERE/'textures'/f'{texture}-color.jpg'),check_existing=True)
        links.new(tex.outputs['Color'],p.inputs['Base Color'])
        norm=nodes.new('ShaderNodeTexImage'); norm.image=bpy.data.images.load(str(HERE/'textures'/f'{texture}-normal.png'),check_existing=True)
        norm.image.colorspace_settings.name='Non-Color'
        nm=nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value=.55
        links.new(norm.outputs['Color'],nm.inputs['Color']); links.new(nm.outputs['Normal'],p.inputs['Normal'])
    return m
asphalt=material('Asphalt • coarse mineral aggregate',(.065,.067,.06),.94,'asphalt')
cement=material('Cement • sand and fine pits',(.34,.32,.28),.87,'cement')
silt=material('Silt • ochre dust',(.22,.16,.095),.98,'silt')
dark=material('Tar • weathered repair seam',(.025,.024,.022),.83)
iron=material('Iron • oxidised drain casting',(.055,.045,.033),.63,metal=.62)
rust=material('Rust • recessed frame',(.16,.069,.025),.91,metal=.15)
stripe=material('Paint • worn warm white',(.62,.59,.48),.92)
pavers=[material('Paver tone %02d'%i,(.31+i*.013,.292+i*.012,.25+i*.010),.86) for i in range(6)]
dust=material('Compacted planning ground',(.24,.207,.156),1)
planroad=material('Planning road • synthetic ribbon',(.085,.087,.085),1)
zone=material('Frontage planning reserve',(.32,.40,.36),1)

def mesh(name,verts,faces,mat,bevel=0):
    me=bpy.data.meshes.new(name); me.from_pydata(verts,[],faces); me.update()
    ob=bpy.data.objects.new(name,me); active.objects.link(ob)
    if mat: me.materials.append(mat)
    uv=me.uv_layers.new(name='Metres_2m_tile')
    for poly in me.polygons:
        normal=poly.normal
        for li in poly.loop_indices:
            v=me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv=(v.x/2,v.y/2) if abs(normal.z)>.5 else ((v.y/2,v.z/2) if abs(normal.x)>.5 else (v.x/2,v.z/2))
    if bevel:
        mod=ob.modifiers.new('Editable edge wear bevel','BEVEL'); mod.width=bevel; mod.segments=1
        mod=ob.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    ob['authorship']='original authored-synthetic'
    ob['routeAuthorized']=False
    return ob

def box(name,x0,x1,y0,y1,z0,z1,mat,bevel=0):
    return mesh(name,[(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0),(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)],[(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)],mat,bevel)

def grade(y): return (y+12)*.006
def road(x,y): return grade(y)+.065*(1-abs(x)/3.5)
def walk(x,y):
    h=.175
    if x>0 and 2<y<8: h=.035 + .14*min(1,max(0,abs(y-5)-2))
    return grade(y)+h+.015*max(0,abs(x)-4.28)

def strip(name, profile, y0,y1,mat,bevel=0):
    n=len(profile); verts=[(x,y,z+grade(y)) for y in (y0,y1) for x,z in profile]
    return mesh(name,verts,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],mat,bevel)

def ribbon(name,points,width,mat):
    verts=[]
    for i,p in enumerate(points):
        d=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])
        side=Vector((-d.y,d.x,0)).normalized()*width*.5
        verts += [tuple(Vector(p)-side),tuple(Vector(p)+side)]
    return mesh(name,verts,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(points)-1)],mat)

# Crown is geometry, so the crossfall survives GLB export. Six millimetres rise/metre north.
strip('Road crown • 7.0m carriageway', [(-3.5,-.20),(3.5,-.20),(3.5,0),(0,.065),(-3.5,0)],-12,12,asphalt)
for side in [-1,1]:
    # Long U-section concrete drain with an exposed inset invert.
    lo,hi=sorted([side*3.5,side*4.08])
    strip(('East' if side>0 else 'West')+' drain invert',[(lo,-.29),(hi,-.29),(hi,-.20),(lo,-.20)],-12,12,cement)
    for x0,x1 in [(lo,lo+.075),(hi-.075,hi)]:
        strip('Drain retaining wall',[(x0,-.26),(x1,-.26),(x1,0),(x0,0)],-12,12,cement,.009)
    strip('Silt on drain floor',[(lo+.085,-.196),(hi-.085,-.196),(hi-.085,-.188),(lo+.085,-.188)],-12,12,silt)
    for i in range(24):
        y=-12+i; top=.175
        if side>0 and 2<=y<8: top=.035+.14*min(1,max(0,abs(y+.5-5)-2))
        a,b=sorted([side*4.08,side*4.28])
        profile=[(a,-.13),(b,-.13),(b,top-.018),(b-.012,top),(a+.018,top),(a,top-.025)]
        # Terminal ends are exactly on +/-12m; internal mortar gaps remain editable.
        strip('Kerb %s %02d'%('E' if side>0 else 'W',i),profile,y if i==0 else y+.009,y+1 if i==23 else y+.991,cement,.005)
    # Individually editable cast paving flags, with genuine sloped top vertices.
    for row in range(32):
        y0=-12+row*.75; y1=y0+.75
        for col in range(3):
            a=4.28+col*.70; b=a+.70
            if side<0: a,b=-b,-a
            x0,x1=a+.006,b-.006
            yy0=y0 if row==0 else y0+.006; yy1=y1 if row==31 else y1-.006
            v=[(x0,yy0,walk(x0,yy0)-.075),(x1,yy0,walk(x1,yy0)-.075),(x1,yy1,walk(x1,yy1)-.075),(x0,yy1,walk(x0,yy1)-.075)]
            v += [(x,y,z+.075) for x,y,z in v]
            ob=mesh('Paving %s %02d.%d'%('E' if side>0 else 'W',row,col),v,[(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)],cement if random.random()<.38 else random.choice(pavers),.003)
    # Dust shoulders are part of the segment, ending at 6.60m.
    a,b=sorted([side*6.38,side*6.60]); strip('Unfinished frontage shoulder',[(a,-.12),(b,-.12),(b,.17),(a,.17)],-12,12,silt)

# Drain inspection grilles. Bars sit across a real recessed channel, no black decal hole.
def grate(y0,length=.94):
    top=grade(y0)+.008
    for a,b in [(3.49,3.56),(4.02,4.10)]: box('Grate rim',a,b,y0,y0+length,top-.045,top,iron,.007)
    for yy in [y0,y0+length-.055]: box('Grate cross frame',3.52,4.07,yy,yy+.055,top-.045,top,iron,.006)
    for i in range(10):
        yy=y0+.075+i*(length-.15)/10
        box('Cast iron drain bar',3.55,4.025,yy,yy+.026,top-.032,top-.006,iron,.004)
    for xx in [3.535,4.044]:
        for yy in [y0+.06,y0+length-.06]:
            box('Recessed fastener',xx-.012,xx+.012,yy-.012,yy+.012,top+.001,top+.008,rust,.003)
grate(-6.4); grate(-.5)

# A 4m driveway traverses drain and lowers the kerb/sidewalk; north/south transition ramps.
strip('Driveway reinforced drain bridge',[(3.48,-.055),(4.10,-.055),(4.10,.035),(3.48,.015)],3,7,cement,.008)
for i in range(18):
    y=3.1+i*.21
    ribbon('Driveway broom groove',[(3.53,y,grade(y)+.017),(4.03,y,grade(y)+.035)],.008,dark)

# Inset utility panel, original fictional casting with scored edge and lifting recesses.
z=walk(5.3,-3.2)+.007
box('Utility lid outer seat',4.93,5.85,-3.62,-2.90,z-.03,z,iron,.012)
box('Utility lid cement insert',4.99,5.79,-3.56,-2.96,z,z+.005,cement,.006)
for yy in [-3.49,-3.04]: box('Lid recessed lifting slot',5.29,5.48,yy,yy+.027,z+.006,z+.007,dark,.005)

# Irregular resurfacing patches and nonuniform crack repairs give an authored wear history.
patch=[(-2.7,-6.7),(-1.35,-6.85),(-.91,-6.43),(-1.0,-3.2),(-1.4,-2.75),(-2.87,-3.0),(-3.06,-4.5)]
mesh('Irregular utility trench patch',[(x,y,road(x,y)+.006) for x,y in patch],[tuple(range(len(patch)))],asphalt)
pp=[(x,y,road(x,y)+.009) for x,y in patch+[patch[0]]]; ribbon('Patch sealed perimeter',pp,.038,dark)
for x,y0,length in [(2.65,-9,6.3),(-2.0,2,6.4),(.7,-1,3.6)]:
    pts=[]
    for i in range(14):
        y=y0+length*i/13; xx=x+random.uniform(-.14,.14); pts.append((xx,y,road(xx,y)+.007))
    ribbon('Meandering tar repair',pts,.018,dark)
    mid=pts[6]; ribbon('Branch in repaired crack',[mid,(mid[0]+.36,mid[1]+.27,road(mid[0]+.36,mid[1]+.27)+.007),(mid[0]+.59,mid[1]+.6,road(mid[0]+.59,mid[1]+.6)+.007)],.012,dark)
# Worn paint: each dash has unequal eroded fragments, not a uniformly perfect stripe.
for y in [-9,-3,3,9]:
    for i in range(19):
        yy=y+i*.09; x0=-.065+random.uniform(-.02,.012); x1=.065-random.uniform(0,.025)
        if random.random()>.09:
            mesh('Weathered centre paint',[(x0,yy,road(x0,yy)+.009),(x1,yy,road(x1,yy)+.009),(x1,yy+.075,road(x1,yy+.075)+.009),(x0,yy+.075,road(x0,yy+.075)+.009)],[(0,1,2,3)],stripe)
# Sparse aggregate spill along the channel; low, irregular stones rather than scatter props.
for i in range(60):
    x=random.uniform(3.18,3.47); y=random.uniform(-11.7,11.7); z=road(x,y)+.004; s=random.uniform(.009,.027)
    mesh('Loose aggregate',[(x-s,y-s,z),(x+s,y-s*.6,z),(x+s*.6,y+s,z),(x-s*.7,y+s*.7,z),(x,y,z+s*.7)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],silt)

def anchor(name,x,y,z,col):
    ob=bpy.data.objects.new(name,None); col.objects.link(ob); ob.location=(x,y,z); ob.empty_display_type='PLAIN_AXES'; ob.empty_display_size=.25; ob['routeAuthorized']=False; return ob
anchor_defs={'pivot':(0,-12,0),'south_crown':(0,-12,.065),'north_crown':(0,12,.209),'south_east_kerb':(4.08,-12,.175),'north_east_kerb':(4.08,12,.319),'south_west_kerb':(-4.08,-12,.175),'north_west_kerb':(-4.08,12,.319),'driveway_threshold':(6.38,5,walk(6.38,5)),'drain_invert_south':(3.79,-12,-.20),'drain_invert_north':(3.79,12,-.056)}
for name,p in anchor_defs.items(): anchor('anchor_'+name,*p,NEAR)

# Far variant retains cross-section, slope, driveway and semantic anchors; omits fine wear/grate bars.
active=FAR
asphalt=material('Far asphalt average',(.052,.053,.047),.94)
cement=material('Far cement average',(.318,.292,.227),.87)
silt=material('Far silt average',(.159,.105,.048),.98)
strip('Far road crown',[(-3.5,-.20),(3.5,-.20),(3.5,0),(0,.065),(-3.5,0)],-12,12,asphalt)
for side in [-1,1]:
    a,b=sorted([side*3.5,side*4.08]); strip('Far drain',[(a,-.29),(b,-.29),(b,-.19),(a,-.19)],-12,12,cement)
    # Same terminal profiles, flat tops are enough for distant silhouette.
    a,b=sorted([side*4.08,side*4.28]);
    for y0,y1,top in ([(-12,2,.175),(2,3,.105),(3,7,.035),(7,8,.105),(8,12,.175)] if side>0 else [(-12,12,.175)]):
        strip('Far kerb',[(a,-.13),(b,-.13),(b,top),(a,top)],y0,y1,cement)
    for y0,y1 in ([(-12,2),(2,3),(3,7),(7,8),(8,12)] if side>0 else [(-12,12)]):
        a,b=sorted([side*4.28,side*6.38]); v=[(a,y0,walk(a,y0)),(b,y0,walk(b,y0)),(b,y1,walk(b,y1)),(a,y1,walk(a,y1))]; mesh('Far sidewalk',v,[(0,1,2,3)],cement)
    a,b=sorted([side*6.38,side*6.60]);strip('Far shoulder',[(a,-.12),(b,-.12),(b,.17),(a,.17)],-12,12,silt)
strip('Far driveway bridge',[(3.48,-.055),(4.10,-.055),(4.10,.035),(3.48,.015)],3,7,cement)
for name,p in anchor_defs.items(): anchor('anchor_'+name,*p,FAR)

active=PLAN
box('Planning boundary • 200 x 200m',-100,100,-100,100,-.55,-.36,dust)
# Ribbon layout reserved for later segment production, has no measured geographical claim.
for y0,y1 in [(-100,-12),(12,100)]:box('Continuation corridor • planning only',-6.6,6.6,y0,y1,-.34,-.30,planroad)
box('Cross street reservation • planning only',-100,100,42,55,-.34,-.29,planroad)
for name,x0,x1,y0,y1 in [('E01',6.6,26.6,-10,10),('W01',-26.6,-6.6,-10,10),('E02',6.6,28,14,38),('W02',-28,-6.6,14,38)]:
    box('Frontage '+name+' • reserved proposal',x0,x1,y0,y1,-.30,-.24,zone)
    anchor('frontage_'+name+'_ground',(x0+x1)/2,(y0+y1)/2,0,PLAN)

active=COLLISION
for name,x0,x1 in [('road',-3.5,3.5),('east_walk',4.28,6.38),('west_walk',-6.38,-4.28)]:
    ob=box('PROPOSED_'+name,x0,x1,-12,12,-.2,.37,None);ob.display_type='WIRE';ob.hide_render=True
    ob['note']='Conservative envelope only; NOT a traversable surface or registered collider'

active=STUDIO
def camera(name,location,target,lens):
    data=bpy.data.cameras.new(name); ob=bpy.data.objects.new(name,data);STUDIO.objects.link(ob)
    ob.location=location;ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler();data.lens=lens;return ob
camera('Camera_street_eye_1.65m',(5.8,-10,1.86),(2.0,0,.1),26)
camera('Camera_drain_detail',(5.2,-8,1.1),(3.76,-5.8,-.06),48)
ob=camera('Camera_segment_overview',(22,-31,23),(0,0,0),44)
ob=camera('Camera_planning_200m',(0,-.01,260),(0,0,0),45);ob.data.type='ORTHO';ob.data.ortho_scale=218
data=bpy.data.lights.new('Late afternoon sun','SUN');data.energy=2.5;data.angle=math.radians(7)
ob=bpy.data.objects.new('Late afternoon sun',data);STUDIO.objects.link(ob);ob.rotation_euler=(math.radians(24),math.radians(-28),math.radians(-32))

# Export only each LOD collection. glTF axes become X east / Y up / Z south.
for col,filename in [(NEAR,'street-near.glb'),(FAR,'street-far.glb')]:
    bpy.ops.object.select_all(action='DESELECT')
    for ob in col.objects:ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/filename),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_image_format='AUTO')
for col in [FAR,PLAN,COLLISION]:col.hide_render=True;col.hide_viewport=True
scene.camera=bpy.data.objects['Camera_street_eye_1.65m']
scene['planningBoundary']='yaba-game-anchor-200m-planning-v1'
scene['layoutVersion']='yaba-ground-layout-v1'
scene['routeAuthorized']=False
scene['source']='Original synthetic road alignment, elevation, width and materials. No survey/imagery inputs.'
scene['humanMeshCheckpoint']='None consumed. No fit claim. Ask parent for an exact mesh checkpoint if later needed.'
for im in bpy.data.images:
    if im.source=='FILE':im.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'yaba-street-v1.blend'),compress=True)
(HERE/'anchors-source.json').write_text(json.dumps({'blenderAxes':'X east, Y north, Z up; metres','gltfAxes':'X east, Y up, Z south','anchors':anchor_defs},indent=2)+'\n')
print('BUILD COMPLETE: editable source plus two raw GLBs')
