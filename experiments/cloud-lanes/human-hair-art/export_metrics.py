"""Measure actual exported GLB float buffers and identity node transforms."""
import hashlib
import json
from pathlib import Path
import struct

LANE=Path(__file__).resolve().parent
results={}
for f in sorted((LANE/'artifacts').glob('*/*.glb')):
    raw=f.read_bytes();n=struct.unpack_from('<I',raw,12)[0];d=json.loads(raw[20:20+n]);buf=raw[28+n:]
    bounds=[[float('inf')]*3,[-float('inf')]*3];vertices=0;triangles=0
    for node in d['nodes']:
        assert not any(k in node for k in ['matrix','translation','rotation','scale']),node
    for mesh in d['meshes']:
        for p in mesh['primitives']:
            a=d['accessors'][p['attributes']['POSITION']];v=d['bufferViews'][a['bufferView']]
            assert a['componentType']==5126 and a['type']=='VEC3'
            off=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',12)
            for i in range(a['count']):
                xyz=struct.unpack_from('<fff',buf,off+i*stride)
                for k,x in enumerate(xyz):bounds[0][k]=min(bounds[0][k],x);bounds[1][k]=max(bounds[1][k],x)
            vertices+=a['count'];triangles+=d['accessors'][p['indices']]['count']//3
    results[str(f.relative_to(LANE))]={'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'triangles':triangles,'exportedVertices':vertices,'decodedBoundsYUpMetres':bounds,'dimensionsMetres':[bounds[1][i]-bounds[0][i] for i in range(3)],'identityNodeTransforms':True,'meshPrimitives':sum(len(m['primitives']) for m in d['meshes']),'materialSlots':len(d['materials']),'textureBytes':0,'textureDimensions':[],'skins':len(d.get('skins',[])),'morphTargets':sum(len(p.get('targets',[])) for m in d['meshes'] for p in m['primitives'])}
(LANE/'export-metrics.json').write_text(json.dumps({'measurement':'float32 positions decoded from uncompressed GLB BIN; not surveyed human measurements','frame':'body metres Y-up +Z-forward','files':results},indent=2)+'\n')
print(json.dumps({k:{'bytes':v['bytes'],'triangles':v['triangles']} for k,v in results.items()},indent=2))
