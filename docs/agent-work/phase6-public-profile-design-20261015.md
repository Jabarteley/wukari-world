# Phase 6 public profile design

## Identity
- Work ID: phase6-public-profile-design-20261015
- Owner: /root/phase6_public_profile_design
- Model / effort: Astra / inherited
- Thread: delegated bounded architecture review
- UTC updated: 2026-10-15
- Status: ready-for-review
- Work state: implementation

## Goal and boundaries
- Goal: define the smallest safe public human/agent accomplishments profile and release probes.
- Exclusive ownership: this record and docs/research/phase6-social-release-2026-10-15/public-profile-design.md.
- Source, Git mutations, services, browser, production, tests and other records are outside this design unit.
- Input: parent-provided codex/retention-main-sync at 5181c91a8274f0616b5cb6740971598fd97814ad; current source and coordination records.
- Output: exact typed contract, implementation ownership proposal, privacy rules and release gates.
- Dependencies: parent integration/release owner and later Sol implementation.

## Repository state
- Repo: JoinAllworld; host local.
- Exact checkout: /Users/anthonyakpan/.codex/worktrees/retention-main-sync/JoinAllworld.
- Branch: codex/retention-main-sync; base 5181c91a8274f0616b5cb6740971598fd97814ad.
- Dirty status: concurrent parent/worker docs and content work must be preserved. Only own docs edited.
- Resources: none.

## Progress
- Read root instructions/current coordination and relevant content/production records; read technical-autopilot routing/model guidance. This delegated consequential privacy unit is direct Astra work; no nested agents.
- Current evidence: civic prefs directory=true means hidden; social person card and existing public agent page are separate boundaries.
- Completed source-backed contract in docs/research/phase6-social-release-2026-10-15/public-profile-design.md, including typed allowlist, read-only/visibility/identity rules, pagination, public page and exact implementation path proposal.
- Added honest no-earned-records UI for resident/house-agent/NPC cards; no private memory projection.
- Recorded dependency on first-person owner Worker provider repair (5,110,078 bytes > 3.5M) and their /p prefix integration; preserve synchronous content lookup APIs. That owner holds browser slot4412; no UI work performed.
- Next: parent assigns Sol implementation; this agent reviews actual privacy diff and later performs browser acceptance only after ownership handoff.
- Only own record/design were written. No tests, services, browser or Git mutations performed. Initial status/revision Git reads were unnecessary under the bounded brief and were not repeated.
- Cost/tokens unavailable. Runtime acceptance not performed.

## Release state
- Local implementation: not-started (design only).
- Deployment: parent authorized, not performed by this unit.
- Gate: safe source contract and later endpoint/browser/production acceptance.

## Actual source review — 2026-10-15

Reviewed `server/public-profile.ts`, `server/public-profile-page.ts`, `server/routes/profiles.ts`, protocol/route registry wiring, PublicProfile/PlayerCard/NpcCard/Passport/Neighbours changes, and four replacement tales plus metadata/purpose edits. Parent reports 36 passing synthetic Node HTTP probes; this reviewer inspected their script but did not independently rerun them. No Worker/browser/production acceptance is implied.

Actionable findings sent to parent:

1. **P2 — Story receipt key/alias validation.** `storyRows` used Object.values and validated receipt payload IDs only. Wrong-key aliases can add duplicate earned rows; more than a page of identical aliases can repeat the same pagination cursor indefinitely. Enumerate entries and require canonical storage key equality before acceptance.
2. **P2 — Collection/member validation consistency.** Public project rows reject wrong-city receipts while raw `journeyCollections(state)` accepts ID/occurrence/time without city matching. Public collections must require the same validated canonical receipt set as public story/project rows, so a rejected project cannot complete a public collection. Keep any fix local to the public projection.
3. **P2 — Switching target during pagination.** `PublicProfile.vue` increments generation but does not reset loadingMore; the old request cannot clear it, leaving the new profile's Older button disabled. Reset per-request busy state at new generation and retain stale-response guard. Consider viewer identity as part of request ownership.
4. **P2 — Stale Malawi arc.** `batch-07.ts` country `mw` still advertised the removed relay story after Lilongwe became a chosen-name welcome. Its public collection metadata needs a truthful updated country-seating or broader welcome premise.
5. **Copy correction.** In-game history prints raw provenance enum values and omits empty provenance text; align with HTML's readable labels and “Origin not recorded.”

The four rewritten tale plots follow the approved logic: Bujumbura publishes event-only information; Marigot keeps the meal and verifies drying without a duration promise; Lilongwe repairs pronunciation by confirmed repeat-back; Tarawa preserves unresolved attributed accounts. Existing IDs/task selectors are retained in inspected changes. Purpose deduplication uses story-specific dilemma text; a uniqueness gate is not a claim of exhaustive semantic uniqueness across every tale.

The explicit DTO, directory privacy before projection, bidirectional known-viewer block handling, canonical active-life selection, no archived fallback, escaped no-store/noindex HTML, anonymous page boundary, permanent human/agent identity and lazy feature imports are coherent with the design. Final source approval is withheld pending findings 1–4 and targeted rerun evidence. First-person Worker/provider and real browser gates remain open. No source edits, services or browser use in this review.

## Corrected source acceptance and local browser checkpoint

Re-read Sol corrections in server/public-profile.ts and src/app/features/social/PublicProfile.vue: canonical map keys now agree with receipt IDs and memento definitions; public collections use only previously accepted story/project receipts in a copied life; pagination busy state resets on target changes; provenance labels are readable. Malawi metadata in local-tales/batch-07.ts now describes its Eight Seats around Two Edge Tables country story. These findings are source-resolved. Node 37-check and 69-row/3-page probe remains parent/Sol evidence, not a separately repeated run here.

Browser slot explicitly transferred to this Astra lane; first-person 4412 remains untouched. Created local 5176 QA tab, resumed existing LocalTalesQA save. My Life → Achievements showed Human character, one existing story The Trays for the Wrong Roles / Gesture tray token / Human play. Foreground Share returned Public profile link copied. Initial background clipboard attempt failed; diagnostic clipboard read prompted permission and was blocked. Do not count a clipboard payload read as verified.

Map → online status → See who is here → Jordan NPC card shows AI resident — no earned accomplishment records are available. Contacts name search → Zz Test Profile Agent → View shows explicit Agent character, zero counts, no earned records. The actor was created by parent through the normal local MCP API, with no receipt seeding. Screenshot evidence saved under public-profile/local-npc-empty-desktop.jpg, local-permanent-agent-desktop.jpg, local-permanent-agent-375.jpg, local-permanent-agent-320.jpg. At375/320, document widths equal scroll widths; profile widths341/286 equal scroll widths. Visually inspected both mobile views: no horizontal overflow.

Unexplained local save change observed during map inspection: Nairobi/Uhuru Park/76000 became Kigali/Nyabugogo/58000. Browser actions were Map, Switch to simple flat map, online status; no travel confirmation was clicked. Parent reports no concurrent actor mutation. Cause remains unproven; do not attribute it to this feature or another lane without evidence. Parent now holds actor writes.

Parent found /p/ was missing from local Vite proxy; Sol added exact prefix in scripts/dev.ts and vite.config.ts, source reviewed as correct narrow routing fix. Browser anonymous same-origin proof awaits preview restart. Worker /p/ and provider/release proof remain separate gates.

## Final local Node browser acceptance — slot returned

- Restarted preview with `/p/` proxy now serves standalone public HTML at the same shared origin. Human and permanent-agent URLs both inspected; static page identity is explicit and no private history/location/wallet appears. This browser used the same Chrome profile, so cookie-free behavior is established by source and parent HTTP probe, not by an incognito browser claim.
- Neighbours → How the directory works includes public-profile hiding. Hide my home → same public URL reload immediately displays generic Profile unavailable title/body without the prior name. My Life → Achievements also hides the own public projection and supplies a working Open Neighbours privacy action. List my home restores the same URL. Original listed preference restored. Evidence: local-hidden-public-320.jpg, local-own-hidden-320.jpg.
- Parent created exactly two new local synthetic actors through normal APIs: Zz Test Profile Agent (permanent agent) and Zz Test Profile Observer (human). This browser created neither. Existing LocalTalesQA save was preserved. Accepted Observer's normal incoming friend request through People UI; parent held its normal authenticated socket open temporarily. Its actual Kigali 3D map pin appeared, and clicking the named pin opened Person with Human character and zero earned rows. Evidence: local-map-human-pin.jpg and local-map-pin-human-record.jpg.
- Permanent agent inspected through Contacts search → View and separate public URL: explicit Agent character, all zero counts, honest empty history. Agent-specific map pin was not separately exercised; the real map-pin path was exercised with the human observer and shares PlayerCard. Parent/Sol corrected the observed Contacts 'Real player' label to neutral Allworld character.
- Normal synthetic friend acceptance produced Familiar Face on LocalTalesQA through the real UI/engine; its public origin reads Game system. Existing The Trays for the Wrong Roles receipt was only viewed, not newly earned. Wayfinder appeared after the unexplained earlier travel; no claim of intentionally earning it is made. No receipt was seeded by this browser.
- Public page visually inspected at desktop,375 and320; document scrollWidth equals clientWidth. Agent card375/320 also inspected with no document or profile overflow. Public page raw icon token 'compass' was reported and removed by Sol; latest local-human-public-320.jpg and local-human-public-375.jpg supersede the earlier cosmetic state. Screenshot desktop shows pre-cosmetic fix and is retained as chronological evidence.
- Share foreground toast confirms copy succeeded; exact public address is source-built and directly opened successfully. Clipboard payload was not independently read because browser read permission was denied. No native share recipient chosen and no external message sent.
- Browser slot explicitly returned to parent after viewport reset and closing our local app/public tabs. First-person4412, character lab and all user tabs were untouched. Parent may stop its Observer socket. Synthetic Observer friendship remains after acceptance; parent owns supported cleanup and no saves were deleted here.

Acceptance: corrected feature source, read-only privacy contract, the four narrative replacements, and bounded local Node browser behavior accepted. Worker provider/dispatch/startup parity, exact combined build/package budgets, CI, production health/source identity and hosted privacy replay remain parent release gates. This record does not claim Worker or production acceptance.
