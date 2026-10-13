# Asset export portability — completed isolated proof

The original static fixture exports on Linux, survives saved-source re-export byte-for-byte, passes focused contracts and renders through Three.js. Core PBR survives the GLB and Meshopt route; the current production **static adapter drops PBR factors**. This packet records that integration gap without changing the adapter.

Branch: `codex/cloud-asset-export-portability-20261013`. Initial pushed checkpoint: `4f1ea80015125789c2bfc85e945c194cf78524dd`. Final response supplies the final pushed/remote-verified SHA; this document cannot contain its own eventual commit. Baseline and read-only observed remote main: `81d9f599d87dfb34adf49cd9337a0b05678e5e0d`.

Coordinator inputs read: `6c2885d15d38b9d64501f14d467db9d5c01573b2`, then `844da27a549d30c5148c1cb5b5927b7d0f5bfde6` including FIRST-WAVE and relevant full-plan units/export/integration/QA contracts. Parent numbering is canonical: this task supports lane 20, with evidence for lane 01. No restart or expanded ownership followed the update.

Own only `experiments/cloud-lanes/asset-export-portability/` and this documentation directory. WORLD/GRAPHICS/scenes/LIVING and the original Blender team retain their paths. No shared runtime, shipped bodies, root dependencies, CI, credentials, permissions, service or deployment changes. No subagents or paid resources. Parent owns integration and further launches.

## Deliverables and results

The [packet](../../../../experiments/cloud-lanes/asset-export-portability/packet.json) pins **28 input/source files and 7 frozen outputs**. It includes original recipe, editable `.blend`, canonical and Meshopt near/far GLBs, screenshot and export receipt. No downloaded/traced model or texture was used; original fixture/source/render files follow repository AGPL-3.0-or-later.

| Output | Triangles | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| `original-meter-beacon.blend` | both LODs editable | 481348 | `970f2d85f5dabac9e56f7bd2356590dc138b815e831372455af2982e02c4b14a` |
| `beacon-near.glb` | 332 | 25868 | `a59f64c71190393516a52267ad730c9c811557b5c75d8d1a32e4e9cc765a282a` |
| `beacon-far.glb` | 108 | 9540 | `a5d662b96efacd654b4cd2d6a20bad2e3ae0460720a2cf75edb46f8b14b3f678` |
| Meshopt near/far | 332 / 108 | 6740 / 3980 | full hashes in packet/golden |
| `render.png` | six actual views | 88493 | `092110b438b72b71831d9752c02275aa237056b9680059473d23214edcebdca5` |

- `fixture.json`: one-metre height, 0.44-metre diameter, ground-center pivot, Blender Z-up/-Y-forward -> glTF Y-up/+Z-forward and top/forward anchors. No geographic placement or surveyed dimensions claimed.
- Original recipe regeneration and re-export of frozen `.blend` each reproduced both canonical GLBs byte-for-byte. Packing regenerated files matched all four frozen golden receipts. `.blend` is preserved by hash; its bytes are not promised deterministic across saves/platforms.
- Khronos Validator: **0 errors / 0 warnings** on all four GLBs. Raw GLBs receive full validation. Khronos cannot decode Meshopt: retained informational messages state that limitation. Actual Three/Meshopt decode plus geometry/material/anchor assertions supplies complementary evidence. Named empty-anchor info is retained.
- **18 Node tests pass**: golden imports, transform baking, metres/pivot/anchor drift, sRGB-as-linear rejection, PBR/LOD/winding changes, truncated GLB and static refusal of skin/animation/morph/weight/Draco/external-buffer inputs.
- **2 Python tests pass**: detached child sessions are included in RSS accounting and terminated on timeout; child exit 7 stays failure. Only owned processes are signalled, guarded by PID start time.
- Actual Chromium 154 / Three 0.180.0 WebGL2 **SwiftShader** render: six GLB responses 200; no page errors or failed requests. All panels contain visible geometry. Screenshot independently viewed: near/far shapes and raw/Meshopt colors match visually; static output differs due to runtime material defaults. Third column reconstructs meshes from the real static adapter's output; it is not a full scene-models/gameplay render.
- Browser/server close, geometry/materials/renderer dispose, no animation loop, slots end 0/1. Disconnect notification was reconciled by successful live commands at `2026-10-13T18:06:18Z`; no environment or permissions changes and no blind restart.

## Reproduce

Observed tools: Linux x86_64; Blender 4.3.2; Node 24.19.0; Python 3.12.14; Chromium 154.0.8037.57; existing Python Playwright. Only three official task-local npm packages were installed, with scripts disabled: Three 0.180.0, gltfpack 1.3.0, gltf-validator 2.0.0-dev.3.10. Root package and lockfile unchanged. [PORTABILITY.md](PORTABILITY.md) records official sources and pipeline details.

Initial install, under heavy=1:

```sh
NODE_OPTIONS=--max-old-space-size=1536 node scripts/agent-slot.ts heavy --wait-ms 1000 -- \
  timeout 120s npm --prefix experiments/cloud-lanes/asset-export-portability install \
    --cache /tmp/aw-export-npm-cache --ignore-scripts --no-audit --no-fund
```

Subsequent installs use the committed lane lockfile (`npm ci`, same prefix/cache/flags). From repository root:

```sh
python3 experiments/cloud-lanes/asset-export-portability/verify_packet.py
bash experiments/cloud-lanes/asset-export-portability/reproduce.sh
```

The script verifies source/output hashes, generates into a fresh ignored directory, re-exports the frozen `.blend`, compares canonical files, packs using `-cc -ce ext -kn -km -ke -kv -vp 16 -vc 16`, checks golden receipts and runs only 18 lane tests. Each child holds heavy=1 with 60-second timeout, <=1536 MiB Node heap and sampled process-tree RSS ceiling. Blender threads=2. No silent golden updates. Existing asset destinations and paths outside the lane are refused.

Observed successful run: `runs/reproduce-WFZNhE`; copied durable receipts are `receipts/reproduction/`. Generation: 1.426s/250544128B sampled tree RSS; saved-source re-export: 1.274s/249896960B; packing: 0.104s/18337792B; validation: 0.256s/77275136B; tests: 0.310s/109109248B. All exit 0 and leave no owned process. RSS is sampled every 50ms, not a kernel-enforced reservation; short spikes can be missed and shared pages can be counted twice.

Supervisor tests were run with:

```sh
NODE_OPTIONS=--max-old-space-size=1536 node scripts/agent-slot.ts heavy --wait-ms 1000 -- \
  timeout 15s python3 -m unittest discover -s experiments/cloud-lanes/asset-export-portability -p test_bounded_run.py -v
```

Optional rendering command is in the [lane README](../../../../experiments/cloud-lanes/asset-export-portability/README.md). It holds heavy/server/browser slots, uses one ephemeral loopback port, blocks external requests and has a 60-second total bound. New renders go to ignored `runs/render/`, preserving frozen files. First successful render: 2.720s/833200128B sampled tree RSS. Final render after protecting output paths: **2.630s/835227648B**, exit 0, no owned processes; screenshot is byte-identical to the frozen image (`cmp` passed).

## Retained failures

1. Initial npm metadata lookup could not write the default home cache. Explicit `/tmp/aw-export-npm-cache` succeeded; no permissions changed.
2. Initial validation wrapper incorrectly rejected named empty-anchor informational messages; a second attempt mislabeled Meshopt's extension-only buffer. Classification now admits only expected severity-2 informational messages. Zero warning/error gates stayed; geometry/material data never changed.
3. `/usr/bin/time` was absent: exit 127 before Blender execution (`receipts/reexport.txt`). Bounded Python supervision then measured actual successful runs.
4. First browser attempt lacked import-map `three/` prefix for the production importer's dynamic imports. Its failure/cleanup is retained in `browser-attempt-1.json` and `render-attempt-1*`. Corrected map passed. First supervisor measured process group only; later tree accounting includes Chromium's detached sessions and has a failure-path test. Early group-only receipt is not a browser memory certificate.

No full build/typecheck/test suite was repeated. Coordinator's baseline full typecheck OOM at the preserved heap cap remains unresolved. This texture-free fixture does not establish Quaternius body rebuilding, full runtime PBR, realism or physical-phone performance.

## Next actions and blockers

1. Parent fetches this branch and verifies the final response SHA; require every changed path to remain in the two assigned prefixes. Run packet verification and review the render/import receipts. No main merge/deployment requested here.
2. Obtain the original Blender team's external pinned importer and immutable source handoff before extending compatibility claims. They were not supplied to this task; repository static/skinned seams are pinned separately.
3. Scenes/GRAPHICS decides the owned PBR adapter contract: current ModelPart omits metallic/roughness/normal material data. This lane supplies evidence, not a shared runtime patch or budget increase.
4. For skinning, resolve current character ownership and source inputs; preserve 23-bone order, inverse binds, <=4 normalized weights, clothing COLOR_0 semantics and clip compatibility. Static route deliberately refuses these inputs. Never run `body:build` against shipped files as a portability test.
5. Body portability requires separately reviewed Linux texture resize/JPEG/reference-color fixtures. This proof bypasses `sips` by using no textures; pixel/byte equivalence to macOS is not certified.
6. Preserve current game caps. Streaming/fallback, in-game block/human pilot, hardware/mobile and realism acceptance remain with the designated owners. Parent controls all further launches.
