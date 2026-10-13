#!/usr/bin/env bash
set -euo pipefail
doc=docs/agent-plans/cloud-lanes/human-design-contract/prototype
montage -font DejaVu-Sans -pointsize 14 -background '#101c29' -fill '#e7edf3' \
  -title $'\nEye/socket correction | v3 above, v4 below\nReview only; skin/cornea refit still required' \
  -label 'v3 neutral' "$doc/eyelid-candidate-v3/neutral.png" \
  -label 'v3 half blink' "$doc/eyelid-candidate-v3/half-blink.png" \
  -label 'v3 full blink' "$doc/eyelid-candidate-v3/full-blink.png" \
  -label 'v4 neutral' "$doc/anatomy-candidate-v4/neutral.png" \
  -label 'v4 half blink' "$doc/anatomy-candidate-v4/half-blink.png" \
  -label 'v4 full blink' "$doc/anatomy-candidate-v4/full-blink.png" \
  -geometry 360x432+10+8 -tile 3x2 "$doc/anatomy-candidate-v4/Allworld-anatomy-v4-neutral-half-full-review.png"
