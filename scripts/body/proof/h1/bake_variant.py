"""Bakes a retextured variant onto an already reduced figure and composites it over the original colour map through the cloth weight.

  blender --background --disable-autoexec --python bake_variant.py -- <reduced.blend> <variant-colour.png> <original-colour-eyes.jpg> <cloth.npy> <out.jpg> [--quality 55]

The reduced blend holds the detail mesh "High" (with its colour map on the generator's own layout, kept by the retexture) and the reduced mesh "Low" with its unwrap.  The variant map is put
on High, baked to Low exactly like the original, and then laid over the original only where the cloth weight says cloth.  Every path is an argument.
"""
import os, sys
import bpy
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
pos = [a for a in argv if not a.startswith("--")]
opts = {argv[i]: argv[i + 1] for i, a in enumerate(argv) if a.startswith("--") and i + 1 < len(argv)}
blend, variant, orig, cloth_npy, out_jpg = pos[:5]
bpy.ops.wm.open_mainfile(filepath=blend)
low = bpy.data.objects["Low"]
if "--high-blend" in opts:
    # the colour map belongs to a differently built detail mesh (posed the same way): bring that mesh in instead
    bpy.data.objects.remove(bpy.data.objects["High"])
    with bpy.data.libraries.load(opts["--high-blend"]) as (src_, dst_):
        dst_.objects = ["High"]
    high = dst_.objects[0]; bpy.context.collection.objects.link(high)
else:
    high = bpy.data.objects["High"]
bb = [high.matrix_world @ Vector(c) for c in high.bound_box]; Hh = max(v.z for v in bb) - min(v.z for v in bb)
new = bpy.data.images.load(variant); new.colorspace_settings.name = "sRGB"
hm = bpy.data.materials.new("variant"); hm.use_nodes = True; tn = hm.node_tree
for n_ in list(tn.nodes):
    tn.nodes.remove(n_)
tx = tn.nodes.new("ShaderNodeTexImage"); tx.image = new; em = tn.nodes.new("ShaderNodeEmission"); out_ = tn.nodes.new("ShaderNodeOutputMaterial")
tn.links.new(tx.outputs["Color"], em.inputs["Color"]); tn.links.new(em.outputs[0], out_.inputs["Surface"])
high.data.materials.clear(); high.data.materials.append(hm)
tex_px = int(os.environ.get("VARIANT_PX", 1024))
scene = bpy.context.scene
scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 8; scene.cycles.use_denoising = False
scene.render.bake.margin = 8; scene.render.bake.margin_type = "EXTEND"; scene.render.bake.use_selected_to_active = True
scene.render.bake.cage_extrusion = 0.03 * Hh / 1.7; scene.render.bake.max_ray_distance = 0.12 * Hh / 1.7
scene.view_settings.view_transform = "Standard"
img = bpy.data.images.new("vbake", tex_px, tex_px, alpha=False); img.colorspace_settings.name = "sRGB"
mat = bpy.data.materials.new("vbake"); mat.use_nodes = True
node = mat.node_tree.nodes.new("ShaderNodeTexImage"); node.image = img; mat.node_tree.nodes.active = node
low.data.materials.clear(); low.data.materials.append(mat)
bpy.ops.object.select_all(action="DESELECT"); high.select_set(True); low.select_set(True); bpy.context.view_layer.objects.active = low
bpy.ops.object.bake(type="EMIT")
b = np.array(img.pixels[:]).reshape(tex_px, tex_px, 4)[:, :, :3]
o = bpy.data.images.load(orig); o.colorspace_settings.name = "sRGB"
if o.size[0] != tex_px: o.scale(tex_px, tex_px)
oa = np.array(o.pixels[:]).reshape(tex_px, tex_px, 4)[:, :, :3]
cl = np.load(cloth_npy).astype(np.float32)
if cl.shape[0] != tex_px: cl = cl[(np.arange(tex_px) * cl.shape[0] // tex_px)[:, None], (np.arange(tex_px) * cl.shape[1] // tex_px)[None, :]]
res = oa * (1 - cl[..., None]) + b * cl[..., None]
out = bpy.data.images.new("vout", tex_px, tex_px, alpha=False); out.colorspace_settings.name = "sRGB"
out.pixels.foreach_set(np.concatenate([res, np.ones((tex_px, tex_px, 1))], axis=2).astype(np.float32).ravel())
scene.render.image_settings.file_format = "JPEG"; scene.render.image_settings.quality = int(opts.get("--quality", 55))
out.save_render(out_jpg, scene=scene)
print("VARIANT", out_jpg)
