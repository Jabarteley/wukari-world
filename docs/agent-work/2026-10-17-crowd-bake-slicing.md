# Agent work record

## Identity

- **Work ID:** `2026-10-17-crowd-bake-slicing`
- **Owner:** Claude (perf helper)
- **Model / effort:** Opus / default
- **Thread:** local
- **UTC updated:** 2026-10-17T15:45:00Z
- **Status:** `verified-local`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** no long frames from baking background people (and the neighbourhood's AO on return), with byte-identical output.
- **In scope:** `src/scene/body/canonical-crowd.ts`, `src/scene/body/native-static-lod.ts`, new `src/scene/body/bake-slicer.ts` (+ test), new `src/scene/body/native-static-lod-job.ts`, new `src/scene/body/native-static-lod.worker.ts`, `src/scene/character-lab/native-body.ts`, `src/scene/character-lab/runtime/characters.js` (+ `.d.ts`), `src/scene/build.ts`, `src/scene/ao-bake.ts` (type only), `docs/perf/HITCHES-2026-10-17.md`.
- **Out of scope:** `src/map3d/**` (another agent), live (player/NPC) bodies' synchronous spawn, git.
- **Exclusive file ownership:** the files above, in the `perf` worktree only.
- **Dependencies:** dev server on :5191 for this checkout.

## Repository state

- **Repo / worktree:** Allworld `perf` worktree (`~/Documents/Allworld-notes/work/perf`), uncommitted changes.
- **Port/process ownership:** none (headless Chromium probes were started and stopped per run).

## Progress

### Done and exact evidence

- Time-sliced, pose-captured crowd bake; sliced body spawn; Meshoptimizer in a worker; selective near-detail re-merge with a typed-array merge; AO factors reused for identical inputs. Evidence and numbers: `docs/perf/HITCHES-2026-10-17.md`, section "Background people baking (round 2)".
- Byte identity: page probe hash of every baked crowd/avatar geometry, texture pixels and material properties, including a near-detail swap: `65a578d5` before and after (desktop and CPU x4). AO: all 62 scene builds (neighbourhood, home, every venue kind, twice) hash-identical old vs new in node.
- Typecheck clean; scene tests 271 → 273 (2 new), the same pre-existing failures (34 before, 33 after; one flaky one passed).

### Immediate resume steps

1. Review the diff of the files above; commit on the `perf` branch when the owner of the branch agrees.
2. Production build check (`npm run build`) for the new worker chunk was not run here.
