#!/bin/zsh
# Clean-profile cars (saloon in four colours, SUV, pickup, van): scripts/street-assets/build_cars.sh <work-dir> <out-dir>
set -e
WORK=$1; OUT=$2
HERE=${0:A:h}; BLENDER=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
mkdir -p $WORK $OUT
for SPEC in saloon:cream saloon:red saloon:blue saloon:green suv:white suv:black pickup:white pickup:blue van:white van:blue; do
  T=${SPEC%%:*}; V=${SPEC##*:}
  for L in near far; do
    $BLENDER --background --disable-autoexec --python-exit-code 1 --python $HERE/blender/car_shell.py -- $T $V $L $WORK | grep -E "^CAR|Error|Trace|line " | cut -c1-160
    SUF=; [ $L = far ] && SUF=-far
    npx -y gltfpack@1.3.0 -i $WORK/$T-$V$SUF.raw.glb -o $OUT/$T-$V$SUF.glb -cc -kn -km > /dev/null
  done
done
