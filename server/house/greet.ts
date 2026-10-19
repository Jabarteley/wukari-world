/**
 * OWNER: agents (AI residents, docs/AI-RESIDENTS.md "Greeting and gossip")
 * GREETING BY NAME WITH ONE REMEMBERED FACT, AND GOSSIP FROM THE PUBLIC GIST. Written lines, free, pure and portable.
 *
 * TWO SOURCES, NEVER MIXED (the rule of Phase 3, docs/WOW-PLAN.md):
 *   - A remembered fact (memory.ts: a short phrase the person told this agent, which the person can see and delete) is said ONLY TO THAT PERSON: `factGreeting`
 *     takes the person's own facts, and the runner calls it only when no other person stands in the same part of the venue (or on a private call).
 *   - Gossip about people is ONLY a line of the public gist (server/gist/ledger.ts: facts that were already public, adults named, hidden players left out). `gossipLine`
 *     takes gist items and nothing else, and this file does not import memory.ts (greet.test.ts checks it), so no remembered fact can become gossip.
 * Every line still goes through runner.ts `speak` (agentWords for a minor) before it is said.
 */
import type { GistItem, GistKind } from '../gist/ledger.ts';
import { pick } from './lines.ts';

/** Gist kinds that are news about people or the town, fit to repeat. Arrests and removals are public but are left out: gossip must not hurt. */
export const GOSSIP_KINDS: readonly GistKind[] = Object.freeze(['business', 'election', 'party', 'event', 'law', 'notice', 'owner']);
/** How old a gist line may be to be told as gossip. */
export const GOSSIP_MAX_AGE_MS = 3 * 86400000;
const LINE_MAX = 240;

type Voice = 'pidgin' | 'plain';
const tidyName = (name: string): string => name.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 24) || 'friend';

/**
 * A remembered fact turned to the person ("is saving for a car" → "still saving for a car?"). Returns null when the fact is not one of the shapes memory.ts writes:
 * then the greeting stays a plain one rather than a clumsy one.
 */
export function factQuestion(fact: string): string | null {
  const text = fact.trim().replace(/[.!?]+$/, '');
  let m: RegExpMatchArray | null;
  if ((m = text.match(/^is saving for (.{3,40})$/i))) return `Still saving for ${m[1]}?`;
  if ((m = text.match(/^is learning (.{3,30})$/i))) return `How is the ${m[1]} coming along?`;
  if ((m = text.match(/^is an? ([a-z' -]{3,30})$/i))) return `How is life as a ${m[1]}?`;
  if ((m = text.match(/^works as (.{3,40})$/i))) return `How is the work as ${m[1]}?`;
  if ((m = text.match(/^works (at|for|in) (.{3,40})$/i))) return `How is work ${m[1]!.toLowerCase()} ${m[2]}?`;
  if ((m = text.match(/^likes (.{3,40})$/i))) return `Still into ${m[1]}?`;
  if ((m = text.match(/^supports (.{3,30})$/i))) return `How are ${m[1]} doing?`;
  if ((m = text.match(/^wants to (.{3,40})$/i))) return `Any closer to the plan to ${m[1]}?`;
  return null;
}

const FACT_GREET: Record<Voice, readonly string[]> = {
  pidgin: ['{who}! You don come back. {q}', 'Ah, {who}! Good to see you again. {q}', 'My person {who}! {q}'],
  plain: ['{who}! Good to see you again. {q}', 'Welcome back, {who}. {q}', 'Hello again, {who}. {q}'],
};
/**
 * A greeting by name that uses ONE of the person's own remembered facts, or null when none fits. Only for the person the facts belong to, and only where nobody
 * else hears it (runner.ts decides). `seed` picks the fact and the words, so the same visit says the same thing.
 */
export function factGreeting(voice: Voice, who: string, ownFacts: readonly string[], seed: string): string | null {
  const usable = ownFacts.map((fact) => factQuestion(fact)).filter((q): q is string => q !== null);
  if (!usable.length) return null;
  const q = pick(usable, `${seed}|fact`);
  return pick(FACT_GREET[voice], seed).replace('{who}', tidyName(who)).replace('{q}', q).slice(0, LINE_MAX);
}

/** Public gist lines fit to repeat as gossip, newest first: the right kinds, fresh, short enough to say. */
export function gossipFrom(items: readonly GistItem[], now: number): GistItem[] {
  return items.filter((item) => GOSSIP_KINDS.includes(item.kind) && now - item.at < GOSSIP_MAX_AGE_MS && typeof item.text === 'string' && item.text.length >= 8 && item.text.length <= 140).sort((a, b) => b.n - a.n);
}

const GOSSIP: Record<Voice, readonly string[]> = {
  pidgin: ['You don hear? {line}.', 'Gist be say {line}. Na true talk, e dey the town gist.', 'I hear say {line}.'],
  plain: ['Have you heard? {line}.', 'The news in town: {line}.', 'I heard that {line}. It is in the town gist.'],
};
const NO_GOSSIP: Record<Voice, readonly string[]> = {
  pidgin: ['I never hear anything I fit swear for today. When I hear true gist, I go tell you.', 'Nothing new wey I sure of. Check the Gist app.'],
  plain: ['Nothing new that I can vouch for today. When I hear something true, I will tell you.', 'No news I am sure of just now. The Gist app has the latest.'],
};
/** "The Square is packed" reads "the Square is packed" inside a sentence; a line that starts with a name keeps it. */
const lower = (text: string): string => text.replace(/^(?:The|A|An) /, (word) => word.toLowerCase());
/** One piece of gossip: a public gist line in the character's voice, or "nothing I can vouch for". Takes gist items only. */
export function gossipLine(voice: Voice, items: readonly GistItem[], now: number, seed: string): { text: string; n: number | null } {
  const fresh = gossipFrom(items, now).slice(0, 6);
  if (!fresh.length) return { text: pick(NO_GOSSIP[voice], seed), n: null };
  const item = pick(fresh, `${seed}|gist`);
  const line = lower(item.text.replace(/[.!?]+$/, ''));
  return { text: pick(GOSSIP[voice], seed).replace('{line}', line).slice(0, LINE_MAX), n: item.n };
}

/** A person asks for the news: "any gist?", "what's new?", "wetin dey happen?", "any gossip?". */
export function asksGossip(body: string): boolean {
  const line = body.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  return /\b(?:any|wetin|what'?s the|what is the|give me|tell me (?:the|some)|latest|hot)\s+(?:gist|gossip|news|tori|amebo)\b/.test(line)
    || /\b(?:gist|gossip|amebo)\s*\?/.test(line)
    || /\bwhat'?s new\b|\bwhat is new\b|\bwetin dey happen\b|\bwetin happen for town\b|\bwhat'?s happening in town\b/.test(line);
}
