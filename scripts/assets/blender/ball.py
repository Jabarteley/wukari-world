"""The football: a 22 cm ball with the classic twelve dark pentagons, painted as vertex colours (no texture, one material).

    blender --background --factory-startup --python scripts/assets/blender/ball.py -- --out ball.glb [--diameter 0.22]

An icosphere of 320 triangles; the five triangles around each of the twelve icosahedron corners make a dark pentagon, the rest
are white, which reads as a ball at the sizes a phone draws it. Smooth shading.
"""
import os
import sys

sys.dont_write_bytecode = True  # no __pycache__ (it would hold this machine's paths) next to the scripts
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402

import bpy  # noqa: E402


def options(p):
    p.add_argument('--diameter', type=float, default=0.22)


def build(diameter):
    c.reset()
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1.0)
    corners = [v.co.normalized() for v in bpy.context.active_object.data.vertices]
    bpy.data.objects.remove(bpy.context.active_object)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=diameter / 2)
    ball = bpy.context.active_object
    ball.name = 'ball'
    # The twelve corners of the first icosahedron (subdivision 1 is the plain icosahedron) mark the pentagons.
    verts = ball.data.vertices
    dark, white = c.PALETTE['dark'], c.PALETTE['white']

    tips = {i for i, v in enumerate(verts) if max(v.co.normalized().dot(k) for k in corners) > 0.9999}

    def colour(poly):
        return dark if tips.intersection(poly.vertices) else white

    c.vertex_colours(ball, colour)
    bpy.ops.object.shade_smooth()
    return ball


if __name__ == '__main__':
    a = c.args(options)
    c.export(a.out, [build(a.diameter)], vertex_colour=True)
