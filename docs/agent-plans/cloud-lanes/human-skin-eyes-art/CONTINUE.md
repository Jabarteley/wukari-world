# Skin / eyes calibration — assignment A

Own branch `codex/cloud-human-skin-eyes-art-20261013`; only this documentation prefix and `experiments/cloud-lanes/human-skin-eyes-art/`. Base integration commit: `caaee5e1b91afc7f3cd3f2124df3547dc7f492ec`.

Input verification: locked packet SHA-256 `9c15f10e6c82bbf31aa74e9dbcf2c9d3e4aef67ef3789d255c7c2e608623e7cb` / 14,085 bytes, plus all 155 indexed input byte lengths and SHA-256 hashes passed. See `input-verification.json`. Frozen human contract is `71d6b5ad391754b0f30fc5364e993208299640ed`; it is not an actual UV/mesh checkpoint.

## Tangible checkpoint

Original deterministic raster-baked skin color/roughness/tangent normals, three artistic appearances (umber / copper / rose), curved skin material fixtures, separately modeled scleral shell, concave iris, recessed pupil and transmissive corneal cap. Editable Blender source has packed maps and embedded generation scripts; the GLB contains baked PBR maps. No photographs, external asset acquisition, image generation service, scanned person or ethnic classification.

Calibration is useful material work, not finished skin-on-human acceptance. The curved patches deliberately have no anatomical or rig fit claim. They must not be counted as completed human character art. The eye is an authored 24 mm calibration model; dimensions are artistic choices, not measurements of a person.

## Required parent handoff

Parent: please obtain the **exact immutable mesh/UV/material checkpoint** from active human task `01a13667-6b47-7763-b71a-7d06139ed03f`. Supply commit, paths and SHA-256 hashes for its actual mesh/UV data, UV layer names, material-slot bindings and eye socket / attachment transforms. No newer checkpoint has been supplied to this lane. Fit and portrait remain blocked on that input. Do not guess compatibility from the old contract or a moving branch. Create any later derivative only within this lane; do not edit the human master.

## Continuation / limits

Early checkpoint first; isolated raw GLTFLoader browser proof and decoded export checks follow. Current static ModelPart route drops PBR factors; no game acceptance or physical-device performance claim. Core glTF has no Blender subsurface scattering; the `.blend` retains separately named SSS source looks for explicit comparison. Eye optical transmission needs glTF extensions; alpha remains opaque.

Heavy=1 via the repository shared slot, Blender 2 CPU threads, 240 s timeout; Node heap 256 MiB. First render attempt failed because this Blender build has no OpenImageDenoise support. The retained attempt log records that failure; rerun disables denoising and uses 40 samples. No global installs/settings, credentials, paid resources, workers, merges, force pushes or runtime changes.
