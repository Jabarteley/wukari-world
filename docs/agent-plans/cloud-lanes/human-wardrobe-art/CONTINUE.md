# Continue: original everyday wardrobe art

Branch `codex/cloud-human-wardrobe-art-20261013`, isolated worktree `/workspace/wardrobe-art`. Base **caaee5e1b91afc7f3cd3f2124df3547dc7f492ec**. Only this documentation prefix and `experiments/cloud-lanes/human-wardrobe-art/` are owned. Parent authorized branch-only commits/pushes and continuation. No merge, force push, deployment, runtime/catalogue/mask adoption, paid tools or fanout.

Early art checkpoint **9c8e65962f7cb2cb245ae66f37e5b6ec3cdaafbc** was pushed and remote-verified. Its 27 files total **5,068,661 bytes / 4.834 MiB**. Subsequent work adds validation/viewer evidence and continuation only; source art bytes remain unchanged.

## Tangible checkpoint

`artifacts/everyday-01-tailoring-form.blend` is the editable original source. `artifacts/everyday-01-on-form.glb` exports the actual garment pieces and separately named `FIXTURE_` meshes. `artifacts/contact-sheet.jpg`, `front.jpg`, `profile.jpg`, `back.jpg` show actual Cycles renders, visually inspected after fixing trouser/hem intersections, an open side seam and the original back neckline. This is one sage short-sleeve overshirt and sand tapered trousers, not a completed realistic human or tested wearable. No diagrams count as art.

Source collections separate overshirt, trousers, original non-anatomical tailoring form, proposed anchors and presentation. Panels retain editable quad topology, subdivision and shell thickness; seam curves, collar halves, pocket pieces, cuffs, hems, plackets, buttons, waist band and loops are editable independently. Procedural cloth images are packed and also delivered as PNGs. GLB contains evaluated static meshes; the .blend retains modifiers.

First export measurements: 3,808,680 bytes; SHA-256 `be28e73cc7cd62b297bde445123b73eb1a870d1fe31fb9850ba9b26a99f419a3`. **144,840 garment triangles + 15,360 fixture triangles; 102 garment mesh nodes + 6 fixture nodes; 6 materials; 3 embedded 256x256 images / 177,211 encoded bytes / 786,432 decoded RGBA bytes without mipmaps.** Zero skins, morph targets or animations. This is an expensive authoring checkpoint, not a mobile-ready budget. The independent decoded-byte report is `receipts/export-measurements.json`.

## Exact pins and parent request

The assignment is C at the base's `docs/agent-plans/cloud-lanes/integration-contract/NEXT-WAVE.md`. Lock SHA-256 **9c15f10e6c82bbf31aa74e9dbcf2c9d3e4aef67ef3789d255c7c2e608623e7cb**, 14,085 bytes. Input index SHA-256 **28dbae6ea0f2074897cc63e9a1ca59b4463141ef0f2a4ed488b321d95f038e34**. All 155 indexed input files and four sealed integration source hashes verified locally against bytes; receipt in `receipts/input-verification.json`. Frozen human contract **71d6b5ad391754b0f30fc5364e993208299640ed** contains no usable new body mesh.

**Request through parent thread 01a0f3c2-c8f1-7692-bb60-ba891cf350fe:** obtain the immutable art checkpoint from human task **01a13667-6b47-7763-b71a-7d06139ed03f**, including commit, rest mesh .blend/GLB, exact mesh/topology/rig hashes, rest transforms, available body endpoints and poses, and attachment/mask surface conventions. No direct parent-task message tool was exposed in this environment; this request is included in the branch handoff. New human mesh checkpoint is **null / not supplied**, not inferred from a moving branch. Do not fit against an unpinned asset or edit its master. Unknown production character task 01a13520-8d89-70f1-a722-786459524996 remains independent.

## Visual limits and next work

- Neutral front/profile/back were inspected. The fixture is a tailoring gauge with no head, hands, anatomy controls or rig. Its neck/arm/ankle stubs are intentionally visible. No body measurements are surveyed or sourced from a person.
- Cloth reads as constructed garments with boundaries, seams and thickness. Drape remains stiff and slightly symmetric; collar/armhole joins and the back-neck reveal need a realism pass. No cloth simulation, pressure/clearance analysis, stitch-strain or watertight sewing claim.
- Garment masks and bind anchors are **proposals only** in `fit-proposal.json`, not production region indices/IDs. No bone weights or matrix binds exist.
- Changed-proportion renders, arm/knee bends, clipping/clearance tests and final rig/fit are **blocked by the absent frozen body**. Do not manufacture passing fit evidence by deforming this fixture.
- **Raw isolated GLTFLoader proof completed and visually inspected:** `artifacts/raw-gltfloader-proof.jpg`, Three.js 0.180.0 / Chromium 154 SwiftShader. Correct 160,200 triangles, 108 mesh nodes and six materials decoded, two sRGB fabric maps plus tangent normal maps/roughness .78 retained, all materials opaque. Three front/profile/back views, zero page/request failures, model HTTP 200, resource disposal and browser/server closure confirmed. Shader/tone mapping differs from Cycles; shoulder joins show small surface discontinuities and collar needs refinement. Shared static importer still drops material factors; no current-game or physical-device parity is claimed. Humans later require the skinned route. No runtime importer fix belongs here.

## Verification and portability

Khronos glTF Validator 2.0.0-dev.3.10 reports **zero errors, 38 tangent-space warnings and 70 unused-UV informational messages**, complete/nontruncated. Tangents are generated by the runtime rather than exported: the normal-mapped look may vary across implementations. Do not call this warning-free or universal rendering compatibility. The initial 100-message cap truncated the report; the corrected 1000-message run is retained separately. No compression/extensions are used. The normal textures are small, but glTF geometry retains the full evaluated authoring mesh.

Reopening the delivered .blend confirms **42 editable garment mesh objects, 60 editable seam curves, six fixture meshes, three packed images**, and no armatures. Source cloth panel thickness modifiers remain editable. `receipts/blend-reopen.json` pins the reopened file: **450,790 bytes / SHA-256 25e1ba8e8c9b9cd271d86c4dfb229a0533eee1a192e1ba587a2dc5b3519eeecf**. `packet.json` and `SHA256SUMS.json` record immutable delivered bytes; `verify_packet.py` checks them without rebuilding.

Browser proof used **2.625 s / 851,030,016 bytes sampled tree RSS**, 60-second bound, zero remaining owned processes. Blend reopen used **1.328 s / 342,405,120 bytes**, 30-second bound. Full glTF validation used **0.206 s / 68,321,280 bytes**, 30-second bound. All remained below the existing 1536 MiB RSS cap. The supervisor forces child Node heap ceiling 1536 MiB; outer slot wrappers use 128 MiB. Minifier unused.

Only task-local npm packages `three@0.180.0` and `gltf-validator@2.0.0-dev.3.10` were installed under this lane, with install scripts disabled and exact lock/integrity records. No root/shared dependency file, global installation or user setting changed. `node_modules` is ignored.

## Commands, constraints and failures

Blender 4.3.2, two threads, CPU Cycles 32 samples at 440x620, three views. Final successful source/export/render job: **30.016 s, 609,226,752 bytes sampled process-tree peak RSS, 0 remaining owned processes**, 120-second bound and existing 1536 MiB RSS cap. Heavy slot held throughout; no parallel heavy jobs. Source renders are ignored PNG intermediates; Pillow makes JPEG views and labelled contact sheet without repainting geometry.

First render attempt failed because this build lacks OpenImageDenoise support. The receipt/log is retained. Denoising is now disabled in this file only. Second and third builds exported/rendered but visual inspection prompted geometry fixes; their bounded receipts are retained. The initial GLB inspector wrongly assumed all nodes had identity transforms; corrected inspector evaluates exported TRS/matrices, including buttons. It reports finite coordinates/unit normals and zero triangles below 1e-12 square metres. No unrelated/full suite was run.

Reproduce only when changes warrant a rebuild, from the isolated worktree root:

```sh
NODE_OPTIONS=--max-old-space-size=128 node scripts/agent-slot.ts heavy --wait-ms 1000 -- python experiments/cloud-lanes/human-wardrobe-art/bounded_run.py --seconds 120 --receipt experiments/cloud-lanes/human-wardrobe-art/receipts/rebuild-resource.json -- blender --background --threads 2 --python-exit-code 1 --python experiments/cloud-lanes/human-wardrobe-art/build_outfit.py
python experiments/cloud-lanes/human-wardrobe-art/inspect_glb.py
python experiments/cloud-lanes/human-wardrobe-art/make_contact.py
NODE_OPTIONS=--max-old-space-size=128 node scripts/agent-slot.ts heavy --wait-ms 1000 -- python experiments/cloud-lanes/human-wardrobe-art/bounded_run.py --seconds 30 --receipt experiments/cloud-lanes/human-wardrobe-art/receipts/revalidate-resource.json -- node experiments/cloud-lanes/human-wardrobe-art/validate.mjs
NODE_OPTIONS=--max-old-space-size=128 node scripts/agent-slot.ts heavy --wait-ms 1000 -- node scripts/agent-slot.ts server --wait-ms 1000 -- node scripts/agent-slot.ts browser --wait-ms 1000 -- python experiments/cloud-lanes/human-wardrobe-art/bounded_run.py --seconds 60 --receipt experiments/cloud-lanes/human-wardrobe-art/receipts/reproof-resource.json -- python experiments/cloud-lanes/human-wardrobe-art/prove_export.py
python experiments/cloud-lanes/human-wardrobe-art/verify_packet.py
node scripts/agent-slot.ts status
```

The supervisor is a byte-identical lane-local copy of the pinned export-portability supervisor (AGPL repository source); its original hash is in `SOURCE-NOTICE.md`. It only stops children it launched, enforces timeout and sampled RSS, and records cleanup. Source generation replaces only this lane's own asset files; do not run in a different output prefix. Generated file contents are versioned, not silently blessed as frozen inputs. Local .blend save-version preference is process-only; no global user preferences were saved or installed.

Next agent should verify final response SHA against this branch with `git ls-remote`, inspect `SHA256SUMS.json`, and preserve the two-prefix ownership. The original checkout remains clean on `work` at 81d9f599d87dfb34adf49cd9337a0b05678e5e0d. Further integration, frozen-body adoption and physical-device proof remain parent/GRAPHICS work.

Final cleanup observation: heavy 0/1, server 0/1, browser 0/1. No owned running processes. Both worktrees clean after final commit; no other team paths changed. No new worker was launched. Stop further fit work until the parent supplies the immutable body checkpoint; do not fetch a moving human branch and assume fit authority.
