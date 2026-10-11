#!/bin/zsh
# Builds the street set (buildings and props on the shared atlas) and packs it.
#   scripts/street-assets/build_set.sh <work-dir> <out-dir> [type ...]
set -e
WORK=$1; OUT=$2; shift 2
HERE=${0:A:h}; BLENDER=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
mkdir -p $WORK $OUT
[ -f $WORK/atlas/atlas-cream-near.jpg ] || $BLENDER --background --python $HERE/blender/make_atlas.py -- $HERE/textures $WORK/atlas > /dev/null
TYPES=("$@"); [ ${#TYPES} -eq 0 ] && TYPES=(shops shoprow church mosque school clinic filling bank unfinished kiosk stall table generator lamp tank signboard busstop wheelbarrow fencegate gutter bin billboard trafficlight plantain pawpaw shadetree grass hedge)
for T in $TYPES; do
  case $T in shops|shoprow|church|mosque|school|clinic|filling|bank|unfinished) VARS=(cream mint sky);; kiosk|stall) VARS=(teal red blue);; *) VARS=(cream);; esac
  for V in $VARS; do for L in near far; do
    $BLENDER --background --disable-autoexec --python-exit-code 1 --python $HERE/blender/set_build.py -- $T $V $L $WORK $WORK/atlas | grep -E "^SET|Error|Trace|line " | cut -c1-160
    SUF=; [ $L = far ] && SUF=-far
    npx -y gltfpack@1.3.0 -i $WORK/$T-$V$SUF.raw.glb -o $OUT/$T-$V$SUF.glb -cc -kn -km > /dev/null
  done; done
done
