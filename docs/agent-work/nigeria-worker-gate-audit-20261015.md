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
