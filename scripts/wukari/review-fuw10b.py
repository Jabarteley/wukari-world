"""Keep provider layers separate; audit machine detections without conflating building identities."""
import sys,json,pathlib,math,hashlib,collections
ROOT=pathlib.Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'.cache/wukari/phase10-tools'))
from shapely.geometry import shape,Polygon,mapping
from shapely.ops import transform
from shapely.strtree import STRtree
from shapely.validation import explain_validity
CACHE=ROOT/'.cache/wukari/phase10b';OUT=ROOT/'data/wukari/phase10b'
def load(p):return json.loads(p.read_text(encoding='utf-8'))
def save(p,j):p.write_text(json.dumps(j,separators=(',',':'),ensure_ascii=False,default=str)+'\n',encoding='utf-8')
study=load(OUT/'fuw-osm.json');report=load(OUT/'osm-report.json');origin=study['origin'];factor=6371008.8*math.pi/180
def local(g):return transform(lambda x,y,z=None:((x-origin[0])*factor*math.cos(math.radians(9)),(origin[1]-y)*factor),g)
osm=[];polygons=[];ids=[]
for kind,features in [('road',study['roads']),('building',study['buildings'])]:
 for f in features:
  geom={'type':'Polygon','coordinates':[f['coordinates']]} if kind=='building' else {'type':'LineString','coordinates':f['coordinates']}
  item={'type':'Feature','id':'way/'+str(f['id']),'geometry':geom,'properties':{k:v for k,v in f.items() if k not in ['points','coordinates']},'confidence':'OSM mapped geometry; function/ownership/access unverified'};osm.append(item)
  if kind=='building':
   g=local(shape(geom))
   if g.is_valid and g.area>0:polygons.append(g);ids.append(item['id'])
for n in report['entrances']:osm.append({'type':'Feature','id':'node/'+str(n['id']),'geometry':{'type':'Point','coordinates':n['coordinates']},'properties':n,'confidence':'Unnamed OSM entrance; not identified as FUW gate'})
tree=STRtree(polygons);audit=[];invalid=[];layers=[{'id':'osm','title':'Local OSM roads/buildings/entrances','license':'ODbL1.0','color':'#416c78','note':'Original source coordinates/IDs, no campus ownership assigned','features':osm}]
def comparison(f):
 g=local(shape(f['geometry']))
 if not g.is_valid or g.area<=0:return {'status':'invalid-review-only','reason':explain_validity(g)}
 matches=[]
 for i in tree.query(g.buffer(3)):
  b=polygons[int(i)];inter=g.intersection(b).area;iou=inter/g.union(b).area;overlap=inter/min(g.area,b.area);d=g.centroid.distance(b.centroid)
  if iou>.5 or overlap>.7 or d<3:status='probable-duplicate'
  elif inter>.5:status='geometry-mismatch'
  else:continue
  matches.append({'osmId':ids[int(i)],'iou':iou,'smallerAreaOverlap':overlap,'centroidDistanceM':d,'status':status})
 return {'status':'probable-duplicate' if any(m['status']=='probable-duplicate' for m in matches) else 'geometry-mismatch' if matches else 'additional-machine-candidate','matches':matches,'areaM2':g.area,'institutionAssociation':None,'gameplayUse':False}
ms=load(CACHE/'microsoft-buildings.geojson');ms_features=[]
for f in ms['features']:
 review=comparison(f);item={**f,'confidence':'Machine-detected footprint, unverified on site','properties':{**f.get('properties',{}),'review':review}};ms_features.append(item);audit.append({'provider':'Microsoft','id':f['id'],**review})
layers.append({'id':'microsoft','title':'Microsoft footprint comparison','license':'CDLA-Permissive2.0 (2026-08-13 source)','color':'#b97b2e','note':'Separate comparison layer; duplicates/mismatches not imported into gameplay','features':ms_features})
counts=[];provenance=[];namedPlaces=[];licenseUnknown=[]
knownLicenses={'OpenStreetMap':'ODbL-1.0','Google Open Buildings':'CC-BY-4.0 (Overture upstream attribution documentation)','Microsoft ML Buildings':'ODbL-1.0 (Overture contribution version)','ESA WorldCover':'CC-BY-4.0','meta':'CDLA-Permissive-2.0','Overture':'CDLA-Permissive-2.0'}
for file in sorted(CACHE.glob('overture-*.geojson')):
 data=load(file);name=file.stem.replace('overture-','');theme=name.split('-')[0];features=[]
 for f in data['features']:
  sources=f['properties'].get('sources',[]);review=comparison(f) if theme=='buildings' else {'status':'source-record-review','institutionAssociation':None,'gameplayUse':False}
  licenseReview={'theme':data.get('licenseFromCatalog'),'upstream':[{'dataset':s.get('dataset'),'license':s.get('license') or knownLicenses.get(s.get('dataset'))} for s in sources],'resolved':bool(sources) and all(s.get('license') or s.get('dataset') in knownLicenses for s in sources)}
  if not licenseReview['resolved']:licenseUnknown.append({'id':f['id'],'sources':sources})
  features.append({**f,'confidence':'Provider feature, not field verified or university-owned by inference','properties':{**f['properties'],'review':review,'licenseReview':licenseReview}})
  if theme=='places':namedPlaces.append({'id':f['id'],'names':f['properties'].get('names'),'geometry':f['geometry'],'sources':sources,'association':'Source POI only; no building/gate identity established'})
  provenance.append({'id':f['id'],'type':name,'sources':sources,'catalogLicense':data.get('licenseFromCatalog'),'review':review})
  if review.get('status')=='invalid-review-only':invalid.append({'id':f['id'],**review})
 existing=next((l for l in layers if l['id']=='overture-'+theme),None)
 if not existing:existing={'id':'overture-'+theme,'title':'Overture '+theme,'license':data.get('licenseFromCatalog','Inspect per-feature/provider terms'),'color':{'buildings':'#805ca0','transportation':'#7554ad','places':'#c5445b','base':'#4f9a5f'}[theme],'note':'Release2026-10-21.0; source properties retained, not automatically independent of OSM','features':[]};layers.append(existing)
 existing['features'].extend(features);counts.append({'layer':name,'count':len(features),'license':data.get('licenseFromCatalog'),'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
for l in layers:
 if l['id']=='overture-base':l['license']='ODbL-1.0 + CC-BY-4.0; per-feature upstream terms retained'
 if l['id']=='overture-places':l['license']='CDLA-Permissive-2.0 (Meta/Overture per-feature terms)'
summary={'candidate':report['candidate'],'osm':report['coverage'],'mappedPaths':[{'id':r['id'],'distanceM':r['distanceM'],'tags':r['tags']} for r in study['roads'] if r['tags'].get('highway') in ['path','footway','pedestrian']],'roadConflicts':dict(collections.Counter(c['kind'] for c in study['roadConflicts'])),'overture':counts,'microsoft':{'count':len(ms_features),'classification':dict(collections.Counter(x['status'] for x in audit)),'tile':load(CACHE/'microsoft-selected-tiles.json')},'providerSourceCounts':dict(collections.Counter(str(s.get('dataset')) for p in provenance for s in p['sources'])),'namedPlaces':namedPlaces,'unresolvedLicenses':licenseUnknown,'invalid':invalid,'gateSpawn':None,'campusBoundary':None,'landmarkAssociations':0,'rule':'No duplicate, mismatch, machine confidence or nearby POI establishes university ownership or a gate.'}
save(OUT/'footprint-audit.json',audit);save(OUT/'overture-provenance.json',provenance);save(OUT/'open-coverage.json',summary)
view={'schemaVersion':1,'origin':origin,'candidate':report['candidate'],'secondGate':report['secondGate'],'landmarks':report['landmarks'],'layers':layers,'conclusion':report['gateConclusion'],'campusBoundary':None,'spawn':None,'sources':[{'title':'OpenStreetMap contributors / existing Geofabrik Nigeria extract','url':'https://www.openstreetmap.org/copyright','note':'ODbL1.0. Original IDs, tags and coordinates; no main-gate identity.'},{'title':'Overture Maps Foundation attribution and licensing','url':'https://docs.overturemaps.org/attribution/','note':'Release2026-10-21.0; per-feature sources retained; OSM-derived geometry is not independent corroboration.'},{'title':'Microsoft Global ML Building Footprints','url':'https://github.com/microsoft/GlobalMLBuildingFootprints','note':'2026-08-13 index, Nigeria quadkey122221301, CDLA-Permissive2.0; machine detection, not a cadastral survey.'},{'title':'Google Open Buildings / Overture upstream contributor','url':'https://sites.research.google/open-buildings/','note':'CC-BY4.0 open building detections, distinct from protected Google Maps screenshots. No screenshots traced.'},{'title':'ESA WorldCover project2021 / contains modified Copernicus Sentinel data2021','url':'https://esa-worldcover.org/en/data-access','note':'CC-BY4.0; historical coarse ground-cover source, not surveyed present campus landscaping.'},{'title':'Meta and Overture places contributors','url':'https://docs.overturemaps.org/attribution/#places','note':'CDLA-Permissive2.0; provider POIs do not establish named-building or entrance identity.'}]}
save(OUT/'fuw-open.json',view);print(json.dumps(summary,indent=2))
