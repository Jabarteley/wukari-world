# Build a house in Blender from an Allworld house description (reference/house-spec.md), the same way the game builds it, so it can be
# made to look like the photos and exported as a .glb (house skill, docs/HOUSE-FROM-PHOTOS.md).
#
#   blender --background --python build_house.py -- house.json house.blend [house.glb]
#
# Metres. Blender: Z up, the front wall along X at Y = 0, the house towards -Y (the glTF exporter turns this into the game's axes).
# Objects are named "Wall front 0", "Floor Kitchen", "Roof" and so on; an empty "allworld_spawn" stands at the front door.
import json
import math
import sys

import bpy

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if len(argv) < 2:
    raise SystemExit('Usage: blender --background --python build_house.py -- house.json house.blend [house.glb]')
spec = json.load(open(argv[0]))
if spec.get('v') != 1:
    raise SystemExit('house.json must say "v": 1 (reference/house-spec.md).')

def clamp(v, lo, hi):
    return max(lo, min(hi, v))

STOREYS = int(clamp(round(spec.get('storeys', 1)), 1, 3))
W = float(clamp(spec.get('width', 8), 3, 30))
D = float(clamp(spec.get('depth', 8), 3, 30))
H = float(clamp(spec.get('storeyHeight', 3), 2.6, 3.4))
SLAB, OUTER, INNER = 0.12, 0.16, 0.1
WALL = H - SLAB
walls = spec.get('walls', {})
roof = spec.get('roof', {})
rooms = [r for r in spec.get('rooms', []) if isinstance(r, dict)]
doors = [d for d in spec.get('doors', []) if isinstance(d, dict)]
windows = [w for w in spec.get('windows', []) if isinstance(w, dict)]
stairs = [s for s in spec.get('stairs', []) if isinstance(s, dict)]
extras = spec.get('extras', {})
if not any(d.get('wall') != 'inner' and d.get('floor', 0) == 0 for d in doors):
    doors.insert(0, {'floor': 0, 'wall': 'front', 'at': W / 2, 'width': 0.9, 'main': True})

# A clean scene.
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
house = bpy.data.collections.new('House')
scene.collection.children.link(house)

materials = {}
def material(name, hex_color, roughness=0.85, metallic=0.0, alpha=1.0):
    key = (name, hex_color, alpha)
    if key in materials:
        return materials[key]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    h = (hex_color or '#cccccc').lstrip('#')
    rgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    bsdf.inputs['Base Color'].default_value = (*lin, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if alpha < 1:
        bsdf.inputs['Alpha'].default_value = alpha
        m.blend_method = 'BLEND' if hasattr(m, 'blend_method') else m.blend_method
    materials[key] = m
    return m

outer = material('Outside walls', walls.get('color', '#efe6d6'), 0.92)
inner = material('Inside walls', walls.get('inner', '#f4f1ea'), 0.9)
trim = material('Trim', walls.get('trim', '#ffffff'), 0.45)
slab_m = material('Slab', '#cfc8bb', 0.95)
ceiling_m = material('Ceiling', '#fbfaf6', 0.95)
wood = material('Wood floor', '#b08a5a', 0.6)
roof_m = material('Roof', roof.get('color', '#8a3b2a'), 0.8)
glass = material('Glass', '#bfe0f0', 0.05, 0.0, 0.25)

def box(name, cx, cy, cz, sx, sy, sz, mat, rot=None):
    """A box by its centre and size in the game's axes (x across, y up, z back), made in Blender's (x, -z, y)."""
    mesh = bpy.data.meshes.new(name)
    hx, hy, hz = sx / 2, sz / 2, sy / 2  # Blender x, y, z half sizes
    v = [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, hy, -hz), (-hx, hy, -hz), (-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    mesh.from_pydata(v, [], f)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = (cx, -cz, cy)
    if rot:
        obj.rotation_euler = rot
    mesh.materials.append(mat)
    house.objects.link(obj)
    return obj

def run(name, mat, axis, line, a0, a1, y, thick, openings):
    """A wall along x (at z = line) or along z (at x = line) with openings (a, b, bottom, top), as boxes round them."""
    def piece(a, b, bottom, top):
        if b - a < 0.01 or top - bottom < 0.01:
            return
        if axis == 'x':
            box(name, (a + b) / 2, y + (bottom + top) / 2, line, b - a, top - bottom, thick, mat)
        else:
            box(name, line, y + (bottom + top) / 2, (a + b) / 2, thick, top - bottom, b - a, mat)
    at = a0
    for a, b, bottom, top in sorted(openings):
        a, b = max(a0, a), min(a1, b)
        if b <= a:
            continue
        piece(at, a, 0, WALL); piece(a, b, 0, bottom); piece(a, b, top, WALL)
        at = b
    piece(at, a1, 0, WALL)

def union(spans):
    out = []
    for a, b in sorted(spans):
        if out and a <= out[-1][1] + 0.01:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return out

def minus(rect, hole):
    x0, z0, x1, z1 = rect
    if not hole:
        return [rect]
    hx0, hz0, hx1, hz1 = hole
    if hx1 <= x0 or hx0 >= x1 or hz1 <= z0 or hz0 >= z1:
        return [rect]
    out = [(x0, z0, x1, max(z0, hz0)), (x0, min(z1, hz1), x1, z1), (x0, max(z0, hz0), max(x0, hx0), min(z1, hz1)), (min(x1, hx1), max(z0, hz0), x1, min(z1, hz1))]
    return [r for r in out if r[2] - r[0] > 0.01 and r[3] - r[1] > 0.01]

def place(o):
    """An outside opening's wall line, axis and span along the wall."""
    w, at, wd = o.get('wall'), float(o.get('at', 0)), float(o.get('width', 1))
    a, b = at - wd / 2, at + wd / 2
    return {'front': ('x', 0, a, b), 'back': ('x', D, a, b), 'left': ('z', 0, a, b), 'right': ('z', W, a, b)}.get(w)

for f in range(STOREYS):
    y = f * H
    below = next((s for s in stairs if s.get('floor', 0) == f - 1), None)
    hole = (below['x'], below['z'], below['x'] + below['w'], below['z'] + below['d']) if below else None
    for x0, z0, x1, z1 in minus((-OUTER, -OUTER, W + OUTER, D + OUTER), hole):
        box(f'Slab {f}', (x0 + x1) / 2, y - SLAB / 2, (z0 + z1) / 2, x1 - x0, SLAB, z1 - z0, slab_m)
    here = [r for r in rooms if r.get('floor', 0) == f]
    rects = [((r['x'], r['z'], r['x'] + r['w'], r['z'] + r['d']), r.get('name', 'Room'), r.get('floorColor')) for r in here] or [((0, 0, W, D), 'Floor', None)]
    for rect, label, color in rects:
        fm = material(f'Floor {color}', color, 0.55) if color else wood
        for x0, z0, x1, z1 in minus(rect, hole):
            box(f'Floor {label}', (x0 + x1) / 2, y + 0.01, (z0 + z1) / 2, x1 - x0, 0.02, z1 - z0, fm)
            box(f'Ceiling {label}', (x0 + x1) / 2, y + WALL - 0.01, (z0 + z1) / 2, x1 - x0, 0.02, z1 - z0, ceiling_m)
    for wall, axis, line, a0, a1 in (('front', 'x', -OUTER / 2, -OUTER, W + OUTER), ('back', 'x', D + OUTER / 2, -OUTER, W + OUTER), ('left', 'z', -OUTER / 2, 0, D), ('right', 'z', W + OUTER / 2, 0, D)):
        openings = []
        for d in doors:
            if d.get('floor', 0) == f and d.get('wall') == wall:
                _, _, a, b = place(d)
                openings.append((a, b, 0, float(d.get('height', 2.1))))
        for wdw in windows:
            if wdw.get('floor', 0) == f and wdw.get('wall') == wall:
                _, _, a, b = place(wdw)
                bottom = float(wdw.get('sill', 0.9)); top = bottom + float(wdw.get('height', 1.2))
                openings.append((a, b, bottom, top))
                if axis == 'x':
                    box(f'Window {wall} {f}', (a + b) / 2, y + (bottom + top) / 2, line, b - a, top - bottom, 0.02, glass)
                else:
                    box(f'Window {wall} {f}', line, y + (bottom + top) / 2, (a + b) / 2, 0.02, top - bottom, b - a, glass)
        run(f'Wall {wall} {f}', outer, axis, line, a0, a1, y, OUTER, openings)
    along, across = {}, {}
    for r in here:
        for z in (r['z'], r['z'] + r['d']):
            if 0.05 < z < D - 0.05:
                along.setdefault(round(z * 20) / 20, []).append((r['x'], r['x'] + r['w']))
        for x in (r['x'], r['x'] + r['w']):
            if 0.05 < x < W - 0.05:
                across.setdefault(round(x * 20) / 20, []).append((r['z'], r['z'] + r['d']))
    inner_doors = [d for d in doors if d.get('floor', 0) == f and d.get('wall') == 'inner' and 'x' in d and 'z' in d]
    for z, spans in along.items():
        for a, b in union(spans):
            cut = [(d['x'] - d.get('width', 0.9) / 2, d['x'] + d.get('width', 0.9) / 2, 0, d.get('height', 2.1)) for d in inner_doors if abs(d['z'] - z) < 0.4 and a < d['x'] < b]
            run(f'Inner wall {f}', inner, 'x', z, a, b, y, INNER, cut)
    for x, spans in across.items():
        for a, b in union(spans):
            cut = [(d['z'] - d.get('width', 0.9) / 2, d['z'] + d.get('width', 0.9) / 2, 0, d.get('height', 2.1)) for d in inner_doors if abs(d['x'] - x) < 0.4 and a < d['z'] < b]
            run(f'Inner wall {f}', inner, 'z', x, a, b, y, INNER, cut)

for s in stairs:
    steps, rise = 14, H / 14
    up = s.get('up', 'z')
    along_z = up in ('z', '-z')
    length = s['d'] if along_z else s['w']
    step = length / steps
    for i in range(steps):
        k = i if up in ('z', 'x') else steps - 1 - i
        if along_z:
            box('Stairs', s['x'] + s['w'] / 2, s.get('floor', 0) * H + rise * (i + 1) / 2, s['z'] + (k + 0.5) * step, s['w'], rise * (i + 1), step, wood)
        else:
            box('Stairs', s['x'] + (k + 0.5) * step, s.get('floor', 0) * H + rise * (i + 1) / 2, s['z'] + s['d'] / 2, step, rise * (i + 1), s['d'], wood)

# The roof.
top, over = STOREYS * H, 0.35
w, d = W + over * 2, D + over * 2
box('Roof', W / 2, top + 0.09, D / 2, w, 0.18, d, roof_m)
shape = roof.get('shape', 'flat')
pitch = math.radians(clamp(roof.get('pitch', 30), 10, 50))
if shape == 'gable':
    ridge_x = W >= D
    span, length = (d, w) if ridge_x else (w, d)
    rise = span / 2 * math.tan(pitch)
    slope = math.hypot(span / 2, rise)
    for side in (-1, 1):
        if ridge_x:
            box('Roof', W / 2, top + 0.18 + rise / 2, D / 2 + side * span / 4, length, 0.14, slope, roof_m, rot=(-side * pitch, 0, 0))
        else:
            box('Roof', W / 2 + side * span / 4, top + 0.18 + rise / 2, D / 2, slope, 0.14, length, roof_m, rot=(0, side * pitch, 0))
    base, apex = top + 0.18, top + 0.18 + rise - 0.08
    ends = [((x, base, 0), (x, base, D), (x, apex, D / 2)) for x in (0, W)] if ridge_x else [((0, base, z), (W, base, z), (W / 2, apex, z)) for z in (0, D)]
    for tri in ends:
        mesh = bpy.data.meshes.new('Gable')
        mesh.from_pydata([(p[0], -p[2], p[1]) for p in tri], [], [(0, 1, 2)])
        obj = bpy.data.objects.new('Gable', mesh); mesh.materials.append(outer); house.objects.link(obj)
elif shape == 'hip':
    rise = min(w, d) / 2 * math.tan(pitch)
    mesh = bpy.data.meshes.new('Roof hip')
    b = top + 0.18
    mesh.from_pydata([(-over, over, b), (W + over, over, b), (W + over, -D - over, b), (-over, -D - over, b), (W / 2, -D / 2, b + rise)], [], [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)])
    obj = bpy.data.objects.new('Roof hip', mesh); mesh.materials.append(roof_m); house.objects.link(obj)
else:
    for x, z, bw, bd in ((W / 2, -over, w, 0.12), (W / 2, D + over, w, 0.12), (-over, D / 2, 0.12, d), (W + over, D / 2, 0.12, d)):
        box('Roof parapet', x, top + 0.38, z, bw, 0.4, bd, roof_m)

# Porch, fence, gate, balcony.
main = next((x for x in doors if x.get('main') and x.get('wall') == 'front'), None)
if extras.get('porch') and main:
    at = float(main['at'])
    box('Porch', at, 0.075, -0.9, 2.6, 0.15, 1.8, slab_m)
    box('Porch roof', at, 2.55, -0.9, 2.8, 0.12, 2, roof_m)
    for dx in (-1.2, 1.2):
        box('Porch post', at + dx, 1.25, -1.7, 0.12, 2.5, 0.12, trim)
if extras.get('fence'):
    m = 2.5
    fence = material('Fence', '#d8d2c4', 0.8)
    gate = (float(main['at']) - 0.8, float(main['at']) + 0.8) if main else None
    def span(axis, line, a, b):
        if b - a < 0.05:
            return
        for hgt in (0.45, 1.0):
            if axis == 'x':
                box('Fence rail', (a + b) / 2, hgt, line, b - a, 0.08, 0.06, fence)
            else:
                box('Fence rail', line, hgt, (a + b) / 2, 0.06, 0.08, b - a, fence)
        t = a
        while t <= b + 0.01:
            box('Fence post', min(t, b) if axis == 'x' else line, 0.575, line if axis == 'x' else min(t, b), 0.1, 1.15, 0.1, fence)
            t += 1.5
    if gate:
        span('x', -m, -m, gate[0]); span('x', -m, gate[1], W + m)
        if extras.get('gate'):
            # Slid open along the fence, so the way in stays clear.
            box('Gate', gate[0] - 0.85, 0.55, -m - 0.08, 1.6, 1.0, 0.05, material('Gate', '#3b3f45', 0.4, 0.6))
    else:
        span('x', -m, -m, W + m)
    span('x', D + m, -m, W + m); span('z', -m, -m, D + m); span('z', W + m, -m, D + m)
if extras.get('balcony') and STOREYS > 1:
    bw = min(4, W - 1)
    box('Balcony', W / 2, H - SLAB / 2, -0.65, bw, SLAB, 1.3, slab_m)
    box('Balcony rail', W / 2, H + 1, -1.28, bw, 0.06, 0.06, trim)

# Where the walker starts: before the main door, beyond the fence when there is one.
spawn = bpy.data.objects.new('allworld_spawn', None)
door = main or next((x for x in doors if x.get('wall') != 'inner'), None)
at = float(door['at']) if door else W / 2
wall = door.get('wall') if door else 'front'
out = 4 if extras.get('fence') else 2.5
gx, gz = {'front': (at, -out), 'back': (at, D + out), 'left': (-out, at), 'right': (W + out, at)}.get(wall, (at, -out))
spawn.location = (gx, -gz, 0)
house.objects.link(spawn)

bpy.ops.wm.save_as_mainfile(filepath=argv[1])
print(f'Built {len(house.objects)} objects; saved {argv[1]}.')
if len(argv) > 2:
    bpy.ops.export_scene.gltf(filepath=argv[2], export_format='GLB', export_yup=True, export_apply=True)
    print(f'Exported {argv[2]}. Check it: node check_model.mjs {argv[2]} --house')
