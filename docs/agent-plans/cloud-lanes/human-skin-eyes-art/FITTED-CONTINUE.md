# Pinned human material derivative — provisional fit

Parent supplied exact master commit `3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a`. `fitted-v1/input-pins.json` records original Blender/GLB/frame hashes. The frame SHA-256 is `51fae932279d1513e16c4d06ce633f6218a994fe6c224bc3436e105cc519083b`; source Blender and GLB match its assertions. Read the human producer's own continuation at that exact commit before using the master. Imported bytes remain ignored inputs within this lane, never edits of its master.

This lane now provides `experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/artifacts/fitted-human-skin-eyes-v1.blend` and `.glb`, plus a visually inspected three-appearance portrait sheet in `fitted-v1/proof/fitted-portraits.jpg`. Material variants use original analytic texture fields remapped into the master's actual UVs, with reduced pigment contrast and original cheek warmth. Skin source bakes are 256 pixels for the head and 64 for smaller surfaces; eye maps are 256 pixels. The original calibration source and high-detail maps at `1efc5a28` are untouched. The first larger texture draft was reduced before committing to avoid Git bloat.

All **31 original meshes retain exact positions, ordered triangles, UVs and every morph delta**. Separate low-cost corneal caps add 1,200 triangles and `body.height` morphs. Total: **30,386 triangles / 33 meshes**, below the pinned 34,000-triangle preview limit. The master has no skeleton; this derivative adds none. Material binding counts and pixel/material variant validation are in progress.

## Real fit failure, not animation acceptance

New checks sample 23 neutral / six-control endpoints / all-control combinations / expressions / height×blink / half and asymmetric blink cases. The corneal caps produce **34 intersecting triangle pairs at half blink**, 18 left upper lid and 16 right upper lid. Neutral, full blink and the identity endpoints produce no new cap/lid/head intersections. The underlying unmodified eye/lid surfaces already have **1,336 triangle intersection pairs summed over these cases** (58 at neutral). These are triangle-pair counts, not distinct physical contact regions. The producer's 112 checks did not claim continuous collision or self-intersection acceptance.

The minimum sampled cap/lid distance is ~2.4 µm in the failed half-blink pose. This is a vertex-to-surface sample, not a proof of a positive global clearance. BVH checks find actual triangle crossings. Fit review is REQUIRED; the check intentionally exits nonzero. No animated-eye, wearable-animation, rig, production or game readiness is claimed. Do not repair the producer's eyelid morphs here; parent should pass the evidence to that owner.

UV rasterization also exposes inherited overlaps (notably ears, lids, fingers and iris fan), documented per surface. This prototype UV layout is not a production atlas, and texture seams/overlaps require art review. Original skin material bindings add no geometry intersections because the source geometry and morphs are byte-verified unchanged. Master hair cap, clothes and face anatomy remain its provisional design; this is material work only.

## Next / limits

Finish isolated raw GLTFLoader portraits and actual exported morph/variant checks; capture the half-blink failure and implemented endpoint examples. Preserve this early usable derivative and the original calibration assets. Keep all changes in the two owned prefixes. No shared runtime, human master, global settings, workers, merge/deployment, credentials or paid resources.

Commands use repository heavy=1, Blender 2 CPU threads, 240-second build/render cap, 90-second focused fit cap, Node heap 256 MiB. No producer 112-case rerun or full game tests. `pin_master.py` retrieves only exact Git blobs; `inspect_input.py` checks actual saved mesh/morph/UV hashes; `build_fitted.py` makes the derivative; `merge_variants.py` merges only material/image payloads into a single GLB with KHR_materials_variants while preserving default geometry/morph bytes. `check_fit.py` records the fit failure honestly. The final proof and continuation will name exact pushed commits.
