"""Shared by the native character clip scripts (native-fight-clips.py, native-football-clips.py): the small maths, the rig that
solves a pose for the native 53-joint skeleton, the pose blender, and the build and export of a clips file.

Reads the two native base bodies (public/character-lab/models/round4/{male,female}/base.glb: CC0 MakeHuman bodies, one skeleton of 53
joints, a different rest pose for each). Every clip is built by solving a pose for each frame from a few plain numbers: where the
pelvis is, how the hips, chest and head turn, where each wrist and each foot is. Two-bone solvers place the arms and the legs (so a
knee or an elbow only ever bends one way, and a planted foot stays planted), and each bone's rotation is written for the body's own
rest pose. Nothing comes from captured motion. The file holds the animations only (no mesh): `<clip>.male` and `<clip>.female`.
"""
import math
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402
import bpy  # noqa: E402
from mathutils import Matrix, Quaternion, Vector  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROUND4 = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'public', 'character-lab', 'models', 'round4'))
FPS = 60
D = math.radians


def common_options(p):
    p.add_argument('--only', default='', help='comma list of clip names (default all)')
    p.add_argument('--bodies', default='male,female')
    p.add_argument('--preview', default='', help='also write a male body with these clips, for preview.py')
    p.add_argument('--preview-body', default='male')
    p.add_argument('--check', action='store_true', help='print solver errors (reach, planted feet, joints)')


# ---- small maths -------------------------------------------------------------------------------------------------------------

def rot(axis, a):
    return Matrix.Rotation(a, 3, axis)


def euler(yaw=0.0, pitch=0.0, roll=0.0):
    """Armature-space rotation: yaw about Z (up), pitch about X (positive leans forward, toward -Y), roll about Y."""
    return rot('Z', yaw) @ rot('Y', roll) @ rot('X', pitch)


def frac(R, f):
    return Quaternion().slerp(R.to_quaternion(), f).to_matrix()


def slerp(A, B, w):
    return A.to_quaternion().slerp(B.to_quaternion(), w).to_matrix()


def lerp(a, b, w):
    if isinstance(a, (tuple, list, Vector)):
        return type(a)(x + (y - x) * w for x, y in zip(a, b)) if not isinstance(a, Vector) else a.lerp(b, w)
    return a + (b - a) * w


def ease(kind, w):
    if kind == 'lin':
        return w
    if kind == 'out':
        return 1 - (1 - w) ** 3
    if kind == 'in':
        return w ** 3
    return w * w * (3 - 2 * w)


def frame_of(d, n):
    """An orthonormal frame (columns x, y, z) whose y runs along `d` and whose x is as close to `n` as can be."""
    y = Vector(d).normalized()
    x = Vector(n) - y * Vector(n).dot(y)
    if x.length < 1e-6:
        x = Vector((1, 0, 0)) - y * y.x
    x.normalize()
    z = x.cross(y).normalized()
    x = y.cross(z).normalized()
    return Matrix(((x.x, y.x, z.x), (x.y, y.y, z.y), (x.z, y.z, z.z)))


def ik2(S, T, L1, L2, pole):
    """Where the middle joint goes for a two-bone limb from S to T, bending towards `pole`. Returns (middle, reach error)."""
    d = T - S
    far = L1 + L2
    dist = d.length
    err = max(0.0, dist - far * 0.998)
    dist = min(max(dist, abs(L1 - L2) * 1.02 + 1e-4), far * 0.998)
    direction = d.normalized() if d.length > 1e-9 else Vector((0, 0, -1))
    perp = pole - direction * pole.dot(direction)
    if perp.length < 1e-6:
        perp = Vector((0, -1, 0)) - direction * direction.y * -1
    perp.normalize()
    a = (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist)
    a = min(1.0, max(-1.0, a))
    ang = math.acos(a)
    mid = S + direction * (L1 * math.cos(ang)) + perp * (L1 * math.sin(ang))
    return mid, err, perp, direction


# ---- the rig -----------------------------------------------------------------------------------------------------------------

class Rig:
    SIDES = ('l', 'r')

    def __init__(self, arm):
        self.arm = arm
        self.head = {}
        self.o0 = {}
        self.parent = {}
        for b in arm.data.bones:
            self.head[b.name] = b.head_local.copy()
            self.o0[b.name] = b.matrix_local.to_3x3()
            self.parent[b.name] = b.parent.name if b.parent else None
        self.order = [b.name for b in arm.data.bones]  # parents come before children
        h = self.head
        self.sign = {'l': 1.0, 'r': -1.0}
        self.limb = {}
        for s in self.SIDES:
            S, E, W = h[f'upperarm_{s}'], h[f'lowerarm_{s}'], h[f'hand_{s}']
            H, K, A, B = h[f'thigh_{s}'], h[f'calf_{s}'], h[f'foot_{s}'], h[f'ball_{s}']
            self.limb[f'arm_{s}'] = dict(S=S, E=E, W=W, L1=(E - S).length, L2=(W - E).length, pole=self._rest_pole(S, E, W))
            self.limb[f'leg_{s}'] = dict(S=H, E=K, W=A, L1=(K - H).length, L2=(A - K).length, pole=self._rest_pole(H, K, A))
            self.limb[f'arm_{s}']['F0u'] = frame_of(E - S, (E - S).cross(W - E))
            self.limb[f'arm_{s}']['F0l'] = frame_of(W - E, (E - S).cross(W - E))
            self.limb[f'leg_{s}']['F0u'] = frame_of(K - H, (K - H).cross(A - K))
            self.limb[f'leg_{s}']['F0l'] = frame_of(A - K, (K - H).cross(A - K))
            self.limb[f'leg_{s}']['ball'] = B - A
        self.pelvis0 = h['pelvis']
        self.fingers = [n for n in self.order if n.split('_')[0] in ('index', 'middle', 'ring', 'pinky', 'thumb')]
        for pb in arm.pose.bones:
            pb.rotation_mode = 'QUATERNION'

    @staticmethod
    def _rest_pole(S, E, W):
        axis = (W - S).normalized()
        v = (E - S) - axis * (E - S).dot(axis)
        return v.normalized() if v.length > 1e-5 else Vector((0, -1, 0))

    def pose(self, P):
        """FK + limb solving for one pose. Returns (absolute rotations by bone, pelvis offset, positions, checks)."""
        h, Dm, pos, checks = self.head, {}, {}, {}
        I = Matrix.Identity(3)
        po = Vector(P['pel'][0])
        pos['pelvis'] = h['pelvis'] + po
        Dm['pelvis'] = euler(*P['pel'][1])
        t_twist, t_lean, t_side = P['chest']
        T = euler(t_twist, t_lean, t_side)
        Dm['spine_01'] = frac(T, 0.25) @ Dm['pelvis']
        Dm['spine_02'] = frac(T, 0.6) @ Dm['pelvis']
        Dm['spine_03'] = T @ Dm['pelvis']
        parent_of = {'spine_01': 'pelvis', 'spine_02': 'spine_01', 'spine_03': 'spine_02'}

        def place(name, par):
            pos[name] = pos[par] + Dm[par] @ (h[name] - h[par])
        for n, par in parent_of.items():
            place(n, par)
        Dm['head'] = euler(*P['head'])  # absolute: where the face looks (yaw 0 is straight at the other fighter)
        Dm['neck_01'] = slerp(Dm['spine_03'], Dm['head'], 0.5)
        place('neck_01', 'spine_03')
        place('head', 'neck_01')
        for s in self.SIDES:
            sg = self.sign[s]
            prot, elev = P['clav_' + s]
            Dm['clavicle_' + s] = (rot('Z', -sg * prot) @ rot('Y', sg * elev)) @ Dm['spine_03']
            place('clavicle_' + s, 'spine_03')
            place('upperarm_' + s, 'clavicle_' + s)
        # arms
        for s in self.SIDES:
            lim = self.limb['arm_' + s]
            S = pos['upperarm_' + s]
            T = self.target(P['hand_' + s], S, pos, Dm, P)
            pole = (Dm['spine_03'] @ lim['pole']) + Vector(P['pole_' + s])
            self.solve_limb(lim, S, T, pole, 'upperarm_' + s, 'lowerarm_' + s, 'hand_' + s, pos, Dm, checks, 'arm_' + s)
            pr = P['pron_' + s]
            if pr:
                axis = (pos['hand_' + s] - pos['lowerarm_' + s]).normalized()
                Dm['lowerarm_' + s] = Matrix.Rotation(pr * 0.4, 3, axis) @ Dm['lowerarm_' + s]
                Dm['hand_' + s] = Matrix.Rotation(pr, 3, axis) @ Dm['hand_' + s]
        # legs
        for s in self.SIDES:
            lim = self.limb['leg_' + s]
            Hh = pos['pelvis'] + Dm['pelvis'] @ (h['thigh_' + s] - h['pelvis'])
            pos['thigh_' + s] = Hh
            ankle, Dfoot, rel, loose = self.foot(P['foot_' + s], pos, Dm, lim, P['pel'][1][0])
            # the knee points where the foot points, in the pelvis's own frame (so a body lying down bends its knees up, not sideways)
            pole = Dm['pelvis'] @ (rot('Z', rel) @ Vector((0, -1, 0)) + Vector((0.18 * self.sign[s], 0, 0)))
            self.solve_limb(lim, Hh, ankle, pole, 'thigh_' + s, 'calf_' + s, 'foot_' + s, pos, Dm, checks, 'leg_' + s)
            Dm['foot_' + s] = Dfoot
            Dm['ball_' + s] = slerp(rot('Z', rel + P['pel'][1][0]), Dfoot, loose)
            pos['ball_' + s] = pos['foot_' + s] + Dfoot @ lim['ball']
            checks['ball_' + s] = pos['ball_' + s]
        return Dm, po, pos, checks

    def target(self, spec, S, pos, Dm, P):
        """The wrist's place: blended from one or two (weight, kind, vector) entries. 'c' chest-local, 's' from the shoulder."""
        total = Vector((0, 0, 0))
        for w, kind, v in spec:
            v = Vector(v)
            if kind == 'c':
                total += w * (pos['spine_03'] + Dm['spine_03'] @ v)
            elif kind == 's':
                total += w * (S + v)
            else:  # 'p' pelvis-local
                total += w * (pos['pelvis'] + Dm['pelvis'] @ v)
        return total

    def foot(self, spec, pos, Dm, lim, pelvis_yaw):
        """Ankle place, orientation, yaw in the pelvis's frame, and how much of it is off the floor, of a foot spec list [(weight, kind, ...)]."""
        ank, Rs, yaws, wsum, loose = Vector((0, 0, 0)), [], 0.0, 0.0, 0.0
        for item in spec:
            w, kind = item[0], item[1]
            if kind == 'ball':   # planted: ball position, yaw, heel lift; the ankle follows
                (bx, by, bz), yaw, heel = item[2], item[3], item[4]
                Df = rot('Z', yaw) @ rot('X', heel)
                a = Vector((bx, by, bz)) - Df @ lim['ball']
                rel = yaw - pelvis_yaw
            elif kind == 'ank':  # free: ankle position, then yaw, pitch, roll
                a, (yaw, pitch, roll) = Vector(item[2]), item[3]
                Df = euler(yaw, pitch, roll)
                rel = yaw - pelvis_yaw
                loose += w
            else:                # 'pel': ankle in pelvis-local axes
                a, (yaw, pitch, roll) = pos['pelvis'] + Dm['pelvis'] @ Vector(item[2]), item[3]
                Df = Dm['pelvis'] @ euler(yaw, pitch, roll)
                rel = yaw
                loose += w
            ank += w * a
            Rs.append((w, Df))
            yaws += w * rel
            wsum += w
        Dfoot = Rs[0][1]
        acc = Rs[0][0]
        for w, Df in Rs[1:]:
            acc += w
            Dfoot = slerp(Dfoot, Df, w / acc)
        return ank, Dfoot, yaws / max(wsum, 1e-6), loose / max(wsum, 1e-6)

    def solve_limb(self, lim, S, T, pole, up, low, end, pos, Dm, checks, key):
        E, err, perp, direction = ik2(S, T, lim['L1'], lim['L2'], pole)
        n = -(direction.cross(perp))
        # The frame normal at rest is (E0-S0)x(W0-E0): the same sense as -(dir x perp) when the limb bends the way it rested.
        Fu = frame_of(E - S, n)
        Fl = frame_of((T if err == 0 else S + (T - S).normalized() * (lim['L1'] + lim['L2'])) - E, n)
        Dm[up] = Fu @ lim['F0u'].inverted()
        Dm[low] = Fl @ lim['F0l'].inverted()
        Dm[end] = Dm[low]
        pos[low] = E
        pos[end] = E + Dm[low] @ (lim['W'] - lim['E'])
        checks[key + '_err'] = err
        checks[key + '_end'] = pos[end]
        checks[key + '_mid'] = E
        checks[key + '_want'] = T

    # ---- writing a pose to the Blender armature ----
    def apply(self, P, frame, finger_curl):
        Dm, po, pos, checks = self.pose(P)
        bones = self.arm.pose.bones
        absolute = {}
        for name in self.order:
            par = self.parent[name]
            Dp = absolute.get(par, Matrix.Identity(3))
            if name in self.fingers:
                continue
            Db = Dm.get(name, Dp)
            absolute[name] = Db
            B = self.o0[name].inverted() @ Dp.inverted() @ Db @ self.o0[name]
            bones[name].rotation_quaternion = B.to_quaternion()
            bones[name].keyframe_insert('rotation_quaternion', frame=frame)
        # translation of the pelvis only, in its own rest axes
        pb = bones['pelvis']
        pb.location = self.o0['pelvis'].inverted() @ po
        pb.keyframe_insert('location', frame=frame)
        self.fingers_pose(bones, finger_curl, P, frame)
        return checks

    def fingers_pose(self, bones, curl, P, frame):
        for s in self.SIDES:
            k = P['fist_' + s]
            for name in self.fingers:
                if not name.endswith('_' + s):
                    continue
                part, idx = name.split('_')[0], int(name.split('_')[1])
                if part == 'thumb':
                    ang = (D(30), D(35), D(35))[idx - 1] * k
                    q = rot('X', ang * curl[1])
                else:
                    ang = (D(85), D(100), D(60))[idx - 1] * k
                    q = rot('X', ang * curl[0])
                bones[name].rotation_quaternion = q.to_quaternion()
                bones[name].keyframe_insert('rotation_quaternion', frame=frame)


# ---- pose helpers -------------------------------------------------------------------------------------------------------------
# The numbers of one pose: `pel` (pelvis offset in metres, then yaw / lean / roll), `chest` (turn, lean, side bend, relative to the
# pelvis), `head` (where the face looks: yaw, pitch, roll, absolute), `clav_*` (shoulder forward, up), `hand_*` and `foot_*` (lists of
# weighted targets), `pole_*` (which way an elbow points), `pron_*` (fist turned palm-down), `fist_*`.

def hand(kind, v):
    return [(1.0, kind, v)]


def planted(x, y, yaw, heel=0.0, lift=0.0):
    return [(1.0, 'ball', (x, y, 0.012 + lift), yaw, heel)]

def with_pose(base, **kw):
    out = dict(base)
    out.update(kw)
    return out


def blend_params(A, B, w):
    """Pose parameters between two keys. Limb specs are lists of weighted entries (blended by weight), the rest by value."""
    out = {}
    for k in A:
        a, b = A[k], B[k]
        if k.startswith(('hand_', 'foot_')):
            out[k] = a if w <= 0 else b if w >= 1 else [(wt * (1 - w), *rest) for wt, *rest in a] + [(wt * w, *rest) for wt, *rest in b]
        elif k == 'pel':
            out[k] = (lerp(a[0], b[0], w), lerp(a[1], b[1], w))
        else:
            out[k] = lerp(a, b, w)
    return out


def keyed(*keys):
    """A pose-at-time function from keys (time, pose, easing); the easing is how the move *arrives* at that key."""
    def at(t):
        if t <= keys[0][0]:
            return keys[0][1]
        for (t0, a, _), (t1, b, e) in zip(keys, keys[1:]):
            if t <= t1:
                return blend_params(a, b, ease(e, (t - t0) / (t1 - t0)))
        return keys[-1][1]
    return at



# ---- building ----------------------------------------------------------------------------------------------------------------

def import_body(name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROUND4, name, 'base.glb'))
    new = [o for o in bpy.data.objects if o not in before]
    arm = [o for o in new if o.type == 'ARMATURE'][0]
    arm.name = name
    arm.data.name = name
    meshes = [o for o in new if o.type == 'MESH' and o.name != 'Icosphere']
    for o in new:
        if o.type == 'MESH' and o.name == 'Icosphere':
            bpy.data.objects.remove(o)
    return arm, meshes


CURL = (1.0, 1.0, 1.0)


def build_clip(rig, name, length, loops, fn, check):
    arm = rig.arm
    action = bpy.data.actions.new(f'{name}.{arm.name}')
    action.use_fake_user = True
    arm.animation_data_create().action = action
    frames = int(round(length * FPS))
    worst = {}
    for i in range(frames + 1):
        t = min(length, i / FPS)
        P = fn(t)
        checks = rig.apply(P, i, CURL)
        if check:
            for k in ('arm_l', 'arm_r', 'leg_l', 'leg_r'):
                worst[k] = max(worst.get(k, 0.0), checks[k + '_err'])
    action.frame_range = (0, frames)
    if check:
        print(f'  {name}.{arm.name}: worst unreachable by {{ {", ".join(f"{k} {v*100:.1f} cm" for k, v in worst.items())} }}', file=sys.stderr)
    return action



def build_all(clips, a):
    """Build every wanted clip of `clips` (name -> (length, loops, fn)) for each body, and write the clips file (and a preview body)."""
    c.reset()
    scene = bpy.context.scene
    scene.render.fps = FPS
    wanted = [n for n in a.only.split(',') if n] or list(clips)
    rigs, meshes = [], {}
    for body in [b for b in a.bodies.split(',') if b]:
        arm, ms = import_body(body)
        meshes[body] = ms
        rigs.append(Rig(arm))
    for rig in rigs:
        for name in wanted:
            length, loops, fn = clips[name]
            build_clip(rig, name, length, loops, fn, a.check)
        rig.arm.animation_data.action = None
    # Actions listed as NLA strips so the exporter names each animation after its action.
    for rig in rigs:
        ad = rig.arm.animation_data
        for act in [x for x in bpy.data.actions if x.name.endswith('.' + rig.arm.name)]:
            track = ad.nla_tracks.new()
            track.name = act.name
            track.strips.new(act.name, int(act.frame_range[0]), act)
    def export(path, objects, with_meshes):
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:
            o.select_set(True)
        bpy.ops.export_scene.gltf(
            filepath=path, export_format='GLB', use_selection=True, export_yup=True,
            export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_frame_range=False,
            export_optimize_animation_size=True, export_cameras=False, export_lights=False, export_extras=False,
            export_skins=with_meshes, export_morph=False, export_materials='EXPORT' if with_meshes else 'NONE',
            export_image_format='AUTO', export_apply=False,
        )
    if a.preview:
        chosen = [r for r in rigs if r.arm.name == a.preview_body]
        if chosen:
            export(a.preview, [chosen[0].arm, *meshes[a.preview_body]], True)
    for body in meshes:
        for o in meshes[body]:
            bpy.data.objects.remove(o)
    export(a.out, [r.arm for r in rigs], False)
    print('wrote', a.out, file=sys.stderr)
