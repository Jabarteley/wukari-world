"""S02 original swept low twist. Bounded scalp ribbons and sculpted twisted bun.
Uses the temporary calibration geometry only; actual fit pending master.
"""
import argparse
import json
import math
from pathlib import Path
import random
import sys
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_hair import CENTER, LANE, PI, Tubes, export, fixture, hairline, material, measured, mesh_obj, normal, scalp, shell


def sweep(tier,mats):
    rng=random.Random(6211);verts=[];faces=[];mi=[]
    count=280 if tier=='near' else 70
    steps=22 if tier=='near' else 12
    cols=3
    end=Vector((0,.96,-.28)).normalized()
    for i in range(count):
        u=(i+.5)/count
        phi=(-PI/2+PI*u/.76) if u<.76 else (PI/2+PI*(u-.76)/.24)
        th=hairline(phi)
        start=Vector((math.sin(th)*math.sin(phi),-math.sin(th)*math.cos(phi),math.cos(th)))
        angle=start.angle(end)
        centers=[];normals=[]
        for j in range(steps):
            t=j/(steps-1)
            d=(start*math.sin((1-t)*angle)+end*math.sin(t*angle))/math.sin(angle)
            # The entire sweep follows the actual authored ellipsoid, with lifted roots.
            d.normalize()
            n=Vector((d.x/.083,d.y/.100,d.z/.125)).normalized()
            lift=.0016+.0010*math.sin(PI*t)**.5
            p=CENTER+Vector((d.x*.083,d.y*.100,d.z*.125))+n*lift
            centers.append(p);normals.append(n)
        offset=len(verts);mid=rng.choices([0,1,2],[.6,.3,.1])[0]
        for j,p in enumerate(centers):
            t=j/(steps-1);n=normals[j]
            tangent=(centers[min(steps-1,j+1)]-centers[max(0,j-1)]).normalized()
            u=tangent.cross(n).normalized()
            width=(.00135 if tier=='near' else .0046)*(1-.84*t**2)*(.30+.70*min(1,t*14))
            for k in range(cols):
                v=2*k/(cols-1)-1
                ridge=.00035*(1-v*v)+.00008*math.cos(v*PI*2)
                verts.append(p+u*width*v+n*ridge)
        for j in range(steps-1):
            for k in range(cols-1):
                a=offset+j*cols+k
                faces.append((a,a+cols,a+cols+1,a+1));mi.append(mid)
    obj=mesh_obj('S02 swept scalp ribbons - '+tier,verts,faces,mats,mi)
    obj['ribbonCount']=count;obj['samplesPerRibbon']=steps;obj['widthColumns']=cols
    # Force the surface to face away from the cranial centre, independent of ribbon direction.
    import bmesh
    bm=bmesh.new();bm.from_mesh(obj.data)
    for f in bm.faces:
        f.normal_update()
        if f.normal.dot(f.calc_center_median()-CENTER)<0:f.normal_flip()
    bm.to_mesh(obj.data);bm.free();obj.data.update()
    return obj


def bun(tier,mats):
    v=[];f=[];inds=[]
    rings=64 if tier=='near' else 28
    sides=16 if tier=='near' else 8
    # A low oval twist with shallow longitudinal grooves. Centre/size are authored.
    c=Vector((0,.112,1.608))
    for i in range(rings):
        a=2*PI*i/rings
        for j in range(sides):
            b=2*PI*j/sides
            minor=.014*(1+.14*math.sin(a*19+b*3))
            # Elliptical ring in X/Z, minor section Y/elliptical radius.
            v.append(c+Vector(((.029+minor*math.cos(b))*math.cos(a),minor*math.sin(b)+.004*math.sin(a*2),(.024+minor*math.cos(b))*math.sin(a))))
    for i in range(rings):
        for j in range(sides):
            a=i*sides+j;b=i*sides+(j+1)%sides;d=((i+1)%rings)*sides+j;cc=((i+1)%rings)*sides+(j+1)%sides
            f.append((a,b,cc,d));inds.append(0 if i%9<6 else 1)
    core=mesh_obj('S02 sculpted low twist - '+tier,v,f,mats,inds)
    # Short wrap ribs make the twist read as gathered hair, with finite authored paths.
    tubes=Tubes();n=84 if tier=='near' else 22;steps=20 if tier=='near' else 10
    for i in range(n):
        a=2*PI*i/n;pts=[];rads=[]
        for j in range(steps):
            t=j/(steps-1);b=2*PI*t;a2=a+.32*math.sin(b)
            m=.0155
            pts.append(c+Vector(((.029+m*math.cos(b))*math.cos(a2),m*math.sin(b)+.004*math.sin(a2*2),(.024+m*math.cos(b))*math.sin(a2))))
            rads.append(.00057 if tier=='near' else .0012)
        tubes.add(pts,rads,i%3,3)
    detail=mesh_obj('S02 twist fibre ridges - '+tier,tubes.v,tubes.f,mats,tubes.mi)
    # A coiled centre closes the ring; this is a wound bun, not an open torus.
    winding=Tubes();pts=[];rads=[];samples=70 if tier=='near' else 32
    for j in range(samples):
        t=j/(samples-1);a=2*PI*2.6*t
        r=.0008+.026*t
        pts.append(c+Vector((r*math.cos(a),.015+.002*math.sin(PI*t),r*.84*math.sin(a))))
        rads.append(.0034*(.7+.3*math.sin(PI*t)))
    winding.add(pts,rads,0,5 if tier=='near' else 4)
    centre=mesh_obj('S02 wound centre - '+tier,winding.v,winding.f,mats,winding.mi)
    return [core,detail,centre]


def main():
    p=argparse.ArgumentParser();p.add_argument('--out',required=True)
    a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.out).resolve()
    assert LANE in out.parents;out.mkdir(parents=True,exist_ok=True);assert not list(out.glob('*.blend'))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system='METRIC';bpy.context.scene.unit_settings.scale_length=1
    bpy.context.scene['actualFit']='pending-master';fixtures=fixture()
    mats=[material('S02 chestnut',(.032,.012,.005),.48),material('S02 copper undertone',(.051,.020,.009),.53),material('S02 dark lowlights',(.018,.006,.002),.56)]
    base=material('S02 roots',(.017,.006,.002),.64)
    tiers={}
    for tier in ['near','far']:
        # Smooth foundation offsets edited locally; never modify the C01 frozen source.
        cap=shell('S02 swept foundation - '+tier,[base],18 if tier=='near' else 10,72 if tier=='near' else 36,False)
        for v in cap.data.vertices:
            rel=v.co-CENTER;n=Vector((rel.x/.083**2,rel.y/.100**2,rel.z/.125**2)).normalized();v.co+=n*.0010
        obs=[cap,sweep(tier,mats),*bun(tier,mats)];tiers[tier]=obs
        export(out/f'swept-bun-{tier}.glb',obs)
    export(out/'temporary-calibration.glb',fixtures)
    for o in tiers['far']:o.hide_set(True);o.hide_render=True
    bpy.ops.object.select_all(action='DESELECT');tiers['near'][1].select_set(True);bpy.context.view_layer.objects.active=tiers['near'][1]
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                area.spaces.active.region_3d.view_distance=.55;area.spaces.active.region_3d.view_location=(0,0,1.65)
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'swept-bun-editable.blend'),compress=True)
    (out/'authored-measurements.json').write_text(json.dumps({'blender':bpy.app.version_string,'style':'S02 swept low twist bun','actualFit':'pending-master','sourceFrame':'metres Z-up -Y-forward','exportFrame':'metres Y-up +Z-forward','geometry':{tier:{o.name:measured(o) for o in obs} for tier,obs in tiers.items()},'textures':[],'rigs':0,'morphs':0,'source':'Original geometric scalp ribbons and grooved twist; no acquired assets'},indent=2)+'\n')

if __name__=='__main__':main()
