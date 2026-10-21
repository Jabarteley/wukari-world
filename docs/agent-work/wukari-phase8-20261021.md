# Wukari Phase 8 character and interface

- Owner: local Codex, active implementation, 2026-10-21.
- Repository: Jabarteley/wukari-world, branch feat/wukari-character-customization.
- Base: feat/wukari-playable-study at 0da1aa877a0f46a7dfff3c292beb8a252b819064; clean on entry.
- Exclusive paths: src/wukari/play, src/wukari/appearance.test.ts, scripts/wukari/play-browser.ts, docs/wukari/PHASE8.md, docs/wukari/evidence/phase8-*, this record.
- Read AGENTS.md, coordination current index, Phase 7 record and geography documentation. Existing character systems inspected read-only; no changes to shared scene ownership.
- Scope: original procedural jointed human, distance-driven blended animation, local appearance/settings, game interface, browser evidence. Preserve Phase 7 geometry, movement/collision and FUW non-spawning policy.
- Exclusions: database/economy, extraction, NPCs, invented place names, deployment, merging.
- Reuse investigation: src/scene/characters.ts, avatar-rig.ts, avatar-preview.ts, kit.ts and character-lab/source-manifest.json. Canonical GLB paths are not present in public; independent small renderer avoids missing assets and unrelated wardrobe/native dependencies. Existing AGPL code and procedural animation patterns retained with repository attribution.
- Resources: none yet. Deliverable: tested commit and draft PR targeting feat/wukari-playable-study.
- Next: implement appearance validation, avatar, interface and preview; run focused checks and browser screenshots.

## Verification checkpoint

- Implemented src/wukari/play avatar, validated versioned appearance/settings, preview, game menu and source-information relocation. Original source geometry/model collision contract unchanged.
- Additional owned paths: src/wukari/play/index.html and scripts/wukari/tsconfig.json (reproducible focused check).
- Allworld manifest GLBs absent; no new packages/assets fetched. Original procedural art, AGPL.
- 54 geographic/wrapper/appearance checks passed before the final gait regression; final avatar/movement subset 9/9, including long-distance walk/run phase continuity and disposal.
- Strict Wukari Vue/TS passes. Production Vite build passes (640.87 kB JS / 176.09 kB gzip before last tiny gait fix; >500 kB advisory retained).
- Chromium acceptance 15 groups passes, zero browser errors; recapture running after final stride continuity fix. Desktop/mobile/front/side/back/walk/run/settings/editor evidence in docs/wukari/evidence/phase8-*.
- Intermediate issues corrected: hidden mouth, overly rounded limbs, overlapping hem; test reload/capture timing, and an accidentally duplicated shadow declaration caught before final acceptance. Sandbox EPERM test workers rerun with approved escalation. No failed capture presented as accepted evidence.
- Existing full-project checker limitations remain documented in PHASE8.md and phase7-types.json. No baseline suppression or unrelated compiler changes.
- Local server already owned port5196 on entry; attempted new server declined occupied port. Left existing server running. QA Chromium profiles/processes are isolated and closed by runner.
- Next: final verification, stage scoped files, commit/push feature branch and draft PR to feat/wukari-playable-study.

## Accepted final local checkpoint

- Status: ready-for-review; implementation verified locally, deployment not requested.
- Final source: 55/55 focused tests; 9/9 avatar/movement subset; strict scripts/wukari/tsconfig.json typecheck exit0; final production build exit0, 640.90 kB JS / 176.13 kB gzip, chunk advisory retained.
- Final Chromium/CDP: 15/15 acceptance groups, errors0, including reload persistence, map pause, FUW refusal, collision and touch. Fresh-document synchronization uses performance.timeOrigin to avoid a stale old-DOM match or missed navigation event. phase8-browser.json and all phase8 screenshots recaptured on final source.
- No database/economy/geographic data edits, no dependencies added, no deployment/merge. Existing full-project typecheck limitations are explicitly reported rather than certified.
- Remaining delivery: commit scoped files, push and open draft PR targeting feat/wukari-playable-study; owner visual review is the next product acceptance step.
