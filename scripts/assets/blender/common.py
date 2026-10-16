"""Shared helpers for the Blender scripts that make Allworld's own assets (docs/ASSET-PIPELINE.md).

Run through scripts/assets/fetch-pack.ts (a want list of kind "own"), or by hand:
    blender --background --factory-startup --python scripts/assets/blender/<name>.py -- --out <file.glb> [options]

Everything is built from code so the asset can be rebuilt byte for byte from the repository: no .blend is needed, none is read.
Units are metres, +Z up in Blender; the glTF exporter writes +Y up. Only Blender's own modules are used (bpy, bmesh, mathutils
and the numpy Blender ships with); no add-on is needed.
"""
import argparse
import math
import sys

import bmesh
import bpy
import numpy as np

# The Allworld palette (the app's green and amber, the world's warm Lagos tones), as sRGB 0..1.
PALETTE = {
    'green': (0.094, 0.231, 0.165),      # #183b2a, the game's own green
    'amber': (0.910, 0.651, 0.263),      # #e8a643
    'cream': (0.937, 0.910, 0.847),
    'red': (0.737, 0.200, 0.161),
    'blue': (0.180, 0.341, 0.588),
    'concrete': (0.560, 0.545, 0.520),
    'dark': (0.125, 0.137, 0.173),       # #20232c
    'white': (0.960, 0.960, 0.950),
    'grass': (0.247, 0.510, 0.239),
    'grass-dark': (0.204, 0.443, 0.204),
}


def args(extra=None):
    """Arguments after `--`; every script takes --out and may add its own."""
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', required=True)
    if extra:
        extra(parser)
    return parser.parse_args(argv)


def reset():
    """An empty scene with metric units and a fixed random seed for anything that samples."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    return scene


def srgb_to_linear(c):
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def material(name, colour, roughness=0.85, metallic=0.0):
    """A plain Principled material; `colour` is sRGB 0..1."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*srgb_to_linear(colour), 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    m.use_backface_culling = True
    return m


def box(name, size, location, mat, bevel=0.0):
    """An axis-aligned box `size` (x, y, z) metres centred at `location`."""
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel > 0:
        mod = o.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    o.data.materials.append(mat)
    return o


def cylinder(name, radius, depth, location, mat, vertices=8, rotation=(0.0, 0.0, 0.0), caps=True):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation,
                                        end_fill_type='NGON' if caps else 'NOTHING')
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(mat)
    return o


def segment(name, a, b, radius, mat, vertices=6):
    """A thin cylinder from point a to point b (ropes, bars)."""
    a, b = np.array(a, dtype=float), np.array(b, dtype=float)
    d = b - a
    length = float(np.linalg.norm(d))
    mid = (a + b) / 2
    o = cylinder(name, radius, length, tuple(mid), mat, vertices=vertices, caps=False)
    z = np.array([0.0, 0.0, 1.0])
    axis = np.cross(z, d / length)
    angle = math.acos(max(-1.0, min(1.0, float(np.dot(z, d / length)))))
    if np.linalg.norm(axis) > 1e-9:
        o.rotation_mode = 'AXIS_ANGLE'
        o.rotation_axis_angle = (angle, *(axis / np.linalg.norm(axis)))
    bpy.ops.object.transform_apply(rotation=True)
    return o


def join(objects, name):
    """Join objects into one mesh (one draw call per material) and apply every transform."""
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name
    o.data.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return o


def triangles(o):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    n = sum(len(f.verts) - 2 for f in bm.faces)
    bm.free()
    return n


def linear_to_srgb(x):
    x = np.clip(x, 0.0, 1.0)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - 0.055)


def image(name, width, height, pixels):
    """A new 8-bit sRGB image from a float array (height, width, 4) of LINEAR values, row 0 at the bottom. Packed into the file."""
    img = bpy.data.images.new(name, width=width, height=height, alpha=True)
    img.colorspace_settings.name = 'sRGB'
    px = np.array(pixels, dtype=np.float32)
    px[:, :, :3] = linear_to_srgb(px[:, :, :3])
    img.pixels.foreach_set(np.ascontiguousarray(px).ravel())
    img.pack()
    return img


def textured_material(name, img, roughness=0.9, alpha_clip=False):
    """One material that shows `img` as its base colour (the baked atlas)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nodes, links = m.node_tree.nodes, m.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = roughness
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = img
    tex.interpolation = 'Linear'
    links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    m.use_backface_culling = not alpha_clip
    if alpha_clip:
        # A Round node between alpha and the shader is how Blender's glTF exporter writes alphaMode MASK (cutoff 0.5).
        rnd = nodes.new('ShaderNodeMath')
        rnd.operation = 'ROUND'
        links.new(tex.outputs['Alpha'], rnd.inputs[0])
        links.new(rnd.outputs[0], bsdf.inputs['Alpha'])
    return m


def bake_atlas(o, size=1024, ao_strength=0.65, samples=32, margin=4):
    """Bake the object's material colours and its ambient occlusion into ONE size x size atlas, then give it that single material.

    The atlas is colour x (1 - ao_strength + ao_strength x AO): contact shadows in corners and under rails, so the game needs one
    light and no shadow map for them. Lighting itself stays the game's (the ring is lit by the venue)."""
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = samples
    scene.cycles.use_denoising = False
    scene.cycles.seed = 1
    # World light for the AO pass is not needed (AO is geometric), but a world must exist.
    if scene.world is None:
        scene.world = bpy.data.worlds.new('world')
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    # One UV map, islands packed into the atlas.
    while o.data.uv_layers:
        o.data.uv_layers.remove(o.data.uv_layers[0])
    o.data.uv_layers.new(name='UVMap')
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.01, area_weight=1.0, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode='OBJECT')

    def bake(kind, colour_only):
        target = bpy.data.images.new(f'{o.name}-{kind.lower()}', width=size, height=size, alpha=False, float_buffer=True)
        for slot in o.material_slots:
            nt = slot.material.node_tree
            node = nt.nodes.new('ShaderNodeTexImage')
            node.image = target
            nt.nodes.active = node
        scene.render.bake.margin = margin
        if colour_only:
            scene.render.bake.use_pass_direct = False
            scene.render.bake.use_pass_indirect = False
            scene.render.bake.use_pass_color = True
        bpy.ops.object.bake(type=kind)
        for slot in o.material_slots:
            nt = slot.material.node_tree
            nt.nodes.remove(nt.nodes.active)
        px = np.empty(size * size * 4, dtype=np.float32)
        target.pixels.foreach_get(px)
        return px.reshape(size, size, 4)

    colour = bake('DIFFUSE', True)
    ao = bake('AO', False)
    shade = (1.0 - ao_strength) + ao_strength * ao[:, :, :1]
    out = np.concatenate([colour[:, :, :3] * shade, np.ones((size, size, 1), dtype=np.float32)], axis=2)
    atlas = image(f'{o.name}-atlas', size, size, out)
    o.data.materials.clear()
    o.data.materials.append(textured_material(f'{o.name}', atlas))
    return atlas


def vertex_colours(o, colour_of_face):
    """Paint each face one sRGB colour (for tiny props: no texture, one material)."""
    mesh = o.data
    attr = mesh.color_attributes.new(name='Col', type='BYTE_COLOR', domain='CORNER')
    for poly in mesh.polygons:
        c = colour_of_face(poly)
        for li in poly.loop_indices:
            attr.data[li].color_srgb = (*c, 1.0)
    mesh.color_attributes.active_color = attr
    m = bpy.data.materials.new(f'{o.name}-colours')
    m.use_nodes = True
    nodes, links = m.node_tree.nodes, m.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = 0.6
    m.use_backface_culling = True
    vc = nodes.new('ShaderNodeVertexColor')
    vc.layer_name = 'Col'
    links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
    mesh.materials.clear()
    mesh.materials.append(m)


def export(path, objects, vertex_colour=False):
    """GLB, +Y up, transforms applied, no cameras or lights, textures as PNG (prepare.ts makes them WebP)."""
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
        export_animations=False, export_cameras=False, export_lights=False, export_extras=False,
        export_image_format='AUTO', export_vertex_color='ACTIVE' if vertex_colour else 'NONE',
    )
    total = sum(triangles(o) for o in objects)
    print(f'wrote {path}: {total} triangles', file=sys.stderr)
