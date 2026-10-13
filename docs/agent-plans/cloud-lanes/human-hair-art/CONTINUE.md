# Original hair art — continuation

Two original editable hairstyles and inexpensive silhouette derivatives are delivered, with inspected scalp-boundary views. **Actual fit pending master.** This is an art handoff, not finished realistic-human or runtime acceptance.

Branch `codex/cloud-human-hair-art-20261013`, based exactly on integration `caaee5e1b91afc7f3cd3f2124df3547dc7f492ec`. Early checkpoint pushed and remote-verified: `97af70f08d30371f6b786af8d3cd15fd474654e2`. Final task response supplies the final pushed SHA; this document cannot contain its own future commit hash.

Own only `experiments/cloud-lanes/human-hair-art/` and this documentation directory. Parent authorized branch-only non-force commits/pushes and continuation. No main/runtime/other teams' assets edits, deployment, credentials, paid tools, global installs or worker fanout.

## Open these first

- [C01 curl contact sheet](../../../../experiments/cloud-lanes/human-hair-art/artifacts/c01-v3/contact-sheet.png) and [editable source](../../../../experiments/cloud-lanes/human-hair-art/artifacts/c01-v3/curl-crop-editable.blend): 640 original near curl bundles. Distinct dark short curl crop; still visibly geometric, with foundation showing between some bundles.
- [S02 swept bun contact sheet](../../../../experiments/cloud-lanes/human-hair-art/artifacts/s02-v3/contact-sheet.png) and [editable source](../../../../experiments/cloud-lanes/human-hair-art/artifacts/s02-v3/swept-bun-editable.blend): 280 scalp ribbons, grooved low twist and coiled centre. Regular grooves and stylised knot still need refinement.
- [LOD comparison](../../../../experiments/cloud-lanes/human-hair-art/artifacts/lod-v2/contact-sheet.png) and [editable LOD source](../../../../experiments/cloud-lanes/human-hair-art/artifacts/lod-v2/silhouette-lods-editable.blend): 358/502 triangle silhouettes; close panels expose lost detail, small panels compare approximately 56 px head height. Switching threshold remains a proposal.
- [Measured costs, reproduction and limitations](../../../../experiments/cloud-lanes/human-hair-art/README.md), [decoded bounds/bytes](../../../../experiments/cloud-lanes/human-hair-art/export-metrics.json), [packet hashes](../../../../experiments/cloud-lanes/human-hair-art/packet.json).

All art is original; no copied texture/model or scanned likeness. Grey calibration head is explicitly temporary, not a competing human foundation. All work follows repository AGPL-3.0-or-later; lane-local bounded supervisor derives from the frozen portability lane. No texture payload. Mesh/PBR variants only; rigs/morphs/animations=0.

## Exact inputs and fitting blocker

Packet SHA-256 `9c15f10e6c82bbf31aa74e9dbcf2c9d3e4aef67ef3789d255c7c2e608623e7cb`: packet bytes/SHA, input-index SHA, 155 frozen file hashes and four integration source hashes passed. Exact committed input comparisons also passed after fetching the four immutable source commits. The full integration seal runner was not rerun: root Three dependency was absent; no root install or unchanged full-suite run was made.

Human contract only: `71d6b5ad391754b0f30fc5364e993208299640ed`. No new actual master mesh checkpoint was received. Requested through parent: actual task `01a13667-6b47-7763-b71a-7d06139ed03f` exact commit, scalp/head mesh, topology and rig hashes, available head/ear/body endpoints and poses. Existing production-character ownership is not superseded. Never edit either master or claim current-game fit.

Each style's `attachment-proposal.json` pins the **real temporary** source/GLB/vertex/topology hashes and measured triangle+barycentric anchors; actual master/rig fields are null. Body/head transforms are explicit in metres/Y-up/+Z-forward. We mirror the v1 proposal's binding fields without falsely identifying an unrigged fixture as `allworld-body-23@1`. Head/ear/body endpoints and poses cannot be demonstrated until the immutable producer packet arrives.

Measured temporary-head issues remain visible and recorded: C01 foundation penetrates up to 2.161 mm (near), while curl vertices have positive sampled clearance. S02 scalp/ribbon clearance is positive; tucked bun root/core/ridges penetrate up to 4.348 mm near and 4.805 mm far. These are nearest-triangle signed vertex measurements, not continuous collision or morph tests. Fix/review them on a lane-owned derivative of the actual master. Near meshes (99,806 / 38,670 triangles) exceed the current 34k whole-avatar cap; reduced meshes (14,078 / 5,766) exceed the current 4.5k medium whole-avatar cap. Silhouettes also require whole-character budget reconciliation. No budget waiver or production admission.

## Checks and usage

- Eight GLBs: Khronos validator zero errors / zero warnings. BIN float positions measured separately from authored values; identity node transforms confirmed. Materials opaque core PBR, no unsupported alpha claim.
- Both saved hairstyle `.blend` files re-export near/far GLBs **byte-identically** to committed artifacts (four byte comparisons). This ties inspected GLB geometry to actual editable source.
- Three final contact sheets opened and inspected. Raw Three 0.180.0 GLTFLoader, Chromium 154 SwiftShader, local-only HTTP; successful responses, no final page errors, explicit disposal and server/browser close. No phone/hardware or production importer proof. Static ModelPart still drops PBR factors; humans require the skinned route.
- 25 bounded jobs, including one failed browser attempt: summed child elapsed 86.474 seconds, maximum sampled process-tree RSS 933,076,992 bytes (~890 MiB), no remaining owned processes. heavy=1, Blender threads=2, Node heap <=1536 MiB, 60–120 second limits; no minifier used. No full build/typecheck/test suite repeated. Final heavy/server/browser slots 0/1.
- Retained failures/revisions: initial missing `three/addons/` import map caused one clean timeout; corrected and rendered. Initial cap winding corrected. Curl overlap refined after inspection; initial sparse swept ribbons refined; bun centre closed; proxy facet penetration corrected in LOD v2. Rejected uncommitted assets are under ignored `runs/`, not Git.
- Discovery correction to early note: the first shell chain stopped at an absent experiments path in the old checkout before testing Blender. Unnecessary download/pip probes failed and installed nothing. A full lookup found existing `/usr/bin/blender` 4.3.2; this is not evidence of a delayed installation.

## Next action for parent / continuation agent

1. Fetch the final exact SHA, verify assigned-path-only diff, run `verify_inputs.py` and `seal_packet.py --check` in the lane. Inspect the three contact sheets and measured cost/clearance limitations.
2. Relay the exact human producer mesh/rig/endpoint checkpoint. Until then preserve `actualFit=pending-master`; do not invent hashes or available controls.
3. Create a separately owned fitted derivative, recompute surface anchors and inverse bind, render all supplied head/ear/body extremes and poses, and measure triangle collisions plus clearance. Never save over the producer's `.blend`.
4. Improve hairline transitions and fine strand appearance; reduce near geometry/material primitives or bake original fine detail within a reviewed allocation. Parent/GRAPHICS owns actual human binding, PBR/runtime adoption and device tests.

Exact commands and resource receipts are in the lane README and `receipts/`. Use fresh output directories and shared slots for any further render/test/export. Keep the first pushed art checkpoint immutable; no force push, main merge, storage service or deployment.
