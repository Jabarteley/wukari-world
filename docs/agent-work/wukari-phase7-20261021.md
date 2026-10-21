# Phase 7: geolocation and geographic gameplay prototype

- Owner: Codex, local Windows continuation; active implementation.
- Checkout: `Jabarteley/wukari-world`, branch `feat/wukari-playable-study`, base `feat/fuw-local-pbf` at `f22c14d27538e67987e9e8bc1704b520231c1b95`. Starting tree clean.
- Read: AGENTS, current coordination, AGENT, Phase 6 handoff, geographic documentation and preview source. Prior owner is this continuing session; no overlapping local edits.
- Owned paths: new `src/wukari/play/`, bounded study preparation under `scripts/wukari/`, phase7 data/evidence/docs, focused tests. Existing importer and original national/region files stay unchanged. Investigate broader type failures without weakening checks or silently changing unrelated owners' contracts.
- Goal: corroborate FUW location with reviewable source points, inspect nearby original OSM IDs, deliver a bounded Wukari 3D prototype with movement/collision/camera/minimap and desktop/mobile evidence.
- Boundary: no assumed campus polygon, no university-owned labels without evidence, no public-access inference from mapping. Spawn activation conditional on reviewed virtual safety and user preference; non-spawning exploration available. No DB, merge, deletion, deployment or new national download.
- Inputs: existing `.cache/wukari/local-pbf-*`, nine validated batches and attributed LGA boundary.
- Resources: none started. Existing process ownership preserved.
- Output: small source-backed study data, source citations/confidence/unknowns, runtime and test evidence; new draft PR targeting `feat/fuw-local-pbf`.
- Next: inspect primary journal GPS tables and local features; select bounded source-derived study; implement isolated Vue/Three prototype in existing stack.

## Implementation checkpoint

- User explicitly approved a reviewed simulation-only spawn, with physical/public access unknown. Town study selects original node `1965491146` on residential unpaved road `558733005`, clear of recorded buildings and mapped major-road centre lines. No restrictive access tags/bridge/tunnel/ford; virtual corridor only. This is not real-world safety verification.
- Source-backed town study: 20 roads / 209 footprints; FUW vicinity: 24 roads / 571 footprints. Both use exact original ways/nodes from the hash-pinned Phase 6 aggregate. No national download or importer changes. FUW origin is a published historical point, not a surveyed boundary. Four historical research samples shown; unreferenced Wikidata pin retained as disputed context, never used as a spawn or campus perimeter.
- Runtime: third-person avatar, walking/sprint, camera follow/orbit/occlusion, footprint collisions, bounded virtual corridors, north-up minimap/compass, touch controls and lazy separate study loading. Merged meshes bound draw calls. UI sources/ID picker and ownership/access unknowns remain visible. FUW area has no spawn.
- 51 geographic/gameplay/wrapper tests passed. First browser pass verified actual real-road movement/sprint, camera rotation, corridor blocking, map pause, FUW spawn refusal, mobile touch/release/look and exploration toggle with no runtime/network errors. Subsequent denser-spawn screenshots are being finalized; no physical-phone FPS claim.
- Type investigation: Windows CRLF diagnostics failed the wrapper regex; fixed parsing and added a regression. Test fixtures now declare their existing ES module contract, and assert actual Windows termination metadata. No diagnostic suppression or baseline increase. Existing fetch/worker-token/JS fixture typing issues are investigated separately; fresh serial full check is still running, with no all-project pass claimed.
- Source ownership extended only to typecheck wrapper/test portability fixes and additive npm scripts. Previous acquisition/importer code and city runtime unchanged.
- Resources: owned loopback Vite 5196, isolated temporary-profile Chromium processes close after QA. Full typecheck owns its compiler process. Previous interrupted processes were rechecked absent before resuming.

## Final validation checkpoint

- Final focused suite: **52/52 pass** without contention, original wrapper timeouts retained. Additional real-building interior refusal assertion passes. Final strict focused Vue/TypeScript check passes; final static build includes both datasets and licence offer, with its recorded large-chunk advisory.
- Final real-data browser pass: actual walking/sprint and camera rotation, corridor blocking with valid non-colliding position, map pauses movement, FUW remains non-spawning, 390px touch/release/look, exploration, no overflow/runtime/network errors. Camera view bearing checked in east/south frame. Screenshots visually reviewed: mapped buildings now visible from denser reviewed spawn.
- Full checker **incomplete**: resumed run stopped after sustained resource pressure (owned wrapper/compiler only; exit -1). Tiny diagnostic reproductions confirm original ES-only fetch and Worker TextDecoder option-context issues and JS fixture implicit-any; whole token import graph exhausts a default ~4 GiB heap. Exact scope/commands and limitations in `docs/wukari/evidence/phase7-types.json`; no full-project pass, suppressed failure or changed baseline claimed.
- Resource contention also caused one interrupted selection run and two intermediate wrapper timeouts; selection was regenerated completely, hashes/inventory checked, and same focused tests pass after contention ended. No national source or importer was touched.
- Deliverables: `docs/wukari/PHASE7.md`, source registry/data offer, per-ID generated inventory, actual desktop/mobile/FUW-map screenshots, browser evidence and type investigation. Source counts: town 20/209; FUW vicinity 24/571. Every feature remains nearby/unassigned to FUW.
- Next: final browser mobile-sprint acceptance, commit, push and stacked draft against `feat/fuw-local-pbf`. Leave loopback server available; no deployment, database or branch/PR changes beyond the new draft.

## Ready for draft review

- Final browser QA passes **11 acceptance groups**, including mobile Sprint ON/OFF, touch look/release, and the actual camera-derived north bearing; zero runtime/network errors. Desktop 1440x960, mobile 390x844 and FUW source-map screenshots inspected. Actual town scene: 13 draw calls / 5652 triangles. Software-renderer FPS is recorded without a physical-phone performance claim.
- Final build passes and contains the source databases plus licence offer. Final scoped Vue/TS check clean. New datasets match generated inventory SHA-256 values. Latest actual-building collision assertion passes. Working tree changes are only owned Phase 7 source/data/docs and narrow typecheck portability fixes.
- Remote base remains exactly `f22c14d27538e67987e9e8bc1704b520231c1b95`. Branch targets `feat/fuw-local-pbf`, preserving PR #6 and all other branches. No import pipeline, national input, database, merge or deployment operation.
- Full-project checker deliberately remains an **open validation gate**; earlier interrupted/resource-limited attempts cannot certify it. Investigated findings and reproduction limits are preserved rather than suppressed.

## Published handoff

- Implemented source `7d87e09babdbf42a129521d93cb22a800a1cc2cb` pushed to `feat/wukari-playable-study`.
- **Draft/open PR #7**: https://github.com/Jabarteley/wukari-world/pull/7 . Connector confirms base `feat/fuw-local-pbf` at `f22c14d27538e67987e9e8bc1704b520231c1b95`, correct source head, draft=true and unmerged.
- Final browser acceptance includes mobile sprint toggle and passes 11 groups with zero runtime/network errors. Source/data hashes, screenshots and validation details are committed. Status: verified-local / ready-for-review; full-project typecheck remains open as explicitly documented.
- Launch `npm run wukari:play` on loopback 5196; owned dev server was left available for local review. All owned QA browser/compiler processes ended. No deployment, merge, branch deletion, database or PostgreSQL operation.
- Next work: review the draft and playtest on physical devices; independently verify access and campus extent/feature identities before enabling campus spawning or asserting ownership. Keep the demonstrated town movement separate from surveyed/public-access claims.
