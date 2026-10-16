"""The Football pitch: a five-a-side pitch with its markings, a run-off strip and low perimeter boards.

    blender --background --factory-startup --python scripts/assets/blender/pitch.py -- --out pitch.glb [--length 40 --width 20]

Real proportions: 40 x 20 m inside the lines (five-a-side pitches are 25-42 m by 16-25 m), 2 m of run-off, 0.1 m lines, a 3 m
centre circle, a 6 m goal area arc, penalty spots at 6 m and a second spot at 10 m, mowing stripes every 4 m. The markings are
painted straight into one 1024 x 512 texture (the pitch is flat, so there is nothing to bake); the boards are a second, plain
material with vertex colours. Goals are separate (goal.py).
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402

import bpy  # noqa: E402


def options(p):
    p.add_argument('--length', type=float, default=40.0)
    p.add_argument('--width', type=float, default=20.0)


def paint(length, width, runoff, px_w=1024, px_h=512):
    """The pitch texture: x along the length, y across, in metres from the centre spot."""
    total_l, total_w = length + 2 * runoff, width + 2 * runoff
    xs = (np.arange(px_w) + 0.5) / px_w * total_l - total_l / 2
    ys = (np.arange(px_h) + 0.5) / px_h * total_w - total_w / 2
    x, y = np.meshgrid(xs, ys)
    grass = np.array(c.srgb_to_linear(c.PALETTE['grass']))
    dark = np.array(c.srgb_to_linear(c.PALETTE['grass-dark']))
    stripe = (np.floor((x + length / 2) / 4.0) % 2 == 0)[..., None]
    rgb = np.where(stripe, grass, dark)
    line = 0.05  # half the line width
    hl, hw = length / 2, width / 2
    inside = (np.abs(x) <= hl + line) & (np.abs(y) <= hw + line)
    marks = np.zeros_like(x, dtype=bool)
    marks |= inside & ((np.abs(np.abs(x) - hl) <= line) | (np.abs(np.abs(y) - hw) <= line))  # boundary
    marks |= inside & (np.abs(x) <= line)                                                   # halfway line
    r = np.hypot(x, y)
    marks |= np.abs(r - 3.0) <= line                                                         # centre circle
    marks |= r <= 0.12                                                                       # centre spot
    for end in (-1, 1):
        gx = end * hl
        d = np.hypot(x - gx, y)
        towards = (x - gx) * -end >= 0
        marks |= towards & (np.abs(d - 6.0) <= line) & (np.abs(x) <= hl)                    # goal area arc
        marks |= np.hypot(x - (gx - end * 6.0), y) <= 0.1                                    # penalty spot
        marks |= np.hypot(x - (gx - end * 10.0), y) <= 0.1                                   # second spot
    white = np.array(c.srgb_to_linear(c.PALETTE['white']))
    rgb = np.where(marks[..., None], white, rgb)
    return np.concatenate([rgb, np.ones((px_h, px_w, 1))], axis=2)


def build(length, width, runoff=2.0):
    c.reset()
    total_l, total_w = length + 2 * runoff, width + 2 * runoff
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0, 0, 0))
    turf = bpy.context.active_object
    turf.name = 'pitch'
    turf.scale = (total_l, total_w, 1)
    bpy.ops.object.transform_apply(scale=True)
    # The plane's default UVs already run 0..1 along x and y: the painted texture maps straight on.
    img = c.image('pitch', 1024, 512, paint(length, width, runoff))
    turf.data.materials.append(c.textured_material('pitch', img, roughness=0.95))
    board = c.material('boards', c.PALETTE['green'])
    h, t = 0.5, 0.08
    parts = []
    for sx in (-1, 1):
        parts.append(c.box(f'board-x{sx}', (t, total_w, h), (sx * (total_l / 2 + t / 2), 0, h / 2), board))
        parts.append(c.box(f'cap-x{sx}', (t + 0.02, total_w, 0.04), (sx * (total_l / 2 + t / 2), 0, h + 0.02), board))
    for sy in (-1, 1):
        parts.append(c.box(f'board-y{sy}', (total_l + 2 * t, t, h), (0, sy * (total_w / 2 + t / 2), h / 2), board))
        parts.append(c.box(f'cap-y{sy}', (total_l + 2 * t, t + 0.02, 0.04), (0, sy * (total_w / 2 + t / 2), h + 0.02), board))
    boards = c.join(parts, 'boards')
    # Green boards with an amber cap, as vertex colours: one plain material.
    verts = boards.data.vertices
    c.vertex_colours(boards, lambda poly: c.PALETTE['amber'] if min(verts[i].co.z for i in poly.vertices) >= h - 0.001 else c.PALETTE['green'])
    return [turf, boards]


if __name__ == '__main__':
    a = c.args(options)
    c.export(a.out, build(a.length, a.width), vertex_colour=True)
