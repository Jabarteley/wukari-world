# Admin erasure release candidate

Runtime candidate: `4ab427e744d507fa5ded281e24d987f74056aa32` on `codex/admin-player-erasure`; contains current main8e128a50. Production remains6695f00c.

## Accepted evidence

- Local UI desktop and390×844 preview/cancel/exact-confirm/erase/list-refresh passed.
- Final compatibility168/168, pinned syntax-minified Worker erasure2/2, SQLite30/30, words runtime/budget5/5, release smoke17/17, package guards25/25.
- Typecheck five projects clean; build/download caps passed. Pinned Worker3437070bytes before release marker, under unchanged3500000 limit.
- Hosted candidate CI38787644803 passed: release policy, five-project typecheck, build/download budgets and smoke.

## Explicitly unpassed broad gates

Full Node run observed3396 passing cases, then was stopped at the15minute verification window in src/game/cities/allCities.test.ts. It is incomplete. Its old byte-budget and Settings switch-count failures were fixed and focused reruns passed.

Stable-assets edge193tests/186pass/7fail included one obsolete whitespace-only budget fixture, corrected by the subsequent5/5 words run. Six remaining failures:

1. Calls: eviction mid-call times out with active references.
2. Chat: group/mention/reply/reaction/multiple-device eviction times out.
3. City foundation: Socket frame timed out; reproduced on exact base8e128a50 and candidate, same pinned tooling and assets.
4. Invitations: eviction has active references.
5. Account hardening: eviction has active references.
6. Row budget: heartbeat writes44 collection rows where the test expects none.

The four eviction and row-budget failures have prior release records; no new full-suite pass is claimed. Actual erasure success was separately established on the pinned production-style Worker after the SQLite fix.

Logs remain in /private/tmp/allworld-admin-erasure-{edge-final,city-base,city-current,full,release-compat,worker-regression,words-final,types-release,smoke,guard}.log. Earlier exact-source deployment exceptions do not automatically approve this candidate.

## Deployment and cleanup scope

After final release approval, publish candidate through main CI and protected release with unchanged namespace/bindings, normal notice and continuity checks. Then use the new root-admin action for only the three previously authorized QA IDs: bfcb8ef0-4d00-4d8e-b665-bb8b11d45e56,453a0f63-5b90-4e7b-b730-4ea9ff54b70d,6cea4961-b7fc-4bb7-a6db-a28e9327014f. No new QA actors and no deletion inferred from other search results. Verify absent profiles/map homes and unrelated founder preservation; document real outcomes.
