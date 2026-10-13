# Yaba ground art — tangible handoff

Branch `codex/cloud-yaba-ground-art-20261013` is based exactly on integration
`caaee5e1b91afc7f3cd3f2124df3547dc7f492ec`. Early editable art, both LODs and an
inspected contact sheet were pushed at **a8b19c28**. Current head completes the
scoped placement, material/export and visual proof. Only this directory and
`experiments/cloud-lanes/yaba-ground-art/` changed. No shared runtime, movement,
public assets, other lane or active human master was changed. No merge/deploy.

## Open these first

- [Actual contact sheet](../../../../experiments/cloud-lanes/yaba-ground-art/artifacts/contact-sheet.jpg)
- [Editable packed Blender source](../../../../experiments/cloud-lanes/yaba-ground-art/artifacts/yaba-street-v1.blend)
- [Near GLB](../../../../experiments/cloud-lanes/yaba-ground-art/artifacts/street-near.glb) / [far GLB](../../../../experiments/cloud-lanes/yaba-ground-art/artifacts/street-far.glb)
- [Raw GLTFLoader visual proof](../../../../experiments/cloud-lanes/yaba-ground-art/receipts/browser/gltfloader.jpg)
- [Local placement and frontage reservations](../../../../experiments/cloud-lanes/yaba-ground-art/placement.json)
- [Measured packet and hashes](../../../../experiments/cloud-lanes/yaba-ground-art/packet.json)

This is original authored-synthetic street art. Only the central **24 × 13.2 m**
segment is detailed; the **200 × 200 m** area is editable planning massing with road
reservations and four frontage zones. Those ribbons are not finished street art.
No surveyed Yaba correspondence, completed buildings or characters is claimed.

## Geometry and materials

Chosen dimensions: 7 m crowned carriageway, 0.065 m crown rise, 0.6% northward grade,
0.58 m outer drain width, 0.20 m shaped kerbs, two 2.10 m sidewalks, east driveway
at local north 3–7 m with 1 m transition ramps. Kerb height lowers from 0.175 to
0.035 m. Outer shoulder grading joins the driveway threshold; the earlier step is
corrected. These are authored dimensions, not physical-world measurements.

Recessed drain invert, open channel, iron grille bars, slab joints, inset utility
lid, irregular tar repairs, worn paint fragments and aggregate are actual geometry.
Original seeded color/normal maps supply surface variation. Image data is packed
in the blend and embedded in the near GLB. No third-party asset or imagery was acquired.
AGPL-3.0-or-later, consistent with the repository. The resource wrapper and browser
harness derive from the pinned export lane; no other lane was edited.

| Export measurement | Near | Far |
| --- | ---: | ---: |
| Raw GLB bytes | 2,932,236 | 22,740 |
| Triangles | 14,253 | 148 |
| Mesh primitives | 448 | 22 |
| Materials | 13 | 3 |
| Embedded maps | 6 | 0 |
| Skin / morph / animation count | 0 / 0 / 0 | 0 / 0 / 0 |

Decoded near bounds (X east / Y up / Z south) are approximately
`[-6.6,-0.29,-12]` to `[6.6,0.3538,12]` metres. Blender source uses X east / Y north /
Z up, one metre per unit. Model ground anchor is glTF `[0,0,12]`, at the south road
edge zero datum. Heading **180°** makes glTF +Z face south with zero scene yaw;
heading zero would incorrectly reverse this authored segment.

Two 512² asphalt maps plus four 256² cement/silt maps: **961,115 encoded bytes**,
**3,145,728 decoded RGBA8 bytes before mipmaps**. Colors are sRGB JPEG; normals are
Non-Color PNG, OpenGL tangent +Y, scale 0.28. Explicit tangents remain on normal-mapped
meshes. Lossless GLB cleanup removes unused UV/tangent attributes only. No Draco,
Meshopt, geometry simplification or decoder. Roughness is a per-material scalar,
not a spatial map; opacity is OPAQUE. Texture data is generated directly; no
shader-only noise needs baking. Source/geometry/texture hashes are in the packet.

## Frozen inputs and geography proof

Planning ID `yaba-game-anchor-200m-planning-v1`, approximate game anchor lon 3.382 /
lat 6.5075, local east/north ±100 m, arbitrary vertical zero. Every road width,
alignment, level and material is **authored-synthetic**; real-world errors unknown.
No Google tracing or other imagery input.

Packet-lock SHA-256 `9c15f10e6c82bbf31aa74e9dbcf2c9d3e4aef67ef3789d255c7c2e608623e7cb`,
14,085 bytes. The scoped verifier checks it, the sealed input-index digest, all
**155 input files / 2,746,358 bytes**, and four integration source hashes. Initial
shared `seal.mjs --check` stopped at its absent root Three dependency; no shared
dependency was installed. Complete direct recorded hash verification passed.
Geography lane source: `21b0850a996b4444d2e0c16626771671e191ddcd` through the pin.

The scoped check imports that adapter read-only. Ten decoded near/far anchors match
exactly. Adjacent-segment anchor discrepancy: **8.70e-9 m**. Actual terminal mesh
cross-section mismatch after the authored 0.144 m rise: **2.86e-8 m near / 8.70e-9 m
far**. These measure numerical consistency, not survey accuracy. Kerb bevels recess
surface corners up to 5 mm from design anchors. Anchor geographic round trips pass.
Projected street east scale remains **0.9940932547076073**, not one-to-one with local
metres. Downstream placement must use the adapter.

## Frontage handoff to E / placements to F

Consume this branch's exact final commit plus `placement.json` and its packet hash.
Layout `yaba-ground-layout-v1`; zones `frontage-zones-v1`. E01 reserves east
`[6.6,26.6]`, north `[-10,10]`, building front heading 270°. W01 reserves east
`[-26.6,-6.6]`, north `[-10,10]`, heading 90°. E02/W02 are north 14–38 m and remain
planning-only. E01 driveway outer threshold proposal: local
`[east=6.6,north=5,up=0.1718]` m. Buildings must supply their own sill/foundation
transitions; no building fit claim. F can propose details against this layout
without occupying the open drains or taking route authority.

[Collision/walkable annotations](../../../../experiments/cloud-lanes/yaba-ground-art/collision-walkable-proposals.json)
and the hidden Blender collision collection are separate conservative **proposals**.
They are not surface colliders, navigation or movement changes. `routeAuthorized=false`
everywhere. Open drains remain explicitly excluded pending WORLD integration.

Human contract metadata stays at `71d6b5ad391754b0f30fc5364e993208299640ed`. No newer
human mesh was supplied or consumed. Independent producer task
`01a13667-6b47-7763-b71a-7d06139ed03f` remains owner. Request an exact mesh checkpoint
through the parent before any later fit claim; this street needs no human fitting.

## Validation, visual review and resources

Final Khronos validation: **0 errors / 0 warnings / 0 infos for both GLBs**. Scoped
`verify.ts` checks pinned hashes, decoded geometry, LOD anchors, actual terminal
profiles, adapter placement and source-to-export tolerance. No unrelated full suite,
build, typecheck or shared asset generator was run.

Final source was reopened for four actual CPU Blender stills: eye, detail, overview
and plan. Contact sheet and final raw GLTFLoader screenshot were visually inspected.
Pavement joints, recessed drain/grille, crown, repair and driveway lowering are
visible. Asphalt mottling was reduced after first review. Isolated Three 0.180.0
preserves PBR factors/maps: both GLB responses 200, no page/request errors, resources
disposed, browser/server closed. Its lighting/shadows differ from Blender. This does
not exercise the current static ModelPart importer, which loses material factors.

All intensive jobs used shared **heavy=1**, Blender threads=2, Node heap≤1536 MiB,
existing minifier=1, and 45/60/120-second bounds. Owned tree RSS is sampled every 50 ms
with a 1536 MiB ceiling, not a kernel reservation. Final stills: 6.2–20.1 s each,
maximum 344,264,704 bytes sampled RSS. Final browser: 2.931 s / 917,954,560 bytes.
Final validator: 0.307 s / 119,676,928 bytes. No owned process remained; final
heavy/server/browser slots all 0/1. No unknown process was stopped.

Failures retained: unavailable denoiser initially; then zero-length tangents on an
over-bevelled thin utility insert. Denoising was disabled and the insert corrected.
Explicit tangents and attribute cleanup passed final independent validation. Full
logs are losslessly gzip archived; original/compressed hashes in
`receipts/log-archive.json`. JSON resource receipts remain readable.

## Continue

[README](../../../../experiments/cloud-lanes/yaba-ground-art/README.md) has bounded
commands. Loose generated textures, local npm dependencies and Blender backups are
ignored; committed blend/GLBs are self-contained. No global setting, root dependency
or system install changed. Full owned packet remains below 5 MiB, including evidence.

Remaining: 448 near draw primitives need an owned batching derivative before game
use. Far omits grate bars, drain side walls, individual slabs/wear and detailed kerb
ramps; proposed 35 m LOD threshold is unmeasured/unimplemented. This remains a tidy
synthetic prototype with regular paving and limited wear vocabulary, not a faithful
Lagos scan or completed city. Physical-phone performance, approved collisions,
current-game rendering, lawful survey data and runtime registration remain open.
No blocker remains to consuming this art/layout as a versioned prototype.
