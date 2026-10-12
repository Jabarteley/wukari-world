"""Pinned offline land-component probe. Exact source segments; no road-access claim."""
import argparse
import re
from collections import defaultdict
from decimal import Decimal
import hashlib
import json
from math import gcd
from pathlib import Path

SOURCE_SHA = '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255'
SOURCE_BYTES = 13287234
SCALE = 1000000000000000000

def sha(data): return hashlib.sha256(data).hexdigest()
def integer(value):
    scaled = Decimal(value) * SCALE
    if scaled != scaled.to_integral_value(): raise ValueError('Source coordinate precision exceeds exact integer grid')
    return int(scaled)
def ring_state(point, ring):
    x,y=point; inside=False
    for (ax,ay),(bx,by) in zip(ring,ring[1:]):
        cross=(x-ax)*(by-ay)-(y-ay)*(bx-ax)
        if cross==0 and min(ax,bx)<=x<=max(ax,bx) and min(ay,by)<=y<=max(ay,by): return 'boundary'
        if (ay>y)!=(by>y):
            lhs=(bx-ax)*(y-ay);rhs=(x-ax)*(by-ay)
            if (lhs>rhs if by>ay else lhs<rhs): inside=not inside
    return 'inside' if inside else 'outside'
def merge_intervals(lines, node_count):
    parent=list(range(node_count))
    def find(i):
        while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
        return i
    unions=overlap_pairs=unequal_intervals=0
    for edges in lines.values():
        edges.sort();max_end=None;representative=None;previous_interval=None
        for lo,hi,node in edges:
            if max_end is not None and lo<max_end:
                overlap_pairs+=1
                if (lo,hi)!=previous_interval:unequal_intervals+=1
                a,b=find(representative),find(node)
                if a!=b:parent[b]=a;unions+=1
                if hi>max_end:max_end=hi;representative=node;previous_interval=(lo,hi)
            else:max_end=hi;representative=node;previous_interval=(lo,hi)
    return parent, find, unions, overlap_pairs, unequal_intervals

def build(source,input_file,out,typescript=None,catalogue=False):
    raw=source.read_bytes()
    if len(raw)!=SOURCE_BYTES or sha(raw)!=SOURCE_SHA:raise ValueError('Pinned Natural Earth source bytes/hash mismatch')
    value=json.loads(raw,parse_float=Decimal)
    if catalogue:
        text=input_file.read_text(); match=re.search(r'Object\.freeze\(\[(.*?)\] satisfies readonly CityCatalogueRow\[\]\)',text,re.S)
        if not match:raise ValueError('Unsupported generated catalogue shape')
        rows=json.loads('['+re.sub(r',\s*$', '', match.group(1))+']',parse_float=Decimal)
        cities={'cities':[{'id':row[0],'countryISO':(row[7] if len(row)>7 else 'ng').upper(),'lon':row[4],'lat':row[5]} for row in rows],'priority':[]}
    else:cities=json.loads(input_file.read_text(),parse_float=Decimal)
    if len({city['id'] for city in cities['cities']})!=len(cities['cities']):raise ValueError('Duplicate city identity')
    polygons=[];by_iso=defaultdict(list);lines=defaultdict(list);unsupported=[];edge_count=0
    for feature in value['features']:
        props=feature['properties'];code=props.get('ISO_A2_EH');feature_key=str(props['NE_ID']);geometry=feature['geometry']
        if geometry['type'] not in ('Polygon','MultiPolygon'):raise ValueError('Nonpolygon country source')
        groups=[geometry['coordinates']] if geometry['type']=='Polygon' else geometry['coordinates']
        for position,rings in enumerate(groups):
            node=len(polygons);converted=[[(integer(p[0]),integer(p[1])) for p in ring] for ring in rings]
            if not converted or any(len(r)<4 or r[0]!=r[-1] for r in converted):raise ValueError('Malformed source ring')
            unsupported_wrap=any(abs(a[0]-b[0])>180*SCALE for ring in converted for a,b in zip(ring,ring[1:]))
            polygons.append({'key':f'{feature_key}:{position}','iso':code,'rings':converted,'unsupportedWrap':unsupported_wrap});by_iso[code].append(node)
            if unsupported_wrap:unsupported.append(polygons[-1]['key']);continue
            for ring in converted:
                for (ax,ay),(bx,by) in zip(ring,ring[1:]):
                    dx,dy=bx-ax,by-ay
                    if not dx and not dy:continue
                    divisor=gcd(abs(dx),abs(dy));dx//=divisor;dy//=divisor
                    if dx<0 or dx==0 and dy<0:dx=-dx;dy=-dy
                    # Exact infinite-line identity and projection interval. Overlap must have positive length.
                    key=(dx,dy,dx*ay-dy*ax);lo,hi=sorted((dx*ax+dy*ay,dx*bx+dy*by));lines[key].append((lo,hi,node));edge_count+=1
    parent, find, unions, overlap_pairs, unequal_intervals = merge_intervals(lines, len(polygons))
    ids={}
    for i,p in enumerate(polygons):
        root=find(i);ids[root]=min(ids.get(root,p['key']),p['key'])
    def classify(city):
        point=(integer(city['lon']),integer(city['lat']));matches=[];boundary=[]
        for node in by_iso.get(city['countryISO'],[]):
            p=polygons[node]
            if p['unsupportedWrap']:continue
            rings=p['rings'];states=[ring_state(point,rings[0])]
            if states[0]=='outside':continue
            states.extend(ring_state(point,r) for r in rings[1:])
            if 'boundary' in states:boundary.append(p['key'])
            elif states[0]=='inside' and all(s=='outside' for s in states[1:]):matches.append(node)
        comp=ids[find(matches[0])] if len(matches)==1 and not boundary else None
        return {'id':city['id'],'countryISO':city['countryISO'],'component':comp,'polygonKeys':[polygons[n]['key'] for n in matches],'boundaryPolygons':boundary}
    result={'schemaVersion':1,'sourceSha256':SOURCE_SHA,'sourceBytes':SOURCE_BYTES,'inputSha256':sha(input_file.read_bytes()),'generatorSha256':sha(Path(__file__).read_bytes()),'coordinateGrid':'exact decimal coordinates on 1e-18 integer grid; no rounding','polygonNodes':len(polygons),'componentCount':len(ids),'sourceEdges':edge_count,'unionCount':unions,'collinearOverlapComparisons':overlap_pairs,'unequalIntervalsCompared':unequal_intervals,'unsupportedAntimeridianPolygons':unsupported,'cities':[classify(c) for c in cities['cities']],'priority':[classify(c) for c in cities['priority']],'limitation':'Necessary mapped-land continuity only, not a verified road/legal access; unsupported wrap polygons fail closed'}
    out.write_text(json.dumps(result,indent=2)+'\n')
    if typescript:
        records=[[city['id'],city['lon'],city['lat'],city['countryISO'].lower(),result['cities'][index]['component']] for index,city in enumerate(cities['cities'])]
        def encode(v):
            if isinstance(v,Decimal):return str(v)
            if isinstance(v,list):return '['+','.join(encode(x) for x in v)+']'
            return json.dumps(v,separators=(',',':'))
        provenance={'schemaVersion':1,'sourceUrl':'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_10m_admin_0_countries.geojson','sourceSha256':SOURCE_SHA,'sourceBytes':SOURCE_BYTES,'licence':'Public domain','catalogueSha256':result['inputSha256'],'generatorSha256':result['generatorSha256'],'scope':'Necessary mapped-land continuity; not surveyed road connectivity or legal access'}
        text="// Generated by scripts/city/build-land-components.py. Regenerate whenever catalogue centres/countries change.\nimport type { CityLandComponentRow } from './generatedLinks.ts'\n\nexport const CITY_LAND_COMPONENT_PROVENANCE = "+json.dumps(provenance,separators=(',',':'))+" as const\nexport const GENERATED_CITY_LAND_COMPONENTS = [\n"+',\n'.join('  '+encode(row) for row in records)+"\n] as const satisfies readonly CityLandComponentRow[]\n"
        typescript.parent.mkdir(parents=True,exist_ok=True);typescript.write_text(text)
    print(json.dumps({k:v for k,v in result.items() if k not in ['cities']}));print('unknown current', [c for c in result['cities'] if c['component'] is None])
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);inputs=p.add_mutually_exclusive_group(required=True);inputs.add_argument('--cities',type=Path);inputs.add_argument('--catalogue',type=Path);p.add_argument('--out',type=Path,required=True);p.add_argument('--typescript',type=Path);a=p.parse_args();build(a.source,a.catalogue or a.cities,a.out,a.typescript,a.catalogue is not None)
