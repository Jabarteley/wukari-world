#!/usr/bin/env bash
set -euo pipefail
lane="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
out="${1:-$lane/artifacts}"
out="$(realpath -- "$out")"
case "$out/" in "$lane/"?*/) ;; *) echo 'Output must be a subdirectory of this lane' >&2; exit 2 ;; esac
for tier in near far; do
  if [[ -e "$out/beacon-$tier-meshopt.glb" ]]; then
    echo 'Refusing to overwrite a packed artifact; use a fresh output directory' >&2
    exit 2
  fi
  # Explicit EXT version: shipped Three 0.180 supports EXT, not newer KHR Meshopt.
  # Authored LODs stay intact: no simplification, animation resampling or rig rewrites.
  node "$lane/node_modules/gltfpack/cli.js" -i "$out/beacon-$tier.glb" -o "$out/beacon-$tier-meshopt.glb" -cc -ce ext -kn -km -ke -kv -vp 16 -vc 16 -v
done
