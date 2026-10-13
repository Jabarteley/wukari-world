#!/usr/bin/env bash
set -euo pipefail
src=experiments/cloud-lanes/human-design-contract/prototype
doc=docs/agent-plans/cloud-lanes/human-design-contract/prototype
ffmpeg -hide_banner -loglevel warning -y -threads 2 -framerate 12 -i "$src/frames/%04d.png" \
  -filter_threads 2 -vf "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:textfile=$src/video-title.txt:fontcolor=white:fontsize=12:x=(w-tw)/2:y=10:box=1:boxcolor=black@0.55,subtitles=$src/turntable-captions.srt:force_style='FontName=DejaVu Sans,FontSize=12,MarginV=14'" \
  -c:v libx264 -threads 2 -preset fast -crf 22 -pix_fmt yuv420p -movflags +faststart -frames:v 180 "$doc/character-controls-turntable.mp4"
montage -font DejaVu-Sans -pointsize 18 -background '#101c29' -fill '#e7edf3' \
  -title 'Original Blender prototype | expression states | no skeletal rig' \
  -label Neutral "$doc/neutral.png" -label Happy "$doc/happy.png" \
  -label Sad "$doc/sad.png" -label Blink "$doc/blink.png" \
  -geometry 320x400+8+8 -tile 4x1 "$doc/expression-review.png"
montage -font DejaVu-Sans -pointsize 18 -background '#101c29' -fill '#e7edf3' \
  -title 'Frozen master | combined endpoint stills (video isolates each control)' \
  -label 'Nose minimum' "$doc/nose-min.png" -label 'Nose maximum' "$doc/nose-max.png" \
  -label 'Asymmetric ears' "$doc/ears-asymmetric.png" -label 'Short + narrow' "$doc/body-short-narrow.png" \
  -label 'Tall + broad' "$doc/body-tall-broad.png" -geometry 240x300+8+8 -tile 5x1 "$doc/control-endpoints-review.png"
montage -font DejaVu-Sans -pointsize 18 -background '#101c29' -fill '#e7edf3' \
  -title 'Separate eye-only derivative | unfinished stylized prototype' \
  -label 'Narrowed lids / neutral' "$doc/eye-refinement-v2/neutral.png" \
  -label 'Full geometric blink' "$doc/eye-refinement-v2/blink.png" \
  -geometry 480x576+8+8 -tile 2x1 "$doc/eye-refinement-v2/neutral-blink-review.png"
ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=codec_name,width,height,r_frame_rate,nb_read_frames,duration -of json \
  "$doc/character-controls-turntable.mp4" > "$doc/video-probe.json"
ffmpeg -hide_banner -loglevel error -threads 2 -i "$doc/character-controls-turntable.mp4" -f null -
ffmpeg -hide_banner -loglevel warning -y -threads 2 -i "$doc/character-controls-turntable.mp4" -filter_threads 2 \
  -vf "select='eq(n,4)+eq(n,40)+eq(n,58)+eq(n,76)+eq(n,94)+eq(n,112)+eq(n,130)+eq(n,148)+eq(n,157)+eq(n,166)+eq(n,175)',scale=288:384,tile=4x3" \
  -frames:v 1 -update 1 "$doc/video-sampled-frames.png"
echo 'MEDIA_ASSEMBLY_COMPLETE: 180 frames; entire video decoded; 11 labelled samples extracted'
