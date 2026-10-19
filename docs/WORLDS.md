# Worlds: your world, your rules

A player makes a world of their own from nothing: open ground of a chosen size and surface, under its own sky. They walk into it in
3D, fill it with the models they uploaded, give it a script (a treasure hunt, a race, a light show), and send friends the link. A world
opened to everyone is listed in the Worlds app for anyone to find and join; everyone in a world at the same time sees each other and
the host's models move the same for all. Worlds build on Spaces in 3D (docs/SPACES-3D.md): the same screen, physics, scripts and
together, with no house in the way.

## What the owner asked for (19 Oct 2026)

"Create your own world and invite your friends." "See the way other people created; it can be really detailed and heavy." "Other
people can join other people's worlds." "Watch videos with friends or listen to music together." "A treasure hunt world or game."
"Your world, your rules." And: proper PostHog analytics.

## What a world is

| | |
|---|---|
| Size | Small 24 m, Big 48 m, Huge 80 m across; square, one floor. Chosen once: models stand where they were put. |
| Ground | Grass, sand, stone, snow, or grass by night (a dark sky, a cold low sun). |
| Who can come | **Everyone**: listed under "Worlds people made" (New, Popular). **By link only**: reached by its link alone; its id is twelve random letters. |
| Inside | The maker's own models (up to 120, 4,000,000 triangles: a world may be heavy), their script, physics. Everyone else looks and walks; only the maker arranges. |
| Together | Up to 16 in a world at once (server/ws/spaces.ts). The maker hosts when present; else the first one in. |
| Cover | After a save, the maker's device draws what they see (640×360 WebP) and keeps it as the world's cover. Never drawn on the server. |
| Count | 12 worlds a player. Visits are counted when someone else joins live (once an hour per visitor). |
| Link | `/w/<id>`: the page opens the Worlds app on that world and takes the player in. The link preview names no world. |

Words a world shows (its name, its description) pass the text filter (`server/moderation/text.ts`). Deleting a world deletes where
its models stood, its script and its cover; the models stay in My 3D models. Everything is erased with the player.

## Where it lives

- `src/spaces/worlds.ts` — the sizes, grounds, openness, limits, link shapes and checks both sides share.
- `server/spaces/worlds.ts` — `GET /api/spaces/worlds?list=`, `POST /api/spaces/worlds`, `/update`, `/delete`, `/cover`, `GET /api/spaces/world-cover/:id`. Stored in `spaces.worlds[id]`.
- `server/spaces/world.ts` — `target=world&id=` for the 3D screen, with world limits. `server/ws/spaces.ts` counts who is in each world and its visits.
- `src/app/features/worlds/` — the Worlds app. `src/app/features/spaces/WorldScreen.vue` — Invite, the cover after a save.
- `src/spaces/world/space.ts`, `engine.ts` — open ground (`terrain`), the sky, a wide fog, a sun that follows the walker, the snapshot.

## Settings

`spacesWorlds` (Admin → World → Settings; `POST /api/mod/spaces/switch { worlds: true }`), off by default; needs `spaces3d`. Uploading
models needs `spacesModels` and the R2 bucket; covers share that store.

## Analytics

`world_created { size, ground, open }`, `world_entered { mine, from }`, `world_shared { channel }` (src/telemetry/events.ts): words from
fixed lists only, never a name or an id. Sent only when telemetry is configured and the player accepted (SECURITY.md, "Telemetry").

## The plan, in phases

| # | Phase | What ships | Setting | Depends on | Size |
|---|---|---|---|---|---|
| 1 | **Worlds** (PR #46) | Make a world, browse and join open ones, links, covers, up to 16 together, heavy limits | `spacesWorlds` | spaces3d live | done |
| 2 | **A screen in a world** | The host puts on a YouTube video or music; everyone in the world watches or listens in time (play, pause, seek follow the host through the space socket; newcomers join at the right second). The frame is `youtube-nocookie.com`, allowed in `frame-src` only when the setting is on. | `spacesScreen` | 1; owner's yes to YouTube | 1 day |
| 3 | **Starter worlds and games** | At "Make a world": Empty, Hangout, Treasure hunt (hidden loose models, a score, a winner line), Race to the flag. A world can also hold one of the Lite games players already import (server/spaces/games.ts), so a Candy-Crush-like puzzle lives in a world. | `spacesWorlds` | 1 | 1 day |
| 3b | **Copy my real house** | Photos of a real house become a house in the game: a vision model reads them into a clean house description the game builds (default), or Meshy turns them into a detailed .glb; download to Blender, upload again; friends visit as today. Details: docs/HOUSE-FROM-PHOTOS.md. | `spacesHouseScan`, `spacesHouseScanModel` | spaces3d, a vision model in the router, `MESHY_API_KEY` on the Worker | 3 days |
| 4 | **The house on its street** | The 3D home shows the real street in front and the neighbours' houses either side, from the estate the player lives in, with the address on a sign and a "Go to the street" exit; the Houses hero says the address. The 3D view becomes the same world as the map and the street. | `spaces3d` | read-only estate data; no `src/street/**` edits | 2 days |
| 5 | **Polish and heavy detail** | Bigger uploads for worlds (50 MB, 500,000 triangles a model), the player's real character instead of the capsule, ground shaping (hills, water), skyboxes, day and night, better touch controls, a first-run tour of a world. | per feature | 1; the character body is the NPC programme's: coordinate | ongoing, 1 week for the first cut |
| 6 | **The social loop** | Friends-only worlds, co-builders, likes, a share card with the cover (growth share kind `world`), worlds on the feed, "a friend's world is live" notices, worlds of the week. | `spacesWorlds` | 1; feed phases (docs/SOCIAL-PLATFORM-PLAN.md) | 2 days |
| 7 | **Analytics on** | PostHog is built (src/telemetry, SECURITY.md "Telemetry") but off live: `GET /api/telemetry/config` answers `enabled: false`. Switch-on: `TELEMETRY_ENV=production`, `POSTHOG_KEY=phc_…`, optionally `POSTHOG_HOST` (EU) as Worker secrets; in PostHog turn on "Discard client IP data". Then three dashboards: activation funnel, invite funnel, worlds funnel (`world_created` → `world_entered` → `world_shared`). | — | the owner's PostHog key and region | 0.5 day after the key |

Order: 2, 3 and 7 first (a world with a screen and a game is the thing to market; analytics measures it), then 3b and 4 together (the real house on the real street), then 6, 5.

## Decisions for the owner

1. YouTube for the shared screen (free, no storage, a Google frame in the page under `youtube-nocookie.com`) or own uploads (storage and transcoding cost)?
2. PostHog: the project key, and US or EU cloud (`POSTHOG_HOST`). The key is public by design and goes on the Worker, never in the repository.
3. Heavier worlds: raise per-model limits for worlds only (50 MB, 500,000 triangles), or keep the model limits and raise only the per-world total?
4. Guests: may a guest (no account) make a world, or only sign-up players? Today a guest may; uploads already need a trusted account.
