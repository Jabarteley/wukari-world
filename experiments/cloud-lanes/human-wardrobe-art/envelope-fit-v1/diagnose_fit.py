"""Reopen derivative, verify frozen human topology/UV/morphs and locate residual fit faults."""
import bpy,json,hashlib,ast
from pathlib import Path
from collections import Counter
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
H=Path(__file__).resolve().parent;LANE=H.parent
# Import only two pure helper definitions; do not rerun fitting/export/render work.
parsed=ast.parse((H/'fit_envelope.py').read_text())
for node in parsed.body:
 if isinstance(node,ast.FunctionDef) and node.name in ['data_for','segment_hit']:
  exec(compile(ast.Module(body=[node],type_ignores=[]),str(H/'fit_envelope.py'),'exec'))
game=LANE/'game-resolution-v1/artifacts/everyday-01-game-v1-editable.blend';fitted=H/'artifacts/everyday-01-envelope-v1-editable.blend'
bpy.ops.wm.open_mainfile(filepath=str(game));reference={o.name:np.array([tuple(v.co) for v in o.data.vertices]) for o in bpy.data.collections['GAME_v1_EDITABLE_PIECES_STATIC_UNBOUND'].objects}
bpy.ops.wm.open_mainfile(filepath=str(fitted))
body=list(bpy.data.collections['PINNED_HUMAN_3ee5882_CLOTHED_ENVELOPE_NOT_OWNED'].objects);pieces=list(bpy.data.collections['GAME_v1_EDITABLE_PIECES_STATIC_UNBOUND'].objects)
expected={r['name']:r for r in json.loads((LANE/'runs/frozen-human-3ee5882/geometry-checks.json').read_text())['meshes']}
def sha(a):return hashlib.sha256(a.tobytes()).hexdigest()
verified=[]
for o in body:
 r=expected[o.name];o.data.calc_loop_triangles();points=np.array([tuple(v.co) for v in o.data.vertices],dtype='<f8');tri=np.array([tuple(t.vertices) for t in o.data.loop_triangles],dtype='<u4');uv=np.array([tuple(v.uv) for v in o.data.uv_layers.active.data],dtype='<f8')
 assert sha(points)==r['positionSha256'],o.name
 assert sha(tri)==r['triangleOrderSha256'],o.name
 assert sha(uv)==r['uvSha256'],o.name
 for name,row in r['morphs'].items():
  d=np.array([tuple(v.co) for v in o.data.shape_keys.key_blocks[name].data],dtype='<f8')-points
  assert sha(d)==row['sha256'],(o.name,name)
 verified.append({'name':o.name,'positionSha256':sha(points),'triangleOrderSha256':sha(tri),'uvSha256':sha(uv),'verifiedMorphTargets':len(r['morphs'])})
bp,bt,bn=data_for(body);gp,gt,gn=data_for(pieces);bTree=BVHTree.FromPolygons(bp,bt,all_triangles=True);gTree=BVHTree.FromPolygons(gp,gt,all_triangles=True);pa=np.array(gp);ba=np.array(bp);pairs=[]
for gi,bi in gTree.overlap(bTree):
 a=pa[list(gt[gi])];b=ba[list(bt[bi])]
 if any(segment_hit(a[k],a[(k+1)%3],*b) for k in range(3)) or any(segment_hit(b[k],b[(k+1)%3],*a) for k in range(3)):pairs.append((gi,bi))
areas=np.linalg.norm(np.cross(pa[np.array(gt)[:,1]]-pa[np.array(gt)[:,0]],pa[np.array(gt)[:,2]]-pa[np.array(gt)[:,0]]),axis=1)/2
bad=[{'triangle':int(i),'piece':gn[i],'area':float(areas[i]),'positions':pa[list(gt[i])].tolist()} for i in np.flatnonzero(areas<1e-12)]
negative=Counter();edgeScales={};morphScales={}
for o in pieces:
 me=o.data;basis=np.array([tuple(v.co) for v in me.vertices]);indices=np.array([tuple(e.vertices) for e in me.edges]);old=reference[o.name]
 if len(old)!=len(basis):
  edgeScales[o.name]={'topologyChanged':True,'reason':'Explicit triangular armpit fan; source edge correspondence not claimed'};continue
 oldLen=np.linalg.norm(old[indices[:,1]]-old[indices[:,0]],axis=1);newLen=np.linalg.norm(basis[indices[:,1]]-basis[indices[:,0]],axis=1)
 ratios=newLen[oldLen>1e-9]/oldLen[oldLen>1e-9];edgeScales[o.name]={'kind':o.get('detail_kind'),'min':float(ratios.min()),'median':float(np.median(ratios)),'max':float(ratios.max())}
 for v in me.vertices:
  q,n,i,d=bTree.find_nearest(v.co)
  if (v.co-q).dot(n)<-.0001:negative[o.name]+=1
 for h,s in [(-1,-1),(-1,1),(1,-1),(1,1)]:
  keys=me.shape_keys.key_blocks;p=basis.copy()
  for name,val in [('body.height',h),('body.shoulderWidth',s)]:p+=(np.array([tuple(v.co) for v in keys[name].data])-basis)*val
  lengths=np.linalg.norm(p[indices[:,1]]-p[indices[:,0]],axis=1);rs=lengths[newLen>1e-9]/newLen[newLen>1e-9];morphScales.setdefault(f'{h:+d}/{s:+d}',[]).extend(rs.tolist())
r={'status':'PASS_SOURCE_PRESERVATION','verifiedBodyMeshes':verified,'bodyMeshes':len(verified),'sourceHumanCommit':'3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a','nearZeroTriangles':bad,'neutralCrossingPairs':len(pairs),'neutralCrossingsByGarmentPiece':dict(Counter(gn[g] for g,b in pairs)),'neutralCrossingsByBodyMesh':dict(Counter(bn[b] for g,b in pairs)),'negativeVertexSamplesByGarmentPiece':dict(negative),'restRetargetEdgeLengthRatios':edgeScales,'morphEndpointEdgeLengthRatios':{k:{'min':min(v),'median':float(np.median(v)),'max':max(v)} for k,v in morphScales.items()},'strainCaveat':'Geometric edge ratios only, not fabric strain/cloth simulation. Rest retarget changes design dimensions; endpoint ratios describe authored shape-key geometry.','sourceBytes':fitted.stat().st_size,'sourceSha256':hashlib.sha256(fitted.read_bytes()).hexdigest(),'garmentEditablePieces':len(pieces),'garmentMorphs':['body.height','body.shoulderWidth'],'armatures':sum(o.type=='ARMATURE' for o in bpy.data.objects),'finalFitAccepted':False}
(H/'receipts/fit-diagnosis.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items() if k not in ['verifiedBodyMeshes','restRetargetEdgeLengthRatios']},indent=2))
