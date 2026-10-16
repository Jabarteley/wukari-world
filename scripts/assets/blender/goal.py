"""A football goal: two posts, a crossbar, a back frame and a net (one alpha-tested net texture, tiled).

    blender --background --factory-startup --python scripts/assets/blender/goal.py -- --out goal.glb [--width 3 --height 2 --depth 1.2]

Defaults are a five-a-side goal (3 x 2 m, inside the posts); `--width 7.32 --height 2.44 --depth 2` makes a full-size one.
Posts are 8 cm thick and white; the net is four planes with a 64 px mesh texture repeated every 12 cm (one material, alpha
mask, both sides drawn). The goal line is along +X; the net is behind it (+Y in Blender, -Z in glTF).
"""
import os
import sys

import numpy as np

sys.dont_write_bytecode = True  # no __pycache__ (it would hold this machine's paths) next to the scripts
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402

import bmesh  # noqa: E402
import bpy  # noqa: E402

CELL = 0.12  # metres per net square


def options(p):
    p.add_argument('--width', type=float, default=3.0)
    p.add_argument('--height', type=float, default=2.0)
    p.add_argument('--depth', type=float, default=1.2)


def net_texture(size=64, cord=3):
    px = np.zeros((size, size, 4))
    px[:, :, :3] = c.srgb_to_linear(c.PALETTE['white'])
    on = np.zeros((size, size), dtype=bool)
    on[:cord, :] = True
    on[:, :cord] = True
    px[:, :, 3] = on.astype(float)
    return px


def quad(name, corners, mat):
    """A one-face mesh through four corners, UVs in net cells so the texture repeats at real size."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in corners]
    face = bm.faces.new(vs)
    uv = bm.loops.layers.uv.new('UVMap')
    a, b, d = np.array(corners[0]), np.array(corners[1]), np.array(corners[3])
    u_len, v_len = np.linalg.norm(b - a) / CELL, np.linalg.norm(d - a) / CELL
    for loop, (u, v) in zip(face.loops, ((0, 0), (u_len, 0), (u_len, v_len), (0, v_len))):
        loop[uv].uv = (u, v)
    bm.to_mesh(mesh)
    bm.free()
    o = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(mat)
    return o


def build(width, height, depth):
    c.reset()
    white = c.material('frame', c.PALETTE['white'], roughness=0.4)
    r = 0.04
    hw = width / 2 + r  # post centres sit just outside the inside width
    back = depth
    low = height * 0.35  # the back frame drops to the ground behind
    frame = [
        c.cylinder('post-l', r, height + r, (-hw, 0, (height + r) / 2), white, vertices=8),
        c.cylinder('post-r', r, height + r, (hw, 0, (height + r) / 2), white, vertices=8),
        c.segment('bar', (-hw, 0, height + r), (hw, 0, height + r), r, white, vertices=8),
        c.segment('top-l', (-hw, 0, height + r), (-hw, back * 0.4, height + r), 0.02, white),
        c.segment('top-r', (hw, 0, height + r), (hw, back * 0.4, height + r), 0.02, white),
        c.segment('stay-l', (-hw, back * 0.4, height + r), (-hw, back, low), 0.02, white),
        c.segment('stay-r', (hw, back * 0.4, height + r), (hw, back, low), 0.02, white),
        c.segment('back-l', (-hw, back, low), (-hw, back, 0.02), 0.02, white),
        c.segment('back-r', (hw, back, low), (hw, back, 0.02), 0.02, white),
        c.segment('ground-b', (-hw, back, 0.02), (hw, back, 0.02), 0.02, white),
        c.segment('ground-l', (-hw, 0, 0.02), (-hw, back, 0.02), 0.02, white),
        c.segment('ground-r', (hw, 0, 0.02), (hw, back, 0.02), 0.02, white),
        c.segment('back-top', (-hw, back * 0.4, height + r), (hw, back * 0.4, height + r), 0.02, white),
    ]
    goal_frame = c.join(frame, 'goal-frame')
    net_img = c.image('net', 64, 64, net_texture())
    net = c.textured_material('net', net_img, roughness=0.8, alpha_clip=True)
    net.node_tree.nodes['Image Texture'].interpolation = 'Closest'
    t = height + r
    panels = [
        quad('net-top', [(-hw, 0, t), (hw, 0, t), (hw, back * 0.4, t), (-hw, back * 0.4, t)], net),
        quad('net-back', [(-hw, back * 0.4, t), (hw, back * 0.4, t), (hw, back, low), (-hw, back, low)], net),
        quad('net-low', [(-hw, back, low), (hw, back, low), (hw, back, 0), (-hw, back, 0)], net),
        quad('net-l', [(-hw, 0, 0), (-hw, back, 0), (-hw, back, low), (-hw, 0, t)], net),
        quad('net-l2', [(-hw, 0, t), (-hw, back, low), (-hw, back * 0.4, t), (-hw, 0, t + 0.0001)], net),
        quad('net-r', [(hw, 0, 0), (hw, back, 0), (hw, back, low), (hw, 0, t)], net),
        quad('net-r2', [(hw, 0, t), (hw, back, low), (hw, back * 0.4, t), (hw, 0, t + 0.0001)], net),
    ]
    goal_net = c.join(panels, 'goal-net')
    return [goal_frame, goal_net]


if __name__ == '__main__':
    a = c.args(options)
    c.export(a.out, build(a.width, a.height, a.depth))
