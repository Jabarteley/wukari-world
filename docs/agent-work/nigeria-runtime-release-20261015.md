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

## 03:21 UTC resumed checkpoint

Executor briefly disconnected around 03:20; immediate read retry succeeded and execution resumed in the same checkout. No files lost. Pushed 2983575409c846b6d019152f18e3b3690fde61a1 and opened draft PR24. Full serial repository typecheck completed cleanly: five projects, zero errors. Final budget review corrected repeated double-sided transparent geometry groups to count every draw pass; candidate focused suite now 29/29. Repeated real Chromium diagnostic on final runtime code completed at03:20:57 UTC with eight captures, no reported errors/HTTP failures and zero final geometry/textures. The final source/evidence correction is being pushed on the same isolated branch. PR CI will check the exact head; no runtime activation or deployment occurred. Egress/Actions and host-integration gates remain unchanged.

## Final receipt — 03:30 UTC

- Status: blocked for production; adapter draft verified within its stated scope. Host gameplay integration remains incomplete.
- Published final head: 60c3dff925fc9a2f5a5d995b1f6ab92997e36f7e, draft https://github.com/kromate/joinallworld/pull/24. Merged main7898ec1e without conflicts, then focused tests29/29. All diagnostic source hashes still match the merged checkout.
- Exact-head CI https://github.com/kromate/joinallworld/actions/runs/38675857977 terminal SUCCESS: release-policy, full five-project typecheck, build, download budgets and17/17 smoke tests. Earlier PR runs were superseded/cancelled by the final source update and main merge; no pass is borrowed from them.
- Measured startup598850 raw/217349 gzip/190827 brotli; scene host184134 raw/69584 gzip; loading90502 raw/35235 gzip. All existing limits passed unchanged. These do not certify an activated imported scene: adapter has no game caller yet.
- Cloud-only receipt: /workspace/nigeria-release-evidence/final-receipt.json. This final work-record append is local and deliberately not another CI-triggering source update. Published source, tests and diagnostic evidence are in PR24.
- No owned local browser/server/compiler processes remain; fixture inputs preserved outside the checkout under /workspace/nigeria-release-evidence. No deployment was dispatched. Batch001 remains unreleased;002/003 audited only.
- Resume: implement dedicated placement/host navigation and aggregate gates on this branch, re-fetch main, restore authorized existing Actions/production HTTPS access, then exact-source CI/release and production verification. Do not treat green adapter CI as gameplay or release acceptance.

## Host integration continuation

Explicit parent direction: continue actual batch001 host placement and acceptance. Root owns new src/scene/nigeria-runtime-scenes.ts, public/assets/nigeria-runtime/batch-001/ immutable deployment copies and provenance, city-scenes.ts registration, venue-world.ts bound-aware light/camera updates. Delegated host_runtime owns types.ts and venue-scenes.ts; asset_contract owns new models/nigeria-navigation.ts/tests. Current coordination index reviewed; no current overlapping city scene writer found. Preserve WORLD uploader and historical branches. Production remains gated.

Root additionally owns venue-world-lights.test.ts regression for bounds coverage/direction/reset.

## Actual host checkpoint — 03:49 UTC

- Dedicated lazy host definitions and immutable batch001 asset copies now wired to Lagos market and Abuja National Mosque; actual dimensions, shared1.4 transform, fixed supported nav/collision and fallback support, renderer shadow coverage preserved. Parametric custom designs bypass imported overrides.
- GPU allocation accounting corrected using Three Source+upload/sampler key;14 focused adapter/navigation cases pass. Lighting4/4, host21/21,parametric4/4,contact3/3. Supported full typecheck clean5projects/0errors. Browser latest Abuja near with canonicalplayer and budgetedcrowd16564 visibletriangles; route/tier/lifecycle acceptance still running.
- Newly proven release blockers: Lagos canonicalbody9002+wardrobe1076+near7618=17696triangles beforeoverhead. No supportedheroLODswitch exists; retainplayer andfallback instead of violating17k. Need reviewed lowergeometry Lagosnear candidate, targetbudget determined with actualhost allowance.
- Broad Worker gate fails identically beforeintegration:4680353bytes vs<3500000, noNigeriaimports. Exactcleanbaseline60c3dff9 reproduction saved; progression/map architecture ownedelsewhere requirescoordinatedrepair, notlimitrelaxation. Combinedcity-scenes lifecycle suite also reproducesbaselinependingpromise timeout; changedreadiness subsets andhostfixturespass. Fullnpmsuite stillrunningandnotclaimedgreen.
- ExistingActionsAPI stillForbidden andproductionHTTPS CONNECT403 at03:45:41UTC. Read-onlyrechecks recorded. No release dispatch,merge orproductionclaim. Batch002/003 remaingated.

## Host acceptance handoff — 03:53 UTC

Abuja source-stable browser checks passed movement, median support at0.252, near/far, camera, day/night and three visual reentries. Visible whole-scene geometry16566 triangles; actual imported textures allocated after each return; GPU geometry/textures0/0 after teardown. Weather inputs exercise unchanged host behavior but Abuja rules provide no climate; no weather visual acceptance claimed. Actual application guest onboarding reached its HUD, but this is not a full production UI certificate.

Broad local npm test was stopped after about13minutes once two failures were independently reproduced on clean60c3dff9: Worker size4680353>3500000 and comeback zero-work store touches2!=0. It is a failed/incomplete diagnostic run, not a passing full-suite gate. Combined city-scenes lifecycle also reproduces on baseline. Scoped host, navigation, light, contact and customization tests passed; full five-project typecheck passed. No owned full-test/typecheck/browser/devserver processes remain.

Source milestone71e0de6299d609035518c3399e4505d239e88d98. Next: merge currentmain without losing ownership, publish draft with exact-head CI; no deployment until Lagos geometry, baseline gates, weather/complete UI acceptance and authorized network access are resolved.

## Cloud restart and revision integration

Execution resumed in /workspace/joinallworld with Node24.19.0 and Chromium151, existing dependencies and preserved uncommitted lazy extraction/evidence. No paid compute or credentials created. Remote main now9af2e51e includes PR24 merged by another actor; fast-forwarded dedicated branch to preserve all171 intervening changed files, pending owned edits retained. This merge is not release acceptance. Root owns revision deployment copies, scene definitions, integration record and release coordination. runtime_recovery takes over host-runtime files/tests; host_acceptance resumes harness/evidence. No overlap with WORLD uploader.

Integrate reviewed asset commit9a5999d, manifest8c6681fd...; actual near4174triangles/5primitives must be measured with canonicalhero and host shadows. Fix bounded failure/eviction recovery, rerun source-pinned host/browser/type checks and hosted budgets before any release. Prior baseline failures require current-main comparison. PR24 already merged: publish follow-up PR from authorized branch, preserving ancestry guard.

Workflow correction: explicit11:48UTC user instruction forbids new PRs; use tested direct integration to main subject to existing protections. PR24 confirmed already merged9af2e51e. No new PR will be created.
