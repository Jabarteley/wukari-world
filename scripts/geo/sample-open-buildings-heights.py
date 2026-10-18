#!/usr/bin/env python3
"""Sample Open Buildings 2.5D Temporal (2023) building heights for every Lagos Island footprint.

Usage: /tmp/ob-venv/bin/python -I scripts/geo/sample-open-buildings-heights.py [--dir scripts/geo/sources/<area>] TILE.tif|https://...tif [TILE2 ...]
With --dir the area's mapped.json is read and open-buildings-heights.json written there (default lagos-island). Several tiles are mosaicked
(they must share the CRS and 0.5 m grid) when the box straddles a tile edge.
A https URL is read with HTTP range requests (the tiles are cloud-optimised GeoTIFFs), so only the box window is downloaded.
The window is cached to /tmp/open-buildings/window-<tile>.npz.
Reads scripts/geo/sources/lagos-island/mapped.json, converts each ring from street metres back to lon/lat
(src/geo/frame.ts, origin 3.4E 6.45N, 100 m per map unit), projects to the tile CRS (EPSG:32631) and writes
scripts/geo/sources/lagos-island/open-buildings-heights.json.
Open Buildings 2.5D Temporal Dataset (c) Google, CC BY 4.0.
"""
import json, math, sys, statistics
from pathlib import Path
import numpy as np
import rasterio
from rasterio.features import geometry_mask
from rasterio.windows import Window, from_bounds
from affine import Affine
from pyproj import Transformer
from shapely.geometry import Polygon
from shapely.ops import transform as shp_transform
import warnings; warnings.filterwarnings('ignore', category=DeprecationWarning)

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'scripts/geo/sources/lagos-island'
OUT = SRC / 'open-buildings-heights.json'  # replaced by --dir in main()

# src/geo/frame.ts
R, DEG, UPK = 6371.0088, math.pi / 180, 10
UPD_LAT = R * DEG * UPK
UPD_LON = UPD_LAT * math.cos(9 * DEG)
def project(lon, lat): return (lon - 8) * UPD_LON, (9 - lat) * UPD_LAT
ORIGIN = tuple(round(v) for v in project(3.4, 6.45))
def from_metres(x_m, z_m):
    x, z = x_m / 100 + ORIGIN[0], z_m / 100 + ORIGIN[1]
    return 8 + x / UPD_LON, 9 - z / UPD_LAT

def pct(a, q): return float(np.percentile(a, q))

def main(tile_paths):
    global SRC, OUT
    if tile_paths[0] == '--dir':
        SRC = ROOT / tile_paths[1]; OUT = SRC / 'open-buildings-heights.json'; tile_paths = tile_paths[2:]
    tile_path = tile_paths[0]
    Path('/tmp/open-buildings').mkdir(exist_ok=True)
    mapped = json.load(open(SRC / 'mapped.json'))
    to_utm = Transformer.from_crs('EPSG:4326', 'EPSG:32631', always_xy=True).transform
    out, osm_levels = [], {}
    src = '/vsicurl/' + tile_path if tile_path.startswith('http') else tile_path
    def vsi(t): return '/vsicurl/' + t if t.startswith('http') else t
    ds = rasterio.open(vsi(tile_paths[0]))
    if True:
        names = list(ds.descriptions)
        bh, bp = names.index('building_height') + 1, names.index('building_presence') + 1
        polys = {}
        for b in mapped['buildings']:
            ll = [from_metres(x, z) for x, z in b['ring']]
            polys[b['id']] = shp_transform(to_utm, Polygon(ll))  # noqa
        minx = min(p.bounds[0] for p in polys.values()) - 5; maxx = max(p.bounds[2] for p in polys.values()) + 5
        miny = min(p.bounds[1] for p in polys.values()) - 5; maxy = max(p.bounds[3] for p in polys.values()) + 5
        cache = Path('/tmp/open-buildings/window-%s.npz' % '+'.join(Path(t).stem for t in tile_paths))
        if cache.exists():
            z = np.load(cache); H, P = z['H'], z['P']; w = z['win']; win = Window(int(w[0]), int(w[1]), int(w[2]), int(w[3])); wt = ds.window_transform(win)
        elif len(tile_paths) == 1:
            win = from_bounds(minx, miny, maxx, maxy, ds.transform).round_offsets().round_lengths()
            H = ds.read(bh, window=win); P = ds.read(bp, window=win)
            wt = ds.window_transform(win)
        else:
            # common grid on the first tile's 0.5 m lattice; each tile fills the part it covers, nodata elsewhere
            t0 = ds.transform
            win = from_bounds(minx, miny, maxx, maxy, t0).round_offsets().round_lengths()
            wt = ds.window_transform(win)
            H = np.full((win.height, win.width), ds.nodata, np.float32); P = H.copy()
            for tp in tile_paths:
                with rasterio.open(vsi(tp)) as d2:
                    tn = list(d2.descriptions); h2, p2 = tn.index('building_height') + 1, tn.index('building_presence') + 1
                    # window of the common grid expressed in this tile's pixels (same resolution, integer offsets)
                    col0, row0 = ~d2.transform * (wt.c, wt.f)
                    col0, row0 = int(round(col0)), int(round(row0))
                    c_lo, r_lo = max(col0, 0), max(row0, 0)
                    c_hi, r_hi = min(col0 + win.width, d2.width), min(row0 + win.height, d2.height)
                    if c_hi <= c_lo or r_hi <= r_lo: continue
                    w2 = Window(c_lo, r_lo, c_hi - c_lo, r_hi - r_lo)
                    H[r_lo - row0:r_hi - row0, c_lo - col0:c_hi - col0] = d2.read(h2, window=w2)
                    P[r_lo - row0:r_hi - row0, c_lo - col0:c_hi - col0] = d2.read(p2, window=w2)
        np.savez_compressed('/tmp/open-buildings/window-%s.npz' % '+'.join(Path(t).stem for t in tile_paths), H=H, P=P, win=np.array([win.col_off, win.row_off, win.width, win.height]))
        nod = ds.nodata
        valid = np.isfinite(H) & (H != nod) & np.isfinite(P) & (P != nod)
        print('window', win, 'valid share', valid.mean())
        for b in mapped['buildings']:
            poly = polys[b['id']]
            if not poly.is_valid: poly = poly.buffer(0)
            # work on a small crop around the footprint (same result as a full-grid mask, far faster for big boxes)
            x0, y0, x1, y1 = poly.bounds
            ca, ra = ~wt * (x0, y1); cb, rb = ~wt * (x1, y0)
            c_lo, c_hi = max(int(math.floor(min(ca, cb))) - 6, 0), min(int(math.ceil(max(ca, cb))) + 7, H.shape[1])
            r_lo, r_hi = max(int(math.floor(min(ra, rb))) - 6, 0), min(int(math.ceil(max(ra, rb))) + 7, H.shape[0])
            if c_hi <= c_lo or r_hi <= r_lo: continue
            Hl, Pl, vl = H[r_lo:r_hi, c_lo:c_hi], P[r_lo:r_hi, c_lo:c_hi], valid[r_lo:r_hi, c_lo:c_hi]
            lt = wt * Affine.translation(c_lo, r_lo)
            m = ~geometry_mask([poly], out_shape=Hl.shape, transform=lt, all_touched=True)
            how = 'mask'
            if m.sum() < 4:  # tiny footprint: centroid plus a 9x9 pixel (about one 4 m cell) neighbourhood
                c = poly.centroid; col, row = ~lt * (c.x, c.y); col, row = int(col), int(row)
                m = np.zeros(Hl.shape, bool); m[max(row - 4, 0):row + 5, max(col - 4, 0):col + 5] = True; how = 'centroid'
            m &= vl
            n_all = int(m.sum())
            if n_all == 0: continue
            pres = float(Pl[m].mean())
            roof = m & (Pl > 0.5) & (Hl > 0)
            n = int(roof.sum())
            if n == 0:
                out.append({'id': b['id'], 'height_m': None, 'presence': round(pres, 3), 'pixels': 0}); continue
            out.append({'id': b['id'], 'height_m': round(pct(Hl[roof], 75), 1), 'presence': round(pres, 3), 'pixels': n, **({'via': 'centroid'} if how == 'centroid' else {})})
    json.dump({
        'source': 'Open Buildings 2.5D Temporal Dataset (c) Google, CC BY 4.0',
        'year': 2023, 'tile': '+'.join(Path(t).name for t in tile_paths),
        'method': 'p75 of building_height over in-footprint 0.5 m pixels with building_presence > 0.5; presence = mean over all in-footprint pixels',
        'heights': out}, open(OUT, 'w'), separators=(',', ':'))
    # statistics
    got = [o for o in out if o['height_m'] is not None]
    print('footprints', len(mapped['buildings']), 'sampled', len(out), 'with height', len(got))
    hs = [o['height_m'] for o in got]
    print('deciles', [round(pct(hs, q), 1) for q in range(0, 101, 10)])
    h = {o['id']: o['height_m'] for o in got}
    diffs = [abs(h[b['id']] - b['levels'] * 3) for b in mapped['buildings'] if b['id'] in h and b.get('levels') and b['id'].startswith('osm:')]
    print('osm levels pairs', len(diffs), 'median abs diff', statistics.median(diffs) if diffs else None, 'mean', statistics.mean(diffs) if diffs else None)
    sg = [(h[b['id']] - b['levels'] * 3) for b in mapped['buildings'] if b['id'] in h and b.get('levels') and b['id'].startswith('osm:')]
    print('median signed (OB - OSM)', statistics.median(sg) if sg else None, 'within 3m', sum(1 for d in diffs if d <= 3) / max(1, len(diffs)))
    print('OSM levels>=3 pairs', sum(1 for b in mapped['buildings'] if b['id'] in h and (b.get('levels') or 0) >= 3))

if __name__ == '__main__':
    main(sys.argv[1:])
