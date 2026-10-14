**Phase 0 implementation — dependable progression and human-return measurement**

Worktree baseline: remote `origin/main` at `d33ad45cbf2ac7c60070d4145453c0652d3152fa`, fetched 14 October 2026 and rechecked before handoff. Implementation is isolated in `/Users/anthonyakpan/.codex/worktrees/retention-phase-zero/JoinAllworld`, with a detached HEAD at that revision. The original checkout and its character/rendering edits are untouched. This is local implementation evidence, not a release claim.

The source baseline includes the newer world-alive releases, agent place tools, moderation, and AI safety changes. Compatibility here means the merged agent-play implementation on remote main. It cannot establish compatibility with unpublished changes on the other computer.

**Decisions**

1. Reaching a mission criterion creates an entitlement in the same state mutation. Replacing daily/weekly lists cannot remove that entitlement. Collection removes the pending entitlement and creates a grant receipt alongside the wallet credit. A balance-cap refusal retains the entitlement. Current payouts remain ₦250 daily and ₦1,000 weekly.
2. Outstanding rewards are bounded by the finite mission catalogue: at most one per definition. A definition with an uncollected reward cannot be dealt again until collected. Latest grant receipts are bounded the same way. There is no silently expiring reward backlog or unbounded daily history.
3. A completed set earns its stars when all criteria are complete. This intentionally moves star delivery earlier than the former last-cash-claim trigger, without increasing the award. A cap-blocked set award retains its original period and blocks replacement of that scope until it fits. It is retried during normal settlement. Previously granted sets cannot grant again.
4. Version-1 entitlements freeze their reward terms. Backfill uses only a still-saved completed row or all-complete set. Its origin is `unknown`; its earning timestamp is conservatively placed inside the saved period. Already-discarded historical missions cannot be reconstructed. No invented completions or retroactive human-return counts.
5. One character owns its progress. `publicId` is the character identity; an account can hold several separate characters. City-qualified reward identities retain the original city through travel. Deduplication also recognizes the same character/mission/period after a city change. Account parking/restoration keeps the whole city-life record; progress is not merged account-wide.
6. Cash reaches the ledger at collection time. An older-week entitlement keeps its original earning time and is excluded from the current week's civic earnings. This does not rewrite closed historical leaderboard snapshots. Ordinary agent rankings and earnings movement are unchanged.

**Agent integration contract**

The authenticated MCP wrapper supplies `executionOrigin`: `delegated-agent` for an own-character key and `agent-character` for an agent-character key. HTTP JSON and headers cannot choose this field. Generic `call_api` inherits it. The prepared transaction binds origin to the authenticated session in a private WeakMap; unbound internal execution defaults to `system`.

The server stores the controller of a running action beside the life. Settlement uses that saved controller, regardless of the next caller, browser state, key revocation, or the five-minute public AI label. Pre-existing running actions without this evidence remain `unknown`. Completion origin, collector origin, character ownership, and ranking family are distinct facts. Entitlements retain original earning origin after collection.

`get_goals` exposes saved cash and pending set rewards. `claim_mission` accepts optional `rewardId`. Existing `{id,rid}` calls remain valid because there is at most one outstanding reward for a definition. No agent credential, ordinary gameplay permission, presence policy, safety filter, or ranking rule is replaced.

Known agent wrappers do not enter human growth, source, or client-signal counters, including delegated agents on a human-owned character. They cannot change a person's analytics consent. This identifies known authenticated automation; it is not proof that every ordinary browser request was physically operated by a person.

**Measurement contract**

The server retains a bounded operational receipt list (128 events per character life), the last 31 qualifying human days, and the first qualifying day since tracking began. This operational state supports attribution and retry inspection. It is not an analytics warehouse or a permanent achievement catalogue.

A meaningful human day requires an authenticated action which successfully starts a timed activity/trip/call or produces a selected verified engagement outcome: job application, settling in, home styling/upgrade start, purchase, friendship creation, table result, business opening, vote, or roadside decision. Opening a page, polling, a failed action, collecting rewards, swapping missions, and autonomous completion alone do not qualify. This is a deliberately scoped v1 metric, not a claim that every meaningful feature is covered.

Days and weeks use the existing Lagos clock. New-character cohorts and pre-existing characters are distinguished. First observed meaningful day is not an acquisition date for an existing character. D1/D7/D30 analysis must use fully observed cohorts and disclose tracking start. Cross-character account aggregation is a later analytics decision, not silently inferred here.

| Event | Authority and meaning |
| --- | --- |
| `mission_completed_v2` | Server: criterion reached. |
| `mission_reward_earned_v2` | Server: cash entitlement created. |
| `mission_reward_granted_v2` | Server: actual cash credit. |
| `mission_set_completed_v2` | Server: all criteria complete; star entitlement earned. |
| `mission_set_reward_granted_v2` | Server: star award actually granted. |
| `mission_reward_viewed_v2` | Client: successful collection result displayed; not proof of completion. |
| `human_meaningful_day_v1` | Server: first qualifying human engagement on a Lagos day. |
| `mission_completed` | Legacy client event continues to mean cash collected. Do not combine it with v2 criterion completion. |

Server receipts have stable event ids, occurrence timestamps, original earning period, city, execution origin, ownership category, and ranking family. Client result views use character + mission + scope + period + original city as their composite identity. Private dialogue, credentials, account identifiers, and coordinates are excluded. Analytics goes through existing consent and property scrubbing, with stable PostHog insertion ids and server occurrence timestamps.

The prepared transaction publishes only after a successful durable commit. An outcome with new receipts forces durable persistence even if the route normally permits a lazy poll. Analytics delivery remains best-effort through the existing bounded transport; a crash after commit and before export can lose an analytics event. Financial exactly-once behavior does not depend on analytics delivery. Raw internal store transactions outside the prepared route wrapper are not claimed as complete analytics coverage.

**Pilot assumption**

UNILAG / Hostel Hustle remains the provisional first location and episode because existing content can support it. It is not an audience-validation result. No campaign, notification schedule, new streak multiplier, achievement catalogue, or Phase 1–6 feature is part of this change.

**Verification record**

| Verification | Result | Evidence |
| --- | --- | --- |
| Prepared transactions, settlement clock, character handling, request replay, server/client telemetry, growth | 79 passed, 0 failed | `phase-0-evidence-2026-10-14/integration.txt` |
| Existing Worker agent and SQLite suites | 31 passed, 0 failed | `phase-0-evidence-2026-10-14/worker.txt` |
| Existing agent safety and red-team checks | 13 passed, 0 failed | `phase-0-evidence-2026-10-14/agent-safety.txt` |
| Mission suite, after authorized test alignment | 8 passed, 0 failed | `phase-0-evidence-2026-10-14/missions.txt`; completion-time stars, saved reward identity across midnight/reload, late collection, and duplicate-claim refusal |
| Growth models and engine type-contract tests, after authorized fixture alignment | 51 passed, 0 failed | `phase-0-evidence-2026-10-14/fixtures.txt`; new mission reward fields, current set copy, and direct-source attribution |
| Full five-project typecheck | Passed: 0 errors in TypeScript/Vue and 0 baselined JavaScript errors | `phase-0-evidence-2026-10-14/typecheck.txt`; previous fixture error retained separately for context |
| Whitespace/conflict check | `git diff --check` passed | Local worktree |

Before the authorized test updates, temporary diagnostics exercised the real server/store and Worker handlers without adding or editing repository tests:

- Node: an agent-started trip retains its origin after the public AI marker expires and a normal human-origin request settles it. It does not create a human-return day. A later qualifying human-origin action creates exactly one day. These are authenticated HTTP harness requests, not an interactive browser playthrough.
- Node: cash and cap-blocked set rewards completed immediately before Lagos midnight/Monday survive rollover and a disk save. Cash-cap refusal retains the entitlement. Making room for stars grants the daily 2 and weekly 5 exactly once.
- Node: two signed-in devices racing different request ids receive one grant and one `already_claimed`; the old-week reward does not inflate the new week's civic earnings.
- Node: an injected disk-write failure leaves the reward available and publishes no analytics. Retrying and replaying the same request grants once.
- Worker/SQLite: restart with a saved completed legacy mission, expose the migrated reward through `get_goals`, collect using `rewardId`, then repeat. Cash changes from 1,005,000 to 1,005,250 and stays there. Delegated growth/source calls are excluded, and consent mutation is refused.

The summarized diagnostic output is saved in `phase-0-evidence-2026-10-14/boundary-diagnostics.json`. The Worker diagnostic verifies restart/backfill/tool compatibility; it does not repeat every Node concurrency and failure boundary.

The original run of growth components, growth models, civic and wallet checks passed 31 cases and exposed two growth fixture mismatches; it is retained in `phase-0-evidence-2026-10-14/ui-economy-before-approval.txt`. Both are now resolved: the set copy says “Complete all 3,” and the `/growth/hello` expectation includes the direct-source attribution already present on main. Production behavior was not reverted or suppressed to make the checks pass.

The user explicitly authorized affected test updates on 14 October 2026. Only three existing test files were changed: `src/game/missions.test.ts`, `src/app/features/growth/growth.test.ts`, and `src/types/engine.test.ts`. The mission assertions now prove the preserved entitlement and once-only grant behavior rather than merely accepting different return codes. The growth fixture supplies the new reward fields without an unsafe cast, and the engine contract checks the new state and view fields. All 59 focused checks and the full five-project typecheck passed. No production source changed during this follow-up. The local automated-verification gate is closed; interactive acceptance of the saved-reward interface on desktop and a small screen remains open.

No application preview was started or restarted, no full application build was performed, and no interactive browser/device acceptance is claimed. Fresh-worktree data generation and a reused HTML fixture supported existing runtime checks; neither is release evidence. Nothing has been committed, pushed, deployed, or enabled for players.

**Delegation record**

Sol (`gpt-5.6-sol`, high) owns mission state, reward handling, and Missions UI. Luna (`gpt-5.6-luna`, medium) owns the bounded origin bridge, growth guards, agent tool compatibility, and existing Worker checks. The parent owns contracts, money-attribution decisions, transaction integration, review, and final verification. Both workers also reviewed the other workstream without edits; no concrete persistence, duplicate-grant, or origin regression remained. A suggested concern about delayed star recovery was checked against `missions.advance`: normal polling retries it automatically, without requiring a mission action. Tokens and monetary cost are unavailable. Work remains local; no commit, push, PR, or deployment has occurred.

For the authorized fixture follow-up, Luna updated the growth and engine tests while the parent strengthened the mission lifecycle assertions, reviewed the combined diff, and ran the final typecheck. All three edited existing test files passed on their first focused run. No new test files were created.
