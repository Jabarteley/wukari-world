/**
 * OWNER: agents (prayers, docs/PRAYERS.md)
 * PRAYERS AND THE ACTS OF THE OWNER: the shapes, the limits and the words, pure and portable (no Node imports, no storage). The service
 * (service.ts) keeps them; the admin routes and the player route (routes/prayers.ts) call the service; the lazy panel of the game
 * (src/app/features/prayers) shows NOTICE before a player prays.
 *
 * THE RULES THAT HOLD (FEATURES.md "Seven rules" 7, DESIGN.md Part 8): an act of the owner is public and indirect, never one person
 * silently punished and never a message from the owner. Acts never touch real money, purchases, accounts or chat. A person is not
 * sickened more than once a week and a minor (or a player whose age is unknown) is never sickened.
 */

/** Said to a player before they pray; the panel shows it and the route refuses a prayer sent without it having been shown. */
export const NOTICE = 'Prayers are read by the people who run Allworld.';
/** The line the game shows when a prayer is received: no promise of an answer, no faith preferred. */
export const RECEIVED = 'Your prayer was received. Not every prayer is answered in a way you can see.';

export const ACT_KINDS = ['heal', 'sicken', 'give', 'take', 'bless', 'weather', 'dream', 'cross', 'silence'] as const;
export type ActKind = typeof ACT_KINDS[number];
export const SKIES = ['clear', 'cloud', 'lrain', 'rain', 'storm', 'hot'] as const;
export type Sky = typeof SKIES[number];

/** Every bound has a name. */
export const LIMITS = Object.freeze({
  prayerMin: 4, prayerMax: 240,
  /** A player may pray this many times in 24 hours. A resident prays once a day (resident.ts). */
  playerPerDay: 3,
  prayersKept: 600, logKept: 2000,
  /** One person is sickened at most once in this long. */
  sickGapMs: 7 * 86400000,
  /** A resident who is sickened feels it this long; a player's sickness runs its own course (src/game/systems/health.ts). */
  residentSickMs: 6 * 3600000,
  /** A blessing: the most naira it adds to the stall's till, once per stall per Lagos day. */
  blessMax: 2000,
  /** Game money given or taken by one act, on top of the admin limits (server/admin/config.ts). */
  moneyMax: 100000,
  weatherHoursMax: 6, weatherHoursMin: 1,
  dreamMin: 8, dreamMax: 140,
  /** A dream or a sign: at most this many for one person in 24 hours. */
  dreamsPerDay: 1,
  reasonMin: 3, reasonMax: 200,
  /** What a resident keeps of the dreams it was given. */
  dreamsKept: 3,
  /** A crossing of two paths lasts this long. */
  crossingMs: 12 * 3600000,
});

export interface PrayerItem {
  n: number
  at: number
  by: 'resident' | 'player'
  /** A public id (a player) or a resident id. Read by admins only, never by the gist or any public route. */
  who: string
  name: string
  city: string
  /** The venue the prayer was said in, or null. */
  venue: string | null
  text: string
  /** A short line of the person's situation as the server knew it then (health, money band); for the admin page only. */
  situation: string
  minor?: true
  answered?: { at: number; act: ActKind; line: number }
}
export interface PrayersCollection { v: 1; seq: number; items: PrayerItem[] }

export interface ActLine {
  n: number
  at: number
  /** The admin's short reference and name. */
  admin: string
  adminName: string
  kind: ActKind
  targetKind: 'player' | 'resident' | 'city' | 'shop' | 'pair' | 'none'
  target: string
  targetName: string
  city: string
  /** The prayer this answered, or null. */
  prayer: number | null
  params: Record<string, string | number>
  summary: string
  reason: string
  /** The number of the gist line the act made, or null. */
  gist: number | null
}
/** What the owner has done to a resident (residents have no life record of their own): the resident reads it into its next turns. */
export interface Fate { sickUntil?: number; dreams?: { at: number; text: string }[]; cross?: { venue: string; city: string; until: number } }
export interface ActsCollection {
  v: 1
  seq: number
  lines: ActLine[]
  /** When each person was last sickened (public id or resident id), for the once-a-week rule; entries older than the gap are dropped. */
  sickened: Record<string, number>
  /** Lagos day of each stall's last blessing, by the owner's public id. */
  blessed: Record<string, number>
  /** When each person last had a dream or a sign. */
  dreamt: Record<string, number>
  fates: Record<string, Fate>
}
export const emptyActs = (): ActsCollection => ({ v: 1, seq: 0, lines: [], sickened: {}, blessed: {}, dreamt: {}, fates: {} });
export const emptyPrayers = (): PrayersCollection => ({ v: 1, seq: 0, items: [] });

/** Words a person never reads about what the world is made of (the same list the residents live by). */
export const clean = (text: unknown, max: number): string => String(text ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/** The text of a prayer, or why it is refused. */
export function prayerText(raw: unknown): { ok: true; text: string } | { ok: false; code: 'invalid_prayer'; reason: string } {
  const text = clean(raw, LIMITS.prayerMax + 1);
  if (text.length < LIMITS.prayerMin || text.length > LIMITS.prayerMax) return { ok: false, code: 'invalid_prayer', reason: `A prayer is ${LIMITS.prayerMin} to ${LIMITS.prayerMax} characters.` };
  return { ok: true, text };
}

// ---- the words the world uses for an act (the gist and the person's own Updates) ----------------------------------------------------

/** The line the gist carries. `{0}` stands for a named person; only a confirmed adult is named, and only when the line is kind. */
export interface GistWords { text: string; named?: true }
export const SKY_WORDS: Readonly<Record<Sky, (city: string) => string>> = Object.freeze({
  clear: (city) => `A clear sky opened over ${city}`,
  cloud: (city) => `Clouds gathered over ${city}`,
  lrain: (city) => `A light rain came over ${city}`,
  rain: (city) => `Rain came early over ${city}`,
  storm: (city) => `Thunder rolled over ${city}`,
  hot: (city) => `A hot spell settled on ${city}`,
});
/** The gist line of an act, or null when the act is not for the gist. No amounts, no reasons, no ids. */
export function gistWords(kind: ActKind, place: string, extra: { sky?: Sky } = {}): GistWords | null {
  switch (kind) {
    case 'heal': return { text: '{0} is on the mend', named: true };
    case 'sicken': return { text: `A fever is going round ${place}` };
    case 'give': return { text: '{0} had a stroke of luck this week', named: true };
    case 'take': return { text: `A few households in ${place} felt the pinch this week` };
    case 'bless': return { text: `Customers kept coming to a stall in ${place} all day` };
    case 'weather': return { text: SKY_WORDS[extra.sky ?? 'clear'](place) };
    default: return null;
  }
}
/** What the person themselves reads in their Updates: in the world's own voice, never "the owner", "an admin" or "a prayer". */
export const PERSON_WORDS = Object.freeze({
  heal: 'You woke up feeling much better.',
  sicken: 'You feel a fever coming on. Rest, and see the doctor if it stays.',
  give: (amount: string) => `A bit of luck: you came across ${amount}.`,
  take: (amount: string) => `Money slipped away today: ${amount} is gone from your cash.`,
  bless: 'A good day at the stall: customers kept coming.',
  dream: (text: string) => `A dream stayed with you: ${text}`,
  sign: (text: string) => `You noticed a sign: ${text}`,
  cross: (place: string) => `Something keeps pulling you towards ${place} today.`,
});

/** What the owner has done to a resident, read from a stored document (a read: nothing is created). */
export function fateIn(db: object, id: string): Fate | null {
  const col = (db as Record<string, unknown>)['ownerActs'];
  const fates = col !== null && typeof col === 'object' ? (col as { fates?: unknown }).fates : undefined;
  const found = fates !== null && typeof fates === 'object' && Object.hasOwn(fates as object, id) ? (fates as Record<string, unknown>)[id] : undefined;
  return found !== null && typeof found === 'object' ? found as Fate : null;
}
