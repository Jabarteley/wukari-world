"""Body and face recipes: macro sliders and detail targets applied to the CC0 MakeHuman base mesh through MPFB.

Values are slider weights (0..1) of the base mesh's own targets. Names are target file names without extension.
"""

MACRO_FEMALE = {"gender": 0.0, "age": 0.46, "muscle": 0.2, "weight": 0.40, "proportions": 0.5, "height": 0.5,
                "cupsize": 0.5, "firmness": 0.65, "race": {"asian": 0.0, "caucasian": 0.0, "african": 1.0}}
MACRO_MALE = {"gender": 1.0, "age": 0.5, "muscle": 0.55, "weight": 0.3, "proportions": 0.5, "height": 0.5,
              "cupsize": 0.0, "firmness": 0.5, "race": {"asian": 0.0, "caucasian": 0.0, "african": 1.0}}


def both(name, w):
    """A left and right target pair."""
    return {f"l-{name}": w, f"r-{name}": w}


# A friendly, youthful, large-eyed face: soft jaw, full cheeks, wide-set eyes, full lips with lifted corners, small nose.
DETAIL_FEMALE = {
    "head-scale-vert-incr": 0.2, "head-scale-horiz-incr": 0.3, "head-scale-depth-incr": 0.25, "head-oval": 0.15, "head-round": 0.25,
    **both("eye-scale-incr", 0.95), **both("eye-height1-incr", 0.5), **both("eye-height2-incr", 0.35),
    **both("eye-trans-down", 0.1), **both("eye-trans-out", 0.22), **both("eye-corner2-up", 0.25),
    **both("eye-bag-decr", 0.4), **both("eye-eyefold-up", 0.2),
    **both("cheek-volume-incr", 0.7), **both("cheek-bones-incr", 0.25), **both("cheek-trans-up", 0.1),
    "chin-width-decr": 0.45, "chin-height-decr": 0.25, "chin-prominent-decr": 0.25, "chin-bones-decr": 0.2,
    "forehead-scale-vert-decr": 0.3, "forehead-nubian-incr": 0.2,
    "nose-width1-decr": 0.4, "nose-width3-decr": 0.3, "nose-scale-vert-decr": 0.35, "nose-point-up": 0.3, "nose-volume-decr": 0.15,
    "nose-nostrils-width-decr": 0.2,
    "mouth-upperlip-volume-incr": 0.28, "mouth-lowerlip-volume-incr": 0.32, "mouth-angles-up": 0.6, "mouth-cupidsbow-incr": 0.35,
    "mouth-scale-horiz-incr": 0.4, "mouth-lowerlip-height-incr": 0.05, "mouth-upperlip-height-incr": 0.1, "mouth-trans-down": 0.05,
    "neck-scale-horiz-decr": 0.3, "neck-scale-vert-incr": 0.1,
    "measure-shoulder-dist-decr": 0.25,
}
DETAIL_MALE = {
    "head-scale-vert-incr": 0.15, "head-scale-horiz-incr": 0.2, "head-scale-depth-incr": 0.2, "head-rectangular": 0.2,
    **both("eye-scale-incr", 0.5), **both("eye-height1-incr", 0.25), **both("eye-trans-out", 0.1), **both("eye-bag-decr", 0.25),
    **both("cheek-volume-incr", 0.2), **both("cheek-bones-incr", 0.2),
    "chin-width-incr": 0.2, "chin-prominent-incr": 0.2, "chin-bones-incr": 0.25,
    "forehead-nubian-incr": 0.1,
    "nose-width1-decr": 0.2, "nose-scale-vert-decr": 0.15,
    "mouth-upperlip-volume-incr": 0.15, "mouth-lowerlip-volume-incr": 0.25, "mouth-angles-up": 0.4, "mouth-scale-horiz-incr": 0.1,
    "measure-shoulder-dist-incr": 0.85, "torso-vshape-incr": 0.9, "torso-scale-horiz-incr": 0.1, "neck-scale-horiz-incr": 0.35,
    "measure-waist-circ-decr": 0.4, "hip-scale-horiz-decr": 0.55, "measure-hips-circ-decr": 0.4,
    "measure-frontchest-dist-incr": 0.2, "torso-muscle-pectoral-decr": 0.6, "measure-bust-circ-decr": 0.6, "measure-underbust-circ-decr": 0.25,
    "buttocks-volume-decr": 0.2,
}
