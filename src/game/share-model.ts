/**
 * OWNER: growth
 * Everything a share says, as pure functions: the link-preview title and description (used by the
 * server's /s/<code> page), the text that goes to WhatsApp or X, and the data the browser draws
 * the picture card from. No DOM, no I/O.
 *
 * WORDS COME FROM HERE, NEVER FROM A PLAYER. A share carries a small record of facts the server
 * took from the sharer's own life (`ShareFacts`); the only player-chosen text in it is the name,
 * which has already passed the server's text filter. Nothing a visitor types reaches a preview.
 *
 * EMOJI. The game draws no emoji on its own screens. Text that LEAVES the game for a chat app is
 * the one exception (the owner's decision): squares and a few symbols are the native format there.
 *
 * ShareKind and ShareFacts (the fields of a facts record and what each means) are in src/types/growth.ts.
 */
import { isRecord } from './util.ts';
import { cleanSourceWord } from './attribution.ts';
import type { ShareFacts, ShareKind } from '../types/growth.ts';

export const SHARE_KINDS: readonly ShareKind[] = Object.freeze(['invite', 'house', 'missions', 'week', 'table', 'event', 'wedding', 'election', 'news', 'gist', 'space']);
const KIND_NAMES: readonly string[] = SHARE_KINDS;
const isKind = (value: unknown): value is ShareKind => typeof value === 'string' && KIND_NAMES.includes(value);
export const BRAND = 'Allworld';
export const TAGLINE = 'A whole world to live in.';

const clip = (value: unknown, max: number): string => { const text = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim(); return text.length > max ? `${text.slice(0, max - 1)}…` : text; };
const count = (value: unknown, max = 100000): number => (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? Math.min(value, max) : 0);
const days = (n: number): string => `${n} day${n === 1 ? '' : 's'}`;

/** A facts record reduced to known fields of bounded size. Unknown kinds become 'invite'. */
export function cleanFacts(input: unknown): ShareFacts {
  const facts: Record<string, unknown> = isRecord(input) ? input : {};
  const kind = isKind(facts.kind) ? facts.kind : 'invite';
  return { kind, name: clip(facts.name, 24) || 'A resident', district: clip(facts.district, 24), city: clip(facts.city, 24) || 'Lagos',
    done: count(facts.done, 9), total: count(facts.total, 9), days: count(facts.days), stamps: count(facts.stamps, 7), title: clip(facts.title, 24),
    game: clip(facts.game, 24), won: facts.won === true, event: clip(facts.event, 48), venue: clip(facts.venue, 32),
    tableId: typeof facts.tableId === 'string' && /^[a-z0-9-]{1,40}$/.test(facts.tableId) ? facts.tableId : '',
    partner: clip(facts.partner, 24), headline: clip(facts.headline, 120), record: count(facts.record, 999999999) };
}

/** The launch offer as GET /api/world/bonus tells it (server/bonus/service.ts). */
export interface ShareOffer { on: boolean; amount: number; places: number }
/** "The first 10,000 players get at least ₦1,000,000 in the game" (more in a dearer starting city: server/bonus/service.ts) while the offer is open, else ''. In-game naira, said so. */
export function offerSentence(offer: ShareOffer | null | undefined): string {
  if (!offer || offer.on !== true || !(offer.amount > 0) || !(offer.places > 0)) return '';
  return `The first ${offer.places.toLocaleString('en-NG')} players get at least ₦${offer.amount.toLocaleString('en-NG')} in the game`;
}

/**
 * Title and description for the link preview (Open Graph). Plain text; the page escapes it.
 * While the launch offer is open its one sentence ends the description.
 */
export function sharePreview(facts: unknown, offer?: ShareOffer | null): { title: string; description: string } {
  const made = previewOf(facts), line = offerSentence(offer);
  return line ? { title: made.title, description: `${made.description} ${line}.` } : made;
}
function previewOf(facts: unknown): { title: string; description: string } {
  const f = cleanFacts(facts), place = f.district ? `${f.district}, ${f.city}` : f.city;
  switch (f.kind) {
    case 'house': return { title: `Come to ${f.name}’s house in ${place}`, description: `Knock at the door in ${BRAND}. No sign-up: pick a name and walk in.` };
    case 'space': return { title: `${f.name}’s place in ${place}`, description: `${f.headline ? `“${f.headline}”. ` : ''}Come and see it in ${BRAND}. No sign-up: pick a name and walk in.` };
    case 'missions': return { title: `${f.name} finished ${f.done} of ${f.total || 3} missions today`, description: `${days(f.days)} in ${f.city}${f.title ? ` · ${f.title}` : ''}. Start your own life in ${BRAND}.` };
    case 'week': return { title: `${f.name}’s week in ${f.city}`, description: `${f.stamps} of 7 days played · ${days(f.days)} in the city${f.title ? ` · ${f.title}` : ''}.` };
    case 'table': return f.tableId ? { title: `Come and play ${f.game || 'a game'} with ${f.name}`, description: `${f.name} is at a table${f.venue ? ` at ${f.venue}` : ''} in ${BRAND}. Sit down or watch. No sign-up.` }
      : { title: f.won ? `${f.name} just won at ${f.game || 'the table'}` : `${f.name} is at the ${f.game || 'games'} table`, description: `Pull up a chair in ${BRAND}. Whot at the buka, with real people.` };
    case 'event': return { title: `${f.event || 'Something is on'} · ${f.venue || f.city}`, description: `${f.name} is going. Meet them there in ${BRAND}.` };
    case 'wedding': return { title: f.partner ? `${f.name} and ${f.partner} just got married` : `${f.name} just got married`, description: `Come and celebrate with them in ${f.city}, in ${BRAND}. No sign-up: pick a name and walk in.` };
    case 'election': return { title: f.headline || `An election result in ${f.city}`, description: `From the public record of ${f.city}. Vote in the next election in ${BRAND}. No sign-up.` };
    case 'gist': // a line of the city gist is shared like public news
    case 'news': return { title: f.headline || `News from ${f.city}`, description: `From the public record of ${f.city}. See what is happening in ${BRAND}. No sign-up.` };
    default: return { title: `Join ${f.name} in ${BRAND}`, description: `${f.name} lives in ${place}, in a world of real cities. Make your character, get a job, and come through. No sign-up.` };
  }
}

const SQUARE = { on: '🟩', off: '⬜' };
/**
 * The text that leaves the game. The link is always the last line on its own, so it can be removed.
 * `facts` is a ShareFacts record (cleaned here again); `link` is the absolute URL of the share page.
 */
export function shareText(facts: unknown, link = '', offer?: ShareOffer | null): string {
  const f = cleanFacts(facts), lines: string[] = [];
  if (f.kind === 'missions') {
    const total = f.total || 3;
    lines.push(`${BRAND} · day ${f.days} in ${f.city}`, `${SQUARE.on.repeat(Math.min(f.done, total))}${SQUARE.off.repeat(Math.max(0, total - f.done))} ${f.done}/${total} missions`);
    if (f.title) lines.push(`⭐ ${f.title}`);
  } else if (f.kind === 'week') {
    lines.push(`${BRAND} · my week in ${f.city}`, `${SQUARE.on.repeat(f.stamps)}${SQUARE.off.repeat(7 - f.stamps)} ${f.stamps}/7 days`, `${days(f.days)} in the city${f.title ? ` · ⭐ ${f.title}` : ''}`);
  } else if (f.kind === 'table') lines.push(...(f.tableId ? [`Come and play ${f.game} with me${f.venue ? ` at ${f.venue}` : ''} 🃏`, `I am at the table in ${BRAND}. Tap to sit down.`] : [f.won ? `I just won at ${f.game} in ${BRAND} 🏆` : `I am at the ${f.game} table in ${BRAND}`, 'Come and play me.']));
  else if (f.kind === 'house') lines.push(`Come to my house in ${f.district || f.city} 🏠`, `Knock in ${BRAND}. No sign-up.`);
  else if (f.kind === 'space') lines.push(`I designed my place in ${BRAND}${f.headline ? `: ${f.headline}` : ''} 🏠`, 'Come and see it. No sign-up.');
  else if (f.kind === 'event') lines.push(`${f.event} · ${f.venue}`, `I am going. Meet me there in ${BRAND}.`);
  else if (f.kind === 'wedding') lines.push(`${f.partner ? `${f.name} and ${f.partner} are` : `${f.name} is`} married in ${BRAND} 💍`, 'Come and celebrate with us.');
  else if (f.kind === 'election') lines.push(`${f.headline || `The election in ${f.city} is decided`} 🗳️`, `See the result in ${BRAND}.`);
  else if (f.kind === 'news' || f.kind === 'gist') lines.push(`${f.headline || `News from ${f.city}`} 📰`, `Read it in ${BRAND}.`);
  else lines.push(`I live in ${BRAND} now: a world of real cities. Find me in ${f.district || f.city}.`, 'Make your character and come through. No sign-up.');
  const line = offerSentence(offer);
  if (line) lines.push(line);
  if (link) lines.push(link);
  return lines.join('\n');
}

/** What the picture card shows: plain fields for the canvas painter (src/ui/share.ts). */
export interface ShareCard {
  kicker: string
  headline: string
  lines: string[]
  squares: boolean[]
  footer: string
}
export function shareCard(facts: unknown): ShareCard {
  const f = cleanFacts(facts), place = f.district ? `${f.district}, ${f.city}` : f.city;
  const base: Pick<ShareCard, 'kicker' | 'squares' | 'footer'> = { kicker: BRAND.toUpperCase(), squares: [], footer: 'Play free in your browser' };
  if (f.kind === 'missions') return { ...base, headline: `${f.done}/${f.total || 3} missions today`, lines: [f.name, `${days(f.days)} in ${f.city}`, ...(f.title ? [f.title] : [])], squares: Array.from({ length: f.total || 3 }, (_, index) => index < f.done) };
  if (f.kind === 'week') return { ...base, headline: `My week in ${f.city}`, lines: [f.name, `${f.stamps} of 7 days played`, `${days(f.days)} in the city`], squares: Array.from({ length: 7 }, (_, index) => index < f.stamps) };
  if (f.kind === 'table') return { ...base, headline: f.tableId ? `Come and play ${f.game}` : f.won ? `Won at ${f.game}` : `At the ${f.game} table`, lines: [f.name, f.venue || place, f.tableId ? 'A seat is open' : 'Come and play me'] };
  if (f.kind === 'wedding') return { ...base, headline: f.partner ? `${f.name} and ${f.partner}` : f.name, lines: ['Just got married', f.city, 'Come and celebrate'] };
  if (f.kind === 'election') return { ...base, headline: f.headline || 'The election is decided', lines: [f.city, 'From the public record'] };
  if (f.kind === 'news' || f.kind === 'gist') return { ...base, headline: f.headline || `News from ${f.city}`, lines: [f.city, 'From the public record'] };
  if (f.kind === 'house') return { ...base, headline: 'Come to my house', lines: [f.name, place, 'Knock at the door'] };
  if (f.kind === 'space') return { ...base, headline: f.headline || 'Come and see my place', lines: [f.name, place, 'Come and see it'] };
  if (f.kind === 'event') return { ...base, headline: f.event, lines: [f.venue, `${f.name} is going`] };
  return { ...base, headline: `Come and live in ${BRAND}`, lines: [f.name, f.district ? `Home in ${place}` : `Now in ${f.city}`, 'Make your character and come through'] };
}

const CODE = /^[a-z0-9]{8,16}$/;
export const isShareCode = (value: unknown): boolean => typeof value === 'string' && CODE.test(value);
/** The share code in a link or a bare code (`…/s/<code>`, `?ref=<code>`, `?s=<code>`), or null. */
export function shareCodeFrom(text: unknown): string | null {
  const match = /(?:\/s\/|[?&](?:s|ref)=|^)([a-z0-9]{8,16})(?:[/?#&]|$)/.exec(String(text ?? '').trim());
  return match ? match[1] ?? null : null; // group 1 always takes part in a match
}
/** Where a button for one channel points. `text` already ends with the link. */
export const whatsappUrl = (text: string): string => `https://wa.me/?text=${encodeURIComponent(text)}`;
export const xUrl = (text: string): string => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;

// ---- the link a share sends, its picture and where it lands ----------------------------------------

/** The preview picture of a kind: a path on the site and its type. Kinds without their own picture keep the game's general one. Files: public/og/card-*.png (scripts/make-share-cards.ts). */
export function cardImage(kind: unknown): { path: string; type: 'image/png' | 'image/jpeg' } {
  return kind === 'table' || kind === 'wedding' || kind === 'election' || kind === 'news' || kind === 'gist' ? { path: `/og/card-${kind === 'gist' ? 'news' : kind}.png`, type: 'image/png' } : { path: '/og/allworld.jpg', type: 'image/jpeg' };
}

/** The ad-source words every shared link carries (the same `utm_` words the owner's ads use, src/game/attribution.ts): the source is the share itself, the medium its channel, the campaign its kind. */
export function sourceWords(kind: unknown, channel = 'card', source = 'share'): string {
  return `utm_source=${cleanSourceWord(source, 'share')}&utm_medium=${cleanSourceWord(channel, 'card')}&utm_campaign=${cleanSourceWord(kind, 'invite')}`;
}
/** A share page's link with the ad-source words added; `link` is the absolute address of `/s/<code>`. A clip from Capture says `source` 'clip' (the link is the player's profile, not a share page). */
export const shareUrl = (link: string, kind: unknown, channel = 'card', source = 'share'): string => `${link}${link.includes('?') ? '&' : '?'}${sourceWords(kind, channel, source)}`;
/** The ad-source words of a share page's own address (`?utm_…`), cleaned, as a query string without its `?` ('' when there are none). */
export function sourceQuery(query: { get(name: string): string | null } | null | undefined): string {
  const source = query?.get('utm_source'), medium = query?.get('utm_medium'), campaign = query?.get('utm_campaign');
  if (!source || !campaign) return '';
  return `utm_source=${cleanSourceWord(source)}&utm_medium=${cleanSourceWord(medium)}&utm_campaign=${cleanSourceWord(campaign)}`;
}

/**
 * Where a person who opens a share is sent: the game's own landing hook (src/quick-start/model.ts), so a new visitor is placed
 * by the quick start and a returning player goes straight there. A civic card (election, news) opens the Governor's panel;
 * every other kind lands the visitor beside the sharer (and at the table, when the link names one). `ref` attaches the referral.
 */
export function shareTarget(share: { by?: string; facts?: unknown } | null, code: unknown, query = ''): string {
  const tail = query ? `&${query}` : '';
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!share || !isShareCode(code)) return '/';
  const f = cleanFacts(share.facts);
  if (f.kind === 'election' || f.kind === 'news') return `/?go=governor&ref=${code}${tail}`;
  if (!uuid.test(share.by ?? '')) return '/';
  return `/?join=${share.by}&ref=${code}${f.tableId ? `&table=${f.tableId}` : ''}${tail}`;
}
