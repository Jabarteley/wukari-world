# Nigeria release: existing Worker content budget audit

- Owner: `/root/worker_gate_audit`; updated 2026-10-15; status: read-only diagnosis complete.
- Scope/ownership: this report only. No source, test, deployment, credential, or other agent record changes. Shared remote checkout `/workspace/joinallworld`, branch `codex/nigeria-runtime-release-20261015`; observed HEAD `59d23b9700b130870085d4f2b2dacfcbf84fc1d1`. Existing dirty integration/test files preserved. No running resources.
- Relevant coordination: `unique-local-content-20261015.md` assigns factory/registry/journey integration to the Research Allworld game retention owner (thread `01a13bea-138b-7b91-ac44-c49bc3d836ec`); that owner stopped at its account-usage floor. `AGENT.md` owns current world-alive phases separately. No external messages sent; root coordinator received findings.

## Evidence

Reproduced the exact esbuild configuration in `scripts/city/worker-content-budget.test.ts` with `write:false`, which changes only disk output, preserving `bundle:true`, `minifyWhitespace:true`, ESM, neutral platform, and external `cloudflare:workers`. Metafile saved on this remote host at `/tmp/nigeria-worker-meta.json`.

Output is **4,680,353 bytes**, matching the parent's clean `60c3dff9` baseline. Assertion requires **strictly less than 3,500,000 bytes**; at least **1,180,354 bytes** must be removed. No Nigeria or runtime-module source appears in the input graph.

| Emitted input | Bytes |
|---|---:|
| local-tales/batch-01.ts | 207,494 |
| local-tales/batch-02.ts | 150,602 |
| local-tales/batch-03.ts | 169,481 |
| local-tales/batch-04.ts | 153,440 |
| local-tales/batch-05.ts | 162,233 |
| local-tales/batch-06.ts | 138,048 |
| **Six batches total** | **981,298** |
| world-progression.generated.ts | 175,968 |
| campus/unilag/map.generated.ts | 331,149 |

Shortest import paths:

- `deploy/cloudflare-worker.js -> cloudflare-worker.ts -> server/routes/index.ts -> routes/retention.ts -> src/game/journeys.ts -> content/local-tales.ts -> six batch modules`.
- Same route through `content/journeys.ts -> world-progression.generated.ts`.
- `deploy/cloudflare-worker.js -> cloudflare-worker.ts -> server/protocol.ts -> campus/unilag/layout.ts -> map.generated.ts`.

The campus map also arrives through `protocol -> walk -> navigation`, which uses boundary, building and water polygons and landscape tree blockers. Merely extracting `ENTRANCE` does not remove this dependency. Likewise stories have multiple consumers (missions, episodes, journeys); changing only the retention route cannot remove their payloads. Latest batch05/06 activation is commit `67e13a8f`; it contributes 300,281 emitted payload bytes. This is attribution, not a claim that it alone introduced the original failure.

## Recommended bounded repair

Keep the existing budget and tests. The smallest credible behavioral repair is to reuse the existing immutable-asset-loader boundary for authored global story content, plus remove the worker's full visual campus map dependency with a generated compact navigation payload or an immutable map asset loader. This needs content/worker ownership coordination and is beyond a Nigeria-only visual change.

Arithmetic sizing (not implementation or passing proof): excluding six batches alone leaves 3,699,055 bytes; excluding batches plus world seeds leaves 3,523,087, still above the limit before replacement loader bytes. Excluding batches plus the map leaves 3,367,906, allowing at most 132,093 bytes for replacement code/data. These estimates omit any additional tree shaking and do not justify removing content, disabling routes, or changing minifier settings in the test.

Required behavior preservation: all accepted 215 cities and country arcs; current and legacy story/mission definitions and saved memento receipts; journeys across previously visited cities; immutable asset hash verification; asynchronous preflight before synchronous storage transactions; fail closed when required content is absent; Node/browser and Worker parity. Campus navigation must preserve the exact server walk/collision decisions, not fall back to permissive bounds. Regression gates should cover cold and warm loads, missing/corrupt assets, old-save journeys, movement parity, existing worker/content tests and unchanged bundle limits.

Next coordinator action: agree a writer with the progression/worker owners (or explicitly take over inactive ownership), implement and verify these data boundaries, then rerun the unchanged gate and full applicable suites. Release remains blocked by this failing gate. No budget relaxation, deployment, source patch, or production certification occurred in this audit.

## Resumed baseline comparison — 2026-10-15

Root requested a read-only comparison after main merged PR24. Baseline `/workspace/nigeria-baseline` safely moved from detached `01186417b5c001db0c04108c4264333064a70b1b` to detached `9af2e51eaf1cf90237c9cf24c49d0f5628ceb8b6`; no tracked dirty files existed, and the untracked dependency link was preserved. Candidate `/workspace/joinallworld` is the same HEAD with Nigeria scene/browser changes. `git diff --name-only 9af2e51e -- server deploy src/game src/campus src/words scripts/city/worker-content-budget.test.ts` returned empty. Own record remains the sole owned tracked edit; no commits requested or made.

Baseline server prerequisites: copied existing generated `dist/assets/cities` and `dist/assets/words` into the baseline's ignored dist directory. Independently verified all 284 copied city payload SHA256s against baseline `content-assets.generated.ts`; no source manifest regeneration. Heavy commands use the repository's shared `agent-slot.ts heavy` lock, without changing slot limits. Candidate and server checks initially queued behind the integration owner's typecheck.

Exact focused command in each checkout:

```
node --experimental-strip-types scripts/agent-slot.ts heavy -- node --experimental-strip-types --test --test-concurrency=1 scripts/city/worker-content-budget.test.ts src/game/comeback.test.ts
```

Baseline result: 15 tests, 14 pass, 1 fail. Worker is **4,822,254 bytes**, +141,901 versus the earlier audit; unchanged strict 3,500,000 limit, requiring at least 1,322,255 bytes reduction. All 14 game comeback cases pass. Raw output: `/tmp/nigeria-gates-9af2-baseline.tap` on this remote host.

The requested server case is run separately in both checkouts:

```
node --experimental-strip-types scripts/agent-slot.ts heavy -- node --experimental-strip-types --test --test-name-pattern='^zero work: not configured, nobody opted in, switched off$' server/comeback.test.ts
```

Current CI policy is unchanged in relevant scope: ordinary push/PR fast checks run typecheck, production build, download budgets and smoke tests, not this full suite; full Node/Worker checks require `workflow_dispatch` with `full_checks=true`. The release workflow also defaults `full_checks=false`. A fast green run does not demonstrate these failing checks passed. No full production build or deployment run occurred in this audit.

Server comparison completed: baseline and candidate both fail the single selected case at `server/comeback.test.ts:368`, message `idle: no store access at all`, actual **2**, expected **0**. Baseline total 6021.866 ms; candidate 4575.855 ms. Logs: `/tmp/nigeria-comeback-9af2-baseline.tap` and `/tmp/nigeria-comeback-9af2-candidate.tap`. These reproduce the earlier failure exactly. Candidate HEAD advanced during the shared work to `9d22df8b9e40d937071f418a63d0c2acb6d01d20`; the audited server/game/Worker paths remain identical to baseline9af2. No new behavior is isolated in these checks. This does not diagnose which heartbeat subscriber causes the two transactions and is not a passing gate.

Candidate Worker/game comparison now completed under the shared lock: **15 tests, 14 pass, 1 fail**, total6542.996ms. Worker is exactly **4,822,254 bytes**, identical to clean9af2 baseline; game comeback14/14 pass. Final candidate source observed9d22df8b; audited paths still have no diff from baseline. Both selected failures are existing main behavior, not newly introduced by the current Nigeria host changes. All audit processes terminated and heavy slots released. No product edits, cap changes, commits or deployment.

Raw remote evidence SHA256:

- `/tmp/nigeria-gates-9af2-baseline.tap`: `8ce14cab9150baf93b91a10d468964bd5a6631afacc42bf65168aae6c4888cdf`
- `/tmp/nigeria-gates-9af2-candidate.tap`: `fc93721be0f2a48046ddc1a05dc14ea9ec367051a60b90065d2a7b5b04dc3747`
- `/tmp/nigeria-comeback-9af2-baseline.tap`: `da8746e8c4155181987f98ba3ebbfe828d64d51d8407fa684fe7d3c24a5bae88`
- `/tmp/nigeria-comeback-9af2-candidate.tap`: `71577efcb9851f61272fc4fcea157367daf364d5633d80945b5fadbffa56b2ef`
