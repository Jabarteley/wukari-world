#!/bin/zsh
# Rebuilds the Blender-made characters end to end.
#   scripts/body/proof/rebuild.sh <work-dir> <out-dir> <female|male> [stage ...]
# Stages (default: all in this order): atlas body keys skin fin export shoes hair garments crowd
# <work-dir> holds the intermediate .blend and .glb files, <out-dir> receives the game-ready parts. Needs Blender 5.2 with the
# MPFB add-on and the CC0 asset pack (see SOURCES.md) and, for the packing step, npx gltfpack@1.3.0.
set -e
WORK=$1; OUT=$2; SEX=$3; shift 3
HERE=${0:A:h}; B=$HERE/blender
mkdir -p $WORK $OUT
STAGES=("$@"); [ ${#STAGES[@]} -eq 0 ] && STAGES=(atlas body keys skin fin export shoes hair garments crowd)
has() { [[ " ${STAGES[*]} " == *" $1 "* ]]; }
BL() { blender --background --disable-autoexec --python-exit-code 1 --python "$@" ; }
NODE() { node --experimental-strip-types "$@"; }
pack() { npx -y gltfpack@1.3.0 -i "$1" -o "$2" -cc -kn -km -kv -vtf "${@:3}" >/dev/null; }
if [ $SEX = female ]; then PARTS="shoes:shoes06"; TRIM=0.04; DRESS=dress; HAIRS=(braids afro gele); else PARTS="shoes:shoes02,hair:short01"; TRIM=0.04; DRESS=kaftan; HAIRS=(afro); fi

has atlas && [ $SEX = female ] && BL $B/make_face_atlas.py -- $HERE/assets2/brow.png $HERE/assets2/lash.png $OUT/face-atlas.png $WORK/rects.json $OUT/crowd-face.png
has body && AW_PARTS=$PARTS BL $B/build_body.py -- $SEX $B/skeleton-$SEX.json $WORK/$SEX-1.blend
has keys && BL $B/face_keys.py -- $WORK/$SEX-1.blend $WORK/$SEX-2.blend
has skin && BL $B/bake_skin.py -- $WORK/$SEX-2.blend $WORK/$SEX-3.blend
if has fin; then
  BL $B/finalize.py -- $WORK/$SEX-3.blend $WORK/$SEX-4.blend $WORK/rects.json
fi
if has export; then
  # the reference (full-detail) character, used to measure the garments
  BL $B/export_gltf.py -- $WORK/$SEX-3.blend $WORK/$SEX-ref-parts.glb $WORK/$SEX-ref-joints.json
  NODE $HERE/assemble.ts $WORK/$SEX-ref-parts.glb $WORK/$SEX-ref-joints.json $SEX $WORK/$SEX-ref.glb
  # the light hero character
  BL $B/export_gltf.py -- $WORK/$SEX-4.blend $WORK/$SEX-parts.glb $WORK/$SEX-joints.json
  NODE $HERE/assemble.ts $WORK/$SEX-parts.glb $WORK/$SEX-joints.json $SEX $WORK/$SEX-final.glb
  pack $WORK/$SEX-final.glb $OUT/char-$SEX.glb
  cp $WORK/$SEX-final.json $OUT/char-$SEX.json
fi
if has shoes; then
  OBJ=Body.${PARTS#shoes:}; OBJ=${OBJ%%,*}
  AW_PART_PUSH=0.006 AW_TRIM_ABOVE=$TRIM AW_PART_RATIO=0.55 BL $B/build_part.py -- $WORK/$SEX-2.blend $OBJ $WORK/shoes-$SEX-parts.glb shoe
  NODE $HERE/assemble.ts $WORK/shoes-$SEX-parts.glb $WORK/$SEX-joints.json $SEX $WORK/shoes-$SEX-final.glb
  pack $WORK/shoes-$SEX-final.glb $OUT/shoes-$SEX.glb
  AW_PART_PUSH=0.006 AW_TRIM_ABOVE=$TRIM AW_PART_RATIO=0.15 BL $B/build_part.py -- $WORK/$SEX-2.blend $OBJ $WORK/shoes-lod-$SEX-parts.glb shoe
  NODE $HERE/assemble.ts $WORK/shoes-lod-$SEX-parts.glb $WORK/$SEX-joints.json $SEX $WORK/shoes-lod-$SEX-final.glb
  pack $WORK/shoes-lod-$SEX-final.glb $OUT/shoes-lod-$SEX.glb
fi
if has hair; then
  for H in $HAIRS; do
    for L in 0 1; do
      N=hair-$H; [ $L = 1 ] && N=hair-$H-lod
      AW_LOD=$L BL $B/build_hair.py -- $WORK/$SEX-2.blend $H $WORK/$N-$SEX-parts.glb
      NODE $HERE/assemble.ts $WORK/$N-$SEX-parts.glb $WORK/$SEX-joints.json $SEX $WORK/$N-$SEX-final.glb
      pack $WORK/$N-$SEX-final.glb $OUT/$N-$SEX.glb
    done
  done
  if [ $SEX = male ]; then
    AW_PART_RATIO=0.6 BL $B/build_part.py -- $WORK/male-2.blend Body.short01 $WORK/hair-lowcut-male-parts.glb hairfade
    NODE $HERE/assemble.ts $WORK/hair-lowcut-male-parts.glb $WORK/male-joints.json male $WORK/hair-lowcut-male-final.glb
    pack $WORK/hair-lowcut-male-final.glb $OUT/hair-lowcut-male.glb
    AW_PART_RATIO=0.15 BL $B/build_part.py -- $WORK/male-2.blend Body.short01 $WORK/hair-lowcut-lod-male-parts.glb hairfade
    NODE $HERE/assemble.ts $WORK/hair-lowcut-lod-male-parts.glb $WORK/male-joints.json male $WORK/hair-lowcut-lod-male-final.glb
    pack $WORK/hair-lowcut-lod-male-final.glb $OUT/hair-lowcut-lod-male.glb
  fi
fi
if has garments; then
  NODE $HERE/build-garment.ts $WORK/$SEX-ref.glb $SEX $DRESS $WORK/$DRESS-$SEX.glb
  pack $WORK/$DRESS-$SEX.glb $OUT/$DRESS-$SEX.glb
  NODE $HERE/build-garment.ts $WORK/$SEX-ref.glb $SEX $DRESS $WORK/$DRESS-lod-$SEX.glb --lod
  pack $WORK/$DRESS-lod-$SEX.glb $OUT/$DRESS-lod-$SEX.glb
fi
if has crowd; then
  BL $B/crowd_body.py -- $WORK/$SEX-4.blend $WORK/$SEX-crowd.blend
  BL $B/export_gltf.py -- $WORK/$SEX-crowd.blend $WORK/$SEX-crowd-parts.glb $WORK/$SEX-crowd-joints.json
  NODE $HERE/assemble.ts $WORK/$SEX-crowd-parts.glb $WORK/$SEX-joints.json $SEX $WORK/char-lod-$SEX-final.glb --lod
  ALL=($HAIRS); [ $SEX = male ] && ALL=($HAIRS lowcut)
  for H in $ALL; do
    NODE $HERE/merge-crowd.ts $WORK/char-lod-$SEX-final.glb $WORK/hair-$H-lod-$SEX-final.glb $WORK/$DRESS-lod-$SEX.glb $WORK/shoes-lod-$SEX-final.glb $WORK/crowd-$H-$SEX.glb
    pack $WORK/crowd-$H-$SEX.glb $OUT/crowd-$H-$SEX.glb
  done
fi
echo "rebuild $SEX done"
