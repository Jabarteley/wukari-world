"""Verify original/candidate actual GLB triangle-expanded positions, UV and morphs."""
import hashlib,json,math,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parent
DOC=ROOT.parents[3]/'docs/agent-plans/cloud-lanes/human-design-contract/prototype/eyelid-candidate-v3'

def decode(path):
    raw=path.read_bytes();magic,version,size=struct.unpack_from('<4sII',raw)
    assert (magic,version,size)==(b'glTF',2,len(raw))
    length,kind=struct.unpack_from('<II',raw,12);assert kind==0x4e4f534a
    doc=json.loads(raw[20:20+length]);binary=raw[28+length:]
    def accessor(index):
        a=doc['accessors'][index];width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
        fmt,size={5121:('B',1),5123:('H',2),5125:('I',4),5126:('f',4)}[a['componentType']]
        values=[(0,)*width]*a['count']
        if 'bufferView' in a:
            v=doc['bufferViews'][a['bufferView']];start=v.get('byteOffset',0)+a.get('byteOffset',0)
            values=[struct.unpack_from('<'+fmt*width,binary,start+i*v.get('byteStride',size*width)) for i in range(a['count'])]
        if 'sparse' in a:
            s=a['sparse'];indices=s['indices'];data=s['values']
            ifmt,isize={5121:('B',1),5123:('H',2),5125:('I',4)}[indices['componentType']]
            istart=doc['bufferViews'][indices['bufferView']].get('byteOffset',0)+indices.get('byteOffset',0)
            dstart=doc['bufferViews'][data['bufferView']].get('byteOffset',0)+data.get('byteOffset',0)
            previous=-1
            for i in range(s['count']):
                dest=struct.unpack_from('<'+ifmt,binary,istart+i*isize)[0]
                assert previous<dest<len(values);previous=dest
                values[dest]=struct.unpack_from('<'+fmt*width,binary,dstart+i*size*width)
        assert all(math.isfinite(n) for value in values for n in value)
        return values
    objects={};total=0
    for node in doc['nodes']:
        if 'mesh' not in node:continue
        mesh=doc['meshes'][node['mesh']];assert len(mesh['primitives'])==1
        primitive=mesh['primitives'][0];indices=[v[0] for v in accessor(primitive['indices'])]
        assert len(indices)%3==0;total+=len(indices)//3
        def expanded(index):
            values=accessor(index)
            return hashlib.sha256(b''.join(struct.pack('<'+'f'*len(values[i]),*values[i]) for i in indices)).hexdigest()
        names=mesh.get('extras',{}).get('targetNames',[]);targets=primitive.get('targets',[])
        assert len(names)==len(targets)
        objects[node['name']]={'triangles':len(indices)//3,'position':expanded(primitive['attributes']['POSITION']),
            'uv':expanded(primitive['attributes']['TEXCOORD_0']),
            'morphPositions':{n:expanded(t['POSITION']) for n,t in zip(names,targets)},
            'normalTargets':sum('NORMAL' in t for t in targets)}
    assert not doc.get('skins') and not doc.get('animations')
    return {'sha256':hashlib.sha256(raw).hexdigest(),'triangles':total,'objects':objects}

original=decode(ROOT/'original-human-prototype.glb');candidate=decode(ROOT/'eyelid-candidate-v3/eyelid-candidate-v3.glb')
build=json.loads((DOC/'build-receipt.json').read_text());protected=build['exactPreservedMeshes']
assert set(original['objects'])==set(candidate['objects']) and len(candidate['objects'])==31
for name in protected:
    for attribute in ['triangles','position','uv','morphPositions']:
        assert original['objects'][name][attribute]==candidate['objects'][name][attribute],(name,attribute)
assert candidate['triangles']==build['triangles']<=34000
for name in build['changedMeshes']:
    side='Left' if name.endswith('Left') else 'Right'
    assert 'expression.blink'+side in candidate['objects'][name]['morphPositions']
    assert 'corrective.blinkArc'+side in candidate['objects'][name]['morphPositions']
    assert 'corrective.height.blink'+side in candidate['objects'][name]['morphPositions']
report={'status':'PASS','exactTriangleExpandedProtectedMeshes':len(protected),'originalSha256':original['sha256'],
        'candidateSha256':candidate['sha256'],'triangles':candidate['triangles'],'meshCount':31,
        'candidateObjects':candidate['objects'],'limits':'Actual exported bytes checked. No real-time viewer, skeletal rig, material derivative adoption or realism acceptance.'}
(DOC/'glb-compatibility.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['candidateObjects','limits']}))
