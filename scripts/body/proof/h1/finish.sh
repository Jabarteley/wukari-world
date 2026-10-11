#!/bin/zsh
# Binds a reduced figure to the game skeleton, assembles it with its baked colour and packs it.
#   h1/finish.sh <work-dir> <name> <male|female> <hero|crowd> <out-dir> [rig_game.py options: --wrapper 1 --hem 0.13 --face face.json]
# Needs <work-dir>/<name>-joints.json (pose_high.py) and <work-dir>/<name>-<variant>.blend and -color.jpg (meshy_reduce.py).
set -eu
WORK=$1; NAME=$2; SKEL=$3; V=$4; OUT=$5; shift 5
HERE=${0:A:h}; B=${HERE:h}/blender; P=${HERE:h}
BL=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
mkdir -p "$OUT"
perl -e 'alarm shift; exec @ARGV' 900 $BL -b --disable-autoexec --python-exit-code 1 -P "$HERE/rig_game.py" -- "$WORK/$NAME-$V.blend" "$B/skeleton-$SKEL.json" "$WORK/$NAME-joints.json" "$WORK/$NAME-$V-parts.glb" "$WORK/$NAME-$V-pj.json" "$@" 2>&1 | grep -E "RIGGED|FACE KEYS|WRAPPER|rror" || true
node --experimental-strip-types "$P/meshy_assemble.ts" "$WORK/$NAME-$V-parts.glb" "$WORK/$NAME-$V-pj.json" "$WORK/$NAME-$V.raw.glb" "$WORK/$NAME-$V-color.jpg" --skeleton $SKEL
perl -e 'alarm shift; exec @ARGV' 300 npx -y gltfpack@1.3.0 -i "$WORK/$NAME-$V.raw.glb" -o "$OUT/$NAME-$V.glb" -cc -kn -km -kv -vtf -vpf > /dev/null
node -e 'const f=require("fs"),b=f.readFileSync(process.argv[1]),n=b.readUInt32LE(12),d=JSON.parse(b.subarray(20,20+n));if(b.length>2097152)throw Error(`over 2 MiB: ${b.length}`);if(d.animations?.length)throw Error("model contains animations");if(d.skins?.length!==1||d.skins[0].joints.length!==23)throw Error("model must contain one 23-joint skin");console.log("packed",process.argv[1],b.length,"bytes")' "$OUT/$NAME-$V.glb"
