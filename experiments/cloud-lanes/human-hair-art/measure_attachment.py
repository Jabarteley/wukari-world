"""Read actual saved source topology, propose v1 surface bindings, measure fixture clearance.
These measurements DO NOT substitute for missing human master/rig/endpoint evidence.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

LANE=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
p=argparse.ArgumentParser();p.add_argument('--out',required=True)
args=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(args.out).resolve();assert LANE in out.parents
head=bpy.data.objects['TEMPORARY calibration head - actual fit pending master']
m=head.data;m.calc_loop_triangles()
verts=[list(v.co) for v in m.vertices];triangles=[list(t.vertices) for t in m.loop_triangles]
topologyBytes=json.dumps(triangles,separators=(',',':')).encode()
vertexBytes=json.dumps(verts,separators=(',',':')).encode()
bvh=BVHTree.FromPolygons(verts,triangles,all_triangles=True)

def bary(p,a,b,c):
    v0=b-a;v1=c-a;v2=p-a
    d00=v0.dot(v0);d01=v0.dot(v1);d11=v1.dot(v1);d20=v2.dot(v0);d21=v2.dot(v1)
    den=d00*d11-d01*d01;v=(d11*d20-d01*d21)/den;w=(d00*d21-d01*d20)/den
    return [1-v-w,v,w]

anchors=[]
for name,point in [('scalp.crown',(0,0,1.775)),('scalp.templeLeft',(.080,-.01,1.680)),('scalp.templeRight',(-.080,-.01,1.680))]:
    loc,n,idx,dist=bvh.find_nearest(Vector(point))
    a,b,c=[Vector(verts[i]) for i in triangles[idx]]
    anchors.append(dict(anchorId=name,joint='Head',jointStatus='requested name only; fixture unrigged',triangle=idx,barycentric=bary(loc,a,b,c),normalOffsetMetres=.002,positionBodyYUp=[loc.x,loc.z,-loc.y],normalBodyYUp=[n.x,n.z,-n.y],lookupDistanceMetres=dist))

clearance={}
for ob in bpy.data.objects:
    if ob.type!='MESH' or not ob.name.startswith(('C01','S02')):continue
    values=[]
    for v in ob.data.vertices:
        pos=ob.matrix_world@v.co;loc,n,idx,dist=bvh.find_nearest(pos)
        values.append(dist if (pos-loc).dot(n)>=0 else -dist)
    values.sort()
    clearance[ob.name]=dict(samples=len(values),minimumSignedMetres=values[0],medianSignedMetres=values[len(values)//2],maximumSignedMetres=values[-1],verticesInsideBeyond02mm=sum(x<-.0002 for x in values),method='nearest triangle signed by normal; all mesh vertices; not full triangle intersection or continuous pose test')

report={
 'schema':'allworld-hair-attachment-proposal-v1','actualFit':'pending-master','productionAdmission':False,
 'humanProducerTask':'01a13667-6b47-7763-b71a-7d06139ed03f','humanContractCommit':'71d6b5ad391754b0f30fc5364e993208299640ed',
 'actualMaster':{'commit':None,'meshSha256':None,'topologySha256':None,'rigSha256':None,'skeletonId':None},
 'calibrationTarget':{'temporary':True,'meshName':head.name,'blendSha256':sha(Path(bpy.data.filepath).read_bytes()),'bodyGlbSha256':sha((out.parent/'temporary-calibration.glb').read_bytes()),'meshVertexSha256':sha(vertexBytes),'topologySha256':sha(topologyBytes),'topologyHashEncoding':'UTF-8 compact JSON of Blender loop_triangle vertex index triplets; vertex hash compact JSON float coordinates Z-up','triangleCount':len(triangles),'vertices':len(verts),'rigSha256':None,'rigCount':0,'morphCount':0},
 'v1BindingProposal':{'frame':'body-metres-bind-y-up-z-forward','slot':'hair','anchorRevision':1,'bindings':anchors,'admission':'Binding fields mirror v1. Not submitted as anchor-bindings-v1 because required allworld-body-23@1 would falsely identify this unrigged fixture.'},
 'bodyRelativeTransform':{'assetNodeTransform':'identity; positions already in body metres','proposedHeadBindPositionYUp':[0,1.65,0],'bodyFromHeadColumnMajor':[1,0,0,0,0,1,0,0,0,0,1,0,0,1.65,0,1],'headFromBodyColumnMajor':[1,0,0,0,0,1,0,0,0,0,1,0,0,-1.65,0,1],'formula':'p_head = inverse(T_head_bind) * p_asset_body; p_world = T_head_pose * p_head','status':'authored fixture datum only; replace with immutable producer inverse-bind transform'},
 'clearanceAgainstTemporaryHead':clearance,
 'endpointCoverage':{'headWidth':'blocked: no producer checkpoint','earSizeAndPosition':'blocked: no actual ear mesh or endpoints','bodyProportions':'blocked: no producer body endpoints','headYawPitchRoll':'blocked: no producer rig or poses','expressions':'blocked: no producer expressions','fixtureOnly':'neutral authored head; zero available morph or skeletal endpoints'},
 'unsupported':['skin binding','morph-driven scalp deformation','anisotropic hair BRDF','alpha cards','production static ModelPart PBR preservation'],
 'nextFitProcedure':['Parent supplies exact master/scalp/rest rig + endpoint/pose checkpoint. Hash before reading.','Build lane-owned derivative only; never save master.','Recompute triangle/barycentric anchors on producer topology and verify inverse-bind axes.','Fit to every available head/ear/body endpoint and supplied poses; measure triangle collisions plus clearance and render hairline.','Human skinned route owns attachment adoption; do not register through static ModelPart.']}
out.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'path':str(out),'clearance':clearance,'actualFit':'pending-master'}))
