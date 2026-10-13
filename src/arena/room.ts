/**
 * OWNER: games (real-time)
 * `useArenaRoom`: everything a game screen shares. Call it once in a screen's `setup`. It owns the socket (./client.ts), the
 * room's latest `arena-state`, the snapshot jitter buffer (./interp.ts), the invite link, and the lobby/result actions; the
 * screen owns drawing and its own input. The lobby / result / watching cards are `ArenaRoomPanels.vue` (give it this object).
 *
 *   const room = useArenaRoom<MySnap>({ game: 'race', intent: props.intent, hz: 15, look: ownLook,
 *     onSnap: (k, snap) => {...}, onMatch: () => {...} })
 *   room.state.value        the ArenaStateFrame (null until the first one)     room.timeline  Timeline<MySnap>
 *   room.latest             the newest snapshot (also from a late join)         room.send(type, body) / room.sendInput(i)
 *   room.seated / room.status / room.link / room.leave() ...
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { createArenaClient } from './client.ts'
import type { ArenaClient } from './client.ts'
import { Timeline } from './interp.ts'
import type { ArenaIntent } from './catalog.ts'
import type { ArenaLook, ArenaStateFrame } from '../types/arena.ts'

export interface ArenaRoomOptions<Snap> {
  /** The rules id this screen plays. */
  game: string
  intent: ArenaIntent
  /** The server tick rate (the rules' `hz`), for the jitter buffer. */
  hz: number
  /** Ticks drawn behind the newest (default 2). */
  delayTicks?: number
  /** The player's own look, sent with create/join (cosmetic). */
  look?: () => ArenaLook | undefined
  /** Called for each snapshot as it arrives (after it is in the timeline). */
  onSnap?: (k: number, snap: Snap, acks?: number[]) => void
  /** A new match began (rematch, or the first): reset effects. The timeline is already cleared. */
  onMatch?: () => void
  /** The room ended / was never there. */
  onGone?: (why: string) => void
  /** A game that takes its options from the lobby: sent with arena-create. */
  options?: Record<string, number | string | boolean>
  /** Say something to the player (a toast), e.g. "Link copied". */
  toast?: (text: string, kind?: 'good' | 'error') => void
  /** Called after the screen asked to leave, to close itself. */
  close?: () => void
}

const ORDINAL = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
/** The result line for a player: first "You won!", second and third "2nd place", the rest "You finished 4th"; without places, won or lost. */
export function placeHeadline(place: number | undefined, won: boolean, seats: number): string {
  if (place === undefined) return won ? 'You won!' : 'You lost'
  if (place === 1) return 'You won!'
  const word = ORDINAL[place] ?? `${place}th`
  return place <= 3 && place < seats ? `${word} place` : `You finished ${word}`
}

export function useArenaRoom<Snap>(opts: ArenaRoomOptions<Snap>) {
  const state = shallowRef<ArenaStateFrame | null>(null)
  const note = ref('')
  const conn = ref<'connecting' | 'open' | 'closed'>('connecting')
  const gone = ref(false)
  const copied = ref(false)
  const timeline = new Timeline<Snap>(1000 / opts.hz, opts.delayTicks ?? 2)
  let latest: Snap | null = null
  let room = opts.intent.room ?? ''
  let created = false
  let matchSeen = 0
  let client: ArenaClient
  // The invitation (the link's room code kept on the device by the quick start) is done with once this screen has the room or knows it is gone.
  let invitation = !!opts.intent.room
  const settled = (): void => { if (!invitation) return; invitation = false; void import('../quick-start/entry.ts').then((entry) => { entry.forgetTable() }).catch(() => undefined) }

  client = createArenaClient({
    open() {
      if (room) client.send('arena-join', { room, look: opts.look?.() })
      else if (!created) { created = true; client.send('arena-create', { game: opts.game, practice: opts.intent.kind === 'practice', ...(opts.intent.seats ? { seats: opts.intent.seats } : {}), look: opts.look?.(), ...(opts.options ? { options: opts.options } : {}) }) }
    },
    state(frame) {
      room = frame.room
      settled()
      if (frame.status === 'closed') { gone.value = true; note.value = 'This game has ended.'; state.value = frame; opts.onGone?.('closed'); return }
      if (frame.game !== opts.game) { gone.value = true; note.value = 'That link is for a different game.'; opts.onGone?.('game'); return }
      if (frame.match !== matchSeen) { matchSeen = frame.match; timeline.clear(); latest = null; opts.onMatch?.() }
      if (frame.snap && !latest) latest = frame.snap as Snap
      state.value = frame; note.value = ''
    },
    snap(r, k, s, acks) {
      if (r !== room) return
      latest = s as Snap
      timeline.push(k, performance.now(), latest)
      opts.onSnap?.(k, latest, acks)
    },
    error(code, reason) {
      note.value = reason
      if (code === 'arena_unknown' || code === 'arena_game') settled()
      if (code === 'arena_unknown' || code === 'arena_game' || code === 'arena_full' || code === 'arena_unavailable') gone.value = !state.value
      if (gone.value) opts.onGone?.(code)
    },
    connection(status) { conn.value = status },
  })

  const seated = computed(() => state.value?.you != null)
  const status = computed(() => state.value?.status ?? 'lobby')
  const link = computed(() => (state.value ? `${location.origin}/?table=${state.value.room}` : ''))
  const opponent = computed(() => state.value?.seats.find((_, index) => index !== state.value?.you)?.name ?? '')
  const iAsked = computed(() => state.value?.you != null && state.value.again[state.value.you] === true)
  const headline = computed(() => {
    const r = state.value?.result, you = state.value?.you
    if (!r) return ''
    if (r.draw) return 'Draw'
    if (you == null) return 'Game over'
    return placeHeadline(r.places?.[you], r.winners.includes(you), (state.value?.seats.length ?? 0))
  })

  async function share(line?: string): Promise<void> {
    const label = state.value?.label ?? 'game'
    line ??= `Join my ${label} match on Allworld:`
    const { shareAddress } = await import('../app/features/paths/share.ts')
    await shareAddress(`/?table=${state.value?.room ?? ''}`, line, (text, kind) => { opts.toast?.(text, kind) })
  }
  async function copy(): Promise<void> {
    const { loadShareModule } = await import('../app/features/growth/boundary.ts')
    copied.value = await (await loadShareModule()).copyText(link.value)
    setTimeout(() => { copied.value = false }, 2000)
  }
  const send = (type: string, body: Record<string, unknown> = {}): boolean => client.send(type, { room, ...body })
  return {
    state, note, conn, gone, copied, timeline, seated, status, link, opponent, iAsked, headline, client,
    get latest(): Snap | null { return latest },
    get code(): string { return room },
    send,
    /** An `arena-input` frame for the room. */
    sendInput: (i: unknown, n?: number): boolean => (room ? client.send('arena-input', { room, i, ...(n !== undefined ? { n } : {}) }) : false),
    start: (bots = 0, seats?: number): boolean => send('arena-start', { bots, ...(seats ? { seats } : {}) }),
    again: (): boolean => send('arena-again'),
    setOption: (name: string, value: number | string | boolean): boolean => send('arena-options', { options: { [name]: value } }),
    share, copy,
    /** Leave the room (a game in play is forfeited), close the socket, and tell the screen to close. */
    leave(): void { if (room) client.send('arena-leave', { room }); client.close(); opts.close?.() },
    /** Open the socket: call in onMounted (done for you by `mount()`). */
    mount(): void { onMounted(() => client.connect()); onBeforeUnmount(() => client.close()) },
  }
}
export type ArenaRoom<Snap = unknown> = ReturnType<typeof useArenaRoom<Snap>>
