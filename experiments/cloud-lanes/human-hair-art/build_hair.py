"""Original bounded hair meshes. Blender 4.3.2. No acquired textures or models.
Calibration is temporary, NOT the human producer's mesh. All dimensions authored.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import random
import sys
import bpy
from mathutils import Vector

LANE = Path(__file__).resolve().parent
PI = math.pi
CENTER = Vector((0, 0, 1.65))


def material(name, rgb, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*rgb, 1)
    b = mat.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Metallic'].default_value = 0
    b.inputs['Roughness'].default_value = roughness
    b.inputs['IOR'].default_value = 1.5
    mat.use_backface_culling = True
    return mat


def mesh_obj(name, verts, faces, mats, indices=None):
    m = bpy.data.meshes.new(name)
    m.from_pydata(verts, [], faces)
    m.update()
    for mat in mats:
        m.materials.append(mat)
    for i, poly in enumerate(m.polygons):
        poly.use_smooth = True
        if indices:
            poly.material_index = indices[i]
    obj = bpy.data.objects.new(name, m)
    bpy.context.scene.collection.objects.link(obj)
    obj['authorship'] = 'Original parametric sculpt by Allworld hair lane; no external assets'
    return obj


def hairline(phi):
    # Temple recess, a small irregular natural edge and lower nape.
    return 1.02 + .76 * (1-math.cos(phi))/2 + .022*math.sin(phi*5) + .014*math.sin(phi*11)


def scalp(theta, phi):
    return CENTER + Vector((.083*math.sin(theta)*math.sin(phi), -.100*math.sin(theta)*math.cos(phi), .125*math.cos(theta)))


def normal(theta, phi):
    p = scalp(theta, phi)-CENTER
    return Vector((p.x/.083**2, p.y/.100**2, p.z/.125**2)).normalized()


def shell(name, mats, rings=26, sectors=96, raised=True):
    verts = []
    for i in range(rings+1):
        t = (i+.025)/(rings+.025)
        for j in range(sectors):
            phi = 2*PI*j/sectors
            theta = hairline(phi)*t
            elevation = .0007 + .0065*(math.sin(PI*t)**.4) if raised else 0
            elevation += (.0021*math.sin(phi*53+theta*24)*math.sin(theta*47)+.0013*math.sin(phi*39-theta*33)) if raised else 0
            verts.append(scalp(theta, phi)+normal(theta,phi)*elevation)
    faces = []
    for i in range(rings):
        for j in range(sectors):
            a=i*sectors+j;b=i*sectors+(j+1)%sectors
            faces.append((a,a+sectors,b+sectors,b))
    faces.append(tuple(range(sectors)))
    return mesh_obj(name, verts, faces, mats)


def fixture():
    mat=material('TEMP ceramic calibration only',(.235,.265,.27),.72)
    verts=[]; faces=[];ns=80;nr=52
    # A single original cranial/face/neck surface; facial relief is a direction cue only.
    for i in range(nr+1):
        theta=.002+(PI-.004)*i/nr
        z=.125*math.cos(theta)
        jaw=1-.21*max(0, -z/.125)
        for j in range(ns):
            phi=2*PI*j/ns
            x=.083*math.sin(theta)*math.sin(phi)*jaw
            y=-.1*math.sin(theta)*math.cos(phi)
            if math.cos(phi)>0:
                nose=.020*math.exp(-(x/.014)**2-((z+.026)/.036)**2)
                sockets=.005*sum(math.exp(-((x-sign*.031)/.02)**2-((z-.006)/.014)**2) for sign in [-1,1])
                y += (sockets-nose)*(max(0,math.cos(phi))**6)
            verts.append((x,y,1.65+z))
    for i in range(nr):
        for j in range(ns):
            a=i*ns+j;b=i*ns+(j+1)%ns
            faces.append((a,a+ns,b+ns,b))
    obj=mesh_obj('TEMPORARY calibration head - actual fit pending master',verts,faces,[mat])
    obj['isHumanMaster']=False
    obj['actualFit']='pending-master'
    obj['scalpDimensionsAuthoredMetres']=[.166,.200,.250]
    # Neck is a display fixture, deliberately grey and labelled.
    v=[];f=[]
    for z,rx,ry in [(1.40,.083,.057),(1.44,.06,.043),(1.50,.039,.038),(1.56,.038,.038)]:
        for j in range(64):
            a=j*2*PI/64;v.append((rx*math.sin(a),.018+ry*math.cos(a),z))
    for k in range(3):
        for j in range(64):
            a=k*64+j;b=k*64+(j+1)%64;f.append((a,a+64,b+64,b))
    neck=mesh_obj('TEMPORARY display neck',v,f,[mat])
    return [obj,neck]


class Tubes:
    def __init__(self):
        self.v=[];self.f=[];self.mi=[];self.paths=[]

    def add(self,points,radii,matid,sides=4):
        start=len(self.v)
        self.paths.append([[round(c,7) for c in p] for p in points])
        for i,p in enumerate(points):
            tangent=(points[min(i+1,len(points)-1)]-points[max(0,i-1)]).normalized()
            ref=Vector((0,0,1)) if abs(tangent.z)<.9 else Vector((0,1,0))
            u=tangent.cross(ref).normalized();v=tangent.cross(u).normalized()
            for j in range(sides):
                a=2*PI*j/sides
                self.v.append(p+radii[i]*(u*math.cos(a)+v*math.sin(a)))
        for i in range(len(points)-1):
            for j in range(sides):
                a=start+i*sides+j;b=start+i*sides+(j+1)%sides
                self.f.append((a,b,b+sides,a+sides));self.mi.append(matid)
        self.f.append(tuple(start+j for j in reversed(range(sides))));self.mi.append(matid)
        e=start+(len(points)-1)*sides
        self.f.append(tuple(e+j for j in range(sides)));self.mi.append(matid)


def curls(tier,mats):
    random.seed(41029)
    tubes=Tubes()
    count=640 if tier=='near' else 230
    steps=19 if tier=='near' else 10
    sides=4 if tier=='near' else 3
    # Equal-area spiral across cap. Fixed finite counts; every curl remains editable mesh.
    for i in range(count):
        phi=i*PI*(3-math.sqrt(5)) + random.uniform(-.09,.09)
        t=math.acos(1-(i+.5)/count*(1-math.cos(1.78)))/1.78
        theta=t*hairline(phi)
        n=normal(theta,phi)
        u=Vector((math.cos(phi),math.sin(phi),0)).normalized();v=n.cross(u).normalized()
        root=scalp(theta,phi)
        edge=min(1,(1-t)*14+.17)
        radius=random.uniform(.0043,.0061)*edge
        length=random.uniform(.016,.024)*edge
        phase=random.uniform(0,2*PI);turns=random.uniform(1.5,2.1)
        pts=[];width=[]
        for j in range(steps):
            q=j/(steps-1);a=phase+q*2*PI*turns
            curlr=radius*(.25+.75*math.sin(PI*q)**.55)
            pts.append(root+n*(.0013+q*length)+curlr*(u*math.cos(a)+v*math.sin(a)))
            width.append((.00112 if tier=='near' else .00145)*edge*(.45+.55*math.sin(PI*q)**.35))
        tubes.add(pts,width,random.choices(range(3),[.67,.25,.08])[0],sides)
    ob=mesh_obj('C01 tight curl crop - '+tier,tubes.v,tubes.f,mats,tubes.mi)
    ob['curlBundleCount']=count;ob['pathSamplesPerBundle']=steps;ob['radialSides']=sides
    ob['seed']=41029
    return ob,tubes.paths


def measured(obj):
    obj.data.calc_loop_triangles()
    return dict(vertices=len(obj.data.vertices),triangles=len(obj.data.loop_triangles),
                materials=len(obj.data.materials), boundsBlenderMetres=[[min(v.co[i] for v in obj.data.vertices) for i in range(3)],[max(v.co[i] for v in obj.data.vertices) for i in range(3)]])


def export(path,objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.hide_set(False);o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
        export_yup=True,export_apply=False,export_normals=True,export_texcoords=False,
        export_materials='EXPORT',export_skins=False,export_morph=False,export_animations=False,
        export_cameras=False,export_lights=False,export_extras=True,
        export_draco_mesh_compression_enable=False)


def main():
    p=argparse.ArgumentParser();p.add_argument('--out',required=True)
    a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.out).resolve()
    assert LANE in out.parents
    out.mkdir(parents=True,exist_ok=True)
    assert not list(out.glob('*.blend')), 'Use a fresh output version'
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system='METRIC'
    bpy.context.scene.unit_settings.scale_length=1
    bpy.context.scene['actualFit']='pending-master'
    bpy.context.scene['temporaryCalibration']=True
    fixtures=fixture()
    mats=[material('C01 espresso',(.009,.005,.003),.66),material('C01 warm variation',(.016,.008,.004),.69),material('C01 soft glints',(.024,.012,.006),.63)]
    base=material('C01 root shadow',(.007,.004,.002),.82)
    tiers={};guidepaths=None
    for tier in ['near','far']:
        cap=shell('C01 scalp foundation - '+tier,[base],26 if tier=='near' else 12,96 if tier=='near' else 48)
        hair,paths=curls(tier,mats)
        tiers[tier]=[cap,hair]
        if tier=='near':guidepaths=paths
        export(out/f'curl-crop-{tier}.glb',[cap,hair])
    export(out/'temporary-calibration.glb',fixtures)
    # Named empties only propose a head-relative attachment; no rig claim.
    for name,t,phi in [('scalp.crown',0,0),('scalp.templeLeft',1.32,PI/2),('scalp.templeRight',1.32,-PI/2)]:
        e=bpy.data.objects.new(name,None);bpy.context.scene.collection.objects.link(e)
        e.location=scalp(t,phi);e.empty_display_size=.006
        e['calibrationOnly']=True
    for o in tiers['far']:o.hide_set(True);o.hide_render=True
    bpy.ops.object.select_all(action='DESELECT')
    tiers['near'][1].select_set(True);bpy.context.view_layer.objects.active=tiers['near'][1]
    # Leave an immediately useful viewport.
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                area.spaces.active.region_3d.view_distance=.55
                area.spaces.active.region_3d.view_location=(0,0,1.65)
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'curl-crop-editable.blend'),compress=True)
    (out/'authored-measurements.json').write_text(json.dumps({'blender':bpy.app.version_string,'style':'C01 tight curl crop','actualFit':'pending-master','sourceFrame':'metres Z-up -Y-forward','exportFrame':'metres Y-up +Z-forward','sourceOrigin':'body datum at zero; head centre Z=1.65 authored, temporary','geometry':{tier:{o.name:measured(o) for o in obs} for tier,obs in tiers.items()},'textures':[],'rigs':0,'morphs':0,'curves':'bounded polyline tube recipe; converted editable mesh','authorship':'Original recipe and original geometry; AGPL-3.0-or-later, following repository','seed':41029},indent=2)+'\n')


if __name__=='__main__':main()
