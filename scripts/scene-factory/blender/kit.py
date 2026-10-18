"""One regional kit: twenty named props, one shared 1024-pixel atlas."""
import argparse
import json
import math
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from shared import box, common, ico, mesh_object, roof
from construction import BASE_CLOTH_PALETTE, export_physical_kit

REGIONS = ['niger-delta', 'yoruba-southwest', 'sahel-north', 'igbo-southeast', 'gulf-guinea',
           'sahel-francophone', 'east-africa', 'swahili-coast', 'southern-africa', 'maghreb',
           'western-europe', 'east-asia', 'south-asia', 'americas-oceania']

# The input palette's declared roles are translated to textile roles, never atlas cell indices.
STYLE_PALETTE_ROLES = ('light-surface', 'wood', 'foliage', 'accent',
                       'glass-water', 'warm-accent', 'metal', 'dark')
REGIONAL_CLOTH_PROFILES = {
    'niger-delta': 'style-textiles-v1',
    'yoruba-southwest': 'style-textiles-v1',
    'sahel-north': 'style-textiles-v1',
    'igbo-southeast': 'style-textiles-v1',
    'gulf-guinea': 'market-base-v1',
    'sahel-francophone': 'style-textiles-v1',
    'east-africa': 'style-textiles-v1',
    'swahili-coast': 'style-textiles-v1',
    'southern-africa': 'style-textiles-v1',
    'maghreb': 'style-textiles-v1',
    'western-europe': 'style-textiles-v1',
    'east-asia': 'style-textiles-v1',
    'south-asia': 'style-textiles-v1',
    'americas-oceania': 'style-textiles-v1',
}


def regional_cloth(style, region):
    """Limited original art direction; neither local colour nor architecture is inferred."""
    if not isinstance(style, dict) or style.get('id') != region or region not in REGIONAL_CLOTH_PROFILES:
        raise ValueError('The physical kit needs a declared matching region')
    urls = style.get('sourceUrls')
    if not isinstance(urls, list) or not urls or any(not isinstance(url, str) or not url.startswith('https://') for url in urls):
        raise ValueError('The region style needs HTTPS source URLs')
    values = style.get('palette')
    if not isinstance(values, list) or len(values) != len(STYLE_PALETTE_ROLES):
        raise ValueError('The region style needs eight declared palette colours')
    for value in values:
        if not isinstance(value, str) or len(value) != 7 or value[0] != '#' or any(c not in '0123456789abcdefABCDEF' for c in value[1:]):
            raise ValueError('Invalid region palette colour')
    height = style.get('canopyHeight', 2.1)
    if style.get('roof') not in ('gable', 'flat') or isinstance(height, bool) or not isinstance(height, (int, float)) or not math.isfinite(height) or not 1.8 <= height <= 3:
        raise ValueError('Unsupported legacy roof or canopy metadata')
    profile = REGIONAL_CLOTH_PROFILES[region]
    if profile == 'market-base-v1':
        # Explicit baseline profile preserves the reviewed Gulf atlas; this is not a fallback.
        return dict(BASE_CLOTH_PALETTE)
    if profile != 'style-textiles-v1':
        raise ValueError('Unknown textile profile')
    roles = dict(zip(STYLE_PALETTE_ROLES, values))
    return {'cool_textile': roles['glass-water'],
            'warm_textile': roles['accent'], 'ochre_textile': roles['warm-accent']}


def make_prop(name, materials, form, canopy_height):
    m = [materials[i % len(materials)] for i in range(8)]
    out = []
    def b(size, at, colour=0):
        out.append(box(name, size, at, m[colour]))
    def cylinder(radius, depth, at, colour=1, vertices=8, rotation=(0, 0, 0)):
        out.append(common.cylinder(name, radius, depth, at, m[colour], vertices, rotation))
    def beam(a, z, radius=0.045, colour=1):
        out.append(common.segment(name, a, z, radius, m[colour]))
    def cover(w, d, h, at, colour=3):
        out.append(roof(name, w, d, h, at, m[colour], form))
    if name in ('market-stall', 'canopy', 'produce-stand'):
        width = 2.4 if name == 'canopy' else 1.9
        for x in (-width / 2 + 0.1, width / 2 - 0.1):
            for y in (-0.65, 0.65): b((0.09, 0.09, canopy_height), (x, y, canopy_height / 2), 1)
        cover(width + 0.25, 1.7, 0.28, (0, 0, canopy_height))
        if name != 'canopy':
            b((width, 1.25, 0.14), (0, 0, 0.85), 1)
            b((width, 0.1, 0.7), (0, 0.6, 0.42), 0)
        if name == 'produce-stand':
            for x in (-0.6, 0, 0.6):
                for y in (-0.25, 0.25): out.append(ico(name, 0.18, (x, y, 1.05), m[5], scale=(1, 1, 0.65)))
    elif name == 'crate-stack':
        for x, y, z in [(-0.38, 0, 0.22), (0.38, 0, 0.22), (0, 0, 0.67)]:
            b((0.7, 0.65, 0.08), (x, y, z - 0.17), 1)
            for side in (-1, 1):
                for height in (-0.08, 0.12):
                    b((0.7, 0.07, 0.12), (x, y + side * 0.28, z + height), 1)
                    b((0.07, 0.65, 0.12), (x + side * 0.315, y, z + height), 1)
    elif name == 'cooking-stand':
        for x in (-0.35, 0.35):
            for y in (-0.25, 0.25): b((0.07, 0.07, 0.7), (x, y, 0.35), 7)
        b((0.85, 0.65, 0.12), (0, 0, 0.72), 7)
        cylinder(0.3, 0.35, (0, 0, 0.94), 6, 12)
        cylinder(0.33, 0.05, (0, 0, 1.14), 6, 12)
        cylinder(0.06, 0.07, (0, 0, 1.2), 7)
    elif name == 'water-tank':
        for x in (-0.55, 0.55):
            for y in (-0.55, 0.55): b((0.1, 0.1, 1.4), (x, y, 0.7), 6)
        b((1.4, 1.4, 0.12), (0, 0, 1.45), 6)
        cylinder(0.65, 1.2, (0, 0, 2.08), 4, 12)
        for z in (1.7, 2.05, 2.4): cylinder(0.67, 0.04, (0, 0, z), 7, 12)
        cylinder(0.4, 0.1, (0, 0, 2.73), 4, 12)
    elif name == 'generator':
        b((1.0, 0.7, 0.65), (0, 0, 0.45), 5)
        for x in (-0.55, 0.55):
            for y in (-0.4, 0.4): b((0.06, 0.06, 0.9), (x, y, 0.45), 7)
        for y in (-0.4, 0.4): b((1.15, 0.06, 0.06), (0, y, 0.87), 7)
        for z in (0.28, 0.4, 0.52, 0.64): b((0.6, 0.025, 0.035), (0, -0.36, z), 7)
    elif name == 'minibus':
        length, width = 4.2, 1.7
        b((width, length, 1.0), (0, 0, 0.95), 5)
        b((width * 0.95, length * 0.86, 0.8), (0, 0.1, 1.8), 5)
        b((width * 0.83, 0.035, 0.53), (0, -length * 0.43 + 0.08, 1.8), 4)
        for x in (-width * 0.48, width * 0.48):
            for y in (-length * 0.21, length * 0.13): b((0.025, length * 0.25, 0.48), (x, y, 1.8), 4)
        wheels = [(x, y) for x in (-width / 2, width / 2) for y in (-length * 0.32, length * 0.32)]
        for x, y in wheels: cylinder(0.32, 0.16, (x, y, 0.32), 7, 10, (0, math.pi / 2, 0))
    elif name == 'three-wheeler':
        # Open passenger cabin, tapered nose and one exposed front wheel.
        b((1.22, 1.42, 0.18), (0, 0.28, 0.56), 5)
        b((1.24, 0.16, 0.86), (0, 0.94, 0.96), 5)
        b((1.02, 0.43, 0.14), (0, 0.56, 0.86), 7)
        b((1.02, 0.12, 0.44), (0, 0.79, 1.08), 7)
        for x in (-0.57, 0.57):
            b((0.07, 0.08, 1.15), (x, 0.92, 1.17), 7)
            beam((x, -0.4, 0.75), (x * 0.86, -0.51, 1.88), 0.035, 7)
            b((0.08, 1.12, 0.15), (x, 0.25, 0.68), 5)
        b((1.38, 1.66, 0.12), (0, 0.2, 1.94), 7)
        b((1.10, 0.045, 0.51), (0, -0.56, 1.54), 4)
        vertices=[(-0.53,-0.57,0.72),(0.53,-0.57,0.72),(0.25,-1.13,0.64),(-0.25,-1.13,0.64),
                  (-0.50,-0.57,1.27),(0.50,-0.57,1.27),(0.21,-1.13,0.91),(-0.21,-1.13,0.91)]
        out.append(mesh_object(name,vertices,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],m[5]))
        cylinder(0.10, 0.04, (0,-1.15,0.85), 0, 10, (math.pi/2,0,0))
        beam((0,-0.97,0.76),(0,-1.12,0.32),0.055,6)
        for x,y in [(-0.64,0.62),(0.64,0.62),(0,-1.14)]:
            cylinder(0.30,0.17,(x,y,0.30),7,12,(0,math.pi/2,0))
            cylinder(0.13,0.18,(x,y,0.30),6,10,(0,math.pi/2,0))
    elif name == 'bench':
        for y in (-0.18, 0, 0.18): b((1.8, 0.14, 0.08), (0, y, 0.48), 1)
        for x in (-0.65, 0.65):
            for y in (-0.2, 0.2): b((0.08, 0.08, 0.48), (x, y, 0.24), 7)
            b((0.07, 0.08, 0.95), (x, 0.26, 0.475), 7)
        for z in (0.7, 0.9): b((1.8, 0.08, 0.14), (0, 0.26, z), 1)
    elif name == 'bollard':
        cylinder(0.16, 0.12, (0, 0, 0.06), 6)
        cylinder(0.09, 0.9, (0, 0, 0.55), 7)
        cylinder(0.11, 0.1, (0, 0, 1.05), 5)
    elif name == 'planter':
        cylinder(0.46, 0.55, (0, 0, 0.275), 3, 10)
        for x, y in [(-0.2, 0), (0.2, 0), (0, 0.2)]: out.append(ico(name, 0.35, (x, y, 0.75), m[2]))
    elif name in ('broadleaf-tree', 'palm', 'acacia'):
        height = 3.4 if name == 'palm' else 2.4
        cylinder(0.15, height, (0, 0, height / 2), 1)
        if name == 'palm':
            for i in range(9):
                a = i * 2 * math.pi / 9
                direction=(math.cos(a),math.sin(a));side=(-direction[1],direction[0])
                def spine(t):
                    return (1.65*t*direction[0],1.65*t*direction[1],height+0.45*math.sin(math.pi*t)-0.75*t*t)
                for j in range(4): beam(spine(j/4),spine((j+1)/4),0.025,2)
                for j in range(5):
                    t=0.18+j*0.15;anchor=spine(t);length=0.38*(1-t)+0.13
                    for sign in (-1,1):
                        tip=(anchor[0]+direction[0]*0.30+side[0]*length*sign,
                             anchor[1]+direction[1]*0.30+side[1]*length*sign,anchor[2]-0.18-0.18*t)
                        mid=tuple((anchor[k]+tip[k])/2 for k in range(3));w=0.065
                        verts=[anchor,(mid[0]+direction[0]*w,mid[1]+direction[1]*w,mid[2]),tip,
                               (mid[0]-direction[0]*w,mid[1]-direction[1]*w,mid[2]),
                               (mid[0],mid[1],mid[2]+0.025),(mid[0],mid[1],mid[2]-0.015)]
                        faces=[(4,k,(k+1)%4) for k in range(4)]+[(5,(k+1)%4,k) for k in range(4)]
                        out.append(mesh_object(name,verts,faces,m[2]))
        else:
            for x, y in [(-0.65, 0), (0.65, 0), (0, -0.65), (0, 0.65)]:
                beam((0, 0, height * 0.55), (x, y, height), 0.08, 1)
                out.append(ico(name, 0.95, (x, y, height), m[2], (1.2, 1.2, 0.3 if name == 'acacia' else 0.8)))
    elif name == 'wall':
        b((3, 0.35, 1.5), (0, 0, 0.75), 0)
        for x in (-1.4, 1.4): b((0.3, 0.5, 1.7), (x, 0, 0.85), 0)
        b((3.1, 0.48, 0.1), (0, 0, 1.55), 1)
    elif name == 'gate':
        for x in (-1.05, 1.05): b((0.28, 0.45, 2.3), (x, 0, 1.15), 0)
        for x in [-0.8, -0.4, 0, 0.4, 0.8]: b((0.045, 0.07, 1.8), (x, 0, 0.95), 7)
        for z in (0.3, 1.65): b((1.9, 0.08, 0.06), (0, 0, z), 7)
    elif name == 'kiosk':
        b((2.1, 1.7, 1.0), (0, 0, 0.5), 0)
        b((2.1, 0.12, 2.4), (0, 0.8, 1.2), 0)
        for x in (-1, 1): b((0.12, 1.7, 2.4), (x, 0, 1.2), 0)
        b((2.3, 0.6, 0.1), (0, -0.85, 1), 1)
        cover(2.5, 2.2, 0.4, (0, 0, 2.4), 6)
    elif name == 'street-lamp':
        cylinder(0.18, 0.16, (0, 0, 0.08), 6)
        cylinder(0.07, 3.6, (0, 0, 1.9), 7)
        beam((0, 0, 3.65), (0, -0.6, 3.8), 0.06, 7)
        b((0.35, 0.55, 0.12), (0, -0.65, 3.8), 6)
        b((0.28, 0.45, 0.03), (0, -0.65, 3.72), 5)
    elif name == 'sign-frame':
        for x in (-0.7, 0.7): b((0.08, 0.08, 2.4), (x, 0, 1.2), 7)
        b((1.7, 0.14, 0.9), (0, 0, 2.0), 0)
    else:
        raise ValueError(f'Unknown prop {name}')
    return out


def main():
    args = argparse.ArgumentParser()
    args.add_argument('--out', required=True)
    args.add_argument('--region', required=True, choices=REGIONS)
    args.add_argument('--style', required=True)
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    options = args.parse_args(argv)
    style = json.loads(Path(options.style).read_text())
    cloth = regional_cloth(style, options.region)
    # Roof/height remain validated legacy metadata; reviewed physical geometry is shared by all regions.
    print(json.dumps({'region': options.region, 'physicalProfile': REGIONAL_CLOTH_PROFILES[options.region],
                      'cloth': cloth, 'geometry': 'physical-20-v1', 'legacyRoofHeightApplied': False}), file=sys.stderr)
    export_physical_kit(options.out, cloth)



if __name__ == '__main__':
    main()
