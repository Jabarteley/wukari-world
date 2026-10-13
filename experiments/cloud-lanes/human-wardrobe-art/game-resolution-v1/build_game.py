"""Selective surface resampling from frozen original cages; no decimate/collapse.
Preserves high-detail source. Game derivative: <=3000 tris / one draw / no textures.
"""
import bpy,math,json,hashlib
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;LANE=HERE.parent;OUT=HERE/'artifacts'
SOURCE=LANE/'artifacts/everyday-01-tailoring-form.blend'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()=='25e1ba8e8c9b9cd271d86c4dfb229a0533eee1a192e1ba587a2dc5b3519eeecf'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE));bpy.context.preferences.filepaths.save_version=0
c=bpy.data.collections.new('GAME_v1_EDITABLE_PIECES_STATIC_UNBOUND');bpy.context.scene.collection.children.link(c)
baked=json.loads((HERE/'material-bake.json').read_text())['linearFabricColours']
material=bpy.data.materials.new('GAME_one_vertex_colour_material_rough086');material.use_nodes=True
p=material.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.86;p.inputs['Metallic'].default_value=0
attr=material.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='Color';material.node_tree.links.new(attr.outputs['Color'],p.inputs['Base Color'])
material.use_backface_culling=False
pieces=[];mapping=[];omissions=[]
def color(source):
 m=source.data.materials[0];return baked.get(m.name,list(m.diffuse_color[:3]))
def mesh(name,verts,faces,col,kind='surface',source=None):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
 if kind=='surface' and sum(poly.normal.dot(Vector((poly.center.x,poly.center.y,0))) for poly in me.polygons)<0:
  for poly in me.polygons:poly.flip()
  me.update()
 ob=bpy.data.objects.new(name,me);c.objects.link(ob);me.materials.append(material)
 ca=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
 for v in ca.data:v.color=(*col,1)
 for poly in me.polygons:poly.use_smooth=True
 ob['detail_kind']=kind;ob['fit_status']='STATIC_TAILORING_FORM_ONLY_UNBOUND';ob['source_mesh']=source or name
 pieces.append(ob);me.calc_loop_triangles();mapping.append({'piece':name,'source':source,'kind':kind,'vertices':len(me.vertices),'triangles':len(me.loop_triangles)})
 return ob

def sample(source,nu,nv,u,v,closed=False):
 cols=nu if closed else nu+1
 x=u*nu;y=v*nv;ix=int(math.floor(x));iy=min(nv-1,int(math.floor(y)));sx=x-ix;sy=y-iy
 if not closed:ix=min(nu-1,ix);sx=x-ix
 def vert(i,j):return source.data.vertices[j*cols+(i%nu if closed else i)].co
 return (vert(ix,iy)*(1-sx)+vert(ix+1,iy)*sx)*(1-sy)+(vert(ix,iy+1)*(1-sx)+vert(ix+1,iy+1)*sx)*sy

def patch(source,nu,nv,U,V,closed=False,rim=False):
 us=[i/U for i in range(U+(not closed))]
 # More rows at knee/crotch and upper shirt opening, preserving those silhouette changes.
 vs=[i/V for i in range(V+1)]
 if '_panel' in source.name and source.name.startswith('Trousers'):vs=[0,.05,.14,.27,.36,.43,.50,.57,.66,.73,.82,.89,1]
 if '_panel' in source.name and source.name.startswith('Shirt'):vs=[0,.10,.23,.39,.55,.70,.80,.94,1]
 V=len(vs)-1;cols=len(us)
 verts=[tuple(sample(source,nu,nv,u,v,closed)) for v in vs for u in us]
 faces=[]
 for j in range(V):
  for i in range(U):
   n=(i+1)%cols;faces.append((j*cols+i,j*cols+n,(j+1)*cols+n,(j+1)*cols+i))
 ob=mesh('GAME_'+source.name,verts,faces,color(source),'surface',source.name)
 # Thickness only at visible openings: inward 2mm edge returns, no duplicated full shell.
 if rim:
  me=ob.data;me.update()
  edgeids=[]
  if closed:edgeids=[list(range(cols)),list(range(V*cols,(V+1)*cols))]
  else:edgeids=[list(range(cols)),[j*cols+cols-1 for j in range(V+1)],list(range(V*cols,(V+1)*cols))[::-1],[j*cols for j in range(V+1)][::-1]]
  for ri,ids in enumerate(edgeids):
   rv=[];rf=[]
   for idx in ids:
    pt=me.vertices[idx].co;n=me.vertices[idx].normal
    rv.extend([tuple(pt),tuple(pt-n*.002)])
   steps=len(ids) if closed else len(ids)-1
   for k in range(steps):a=k*2;b=((k+1)%len(ids))*2;rf.append((a,b,b+1,a+1))
   mesh(ob.name+'_edge_return_'+str(ri),rv,rf,[v*.72 for v in color(source)],'edge-return',source.name)
 return ob

sourceObjects=list(bpy.data.collections['01_OVERSHIRT_editable_panels'].objects)+list(bpy.data.collections['02_TROUSERS_editable_panels'].objects)
for o in sourceObjects:
 n=o.name
 if o.type!='MESH':continue
 if n.startswith('Shirt_') and n.endswith('_panel'):patch(o,18,24,6,8)
 elif n.startswith('Trousers_') and n.endswith('_panel'):patch(o,20,36,6,12)
 elif n.endswith('_shoulder_separate_piece'):patch(o,18,6,6,2)
 elif n.endswith('_side_gusset'):patch(o,4,18,2,6)
 elif n.endswith('_sleeve'):patch(o,32,12,16,4,True)
 elif n.endswith('_cuff_facing'):patch(o,32,3,16,1,True,rim=True)
 elif n.endswith('_camp_collar'):patch(o,24,6,10,2,rim=True)
 elif n.endswith('_open_patch_pocket'):patch(o,10,10,4,4)
 elif n.endswith('_pocket_folded_lip'):patch(o,10,2,4,1)
 elif n.endswith('_placket'):patch(o,4,24,1,8)
 elif n.endswith('_turned_hem'):patch(o,48,3,16,1,True,rim=True)
 elif n.endswith('_back_welt'):patch(o,10,2,3,1)
 elif 'continuous_waistband' in n:patch(o,56,3,20,1,True)
 elif 'belt_loop' in n:omissions.append({'name':n,'reason':'Hidden under untucked shirt; removable source detail'})
 elif n.endswith('_fly_facing'):omissions.append({'name':n,'reason':'Concealed fly removed; frontal placket readability retained on shirt'})
 elif n.startswith('Shirt_button_'):
  # 8-sided disc only, at the actual frozen button transform.
  center=o.matrix_world.translation.copy();center.y-=.002
  vv=[tuple(center)]+[tuple(center+Vector((.006*math.cos(i*math.tau/8),0,.006*math.sin(i*math.tau/8)))) for i in range(8)]
  mesh('GAME_'+n,vv,[(0,i+1,(i+1)%8+1) for i in range(8)],color(o),'button-disc',n)
 else:raise RuntimeError('Unclassified source mesh '+n)

# Retain silhouette-relevant seam cues as sparse triangle ribbons, deliberately authored
# narrow details, not collapsed triangles. Fine thread loops/double rows are omitted.
for o in sourceObjects:
 if o.type!='CURVE':continue
 n=o.name;segments=0
 if n.startswith('Placket_') and n.endswith('0.9'):segments=8
 elif n.startswith('Pocket_') and ('side_stitch' in n or n.endswith('0.045')):segments=4
 elif n.endswith('_shoulder_topstitch'):segments=6
 elif n.endswith('_gusset_hem'):segments=2
 elif n.startswith('Shirt_') and '_double_hem_0.01' in n:segments=6
 elif n.endswith('_outseam'):segments=12
 elif n.endswith('_slant_pocket_welt'):segments=6
 elif n.endswith('_back_welt_stitch'):segments=3
 # Cuff/hem boundary and folded lip geometry provide other seam cues at game scale.
 if not segments:omissions.append({'name':n,'reason':'Subpixel piping/thread or duplicate seam row omitted'});continue
 pts=[Vector(p.co[:3]) for p in o.data.splines[0].points]
 def point(t):x=t*(len(pts)-1);i=min(len(pts)-2,int(x));return pts[i].lerp(pts[i+1],x-i)
 sampled=[point(i/segments) for i in range(segments+1)];vv=[];ff=[]
 for i,pt in enumerate(sampled):
  tangent=(sampled[min(i+1,segments)]-sampled[max(0,i-1)]).normalized()
  normal=Vector((pt.x,pt.y,0)).normalized()
  width=tangent.cross(normal).normalized()*.00085
  offset=normal*.0015
  vv.extend([tuple(pt+offset-width),tuple(pt+offset+width)])
 for i in range(segments):ff.append((i*2,i*2+1,i*2+3,i*2+2))
 mesh('GAME_'+n,vv,ff,color(o),'intentional-seam-ribbon',n)

tri=sum(row['triangles'] for row in mapping);print('GAME_TRIANGLES',tri)
assert tri<=3000,tri
# Keep separate source meshes in .blend; export one joined mesh/material only.
for o in sourceObjects:bpy.data.objects.remove(o,do_unlink=True)
for name in ['01_OVERSHIRT_editable_panels','02_TROUSERS_editable_panels']:
 bpy.data.collections.remove(bpy.data.collections[name])
scene=bpy.context.scene;scene['version']='game-resolution-v1';scene['fit_status']='STATIC_UNBOUND; no producer mesh or rig'
scene['source_sha256']=hashlib.sha256(SOURCE.read_bytes()).hexdigest();scene['triangle_budget']=3000
# The derivative source has no residual image dependency/materials. Fixture remains separate.
for db in [bpy.data.meshes,bpy.data.curves]:
 for item in list(db):
  if item.users==0:db.remove(item)
for m in list(bpy.data.materials):
 if m.users==0:bpy.data.materials.remove(m)
for im in list(bpy.data.images):
 if im.users==0:bpy.data.images.remove(im)
bpy.ops.object.select_all(action='DESELECT')
for o in pieces:o.select_set(True)
bpy.context.view_layer.objects.active=pieces[0]
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'everyday-01-game-v1-editable.blend'),compress=True)
# Duplicate before joining to avoid destroying editable derivative pieces.
copies=[]
for o in pieces:
 d=o.copy();d.data=o.data.copy();c.objects.link(d);copies.append(d)
bpy.ops.object.select_all(action='DESELECT')
for o in copies:o.select_set(True)
bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.join();joined=bpy.context.object;joined.name='GAME_everyday_01_static_unbound'
# POINT colours keep a single common glTF primitive. No UV/normal maps => no tangent requirement.
assert len(joined.data.materials)==1
bpy.ops.export_scene.gltf(filepath=str(OUT/'everyday-01-game-v1.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_materials='EXPORT',export_extras=True,export_animations=False,export_cameras=False,export_lights=False,export_tangents=True)
(OUT/'build-measurements.json').write_text(json.dumps({'sourceBlendSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'method':'Resampled original structured control surfaces; no decimation or collapse','garmentTriangles':tri,'sourcePieces':mapping,'omittedDetails':omissions,'textures':0,'materials':1,'drawPrimitives':1,'skins':0,'gameFitAccepted':False},indent=2)+'\n')
print('GAME_EXPORT_COMPLETE')
