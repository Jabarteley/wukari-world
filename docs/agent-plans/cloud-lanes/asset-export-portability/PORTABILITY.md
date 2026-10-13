# Read-only pipeline findings

Code observations are at baseline `81d9f599d87dfb34adf49cd9337a0b05678e5e0d`; SHA-256 pins are in the lane packet. The official [glTF 2.0 specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) defines metre units, Y-up axes, linear vertex-color factors and metallic-roughness semantics used here. Installed Blender 4.3.2 exporter source was inspected for actual option names.

| Path | Observed behavior | Consequence |
| --- | --- | --- |
| `scripts/body/build-body.ts:27,89–92` | `gltfpack@1.3.0`, `npm_config_offline=true`; optional `--gltfpack` JS entry | Fresh Linux needs the exact recognized package cached/installed. Lane locks it locally; shared builder untouched |
| `scripts/body/build-body.ts:119` | `sips -s format bmp -Z 256`, custom BMP reader, sRGB-to-linear skin/cloth sample | Mac executable unavailable on Linux. Replacement needs orientation/resize/color/reference-value tests |
| `scripts/body/build-body.ts:202` | `sips` JPEG quality 78, max dimension 1024 | Linux JPEG support does not establish byte/pixel equivalence. Texture portability open |
| `scripts/body/build-body.ts:238,295` | Body `-cc -kn -si`; clips `-cc -kn -ac -af 20 -ar 12`; hardwired shipped output/manifest paths | Do not invoke as isolated experiment; lane never ran this builder |
| `src/scene/models/gltf-source.ts:36–40,75–131` | Meshopt loader; baked transforms, named empty anchors, RGB colors, atlas UV transforms | Static path has no skin/morph contract; COLOR_0 alpha discarded. Fixture uses alpha=1 and separate static rejection |
| `src/scene/models/scene-models.ts:40–51,282` | No PBR fields in ModelPart; standard material roughness .92/metalness 0 (Lambert for matte kits) | Raw GLTFLoader material preservation is not end-to-end game support; paired render demonstrates difference |
| `src/scene/body/skinned.ts:133` | Separate Meshopt loader with rig/appearance/wardrobe/animation lifecycle | Keep skinning separate. Body COLOR_0 is a clothing-region mask, not ordinary visible vertex-color albedo |

Neither loader configures Draco. This proof requires none: canonical files are uncompressed and optional packed files explicitly use **EXT_meshopt_compression**, without assuming newer KHR extension support. The coordinator's missing Blender Draco library does not block this route. Authored near/far files are selected by manifest; no new LOD extension or skin/animation simplification is introduced.

One core PBR material, three linear FLOAT_COLOR swatches, identity ground pivot, named anchors and outward geometry make regressions measurable. Local +Z-forward is not a geospatial north declaration. No texture maps or skinned/clip assets are created or replaced.

## Established tools

Registry metadata was read before task-local installation; lockfile pins registry URLs and integrity. Install scripts disabled. No global package or service install.

| Tool | Version | Official project / declared package license |
| --- | --- | --- |
| Three.js | 0.180.0, matches root lock | [mrdoob/three.js](https://github.com/mrdoob/three.js), MIT |
| gltfpack | 1.3.0, matches body builder pin | [zeux/meshoptimizer](https://github.com/zeux/meshoptimizer), MIT |
| glTF Validator | 2.0.0-dev.3.10 | [KhronosGroup/glTF-Validator](https://github.com/KhronosGroup/glTF-Validator), Apache-2.0 |

Blender, Chromium and Python Playwright were already installed. Dependencies remain ignored local installs, not bundled artifacts. Original fixture/source/render files use repository AGPL-3.0-or-later. Root lockfile's existing MIT metadata inconsistency was not edited or used as an asset-rights claim.

Pass means deterministic GLBs from recipe and saved source; metre/pivot/PBR/linear-color/anchor contracts; standard validation plus real Meshopt decoding; static refusal and golden receipts; six real software-rendered views and cleanup. It does not mean body/texture portability, original-team importer acceptance, full PBR game integration, skinned/morph/clip equivalence, streaming/fallback, whole-game checks, hardware/mobile performance or realism. No proposed art budgets become runtime caps through this packet.
