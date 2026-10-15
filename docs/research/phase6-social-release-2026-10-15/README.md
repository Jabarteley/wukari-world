# Phase 6 content and public profiles release evidence

Current state: **not deployed**. Integration branch `codex/retention-main-sync` contains content `fc57c4fa`, profiles `25563663`, first-person/provider merge `f19a81c2`, regenerated content manifest `fa1ddbbf` and browser-boundary correction merge `7d1844c2`. Production was last observed as `joinallworld-201b9bdac9f8ee9412ff9837897`. The corrected browser boot passes on the first-person owner's build; final combined build, CI, package and deployment acceptance remain open.

The current handoff is [the release work record](../../agent-work/phase6-social-production-20261015.md). It owns the next executable steps and resource status; this directory preserves evidence by its actual scope.

## Content

All 284 supported cities and 243 game country/territory identities have two authored tales each and 1,704 local missions. The country audit accounts for all 193 UN members and both observer states; the game also supports additional geography. See [the baseline audit](content-audit.md) for sources and method.

The repair replaces four repeated story families, corrects Antigua/Barbuda and Malawi arc metadata, and changes 96 mission-purpose rows. All 1,704 mission labels and purposes are normalized-unique. The checker now rejects exact repeated purposes. Shared activity mechanics remain; exact copy checks and bounded semantic review are not exhaustive proof that every underlying puzzle mechanism differs. [Post-repair evidence](content-audit-postrepair.json) lists all 213 changed literal paths and proves city/country IDs, tale array shapes and mission order/labels/tasks/counts unchanged.

[Engine acceptance](engine-acceptance.json) covers 2,840 injected proof-event completion paths, all 568 new tales, preservation of 568 legacy keepsakes and 527 legacy completed collections. The archived diagnostic is [engine-acceptance.mts.txt](engine-acceptance.mts.txt); it contains the original checkout paths, which another computer must replace. This is engine evidence, not real hosted actions.

## Public profiles

Map friend pins open the character card, which now includes earned badges and completed stories, projects and collections. The same record is available from My Life and through shareable `/p/<public UUID>` links. Permanent agent characters are labelled Agent; delegated assistance does not turn a human into an agent. NPCs and rule-driven residents without an earned ledger have an explicit empty state.

The projection is read-only and allowlisted. It excludes money, private choices, unfinished progress, activity logs, location, account data and agent memory. Existing directory hiding also hides the public profile; sharing never changes visibility. Known-viewer blocks apply to the authenticated API. The anonymous public HTML remains accessible to signed-out viewers while listed; blocking is not a promise of anonymous-link secrecy. Responses are no-store and pages request no indexing.

| Evidence | Verified scope | Remaining boundary |
|---|---|---|
| [HTTP diagnostic](public-profile/checks.txt) | 37 synthetic Node checks; canonical receipts, 69 history rows/three pages, privacy, escaping, HEAD, aliases, wrong-city projects, read-only storage | Actual Worker and hosted behavior |
| [Worker diagnostic](public-profile/worker-checks.txt) | 20 fresh Miniflare checks; canonical receipts, 63 rows/three pages, canaries excluded on every page, Human/Agent identity, `/p/` dispatch, HEAD, hiding, block semantics, no-store and unchanged player-store contents | Existing players, real earned gameplay and hosted behavior; no SQL-write-count claim |
| [Astra browser record](../../agent-work/phase6-public-profile-design-20261015.md) | Actual Kigali friend map pin, human/agent cards and pages, own share success, hide/relist, NPC empty state; desktop/375/320 without observed horizontal overflow | Literal clipboard payload, physical phone and production |
| Existing social component suite | 20/20 after final heading and Contacts corrections; four existing assertion expressions updated | Combined broad corpus |
| [Agent compatibility](agent-compatibility/agent-compatibility-fa1ddbbf-pass.txt) | 78/78 focused serial checks after adding the new namespace to the existing registry fixture; initial 77/78 failure preserved separately | Complete Node/Worker corpus |
| Combined typecheck | Five projects clean after provider merge | Final successor source |
| Strict Worker size | 3,436,477 bytes below unchanged 3,500,000 limit; 284 city references, maximum332bytes | Final successor/package artifact |

The first chained combined diagnostic stopped after successful typecheck/raw gate because of a mistyped temporary script filename. Only the corrected HTTP command was rerun; it passed 37 checks. That CLI failure is not an application defect or a passed chain.

## Integration and rollout

No save schema, currency rule, progression reward identity or agent authority was changed by the profile feature. Worker content now comes from immutable hash-checked assets, whose manifest was regenerated after the approved narrative changes. Source-provider, Worker snapshot, browser initialization and final package acceptance remain distinct gates.

The final release must use the existing protected workflow with an exact reviewed main SHA, retain current namespaces/bindings/credentials and unchanged budgets, then read back health and verify real non-Lagos mission/story/journey completion, reward persistence, agent identity and public history after reload. A CI badge or synthetic seeded profile does not establish those hosted outcomes.

## Final candidate checks and known full-corpus limits

[Two-build receipt](final-build/receipt.json) records8498identical emitted files on runtime source5bb46a44. [Complete download scan](final-build/download.txt) passes unchanged measurable budgets. This precedes the separately reviewed server manifest copy correction and sealed packaging marker; final Worker packaging must include those changes.

[CI38747641450 receipt](ci-38747641450/receipt.md) separates completed Node22/24 compiler/build/download and tooling passes from failed/incomplete corpora. Five host failures receive bounded corrections, with9existing focused tests passing; the new-player journey separately completes11normal-API steps and a restart. Worker22/24 each181/190: four fixture startup500s require mandatory progression assets; four eviction failures and the idle-write invariant are known inherited failures, not silently waived or reported fixed. The pre-existing long all-city suite exceeds a combined job clock; no complete green-corpus claim is made. Exact source-specific receipts and hosted verification remain required before calling this deployed.
