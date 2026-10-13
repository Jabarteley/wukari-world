Current correction: [CORNEA-CORRECTION.md](CORNEA-CORRECTION.md). The owned cap regression now passes the original gate and dense intermediate-blink sweep; earlier failure history below is retained.

Current continuation: [pinned human material derivative](FITTED-CONTINUE.md), against master `3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a`. Calibration below remains preserved.

# Skin / eyes calibration — assignment A

Independent calibration delivery complete; fitted-human acceptance is pending an exact input checkpoint. Branch `codex/cloud-human-skin-eyes-art-20261013` is isolated from integration `caaee5e1b91afc7f3cd3f2124df3547dc7f492ec`. Own only this documentation prefix and `experiments/cloud-lanes/human-skin-eyes-art/`.

## Early checkpoint and tangible output

Early commit **`575927d6018af643200dcdb062d25c55fc61fda4`** was pushed without force. It includes actual editable packed Blender source, textured GLB, eight original procedural raster maps and an inspected small contact sheet. The later proof commit leaves those Blender/GLB bytes unchanged and adds raw GLTFLoader proof, a matched source-vs-export shader comparison, validator receipt, pixel-preservation checks and reproduction notes.

- [Editable Blender source](../../../../experiments/cloud-lanes/human-skin-eyes-art/artifacts/skin-eyes-calibration-v1.blend): 1,305,557 bytes.
- [Uncompressed calibration GLB](../../../../experiments/cloud-lanes/human-skin-eyes-art/artifacts/skin-eyes-calibration-v1.glb): 1,619,492 bytes.
- [Raw GLTFLoader contact sheet](../../../../experiments/cloud-lanes/human-skin-eyes-art/proof/gltf-contact-sheet.jpg): neutral/day/night plus eye close-up, visually inspected.
- [Blender contact sheet](../../../../experiments/cloud-lanes/human-skin-eyes-art/proof/contact-sheet.jpg): neutral/day/night and eye detail, visually inspected.
- [Shader-loss comparison](../../../../experiments/cloud-lanes/human-skin-eyes-art/proof/shader-loss.jpg): same geometry, map, camera, lighting and random seed, core PBR versus retained Blender subsurface source.
- [Material/asset packet](../../../../experiments/cloud-lanes/human-skin-eyes-art/asset-packet.json): bytes/SHA-256 for deliverables, sources and JSON receipts; axes, units and calibration anchors.
- [README and commands](../../../../experiments/cloud-lanes/human-skin-eyes-art/README.md): reproduction, editing, measurements, material behavior, source notices and visual limitations.

Three artistic appearances (umber / copper / rose) use generated color, roughness and tangent normals. A separately authored eye has a scleral shell, concave radial iris, recessed pupil and transmissive corneal cap. Procedural texture functions are original analytic raster bakes, not Cycles ray-bakes or acquired imagery. Scripts are embedded in Blender Text blocks as well as provided separately; material nodes remain editable.

Calibration is useful original material work, **not completed realistic human art**. Curved patches are deliberately material fixtures with no anatomy/rig fit claim. The nominal 24 mm eye and other dimensions are authored choices, not measurements of a person. No ethnicity classification, scanned individual, external asset acquisition or image generation service was used.

## Input pins and evidence

Locked packet SHA-256 `9c15f10e6c82bbf31aa74e9dbcf2c9d3e4aef67ef3789d255c7c2e608623e7cb` / 14,085 bytes, plus all **155** indexed input byte lengths and SHA-256 hashes, passed. [Input receipt](input-verification.json). Frozen human contract: `71d6b5ad391754b0f30fc5364e993208299640ed`; no newer actual UV/mesh checkpoint has been supplied.

Decoded GLB: **17,296 triangles, 9,185 vertices, seven meshes/material slots, eight unique 512 × 512 embedded images / 1,094,118 encoded texture bytes**. Source Blender: 9,070 vertices; export splits UV/tangent boundaries. No joints, morphs or animations. Exact decoded source color/normal pixels and packed roughness G-channel values match the original skin PNGs. All alpha is opaque; transmission is an optical extension. Factors, local/world bounds, pivots and actual map ranges are recorded, without a game/performance claim.

Khronos validator: **0 errors / 0 warnings**, five informational unused tangent/UV notices. Raw Three 0.180.0 GLTFLoader: **PASS**, no page errors or failed requests, procedural RoomEnvironment reflections; browser/server closed and resources disposed. Saved `.blend` reopen: **PASS**, all eight images packed, both scripts retained. Visual proof shows nonuniform skin and readable iris fibers, pupil and highlights. Broad skin pigment variation is conspicuous and may need art-direction reduction after fitting; the iris boundary is sharp. These are visible limitations, not claimed final human realism.

Core glTF skin omits Blender subsurface scattering. Eye depends on `KHR_materials_transmission` and `KHR_materials_ior`; an unsupported loader may show an opaque cap. The existing static ModelPart route drops material factors and is not used for proof. No skinned-human route or game fit is claimed. Cycles retains corneal noise without a denoiser; browser close-up provides a cleaner independent exported-material view. Lighting/tone mapping differ between renderers.

## Required parent handoff

A parent-directed checkpoint request was issued in this session and remains pending. Obtain the **exact immutable mesh/UV/material checkpoint** from active human task `01a13667-6b47-7763-b71a-7d06139ed03f`: commit, paths and SHA-256 hashes for actual mesh/UV data, UV layer names, material-slot bindings and eye socket/attachment transforms. Fit and portrait are blocked only on that input. Do not guess compatibility from the old contract or moving branch. Create any later derivative within this lane; do not edit the human master. Existing production-character owner `01a13520-8d89-70f1-a722-786459524996` remains unreconciled and untouched.

Next worker: verify current packet and input pins, inspect the contact sheets, then consume the supplied immutable human checkpoint. Re-bake these authored material fields into that UV layout, use exact material slots, adapt eye centers only against supplied transforms, and prove portrait/eye closure/lighting on an independently owned derivative. Preserve the calibration packet for comparison; no shared runtime adoption belongs here.

## Resource and failure record

Heavy=1 through the repository shared slot, Blender 2 CPU threads, original job timeout 240 s, shader proof 120 s, browser 90 s, validator 30 s; Node heap 256 MiB. No minifier or full game build used. Only this lane's two pinned development packages were installed, with lifecycle scripts disabled and cache under `/tmp`. No global installation/settings or shared dependency changes.

First render failed because Blender lacks OpenImageDenoise; retained receipt explains the change to denoising off / 40 samples. The first npm attempt failed to create its default cache; it was retried with an explicit task cache under `/tmp`, without changing global settings. Proof render uses 64 samples for two matched frames. Initial browser framing clipped patch edges; the final inspected screenshot uses a wider orthographic camera. Initial side-by-side shader layout was replaced by matched sequential renders to remove lighting-position differences. Final logs/receipts are retained in the lane; scratch PNGs and `.blend1` backups are ignored.

Heavy/server/browser slots are 0/1 after work. No peak RSS or physical-device performance is claimed. No new agents, unknown-process stops, force pushes, merge, deployment, credentials, paid acquisition, shared runtime/public assets, human-master edits or unchanged suite reruns. Parent owns integration and any later admission.
