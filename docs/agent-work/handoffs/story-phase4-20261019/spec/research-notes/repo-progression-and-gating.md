# Repo pass: missions, achievements, tales, city access (HEAD e40e95e84, read-only)

## Summary for a story-mode implementer
1. Daily/weekly missions reset and cannot be the unlock currency: 3 daily + 3 weekly dealt for the current city only; unfinished lapse; save keeps the latest grant per id; server event log capped at 128.
2. Permanent per-city progress that exists: two authored tales per city (`place-<city>-city-story`, `place-<city>-country-story`, 568 total), each ending in a keepsake receipt in `state.episodes.mementos`; city and country collections computed from receipts.
3. City status is global (open or not). No per-player lock. Four doors into a city: `estate.relocate` via `relocateBlock()` (src/game/systems/estate.ts), friend `joinOp` (src/game/systems/social.ts ~line 289), the homeward ticket (src/game/systems/homeward.ts), server new-life `settleCity()` (server/life-service.ts). `requireCharacterCity()` in server/character.ts enforces one character in one city.
4. Venues have no lock. Hooks: empty `COMING_SOON` table refused by `travelBlock()` with `coming_soon` (src/game/systems/travel.ts); `VenueDefinition.cities?`; opening hours.

## Missions
- `MissionDefinition` in src/types/content.ts (~1466-1505): cityId?, id, kind life|discovery|social, label, hint, count?, needs?, on: event|tag|paid|venue|activity.
- Global pool src/game/content/missions.ts (DAILY/WEEKLY, MISSION_REWARDS: daily N250 + 2 stars, weekly N1,000 + 5 stars, one reroll/day). World pool src/game/content/world-missions.ts (3 daily + 3 weekly per non-Lagos city from story seeds). Authored pool src/game/content/local-missions.ts: ids `${d|w}-local-${cityId}-tale-${life|discovery|social}`, 284 x 6 = 1,704.
- Engine src/game/systems/missions.ts: `missionCatalogues`, `dealMissions(state, scope, period, ctx)` seeded `missions|city|scope|period|seed`; `doable()` rejects def.cityId !== state.estate.city; `progress()` on activity.completed, travel.arrived (fresh = city venue not visited this week), shift.completed, npc.greeted, table.played, event.attended; `earnMissionReward()` emits mission.completed; `claimMission()` action missions.claim; state.missions {seed, day, daily, week, weekly, rerolls, sets, pending, grants, ...}.
- Server receipts: server/progression.ts maps mission.*, episode.*, achievement.earned into CharacterProgression.events (cap 128) stored in CityLifeRecord.progression (server/types.ts).
- Content provenance: story seeds src/game/content/world-progression.generated.ts WORLD_STORY_SEEDS (284 rows) built by scripts/city/build-progression-content.ts (`npm run progression:content`); tales src/game/content/local-tales/batch-01..08.ts (schema src/types/local-tales.ts: title, desire, chapters[4], approaches[3], dilemma, closing, keepsake), registry local-tales-source.ts, checked by scripts/city/check-local-tales.ts; episodes local-episodes.ts; runtime assets src/game/progression/assets.generated.ts built by scripts/city/build-progression-assets.ts (MAX_PROGRESSION_ASSET_BYTES 5,000,000; chunker splits at 4,500,000), loaded by asset-provider.ts in deploy/cloudflare-worker.ts.

## Achievements
- src/types/achievements.ts: ACHIEVEMENT_IDS wayfinder, familiar-face, first-shift, home-maker, table-regular, curious-mind; AchievementReceipt {id, version, earnedAt, cityId, origins}; state {progress, earned, pinned, displayed}.
- src/game/systems/achievements.ts progress(): travel.arrived (marks city:venue), friend.made, shift.completed, campus.job.completed, item.bought, table.played, skill.levelup; emits achievement.earned rewardId achievement:v1:<id>. Actions achievements.pin (<=3), achievements.display. Shown in PassportApp.vue, home plaque (src/scene/home-scene.ts), server/public-profile.ts.

## Tales engine
- src/types/episodes.ts: EpisodeDefinition {location{city,venue}, prerequisite, observations, intro, chapters[4], choices, challenges, finale.routes, memento{id, rewardId}}; EpisodeRun; EpisodeView.status locked|available|active|completed.
- src/game/systems/episodes.ts: actions episodes.intro/choose/resolve/finish/assist; listeners npc.interacted, activity.completed, campus.job.completed, table.played, event.attended -> observeProof(); first observation creates the run when prerequisiteMet(); each chapter requires atEpisodePlace (city, venue, spot); finish() writes mementos and emits episode.memento.granted, episode.completed. Country tale requires the city tale (local-episodes.ts).
- Visibility: progressionEpisodesForCity() in src/game/progression/provider.ts.
- Journeys: src/types/journeys.ts; src/game/content/journeys-source.ts JOURNEYS (`<cc>:<city>:local-tales` x284, `<cc>:country:local-tales` x243); src/game/journeys.ts journeyCollections(state) computes complete; served by GET /api/retention; JourneyCollection.vue.
- Keepsakes: src/game/mementos.ts homeMementos() (8 at home). Note src/game/systems/stories.ts is player-authored home scenes, not tales.
- Lazy: src/game/progression-gate.ts loadProgression(), systems/progression-register.ts; Vite manual chunk `progression-rules` (vite.config.ts ~line 389).

## City access
- src/game/cities/registry.ts: rules.status === 'open'; isCityId/isOpenCityId, playableCityIds(), loadCityRules/Content/Map/Network/Index, allCityLinks, linksFrom. RESERVED_CITIES in catalogue.ts.
- src/map3d/regions.ts cityAccess() (line ~131): soon | here | enter | preview (preview unreachable). regionEntry(), NIGERIA_STATES, WORLD_COUNTRIES; src/map3d/geo/info.ts renders open-city/enter-city/"Coming soon"; src/world-map.ts -> MapWorld.vue switchCity.
- relocateBlock(state, to, mode, ctx) codes in order: invalid_city, no_route, routeUnavailable (link status 'coming', src/game/cities/routeAvailability.ts), city_not_open, ride_debt, insufficient_funds. Arrival arriveInCity().
- server/routes/stages.ts is birthdays and home-city pin, not gating. server/city-content.ts prepareSessionCities/requireSessionCities (503 city_content_unavailable).
- City module: src/game/cities/<id>/index.ts (destination: createDestinationModule(FACTS, mapLoader, contentLoader) with facts.ts, content.ts, map.ts, places.ts); CityModule {id, rules, loadContent, loadMap, loadRoutes?} in src/types/content.ts ~1450; CityContent: venues, regulars, workplaces, housing, events, starterGoals, wishes, tablePlaces, thingsToDo, culture, sound, homePalette, localModes, business.
- Lazy chunks: city-index, city-network, city-<id>-rules/-content/-map/-scenes. Worker: src/game/cities/host-loaders.ts reads hashed JSON content assets.

## Venues
- venuesFor(city)/venueFor in src/game/cities/runtime.ts; travel view destinationCard() per venue + COMING_SOON. travelBlock() codes: invalid_travel, campus_lagos_only, coming_soon, already_here, travel_mode_unavailable, closed, insufficient_funds. No progress-based lock. Device fallbacks: src/scene/body/gate.ts bodyAllowed(), src/lightMode.ts, hasCityPack() 2D fallback, map-unavailable.ts.

## Start and per-city differences
- creatorModel.ts StepId who|look|spirit|home|ready; StepHome.vue picks state -> city -> LGA among cityOpen() cities (placesModel.ts -> isOpenCityId); cr.city in creatorState.ts; CreatorApp.vue playNow/startIn dispatch jaw:quick-start {city}; entryPlay.ts playFromEntry; DEFAULT_CITY_ID 'lagos'; onboarding.home {lga} settles.
- Differs by city: PPP price level outside Nigeria (scaleCityContent, docs/PRICE-LEVELS.md), venues/regulars/jobs/housing/events/goals/wishes/culture, authored missions + 2 tales, festivals per country (src/festivals/calendar.ts), ride banter (src/app/features/travel/ridePacks.ts: LAGOS, ACCRA, NAIROBI, SOUTH_AFRICA, GENERIC), civic terminology. Dictionary is global.

## Save schema rules
- LifeState (src/types/life.ts ~1115): no `mode` field. New top-level key must be in a system's stateKeys and rebuilt in sanitize(); never bump state.v (src/game/registry.ts ~96-107). Browser stand-ins for achievements/episodes/projects accept only the exact empty shape (src/game/progression-slices.ts freshReaders).
- Character-scoped outside state: CityLifeRecord.progression (follows travel), SessionRecord.homeCity; fileCharacter() moves the record on city change.

## Tests and budgets
- Tests: src/game/missions.test.ts, agent-missions.test.ts, server/house/missions.live.test.ts, src/game/cities/allCities.test.ts, cityJourney.test.ts, registry.test.ts, atlasRegistry.test.ts, per-city journey.test.ts/map.test.ts, estate.test.ts, homeward.test.ts, ogun/links.test.ts, server/two-cities.test.ts, src/map3d/geo/atlas.test.ts, map3d.test.ts, server/city-invite.test.ts, city-content.test.ts, new-player.test.ts, quick-start.test.ts, onboarding.test.ts, creatorModel.test.ts, src/app/openCities.test.ts, src/types/engine.test.ts. No dedicated tracked test for the episode/journey engine.
- Budgets: STARTUP_RAW 615,000 (614,987 measured, 13-byte margin), STARTUP_GZIP 223,000 (218,518), STARTUP_BROTLI 195,600, SCENE_HOST_GZIP 71,000 (70,718). MAX_CITY_CONTENT_ASSET_BYTES 5,000,000. Worker bundle < 3.5 MB, < 500 bytes catalogue per city. Prebuild: cities:catalogue --check, progression:check, progression:assets --check.
