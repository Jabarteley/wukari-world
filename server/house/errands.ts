/**
 * OWNER: agents (house agents, docs/AGENT-MISSIONS.md)
 * ERRANDS: the templates of the tasks a house agent gives in person, and how one is chosen and filled for a life. Portable and pure: no clock, no
 * store, no model. Rules choose and fill; the model (desk.ts) may only rephrase the brief, and what it writes is checked here (cleanBrief).
 *
 *   profileOf(state, now)                        → what the templates may look at: the life's city, job, money band, friends, what it has not done
 *   offerFor(profile, giver, peers, taken)       → the task this agent gives this life today, or null: { template, label, brief, entry }
 *   briefPrompt(template, giver) / cleanBrief    → the messages that ask for a rephrasing, and the check on the answer
 *
 * A template is verb × thing × place × agent: a kind ('talk' to another agent, 'hand' items, 'bring' a friend, 'table' game with another person), the
 * agents (roles) who give it, a test of whether it fits this life, and a filler that makes the words and the numbers. Different lives fit different
 * templates and fill them differently (job, city, money, friends, tables played, a stall, what is in the kitchen), and the choice is deterministic
 * for (life, agent, day), so asking twice gives the same task.
 *
 * REWARDS are decided here by the template and clamped again by the game (src/game/systems/agent-missions.ts) to MISSION_REWARDS: a task of a day
 * pays at most the daily figure, a `big` one (a week to do) at most the weekly figure. A model never sees a reward and cannot change one.
 */
import { INGREDIENTS } from '../../src/game/content/food.ts';
import { JOBS } from '../../src/game/content/jobs.ts';
import { MISSION_REWARDS } from '../../src/game/content/missions.ts';
import { lagosTime } from '../../src/game/clock.ts';
import { makeRng } from '../../src/game/util.ts';
import type { AgentMissionKind, LifeState } from '../../src/types/life.ts';
import type { ChatMessage } from '../companion/gateway.ts';
import type { Role } from './cast.ts';

export type Voice = 'pidgin' | 'plain';
/** An agent as the desk needs it: who, where it stands in the city and when. */
export interface AgentRef { id: string; key: string; name: string; role: Role; voice: Voice; card: string; city: string; venue: string; /** The venue's name as the city's content gives it. */ place: string; hours: string }
export type Band = 'lean' | 'steady' | 'comfortable';
export interface Profile {
  city: string
  cityName: string
  /** The job's name, or null. */
  job: string | null
  band: Band
  /** Friends who are people. */
  friends: number
  /** Places reached this week. */
  seen: number
  /** Table games played, for life. */
  tables: number
  /** Has opened a stall. */
  stall: boolean
  kitchen: Readonly<Record<string, number>>
  seed: number
  day: number
  week: number
}

/** Cash below LEAN is "lean" (a new life's few thousand is steady); from COMFORTABLE up the life can afford a bigger errand. */
export const BANDS = Object.freeze({ lean: 1500, comfortable: 15000 });

export function profileOf(state: LifeState, now: number, cityName: string): Profile {
  const time = lagosTime(now), cash = state.cash;
  return {
    city: state.estate.city, cityName, job: state.job && JOBS[state.job] ? JOBS[state.job].label : null,
    band: cash < BANDS.lean ? 'lean' : cash < BANDS.comfortable ? 'steady' : 'comfortable',
    friends: Object.values(state.social.rel).filter((rel) => !rel.npc && rel.friend === true).length,
    seen: state.missions.visited.list.length, tables: state.growth.tables.played, stall: state.business.opened > 0,
    kitchen: state.inventory, seed: state.missions.seed, day: time.day, week: time.week,
  };
}

interface Fill {
  vars: Record<string, string>
  cash: number
  count?: number
  with?: AgentRef
  item?: string
  units?: number
}
export interface Template {
  id: string
  kind: AgentMissionKind
  /** Roles that give it. */
  roles: readonly Role[]
  /** Needs a week to do, so it may pay up to the weekly figure. */
  big?: true
  /** The task in plain words, with {tokens}. */
  label: string
  /** The written brief in plain English, and in Pidgin where the giver talks that way. Tokens stay in curly brackets. */
  brief: string
  pidgin?: string
  /** The words and numbers for this life and this giver, or null when it does not fit. */
  fill(p: Profile, giver: AgentRef, peers: readonly AgentRef[], rng: () => number): Fill | null
}

const pickOf = <T>(list: readonly T[], rng: () => number): T | undefined => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
const others = (giver: AgentRef, peers: readonly AgentRef[], role?: Role): AgentRef[] => peers.filter((peer) => peer.id !== giver.id && peer.city === giver.city && (role === undefined || peer.role === role));
const to50 = (value: number): number => Math.round(value / 50) * 50;

/** The ingredients an errand may ask for: ones a grocery order brings in a single pack, cheap enough that the reward covers the pack. */
const FETCHABLE = Object.values(INGREDIENTS).filter((item) => item.price <= 900 && item.pack >= 1 && !('beta' in item && item.beta)).sort((a, b) => a.id.localeCompare(b.id));

const greet = (giver: AgentRef, peers: readonly AgentRef[], rng: () => number, cash: number, roleOnly?: Role): Fill | null => {
  const target = pickOf(others(giver, peers, roleOnly), rng);
  return target ? { vars: { other: target.name, place: target.place, giver: giver.name }, cash, with: target } : null;
};

export const TEMPLATES: readonly Template[] = Object.freeze([
  { id: 'greet', kind: 'talk', roles: ['mission', 'seller'], label: 'Say hello to {other} for {giver}',
    brief: 'Please take my greeting to {other} at {place}. Just say hello and tell them {giver} sent you.',
    pidgin: 'Abeg, go give {other} my greeting for {place}. Tell am say {giver} send you.',
    fill: (p, giver, peers, rng) => greet(giver, peers, rng, 150) },
  { id: 'newhere', kind: 'talk', roles: ['guide', 'marketer', 'quiz', 'mission'], label: 'Say hello to {other} at {place}',
    brief: 'The best way to learn {city} is through its people. Say hello to {other} at {place}.',
    fill: (p, giver, peers, rng) => (p.seen < 6 || p.friends === 0 ? greet(giver, peers, rng, 150) : null) },
  { id: 'work', kind: 'talk', roles: ['mission', 'guide', 'marketer'], label: 'Tell {other} you work in {job}',
    brief: 'I like to know who works in {city}. Tell {other} at {place} what you do for work: {job}.',
    fill: (p, giver, peers, rng) => { const f = p.job ? greet(giver, peers, rng, 200) : null; return f && { ...f, vars: { ...f.vars, job: p.job!.toLowerCase(), city: p.cityName } }; } },
  { id: 'stallask', kind: 'talk', roles: ['guide', 'mission'], label: 'Ask {other} how a stall works',
    brief: 'Thinking of a stall of your own? {other} at {place} knows the market. Go and ask how it works.',
    fill: (p, giver, peers, rng) => (!p.stall && p.band !== 'lean' ? greet(giver, peers, rng, 200, 'seller') : null) },
  { id: 'stallswap', kind: 'talk', roles: ['seller', 'mission', 'guide'], label: 'Swap stall stories with {other}',
    brief: 'You keep a stall, so you know. Go and swap stories with {other} at {place}.',
    fill: (p, giver, peers, rng) => (p.stall ? greet(giver, peers, rng, 200, 'seller') : null) },
  { id: 'fetchsmall', kind: 'hand', roles: ['seller'], label: 'Bring {units} {item} to {giver}',
    brief: 'I am short of {item} at the stall. Bring me {units} today and tell me you have them.',
    pidgin: 'I don short of {item} for my stall. Bring {units} come today, and tell me say you get am.',
    fill: (p, giver) => { const item = INGREDIENTS['seasoning']; return item && (p.kitchen[item.id] ?? 0) < 5 ? { vars: { item: item.label.toLowerCase(), units: '5', giver: giver.name }, cash: 250, item: item.id, units: 5 } : null; } },
  { id: 'fetchbig', kind: 'hand', big: true, roles: ['seller', 'mission'], label: 'Bring {units} {item} to {giver}',
    brief: 'This week I need {units} {item}. Bring them when you can and tell me you have them.',
    pidgin: 'This week I need {units} {item}. Bring dem when you fit, then tell me say you get am.',
    fill: (p, giver, peers, rng) => {
      if (p.band === 'lean') return null;
      const wanted = FETCHABLE.filter((item) => item.id !== 'seasoning' && (p.kitchen[item.id] ?? 0) < item.pack && (p.band === 'comfortable' || item.price <= 600));
      const item = pickOf(wanted, rng);
      return item ? { vars: { item: item.label.toLowerCase(), units: String(item.pack), giver: giver.name }, cash: Math.min(MISSION_REWARDS.weekly.cash, to50(item.price + 100)), item: item.id, units: item.pack } : null;
    } },
  { id: 'friend', kind: 'bring', big: true, roles: ['seller', 'marketer', 'quiz', 'mission'], label: 'Bring a friend to {giver}',
    brief: 'Come with a friend! I would like to show {place} to someone new. Bring a friend of yours and say hello when you are both here.',
    pidgin: 'Come with your friend o! I wan show {place} to new person. Bring your friend, then greet me when una reach.',
    fill: (p, giver) => (p.friends >= 1 ? { vars: { giver: giver.name, place: giver.place }, cash: 600 } : null) },
  { id: 'table', kind: 'table', roles: ['seller', 'guide', 'marketer', 'quiz', 'mission'], label: 'Play a table game with another person',
    brief: 'A game is better with company. Play a table game with another person today.',
    pidgin: 'Game sweet when person dey with you. Play table game with another person today.',
    fill: (p) => (p.tables < 30 ? { vars: {}, cash: 250 } : null) },
  { id: 'tableweek', kind: 'table', big: true, roles: ['quiz', 'mission', 'marketer'], label: 'Play three table games with other people',
    brief: 'Be a regular at the tables. Play three games with other people this week.',
    fill: (p) => (p.tables >= 5 ? { vars: {}, cash: 700, count: 3 } : null) },
] satisfies Template[]);

const fillIn = (text: string, vars: Record<string, string>): string => text.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');
export const tokensOf = (text: string): string[] => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((found) => found[1]!))];
/** The written brief of a template for a voice. */
export const writtenBrief = (template: Template, voice: Voice): string => (voice === 'pidgin' && template.pidgin ? template.pidgin : template.brief);

export interface Offer {
  template: Template
  /** The entry for the game's 'give' operation (it adds progress, times and the limits). */
  entry: Record<string, unknown>
  /** Variables the brief's tokens take, and the plain label. */
  vars: Record<string, string>
  label: string
}

/** The task this agent gives this life today, or null. `taken` are the template ids this life holds from this agent today. Deterministic for (life, agent, day). */
export function offerFor(p: Profile, giver: AgentRef, peers: readonly AgentRef[], taken: readonly string[] = []): Offer | null {
  const rng = makeRng(`agent-mission|${p.seed}|${p.day}|${giver.id}`);
  const options: Offer[] = [];
  for (const template of TEMPLATES) {
    if (!template.roles.includes(giver.role) || taken.includes(template.id)) continue;
    const made = template.fill(p, giver, peers, makeRng(`${template.id}|${p.seed}|${p.day}|${giver.id}`));
    if (!made) continue;
    const vars = { giver: giver.name, place: giver.place, city: p.cityName, ...made.vars };
    const label = fillIn(template.label, vars).slice(0, 70);
    options.push({ template, vars, label, entry: {
      id: `ag-${template.id}-${giver.key}-${p.day}`, kind: template.kind, label, n: 0, count: made.count ?? 1, cash: made.cash, ...(template.big ? { big: true } : {}),
      by: { id: giver.id, name: giver.name, city: giver.city, venue: giver.venue, hours: giver.hours },
      ...(made.with ? { with: { id: made.with.id, name: made.with.name, city: made.with.city, venue: made.with.venue } } : {}),
      ...(made.item ? { item: made.item, units: made.units ?? 1 } : {}),
    } });
  }
  return pickOf(options, rng) ?? null;
}

/** The brief as it will be said: the phrasing (or the written one) with the tokens filled. */
export const sayBrief = (offer: Offer, phrased: string | null, voice: Voice): string => fillIn(phrased ?? writtenBrief(offer.template, voice), offer.vars).replace(/\s+/g, ' ').trim();

// ---- the model's part: rephrase, nothing more ---------------------------------------------------------------------------------------

/** The messages that ask a model to say the written brief in the giver's voice. No player words are in them, so a free model may answer. */
export function briefPrompt(template: Template, giver: AgentRef): ChatMessage[] {
  const system = [
    `You are ${giver.name}, a character in the city game Allworld. ${giver.card}`,
    giver.voice === 'pidgin' ? 'You may use light Nigerian Pidgin.' : 'Use simple, friendly English.',
    'Say the message below in your own voice, in one or two short sentences, at most 200 characters.',
    'Keep every word in curly brackets, such as {other}, exactly as written, and use each one. Add no numbers, prices, names, places or promises of your own.',
    'Never ask for money, contact details or a meeting outside the game. No emoji, no links. Reply with the message only.',
  ].join('\n');
  return [{ role: 'system', content: system }, { role: 'user', content: writtenBrief(template, giver.voice) }];
}

/** The model's answer made safe, or null: it must keep exactly the tokens of the written brief, add no digits, and stay short and plain. */
export function cleanBrief(raw: string, template: Template, voice: Voice): string | null {
  const text = raw.replace(/\s+/g, ' ').trim().replace(/^["“'`]+|["”'`]+$/g, '').trim();
  if (text.length < 20 || text.length > 200) return null;
  if (/[<>\[\]\\@]|https?:|www\./i.test(text) || /\d/.test(text)) return null;
  const want = tokensOf(writtenBrief(template, voice)).sort(), got = tokensOf(text).sort();
  if (want.length !== got.length || want.some((token, index) => token !== got[index])) return null;
  if (/[{}]/.test(text.replace(/\{\w+\}/g, ''))) return null;
  return text;
}
