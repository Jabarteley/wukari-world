"""Cleans a baked character colour map: specks, streaks and stray dark or white patches that the bake left, a noisy hair texture, a printed logo on a cap.

  python3 texfix.py <in.jpg> <out.jpg> [--hair-smooth 1] [--logo-z metres] [--cover <uvcover .npz>] [--protect-z metres] [--quality 82]

Needs numpy, scipy and pillow (not Blender's own interpreter).  The rules work on the picture only, so the same call cleans the player map, the crowd map and every outfit map:
  A  a near-white patch (smaller than 700 texels) on a clearly darker surround is filled from that surround
  B  a near-black patch on a clearly lighter surround likewise
  C  a bright speck in a neutral dark surround (hair, black cloth) likewise
Large shapes (a white shirt, a shoe, embroidery of normal size) are never touched: only patches under the size limit are.  Filling is a normalised blur of the texels around the patch that
are not themselves patches.  --protect-z gives the height above which rules A and B stay off (the head).  --hair-smooth also takes a 5 px median over neutral dark areas (a noisy braid texture).  --logo-z <metres> repaints every pale texel above that height (a printed word on a cap) with the cap's colour.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

args = sys.argv[1:]
pos = [a for a in args if not a.startswith("--")]
opts = {args[i]: args[i + 1] for i, a in enumerate(args) if a.startswith("--") and i + 1 < len(args)}
src, dst = pos[0], pos[1]
im = np.asarray(Image.open(src).convert("RGB"), dtype=np.float32) / 255.0
H, W = im.shape[:2]
k = W / 1024.0


def fill(img, bad, sigma, cover=None):
    known = (~bad).astype(np.float32)
    if cover is not None:
        known = known * cover
    out = img.copy()
    for _ in range(4):
        num = np.stack([ndi.gaussian_filter(out[:, :, c] * known, sigma) for c in range(3)], axis=2)
        den = ndi.gaussian_filter(known, sigma)[:, :, None]
        got = den[:, :, 0] > 0.02
        out = np.where(bad[:, :, None] & got[:, :, None], num / np.maximum(den, 1e-4), out)
        known = np.where(bad & got, 1.0, known).astype(np.float32)
        if (bad & ~got).sum() == 0:
            break
    return out


def patches(mask, max_area):
    lab, n = ndi.label(mask)
    if n == 0:
        return mask
    area = ndi.sum(mask, lab, index=np.arange(1, n + 1))
    keep = np.concatenate([[False], area < max_area])
    return keep[lab]


lum = im.mean(axis=2); sat = im.max(axis=2) - im.min(axis=2)
size = max(5, int(13 * k) | 1)
cover = np.ones((H, W), bool); zmap = np.zeros((H, W), np.float32); zlim = float(opts.get("--protect-z", 9.0))
if "--cover" in opts:
    _c = np.load(opts["--cover"]); cover = np.flipud(_c["have"]); zmap = np.flipud(_c["z"]) if "z" in _c.files else zmap     # the coverage maps are written bottom row first (the image convention of the 3D tool)
    if zmap.shape[0] != H:
        zmap = zmap[(np.arange(H) * zmap.shape[0] // H)[:, None], (np.arange(W) * zmap.shape[1] // W)[None, :]]
    if cover.shape[0] != H:
        cover = cover[(np.arange(H) * cover.shape[0] // H)[:, None], (np.arange(W) * cover.shape[1] // W)[None, :]]
# the surround is taken from covered texels only (the unused part of the map is black and must not count)
idx = ndi.distance_transform_edt(~cover, return_distances=False, return_indices=True)
lum_f = lum[idx[0], idx[1]]; sat_f = sat[idx[0], idx[1]]      # the unused part takes the nearest used value, so it never counts as surround
med = ndi.median_filter(lum_f, size=size)
msat = ndi.median_filter(sat_f, size=size)
lum_c = np.where(cover, lum, np.nan)
body = cover & (zmap < zlim)          # below the neck: the eyes, teeth and lips are never cleaned by rules A and B
A = body & (lum > 0.65) & (med < lum - 0.22) & (sat < 0.15)
B = body & (lum < 0.10) & (med > lum + 0.08) & (sat < 0.15)
C = cover & (lum > 0.40) & (lum > med + 0.22) & (med < 0.22) & (msat < 0.15)
cand = A | B | C
bad = patches(cand, 700 * k * k)
bad = ndi.binary_dilation(bad, iterations=max(1, int(round(2 * k)))) & cover
n_bad = int(bad.sum())
out = fill(im, bad, 5 * k, cover.astype(np.float32)) if n_bad else im
if opts.get("--hair-smooth") == "1":
    lum2 = out.mean(axis=2); sat2 = out.max(axis=2) - out.min(axis=2)
    neutral = ndi.binary_closing((lum2 < 0.25) & (sat2 < 0.15), iterations=2)
    sm = np.stack([ndi.median_filter(out[:, :, c], size=max(3, int(5 * k) | 1)) for c in range(3)], axis=2)
    sm = np.stack([ndi.gaussian_filter(sm[:, :, c], 0.8 * k) for c in range(3)], axis=2)
    w = ndi.gaussian_filter(neutral.astype(np.float32), 1.0)[:, :, None]
    out = out * (1 - w) + sm * w
if "--pink-fix" in opts and "--skin" in opts:
    # a pink stain at the neckline (skin colour bled into the cloth edge): in the given height band every texel that is pinker than the skin is refilled from the skin-coloured texels round it
    z0_, z1_ = [float(v) for v in opts["--pink-fix"].split(",")]
    skin = np.array([float(v) for v in opts["--skin"].split(",")])
    r_, g_, b_ = out[:, :, 0], out[:, :, 1], out[:, :, 2]
    band = cover & (zmap > z0_) & (zmap < z1_)
    pink = band & (r_ - g_ > 0.22) & (b_ > 0.28) & (b_ > g_ - 0.03) & (r_ > skin[0] + 0.04)
    pink = ndi.binary_dilation(ndi.binary_opening(pink, iterations=1), iterations=max(1, int(round(2 * k)))) & band
    good = cover & (np.abs(out - skin[None, None, :]).max(axis=2) < 0.12) & (zmap > z0_ - 0.05) & (zmap < z1_ + 0.05)
    if pink.sum() > 20 and good.sum() > 200:
        out = fill(out, pink, 6 * k, good.astype(np.float32))
        print("PINK texels", int(pink.sum()))
if "--logo-z" in opts:
    # a printed word on a cap: the cap is red; everything inside the closed outline of the red region above the given height that is not red (the print and its pink halo) takes the cap's flat colour
    zl_ = float(opts["--logo-z"])
    r_, g_, b_ = out[:, :, 0], out[:, :, 1], out[:, :, 2]
    core = cover & (zmap > zl_) & (r_ > 0.50) & (g_ < 0.30) & (b_ < 0.38) & (r_ - g_ > 0.30)
    if core.sum() > 50:
        ref = np.median(out[core], axis=0)
        closed = ndi.binary_closing(np.pad(core, 40), structure=np.ones((3, 3), bool), iterations=int(18 * k))[40:-40, 40:-40]
        holes = closed & ~core & cover & (zmap > zl_)
        holes = ndi.binary_dilation(holes, iterations=max(1, int(round(2 * k)))) & closed & (zmap > zl_)
        w = ndi.gaussian_filter(holes.astype(np.float32), 0.8)[:, :, None]
        out = out * (1 - w) + ref[None, None, :] * w
        print("LOGO texels", int(holes.sum()))
Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(dst, quality=int(opts.get("--quality", 88)))
print("TEXFIX", dst, "patch texels", n_bad)
