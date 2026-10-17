# Story Mode programme work record

## Identity

- **Work ID:** `story-mode-20261017`
- **Owner:** Story programme integration
- **Thread:** `01a14bf1-fd6d-7de1-9770-a0c22f5d554a`
- **UTC updated:** `2026-10-17T23:16:11Z`
- **Status:** `active`
- **Work state:** `implementation`

## Goal and boundaries

Deliver four independently reviewed and released phases of Story Mode for `kromate/joinallworld`, preserving free roam and shipping `storyMode` off by default. The owner explicitly authorizes source, tests, branches, commits, pushes, PR merges and production deployment. Section 0b of the supplied Story mode programme plan overrides the older start-choice and `open` mode text.

- **Exact checkout:** `/Users/anthonyakpan/work/joinallworld-story`, outside Desktop and iCloud.
- **Production:** `https://joinallworld.com`, existing Cloudflare release workflow and account bindings only.
- **Branches:** `story/phase1-core`, then `story/phase2-scenes`, `story/phase3-talk`, `story/phase4-realism`, each from new main after the preceding merge.
- **Excluded:** all writes, resets, stashes and deployments from `/Users/anthonyakpan/Desktop/JoinAllworld`; ports 5173, 5174 and 5180; other owners' uncommitted work; security weakening; production/customer data deletion; new providers or plans. Factory drafts and GPU usage have an aggregate US$200 ceiling.
- **Exclusive paths:** `src/story/**`, `src/types/story.ts`, `src/scene/recipe/**`, `server/story/**`, `src/app/features/story/**`, `scripts/scene-factory/**`, `scripts/talk-factory/**`, per-city generated recipe/talk data, `docs/STORY-MODE.md`, `docs/SCENE-FACTORY.md`, `docs/TALK-BANKS.md`, this record and its evidence directory.
- **Shared integration hunks:** progression registration/slices, type maps, estate/social/homeward/travel/episodes/missions, server life/routes/settings/erasure, Passport/Home, map regions/info, idle preload, Vite chunk rules, reference docs and additive budget entries. One writer per shared file; integration owns these hunks.
- **Dependencies:** active `world-npc-programme-20261016` remains read-only. No edits to its scene performance, street, house, model, call, audio, community or attribution paths. Recipe work uses the explicitly allowed scene registry seams. The house cast hook and router purpose wait for that owner to complete. `src/spaces/**`, `server/spaces/**`, `skills/**`, `src/arena/lite/**` are excluded.
- **Input:** supplied plan and four research notes read; current main and live health independently verified. The NPC work record and procedural-city plan are unpublished on main and were read from Desktop as coordination documents only.

## Repository state

- **Base:** `c42aeee66e0fbc60e85cb808d8d2ec263a7ac4d4`; first pushed candidate `5e65bafdb13411beae3fc0ccb41a4df93b259b20`. New upstream `5080567b` discovered; integrate before next push.
- **Branch:** `story/phase1-core`
- **Initial dirty status:** clean.
- **Resources:** task-owned QA Vite5351/API5352 using `/tmp/story-qa-server-20261017.mts`, `.data-story-qa/` (local Git exclusion), current exec45755. Existing open-dev clock persists through restart. Protected listeners untouched. Detached read-only baseline worktree `/Users/anthonyakpan/work/joinallworld-story-baseline` at the base, for comparison only.

## Acceptance tracker

| Phase | Required outcome and proof | Implementation | CI / merge / release | Next action |
|---|---|---|---|---|
| 1 Core | Reversible per-character free/story switch; permanent receipt-derived ladder and city tally in both modes; all four city doors and venue gate; map locks; city signatures; friends-only verified co-op with isolated helper pass, quotas, expiry, keepsake and solo path; erasure; 320/390px actual journeys | Core, map and phone UI implemented; integration checks active | Pending | Finish co-op/runtime/budget/browser gates |
| 2 Scenes | Validated distinct recipes for every non-authored venue; Blender regional kits and sourced heroes; lazy packs; regeneration/check/contact sheets; Accra/Nairobi/Tokyo/Paris phone journeys and cold-load measurements | Queued | Pending | Start after phase1 merge; reuse owner's asset pipeline |
| 3 Talk | Filtered per-city/per-NPC banks and sourced beta phrasebooks; deterministic greet/hours/directions; capped safe live path; cost/zero-call ledger and three-city browser evidence | Queued | Pending | Build adapters outside owned house/model paths |
| 4 Realism | Recipe sky/material/lighting pass and mapped-street chapter3 entry; phone budgets and full return journey | Queued | Pending | Coordinate allowed seam after phase2 |

No phase is accepted from a worker report, passing build or release receipt alone. Each phase needs typecheck, focused tests, allCities/city-scenes suites, unchanged download budgets, phone browser journey, green CI, PR merge, release and active-build live check.

## Progress and decisions

- Verified live health and successful main CI39072013954 at the base. Exact bytes in [baseline.json](story-mode-evidence-20261017/baseline.json): startup 614418 raw / 222613 gzip / 195490 Brotli, scene host 188923 raw / 70912 gzip. Spare startup Brotli110B and scene-host gzip88B require lazy implementations. No budget may rise.
- Two bounded read-only source/research units completed or running, with integration responsible for acceptance. Worker token/spend totals are unavailable; factory spend is US$0. No interactive browser work delegated to routine workers.
- Permanent tale receipts and collections are the progression source. Daily/weekly grants expire; a new city-qualified tally must preserve mission and venue proofs in both modes.
- Candidate ladder pitfall under review: a city collection may contain exactly the two tale receipts, so chapter4 must be evaluated after prior mission/venue requirements and retain a meaningful Roots co-op or longer solo path. No independent stored chapter counter.
- Feature availability is not part of the regular session payload today. The server must own the flag and action authority; the lazy story UI must not invent a client flag.
- Player data erasure must explicitly include any new co-op collection and cross-player help references before shipping. Character-owned story state disappears with its life.
- Tests and documentation are explicitly requested. No new attribution trailers, generation labels or model names in changed source comments, docs, commits or PRs.

## Owner questions and working answers

1. Offer discovery after the first tale, with Passport and Home access; keep initial mode free.
2. Permit the first switch in every already-open current city, as section0b specifies.
3. US$200 aggregate factory cap is supplied by this task. Prefer deterministic layouts, procedural assets and existing human-authored source text before spending.
4. Native-language review ownership is unassigned. Keep extracted phrasebooks labelled beta until a named fluent reviewer accepts them.

## Immediate resume steps

1. Inspect source/worker design reports and finalize the StoryState and gate contracts.
2. Register the new lazy system and a narrow authoritative server flag; implement pure ladder/slots/signatures with tests.
3. Assign disjoint core and UI ownership, integrate server co-op, then run the named local/CI/browser gates.

## Release state

- **Local implementation:** Story core, reversible switch, authoritative capability, map locks and lazy co-op UI implemented; focused integration tests active. First candidate pushed; no PR, merge or release yet.
- **Deployment:** authorized, not started.
- **Gate:** all four tracker rows remain open.

## Checkpoint history

| UTC | Status | Evidence | Next step |
|---|---|---|---|
| `2026-10-17T22:28:23Z` | active | Clean isolated clone, exact main/live base and CI download baseline recorded; owner exclusions checked | Implement phase1 |

## Integration checkpoint 2026-10-17T22:49:47Z

- New Story slice is additive and declared by the lazy progression system. The host advertises an ephemeral capability from the admin setting, default false. Existing capability freshness machinery scopes it to the accepted actor, city and connection; it is never persisted.
- A single registry `action.block` modifier protects relocate, friend join, homeward, travel and street-door dispatch. This replaces eager imports into each handler and preserves one policy in the lazy progression pack. `settleCity` retains the existing active-character city check, so an arbitrary GET cannot create a bypass life.
- Canonical collections completed before Story tracking immediately grant legacy chapter4 because old mission occurrence histories cannot be recovered. Later completion follows the ordered tale/mission/venue gates and Roots help or two extra missions. No stored chapter or unlocked-city counter exists.
- Co-op persists a bounded friends-only session book; each write uses the existing exact-client-ID receipt transaction. Two authored answers, a two-seat memory table against the house, and a newly earned local mission grant are verified on the server. Calls are capped at3/day and passes at30minutes.
- Errands allow public venues in the host city, require a return to the challenge to hand in, suppress the helper's own tale and Story tally, and record the host's mission occurrence once. Other help is venue-bound. The return city/venue/spot is preserved; an in-progress timed action defers return until it finishes. New references are wired into permanent erasure.
- Core/map focused checks21/21 and atlas51/51 passed. Added all-city Story loop passed for all284 cities, with no terminal city. Co-op route tests4/4 passed; the first combined run had one incorrect test assumption that `stop()` clears capabilities (it only pauses polling); corrected the test to use reconnect/offline invalidation. Full typecheck is running.
- First typecheck exposed new contract mismatches; corrected the client interface, Story optional field lists/readers, notification metadata and discriminated errand projection. No baseline suppressions or budgets changed.
- No application server running yet. Phase2 asset work has completed read-only pipeline preparation; no paid factory calls or GPU usage. Factory spend US$0 so far.
- Next executable step: complete typecheck and focused co-op positive/expiry/door checks, run all-city/scene suites, then start isolated local QA above5300 and capture320/390px journeys. Build and exact-byte proof remain on CI.

## Integration checkpoint 2026-10-17T23:16:11Z

- First hosted CI39077025901 built successfully but rejected three contract errors and startup bytes616442raw/223210gzip/195869Brotli, above unchanged caps615000/223000/195600. Contract errors are fixed; current full typecheck passes. Refactoring the fresh-slice stand-ins reduces duplication; exact byte acceptance awaits the next hosted build. A branch-scoped three-day bundle artifact will provide actual emitted chunks for local scene-chunk verification.
- Focused core/co-op/client/UI78/78 and mission/map71/71 pass. Browser observations at320/390 prove real Kano city/country tales and2/2collection,5authored missions,6venue visits, reversible Free/Story switching, locked Kaduna/Katsina cards and distinct Nairobi content. No horizontal overflow observed. Switch samples227/275/286/274ms.
- Browser-discovered repairs: hospital scenes now open at Belong; untouched generic slots redeal authored local missions in Story, preserving partial/claimed missions and old rewards; claiming retained rewards releases the local slot. Venue travel projections and2D/3D/legacy labels now show locks; world count excludes locked regions.
- A genuine deterministic practice bargain now uses existing price negotiation rules with server authority, exact-ID retry, bounded storage and erasure. Focused unit16/16 and typecheck pass. Browser play is pending; no purchase, cash/item mutation or model calls. Arena signature links open the selected practice game, tables open the actual venue table.
- Required full allCities/city-scenes run13/15 passed, including all284 Story ladders with no terminal city. Two remaining gates: native asynchronous character reservations were measured before geometry loaded (lagos.park446532tri); the budget test is being corrected to await real local assets with the same caps. Chunk assertion awaits actual hosted bundle files. No runtime performance source or budget changed.
- QA server restarted after all actors paused, preserving ordinary UI-earned progress and local time. Clinic travel and authored redeal now pass in the browser. Remaining actual journey: sixth mission, Roots help in both forms, helper keepsake/return, chapter4 connected-city travel.
- Factory scripts remain untracked future-phase work; no Blender generation or paid calls yet, aggregate factory spendUS$0. No PR, main merge or deployment has occurred.
- Next executable step: finish browser and focused checks, commit scoped repairs, integrate current main5080567b, push and dispatch CI; repair any unchanged-cap failure before PR/release.

## Integration checkpoint 2026-10-17T23:30:26Z

- Upstream Spaces phase1 main5080567b merged, preserving both route registrations. Story candidates f967a7bb / merge2c1cffae /180bf408 pushed. CI39078623144 built and produced the exact bundle artifact; startup615539raw/223067gzip/195838Brotli still exceeds fixed caps by539/67/238B. Scene host188923raw/70912gzip is unchanged. Hosted typecheck identified the portable engine's missing structuredClone global; replaced cloning with fresh factories. Further sharing of identical getter-safe snapshot readers across progression, homeward and teaching preserves their checks and reduces eager duplication. Focused snapshot/client checks50/50 passed before fresh-factory adjustment; final check is running.
- Exact hosted JS copied into task-local ignoreddist; the formerly missing scene-chunk check now passes with the actual artifact. Required geometry test awaits native asset readiness under unchanged caps; confirmed identical baseline failure atlagos.park446532tri. Full typecheck is queued behind that task-owned heavy slot.
- Actual browser play completed distinct authored second-answer questions and two-seat memory. A moving-clock rejection was repaired by using the common settled timestamp; regression7/7 passes. Memory UI now distinguishes matched cards from recent unmatched reveals; model/route checks11/11 pass. Real persistent memory result: Team2, House0, host2turns/helper1turn; two losses and the same-invitation restart were exercised before the win.
- Helper returned to Lagos with0own missions/0venues/1city, Kano remains locked, and two permanent Kano Roots keepsakes are now visible in My Story. Keepsake UI check5/5 passed. Kano actual bargaining refused, countered, agreed and restarted. Host reached Complete with6missions/6venues and took the actual6000naira bus to Kawo Motor Park, Kaduna. Nairobi opened its real Uhuru Park chess table, sat with a free bot and exchanged moves.320/390 widths show no root overflow. A browser-control timeout after that table's Leave action remains a tooling observation; no completion of that leave is claimed.
- Unlock count275 is the existing graph, not a transitive unlock: Kano has274distinct directly linked cities, including242air routes. The plan explicitly uses open linksFrom neighbours; network scope is preserved.
- Shared transport types and all nine new HTTP keys are now registered; route/protocol/UI checks24/24 passed. No tests or budgets were weakened.
- No PR or deployment yet. Next: finish final phone reversibility, native geometry/typecheck, push the reviewed snapshot repair for hosted size proof, then the required complete city/scene run and PR/release.

## Verification checkpoint 2026-10-17T23:40:24Z

- Native geometry budget across every public scene in284cities passed in565.1s with the exact original87000tri/60draw limits and actual local native GLBs ready. The test now rejects load errors, pending characters, absent native geometry and absent skinned player geometry. A test-only canvas helper typing issue is fixed without runtime change. The required complete allCities/city-scenes run is active, followed by existing browser/full-engine parity.
- Full local typecheck passed5projects/0errors. A focused view-schema check exposed a pinned-base test omission of the already-shipped wardrobe.native field; c42aeee fails identically. The exact expected field list now includes native, and the focused view contract passes. No guard was relaxed.
- Hosted CI39079339396 on2bb7bed9 passes typecheck and policy; raw614758 andgzip222889 now pass, butBrotli195720 is120B over the unchanged195600cap. Scene host188923raw/70910gzip passes. The next candidate uses an explicit disabled Story view branch containing onlyenabled:false, avoiding fabricated chapter/signature fields and keeping full and browser projections identical. Active projection still requires every declared field; focused active/disabled/map/UI checks28/28 pass.
- Final combined focused checks116/116 passed before the disabled-view refinement. Snapshots share enumerable-data-field reads without invoking getters; fresh factories produce independent empty containers and exact empty-shape validation remains in force.
- Browser evidence is preserved underphone/. The Mac locked and supported inputs stopped working after the actual Kaduna arrival. Remaining browser gate: post-Kaduna Free/Story flip and replacement full-width390captures. Several filenames labelled390 are365px native crops; checkpoint.json explicitly identifies these and the invalid transient frame. Earlier realCSS320/390 journeys and227–286ms flips remain observed; no post-travel flip is claimed. A human unlock request is pending while source/CI work continues.
- Future-phase factual inventory covers284uniqueIDs/14proposedregions with1365candidate records across279cities. Unknown dates/licences remain blank; restricted-country review remains required. This is input preparation, not hero approval or asset generation. Factory spendUS$0.
- No PR, merge to main or deployment. Next executable steps: finish complete suites and exact byte check, resume final browser steps after unlock, then create/attach the phase1PR and release only when all gates pass.
