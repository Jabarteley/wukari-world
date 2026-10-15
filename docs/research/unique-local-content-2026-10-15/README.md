# Bespoke missions, stories and journeys

This work is incomplete. The target is 284 supported cities and 243 game country/territory identities, with 568 new tales, 1,704 mission definitions and 243 country arc profiles. Counts describe the game's catalogue, not a claim about sovereign states.

## Current state

| Gate | Evidence |
| --- | --- |
| Published to main | `81a94cbb`: batches 01–04, 145 cities, 104 identities, 290 tales, 870 missions |
| Next committed milestone | Batches 01–06 accepted locally: 215 cities, 174 identities, 430 tales, 1,290 missions; publication checks pending |
| Live production | Last observed health reported `joinallworld-ac94fca06702c1c86dd37fc3b71`, released independently by the other computer. This content task has not deployed. |
| Remaining authors | Sol authors own batches 07 and 08, covering the remaining 69 cities. These drafts are unregistered. A Luna audit covered 82 middle-range matrix plots without proving a contradiction; that is not full source acceptance. |
| Usage limit | Last checked: 94% used, 6% remaining. Stop every worker and all task work at 95% used / 5% remaining. Re-read the live tool. |

Cities outside accepted batches keep their existing playable stories and missions. Country arcs activate only when every assigned city in that country is present. Incremental acceptance must never be called complete worldwide bespoke coverage.

## What makes the content different

Each city has two literal authored tales with different conflicts, constraints, decisions, callbacks, endings and keepsakes. Its country tale belongs to a separate country arc and collection. Each tale identifies its strongest human desire: belonging, competence, autonomy, curiosity, recognition, care, fairness or continuity. These describe individual fictional situations, never national character.

Stories are original game fiction anchored to existing registered hosts, places and activities. They do not claim verified history, real events, services or physical world changes. The actual activity proves the player's effort; an authored decision resolves the fictional event. An AI response cannot invent proof or grant a reward. Practical, observation and host/fallback approaches and a solo finale remain available.

Six missions per city supply daily and weekly life/discovery/social options. Labels describe observable actions and actual places/counts. Fictional motivation belongs in purpose text. People tasks count distinct game regulars; places tasks count any distinct eligible venues. Neither proves interaction with imaginary performers or props.

The daily deal guarantees a rotating authored category while preserving variety, three slots, a free swap and generic fallback when an authored ID is blocked by a pending reward. Weekly deals prefer authored tasks. Reward amounts, trusted origins and human-day exclusions are unchanged.

## Evidence and its limits

The 145-city working tree was subsequently committed as `84679997`. Reports retain their original dirty-tree provenance; they were not relabeled as a clean-commit run.

| Check | Result | Artifact |
| --- | --- | --- |
| Structural, grounding and exact uniqueness | 145 cities, 104 identities, 290 tales, 870 missions; zero errors | `batches-01-04-validation.json` |
| Scripted engine paths | 1,450 paths across 290 tales; work/study/help, night activity fallback, both finales, prerequisites, wrong place, missing proof, reload, duplicate grants and assistance | `engine-acceptance.json` |
| Daily mission dealing | 17,400 deals; variety, free swaps and excluded-ID fallback pass | `mission-acceptance.json` |
| Retired mission rewards | 144 old rollover claims survive reload and pay exactly once | `mission-acceptance.json` |
| Legacy achievements | All 568 exact old mementos and 527 completed old city/country collections remain; Akoka remains separate | `engine-acceptance.json` |
| Agent integration after 145 activation | 111 existing mission, agent API, registry, house desk/errand, resident and creator cases pass | `/tmp/allworld-unique-145-agent-check.log` |
| Published 75-city CI | Green on `2f02124f`; main `4fd4a1b7` adds only release-status documentation | [CI 38670494623](https://github.com/kromate/joinallworld/actions/runs/38670494623) |
| 145-city CI before latest main merge | Green on `84679997`; does not cover the subsequent Phase 14 merge | [CI 38671975290](https://github.com/kromate/joinallworld/actions/runs/38671975290) |

The probes inject registered proof event shapes. They establish engine behavior, not real activity execution or browser completion. Structural uniqueness also does not prove distinct plots: sampled semantic review rejected shared templates, prop swaps, unsupported labels and arithmetic errors before activation.

The published post-merge build passes five-project typecheck, production build, all 284 city download budgets, 17 smoke checks and release policy. Startup is 598,857 raw / 217,377 gzip / 190,915 Brotli bytes. Loading JavaScript is 90,504 raw / 35,243 gzip; shared scene is 184,134 raw / 69,586 gzip. Budgets were not raised. The lazy progression chunk is 578.63 kB raw / 139.09 kB gzip. These figures belong to the 75-city CI, until the next build supplies new measurements. Broad Node, Worker and UI suites were skipped in that fast workflow.

## Actual browser evidence

An isolated `LocalTalesQA` character completed Nairobi's **The Trays for the Wrong Roles** through a free meal, return to Uhuru Park, quiet-evening activity, authored dilemma and solo finale. **Gesture tray token** survived browser reload and the 145-city expansion. A separate MoscowTalesQA life shows Moscow’s two distinct tales and Russia’s Soft-Block Paths collection; its setup correctly shows Russia. Moscow’s The Ribbon Under the Arch also completed through actual arboretum and Brateevo Look around activities, the authored under-arch decision and solo finale, earning Under-arch ribbon clasp. Nairobi reload continuity and Moscow completion are separate checks. Kenya's distinct arc and Nairobi collection render. Existing Jolly Tunde progress was preserved.

Screenshots: `ui-nairobi-earned.png`, `ui-nairobi-earned-145.png`, `ui-nairobi-country.png`, `ui-moscow-earned-145.png`, and `ui-country-collection-375.png`.

UI fixes include actual country grouping (Nairobi → Kenya, Tokyo → Japan), concise home copy instead of provenance text, singular district grammar, visible exact-story-spot guidance for disabled choices, and native disclosure for collections larger than six keepsakes. The 375px collection capture was visually verified; 320px DOM measurements show no overflow, but screenshot scaling at that size was inconclusive. No physical-device claim is made.

The preview sometimes remains on its loading screen after a development backend restart. One normal reload recovered the saved QA life; Start fresh was not used. This is not evidence of a production loading failure.

## Reproduce and continue

1. Read `AUTHORING.md`, `assignments.json`, the assigned `input-NN.json`, `src/types/local-tales.ts`, and the relevant worker record.
2. Review each conflict → constraint → decision/resolution matrix before expanding prose. Check logic and arithmetic, not just wording. Keep every source checkpoint strict-type-valid.
3. Run `node --experimental-strip-types scripts/city/check-local-tales.ts <explicit accepted batch paths> --output <report.json>`. Never include archived `.ts.txt` snapshots.
4. Run isolated strict TypeScript validation before registration. The parent alone edits `src/game/content/local-tales.ts` and accepts complete whole-country batches.
5. Recheck engine/save/mission compatibility and representative browser behavior. Temporary parent probe sources are `/tmp/allworld-unique-progression-acceptance.ts` and `/tmp/allworld-unique-mission-proof.ts`; their methods and results are described above. No new tracked tests were added.
6. Fetch released main before publication, preserve agent-play changes, run branch CI, and push main only after checks. Do not merge unreleased programme branches automatically. Deployment is a separate gate.

Portable inputs include the audited 284-city brief, its 826 guide snippets and 26 documented guide gaps; whole-country assignments; a synthetic legacy save; and the original engine baseline. `draft-batches/` preserves incomplete/rejected work outside compilation. Its old ownership notes are historical.

Coordinator: `docs/agent-work/unique-local-content-20261015.md`. Shared index: `docs/AGENT-COORDINATION.md`. Current records: `local-tales-05-quality-20261015.md`, `local-tales-06-quality-20261015.md`, and `local-tales-07-outline-20261015-r2.md` (rejected outline). The other computer owns the world-alive programme in `AGENT.md` and `docs/agent-plans/world-alive/STATUS.md`. Per-worker tokens and monetary cost are unknown.

Combined CI38673086751 passed on `6198fe21`, including the other computer’s released Phase 14 work. Main `81a94cbb` additionally merges release-status documentation. No deployment was performed here.

The current 215-city reports supersede the 145-city probe totals in the historical table: 2,150 engine paths, 25,800 daily deals, 214 legacy rollover claims, 568 exact old keepsakes and 527 old collections pass. `batches-01-06-validation.json` reports zero structural errors. These are working-tree results; current CI is pending. Welcome copy now describes places worldwide and country/territory identities. The new 375px landing screenshot is inconclusive because browser capture scaled the content; DOM width showed no overflow. Browser binding later failed, and a temporary Chrome viewport reset remains unconfirmed. Existing player saves were not cleared.
