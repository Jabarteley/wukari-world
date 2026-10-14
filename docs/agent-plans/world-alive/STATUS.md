# Status

Read this first in every session; update it after every phase and whenever you stop. Keep it short and true: what is live,
what is pushed but not live, what is next, what is blocked. Newest entries at the top of each section.

## Now

- **Phase:** 0 (not started). The brief was written on 14 October 2026.
- **`main` when the brief was written:** `913eecb4a8f0c6b92de6ecd9d3ed5a847bd895b3`, also live (`/api/health` build
  `joinallworld-913eecb4…`).
- **Next step:** Phase 0 in PHASES.md.

## Phases

| Phase | State | Live commit | Notes |
| --- | --- | --- | --- |
| 0 Baseline | not started | | |
| 1 Online count with agents | not started | | |
| 2 Safety around AI characters | not started | | |
| 3 Friendship after shared play | not started | | |
| 4 World feed | not started | | |
| 5 Money in the city's currency | not started | | |
| 6 Shareable moment cards | not started | | |
| 7 Data-light mode | not started | | |
| 8 Gist and the world ledger | not started | | |
| 9 Model router and budget | not started | | |
| 10 House agents and action library | not started | | |
| 11 Missions from agents | not started | | |
| 12 Talking, memory, relationships | not started | | |
| 13a One resident in shadow | not started | | |
| 13b Thirty residents | not started | | |
| 13c Ideas, assembly, president, letter | not started | | |
| 14 Prayers and acts | not started | | |
| 15 Calls with agents | not started | | |
| 16 Festivals, owambe, match nights | not started | | |
| 17 City texture packs | not started | | |
| 18 Real price levels | not started | | |
| 19 Smaller features | not started | | |
| 20 Agents' relationships and world events | not started | | |

States: not started · in progress · pushed, not yet live · live · blocked (say on what).

## Questions for the owner

Ask these in your chat as well; record the answer here when you have it.

1. **Releases from GitHub need a Cloudflare token.** The release workflow in `kromate/joinallworld` builds, but its deploy step
   needs `CLOUDFLARE_API_TOKEN` in the repository's `production` environment. (`CLOUDFLARE_ACCOUNT_ID` was added on 14 October
   2026.) The owner creates a Cloudflare API token from the "Edit Cloudflare Workers" template for the account, and adds it at
   GitHub → kromate/joinallworld → Settings → Environments → production → Add secret.
2. **OpenRouter credit.** The OpenRouter account was on the free tier on 14 October 2026 (50 free requests a day). A one-time
   US$10 credit lifts free models to 1,000 a day.

## Failing on `main` before us

Reported on 14 October 2026 for the full `npm test` (re-check in Phase 0; remove what passes):
- `src/game/cities/allCities.test.ts`: "each playable city can settle… return and reload" (a long text cut at 80 characters
  loses a trailing space after reload), and two very slow tests ("open city footprints do not overlap", "every pair of open
  cities has a bounded homeward quote").
- `src/game/cities/legacyLife.test.ts` (1) and `liveBuildLife.test.ts` (2): loaded old lives carry `growth.tables.staked: 0`.
- `src/game/cities/mapEntries.test.ts`: expects `test-estrellas`, finds `villa-las-estrellas`.
- `src/map3d/geo/atlas.test.ts`: "open versus coming soon is derived from the additive city catalogue".
- `src/scene/scenes-fct.test.ts`: two scenes with the same triangle count.
- `src/game/living-world/vehicle-boarding.test.ts`, `vehicle-clearance.test.ts`: a recorded hash changed.
- `src/ui/phone/phone.test.ts`: "a small round button reaches a 44px target".
- `server/new-player.test.ts`: a scripted game's winner depends on the time of day.

## Measures to keep (Phases 3, 13, 15)

- Return on day 1, 7 and 30, split by ad source and by "has a friend".
- Residents: model spend per day, thoughts per resident per day, rule slips, out-of-character retries, talk with strangers,
  businesses started, friendships kept.
- Speech to text: words right and delay, per accent, for each way.

## Log

Newest first. One entry per release: date, phase, commit, what a player gains, checks (typecheck, build, sizes, tests, CI,
smoke), anything left.

- 2026-10-14: brief written (this folder). Nothing implemented yet.
