# Retention and worldwide journey implementation

## Identity and current state

- Work ID: `retention-20261014`
- Owner: Research Allworld game retention; Codex chat `01a13bea-138b-7b91-ac44-c49bc3d836ec`; integration owner `/root`.
- Status: **active — final local integration checks**. Implementation through Phase 6 exists; startup download repair is in progress. No production deployment or measured retention improvement is claimed.
- Checkpoint: 2026-10-14 23:10 UTC (2026-10-15 00:10 Lagos). Recheck this timestamp and source on takeover.
- Canonical implementation checkout on this computer: `/Users/anthonyakpan/.codex/worktrees/retention-phase-zero/JoinAllworld`.
- Research corpus: `/Users/anthonyakpan/Desktop/JoinAllworld/docs/research/`.
- Git: detached HEAD `8ac05891c117ed32f1629757d60893f0e543095e`, fetched from online main. Implementation is uncommitted and unpublished. `git status --short` is authoritative for all changed/untracked paths.
- Recovery: stash labelled `retention implementation before main 8ac05891 integration` remains retained; it was already reapplied. Do not pop it again over the working implementation.
- Local coordination documents are mirrored to the primary checkout for other local agents. This does not synchronize source or documents to another computer.

## Goal and boundaries

Build reasons for humans to return: durable mission rewards, readable progress, permanent achievements, branching stories, cooperative projects, optional cadence, and reusable country/city/place journeys. Keep agent play compatible with the current runtime, preserving earned money and its existing ranking policy.

Research covers 141 verified award recognitions from 144 main catalogue entries, plus historical comparators and human motivation. New authored content is two Lagos/UNILAG episodes and two project occurrences; worldwide reusable definitions are not authored stories for every country.

User authorized implementation, isolated worktree/main refresh, affected existing test edits, UI fixes and parallel cheaper agents. User subsequently authorized frequent reviewed commits and pushes to GitHub main. Production deployment remains outside this request. Phase 5A/5B source flags default off and season start defaults unset; preview-only flags are enabled for QA.

## Ownership and dependencies

- Integration owner: progression/persistence/authority, final browser checks, docs/research phase tracker and handoff, `server/routes/core.ts`, this record and shared coordination index.
- `/root/phase0_mission_rewards` (Sol): currently owns the browser progression loading repair: `src/game/systems/{base,browser,index}.ts`, new progression pack/gate/slice files, `src/client.ts` feature-rule gating and `src/app/state/panelBodies.ts`. Parent must inspect and verify before accepting.
- `/root/episode_engine` (Sol): completed episode/project/cadence engines, disposable progression acceptance probe, and quiet-poll fix. No active file claim after its final response.
- `/root/world_journey_pattern` (Luna): completed reusable journey projection, fixture catalogue updates, and coordination template/prompts. No active source claim after its final response.
- Other computer's agent-play owner: not identified by branch/PR/chat. Compatibility is against online main above. Do not assume unpublished work on that computer is integrated.
- Shared API boundary: trusted request execution origin comes from runtime credentials; progression consumes it. Human-day/rhythm/season enrollment excludes known automation. Ordinary agent earnings and runtime permissions remain governed by existing rules.

## Implemented and evidenced

See the [phase tracker](../research/allworld-retention-implementation-phases-2026-10-14.md) and [implementation handoff](../research/retention-implementation-handoff-2026-10-14.md). Those documents' joined-check status is being refreshed; current facts below take precedence over older pending/passed summaries.

- Mission completion creates durable entitlements separate from collection; rollover, caps, retries and period attribution are covered by focused checks.
- My Life contains Today, My Story, Achievements and My People. Six permanent achievements support three pins and one home plaque.
- Two definition-driven four-chapter episodes and two owner-deduplicated shared project occurrences support solo/quiet fallbacks and permanent mementos.
- Optional meaningful-day rhythm preserves lifetime/best recognition and a bounded rest day. Daily display milestones retain existing reward amounts. The first configured 28-day season has explicit enrollment, a finite collection and in-app intentions.
- Five-project typecheck passed and production build passed before the latest loading/copy fixes. Final build/typecheck still required after the loading repair.
- `/tmp/allworld-integrated-project.log`, `...-cadence.log`, `...-season.log`: real local HTTP rollback/retry, scope and receipt probes PASS. Season eligibility includes seeded canonical receipts; it is not a full human story playthrough.
- `/tmp/allworld-progression-acceptance.log`: direct-engine PASS for both stories' Help/Work routes, prerequisite, solo finales, duplicate finish, permanent mementos, explicit/no-clock reconstruction, achievement pin/plaque and Lagos-to-Ibadan preservation. Script is `/tmp/allworld-progression-acceptance.ts`.
- `/tmp/allworld-poll-focused-tests.log`: trust + failed-write existing tests 20/20 after the quiet-poll fix. `/tmp/allworld-registry-final.log`: 13/13. `/tmp/allworld-phone-art-final.log`: focused artwork assertion passes.
- Browser after the loading change: the actual midnight rollover preserved yesterday's completed ₦250 mission. Collection removed the entitlement once, reload retained that result, and lifetime collections is one; the new day remains 0/60 display points. Real travel earned Wayfinder; pin, home plaque and reload persist. Rhythm opt-in starts at zero; actual travel records one day; season enrollment and a saved project intention persist. Intention Continue opens My People. 320/375/1280 layouts checked; tabs are 44px high and the 320px layout uses two rows. Screenshots: [UI evidence](../research/retention-ui-evidence-2026-10-14/).

## Open checks and known findings

1. Startup budgets: integrated 657346 raw / 234233 gzip / 204909 brotli exceeds limits 615000 / 223000 / 195600. Exact clean main passes at 612287 / 221302 / 193913. The new eager progression engine adds about 45k raw. The Sol worker implemented strict browser stand-ins and a before-reconstruction load gate, reusing the campus pattern; final typecheck/build/budgets are pending. Budgets remain unchanged.
2. Broad Node run `/tmp/allworld-integrated-tests.log` is still in progress (exec session 32131); it started before the latest focused repairs. Do not rerun it blindly. Finish it and classify failures, then run affected existing checks after final changes.
3. Broad Worker run `/tmp/allworld-integrated-edge.log`: 190 tests, 185 pass, five fail. Four Durable Object eviction failures reproduce unchanged on exact clean main (`/tmp/allworld-main-baseline-edge.log`). The row-budget failure needs a focused rerun after the quiet-poll repair.
4. Exact clean-main comparison `/tmp/allworld-main-baseline-regressions.log` also reproduces three Node failures: comeback zero-work, deterministic new-player money expectation, and two-player growth-key expectation. Leave unrelated expectations intact; report inherited failures honestly.
5. Final evidence must include final build/typecheck/startup budgets, browser reload with preserved progression after the lazy-load repair, and refreshed phase tracker/handoff. Real cohorts, production and physical-phone coverage remain separate future gates.

## Resources and safe resumption

- Task-owned local preview: `http://127.0.0.1:5176/`, `node --experimental-strip-types scripts/dev.ts --port 5176`, exec session 8613, log `/tmp/allworld-retention-preview.log`. Local flags: rhythm and milestones enabled, season start day 20740. Preserve its isolated `.data`.
- Existing unrelated services on 4427/4428/4448/4400 are not owned by this task.
- Clean baseline source archive (not a managed worktree): `/tmp/allworld-main-baseline.FCmd6o`; exact main above, built separately. Temporary logs/scripts and screenshots on this computer are not automatically available elsewhere.
- Reuse installed dependencies; root and deploy/tooling node_modules symlink to the primary checkout. No dependency lockfile edits.
- Resume: inspect this checkout's git status and active worker status; obtain Sol's loading repair result; review strict nonfresh-record guards; run targeted checks and one final production build; measure startup budgets; reopen preview and verify the saved earned badge/season; rerun the Worker row-budget case; update this record and handoff with exact outcomes.
- Preserve local work and named recovery stash. Coordinate source ownership before overlapping edits. Do not reset to main, replay the stash, fabricate missing evidence, or mark production accepted from local results.

## Checkpoint history

- 2026-10-14: research completed, phases implemented, online-main changes integrated preserving festivals/Gist, local receipts and UI verified.
- 2026-10-15 Lagos: final broad checks exposed startup size and quiet-poll regressions. Quiet-poll fix accepted with 20 focused passes; startup repair underway. Shared agent documentation requested and created.

## GitHub synchronization checkpoint

The user requested frequent synchronization to GitHub main. A docs-only milestone is being prepared from remote main `c921b8d946d31ea634f10e6395f130a8a1a46ca8` in `/Users/anthonyakpan/.codex/worktrees/retention-main-sync/JoinAllworld`, branch `codex/retention-main-sync`. This first milestone shares research and coordination; the runtime implementation remains in the retention worktree until its final checks pass. Main now includes house-agent/public-romance changes that must be integrated before publishing runtime changes. Preserve the primary checkout's dirty source. No force push or production deployment.
