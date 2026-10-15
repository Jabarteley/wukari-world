# Protected release evidence — run 38759139768

Observed through 2026-10-15 15:36:50Z UTC. GitHub Actions `workflow_dispatch`, run `38759139768`, branch `main`, workflow head `ba33bf73b06597ada2dad918bb1478a9f4dfbe05`. Package source was pinned and revalidated as `8affbb212333edd61954e5c6ed32e9c30682fe51`. Parent records this as the approved implementation and current main. Run and job snapshots are saved as JSON beside this receipt.

Run conclusion: **success**. `Build, check and seal new game` and `Deploy only joinallworld-next` both succeeded. The build job used Node 24.19.0; deploy used Node 22.18.0 and Wrangler 4.147.0.

The build job passed source policy and negative controls, install, download budget checks, and fast source smoke. The fast Worker runtime smoke passed **5/5**, with zero failures and zero skips. Full source checks and full Worker checks were explicitly skipped for this bounded run. No full-suite result is claimed.

The sealed package summary printed by the build job was:

- Package digest: `ea5598d108475933a49b619c2021b24ae813f1f1b50afce851013c779884884b`
- Manifest: `manifest.json`; 8,501 files; 286,885,652 total bytes; 284 city payloads; 1 dictionary payload; largest file 4,905,869 bytes.
- Uploaded artifact: `joinallworld-package.zip`, artifact ID `11984814097`, size 72,838,916 bytes, outer ZIP SHA-256 `bf1521ad6b3aa98d612ae17af7a62b958a03fa8edbebb372fc177217dd9835a`.

The deploy job downloaded that same-run artifact, verified the outer ZIP digest, extracted only regular package files, and reported the inner `joinallworld-package.tar` SHA-256 check as `OK`. The actual inner TAR digest was not printed in the available logs. The separately named package digest above is not that TAR digest. The compact manifest output did not include a distinct raw Worker byte count or manifest `identity` field; source commit and Actions run ID are recorded above. Artifact metadata is in `artifact-metadata.json`. A local artifact download was attempted but remained partial (14 MB of the 72.8 MB ZIP) and was stopped rather than extending this bounded evidence task. It was not unpacked or copied into shared evidence; a partial temporary ZIP remains in the OS temp directory.

The protected deploy step revalidated source and package digests, used Wrangler 4.147.0, and completed successfully for the fixed target `joinallworld-next`. Its exact output includes `No targets deployed for joinallworld-next` and `Current Version ID: 886e3605-fa73-41d4-82c9-045e7103c608` (reported Worker startup time 78 ms). This receipt establishes the successful workflow and version creation; it does not claim that a traffic target was updated, that live health passed, or that public profile behavior was verified. Parent owns those checks and the release decision.

CI evidence files:

- `final-run-snapshot.json`: completed run/job status and all step conclusions; SHA-256 `24e62973401629e72ee030cbbb242fb766d60c0aaf007c5bfd067bf6251a1534`.
- `artifact-metadata.json`: artifact ID/name/size/expiry; SHA-256 `9de0e49dc7dc8619bdf71a958497c1414c2e0ed7e4fe8de36fb893c3cf4f7bdb`.
- `initial-snapshot.json`: initial run status before the build; SHA-256 `573c71b4042c5281946b21d6e49e2eb36827a5224e05653d614554aa5073fd24`.

Raw job logs remain in the local temporary directory only. The deploy log contains a temporary artifact blob URL, so it was not copied into this shared evidence folder. No credentials or raw environment values were reported.
