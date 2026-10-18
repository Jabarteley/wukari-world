#!/usr/bin/env python3
"""Tree crowns for the Lagos Island box from the Maxar 2019 Lagos Mosaic (0.5 m, CC BY-NC 4.0, OpenAerialMap), the imagery the roof
colours come from (scripts/geo/sample-roof-colours.py; same licence note: non-commercial use, attribution
"Imagery (c) 2019 Maxar Technologies, CC BY-NC 4.0").

Usage: python -I scripts/geo/sample-trees-imagery.py public/realworld/lagos-island
Reads world.json (building footprints, street metres), reads the box window of the mosaic by HTTP range requests, marks vegetation
(excess green 2G-R-B over a threshold, outside footprints), and splits it into crowns: local maxima of the distance to the mask's edge,
at least 3 m apart, each at least 1.2 m across. Writes canopy.json: [x, z, height, crown radius] per tree, height estimated from crown
size (about 2.3 x radius + 2.5 m, capped at 22 m) since the imagery has no heights.
"""
import json, math, sys
from pathlib import Path
import numpy as np
import rasterio
from rasterio.features import geometry_mask
from rasterio.windows import from_bounds
from pyproj import Transformer
from scipy import ndimage

area = Path(sys.argv[1]); world = json.load(open(area / 'world.json'))
URL = '/vsicurl/https://oin-hotosm-temp.s3.amazonaws.com/5ea1b2b4411bed00056803b1/0/5ea1b2b4411bed00056803b2.tif'
SOUTH, WEST, NORTH, EAST = 6.445, 3.383, 6.462, 3.403
R, DEG, UPK = 6371.0088, math.pi / 180, 10
UPD_LAT = R * DEG * UPK; UPD_LON = UPD_LAT * math.cos(9 * DEG)
def project(lon, lat): return (lon - 8) * UPD_LON, (9 - lat) * UPD_LAT
ORIGIN = tuple(round(v) for v in project(3.4, 6.45))
def from_metres(x, z): x, z = x / 100 + ORIGIN[0], z / 100 + ORIGIN[1]; return 8 + x / UPD_LON, 9 - z / UPD_LAT
def to_metres(lon, lat): x, z = project(lon, lat); return round((x - ORIGIN[0]) * 100, 2), round((z - ORIGIN[1]) * 100, 2)

with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR'):
    with rasterio.open(URL) as src:
        fwd = Transformer.from_crs('EPSG:4326', src.crs, always_xy=True); back = Transformer.from_crs(src.crs, 'EPSG:4326', always_xy=True)
        x0, y0 = fwd.transform(WEST, SOUTH); x1, y1 = fwd.transform(EAST, NORTH)
        window = from_bounds(min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1), src.transform)
        rgb = src.read([1, 2, 3], window=window).astype(np.float32); transform = src.window_transform(window); res = abs(transform.a)
print('window', rgb.shape, 'res', res)
r, g, b = rgb / 255.0
exg = 2 * g - r - b
brightness = (r + g + b) / 3
veg = (exg > 0.07) & (brightness > 0.08) & (g > r) & (g > b)
shapes = []
for bld in world['buildings']:
    ring = [fwd.transform(*from_metres(x, z)) for x, z in bld['ring']]
    if len(ring) >= 3: shapes.append({'type': 'Polygon', 'coordinates': [ring + [ring[0]]]})
inside = ~geometry_mask(shapes, out_shape=veg.shape, transform=transform, all_touched=False)
veg &= ~inside
veg = ndimage.binary_opening(veg, iterations=1); veg = ndimage.binary_closing(veg, iterations=2)
dist = ndimage.distance_transform_edt(veg) * res
min_gap = max(3, int(round(3.0 / res)))
peaks = (dist == ndimage.maximum_filter(dist, size=min_gap)) & (dist >= 0.6)
labels, n = ndimage.label(peaks)
trees = []
for (row, col) in ndimage.center_of_mass(peaks, labels, range(1, n + 1)):
    row, col = int(round(row)), int(round(col)); radius = float(dist[row, col]) * 1.15
    x, y = rasterio.transform.xy(transform, row, col); lon, lat = back.transform(x, y); mx, mz = to_metres(lon, lat)
    height = min(22.0, 2.3 * radius + 2.5)
    trees.append([mx, mz, round(height, 1), round(min(radius, 10.0), 1)])
json.dump({'source': 'Maxar 2019 Lagos Mosaic via OpenAerialMap (CC BY-NC 4.0): vegetation mask, crowns from its distance transform', 'trees': trees}, open(area / 'canopy.json', 'w'))
print('vegetation share', round(float(veg.mean()), 3), 'trees', len(trees), 'radius p50', np.percentile([t[3] for t in trees], 50) if trees else None)
