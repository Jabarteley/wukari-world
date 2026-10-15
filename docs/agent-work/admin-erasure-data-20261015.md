# Admin erasure data domain

## Identity

- **Work ID:** `2026-10-15-admin-erasure-data`
- **Owner:** `/root/erase_domain_impl`
- **Model / effort:** `gpt-6-astra / high`
- **Thread:** delegated worker under `01a13bea-138b-7b91-ac44-c49bc3d836ec`
- **UTC updated:** `2026-10-15T18:41:23Z`
- **Status:** `ready-for-integration`
- **Work state:** `implemented; integration owner validating`

## Goal and boundaries

- **Goal:** Implement the deterministic main-store closure and synchronous data erasure contract used by the root-admin permanent player eraser.
- **In scope:** `server/admin/erasure-data.ts`; final bounded erasure regressions in `server/admin/admin.test.ts` and `deploy/admin.edge.test.ts`; schema inventory; focused verification; this work record.
- **Out of scope:** routes, UI, job orchestration, external storage/world cleanup implementations, browser/production work, Git publication, and unrelated tests.
- **Exclusive file ownership:** `server/admin/erasure-data.ts`; `server/admin/admin.test.ts` and `deploy/admin.edge.test.ts` (transferred by root for bounded regressions); `docs/agent-work/admin-erasure-data-20261015.md`.
- **Input contract:** `planErasure(ctx, db, admin, targetId)` receives the current main-store snapshot and root admin; `eraseData(ctx, db, plan)` is called inside the store transaction.
- **Output contract:** deterministic typed `ErasurePlan` covering actors, accounts, shards, sessions/devices, external media and conversations; a synchronous apply result for cleanup orchestration; protected-target and unsupported-integrity failures occur before destructive mutation.
- **Dependencies:** root owns route/UI/job orchestration; `/root/erase_architecture` owns architecture/world/storage review; root persists `db.playerErasure`; Astra integration owner reviews the contract.

## Repository state

- **Repo:** `kromate/joinallworld`
- **Host:** local Mac
- **Branch / worktree:** `codex/retention-main-sync` in the requested existing worktree
- **Base:** `8e128a507a4303937002ebef60d988db938c66f6`
- **Current commit:** `8e128a507a4303937002ebef60d988db938c66f6`
- **Dirty status:** dirty with unrelated coordination/research files and root-owned `docs/agent-work/admin-player-erasure-20261015.md`; preserve all.
- **Port/process ownership:** none

## Progress

### Done and exact evidence

- Read root `AGENTS.md`, `docs/AGENT-COORDINATION.md`, current root erasure record, technical-autopilot routing/safeguards, and the main-store privacy hook inventory.
- Added `server/admin/erasure-data.ts` with deterministic guest, agent, active-account and parked-account closure planning; protected root/admin ownership checks; session, device, shard and external-media projections; and stale-plan comparison.
- Added explicit synchronous erasure for auth, social, growth, civic, politics, business, trust/support/moderation, agent registries, house memory, stages/prayers/owner acts/call ledgers, plus the existing living-world, real-value, market, legacy and showcase privacy hooks.
- Preserved anonymous accounting through `eraseActorStorage` / `eraseWalletActors`; retained hash-chained public-record references and active unsettled money state fail before mutation with a clear 409 reason.
- Unknown top-level collections containing an actor id fail preflight instead of receiving a recursive or assumed deletion. External world, media and commerce work is returned to the durable job owner.
- The final architecture review confirmed that closure ownership fails closed across duplicate live rows, archives, account reverse references and both agent indexes, and that another host's house conversation is retained while only the erased actor's messages and media are removed.
- Worker unknown-collection preflight enumerates `$store.collectionNames()` as well as object keys and catches an actor UUID inside composite keys or values. The architecture owner reported the updated storage suite passed 59/59; root still owns an end-to-end SQLite admin-preflight assertion.
- Added the requested actual SQLite-backed regression: a UUID embedded in an unknown custom collection key returns 409 `erasure_ownership_unsupported` and preserves both the target session and custom row. Added a shared-house regression proving erasure retains the other host's conversation and message while removing the erased visitor's line and frozen reply identity.
- Focused `node --experimental-strip-types --test --test-concurrency=1 server/admin/admin.test.ts` passed 15/15 at `2026-10-15T18:23:34Z`. Final scoped `git diff --check` passed.
- Added a syntax-minified real Worker regression covering root preview, typed account erasure, removed profile, rejected old session, preserved founder and idempotent completed-receipt replay. With the pinned release tools it passes 2/2; its first run exposed an unloaded-session SQLite deletion defect, which the storage owner fixed with an exact-key deletion and draft-visible identity lookup regression while keeping the world live-actor guard.
- The stable-assets edge rerun passed 186/193. Four known Miniflare eviction timeouts and one row-budget heartbeat observation are outside the erasure path; the raw bundle budget was corrected by the root packaging owner and subsequently passed 5/5. `city-foundation.test.ts` reproduced the same socket-frame timeout on both the current candidate and a detached exact `8e128a50` base with the same dist and pinned tools, confirming that failure is inherited. The detached comparison worktree was removed and pruned.
- `git diff --check -- server/admin/erasure-data.ts docs/agent-work/admin-erasure-data-20261015.md` passed at `2026-10-15T18:17:27Z`.
- The integration owner reported its route integration test passed 1/1. The first supported serial typecheck reached only this new module and reported narrowing errors; the `fail` helper is now a declared `never` function and the parked-character flow uses optional target fields. A supported integration rerun remains with the root owner.

### In progress / blockers

- No erasure implementation blocker. Root owns the explicit release decision for the known Worker-suite exceptions and the incomplete long all-cities run.

### Immediate resume steps

1. Root records the Worker-suite exceptions and decides the release gate.
2. Preserve the passing pinned Worker erasure evidence and clean five-project typecheck in the release record.

## Release state

- **Local implementation:** `ready-for-integration`
- **Deployment:** `not-requested`
- **Release gate:** Astra integration review plus root-owned route/job/world/storage verification.
- **References:** `docs/agent-work/admin-player-erasure-20261015.md`; `docs/AGENT-COORDINATION.md`

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| `2026-10-15T00:00:00Z` | `active` | Registered disjoint ownership at requested base. | `git rev-parse HEAD`; `git status --short` | Complete schema inventory and implement. |
| `2026-10-15T18:17:27Z` | `ready-for-integration` | Implemented deterministic closure and explicit main-store erasure; corrected cross-store media, land-journal, retained-group, growth, parked-character and anonymous-wallet boundaries in review. | Source review; `git diff --check`; root-reported route integration 1/1 | Root runs supported serial typecheck and affected integration suite. |
| `2026-10-15T18:20:57Z` | `ready-for-integration` | Closed cross-account identity-collision, shared house-conversation and Worker custom-collection preflight blockers. | Architecture re-review; storage suite reported 59/59 | Root reruns supported typecheck and proves SQLite custom-collection refusal through admin erasure. |
| `2026-10-15T18:23:34Z` | `ready-for-integration` | Added actual SQLite custom-owner refusal and other-host house-conversation preservation regressions. | Focused admin suite 15/15; scoped diff check clean | Root runs supported typecheck and broader integration suite. |
| `2026-10-15T18:41:23Z` | `ready-for-integration` | Proved the complete account-erasure endpoint through the syntax-minified Worker and classified the city-foundation edge failure against the exact base. | Pinned Worker admin edge 2/2; current and base city-foundation logs reproduce the same timeout; full edge 186/193 | Root records explicit release exceptions; no further source expansion. |
