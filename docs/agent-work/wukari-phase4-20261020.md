# Phase 4 FUW data transfer

Checkout /workspace/wukari-world; base feat/wukari-audit-offline-import at 43fb0031f189c569c90c5601ff8ca7419c523f4e, remote verified. Branch feat/fuw-data-transfer. Read AGENTS/current coordination and Phase3 owner handoff. Scope: new transfer/coverage tools, their tests, Phase4 docs/evidence; extend existing utilities only when necessary. No conflicting ownership on new paths. Preserve all PRs, prior work and game/economy/persistence. No merge/deploy/deletion.

Goal: acquire genuine FUW data using existing acquisition; if blocked, provide a tested single-file transfer route that feeds existing offline importer, and precise reproducible missing-input evidence. Navigation requires real suitable public ground, never generated fixtures. Existing whole-suite baseline remains failing; use focused geographic/regression checks and serial typecheck. Next: existing acquisition plus permitted provider probes, implement transfer validation and coverage report.

## Implementation checkpoint

Existing acquisition freshly attempted: two timeout + one502 failures; alternative discovery timeout, providers CONNECT403; structured evidence committed separately from geographic data. No FUW geometry available. New transfer.ts pack/receive preserves exact source/receipt bytes and hashes, verifies upload integrity, reuses existing offline importer, journals rejection, limits file sizes and refuses overwrite/synthetic imports. New coverage.ts and generated FUW_COVERAGE_REPORT.md distinguish counts/reference connectivity from walkability/campus completeness. Eight new tests; 35 geographic tests pass, branch safety5 pass, strict focused types/source verification/build/smoke18/runtime13/Chromium desktop+mobile pass. Full serial typecheck pending. Browser screenshots administrative context only. Exact external transfer procedure in DATA_TRANSFER.md, complete ten-file inventory in PHASE4_STATUS.md.

Resources: inherited dev servers/main broad-suite runner preserved, no new persistent service. No main/previous-branch/DB/economy changes. Next: final typecheck, feature push and stacked draft review; external FUW package required before playable work.

## Final validation

Whole-project serial typecheck completed: five projects clean, zero TypeScript/Vue errors. All 35 geographic/transfer tests pass after final edits, report reproduces byte-for-byte, base remote remains 43fb0031f. Scope remains the reproducible data-transfer outcome; no sourced campus portion or playable state exists. Ready for feature push and stacked draft PR.
