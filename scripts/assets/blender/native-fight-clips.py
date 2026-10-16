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

The solver, the rig and the file writing are shared with the football clips: native_rig.py.
"""
import math
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402
from native_rig import D, build_all, common_options, hand, keyed, planted, with_pose  # noqa: E402


def options(p):
    common_options(p)


# ---- poses -------------------------------------------------------------------------------------------------------------------

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
    return with_pose(base, **kw)


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



def main():
    build_all(CLIPS, c.args(options))


main()
