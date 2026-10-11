#!/bin/zsh
# Room shells: scripts/street-assets/build_rooms.sh <work-dir> <out-dir>   (four floors for each of selfcontain, flat, house3, hall)
set -e
WORK=$1; OUT=$2
HERE=${0:A:h}; BLENDER=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
mkdir -p $WORK $OUT/info
for K in selfcontain flat house3 hall; do for F in ceramic terrazzo parquet checker; do
  $BLENDER --background --disable-autoexec --python-exit-code 1 --python $HERE/blender/rooms.py -- $K $F $WORK | grep -E "^ROOM|rror|Trace|line " || true
  npx -y gltfpack@1.3.0 -i $WORK/room-$K-$F.raw.glb -o $OUT/room-$K-$F.glb -cc -kn -km -kv -vtf -vpf > /dev/null
done; cp $WORK/room-$K.json $OUT/info/; done
