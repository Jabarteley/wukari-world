"""Lossless removal of unused UV/tangent attributes from this static Blender export.

No geometry simplification, texture conversion, compression or decoder extension.
Textured materials retain UVs and normal-mapped materials retain explicit tangents.
"""
from pathlib import Path
import json
import struct

HERE=Path(__file__).resolve().parent

def compact(path):
    path=Path(path).resolve()
    assert HERE in path.parents
    raw=path.read_bytes(); size=struct.unpack_from('<I',raw,12)[0]
    doc=json.loads(raw[20:20+size]); data=raw[28+size:]
    assert not doc.get('skins') and not doc.get('animations')
    used=set()
    for mesh in doc['meshes']:
        for p in mesh['primitives']:
            m=doc['materials'][p['material']]
            if not m.get('normalTexture'):p['attributes'].pop('TANGENT',None)
            if not m.get('normalTexture') and not m['pbrMetallicRoughness'].get('baseColorTexture'):
                p['attributes'].pop('TEXCOORD_0',None)
            used.update(p['attributes'].values());used.add(p['indices'])
    amap={old:new for new,old in enumerate(sorted(used))}
    doc['accessors']=[doc['accessors'][i] for i in sorted(used)]
    for mesh in doc['meshes']:
        for p in mesh['primitives']:
            p['indices']=amap[p['indices']]
            p['attributes']={k:amap[v] for k,v in p['attributes'].items()}
    views={a['bufferView'] for a in doc['accessors']}|{i['bufferView'] for i in doc.get('images',[])}
    vmap={old:new for new,old in enumerate(sorted(views))}
    binary=bytearray();newviews=[]
    for i in sorted(views):
        v=doc['bufferViews'][i].copy();start=v.get('byteOffset',0)
        while len(binary)%4:binary.append(0)
        v['byteOffset']=len(binary);binary+=data[start:start+v['byteLength']];newviews.append(v)
    for a in doc['accessors']:
        assert not a.get('sparse');a['bufferView']=vmap[a['bufferView']]
    for i in doc.get('images',[]):i['bufferView']=vmap[i['bufferView']]
    doc['bufferViews']=newviews;doc['buffers']=[{'byteLength':len(binary)}]
    while len(binary)%4:binary.append(0)
    jb=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode();jb+=b' '*((-len(jb))%4)
    out=struct.pack('<III',0x46546c67,2,28+len(jb)+len(binary))+struct.pack('<II',len(jb),0x4e4f534a)+jb+struct.pack('<II',len(binary),0x004e4942)+binary
    path.write_bytes(out)
    return {'file':path.name,'beforeBytes':len(raw),'afterBytes':len(out),'removedBytes':len(raw)-len(out)}

if __name__=='__main__':
    print(json.dumps([compact(HERE/'artifacts'/f'street-{lod}.glb') for lod in ['near','far']]))
