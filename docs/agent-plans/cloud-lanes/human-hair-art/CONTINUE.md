# Original hair art — continuation

Branch `codex/cloud-human-hair-art-20261013`, based exactly on integration `caaee5e1b91afc7f3cd3f2124df3547dc7f492ec`.
Own only `experiments/cloud-lanes/human-hair-art/` and this documentation directory. Branch-only non-force push authorized by parent. No main/runtime/assets changes, deployment, credentials, acquired assets, global installs or worker fanout.

## Early tangible checkpoint

`artifacts/c01-v3/` contains an original **640-bundle tightly curled crop**, compressed editable Blender 4.3.2 source, uncompressed near/far GLBs, original temporary calibration fixture, six-view contact sheet and decoded validation. Source script preserves finite counts, seed, dimensions, materials and separately editable meshes. All art authored here; no image/model acquisition. Original work follows repository AGPL-3.0-or-later. The copied bounded supervisor is credited to the frozen portability lane.

The contact sheet was opened and visually inspected. Front, temple, rear/nape, near boundary and distance views expose the scalp. Curl overlap improved after the first view exposed a smooth cap. This is tangible **work-in-progress hair art**, with conspicuous geometric bundles and some foundation still visible; it is not photorealism or fitted-human acceptance. Temporary head is only a grey calibration fixture, not competing human anatomy. `actualFit=pending-master`.

Near geometry exceeds the current 34,000-triangle *whole-avatar* maximum. Far is an early reduced draft, not yet a crowd budget. Add a genuinely cheap silhouette LOD next. The second, visibly different style and measured binding/clearance packet remain next work in this active task.

## Exact inputs and pending parent handoff

- Packet SHA-256 `9c15f10e6c82bbf31aa74e9dbcf2c9d3e4aef67ef3789d255c7c2e608623e7cb`: bytes, SHA, input-index SHA, all 155 frozen file hashes and four integration source hashes passed. Exact committed source comparisons also passed after fetching the four immutable input commits.
- Human contract only: `71d6b5ad391754b0f30fc5364e993208299640ed`. It contains no actual master mesh. Never copy synthetic `aaaa`/`bbbb` hashes into a real attachment claim.
- Requested through parent: actual human task `01a13667-6b47-7763-b71a-7d06139ed03f` exact commit, scalp/head packet, actual mesh/topology/rig hashes, head/ear/body endpoints and available poses. No actual human mesh checkpoint received yet. Active master's files are untouched.

## Usage and evidence

All heavy jobs use shared `scripts/agent-slot.ts`, heavy=1; Blender `-t 2`; Node heap 1536 MiB; process-tree RSS sampled with 1536 MiB ceiling; 60–120 second job bounds. Receipts record actual command, time, memory, exit and cleanup. No minifier or persistent service. Browser uses heavy/server/browser slots, loopback only, raw Three 0.180.0 GLTFLoader, Chromium SwiftShader; no hardware/mobile claim. Every shown material is opaque core PBR; no alpha sorting, external textures, hair shader, anisotropy, rig, morph or animation support is claimed. Runtime ModelPart drops PBR factors; shared importer remains untouched.

Retained failures: the integration seal runner lacked root Three dependencies, so an independent read-only lock/hash verifier was used; initial input comparison lacked four Git objects, then fetched exact commits and passed. Blender discovery briefly preceded executable availability; official download was blocked and pip had no matching distribution; neither installed anything. Existing Blender subsequently worked. First browser attempt had a missing `three/addons/` import map and timed out cleanly; map fixed, next runs passed. Initial cap/fixture winding corrected before the committed visual. Earlier uncommitted rejected meshes stay in ignored `runs/`.

## Resume commands (repository root)

```sh
python3 experiments/cloud-lanes/human-hair-art/verify_inputs.py
NODE_OPTIONS=--max-old-space-size=1536 node scripts/agent-slot.ts heavy --wait-ms 1000 -- python3 experiments/cloud-lanes/human-hair-art/bounded_run.py --seconds 60 --receipt experiments/cloud-lanes/human-hair-art/receipts/new-build.json -- blender -b -t 2 --python-exit-code 1 --python experiments/cloud-lanes/human-hair-art/build_hair.py -- --out experiments/cloud-lanes/human-hair-art/runs/new-build
```

Keep immutable committed artifacts; choose fresh output versions. Read receipt failures before retrying. Exact final SHA is supplied in the task response because a document cannot embed its own future commit hash.
