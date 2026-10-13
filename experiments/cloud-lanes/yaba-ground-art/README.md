# Original Yaba ground/street prototype

Open `artifacts/yaba-street-v1.blend`. Near meshes are editable. Far, 200m planning
layout and collision proposals are separate hidden collections. Enable the planning
collection to inspect the complete layout. Images are packed. Every road dimension,
elevation and alignment is authored-synthetic. All source/exports use metres.

[CONTINUE](../../../docs/agent-plans/cloud-lanes/yaba-ground-art/CONTINUE.md) records
scope, pins, visual assessment, measurements and limitations. `packet.json` records
artifact/source hashes and texture/geometry costs; `placement.json` has frontage
reservations and adapter-derived anchors. Routing remains unauthorized.

## Bounded reproduction

Use repository root as cwd. Preserve shared heavy=1, heap≤1536 MiB and minifier=1.
Busy slot means defer, never raise its cap or stop unknown jobs. The wrapper samples
owned tree RSS against a 1536 MiB ceiling and cleans up only descendants it started.

Generate the original maps with installed Pillow/numpy:

```
python3 experiments/cloud-lanes/yaba-ground-art/make_textures.py
```

Build editable source and both GLBs with installed Blender 4.3.2:

```
NODE_OPTIONS=--max-old-space-size=256 node scripts/agent-slot.ts heavy --wait-ms 1000 -- python3 experiments/cloud-lanes/yaba-ground-art/bounded_run.py --seconds 120 --receipt experiments/cloud-lanes/yaba-ground-art/runs/build.json -- blender -b -t 2 --python experiments/cloud-lanes/yaba-ground-art/build_street.py
```

Render one still (`eye`, `detail`, `overview`, or `plan`), then compose the sheet:

```
NODE_OPTIONS=--max-old-space-size=256 node scripts/agent-slot.ts heavy --wait-ms 1000 -- python3 experiments/cloud-lanes/yaba-ground-art/bounded_run.py --seconds 120 --receipt experiments/cloud-lanes/yaba-ground-art/runs/eye.json -- blender -b -t 2 --python experiments/cloud-lanes/yaba-ground-art/render_blender.py -- eye
python3 experiments/cloud-lanes/yaba-ground-art/contact_sheet.py
```

These authored scripts overwrite this lane's outputs. Version/copy the packet before
revising it. Modify `grade`, `walk`, kerb profiles or slab loops in `build_street.py`,
or edit the blend meshes/modifiers directly. Changing seams/frontages needs a new
layout version. `compact_glb.py` only removes unused attributes; geometry, material
values, image data and named anchors are preserved.

The two proof dependencies reuse the existing export lane's exact versions, Three
0.180.0 and gltf-validator 2.0.0-dev.3.10. Install only under this lane from its lock:

```
NODE_OPTIONS=--max-old-space-size=256 node scripts/agent-slot.ts heavy --wait-ms 1000 -- python3 experiments/cloud-lanes/yaba-ground-art/bounded_run.py --seconds 120 --receipt experiments/cloud-lanes/yaba-ground-art/runs/npm.json -- npm --prefix experiments/cloud-lanes/yaba-ground-art ci --ignore-scripts --no-audit --no-fund --cache /tmp/yaba-ground-npm-cache
NODE_OPTIONS=--max-old-space-size=256 node scripts/agent-slot.ts heavy --wait-ms 1000 -- python3 experiments/cloud-lanes/yaba-ground-art/bounded_run.py --seconds 45 --receipt experiments/cloud-lanes/yaba-ground-art/runs/verify.json -- node experiments/cloud-lanes/yaba-ground-art/verify.ts
```

A local ephemeral server and Chromium/Playwright render raw GLTFLoader proof. The
harness blocks external requests and disposes/closes its resources:

```
NODE_OPTIONS=--max-old-space-size=256 node scripts/agent-slot.ts heavy --wait-ms 1000 -- node scripts/agent-slot.ts server --wait-ms 1000 -- node scripts/agent-slot.ts browser --wait-ms 1000 -- python3 experiments/cloud-lanes/yaba-ground-art/bounded_run.py --seconds 60 --receipt experiments/cloud-lanes/yaba-ground-art/runs/browser.json -- python3 experiments/cloud-lanes/yaba-ground-art/render_browser.py --out experiments/cloud-lanes/yaba-ground-art/runs/browser
```

`measure_packet.py` intentionally writes a new packet from current artifacts; do not
use it to hide drift in a frozen packet. Normal consumption should compare listed
files' bytes/SHA-256 against `packet.json`. No root install, global settings, CI,
paid tool, credentials, deployment, movement edits or worker fanout is needed.

Original geometry/textures and lane source: AGPL-3.0-or-later. The resource wrapper
is copied and browser harness adapted from the sealed export lane, whose hashes are
in the integration index. System DejaVu only typesets the contact sheet; no font file
or external image/model is bundled. Logs are gzip archived with both original and
compressed hashes in `receipts/log-archive.json`.
