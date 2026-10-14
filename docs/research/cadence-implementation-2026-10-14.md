# Phase 5 cadence engine — implementation evidence

Date: 2026-10-14
Scope: pure character rhythm state and the 20/40/60 daily display helper
Release state: local source only; the feature remains off until the integration owner enables an evidence cohort

## Implemented contract

Phase 5A defines three completed-item milestones at 20, 40, and 60 display points and explicitly keeps them outside cash rewards. Phase 5B is a separate optional meaningful-day experiment with permanent recognition at 3, 7, 14, and 30 active days. The source plan excludes money, stars, wages, votes, competitive power, and any cosmetic multiplier until a real collection track and balance review exist ([retention phases, lines 106–126](allworld-retention-implementation-phases-2026-10-14.md#phase-5--test-cadence-in-two-separate-steps)).

The implementation adds two isolated source modules:

- `src/types/cadence.ts` owns the durable, character-scoped `RhythmState`, permanent recognition receipts, pure transition results, views, and daily display types.
- `src/game/cadence.ts` owns sanitization, explicit opt-in changes, meaningful-day advancement, read-only expiry projection, and the display-only daily milestone helper.

There are no wallet effects, claim actions, grants, multipliers, cosmetics, achievement mutations, mission rewrites, or automatic enrollment in this unit.

## Authority and ordering

The existing server already decides whether an action is human and meaningful. `observeProgression` marks selected successful outcomes, and `recordHumanDay` rejects non-human and agent-character origins, uses the Lagos day, deduplicates that day, and retains a bounded 31-day operational list (`server/progression.ts`, lines 61–97). The Phase 0 contract also excludes page opening, polling, failed actions, collection, mission swaps, and autonomous completion from meaningful days (`phase-0-implementation-2026-10-14.md`, lines 26–32).

Cadence must run after that authority, in this order:

1. Complete and commit a server-validated meaningful human action.
2. Derive `day` with `lagosTime(now).day`.
3. Deduplicate the character/day through the existing human-day authority.
4. Only when that authority records a new day and the rollout flag is enabled, call `advanceRhythm(savedRhythm, day, options)` and save `result.state` in the same character transaction.
5. Publish telemetry after commit. Do not infer cadence progress from navigation, polling, model text, reward claims, or the client view.

The integration owner should make `recordHumanDay` report whether it inserted a day, or perform the same existing-day check in the transaction before calling the pure transition. Calling `advanceRhythm` twice is safe because the second call returns `already_recorded`, but the server remains the source of human-action authority.

Opt-in is a setting mutation, separate from meaningful-day authority:

```ts
setRhythmOptIn(savedRhythm, enabled: boolean): RhythmState
```

It only changes `optedIn`. Disabling and re-enabling preserves the saved chain, best, lifetime, held rest day, active-day accrual, and recognition receipts. Time continues to pass while disabled, so the next recorded day may reset an expired chain. This prevents opt-out/re-enrollment from granting days, freezing a chain, or farming rest days.

## Pure API

```ts
createRhythmState(): RhythmState
sanitizeRhythmState(value: unknown): RhythmState
setRhythmOptIn(value: unknown, optedIn: boolean): RhythmState

advanceRhythm(
  value: unknown,
  day: number,
  options?: { verifiedOutageDays?: readonly number[] },
): RhythmAdvanceResult

viewRhythm(
  value: unknown,
  today: number,
  options?: { verifiedOutageDays?: readonly number[] },
): RhythmView

getDailyMilestones(completedCount: number): DailyMilestonesView
```

`advanceRhythm` accepts a Lagos day index only after successful server validation. It returns `recorded`, `disabled`, `already_recorded`, or `clock_rollback`, along with explicit `counted`, `restUsed`, `restGranted`, missed-day, and newly-recognized fields. The function has no I/O and does not mutate its input.

`viewRhythm` projects expiry at a supplied Lagos day without changing saved state or consuming a rest day. It includes saved and effective current counts, best and lifetime counts, rest status, ordered permanent receipts, the next recognition, and player-facing timezone/reset/rest/outage policy copy.

`getDailyMilestones` clamps the completed count to 0–3 and returns 0/20/40/60 display points plus reached and next milestones. It creates no balance, receipt, reward, or claim.

## Boundary rules

- A first validated active day starts `current`, `best`, and `lifetime` at one. Opt-in itself never calls this transition.
- Another action on the same Lagos day returns `already_recorded` and changes nothing.
- A lower or invalid day returns `clock_rollback` and changes nothing. A very large valid gap uses arithmetic rather than per-day iteration.
- Consecutive active days increase the current chain. Permanent receipts are added once when best reaches 3, 7, 14, or 30, and survive later chain resets.
- Every four actual recorded active days earns one held rest day. Only one can be held. While one is held, up to three subsequent active days remain accrued toward the next grant; no second rest day is stored.
- Exactly one uncovered missed day automatically consumes a held rest day on the next recorded active day, preserves the chain, and gives no lifetime/current credit for the missed date. The newly recorded day still counts normally.
- If uncovered missed days exceed the one held rest day, current resets to one. Best, lifetime, recognition, and the insufficient held rest day remain. The engine does not waste a rest day that cannot preserve the chain.
- Viewing an expired chain returns effective `current: 0` but retains `savedCurrent` for audit and does not rewrite persistence. The next validated active day performs the reset.

## Lagos reset and outage policy

The existing clock defines a Lagos day as a whole local day in UTC+1 with no daylight-saving transition (`src/game/clock.ts`, lines 1–18). The view publishes: “A meaningful day resets at midnight in Lagos (UTC+1).” Client device timezone and clock changes do not create a day.

There is no automatic or commercial streak repair. An operator-wide incident can be represented only by a trusted server-supplied `verifiedOutageDays` list of Lagos day indices. Those dates are bounded, deduplicated, and ignored unless strictly between the last and new/viewed day. A verified outage preserves the calendar chain but does not add current days, lifetime days, rest accrual, or recognition. Generic errors and player-provided dates never qualify.

If no verified outage input is supplied, normal missed-day rules apply. The same verified list must be supplied to `viewRhythm` and `advanceRhythm` for a consistent result.

## Persistence and rollout seam

Store one sanitized `RhythmState` on the character record. Treat `optedIn` as the persisted player setting; only the explicit settings endpoint may change it. Treat every other field as server-owned. Sanitize both reads and writes. The state is bounded by four fixed receipt keys, counters capped at 1,000,000, one rest day, three accrued active days, and a bounded Lagos day. It does not depend on the 31 retained `humanDays`, which is operational evidence rather than a permanent ledger.

The integration owner should keep the cohort/feature flag false by default. A disabled flag must not call `advanceRhythm`, and a saved `optedIn: false` must return `disabled`; neither condition silently enrolls a character. Phase 5A and 5B remain separately measurable experiments.

No shared registration, protocol, persistence, endpoint, UI, telemetry, server, or build file is changed by this unit.
