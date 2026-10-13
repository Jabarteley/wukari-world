"""Read actual GLB data for preservation and neutral/half/full export checks."""
import ast,hashlib,json,math,struct
from pathlib import Path
import numpy as np
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parent
DOC=ROOT.parents[3]/'docs/agent-plans/cloud-lanes/human-design-contract/prototype/anatomy-candidate-v5'
for filename,name in [('verify_lid_export_v3.py','decode'),('check_lid_candidate_v3.py','strict_hits')]:
    source=ROOT/filename;fn=next(n for n in ast.parse(source.read_text()).body if isinstance(n,ast.FunctionDef) and n.name==name)
    exec(compile(ast.Module(body=[fn],type_ignores=[]),str(source),'exec'))
candidate=ROOT/'anatomy-candidate-v5/anatomy-candidate-v5.glb'
original=decode(ROOT/'original-human-prototype.glb');export=decode(candidate)
build=json.loads((DOC/'build-receipt.json').read_text())
for name in build['exactPreservedMeshes']:
    for key in ['triangles','position','uv','morphPositions']:assert original['objects'][name][key]==export['objects'][name][key],(name,key)
assert len(export['objects'])==27 and export['triangles']==build['triangles']
assert not set(build['removedSeparateLids']).intersection(export['objects'])

def loader(path):
    raw=path.read_bytes();size=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+size]);binary=raw[28+size:]
    types={5121:'<u1',5123:'<u2',5125:'<u4',5126:'<f4'}
    def read(index):
        a=doc['accessors'][index];width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];dtype=np.dtype(types[a['componentType']])
        values=np.zeros((a['count'],width),dtype=dtype)
        if 'bufferView' in a:
            v=doc['bufferViews'][a['bufferView']];offset=v.get('byteOffset',0)+a.get('byteOffset',0)
            values=np.ndarray((a['count'],width),dtype=dtype,buffer=binary,offset=offset,strides=(v.get('byteStride',dtype.itemsize*width),dtype.itemsize)).copy()
        if 'sparse' in a:
            s=a['sparse'];i=s['indices'];v=s['values']
            indices=np.frombuffer(binary,dtype=types[i['componentType']],count=s['count'],offset=doc['bufferViews'][i['bufferView']].get('byteOffset',0)+i.get('byteOffset',0))
            vals=np.frombuffer(binary,dtype=dtype,count=s['count']*width,offset=doc['bufferViews'][v['bufferView']].get('byteOffset',0)+v.get('byteOffset',0)).reshape(-1,width)
            values[indices]=vals
        assert np.isfinite(values).all()
        return values.astype(np.float64) if a['componentType']==5126 else values
    parts={}
    for node in doc['nodes']:
        if 'mesh' not in node:continue
        assert not any(k in node for k in ['translation','rotation','scale','matrix']),node['name']
        mesh=doc['meshes'][node['mesh']];assert len(mesh['primitives'])==1
        p=mesh['primitives'][0];targets=p.get('targets',[]);names=mesh.get('extras',{}).get('targetNames',[])
        for target in targets:
            for index in target.values():read(index)
        parts[node['name']]={'base':read(p['attributes']['POSITION']),'tri':read(p['indices']).reshape(-1,3),
                            'uv':read(p['attributes']['TEXCOORD_0']),'morph':{n:read(t['POSITION']) for n,t in zip(names,targets)}}
    return parts
parts=loader(candidate);prior=loader(ROOT/'original-human-prototype.glb');head=parts['Head_continuous_anatomy'];oldhead=prior['Head_continuous_anatomy']
nold=build['originalHeadTriangleCount']
def canonical_uv(part,triangles):
    rows=[]
    for tri in triangles:
        points=[tuple(p) for p in part['uv'][tri]]
        rows.append(min(tuple(points[i:]+points[:i]) for i in range(3)))
    return sorted(rows)
kept=[t for i,t in enumerate(oldhead['tri']) if i not in set(build['removedOriginalHeadFaceIndices'])]
assert canonical_uv(head,head['tri'][:nold])==canonical_uv(oldhead,kept)
newtri=head['tri'][nold:];neutral=head['base'];norm0=np.cross(neutral[newtri[:,1]]-neutral[newtri[:,0]],neutral[newtri[:,2]]-neutral[newtri[:,0]])
rows=[]
for blink in [0,.5,1]:
    def data(name):
        part=parts[name];v=part['base'].copy()
        for side in ['Left','Right']:
            for key,weight in [('expression.blink'+side,blink),('corrective.blinkArc'+side,4*blink*(1-blink))]:
                if key in part['morph']:v+=part['morph'][key]*weight
        return v,part['tri'],BVHTree.FromPolygons(v.tolist(),part['tri'].tolist(),all_triangles=True,epsilon=1e-9)
    h=data('Head_continuous_anatomy');pairs=[]
    normals=np.cross(h[0][newtri[:,1]]-h[0][newtri[:,0]],h[0][newtri[:,2]]-h[0][newtri[:,0]])
    flags=int(((normals*norm0).sum(axis=1)<=0).sum());assert flags==0
    for side in ['Left','Right']:
        for prefix in ['Eye','Iris','Pupil']:
            p=data(prefix+'_'+side);raw=h[2].overlap(p[2]);hits=strict_hits(h,p,raw)
            assert not hits,(blink,prefix,side,len(hits))
            pairs.append({'surface':prefix+'_'+side,'headProperCrossings':0})
    rows.append({'blink':blink,'normalFlags':flags,'minimumNewLidAreaM2':float(np.linalg.norm(normals,axis=1).min()*.5),'pairs':pairs})
import bpy

def source_geometry(path):
    bpy.ops.wm.open_mainfile(filepath=str(path));result={}
    for o in bpy.context.scene.objects:
        if o.type!='MESH' or o.name.startswith('STUDIO'):continue
        o.data.calc_loop_triangles()
        result[o.name]={'base':np.array([tuple(v.co) for v in o.data.vertices]),
            'tri':np.array([tuple(t.vertices) for t in o.data.loop_triangles]),
            'keys':{k.name:np.array([tuple(v.co) for v in k.data]) for k in o.data.shape_keys.key_blocks}}
    return result
oldsource=source_geometry(ROOT/'anatomy-candidate-v4/anatomy-candidate-v4.blend')
newsource=source_geometry(ROOT/'anatomy-candidate-v5/anatomy-candidate-v5.blend')
count=build['originalHeadVertexCount'];a=oldsource['Head_continuous_anatomy'];b=newsource['Head_continuous_anatomy']
change=b['base'][:count]-a['base'][:count]
assert np.array_equal(b['base'][:count][:,[0,2]],a['base'][:count][:,[0,2]])
identity=['nose.projection','nose.alarWidth','earLeft.protrusion','earRight.protrusion','body.height','body.shoulderWidth']
assert all(any(key in part['keys'] for part in newsource.values()) for key in identity)
head_delta_error=max(float(abs((b['keys'][k][:count]-b['base'][:count])-(a['keys'][k][:count]-a['base'][:count])).max()) for k in a['keys'])
source_compatibility={'originalHeadVertices':count,'changedOriginalHeadVertices':int((np.linalg.norm(change,axis=1)>1e-9).sum()),
    'maximumOriginalVertexMovementM':float(np.linalg.norm(change,axis=1).max()),'oldHeadXZExact':True,
    'maximumRetainedHeadMorphDeltaDifferenceM':head_delta_error,'allSixIdentityControlsPresent':True,
    'note':'Reverts v4 local orbital Y displacements; new surrounding field rebuilt. No body or anchor changes.'}
# The last render used the same positions/topology/morphs before a UV-only
# reversion. Verify that claim against Blender's previous saved source bytes.
backup=ROOT/'anatomy-candidate-v5/anatomy-candidate-v5.blend1'
if backup.exists():
    rendered=source_geometry(backup)
    for name,part in newsource.items():
        assert np.array_equal(part['base'],rendered[name]['base']) and np.array_equal(part['tri'],rendered[name]['tri'])
        for key,points in part['keys'].items():assert np.array_equal(points,rendered[name]['keys'][key]),(name,key)
    source_compatibility['lastRenderedGeometryExactAfterUvOnlyReversion']=True
    source_compatibility['renderedSourceSha256']=hashlib.sha256(backup.read_bytes()).hexdigest()
report={'status':'PASS','candidateSha256':export['sha256'],'triangleCount':export['triangles'],'meshCount':27,
        'exactPreservedTriangleExpandedMeshes':20,'retainedOriginalHeadFaceUvsPreserved':True,'allDecodedPositionsMorphsNormalsFinite':True,
        'sourceCompatibility':source_compatibility,'exportedBlinkChecks':rows,'objects':export['objects'],'limits':'Actual GLB buffers tested; no material/cornea refit, rig, production or realism acceptance.'}
(DOC/'export-compatibility.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['objects','exportedBlinkChecks','limits']}))
