#!/usr/bin/env python3
"""Sample each mapped footprint's roof colour from the Maxar 2019 Lagos Mosaic (0.5 m, CC BY-NC 4.0, OpenAerialMap).

Usage: /tmp/ob-venv/bin/python -I scripts/geo/sample-roof-colours.py --dir scripts/geo/sources/<area>
Reads <area>/mapped.json, writes <area>/roof-colours.json: { "<building id>": "#rrggbb", ... } for every footprint with enough roof pixels.

The mosaic is a cloud-optimised GeoTIFF (EPSG:32631, 512 px JPEG tiles); only the area's window is read, with HTTP range requests,
and cached as /tmp/roof-colours/window-<area>.npz. Each ring is converted from street metres back to lon/lat (src/geo/frame.ts, origin
3.4E 6.45N) and projected to UTM 31N, shrunk 0.6 m inward (so a wall, a neighbour or a misregistration of a metre does not decide),
and rasterised. Of the pixels inside, the darkest quarter (parapet shadows, water tanks) and the brightest twentieth (glare) are
dropped and the per-channel median of the rest is the roof colour (after a per-channel levels stretch over the window: the haze). Footprints with fewer than 8 usable pixels get no colour.

LICENCE: the colours are derived from imagery licensed CC BY-NC 4.0 (Maxar Technologies, via OpenAerialMap). The owner decided on
17 Oct 2026 that the game is non-commercial for now and may use non-commercial sources; if the game becomes commercial these colours
must be removed or replaced (drop roof-colours.json and recompile). Attribution: "Imagery (c) 2019 Maxar Technologies, CC BY-NC 4.0".
"""
import json, math, sys
from pathlib import Path
import numpy as np
import rasterio
from rasterio.features import geometry_mask
from rasterio.windows import Window, from_bounds
from pyproj import Transformer
from shapely.geometry import Polygon, mapping
from shapely.ops import transform as shp_transform
import warnings; warnings.filterwarnings('ignore')

ROOT = Path(__file__).resolve().parents[2]
URL = 'https://oin-hotosm-temp.s3.amazonaws.com/5ea1b2b4411bed00056803b1/0/5ea1b2b4411bed00056803b2.tif'

# src/geo/frame.ts
R, DEG, UPK = 6371.0088, math.pi / 180, 10
UPD_LAT = R * DEG * UPK
UPD_LON = UPD_LAT * math.cos(9 * DEG)
def project(lon, lat): return (lon - 8) * UPD_LON, (9 - lat) * UPD_LAT
ORIGIN = tuple(round(v) for v in project(3.4, 6.45))
def from_metres(x_m, z_m):
    x, z = x_m / 100 + ORIGIN[0], z_m / 100 + ORIGIN[1]
    return 8 + x / UPD_LON, 9 - z / UPD_LAT

def main(argv):
    if argv[:1] != ['--dir'] or len(argv) < 2: raise SystemExit(__doc__)
    area = ROOT / argv[1]; name = area.name
    mapped = json.load(open(area / 'mapped.json'))
    to_utm = Transformer.from_crs('EPSG:4326', 'EPSG:32631', always_xy=True).transform
    polys = {}
    for b in mapped['buildings']:
        try: polys[b['id']] = shp_transform(to_utm, Polygon([from_metres(x, z) for x, z in b['ring']]))
        except Exception: pass
    minx = min(p.bounds[0] for p in polys.values()) - 5; maxx = max(p.bounds[2] for p in polys.values()) + 5
    miny = min(p.bounds[1] for p in polys.values()) - 5; maxy = max(p.bounds[3] for p in polys.values()) + 5
    Path('/tmp/roof-colours').mkdir(exist_ok=True)
    cache = Path(f'/tmp/roof-colours/window-{name}.npz')
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif', GDAL_HTTP_MULTIRANGE='YES', GDAL_HTTP_MERGE_CONSECUTIVE_RANGES='YES'):
        with rasterio.open('/vsicurl/' + URL) as ds:
            win = from_bounds(minx, miny, maxx, maxy, ds.transform).round_offsets().round_lengths()
            if cache.exists():
                z = np.load(cache); rgb = z['rgb']
            else:
                print(f'reading window {win.width} x {win.height} px', file=sys.stderr)
                rgb = ds.read([1, 2, 3], window=win)
                np.savez_compressed(cache, rgb=rgb)
            wt = ds.window_transform(win)
    H, W = rgb.shape[1], rgb.shape[2]
    # Haze: the mosaic is washed toward grey by the harmattan air. A per-channel levels stretch over the whole window (its 1st and 99.5th
    # percentiles to 0 and 255, sampled on a sparse grid) takes the cast off without inventing colour; the street shader does the rest.
    sample = rgb[:, ::7, ::7].reshape(3, -1).astype(np.float32)
    lo_c = np.percentile(sample, 1, axis=1).reshape(3, 1); hi_c = np.percentile(sample, 99.5, axis=1).reshape(3, 1)
    stretch = lambda px: np.clip((px - lo_c.T) / np.maximum(1.0, (hi_c - lo_c).T) * 255.0, 0, 255)
    out, skipped = {}, 0
    for bid, poly in polys.items():
        inner = poly.buffer(-0.6)
        shape = inner if (not inner.is_empty and inner.area > 4) else poly
        x0, y0, x1, y1 = shape.bounds
        c0, r0 = ~wt * (x0, y1); c1, r1 = ~wt * (x1, y0)
        c0, r0, c1, r1 = max(0, int(c0) - 1), max(0, int(r0) - 1), min(W, int(math.ceil(c1)) + 1), min(H, int(math.ceil(r1)) + 1)
        if c1 - c0 < 2 or r1 - r0 < 2: skipped += 1; continue
        sub_t = wt * rasterio.Affine.translation(c0, r0)
        inside = geometry_mask([mapping(shape)], out_shape=(r1 - r0, c1 - c0), transform=sub_t, invert=True, all_touched=False)
        px = stretch(rgb[:, r0:r1, c0:c1][:, inside].T.astype(np.float32))
        if len(px) < 8: skipped += 1; continue
        luma = px @ np.array([0.2126, 0.7152, 0.0722], np.float32)
        lo, hi = np.percentile(luma, 25), np.percentile(luma, 95)
        keep = px[(luma >= lo) & (luma <= hi)]
        if len(keep) < 6: keep = px
        r, g, b = (int(round(v)) for v in np.median(keep, axis=0))
        out[bid] = '#%02x%02x%02x' % (r, g, b)
    (area / 'roof-colours.json').write_text(json.dumps(out, separators=(',', ':'), sort_keys=True))
    print(json.dumps({'area': name, 'buildings': len(polys), 'coloured': len(out), 'skipped': skipped, 'window_px': [int(W), int(H)]}))

if __name__ == '__main__': main(sys.argv[1:])
