# Phase 8.2 performance and character polish

- Owner: local Codex, active implementation. Base feat/wukari-avatar-roads-quality at ec547e0e11eaccca323beb8c8fe5a21351776dac; clean on entry. Branch feat/wukari-performance-polish.
- Read AGENTS.md, coordination current-work index, relevant Phase 8.1 handoff, AGENT.md and template. User's explicit feature base governs this PR; no main integration/deploy.
- Goal: profile actual browser costs, optimize measured hot paths and editor lifecycle, improve fitted clothing and retain face/hair/geographic fidelity.
- Owned paths: src/wukari/play, src/wukari/*test.ts for focused regressions, scripts/wukari profiling/browser tools, docs/wukari/PHASE82.md, docs/wukari/evidence/phase82-*, this record. No shared Allworld runtime ownership.
- Boundaries: preserve committed geography/assets and all eight hair options/local persistence. No DB/economy/NPC/multiplayer/download/deploy/merge work.
- Acceptance: reviewed screenshots and owner-facing measured profiling evidence, meaningful presets, full focused regressions/build/types and draft PR. Real-device target remains open unless actual hardware results support it.
- Resources: existing port5196 server belongs to previous local session, do not stop. Own profiling Chrome processes/profiles will be closed and cleaned. No workers started yet.
- Next: measure renderer/GPU identity and CPU profiles before changing hot paths; inspect garment bind geometry and seams.

## Implementation checkpoint

- Chrome uses real Intel HD620 D3D11 hardware; baseline clean 6-second sample55.93fps/p95 32.9ms, CDP CPU hotspots camera triangle raycasting, matrices and renderer state. Initial connection-refused probes were a stopped server; new task-owned npm wukari:play on5196 is running for owner review.
- Implemented indexed exact navigation/camera predicates, static transforms, removed redundant forced avatar matrix walk, deduplicated safe road caps and stopped paused/hidden world rendering. Full geographic source remains byte-identical.
- Continuous native-topology shirt, interpolated skin weights, fabric envelope/normals and exact complementary body cut replace separate sleeves. Both presets/all outfits pass weight/animation checks. Final3mm hem clearance under visual review.
- Editor retains context across preset changes; incremental bounded thumbnails only when required, no stale-preset images, no duplicate town actor recreation during live editing. Template body cuts cached; owned resources retained/disposed explicitly.
- First complete hardware QA17groups passed, all16style/preset captures. Three20second hardware samples57.58/59.88/57.78fps, p95 16.8/16.8/17.0ms. Four editor cycles661?837ms warm-cache, collectedheap +233308B, no preview canvas afterclose. GPU time unavailable; geometry4.32MB/estimatedtextures5.96MB exclude driver overhead.
- Focused10 avatar/performance tests pass (7avatar+3performance); final fullsuite/types/build pending. Final visual-only regression running, then matching profiler and delivery. No hardware target claimed on software browser; owner visual/device acceptance remains open.

## Final verification and review

- 68/68 focused tests passed; final strict Wukari vue-tsc passed. Production build41modules passed,763.08kB JS/212.10kB gzip; chunk advisory retained. No compiler suppression/baseline changes. Full-project gate remains inherited and uncertified.
- Final visual-only browser acceptance16executed groups passed (hardware group referenced from prior full17group run), no captured errors; reviewed final male/female front, side and normal desktop/mobile gameplay captures. Shoulder/collar discontinuities substantially corrected; small hem/cuff edge artifacts are disclosed and owner visual approval remains open.
- Short post-change profile58.48fps/p9518.5ms/defaultmale74,058tri vsbaseline94,824tri. Matrix/triangle-raycast hotspots reduced; total script time did not improve in the noisy profile comparison, explicitly reported. Sustained measurements were recorded before the final3mm hem lift; topology/material counts unchanged. No claim of guaranteed long-session/phone FPS.
- Final preview cycles788?878ms; collectedheap+246316B/4cycles; zero leftover canvases. Verified root/absolute paths, removed only six owned phase82 temporary Chrome profiles after closure. Original PBF/imports, other caches and source assets untouched.
- Task-owned Vite server on5196 remains available for owner testing (session70317). No persistent task Chrome process intended. Existing historical work records remain untouched.
- Next: stage owned source/docs/evidence, commit and push feature branch; create draft PR targeting feat/wukari-avatar-roads-quality. Owner appearance review and physical/long-session device testing remain gates.

## Delivery handoff

- Status: ready for owner review; local implementation verified within documented scope. Implementation commit09cfecff4a5ee0c04b65fccd5071ca610fdde2bc pushed to feat/wukari-performance-polish. Draft PR https://github.com/Jabarteley/wukari-world/pull/10 targets feat/wukari-avatar-roads-quality. No merge/deploy.
- Owner next step: open local port5196, inspect Male/Female clothes and hairstyles, then Settings ? Measure performance on the normal browser. Review PHASE82 screenshots/metrics and long-session behavior before accepting quality/performance.
- 30FPS average/p95 supported in three short local hardware-GPU samples; occasional frame outliers, simple garment edges, physical phones and sustained thermal behavior remain explicitly open. Full-project TypeScript remains uncertified.
