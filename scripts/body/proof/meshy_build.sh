#!/bin/zsh
# Turns one generated character file into the game-ready hero and crowd files on the game skeleton.
#   scripts/body/proof/meshy_build.sh <in.glb> <work-dir> <out-dir> <name> <stylised|realistic> [<landmarks.json>] [--hem <fraction of height>]
# <name>-hero.glb (about 13,000 triangles, 1024 px texture with a normal map) and <name>-crowd.glb (about 2,800 triangles, 512 px) land in <out-dir>
# with a <name>-<version>.json holding the character's height. Needs Blender 5.2 (run headless) and, for the packing step, npx gltfpack@1.3.0.
# SKIP_REDUCE=1 reuses the reduced files already in <work-dir>.
set -e
IN=$1; WORK=$2; OUT=$3; NAME=$4; KIND=$5; LM=$6; shift 5; [ -n "$LM" ] && shift
HEM=0.13; [ "$1" = "--hem" ] && HEM=$2
HERE=${0:A:h}; B=$HERE/blender
mkdir -p $WORK $OUT
BL() { blender --background --disable-autoexec --python-exit-code 1 --python "$@" ; }
for V in hero crowd; do
  if [ $V = hero ]; then TRIS=13000; PX=1024; NORMAL=--normal; else TRIS=2800; PX=512; NORMAL=; fi
  [ -z "$SKIP_REDUCE" ] && BL $B/meshy_reduce.py -- $IN $WORK/$NAME-$V.blend $WORK $NAME-$V $TRIS $PX $NORMAL
  BL $B/meshy_rig.py -- $WORK/$NAME-$V.blend $B/skeleton-female.json $WORK/$NAME-$V-parts.glb $WORK/$NAME-$V-joints.json $KIND ${LM:-none} --hem $HEM
  EXTRA=; [ -n "$NORMAL" ] && EXTRA="--normal $WORK/$NAME-$V-normal.jpg"
  node --experimental-strip-types $HERE/meshy_assemble.ts $WORK/$NAME-$V-parts.glb $WORK/$NAME-$V-joints.json $WORK/$NAME-$V.raw.glb $WORK/$NAME-$V-color.jpg ${=EXTRA}
  npx -y gltfpack@1.3.0 -i $WORK/$NAME-$V.raw.glb -o $OUT/$NAME-$V.glb -cc -kn -km -kv -vtf >/dev/null
  node -e "const j=JSON.parse(require('fs').readFileSync('$WORK/$NAME-$V-joints.json','utf8'));require('fs').writeFileSync('$OUT/$NAME-$V.json',JSON.stringify({height:j.height}))"
done
echo "built $NAME"
