# Phase 6 content uniqueness audit

**Snapshot:** `kromate/joinallworld`, branch `codex/retention-main-sync`, commit `5181c91a8274f0616b5cb6740971598fd97814ad`; source hashes and machine-readable findings are in [content-audit.json](content-audit.json). The audit covers all eight accepted local-tales batches and the registry at that revision.

## Coverage

The current registry contains 284 city records and 243 country/territory identities. All 284 city IDs and all 243 identity IDs have authored content, and each city is assigned to its correct whole-country batch. Batch city/arc counts are 40/1, 35/34, 35/34, 35/35, 35/35, 35/35, 35/35, and 34/34. The 243 game identities represent supported game geography, not 243 sovereign states.

Compared against the UN Dag Hammarskjöld Library’s current lists, all 193 UN member states and both non-member observer states (the Holy See and State of Palestine) have supported identities and country arcs. The remaining 48 registry identities are additional game geography; they are not missing UN members. Sources: [UN current member states](https://research.un.org/en/unmembers/currentmembers) and [UN non-member observer states](https://research.un.org/en/unmembers/observers).

## Deterministic checks

The existing all-eight-batch checker passed: 284 cities, 243 country arcs, 568 tales, 1,704 missions, zero errors. Its defined scope is structural validation, current grounding, registered place/regular capacity, explicit mission/approach action-place consistency, and normalized exact uniqueness. It does not establish semantic story uniqueness, gameplay/save compatibility, or deployed behavior.

Across the 568 tales, normalized titles are unique and no full narrative bodies are exact duplicates. Six chapter-heading strings recur exactly, including two duplicate headings within single country tales; these are heading reuse, not by themselves plot duplicates. Their complete city/scope/chapter evidence is in the JSON.

Using imported structured `city.missions.daily` and `city.missions.weekly` records, all 1,704 mission labels are unique after Unicode-preserving case and punctuation/whitespace normalization. There are 1,631 unique normalized purpose strings: 20 exact-repeat groups accounting for 73 extra rows. The largest repeats are generic purpose copy such as “broaden the local setting” (21 cities), “connect the registered settings” (14), and “connect registered settings” (10). The exact groups and locations are in the JSON. This is confirmed repetitive authored purpose text even though labels remain unique.

There are 74 distinct daily/weekly scope-task-count signatures, and 32 signatures recur in at least three cities. The largest signature groups span 68 daily and 71 weekly cities. These are shared mission mechanics, reported as repetition patterns rather than duplicate story plots. The exact signatures and IDs are in the JSON.

## Confirmed findings for correction

1. **Exact plot duplicate — Tórshavn and Bujumbura country tales.** `fo:torshavn:country` (“Three Covers for the Closing”) and `bi:bujumbura:country` (“Cover the Final Three”) both present five dishes and three covers, serve the first two dishes immediately, and cover the final three. The counts, conflict, allocation, and result match; changing venue or wording does not make the authored plot distinct. Replace one with an unrelated premise, such as a fictional community-radio rehearsal with one correction slot before a recording deadline, then check its constraints against the global matrix.

2. **Same mechanism family — Marigot and Addis Ababa country tales.** `mf:marigot:country` (“One Paired Task, Two Solo Tasks”) and `et:addis-ababa:country` (“Two Paired Jobs, Four Solo Jobs”) allocate a group across pair-only and solo jobs. The counts differ, but the player solves the same pair-versus-solo staffing problem. Replace one with a different constraint family, such as a single correction slot before a fixed playback deadline.

3. **Repeated story family under the requested no-repetition bar — Dar es Salaam and Lilongwe city tales.** `tz:dar-es-salaam:city` (“One Difficult Leg per Runner”) and `mw:lilongwe:city` (“The Leg with the Smallest Loss”) both assign relay runners to legs using measured performance tradeoffs. Their exact constraints and procedures differ, so this is not an identical-puzzle claim. Replace one relay with a non-competitive premise and a different choice mechanism, retaining its city anchor.

4. **Country arc mismatch — Antigua and Barbuda.** `ag:st-johns:city` (“A Folded Beam beneath the Center”) is a paper-bridge plot. The `ag` country-arc title and premise repeat that same city plot, while `ag:st-johns:country` is actually “Eight Balls Cover Demonstration and Practice,” about distributing eight balls across a two-ball demonstration and three equal learner pairs. Rewrite the arc title and premise to describe the actual country tale(s) or a verified shared country throughline.

## Candidates and limits

The JSON records five lower-confidence candidates involving folding screens (`xg:siachen:country` / `dz:algiers:country`), unstable trays (`eg:cairo:city` / `io:chagos:city`), meal tableware (`ws:apia:country` / `ki:tarawa:country`), loaf partitioning (`gg:st-peter-port:country` / `ai:the-valley:country`), and relay staffing (`jm:kingston:country` / `sv:san-salvador:country`). Their constraints differ; they remain candidates pending review, not confirmed duplicates.

The semantic pass used deterministic TF-IDF similarity to rank pairs, then manually reviewed high-scoring pairs and current source/matrix evidence. It reviewed a bounded subset rather than all 568 tales line by line, so this is not exhaustive semantic proof. Similar puzzle genres and shared game actions are not automatically duplicate stories. Four previously reported overlaps are resolved in the current source: Asunción/Lomé, Flying Fish Cove/Doha, Kyiv/San Salvador, and Kigali/Lusaka; details are retained in the JSON.

Public shareable achievement-profile behavior and privacy are outside this audit and remain unverified. This report makes no deployment, profile, or release-gate claim.
