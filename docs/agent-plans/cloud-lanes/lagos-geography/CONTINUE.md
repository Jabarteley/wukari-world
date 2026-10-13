# Continue Lagos geography prototype

Completed bounded lane-03 prototype: pure coordinate/placement adapter, proposed 200 × 200 m Yaba area, original synthetic fixtures, deterministic sample manifest, and **17 passing focused tests**. Ready for parent review, not runtime integration or surveyed-geometry acceptance.

## Exact inputs and ownership

- Repository: `kromate/joinallworld`; authorized isolated branch: `codex/cloud-lagos-geography-20261013`.
- Code baseline: `81d9f599d87dfb34adf49cd9337a0b05678e5e0d`; fetched remote main matched it during this task.
- Initial coordinator: `6c2885d15d38b9d64501f14d467db9d5c01573b2`; updated first-wave ledger and relevant archived plan contracts read at `844da27a549d30c5148c1cb5b5927b7d0f5bfde6`. Parent lane 03, task `01a13667-2143-7079-b734-2a9b08685033`.
- Early contract checkpoint: `98f64592`. Final exact delivery SHA is in the agent's final response; compare it with the remote branch. This document cannot embed its own eventual commit ID.
- Original checkout `/workspace/joinallworld`, branch `work`, was preserved. Worktree `/workspace/joinallworld-lagos-geography` owns only `experiments/cloud-lanes/lagos-geography/` and `docs/agent-plans/cloud-lanes/lagos-geography/`.
- Parent owns integration/further launches; WORLD retains shared geography/production release, GRAPHICS/scenes/neighbourhood their runtime/asset paths, and LIVING movement/route authority. No new subworkers, pipeline changes, runtime/maps/main edits, paid service, credentials, permissions, CI trigger, PR or deployment.
- `source-pins.json` records SHA-256 and byte lengths for all 14 inspected coordinate/map/street/scene contract files at the baseline. [CONTRACTS.md](CONTRACTS.md) explains them. The new fixture's own exact version is its delivered Git commit.

The anchor is the existing hand-placed `PLACES.cchub` coordinate `[3.382,6.5075]` in `src/map3d/cities/lagos.ts`, labelled Herbert Macaulay Way, Sabo Yaba. The source describes approximate positions (tens/hundreds of metres). No current site location or actual block edges were independently verified. The 200 m square, footprint dimensions, elevations, headings, model pivots and heights are original synthetic fixtures. Every manifest feature carries that provenance; real horizontal/vertical error bounds stay `null`.

## Files and results

Implementation in `experiments/cloud-lanes/lagos-geography/`:

- `adapter.ts`: bounded geographic ↔ local-metric ↔ scene, existing city ↔ street-projected coordinates, quantized tile addressing, and static model pivot/heading placement. No I/O or runtime registration.
- `fixture.ts`: explicit proposed frame, closed 200 m AOI and three fictional placements. No actual assets, source acquisition or real geometry.
- `manifest.ts`: deterministic pure builder, provenance/uncertainty labels and proposal gates; no PRNG or clock.
- `generate.ts`: writes/checks only `source-pins.json` and `sample-manifest.json` in this lane; fails on source drift.
- `adapter.test.ts`, `manifest.test.ts`: 17 focused tests; `README.md`: API/units and reproduction commands.

Observed on Node **24.19.0**, Linux, 2026-10-13:

| Result | Evidence |
| --- | --- |
| 17 pass, 0 fail/skip, 183.951315 ms reported by Node | [tests.txt](tests.txt) |
| 486 samples; maximum geographic/city/street inverse error **7.789168533229508e-11 m**; scene inverse **3.182604911552452e-14 m** | Diagnostic in tests.txt |
| Maximum error after centimetre tile quantization **0.005503984662381194 m**, below 0.01 m | Same diagnostic; not real-world accuracy |
| Independent axis/scale, one-metre cube edges, heading cardinals, scale/pivot, negative tile seams, spherical side lengths | Named tests; cube verified in math only, no golden-scene render |
| `source-pins.json`: 2,311 bytes, SHA-256 `20a72bbf758578e02f0dd6baecf91565c32b7ef6f9ddd297754624bff82fc7db` | [generate-check.txt](generate-check.txt) |
| `sample-manifest.json`: 19,021 bytes, SHA-256 `a1c0d7e8245fa3e184619f48c801e22dc397e094c51f92703bb65fd0685bee71` | Same check; reversed feature input order gives identical bytes |

Integration finding: map/street east scale is `cos(9°)/cos(6.5075°)=0.9940932547076073`, so 200 local metres east becomes **198.81865094152147 projected metres**. Street drawing consumes projected metres directly; venue movement's reference is 2.45/1.75 scene units per human metre. No universal 1.4 conversion was imposed. Geographic and height datum are unverified; local height zero is arbitrary, not sea level.

Failed evidence is retained. `first-check.txt` records artifact generation followed by `/usr/bin/time: No such file or directory`; no tests ran then, and the outer tee masked that shell failure. Later commands use `set -o pipefail`. `first-tests.txt` records 15 pass / 2 fail from erroneous test expectations: a guessed longitude-step value and checking the near-zero x component alone for origin rounding. Independent Python equations gave 0.001° longitude at the anchor = `110.47865354493777 m` and nominal-origin offset `(0.0001232027398145874,0.4745459550886153)` map units. Expectations were corrected without relaxing tolerances; the next run passed all 17. No production source changed.

## Reproduction commands

Inspect another clone's instructions/status before creating a fresh destination; never reset someone else's checkout:

```sh
git fetch --no-tags origin codex/cloud-lagos-geography-20261013
git worktree add --detach /workspace/allworld-lagos-geography-review FETCH_HEAD
cd /workspace/allworld-lagos-geography-review
git rev-parse HEAD
git diff --name-only 81d9f599d87dfb34adf49cd9337a0b05678e5e0d HEAD
```

Require only the two owned prefixes and compare HEAD to the final delivery SHA. No npm install is needed:

```sh
NODE_OPTIONS=--max-old-space-size=1536 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 60s node --test --test-reporter=tap --test-concurrency=1 experiments/cloud-lanes/lagos-geography/adapter.test.ts experiments/cloud-lanes/lagos-geography/manifest.test.ts
NODE_OPTIONS=--max-old-space-size=1536 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 30s node experiments/cloud-lanes/lagos-geography/generate.ts --check
git diff --check
node scripts/agent-slot.ts status
```

Initial generation used the same bounded heavy wrapper with `node experiments/cloud-lanes/lagos-geography/generate.ts --write`. Regenerate only for an intended fixture change. Do not refresh source pins without baseline review. Do not run `npm test` for this lane: its pretest generates shared city/word files. No full suite, build or typecheck was repeated. Node executes erasable TypeScript; static compilation is **not claimed** (no installed compiler/dependencies in this worktree). The coordinator's broad compiler OOM remains a separate baseline issue.

Checks used heavy=1, `NODE_OPTIONS=--max-old-space-size=1536`, explicit 30/60 s timeouts. No browser/server/Blender started. Kernel memory snapshot before passing tests was 432,017,408 / 17,179,869,184 bytes; a snapshot, not peak usage. No resources/process leases should remain after terminal commands. Preserve shared limits and the original Blender production.

## Blockers and parent next steps

1. Review/select the actual block with the source-provenance lane. This square is an authoring AOI, not a cadastral or confirmed street boundary. No surveyed control points exist in this delivery.
2. Obtain admitted source geometry and actual horizontal/vertical datum, terrain, building/road/entrance and height evidence. Synthetic ranges cannot become measured error bars.
3. Select the host with its current owner. City-street integration must address fixed-parallel distortion and tile rebasing; procedural neighbourhood needs a true-north/origin mapping. Direct insertion of local-metric coordinates would misalign the existing network.
4. Receive actual model unit/forward/pivot/LOD declarations and hashes from the export owner. The three `synthetic:` keys have no assets. This placement prototype does not prove importer, GLB or Blender compatibility.
5. Parent's integration owner handles runtime adapter, collision/support/navigation, rendered one-metre golden-scene cube, gameplay and device/visual acceptance. No shared integration patch is requested/applied here. Game caps stay unchanged.
6. Avoid repeating successful tests unless inputs/code change. Parent controls further launches/scaling.

Push only this branch with `git push origin HEAD:refs/heads/codex/cloud-lagos-geography-20261013` without force. Compare `git rev-parse HEAD` with `git ls-remote --heads origin refs/heads/codex/cloud-lagos-geography-20261013`. The final response records actual push/verification, not merely this intended command.
