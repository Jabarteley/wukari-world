# Scene factory reference

Integration is in progress. The final 284-hero, 14-kit asset index exists at `scripts/scene-factory/asset-index.json` (SHA-256 `48ea810e2833795d166605d7fadb2ff6dc0eb8667e2fd2b7f59fd76c0ee0f631`). The installed selection contains 238 corrected reviewed models (476 files), 568 backed-up original files, and 46 retained GLB/report pairs (92 files). Parent review covered all 476 front/side views; shared design families and quiet materials remain, so this is not evidence of surveyed forms, photorealism or unique visuals in every city.

The scene factory prepares deterministic city recipe data and measured GLBs offline. Runtime loading remains lazy: speculative neighbor warming imports generated city data modules and streams their exact GLBs into the browser HTTP cache without preparing or decoding a scene.

## Regional kit inputs

`scripts/scene-factory/kit-inputs.json` identifies fourteen real regional GLBs and their measurement reports under `scripts/scene-factory/inputs/kits/`. Each contains twenty physical prop classes, at most 1,460 triangles per prop. The current kits are 140,641 to 141,446 bytes Brotli, below the unchanged 300,000-byte limit.

The current regional variation changes textile colours in three atlas cells. Geometry and the other material cells are shared. These are art palettes, not evidence of local architectural forms. Component renders and palette contact sheets are accepted for inspection inside the game; actual phone composition and in-game fleet acceptance remain separate gates.

Rebuild one kit with installed Node dependencies, Blender and `cwebp`:

```sh
node --experimental-strip-types scripts/scene-factory/assets.ts build \
  --kind kit --id gulf-guinea \
  --style scripts/scene-factory/styles/gulf-guinea.json \
  --out /tmp/gulf-guinea.glb --report /tmp/gulf-guinea.json \
  --blender /path/to/blender
```

The command uses two Blender threads and validates actual packed geometry, its embedded 1K WebP atlas and byte limits before writing outputs. `assets.ts self-test` exercises malformed documents, hierarchy and provenance refusals without generating assets. Source input files are offline regeneration inputs, not production public URLs. The selected fleet is recorded in the asset index above.

## Inputs and compiler

### Physical city heroes

Every canonical row in `scripts/scene-factory/heroes.json` now declares its regional atlas. Adding this field preserved all existing source facts, licences, names and art bounds. The physical builder dispatches explicitly to market, natural-feature, retail and landmark construction. Unsupported forms fail; there is no legacy geometry fallback. These are original art fragments associated with sourced places, not surveyed replicas.

Build a hero through the same prepare and validation path as its regional kit:

```sh
node --experimental-strip-types scripts/scene-factory/assets.ts build \
  --kind hero --id tokyo \
  --heroes scripts/scene-factory/heroes.json \
  --style scripts/scene-factory/styles/east-asia.json \
  --atlas-kit scripts/scene-factory/inputs/kits/east-asia.glb \
  --out /tmp/tokyo.glb --report /tmp/tokyo.json \
  --blender /path/to/blender
```

Regional heroes require the exact canonical record, durable style and validated kit atlas. The build verifies the raw export receipt before packing; reports record the raw hash, physical source closure, canonical provenance and style hash. The world planner refuses regional hero reports without provenance or style identity. Accra uses a compatibility profile that retains the previously inspected Makola fragment exactly.

The source dispatch and provenance checks are implemented. The installed 284-city selection preserves exact canonical provenance and the original 46-pair historical source closure. Parent reviewed all 238 corrective models in front and side views; the retained pairs keep their historical verification records. This review does not establish surveyed or photorealistic construction or visual uniqueness across all cities; shared design families and restrained materials remain visible.

`scripts/scene-factory/facts.ts` extracts a `CityBriefV1` from an exact city ID and explicit region ID. Each public venue is classified as `preserve-authored`, `target-recipe`, or `exclude-home`. Source URLs, licences and file hashes are copied where present; unknown provenance stays unknown.

`scripts/scene-factory/host-scenery.json` records the measured host allowance for every current recipe target. Its values are per city and venue. It has no global, kind-level or legacy fallback, and its source-file hashes must still match before compilation.

`scripts/scene-factory/build.ts` combines one fresh brief, one measured regional kit, one measured city hero, the explicit hero venue selection, and that city's exact host map. It emits compact `CityRecipesV1` JSON plus an offline manifest. A city with no targets emits an empty recipe set and places no hero.

`scripts/scene-factory/world.ts` reconstructs all 284 briefs from current source, verifies complete region, hero, asset and host coverage, validates the actual GLB bytes against their measurement reports, and plans:

- generated briefs, recipes and per-city manifests under `scripts/scene-factory/generated/`;
- one lazy TypeScript data module per city and `src/scene/recipe/registry.generated.ts`;
- content-addressed kits and heroes under `public/assets/scene-factory/`;
- `scripts/scene-factory/generated/world-manifest.json`, which records every owned output hash and size.

The world planner requires `scripts/scene-factory/asset-index.json`. The current index supplies 284 city hero selections and fourteen regional kits. Its SHA-256 is recorded above; a hash identifies the selected inputs, not successful world installation or runtime acceptance.

## Installation commands

- `npm run scenes:build` plans the world and atomically installs only the factory-owned paths. It refuses foreign or changed files, removes only verified obsolete outputs, and writes the world manifest last.
- `npm run scenes:check` rebuilds the plan in memory and compares the installed inventory and bytes without creating files or temporary directories.

Both commands run Node with a 512 MiB heap limit. `prebuild` runs `scenes:check`, so an ordinary application build cannot proceed with missing or stale generated scene outputs. The actual world build installed 1,436 files. A fresh `scenes:check` matched all 1,436 without writing or deleting files; the current generated world manifest SHA-256 is `4142723a9742898e5ccffc9a5c7bae22f97142e37368e9fba71d818b07e3f637`.

The first actual checks exposed two integration issues. Narrow normalization for the legacy Nigerian country alias (`nigeria`/`ng`) now passes its focused 20/20 cases. A wider hero could obstruct activity; rear-band reservation now passes its actual-venue 19/19 cases. The current recorded world build and mutation-free check pass. The corrected phone-sheet fixture and full typecheck pass all five projects with zero errors in r15. Camera projection/reset13, city-scenes8, venue-world23, public-venue-budget and companion checks pass at their recorded source scopes. An earlier full all-city run passed all six logical cases; see the programme record for exact evidence. Browser and release acceptance remain separate.

The refreshed host audit covers 284 cities, 6,423 targets and 34 configurations, with zero failures and 1,223 source pins. The measured case is 1,264 triangles, seven meshes, three lights and a maximum of nine draw calls. Within-venue measured-state triangle drift is 3.2718%; the separate global cross-venue comparison is 27.78% and is not an equivalent pass condition.

## Runtime boundary

`src/scene/city-scenes.ts` loads authored city parts first. It then imports `src/scene/recipe/load.ts` only for a playable city's generated recipe part. `loadRecipePart` imports that city's registry entry, validates the pack and target classification, prepares its measured assets, and compiles the venue definitions. A failed load is not remembered, so normal navigation retries it.

After the first scene and the existing UI preloads are ready, `src/app/state/idlePreload.ts` imports `src/scene/recipe/idle.ts`. That lazy module owns the city watcher and starts the neighbor prefetcher. It selects at most three distinct open links from the current city: road or rail first, then air; nearest known distance first, with destination ID breaking ties. Only that selection is warmed, one city per idle turn, including its exact content-addressed GLBs. Repeated refreshes cannot widen the selection. This bound matters because the global flight network can link one city directly to hundreds of others. It stops speculative work on Light mode, Save-Data, 2G and slow-2G, discards stale queues when the current city changes, and never decodes images, textures or geometry. Actual venue loading still performs the authoritative validation and preparation.

Recipe cameras fit measured scenery, residents and the current player into the actual viewport and the space available above the phone controls. The lazy recipe module solves the perspective bounds; the shared host supplies its current frame through an optional callback. Authored scenes retain their existing camera path. Recentring a recipe scene refits after walking or resizing.

## Asset and runtime limits

`scripts/scene-factory/assets.ts` validates GLB structure, measurement identity, required nodes, geometry and byte ceilings. A regional kit contains the required 20 prop nodes and one 1,024×1,024 WebP atlas. Heroes have their own stricter geometry and byte bounds. Generated runtime URLs include the full asset SHA-256, matching the long-lived immutable cache policy.

`src/scene/recipe/contract.ts` caps a city recipe document at 120,000 UTF-8 bytes and validates exact target coverage, spots, placement bounds and the per-venue host allowance. `src/scene/recipe/prepare.ts` independently enforces declared raw bytes and decoded asset identity when a venue is actually loaded.

## Validation and current evidence

The compiler, runtime contract and installer have focused fixture coverage. The refreshed host map covers 284 cities and 6,423 target venues, including an empty authored-only Lagos map. The full-world build and mutation-free check pass.

Exact source `0b656f29b0b73ab294c1be15f28cd25391579386` passes [hosted CI39158588048](https://github.com/kromate/joinallworld/actions/runs/39158588048), including the strict loading-page contract, native-character integration, fixed byte limits, host acceptance, typecheck and UI checks. Largest gameplay startup is 611,375 raw / 222,083 gzip / 195,606 Brotli bytes; the shared scene host is 79,827 raw / 30,233 gzip. No budget was raised by this programme.

The isolated artifact from that source passes four-city camera-fit and pointer zoom/reset review at 320 and 390 pixels. The creator submits once and closes, linked prefetch remains bounded to three cities, and ordinary walking and return were observed. Accra additionally stops at the actual scene boundary. Eight local replays with cache disabled reach complete scene and native-player readiness within 770.3–1301.1 ms. These are desktop phone-tier observations over unthrottled local networking. Physical devices and constrained networks remain unmeasured. SaveData suppression was observed on the previous unchanged prefetch implementation; browser 2G remains inconclusive. Evidence is under `docs/agent-work/story-mode-evidence-20261017/phone/`.

A guide-bubble overflow at 320 pixels is corrected in source and awaits its own emitted-artifact check. Production release acceptance is recorded separately in the programme work record.

The reviewed front/side views do not certify phone composition or materials in game, surveyed or photorealistic forms, or visual uniqueness for every city. No external geometry or photo reuse is implied by the factual source records. Source facts and licences, original procedural geometry, runtime correctness and visual acceptance remain separate evidence.

With `?diagnostics`, the existing renderer snapshot now includes recipe runtime status and visible native-root readiness. Cold-load verification uses ready roots followed by a later natural submitted frame at the same location; an idle host without that later frame leaves the timing inconclusive.

Generated recipe cameras opt into a lazy perspective fitter. The shared host passes its existing field of view, projection shift, HUD insets and current player position; authored cameras retain their original behavior. Reset refits the current position, while normal zoom and collision handling remain available.
