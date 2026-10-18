"""Original physical landmark fragments, never surveyed replicas or portrait sculpture."""
import hashlib
import json
import math
from pathlib import Path

from construction import Construction
from shared import mesh_object

REGISTRY = Path(__file__).resolve().parents[3] / 'scripts/scene-factory/heroes.json'
REGISTRY_SHA256 = '367b3dff2930be447cfffc21e5d49ad86bb614e08c3cea43a9b2a4c07c25d1f1'
CELLS = {'timber': 0, 'dark-timber': 1, 'canvas': 2, 'metal': 4,
         'pond-water': 5, 'foliage': 7, 'mineral': 8, 'earth': 12,
         'dark-metal': 14, 'ochre': 6}
FORMS = frozenset(('three-figures', 'terraced-fort', 'masonry-ring-tower',
    'four-tower-castle', 'sphere-towers', 'round-tower-fort', 'lotus-stupa',
    'terraced-stairs', 'courtyard-mosque', 'twin-bell-cathedral', 'pentagonal-fort',
    'red-fort-pavilions', 'doric-temple', 'guildhall-square', 'civic-pavilions',
    'observation-tower', 'flame-obelisk', 'borehole-site', 'domed-basilica',
    'hexagonal-clock', 'bell-tower-church', 'verandah-house', 'latte-stones',
    'cenotaph', 'barracks-court', 'clock-fort', 'inclined-stairs', 'gable-store',
    'octagonal-lighthouse'))
BRIDGES = frozenset(('stone-arches', 'pontoon'))
RESTRICTED = frozenset(('ng', 'gh', 'fr', 'gf', 'gp', 'mq', 're', 'yt', 'bl', 'mf',
                       'pm', 'pf', 'nc', 'wf', 'tf', 'cp'))


def landmark_design(record):
    raw = REGISTRY.read_bytes()
    if hashlib.sha256(raw).hexdigest() != REGISTRY_SHA256:
        raise ValueError('Landmarks require the reviewed canonical registry')
    rows = json.loads(raw)
    matches = [r for r in rows if r['city'] == record['city']]
    if (len(matches) != 1 or
            {k: v for k, v in record.items() if k != 'surface'} !=
            {k: v for k, v in matches[0].items() if k != 'surface'}):
        raise ValueError('Landmark record differs from canonical facts')
    form = record['parameters']['composition']
    if form == 'civic-pavilions':
        pair = sorted((r for r in rows if r['generator'] == 'landmark' and
                       r['parameters'].get('composition') == form), key=lambda r:r['city'])
        if len(pair) != 2:
            raise ValueError('Expected exactly two reviewed civic compositions')
        first = int(hashlib.sha256(f"civic-v1:{pair[0]['city']}:{pair[0]['parameters']['seed']}".encode()).hexdigest(), 16) % 2
        return first if record['city'] == pair[0]['city'] else 1-first
    # Single-record forms need no artificial perturbations to establish an identity.
    return None


def _box(c, size, at, cell):
    if any(not math.isfinite(v) or v <= 0 for v in size):
        raise ValueError('Positive physical member dimensions required')
    return c.box(size, at, cell)


def _tier(c, width, depth, base, height, cell, inset=.035):
    """Closed square course with a supported shoulder and an upper chamfer."""
    vertices = [(x*w/2,y*d/2,z) for w,d,z in
                ((width,depth,base),(width,depth,base+height*.72),
                 (width-2*inset,depth-2*inset,base+height))
                for x,y in ((-1,-1),(1,-1),(1,1),(-1,1))]
    faces=[(3,2,1,0),(8,9,10,11)]
    for ring in range(2):
        for i in range(4):
            j=(i+1)%4;faces.append((ring*4+i,ring*4+j,(ring+1)*4+j,(ring+1)*4+i))
    return c.add(mesh_object('chamfered-masonry-course',vertices,faces,c.material),cell)


def _facade(c,width,height,base,x,y,cells,bays=None,door=True):
    """Structural piers, sill/lintel masses and closed inset panels share real joins."""
    count=bays or max(1,min(5,int(width/1.05)))
    step=width/count;pier=.12;opening=step-pier;lintel=.16
    for k in range(count+1):
        _box(c,(pier,.22,height),(x-width/2+k*step,y+.04,base+height/2),cells['mineral'])
    for k in range(count):
        centre=x-width/2+(k+.5)*step
        is_door=door and k==count//2
        bottom=base if is_door else base+height*.32
        top=base+min(1.96,height-.18) if is_door else base+height*.82
        if bottom>base:_box(c,(opening,.22,bottom-base),(centre,y+.04,(bottom+base)/2),cells['mineral'])
        _box(c,(opening,.22,base+height-top),(centre,y+.04,(top+base+height)/2),cells['mineral'])
        _recessed_bay(c,centre,y,bottom,opening,top-bottom,0,cells,
                      panel=cells['dark-timber'] if is_door else cells['dark-metal'],divided=not is_door)
        _box(c,(opening+.06,.28,.075),(centre,y-.015,bottom+.0375),cells['mineral'])


def _move(objects, x=0, y=0, angle=0):
    for obj in objects:
        a, b, z = obj.location
        obj.location = (x+a*math.cos(angle)-b*math.sin(angle),
                        y+a*math.sin(angle)+b*math.cos(angle), z)
        obj.rotation_euler.z += angle


def _extrude(c, name, profile, depth, cell, x=0, y=0, angle=0):
    """Closed extrusion of a simple X/Z section, including concave arch openings."""
    area = sum(a*d-c*b for (a,b),(c,d) in zip(profile,profile[1:]+profile[:1]))
    if area < 0:
        profile = list(reversed(profile))
    vertices = [(a, b, z) for b in (-depth/2, depth/2) for a, z in profile]
    n = len(profile)
    faces = [tuple(range(n)), tuple(range(2*n-1, n-1, -1))]
    faces.extend((i, i+n, (i+1)%n+n, (i+1)%n) for i in range(n))
    obj = c.add(mesh_object(name, vertices, faces, c.material), cell)
    _move([obj], x, y, angle)
    return obj


def _lathe(c, name, profile, at, cell, sides=12, bands=None, smooth=True):
    """Closed radial surfaces with shared cylindrical charts and separate planar caps."""
    vertices, rings, faces, charts, materials, soft = [], [], [], [], [], []
    for p in profile:
        z, radius = p[:2]
        dx, dy = p[2:] if len(p) == 4 else (0, 0)
        ring = []
        for k in range(sides if radius else 1):
            a = math.tau*k/sides
            ring.append(len(vertices))
            vertices.append((at[0]+dx+radius*math.cos(a), at[1]+dy+radius*math.sin(a), z))
        rings.append(ring)
    for j, (lower, upper) in enumerate(zip(rings, rings[1:])):
        for k in range(sides):
            n = (k+1)%sides
            u, v, a, b = k/sides, (k+1)/sides, j/(len(rings)-1), (j+1)/(len(rings)-1)
            if len(lower) == 1:
                face, chart = (lower[0], upper[n], upper[k]), (((u+v)/2,a),(v,b),(u,b))
            elif len(upper) == 1:
                face, chart = (lower[k], lower[n], upper[0]), ((u,a),(v,a),((u+v)/2,b))
            else:
                face, chart = (lower[k],lower[n],upper[n],upper[k]), ((u,a),(v,a),(v,b),(u,b))
            faces.append(face);charts.append(chart);materials.append(bands[j] if bands else cell);soft.append(smooth)
    for index, reverse in ((0, True), (len(rings)-1, False)):
        if len(rings[index]) > 1:
            order = list(reversed(range(sides))) if reverse else list(range(sides))
            faces.append(tuple(rings[index][k] for k in order))
            charts.append(tuple((.5+.45*math.cos(math.tau*k/sides), .5+.45*math.sin(math.tau*k/sides)) for k in order))
            materials.append(cell);soft.append(False)
    obj = mesh_object(name, vertices, faces, c.material)
    uv = obj.data.uv_layers.new(name='UVMap')
    for poly, chart, role, sm in zip(obj.data.polygons, charts, materials, soft):
        poly.use_smooth = sm
        for loop, (u,v) in zip(poly.loop_indices, chart):
            uv.data[loop].uv = ((role%4*256+12+232*u)/1024, (role//4*256+12+232*v)/1024)
    c.objects.append(obj)
    return obj


def _dome(c, x, y, base, radius, cell):
    crown = .12
    angle = math.acos(crown/radius)
    profile = [(base+radius*math.sin(k*angle/5), radius*math.cos(k*angle/5)) for k in range(6)]
    _lathe(c, 'truncated-dome', profile, (x,y), cell, 16)
    return profile[-1][0]


def _sphere(c, x, y, z, radius, cell):
    return _lathe(c, 'sphere', [(z+radius*math.sin(-math.pi/2+k*math.pi/8),
                    radius*math.cos(-math.pi/2+k*math.pi/8) if 0<k<8 else 0)
                    for k in range(9)], (x,y), cell, 16)


def _arch(c, width, depth, height, base, cell, x=0, y=0, radius=.55, spring=1.55, angle=0):
    if radius*2 >= width or spring+radius >= height:
        raise ValueError('Arch needs supporting piers and masonry above its crown')
    # The extrusion normalizes winding; the opening reaches the supporting floor.
    profile = [(-width/2,base),(-width/2,base+height),(width/2,base+height),
               (width/2,base),(radius,base),(radius,base+spring)]
    profile += [(radius*math.cos(k*math.pi/10),base+spring+radius*math.sin(k*math.pi/10)) for k in range(1,11)]
    profile.append((-radius,base))
    return _extrude(c, 'vaulted-masonry', profile, depth, cell, x,y,angle)


def _roof(c, width, depth, base, rise, cell, x=0, y=0, hip=False):
    if not hip:
        return _extrude(c, 'pitched-roof', [(-width/2,base),(0,base+rise),(width/2,base)], depth, cell,x,y)
    vertices = [(-width/2,-depth/2,base),(width/2,-depth/2,base),
                (width/2,depth/2,base),(-width/2,depth/2,base),
                (0,-depth*.22,base+rise),(0,depth*.22,base+rise)]
    faces = [(0,3,2,1),(0,1,4),(1,2,5,4),(2,3,5),(3,0,4,5)]
    obj = c.add(mesh_object('hipped-roof',vertices,faces,c.material),cell)
    _move([obj],x,y);return obj


def _hall(c, width, depth, base, height, x, y, cells, rise=.40, hip=False):
    m=cells['mineral'];wall=.18
    _tier(c,width+.08,depth+.08,base,.12,m)
    _move([c.objects[-1]],x,y);floor=base+.12
    for side in (-1,1):
        _box(c,(wall,depth,height),(x+side*(width-wall)/2,y,floor+height/2),m)
        for bay_y in (-.24*depth,.24*depth):
            _recessed_bay(c,x+side*(width/2+.02),y+bay_y,floor+.68,
                          min(.70,depth*.30),min(1.15,height-.90),side*math.pi/2,cells)
    _box(c,(width-2*wall,wall,height),(x,y+(depth-wall)/2,floor+height/2),m)
    _facade(c,width-.18,height,floor,x,y-depth/2-.02,cells)
    _tier(c,width+.10,depth+.10,floor+height,.12,m);_move([c.objects[-1]],x,y)
    if rise:
        _roof(c,width+.12,depth+.12,floor+height+.12,rise,cells['dark-metal'],x,y,hip)
    else:
        _box(c,(width,depth,.12),(x,y,floor+height+.18),m)


def _column(c,x,y,base,height,cell):
    _tier(c,.42,.42,base,.12,cell,.025);_move([c.objects[-1]],x,y)
    _lathe(c,'supported-entasis-shaft',[(base+.12,.16),(base+height*.42,.175),
           (base+height-.23,.13)],(x,y),cell,12)
    _lathe(c,'echinus-capital',[(base+height-.23,.13),(base+height-.13,.20)],(x,y),cell,12)
    _box(c,(.42,.42,.13),(x,y,base+height-.065),cell)


def _pavilion(c,x,y,base,width,depth,cells):
    m=cells['mineral'];height=2.12
    _tier(c,width,depth,base,.10,m);_move([c.objects[-1]],x,y)
    for a in (-1,1):
        for b in (-1,1):
            _column(c,x+a*(width-.42)/2,y+b*(depth-.42)/2,base+.10,height,m)
    _tier(c,width+.06,depth+.06,base+.10+height,.12,m);_move([c.objects[-1]],x,y)
    _roof(c,width,depth,base+.22+height,.35,m,x,y,True)


def _wall_ring(c,sides,radius,base,height,cells,openings=(),small=False):
    width=2*radius*math.sin(math.pi/sides);distance=radius*math.cos(math.pi/sides)
    m=cells['mineral']
    for i in range(sides):
        a=math.tau*i/sides
        if i in openings:
            _arch(c,width,.18,height,base,m,distance*math.cos(a),distance*math.sin(a),
                  radius=.09 if small else .48,spring=.55 if small else 1.62,angle=a+math.pi/2)
        else:
            obj=_box(c,(width,.18,height),(0,0,base+height/2),m)
            _move([obj],distance*math.cos(a),distance*math.sin(a),a+math.pi/2)


def _display_ring(c,sides,radius,base,height,cells):
    width=2*radius*math.sin(math.pi/sides);distance=radius*math.cos(math.pi/sides)
    for i in range(sides):
        start=len(c.objects);frame=.045
        for x in (-1,1):
            _box(c,(frame,.08,height),(x*(width-frame)/2,0,base+height/2),cells['metal'])
        for z in (base+frame/2,base+height-frame/2):
            _box(c,(width-2*frame,.08,frame),(0,0,z),cells['metal'])
        _box(c,(width-2*frame,.025,height-2*frame),(0,.025,base+height/2),cells['dark-metal'])
        a=math.tau*i/sides
        _move(c.objects[start:],distance*math.cos(a),distance*math.sin(a),a+math.pi/2)


def _court(c,width,depth,height,cells):
    m=cells['mineral'];base=.12;t=.30
    _box(c,(width,depth,base),(0,0,base/2),m)
    for x in (-1,1):
        _box(c,(t,depth,height),(x*(width-t)/2,0,base+height/2),m)
    _box(c,(width-2*t,t,height),(0,(depth-t)/2,base+height/2),m)
    _arch(c,width-2*t,t,height,base,m,0,-(depth-t)/2)
    for z,h,spread in ((base,.14,.03),(base+height-.12,.18,.08)):
        for side in (-1,1):
            _box(c,(t+spread,depth,h),(side*(width-t)/2,0,z+h/2),m)
        _box(c,(width-2*t,t+spread,h),(0,(depth-t)/2,z+h/2),m)
    for side in (-1,1):
        for y in (-depth*.23,depth*.23):
            _recessed_bay(c,side*(width/2+.02),y,base+.72,.22,.65,side*math.pi/2,cells,divided=False)


def _clock_face(c,x,y,z,radius,cells):
    """A closed rim, inset unlettered dial and supported hands; no baked typography."""
    n=12;vertices=[]
    for r,depth in ((radius,-.05),(radius,.02),(radius*.80,-.035)):
        vertices.extend((x+r*math.cos(k*math.tau/n),y+depth,z+r*math.sin(k*math.tau/n)) for k in range(n))
    faces=[]
    for k in range(n):
        j=(k+1)%n;faces.extend(((k,k+n,j+n,j),(k,j,j+2*n,k+2*n)))
    faces.extend((tuple(range(2*n-1,n-1,-1)),tuple(range(2*n,3*n))))
    obj=c.add(mesh_object('closed-clock-rim-and-dial',vertices,faces,c.material),cells['dark-metal'])
    for loop in obj.data.polygons[-1].loop_indices:
        u,v=obj.data.uv_layers.active.data[loop].uv
        obj.data.uv_layers.active.data[loop].uv=((cells['mineral']%4+(u*4)%1)/4,(cells['mineral']//4+(v*4)%1)/4)
    c.bar((x,y-.044,z),(x,y-.044,z+radius*.58),.018,cells['dark-metal'])
    c.bar((x,y-.044,z),(x+radius*.44,y-.044,z-radius*.15),.018,cells['dark-metal'])


def _fort(c,form,cells):
    cells=dict(cells)
    if form in ('red-fort-pavilions','terraced-fort'):cells['mineral']=13
    m=cells['mineral']
    if form=='pentagonal-fort':
        _box(c,(6.5,5.7,.12),(0,0,.06),m)
        _wall_ring(c,5,2.38,.12,2.25,cells,openings=(3,))
        for i in (0,1,4):
            a=math.tau*i/5
            _lathe(c,'bastion',[(.12,.48),(1.88,.48)],(2.38*math.cos(a),2.38*math.sin(a)),m,10)
        _hall(c,2.0,1.5,.12,2.20,0,.55,cells,rise=.40)
        return
    width,depth=(7.4,5.4) if form=='red-fort-pavilions' else ((5.5,4.4) if form=='clock-fort' else (6.4,5.4))
    _court(c,width,depth,2.28,cells)
    if form=='four-tower-castle':
        for i,(x,y) in enumerate(((-2.65,-2.15),(2.65,-2.15),(2.65,2.15),(-2.65,2.15))):
            height=3.85 if i==0 else 3.45
            _box(c,(.95,.95,height),(x,y,.12+height/2),m)
            _roof(c,.95,.95,.12+height,.65,cells['dark-metal'],x,y,True)
    elif form=='round-tower-fort':
        for x in (-2.6,2.6):
            for y in (-2.1,2.1):
                _lathe(c,'conical-fort-tower',[(.12,.58),(3.35,.43)],(x,y),m,12)
        _box(c,(1.1,1.1,3.55),(0,1.15,.12+3.55/2),m)
    elif form=='terraced-fort':
        _box(c,(2.5,1.8,3.45),(-1.5,1.2,.12+3.45/2),m)
        _box(c,(2.1,1.8,2.70),(1.0,1.2,.12+2.70/2),m)
        for x in (-2.5,-1.75,-1.0,-.25):
            _box(c,(.30,.30,.30),(x,2.0,3.72),m)
    elif form=='red-fort-pavilions':
        for x in (-2.25,0,2.25):
            _pavilion(c,x,1.1,.12,1.65,1.55,cells)
    else:
        _box(c,(1.05,1.05,3.1),(1.8,-1.45,.12+3.1/2),m)
        start=len(c.objects);_display_ring(c,4,.62,3.22,.38,cells);_move(c.objects[start:],1.8,-1.45)
        _roof(c,1.1,1.1,3.60,.25,cells['dark-metal'],1.8,-1.45,True)
        _clock_face(c,1.8,-1.93,3.41,.14,cells)


def _recessed_bay(c,x,y,base,width,height,angle,cells,panel=None,divided=True):
    """Closed jambs and sloping reveals surround an opaque inset panel."""
    t=min(.07,width*.13,height*.13)
    outer=((-width/2,base),(width/2,base),(width/2,base+height),(-width/2,base+height))
    inner=((-width/2+t,base+t),(width/2-t,base+t),
           (width/2-t,base+height-t),(-width/2+t,base+height-t))
    vertices=[(u,d,z) for shape,d in ((outer,-.07),(outer,.07),(inner,-.07),(inner,.04)) for u,z in shape]
    faces=[(4,7,6,5)]
    for i in range(4):
        j=(i+1)%4;faces.extend(((i,i+4,j+4,j),(i,j,j+8,i+8),(i+8,j+8,j+12,i+12)))
    faces.append((12,13,14,15));obj=mesh_object('closed-recessed-bay',vertices,faces,c.material)
    uv=obj.data.uv_layers.new(name='UVMap')
    for i,(poly,face) in enumerate(zip(obj.data.polygons,faces)):
        role=(cells['dark-metal'] if panel is None else panel) if i==len(faces)-1 else cells['mineral']
        spans=[max(vertices[v][k] for v in face)-min(vertices[v][k] for v in face) for k in range(3)]
        axes=sorted(range(3),key=lambda k:spans[k],reverse=True)[:2]
        lo=[min(vertices[v][k] for v in face) for k in axes]
        for loop,v in zip(poly.loop_indices,face):
            u,w=[(vertices[v][k]-low)/max(.001,spans[k]) for k,low in zip(axes,lo)]
            span=.12 if role==cells['dark-metal'] else .85
            uv.data[loop].uv=((role%4+.08+span*u)/4,(role//4+.08+span*w)/4)
    start=len(c.objects);c.objects.append(obj)
    if divided and width>.35:
        _box(c,(.035,.055,height-2*t),(0,.0125,base+height/2),cells['dark-timber'])
        if height>.65:_box(c,(width-2*t,.055,.035),(0,.0125,base+height*.55),cells['dark-timber'])
    if panel==cells['dark-timber']:
        _box(c,(.024,.05,.13),(width*.25,.015,base+min(.95,height*.55)),cells['metal'])
    _move(c.objects[start:],x,y,angle)


def _basilica_shell(c,cells):
    """Keep the established basilica shell; its dedicated exterior bays already supply detail."""
    m=cells['mineral'];width,depth,base,height,x,y=3.4,4.6,.12,2.55,0,.45;wall=.18
    _box(c,(width,depth,.12),(x,y,base+.06),m);floor=base+.12
    for side in (-1,1):
        _box(c,(wall,depth,height),(x+side*(width-wall)/2,y,floor+height/2),m)
    _box(c,(width-2*wall,wall,height),(x,y+(depth-wall)/2,floor+height/2),m)
    _arch(c,width-2*wall,wall,height,floor,m,x,y-(depth-wall)/2,radius=.47,spring=1.63)
    _box(c,(width,depth,.12),(x,y,floor+height+.06),m)


def _church(c,form,cells):
    m=cells['mineral'];_box(c,(7.5 if form=='domed-basilica' else 5.8,6.4 if form=='domed-basilica' else 4.8,.12),(0,0,.06),m)
    if form=='domed-basilica':
        _basilica_shell(c,cells)
        for x in (-2.5,-1.55,-.65,.65,1.55,2.5):_column(c,x,-2.6,.12,2.18,m)
        _box(c,(5.5,.55,.18),(0,-2.6,2.39),m)
        _roof(c,5.5,.55,2.48,.60,m,0,-2.6)
        # Side bays have a real setback behind shallow jambs, all seated on the wall.
        for side in (-1,1):
            for y in (-.95,.45,1.85):
                _recessed_bay(c,side*1.77,y,.80,.76,1.40,side*math.pi/2,cells)
            _recessed_bay(c,side*1.04,-1.92,.68,.60,1.60,0,cells)
            for y in (-1.62,-.25,1.15,2.51):
                _box(c,(.12,.15,2.38),(side*1.73,y,1.43),m)
            _box(c,(.14,4.65,.12),(side*1.72,.45,2.72),m)
        _lathe(c,'drum-base-course',[(2.91,1.22),(3.02,1.22)],(0,.65),m,16)
        _lathe(c,'dome-drum',[(3.02,1.15),(3.50,1.15)],(0,.65),m,16)
        for k in range(8):
            a=math.tau*k/8
            _recessed_bay(c,1.205*math.cos(a),.65+1.205*math.sin(a),
                          3.10,.27,.30,a+math.pi/2,cells)
        _lathe(c,'drum-cornice',[(3.45,1.15),(3.49,1.22),(3.55,1.22)],(0,.65),m,16)
        crown = _dome(c,0,.65,3.50,1.15,cells['metal'])
        # Eight low ribs follow the actual five dome chords and terminate at its cap.
        limit=math.acos(.12/1.15)
        for k in range(8):
            a=math.tau*k/8
            points=[(1.155*math.cos(j*limit/5)*math.cos(a),
                     .65+1.155*math.cos(j*limit/5)*math.sin(a),
                     3.50+1.155*math.sin(j*limit/5)) for j in range(6)]
            for first,last in zip(points,points[1:]):c.bar(first,last,.045,m)
        _lathe(c,'lantern-foot',[(crown,.19),(crown+.09,.19)],(0,.65),m,8)
        _lathe(c,'lantern-inset',[(crown+.09,.105),(crown+.35,.105)],(0,.65),cells['dark-metal'],8)
        for k in range(4):
            a=math.tau*k/4
            _box(c,(.055,.055,.26),(.14*math.cos(a),.65+.14*math.sin(a),crown+.22),m)
        _lathe(c,'lantern-cap',[(crown+.35,.19),(crown+.41,.19),(crown+.59,0)],(0,.65),m,8)
        return
    _hall(c,3.1,4.2,.12,2.35,0,.1,cells,rise=.65)
    towers=[(-2.15,-1.55),(2.15,-1.55)] if form=='twin-bell-cathedral' else [(-2.0,-1.45)]
    for x,y in towers:
        _box(c,(1.20,1.20,2.75),(x,y,.12+2.75/2),m)
        start=len(c.objects);_wall_ring(c,4,.71,2.87,.72,cells,openings=(0,1,2,3),small=True);_move(c.objects[start:],x,y)
        _roof(c,1.22,1.22,3.59,.72,cells['dark-metal'],x,y,True)


def _civic(c,form,design,cells):
    m=cells['mineral']
    _box(c,(7.6,6.7,.12) if form=='courtyard-mosque' else (6.7,5.7,.12),(0,0,.06),m)
    if form=='civic-pavilions':
        if design==0:
            for x in (-1.6,1.6):_hall(c,2.35,3.6,.12,2.25,x,0,cells,rise=.40,hip=True)
        else:
            for x,y in ((-1.55,-1.0),(1.55,-1.0),(0,1.5)):
                _hall(c,1.85,1.85,.12,2.25,x,y,cells,rise=.40,hip=True)
    elif form=='barracks-court':
        _hall(c,6.2,1.7,.12,2.25,0,1.7,cells,rise=.40)
        for x in (-2.45,2.45):_hall(c,1.6,3.3,.12,2.25,x,-.8,cells,rise=.40)
    else:
        _hall(c,6.8,1.8,.12,2.40,0,2.35,cells,rise=.35)
        for x in (-3.05,3.05):
            for y in (-1.8,0):
                _column(c,x,y,.12,2.10,m)
            _box(c,(.50,4.0,.18),(x,-.2,2.31),m)
        for x,y in ((-3.15,2.2),(3.15,2.2),(-3.15,-2.3)):
            _lathe(c,'minaret',[(.12,.28),(2.75,.24),(2.75,.34),(2.88,.34),
                   (2.90,.22),(3.75,.22),(4.15,.16),(4.65,0)],(x,y),m,10,
                   bands=(m,m,m,m,m,m,cells['metal']))


def _house(c,form,cells):
    m=cells['mineral'];_box(c,(5.7,4.7,.12),(0,0,.06),m)
    if form=='verandah-house':
        _hall(c,5.0,2.6,.12,2.18,0,.65,cells,rise=.42,hip=True)
        for x in (-2.2,-.75,.75,2.2):
            _box(c,(.10,.10,2.10),(x,-1.70,.12+1.05),cells['timber'])
        _box(c,(5.0,.14,.12),(0,-1.70,2.28),cells['timber'])
        _box(c,(5.0,1.12,.10),(0,-1.21,2.39),cells['dark-metal'])
        for side in (-1,1):
            _box(c,(1.35,.055,.07),(side*1.53,-1.70,1.0),cells['timber'])
            for x in (side*.96,side*1.53,side*2.10):
                _box(c,(.045,.045,.78),(x,-1.70,.51),cells['timber'])
    else:
        _hall(c,5.2,4.2,.12,2.35,0,0,cells,rise=.70)


def _doric(c,cells):
    m=cells['mineral']
    for width,depth,z in ((6.6,5.6,0),(6.2,5.2,.12),(5.8,4.8,.24)):_tier(c,width,depth,z,.12,m)
    points=[(x,y) for x in (-2.4,-.8,.8,2.4) for y in (-1.9,1.9)]+[(-2.4,0),(2.4,0)]
    for x,y in points:
        # Twelve broad flutes have actual alternating radii, with restrained shaft entasis.
        vertices=[]
        for z,r in ((.36,.22),(1.38,.225),(2.66,.175)):
            vertices.extend((x+r*(1 if k%2==0 else .91)*math.cos(k*math.tau/24),
                             y+r*(1 if k%2==0 else .91)*math.sin(k*math.tau/24),z) for k in range(24))
        faces=[tuple(reversed(range(24))),tuple(range(48,72))]
        for j in range(2):
            for k in range(24):
                n=(k+1)%24;faces.append((j*24+k,j*24+n,(j+1)*24+n,(j+1)*24+k))
        c.add(mesh_object('fluted-doric-shaft',vertices,faces,c.material),m)
        _lathe(c,'doric-echinus',[(2.66,.175),(2.74,.19),(2.82,.27)],(x,y),m,12)
        _box(c,(.56,.56,.10),(x,y,2.87),m)
    for y in (-1.9,1.9):
        for width,depth,z,h in ((5.45,.52,2.92,.14),(5.55,.60,3.06,.22),(5.72,.70,3.28,.12)):
            _box(c,(width,depth,h),(0,y,z+h/2),m)
        for x in (-2.4,-1.6,-.8,0,.8,1.6,2.4):
            _box(c,(.12,.035,.19),(x,y+(-.313 if y<0 else .313),3.175),m)
        _extrude(c,'pediment-tympanum',[(-2.72,3.40),(0,3.91),(2.72,3.40)],.23,m,0,y)
        for a,b in (((-2.85,y,3.40),(0,y,3.96)),((0,y,3.96),(2.85,y,3.40))):c.bar(a,b,.10,m)
    for x in (-2.4,2.4):
        _box(c,(.52,3.28,.14),(x,0,2.99),m)
        _box(c,(.64,3.28,.28),(x,0,3.20),m)


def _stairs(c,terraced,cells):
    m=cells['mineral'];width=6.7 if terraced else 3.4;depth=5.8 if terraced else 6.5
    _tier(c,width,depth,0,.10,m)
    if terraced:
        y=-2.7;level=.10
        for flight in range(3):
            for i in range(5):
                level+=.17
                _box(c,(3.15,.28,level-.10),(0,y+.14,(level+.10)/2),m);y+=.28
            _box(c,(6.25,.38,level-.10),(0,y+.19,(level+.10)/2),m)
            for side in (-1,1):
                _tier(c,1.42,.38,level,.12,m);_move([c.objects[-1]],side*2.40,y+.19)
            y+=.38
    else:
        y0=-2.8;rise=.19;run=.28
        for i in range(20):
            top=.10+(i+1)*rise;y=y0+(i+.5)*run
            _box(c,(1.90,run,top-.10),(0,y,(top+.10)/2),m)
            for side in (-1,1):
                _box(c,(.18,run,top+.02),(side*1.08,y,(top+.22)/2),m)
                if i%4==0 or i==19:
                    _box(c,(.045,.045,.78),(side*1.08,y,top+.12+.39),cells['metal'])
        for side in (-1,1):
            c.bar((side*1.08,y0+run/2,.10+rise+.90),
                  (side*1.08,y0+19.5*run,.10+20*rise+.90),.045,cells['metal'])


def _bridge(c,form,cells):
    m=cells['mineral']
    if form=='stone-arches':
        for x in (-2.45,0,2.45):
            _arch(c,2.45,2.15,1.33,0,m,x,0,radius=.87,spring=.28)
        _box(c,(7.35,2.23,.16),(0,0,1.41),m)
        for y in (-1.0,1.0):
            _box(c,(7.35,.15,.56),(0,y,1.77),m)
            _box(c,(7.35,.23,.08),(0,y,2.09),m)
            _box(c,(7.35,.09,.065),(0,y*1.09,1.425),m)
        # Shallow independent voussoirs leave narrow joints, without a block veneer.
        for x in (-2.45,0,2.45):
            for side in (-1,1):
                for k in range(9):
                    a=k*math.pi/9+.009;b=(k+1)*math.pi/9-.009
                    profile=[(r*math.cos(t),.28+r*math.sin(t))
                             for r,t in ((.87,a),(.99,a),(.99,b),(.87,b))]
                    _extrude(c,'arch-edge-voussoir',profile,.06,m,x,side*1.085)
        for x in (-3.50,-1.225,1.225,3.50):
            for side in (-1,1):
                _box(c,(.26,.13,.30),(x,side*1.09,.15),m)
                _box(c,(.22,.10,.12),(x,side*1.09,1.27),m)
    else:
        for x in (-2.7,-.9,.9,2.7):
            # Closed boat-like eight-sided hulls, broad enough to support both deck beams.
            profile=[(-.43,.08),(-.43,.27),(-.30,.38),(.30,.38),(.43,.27),(.43,.08),(.28,0),(-.28,0)]
            _extrude(c,'pontoon-hull',profile,2.9,cells['metal'],x,0)
        for y in (-.68,.68):_box(c,(7.4,.13,.13),(0,y,.445),cells['dark-timber'])
        for i in range(25):_box(c,(7.4/25,1.85,.065),(-3.7+(i+.5)*7.4/25,0,.5425),cells['timber'])
        for y in (-.85,.85):
            for x in (-3.4,-2.05,-.7,.7,2.05,3.4):
                _box(c,(.055,.055,.85),(x,y,1.0),cells['metal'])
            _box(c,(7.0,.055,.055),(0,y,1.4525),cells['metal'])
            _box(c,(7.0,.035,.035),(0,y,1.05),cells['metal'])


def _figures(c,cells):
    m=cells['mineral'];_box(c,(5.5,3.5,.18),(0,0,.09),m)
    for x in (-1.65,0,1.65):
        _tier(c,.85,.75,.18,.22,m);_move([c.objects[-1]],x,0)
        for side in (-1,1):
            _box(c,(.16,.28,.08),(x+side*.12,-.04,.44),cells['dark-metal'])
            _lathe(c,'abstract-leg',[(.48,.075),(1.18,.085)],(x+side*.12,0),cells['dark-metal'],8)
        _lathe(c,'abstract-torso',[(1.10,.20),(1.65,.25),(1.77,.14)],(x,0),cells['dark-metal'],10)
        for side in (-1,1):
            c.bar((x+side*.11,-.18,1.69),(x+side*.035,-.245,1.42),.024,cells['metal'])
        _box(c,(.22,.025,.035),(x,-.205,1.12),cells['metal'])
        _lathe(c,'neck',[(1.77,.075),(1.88,.075)],(x,0),cells['dark-metal'],8)
        _sphere(c,x,0,2.03,.17,cells['dark-metal'])
        for side in (-1,1):c.bar((x+side*.21,0,1.62),(x+side*.32,-.02,1.12),.075,cells['dark-metal'])


def _memorial(c,form,cells):
    m=cells['mineral']
    if form=='borehole-site':
        _box(c,(3.7,2.7,.08),(0,0,.04),cells['earth'])
        sides=16;vertices=[]
        for z,r in ((.08,.70),(.38,.70),(.08,.36),(.38,.36)):
            vertices.extend((r*math.cos(k*math.tau/sides),r*math.sin(k*math.tau/sides),z) for k in range(sides))
        faces=[]
        for k in range(sides):
            n=(k+1)%sides
            faces.extend(((k,n,n+sides,k+sides),(k+2*sides,k+3*sides,n+3*sides,n+2*sides),
                          (k+sides,n+sides,n+3*sides,k+3*sides),(k,k+2*sides,n+2*sides,n)))
        obj=c.add(mesh_object('open-bore-ring',vertices,faces,c.material),m)
        for poly in obj.data.polygons:
            if poly.index%4 in (1,2):
                for loop in poly.loop_indices:
                    u,v=obj.data.uv_layers.active.data[loop].uv
                    obj.data.uv_layers.active.data[loop].uv=((cells['metal']%4+(u*4)%1)/4,(cells['metal']//4+(v*4)%1)/4)
    elif form=='cenotaph':
        for width,depth,base,height in ((3.5,2.5,0,.20),(2.8,1.9,.20,.22),(1.55,1.0,.42,2.65),(1.8,1.2,3.07,.28),(1.25,.75,3.35,.25)):
            _tier(c,width,depth,base,height,m)
    elif form=='lotus-stupa':
        for i in range(3):_tier(c,4.8-i*.65,4.0-i*.65,i*.25,.25,m)
        _lathe(c,'elongated-lotus-bud',[(.75,1.25),(1.1,1.25),(1.5,.85),(2.1,1.02),
                    (3.0,.82),(4.2,.50),(5.5,.18),(6.6,0)],(0,0),cells['ochre'],16)
    else:
        _box(c,(5.6,3.6,.10),(0,0,.05),cells['earth'])
        for x in (-1.8,0,1.8):
            for y in (-.9,.9):
                _lathe(c,'stone-pillar',[(.10,.24),(1.35,.17)],(x,y),m,8)
                _lathe(c,'upturned-capstone',[(1.35,.17),(1.45,.33),(1.65,.47),(1.85,.50)],(x,y),m,12)


def _panelled_sphere(c,x,y,z,radius,cells):
    sides=24;steps=10
    profile=[(z+radius*math.sin(-math.pi/2+k*math.pi/steps),
              radius*math.cos(-math.pi/2+k*math.pi/steps) if 0<k<steps else 0) for k in range(steps+1)]
    bands=[cells['metal']]*steps
    bands[4]=bands[5]=cells['dark-metal']
    obj=_lathe(c,'panelled-sphere-shell',profile,(x,y),cells['metal'],sides,bands=bands)
    # Shallow closed mullions sit directly on the equatorial shell; no transparent shader.
    for k in range(12):
        a=math.tau*k/12;r=radius*math.cos(math.pi/10)
        c.bar((x+r*math.cos(a),y+r*math.sin(a),z-radius*math.sin(math.pi/10)),
              (x+radius*math.cos(a),y+radius*math.sin(a),z),.018,cells['metal'])
        c.bar((x+radius*math.cos(a),y+radius*math.sin(a),z),
              (x+r*math.cos(a),y+r*math.sin(a),z+radius*math.sin(math.pi/10)),.018,cells['metal'])
    return obj


def _tower(c,form,cells):
    m=cells['mineral']
    if form=='sphere-towers':
        _box(c,(5.5,4.4,.12),(0,0,.06),m)
        for x,y,height in ((-1.3,0,4.95),(1.2,.55,4.0),(.8,-1.25,3.15)):
            _lathe(c,'tapered-shaft',[(.12,.16),(height,.06)],(x,y),m,10)
        _panelled_sphere(c,-1.3,0,2.85,.68,cells)
        _panelled_sphere(c,-1.3,0,4.15,.41,cells)
        _panelled_sphere(c,1.2,.55,2.65,.56,cells)
        for x,y in ((-1.3,0),(1.2,.55),(.8,-1.25)):
            _lathe(c,'shaft-foundation',[(.12,.24),(.24,.24),(.30,.18)],(x,y),m,12)
    elif form=='observation-tower':
        _box(c,(4.5,3.5,.12),(0,0,.06),m)
        for i in range(3):
            a=math.tau*i/3
            _lathe(c,'tapering-leg',[(.12,.25,.65*math.cos(a),.65*math.sin(a)),
                        (7.4,.13,.17*math.cos(a),.17*math.sin(a))],(0,0),m,8)
        _lathe(c,'observation-pod',[(7.4,.55),(7.65,1.12),(8.0,1.12),(8.20,.55)],(0,0),m,16,bands=(m,cells['dark-metal'],m))
        for k in range(16):
            a=math.tau*k/16
            c.bar((1.12*math.cos(a),1.12*math.sin(a),7.65),
                  (1.12*math.cos(a),1.12*math.sin(a),8.0),.025,cells['metal'])
        for z in (7.63,7.98):
            _lathe(c,'pod-mullion-band',[(z,1.13),(z+.04,1.13)],(0,0),cells['metal'],16)
        _lathe(c,'upper-shaft',[(8.2,.16),(10.2,.10)],(0,0),m,10)
        _lathe(c,'upper-platform',[(9.35,.54),(9.55,.54)],(0,0),m,12)
        _lathe(c,'antenna',[(10.2,.06),(11.75,.025)],(0,0),cells['metal'],8)
    elif form=='flame-obelisk':
        for width,depth,z,height in ((4.4,3.4,0,.20),(3.4,2.5,.20,.35)):
            _tier(c,width,depth,z,height,m)
        _lathe(c,'square-obelisk',[(.55,.78),(6.95,.48)],(0,0),m,4,smooth=False)
        _box(c,(2.0,1.8,.25),(0,0,7.075),m)
        _extrude(c,'abstract-flame',[(-.12,7.2),(-.55,7.55),(-.32,8.15),(-.10,7.92),
                         (.20,8.75),(.55,8.05),(.42,7.45),(.12,7.2)],.32,cells['ochre'])
    elif form=='masonry-ring-tower':
        _box(c,(4.6,3.6,.12),(0,0,.06),m)
        _lathe(c,'lower-masonry',[(.12,1.10),(2.0,1.10)],(-.45,0),m,12)
        start=len(c.objects);_wall_ring(c,12,1.10,2.0,3.2,cells,openings=(7,8,9,10),small=True);_move(c.objects[start:],-.45,0)
        for z in (1.2,2.0,3.2,4.3,5.2):_lathe(c,'tier-band',[(z,1.12),(z+.12,1.12)],(-.45,0),m,12)
        _box(c,(1.2,1.1,4.3),(1.0,0,.12+4.3/2),m)
        _recessed_bay(c,-.45,-1.15,.20,.50,1.60,0,cells,panel=cells['dark-timber'],divided=False)
    elif form=='hexagonal-clock':
        _box(c,(3.5,2.6,.12),(0,0,.06),m)
        _lathe(c,'lower-stone',[(.12,.72),(3.55,.72)],(0,0),m,6,smooth=False)
        _wall_ring(c,6,.66,3.55,1.75,cells,openings=(3,4,5),small=True)
        _display_ring(c,6,.66,5.30,.42,cells)
        _clock_face(c,0,-.62,5.51,.15,cells)
        _lathe(c,'hexagonal-roof',[(5.72,.78),(6.45,0)],(0,0),cells['dark-metal'],6,smooth=False)
    else:
        _box(c,(3.5,2.6,.12),(0,0,.06),m)
        _lathe(c,'octagonal-shaft',[(.12,.75),(4.40,.45)],(0,0),m,8,smooth=False)
        _lathe(c,'lantern-floor',[(4.40,.56),(4.52,.56)],(0,0),m,8,smooth=False)
        _display_ring(c,8,.52,4.52,.70,cells)
        _lathe(c,'lantern-roof',[(5.22,.64),(5.70,0)],(0,0),cells['dark-metal'],8,smooth=False)
        _lathe(c,'finial',[(5.64,.035),(5.88,.02)],(0,0),cells['metal'],8)


def _guildhalls(c,cells):
    m=cells['mineral'];_tier(c,7.7,6.7,0,.12,m)
    for k,(x,y,width,depth) in enumerate(((-2.6,1.8,1.6,1.9),(-.85,1.8,1.6,1.9),
                                       (.85,1.8,1.6,1.9),(2.6,1.8,1.6,1.9),(2.9,-.65,1.7,2.2))):
        top=3.80+(k%2)*.12;front=y-depth/2
        for side in (-1,1):_box(c,(.16,depth,top-.12),(x+side*(width-.16)/2,y,(top+.12)/2),m)
        _box(c,(width-.32,.16,top-.12),(x,y+(depth-.16)/2,(top+.12)/2),m)
        _facade(c,width-.12,2.08,.12,x,front-.02,cells,bays=1)
        _facade(c,width-.12,top-2.20,2.20,x,front-.02,cells,bays=2,door=False)
        for z,h in ((.12,.12),(2.12,.14),(top,.14)):
            _tier(c,width+.08,depth+.08,z,h,m);_move([c.objects[-1]],x,y)
        _roof(c,width+.10,depth+.10,top+.14,.60,cells['dark-metal'],x,y)
        # Three inset masonry gable courses frame the dark roof, rather than an empty arch.
        for j in range(3):
            _box(c,(width*(1-j*.24),.13,.16),(x,front-.015,top+.22+j*.16),m)
        _recessed_bay(c,x,front-.02,top+.17,.28,.30,0,cells,divided=False)
    _box(c,(.46,.46,.54),(-2.6,1.8,4.63),m)
    _roof(c,.54,.54,4.90,.10,cells['dark-metal'],-2.6,1.8,True)


def build_landmark(material,record,cells):
    """Return original objects; caller alone owns atlas provenance, fit and export."""
    if material is None or not isinstance(record,dict) or cells!=CELLS:
        raise ValueError('Material, canonical record and approved ten-role cells required')
    p=record.get('parameters')
    if not isinstance(p,dict) or not isinstance(record.get('city'),str):
        raise ValueError('Canonical identity and parameters required')
    form=p.get('composition');generator=record.get('generator')
    if not ((generator=='landmark' and form in FORMS and record.get('category') in ('building','monument')) or
            (generator=='bridge' and form in BRIDGES and record.get('category')=='building')):
        raise ValueError('Unsupported landmark form; no legacy fallback')
    if any(type(p.get(k)) not in (int,float) or not math.isfinite(p[k]) or not .1<=p[k]<=60 for k in ('width','depth','height')):
        raise ValueError('Finite original art bounds required')
    if type(p.get('seed')) is not int or not 0<=p['seed']<=9007199254740991:
        raise ValueError('Canonical integer seed required')
    if record.get('geometryLicence')!='AGPL-3.0-or-later':raise ValueError('Geometry licence mismatch')
    if record.get('country') in RESTRICTED and record['category']=='building':
        year=record.get('builtYear')
        if type(year) is not int or year>=1950:raise ValueError('Restricted building needs sourced pre-1950 date')
    design=landmark_design(record);c=Construction(material)
    if generator=='bridge':_bridge(c,form,cells)
    elif form=='three-figures':_figures(c,cells)
    elif form in ('terraced-fort','four-tower-castle','round-tower-fort','pentagonal-fort','red-fort-pavilions','clock-fort'):_fort(c,form,cells)
    elif form in ('courtyard-mosque','civic-pavilions','barracks-court'):_civic(c,form,design,cells)
    elif form in ('twin-bell-cathedral','bell-tower-church','domed-basilica'):_church(c,form,cells)
    elif form in ('verandah-house','gable-store'):_house(c,form,cells)
    elif form=='doric-temple':_doric(c,cells)
    elif form in ('terraced-stairs','inclined-stairs'):_stairs(c,form=='terraced-stairs',cells)
    elif form in ('borehole-site','cenotaph','lotus-stupa','latte-stones'):_memorial(c,form,cells)
    elif form=='guildhall-square':_guildhalls(c,cells)
    elif form in ('sphere-towers','observation-tower','flame-obelisk','masonry-ring-tower','hexagonal-clock','octagonal-lighthouse'):_tower(c,form,cells)
    else:raise ValueError('Landmark dispatch incomplete')
    return c.objects
