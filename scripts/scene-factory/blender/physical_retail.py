"""Original retail fragments; dimensions and arrangements are not surveyed facades."""
import hashlib
import itertools
import json
import math
from pathlib import Path

from construction import CLOTH_CELLS, Construction
from kit import REGIONS, regional_cloth
from shared import mesh_object


REGISTRY = Path(__file__).resolve().parents[3] / 'scripts/scene-factory/heroes.json'
REGISTRY_SHA256 = '367b3dff2930be447cfffc21e5d49ad86bb614e08c3cea43a9b2a4c07c25d1f1'
REQUIRED_CELLS = {'timber': 0, 'dark-timber': 1, 'canvas': 2, 'metal': 4,
                  'pond-water': 5, 'foliage': 7, 'mineral': 8, 'earth': 12,
                  'dark-metal': 14}
FLOOR = .14
PIER, WALL = .18, .20
HEADER = FLOOR + 2.18


def retail_design(record):
    """Allocate original massing, independent of export order; never infer a real facade."""
    raw = REGISTRY.read_bytes()
    if hashlib.sha256(raw).hexdigest() != REGISTRY_SHA256:
        raise ValueError('Retail design requires the reviewed canonical registry')
    rows = [r for r in json.loads(raw) if r['generator'] == 'retail-building']
    if len(rows) != 67 or len({r['city'] for r in rows}) != 67:
        raise ValueError('Expected the reviewed 67-city retail cohort')
    choices = list(itertools.product(('corner', 'courtyard', 'veranda', 'pavilion'),
                                     (2, 3), (4.8, 5.8, 6.8), (0., .38), (1.25, 1.85)))
    if len(rows) > len(choices):
        raise ValueError('Retail massing vocabulary exhausted; explicit expansion required')
    occupied, selected = set(), None
    for row in sorted(rows, key=lambda r: r['city']):
        if row['category'] != 'building' or 'composition' in row['parameters']:
            raise ValueError('Unexpected canonical retail form')
        key = f"physical-retail-v2:{row['city']}:{row['parameters']['seed']}"
        initial = int(hashlib.sha256(key.encode()).hexdigest(), 16) % len(choices)
        index = next((i for step in range(len(choices))
                      if (i := (initial+step) % len(choices)) not in occupied), None)
        if index is None:
            raise ValueError('No distinct retail massing remains')
        occupied.add(index)
        if row['city'] == record['city']:
            if ({k: v for k, v in record.items() if k != 'surface'} !=
                    {k: v for k, v in row.items() if k != 'surface'}):
                raise ValueError('Retail record differs from canonical facts')
            massing, bays, width, elevation, projection = choices[index]
            surface = record.get('surface', {})
            region = surface.get('region')
            if surface.get('kind') != 'regional-atlas' or region not in REGIONS:
                raise ValueError('Retail requires an explicit regional atlas')
            style = json.loads((REGISTRY.parent/'styles'/f'{region}.json').read_text())
            regional_cloth(style, region)
            selected = dict(version=2, massing=massing, bays=bays, width=width,
                            roof=max(2.6, style['canopyHeight']+.35)+elevation,
                            roofForm=style['roof'], projection=projection,
                            index=index, seed=row['parameters']['seed'], allocationKey=key,
                            basis='Original illustrative retail fragment; not a surveyed facade')
    if selected is None:
        raise ValueError('Unknown canonical retail city')
    return selected


def _block(c, low, high, cell):
    """Closed un-bevelled members meet at their named boundary planes."""
    size = tuple(b-a for a, b in zip(low, high))
    if any(not math.isfinite(v) or v <= 0 for v in size):
        raise ValueError('Positive retail member thickness required')
    return c.box(size, tuple((a+b)/2 for a, b in zip(low, high)), cell)


def _frame(c, x, front, bottom, width, height, cells, edge=.055,
           rail=.055, divided=True):
    """A real frame around inset opaque panels, with no coplanar front overlays."""
    left, right, top = x-width/2, x+width/2, bottom+height
    metal, glazing = cells['metal'], cells['dark-metal']
    for a, b in ((left, left+edge), (right-edge, right)):
        _block(c, (a, front, bottom), (b, front+.10, top), metal)
    for a, b in ((bottom, bottom+rail), (top-rail, top)):
        _block(c, (left+edge, front, a), (right-edge, front+.10, b), metal)
    inner_bottom, inner_top = bottom+rail, top-rail
    if divided:
        _block(c, (x-.022, front, inner_bottom),
               (x+.022, front+.10, inner_top), metal)
        spans = ((left+edge, x-.022), (x+.022, right-edge))
    else:
        spans = ((left+edge, right-edge),)
    for a, b in spans:
        _block(c, (a, front+.055, inner_bottom),
               (b, front+.085, inner_top), glazing)


def _entrance(c, left, right, front, recess, cells):
    """Recessed portal with a 1.02 by 2.10 m clear door panel and grounded threshold."""
    plane = front+recess
    centre = (left+right)/2
    mineral = cells['mineral']
    # Returns occupy the pier footprint behind the front piers, without overlap.
    for a, b in ((left-.10, left), (right, right+.10)):
        _block(c, (a, front+.22, FLOOR), (b, plane, HEADER), mineral)
    for a, b in ((left, centre-.58), (centre+.58, right)):
        _block(c, (a, plane, FLOOR), (b, plane+.14, HEADER), mineral)
    _block(c, (left, front+.22, HEADER), (right, plane+.14, HEADER+.12), mineral)
    _frame(c, centre, plane, FLOOR, 1.16, 2.18, cells,
           edge=.07, rail=.04, divided=False)
    # A solid pull contacts the panel face at its rear plane; it is not suspended.
    _block(c, (centre+.30, plane+.005, FLOOR+.87),
           (centre+.324, plane+.055, FLOOR+1.13), cells['metal'])


def _canopy(c, x, front, form, cells):
    """Closed plate rests on two beams; front posts reach the shared plinth."""
    width, projection = 2.25, .95
    left, right = x-width/2, x+width/2
    outer = front-projection
    low, rear = 2.50, 2.50 if form == 'flat' else 2.72
    ys = (outer, outer+.14, front-.14, front)
    zs = (low, low, rear, rear)
    vertices = [(edge, y, z+thickness) for thickness in (0, .10)
                for y, z in zip(ys, zs) for edge in (left, right)]
    faces = []
    for j in range(3):
        a = 2*j
        faces.extend(((a, a+2, a+3, a+1),
                      (a+8, a+9, a+11, a+10),
                      (a, a+8, a+10, a+2),
                      (a+1, a+3, a+11, a+9)))
    faces.extend(((0, 1, 9, 8), (6, 14, 15, 7)))
    c.add(mesh_object('supported-canopy-plate', vertices, faces, c.material), cells['metal'])
    _block(c, (left, outer, low-.10), (right, outer+.14, low), cells['metal'])
    _block(c, (left, front-.14, rear-.10), (right, front, rear), cells['metal'])
    for centre in (left+.14, right-.14):
        _block(c, (centre-.045, outer+.025, FLOOR),
               (centre+.045, outer+.115, low-.10), cells['metal'])


def _place(objects, x=0, y=0, angle=0):
    for obj in objects:
        px, py, pz = obj.location
        obj.location = (x+px*math.cos(angle)-py*math.sin(angle),
                        y+px*math.sin(angle)+py*math.cos(angle), pz)
        obj.rotation_euler.z += angle
    return objects


def _roof(c, width, depth, height, form, cells, hip=False):
    """Closed fascia and roof shell, using existing mineral and metal surface roles."""
    if form == 'flat':
        _block(c, (-width/2, -depth/2, height), (width/2, depth/2, height+.16), cells['mineral'])
        for x in (-width/2+.06, width/2-.06):
            c.box((.12, depth, .18), (x, 0, height+.25), cells['mineral'])
        c.box((width-.24, .12, .18), (0, depth/2-.06, height+.25), cells['mineral'])
        return
    if form != 'gable':
        raise ValueError('Unsupported retail roof form')
    w, d = width/2, depth/2
    inset = min(.75, width*.22) if hip else 0
    rise = .62
    top = [(-w, -d, height), (w, -d, height), (w, d, height), (-w, d, height),
           (-w+inset, 0, height+rise), (w-inset, 0, height+rise)]
    vertices = top + [(x, y, z-.10) for x, y, z in top]
    faces = [(0, 1, 5, 4), (2, 3, 4, 5)]
    if hip:
        faces += [(1, 2, 5), (3, 0, 4)]
    faces += [tuple(i+6 for i in reversed(face)) for face in faces[:]]
    rim = [0, 1, 2, 3] if hip else [0, 1, 5, 2, 3, 4]
    faces += [(a, a+6, b+6, b) for a, b in zip(rim, rim[1:]+rim[:1])]
    c.add(mesh_object('retail-roof-shell', vertices, faces, c.material), cells['dark-metal'])
    c.box((width-2*inset+.10, .12, .10), (0, 0, height+rise), cells['metal'])
    # Solid gable infill closes the building; it is separate from the thin roof shell.
    if not hip:
        for x in (-w+.19, w-.19):
            section = [(-d+.18, height-.10), (d-.18, height-.10), (0, height+rise-.14)]
            vertices = [(xx, y, z) for xx in (x-.07, x+.07) for y, z in section]
            faces = [(0, 2, 1), (3, 4, 5), (0, 1, 4, 3), (1, 2, 5, 4), (2, 0, 3, 5)]
            c.add(mesh_object('retail-gable-infill', vertices, faces, c.material), cells['mineral'])


def _range(material, width, depth, bays, height, roof, cells, entry=0, covered=True):
    """A usable shallow shop range with inset opaque framed openings and real wall returns."""
    c = Construction(material)
    mineral, front, back = cells['mineral'], -depth/2, depth/2
    _block(c, (-width/2-.16, front-.35, 0), (width/2+.16, back+.16, FLOOR), mineral)
    for left, right in ((-width/2, -width/2+WALL), (width/2-WALL, width/2)):
        _block(c, (left, front, FLOOR), (right, back, height), mineral)
    _block(c, (-width/2+WALL, back-WALL, FLOOR), (width/2-WALL, back, height), mineral)
    inner_left, inner_right = -width/2+WALL, width/2-WALL
    _block(c, (inner_left, front, HEADER), (inner_right, front+.22, height), mineral)
    opening = (inner_right-inner_left-(bays+1)*PIER)/bays
    if opening <= .20:
        raise ValueError('Retail bays have no usable clear opening')
    for i in range(bays+1):
        left = inner_left+i*(opening+PIER)
        _block(c, (left, front, FLOOR), (left+PIER, front+.22, HEADER), mineral)
    for i in range(bays):
        left = inner_left+PIER+i*(opening+PIER)
        right = left+opening
        c.box((opening, .04, .20), ((left+right)/2, front-.02, HEADER-.10),
              CLOTH_CELLS['cool_textile'])
        if i == entry:
            if opening < 1.18:
                raise ValueError('Retail entrance requires its full clear portal width')
            _entrance(c, left, right, front, .55, cells)
        else:
            sill = .46
            _block(c, (left, front, FLOOR), (right, front+.22, sill), mineral)
            _frame(c, (left+right)/2, front+.09, sill, opening, HEADER-sill, cells)
    # Horizontal cornice and sill are actual members, not painted facade stripes.
    c.box((width+.12, .30, .12), (0, front-.02, height-.06), mineral)
    if covered:
        _roof(c, width+.36, depth+.36, height, roof, cells)
    return c.objects


def build_retail(material, record, cells):
    """Return original objects; provenance, atlas binding, fit and export belong to caller."""
    if material is None or not isinstance(record, dict) or cells != REQUIRED_CELLS:
        raise ValueError('Material, canonical record and exact semantic cells required')
    p = record.get('parameters')
    if (record.get('generator') != 'retail-building' or record.get('category') != 'building'
            or not isinstance(p, dict) or 'composition' in p):
        raise ValueError('Unsupported retail form; no generic fallback')
    if (any(type(p.get(k)) not in (int, float) or not math.isfinite(p[k])
            for k in ('width', 'depth', 'height')) or
            tuple(p[k] for k in ('width', 'depth', 'height')) != (8.6, 6.1, 3.7)):
        raise ValueError('Expected the canonical original retail art envelope')
    if type(p.get('seed')) is not int or not 0 <= p['seed'] <= 9007199254740991:
        raise ValueError('Canonical integer seed required')
    if not isinstance(record.get('city'), str):
        raise ValueError('Canonical city identity required')
    d = retail_design(record)
    width, height, roof = d['width'], d['roof'], d['roofForm']
    bays, projection, massing = d['bays'], d['projection'], d['massing']
    out = []
    if massing in ('corner', 'courtyard'):
        # Separate ranges leave a real open forecourt and narrow passages at the elbows.
        out.extend(_place(_range(material, width, 2.30, bays, height, roof, cells), y=1.55))
        wing_width = projection+1.75
        signs = (-1,) if massing == 'corner' else (-1, 1)
        for sign in signs:
            wing = _range(material, wing_width, 2.20, 1, height-.20, roof, cells)
            out.extend(_place(wing, sign*(width/2+1.48),
                              1.55-1.15-wing_width/2-.45, -sign*math.pi/2))
    elif massing == 'veranda':
        depth = 2.30
        out.extend(_range(material, width, depth, bays, height, roof, cells, covered=False))
        gallery = Construction(material)
        front = -depth/2-projection
        _block(gallery, (-width/2-.16, front-.18, 0),
               (width/2+.16, -depth/2-.35, FLOOR), cells['mineral'])
        for i in range(bays+1):
            x = -width/2+i*width/bays
            gallery.box((.18, .18, height-FLOOR), (x, front+.12, (height+FLOOR)/2), cells['dark-timber'])
            gallery.box((.32, .32, .24), (x, front+.12, FLOOR+.12), cells['mineral'])
            for sign in (-1, 1):
                if -width/2 < x+sign*.25 < width/2:
                    gallery.bar((x, front+.12, height-.50),
                                (x+sign*.35, front+.12, height-.12), .09, cells['dark-timber'])
        gallery.box((width+.20, .18, .18), (0, front+.12, height-.09), cells['dark-timber'])
        out.extend(gallery.objects)
        cover = Construction(material)
        _roof(cover, width+.55, depth+projection+.45, height, roof, cells, hip=True)
        out.extend(_place(cover.objects, y=-projection/2))
    elif massing == 'pavilion':
        # A projecting tall entrance and two lower, setback ranges read as one grouped frontage.
        centre_depth = projection+2.0
        out.extend(_range(material, 2.20, centre_depth, 1, height+.40, roof, cells))
        for sign, count in ((-1, 1), (1, bays-1)):
            wing_width, wing_depth = width/2, projection+1.40
            wing = _range(material, wing_width, wing_depth, count,
                          height-.20, roof, cells, entry=None)
            out.extend(_place(wing, sign*(1.10+wing_width/2+.08), y=.40))
        porch = Construction(material)
        _canopy(porch, 0, -centre_depth/2, 'rising', cells)
        _block(porch, (-1.30, -centre_depth/2-1.10, 0),
               (1.30, -centre_depth/2-.35, FLOOR), cells['mineral'])
        out.extend(porch.objects)
    else:
        raise ValueError('Unknown retail massing')
    return out
