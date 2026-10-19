"""Explicit physical hero prototypes; export and runtime acceptance are separate gates."""
import argparse
import datetime
import hashlib
import itertools
import json
import math
from pathlib import Path
import re
import sys
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bpy
from mathutils import Matrix, Vector
from construction import (BASE_CLOTH_PALETTE, Construction, broadleaf_tree,
                          finish_sample, market_hero, painted_atlas)
from kit import REGIONS, regional_cloth
from physical_landmarks import BRIDGES, FORMS as LANDMARK_FORMS, build_landmark
from physical_landscape import SUPPORTED as LANDSCAPE_SUPPORTED, build_landscape
from physical_retail import build_retail
from shared import common, mesh_object

ROOT = Path(__file__).resolve().parents[3]
REGISTRY = ROOT / 'scripts/scene-factory/heroes.json'
RESTRICTED = {'ng', 'gh', 'fr', 'gf', 'gp', 'mq', 're', 'yt', 'bl', 'mf',
              'pm', 'pf', 'nc', 'wf', 'tf', 'cp'}
# Named surface roles, independent of the old vertex-colour palette order.
CELLS = {'timber': 0, 'dark-timber': 1, 'canvas': 2, 'metal': 4,
         'pond-water': 5, 'foliage': 7, 'mineral': 8, 'earth': 12,
         'dark-metal': 14}
LANDMARK_CELLS = {**CELLS, 'ochre': 6}
SUPPORTED = ({('market', 'neutral-trade'), ('market', 'covered-lane'),
              ('market', 'court'), ('waterfront', 'paired-ponds'),
              ('lattice-tower', None), ('retail-building', None)} |
             LANDSCAPE_SUPPORTED |
             {('landmark', form) for form in LANDMARK_FORMS} |
             {('bridge', form) for form in BRIDGES})
COMPATIBILITY_PINS = {
    'scripts/scene-factory/blender/construction.py': 'd6a72c38e2caf8d807f4a2d7da73c9b4d820914660eb35303d3dad5c55b955d4',
    'scripts/scene-factory/blender/shared.py': '2d558cfed345e2189ca18a318d3510c8c69ad7162e6bad1ef554c987aa475694',
    'scripts/assets/blender/common.py': '159fe2ac049251a159d4c9b1cb20814df3162d30ad5d3440e8af282f23958547',
}
ACCRA_RAW_SHA256 = '6915df489533fdc18dc799bdbced1fcb24cce163bf0355733f6b9764be553a50'


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def checked_record(record, style, region, profile):
    """Canonical facts are immutable; only an explicit atlas declaration is added."""
    require(isinstance(record, dict), 'Expected one hero record')
    require(isinstance(record.get('city'), str) and
            re.fullmatch(r'[a-z][a-z0-9]*(?:-[a-z0-9]+)*', record['city']), 'Invalid city')
    rows = json.loads(REGISTRY.read_text())
    require(isinstance(rows, list), 'Canonical hero registry must be an array')
    matching = [r for r in rows if r.get('city') == record['city']]
    require(len(matching) == 1, 'Expected one canonical city identity')
    require({k: v for k, v in record.items() if k != 'surface'} ==
            {k: v for k, v in matching[0].items() if k != 'surface'},
            'Only surface may differ from the authoritative hero record')
    require(region in REGIONS and record.get('surface') ==
            {'kind': 'regional-atlas', 'region': region}, 'Explicit matching regional-atlas surface required')
    require(style == json.loads((ROOT / f'scripts/scene-factory/styles/{region}.json').read_text()),
            'Style must match the durable regional input')
    cloth = regional_cloth(style, region)
    require(record.get('geometryLicence') == 'AGPL-3.0-or-later', 'Geometry licence mismatch')
    for key in ('sourceRef', 'sourceLicence', 'evidence'):
        require(isinstance(record.get(key), str) and len(record[key].strip()) > 5,
                'Missing source association: ' + key)
    require(isinstance(record.get('name'), str) and len(record['name'].strip()) >= 2, 'Real feature name required')
    urls = record.get('sourceUrls')
    require(isinstance(urls, list) and urls and all(isinstance(u, str) and
            urlparse(u).scheme == 'https' and urlparse(u).netloc for u in urls), 'Exact HTTPS sources required')
    datetime.date.fromisoformat(record['accessed'])
    require(re.fullmatch(r'[a-z]{2}', record.get('country', '')) is not None, 'ISO country required')
    p = record.get('parameters')
    require(isinstance(p, dict), 'Missing art-direction parameters')
    require(all(isinstance(p.get(k), (int, float)) and not isinstance(p[k], bool) and
                math.isfinite(p[k]) and .1 <= p[k] <= 60 for k in ('width', 'depth', 'height')),
            'Finite art-direction bounds in [0.1, 60] required')
    require(type(p.get('seed')) is int and 0 <= p['seed'] <= 9007199254740991, 'Invalid seed')
    require(isinstance(p.get('palette'), list) and 4 <= len(p['palette']) <= 16 and
            all(isinstance(v, str) and re.fullmatch(r'#[0-9a-fA-F]{6}', v) for v in p['palette']),
            'Invalid inherited palette metadata')
    year = record.get('builtYear')
    if year is not None:
        require(type(year) is int and -10000 < year <= datetime.datetime.now(datetime.timezone.utc).year, 'Invalid construction year')
    if record['country'] in RESTRICTED and record.get('category') == 'building':
        require(year is not None and year < 1950, 'Restricted building requires sourced pre-1950 date')
    form = (record['generator'], p.get('composition'))
    categories = {'market': {'market'}, 'waterfront': {'natural-feature'},
                  'lattice-tower': {'building', 'monument'},
                  'retail-building': {'building'}, 'landscape': {'natural-feature'},
                  'landmark': {'building', 'monument'}, 'bridge': {'building'}}
    require(record['generator'] in categories and record['category'] in categories[record['generator']],
            'No physical category mapping for this generator')
    if profile == 'accra-v5-exact':
        require(record['city'] == 'accra' and record['name'] == 'Makola Market' and
                form == ('market', None) and region == 'gulf-guinea' and
                cloth == BASE_CLOTH_PALETTE, 'Compatibility profile is only the frozen Makola fragment')
        for path, expected in COMPATIBILITY_PINS.items():
            require(digest(ROOT / path) == expected, 'Compatibility dependency changed: ' + path)
    else:
        require(profile == 'physical-v1' and form in SUPPORTED,
                'Unsupported physical form; no legacy or generic fallback')
    return cloth, form


def place(objects, x=0, y=0, z=0, angle=0, scale=1):
    """Rigid placement plus one uniform local size choice; UVs stay authored."""
    for obj in objects:
        px, py, pz = obj.location
        obj.location = (x + scale * (px * math.cos(angle) - py * math.sin(angle)),
                        y + scale * (px * math.sin(angle) + py * math.cos(angle)), z + scale * pz)
        obj.rotation_euler.z += angle
        obj.scale *= scale
    return objects


def counter(material, x, y, angle=0, width=1.1, depth=.76):
    return court_counter(material, x, y, angle=angle, width=width, depth=depth)


def neutral_design(record, style):
    """Allocate coarse original structures; style metadata is art direction, not local evidence."""
    options = list(itertools.product(('arcade', 'veranda', 'hall', 'stepped-shops'),
                                     ('single', 'return', 'court', 'paired'),
                                     (2, 3), (1.25, 1.65, 2.05), (0.0, .40)))
    rows = json.loads(REGISTRY.read_text())
    rows = [r for r in rows if r['generator'] == 'market' and
            r['parameters'].get('composition') == 'neutral-trade']
    require(len(rows) <= len(options), 'Neutral design vocabulary exhausted; explicit expansion required')
    require(len({r['city'] for r in rows}) == len(rows), 'Duplicate canonical neutral city')
    occupied, selected = set(), None
    for row in sorted(rows, key=lambda r: r['city']):
        key = f"physical-neutral-v2:{row['city']}:{row['parameters']['seed']}"
        initial = int(hashlib.sha256(key.encode()).hexdigest(), 16) % len(options)
        index = next((i for step in range(len(options))
                      if (i := (initial + step) % len(options)) not in occupied), None)
        require(index is not None, 'No distinct neutral composition available')
        occupied.add(index)
        if row['city'] == record['city']:
            require(row['parameters']['seed'] == record['parameters']['seed'], 'Canonical seed mismatch')
            structure, layout, bays, bay_width, elevation = options[index]
            selected = {'version': 2, 'structure': structure, 'layout': layout,
                        'baysPerLongRow': bays, 'bayWidth': bay_width,
                        'roofHeight': style['canopyHeight'] + elevation,
                        'roofForm': style['roof'], 'designIndex': index,
                        'seed': row['parameters']['seed'], 'allocationKey': key,
                        'registrySha256': digest(REGISTRY),
                        'basis': 'Original empty trading fragment; not observed local architecture or goods'}
    require(selected is not None, 'City is not an authoritative neutral market')
    return selected


def neutral_roof(c, width, depth, height, form, cell, hip=False):
    """Closed roof with real fascia depth; pitched and hipped volumes cast usable eave shadows."""
    if form == 'flat':
        c.box((width, depth, .16), (0, 0, height + .08), cell)
        return
    require(form == 'gable', 'Unknown neutral roof form')
    w, d = width/2, depth/2
    inset = min(.65, width*.20) if hip else 0
    rise = .65 if hip else .55
    top = [(-w, -d, height), (w, -d, height), (w, d, height), (-w, d, height),
           (-w+inset, 0, height+rise), (w-inset, 0, height+rise)]
    vertices = top + [(x, y, z-.10) for x, y, z in top]
    faces = [(0, 1, 5, 4), (2, 3, 4, 5)]
    if hip:
        faces += [(1, 2, 5), (3, 0, 4)]
    faces += [tuple(i+6 for i in reversed(face)) for face in faces[:]]
    rim = [0, 1, 2, 3] if hip else [0, 1, 5, 2, 3, 4]
    faces += [(a, a+6, b+6, b) for a, b in zip(rim, rim[1:]+rim[:1])]
    c.add(mesh_object('market-roof-shell', vertices, faces, c.material), cell)
    c.box((width-2*inset+.10, .12, .10), (0, 0, height+rise), cell)


def neutral_arch(c, x, y, width, spring, top, depth):
    """A closed masonry spandrel around an open segmented arch, never a painted opening."""
    radius = width/2
    points = [(x+radius*math.cos(math.pi-i*math.pi/8),
               spring+radius*.55*math.sin(math.pi-i*math.pi/8)) for i in range(9)]
    for (xa, za), (xb, zb) in zip(points, points[1:]):
        vertices = [(xx, yy, zz) for yy in (y-depth/2, y+depth/2)
                    for xx, zz in ((xa, za), (xb, zb), (xb, top), (xa, top))]
        faces = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1),
                 (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
        c.add(mesh_object('market-arch-spandrel', vertices, faces, c.material), CELLS['mineral'])


def neutral_counter(c, x, y, width, kind):
    """Empty fitted trading furniture; no goods are inferred from a factual market identity."""
    if kind in ('arcade', 'stepped-shops'):
        c.box((width, .60, .72), (x, y, .48), CELLS['mineral'])
        c.box((width+.12, .72, .09), (x, y, .885), CELLS['timber'])
        c.box((width-.15, .035, .42), (x, y-.315, .49), CELLS['dark-timber'])
    else:
        for dx in (-width*.40, width*.40):
            for dy in (-.24, .24):
                c.box((.08, .08, .76), (x+dx, y+dy, .50), CELLS['dark-timber'])
            c.box((.08, .58, .09), (x+dx, y, .37), CELLS['dark-timber'])
        for i in range(3):
            c.box((width, .195, .055), (x, y+(i-1)*.205, .905), CELLS['timber'])
        c.box((width, .06, .12), (x, y-.26, .80), CELLS['dark-timber'])


def neutral_row(material, design, bays):
    """Four structural systems, with substantial walls, openings, supports and roof volumes."""
    from construction import CLOTH_CELLS
    kind, width = design['structure'], design['bayWidth']
    height, roof = design['roofHeight'], design['roofForm']
    length = bays*width
    c = Construction(material)
    c.box((length+.28, 2.05, .12), (0, 0, .06), CELLS['mineral'])
    centres = [(i-(bays-1)/2)*width for i in range(bays)]
    edges = [(i-bays/2)*width for i in range(bays+1)]
    if kind == 'arcade':
        for x in edges:
            c.box((.22, 1.62, height-.12), (x, .08, (height+.12)/2), CELLS['mineral'])
            c.box((.34, .36, .20), (x, -.73, .22), CELLS['mineral'])
            c.box((.34, .38, .12), (x, -.73, height-.48), CELLS['mineral'])
        c.box((length, .16, height-.12), (0, .83, (height+.12)/2), CELLS['mineral'])
        for x in centres:
            neutral_arch(c, x, -.73, width-.22, height-.80, height, .24)
            neutral_counter(c, x, -.10, width-.42, kind)
        c.box((length+.32, 1.92, .14), (0, .02, height+.04), CELLS['mineral'])
        neutral_roof(c, length+.45, 2.12, height+.14, roof, CELLS['dark-metal'])
    elif kind == 'veranda':
        # A recessed timber shop range and a deep front gallery share one roof.
        c.box((length, .10, height-.12), (0, .82, (height+.12)/2), CELLS['timber'])
        for x in edges:
            c.box((.10, 1.12, height-.12), (x, .31, (height+.12)/2), CELLS['timber'])
            c.box((.14, .14, height-.12), (x, -.79, (height+.12)/2), CELLS['dark-timber'])
            c.box((.27, .27, .24), (x, -.79, .24), CELLS['mineral'])
            for sign in (-1, 1):
                if -length/2 < x+sign*.25 < length/2:
                    c.bar((x, -.79, height-.48), (x+sign*.30, -.79, height-.10), .08, CELLS['dark-timber'])
        c.box((length+.20, .16, .18), (0, -.79, height-.09), CELLS['dark-timber'])
        for x in centres:
            neutral_counter(c, x, .17, width-.30, kind)
            # A physical short shade valance, using the existing regional textile cell.
            c.box((width-.18, .035, .28), (x, -.81, height-.33), CLOTH_CELLS['cool_textile'])
        neutral_roof(c, length+.55, 2.30, height, roof, CELLS['metal'], hip=True)
    elif kind == 'hall':
        # Open-sided hall: deeper span, exposed trusses and central trading islands.
        for x in edges:
            for y in (-.82, .82):
                c.box((.13, .13, height-.12), (x, y, (height+.12)/2), CELLS['dark-metal'])
                c.box((.28, .28, .22), (x, y, .23), CELLS['mineral'])
            c.box((.10, 1.80, .12), (x, 0, height-.10), CELLS['dark-metal'])
            if roof == 'gable':
                for y in (-.82, .82):
                    c.bar((x, y, height-.08), (x, 0, height+.40), .075, CELLS['dark-metal'])
        for y in (-.82, .82):
            c.box((length+.18, .12, .16), (0, y, height-.08), CELLS['dark-metal'])
        for x in centres:
            neutral_counter(c, x, 0, width-.35, kind)
        neutral_roof(c, length+.48, 2.30, height, roof, CELLS['metal'])
        # Raised ventilator has supported opaque louvres, not fake glazing.
        c.box((length*.62, .42, .32), (0, 0, height+(.66 if roof == 'gable' else .32)), CELLS['dark-timber'])
        c.box((length*.62+.18, .64, .10), (0, 0, height+(.87 if roof == 'gable' else .53)), CELLS['metal'])
    elif kind == 'stepped-shops':
        for i, x in enumerate(centres):
            h = height + i*.32
            bay = Construction(material)
            bay.box((width-.05, .18, h-.12), (0, .79, (h+.12)/2), CELLS['mineral'])
            for dx in (-width/2+.09, width/2-.09):
                bay.box((.18, 1.66, h-.12), (dx, 0, (h+.12)/2), CELLS['mineral'])
            bay.box((width, .22, .40), (0, -.79, h-.20), CELLS['mineral'])
            bay.box((width+.14, .34, .12), (0, -.80, h+.02), CELLS['mineral'])
            bay.box((width-.40, .06, .14), (0, -.92, h-.23), CELLS['dark-timber'])
            neutral_counter(bay, 0, -.48, width-.38, kind)
            neutral_roof(bay, width+.12, 1.98, h+.12, roof, CELLS['dark-metal'])
            c.objects.extend(place(bay.objects, x))
    else:
        raise ValueError('Unknown neutral structure')
    return c.objects


def neutral_fragment(material, design):
    """Distinct building mass and circulation, with clear passages between supported ranges."""
    bays, width = design['baysPerLongRow'], design['bayWidth']
    length = bays*width
    layout = design['layout']
    if layout == 'single':
        rows = ((bays, 0, 0, 0),)
    elif layout == 'return':
        rows = ((bays, 0, 1.65, 0),
                (2, -length/2-1.50, .25-width, math.pi/2))
    elif layout == 'court':
        rows = ((bays, 0, 1.65, 0),
                (1, -length/2-1.50, .25-width/2, math.pi/2),
                (1, length/2+1.50, .25-width/2, -math.pi/2))
    elif layout == 'paired':
        rows = ((bays, -.55, 1.65, 0), (bays, .55, -1.65, math.pi))
    else:
        raise ValueError('Unknown neutral layout')
    out = []
    for count, x, y, angle in rows:
        out.extend(place(neutral_row(material, design, count), x, y, angle=angle))
    return out


def court_counter(material, x, y, angle=0, width=1.1, depth=.76):
    """Closed boards retain upper-edge chamfers without beveling every hidden lower corner."""
    c = Construction(material)
    height = .88
    for dx in (-width*.42, width*.42):
        for dy in (-depth*.38, depth*.38):
            c.box((.065, .065, height-.04), (dx, dy, (height-.04)/2), CELLS['dark-timber'])
        c.box((.06, depth, .08), (dx, 0, .26), CELLS['dark-timber'])
    board_depth, thickness, bevel = depth/4-.008, .035, .003
    section = ((-board_depth/2, -thickness/2), (board_depth/2, -thickness/2),
               (board_depth/2, thickness/2-bevel), (board_depth/2-bevel, thickness/2),
               (-board_depth/2+bevel, thickness/2), (-board_depth/2, thickness/2-bevel))
    vertices = [(end, across, up) for end in (-width/2, width/2) for across, up in section]
    faces = [tuple(reversed(range(6))), tuple(range(6,12))]
    faces += [(i, (i+1)%6, (i+1)%6+6, i+6) for i in range(6)]
    for i in range(4):
        board = c.add(mesh_object('court-counter-board', vertices, faces, material), CELLS['timber'])
        board.location = (0, -depth/2+(i+.5)*depth/4, height-thickness/2)
    for dy in (-depth*.4, depth*.4):
        c.box((width, .05, .08), (0, dy, height-.09), CELLS['dark-timber'])
    return place(c.objects, x, y, angle=angle)


def physical_market(material, composition):
    """Original illustrative circulation; neutral trade never acquires merchandise."""
    out = []
    if composition in ('neutral-trade', 'covered-lane'):
        for side in (-1, 1):
            x = side * 1.30
            frame = Construction(material)
            frame.frame(.95, 3.60, 2.35, .15)
            for dx in (-.475, .475):
                frame.box((.075, .075, 2.35), (dx, 0, 1.175), CELLS['timber'], .002)
            frame.corrugated_roof(1.30, 3.90, 2.35)
            out.extend(place(frame.objects, x))
            for y in (-1.20, 0, 1.20):
                out.extend(counter(material, x, y, angle=math.pi / 2))
            rack = Construction(material)
            for y in (-.45, .45):
                rack.box((.045, .045, 1.60), (x + side * .50, y, .80), CELLS['timber'])
            for z in (.78, 1.58):
                rack.box((.045, .95, .045), (x + side * .50, 0, z), CELLS['timber'])
            out.extend(rack.objects)
        if composition == 'covered-lane':
            # These goods are the registry's illustrative composition, not market inventory evidence.
            cloth = Construction(material)
            cloth.folded_cloth()
            out.extend(place(cloth.objects, -1.30, 0, z=.88*(1-.65), angle=math.pi / 2, scale=.65))
            vessels = Construction(material)
            for y in (-1.35, -1.07):
                vessels.cylinder(.10, .18, (1.30, y, .97), CELLS['canvas'], 10)
            out.extend(vessels.objects)
    elif composition == 'court':
        rear = Construction(material)
        rear.frame(5.0, 1.25, 2.35, .15)
        for y in (-.625, .625):
            top = 2.35-y/1.25*.15
            rear.box((.075, .075, top), (0, y, top/2), CELLS['timber'], .002)
            for side in (-1, 1):
                rear.bar((0, y, top-.40), (side*.28, y, top-.06), .045, CELLS['dark-timber'])
        rear.bar((0, -.625, 2.38), (0, .625, 2.23), .07, CELLS['dark-timber'])
        rear.corrugated_roof(5.20, 1.55, 2.35)
        out.extend(place(rear.objects, 0, 1.45))
        for x in (-1.70, 0, 1.70):
            out.extend(court_counter(material, x, 1.45, width=1.60))
        out.extend(court_counter(material, -2.25, -.15, angle=math.pi / 2, width=1.6))
        for y in (-.70, -1.24):
            out.extend(court_counter(material, .65, y, width=1.70, depth=.50))
        cloth = Construction(material)
        cloth.folded_cloth()
        out.extend(place(cloth.objects, -1.70, 1.45))
        goods = Construction(material)
        goods.produce(.30, -.77, .88, 6)
        for x in (1.45, 1.78):
            goods.cylinder(.11, .18, (x, 1.45, .97), CELLS['canvas'], 10)
        out.extend(goods.objects)
    else:
        raise ValueError('No physical market composition')
    return out


def closed_disc(c, name, points, bottom, top, cell):
    n = len(points)
    vertices = [(x, y, bottom) for x, y in points] + [(x, y, top) for x, y in points]
    faces = [tuple(reversed(range(n))), tuple(range(n, 2*n))]
    faces += [(i, (i+1) % n, (i+1) % n+n, i+n) for i in range(n)]
    return c.add(mesh_object(name, vertices, faces, c.material), cell)


def pond_basin(c, cx, rx, ry):
    """Closed earth banks with broad uneven contours and occasional exposed mineral patches."""
    n = 24
    inner, outer, crest = [], [], []
    for i in range(n):
        a = math.tau * i / n
        dx, dy = math.cos(a), math.sin(a)
        bend = 1 + .13 * math.sin(2*a + cx) + .06 * math.cos(3*a - .4*cx)
        inner.append((cx + rx * dx * bend, ry * dy * bend))
        # Keep the reviewed outer footprint, clipped corners and grounded outer rim.
        outer_index = 8*(i//6) + (0, 1, 3, 4, 5, 7)[i % 6]
        outer_angle = math.tau * outer_index / 32
        ox, oy = math.cos(outer_angle), math.sin(outer_angle)
        reach = min(1.825 / max(abs(ox), 1e-12), 2.20 / max(abs(oy), 1e-12))
        outer.append((cx + ox * reach, oy * reach))
        ix, iy = inner[-1]
        vx, vy = outer[-1][0] - ix, outer[-1][1] - iy
        distance = math.hypot(vx, vy)
        width = min(.14 + .30 * (.5 + .5 * math.sin(2*a - .6*cx)), .65 * distance)
        crest.append((ix + vx * width / distance, iy + vy * width / distance,
                      .195 + .035 * math.sin(3*a + .8*cx) + .01 * math.cos(a - .4*cx)))
    # The slope toe and the closed water volume share the same irregular shoreline.
    vertices = ([(x, y, .18) for x, y in outer] + crest +
                [(x, y, 0) for x, y in outer] + [(x, y, .13) for x, y in inner])
    faces = []
    for i in range(n):
        j = (i+1) % n
        faces.extend([(i, j, n+j, n+i), (i, 2*n+i, 2*n+j, j),
                      (n+i, n+j, 3*n+j, 3*n+i), (2*n+i, 3*n+i, 3*n+j, 2*n+j)])
    bank = c.add(mesh_object('earthen-pond-bank', vertices, faces, c.material), CELLS['earth'])
    # Most of the shore remains earth; three short sectors expose existing mineral colour.
    mineral_sectors = {3, 4, 15} if cx < 0 else {8, 18, 19}
    shift = ((CELLS['mineral'] % 4 - CELLS['earth'] % 4) / 4,
             (CELLS['mineral'] // 4 - CELLS['earth'] // 4) / 4)
    uv = bank.data.uv_layers.active
    for face in bank.data.polygons:
        if face.index % 4 == 2 and face.index // 4 in mineral_sectors:
            for loop in face.loop_indices:
                uv.data[loop].uv.x += shift[0]
                uv.data[loop].uv.y += shift[1]
    closed_disc(c, 'opaque-pond-water', inner, .09, .13, CELLS['pond-water'])


def pond_tree(material):
    """Keep the closed leaf shape while sharing attributes across each curved blade side."""
    objects = broadleaf_tree(material)
    leaves = 0
    for obj in objects:
        if not obj.name.startswith('closed-leaf-blade'):
            continue
        old = obj.data
        require(len(old.vertices) == 8 and len(old.polygons) == 12,
                'Expected the reviewed six-edge closed broadleaf blade')
        points = [v.co.copy() for v in old.vertices]
        expected = [(6, i, (i+1) % 6) for i in range(6)]
        expected += [(7, (i+1) % 6, i) for i in range(6)]
        require([tuple(p.vertices) for p in old.polygons] == expected,
                'Unexpected leaf topology; refusing an implicit simplification')
        # The coincident rim stays sharp; upper/lower fans each share smooth normals and UVs.
        vertices = points[:6] + [points[6]] + points[:6] + [points[7]]
        faces = expected[:6] + [(13, 7+(i+1) % 6, 7+i) for i in range(6)]
        mesh = bpy.data.meshes.new('closed-leaf-shared-sides')
        mesh.from_pydata(vertices, [], faces)
        mesh.update()
        mesh.materials.append(material)
        uv = mesh.uv_layers.new(name='UVMap')
        require((points[3]-points[0]).length > 0 and
                (points[2]-points[4]).length > 0, 'Collapsed leaf chart')
        # Construction's six-point outline: U follows root to tip; V follows signed blade width.
        blade_chart = ((0, .5), (.28, .89), (.62, 1), (1, .5),
                       (.62, 0), (.28, .11), (.46, .5))
        chart = blade_chart + blade_chart
        cell = CELLS['foliage']
        for face in mesh.polygons:
            face.use_smooth = True
            for loop in face.loop_indices:
                coords = chart[mesh.loops[loop].vertex_index]
                uv.data[loop].uv = tuple(((cell % 4 if i == 0 else cell // 4)*256 +
                                         12 + coords[i]*232)/1024 for i in range(2))
        obj.data = mesh
        if old.users == 0:
            bpy.data.meshes.remove(old)
        leaves += 1
    require(leaves == 84, 'Expected the reviewed tree leaf count')
    return objects


def paired_ponds(material):
    """Two original basins, a marsh island and a wooded/open contrast, without a connecting channel."""
    c = Construction(material)
    pond_basin(c, -1.825, 1.12, 1.43)
    pond_basin(c, 1.825, 1.20, 1.62)
    island = [(-1.825 + .30*math.cos(i*math.tau/16), .22 + .24*math.sin(i*math.tau/16))
              for i in range(16)]
    closed_disc(c, 'marsh-island', island, .115, .18, CELLS['earth'])
    # Low generic island growth, not an asserted species or botanical reconstruction.
    for x in (-1.93, -1.77):
        c.cylinder(.018, .20, (x, .22, .28), CELLS['foliage'], 6)
    out = c.objects
    for x, y, size in ((-3.08, 1.52, .43), (-3.06, -1.44, .38)):
        out.extend(place(pond_tree(material), x, y, .16, scale=size))
    return out


def lattice_footing(c, x, y):
    """Closed concrete body with full ground contact and a twelve-millimetre upper chamfer."""
    rings = ((.215, -.10), (.215, .188-.10), (.203, .20-.10))
    vertices = [(sx*half, sy*half, z) for half, z in rings
                for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    faces = [(3, 2, 1, 0), (8, 9, 10, 11)]
    for ring in range(2):
        for i in range(4):
            j = (i+1) % 4
            faces.append((ring*4+i, ring*4+j, (ring+1)*4+j, (ring+1)*4+i))
    obj = c.add(mesh_object('closed-upper-chamfer-footing', vertices, faces, c.material),
                CELLS['mineral'])
    obj.location = (x, y, .10)
    return obj


def lattice_tower(material):
    """Four closed angle-section legs, supported arches and structural decks; daytime only."""
    c = Construction(material)
    levels = ((.16, 2.16), (1.50, 1.93), (3.20, 1.40), (4.50, .99),
              (5.70, .69), (7.10, .48), (8.50, .32), (9.80, .19), (10.95, .105))
    metal = CELLS['dark-metal']
    for sx, sy in ((-1,-1), (-1,1), (1,-1), (1,1)):
        lattice_footing(c, sx*2.16, sy*2.16)
    for level, ((za, ra), (zb, rb)) in enumerate(zip(levels, levels[1:])):
        thickness = .035 if za < 3.20 else .018
        flange = .15 if za < 3.20 else .075
        for sx, sy in ((-1,-1), (-1,1), (1,-1), (1,1)):
            a, b = Vector((sx*ra, sy*ra, za)), Vector((sx*rb, sy*rb, zb))
            axis = (b-a).normalized()
            across = axis.cross(Vector((0,0,1))).normalized()
            other = axis.cross(across).normalized()
            # Two closed flat members form an angle section; joints overlap at structural levels.
            for horizontal, vertical in ((flange, thickness), (thickness, flange)):
                offset = (across if horizontal == flange else other) * ((flange-thickness)/2)
                obj = c.box((horizontal, vertical, (b-a).length+.04), (a+b)/2+offset, metal)
                obj.rotation_euler = Matrix((across, other, axis)).transposed().to_euler()
        if level >= 2:
            for side in (-1,1):
                for swap in (False, True):
                    def point(x,y,z):
                        return (y,x,z) if swap else (x,y,z)
                    c.bar(point(-ra,side*ra,za), point(rb,side*rb,zb), .037, metal)
                    c.bar(point(ra,side*ra,za), point(-rb,side*rb,zb), .037, metal)
                    c.bar(point(-ra,side*ra,za), point(ra,side*ra,za), .045, metal)
    for side in (-1,1):
        for swap in (False,True):
            def point(x,y,z):
                return (y,x,z) if swap else (x,y,z)
            arc = []
            for i in range(13):
                a = math.pi*i/12
                z = .30 + 2.24*math.sin(a)
                y = side*(2.16-(z-.16)*(.76/3.04))
                arc.append(point(2.12*math.cos(a),y,z))
            for a,b in zip(arc,arc[1:]):
                c.bar(a,b,.10,metal)
            for i in (4,6,8):
                a = arc[i]
                top = (side*1.40,a[1],3.20) if swap else (a[0],side*1.40,3.20)
                c.bar(a,top,.045,metal)
    for z,r in ((3.20,1.50),(5.70,.79),(10.95,.23)):
        c.box((2*r,2*r,.11),(0,0,z),metal)
        for side in (-1,1):
            c.bar((-r,side*r,z+.20),(r,side*r,z+.20),.024,CELLS['metal'])
            c.bar((side*r,-r,z+.20),(side*r,r,z+.20),.024,CELLS['metal'])
            for t in (-.65,.65):
                c.bar((t*r,side*r,z),(t*r,side*r,z+.20),.022,metal)
                c.bar((side*r,t*r,z),(side*r,t*r,z+.20),.022,metal)
    c.bar((0,0,10.95),(0,0,11.85),.045,metal)
    return c.objects


def fit_once(obj, parameters, compatibility=False):
    """Centre and ground; apply one uniform shrink-to-fit only, never three independent scales."""
    bpy.context.view_layer.update()
    values = [obj.matrix_world @ v.co for v in obj.data.vertices]
    low = [min(v[i] for v in values) for i in range(3)]
    high = [max(v[i] for v in values) for i in range(3)]
    extents = [high[i]-low[i] for i in range(3)]
    require(all(math.isfinite(v) and v > 0 for v in extents), 'Collapsed physical geometry')
    envelope = [parameters[k] for k in ('width','depth','height')]
    scale = min(1.0, *(envelope[i]/extents[i] for i in range(3)))
    if compatibility:
        require(scale == 1.0, 'Frozen fragment exceeds the declared art envelope; refusing rescale')
    else:
        centre = Vector(((low[0]+high[0])/2, (low[1]+high[1])/2, low[2]))
        for vertex, point in zip(obj.data.vertices, values):
            vertex.co = (point-centre)*scale
        obj.matrix_world = Matrix.Identity(4)
        obj.data.update()
    return {'nativeBlenderXYZExtents': extents, 'declaredWidthDepthHeightEnvelope': envelope,
            'uniformScale': scale, 'upscaleAllowed': False, 'runtimeConversionApplied': False,
            'dimensionBasis': 'Original art bounds, not surveyed dimensions',
            'compatibilityGeometryUntouched': compatibility}


def export_physical_hero(record, style, region, profile, out, receipt_path):
    require(Path(out).resolve() != Path(receipt_path).resolve() and
            not Path(out).exists() and not Path(receipt_path).exists(), 'Distinct fresh output and receipt paths required')
    cloth, form = checked_record(record, style, region, profile)
    design = neutral_design(record, style) if form == ('market', 'neutral-trade') else None
    common.reset()
    compatibility = profile == 'accra-v5-exact'
    material = painted_atlas() if compatibility else painted_atlas(cloth)
    if compatibility:
        obj = finish_sample('accra', market_hero(material), material, 4000)
    else:
        if form[0] == 'market':
            objects = neutral_fragment(material, design) if design is not None else physical_market(material, form[1])
        elif form == ('waterfront', 'paired-ponds'):
            objects = paired_ponds(material)
        elif form[0] in ('landscape', 'waterfront'):
            objects = build_landscape(material, record, CELLS)
        elif form[0] == 'retail-building':
            objects = build_retail(material, record, CELLS)
        elif form[0] in ('landmark', 'bridge'):
            objects = build_landmark(material, record, LANDMARK_CELLS)
        elif form[0] == 'lattice-tower':
            objects = lattice_tower(material)
        else:
            raise ValueError('Physical hero dispatch incomplete')
        obj = finish_sample(record['city'], objects, material, 3999)
    scale = fit_once(obj, record['parameters'], compatibility)
    triangles = common.triangles(obj)
    require(triangles < 4000, 'Physical hero must remain below 4000 triangles')
    require(len(obj.data.materials) == 1 and obj.data.materials[0] == material and
            all(p.material_index == 0 for p in obj.data.polygons), 'One shared atlas material required')
    require(len(obj.data.uv_layers) == 1 and all(math.isfinite(v) and 0 <= v <= 1
            for loop in obj.data.uv_layers[0].data for v in loop.uv), 'Finite bounded authored UVs required')
    Path(out).parent.mkdir(parents=True,exist_ok=True)
    common.export(str(out), [obj])
    raw_hash = digest(out)
    paths = [Path(__file__), REGISTRY, ROOT/f'scripts/scene-factory/styles/{region}.json',
             ROOT/'scripts/scene-factory/blender/construction.py',
             ROOT/'scripts/scene-factory/blender/kit.py', ROOT/'scripts/scene-factory/blender/shared.py',
             ROOT/'scripts/scene-factory/blender/physical_landscape.py',
             ROOT/'scripts/scene-factory/blender/physical_retail.py',
             ROOT/'scripts/scene-factory/blender/physical_landmarks.py',
             ROOT/'scripts/assets/blender/common.py']
    receipt = {'schema':'physical-hero-raw-export','version':1,'city':record['city'],'profile':profile,
               'form':list(form),'region':region,'record':record,'style':style,'cloth':cloth,
               'sourcePins':{str(p.relative_to(ROOT)):digest(p) for p in paths},
               'triangles':triangles,'scale':scale,'rawSha256':raw_hash,'neutralDesign':design,
               'compatibilityRawExact':raw_hash == ACCRA_RAW_SHA256 if compatibility else None,
               'status':'Raw export only; strict final prepare/atlas binding/60000-byte gates and visual review pending'}
    Path(receipt_path).parent.mkdir(parents=True,exist_ok=True)
    Path(receipt_path).write_text(json.dumps(receipt,indent=2)+'\n')
    if compatibility:
        require(raw_hash == ACCRA_RAW_SHA256, 'Frozen Accra raw bytes drifted; retained output and receipt, stop')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--record',required=True)
    parser.add_argument('--style',required=True)
    parser.add_argument('--region',required=True,choices=REGIONS)
    parser.add_argument('--profile',required=True,choices=('physical-v1','accra-v5-exact'))
    parser.add_argument('--out',required=True)
    parser.add_argument('--receipt',required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    export_physical_hero(json.loads(Path(args.record).read_text()),
                         json.loads(Path(args.style).read_text()), args.region, args.profile,
                         args.out, args.receipt)


if __name__ == '__main__':
    main()
