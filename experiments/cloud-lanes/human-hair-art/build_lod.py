"""Separately editable silhouette-only LODs. Close detail deliberately omitted."""
import argparse
import json
import math
from pathlib import Path
import sys
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_hair import CENTER,LANE,PI,export,material,measured,mesh_obj,shell

p=argparse.ArgumentParser();p.add_argument('--out',required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.out).resolve();assert LANE in out.parents
out.mkdir(parents=True,exist_ok=True);assert not list(out.glob('*.blend'))
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.unit_settings.system='METRIC';bpy.context.scene.unit_settings.scale_length=1
m1=material('C01 silhouette espresso',(.010,.005,.003),.78)
m2=material('S02 silhouette chestnut',(.032,.012,.005),.58)
stats={}
for style,mat in [('curl-crop',m1),('swept-bun',m2)]:
    cap=shell(style+' - silhouette only',[mat],7,24,False)
    for vertex in cap.data.vertices:
        r=vertex.co-CENTER;n=Vector((r.x/.083**2,r.y/.100**2,r.z/.125**2)).normalized()
        theta=math.acos(max(-1,min(1,r.z/.125)))
        factor=max(0,min(1,(1.8-theta)/.55))
        amount=.018*factor if style=='curl-crop' else .0060
        if style=='curl-crop':amount+=.0015*math.sin(math.atan2(r.y,r.x)*9+theta*13)*factor
        vertex.co+=n*amount
    obs=[cap]
    if style=='swept-bun':
        v=[];f=[];ns=12;nr=6;c=Vector((0,.12,1.608))
        for i in range(nr+1):
            a=.001+(PI-.002)*i/nr
            for j in range(ns):
                b=j*2*PI/ns;v.append(c+Vector((.044*math.sin(a)*math.sin(b),.020*math.sin(a)*math.cos(b),.040*math.cos(a))))
        for i in range(nr):
            for j in range(ns):
                aa=i*ns+j;bb=i*ns+(j+1)%ns;f.append((aa,aa+ns,bb+ns,bb))
        # Y sign differs from scalp parameterization, so this ellipsoid requires flipped winding.
        f=[tuple(reversed(x)) for x in f]
        obs.append(mesh_obj('S02 silhouette bun',v,f,[mat]))
    export(out/f'{style}-proxy.glb',obs)
    stats[style]={o.name:measured(o) for o in obs}
    for o in obs:o['lod']='silhouette-only';o['suggestedUse']='less than 60 pixel head height; proposed, not device-measured'
bpy.ops.wm.save_as_mainfile(filepath=str(out/'silhouette-lods-editable.blend'),compress=True)
(out/'authored-measurements.json').write_text(json.dumps({'actualFit':'pending-master','proposedUse':'less than 60 pixel head height; no tested switch threshold','geometry':stats,'materials':'one opaque slot per style','omitted':'all curls/ribbons/fibre ridges; both open scalp patches intentionally attach to covered head'},indent=2)+'\n')
