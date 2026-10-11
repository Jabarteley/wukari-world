#!/bin/zsh
# Reduces and packs the generated street models.
#   scripts/street-assets/build.sh <originals-dir> <work-dir> <out-dir> [name ...]
# For each name (default: all six) writes <out-dir>/<name>.glb (near) and <out-dir>/<name>-far.glb (about a fifth of the triangles, 256 px).
# Needs Blender 5.2 (BLENDER overrides the path) and, for the packing, npx gltfpack@1.3.0. Nothing here touches the originals.
set -e
SRC=$1; WORK=$2; OUT=$3; shift 3
HERE=${0:A:h}
BLENDER=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
NAMES=("$@"); [ ${#NAMES} -eq 0 ] && NAMES=(danfo keke house kiosk mango-tree palm)
# near triangles, far triangles
typeset -A NEAR FAR
NEAR=(danfo 3000 keke 2000 house 3000 kiosk 2000 mango-tree 2000 palm 1500)
FAR=(danfo 600 keke 400 house 600 kiosk 400 mango-tree 400 palm 300)
mkdir -p $WORK $OUT
for N in $NAMES; do
  for V in near far; do
    if [ $V = near ]; then T=$NEAR[$N]; PX=${NEAR_PX:-512}; ID=$N; else T=$FAR[$N]; PX=256; ID=$N-far; fi
    $BLENDER --background --disable-autoexec --python-exit-code 1 --python $HERE/blender/reduce_asset.py -- $SRC/$N.glb $HERE/configs/$N.json $WORK/$ID $ID $T $PX | grep -E "^(ISLANDS|SIZE|REDUCED)"
    npx -y gltfpack@1.3.0 -i $WORK/$ID/$ID.raw.glb -o $OUT/$ID.glb -cc -kn -km > /dev/null
    # colour variants: the same model with another texture, recoloured through region masks (configs/variants.json)
    VARS=$(python3 -I -c "import json,sys; print(' '.join(json.load(open(sys.argv[1])).get(sys.argv[2], {})))" $HERE/configs/variants.json $N)
    if [ -n "$VARS" ]; then
      $BLENDER --background --disable-autoexec --python-exit-code 1 --python $HERE/blender/variants.py -- $WORK/$ID/$ID.blend $WORK/$ID/$ID-color.jpg $HERE/configs/variants.json $N $WORK/$ID $ID | grep "^VARIANT"
      for X in ${=VARS}; do
        SUFFIX=; [ $V = far ] && SUFFIX=-far
        python3 -I $HERE/swap_texture.py $WORK/$ID/$ID.raw.glb $WORK/$ID/$ID-$X-color.jpg $WORK/$ID/$N-$X$SUFFIX.raw.glb
        npx -y gltfpack@1.3.0 -i $WORK/$ID/$N-$X$SUFFIX.raw.glb -o $OUT/$N-$X$SUFFIX.glb -cc -kn -km > /dev/null
      done
    fi
  done
done
ls -l $OUT
