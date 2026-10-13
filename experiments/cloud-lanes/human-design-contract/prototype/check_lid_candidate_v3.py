"""Actual evaluated pose, BVH intersection, UV overlap and preservation checks.

Raw BVH pairs include touching boundaries. Strict crossings require vertices of
both triangles on both sides of the other's plane (0.25 micrometre tolerance,
about two float32 ULPs at this model's 1.635 m height). Raw BVH pairs remain.
No global clearance or continuous collision guarantee is inferred.
"""
import bpy, json, hashlib, sys, math
from pathlib import Path
import numpy as np
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parent;sys.path.insert(0,str(ROOT))
from build_character import set_values,DOC
OUT=DOC/'eyelid-candidate-v3'
build=json.loads((OUT/'build-receipt.json').read_text())
lids=build['changedMeshes']

def uv_check(mesh):
    mesh.calc_loop_triangles();uv=mesh.uv_layers.active.data
    triangles=[np.array([tuple(uv[i].uv) for i in t.loops]) for t in mesh.loop_triangles]
    cross=lambda a,b:float(a[0]*b[1]-a[1]*b[0])
    def area(poly):return abs(sum(cross(poly[i],poly[(i+1)%len(poly)]) for i in range(len(poly)))*.5) if len(poly)>2 else 0
    def intersection(subject,clip):
        result=list(subject)
        if cross(clip[1]-clip[0],clip[2]-clip[0])<0:clip=clip[::-1]
        for i in range(3):
            a,b=clip[i],clip[(i+1)%3];old=result;result=[]
            for j,p in enumerate(old):
                q=old[(j+1)%len(old)];dp=cross(b-a,p-a);dq=cross(b-a,q-a)
                if dp>=-1e-14:result.append(p)
                if (dp>0 and dq<0) or (dp<0 and dq>0):result.append(p+(q-p)*dp/(dp-dq))
            if not result:break
        return area(result)
    bounds=[(float(t[:,0].min()),float(t[:,0].max()),float(t[:,1].min()),float(t[:,1].max()),i) for i,t in enumerate(triangles)]
    active=[];overlaps=[]
    for box in sorted(bounds):
        xmin,xmax,ymin,ymax,index=box
        active=[b for b in active if b[1]>xmin+1e-12]
        for b in active:
            if min(ymax,b[3])-max(ymin,b[2])<=1e-12:continue
            overlap=intersection(triangles[index],triangles[b[4]])
            if overlap>1e-10:overlaps.append((index,b[4],overlap))
        active.append(box)
    areas=[area(t) for t in triangles]
    return {'triangles':len(triangles),'positiveAreaOverlapPairs':len(overlaps),'summedOverlapArea':sum(v[2] for v in overlaps),
            'minimumUvTriangleArea':min(areas),'summedTriangleArea':sum(areas),'uvBounds':[min(b[0] for b in bounds),max(b[1] for b in bounds),min(b[2] for b in bounds),max(b[3] for b in bounds)]}

uv_results={}
for label,path in [('frozen',ROOT/'original-human-prototype.blend'),('candidate',ROOT/'eyelid-candidate-v3/eyelid-candidate-v3.blend')]:
    bpy.ops.wm.open_mainfile(filepath=str(path))
    uv_results[label]={name:uv_check(bpy.data.objects[name].data) for name in lids}
for result in uv_results['candidate'].values():
    assert result['positiveAreaOverlapPairs']==0 and result['minimumUvTriangleArea']>1e-10
    assert abs(result['summedTriangleArea']-1)<1e-6

def hashes(obj):
    m=obj.data;m.calc_loop_triangles()
    def digest(values,dtype='<f8'):return hashlib.sha256(np.array(values,dtype=dtype).tobytes()).hexdigest()
    return {'positions':digest([tuple(v.co) for v in m.vertices]),'triangles':digest([tuple(t.vertices) for t in m.loop_triangles],'<u4'),
            'uv':{uv.name:digest([tuple(v.uv) for v in uv.data]) for uv in m.uv_layers},
            'shapeKeys':{k.name:digest([tuple(v.co) for v in k.data]) for k in m.shape_keys.key_blocks} if m.shape_keys else {},
            'materialNames':[mat.name for mat in m.materials]}
for name,expected in build['protectedHashes'].items():assert hashes(bpy.data.objects[name])==expected,name

fit=json.loads((ROOT/'fit-frame.json').read_text())
cases=[('neutral',{})]
for control in fit['implementedIdentityControls']:
    for v in [-1,1]:cases.append((control+':'+str(v),{control:v}))
for v in [-1,1]:
    for blink in [0,.5,1]:cases.append(('all-six:'+str(v)+'/blink:'+str(blink),{**{c:v for c in fit['implementedIdentityControls']},'expression.blinkLeft':blink,'expression.blinkRight':blink}))
for height in [-1,0,1]:
    for blink in [.25,.5,.75,1]:cases.append(('height:'+str(height)+'/blink:'+str(blink),{'body.height':height,'expression.blinkLeft':blink,'expression.blinkRight':blink}))
for name in ['happy','sad']:cases.append((name,fit['expressionPresets'][name]))
cases.extend([('left-blink',{'expression.blinkLeft':1}),('right-blink',{'expression.blinkRight':1})])
if '--quick' in sys.argv:cases=[c for c in cases if c[0] in ['neutral','height:0/blink:0.5','height:0/blink:1']]

def strict_hits(a,b,raw,tolerance=2.5e-7):
    va,ta,_=a;vb,tb,_=b;hits=[]
    for ia,ib in raw:
        aa=va[ta[ia]];bb=vb[tb[ib]]
        na=np.cross(aa[1]-aa[0],aa[2]-aa[0]);nb=np.cross(bb[1]-bb[0],bb[2]-bb[0])
        na/=max(np.linalg.norm(na),1e-30);nb/=max(np.linalg.norm(nb),1e-30)
        da=(aa-bb[0])@nb;db=(bb-aa[0])@na
        if not (da.min()<-tolerance and da.max()>tolerance and db.min()<-tolerance and db.max()>tolerance):continue
        # Straddling both planes is necessary but insufficient: each triangle's
        # segment on their shared line must actually overlap the other segment.
        direction=np.cross(na,nb);length=np.linalg.norm(direction)
        if length<1e-12:continue
        direction/=length
        def interval(points,distances):
            intersections=[]
            for i,p in enumerate(points):
                j=(i+1)%3
                if abs(distances[i])<=1e-12:intersections.append(p)
                if distances[i]*distances[j]<0:
                    intersections.append(p+(points[j]-p)*distances[i]/(distances[i]-distances[j]))
            projected=[float(p@direction) for p in intersections]
            return min(projected),max(projected)
        amin,amax=interval(aa,da);bmin,bmax=interval(bb,db)
        if min(amax,bmax)-max(amin,bmin)>tolerance:hits.append((ia,ib))
    return hits

# Known positive crossing, disjoint line intervals despite AABB/plane overlap,
# and endpoint-only contact. These exercise the independent geometric filter.
test_a=(np.array([[0.,-1,0],[0,1,0],[1,0,0]]),np.array([[0,1,2]]),None)
for vertices,expected in [([[-.5,0,-1],[.5,0,1],[1.5,0,-1]],True),
                          ([[-1.,0,1],[.5,0,1],[2,0,-.1]],False),
                          ([[1.,0,-1],[1,0,1],[2,0,0]],False)]:
    assert bool(strict_hits(test_a,(np.array(vertices),np.array([[0,1,2]]),None),[(0,0)]))==expected

rows=[];geometry_failures=[];max_error=0
for label,values in cases:
    set_values(values);dg=bpy.context.evaluated_depsgraph_get();cache={}
    def data(name):
        if name not in cache:
            m=bpy.data.objects[name].evaluated_get(dg).data;m.calc_loop_triangles()
            vertices=np.array([tuple(v.co) for v in m.vertices]);tri=np.array([tuple(t.vertices) for t in m.loop_triangles])
            cache[name]=(vertices,tri,BVHTree.FromPolygons(vertices.tolist(),tri.tolist(),all_triangles=True,epsilon=1e-9))
        return cache[name]
    pairs=[]
    for side in ['Left','Right']:
        names=['UpperLid_'+side,'LowerLid_'+side]
        for lid in names:
            a=data(lid);vertices,tri,_=a
            normals=np.cross(vertices[tri[:,1]]-vertices[tri[:,0]],vertices[tri[:,2]]-vertices[tri[:,0]])
            if not np.isfinite(vertices).all() or np.linalg.norm(normals,axis=1).min()<1e-14:geometry_failures.append([label,lid,'invalid triangle'])
            keys=bpy.data.objects[lid].data.shape_keys.key_blocks
            basis=np.array([tuple(v.co) for v in keys['Basis'].data]);expected=basis.copy()
            for key in keys:
                if key.name=='Basis':continue
                if key.name.startswith('corrective.height.'):weight=values.get('body.height',0)*values.get('expression.'+key.name.split('.')[-1],0)
                elif key.name.startswith('corrective.blinkArc'):
                    b=values.get('expression.blink'+side,0);weight=4*b*(1-b)
                else:weight=values.get(key.name,0)
                expected+=(np.array([tuple(v.co) for v in key.data])-basis)*weight
            error=float(abs(vertices-expected).max());max_error=max(max_error,error)
            if error>2e-6:geometry_failures.append([label,lid,'driver mismatch',error])
            for other in ['Eye_'+side,'Iris_'+side,'Pupil_'+side,'Head_continuous_anatomy']:
                b=data(other);raw=a[2].overlap(b[2]);strict=strict_hits(a,b,raw)
                radial=build['bindings'][lid]['radialSegments'];count=build['bindings'][lid]['angularSamples']
                visible=sum(all(int(i)//count>=radial//2 for i in tri[t]) for t,u in strict)
                item={'surface':lid,'other':other,'rawBvhTrianglePairs':len(raw),'strictCrossingPairs':len(strict),'apertureHalfStrictPairs':visible}
                if strict and other.startswith('Head'):
                    item['firstWitness']={'lidTriangle':a[0][a[1][strict[0][0]]].tolist(),'headTriangle':b[0][b[1][strict[0][1]]].tolist(),
                                          'lidRadialRows':[int(i)//count for i in tri[strict[0][0]]]}
                pairs.append(item)
        a=data(names[0]);b=data(names[1]);raw=a[2].overlap(b[2]);strict=strict_hits(a,b,raw)
        item={'surface':names[0],'other':names[1],'rawBvhTrianglePairs':len(raw),'strictCrossingPairs':len(strict),
              'atTenNanometreTolerancePairs':len(strict_hits(a,b,raw,1e-8))}
        if strict:item['firstWitness']={'upper':a[0][a[1][strict[0][0]]].tolist(),'lower':b[0][b[1][strict[0][1]]].tolist()}
        pairs.append(item)
        a=data('Eye_'+side);b=data('Head_continuous_anatomy');raw=a[2].overlap(b[2]);strict=strict_hits(a,b,raw)
        pairs.append({'surface':'Eye_'+side,'other':'Head_continuous_anatomy','rawBvhTrianglePairs':len(raw),'strictCrossingPairs':len(strict),'unchangedInheritedInterface':True})
    rows.append({'case':label,'values':values,'pairs':pairs})

def count(predicate,key):return sum(p[key] for row in rows for p in row['pairs'] if predicate(p))
report={'schemaVersion':3,'cases':len(cases),'uv':uv_results,'exactProtectedMeshes':len(build['protectedHashes']),
 'maximumEvaluatedMorphErrorMetres':max_error,'geometryFailures':geometry_failures,
 'lidVsEyeStrictPairs':count(lambda p:p['surface'] in lids and p['other'].startswith('Eye_'),'strictCrossingPairs'),
 'lidVsHeadStrictPairs':count(lambda p:p['surface'] in lids and p['other'].startswith('Head_'),'strictCrossingPairs'),
 'lidVsIrisPupilStrictPairs':count(lambda p:p['surface'] in lids and p['other'].startswith(('Iris_','Pupil_')),'strictCrossingPairs'),
 'upperVsLowerLidStrictPairs':count(lambda p:p['surface'] in lids and p['other'] in lids,'strictCrossingPairs'),
 'strictPlaneToleranceMetres':2.5e-7,
 'intersectionMethod':'BVH candidates, both-plane straddling and intersecting intervals along the planes intersection line; three independent classifier fixtures pass.',
 'caseResults':rows,'limits':'Discrete actual evaluated samples, not continuous collision or global clearance. Positive-area UV overlaps checked within each separate lid map, not a shared atlas. Raw boundary touches are retained alongside strict transverse crossings. Unchanged eye/head penetration remains outside this four-lid correction.'}
report['status']='FAIL' if geometry_failures or report['lidVsEyeStrictPairs'] or report['lidVsHeadStrictPairs'] or report['lidVsIrisPupilStrictPairs'] or report['upperVsLowerLidStrictPairs'] else 'LID_CHECKS_PASS_WITH_INHERITED_EYE_HEAD_BLOCKER'
(OUT/'geometry-uv-checks.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['caseResults','uv','limits']}))
print('UV',json.dumps(uv_results))
assert not geometry_failures
assert report['status']!='FAIL',report['status']
