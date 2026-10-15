/**
 * OWNER: agents (residents, docs/RESIDENTS.md "Phase 20")
 * RESIDENTS' OWN RELATIONSHIPS AND WORLD EVENTS: friendships, quarrels, marriages, weddings and (only when the owner says so) a farewell, between the thirty
 * residents. Portable (no Node imports); the wiring to the heartbeat, the gist and the admin page is server/residents/bonds-link.ts.
 *
 * BY RULES (no model, no cost):
 *   - CLOSENESS (0..100) between two residents grows from their talks (+3, resident.ts note each one), from a day spent in the same place (+1) and from a chosen
 *     visit (+2), at most DAY_CAP a day for a pair; it decays by 1 a day after IDLE_DAYS without contact. Under FRIEND_AT there is no bond; FRIEND_AT is "friends",
 *     BEST_AT "best friends". A marriage needs MARRY_AT held for MARRY_DAYS days (weeks of closeness), so at the fastest about four weeks.
 *   - PERSONALITY comes from the life stories: faith, interests the stories share, and a hot or calm temper read from the words of the story (traitsOf, fit). A low fit
 *     makes a quarrel likelier and a marriage impossible; a high fit does not make one happen.
 *   - A QUARREL is only a silence: closeness stops growing and drops a little. It ends when a resident chooses to make up, or it fades after QUARREL_FADE_DAYS (and
 *     costs a little more closeness). No shouting, no violence, no third person, nothing about money; and it is never put in the gist or on a profile.
 * BY THEIR OWN VALIDATED CHOICES (one short model call each, the resident's own model, the residents' budget, JSON checked in code, thrown away if wrong):
 *   - "propose" / "not_yet" (asked of one of two residents who are eligible), "accept" / "not_yet" (asked of the other), "make_up" / "not_yet", "visit_friend" / "stay".
 *   A marriage happens only when one has chosen "propose" and the other, later, "accept". Nothing is decided by a failed call. Each resident is married at most
 *   once; there is no divorce, no cheating, nothing sexual, no children (all residents are adults and the cast does not grow).
 * WEDDINGS: after the accept a wedding is set for the next Saturday at least WEDDING_LEAD_DAYS away, 16:00 in the city, at the square, the park or the market. An aso-ebi
 *   colour is picked (Phase 16's COLOURS). Both stand at the venue from an hour before to WEDDING_HOURS after; the marriage starts when it opens. The gist says
 *   "Kemi and Femi are getting married on Saturday at the Square" and, when it opens, that they are married. The wedding share card (docs/SHARE-CARDS.md) is made from
 *   a wedding that has opened and been announced: `publicWedding`.
 * FUNERALS: only when the owner lists a resident key in the setting `residentFarewell` (an owner act, never a game rule, never for a person). The resident stops living,
 *   a quiet notice goes in the gist ("Friends gather ... to remember Bisi") and the spouse and best friends stand at the place on the Sunday. Two a week at most.
 * SHADOW: everything above happens on paper (the admin page shows it, "would announce ..."); nothing is announced, said, or shown on a profile, and nobody sees a resident
 *   standing at a venue. With residentCount 1 (or fewer than two residents running) nothing happens at all.
 */
import { COLOURS } from '../../src/festivals/party.ts';
import { agentWords } from '../moderation/agent-words.ts';
import { OUT_OF_CHARACTER, residentId } from './life.ts';
import type { Resident } from './life.ts';

export const DAY_MS = 86400000, HOUR_MS = 3600000;
export const BOND = Object.freeze({
  talkGain: 3, placeGain: 1, visitGain: 2, dayCap: 8, friendAt: 20, bestAt: 50, marryAt: 80, marryDays: 21, idleDays: 2, decay: 1, marriedFloor: 60,
  quarrelHit: 12, quarrelFadeDays: 6, quarrelFadeHit: 5, quarrelGapDays: 5, makeUpGain: 8, makeUpAfterDays: 1, proposalDays: 5, waitDays: 7,
  weddingLeadDays: 5, weddingHour: 16, weddingHours: 3, weddingGapDays: 7, maxWeddings: 8, funeralLeadDays: 2, funeralHour: 15, funeralHours: 2, funeralsPerWeek: 2,
  callsPerDay: 24, maxPairs: 300, eventsKept: 40, logKept: 60, minFit: 0.4, saveMs: 20000,
});

export interface Bond {
  a: string; b: string; c: number
  /** The last UTC day they had contact (a talk, a day in the same place, a visit), the UTC day of the latest gain and how much came that day. */
  last: number; gainDay: number; gain: number
  /** Days spent at MARRY_AT or above (weeks of closeness). */
  high: number
  quarrel?: number
  asked?: { by: string; day: number }
  /** Not before this UTC day (after a "not yet"). */
  wait?: number
  wedding?: string
  married?: number
  placeDay?: number
}
export interface EventRec {
  id: string; kind: 'wedding' | 'funeral'; city: string; room: string; label: string
  /** The couple (wedding) or the one remembered (funeral), and their public first names; guests are the others who stand there. */
  who: string[]; names: string[]; guests: string[]
  at: number; until: number; colour: string
  announced: boolean; opened: boolean; done: boolean
}
export interface LogLine { at: number; text: string }
export interface BondsStored { v: 1; day: number; seq: number; pairs: Record<string, Bond>; events: EventRec[]; log: LogLine[]; departed: string[]; calls: { day: number; n: number } }
export const emptyBonds = (): BondsStored => ({ v: 1, day: -1, seq: 0, pairs: {}, events: [], log: [], departed: [], calls: { day: -1, n: 0 } });

const hash = (text: string): number => { let h = 2166136261; for (const char of text) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const pairKey = (x: string, y: string): string => (x < y ? `${x}|${y}` : `${y}|${x}`);
export const dayOf = (t: number): number => Math.floor(t / DAY_MS);
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ---- personality, from the life stories --------------------------------------------------------------------------------------------------------
export interface Traits { faith: string; interests: string[]; hot: boolean }
const FAITHS: readonly [string, RegExp][] = [['catholic', /\bcatholic\b/i], ['muslim', /\bmuslim\b/i], ['hindu', /\bhindu\b/i], ['jewish', /\bjewish\b|\bshabbat\b/i], ['sikh', /\bsikh\b/i], ['yoruba', /\bold yoruba ways\b|\borisa\b/i], ['christian', /\bchristian\b|\bchurch\b/i]];
const INTERESTS: readonly [string, RegExp][] = [['music', /\bmusic|songs?|highlife|choir|guitar\b/i], ['football', /\bfootball\b/i], ['books', /\bbooks?|novels?|library|reading\b/i], ['cooking', /\bcook\w*|kitchen|soup\b/i], ['garden', /\bgarden\w*|flowers?|plants?\b/i],
  ['walks', /\bwalks?\b/i], ['sea', /\bsea|beach|ocean\b/i], ['children', /\bchildren|kids|school\b/i], ['art', /\bpaint\w*|sketch\w*|drawing|art\b/i], ['radio', /\bradio\b/i], ['dance', /\bdanc\w+/i], ['tea', /\btea\b/i]];
export function traitsOf(who: Resident): Traits {
  const story = who.story, faith = FAITHS.find(([, pattern]) => pattern.test(story))?.[0] ?? 'none';
  return { faith, interests: INTERESTS.filter(([, pattern]) => pattern.test(story)).map(([name]) => name), hot: /\b(?:temper|stubborn|quick to (?:anger|argue)|short fuse|proud)\b/i.test(story) };
}
/** How well two lives fit, 0..1: the same faith, shared interests (three at most count), and a hot temper on either side counts against. */
export function fit(a: Traits, b: Traits): number {
  const shared = a.interests.filter((name) => b.interests.includes(name)).length;
  const value = 0.35 + (a.faith === b.faith && a.faith !== 'none' ? 0.15 : 0) + Math.min(3, shared) * 0.1 - (a.hot ? 0.1 : 0) - (b.hot ? 0.1 : 0);
  return Math.max(0, Math.min(1, value));
}

// ---- closeness ---------------------------------------------------------------------------------------------------------------------------------
export const blankBond = (x: string, y: string, day: number): Bond => { const [a, b] = x < y ? [x, y] : [y, x]; return { a, b, c: 0, last: day, gainDay: -1, gain: 0, high: 0 }; };
/** Add closeness, at most DAY_CAP a day for the pair; a quarrel stops it; contact is noted either way. */
export function grow(bond: Bond, amount: number, day: number): number {
  bond.last = day;
  if (bond.quarrel !== undefined) return 0;
  if (bond.gainDay !== day) { bond.gainDay = day; bond.gain = 0; }
  const given = Math.max(0, Math.min(amount, BOND.dayCap - bond.gain, 100 - bond.c));
  bond.gain += given; bond.c += given;
  return given;
}
export type Stage = 'married' | 'best' | 'friends' | null;
export const stageOf = (bond: Bond): Stage => (bond.married !== undefined ? 'married' : bond.c >= BOND.bestAt ? 'best' : bond.c >= BOND.friendAt ? 'friends' : null);
/** One day passes for one bond: idle decay, a quarrel that fades, a proposal that lapses, days of closeness counted. Returns false when the bond is gone. */
export function dayPasses(bond: Bond, day: number): boolean {
  if (bond.married !== undefined) { if (bond.c < BOND.marriedFloor) bond.c = BOND.marriedFloor; return true; }
  if (day - bond.last > BOND.idleDays) bond.c = Math.max(0, bond.c - BOND.decay);
  if (bond.quarrel !== undefined && day - bond.quarrel >= BOND.quarrelFadeDays) { delete bond.quarrel; bond.c = Math.max(0, bond.c - BOND.quarrelFadeHit); bond.high = 0; }
  if (bond.asked && day - bond.asked.day > BOND.proposalDays) { delete bond.asked; bond.wait = day + BOND.waitDays; }
  if (bond.c >= BOND.marryAt && bond.quarrel === undefined) bond.high += 1; else if (bond.c < BOND.marryAt - 10) bond.high = 0;
  return bond.c > 0;
}
/** The chance in a hundred that a talk between two friends ends in a quarrel: more when they fit badly or one is hot. */
export const quarrelChance = (fitness: number, hot: boolean): number => (fitness < BOND.minFit ? 10 : hot ? 5 : 2);
export function quarrels(bond: Bond, day: number, roll: number, chance: number): boolean {
  if (bond.married !== undefined || bond.quarrel !== undefined || bond.c < BOND.friendAt || bond.wedding !== undefined) return false;
  if (roll >= chance) return false;
  bond.quarrel = day; bond.c = Math.max(0, bond.c - BOND.quarrelHit); bond.high = 0; delete bond.asked;
  return true;
}
/** May this bond lead to a marriage now (the rules; the two choices are still needed)? */
export function marriageReady(bond: Bond, day: number, fitness: number, singles: boolean, sameCity: boolean): boolean {
  return singles && sameCity && bond.married === undefined && bond.wedding === undefined && bond.quarrel === undefined && bond.asked === undefined && bond.c >= BOND.marryAt && bond.high >= BOND.marryDays && fitness >= BOND.minFit && (bond.wait ?? -1) <= day;
}

// ---- the choices -------------------------------------------------------------------------------------------------------------------------------
export type Task = 'propose' | 'accept' | 'make_up' | 'visit';
export const OFFER: Readonly<Record<Task, readonly [string, string]>> = Object.freeze({ propose: ['propose', 'not_yet'], accept: ['accept', 'not_yet'], make_up: ['make_up', 'not_yet'], visit: ['visit_friend', 'stay'] });
export const JOIN = 'All of this is private to you and you share none of it. Reply with only JSON like {"choice":"<one of the two words>"}, nothing else.';
export function askText(task: Task, name: string): string {
  switch (task) {
    case 'propose': return `Over many weeks you and ${name} have grown very close. You both live in the same city, you are both free to marry, and nothing is unsettled between you. You may ask ${name} to marry you, or wait a while. Choose "propose" or "not_yet". ${JOIN}`;
    case 'accept': return `${name}, who has become very dear to you, has asked you to marry them. Choose "accept" if you truly want this, or "not_yet" if you do not; saying not yet is fine and nobody will be hurt. ${JOIN}`;
    case 'make_up': return `A few days ago you and ${name} had a disagreement and have kept apart since. You may go and put it right, or leave it a while longer. Choose "make_up" or "not_yet". ${JOIN}`;
    case 'visit': return `You have a free hour and your friend ${name} would be good company. Choose "visit_friend" to spend it with them, or "stay" to keep to your own plans. ${JOIN}`;
  }
}
/** The check of a reply: in character, JSON with a `choice` from the two offered. Anything else is no choice. */
export function judgeChoice(raw: string, task: Task): string | null {
  const text = String(raw ?? '');
  if (OUT_OF_CHARACTER.test(text)) return null;
  const from = text.indexOf('{'), to = text.lastIndexOf('}');
  if (from < 0 || to <= from) return null;
  try {
    const parsed = JSON.parse(text.slice(from, to + 1)) as unknown;
    const choice = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>)['choice'] : undefined;
    return typeof choice === 'string' && (OFFER[task] as readonly string[]).includes(choice) ? choice : null;
  } catch { return null; }
}

// ---- time of an event --------------------------------------------------------------------------------------------------------------------------
/** The first moment at least `leadDays` after `t` that is `weekday` (0 = Sunday) at `hour` in a city `offsetMin` east of UTC. */
export function nextAt(t: number, offsetMin: number, weekday: number, hour: number, leadDays: number): number {
  const shift = offsetMin * 60000, local = t + leadDays * DAY_MS + shift;
  let day = Math.floor(local / DAY_MS);
  while ((day + 4) % 7 !== weekday) day += 1;
  return day * DAY_MS + hour * HOUR_MS - shift;
}
export const weekdayName = (t: number, offsetMin: number): string => WEEKDAYS[(Math.floor((t + offsetMin * 60000) / DAY_MS) + 4) % 7]!;

// ---- words -------------------------------------------------------------------------------------------------------------------------------------
/** The public lines. They carry first names, a weekday and a place, and nothing about how close anyone is, who asked whom, or any quarrel. */
export const weddingAnnouncement = (names: readonly string[], day: string, label: string): string => `${names[0]} and ${names[1]} are getting married on ${day} at ${label}`;
export const weddingOpened = (names: readonly string[], label: string): string => `${names[0]} and ${names[1]} are married. The celebration is at ${label} now`;
export const funeralNotice = (name: string, day: string, label: string): string => `Friends gather at ${label} on ${day} to remember ${name}`;
export const welcomeLine = (colour: string): string => `Welcome, everyone, and thank you for coming. The aso-ebi today is ${colour}.`;
export const colourFor = (id: string): string => COLOURS[hash(id) % COLOURS.length]!.label.toLowerCase();

/** The short public line on a resident's profile, or null: married, else best friends, else friends (the closest bond; never a quarrel, never a number). */
export function profileLine(stored: BondsStored, id: string, nameOf: (id: string) => string, gone: ReadonlySet<string> = new Set(stored.departed)): string | null {
  let best: Bond | null = null;
  for (const bond of Object.values(stored.pairs)) {
    if (bond.a !== id && bond.b !== id) continue;
    const rank = (item: Bond): number => (item.married !== undefined ? 1000 : 0) + item.c;
    if (stageOf(bond) && (!best || rank(bond) > rank(best))) best = bond;
  }
  if (!best) return null;
  const other = best.a === id ? best.b : best.a, name = nameOf(other), stage = stageOf(best);
  if (stage === 'married') return gone.has(other) ? `Remembers ${name}` : `Married to ${name}`;
  if (gone.has(other)) return null;
  return stage === 'best' ? `Best friends with ${name}` : `Friends with ${name}`;
}

/** What a wedding card may say: the public first names and the city, only for a wedding that was announced and has opened. */
export function publicWedding(stored: unknown, id: unknown): { a: string; b: string; city: string } | null {
  if (typeof id !== 'string' || typeof stored !== 'object' || stored === null) return null;
  const events = (stored as Partial<BondsStored>).events;
  const found = Array.isArray(events) ? events.find((item) => item?.id === id && item.kind === 'wedding' && item.announced === true && item.opened === true) : undefined;
  return found && found.names.length === 2 ? { a: found.names[0]!, b: found.names[1]!, city: found.city } : null;
}

// ---- the engine --------------------------------------------------------------------------------------------------------------------------------
export interface BondsDeps {
  roster: readonly Resident[]
  now: () => number
  /** Residents running (0 when off). Fewer than two: nothing happens. */
  active: () => number
  shadow: () => boolean
  presence: () => { id: string; city: string; where: string | null; awake: boolean }[]
  /** One model call for a resident (its own model, the residents' budget): the text, or null. */
  decide: (id: string, messages: { role: 'system' | 'user'; content: string }[]) => Promise<string | null>
  /** The venue room key and label for an event in a city, or null. */
  venue: (city: string) => { room: string; label: string } | null
  /** Add one public gist line (only called when not in shadow). */
  announce: (line: { city: string; kind: 'event' | 'notice'; text: string; key: string }) => Promise<void>
  /** Say a written line in a venue room as a resident (only when not in shadow). */
  say: (id: string, room: string, text: string) => Promise<void>
  /** Resident keys the owner has asked to leave (the setting). */
  farewells: () => string[]
  save?: (stored: BondsStored) => Promise<void>
}

export function bondsOf(deps: BondsDeps, initial: BondsStored = emptyBonds()) {
  const stored: BondsStored = initial;
  const byId = new Map(deps.roster.map((who) => [residentId(who), who]));
  const traits = new Map(deps.roster.map((who) => [residentId(who), traitsOf(who)]));
  const nameOf = (id: string): string => byId.get(id)?.name ?? 'a resident';
  const gone = (): Set<string> => new Set(stored.departed);
  let dirty = false, lastSave = -Infinity, lastPlace = -Infinity, busy = false, stepping = false, saving = false;
  const note = (text: string): void => { stored.log.push({ at: deps.now(), text }); if (stored.log.length > BOND.logKept) stored.log.splice(0, stored.log.length - BOND.logKept); dirty = true; };
  const fitOf = (x: string, y: string): number => { const a = traits.get(x), b = traits.get(y); return a && b ? fit(a, b) : 0; };
  const married = (id: string): boolean => Object.values(stored.pairs).some((bond) => (bond.a === id || bond.b === id) && (bond.married !== undefined || bond.wedding !== undefined));
  const runningIds = (): Set<string> => new Set(deps.presence().map((item) => item.id).filter((id) => !gone().has(id)));
  const enough = (): boolean => deps.active() >= 2;

  function bondOf(x: string, y: string, day: number, create: boolean): Bond | null {
    const key = pairKey(x, y);
    let found = Object.hasOwn(stored.pairs, key) ? stored.pairs[key]! : null;
    if (!found && create) {
      if (Object.keys(stored.pairs).length >= BOND.maxPairs) {
        const weakest = Object.entries(stored.pairs).filter(([, bond]) => bond.married === undefined).sort((p, q) => p[1].c - q[1].c)[0];
        if (!weakest) return null;
        delete stored.pairs[weakest[0]];
      }
      found = stored.pairs[key] = blankBond(x, y, day);
    }
    return found;
  }

  /** A talk happened between two residents (resident.ts notes each one). */
  function talked(x: string, y: string, t: number): void {
    if (!enough() || x === y || !byId.has(x) || !byId.has(y) || gone().has(x) || gone().has(y)) return;
    const day = dayOf(t), bond = bondOf(x, y, day, true);
    if (!bond) return;
    const before = stageOf(bond);
    grow(bond, BOND.talkGain, day);
    if (stageOf(bond) !== before) note(`${nameOf(x)} and ${nameOf(y)}: now ${stageOf(bond) === 'best' ? 'best friends' : 'friends'} (closeness ${bond.c})`);
    const a = traits.get(x), b = traits.get(y);
    if (a && b && quarrels(bond, day, hash(`${pairKey(x, y)}|${t}`) % 100, quarrelChance(fit(a, b), a.hot || b.hot))) note(`${nameOf(x)} and ${nameOf(y)} fell out (a quiet disagreement; closeness ${bond.c})`);
    dirty = true;
  }

  /** The start of a UTC day: every bond ages one day (more if the host was away). */
  function rollDay(day: number): void {
    const gap = stored.day < 0 ? 1 : Math.min(30, day - stored.day);
    for (let i = 0; i < gap; i++) for (const [key, bond] of Object.entries(stored.pairs)) {
      const quarrelling = bond.quarrel !== undefined;
      if (!dayPasses(bond, day - gap + 1 + i)) delete stored.pairs[key];
      else if (quarrelling && bond.quarrel === undefined) note(`${nameOf(bond.a)} and ${nameOf(bond.b)}: the quiet between them faded`);
    }
    stored.day = day; dirty = true;
  }

  /** Awake residents standing in the same place on the same day grow a little closer (once a day for a pair). */
  function together(t: number): void {
    if (t - lastPlace < 60000) return;
    lastPlace = t;
    const day = dayOf(t), rooms = new Map<string, string[]>();
    for (const item of deps.presence()) if (item.awake && item.where && !gone().has(item.id)) { const list = rooms.get(item.where); if (list) list.push(item.id); else rooms.set(item.where, [item.id]); }
    for (const here of rooms.values()) for (let i = 0; i < here.length; i++) for (let j = i + 1; j < here.length; j++) {
      const bond = bondOf(here[i]!, here[j]!, day, false) ?? (byId.get(here[i]!)?.city === byId.get(here[j]!)?.city ? bondOf(here[i]!, here[j]!, day, true) : null);
      if (!bond || bond.placeDay === day) continue;
      bond.placeDay = day; grow(bond, BOND.placeGain, day); dirty = true;
    }
  }

  // ---- the choices -----------------------------------------------------------------------------------------------------------------------------
  interface Job { task: Task; who: string; other: string; key: string }
  const tried = new Set<string>();
  function jobs(t: number): Job[] {
    const day = dayOf(t), out: Job[] = [], here = new Map(deps.presence().map((item) => [item.id, item]));
    const ok = (id: string): boolean => here.get(id)?.awake === true && !gone().has(id);
    for (const bond of Object.values(stored.pairs)) {
      if (!ok(bond.a) || !ok(bond.b)) continue;
      const add = (task: Task, who: string, other: string): void => { const key = `${day}|${task}|${who}|${pairKey(who, other)}`; if (!tried.has(key)) out.push({ task, who, other, key }); };
      if (bond.quarrel !== undefined && day - bond.quarrel >= BOND.makeUpAfterDays) { add('make_up', bond.a, bond.b); add('make_up', bond.b, bond.a); continue; }
      if (bond.asked) { const other = bond.asked.by === bond.a ? bond.b : bond.a; add('accept', other, bond.asked.by); continue; }
      const mover = hash(`${pairKey(bond.a, bond.b)}|${day}`) % 2 === 0 ? bond.a : bond.b;
      if (marriageReady(bond, day, fitOf(bond.a, bond.b), !married(bond.a) && !married(bond.b), byId.get(bond.a)?.city === byId.get(bond.b)?.city)) { add('propose', mover, mover === bond.a ? bond.b : bond.a); continue; }
      if (bond.married === undefined && bond.quarrel === undefined && bond.c >= BOND.friendAt && hash(`${bond.a}|${bond.b}|${day}|v`) % 4 === 0) { const goer = hash(`${bond.a}|${day}|w`) % 2 === 0 ? bond.a : bond.b; add('visit', goer, goer === bond.a ? bond.b : bond.a); }
    }
    return out;
  }

  function apply(job: Job, choice: string, t: number): void {
    const day = dayOf(t), bond = bondOf(job.who, job.other, day, false);
    if (!bond) return;
    const names = `${nameOf(job.who)} and ${nameOf(job.other)}`;
    if (choice === 'visit_friend') { grow(bond, BOND.visitGain, day); note(`${nameOf(job.who)} chose to visit ${nameOf(job.other)}`); }
    else if (choice === 'make_up') { delete bond.quarrel; bond.c = Math.min(100, bond.c + BOND.makeUpGain); bond.last = day; note(`${names} made up`); }
    else if (choice === 'propose') { bond.asked = { by: job.who, day }; note(`${nameOf(job.who)} chose to propose to ${nameOf(job.other)}`); }
    else if (choice === 'accept') { if (bond.asked && bond.asked.by === job.other) { schedule(bond, t); } }
    else if (choice === 'not_yet') {
      if (job.task === 'propose') { bond.wait = day + BOND.waitDays; note(`${nameOf(job.who)} chose to wait before asking ${nameOf(job.other)}`); }
      else if (job.task === 'accept') { delete bond.asked; bond.wait = day + 2 * BOND.waitDays; note(`${nameOf(job.who)} chose not to accept yet`); }
    }
    dirty = true;
  }

  /** Both agreed: set the wedding. Without a venue, a free Saturday or room in the plan, the proposal lapses and they wait. */
  function schedule(bond: Bond, t: number): void {
    const day = dayOf(t), who = byId.get(bond.a), other = byId.get(bond.b);
    const lapse = (why: string): void => { delete bond.asked; bond.wait = day + BOND.waitDays; note(`${nameOf(bond.a)} and ${nameOf(bond.b)} agreed, but ${why}`); };
    if (!who || !other) return lapse('it could not be arranged');
    if (stored.events.filter((item) => item.kind === 'wedding').length >= BOND.maxWeddings) return lapse('the limit of weddings is reached');
    const venue = deps.venue(who.city);
    if (!venue) return lapse('there is no place for a wedding in their city');
    const at = nextAt(t, who.utcOffsetMin, 6, BOND.weddingHour, BOND.weddingLeadDays);
    if (stored.events.some((item) => item.kind === 'wedding' && !item.done && item.city === who.city && Math.abs(item.at - at) < BOND.weddingGapDays * DAY_MS)) return lapse('another wedding is set that week');
    const id = `w-${++stored.seq}`;
    stored.events.push({ id, kind: 'wedding', city: who.city, room: venue.room, label: venue.label, who: [bond.a, bond.b], names: [nameOf(bond.a), nameOf(bond.b)], guests: [], at, until: at + BOND.weddingHours * HOUR_MS, colour: colourFor(id), announced: false, opened: false, done: false });
    bond.wedding = id; delete bond.asked;
    note(`${nameOf(bond.a)} and ${nameOf(bond.b)} agreed to marry: the wedding is set for ${weekdayName(at, who.utcOffsetMin)} ${new Date(at).toISOString().slice(0, 16).replace('T', ' ')} UTC at ${venue.label}`);
    prune();
  }
  function prune(): void {
    while (stored.events.length > BOND.eventsKept) { const old = stored.events.findIndex((item) => item.done); if (old < 0) break; stored.events.splice(old, 1); }
  }

  async function choose(job: Job, t: number): Promise<void> {
    const who = byId.get(job.who);
    if (!who) return;
    const day = dayOf(t);
    if (stored.calls.day !== day) stored.calls = { day, n: 0 };
    if (stored.calls.n >= BOND.callsPerDay) return;
    stored.calls.n += 1; tried.add(job.key);
    const messages = [{ role: 'system' as const, content: who.story }, { role: 'user' as const, content: askText(job.task, nameOf(job.other)) }];
    let text: string | null = null;
    try { text = await deps.decide(job.who, messages); } catch { text = null; }
    const choice = text === null ? null : judgeChoice(text, job.task);
    if (choice) apply(job, choice, deps.now());
  }

  // ---- events: weddings and farewells ----------------------------------------------------------------------------------------------------------
  const wanted = (ev: EventRec): string[] => [...ev.who, ...ev.guests];
  function holdFor(id: string): string | null {
    const t = deps.now();
    for (const ev of stored.events) if (!ev.done && t >= ev.at - HOUR_MS && t < ev.until && wanted(ev).includes(id) && !(ev.kind === 'funeral' && ev.who[0] === id)) return ev.room;
    return null;
  }
  async function stepEvents(t: number): Promise<void> {
    const shadow = deps.shadow();
    for (const ev of stored.events) {
      if (ev.done) continue;
      if (ev.kind === 'wedding' && ev.who.some((id) => gone().has(id))) { ev.done = true; const bond = bondOf(ev.who[0]!, ev.who[1]!, dayOf(t), false); if (bond) delete bond.wedding; note(`the wedding of ${ev.names.join(' and ')} did not go ahead`); continue; }
      const offset = byId.get(ev.who[0]!)?.utcOffsetMin ?? 0;
      if (!ev.announced && t < ev.until) {
        const text = ev.kind === 'wedding' ? weddingAnnouncement(ev.names, weekdayName(ev.at, offset), ev.label) : funeralNotice(ev.names[0]!, weekdayName(ev.at, offset), ev.label);
        if (shadow) { if (!stored.log.some((line) => line.text === `would announce: ${text}`)) note(`would announce: ${text}`); }
        else { try { await deps.announce({ city: ev.city, kind: ev.kind === 'wedding' ? 'event' : 'notice', text, key: `${ev.kind}:${ev.id}:1` }); ev.announced = true; note(`announced: ${text}`); } catch { /* tried again next beat */ } }
      }
      if (!ev.opened && t >= ev.at) {
        ev.opened = true;
        if (ev.kind === 'wedding') {
          const bond = bondOf(ev.who[0]!, ev.who[1]!, dayOf(t), false);
          if (bond) { bond.married = dayOf(t); delete bond.wedding; bond.c = Math.max(bond.c, 90); bond.last = dayOf(t); }
          note(`${ev.names.join(' and ')} are married`);
          if (!shadow && t < ev.until) {
            try { await deps.announce({ city: ev.city, kind: 'event', text: weddingOpened(ev.names, ev.label), key: `wedding:${ev.id}:2` }); } catch { /* the first line already stands */ }
            try { await deps.say(ev.who[0]!, ev.room, welcomeLine(ev.colour)); } catch { /* a refused line is dropped */ }
          }
        } else note(`friends gathered to remember ${ev.names[0]}`);
      }
      if (t >= ev.until) { ev.done = true; dirty = true; }
      dirty = true;
    }
  }

  /** The owner asked a resident to leave: one quiet event, rarely (two a week at most). */
  function farewell(t: number): void {
    const ids = deps.roster.filter((who) => deps.farewells().includes(who.key)).map(residentId);
    for (const id of ids) {
      if (gone().has(id)) continue;
      const who = byId.get(id)!;
      if (stored.events.filter((ev) => ev.kind === 'funeral' && t - ev.at < 7 * DAY_MS).length >= BOND.funeralsPerWeek) return;
      stored.departed.push(id);
      const venue = deps.venue(who.city);
      const guests = Object.values(stored.pairs).filter((bond) => (bond.a === id || bond.b === id) && (bond.married !== undefined || bond.c >= BOND.bestAt)).map((bond) => (bond.a === id ? bond.b : bond.a)).filter((other) => !gone().has(other)).slice(0, 6);
      note(`${who.name} has left the roster (the owner's choice)`);
      if (venue) {
        const at = nextAt(t, who.utcOffsetMin, 0, BOND.funeralHour, BOND.funeralLeadDays);
        stored.events.push({ id: `f-${++stored.seq}`, kind: 'funeral', city: who.city, room: venue.room, label: venue.label, who: [id], names: [who.name], guests, at, until: at + BOND.funeralHours * HOUR_MS, colour: 'white', announced: false, opened: false, done: false });
        prune();
      }
      dirty = true;
    }
  }

  function flush(t: number, force = false): void {
    if (!deps.save || !dirty || saving || (!force && t - lastSave < BOND.saveMs && t >= lastSave)) return;
    saving = true; lastSave = t; dirty = false;
    void deps.save(stored).catch(() => { dirty = true; }).finally(() => { saving = false; });
  }

  /** The heartbeat. Never throws. With fewer than two residents running it only keeps the clock: no bonds, no calls. */
  function tick(): void {
    try {
      const t = deps.now();
      if (deps.active() >= 2) {
        if (stored.day !== dayOf(t)) rollDay(dayOf(t));
        farewell(t);
        together(t);
        if (!busy) {
          const next = jobs(t)[0];
          if (next) { busy = true; void choose(next, t).catch(() => {}).finally(() => { busy = false; dirty = true; }); }
        }
        if (!stepping && stored.events.some((ev) => !ev.done)) { stepping = true; void stepEvents(t).catch(() => {}).finally(() => { stepping = false; flush(deps.now(), true); }); }
      }
      flush(t);
    } catch { /* never stops the host's heartbeat */ }
  }

  return {
    tick, talked, stored, flush, farewell,
    profile: (id: string): string | null => (enough() ? profileLine(stored, id, nameOf) : null),
    hold: (id: string): string | null => holdFor(id),
    retired: (id: string): boolean => stored.departed.includes(id),
    /** For tests: run the event step now, whatever else is going on. */
    events: (): Promise<void> => stepEvents(deps.now()),
    nameOf,
    report: () => ({
      pairs: Object.values(stored.pairs).map((bond) => ({ a: nameOf(bond.a), b: nameOf(bond.b), closeness: bond.c, stage: stageOf(bond), quarrel: bond.quarrel !== undefined, high: bond.high, asked: bond.asked ? nameOf(bond.asked.by) : null })).sort((p, q) => q.closeness - p.closeness),
      events: stored.events, log: stored.log, departed: stored.departed.map(nameOf), calls: stored.calls,
    }),
  };
}
export type Bonds = ReturnType<typeof bondsOf>;
export const safeWords = (text: string): boolean => !OUT_OF_CHARACTER.test(text) && agentWords(text, { toMinor: true }).ok;
