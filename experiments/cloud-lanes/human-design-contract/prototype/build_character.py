"""Original adult character study, authored from mathematical surfaces. Blender 4.3.

No downloaded anatomy, images, scans, project bodies or production imports.
Blender coordinates: metres, Z up, front -Y; glTF exporter performs Y-up conversion.
Run through the repository heavy slot. See --help arguments at the bottom.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector

PI = math.pi
ROOT = Path(__file__).resolve().parent
OUT = ROOT
DOC = ROOT.parents[3] / 'docs/agent-plans/cloud-lanes/human-design-contract/prototype'
PARTS = []
META = {}
SKIN = None


def g(x, center, radius):
    return math.exp(-((x-center)/radius)**2)


def smooth(a, b, x):
    t = max(0, min(1, (x-a)/(b-a)))
    return t*t*(3-2*t)


def material(name, color, roughness=.5, metallic=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metallic
    return m


def mesh(name, verts, faces, mat, metadata=None):
    data = bpy.data.meshes.new(name+'-mesh')
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for poly in data.polygons:
        poly.use_smooth = True
    PARTS.append(obj)
    META[name] = metadata
    return obj


def loft(name, rings, mat, n=24, cap=True):
    # Ring fields: center x/y/z, horizontal radius, depth radius.
    verts = [(x+rx*math.sin(2*PI*j/n), y-ry*math.cos(2*PI*j/n), z)
             for x, y, z, rx, ry in rings for j in range(n)]
    faces = []
    for i in range(len(rings)-1):
        for j in range(n):
            a = i*n+j; b=i*n+(j+1)%n
            faces.append((a,b,b+n,a+n))
    if cap:
        faces.extend([tuple(reversed(range(n))), tuple((len(rings)-1)*n+j for j in range(n))])
    return mesh(name, verts, faces, mat)


def tube(name, points, radii, mat, sides=8):
    verts=[]
    for i, co in enumerate(points):
        p=Vector(co)
        d=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        d.normalize()
        u=d.cross(Vector((0,1,0))).normalized()
        if u.length < .1: u=d.cross(Vector((1,0,0))).normalized()
        v=d.cross(u).normalized()
        for j in range(sides):
            a=2*PI*j/sides
            verts.append(p+radii[i]*(math.cos(a)*u+math.sin(a)*v))
    faces=[]
    for i in range(len(points)-1):
        for j in range(sides):
            a=i*sides+j; b=i*sides+(j+1)%sides
            faces.append((a,b,b+sides,a+sides))
    faces += [tuple(reversed(range(sides))), tuple((len(points)-1)*sides+j for j in range(sides))]
    return mesh(name, verts, faces, mat)


def join_remesh(name, objects, voxel, ratio=.5):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    obj=objects[0]; obj.name=name
    mod=obj.modifiers.new('Fused authored surfaces', 'REMESH')
    mod.mode='VOXEL'; mod.voxel_size=voxel; mod.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=obj.modifiers.new('Relax junctions', 'SMOOTH'); mod.factor=.5; mod.iterations=3
    bpy.ops.object.modifier_apply(modifier=mod.name)
    if ratio<1:
        mod=obj.modifiers.new('Bounded topology simplification', 'DECIMATE'); mod.ratio=ratio
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for old in objects[1:]:
        # Blender invalidates joined object handles; rebuild global list from scene below.
        pass
    return obj


HEAD_TABLE=[
    (1.490,.016,.022,-.007),(1.500,.041,.037,-.002),(1.518,.057,.048,.003),
    (1.540,.068,.057,.008),(1.562,.074,.063,.012),(1.585,.077,.067,.014),
    (1.608,.078,.070,.016),(1.632,.078,.073,.018),(1.656,.076,.077,.021),
    (1.678,.073,.076,.022),(1.700,.068,.069,.024),(1.721,.058,.058,.025),
    (1.740,.043,.042,.025),(1.753,.021,.021,.025),(1.757,.001,.001,.025)]


def head_profile(z):
    for a,b in zip(HEAD_TABLE, HEAD_TABLE[1:]):
        if a[0]<=z<=b[0]:
            t=(z-a[0])/(b[0]-a[0])
            return tuple(a[i]*(1-t)+b[i]*t for i in range(1,4))
    return HEAD_TABLE[0][1:] if z<HEAD_TABLE[0][0] else HEAD_TABLE[-1][1:]


def face_y(x,z):
    rx,ry,cy=head_profile(z)
    y=cy-ry*math.sqrt(max(0,1-(x/max(rx,.001))**2))
    # Continuous anatomical masses: brow, socket, cheek, muzzle, nose and chin.
    for side in [-1,1]:
        y += .0048*g(x,side*.032,.023)*g(z,1.635,.017)
        y -= .0045*g(x,side*.033,.029)*g(z,1.658,.009)
        y -= .006*g(x,side*.044,.022)*g(z,1.596,.020)
    y -= .008*g(x,0,.029)*g(z,1.550,.014)
    y -= .006*g(x,0,.023)*g(z,1.511,.012)
    y -= .012*g(x,0,.009)*g(z,1.622,.029)
    y -= .024*g(x,0,.011)*g(z,1.587,.010)
    y -= .009*(g(x,-.011,.006)+g(x,.011,.006))*g(z,1.579,.007)
    # Philtrum and lip bed are shaped in the same continuous front surface.
    y += .0014*g(x,0,.003)*g(z,1.563,.008)
    return y


def make_head():
    n=64; rows=64
    zs=[1.490+(1.757-1.490)*i/(rows-1) for i in range(rows)]
    verts=[]
    for z in zs:
        rx,ry,cy=head_profile(z)
        for j in range(n):
            theta=2*PI*j/n
            x=rx*math.sin(theta); y=cy-ry*math.cos(theta)
            front=smooth(0,.45,math.cos(theta))
            y += front*(face_y(x,z)-(cy-ry*math.sqrt(max(0,1-(x/max(rx,.001))**2))))
            verts.append((x,y,z))
    faces=[]
    for i in range(rows-1):
        for j in range(n):
            ids=(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j)
            p=sum((Vector(verts[k]) for k in ids),Vector())/4
            eyehole=p.y<0 and any(((p.x-s*.032)/.020)**2+((p.z-1.635)/.011)**2<1 for s in [-1,1])
            if not eyehole: faces.append(ids)
    faces.extend([tuple(reversed(range(n))),tuple((rows-1)*n+j for j in range(n))])
    return mesh('Head_continuous_anatomy',verts,faces,SKIN)


def ellipsoid(name, center, radii, mat, n=28, rows=14):
    verts=[(center[0],center[1],center[2]+radii[2])]
    for i in range(1,rows):
        phi=PI*i/rows
        for j in range(n):
            theta=2*PI*j/n
            verts.append((center[0]+radii[0]*math.sin(phi)*math.cos(theta),center[1]+radii[1]*math.sin(phi)*math.sin(theta),center[2]+radii[2]*math.cos(phi)))
    bottom=len(verts);verts.append((center[0],center[1],center[2]-radii[2]))
    faces=[(0,1+j,1+(j+1)%n) for j in range(n)]
    for i in range(rows-2):
        for j in range(n):
            a=1+i*n+j;b=1+i*n+(j+1)%n
            faces.append((a,a+n,b+n,b))
    faces += [(bottom,1+(rows-2)*n+(j+1)%n,1+(rows-2)*n+j) for j in range(n)]
    return mesh(name,verts,faces,mat)


def make_eyes(white,iris,pupil,crease):
    for side, tag in [(1,'Left'),(-1,'Right')]:
        cx=side*.032; cy=-.036; cz=1.635
        ellipsoid('Eye_'+tag,(cx,cy,cz),(.018,.014,.014),white)
        # Curved iris/pupil patches, flush with the eyeball rather than floating disks.
        for name,radius,mat in [('Iris',.006,iris),('Pupil',.00265,pupil)]:
            verts=[(cx,cy-.01425,cz)]
            for j in range(40):
                a=2*PI*j/40; dx=radius*math.cos(a); dz=radius*math.sin(a)
                verts.append((cx+dx,cy-.014*math.sqrt(max(0,1-(dx/.018)**2-(dz/.014)**2))-.00025,cz+dz))
            mesh(name+'_'+tag,verts,[(0,j+1,(j+1)%40+1) for j in range(40)],mat)
        for upper in [True,False]:
            verts=[]; meta=[]; count=32; layers=5
            for layer in range(layers):
                t=layer/(layers-1)
                for j in range(count+1):
                    u=-1+2*j/count
                    arc=math.sqrt(max(0,1-u*u))
                    width=.0175*(1-t)+.024*t
                    x=cx+u*width
                    z=cz+(.0063 if upper else -.0048)*(1-t)*arc+( .019 if upper else -.017)*t*arc+(x-cx)/.0175*side*.0012
                    globe=1-((x-cx)/.018)**2-((z-cz)/.014)**2
                    y=face_y(x,z)+.0003*smooth(.85,1,t)
                    if globe>0:y=min(y,cy-.014*math.sqrt(globe)-.001)
                    verts.append((x,y,z));meta.append((u,t,upper,side,cy,cz))
            faces=[]
            for layer in range(layers-1):
                for j in range(count):
                    a=layer*(count+1)+j
                    f=(a,a+1,a+count+2,a+count+1)
                    faces.append(f if upper else tuple(reversed(f)))
            mesh(('UpperLid_' if upper else 'LowerLid_')+tag,verts,faces,SKIN,meta)
        # Upper lid fold follows the socket; eyebrow is a shaped ribbon with tapered tips.
        verts=[]; faces=[]
        for i in range(25):
            u=-1+2*i/24; x=cx+u*.024
            z=1.660+.004*(1-u*u)-side*u*.001
            width=.0018*math.sin(PI*(i+.1)/24.2)**.45
            for dz in [-width,width]: verts.append((x,face_y(x,z+dz)-.001,z+dz))
        for i in range(24): faces.append((2*i,2*i+1,2*i+3,2*i+2))
        mesh('Brow_'+tag,verts,faces,crease)


def make_mouth(lips,oral):
    for upper in [True,False]:
        verts=[];faces=[]
        count=44;layers=5
        for layer in range(layers):
            t=layer/(layers-1)
            for j in range(count+1):
                u=-1+2*j/count; x=.026*u
                edge=(1-u*u)**.65
                cupid=.0018*g(abs(u),.26,.20)-.0008*g(u,0,.13)
                seamz=1.548+.0007*u*u
                z=seamz+((.005*edge+cupid) if upper else -.006*edge)*t
                y=face_y(x,z)-(.0023+.0025*math.sin(PI*t))*(1-u*u)
                verts.append((x,y,z))
        for k in range(layers-1):
            for j in range(count):
                a=k*(count+1)+j;f=(a,a+1,a+count+2,a+count+1)
                faces.append(f if upper else tuple(reversed(f)))
        mesh('Lip_upper' if upper else 'Lip_lower',verts,faces,lips)
    points=[]
    for i in range(45):
        u=-1+2*i/44;x=u*.026;z=1.548+.0007*u*u
        points.append((x,face_y(x,z)-.00265*(1-u*u)-.00005,z))
    tube('Mouth_seam',points,[.00045*(.4+.6*math.sin(PI*i/44)) for i in range(45)],oral,6)
    for side in [-1,1]:
        # Recessed nostril openings and their rims are explicitly prototype surface details.
        ellipsoid('Nostril_'+str(side),(side*.0098,-.0800,1.5785),(.0045,.0015,.0022),oral,20,8)


def make_ear(side):
    tag='Left' if side>0 else 'Right';n=40; layers=8
    verts=[]
    for i in range(layers):
        r=.06+.94*i/(layers-1)
        for j in range(n):
            a=2*PI*j/n
            z=1.612+.029*r*math.cos(a)
            y=.010+.015*r*math.sin(a)-.004*r*math.cos(a)
            ridge=.007*g(r,.82,.11)+.004*g(r,.46,.12)
            x=side*(.076+.004+ridge+.002*r*math.cos(a))
            verts.append((x,y,z))
    faces=[]
    for i in range(layers-1):
        for j in range(n):
            a=i*n+j;b=i*n+(j+1)%n
            f=(a,b,b+n,a+n);faces.append(f if side>0 else tuple(reversed(f)))
    # The base folds into the head, avoiding a disconnected ring silhouette.
    start=len(verts)
    for j in range(n):
        a=2*PI*j/n;verts.append((side*.073,.010+.014*math.sin(a)-.004*math.cos(a),1.612+.028*math.cos(a)))
    for j in range(n):
        a=(layers-1)*n+j;b=(layers-1)*n+(j+1)%n
        faces.append((a,b,start+(j+1)%n,start+j))
    return mesh('Ear_'+tag,verts,faces,SKIN)


def make_hair(hair):
    n=72;rows=18;verts=[]
    for i in range(rows):
        t=i/(rows-1)
        for j in range(n):
            a=2*PI*j/n
            # Natural rounded hairline, lowered toward temples and nape.
            base=1.668+.028*max(0,math.cos(a))**.5-.045*max(0,-math.cos(a))
            z=base+(1.756-base)*t
            rx,ry,cy=head_profile(z)
            curl=.0015*(.5+.5*math.sin(49*a+11*t))*math.sin(PI*t)
            offset=.0025+curl
            verts.append(((rx+offset)*math.sin(a),cy-(ry+offset)*math.cos(a),z+.002))
    faces=[]
    for i in range(rows-1):
        for j in range(n):
            a=i*n+j;b=i*n+(j+1)%n;faces.append((a,b,b+n,a+n))
    faces.append(tuple((rows-1)*n+j for j in range(n)))
    return mesh('Hair_original_close_curl_surface',verts,faces,hair)


def make_body(shirt,pants,shoe,sole):
    loft('Neck',[(0,.017,1.410,.046,.043),(0,.017,1.46,.042,.040),(0,.020,1.525,.046,.043)],SKIN,32)
    torso=loft('Shirt_torso',[(0,.012,z,rx,ry) for z,rx,ry in [
        (1.025,.130,.091),(1.065,.133,.093),(1.15,.141,.095),(1.25,.163,.108),
        (1.33,.187,.105),(1.375,.188,.098),(1.406,.166,.086),(1.43,.103,.059),(1.443,.050,.046)]],shirt,40)
    sleeves=[]
    for side in [-1,1]:
        sleeves.append(loft('Sleeve_'+str(side),[(side*x,.012,z,rx,ry) for x,z,rx,ry in [(.126,1.398,.046,.065),(.176,1.367,.063,.082),(.202,1.326,.064,.077),(.228,1.24,.059,.064),(.253,1.153,.051,.056)]],shirt,24))
    join_remesh('Shirt_fused_shoulders', [torso,*sleeves], .0085, .18)
    # Neckline band: actual geometry, with the same opening as the shirt.
    loft('Collar_band',[(0,.013,1.432,.051,.047),(0,.013,1.447,.050,.046)],shirt,40,False)
    pelvis=loft('Trouser_hip',[(0,.019,.862,.142,.100),(0,.018,.917,.151,.102),(0,.015,.991,.133,.095),(0,.015,1.039,.124,.086)],pants,32)
    legs=[]
    for side in [-1,1]:
        legs.append(loft('Trouser_leg_'+str(side),[(side*x,y,z,rx,ry) for x,y,z,rx,ry in [
            (.079,.018,.943,.060,.080),(.081,.017,.895,.069,.083),(.087,.015,.84,.074,.081),(.090,.012,.72,.071,.072),
            (.09,.011,.59,.057,.061),(.09,.008,.50,.052,.054),(.09,.017,.405,.057,.058),
            (.09,.020,.30,.051,.049),(.09,.010,.19,.043,.042),(.09,.0,.098,.041,.042)]],pants,24))
    join_remesh('Trousers_fused_hip', [pelvis,*legs], .008, .12)
    for side in [-1,1]:
        arm=loft('Forearm_'+str(side),[(side*x,y,z,rx,ry) for x,y,z,rx,ry in [
            (.250,.010,1.163,.041,.040),(.265,.006,1.095,.040,.037),(.278,.002,1.026,.034,.031),
            (.287,-.004,.965,.026,.025),(.293,-.011,.925,.023,.023),(.299,-.016,.897,.033,.020),(.300,-.019,.859,.031,.018)]],SKIN,20)
        fingers=[]
        for i in range(4):
            x=side*(.278+i*.014);length=[.055,.069,.067,.052][i]
            z=.866
            fingers.append(tube('Finger_'+str(side)+'_'+str(i),[(x,-.019,z),(x+side*.003,-.022,z-length*.38),(x+side*.002,-.018,z-length*.76),(x,-.016,z-length)], [.008,.007,.006,.0035],SKIN,8))
        fingers.append(tube('Thumb_'+str(side),[(side*.276,-.014,.900),(side*.263,-.026,.882),(side*.255,-.030,.856)], [.012,.010,.006],SKIN,10))
        join_remesh('Forearm_hand_'+str(side),[arm,*fingers],.0032,.10)
        rings=[(side*.09,-.026,z,rx,ry) for z,rx,ry in [(.012,.047,.108),(.026,.049,.111),(.039,.050,.112),(.067,.047,.102),(.088,.040,.075),(.104,.033,.047)]]
        loft('Shoe_'+str(side),rings,shoe,32)
        loft('Sole_'+str(side),[(side*.09,-.026,.010,.049,.110),(side*.09,-.026,.027,.051,.113)],sole,32)


IDENTITY=['nose.projection','nose.alarWidth','earLeft.protrusion','earRight.protrusion','body.height','body.shoulderWidth']
EXPRESSIONS=['smileLeft','smileRight','frownLeft','frownRight','browRaiseLeft','browRaiseRight','blinkLeft','blinkRight']


def add_controls():
    for obj in list(bpy.context.scene.objects):
        if obj.type!='MESH': continue
        name=obj.name
        basis=obj.shape_key_add(name='Basis')
        source=[v.co.copy() for v in obj.data.vertices]
        candidates=IDENTITY+['expression.'+k for k in EXPRESSIONS]
        for keyname in candidates:
            deltas=[]
            for index,p in enumerate(source):
                x,y,z=p;d=Vector((0,0,0))
                face=name.startswith(('Head','Lip','Mouth','Nostril'))
                if keyname=='nose.projection' and face:
                    d.y=-.018*g(x,0,.019)*g(z,1.590,.025)*smooth(.01,-.02,y)
                elif keyname=='nose.alarWidth' and face:
                    d.x=math.copysign(.006,x)*g(abs(x),.012,.012)*g(z,1.584,.013)*smooth(.01,-.02,y)*smooth(0,.006,abs(x))
                elif keyname in ['earLeft.protrusion','earRight.protrusion']:
                    side=1 if keyname.startswith('earLeft') else -1
                    if name=='Ear_'+('Left' if side>0 else 'Right'):
                        d.x=side*.008*smooth(.073,.09,abs(x))
                    elif name.startswith('Head'):
                        d.x=side*.002*g(x,side*.077,.007)*g(z,1.612,.034)
                elif keyname=='body.height': d.z=(z-.010)*.05
                elif keyname=='body.shoulderWidth':
                    if z<1.455 and z>.77:
                        w=smooth(.04,.18,abs(x))*(1-smooth(1.37,1.455,z))*smooth(.78,1.03,z)
                        d.x=math.copysign(.026*w,x)
                elif keyname.startswith('expression.'):
                    expr=keyname.split('.')[1]
                    side=1 if expr.endswith('Left') else -1
                    hemi=smooth(-.003,.012,side*x)
                    if expr.startswith(('smile','frown')) and face:
                        weight=hemi*g(z,1.551,.025)*smooth(.002,.026,abs(x))*g(x,0,.049)*smooth(.01,-.02,y)
                        d.z=(.010 if expr.startswith('smile') else -.008)*weight
                        d.x=side*.002*weight
                        if expr.startswith('smile'): d.y=-.0015*weight
                    if expr.startswith('browRaise') and name.startswith(('Head','Brow')):
                        w=hemi*g(z,1.660,.012)*g(abs(x),.018,.019)*smooth(.01,-.02,y)
                        d.z=.009*w
                    if expr.startswith('blink') and name in ['UpperLid_'+('Left' if side>0 else 'Right'),'LowerLid_'+('Left' if side>0 else 'Right')]:
                        u,t,upper,_,cy,cz=META[name][index]
                        arc=math.sqrt(max(0,1-u*u))
                        target_z=z-(.0063 if upper else -.0048)*arc*(1-t)
                        d.z=target_z-z
                        globe=1-((x-side*.032)/.018)**2-((target_z-cz)/.014)**2
                        target_y=face_y(x,target_z)+.0003*smooth(.85,1,t)
                        if globe>0:target_y=min(target_y,cy-.014*math.sqrt(globe)-.001)
                        d.y=target_y-y
                deltas.append(d)
            if max(d.length for d in deltas)<1e-7: continue
            block=obj.shape_key_add(name=keyname)
            if not keyname.startswith('expression.'): block.slider_min=-1
            for v,p,d in zip(block.data,source,deltas): v.co=p+d
        # Expressions are evaluated in the resized body frame. A product
        # corrective prevents the shorter-body + blink combination overshooting
        # the canthus; plain additive shape-key blending cannot encode that order.
        for expression in list(obj.data.shape_keys.key_blocks):
            if not expression.name.startswith('expression.'):continue
            dz=[(v.co.z-p.z)*.05 for v,p in zip(expression.data,source)]
            if max(abs(x) for x in dz)<1e-8:continue
            correct=obj.shape_key_add(name='corrective.height.'+expression.name.split('.')[1])
            correct.slider_min=-1
            for v,p,z in zip(correct.data,source,dz):v.co=p+Vector((0,0,z))
            driver=correct.driver_add('value').driver
            for varname,path in [('height','body.height'),('expression',expression.name)]:
                var=driver.variables.new();var.name=varname;var.type='SINGLE_PROP'
                var.targets[0].id_type='KEY';var.targets[0].id=obj.data.shape_keys
                var.targets[0].data_path='key_blocks["'+path+'"].value'
            driver.expression='height * expression'
        obj['original_geometry']='Authored mathematical surfaces; no person/reference photo.'
        obj['prototype_only']=True
    bpy.context.scene['implemented_identity_controls']=json.dumps(IDENTITY)
    bpy.context.scene['implemented_expression_channels']=json.dumps(EXPRESSIONS)


def add_uvs():
    for obj in bpy.context.scene.objects:
        if obj.type!='MESH': continue
        uv=obj.data.uv_layers.new(name='Prototype_UV_v1')
        points=[v.co for v in obj.data.vertices]
        lo=min(p.z for p in points);hi=max(p.z for p in points)
        cx=sum(p.x for p in points)/len(points);cy=sum(p.y for p in points)/len(points)
        for face in obj.data.polygons:
            values=[]
            for loop_index in face.loop_indices:
                p=points[obj.data.loops[loop_index].vertex_index]
                # Rear seam on the head: the face occupies the middle of the U domain.
                u=(.5+math.atan2(p.x-cx,-(p.y-cy))/(2*PI))%1
                values.append([loop_index,u,(p.z-lo)/max(.0001,hi-lo)])
            if max(v[1] for v in values)-min(v[1] for v in values)>.5:
                for v in values:
                    if v[1]<.5:v[1]+=1
            for loop_index,u,v in values:uv.data[loop_index].uv=(u,v)
        obj['uv_status']='Prototype cylindrical unwrap v1; head rear seam; body islands need production packing.'


def cleanup_geometry():
    for obj in bpy.context.scene.objects:
        if obj.type!='MESH' or 'Lid_' in obj.name: continue
        bm=bmesh.new();bm.from_mesh(obj.data)
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
        loose=[v for v in bm.verts if not v.link_faces]
        if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        bm.to_mesh(obj.data);bm.free();obj.data.update()


def set_values(values):
    for obj in bpy.context.scene.objects:
        if obj.type!='MESH' or not obj.data.shape_keys: continue
        for block in obj.data.shape_keys.key_blocks:
            if block.name!='Basis' and not block.name.startswith('corrective.'): block.value=values.get(block.name,0)
        obj.data.update_tag()
    bpy.context.scene.frame_set(bpy.context.scene.frame_current)
    bpy.context.view_layer.update()


def aim(obj,point):
    obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()


def stage():
    scene=bpy.context.scene
    world=bpy.data.worlds.new('Neutral studio');scene.world=world;world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.19,.23,.30,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.35
    for name,loc,power,size,color in [
        ('Key',(-2.5,-3.2,4),400,3,(1,.87,.72)),
        ('Fill',(2,-2,2.1),210,2.5,(.72,.83,1)),
        ('Rim',(1.3,1.5,3),430,2,(1,.92,.83)),
    ]:
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
        obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=loc;aim(obj,(0,0,1))
    floor=material('Studio floor',(.045,.065,.090),.7)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.006));bpy.context.object.name='STUDIO_floor';bpy.context.object.data.materials.append(floor)
    camera=bpy.data.cameras.new('Review camera');obj=bpy.data.objects.new('Review camera',camera);scene.collection.objects.link(obj);scene.camera=obj
    camera.type='ORTHO';camera.lens=70
    scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24
    scene.cycles.use_denoising=False
    scene.render.threads_mode='FIXED';scene.render.threads=4
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.view_settings.view_transform='AgX'
    scene.render.film_transparent=False


def camera_view(kind='portrait',angle=0):
    camera=bpy.context.scene.camera
    if kind=='portrait':
        target=(0,-.005,1.608);dist=2.7;camera.data.ortho_scale=.43
        camera.location=(math.sin(angle)*dist,-math.cos(angle)*dist,1.635)
        bpy.context.scene.render.resolution_x=800;bpy.context.scene.render.resolution_y=900
    else:
        target=(0,0,.91);dist=4.7;camera.data.ortho_scale=2.00
        camera.location=(math.sin(angle)*dist,-math.cos(angle)*dist,1.30)
        bpy.context.scene.render.resolution_x=720;bpy.context.scene.render.resolution_y=960
    aim(camera,target)


def render(name,kind='portrait',angle=0,values=None):
    set_values(values or {});camera_view(kind,angle)
    bpy.context.scene.render.filepath=str(DOC/(name+'.png'))
    bpy.ops.render.render(write_still=True)


def export_assets():
    set_values({})
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        if obj.type=='MESH' and not obj.name.startswith('STUDIO'): obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/'original-human-prototype.glb'),export_format='GLB',use_selection=True,
        export_animations=False,export_morph=True,export_morph_normal=False,export_morph_tangent=False,
        export_cameras=False,export_lights=False,export_yup=True,export_extras=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'original-human-prototype.blend'),compress=True)


def build():
    global SKIN
    bpy.ops.wm.read_factory_settings(use_empty=True)
    SKIN=material('Skin | original warm umber',(.245,.116,.064),.47)
    skin_node=SKIN.node_tree.nodes.get('Principled BSDF')
    skin_node.inputs['Subsurface Weight'].default_value=.035
    lips=material('Lips | muted warm brown',(.190,.068,.049),.43)
    white=material('Sclera | warm ivory',(.37,.35,.30),.29)
    iris=material('Iris | brown',(.054,.028,.010),.3)
    dark=material('Pupil and oral recess',(.008,.004,.003),.4)
    hair=material('Hair | dark close curls',(.006,.003,.002),.82)
    hair.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.18
    shirt=material('Shirt | woven petrol blue',(.038,.118,.135),.79)
    pants=material('Trousers | warm charcoal',(.046,.052,.058),.82)
    shoe=material('Footwear | brown leather',(.094,.045,.023),.43)
    sole=material('Sole | muted stone',(.20,.18,.15),.78)
    make_body(shirt,pants,shoe,sole)
    make_head();make_eyes(white,iris,dark,hair);make_mouth(lips,dark)
    make_ear(1);make_ear(-1);make_hair(hair)
    cleanup_geometry();add_uvs();add_controls();stage();camera_view('full',.12)
    export_assets()


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--mode',choices=['first','views','export'],default='first')
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    OUT.mkdir(parents=True,exist_ok=True);DOC.mkdir(parents=True,exist_ok=True)
    build()
    if args.mode=='first': render('first-neutral-portrait','portrait',.12)
    elif args.mode=='views':
        render('neutral-front','portrait',0)
        render('neutral-three-quarter','portrait',.60)
        render('neutral-full-body','full',.10)
    print('PROTOTYPE_OUTPUT',str(OUT),str(DOC),flush=True)
