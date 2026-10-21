# Wukari Phase 8.1 quality corrections

- Owner: local Codex; active implementation, 2026-10-21.
- Base: feat/wukari-character-customization at 67c660b5cc7b1dab575bb64a11428b36d30bb476; clean on entry.
- Branch: feat/wukari-avatar-roads-quality.
- Read AGENTS.md, current coordination index, AGENT.md, Phase 7/8 records and geographic documentation. User's explicit feature base supersedes general integration-main guidance.
- Owned paths: src/wukari/play, src/wukari/*quality*.test.ts, src/wukari/appearance.test.ts, scripts/wukari, data/wukari/phase81, docs/wukari/PHASE81.md, docs/wukari/evidence/phase81-*, this record. Existing phase7 source records preserved.
- Scope: investigate redistributable rigged characters, substantial face/hair/preset corrections, source-backed connected town selection, exact conflict inventory and road surface correction, visual/browser review, tests, commit/push/draft PR.
- Boundaries: no authentic footprint modification, source centerline modification, fabricated roads, campus claims, database/economy/NPC/deployment/merge work. No shared Allworld character runtime edits.
- Resources: none started. Next: asset-rights investigation and inspect existing local geographic data before selecting implementation.

## Implementation checkpoint

- Initial investigation incorrectly reported Allworld GLBs absent; superseded by the verified asset correction below. Creator primary sources https://quaternius.com/packs/universalbasecharacters.html and https://quaternius.itch.io/universal-base-characters explicitly grant CC0, including commercial use. Downloaded only the free Standard archive, verified its own CC0 licence; pinned archive SHA fdbf1804c90dfc1ea03e992bff7da2dfd1a79318e13270a660180f9308455f40.
- Two actual rigged male/female native heads/bodies replace the procedural face. Source facial topology retained, source eyes/textures and native bones used. Eight fitted hair styles, actual render thumbnails, body/face zoom and turntable UI. Old appearance records migrate hair names and default to male when no preset is present.
- Repacked models: 1,728,700 and 1,835,444 bytes; normal vector maps downsampled/renormalized to 1024. Rights, exact hashes, modifications and licence in data/wukari/phase81/models. Offline reproducible helper uses already installed Pillow/NumPy, no new runtime dependency.
- Local original geographic aggregate hash verified. New 1 km selection around original node1965491008: 54 roads,243 buildings,30 true shared-node junctions,6 subset graph components. Original coordinates/IDs/topology preserved. FUW copied byte-identically, remains non-spawning.
- Found exact source intersection: road558733005 / building1523015718. Five other conflicts are illustrative-width issues. Clearance-bounded surface capsules narrow or suppress surface intervals; source lines and footprints remain unchanged in source review. Movement follows these same surfaces with body clearance. Full inventory in phase81-geography.json.
- Old area did contain bends elsewhere; whole-way omission removed roads at the old spawn, including185860487. Ground-level camera hid other intersections. New spawn is the reviewed original four-way node; overview fog removed, source-network preview added.
- Initial focused 10 checks pass; strict Wukari types pass. Browser accepted 14 groups with no errors before the final scalp-fitting pass, plus recording. Screenshot review rejected helmet-like cap/spiked cornrows and led to fitting the cap to the actual licensed head triangles and projecting strands onto its scalp. Raised curl clearance after a real female three-quarter eye-ray test failure; all4 native-avatar checks now pass.
- Additional owned paths: .gitattributes (new data byte-preservation rule), hair.ts inside existing play ownership. Existing port5196 server already running; attempted new server declined port, existing server left intact. Own isolated Chromium/CDP process only; original national PBF and nine batches untouched.
- Next: finish final visual review, rerun focused suite/types/build/browser, document remaining visual/compiler limits, commit/push/draft PR targeting feat/wukari-character-customization.

## Corrected asset investigation and disk checkpoint

- Correction: the initial piped filename search missed existing Allworld GLBs on Windows. Direct checks confirm actual binary GLBs, not pointers: round4 female/base.glb2,632,124 bytes (53 bones,26,928tri,90 morph entries) and iteration2-upper-palm.glb652,660 bytes/11clips; catalogue565,424 bytes. Read public/character-lab/THIRD_PARTY_NOTICES.md, FINAL-PASS-LICENSE-NOTE.md and native-character-release-20261016.md; viewed candidate-final-profile.png. MakeHuman-derived selected meshes have recorded CC0 terms, selected motion has separate CMU terms. Official MakeHuman System Assets and licensing FAQ independently corroborate CC0 core assets.
- Quaternius retained for a compact, stylized two-preset Wukari slice with original native-bone animation, avoiding the full Allworld catalogue/recipe adapter and larger dressed default packages. Existing Allworld resources untouched. The owner report corrects the earlier absence claim; no assertion that those assets are unavailable remains in the current report.
- Screenshot QA hit ENOSPC. Verified absolute paths, then removed only this milestone's .cache/wukari/phase81-browser-* temporary profiles and disposable phase81-assets extraction intermediates. Recovered605,462,528 bytes. Original Nigeria PBF, nine imports, existing public models, other milestones' caches and the pinned CC0 source archive preserved.
- Rejected WebM output after decoded-frame visual review showed black frames. Current runner exports a standalone player of16 unmodified compositor captures, verifies changing/visible frames, and automatically removes its own temporary profile after shutdown. No black/partial artifact is accepted evidence.

## Final validation

- 63/63 Wukari/typecheck-wrapper tests passed; final avatar fixture correction rechecked with 5/5 avatar tests. Focused strict vue-tsc and production build passed; retained Vite chunk-size advisory.
- Browser QA passed all 15 groups with no captured errors. Reviewed final desktop/mobile gameplay and nonblack captured turntable frame. Software Chromium measured about 3-4 FPS: hardware performance and physical-device testing remain outstanding.
- Owner visual acceptance remains pending. Stylized faces improve substantially; garment shoulder/collar edges remain visibly simple/angular, and this is not represented as finished commercial character quality.

## Delivery handoff

- Implementation commit: dd900b3f94ca5ff9be0627d2b4a956624a7fb34d. Pushed feat/wukari-avatar-roads-quality; draft PR https://github.com/Jabarteley/wukari-world/pull/9 targets feat/wukari-character-customization. No merge or deployment.
- Final strict typecheck passed after browser evidence payload sanitization. Original third-party LICENSE.txt bytes retained, including upstream trailing whitespace; code whitespace checks otherwise clear.
- Existing loopback server on port5196 remains running; not owned or stopped by this task. Task Chrome profiles closed/cleaned. No new persistent worker.
- Next owner step: review PHASE81 screenshots/turntable, launch existing app, inspect both presets and road network on GPU hardware. Visual acceptance and performance remain open as described in report.
