/**
 * OWNER: watch (docs/ALLWORLD-HOUSE.md "Artist premieres")
 * ARTISTS AND PREMIERES on the server (the rules are src/watch/premiere.ts). An adult applies; the application and the name are seen only
 * by them and the admins until an admin approves (WOW-PLAN decision 6). An approved artist turns one of their own Plans events into a
 * premiere, optionally in one of their worlds (whose shared screen plays the track). Tickets are Earn's (docs/EARN.md): the artist sets a
 * price on the event in Plans as any host does, or leaves it free. Nothing here moves money.
 */
import { WEEKDAYS, lagosTime } from '../../src/game/clock.ts';
import { PREMIERE, cleanApplication, cleanPremiere, frontRow, mayApply, premiereGist, premierePhase } from '../../src/watch/premiere.ts';
import type { ArtistRecord } from '../../src/watch/premiere.ts';
import { screenText } from '../moderation/text.ts';
import { gistService, WORLD } from '../gist/ledger.ts';
import { peekFeed } from '../feed/data.ts';
import { peekEarn } from '../earn/data.ts';
import { peekWatch, watchOf } from './data.ts';
import { shownName } from './predictions.ts';
import type { ArtistView, PremiereView, PremieresView } from '../../src/types/watch.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';

type Refused = { ok: false; code: string; reason: string };
const no = (code: string, reason: string): Refused => ({ ok: false, code, reason });
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
/** "on Saturday at 20:00" (Lagos time). */
export const whenWords = (ms: number): string => { const t = lagosTime(ms); return `on ${WEEKDAYS[t.weekday]} at ${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`; };

export function premieresService(ctx: RouteContext) {
  const now = (): number => ctx.now();
  const artistView = (item: ArtistRecord): ArtistView => ({ name: item.name, about: item.about, links: [...item.links], track: item.track, status: item.status, at: item.at, ...(item.reason ? { reason: item.reason } : {}) });

  function apply(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; artist: ArtistView } | Refused {
    const id = session.publicId;
    if (ctx.checks?.adult?.(db, id) !== true) return no('adults_only', 'Artists apply as adults. Say you are 18 or older in Settings first.');
    const muted = ctx.checks?.muted?.(id); if (muted) return no('muted', muted.reason);
    const col = watchOf(ctx, db), may = mayApply(col.artists[id], now());
    if (!may.ok) return no('not_now', may.reason);
    const done = cleanApplication(body);
    if (!done.ok) return no('invalid_application', done.reason);
    for (const [text, what] of [[done.value.name, 'Your artist name'], [done.value.about, 'Your words']] as const) { const bad = text ? screenText(text, { contact: true, what }) : null; if (bad) return no(bad.code, bad.reason); }
    col.artists[id] = { ...done.value, status: 'pending', at: now() };
    return { ok: true, artist: artistView(col.artists[id]!) };
  }

  /** An approved artist schedules a premiere on one of their Plans events (inside a transaction). */
  function schedule(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; premiere: PremiereView } | Refused {
    const id = session.publicId, col = watchOf(ctx, db), artist = col.artists[id];
    if (artist?.status !== 'approved') return no('not_approved', 'Apply as an artist first; an admin approves you.');
    const done = cleanPremiere(body);
    if (!done.ok) return no('invalid_premiere', done.reason);
    const event = peekFeed(db)?.events[done.event];
    if (!event || event.gone || event.by !== id) return no('unknown_event', 'Choose one of your own events in Plans.');
    if (event.end <= now()) return no('event_over', 'That event is over.');
    if (Object.values(col.premieres).some((item) => record(item) && item.event === event.id && !item.gone)) return no('already', 'That event is a premiere already.');
    const upcoming = Object.values(col.premieres).filter((item) => record(item) && item.by === id && !item.gone && (peekFeed(db)?.events[item.event]?.end ?? 0) > now());
    if (upcoming.length >= PREMIERE.upcoming) return no('one_at_a_time', 'You have a premiere coming up. One at a time.');
    if (done.world) {
      const spaces = (db as Record<string, unknown>).spaces as { worlds?: Record<string, { by?: string } | undefined> } | undefined, world = record(spaces?.worlds) ? spaces.worlds[done.world] : undefined;
      if (!world || world.by !== id) return no('unknown_world', 'Choose one of your own worlds.');
    }
    const pid = `p${(++col.seq).toString(36)}${ctx.randomId().replace(/-/g, '').slice(0, 4)}`;
    const line = gistService(ctx).add(db, { city: WORLD, kind: 'event', text: premiereGist(artist.name, event.title, whenWords(event.start)), refs: { key: `premiere:${pid}` } })?.n;
    col.premieres[pid] = { id: pid, by: id, event: event.id, ...(done.world ? { world: done.world } : {}), track: artist.track, at: now(), ...(line ? { line } : {}) };
    return { ok: true, premiere: premiereView(db, pid, id)! };
  }
  function cancel(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true } | Refused {
    const col = watchOf(ctx, db), item = typeof body.id === 'string' ? col.premieres[body.id] : undefined;
    if (!item || item.gone || item.by !== session.publicId) return no('unknown_premiere', 'That premiere was not found.');
    item.gone = 1;
    return { ok: true };
  }

  /** One premiere as `viewer` sees it, or null when it is gone or its event is. */
  function premiereView(db: Db, pid: string, viewer: string | null): PremiereView | null {
    const col = peekWatch(db), item = col.premieres[pid], artist = item ? col.artists[item.by] : undefined;
    const event = item ? peekFeed(db)?.events[item.event] : undefined;
    if (!item || item.gone || !event || event.gone || artist?.status !== 'approved') return null;
    const phase = premierePhase(event, now()), price = peekEarn(db)?.prices[event.id], tickets = price ? peekEarn(db)?.tickets[event.id] ?? [] : null;
    const row = frontRow(item.by, event.going, tickets);
    const mine = viewer === item.by;
    return {
      id: pid, artist: artist.name, title: event.title, start: event.start, end: event.end, phase, event: event.id, place: event.label,
      ...(item.world ? { world: item.world } : {}), ...(price ? { price } : {}), going: event.going.length,
      ...(phase !== 'upcoming' || mine ? { track: item.track } : {}),
      front: row.map((id) => shownName(ctx, db, id)),
      ...(viewer ? { me: { artist: mine, front: row.includes(viewer), going: event.going.includes(viewer), ...(tickets?.includes(viewer) ? { ticket: true } : {}) } } : {}),
      ...(item.line ? { line: item.line } : {}),
    };
  }
  function list(db: Db, viewer: string | null): PremieresView {
    const col = peekWatch(db), t = now();
    const items = Object.keys(col.premieres).map((pid) => premiereView(db, pid, viewer)).filter((item): item is PremiereView => item !== null && item.end > t - PREMIERE.keepMs)
      .sort((a, b) => (a.phase === 'over' ? 1 : 0) - (b.phase === 'over' ? 1 : 0) || a.start - b.start).slice(0, PREMIERE.list);
    const mine = viewer ? col.artists[viewer] : undefined;
    const events = viewer && mine?.status === 'approved' ? Object.values(peekFeed(db)?.events ?? {}).filter((e) => record(e) && e.by === viewer && !e.gone && e.end > t).map((e) => ({ id: e.id, title: e.title, start: e.start })).slice(0, 20) : [];
    return { now: t, premieres: items, ...(mine ? { artist: artistView(mine) } : {}), events };
  }

  /** The admin's queue: every application, pending first, and the premieres. */
  function adminList(db: Db) {
    const col = peekWatch(db);
    const artists = Object.entries(col.artists).filter(([, item]) => record(item)).map(([id, item]) => ({ id, ...artistView(item) }))
      .sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) || b.at - a.at).slice(0, 100);
    const premieres = Object.keys(col.premieres).map((pid) => premiereView(db, pid, null)).filter((item): item is PremiereView => item !== null);
    return { artists, premieres };
  }
  /** An admin's answer to an application (inside a transaction). */
  function decide(db: Db, id: unknown, approve: boolean, reason: unknown): { ok: true; summary: string } | Refused {
    const col = watchOf(ctx, db), item = typeof id === 'string' ? col.artists[id] : undefined;
    if (!item) return no('unknown_artist', 'No application from that player.');
    item.status = approve ? 'approved' : 'declined'; item.decidedAt = now();
    const why = typeof reason === 'string' ? reason.replace(/\s+/g, ' ').trim().slice(0, 200) : '';
    if (!approve && why) item.reason = why; else delete item.reason;
    if (!approve) for (const premiere of Object.values(col.premieres)) if (record(premiere) && premiere.by === id) premiere.gone = 1;
    return { ok: true, summary: `artist ${approve ? 'approved' : 'declined'}: ${item.name}` };
  }
  function remove(db: Db, pid: unknown): { ok: true; summary: string } | Refused {
    const col = watchOf(ctx, db), item = typeof pid === 'string' ? col.premieres[pid] : undefined;
    if (!item || item.gone) return no('unknown_premiere', 'No premiere has that id.');
    item.gone = 1;
    return { ok: true, summary: `premiere removed: ${item.id}` };
  }

  return { apply, schedule, cancel, list, premiereView, adminList, decide, remove };
}
