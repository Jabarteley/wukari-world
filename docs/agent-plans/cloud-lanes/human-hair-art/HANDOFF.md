# Immutable artifact handoff proposal

Use the exact final branch commit returned by this task and `experiments/cloud-lanes/human-hair-art/packet.json`. The early reviewable checkpoint is already immutable at `97af70f08d30371f6b786af8d3cd15fd474654e2`; its first packet was 4,675,055 bytes before the manifest and continuation, below the 5 MiB aim.

The final handoff adds a separate small packet, rather than replacing first-checkpoint binaries: S02 art folder 2,541,777 bytes, silhouette folder 311,088 bytes. Final C01 folder including attachment evidence is 4,642,886 bytes. Source, receipts and continuation add a small measured overhead reported exactly by `packet.json`. Largest single file is the original C01 compressed editable source, 1,841,013 bytes. No new blob store, paid storage, Git LFS configuration or acquired asset is needed for this two-style handoff. No further high-detail proliferation is proposed.

For larger future art revisions, first supply a new measured manifest and immutable artifact-store proposal through the parent. This task only pushes its explicitly authorized isolated branch. Parent may cherry-pick/review owned prefixes after verifying packet hashes; no merge/deployment is requested or performed here.

All artifact bytes/SHA-256, real decoded bounds, triangles, primitives/materials, texture dimensions/bytes (zero), rig/morph counts (zero), authored units/axes and attachment source hashes are recorded in the packet, export metrics and per-style attachment proposals. No actual master mesh was supplied; fitting and in-game admission remain blocked, not silently accepted.
