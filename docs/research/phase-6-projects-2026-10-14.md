# Phase 6 project catalogue: UNILAG Reading Corner

Date: 2026-10-14
Scope: a second finite Lagos project occurrence and a reusable, definition-driven proof contract. This source work does not establish retention impact or a worldwide content supply.

## Shipped catalogue rows

`akoka-games-night:v1:pilot` remains unchanged as the first occurrence. It meets at Lagos / UNILAG / Student Union, keeps its three `prepare`, `learn`, and `welcome` roles, preserves the authored welcome-board outcome, and grants the permanent **Akoka Welcome Pennant** once through the authoritative server ledger.

`unilag-reading-corner:v1:pilot` is the second occurrence. It meets at Lagos / UNILAG / Library and becomes contributable after the character owns the Akoka memento for the exact first occurrence. Its three roles use existing game outcomes:

- `prepare`: a completed journey arriving at UNILAG;
- `learn`: `read-library` completed at the Library spot;
- `welcome`: a successful interaction with `bisi-reader` at UNILAG's People spot.

The proofs may be recorded before the prerequisite is complete because they are real character history. The server-only `contribute` and `quiet` actions enforce the prerequisite. `claim` remains valid while travelling so a character who helped is not forced to return to the meeting spot merely to collect a completed occurrence.

The visible outcome is authored and distinct: the Library receives a marked route, a shared reading guide, and Bisi's saved quiet chair. The permanent memento is **Reading Corner Bookmark**. Neither occurrence changes money, stars, XP, or any multiplier.

## Durable proof model and migration

Proofs are now namespaced by occurrence definition ID and role:

```ts
state.projects.proofs[projectId]?.[role]
```

This prevents one broad `learn` or `welcome` proof from satisfying every project that reuses the same cooperative role names. State version 2 accepts both the new nested form and the previous flat v1 form. Valid flat `prepare`, `learn`, and `welcome` rows migrate only into `akoka-games-night`; they are never copied into Reading Corner. Existing valid Akoka memento receipts keep their fixed occurrence, earned time, origin set, and permanent grant.

The sanitizer bounds every saved proof to known project and role keys, its definition's city, the character's `trackingSince..now` window, a non-empty source of at most 120 characters, and a known execution origin. It retains only catalogue mementos with the exact project ID, occurrence, city, and valid earned time. Unknown projects, hostile nested keys, malformed origins, future timestamps, and obsolete occurrences are dropped.

## Definition-driven worldwide seam

Each `ProjectDefinition` owns its city, venue, meeting spot, prerequisite, authored outcome, memento title, role copy, and proof matchers. A matcher declares its event plus city, venue, and optional spot. Event-specific selectors declare exact activity IDs or tags, exact NPC IDs, exact table game IDs, or an explicit catalogue-authored match-any rule for Akoka's legacy behavior.

The engine loops the finite catalogue and never names Lagos, UNILAG, Student Union, Library, Bisi, activity IDs, NPC IDs, or game IDs. A later country/city/place pack can add a validated definition without changing the reducer. Travel between cities does not reset `projects`, so proofs and mementos remain part of the global character record.

Catalogue validation rejects duplicate or unstable project IDs, duplicate or malformed occurrences, duplicate memento titles, missing authored text, invalid location IDs, a prerequisite that does not reference an earlier exact occurrence, a role list other than the fixed three roles, empty proof lists, duplicate matchers, and proof locations outside the project's city and venue.

The bounded seam still has deliberate limits. The event union currently covers journey arrival, activity completion, skill level-up, successful NPC interaction, and counted table games. Adding a genuinely new proof source requires a typed event variant and reducer handler. The catalogue remains authored source; there is no arbitrary client rule editor, generated reward language, recurring reset, or automatic completion from navigation alone.

## Server integration contract

The authoritative project service must read the selected definition's proof:

```ts
const proof = role ? state.projects.proofs[def.id]?.[role] : undefined
```

Use that lookup in both board readiness and contribution mutation. Before `contribute` or `quiet`, validate `def.prerequisite` against `state.projects.mementos[projectId]?.occurrence`; return the authored refusal when it is absent. Keep `claim` before place and prerequisite checks. Ledger keys remain the fixed `def.occurrence`, and the existing atomic `projects.server` grant remains the only memento writer.

UI routing must accept both project IDs. The project board can continue rendering `ProjectView`; the definition already supplies the meeting location, role destinations, outcome, and memento title. Pilot rollout gates remain separate from catalogue availability.

## Verification boundary

Focused temporary probes cover v1 flat-proof migration, independent Reading Corner proof capture, prerequisite refusal and unlock, wrong-place refusal, travel-safe claim, Akoka receipt preservation, hostile-row removal, reload conservation, and catalogue validation. No repository test, browser run, server run, build, deployment, or retention experiment is part of this unit.
