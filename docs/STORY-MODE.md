# Story Mode

Story Mode is an optional, per-character path through the existing world. Free Roam remains the default for new and existing saves. A character can switch between `free` and `story` with `story.mode`; switching has no fee or cooldown and never discards progress.

Phase 1 is protected by the server-owned `storyMode` admin setting, whose default is off. The server omits the capability when the setting is off, rejects mode changes, and returns a hidden Story view. The client does not decide whether the feature is available. This document describes the Phase 1 contract and its acceptance requirements; it does not claim that Story Mode has been enabled or released on a public server.

## Saved state and compatibility

`state.story` is an additive system-owned slice. It does not change the save version. The Story system declares the key and rebuilds it at the normal `sanitize()` boundary.

| Field | Meaning |
| --- | --- |
| `version` | Version of the Story slice; currently `1`. |
| `trackingSince` | Server time when durable Story tracking began for this character. |
| `mode` | `free` or `story`; missing and invalid values become `free`. |
| `start` | The city occupied on the first successful switch to Story, or `null` before that switch. |
| `cities` | Per-city mission occurrence IDs, distinct visited venue IDs, and an optional verified Roots receipt. |
| `helped` | A bounded list of verified sessions where this character helped another player. |
| `helper` | A temporary, server-issued pass into one host challenge. It includes the return place and expiry. |

Tracking runs in both modes. A completed authored mission occurrence raises `mission.completed`; a real arrival raises `travel.arrived`; the Story listener retains at most eight valid local mission reward IDs and six distinct non-home venue IDs per city. Tale mementos and collection completion remain canonical in the existing episode and journey receipts. Daily or weekly mission rows may roll away, while their authenticated occurrence IDs in the Story tally remain.

Existing saves need no conversion action. Sanitization imports valid retained mission grants and visits into the tally, and every old life starts in Free Roam. A canonical local-tales collection whose city and country mementos were both completed before `trackingSince` grandfathers that city directly to chapter 4. This rule recognizes completed veteran history; malformed or partial collection data does not qualify.

## Chapter ladder

`chapterOf(state, city)` derives the chapter every time from canonical receipts and the bounded tally. There is no stored chapter counter to drift.

| Chapter | Label | Required evidence |
| --- | --- | --- |
| 0 | Arrive | The city tale has not yet produced its first two chapter receipts. Home, the tale host and proof destinations, and one market or food welcome venue remain available. |
| 1 | Settle | The first two city-tale chapter receipts exist. Complete the city tale and three authored local mission occurrences. |
| 2 | Belong | The city-tale memento and three missions exist. Complete the country tale, reach six authored local mission occurrences, and visit six distinct public venues. |
| 3 | Roots | The country memento, six missions and six venues exist. Complete the local tales collection, then either finish one verified Roots help challenge or complete two additional authored local mission occurrences. |
| 4 | Complete | The collection and Roots condition are both satisfied. Connected, non-closed cities become available in Story Mode. |

The two extra mission occurrences are occurrences, not two invented definitions. A city has three authored daily and three authored weekly definitions; a later period can produce another authenticated occurrence of an authored definition with a different reward ID.

Venue chapters use one shared slot function. Proof destinations and the welcome venue are chapter 0, ordinary work and transport or worship hubs open next, care, fun and the proposed city-signature venue open later, and the remaining venues open at Roots. The city-signature selection and presentation are still under review; the current code must not be read as acceptance of a launched signature game.

## One server guard for every entrance

Story locks are server rules. The Story system contributes one `action.block` modifier for relocation, Homeward travel, ordinary venue travel, street entry, and social room joins. Those paths all call the same `storyBlock()` and `venueOpen()` functions and return the same reason. Keeping the policy at the universal action boundary prevents a new button, map route, or server-originated action from bypassing a UI-only check.

Both pure guards return immediately in Free Roam, so the existing open-world behavior stays available. The Story mode switch fixes the first start city; completing a city opens its connected non-closed neighbours. UI locks and map presentation are projections of the server view, never separate authority.

## Friend help and the solo path

Roots help is friends-only. AI-played friends remain visibly marked. The host must be in Story Mode, at Roots, and standing at the country-tale venue. The server allows three calls per player per day, expires an offer after 30 minutes, and verifies one of three kinds:

- `second-answer`: host and helper receive separate server-selected prompts, and both answers must pass.
- `two-seat`: host and helper each play a turn in an eight-card memory table against the house; the server owns the board, turn and result.
- `errand`: the server offers a qualifying authored local mission reward ID and consumes only that verified occurrence.

Joining creates a temporary helper pass for the host city and challenge places. The pass is revoked on completion, expiry, ending, or feature disable, and returns the helper to the recorded place. While it exists, the universal guard prevents the helper from entering unrelated cities, venues, tales, or Homeward routes. Helper activity does not write the helper's own city mission or venue tally, and a help completion gives the host a Roots receipt while the helper receives a separate bounded keepsake receipt. The helper's own ladder and city unlocks remain unchanged.

Every city has a solo Roots path: eight authenticated authored mission occurrences, which is two more than the six required for Belong. A character without an available friend can therefore reach chapter 4 through local play.

## Lazy delivery

Story rules are completed through the lazy progression-rules pack. The Home entry and Passport panel are async components and are not requested when the trusted capability is absent. City tales, mission catalogues, scenes, recipes, regional kits, landmarks and later talk banks stay in their existing per-city or feature chunks. Linked-city idle prefetch must continue to respect save-data and slow-network checks.

Free Roam and a disabled `storyMode` setting must not add Story code to startup, engine, or scene-host budgets. Download budgets are acceptance gates and are not raised to accommodate this feature.

## Acceptance

The all-city contract loop checks every playable city for chapter-0 prerequisite access, two canonical tales, six authored mission definitions, two further valid mission occurrences, six public venue receipts, the full 0→4 ladder, and a connected unlock or an explicit terminal-city diagnostic. Focused ladder and co-op suites cover veteran grandfathering, free-mode early returns, helper isolation, quotas, expiry, and server verification.

Source tests do not replace player acceptance. Before enabling the setting, verify existing Free Roam behavior, reversible locks, chapter progress, friend help and the solo route at 320 px and 390 px, then pass typecheck, download budgets, CI, release, and active-build checks.
