#!/bin/zsh
# Round two vehicles: generated again from a clean side-view picture, flat panels merged first (limited dissolve) and only then collapsed.
#   scripts/street-assets/build_vehicles2.sh <generated-dir> <work-dir> <out-dir>      (files a-danfo.glb, a-keke.glb in <generated-dir>)
set -e
SRC=$1; WORK=$2; OUT=$3
HERE=${0:A:h}; BLENDER=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
mkdir -p $WORK $OUT
typeset -A NEAR FAR; NEAR=(danfo 3000 keke 2000); FAR=(danfo 600 keke 400)
for N in danfo keke; do for V in near far; do
  T=$NEAR[$N]; PX=512; ID=$N; NW=; [ $V = far ] && { T=$FAR[$N]; PX=256; ID=$N-far; NW=1; }
  REDUCE_NOWHEELS=$NW $BLENDER --background --disable-autoexec --python-exit-code 1 --python $HERE/blender/reduce_asset.py -- $SRC/a-$N.glb $HERE/configs/${N}2.json $WORK/$ID $ID $T $PX | grep -E "^(PLANAR|REDUCED)" | cut -c1-200
  npx -y gltfpack@1.3.0 -i $WORK/$ID/$ID.raw.glb -o $OUT/$ID.glb -cc -kn -km > /dev/null
done; done
