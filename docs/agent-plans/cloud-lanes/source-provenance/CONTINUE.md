# Continue source provenance (parent lane 02)

Only write `docs/agent-plans/cloud-lanes/source-provenance/` on
`codex/cloud-source-provenance-20261013`. Baseline is
`81d9f599d87dfb34adf49cd9337a0b05678e5e0d`. Parent owns integration and all
further launches; WORLD/GRAPHICS/LIVING and the original Blender pipeline retain
ownership. No runtime, shared schema, main, package, deployment or credentials edits.

Inputs read: repository CONTRIBUTING, docs/AGENTS (player API reference), current
concurrency amendment in docs/AGENT-COORDINATION, graphics/assets/world ownership,
coordinator three documents at `6c2885d15d38b9d64501f14d467db9d5c01573b2`, then
FIRST-WAVE and source/geography/rights contracts of the full parent plan at
`844da27a549d30c5148c1cb5b5927b7d0f5bfde6`. Parent lane numbering is canonical:
this is lane 02. Implementation authorization is in the task launch; the older
plan's read-only start does not stop this explicitly authorized bounded validator.

Official research URLs and results are in RESEARCH.md and registry.v1.json.
Research checkpoint `8059643304b47d9b834122adae98d8e186765600` was pushed and
verified with `git ls-remote --heads origin codex/cloud-source-provenance-20261013`.
No paid or geospatial data download, new account/terms acceptance or provider API
request occurred. Official SRTM retrieval failed and remains unresolved.

The first validator smoke check failed because safe-path validation rejected root
filenames containing dots (`pins.json`). Fixed; the next smoke produced:
`ok=true`, `eligibleForProduction=false`, 3 files / 35,342 bytes verified.
This is not the final test receipt. See the final handoff for the final commit;
a document cannot contain its own eventual Git SHA.

Current implementation: strict JSON schema with local references, nine source-family
records, local SHA-256 pins, original synthetic fixture, retained baseline AGPL
license, and offline validator. External inputs remain quarantined or runtime-only.
The fixture is not a surveyed or approved real Lagos block. No production admission
is supported by this version; a registry/schema revision requires parent review.

The focused implementation is complete: **49 passed, 0 failed/skipped/cancelled**,
559.902002 ms, exit 0 on Node 24.19.0. Exact output: `evidence/focused-tests.log`.
The earlier 48-test pass is retained separately; final review added a regression
ensuring failed hashes and false byte counts still consume the aggregate I/O
budget. Test source/schema/registry pins are in `evidence/verification.json`.
No full build, npm test, global compiler rerun or provider data download was run.
Local TypeScript compiler dependencies are absent; Node executed the TypeScript
via built-in stripping. This is not a claim of static typecheck acceptance.

Deliverables and limits are in README.md. Remaining blockers are actual block
selection, per-input acquisition/rights/accuracy, applicable full external terms,
exact notices, ODbL output classification/database offer, original photography
grants, and SRTM rights retrieval. No external input is admitted; a synthetic pass
is not production acceptance. A real-pilot contract requires parent review.

Next owner: verify the final Git SHA from the final response against remote, inspect
only this directory's diff, then read README.md's five explicit next actions.
Preserve v1 at that SHA; do not run the fixture generator to hide modified pins.
Parent decides any further acquisition, integration or launches. There are no
remaining owned servers, browsers, Blender workers or subagents.

Commands from repository root (Node 24.19.0; built-ins only, no npm install):

```sh
NODE_OPTIONS=--max-old-space-size=1536 node docs/agent-plans/cloud-lanes/source-provenance/validate.ts --registry
NODE_OPTIONS=--max-old-space-size=1536 node docs/agent-plans/cloud-lanes/source-provenance/validate.ts
NODE_OPTIONS=--max-old-space-size=1536 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 60s node --test --test-concurrency=1 docs/agent-plans/cloud-lanes/source-provenance/validate.test.ts
```

Busy slot means continue source work; never increase heavy=1 or heap1536 caps. Only the two sub-second focused test runs used the heavy slot. No browser, server,
Blender or subworker was launched by this lane.

Fetch/review without touching an existing worktree:

```sh
git fetch --no-tags origin codex/cloud-source-provenance-20261013
git worktree add --detach /workspace/allworld-source-review FETCH_HEAD
git -C /workspace/allworld-source-review rev-parse HEAD
git -C /workspace/allworld-source-review diff --name-only 81d9f599d87dfb34adf49cd9337a0b05678e5e0d HEAD
```

Require every changed path to begin `docs/agent-plans/cloud-lanes/source-provenance/`.
Do not merge the coordinator commits, main, shared runtimes or other lanes as a side
effect. This branch was created directly at the source baseline; coordinator
commits were fetched only for read-only inspection.
