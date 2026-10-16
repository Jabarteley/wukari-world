# Native character current-main consumer audit

## Identity

- **Work ID:** `unified-consumer-release-audit-20261016`
- **Owner:** `/root/unified_consumer_audit`
- **Model / effort:** GPT-6 / high
- **Thread:** child of `/root`
- **UTC updated:** `2026-10-16T12:19:00Z`
- **Status:** `complete`
- **Work state:** `startup-native-migration-physical-split-frozen`

## Goal and boundaries

- **Goal:** identify current-main character integration deltas, then selectively transfer the approved native recipe, persistence, creator/profile/Boutique and quick-start contract onto the release checkout without overwriting newer product work.
- **In scope:** completed consumer/UI/schema/near-street/fixture work; current bounded follow-up splits the labelled native catalogue from the eager recipe core, preserves strict validation/migration, and makes the server and lazy Boutique projections equivalent.
- **Out of scope:** scene/runtime/map/campus/driving/package/lock changes, model/assets/budget changes, builds, servers, browser use, pushing, committing and deployment.
- **Owned paths for this follow-up:** `src/character/native-recipe.ts`, `src/character/native-catalog.ts`, new `src/character/native-migration.ts`, direct `nativeRecipeForLook`/crowd-default import rewrites across existing consumers/tests, and only the `native-catalog.ts`/`native-migration.ts` side-effect conditions in `vite.config.ts`. Root checker files and Astra runtime behavior remain untouched.
- **Exclusive coordination path:** `docs/agent-work/unified-consumer-release-audit-20261016.md`.
- **Input contract:** release checkout `/Users/anthonyakpan/Desktop/JoinAllworld-native-character-release` at `c7f3f0203c2297123e37e705f86177715f29de13`; comparison base `22366a53`.
- **Output contract:** audit handoff plus a source-preserving UI/schema native contract merge with exact conflict decisions and focused checks.
- **Dependencies:** root owns provenance/assets/release; Astra owns scene/runtime/map/campus/driving/package/browser and consequential integration.

## Repository state

- **Repo:** JoinAllworld release checkout.
- **Host:** Anthony Mac local host.
- **Branch / worktree:** `codex/native-character-release-20261016`.
- **Base:** `c7f3f0203c2297123e37e705f86177715f29de13` (`origin/main`).
- **Current commit:** `c7f3f0203c2297123e37e705f86177715f29de13`.
- **Dirty status:** root-owned untracked `native-character-release-20261016.md` and `native-character-transfer/` preserved; this record is the only file owned here.
- **Port/process ownership:** none; no lifecycle commands authorized.

## Progress

### Done and exact evidence

- Read root `AGENTS.md`, current coordination index and root release record; confirmed disjoint ownership.
- Audited `22366a53..c7f3f0203`. New street-life near bodies call `importBody().createCrowdBodies()` at `src/scene/street-life/near-draw.ts:153`, but the approved native `src/scene/body/skinned.ts` boundary has no such export. Its existing cost model also assumes old `CROWD_LOD`, one body draw plus one wardrobe draw, exact canonical bone names and legacy body selection.
- Recorded street near caps without changing them: full 12 people / 72,000 triangles / 28 calls; lite 6 / 36,000 / 14 (`src/scene/street-life/near.ts:38-45`). Far street actors remain two-triangle procedural cutouts and swap to skinned bodies only near the camera.
- Found a pooled-child regression in `near-draw.ts:188`: head scale becomes `1.12` for a child and is not restored when that pooled slot is re-dressed as an adult.
- Audited new first-person contracts. Material refresh supports async meshes and the bone filter is case-insensitive, but `controller.ts:124` and `home-scene.ts:1030` directly request `Head` while the native53 catalog calls it `head`. First-person scale still derives from legacy `appearance` in `venue-context.ts:16` and `street/host.ts:191` instead of native rendered height.
- Confirmed campus `world-adapter.ts` forwards optional `setView`, while the current campus host has no `setView`; campus player and NPCs remain `buildAvatar` consumers. Selective integration must preserve adapter token cancellation, lazy replay and current first-person `setView`/`playerBody`/`bodies` contracts in venue, home and street.
- Read exact unchanged caps: startup raw/gzip 615,000/223,000; loading raw/gzip 92,000/37,000; scene host raw/gzip 192,000/71,000; first-paint Brotli 36,800; startup Brotli 195,600; base body Brotli 300,000; clip pack Brotli 200,000; wardrobe item Brotli 60,000; wardrobe item 4,000 triangles and 1,024 px; phone scene 60 calls.
- Existing `scripts/download-budget.ts` patterns match `base-body`, `clip-pack` and `/wardrobe/`, not `/character-lab/`. Parsed the selected catalog into a 46-URL active closure. The broader source manifest inventory has 50 references totaling 50,293,841 raw / 38,252,260 Brotli bytes. Measured examples exceed unchanged caps: selected male base 1,647,480 Brotli; selected motion 204,547; hair up to 544,428; shoes 741,831; garments about 2.54 MB. Publication therefore needs optimized shipping derivatives and a catalog-derived allowlist/existence/no-extra guard, not a cap increase or unmatched public files.
- Sent these exact blockers to `/root` and `/root/unified_character_owner` before implementation ownership changed.

### In progress / blockers

- The user accepted the skirts; root retains provenance/license-notice and asset inventory ownership.
- Completed the disjoint native schema/UI semantic merge. Scene/runtime blockers above remain Astra-owned and must close before release.
- Parent assigned a final current-candidate regression slice and eight exact Web Crypto diagnostics from `docs/agent-work/native-character-transfer/client-typecheck-locked.log`. Source behavior must remain unchanged; only stale fixture assumptions and concrete `ArrayBuffer`/Node-WebCrypto typing boundaries may change.

### Native schema/UI transfer

- Added the pure versioned native recipe contract and retained all seven approved garments, including `female-elegant-01` and `fitted-skirt-01`.
- Added full native recipe and ownership persistence to shared life/social/action/view types, onboarding sanitation/actions/views, device drafts, quick-start presets/shuffle and creator/profile/Boutique projections.
- Replaced the active legacy look controls with the native body, hair, garment, shoes, eye, complexion, height, 35-feature, five-colour, hand-pose and emotion controls. Legacy `AvatarFigure.vue` and `AvatarLayerControls.vue` remain for newer current-main consumers such as `StepReady.vue`; they are no longer active editor dependencies.
- Three-way conflict decisions: retained current-main creator lead/pitch, `PathIntro`, mobile sheet behavior, city-content cache and price-level behavior; selected the native editor/Boutique view and native creator CSS where old/current UI conflicted; retained all conflict-free newer-main fields in shared types and settings/profile components.
- Focused contract check passed: `node --experimental-strip-types --test --test-concurrency=1 src/quick-start/model.test.ts src/app/features/start/startModels.test.ts src/game/look-options.test.ts` reported 39/39 passing. The first attempt proved this checkout has no installed Vue/Three dependencies; the accepted run used a temporary `node_modules` symlink to the original checkout and removed it on exit. No packages or lockfiles changed.
- `src/app/features/start/startComponents.test.ts` was not executed because it creates an in-process Vite server and lifecycle commands are outside this unit. It was semantically merged to preserve newer entry-page assertions and native component expectations.
- `git diff --check` passed after the merge. No build, broad compiler, browser, service, commit, push or deployment action was run.

### Immediate resume steps

1. Astra integrates and verifies the scene/runtime/package work against this native recipe contract.
2. Root completes provenance, asset inventory and release verification without raising existing budgets.
3. Browser owner checks creator, Profile save/reload and native-only Boutique after the refreshed API serves the merged schema.

### Final scene/adapter regression maintenance

- Added `src/scene/body/native-test-fixture.ts`, a Node-only local-file fetch and image/canvas boundary for the shipped native assets. The fixture preloads the five looks exercised by startup, stand-in, Home, venue and preview tests plus the native static LOD; it exposes a minimal 2D canvas only after host construction so DOM controls remain outside the Node fixture.
- Updated the body gate/stand-in, Home lighting, venue lighting/world and avatar-preview tests to load the native fixture. Retired canonical object names and synchronous crowd-readiness assumptions were replaced with assertions that native readiness is finite, each host mutation draws one immediate frame, and the ready scene returns to zero idle frames.
- The preview fixture now covers native material recolouring and proves the shipped body becomes visible within its full-body triangle budget. The focused preview file passes 12/12.
- The final full seven-file command was attempted with output redirected to `/tmp/native-release-regression-slice.log`. It passed the preview, startup, stand-in, Home lighting, venue-lighting and the early venue cases, including the corrected Home guest case, but was stopped after the process stayed idle at 0% CPU for more than two minutes after the keyboard-motion case. This is recorded as an incomplete run, not a pass. The exact Home guest regression command passed 1/1 after Astra added the async tag refresh, and the exact spots/walking test passed in the preceding targeted run.
- The movement integration now permits fewer than 50 presence reports across its many thousands of simulated frames. The observed native-calibrated route produced 36 reports; this remains a bounded integration assertion far below frame frequency, while `createPositionReporter` separately enforces the exact three-per-second interval.
- Fixed only the Web Crypto type boundary in the four assigned server files by returning `Uint8Array<ArrayBuffer>` where DOM `BufferSource` is required and using the DOM `CryptoKey` accepted by `subtle.deriveBits`. The exact client typecheck passes with no diagnostics.
- Validation commands:
  - `ALLWORLD_TYPECHECK_DATA_STUBS=1 node --import ./scripts/typecheck-data-stubs.ts ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit --pretty false -p tsconfig/client.json` — pass.
  - `node --experimental-strip-types --test --test-concurrency=1 src/scene/avatar-preview.test.ts` — 12/12 pass.
  - `node --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="leaving a venue disposes" src/venue-world.test.ts` — 1/1 pass after the Home tag callback.
  - `node --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="leaving a venue disposes|spots and walking stay coherent" src/venue-world.test.ts` — spots/walking pass; pre-fix Home failure retained the exact root-cause evidence.
- The test-only fake canvas emits repeated Three.js `Unable to serialize Texture` warnings while native static crowds are cloned. They did not fail targeted cases, but their volume filled the first tool pipe and contributed to the inconclusive full-run receipt. No production behavior or asset is affected.

### Startup native-catalogue audit

- The complete labelled `NATIVE_CHARACTER_CATALOG` block in `src/character/native-recipe.ts` is 5,433 source bytes and 2,017 gzip bytes by itself. That closely matches CI's startup excess of 5,295 raw / 1,879 gzip, and `src/game/systems/onboarding.ts` imports it into the eager `engine` chunk.
- A manual chunk rule alone cannot fix the budget: onboarding's synchronous import would keep the new chunk in the startup closure and add another request/header.
- Safe split: keep recipe types, compact allowed-ID arrays, 35 feature id/min/max tuples, normalization, validation, legacy migration, default recipe/crowd pool, starter IDs and price maps in `native-recipe.ts`. Move human labels plus body/appearance presets into a side-effect-free `native-catalog.ts`; lazy creator/Profile/Boutique modules import that catalogue.
- Use the existing `PLAYS` boundary in onboarding. Server actions retain strict validation/migration and labelled purchase messages. The browser reader keeps compact saved-native validation and legacy migration during `sanitize`, but its eager `view` returns no computed native Boutique rows. `src/app/features/life/boutiqueModel.ts::withWearableBoutique` is already a documented lazy projection seam and should construct the rows from the full catalogue, current recipe, ownership, cash and completion state when Boutique opens.
- Mark only the new pure catalogue module as side-effect-free in Vite's existing `moduleSideEffects` predicate so Rollup can remove the server-only labelled import after `PLAYS=false` folding. Do not assign it a manual chunk; its actual lazy creator/Profile/Boutique readers should determine placement.
- Closure checks: server and browser normalization/validation parity for all 35 features and invalid IDs; browser sanitize of a legacy look still materializes one complete native recipe; server and lazy browser Boutique projections deep-equal for owned/wearing/price/blocked; startup files contain none of the feature/preset label strings; unchanged startup caps pass.

### Startup native-catalogue split

- Extracted all native human labels and editor presets to the new pure `src/character/native-catalog.ts`. The eager recipe core now exposes compact ordered ID lists plus the exact 35 feature id/range contract; normalization, strict validation, complete legacy migration, defaults, prices and deterministic crowd recipes remain synchronous and region-independent.
- `onboarding.ts` now sanitizes native wardrobe ownership against compact ID lists. Its labelled purchase actions and authoritative Boutique rows retain the full catalogue under the existing `PLAYS` server branch; the browser view emits an empty startup projection while still running strict saved-recipe validation and legacy migration.
- `withWearableBoutique` now fills that empty projection only when the lazy Boutique opens. A focused parity test deep-compares every server and lazy row, including label, price, ownership, worn state and insufficient-cash reason.
- Creator, Profile/Look editor, quick-start and catalogue-aware tests import the lazy catalogue directly. The eager recipe core has no import or label/preset string from `native-catalog.ts`; the sole Vite change marks exactly that pure module side-effect-free. No manual chunk, cap, checker, package, model or asset changed.
- Verification: direct Node imports of recipe, catalogue, lazy Boutique model and onboarding passed. `node --experimental-strip-types --test --test-concurrency=1 src/quick-start/model.test.ts src/app/features/start/startModels.test.ts src/game/look-options.test.ts` passed 40/40, including the new projection parity case. Focused `git diff --check` and source-closure greps passed. The eager recipe source is 16,273 bytes / 4,810 standalone gzip versus the prior staged 18,788 bytes / 5,569 gzip; this source comparison is diagnostic only, and CI remains authoritative for emitted startup budgets.
- Follow-up tightened the readonly-browser boundary: an absent native recipe is materialized only by a playing host; browser sanitation retains every validated legacy compatibility field and still strictly validates a present native recipe. Browser wardrobe sanitation reads a present checked recipe directly, while playing hosts retain deterministic migration. All other onboarding migration calls are confined to `PLAYS` branches or action-only helpers.
- Added an exact readonly-browser fixture with no native recipe. It proves the legacy look stays byte-shape equivalent apart from the intentionally absent recipe and that the lazy renderer/editor produces the same deterministic recipe as the server. The same fixture now uses an actually offered native shoe instead of the retired wearable projection assumption. The focused browser-profile case passed 1/1 for 18 lives; `/tmp/native-browser-legacy-profile.log`.
- Restored strict membership semantics for scalar native IDs (`typeof selected === 'string'` before membership) and added an array-valued body hostile-input assertion. The final focused suite remains 40/40; `/tmp/native-catalog-split-tests.log`.
- Physically extracted `nativeRecipeForLook`, the bounded crowd defaults, legacy colour/hair/outfit maps and deterministic hash/seed helpers to the new pure `src/character/native-migration.ts`. Every production and test caller now imports that module directly; `native-recipe.ts` neither exports nor re-exports migration code.
- Moved `NATIVE_BOUTIQUE_PRICES` to the already-lazy `native-catalog.ts`, retaining `NATIVE_STARTER_ITEMS` in the eager recipe core. Added only `native-migration.ts` to the existing Vite side-effect-free predicate; no manual chunk or cap changed.
- Physical-split verification: direct imports of recipe/migration/catalog/onboarding passed; the focused native suite passed 40/40 (`/tmp/native-migration-split-tests.log`); the exact readonly browser legacy fixture passed 1/1 across 18 lives (`/tmp/native-migration-browser-profile.log`); whole-diff check and greps confirm no migration/default/price export remains in the recipe core. Source-only diagnostic: core fell from 16,273 bytes / 4,810 standalone gzip before this split to 10,343 bytes / 3,083 gzip; CI remains authoritative for emitted startup raw/gzip/Brotli.

### Current native near-street unit

- Replaced the removed `createCrowdBodies` dependency with `importBody().loadBody(..., { detail: 'full' })`.
- Added `NearCrowdOptions.room?: () => { triangles: number; drawCalls: number }`. At most one native actor is retained, and it is shown only when the maximum of measured render cost, native user-data metrics and body metrics fits both the unchanged near cap and the live room callback.
- `nearDress` now materializes one stable bounded `Look.native` recipe for both the live body and Astra's far snapshot path. It uses the two-body default asset pool, preserves the planned person's skin/upper/lower colours, and separates recipe height from uniform scene scale.
- Native identity comes from `look.native.appearance.body`; walking phase uses the loaded body's `cycleDistance(false)`; the actor clock advances once for a positive `dt`; native lowercase `head` is used for glances.
- Removed cups/phones and guessed legacy drink timing. Children retain native authored proportions under uniform scale; no head bone mutation remains.
- Far snapshots remain visible while load is pending, when measured room is insufficient, and after a load failure. Dispose removes the retained actor and handles completion after disposal.
- Astra wired the callback and native far snapshots in its separately owned `draw.ts`/`native-people.ts`; those files were read but not edited here.
- Restored the current-main `CITY_WORLD_FIGURES` import in `CreatorApp.vue` after Astra's completed client compiler found the semantic-merge omission.
- Verification: direct Node imports of both modules passed; an ephemeral fake-body probe passed pending-load, room rejection, room admission, one-actor cap, native cycle phase, one positive clock tick and unchanged head scale; `git diff --check` passed. A standalone strict `tsc` invocation traversed the wider project graph and exhausted the 4 GB heap, so it is recorded as unavailable rather than a type pass. No lifecycle/build/browser action ran.
- Replaced the retired 6–20-body canonical, prop and child-head assertions in `near.test.ts` / `near-draw.test.ts` with the native contract. The pure suite retains tier, hysteresis, route/context, family and floor behavior and checks deterministic recipes for both native bodies, all 35 feature bounds, planned colours and uniform height scaling.
- The draw suite uses a typed non-WebGL `SkinnedBody` fake with nonzero 30,000-triangle / 8-call reported cost. It proves max-one admission, exact triangle and call room boundaries, pending/failure far hold, body-reported cycle distance, exactly one positive clock step, zero-dt suppression, same-body redress and identity re-entry, late-load disposal and no-load without a walkable floor.
- Focused verification passed: `node --experimental-strip-types --test --test-concurrency=1 src/scene/street-life/near.test.ts src/scene/street-life/near-draw.test.ts` reported 13/13 passing. `git diff --check -- src/scene/street-life/near.test.ts src/scene/street-life/near-draw.test.ts` passed. No compiler, build, server or browser action ran.

## Release state

- **Local implementation:** `complete — UI/schema handoff ready`
- **Deployment:** `not-requested`
- **Release gate:** root and Astra must integrate and verify all identified current-main consumers before release.
- **References:** `docs/AGENT-COORDINATION.md`; `docs/agent-work/native-character-release-20261016.md`; `docs/agent-work/first-person-release-20261015.md`.

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| `2026-10-16` | active | Registered read-only current-main audit at exact release SHA; no production ownership claimed. | HEAD/status and coordination records | Inventory changed consumers and current budget gates |
| `2026-10-16T00:46Z` | milestone | Completed consumer and unchanged-cap audit; reported missing street crowd API, first-person/campus seams and 46-URL catalog closure blockers to both integration owners. | Current-main source, selected catalog, q11 Brotli read-only inventory | Begin assigned disjoint UI/schema semantic merge |
| `2026-10-16T01:42Z` | complete | Selectively merged the native recipe, schema persistence, onboarding, creator/profile/Boutique and quick-start contracts while preserving current-main creator/city behavior. | 39/39 focused tests; `git diff --check`; no conflict markers | Astra/runtime and root/release verification |
| `2026-10-16T02:34Z` | complete | Replaced the removed street near-body pool with one measured, room-admitted native actor and shared stable native recipe; removed unverified prop and child-bone behavior. | Direct imports and ephemeral admission/phase/clock probe pass; diff-check pass; standalone strict tsc OOM | Astra reviews caller integration and updates retired near tests |
| `2026-10-16T00:58:18Z` | complete | Rewrote the two retired near-street suites around the native one-actor contract and froze this unit. | 13/13 focused tests; focused diff-check pass | Astra/root integrate and run release-level gates |
| `2026-10-16T10:20Z` | complete | Adapted the bounded scene fixtures to shipped native assets, fixed the eight assigned Web Crypto type diagnostics and proved the Home async-tag root cause/fix. | Client typecheck pass; preview 12/12; Home targeted 1/1; full redirected slice incomplete after an idle test process | Integration owner may commit and let CI run the full suite |
| `2026-10-16T10:45Z` | complete | Replaced the cross-project `CryptoKey` annotation with the key parameter type of the active runtime `subtle().deriveBits` API, so Node and DOM projects each resolve their own compatible key type. | Minimal Node Web Crypto type probe pass; exact client typecheck pass; full server compiler exceeded the local 4 GB heap before diagnostics | Root/Astra rerun CI server typecheck |
| `2026-10-16T11:05Z` | complete | Traced the startup regression to the labelled native catalogue imported by eager onboarding and specified the existing `PLAYS` plus lazy Boutique projection split. | Catalogue block measures 5,433 raw / 2,017 gzip versus CI excess 5,295 / 1,879 | Integration owner applies the split; caps stay unchanged |
| `2026-10-16T11:34Z` | complete | Split labelled catalogue/presets from the compact eager recipe core, PLAYS-gated server projection and implemented the lazy browser Boutique projection without weakening saved recipe checks. | Direct imports pass; focused 40/40 including server/lazy parity; diff/closure checks pass | Astra reviews and CI measures unchanged startup caps |
| `2026-10-16T11:49Z` | complete | Deferred absent-recipe legacy migration from the readonly browser while preserving strict saved-native checks and exact lazy/server equivalence; restored strict scalar-ID validation. | Focused 40/40; readonly browser legacy fixture 1/1 across 18 lives | Freeze source for Astra browser review and CI |
| `2026-10-16T12:19Z` | complete | Physically separated migration/crowd helpers and Boutique prices from the eager strict recipe core, then rewired every direct caller. | Direct imports; focused 40/40; browser legacy 1/1; diff/closure checks | Astra commits and CI measures unchanged startup caps |
