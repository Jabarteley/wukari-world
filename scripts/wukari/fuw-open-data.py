"""Bounded public open-data research. All tools/artifacts stay in the project cache."""
import sys, json, pathlib, time, hashlib, csv, io, gzip, math
ROOT=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'.cache/wukari/phase10-tools'))
import requests
CACHE=ROOT/'.cache/wukari/phase10b'; CACHE.mkdir(parents=True,exist_ok=True)
BBOX=[9.762370,7.828357,9.792370,7.858357] # Fixed research window, not a campus extent.
def get(url):
    r=requests.get(url,timeout=60);r.raise_for_status();return r
def dump(name,value):
    (CACHE/name).write_text(json.dumps(value,indent=2,default=str)+'\n',encoding='utf-8')
def catalog():
    top=get('https://stac.overturemaps.org/catalog.json').json();dump('overture-catalog.json',top)
    release='2026-10-21.0'; result={'release':release,'observedLatest':top['latest'],'bbox':BBOX,'layers':[]}
    for theme,kind in [('buildings','building'),('transportation','segment'),('transportation','connector'),('places','place'),('base','infrastructure'),('base','land_use'),('base','land_cover')]:
        url=f'https://stac.overturemaps.org/{release}/{theme}/{kind}/collection.json'
        try:
            j=get(url).json();dump(f'{theme}-{kind}-collection.json',j);result['layers'].append({'theme':theme,'type':kind,'catalog':url,'license':j.get('license'),'assets':j.get('assets'),'links':j.get('links')});print(theme,kind,str(j)[:1500],flush=True)
        except Exception as e:result['layers'].append({'theme':theme,'type':kind,'error':str(e)})
    dump('catalog-summary.json',result)
def overture():
    import duckdb
    from shapely import wkb
    from shapely.geometry import mapping,box
    manifest=json.loads((CACHE/'catalog-summary.json').read_text(encoding='utf-8'));release=manifest['release']
    con=duckdb.connect();ext=ROOT/'.cache/wukari/phase10-tools/extensions';ext.mkdir(exist_ok=True)
    con.execute("SET extension_directory='"+str(ext).replace('\\','/')+"'");con.execute("SET memory_limit='768MB'");con.execute('SET threads=2');con.execute('INSTALL httpfs');con.execute('LOAD httpfs');con.execute("SET s3_region='us-west-2'");con.execute("SET http_timeout=45000");con.execute('SET http_retries=1')
    records=[];area=box(*BBOX)
    for layer in manifest['layers']:
        theme,kind=layer['theme'],layer['type'];dest=CACHE/f'overture-{theme}-{kind}.geojson'
        if dest.exists():print('cached',dest.name,flush=True);continue
        uri=f's3://overturemaps-us-west-2/release/{release}/theme={theme}/type={kind}/*'
        start=time.time();print('query',theme,kind,flush=True)
        try:
            collection=json.loads((CACHE/f'{theme}-{kind}-collection.json').read_text(encoding='utf-8'))
            extents=collection['extent']['spatial']['bbox'][1:];items=[x for x in collection['links'] if x['rel']=='item'];assets=[];selected=[]
            # Current release catalogs list a global extent followed by item extents, in item order.
            # Verify corresponding item bbox before using this release-specific optimization.
            if len(extents)!=len(items):raise ValueError('Catalog extent/item ordering requires reinspection')
            for e,item in zip(extents,items):
                if not(e[0]<=BBOX[2] and e[2]>=BBOX[0] and e[1]<=BBOX[3] and e[3]>=BBOX[1]):continue
                part=get(item['href']).json();dump(f'{theme}-{kind}-item-{part["id"]}.json',part)
                if list(part['bbox'])!=list(e):raise ValueError('Extent/item mismatch; refuse incomplete selection')
                selected.append({'url':item['href'],'bbox':e,'assets':part['assets']})
                # AWS/Azure are mirrors of the same file, not additive datasets.
                asset=part['assets'].get('azure') or part['assets'].get('aws')
                if not asset:raise ValueError('No recognized parquet asset')
                assets.append(asset['href'])
            if not assets:dump(dest.name,{'type':'FeatureCollection','release':release,'bbox':BBOX,'features':[],'selectedItems':selected});continue
            paths='['+','.join("'"+u+"'" for u in assets)+']'
            query=f"SELECT * EXCLUDE(geometry), geometry AS source_geometry FROM read_parquet({paths},hive_partitioning=true) WHERE bbox.xmin <= {BBOX[2]} AND bbox.xmax >= {BBOX[0]} AND bbox.ymin <= {BBOX[3]} AND bbox.ymax >= {BBOX[1]}"
            cursor=con.execute(query);names=[d[0] for d in cursor.description];features=[]
            for row in cursor.fetchall():
                p=dict(zip(names,row));raw=p.pop('source_geometry');geom=wkb.loads(bytes(raw))
                if not geom.intersects(area):continue
                features.append({'type':'Feature','id':p['id'],'geometry':mapping(geom),'properties':p})
            value={'type':'FeatureCollection','release':release,'bbox':BBOX,'licenseFromCatalog':layer.get('license'),'query':query,'selectedItems':selected,'features':features};dump(dest.name,value)
            records.append({'theme':theme,'type':kind,'count':len(features),'seconds':time.time()-start,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()});print(records[-1],flush=True)
        except Exception as e:records.append({'theme':theme,'type':kind,'error':str(e)});print(records[-1],flush=True)
        dump('overture-query-results.json',records)
def microsoft():
    from shapely.geometry import shape,box
    url='https://bfppub.blob.core.windows.net/%24web/2026-08-13/dataset-links.csv'
    text=get(url).text; (CACHE/'microsoft-dataset-links.csv').write_text(text,encoding='utf-8');rows=list(csv.DictReader(io.StringIO(text)))
    def tile(lon,lat,z=9):
        n=2**z;x=int((lon+180)/360*n);y=int((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*n);return ''.join(str((1 if x&(1<<i) else 0)+(2 if y&(1<<i) else 0)) for i in range(z-1,-1,-1))
    keys={tile(lon,lat) for lon in [BBOX[0],BBOX[2]] for lat in [BBOX[1],BBOX[3]]};chosen=[r for r in rows if str(r.get('QuadKey','')) in keys and r.get('Location')=='Nigeria'];dump('microsoft-selected-tiles.json',{'indexUrl':url,'indexSha256':hashlib.sha256(text.encode()).hexdigest(),'quadkeys':list(keys),'tiles':chosen});print('Microsoft tiles',chosen,flush=True)
    features=[];area=box(*BBOX)
    for row in chosen:
        link=row['Url'];response=requests.get(link,stream=True,timeout=60);response.raise_for_status();response.raw.decode_content=False
        with gzip.GzipFile(fileobj=response.raw) as stream:
            for i,line in enumerate(stream):
                f=json.loads(line);geom=shape(f['geometry'])
                if geom.intersects(area):f['id']='ms:'+row['QuadKey']+':'+str(i);f['properties']={**f.get('properties',{}),'sourceUrl':link,'quadkey':row['QuadKey'],'lineIndex':i,'provider':'Microsoft Global ML Building Footprints','geometrySha256':hashlib.sha256(json.dumps(f['geometry'],sort_keys=True).encode()).hexdigest()};features.append(f)
    dump('microsoft-buildings.geojson',{'type':'FeatureCollection','bbox':BBOX,'sourceIndex':url,'features':features});print('Microsoft bounded buildings',len(features),flush=True)
if __name__=='__main__':globals()[sys.argv[1]]()
