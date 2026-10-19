# Agent work record

## Identity

- **Work ID:** `20261019-os-phase0-evidence`
- **Owner:** Claude (open-source plan, Phase 0)
- **Model / effort:** Sonnet 5.5 / default
- **Thread:** local subagent of the integrator
- **UTC updated:** 2026-10-19T00:00:00Z
- **Status:** `active`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** Build the evidence tools for the open-source plan: scorecard, screenshot harness, pixel inspector, bot walk, frame table, critic prompt, skills.
- **In scope:** `docs/EVIDENCE.md`, `docs/evidence/`, `scripts/evidence/`, `.claude/skills/`, an additive section in `docs/AGENT-PROMPTS.md`, one glob in the `test` script of `package.json`.
- **Out of scope:** any game source, `.gitignore`, `src/budgets.ts`, `vite.config.ts`; no deploy, no push to main.
- **Exclusive file ownership:** `docs/EVIDENCE.md`, `docs/evidence/**`, `scripts/evidence/**`, `.claude/skills/**`, `docs/agent-work/os-phase0-evidence-20261019.md`; additive edits to `docs/AGENT-PROMPTS.md`; the test glob in `package.json`.
- **Input contract:** a running `npm run dev:open` server (port 5211) opened with `?diagnostics` (the page then exposes `window.__jaw`).
- **Output contract:** the files above, three anchor PNGs, unit tests, a pushed branch `claude/os-p0-evidence`, a CI run.
- **Dependencies:** none.

## Repository state

- **Repo:** joinallworld, git worktree outside the Desktop checkout
- **Host:** the owner's Mac
- **Branch / worktree:** `claude/os-p0-evidence`, worktree under the notes folder `work/os-p0-evidence`
- **Base:** `090f1e97b`
- **Current commit:** see git log
- **Dirty status:** only the owned paths above
- **Port/process ownership:** dev:open on 5211 and one headless browser, both started and stopped by this work; none left running.

## Progress

### Done and exact evidence

- Read the plan, the learnings and the dev docs.

### In progress / blockers

- `.gitignore` line 10 (`evidence/`) hides every folder called `evidence`, including `docs/evidence/` and `scripts/evidence/`. Files are added with `git add -f`. Integrator request: change the line to `/evidence/` and add `docs/evidence/out/`.

### Immediate resume steps

1. `git log --oneline -10` in the worktree to see what is committed.
2. Run `node --experimental-strip-types --test scripts/evidence/*.test.ts`.

## Release state

- **Local implementation:** `active`
- **Deployment:** `not-requested`
- **Release gate:** integrator review; CI budget lines all ok
- **References:** `docs/OPEN-SOURCE-PLAN.md` Phase 0

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-19 | active | Work record opened | this file | start the dev server and build the harness |
