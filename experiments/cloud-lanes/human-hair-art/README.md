# Allworld original hair art

Two original **art prototypes**, plus separately owned surface-morph fitting derivatives on the exact actual master. No production admission.

**Current handoff:** see [MASTER-FIT.md](../../../docs/agent-plans/cloud-lanes/human-hair-art/MASTER-FIT.md) and `artifacts/master-fit-v1/`: fitted editable Blender source, four GLBs, 112 sampled cases per variant, and three inspected actual-master contact sheets. The original calibration folders below remain immutable and retain their historical `pending-master` labels.

- `artifacts/c01-v3/`: tight curl crop, 640 finite geometric curl bundles in the near source.
- `artifacts/s02-v3/`: swept low twist bun, 280 scalp ribbons, 84 wrap ridges and a wound centre in the near source.
- `artifacts/lod-v2/`: two separately editable silhouette LODs and matched-size visual comparisons.

Open each `*-editable.blend` in Blender 4.3.2. Near objects and grey temporary calibration are visible; far objects are hidden. Every hair component is a mesh with original editable vertices; no particles, external linked libraries, acquired textures or infinite procedural strands. To show far, hide near objects and unhide the named far objects for both viewport and render. The LOD `.blend` intentionally contains both style options overlapping; hide the other style before editing/exporting.

The temporary head is **not** a human foundation asset or anatomically accepted character. It exists to expose hair/scalp boundaries. Actual human task `01a13667-6b47-7763-b71a-7d06139ed03f` owns the independent face/body/expression master. These calibration files predate the actual geometry checkpoint. The new `master-fit-v1` derivatives consume `3ee5882c`; the producer still has no skeleton. See the current fitting handoff rather than treating historical calibration status as current.

## Measured export cost

| Hair only | Triangles | Raw GLB bytes | Mesh primitives | Material slots |
| --- | ---: | ---: | ---: | ---: |
| C01 near | 99,806 | 1,832,376 | 4 | 4 |
| C01 reduced | 14,078 | 268,984 | 4 | 4 |
| C01 silhouette | 358 | 7,992 | 1 | 1 |
| S02 near | 38,670 | 875,828 | 10 | 4 |
| S02 reduced | 5,766 | 138,088 | 10 | 4 |
| S02 silhouette | 502 | 11,636 | 2 | 1 |

Zero textures/texture bytes, morphs, skins and animations. All materials opaque, one-sided, metallic=0, core metallic/roughness PBR. No alpha-card/overdraw claim, anisotropic hair shader or Blender-only procedural shading. Near models exceed the current 34k *whole-avatar* maximum; reduced models are also above the 4.5k whole-avatar medium maximum. Silhouettes are practical small derivatives, not a waiver of the 600-triangle entire low avatar limit. Budget selection/admission remains with GRAPHICS. Close silhouette comparison intentionally shows lost curls/strands. A ~56 px head comparison is visual evidence only, not a tested switching threshold.

`export-metrics.json` decodes float32 BIN positions and records bounds, sizes, hashes and costs. Authored source dimensions and exported measurements are separate. No scanned/surveyed dimensions or individual likeness. Source is metres Z-up/-Y-forward; export is metres Y-up/+Z-forward. Vertices already use the authored body frame; node transforms are identity. Head centre is an authored temporary `[0,1.65,0]` in exported coordinates. No game placement is authorized.

## Customising and reproducing

`build_hair.py`: curl count, path samples, radius, length, colour/roughness, finite seed and scalp edge function. `build_bun.py`: ribbon density, root distribution, sweep lift, width, bun position, size and wrap count. `build_lod.py`: separate low resolution shells. Change only lane-owned derivatives, never the human master. Keep finite count caps and save to a fresh directory under this lane.

Dependencies are lane-local official Three 0.180.0 and Khronos gltf-validator 2.0.0-dev.3.10. Existing Blender/Chromium/Python Playwright used; no global install. Install only if absent:

```sh
NODE_OPTIONS=--max-old-space-size=1536 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 120s npm --prefix experiments/cloud-lanes/human-hair-art ci --cache /tmp/aw-hair-npm-cache --ignore-scripts --no-audit --no-fund
python3 experiments/cloud-lanes/human-hair-art/verify_inputs.py
python3 experiments/cloud-lanes/human-hair-art/seal_packet.py --check
```

Every actual heavy command is recorded in `receipts/*.json`, with exact child arguments, timeout, elapsed time, sampled tree RSS and cleanup. Wrap new jobs in shared `scripts/agent-slot.ts heavy --wait-ms 1000`, then `bounded_run.py --seconds 60 --receipt <lane receipt> -- <command>`. Blender `-b -t 2 --python-exit-code 1 --python <recipe> -- --out <fresh lane directory>`. Keep Node heap <=1536 MiB, heavy=1. The supervisor samples at 50 ms; RSS is not a kernel reservation and can double-count shared pages.

`render.py` owns a loopback server/browser and requires **heavy/server/browser** slots externally. Use `--folder c01-v3 --out runs/new-render` or `--folder s02-v3 --style swept-bun --out runs/new-render`. LOD proof: `--page lod.html --responses 5 --out runs/new-lod-render`. All external requests blocked; renderer disposed, browser/server closed. Raw GLTFLoader proves PBR export; runtime static ModelPart still loses factors and is not modified. Humans require the skinned route.

`reexport.py` reads saved meshes, no regeneration. Both near/far exports from both saved `.blend` sources matched committed GLBs byte-for-byte. This links the visually inspected GLB geometry back to editable source. `.blend` save bytes themselves are not promised deterministic across platforms.

## Attachment/clearance limitations

Each style folder includes `attachment-proposal.json`: actual temporary fixture GLB/source/vertex/topology hashes, triangle+barycentric scalp anchors, explicit body/head matrices, null actual-master/rig hashes, and signed vertex clearance. The v1 binding **shape** is used without falsely labeling the temporary fixture `allworld-body-23@1`. Thus it is a proposal, not a schema-admitted body binding.

Measured issues: C01 near foundation dips as far as **2.161 mm inside** the temporary head (20 vertices beyond 0.2 mm), while all near curl vertices are outside with >=0.793 mm sampled clearance. S02 scalp/ribbons have positive sampled clearance; tucked bun core/ridges reach **4.348 mm inside near**, **4.805 mm far**. Fix these on the frozen master derivative before fitting acceptance. Signed nearest-triangle vertex samples are not full triangle collision, morph or continuous pose tests. Actual ears, head/body endpoints and rig poses remain blocked by missing producer checkpoint; none is claimed demonstrated. LOD facet penetration found visually was corrected before `lod-v2` acceptance of the screenshot only.

The styles are recognisable original geometry studies. C01 still reads as thick geometric curl bundles; S02 has regular grooves and a deliberately coiled knot. Hairline finishing, fine strand appearance, colour customisation UI and realistic skin/hair portrait acceptance remain unfinished. No current-game or physical-device proof.

Original art/scripts follow repository AGPL-3.0-or-later. `bounded_run.py` is a lane-local derivative/copy of the frozen `asset-export-portability` supervisor at integration `caaee5e1`; input hash recorded in the input index. Three and validator retain their installed package licences. No paid tools, copied textures, model downloads, Google imagery, credentials, runtime registration or deployment.
