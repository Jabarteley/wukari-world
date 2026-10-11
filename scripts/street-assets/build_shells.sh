#!/bin/zsh
# Builds the clean-geometry buildings and stalls and packs them.
#   scripts/street-assets/build_shells.sh <work-dir> <out-dir> [type ...]
set -e
WORK=$1; OUT=$2; shift 2
HERE=${0:A:h}
BLENDER=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
TYPES=("$@"); [ ${#TYPES} -eq 0 ] && TYPES=(bungalow house2 flats kiosk stall)
mkdir -p $WORK $OUT
for T in $TYPES; do
  case $T in kiosk|stall) VARS=(teal red blue);; *) VARS=(cream mint sky);; esac
  for V in $VARS; do for L in near far; do
    $BLENDER --background --disable-autoexec --python-exit-code 1 --python $HERE/blender/shells.py -- $T $V $L $WORK $HERE/textures | grep -E "^SHELL" | cut -c1-200
    SUF=; [ $L = far ] && SUF=-far
    npx -y gltfpack@1.3.0 -i $WORK/$T-$V$SUF.raw.glb -o $OUT/$T-$V$SUF.glb -cc -kn -km > /dev/null
  done; done
done
