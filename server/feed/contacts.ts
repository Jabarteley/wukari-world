/**
 * OWNER: social
 * FINDING FRIENDS FROM YOUR CONTACTS (docs/FEED.md, "Contacts"), the owner's decision of 18 Oct 2026: "implement, but make it extremely
 * secure so it never gets leaked". What makes it so:
 *
 *   1. NO NUMBER EVER REACHES THE SERVER. The browser normalises each number to E.164 (+2348031234567), hashes it with SHA-256 and sends
 *      the first 32 hex characters. Not the number, not the name, nothing else of the address book.
 *   2. NOTHING STORED CAN BE TURNED BACK INTO A NUMBER WITHOUT A SECRET THAT IS NOT IN THE DATA. Each hash is keyed again on the server
 *      with HMAC-SHA-256 under a pepper made by this host for itself (ctx.keyFile 'contacts-pepper': a row of `host_keys` on the Worker,
 *      a 0600 file on Node), never in a collection, a response, an export or a log. A copy of every collection reveals only opaque tokens.
 *   3. AN UPLOADED ADDRESS BOOK IS NOT KEPT. Each contact becomes at most one opaque EDGE token, HMAC(pepper, both blinded numbers, sorted),
 *      kept 30 days so that a friend who joins later can still be matched, with no link to who uploaded it beyond an opaque side mark.
 *   4. MUTUAL ONLY. Two people are shown to each other only when BOTH declared their own number and EACH has the other's in their contacts.
 *      Declaring someone else's number gains nothing: the real owner never has the impostor in their own upload as that number's holder.
 *      (Once phone checks are live, a number proven by the phone provider can be made findable one way; until then nothing is one-way.)
 *   5. LIMITS. Confirmed adults only, on both sides. At most 1,000 numbers an upload, 3 uploads a day, 3 changes of one's own number a
 *      month, per-address limits too; blocks win; a refused number says nothing about who holds it. "Forget" deletes one's own number,
 *      every edge one made and every match, at once. Erasure does the same.
 * Stored (collection `contacts`, keyed, never in `feed`): me[id] { key, at, changes[] } · keys[key] → id · edges[E] { s, at } ·
 * mine[id] { edges[], at } · found[id] { ids[], at }.
 * Portable: Web Crypto only.
 */
import type { Db, RouteContext, SessionRecord } from '../types.ts'

export const CONTACTS = Object.freeze({ perUpload: 1000, uploadsPerDay: 3, changesPerMonth: 3, edgeMs: 30 * 86400000, found: 100, edgesPerPlayer: 3000 })
const HASH = /^[0-9a-f]{32}$/
export interface ContactsCollection {
  me: Record<string, { key: string; at: number; changes: number[] }>
  keys: Record<string, string>
  edges: Record<string, { s: string; at: number }>
  mine: Record<string, { edges: string[]; at: number; uploads: number[] }>
  found: Record<string, { ids: string[]; at: number }>
}
const MAPS = ['me', 'keys', 'edges', 'mine', 'found'] as const
export const contactsOf = (ctx: Pick<RouteContext, 'collection'>, db: Db): ContactsCollection => {
  const c = ctx.collection(db, 'contacts', { me: {}, keys: {}, edges: {}, mine: {}, found: {} }) as unknown as ContactsCollection
  for (const key of MAPS) if (!c[key] || typeof c[key] !== 'object') (c as unknown as Record<string, unknown>)[key] = {}
  return c
}
export const peekContacts = (db: Db): ContactsCollection | undefined => (db as Record<string, unknown>)['contacts'] as ContactsCollection | undefined
type No = { ok: false; code: string; reason: string }
const no = (code: string, reason: string): No => ({ ok: false, code, reason })

/** The blinding: HMAC-SHA-256(pepper, label + value), base64url, 32 characters. */
export function blinder(ctx: RouteContext) {
  let key: ReturnType<typeof globalThis.crypto.subtle.importKey> | null = null
  const getKey = (): ReturnType<typeof globalThis.crypto.subtle.importKey> => key ??= ctx.keyFile('contacts-pepper', () => {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32))
    return { key: btoa(String.fromCharCode(...bytes)) }
  }).then((v) => globalThis.crypto.subtle.importKey('raw', Uint8Array.from(atob(v.key), (ch) => ch.charCodeAt(0)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']))
  return async (label: string, value: string): Promise<string> => {
    const mac = new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', await getKey(), new TextEncoder().encode(`${label}:${value}`)))
    return btoa(String.fromCharCode(...mac)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, 32)
  }
}

export function contactsService(ctx: RouteContext) {
  const blind = blinder(ctx)
  const now = (): number => ctx.now()
  const adult = (db: Db, id: string): boolean => ctx.checks?.adult?.(db, id) === true
  const blocked = (a: string, b: string): boolean => ctx.checks?.blocked?.(a, b) === true
  const edgeOf = (a: string, b: string): Promise<string> => blind('edge', [a, b].sort().join('|'))

  function status(db: Db, session: SessionRecord) {
    const c = peekContacts(db), id = session.publicId
    return { ok: true as const, declared: Boolean(c?.me[id]), declaredAt: c?.me[id]?.at ?? null, found: c?.found[id]?.ids.length ?? 0, uploadedAt: c?.mine[id]?.at ?? null, adult: adult(db, id), limits: CONTACTS }
  }
  /** Declare one's own number (its hash), or `off`. Blinded before the transaction, so the pepper is never awaited inside one. */
  async function declare(session: SessionRecord, body: Record<string, unknown>): Promise<{ ok: true; declared: boolean } | No> {
    const id = session.publicId
    if (body.off === true) {
      await ctx.store.transact((db) => forget(db, id, { keepMatches: true, keepEdges: true }))
      return { ok: true, declared: false }
    }
    if (body.consent !== true) return no('consent_required', 'Tick the box to let friends who have your number find you.')
    const hash = typeof body.hash === 'string' ? body.hash.toLowerCase() : ''
    if (!HASH.test(hash)) return no('invalid_number', 'That number could not be read. Use the full number with the country code.')
    const key = await blind('self', hash)
    return ctx.store.transact((db): { ok: true; declared: boolean } | No => {
      if (!adult(db, id)) return no('adults_only', 'Finding friends from contacts is for players confirmed as 18 or older.')
      const c = contactsOf(ctx, db), mine = c.me[id], t = now()
      const changes = (mine?.changes ?? []).filter((at) => t - at < 30 * 86400000)
      if (mine?.key === key) return { ok: true, declared: true }
      if (changes.length >= CONTACTS.changesPerMonth) return no('too_many_changes', 'You can change your number three times a month.')
      // A number already held by someone else is refused with the same words as any other refusal: nothing is said about the holder.
      if (c.keys[key] && c.keys[key] !== id) return no('number_unavailable', 'That number cannot be used here. Check it, or try again later.')
      if (mine) delete c.keys[mine.key]
      c.keys[key] = id
      c.me[id] = { key, at: t, changes: [...changes, t] }
      return { ok: true, declared: true }
    })
  }
  /** Match an upload of hashed contacts. Returns the people matched now (mutual), and how many contacts wait for the other side. */
  async function match(session: SessionRecord, body: Record<string, unknown>): Promise<{ ok: true; matched: string[]; waiting: number } | No> {
    const id = session.publicId
    const raw = Array.isArray(body.hashes) ? body.hashes : []
    if (!raw.length) return no('empty', 'Choose some contacts first.')
    if (raw.length > CONTACTS.perUpload) return no('too_many', `At most ${CONTACTS.perUpload} numbers at a time.`)
    const hashes = [...new Set(raw.filter((h): h is string => typeof h === 'string' && HASH.test(h.toLowerCase())).map((h) => h.toLowerCase()))]
    if (!ctx.allow(`contacts:match:${id}`, CONTACTS.uploadsPerDay, 86400000)) return no('rate_limited', 'You can look for contacts three times a day.')
    const self = await ctx.store.read((db) => peekContacts(db)?.me[id]?.key ?? null)
    if (!self) return no('declare_first', 'Add your own number first: friends are matched only when you both have each other.')
    const side = await blind('side', self)
    const keys = await Promise.all(hashes.map((h) => blind('self', h)))
    const edges = await Promise.all(keys.map((k) => edgeOf(self, k)))
    return ctx.store.transact((db): { ok: true; matched: string[]; waiting: number } | No => {
      if (!adult(db, id)) return no('adults_only', 'Finding friends from contacts is for players confirmed as 18 or older.')
      const c = contactsOf(ctx, db), t = now()
      if (c.me[id]?.key !== self) return no('declare_first', 'Add your own number first.')
      const mine = (c.mine[id] ??= { edges: [], at: t, uploads: [] })
      mine.at = t
      const matched: string[] = []
      let waiting = 0
      keys.forEach((k, i) => {
        if (k === self) return
        const e = edges[i]!, other = c.keys[k], stored = c.edges[e]
        if (stored && stored.s !== side && t - stored.at < CONTACTS.edgeMs) {
          // The other side uploaded this number pair first: a mutual match, if they still hold the number and nothing blocks it.
          if (other && other !== id && adult(db, other) && !blocked(id, other)) {
            matched.push(other)
            const theirs = (c.found[other] ??= { ids: [], at: t }); if (!theirs.ids.includes(id)) theirs.ids = [...theirs.ids, id].slice(-CONTACTS.found); theirs.at = t
          }
          delete c.edges[e]
          return
        }
        if (!stored) { c.edges[e] = { s: side, at: t }; mine.edges.push(e); waiting += 1 }
        else if (stored.s === side) { stored.at = t; waiting += 1 }
      })
      if (mine.edges.length > CONTACTS.edgesPerPlayer) for (const old of mine.edges.splice(0, mine.edges.length - CONTACTS.edgesPerPlayer)) delete c.edges[old]
      const found = (c.found[id] ??= { ids: [], at: t })
      found.ids = [...new Set([...found.ids, ...matched])].slice(-CONTACTS.found); found.at = t
      return { ok: true, matched, waiting }
    })
  }
  /** The people matched from contacts, for "people you may know". */
  const foundFor = (db: Db, id: string): string[] => (peekContacts(db)?.found[id]?.ids ?? []).filter((x) => !blocked(id, x))
  /** Delete a player's number, every edge they made and every match, at once (also the erasure). */
  function forget(db: Db, id: string, { keepMatches = false, keepEdges = false }: { keepMatches?: boolean; keepEdges?: boolean } = {}): { ok: true } {
    const c = peekContacts(db)
    if (!c) return { ok: true }
    const me = c.me[id]
    if (me) { if (c.keys[me.key] === id) delete c.keys[me.key]; delete c.me[id] }
    if (!keepEdges) { for (const e of c.mine[id]?.edges ?? []) delete c.edges[e]; delete c.mine[id] }
    if (!keepMatches) { delete c.found[id]; for (const other of Object.keys(c.found)) { const f = c.found[other]; if (f?.ids.includes(id)) f.ids = f.ids.filter((x) => x !== id) } }
    return { ok: true }
  }
  /** Heartbeat: edges older than 30 days go. Bounded. */
  function sweep(db: Db): void {
    const c = peekContacts(db)
    if (!c) return
    const t = now(); let n = 0
    for (const [id, mine] of Object.entries(c.mine)) {
      const keep = mine.edges.filter((e) => { const stored = c.edges[e]; if (stored && t - stored.at >= CONTACTS.edgeMs) { delete c.edges[e]; return false } return Boolean(stored) })
      if (keep.length !== mine.edges.length) mine.edges = keep
      if (!keep.length && t - mine.at >= CONTACTS.edgeMs) delete c.mine[id]
      if (++n >= 200) return
    }
  }
  return { status, declare, match, foundFor, forget, sweep }
}

/** ERASURE (server/admin/erasure-data.ts). */
export function forgetContactsPlayers(db: Db, ids: ReadonlySet<string>): void {
  const c = peekContacts(db)
  if (!c) return
  for (const id of ids) {
    const me = c.me[id]
    if (me && c.keys[me.key] === id) delete c.keys[me.key]
    delete c.me[id]
    for (const e of c.mine[id]?.edges ?? []) delete c.edges[e]
    delete c.mine[id]; delete c.found[id]
  }
  for (const f of Object.values(c.found)) f.ids = f.ids.filter((x) => !ids.has(x))
}
