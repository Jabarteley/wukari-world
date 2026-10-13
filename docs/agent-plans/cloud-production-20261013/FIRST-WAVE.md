# Parent-plan reconciliation and parent-launched first wave

13 October 2026. Parent owns launch and has reported four bounded cloud task launches. Their actual worker status/results have not been independently inspected by this coordinator. No existing implementation is changed by this document; do not spawn duplicates.

## Plan archive and precedence

The complete parent plan is archived verbatim as [Allworld-production-plan.md](Allworld-production-plan.md): Library `libfile_041c7a27b9ac81919aeeec48958041cb`, version `0`, file `file_00000000d88081f58bf0a00cc26c9e47`, 66,182 UTF-8 bytes, 480 lines, SHA-256 `58a52f1bc2a045ed7c79492635ac83fdfd357ad5016de107dc2c1d0da65e955f`. All 20 launch prompts were read.

The parent's plain-text message was truncated in transit. After that new text-save instruction, version-pinned Library text reads recovered the missing material, covering lines 1–140, 141–260, 261–370 and 371–480 without gaps; the final response reports `has_more=false`. The local archive matches the reported byte count and line count, has all 20 lane headings, and retains Library identity/version xattrs. Earlier signed-file transfers still failed; no additional signed transfer or guessed-URL retry was attempted. The archive preserves the parent's supplied research and prices; this coordinator did not recheck external terms/prices or perform new purchases.

Use the parent plan's lane numbering below. The first coordinator checkpoint's alternative 20-lane matrix is superseded. Existing production owners and current runtime caps remain effective unless explicitly changed by their authorized integration process.

## Reconciliation with the actual repository

| Parent proposal | Verified source and ownership | Reconciled instruction |
| --- | --- | --- |
| Lane 01 alone merges shared runtime/importer | Existing scene/neighbourhood owners, GRAPHICS body/wardrobe, WORLD geography/release and LIVING driving authority already exist | Lane 01 coordinates proposed integration; it does not acquire those files by this document. Initial scope is a new isolated package. A shared-file change needs an explicit path transfer from the current owner; WORLD keeps production release |
| Existing pinned Allworld importer | Repo static scenery uses `src/scene/models/gltf-source.ts` + `scene-models.ts`; humans use `src/scene/body/skinned.ts` | Pin both distinct paths. The separately reported original Blender-team importer remains an external handoff dependency; do not claim its version was verified here |
| Full PBR, morphs and rig support | Static `ModelPart` carries baked positions/normals/UV/color/index and atlas; it does not expose normal/roughness maps, skeletal or morph channels. `loadBody` is a separate skinned path with custom material and wardrobe logic | Three.js GLTFLoader capability alone is not end-to-end importer support. Lane 01 records supported/rejected/unverified features and demonstrates probes. Detailed PBR and independent face controls need explicit later adapters |
| East +X, up +Y, north -Z in metres | `src/geo/frame.ts` already uses east +X/south +Z, 10 units/km, fixed 9-degree standard parallel; Lagos origin is rounded city-frame coordinates | Preserve current frame. Lane 03 supplies an explicit local-metric adapter and labels map-projection distortion. Separate local metric axes, source datum and game scene scale; do not rewrite shared projection |
| Shared adult topology, six presets, extensive independent controls | Current saved appearance is categorical and body assets have 23 bones; potential character task `01a13520-8d89-70f1-a722-786459524996` has unresolved live ownership | No human implementation lane in this first wave. Parent reconciles task ownership, topology and save contract first; do not create a competing canonical human |
| Hero 40–80k triangles; scene caps 2M/500 desktop and 500k/200 mobile | Current `src/budgets.ts` includes venue 17k triangles/60 calls, avatar limits and separately marked provisional realism budgets | Preserve existing enforced budgets. Parent numbers are experiment targets, not accepted replacements. Lane 19 reports both profiles with scope/device labels and requests explicit budget decisions before runtime promotion |
| 200m block, 10–20 buildings, 15–25 prop types, six fictional presets | Yaba is a candidate; no pilot footprint or independent surveyed control-point set is accepted in this checkout | Lane 02 prepares bounded source coverage/rights evidence. Lane 03 works with synthetic coordinate fixtures; none may label those as surveyed Lagos data |
| 20/100 workers | This executor has 16 GiB/4 CPU quota, no hardware GPU; seven agent slots are exposed | Four tasks may work independently at source level. Preserve heavy=1/heap1536/minifier1 within shared machinery. More agents are not more simultaneous render workers |
| Setup pending in the archived plan | Actual 45-test, Blender and software-WebGL execution is recorded in COORDINATOR.md; full typecheck OOM remains | Archive stays unchanged. Current operational status is in COORDINATOR/CONTINUE; user environment-settings publication is not bypassed |

The repository has no tracked `production/` directory at this checkpoint. The parent has now assigned a different concrete first wave under new `docs/agent-plans/cloud-lanes/<slug>/` and, where needed, `experiments/cloud-lanes/<slug>/` prefixes. Those exact assignments below supersede the unlaunched recommendation of package lanes 01/02/03/19. Do not create parallel `production/lanes/` implementations or start a second set of four tasks.

## Actual launch ledger and baseline

The parent reported these four launches after receiving the coordinator's first safe-scope recommendations. State is **parent-reported launched**, not independently confirmed running/implemented/validated/accepted. No fifth worker is requested here.

| Task | Cloud task ID | Branch | Exclusive write prefixes | Parent-plan alignment |
| --- | --- | --- | --- | --- |
| Source provenance | `01a13666-f9eb-7724-a7db-39aa2ac3d03d` | `codex/cloud-source-provenance-20261013` | `docs/agent-plans/cloud-lanes/source-provenance/`, `experiments/cloud-lanes/source-provenance/` | Lane 02 source intake |
| Lagos geography | `01a13667-2143-7079-b734-2a9b08685033` | `codex/cloud-lagos-geography-20261013` | `docs/agent-plans/cloud-lanes/lagos-geography/`, `experiments/cloud-lanes/lagos-geography/` | Lane 03 coordinate groundwork; candidate coverage input to 12–14 |
| Asset export portability | `01a13667-4775-77bf-9d5b-cabbefd4302d` | `codex/cloud-asset-export-portability-20261013` | `docs/agent-plans/cloud-lanes/asset-export-portability/`, `experiments/cloud-lanes/asset-export-portability/` | Lane 20 build/export foundation; evidence for lane 01 |
| Human design contract | `01a13667-6b47-7763-b71a-7d06139ed03f` | `codex/cloud-human-design-contract-20261013` | `docs/agent-plans/cloud-lanes/human-design-contract/`, `experiments/cloud-lanes/human-design-contract/` | Additive standalone contracts/fixtures informing lanes 04–11; no character-runtime transfer |

All four actual launches use code baseline **`81d9f599d87dfb34adf49cd9337a0b05678e5e0d`**, with the original coordinator guidance at **`6c2885d15d38b9d64501f14d467db9d5c01573b2`**. The final response for this update supplies the exact new documentation checkpoint SHA. Parent should forward that SHA and this ledger; existing workers need only read the updated documentation, not restart their task or merge unrelated branch changes.

The parent also retried the existing character-thread lookup and reported `unsupportedplacementformatv2`. That failure leaves task `01a13520-8d89-70f1-a722-786459524996` ownership unknown. It grants no stop, cancellation, superiority claim or ownership transfer. The human-design task is limited to its new standalone schema/fixtures/prototype.

## Per-task continuation scopes

The original parent launch prompts remain authoritative. These recommendations refine expected reviewable outputs inside the exact assigned prefixes and do not expand any task into production integration. Each task writes `CONTINUE.md` in its own documentation prefix, with exact source/commit, changed paths, commands, observed results, blockers and next steps.

### Source provenance

Own only `docs/agent-plans/cloud-lanes/source-provenance/**` and optional `experiments/cloud-lanes/source-provenance/**`.

Prepare a source registry and bounded validator/fixtures for the candidate ~200m Lagos block. Required facts are exact source URL/release, creator/provider, license/notice reference, permitted-use evidence, retrieval date, accuracy/coverage and missing-data flags. Distinguish candidate, admitted and blocked; missing evidence does not become approval. Keep measured/estimated/authored labels explicit. Use primary official sources for current policy or source facts, with no purchases, acceptance of new terms, restricted imagery, bulk acquisition or invented measurements.

A useful first implementation is a standalone registry validator with fictional fixtures rejecting missing rights, non-finite coordinates and restricted-provider derivation. The first report should identify a small set of lawful source candidates and gaps, not select or model an unapproved block. The geospatial task owns transforms; this task owns source evidence. No duplicate source registry in shared `world/` or game code.

### Lagos geography

Own only `docs/agent-plans/cloud-lanes/lagos-geography/**` and optional `experiments/cloud-lanes/lagos-geography/**`.

Read `src/geo/frame.ts`, the `src/map3d/geo/frame.ts` re-export, Lagos map pack and `docs/MAP-GEOMETRY.md`. Produce an explicit pure local-metric adapter/fixture or contract within this scope: source longitude/latitude order, x east/z south, map scale 10 units/km, local origin, height datum status and scene-scale conversion. Do not rewrite the existing geographic frame or acquire the same real-source inputs as the provenance task without coordination.

Check independent axis/scale witnesses, a 1m step/cube, numerical round-trip <=0.01m in a declared bounded domain and invalid-input rejection. A forward/inverse round-trip alone can hide a shared error. Synthetic coordinates/heights remain labelled synthetic; geographic accuracy and projection distortion are reported separately. Do not fabricate 20 survey control points or convert the numerical tolerance into a real-world accuracy claim.

### Asset export portability

Own only `docs/agent-plans/cloud-lanes/asset-export-portability/**` and optional `experiments/cloud-lanes/asset-export-portability/**`.

Audit the existing Mac-dependent body builder (`sips`, offline gltfpack), available Blender 4.3.2/Linux tooling, static scenery importer and skinned-body loader separately. Propose or implement a standalone original-fixture export/inspection prototype, with explicit source and output hashes, units, axes, bounds, anchors, supported extensions and clean failure behavior. Keep compressed and uncompressed outcomes distinct; the current Blender smoke reported missing Draco support.

Use a tiny original mesh/anchor fixture to prove the intended portable operation. Do not regenerate or overwrite existing shipped GLBs, alter the original Blender team's pipeline, replace root tooling/dependencies, install new services, or claim their external pinned importer was verified without receiving it. Avoid bulk asset conversion. A portability proof is not a full realism or production-export acceptance.

### Human design contract

Own only `docs/agent-plans/cloud-lanes/human-design-contract/**` and optional `experiments/cloud-lanes/human-design-contract/**`.

Produce an additive standalone versioned design schema, six fictional fixture presets and a small validator/prototype if included by the parent's launch prompt. Cover independent ears/nose/facial identity, body proportions, expression channels, skin/hair/clothing references, attachment and rig/topology versions, defaults/ranges and stable serialization. Identity and expression controls must remain independent; changing hair/clothes must preserve facial/body choices.

Read current `Look`/`AvatarAppearance`, `loadBody`/`SkinnedBody`, 23-bone manifest, facial sampler, appearance controller and wardrobe rules to report the eventual mapping/gaps. Do not change those files, create a second canonical player system, adopt incompatible topology as approved, overwrite body assets, or reconstruct the reference person. Tests may validate fixture round-trip/ranges/independence and malformed inputs; they cannot certify real geometry, deformation or in-game realism. Human source/rig/runtime production waits for existing-character-owner reconciliation.

## Read-only importer pins

These are Git blob IDs at the common code baseline. They document discovered seams, not ownership transfers.

| Path | Blob |
| --- | --- |
| `src/scene/models/gltf-source.ts` | `cde77b83c9bf76e55788936b6a4e195a39aab44b` |
| `src/scene/models/scene-models.ts` | `750bdf36123f1a1adba8878c02b0caf96de9e2c0` |
| `src/scene/body/skinned.ts` | `2a49cf9239474d3e8a38e1bbb49ed64cc2d3745e` |
| `src/scene/body/manifest.ts` | `006cd81679ff99ffd791e70706dc755e0e44e1df` |
| `src/game/cities/lagos/map.ts` | `9f7224f73956b45913ed8a3d318d522b8bcaf063` |
| `src/budgets.ts` | `f5b3f4e35f3520fbb0d7197c250c1c4689d0bac4` |

## Common write, resource and checkpoint boundaries

- Each task's exact two prefixes are exclusive. No writes to another task, shared coordinator docs, `src/`, `server/`, `world/`, shared `scripts/`, root package/lockfiles, `.github/`, deploy or environment settings.
- Workers check actual repository status/instructions before edits. Follow the parent's implementation scope; a mismatch or unexpected owner is reported rather than reset/overwritten.
- Tasks can proceed independently using their own synthetic fixtures and read-only baseline. Exchange immutable hashes/contract proposals; do not create cross-task imports into unreviewed branches.
- Use available tools and existing locked dependencies. No new paid resources, accounts, credentials, access, broad source acquisitions or production publishing. Registry/coordinate/design checks need no full build or browser.
- Keep heavy=1, Node heap=1,536 MiB and minifier=1 on shared machinery. A busy slot means defer that check and continue source work; do not cancel another owner or repeatedly poll. A separate cloud task is not proof of a separate machine or extra budget.
- Any exporter/browser probe needs a short explicit timeout and owned processes/ports. Close its resources and label software WebGL. Preserve original Blender production and capacity.
- Start with one small independently reviewable contract/fixture/prototype. Commit `CONTINUE.md` early, then the bounded implementation plus focused observed tests, then final receipts. Push only the task's own authorized branch, without force or main merge.
- Keep initial committed receipts/fixtures small (aim <=5 MiB per task). Larger genuine art needs an agreed immutable artifact handoff; do not flood Git with disposable renders.
- Record exact source pin, output hashes, observed pass/fail/blocked evidence, resource limits, remaining processes, next commands and original pipeline boundaries in each continuation file. Do not relabel source-only or synthetic checks as completed art.

Example bounded check once a worker has created a meaningful test file (substitute that exact existing filename, not a broad repository glob):

```sh
NODE_OPTIONS=--max-old-space-size=1536 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 60s node --test --test-concurrency=1 experiments/cloud-lanes/lagos-geography/frame.test.ts
```

No unchanged 45-test rerun is required for this documentation update. Before any later shared integration, pin the actual candidate and run its applicable checks; the full compiler failure remains unresolved.

## Next parent actions

Forward the final documentation SHA and this launch ledger to the four existing tasks. Obtain their first checkpoints and independently verify changes stay in their prefixes. Reconcile contracts through one designated integration owner, without taking shared paths from GRAPHICS/WORLD/LIVING by implication. Confirm block and named target devices, obtain the original Blender importer/source handoff, and resolve character ownership before expanding production. Parent controls all further launches based on useful results, available capacity and usage.
