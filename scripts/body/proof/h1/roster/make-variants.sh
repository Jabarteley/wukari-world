#!/bin/zsh
# Skin and cloth masks and the outfit maps of one roster figure, from its reduced meshes and original colour maps:
#   make-variants.sh <work-root> <generated-downloads-dir> <id> <o|i> [<rigged key for the i mode>] [<outfit numbers, default 1 2 3>]
# <work-root>/<id>/ holds the build (build-roster.sh); results go to <work-root>/var/<id>/ as <id>-<hero|crowd>-mask.png, -skin.json, -cloth.npy and o<k>-<hero|crowd>.jpg.
# Mode o: the retextures of the remeshed model (<downloads>/rt/<id>-o<k>.glb).  Mode i: retextures of the generator's first model (<downloads>/rt/<id>-i<k>.glb), posed like the figure first.
# Every outfit map is a composite over the original colour map through the cloth weight, so the face, skin, hair and shoes are exactly as built; the maps are then cleaned with texfix.py when
# $TEXFIX_PY names an interpreter with numpy, scipy and pillow.
set -u
ROOT=$1; DL=$2; n=$3; MODE=$4; RK=${5:-$n}; shift 5 2>/dev/null || shift $#; KEEP=(${@:-1 2 3})
HERE=${0:A:h}; H=${HERE:h}; B=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}; RT=$DL/rt
typeset -A SK
SK=(m1 "--bare-x 0.40 --feet none" m2 "--bare-x 0.78 --feet none" m3 "--bare-x 0.80 --feet none" m4 "--bare-x 0.78 --feet none" m5 "--bare-x 0.78 --feet none" m6 "--bare-x 0.40 --feet none"
    w1 "--bare-x 0.42 --bare-leg-z 0.34 --feet skin" w2 "--bare-x 0.78 --feet skin" w3 "--bare-x 0.30 --feet none" w4 "--bare-x 0.75 --bare-leg-z 0.62 --feet none" w5 "--bare-x 0.7 --bare-leg-z 0.3 --feet skin" w6 "--bare-x 0.45 --bare-leg-z 0.3 --feet skin")
S=$ROOT/$n; O=$ROOT/var/$n; mkdir -p $O
sexf=male; [[ $n = w* ]] && sexf=female
for V in hero crowd; do
  MP=1024; PX=1024; Q=55; [[ $V = crowd ]] && { MP=512; PX=512; Q=50; }
  $B -b --disable-autoexec --python-exit-code 1 -P $H/make_skin.py -- $S/$n-$V.blend $S/$n-$V-color-eyes.jpg $S/$n-joints.json $O/$n-$V-mask.png $O/$n-$V-skin.json $O/$n-$V-cloth.npy --face $S/$n-face.json --mask-px $MP ${=SK[$n]} 2>&1 | grep -E "SKIN|rror" | cut -c1-120
  for i in $KEEP; do
    if [[ $MODE = o ]]; then
      [[ -f $O/o$i-src.png ]] || python3 -I $H/extract_tex.py $RT/$n-o$i.glb $O/o$i-src.png
      VARIANT_PX=$PX $B -b --disable-autoexec --python-exit-code 1 -P $H/bake_variant.py -- $S/$n-$V.blend $O/o$i-src.png $S/$n-$V-color-eyes.jpg $O/$n-$V-cloth.npy $O/o$i-$V.jpg --quality $Q 2>&1 | grep -E "rror"
    else
      mkdir -p $O/hi
      if [[ ! -f $O/hi/i$i-posed.blend ]]; then
        python3 -I $H/extract_tex.py $RT/$n-i$i.glb $O/hi/i$i-src.png
        $B -b --disable-autoexec --python-exit-code 1 -P $H/pose_high.py -- $DL/$RK-rigged.glb $RT/$n-i$i.glb $H/../blender/skeleton-$sexf.json $O/hi/i$i-posed.blend $O/hi/i$i-joints.json --hip-ratio 0.54 2>&1 | grep -E "POSED|rror"
      fi
      VARIANT_PX=$PX $B -b --disable-autoexec --python-exit-code 1 -P $H/bake_variant.py -- $S/$n-$V.blend $O/hi/i$i-src.png $S/$n-$V-color-eyes.jpg $O/$n-$V-cloth.npy $O/o$i-$V.jpg --quality $Q --high-blend $O/hi/i$i-posed.blend 2>&1 | grep -E "rror|Trace"
    fi
    if [[ -n ${TEXFIX_PY:-} ]]; then
      $B -b --disable-autoexec -P $H/uvcover.py -- $S/$n-$V.blend $PX $O/cover-$V.npz > /dev/null 2>&1 || true
      NZ=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).joints.neck[2]-0.03)' $S/$n-joints.json)
      "$TEXFIX_PY" -I $H/texfix.py $O/o$i-$V.jpg $O/o$i-$V.jpg --cover $O/cover-$V.npz --protect-z $NZ --quality 85 | tail -1
    fi
  done
done
echo "variants done $n"
