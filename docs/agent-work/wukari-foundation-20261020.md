# Wukari geographic foundation

- Owner: Codex; work ID `wukari-foundation-20261020`; status: active implementation.
- Checkout: `Jabarteley/wukari-world`, cloud workspace, branch `feat/wukari-geographic-foundation`.
- Base/current source: `4d229318e67667970b157e4798c533c4b5be0fad`; initially clean.
- Goal: audit upstream and implement a campus-first, accurately attributed geographic ingestion and development preview milestone.
- Owned paths: `docs/wukari/`, `scripts/wukari/`, `src/wukari/`, `data/wukari/`, and this record. Existing city registry, gameplay, map renderer and notices remain intact.
- Inputs: user request and attached `WUKARI_LIFE_CODEX_HANDOFF.md`; external sources must be retrieved and verified before being represented as real data.
- Acceptance: distinct campus/town/LGA extents, pinned provenance, retained WGS84 precision and source IDs, tested projection/import, explicitly development-only preview if city contract cannot be met.
- Dependencies: public geographic source availability; no credentials needed for local guest gameplay.
- Resources owned: game development process on port 5173, isolated lab on port 5194, and baseline `npm run check`; only these processes may be stopped by this task. Processes may not survive environment publication.

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
- Source checkpoint committed as `fd32633796c016cc104b7e7b031b57bef34df5bb` and pushed to `origin/feat/wukari-geographic-foundation`; `git ls-remote` confirms that exact SHA. Owner's source is now preserved on GitHub; main was not modified.
- Draft PR command prepared and attempted with `gh pr create --repo Jabarteley/wukari-world --base main --head feat/wukari-geographic-foundation --draft`. It failed with `Post https://api.github.com/graphql: Forbidden`; **no PR was created**. Read-only GitHub API also returns Forbidden; do not request a new token merely because API access is denied while Git works.
- PR description is prepared in `/workspace/scratch/wukari-pr-draft-20261020.md` on this host. Recreate it from the brief/validation docs if moving machines; no secret values are present.
- Broad test run is not green and is incomplete at this checkpoint. It reached `src/game/cities/allCities.test.ts`, including expensive shared-contract/generator checks. Runtime log is `/tmp/wukari-check.log` on this host; do not infer completion from earlier lines. New Wukari and integration checks completed separately.

## Next steps

1. Apply the saved `api.github.com` network requirement through environment settings, then retry the prepared draft PR command with its body file. Verify the returned PR URL and draft state; do not merge.
2. Resume/inspect the broad baseline check and record final outcomes separately from passing Wukari checks. Its known failures are documented; no existing source/tests were changed.
3. Apply geographic network settings and retrieve pinned ADM2/OSM data as described in `docs/wukari/GEOGRAPHY.md`. Preserve unknown campus/town extents until supported by reviewed evidence.
