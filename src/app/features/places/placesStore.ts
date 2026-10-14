// The places store of the page: stepping into the Square or a group's room, stepping out, the people there and the room's
// furniture (server/routes/places.ts, src/places/model.ts). Fetched the first time a place is opened; the few lines every
// screen reads from the start are placeState.ts. Every answer is the server's: a button only asks.
//
// STANDING IN A PLACE IS NOT A JOURNEY. The life stays where it is and keeps running. This store sets `placeNow`; the room
// socket follows it (communityStore.ts), the scene shows the place (the Square as one venue for everybody, a room as a
// furnished home scene) and the venue panel gives way to the place panel. Leaving puts all three back.
// A life that sets off on a trip, or a visit to a home, takes the player out of the place: one thing is on screen at a time.
import { reactive, watch } from 'vue'
import { useApp } from '../../state/app.ts'
import { tripKey } from '../../state/app.ts'
import { call, social } from '../social/useSocial.ts'
import { loadCityContent } from '../../../game/cities/registry.ts'
import { roomStyle, PLACES } from '../../../places/model.ts'
import type { RoomEdit } from '../../../places/model.ts'
import { placeNow, placePeople, SQUARE_SCENE } from './placeState.ts'
import type { PlacesResult, RoomEditResult, RoomEnterResult, RoomLinkResult, RoomRemoveResult, RoomResult, RoomSummary, RoomView, SquareResult, SquareView } from '../../../types/places.ts'
import type { VisitHomeProjection } from '../../../types/visit.ts'
import type { CityId } from '../../../types/protocol.ts'

export const places = reactive<{ square: SquareView | null; room: RoomView | null; rooms: RoomSummary[]; squareHere: number; listed: boolean; busy: string; error: string }>({ square: null, room: null, rooms: [], squareHere: 0, listed: false, busy: '', error: '' })
const KEY = 'allworld-place'
const REFRESH_MS = 5000
let started = false, timer: ReturnType<typeof setInterval> | undefined, epoch = 0

const keep = (): void => { try { const now = placeNow.value; if (now) globalThis.sessionStorage?.setItem(KEY, JSON.stringify(now)); else globalThis.sessionStorage?.removeItem(KEY) } catch { /* private mode: the place is simply not kept over a reload */ } }
/** The place this tab stood in before a reload, if it said so. */
export function keptPlace(): { kind: 'square' } | { kind: 'room'; id: string; name: string } | null {
  try {
    const found = JSON.parse(globalThis.sessionStorage?.getItem(KEY) ?? 'null') as { kind?: unknown; id?: unknown; name?: unknown } | null
    if (found?.kind === 'square') return { kind: 'square' }
    if (found?.kind === 'room' && typeof found.id === 'string' && typeof found.name === 'string') return { kind: 'room', id: found.id, name: found.name }
  } catch { /* nothing kept */ }
  return null
}

/** A room as the home scene draws a visited home: the group stands where a host would. */
function projection(room: RoomView, city: string): VisitHomeProjection {
  return { host: { id: room.id, name: room.name }, city: city as CityId, plot: null, owned: false, grid: room.grid, style: room.style ?? roomStyle(), items: room.items.map((item) => ({ ...item })) }
}
/** Put the place on screen (or take it off): the scene host may have been made again since the last time. */
function show(): void {
  const { game, scene, showScene } = useApp(), host = scene.venue.value, now = placeNow.value
  if (!host) return
  // A room is a home scene with the room's pieces. The Square (and stepping out of either) is what the app's own scene state says.
  if (now?.kind === 'room' && places.room) { host.setVisitHome(projection(places.room, game.cityId.value)); return }
  if (!social.me?.visiting) host.setVisitHome(null)
  showScene()
}
function people(): void { placePeople.value = placeNow.value?.kind === 'square' ? places.square?.people ?? [] : placeNow.value?.kind === 'room' ? places.room?.here ?? [] : [] }

async function refresh(): Promise<void> {
  const now = placeNow.value, mine = epoch
  if (!now || !useApp().game.connected.value) return
  if (now.kind === 'square') {
    const done = await call<Extract<SquareResult, { ok: true }>>('/api/places/square')
    if (mine !== epoch || !done.ok) return
    places.square = done.square; places.squareHere = done.square.here
  } else {
    const done = await call<Extract<RoomResult, { ok: true }>>(`/api/places/room?id=${encodeURIComponent(now.id)}`)
    if (mine !== epoch) return
    if (!done.ok) { if (done.code === 'not_admitted') stepOut('You are no longer in this room.'); return }
    const changed = places.room?.rev !== done.room.rev || places.room.id !== done.room.id
    places.room = done.room
    if (changed) show()
  }
  people()
}

function watchers(): void {
  if (started) return
  started = true
  const { game, scene } = useApp()
  // The scene host was made again (a new city, the map closed): the place goes back on it.
  watch(scene.venue, () => { if (placeNow.value) show() })
  // The life set off somewhere, or the player is now a guest in a home: that is what the screen shows, so the place is left.
  watch(() => `${tripKey(game.state.value)}|${social.me?.visiting?.host.id ?? ''}`, (key) => { if (placeNow.value && key !== '|') stepOut(null) })
  watch(game.connected, (up) => { if (up && placeNow.value) void refresh() })
  // The room socket was put out of the place by the server (asked to leave, the link ended, the pass ran out).
  globalThis.addEventListener?.('jaw:place-ended', () => { if (placeNow.value) stepOut('You are no longer in this room.') })
}
function begin(now: NonNullable<typeof placeNow.value>): void {
  const { shell } = useApp()
  watchers()
  epoch++
  placeNow.value = now; keep(); show(); people()
  clearInterval(timer)
  timer = setInterval(() => { if (!globalThis.document?.hidden) void refresh() }, REFRESH_MS)
  shell.close(); shell.setMode('venue')
}
/** Leave the place: the screen, the room socket and the scene go back to where the life is. `say`: a line to show, if any. */
export function stepOut(say: string | null = 'You stepped out.'): void {
  if (!placeNow.value) return
  epoch++
  clearInterval(timer); timer = undefined
  placeNow.value = null; keep(); places.room = null; places.square = null; placePeople.value = []
  show()
  if (say) useApp().game.toast(say)
}

const blocked = (): string | null => {
  const { game } = useApp()
  if (!game.connected.value) return 'Reconnect first.'
  if (social.me?.visiting) return 'Leave the home you are visiting first.'
  if (tripKey(game.state.value)) return 'You are travelling. You can come when you arrive.'
  // The street walk has a scene host of its own, with no room for a place in it.
  if (game.state.value.location === 'city-street') return 'Finish your walk first: step into a venue or go home, then come.'
  return null
}
/** Step into the Square. Free, from anywhere. */
export async function enterSquare(): Promise<boolean> {
  const { game } = useApp(), no = blocked()
  if (no) { game.toast(no, 'error'); return false }
  if (places.busy) return false
  places.busy = 'square'
  try {
    // The Square is drawn as one venue for everybody: its city's content is needed before the scene can be built.
    await loadCityContent(SQUARE_SCENE.city)
    begin({ kind: 'square' })
    await refresh()
    return true
  } catch { game.toast('The Square could not be opened. Check your connection and try again.', 'error'); return false } finally { places.busy = '' }
}
function inside(room: RoomView): void { places.room = room; begin({ kind: 'room', id: room.id, name: room.name }) }
/** Step into one of your groups' rooms. */
export async function enterRoom(id: string): Promise<boolean> {
  const { game } = useApp(), no = blocked()
  if (no) { game.toast(no, 'error'); return false }
  if (places.busy) return false
  places.busy = `room:${id}`
  try {
    const done = await call<Extract<RoomResult, { ok: true }>>(`/api/places/room?id=${encodeURIComponent(id)}`)
    if (!done.ok) { game.toast(done.reason, 'error'); return false }
    inside(done.room)
    return true
  } finally { places.busy = '' }
}
/** Come in through a room's link. Answers the refusal's sentence, or null when inside. `retry`: nothing was decided (no connection, no life yet). */
export async function enterByLink(token: string): Promise<{ ok: true } | { ok: false; reason: string; retry: boolean }> {
  const no = blocked()
  if (no) return { ok: false, reason: no, retry: true }
  const done = await call<Extract<RoomEnterResult, { ok: true }>>('/api/places/room/enter', { token })
  if (!done.ok) return { ok: false, reason: done.reason, retry: Boolean(done.transport) || done.code === 'device_session_required' || done.code === 'onboarding_required' || done.code === 'rate_limited' }
  inside(done.room)
  return { ok: true }
}

/** The door of each place: how many are in the Square, and the caller's group rooms. */
export async function loadPlaces(): Promise<void> {
  const done = await call<Extract<PlacesResult, { ok: true }>>('/api/places')
  if (!done.ok) { places.error = done.reason; return }
  places.error = ''; places.squareHere = done.square.here; places.rooms = done.rooms; places.listed = true
}

// ---- building a room together -------------------------------------------------------------------------------------------
const pieceId = (): string => `p${Array.from(globalThis.crypto.getRandomValues(new Uint8Array(8)), (byte) => byte.toString(16).padStart(2, '0')).join('')}`
async function change(edit: RoomEdit): Promise<string | null> {
  const room = places.room
  if (!room) return 'You are not in a room.'
  const done = await call<Extract<RoomEditResult, { ok: true }>>('/api/places/room/edit', { id: room.id, edit })
  if (!done.ok) return done.reason
  if (placeNow.value?.kind === 'room' && placeNow.value.id === done.room.id) { places.room = done.room; show(); people() }
  return null
}
export const addPiece = (itemId: string): Promise<string | null> => change({ op: 'add', id: pieceId(), itemId } as RoomEdit)
export const movePiece = (id: string, x: number, y: number, rot: number): Promise<string | null> => (x < 0 || y < 0 || x >= PLACES.roomGrid || y >= PLACES.roomGrid ? Promise.resolve('It cannot go past the wall.') : change({ op: 'move', id, x, y, rot }))
export const removePiece = (id: string): Promise<string | null> => change({ op: 'remove', id })

/** Switch the room's link on or off, or make a new one. Answers the link's address when it is on. */
export async function setLink(on: boolean, fresh = false): Promise<{ path: string | null; reason: string | null }> {
  const room = places.room
  if (!room) return { path: null, reason: 'You are not in a room.' }
  const done = await call<Extract<RoomLinkResult, { ok: true }>>('/api/places/room/link', { id: room.id, on, ...(fresh ? { fresh: true } : {}) })
  if (!done.ok) return { path: null, reason: done.reason }
  places.room = done.room; people()
  return { path: done.room.link?.path ?? null, reason: null }
}
export async function askToLeave(player: string): Promise<string | null> {
  const room = places.room
  if (!room) return 'You are not in a room.'
  const done = await call<Extract<RoomRemoveResult, { ok: true }>>('/api/places/room/remove', { id: room.id, player })
  if (!done.ok) return done.reason
  places.room = done.room; people()
  return null
}
