# Continue the first-wave integration review

Parent explicitly resumed the cancelled integration review on 13 October 2026. Only isolated first-wave additions and this new integration-contract prefix are in scope. No main merge, shared runtime/dependency/CI/deploy change, new paid/security action, or worker launch. Parent owns expansion. Existing character task ownership remains unknown and original Blender production continues separately.

Branch `codex/cloud-first-wave-integration-20261013`, worktree `/workspace/joinallworld-cloud-integration`, starts at coordinator `844da27a549d30c5148c1cb5b5927b7d0f5bfde6` with production baseline `81d9f599d87dfb34adf49cd9337a0b05678e5e0d`. The cancelled review left no local partial changes: clean coordinator branch, original checkout unchanged, all slots free. Source commits are pinned in `experiments/cloud-lanes/integration-contract/input-index.json`; exact byte comparison imported 117 additions only, without modifying any lane's original files.

Completed first checkpoint: source scope and bytes inspected; all four source handoffs read. Export packet verifier passes 28 inputs/7 outputs; source validator passes with `eligibleForProduction=false`. Whole existing suites are not rerun. The first one-off input-index attempt used `files` instead of geography's `sources` key and failed before writing an index; corrected reusable script checks the actual format. That preparation failure is not hidden as a pass.

Next: implement and run focused cross-contract smoke, adopt the synthetic Yaba AOI as reversible planning, seal the immutable integrated packet, then specify 4–6 original tangible build lanes. Keep source admission, schema versions, local/projected axes, PBR/static loss and missing human geometry explicit. This initial checkpoint is not final integration acceptance.

Own only this docs prefix and `experiments/cloud-lanes/integration-contract/` for new edits. Preserve all imported lane files unchanged. Node dependencies are reused through ignored worktree-local `node_modules` link to the existing coordinator installation; no reinstall or manifest mutation. Preserve heavy=1, heap1536, short bounded commands. No server/browser/Blender is running here.

Current commands from repository root:

```sh
python3 experiments/cloud-lanes/integration-contract/pin_inputs.py --check
python3 experiments/cloud-lanes/asset-export-portability/verify_packet.py
node docs/agent-plans/cloud-lanes/source-provenance/validate.ts
node scripts/agent-slot.ts status
```

The final continuation update will record exact packet hash, focused results, review limitations and next commands. Every handoff must report the actual pushed SHA, not assume a push occurred. Push only this branch without force. No source registry pass makes the Yaba square surveyed or the beacon a realistic building/human.
