#!/usr/bin/env python3
"""Export the Lagos Island box of the Maxar 2019 Lagos Mosaic (0.5 m, CC BY-NC 4.0, OpenAerialMap) as a ground texture.

Usage: python -I scripts/geo/export-ortho.py public/realworld/lagos-island
Writes ortho.jpg (the box window, resampled to at most 4096 px wide) and ortho.json: the affine map from street metres (x east,
z south, src/geo/frame.ts origin 3.4E 6.45N) to texture uv, fitted on the image corners: u = a*x + b*z + c, v = d*x + e*z + f.
"""
import json, math, sys
from pathlib import Path
import numpy as np
import rasterio
from rasterio.windows import from_bounds
from rasterio.enums import Resampling
from pyproj import Transformer
from PIL import Image

area = Path(sys.argv[1])
URL = '/vsicurl/https://oin-hotosm-temp.s3.amazonaws.com/5ea1b2b4411bed00056803b1/0/5ea1b2b4411bed00056803b2.tif'
SOUTH, WEST, NORTH, EAST = 6.441, 3.379, 6.466, 3.407
R, DEG, UPK = 6371.0088, math.pi / 180, 10
UPD_LAT = R * DEG * UPK; UPD_LON = UPD_LAT * math.cos(9 * DEG)
def project(lon, lat): return (lon - 8) * UPD_LON, (9 - lat) * UPD_LAT
ORIGIN = tuple(round(v) for v in project(3.4, 6.45))
def to_metres(lon, lat): x, z = project(lon, lat); return (x - ORIGIN[0]) * 100, (z - ORIGIN[1]) * 100

with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR'):
    with rasterio.open(URL) as src:
        fwd = Transformer.from_crs('EPSG:4326', src.crs, always_xy=True); back = Transformer.from_crs(src.crs, 'EPSG:4326', always_xy=True)
        x0, y0 = fwd.transform(WEST, SOUTH); x1, y1 = fwd.transform(EAST, NORTH)
        win = from_bounds(min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1), src.transform)
        scale = min(1.0, 4096 / win.width); w, h = int(win.width * scale), int(win.height * scale)
        rgb = src.read([1, 2, 3], window=win, out_shape=(3, h, w), resampling=Resampling.average, boundless=True, fill_value=0)
        tr = src.window_transform(win) * rasterio.Affine.scale(win.width / w, win.height / h)
Image.fromarray(np.transpose(rgb, (1, 2, 0))).save(area / 'ortho.jpg', quality=86)
# Fit metres -> uv on many sample points (least squares): uv (0,0) top-left, v down (three.js flipY handled by the loader).
pts, uvs = [], []
for py in np.linspace(0, h, 9):
    for px in np.linspace(0, w, 9):
        X, Y = tr * (px, py); lon, lat = back.transform(X, Y); pts.append([*to_metres(lon, lat), 1.0]); uvs.append([px / w, 1 - py / h])
A = np.array(pts); U = np.array(uvs)
coef, *_ = np.linalg.lstsq(A, U, rcond=None)
err = np.abs(A @ coef - U).max() * w * 0.5 / scale
json.dump({'source': 'Maxar 2019 Lagos Mosaic via OpenAerialMap, CC BY-NC 4.0', 'size': [w, h], 'u': coef[:, 0].tolist(), 'v': coef[:, 1].tolist(), 'fitErrorMetres': round(float(err), 2)}, open(area / 'ortho.json', 'w'))
print('ortho', w, h, 'fit error m', round(float(err), 2))
