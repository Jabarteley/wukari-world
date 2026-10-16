"""The Fight ring: a raised canvas with four corner posts, three ropes a side, corner pads, two sets of steps, on a concrete floor.

    blender --background --factory-startup --python scripts/assets/blender/ring.py -- --out ring.glb [--size 6.0]

Real proportions: a 6 m square inside the ropes (amateur rings are 4.9 to 6.1 m), the canvas 1.0 m off the floor, ropes at
0.45, 0.85 and 1.25 m above it, posts 1.45 m tall. Colours from the Allworld palette (the game's green apron, amber pads, cream
canvas). Colour and ambient occlusion are baked into one 1024 px atlas with one material: one draw call, no shadow map needed.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402


def options(p):
    p.add_argument('--size', type=float, default=6.0, help='inside the ropes, metres')


def build(size):
    c.reset()
    apron = c.material('apron', c.PALETTE['green'])
    canvas = c.material('canvas', c.PALETTE['cream'])
    trim = c.material('trim', c.PALETTE['amber'])
    post = c.material('post', c.PALETTE['dark'], roughness=0.4, metallic=0.6)
    rope_a = c.material('rope-a', c.PALETTE['red'])
    rope_b = c.material('rope-b', c.PALETTE['white'])
    floor = c.material('floor', c.PALETTE['concrete'], roughness=0.95)
    step = c.material('step', c.PALETTE['concrete'])

    h = 1.0                      # canvas height
    half = size / 2              # posts stand at the corners of the roped square
    outer = half + 0.5           # the apron runs 0.5 m outside the ropes
    parts = [
        c.box('floor', (outer * 2 + 7.0, outer * 2 + 7.0, 0.1), (0, 0, -0.05), floor),
        c.box('base', (outer * 2, outer * 2, h - 0.06), (0, 0, (h - 0.06) / 2), apron),
        c.box('canvas', (outer * 2, outer * 2, 0.06), (0, 0, h - 0.03), canvas, bevel=0.02),
        c.box('trim-n', (outer * 2, 0.04, 0.12), (0, outer, h - 0.12), trim),
        c.box('trim-s', (outer * 2, 0.04, 0.12), (0, -outer, h - 0.12), trim),
        c.box('trim-e', (0.04, outer * 2, 0.12), (outer, 0, h - 0.12), trim),
        c.box('trim-w', (0.04, outer * 2, 0.12), (-outer, 0, h - 0.12), trim),
    ]
    corners = [(sx * half, sy * half) for sx in (-1, 1) for sy in (-1, 1)]
    for i, (x, y) in enumerate(corners):
        parts.append(c.cylinder(f'post-{i}', 0.07, 1.45, (x, y, h + 0.725), post, vertices=8))
        parts.append(c.box(f'pad-{i}', (0.22, 0.22, 1.0), (x * 0.985, y * 0.985, h + 0.85), trim, bevel=0.03))
    ropes = (0.45, 0.85, 1.25)
    sides = [((-half, -half), (half, -half)), ((half, -half), (half, half)), ((half, half), (-half, half)), ((-half, half), (-half, -half))]
    for s, (a, b) in enumerate(sides):
        for r, z in enumerate(ropes):
            parts.append(c.segment(f'rope-{s}-{r}', (a[0], a[1], h + z), (b[0], b[1], h + z), 0.022, rope_a if r != 1 else rope_b, vertices=6))
    # Steps at two opposite corners, outside the apron.
    for sx, sy, name in ((1, -1, 'steps-a'), (-1, 1, 'steps-b')):
        for k in range(3):
            depth = 0.3 * (3 - k)
            parts.append(c.box(f'{name}-{k}', (0.9, depth, (k + 1) * h / 3), (sx * (outer - 0.6), sy * (outer + depth / 2), (k + 1) * h / 6), step))
    ring = c.join(parts, 'ring')
    c.bake_atlas(ring, size=1024)
    return ring


if __name__ == '__main__':
    a = c.args(options)
    ring = build(a.size)
    c.export(a.out, [ring])
