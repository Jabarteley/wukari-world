# Agent work record

## Identity

- **Work ID:** `2026-10-16-viral-programme`
- **Owner:** the spread programme agent (docs/agent-plans/viral/)
- **Model / effort:** Claude Opus 5.5
- **Thread:** local
- **UTC updated:** 2026-10-16T03:40:00Z
- **Status:** active
- **Work state:** implementation

## Goal and boundaries

- **Goal:** implement and release every phase of docs/agent-plans/viral/PHASES.md in order.
- **In scope:** the phases' files: `src/arena/**`, `server/growth/arena*.ts`, `server/routes/arena.ts`, `src/clans/**`,
  `server/clans/**`, `server/tournaments/**`, `server/agents/join*.ts`, `src/app/features/arena/**`, `src/app/features/agents/**`,
  `scripts/assets/**`, `scripts/cartridge-check.ts`, `scripts/clip*.ts`, `public/assets/packs/**`, `assets-src/**`,
  `docs/agent-plans/viral/**`, and the docs each phase writes.
- **Out of scope:** the native characters, housing studio and first-person work of other agents.
- **Exclusive file ownership:** the paths above that are new in this programme; shared files (`server/registry.test.ts`,
  `src/types/protocol.ts`, `vite.config.ts`, `.github/workflows/ci.yml`) are edited additively and merged with origin/main.
- **Dependencies:** none outside the programme.

## Repository state

- **Branch:** one per phase (`claude/viral-*`), merged to `main` fast-forward only, released by the release workflow.
- **Progress record:** docs/agent-plans/viral/STATUS.md is the source of truth; this record points to it.

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-16T03:40Z | active | Phase 0 baseline | viral/STATUS.md "Baseline" | Phase 1 and Phase A |
