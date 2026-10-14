# Phase 6 episode expansion: The Quiet Hours

Date: 2026-10-14
Scope: one second four-part episode plus the finite catalogue seams required to run both episodes
Release state: local source only; rollout remains controlled by the pilot gates owned by integration

## Result

The episode catalogue now contains two complete rows:

1. `hostel-hustle` version 1, unchanged IDs and proof receipts.
2. `the-quiet-hours` version 1, unlocked only after a valid completed Hostel Hustle run.

The Quiet Hours takes place in `lagos` / `unilag` at the `library`. Bisi’s canonical campus NPC ID is `bisi-reader`; the campus catalogue places that NPC at the Library (`src/campus/unilag/content.ts`, lines 79–89). Shared social activities currently execute through the venue-level `people` spot, so the episode observes the validated Bisi interaction there and requires the player to return to the authored Library spot before committing a chapter.

The four parts are:

| Chapter | Authored beat | Verified boundary | Saved consequence |
| --- | --- | --- | --- |
| 1. One lamp still on | Meet Bisi after games evening | Successful `npc.interacted` for definition-owned NPC `bisi-reader`, then return to the Library | Permanent Chapter 1 receipt |
| 2. What the corner needs | Choose Work, Study, or Help | Work uses a configured campus-job completion; Study uses configured `read-library`; Help uses another successful Bisi interaction | Permanent choice and matching proof receipt |
| 3. The note in the margin | Bisi recalls the chosen role | One of three route-specific authored challenges, validated against the visible correct option | `careful-fix`, `patient-coach`, or `quiet-welcome` |
| 4. The last lamp | Close the quiet corner | Another real Library reading activity, or the authored `quiet-help` solo finale backed by Chapter 3 | Completion receipt and exactly-once bookmark memento |

The Help branch and `quiet-help` finale require no enrolment, payment, live friend, live table, event, model, or agent. They still require the real free Bisi interaction, the authored finite challenge, the saved Chapter 3 outcome, and presence at the Library. Navigation, model wording, and arbitrary client payloads cannot complete them.

## Preserved Hostel Hustle contract

All Hostel Hustle version 1 identifiers remain stable:

- episode `hostel-hustle`;
- choices `work`, `study`, and `help`;
- existing challenge answer IDs and outcome tags;
- finale routes `union-table`, `campus-event`, and `quiet-support`;
- memento `hostel-hustle-memento` and reward key `episode:v1:hostel-hustle:memento`.

Its proof sources, chapter ordering, student gate for Study, callback locations, solo quiet-support finale, receipt sanitizer, late recap, and exactly-once memento behavior remain. The existing UI navigation corrections are retained: Chapter 1 points to `people` until Kola proof exists, option-level `next` is optional, missing-proof text names the required activity, and Chapter 3 appends the authored challenge prompt.

## Definition-driven geography and proof

Each `EpisodeDefinition` now declares:

- an explicit city and venue;
- an optional completed-episode prerequisite;
- event matchers for NPC, activity, campus-job, table, and event proof used by that row;
- authored NPC IDs and callback speaker strings;
- four chapters, three choices and their proof destinations, callback copy and outcomes;
- finite challenge options and one visible correct answer per choice;
- finale routes with observed or authored proof;
- recap copy and one versioned cosmetic memento/reward key.

The engine no longer matches global `lagos`, `unilag`, Kola/Bisi IDs, job IDs, `read-library`, Whot, event venue, or proof spots. Event listeners iterate the catalogue’s trusted source definitions and check the definition’s city, venue and optional spot before storing a bounded observation. These source definitions are code-owned; the client cannot submit a matcher.

Episode state remains character-owned and is not cleared by travel. A character can leave the city, reload, return, and continue from permanent chapter receipts. Views always include both catalogue rows; The Quiet Hours is `locked` until Hostel Hustle has a valid Chapter 4 completion.

## Catalogue validation

`validateEpisodeCatalogue` runs when the content module loads. It checks:

- stable, unique episode, memento and reward IDs;
- stable explicit city and venue IDs;
- a prerequisite that points to an earlier valid row;
- exactly four chapters numbered 1–4;
- non-empty authored NPC IDs and callback speakers;
- one definition-owned observation rule for each observed intro, choice, or finale proof;
- unique stable choice, answer and finale-route IDs in their scopes;
- every correct answer references a visible option.

An invalid authored catalogue throws during module initialization. This is deliberately a small source validator, not a general editor, generated eligibility system, or model-authored reward mechanism.

## State recovery and mementos

Sanitization processes definitions in catalogue order. It reconstructs Hostel Hustle first, then accepts a saved Quiet Hours run only if the sanitized prerequisite is complete. For either episode it rebuilds a sequential 1→2→3→4 receipt chain, validates the choice-specific proof and challenge answer, discards future or mismatched receipts, bounds observations and assistance, and derives chapter, outcome, completion, and memento flags.

The Quiet Hours grants:

- memento `the-quiet-hours-memento`;
- reward key `episode:v1:the-quiet-hours:memento`;
- player-facing title “Quiet Hours bookmark”.

The memento contains no cash, stars, skill XP, multiplier, voting power, or generated entitlement. Repeating the finish action returns `already_completed`; it does not emit or grant again. Existing home/passport projection can resolve either receipt through `episodeById`.

## Current finite seams

This unit does not bulk-create content for other places. It makes the location/proof boundary definition-driven so separately researched city/place packs can add their own rows later.

Two geographic seams remain explicit:

1. The `requiresStudent` choice gate reads the current `unilagStudent` state because no generic education-membership contract exists. A future non-UNILAG campus episode needs a shared eligibility adapter before using an equivalent student-only choice.
2. The proof-source and observed-event unions are finite engine contracts. New place packs can reuse current event kinds through definition-owned IDs. A genuinely new proof event still requires an intentional typed engine extension and registry review.

The catalogue currently lives in one source file. Future country/city/place packs can export rows into the same validated array after their real activities and local writing exist; no dynamic editor or arbitrary client matcher is introduced here.

## Evidence boundary

Temporary source-level probes cover all Work, Study and Help branches in both episodes, prerequisite refusal, reload reconstruction, late recap and finish/memento deduplication. Catalogue validation and module imports pass. Engine-project typechecking found and fixed one owned inference error; other reported diagnostics were pre-existing environment/library diagnostics outside the episode files.

No repository test file, server, build, browser session, commit, deployment, retention cohort, or production release was created by this unit. The second source row is playable engine content, not evidence of repeat engagement or permission to widen rollout.
