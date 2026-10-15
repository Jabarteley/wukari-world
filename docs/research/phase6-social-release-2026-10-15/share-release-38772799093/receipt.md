# Protected Share release receipt — run 38772799093

Observed terminal state at 2026-10-15 17:05:28Z. GitHub Actions workflow `38772799093` completed **success** for branch `main`, exact source `6695f00c6779fbfcb69bd21aa8b152d5430a0dca`.

The `Build, check and seal new game` job (`116552703717`) passed policy checkout, immutable source validation, exact-source checkout, policy negative controls, build/download-budget enforcement, fast source smoke, fast Worker runtime checks, package sealing, and artifact upload. Full source checks and full Worker runtime checks were skipped because the authorized dispatch used `full_checks=false`. This receipt does not convert inherited suite exceptions into passes.

The sealed package summary logged by the workflow: package digest `3cd233acad6ece56598672542a4ccdbea78dd27e1b10ff8bade239c417c39ba9`; manifest `manifest.json`; 8,503 files; 286,935,417 total bytes; 284 city payloads; one dictionary payload; largest file 4,905,869 bytes. The uploaded `joinallworld-package.zip` artifact has ID `11992477953`, size 72,843,251 bytes, and outer ZIP digest `100453cffd85b71edf0476ae57964d780d9948fc2cb10f794411154ff9952c90`.

The `Deploy only joinallworld-next` job (`116557414374`) passed artifact retrieval/verification, package revalidation, and deployment. The fixed cleanup-window step was skipped (`cleanup_window=false`). Deploy output explicitly says `No targets deployed for joinallworld-next`; it reports Current Version ID `e6d0bf60-350c-4096-8e7e-29e67d1fe2ce`. This establishes workflow and provider-version results only. It does not prove live health, traffic routing, browser behavior, or cleanup. Parent retains those checks and decisions.

The inner TAR digest value, raw Worker byte count, and manifest identity were not exposed in the available compact logs, so they are not claimed. No artifact ZIP was downloaded, no SQL was run, and no production inventory, health, or browser action occurred in this lane.

Evidence files:

- `initial-snapshot.json` — initial run/job state; SHA-256 `e09430a9107e3f3f2a9144c50b5e4fbfdb025d116da6b331ce9746d4f963d7e1`.
- `build-snapshot.json` — build job state; SHA-256 `43c23dc67c79a69b0376973faedddb8ddd2fe80ccf88a81dcc608eb692ef8bd6`.
- `final-run-snapshot.json` — terminal run and both jobs; SHA-256 `411eb642fcb1c0451ce7329a07b4ed5e04d3bb1c88d756ce3ff06af232fd3caa`.
- `artifacts.json` — GitHub artifact metadata; SHA-256 `40883d20acedf8857173b64289f2d980e69c48cb12e01aa17fe049fc7e35db46`.
- `package-log-extract.txt` — filtered package/archive lines; SHA-256 `b82fdd8f3d4f3e2557a86ca37b51ef49403ad9cd16e1020c4c6b41d38b9f24e7`.
- `deploy-log-extract.txt` — filtered archive/deploy lines; SHA-256 `995d25e7517b10c8d245ed1ce7e30bd154d126ef880ec5f690ae29ed76c3b65b`.
