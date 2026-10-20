#!/usr/bin/env python3
"""Offline OSM 0.6 XML adapter. No network, DTDs, entities or coordinate rounding."""
import json, sys, xml.etree.ElementTree as ET

def convert(data):
    if b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper() or b'\x00' in data:
        raise ValueError('DTD, entities and non-UTF8 XML encodings are unsupported')
    root=ET.fromstring(data)
    if root.tag!='osm' or root.attrib.get('version')!='0.6': raise ValueError('Expected OSM 0.6 XML')
    elements=[]
    for child in root:
        if child.tag in ('bounds','note','meta'): continue
        if child.tag not in ('node','way','relation'): raise ValueError('Unexpected OSM element')
        if child.attrib.get('visible')=='false' or child.attrib.get('action')=='delete': raise ValueError('Deleted objects unsupported')
        e=dict(type=child.tag,id=int(child.attrib['id']))
        for k in ('version','changeset','uid'):
            if k in child.attrib: e[k]=int(child.attrib[k])
        for k in ('timestamp','user'):
            if k in child.attrib: e[k]=child.attrib[k]
        if child.tag=='node': e.update(lon=float(child.attrib['lon']),lat=float(child.attrib['lat']))
        tags={}
        for t in child.findall('tag'):
            if t.attrib['k'] in tags: raise ValueError('Duplicate OSM tag')
            tags[t.attrib['k']]=t.attrib['v']
        if tags:e['tags']=tags
        allowed={'tag'}
        if child.tag=='way':
            e['nodes']=[int(n.attrib['ref']) for n in child.findall('nd')];allowed.add('nd')
        if child.tag=='relation':
            e['members']=[dict(type=m.attrib['type'],ref=int(m.attrib['ref']),role=m.attrib.get('role','')) for m in child.findall('member')];allowed.add('member')
        if any(c.tag not in allowed for c in child):raise ValueError('Unexpected child element')
        elements.append(e)
    return dict(version=0.6,elements=elements)
if __name__=='__main__':
    data=sys.stdin.buffer.read(32*1024*1024+1)
    if len(data)>32*1024*1024:raise ValueError('Extract exceeds 32 MiB; crop before importing')
    print(json.dumps(convert(data),allow_nan=False))
