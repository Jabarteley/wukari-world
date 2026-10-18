# Phase 1 Story phone UI work record

## Identity

- **Work ID:** `story-ui-phase1-20261017`
- **Owner:** Story UI worker `/root/story_ui`
- **Model / effort:** delegated worker / high
- **Thread:** parent `01a14bf1-fd6d-7de1-9770-a0c22f5d554a`
- **UTC updated:** `2026-10-17T22:52:59Z`
- **Status:** `ready-for-review`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** Add a lazy, reversible Story Mode phone UI to Home, Passport, and travel surfaces, including server-authoritative friend help, without changing server authority or free-mode behavior.
- **In scope:** New `src/app/features/story/**`; focused integration hunks in Passport, Home, and the actual travel phone/card components; focused Story UI and co-op state tests; the delegated Story reference document and all-city Story acceptance loop.
- **Out of scope:** Story rules and types, flag wiring, map integration, co-op routes and persistence, start-choice/onboarding changes, builds, browser/UI verification, Git mutation, ports, release work, and all Desktop checkouts.
- **Exclusive file ownership:** `src/app/features/story/**`; focused hunks in `src/app/features/passport/PassportApp.vue`, `src/app/features/home/HomeChip.vue`, `src/app/features/travel/MapApp.vue`, and `src/app/features/travel/VenueCard.vue`; the final UI unit also owns `src/app/features/messages/messagesModel.ts`, `messagesThread.ts`, one small `MessagesApp.vue` action, and their focused tests. The documentation unit owns `docs/STORY-MODE.md`, one `docs/REFERENCE.md` link, and `src/game/cities/allCities.test.ts`.
- **Input contract:** `game.view.story` is optional during integration and, when enabled, follows the phase 1 public view contract; mode changes use only `game.command('story.mode', { mode })`.
- **Output contract:** Story UI stays absent unless `story.enabled === true`, is lazy from Home/Passport, preserves Passport tab behavior, explains chapter/next step/progress/signature, disables story-locked travel CTAs with the server reason, and renders authenticated help sessions without inferring outcomes from client taps.
- **Dependencies:** Core worker owns `src/types/story.ts` and rules; integration owner owns flag/client wiring, map, and `/api/story/help` routes. The co-op card consumes only the stable authenticated route contract supplied by the integration owner.

## Repository state

- **Repo:** `kromate/joinallworld`
- **Host:** local macOS checkout outside Desktop
- **Branch / worktree:** `story/phase1-core` at `/Users/anthonyakpan/work/joinallworld-story`
- **Base:** `c42aeee66e0fbc60e85cb808d8d2ec263a7ac4d4`
- **Current commit:** `c42aeee66e0fbc60e85cb808d8d2ec263a7ac4d4`
- **Dirty status:** Parent-owned untracked Story programme record and evidence directory only before this worker record.
- **Port/process ownership:** none; no process may be started or stopped by this worker.

## Progress

### Done and exact evidence

- Read repository coordination, Story programme record, and applicable engineering/accessibility instructions.
- Confirmed there is no `TravelApp.vue`; `MapApp.vue` is the registered phone panel and `VenueCard.vue` owns per-destination action state. Parent notified before travel edits.
- Added a guarded async Story entry to Home and a guarded async Story section to the existing Passport tab without changing tab registration or keyboard handling.
- Added Free Roam / Story Path controls, current chapter, next step, progress, city signature travel action, and city unlock list from the trusted `StoryView`.
- Added a single `storyVenueLock` policy lookup to the venue card; Story Path shows the server reason and disables travel while Free Roam retains the existing card behavior.
- Added the co-op card for authenticated invitations, three server-owned challenge kinds, daily calls, expiry, incoming chapter-zero invitations, verified mission hand-in, exact-client-ID ambiguous retry, and life refresh after session actions.
- Added public UUID query consumption that removes `storyHelp`, opens Passport Story, then sorts, highlights, and focuses only a matching session returned by the authenticated GET.
- Routed valid `visit` updates carrying `data.storyHelp` from both the phone notification list and Messages Updates into Passport Story. The UUID is only a focus request; the authenticated help response must still contain the session before the co-op card highlights or focuses it.
- Replaced internal signature kind text with product copy. Before arrival, the signature action opens the real venue on the map; at that venue it opens the registered Tables, Games, Business, Politics, or Events screen when its existing shell gate permits it.
- Focused final UI evidence passes: `node --experimental-strip-types --test --test-concurrency=1 src/app/features/models.test.ts src/app/features/messages/messagesKeys.test.ts src/app/features/story/coopModel.test.ts src/app/features/story/storyUi.test.ts` — 23 tests passed.
- Focused Story UI and state evidence passes: `node --experimental-strip-types --test --test-concurrency=1 src/app/features/story/coopModel.test.ts src/app/features/story/storyUi.test.ts` — 6 tests passed.
- Added `docs/STORY-MODE.md` for the off-by-default capability, additive state, receipt-derived ladder, shared action guard, helper isolation, verified help kinds, veteran grandfathering, solo route, lazy delivery, and acceptance boundary; linked it once from `docs/REFERENCE.md`.
- Added an all-city Story loop using canonical episode and collection receipts plus real mission/travel events. Every playable city reaches chapters 0–4, has its prerequisite and welcome venues open at chapter 0, has two extra authored mission occurrences for the solo route, and opens its connected neighbours. Focused result: 1 test passed; terminal cities: none.
- Patch whitespace check passes: `git diff --check`.

### In progress / blockers

- No worker blocker. Browser/phone layout, keyboard focus, typecheck, download budgets, CI, release, and live acceptance remain with the integration owner.

### Immediate resume steps

1. Integration owner reviews the source diff against the final route payload and runs the parent-owned typecheck and unchanged-budget gates after all server files settle.
2. Integration owner verifies 320px and 390px Story/Free toggles, Passport tab focus, Home entry, signature navigation, locked/free venue journeys, incoming invitation deep links, ambiguous retry, all three help kinds, expiry, and join/end city return in the browser.

## Release state

- **Local implementation:** `verified-local`
- **Deployment:** `not-requested`
- **Release gate:** Parent-owned typecheck, budgets, browser journeys, CI, merge, and live verification remain required.
- **References:** `docs/agent-work/story-mode-20261017.md`, `docs/AGENT-COORDINATION.md`

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| `2026-10-17T22:31:48Z` | active | Registered disjoint UI ownership and identified actual travel components | repository files and parent message | Inspect source and implement the finite UI slice |
| `2026-10-17T22:37:30Z` | ready-for-review | Lazy Home/Passport Story UI and server-owned venue lock presentation implemented; focused SSR checks passed | `src/app/features/story/storyUi.test.ts` 3/3; `git diff --check` | Parent review, typecheck, budget and browser gates |
| `2026-10-17T22:41:43Z` | ready-for-review | Server-authoritative co-op card and public UUID focus flow implemented inside the existing lazy Story panel | focused Story tests 6/6; `git diff --check` | Parent route-contract review, typecheck, budgets, and real phone/browser journeys |
| `2026-10-17T22:48:09Z` | ready-for-review | Story reference and all-city 0→4 catalogue acceptance loop added | focused all-city Story test 1/1; terminal cities none; `git diff --check` | Parent reviews wording and runs the full city shard/typecheck with the integrated Phase 1 source |
| `2026-10-17T22:51:01Z` | ready-for-review | Story invite phone/Updates routing and location-aware signature feature CTA added | focused Messages and Story tests 23/23; `git diff --check` | Parent runs integrated typecheck, budget, and browser acceptance |
| `2026-10-17T22:52:59Z` | ready-for-review | Corrected the neighbour acceptance filter to the catalogue's actual open status union | focused all-city Story test 1/1; terminal cities none; `git diff --check` | Ownership returned to integration owner for typecheck |
