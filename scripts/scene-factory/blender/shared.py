"""Deterministic static scene assets using the repository's Blender helpers."""
import math
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'assets' / 'blender'))
import common
import bpy
import numpy as np


def colour(value):
    if not isinstance(value, str) or len(value) != 7 or value[0] != '#':
        raise ValueError('Expected a six-digit palette colour')
    return tuple(int(value[i:i + 2], 16) / 255 for i in (1, 3, 5))


def palette(values):
    if not isinstance(values, list) or not 4 <= len(values) <= 16:
        raise ValueError('A palette needs 4 to 16 colours')
    return [common.material(f'palette-{i}', colour(value)) for i, value in enumerate(values)]


def box(name, size, at, mat):
    return common.box(name, size, at, mat)


def mesh_object(name, vertices, faces, mat):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def roof(name, width, depth, height, at, mat, form='gable'):
    x, y, z = at
    if form == 'flat':
        return box(name, (width, depth, max(height * 0.2, 0.06)), (x, y, z), mat)
    vertices = [(x - width / 2, y - depth / 2, z), (x + width / 2, y - depth / 2, z),
                (x + width / 2, y + depth / 2, z), (x - width / 2, y + depth / 2, z),
                (x, y - depth / 2, z + height), (x, y + depth / 2, z + height)]
    faces = [(0, 3, 2, 1), (0, 1, 4), (3, 5, 2), (0, 4, 5, 3), (1, 2, 5, 4)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def ico(name, radius, at, mat, scale=(1, 1, 1), subdivisions=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=radius, location=at)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    obj.data.materials.append(mat)
    return obj


def normalize(obj, dimensions=None):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    values = np.array([tuple(vertex.co) for vertex in obj.data.vertices])
    low, high = values.min(axis=0), values.max(axis=0)
    if np.any(high - low <= 0):
        raise ValueError(f'{obj.name}: collapsed geometry')
    centre = np.array([(low[0] + high[0]) / 2, (low[1] + high[1]) / 2, low[2]])
    factor = np.array(dimensions) / (high - low) if dimensions else np.ones(3)
    for vertex in obj.data.vertices:
        vertex.co = tuple((np.array(vertex.co) - centre) * factor)
    obj.data.update()


def atlas_material(values):
    pixels = np.ones((1024, 1024, 4), dtype=np.float32)
    for cell in range(16):
        x, y = (cell % 4) * 256, (cell // 4) * 256
        base = np.array(common.srgb_to_linear(colour(values[cell % len(values)])))
        pixels[y:y + 256, x:x + 256, :3] = base
        # Wide tonal bands survive minification without adding a second texture.
        pixels[y + 16:y + 48, x + 16:x + 240, :3] = base * 0.94
        pixels[y + 208:y + 240, x + 16:x + 240, :3] = base * 0.88
    image = common.image('region-atlas', 1024, 1024, pixels)
    return common.textured_material('region-atlas', image)


def finish_prop(name, objects, materials, atlas):
    obj = common.join(objects, name)
    normalize(obj)
    tiles = {mat.name: i for i, mat in enumerate(materials)}
    while obj.data.uv_layers:
        obj.data.uv_layers.remove(obj.data.uv_layers[0])
    uv = obj.data.uv_layers.new(name='UVMap')
    for polygon in obj.data.polygons:
        material = obj.data.materials[polygon.material_index]
        cell = tiles[material.name]
        left, bottom = (cell % 4) / 4, (cell // 4) / 4
        for i, loop in enumerate(polygon.loop_indices):
            angle = 2 * math.pi * i / len(polygon.loop_indices)
            uv.data[loop].uv = (left + 0.125 + math.cos(angle) * 0.105, bottom + 0.125 + math.sin(angle) * 0.105)
        polygon.material_index = 0
    obj.data.materials.clear()
    obj.data.materials.append(atlas)
    count = common.triangles(obj)
    if count > 1500:
        raise ValueError(f'{name}: {count} triangles exceed 1500')
    return obj


def finish_hero(name, objects, materials, values, dimensions):
    obj = common.join(objects, name)
    normalize(obj, dimensions)
    colour_by_name = {mat.name: colour(values[i]) for i, mat in enumerate(materials)}
    face_colours = [colour_by_name[obj.data.materials[p.material_index].name] for p in obj.data.polygons]
    common.vertex_colours(obj, lambda face: face_colours[face.index])
    count = common.triangles(obj)
    if count > 4000:
        raise ValueError(f'{name}: {count} triangles exceed 4000')
    return obj
