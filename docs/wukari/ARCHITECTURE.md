# Architecture and audit

Phase 2 adds bounded HTTPS acquisition (`scripts/wukari/acquisition.ts`), source selection/receipts (`acquire.ts`), curated recording and offline/master-byte verification, a real administrative context view, and shared 256 m tile addressing in `src/wukari/regions.ts`. It does not add a campus navigation scene, game-city registration or multiplayer changes while FUW geometry is unavailable. See [PHASE2_CAMPUS_STATUS.md](PHASE2_CAMPUS_STATUS.md). The original audit and future integration seams below remain relevant.

Audit date: 2026-10-20. Source revision: `4d229318e67667970b157e4798c533c4b5be0fad`. The checkout calls itself Allworld / `joinallworld`; the connected fork is `Jabarteley/wukari-world`. No framework migration or global rebranding is needed for the geographic milestone.

## Existing implementation

| Component | Actual entry points | Implication for Wukari |
| --- | --- | --- |
| Browser | `src/app/`, Vue 3.5.41, Vite 7, TypeScript 6 | Keep lazy UI/game loading and download budgets |
| 3D | Three.js 0.180, `src/map3d/geo/build.ts`, `src/scene/`, `src/venue-world.ts` | Atlas triangulation/ribbons are separate from walkable venue scenes |
| Geographic frame | `src/geo/frame.ts`; `src/map3d/geo/frame.ts` compatibility export | Equirectangular sphere, 9°N standard parallel, x east/z south, 10 units/km; display projection rather than survey accuracy |
| Rules/cities | `src/game/cities/{registry,spec,specValidation}.ts`, catalogue/loaders and per-city modules | Do not add Wukari to generated catalogue until researched city requirements pass |
| Generator | `scripts/city/build-city.ts`, `scripts/city/geometry.ts`, `scripts/geo/nigeria-boundaries.ts` | Pins raw caches, checks coordinate identity/ADM membership, generates rules/content/geometry/loaders; generated/simplified coordinates are unsuitable as original evidence |
| Node host | `server/server.ts`, `scripts/dev.ts`, `ws` | Guest mode needs no keys or database; dev launcher proxies API and WebSocket through Vite |
| Persistence | ignored `.data/` | Keep local data and existing city IDs/save behavior |
| Optional Worker | `deploy/`, separately pinned `deploy/tooling/` | Not necessary for the first campus data milestone |
| Tests | Node runner, `scripts/typecheck.ts`, city/geometry/frame/scene/host tests | `npm run check` is typecheck + build + full Node suite; focused new tests live under `src/wukari/` so existing glob discovers them |

Some prose in `docs/CITIES.md` still names nine cities. Runtime smoke discovery on this revision exercised **284** cities. Use current runtime catalogue/contracts and source tests rather than assuming that prose is current.

## City generator gate

An open city requires local units, rented-home districts, public arrival/transport hubs, career venues or explicit unavailability, food/health/worship/market/recreation/home coverage, civic venues, regulars and valid activities/scenes. Research records must support place identity and coordinates. Geography must pass state/play-area/local-unit topology checks; routes must be symmetric and saved lives recoverable. Refer to `docs/CITY-RESEARCH.md` and `docs/CITIES.md`.

We do not have these verified Wukari records. Reusing generic or fictional venues as real FUW facilities would fail the product requirement even if it made the generator run. This branch therefore leaves every existing city module/catalogue and Lagos behavior untouched.

## Additive milestone

`scripts/wukari/import.ts` consumes a checksum-verified national ADM2 source and a recorded Overpass response. It selects exactly one `Wukari` / `NGA` / `ADM2` feature and retains source properties and geometry. The real path checks vertex containment against the pinned Taraba ADM1 file. It also requires the OSM checksum, retrieval timestamp and exact query. An explicitly selected closed university way may become an **OSM campus candidate**, never a legal or surveyed campus boundary. Node-only campus hits and multipolygon relations remain unresolved.

`src/wukari/geography.ts` provides pure data validation, source-coordinate preservation, OSM references, coverage and metre conversion. `Dataset.extents` always keeps LGA, town and campus separate. Only display geometry is projected. Original source bytes and provenance accompany `.cache/wukari/dataset.json`.

`src/wukari/preview/` is a separate Vue/Three.js data-inspection lab served by `scripts/wukari/preview.config.ts` on port 5194. It starts with the campus candidate when one is available, otherwise the administrative outline. It displays actual mode/extent status and attribution. No production route, game download or city ID imports this lab. A failed dataset load produces an error rather than silently substituting fake geography.

## Limits and next integration seam

Validation is structural plus pinned-source identity; it is not a complete polygon topology, legal-boundary, access or survey proof. Vertex containment does not prove every intervening segment stays inside a concave polygon. Relations are retained with member IDs but not assembled; incomplete ways are retained and counted, not connected by guessed geometry. Footprints and roads are lines, without assumed widths/heights. There is no DEM, triangulated terrain, routing, collision, avatar spawn or multiplayer in the lab.

Projection inherits the shared frame’s fixed 9°N standard parallel and scale distortion; reversible numeric conversion does not establish geodetic accuracy. Keep Float64/JavaScript numbers and raw WGS84 until local rendering. Do not quantise the source to the existing atlas grid. Later introduce a reviewed campus coordinate frame if scale error is material, while retaining a tested bridge to the atlas.

Next: verify actual campus sources; implement tested OSM multipolygon assembly if required, campus coverage and navigation. Then adapt a walkable campus scene behind an isolated development route using the existing movement/server contracts. Town tile streaming, LOD, batched meshes and multiplayer visibility budgets follow a measured campus slice, rather than loading a national dataset into the browser.
