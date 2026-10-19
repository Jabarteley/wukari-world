# Story Mode Phase 4 takeover: audit, proof and release

## Identity

- **Work ID:** `story-phase4-takeover-20261019`
- **Owner:** takeover agent (Claude Sonnet 5.5), on a different computer from the earlier Story owner
- **UTC updated:** `2026-10-19T11:20:00Z`
- **Status:** `complete` (Phase 4 shipped and verified on the public site; limitations below)

## Goal and boundaries

Independently audit the Phase 4 source from `story/phase4-realism` (tested source `96e2e155`), finish the representative street-entry proof, fix what the audit found, and ship through the normal PR, CI and protected release. Out of scope: regenerating accepted models or banks, the paid dialogue probe, raising any budget, enabling the production Story setting, changing production saves, bindings or migrations. Free Roam stays the default.

## Delivery

- Branch `story/phase4-takeover`: Phase 4 source plus current `main` (`3010cc17`, then `8cf336eff`), plus commit `eb068b2cb`.
- PR: https://github.com/kromate/joinallworld/pull/52, merged as `ecbff71c1b6467071feae545c4723658a912f4c2`. The merge tree equals the CI-tested PR head `ae806ce57`.
- CI on the exact PR head: https://github.com/kromate/joinallworld/actions/runs/39234942715 (typecheck, build and smoke, UI regressions, host acceptance, release policy). The `CI` workflow did not start on the pull-request event, so it was dispatched on the branch (`full_checks=false`, `ui_checks=true`); earlier dispatches: 39224075666 (`e17dd8f3f`), 39230590725 (`eb068b2cb`).
- Release: https://github.com/kromate/joinallworld/actions/runs/39236578851 with `source_sha=ecbff71c1b6467071feae545c4723658a912f4c2`, `deploy=true`, `full_checks=false`, `publish_staging=false`, `cleanup_window=false`. Both jobs succeeded. Deploy log: Worker `joinallworld-next`, version `fc0ed2a5-6a16-45bf-9041-7a1110da2955`, bindings `JOINALLWORLD` (`JoinAllworldState`), `MODELS` (`allworld`), `ASSETS`, `BUILD_ID` starting `joinallworld-ecbff71c1b6467071feae545`.
- Public health at `https://joinallworld.com/api/health` adopted `joinallworld-ecbff71c1b6467071feae545c47` (health abbreviates the build ID to the first 27 hex characters of the SHA).

## Audit findings and fixes

Source audit (read-only, against the diff from `main`): the V1 recipe path keeps its old materials and sky (surface treatment is created only for `physical-atlas-v1`; `skyTint` is optional and returns a copy); surface buffers are disposed in reverse order and on every failure path; Phase 4 files load only through the lazy recipe chunk; `src/budgets.ts`, `scripts/download-budget.ts`, `vite.config.ts`, `wrangler.jsonc`, workflows and `server/street`/`server/story` are unchanged; the Story setting still defaults off; Story street entry is refused by the same server `action.block` guard as every other door. The street coverage file matches the retained manifests (Lagos 25/25 venues with doors, Ibadan 23/24; `iita-forest` has none). Both independent feed-service fixes (`09550dbea` and the cover/locals reorder) are present after the merge.

Fixed in this work: the disabled "Walk into the city" and "Return to the street" buttons only exposed their reason as a tooltip, which touch users never see, so the reason is now visible text; the "mapped venue" copy told a player already inside a venue to enter it from the street.

Not fixed: all 284 recipe packs moved to V2 with no test of the V1 path through `runtime-host` or the `lit()` change; `streetWalkCoverage.generated.ts` has no generator or drift test; `VenueCard.vue` repeats the eligibility rule from `streetWalk.ts`; the surface-mask owner assumes merged geometry is never rebuilt.

## Real gameplay proof

Environment: local Node server serving the CI-built artifact (`app-d45348c.js`, from run 39230590725) with repo `public/` files and regenerated city, word and progression assets overlaid (the Story CI artifact omits them), headless desktop Chrome with software WebGL, disposable local QA data. Setup used a **synthetic fixture**, not earned progress: a local character created through the onboarding API in Lagos Island (ordinary starter home, estate 0), with Chapter 3 receipts and the admin Story setting written into the local data file. Nothing was injected into production.

Journey at 390px (and the return card again at 320px): home, "Walk into the city" (the avatar walked to the physical estate gate and the server accepted a `walking` journey), about 300 m of ordinary WASD walking to the Police door, `POST /api/street/enter` 200 (journey `venue`, `police`, door `venue:lagos:police`), "Return to the street" (`POST /api/street/exit` 200, same journey id back to `walking` at the saved door point), ordinary page reload (same journey id, position and Story progress). The same run on the earlier artifact (`e17dd8f3f`) also passed. Ordinary timed travel to a mapped venue works and offers no street return; a venue with no mapped door (Ibadan `iita-forest`) shows no street entry; mapped Ibadan `dugbe-amala` shows it at 320 and 390. Scenes rendered at 320 and 390 in Accra Makola Market, Nairobi Uhuru Park, Tokyo Nippori, Paris Maison du Val and the authored Lagos Police Station.

## Sizes (final artifact, CI run 39234942715)

Startup 612,007 raw / 222,358 gzip / 195,790 Brotli, largest over 284 cities (Lagos). The original 196,100 Brotli comparison threshold is kept and met (configured 196,300 also met). Scene host 80,169 raw / 30,356 gzip. No budget was raised.

## Production verification

Anonymous, all non-GET requests blocked so nothing was written: landing, native creator, `/county/`, `/cities`, `/cities/scenes`, and a click-through county, Ghana, Accra, scenes at 320 and 390px. All returned 200, no horizontal overflow, no failed GETs, shared assets and the Accra city chunks returned 200.

## Limitations and disclosures

- The street move endpoint's existing limit of 240 moves per minute answered `429` after a burst from my test driver; the client then showed "The street could not be loaded" and recovered after the window or a reload. Existing behaviour, unchanged here. The earlier owner's street-corner `503` was not reproduced or explained.
- Venue texture counts grow on repeated returns (inherited, not fixed).
- Desktop headless Chrome with software WebGL only: no physical-phone or GPU claims.
- Four history cards do not establish that every mission was fact-checked.
- The protected house-dialogue hook remains pending.
- Not independently verified: the Durable Object namespace `6b84e715f6c444f69971a0b6cde7868b` and a 100% rollout. They would need Cloudflare credentials, which this machine does not have. The deploy log shows the unchanged `JOINALLWORLD`/`MODELS` bindings and the public site serves the new build. The production Story setting was not changed and is not readable anonymously; its source default is still off.
- Local typecheck ran out of memory on an 8 GB machine; CI typecheck passed on the same source.
- The previous owner's private evidence cohorts and helper `r2` were not used.

## Owned resources

Local only: a clone, worktrees, a headless Chrome profile, a local server and disposable QA data under `~/work-takeover`. All processes are stopped. No cloud resources, keys or services were created or purchased.
