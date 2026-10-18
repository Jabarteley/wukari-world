"""Original metre-scale market construction with preserved atlas UVs."""
import math
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import bpy
import numpy as np
from mathutils import Vector
from shared import common, mesh_object, normalize

SAMPLE_PROPS = ('market-stall', 'canopy', 'crate-stack', 'produce-stand', 'bench')
PHYSICAL_PROPS = ('market-stall', 'canopy', 'crate-stack', 'produce-stand',
                  'cooking-stand', 'water-tank', 'generator', 'minibus', 'three-wheeler',
                  'bench', 'bollard', 'planter', 'broadleaf-tree', 'palm', 'acacia',
                  'wall', 'gate', 'kiosk', 'street-lamp', 'sign-frame')
# Semantic cells, shared by the kit and hero; no photograph or scanned surface is used.
COLOURS = ('#9a7955', '#5e4b37', '#c8bfa5', '#965348', '#92958e', '#586f62',
           '#c7a24d', '#71834b', '#9d9583', '#456a7b', '#985950', '#b59a5d',
           '#775237', '#a05d3d', '#454a48', '#b3ac99')


# These three cells contain textile only; shared canvas/container and paint/foliage cells stay fixed.
CLOTH_CELLS = {'cool_textile': 9, 'warm_textile': 10, 'ochre_textile': 11}
BASE_CLOTH_PALETTE = {'cool_textile': '#456a7b', 'warm_textile': '#985950', 'ochre_textile': '#b59a5d'}


def painted_atlas(cloth=None):
    colours = list(COLOURS)
    if cloth is not None:
        if not isinstance(cloth, dict) or set(cloth) != set(CLOTH_CELLS):
            raise ValueError('Expected exactly three named textile colours')
        for role, cell in CLOTH_CELLS.items():
            value = cloth[role]
            if not isinstance(value, str) or len(value) != 7 or value[0] != '#' or any(c not in '0123456789abcdefABCDEF' for c in value[1:]):
                raise ValueError(f'Invalid textile colour: {role}')
            colours[cell] = value
    pixels = np.ones((1024, 1024, 4), dtype=np.float32)
    yy, xx = np.mgrid[0:240, 0:240]
    for cell, value in enumerate(colours):
        rgb = np.array([int(value[i:i+2], 16) / 255 for i in (1, 3, 5)])
        tone = np.ones((240, 240), dtype=np.float32)
        if cell in (0, 1):
            # Long fibres and broad early/late growth bands, without printed plank seams.
            phase = yy * .22 + np.sin(xx * .018) * .6
            grain = np.sin(phase) + .28 * np.sin(phase * 2.7)
            tone = np.where(grain > .8, 1.12, np.where(grain < -.7, .78, .96))
            tone *= np.where(yy < 80, .90, np.where(yy > 165, 1.05, 1.0))
            tone = np.round(tone * 12) / 12
        elif cell == 15:
            rgb = np.array([.53, .39, .25])
            radius = np.sqrt((xx - 108) ** 2 + (yy - 128) ** 2 * .75)
            tone = np.where(np.sin(radius * .24) > .55, .78, 1.0)
        elif cell in (2, 3, 9, 10, 11):
            tone += ((xx % 4 == 0) * -.025 + (yy % 4 == 0) * -.025)
            tone[(xx % 80) < 4] *= .86
            tone[(yy % 80) < 3] *= .88
            tone[(xx < 8) | (xx > 231)] *= .88
            if cell >= 9:
                tone[((xx // 30 + yy // 40) % 2) == 0] *= .83
                tone[(xx % 60 < 3) | (yy % 80 < 3)] *= .77
        elif cell in (4, 14):
            tone += np.round(np.cos(xx * math.pi / 15) * 2) * .025
            tone[(xx % 60) < 2] *= .87
        elif cell in (5, 8):
            tone += np.round((np.sin(xx * .033) + np.cos(yy * .041)) * 2) * .016
            tone[(yy > 215)] *= .92
        else:
            tone += np.round(np.sin(xx * .045) * np.cos(yy * .05) * 2) * .018
        patch = np.clip(rgb[None, None, :] * tone[:, :, None], 0, 1)
        # Eight-pixel edge extrusion prevents another material bleeding into the island.
        tile = np.pad(patch, ((8, 8), (8, 8), (0, 0)), mode='edge')
        x, y = cell % 4 * 256, cell // 4 * 256
        pixels[y:y+256, x:x+256, :3] = np.where(tile <= .04045, tile / 12.92, ((tile + .055) / 1.055) ** 2.4)
    image = common.image('market-construction-atlas', 1024, 1024, pixels)
    return common.textured_material('market-construction-atlas', image, roughness=.92)


class Construction:
    def __init__(self, material):
        self.material = material
        self.objects = []

    def add(self, obj, cell, smooth=False):
        while obj.data.uv_layers:
            obj.data.uv_layers.remove(obj.data.uv_layers[0])
        uv = obj.data.uv_layers.new(name='UVMap')
        points = np.array([tuple(v.co) for v in obj.data.vertices])
        low, high = points.min(axis=0), points.max(axis=0)
        sizes = high - low
        for face in obj.data.polygons:
            # Dominant-axis projection preserves geometric orientation, unlike radial face UVs.
            normal = np.abs(np.array(tuple(face.normal)))
            axes = [a for a in range(3) if a != int(np.argmax(normal))]
            axes.sort(key=lambda a: -sizes[a])
            spans = [max(.015, sizes[a]) for a in axes]
            ratios = [min(1, span / 2) for span in spans]
            face_cell = cell
            if cell in (0, 1):
                end = int(np.argmax(normal)) == int(np.argmax(sizes))
                face_cell = 15 if end else cell
            for loop in face.loop_indices:
                point = obj.data.vertices[obj.data.loops[loop].vertex_index].co
                coords = [(point[a] - low[a]) / span for a, span in zip(axes, spans)]
                if cell in (0, 1):
                    # Each timber member takes a different strip of the same original wood.
                    strip = (len(self.objects) * 37 % 140)
                    values = (coords[0] * 224, coords[1] * 72 + strip)
                    if face_cell == 15:
                        values = (coords[0] * 224, coords[1] * 224)
                    uv.data[loop].uv = tuple(((face_cell % 4 if i == 0 else face_cell // 4) * 256 + 16 + values[i]) / 1024 for i in range(2))
                else:
                    uv.data[loop].uv = tuple(((cell % 4 if i == 0 else cell // 4) * 256 + 12 + coords[i] * 232 * ratios[i]) / 1024 for i in range(2))
            face.use_smooth = smooth
        self.objects.append(obj)
        return obj

    def box(self, size, at, cell=0, bevel=0):
        obj=self.add(common.box('timber', size, (0,0,0), self.material, bevel), cell)
        obj.location=at
        return obj

    def bar(self, a, b, size=.055, cell=0):
        direction = Vector(b) - Vector(a)
        obj = self.box((size, size, direction.length), (Vector(a) + Vector(b)) / 2, cell)
        obj.rotation_euler = direction.to_track_quat('Z', 'Y').to_euler()
        return obj

    def cylinder(self, radius, height, at, cell, sides=10):
        return self.add(common.cylinder('container', radius, height, at, self.material, sides), cell)

    def corrugated_roof(self, width=2.3, depth=1.7, height=2.35):
        # Closed corrugated sheet with a real edge, a gentle fall and distinct ribs.
        count = 24
        vertices = []
        for lower in (False, True):
            for side in (-1, 1):
                for i in range(count + 1):
                    x = -width / 2 + width * i / count
                    z = height + (i % 2) * .022 - side * .075 - (.008 if lower else 0)
                    vertices.append((x, side * depth / 2, z))
        n = count + 1
        faces = []
        for i in range(count):
            faces.extend([(i, i+1, n+i+1, n+i), (2*n+i, 3*n+i, 3*n+i+1, 2*n+i+1),
                          (i, 2*n+i, 2*n+i+1, i+1), (n+i, n+i+1, 3*n+i+1, 3*n+i)])
        faces.extend([(0, n, 3*n, 2*n), (count, 2*n+count, 3*n+count, n+count)])
        return self.add(mesh_object('roof-sheet', vertices, faces, self.material), 4)

    def fabric_roof(self, width=2.3, depth=1.8, height=2.4, cell=2):
        xs=(-width/2,-1.1,-.55,0,.55,1.1,width/2)
        ys=(-depth/2,-.825,0,.825,depth/2)
        nx,ny=len(xs)-1,len(ys)-1
        vertices=[]
        for lower in (False,True):
            for y in ys:
                for x in xs:
                    u=max(0,min(1,(x+1.1)/2.2))
                    v=max(0,min(1,(y+.825)/1.65))
                    sag=.16*math.sin(math.pi*u)*math.sin(math.pi*v)
                    over_x=max(0,(abs(x)-1.1)/.05)
                    over_y=max(0,(abs(y)-.825)/.075)
                    hem=.035*max(over_x,over_y)*(.65+.35*math.sin(math.pi*u)*math.sin(math.pi*v))
                    top=height+.004-.13*((y+.825)/1.65)-sag-hem
                    thickness=.008 if over_x or over_y else .004
                    vertices.append((x,y,top-(thickness if lower else 0)))
        stride,layer=nx+1,(nx+1)*(ny+1)
        faces = []
        for j in range(ny):
            for i in range(nx):
                a=j*stride+i;face=(a,a+1,a+stride+1,a+stride)
                faces.extend([face, tuple(layer+k for k in reversed(face))])
        rim=list(range(nx+1))+[j*stride+nx for j in range(1,ny+1)]+[ny*stride+i for i in range(nx-1,-1,-1)]+[j*stride for j in range(ny-1,0,-1)]
        faces.extend([(a,b,b+layer,a+layer) for a,b in zip(rim,rim[1:]+rim[:1])])
        return self.add(mesh_object('tensioned-canvas',vertices,faces,self.material),cell,True)

    def counter(self, width=2.0, depth=.72, height=.88):
        for x in (-width*.42,width*.42):
            for y in (-depth*.38,depth*.38):
                self.box((.065,.065,height-.04),(x,y,(height-.04)/2),1)
            self.box((.06,depth,.08),(x,0,.26),1)
        for i in range(4):
            self.box((width,depth/4-.008,.035),(0,-depth/2+(i+.5)*depth/4,height-.0175),0,.003)
        for y in (-depth*.4,depth*.4):self.box((width,.05,.08),(0,y,height-.09),1)

    def frame(self, width=2.0, depth=1.4, height=2.35, fall=.15):
        for x in (-width/2,width/2):
            for y in (-depth/2,depth/2):
                top=height-y/depth*fall
                self.box((.075,.075,top),(x,y,top/2),0,.002)
                self.bar((x,y,top-.43),(x-math.copysign(.28,x),y,top-.06),.045,1)
        for y in (-depth/2,depth/2):self.box((width+.1,.06,.09),(0,y,height-y/depth*fall-.045),1)
        for x in (-width/2,width/2):self.bar((x,-depth/2,height+fall/2-.045),(x,depth/2,height-fall/2-.045),.07,1)

    def crate(self, x, y, z=0):
        width, depth, height = .55,.38,.31
        for dx in (-width/2+.025,width/2-.025):
            for dy in (-depth/2+.025,depth/2-.025):self.box((.035,.035,height),(x+dx,y+dy,z+height/2),1)
        for layer in range(3):
            h=z+.05+layer*.105
            for dy in (-depth/2,depth/2):self.box((width,.018,.075),(x,y+dy,h),0)
            for dx in (-width/2,width/2):self.box((.018,depth,.075),(x+dx,y,h),0)
        for i in range(4):self.box((width/4-.009,depth,.02),(x-width/2+(i+.5)*width/4,y,z+.01),0)

    def produce(self, x, y, z, count=8):
        for i in range(count):
            radius = .062 + (i % 3) * .004
            height = radius * (1.65 + (i % 4) * .13)
            vertices = [(0, 0, 0)]
            for level, ring in ((.18, .76), (.50, 1.0), (.82, .73)):
                for k in range(10):
                    angle = k * math.tau / 10
                    vertices.append((radius * ring * math.cos(angle),
                                     radius * ring * math.sin(angle) * (.89 + i % 3 * .07),
                                     height * level))
            vertices.append((0, 0, height))
            faces = []
            for k in range(10):
                nxt=(k+1)%10
                faces.extend([(0,1+nxt,1+k),(21+k,21+nxt,31)])
                for ring in range(2):
                    a=1+ring*10
                    faces.append((a+k,a+nxt,a+10+nxt,a+10+k))
            obj = self.add(mesh_object('fresh-produce', vertices, faces, self.material),
                           7 if i % 3 == 0 else 6, True)
            obj.location=(x+(i%3)*.135+.014*math.sin(i*2),
                          y+(i//3)*.123+.012*math.cos(i*1.7),z)

    def cloth_ribbon(self, grid, cell, thickness=.003):
        """A closed thin textile shell; shared surface UVs preserve smooth fold normals."""
        points=np.array(grid,dtype=float)
        rows,cols=points.shape[:2]
        normals=np.empty_like(points)
        for j in range(rows):
            for i in range(cols):
                across=points[j,min(i+1,cols-1)]-points[j,max(0,i-1)]
                along=points[min(j+1,rows-1),i]-points[max(0,j-1),i]
                normal=np.cross(across,along);normal/=np.linalg.norm(normal)
                normals[j,i]=normal
        vertices=np.concatenate([(points+normals*thickness/2).reshape(-1,3),
                                 (points-normals*thickness/2).reshape(-1,3)])
        layer=rows*cols;faces=[]
        for j in range(rows-1):
            for i in range(cols-1):
                k=j*cols+i;face=(k,k+1,k+cols+1,k+cols)
                faces.extend([face,tuple(layer+v for v in reversed(face))])
        surface_count=len(faces)
        rim=list(range(cols))+[j*cols+cols-1 for j in range(1,rows)]+[(rows-1)*cols+i for i in range(cols-2,-1,-1)]+[j*cols for j in range(rows-2,0,-1)]
        faces.extend([(a,a+layer,b+layer,b) for a,b in zip(rim,rim[1:]+rim[:1])])
        obj=mesh_object('folded-textile',vertices.tolist(),faces,self.material)
        uv=obj.data.uv_layers.new(name='UVMap')
        for face in obj.data.polygons:
            face.use_smooth=face.index<surface_count
            for loop in face.loop_indices:
                k=obj.data.loops[loop].vertex_index%layer
                u=(k%cols)/(cols-1);v=(k//cols)/(rows-1)
                uv.data[loop].uv=((cell%4*256+12+u*100)/1024,
                                 (cell//4*256+12+v*200)/1024)
        self.objects.append(obj)
        return obj

    def folded_cloth(self, x=0, y=0, z=.8835):
        profile=((.20,.060),(-.19,.060),(-.225,.052),
                 (-.24,.035),(-.225,.018),(.14,.012))
        for stack in range(3):
            for layer in range(2):
                width=(.45,.48,.43)[stack]
                grid=[]
                for j,(along,high) in enumerate(profile):
                    row=[]
                    for i in range(5):
                        u=i/4
                        bend=-.014*math.sin(math.pi*u)+.004*(u-.5)*along/.24
                        edge=.012*math.sin(u*math.pi*1.5+stack)*((j==0)+(j==5))
                        row.append(((u-.5)*width,along+edge,high+bend))
                    grid.append(row)
                obj=self.cloth_ribbon(grid,9+(stack+layer)%3)
                obj.location=(x+(stack-1)*.5+layer*.018,y+layer*.018,z+layer*.05)
                obj.rotation_euler.z=(stack-1)*.035+layer*.025

    def textile_rail(self):
        self.box((1.9,.045,.055),(0,.60,1.92),0)
        for i in range(5):
            length=(.66,.79,.70,.84,.73)[i]
            grid=[]
            # Short rear return, rounded rail contact, then a gravity-hung front face.
            for row,(y,z,freedom) in enumerate(((.635,1.88,0),(.625,1.95,0),
                                               (.575,1.95,0),(.55,1.88,.2),
                                               (.55,1.91-length*.52,.7),(.55,1.91-length,1))):
                band=[]
                for k in range(5):
                    u=k/4
                    fold=freedom*(.035*math.cos(u*math.pi*2+.4*i)+.012*math.sin(u*math.pi))
                    hem=freedom*.017*math.sin(u*math.pi*1.5+i*.8)
                    band.append(((i-2)*.36+(u-.5)*(.37+i%2*.02),y+fold,z+hem))
                grid.append(band)
            self.cloth_ribbon(grid,9+i%3)


def cooking_stand(material):
    """Original unbranded steel stand and open pot, with real wall thickness."""
    c = Construction(material)
    for x in (-.39, .39):
        for y in (-.26, .26):
            c.box((.035, .035, .73), (x, y, .365), 14)
        c.box((.035, .55, .04), (x, 0, .20), 14)
    for y in (-.26, .26):
        c.box((.81, .035, .045), (0, y, .705), 14)
    c.bar((-.39, .26, .20), (.39, .26, .65), .025, 14)
    c.bar((.39, .26, .20), (-.39, .26, .65), .025, 14)
    c.box((.90, .64, .03), (0, 0, .745), 4)
    c.box((.54, .44, .018), (0, 0, .769), 14)
    c.box((.54, .016, .07), (0, .212, .813), 14)
    for x in (-.262, .262):
        c.box((.016, .44, .07), (x, 0, .813), 14)
    for x in (-.21, .21):
        c.box((.12, .016, .07), (x, -.212, .813), 14)
    for x in (-.20, -.10, 0, .10, .20):
        c.box((.018, .44, .016), (x, 0, .856), 14)
    count = 16
    vertices = []
    for radius, height in ((.245, .864), (.255, 1.119),
                           (.244, 1.119), (.234, .876)):
        for i in range(count):
            angle = i * math.tau / count
            vertices.append((radius * math.cos(angle), radius * math.sin(angle), height))
    faces = []
    for i in range(count):
        j = (i + 1) % count
        faces.extend([(i, j, count+j, count+i),
                      (count+i, count+j, 2*count+j, 2*count+i),
                      (2*count+i, 2*count+j, 3*count+j, 3*count+i)])
    faces.extend([tuple(reversed(range(count))), tuple(range(3*count, 4*count))])
    pot = c.add(mesh_object('open-cooking-pot', vertices, faces, material), 4)
    for face in pot.data.polygons:
        face.use_smooth = face.index < 3*count and face.index % 3 != 1
    for side in (-1, 1):
        for y in (-.055, .055):
            c.box((.10, .022, .022), (side*.29, y, 1.045), 4)
        c.box((.025, .132, .025), (side*.34, 0, 1.045), 14)
    return c.objects


def kiosk(material):
    """Original framed service kiosk; the open shell is decorative, not a walkable interior."""
    c = Construction(material)
    c.frame(2.04, 1.54, 2.335, .15)
    for i in range(5):
        c.box((.40, 1.50, .08), (-.82+i*.41, 0, .04), 1)
    c.box((2.0, .035, 2.14), (0, .7525, 1.15), 5)
    c.box((.035, 1.50, 2.14), (-1.0025, 0, 1.15), 5)
    c.box((.035, .22, 2.14), (1.0025, -.66, 1.15), 5)
    c.box((.035, .50, 2.14), (1.0025, .52, 1.15), 5)
    c.box((.035, .82, .20), (1.0025, -.14, 2.12), 5)
    c.box((2.0, .035, .875), (0, -.7525, .5175), 5)
    c.box((2.0, .035, .245), (0, -.7525, 2.2425), 5)
    c.box((2.15, .40, .045), (0, -.84, .9775), 0, .003)
    for x in (-.91, .91):
        c.bar((x, -.7525, .65), (x, -1.015, .955), .045, 1)
    c.box((1.98, .26, .035), (0, .60, 1.225), 0)
    for x in (-.94, .94):
        c.bar((x, .735, .95), (x, .48, 1.2075), .035, 1)
    c.corrugated_roof(2.40, 1.98, 2.335)
    return c.objects


def _profile(c, name, rings, at, cell, sides=12):
    """Closed turned section; ring order defines the outer wall and any inner return."""
    vertices = [(radius*math.cos(i*math.tau/sides), radius*math.sin(i*math.tau/sides), z)
                for radius, z in rings for i in range(sides)]
    faces = []
    for row in range(len(rings)-1):
        for i in range(sides):
            j = (i+1) % sides
            faces.append((row*sides+i, row*sides+j, (row+1)*sides+j, (row+1)*sides+i))
    faces.extend([tuple(reversed(range(sides))),
                  tuple(range((len(rings)-1)*sides, len(rings)*sides))])
    obj = c.add(mesh_object(name, vertices, faces, c.material), cell)
    for face in obj.data.polygons:
        face.use_smooth = face.index < (len(rings)-1)*sides
    obj.location = at
    return obj


def _taper(c, a, b, radius_a, radius_b, cell, sides=8):
    direction = Vector(b)-Vector(a)
    obj = _profile(c, 'tapered-member', ((radius_a, 0), (radius_b, direction.length)), a, cell, sides)
    obj.rotation_euler = direction.to_track_quat('Z', 'Y').to_euler()
    return obj


def _slab(c, name, corners, offset, cell):
    vertices = list(corners)+[tuple(p[i]+offset[i] for i in range(3)) for p in corners]
    faces = [(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    normal = (Vector(corners[1])-Vector(corners[0])).cross(Vector(corners[2])-Vector(corners[0]))
    if normal.dot(Vector(offset)) < 0:
        faces = [tuple(reversed(face)) for face in faces]
    return c.add(mesh_object(name, vertices, faces, c.material), cell)


def _wheel(c, x, y, radius=.34, width=.20):
    tyre = _profile(c, 'tyre', ((radius*.77,-width/2),(radius,-width*.34),
                               (radius,width*.34),(radius*.77,width/2)), (x,y,radius), 14, 10)
    tyre.rotation_euler.y = math.pi/2
    side = -1 if x < 0 else 1
    rim = _profile(c, 'wheel-rim', ((radius*.53,-.008),(radius*.53,.008)),
                   (x+side*(width/2+.004),y,radius), 4, 10)
    rim.rotation_euler.y = math.pi/2


def _opaque_glazing(obj):
    """Map pane height across one dark tonal band, never repeated metal/cloth stripes."""
    zs=[v.co.z for v in obj.data.vertices]
    low,span=min(zs),max(zs)-min(zs)
    if span <= 0:raise ValueError('Glazing has no vertical extent')
    uv=obj.data.uv_layers.active
    for loop in obj.data.loops:
        height=(obj.data.vertices[loop.vertex_index].co.z-low)/span
        # Interior pixel centres in cell14: a single half-band, with no narrow seam.
        uv.data[loop.index].uv=((2*256+8+14.5-11*height)/1024,
                                (3*256+8+100.5)/1024)
    return obj


def _closed_leaf(c, base, tip, width, cell=7, broad=True):
    """One closed, keeled blade contacting its supporting shoot; no alpha card."""
    start,end=Vector(base),Vector(tip)
    direction=end-start
    across=direction.cross(Vector((0,0,1)))
    if across.length < .0001:across=Vector((1,0,0))
    across.normalize()
    if broad:
        outline=[start,start+direction*.28+across*width*.78,
                 start+direction*.62+across*width,end,
                 start+direction*.62-across*width,start+direction*.28-across*width*.78]
    else:
        outline=[start,start+direction*.42+across*width,end,
                 start+direction*.42-across*width]
    centre=start+direction*.46
    count=len(outline)
    vertices=[tuple(v) for v in outline]+[tuple(centre+Vector((0,0,width*.16))),
                                         tuple(centre-Vector((0,0,width*.08)))]
    faces=[(count,i,(i+1)%count) for i in range(count)]
    faces.extend((count+1,(i+1)%count,i) for i in range(count))
    return c.add(mesh_object('closed-leaf-blade',vertices,faces,c.material),cell)


def _foliage(c, at, scale, phase, cell=7):
    """Two attached terminal shoots with overlapping leaves and open gaps between sprays."""
    sx,sy,sz=scale
    root=Vector(at)
    for shoot in range(2):
        angle=phase*.71+shoot*2.15
        direction=Vector((math.cos(angle),math.sin(angle),0))
        side=Vector((-direction.y,direction.x,0))
        end=root+Vector((direction.x*sx*.46,direction.y*sy*.46,sz*.82))
        _taper(c,root,end,min(sx,sy)*.030,min(sx,sy)*.012,1,4)
        for level,t in enumerate((.24,.52,.80)):
            anchor=root+(end-root)*t
            for sign in (-1,1):
                reach=.80-level*.13+.04*math.sin(phase+shoot)
                tip=anchor+Vector((side.x*sx*reach*sign+direction.x*sx*.32,
                                   side.y*sy*reach*sign+direction.y*sy*.32,
                                   sz*(.13-level*.10)))
                _closed_leaf(c,anchor,tip,min(sx,sy)*(.23-level*.025),cell)


def _frond_spine(c, points):
    """A continuous tapered cross-section along the frond, without overlapping end caps."""
    vertices=[]
    for i,p in enumerate(points):
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])
        side=tangent.cross(Vector((0,0,1))).normalized()
        up=tangent.cross(side).normalized()
        radius=.030-.023*i/(len(points)-1)
        vertices.extend(tuple(Vector(p)+radius*v) for v in (side,up,-side,-up))
    faces=[]
    for i in range(len(points)-1):
        for j in range(4):faces.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
    faces.extend([(3,2,1,0),tuple(range((len(points)-1)*4,len(points)*4))])
    return c.add(mesh_object('continuous-frond-spine',vertices,faces,c.material),5,True)


def water_tank(material):
    c=Construction(material)
    for x in (-.51,.51):
        for y in (-.51,.51):
            c.box((.085,.085,1.40),(x,y,.70),14)
            c.box((.18,.18,.05),(x,y,.025),8)
    for y in (-.51,.51):
        c.box((1.10,.07,.08),(0,y,1.36),14)
        c.bar((-.51,y,.15),(.51,y,1.32),.04,14)
        c.bar((.51,y,.15),(-.51,y,1.32),.04,14)
    for x in (-.51,.51):
        c.box((.07,1.10,.08),(x,0,1.36),14)
        c.bar((x,-.51,.15),(x,.51,1.32),.04,14)
        c.bar((x,.51,.15),(x,-.51,1.32),.04,14)
    c.box((1.38,1.38,.07),(0,0,1.435),4,.006)
    rings=[(.52,1.47),(.61,1.49),(.64,1.53)]
    for z in (1.70,2.02,2.34):
        rings.extend([(.64,z-.035),(.658,z-.012),(.658,z+.012),(.64,z+.035)])
    rings.extend([(.64,2.45),(.62,2.53),(.56,2.59),(.44,2.64),(.28,2.68),(.28,2.72)])
    _profile(c,'continuous-ribbed-tank',rings,(0,0,0),5,20)
    _profile(c,'tank-lid',((.29,2.72),(.30,2.74),(.27,2.77)),(0,0,0),14,12)
    _taper(c,(0,-.61,1.60),(0,-.78,1.60),.038,.038,4)
    _taper(c,(0,-.78,1.60),(0,-.78,1.43),.038,.032,4)
    _taper(c,(0,-.71,1.60),(0,-.71,1.66),.012,.012,4,6)
    c.box((.14,.025,.025),(0,-.71,1.66),14)
    return c.objects


def generator(material):
    c=Construction(material)
    for x in (-.43,.43):
        for y in (-.29,.29):
            c.box((.12,.12,.05),(x,y,.025),14)
            c.box((.035,.035,.82),(x,y,.46),14)
    for z in (.11,.87):
        for y in (-.29,.29):c.box((.895,.035,.035),(0,y,z),14)
        for x in (-.43,.43):c.box((.035,.615,.035),(x,0,z),14)
    for x in (-.20,.20):c.box((.16,.38,.09),(x,0,.165),14)
    body=_profile(c,'engine-housing',((.19,-.18),(.19,.18)),(0,0,.40),4,10)
    body.rotation_euler.x=math.pi/2
    c.box((.48,.15,.42),(0,-.24,.42),8,.008)
    for z in (.28,.35,.42,.49,.56):c.box((.42,.025,.018),(0,-.325,z),14)
    c.box((.56,.40,.17),(0,.015,.705),5,.012)
    for x in (-.23,.23):c.box((.035,.04,.07),(x,.02,.585),14)
    _profile(c,'fuel-cap',((.055,.79),(.055,.82)),(0,.06,0),14,8)
    _profile(c,'muffler',((.065,.40),(.065,.65)),(.30,.16,0),14,8)
    _taper(c,(.17,.16,.42),(.30,.16,.42),.025,.025,14,6)
    _taper(c,(.30,.16,.65),(.30,.25,.73),.025,.025,14,6)
    c.bar((-.43,.29,.87),(.43,.29,.87),.05,14)
    return c.objects


def minibus(material):
    c=Construction(material)
    c.box((1.34,3.70,.10),(0,0,.55),14)
    for y in (-1.30,1.30):
        _taper(c,(-.83,y,.34),(.83,y,.34),.05,.05,14)
        for x in (-.62,.62):c.box((.10,.18,.21),(x,y,.445),14)
    for side in (-1,1):
        x=side*.82
        c.box((.035,4.10,.35),(x,0,.975),5)
        for y,length in ((-1.90,.30),(0,1.80),(1.90,.30)):
            c.box((.035,length,.30),(x,y,.65),5)
        for y in (-1.20,-.40,.40,1.20):
            _opaque_glazing(_slab(c,'side-glazing',((side*.815,y-.36,1.20),(side*.815,y+.36,1.20),
                                   (side*.740,y+.36,1.85),(side*.740,y-.36,1.85)),(side*.015,0,0),14))
        for y in (-1.60,-.80,0,.80,1.60):
            c.bar((side*.82,y,1.15),(side*.74,y,1.90),.055,5)
        c.box((.065,3.90,.08),(side*.745,.15,1.90),5)
        c.box((.18,.46,.05),(side*.79,-.40,.475),14)
        c.box((.022,.12,.025),(side*.85,-.16,1.08),14)
        c.bar((side*.79,-1.70,1.36),(side*.96,-1.65,1.48),.022,14)
        _opaque_glazing(c.box((.10,.045,.16),(side*.98,-1.65,1.49),14))
    for y in (-2.025,2.025):c.box((1.64,.05,.65),(0,y,.825),5)
    c.box((1.52,3.90,.08),(0,.15,1.96),5,.02)
    _opaque_glazing(_slab(c,'front-glazing',((-.82,-2.02,1.15),(.82,-2.02,1.15),(.74,-1.77,1.90),(-.74,-1.77,1.90)),(0,.025,0),14))
    for side in (-1,1):c.bar((side*.82,-2.025,1.15),(side*.74,-1.775,1.90),.055,5)
    c.bar((-.82,-2.025,1.15),(.82,-2.025,1.15),.055,5)
    c.bar((-.74,-1.775,1.90),(.74,-1.775,1.90),.055,5)
    _opaque_glazing(c.box((1.37,.025,.61),(0,2.025,1.53),14))
    for x in (-.735,.735):c.box((.10,.055,.75),(x,2.025,1.525),5)
    for z in (1.16,1.89):c.box((1.52,.055,.065),(0,2.025,z),5)
    for y in (-2.09,2.09):c.box((1.72,.12,.13),(0,y,.55),14,.015)
    for x in (-.58,.58):
        c.box((.26,.025,.13),(x,-2.055,.93),4)
        c.box((.10,.025,.24),(x,2.055,.95),13)
    for x in (-.83,.83):
        for y in (-1.30,1.30):_wheel(c,x,y)
    return c.objects


def three_wheeler(material):
    c=Construction(material)
    c.box((.96,1.50,.12),(0,.15,.54),14,.01)
    c.box((1.12,1.45,.035),(0,.15,.6175),5)
    c.box((1.17,.06,.78),(0,.85,1.00),5)
    for x in (-.56,.56):
        c.box((.06,1.15,.12),(x,.27,.69),5)
        for y in (-.36,.84):c.bar((x,y,.62),(x,y,1.872),.045,14)
    for x in (-.40,.40):c.box((.08,.35,.105),(x,.53,.6875),14)
    c.box((.25,.25,.17),(0,-.25,.72),14)
    c.box((1.0,.42,.10),(0,.53,.79),14,.018)
    c.box((1.0,.09,.38),(0,.76,1.03),14,.018)
    c.box((.38,.35,.09),(0,-.25,.85),14,.015)
    c.box((.38,.07,.32),(0,-.08,1.045),14,.015)
    vertices=[]
    for lower in (False,True):
        for y in (-.50,.94):
            for i in range(5):
                x=-.70+i*.35
                vertices.append((x,y,1.85+.10*(1-(x/.70)**2)-(.015 if lower else 0)))
    faces=[]
    for i in range(4):
        faces.extend([(i,i+1,6+i,5+i),(10+i,15+i,16+i,11+i),
                      (i,10+i,11+i,i+1),(5+i,6+i,16+i,15+i)])
    faces.extend([(0,5,15,10),(4,14,19,9)])
    c.add(mesh_object('curved-cabin-roof',vertices,faces,material),14,True)
    _opaque_glazing(_slab(c,'windscreen',((-.48,-.65,1.05),(.48,-.65,1.05),(.48,-.47,1.80),(-.48,-.47,1.80)),(0,.025,0),14))
    for x in (-.50,.50):c.bar((x,-.66,1.04),(x,-.48,1.82),.045,14)
    for x in (-.50,.50):c.bar((x,-.48,1.82),(x,-.36,1.89),.035,14)
    for y,z in ((-.66,1.04),(-.48,1.82)):c.box((1.04,.045,.045),(0,y,z),14)
    vertices=[(-.53,-.55,.59),(.53,-.55,.59),(.25,-1.00,.55),(-.25,-1.00,.55),
              (-.50,-.55,1.22),(.50,-.55,1.22),(.22,-1.00,.94),(-.22,-1.00,.94)]
    c.add(mesh_object('tapered-nose',vertices,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],material),5)
    for x in (-.07,.07):_taper(c,(x,-.89,.75),(x,-1.07,.28),.025,.025,4)
    _taper(c,(0,-.80,.74),(0,-.66,1.14),.035,.025,14)
    c.box((.40,.025,.025),(0,-.66,1.14),14)
    _taper(c,(-.60,.58,.28),(.60,.58,.28),.045,.045,14)
    for x,y in ((-.60,.58),(.60,.58),(0,-1.07)):_wheel(c,x,y,.28,.16)
    c.box((.16,.025,.10),(0,-1.025,.86),4)
    return c.objects


def bollard(material):
    c=Construction(material)
    _profile(c,'anchor-base',((.16,0),(.18,.025),(.16,.11)),(0,0,0),8)
    _profile(c,'bollard-shaft',((.085,.11),(.075,.18),(.075,.91)),(0,0,0),14)
    _profile(c,'rounded-cap',((.095,.91),(.10,.94),(.055,.99)),(0,0,0),14)
    _profile(c,'reflective-collar',((.078,.80),(.078,.85)),(0,0,0),4)
    return c.objects


def planter(material):
    c=Construction(material)
    _profile(c,'thick-planter',((.28,0),(.46,.55),(.425,.55),(.26,.045)),(0,0,0),13)
    _profile(c,'soil',((.395,.455),(.395,.475)),(0,0,0),12)
    for i in range(3):
        angle=i*math.tau/3
        end=(.19*math.cos(angle),.19*math.sin(angle),.84+i*.06)
        _taper(c,(0,0,.47),end,.026,.012,1,6)
        _foliage(c,end,(.28,.25,.34),i+.4,7)
    return c.objects


def broadleaf_tree(material):
    c=Construction(material)
    _taper(c,(0,0,0),(.06,0,1.55),.18,.12,1)
    _taper(c,(.06,0,1.55),(-.04,.04,2.48),.12,.055,1)
    for i in range(6):
        angle=i*math.tau/6+.13+.12*math.sin(i*1.7)
        reach=.88+.10*math.sin(i*2.1)
        end=(reach*math.cos(angle),reach*math.sin(angle),2.18+(i%3)*.15)
        _taper(c,(.03,0,1.40+i*.06),end,.09,.035,1)
        _foliage(c,end,(.76,.68,.65),i+.2,7)
    _foliage(c,(-.04,.04,2.48),(.81,.77,.90),.7,7)
    return c.objects


def palm(material):
    c=Construction(material)
    _profile(c,'tapered-trunk',((.20,0),(.16,.35),(.13,1.40),(.105,2.50),(.09,3.35)),(0,0,0),1,8)
    for i in range(3):
        angle=i*math.tau/3
        _taper(c,(.27*math.cos(angle),.27*math.sin(angle),.04),(0,0,.60),.055,.035,1,6)
    _profile(c,'crown-base',((.12,3.10),(.20,3.30),(.13,3.45)),(0,0,0),5,8)
    for i in range(6):
        angle=i*math.tau/6+.05*math.sin(i)
        direction=Vector((math.cos(angle),math.sin(angle),0))
        side=Vector((-direction.y,direction.x,0))
        length=1.80+.08*math.sin(i*1.7)
        def spine(t):
            return direction*(length*t)+Vector((0,0,3.35+.47*math.sin(math.pi*t)-.82*t*t))
        points=[spine(j/5) for j in range(6)]
        _frond_spine(c,points)
        for j in range(10):
            t=.10+j*.085
            segment=min(4,int(t*5));fraction=t*5-segment
            anchor=points[segment].lerp(points[segment+1],fraction)
            for sign in (-1,1):
                reach=.62*(1-t)+.12
                tip=anchor+direction*(.18+.14*t)+side*(reach*sign)+Vector((0,0,-.12-.22*t))
                _closed_leaf(c,anchor,tip,.105*(1-t)+.035,7,False)
    return c.objects


def acacia(material):
    c=Construction(material)
    _taper(c,(0,0,0),(.07,0,1.10),.18,.12,1)
    _taper(c,(.07,0,1.10),(.02,0,1.80),.12,.065,1)
    for i in range(6):
        angle=i*math.tau/6+.2+.11*math.sin(i*1.3)
        reach=1.12+.12*math.sin(i*2.2)
        end=(reach*math.cos(angle),reach*math.sin(angle),2.02+(i%2)*.12)
        _taper(c,(.03,0,1.36),end,.10,.035,1)
        _foliage(c,end,(.99,.78,.38),i+.5,7)
    _foliage(c,(.02,0,1.80),(.95,.90,.70),.5,7)
    return c.objects


def wall(material):
    c=Construction(material)
    c.box((3.0,.42,.15),(0,0,.075),8)
    c.box((2.65,.26,1.35),(0,0,.825),8)
    for side in (-1,1):
        for row in range(4):
            for col in range(3):
                c.box((.855,.025,.28),((col-1)*.875,side*.1425,.30+row*.30),8)
    for x in (-1.33,1.33):
        c.box((.34,.38,1.55),(x,0,.775),8,.008)
        c.box((.43,.46,.10),(x,0,1.60),8,.008)
    c.box((2.65,.37,.10),(0,0,1.55),8,.008)
    return c.objects


def gate(material):
    c=Construction(material)
    for x in (-1.08,1.08):
        c.box((.38,.42,.14),(x,0,.07),8,.008)
        c.box((.24,.28,2.06),(x,0,1.17),8,.008)
        c.box((.31,.35,.08),(x,0,2.24),8,.008)
    for side in (-1,1):
        centre=side*.48
        for x in (centre-.44,centre+.44):c.box((.04,.06,1.60),(x,0,.95),14)
        for z in (.15,1.75):c.box((.92,.06,.04),(centre,0,z),14)
        for i in range(6):c.box((.018,.035,1.54),(centre-.34+i*.136,0,.95),14)
        c.bar((centre-side*.42,0,.18),(centre+side*.42,0,1.72),.025,14)
        for z in (.37,1.53):_profile(c,'gate-hinge',((.035,z-.06),(.035,z+.06)),(side*.95,0,0),4,6)
        c.box((.18,.035,.035),(side*.13,-.02,1.0),14)
        c.box((.025,.07,.17),(side*.10,-.065,.99),4)
    c.box((.19,.035,.035),(0,-.0425,1.10),14)
    return c.objects


def street_lamp(material):
    c=Construction(material)
    _profile(c,'pole-base',((.17,0),(.17,.07),(.11,.16)),(0,0,0),8)
    _profile(c,'tapered-pole',((.09,.16),(.075,.70),(.055,3.40),(.045,3.60)),(0,0,0),14,10)
    points=((0,0,3.58),(0,-.20,3.80),(0,-.80,3.80),(0,-.95,3.72))
    for a,b in zip(points,points[1:]):_taper(c,a,b,.035,.032,14)
    c.box((.28,.52,.10),(0,-.92,3.68),14,.018)
    c.box((.23,.45,.016),(0,-.92,3.626),4)
    for x in (-.10,.10):
        for y in (-.10,.10):_profile(c,'anchor-bolt',((.018,.07),(.018,.10)),(x,y,0),4,6)
    for z in (.22,3.35):_profile(c,'pole-collar',((.09 if z<1 else .065,z),(.09 if z<1 else .065,z+.035)),(0,0,0),4,8)
    return c.objects


def sign_frame(material):
    c=Construction(material)
    for x in (-.70,.70):
        c.box((.22,.25,.04),(x,0,.02),14,.004)
        _profile(c,'sign-post',((.035,.04),(.035,2.40)),(x,0,0),14,8)
    c.box((1.65,.045,.82),(0,-.06,1.94),8)
    for x in (-.845,.845):c.box((.04,.055,.90),(x,-.06,1.94),14)
    for z in (1.51,2.37):c.box((1.73,.055,.04),(0,-.06,z),14)
    for x in (-.70,.70):
        for z in (1.60,2.28):
            c.box((.06,.07,.05),(x,-.025,z),14)
            bolt=_profile(c,'panel-bolt',((.014,-.008),(.014,.008)),(x,-.089,z),4,6)
            bolt.rotation_euler.x=math.pi/2
    return c.objects


_ADDITIONAL_PHYSICAL_BUILDERS = {
    'water-tank': water_tank, 'generator': generator, 'minibus': minibus,
    'three-wheeler': three_wheeler, 'bollard': bollard, 'planter': planter,
    'broadleaf-tree': broadleaf_tree, 'palm': palm, 'acacia': acacia,
    'wall': wall, 'gate': gate, 'street-lamp': street_lamp, 'sign-frame': sign_frame,
}


def make_sample_prop(name, material):
    c=Construction(material)
    if name=='market-stall':
        c.frame();c.counter();c.corrugated_roof()
        c.box((2.02,.035,.43),(0,.69,.53),1)
        c.folded_cloth()
    elif name=='canopy':
        c.frame(2.2,1.65,2.335,.13);c.fabric_roof()
    elif name=='crate-stack':
        c.crate(-.30,0);c.crate(.30,.035);c.crate(-.28,.015,.31)
    elif name=='produce-stand':
        c.counter(1.7,.75,.84)
        for x in (-.56,0,.56):
            c.box((.50,.68,.025),(x,0,.855),0)
            for y in (-.34,.34):c.box((.50,.022,.10),(x,y,.895),0)
            c.produce(x-.14,-.13,.88,(5,7,6)[int(round((x+.56)/.56))])
    elif name=='bench':
        for x in (-.64,.64):
            for y in (-.19,.19):c.box((.065,.065,.44),(x,y,.22),1,.003)
            c.bar((x,-.19,.12),(x,.19,.39),.04,1)
        for i in range(4):c.box((1.65,.095,.035),(0,-.165+i*.11,.4575),0,.004)
        for x in (-.64,.64):c.box((.055,.055,.50),(x,.23,.68),1)
        for z in (.68,.86):c.box((1.65,.035,.13),(0,.23,z),0,.004)
    elif name=='cooking-stand':
        return cooking_stand(material)
    elif name=='kiosk':
        return kiosk(material)
    elif name in _ADDITIONAL_PHYSICAL_BUILDERS:
        return _ADDITIONAL_PHYSICAL_BUILDERS[name](material)
    else:raise ValueError('Outside the physical prop vocabulary')
    return c.objects


def finish_sample(name, objects, material, cap):
    obj=common.join(objects,name);normalize(obj)
    obj.data.materials.clear();obj.data.materials.append(material)
    for p in obj.data.polygons:p.material_index=0
    count=common.triangles(obj)
    if count>cap:raise ValueError(f'{name}: {count} triangles exceed {cap}')
    return obj


def market_hero(material):
    """Original mixed-goods lane in metres, not a surveyed Makola stall arrangement."""
    result=[]
    for x,y,kind in ((-1.18,.65,'market-stall'),(1.18,.65,'canopy')):
        objects=make_sample_prop(kind,material)
        for obj in objects:obj.location.x+=x;obj.location.y+=y
        result.extend(objects)
    c=Construction(material)
    c.counter(1.8,.72,.88)
    for obj in c.objects:obj.location.x+=1.18;obj.location.y+=.65
    result.extend(c.objects)
    c=Construction(material);c.crate(1.6,-1.18);c.produce(1.4,-1.25,.33,8)
    cloth=Construction(material);cloth.textile_rail()
    for obj in cloth.objects:obj.location.x-=1.18;obj.location.y+=.65
    result.extend(cloth.objects)
    for i in range(4):
        c.cylinder(.115,.17,(-.1+i*.28,.65,.965),2)
        c.cylinder(.12,.025,(-.1+i*.28,.65,1.055),12+i%2)
    result.extend(c.objects)
    return result


def export_physical_kit(out, cloth=None):
    """Export physical props in metres; omitted cloth retains the reviewed base palette."""
    common.reset()
    material = painted_atlas(cloth)
    objects = [finish_sample(name, make_sample_prop(name, material), material, 1500)
               for name in PHYSICAL_PROPS]
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    common.export(out, objects)
