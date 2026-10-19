"""Build one hero silhouette from a reviewed source record; no reference images are imported."""
import argparse
import json
import math
from pathlib import Path
import random
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from shared import box, common, finish_hero, ico, mesh_object, palette, roof


def market_fragment(materials, rng):
    """Original mixed-goods fragment; layout and dimensions are art direction."""
    objects = []
    accents = [2, 3, 4, 5]
    rng.shuffle(accents)

    def b(size, at, colour=1):
        obj = box('market-piece', size, at, materials[colour])
        objects.append(obj)
        return obj

    def cylinder(radius, height, at, colour, vertices=8):
        obj = common.cylinder('market-container', radius, height, at, materials[colour], vertices)
        objects.append(obj)
        return obj

    def table(x, y, width=0.95, depth=0.6, height=0.5):
        b((width, depth, 0.07), (x, y, height), 1)
        for dx in (-width * 0.4, width * 0.4):
            for dy in (-depth * 0.38, depth * 0.38):
                b((0.045, 0.045, height), (x + dx, y + dy, height / 2))

    def canopy(x, y, width, depth, height, colour, form):
        for dx in (-width * 0.43, width * 0.43):
            for dy in (-depth * 0.4, depth * 0.4):
                b((0.045, 0.045, height), (x + dx, y + dy, height / 2))
        if form == 'gable':
            objects.append(roof('market-awning', width, depth, 0.16, (x, y, height), materials[colour]))
        else:
            for stripe in range(6):
                panel = b((width / 6 + 0.003, depth, 0.025),
                          (x - width / 2 + width * (stripe + 0.5) / 6, y, height),
                          colour if stripe % 2 == 0 else 0)
                panel.rotation_euler.x = 0.12

    def cloth(x, y, z, colour, width=0.24, height=0.58):
        b((width, 0.025, height), (x, y, z), colour)
        for band in (-0.19, 0.13):
            b((width + 0.008, 0.014, 0.045), (x, y - 0.021, z + band), 0)

    # A transverse lane separates the rear stalls from two open-front displays.
    x, y = -1.28, 0.86
    table(x, y, 1.0)
    canopy(x, y, 1.16, 0.94, 1.33, accents[0], 'striped')
    b((0.91, 0.045, 0.045), (x, y + 0.19, 1.12))
    for i in range(3):
        cloth(x - 0.3 + i * 0.3, y + 0.18, 0.82, accents[i])
        for layer in range(2):
            b((0.23, 0.22, 0.045), (x - 0.3 + i * 0.3, y - 0.19, 0.56 + layer * 0.05), accents[(i + layer + 1) % 4])

    x, y = 0.02, 0.9
    table(x, y, 0.95, 0.61)
    canopy(x, y, 1.08, 0.91, 1.05, accents[1], 'gable')
    for i in range(6):
        cx, cy = x - 0.3 + (i % 3) * 0.3, y - 0.18 + (i // 3) * 0.34
        cylinder(0.115, 0.16, (cx, cy, 0.615), 0)
        cylinder(0.124, 0.025, (cx, cy, 0.697), 1)
        objects.append(ico('spice-heap', 0.105, (cx, cy, 0.714), materials[[3, 5, 1][i % 3]], (1, 1, 0.48)))

    x, y = 1.3, 0.91
    table(x, y, 0.92, 0.58, 0.46)
    canopy(x, y, 1.08, 0.85, 1.17, accents[2], 'gable')
    for i, radius in enumerate((0.12, 0.09, 0.15)):
        cx = x - 0.29 + i * 0.29
        cylinder(radius, 0.16 + i * 0.025, (cx, y - 0.12, 0.58 + i * 0.0125), 3)
        cylinder(radius * 1.08, 0.035, (cx, y - 0.12, 0.67 + i * 0.025), 0)
        cylinder(radius * 0.66, 0.012, (cx, y - 0.12, 0.693 + i * 0.025), 1)
    for i in range(3):
        b((0.22, 0.2, 0.045), (x + 0.18, y + 0.15, 0.53 + i * 0.05), accents[i])

    x, y = -1.25, -0.92
    table(x, y, 1.04, 0.68, 0.42)
    canopy(x, y, 1.2, 0.94, 1.0, 2, 'striped')
    for tray in range(3):
        cx = x - 0.33 + tray * 0.33
        b((0.29, 0.53, 0.05), (cx, y, 0.485), 1)
        for edge in (-0.255, 0.255):
            b((0.29, 0.025, 0.075), (cx, y + edge, 0.51), 0)
        for i in range(6):
            objects.append(ico('produce', 0.075, (cx - 0.07 + (i % 2) * 0.14, y - 0.16 + (i // 2) * 0.16, 0.57),
                               materials[[5, 2, 3][tray]], (1, 1, 0.8)))

    # The uncovered textile rack leaves the near-right junction visually open.
    x, y = 1.28, -0.96
    for dx in (-0.5, 0.5):
        b((0.055, 0.055, 1.07), (x + dx, y + 0.17, 0.535))
        b((0.19, 0.4, 0.055), (x + dx, y + 0.17, 0.0275), 7)
    b((1.09, 0.055, 0.055), (x, y + 0.17, 1.07))
    for i in range(3):
        cloth(x - 0.32 + i * 0.32, y + 0.16, 0.73, accents[(i + 1) % 4], 0.27, 0.61)
    table(x, y - 0.21, 0.98, 0.32, 0.32)
    for i in range(5):
        cylinder(0.065, 0.31, (x - 0.34 + i * 0.17, y - 0.21, 0.51), accents[i % 4])
    return objects


def composed_market(materials, rng, composition):
    """Distinct original trading layouts; merchandise is illustrative art direction."""
    out=[]
    def b(size,at,c=1):
        obj=box('market-piece',size,at,materials[c]);out.append(obj);return obj
    def beam(a,end,c=1):out.append(common.segment('market-frame',a,end,0.035,materials[c]))
    def display(x,y,kind,angle=0):
        start=len(out)
        b((0.9,0.58,0.08),(0,0,0.52))
        for dx in (-0.36,0.36):
            for dy in (-0.21,0.21):b((0.05,0.05,0.50),(dx,dy,0.25))
        if kind=='cloth':
            for dx in (-0.40,0.40):b((0.045,0.045,1.12),(dx,0.23,0.56))
            b((0.88,0.045,0.045),(0,0.23,1.13))
            for i in range(3):
                c=3+i%3
                b((0.24,0.025,0.53),(-0.28+i*0.28,0.23,0.84),c)
                for j in range(2):b((0.22,0.24,0.045),(-0.28+i*0.28,-0.12,0.58+j*0.05),(c+j)%6)
        elif kind=='containers':
            for i in range(5):
                x0=-0.27+(i%3)*0.27;y0=-0.13+(i//3)*0.26
                out.append(common.cylinder('container',0.10,0.20,(x0,y0,0.66),materials[0],8))
                out.append(common.cylinder('rim',0.112,0.025,(x0,y0,0.77),materials[1],8))
                out.append(ico('heap',0.09,(x0,y0,0.80),materials[5 if i%2 else 3],(1,1,0.45)))
        elif kind=='produce':
            for j in range(2):
                b((0.82,0.24,0.04),(0,-0.14+j*0.28,0.58),1)
                for i in range(5):out.append(ico('goods',0.075,(-0.32+i*0.16,-0.14+j*0.28,0.66),materials[2+j*3],(1,0.8,0.85)))
        else:
            for i in range(5):
                out.append(common.cylinder('fabric-roll',0.075,0.31,(-0.32+i*0.16,0,0.72),materials[2+i%4],8))
        for obj in out[start:]:
            x0,y0=obj.location.x,obj.location.y
            obj.location.x=x+x0*math.cos(angle)-y0*math.sin(angle)
            obj.location.y=y+x0*math.sin(angle)+y0*math.cos(angle)
            obj.rotation_euler.z+=angle
    if composition=='covered-lane':
        for side in (-1,1):
            x=side*0.98
            for i,kind in enumerate(('cloth','containers','rolls')):
                display(x,-1.08+i*1.08,kind,side*math.pi/2)
            for y in (-1.67,0,1.67):
                for dx in (-0.43,0.43):b((0.055,0.055,1.34),(x+dx,y,0.67))
            for i in range(9):b((1.08,0.39,0.04),(x,-1.56+i*0.39,1.36),0 if i%3 else 3)
            beam((x-side*0.43,-1.67,1.30),(x-side*0.43,1.67,1.30))
    elif composition=='court':
        for i,kind in enumerate(('cloth','rolls','containers')):display(-1.15+i*1.12,0.98,kind)
        display(-1.42,-0.40,'cloth',math.pi/2)
        display(0.28,-0.48,'produce',math.pi/2)
        display(0.86,-0.48,'produce',-math.pi/2)
        for x in (-1.68,1.68):
            for y in (0.50,1.40):b((0.055,0.055,1.55),(x,y,0.775))
        for i in range(3):out.append(roof('continuous-awning',1.15,1.13,0.18,(-1.14+i*1.14,0.95,1.55),materials[4]))
        for i in range(4):
            b((0.33,0.36,0.27),(1.30+(i%2)*0.36,-1.26+(i//2)*0.38,0.135),1)
    else:raise ValueError('Unsupported market composition')
    return out


def neutral_trade(materials, rng):
    """Empty counters and racks suggest trade without claiming particular goods."""
    out = []

    def b(size, at, colour=1):
        out.append(box('trade-piece', size, at, materials[colour]))

    for side in (-1, 1):
        x = side * 1.05
        for row in range(3):
            y = -1.05 + row * 1.05
            b((0.82, 0.80, 0.09), (x, y, 0.58), 0)
            for dx in (-0.30, 0.30):
                for dy in (-0.28, 0.28):
                    b((0.055, 0.055, 0.54), (x + dx, y + dy, 0.27))
        colour = rng.choice((3, 4, 5))
        for y in (-1.52, 1.52):
            for dx in (-0.43, 0.43):
                b((0.055, 0.055, 1.45), (x + dx, y, 0.725))
        out.append(roof('trade-awning', 1.07, 3.25, 0.13, (x, 0, 1.45), materials[colour]))
        # One empty rack on each outer edge leaves the central lane open.
        rack_x = x + side * 0.46
        for y in (-0.34, 0.34):
            b((0.045, 0.045, 1.18), (rack_x, y, 0.59))
        for z in (0.77, 1.18):
            b((0.045, 0.72, 0.045), (rack_x, 0, z))
    return out


def retail_building(materials):
    """Original retail massing, with no copied facade, branding or merchandise."""
    out = []

    def b(size, at, colour=0):
        out.append(box('retail-piece', size, at, materials[colour]))

    b((4.2, 2.7, 0.13), (0, 0, 0.065), 1)
    b((3.9, 2.35, 1.45), (0, 0.08, 0.85), 0)
    b((4.02, 2.46, 0.12), (0, 0.08, 1.63), 1)
    for x in (-1.43, -0.88, 0.88, 1.43):
        b((0.46, 0.035, 0.67), (x, -1.115, 0.84), 4)
    b((0.88, 0.04, 0.93), (0, -1.12, 0.60), 7)
    b((0.045, 0.06, 0.94), (0, -1.16, 0.60), 1)
    b((1.32, 0.56, 0.09), (0, -1.28, 1.27), 3)
    for x in (-0.57, 0.57):
        b((0.06, 0.06, 1.08), (x, -1.50, 0.67), 1)
    return out


def natural_fragment(materials, composition):
    """Original contours; no map, photograph or measured shoreline is reproduced."""
    out=[]
    def prism(name,points,top,bottom,c):
        n=len(points);v=[(x,y,bottom) for x,y in points]+[(x,y,top) for x,y in points]
        faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        out.append(mesh_object(name,v,faces,materials[c]))
    def oval(cx,cy,rx,ry,n=32):
        return [(cx+rx*(1+0.045*math.sin(i*6*math.pi/n))*math.cos(i*2*math.pi/n),cy+ry*math.sin(i*2*math.pi/n)) for i in range(n)]
    def tree(x,y,height,roots=False):
        z0=0.15
        out.append(common.segment('trunk',(x,y,z0),(x+0.05,y,height),0.065,materials[1]))
        if roots:
            for i in range(5):
                a=i*math.pi*2/5
                knee=(x+0.20*math.cos(a),y+0.20*math.sin(a),0.40)
                out.append(common.segment('root',(x,y,0.65),knee,0.025,materials[1]))
                out.append(common.segment('root',knee,(x+0.37*math.cos(a),y+0.37*math.sin(a),0.12),0.02,materials[1]))
        for dx,dy,dz in [(-0.20,0,0),(0.19,0.07,0.07),(0,-0.16,0.17)]:
            out.append(ico('canopy',0.34,(x+dx,y+dy,height+dz),materials[2],(1,0.9,0.65),2))
    if composition=='open-lagoon':
        water=[(-2.7,-1.55),(-1.7,-1.72),(0,-1.65),(1.8,-1.50),(2.65,-0.98),(2.55,0.40),(1.95,0.87),(0.85,1.05),(-0.3,0.65),(-1.1,0.60),(-2.0,1.03),(-2.7,0.95)]
        prism('open-water',water,0.10,0,4)
        shoreline=[(-2.7,0.66),(-2.0,0.75),(-1.22,0.38),(-0.45,0.41),(0.26,0.66),(1.0,0.83),(1.72,0.72),(2.4,0.33),(2.65,0.52),(2.5,1.16),(1.6,1.52),(0.50,1.48),(-0.5,1.16),(-1.5,1.30),(-2.7,1.45)]
        prism('sediment-bank',shoreline,0.22,0.03,0)
        prism('mud-margin',[(x,y-0.1) for x,y in shoreline[:8]]+list(reversed(shoreline[:8])),0.115,0.08,1)
        for x,y,h in [(-2.25,1.05,0.95),(-1.7,0.98,0.82),(1.6,1.15,0.72)]:tree(x,y,h,True)
        for cx,cy,rx in [(-1.05,-0.65,0.70),(0.50,-0.45,0.90),(1.25,-1.05,0.45)]:
            arc=[(cx+rx*math.cos(a),cy+0.14*math.sin(a)) for a in [0.35+i*0.18 for i in range(12)]]
            prism('water-glint',arc+[(x,y+0.018) for x,y in reversed(arc)],0.106,0.101,6)
    elif composition=='paired-ponds':
        prism('park-ground',oval(0,0,2.65,1.65),0.14,0,2)
        for cx,cy,rx,ry in [(-1.15,0.12,1.02,0.93),(1.18,-0.08,0.92,1.05)]:
            prism('pond-bank',oval(cx,cy,rx+0.13,ry+0.13),0.155,0.13,0)
            prism('pond-water',oval(cx,cy,rx,ry),0.165,0.14,4)
        prism('pond-island',oval(-1.15,0.22,0.32,0.26,16),0.22,0.16,2)
        # Spatial contrast is supported; tree count and positions are invented.
        for x,y,h in [(-1.95,0.99,0.90),(-1.0,1.3,1.10),(-2.23,0.2,0.80),(-1.65,-1.1,0.85),(-0.55,1.10,0.80),(1.95,0.95,0.72)]:tree(x,y,h)
        for i in range(5):
            x=-1.35+i*0.10
            out.append(common.segment('island-growth',(x,0.23,0.21),(x+0.02,0.24,0.41),0.014,materials[2]))
    else:raise ValueError('Unsupported natural feature composition')
    return out


def landscape_fragment(materials, rng, composition):
    """Bounded schematic landforms; contours, tree count and spacing are original."""
    out = []

    def prism(name, points, top, bottom, colour):
        n = len(points)
        vertices = [(x, y, bottom) for x, y in points] + [(x, y, top) for x, y in points]
        faces = [tuple(reversed(range(n))), tuple(range(n, 2 * n))]
        faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
        out.append(mesh_object(name, vertices, faces, materials[colour]))

    def oval(rx, ry, count=24):
        return [(rx * math.cos(i * math.tau / count), ry * math.sin(i * math.tau / count)) for i in range(count)]

    def tree(x, y, height):
        out.append(common.segment('landscape-trunk', (x, y, 0.12), (x, y, height), 0.045, materials[1]))
        for dx, dy, dz, scale in [(-0.12, 0, 0, (1, 0.85, 1.1)), (0.13, 0.06, 0.13, (0.85, 1, 0.9))]:
            out.append(ico('landscape-canopy', 0.30, (x + dx, y + dy, height + dz), materials[2], scale))

    if composition in ('forest', 'open-park'):
        prism('landscape-ground', oval(2.4, 1.6), 0.12, 0, 2)
        count = 12 if composition == 'forest' else 5
        for i in range(count):
            angle = math.tau * i / count + rng.uniform(-0.12, 0.12)
            radius = rng.uniform(0.48, 0.83) if composition == 'forest' else 0.77
            tree(2.4 * radius * math.cos(angle), 1.6 * radius * math.sin(angle), rng.uniform(0.65, 1.15))
        if composition == 'forest':
            for x, y in [(-0.45, 0.22), (0.35, -0.18)]:
                tree(x, y, rng.uniform(0.8, 1.15))
    elif composition == 'hill':
        count = 24
        rings = [(1.0, 0.02), (0.72, 0.40), (0.36, 0.93)]
        vertices = []
        for radius, height in rings:
            for i in range(count):
                angle = math.tau * i / count
                vertices.append((2.4 * radius * math.cos(angle), 1.6 * radius * math.sin(angle), height + rng.uniform(0, 0.08)))
        vertices.append((0.13, -0.11, 1.25))
        faces = [tuple(reversed(range(count)))]
        for ring in range(len(rings) - 1):
            for i in range(count):
                a = ring * count + i
                b = ring * count + (i + 1) % count
                faces.append((a, b, b + count, a + count))
        faces += [(2 * count + i, 2 * count + (i + 1) % count, 3 * count) for i in range(count)]
        out.append(mesh_object('schematic-hill', vertices, faces, materials[2]))
    elif composition == 'gully':
        # A dry channel is a landform symbol, not a surveyed erosion profile.
        rows, columns = 7, 5
        vertices = []
        for row in range(rows):
            y = -1.7 + row * 3.4 / (rows - 1)
            bend = 0.18 * math.sin(row * 0.9)
            for column, (x, z) in enumerate([(-2.3, 0.85), (-0.85, 0.65), (0, 0.14), (0.85, 0.65), (2.3, 0.85)]):
                vertices.append((x + (bend if 0 < column < 4 else 0), y, z))
        faces = []
        for row in range(rows - 1):
            for column in range(columns - 1):
                a = row * columns + column
                faces.append((a, a + 1, a + columns + 1, a + columns))
        rim = list(range(columns)) + [row * columns + columns - 1 for row in range(1, rows)]
        rim += list(range(rows * columns - 2, (rows - 1) * columns - 1, -1))
        rim += [row * columns for row in range(rows - 2, 0, -1)]
        bottom = len(vertices)
        vertices.extend((vertices[i][0], vertices[i][1], 0) for i in rim)
        for i, top in enumerate(rim):
            nxt = (i + 1) % len(rim)
            faces.append((top, bottom + i, bottom + nxt, rim[nxt]))
        faces.append(tuple(reversed(range(bottom, len(vertices)))))
        out.append(mesh_object('dry-gully', vertices, faces, materials[1]))
    elif composition == 'confluence':
        prism('confluence-water', [(-2.5,-1.8),(2.5,-1.8),(2.5,1.8),(-2.5,1.8)], .06, 0, 4)
        prism('west-bank', [(-2.5,-1.8),(-.65,-1.8),(-.50,-.40),(-1.5,.45),(-2.5,.8)], .20, .04, 0)
        prism('east-bank', [(.65,-1.8),(2.5,-1.8),(2.5,.8),(1.5,.45),(.50,-.40)], .20, .04, 0)
        prism('upstream-land', [(-1.35,1.8),(0,.15),(1.35,1.8)], .20, .04, 2)
    elif composition in ('bare-coast', 'riverbank'):
        prism('open-water', [(-2.5, -1.6), (2.5, -1.6), (2.5, 1.6), (-2.5, 1.6)], 0.06, 0, 4)
        edge = [(-2.5, 0.30), (-1.6, 0.08), (-0.65, 0.36), (0.4, 0.12), (1.35, 0.47), (2.5, 0.24)]
        prism('bare-shore', edge + [(2.5, 1.6), (-2.5, 1.6)], 0.18, 0.04, 0)
    elif composition == 'low-cay':
        prism('surrounding-water', oval(2.5, 1.65), 0.05, 0, 4)
        prism('low-sand-cay', oval(2.15, 1.24), 0.17, 0.04, 0)
        prism('low-vegetation', oval(1.7, 0.86), 0.20, 0.16, 2)
    elif composition == 'ice-valley':
        prism('rock-ground', oval(2.4, 1.8), 0.10, 0, 1)
        for side in (-1, 1):
            for i in range(4):
                x = side * (1.35 + rng.uniform(-0.13, 0.13))
                y = -1.1 + i * 0.75
                height = rng.uniform(0.65, 1.05)
                out.append(ico('rock-ridge', 0.65, (x, y, height * 0.48), materials[1], (0.95, 1.0, height)))
        tongue = [(-0.48, -1.48), (0.25, -1.38), (0.70, -0.50), (0.56, 0.40), (0.9, 1.55), (-0.86, 1.55), (-0.72, 0.50), (-0.82, -0.35)]
        prism('schematic-ice-tongue', tongue, 0.24, 0.10, 6)
        for i in range(5):
            y = -0.85 + i * 0.43
            prism('ice-tone', [(-0.40, y), (0.39, y + 0.06), (0.32, y + 0.12), (-0.37, y + 0.06)], 0.247, 0.24, 4)
    else:
        raise ValueError('Unsupported landscape composition')
    return out


def lattice_tower(materials):
    out=[]
    def beam(a,b,r=0.025):out.append(common.segment('lattice',a,b,r,materials[1],vertices=4))
    levels=[(0,1.25),(0.32,1.07),(0.67,0.88),(1.05,0.72),(1.40,0.56),(1.80,0.42),(2.10,0.33),(2.40,0.26),(2.70,0.20),(3.00,0.15),(3.30,0.11),(3.50,0.08)]
    for (za,ra),(zb,rb) in zip(levels,levels[1:]):
        for sx,sy in [(-1,-1),(-1,1),(1,-1),(1,1)]:
            beam((sx*ra,sy*ra,za),(sx*rb,sy*rb,zb),0.043 if za<1.05 else 0.027)
            if za<1.05:
                w0=0.19*(1-za/2);w1=0.19*(1-zb/2)
                for axis in (0,1):
                    a=[sx*ra,sy*ra,za];b=[sx*rb,sy*rb,zb];a[axis]-=(sx if axis==0 else sy)*w0;b[axis]-=(sx if axis==0 else sy)*w1
                    beam(a,b,0.032);beam((sx*ra,sy*ra,za),b,0.018);beam(a,(sx*rb,sy*rb,zb),0.018)
        if za>=1.05:
            for side in (-1,1):
                for swap in (False,True):
                    def point(x,y,z):return (y,x,z) if swap else (x,y,z)
                    beam(point(-ra,side*ra,za),point(rb,side*rb,zb),0.016)
                    beam(point(ra,side*ra,za),point(-rb,side*rb,zb),0.016)
                    beam(point(-ra,side*ra,za),point(ra,side*ra,za),0.020)
    for side in (-1,1):
        for swap in (False,True):
            pts=[]
            for i in range(17):
                angle=math.pi*i/16;x=1.14*math.cos(angle);z=0.11+0.83*math.sin(angle);y=side*(1.25-0.5*z)
                pts.append((y,x,z) if swap else (x,y,z))
            for a,b in zip(pts,pts[1:]):beam(a,b,0.044)
    for z,r in [(1.05,0.79),(1.8,0.49),(3.5,0.14)]:
        out.append(box('level',(r*2,r*2,0.065),(0,0,z),materials[1]))
        for side in (-1,1):
            beam((-r,side*r,z+0.13),(r,side*r,z+0.13),0.018)
            beam((side*r,-r,z+0.13),(side*r,r,z+0.13),0.018)
            for t in (-0.7,0,0.7):
                beam((t*r,side*r,z),(t*r,side*r,z+0.13),0.012)
                beam((side*r,t*r,z),(side*r,t*r,z+0.13),0.012)
    beam((0,0,3.53),(0,0,3.88),0.025)
    return out


LANDMARK_COMPOSITIONS = (
    'three-figures', 'terraced-fort', 'masonry-ring-tower', 'four-tower-castle',
    'sphere-towers', 'round-tower-fort', 'lotus-stupa', 'terraced-stairs',
    'courtyard-mosque', 'twin-bell-cathedral', 'pentagonal-fort', 'red-fort-pavilions',
    'doric-temple', 'guildhall-square', 'civic-pavilions', 'observation-tower',
    'flame-obelisk', 'borehole-site', 'domed-basilica', 'hexagonal-clock',
    'bell-tower-church', 'verandah-house', 'latte-stones', 'cenotaph',
    'barracks-court', 'clock-fort', 'inclined-stairs', 'gable-store', 'octagonal-lighthouse',
)


def landmark_fragment(m, composition):
    """Original schematic massing; source facts select the explicit form, never a traced plan."""
    out = []

    def b(size, at, c=0):
        obj = box('landmark-piece', size, at, m[c]); out.append(obj); return obj

    def radial(r0, r1, z0, z1, x=0, y=0, c=0, sides=12):
        vertices = [(x + radius * math.cos(2*math.pi*i/sides), y + radius * math.sin(2*math.pi*i/sides), z)
                    for radius, z in ((r0,z0),(r1,z1)) for i in range(sides)]
        faces = [tuple(reversed(range(sides))), tuple(range(sides,2*sides))]
        faces += [(i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides)]
        out.append(mesh_object('landmark-round',vertices,faces,m[c]))

    def cap(x,y,z,r,height,c=0):
        # Closed latitude bands keep the silhouette smooth enough at a low polygon count.
        for i in range(5):
            a=i*math.pi/10; d=(i+1)*math.pi/10
            radial(max(.015,r*math.cos(a)),max(.015,r*math.cos(d)),z+height*math.sin(a),z+height*math.sin(d),x,y,c,16)

    def sphere(x,y,z,r,c=3):
        out.append(ico('landmark-sphere',r,(x,y,z),m[c],subdivisions=2))

    def beam(a,d,r=.035,c=1): out.append(common.segment('landmark-rail',a,d,r,m[c]))

    def gable(x,y,z,w,d,h,c=1): out.append(roof('landmark-roof',w,d,h,(x,y,z),m[c]))

    def hipped(x,y,z,w,d,h,c=1):
        vertices=[(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x+w/2,y+d/2,z),(x-w/2,y+d/2,z),(x,y-d*.22,z+h),(x,y+d*.22,z+h)]
        out.append(mesh_object('landmark-hipped-roof',vertices,[(3,2,1,0),(0,1,4),(1,2,5,4),(2,3,5),(3,0,4,5)],m[c]))

    def windows(x,y,z,count,width,spacing=.35):
        for i in range(count):b((width,.025,.25),(x+(i-(count-1)/2)*spacing,y,z),7)

    def house(x,y,w,d,h,verandah=False,c=0):
        b((w,d,h),(x,y,h/2+.12),c);hipped(x,y,h+.12,w+.2,d+.2,.42)
        windows(x,y-d/2-.014,h*.62, max(2,round(w/.5)),.15,.45)
        if verandah:
            b((w+.15,.55,.08),(x,y-d/2-.2,h*.70),1)
            for i in range(5):b((.065,.065,h*.68),(x-w*.43+i*w*.215,y-d/2-.4,h*.34+.12),0)

    def court(w=3.7,d=2.7,h=1.25,c=0):
        for x in (-w/2,w/2):b((.28,d,h),(x,0,h/2+.1),c)
        b((w,.28,h),(0,d/2,h/2+.1),c)
        for x in (-w*.32,w*.32):b((w*.36,.28,h),(x,-d/2,h/2+.1),c)
        b((w*.28,.28,h*.28),(0,-d/2,h*.86+.1),c)

    def stairs(width,depth,rise,count,y0=0):
        for i in range(count):
            h=(i+1)*rise/count
            b((width,depth/count+.008,h),(0,y0-depth/2+(i+.5)*depth/count,.1+h/2),0)

    b((4.5,3.7,.12),(0,0,.06),2)
    if composition == 'three-figures':
        for i,x in enumerate((-1.35,0,1.35)):
            b((.82,.76,.32),(x,0,.28),0)
            for dx in (-.13,.13):b((.19,.23,.72),(x+dx,0,.80),1)
            b((.48,.28,.72),(x,0,1.49),1)
            out.append(ico('abstract-head',.18,(x,0,2.03),m[1],(1,.92,1.15)))
            for side in (-1,1):beam((x+side*.24,0,1.76),(x+side*(.31+.03*i),-.06,1.17),.085,1)
    elif composition == 'terraced-fort':
        court(h=1.5,c=3)
        b((2.4,1.15,1.8),(.2,.55,.9),3)
        for x,y in ((-1.85,-1.35),(1.85,-1.35),(1.85,1.35)):radial(.42,.4,.12,1.95,x,y,3)
        for i in range(8):b((.23,.3,.23),(-1.63+i*.46,-1.35,1.72),3)
    elif composition == 'masonry-ring-tower':
        b((1.35,.65,2.85),(1.23,0,1.545),0)
        radial(1,1,.12,3.2,c=0,sides=20)
        for z in (.6,1.05,1.5,1.95,2.4,2.85):radial(1.025,1.025,z,z+.045,c=1,sides=20)
        for z in (.9,1.7,2.5):b((.17,.035,.27),(0,-1.01,z),7)
        radial(1.07,1.07,3.2,3.35,c=0,sides=20)
    elif composition == 'four-tower-castle':
        court(h=1.7)
        for x in (-1.85,1.85):
            for y in (-1.35,1.35):
                b((.62,.62,2.35),(x,y,1.295),0);hipped(x,y,2.47,.78,.78,.7,3)
                windows(x,y-.325,2.1,1,.16)
        for x in (-1.85,1.85):hipped(x,0,1.8,.48,2.1,.3,3)
        for y in (-1.35,1.35):hipped(0,y,1.8,3.1,.5,.3,3)
    elif composition == 'sphere-towers':
        for x,y,h,r in ((-.85,0,3.9,.57),(.85,.35,3.0,.48),(1.65,-.65,2.4,0)):
            radial(.13,.025,.12,h,x,y,0)
            if r:sphere(x,y,h*.56,r,3)
        sphere(-.85,0,3.05,.33,3)
    elif composition == 'round-tower-fort':
        court(h=1.25,c=3)
        for x in (-1.85,1.85):
            for y in (-1.35,1.35):
                radial(.48,.35,.12,1.95,x,y,3)
                for i in range(8):
                    a=i*math.pi/4;b((.12,.12,.18),(x+.32*math.cos(a),y+.32*math.sin(a),2),3)
        b((.9,.75,1.8),(0,.7,1.02),3)
        for i in range(9):b((.2,.3,.15),(-1.6+i*.4,1.35,1.44),3)
    elif composition == 'lotus-stupa':
        for i in range(4):b((3.2-i*.55,2.7-i*.45,.26),(0,0,.25+i*.26),3)
        radial(.62,.42,1.16,1.70,c=3);radial(.42,.50,1.70,2.0,c=3);radial(.50,.04,2,3.45,c=3)
        for x in (-1.35,1.35):
            for y in (-1.05,0,1.05):radial(.15,.018,.38,1.0,x,y,3,8)
    elif composition == 'terraced-stairs':
        # Every tread, landing and flank is a closed mass extending to the foundation.
        for level in range(4):
            front = -1.6 + level * .8
            top = .12 + (level + 1) * .48
            for j in range(4):
                height = .12 + level * .48 + (j + 1) * .12
                b((1.8, .144, height), (0, front + (j + .5) * .14, height / 2), 0)
            b((1.8, .244, top), (0, front + .68, top / 2), 0)
            for x in (-1.35, 1.35):
                b((.904, .804, top), (x, front + .4, top / 2), 0)
    elif composition == 'courtyard-mosque':
        for x in (-1.8,1.8):
            for y in (-.9,-.3,.3,.9):radial(.07,.07,.12,1.05,x,y,c=0,sides=8)
            b((.38,2.6,.14),(x,0,1.12),0)
        b((3.7,.85,1.0),(0,1.15,.62),0);gable(0,1.15,1.12,3.9,1.05,.38,1)
        for x,y,h in ((-1.8,1.35,2.35),(1.8,1.35,2.6),(0,-1.4,2.15)):
            radial(.17,.14,.12,h,x,y,c=0,sides=8);radial(.24,.24,h,h+.1,x,y,c=0,sides=8);radial(.16,.015,h+.1,h+.45,x,y,c=1,sides=8)
        cap(0,1.15,1.4,.40,.45,1)
    elif composition in ('twin-bell-cathedral','bell-tower-church'):
        b((2.4,2.8,1.25),(0,.1,.745),0);gable(0,.1,1.37,2.6,3,.65,3)
        towers=(-1.4,1.4) if composition=='twin-bell-cathedral' else (-1.35,)
        for x in towers:
            b((.65,.72,2.25),(x,-1.02,1.245),0);hipped(x,-1.02,2.37,.8,.86,.6,3)
            windows(x,-1.395,1.98,1,.26)
        for x in (-.7,0,.7):b((.28,.03,.52),(x,-1.315,.48),7)
    elif composition == 'pentagonal-fort':
        for i in range(5):
            a=2*math.pi*i/5;d=2*math.pi*(i+1)/5
            x,y=1.65*(math.cos(a)+math.cos(d))/2,1.65*(math.sin(a)+math.sin(d))/2
            obj=b((1.98,.48,1.1),(x,y,.67),3);obj.rotation_euler.z=a+math.pi/5+math.pi/2
            if i<4:
                start=len(out);gable(0,0,1.22,.66,2.1,.5,1);obj=out[-1];obj.location.x=x;obj.location.y=y;obj.rotation_euler.z=a+math.pi/5
        for i in (0,1,2):
            a=2*math.pi*i/5;radial(.45,.45,.12,.55,1.7*math.cos(a),1.7*math.sin(a),3,5)
    elif composition == 'red-fort-pavilions':
        court(h=.9,c=3)
        for x in (-1.2,0,1.2):
            for dx in (-.31,.31):
                for y in (.25,.85):radial(.055,.055,1,1.7,x+dx,y,0,8)
            b((.82,.86,.12),(x,.55,1.76),0);cap(x,.55,1.82,.36,.38,0)
        for x in (-1.5,1.5):radial(.30,.30,.12,1.45,x,-1.35,3,12)
        for i in range(11):b((.15,.25,.15),(-1.7+i*.34,-1.35,1.1),3)
    elif composition == 'doric-temple':
        for i in range(3):b((3.7-i*.2,3.1-i*.2,.12),(0,0,.18+i*.12),0)
        for side in (-1,1):
            for j in range(8):
                x=-1.4+j*.4;radial(.075,.06,.48,1.78,x,side*1.10,0,8);b((.20,.20,.08),(x,side*1.1,1.8),0)
            for j in range(1,5):
                y=-1.1+j*.44;radial(.075,.06,.48,1.78,side*1.4,y,0,8);b((.2,.2,.08),(side*1.4,y,1.8),0)
        for y in (-1.1,1.1):b((3.1,.24,.18),(0,y,1.92),0)
        for x in (-1.4,1.4):b((.24,2.2,.18),(x,0,1.92),0)
        # Two separate pediments leave the ruined roof visibly open.
        for y in (-1.1,1.1):gable(0,y,2.01,3.1,.18,.5,0)
    elif composition == 'guildhall-square':
        for i in range(5):
            x=-1.6+i*.8;h=1.1+(i%3)*.17;b((.72,.68,h),(x,1.3,h/2+.12),0);gable(x,1.3,h+.12,.76,.75,.4,3)
            windows(x,.946,h*.62,2,.12,.27)
        for x in (-1.8,1.8):house(x,-.2,.7,1.9,1.25)
        b((.55,.6,2.1),(0,1.25,1.17),0);radial(.4,.02,2.22,3.05,0,1.25,1,4)
    elif composition in ('civic-pavilions','barracks-court'):
        house(0,.8,2.55,.85,1.1,True)
        for x in (-1.65,1.65):house(x,-.25,.95,1.9,.85,True)
        if composition=='barracks-court':court(4.2,3.1,.4,0)
    elif composition == 'observation-tower':
        for i in range(3):
            a=i*2*math.pi/3;beam((.6*math.cos(a),.6*math.sin(a),.12),(.12*math.cos(a),.12*math.sin(a),2.75),.12,0)
        radial(.15,.10,.12,3.6,c=0,sides=12)
        radial(.25,.65,2.65,2.83,c=0,sides=20);radial(.65,.65,2.83,3.05,c=7,sides=20);radial(.68,.30,3.05,3.17,c=0,sides=20)
        radial(.27,.27,3.5,3.62,c=7,sides=16);radial(.12,.025,3.62,4.4,c=0,sides=12)
    elif composition == 'flame-obelisk':
        b((2.6,2.4,.4),(0,0,.32),0);b((2.2,2,.12),(0,0,.58),0)
        radial(.38,.24,.64,3.25,c=0,sides=4);b((.85,.85,.16),(0,0,3.3),0)
        out.append(ico('original-flame',.31,(.03,0,3.65),m[3],(.75,.6,1.5)))
        radial(.17,.01,3.74,4.18,.13,0,3,7)
    elif composition == 'borehole-site':
        # An open ring represents the sourced borehole; no drilling machinery is claimed.
        vertices=[]
        for radius,z in ((.60,.12),(.88,.12),(.60,.32),(.88,.32)):
            vertices += [(radius*math.cos(i*math.pi/10),radius*math.sin(i*math.pi/10),z) for i in range(20)]
        faces=[]
        for i in range(20):
            j=(i+1)%20
            faces += [(i,j,20+j,20+i),(40+i,60+i,60+j,40+j),(20+i,20+j,60+j,60+i),(i,40+i,40+j,j)]
        out.append(mesh_object('borehole-rim',vertices,faces,m[0]))
        radial(.58,.58,.122,.13,c=7,sides=20)
    elif composition == 'domed-basilica':
        b((3.9,.65,1.25),(0,-1.2,.745),0);b((2.1,2.6,1.2),(0,.25,.72),0)
        for x in (-1.6,-1.2,-.8,-.4,.4,.8,1.2,1.6):radial(.07,.07,.12,1.39,x,-1.57,0,8)
        b((4.1,.85,.16),(0,-1.2,1.45),0);gable(0,-1.64,1.53,1.5,.15,.32,0)
        radial(.64,.64,1.32,1.77,0,.55,0,16);cap(0,.55,1.77,.68,.90,1)
        radial(.12,.12,2.67,2.9,0,.55,0,8);beam((0,.55,2.88),(0,.55,3.18),.026,0);beam((-.10,.55,3.08),(.10,.55,3.08),.026,0)
    elif composition == 'hexagonal-clock':
        radial(.46,.46,.12,2.0,c=0,sides=6);radial(.46,.46,2,3.05,c=3,sides=6);radial(.55,.02,3.05,3.55,c=1,sides=6)
        for i in range(6):
            a=(i+.5)*math.pi/3;x,y=.408*math.cos(a),.408*math.sin(a)
            obj=b((.22,.025,.25),(x,y,2.67),7);obj.rotation_euler.z=a-math.pi/2
    elif composition == 'verandah-house':house(0,0,3.3,1.8,1.25,True)
    elif composition == 'latte-stones':
        for x in (-1.4,-.47,.47,1.4):
            for y in (-.8,.8):
                radial(.18,.13,.12,.95,x,y,0,6)
                radial(.13,.30,.95,1.16,x,y,0,12);radial(.30,.34,1.16,1.3,x,y,0,12)
    elif composition == 'cenotaph':
        for z,w,d,h in ((.21,2,1.55,.18),(.42,1.65,1.25,.24),(1.15,.95,.75,1.24),(1.9,1.05,.82,.25),(2.1,.85,.70,.18)):
            b((w,d,h),(0,0,z),0)
        for y in (-.39,.39):radial(.15,.15,1.4,1.45,0,y,1,10)
    elif composition == 'clock-fort':
        court(h=.65,c=3);b((.75,.75,2.35),(0,-1.35,1.295),0);hipped(0,-1.35,2.47,.9,.9,.5,3)
        b((.29,.025,.29),(0,-1.74,2.08),7)
        for x in (-1.8,1.8):b((.35,.35,.95),(x,-1.35,.595),3)
    elif composition == 'inclined-stairs':
        stairs(1.05,3.2,2.5,24)
        for side in (-1,1):
            beam((side*.65,-1.6,.42),(side*.65,1.6,2.92),.045,1)
            for i in range(7):
                y=-1.6+i*3.2/6;z=.12+i*2.5/6;beam((side*.65,y,z),(side*.65,y,z+.3),.025,1)
    elif composition == 'gable-store':
        b((2.9,2.4,1.4),(0,0,.82),0);gable(0,0,1.52,3.1,2.6,.7,1)
        b((.75,.035,.95),(0,-1.22,.60),7);windows(0,-1.225,1.3,5,.17,.53)
        for x in (-1.45,1.45):
            for y in (-.8,0,.8):b((.03,.18,.3),(x,y,.9),7)
    elif composition == 'octagonal-lighthouse':
        radial(.72,.60,.12,1.15,c=0,sides=8);radial(.60,.50,1.15,1.7,c=3,sides=8);radial(.50,.38,1.7,2.45,c=0,sides=8)
        radial(.58,.58,2.45,2.57,c=3,sides=8);radial(.3,.3,2.57,3.0,c=7,sides=8);radial(.4,.02,3,3.3,c=3,sides=8)
        for i in range(8):
            a=i*math.pi/4;beam((.50*math.cos(a),.50*math.sin(a),2.56),(.50*math.cos(a),.50*math.sin(a),2.78),.018,3)
    else:raise ValueError('Unsupported landmark composition')
    return out


def generate(record, materials):
    m = [materials[i % len(materials)] for i in range(8)]
    template = record['generator']
    rng = random.Random(record['parameters']['seed'])
    objects = []
    def b(size, at, colour=0):
        objects.append(box('piece', size, at, m[colour]))
    def pillar(radius, height, at, colour=1, vertices=10):
        objects.append(common.cylinder('piece', radius, height, at, m[colour], vertices))
    def beam(a, end, radius=0.025, colour=1):
        objects.append(common.segment('piece', a, end, radius, m[colour]))
    if template == 'landmark':
        return landmark_fragment(m, record['parameters']['composition'])
    elif template == 'landscape':
        return landscape_fragment(m, rng, record['parameters']['composition'])
    elif template == 'market':
        composition = record['parameters'].get('composition', 'cross-lane')
        if composition == 'neutral-trade':
            return neutral_trade(m, rng)
        return market_fragment(m, rng) if composition == 'cross-lane' else composed_market(m, rng, composition)
    elif template == 'retail-building':
        return retail_building(m)
    elif template == 'gate':
        b((2.5, 1, 0.1), (0, 0, 0.05), 0)
        for x in (-0.9, 0.9): pillar(0.13, 1.9, (x, 0, 1), 3)
        for z in (1.55, 1.9): b((2.4, 0.3, 0.14), (0, 0, z), 3)
        objects.append(roof('gate-roof', 2.8, 1.4, 0.45, (0, 0, 2), m[1]))
        pillar(0.28, 0.6, (0, 0, 1.35), 3, 12)
        pillar(0.32, 0.07, (0, 0, 1.05), 1, 12)
    elif template == 'tower':
        b((1.2, 1.2, 0.15), (0, 0, 0.075), 0)
        pillar(0.42, 2.4, (0, 0, 1.35), 0, 12)
        for z in (0.55, 1.35, 2.15): pillar(0.44, 0.16, (0, 0, z), 3, 12)
        pillar(0.6, 0.12, (0, 0, 2.6), 1, 12)
        pillar(0.3, 0.48, (0, 0, 2.9), 4, 8)
        objects.append(roof('lantern-roof', 0.9, 0.9, 0.3, (0, 0, 3.15), m[1]))
    elif template == 'lattice-tower':
        return lattice_tower(m)
    elif template == 'colonnade':
        for z, w, d in [(0.08, 3.2, 1.5), (0.2, 3, 1.3)]: b((w, d, 0.16), (0, 0, z), 0)
        for x in (-1.2, -0.6, 0, 0.6, 1.2):
            for y in (-0.45, 0.45): pillar(0.11, 1.5, (x, y, 1.05), 0, 8)
        b((3.1, 1.3, 0.2), (0, 0, 1.9), 0)
        objects.append(roof('pediment', 3.3, 1.5, 0.45, (0, 0, 2), m[1]))
    elif template == 'bridge' and record['parameters'].get('composition') == 'stone-arches':
        # Three original spans indicate masonry vaults; no actual span count is copied.
        for centre in (-1.4, 0, 1.4):
            for segment in range(10):
                a, end = math.pi * segment / 10, math.pi * (segment + 1) / 10
                cross = [(centre + radius * math.cos(angle), 0.28 + radius * math.sin(angle))
                         for radius, angle in [(0.54, a), (0.75, a), (0.75, end), (0.54, end)]]
                vertices = [(x, y, z) for y in (-0.48, 0.48) for x, z in cross]
                faces = [(0, 1, 2, 3), (7, 6, 5, 4)] + [(i + 4, (i + 1) % 4 + 4, (i + 1) % 4, i) for i in range(4)]
                objects.append(mesh_object('masonry-arch-block', vertices, faces, m[0]))
        for x in (-2.1, -0.7, 0.7, 2.1):
            b((0.34, 1.02, 0.4), (x, 0, 0.2), 1)
        b((4.55, 1.05, 0.17), (0, 0, 1.08), 0)
        for y in (-0.49, 0.49):
            b((4.55, 0.12, 0.24), (0, y, 1.28), 1)
    elif template == 'bridge' and record['parameters'].get('composition') == 'pontoon':
        # A fragment of a floating timber crossing, without the real operating mechanism.
        for x in (-1.65, -0.55, 0.55, 1.65):
            ring = [(x - 0.22, -0.75), (x, -1.02), (x + 0.22, -0.75),
                    (x + 0.22, 0.75), (x, 1.02), (x - 0.22, 0.75)]
            vertices = [(a, y, z) for z in (0, 0.28) for a, y in ring]
            faces = [(5, 4, 3, 2, 1, 0), (6, 7, 8, 9, 10, 11)]
            faces += [(i, (i + 1) % 6, (i + 1) % 6 + 6, i + 6) for i in range(6)]
            objects.append(mesh_object('pontoon-hull', vertices, faces, m[1]))
        for i in range(24):
            b((0.18, 1.25, 0.10), (-2.18 + i * 0.19, 0, 0.33), 0)
        for y in (-0.59, 0.59):
            for x in (-2.1, -1.4, -0.7, 0, 0.7, 1.4, 2.1):
                b((0.045, 0.045, 0.52), (x, y, 0.62), 3)
            b((4.5, 0.055, 0.055), (0, y, 0.88), 3)
    elif template == 'bridge':
        b((4, 1, 0.2), (0, 0, 1.1), 0)
        for x in (-1.5, 0, 1.5): b((0.25, 0.8, 1), (x, 0, 0.5), 0)
        for y in (-0.5, 0.5):
            for x in (-1.9, -1.3, -0.7, 0, 0.7, 1.3, 1.9): b((0.06, 0.06, 0.55), (x, y, 1.45), 1)
            b((4, 0.06, 0.06), (0, y, 1.7), 1)
    elif template == 'rock':
        for i in range(7):
            objects.append(ico('rock', rng.uniform(0.5, 0.8), (rng.uniform(-0.65, 0.65), rng.uniform(-0.5, 0.5), rng.uniform(0.3, 0.7)), m[i % len(m)], (1, 0.8, rng.uniform(0.7, 1.3)), 2))
    elif template == 'waterfront':
        if 'composition' in record['parameters']:
            return natural_fragment(m, record['parameters']['composition'])
        b((3.2, 1.6, 0.12), (0, 0, 0.06), 4)
        for i in range(5):
            x = -1.4 + i * 0.7
            objects.append(ico('bank', 0.5, (x, 0.65, 0.2), m[0], (1, 0.7, 0.5)))
        for i in range(3): b((1.5 - i * 0.2, 0.025, 0.015), (0.2 * (i - 1), -0.5 + i * 0.3, 0.13), 0)
    else:
        raise ValueError(f'Unknown sourced hero template {template}')
    return objects


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', required=True)
    parser.add_argument('--record', required=True)
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    options = parser.parse_args(argv)
    record = json.loads(Path(options.record).read_text())
    categories = {'market': ['market'], 'gate': ['building', 'monument'], 'tower': ['building', 'monument'],
                  'lattice-tower': ['building', 'monument'], 'colonnade': ['building', 'monument'],
                  'bridge': ['building', 'monument'], 'rock': ['natural-feature'], 'waterfront': ['natural-feature'],
                  'landscape': ['natural-feature'], 'retail-building': ['building'], 'landmark': ['building', 'monument']}
    if record.get('category') not in categories.get(record.get('generator'), []):
        raise ValueError('Unknown or mismatched hero category and template')
    if record.get('geometryLicence') != 'AGPL-3.0-or-later' or not record.get('sourceUrls') or not all(isinstance(url, str) and url.startswith('https://') for url in record['sourceUrls']):
        raise ValueError('A reviewed source record is required')
    restricted = ('ng', 'gh', 'fr', 'gf', 'gp', 'mq', 're', 'yt', 'bl', 'mf', 'pm', 'pf', 'nc', 'wf', 'tf', 'cp')
    if record.get('country') in restricted and record.get('category') == 'building' and (not isinstance(record.get('builtYear'), int) or isinstance(record.get('builtYear'), bool)):
        raise ValueError('Restricted-country building needs a construction year')
    if record.get('country') in restricted and record.get('category') == 'building' and record['builtYear'] >= 1950:
        raise ValueError('Restricted-country building must predate 1950')
    common.reset()
    p = record['parameters']
    if not all(isinstance(p.get(key), (int, float)) and math.isfinite(p[key]) and 0.1 <= p[key] <= 60 for key in ('width', 'depth', 'height')):
        raise ValueError('Hero dimensions must be finite and between 0.1 and 60 metres')
    if not isinstance(p.get('seed'), int) or p['seed'] < 0:
        raise ValueError('Hero seed must be a nonnegative integer')
    compositions = {'market': ['cross-lane', 'covered-lane', 'court', 'neutral-trade'], 'waterfront': ['open-lagoon', 'paired-ponds'],
                    'landscape': ['forest', 'open-park', 'hill', 'bare-coast', 'low-cay', 'ice-valley', 'gully', 'riverbank', 'confluence'],
                    'bridge': ['stone-arches', 'pontoon'], 'landmark': LANDMARK_COMPOSITIONS}
    if record['generator'] in ('landscape', 'landmark') and 'composition' not in p:
        raise ValueError('Landscape and landmark need an explicit composition')
    if 'composition' in p and p['composition'] not in compositions.get(record['generator'], []):
        raise ValueError('Unsupported hero composition for generator')
    materials = palette(p['palette'])
    obj = finish_hero(record['city'], generate(record, materials), materials, p['palette'], (p['width'], p['depth'], p['height']))
    Path(options.out).parent.mkdir(parents=True, exist_ok=True)
    common.export(options.out, [obj], vertex_colour=True)


if __name__ == '__main__':
    main()
