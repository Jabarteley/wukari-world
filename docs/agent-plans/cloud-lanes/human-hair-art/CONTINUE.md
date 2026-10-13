# Original hair — current continuation

**Actual-master fitted derivatives are now delivered.** Consume [MASTER-FIT.md](MASTER-FIT.md) first. The parent supplied `3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a` during this task; the previous missing-mesh blocker is resolved. There is still no skeleton, locomotion, current-game adoption or realism acceptance.

Branch `codex/cloud-human-hair-art-20261013` is based exactly on integration `caaee5e1b91afc7f3cd3f2124df3547dc7f492ec`. Early original curl checkpoint: `97af70f08d30371f6b786af8d3cd15fd474654e2`. Two-style calibration/LOD checkpoint: `840728421a4e48cd253a771e1235a4ac52c5ddce`. Final response supplies final pushed/remote-verified fitting SHA.

Only `experiments/cloud-lanes/human-hair-art/` and this documentation prefix are owned. Parent authorized branch-only non-force commits/pushes. No main/runtime/other-owner edits, merge, deployment, paid tools, credentials, global install, external model/texture acquisition or worker fanout occurred. The real human source and original high-detail/calibration hair files retain their hashes.

## Reviewable outputs

`artifacts/master-fit-v1/` contains self-contained `master-fitted-hair-editable.blend`, four actual morph GLBs, fit proposal, full 448-check report, validator report, and three inspected actual-master contact sheets in `curl-views/`, `bun-views/`, `body-lod-views/`. The source's original placeholder is hidden only in the separately owned derivative. Source master is not edited.

- Fitted crop: 6,574 hair triangles; 189,416-byte GLB; whole character 33,242 triangles.
- Fitted bun: 5,766 hair triangles; 213,100-byte GLB; whole character 32,434 triangles.
- Fitted silhouettes: 358 / 502 triangles; 13,856 / 18,984-byte GLBs.
- Exact source, position/topology/UV hashes verified on all 31 master meshes before fitting. Packet-lock and all 155 integration inputs still pass independently.
- **112 sampled cases × four variants = 448 checks:** zero body-intersection candidates, zero confirmed intersections, zero sampled penetrations beyond 0.2 mm. Minimum crop/bun clearances 3.046 / 3.193 mm. All six implemented controls and available expression presets covered; no unimplemented controls or skeletal poses claimed.
- Four fitted GLBs pass Khronos 0 errors / 0 warnings and match saved-source re-export final bytes, including morphs. Calibration's eight GLBs also passed. One export metadata ordering mismatch was identified and normalized with identical geometry/material/morph bytes; receipt retained.
- Three fitted sheets expose front/profile/nape/ear boundaries, asymmetric ear and height/expression cases, full-body short/wide vs tall/narrow and fitted LODs. Raw GLTFLoader only, SwiftShader. Reduced crop is visibly sparse; bun has coarse bands. Fitting geometry is useful but visual realism remains unfinished.

Original calibration deliverables remain in `c01-v3/`, `s02-v3/`, `lod-v2/`, with their separate source, dense near/far GLBs, inspected sheets and historical penetration measurements. Their explicit temporary/pending labels were not rewritten into an actual fit claim. Current source/frame/attachment details are in [MASTER-FIT.md](MASTER-FIT.md); measured costs/hashes in lane `export-metrics.json` / `packet.json`.

## Usage and retained limits

33 bounded jobs including one failed initial browser import-map attempt: 114.129 seconds summed child elapsed; maximum sampled process-tree RSS 933,076,992 bytes (~890 MiB). heavy=1, Blender threads=2, Node heap <=1536 MiB, 60–120 second job limits, no minifier. All owned child processes cleaned up; final heavy/server/browser slots free. No unchanged full suite/build/typecheck was rerun. Calibration usage is preserved in old commits; current exact receipts are in `receipts/`.

Initial cap winding/curl density, swept ribbon density, bun centre and silhouette facet penetration were corrected during visual work; rejected scratch assets remain ignored. Initial missing Three/addons map caused a clean timeout. The integration seal runner lacked root Three; independent packet/file hash checks and exact Git comparisons passed without root dependency changes. Early Blender discovery note was corrected: a shell chain short-circuited before checking Blender, unnecessary download/pip probes failed, and the existing Blender binary was found. No installation happened. Disconnect notification was reconciled at 19:09:18 UTC; environment worked, no loss or render restart.

## Next owner actions

1. Fetch final exact SHA, verify two-prefix-only diff and run `verify_inputs.py` / `seal_packet.py --check`. Read MASTER-FIT and inspect actual contact sheets.
2. Keep the exact master pin and unrigged status. Future producer rig/control/topology updates need a new pin and re-fit. Do not treat body triangle-budget fit as production approval or use the static ModelPart importer for morph attachment.
3. Improve portrait-quality hairline/fibre appearance within an explicit allocation, preserving original editable sources. Add actual runtime binding and device proof only in the correctly owned integration task. Current crop is intentionally reduced to fit the unchanged high-preview cap.
4. For reproduction, `materialize_master.py` copies/verifies Git object bytes into ignored scratch; it does not rebuild the producer. Use fresh owned output versions and shared bounded slots. No overwrite of master or calibration originals.
