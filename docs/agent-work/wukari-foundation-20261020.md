# Wukari geographic foundation

- Owner: Codex; work ID `wukari-foundation-20261020`; status: active implementation.
- Checkout: `Jabarteley/wukari-world`, cloud workspace, branch `feat/wukari-geographic-foundation`.
- Base/current source: `4d229318e67667970b157e4798c533c4b5be0fad`; initially clean.
- Goal: audit upstream and implement a campus-first, accurately attributed geographic ingestion and development preview milestone.
- Owned paths: `docs/wukari/`, `scripts/wukari/`, `src/wukari/`, `data/wukari/`, and this record. Existing city registry, gameplay, map renderer and notices remain intact.
- Inputs: user request and attached `WUKARI_LIFE_CODEX_HANDOFF.md`; external sources must be retrieved and verified before being represented as real data.
- Acceptance: distinct campus/town/LGA extents, pinned provenance, retained WGS84 precision and source IDs, tested projection/import, explicitly development-only preview if city contract cannot be met.
- Dependencies: public geographic source availability; no credentials needed for local guest gameplay.
- Resources owned: development process on port 5173 and baseline `npm run check`; only these processes may be stopped by this task.

## Evidence and state

- `npm ci --cache /workspace/.npm-cache --no-audit --no-fund`: 91 packages installed; Node 24.19.0 / npm 11.9.0.
- Baseline typecheck: five projects, zero errors.
- Baseline production build: completed; upstream circular/manual-chunk and mixed import warnings.
- Baseline dev smoke: 295 checks, 578 requests, all 284 cities; development-only production checks skipped by runner.
- Baseline full Node suite: running; final outcome to be recorded.
- Environment install/start configuration saved in draft; publication not performed.
- Implemented the 23-file foundation and documentation listed in `docs/wukari/CHANGES.md`; no existing tracked source or lockfile changed.
- New tests 8/8, repository integration smoke 18/18, release policy 5/5, whole-project typecheck and focused strict types pass. Isolated preview builds and Chromium desktop/mobile renders pass.
- Full broad baseline suite is still running and has existing defects; source mapping import remains blocked by HTTP 403. Detailed results: `docs/wukari/VALIDATION.md`.
- Owner explicitly authorized committing/pushing this branch and opening a draft PR in the latest request. No merge to main is authorized.
- Read-only Git access to the exact fork works. GitHub API read returned Forbidden; `api.github.com` was added to the environment draft alongside the three geographic hosts. Saving does not apply runtime networking.

## Next steps

1. Audit generator, geographic sources, projection and renderer; retrieve source data where available.
2. Implement and test isolated geographic foundation and development preview.
3. Record exact files/results and remaining verification gates before review. Do not merge to main.
