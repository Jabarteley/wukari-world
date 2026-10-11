#!/bin/zsh
# Turns one generated A-pose figure (a rigged light mesh, optionally a heavier static mesh of the same figure) into the player and crowd files the game plays its own clips on.
#   h1/build.sh <name> <male|female> <rigged.glb> <detail.glb|same> <work-dir> <out-dir> [--hip-ratio 0.52] [--split z] [--sleeve-x x] [--bare-leg-z z] [--feet-shoes 1] [--wrapper 1 --hem 0.13] [--iris r,g,b]
# Steps: pose_high.py (limbs to the game's rest directions, legs to the game's proportions, scale to the game's thigh joints) -> reduce_figure.py (cull hidden surface, decimate to 13,000 and
# 2,800 triangles, fresh unwrap, bake colour at 1024 and 512 px) -> face_eyes.py (find the eyes, paint them) -> make_mask.py (skin/top/bottom/footwear labels) -> finish.sh (bind to the
# game's 23 bones with jaw/mouth/brow shape keys on the player file, pack) -> make-meta.mjs.  The 3D tool is the one named by $BLENDER (default: blender on the path).
set -eu
NAME=$1; SKEL=$2; RIGGED=$3; DETAIL=$4; WORK=$5; OUT=$6; shift 6
HIP=0.52; SPLIT=0.7; SLEEVE=0.4; LEG=0; FEET=0; IRIS=0.36,0.20,0.09; RIG=()
while (( $# )); do
  case $1 in
    --hip-ratio) HIP=$2; shift 2;;
    --split) SPLIT=$2; shift 2;;
    --sleeve-x) SLEEVE=$2; shift 2;;
    --bare-leg-z) LEG=$2; shift 2;;
    --feet-shoes) FEET=$2; shift 2;;
    --iris) IRIS=$2; shift 2;;
    --wrapper|--hem) RIG+=($1 $2); shift 2;;
    *) print -u2 "unknown option $1"; exit 2;;
  esac
done
HERE=${0:A:h}; P=${HERE:h}; B=$P/blender
BL=${BLENDER:-blender}
mkdir -p "$WORK" "$OUT"
run() { perl -e 'alarm shift; exec @ARGV' 1500 "$BL" -b --disable-autoexec --python-exit-code 1 "$@"; }
run -P "$HERE/pose_high.py" -- "$RIGGED" "$DETAIL" "$B/skeleton-$SKEL.json" "$WORK/$NAME-posed.blend" "$WORK/$NAME-joints.json" --hip-ratio $HIP | grep -E "WARP|POSED"
for V in hero crowd; do
  if [[ $V = hero ]]; then TRIS=13000; PX=1024; else TRIS=2800; PX=512; fi
  REDUCE_JOINTS="$WORK/$NAME-joints.json" run -P "$B/reduce_figure.py" -- "$WORK/$NAME-posed.blend" "$WORK/$NAME-$V.blend" "$WORK" "$NAME-$V" $TRIS $PX | grep REDUCED
  if [[ $V = hero ]]; then MODE=--detect; else MODE=--use; fi
  run -P "$HERE/face_eyes.py" -- "$WORK/$NAME-$V.blend" "$WORK/$NAME-$V-color.jpg" "$WORK/$NAME-$V-color-eyes.jpg" "$WORK/$NAME-face.json" $MODE --iris $IRIS
  run -P "$HERE/make_mask.py" -- "$WORK/$NAME-$V.blend" "$WORK/$NAME-$V-color-eyes.jpg" "$WORK/$NAME-joints.json" "$WORK/$NAME-face.json" "$WORK/$NAME-$V-mask.png" "$WORK/$NAME-$V-mask.json" --split $SPLIT --sleeve-x $SLEEVE --bare-leg-z $LEG $( [[ $FEET = 1 ]] && echo --feet-shoes 1 )
  FACE=(); [[ $V = hero ]] && FACE=(--face "$WORK/$NAME-face.json")
  BLENDER=$BL COLOR="$WORK/$NAME-$V-color-eyes.jpg" "$HERE/finish.sh" "$WORK" "$NAME" $SKEL $V "$OUT" $RIG $( [[ $V = hero ]] && echo --face "$WORK/$NAME-face.json" ) $FACE
  cp "$WORK/$NAME-$V-mask.png" "$OUT/$NAME-$V-mask.png"
  node "$HERE/make-meta.mjs" "$WORK/$NAME-face.json" "$WORK/$NAME-$V-pj.json" $SKEL "$OUT/$NAME-$V.json" "$NAME-$V-mask.png" "$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).skinRef.join(","))' "$WORK/$NAME-$V-mask.json")"
done
echo "built $NAME"
