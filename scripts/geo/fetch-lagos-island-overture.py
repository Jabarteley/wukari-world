"""Fetches the Overture Maps buildings inside the Lagos Island box into scripts/geo/sources/lagos-island/overture-buildings.geojson.

  python3 -m venv /tmp/overture-venv && /tmp/overture-venv/bin/pip install duckdb
  /tmp/overture-venv/bin/python scripts/geo/fetch-lagos-island-overture.py

Overture buildings theme, release 2026-09-23.1, anonymous S3 (us-west-2). ODbL 1.0, © OpenStreetMap contributors, Overture Maps Foundation.
Box (same as fetch-lagos-island-osm.ts): south 6.445, west 3.383, north 6.462, east 3.403. Only the bbox struct is filtered, so few row groups are read.
"""
import argparse, hashlib, json, os, duckdb

RELEASE = '2026-09-23.1'
ap = argparse.ArgumentParser()
ap.add_argument('--box', default='6.445,3.383,6.462,3.403', help='south,west,north,east')
ap.add_argument('--out', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sources', 'lagos-island'), help='output directory')
ap.add_argument('--places', action='store_true', help='fetch Overture places (overture-places.json) instead of buildings')
args = ap.parse_args()
SOUTH, WEST, NORTH, EAST = (float(v) for v in args.box.split(','))
os.makedirs(args.out, exist_ok=True)
OUT = os.path.join(args.out, 'overture-buildings.geojson')

con = duckdb.connect()
con.execute('INSTALL spatial; LOAD spatial; INSTALL httpfs; LOAD httpfs; SET s3_region=\'us-west-2\';')
if args.places:
  # Same query as the one-off Lagos Island run: names.primary, basic_category, confidence, point; box contained by the bbox struct.
  prow = con.execute(f"""
    SELECT names.primary, basic_category, confidence, ST_X(geometry), ST_Y(geometry)
    FROM read_parquet('s3://overturemaps-us-west-2/release/{RELEASE}/theme=places/type=place/*', hive_partitioning=1)
    WHERE bbox.xmin >= {WEST} AND bbox.xmax <= {EAST} AND bbox.ymin >= {SOUTH} AND bbox.ymax <= {NORTH}
  """).fetchall()
  text = json.dumps([{'name': r[0], 'category': r[1], 'confidence': r[2], 'lon': r[3], 'lat': r[4]} for r in prow])
  open(os.path.join(args.out, 'overture-places.json'), 'w').write(text)
  from collections import Counter
  print(len(prow), 'places', len(text.encode()), 'bytes', hashlib.sha256(text.encode()).hexdigest(), Counter(r[1] for r in prow).most_common(6))
  raise SystemExit
rows = con.execute(f"""
  SELECT id, height, num_floors, class, subtype, list_transform(sources, s -> s.dataset) AS datasets, ST_AsGeoJSON(geometry) AS geom
  FROM read_parquet('s3://overturemaps-us-west-2/release/{RELEASE}/theme=buildings/type=building/*', filename=false, hive_partitioning=1)
  WHERE bbox.xmin <= {EAST} AND bbox.xmax >= {WEST} AND bbox.ymin <= {NORTH} AND bbox.ymax >= {SOUTH}
  ORDER BY id
""").fetchall()

def build(decimals):
  features = []
  for id_, height, floors, cls, subtype, datasets, geom in rows:
    g = json.loads(geom)
    polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    for i, poly in enumerate(polys):
      ring = [[round(x, decimals), round(y, decimals)] for x, y in poly[0]]
      props = {'id': id_ if i == 0 else f'{id_}:{i}', 'height': height, 'num_floors': floors, 'class': cls, 'subtype': subtype, 'sources': sorted(set(datasets or []))}
      features.append({'type': 'Feature', 'properties': props, 'geometry': {'type': 'Polygon', 'coordinates': [ring]}})
  return json.dumps({'type': 'FeatureCollection', 'release': RELEASE, 'box': [SOUTH, WEST, NORTH, EAST], 'features': features}, separators=(',', ':'))

text = build(7)
if len(text.encode()) > 4_000_000: text = build(6)
open(OUT, 'w').write(text)
print(len(rows), 'rows', len(text.encode()), 'bytes', hashlib.sha256(text.encode()).hexdigest())
