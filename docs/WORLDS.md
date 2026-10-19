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

## Next

1. **A screen in a world** (`spacesScreen`): the host puts on a video or music (a YouTube link) and everyone in the world watches or
   listens together, in time. The frame is `youtube-nocookie.com`, allowed in `frame-src` only for that page.
2. **Starter worlds**: a treasure hunt (hidden loose models, a score, a winner line) and a race to the flag, as script starters.
3. **The house on its street**: the 3D home shows the neighbours' houses either side and the street in front, from the estate the
   player really lives in, so the 3D view is the same world as the map and the street.
4. Friends-only worlds; co-builders; likes.
