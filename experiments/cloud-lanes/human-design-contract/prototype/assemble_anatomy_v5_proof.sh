#!/usr/bin/env bash
set -euo pipefail
doc=docs/agent-plans/cloud-lanes/human-design-contract/prototype
scratch="$doc/anatomy-candidate-v5/.comparison-body.png"
trap 'rm -f "$scratch"' EXIT
montage -font DejaVu-Sans -pointsize 14 -background '#101c29' -fill '#e7edf3' \
  -label 'v4 neutral' "$doc/anatomy-candidate-v4/neutral.png" \
  -label 'v4 half blink' "$doc/anatomy-candidate-v4/half-blink.png" \
  -label 'v4 full blink' "$doc/anatomy-candidate-v4/full-blink.png" \
  -label 'v5 neutral' "$doc/anatomy-candidate-v5/neutral.png" \
  -label 'v5 half blink' "$doc/anatomy-candidate-v5/half-blink.png" \
  -label 'v5 full blink' "$doc/anatomy-candidate-v5/full-blink.png" \
  -geometry 360x432+10+8 -tile 3x2 "$scratch"
convert -size 1140x82 xc:'#101c29' -font DejaVu-Sans -pointsize 24 -fill '#e7edf3' -gravity center \
  -annotate 0 $'Curved orbital topology | v4 above, v5 below\nActual saved geometry; parent face-quality review pending' \
  "$scratch" -append "$doc/anatomy-candidate-v5/Allworld-anatomy-v5-neutral-half-full-review.png"
