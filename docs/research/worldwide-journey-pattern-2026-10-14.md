# Worldwide journey pattern (2026-10-14)

This is a source-backed authoring pattern for adding local journeys without implying that every catalogue row already has playable places or authored story content.

## What exists today

The geographic hierarchy is split across the city catalogue and each city module:

`country -> state -> local unit (the city's named subdivision) -> district -> venue -> spot/activity`.

- [`src/game/cities/catalogue.ts`](../../src/game/cities/catalogue.ts) exposes stable city `id`/name, state id/name, optional country ISO/name, coordinates, airport, `open`, and optional `generatedLinkPolicy`.
- [`src/types/content.ts`](../../src/types/content.ts) defines `CityCountry`, `CityState`, `CityDistrict`, `CityHub`, `CityModuleRules`, and `CityContent`. Rules carry country/state/units/districts/hubs and travel links; content carries venues, regulars, workplaces, housing, events, starter goals, and `thingsToDo`.
- [`src/game/cities/registry.ts`](../../src/game/cities/registry.ts) loads the world index and city modules lazily. `knownCities()` distinguishes catalogue knowledge and open status; `cityContent()`/`loadCityContent()` require the module's authored content. A catalogue row is therefore not proof that a city has loaded content, authored places, or a story.
- [`src/game/cities/runtime.ts`](../../src/game/cities/runtime.ts) derives playable venues, regulars, jobs, and public/ticket arrival venues from loaded `CityContent`; it does not create missing content.
- [`src/game/cities/loaders.generated.ts`](../../src/game/cities/loaders.generated.ts) reports 284 generated city entries and 243 unique country identifiers. [`scripts/city/build-catalogue.ts`](../../scripts/city/build-catalogue.ts) computes that figure from unique `rules.country.id` values (normalizing Nigeria aliases), and the landing labels it “countries”; it is a count of country/territory/map identities represented by the catalogue, not a verified count of sovereign states. Generated entries are catalogued/open according to their generated rows; the reserved Kaduna row in `catalogue.ts` is explicitly `open: false` and says it is not open yet. This is catalogue/open-state evidence only, not evidence that all rows have journey or story content.

The current authored progression is finite and location-specific:

- [`src/game/content/episodes.ts`](../../src/game/content/episodes.ts) has two versioned episodes, both authored at Lagos/UNILAG: `hostel-hustle` and `the-quiet-hours`. The episode engine now accepts generic `location` and observation ids and validates stable ids/reference consistency; that generic engine capability does not mean other cities have authored stories.
- [`src/game/content/projects.ts`](../../src/game/content/projects.ts) has one project occurrence, `akoka-games-night:v1:pilot`, at Lagos/UNILAG with three roles (`prepare`, `learn`, `welcome`).
- [`src/game/content/achievements.ts`](../../src/game/content/achievements.ts) has six character-scoped achievements. Their receipts carry `id`, `version`, `earnedAt`, `cityId`, and actor origins; retirement keeps earned receipts.
- [`src/game/systems/missions.ts`](../../src/game/systems/missions.ts) deals daily/weekly mission definitions against the current city's venues and references. Its visit identity is city-qualified, and its visited list is part of the life state and period roll.

Travel and persistence are city-oriented but preserve character ownership. [`server/character.ts`](../../server/character.ts) moves the complete `CityLifeRecord` (including `state` and `progression`) to the destination city, writes a current character pin, and archives a conflicting prior city life under `legacyLives`; it does not merge two city lives. [`server/types.ts`](../../server/types.ts) defines those records, while `SessionRecord` holds one active `character`, per-city records, and archived lives. Existing episode, achievement, and project state therefore travels with the same character. The missing layer is a durable geographic index/projection over those character-owned receipts, not a second ledger or a merge of unrelated archived lives.

Use these truth labels in any catalogue or UI:

| Label | Evidence | Safe claim |
| --- | --- | --- |
| Catalogued | A row in the generated catalogue/index | The country/state/city identity and map facts exist. |
| Playable | `open` city with a module loader and loadable rules/content; required venues/arrival path resolve | A player can enter and use the implemented city surface. |
| Story-authored | A versioned episode/journey definition names this city and its proof destinations | The named authored story can be played there. |

Never promote `catalogued` to `playable`, or `playable` to `story-authored`, by inference.

## Finite authoring template

Each authored unit should be a reviewed, finite record, with no generic fictional fallback:

```ts
type WorldwideJourneyDefinition = {
  id: `${string}:${string}:${string}`       // country.city.place, stable slug
  version: number                           // increment for authored changes
  geography: {
    countryId: string
    cityId: string
    placeId: string                         // stable venue/spot identity
  }
  prerequisite: { journeyId: string; version: number; refusal: string } | null
  activities: readonly [
    { id: string; venue: string; spot?: string; proof: string },
    { id: string; venue: string; spot?: string; proof: string },
    { id: string; venue: string; spot?: string; proof: string },
  ]
  branchStory: {
    intro: string
    choices: readonly [{ id: string; text: string }, { id: string; text: string }]
    callbacks: readonly string[]
    finale: string
  }
  sharedProject: { id: string; occurrence: string; roles: readonly string[] } | null
  cosmeticCollection: { id: string; version: number; rewardId: string }
  retentionAfterTravel: {
    resume: 'character-passport'
    completedReceipts: 'permanent'
    returnSummary: string
  }
}
```

The minimum authored unit is therefore one country/city/place identity, two or three real local activities, one authored branch with a later callback, an optional shared project occurrence, and a distinct cosmetic collection item. Every prerequisite, proof, reward, and destination must point to existing rules/content or be marked unavailable until that dependency ships. Versioned ids must be immutable after release; a revised script mints a new version while old receipts remain readable.

The journey receipt should remain character-owned and travel with that character, containing at least `journeyId`, `version`, `countryId`, `cityId`, `placeId`, `startedAt`, completed branch/choice, proof references, actor origins, completion time, and cosmetic reward entitlement. Keep it beside the character's existing durable progression, with a server idempotency key for each proof and grant. Add a read-only country/city/place projection for passport, map, and collection queries; do not duplicate completion state or merge receipts from unrelated archived lives. City-local mission progress may remain in the city life; completion, branch history, and earned cosmetic receipt must survive travel.

Compatibility note: permanent journey/achievement receipts are global character progress, while current missions are a separate cadence system. The mission pools are shared definitions with current-city eligibility and city-qualified visit marks; they are not an authored worldwide story system and should not be used as proof that every city has local journeys.

## Hardcoded seams to fix

1. [`src/game/content/episodes.ts`](../../src/game/content/episodes.ts) still contains only Lagos/UNILAG definitions, with authored NPC ids, spots, activities, and two episode ids. Keep the now-generic episode validation/engine, but add a city/place journey definition registry and load only definitions whose venue/regular/activity proofs resolve.
2. [`src/game/content/projects.ts`](../../src/game/content/projects.ts) hardcodes one Lagos project, its occurrence, three roles, and its memento. Generalize the occurrence registry while retaining explicit role criteria and distinct-contributor rules.
3. [`src/types/achievements.ts`](../../src/types/achievements.ts) models only a fixed `AchievementId` union and `scope: 'character'`; extend the versioned receipt/definition contract for journey ids, geography, prerequisites, and cosmetic collection membership without changing old ids.
4. [`server/character.ts`](../../server/character.ts) already moves the complete city record and its progression with the character. Add an explicit geographic read/projection path over the character-owned receipts; do not infer completion from only the active city and do not merge two independent archived lives.
5. [`src/game/systems/missions.ts`](../../src/game/systems/missions.ts) uses period-scoped, city-qualified visits and a bounded visited list. Keep those local cadence mechanics separate from permanent journey completion and ensure a journey's proof requires a real authored activity, not repeated navigation.
6. `CityContent` has venues/regulars/workplaces/events but no journey field. Add a finite, validated authored-content slot or a separate registry keyed by stable city/place ids; do not synthesize content for catalogue rows.

## Minimum validation before calling a unit playable

- Validate stable id/version uniqueness, country/city/place membership, prerequisite graph acyclicity, and every venue/spot/NPC/activity/project role reference against the loaded city module.
- Prove the three local activities independently, the branch choice and callback, the finale, the cosmetic entitlement, and the return summary. A city with only catalogue/map data must report `catalogued`; a loaded city with no resolvable activity must not report `playable`.
- Exercise start, duplicate proof, reconnect, late return, travel during an unfinished journey, travel after completion, city-life archival, account/character switching, and two characters under one account. Completion and cosmetic grant must settle exactly once.
- Verify the active character can resume from the global receipt after `fileCharacter()` and `swapLegacyLife()`; verify that unrelated archived lives do not merge their journey histories.
- Verify project contributions record distinct human/delegated-agent/agent-character origins and cannot manufacture unique contributors from one owner. Keep quiet-city fallback explicit and authored.
- Run focused type/content validators and existing journey, achievement, project, travel, and persistence checks at Node and Worker targets when implementation lands. This document is an inventory; no checks were run here.

Highest-priority gaps: (1) a geographic index/projection over the existing character-owned, versioned journey receipts and entitlements; (2) a finite validated country/city/place journey registry replacing Lagos-only episode/project constants; (3) truthful catalogue/playable/story-authored capability reporting with reference validation and a quiet-city/resume path.
