# Ad-ready Phase 2: every clip is an advert

## Identity

- **Work ID:** `20261019-ad-phase2-clips`
- **Owner:** Claude Fable 5.1 (worktree agent), integrated and deployed by the integration owner
- **Model / effort:** Fable 5.1 / default
- **Thread:** local worktree agent
- **UTC updated:** 2026-10-19
- **Status:** ready-for-review
- **Work state:** implementation

## Goal and boundaries

- **Goal:** Capture can share a photo or clip with a corner mark (`@handle · joinallworld.com`), optional 9:16 crop, the player's profile link with `utm_source=clip`, and a one-tap 6 second "Clip this moment".
- **In scope:** `src/app/features/capture/*`, `src/game/share-model.ts` (optional source word), `src/app/features/growth/ShareSheet.vue` + `src/ui/share.ts` (optional clip media on a prepared share), `server/public-profile-page.ts` and `server/routes/profiles.ts` (carry the ad-source words from `/p/...` to the "Open Allworld" link), telemetry catalogue lines, tests.
- **Out of scope:** `server/gist/*`, wrangler config, deploys, pushes, other phases of `docs/AD-READY-PLAN.md`.
- **Exclusive file ownership:** `src/app/features/capture/**`, `docs/agent-work/ad-phase2-clips-20261019.md`.
- **Input contract:** `docs/AD-READY-PLAN.md` Phase 2 (in the main checkout, not this worktree).
- **Output contract:** one commit on this branch; capture still never requests camera, microphone or network upload.
- **Dependencies:** none.

## Repository state

- **Repo:** JoinAllworld (git worktree)
- **Host:** local Mac
- **Branch / worktree:** `worktree-agent-a53288c059cdb440c`, `.claude/worktrees/agent-a53288c059cdb440c`
- **Base:** `d87b4d89fdfa721f114a0d24168252b2729ab7df`
- **Current commit:** see git log
- **Dirty status:** owned changes only
- **Port/process ownership:** none

## Progress

### Done and exact evidence

- Pure model + tests: `node --experimental-strip-types --test src/app/features/capture/captureShareModel.test.ts server/share-cards.test.ts server/feed.test.ts` (all pass).
- Growth tests still pass: `src/app/features/growth/{components,inviteComponents,growth}.test.ts` (40).
- `npm run -s typecheck` clean; `vite build` + asset steps + `npm run -s size:download`: errors 0, overBudget 0.
- Real Chrome check (headless, throwaway script, not committed): MP4 chosen, photo mark rendered lower right, a 3 s clip re-recorded with the mark in 3.1 s at 404x720 (9:16).

### In progress / blockers

- Not exercised on a phone or Safari. "Clip this moment" is only offered at the player's home (the existing capture gate): a party at home, or a live calendar event from the growth hello (loaded only after a growth screen was drawn). A table match end is not wired (Tables are not at home).
- `npm run build` printed "host scenery.sourceFiles[0] resolves outside the repository" in this worktree (symlinked node_modules); `vite build` and the asset steps were run separately and pass.

### Immediate resume steps

1. Integration owner: review the commit, run the usual gates, deploy. Phone check: Share on Android Chrome and iOS Safari.

## Release state

- **Local implementation:** active
- **Deployment:** not-requested
- **Release gate:** integration owner: build, size:download, smoke.
- **References:** `docs/AD-READY-PLAN.md`, `docs/SHARE-CARDS.md`

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-19 | active | Registered | this file | implement |
