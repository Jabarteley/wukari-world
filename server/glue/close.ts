/**
 * OWNER: social
 * CLOSE-FRIENDS PRESENCE (docs/SOCIAL-GLUE.md): a person picks close friends and, if they turn it on, those friends see a line such as
 * "Tunde is in the Square now" or "Ada is at Freedom Park, Lagos" on People, Messages and a small HUD line. Off by default.
 *
 * WHAT IS TOLD. Only a place in the game, read from the server's own room registry (server/social/presence.ts): the Square, a group room
 * (never which one), a public venue and its city, "at home" with the city, or only the city while visiting someone (never whose home).
 * Nothing about a device's real position exists here. A person who is offline, or connected but in no room, has no line.
 *
 * WHO IS TOLD. A viewer sees a sharer's line only when every one of these holds AT THE MOMENT OF THE READ (src/glue/model.ts mayShare):
 * the sharer turned sharing on; the viewer is on the sharer's list; they are ordinary friends; no block either way. The index
 * `seen[viewer]` only says whose records to look at, so a stale index entry reveals nothing. Turning sharing off, taking someone off the
 * list, unfriending or blocking stops it on the next read; the viewers who were on the list are also sent `glue-close`, so an open page
 * drops the line at once instead of on its next minute.
 * Portable: no Node imports.
 */
import { GLUE, closeLine, mayShare } from '../../src/glue/model.ts'
import type { ClosePlace } from '../../src/glue/model.ts'
import type { CloseNowLine, CloseView } from '../../src/types/glue.ts'
import { presenceOf, describeRoom } from '../social/presence.ts'
import { placeName, venueName } from '../world-events/service.ts'
import { glueOf, peekGlue } from './data.ts'
import { glueKit, idOf, no } from './common.ts'
import type { No } from './common.ts'
import type { Db, RouteContext } from '../types.ts'

export function closeService(ctx: RouteContext) {
  const kit = glueKit(ctx), presence = presenceOf(ctx)

  /** Where a person is in the game now, as a close friend may be told it; null when they are nowhere to tell. */
  function placeOf(id: string): ClosePlace | null {
    const status = presence.status(id)
    if (status.state !== 'online' || !status.rooms.length) return null
    const rooms = status.rooms.map(describeRoom)
    // Their own room says where they are; someone else's home is a visit, told as the city only.
    const own = rooms.find((room) => !room.home || room.hostId === id) ?? null
    const room = own ?? rooms[0]!
    if (room.cityId === 'world') return room.venue === 'square' ? { kind: 'square' } : { kind: 'room' }
    const cityName = placeName(room.cityId)
    if (!own) return { kind: 'city', city: room.cityId, cityName }
    if (room.home) return { kind: 'home', city: room.cityId, cityName }
    return { kind: 'venue', city: room.cityId, cityName, venue: room.venue, venueName: venueName(room.cityId, room.venue) }
  }
  /** May `viewer` be told where `sharer` is, as the store stands now. */
  function allowed(db: Db, sharer: string, viewer: string): boolean {
    const rec = peekGlue(db)?.close?.[sharer]
    return Boolean(rec) && mayShare({ on: rec!.on === 1, list: rec!.ids, viewer, friends: kit.friends(db, sharer, viewer), blocked: kit.blocked(db, sharer, viewer) })
  }
  /** The lines for one viewer: every close friend who shares with them and is somewhere now. */
  function now(db: Db, viewer: string): CloseNowLine[] {
    const sharers = peekGlue(db)?.seen?.[viewer] ?? []
    const lines: CloseNowLine[] = []
    for (const sharer of sharers) {
      if (!allowed(db, sharer, viewer)) continue
      const place = placeOf(sharer)
      if (!place) continue
      const name = kit.nameOf(db, sharer)
      lines.push({ id: sharer, name, line: closeLine(name, place), place })
    }
    return lines
  }
  function view(db: Db, me: string): CloseView {
    const rec = peekGlue(db)?.close?.[me]
    const list = (rec?.ids ?? []).filter((id) => kit.friends(db, me, id) && !kit.blocked(db, me, id)).map((id) => ({ id, name: kit.nameOf(db, id) }))
    const listed = new Set(list.map((p) => p.id))
    return { ok: true, on: rec?.on === 1, list, friends: kit.friendList(db, me).filter((p) => !listed.has(p.id)).slice(0, 60), now: now(db, me) }
  }
  /**
   * Change my setting: `{ on }`, `{ add: id }`, `{ remove: id }` or `{ ids: [...] }`. Only ordinary friends who are not blocked can be on
   * the list. Returns the view and the viewers who should drop or gain a line now.
   */
  function set(db: Db, me: string, body: Record<string, unknown>): { ok: true; view: CloseView; tell: string[] } | No {
    const g = glueOf(ctx, db)
    const rec = g.close[me] ?? { ids: [], at: ctx.now() }
    const before = new Set(rec.on === 1 ? rec.ids : [])
    let ids = [...rec.ids]
    if (Array.isArray(body.ids)) ids = body.ids.map(idOf).filter((x): x is string => x !== null)
    const add = idOf(body.add), remove = idOf(body.remove)
    if (add) { if (!kit.friends(db, me, add) || kit.blocked(db, me, add)) return no('friends_only', 'Only your friends can be close friends.'); if (!ids.includes(add)) ids.push(add) }
    if (remove) ids = ids.filter((x) => x !== remove)
    ids = [...new Set(ids)].filter((id) => kit.friends(db, me, id) && !kit.blocked(db, me, id))
    if (ids.length > GLUE.close.max) return no('too_many', `You can have at most ${GLUE.close.max} close friends.`)
    if (body.on === true) rec.on = 1
    if (body.on === false) delete rec.on
    // Keep the viewers' index in step: a viewer taken off loses this sharer, a viewer added gains it.
    for (const gone of rec.ids.filter((x) => !ids.includes(x))) { const list = g.seen[gone]; if (list) { const kept = list.filter((x) => x !== me); if (kept.length) g.seen[gone] = kept; else delete g.seen[gone] } }
    for (const fresh of ids.filter((x) => !rec.ids.includes(x))) { const list = g.seen[fresh] ?? []; if (!list.includes(me)) { list.push(me); while (list.length > GLUE.close.viewersKept) list.shift() } g.seen[fresh] = list }
    rec.ids = ids; rec.at = ctx.now()
    g.close[me] = rec
    const after = new Set(rec.on === 1 ? rec.ids : [])
    const tell = [...new Set([...before, ...after])].filter((id) => before.has(id) !== after.has(id))
    return { ok: true, view: view(db, me), tell }
  }
  return { now, view, set, allowed, placeOf }
}

/** ERASURE: a person's list goes, they leave every viewer index, and every list they were on drops them. */
export function forgetClose(db: Db, ids: ReadonlySet<string>): void {
  const g = peekGlue(db)
  if (!g?.close) return
  for (const id of ids) {
    for (const viewer of g.close[id]?.ids ?? []) { const list = g.seen[viewer]; if (list) { const kept = list.filter((x) => x !== id); if (kept.length) g.seen[viewer] = kept; else delete g.seen[viewer] } }
    for (const sharer of g.seen?.[id] ?? []) { const rec = g.close[sharer]; if (rec) rec.ids = rec.ids.filter((x) => x !== id) }
    delete g.close[id]; delete g.seen[id]
  }
}
