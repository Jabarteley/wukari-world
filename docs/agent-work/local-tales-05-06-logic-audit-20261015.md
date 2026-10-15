# Batch 05–06 middle-range logic audit

## Identity

- **Work ID:** `20261015-local-tales-05-06-logic-audit`
- **Owner:** `/root/local_tales_07_outline`
- **Model / effort:** `gpt-5.6-luna / medium`
- **Thread:** delegated bounded read-only audit
- **UTC updated:** `2026-10-15T02:58:49Z`
- **Status:** `complete`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** Audit batch 05 and batch 06 city-array indices 6 through 26 inclusive for high-confidence objective/count/time/dependency contradictions and repeated same-problem/same-solution families.
- **In scope:** read-only inspection of `src/game/content/local-tales/batch-05.ts`, `src/game/content/local-tales/batch-06.ts`, `src/types/local-tales.ts`, and the authoring contract; this record only.
- **Out of scope:** source fixes, creative rewriting, tests/gates, UI/browser, services/network, Git mutations, batch 08, and all indices outside 6–26.
- **Exclusive file ownership:** `docs/agent-work/local-tales-05-06-logic-audit-20261015.md`
- **Current source revision:** `6198fe218a4055ab196e4b63bbfdb2865514e3d2` at inspection; read from the canonical worktree.
- **Usage:** pre-audit tool reading 93% used / 7% remaining; cost unknown.

## Coverage IDs

The audited range is exactly 21 cities × 2 tales × 2 batches = 84 tales.

- **Batch 05 indices 6–26:** `chisinau`, `cockburn-town`, `copenhagen`, `dar-es-salaam`, `douglas`, `dubai`, `grytviken`, `jamestown`, `kigali`, `kingstown`, `laayoune`, `lisbon`, `manila`, `maseru`, `noumea`, `oranjestad`, `ouagadougou`, `palikir`, `paramaribo`, `port-louis`, `praia`.
- **Batch 06 indices 6–26:** `guatemala-city`, `juba`, `kabul`, `kingston`, `koror`, `kyiv`, `la-paz`, `lahore`, `ljubljana`, `luanda`, `lusaka`, `male`, `mariehamn`, `moroni`, `ndjamena`, `niamey`, `podgorica`, `riyadh`, `roseau`, `santiago`, `sofia`.

Parent review emphasis remains the first six audited rows of each batch and the last eight. This audit inspected the full middle range and reports only high-confidence findings.

## High-confidence logic findings

1. **Batch 06 / Juba / country — package count is impossible.** In [batch-06.ts:386-389](/Users/anthonyakpan/.codex/worktrees/retention-main-sync/JoinAllworld/src/game/content/local-tales/batch-06.ts:386), the setup says there are five packages and a three-capacity cart. The chosen answer and chapter 4 load “heavy pair plus one light” followed by “fragile plus two lights,” which accounts for 3 + 3 = 6 packages, not five. The record cannot satisfy both the stated inventory and the resolution.

2. **Batch 06 / Kabul / city — ten accurate tosses are not achieved by the stated twenty-attempt split.** In [batch-06.ts:415-418](/Users/anthonyakpan/.codex/worktrees/retention-main-sync/JoinAllworld/src/game/content/local-tales/batch-06.ts:415), the objective is ten accurate tosses for Nico from twenty attempts, every example consumes an attempt, and the accepted plan spends five examples before alternating the remaining 15 attempts between goal and coached attempts. That leaves at most eight goal attempts if the alternation starts with Nico, or five examples plus eight goal attempts only if every example also counts as an accurate toss; the prose never establishes that, and the closing does not account for ten accurate tosses. The count needs an explicit allocation.

3. **Batch 06 / Podgorica / country — two-round table capacity does not fit the stated sequence.** In [batch-06.ts:1076-1087](/Users/anthonyakpan/.codex/worktrees/retention-main-sync/JoinAllworld/src/game/content/local-tales/batch-06.ts:1076), five jobs use a table holding three; two jobs need drying; all work must finish in two rounds. The resolution starts both drying jobs plus one quick job (filling all three spaces), then says the remaining two quick jobs finish while the drying jobs rest. Unless drying jobs vacate the table without completing, the two remaining quick jobs cannot occupy a three-space table that still holds the two drying jobs. The source does not provide that missing capacity transition.

## Repeated same-problem + same-solution families

4. **Batch 05 / Kigali / city and batch 06 / Lusaka / city — identical single-worker pickup/order alternation.** Kigali’s source [batch-05.ts:531-540](/Users/anthonyakpan/.codex/worktrees/retention-main-sync/JoinAllworld/src/game/content/local-tales/batch-05.ts:531) presents one worker, new orders hiding pickups, and resolves by alternating one order with one pickup. Lusaka’s source [batch-06.ts:781-794](/Users/anthonyakpan/.codex/worktrees/retention-main-sync/JoinAllworld/src/game/content/local-tales/batch-06.ts:781) presents one worker, new orders hiding pickups, and resolves by alternating one pickup with one order. This is the same queue problem and same turn-interleaving solution, with only city/word order changes.

5. **Batch 05 / Dar es Salaam / country and batch 06 / Juba / country — same fragile-heavy cart grouping solution.** Dar es Salaam’s source [batch-05.ts:383-392](/Users/anthonyakpan/.codex/worktrees/retention-main-sync/JoinAllworld/src/game/content/local-tales/batch-05.ts:383) moves a fragile tall pot away from heavy pots by loading heavy items first and then grouping the fragile item with light companions. Juba’s source [batch-06.ts:384-398](/Users/anthonyakpan/.codex/worktrees/retention-main-sync/JoinAllworld/src/game/content/local-tales/batch-06.ts:384) moves a fragile package away from the two heaviest by putting heavy plus light first and fragile plus lights second. Both are the same constrained-cart solution family: separate the fragile item from heavy items through compatible heavy/light loads.

6. **Batch 05 / Maseru / city and batch 06 / N'Djamena / city — same three-session middle-help structure.** Maseru’s source [batch-05.ts:692-701](/Users/anthonyakpan/.codex/worktrees/retention-main-sync/JoinAllworld/src/game/content/local-tales/batch-05.ts:692) requires two independent personal blocks around one shared rehearsal in a one-hour window. N'Djamena’s source [batch-06.ts:965-979](/Users/anthonyakpan/.codex/worktrees/retention-main-sync/JoinAllworld/src/game/content/local-tales/batch-06.ts:965) requires three sessions with solo first and last sessions and friend help only in the middle to solve the hardest step. Both resolve the same personal-goal problem by protecting solo endpoints and using a targeted shared middle session.

## Audit limits

- These are source-reading findings only; no tests, content gate, gameplay probe, or semantic acceptance is claimed.
- Parent’s known findings outside or alongside this pass remain authoritative: Willemstad, Vilnius, Vientiane, and Tórshavn/Alofi calibration items were not re-audited here.
- No factual claims about real places were added; all references above are source paths and fictional authored text.

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-15T02:58:49Z | complete | Audited all 84 tales in indices 6–26 across batches 05/06; recorded three high-confidence logic contradictions and three repeated solution families; made no source edits. | Current revision `6198fe218a4055ab196e4b63bbfdb2865514e3d2`; exact source links above | Parent reviews findings; source owners decide corrections. |
