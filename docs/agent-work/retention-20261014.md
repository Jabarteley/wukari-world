# Retention and worldwide journey implementation

## Identity and current state

- Work ID: `retention-20261014`
- Owner: Research Allworld game retention; Codex chat `01a13bea-138b-7b91-ac44-c49bc3d836ec`; integration owner `/root`.
- Status: **complete — bounded implementation and GitHub source handoff**. Phases 0–6 are committed and published, including concurrent cache-first main changes. Local build/typecheck/size/smoke acceptance is complete; the documented broader-suite findings and rollout gates remain separate. No production deployment or measured retention improvement is claimed.
- Checkpoint: 2026-10-14 23:46 UTC. Recheck this timestamp and source on takeover.
- Canonical integration checkout: `/Users/anthonyakpan/.codex/worktrees/retention-main-sync/JoinAllworld`, branch `codex/retention-main-sync`. Original implementation and recovery copy: `/Users/anthonyakpan/.codex/worktrees/retention-phase-zero/JoinAllworld`.
- Research corpus: `/Users/anthonyakpan/Desktop/JoinAllworld/docs/research/`.
- Git: retention implementation committed as `bcbfd549cb5d4e28b57003ae0eb741708bf81a77`. Latest main `b8e4f8f0` (cache-first reads and model-router cap) merged cleanly in `376285c0314dba05e0703a4e43b8666037384c8e`. This combined runtime is published to `origin/main`; ordinary push succeeded and remote SHA was read back exactly. Final build, five-project typecheck, 17 smoke checks, 22 cache checks and full download report pass. Research/docs milestones `899c6043` and `94bd77d4` are already on main.
- Recovery: stash labelled `retention implementation before main 8ac05891 integration` remains retained; it was already reapplied. Do not pop it again over the working implementation.
- Local coordination documents are mirrored to the primary checkout for other local agents. This does not synchronize source or documents to another computer.

## Goal and boundaries

Build reasons for humans to return: durable mission rewards, readable progress, permanent achievements, branching stories, cooperative projects, optional cadence, and reusable country/city/place journeys. Keep agent play compatible with the current runtime, preserving earned money and its existing ranking policy.

Research covers 141 verified award recognitions from 144 main catalogue entries, plus historical comparators and human motivation. New authored content is two Lagos/UNILAG episodes and two project occurrences; worldwide reusable definitions are not authored stories for every country.

User authorized implementation, isolated worktree/main refresh, affected existing test edits, UI fixes and parallel cheaper agents. User subsequently authorized frequent reviewed commits and pushes to GitHub main. Production deployment remains outside this request. Phase 5A/5B source flags default off and season start defaults unset; preview-only flags are enabled for QA.

## Ownership and dependencies

- Integration owner: progression/persistence/authority, final browser checks, docs/research phase tracker and handoff, `server/routes/core.ts`, this record and shared coordination index.
- `/root/phase0_mission_rewards` (Sol): loading repair delivered; source ownership released to parent. Read-only startup import-graph audit completed. Parent accepted the host listener guard, atlas lookup and calendar export splits. No active worker source claim.
- `/root/episode_engine` (Sol): completed episode/project/cadence engines, disposable progression acceptance probe, and quiet-poll fix. No active file claim after its final response.
- `/root/world_journey_pattern` (Luna): completed reusable journey projection, fixture catalogue updates, and coordination template/prompts. No active source claim after its final response.
- Other computer’s agent-play programme: [AGENT.md](../../AGENT.md), `claude/world-alive`. Published house-agent/public-romance source is integrated and 74 focused compatibility checks pass. Cache-first is now integrated through `b8e4f8f0`; Phase 11 agent-mission branch work remains outside this source and must be rechecked when published.
- Shared API boundary: trusted request execution origin comes from runtime credentials; progression consumes it. Human-day/rhythm/season enrollment excludes known automation. Ordinary agent earnings and runtime permissions remain governed by existing rules.

## Implemented and evidenced

See the [phase tracker](../research/allworld-retention-implementation-phases-2026-10-14.md) and [implementation handoff](../research/retention-implementation-handoff-2026-10-14.md). Their current implementation/evidence rows distinguish local proof from rollout outcomes.

- Mission completion creates durable entitlements separate from collection; rollover, caps, retries and period attribution are covered by focused checks.
- My Life contains Today, My Story, Achievements and My People. Six permanent achievements support three pins and one home plaque.
- Two definition-driven four-chapter episodes and two owner-deduplicated shared project occurrences support solo/quiet fallbacks and permanent mementos.
- Optional meaningful-day rhythm preserves lifetime/best recognition and a bounded rest day. Daily display milestones retain existing reward amounts. The first configured 28-day season has explicit enrollment, a finite collection and in-app intentions.
- Retention commit before the cache-first merge: five-project typecheck PASS; 84 focused retention/engine/state checks PASS; 74 agent-play/protocol checks PASS; production build PASS; 17 smoke checks PASS; all-city download report PASS. Pre-cache startup: 614255 raw JS / 221428 gzip JS / 194142 Brotli overall. Final combined source passes build, five-project typecheck, 17 smoke, 22 cache checks and full download report across 284 cities: 614596 raw JS / 221567 gzip JS / 194060 Brotli overall, under unchanged limits 615000 / 223000 / 195600.
- `/tmp/allworld-integrated-project.log`, `...-cadence.log`, `...-season.log`: real local HTTP rollback/retry, scope and receipt probes PASS. Season eligibility includes seeded canonical receipts; it is not a full human story playthrough.
- `/tmp/allworld-progression-acceptance.log`: direct-engine PASS for both stories' Help/Work routes, prerequisite, solo finales, duplicate finish, permanent mementos, explicit/no-clock reconstruction, achievement pin/plaque and Lagos-to-Ibadan preservation. Script is `/tmp/allworld-progression-acceptance.ts`.
- `/tmp/allworld-poll-focused-tests.log`: trust + failed-write existing tests 20/20 after the quiet-poll fix. `/tmp/allworld-registry-final.log`: 13/13. `/tmp/allworld-phone-art-final.log`: focused artwork assertion passes.
- Browser after the loading change: the actual midnight rollover preserved yesterday's completed ₦250 mission. Collection removed the entitlement once, reload retained that result, and lifetime collections is one; the new day remains 0/60 display points. Real travel earned Wayfinder; pin, home plaque and reload persist. Rhythm opt-in starts at zero; actual travel records one day; season enrollment and a saved project intention persist. Intention Continue opens My People. 320/375/1280 layouts checked; tabs are 44px high and the 320px layout uses two rows. Screenshots: [UI evidence](../research/retention-ui-evidence-2026-10-14/).

## Open checks and known findings

1. Startup size repair is accepted on retention commit `bcbfd549`. Runtime action-type constants must stay outside `progression-rules` because `actions.ts` imports them eagerly. Mission listener construction is host-guarded; atlas lookup and calendar formatting are split from eager metadata/rules. Existing mission/browser-profile checks pass 11/11; mission/event checks 10/10. Atlas/registry checks pass 19/20: the Antarctica fixture mismatch reproduces on clean `94bd77d4` (3/4 map-entry checks). This baseline failure is documented, not hidden.
2. Broad Node run `/tmp/allworld-integrated-tests.log` on the original 8ac implementation was stopped by its owner after the all-city top-level module barrier stayed CPU-bound for over 24 minutes. It predates final focused repairs and is incomplete, not green. Do not restart the broad run without a new acceptance reason.
3. Broad Worker run `/tmp/allworld-integrated-edge.log`: 190 tests, 185 pass, five fail. Four Durable Object eviction failures reproduce unchanged on exact clean main (`/tmp/allworld-main-baseline-edge.log`). The row-budget failure also reproduces on clean main: current writes four collection rows and baseline writes two; the zero-row invariant fails in both. The count difference is not explained by this test and is not claimed resolved. See the Worker row-budget record.
4. Exact clean-main comparison `/tmp/allworld-main-baseline-regressions.log` also reproduces three Node failures: comeback zero-work, deterministic new-player money expectation, and two-player growth-key expectation. Leave unrelated expectations intact; report inherited failures honestly.
5. Joined-source typecheck/build, focused checks, HTTP diagnostics and browser reload are complete. Saved earned/pinned/displayed Wayfinder and season enrollment persist. Current screenshot is `final-main-achievements.png`, taken after reloading the combined source; evidence is archived as text with hashes. Combined runtime is published at `376285c0`. Real cohorts, production and physical-phone coverage are separate future gates.

## Resources and safe resumption

- Task-owned local preview: `http://127.0.0.1:5176/`, `node --experimental-strip-types scripts/dev.ts --port 5176`, exec session 24161, log `/tmp/allworld-main-sync-preview.log`. Local flags: rhythm and milestones enabled, season start day 20740. DATA_DIR points to the original retention-phase-zero checkout’s isolated `.data`; preserve it. Server source is the canonical retention-main-sync checkout.
- Existing unrelated services on 4427/4428/4448/4400 are not owned by this task.
- Clean baseline source archive (not a managed worktree): `/tmp/allworld-main-baseline.FCmd6o`; exact main above, built separately. Temporary logs/scripts and screenshots on this computer are not automatically available elsewhere.
- Reuse installed dependencies; root and deploy/tooling node_modules symlink to the primary checkout. No dependency lockfile edits.
- Next work: fetch main into a safe checkout, read the final phase tracker and Worker row-budget finding, and register a new bounded work record. Production readiness needs the documented broad-suite findings resolved and physical-device/player pilot coverage; cadence/content expansion needs observed cohort evidence. No coding work remains in this bounded implementation. Do not rerun completed broad suites without a new evidence gap.
- Preserve local work and named recovery stash. Coordinate source ownership before overlapping edits. Do not reset to main, replay the stash, fabricate missing evidence, or mark production accepted from local results.

## Checkpoint history

- 2026-10-14: research completed, phases implemented, online-main changes integrated preserving festivals/Gist, local receipts and UI verified.
- 2026-10-15 Lagos: final broad checks exposed startup size and quiet-poll regressions. Quiet-poll fix accepted with 20 focused passes; startup repair accepted within unchanged budgets. Shared agent documentation created and published.

## GitHub synchronization checkpoint

- **Published documentation:** `899c60439022b2cb7082a1e88c930a3e4c41db36` to `origin/main`; remote SHA read back after push. Includes the research corpus, shared protocol, prompts and completed evidence artifacts.
- **Published runtime milestone:** `376285c0314dba05e0703a4e43b8666037384c8e`, containing implementation `bcbfd549` and upstream `b8e4f8f0`. Push and remote SHA verified. Source includes house agents, public romance and cache-first reads; all final combined local gates listed above pass.
- **Publication policy:** user requests frequent checked milestones on main. Fetch before each push, integrate concurrent changes, use ordinary fast-forward pushes, record the accepted SHA and next step. Deployment is a distinct action.
- **Evidence archive:** [completed check outputs](../research/retention-evidence-2026-10-15/) now travel with Git. Temporary source probes are not committed test fixtures and require local recreation or transfer to rerun.

- 2026-10-14 23:46 UTC: final combined runtime published and remote SHA verified. Final docs/evidence checkpoint follows on main. Local preview remains available on port 5176; no deployment was performed by this task.
