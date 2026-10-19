/**
 * OWNER: growth
 * Share links: a short code that maps, on this server, to a few facts taken from the sharer's own
 * life, and the small HTML page a chat app's crawler reads to draw a link preview.
 *
 * THE PAGE (/s/<code>) is static HTML with Open Graph and Twitter tags in <head>: the crawlers of
 * WhatsApp, X, Telegram and Facebook do not run JavaScript, so a page that needs a script shows an
 * empty preview. A person who opens it is sent on to the game (`/?join=<publicId>&ref=<code>`) by a meta refresh and
 * has an ordinary link as well; no script runs on the page at all. Every value written into it is
 * escaped, and the only player-chosen text is the sharer's name, which the text filter has passed.
 * An unknown or expired code gives the game's general preview and leads to the game.
 */
import { publicWedding } from '../residents/bonds.ts';
import { lagosTime } from '../../src/game/clock.ts';
import { viewLife } from '../../src/life.ts';
import { lgaOf } from '../../src/game/content/world.ts';
import { cityContent, cityRules } from '../../src/game/cities/index.ts';
import { placeFacts, streetPlace } from '../../src/paths.ts';
import { hasPlace } from '../../src/game/systems/estate.ts';
import { isGuestLife } from '../../src/game/systems/onboarding.ts';
import { BRAND, TAGLINE, SHARE_KINDS, cardImage, cleanFacts, isShareCode, sharePreview, shareTarget } from '../../src/game/share-model.ts';
import type { ShareOffer } from '../../src/game/share-model.ts';
import { eventsBetween } from '../../src/game/calendar.ts';
import { GAME_LABELS } from '../../src/tables/places.ts';
import { withBoardGames } from '../../src/tables/derive.ts';
import { peekRecords, keyOf } from '../records/store.ts';
import { KEEP_MS, itemByNumber, peekGist } from '../gist/ledger.ts';
import { LIMITS, playerOf, sweep } from './data.ts';
import { count } from './metrics.ts';
import { homeTitleOf } from '../spaces/store.ts';
import type { CityId } from '../../src/types/protocol.ts';
import type { LifeState } from '../../src/types/life.ts';
import type { ShareFacts, ShareKind } from '../../src/types/growth.ts';
import type { Db, GrowthCollection, GrowthPlayerRecord, RouteContext, SessionRecord, ShareRecord } from '../types.ts';

export const OG_IMAGE = cardImage('invite').path;
const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
const no = <Code extends string>(code: Code, reason: string): { ok: false; code: Code; reason: string } => ({ ok: false, code, reason });

/** The public record entries a card may carry. A ruling can name a person who was tried, so it is left out. */
const ELECTION_KINDS: readonly string[] = ['term'];
const NEWS_KINDS: readonly string[] = ['term', 'law', 'party', 'impeachment'];
type PublicEntry = { n: number; kind: string; title: string; scopeName: string };
/** One entry of the public record, or null. Only the fields a card may say are read. */
export function publicEntry(db: Db, n: unknown): PublicEntry | null {
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 1) return null;
  const found = peekRecords(db).entries[keyOf(n)];
  return found ? { n: found.n, kind: found.kind, title: String(found.title), scopeName: String(found.scopeName) } : null;
}

/** One line of the city gist, or null: only its words, its city and its number. */
export function publicGist(db: Db, n: unknown, now: number): { n: number; text: string; city: string } | null {
  const found = itemByNumber(peekGist(db), n);
  return found && found.at > now - KEEP_MS ? { n: found.n, text: found.text, city: found.city } : null;
}

/** The facts of a share, read from the sharer's settled life. Nothing comes from the request but the kind (and an event id). */
export function factsFor(kind: ShareKind, session: Pick<SessionRecord, 'name'>, state: LifeState, cityId: CityId, now: number, player: GrowthPlayerRecord, eventId?: unknown, tableId?: unknown, publicRecord?: PublicEntry | null, publicLine?: { n: number; text: string; city: string } | null, wedding?: { a: string; b: string; city: string } | null, space = '', street?: { city?: string; place?: string } | null): Partial<ShareFacts> | null {
  const actualCity: CityId = typeof state.estate?.city === 'string' && cityRules(state.estate.city) ? state.estate.city : cityId;
  const view = viewLife(state, { now, cityId: actualCity });
  // Where the sharer lives: the local government of their own house, or the district of the home they rent. A guest (no
  // home yet) and a life whose local government is only the game's guess say nothing about where they live.
  const unit = hasPlace(state) && state.estate.living === 'own' ? lgaOf(state.estate.city, state.estate.lga) : null;
  const district = unit ? unit.name : !isGuestLife(state) && state.estate?.living !== 'own' ? cityRules(actualCity)?.districts?.find((item) => item.id === state.property?.house)?.name ?? '' : '';
  const base = { kind, name: session.name, district, city: cityRules(actualCity)?.name ?? actualCity };
  if (kind === 'missions') return { ...base, done: view.missions.dailySet.done, total: view.missions.dailySet.total || 3, days: view.missions.activeDays, title: view.missions.title ?? '' };
  if (kind === 'week') return { ...base, stamps: view.missions.stamps.days, days: view.missions.activeDays, title: view.missions.title ?? '' };
  if (kind === 'table') {
    // With a table id: an invitation to that table. Without: the caller's last result.
    const content = cityContent(actualCity), place = typeof tableId === 'string' ? withBoardGames(content.venues, content.tablePlaces).find((item) => item.id === tableId) ?? null : null;
    if (place) {
      const game = Object.hasOwn(GAME_LABELS, place.game) ? (GAME_LABELS as Readonly<Record<string, string>>)[place.game] : null;
      const venue = content.venues.find((item) => item.id === place.venueId);
      return game && venue ? { ...base, game, tableId: place.id, venue: venue.name } : null;
    }
    if (!player.table) return null;
    const tableCity = player.table.cityId ?? 'lagos';
    return { ...base, city: cityRules(tableCity)?.name ?? tableCity, district: tableCity === actualCity ? base.district : '', game: player.table.label, won: player.table.won };
  }
  // A civic card says one line of the public record (server/records/store.ts): names and counts that anyone may read in the Hall of Records, never who voted for whom.
  if (kind === 'election' || kind === 'news') return publicRecord && (kind === 'news' ? NEWS_KINDS : ELECTION_KINDS).includes(publicRecord.kind) ? { ...base, headline: publicRecord.title, record: publicRecord.n, city: publicRecord.scopeName || base.city } : null;
  // A gist card says one public line of the city gist (server/gist/ledger.ts): words that anyone may read there, no id, no amounts.
  if (kind === 'gist') return publicLine ? { ...base, headline: publicLine.text, record: publicLine.n, city: publicLine.city === 'world' ? base.city : cityRules(publicLine.city)?.name ?? base.city } : null;
  // A wedding card says the two public first names of a resident wedding that was announced in the gist and has opened (server/residents/bonds.ts publicWedding),
  // and the city: nothing about how close anyone was. Players have no marriages yet, so without such a wedding there is nothing to share.
  if (kind === 'wedding') return wedding ? { ...base, name: wedding.a, partner: wedding.b, city: cityRules(wedding.city)?.name ?? base.city } : null;
  // A designed home (server/spaces/store.ts): its title passed the text filter and agentWords when it was applied.
  if (kind === 'space') return space ? { ...base, headline: space } : null;
  // A street card names an open city and, when asked, one of its local units or districts, as the city's rules name them (src/paths.ts
  // streetPlace): never anything the request wrote. It says nothing of where the sharer lives (base.district is replaced by the place).
  if (kind === 'street') {
    const city = typeof street?.city === 'string' ? street.city : actualCity, facts = placeFacts(city), found = street?.place ? streetPlace(city, street.place) : null;
    if (!facts?.open || (street?.place && !found)) return null;
    return { ...base, city: facts.name, district: found?.name ?? '', place: found ? `${facts.id}/${found.id}` : facts.id };
  }
  if (kind === 'event') {
    const event = eventsBetween(now, now + 8 * 86400000, cityId).find((item) => item.id === eventId);
    return event ? { ...base, event: event.title, venue: event.venueLabel } : null;
  }
  return base;
}

/** Make (or find again) the caller's share link of one kind. Runs inside a store transaction. */
export function createShare(ctx: Pick<RouteContext, 'now' | 'fail' | 'randomId'>, db: Db, g: GrowthCollection, session: SessionRecord, state: LifeState, cityId: CityId, body: Record<string, unknown>) {
  const now = ctx.now(), kind = SHARE_KINDS.find((item) => item === body.kind);
  if (!kind) throw ctx.fail(400, 'invalid_share_kind');
  if (body.event !== undefined && (typeof body.event !== 'string' || !/^[a-z0-9-]{1,40}$/.test(body.event))) throw ctx.fail(400, 'invalid_event');
  if (body.record !== undefined && (typeof body.record !== 'number' || !Number.isSafeInteger(body.record) || body.record < 1)) throw ctx.fail(400, 'invalid_record');
  const player = playerOf(g, session.publicId);
  if (!player) return no('server_full', 'Sharing is not available right now. Try again later.');
  if (body.wedding !== undefined && (typeof body.wedding !== 'string' || !/^[a-z]-[0-9]{1,6}$/.test(body.wedding))) throw ctx.fail(400, 'invalid_wedding');
  if (body.table !== undefined && (typeof body.table !== 'string' || !/^[a-z0-9-]{1,40}$/.test(body.table))) throw ctx.fail(400, 'invalid_table');
  for (const key of ['city', 'place'] as const) if (body[key] !== undefined && (typeof body[key] !== 'string' || !/^[a-z0-9-]{1,40}$/.test(body[key]))) throw ctx.fail(400, 'invalid_place');
  const raw = factsFor(kind, session, state, cityId, now, player, body.event, body.table, kind === 'election' || kind === 'news' ? publicEntry(db, body.record) : null, kind === 'gist' ? publicGist(db, body.record, now) : null, kind === 'wedding' ? publicWedding((db as Record<string, unknown>)['bonds'], body.wedding) : null, kind === 'space' ? homeTitleOf(db, session.publicId) : '', kind === 'street' ? { ...(typeof body.city === 'string' ? { city: body.city } : {}), ...(typeof body.place === 'string' ? { place: body.place } : {}) } : null);
  if (!raw) return no('nothing_to_share', kind === 'space' ? 'Design your home first (Houses → Design with AI), then share it.' : kind === 'table' ? 'Finish a table game first, then share the result.' : kind === 'wedding' ? 'There is no wedding to share just now.' : kind === 'election' || kind === 'news' ? 'That entry of the public record could not be found.' : kind === 'gist' ? 'That line of the gist is gone. Open the Gist again.' : kind === 'street' ? 'That place cannot be shared yet.' : 'That event is not on this week.');
  const facts = cleanFacts(raw), text = JSON.stringify(facts);
  sweep(g, now);
  // The same card twice is the same link: a second tap on Share makes nothing new.
  const day = lagosTime(now).day;
  const existing = Object.entries(g.shares).find(([, share]) => share.by === session.publicId && lagosTime(share.at).day === day && JSON.stringify(share.facts) === text);
  if (existing) return { ok: true, code: 'shared', share: { code: existing[0], path: `/s/${existing[0]}`, facts } };
  if (player.shares.day !== day) player.shares = { day, n: 0 };
  if (player.shares.n >= LIMITS.sharesPerDay) return no('share_limit', `You have made ${LIMITS.sharesPerDay} share links today. The ones you made still work.`);
  if (Object.keys(g.shares).length >= LIMITS.shares) return no('server_full', 'Sharing is not available right now. Try again later.');
  let code = '';
  for (let tries = 0; tries < 5 && (!code || Object.hasOwn(g.shares, code)); tries++) code = ctx.randomId().replace(/-/g, '').slice(0, 10);
  if (!isShareCode(code) || Object.hasOwn(g.shares, code)) return no('server_full', 'Sharing is not available right now. Try again later.');
  const actualCity: CityId = typeof state.estate?.city === 'string' && cityRules(state.estate.city) ? state.estate.city : cityId;
  g.shares[code] = { cityId: actualCity, by: session.publicId, kind, at: now, facts, opened: 0, joined: 0 };
  player.shares.n += 1;
  count(g, now, actualCity, `share.made.${kind}`);
  return { ok: true, code: 'shared', share: { code, path: `/s/${code}`, facts } };
}

/** A stored, unexpired share, or null. */
export function findShare(g: GrowthCollection, code: unknown, now: number): ShareRecord | null {
  if (typeof code !== 'string' || !isShareCode(code) || !Object.hasOwn(g.shares, code)) return null;
  const share = g.shares[code];
  if (!share) return null;
  return share.at >= now - LIMITS.shareDays * 86400000 ? share : null;
}

/** Only http(s) origins made of host characters are written into a page; anything else falls back to relative links. */
export const safeOrigin = (origin: unknown): string => (typeof origin === 'string' && /^https?:\/\/[A-Za-z0-9.-]{1,253}(:\d{1,5})?$/.test(origin) ? origin : '');

/**
 * The preview page. `share` may be null (unknown code): the general preview.
 * `origin` is e.g. "https://play.example" or ''.
 */
export function sharePageHtml(share: Pick<ShareRecord, 'by' | 'facts'> | null, code: unknown, origin: unknown = '', offer: ShareOffer | null = null, source = ''): string {
  const base = safeOrigin(origin);
  const preview = share ? sharePreview(share.facts, offer) : { title: `${BRAND}: a digital world you can live in`, description: TAGLINE };
  // People are sent on to the game's own landing hook (shareTarget, src/game/share-model.ts): `join` places a new visitor with the
  // sharer (their venue, their door, or a table), `ref` is this share code, which the game attaches as a referral once the visitor's
  // life exists, and `source` is the ad-source words the shared link carried, so the visit is counted under them.
  const target = shareTarget(share, code, source);
  const url = `${base}${share && isShareCode(code) ? `/s/${code}` : '/'}`;
  const picture = share ? cardImage(share.facts?.kind) : cardImage('invite'), image = `${base}${picture.path}`;
  const title = esc(preview.title), description = esc(preview.description);
  const alt = picture.path === OG_IMAGE ? `${esc(BRAND)}: friends, homes and a yellow danfo in a miniature waterfront neighbourhood` : title;
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(BRAND)}"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}">
<link rel="canonical" href="${esc(url)}"><meta property="og:locale" content="en_NG"><meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(image)}"><meta property="og:image:width" content="1200"><meta property="og:image:type" content="${picture.type}"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${alt}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${esc(image)}">
<meta name="robots" content="noindex, nofollow"><meta http-equiv="refresh" content="0;url=${esc(target)}">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#183b2a;color:#fff;font:16px/1.5 system-ui,sans-serif;text-align:center}main{padding:24px;max-width:420px}a{display:inline-block;margin-top:16px;padding:12px 22px;border-radius:999px;background:#e8a643;color:#20232c;font-weight:700;text-decoration:none}</style></head>
<body><main><h1>${title}</h1><p>${description}</p><a href="${esc(target)}">Open ${esc(BRAND)}</a></main></body></html>`;
}
