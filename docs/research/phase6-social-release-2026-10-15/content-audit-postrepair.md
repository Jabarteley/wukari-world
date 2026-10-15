# Phase 6 Content Audit — Post-repair Snapshot

This is a new post-repair snapshot. The original [`content-audit.json`](./content-audit.json) and [`content-audit.md`](./content-audit.md) remain the pre-repair baseline and are unchanged.

The current all-eight-batch checker passes with zero errors: 284 city records, 243 country arcs, 568 tales, and 1,704 missions. A direct structured extraction using the checker’s normalization also finds **1,704 unique mission purposes out of 1,704** and **zero exact normalized duplicate groups**.

The 20 original exact-purpose groups (73 excess repeated rows) have been cleared. Story-aligned purpose updates bring the distinct changed-purpose count to 96. Four reviewed plot replacements are now represented in source: Bujumbura’s privacy-preserving radio invitation, Marigot’s fixed meal and dry-backdrop postponement, Lilongwe’s confirmed chosen-name introduction, and Tarawa’s short attributed summary of two differing recollections. The Malawi (`mw`) arc metadata now describes the existing Lilongwe seating tale; Antigua and Barbuda (`ag`) metadata remains aligned to its St. John’s country tale. Country IDs and stable reward IDs were preserved.

The semantic check is bounded. It reviewed those four accepted plots, their matching purposes and arc metadata, and the closest identified comparison: Luxembourg’s “Two Stories and One Shared Question” allocates equal complete turns plus a shared question in six minutes. That is distinct from Tarawa’s short attributed closing of two already-heard recollections where no independent record settles the difference. This snapshot does not claim exhaustive semantic uniqueness across all 568 tales; consult the pre-repair audit for the broader bounded cluster review and candidates. Shared mechanics alone do not establish duplicate stories.

Checker scope is structural, current grounding, registered place/regular capacity, authored action/place label consistency, and normalized exact uniqueness. Runtime behavior, profile privacy, gameplay/save compatibility, and deployment were not verified in this content lane.

## Stable-identity source comparison

A read-only TypeScript AST/literal comparison checked current batch 05–08 data against `HEAD` (`cec8d4fc5e588d2ee3376c113404338a59859104`). Each of those four HEAD file hashes matches the pre-repair audit’s recorded SHA-256, confirming that HEAD contains the audited baseline content. The extraction unwraps TypeScript `satisfies` wrappers and reads object/array/string/number/boolean/null literals; it does not evaluate source code.

The comparison found 213 changed leaf paths, all within the intended areas: 20 country-arc metadata fields for `ag`, `bi`, `ki`, `mf`, and `mw`; 96 mission-purpose fields; and narrative fields for the Lilongwe city tale and Bujumbura, Marigot, and Tarawa country tales. Per-file changed leaf counts are batch 05: 34; batch 06: 25; batch 07: 74; batch 08: 80. The exact paths are recorded in the JSON `identityAcceptance.changedLeafPaths` object.

City and country ID sets are unchanged. Tale chapter, approach, and answer array lengths are unchanged. The comparison checked 834 authored mission rows; each row retains its label, task, count, and daily/weekly position. Consequently the authored row identity derived from city ID, cadence, and position is preserved. The authored mission/country-arc schema contains no `missionId` or `rewardId` field, so this source comparison does not claim to verify separately generated runtime reward IDs.
