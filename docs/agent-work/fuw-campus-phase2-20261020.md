# FUW campus Phase 2 work record

- Owner: Codex; active implementation, 2026-10-20.
- Repo: `Jabarteley/wukari-world`; baseline foundation SHA `f2e0dea50f4e0e2fc6075dc0290ffb4cdc1db3e1`, confirmed with `git ls-remote` and fetch. New branch `feat/fuw-campus-map`; preserve foundation branch and PR #1 unchanged.
- PR #1 reviewed through GitHub API: open, foundation -> main; synthetic foundation only, known baseline test failures.
- Owned paths: `src/wukari/`, `scripts/wukari/`, `data/wukari/`, `docs/wukari/`, this record. No changes to existing city registry or multiplayer protocols; no merge/deployment.
- Goal: acquire attributed real FUW data and build a navigable campus preview, with honest source/field/visual uncertainty and reproducible inputs.
- Initial evidence: GitHub API, geoBoundaries API and media payload now return HTTP 200. ADM2 exact expected bytes/hash verified. Geofabrik and BBBike proxy CONNECT still return 403. First nationwide university Overpass query returned 502; retry with smaller source-derived ADM2 study bounds.
- Dependencies: public source availability/coverage. No credentials requested or fabricated geography allowed.
- Resources: inherited local game 5173 and lab 5194 owned by this conversation. Prior broad baseline check was already running before Phase 2; preserve results and keep new failures separate.
- Next: acquire bounded Overpass data; record source snapshots/provenance; implement/test navigation, footprints and real-data rendering. Update this record with concrete results before handoff.

## Verified milestone / blocker checkpoint

- Pinned national ADM2 source acquired with exact original 9,422,551 bytes/SHA-256. Wukari feature `59680162B18982121994254` selected, all vertices checked against Taraba ADM1, original coordinate values retained. Curated feature is 7,764 bytes, SHA-256 `fdf3cf2421d730ca7bb0f0297b8a0b8a32058f5d95b4c1a4ced6e8c959c7a1fc`.
- Metadata and CC BY 4.0 identity/year checked against official API; raw metadata and successful receipts committed with the selected feature. National source remains in acquisition cache and can be downloaded reproducibly.
- `acquisition.ts` implements HTTPS/TLS/integrity preservation, body/time limits, bounded exponential retries, Retry-After handling, structured failure receipts and explicit endpoint selection. Proxy denials and TLS/integrity/access errors are not bypassed/retried.
- Overpass tiny query returned 502 with a capacity/queue-full explanation; bounded LGA query exhausted three timeouts. Mirror, official OSM API, institutional site, Geofabrik/BBBike and public DEM registry are proxy-denied. New mirror/API/institution domains are saved in the draft; not assumed applied. No actual FUW response or geometry obtained.
- Implemented offline source/attribution/context verifier, exact reproduction from national bytes, read-only context endpoints, filled real LGA renderer, coordinate readout/compass/source picking, and shared tile addresses for future campus/town. Campus exploration remains disabled. Old synthetic fixture/mode preserved explicitly.
- Checks: 20 Wukari tests pass; whole-project typecheck 5 projects clean; strict focused types pass; isolated preview build passes; 18 integration smoke tests pass; Chromium desktop/mobile real-context renders, source picking, no page errors/overflow, POST refusal. Screenshot paths: `docs/wukari/evidence/phase2-boundary-{desktop,mobile}.png`.
- HTTPS boundary acquire → selection → curation → national-byte verifier was repeated successfully in a separate timestamped cache directory. Failed OSM attempts are preserved, not replaced by a fabricated empty response.
- Phase 2 is **blocked/incomplete** as a campus milestone. No campus buildings, walkable roads, navigation graph, character, collision, terrain, minimap or real-campus exploration is claimed. These cannot be verified without FUW source geometry; requested tests for those behaviors are unrun, not treated as passing.
- Full broad Phase 1 `npm run check` remains incomplete and has pre-existing failures; no duplicate full serial suite launched. Existing game/city/multiplayer code, budgets, assertions, lockfile and synthetic fixtures unchanged. Added legal credit only to `NOTICE.md`.
- Handoff: `docs/wukari/PHASE2_CAMPUS_STATUS.md` and `PHASE2_ACQUISITION.md`. Prepare stacked draft from `feat/fuw-campus-map` into `feat/wukari-geographic-foundation`, preserving PR #1/main. No merge or deployment.
