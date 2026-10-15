# Admin player erasure

## Current work

- Owner: /root; chat 01a13bea-138b-7b91-ac44-c49bc3d836ec.
- Checkout: /Users/anthonyakpan/.codex/worktrees/retention-main-sync/JoinAllworld; branch codex/retention-main-sync; base 8e128a507a4303937002ebef60d988db938c66f6.
- Status: implementation and architecture review complete; final release verification in progress.
- Goal: authenticated admin permanent player erasure, including account/session, progression, social and map presence; preserve unrelated players and shared accounting invariants. Clearly disclose anything retained rather than claiming total historical erasure.
- Source ownership: proposed new server/admin/erase.ts plus admin route/action/UI integrations, subject to architecture review. No shared source edits yet. Other dirty files preserved.
- Workers: erase_inventory (Luna, read-only inventory), erase_architecture (Astra, consequential design review). Cost/elapsed unknown until completion.
- Supersedes attempted Data Studio execution as the implementation approach. Existing rejected rehearsal remains evidence; no final SQL or epoch change was performed.
- Production mutation scope: only the exact three previously approved Phase 6 QA IDs. Screenshot search results do not authorize deletion of additional players.
- Acceptance: exact-ID authorization and typed confirmation; atomic deletion with consistent live cache and durable state; retries safe; removed map/home/profile and invalidated sessions; human/agent and unrelated player checks; build/type/budget checks; deployed runtime and live admin verification.
- Running resources: no new servers/processes. Prior codex-phase6 release lock ownership must be rechecked before deployment. Housing release owner remains coordinated separately.
- Next: settle reusable account erasure architecture, implement reviewed contract, run focused verification, sync and release.

## Release state

Implementation complete, with 105 focused compatibility checks and 59 storage/world checks passed; supported typecheck and production build passed. Final SQLite regressions, browser acceptance, download budget and full release suites in progress. No new release or production erasure has run. Prior live source 6695f00c requires refresh before deployment.

## Integration checkpoint

- Implemented root-only preview/typed confirmation UI, signed fresh plans and durable retryable cleanup jobs. See docs/ADMIN-PLAYER-ERASURE.md for scope/retention and blocker semantics.
- Sol owns erasure-data and final existing-test regressions. Astra reviewed account ownership and storage/map boundaries and now owns local browser acceptance. Root owns route/job/UI integration and release.
- Exact approved production cleanup: bfcb8ef0-4d00-4d8e-b665-bb8b11d45e56, 453a0f63-5b90-4e7b-b730-4ea9ff54b70d, 6cea4961-b7fc-4bb7-a6db-a28e9327014f. No additional target authorized.
- Temporary local synthetic browser fixture: backend4325, admin proxy4326; data and private synthetic cookie under /private/tmp/allworld-erasure-ui. These are local-only credentials.
- Logs: /private/tmp/allworld-admin-erasure-{build,types,compat,edge,full,size}.log. Edge began concurrently with the build; early missing-asset failures must be diagnosed and rerun after assets are stable.
- Next: finalize regression/browser evidence, complete release checks, commit exact reviewed source, CI and deploy, erase exact3 and verify unrelated account continuity.

## Final local acceptance

- Supported typecheck: five projects clean, no errors/baselines; build and download budgets exit0. Startup remains609092raw/220847gzip/193706brotli within unchanged caps.
- Root erasure route regressions3/3; agent final admin subset15/15; storage/world59/59; earlier account/admin/agent compatibility105/105. No test claim implies live acceptance.
- Astra actual local desktop and390×844 browser: preview/cancel, exact confirmation guard, successful erase and list refresh passed. Evidence docs/research/phase6-social-release-2026-10-15/admin-erasure/.
- Production browser readiness being re-established read-only via GET/api/admin/me; no new production actor allowed. Production admin subdomain does not resolve; game admin is Alt+Shift+A.
- Full suite and stable-assets edge rerun still open. No main push/deployment/deletion yet.

## Worker integration and release candidate

- Actual pinned esbuild0.28.1 syntax-minified Worker exposed a real SQLite unloaded-session deletion bug. Fixed commit to delete exact keys independently of prior reads; public-ID lookup now honors draft deletion/reassignment. SQLite30/30 and actual Worker admin2/2 pass. World refusal of still-live actors retained.
- Final focused compatibility168/168; final supported typecheck5projects clean.
- Worker was3544252bytes against3500000 before packaging fix; prior8e128a50 was3497821. Astra reviewed minifySyntax:true in actual package builder and both byte-budget fixtures, no caps raised. Pinned output3437070bytes before release marker. Guards25/25 pass.
- Updated stale existing Settings fixture from6 to9 switches, explicitly asserting the three existing first-person comfort controls. Focused fixture passes; product behavior unchanged.
- Broad Node run reached3396 passing cases, then was stopped at15minutes in the already-known CPU-bound allCities corpus. It is NOT a full-suite pass. Its two early failures (old packaging bytes and obsolete switch count) were separately corrected and rerun.
- Stable-assets edge run193tests/186pass/7fail: four eviction timeouts, a city-foundation socket-frame timeout, inherited row-budget assertion, and old whitespace-only byte fixture. Byte fixture corrected; baseline classification of city timeout pending. No broad-suite exception inferred from earlier exact-source approvals.
- Root additionally owns scripts/package-joinallworld.mjs, scripts/city/worker-content-budget.test.ts, deploy/words.edge.test.ts and src/app/features/panelsA.test.ts for the reviewed release verification fixes.
- Production still unchanged and exact3 QA still present. No production erasure has executed.

## Candidate publication checkpoint

Candidate4ab427e744d507fa5ded281e24d987f74056aa32 is pushed to codex/admin-player-erasure; main and production remain unchanged. Hosted CI38787644803 passed policy/typecheck/build; its download-budget/smoke job remains in progress. Current city-foundation socket failure reproduced on exact baseline8e128a50 with same assets/pinned tooling, proving it inherited. Words budget/runtime5/5 and release smoke17/17 passed after final corrections.

Local synthetic servers4325/4326 stopped. Production root GET-only browser tab460561228 is preserved for post-release exact-three erasure. No private account readback is committed: tracked evidence holds only checks; full readback stays under /private/tmp/allworld-erasure-ui.

Next executable step: obtain hosted CI terminal success, then request the concrete exception to DEPLOY.md step1 for this exact candidate's six broad Worker failures and incomplete full city corpus. Existing exact6695 release approval does not authorize those new-source exceptions. After approval: main fast-forward/CI, protected deploy, exact3 cleanup, continuity/map/profile checks, docs sync and housing lane return.

Hosted CI38787644803 is terminal SUCCESS on exact4ab427e7. Concrete user exception request sent for six broader Worker failures and incomplete allCities run; main push/deploy await that answer. All necessary local/hosted candidate preparation is complete.

## Yield handoff

Code candidate4ab427e7 and evidence/docs0e459604 are on origin/codex/admin-player-erasure. Main was not changed; no deployment or production erasure. User release-exception question remains pending. codex-phase6 lock released normally; housing owner explicitly received lane return and its coordination hold is lifted. On resume, fetch/recheck main and live health before reacquiring; never overwrite a newer housing release with this older candidate. Browser production GET-only tab460561228 preserved; local synthetic servers stopped. Unrelated untracked ui-world-entry-375.png remains untouched.
