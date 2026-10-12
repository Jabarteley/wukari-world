# Performance

What each screen and each server path is allowed to cost, how to measure it, what was found on 12 October 2026, what was fixed,
and what comes next and at what size. [CAPACITY.md](CAPACITY.md) holds the server's limits and the first capacity study;
[STORAGE.md](STORAGE.md) the per-entry storage that several of the next steps depend on; [MAP-ZOOM.md](MAP-ZOOM.md) the maps.

Every number here came from one computer (Apple M4 Pro), headless Chrome with the GPU on, loopback networking. They compare one
build with another and find what grows; they are not a promise about a particular phone, graphics card or production CPU.

## Budgets

### Screens

| Screen | Budget | Kept by |
| --- | --- | --- |
| Any scene, nothing touched | No frame is drawn (the battery rule), except where the picture moves by itself: a venue's crowd, a trip, the guide | `src/venue-world.test.ts`, `src/map3d/geo/atlas.test.ts` (battery rule), `scripts/perf/session.ts` ("canvases that drew") |
| Atlas: zoom, drag, hover | 60 frames a second, no frame over 20 ms after the first, no task over 50 ms; on the phone profile (CPU slowed four times) 30 a second and no task over 100 ms | `scripts/perf/atlas.ts` |
| Atlas: a country chosen on the map or in the list, a key in the search box | The card or the list is on screen within 100 ms of the press | `scripts/perf/atlas.ts` ("input to frame") |
| Atlas: what a level holds | World 16 draws, 24,000 triangles, 50,000 vertices; Africa 16 / 54,000 / 88,000; Nigeria 16 / 216,000 / 396,000 | `atlas.test.ts` "cost: each level stays within its budget" |
| Atlas: work per camera move | No geometry built; the wheel moves the camera once a frame; names placed at most once a frame and not at all when the view is the same | `atlas.test.ts` "cost: moving the camera…", "cost: the wheel…" |
| Atlas: what a card or a row asks of the host | The player's routes are read once a turn, never once per row | `atlas.test.ts` "cost: the host is asked…" |
| A map's canvas | The screen's own pixels up to 3840 by 2160 of them (`src/map3d/pixels.ts`), never under one per CSS pixel | `atlas.test.ts` "cost: a map canvas…" |
| Picking on the atlas | Through the grid: at most 14 regions in a cell, at most 8,400 vertices read by one pick | `atlas.test.ts` "cost: a pick reads…" |
| A scene that is closed | Its WebGL context is given back | `src/scene/context-release.test.ts`, `scripts/perf/session.ts` ("held after each round") |
| A walk down the street | The model layer is built again as near and far swap, with the same materials: no shader is compiled twice | `src/scene/models/scene-models.test.ts` |
| First download | 615,000 bytes raw, 223,000 gzip, 195,600 Brotli (never raised) | `npm run size:download` |

### Server paths

One request or frame should cost what it touches, not what the world holds. Where that is not yet true the table says what it grows
with. P: players stored (seen in the last six weeks). S: open sockets. R: residents of one city. C: open cities. A: agent keys.

| Path | Cost today | Budget | Kept by |
| --- | --- | --- | --- |
| `GET /api/life`, `POST /api/action` | One session row read and written; the stored life is bounded (ledger 60, notices 20, relationships 200). No longer anything per city: the action's city is a lookup, and the list of open cities is made once | Constant | `src/game/cities/registry.test.ts`, `src/types/protocol.test.ts` |
| `GET /api/world/pulse` | A count over the open sockets, kept for three seconds but made again for the first poll after anyone arrives or leaves; the answer names every city (C numbers) | O(S) per poll while people come and go: see "Next" | not yet |
| `GET /api/politics/overview` | One pass over the party members (it was one pass per party) plus the whole `politics` collection | O(members) once | `server/politics/rules.test.ts` |
| `GET /api/campus` | A pass over every stored session, now at most once in ten seconds per board family | O(P) once in 10 s | `server/routes/campus.ts` `SCAN_TTL_MS` |
| Rich list, Neighbours (first page) | A sort of the city's residents on each read; the pages after it are served from a 10-second index | O(R log R) per read: see "Next" | not yet |
| Anything that touches `social`, `civic`, `growth`, `politics`, `agents` | The whole collection is read, parsed and written back as text | O(P) or O(A) per request until the per-entry layout is switched on | see "Next" |
| One agent tool call at `POST /mcp` | Two or three store operations (the key, the tool, the audit line): about seven times a player's request even with per-entry storage | 6,000 a day per key, 200 new agents a day (`server/agents/policy.ts`) | `scripts/capacity.ts --agents` |
| Room traffic | By group (12 to 18 members), moves gathered eight times a second | O(group) | `server/room-groups-load.test.ts` |

## How to measure

Build first (`npm run build`). The browser scripts start the built app on a fresh data folder and one headless Chrome with the GPU
on; they say so loudly if the browser fell back to software drawing.

```
node --experimental-strip-types scripts/perf/atlas.ts   --out <folder> --label after        # the atlas table, five sizes, about four minutes
node --experimental-strip-types scripts/perf/atlas.ts   --out <folder> --label x --trace    # adds GPU time and saves DevTools traces
node --experimental-strip-types scripts/perf/atlas.ts   --out <folder> --label x --profile  # adds the functions that took the time
node --experimental-strip-types scripts/perf/atlas.ts   --table before.json after.json      # the two side by side
node --experimental-strip-types scripts/perf/session.ts --out <folder> --cycles 5           # first load, every heavy screen, what is held after each round
npm run capacity -- --host worker --steps 100,1000 --agents 200 --boards-ms 120000          # the load model, with AI agents and the lists read from everybody
```

A saved trace opens in the Performance panel of Chrome's DevTools ("Load profile").

## What was found

### The atlas (the report: zooming and choosing a country lag on a 3440 by 1440 window)

The cause was not the graphics. The atlas already draws each level as a dozen merged meshes (13 draws and 18,075 triangles for the
whole world), picks through a grid and draws only on demand; the GPU was idle at every size tried, twenty million pixels included.

Every choice of a country, every key typed into "Find in the world" and every level crossed during a zoom rebuilt the list of 241
countries, and each row asked the host for the player's routes. The host answered each time by working out the whole view of the
player's life. That is 241 life views for one click: about 140 ms on this desktop, 550 ms with the CPU slowed four times, and it
had grown with every city opened, because the life view lists a fare to each of them.

| Size | Action | Frames a second | Worst frame, ms | Longest task, ms | Input to next frame, worst, ms |
| --- | --- | --- | --- | --- | --- |
| 3440 by 1440, ratio 1 | zoom in and out, 5 s | 57 → 60 | 133 → 17 | 139 → 0 | |
| | choose 10 countries on the map | 51 → 60 | 117 → 17 | 138 → 0 | 140 → 17 |
| | type a name | 36 → 60 | 117 → 17 | 131 → 0 | 133 → 15 |
| 3440 by 1440, ratio 2 | zoom in and out, 5 s | 57 → 60 | 133 → 17 | 137 → 0 | |
| | choose 10 countries on the map | 51 → 60 | 117 → 17 | 137 → 0 | 139 → 17 |
| | type a name | 36 → 60 | 117 → 17 | 130 → 0 | 132 → 16 |
| 1920 by 1080, ratio 1 | zoom in and out, 5 s | 57 → 60 | 133 → 17 | 137 → 0 | |
| | choose 10 countries on the map | 51 → 60 | 117 → 17 | 138 → 0 | 140 → 17 |
| | type a name | 36 → 60 | 117 → 17 | 130 → 0 | 132 → 16 |
| 390 by 844, touch, CPU slowed four times | pinch in and out, 5 s | 46 → 60 | 550 → 17 | 561 → 0 | |
| | choose 10 countries on the map | 30 → 60 | 533 → 17 | 547 → 0 | 577 → 40 |
| | type a name | 13 → 60 | 533 → 17 | 548 → 0 | 554 → 18 |

Drag, hover and scrolling the list were at 60 before and after. Script time during a zoom fell from 93 to 32 ms a second.
Opening the atlas for the first time takes as long as before (about 1.3 s to the world drawn and still) with its longest task gone
from about 140 ms to under 50.

What changed (`src/map3d/geo/atlas.ts`, `src/app/scene/MapWorld.vue`):

- the host is asked once a turn; the list's rows are made without the routes and kept until what they say changes; choosing a row
  restyles two rows instead of writing 241;
- the map panel works the routes out once for each state the server sends;
- the wheel moves the camera once a frame; names are placed only when the view, the level or the selection changed, and a name's
  style is written only when it moved; the "Loading…" pill is written only when what it says changes;
- whether a region is open is no longer searched for in the city catalogue on every frame;
- the atlas and the city map draw at most 3840 by 2160 device pixels: an ultra-wide window on a double-density screen was 6880 by
  2880 (twenty million, each sampled four times by antialiasing) and is now 4451 by 1863. A screen of ordinary density is drawn at
  its own size as before. This one could not be shown to matter on the computer used here; it is there for weaker graphics cards.

### The rest of the client

From `scripts/perf/session.ts`: one settled player, five rounds through the venue, the city map, nine phone apps, the shop and home.

1. **A WebGL context was kept each time a place was left.** Closing a venue, home or street scene disposed the renderer but not its
   context: one more context, eight textures and a program were held after every round (3 contexts after settling in, 10 after
   five rounds). A browser gives a page about sixteen and then takes the oldest away, whichever screen it is drawing. Fixed: every
   scene that makes its renderer now gives the context back when it closes (the venue and home host, the campus, the street, the
   atlas and the guide; the city map, the avatar preview and the showcase room already did).
2. **Two things draw while nothing is touched, on purpose.** The guide in the corner draws 30 times a second for as long as it is on
   screen (a 124-pixel canvas, about 5 ms of script a second), and a venue with its crowd draws every frame (20 to 35 ms of script a
   second on this computer, so roughly a tenth of a slow phone's core). The city map, the shop, the phone and home (apart from the
   guide) draw nothing while still. Left as they are: both are the picture moving. See "Next".
3. **Walking the street recompiled its shaders every few steps.** The street's buildings swap between near and far models as the
   camera moves, and each swap threw the layer's materials away and made them again, which makes the browser compile and link the
   same shader programs again: 490 ms of 3 s spent waiting for the link, 200 to 245 ms of script a second, frames of 33 to 117 ms.
   After the fix: 40 ms of script a second, every frame under 17 ms. It also kept every discarded material in the list of lit windows for as long as the street was open. Fixed: the layer keeps its
   materials until it is closed (`src/scene/models/scene-models.ts`).
4. **Every other screen held 60 frames a second** on this computer, still, dragged and zoomed. Two first-time costs stood out: the first zoom
   of the city map (one task of 260 ms) and the first opening of the Politics app (270 ms); neither repeats.
5. **The phone's lists** (messages, people, contacts, rich list, neighbours, statement) open in under 20 ms with no long task; they are
   already read a page at a time (`docs/LISTS.md`).
6. **First load on the phone profile** (CPU slowed four times, 1.6 Mbit/s): first paint 0.9 s, the entry page usable at 6.0 s, 75 ms of
   blocking time, 48 requests, 869 kB of which 641 kB is script.
7. **Nothing else grew much**: after the fixes the page held 3 WebGL contexts, about 3,480 DOM nodes and 392 listeners after every round. The heap went from 37.1 to 39.3 MB over four rounds (about half a megabyte a round), which is worth a longer run.

### The server

From reading each hot path and from `npm run capacity` (the Worker host under the local Workers runtime, 40 s a step, busy players:
an action every 30 s, a step every 10 s, plus one of the everybody-lists every two minutes each).

| Run | Players | AI agents | Action p50 / p95 / p99, ms | Agent call p50 / p95 / p99, ms | Host CPU, cores |
| --- | --- | --- | --- | --- | --- |
| Worker | 100 | 0 | 3 / 5 / 10 | | 0.04 |
| Worker | 1,000 | 0 | 3 / 45 / 216 | | 0.47 |
| Worker | 100 | 200 at the daily ceiling | 3 / 12 / 15 | 11 / 21 / 31 | 0.17 |
| Worker | 1,000 | 200 | 11 / 97 / 172 | 31 / 127 / 172 | 0.72 |
| Worker | 100 | 1,000, whole collections (as deployed) | 4,261 / 8,560 / 9,093 | 4,022 / 8,860 / 9,166 | 0.93, saturated |
| Worker | 1,000 | 1,000, whole collections | 6,149 / 14,162 / 17,850 | 6,266 / 14,184 / 16,442 | 1.01, saturated |
| Worker | 100 | 1,000, per-entry layout | 3 / 22 / 29 | 10 / 32 / 44 | 0.52 |
| Worker | 1,000 | 1,000, per-entry layout | 11 / 117 / 205 | 20 / 121 / 218 | 0.77 |
| Node | 1,000 | 0 | 180 / 569 / 788 | | 0.76 |

Players mostly at rest (an action every three minutes, a step a minute, 30% in public venues), Worker host: 2,000 connected gave
action p50 / p95 / p99 of 80 / 384 / 687 ms with the host at 0.92 of a core; 3,000 saturated it (5.6 s median, requests dropped).
So the one object bends between 1,000 busy and 2,000 resting players, as CAPACITY.md found. Ten thousand connected at once could
not even be set up on the local Worker host within 25 minutes: it is far past what one object takes, and the answer to it is the
last row of "Next", not a faster request.

Ranked by how soon each stops the one thread:

1. **An agent swarm, with whole-collection storage.** Every agent call reads the `agents` collection whole to find its key and writes
   it back whole to record the call. With 200 agents (224 kB) a call costs about 9 ms of CPU; with 1,000 (1.1 MB) the host is
   saturated by the agents alone (69 calls a second) and every player waits seconds. At 200 new agents a day that is five days. The
   per-entry layout removes the growth (the same swarm then costs half a core); nothing cheaper does.
2. **Whole collections in general.** `social`, `civic`, `growth` and `politics` cost a request in proportion to everyone stored
   (CAPACITY.md: a look at the phone is 7 ms with 1.2 MB of `social`, 18 ms with 2.6 MB).
3. **An agent call costs about seven player requests even per entry** (three store operations, an audit row each): 1,000 agents at
   the ceiling are half a core and 6 to 18 million rows a day.
4. **`GET /api/campus` read and parsed every stored session on each read.** Fixed with a ten-second shared scan.
5. **The pulse recounts every socket for the first poll after anyone arrives or leaves**, so with steady arrivals it is a recount per poll. Not changed: two tests hold it to the same number as the header, the Neighbours list and the hunt chip within one request sequence, and a floor on recounts broke that.
6. **Per city, on every action:** the list of open cities was rebuilt (a filter and a quadratic de-duplication) three times per
   action and once per stored life per request. Fixed: made once.
7. **The politics overview counted members once per party.** Fixed: one pass.
8. **Rich list and Neighbours, first page:** a sort of every resident of the city per read (the later pages have a 10-second index).
9. **No index on `sessions.expires_at` or `chat_receipts.at`** (Worker): the sweep for expired sessions reads the table's rows once a
   minute and on each new session; counting sessions lists every key.
10. **Every ten seconds, several passes over all sockets** (the heartbeat, the pulse, the room sweep, telemetry): O(S), S capped at 4,000.
11. **The Node host** writes its whole data file on every action (180 ms at 1,000 players, 8.8 MB) and clones and freezes whole
    collections on reads; it is the development host and is not what production runs.

Already bounded, and left alone: the stored life; presence and people (by room group); chat (200 messages a conversation, paged);
room fan-out; the client's polls (the life once a minute or once a second during an action, the pulse every 30 s, all stopped while
the tab is hidden); the rate-limit tables; the sockets' saved state.

Storage: a busy connected player wrote 540 rows an hour (about 113 to 141 at rest, CAPACITY.md); a stored life is about 6 kB and does
not grow without bound. An agent call wrote 1.1 to 3 rows.

## Next, and when

| What | When it becomes necessary | Design |
| --- | --- | --- |
| Switch the stored collections to the per-entry layout (`STORE_LAYOUT=entries`) | **Before the agents collection passes about 300 keys that play at their ceiling, or `social` passes about 2.5 MB (about 2,000 players stored)**: whichever comes first. With 200 new agents allowed a day the first can be days away | Already built and measured (STORAGE.md): shadow, compare, switch, with a way back. `politics`, `pulse` and `campus` need entries in `KEYED_SPECS` (`server/keyed.ts`) to benefit |
| A rate for agents as a whole | With per-entry storage, about 1,500 agents at the ceiling fill the one thread by themselves | A server-wide budget of agent calls a second beside the per-key day (refuse with `retry_after`), and the audit line written lazily in batches instead of one durable write per call |
| Indexes on `sessions(expires_at)` and `chat_receipts(at)`; a `COUNT(*)` for the session count | About 10,000 stored sessions (the default cap): the sweep is then 10,000 rows read a minute and on every new visitor | A schema migration to version 3 in `deploy/sqlite-schema.ts`, the two indexes added to `assertCurrent`; left for a planned release because the store has no way back |
| Rich list and Neighbours first page from the 10-second index | About 20,000 residents in one city (two sorts of 20,000 per read, per reader) | `richListView` reads `boardIndexes`; the reader's own row and rank are added from their own record so they are never stale |
| The pulse recounts at most a few times a second | About 4,000 sockets with steady arrivals: a recount is then a pass over 4,000 sockets for each of 130 polls a second | Count incrementally on `room-changed` (add and remove one player) instead of walking the sockets, so every reader still sees one number |
| The pulse answer names only cities with someone in them | About 300 cities: the answer is then 3 kB to every page every 30 s | Sparse `cities`; the client already treats a missing city as zero |
| One socket per page; one object per city | Above about 3,000 players connected at once (CAPACITY.md) | CAPACITY.md, "One object per city, in outline" |
| The venue crowd and the guide at a lower rate when nothing else moves | When phones report heat or battery drain: both keep a GPU awake | Draw the crowd at 30 a second while the camera is still; let the guide rest between gestures as it already does under reduced motion |
| The driving practice scene gives its context back too | With the others fixed it is one context per lesson opened; it matters after about a dozen lessons in one sitting | One line in `drivingScene.ts`, made together with the geometry evidence that pins that file by hash |
| The first zoom of the city map (260 ms once) | If it is noticed | Build the closer level of detail in an idle callback after the map opens |

## Not measured

- No real phone and no graphics card other than this computer's. A mid-range desktop GPU at 3440 by 1440 was not available: the
  pixel budget is the only change made for it, and it is untested there.
- The city map of a rebuilt foreign city and the 3D shop interior: the scripted player did not reach them (travel between cities
  needs more money than a new player has). The shop row is the boutique's fitting room.
- Voices and other players in a venue: the session is one player.
- A fifteen-minute session: the run is eleven minutes (five rounds), inside the time limit set for one browser run.
- Like-for-like server numbers before today's fixes without agents: the earlier study in CAPACITY.md is the reference.
