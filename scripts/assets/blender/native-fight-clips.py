"""The Fight clips for Allworld's own characters: keyframed on the native 53-joint skeleton, made here, not captured or copied.

    blender --background --factory-startup --python scripts/assets/blender/native-fight-clips.py -- --out clips.glb
        [--only jab,kick] [--bodies male,female] [--preview body-with-clips.glb] [--check]

Reads the two native base bodies (public/character-lab/models/round4/{male,female}/base.glb: CC0 MakeHuman bodies, one skeleton of 53
joints, a different rest pose for each) and builds every clip by solving a pose for each frame from a few plain numbers: where the
pelvis is, how the hips, chest and head turn, where each wrist and each foot is. Two-bone solvers place the arms and the legs (so a knee
or an elbow only ever bends one way, and a planted foot stays planted), and each bone's rotation is written for the body's own rest
pose. Nothing comes from captured motion. The file holds the animations only (no mesh): `<clip>.male` and `<clip>.female`.

The fighter faces -Y here (the glTF exporter turns that into the +Z a game model faces). Orthodox stance: the left hand and foot lead.
Clip lengths follow the rules (src/arena/fight.ts MOVES at 20 ticks a second): a punch is 7 ticks (0.35 s) with its hit at 0.10 to
0.20 s, a kick 11 ticks (0.55 s) with its hit at 0.20 to 0.30 s, so the game plays them at their own speed.
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


def options(p):
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


# ---- poses -------------------------------------------------------------------------------------------------------------------
# The numbers of one pose: `pel` (pelvis offset in metres, then yaw / lean / roll), `chest` (turn, lean, side bend, relative to the
# pelvis), `head` (where the face looks: yaw, pitch, roll, absolute), `clav_*` (shoulder forward, up), `hand_*` and `foot_*` (lists of
# weighted targets), `pole_*` (which way an elbow points), `pron_*` (fist turned palm-down), `fist_*`.

def hand(kind, v):
    return [(1.0, kind, v)]


def planted(x, y, yaw, heel=0.0, lift=0.0):
    return [(1.0, 'ball', (x, y, 0.012 + lift), yaw, heel)]


GUARD = dict(
    pel=((0.0, 0.03, -0.10), (D(-24), D(5), 0.0)),
    chest=(D(-14), D(7), 0.0),
    head=(D(0), D(20), 0.0),
    clav_l=(D(10), D(4)), clav_r=(D(8), D(2)),
    hand_l=hand('c', (0.21, -0.45, 0.42)), hand_r=hand('c', (-0.10, -0.28, 0.37)),
    pole_l=(0.1, 0.0, -0.1), pole_r=(-0.1, 0.0, -0.1),
    pron_l=0.0, pron_r=0.0, fist_l=1.0, fist_r=1.0,
    foot_l=planted(0.14, -0.31, D(-12), D(2)),
    foot_r=planted(-0.19, 0.26, D(-48), D(24)),
)


def P_(base=GUARD, **kw):
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


# ---- the clips ---------------------------------------------------------------------------------------------------------------
# Each clip is (length in seconds, loops, function t -> pose).

def idle(t):
    ph = t / 1.2 * 2 * math.pi
    bob = math.sin(ph)
    side = math.sin(ph * 0.5)
    up = 0.5 - 0.5 * math.cos(ph)
    return P_(
        pel=((0.012 * side, 0.03 + 0.01 * bob, -0.10 - 0.022 * up), (D(-24) + D(1.5) * side, D(5), D(1.2) * side)),
        chest=(D(-14) + D(1) * bob, D(7) + D(1.2) * bob, 0.0),
        head=(D(1) * side, D(20) + D(1.5) * math.sin(ph + 0.6), D(1) * side),
        hand_l=hand('c', (0.21, -0.45 + 0.012 * bob, 0.42 + 0.012 * math.sin(ph + 0.8))),
        hand_r=hand('c', (-0.10, -0.28, 0.37 + 0.012 * math.sin(ph + 1.4))),
        foot_r=planted(-0.19, 0.26, D(-48), D(24) + D(6) * up),
        foot_l=planted(0.14, -0.31, D(-12), D(2) + D(6) * up),
    )


def jab():
    load = P_(pel=((0.0, 0.05, -0.11), (D(-27), D(5), 0.0)), chest=(D(-17), D(7), 0.0), hand_l=hand('c', (0.19, -0.40, 0.42)))
    out = P_(
        pel=((0.0, -0.09, -0.13), (D(-14), D(6), 0.0)), chest=(D(-1), D(12), 0.0), head=(D(0), D(16), 0.0),
        clav_l=(D(34), D(6)), clav_r=(D(4), D(2)),
        hand_l=hand('s', (-0.02, -0.52, 0.02)), pron_l=D(85), hand_r=hand('c', (-0.11, -0.28, 0.40)),
        foot_l=planted(0.14, -0.40, D(-12), D(0)), foot_r=planted(-0.19, 0.22, D(-48), D(30)))
    hold = P_(out, pel=((0.0, -0.10, -0.13), (D(-13), D(6), 0.0)), hand_l=hand('s', (-0.02, -0.535, 0.02)))
    return 0.35, False, keyed((0.0, GUARD, 'io'), (0.035, load, 'io'), (0.10, out, 'out'), (0.19, hold, 'lin'), (0.35, GUARD, 'io'))


def cross():
    load = P_(pel=((0.0, 0.05, -0.11), (D(-34), D(5), 0.0)), chest=(D(-24), D(7), 0.0), hand_r=hand('c', (-0.12, -0.22, 0.34)),
              foot_r=planted(-0.19, 0.26, D(-55), D(30)))
    out = P_(
        pel=((0.0, -0.10, -0.12), (D(10), D(6), 0.0)), chest=(D(6), D(12), 0.0), head=(D(-2), D(16), 0.0),
        clav_r=(D(36), D(6)), clav_l=(D(2), D(3)),
        hand_r=hand('s', (0.02, -0.52, 0.02)), pron_r=D(85), hand_l=hand('c', (0.20, -0.40, 0.40)),
        foot_r=planted(-0.17, 0.20, D(-8), D(62)), foot_l=planted(0.14, -0.31, D(-4), D(2)))
    hold = P_(out, pel=((0.0, -0.11, -0.12), (D(12), D(6), 0.0)), hand_r=hand('s', (0.02, -0.535, 0.02)))
    return 0.35, False, keyed((0.0, GUARD, 'io'), (0.04, load, 'io'), (0.115, out, 'out'), (0.19, hold, 'lin'), (0.35, GUARD, 'io'))


def kick():
    # The rear leg: a lifted knee, then the sole drives out at waist height; the front foot turns on its ball and the body leans back.
    ch_foot = [(1.0, 'pel', (-0.10, -0.10, -0.40), (D(-30), D(-10), 0.0))]
    ex_foot = [(1.0, 'pel', (-0.10, -0.80, 0.02), (D(-10), D(-82), 0.0))]
    chamber = P_(pel=((0.0, 0.04, -0.09), (D(-20), D(2), 0.0)), chest=(D(-10), D(3), 0.0), foot_r=ch_foot,
                 foot_l=planted(0.14, -0.31, D(-30), D(8)), hand_l=hand('c', (0.21, -0.43, 0.41)), hand_r=hand('c', (-0.10, -0.26, 0.38)))
    out = P_(pel=((0.0, -0.01, -0.08), (D(-6), D(-6), 0.0)), chest=(D(-4), D(-4), 0.0), head=(D(0), D(12), 0.0),
             foot_r=ex_foot, foot_l=planted(0.14, -0.31, D(-52), D(14)), clav_l=(D(12), D(6)),
             hand_l=hand('c', (0.24, -0.40, 0.36)), hand_r=hand('c', (-0.12, -0.22, 0.34)))
    hold = P_(out, pel=((0.0, -0.02, -0.08), (D(-5), D(-8), 0.0)))
    return 0.55, False, keyed((0.0, GUARD, 'io'), (0.10, chamber, 'io'), (0.21, out, 'out'), (0.30, hold, 'lin'), (0.40, chamber, 'io'), (0.55, GUARD, 'io'))


def walk(direction):
    T = 0.5
    L = 0.42

    def stride(q):
        """Where along the stride (u from -0.5 at the back to +0.5 at the front, walking forward), how high, and the heel, at cycle q."""
        swing = 0.36
        if q < swing:
            w = q / swing
            return -0.5 + w, 0.075 * math.sin(math.pi * w), D(26) * (1 - w) + D(4) * w
        w = (q - swing) / (1 - swing)
        return 0.5 - w, 0.0, D(2) + D(24) * max(0.0, w - 0.7) / 0.3

    def fn(t):
        ph = t / T
        bob = math.sin(ph * 4 * math.pi)
        bounce = 0.5 - 0.5 * math.cos(ph * 4 * math.pi)
        # walking back plays the stride the other way round: the foot in the air goes back, the one on the floor comes forward
        ul, ll, hl = stride(ph % 1.0 if direction > 0 else (1 - ph) % 1.0)
        ur, lr, hr = stride((ph + 0.5) % 1.0 if direction > 0 else (1 - ph - 0.5) % 1.0)
        return P_(
            pel=((0.0, 0.03, -0.11 - 0.018 * bounce), (D(-24) + D(2.5) * bob * 0.5, D(8), D(1.5) * math.sin(ph * 2 * math.pi))),
            chest=(D(-14) - D(2.5) * bob * 0.5, D(8), 0.0), head=(D(0), D(20), 0.0),
            hand_l=hand('c', (0.21, -0.45, 0.42 + 0.012 * bob)), hand_r=hand('c', (-0.10, -0.28, 0.37 - 0.012 * bob)),
            foot_l=planted(0.14, -0.31 - L * ul, D(-12), hl, ll), foot_r=planted(-0.19, 0.26 - L * ur, D(-48), hr, lr))
    return T, True, fn


def block():
    def fn(t):
        ph = t / 1.0 * 2 * math.pi
        b = math.sin(ph)
        return P_(
            pel=((0.0, 0.05, -0.15 - 0.012 * b), (D(-28), D(8), 0.0)), chest=(D(-20), D(14), 0.0), head=(D(0), D(26), 0.0),
            clav_l=(D(12), D(14)), clav_r=(D(12), D(14)),
            hand_l=hand('c', (0.15, -0.30, 0.48)), hand_r=hand('c', (-0.06, -0.26, 0.45)), pole_l=(-0.5, 0.3, -0.6), pole_r=(0.5, 0.3, -0.6),
            foot_l=planted(0.14, -0.31, D(-12), D(2)), foot_r=planted(-0.19, 0.26, D(-48), D(16)))
    return 1.0, True, fn


def block_hit():
    held = block()[2](0.0)
    jolt = P_(held, pel=((0.0, 0.10, -0.17), (D(-30), D(12), 0.0)), chest=(D(-21), D(18), 0.0), head=(D(0), D(30), 0.0),
              hand_l=hand('c', (0.15, -0.24, 0.46)), hand_r=hand('c', (-0.06, -0.20, 0.43)))
    return 0.25, False, keyed((0.0, held, 'io'), (0.06, jolt, 'out'), (0.25, held, 'io'))


def hit():
    snap = P_(pel=((0.0, 0.11, -0.10), (D(-20), D(1), D(2))), chest=(D(-8), D(-6), D(3)), head=(D(8), D(-24), D(3)),
              hand_l=hand('c', (0.30, -0.30, 0.28)), hand_r=hand('c', (-0.22, -0.22, 0.24)), clav_l=(D(2), D(2)), clav_r=(D(0), D(0)),
              foot_r=planted(-0.19, 0.28, D(-48), D(30)), foot_l=planted(0.14, -0.29, D(-12), D(10)))
    mid = P_(snap, pel=((0.0, 0.09, -0.10), (D(-22), D(3), D(1))), chest=(D(-10), D(0), D(1)), head=(D(5), D(-8), 0.0))
    return 0.42, False, keyed((0.0, GUARD, 'io'), (0.07, snap, 'out'), (0.17, mid, 'io'), (0.42, GUARD, 'io'))


def hit2():
    fold = P_(pel=((0.0, 0.10, -0.16), (D(-18), D(14), 0.0)), chest=(D(-6), D(34), D(-3)), head=(D(0), D(40), 0.0),
              hand_l=hand('c', (0.16, -0.26, 0.10)), hand_r=hand('c', (-0.10, -0.24, 0.12)),
              foot_r=planted(-0.19, 0.28, D(-48), D(30)), foot_l=planted(0.14, -0.29, D(-12), D(4)))
    mid = P_(fold, pel=((0.0, 0.08, -0.14), (D(-20), D(10), 0.0)), chest=(D(-9), D(24), 0.0), head=(D(0), D(32), 0.0),
             hand_l=hand('c', (0.18, -0.34, 0.22)), hand_r=hand('c', (-0.10, -0.28, 0.24)))
    return 0.47, False, keyed((0.0, GUARD, 'io'), (0.09, fold, 'out'), (0.22, mid, 'io'), (0.47, GUARD, 'io'))


def down():
    stagger = P_(pel=((0.0, 0.13, -0.10), (D(-18), D(0), D(2))), chest=(D(-6), D(-10), D(3)), head=(D(6), D(-28), 0.0),
                 hand_l=hand('c', (0.32, -0.26, 0.26)), hand_r=hand('c', (-0.26, -0.20, 0.22)),
                 foot_l=planted(0.14, -0.27, D(-12), D(12)), foot_r=planted(-0.19, 0.30, D(-48), D(34)))
    fly = P_(pel=((0.0, 0.34, -0.10), (D(-10), D(-52), D(3))), chest=(D(0), D(-14), D(2)), head=(D(0), D(-30), 0.0),
             hand_l=hand('c', (0.50, -0.12, 0.22)), hand_r=hand('c', (-0.46, -0.10, 0.20)), clav_l=(D(-4), D(10)), clav_r=(D(-4), D(10)),
             foot_l=[(1.0, 'pel', (0.12, -0.20, -0.84), (D(-5), D(30), 0))], foot_r=[(1.0, 'pel', (-0.12, -0.30, -0.80), (D(-5), D(34), 0))],
             pole_l=(0.4, 0.0, -0.3), pole_r=(-0.4, 0.0, -0.3))
    land = P_(fly, pel=((0.0, 0.62, -0.77), (D(-4), D(-88), D(2))), chest=(D(0), D(-2), 0.0), head=(D(0), D(-80), 0.0),
              hand_l=hand('c', (0.55, 0.02, -0.02)), hand_r=hand('c', (-0.55, 0.0, -0.02)), clav_l=(D(-6), D(-4)), clav_r=(D(-6), D(-4)),
              foot_l=[(1.0, 'pel', (0.13, 0.04, -0.84), (D(-8), D(-18), D(-6)))], foot_r=[(1.0, 'pel', (-0.15, 0.04, -0.82), (D(8), D(-14), D(6)))],
              pole_l=(0.2, 0.0, -0.1), pole_r=(-0.2, 0.0, -0.1))
    rest = P_(land, pel=((0.0, 0.62, -0.78), (D(-3), D(-90), D(2))), head=(D(10), D(-84), 0.0))
    return 1.0, False, keyed((0.0, GUARD, 'io'), (0.12, stagger, 'out'), (0.38, fly, 'io'), (0.55, land, 'out'),
                             (0.66, P_(land, pel=((0.0, 0.60, -0.77), (D(-4), D(-86), D(2)))), 'io'), (1.0, rest, 'io'))


def cheer():
    def fn(t):
        ph = t / 1.0 * 2 * math.pi
        b = math.sin(ph)
        up = 0.5 - 0.5 * math.cos(ph * 2)
        pump = math.sin(ph)
        return P_(
            pel=((0.0, 0.02, -0.04 - 0.035 * up), (D(-14) + D(4) * b, D(-2), D(2) * b)), chest=(D(-6) - D(3) * b, D(-6), 0.0), head=(D(0), D(-6), 0.0),
            clav_l=(D(-4), D(26)), clav_r=(D(-4), D(26)),
            hand_l=hand('c', (0.30, -0.10 + 0.04 * pump, 0.64 + 0.05 * pump)), hand_r=hand('c', (-0.30, -0.10 - 0.04 * pump, 0.64 - 0.05 * pump)),
            pole_l=(0.6, 0.3, -0.5), pole_r=(-0.6, 0.3, -0.5),
            foot_l=planted(0.15, -0.14, D(-14), D(2) + D(10) * up), foot_r=planted(-0.15, 0.10, D(-40), D(6) + D(10) * up))
    return 1.0, True, fn


CLIPS = {
    'idle': (1.2, True, idle),
    'jab': jab(), 'cross': cross(), 'kick': kick(),
    'walk-forward': walk(1), 'walk-back': walk(-1),
    'block': block(), 'block-hit': block_hit(),
    'hit': hit(), 'hit-2': hit2(), 'down': down(), 'cheer': cheer(),
}


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


def main():
    a = c.args(options)
    c.reset()
    scene = bpy.context.scene
    scene.render.fps = FPS
    wanted = [n for n in a.only.split(',') if n] or list(CLIPS)
    rigs, meshes = [], {}
    for body in [b for b in a.bodies.split(',') if b]:
        arm, ms = import_body(body)
        meshes[body] = ms
        rigs.append(Rig(arm))
    for rig in rigs:
        for name in wanted:
            length, loops, fn = CLIPS[name]
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


main()
