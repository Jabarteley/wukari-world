# Continue: isolated human design contract

**Active visual prototype continuation:** parent subsequently authorized this same task to create original isolated Blender geometry and functional morphs. Read the latest [anatomy v4 continuation](prototype/anatomy-candidate-v4/CONTINUE.md) first for the separate connected eye/socket/lid candidate and completed finite checks, then [prototype/CONTINUE.md](prototype/CONTINUE.md) for the frozen master, controls video and fitting history. The contract-only checkpoint below is retained as history; its statements about no Blender work and unchanged executable code describe that earlier checkpoint. Shared runtime and existing character/Blender production remain untouched.

## Locate and verify

- Repository: `kromate/joinallworld`.
- Branch: `codex/cloud-human-design-contract-20261013`.
- Code baseline: `81d9f599d87dfb34adf49cd9337a0b05678e5e0d`.
- Initial checkpoint: `aca669dc` (baseline audit and ownership).
- Implementation/test pin: **`fe25d2bc241369354aa8ea720a8344eb9f244fa1`**. Its branch push was verified by `git ls-remote`. Later changes are only documentation, diagram layout and receipts; executable experiment code is unchanged.
- Final handoff SHA: obtain from the final task response and verify it below. A file cannot embed its own final commit SHA. Final push is branch-only, no force, merge, PR publication or deployment.
- Exclusive prefixes: `experiments/cloud-lanes/human-design-contract/` and `docs/agent-plans/cloud-lanes/human-design-contract/`.
- Local worktree: `/workspace/joinallworld-human-design-contract`. Original `/workspace/joinallworld` stays clean on `work` at the baseline. Do not assume these paths exist on another machine.

On another clone, inspect its instructions and status, then use a fresh destination (never reset another checkout):

```sh
git fetch origin codex/cloud-human-design-contract-20261013
git worktree add --detach /workspace/allworld-human-design-review FETCH_HEAD
git -C /workspace/allworld-human-design-review rev-parse HEAD
git -C /workspace/allworld-human-design-review diff --name-only 81d9f599d87dfb34adf49cd9337a0b05678e5e0d HEAD
git ls-remote --heads origin codex/cloud-human-design-contract-20261013
```

Require the final response SHA to equal both fetched HEAD and remote branch. Require every changed path to be in the two prefixes above. Parent may cherry-pick/review the commits; no shared runtime change is proposed as already accepted.

## Exact inputs and ownership

Read all initial coordinator documents at `6c2885d15d38b9d64501f14d467db9d5c01573b2:docs/agent-plans/cloud-production-20261013/`. Then read `FIRST-WAVE.md`, the character integration contract and canonical lanes 04–11 in the full archived plan at `844da27a549d30c5148c1cb5b5927b7d0f5bfde6`. The newer ledger confirms this lane's standalone scope and supersedes provisional numbering; existing work was continued without restart.

Inspected `docs/AGENT-COORDINATION.md`, the relevant ownership/evidence in `docs/AVATAR-WORK.md` and `docs/GRAPHICS-EXECUTION-CHECKPOINT.md`, `CONTRIBUTING.md`, `docs/AGENTS.md` (player-agent API reference), and current character/body/wardrobe source. No root AGENTS.md was found. Source hashes for 14 relevant files and three body/clip assets are in [baseline-audit.json](baseline-audit.json).

Task `01a13520-8d89-70f1-a722-786459524996` cannot be read due to parent-reported `unsupportedplacementformatv2`. Its status and paths are unknown, not abandoned. No stop or edit of it occurred. GRAPHICS retains body/wardrobe/runtime ownership, WORLD release authority, and LIVING movement/boarding authority. No new agents were spawned.

## Deliverables and useful findings

- [README.md](README.md): interface, 38 scalar control meanings, 16 expression channels, save lifecycle, binding frames and source mapping.
- [Experiment](../../../../experiments/cloud-lanes/human-design-contract/): v2 save schema, explicitly hypothetical v1 schema, v1 anchor schema, strict bounded validator, canonical serialization, legacy/prototype migration, independent control edits, reported UI clamping, host transient expression composition and attachment checks.
- `fixtures/`: seven original inclusive fictional adult parameter presets (plan minimum six), legacy v0, hypothetical prototype v1, synthetic hair-binding packet and labelled index. No real-person/photos/scans or external art.
- [Original SVG diagram](topology-and-dependencies.svg) and [reviewed PNG](topology-and-dependencies.png): topology/deformation dependency proposal, explicitly not geometry or a realistic character.
- [REALISM-ACCEPTANCE.md](REALISM-ACCEPTANCE.md): pending anatomical, deformation, rig, clothing, save/load, actual-game and physical-device acceptance with proposed measurement targets awaiting owner agreement.
- [checks.txt](checks.txt), [verification.json](verification.json) and [SHA256SUMS.json](SHA256SUMS.json): executed evidence, exact limits and file hashes.

Both baseline bodies have 23 joints, 9,002 indexed triangles from metadata and zero morph targets. Male POSITION count is 5,136 and female 5,114: shared bone names do not mean shared vertex indexing. Male/female GLBs are 159,916/157,992 bytes; the 338,060-byte shared pack has 60 clips. No jaw/eye bones are present. The audit reads compressed-container metadata; it does not decode geometry or certify rest matrices.

Current height/build categories already scale the outer body, and age presentation changes a face region. New design controls therefore remain neutral relative offsets after the retained legacy appearance, avoiding double application. Empty legacy looks stay empty to preserve seeded normalization. Existing authoritative wardrobe ID/conflict/inventory checks remain required; this schema grants no equipment or ownership.

## Executed checks and reproduction

Initial narrower test pass: 12/12, 104.081148 ms. After reconciling the plan and adding brow/lid/hand/foot/gaze/speech, the final test pin above passed **15/15**, zero failed/skipped, **150.094806 ms**. Both schema and fixture generators matched all checked-in output (3 schemas, 11 fixture files). Independent Python `jsonschema 4.26.0` accepted all three Draft 2020-12 schemas and nine valid contract fixtures, and rejected ten invalid cases. Semantic barycentric/mesh identity checks are in Node.

Node 24.19.0; Python 3.12.14. No dependencies were installed. The exact complete focused command from the worktree root was:

```sh
set -o pipefail
NODE_OPTIONS=--max-old-space-size=128 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 30s bash -c 'node experiments/cloud-lanes/human-design-contract/generate-schemas.mjs --check && node experiments/cloud-lanes/human-design-contract/generate-fixtures.mjs --check && node --test --test-concurrency=1 experiments/cloud-lanes/human-design-contract/contract.test.mjs && python experiments/cloud-lanes/human-design-contract/check-json-schema.py' 2>&1 | tee docs/agent-plans/cloud-lanes/human-design-contract/checks.txt
```

Do not rerun unchanged checks merely to continue this handoff. On a fresh environment, Python `jsonschema` is needed only for the independent cross-check; the experiment/Node tests require no npm dependencies. Report a missing cross-validator separately rather than installing broad dependencies or claiming it passed.

Reproduce the read-only source audit if needed (its tests already compare it):

```sh
node experiments/cloud-lanes/human-design-contract/audit-baseline.mjs
```

Diagram: ImageMagick `convert` failed because `rsvg-convert` is unavailable. No output was counted. Existing Inkscape 1.4 then exported successfully with nonfatal font cache/Pango/Gtk warnings; final PNG was visually inspected after correcting annotation overlap. Exact successful export command:

```sh
NODE_OPTIONS=--max-old-space-size=128 INKSCAPE_PROFILE_DIR=/tmp/allworld-human-design-inkscape node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 20s inkscape docs/agent-plans/cloud-lanes/human-design-contract/topology-and-dependencies.svg --export-area-page --export-type=png --export-filename=docs/agent-plans/cloud-lanes/human-design-contract/topology-and-dependencies.png
```

No Blender rebuild, browser/server, full tests/build/typecheck, new CI dispatch, paid operation or production request. Final slot inspection: heavy 0/1, server 0/1, browser 0/1; all owned commands terminal. No user/unknown process was stopped. Existing heap1536/heavy1/minifier1 limits preserved; actual Node heap here was lower at 128 MiB.

Verify retained files from the worktree root without regenerating anything:

```sh
python - <<'PYVERIFY'
import hashlib, json
from pathlib import Path
m = json.loads(Path('docs/agent-plans/cloud-lanes/human-design-contract/SHA256SUMS.json').read_text())
for p, expected in m['files'].items():
    assert hashlib.sha256(Path(p).read_bytes()).hexdigest() == expected, p
print(len(m['files']), 'file hashes match')
PYVERIFY
git diff fe25d2bc241369354aa8ea720a8344eb9f244fa1 HEAD -- experiments/cloud-lanes/human-design-contract
git diff --check 81d9f599d87dfb34adf49cd9337a0b05678e5e0d HEAD
```

## Remaining blockers and next bounded actions

1. Parent reconciles existing character task and receives immutable topology/rig/morph/asset contracts. This lane does not own adoption or character implementation.
2. Existing owner reviews schema names/ranges, resolves whether both current mesh families migrate to a shared topology, and defines accepted endpoints, bind/rest/retarget data and LOD correspondence. Current files have no independent face morph targets; no accepted new rig or production anchors exist here.
3. Owner maps controls through `loadBody` / `SkinnedBody` with compatible material/wardrobe/contact ordering. Slot surfaces and prototype channels do not prove hair/clothing fit or realistic expression. Anchor dependency hints are not cache invalidation authority: every morphology/bind/pose/scale change reevaluates all anchors.
4. Integrator alone proposes optional Look persistence/public/server fields, existing inventory validation, atomic migration/rollback and capability fallback. Do not import this Node filesystem-based prototype directly into the browser bundle.
5. Run agreed geometry/corrective tests and small endpoint/pose image batches on the actual owned character. Then demonstrate six-plus presets, swaps, locomotion and save/reload in the game with portrait/full-body/street evidence and named hardware targets. No numerical/schema/diagram pass is a realism pass.
6. The coordinator's full compiler OOM at the 1536 MiB cap remains unresolved outside this task. Current runtime budgets remain unchanged; larger plan budgets need the established owner review process. Original Blender source/importer and physical-device acceptance remain external dependencies.

This delivery is complete within its assigned contract/fixture/diagram scope. Further integration and launches belong to the parent; retain all original Blender work and shared owners.
