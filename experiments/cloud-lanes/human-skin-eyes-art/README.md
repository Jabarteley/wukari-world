# Original skin and eye calibration

[GLTFLoader visual proof](proof/gltf-contact-sheet.jpg) · [Blender contact sheet](proof/contact-sheet.jpg) · [editable Blender source](artifacts/skin-eyes-calibration-v1.blend) · [GLB](artifacts/skin-eyes-calibration-v1.glb) · [material packet](asset-packet.json)

Three original artistic skin appearances and an original amber-brown eye, built for assignment A on integration `caaee5e1b91afc7f3cd3f2124df3547dc7f492ec`. These **calibration assets are not fitted human art**. The exact active human mesh/UV/material checkpoint is still required; no person, ethnicity or production character is represented.

## Edit

Open the packed `.blend`. Collection `01_CALIBRATION_ASSETS_NOT_HUMAN_FIT` contains three curved material patches and the separate sclera / concave iris / pupil / cornea meshes. The proof lights, camera and backdrop are isolated in `02_PROOF_RIG` and excluded from GLB. Blender image nodes, normal strengths, IOR, roughness and subsurface parameters remain editable. Source scripts are also embedded in Blender Text blocks.

`make_textures.py` is the deterministic procedural source (seed 7108). Edit `appearances` for the three artistic color bases, the pigment fields / follicle distribution for skin detail, or the iris radial function for fibers and collarette. It analytically raster-bakes original material fields into 512 × 512 PNGs: no photographs, scans, external textures or baked illumination. This is not a Cycles ray-bake claim. Skin color maps share the same generated detail coordinates to isolate appearance differences; they are not three distinct individuals.

`build.py` builds the curved surfaces, optical eye parts, node graphs, packed source and GLB. All positions are authored in metres. Blender is Z up / −Y forward; GLB is Y up / +Z forward. Each patch pivots at its authored surface-center frame. All eye components share the eyeball-center pivot. No rig, joints, morphs, human bindings, attachments or animations are included.

## Measured export

| Quantity | Observed in GLB |
| --- | ---: |
| File bytes | 1,619,492 |
| Meshes / material slots | 7 / 7 |
| Triangles / decoded vertices | 17,296 / 9,185 |
| Source Blender vertices | 9,070 |
| Embedded images | 8 × 512 × 512 |
| Embedded image bytes | 1,094,118 |
| Base PNG source bytes | 1,014,735 |
| Skin patch triangles | 2,592 each |
| Sclera / iris / pupil / cornea triangles | 5,680 / 1,920 / 80 / 1,840 |
| Morphs / joints / animations | 0 / 0 / 0 |

World-space decoded GLB bounds in metres are `[-0.1264999975, 0.0134999994, -0.0120000001]` to `[0.1139984746, 0.0745000001, 0.0128199998]`. Detailed object-local bounds, translations, material factors, vertex counts, image channel ranges and hashes are in [decoded-glb.json](receipts/decoded-glb.json). These are exported-artifact measurements. Authored dimensions (49 × 61 mm skin patch, nominal 24 mm eye shell, 11.2 mm iris) are design choices, not verified biological measurements.

## Shading contract and loss

- Base color PNGs: sRGB; material factors default to white. Roughness and tangent normal maps: linear / Non-Color. Normals use +Y green, OpenGL/glTF convention; source raster image-down derivative is inverted when making the normal. Exported tangents preserve the UV basis through the axis conversion.
- Skin: metalness 0, roughness from the packed **G** channel, normal scale approximately 0.7. All three skins share one underlying normal image and roughness image. There are 12 glTF texture records but only eight unique embedded images; that is not 12 unique maps.
- Iris: roughness 0.34, normal scale 0.35. Sclera: roughness 0.24. Pupil: roughness 0.60. Cornea: roughness 0.045, IOR 1.376, transmission 1.0. Decoded factors are checked within float precision.
- All materials have `alphaMode=OPAQUE`; every embedded pixel has opaque alpha. Cornea uses optical transmission, **not** alpha blending. It needs `KHR_materials_transmission` and `KHR_materials_ior`; an extension-ignorant loader can turn it into an opaque white cap. No universal fallback is claimed.
- Blender source looks named `*_BLENDER_SSS_SOURCE` retain subsurface weight 0.11 and scale 0.65 mm. Exported `*_BAKED_PBR` materials use weight 0 because core glTF does not carry this Blender scattering model. The matched camera/light [comparison](proof/shader-loss.jpg) demonstrates the omitted source effect on the same calibration surface. These open patches do not establish skin thickness or ear/backlight behavior on a real head.
- The GLB eye is a thin transmissive surface approximation, without a volumetric corneal thickness or tear film. The separate sphere and cap do not establish human socket fit, eyelid contact, gaze, tears or anatomical acceptance.

## Visual review

The Blender sheet and raw GLTFLoader sheet were both opened and inspected. Three appearances remain distinct across neutral/day/night, with spatial pigment variation and specular response. In the browser close-up the iris fibers, dark pupil, limbal boundary, corneal highlights and faint scleral veins are visible. Skin pore normals are subtle at lineup scale; broad pigment mottling is deliberately visible and may need art-direction reduction after a real face fit. The iris boundary remains sharply defined and should be reassessed inside eyelids.

Blender Cycles frames retain noise, especially through the cornea: this installed build has no OpenImageDenoise. The first failed attempt is retained; production proof uses no denoising. Browser screenshots are useful export evidence, not the same lighting/tone mapping as Blender or actual-game parity. Three's procedural RoomEnvironment supplies proof reflections; it is not an acquired HDRI and is not in the GLB.

## Reproduce within resource limits

From repository root, use the existing shared `scripts/agent-slot.ts`; never override heavy above 1. Commands below change only this lane and temporary caches. No root dependency/lockfile, global installation or runtime changes are needed.

```sh
python3 experiments/cloud-lanes/human-skin-eyes-art/make_textures.py
NODE_OPTIONS=--max-old-space-size=256 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 240s blender -b -t 2 --python experiments/cloud-lanes/human-skin-eyes-art/build.py
python3 experiments/cloud-lanes/human-skin-eyes-art/contact_sheet.py
python3 experiments/cloud-lanes/human-skin-eyes-art/verify.py
NODE_OPTIONS=--max-old-space-size=256 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 90s npm ci --prefix experiments/cloud-lanes/human-skin-eyes-art --cache /tmp/allworld-skin-eyes-npm-cache --ignore-scripts --no-audit --no-fund
NODE_OPTIONS=--max-old-space-size=256 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 30s node experiments/cloud-lanes/human-skin-eyes-art/validate.ts
NODE_OPTIONS=--max-old-space-size=256 node scripts/agent-slot.ts heavy --wait-ms 1000 -- node scripts/agent-slot.ts server --wait-ms 1000 -- node scripts/agent-slot.ts browser --wait-ms 1000 -- timeout 90s python3 experiments/cloud-lanes/human-skin-eyes-art/browser_proof.py
NODE_OPTIONS=--max-old-space-size=256 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 120s blender -b -t 2 --python experiments/cloud-lanes/human-skin-eyes-art/shader_loss.py
python3 experiments/cloud-lanes/human-skin-eyes-art/shader_sheet.py
python3 experiments/cloud-lanes/human-skin-eyes-art/verify.py
```

Exit 75 means the slot was busy; defer and do light work. No unchanged suite/build was run. Render settings: 2 CPU threads, 40 samples for the original four frames; 64 for each shader-loss frame. Output PNGs are ignored; small labeled JPEGs are versioned. Software WebGL proof closes its server/browser and disposes GPU objects; it has no animation loop. The `.blend` is packed so viewing/editing it does not require Python dependencies or npm. Reproduction needs the available Blender 4.3.2, Python/NumPy/Pillow and Playwright/Chromium; browser dependencies are pinned lane-locally.

Original scripts, geometry and raster assets are contributed under this repository's AGPL-3.0-or-later license. No third-party art is included. Three 0.180.0 is MIT, Khronos glTF Validator 2.0.0-dev.3.10 Apache-2.0; used as development proof tools, not vendored art or new shared runtime dependencies.

Contact-sheet captions use the installed DejaVu Sans font; no font file is vendored. PNG render frames are arranged without retouching.
