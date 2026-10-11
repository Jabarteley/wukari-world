#!/bin/zsh
# Turns one generated character file into the game-ready hero and crowd files on the game skeleton.
#   scripts/body/proof/meshy_build.sh <in.glb> <work-dir> <out-dir> <name> <stylised|realistic> [<landmarks.json>] [--hem <fraction>] --skeleton <female|male> [--vendor <free|pro>]
# <name>-hero.glb (about 13,000 triangles, 1024 px texture; NORMALMAP=1 adds a baked normal map) and <name>-crowd.glb (about 2,800 triangles, 512 px) land in <out-dir>
# with a <name>-<version>.json holding the character's height. Needs Blender 5.2 (run headless) and, for the packing step, npx gltfpack@1.3.0.
# FACE=<face.json> adds jaw, mouth-corner and brow shape keys to the hero and copies the face description into its .json.
# SKIP_REDUCE=1 reuses the reduced files already in <work-dir>.
set -eu
(( $# >= 5 )) || { print -u2 "usage: $0 <in.glb> <work-dir> <out-dir> <name> <stylised|realistic> [landmarks.json] [--hem n] --skeleton <female|male> [--vendor <free|pro>]"; exit 2; }
IN=$1; WORK=$2; OUT=$3; NAME=$4; KIND=$5; shift 5
LM=none; [[ $# -gt 0 && $1 != --* ]] && { LM=$1; shift; }
HEM=0.13; SKELETON=; VENDOR=free
while (( $# )); do
  case $1 in
    --hem) HEM=$2; shift 2;;
    --skeleton) SKELETON=$2; shift 2;;
    --vendor) VENDOR=$2; shift 2;;
    *) print -u2 "unknown option: $1"; exit 2;;
  esac
done
[[ $SKELETON = female || $SKELETON = male ]] || { print -u2 "--skeleton female|male is required"; exit 2; }
[[ $VENDOR = free || $VENDOR = pro ]] || { print -u2 "--vendor must be free or pro"; exit 2; }
HERE=${0:A:h}; B=$HERE/blender
mkdir -p "$WORK" "$OUT"
BL() { local script=$1; shift; blender --background --disable-autoexec --python-exit-code 1 --python "$script" "$@"; }
for V in hero crowd; do
  NORMAL=; if [[ $V = hero ]]; then TRIS=13000; PX=1024; [[ -n ${NORMALMAP:-} ]] && NORMAL=--normal; else TRIS=2800; PX=512; fi
  reduce=("$IN" "$WORK/$NAME-$V.blend" "$WORK" "$NAME-$V" "$TRIS" "$PX"); [[ -n $NORMAL ]] && reduce+=("$NORMAL")
  [[ -n ${SKIP_REDUCE:-} ]] || BL "$B/meshy_reduce.py" -- "${reduce[@]}"
  rig=("$WORK/$NAME-$V.blend" "$B/skeleton-$SKELETON.json" "$WORK/$NAME-$V-parts.glb" "$WORK/$NAME-$V-joints.json" "$KIND" "$LM" --hem "$HEM" --vendor "$VENDOR")
  [[ $V = hero && -n ${FACE:-} ]] && rig+=(--face "$FACE")
  BL "$B/meshy_rig.py" -- "${rig[@]}"
  assemble=("$WORK/$NAME-$V-parts.glb" "$WORK/$NAME-$V-joints.json" "$WORK/$NAME-$V.raw.glb" "$WORK/$NAME-$V-color.jpg" --skeleton "$SKELETON"); [[ -n $NORMAL ]] && assemble+=(--normal "$WORK/$NAME-$V-normal.jpg")
  node --experimental-strip-types "$HERE/meshy_assemble.ts" "${assemble[@]}"
  npx -y gltfpack@1.3.0 -i "$WORK/$NAME-$V.raw.glb" -o "$OUT/$NAME-$V.glb" -cc -kn -km -kv -vtf -vpf >/dev/null
  node -e 'const f=require("fs"),b=f.readFileSync(process.argv[1]),n=b.readUInt32LE(12),d=JSON.parse(b.subarray(20,20+n));if(b.length>2097152)throw Error(`over 2 MiB: ${b.length}`);if(d.animations?.length)throw Error("model contains animations");if(d.skins?.length!==1||d.skins[0].joints.length!==23)throw Error("model must contain one 23-joint skin")' "$OUT/$NAME-$V.glb"
  node -e 'const f=require("fs"),[joints,face,out,version,skeleton,vendor]=process.argv.slice(1),j=JSON.parse(f.readFileSync(joints,"utf8")),o={height:j.height,skeleton,sourceRig:vendor};if(version==="hero"&&face)o.face=JSON.parse(f.readFileSync(face,"utf8"));f.writeFileSync(out,JSON.stringify(o))' "$WORK/$NAME-$V-joints.json" "${FACE:-}" "$OUT/$NAME-$V.json" "$V" "$SKELETON" "$VENDOR"
done
echo "built $NAME"
