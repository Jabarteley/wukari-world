#!/bin/zsh
# Builds the head part and the body part of one generated figure (after pose_high.py and split_parts.py have written <work>/<name>-head-high.blend, -body-high.blend, -seam.json).
#   h1/build_set.sh <name> <male|female> <work-dir> <out-dir> <head tris> <head px> <body tris> <body px> -- <make_regions.py body options>
# reduce (cull, decimate, fresh unwrap, bake) -> eyes (find and paint, head only) -> regions (soft skin/top/bottom/footwear weights) -> bind to the 23 bones with the seam weights ->
# assemble and pack.  The 3D tool is $BLENDER.
set -eu
NAME=$1; SKEL=$2; WORK=$3; OUT=$4; HT=$5; HP=$6; BT=$7; BP=$8; shift 8; [[ $1 = -- ]] && shift
HERE=${0:A:h}; P=${HERE:h}; B=$P/blender; BL=${BLENDER:-blender}
mkdir -p "$OUT"
run() { perl -e 'alarm shift; exec @ARGV' 1500 "$BL" -b --disable-autoexec --python-exit-code 1 "$@"; }
CUT=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).cut)' "$WORK/$NAME-seam.json")
export REDUCE_H=1.8 REDUCE_JOINTS="$WORK/$NAME-joints.json"
REDUCE_UV=front REDUCE_EXTR=${HEXTR:-0.022} REDUCE_RAY=${HRAY:-0.07} REDUCE_QUALITY=${HQ:-80} run -P "$B/reduce_figure.py" -- "$WORK/$NAME-head-high.blend" "$WORK/$NAME-head.blend" "$WORK" "$NAME-head" $HT $HP --no-protect | grep REDUCED
REDUCE_EXTR=${EXTR:-0.012} REDUCE_RAY=${RAY:-0.04} REDUCE_QUALITY=${BQ:-66} run -P "$B/reduce_figure.py" -- "$WORK/$NAME-body-high.blend" "$WORK/$NAME-body.blend" "$WORK" "$NAME-body" $BT $BP | grep REDUCED
run -P "$HERE/face_eyes.py" -- "$WORK/$NAME-head.blend" "$WORK/$NAME-head-color.jpg" "$WORK/$NAME-head-color-eyes.jpg" "$WORK/$NAME-face.json" --detect --head-part | grep LANDMARKS | cut -c1-80
run -P "$HERE/make_regions.py" -- "$WORK/$NAME-head.blend" "$WORK/$NAME-head-color-eyes.jpg" "$OUT/$NAME-head-mask.png" "$WORK/$NAME-head-regions.json" --kind head --mask-px ${HMASK:-256} | grep REGIONS | cut -c1-120
run -P "$HERE/make_regions.py" -- "$WORK/$NAME-body.blend" "$WORK/$NAME-body-color.jpg" "$OUT/$NAME-body-mask.png" "$WORK/$NAME-body-regions.json" --kind body --mask-px ${BMASK:-384} "$@" | grep REGIONS | cut -c1-160
BLENDER=$BL COLOR="$WORK/$NAME-head-color-eyes.jpg" "$HERE/finish.sh" "$WORK" "$NAME" $SKEL head "$OUT" --part 1 --neck-cut $CUT --face "$WORK/$NAME-face.json" | tail -1
BLENDER=$BL "$HERE/finish.sh" "$WORK" "$NAME" $SKEL body "$OUT" --part 1 --neck-cut $CUT | tail -1
run -P "$HERE/head_info.py" -- "$WORK/$NAME-head.blend" $CUT "$WORK/$NAME-headinfo.json" | grep HEADINFO | cut -c1-100
