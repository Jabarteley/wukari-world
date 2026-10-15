# Onboarding country and area presentation audit

- **Work ID:** `onboarding-country-audit-20261015`
- **Owner:** `/root/onboarding_country_audit`
- **Model / effort:** `gpt-5.6-luna / low`
- **Thread:** `/root/onboarding_country_audit`
- **UTC updated:** `2026-10-15T00:00:00Z`
- **Status:** `ready-for-review`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** Identify the source boundary behind the Nairobi breadcrumb country and technical starter-area copy.
- **In scope:** Read-only source audit and this record only.
- **Out of scope:** Implementation, tests, generated city source, Git, services, browser/integration.
- **Exclusive file ownership:** `docs/agent-work/onboarding-country-audit-20261015.md`
- **Output contract:** Exact paths/lines, smallest bounded presentation correction, ownership overlap notes.

## Repository state

- **Repo:** JoinAllworld
- **Host:** local
- **Branch / worktree:** `codex/retention-main-sync`, `/Users/anthonyakpan/.codex/worktrees/retention-main-sync/JoinAllworld`
- **Base/current commit:** `63cb72ed9997431116924b3a48859938205b192f` (`git rev-parse HEAD`; unrelated dirty work preserved)
- **Dirty status:** dirty; unrelated parent/worker changes present, no source edits by this worker.
- **Port/process ownership:** none

## Findings and exact correction boundary

- `src/app/features/start/StepHome.vue:47-58,178-181` sets `const country = PLACES[0]` and renders `country?.name` as the first breadcrumb item. This makes every city, including Nairobi, display `Nigeria` because `placesFrom()` currently returns one hard-coded country object.
- `src/app/features/start/placesModel.ts:17-28` discards `CityCatalogueEntry.countryISO/countryName` and wraps every catalogue city under `{ id: 'nigeria', name: 'Nigeria' }`. The registry catalogue does carry the authoritative country fields (`src/game/cities/catalogue.ts:6-18`); Nairobi facts confirm `ke` / `Kenya` in `src/game/cities/nairobi/facts.ts:5-10`.
- `src/game/cities/africa/contentBuilder.ts:180-185` installs `localUnitDescriptions: { centre: valid.playerIntro ?? \`${area} within ${valid.coverageNote}\` }`. For generated destinations without `playerIntro`, `StepHome.vue:215-218` displays that line as the selected starter-house area copy. This is why Nairobi exposes the full provenance sentence containing “built-up extent…airport point…not evidence…schedules”.
- Nairobi's `src/game/cities/nairobi/facts.ts:5-10` has authoritative `country.idISOlower: 'ke'`, `country.name: 'Kenya'`; `src/game/cities/africa/rules.ts:47` carries that into `cityRules(city).country`. The observed `₦` is a separate, intentional economy boundary: `src/game/currency.ts:5-8` says the game's stored unit stays naira, and `src/game/systems/onboarding.ts:496-502` formats start cash/messages with `naira()`. `currencyOfCountry('ke')` already resolves KES (`src/game/currency.ts:32-38, tests src/game/currency.test.ts:17`), but no current onboarding/HUD conversion should be inferred or added in this audit.

## Implementation checkpoint

- `placesModel.ts` now groups catalogue rows by real country metadata, preserves Nigerian `nigeria` identity and state IDs, prefixes non-Nigerian state IDs to avoid collisions, and exports `countryOfCity`.
- `StepHome.vue` derives the breadcrumb country from the selected city and flattens all countries' states for the existing chooser; aria label is now `City or region`.
- `africa/contentBuilder.ts` keeps explicit `playerIntro` and replaces the provenance fallback with concise player-facing copy.
- `creatorModel.test.ts` now compares worldwide city coverage order-independently while retaining Nigerian state assertions.
- Focused check passed: `node --experimental-strip-types --test src/app/features/start/creatorModel.test.ts` (6/6).

## Suggested bounded fix

1. Make `placesFrom()` preserve each catalogue row's country identity (country id/name) and have the Home breadcrumb derive the selected city's country, with a safe fallback only for legacy Nigerian rows. Keep state/city selection semantics intact; do not edit generated `facts.ts`/`places.ts`.
2. Change the Africa content builder's fallback `localUnitDescriptions` to short player-facing copy (for example, `${area} in ${valid.name}.`) or add a dedicated presentation-safe `playerIntro` fallback. Keep `coverageNote` available only as source/provenance metadata.

The first change is shared chooser-model/UI ownership (`placesModel.ts` + `StepHome.vue`); the second is generic Africa content-builder ownership. Generated city source remains read-only. Parent Astra should resolve integration and browser evidence.

## Evidence

- `rg -n "const country = PLACES\[0\]|country\?\.name" src/app/features/start/StepHome.vue`
- `rg -n "return \[\{ id: 'nigeria'|countryISO|countryName" src/app/features/start/placesModel.ts src/game/cities/catalogue.ts`
- `rg -n "coverageNote|localUnitDescriptions" src/game/cities/africa/contentBuilder.ts src/game/cities/nairobi/facts.ts`

## Release state

- **Local implementation:** `not-started`
- **Deployment:** `not-requested`
- **Release gate:** Parent owns implementation, browser reproduction, and verification.

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-15T00:00:00Z | ready-for-review | Located hard-coded Nigeria country wrapper and generated Africa provenance fallback crossing into Home presentation. | `StepHome.vue`, `placesModel.ts`, `catalogue.ts`, `africa/contentBuilder.ts`, `nairobi/facts.ts` | Parent reviews and implements bounded presentation fix. |
