#!/usr/bin/env python3
"""Land outlines round Lagos Island from the Maxar 2019 Lagos Mosaic (0.5 m, CC BY-NC 4.0, OpenAerialMap; the roof-colour imagery).

Usage: python -I scripts/geo/sample-shoreline-imagery.py public/realworld/lagos-island
OpenStreetMap has no closed ring for the island here (it is bounded by the lagoon and harbour relations), so the shore is read from the
imagery: a wide box is read at 4 m (from the file's overviews), water is the dark blue-green low-texture class, land everything else;
the mask is cleaned (holes under 4 ha filled, specks dropped) and traced. Writes land.json: [[ [x, z], ... ], ...] rings in street
metres (src/geo/frame.ts origin 3.4E 6.45N), outer boundaries of land only, simplified to 3 m.
"""
import json, math, sys
from pathlib import Path
import numpy as np
import rasterio
from rasterio.features import shapes
from rasterio.windows import from_bounds
from rasterio.enums import Resampling
from pyproj import Transformer
from scipy import ndimage
from shapely.geometry import shape

area = Path(sys.argv[1])
URL = '/vsicurl/https://oin-hotosm-temp.s3.amazonaws.com/5ea1b2b4411bed00056803b1/0/5ea1b2b4411bed00056803b2.tif'
SOUTH, WEST, NORTH, EAST = 6.425, 3.36, 6.475, 3.43
RES = 4.0
R, DEG, UPK = 6371.0088, math.pi / 180, 10
UPD_LAT = R * DEG * UPK; UPD_LON = UPD_LAT * math.cos(9 * DEG)
def project(lon, lat): return (lon - 8) * UPD_LON, (9 - lat) * UPD_LAT
ORIGIN = tuple(round(v) for v in project(3.4, 6.45))
def to_metres(lon, lat): x, z = project(lon, lat); return [round((x - ORIGIN[0]) * 100, 1), round((z - ORIGIN[1]) * 100, 1)]

with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR'):
    with rasterio.open(URL) as src:
        fwd = Transformer.from_crs('EPSG:4326', src.crs, always_xy=True); back = Transformer.from_crs(src.crs, 'EPSG:4326', always_xy=True)
        x0, y0 = fwd.transform(WEST, SOUTH); x1, y1 = fwd.transform(EAST, NORTH)
        win = from_bounds(min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1), src.transform)
        h, w = int(win.height * abs(src.transform.e) / RES), int(win.width * src.transform.a / RES)
        rgb = src.read([1, 2, 3], window=win, out_shape=(3, h, w), resampling=Resampling.average, boundless=True, fill_value=0).astype(np.float32)
        tr = src.window_transform(win) * rasterio.Affine.scale(win.width / w, win.height / h)
r, g, b = rgb
nodata = (r + g + b) < 3
bright = (r + g + b) / 3
texture = ndimage.generic_filter(bright, np.std, size=3)
water = ((b > r + 12) & (bright < 105) & (texture < 14)) | nodata
land = ~water
land = ndimage.binary_opening(land, iterations=2)
land = ndimage.binary_closing(land, iterations=2)
# Fill small holes (courtyards, dark roofs read as water) and drop specks (boats, buoys).
labels, n = ndimage.label(~land); sizes = ndimage.sum(np.ones_like(labels), labels, range(1, n + 1))
for i, s in enumerate(sizes, start=1):
    if s * RES * RES < 40000: land[labels == i] = True
labels, n = ndimage.label(land); sizes = ndimage.sum(np.ones_like(labels), labels, range(1, n + 1))
for i, s in enumerate(sizes, start=1):
    if s * RES * RES < 20000: land[labels == i] = False
rings = []
for geom, value in shapes(land.astype(np.uint8), mask=land, transform=tr):
    poly = shape(geom).simplify(3.0)
    if poly.area < 20000: continue
    ext = list(poly.exterior.coords)
    rings.append([to_metres(*back.transform(x, y)) for x, y in ext])
json.dump({'source': 'Maxar 2019 Lagos Mosaic (CC BY-NC 4.0) land/water classification at 4 m', 'box': [SOUTH, WEST, NORTH, EAST], 'rings': rings}, open(area / 'land.json', 'w'))
print('grid', land.shape, 'land share', round(float(land.mean()), 3), 'rings', len(rings), [len(r) for r in rings][:8])
