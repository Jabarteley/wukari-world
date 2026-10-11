"""Writes alternative prints for an outfit: separate colour maps on the same layout, made by moving each colour of the print on its own (not by one global hue shift), leaving skin alone.

  blender --background --python print_variants.py -- <colour.jpg> <mask.png> <out-prefix> <set>      (writes <out-prefix>2.jpg, <out-prefix>3.jpg)
  set: dashiki (teal and cream) or ankara (blue, green and orange)
Every path is an argument.
"""
import sys
import bpy
import numpy as np
argv = sys.argv[sys.argv.index("--") + 1:]
colour, mask, prefix, which = argv[:4]
img = bpy.data.images.load(colour); img.colorspace_settings.name = "Non-Color"
W, H = img.size; px = np.array(img.pixels[:]).reshape(H, W, 4)[:, :, :3].astype(np.float32)
mk = bpy.data.images.load(mask); mk.colorspace_settings.name = "Non-Color"
mw, mh = mk.size; m = np.array(mk.pixels[:]).reshape(mh, mw, 4)
skin = m[:, :, 0][(np.arange(H) * mh // H)[:, None], (np.arange(W) * mw // W)[None, :]].astype(np.float32)


def rgb2hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(-1); mn = a.min(-1); d = mx - mn + 1e-9
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6.0
    return np.stack([h % 1.0, np.where(mx > 0, (mx - mn) / (mx + 1e-9), 0), mx], -1)


def hsv2rgb(a):
    h, s, v = a[..., 0] * 6, a[..., 1], a[..., 2]
    i = np.floor(h) % 6; f = h - np.floor(h); p = v * (1 - s); q = v * (1 - f * s); t = v * (1 - (1 - f) * s)
    out = np.zeros(a.shape, np.float32)
    for k, (r, g, b) in enumerate(((v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q))):
        sel = i == k; out[..., 0][sel] = r[sel]; out[..., 1][sel] = g[sel]; out[..., 2][sel] = b[sel]
    return out


def remap(hsv, clusters):
    h = hsv[..., 0]; dh = np.zeros_like(h); wsum = np.zeros_like(h)
    for centre, target, vmul in clusters:
        d = np.abs(((h - centre + 0.5) % 1.0) - 0.5)
        w = np.clip(1 - d / 0.10, 0, 1) ** 1.5
        dh += w * (((target - centre + 0.5) % 1.0) - 0.5); wsum += w
    out = hsv.copy()
    out[..., 0] = (h + dh) % 1.0
    vm = np.ones_like(h)
    for centre, target, vmul in clusters:
        d = np.abs(((h - centre + 0.5) % 1.0) - 0.5); vm *= 1 + (vmul - 1) * np.clip(1 - d / 0.10, 0, 1)
    out[..., 2] = np.clip(out[..., 2] * vm, 0, 1)
    return out


sets = {
    "dashiki": [[(0.50, 0.04, 1.0)], [(0.50, 0.78, 0.9)]],
    "ankara": [[(0.62, 0.99, 1.05), (0.34, 0.13, 1.1), (0.09, 0.50, 0.95)], [(0.62, 0.78, 0.95), (0.34, 0.90, 1.0), (0.09, 0.22, 1.0)]],
}
hsv = rgb2hsv(px)
for k, clusters in enumerate(sets[which], start=2):
    out = hsv2rgb(remap(hsv, clusters))
    w = (np.clip(hsv[..., 1] / 0.12, 0, 1) * (1 - skin))[..., None]          # only coloured texels that are not skin
    res = np.clip(px * (1 - w) + out * w, 0, 1)
    buf = np.concatenate([res, np.ones((H, W, 1), np.float32)], -1).astype(np.float32)
    o = bpy.data.images.new(f"v{k}", W, H, alpha=False); o.colorspace_settings.name = "Non-Color"; o.pixels.foreach_set(buf.ravel())
    bpy.context.scene.render.image_settings.file_format = "JPEG"; bpy.context.scene.render.image_settings.quality = 72
    o.save_render(f"{prefix}{k}.jpg", scene=bpy.context.scene)
    print("PRINT", k)
