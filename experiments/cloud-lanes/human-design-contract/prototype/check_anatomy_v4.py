"""Finite eye/head intersection, lid orientation, seam/UV and preservation gates."""
import bpy,ast,json,hashlib,sys
from pathlib import Path
from collections import Counter
import numpy as np
from types import SimpleNamespace
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parent;sys.path.insert(0,str(ROOT))
from build_character import set_values,DOC
OUT=DOC/'anatomy-candidate-v4';build=json.loads((OUT/'build-receipt.json').read_text())
source=ROOT/'check_lid_candidate_v3.py'
for name in ['strict_hits','uv_check']:
    fn=next(n for n in ast.parse(source.read_text()).body if isinstance(n,ast.FunctionDef) and n.name==name)
    exec(compile(ast.Module(body=[fn],type_ignores=[]),str(source),'exec'))
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'anatomy-candidate-v4/anatomy-candidate-v4.blend'))

def hashes(obj):
    m=obj.data;m.calc_loop_triangles();h=lambda a,d='<f8':hashlib.sha256(np.array(a,dtype=d).tobytes()).hexdigest()
    return {'positions':h([tuple(v.co) for v in m.vertices]),'triangles':h([tuple(t.vertices) for t in m.loop_triangles],'<u4'),
            'uv':{uv.name:h([tuple(v.uv) for v in uv.data]) for uv in m.uv_layers},
            'keys':{k.name:h([tuple(v.co) for v in k.data]) for k in m.shape_keys.key_blocks} if m.shape_keys else {},
            'materials':[m.name for m in m.materials]}
for name,expected in build['protectedHashes'].items():assert hashes(bpy.data.objects[name])==expected,name
head=bpy.data.objects['Head_continuous_anatomy'];head.data.calc_loop_triangles()
tri=np.array([tuple(t.vertices) for t in head.data.loop_triangles]);nold=build['originalHeadTriangleCount'];newtri=tri[nold:]
edge_counts=Counter(tuple(sorted((int(t[j]),int(t[(j+1)%3])))) for t in tri for j in range(3))
assert max(edge_counts.values())==2
expected_boundary=set()
for region in build['lidRegions'].values():
    for a,b in zip(region['aperturePairs'],region['aperturePairs'][1:]):
        expected_boundary.add(tuple(sorted((a[0],b[0]))));expected_boundary.add(tuple(sorted((a[1],b[1]))))
actual_boundary={e for e,n in edge_counts.items() if n==1}
assert actual_boundary==expected_boundary,('Unconnected socket seam',len(actual_boundary),len(expected_boundary))
uv={name:uv_check(bpy.data.objects[name].data) for name in ['Head_continuous_anatomy','Iris_Left','Iris_Right','Pupil_Left','Pupil_Right']}
def uv_subset(triangles):
    return uv_check(SimpleNamespace(calc_loop_triangles=lambda:None,uv_layers=head.data.uv_layers,loop_triangles=triangles))
uv['headOriginalFaces']=uv_subset(list(head.data.loop_triangles)[:nold])
uv['headNewFaces']=uv_subset(list(head.data.loop_triangles)[nold:])
uv['newVersusOldOverlapPairs']=uv['Head_continuous_anatomy']['positiveAreaOverlapPairs']-uv['headOriginalFaces']['positiveAreaOverlapPairs']-uv['headNewFaces']['positiveAreaOverlapPairs']
(OUT/'uv-diagnostic.json').write_text(json.dumps(uv,indent=2)+'\n')
uv_failures=[]
if uv['headNewFaces']['positiveAreaOverlapPairs'] or uv['newVersusOldOverlapPairs']:uv_failures.append({'type':'new UV overlap','newFaces':uv['headNewFaces']['positiveAreaOverlapPairs'],'newVsOld':uv['newVersusOldOverlapPairs']})
for name in ['Iris_Left','Iris_Right','Pupil_Left','Pupil_Right']:
    if uv[name]['positiveAreaOverlapPairs']:uv_failures.append({'type':'eye UV overlap','mesh':name})

fit=json.loads((ROOT/'fit-frame.json').read_text());cases=[('neutral',{})]
for control in fit['implementedIdentityControls']:
    for value in [-1,1]:cases.append((control+':'+str(value),{control:value}))
for value in [-1,1]:
    for blink in [0,.5,1]:cases.append(('all-six:'+str(value)+'/blink:'+str(blink),{**{c:value for c in fit['implementedIdentityControls']},'expression.blinkLeft':blink,'expression.blinkRight':blink}))
for height in [-1,0,1]:
    for blink in [.25,.5,.75,1]:cases.append(('height:'+str(height)+'/blink:'+str(blink),{'body.height':height,'expression.blinkLeft':blink,'expression.blinkRight':blink}))
for name in ['happy','sad']:cases.append((name,fit['expressionPresets'][name]))
cases.extend([('left-blink',{'expression.blinkLeft':1}),('right-blink',{'expression.blinkRight':1})])
keys={k.name:np.array([tuple(v.co) for v in k.data]) for k in head.data.shape_keys.key_blocks};basis=keys['Basis']
deltas={k:v-basis for k,v in keys.items() if k!='Basis'}
neutralnorm=np.cross(basis[newtri[:,1]]-basis[newtri[:,0]],basis[newtri[:,2]]-basis[newtri[:,0]])
rows=[];failures=list(uv_failures);maximum_error=0.;minarea=1.;mincosine=1.
for label,values in cases:
    set_values(values);dg=bpy.context.evaluated_depsgraph_get();cache={}
    def data(name):
        if name not in cache:
            m=bpy.data.objects[name].evaluated_get(dg).data;m.calc_loop_triangles()
            vertices=np.array([tuple(v.co) for v in m.vertices]);indices=np.array([tuple(t.vertices) for t in m.loop_triangles])
            cache[name]=(vertices,indices,BVHTree.FromPolygons(vertices.tolist(),indices.tolist(),all_triangles=True,epsilon=1e-9))
        return cache[name]
    a=data(head.name);vertices=a[0];expected=basis.copy()
    for key,delta in deltas.items():
        if key.startswith('corrective.height.'):weight=values.get('body.height',0)*values.get('expression.'+key.split('.')[-1],0)
        elif key.startswith('corrective.blinkArc'):
            b=values.get('expression.blink'+('Left' if key.endswith('Left') else 'Right'),0);weight=4*b*(1-b)
        else:weight=values.get(key,0)
        expected+=delta*weight
    error=float(abs(vertices-expected).max());maximum_error=max(maximum_error,error)
    normals=np.cross(vertices[newtri[:,1]]-vertices[newtri[:,0]],vertices[newtri[:,2]]-vertices[newtri[:,0]])
    areas=np.linalg.norm(normals,axis=1)*.5;cosines=(normals*neutralnorm).sum(axis=1)/(np.linalg.norm(normals,axis=1)*np.linalg.norm(neutralnorm,axis=1))
    minimumarea=float(areas.min());minimumcos=float(cosines.min());minarea=min(minarea,minimumarea);mincosine=min(mincosine,minimumcos)
    if not np.isfinite(vertices).all() or minimumarea<=1e-10 or minimumcos<=0 or error>2e-6:failures.append({'case':label,'type':'geometry/orientation','minArea':minimumarea,'minCosine':minimumcos,'error':error})
    pairs=[]
    for side in ['Left','Right']:
        for prefix in ['Eye','Iris','Pupil']:
            b=data(prefix+'_'+side);raw=a[2].overlap(b[2]);hits=strict_hits(a,b,raw)
            pairs.append({'surface':prefix+'_'+side,'other':'Head including connected lids','rawBvhPairs':len(raw),'properCrossings':len(hits)})
            if hits:failures.append({'case':label,'pair':prefix+'_'+side+'/Head','count':len(hits)})
        for first,second in [('Eye','Iris'),('Eye','Pupil'),('Iris','Pupil')]:
            b=data(first+'_'+side);c=data(second+'_'+side);raw=b[2].overlap(c[2]);hits=strict_hits(b,c,raw)
            pairs.append({'surface':first+'_'+side,'other':second+'_'+side,'rawBvhPairs':len(raw),'properCrossings':len(hits)})
            if hits:failures.append({'case':label,'pair':first+'/'+second+'/'+side,'count':len(hits)})
    # Nonadjacent connected-lid/head self crossings at the three requested views.
    selfcount=None
    if label in ['neutral','height:0/blink:0.5','height:0/blink:1']:
        part=(vertices,newtri,BVHTree.FromPolygons(vertices.tolist(),newtri.tolist(),all_triangles=True,epsilon=1e-9))
        raw=[(i,j) for i,j in part[2].overlap(a[2]) if not set(newtri[i]).intersection(tri[j]) and (j<nold or i+nold<j)]
        selfcount=len(strict_hits(part,a,raw))
        if selfcount:failures.append({'case':label,'type':'new-head self crossing','count':selfcount})
    rows.append({'case':label,'values':values,'pairs':pairs,'minimumLidAreaM2':minimumarea,'minimumCosineToNeutral':minimumcos,'newHeadSelfCrossings':selfcount})

# Continuous one-dimensional blink orientation certificate from actual saved
# quadratic morph polynomials. No resampling thousands of poses is necessary.
certificates=[]
for controls in [{},{'body.height':-1},{'body.height':1},{c:-1 for c in fit['implementedIdentityControls']},{c:1 for c in fit['implementedIdentityControls']}]:
    a=basis.copy()
    for key,value in controls.items():
        if key in deltas:a+=value*deltas[key]
    b=np.zeros_like(a);c=np.zeros_like(a)
    for side in ['Left','Right']:
        arc=deltas['corrective.blinkArc'+side]
        b+=deltas['expression.blink'+side]+4*arc+controls.get('body.height',0)*deltas['corrective.height.blink'+side]
        c-=4*arc
    coeff=[a,b,c];e=[v[newtri[:,1]]-v[newtri[:,0]] for v in coeff];f=[v[newtri[:,2]]-v[newtri[:,0]] for v in coeff]
    normals=[sum((np.cross(e[i],f[k-i]) for i in range(3) if 0<=k-i<3),np.zeros_like(e[0])) for k in range(5)]
    polynomials=np.array([(v*normals[0]).sum(axis=1) for v in normals]).T
    minimum=1.;bad=[]
    for index,p in enumerate(polynomials):
        derivative=np.array([k*p[k] for k in range(1,5)])
        while len(derivative)>1 and abs(derivative[-1])<1e-24:derivative=derivative[:-1]
        roots=np.polynomial.polynomial.polyroots(derivative) if len(derivative)>1 else []
        samples=[0.,1.]+[float(r.real) for r in roots if abs(r.imag)<1e-7 and 0<r.real<1]
        value=min(float(np.polynomial.polynomial.polyval(t,p)) for t in samples)/p[0]
        minimum=min(minimum,value)
        if value<=1e-6:bad.append(index+nold)
    certificates.append({'controls':controls,'blinkInterval':[0,1],'minimumDotRatio':minimum,'nonpositiveOrNearZeroTriangles':bad})
    if bad:failures.append({'type':'continuous blink orientation','triangles':bad})
report={'version':4,'status':'PASS' if not failures else 'FAIL','cases':len(cases),'failures':failures,
 'properCrossingsAllTestedPairs':sum(p['properCrossings'] for r in rows for p in r['pairs']),
 'neutralEyeHeadProperCrossings':sum(p['properCrossings'] for p in rows[0]['pairs'] if p['surface'].startswith('Eye') and p['other'].startswith('Head')),
 'minimumNewLidTriangleAreaM2':minarea,'minimumNormalCosineToNeutral':mincosine,'maximumEvaluatedMorphErrorM':maximum_error,
 'headBoundaryEdges':len(actual_boundary),'allHeadBoundariesAreActualEyeApertures':True,'nonmanifoldEdges':0,
 'uv':uv,'preservedMeshes':len(build['exactPreservedMeshes']),'continuousBlinkNormalCertificates':certificates,'caseResults':rows,
 'limits':'0.25 micrometre strict transverse intersection tolerance; raw BVH candidates retained. Finite collision tests, three self-crossing states; not exhaustive coplanar/continuous collision. Polynomial orientation proof applies only to blink with each listed fixed control packet. No rig, cap refit, production or realism acceptance.'}
(OUT/'checks.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['caseResults','uv','continuousBlinkNormalCertificates','limits']}))
assert not failures,failures
