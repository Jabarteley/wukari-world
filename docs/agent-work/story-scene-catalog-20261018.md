# City scene catalogue work record

## Identity

- **Work ID:** `story-scene-catalog-20261018`
- **Owner:** Catalogue implementation
- **UTC updated:** `2026-10-18`
- **Status:** `ready-for-review`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** Browse real countries, playable cities and public venue scenes at `/county`, `/cities` and `/cities/scenes`, with truthful inspection evidence.
- **Exclusive file ownership:** `src/city-scene-catalog/**`, `county/index.html`, `cities/index.html`, `cities/scenes/index.html`, this record.
- **Input contract:** Actual city registry/network/content and normal `loadCityScenes` / `buildVenueScene` pipeline. No invented locations or uniqueness claims.
- **Output contract:** Independent static entries, lazy renderer, accessible 320/390px controls, focused model/lifecycle/coverage checks and browser evidence.
- **Dependencies:** Integration owner applies Vite and host routing hunks on Phase 2. Runtime owner controls recipe implementation. Test/server/browser execution waits for resource handback; local builds prohibited.
- **Exclusions:** All existing shared source, Desktop source, protected ports, existing preview output/actors, commits, pushes and releases.

## Repository state

- **Repo / checkout:** `/Users/anthonyakpan/work/joinallworld-story`
- **Branch:** `codex/story-core-worker-startup-fix`
- **Base:** `814440393f130fd4cb4469da96d4641db48e5aa0`
- **Dirty status:** Existing programme source/evidence drafts preserved. Catalogue files start new.
- **Port/process ownership:** None. Owner preview 5351 and heavy producer are reserved.

## Progress

- Read root instructions, current coordination index, programme work record and model-routing/technical-autopilot guidance.
- Confirmed network catalogue can list playable cities without loading city content. Scene harness is development-only and eagerly loads every scene, so new isolated entries are necessary.
- Proposed Vite three-entry hunk and Node exact nested-index mapping to integration owner. Worker nested asset behavior remains unverified.

## Immediate resume steps

1. Implement pure route/index/source model, lazy city data and disposable scene inspection renderer.
2. Prepare focused tests without executing until granted; request shared-hunk integration after source checkpoint.
3. After resource handback and built artifact, verify 320/390px actual journeys, disposal/retry and coverage.

## Release state

- **Local implementation:** active
- **Deployment:** not-requested
- **Release gate:** Source review, focused checks, hosted build/budgets and actual browser acceptance pending.

## Source and focused-check checkpoint

- New country/city/scene routes and UI are implemented in the exclusively owned paths. The network is joined to original generated country rows because `mapEntryOf` combines `cx` and `cc` into `ioa`; the catalogue preserves all 243 source country identities.
- Focused check command: `NODE_OPTIONS=--max-old-space-size=512 node --experimental-strip-types scripts/agent-slot.ts heavy -- node --experimental-strip-types --test --test-concurrency=1 src/city-scene-catalog/model.test.ts src/city-scene-catalog/lifetime.test.ts`.
- Result: **8/8 passed**, terminal exit 0, duration 2465.71425 ms. Proves 284 playable cities, 243 countries, exact public venue routes, lazy list content behavior, alias separation, retry and stale-load disposal. Heavy slot returned immediately.
- Subsequent source-only review found UNILAG uses the dedicated mapped campus in game; normal `buildVenueScene` would return a generic plaza. Integration approved a lazy catalogue-only adapter around actual `buildUnilag`. Added it without changing campus source or using player/session authority. Its area menu selects the existing mapped anchors.
- Snapshot fingerprint code moved into an independently testable module, covering actual transformed visible geometry and instance transforms while excluding names/materials/skinned actors. Added two focused checks; they have not yet run. Fingerprints remain explicitly non-certifying and session-scoped.
- Latest source has no hard-coded asset URLs or realism/production-approval claims. Existing asset style approval is paused by the programme owner.
- Remaining: latest source typecheck, campus/fingerprint checks, parent shared entry/routing integration, hosted build byte gates and native 320/390 browser evidence. No local build/minification/server/browser has run.

## Review correction and source handoff

- Parent reviewed route revision/error/disposal guards and requested three corrections: exclude static native actors from scenery fingerprints; prefer the actual reserved recipe definition over old parametric configuration; offer real city selection at bare `/cities` and `/cities/scenes` paths. All three are implemented. Actor ancestry uses the existing `characterFoundation === 'native53'` and `canonicalCharacter === true` markers. Recipe detection uses `citySceneDef(cityId, 'recipe:' + venue.id, '')` after city scene loading, confirmed with the runtime owner. It claims recipe selection only.
- Fingerprint text now says material colours and texture pixels are not hashed, while sign geometry can affect the snapshot. Hash collisions, visibility and asynchronous asset changes remain explicit limitations; no scene is labelled unique.
- Expanded focused command: `NODE_OPTIONS=--max-old-space-size=512 node --experimental-strip-types scripts/agent-slot.ts heavy -- node --experimental-strip-types --test --test-concurrency=1 src/city-scene-catalog/model.test.ts src/city-scene-catalog/lifetime.test.ts src/city-scene-catalog/fingerprint.test.ts src/city-scene-catalog/campus.test.ts`.
- Initial expanded result: 13/14 passed. The new recipe-priority test incorrectly assumed Accra had a parametric design. Source inspection identified formula-city Abakaliki as the correct real-content input. This was a test-input error, not a runtime failure. The corrected model slice passed 8/8 in 1003.389417 ms; the unchanged campus, fingerprint and lifecycle slices provide the other six passes. **All 14 distinct cases pass.** Logs: `/tmp/story-scene-catalog-focused-corrected.log` (retains failure), `/tmp/story-scene-catalog-model-corrected.log`.
- Coverage diagnostic: **284 playable cities, 243 source country identities, 6,572 public venues**. Private-home and city-restricted venue filtering is explicitly tested.
- First normal typecheck reported three owned type errors and four factory draft errors. Owned tuple/comparison errors were corrected; integration owner corrected the factory file. No other owner's source was edited here.
- Corrected check: `NODE_OPTIONS=--max-old-space-size=3584 node --experimental-strip-types scripts/agent-slot.ts heavy -- npm run typecheck` → **5 projects, 0 errors, 0 baselined**, terminal exit 0. Log `/tmp/story-scene-catalog-typecheck-corrected.log`. Heavy slot returned to integration owner.
- Exact source manifest: `/tmp/story-scene-catalog-source.sha256`; manifest SHA-256 `c0b3cc4e514459006b3d267c2c38b420daa7182a632f0c0f8982c10b56a40bdc`. Includes all 14 module/style/test files and three HTML entries. These source files were frozen during the successful compiler run.
- Existing game entry and shared Vite/Node/Worker files remain untouched by this work. No local application build/minification, server or browser was run. No commits, pushes, releases or player mutations occurred.
- **Next executable step:** integration owner applies the three Vite inputs and exact static host route mapping, produces the hosted artifact with unchanged startup/scene-host budgets, then grants a new output/port and browser session for actual 320/390px journeys, reload/disposal observation and unaltered screenshots.
