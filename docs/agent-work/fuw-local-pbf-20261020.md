# Local FUW PBF extraction

- Owner: Codex, local Windows session; implementation active.
- Base: `feat/fuw-data-transfer`, `201634b49985cfd1f8a839cdfb89571537da1ea4`; clean checkout verified, origin base fetched.
- Branch: `feat/fuw-local-pbf`.
- Scope/ownership: new local extraction script, extraction evidence and coverage report; necessary Windows portability fixes in offline importer/preview. Prior cloud work is handed off in Phase 2/3/4 records; no concurrent local edits observed.
- Input: original downloaded Nigeria PBF, verified committed LGA polygon. Original remains read-only. No DB, merge, branch deletion or deployment.
- Output: attributed reproducible regional extraction, reviewed FUW feature inventory, existing offline import and coverage; playable environment only if actual geometry supports it.
- Found original: 711541464 bytes, SHA-256 `d3e80afbf39da31e660d5f13fbb092bd246cdf8830c149f9d1bee4902e0c92bb`.
- Source URL is retained in the Windows download Zone.Identifier. Filesystem download completion time is evidence with uncertainty, not an independently authenticated HTTP receipt.
- Tools: user approved PyOsmium installed only in ignored `.cache/wukari/python-tools`; existing npm dependencies installing from lockfile.
- Resources: no persistent servers started.
- Next: validate PBF header/full parsing, extract complete original ways using pinned polygon, inspect actual university IDs and mapping before deciding gameplay scope.
- Release: feature commit/push and stacked draft PR authorized by user; no release requested.

## Validation checkpoint

- Provider MD5 fetched over HTTPS matches local `9c106726b749dac15c9a2fbdaaf005f5`; PBF BlobHeader and replication timestamp validated. National parse/extraction still active in owned Python process; no completed import claimed yet.
- Existing 35 tests plus new contained-way review test: **36 pass** on Windows (Node workers require sandbox escalation). Pinned boundary verifier passes. Strict focused types for new review/import/transfer tools pass. Isolated preview build passes with its existing large-chunk warning.
- Whole-project `npm run typecheck` attempted once with 3584 MiB heap. Fails in unrelated existing files: `src/festivals/client.ts:22` missing fetch type, `scripts/guard-joinallworld-package.test.mjs:13` implicit-any `t`, `server/accounts/token.ts:87` TextDecoder option type mismatch; test compiler exits 134 under this memory cap. No baseline/assertion changes; no full-suite pass claimed. Client project produced no failure report.
- Installed Node packages from unchanged lockfile; PyOsmium 4.3.2 installed in ignored cache with explicit user approval.
- Byte-pinned snapshots restored to exact committed LF bytes after Windows autocrlf checkout; staging confirms no snapshot content changes. Only `.gitattributes` changes their future checkout behavior.
- Two independent national tag searches completed: no Wukari-named university; five Wukari-named objects overall, none identifies FUW. Institutional address context reviewed from Ministry report p. 8; no campus coordinates/spawn inferred.

## Completed local milestone

- National scan and three-pass polygon/complete-way extraction complete; original hash unchanged. Final console printing hit Windows cp1252 on Arabic tags after all files/hash evidence were written. Saved UTF-8 outputs verified; console summary fixed to escape Unicode.
- 478,822 regional records / 44,017 complete ways. Strict source review retains 460,398 records, excludes 230 ways without repair, and keeps the originals separately.
- Nine <=32 MiB reference-complete sources passed existing offline importer. Independent exact-record/union check passes across all batches and aggregate. Coverage: 2644 roads/paths, 40496 footprints, 2 named landmarks, 39681 graph nodes / 94 components, 21 unassembled relations. All counts LGA-wide; no FUW assignment or playable campus supported.
- Shared node index added to geography/import/coverage/preview to make authentic regional data practical. New test checks exact precision and missing-reference refusal. **37 tests pass**, strict focused types pass, final preview rebuild passes.
- Ownership now includes the scoped node-index changes in `src/wukari/geography.ts`, preview `scene.ts` and `scripts/wukari/coverage.ts`; inherited cloud handoffs and clean local checkout establish continuation. No unrelated source changes.
- Durable evidence: `docs/wukari/LOCAL_PBF.md`, generated `LOCAL_PBF_COVERAGE_REPORT.md`, `evidence/local-pbf-{source,extraction,exclusions}.json`. Raw sources/batches stay ignored locally. No persistent service started; all owned processing complete.
- Next: final diff/source checks, commit and push `feat/fuw-local-pbf`, open stacked draft against `feat/fuw-data-transfer`. No main merge/deployment/DB change.
- Status: verified-local / ready-for-review. Remote base rechecked at exactly `201634b49985cfd1f8a839cdfb89571537da1ea4`. No unrelated working changes; 22 scoped files prepared for publication.
