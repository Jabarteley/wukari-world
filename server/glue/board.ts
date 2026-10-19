/**
 * OWNER: social
 * THE GIST BOARD (docs/SOCIAL-GLUE.md): a confessions-style board per community (`crew:<id>`, a community, not a crew of friends) and per
 * campus (`campus:unilag`). Readers never see who wrote a post. Moderators do (the community's founder and moderators; an admin
 * anywhere), and so does the AI reviewer. Anonymous apps without these guardrails (NGL, Yik Yak) were overrun by bullying, so:
 *
 *   WHO       members of the community read it (a locals-only community's members all hold the badge), current students read the campus
 *             board; adults among them post. Nobody else sees that the board exists.
 *   NO NAMES  a post naming a member of the board (their name or handle) or any @mention is refused before anything is stored
 *             (src/glue/model.ts namesPerson). On a campus board the names screened are of the students who opened it lately.
 *   REVIEWER  every post is read by the AI reviewer (server/feed/review.ts judge) before anyone sees it, told it is an anonymous board and
 *             who wrote it (their name and how many of their posts were taken down). Keep: it goes up. Anything else: refused, with the
 *             reason to its author, and a strike. No answer: it waits, is tried again on the heartbeat, then left for a moderator.
 *   REPORTS   two members reporting a post take it off and send it back to the reviewer. "This is about me" takes it off AT ONCE and back
 *             to the reviewer; even if the reviewer keeps it, it stays off until a moderator puts it back.
 *   REMOVAL   the author removes their own; a moderator or an admin removes any (a strike) or restores it.
 *   LIMITS    five posts a Lagos day, one a minute, the same words not twice in an hour, three "about me" reports a day; three strikes in
 *             thirty days bar the author from that board for a week. A post ends after a week.
 * Portable: no Node imports.
 */
import { BOARD_FACTS, GLUE, NAMED_REASON, boardKeyOf, cleanGist, namesPerson } from '../../src/glue/model.ts'
import type { BoardKey } from '../../src/glue/model.ts'
import type { GistBoardView, GistPostView } from '../../src/types/glue.ts'
import { lagosTime } from '../../src/game/clock.ts'
import { screenText } from '../moderation/text.ts'
import { peekFeed } from '../feed/data.ts'
import { glueOf, peekGlue } from './data.ts'
import type { BoardRecord, GistRecord } from './data.ts'
import { glueKit, no } from './common.ts'
import type { No } from './common.ts'
import { inboxLine } from './inbox.ts'
import type { InboxPush } from './inbox.ts'
import type { Db, RouteContext, SessionRecord } from '../types.ts'

const STUDYING = new Set(['matriculated', 'studying', 'deferred'])
type Access = { key: BoardKey; name: string; read: boolean; moderator: boolean; why?: string; members: string[] }

export function boardService(ctx: RouteContext) {
  const kit = glueKit(ctx), now = (): number => ctx.now()

  /** A current UNILAG student, from the stored life (the campus's own rule). */
  function student(db: Db, id: string): boolean {
    const session = ctx.core?.sessionByPublicId?.(db, id)
    const status = (session?.cities?.lagos?.state as { unilagStudent?: { status?: string } } | undefined)?.unilagStudent?.status
    return typeof status === 'string' && STUDYING.has(status)
  }
  /** What this person may do with a board, and who its members are (for the names screen). */
  function access(db: Db, key: BoardKey, id: string, admin: boolean): Access | No {
    if (key === 'campus:unilag') {
      const read = admin || student(db, id)
      if (!read) return no('students_only', 'The campus gist board is for current students of the University of Lagos.')
      return { key, name: 'UNILAG gist', read, moderator: admin, members: peekGlue(db)?.boards[key]?.seen ?? [] }
    }
    const crew = peekFeed(db)?.crews[key.slice(5)]
    if (!crew || crew.banned || !crew.kind || crew.kind === 'crew') return no('unknown_board', 'That community has no gist board.')
    const member = crew.members.includes(id)
    if (!member && !admin) return no('members_only', `The gist board of ${crew.name} is for its members.`)
    return { key, name: `${crew.name} gist`, read: true, moderator: admin || crew.owner === id || (crew.mods ?? []).includes(id), members: crew.members }
  }
  const live = (p: GistRecord): boolean => p.status === 'live' && now() - p.at < GLUE.board.lifeMs
  function postView(db: Db, p: GistRecord, viewer: string, moderator: boolean): GistPostView {
    const mine = p.by === viewer
    return { id: p.id, body: p.body, at: p.at, same: p.same?.length ?? 0, sameMine: Boolean(p.same?.includes(viewer)), mine,
      ...(mine && (p.status === 'review' || p.status === 'refused' || p.status === 'held') ? { status: p.status } : {}),
      ...(mine && p.status === 'refused' && p.reason ? { reason: p.reason } : {}),
      // The author's name is in a moderator's view only. Nothing else in a reader's view says who wrote it.
      ...(moderator ? { by: { id: p.by, name: kit.nameOf(db, p.by) }, reports: p.reports?.length ?? 0, aboutMe: p.aboutMe?.length ?? 0 } : {}) }
  }
  const strikesOf = (b: BoardRecord | undefined, id: string): number => (b?.strikes?.[id] ?? []).filter((at) => now() - at < GLUE.board.strikeWindowMs).length
  function barredUntil(b: BoardRecord | undefined, id: string): number { const until = b?.bars?.[id]; return until && until > now() ? until : 0 }
  function strike(b: BoardRecord, id: string): void {
    const list = ((b.strikes ??= {})[id] ??= []).filter((at) => now() - at < GLUE.board.strikeWindowMs)
    list.push(now()); b.strikes[id] = list
    if (list.length >= GLUE.board.strikes) (b.bars ??= {})[id] = now() + GLUE.board.barMs
  }

  function board(db: Db, session: SessionRecord, rawKey: unknown, admin: boolean): GistBoardView | No {
    const key = boardKeyOf(rawKey); if (!key) return no('unknown_board', 'That board was not found.')
    const a = access(db, key, session.publicId, admin); if ('ok' in a) return a
    const me = session.publicId, b = peekGlue(db)?.boards[key], posts = peekGlue(db)?.posts ?? {}
    const all = (b?.posts ?? []).map((id) => posts[id]).filter((p): p is GistRecord => Boolean(p))
    // Not filtered by blocks: hiding a blocked person's posts would tell the reader who wrote them (block someone, see what disappears).
    const shown = all.filter(live).sort((x, y) => y.at - x.at).slice(0, GLUE.board.perPage).map((p) => postView(db, p, me, a.moderator))
    const mine = all.filter((p) => p.by === me && (p.status === 'review' || p.status === 'refused' || p.status === 'held')).slice(-5).map((p) => postView(db, p, me, false))
    const held = a.moderator ? all.filter((p) => p.status === 'held' || (p.status === 'review' && (p.tries ?? 0) >= GLUE.board.reviewTries)).slice(-30).map((p) => postView(db, p, me, true)) : undefined
    const why = !kit.adult(db, me) ? 'Posting is for people confirmed as 18 or older.' : barredUntil(b, me) ? 'You cannot post here for a while: too many of your posts were taken down.' : undefined
    return { ok: true, key, name: a.name, posts: shown, mine, canPost: !why, ...(why ? { why } : {}), moderator: a.moderator, ...(held ? { held } : {}) }
  }
  /** A reader of a campus board joins the names that board screens for (newest last, 300 kept). */
  function noteReader(db: Db, key: BoardKey, id: string): void {
    if (key !== 'campus:unilag') return
    const b = glueOf(ctx, db).boards[key] ??= { posts: [] }
    const seen = (b.seen ??= []).filter((x) => x !== id); seen.push(id); while (seen.length > 300) seen.shift(); b.seen = seen
  }
  function post(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; post: GistPostView; review: string } | No {
    const key = boardKeyOf(body.board); if (!key) return no('unknown_board', 'That board was not found.')
    const me = session.publicId
    const a = access(db, key, me, false); if ('ok' in a) return a
    if (!kit.adult(db, me)) return no('adults_only', 'Posting on a gist board is for people confirmed as 18 or older.')
    const muted = ctx.checks?.muted?.(me); if (muted) return no(muted.code, muted.reason)
    const g = glueOf(ctx, db), b = g.boards[key] ??= { posts: [] }
    if (barredUntil(b, me)) return no('barred', 'You cannot post on this board for a week: three of your posts were taken down.')
    const text = cleanGist(body.body)
    if (text.length < GLUE.board.min) return no('too_short', 'Say a little more.')
    const names = a.members.filter((id) => id !== me).map((id) => ({ name: kit.nameOf(db, id), handle: peekFeed(db)?.authors[id]?.handle ?? null }))
    if (namesPerson(text, names)) return no('names_person', NAMED_REASON)
    const bad = screenText(text, { what: 'The post', contact: true }); if (bad) return no(bad.code, bad.reason)
    const day = lagosTime(now()).day, d = g.days[me]?.d === day ? g.days[me]! : (g.days[me] = { d: day, n: 0, about: 0 })
    if (d.n >= GLUE.board.perDay) return no('daily_limit', 'You have posted enough gist today.')
    if (d.last && now() - d.last < GLUE.board.gapMs) return no('slow_down', 'Wait a minute before the next one.')
    if (b.posts.some((id) => { const p = g.posts[id]; return p && p.by === me && p.body === text && now() - p.at < GLUE.board.repeatMs })) return no('duplicate', 'You posted that already.')
    const p: GistRecord = { id: `G${(++g.seq).toString(36)}${ctx.randomId().slice(0, 4)}`, board: key, by: me, body: text, at: now(), status: 'review' }
    g.posts[p.id] = p; b.posts.push(p.id); d.n += 1; d.last = now()
    while (b.posts.length > GLUE.board.kept) delete g.posts[b.posts.shift()!]
    g.queue.push(p.id); while (g.queue.length > 200) g.queue.shift()
    return { ok: true, post: postView(db, p, me, false), review: p.id }
  }
  const find = (db: Db, id: unknown): GistRecord | undefined => (typeof id === 'string' ? peekGlue(db)?.posts[id] : undefined)
  /** "Same" (+1), or take it back. */
  function same(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; post: GistPostView } | No {
    const p = find(db, body.id), me = session.publicId
    if (!p || !live(p)) return no('unknown_post', 'That post is not on the board.')
    const a = access(db, p.board as BoardKey, me, false); if ('ok' in a) return a
    const list = (p.same ?? []).filter((x) => x !== me)
    if (body.on !== false) list.push(me)
    p.same = list.slice(-500)
    return { ok: true, post: postView(db, p, me, a.moderator) }
  }
  /** A report (two send it back to the reviewer), or "this is about me" (off at once, back to the reviewer, then a moderator). */
  function report(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; review: string | null } | No {
    const p = find(db, body.id), me = session.publicId
    if (!p || p.status !== 'live') return no('unknown_post', 'That post is not on the board.')
    const a = access(db, p.board as BoardKey, me, false); if ('ok' in a) return a
    if (p.by === me) return no('own_post', 'That is your own post. Remove it instead.')
    const g = glueOf(ctx, db)
    if (body.aboutMe === true) {
      const day = lagosTime(now()).day, d = g.days[me]?.d === day ? g.days[me]! : (g.days[me] = { d: day, n: 0, about: 0 })
      if (d.about >= GLUE.board.aboutMePerDay) return no('daily_limit', 'You have reported enough posts as about you today. A moderator will look at the others.')
      d.about += 1
      p.aboutMe = [...new Set([...(p.aboutMe ?? []), me])]
      p.status = 'held'; p.tries = 0
      g.queue.push(p.id)
      return { ok: true, review: p.id }
    }
    p.reports = [...new Set([...(p.reports ?? []), me])]
    if (p.reports.length >= GLUE.board.reportsToReview) { p.status = 'review'; p.tries = 0; g.queue.push(p.id); return { ok: true, review: p.id } }
    return { ok: true, review: null }
  }
  /** The author removes their own; a moderator or an admin removes (a strike) or restores. */
  function moderate(db: Db, session: SessionRecord, body: Record<string, unknown>, admin: boolean): { ok: true; push: InboxPush } | No {
    const p = find(db, body.id), me = session.publicId, push: InboxPush = []
    if (!p || p.status === 'removed') return no('unknown_post', 'That post was not found.')
    const b = glueOf(ctx, db).boards[p.board] ??= { posts: [] }
    if (body.action === 'remove' && p.by === me) { p.status = 'removed'; p.off = 'author'; return { ok: true, push } }
    const a = access(db, p.board as BoardKey, me, admin); if ('ok' in a) return a
    if (!a.moderator) return no('not_moderator', 'Only the moderators of this board can do that.')
    if (body.action === 'remove') {
      p.status = 'removed'; p.off = admin ? 'admin' : 'mod'; strike(b, p.by)
      inboxLine(ctx, db, p.by, { kind: 'moderation', text: `Your post on ${a.name} was taken down by a moderator.` }, push)
      return { ok: true, push }
    }
    if (body.action === 'restore') { p.status = 'live'; delete p.reason; delete p.off; p.reports = []; p.aboutMe = []; return { ok: true, push } }
    return no('invalid_action', 'Remove or restore.')
  }
  /** What the reviewer is told: the words, that the board is anonymous, who wrote it, and why it is being read again. */
  function toReview(db: Db, id: string): { text: string; facts: string } | null {
    const p = peekGlue(db)?.posts[id]
    if (!p || (p.status !== 'review' && p.status !== 'held')) return null
    const b = peekGlue(db)?.boards[p.board]
    const why = p.aboutMe?.length ? ` ${p.aboutMe.length} member(s) said this post is about them.` : p.reports?.length ? ` ${p.reports.length} members reported it.` : ''
    return { text: p.body, facts: `${BOARD_FACTS} Written by "${kit.nameOf(db, p.by)}", ${strikesOf(b, p.by)} of whose posts were taken down this month.${why}` }
  }
  /** The reviewer's answer. A post someone said is about them is never put back by the reviewer alone. */
  function reviewed(db: Db, id: string, verdict: { action: 'keep' | 'hide' | 'remove'; reason: string } | null): InboxPush {
    const g = peekGlue(db), p = g?.posts[id], push: InboxPush = []
    if (!g || !p || (p.status !== 'review' && p.status !== 'held')) return push
    if (!verdict) { p.tries = (p.tries ?? 0) + 1; return push }
    g.queue = g.queue.filter((x) => x !== id)
    if (verdict.action === 'keep') { if (p.status === 'review') { p.status = 'live'; delete p.reason; p.reports = [] } return push }
    const was = p.status
    p.status = was === 'held' ? 'removed' : 'refused'; p.off = 'ai'; p.reason = verdict.reason || 'This post cannot go on the board.'
    strike(g.boards[p.board] ??= { posts: [] }, p.by)
    if (was === 'held') inboxLine(ctx, db, p.by, { kind: 'moderation', text: `Your post on a gist board was taken down: ${p.reason}` }, push)
    return push
  }
  /** Posts the heartbeat sends to the reviewer again (bounded). */
  const pending = (db: Db): string[] => (peekGlue(db)?.queue ?? []).filter((id) => { const p = peekGlue(db)!.posts[id]; return p && (p.status === 'review' || p.status === 'held') && (p.tries ?? 0) < GLUE.board.reviewTries }).slice(0, 3)
  return { board, noteReader, post, same, report, moderate, toReview, reviewed, pending, access }
}

/** ERASURE: a person's posts go; their "same", reports and "about me" are taken back; their strikes, bars and reads are forgotten. */
export function forgetBoards(db: Db, ids: ReadonlySet<string>): void {
  const g = peekGlue(db)
  if (!g?.posts) return
  for (const p of Object.values(g.posts)) {
    if (ids.has(p.by)) { delete g.posts[p.id]; const b = g.boards[p.board]; if (b) b.posts = b.posts.filter((x) => x !== p.id); continue }
    if (p.same) p.same = p.same.filter((x) => !ids.has(x))
    if (p.reports) p.reports = p.reports.filter((x) => !ids.has(x))
    if (p.aboutMe) p.aboutMe = p.aboutMe.filter((x) => !ids.has(x))
  }
  g.queue = (g.queue ?? []).filter((x) => g.posts[x])
  for (const b of Object.values(g.boards)) {
    for (const id of ids) { delete b.strikes?.[id]; delete b.bars?.[id] }
    if (b.seen) b.seen = b.seen.filter((x) => !ids.has(x))
  }
  for (const id of ids) delete g.days[id]
}
