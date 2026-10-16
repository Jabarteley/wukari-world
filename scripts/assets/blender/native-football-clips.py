"""The Football clips for Allworld's own characters: keyframed on the native 53-joint skeleton, made here, not captured or copied.

    blender --background --factory-startup --python scripts/assets/blender/native-football-clips.py -- --out clips.glb
        [--only jog,kick] [--bodies male,female] [--preview body-with-clips.glb] [--check]

The same two bodies, the same solver and the same writer as the Fight clips (native_rig.py): every clip is a function from time to a
pose given as a few plain numbers (where the pelvis is, how the hips, chest and head turn, where each wrist and each foot is), and
two-bone solvers place the arms and the legs, so knees and elbows only ever bend one way and a planted foot stays planted. The file
holds the animations only (no mesh): `<clip>.male` and `<clip>.female`.

The player faces -Y here (the glTF exporter turns that into the +Z a game model faces); the left side is +X. Running clips are
treadmill cycles with the feet moving back at the speed the clip is for (RUN_SPEED), so a player running at a given speed plays them
at (speed / that speed) and the feet meet the ground. Kicks and passes have a wind-up the game can hold while the shoot button is
charged, and a ball contact time (KICK_WIND, KICK_HIT and the pass's), written in src/arena/football-native.ts too. The keeper's dive
is made to be scrubbed: its first half is the body going over, from standing to full length, to be played by how far the keeper has
moved; its second half is the landing, played in time.

Clips: idle, walk, jog, sprint, dribble, kick, pass, tackle, stumble, celebrate, dejected, keeper-ready, keeper-dive-left,
keeper-dive-right (the keeper's own left and right), keeper-catch.
"""
import math
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402
from native_rig import D, build_all, common_options, ease, hand, keyed, lerp, planted, with_pose  # noqa: E402


def options(p):
    common_options(p)


TAU = 2 * math.pi
BALL_Y = 0.135   # the ball of the foot is this far ahead of the ankle, standing


def sm(w):
    w = min(1.0, max(0.0, w))
    return w * w * (3 - 2 * w)


# ---- poses -------------------------------------------------------------------------------------------------------------------
# A ready, balanced stand: knees soft, a little forward, hands loose at the hips.

READY = dict(
    pel=((0.0, 0.0, -0.045), (0.0, D(5), 0.0)),
    chest=(0.0, D(4), 0.0),
    head=(0.0, D(8), 0.0),
    clav_l=(D(2), D(-2)), clav_r=(D(2), D(-2)),
    hand_l=hand('c', (0.29, -0.15, -0.12)), hand_r=hand('c', (-0.29, -0.15, -0.12)),
    pole_l=(0.2, 0.0, 0.0), pole_r=(-0.2, 0.0, 0.0),
    pron_l=0.0, pron_r=0.0, fist_l=0.5, fist_r=0.5,
    foot_l=planted(0.14, -BALL_Y - 0.04, D(4), D(0)),
    foot_r=planted(-0.14, -BALL_Y + 0.04, D(-4), D(0)),
)


def P_(base=READY, **kw):
    return with_pose(base, **kw)


def mirror_spec(spec):
    """A limb target list with its sideways axis turned round (and the yaw and roll of a free foot)."""
    out = []
    for item in spec:
        w, kind = item[0], item[1]
        if kind in ('c', 's', 'p'):
            v = item[2]
            out.append((w, kind, (-v[0], v[1], v[2])))
        elif kind == 'ball':
            (x, y, z), yaw, heel = item[2], item[3], item[4]
            out.append((w, kind, (-x, y, z), -yaw, heel))
        elif kind == 'ank':
            (x, y, z), (yaw, pitch, roll) = item[2], item[3]
            out.append((w, kind, (-x, y, z), (-yaw, pitch, -roll)))
        else:  # 'pel'
            (x, y, z), (yaw, pitch, roll) = item[2], item[3]
            out.append((w, kind, (-x, y, z), (-yaw, pitch, -roll)))
    return out


def mirror(P):
    """The same pose seen in a mirror: left and right swap."""
    out = dict(P)
    (px, py, pz), (yaw, pitch, roll) = P['pel']
    out['pel'] = ((-px, py, pz), (-yaw, pitch, -roll))
    t, l, s = P['chest']
    out['chest'] = (-t, l, -s)
    hy, hp, hr = P['head']
    out['head'] = (-hy, hp, -hr)
    out['clav_l'], out['clav_r'] = P['clav_r'], P['clav_l']
    out['hand_l'], out['hand_r'] = mirror_spec(P['hand_r']), mirror_spec(P['hand_l'])
    out['foot_l'], out['foot_r'] = mirror_spec(P['foot_r']), mirror_spec(P['foot_l'])
    out['pole_l'] = (-P['pole_r'][0], P['pole_r'][1], P['pole_r'][2])
    out['pole_r'] = (-P['pole_l'][0], P['pole_l'][1], P['pole_l'][2])
    for k in ('pron', 'fist'):
        out[k + '_l'], out[k + '_r'] = P[k + '_r'], P[k + '_l']
    return out


# ---- standing and walking ----------------------------------------------------------------------------------------------------

def idle(t):
    """The ready stance: weight on the balls of the feet, breathing, a slow shift from foot to foot."""
    ph = t / 1.6 * TAU
    br = math.sin(ph)
    shift = math.sin(ph * 0.5)
    sink = 0.5 - 0.5 * math.cos(ph)
    return P_(
        pel=((0.012 * shift, 0.0, -0.06 - 0.012 * sink), (D(2) * shift, D(6), D(1.2) * shift)),
        chest=(D(-2) * shift, D(4) + D(0.8) * br, 0.0),
        head=(D(1.5) * shift, D(9) + D(1) * math.sin(ph + 0.7), 0.0),
        hand_l=hand('c', (0.30, -0.16 + 0.01 * br, -0.11 + 0.01 * br)), hand_r=hand('c', (-0.30, -0.16 - 0.01 * br, -0.11 - 0.01 * br)),
        foot_l=planted(0.15, -BALL_Y - 0.05, D(5), D(3) + D(3) * sink), foot_r=planted(-0.15, -BALL_Y + 0.05, D(-5), D(3) + D(3) * sink),
    )


def locomotion(T, duty, front, back, lift, lean, drop, bob, swing, elbow, heel_off, twist, head_pitch, touch=0.0):
    """A running cycle (a treadmill): each foot is on the ground from `front` ahead of the hips to `back` behind them (metres), then
    swings forward through the air `lift` high. The pelvis dips at mid-stance, arms swing against the legs, the chest twists against
    the hips. Returns (T, loops, fn); the ground speed it is for is (front + back) / (duty * T)."""
    S = front + back

    def foot_at(q, side, yaw0):
        if q < duty:
            w = q / duty
            u = front - S * w
            heel = (D(heel_off) * sm((w - 0.55) / 0.45)) if w > 0.55 else 0.0
            z = 0.0
        else:
            w = (q - duty) / (1 - duty)
            e = 0.5 - 0.5 * math.cos(math.pi * w)
            u = -back + S * (e ** 0.9)
            z = lift * math.sin(math.pi * min(1.0, w * 1.08)) ** 1.15
            heel = D(heel_off + 12) * (1 - sm(w * 1.4)) + D(-6) * sm((w - 0.6) / 0.4)
        return planted(side * 0.095, -BALL_Y - u, yaw0, heel, z), u

    def fn(t):
        ph = (t / T) % 1.0
        spec_l, ul = foot_at(ph, 1, D(2))
        spec_r, ur = foot_at((ph + 0.5) % 1.0, -1, D(-2))
        lf, rf = ul / (S / 2) - (front - back) / S, ur / (S / 2) - (front - back) / S   # about -1 (back) to +1 (front)
        dip = 0.5 + 0.5 * math.cos(2 * TAU * (ph - duty / 2))
        side = math.sin(TAU * ph)
        # arms: the left arm goes forward as the right leg does
        arm_l, arm_r = rf, lf
        hl = hand('c', (0.27 - 0.03 * arm_l, -0.14 - swing * arm_l, 0.01 + elbow * max(0.0, arm_l) - 0.03 * (1 - arm_l)))
        hr = hand('c', (-0.27 + 0.03 * arm_r, -0.14 - swing * arm_r, 0.01 + elbow * max(0.0, arm_r) - 0.03 * (1 - arm_r)))
        return P_(
            pel=((0.012 * side, 0.0, -drop - bob * dip), (-D(twist * 0.6) * math.sin(TAU * ph), D(lean), -D(2.5) * side)),
            chest=(D(twist) * math.sin(TAU * ph), D(lean * 0.5), D(1.5) * side), head=(0.0, D(head_pitch), 0.0),
            clav_l=(D(2), D(-1)), clav_r=(D(2), D(-1)),
            hand_l=hl, hand_r=hr, pole_l=(0.1, 0.5, 0.0), pole_r=(-0.1, 0.5, 0.0), fist_l=0.8, fist_r=0.8,
            foot_l=spec_l, foot_r=spec_r)
    return T, True, fn


# RUN_SPEED is what each cycle is for, metres a second: (front + back) / (duty * T).
WALK = dict(T=0.85, duty=0.58, front=0.30, back=0.34, lift=0.07, lean=4, drop=0.04, bob=0.015, swing=0.07, elbow=0.0, heel_off=22, twist=5, head_pitch=6)
JOG = dict(T=0.70, duty=0.46, front=0.28, back=0.50, lift=0.20, lean=9, drop=0.075, bob=0.03, swing=0.17, elbow=0.05, heel_off=32, twist=8, head_pitch=9)
SPRINT = dict(T=0.47, duty=0.36, front=0.30, back=0.66, lift=0.30, lean=15, drop=0.12, bob=0.045, swing=0.24, elbow=0.09, heel_off=42, twist=11, head_pitch=10)
RUN_SPEED = {k: (v['front'] + v['back']) / (v['duty'] * v['T']) for k, v in (('walk', WALK), ('jog', JOG), ('sprint', SPRINT))}


def dribble():
    """A jog with the ball: shorter strides, the chest a little more upright, the head down at the ball, a touch from each foot's toe."""
    T = 0.70
    base = locomotion(T, 0.46, 0.26, 0.40, 0.14, 11, 0.08, 0.025, 0.12, 0.02, 30, 6, 16)
    fn0 = base[2]

    def fn(t):
        P = fn0(t)
        ph = (t / T) % 1.0
        # the touch: just before each foot lands it is pushed a little further ahead with the toe down
        out = dict(P)
        for key, off, side, yaw in (('foot_l', 0.0, 1, D(2)), ('foot_r', 0.5, -1, D(-2))):
            q = (ph + off) % 1.0
            if 0.78 < q < 0.98:
                k = math.sin(math.pi * (q - 0.78) / 0.20)
                _, _, (bx, by, bz), yw, heel = P[key][0]
                out[key] = [(1.0, 'ball', (bx, by - 0.10 * k, bz * (1 - 0.4 * k)), yw, D(-10) * k + heel * (1 - k))]
        return out
    return T, True, fn


# ---- ball work ---------------------------------------------------------------------------------------------------------------
# KICK_WIND is when the leg is cocked and the game holds the clip while the shoot button is charged; KICK_HIT when the instep meets
# the ball. The same for the pass. Written again, with the clip lengths, in src/arena/football-native.ts.
KICK_WIND, KICK_HIT, KICK_LEN = 0.30, 0.38, 0.85
PASS_WIND, PASS_HIT, PASS_LEN = 0.18, 0.24, 0.60


def kick():
    """A right-footed instep strike: a plant beside the ball, the shin cocked back, the leg driving through with the toe down, the arms
    out for balance, the whole body going with the ball."""
    stand = P_(READY, pel=((0.0, 0.02, -0.07), (D(-4), D(8), 0.0)), chest=(D(4), D(6), 0.0), head=(0.0, D(14), 0.0))
    plant = P_(READY, pel=((0.02, 0.04, -0.09), (D(-14), D(10), D(2))), chest=(D(18), D(8), D(-2)), head=(D(8), D(14), 0.0),
               clav_l=(D(8), D(8)), clav_r=(D(-6), D(8)),
               hand_l=hand('c', (0.42, -0.30, 0.12)), hand_r=hand('c', (-0.36, 0.05, 0.02)), pole_l=(0.3, 0.2, 0.0), pole_r=(-0.3, 0.2, 0.0),
               foot_l=planted(0.15, -0.37, D(2), D(0)),
               foot_r=[(1.0, 'ank', (-0.12, 0.28, 0.30), (D(-6), D(60), D(4)))])
    wind = P_(plant, pel=((0.02, 0.06, -0.10), (D(-20), D(9), D(2))), chest=(D(24), D(8), D(-2)),
              foot_r=[(1.0, 'ank', (-0.13, 0.44, 0.40), (D(-8), D(70), D(5)))])
    hit = P_(plant, pel=((0.02, -0.04, -0.10), (D(8), D(12), D(2))), chest=(D(-8), D(10), D(-1)), head=(D(0), D(24), 0.0),
             hand_l=hand('c', (0.46, -0.10, 0.10)), hand_r=hand('c', (-0.40, -0.22, 0.04)),
             foot_l=planted(0.15, -0.34, D(2), D(0)),
             foot_r=[(1.0, 'ank', (-0.11, -0.46, 0.16), (D(4), D(52), D(0)))])
    through = P_(hit, pel=((0.02, -0.12, -0.08), (D(14), D(10), D(2))), chest=(D(-16), D(8), D(-1)),
                 hand_l=hand('c', (0.46, 0.00, 0.12)), hand_r=hand('c', (-0.36, -0.36, 0.14)),
                 foot_l=planted(0.15, -0.34, D(2), D(10)),
                 foot_r=[(1.0, 'ank', (-0.10, -0.74, 0.46), (D(8), D(40), D(-4)))])
    land = P_(through, pel=((0.0, -0.20, -0.06), (D(8), D(8), 0.0)), chest=(D(-6), D(8), 0.0),
              foot_l=planted(0.15, -0.36, D(2), D(20)),
              foot_r=[(1.0, 'ank', (-0.12, -0.78, 0.10), (D(4), D(24), 0.0))])
    return KICK_LEN, False, keyed((0.0, stand, 'io'), (0.14, plant, 'io'), (KICK_WIND, wind, 'out'), (KICK_HIT, hit, 'in'), (0.48, through, 'out'),
                                  (0.62, land, 'io'), (KICK_LEN, READY, 'io'))


def pass_():
    """A side-foot pass: the plant beside the ball, a short swing back, the inside of the foot (turned out) meeting the ball, a short follow-through."""
    plant = P_(READY, pel=((0.01, 0.02, -0.08), (D(-6), D(8), D(1))), chest=(D(8), D(6), 0.0), head=(0.0, D(18), 0.0),
               hand_l=hand('c', (0.40, -0.22, 0.06)), hand_r=hand('c', (-0.34, -0.06, 0.02)),
               foot_l=planted(0.15, -0.30, D(0), D(0)),
               foot_r=[(1.0, 'ank', (-0.12, -0.02, 0.17), (D(-30), D(18), D(18)))])
    wind = P_(plant, pel=((0.01, 0.03, -0.09), (D(-10), D(8), D(1))), chest=(D(12), D(6), 0.0),
              foot_r=[(1.0, 'ank', (-0.16, 0.20, 0.24), (D(-48), D(22), D(24)))])
    hit = P_(plant, pel=((0.01, 0.0, -0.09), (D(2), D(9), D(1))), chest=(D(-2), D(6), 0.0),
             foot_r=[(1.0, 'ank', (-0.10, -0.34, 0.12), (D(-58), D(14), D(24)))])
    through = P_(hit, pel=((0.01, -0.04, -0.08), (D(8), D(9), D(1))), chest=(D(-6), D(6), 0.0),
                 hand_r=hand('c', (-0.36, -0.20, 0.06)),
                 foot_r=[(1.0, 'ank', (-0.08, -0.54, 0.16), (D(-40), D(16), D(16)))])
    return PASS_LEN, False, keyed((0.0, READY, 'io'), (0.08, plant, 'io'), (PASS_WIND, wind, 'out'), (PASS_HIT, hit, 'in'), (0.34, through, 'out'),
                                  (PASS_LEN, READY, 'io'))


def tackle():
    """A standing poke tackle: no slide. A long step in, the knee over the front foot, the other foot reaching for the ball, the arms out."""
    crouch = P_(READY, pel=((0.0, 0.02, -0.12), (D(-4), D(14), 0.0)), chest=(0.0, D(10), 0.0), head=(0.0, D(18), 0.0),
                hand_l=hand('c', (0.40, -0.22, 0.00)), hand_r=hand('c', (-0.40, -0.22, 0.00)),
                foot_l=planted(0.15, -0.20, D(4), 0), foot_r=planted(-0.14, -0.04, D(-4), D(6)))
    lunge = P_(READY, pel=((0.0, -0.20, -0.30), (D(-6), D(20), D(2))), chest=(D(6), D(12), 0.0), head=(0.0, D(26), 0.0),
               clav_l=(D(10), D(6)), clav_r=(D(6), D(6)),
               hand_l=hand('c', (0.52, -0.18, 0.04)), hand_r=hand('c', (-0.50, 0.02, 0.06)), pole_l=(0.4, 0.2, 0.0), pole_r=(-0.4, 0.2, 0.0),
               foot_l=planted(0.15, -0.62, D(2), 0),
               foot_r=planted(-0.17, 0.42, D(-10), D(34)))
    poke = P_(lunge, pel=((0.0, -0.30, -0.36), (D(-2), D(24), D(2))), chest=(D(2), D(14), 0.0), head=(0.0, D(30), 0.0),
              hand_l=hand('c', (0.55, -0.22, 0.06)), hand_r=hand('c', (-0.50, 0.04, 0.10)),
              foot_l=planted(0.15, -0.74, D(2), 0),
              foot_r=planted(-0.17, 0.48, D(-10), D(38)))
    return 0.70, False, keyed((0.0, READY, 'io'), (0.10, crouch, 'io'), (0.24, lunge, 'out'), (0.34, poke, 'lin'), (0.46, lunge, 'io'), (0.70, READY, 'io'))


def stumble():
    """Knocked off the ball: a stagger, the arms flung out, then bent over getting the balance back."""
    hit = P_(READY, pel=((0.02, 0.06, -0.10), (D(10), D(14), D(4))), chest=(D(-14), D(18), D(5)), head=(D(-8), D(22), D(4)),
             clav_l=(D(-8), D(8)), clav_r=(D(-8), D(8)),
             hand_l=hand('c', (0.56, 0.0, 0.14)), hand_r=hand('c', (-0.52, -0.08, 0.04)), pole_l=(0.4, 0.3, 0.0), pole_r=(-0.4, 0.3, 0.0),
             foot_l=planted(0.18, -0.10, D(8), D(10)), foot_r=planted(-0.18, -0.30, D(-12), D(0)))
    bent = P_(hit, pel=((0.0, 0.0, -0.16), (D(4), D(28), D(1))), chest=(D(-4), D(26), D(2)), head=(D(0), D(30), 0.0),
              hand_l=hand('c', (0.34, -0.22, -0.04)), hand_r=hand('c', (-0.32, -0.22, -0.04)),
              foot_l=planted(0.16, -0.20, D(6), D(6)), foot_r=planted(-0.16, -0.12, D(-6), D(4)))
    return 0.9, False, keyed((0.0, READY, 'io'), (0.10, hit, 'out'), (0.34, bent, 'io'), (0.9, bent, 'io'))


# ---- feelings ----------------------------------------------------------------------------------------------------------------

def celebrate():
    """Arms out wide, running on the spot, then a jump with both fists up; a loop of a second and a half."""
    T = 1.5
    run = locomotion(0.62, 0.46, 0.24, 0.40, 0.16, 5, 0.06, 0.03, 0.0, 0.0, 28, 6, 0)[2]

    def fn(t):
        ph = t / T
        P = run(t % 0.62)
        arms = dict(clav_l=(D(-6), D(18)), clav_r=(D(-6), D(18)), pole_l=(0.2, 0.2, 0.2), pole_r=(-0.2, 0.2, 0.2), fist_l=0.2, fist_r=0.2,
                    head=(0.0, D(-8), 0.0))
        if ph < 0.50:   # running with the arms out like wings
            w = sm(ph / 0.08)
            wave = math.sin(TAU * t / 0.62)
            return P_(P, **arms, hand_l=hand('c', (0.62 + 0.02 * w, -0.08, 0.20 + 0.03 * wave)), hand_r=hand('c', (-0.62 - 0.02 * w, -0.08, 0.20 - 0.03 * wave)))
        # the jump: down, up with the fists, a hang, down again, back into the run
        u = (ph - 0.50) / 0.50
        crouch = sm(u / 0.14) - sm((u - 0.14) / 0.10)
        air = math.sin(math.pi * min(1.0, max(0.0, (u - 0.20) / 0.50))) if 0.20 < u < 0.70 else 0.0
        land = sm((u - 0.70) / 0.08) - sm((u - 0.78) / 0.16)
        fists = sm((u - 0.10) / 0.16) * (1 - sm((u - 0.74) / 0.2))
        lift = 0.52 * air
        out = P_(READY, **arms)
        out['pel'] = ((0.0, 0.0, -0.045 - 0.20 * crouch - 0.12 * land + lift), (0.0, D(4) + D(14) * crouch - D(8) * air, 0.0))
        out['chest'] = (D(8) * math.sin(TAU * u * 1.0), D(-6) * air + D(6) * crouch, 0.0)
        out['hand_l'] = hand('c', (lerp(0.55, 0.30, fists), -0.10, lerp(0.20, 0.66, fists)))
        out['hand_r'] = hand('c', (-lerp(0.55, 0.30, fists), -0.10, lerp(0.20, 0.66, fists)))
        out['fist_l'] = out['fist_r'] = 0.3 + 0.7 * fists
        tuck = air
        out['foot_l'] = [(1.0, 'ball', (0.12, -BALL_Y - 0.04 - 0.05 * tuck, 0.012 + lift * 0.96 + 0.10 * tuck), D(2), D(10) + D(30) * tuck)]
        out['foot_r'] = [(1.0, 'ball', (-0.12, -BALL_Y + 0.10 + 0.20 * tuck, 0.012 + lift * 0.96 + 0.16 * tuck), D(-2), D(10) + D(40) * tuck)]
        if u < 0.14 or u > 0.72:   # feet still on the ground
            out['foot_l'] = planted(0.13, -BALL_Y - 0.06, D(4), 0.0)
            out['foot_r'] = planted(-0.13, -BALL_Y + 0.06, D(-4), 0.0)
        return out
    return T, True, fn


def dejected():
    """Head down, hands on the hips, shoulders sagging, a slow breath; a loop of two seconds."""
    def fn(t):
        ph = t / 2.0 * TAU
        br = math.sin(ph)
        return P_(READY,
                  pel=((0.0, 0.0, -0.05), (D(2), D(8), 0.0)), chest=(D(2) * br, D(14) + D(1.2) * br, 0.0), head=(D(8) * math.sin(ph * 0.5), D(30) + D(2) * br, D(2)),
                  clav_l=(D(8), D(-10)), clav_r=(D(8), D(-10)),
                  hand_l=hand('c', (0.33, -0.16, -0.20)), hand_r=hand('c', (-0.33, -0.16, -0.20)),
                  pole_l=(0.8, 0.5, 0.0), pole_r=(-0.8, 0.5, 0.0), fist_l=0.4, fist_r=0.4,
                  foot_l=planted(0.15, -BALL_Y - 0.01, D(8), D(2)), foot_r=planted(-0.15, -BALL_Y + 0.02, D(-8), D(2)))
    return 2.0, True, fn


# ---- the keeper --------------------------------------------------------------------------------------------------------------

KEEPER_READY = P_(READY,
                  pel=((0.0, 0.03, -0.20), (0.0, D(14), 0.0)), chest=(0.0, D(12), 0.0), head=(0.0, D(10), 0.0),
                  clav_l=(D(6), D(2)), clav_r=(D(6), D(2)),
                  hand_l=hand('c', (0.36, -0.30, 0.08)), hand_r=hand('c', (-0.36, -0.30, 0.08)),
                  pole_l=(0.4, 0.3, 0.0), pole_r=(-0.4, 0.3, 0.0), fist_l=0.0, fist_r=0.0,
                  foot_l=planted(0.27, -BALL_Y - 0.02, D(8), D(10)), foot_r=planted(-0.27, -BALL_Y - 0.02, D(-8), D(10)))


def keeper_ready(t):
    """Wide and low on the balls of the feet, hands up and open in front, bouncing a little."""
    ph = t / 1.1 * TAU
    b = math.sin(ph)
    up = 0.5 - 0.5 * math.cos(ph)
    return P_(KEEPER_READY,
              pel=((0.01 * math.sin(ph * 0.5), 0.03, -0.20 + 0.025 * up), (D(1.5) * math.sin(ph * 0.5), D(14) - D(1.5) * up, D(1) * math.sin(ph * 0.5))),
              hand_l=hand('c', (0.36 + 0.015 * b, -0.30, 0.08 + 0.025 * b)), hand_r=hand('c', (-0.36 - 0.015 * b, -0.30, 0.08 + 0.025 * b)),
              foot_l=planted(0.27, -BALL_Y - 0.02, D(8), D(10) + D(6) * up, 0.012 * up), foot_r=planted(-0.27, -BALL_Y - 0.02, D(-8), D(10) + D(6) * up, 0.012 * up))


# The dive towards the keeper's left (+X): the first DIVE_GO seconds are the body going over (from the stand to full length, to be
# scrubbed by how far the keeper has moved), the rest is the landing and lying there, played in time.
DIVE_GO, DIVE_LEN = 0.50, 1.20


def dive_left():
    crouch = P_(KEEPER_READY, pel=((0.04, 0.02, -0.30), (0.0, D(12), D(8))), chest=(0.0, D(10), D(8)),
                hand_l=hand('c', (0.40, -0.34, 0.12)), hand_r=hand('c', (-0.30, -0.30, 0.12)),
                foot_l=planted(0.30, -BALL_Y - 0.04, D(8), D(6)), foot_r=planted(-0.22, -BALL_Y, D(-8), D(10)))
    push = P_(KEEPER_READY, pel=((0.16, 0.0, -0.18), (0.0, D(10), D(30))), chest=(0.0, D(6), D(18)),
              clav_l=(D(4), D(26)), clav_r=(D(4), D(30)),
              hand_l=hand('c', (0.18, -0.30, 0.64)), hand_r=hand('c', (-0.12, -0.30, 0.62)), pole_l=(0.2, 0.4, 0.2), pole_r=(-0.2, 0.4, 0.2),
              foot_l=planted(0.46, -BALL_Y - 0.02, D(8), D(30), 0.0), foot_r=planted(-0.10, -BALL_Y + 0.02, D(-8), D(40), 0.04))
    air = P_(READY, pel=((0.46, 0.02, -0.12), (0.0, D(2), D(78))), chest=(0.0, D(2), D(10)), head=(0.0, D(2), D(10)),
             clav_l=(D(2), D(22)), clav_r=(D(2), D(22)),
             hand_l=hand('c', (0.08, -0.30, 0.78)), hand_r=hand('c', (-0.08, -0.30, 0.76)), pole_l=(0.0, 0.4, 0.0), pole_r=(0.0, 0.4, 0.0), fist_l=0.0, fist_r=0.0,
             foot_l=[(1.0, 'pel', (0.12, 0.26, -0.82), (0.0, D(6), D(0)))], foot_r=[(1.0, 'pel', (-0.12, 0.40, -0.76), (D(0), D(14), D(0)))])
    return P_(crouch), P_(push), P_(air)


def keeper_dive(direction):
    crouch, push, air = dive_left()
    # landing: the hip and the arm come down, the body slides on its side and stops lying full length
    down = P_(air, pel=((0.54, -0.04, -0.60), (D(-4), D(2), D(88))), chest=(0.0, D(2), D(6)),
              hand_l=hand('c', (0.05, -0.34, 0.74)), hand_r=hand('c', (-0.05, -0.34, 0.72)),
              foot_l=[(1.0, 'pel', (0.12, 0.30, -0.82), (0.0, D(6), D(0)))], foot_r=[(1.0, 'pel', (-0.12, 0.38, -0.78), (0.0, D(10), D(0)))])
    rest = P_(down, pel=((0.60, -0.02, -0.64), (D(-6), D(2), D(92))), head=(0.0, D(2), D(10)),
              hand_l=hand('c', (0.06, -0.30, 0.70)), hand_r=hand('c', (-0.06, -0.26, 0.60)))
    keys = [(0.0, KEEPER_READY, 'io'), (0.12, crouch, 'io'), (0.26, push, 'out'), (DIVE_GO, air, 'io'), (0.66, down, 'in'), (0.86, rest, 'out'), (DIVE_LEN, rest, 'io')]
    if direction > 0:
        return DIVE_LEN, False, keyed(*keys)
    return DIVE_LEN, False, keyed(*[(t, mirror(P), e) for t, P, e in keys])


def keeper_catch():
    """Gathering the ball at the chest: hands open to it, then hugged in with a sink of the knees, then standing up with it."""
    reach = P_(KEEPER_READY, pel=((0.0, -0.02, -0.16), (0.0, D(10), 0.0)), chest=(0.0, D(6), 0.0),
               hand_l=hand('c', (0.20, -0.52, 0.18)), hand_r=hand('c', (-0.20, -0.52, 0.18)), pole_l=(0.3, 0.2, 0.2), pole_r=(-0.3, 0.2, 0.2), fist_l=0.0, fist_r=0.0)
    hug = P_(KEEPER_READY, pel=((0.0, 0.02, -0.26), (0.0, D(18), 0.0)), chest=(0.0, D(22), 0.0), head=(0.0, D(24), 0.0),
             clav_l=(D(14), D(0)), clav_r=(D(14), D(0)),
             hand_l=hand('c', (0.12, -0.30, 0.14)), hand_r=hand('c', (-0.12, -0.30, 0.14)), pole_l=(0.5, 0.2, 0.0), pole_r=(-0.5, 0.2, 0.0), fist_l=0.5, fist_r=0.5)
    up = P_(READY, pel=((0.0, 0.0, -0.06), (0.0, D(6), 0.0)), chest=(0.0, D(8), 0.0), head=(0.0, D(14), 0.0),
            clav_l=(D(10), D(0)), clav_r=(D(10), D(0)),
            hand_l=hand('c', (0.12, -0.28, 0.02)), hand_r=hand('c', (-0.12, -0.28, 0.02)), pole_l=(0.5, 0.2, 0.0), pole_r=(-0.5, 0.2, 0.0), fist_l=0.5, fist_r=0.5)
    return 1.0, False, keyed((0.0, KEEPER_READY, 'io'), (0.16, reach, 'out'), (0.36, hug, 'io'), (0.70, up, 'io'), (1.0, up, 'io'))


CLIPS = {
    'idle': (1.6, True, idle),
    'walk': locomotion(**WALK),
    'jog': locomotion(**JOG),
    'sprint': locomotion(**SPRINT),
    'dribble': dribble(),
    'kick': kick(), 'pass': pass_(), 'tackle': tackle(), 'stumble': stumble(),
    'celebrate': celebrate(), 'dejected': dejected(),
    'keeper-ready': (1.1, True, keeper_ready),
    'keeper-dive-left': keeper_dive(1), 'keeper-dive-right': keeper_dive(-1),
    'keeper-catch': keeper_catch(),
}


def main():
    a = c.args(options)
    print('run speeds (m/s): ' + ', '.join(f'{k} {v:.2f}' for k, v in RUN_SPEED.items()), file=sys.stderr)
    build_all(CLIPS, a)


main()
