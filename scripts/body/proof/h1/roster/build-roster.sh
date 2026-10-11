#!/bin/zsh
# Builds (or rebuilds) roster characters from their posed figures:  build-roster.sh <work-root> <generated-downloads-dir> <id> [<id> ...]
# <work-root>/<id>/ holds <id>-posed.blend and <id>-joints.json (from pose_high.py) once; every later run skips the pose step.
# Per-figure options are listed here, one place for the whole roster.
set -eu
ROOT=$1; DL=$2; shift 2
HERE=${0:A:h}; H=${HERE:h}
export BLENDER=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
typeset -A OPT SEX NOCULL
OPT=(
 m1 "--hip-ratio 0.53 --split 0.95 --sleeve-x 0.40 --feet-shoes 1"
 m2 "--hip-ratio 0.53 --split 0.1 --sleeve-x 0.7 --feet-shoes 1"
 m3 "--hip-ratio 0.53 --split 0.1 --sleeve-x 0.8 --feet-shoes 1 --wrapper 1 --hem 0.25"
 m4 "--hip-ratio 0.53 --split 1.0 --sleeve-x 0.7 --feet-shoes 1"
 m5 "--hip-ratio 0.53 --split 1.0 --sleeve-x 0.7 --feet-shoes 1"
 m6 "--hip-ratio 0.53 --split 1.0 --sleeve-x 0.4 --feet-shoes 1"
 w1 "--hip-ratio 0.54 --split 1.0 --sleeve-x 0.36 --wrapper 1 --hem 0.13"
 w2 "--hip-ratio 0.54 --split 0.1 --sleeve-x 0.62 --wrapper 1 --hem 0.1"
 w3 "--hip-ratio 0.54 --split 1.08 --sleeve-x 0.30 --feet-shoes 1"
 w4 "--hip-ratio 0.54 --split 0.95 --sleeve-x 0.45 --bare-leg-z 0.62 --feet-shoes 1"
 w5 "--hip-ratio 0.54 --split 0.8 --sleeve-x 0.5 --wrapper 1 --hem 0.1"
 w6 "--hip-ratio 0.54 --split 0.1 --sleeve-x 0.5 --wrapper 1 --hem 0.12"
)
# the ray test that culls hidden faces removes visible faces of trousers and gowns (white or black streaks), so no figure is culled
NOCULL=(m1 1 m2 1 m3 1 m4 1 m5 1 m6 1 w1 1 w2 1 w3 1 w4 1 w5 1 w6 1)
typeset -A TFX
TFX=(w1 "--hair-smooth 1" m6 "--logo-z 1.73" w6 "--pink-fix 1.25,1.47 --skin 0.698,0.431,0.306")
for n in "$@"; do
  sx=male; [[ $n = w* ]] && sx=female
  mkdir -p $ROOT/$n $ROOT/out
  cd $ROOT
  nc=; [[ -n ${NOCULL[$n]:-} ]] && nc=1
  TEXFIX_ARGS="${TFX[$n]:-}" SKIPPOSE=1 REDUCE_NOCULL=$nc REDUCE_JOINTS= $H/build.sh $n $sx $DL/$n-rigged.glb same $n out ${=OPT[$n]} 2>&1 | grep -E "EYES|KEPT|packed|built|rror|Trace" | cut -c1-160 | sed "s/^/$n /"
done
