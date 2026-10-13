# Continue the Allworld cloud coordinator handoff

Read this first on another agent or machine. Parent thread `01a0f3c2-c8f1-7692-bb60-ba891cf350fe` retains cloud specialist launch authority. No specialist has been launched by this coordinator. The original Blender team continues separately; its parent-managed publisher to `kromate/allworld-assets` is not this branch and was not accessed here.

## Locate and verify the handoff

- Repository: `kromate/joinallworld`.
- Branch: `codex/cloud-coordinator-20261013`.
- Source baseline: `81d9f599d87dfb34adf49cd9337a0b05678e5e0d`.
- Handoff commit: use the exact commit recorded in the final coordinator response and verify it with `git rev-parse HEAD`; a document cannot embed its own eventual Git commit hash.
- Scope: only `COORDINATOR.md`, `INTERFACE-ACCEPTANCE.md`, and this file under `docs/agent-plans/cloud-production-20261013/`.
- Latest authorization: parent relayed the user's 17:45 UTC direction to push completed work with continuation instructions. This authorizes this isolated documentation branch; main merge, deployment, CI/config changes, paid resources and credential inspection remain out of scope.

If reusing the existing executor, the worktree is `/workspace/joinallworld-cloud-coordinator`. Dependencies are already installed there: do not repeat setup. The original `/workspace/joinallworld` remains on clean branch `work` at the source baseline. Do not assume either path exists on another machine.

On another existing clone, after confirming its own instructions and worktree state, fetch just the handoff branch and create a new worktree. Use a fresh destination, never reset an existing dirty checkout:

```sh
git fetch origin codex/cloud-coordinator-20261013
git worktree add --detach /workspace/allworld-coordinator-review FETCH_HEAD
git -C /workspace/allworld-coordinator-review rev-parse HEAD
git -C /workspace/allworld-coordinator-review diff --name-only 81d9f599d87dfb34adf49cd9337a0b05678e5e0d HEAD
```

Compare HEAD with the final handoff SHA and require exactly the three files above. Read [COORDINATOR.md](COORDINATOR.md) in full, then [INTERFACE-ACCEPTANCE.md](INTERFACE-ACCEPTANCE.md). The plan has a provisional 20-lane branch/path matrix; it is not parent-plan reconciliation or launch approval.

## Completed work and exact evidence level

1. Container started and actually executed commands. Linux x86_64; cgroup 16 GiB and 4 CPUs; no hardware `/dev/dri`. Node 24.19.0, npm 11.9.0, Python 3.12.14, Blender 4.3.2, Chromium 154.
2. Inspected checkout/ownership, existing character and world integration contracts; created the separate coordinator worktree. No production code, assets, dependency manifests, CI, deploy files or shared ownership notes were edited.
3. Installed the existing lockfile in the isolated worktree: `npm ci --cache /tmp/allworld-cloud-coordinator-20261013/npm-cache --no-audit --no-fund`. Preflight and dependency enumeration passed.
4. Focused Node checks: **45 passed, zero failed/skipped**, 8,491.94278 ms. Files: body-assets, poses, animation-pose, gate, stand-in, models/avatar integration, street-plan, Lagos geography and world/game-map-contract. Exact command is in COORDINATOR.md.
5. Full `npm run typecheck`, serial under `NODE_OPTIONS=--max-old-space-size=1536`: **exit 1**. Both client and test compiler subprocesses aborted with JavaScript heap OOM/SIGABRT. No cap increase or baseline rewrite occurred. Do not call the full build ready.
6. Blender executed a factory-scene save and glTF export. `.blend` 458,736 bytes; `.glb` 1,936 bytes; exit 0. Missing Draco shared library was reported. This proves uncompressed export/tool execution only.
7. Existing `/scripts/body/motion-preview.html` rendered the real shipped female and male assets through the current `loadBody` implementation. Actual base-body/clip requests returned 200; no failed request or page error was recorded. Female walk phase changed 0.00 -> 3.07 rad and male 0.00 -> 3.10 rad with changing bone coordinates. Idle reported loopActive=false and rafQueued=false. Both idle screenshots were visually inspected.
8. Renderer was WebGL2 / ANGLE SwiftShader. Viewer counters (including both figures and viewer geometry) were female 8,416 triangles/10 calls, male 7,650 triangles/10 calls. They are not body-file triangle counts, whole-game costs, hardware/phone measurements, or realistic-human acceptance.
9. Browser closed; temporary Vite server terminated at its 90-second timeout (exit 124). All slot kinds ended 0/1. No running owned server/browser/heavy job remains. Zombie subprocess entries were left for the container reaper, not killed as unknown processes.

The 45 focused passes and preview are sufficient to establish actual cloud execution. They do not complete the one-real-block + one-realistic-human goal, full compiler/tests/build/download budgets, physics/boarding clearance, or physical-phone acceptance.

## Blocking items and next actions

| Blocker | Verified state | Next bounded action / owner |
| --- | --- | --- |
| Parent plan bytes | Library item `libfile_041c7a27b9ac81919aeeec48958041cb`, file `file_00000000d88081f58bf0a00cc26c9e47`, `Allworld-production-plan.md`, version 0, 66,182 bytes resolved. Both supported transfers failed: `library file transfer failed: download failed`. No local file exists; full document unread | Parent repairs handoff or supplies full text. Do not silently launch from this provisional substitute. The allowed initial transfer plus one consumer-local retry have been exhausted for this attempt; no guessed URLs |
| Character ownership | Task `01a13520-8d89-70f1-a722-786459524996` status not exposed; historical GRAPHICS work is substantial | Parent obtains exact current branch/path claims and reconciles face/rig/body/wardrobe lanes. Preserve active work |
| Compiler memory | Client/test OOM under the existing 1,536 MiB policy | Compiler/environment owner compares source pins and heap settings with the separately reported successful onboarding run. Choose a bounded diagnostic or explicit policy decision; do not quietly raise the cap or rerun unchanged |
| Reusable environment publication | This executor runs now. Parent says onboarding draft still needs user review/save/publish | User completes that UI step. Do not bypass or mistake this executor's access for publication of the reusable environment |
| Body asset rebuild | No editable `.blend` source in checkout; builder uses macOS `sips` plus offline-cached gltfpack; commands/cache/source inputs not verified for Linux | Export lane audits portable commands and receives authorized immutable source inputs before production rebuilding |
| Compression/validation | Blender Draco library absent; gltfpack/gltf-transform/gltf-validator CLIs not installed | Parent-owned exporter lane selects and verifies required tools without modifying shared dependencies or paid resources during this phase |
| Pilot acceptance | No new block/human produced or integrated | Parent freezes legally sourced block, target scene, rights/coordinates/rig contracts and review metrics; then launches non-overlapping work |

The parent separately reported onboarding passes for typecheck/build/download budgets/17 smoke tests, server startup across 236 cities and restart. That report is not source-pinned evidence from this coordinator's run. Keep both reports and compare exact commits, commands and resource limits before concluding they are equivalent.

## Next commands, only when the corresponding blocker is resolved

For existing worktree inspection (safe now):

```sh
cd /workspace/joinallworld-cloud-coordinator
git status --short --branch
git rev-parse HEAD
node scripts/agent-slot.ts status
```

For the parent plan, use the current Library skill and the exact IDs above after the handoff is repaired. Verify returned version/size, local readability and metadata; read the whole document. Do not assume `/workspace/library-files/...` is shared with the parent.

For a **fresh** worker only, after acquiring its own environment and checking instructions, a bounded dependency installation can use the checked-in lockfile:

```sh
NODE_OPTIONS=--max-old-space-size=1536 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 180s npm ci --cache /tmp/allworld-worker-npm-cache --no-audit --no-fund
npm run -s preflight
```

Do not rerun tests for these Markdown changes. When implementation begins, run only tests relevant to the changed contract and the exact integration candidate. Follow existing slot limits, own each process/port, keep bounded lifetimes, and record failure as failure. Do not run `npm test` casually during a read-only inspection: its pretest generates city/word assets and TypeScript files.

## Resource and ownership rules for the next agent

- Parent launches specialists. Twenty distinct lanes and eventual 100 are a production organization goal, not permission for twenty concurrent heavy jobs on four CPUs.
- Keep heavy=1, Node heap=1,536 MiB, minifier=1 unless an authorized measured policy revision is supplied. Current free-slot state is only a snapshot.
- Give each lane unique branch/output/Blender filenames; use immutable input hashes. A shared rig, catalogue, schema or scene has one integration writer.
- Record author/license/source rights for every input. No extraction/tracing of Google Maps imagery or 3D tiles into redistributable assets.
- Complete and review one convincing legally sourced Lagos block plus one expressive modular human **inside the current Three.js game** before mass production. Preserve background/mobile production as its own tier.
- Preserve source/identity/save compatibility, data/device fallback, host-owned frame timing, disposal and performance budgets. Boarding and route authority remain with the owning game systems.
- No production merge or deployment from this handoff. No new paid resources, credential work, or workflow/config change.

## Local receipts and durability

Raw setup logs, the software-renderer browser receipt, two inspected screenshots and factory smoke outputs are under `/tmp/allworld-cloud-coordinator-20261013/` in this executor only. `evidence-index.json` records their hashes. Main receipt hashes and exact results are preserved in committed documentation; factory smoke artifacts are disposable and are not original production work. Do not assume the raw temporary directory survives or exists in a different cloud workspace. Reproduce the documented bounded checks when needed rather than claiming missing logs were transferred.

Before handing off further work, commit only the lane's reviewed files, record exact SHA/test receipts/blockers/next commands, and push only its authorized isolated branch. Stop at a reviewable checkpoint before usage is exhausted; leave no unbounded jobs. Final coordinator response is the source of truth for whether this documentation branch push succeeded.
