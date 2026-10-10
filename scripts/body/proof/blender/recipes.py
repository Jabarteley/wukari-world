"""Body and face recipes: macro sliders and detail targets applied to the CC0 MakeHuman base mesh through MPFB.

Values are slider weights (0..1) of the base mesh's own targets. Names are target file names without extension.
"""

MACRO_FEMALE = {"gender": 0.0, "age": 0.5, "muscle": 0.22, "weight": 0.40, "proportions": 0.5, "height": 0.5,
                "cupsize": 0.5, "firmness": 0.65, "race": {"asian": 0.0, "caucasian": 0.0, "african": 1.0}}
MACRO_MALE = {"gender": 1.0, "age": 0.5, "muscle": 0.58, "weight": 0.42, "proportions": 0.5, "height": 0.5,
              "cupsize": 0.5, "firmness": 0.5, "race": {"asian": 0.0, "caucasian": 0.0, "african": 1.0}}

# Friendly, slightly large-eyed face; a larger head for appeal; relaxed shoulders.
DETAIL_FEMALE = {
    "head-scale-vert-incr": 0.35, "head-scale-horiz-incr": 0.35, "head-scale-depth-incr": 0.35, "head-oval": 0.3,
    "l-eye-scale-incr": 0.55, "r-eye-scale-incr": 0.55, "l-eye-height1-incr": 0.3, "r-eye-height1-incr": 0.3,
    "l-eye-height2-incr": 0.3, "r-eye-height2-incr": 0.3,
    "l-eye-trans-down": 0.12, "r-eye-trans-down": 0.12,
    "l-cheek-volume-incr": 0.35, "r-cheek-volume-incr": 0.35, "l-cheek-bones-incr": 0.2, "r-cheek-bones-incr": 0.2,
    "chin-width-decr": 0.3, "chin-height-decr": 0.15,
    "nose-width1-decr": 0.25, "nose-width3-decr": 0.15, "nose-scale-vert-decr": 0.2, "nose-point-up": 0.2,
    "mouth-upperlip-volume-incr": 0.3, "mouth-lowerlip-volume-incr": 0.35, "mouth-angles-up": 0.4,
    "mouth-cupidsbow-incr": 0.3,
    "neck-scale-horiz-decr": 0.25,
    "measure-shoulder-dist-decr": 0.25,
}
DETAIL_MALE = {
    "head-scale-vert-incr": 0.2, "head-scale-horiz-incr": 0.2, "head-scale-depth-incr": 0.2,
    "l-eye-scale-incr": 0.3, "r-eye-scale-incr": 0.3,
    "mouth-angles-up": 0.25, "mouth-lowerlip-volume-incr": 0.2,
    "measure-shoulder-dist-incr": 0.6, "torso-vshape-incr": 0.6, "torso-muscle-pectoral-incr": 0.2, "neck-scale-horiz-incr": 0.3,
    "measure-waist-circ-decr": 0.3, "hip-scale-horiz-decr": 0.3,
}
