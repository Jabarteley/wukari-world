# Retention and worldwide journey implementation

## Identity and current state

- Work ID: `retention-20261014`
- Owner: Research Allworld game retention; Codex chat `01a13bea-138b-7b91-ac44-c49bc3d836ec`; integration owner `/root`.
- Status: **active — final local integration checks**. Implementation through Phase 6 exists; startup download repair is in progress. No production deployment or measured retention improvement is claimed.
- Checkpoint: 2026-10-14 23:26 UTC (2026-10-15 00:26 Lagos). Recheck this timestamp and source on takeover.
- Canonical integration checkout: `/Users/anthonyakpan/.codex/worktrees/retention-main-sync/JoinAllworld`, branch `codex/retention-main-sync`. Original implementation and recovery copy: `/Users/anthonyakpan/.codex/worktrees/retention-phase-zero/JoinAllworld`.
- Research corpus: `/Users/anthonyakpan/Desktop/JoinAllworld/docs/research/`.
- Git: integration HEAD `84917cdc`, fast-forwarded from published docs milestone `899c60439022b2cb7082a1e88c930a3e4c41db36`, including `c921b8d9` agent-play changes and the other computer’s `AGENT.md`. Runtime changes from the original `8ac05891` base were applied cleanly with three-way Git merge and remain uncommitted/unpublished in this integration checkout. `git status --short` is authoritative for all changed/untracked paths.
- Recovery: stash labelled `retention implementation before main 8ac05891 integration` remains retained; it was already reapplied. Do not pop it again over the working implementation.
- Local coordination documents are mirrored to the primary checkout for other local agents. This does not synchronize source or documents to another computer.

## Goal and boundaries

Build reasons for humans to return: durable mission rewards, readable progress, permanent achievements, branching stories, cooperative projects, optional cadence, and reusable country/city/place journeys. Keep agent play compatible with the current runtime, preserving earned money and its existing ranking policy.

Research covers 141 verified award recognitions from 144 main catalogue entries, plus historical comparators and human motivation. New authored content is two Lagos/UNILAG episodes and two project occurrences; worldwide reusable definitions are not authored stories for every country.

User authorized implementation, isolated worktree/main refresh, affected existing test edits, UI fixes and parallel cheaper agents. User subsequently authorized frequent reviewed commits and pushes to GitHub main. Production deployment remains outside this request. Phase 5A/5B source flags default off and season start defaults unset; preview-only flags are enabled for QA.

## Ownership and dependencies

- Integration owner: progression/persistence/authority, final browser checks, docs/research phase tracker and handoff, `server/routes/core.ts`, this record and shared coordination index.
- `/root/phase0_mission_rewards` (Sol): loading repair delivered; source ownership released to parent. A bounded read-only startup import-graph audit is in progress. Parent owns all source and build/config edits.
- `/root/episode_engine` (Sol): completed episode/project/cadence engines, disposable progression acceptance probe, and quiet-poll fix. No active file claim after its final response.
- `/root/world_journey_pattern` (Luna): completed reusable journey projection, fixture catalogue updates, and coordination template/prompts. No active source claim after its final response.
- Other computer’s agent-play programme: [AGENT.md](../../AGENT.md), `claude/world-alive`. Published house-agent/public-romance source is integrated and 74 focused compatibility checks pass. Cache-first and Phase 11 agent-mission branches remain outside this accepted main source.
- Shared API boundary: trusted request execution origin comes from runtime credentials; progression consumes it. Human-day/rhythm/season enrollment excludes known automation. Ordinary agent earnings and runtime permissions remain governed by existing rules.

## Implemented and evidenced

See the [phase tracker](../research/allworld-retention-implementation-phases-2026-10-14.md) and [implementation handoff](../research/retention-implementation-handoff-2026-10-14.md). Those documents' joined-check status is being refreshed; current facts below take precedence over older pending/passed summaries.

- Mission completion creates durable entitlements separate from collection; rollover, caps, retries and period attribution are covered by focused checks.
- My Life contains Today, My Story, Achievements and My People. Six permanent achievements support three pins and one home plaque.
- Two definition-driven four-chapter episodes and two owner-deduplicated shared project occurrences support solo/quiet fallbacks and permanent mementos.
- Optional meaningful-day rhythm preserves lifetime/best recognition and a bounded rest day. Daily display milestones retain existing reward amounts. The first configured 28-day season has explicit enrollment, a finite collection and in-app intentions.
- Current joined source: five-project typecheck PASS; 84 focused retention/engine/state checks PASS; 74 agent-play/protocol checks PASS. Production build PASS. Final download-budget repair remains below.
- `/tmp/allworld-integrated-project.log`, `...-cadence.log`, `...-season.log`: real local HTTP rollback/retry, scope and receipt probes PASS. Season eligibility includes seeded canonical receipts; it is not a full human story playthrough.
- `/tmp/allworld-progression-acceptance.log`: direct-engine PASS for both stories' Help/Work routes, prerequisite, solo finales, duplicate finish, permanent mementos, explicit/no-clock reconstruction, achievement pin/plaque and Lagos-to-Ibadan preservation. Script is `/tmp/allworld-progression-acceptance.ts`.
- `/tmp/allworld-poll-focused-tests.log`: trust + failed-write existing tests 20/20 after the quiet-poll fix. `/tmp/allworld-registry-final.log`: 13/13. `/tmp/allworld-phone-art-final.log`: focused artwork assertion passes.
- Browser after the loading change: the actual midnight rollover preserved yesterday's completed ₦250 mission. Collection removed the entitlement once, reload retained that result, and lifetime collections is one; the new day remains 0/60 display points. Real travel earned Wayfinder; pin, home plaque and reload persist. Rhythm opt-in starts at zero; actual travel records one day; season enrollment and a saved project intention persist. Intention Continue opens My People. 320/375/1280 layouts checked; tabs are 44px high and the 320px layout uses two rows. Screenshots: [UI evidence](../research/retention-ui-evidence-2026-10-14/).

## Open checks and known findings

1. Startup budgets: conditional progression loading and an explicit lazy chunk reduced startup from about 660k to 621865 raw JS / 224285 gzip JS / 196410 brotli overall. Limits remain 615000 / 223000 / 195600; ~7k raw still must leave startup. Runtime action type constants must NOT join progression-rules: actions.ts imports them eagerly and would pull the pack back in. Parent owns the remaining repair and verification.
2. Broad Node run `/tmp/allworld-integrated-tests.log` on the original 8ac implementation was stopped by its owner after the all-city top-level module barrier stayed CPU-bound for over 24 minutes. It predates final focused repairs and is incomplete, not green. Do not restart the broad run without a new acceptance reason.
3. Broad Worker run `/tmp/allworld-integrated-edge.log`: 190 tests, 185 pass, five fail. Four Durable Object eviction failures reproduce unchanged on exact clean main (`/tmp/allworld-main-baseline-edge.log`). The row-budget failure also reproduces on clean main: current writes four collection rows and baseline writes two; the zero-row invariant fails in both. The count difference is not explained by this test and is not claimed resolved. See the Worker row-budget record.
4. Exact clean-main comparison `/tmp/allworld-main-baseline-regressions.log` also reproduces three Node failures: comeback zero-work, deterministic new-player money expectation, and two-player growth-key expectation. Leave unrelated expectations intact; report inherited failures honestly.
5. Joined-source typecheck/build, focused checks, HTTP diagnostics and browser reload are complete. Saved earned/pinned/displayed Wayfinder and season enrollment persist. Current screenshot is `joined-main-wayfinder-375.png`; evidence is archived as text. Final size/smoke acceptance and runtime main sync remain. Real cohorts, production and physical-phone coverage are separate future gates.

## Resources and safe resumption

- Task-owned local preview: `http://127.0.0.1:5176/`, `node --experimental-strip-types scripts/dev.ts --port 5176`, exec session 24161, log `/tmp/allworld-main-sync-preview.log`. Local flags: rhythm and milestones enabled, season start day 20740. DATA_DIR points to the original retention-phase-zero checkout’s isolated `.data`; preserve it. Server source is the canonical retention-main-sync checkout.
- Existing unrelated services on 4427/4428/4448/4400 are not owned by this task.
- Clean baseline source archive (not a managed worktree): `/tmp/allworld-main-baseline.FCmd6o`; exact main above, built separately. Temporary logs/scripts and screenshots on this computer are not automatically available elsewhere.
- Reuse installed dependencies; root and deploy/tooling node_modules symlink to the primary checkout. No dependency lockfile edits.
- Resume: inspect current status and bounded import-graph audit; fix remaining startup budget without raising limits; rebuild once and run cheap startup measurement before full download-size/smoke checks; archive results; fetch/merge latest main; commit/push the checked runtime; record remote SHA. Do not rerun completed source tests or Worker baseline comparisons without changed evidence.
- Preserve local work and named recovery stash. Coordinate source ownership before overlapping edits. Do not reset to main, replay the stash, fabricate missing evidence, or mark production accepted from local results.

## Checkpoint history

- 2026-10-14: research completed, phases implemented, online-main changes integrated preserving festivals/Gist, local receipts and UI verified.
- 2026-10-15 Lagos: final broad checks exposed startup size and quiet-poll regressions. Quiet-poll fix accepted with 20 focused passes; startup repair underway. Shared agent documentation requested and created.

## GitHub synchronization checkpoint

- **Published documentation:** `899c60439022b2cb7082a1e88c930a3e4c41db36` to `origin/main`; remote SHA read back after push. Includes the research corpus, shared protocol, prompts and completed evidence artifacts.
- **Pending runtime milestone:** integrated onto that commit in this checkout. Source includes upstream house-agent/public-romance changes; no conflicts remain. Serialized typecheck, build and compatibility checks pass; final startup budget is in progress.
- **Publication policy:** user requests frequent checked milestones on main. Fetch before each push, integrate concurrent changes, use ordinary fast-forward pushes, record the accepted SHA and next step. Deployment is a distinct action.
- **Evidence archive:** [completed check outputs](../research/retention-evidence-2026-10-15/) now travel with Git. Temporary source probes are not committed test fixtures and require local recreation or transfer to rerun.
