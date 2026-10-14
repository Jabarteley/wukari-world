# Retention implementation handoff (2026-10-14)

Local source now covers the retention sequence through Phase 6. The worktree is detached at `8ac05891`, fetched from online `main`; local changes were retained through a recoverable stash and reapplied. Conflicts in `routes/index`, panels, and `growth.test` were resolved while preserving the new festivals/Gist and retention changes. Final joined checks are restarting on this base.

- Phase 0 preserves mission entitlements, set rewards, actor provenance, and human-return attribution.
- Phase 1 adds the passport surface over domain-owned progress.
- Phase 2 adds six permanent character achievements.
- Phase 3 contains two authored Lagos/UNILAG episodes with definition-owned proof and solo fallbacks.
- Phase 4 contains two authored Lagos/UNILAG project occurrences with namespaced proofs and travel-safe claims.
- Phase 5 contains separate display-only daily milestones (5A) and meaningful-day rhythm (5B).
- Phase 6 adds the second Lagos episode/project plus the finite `ng:lagos:akoka-chapters` collection and reusable country/city/place definition seams.

All authored pilots remain Lagos/UNILAG. The reusable seams do not imply worldwide playable or story-authored content. Permanent episode, project, achievement, and journey receipts remain owned by the same character and follow travel with its `CityLifeRecord`; independent archived lives are not merged.

The retention route is registered in the shared route list. `GET /api/retention` returns rollout flags, rhythm view, optional daily milestones, journey collections, and season view. `POST /api/retention/rhythm` handles explicit human rhythm opt-in/out. `POST /api/retention/season` handles explicit human join, claim, and reminder operations. Agent-origin and agent-character requests are refused for these human-only mutations. Existing agent projections continue to expose achievements and episodes through `get_goals`; the game action catalogue retains authored episode actions and server-only project handling. No ordinary agent permission or ranking policy was changed.

Operator rollout inputs are environment-owned: `RETENTION_DAILY_MILESTONES`, `RETENTION_RHYTHM`, `RETENTION_OUTAGE_DAYS`, and `RETENTION_SEASON_START_DAY`. Defaults are `dailyMilestones: false`, `rhythm: false`, no verified outage days, and `seasonStartDay: null`. A season cannot open until a valid start day is configured. 5A and 5B must be evaluated as separate cohort gates; enabling one does not enroll the other. There is no measured D7/D30 lift, production proof, or authorised release in this handoff.

Bounded evidence already available: `/tmp/allworld-final-regressions.log` reports 20/20 passes, including fixes for no-clock `createLife(saved)` clearing durable slices and quiet polling being falsely durable; `/tmp/allworld-integrated-project.log`, `/tmp/allworld-integrated-cadence.log`, and `/tmp/allworld-integrated-season.log` each report PASS for their real HTTP route, rollback/retry, authority, receipt, and travel checks. Earlier five-project typecheck/build evidence belongs to the old base and is not current. Browser captures in `docs/research/retention-ui-evidence-2026-10-14` predate the latest base sync and used experimental QA flags on a local port; they are not current browser acceptance.

Remaining integration acceptance is the joined current-base build/typecheck and focused test evidence, route and state behavior after reload/travel, desktop and small-screen passport/browser checks, Worker compatibility, concurrent and repeated project contributions, quiet-city fallbacks, agent-origin attribution, and the explicit rollout decision. Local QA flags do not alter source or production defaults. Until those checks pass, the implementation remains local source only.
