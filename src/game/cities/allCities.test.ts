import assert from 'node:assert/strict'
import test from 'node:test'
import { SCENE_TRIANGLES, SCENE_DRAW_CALLS } from '../../budgets.ts'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { DEFAULT_LOOK } from '../content/traits.ts'
import { advanceLife, createLife, dispatch, viewLife } from '../../life.ts'
import { emit } from '../registry.ts'
import { reliefActivities } from '../relief.ts'
import { businessVenue, isBusinessType, productCost, productLabel } from '../business-model.ts'
import { BUSINESS_PRODUCTS } from '../content/business.ts'
import { linksFrom, playableCityIds, cityModule, loadCityContent } from './registry.ts'
import { linksPriced } from '../systems/estate.ts'
import { publicArrivalVenue } from './runtime.ts'
import { assertCityModuleContract } from './cityContractTest.test.ts'
import type { CityModule, MissionDefinition } from '../../types/content.ts'
import type { EpisodeDefinition, EpisodeMementoReceipt, EpisodeRun } from '../../types/episodes.ts'
import type { ActionBody } from '../../types/actions.ts'
import type { LifeContext, LifeContextInit, LifeState, WorldCityId } from '../../types/life.ts'
import { assertNoOpenCityGeometryOverlap } from '../../../scripts/city/geometry.ts'
import { createKit } from '../../scene/kit.ts'
import { loadCityScenes } from '../../scene/city-scenes.ts'
import { buildVenueScene, MAX_CROWD } from '../../scene/venue-scenes.ts'
import { sceneVenue } from '../../venue-world.ts'
import { progressionEpisodeById, progressionSnapshot } from '../progression/provider.ts'
import { missionCatalogues } from '../systems/missions.ts'
import { chapterOf, cityUnlocked } from '../../story/ladder.ts'
import { localTalesJourneyId, proofVenues, venueChapter } from '../../story/slots.ts'
import { awaitNativeSceneGeometry, installNativeGeometryEnvironment, preloadNativeGeometry } from '../../testing/nativeGeometry.test-fixture.ts'

const cityIds = [...playableCityIds()]
const root = fileURLToPath(new URL('../../../', import.meta.url))
const coldReloadProbe = join(root, 'scripts/city/cold-reload-probe.ts')
const modules = (): CityModule[] => cityIds.map((id) => {
  const module = cityModule(id)
  assert.ok(module, `${id}: playable registry entry has a module`)
  return module
})

await Promise.all(cityIds.map((id) => loadCityContent(id)))

test('every generated city passes its offline source and output check', () => {
  const authored = new Set(['lagos', 'ibadan', 'abeokuta', 'ota', 'ijebu-ode', 'port-harcourt', 'abuja', 'kano'])
  const generated: string[] = []
  const foreign: string[] = []
  for (const id of cityIds) {
    const directory = join(root, 'src/game/cities', id)
    const module = cityModule(id)
    assert.ok(module, `${id}: source check has registered city rules`)
    if (module.rules.country.id !== 'ng' && module.rules.country.id !== 'nigeria') {
      for (const source of ['facts.ts', 'geometry.ts']) assert.ok(existsSync(join(directory, source)), `${id}: foreign city requires ${source}`)
      foreign.push(id)
      continue
    }
    if (existsSync(join(directory, 'recipe.ts'))) {
      assert.ok(id === 'sagamu' || authored.has(id), `${id}: new cities must use a facts-only spec, not a legacy recipe`)
    }
    if (!existsSync(join(directory, 'spec.ts')) && !existsSync(join(directory, 'recipe.ts'))) {
      assert.ok(authored.has(id), `${id}: a new city requires a source spec`)
      continue
    }
    generated.push(id)
  }
  // The batch check rebuilds every generated city from its pinned source: about 50 seconds on a fast laptop and over a minute on a hosted runner, so 60 s was a coin toss.
  if (generated.length) execFileSync(process.execPath, ['--experimental-strip-types', join(root, 'scripts/city/build-city.ts'), '--check-batch', ...generated], {
    cwd: root, encoding: 'utf8', timeout: 300_000,
  })
  if (foreign.length) {
    const python = realpathSync(process.env.WORLD_TEST_PYTHON ?? (existsSync('/usr/bin/python3') ? '/usr/bin/python3' : execFileSync('which', ['python3'], { encoding: 'utf8' }).trim()))
    const checked = ['build-playable-africa.py', 'build-playable-africa-wave2.py'].flatMap(script => {
      const output = execFileSync(python, [join(root, 'scripts/world', script), '--check'], { cwd: root, encoding: 'utf8', timeout: 60_000 })
      return output.trim().split('\n').map(line => {
        const row: unknown = JSON.parse(line)
        assert.ok(row && typeof row === 'object' && 'city' in row && typeof row.city === 'string' && 'status' in row && row.status === 'pinned-assets-match', 'foreign source checker confirms each pinned city')
        return row.city
      })
    })
    const remaining = foreign.filter(id => !checked.includes(id))
    // The rollout checker refuses more than 53 city IDs per call (its own input bound), so check in batches.
    for (let start = 0; start < remaining.length; start += 50) {
      const output = execFileSync(python, [join(root, 'scripts/world/check-playable-africa-rollout.py'), ...remaining.slice(start, start + 50)], {
        cwd: root, encoding: 'utf8', timeout: 60_000,
      })
      for (const line of output.trim().split('\n')) {
        const row: unknown = JSON.parse(line)
        assert.ok(row && typeof row === 'object' && 'city' in row && typeof row.city === 'string' && 'status' in row && row.status === 'pinned-assets-match', 'rollout source checker confirms each pinned city')
        checked.push(row.city)
      }
    }
    assert.deepEqual(checked.sort(), foreign.sort(), 'the source checker covers exactly every registered foreign city')
  }
})

test('every playable city is covered by the shared city contracts', async () => {
  for (const module of modules()) await assertCityModuleContract(module)
})

const completedStoryRun = (episode: EpisodeDefinition, at: number): EpisodeRun => ({
  id: episode.id, version: 1, chapter: 4, startedAt: at, lastSeenAt: at, choice: 'help', outcomeTags: ['local-welcome'],
  receipts: {
    1: { chapter: 1, completedAt: at, source: 'local-conversation', reference: episode.id, origin: 'human' },
    2: { chapter: 2, completedAt: at, source: 'authored-challenge', reference: episode.id, origin: 'human' },
    3: { chapter: 3, completedAt: at, source: 'authored-challenge', reference: episode.id, origin: 'human' },
    4: { chapter: 4, completedAt: at, source: 'quiet-support', reference: episode.id, origin: 'human' },
  },
  observations: [], assistance: [], completedAt: at, mementoGranted: true,
})

const storyMemento = (episode: EpisodeDefinition, at: number): EpisodeMementoReceipt => ({
  id: episode.memento.id, version: 1, episodeId: episode.id, episodeVersion: 1, grantedAt: at, origins: ['human'], rewardId: episode.memento.rewardId,
})

test('every playable city is covered by the shared city contracts: Story chapters are reachable', async (t) => {
  const terminal: string[] = []
  const snapshot = progressionSnapshot()
  for (const module of modules()) {
    const cityId = module.id as WorldCityId
    const content = await loadCityContent(cityId)
    const byId = new Map(content.venues.map(row => [row.id, row.definition]))
    const home = byId.get('home')
    assert.ok(home && venueChapter(cityId, home, content) === 0, `${cityId}: home is open at chapter 0`)
    for (const venueId of proofVenues(cityId)) {
      const venue = byId.get(venueId)
      assert.ok(venue, `${cityId}.${venueId}: tale proof venue exists`)
      assert.equal(venueChapter(cityId, venue, content), 0, `${cityId}.${venueId}: tale proof venue is open at chapter 0`)
    }
    const welcome = content.venues.find(row => row.kind === 'market') ?? content.venues.find(row => row.definition.category === 'food')
    assert.ok(welcome, `${cityId}: market or food welcome venue exists`)
    assert.equal(venueChapter(cityId, welcome.definition, content), 0, `${cityId}.${welcome.id}: welcome venue is open at chapter 0`)

    const cityEpisode = progressionEpisodeById(`place-${cityId}-city-story`)
    const countryEpisode = progressionEpisodeById(`place-${cityId}-country-story`)
    const journeyId = localTalesJourneyId(cityId)
    const journey = snapshot.journeys.find(row => row.id === journeyId)
    assert.ok(cityEpisode && countryEpisode && journeyId && journey, `${cityId}: city tale, country tale and local collection exist`)
    assert.deepEqual(new Set(journey.members.map(member => member.id)), new Set([cityEpisode.memento.id, countryEpisode.memento.id]), `${cityId}: local collection uses its two canonical tale receipts`)

    const authored = [...missionCatalogues.byId.values()].filter((mission): mission is MissionDefinition => mission.cityId === cityId && missionCatalogues.authoredIds.has(mission.id))
    assert.equal(authored.length, 6, `${cityId}: six authored local mission definitions support the base ladder`)
    const occurrences = [...authored, authored[0]!, authored[1]!].map((mission, index) => {
      const scope = missionCatalogues.scopeIds.daily.has(mission.id) ? 'daily' as const : 'weekly' as const
      const period = index < authored.length ? 1 : 2
      return { mission, scope, period, rewardId: `mission:v1:${cityId}:${scope}:${period}:${mission.id}` }
    })
    assert.equal(new Set(occurrences.map(row => row.rewardId)).size, 8, `${cityId}: solo Roots path has two additional authored mission occurrences`)

    const visits = content.venues.filter(row => row.id !== 'home').slice(0, 6)
    assert.equal(visits.length, 6, `${cityId}: six distinct public venues can satisfy Belong`)
    const life = settle(module)
    const state = life.state
    const at = state.t
    const ctx: LifeContext = { now: at, cityId, rng: () => 0, storyMode: true, executionOrigin: 'human' }
    state.story.trackingSince = at
    state.story.cities[cityId] = { missions: [], venues: [] }
    for (const entry of [...state.missions.daily, ...state.missions.weekly]) entry.n = Number.MAX_SAFE_INTEGER
    assert.equal(chapterOf(state, cityId), 0, `${cityId}: starts at Arrive`)

    state.episodes.runs[cityEpisode.id] = completedStoryRun(cityEpisode, at)
    assert.equal(chapterOf(state, cityId), 1, `${cityId}: first two city-tale receipts reach Settle`)

    state.episodes.mementos[cityEpisode.memento.id] = storyMemento(cityEpisode, at)
    for (const row of occurrences.slice(0, 3)) emit(state, 'mission.completed', { rewardId: row.rewardId, id: row.mission.id, scope: row.scope, period: row.period, cityId, earnedOrigin: 'human', completedAt: at }, ctx)
    assert.equal(chapterOf(state, cityId), 2, `${cityId}: city tale and three local missions reach Belong`)

    state.episodes.runs[countryEpisode.id] = completedStoryRun(countryEpisode, at)
    state.episodes.mementos[countryEpisode.memento.id] = storyMemento(countryEpisode, at)
    for (const row of occurrences.slice(3, 6)) emit(state, 'mission.completed', { rewardId: row.rewardId, id: row.mission.id, scope: row.scope, period: row.period, cityId, earnedOrigin: 'human', completedAt: at }, ctx)
    for (const [index, venue] of visits.entries()) emit(state, 'travel.arrived', { venue: venue.id, from: index ? visits[index - 1]!.id : 'home', mode: 'trek' }, ctx)
    assert.equal(chapterOf(state, cityId), 3, `${cityId}: country tale, collection, six missions and six venues reach Roots`)

    for (const row of occurrences.slice(6)) emit(state, 'mission.completed', { rewardId: row.rewardId, id: row.mission.id, scope: row.scope, period: row.period, cityId, earnedOrigin: 'human', completedAt: at }, ctx)
    assert.equal(chapterOf(state, cityId), 4, `${cityId}: two extra authored mission occurrences complete the solo path`)

    state.story.mode = 'story'
    state.story.start = cityId
    const neighbours = [...new Set(linksFrom(cityId).filter(link => (link.status ?? 'open') === 'open').map(link => link.to))]
    if (!neighbours.length) terminal.push(cityId)
    else for (const neighbour of neighbours) assert.equal(cityUnlocked(state, neighbour), true, `${cityId}: completion opens connected ${neighbour}`)
  }
  t.diagnostic(`Story terminal cities: ${terminal.length ? terminal.join(', ') : 'none'}`)
})

test('open city footprints do not overlap beyond the unchanged legacy boundary seams', async () => {
  const footprints: Array<Parameters<typeof assertNoOpenCityGeometryOverlap>[0][number]> = []
  for (const module of modules()) {
    const geometry = await (await module.loadMap()).loadGeometry()
    footprints.push({ cityId: module.id, polygons: geometry.playArea.map(polygon => polygon.map(ring => ring.map(([lon, lat]): [number, number] => [lon, lat]))) })
  }
  // The two sub-grid seams are measured in MAP-GEOMETRY.md. Their exact polygons may not drift.
  const legacySeams: Readonly<Record<string, string>> = {
    'ijebu-ode|lagos': '0e4317cbbf0c95104cb4a9d022ebe5c042f7a577d1134d16d1df047b195a0546',
    'lagos|sagamu': 'c7b9b1d8134571b43b78f679abcf5f6e2a1020a8c0e313927fdda7c07438ad0d',
  }
  for (let left = 0; left < footprints.length; left += 1) {
    for (let right = left + 1; right < footprints.length; right += 1) {
      const pair = [footprints[left]!, footprints[right]!].sort((a, b) => a.cityId.localeCompare(b.cityId))
      const baseline = legacySeams[pair.map(city => city.cityId).join('|')]
      if (baseline) {
        assert.equal(createHash('sha256').update(JSON.stringify(pair.map(city => city.polygons))).digest('hex'), baseline, 'a legacy boundary seam changed')
      } else assertNoOpenCityGeometryOverlap(pair)
    }
  }
})

test('every public venue uses a scene within the shared rendering budget', async () => {
  const restoreNativeGeometryEnvironment = installNativeGeometryEnvironment()
  const kit = createKit()
  const crowd = Array.from({ length: MAX_CROWD }, (_, index) => ({ id: `visitor-${index}`, name: 'Visitor', kind: 'player' }))
  try {
    await preloadNativeGeometry()
    for (const module of modules()) {
      await loadCityScenes(module.id)
      for (const venue of (await loadCityContent(module.id)).venues) {
        // Homes and the walkable campus have dedicated renderers and their own budget tests.
        if (venue.kind === 'home' || venue.kind === 'unilag') continue
        const definition = sceneVenue(venue.id, module.id)
        assert.ok(definition, `${module.id}.${venue.id}: scene definition`)
        const scene = buildVenueScene(kit, definition, module.id)
        try {
          scene.setCrowd(crowd)
          const readiness = await awaitNativeSceneGeometry(scene, `${module.id}.${venue.id}`)
          assert.deepEqual(readiness.errors, [], `${module.id}.${venue.id}: native geometry loads without errors`)
          assert.equal(readiness.pendingCharacters, 0, `${module.id}.${venue.id}: native geometry is ready`)
          assert.ok(readiness.nativeCharacters > 0, `${module.id}.${venue.id}: native character geometry exists`)
          assert.ok(readiness.skinnedMeshes > 0, `${module.id}.${venue.id}: native player has skinned geometry`)
          const stats = scene.stats()
          assert.ok(stats.triangles <= SCENE_TRIANGLES.value, `${module.id}.${venue.id}: ${stats.triangles} triangles`)
          assert.ok(stats.drawCalls <= SCENE_DRAW_CALLS.value, `${module.id}.${venue.id}: ${stats.drawCalls} draw calls`)
        } finally { scene.dispose() }
      }
    }
  } finally { kit.dispose(); restoreNativeGeometryEnvironment() }
})

test('every playable city exposes market, table and arrival relief contracts', async () => {
  for (const module of modules()) {
    const content = await loadCityContent(module.id)
    assert.ok(content.venues.some((venue) => venue.kind === 'market'), `${module.id}: market venue`)
    assert.ok(content.tablePlaces.length > 0, `${module.id}: table place`)
    if (content.business) {
      assert.equal(productLabel({ id: 'local-plate', label: 'Plate of the day' }, module.id), content.business.plate)
      for (const [venueId, market] of Object.entries(content.business.markets)) {
        assert.ok(businessVenue(module.id, venueId), `${module.id}.${venueId}: business market exists`)
        assert.ok(market.known.every(isBusinessType), `${module.id}.${venueId}: valid specialties`)
      }
      for (const productId of content.business.localProductIds) {
        const product = BUSINESS_PRODUCTS.get(productId)
        assert.ok(product, `${module.id}.${productId}: shared product exists`)
        assert.ok(productCost(product, module.id) < productCost(product, 'unregistered'), `${module.id}.${productId}: local supplier discount applies`)
      }
    }
    const arrival = publicArrivalVenue(module.id)
    assert.ok(arrival.id !== 'home', `${module.id}: arrival is public`)
    const relief = reliefActivities(module.id)
    assert.equal(relief.length, 3, `${module.id}: three arrival relief activities`)
    assert.ok(relief.every((activity) => activity.where.venue === arrival.id), `${module.id}: relief is at arrival venue`)
    assert.ok(relief.every((activity) => Object.hasOwn(arrival.spots, activity.where.spot)), `${module.id}: relief spot exists`)
  }
})

function settle(module: CityModule) {
  let now = Date.UTC(2026, 0, 5, 9)
  const context = (state?: LifeState): LifeContextInit => ({ cityId: state?.estate.city ?? module.id, now, ...(state ? {} : { isNew: true, quickStart: true }), seed: `all-cities-${module.id}` })
  const state = createLife(null, context())
  const run = (body: ActionBody) => dispatch(state, body, context(state))
  assert.equal(run({ type: 'onboarding.quick-start', payload: { look: DEFAULT_LOOK } }).ok, true, `${module.id}: quick start`)
  assert.equal(run({ type: 'onboarding.traits', payload: { traits: ['clean-pikin', 'musical'] } }).ok, true, `${module.id}: traits`)
  assert.equal(run({ type: 'onboarding.dream', payload: { dream: 'afrobeats-star' } }).ok, true, `${module.id}: dream`)
  assert.equal(run({ type: 'onboarding.lottery', payload: {} }).ok, true, `${module.id}: lottery`)
  assert.equal(run({ type: 'onboarding.home', payload: { lga: module.rules.units[0]!.id, via: 'manual' } }).code, 'life_started', `${module.id}: settle`)
  return { state, now: () => now, setNow: (value: number) => { now = value }, run }
}

function finishTrip(state: LifeState, now: number, setNow: (value: number) => void) {
  const seconds = state.activeAction?.remaining
  assert.equal(typeof seconds, 'number', 'travel starts a timed action')
  setNow(now + (seconds! + 1) * 1000)
  assert.equal(advanceLife(state, seconds! + 1, { cityId: state.estate.city, now: now + (seconds! + 1) * 1000 }).ok, true)
}

test('each playable city can settle, work, eat, rest, travel to three cities, return and reload', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'allworld-all-cities-reload-'))
  try { for (const module of modules()) {
    const content = await loadCityContent(module.id)
    const life = settle(module)
    const { state, run } = life
    const contextNow = () => life.now()
    const workplace = content.workplaces.find((item) => item.careerId === 'community-helper') ?? content.workplaces[0]!
    assert.equal(run({ type: 'apply-job', payload: { id: workplace.definition.id } }).ok, true, `${module.id}: work application`)
    if (state.location !== workplace.definition.workplace.venue) {
      assert.equal(run({ type: 'travel', payload: { id: workplace.definition.workplace.venue, mode: 'trek' } }).code, 'started', `${module.id}: travel to work`)
      finishTrip(state, contextNow(), life.setNow)
    }
    assert.equal(run({ type: 'spot', payload: { id: workplace.definition.workplace.spot } }).ok, true, `${module.id}: work spot`)
    const shift = viewLife(state, { cityId: state.estate.city, now: contextNow() }).career.shift
    assert.ok(shift, `${module.id}: current shift`)
    assert.equal(run({ type: 'activity', payload: { id: shift.id } }).code, 'started', `${module.id}: work shift`)
    if (state.activeAction) finishTrip(state, contextNow(), life.setNow)

    const home = content.venues.find((venue) => venue.id === 'home')!.definition
    const food = Object.values(home.spots).flatMap((spot) => spot.activities).find((activity) => activity.tags?.includes('food'))!
    const rest = Object.values(home.spots).flatMap((spot) => spot.activities).find((activity) => activity.tags?.includes('sleep'))!
    assert.ok(food && rest, `${module.id}: home food and rest`)
    assert.equal(run({ type: 'travel', payload: { id: 'home', mode: 'trek' } }).code, 'started', `${module.id}: travel home`)
    finishTrip(state, contextNow(), life.setNow)
    state.needs.hunger = 10
    assert.equal(run({ type: 'spot', payload: { id: 'kitchen' } }).ok, true, `${module.id}: kitchen spot`)
    assert.equal(run({ type: 'activity', payload: { id: food.id } }).ok, true, `${module.id}: eat`)
    if (state.activeAction) finishTrip(state, contextNow(), life.setNow)
    state.needs.energy = 10
    assert.equal(run({ type: 'spot', payload: { id: 'bedroom' } }).ok, true, `${module.id}: bedroom spot`)
    assert.equal(run({ type: 'activity', payload: { id: rest.id } }).ok, true, `${module.id}: rest`)
    if (state.activeAction) finishTrip(state, contextNow(), life.setNow)

    const targets = [...new Set(linksFrom(module.id).filter((link) => link.status !== 'coming').map((link) => link.to))].slice(0, 3)
    assert.equal(targets.length, 3, `${module.id}: three reachable cities`)
    let current = module.id
    for (const target of targets.flatMap(target => [target, module.id])) {
      const link = linksFrom(current).find((candidate) => candidate.to === target && candidate.status !== 'coming')
      assert.ok(link, `${current}: route to ${target}`)
      // The ticket is in the prices of the city the life started in (026d3e6b): a start outside Nigeria pays the fare times that city's level.
      const fare = linksPriced(state, current).find((candidate) => candidate.to === target && candidate.mode === link!.mode)?.fare ?? link!.fare
      state.cash = Math.max(state.cash, (fare * 4) + 1000)
      const beforeFare = state.cash
      assert.equal(run({ type: 'estate.relocate', payload: { to: target, mode: link!.mode } }).code, 'departed', `${current}: depart for ${target}`)
      assert.equal(state.cash, beforeFare - fare, `${current}: fare to ${target}`)
      if (state.activeAction) finishTrip(state, contextNow(), life.setNow)
      assert.equal(state.estate.city, target)
      if (target === targets[0]) {
        const targetRules = cityModule(target)?.rules
        assert.ok(targetRules?.units[0], `${target}: local unit for a secondary home`)
        state.cash = Math.max(state.cash, 5_000_000)
        assert.equal(run({ type: 'estate.set-lga', payload: { lga: targetRules.units[0].id, via: 'manual', home: 'buy' } }).code, 'home_bought', `${module.id}: secondary home in ${target}`)
      }
      current = target
    }
    assert.equal(state.estate.city, module.id, `${module.id}: returned home city`)
    const away = Object.keys(state.estate.away).sort()
    assert.deepEqual(away, [targets[0]!], `${module.id}: the secondary home is stored away`)
    const warm = createLife(structuredClone(state), { cityId: module.id, now: life.now(), trustedSave: true })
    assert.deepEqual(warm, state, `${module.id}: warm reload preserves stored shape`)
    const file = join(directory, `${module.id}.json`)
    writeFileSync(file, JSON.stringify(state))
    const output = execFileSync(process.execPath, ['--experimental-strip-types', coldReloadProbe, file, module.id], { cwd: root, encoding: 'utf8', timeout: 60_000 })
    const cold = JSON.parse(output) as { state: unknown; city: string; away: string[]; rules: boolean; content: string[] }
    assert.equal(cold.city, module.id, `${module.id}: cold reload stays in its saved city`)
    assert.equal(cold.rules, true, `${module.id}: cold reload loaded every referenced city's rules`)
    assert.deepEqual(cold.content, [module.id], `${module.id}: only current-city content loaded in the child`)
    assert.deepEqual(cold.away, away, `${module.id}: cold reload preserves away homes`)
    assert.deepEqual(cold.state, state, `${module.id}: cold reload preserves the full persisted state`)
  } } finally { rmSync(directory, { recursive: true, force: true }) }
})
