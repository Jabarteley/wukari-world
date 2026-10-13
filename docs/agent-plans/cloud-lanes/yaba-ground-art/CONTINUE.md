# Yaba ground art — checkpoint 1

Branch: `codex/cloud-yaba-ground-art-20261013`, based exactly on integration
`caaee5e1b91afc7f3cd3f2124df3547dc7f492ec`. Only this documentation directory and
`experiments/cloud-lanes/yaba-ground-art/` are owned. No shared runtime, movement,
source asset, other lane or active human master was changed.

## Tangible checkpoint

`experiments/cloud-lanes/yaba-ground-art/artifacts/` contains the editable packed
`yaba-street-v1.blend`, raw `street-near.glb`, `street-far.glb`, and actual CPU Blender
eye/detail/plan images. Contact sheet accompanies this checkpoint. This is original
synthetic street art, not surveyed Yaba. The 200 × 200 m layout is planning massing;
only the central 24 m segment is detailed art. Camera eye is 1.65 m above the local
sidewalk. No building/character/vegetation art is counted as delivered.

Near: 14,297 triangles / 444 meshes / 13 materials / 6 generated embedded maps /
2,251,632 bytes. Far: 160 triangles / 18 meshes / 3 materials / no maps / 25,696 bytes.
Both GLBs are uncompressed. No skins, morphs or animations are intended.

Visual inspection: real recessed drain, grille bars, shaped kerbs, road repair and
paving joints are visible. Asphalt mottling and regular paving remain prototype
quality. Gray surroundings are a studio background, not a completed city. The far
LOD deliberately drops wear, individual slabs, grate bars and detailed ramp profile.
No phone, game importer or current-game parity claim.

## Input pins and authority

Sealed packet: SHA-256 `9c15f10e6c82bbf31aa74e9dbcf2c9d3e4aef67ef3789d255c7c2e608623e7cb`,
14,085 bytes. Direct comparison verified the lock, sealed index digest, all 155
indexed files (2,746,358 bytes), and four integration source hashes. The executable
`seal.mjs --check` initially stopped because the worktree has no root Three dependency;
the input bytes are independently verified. Do not rewrite the shared lock.

Geography lane: `21b0850a996b4444d2e0c16626771671e191ddcd` via the integration pin.
Planning ID `yaba-game-anchor-200m-planning-v1`, approximate anchor lon 3.382 /
lat 6.5075, local east/north ±100 m, arbitrary vertical zero. Every chosen road,
elevation, material and alignment is authored-synthetic; real-world errors unknown.
`routeAuthorized=false` everywhere. Collision collection contains conservative
proposal envelopes only, not registered colliders or walk permission.

Human contract consumed only as read-only packet metadata:
`71d6b5ad391754b0f30fc5364e993208299640ed`. No newer mesh was supplied or consumed.
Human producer task `01a13667-6b47-7763-b71a-7d06139ed03f` remains independent;
request its exact mesh checkpoint through the parent before claiming any later fit.
This street does not require human mesh fitting.

## Reproduce and continue

From repository root, regenerate original textures (already packed into blend/GLB):
`python3 experiments/cloud-lanes/yaba-ground-art/make_textures.py`.
Generated texture files and Blender backups are ignored to avoid duplicate Git bytes.

Each Blender invocation must use the shared heavy slot, two threads and the copied
read-only baseline resource wrapper, e.g.:

```
NODE_OPTIONS=--max-old-space-size=256 node scripts/agent-slot.ts heavy --wait-ms 1000 -- python3 experiments/cloud-lanes/yaba-ground-art/bounded_run.py --seconds 120 --receipt experiments/cloud-lanes/yaba-ground-art/runs/rebuild.json -- blender -b -t 2 --python experiments/cloud-lanes/yaba-ground-art/build_street.py
```

`render_blender.py -- eye|detail|overview|plan` opens the saved blend. Invoking it via
the same wrapper gives one bounded still. Current scripts intentionally overwrite
this lane's authored artifacts; copy/version them before artistic changes. No global
installation or settings changes. Wrapper copied exactly from the frozen export lane;
its input hash is in the integration index. AGPL-3.0-or-later, same as repository.

Next: finish adapter placement/seam measurements and frontage manifest; inspect raw
GLTFLoader output in an isolated local browser; record full artifact hashes/texture
measurements, scoped checks and cleanup. Do not rerun unrelated suites. No force,
merge, deploy, paid tool or additional worker is authorized. Preserve heavy=1,
heap ≤1536 MiB, minifier=1. All completed Blender jobs cleaned up their own processes.
Initial render failed because this Blender lacks OpenImageDenoise; later source uses
32 CPU samples without denoising. Receipts retain that failure honestly.
