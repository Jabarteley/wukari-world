# Scene factory reference

This integration is in progress. The final asset index, fleet generation and acceptance gates below are still open.

The scene factory prepares deterministic city recipe data and measured GLBs offline. Runtime loading remains lazy: speculative neighbor warming imports generated city data modules and streams their exact GLBs into the browser HTTP cache without preparing or decoding a scene.

## Regional kit inputs

`scripts/scene-factory/kit-inputs.json` identifies fourteen real regional GLBs and their measurement reports under `scripts/scene-factory/inputs/kits/`. Each contains twenty physical prop classes, at most 1,460 triangles per prop. The current kits are 140,641 to 141,446 bytes Brotli, below the unchanged 300,000-byte limit.

The current regional variation changes textile colours in three atlas cells. Geometry and the other material cells are shared. These are art palettes, not evidence of local architectural forms. Component renders and palette contact sheets are accepted for inspection inside the game; actual phone composition and the city landmark fleet remain separate gates.

Rebuild one kit with installed Node dependencies, Blender and `cwebp`:

```sh
node --experimental-strip-types scripts/scene-factory/assets.ts build \
  --kind kit --id gulf-guinea \
  --style scripts/scene-factory/styles/gulf-guinea.json \
  --out /tmp/gulf-guinea.glb --report /tmp/gulf-guinea.json \
  --blender /path/to/blender
```

The command uses two Blender threads and validates actual packed geometry, its embedded 1K WebP atlas and byte limits before writing outputs. `assets.ts self-test` exercises malformed documents, hierarchy and provenance refusals without generating assets. Source input files are offline regeneration inputs; they are not production public URLs or an approved full-fleet asset index.

## Inputs and compiler

`scripts/scene-factory/facts.ts` extracts a `CityBriefV1` from an exact city ID and explicit region ID. Each public venue is classified as `preserve-authored`, `target-recipe`, or `exclude-home`. Source URLs, licences and file hashes are copied where present; unknown provenance stays unknown.

`scripts/scene-factory/host-scenery.json` records the measured host allowance for every current recipe target. Its values are per city and venue. It has no global, kind-level or legacy fallback, and its source-file hashes must still match before compilation.

`scripts/scene-factory/build.ts` combines one fresh brief, one measured regional kit, one measured city hero, the explicit hero venue selection, and that city's exact host map. It emits compact `CityRecipesV1` JSON plus an offline manifest. A city with no targets emits an empty recipe set and places no hero.

`scripts/scene-factory/world.ts` reconstructs all 284 briefs from current source, verifies complete region, hero, asset and host coverage, validates the actual GLB bytes against their measurement reports, and plans:

- generated briefs, recipes and per-city manifests under `scripts/scene-factory/generated/`;
- one lazy TypeScript data module per city and `src/scene/recipe/registry.generated.ts`;
- content-addressed kits and heroes under `public/assets/scene-factory/`;
- `scripts/scene-factory/generated/world-manifest.json`, which records every owned output hash and size.

The world planner requires `scripts/scene-factory/asset-index.json`. That approved full-fleet index does not exist yet, so the repository is not ready for a real whole-world build or check.

## Installation commands

- `npm run scenes:build` plans the world and atomically installs only the factory-owned paths. It refuses foreign or changed files, removes only verified obsolete outputs, and writes the world manifest last.
- `npm run scenes:check` rebuilds the plan in memory and compares the installed inventory and bytes without creating files or temporary directories.

Both commands run Node with a 512 MiB heap limit. `prebuild` runs `scenes:check`, so an ordinary application build cannot proceed with missing or stale generated scene outputs. Do not treat a failed check caused by the missing asset index as production evidence, and do not run `scenes:build` until the fleet selection is approved.

## Runtime boundary

`src/scene/city-scenes.ts` loads authored city parts first. It then imports `src/scene/recipe/load.ts` only for a playable city's generated recipe part. `loadRecipePart` imports that city's registry entry, validates the pack and target classification, prepares its measured assets, and compiles the venue definitions. A failed load is not remembered, so normal navigation retries it.

After the first scene and the existing UI preloads are ready, `src/app/state/idlePreload.ts` lazily starts `src/scene/recipe/prefetch.ts`. For open links from the current city, it imports one neighboring data module per idle turn and consumes the exact content-addressed GLBs into the same-origin browser cache. It stops speculative work on Light mode, Save-Data, 2G and slow-2G, discards stale queues when the current city changes, and never decodes images, textures or geometry. Actual venue loading still performs the authoritative validation and preparation.

## Asset and runtime limits

`scripts/scene-factory/assets.ts` validates GLB structure, measurement identity, required nodes, geometry and byte ceilings. A regional kit contains the required 20 prop nodes and one 1,024×1,024 WebP atlas. Heroes have their own stricter geometry and byte bounds. Generated runtime URLs include the full asset SHA-256, matching the long-lived immutable cache policy.

`src/scene/recipe/contract.ts` caps a city recipe document at 120,000 UTF-8 bytes and validates exact target coverage, spots, placement bounds and the per-venue host allowance. `src/scene/recipe/prepare.ts` independently enforces declared raw bytes and decoded asset identity when a venue is actually loaded.

## Open acceptance gates

The compiler, runtime contract and installer have focused fixture coverage. The current host map covers 284 cities and 6,423 target venues, including an empty authored-only Lagos map. These facts do not approve the visual fleet.

Production remains blocked on:

- an approved `asset-index.json` with the final regional kits, city heroes and placement selections;
- actual phone composition and material acceptance for the regional kits, plus source-bound landmark forms and independent review of the hero fleet;
- one real 284-city build followed by a mutation-free check and exact inventory review;
- hosted bundle and download-budget evidence for the generated lazy modules and registry;
- browser journeys proving authored-scene precedence, linked-city prefetch behavior, first-load retry, disposal and representative phone performance.

No external geometry or photo reuse is implied by the factual source records. Source facts, original procedural geometry, runtime correctness and visual acceptance remain separate evidence.
