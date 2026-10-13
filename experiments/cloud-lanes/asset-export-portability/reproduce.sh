#!/usr/bin/env bash
set -euo pipefail
lane="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd -- "$lane/../../.." && pwd)"
cd "$repo"
export NODE_OPTIONS=--max-old-space-size=1536
python3 "$lane/verify_packet.py"
if [[ ! -d "$lane/node_modules/three" || ! -d "$lane/node_modules/gltf-validator" || ! -d "$lane/node_modules/gltfpack" ]]; then
  node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 120s npm --prefix "$lane" ci --cache /tmp/aw-export-npm-cache --ignore-scripts --no-audit --no-fund
fi
mkdir -p "$lane/runs"
job="$(mktemp -d "$lane/runs/reproduce-XXXXXX")"
mkdir "$job/generated" "$job/from-blend"
bounded() {
  local receipt="$1"
  shift
  node scripts/agent-slot.ts heavy --wait-ms 1000 -- python3 "$lane/bounded_run.py" --seconds 60 --receipt "$receipt" -- "$@"
}
bounded "$job/generate.json" blender -b -t 2 --python-exit-code 1 --python "$lane/export_fixture.py" -- --out "$job/generated"
bounded "$job/reexport.json" blender -b "$lane/artifacts/original-meter-beacon.blend" -t 2 --python-exit-code 1 --python "$lane/export_fixture.py" -- --from-blend --out "$job/from-blend"
for tier in near far; do
  cmp "$lane/artifacts/beacon-$tier.glb" "$job/generated/beacon-$tier.glb"
  cmp "$lane/artifacts/beacon-$tier.glb" "$job/from-blend/beacon-$tier.glb"
done
bounded "$job/pack.json" bash "$lane/pack.sh" "$job/generated"
bounded "$job/validate.json" node "$lane/validate.ts" "$job/generated"
bounded "$job/tests.json" node --test --test-concurrency=1 "$lane/contract.test.ts"
printf 'PASS: original recipe, saved source, compressed derivatives, golden imports and focused tests. Receipts: %s\n' "$job"
# Rendering is optional and separate; there is no automatic new browser/full-game run.
