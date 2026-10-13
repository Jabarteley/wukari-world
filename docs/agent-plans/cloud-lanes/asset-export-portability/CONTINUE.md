# Asset export portability — initial checkpoint

Branch: `codex/cloud-asset-export-portability-20261013`. Baseline and observed remote main: `81d9f599d87dfb34adf49cd9337a0b05678e5e0d`. Coordinator documents read from `6c2885d15d38b9d64501f14d467db9d5c01573b2`. Parent owns integration and future launches.

Own only `experiments/cloud-lanes/asset-export-portability/` and this documentation directory. No shared runtime, shipped assets, package files, CI, credentials, or deployment changes. Existing WORLD/GRAPHICS/scenes/LIVING and Blender owners retain their work. Repository coordination and current remote main inspected before claiming this new lane. No subagents launched.

Actual inspection: Linux has Blender 4.3.2, Node 24.19.0, Python 3.12.14, Chromium, and Python Playwright. Existing `scripts/body/build-body.ts` uses macOS `sips` at lines 119/202 and offline `gltfpack@1.3.0` at lines 89–92. Source body inputs are absent. `gltf-source.ts` bakes transforms and passes RGB vertex colors/anchors but its ModelPart does not carry PBR factors; scene-models uses roughness 0.92/metalness 0. Both static and skinned loaders configure Meshopt, not Draco.

Initial original fixture and exporter committed before execution. Next: bounded dependency install inside the owned lane, Blender export and saved-blend re-export, golden import and Khronos validation, actual software-rendered proof, focused negative tests, final receipts and branch push. No completed export or validation claimed at this checkpoint.

Use heavy=1, Node heap <=1536 MiB, Blender threads=2, bounded process timeouts. Do not run whole-game tests/typecheck (coordinator already recorded heap failure); do not call body:build.
