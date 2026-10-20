# Wukari fork branch audit — 20 October 2026

No branches were deleted, overwritten or merged. The proposed development branch is **not established**: first review/integrate PR #2 into #1, then #1 into `main` through the owner's integration process. Once the integrated head is confirmed, create `develop/wukari-life` from that head and use it as the next milestone base. Do not create it from an arbitrary unmerged feature tip.

## Snapshot and classification

All **608** remote heads were fetched into remote-tracking refs using complete (not shallow) history. GitHub reports default `main`, **zero protected branches**, **zero repository rulesets**, and two open draft PRs:

| PR | Head | Base |
| --- | --- | --- |
| [#1](https://github.com/Jabarteley/wukari-world/pull/1) | feat/wukari-geographic-foundation | main |
| [#2](https://github.com/Jabarteley/wukari-world/pull/2) | feat/fuw-campus-map | feat/wukari-geographic-foundation |

| Category | Count | Treatment |
| --- | ---: | --- |
| Safe deletion candidates | 276 | All tips are ancestors of the retained `main` tip; no unique history is lost relative to that snapshot. **Proposals only**, owner approval pending |
| Unmerged branches requiring review | 328 | Each has commits unreachable from the fixed retained set. Preserve all |
| Active Wukari development / retained | 4 | `main`, `feat/wukari-geographic-foundation`, `feat/fuw-campus-map`, `feature/wukari-milestone-1` |
| Protected branches | 0 | No GitHub branch protection reported; explicit retention still applies |
| Uncertain status | 0 | No missing history/API evidence in this snapshot. A future audit must stop or classify conservatively when evidence is missing |

There are 277 tips reachable from `main`, including `main` itself. The complete inventory records each SHA, main reachability, preservation witness and count of commits unreachable from *other fixed retained branches*. Counts on retained branches exclude that branch itself. This count is not a global count of distinct commits across all review branches.

**603 branches have the exact same name and tip SHA in the current upstream `kromate/joinallworld` branch listing.** This is concrete inherited-work evidence, not proof of redundancy. The 405 `codex/` and 191 `claude/` names are also marked as legacy hints; naming alone never makes a branch safe. In particular, unmerged upstream work remains retained for review.

Complete machine-readable [CSV](branches/inventory.csv), [JSON](branches/inventory.json), [Markdown inventory](branches/inventory.md), and exact [candidate list](branches/candidates.json). JSON contains the audit timestamp and PR/ruleset snapshot. The new Phase 3 review branch/PR will postdate this 608-head snapshot and must be retained in future audits.

## Reproduction and safety

```sh
python3 scripts/wukari/branches.py audit
python3 scripts/wukari/branches.py cleanup \
  --inventory docs/wukari/branches/candidates.json \
  --results /tmp/wukari-cleanup-dry-run.json
python3 scripts/wukari/branches_test.py
```

The committed [dry-run results](branches/dry-run-results.json) rechecked all 276 candidates without deletion. Candidate inventory has `approved: false`. Do not set it true without the owner's approval of the final exact names and SHAs. Copy the reviewed list to a separate approved inventory; only an explicit `--execute-owner-approved` flag plus `approved: true` can enter execution. This milestone did **not** invoke that flag against GitHub.

Execution validates the origin push URL, exact names, SHA format, fixed retained-name exclusion, live branch SHA/protection, open PR head **and base**, default branch and repository rulesets. Any nonempty ruleset list blocks execution conservatively. It independently proves each tip is an ancestor of a currently retained head, not another deletion candidate. An atomic Git `--force-with-lease=refs/heads/NAME:SHA` deletion prevents deleting a changed tip. Failures stop processing and write a result/error journal including the approved file hash. There is no wildcard operation or force push of retained code.

Dry runs use one live API snapshot; execution refreshes protection/PR/default/ruleset state before each deletion. GitHub policy/PR state and a Git ref deletion cannot be one atomic transaction; owners should freeze competing branch/PR changes during an approved cleanup. SHA changes are protected atomically by the lease. API errors, unknown rules or missing Git objects fail closed. The five safety tests mock all GitHub/Git calls, including the execution-path lease test; they delete nothing.
