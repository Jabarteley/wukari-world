#!/usr/bin/env python3
"""Trees for a box from the Meta / WRI global 1 m canopy height map (Tolan et al. 2024, CC BY 4.0).

Usage: python -I scripts/geo/sample-canopy.py <out.json> [quadkey]
Reads only the box window of s3://dataforgood-fb-data/forests/v1/alsgedi_global_v6_float/chm/<quadkey>.tif (cloud-optimised, by HTTP
range requests), finds crowns as local height maxima (>= 3 m, 5 m apart), and writes one tree per crown: street metres (x east,
z south, src/geo/frame.ts origin 3.4E 6.45N), crown top height and a crown radius from the area above half that height.
"""
import json, math, sys
import numpy as np
import rasterio
from rasterio.windows import from_bounds
from pyproj import Transformer
from scipy import ndimage

out_path = sys.argv[1]
quadkey = sys.argv[2] if len(sys.argv) > 2 else '122220320'
SOUTH, WEST, NORTH, EAST = 6.445, 3.383, 6.462, 3.403
url = f'/vsicurl/https://dataforgood-fb-data.s3.amazonaws.com/forests/v1/alsgedi_global_v6_float/chm/{quadkey}.tif'

R, DEG, UPK = 6371.0088, math.pi / 180, 10
UPD_LAT = R * DEG * UPK; UPD_LON = UPD_LAT * math.cos(9 * DEG)
def project(lon, lat): return (lon - 8) * UPD_LON, (9 - lat) * UPD_LAT
ORIGIN = tuple(round(v) for v in project(3.4, 6.45))
def to_metres(lon, lat):
    x, z = project(lon, lat); return round((x - ORIGIN[0]) * 100, 2), round((z - ORIGIN[1]) * 100, 2)

with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif'):
    with rasterio.open(url) as src:
        to_src = Transformer.from_crs('EPSG:4326', src.crs, always_xy=True)
        x0, y0 = to_src.transform(WEST, SOUTH); x1, y1 = to_src.transform(EAST, NORTH)
        window = from_bounds(min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1), src.transform)
        chm = src.read(1, window=window).astype(np.float32)
        transform = src.window_transform(window); crs = src.crs; res = abs(transform.a)
print('window', chm.shape, 'res', res, 'crs', crs, 'max', float(np.nanmax(chm)))
chm = np.nan_to_num(chm, nan=0.0)
smooth = ndimage.gaussian_filter(chm, 1.0)
spacing = max(3, int(round(5 / res)))
peaks = (smooth == ndimage.maximum_filter(smooth, size=spacing)) & (smooth >= 3.0)
labels, _ = ndimage.label(peaks)
to_geo = Transformer.from_crs(crs, 'EPSG:4326', always_xy=True)
trees = []
for (r, c) in ndimage.center_of_mass(peaks, labels, range(1, labels.max() + 1)):
    r, c = int(round(r)), int(round(c)); h = float(chm[r, c])
    if h < 3: continue
    # Crown radius: the area within 8 m above half the top height, as a disc.
    rad = int(8 / res); sub = chm[max(0, r - rad):r + rad + 1, max(0, c - rad):c + rad + 1]
    crown = math.sqrt(float((sub > h * 0.5).sum()) * res * res / math.pi)
    x, y = rasterio.transform.xy(transform, r, c); lon, lat = to_geo.transform(x, y)
    mx, mz = to_metres(lon, lat)
    trees.append([mx, mz, round(h, 1), round(min(max(crown, 1.2), 9.0), 1)])
json.dump({ 'source': f'Meta/WRI Global Canopy Height 1 m (alsgedi_global_v6_float/chm/{quadkey}.tif), CC BY 4.0', 'box': [SOUTH, WEST, NORTH, EAST], 'trees': trees }, open(out_path, 'w'))
print('trees', len(trees), 'heights p50', np.percentile([t[2] for t in trees], 50) if trees else None)
