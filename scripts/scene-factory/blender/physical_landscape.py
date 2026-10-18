"""Original metre-scale natural fragments; no surveyed terrain or species implied."""
import hashlib
import itertools
import json
import math
from pathlib import Path

from construction import Construction
from shared import mesh_object


REGISTRY = Path(__file__).resolve().parents[3] / 'scripts/scene-factory/heroes.json'
REGISTRY_SHA256 = '367b3dff2930be447cfffc21e5d49ad86bb614e08c3cea43a9b2a4c07c25d1f1'
LANDSCAPE_FORMS = frozenset(('bare-coast', 'confluence', 'forest', 'gully', 'hill',
                             'ice-valley', 'low-cay', 'open-park', 'riverbank'))
SUPPORTED = frozenset(('landscape', f) for f in LANDSCAPE_FORMS) | {
    ('waterfront', 'open-lagoon')}
REQUIRED_CELLS = {'timber': 0, 'dark-timber': 1, 'canvas': 2, 'metal': 4,
                  'pond-water': 5, 'foliage': 7, 'mineral': 8, 'earth': 12,
                  'dark-metal': 14}


def landscape_design(record):
    """Allocate bounded coarse art choices independently of export order."""
    raw = REGISTRY.read_bytes()
    if hashlib.sha256(raw).hexdigest() != REGISTRY_SHA256:
        raise ValueError('Landscape design requires the reviewed canonical registry')
    form = (record['generator'], record['parameters']['composition'])
    rows = [r for r in json.loads(raw) if
            (r['generator'], r['parameters'].get('composition')) == form]
    # Every axis changes geometry: cross section, bend, grouping and aspect ratio.
    choices = list(itertools.product(range(3), range(4), range(3), range(3)))
    if len(rows) > len(choices) or len({r['city'] for r in rows}) != len(rows):
        raise ValueError('Landscape design vocabulary exhausted or duplicate city')
    occupied = set()
    selected = None
    for row in sorted(rows, key=lambda r: r['city']):
        key = f"physical-landscape-v1:{row['city']}:{row['parameters']['seed']}"
        start = int(hashlib.sha256(key.encode()).hexdigest(), 16) % len(choices)
        index = next(i for step in range(len(choices))
                     if (i := (start + step) % len(choices)) not in occupied)
        occupied.add(index)
        if row['city'] == record['city']:
            if ({k: v for k, v in record.items() if k != 'surface'} !=
                    {k: v for k, v in row.items() if k != 'surface'}):
                raise ValueError('Landscape record differs from canonical facts')
            relief, bend, grouping, aspect = choices[index]
            selected = dict(relief=relief, bend=bend, grouping=grouping,
                            aspect=aspect, index=index, seed=row['parameters']['seed'])
    if selected is None:
        raise ValueError('Unknown canonical landscape city')
    return selected


def _uv(cell, u, v):
    return ((cell % 4 * 256 + 12 + 232 * u) / 1024,
            (cell // 4 * 256 + 12 + 232 * v) / 1024)


def _solid_grid(c, name, grid, cell, base=-.16, top_cell=None):
    """Closed terrain with one coherent top chart and a separate perimeter chart."""
    ny, nx = len(grid) - 1, len(grid[0]) - 1
    vertices = [tuple(p) for row in grid for p in row]
    if nx < 1 or ny < 1 or any(len(row) != nx + 1 for row in grid):
        raise ValueError('Rectangular terrain grid required')
    if any(p[2] <= base for p in vertices):
        raise ValueError('Terrain must have positive thickness')
    stride = nx + 1
    faces, face_cells, coords = [], [], []
    for j in range(ny):
        for i in range(nx):
            a = j * stride + i
            faces.append((a, a + 1, a + stride + 1, a + stride))
            face_cells.append(top_cell(i, j) if top_cell else cell)
            coords.append(((i/nx, j/ny), ((i+1)/nx, j/ny),
                           ((i+1)/nx, (j+1)/ny), (i/nx, (j+1)/ny)))
    top_count = len(faces)
    rim = (list(range(nx + 1)) + [j * stride + nx for j in range(1, ny + 1)] +
           [ny * stride + i for i in range(nx - 1, -1, -1)] +
           [j * stride for j in range(ny - 1, 0, -1)])
    lower = len(vertices)
    vertices.extend((vertices[i][0], vertices[i][1], base) for i in rim)
    perimeter = [0.0]
    for a, b in zip(rim, rim[1:] + rim[:1]):
        perimeter.append(perimeter[-1] + math.dist(vertices[a][:2], vertices[b][:2]))
    height = max(p[2] for p in vertices) - base
    for k, a in enumerate(rim):
        n = (k + 1) % len(rim)
        b = rim[n]
        faces.append((a, lower + k, lower + n, b))
        face_cells.append(cell)
        u, v = perimeter[k] / perimeter[-1], perimeter[k+1] / perimeter[-1]
        coords.append(((u, (vertices[a][2]-base)/height), (u, 0),
                       (v, 0), (v, (vertices[b][2]-base)/height)))
    faces.append(tuple(lower + k for k in reversed(range(len(rim)))))
    face_cells.append(cell)
    coords.append(tuple((.1 + .8 * (k % stride)/nx,
                         .1 + .8 * (k // stride)/ny) for k in reversed(rim)))
    obj = mesh_object(name, vertices, faces, c.material)
    uv = obj.data.uv_layers.new(name='UVMap')
    for i, polygon in enumerate(obj.data.polygons):
        polygon.use_smooth = i < top_count
        for loop, point in zip(polygon.loop_indices, coords[i]):
            uv.data[loop].uv = _uv(face_cells[i], *point)
    c.objects.append(obj)
    return obj


def _flooded_grid(c, name, grid, cell, water_cell, base=-.16, surface=.12, top_cell=None):
    """One closed shell: clip top triangles at the waterline, emit cut faces once."""
    ny,nx=len(grid)-1,len(grid[0])-1
    if nx<1 or ny<1 or any(len(row)!=nx+1 for row in grid) or base>=surface:
        raise ValueError('Positive flooded grid and depth required')
    source=[tuple(p) for row in grid for p in row]
    if any(not all(math.isfinite(v) for v in p) or p[2]<=base for p in source):
        raise ValueError('Finite terrain above the common base required')
    vertices=[(x,y,max(z,surface)) for x,y,z in source]
    chart=[(i/nx,j/ny) for j in range(ny+1) for i in range(nx+1)]
    crossings={};faces=[];roles=[]
    def intersection(a,b):
        if source[a][2]==surface:return a
        if source[b][2]==surface:return b
        key=tuple(sorted((a,b)))
        if key not in crossings:
            t=(surface-source[a][2])/(source[b][2]-source[a][2])
            crossings[key]=len(vertices)
            vertices.append(tuple(source[a][k]+t*(source[b][k]-source[a][k])
                                  if k<2 else surface for k in range(3)))
            chart.append(tuple(chart[a][k]+t*(chart[b][k]-chart[a][k]) for k in range(2)))
        return crossings[key]
    def clip(triangle,wet):
        result=[]
        for a,b in zip(triangle,triangle[1:]+triangle[:1]):
            inside_a=source[a][2]<=surface if wet else source[a][2]>=surface
            inside_b=source[b][2]<=surface if wet else source[b][2]>=surface
            if inside_a:result.append(a)
            if inside_a!=inside_b:result.append(intersection(a,b))
        result=list(dict.fromkeys(result))
        return tuple(result) if len(result)>=3 else ()
    for j in range(ny):
        for i in range(nx):
            a=j*(nx+1)+i;b=a+1;d=a+nx+1;e=d+1
            land=top_cell(i,j) if top_cell else cell
            for triangle in ((a,b,e),(a,e,d)):
                for wet,role in ((False,land),(True,water_cell)):
                    # Exact plane triangles belong to water only, avoiding duplicate faces.
                    if not wet and all(source[v][2]==surface for v in triangle):continue
                    face=clip(triangle,wet)
                    if face:faces.append(face);roles.append(role)
    top_count=len(faces);coords=[tuple(chart[v] for v in f) for f in faces]
    edges={}
    for face,role in zip(faces,roles):
        for a,b in zip(face,face[1:]+face[:1]):
            key=tuple(sorted((a,b)))
            edges.setdefault(key,[]).append((a,b,role))
    if any(len(items)>2 for items in edges.values()):
        raise ValueError('Flooded top has a nonmanifold edge')
    boundary={items[0][0]:(items[0][1],items[0][2]) for items in edges.values() if len(items)==1}
    rim=[];first=min(boundary);v=first
    while v not in rim:
        rim.append(v);v=boundary[v][0]
    if v!=first or len(rim)!=len(boundary):raise ValueError('One closed flooded perimeter required')
    lower={v:len(vertices)+i for i,v in enumerate(rim)}
    vertices.extend((vertices[v][0],vertices[v][1],base) for v in rim)
    lengths=[math.dist(vertices[a][:2],vertices[boundary[a][0]][:2]) for a in rim]
    perimeter=sum(lengths);height=max(v[2] for v in vertices)-base;distance=0
    for a,length in zip(rim,lengths):
        b,role=boundary[a];u=distance/perimeter;v=(distance+length)/perimeter
        faces.append((a,lower[a],lower[b],b));roles.append(role)
        coords.append(((u,(vertices[a][2]-base)/height),(u,0),(v,0),
                       (v,(vertices[b][2]-base)/height)))
        distance+=length
    # A centre fan avoids a collinear rectangular bottom ngon and fixes its count.
    centre=len(vertices)
    vertices.append((sum(vertices[v][0] for v in rim)/len(rim),
                     sum(vertices[v][1] for v in rim)/len(rim),base))
    centre_uv=tuple(sum(chart[v][k] for v in rim)/len(rim) for k in range(2))
    for a in rim:
        b=boundary[a][0]
        faces.append((lower[b],lower[a],centre));roles.append(cell)
        coords.append((chart[b],chart[a],centre_uv))
    obj=mesh_object(name,vertices,faces,c.material)
    uv=obj.data.uv_layers.new(name='UVMap')
    for i,(poly,points,role) in enumerate(zip(obj.data.polygons,coords,roles)):
        poly.use_smooth=i<top_count and role!=water_cell
        for loop,point in zip(poly.loop_indices,points):uv.data[loop].uv=_uv(role,*point)
    c.objects.append(obj)
    return obj


def _grid(c, name, width, depth, nx, ny, elevation, cell, base=-.16, top_cell=None, water_cell=None):
    grid = [[(-width/2 + width*i/nx, -depth/2 + depth*j/ny,
              elevation(-width/2 + width*i/nx, -depth/2 + depth*j/ny))
             for i in range(nx+1)] for j in range(ny+1)]
    if water_cell is not None:
        return _flooded_grid(c, name, grid, cell, water_cell, base, top_cell=top_cell)
    return _solid_grid(c, name, grid, cell, base, top_cell)


def _hummock(c, at, radius, height, phase, cell):
    """Closed irregular leaf mass: 42 triangles, no flat masks or sphere scaling."""
    sides = 7
    vertices = [(at[0], at[1], at[2] - height*.5)]
    for ring, (level, breadth) in enumerate(((-.28, .73), (.02, 1), (.29, .69))):
        for k in range(sides):
            angle = k * math.tau/sides
            r = radius * breadth * (1 + .13*math.sin(k*2.7 + phase + ring*.7))
            vertices.append((at[0] + r*math.cos(angle),
                             at[1] + r*math.sin(angle)*(.82 + .08*math.sin(phase)),
                             at[2] + height*level + .04*math.cos(k*1.9+phase)))
    vertices.append((at[0]+radius*.12, at[1]-radius*.08, at[2]+height*.5))
    faces = []
    charts = []
    for k in range(sides):
        n = (k+1) % sides
        u, v = k/sides, (k+1)/sides
        faces.append((0, 1+n, 1+k)); charts.append((((u+v)/2, 0), (v, .2), (u, .2)))
        for ring in range(2):
            a, b = 1+ring*sides, 1+(ring+1)*sides
            faces.append((a+k, a+n, b+n, b+k))
            charts.append(((u, .2+ring*.3), (v, .2+ring*.3),
                           (v, .5+ring*.3), (u, .5+ring*.3)))
        faces.append((1+2*sides+k, 1+2*sides+n, len(vertices)-1))
        charts.append(((u, .8), (v, .8), ((u+v)/2, 1)))
    obj = mesh_object('closed-foliage', vertices, faces, c.material)
    uv = obj.data.uv_layers.new(name='UVMap')
    for polygon, chart in zip(obj.data.polygons, charts):
        polygon.use_smooth = True
        for loop, point in zip(polygon.loop_indices, chart):
            uv.data[loop].uv = _uv(cell, *point)
    c.objects.append(obj)


def _crown(c, at, radius, height, phase, cell):
    """Nine closed curved blades on one twig; shared charts on each blade side."""
    bottom = (at[0]-.10*radius*math.cos(phase),
              at[1]-.10*radius*math.sin(phase), at[2]-.25*height)
    top = (at[0]+.20*radius*math.cos(phase),
           at[1]+.20*radius*math.sin(phase), at[2]+.25*height)
    c.bar(bottom, top, .024, REQUIRED_CELLS['dark-timber'])
    vertices, faces, charts = [], [], []
    for k in range(9):
        t = .10 + .095*k
        root = tuple(a+(b-a)*t for a,b in zip(bottom,top))
        angle = phase + (1 if k%2 else -1)*(1.0+.20*math.sin(k*2.1))
        length = radius*(.78+.27*math.sin(k*1.7+phase)**2)
        width = length*(.28+.065*math.cos(k+phase))
        lift = height*(.08+.12*math.sin(k*1.3+phase))
        # The nonuniform tip and shoulders break the spray outline at leaf scale.
        outline = ((0,0),(.31,.86),(.69,.70),(1,0),(.60,-1),(.22,-.64))
        start = len(vertices)
        for u,v in outline:
            vertices.append((root[0]+length*u*math.cos(angle)-width*v*math.sin(angle),
                             root[1]+length*u*math.sin(angle)+width*v*math.cos(angle),
                             root[2]+lift*u+.06*height*math.sin(u*math.pi)))
        for sign in (1,-1):
            vertices.append((root[0]+length*.46*math.cos(angle),
                             root[1]+length*.46*math.sin(angle),
                             root[2]+lift*.46+.06*height+sign*.025*height))
        for side in range(2):
            for i in range(6):
                j=(i+1)%6
                order=(i,j,6) if side else (j,i,6)
                face=tuple(start+(v if v<6 else 6+side) for v in order)
                faces.append(face)
                charts.append(tuple((outline[v][0], .5+outline[v][1]*.44)
                                    if v<6 else (.46,.5) for v in order))
    obj=mesh_object('attached-leafy-spray',vertices,faces,c.material)
    uv=obj.data.uv_layers.new(name='UVMap')
    # Separate upper/lower chart orientation makes a sharp rim while each side shares.
    for i,(polygon,chart) in enumerate(zip(obj.data.polygons,charts)):
        polygon.use_smooth=True
        lower=(i//6)%2
        for loop,(u,v) in zip(polygon.loop_indices,chart):
            uv.data[loop].uv=_uv(cell, .04+.43*u+lower*.49, .06+.88*v)
    c.objects.append(obj)


def _tree(c, x, y, ground, height, phase, cells, roots=False):
    z = ground(x, y) - .06
    trunk_height = height * .64
    c.cylinder(.075 + .008*math.sin(phase), trunk_height,
               (x, y, z+trunk_height/2), cells['dark-timber'], sides=6)
    for k in range(3):
        a = phase + k*2.25
        reach = height * (.13 + .025*k)
        centre = (x+reach*math.cos(a), y+reach*math.sin(a),
                  z+height*(.67+.06*k))
        c.bar((x, y, z+height*.42), centre, .055, cells['dark-timber'])
        _crown(c, centre, height*(.22-.015*k), height*.46,
               phase+k*1.7, cells['foliage'])
    if roots:
        for k in range(4):
            a = -math.pi/2 + (k-1.5)*.52
            rx, ry = x+.58*math.cos(a), y+.58*math.sin(a)
            c.bar((x, y, z+.46), (rx, ry, ground(rx, ry)-.08),
                  .048, cells['dark-timber'])


def _shore(c, form, d, cells):
    width, depth = 7.6 + .2*d['aspect'], 5.0 + .18*d['grouping']
    relief, bend = d['relief'], d['bend']
    if form == 'riverbank':
        def shore(x):
            return -.15 + (.18+.08*bend)*math.sin(x*.75+.6*relief)
        rise, land_cell = .30+.06*relief, cells['earth']
    elif form == 'open-lagoon':
        def shore(x):
            return (-.75 + (1.05+.16*bend)*math.cos((x+.3*relief)*math.pi/width)
                    + .11*math.sin(x*3.3+bend) + .055*math.sin(x*6.7+relief))
        rise, land_cell = .34+.07*relief, cells['earth']
    else:
        def shore(x):
            return -.65 + (.45+.18*bend)*math.cos((x-.4*relief)*1.05) + .12*x
        rise, land_cell = .28+.06*relief, cells['mineral']
    def ground(x, y):
        t = max(0, min(1, (y-shore(x))/(depth/2-shore(x))))
        if form == 'open-lagoon':
            ridge = .08*math.sin(x*3.8+bend)*math.sin(t*math.pi)**2
            return .055 + rise*(1-math.exp(-4*t)) + ridge + .035*t*math.sin(x*1.7)
        return .075 + rise*math.sin(t*math.pi/2) + .025*t*math.sin(x*2.4+bend)
    grid = []
    steps = (0,.035,.08,.16,.30,.52,.76,1) if form == 'open-lagoon' else (0,.25,.5,.75,1)
    nx = 20 if form == 'open-lagoon' else 12
    for t in steps:
        grid.append([(x := -width/2+width*i/nx,
                      y := shore(x)+(depth/2-shore(x))*t, ground(x, y)) for i in range(nx+1)])
    grid.insert(0,[(x,-depth/2,.055) for x,_,_ in grid[0]])
    _flooded_grid(c, 'joined-water-and-bank', grid, land_cell, cells['pond-water'])
    if form == 'open-lagoon':
        for k in range(2+d['grouping']):
            x = -2.6 + k*1.35 + .22*d['aspect']
            y = shore(x)+.30+.035*(k%2)
            _tree(c, x, y, ground, 1.85+.12*relief, .7*bend+k, cells, roots=True)


def _woodland(c, form, d, cells):
    width, depth = 7.1+.3*d['aspect'], 5.0+.20*d['relief']
    def ground(x, y):
        return .16 + .055*math.sin(x*.8+.6*d['bend'])*math.cos(y*.9) + .025*y
    _grid(c, 'rooted-ground', width, depth, 10, 7, ground, cells['earth'])
    # The clearing is continuous bare ground between groups, not an invented pond/path.
    if form == 'open-park':
        points = [(-2.45, -.85), (-1.75+.32*d['grouping'], 1.55),
                  (2.05, .70-.45*d['bend'])]
        if d['grouping'] == 2:
            points.append((.70, 1.65))
        height = 2.35 + .12*d['relief']
    else:
        points = [(-2.5, -1.5), (-2.0, 1.25), (-.45, .5-.4*d['bend']),
                  (.75, 1.6), (2.3, -.85), (2.1, 1.35)]
        if d['grouping'] == 0:
            points.pop(3)
        elif d['grouping'] == 2:
            points = [(-2.5, -1.4), (-2.45, .1), (-1.65, 1.5),
                      (.45, -1.6), (2.2, -.5), (2.25, 1.4)]
        height = 2.65+.15*d['relief']
    for k, (x, y) in enumerate(points):
        x *= .94 + .055*d['aspect']
        x += .14*math.sin(d['bend']+k*1.8)
        y += .12*math.cos(d['grouping']+k*2.1)
        _tree(c, x, y, ground, height-(k%3)*.16, k*1.8+d['bend']*.65, cells)


def _hill(c, d, cells):
    width, depth = 7.4+.25*d['aspect'], 5.4+.2*d['grouping']
    def ground(x, y):
        crest_x = -.9+.55*d['bend']+.3*math.sin(y*.9)
        main = math.exp(-((x-crest_x)/2.15)**2-((y-.4)/2.5)**2)
        shoulder = math.exp(-((x+1.9)/1.1)**2-((y+1.1-.45*d['grouping'])/1.4)**2)
        return .10+(1.8+.25*d['relief'])*main+.38*shoulder+.06*math.sin(x*2+y)*main
    _grid(c, 'uneven-hill-ridge', width, depth, 16, 12, ground, cells['mineral'])


def _ice_valley(c,d,cells):
    """Closed original glacier fragment: flowing ice, offset fractures and rocky ridges."""
    width,depth=7.6+.15*d['aspect'],6.0+.3*d['grouping']
    nx,ny=20,32
    grid=[]
    for j in range(ny+1):
        t=j/ny;y=-depth/2+depth*t
        centre=.32*math.sin(y*.72+d['bend'])+.10*y
        half=.63+.68*t+.12*math.sin(t*7.1+.4)
        left,right=centre-half,centre+half
        xs=[-width/2+(left+width/2)*i/4 for i in range(4)]
        xs += [centre+half*(-1+2*i/12) for i in range(13)]
        xs += [right+(width/2-right)*i/4 for i in range(1,5)]
        row=[]
        for i,x in enumerate(xs):
            cross=(x-centre)/half
            floor=.25+.40*t
            if 4<=i<=16:
                crown=.20*max(0,1-cross*cross)
                flow=.055*math.sin(t*13+cross*4)+.035*math.cos(t*23-cross*7)
                cut=0.0
                for k,at in enumerate((.19,.41,.67,.84)):
                    line=at+.045*cross+.033*math.sin(cross*4.3+k*1.8)
                    reach=max(0,1-abs(cross-(-.28 if k%2 else .24))/.95)
                    cut=max(cut,.29*reach*max(0,1-abs(t-line)/.033))
                # Unequal attached ice blocks rise from the same continuous shell.
                serac=0.0
                for at,side,height in ((.33,-.38,.24),(.58,.31,.32),(.77,-.12,.21)):
                    serac+=height*max(0,1-abs(t-at)/.075)*max(0,1-abs(cross-side)/.43)
                z=max(.11,floor+crown+flow+serac-cut)
            else:
                side=-1 if i<4 else 1
                q=(left-x)/(left+width/2) if side<0 else (x-right)/(width/2-right)
                ridge=.42+1.18*max(0,math.sin(math.pi*t))
                ridge+=.23*math.sin(t*15.4+side*1.3)+.13*math.cos(t*27+side)
                shoulder=math.sin(min(1,q)*math.pi*.72)**.72
                spur=.16*math.sin(t*21+q*7+side)*math.sin(math.pi*q)
                z=max(.14,floor+ridge*shoulder+spur)
            row.append((x,y,z))
        grid.append(row)
    def role(i,j):
        if 4<=i<16:return cells['canvas']
        return cells['dark-metal'] if i in (0,1,18,19) else cells['mineral']
    obj=_solid_grid(c,'fractured-glacier-rock-mass',grid,cells['mineral'],top_cell=role)
    uv=obj.data.uv_layers.active
    for poly in obj.data.polygons:
        top=poly.index<nx*ny
        i,j=poly.index%nx,poly.index//nx
        ice=top and 4<=i<16
        cell=role(i,j) if top else cells['mineral']
        # Small inspected unpatterned samples retain pale ice and neutral dark rock;
        # broad geometric relief supplies the fracture shadows, not painted grid bands.
        for loop in poly.loop_indices:
            point=obj.data.vertices[obj.data.loops[loop].vertex_index].co
            u=.15+.045*(point.x/width+.5)
            v=.53+.045*(point.y/depth+.5)
            uv.data[loop].uv=_uv(cell,u,v)
        poly.use_smooth=False if top else poly.use_smooth
    return obj


def _valley(c, form, d, cells):
    if form=='ice-valley':
        return _ice_valley(c,d,cells)
    width, depth = 7.6+.15*d['aspect'], 6.0+.3*d['grouping']
    ice = form == 'ice-valley'
    def centre(y):
        return .25*math.sin(y*.8+d['bend'])+.12*y
    def ground(x, y):
        distance = abs(x-centre(y))
        floor = .18+.035*(y+depth/2)
        if ice:
            floor += .12*math.cos(y*2.9)**12*max(0, 1-distance/1.4)
            slope = 1.7*min(1, max(0, (distance-1.0)/2.3))**.8
        else:
            slope = 1.5*min(1, max(0, (distance-.34)/2.7))**.65
        return floor+slope*(1+.08*math.sin(y*2+x))
    def top_cell(i, j):
        x, y = -width/2+width*(i+.5)/18, -depth/2+depth*(j+.5)/14
        return cells['mineral'] if ice and abs(x-centre(y)) < 1.35 else cells['earth']
    _grid(c, 'glacial-trough' if ice else 'dry-eroded-gully', width, depth,
          18, 14, ground, cells['earth'], top_cell=top_cell if ice else None)


def _confluence(c, d, cells):
    width, depth = 7.8, 5.6
    join = (.25, -.55)
    ends = ((-.35, -depth), (-width, depth), (width, depth*.8))
    def distance_to_channel(x, y, end):
        dx, dy = end[0]-join[0], end[1]-join[1]
        t = max(0, min(1, ((x-join[0])*dx+(y-join[1])*dy)/(dx*dx+dy*dy)))
        return math.hypot(x-join[0]-t*dx, y-join[1]-t*dy)
    def ground(x, y):
        distance = min(distance_to_channel(x, y, end) for end in ends)
        return .045 + .33*min(1, max(0, (distance-.42)/.8))
    _grid(c, 'joining-channel-banks', width, depth, 20, 16, ground, cells['earth'],
          water_cell=cells['pond-water'])


def _cay(c, d, cells):
    width, depth = 8, 5.2
    def ground(x, y):
        r = math.sqrt(((x+.35)/3.6)**2+((y-.1)/2.0)**2)
        edge = max(0, min(1, (1.1-r)/.35))
        dune = .20*math.exp(-((r-.70)/.22)**2)
        return .04+edge*(.11+dune*(1+.12*math.sin(x*2.2+y)))
    def cell(i, j):
        x, y = -width/2+width*(i+.5)/18, -depth/2+depth*(j+.5)/12
        return cells['foliage'] if (x/2.5)**2+(y/1.2)**2 < 1 else cells['mineral']
    _grid(c, 'low-cay-dune-rim', width, depth, 18, 12, ground,
          cells['mineral'], top_cell=cell, water_cell=cells['pond-water'])
    # Low closed vegetation hummocks sit in the inner depression, below dune relief.
    for x, y in ((-1.25, .15), (-.4, -.45), (.8, .35)):
        _hummock(c, (x, y, ground(x, y)+.055), .36, .16, x+y, cells['foliage'])


def build_landscape(material, record, cells):
    """Return authored objects; the caller owns provenance, uniform fit and export."""
    if material is None or not isinstance(record, dict) or not isinstance(cells, dict):
        raise ValueError('Material, canonical record and semantic cells required')
    if cells != REQUIRED_CELLS:
        raise ValueError('Explicit physical regional atlas cell contract required')
    p = record.get('parameters')
    if not isinstance(p, dict) or record.get('category') != 'natural-feature':
        raise ValueError('Natural-feature record and parameters required')
    form = (record.get('generator'), p.get('composition'))
    if form not in SUPPORTED:
        raise ValueError('Unsupported landscape form; no generic fallback')
    if any(type(p.get(k)) not in (int, float) or not math.isfinite(p[k]) or
           not .1 <= p[k] <= 60 for k in ('width', 'depth', 'height')):
        raise ValueError('Finite original art bounds required')
    if type(p.get('seed')) is not int or not 0 <= p['seed'] <= 9007199254740991:
        raise ValueError('Canonical integer seed required')
    d = landscape_design(record)
    c = Construction(material)
    composition = form[1]
    if composition in ('bare-coast', 'riverbank', 'open-lagoon'):
        _shore(c, composition, d, cells)
    elif composition in ('forest', 'open-park'):
        _woodland(c, composition, d, cells)
    elif composition == 'hill':
        _hill(c, d, cells)
    elif composition in ('gully', 'ice-valley'):
        _valley(c, composition, d, cells)
    elif composition == 'confluence':
        _confluence(c, d, cells)
    elif composition == 'low-cay':
        _cay(c, d, cells)
    else:
        raise ValueError('Landscape dispatch incomplete')
    return c.objects
