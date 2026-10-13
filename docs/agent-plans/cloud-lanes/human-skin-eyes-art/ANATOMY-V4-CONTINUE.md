# Anatomy v4 material and cornea derivative

Separate owned review candidate. The corrected `fitted-v1` packet at `2544b6d66bddf5431ed15bd17298a21b43bcc454` remains byte-for-byte unchanged. This derivative consumes **`2921534bdc8959a8489713f9b1652381702808a5`**, frame `original-human-anatomy-frame@4`; it does not adopt or modify the human master. No new appearances, controls, workers, runtime changes or deployment.

## Open the tangible result

- [Editable packed Blender source](../../../../experiments/cloud-lanes/human-skin-eyes-art/fitted-v4/artifacts/fitted-human-skin-eyes-v4.blend)
- [GLB with three existing material variants](../../../../experiments/cloud-lanes/human-skin-eyes-art/fitted-v4/artifacts/fitted-human-skin-eyes-v4.glb)
- [Inspected neutral / half / full blink and three-appearance contact sheet](../../../../experiments/cloud-lanes/human-skin-eyes-art/fitted-v4/proof/anatomy-v4-refit.jpg)
- [File hashes](../../../../experiments/cloud-lanes/human-skin-eyes-art/fitted-v4/packet.json), [input pins](../../../../experiments/cloud-lanes/human-skin-eyes-art/fitted-v4/receipts/input-pins.json), [binding migration](../../../../experiments/cloud-lanes/human-skin-eyes-art/fitted-v4/receipts/binding-migration.json).

Input Blender SHA-256 `fb6f488c55b01083fc23803a79e677ae957ecc237004de62a78bd8804ee76302`; input GLB `2338c0b3b4d34d3549e2a2d30c91b4ddf65dc2111c9b6f13450a2dd8dad3477d`. Exact Git blobs are materialized into ignored `fitted-v4/inputs/`, with byte lengths and hashes in the receipt. The original integration base remains `caaee5e1b91afc7f3cd3f2124df3547dc7f492ec`; its locked 155-file packet was verified on this lane and is unchanged.

## Explicit migration and preservation

All **27** v4 candidate objects retain exact source positions, ordered triangles, UV layers, shape-key coordinates, driver definitions and transforms. Expanded GLB triangle positions and every original morph payload also compare exactly with the pinned candidate GLB. This is stronger than inheriting only the human producer's 20 unaffected-mesh check.

The four removed `UpperLid_Left`, `LowerLid_Left`, `UpperLid_Right`, `LowerLid_Right` bindings move to **`Head_continuous_anatomy`**, sharing its `Fitted_<appearance>_Head_continuous_anatomy` material and **`Head_socket_UV_v4`** atlas. There are now eight skin/lip bindings per appearance, down from twelve. The same umber / copper / rose pigments, roughness and normal recipes are rebaked into the actual active UV layers. The eye spheres retain `Prototype_UV_v1`; iris and pupil use the candidate's `Eye_disc_UV_v4`.

Consumers must set both existing corrective rules:

```text
corrective.height.CHANNEL = body.height * expression.CHANNEL
corrective.blinkArcLeft/Right = 4 * blinkLeft/Right * (1 - blinkLeft/Right)
```

The raw Three.js viewer implements and checks these bindings; the half-blink image has both blink-arc correctives at 1. Source Blender drivers are unchanged. Added caps have only the matching `body.height` key. No expression workaround, hidden geometry, fade, shrink of the aperture or master edit is used.

## Cap refit and finite acceptance

The new caps follow the **12 mm radius** eye spheres at the unchanged eye centres `[±0.032, -0.036, 1.635]` metres. Each has an unchanged 6.25 mm aperture radius, 40 segments, eight radial intervals and **600 triangles**. Relative to the analytical sphere the final cap has a 0.25 mm offset plus a **0.05 mm** centre dome, so its frontmost neutral Blender Y is −0.04830 m. This is a thin optical approximation with IOR 1.376, transmission 1 and roughness 0.025; no tear film or volumetric cornea.

The first 0.20 mm dome attempt intersected at the all-six-controls-minimum packet: 231 raw pairs / 227 proper crossings across the original 79 sampled poses. That failure is retained in `finite-refit-initial.json`. A four-depth, nine-blink targeted screen found shallower candidates clear. The selected 0.05 mm dome then passed **111 finite poses / 888 cap–surface pair tests**, with **zero raw BVH pairs and zero proper crossings**. Cases cover blink steps of 0.05 at height −1/0/+1 and all-six controls −1/+1, plus independent left/right blinks at 0.25/0.5/0.75.

Only the added caps are tested against evaluated Head, Eye, Iris and Pupil. The anatomy owner's master-only 35-case suite and continuous orientation certificate were not rerun. Minimum sampled cap-vertex distances are **104.0 µm to the head** and **70.0 µm to inner eye surfaces**. Explicit glTF-style corrective evaluation agrees with Blender's evaluated head within 0.178 µm. These are finite samples and vertex-to-surface distances, not continuous collision or global minimum-clearance certificates. [Finite receipt](../../../../experiments/cloud-lanes/human-skin-eyes-art/fitted-v4/receipts/finite-refit.json).

## Actual UV impact and visual findings

The inherited atlas is **not clean**. The pinned owner diagnostic reports 2,102 positive-area overlap pairs among original head faces, zero-area cap UVs, and zero overlap for its new connected sockets and iris/pupil discs. Our shipped-resolution raster still has **124 / 64,837 multiply covered head pixels (0.191%)**. Competing head surface samples disagree by up to **8.50 / 255 in copper colour** and can be 37.75 mm apart. None of those sampled competing points are in the defined front-eye region. That is a resolution-dependent observation, not proof that every overlap is harmless.

Ear competition remains much larger: **27.3% / 28.7%** of covered pixels, with up to **10.67 / 255** colour disagreement. Hands/forearms have **5.37% / 5.21%** competition, up to **11.07 / 255**. Last-triangle wins in the bake; these surfaces cannot independently carry the requested source texture everywhere. Thin overlaps, mip filtering, normal details and zero-area triangles have additional limits. [Measured UV-impact receipt](../../../../experiments/cloud-lanes/human-skin-eyes-art/fitted-v4/receipts/uv-impact.json).

The actual raw-GLTFLoader sheet was visually inspected. Neutral and half-open eyes show iris/pupil and specular highlights; full blink closes over the caps. The former separate-lid texture bindings are gone. Angular orbital folds, a broad mottled skin pattern, waxy highlights, coarse ear surfaces and low-resolution facial texture detail remain visible. The front-eye overlap measurement does **not** explain away those visible anatomy/material limitations. This is a fitted prototype, not final realistic-human acceptance.

## Measured cost and format limits

| Measure | Derivative |
| --- | ---: |
| Triangles | **30,738** = candidate 29,538 + caps 1,200 |
| Meshes / primitives | **29 / 29** |
| Exported vertices | **17,350** |
| Materials stored / active default | **38 / 22** |
| Existing appearance variants / variant bindings | **3 / 8** |
| Summed POSITION morph targets / joints / clips | **105 / 0 / 0** |
| GLB bytes | **2,224,132** |
| Packed Blender bytes | **1,727,969** |
| Embedded images / encoded image bytes | **44 / 632,898** |
| RGBA8 base-level texture estimate | **2,932,736 bytes**, excluding mips/driver overhead |
| Full-body raw Three render | **58 calls / 61,476 submitted triangles**, including transmission, no shadows |
| Close-up / portrait render | **42 / 44 calls**, including transmission |

Full-body cost is one measured 512×512 offscreen view; close-up and portrait counters include their frustum culling. Software SwiftShader results are not phone performance. Geometry has 29 material-bearing primitives before renderer passes. All three variants are in one GLB; additional variant definitions do not each cause a draw. Texture sizes remain 256² head/eyes and 64² smaller exposed surfaces, with the original 512² calibration sources retained separately. Colour is sRGB; roughness and tangent micro-normal maps are non-colour data, normal scale 0.35. All alpha is opaque; optical transmission needs the raw PBR route. There is no subsurface scattering, skeleton or skinning. The shared static importer still does not establish game parity.

glTF validation: **0 errors, 1 warning** for Neck runtime-generated tangent space; the head now exports tangents. Original n-gon meshes were not altered merely to silence exporter warnings. Bounds in glTF metres are `[−0.331311, 0.010000, −0.119580]` to `[0.331367, 1.758000, 0.139000]`; Blender Z-up/front −Y maps to glTF Y-up/front +Z. Source/authorship: original procedural calibration textures plus the pinned human lane's original geometry; no external image, scan or asset acquisition. Existing candidate anchors and object transforms remain unchanged.

## Continue within scope

Working branch: `codex/cloud-human-skin-eyes-art-20261013`. Owned v4 source and receipts are under `experiments/cloud-lanes/human-skin-eyes-art/fitted-v4/`. Parent may review this exact candidate for later combined adoption; no adoption is implied here. UV cleanup, anatomy improvement, rig/skinning and game/device proof remain separate work. Any newer master requires another explicit pin and independent derivative.

From repository root, use Node heap 256 MiB and the existing heavy=1 slot. `pin_candidate.py` restores only ignored immutable inputs. Sequence: `build_fitted.py` (Blender, 2 threads, timeout 150 s), `check_refit.py` (Blender, timeout 90 s), `merge_variants.py`, `verify_export.py`, `validate.ts` (timeout 30 s), and `browser_proof.py` (heavy/server/browser slots, timeout 90 s). `assess_uv_impact.py` is a bounded 60 s Blender diagnostic. The depth screen is historical diagnosis, unnecessary for unchanged outputs. `seal_packet.py --check` verifies owned hashes. No full project tests, paid calls, installs, global settings or extra workers were used. Browser resources and owned server were disposed and closed.
