**Allworld — phased implementation plan for progression and human return**

Prepared 14 October 2026, Africa/Lagos; implementation checkpoint 15 October. **Phases 0–6 are implemented and published on GitHub main at `376285c0314dba05e0703a4e43b8666037384c8e`**, including concurrent agent-play/cache-first changes. Final combined build, five-project typecheck, 17 smoke checks, 22 cache checks and all-city download budgets pass. Existing retention/agent-play checks and direct-engine/HTTP/browser evidence are scoped in [the handoff](retention-implementation-handoff-2026-10-14.md), alongside known broad-suite gaps. No production deployment or measured retention improvement is claimed; cohort-dependent exit conditions below remain pilot gates.

The intended outcome is a world where people return to improve a skill, pursue a chosen life, meet familiar people, finish stories, and see the effects of their contributions. AI participation should make those experiences more responsive and available. Human return remains the product outcome.

Basis: [research and product proposal](allworld-retention-and-progression-2026-10-14.md), [game catalogue](retention-catalogue-2026-10-14/CATALOGUE.md), [human-desire evidence](human-desires-evidence-2026-10-14.md), and [source inventory](retention-source-inventory-2026-10-14.md). The original planning inventory used local HEAD `22366a53` with then-uncommitted work; it remains historical audit evidence, not proof of the final runtime or production. Recheck touched files when each phase begins because other development is ongoing.

**Sequence and release boundaries**

| Phase | Deliverable | Human desire served | Dependency | Exit condition |
| --- | --- | --- | --- | --- |
| 0 | Reliable progression and trustworthy measurement | Continuity, fairness, control | Current-source refresh | Earned rewards survive resets; one grant per entitlement; character scope and actor provenance are explicit. |
| 1 | My Life / Passport using existing progress | Ownership, direction, identity | Phase 0 contracts | A person can understand their progress, resume a goal, and find a valid next action. |
| 2 | Permanent achievements, badges, and display | Mastery, recognition, expression | Phase 0; Phase 1 presentation | A small achievement set is earned from verified outcomes, persists, and can be displayed. |
| 3 | One complete branching episode | Autonomy, curiosity, belonging | Phases 0–2 | A playable story remembers a choice, changes a later interaction, and leaves a lasting reward. |
| 4 | One shared neighbourhood project | Contribution, belonging, stewardship | Phase 3; contribution contract from Phase 0 | Several roles contribute fairly and completion changes a visible place. |
| 5 | Daily milestones, then an optional streak experiment | Continuity, attainable progress | Meaningful activities and pilot evidence from Phases 3–4 | Cadence improves voluntary human return without worsening recovery, fairness, or the economy. |
| 6 | Content expansion and sustainable seasons | Discovery, identity, long-term purpose | Evidence from the preceding pilots | Additional content earns repeat participation at sustainable production and operating cost. |

The **first coherent player release ends at Phase 3**: reliable progress, a useful passport, a small achievement set, and one memorable episode. Phase 4 is the cooperative expansion. Phase 5 tests return incentives. Phase 6 expands successful content. Useful foundation fixes can ship independently when verified and release-authorised.

Dates are deliberately uncommitted until Phase 0 establishes integration state, available owners, and the first audience. Seven-, fourteen-, and thirty-day measurements are observation windows, not development estimates.

**Phase 0 — Make progress dependable**

Player outcome: effort counts, rewards arrive once, and returning tomorrow does not erase a completed accomplishment.

Implementation units:

- **0.1 Refresh the baseline.** Reproduce the completion/claim/reset path; inspect existing saves, guest/account behavior, current mission eligibility, and available analytics. Define a meaningful human action and a consistent retention time basis. Record acquisition cohorts separately from existing players.
- **0.2 Preserve earned rewards.** Separate reaching the criterion, earning an entitlement, granting its reward, and viewing the celebration. Persist completion and entitlement together before replacing daily/weekly sets. A retry must settle the same result. Retain an unfulfilled entitlement if a balance limit or other valid grant blocker intervenes. Preserve set bonuses and their period attribution as well as individual mission rewards.
- **0.3 Set ownership.** Identify the canonical character owner, local city targets, and any genuinely account-level fields. A character's achievement history follows that character through travel and supported restoration. Switching characters must not merge their histories. Backfill only facts that existing saved state proves.
- **0.4 Agree the agent contract.** The existing agent runtime supplies authenticated execution provenance. Record actor origin separately from character ownership and ranking family. The temporary public AI-played label is not sufficient history for attribution. Known automation on a human-owned character must not count as the person returning.
- **0.5 Separate measurement events.** Use distinct completion, entitlement/grant, and reward-view/claim events; retain compatibility with existing dashboards through an explicit event-version mapping. Add stable identifiers and server occurrence times. Keep telemetry consent-aware and exclude private dialogue from event payloads.
- **0.6 Lock the pilot assumptions.** Use one location, one primary ambition, and one episode. The provisional content candidate is UNILAG / Hostel Hustle because existing systems support it. This is a reuse choice, not proof that students are the best acquisition audience. Validate that audience before a public campaign; a neighbourhood-hosting variant remains a later alternative.

Existing seams: [mission roll and claim](../../src/game/systems/missions.ts#L100), [durable store](../../server/store.ts#L20), [city settlement](../../server/life-service.ts#L116), [character handling](../../server/character.ts), [account/character semantics](../ACCOUNTS.md#L207), [growth actor filter](../../server/routes/growth.ts#L89), and [telemetry](../../src/telemetry/events.ts).

Acceptance: demonstrate completion immediately before a Lagos daily and weekly reset, late collection, duplicate requests, reconnect, two devices, a grant blocked by balance limits, and city travel. Each earned reward and set bonus survives and grants once. Automated actions stay outside human-return counts. Existing character balances, titles, and histories remain intact. Document runtime-specific limits; Node proof alone does not establish the deployed Worker path.

Scope limit: adapt the existing settlement and event paths. A global event-platform rewrite or city-storage migration is not a prerequisite. The future architecture discussion in `docs/CAPACITY.md` is not evidence that such a migration has happened.

**Phase 1 — Give players a readable life history**

Player outcome: “I know what I have done, what I am working toward, and what I can do next.”

Build a My Life / Passport view with four progressively populated sections:

- **Today:** current missions, weekly card, one selected next action, and a readable reset time.
- **My Story:** current dream/ambition, career or campus progress, and a resume destination. The authored episode joins this section in Phase 3.
- **Achievements:** existing earned titles and lifetime milestones first; the new catalogue arrives in Phase 2.
- **My People:** relevant friends, clearly identified residents, and existing relationship follow-ups. Shared projects join in Phase 4.

Keep each domain authoritative: careers own promotions, social owns relationships, campus owns enrolment, and the wallet owns money. The passport reads these outcomes. Reuse existing destinations and avoid showing empty future features as available actions. Guest, new, established, poor, and returning players need valid next steps, with a reason and recovery route when an activity is unavailable.

Acceptance: a player can locate a goal, navigate to it, complete an action, return to the passport, and see the correct updated state. Check reload, city travel, account/character switching, small-screen layout, and constrained-network recovery. A participant should be able to explain their next step without developer guidance.

Scope limit: retain current reward amounts and the four-of-seven weekly activity card. This phase changes presentation and routing, allowing its effect to be assessed separately from new incentives.

**Phase 2 — Make accomplishments permanent and visible**

Player outcome: “I have done something worth remembering and showing.”

Implementation units:

- **2.1 Establish the achievement contract.** Definitions include stable id/version, scope, criterion, prerequisites, allowed actor/assistance rules, distinct-target requirements, reward, and retirement policy. Completions use server-validated outcomes and durable receipts.
- **2.2 Ship six initial achievements.** Select criteria already supported by meaningful existing activities: exploration, a relationship milestone, work progress, a home creation, table participation/mastery, and campus or creative progress. Final criteria must describe what was proved; they must not turn repeated clicks into a claim of skill.
- **2.3 Add useful presentation.** Show progress, how to earn the achievement, the actual reward, and an earned history. Let players pin up to three badges/titles and display an earned item at home. Residence-confirmation badges retain their separate meaning.
- **2.4 Grow toward 24 achievements.** Expand across the six researched paths as the corresponding story and cooperative outcomes become available through Phases 3–4. This is a content target, not a gate requiring every future activity in the first release.

Recognition can include badges, titles, a commemorative furnishing, or a cosmetic variant. Ordinary agent-supported character progress remains valid under existing game rules. A newly introduced human mastery award must explicitly state and enforce its assistance criteria; existing earnings must not be silently removed or relabelled.

Acceptance: earn, view, equip, display, reload, and travel with an achievement. Replay its completion event and confirm there is one completion and one reward. Verify two characters under one account remain separate. Historical grants require evidence; otherwise display “tracking from launch.” If a character changes controller or owner, the award retains its original provenance.

**Phase 3 — Deliver one memorable story loop**

Player outcome: “My choices matter, someone remembers me, and I want to see the next chapter.”

Build one four-part Hostel Hustle pilot: arrive and meet a recurring resident; choose a work/study/help approach; resolve a consequence or prepare a role; finish a small event and receive a lasting memento. Target short, complete sessions, initially around five to ten minutes where the underlying activity supports it. Treat this duration as a design target to validate.

The scope is one location cluster, a small recurring cast, at least one consequential choice with two valid approaches, one later callback to that choice, and one final reward. Store chapter state, selected choices, and outcome tags durably. Reuse social memory, campus requirements, career dilemmas, and existing tables/events. Preserve the player-authored home-scene system as its own feature.

The finale can use existing event/table behavior so the episode is deliverable before Phase 4's shared-project ledger. Guest players can experience the introduction; existing students enter at the correct point; an offline friend never prevents solo completion. Provide a late-return recap and a route around unavailable activities.

AI integration is bounded: an identified resident can react, present approved choices, or fill a supported role. Game rules determine eligibility, completion, and rewards. An authored fallback keeps the chapter playable if a model or agent is unavailable. The other computer continues owning agent connectivity and execution.

Acceptance: complete guest-intro, established-player, solo, AI-assisted, and reconnect paths. Demonstrate both choices and their different later consequences. The memento appears in the passport/home exactly once. A person who returns after several days can resume without repeating completed prerequisites.

Release gate: Phases 0–3 form the first limited human pilot. Measure activation, chapter completion, another-day meaningful return, and voluntary feedback on choice, competence, and connection. A local playthrough proves functionality; it does not establish retention lift.

**Phase 4 — Let people improve a shared place**

Player outcome: “We did this together, and the world remembers.”

Implement one bounded project, such as preparing a neighbourhood or campus games evening. Offer three complementary roles: exploration/preparation, a learnable activity, and hosting/helping. Cash donation must not be the only useful contribution. Completion produces a visible result: a venue detail, usable furnishing, event capability, or commemorative display.

The project needs a stable occurrence id, state transitions, contribution receipts, distinct contributor identities, role progress, an outcome record, and reward entitlements. The existing campus weekly counter can inform its presentation, but is not already a durable project ledger.

Record human, delegated-agent, independent-agent, and authored-NPC contributions separately. Decide the project's published success rule and caps before implementation. This is a new project-specific rule, not permission to change ordinary agent access or existing ranking policy. Design an explicit low-population fallback whose completion and rewards remain understandable. Humans should have a meaningful role even when agents are active around the clock.

Acceptance: concurrent and repeated contributions settle once; a player cannot manufacture unique contributors through their own characters or agents; the event remains playable in a quiet city; the completed result persists and can be revisited. Keep a contributor ledger even if an event closes. Completion must not leave rewards and world state disagreeing after a retry or restart.

Measure repeated co-play, varied role participation, and visits to the completed result. A filled bar alone is not evidence that the project created belonging.

**Phase 5 — Test cadence in two separate steps**

Player outcome: “A short visit feels worthwhile, and I can keep a rhythm that fits my life.”

**5A: daily activity milestones.** Retain three daily mission categories and a free swap. Make eligibility and distinct-target rules accurate, with a solo alternative for the base social task. Initially experiment with 20 points per mission and milestones at 20/40/60. These points are a display counter. Keep the current cash ceiling and avoid bundling higher payouts with a redesigned screen. The first milestone should feel useful; completing the full bar remains optional.

Evaluate 5A against the existing weekly-card experience before introducing 5B. Compare equivalent cohorts and reward budgets. If results are inconclusive, preserve the uncertainty rather than claiming a win or adding larger rewards.

**5B: an optional meaningful-day streak.** Start with permanent recognition. Only add a cosmetic collection-progress bonus if that collection track exists and balance review supports it:

| Qualifying days | Candidate cosmetic-progress rate | Permanent recognition |
| --- | --- | --- |
| 1–2 | Normal | First qualifying activity recorded |
| 3–6 | +5% | Three-day ribbon |
| 7–13 | +10% | Seven-day badge / cosmetic choice |
| 14–29 | +15% | Two-week display variant |
| 30+ | +20% maximum | Thirty-day title or frame |

Apply the bonus only to a fixed daily allowance of non-spendable cosmetic progress. It does not multiply money, existing perk stars, wages, voting power, or competitive strength. A meaningful human action marks the day; opening the app or autonomous agent work does not. Preserve the four-of-seven weekly card, lifetime active days, best streak, and all earned achievements. Prototype one automatically used free rest day earned after four active days, capped at one held; it preserves the chain without counting as an active day. Publish outage and reset behavior. These exact values remain experiment proposals.

Acceptance: verify daily/weekly boundaries, late collection, missed days, rest-day consumption, outages, reconnect, timezone display, and known automation. Run the existing economy model for relevant one-, seven-, and thirty-day patterns, including a missed week and agent-assisted earning. Compare voluntary meaningful return, post-lapse return, player-reported pressure, and reward cost. Technical correctness and sufficient observed cohort evidence are separate gates.

**Phase 6 — Expand the content that earns repeat play**

Player outcome: “There are new experiences here, and my old accomplishments still matter.”

Expand in small units: a second episode or ambition, another project variant, a curated collection, then a bounded season. Extend the achievement catalogue only alongside real activities. Use a shared content definition format and simple validation before considering a general-purpose editor. Add opt-in reminders only for concrete unfinished intentions or relevant events.

A season needs a published duration, attainable base rewards, a late-join path, a retrospective history, and a rule for unfinished choices and earned rewards. Existing badges, trophies, and completed chapters remain visible afterward. Agent dialogue variation can enrich authored content; unrestricted generated eligibility or payouts remain outside this plan.

Acceptance: observe behavior beyond initial novelty and across multiple complete weekly cycles. Use D7/D30 only for fully observed cohorts. Review completion, repeat participation, recovery after absence, content production effort, moderation burden, model failures, and cost per meaningful returning human. Expand locations and ambitions individually; do not infer readiness for every city from one pilot.

**Parallel work and ownership**

| Owner/workstream | Finite responsibility | Can proceed in parallel with | Integration boundary |
| --- | --- | --- | --- |
| Progression implementation | Completion/entitlement lifecycle, achievement definitions, projections | Passport presentation and authored content after contract agreement | Shared types, wallet effects, persistence, and telemetry have one integration owner. |
| Experience/content | Episode script, choice/consequence map, mission copy, badge criteria, reward concepts | Phase 0 technical work | Content cannot claim unsupported eligibility or outcomes. |
| Passport presentation | Existing-state views and valid routing | Achievement logic after Phase 0 contracts | Uses domain views; never creates a second source of progress. |
| Existing agent-runtime owner | Credentials, execution, presence, labels, server actor provenance | All content/UI preparation | Supplies the agreed action context; progression consumes it. |
| Integration/verification owner | Scope decisions, migration, economic effects, joined-up acceptance | Bounded implementation by other owners | Resolves conflicting shared edits and reviews the real player journey. |

Use Luna for bounded inventories, content drafting, and document checks; use the available Sol tier for coupled implementation. Astra owns consequential integration decisions and interactive browser/device acceptance. Start with at most two independent implementation workers unless additional units have demonstrably separate ownership. The other computer's work is an external dependency until its actual source and integration behavior have been checked; a report of completion is not acceptance.

Do not run two writers against shared progression types, settlement, actor contracts, or the wallet. Parallelise preparation and isolated components, then integrate one accepted unit at a time. No message to the other computer or task has been sent as part of this plan.

**Phase tracker and evidence**

| Unit | Proposed owner | Source/evidence state | Implementation | Release state | Next action |
| --- | --- | --- | --- | --- | --- |
| Phase 0 | Integration + Sol progression + Luna fixtures | Final combined build/typecheck/17 smoke/all-city size pass; 84 retention and 74 agent-play checks before cache-first merge pass. See handoff for broad-suite limits. | Verified locally at named scope | Published to main; production unverified | Resolve documented broad-suite release findings before a production rollout. |
| Phase 1 | Experience + progression | Actual saved-character reload and Today/Achievements/season views survive final merge; responsive 320/375/1280 checks documented. | Verified locally | Published to main; production unverified | Validate a representative physical phone and constrained network for rollout. |
| Phase 2 | Progression + content | Six criteria, exact receipts and travel checks; real Wayfinder earned, pinned and displayed at home; final reload persists. | Verified locally | Published to main; production unverified | Observe comprehension and achievement completion in an authorised pilot. |
| Phase 3 | Content + integration | Two four-chapter episodes; direct-engine branches/prerequisite/solo/exact-once mementos pass. This is not a full browser story playthrough. | Verified at engine level | Published to main; production unverified | Complete player pilot walkthroughs and observe choice/return behaviour. |
| Phase 4 | Project + integration | Two projects; local HTTP owner-role race deduplication, quiet fallback, rollback and once-only memento pass. | Verified at HTTP level | Published to main; production unverified | Observe real co-play and quiet-city completion in an authorised pilot. |
| Phase 5 | Product + progression | Separate 5A/5B; local HTTP cadence/season authority and retries pass; defaults off/off/null. | Verified locally; cohorts unmeasured | Published to main; flags default off | Evaluate 5A and 5B separately under an authorised rollout; preserve inconclusive results. |
| Phase 6 | Content + product | All 284 supported cities now have 568 distinct local tales, 1,704 authored missions and 243 country/territory arcs. Final 69-city source and actual Tokyo collections verified locally; see [current evidence](unique-local-content-2026-10-15/README.md). | Content implementation and source acceptance complete; repeat-play outcomes unmeasured | Published to main; CI38734503763 passes; no new deployment | Evaluate repeat participation in an authorised pilot; production rollout requires the documented release gates. |

During implementation, update this table with the exact source revision, owner, evidence artifact, blocker, and next action. Use queued, implementing, blocked, or verified-at-named-level for implementation. Keep local, staging, limited-release, and production evidence distinct. Promotion requires the preceding phase's acceptance evidence and an authorised release action; the plan itself does not deploy anything.

Current scope note: the worldwide foundation currently contains only two authored Lagos/UNILAG stories and two authored Lagos/UNILAG projects. The episode, project, and journey seams are reusable for reviewed country/city/place definitions, and the same character's permanent receipts follow travel with its `CityLifeRecord`; this does not mean all catalogue cities or places are playable or story-authored. Phase 5A and 5B remain separate cohort gates. `RETENTION_DAILY_MILESTONES=1` enables the display-only 5A milestones, `RETENTION_RHYTHM=1` enables 5B rhythm, and `RETENTION_SEASON_START_DAY` must be a valid operator value before a season opens; defaults are false, false, and `null`. No D7/D30 lift or production proof exists yet.

Current joined HTTP evidence is archived in [retention evidence](retention-evidence-2026-10-15): project, cadence, and season probes each report PASS for their bounded route, rollback/retry, authority, travel, and receipt checks. These are local synthetic-actor checks, not staging or production proof. Browser captures in [retention UI evidence](retention-ui-evidence-2026-10-14/README.md) label their source scope. The final combined-source reload preserves the earned/pinned/displayed badge, collected reward, rhythm and season plan. Source defaults remain unchanged; source publication is confirmed, deployment remains separate.

Verification should reuse relevant existing checks and concrete player journeys. No new tests, builds, servers, migrations, or runtime sessions were created or run while writing this plan. Financial/reward correctness, recoverable progress, and scope isolation are release blockers. An inconclusive retention result remains inconclusive; content preparation can continue while the observation window matures.

Planning execution: one bounded source-dependency review used gpt-5.6-luna at medium effort; the parent rechecked critical source seams and authored/integrated the plan. Token usage, total elapsed time, and monetary cost were not supplied and remain unknown.
