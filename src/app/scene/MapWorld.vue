<script setup lang="ts">
// The two maps behind the Map panel: the city map (the 3D miniature in src/map3d, or the flat one
// where WebGL is missing) and the country map. Both are the existing hosts, fetched the first
// time the Map opens (or a trip starts). What the Map panel says to the city map before it exists
// is kept and replayed, as before.
//
// Like the venue scene, the maps draw on demand: hidden, the city map draws nothing.
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { tripKey, useApp } from '../state/app.ts'
import { loadSceneWorld, warmCityScenes } from './loaders.ts'
import { loadMaps } from './mapLoaders.ts'
import '../../map3d/dive-host.css'
import { createDiveHost } from '../../map3d/dive-host.ts'
import type { DiveRun } from '../../map3d/dive-host.ts'
import { arrivalDive, handoffSpan } from '../../map3d/dive.ts'
import { arriveFromAbove } from '../../map3d/arrive-above.ts'
import { arriveFromStreet, streetArrival, streetCandidate } from '../../map3d/arrive-street.ts'
import type { CityDive, SpanRange } from '../../map3d/dive.ts'
import type { LifeState } from '../../types/life.ts'
import { cityName } from '../../game/cities/registry.ts'
import { viewLife } from '../../life.ts'
import { telemetry } from '../../telemetry/index.ts'
import { noteChunkFailure } from '../state/updateNotice.ts'
import type { CityLinkMode, WorldCityId } from '../../types/life.ts'
import type { TripRoutes } from '../../map3d/geo/atlas.ts'
import { openSettleFlow } from '../state/settleRefusal.ts'

const props = defineProps<{ initialUi?: Record<string, unknown>; initialWorld?: Record<string, unknown> | null }>()
const emit = defineEmits<{ ready: [] }>()
const { game, shell, scene, switchCity, playerLook, heldCities, command, showMapLayer, showFriends, showLive } = useApp()
const cityBox = ref<HTMLElement | null>(null)
const worldBox = ref<HTMLElement | null>(null)
/** Which layer is in front: the country map while the city map says it is not ready. */
const worldLayer = ref(false)
const mapUi: Record<string, unknown> = { ...props.initialUi }
const keepMapUi = (event: Event): void => { Object.assign(mapUi, (event as CustomEvent<Record<string, unknown>>).detail ?? {}) }
window.addEventListener('jaw:map-ui', keepMapUi)
/** What the atlas was asked to show when it comes to the front: a level (0 the world … 2 Nigeria) or a city's card. */
let wanted: { level?: number; city?: string; friends?: boolean } | null = null
const onLayer = (event: Event): void => {
  const detail = (event as CustomEvent<{ layer?: string; level?: number; city?: string; friends?: boolean }>).detail
  const layer = detail?.layer
  if (layer !== 'world' && layer !== 'city') return
  worldLayer.value = layer === 'world'
  if (layer === 'world' && (typeof detail?.level === 'number' || typeof detail?.city === 'string')) { wanted = { ...(typeof detail.level === 'number' ? { level: detail.level } : {}), ...(typeof detail.city === 'string' ? { city: detail.city } : {}), ...(detail.friends === true ? { friends: true } : {}) }; aim() }
}
/** Point the atlas at what was asked for, once it exists and is in front. */
function aim(): void {
  const world = scene.world.value
  if (!world || !wanted || !mapOpen() || !worldLayer.value) return
  const { level, city, friends } = wanted
  wanted = null
  // After the atlas has its first level and the shell has drawn, so it measures the screen it is shown on.
  void world.ready.then(() => nextTick()).then(() => {
    world.resize()
    if (typeof level === 'number') world.goLevel(level)
    if (city && friends) world.openFriends(city)
    else if (city) world.selectCity(city)
  })
}
window.addEventListener('jaw:map-ui', onLayer)
if (props.initialWorld) onLayer(new CustomEvent('jaw:map-ui', { detail: props.initialWorld }))
if (props.initialUi) onLayer(new CustomEvent('jaw:map-ui', { detail: props.initialUi }))
onMounted(() => emit('ready'))
let loading: Promise<void> | null = null
let zoom: ReturnType<Awaited<ReturnType<typeof loadMaps>>['createZoomHost']> | null = null

/**
 * The map-to-street dive (src/map3d/dive.ts): entering a city from the atlas, the camera flies down, clouds hide the hand-over to the
 * city map, then part over it while it comes down from straight above, on the ground the atlas ended on. The player's own city ends on
 * the city map. Another city they hold is a move: sent at the tap; under the clouds the new city's map comes in, then the camera swoops
 * at the venue they arrive at and the venue's scene opens, its camera coming down from above. A trip that ends in a new city plays the
 * same from the clouds on (no flight), when the player is watching and not in the middle of something.
 * The destination's chunks are fetched from the tap on and waited for under the clouds, never for longer than the hold; skip, a slow
 * device, a refusal or the hard timeout fall back to the plain hand-over. Everything here is in this lazy chunk and the maps chunk.
 */
const dives = createDiveHost({ root: document.body })
let diving: { id: string; own: boolean; run: DiveRun; spanKm: number } | null = null
/** The dive is still on its way to the hand-off: nothing (skip, a slow device, the hold, a refusal) has given up on it. */
const going = (run: DiveRun): boolean => run.live && run.outcome === null && dives.current === run
const cityTitle = (cityId: string): string => (cityId === game.cityId.value ? game.view.value.city?.name : cityName(cityId)) ?? 'the city'

function startDive(cityId: string, own: boolean, land: () => void, reach: SpanRange): { seconds: number; spanKm: number } | 0 {
  const city = scene.city.value
  if (own) city?.warm()
  // Both maps show this much ground at the hand-off: the city map's widest view when it is up, kept within what the atlas can show.
  const spanKm = handoffSpan(reach, own ? city?.spanRange() : null)
  let answered: (ok: boolean) => void = () => {}
  const moved = new Promise<boolean>((done) => { answered = done })
  // Another city: the clouds hold until the move is answered and the new city's map and scenes are in.
  const prefetch = own ? Promise.resolve(city?.started) : Promise.all([warmCityScenes(cityId), loadSceneWorld(), moved.then((ok) => (ok ? scene.city.value?.started : undefined))])
  const run = dives.start(cityId, cityTitle(cityId), { prefetch, onSkip: land })
  diving = { id: cityId, own, run, spanKm }
  if (!own) {
    // The move is sent now; the venue opens once the dive is over (or has given up).
    const switching = switchCity(cityId, run.done)
    void switching.then((ok) => { answered(ok); if (!ok) run.ready(false) }, () => { answered(false); run.ready(false) })
    void run.covered.then(() => moved).then((ok) => { if (ok && going(run)) handOver(run, { seconds: run.revealSeconds, spanKm, venue: game.state.value.location }) })
    void Promise.all([run.done, switching]).then(([outcome]) => venueUp(outcome))
  }
  return run.flightSeconds ? { seconds: run.flightSeconds, spanKm } : 0
}
/** The dive for this city, used once: by the hand-over the atlas asks for when its flight lands. */
function takeDive(cityId: string): typeof diving {
  const entry = diving?.id === cityId ? diving : null
  diving = null
  return entry
}
/** Under the clouds: bring the city map in front, coming down from above (and swooping at `dive.venue`), then let the clouds part. */
function handOver(run: DiveRun, dive: CityDive): void {
  if (mapOpen() && worldLayer.value && zoom?.fadeTo('city', { dive, after: (front) => run.ready(front === 'city') })) return
  // Not on the atlas (the venue, or a trip watched on the city map), or the fade is busy: the city map is simply put in front, still under the clouds.
  worldLayer.value = false
  showMapLayer('city')
  void cityUp().then((up) => { const city = scene.city.value; if (up && city && going(run)) { city.resize(); city.enter('in', 0, dive) } run.ready(true) })
}
/** Wait until the city map is mounted and its box has a size (at most about two seconds). */
async function cityUp(): Promise<boolean> {
  await Promise.resolve(scene.city.value?.started).catch(() => undefined)
  for (let tries = 0; tries < 40; tries++) {
    await nextTick()
    if (scene.city.value?.map && (cityBox.value?.getBoundingClientRect().width ?? 0) > 0) return true
    await new Promise((done) => setTimeout(done, 50))
  }
  return false
}
/**
 * The venue is in front again after a dive: it fades in as after any trip, and after a whole dive its camera comes down from above, or,
 * on the home street when its scene has drawn its street (zoom phase 5b), starts at eye height looking down the street and rises.
 */
function venueUp(outcome: string): void {
  void nextTick().then(async () => {
    if (game.mode.value !== 'venue') return
    scene.arrivals.value += 1
    const motion = outcome === 'arrived' ? scene.venue.value?.motion?.() : null
    if (!motion) return
    const state = game.state.value, place = scene.venue.value?.location ?? state.location
    const pose = place && streetCandidate(place)
      ? await streetArrival(place, { load: () => import('../../scene/street-life/street-scene.ts'), tick: () => new Promise((done) => requestAnimationFrame(done)) })
      : null
    const still = game.mode.value === 'venue' && (scene.venue.value?.location ?? game.state.value.location) === place ? scene.venue.value?.motion?.() : null
    if (!still) return
    if (pose) arriveFromStreet(still.orbit, still.wake, pose)
    else arriveFromAbove(still.orbit, still.wake)
  })
}
/**
 * The life moved to another city (app.ts asks, before it opens the venue). True when the map shows the arrival: the atlas's own dive
 * to that city is still going, or a trip just ended there and the arrival dive starts now. False leaves today's arrival as it is.
 */
function arrive(state: LifeState, previous: LifeState): boolean {
  const cityId = state.estate.city, current = dives.current
  if (current?.cityId === cityId && current.live) return true
  const fromTrip = previous.activeAction?.kind === 'intercity'
  if (current || !arrivalDive({ fromTrip, tier: dives.tier(), hidden: document.hidden, busy: Boolean(state.activeAction) || Boolean(shell.sheet.value), mode: game.mode.value })) return false
  // The clouds close over whatever is on screen while the new city's map and scenes come (they were fetched during the trip).
  const run = dives.start(cityId, cityTitle(cityId), { kind: 'arrival', prefetch: Promise.resolve().then(() => Promise.all([scene.city.value?.started, warmCityScenes(cityId), loadSceneWorld()])) })
  void run.covered.then(() => { if (going(run)) handOver(run, { seconds: run.revealSeconds, venue: game.state.value.location }) })
  void run.done.then((outcome) => {
    if (game.mode.value !== 'venue' && !tripKey(game.state.value)) shell.setMode('venue')
    venueUp(outcome)
  })
  return true
}
scene.arrive = arrive

/** What a row of the atlas's friends list asks for. The pieces are fetched when first wanted. */
async function friendAction(action: 'chat' | 'call' | 'ping', id: string, name: string): Promise<void> {
  if (action === 'chat') { shell.open('messages', { to: id, name }); return }
  if (action === 'call') {
    const { useCall } = await import('../features/calls/useCall.ts')
    const rang = await useCall().request({ id, name })
    if (rang) shell.close()
    return
  }
  const { sendPing } = await import('../features/ping/pingStore.ts')
  const done = await sendPing(id, name)
  if (done.words) game.toast(done.words, done.ok ? 'good' : 'error')
}
/** The country map's friend badges follow the live frames (and the friends list); fetched with the map, drawn again when either changes. */
let stopFriends: (() => void) | null = null
async function keepFriends(): Promise<void> {
  const [{ currentFriends }, { onLive, onPeople, social }] = await Promise.all([import('../features/social/friendsOnMap.ts'), import('../features/social/useSocial.ts')])
  const draw = (): void => { scene.world.value?.setFriends(currentFriends(game.cityId.value)) }
  const offs = [onLive(draw), onPeople(draw), watch(() => [game.cityId.value, social.me?.friends.length], draw)]
  stopFriends = () => { for (const off of offs) off() }
  draw()
}

const mapOpen = (): boolean => game.mode.value === 'map'
/**
 * The life's own view of its links, for the atlas's cards. It is worked out from the whole life, so it is worked out once for each
 * state the server sends (and each city looked at, and each change of guest), not each time a card or a row of the list asks.
 */
let routesFor: { state: unknown; city: string; guest: boolean } | null = null
let routesNow: TripRoutes | null = null
function tripRoutes(): TripRoutes | null {
  const state = game.state.value, city = game.cityId.value, guest = Boolean(game.view.value.onboarding.guest)
  if (routesFor?.state !== state || routesFor.city !== city || routesFor.guest !== guest) {
    routesFor = { state, city, guest }
    routesNow = viewLife(state, { now: state.t, cityId: city }).estate?.links?.map((link) => ({ ...link, skipFree: state.travel.skipped !== true, ...(guest ? { settle: true } : {}) })) ?? null
  }
  return routesNow
}
function show(): void {
  const city = scene.city.value
  // Told after the shell has drawn, so the map measures the panel it shares the screen with.
  city?.setShown(mapOpen() && !worldLayer.value)
  if (mapOpen()) { scene.world.value?.resize(); city?.resize(); aim() }
}
function load(): Promise<void> {
  loading ??= loadMaps().then(({ createCityView, createWorldMap, createZoomHost }) => {
    if (!cityBox.value || !worldBox.value) return
    // Zooming past the end of one map hands over to the next (src/map3d/zoom-host.ts); the same fade serves "Open city".
    zoom = createZoomHost({
      city: cityBox.value, world: worldBox.value, maps: () => ({ city: scene.city.value, world: scene.world.value }),
      cityId: () => game.cityId.value, cityName: () => game.view.value.city?.name ?? 'the city',
      setLayer: (layer) => { worldLayer.value = layer === 'world'; showMapLayer(layer) },
    })
    scene.world.value = createWorldMap(worldBox.value, {
      ladder: zoom.worldPort,
      dive: startDive,
      onOpenCity: (cityId) => {
        const entry = takeDive(cityId)
        const open = (): void => {
          // Still under the clouds: the city map comes down from above, on the ground the atlas ended on, while they part.
          const run = entry && going(entry.run) ? entry.run : null
          if (!worldLayer.value || !zoom?.fadeTo('city', run ? { dive: { seconds: run.revealSeconds + 0.4, spanKm: entry!.spanKm }, after: (front) => run.ready(front === 'city') } : {})) { worldLayer.value = false; showMapLayer('city'); run?.ready(true) }
        }
        if (entry) void entry.run.covered.then(open); else open()
      },
      // A dive sent the move at the tap already.
      onEnterCity: (cityId) => { if (!takeDive(cityId)) void switchCity(cityId) },
      onInspectVenue: (cityId, venueId) => {
        if (cityId !== game.cityId.value) return
        worldLayer.value = false
        showMapLayer('city')
        shell.open('map', { destination: venueId })
      },
      // One character travels between cities: an ordinary game action, refused with its reason while the city is not open.
      onTravel: (to, mode, credit) => { void command('estate.relocate', { to: to as WorldCityId, mode: mode as CityLinkMode, ...(credit ? { credit: true } : {}) }) },
      credit: () => game.view.value.estate?.ride.offer ?? null, // (the Atlas names the ids; the server validates them)
      // Each route also says what arriving at once would add to its fare ('travel.skip'): free for a character that has never skipped.
      routes: tripRoutes,
      wallet: () => game.state.value.cash,
      // A ride home on credit blocks every trip: the card pays it in place (the existing repayment action) or sends a player who cannot to the help card.
      debt: () => game.view.value.estate?.ride.debt ?? 0,
      onRepay: () => command('travel.repay-ride', {}),
      onHelp: () => { shell.open('bank') },
      // A guest of the quick start cannot travel between cities until it has settled in: the card's one button opens that flow.
      // After settling the player is back on the map with that city's card open, not in the house.
      onSettle: (city) => { openSettleFlow(city ? () => { if (game.mode.value !== 'map') showMapLayer('world', { level: 2, city }) } : undefined) },
      held: heldCities,
      // A row of the friends list: Chat opens the conversation; Call and Ping are the card's own buttons, pressed from here.
      onFriend: (action, id, name) => { void friendAction(action, id, name) },
    })
    void keepFriends()
    const city = createCityView(cityBox.value, {
      cityId: game.cityId.value,
      ladder: zoom.cityPort,
      onSelectVenue: (venueId) => { shell.open('map', { destination: venueId }) },
      onSelectGov: () => { shell.open('state-house') },
      onSelectNeighbour: (player) => { shell.open('person', { player: player.id, name: player.name }) },
      // The world layer: a local government opens its page, a house its owner's card; the maps fetch only what is in view.
      onSelectLga: (lga) => { shell.open('lga', { lga }) },
      onSelectHouse: (house) => { shell.open('house-card', { house }) },
      // A friend's pin opens their card (Chat, Call); a pin that stands for several opens the people list.
      onSelectPeople: (ids) => { if (ids.length === 1) shell.open('person', { player: ids[0] }); else shell.open('people') },
      fetchJson: game.fetchJson,
      // The avatar reached the door: ask the server for the arrival now rather than at its next poll.
      onTripDue: () => { void game.refresh() },
      onNotice: (text) => game.toast(text),
    })
    scene.city.value = city
    window.removeEventListener('jaw:map-ui', keepMapUi)
    scene.world.value.setCity(game.cityId.value)
    city.setPlayer(playerLook())
    showFriends()
    city.setState(game.state.value)
    showLive()
    if (Object.keys(mapUi).length) window.dispatchEvent(new CustomEvent('jaw:map-ui', { detail: mapUi }))
    show()
    // The wider levels are fetched while nothing else is going on, so the first look at Africa or the world does not wait.
    const idle = (globalThis as { requestIdleCallback?: (run: () => void, options?: { timeout: number }) => number }).requestIdleCallback
    if (idle) idle(() => scene.world.value?.warm(), { timeout: 5000 }); else globalThis.setTimeout(() => scene.world.value?.warm(), 2500)
  }).catch((error: unknown) => { loading = null; telemetry.chunkFailed('map', error); void noteChunkFailure(); console.error('The map could not be loaded:', error); game.toast('The map could not be loaded. Check your connection and open it again.', 'error') })
  return loading
}
watch(() => scene.mapsWanted.value || game.mode.value === 'map', (wanted) => { if (wanted) void load() }, { immediate: true, flush: 'post' })
watch([game.mode, worldLayer], show, { flush: 'post' })
// The country map shows which cities this player holds: drawn again when that list changes.
watch(() => heldCities().join(), () => scene.world.value?.refresh?.())
const onResize = (): void => { if (mapOpen()) { scene.world.value?.resize(); scene.city.value?.resize() } }
window.addEventListener('resize', onResize)
onBeforeUnmount(() => {
  zoom?.destroy(); zoom = null; dives.destroy(); if (scene.arrive === arrive) scene.arrive = null
  stopFriends?.()
  window.removeEventListener('jaw:map-ui', keepMapUi); window.removeEventListener('jaw:map-ui', onLayer); window.removeEventListener('resize', onResize)
  scene.city.value?.destroy(); scene.city.value = null; scene.world.value = null
})
</script>

<template>
  <div id="map-scene" ref="worldBox" class="life-scene" :hidden="game.mode.value !== 'map' || !worldLayer" />
  <div id="city-scene" ref="cityBox" class="life-scene" :hidden="game.mode.value !== 'map' || worldLayer" />
</template>
