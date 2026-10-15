# Nigeria asset contract audit

- Owner: delegated /root/asset_contract; UTC 2026-10-15; status active.
- Execution: published remote Linux environment, /workspace/joinallworld, branch codex/nigeria-runtime-release-20261015 at 81a94cbbd6b5024ae87fb2d1d6b3d11239637ddb.
- Input: /workspace/allworld-assets pinned 8d01a5b83ab23a64b621def4784ffd0c93684c81.
- Exclusive ownership: this record and /workspace/nigeria-release-evidence/asset-contract.json only. No shared source edits, commits, push, deploy, or asset generation.
- Goal: independently verify hashes, GLB budgets, image residency, coordinate/rights contracts and host placement risks.
- Dependencies: release lead owns code and release. Existing release record untracked at registration; preserved.
- Resources: no server/port/process ownership.
- Evidence: audit pending. Next step inspect GLB chunks and sidecars.
- Release state: not an integration or production certificate.

## Final checkpoint

Status: complete within read-only audit scope. Independently parsed all 12 GLBs (JSON/BIN chunks, accessors, primitives, PNG dimensions and exact mip chains). All three requested batch hashes, six manifest/publication/checksum pins, all module payload SHA256 entries, all near/far hashes and collision/anchor authoritative extracts pass. Counts agree with packaged structural validations. No light/camera exports. Every module's tiers share identical image content; separate GLTF loads still duplicate decoded textures unless explicitly managed.

| Module | Near/far triangles | Near/far primitives | Texture bytes per tier with mips |
|---|---:|---:|---:|
| Abuja mosque | 4942/1936 | 4/4 | 7340028 |
| Lagos Broad Street | 7618/1822 | 1/1 | 8388604 |
| Abuja commercial | 3842/1020 | 3/3 | 7340028 |
| Lagos transit shops | 7668/1822 | 1/3 | 8388604 |
| Abuja residential | 5192/1780 | 3/3 | 7340028 |
| Lagos compound | 5956/572 | 2/2 | 8388604 |

Evidence: remote-host `/workspace/nigeria-release-evidence/asset-contract.json` records source pins, each tier/image/hash, sidecar checks, rights statements and host risks. Original geometry is authorized for owner's project; general redistribution rights are not granted; imported surface source maps documented CC0; research images excluded. This audit verifies recorded provenance and payload integrity, not independently obtained legal title.

Host facts: src/budgets.ts confirms17000 triangles/60draw total venue; src/scene/neighbourhood-scene.ts:38 confirms11500/20 imported-layer cap. Legacy gltf-source flattens geometry and retains base atlas only, so it is unsuitable for the authored PBR contract. Scale is1.4 game units/metre; glTF is already Y-up. Entrance tuples are x,z,heading and heading must not be scaled. Both visual and sidecar data require the same placement transform.

Integration blockers for release lead: mosque footprint154x113.4 game units is much larger than ordinary venue, requires genuine camera/terrain/grid composition; Broad Street only authorizes sidewalk walk area; preserve entrance/exit/actions and collision. Lagos Broad+transit near total15286 exceeds imported-layer cap. Actual game draw totals, loading/lifecycle, navigation, lighting, camera and customization still need host evidence. No production readiness claimed; no source edits/push/deploy performed. No owned processes remain. Next step: integration lead implements adapter/placement and verifies actual game gates.
