# Allworld cloud coordinator: verified setup and provisional lanes

Status: setup executed; production changes and specialist launches held for the parent plan and ownership reconciliation. Observations made on 13 October 2026, approximately 17:38–17:46 UTC.

## Authority and isolation

Anthony authorized this cloud environment for verification and coordination. Parent thread `01a0f3c2-c8f1-7692-bb60-ba891cf350fe` owns cloud task launch. This coordinator may write this plan and the accompanying acceptance checklist, but may not change production code, main, CI, deployment, credentials, or paid resources. The parent relayed a later user instruction at 17:45 UTC authorizing an isolated-branch commit and push of completed work with continuation instructions; that supersedes the initial no-push restriction only for this handoff.

- Original checkout: `/workspace/joinallworld`, branch `work`, clean on arrival and after verification.
- Pinned source: `81d9f599d87dfb34adf49cd9337a0b05678e5e0d` (`Update the unpack test for the 20,000-file bound`).
- Coordinator worktree: `/workspace/joinallworld-cloud-coordinator`.
- Coordinator branch: `codex/cloud-coordinator-20261013`, created from that exact pin. Only the three Markdown files in this directory are coordinator source changes.
- Configured origin identifies `github.com/kromate/joinallworld.git`. No fetch was performed. This pin is the supplied checkout, not a claim about current remote main. The later authorized branch push is recorded in the final handoff; it does not merge or deploy anything.

The original Blender production continues independently. The parent's report of 330+ bases, near/far GLBs, editable blends and staged QA is context, not an inventory independently verified here. This checkout contains 168 GLBs (3 body, 127 street, 38 vehicle) and no `.blend` sources. File count is not a count of distinct bases. Existing background/mobile assets remain a separate useful tier; the realism pilot is one convincing real Lagos block and one expressive modular human in the current game.

## Instructions and ownership inspected

No `/AGENTS.md`, `/workspace/AGENTS.md`, repository-root `AGENTS.md`, repository `.agents/skills`, or other repository `.agents` files were found. `/workspace/.agents` and `/workspace/.codex` are empty mounted directories. `docs/AGENTS.md` describes the game's player-agent MCP API, not cloud development authority.

Read coordination and integration evidence in `docs/AGENT-COORDINATION.md`, `docs/GRAPHICS-EXECUTION-CHECKPOINT.md`, `docs/MODELS.md`, `docs/ASSETS.md`, `world/HANDOFF.md`, `docs/agent-plans/living-world/actor-boarding-handoff.md`, and the current character/motion source. Historical coordination notes do not establish another team's present process state.

- WORLD retains sole production-upload ownership; the recorded owner is thread `01a118b7-2dc5-7ad1-b1cf-874647b3d348`. A stale note is not a transfer of authority.
- GRAPHICS owns body/wardrobe/contact integration and actor geometry diagnostics. Scene/neighbourhood/world modules also carry explicit `OWNER` comments.
- LIVING owns shared driving/route authority. A sampled body or foot contact is not boarding or route clearance. Do not bypass those gates.
- Potential character task `01a13520-8d89-70f1-a722-786459524996` was not found in the inspected Markdown. No cross-thread state lookup is exposed here. Its status is **unknown**, not absent, stopped, or superseded. Parent must reconcile its owned files before any human implementation launch.
- Parent's latest instruction reserves cloud launches to the parent. No specialists were spawned, and no other team's process was stopped.
- The current repository concurrency amendment permits bounded concurrent work but retains heavy=1, Node heap=1,536 MiB, Vite minifier=1 initially. Keep one writer per file and distinct owned ports/tabs. Historical Mac memory warnings are not measurements of this Linux container.

## Actual environment and readiness

| Check | Observed result | Limit of the evidence |
| --- | --- | --- |
| Container | Ready; shell commands executed in Linux x86_64 | Environment admission alone was not used as execution proof |
| Resources | cgroup memory.max=17,179,869,184 bytes (16 GiB); cpu.max=400000/100000 (4 CPUs); no swap; about 30 GiB disk available | Host-visible 5 CPUs/~18 GiB are not the allocation limit; no 20-worker heavy capacity claim |
| Runtimes | Node 24.19.0, npm 11.9.0, Python 3.12.14 | Node satisfies the repository >=22.18 requirement |
| Dependencies | Original preflight failed because dependencies were absent; isolated `npm ci --no-audit --no-fund` installed 88 packages; preflight and `npm ls --depth=0` then passed | Lockfile and package source unchanged |
| Core versions | Three 0.180.0, Vite 7.3.6, TypeScript 6.0.3, Vue 3.5.41 | Versions from the actual installed lockfile |
| Focused tests | 45 passed, 0 failed/skipped, ~8.49 seconds | Nine focused test files, not the full game suite |
| Full serial typecheck | **Failed**, exit 1: client and test compiler subprocesses SIGABRT after heap exhaustion | Preserved 1,536 MiB cap; no baseline change, retry at higher cap, or clean-build claim |
| Blender | 4.3.2 background execution saved a 458,736-byte `.blend` and exported a 1,936-byte GLB | Factory cube/tool smoke only; not a production asset or quality acceptance |
| Blender compression | Export emitted a missing `libextern_draco.so` message; uncompressed GLB export succeeded | Draco export is not ready |
| Browser | Chromium 154 + Python Playwright; existing `scripts/body/motion-preview.html` loaded actual male/female GLBs and clip pack, then walked both bodies with changing phase/bone samples | Existing preview through current production loader, not an in-game pilot or phone test |
| Browser errors | No page errors or failed requests in the probe; actual GLB responses 200 | Short bounded probe only |
| Rendering | WebGL2 via ANGLE SwiftShader; `/dev/dri` absent | Software renderer; no hardware GPU, frame-budget, physical-phone, or realism acceptance |
| Cleanup | Browser closed; 90-second Vite lease expired with expected timeout exit 124; heavy/server/browser slots all 0/1 | Browser/esbuild orphan entries were zombie state, not running jobs; no unknown processes killed |

Available local tools include Git, gh, Blender, Chromium, Python Playwright, ffmpeg, ImageMagick, and npm-local esbuild. `gltfpack`, `gltf-transform`, and `gltf-validator` are not installed as commands. The existing body builder requires macOS `sips` and an offline-cached `gltfpack@1.3.0`; Linux rebuild portability and source inputs are not ready. Do not run it against the shipped assets during setup. GitHub and Library connectors are exposed, but connector availability does not imply deployment authorization. The session exposes seven agent slots including this coordinator; that is not a guarantee that the parent can launch 20 simultaneous heavy processes.

The lockfile root metadata says MIT while `package.json` says AGPL-3.0-or-later. Record the inconsistency for the existing owner; neither label is asset provenance, and neither was edited.

## Parent plan transfer: exact blocker

Requested item: Library `libfile_041c7a27b9ac81919aeeec48958041cb`, `Allworld-production-plan.md`, version 0. Library resolved file `file_00000000d88081f58bf0a00cc26c9e47`, 66,182 bytes, with version 0. The current Library skill and materialization reference were read; its current transfer helper was loaded into a fresh private directory.

Two supported attempts were made: initial materialization and one consumer-local retry pinned to the returned file ID. Both returned a signed transfer rather than a workspace path, and both helper executions exited 1 with exactly `library file transfer failed: download failed`. No local plan file exists in `/workspace/library-files/allworld-cloud-coordinator`. No guessed URL, raw download workaround, additional retry, or reconstructed substitute was used.

**The full parent plan has not been read.** The matrix below is source-grounded preparatory mapping, not reconciliation with that researched plan and not launch approval. Parent should restore the plan handoff (for example, provide its complete contents) before launch advice is finalized. The parent retains the authoritative plan identity/version.

## Integration map from pinned source

| Surface | Current contract and ownership boundary | Pilot implication |
| --- | --- | --- |
| `src/types/avatar.ts`, `src/types/life.ts`, `src/scene/characters.ts` | Saved wearables; categorical height/build/age appearance; normalized look, three face categories and three expressions; deterministic fallback | Independent nose/ear morphology is not a saved contract today. An additive schema/migration belongs to one integrator after character-owner agreement |
| `src/scene/body/skinned.ts` | `loadBody` -> `SkinnedBody`; place, wear, fit, show, stride, step, settle, sitOn/workOn, sampleFootContacts/solveFeet, dispose; host owns time | Adapt modular human delivery to this seam. No independent animation loop or silent replacement of current path |
| `src/scene/body/{manifest,files,poses,appearance,facial,animation-pose,foot-contact}.ts` | Two 23-bone bodies; manifest reports 9,002 triangles each; shared clip pack; local proportion deformation and shader face expressions | Preserve clip/joint mappings, pose reset and existing appearance identity. Verify actual geometry and visual results; comments and proposed budgets are not measurements |
| `src/scene/wardrobe/*`, `src/game/wardrobe/*` | Wearable IDs, slots, geometry, presentation, body-region masks, metrics | Garment fit and body masking must remain compatible across both body variants and proportions |
| `src/scene/body/gate.ts`, `avatar-rig.ts`, `motion-loop.ts` | Device/data gates, procedural fallback, demand-driven pose/host stepping | Near realism and background/mobile tiers must coexist; fallback/loading/failure is part of acceptance |
| `src/models/people/index.ts` | A second procedural people/model-workshop API exists | Do not build another competing canonical character system or treat workshop success as game integration |
| `src/scene/street/{street-plan,street-kit,street-models}.ts` | Neighbourhood-owned deterministic placements, boxes/solids, per-model palettes, near/far keys, lazy URLs | A real block needs an explicit adapter. Current procedural street planning is not surveyed Lagos geometry |
| `src/scene/models/{scene-models,gltf-source}.ts` | Plain model parts + anchors; placements; merge/instance mode; atlas sharing; budgets, stand-ins, lazy load/focus/dispose | Static source bakes node transforms into arrays; do not use it as a skinned-human loader |
| `src/game/cities/lagos/map.ts`, `src/map3d/geo/frame.ts` | Lagos origin pinned at 3.40 E, 6.45 N; `nigeria-equirectangular-v1`, 10 units/km; geography and scene load separately | Declare geographic-to-local-to-scene transforms. Neighbourhood scene units and body metres are separate from map units |
| `src/map3d/geo/projection.ts` | Equal Earth atlas projection with separate map-unit convention | Do not mix atlas, city-frame and street coordinates |
| `src/scene/movement.ts`, `walk-grid.ts`, scene host | Existing walking grid, collider footprints, host motion and position reporting | Rendering a road/kerb does not make it walkable or authorize movement; preserve movement owner |
| `world/game-map-contract.ts` | Versioned country catalogue/bundle, exact hashes, source/attribution records, fail-closed validation | Useful provenance discipline, but not an existing block/character asset schema |
| `src/budgets.ts`, `scripts/download-budget.ts` | Current and provisional limits are distinguished | Carry measured raw/compressed bytes, visible triangles, calls and lifecycle receipts; no unilateral budget increase |

`docs/ASSETS.md` attributes the existing body/animation inputs to Quaternius and records their notices. This verifies what the repository records; no new third-party asset or license was independently researched or approved in this setup pass. Current APIs allow broad cosmetic variation but do not demonstrate the full realistic modular-human target.

## Provisional 20 distinct specialist lanes

All rows are **unlaunched** and subject to the unread parent plan. Suggested branches are `codex/cloud-<slug>`. Each lane gets exclusive `docs/agent-plans/cloud-lanes/<slug>/` for research/contracts and `evidence/cloud-lanes/<slug>/` for ignored experiments and receipts. A lane owns only its directory and its own binary files; it reads frozen exports from others. No row grants ownership of existing `src`, `server`, `world`, `.github`, package, budget, or shared coordination files.

| Lane / slug | Distinct responsibility | First reviewable result and handoff |
| --- | --- | --- |
| 01 `source-provenance` | Source and rights intake | Per-input author, URL, license text, rights/attribution, capture date and SHA-256; unresolved sources quarantined |
| 02 `lagos-survey` | One named block boundary and geographic observations | Bounded location/feature IDs, reference coverage, observed vs estimated geometry; feeds 03–10 |
| 03 `roads-drainage` | Road/kerb/sidewalk/drain geometry | Own road/kerb blend and measured cross-sections, seams and entrances |
| 04 `terrain-ground` | Ground, slope and water/support surfaces | Own terrain blend and local height/support data with uncertainty |
| 05 `building-shells` | Building massing and structural forms | Own building blends, footprint/height/orientation evidence and door anchors |
| 06 `facades-materials` | Facades, windows, roof/detail materials | Own material/texture and facade modules linked to 05, no shared blend editing |
| 07 `street-props` | Site-specific street furniture and signage | Own prop blends with anchors, bounds, origin and provenance |
| 08 `vegetation` | Site-specific trees and planting | Own vegetation assets and near/far visibility/alpha-cost evidence |
| 09 `block-navigation` | Collision/support/walkability specification | Sidecar colliders, walk surface and accessibility evidence against frozen 03–08 outputs |
| 10 `block-placement` | Geographic/scene assembly proposal | Deterministic placement manifest and transform round-trip fixtures; never edits street runtime |
| 11 `human-topology` | Realistic base-body topology | Owned base blend with body landmarks and modular connection boundaries; coordinate with existing character task first |
| 12 `face-parts` | Nose, ears, eyes, mouth and facial proportions | Separately owned face modules/morph spec; frozen attachment topology from 11 |
| 13 `expressions` | Expressive face controls and shape/pose vocabulary | Expression modules and combinations, blink/viseme plan, neutral restoration evidence |
| 14 `body-proportions` | Custom body dimensions and deformation | Parameter ranges and deformation modules with joint/contact fit invariants |
| 15 `skeleton-skinning` | Skeleton, skin weights and pose interchange | Versioned joint/rest-pose/weight contract and independently owned rig template |
| 16 `motion-contact` | Locomotion, gestures and contact quality | Clip/retarget proposals, gait/foot support and transition evidence on frozen rig |
| 17 `hair-groom` | Hair geometry, scalp fit and materials | Independently owned hair modules; eyes/ears visibility and movement/clipping checks |
| 18 `clothing-fit` | Clothing and accessories | Owned garments with slot/body-mask data and deformation acceptance matrix |
| 19 `asset-export-lod` | Blender-to-GLB validation and two-tier packaging | Export recipe, parser/validator receipts, near/far contracts and reproducible hashes; consumes immutable lane outputs |
| 20 `game-pilot-qa` | Integration proposal and independent acceptance | One current-game journey using block + human; sole proposed runtime integrator only after parent/GRAPHICS/WORLD/LIVING delegation; QA must record actual results |

Safe first assignments after parent reconciliation are source/provenance, block selection/coordinate evidence, export-portability audit, and read-only integration/QA contract preparation. Human implementation lanes remain dependent on the existing character owner. World geometry/asset work remains dependent on the selected block and licensed evidence. Sharing tasks does not require concurrent heavy processes.

Grow toward 100 distinct workstreams only after the first integrated pilot passes: split each of the 20 domains into five explicitly named non-overlapping subject/asset/test cohorts. Every cohort needs a unique owner, branch, immutable input version, output directory, dependency list, measurable acceptance and parent launch record. Do not create 100 writers to one scene, rig, catalogue, or shared `.blend`; do not equate 100 planned lanes with 100 available cloud workers.

## Execution and handoff sequence

1. Recover and fully read parent plan; reconcile its IDs/ownership matrix with this source map. Resolve the existing character task's claims without interrupting it.
2. Freeze one Lagos block, lawful source evidence, target runtime scene, human identity/controls, coordinate/rig contracts, and explicit quality/performance criteria. Parent assigns lane owners and launch scopes.
3. Produce one block and one modular expressive human as independent original/authorized Blender sources. Preserve the original team's background/mobile production and source identities.
4. Export and validate versioned delivery packets; integrate only through the named runtime owner on an isolated candidate branch. No mass production or production deployment on the basis of standalone renders.
5. Prove the combined pilot in current Three.js gameplay, including customisation, walking, expressions, loading, fallback, disposal, touch and phone evidence. Apply [INTERFACE-ACCEPTANCE.md](INTERFACE-ACCEPTANCE.md).
6. Parent may expand the accepted lane pattern. WORLD's separate release process retains deployment authority.

## Reproduction and retained evidence

Evidence remains local at `/tmp/allworld-cloud-coordinator-20261013/`; hashes below make this report independently checkable if that directory is transferred. Do not assume the parent's filesystem contains it.

| Receipt | SHA-256 |
| --- | --- |
| `focused-tests.log` | `d86b86e2c5b17cb2f853664183341a206072406c7ae6d0ec4bbfca588fa821b4` |
| `typecheck.log` | `7c5e730e89d4fee78f69c96c58aa8ef0a6ce4607e95de335f2af9668e9d6e173` |
| `blender.log` | `6a8091264c4f4532988b693c551b25bec4ebd2e2d0ab43ad5c0a0a16d5903602` |
| `browser-receipt.json` | `d868f28fad959b76a100a64d6bcd1070da18c1b6f6fa7d3ce98e1c817eea2fe0` |

Focused test command, run in this isolated worktree after dependency installation:

```sh
NODE_OPTIONS=--max-old-space-size=1536 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 90s node --test --test-concurrency=1 src/scene/body/body-assets.test.ts src/scene/body/poses.test.ts src/scene/body/animation-pose.test.ts src/scene/body/gate.test.ts src/scene/body/stand-in.test.ts src/models/integration/avatar.integration.test.ts src/scene/street/street-plan.test.ts src/map3d/lagos-geo.test.ts world/game-map-contract.test.ts
```

Full readiness remains blocked by typecheck memory failure, unresolved parent-plan transfer and current ownership, absent Linux body-rebuild prerequisites/source blends, missing Draco support, and unperformed current-game/hardware-phone pilot acceptance. No runtime build, full test suite, manually triggered CI run, production request, deployment, paid operation, or credential inspection was performed. The later authorized documentation commit/push is separate from these verification results.

## Later parent setup report

The parent relayed an onboarding report of locked install, typecheck/build/download-budget/17-smoke-test passes and server/restart verification across 236 cities, plus saved install/start instructions. Those checks were not observed in this executor and their source pin, commands and resource limits are not supplied here. Do not replace this executor's pinned 45-pass/typecheck-OOM evidence with that report or infer a contradiction without comparing pins and limits. This executor demonstrably runs now; it is not waiting on startup. The parent says a user review/save/publish step remains in the environment-settings UI. No attempt was made to automate or bypass that step, and published reusable-environment status is unverified.
