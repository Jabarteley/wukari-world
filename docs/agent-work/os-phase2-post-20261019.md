# Agent work record

## Identity

- **Work ID:** `20261019-os-phase2-post`
- **Owner:** Claude (open-source plan, Phase 2)
- **Model / effort:** Sonnet 5.5 / default
- **Thread:** local
- **UTC updated:** 2026-10-19T22:00:00Z
- **Status:** `ready-for-review`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** One post stack for the HIGH tier (postprocessing composer, N8AO, bloom, climate grade, vignette, SMAA, tone mapping), delegated to from `quality.ts`.
- **In scope:** `src/scene/fx/post.ts`, `grade.ts` (+ tests), delegation in `src/scene/quality.ts`.
- **Out of scope (narrowed by the coordinator, 2026-10-19):** the first-cut street-light map (`lightmap.ts`) and the spill hooks. It returns later with the baked hero street. `street-kit.ts` and `venues-common.ts` are not touched (they hold no materials anyway).
- **Gates added by the coordinator:** measure the stack on the Mac; if AO is over 3 ms or the whole stack over 5 ms, AO becomes default-off behind `?ao=1`. Report fx chunk raw and gzip from CI. Import only named classes from `postprocessing`.
- **Exclusive file ownership:** `src/scene/fx/post.ts`, `post.test.ts`, `grade.ts`, `grade.test.ts`, `n8ao.d.ts`, `src/scene/quality.ts` (delegation only).
- **Dependencies:** `claude/os-p0b-fx` (owns `src/scene/fx/index.ts` and the budget; not touched here).

## Repository state

- **Repo:** joinallworld, worktree `Allworld-notes/work/os-p2-post`
- **Branch / worktree:** `claude/os-p2-post`
- **Base:** `090f1e97b`
- **Port/process ownership:** none

## Progress

### Done and exact evidence

- Read the code. `createBloom` had no caller before this work (only `ensureEnvironment` is used, by the avatar preview). No venue, street or home host draws through a composer yet; a host adopts `createBloom` (or the fx host) to show the stack.
- `grade.ts` and `post.ts` written with tests: `node --experimental-strip-types --test src/scene/fx/*.test.ts` (22 pass, includes main's `index.test.ts`). Twelve grade fingerprints are pinned in `grade.test.ts`.
- Typecheck: client and test projects clean at 7 GB heap (`npm run typecheck`'s 3.5 GB heap runs out in the test project).
- `quality.ts`: `createBloom` keeps its signature (one optional trailing `grade` argument) and delegates to `fx/post.ts`.
- Street harness (`src/scene/street-harness.ts`, dev only): `?post=1` draws through the stack, `&ao=1` adds AO, `&bench=1` exposes `window.__bench(frames, 'plain'|'post')`.
- CI run 39328266128 (before dropping SMAA): fx chunk 336,874 raw / 161,801 gzip, FX_GZIP over its provisional 120,000. SMAA's images were about 60 kB gzip, so SMAA was replaced by 4x MSAA (commit after that run). CI rerun: 39330014232.
- Standalone Rollup sizes (vite lib build of post.ts, game/ external): postprocessing named classes 267 kB raw / 93 gzip with SMAA, 160 / 33 without; n8ao 174 / 87.

### In progress / blockers

- Frame timings on the Mac were NOT measured: the shared `browser` slot stayed taken by other agents' captures for about 50 minutes (my request was killed unserved). Because the 3 ms AO / 5 ms stack gates are therefore unproven, post AO is default off behind `?ao=1` (`postAoRequested` in `post.ts`). The harness is ready: `street-harness.html?quality=high&post=1&bench=1[&ao=1]&time=dusk&streetlife=on&eye=1`, then `window.__bench(30, 'plain'|'post')` returns ms per frame (with gl.finish).
- CI run 39330014232 (with MSAA, no SMAA): fx chunk 246,265 raw / 105,369 gzip, FX_RAW and FX_GZIP ok. STARTUP_BROTLI over by 56 bytes (196,356 vs 196,300) although STARTUP_RAW is identical to main (613,913) and gzip is lower: brotli noise from chunk hashes, main sat at 196,250. Not caused by a size change in startup code.

### Immediate resume steps

1. When a browser slot is free, run the harness URL above and record ms for plain, post and post+ao at 1080p and 2x; take the before/after pair.
2. If AO is under 3 ms and the stack under 5 ms, make `postAoRequested` default true (`?ao=0` off).

## Release state

- **Local implementation:** `active`
- **Deployment:** `not-requested`

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-19T22:00:00Z | active | Scope narrowed: light map dropped | coordinator message | build grade and post |
