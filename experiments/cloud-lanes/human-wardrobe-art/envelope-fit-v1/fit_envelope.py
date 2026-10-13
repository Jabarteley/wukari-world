"""Own derivative against exact clothed human envelope. No producer master edits.
No rig or naked body is provided; this never establishes final wearable fit.
"""
import bpy,bmesh,math,json,hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
import numpy as np
H=Path(__file__).resolve().parent;LANE=H.parent;OUT=H/'artifacts'
BODY=LANE/'runs/frozen-human-3ee5882/original-human-prototype.blend'
GAME=LANE/'game-resolution-v1/artifacts/everyday-01-game-v1-editable.blend'
assert hashlib.sha256(BODY.read_bytes()).hexdigest()=='36018022ff64367e7426069d7417625a3591f3a2c0684c628c11c3bd908f84d9'
bpy.ops.wm.open_mainfile(filepath=str(GAME));bpy.context.preferences.filepaths.save_version=0
pieces=list(bpy.data.collections['GAME_v1_EDITABLE_PIECES_STATIC_UNBOUND'].objects)
for o in list(bpy.data.collections['90_ORIGINAL_TAILORING_FORM_NOT_HUMAN_MASTER'].objects):bpy.data.objects.remove(o,do_unlink=True)
bpy.data.collections.remove(bpy.data.collections['90_ORIGINAL_TAILORING_FORM_NOT_HUMAN_MASTER'])
bodyCollection=bpy.data.collections.new('PINNED_HUMAN_3ee5882_CLOTHED_ENVELOPE_NOT_OWNED');bpy.context.scene.collection.children.link(bodyCollection)
bodyNames={r['name'] for r in json.loads((BODY.parent/'geometry-checks.json').read_text())['meshes']}
with bpy.data.libraries.load(str(BODY),link=False) as (data_from,data_to):data_to.objects=[n for n in data_from.objects if n in bodyNames]
body=[]
for o in data_to.objects:
 if o and o.type=='MESH':
  bodyCollection.objects.link(o);body.append(o);o['upstream_commit']='3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a'
 elif o:bpy.data.objects.remove(o,do_unlink=True)
assert len(body)==31
for o in body:
 if o.data.shape_keys:
  for k in o.data.shape_keys.key_blocks:k.value=0

def data_for(objects,state={}):
 vv=[];ff=[];owners=[]
 for ob in objects:
  keys=ob.data.shape_keys.key_blocks if ob.data.shape_keys else None
  pts=[v.co.copy() for v in keys[0].data] if keys else [v.co.copy() for v in ob.data.vertices]
  if keys:
   for name,value in state.items():
    key=keys.get(name)
    if key and value:
     for i,p in enumerate(pts):p+=(key.data[i].co-keys[0].data[i].co)*value
  offset=len(vv);vv.extend(pts);ob.data.calc_loop_triangles()
  for t in ob.data.loop_triangles:ff.append(tuple(offset+i for i in t.vertices));owners.append(ob.name)
 return vv,ff,owners
bv,bf,bo=data_for(body);bodyTree=BVHTree.FromPolygons(bv,bf,all_triangles=True)

def warp(v,name):
 x,y,z=v
 if name.startswith('GAME_Trous') or name.startswith('GAME_Trouser'):
  t=max(0,min(1,(z-.78)/.12));s=1 if x>=0 else -1
  x=(s*.090+(x-s*.104)*.72)*(1-t)+(x*.78)*t
  return Vector((x,y*.78+.014,.111+(z-.125)*1.015))
 if '_sleeve' in name or '_cuff_facing' in name:
  s=1 if x>=0 else -1;dx=abs(x)-.216;dz=z-1.405
  along=dx*.5665-dz*.8240;radial=dx*.8240+dz*.5665
  return Vector((s*(.20+along*.93*.285+radial*.9*.958),y*.9+.012,1.343-along*.93*.958+radial*.9*.285))
 return Vector((x*.83,y*.82+.013,1.000+(z-.965)*(.443/.555)))

moved=0;maxCorrection=0
for ob in pieces:
 rest=[v.co.copy() for v in ob.data.vertices]
 ob['fit_status']='CLOTHED_ENVELOPE_OVERLAY_NOT_FINAL_BODY_FIT'
 for v in ob.data.vertices:
  p=warp(v.co,ob.name)
  name=ob.name
  # Recut the sleeve cap and matching armhole; the source fixture had different arm axes.
  if name.endswith('_sleeve') or name.endswith('_cuff_facing'):
   i=v.index%16;j=v.index//16;t=j/4 if name.endswith('_sleeve') else .88+.12*j
   th=i*math.tau/16;side=-1 if '_R_' in name else 1
   p=Vector((side*(.185+.068*t+(.012+.050*t)*math.cos(th)),.012+(.100-.031*t)*math.sin(th),1.31-.142*t+(.105-.085*t)*math.cos(th)))
  elif name.startswith('GAME_Shirt_') and name.endswith('_panel'):
   u=(v.index%7)/6;rows=[0,.10,.23,.39,.55,.70,.80,.94,1];vv=rows[v.index//7]
   side=-1 if '_R_' in name else 1;back='_back_' in name
   if vv>=.70:
    cc=-1+2*(vv-.70)/.30;edge=Vector((side*(.185+.012*cc),.012+(1 if back else -1)*.100*math.sqrt(max(0,1-cc*cc)),1.31+.105*cc))
   else:edge=Vector((side*(.196-(.196-.173)*(vv/.70)),p.y,1.0+.205*vv/.70))
   # Only the side boundary is recut; the central placket/neckline keeps its source form.
   originalEdge=warp(rest[(v.index//7)*7+6],name)
   p+=(edge-originalEdge)*u**4
  elif name.endswith('_side_gusset'):
   u=(v.index%3)/2;t=(v.index//3)/6;side=-1 if '_R_' in name else 1
   p=Vector((side*(.196-(.196-.173)*t),.013+(p.y-.013)*(1-t**3),1.0+.205*t))
  # Front/back trouser panels use a directional envelope query around the concave rise,
  # where a nearest normal can point into the opposite leg. Preserve 12mm frontal ease.
  if name.startswith('GAME_Trousers_') and name.endswith('_panel'):
   front='_front_' in name;start=Vector((p.x,-.7 if front else .7,p.z));direction=Vector((0,1 if front else -1,0))
   hit,hn,hi,hd=bodyTree.ray_cast(start,direction,1.4)
   if hit:
    p.y=min(p.y,hit.y-.012) if front else max(p.y,hit.y+.012)
  q,n,ix,dist=bodyTree.find_nearest(p)
  signed=(p-q).dot(n)
  # Only local penetrations/near contacts; never shrink remote loose cloth onto body.
  if signed<.007 and dist<.07:
   d=n*min(.018,.009-signed);p+=d;moved+=1;maxCorrection=max(maxCorrection,d.length)
  v.co=p
 ob.data.update()
# Edge returns around the cuff follow the recut cap, instead of retaining the fixture arm angle.
for ob in pieces:
 if '_cuff_facing_edge_return_' not in ob.name:continue
 parentName=ob.name.split('_edge_return_')[0];parent=bpy.data.objects.get(parentName)
 which=int(ob.name.rsplit('_',1)[1]);offset=0 if which==0 else 16
 for i in range(16):
  point=parent.data.vertices[offset+i].co;normal=Vector((point.x-math.copysign(.253,point.x),point.y-.012,.01)).normalized()
  ob.data.vertices[2*i].co=point;ob.data.vertices[2*i+1].co=point-normal*.002
 ob.data.update()
# The recut gusset ends at one armpit apex. Replace its two collapsed quads
# with a proper triangular fan by merging only the three known coincident tip vertices.
# This is an explicit local topology repair, not whole-mesh decimation.
for ob in pieces:
 if not ob.name.endswith('_side_gusset'):continue
 bm=bmesh.new();bm.from_mesh(ob.data);bm.verts.ensure_lookup_table()
 tip=list(bm.verts)[-3:]
 assert max((a.co-b.co).length for a in tip for b in tip)<1e-8
 bmesh.ops.remove_doubles(bm,verts=tip,dist=1e-8);bm.to_mesh(ob.data);bm.free();ob.data.update()
# Repair sparse triangle-centre penetrations by bounded normal pushes of their vertices.
repairs=[]
for iteration in range(3):
 count=0;worst=0
 for ob in pieces:
  if ob.get('detail_kind')!='surface':continue
  me=ob.data;me.calc_loop_triangles();push={}
  for tri in me.loop_triangles:
   center=sum((me.vertices[i].co for i in tri.vertices),Vector())/3
   q,n,ix,dist=bodyTree.find_nearest(center);signed=(center-q).dot(n)
   if signed<.002 and dist<.05:
    correction=min(.012,.005-signed);count+=1;worst=max(worst,correction)
    for i in tri.vertices:
     if i not in push or push[i].length<correction:push[i]=n*correction
  for i,d in push.items():me.vertices[i].co+=d
  me.update()
 repairs.append({'iteration':iteration,'triangleCentersCorrected':count,'maxPushMetres':worst})
 if not count:break

# Targeted clearance on the three diagnosed regions. Bounded four passes, <=8mm
# per vertex per pass; includes edge midpoints missed by centre-only sampling.
edgeRepairs=[]
for iteration in range(4):
 corrected=0;worst=0
 for ob in pieces:
  if not (ob.name.endswith('_camp_collar') or ob.name.endswith('_sleeve') or (ob.name.startswith('GAME_Shirt_') and ob.name.endswith('_front_panel'))):continue
  me=ob.data;me.calc_loop_triangles();push={}
  for tri in me.loop_triangles:
   pts=[me.vertices[i].co for i in tri.vertices]
   probes=pts+[(pts[i]+pts[(i+1)%3])*.5 for i in range(3)]+[sum(pts,Vector())/3]
   for probe in probes:
    q,n,ix,dist=bodyTree.find_nearest(probe);signed=(probe-q).dot(n)
    if signed<.006 and dist<.04:
     amount=min(.008,.007-signed);corrected+=1;worst=max(worst,amount)
     for index in tri.vertices:
      if index not in push or push[index].length<amount:push[index]=n*amount
  for i,d in push.items():me.vertices[i].co+=d
  me.update()
 edgeRepairs.append({'iteration':iteration,'sampleCorrections':corrected,'maxVertexPushM':worst})
 if not corrected:break
# Parent-following collar edge returns preserve 2mm thickness after moving collar faces.
for ob in pieces:
 if '_camp_collar_edge_return_' not in ob.name:continue
 parent=bpy.data.objects.get(ob.name.split('_edge_return_')[0]);which=int(ob.name.rsplit('_',1)[1]);cols=11;V=2
 ids=[list(range(cols)),[j*cols+cols-1 for j in range(V+1)],list(range(V*cols,(V+1)*cols))[::-1],[j*cols for j in range(V+1)][::-1]][which]
 for k,index in enumerate(ids):
  v=parent.data.vertices[index];ob.data.vertices[k*2].co=v.co;ob.data.vertices[k*2+1].co=v.co-Vector((0,0,.002))
 ob.data.update()

def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def shoulder(p):
 x,y,z=p
 if not .77<z<1.455:return 0
 w=smooth(.04,.18,abs(x))*(1-smooth(1.37,1.455,z))*smooth(.78,1.03,z)
 return math.copysign(.026*w,x)
for ob in pieces:
 basis=ob.shape_key_add(name='Basis')
 for name in ['body.height','body.shoulderWidth']:
  k=ob.shape_key_add(name=name);k.slider_min=-1;k.slider_max=1
  for i,v in enumerate(basis.data):
   p=v.co.copy()
   if name=='body.height':p.z+=(p.z-.010)*.05
   else:p.x+=shoulder(p)
   k.data[i].co=p
 ob['morph_mapping']='Exact producer analytic height/shoulder field, evaluated at garment rest positions; no skeleton/bind matrix'

# Edge-against-triangle narrow phase. Coplanar near-contact is reported separately,
# not counted as proof of nonintersection. These are sampled surface tests only.
def segment_hit(p0,p1,a,b,c):
 d=p1-p0;e1=b-a;e2=c-a;h=np.cross(d,e2);det=np.dot(e1,h)
 if abs(det)<1e-12:return False
 inv=1/det;s=p0-a;u=inv*np.dot(s,h)
 if u < -1e-7 or u>1+1e-7:return False
 q=np.cross(s,e1);v=inv*np.dot(d,q)
 if v< -1e-7 or u+v>1+1e-7:return False
 t=inv*np.dot(e2,q);return -1e-7<=t<=1+1e-7

def inspect(state,label):
 bp,bt,bnames=data_for(body,state);gp,gt,gnames=data_for(pieces,state)
 tb=BVHTree.FromPolygons(bp,bt,all_triangles=True);tg=BVHTree.FromPolygons(gp,gt,all_triangles=True)
 candidates=tg.overlap(tb);bpa=np.array(bp);gpa=np.array(gp);crossings=[];coplanar=0
 for gi,bi in candidates:
  a=gpa[list(gt[gi])];b=bpa[list(bt[bi])]
  hit=any(segment_hit(a[k],a[(k+1)%3],*b) for k in range(3)) or any(segment_hit(b[k],b[(k+1)%3],*a) for k in range(3))
  if hit:crossings.append((gi,bi))
  else:coplanar+=1
 probes=gp+[sum((gp[i] for i in t),Vector())/3 for t in gt]
 signed=[];inside=0
 for p in probes:
  q,n,ix,dist=tb.find_nearest(p);d=(p-q).dot(n);signed.append(d)
  if d<-.0001:inside+=1
 neutral=np.array(data_for(pieces)[0])[np.array(gt)];baseNormals=np.cross(neutral[:,1]-neutral[:,0],neutral[:,2]-neutral[:,0]);tris=gpa[np.array(gt)];normals=np.cross(tris[:,1]-tris[:,0],tris[:,2]-tris[:,0]);reversedCount=int((np.einsum('ij,ij->i',normals,baseNormals)<0).sum());areas=np.linalg.norm(np.cross(tris[:,1]-tris[:,0],tris[:,2]-tris[:,0]),axis=1)/2
 return {'label':label,'controls':state,'candidateTrianglePairs':len(candidates),'confirmedCrossingPairs':len(crossings),'crossingGarmentTriangles':len(set(x[0] for x in crossings)),'nonCrossingCandidatePairs':coplanar,'sampledVerticesAndCentroids':len(probes),'negativeNearestNormalSamplesOver0_1mm':inside,'minimumSignedNearestNormalMetres':min(signed),'minimumTriangleAreaM2':float(areas.min()),'nearZeroTriangleCount':int((areas<1e-12).sum()),'reversedTriangleCount':reversedCount,'witnesses':[{'garmentTriangle':g,'garmentPiece':gnames[g],'bodyTriangle':b,'bodyMesh':bnames[b]} for g,b in crossings[:12]]}
controls=['nose.projection','nose.alarWidth','earLeft.protrusion','earRight.protrusion','body.height','body.shoulderWidth']
states=[('neutral',{})]+[(c+(' min' if v<0 else ' max'),{c:v}) for c in controls for v in [-1,1]]+[(f'height{h:+d} shoulder{s:+d}',{'body.height':h,'body.shoulderWidth':s}) for h in [-1,1] for s in [-1,1]]
checks=[]
for name,state in states:
 r=inspect(state,name);checks.append(r);print('FIT_SAMPLE',name,r['confirmedCrossingPairs'],r['negativeNearestNormalSamplesOver0_1mm'],flush=True)
report={'status':'FAIL_GEOMETRY' if any(r['nearZeroTriangleCount'] for r in checks) else ('FAIL_INTERSECTIONS' if any(r['confirmedCrossingPairs'] for r in checks) else 'SAMPLED_NO_CROSSINGS'),'humanCommit':'3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a','bodyInputSha256':hashlib.sha256(BODY.read_bytes()).hexdigest(),'gameInputSha256':hashlib.sha256(GAME.read_bytes()).hexdigest(),'bodySurface':'Clothed torso/leg envelope; no independent naked torso/legs','garmentTriangles':sum(len(o.data.loop_triangles) for o in pieces),'topologyRepair':'Two coincident armpit tips replaced by triangular fans; four zero-area triangles eliminated','morphTargets':2,'skinBindings':0,'initialCorrectedVertices':moved,'maximumInitialCorrectionM':maxCorrection,'boundedCenterRepairs':repairs,'boundedEdgeRepairs':edgeRepairs,'cases':checks,'measurementCaveats':['Sampled discrete states, not continuous intersection proof','Negative nearest-normal distance is a local diagnostic, not a global inside/outside certificate for intersecting closed body components','Narrow phase checks noncoplanar segment crossings; unresolved coplanar candidates are separately counted','No rig, arm bend, knee bend, locomotion or undressed-body fit','No body masking performed'],'finalWearableFitAccepted':False}
(H/'receipts/fit-checks.json').write_text(json.dumps(report,indent=2)+'\n')
scene=bpy.context.scene;scene['fit_status']='Pinned clothed envelope overlay; not final wearable fit';scene['frozen_human_commit']=report['humanCommit']
# Remove only orphan local data; keep producer geometry as a separate collection in derivative source.
for db in [bpy.data.meshes,bpy.data.curves,bpy.data.materials,bpy.data.images]:
 for item in list(db):
  if item.users==0:db.remove(item)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'everyday-01-envelope-v1-editable.blend'),compress=True)
# Join disposable garment copies. Keys are shared names; actual static morph targets export.
bpy.ops.object.select_all(action='DESELECT');copies=[]
for o in pieces:
 d=o.copy();d.data=o.data.copy();bpy.context.scene.collection.objects.link(d);copies.append(d);d.select_set(True)
bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.join();joined=bpy.context.object;joined.name='ENVELOPE_everyday_01_unrigged'
bpy.ops.export_scene.gltf(filepath=str(OUT/'everyday-01-envelope-v1.glb'),export_format='GLB',use_selection=True,export_apply=False,export_yup=True,export_materials='EXPORT',export_extras=True,export_animations=False,export_morph=True,export_morph_normal=False,export_morph_tangent=False,export_tangents=True,export_cameras=False,export_lights=False)
print('ENVELOPE_EXPORT_COMPLETE')
