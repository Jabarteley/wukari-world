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

## Fixed navigation implementation ownership

Delegated by release lead: own src/scene/models/nigeria-navigation.ts and nigeria-navigation.test.ts plus this record. Pure batch001 navigation data/support/provenance supplements only; host changes belong to root. Current branch remains codex/nigeria-runtime-release-20261015. Preserve root's dirty runtime-module files and release record. Implement supported walk union, missing furniture blocker and anchor reachability tests; commit only owned paths.

### Fixed navigation completed

Implemented src/scene/models/nigeria-navigation.ts with pinned sidecar collision boxes, 1.4-unit conversion, fixed game-unit bounds/solids/entrances/action anchors/support planes, documented host supplements, and exact rectangle-union complement without clear overrides. Lagos entrance moved to(-2,2)m, floor support.185m, missing near furniture slab blocked for both tiers. Abuja unsupported north strip cropped to z>=0m, median support.18m. Boundary blockers correct WalkGrid's ceil-rounded partial edge cells and preserve supported player-radius clearance.

Validation: `node --experimental-strip-types --test src/scene/models/nigeria-navigation.test.ts` passes4/4. Tests cover overlapping/clipped rectangle complement, every action anchor's exact reachability, every free cell's declared support, old Lagos spawn/furniture exclusion, unsupported Abuja northern ground and raised crossing. No host modifications or production verification. Parent owns full typecheck/in-game renderer validation. APIs exported: NIGERIA_BATCH001_NAVIGATION, NIGERIA_METRE_SCALE, rectangleUnionComplement, nigeriaSupportHeight. These are zero-yaw/origin placements and require host to draw matching support; no invented ramp or indoor access.

## Lazy Lagos fixture preload correction

Own only preload corrections in src/scene/home-lighting.test.ts, src/scene/parametric-venue.test.ts, src/scene/venue-contact.test.ts, src/scene/walk-stop.test.ts, src/airport-refinery.test.ts, src/recovery-scene.test.ts, src/venue-world.test.ts. Root owns venue-world-lights.test.ts and runtime/host changes. Existing loadAllCityScenes fixtures remain unchanged. No commit until release lead asks. city-scenes.test.ts has an explicit old synchronous-Lagos contract; reported separately rather than suppressing its assertion.

Release lead additionally assigned src/scene/city-scenes.test.ts: update explicit Lagos readiness/override contract for intentional lazy Nigeria scene part. Retain refusal before download, unrelated-city isolation and no eager host chunk import checks. No commit requested yet.

### Fixture correction evidence

Eight owned tests modified (seven preloads plus city-scenes contract). venue-world retains general y<0.1 assertions while market now checks exact declared sidewalk height for arrival and return. Its full21 tests pass, including every venue action walk/return, camera, idle, disposal and customization. Parametric fixture keeps all behavior assertions: initial failure exposed real runtime-design override regression; after host owner's fix its4 tests pass. Remaining preload fixtures passed in initial42-test run (40 passed; the two reported failures subsequently resolved and rerun). Logs under remote /workspace/nigeria-release-evidence/{fixture-preload-tests,venue-world-preload-tests,parametric-preload-tests}.log.

city-scenes tests now require Lagos lazy download, preserve other-city refusal/isolation and no eager Nigeria host import; CSS fixture adds only actual controls.css side-effect import. Readiness+late arrival2/2 and readiness+city change+late arrival3/3 pass independently. Combined sequence stalls after first5 cases; candidate capped120s exits124 with pending Promise/event loop diagnostic. Baseline comparison at /workspace/nigeria-baseline HEAD60c3dff925fc9a2f5a5d995b1f6ab92997e36f7e also reproduces first5 pass then stall; terminal result pending. No tests suppressed, no runtime/host edits in this task, no commit authorized. Temporary diagnostic prints removed. git diff --check passes owned tests.

Baseline terminal classification: PRE-EXISTING sequence stall reproduced at clean baseline60c3dff925fc9a2f5a5d995b1f6ab92997e36f7e. Exact command used node --experimental-strip-types with CSS-only import hook, --test --test-name-pattern='^(?!every venue of every city|the shared scene chunk)' src/scene/city-scenes.test.ts under timeout75s. Exited124 after identical first5 passes then unresolved sixth; baseline log /workspace/nigeria-release-evidence/city-scenes-baseline-lifecycle.log. Candidate lifecycle45s and full120s runs show same symptom. This is not introduced by Nigeria fixture/source change; full city-scenes suite remains unverified. Focused changed readiness/late-arrival cases pass. No owned running test processes remain. Root has authorized fixture commit but temporarily holds shared index while host owner commits.
