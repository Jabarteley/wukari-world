# First-person acceptance and release

## Identity

- **Work ID:** `first-person-release-20261015`
- **Owner:** `/root`, first-person chat `01a13a42-b51e-7942-b5a2-32f38c198c37`
- **Model / effort:** primary session; Luna for bounded typing, Astra for integration, browser verification and release review
- **UTC updated:** `2026-10-15T13:15:06.922467+00:00`
- **Status:** `active`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** clear typecheck and download-budget blockers, complete first-person mobile/web acceptance, and deploy the verified candidate to joinallworld.com.
- **In scope:** existing first-person source, its host integration, known Street Studio typing errors, shared-scene budget reduction, browser checks, exact-source release and continuity.
- **Out of scope:** unrelated character experiments, budget increases, generated city hand edits, provider/billing/configuration changes.
- **Exclusive file ownership:** `docs/agent-work/first-person-release-20261015.md`, `docs/FIRST-PERSON-PLAN.md`, `src/scene/first-person/`, `src/scene/view-extension.ts`, `src/app/scene/SceneViewToggle.vue`, `src/app/scene/FirstPersonJourney.vue`, `src/app/features/sim/ViewSettings.vue`. Host integration edits in `src/venue-world.ts`, `src/street/host.ts`, `src/campus/unilag/world-adapter.ts`, `src/app/scene/ScenePane.vue` remain limited to this task's existing first-person hunks. No ownership of other dirty hunks is claimed.
- **Input contract:** local first-person implementation and evidence from 14 October; current upstream and owner records must be reconciled before release.
- **Output contract:** unchanged budgets, passing relevant checks, documented browser evidence and deployed source receipt.
- **Dependencies:** Luna owns typing-only edits in `scripts/street/build-studio.mjs` under its own record; Astra owns browser session and release/integration decisions. Release lock and hosted acceptance required. User explicitly requested deployment on 15 October.

## Repository state

- **Repo:** JoinAllworld, isolated release candidate; primary checkout preserved.
- **Host:** Anthony Mac; host-local candidate `/Users/anthonyakpan/.codex/worktrees/first-person-release-20261015/JoinAllworld`.
- **Branch / worktree:** `codex/first-person-release-20261015`, managed worktree explicitly approved by the user.
- **Base / current commit:** base `9af2e51eaf1cf90237c9cf24c49d0f5628ceb8b6`; scoped implementation `2c76945724a7832a163464beec7e7b5a57f74c07`. Original primary remains at `22366a53cb4ab2a147b5029f4e2f5a2b1d3a192d`.
- **Dirty status:** isolated candidate contains only scoped first-person changes and work records. Primary retains all unrelated drafts. Dependency lockfiles match; candidate reuses the primary node_modules via symlink.
- **Port/process ownership:** fresh isolated preview `http://first-person.localhost:4412`, unified session37962, data `/tmp/allworld-first-person-candidate-data-20261015`, candidate dist. Server slot2 explicitly recorded; existing retention5176 remains untouched. Astra is sole browser operator.

## Progress

### Done and exact evidence

- Read current coordination index and relevant work records. Character owner currently edits an external lab only; retention source ownership is released to its parent and published separately.
- Prior first-person acceptance is recorded in `docs/FIRST-PERSON-PLAN.md`; it is historical until current source/build are rechecked.
- Street Studio JSDoc repair clears the 19 implicit-any errors. Full check reports `Typecheck clean: 5 projects, 0 errors in .ts and .vue, 0 baselined in existing JavaScript.` Evidence: host-local `/tmp/allworld-first-person-release-types.log`; worker record `first-person-types-20261015.md`.
- Extracted this task's changes against its saved pre-task source: 7 existing files plus 17 new files inventoried in host-local `/tmp/allworld-first-person-release-20261015/source-manifest.json`; patch beside it. `src/budgets.ts` and `vite.config.ts` match the pre-task snapshot.
- Astra fetched current `origin/main` at `9af2e51e` and verified the deploy lock was free. Preview 4412 and its browser tab are no longer running. Current main lacks the local draft's canonical body marker; integration must supply that narrow contract without importing the whole character rewrite.

### In progress / blockers

- Initial primary and candidate typechecks pass all five projects. First candidate build measured shared host 71,716 gzip against 71,000; reviewed optional reward rendering now loads lazily. Final measurement is pending. The scoped source is committed at `2c769457`; remote main advanced to `5181c91a` during verification, so Astra is reconciling it before the final gate chain.
- User approved the isolated branch/worktree. Astra owns candidate source integration; primary owns non-UI check scheduling and its record. Do not deploy the mixed primary checkout.
- Remaining browser/device/hosted checks are listed in the plan. Physical-device availability is unconfirmed.

### Immediate resume steps

1. Integrate latest main, then run exact-source typecheck, two stable builds, size, Worker and full Node gates.
2. Build and measure unchanged download limits, then exercise remaining mobile/web journeys on a fresh candidate preview.
3. Follow the current relay release protocol, hosted acceptance, deploy lock, exact-source checks, production continuity and bounded smoke.

## Release state

- **Local implementation:** `active`
- **Deployment:** `prepared` (requested; no remote mutation performed)
- **Release gate:** current-source validation, hosted/mobile/web acceptance, clean candidate, release lock, CI/package guard and live continuity.
- **References:** `docs/FIRST-PERSON-PLAN.md`; host-local relay `CODEX-FIRST-PERSON-HANDOFF.md`, `CODEX-ASSET-HANDOFF.md`, `DEPLOY.md`.

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-15T12:10:51Z | active | Resumed under explicit fix, verify and deploy request; mixed local checkout preserved. | HEAD and dirty inventory; relevant coordination records | Bounded fixes and integration review |
| 2026-10-15T12:23:00Z | active | Typecheck now passes all five projects; release patch extracted; isolated worktree confirmation pending. | Typecheck log, source manifest and Astra release record | Create and verify clean candidate after confirmation |

| 2026-10-15T12:26:00Z | active | User approved isolated branch/worktree; created from 9af2e51e, selective integration ready, typecheck passed. | Managed worktree, candidate diff, /tmp/allworld-first-person-candidate-types.log | Complete source checks and build measurement |

| 2026-10-15T12:42:00Z | active | Scoped implementation committed; reward lazy extraction reviewed. Current main advanced during checks; integration precedes final verification. | 2c769457, remote main5181c91a; first candidate size report | Merge latest main and freeze source for gates |

## Exact integrated gate checkpoint

- Integrated current main5181c91a into a9141b12085f631b256e3088ab0753f121f576aa. Upstream teardown guards/camera limits retained. Typecheck5projects passes; two builds produce identical8493-file dist digest `ede310c41bfeb8109ba19244ed3ec18db5185899f53a67c282487e5afdc31dc6`, generated manifests unchanged.
- Shared host now186321raw/70419gzip, under unchanged192000/71000 limits. Full size report and Worker/Node suite inventory ongoing.
- Strict Worker gate reproduced5110078bytes against3500000; it also exceeds the unchanged5MB package cap. This is inherited progression payload growth and cannot be waived for release. Astra reviewed an immutable progression snapshot boundary; Sol read-only preparation underway. No content/server writes until ownership is agreed with resumed retention chat. User explicitly authorized coordinating both chats.
- Preview4412 serves exact a9141b12 dist for fresh first-person browser acceptance. No main push, hosted dispatch, deployment lock or production upload yet.

## Coordinated combined release

- Anthony explicitly authorized coordination with the Research Allworld game retention chat. That lane is the final combined main integration/deployment operator; this lane will deliver an accepted branch SHA and verify first-person live afterward. No independent stale-source deploy.
- This lane owns the Worker progression data boundary: provider-backed public lookup facades, source-only authored construction, authenticated bounded assets, atomic install before Worker startup/storage/socket restoration. Retention owns public profiles, authored batch corrections, and idle heartbeat fixes in house/runner.ts and gist/ledger.ts. Existing lookup types and all legacy reward IDs remain compatible.
- Source data parity captured before edits: 10,886,582bytes, SHA256 dda3cd76196e3a20d542a00b821c7d284cf1d740119b55b0cc847795bbfa4520. Generator reproduces the same full snapshot; four payloads stay below5MB. Runtime integration and final checks pending.
- Exact a9141b12 full download gate passes all measured limits. Baseline edge command was deliberately interrupted before source refactor; no full Node suite ran and neither is claimed passing. Final gates will run after repairs.
- Preview is now at1x on immutable a9141b12 source archive /private/tmp/allworld-first-person-server-a9141b12, using the same verified dist and preserved fake save directory. Own original process gracefully stopped, own replacement session37962; existing5176 service untouched. Archive dist link repaired after initial life503, allowing normal asset-loader retry.

## Menu placement and Worker gate checkpoint

- Anthony requested that the floating top-right view button move into the existing menu. This is included in the current release scope; preserve scene-host lifecycle, lazy controller loading, responsive 44px controls and loading/reload recovery. HUD menu integration ownership is being assigned separately from the Worker provider.
- Provider and exact campus navigation/shuttle extraction now pass the unchanged strict Worker gate at3,496,918bytes, with typecheck5projects and52focused checks passing. Full raw local-tales maps remain source-only; Worker accepted-ID sets and current episode/journey APIs remain available. Astra reviews the source and one bounded pure-money import correction that removes accidental Vue runtime from the Worker.
- Retention public profiles are likely larger than the current3,082-byte headroom, so final combined Worker measurement remains a gate. Retention remains sole combined main/deploy operator and has the browser slot for5176 profile QA; our preserved4412 tab is idle until ownership returns.
- Current first-person build remains a9141b12. Bed-pose eye offset and failed-lazy-load Reload to retry fixes are implemented but require fresh served-build replay with the menu correction.

## Published menu candidate

- Astra accepted provider/navigation and menu source, committed scoped changes as aed1d702, merged current mainbc113b55 and cherry-picked the exact retention idle fix. Clean accepted branch published at11936921c726ad68141654c239955ccae0500cbd. Retention received this SHA and owns final combined full Node/edge/two-build/package gates after its content/profile integration.
- Fresh candidate typecheck passes5projects. Production build completed with8,495files, dist digest94d9f63a603d2c71254c55d2ae09b448e228f58e949b6b30d28913e0c2df4c18. Controller is assets/controller-64ccc3f4.js,13,860bytes, SHA72039c754bd46b22f4f6c140b4de0b3ec3db7f3a8294b8e89d1dac12f995d773. Size scan is still running; no new acceptance inferred from build success.
- Parent independently regenerated the progression snapshot and confirmed exact baseline bytes/hash. Receipt /tmp/allworld-first-person-provider-parity-receipt.json.
- At retention request, gracefully stopped only own4412child69698/session37962 to free its server slot. Same fake save data preserved. Prepared11936921 immutable server archive and updated wrapper; restart waits for retention server/browser handoff. No concurrent browser use.

## Browser startup regression caught before release

- Full11936921 download gate failed STARTUP_RAW2,091,050/615,000, STARTUP_GZIP597,484/223,000 and STARTUP_BROTLI498,535/195,600. Shared host passed186,308/70,401. Actual browser failed before API loading; fake save preserved. This candidate is not release-ready, despite earlier focused checks. Retention explicitly held its combined build/deploy.
- Root cause: Vite's progression manual-chunk classification omitted the moved source-provider and content source/validation files, falling into the eager engine fallback and creating an engine/progression cycle. Astra approved testing a one-hunk classification correction first. Sol's in-memory proof returns startup608,139raw/220,411gzip, with progression absent from startup; Brotli, full build and actual boot proof pending. No new bootstrap layer or budget change.
- Retention returned browser/server resources. Own preview4412 restarted as session66912 with the same preserved data at1x. It serves candidate dist from immutable11936921 Node source; the current correction affects Vite classification only. Astra is sole browser operator and waits for the rebuilt dist.

## Finite local acceptance complete

- Published correction73f66122 restores lazy progression classification; actual browser boot and saved life restored. Published8061dc2c exposes the real home presentation pose without changing navigation/rest semantics. Controller/context7/7 and fresh build pass. Targeted startup608139raw/220420gzip/193436Brotli and shared host186322raw/70426gzip remain below unchanged caps.
- Actual finite browser matrix passes More placement/keyboard/320/390/landscape, failed controller download and normal reload recovery, constrained2-core/reduced-motion/throttled startup plus movement/look, Lagos-Ibadan rail fare deducted once/21s journey/arrival, normal bed angles and third restoration. Extreme maximum-down lying view can expose collar aperture; do not claim all-angle realism. Physical phone/audible speaker/FPS proof remain unavailable. Public idle snapshots have stopped loops but reset positions, so no comparative draw-saving claim.
- Retention published combined82237708000b7ab45e8d36ab5d259793148640b5 and started CI38745256654. It found campus generated navigation drift on LinuxNode24.21 versus localMacNode24.14 and an existing packageguard fixture missing progression assets. CI canceled by its owner; no deployment. Our Sol owns campus determinism repair with Astra review; retention owns guard fixture only. Hosted QA payload prepared but NOT dispatched pending corrected final source.
- Production cleanup owner is separately resolving authority epoch after user-authorized QA deletion. Never restore/reuse deleted Tokyo QA actors or create replacement production test homes. Hosted city acceptance uses only runner-local127.0.0.1 data and does not mutate production. Retention waits for cleanup-owner handoff before deploying.

## Campus determinism repair accepted locally

- Astra accepted the exact occupied-tree-cell representation: unchanged2m grid/.4m radius and existing circle/containing-cell rules, sorted unique valid indices, visual trees untouched. The generated payload shrinks208,181→167,130bytes; this lane's Worker is3,382,393bytes against the unchanged3,500,000 cap.
- Parent independently hashes full normal before/after snapshots to `df98a168c29a9edbbb2a8931514e21c0a5ac27641b8e40f92808e258aefa221c` and extra-footprint snapshots to `b899516ea41903974e610c2aa7f1e02ea2d2aa0a0f6eae30b0010903b103d44a`. All1,312,150 occupancy cells,35anchors/routes,81zones and entrance match. Walk/shuttle11/11 and local Node24.14/24.21 generated checks pass. Hosted Linux remains required; truncated CI output cannot prove first differing coordinate/count/maxdelta.
- Retention reports packageguard fixture correctioncf1156bc passes25/25 and cleanup owner has cleared epoch3/a22e96b4. Retention owns final verification and any production continuity identities; this lane creates no production test actor. Hosted QA queue is idle, prepared batch remains undispatched until corrected combined source pin.
