# Native asset compression audit

## Identity

- **Work ID:** `native-asset-compression-20261016`
- **Owner:** `/root/native_static_lod`
- **Model / effort:** GPT-6 / high
- **Thread:** child of `/root`
- **UTC updated:** `2026-10-16T01:55:00Z`
- **Status:** `complete`
- **Work state:** `handoff`

## Goal and boundaries

- **Goal:** measure native53 GLB geometry, morph, rig and embedded-texture contributions and test whether locally available lossless compression can meet the unchanged base-body, wardrobe-item and motion Brotli caps.
- **In scope:** read-only inspection of original character-lab assets; isolated measurement or candidate artifacts under `/tmp`; this coordination record.
- **Out of scope:** shipped source or asset edits, mesh simplification, morph or rig removal, lossy texture conversion, cap changes, installs, paid services, builds, servers, browser use, commits, pushes and deployment.
- **Owned repository path:** `docs/agent-work/native-asset-compression-20261016.md` only.
- **Read-only asset source:** `/Users/anthonyakpan/Desktop/JoinAllworld/public/character-lab`.
- **Temporary artifact boundary:** `/tmp/native-asset-compression-20261016/`.
- **Dependencies:** root owns asset selection and release; Astra owns runtime integration and visual verification.

## Repository state

- **Repo:** `/Users/anthonyakpan/Desktop/JoinAllworld-native-character-release`.
- **Branch:** `codex/native-character-release-20261016`.
- **Revision:** `c7f3f0203c2297123e37e705f86177715f29de13`.
- **Dirty status at registration:** 50 modified or untracked paths, all pre-existing and preserved; this record is the only owned path.
- **Running resources:** none.

## Progress

### Done and exact evidence

- Read repository instructions, the current coordination index and the existing consumer release audit.
- Confirmed unchanged provisional caps: base body 300,000 Brotli bytes, clip pack 200,000 Brotli bytes and wardrobe item 60,000 Brotli bytes.
- Confirmed no asset-compression executables on `PATH`: `gltfpack`, `gltf-transform`, `basisu`, `toktx`, `cwebp`, `pngquant`, `draco_encoder` and `brotli` are absent in the release checkout environment.
- Found the existing `meshoptimizer` 0.22 low-level encoder/decoder in the original checkout. No installed glTF transform CLI or texture encoder can author production derivatives. The native character loader currently constructs `GLTFLoader` without `setMeshoptDecoder`, so compressed candidates require an explicit runtime decoder change before they can ship.
- Measured each original with Node zlib Brotli quality 11. GLB category figures below classify every buffer view once. Category Brotli values compress each category's concatenated bytes independently and therefore are diagnostic rather than additive.

| Original | Raw | Brotli q11 | Embedded image raw | Geometry Brotli | Morph Brotli | Rig Brotli | Cap | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| female round4 base | 2,632,124 | 855,476 | 157,519 | 248,598 | 314,700 | 48,548 | 300,000 | fail by 555,476 |
| male round4 base | 3,460,568 | 1,647,480 | 989,848 | 249,505 | 277,441 | 48,721 | 300,000 | fail by 1,347,480 |
| male round12 fitted skirt, largest active garment by Brotli | 2,711,260 | 2,537,185 | 2,303,235 | 34,694 | 181,147 | 18,416 | 60,000 | fail by 2,477,185 |
| female ponytail01, largest hair by Brotli | 682,084 | 544,428 | 395,216 | 96,433 | 7,434 | 25,284 | 60,000 | fail by 484,428 |
| male shoes01, largest shoe by Brotli | 797,148 | 741,831 | 688,618 | 29,103 | 0 | 13,798 | 60,000 | fail by 681,831 |
| iteration2 upper-palm motion GLB | 652,660 | 204,547 | 0 | 0 | 0 | 1,471 | 200,000 | fail by 4,547 |

- The motion metadata JSON is 16,608 raw / 3,660 Brotli bytes. It is separate metadata, not a replacement for the animation GLB.
- Active fitted-skirt embedded images alone are 2,303,235 raw / 2,287,425 Brotli bytes. Ponytail and shoes likewise carry already-compressed PNG payloads of 395,216 and 688,618 bytes. General transport compression and mesh-only compression cannot bring any of these items close to 60,000 bytes.
- Base storage also includes the native visual contract: female has 1,438,548 raw morph bytes across sparse and dense views; male has 1,434,404. Removing morphs would violate this task's requirements and still would not make the male base fit because its images alone are 989,848 raw bytes.
- A semantics-preserving JSON/padding repack was immaterial: female base -1,346 Brotli bytes; male base +585; active skirt 0; hair -61; shoes -10; motion 0.
- Authored required-extension GLBs under `/tmp` with `EXT_meshopt_compression`. All attribute, morph, rig and animation decoded bytes matched exactly. Each index stream retained identical triangles and winding; the encoder only cyclically rotated indices within some triangles. Brotli results were female base 860,000; male base 1,655,669; active skirt 2,544,200; hair 559,037; shoes 749,292. Meshopt makes these transport-compressed files slightly larger and does not approach their caps.
- The same motion candidate measured 648,240 raw / 179,283 Brotli, below the 200,000 cap. Three's `GLTFLoader` with `MeshoptDecoder` parsed one scene, all 11 named clips and 915 tracks. Candidate SHA-256: `f9a76667c5c1e0fc1fce10fa5f1be063ad89236c760b4fa0f3e506bd34d73456`.
- Full probe reports remain isolated at `/tmp/native-asset-compression-20261016/report.json` (SHA-256 `0d0d71531d651542bbac76cce6945167806736361307344130506f479952dd00`) and `report-largest.json` (SHA-256 `d4dedaa4fef20f5c9decd1eed43a2ec55c5256baf2d6ef9de53035153d29e9e6`). They are evidence only and are not release artifacts.

### Feasibility and next decision

- **Motion:** feasible under the unchanged 200,000-byte cap with lossless meshopt, after production tooling and the native loader wire `MeshoptDecoder` and the candidate receives integration verification.
- **Base and catalog items:** infeasible under the current 300,000/60,000-byte caps with the tested lossless methods. A production effort would need visually reviewed lossy texture derivatives, cross-item texture deduplication/externalization, and likely mesh/morph representation redesign. This audit does not approve those visual changes or estimate them as lossless.
- **Geometry budget:** download compression does not address the separate 17,000-triangle production ceiling. Each native base is about 26,928 triangles before hair, clothes and shoes, so release needs an explicit performance-budget exception or separately accepted geometry/LOD work.
- **Next executable step:** root decides the cap exception or commissions visually reviewed derivative authoring; no further compression work is pending in this unit.

## Release state

- **Shipped source/assets:** unchanged; every candidate is under `/tmp`.
- **Deployment:** not requested.
- **Visual acceptance:** Astra-owned; any future candidate must be visually reviewed before release.

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| `2026-10-16T00:47:55Z` | active | Registered isolated read-only asset compression audit at the exact release revision. | Git branch, revision and dirty count; current budget source and audit record | Resolve target assets and measure GLB storage |
| `2026-10-16T01:55:00Z` | complete | Measured structural and transport contributions; bounded lossless meshopt experiment proves motion feasible but base/catalog caps infeasible. | `/tmp/native-asset-compression-20261016/` reports and candidates; GLTFLoader parse of 11 clips / 915 tracks | Root chooses explicit budget exception or a visually reviewed derivative program |
