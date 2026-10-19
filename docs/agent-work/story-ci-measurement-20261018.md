# Story CI measurement — 18 October 2026

## Identity

- **Work ID:** `story-ci-measurement-20261018`
- **Owner:** Codex delegated CI measurement
- **Role / effort:** `CI audit / bounded read-only collection`
- **Thread:** delegated unit
- **UTC updated:** `2026-10-18T10:49:00Z`
- **Status:** `complete`
- **Work state:** `implementation` (read-only evidence collection)

## Goal and boundaries

- **Goal:** Measure hosted CI for exact story phase 2 source commits `dd7ce2bad34bb67866d78bb98a3e6791bbb6970b` and `d743f42773bcfa2d1997e7a511d1478790f92a5d`, and retain each exact app artifact separately.
- **In scope:** Previous GitHub run `39112415397` and its preserved evidence; new workflow dispatch for exact pushed head `d743f42773bcfa2d1997e7a511d1478790f92a5d`, terminal logs, budget readings, artifact zip and archive integrity.
- **Out of scope:** Factory/prefetch successor proof, source edits, builds, tests, local app/server/browser use, deployment or other remote mutation.
- **Exclusive file ownership:** This work record and `docs/agent-work/story-mode-evidence-20261017/prep/phase2-dd7ce2ba-ci-measurement-20261018.json`, `docs/agent-work/story-mode-evidence-20261017/prep/phase2-d743f427-ci-measurement-20261018.json`.
- **Input contract:** Hosted workflow run URL provided by coordinator; exact source SHA above.
- **Output contract:** Preserve prior dd7ce2ba evidence; add d743f427 JSON with run/job conclusions, byte budgets, warnings, exact artifact hash and length, and explicit limits.
- **Dependencies:** GitHub CLI read access; repository coordination instructions.

## Repository state

- **Repo:** `kromate/joinallworld`
- **Host:** local CLI
- **Branch / worktree:** `story/phase2-scenes` in `/Users/anthonyakpan/work/joinallworld-story`
- **Base:** `e2902d19` via `0fd6606a` (per integration owner; verify ancestry separately if needed)
- **Current commit:** `d743f42773bcfa2d1997e7a511d1478790f92a5d`
- **Dirty status:** dirty before task; future factory/runtime/prefetch and other lane files remain untouched; only this record and authorized measurement JSON are owned here.
- **Port/process ownership:** none; no service started or stopped

## Progress

### Done and exact evidence

- Read this checkout's root `AGENTS.md`, current coordination index, story-mode work record and work-record template, plus required model-routing reference.
- GitHub run `39112415397` is completed successfully on exact head `dd7ce2bad34bb67866d78bb98a3e6791bbb6970b`.
- Direct hosted log measures startup 613328 raw / 222326 gzip / 195333 Brotli; scene host 78890 raw / 29899 gzip; first paint 90452 raw / 35208 gzip. Each is within its unchanged cap.
- Artifact metadata: ID `12130009626`, name `story-bundle-dd7ce2bad34bb67866d78bb98a3e6791bbb6970b`, reported size 43820225 bytes, API digest `sha256:3206ee46bdada2691bdc66591d93f84bc20f4c8b0adbf6ef91374842ec455a1f`.

### In progress / blockers

- Both exact-head hosted CI runs and artifact archives are complete. New run `39117886962` succeeded on `d743f42773bcfa2d1997e7a511d1478790f92a5d`; typecheck, build/smoke and policy passed. Full, UI, host acceptance, Node, Worker and integration-repair jobs were skipped by `full_checks=false`. The later authorized focused host-kit reader group passed 8/8 in one heavy-slot command; source and fixture hashes match before/after.

### Immediate resume steps

1. Parent reviews the d743f427 CI receipt and focused host-kit reader receipt; no additional run is pending.

## Release state

- **Local implementation:** `not-started`
- **Deployment:** `not-requested`
- **Release gate:** Measurement only; no release action authorized or performed.
- **References:** `docs/agent-work/story-mode-20261017.md`

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| `2026-10-18T08:55:00Z` | `active` | Confirmed exact-head CI success and direct size readings; began artifact retrieval. | GitHub run `39112415397`; artifact ID `12130009626` | Verify complete artifact and inspect graph |
| `2026-10-18T09:01:00Z` | `complete` | Verified dd7ce2ba artifact digest and archive, emitted static/dynamic closures, lazy helper coalescing, unchanged budgets and only historical circular warnings. | `prep/phase2-dd7ce2ba-ci-measurement-20261018.json`; `/tmp/story-catalogue-dd7ce2ba-artifact.zip` | Preserve evidence and continue with pushed follow-up |
| `2026-10-18T09:02:00Z` | `active` | Verified pushed phase2 head d743f427, read current coordination and scoped this hosted CI run. | `git rev-parse HEAD`; `.github/workflows/ci.yml` input contract | Dispatch hosted CI, verify returned exact head |
| `2026-10-18T10:20:00Z` | `complete` | d743f427 CI succeeded; all three active checks passed, optional jobs skipped, budget values and exact artifact archive verified. | `prep/phase2-d743f427-ci-measurement-20261018.json`; `/tmp/story-catalogue-d743f427-artifact.zip` | Parent review |
| `2026-10-18T10:36:00Z` | `complete` | Ran the one authorized host-kit reader group under the granted heavy slot; 8/8 passed and all nine source/fixture/wrapper hashes stayed identical. | `prep/host-kit-reader-parent-focused-20261018.json` and `.log` | Parent review; canonical audit remains separate |


## Focused physical-kit validator and reproduction whitelist — 18 October 2026

The sole authorized heavy-slot invocation completed once and exited 0. The slot returned at terminal. `assets.ts` SHA-256 before and after is `c928abc1d662215079a369013c2cb9eaed648bbadaed3400dbee2ba92c899d30`. Its synthetic validator reported direct and quantized-wrapper geometry with unchanged packed/BIN hashes; 13 hierarchy refusals, 10 malformed documents, corrupt compression, and 8 invalid provenance records were exercised, with no asset files written. Exact output is preserved in `story-mode-evidence-20261017/prep/physical-kit-validator-focused-20261018.log`.

The adjacent JSON receipt records the one-command result and a hash-complete whitelist for the existing fourteen-kit CLI, all fourteen durable styles, and the fourteen GLB plus fourteen report files. Existing report `scriptsSha256` values reconstruct to `68bc52bcb9c76a96b5a18987401ae33e50d9844447929c0e6d8d32cf0014f152`. Current CLI source files `assets.ts`, Blender `kit.py`, `shared.py`, `construction.py`, and the hashed `market_sample.py` are untracked in this checkout; the listed kit/style/manifest evidence files are also untracked. The Blender default `/Applications/Blender.app/Contents/MacOS/Blender` is host-private; another host must resolve its own executable. Build reproduction, Blender, canonical measurement, and production acceptance were not performed. Costs remain unknown.

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| `2026-10-18T10:49:00Z` | `complete` | Ran the single granted asset-validator self-test, returned the heavy slot, and prepared the read-only fourteen-kit source/provenance whitelist. | `prep/physical-kit-validator-focused-20261018.json` and `.log` | Parent review; no retry or build authorized in this unit |
