# Exact three-guest cleanup: offline review draft

Status: **inventory-bound, inert, and never executed against production**. This folder is a review package derived from the captured production inventory for source `6695f00c6779fbfcb69bd21aa8b152d5430a0dca`. It does not authorize Data Studio use, DDL, a rehearsal, a production mutation, an epoch change, or a deployment. Astra and the integration owner must accept the bound source before any operator action.

## Frozen scope

Only these approved disposable workflow guests are targets:

| Guest | UUID | Session | Actions | Wallet audit retained | WORLD state |
|---|---|---:|---:|---:|---|
| Tokyo | `bfcb8ef0-4d00-4d8e-b665-bb8b11d45e56` | 1 | 5 | 1 | resident and house `tokyo.centre` 0/0 |
| Smoke | `453a0f63-5b90-4e7b-b730-4ea9ff54b70d` | 1 | 1 | 0 | none |
| R2 | `6cea4961-b7fc-4bb7-a6db-a28e9327014f` | 1 | 25 | 3 | resident and house `lagos.lagos-island` 0/8 |

The captured authority is schema 2, shadow layout, epoch 3, writable 1, null retirement/wallet watermark and zero `collection_parts`. There are three sessions, 31 action receipts, no archives/accounts/devices/once receipts, four immutable wallet-audit rows, 17 exact collection paths and nine exact entry mirrors. The wallet rows remain in place and in the private backup; this is not total erasure.

## Bound dependency evidence

The R2-owned growth share `ffe8762f22` has a source-defined `{ by, opened, joined }` record. `server/growth/share.ts` initializes the counters; `server/growth/referral.ts` can increment `joined` and store the code/owner in another player's `ref` record. Astra's production read at `2026-10-15T17:32:09.065Z` returned share exists 1, owner match 1, integer `opened=0`, integer `joined=0`, all eight referral/code/owner/invited/owed/ref/count dependency counts 0, code text references 0 and owner text references 1. `cleanup-final.sql.txt` recomputes and requires that complete summary with strict literal, type and NULL-safe guards.

The exact read-only receipt is `../production-inventory-share-dependencies.txt`; `missing-share-inventory.sql.txt` records its count-only query shape. Any change in type, value or count aborts before backup or mutation. A nonzero dependency remains a source-classification decision, not permission to delete it.

The original inventory predicates also emphasized exact UUID keys and JSON values. Astra's supplemental read at `2026-10-15T17:32:13.555Z` found eight entry keys containing a target UUID, zero composite-key-only hits and zero collection-name hits. The exact receipt is `../production-inventory-supplemental-references.txt`; `supplemental-reference-inventory.sql.txt` records its query shape. The final guard recomputes those three literal counts. Its frozen nine-row deletion set remains eight UUID-bearing keys plus the separately validated share key; any drift blocks cleanup.

Astra's fresh full inventory at `2026-10-15T17:32:50.006Z` is captured in `../production-inventory-refresh-6695.txt`. It reconfirmed schema 2, shadow layout, epoch 3, writable 1, null retirement and wallet watermark, zero collection parts and zero rows using the proposed helper prefix. It also reconfirmed one session per target, action counts 5/1/25, wallet-audit counts 1/0/3, zero archives/accounts/devices/once receipts, Tokyo's active 0/0 `tokyo.centre` home, R2's active 0/8 `lagos.lagos-island` away home and no Smoke home. These are time-sensitive observations; the final SQL independently rechecks the corresponding frozen facts before mutation.

## Source classification

- **Delete after all guards pass:** the three target sessions; their 31 action receipts; two social player leaves; two single-message automated founder DM conversation leaves; two civic resident leaves; two growth player leaves; exact target life-metric leaves in `growth` and `root:growth`; and the bound unused R2 share.
- **Delete exact mirrors:** the nine inventoried `entries` rows. Before deletion, each entry value must be valid object JSON and normalize equal to the legacy collection leaf at the path computed as map segments plus the JSON-quoted key. This includes both dotted founder-DM keys. Divergence blocks; it is never repaired. No surviving entry is updated, so its `ord/ix/tx/jx/value` projection remains byte-for-byte untouched. All fragments must still be absent.
- **Preserve shared state:** collection aggregate counters and every non-target JSON leaf. Source `KEYED_SPECS` keeps `growth.metrics` in the unkeyed root, so the complete `growth` row and `root:growth` metrics must normalize equal before and after deletion. Divergence blocks; it is never repaired. Postguards also compare each touched collection with its in-transaction backup after applying only the approved `json_remove` paths. Founder sessions/accounts/player state are never a deletion target; the founder player leaf, if present, is covered by the full social-collection comparison.
- **Preserve audit:** all four `wallet_effects` rows remain immutable and are count-guarded before and after.
- **WORLD operation:** append `f` then `x` only for the two revalidated active homes/residents. Existing shard rows and `world_meta.summary` stay byte-identical and are privately backed up. `server/world/registry.ts:221` defines that order. `server/world/service.ts:247` detects the changed byte size, marks the saved summary stale and refreshes it on a named world read after restart; the draft does not rewrite derived summary data.
- **Preserve unrelated users and aggregates:** no account, device, archive, once receipt, wallet, unrelated entry or unrelated collection path is mutated. The growth global/city counters are not decremented.

## Files and required sequence

1. `missing-share-inventory.sql.txt` — source of the completed share/referral count-only inventory; the production receipt is outside this folder as named above.
2. `supplemental-reference-inventory.sql.txt` — source of the completed composite-key/name count-only inventory; the production receipt is outside this folder as named above.
3. `cleanup-final.sql.txt` — full inventory-bound guarded candidate with private server-side backups, exact deletions, append-only WORLD events, epoch 3 to 4 fence and one dated receipt. It remains unexecuted.
4. `cleanup-rehearsal.sql.txt` — byte-for-byte copy of the bound final candidate followed by the rehearsal-only `dry_run_completed` CHECK failure. Its prefix must exactly hash to the accepted final file. It remains unexecuted.
5. `rehearsal-readback.sql.txt` — separate non-secret rollback readback: helper tables absent, epoch still 3, target rows/references and active WORLD state unchanged.
6. `postcommit-readback.sql.txt` — separate non-secret receipt/backup-count/epoch/absence/WORLD readback. Its device count joins `account_devices` to the privately backed-up session secrets after sessions are deleted, but returns only the count. It never selects backup values or session secrets.
7. `synthetic-sqlite-fixture-probe.py.txt` — inert exact source for the one corrected in-memory SQLite fixture/probe; it is not a tracked test or executable by extension.
8. `synthetic-sqlite-first-attempt.txt` — verbatim first failure and bounded gate-identification output.
9. `synthetic-sqlite-output.txt` — the second attempt's concise 8/8 result, SQLite version and executed-clone hashes.
10. `synthetic-sqlite-delta.txt` — exact constant/blocker transformation, bounded first-failure correction and proof limits.
11. `bound-synthetic-sqlite-fixture-probe.py.txt` — inert source for the single accepted-hash diagnostic with no guard bypass.
12. `bound-synthetic-sqlite-output.txt` — captured SQLite 3.53.4 result for that one execution.
13. `bound-synthetic-sqlite-delta.txt` — exact adaptation and the narrow limits of the bound-fixture result.

Current inventory-bound offline SHA-256 values:

| File | SHA-256 |
|---|---|
| `cleanup-final.sql.txt` | `be3541b933fc01d2e00520bdfa4b32e421a410c7531c2f7ee70ab8bf64f2e5cd` |
| `cleanup-rehearsal.sql.txt` | `486688b0cdd1e394e363d2a88fe56ca89bbad24803a98e7ca7a222a1f497c4e6` |
| `missing-share-inventory.sql.txt` | `5d49576a01e6e150574e3530883be7a0cb6ac866f97497fad4c4d26e16be7b86` |
| `supplemental-reference-inventory.sql.txt` | `3d93b29ae2b92f03eeeb029aa8f12092cd76f2397b71a6492932f2a82f1c46f6` |
| `rehearsal-readback.sql.txt` | `e4543f2749271135c9f3c8339833e10ea2648c88a56ed86ebdcacc4ffc3983d7` |
| `postcommit-readback.sql.txt` | `faa6898ae1438141bb04d79d0a0a6acab6be0062da7b24c2d866e3e6861fe238` |
| `synthetic-sqlite-fixture-probe.py.txt` | `8d128bc613b67e4607a6c250a67052e5293b02e976c8a1c22b0a3aaba3c99639` |
| `synthetic-sqlite-first-attempt.txt` | `5bb02406452f9d9c301e93e212796cfcee6cd5ccf038dfebcc89669dfa08dbc4` |
| `synthetic-sqlite-output.txt` | `e6b48ba7157452795d31ee5671bffaa23d38ef1d8a978d89e1c756e9a5955440` |
| `synthetic-sqlite-delta.txt` | `cefa5b7226a2880eacb055165b0dfb62f08b36de23751d474ad84c90b65d65fa` |
| `bound-synthetic-sqlite-fixture-probe.py.txt` | `b923d9ba61b991c8f6eee8fd359f215aac0be707831c4984de92f1a9187d3949` |
| `bound-synthetic-sqlite-output.txt` | `58ed8a1bdd2cc3cbf36d66904b2033bfa3aab107907efcb230b7701c7ddc932b` |
| `bound-synthetic-sqlite-delta.txt` | `678733c43b216fe593a1c31532f4c09452e5b804fed09a3ba70924c7eb3f79fb` |

The rehearsal must use Cloudflare Data Studio **Run all in transaction**. The only acceptable failure is the named final `dry_run_completed` CHECK failure, followed by the separate rollback readback. A generic error is not evidence. Final execution can occur only in the reviewed protected restart window described by `production-qa-cleanup-runbook.md`; an ambiguous result is resolved by reading the receipt and epoch, never by replaying the transaction.

## Synthetic SQLite evidence

One bounded in-memory diagnostic recreated the captured 15-table schema with synthetic payloads and the exact expected target shapes. It transformed only reviewed public constants to fixture constants and bypassed the then-present unconditional share blocker; the earlier production drafts stayed byte-identical. The first attempt rolled back at gate sequence 10 because the constant map initially missed the Tokyo prefix used by the DM guard. The one correction added that constant substitution. Attempt two passed 8/8 on SQLite 3.53.4: named final-abort rollback restored the exact snapshot and removed helper DDL; the final clone committed epoch 4, receipt and exact backup counts; retained wallet audit, old WORLD rows/summary and unrelated collection/entry/session/action/wallet canaries were preserved.

That archived probe reads the current draft path but describes the earlier blocker-bearing hashes; it must not be rerun or presented as proof of the new bound guards without an explicitly reviewed adaptation. It proves local parser/transaction behavior for the earlier structure only. It does not satisfy the actual Data Studio rehearsal, prove current live inventory freshness, or authorize production execution.

After the integration owner explicitly requested that bounded adaptation, one disposable diagnostic asserted the accepted production-draft hashes, removed the historical blocker replacement, preserved only the nine public-constant-to-synthetic-fixture substitutions and executed the bound final/rehearsal clones unchanged. SQLite 3.53.4 passed `9/9`: every bound share and supplemental guard passed, the rehearsal reached the named `dry_run_completed` failure and restored the exact snapshot, and the final clone committed all prior postconditions. The original historical evidence and hashes remain untouched. The bound source, output and exact delta are archived in the three `bound-synthetic-sqlite-*` files.

## Private backups and guards

The fresh helper prefix is `qa_phase6_cleanup3_20261015_*`. Bare `CREATE TABLE` statements make any prior use of that prefix fail before mutation. Backup keys are JSON arrays, so composite identities are unambiguous. The transaction snapshots the authority row, three full sessions including their secrets, four complete touched collections, nine exact entries with projections, 31 actions, four retained wallet rows, every row of both affected WORLD shards, the optional derived summary, and five migration metadata rows. No readback emits `backup.value`.

The final postguards prove the four touched collections equal their backups minus only the accepted paths, growth metrics remain equal to `root:growth`, existing WORLD shard rows and summary remain byte-identical, exactly two new shard rows were appended, latest WORLD state is `x/f`, wallet audit counts are unchanged, target-device absence is checked with privately backed-up secrets, metadata is unchanged, and target state is absent before the literal epoch fence and receipt.

## Review gaps

- Share/referral, supplemental composite-key/name and fresh full-inventory facts are captured in the three named Astra read-only receipts. Any drift blocks through the exact-set and literal guards.
- The newly bound SQL has static review plus one representative in-memory SQLite execution with no guard bypass. That result rules out an inherent SQLite failure for the known-literal fixture, but it does not reproduce Cloudflare Data Studio's parser, transaction wrapper, live state or generic error reporting. This offline diagnostic did not execute any production SQL or production mutation.
- Actual rollback behavior, provider error naming, transaction duration, fresh authority/layout/reference counts, deployment hold timing, postrestart named world reads, unrelated comparison-player behavior and recovery remain execution gates.
- The captured inventory is time-sensitive. Any new row, path, fragment, WORLD event, authority change or helper-prefix collision must abort and return to source review.
