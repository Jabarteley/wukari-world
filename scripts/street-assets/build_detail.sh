#!/bin/zsh
# Exterior detail pieces: scripts/street-assets/build_detail.sh <work-dir> <out-dir>
set -e
WORK=$1; OUT=$2
HERE=${0:A:h}; BLENDER=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
mkdir -p $WORK $OUT/info
for P in balcony bars-window awning ac-external dish number-sign gate-fence gatehouse security-light generator-hut clothes-line; do
  $BLENDER --background --disable-autoexec --python-exit-code 1 --python $HERE/blender/detail.py -- $P $WORK | grep -E "^DETAIL|rror|Trace|line " || true
  npx -y gltfpack@1.3.0 -i $WORK/detail-$P.raw.glb -o $OUT/detail-$P.glb -cc -kn -km -kv -vtf -vpf > /dev/null
  cp $WORK/detail-$P.json $OUT/info/
done
