#!/bin/zsh
# Round three vehicles: generated from clean side-view pictures, generated wheels cut out and replaced by clean spinning wheels, colour variants, anchors.
#   scripts/street-assets/build_vehicles3.sh <generated-dir> <work-dir> <out-dir> [name ...]   (files a-<name>.glb in <generated-dir>; configs/<name>.json)
set -e
SRC=$1; WORK=$2; OUT=$3; shift 3
HERE=${0:A:h}; BLENDER=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
mkdir -p $WORK $OUT
NAMES=("$@"); [ ${#NAMES} -eq 0 ] && NAMES=(danfo keke okada bus saloon suv pickup van)
typeset -A NEAR FAR SRCNAME
NEAR=(danfo 3000 keke 2200 okada 2400 bus 2800 saloon 2800 suv 2800 pickup 2800 van 2800); FAR=(danfo 600 keke 450 okada 500 bus 700 saloon 600 suv 600 pickup 600 van 600)
for N in $NAMES; do
  CFG=$N; [ -f $HERE/configs/${N}3.json ] && CFG=${N}3
  GEN=$N; [ $N = danfo ] && GEN=../street2/a-danfo; [ $N = keke ] && GEN=../street2/a-keke
  for V in near far; do
    T=$NEAR[$N]; PX=512; ID=$N; [ $V = far ] && { T=$FAR[$N]; PX=256; ID=$N-far; }
    F=$SRC/a-$N.glb; [ $N = danfo ] && F=$SRC/../street2/a-danfo.glb; [ $N = keke ] && F=$SRC/../street2/a-keke.glb
    $BLENDER --background --disable-autoexec --python-exit-code 1 --python $HERE/blender/vehicle.py -- $F $HERE/configs/$CFG.json $WORK/$ID $ID $T $PX $V | grep -E "^(CUT|VEHICLE)" | cut -c1-180
    npx -y gltfpack@1.3.0 -i $WORK/$ID/$ID.raw.glb -o $OUT/$ID.glb -cc -kn -km > /dev/null
    VARS=$(python3 -I -c "import json,sys; print(' '.join(json.load(open(sys.argv[1])).get(sys.argv[2], {})))" $HERE/configs/variants.json $CFG)
    if [ -n "$VARS" ]; then
      $BLENDER --background --disable-autoexec --python-exit-code 1 --python $HERE/blender/variants.py -- $WORK/$ID/$ID.blend $WORK/$ID/$ID-color.jpg $HERE/configs/variants.json $CFG $WORK/$ID $ID | grep "^VARIANT" | cut -c1-80
      for X in ${=VARS}; do
        SUFFIX=; [ $V = far ] && SUFFIX=-far
        python3 -I $HERE/swap_texture.py $WORK/$ID/$ID.raw.glb $WORK/$ID/$ID-$X-color.jpg $WORK/$ID/$N-$X$SUFFIX.raw.glb
        npx -y gltfpack@1.3.0 -i $WORK/$ID/$N-$X$SUFFIX.raw.glb -o $OUT/$N-$X$SUFFIX.glb -cc -kn -km > /dev/null
      done
    fi
  done
done
