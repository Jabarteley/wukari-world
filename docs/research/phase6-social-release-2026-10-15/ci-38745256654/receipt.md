# CI run 38745256654 — observation receipt

- Observed at: 2026-10-15T13:47:36Z (`date -u`).
- Branch / head: `codex/retention-main-sync` / `82237708000b7ab45e8d36ab5d259793148640b5`.
- Run conclusion: `cancelled` (parent cancelled after identical pre-corpus build failures made remaining work non-informative).
- Job summary: 11 failures, 1 cancelled, 4 skipped; no successful jobs reported at terminal snapshot.
- `release-policy`: package guard test failed because fixture lacked three progression assets; missing-manifest error also caused an assertion mismatch. See `release-policy-job.log`. Parent attributes fixture ownership to Sol.
- Ten build jobs failed at `npm run build`; representative `integration-repairs` log shows campus navigation generated data mismatch on Node.js 24.21.0. Parent attributes local/CI generator drift (local Node 24.14) and has assigned the generator issue to first-person owner. See `integration-repairs-job.log`.
- `full (22)` was cancelled before later checks; corpus and downstream checks did not complete. Fast/UI/host-acceptance jobs were skipped.
- This is failed/cancelled CI evidence; it is not a test pass. No rerun or source/workflow mutation was performed in this lane.
