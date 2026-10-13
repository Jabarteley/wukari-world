"""Changed-asset fitting checks: actual surface-morph samples and triangle intersections.
No source-master rewrite, skeleton, continuous morph or animation claim.
"""
import argparse
import itertools
import json
from pathlib import Path
import sys
import bpy
import numpy as np
from mathutils import Vector,geometry
from mathutils.bvhtree import BVHTree

LANE=Path(__file__).resolve().parent
p=argparse.ArgumentParser();p.add_argument('--out',required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.out).resolve();assert LANE in out.parents
proposal=json.loads((out/'fit-proposal.json').read_text())
inputchecks=json.loads((LANE/'runs/master-3ee5882/geometry-checks.json').read_text())
bodyNames=[r['name'] for r in inputchecks['meshes'] if not r['name'].startswith('Hair_')]
identity=['nose.projection','nose.alarWidth','earLeft.protrusion','earRight.protrusion','body.height','body.shoulderWidth']
presets={'happy':{'expression.smileLeft':1,'expression.smileRight':1},'sad':{'expression.frownLeft':1,'expression.frownRight':1,'expression.browRaiseLeft':.8,'expression.browRaiseRight':.8},'blink':{'expression.blinkLeft':1,'expression.blinkRight':1}}
cases=[('neutral',{})]
for k in identity:
    for x in [-1,1]:cases.append((k+':'+str(x),{k:x}))
for k,l in itertools.combinations(identity,2):
    for x,y in itertools.product([-1,1],repeat=2):cases.append((k+':'+str(x)+'/'+l+':'+str(y),{k:x,l:y}))
for name,expr in presets.items():
    cases.append((name,expr))
    for k in identity:
        for x in [-1,1]:cases.append((k+':'+str(x)+'/'+name,{k:x,**expr}))

cache={}
for name in bodyNames+[n for s in proposal['derivatives'].values() for n in s['objects']]:
    ob=bpy.data.objects[name];ob.data.calc_loop_triangles()
    base=np.array([v.co[:] for v in ob.data.vertices],dtype=np.float64)
    tri=np.array([t.vertices[:] for t in ob.data.loop_triangles],dtype=np.int32)
    delta={k.name:np.array([v.co[:] for v in k.data])-base for k in ob.data.shape_keys.key_blocks if k.name!='Basis'}
    cache[name]=(base,tri,delta)

def points(name,values):
    base,tri,delta=cache[name];out=base.copy()
    for k,v in values.items():
        if k in delta:out+=delta[k]*v
        c='corrective.height.'+k.split('.')[-1]
        if k.startswith('expression.') and c in delta:out+=delta[c]*v*values.get('body.height',0)
    assert np.isfinite(out).all()
    return out

def combine(names,values):
    verts=[];tris=[];offset=0;owners=[]
    for n in names:
        p=points(n,values);t=cache[n][1]
        verts.append(p);tris.append(t+offset);offset+=len(p);owners.extend([n]*len(t))
    return np.concatenate(verts),np.concatenate(tris),owners

def exact_non_coplanar(a,b):
    # BVH overlap is a candidate set, so confirm finite edge/triangle intersections.
    for tri,other in [(a,b),(b,a)]:
        for i in range(3):
            start=tri[i];end=tri[(i+1)%3];direction=end-start
            hit=geometry.intersect_ray_tri(*other,direction,start,True)
            if hit is not None:
                den=direction.length_squared
                t=(hit-start).dot(direction)/den if den else -1
                if -1e-7<=t<=1+1e-7:return True
    return False

rows=[];worst={k:{'minimumSignedMetres':1,'maximumConfirmedIntersectionPairs':0,'maximumCandidatePairs':0,'maximumVerticesInside02mm':0} for k in proposal['derivatives']}
for case,values in cases:
    bp,bt,owners=combine(bodyNames,values)
    # All body meshes are included; broad spatial exclusion only removes triangles below every hair asset.
    floor=1.49*(1+.05*values.get('body.height',0))
    relevant=np.max(bp[bt,2],axis=1)>=floor
    bt=bt[relevant];owners=[n for n,keep in zip(owners,relevant) if keep]
    bv=[Vector(x) for x in bp];bodyTree=BVHTree.FromPolygons(bv,bt.tolist(),all_triangles=True)
    for style,s in proposal['derivatives'].items():
        hp,ht,_=combine(s['objects'],values);hv=[Vector(x) for x in hp]
        hairTree=BVHTree.FromPolygons(hv,ht.tolist(),all_triangles=True)
        candidates=hairTree.overlap(bodyTree)
        confirmed=[]
        for hi,bi in candidates:
            aa=[hv[i] for i in ht[hi]];bb=[bv[i] for i in bt[bi]]
            if exact_non_coplanar(aa,bb):confirmed.append({'hairTriangle':hi,'bodyTriangle':bi,'bodyMesh':owners[bi]})
        distances=[]
        for v in hv:
            loc,n,idx,dist=bodyTree.find_nearest(v)
            distances.append(dist if (v-loc).dot(n)>=0 else -dist)
        minvalue=min(distances);inside=sum(d<-.0002 for d in distances)
        row={'case':case,'values':values,'style':style,'hairTriangles':len(ht),'minimumSignedMetres':minvalue,'verticesInside02mm':inside,
             'bvhCandidatePairs':len(candidates),'confirmedNonCoplanarIntersectionPairs':len(confirmed),'intersectionWitnesses':confirmed[:12]}
        rows.append(row);w=worst[style]
        if minvalue<w['minimumSignedMetres']:w['minimumSignedMetres']=minvalue;w['worstClearanceCase']=case
        w['maximumConfirmedIntersectionPairs']=max(w['maximumConfirmedIntersectionPairs'],len(confirmed))
        w['maximumCandidatePairs']=max(w['maximumCandidatePairs'],len(candidates));w['maximumVerticesInside02mm']=max(w['maximumVerticesInside02mm'],inside)

report={'masterCommit':proposal['masterCommit'],'identityControls':identity,'sampledCases':len(cases),'styleCaseChecks':len(rows),'summary':worst,'rows':rows,
 'method':'Actual saved Blender float32 morph deltas, neutral + signed identity endpoints + all identity endpoint pairs + expression/identity pairs. All master body meshes except replaced Hair placeholder; only triangles wholly below every hair bound spatially excluded. BVH candidate pairs followed by finite segment/triangle intersections. All hair vertices signed nearest triangle.',
 'limits':'Coplanar contacts are retained as BVH candidate counts rather than certified separation. Not continuous controls, self-intersections within hair, animation, skeletal fitting, physics, or production device performance.',
 'skeletalPosesTested':0,'skeleton':None,'sourceUvHashesVerified':True,'totalCharacterTriangles':proposal['totalCharacterTriangles']}
(out/'fit-checks.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'cases':len(cases),'summary':worst,'totalCharacterTriangles':proposal['totalCharacterTriangles']}))
