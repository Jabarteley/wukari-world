"""Build the ONE global 2048x2048 trim atlas (procedural, no third-party inputs, so no licence issues).

    /Applications/Blender.app/Contents/Resources/5.2/python/bin/python3.13 scripts/places/atlas/build.py
    (any Python 3 with numpy works; Blender's bundled one is simply guaranteed to have it)

Writes atlas/trim.webp (via cwebp), atlas/slots.json (slot name -> pixel rect, world tile size, kind) and, when
--preview is given, a PNG next to it for looking at. Everything is deterministic (fixed seeds).

Textures are deliberately neutral/light: vertex colour (COLOR_0) multiplies them in the game, so one brick slot serves
red, yellow or grey brick. Glazing slots are the exception: dark and reflective by themselves.
Every slot is stored with an 8 px gutter of wrapped (tiled) content so mip-mapping never bleeds a neighbour in.
"""
import json
import struct
import subprocess
import sys
import zlib
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
SIZE = 2048
GUTTER = 8
CWEBP = '/opt/homebrew/bin/cwebp'


# ---------------------------------------------------------------------------------------------------------------- noise
def fnoise(h, w, rng, beta=2.0, stretch=(1.0, 1.0)):
    """Periodic (tileable) noise, mean 0, std 1. beta ~ spectral slope (higher = smoother). stretch scales the y/x frequency
    (stretch=(0.1, 1) gives features long in y)."""
    fy = np.fft.fftfreq(h)[:, None] * stretch[0]
    fx = np.fft.fftfreq(w)[None, :] * stretch[1]
    f = np.sqrt(fx * fx + fy * fy)
    f[0, 0] = 1.0
    spec = (rng.standard_normal((h, w)) + 1j * rng.standard_normal((h, w))) / f ** (beta / 2.0)
    spec[0, 0] = 0
    n = np.fft.ifft2(spec).real
    return (n - n.mean()) / (n.std() + 1e-9)


def grid(h, w):
    y, x = np.mgrid[0:h, 0:w]
    return (y + 0.5) / h, (x + 0.5) / w  # 0..1 periodic coordinates


def smooth(a, lo, hi):
    t = np.clip((a - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)


def to_rgb(g):
    return np.repeat(np.clip(g, 0, 1)[:, :, None], 3, axis=2)


def soft_line(coord, period, width):
    """Soft line at multiples of 1/period (distance in units of one period)."""
    f = (coord * period) % 1.0
    d = np.minimum(f, 1.0 - f)
    return 1.0 - smooth(d, width * 0.5, width * 1.5)


# ------------------------------------------------------------------------------------------------------------ materials
def plain_render(h, w, rng, tile):
    y, x = grid(h, w)
    g = 0.86 + 0.025 * fnoise(h, w, rng, 3.0) + 0.012 * fnoise(h, w, rng, 0.8)
    streak = fnoise(h, w, rng, 2.0, (0.08, 1.0))
    g -= 0.02 * np.clip(streak, 0, 3)
    return to_rgb(g)


def rough_concrete(h, w, rng, tile):
    y, x = grid(h, w)
    g = 0.74 + 0.03 * fnoise(h, w, rng, 2.4) + 0.02 * fnoise(h, w, rng, 1.0)
    # board-formed horizontal lines
    g += 0.012 * fnoise(h, w, rng, 1.0, (1.0, 0.04))
    # panel joints every 2 m (two panels per 4 m tile) and tie holes
    joints = np.maximum(soft_line(y, 2, 0.006), soft_line(x, 2, 0.006))
    g -= 0.16 * joints
    ties = np.zeros((h, w), np.float32)
    for gy in range(4):
        for gx in range(4):
            cy, cx = (gy + 0.5) / 4, (gx + 0.5) / 4
            d = np.sqrt(((y - cy + 0.5) % 1 - 0.5) ** 2 + ((x - cx + 0.5) % 1 - 0.5) ** 2)
            ties += (d < 0.006).astype(np.float32)
    g -= 0.2 * np.clip(ties, 0, 1)
    # stains
    g -= 0.05 * smooth(fnoise(h, w, rng, 2.6, (0.3, 1.0)), 0.8, 2.2)
    return to_rgb(g)


def brick(h, w, rng, tile):
    y, x = grid(h, w)
    rows, per = 26, 9
    ry = y * rows
    row = np.floor(ry).astype(int)
    off = (row % 2) * 0.5
    rx = x * per + off
    col = np.floor(rx).astype(int) % per
    fy, fx = ry - row, rx - np.floor(rx)
    mort_v, mort_h = 0.13, 0.11
    mortar = ((fy < mort_v) | (fx < mort_h)).astype(np.float32)
    shade = rng.uniform(0.80, 1.0, (rows, per))[row % rows, col]
    tone = rng.uniform(-0.03, 0.03, (rows, per))[row % rows, col]
    g = 0.83 * shade + tone + 0.03 * fnoise(h, w, rng, 1.2)
    g = np.where(mortar > 0, 0.66 + 0.03 * fnoise(h, w, rng, 1.0), g)
    # soft edge + shadow under each course
    g -= 0.08 * (1 - smooth(fy, mort_v, mort_v + 0.12)) * (1 - mortar)
    return to_rgb(g)


def stone_blocks(h, w, rng, tile):
    y, x = grid(h, w)
    g = np.zeros((h, w), np.float32)
    heights = np.array([0.1, 0.07, 0.12, 0.08, 0.09, 0.11, 0.1, 0.07, 0.1, 0.08, 0.08])
    heights = heights / heights.sum()
    edges = np.concatenate([[0], np.cumsum(heights)])
    for i in range(len(heights)):
        y0, y1 = edges[i], edges[i + 1]
        n = int(rng.integers(3, 5))
        wid = rng.uniform(0.7, 1.3, n)
        wid /= wid.sum()
        cuts = np.cumsum(wid)                       # last = 1
        xs = (x - rng.uniform(0, 1)) % 1.0
        idx = np.searchsorted(cuts, xs.clip(0, 0.999999))
        starts = np.concatenate([[0], cuts[:-1]])[idx]
        shade = rng.uniform(0.86, 1.04, n)[idx]
        row = (y >= y0) & (y < y1)
        joint = (xs - starts) < 0.004
        g = np.where(row, np.where(joint, 0.45, 0.82 * shade), g)
        g = np.where((y >= y0) & (y < y0 + 0.004), 0.45, g)
    g += 0.03 * fnoise(h, w, rng, 1.6) + 0.015 * fnoise(h, w, rng, 0.6)
    return to_rgb(g)


def mud_render(h, w, rng, tile):
    g = 0.86 + 0.045 * fnoise(h, w, rng, 3.2) + 0.02 * fnoise(h, w, rng, 1.4) + 0.008 * fnoise(h, w, rng, 0.5)
    crack = np.abs(fnoise(h, w, rng, 2.0))
    g -= 0.08 * (crack < 0.03)
    g -= 0.04 * smooth(fnoise(h, w, rng, 3.0, (0.2, 1.0)), 0.6, 2.2)
    return to_rgb(g)


def metal_cladding(h, w, rng, tile):
    y, x = grid(h, w)
    g = 0.78 + 0.01 * fnoise(h, w, rng, 1.0, (0.03, 1.0))
    per = 8  # 0.5 m panels over 4 m
    f = (x * per) % 1.0
    g += 0.06 * smooth(f, 0.0, 0.03) * (1 - smooth(f, 0.03, 0.06))      # raised rib highlight
    g -= 0.12 * (f > 0.985)
    g -= 0.14 * soft_line(y, 2, 0.004)
    g += 0.04 * (fnoise(h, w, rng, 2.2) * 0.4)
    return to_rgb(g)


def corrugated(h, w, rng, tile):
    y, x = grid(h, w)
    ridges = 10
    g = 0.74 + 0.13 * np.sin(2 * np.pi * x * ridges) + 0.02 * fnoise(h, w, rng, 1.2) + 0.03 * fnoise(h, w, rng, 3.0)
    g -= 0.05 * smooth(fnoise(h, w, rng, 2.5, (0.2, 1.0)), 1.0, 2.5)
    return to_rgb(g)


def clay_tile(h, w, rng, tile):
    y, x = grid(h, w)
    rows, per = 10, 10
    ry = y * rows
    row = np.floor(ry).astype(int)
    fy = ry - row
    rx = x * per + (row % 2) * 0.5
    col = np.floor(rx).astype(int) % per
    fx = rx - np.floor(rx)
    shade = rng.uniform(0.84, 1.0, (rows, per))[row % rows, col]
    # each tile: dark at its lower edge (overlap shadow) and curved channel
    g = 0.78 * shade * (0.72 + 0.28 * smooth(fy, 0.0, 0.7)) * (0.9 + 0.1 * np.sin(np.pi * fx))
    g -= 0.28 * (fy > 0.93)
    g -= 0.10 * ((fx < 0.04))
    g += 0.03 * fnoise(h, w, rng, 1.2)
    return to_rgb(g)


def slate(h, w, rng, tile):
    y, x = grid(h, w)
    rows, per = 14, 7
    ry = y * rows
    row = np.floor(ry).astype(int)
    fy = ry - row
    rx = x * per + (row % 2) * 0.5
    col = np.floor(rx).astype(int) % per
    fx = rx - np.floor(rx)
    shade = rng.uniform(0.72, 1.0, (rows, per))[row % rows, col]
    g = 0.66 * shade * (0.8 + 0.2 * smooth(fy, 0.0, 0.8))
    g -= 0.22 * (fy > 0.92) + 0.12 * (fx < 0.035)
    g += 0.03 * fnoise(h, w, rng, 1.0)
    return to_rgb(g)


def timber(h, w, rng, tile):
    y, x = grid(h, w)
    planks = 12
    px = np.floor(x * planks).astype(int)
    shade = rng.uniform(0.86, 1.0, planks)[px]
    f = (x * planks) % 1.0
    grain = fnoise(h, w, rng, 1.6, (0.04, 1.0))
    g = 0.74 * shade + 0.045 * grain + 0.02 * fnoise(h, w, rng, 2.4)
    g -= 0.2 * ((f < 0.04) | (f > 0.97))
    # butt joints
    jy = (y * 2 + px * 0.37) % 1.0
    g -= 0.15 * (jy < 0.006)
    return to_rgb(g)


def paving(h, w, rng, tile):
    y, x = grid(h, w)
    n = 4
    cy, cx = np.floor(y * n).astype(int), np.floor(x * n).astype(int)
    shade = rng.uniform(0.86, 1.02, (n, n))[cy % n, cx % n]
    g = 0.72 * shade + 0.025 * fnoise(h, w, rng, 1.2) + 0.015 * fnoise(h, w, rng, 3.0)
    g -= 0.22 * np.maximum(soft_line(y, n, 0.014), soft_line(x, n, 0.014))
    return to_rgb(g)


def asphalt(h, w, rng, tile):
    g = 0.52 + 0.03 * fnoise(h, w, rng, 1.6) + 0.045 * fnoise(h, w, rng, 0.3) + 0.012 * fnoise(h, w, rng, 3.0)
    return to_rgb(g)


def grass(h, w, rng, tile):
    y, x = grid(h, w)
    g = 0.74 + 0.07 * fnoise(h, w, rng, 2.4) + 0.05 * fnoise(h, w, rng, 0.7) + 0.03 * fnoise(h, w, rng, 0.2)
    return to_rgb(g)


def laterite(h, w, rng, tile):
    g = 0.74 + 0.06 * fnoise(h, w, rng, 2.2) + 0.04 * fnoise(h, w, rng, 0.6)
    peb = fnoise(h, w, rng, 0.0)
    g += 0.07 * (peb > 2.5) - 0.06 * (peb < -2.6)
    return to_rgb(g)


def sand(h, w, rng, tile):
    y, x = grid(h, w)
    ripple = np.sin(2 * np.pi * (x * 5 + 0.35 * fnoise(h, w, rng, 3.0)))
    g = 0.84 + 0.03 * ripple + 0.03 * fnoise(h, w, rng, 1.0) + 0.015 * fnoise(h, w, rng, 0.2)
    return to_rgb(g)


def roof_flat(h, w, rng, tile):
    g = 0.58 + 0.04 * fnoise(h, w, rng, 2.0) + 0.04 * fnoise(h, w, rng, 0.2)
    y, x = grid(h, w)
    g -= 0.1 * soft_line(x, 2, 0.01)
    g -= 0.04 * smooth(fnoise(h, w, rng, 2.8), 1.0, 2.5)
    return to_rgb(g)


def metal_roof(h, w, rng, tile):
    y, x = grid(h, w)
    per = 6
    f = (x * per) % 1.0
    g = 0.80 + 0.012 * fnoise(h, w, rng, 1.0, (0.03, 1.0))
    g += 0.07 * smooth(f, 0.0, 0.02) * (1 - smooth(f, 0.02, 0.05))
    g -= 0.15 * ((f > 0.985) | (f < 0.004))
    g += 0.03 * fnoise(h, w, rng, 2.6)
    return to_rgb(g)


# ------------------------------------------------------------------------------------------------------------- glazing
def _glass(h, w, rng, seed_tilt=1.0):
    y, x = grid(h, w)
    # dark glass reflecting a sky gradient with a diagonal soft streak
    sky = 0.30 - 0.20 * y                      # lighter at the top of the pane (y=0 is the top row of the slot)
    streak = smooth(np.sin(2 * np.pi * (x * 0.9 + y * 0.6) * seed_tilt), 0.55, 1.0) * 0.07
    g = 0.17 + 0.18 * sky + streak + 0.012 * fnoise(h, w, rng, 2.4)
    rgb = np.stack([g * 0.86, g * 0.97, g * 1.08], axis=2)
    return rgb


def _frame(rgb, mask, val=0.62):
    rgb[mask] = val
    return rgb


def glazing_curtain(h, w, rng, tile):
    rgb = _glass(h, w, rng)
    y, x = grid(h, w)
    e = 0.012
    m = (x < e) | (x > 1 - e) | (y < e) | (y > 1 - e) | (np.abs(y - 0.8) < 0.010)
    spandrel = (y > 0.8)
    rgb[spandrel] *= 1.5
    return _frame(rgb, m)


def glazing_punched(h, w, rng, tile):
    rgb = _glass(h, w, rng, 1.3)
    y, x = grid(h, w)
    e = 0.05
    m = (x < e) | (x > 1 - e) | (y < e * 0.75) | (y > 1 - e * 0.75) | (np.abs(x - 0.5) < 0.022) | (np.abs(y - 0.4) < 0.018)
    return _frame(rgb, m, 0.72)


def glazing_shopfront(h, w, rng, tile):
    rgb = _glass(h, w, rng, 0.8)
    y, x = grid(h, w)
    e = 0.02
    riser = y > 0.82
    rgb[riser] = 0.28
    m = (x < e) | (x > 1 - e) | (y < e) | (y > 1 - e) | (np.abs(y - 0.82) < 0.01) | (np.abs(y - 0.16) < 0.012) | (np.abs(x - 0.5) < 0.012)
    return _frame(rgb, m, 0.55)


def glazing_ribbon(h, w, rng, tile):
    rgb = _glass(h, w, rng, 2.0)
    y, x = grid(h, w)
    m = (y < 0.06) | (y > 0.94)
    for k in range(1, 4):
        m |= np.abs(x - k / 4) < 0.006
    m |= (x < 0.005) | (x > 0.995)
    return _frame(rgb, m, 0.6)


# ----------------------------------------------------------------------------------------------------------------- trim
def cornice(h, w, rng, tile):
    y, x = grid(h, w)   # y = 0 is the top of the strip
    g = np.full((h, w), 0.86, np.float32)
    g = np.where(y < 0.25, 0.97, g)                 # lit top face / drip edge
    g = np.where((y >= 0.25) & (y < 0.45), 0.72, g)  # undercut shadow
    g = np.where((y >= 0.45) & (y < 0.6), 0.9, g)
    g = np.where((y >= 0.6) & (y < 0.75), 0.64, g)
    g = np.where(y >= 0.75, 0.84, g)
    # dentils
    d = soft_line(x, 32, 0.25)
    g = np.where((y >= 0.6) & (y < 0.75), g * (0.8 + 0.25 * d), g)
    g += 0.01 * fnoise(h, w, rng, 2.0)
    return to_rgb(g)


def frame_strip(h, w, rng, tile):
    y, x = grid(h, w)
    g = 0.84 + 0.1 * smooth(0.25 - np.abs(y - 0.5), 0, 0.25) - 0.15 * (y > 0.9)
    return to_rgb(g + 0.008 * fnoise(h, w, rng, 2.0))


def plain(h, w, rng, tile):
    return np.full((h, w, 3), 0.9, np.float32)


# name, w, h, tile_m (u, v), kind, fn
W = 480
S = 224
SLOTS = [
    ('plain-render', W, W, (4, 4), 'wall', plain_render),
    ('rough-concrete', W, W, (4, 4), 'wall', rough_concrete),
    ('brick', W, W, (2, 2), 'wall', brick),
    ('stone-blocks', W, W, (4, 4), 'wall', stone_blocks),
    ('mud-render', W, W, (4, 4), 'wall', mud_render),
    ('metal-cladding', W, W, (4, 4), 'wall', metal_cladding),
    ('corrugated', S, S, (2, 2), 'roof', corrugated),
    ('clay-tile', S, S, (2, 2), 'roof', clay_tile),
    ('slate', S, S, (2, 2), 'roof', slate),
    ('metal-roof', S, S, (3, 3), 'roof', metal_roof),
    ('roof-flat', S, S, (4, 4), 'roof', roof_flat),
    ('timber', S, S, (1.6, 1.6), 'wall', timber),
    ('paving', S, S, (2, 2), 'ground', paving),
    ('asphalt', S, S, (4, 4), 'ground', asphalt),
    ('grass', S, S, (4, 4), 'ground', grass),
    ('laterite', S, S, (4, 4), 'ground', laterite),
    ('sand', S, S, (4, 4), 'ground', sand),
    ('glass-curtain', 240, 288, (3, 3.6), 'glazing', glazing_curtain),
    ('glass-punched', 192, 256, (1.2, 1.6), 'glazing', glazing_punched),
    ('glass-shopfront', 288, 288, (3, 3), 'glazing', glazing_shopfront),
    ('glass-ribbon', 480, 128, (4, 1.2), 'glazing', glazing_ribbon),
    ('cornice', 480, 64, (4, 0.5), 'trim', cornice),
    ('frame', S, 32, (2, 0.3), 'trim', frame_strip),
    ('plain', 32, 32, (1, 1), 'trim', plain),
]


def pack(slots):
    """Shelf-pack slots (inner w,h plus a gutter each side) into SIZE x SIZE; tallest first."""
    order = sorted(range(len(slots)), key=lambda i: -slots[i][2])
    x = y = shelf = 0
    pos = {}
    for i in order:
        w, h = slots[i][1] + 2 * GUTTER, slots[i][2] + 2 * GUTTER
        if x + w > SIZE:
            x, y, shelf = 0, y + shelf, 0
        pos[i] = (x + GUTTER, y + GUTTER)
        x += w
        shelf = max(shelf, h)
    if y + shelf > SIZE:
        raise SystemExit(f'atlas overflow: needs {y + shelf} rows')
    return pos


def write_png(path, rgb8):
    h, w, _ = rgb8.shape
    raw = b''.join(b'\x00' + rgb8[r].tobytes() for r in range(h))

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 6)) + chunk(b'IEND', b'')
    Path(path).write_bytes(png)


def main():
    atlas = np.full((SIZE, SIZE, 3), 0.5, np.float32)
    atlas[:] = (0.9, 0.9, 0.9)
    pos = pack(SLOTS)
    meta = {}
    for i, (name, w, h, tile, kind, fn) in enumerate(SLOTS):
        rng = np.random.default_rng(1000 + i)
        px = fn(h, w, rng, tile).astype(np.float32)
        x0, y0 = pos[i]
        pad = np.pad(px, ((GUTTER, GUTTER), (GUTTER, GUTTER), (0, 0)), mode='wrap')  # tileable, so wrapping is the right gutter
        atlas[y0 - GUTTER:y0 + h + GUTTER, x0 - GUTTER:x0 + w + GUTTER] = pad
        meta[name] = {'px': [x0, y0, w, h], 'tileM': list(tile), 'kind': kind}
    out = (np.clip(atlas, 0, 1) * 255 + 0.5).astype(np.uint8)
    tmp = HERE / '_trim.png'
    write_png(tmp, out)
    subprocess.run([CWEBP, '-quiet', '-q', '88', '-m', '6', str(tmp), '-o', str(HERE / 'trim.webp')], check=True)
    if '--preview' in sys.argv:
        tmp.replace(HERE.parent / 'out' / 'atlas-preview.png')
    else:
        tmp.unlink()
    (HERE / 'slots.json').write_text(json.dumps({'schema': 'allworld-trim-atlas', 'version': 1, 'size': SIZE, 'gutter': GUTTER, 'slots': meta}, indent=1) + '\n')
    print(f'wrote trim.webp ({(HERE / "trim.webp").stat().st_size} bytes) and slots.json with {len(meta)} slots')


if __name__ == '__main__':
    main()
