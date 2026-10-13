# Original meter beacon: isolated Linux export proof

Read [CONTINUE.md](../../../docs/agent-plans/cloud-lanes/asset-export-portability/CONTINUE.md) for the result, exact pins, limitations and handoff. This owns no production runtime or asset paths.

- `fixture.json`: analytic geometry, axes/metres, bottom pivot, named anchors, linear-color/PBR/LOD contract. Original geometry, no external asset input; AGPL-3.0-or-later, consistent with the repository.
- `export_fixture.py`: Blender 4.3.2 authoring/export and saved-source re-export. Preserves the editable `.blend`; refuses existing asset destinations and outputs outside this lane.
- `pack.sh`: optional Meshopt derivatives using official pinned `gltfpack@1.3.0`. Explicit `-ce ext` for Three 0.180.0; no Draco, topology simplification or animation processing.
- `validate.ts`, `contract.test.ts`, `golden-import.json`: actual Three imports, read-only production static adapter, Khronos validation and negative contract tests. Goldens are frozen, never rewritten during normal reproduction.
- `packet.json`, `verify_packet.py`: versioned identity, source/runtime hashes and frozen artifacts. Abort on changed input or output hashes.
- `render.html`, `render.py`: actual GLB software WebGL render; no persistent animation loop. Third column uses the existing static importer then reconstructs a mesh with current runtime material defaults. It is not a full scene-models/gameplay render.
- `bounded_run.py`: 60-second default, 120-second maximum; 1536 MiB sampled process-tree RSS ceiling, including Chromium descendants with separate sessions. Limits are sampled every 50 ms, not kernel-enforced reservations; shared pages may be counted more than once. Repository heavy/server/browser slots are acquired by callers.

Prerequisites: Linux, Node 24 (minimum 22.18), Blender 4.3.2, Python 3.12, and the existing Chromium/Python Playwright for the optional render. Do not install new services or system packages to force a pass. The three task-local npm packages are locked; no root install is needed.

From repository root, one bounded command verifies hashes, generates into a fresh ignored directory, re-exports the saved source, compares raw GLB bytes, packs, checks goldens and runs only this lane's tests:

```sh
bash experiments/cloud-lanes/asset-export-portability/reproduce.sh
```

For rendering only (after local npm dependencies are installed), use:

```sh
node experiments/cloud-lanes/asset-export-portability/prepare_browser.ts
NODE_OPTIONS=--max-old-space-size=1536 node scripts/agent-slot.ts heavy --wait-ms 1000 -- \
  node scripts/agent-slot.ts server --wait-ms 1000 -- \
  node scripts/agent-slot.ts browser --wait-ms 1000 -- \
  python3 experiments/cloud-lanes/asset-export-portability/bounded_run.py --seconds 60 \
    --receipt experiments/cloud-lanes/asset-export-portability/runs/render-resource.json -- \
    python3 experiments/cloud-lanes/asset-export-portability/render.py
```

Render writes a fresh observed screenshot/browser receipt to `runs/render/`, leaving the committed packet unchanged. Inspect it, never overwrite the frozen packet to make a test pass. No renderer is left running. Source identities and goldens are versioned inputs: changes require review and a new packet version, not `--write-golden` as a repair command.

The proof intentionally contains no textures, skins, morphs or animation. `sips` texture resize/JPEG/reference-colour equivalence is not implemented or certified. Skinned production export remains a different owned pipeline. No game budgets, streaming/fallback behavior or physical-phone performance are certified here.
