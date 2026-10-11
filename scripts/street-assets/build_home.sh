#!/bin/zsh
# Builds the home set: the shared atlas, every furniture piece (near and far where it matters), and packs them without an image.
#   scripts/street-assets/build_home.sh <pictures-dir> <work-dir> <out-dir> [piece ...]
set -e
PIC=$1; WORK=$2; OUT=$3; shift 3
HERE=${0:A:h}; BLENDER=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
mkdir -p $WORK $OUT
[ -f $OUT/home-atlas.jpg ] || $BLENDER --background --python $HERE/blender/make_home_atlas.py -- $PIC $OUT/home-atlas.jpg > /dev/null
PIECES=("$@"); [ ${#PIECES} -eq 0 ] && PIECES=(sofa2 sofa3 armchair coffee-table rug1 rug2 rug3 tv-console fan-standing fan-ceiling ac-unit lamp-floor frame-lagoon frame-adire frame-portrait bookshelf dining dining-laid chair-plastic stool cabinet-base cabinet-sink cabinet-wall cooker cooker-pots fridge microwave water-dispenser bed-single bed-double mattress wardrobe dressing-table bedside toilet basin shower bucket-bowl washing-line generator inverter gas-cylinder shoe-rack plant-tall plant-bushy prayer-mat ring-light desk-laptop curtains hall-table stage high-table backdrop uplight dance-floor drape-swag)
for P in $PIECES; do
  # the variants a piece offers: read from its own record after the first build
  $BLENDER --background --disable-autoexec --python-exit-code 1 --python $HERE/blender/furniture.py -- $P default near $WORK | grep -E "^PIECE|rror|Trace|line " | cut -c1-120 || true
  npx -y gltfpack@1.3.0 -i $WORK/$P.raw.glb -o $OUT/$P.glb -cc -kn -km -kv -vtf -vpf > /dev/null
  VARS=$(python3 -I -c "import json,sys; print(' '.join(json.load(open(sys.argv[1]))['variants']))" $WORK/$P.json)
  for V in ${=VARS}; do
    [ $V = default ] && continue
    $BLENDER --background --disable-autoexec --python-exit-code 1 --python $HERE/blender/furniture.py -- $P $V near $WORK | grep -E "rror|Trace|line " || true
    npx -y gltfpack@1.3.0 -i $WORK/$P-$V.raw.glb -o $OUT/$P-$V.glb -cc -kn -km -kv -vtf -vpf > /dev/null
  done
  mkdir -p $OUT/info; cp $WORK/$P.json $OUT/info/
done
