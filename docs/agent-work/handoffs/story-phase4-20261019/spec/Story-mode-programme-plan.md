# Allworld Story Mode programme: implementation plan

Written 17 October 2026. Repo facts were read from the owner's Desktop checkout at `main` = `e40e95e840c764dbb37b00f62cedfe875db404a8` (read-only). Web facts are dated and sourced in `research_notes/story-mode/web-research.md` (copied from the research pass). **[O]** = observed in code or a primary source, **[I]** = inferred or recommended.

The owner's ask: a story mode in which every map and location starts locked; the player progresses city by city and venue by venue; each player's experience differs by where they start because missions and games are unique per city; all 200+ cities get a unique, realistic scene; and NPC conversation is cheap or local AI, unique per place, with varied game styles per city.

---

## 0. What the research changed about the ask

Four findings decide the design. Each is the first-principles answer to "what is the smallest change with the largest effect".

1. **Daily and weekly missions cannot be the unlock currency.** They are dealt three at a time for the current city only, lapse on reset, and the save keeps just the latest grant per id; the server event log is capped at 128 entries [O]. The permanent per-city progress that already exists is the two authored tales per city (568 of them, every one of the 284 cities), each ending in a keepsake receipt in `state.episodes.mementos`, plus the city and country collections computed from those receipts [O]. **Story mode is built on tales and collections, with missions as the chapter's side quests that count toward a persistent per-city tally.**

2. **"Unique scene per city" must not mean a bespoke GLB per venue.** A Lagos Broad Street runtime module is ~1 MB near + ~0.8 MB far with ~7 MB of decoded textures per tier [O]. At 12 venues × 284 cities that is multi-gigabytes against phones on ₦431/GB data [O]. Every scene today is a TypeScript `build()` function over a shared procedural prop vocabulary of ~45 props (`src/scene/props.ts`), and 244 foreign cities all use the same ~22 procedural scenes with only the sign text and lighting differing [O]. **The unique-scene unit is a data recipe (JSON, ~2–6 KB per venue) that a new generic scene builder renders from the existing prop vocabulary plus a small regional kit of instanced GLB props and one low-poly hero landmark per city.** An LLM writes recipes from city facts; a validator and the existing per-venue budget tests (87,000 triangles, 60 draw calls, reachability, run for every venue of every city in `allCities.test.ts` and `city-scenes.test.ts`) gate them [O]. No research tool outputs clean stylised low-poly directly; the LLM-writes-layout-JSON pattern (SceneCraft, Holodeck) is the one that works, and it is what the repo's parametric layer already does in miniature [O/I].

3. **Local (on-device) LLM dialogue is not viable for this audience yet.** A 4-bit 1B model is ~0.7 GB; Tecno and Infinix make a third of Nigerian devices and entry phones ship with 2–4 GB RAM; ~23 % of Nigerian Android devices are below the WebGPU floor [O]. Server-side a cached NPC line costs US$0.00005–0.00011 (≈ US$50–110 per million lines) [O]. **Cheapest and most unique is pre-generated: a bank of 60–150 lines per NPC per city generated once offline, filtered at build time, shipped in the city's content asset (~20–40 KB per city), with the live model only for free-text questions through the existing router.** Small open models score poorly in Yoruba, Hausa and Igbo (IrokoBench, AfriMMLU) [O], so native-language flavour comes from a human-written per-region phrasebook, not model generation.

4. **Four doors into a city bypass any single gate.** `relocateBlock()`, the friend `join` operation, the homeward ticket and server new-life creation each check city status independently [O]. **One pure function `storyBlock()` must sit in all four.**

---

## 0b. Owner clarifications (17 October 2026) — these override anything below that conflicts

**Two modes, switchable at any time.** Free roam is the game as it exists today and what every current player sees. Game mode (story mode) is a per-character switch, not a new-life choice. A player switches in the Phone (Passport → Story, and the Home chip) and may switch back. Consequences for the design:

- `state.story.mode` is `'free' | 'story'`, default `'free'` for every existing save; one action `story.mode { mode }` flips it. Switching is free and instant, no cooldown.
- **Ladder events are tallied in both modes; locks apply only in story mode.** Tale mementos, collection completion, mission completions per city and distinct venue visits are recorded whatever the mode, so a free-roam veteran who switches finds the cities they already finished at chapter 4 and their neighbours unlocked. `chapterOf()` is computed from receipts the player already holds (`state.episodes.mementos`, `journeyCollections`, the story tally), never from a separate counter that could drift.
- On the first switch to story the start city is the city the character is in (`state.estate.city`); it is added to `unlocked`; everything else follows the ladder. Switching to free roam opens everything but keeps the ladder state; switching back restores the locks from the same state.
- In free roam the map may show story badges and chapter progress as information; nothing is gated.
- `storyBlock()` and `venueOpen()` return null immediately when `mode !== 'story'`, so free roam stays byte-for-byte the game it is today.

**Everything new is lazy.** Scene recipes, regional kits, hero landmarks and talk banks are fetched per city when the player enters it, through the existing per-city lazy chunks and content assets (`city-<id>-content`, `CITY_PARTS`, `loadCityScenes`). Nothing rides in startup, engine or the scene host. When idle, `src/app/state/idlePreload.ts` `preloadNext` prefetches the packs of the cities `linksFrom(current)` says are next, held back on save-data or 2G as it already is. A cold first venue in a new city is one kit (cached per region) + the city's recipes + one hero; measure and record it.

**Friends can help in story mode.** Hard chapter challenges are designed for two. The existing `episodes.assist` records help from an AI agent only and never satisfies a proof, and tale challenges are single-answer dilemmas, so co-op is a new thin layer, `src/story/coop.ts` + `server/story/coop.ts`:

- **Call a friend.** On a chapter challenge card the player taps "Call a friend"; the server offers it to friends (and AI-played friends, with the mark) through the existing invite path (`POST /api/social/visit/invite` for homes; a new `POST /api/story/help { episodeId, chapter }` for venues) and a push. Friends only; 3 calls a day per player; 30-minute window as invites have.
- **The helper comes to the venue.** A helper may enter the host's city and venue for the help session even when that city is locked for the helper (`joinOp` gets a `helper` pass checked by `storyBlock`, so the helper's own ladder is untouched and nothing unlocks for them). They stand beside the player (the existing room/visit presence, voice circle of 8).
- **Help kinds**, each verifiable by the server: `second-answer` (a hard dilemma shows two prompts; the helper answers the second and both must be right), `two-seat` (a 2-seat cartridge or a 2-player table game at the venue, host and helper versus the house bot), `errand` (the helper completes a mission step in the same city that counts toward the host's tally once). Each tale's chapter 3 "Roots" challenge gets a co-op variant generated by the talk/scene factories from the tale's dilemma; chapters 1–2 stay solo-able so nobody is blocked by having no friends online; chapter 3 always has a solo path with a longer condition (two extra missions).
- **Rewards.** Both get closeness (the friendship system's existing counters), the helper gets a "Helped in <city>" keepsake (`HomeMemento`, 8 shown at home) and a line in the city gist; the host's chapter advances. Game naira only, within `MISSION_REWARDS` caps.
- **Safety.** Minors may help and be helped; chat rules unchanged; the helper pass expires with the session and is revoked by the host like a visit.
- Tests: a locked-city helper pass that never unlocks the helper's ladder; `second-answer` needs both answers; 3-a-day cap; the solo path always exists for every city (add to the all-cities loop).

---

## 1. Ground rules (from AGENT.md, AGENTS.md, AGENT-COORDINATION.md, budgets.ts)

- Never work in `/Users/anthonyakpan/Desktop/JoinAllworld`. Clone outside Desktop and iCloud; one branch per phase from `origin/main`. Do not stop anything on ports 5173, 5174, 5180.
- Register a record from `docs/agent-work/TEMPLATE.md` before editing; checkpoint per milestone.
- Builds on CI (`gh workflow run CI -R kromate/joinallworld --ref <branch> -f full_checks=false`); typecheck locally with `NODE_OPTIONS=--max-old-space-size=3584 npm run typecheck`. Never `git stash`.
- Budgets in `src/budgets.ts` are never raised. Startup raw has a 13-byte margin at the last measurement and scene-host gzip ~300 bytes [O]. Nothing new may ride in the startup, engine or scene-host chunks. New game-side logic under `src/game/` lands in the engine chunk by the Vite rule, so story-mode rules go in the lazy `progression-rules` chunk (the pattern `src/game/progression-gate.ts` + `progression-register.ts` already use) [O].
- Stored data gains optional fields only. A new top-level life slice must be declared in a system's `stateKeys`, rebuilt in `sanitize()`, never bump `state.v`, and the browser stand-ins in `src/game/progression-slices.ts` must accept it [O].
- Every model call goes through `routerOf(ctx).ask()`; US$2 a day hard cap; `carriesPlayerWords: true` for player text. Every AI line passes `agentWords()`; the AI mark is never dropped. Game naira only.
- AGPL-3.0-or-later. OSM-derived data is ODbL (attribution in the game view and credits; shipped per-city footprint dumps would be a Derivative Database, so keep raw extracts internal and ship baked scenes) [O]. Overture Places is CDLA-Permissive 2.0 [O]. Wikidata is CC0 [O].
- No AI attribution in commits, PRs, comments or docs (owner's instruction).

### Coordination

- Thread `68bda5b3-e6ac-401f-82bf-abe80602235b` (`docs/agent-work/world-npc-programme-20261016.md`, active, editing the Desktop checkout, uncommitted) owns `src/scene/**` perf files, `src/street/**`, `server/street/**`, `scripts/street/**`, `public/assets/street/**`, `server/house/**`, `server/models/**`, `src/app/features/calls/**`, `src/audio/**`, `NOTICE.md` attribution lines. Its uncommitted `server/house/acts.ts` and `talk-stream.ts` are the face-to-face Talk path; `npcTalkOn` is off by default [O].
- The AI Spaces programme (`reports/AI spaces programme plan.md`) may be running in parallel; it owns `src/spaces/**`, `server/spaces/**`, `skills/**`, `src/arena/lite/**`.
- This programme therefore owns: `src/story/**` (new), `src/game/systems/story.ts` (new, lazy), `src/scene/recipe/**` (new), `scripts/scene-factory/**` (new), `scripts/talk-factory/**` (new), `server/story/**` (new), `src/app/features/story/**` (new), per-city generated files `src/game/cities/<id>/scene-recipes.generated.ts` and `talk.generated.ts`, docs `docs/STORY-MODE.md`, `docs/SCENE-FACTORY.md`, `docs/TALK-BANKS.md`. Shared one-hunk files: `src/game/systems/estate.ts`, `social.ts`, `homeward.ts`, `travel.ts`, `server/life-service.ts`, `src/map3d/regions.ts`, `src/scene/venue-scenes.ts` (one branch in `createEntry`), `src/scene/city-scenes.ts`, `src/scene/city-scenes.test.ts` (chunk-list assertion), `vite.config.ts`, `server/routes/index.ts`, `docs/REFERENCE.md`. House-agent integration of the talk banks waits for the NPC thread; until then banks plug into `src/game/chatter/lines.ts`-style client banks and a new `server/story/talk.ts` adapter that calls existing `server/house` exports without editing them.

---

## 2. Anchors in the repo

| System | Where [O] | Reused as |
| --- | --- | --- |
| Tales (episodes) | `src/types/episodes.ts`, `src/game/systems/episodes.ts`, `src/game/content/local-episodes.ts` (`place-<city>-city-story`, `place-<city>-country-story`), `local-tales/batch-01..08.ts` (284 cities, 4 chapters, 3 approaches, dilemma, keepsake) | The chapter spine of each city |
| Collections | `src/game/content/journeys-source.ts` (`<cc>:<city>:local-tales`, `<cc>:country:local-tales`), `src/game/journeys.ts` `journeyCollections()` | "City complete" and "country complete" signals |
| Missions | `src/game/systems/missions.ts` (`dealMissions`, `progress`, `earnMissionReward`, events `mission.completed`), `local-missions.ts` (1,704 authored, 6 per city), `world-missions.ts` | Chapter side quests; completions tallied persistently by the new story system |
| Achievements | `src/types/achievements.ts` (6 ids, character-scoped), `systems/achievements.ts` | Story-mode badges per city chapter (new ids, additive) |
| City access | `src/map3d/regions.ts` `cityAccess()` (`soon/here/enter/preview`), `src/game/cities/registry.ts` (`isOpenCityId`, `allCityLinks`, `linksFrom`), `src/game/systems/estate.ts` `relocateBlock()`, `social.ts` `joinOp`, `homeward.ts`, `server/life-service.ts` `settleCity()` | The four doors |
| Venue access | `src/game/systems/travel.ts` `travelBlock()` (codes incl. `coming_soon` from an empty `COMING_SOON` table), `VenueDefinition.cities?` | Venue locks: new code `story_locked` |
| Start | `src/app/features/start/creatorModel.ts` (`home` step, `cityOpen()`), `DEFAULT_CITY_ID = 'lagos'` | Mode choice and start city |
| Scenes | `src/scene/types.ts` (`SceneDef`, `SceneLayout`, `Landmark`, `Batch`), `venue-scenes.ts` `createEntry()` (resolves `citySceneDef` → `DEFS[kind]` → generic; `decorateParametricVenue` when `options.design`), `props.ts` (45 procedural props), `parametric-venue.ts` (`ParametricVenueDesign`: palette, roof, sign, ≤2 props, landmark), `city-scenes.ts` (`CITY_PARTS`, lazy parts), `nigeria-runtime-scenes.ts` (GLB runtime contract: `request`, `reservation`, navigation) | The recipe builder is a new `SceneDef` that interprets data |
| City data | `src/game/cities/<id>/facts.ts`, `places.ts` (OSM/Overture slots), `geometry.ts`, `terrain.ts`; `scripts/geo/build-destination-detail.ts`; `scripts/city/build-city.ts` (formula cities, `spec.ts` with `scene: {roof, sign, props, landmark}`); content assets `dist/assets/cities/<id>.<sha>.json` (median 66 KB, cap 5 MB) | Inputs to the scene factory; recipes ship in the content asset |
| Regional kit precedent | `src/scene/street/assets/` (128 GLBs, 7.8 MB, near/far in 3 palettes), `street-kit.ts`, `models/gltf-source.ts` (meshopt), `models/scene-models.ts` (merge by atlas, budgets, stand-ins); branch `origin/claude/viral-assets` (`scripts/assets/blender/common.py` headless bpy build + `bake_atlas`, `prepare.ts` gltfpack, caps 1,500 tris/prop, 1024 WebP) | Kit pipeline to merge and reuse |
| NPC talk | `server/house/` (cast per city only for Lagos; others get 2 country-generic agents; `lines.ts` ~100 lines in `both(pidgin, plain)` banks; `talk.ts` `intentOf` regex router; `memory.ts`), residents (`server/residents/generate.ts`, `persona.ts` `TONGUES` 27 entries, one `naija` tongue), `src/game/chatter/lines.ts` (`ChatterLang` en/pcm/ha/yo/ig/efi), `src/game/cities/formula/cast.ts` `PAIRS` templates, `src/moments/cities.ts` (8 cities) | Talk banks plug into these deterministic hooks at zero runtime cost |
| Router | `server/models/catalog.ts` (`gpt-5.6-luna` 0.10/0.50 per M; free lists; `resident` purpose free-first), `router.ts` (US$2 cap, 200 req / 5 ¢ per player per day) | Live free-text replies, purpose `city-talk` |

---

## 3. Phase 1: Story mode core (locks, chapters, progression)

**Goal.** A player chooses **Story** or **Open world** at the "home" step. In Story, only the start city is open and inside it only the chapter's venues. Finishing a city's chapter unlocks its neighbours on the link graph. Progress is permanent, per character, and visible on the map as a fog that lifts.

### 3.1 State

New lazy system `src/game/systems/story.ts` registered through `progression-register.ts` (so it rides in the `progression-rules` chunk, not the engine) with slice `state.story`:

```ts
interface StoryState {
  mode: 'open' | 'story'            // chosen once at start; 'open' for every existing save (sanitize default)
  start?: CityId                    // where the story began
  cities: Record<CityId, { chapter: 0|1|2|3|4; missions: number; venues: string[]; doneAt?: number }>
  unlocked: CityId[]                // cities the player may enter
}
```

`sanitize()` returns `{ mode: 'open', cities: {}, unlocked: [] }` for any old or malformed value; `freshReaders` in `src/game/progression-slices.ts` gets the exact empty shape. Nothing else in the save changes.

### 3.2 The chapter ladder (per city, same shape everywhere, different content everywhere)

| Chapter | Unlock condition (all persistent) | What opens |
| --- | --- | --- |
| 0 Arrive | enter the city | home, the host's venue of the city tale (`WORLD_STORY_SEEDS[city].host`), the market or meal slot |
| 1 Settle | city tale chapters 1–2 done (`EpisodeRun` progress) | work slot, worship slot, transit |
| 2 Belong | city tale finished (memento `place-<city>-city-story`), 3 authored local missions completed (tally) | recreation, clinic, community, the city's **signature game** (3.5) |
| 3 Roots | country tale finished (`place-<city>-country-story`), 6 missions, 6 distinct venues visited | every remaining venue, the city's festival events |
| 4 Complete | city collection complete (`journeyCollections`) | neighbouring cities (`linksFrom(city)` with status open) are added to `unlocked`; a city badge achievement |

Venue slots use the destination builder's slot kinds (airport, transit, meal, community, clinic, recreation, market, worship, polling, government) and, for authored Nigerian cities, a hand map in `src/story/slots.ts` from venue id to slot. `src/story/ladder.ts` is pure: `chapterOf(state, city)`, `venueOpen(state, city, venueId)`, `storyBlock(state, toCity): 'story_locked' | null`, `nextStep(state, city)` (one sentence for the HUD: "Finish Mama Nkechi's story to open the clinic").

### 3.3 The four doors and the venue gate

- `estate.ts` `relocateBlock()`: after `city_not_open`, `if (storyBlock(state, to)) return 'story_locked'`.
- `social.ts` `joinOp`: same check; a friend in a locked city is "Not yet in your story".
- `homeward.ts`: the ticket may only target an unlocked city.
- `server/life-service.ts` `settleCity()`: a new life in story mode may start in any open city (that is the start choice); subsequent `fileCharacter()` moves are already behind `relocate`.
- `travel.ts` `travelBlock()`: new code `story_locked` before `closed`; `destinationCard()` carries `locked: { chapter, why }` so the Travel app draws the lock and the sentence.
- `src/map3d/regions.ts` `cityAccess()`: new value `'locked'`; `info.ts` renders "Locked: finish Kano" tags; the atlas draws unlocked cities bright, linked-but-locked cities dim with a padlock, the rest as today.

### 3.4 Events that advance the ladder

`story.ts` listens to `episode.completed`, `episode.chapter` (add if missing: emit from `episodes.ts` `resolve()` on each chapter), `mission.completed` (tally only when `def.cityId === city`), `travel.arrived` (distinct venues), `journey.collection.complete` (emit from `journeys.ts` projection or compute on read). On chapter 4 it pushes neighbours into `unlocked`, emits `story.city.completed` and awards achievement `story-<cc>` (one per country, additive ids in `ACHIEVEMENTS`).

### 3.5 Different experience by start city: the city signature

Each city gets a **signature**: one game style featured in its chapter 2, chosen from systems that exist: `haggle` (market haggling with a house seller), `tables` (chess/Weave/Oro at the city's table place), `arena-race` / `arena-fight` / `arena-football` (a cartridge at a venue kind the city has), `business` (open a stall), `festival` (attend the next event), `politics` (vote or run), `clan` (join the city clan). Assigned in `src/story/signatures.generated.ts` by the scene factory from facts (a football city, a trade city, a university city) and reviewable by hand. The chapter-2 mission "Play the city's game" uses it. Nigerian authored cities get hand-picked signatures (Lagos hustle: danfo race; Kano: haggle; Calabar: festival; Ibadan: tables; Port Harcourt: business; Abuja: politics).

### 3.6 UI

- Start: `StepHome.vue` gains the mode choice (two cards, Story recommended for new players) and, in Story, any open city as the start (the fog starts there).
- HUD: a lazy `StoryChip.vue` under the Home chip: current chapter, `nextStep` sentence, progress dots.
- Map: fog and padlocks as above; tapping a locked city shows the chapter needed.
- Passport: the city badges.
- Open world is unchanged for every existing player.

### 3.7 Tests and acceptance

- `src/story/ladder.test.ts`: every chapter transition from recorded events; `storyBlock` for linked, unlinked, open, closed; neighbours unlock exactly once.
- `src/game/estate.test.ts`, `homeward.test.ts`, `social` join tests, `travel.test.ts`: the `story_locked` code in each door; open mode unaffected.
- `src/game/cities/allCities.test.ts` addition: for every city, chapter 0 opens at least home + host venue + one meal; the ladder reaches chapter 4 with the city's own tales and missions (simulate the events); `linksFrom` yields at least one open neighbour or the city is a terminal leaf (list leaves in the record).
- Budgets unchanged (`size:download`), typecheck, CI.
- Browser: start in Kano in Story; only three venues open; finish the Kano city tale on a phone; the clinic opens; the map shows Kaduna and Katsina dim with padlocks; finish the country tale and collection; Kaduna unlocks; travel there.

**Done when:** two players who switch to story mode in Lagos and Nairobi see different venues, tales, missions and signature games for their first hour, neither can reach the other's city until their ladders say so, a friend can be called to a chapter-3 challenge and help from a locked city without unlocking it for themselves, and switching back to free roam restores today's game exactly. Live behind `storyMode` (admin setting; the switch hidden when off).

---

## 4. Phase 2: The scene factory (a unique scene for every venue of every city)

**Goal.** Every venue of all 284 cities renders a scene that is recognisably its own: layout, palette, signage, props, a regional prop kit and the city's hero landmark, within 15,000 scenery triangles, 13 scenery meshes, 60 draw calls, 4 lights, and a per-city scene pack under a new budget. Generated by a pipeline, reviewed by contact sheets, regenerated by one command.

### 4.1 The recipe contract

**New** `src/scene/recipe/recipe.ts` (pure):

```ts
interface SceneRecipeV1 {
  schema: 'allworld-scene'; version: 1
  kind: SceneKind                  // one of KINDS, drives mood/camera/walk defaults
  mood?: 'outdoor'|'indoor'|'club'
  palette: { ground: Colour; wall: Colour; roof: Colour; accent: Colour; trim: Colour }
  footprint: { w: number; d: number; indoor: boolean }           // metres, within kind bounds
  props: Array<{ id: PropId | KitPropId; x: number; z: number; ry?: number; s?: number; colour?: Colour }>   // ≤ 40
  signs: Array<{ text: string; x: number; z: number; ry: number; style: 'board'|'painted'|'neon'|'cloth' }>  // ≤ 4, text ≤ 24 chars, filtered
  landmark?: { id: HeroId; x: number; z: number; ry: number }    // the city's hero, at most one per scene, usually the park/square
  spots: Array<{ key: string; x: number; z: number; ry: number; act?: ActId }>   // must cover the venue's spots
  crowd: Array<[number, number, number?]>                          // ≤ 12
  light?: { time?: 'auto'; lamps?: Array<{x;z;colour}> }           // ≤ 4 lights
  sky?: { haze: number; tint: Colour }
  notes?: string                                                   // never shipped
}
```

`PropId` is the existing `props.ts` vocabulary (45) plus **kit props** (4.3). `validateRecipe(recipe, venue)`: bounds, no footprint overlap (uses the existing footprint recorder), every venue spot resolved, a walkable path from entrance to every spot (the existing walk grid), estimated triangles (sum of prop costs from a table + walls) ≤ 15,000, meshes ≤ 13, lights ≤ 4, sign text through the text filter. `repairRecipe()` nudges overlapping props and drops the cheapest extras first.

**New** `src/scene/recipe/build.ts`: one `SceneDef` `RECIPE` whose `build(batch, ctx)` reads `ctx.venue.scene.recipe` and draws it with `props.ts` helpers and kit instances, returning a `SceneLayout`. Hook: in `venue-scenes.ts` `createEntry()`, before the `DEFS[kind]` lookup, `if (options.recipe) def = RECIPE`. Per-city recipes ship as `scene.recipe` on each venue in the city's content (`scene-recipes.generated.ts` merged by the city module's `loadContent`), so they ride the existing lazy `city-<id>-content` chunk / content asset and never the scene host.

### 4.2 Inputs per city (all already in the repo or free)

- `facts.ts` (identity), `places.ts` (named real venues from OSM/Overture with kinds), `terrain.ts` (water, roads), `local-tales` (the city's story, people, foods), `WORLD_STORY_SEEDS` (host, activities), the climate band from latitude, Wikidata (CC0) for: landmark name and type, dominant building materials and colours (where present), local foods, languages.
- A **region style sheet** `scripts/scene-factory/regions.json` (human-written, ~14 regions: Niger Delta, Yoruba south-west, Sahel north, Igbo south-east, Gulf of Guinea coast, Sahel francophone, East Africa highlands, Swahili coast, Southern Africa, Maghreb, Western Europe, East Asia, South Asia, Americas, Oceania): roof forms, wall colours, sign styles, street furniture, trees, typical props, forbidden anachronisms.

### 4.3 The regional kit and the hero landmark

- **Kit**: per region, ~20 instanced props the procedural vocabulary lacks (keke, danfo, matatu, tuk-tuk, boda, zinc-roof kiosk, Sahel mud wall, baobab, acacia, palm, mosque minaret, church tower, market umbrella, cooking pot stand, cola crate stack, suya grill, plantain stand, water tank, generator, billboard frame). Built headless with `bpy` (5.2.2 on PyPI, macOS arm64 wheels [O]) by extending `scripts/assets/blender/common.py` from `origin/claude/viral-assets` (merge that branch's `scripts/assets/**` first; it is the owner's own pipeline with `bake_atlas` and gltfpack). Caps: 1,500 triangles per prop, one 1K WebP atlas per kit, meshopt, **≤ 300 KB Brotli per kit**, lazy per city (`CITY_PARTS` gains the kit id). Source: procedural primitives in bpy (CC0 Kenney City Kit pieces may seed shapes; licence line in NOTICE.md). Fourteen kits ≈ 4 MB total, shared by all cities in a region.
- **Hero landmark**: one per city, ≤ 4,000 triangles, ≤ 60 KB, placed in the park/square recipe. Three sources in order: (a) procedural from a Wikidata type (a gate, a statue plinth, a mosque, a cathedral, a tower, a bridge, a rock, a waterfront) through bpy templates; (b) TRELLIS v1 (MIT) image-to-3D on a rented 4090 (≈ US$0.01 per asset) from a CC0/CC BY Commons photo, decimated and atlased; (c) hand-modelled for the 9 authored Nigerian cities. **Freedom-of-panorama rule**: Nigeria, Ghana and France have no commercial FoP; use (b) only for monuments, natural features, markets and pre-1950s buildings there; never for modern copyrighted architecture; attribute the source photo [O]. `scripts/scene-factory/heroes.json` records the choice and the licence per city.

### 4.4 The pipeline (`scripts/scene-factory/`)

1. `facts.ts <city>` → one JSON "brief" per city (identity, region, venues with kinds and names, foods, landmark, climate, palette hints).
2. `draft.ts <city>` → for each venue, one LLM call (through the same router code path as the server, purpose `scene-draft`, a paid or free model, no player words) producing a `SceneRecipeV1`. Prompt: the contract, the prop vocabulary with costs, the region sheet, the brief, two good examples of the same kind, hard rules (no text beyond 24 chars, no brand names, no modern logos). ~1.5k tokens out. 284 × ~11 venues ≈ 3,100 recipes ≈ US$20–60 total at `gpt-5.6-luna` prices [O].
3. `validate.ts` → `validateRecipe` + `repairRecipe`; a recipe that still fails is re-drafted once with the problems appended; a second failure falls back to the parametric design (today's behaviour) and is listed for a human.
4. `render.ts` → builds every recipe in Node with the real `createEntry()` (the tests already do this) and records triangles, meshes, draw calls, bytes.
5. `sheet.ts` → headless Chromium (`CHROME_PATH` as the capture tools use) renders a 6-up contact sheet per city to `docs/research/scene-factory/<date>/<city>.png`; a Haiku-class vision pass flags duplicates and anachronisms ("a snow-capped roof in Calabar"); humans skim the flags.
6. `write.ts` → `src/game/cities/<id>/scene-recipes.generated.ts` with a hash; `npm run scenes:check` fails CI when a recipe no longer validates or the generated file is stale against its brief hash.

Budget additions in `src/budgets.ts` (new entries, not raised ones): `CITY_SCENE_RECIPES_BYTES` 120,000 raw per city, `SCENE_KIT_BROTLI` 300,000, `HERO_BROTLI` 60,000; patterns in `scripts/download-budget.ts` `ASSET_PATTERNS`.

### 4.5 What becomes of the authored cities

Lagos, Abuja, Kano, Ibadan, Port Harcourt and the four Ogun cities keep their hand-written variants and GLB runtime modules; the factory only fills venues that have no authored variant. `city-scenes.test.ts`'s exact chunk-list assertion becomes a pattern (`/^city-[a-z-]+-scenes(-[ab])?$/` plus kit chunks).

### 4.6 Tests and acceptance

- `src/scene/recipe/recipe.test.ts`: 30 malformed recipes rejected; overlap repaired; unreachable spot rejected; estimated vs measured triangles within 15 %.
- `allCities.test.ts` already loops every venue with a 12-crowd at 87,000 / 60; it now exercises the recipes. Add: no two venues of one city share a recipe hash; no two cities share a park recipe hash.
- `scenes.test.ts`: the `RECIPE` def builds for every kind with a full crowd, ≤ 4 lights, disposes cleanly, no timers.
- Download: a foreign city's first venue scene costs ≤ kit (300 KB, cached per region) + recipes (≤ 120 KB raw, ~20 KB Brotli) + hero (≤ 60 KB); measured and recorded.
- Browser on a 390 px phone tier: walk into the Accra market, the Nairobi park, the Tokyo transit, the Paris meal venue; screenshots; frame time on a real Android if available.

**Done when:** `npm run scenes:build` regenerates every non-authored city, CI's per-venue budget tests pass, the contact sheets are reviewed, and the live game shows a different Accra from Nairobi.

---

## 5. Phase 3: Talk banks and cheap live dialogue (unique NPC conversation per city)

**Goal.** Every regular, house agent and resident speaks in lines written for their city and venue; free-text questions get a live answer from a cheap model that knows the city; native-language flavour comes from human phrasebooks; cost at runtime is near zero for the common case.

### 5.1 Talk banks (offline, shipped)

`scripts/talk-factory/`: for each city, for each regular (formula `PAIRS` roles and Lagos's 48) and each house-agent role, generate a bank:

```ts
interface TalkBankV1 { city: CityId; npc: string; voice: 'plain'|'pidgin'|'formal'|'jokey'; lang: 'en'|'pcm'; greet: string[]; ambient: string[]; about: Record<'market'|'food'|'weather'|'work'|'city'|'festival'|'directions', string[]>; bye: string[]; phrases: Array<{ lang: 'yo'|'ha'|'ig'|'efi'|'sw'|'fr'|'ja'|…; text: string; gloss: string }> }
```

- 60–150 lines per NPC, from the city brief, the local tales, the venue's real name and the region phrasebook. Generated once (≈ 284 cities × 10 NPCs × 100 lines ≈ 300k lines ≈ US$30–60), every line passed through `agentWords({toMinor:true})` and the text filter **at build time**, numbers stripped unless from facts, repeats removed.
- Native-language `phrases` are copied from `scripts/talk-factory/phrasebooks/<lang>.json`, human-written (the existing `yo/ha/ig/efi` greetings in `src/moments/cities.ts` and `TONGUES` seed it; mark beta until a native speaker reviews), never model-generated [O: small models are unreliable in these languages].
- Shipped in `src/game/cities/<id>/talk.generated.ts` (≈ 20–40 KB per city, inside the content asset's 5 MB cap), hashed, checked by `npm run talk:check`.

### 5.2 Runtime wiring (zero model calls for the common case)

- Regulars (client chatter, `src/game/chatter/lines.ts`, `formula/cast.ts` quotes): read the bank first, fall back to the template.
- House agents: the generic country cast gets a **city cast** (names, roles, voice) from `talk.generated.ts` through a new `server/story/cast.ts` adapter that `castOf(cityId)` consults when the NPC thread's owner accepts the one-line hook; until then the adapter is unit-tested and the hook is a documented pending hunk. `lines.ts` banks are consulted per city before the generic banks (same adapter).
- Residents: `generateResident` keeps its rules; its `TONGUES` gains the phrasebooks per region.
- `intentOf` (regex) routes greet/bye/hours/prices/directions to the bank: no model.

### 5.3 Live answers (the model, cheap)

- New router purpose `city-talk` (added in `server/models/catalog.ts` once that folder is free; until then use `agent-talk`): list = the cheapest paid model with caching first (`gpt-5.6-luna` at 0.10/0.50; nano-class at 0.05/0.40 if the gateway lists it), free models for lines without player words.
- The prompt is the NPC's bank header (voice, 10 sample lines), the city brief (≈ 400 tokens, stable so it caches), the venue facts and the last 4 lines. ≤ 140 output tokens. Cost ≈ US$0.00005–0.0001 per line [O]; 20,000 live lines a day ≈ US$1–2, within the cap. Per-player caps as today.
- Every reply: `cleanReply`, `agentWords`, the AI mark, `ai-intercept` first.

### 5.4 On-device option (deferred, documented)

WebLLM/transformers.js with a 0.5–1B model is feasible only on desktop and high-end phones with WebGPU and costs 0.7–2 GB of data; shipped as an opt-in "Offline talk" toggle in a later phase, never default [O].

### 5.5 Tests and acceptance

- `scripts/talk-factory/bank.test.ts`: every shipped line passes `agentWords` and the text filter; no digits except facts; no duplicates across an NPC; phrases only from phrasebooks.
- `server/story/cast.test.ts`: city cast resolves for all 284 cities; falls back to the country cast.
- Browser: greet a market seller in Kano, Accra and Tokyo; the three greet differently, name the real market, and a Hausa greeting appears in Kano with its gloss.

**Done when:** no two cities' sellers share a greeting line, live free-text replies cost under US$0.0001 each in the router ledger, and the model is never called for greetings, hours or directions.

---

## 6. Phase 4: Realism pass on the scene (sun, textures, atlases) and the street tie-in

The NPC thread's lighting and shader-painted facade work on the street host is the right precedent: lighting and painted materials change the look more than geometry [O]. For venue scenes: a sun with soft shadows on the phone tier where frame time allows, a tone-mapped sky from the recipe's `sky`, and canvas-painted material variation (grime, bands, window rows) through one shader patch on the kit material. No new textures to download. Coordinate the shared `lighting.ts` hunk with the NPC thread's owner. Then: when a city has street packs (Lagos, Ibadan today), its chapter-3 venues are entered from the mapped street; others keep the venue panel.

---

## 7. Order, effort, cost

| Phase | Depends on | New code | One-off cost | Calendar |
| --- | --- | --- | --- | --- |
| 1 Story core | nothing | `src/story/` ~600 lines, hunks in 4 doors + travel + map, UI ~500 | none | 2 weeks |
| 2 Scene factory | 1 (signatures); `viral-assets` merge for bpy | recipe contract + builder ~900, factory scripts ~1,200, bpy kit scripts ~600 | LLM drafts US$20–60; hero GPU ≈ US$100; Blender automation 2–3 days | 3–4 weeks |
| 3 Talk banks | 1; NPC thread for house-agent hooks | factory ~700, adapters ~300 | LLM US$30–60 | 2 weeks |
| 4 Realism + street | 2; NPC thread lighting | ~300 | none | 1 week |

Runtime model spend stays under the existing US$2 daily cap by design; the banks make the common case free.

## 8. Risks

- **Recipe quality.** An LLM will produce samey scenes unless the brief and examples are distinct; the contact-sheet duplicate check and the "no shared recipe hash" test are the guards. Expect 10–15 % of venues to need a human nudge in the first run.
- **Bytes.** Kits are shared per region, recipes are tiny, heroes are capped; still, measure a cold first-venue load on a phone before ship.
- **Licences.** ODbL attribution in-game (already credited for Natural Earth and geoBoundaries); OSM-derived recipes are produced works; no Google 3D tiles; FoP for heroes; Hunyuan3D is not used (EU/UK/Korea exclusion) [O].
- **Existing players.** Free roam is the default for every existing save; story mode is a reversible per-character switch (0b). Because the ladder reads receipts the player already holds, no conversion step is needed.
- **Ownership collisions.** Four doors and the scene host are shared files; one hunk each, recorded, and rebased on `origin/main` before each PR.

## 9. Open questions for the owner (answer in the record if not now)

1. Should new players be offered the story switch on their first day, or only find it in the Passport? (Recommend a one-time card after the first tale.)
2. Which cities may be start cities in story mode: all open cities, or Nigeria first?
3. May the factory spend ~US$100–200 on LLM drafts and GPU time for heroes? (Record the budget line.)
4. Who reviews native-language phrasebooks before "beta" is removed?
