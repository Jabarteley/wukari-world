# Agent work record

## Identity

- **Work ID:** `20261019-ad-phase5-store`
- **Owner:** Claude (Fable 5.1 brief, run as a worktree agent)
- **Model / effort:** claude / default
- **Thread:** local worktree agent
- **UTC updated:** 2026-10-19T00:00:00Z
- **Status:** ready-for-review
- **Work state:** implementation

## Goal and boundaries

- **Goal:** the code side of Phase 5 of `docs/AD-READY-PLAN.md` (On the Play Store): store-ready manifest, `/.well-known/assetlinks.json` on both hosts, an in-site install prompt, and `docs/STORE.md` for the owner's steps.
- **In scope:** `server/site-files.ts` (manifest, assetlinks), the two callers in `server/server.ts` and `deploy/cloudflare-worker.ts`, `server/admin/host.ts` (admin host answers 404), `src/paths.ts` (reserved prefix), `public/icons/icon-maskable-192.png`, `src/app/startApp.ts` and `src/app/startExtras.ts` (the prompt), `src/app/features/start/install*.ts`, tests, `docs/STORE.md`, `docs/REFERENCE.md` line on site files.
- **Out of scope:** pushing, deploying, `wrangler.jsonc`, `scripts/guard-joinallworld-package.mjs`, the Play Console account, the signing key, store screenshots (none exist under `public/`), install counting on the server (the growth source events are a closed list).
- **Exclusive file ownership:** the paths above.
- **Input contract:** `docs/AD-READY-PLAN.md` Phase 5.
- **Output contract:** one commit on this branch; another agent integrates and deploys.
- **Dependencies:** none. `PLAY_SIGNING_SHA256` is a Worker secret the owner sets after the first Play upload.

## Repository state

- **Repo:** JoinAllworld, worktree `.claude/worktrees/agent-a0541092019a552a2`
- **Host:** the owner's Mac
- **Branch / worktree:** `worktree-agent-a0541092019a552a2`
- **Base:** `d87b4d89f`
- **Current commit:** see checkpoint history
- **Dirty status:** dirty, owned paths only
- **Port/process ownership:** none

## Progress

### Done and exact evidence

- Registered. Findings: the manifest and sitemap are made by `server/site-files.ts` for both hosts (not a file in `public/`); no sharp in node_modules (the 192 maskable icon is a copy of the 192 icon, whose artwork already sits inside the safe zone); no store screenshots exist; no standalone privacy page exists.
- Built: manifest completed; `/.well-known/assetlinks.json` on both hosts (404 until `PLAY_SIGNING_SHA256` is a valid fingerprint; admin address 404); install bar (`src/app/features/start/install*.ts`, a lazy chunk; the held offer is the only part in the first download: +133 B raw / +53 B gzip first paint); `install_prompt_*` analytics events in `src/telemetry/events.ts`; `docs/STORE.md`.
- Tests: `node --experimental-strip-types --test server/assetlinks.test.ts src/app/features/start/installPlan.test.ts server/seo.test.ts src/paths.test.ts server/admin/host.test.ts server/host.test.ts server/path-meta.test.ts src/telemetry/telemetry.test.ts scripts/download-budget.test.ts scripts/guard-joinallworld-package.test.mjs` all pass; `deploy/assetlinks.edge.test.ts` passes with `NODE_PATH` and `JOINALLWORLD_TOOLS` set to the notes wrangler folder; `npm run -s typecheck` clean; `npm run build --ignore-scripts` then `npm run -s size:download`: no budget over (the worktree's node_modules symlink makes `scenes:check` in the prebuild fail with "resolves outside the repository": a worktree trap, not this change).

### In progress / blockers

- None. The owner still needs the Play account, the signing key and the secret (docs/STORE.md); a privacy policy page does not exist.

### Immediate resume steps

1. `git log -1` on this branch, then read `docs/STORE.md`.

## Release state

- **Local implementation:** verified-local
- **Deployment:** not-requested
- **Release gate:** integration owner's tests, upgrade check and deploy lock
- **References:** `docs/AD-READY-PLAN.md`, `docs/STORE.md`, `server/site-files.ts`

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-19 | active | registered | this file | implement |
