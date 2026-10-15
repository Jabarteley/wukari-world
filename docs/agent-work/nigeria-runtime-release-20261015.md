# Nigeria runtime integration and release

- Owner: dedicated integration/release lead; source thread 01a13c74-3452-7149-8864-0b9eb47430e3.
- Status: active implementation. User explicitly authorized cloud integration and production batches.
- Host: published Linux cloud execution environment; no Mac execution.
- Checkout: joinallworld; branch codex/nigeria-runtime-release-20261015.
- Base: 81a94cbbd6b5024ae87fb2d1d6b3d11239637ddb; initially clean.
- Owned paths: this record, new src/scene/models/runtime-module.ts and runtime-module.test.ts; new Nigeria-specific integration/evidence paths to be recorded before creation. Existing loaders, WORLD uploader and historical consolidated branch are not owned or changed.
- Inputs: allworld-assets 8d01a5b83ab23a64b621def4784ffd0c93684c81, runtime-nigeria-2026-10 batches 001–003. Start with 001; later batches gated on first actual release.
- Contracts: preserve authored PBR, lazy load, bounded one-module residency, cancellation/disposal, common 1.4 scale for metres to game units, collision/anchors in same transform, near indoors, retain fallback/customization, no exported lighting or driveable static minibus.
- Gates: baseline/candidate tests, unchanged budgets, real host navigation/render/lifecycle evidence, exact tested source release, terminal workflow outcome and matching production health. No gate waiver or additional spend.
- Coordination: read current index and relevant records; no current record claims new adapter paths. No shared source edited yet. Historical WORLD uploader ownership remains preserved; main/release status must be rechecked before publication.
- Capabilities: Node 24.19.0; Chromium 151; gh and git installed; dependencies present; cgroup memory limit 16 GiB. Git read access succeeds to both repositories. gh Actions list returns Forbidden; connected GitHub app read succeeds. No dispatch capability certified yet.
- Running resources: own asset checkout process and baseline scene test process; no service ports.
- Next: verify immutable asset manifests and content, complete adapter tests and investigate supported release access. No deployment requested or claimed.

## Cloud checkpoint 2026-10-15

- Owned evidence scope extended to docs/research/nigeria-runtime-20261015/. Existing scene source remains untouched; adapter has no gameplay import/activation.
- All 3 asset batch hashes and 12 GLBs independently verified. Batch001 was parsed/rendered in real Chromium with actual host light factory: eight day/night near/far images, no reported console/HTTP errors, four stable unload cycles, zero geometry/textures after final teardown. Evidence and exact limitations are in the research directory.
- Baseline 20/20; final candidate 28/28 focused tests. Full baseline CI 38674324832 succeeded. Initial candidate full typecheck failed two fixture image typings; fixed. Supported final serial typecheck is running. Direct tsc without data stubs was unsuitable (heap exhaustion); owned direct attempts stopped.
- Source review corrections: quarter-turn-only yaw preserves axis-aligned collision, explicit host shadow-pass allowance, reject unsupported GLB scenes/primitives/cameras/lights, near indoors and below 30 game-unit distance. One serialized loader and one resident tier; hashes checked before parse; PBR retained; decoded images freed.
- External blockers: gh Actions list and CI dispatch fail Forbidden; production health curl fails HTTP403/CONNECT proxy denial. Supported network permission retry did not restore access. No automatic approval rejection occurred. Need environment operator to allow authorized GitHub Actions API and joinallworld.com HTTPS using the existing connection, not create credentials or bypass guards.
- Integration is incomplete: dedicated host layout/navigation/terrain/camera and actual gameplay acceptance remain. No source merged, production deployment, or batch001 release certificate. Later batches remain gated.
- Next executable step: finish candidate checks and publish isolated draft for review; then implement dedicated host placement, run actual gameplay gates, and deploy through unchanged release workflow only when existing access is restored and all gates pass.
