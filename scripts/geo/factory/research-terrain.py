"""Clip a complete sourced coastline into a station terrain candidate."""
import hashlib,json,sys
from pathlib import Path
from shapely.geometry import Polygon,box,mapping
from shapely.validation import explain_validity
coast,closure,geometry,targets,out=map(Path,sys.argv[1:])
raw=json.loads(coast.read_text());proof=json.loads(closure.read_text());g=json.loads(geometry.read_text());t=json.loads(targets.read_text())
assert proof['waterSha256']==hashlib.sha256(coast.read_bytes()).hexdigest()
assert not raw['componentProof']['badEndpointDegrees'] and raw['componentProof']['status']=='CLOSED_TOPOLOGY_CANDIDATE'
assert raw['componentProof']['sourceSha256']==g['sourceSha256']==t['source']['sha256']
assert len(proof['containingRings'])==1
ring=proof['containingRings'][0];assert set(ring['sourceWays'])=={e['id'] for e in raw['elements']}
land=Polygon(ring['points'])
if not land.is_valid:raise ValueError(explain_validity(land))
meta=next(x for x in t['targets'] if x['city']['id']=='rothera');south,west,north,east=meta['boxes']['play'];window=box(west,south,east,north)
clipped=land.intersection(window)
assert clipped.is_valid and not clipped.is_empty
parts=list(clipped.geoms) if clipped.geom_type=='MultiPolygon' else [clipped]
assert all(p.geom_type=='Polygon' for p in parts)
polygons=[[[list(p) for p in polygon.exterior.coords]]+[[list(p) for p in hole.coords] for hole in polygon.interiors] for polygon in parts]
result={'kind':'station-coastal-terrain-candidate','station':'rothera','sourceSha256':g['sourceSha256'],'coastArtifactSha256':hashlib.sha256(coast.read_bytes()).hexdigest(),'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'sourceWays':ring['sourceWays'],'playBox':meta['boxes']['play'],'land':polygons,'sourceValidity':True,'clippedValidity':True,'status':'HOLD','limitations':['Clipped mainland component only; nearby islands and inland water not yet integrated.','Box edges are sampling edges, not physical shoreline.','Local plot is source geometry review, not game renderer or acceptance.','No building heights, current-use claims or fabricated streets.']}
out.mkdir(parents=True,exist_ok=True);(out/'terrain-candidate.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import math
origin=(-68.1248,-67.568889)
def xy(points):return ([(p[0]-origin[0])*111195*math.cos(math.radians(origin[1])) for p in points],[(p[1]-origin[1])*111195 for p in points])
fig,ax=plt.subplots(figsize=(10,10));ax.set_facecolor('#c9e3ec')
for polygon in polygons:
 ax.fill(*xy(polygon[0]),color='#edf1e9',edgecolor='#354f4b',linewidth=1)
 for hole in polygon[1:]:ax.fill(*xy(hole),color='#c9e3ec')
for f in g['features']:
 if 'rothera' not in f['nearbyQueries']:continue
 if f['tags'].get('building'):ax.fill(*xy(f['points']),color='#566980',alpha=.85)
 elif f['tags'].get('aeroway')=='runway':ax.plot(*xy(f['points']),color='#222222',linewidth=2)
ax.set_xlim(-800,800);ax.set_ylim(-850,650);ax.set_aspect('equal');ax.set_xlabel('East of reference point (approximate metres)');ax.set_ylabel('North of reference point (approximate metres)');ax.set_title('Rothera: sourced coast and mapped facility footprints\nHistorical/disputed buildings retained for comparison only');ax.grid(alpha=.2)
fig.text(.06,.02,'OSM contributors, ODbL. Snapshot 2026-10-08. Geometry diagnostic; not gameplay or current-use acceptance.',fontsize=8)
fig.savefig(out/'rothera-terrain-review.png',dpi=140,bbox_inches='tight');plt.close(fig)
print(json.dumps({'sourceVertices':len(ring['points']),'polygons':len(polygons),'clippedVertices':sum(len(r) for p in polygons for r in p),'status':'HOLD'}))
