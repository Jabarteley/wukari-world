"""Lane-owned fitted derivative of frozen 3ee5882; master is opened read-only then saved elsewhere.
Project original bounded hair geometry onto actual Head triangles, with copied surface morphs.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

LANE=Path(__file__).resolve().parent
MASTER=LANE/'runs/master-3ee5882'
COMMIT='3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()

def bary(p,a,b,c):
    u=b-a;v=c-a;w=p-a;den=u.dot(u)*v.dot(v)-u.dot(v)**2
    y=(v.dot(v)*w.dot(u)-u.dot(v)*w.dot(v))/den
    z=(u.dot(u)*w.dot(v)-u.dot(v)*w.dot(u))/den
    return [1-y-z,y,z]


def append(path,predicate):
    with bpy.data.libraries.load(str(path),link=False) as (src,dst):
        dst.objects=[n for n in src.objects if predicate(n)]
    for ob in dst.objects:
        bpy.context.scene.collection.objects.link(ob);ob.hide_set(False);ob.hide_render=False
    return dst.objects


def finite_subset(ob):
    # Source C01 far has 230 separate 30-vertex bundles. Preserve 96 complete curls.
    source=ob.data;assert len(source.vertices)==6900
    ids=set(round(i*229/95) for i in range(96))
    retained=[v.index for v in source.vertices if v.index//30 in ids]
    remap={old:new for new,old in enumerate(retained)}
    faces=[p for p in source.polygons if p.vertices[0]//30 in ids]
    mesh=bpy.data.meshes.new('C01 96 complete reduced curl bundles')
    mesh.from_pydata([source.vertices[i].co[:] for i in retained],[],[[remap[i] for i in p.vertices] for p in faces])
    for mat in source.materials:mesh.materials.append(mat)
    for new,old in zip(mesh.polygons,faces):new.material_index=old.material_index;new.use_smooth=True
    ob.data=mesh;ob['bundleCount']=96


def export(path,obs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs:o.hide_set(False);o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,
        export_apply=False,export_normals=True,export_texcoords=False,export_materials='EXPORT',
        export_skins=False,export_morph=True,export_morph_normal=False,export_animations=False,
        export_cameras=False,export_lights=False,export_extras=True,export_draco_mesh_compression_enable=False)


def main():
    p=argparse.ArgumentParser();p.add_argument('--out',required=True)
    a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.out).resolve();assert LANE in out.parents
    out.mkdir(parents=True,exist_ok=True);assert not list(out.glob('*.blend'))
    frame=json.loads((MASTER/'fit-frame.json').read_text());checks=json.loads((MASTER/'geometry-checks.json').read_text())
    assert sha(MASTER/'original-human-prototype.blend')==frame['sourceBlendSha256']
    assert sha(MASTER/'original-human-prototype.glb')==frame['sourceGlbSha256']
    bpy.ops.wm.open_mainfile(filepath=str(MASTER/'original-human-prototype.blend'))
    bpy.context.scene['hairFitMaster']=COMMIT;bpy.context.scene['hairFitNoRig']=True
    # Verify every source position, ordered triangle and UV against producer report.
    for row in checks['meshes']:
        ob=bpy.data.objects[row['name']];m=ob.data;m.calc_loop_triangles()
        for arr,expected in [(np.array([v.co[:] for v in m.vertices],dtype='<f8'),row['positionSha256']),
                             (np.array([t.vertices[:] for t in m.loop_triangles],dtype='<u4'),row['triangleOrderSha256']),
                             (np.array([u.uv[:] for u in m.uv_layers.active.data],dtype='<f8'),row['uvSha256'])]:
            assert hashlib.sha256(arr.tobytes()).hexdigest()==expected,row['name']
    head=bpy.data.objects['Head_continuous_anatomy'];head.data.calc_loop_triangles()
    base=[v.co.copy() for v in head.data.vertices];tris=[t.vertices[:] for t in head.data.loop_triangles]
    bvh=BVHTree.FromPolygons(base,tris,all_triangles=True)
    morphs={k.name:[v.co-p for v,p in zip(k.data,base)] for k in head.data.shape_keys.key_blocks if k.name!='Basis'}
    center=Vector((0,.022,1.642));oldcenter=Vector((0,0,1.65));radii=(.083,.100,.125)
    styles={
      'curl-crop':append(LANE/'artifacts/c01-v3/curl-crop-editable.blend',lambda n:n.startswith('C01') and n.endswith(' - far')),
      'swept-bun':append(LANE/'artifacts/s02-v3/swept-bun-editable.blend',lambda n:n.startswith('S02') and n.endswith(' - far')),
      'curl-proxy':append(LANE/'artifacts/lod-v2/silhouette-lods-editable.blend',lambda n:n=='curl-crop - silhouette only'),
      'bun-proxy':append(LANE/'artifacts/lod-v2/silhouette-lods-editable.blend',lambda n:n in ['swept-bun - silhouette only','S02 silhouette bun'])}
    finite_subset(next(o for o in styles['curl-crop'] if 'tight curl' in o.name))
    stats={};near_bindings={}
    for style,obs in styles.items():
        for ob in obs:
            oldname=ob.name;ob.name='FIT '+style+' / '+oldname
            bindings=[];positions=[]
            for vertex in ob.data.vertices:
                r=vertex.co-oldcenter;q=math.sqrt(sum((r[i]/radii[i])**2 for i in range(3)))
                oldsurface=r/q;offset=(r-oldsurface).length*(1 if q>=1 else -1)
                direction=Vector((r.x*.90,r.y*.75,r.z*.88)).normalized()
                hit,n,idx,dist=bvh.ray_cast(center,direction,1)
                assert hit is not None,(style,vertex.index)
                bc=bary(hit,*[base[i] for i in tris[idx]])
                # 3.2 mm margin includes source negative cap offsets and chord interpolation.
                new=hit+n*(.0032+max(0,offset)*.85)
                positions.append(new);bindings.append((idx,bc))
                vertex.co=new
            ob.data.update();ob.shape_key_add(name='Basis')
            for key,delta in morphs.items():
                values=[]
                for point,(idx,bc) in zip(positions,bindings):
                    d=sum((delta[v]*w for v,w in zip(tris[idx],bc)),Vector())
                    if key=='body.height':d=Vector((0,0,(point.z-.010)*.05))
                    values.append(d)
                if max(v.length for v in values)<1e-7:continue
                k=ob.shape_key_add(name=key);k.slider_min=-1
                for v,point,d in zip(k.data,positions,values):v.co=point+d
            # Drivers preserve producer height/expression product in Blender only.
            for k in ob.data.shape_keys.key_blocks:
                if not k.name.startswith('corrective.height.'):continue
                ex='expression.'+k.name.split('.')[-1]
                if ex not in ob.data.shape_keys.key_blocks:continue
                d=k.driver_add('value').driver
                for varname,path in [('height','body.height'),('expr',ex)]:
                    var=d.variables.new();var.name=varname;var.type='SINGLE_PROP';var.targets[0].id_type='KEY';var.targets[0].id=ob.data.shape_keys;var.targets[0].data_path='key_blocks["'+path+'"].value'
                d.expression='height * expr'
            ob['sourceMasterCommit']=COMMIT;ob['fitStatus']='neutral + sampled morph fit; unrigged prototype'
            ob.data.calc_loop_triangles()
        export(out/(style+'-fitted.glb'),obs)
        stats[style]={'triangles':sum(len(o.data.loop_triangles) for o in obs),'objects':[o.name for o in obs],
                      'morphs':{o.name:[k.name for k in o.data.shape_keys.key_blocks if k.name!='Basis'] for o in obs}}
    bindings=[]
    for name,point in frame['anchorsBlenderMetres'].items():
        if not name.startswith('scalp.'):continue
        loc,n,idx,dist=bvh.find_nearest(Vector(point));bc=bary(loc,*[base[i] for i in tris[idx]])
        bindings.append({'anchorId':name,'triangle':idx,'barycentric':bc,'normalOffsetMetres':.0032,'bodyPositionYUp':[loc.x,loc.z,-loc.y],'joint':None})
    # Hide source placeholder only in this separately owned derivative. Master bytes unchanged.
    originalhair=bpy.data.objects['Hair_original_close_curl_surface'];originalhair.hide_set(True);originalhair.hide_render=True
    for style,obs in styles.items():
        for o in obs:o.hide_set(style!='curl-crop');o.hide_render=style!='curl-crop'
    bpy.ops.object.select_all(action='DESELECT')
    for o in styles['curl-crop']:o.select_set(True)
    bpy.context.view_layer.objects.active=styles['curl-crop'][-1]
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'master-fitted-hair-editable.blend'),compress=True)
    headrow=next(r for r in checks['meshes'] if r['name']==head.name)
    report={'masterCommit':COMMIT,'masterBlendSha256':frame['sourceBlendSha256'],'masterGlbSha256':frame['sourceGlbSha256'],'fitFrameSha256':sha(MASTER/'fit-frame.json'),
      'verifiedSourceMeshes':len(checks['meshes']),'headMesh':headrow,'rigSha256':None,'skeleton':None,
      'units':'metres','frame':'body Y-up +Z-forward','nodeTransform':'identity; geometry in body bind coordinates','bodyRelativeMatrixColumnMajor':[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
      'anchorRevision':1,'surfaceAnchors':bindings,'jointBinding':'pending producer skeleton; never label allworld-body-23@1',
      'construction':'Affine-direction ray projection onto actual Head mesh; surface-normal offset preserves bounded source hair depth with 3.2 mm margin. Per-vertex morph deltas barycentrically transferred; body.height applies exact producer z rule.',
      'derivatives':stats,'masterWithoutPlaceholderTriangles':29186-2518,
      'totalCharacterTriangles':{k:29186-2518+v['triangles'] for k,v in stats.items()},
      'sourcePreservation':'Original calibration/high-detail sources unchanged; source master opened from verified bytes and never overwritten.',
      'admission':'Unrigged separately owned fitting prototype. Run fit_checks.py; no locomotion, game loader or physical-device acceptance.'}
    (out/'fit-proposal.json').write_text(json.dumps(report,indent=2)+'\n')
    assert sha(MASTER/'original-human-prototype.blend')==frame['sourceBlendSha256']
    print(json.dumps({'styles':stats,'totalCharacterTriangles':report['totalCharacterTriangles'],'verifiedSourceMeshes':31}))

if __name__=='__main__':main()
