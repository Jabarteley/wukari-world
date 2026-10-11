"""Recolours the baked base-colour texture of a reduced asset through region masks, one new texture per variant.

  blender --background --disable-autoexec --python variants.py -- <name.blend> <name-color.jpg> <variants.json> <asset-key> <out-dir> <name>

<variants.json>[<asset-key>] maps a variant name to a list of rules. A rule selects texels by hue / saturation / value of the original texture
and by where they sit on the model (x, y, z in metres, from a position bake onto the same unwrap), and recolours them:
  {"select": {"hue": [h0, h1], "sat": [s0, s1], "val": [v0, v1], "x": [..], "y": [..], "z": [..]}, "to": {"hue": h, "sat": s, "val": v} or {"rgb": [r, g, b]}}
Hue is in degrees. "to" with hue/sat/val keeps the shading of the original (value is scaled by "val" when given as a factor). Writes
<out-dir>/<name>-<variant>-color.jpg. Every path is an argument. Nothing else is changed: the mesh and the unwrap are the same, so a variant is the same
model with another texture.
"""
import colorsys
import json
import os
import sys

import bpy
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:]
blend, colour_jpg, rules_path, key, out_dir, name = argv[:6]
rules = json.load(open(rules_path))[key]
bpy.ops.wm.open_mainfile(filepath=blend)
low = bpy.data.objects["Low"]
low.hide_render = False; low.hide_viewport = False
scene = bpy.context.scene
img = bpy.data.images.load(colour_jpg)
img.colorspace_settings.name = "sRGB"
w, h = img.size
rgb = np.empty(w * h * 4, dtype=np.float32); img.pixels.foreach_get(rgb)
rgb = rgb.reshape(h, w, 4)[:, :, :3].copy()

# --- where each texel sits on the model: bake object-space position (as colour) onto the existing unwrap
pts = np.array([v.co[:] for v in low.data.vertices])
lo = pts.min(axis=0); hi = pts.max(axis=0)
pos_img = bpy.data.images.new("pos", w, h, alpha=False, float_buffer=True)
pos_img.colorspace_settings.name = "Non-Color"
mat = bpy.data.materials.new("pos"); mat.use_nodes = True
nt = mat.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)
geo = nt.nodes.new("ShaderNodeNewGeometry"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); comb = nt.nodes.new("ShaderNodeCombineXYZ")
emit = nt.nodes.new("ShaderNodeEmission"); out = nt.nodes.new("ShaderNodeOutputMaterial"); tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = pos_img
nt.links.new(geo.outputs["Position"], sep.inputs[0])
for axis_i, ax in enumerate(("X", "Y", "Z")):
    m = nt.nodes.new("ShaderNodeMapRange")
    m.inputs["From Min"].default_value = float(lo[axis_i]); m.inputs["From Max"].default_value = float(hi[axis_i])
    nt.links.new(sep.outputs[ax], m.inputs["Value"]); nt.links.new(m.outputs["Result"], comb.inputs[ax])
nt.links.new(comb.outputs[0], emit.inputs["Color"]); nt.links.new(emit.outputs[0], out.inputs["Surface"])
nt.nodes.active = tex
low.data.materials.clear(); low.data.materials.append(mat)
for o in bpy.data.objects:
    o.select_set(False)
low.select_set(True); bpy.context.view_layer.objects.active = low
scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 1; scene.cycles.use_denoising = False
scene.render.bake.use_selected_to_active = False; scene.render.bake.margin = 6; scene.render.bake.margin_type = "EXTEND"
scene.view_settings.view_transform = "Raw"
bpy.ops.object.bake(type="EMIT")
p = np.empty(w * h * 4, dtype=np.float32); pos_img.pixels.foreach_get(p)
p = p.reshape(h, w, 4)[:, :, :3]
world = lo + p * (hi - lo)          # metres, per texel

# --- hue / saturation / value of the original, vectorised
mx = rgb.max(axis=2); mn = rgb.min(axis=2); d = mx - mn
hue = np.zeros_like(mx)
nz = d > 1e-6
r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
hue = np.where(nz & (mx == r), ((g - b) / np.where(nz, d, 1)) % 6, hue)
hue = np.where(nz & (mx == g), (b - r) / np.where(nz, d, 1) + 2, hue)
hue = np.where(nz & (mx == b), (r - g) / np.where(nz, d, 1) + 4, hue)
hue = (hue * 60) % 360
sat = np.where(mx > 1e-6, d / np.where(mx > 1e-6, mx, 1), 0)
val = mx


def band(x, lo_, hi_, soft):
    """1 inside [lo_, hi_], falling to 0 over `soft` outside it."""
    return np.clip(np.minimum((x - lo_) / soft + 1, (hi_ - x) / soft + 1), 0, 1)


def select(sel):
    m = np.ones_like(val)
    if "hue" in sel:
        h0, h1 = sel["hue"]
        c = (h0 + h1) / 2 if h0 <= h1 else ((h0 + h1 + 360) / 2) % 360
        half = ((h1 - h0) % 360) / 2
        dist = np.abs(((hue - c + 180) % 360) - 180)
        m = m * np.clip((half + 12 - dist) / 12, 0, 1)
    if "sat" in sel:
        m = m * band(sat, sel["sat"][0], sel["sat"][1], 0.08)
    if "val" in sel:
        m = m * band(val, sel["val"][0], sel["val"][1], 0.06)
    for i, ax in enumerate("xyz"):
        if ax in sel:
            m = m * band(world[:, :, i], sel[ax][0], sel[ax][1], 0.06)
    return m


def hsv_to_rgb(hh, ss, vv):
    h6 = (hh % 360) / 60.0
    i = np.floor(h6).astype(int) % 6; f = h6 - np.floor(h6)
    pp = vv * (1 - ss); q = vv * (1 - f * ss); t = vv * (1 - (1 - f) * ss)
    out_ = np.zeros(hh.shape + (3,), dtype=np.float32)
    for k, (a_, b_, c_) in enumerate(((vv, t, pp), (q, vv, pp), (pp, vv, t), (pp, q, vv), (t, pp, vv), (vv, pp, q))):
        sel_ = i == k
        out_[sel_, 0] = a_[sel_]; out_[sel_, 1] = b_[sel_]; out_[sel_, 2] = c_[sel_]
    return out_


for variant, rule_list in rules.items():
    res = rgb.copy()
    for rule in rule_list:
        m = select(rule["select"])[:, :, None]
        to = rule["to"]
        if "rgb" in to:
            # keep the shading: scale the colour by the texel's value relative to the rule's reference value
            ref = to.get("ref", 0.5)
            new = np.clip(np.array(to["rgb"], dtype=np.float32)[None, None, :] * (np.clip(val, 0, 1)[:, :, None] / ref) ** to.get("gamma", 0.6) * to.get("gain", 1.0), 0, 1)
        else:
            new = hsv_to_rgb(np.full_like(hue, to["hue"]) if "hue" in to else hue, np.clip(sat * to.get("satMul", 1.0) + to.get("satAdd", 0.0), 0, 1) if "sat" not in to else np.full_like(sat, to["sat"]), np.clip(val * to.get("valMul", 1.0) + to.get("valAdd", 0.0), 0, 1))
        res = res * (1 - m) + new * m
    outimg = bpy.data.images.new("v-" + variant, w, h, alpha=False)
    outimg.colorspace_settings.name = "sRGB"
    flat = np.concatenate([res, np.ones((h, w, 1), dtype=np.float32)], axis=2).reshape(-1).astype(np.float32)
    outimg.pixels.foreach_set(flat)
    scene.render.image_settings.file_format = "JPEG"; scene.render.image_settings.quality = int(os.environ.get("REDUCE_QUALITY", "86"))
    scene.view_settings.view_transform = "Standard"
    outimg.save_render(os.path.join(out_dir, "%s-%s-color.jpg" % (name, variant)), scene=scene)
    print("VARIANT", variant, "texels changed", int((np.abs(res - rgb).max(axis=2) > 0.05).sum()))
