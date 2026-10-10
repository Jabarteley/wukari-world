"""Paints the face atlas (own work, plus the CC0 MakeHuman brow and lash images as shapes): one small texture for every face part.

  blender --background --disable-autoexec --python make_face_atlas.py -- <brow.png> <lash.png> <out-atlas.png> <rects.json> [<crowd-face.png>]

Layout of the 512 x 256 atlas (pixels from the top left): the eye (an eyeball seen from the front, projected so the iris is the
disc in the middle) at 0,0 (256 x 256); the brow shape at 256,0 (256 x 128); the lash shape at 256,128 (256 x 112); flat swatches
(teeth, tongue, mouth cavity, 16 x 16 each) along y = 240. rects.json gives every rectangle as u0, v0, u1, v1 in glTF
texture space (v down) so a part's UVs can be remapped into it. The optional last argument writes the flat face decal used by the
crowd version (eyes, brows and a smile painted on a transparent 128 x 64 image).
"""
import json
import sys

import bpy
import numpy as np

args = sys.argv[sys.argv.index("--") + 1:]
brow_png, lash_png, out_png, rects_json = args[:4]
crowd_png = args[4] if len(args) > 4 else None
W, H = 512, 256


def load(path):
    im = bpy.data.images.load(path)
    w, h = im.size
    a = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]     # top row first
    return a


def resize(a, w, h):
    ys = (np.arange(h) * a.shape[0] / h).astype(int)
    xs = (np.arange(w) * a.shape[1] / w).astype(int)
    return a[ys][:, xs]


def smooth(img, n=1):
    for _ in range(n):
        p = np.pad(img, ((1, 1), (1, 1)), mode="edge")
        img = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:] + 4 * p[1:-1, 1:-1]) / 8
    return img


def thicken(alpha, n):
    for _ in range(n):
        p = np.pad(alpha, ((1, 1), (1, 1)), mode="edge")
        alpha = np.maximum(alpha, np.maximum(np.maximum(p[:-2, 1:-1], p[2:, 1:-1]), np.maximum(p[1:-1, :-2], p[1:-1, 2:])))
    return alpha


def disc(shape, cx, cy, r, soft=1.5):
    y, x = np.mgrid[0:shape[0], 0:shape[1]]
    return np.clip((r - np.hypot(x - cx, y - cy)) / soft + 0.5, 0, 1)


atlas = np.zeros((H, W, 4), np.float32)

# --- eye: 256 x 256, top row first. Sclera, brown iris with a lighter ring, dark limbal edge, pupil and two catch-lights
S = 256
y, x = np.mgrid[0:S, 0:S] / (S - 1.0)
dx, dy = x - 0.5, y - 0.5
r = np.hypot(dx, dy)
ang = np.arctan2(dy, dx)
rnd = np.random.default_rng(3)
IRIS = 0.31
sclera = np.array([0.95, 0.92, 0.89]) * (1 - 0.30 * np.clip((r - 0.28) / 0.22, 0, 1) ** 1.6)[..., None]
vessel = np.clip(np.sin(ang * 23 + 1.3) * np.sin(r * 90), 0, 1) * np.clip((r - 0.3) / 0.1, 0, 1) * 0.05
eye = sclera - np.stack([vessel * 0.1, vessel * 0.6, vessel * 0.6], -1)
t = np.clip(r / IRIS, 0, 1)
streak = 0.5 + 0.5 * np.sin(ang * 70 + 3 * np.sin(ang * 7)) * np.sin(ang * 23 + 1)
dark, mid, warm = np.array([0.12, 0.055, 0.025]), np.array([0.40, 0.21, 0.09]), np.array([0.62, 0.38, 0.17])
iris = dark + (mid - dark) * (0.25 + 0.75 * streak * (0.35 + 0.65 * t))[..., None]
iris = iris + (warm - iris) * (np.clip((t - 0.2) / 0.5, 0, 1) ** 2 * 0.5)[..., None]       # lighter toward the lower-outer ring
iris *= (1 - 0.55 * np.clip((t - 0.82) / 0.18, 0, 1) ** 1.5)[..., None]                    # limbal edge
edge = np.clip((IRIS - r) / 0.006, 0, 1)[..., None]
eye = eye * (1 - edge) + iris * edge
pupil = np.clip((0.115 - r) / 0.008, 0, 1)[..., None]
eye = eye * (1 - pupil) + np.array([0.012, 0.007, 0.006]) * pupil
# catch-lights: a big soft one upper left and a small one lower right, both over the iris
px = lambda cx, cy: ((cx * (S - 1)), (cy * (S - 1)))
for (cx, cy, rad, k) in ((0.42, 0.40, 0.050, 1.0), (0.57, 0.585, 0.022, 0.6)):
    m = disc((S, S), *px(cx, cy), rad * S, 2.5)[..., None] * k
    eye = eye * (1 - m) + np.array([1.0, 0.98, 0.95]) * m
atlas[0:S, 0:S, :3] = np.clip(eye, 0, 1)
atlas[0:S, 0:S, 3] = 1.0

# --- brow and lash shapes: the CC0 images thickened and made solid dark so they read at a distance
def fit(a, w, h):
    """Average-downsample a (rows, cols) array to h x w."""
    ys = np.linspace(0, a.shape[0], h + 1).astype(int)
    xs = np.linspace(0, a.shape[1], w + 1).astype(int)
    out = np.zeros((h, w), np.float32)
    for j in range(h):
        for i in range(w):
            out[j, i] = a[ys[j]:max(ys[j + 1], ys[j] + 1), xs[i]:max(xs[i + 1], xs[i] + 1)].mean()
    return out


for name, path, (x0, y0, x1, y1), grow in (("brow", brow_png, (256, 0, 512, 128), 3), ("lash", lash_png, (256, 128, 512, 240), 1)):
    a = load(path)[..., 3]
    a = np.clip(smooth(thicken(a, grow), 1) * 1.5, 0, 1)
    atlas[y0:y1, x0:x1, :3] = 1.0
    atlas[y0:y1, x0:x1, 3] = fit(a, x1 - x0, y1 - y0)
# --- swatches
for i, col in enumerate(((0.93, 0.91, 0.84), (0.62, 0.24, 0.27), (0.17, 0.05, 0.06))):
    atlas[240:256, 256 + i * 16:256 + (i + 1) * 16, :3] = col
    atlas[240:256, 256 + i * 16:256 + (i + 1) * 16, 3] = 1.0

img = bpy.data.images.new("atlas", W, H, alpha=True)
img.pixels = atlas[::-1].ravel()
img.filepath_raw = out_png
img.file_format = "PNG"
img.save()
rects = {"eye": (0, 0, 256, 256), "brow": (256, 0, 512, 128), "lash": (256, 128, 512, 240),
         "teeth": (256, 240, 272, 256), "tongue": (272, 240, 288, 256), "cavity": (288, 240, 304, 256)}
json.dump({k: [x0 / W, y0 / H, x1 / W, y1 / H] for k, (x0, y0, x1, y1) in rects.items()}, open(rects_json, "w"), indent=1)

if crowd_png:
    # the crowd face: transparent background; white eyes with a dark iris, brows, a smile. Width 128, height 64 (the area from brow to chin)
    CW, CH = 128, 64
    c = np.zeros((CH, CW, 4), np.float32)
    def put(mask, col):
        for i in range(3):
            c[..., i] = c[..., i] * (1 - mask) + col[i] * mask
        c[..., 3] = np.maximum(c[..., 3], mask)
    for ex in (34, 94):
        put(disc(c.shape[:2], ex, 26, 11, 1.2), (0.96, 0.93, 0.9))
        put(disc(c.shape[:2], ex + 1, 27, 7.5, 1.2), (0.16, 0.08, 0.04))
        put(disc(c.shape[:2], ex - 2, 24, 2.2, 1.0), (1, 1, 1))
        # lid line above the eye and a brow
        yy, xx = np.mgrid[0:CH, 0:CW]
        lid = np.clip(1.6 - np.abs(yy - (14.5 + 0.0012 * (xx - ex) ** 2)) , 0, 1) * (np.abs(xx - ex) < 14)
        put(lid, (0.06, 0.03, 0.02))
        brow = np.clip(2.3 - np.abs(yy - (6.5 + 0.004 * (xx - ex) ** 2 + (0.05 * (xx - ex)) * (1 if ex < 64 else -1) * -1)), 0, 1) * (np.abs(xx - ex) < 15)
        put(brow, (0.08, 0.04, 0.03))
    yy, xx = np.mgrid[0:CH, 0:CW]
    smile = np.clip(2.0 - np.abs(yy - (50 - 0.0045 * (xx - 64) ** 2 + 0)), 0, 1) * (np.abs(xx - 64) < 22)
    # lips: a darker upper line, a fuller lower lip below
    put(smile, (0.45, 0.13, 0.15))
    put(np.clip(2.6 - np.abs(yy - (53 - 0.0045 * (xx - 64) ** 2)), 0, 1) * (np.abs(xx - 64) < 14) * 0.9, (0.62, 0.22, 0.24))
    im2 = bpy.data.images.new("crowd", CW, CH, alpha=True)
    im2.pixels = c[::-1].ravel()
    im2.filepath_raw = crowd_png
    im2.file_format = "PNG"
    im2.save()
print("ATLAS", out_png)
