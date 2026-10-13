#!/usr/bin/env bash
set -euo pipefail
doc=docs/agent-plans/cloud-lanes/human-design-contract/prototype/eyelid-candidate-v3
montage -font DejaVu-Sans -pointsize 16 -background '#101c29' -fill '#e7edf3' \
  -title $'\nLid candidate v3 | original geometry\nReview only: inherited head/eye penetration' \
  -label 'Neutral / 0' "$doc/neutral.png" \
  -label 'Half blink / 0.5' "$doc/half-blink.png" \
  -label 'Full blink / 1' "$doc/full-blink.png" \
  -geometry 400x480+12+10 -tile 3x1 "$doc/Allworld-eyelid-candidate-v3-neutral-half-full.png"
if [[ "${1:-}" != '--image-only' ]]; then
  python3 experiments/cloud-lanes/human-design-contract/prototype/verify_lid_export_v3.py
fi
