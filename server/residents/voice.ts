/**
 * OWNER: agents (residents, docs/RESIDENTS.md "Phase 13c")
 * THE RESIDENTS' VOICE TO THE OWNER: what they wish for and lack, an assembly of their own, a president, a Sunday letter, and the owner's
 * answer. Portable (no Node imports): the Node host and the Worker run it on the heartbeat. Design: DESIGN.md Part 8.
 *
 * IDEAS    each night a resident's summary step may yield ONE wish (something its town lacks) and ONE need (something it keeps failing at):
 *          short, in character, passing agentWords (judgeIdea). Similar ones are merged by a cheap word-overlap rule (clusterIdeas); the
 *          five most asked for are kept for every Lagos day (tops). They are proposals: residents never change the game.
 * ASSEMBLY every week the residents who are switched on (residentCount) elect a president of their own with the election code of the
 *          people's offices (server/civic/elections.ts: the same weekly timeline, `declare`, `vote`, `tally`, `winnerOf`, `governorAt`),
 *          on a ballot kept HERE (collection `residentVoice`), never in `civic` or `politics`. Standing and voting are rules plus life
 *          stories (no model): a vote is a validated choice (voteBlock). The assembly is the residents' own body: it holds no people's
 *          office and writes to none (docs/POLITICS.md "Residents' assembly").
 * LETTER   each Sunday (Lagos time) the president writes one letter "to the Founders": ONE router call (purpose `resident`), at most
 *          LETTER_MAX characters, in character (OUT_OF_CHARACTER), passing agentWords; asked twice, then written by rules.
 * REPLY    the owner answers on the admin page. The answer becomes a gist line (kind `owner`) and is read into the residents' next
 *          thoughts as "news from the Founders" (newsFromFounders). It is never a message to a person.
 * STORED   ctx.collection(db, 'residentVoice') = { v: 1, days, tops, assembly, letters, replies, seq }, all bounded; created by the first write.
 */
import { lagosTime } from '../../src/game/clock.ts';
import { cityRules } from '../../src/game/cities/index.ts';
import { declare, governorAt, phaseAt, tally, vote, voteBlock } from '../civic/elections.ts';
import { agentWords } from '../moderation/agent-words.ts';
import { gistService, WORLD } from '../gist/ledger.ts';
import { routerOf } from '../models/service.ts';
import type { AskInput, AskResult } from '../models/router.ts';
import type { GovScope, Db, RouteContext } from '../types.ts';
import { OUT_OF_CHARACTER, RESIDENTS, residentId } from './life.ts';
import type { Resident } from './life.ts';

export type IdeaKind = 'wish' | 'need';
export const IDEA_MIN = 12, IDEA_MAX = 100, TOP_N = 5, RAW_DAYS = 2, TOP_DAYS = 14, LETTERS_KEPT = 12, REPLIES_KEPT = 30;
export const LETTER_MIN = 80, LETTER_MAX = 900, LETTER_TOKENS = 380, REPLY_MIN = 5, REPLY_MAX = 400, NEWS_DAYS = 3, NEWS_SHOWN = 2, NEWS_CHARS = 300;
const CHECK_MS = 10 * 60000, DAY_MS = 86400000;

export interface IdeaIn { id: string; name: string; city: string; kind: IdeaKind; text: string }
export interface Idea extends IdeaIn { at: number }
/** Similar ideas merged: the first wording, how many residents asked, who, and their own words (a few). */
export interface Cluster { text: string; count: number; by: string[]; cities: string[]; why: string[] }
export interface DayTop { wishes: Cluster[]; needs: Cluster[] }
export interface Letter { week: number; at: number; by: { id: string; name: string; city: string }; caretaker: boolean; text: string; source: 'model' | 'rules'; model: string | null; tries: number; costMicro: number; wishes: string[]; needs: string[] }
export interface Reply { n: number; at: number; kind: 'news' | 'decree'; text: string; admin: string; gist: number | null; letter: number | null }
export interface Voice {
  v: 1; seq: number
  /** The raw ideas of the newest RAW_DAYS Lagos days, and the five most asked for of each of the newest TOP_DAYS. */
  days: Record<string, Idea[]>; tops: Record<string, DayTop>
  /** The residents' ballot, shaped as a seat's so the election code reads it. */
  assembly: GovScope
  letters: Letter[]; replies: Reply[]
}
export const emptyVoice = (): Voice => ({ v: 1, seq: 0, days: {}, tops: {}, assembly: { gov: { elections: {}, announcements: [] } }, letters: [], replies: [] });

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const hash = (text: string): number => { let h = 2166136261; for (const char of text) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const STOP = new Set(['the', 'and', 'for', 'you', 'are', 'was', 'were', 'that', 'this', 'with', 'have', 'has', 'had', 'but', 'not', 'your', 'our', 'they', 'their', 'there', 'what', 'when', 'will', 'would', 'just', 'about', 'from', 'been', 'its', 'too', 'very', 'yes', 'did', 'does', 'how', 'who', 'all', 'can', 'any', 'wish', 'need', 'more', 'some', 'where', 'enough', 'town', 'city']);
const wordsOf = (text: string): Set<string> => new Set(text.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((word) => word.length > 2 && !STOP.has(word)));
const clean = (text: string, max: number): string => text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

// ---- ideas: the checks, the parsing of a night's answer, and the cheap clustering ---------------------------------------------------------------
/** One wish or need: a short plain line, in character, passing the word rules. */
export function judgeIdea(raw: unknown): { ok: true; text: string } | { ok: false; slip: 'character' | 'words' | 'invalid' } {
  const text = clean(String(raw ?? '').replace(/^[\s"'`*\-:]+|["'`*]+$/g, ''), 400);
  if (text.length < IDEA_MIN || text.length > IDEA_MAX) return { ok: false, slip: 'invalid' };
  if (OUT_OF_CHARACTER.test(text)) return { ok: false, slip: 'character' };
  if (!agentWords(text, { toMinor: true }).ok) return { ok: false, slip: 'words' };
  return { ok: true, text };
}
/** A night's answer: the summary, and the lines that begin "Wish:" (or "Idea:") and "Need:". The first of each is kept. */
export function splitNight(raw: string): { summary: string; wish: string | null; need: string | null } {
  let wish: string | null = null, need: string | null = null;
  const kept: string[] = [];
  for (const line of String(raw ?? '').split(/\r?\n/)) {
    const found = /^\s*[*\-]?\s*(wish|idea|need)\s*[:\-]\s*(.*)$/i.exec(line);
    if (!found) { kept.push(line); continue; }
    const text = found[2] ?? '';
    if (/need/i.test(found[1]!)) need ??= text; else wish ??= text;
  }
  return { summary: kept.join('\n').trim(), wish, need };
}
/** Do two wordings ask for the same thing? At least two shared words and half of the shorter one's words (or all of a very short one). */
export function similar(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  const small = Math.min(a.size, b.size);
  if (!small) return false;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return small <= 2 ? shared === small : shared >= 2 && shared / small >= 0.5;
}
/** Merge similar ideas (greedy, in the order given: the first wording stands for the group) and sort by how many asked, then by who asked first. */
export function clusterIdeas(items: readonly { text: string; by: string; city: string; count?: number }[]): Cluster[] {
  const groups: { words: Set<string>; cluster: Cluster }[] = [];
  for (const item of items) {
    const words = wordsOf(item.text), weight = item.count ?? 1;
    const group = groups.find((other) => similar(other.words, words));
    if (!group) { groups.push({ words, cluster: { text: item.text, count: weight, by: [item.by], cities: [item.city], why: [item.text] } }); continue; }
    group.cluster.count += weight;
    if (!group.cluster.by.includes(item.by)) group.cluster.by.push(item.by);
    if (!group.cluster.cities.includes(item.city)) group.cluster.cities.push(item.city);
    if (group.cluster.why.length < 3 && !group.cluster.why.includes(item.text)) group.cluster.why.push(item.text);
  }
  return groups.map((group, index) => ({ group, index })).sort((a, b) => b.group.cluster.count - a.group.cluster.count || a.index - b.index).map((entry) => entry.group.cluster);
}
const topOfDay = (items: readonly Idea[], kind: IdeaKind): Cluster[] => clusterIdeas(items.filter((idea) => idea.kind === kind).map((idea) => ({ text: idea.text, by: idea.name, city: idea.city }))).slice(0, TOP_N);

// ---- the assembly: standing and voting by rules and life stories ------------------------------------------------------------------------------------
const CIVIC_WORDS = /\b(?:neighbou?rs?|communit\w*|town|elders?|children|school|teach\w*|church|mosque|temple|fair|fairly|listen\w*|market|clinic|nurse|library|librarian|council|volunteer\w*|families|family)\b/gi;
const civicScore = (who: Resident): number => Math.min(8, (who.story.match(CIVIC_WORDS) ?? []).length);
const THEMES: readonly [RegExp, string][] = [
  [/\b(?:teach\w*|school|librar\w*|children)\b/i, 'Every child taught and every elder heard'],
  [/\b(?:nurse|clinic|ward|pharmac\w*|health)\b/i, 'Care for every door, early and kindly'],
  [/\b(?:market|stall|trader|shop|sell\w*)\b/i, 'A fair price and a fair stall for all'],
  [/\b(?:music\w*|radio|song|dance|drum\w*)\b/i, 'A town that sings together'],
  [/\b(?:church|mosque|temple|faith|pray\w*)\b/i, 'Peace between neighbours of every faith'],
];
const slogan = (who: Resident): string => (THEMES.find(([pattern]) => pattern.test(who.story))?.[1] ?? `A fair hearing for ${cityRules(who.city)?.name ?? who.city}`).slice(0, 60);
/** Does this resident put itself forward this week? Mostly those whose story speaks of neighbours, children, markets, faith; the draw is fixed by id and week. */
export const stands = (who: Resident, week: number): boolean => hash(`${residentId(who)}|stand|${week}`) % 100 < 12 + 7 * civicScore(who);
const rank = (who: Resident, week: number): number => hash(`${residentId(who)}|rank|${week}`);
/** How much `voter` likes `candidate`: the same city, the shared words of their life stories, a civic story; a small fixed draw settles ties. */
export function affinity(voter: Resident, candidate: Resident, week: number): number {
  const a = wordsOf(voter.story), b = wordsOf(candidate.story);
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  const jaccard = shared / Math.max(1, a.size + b.size - shared);
  return (voter.city === candidate.city ? 4 : 0) + Math.round(jaccard * 40) / 2 + civicScore(candidate) / 2 - (voter.key === candidate.key ? 3 : 0) + (hash(`${residentId(voter)}|${residentId(candidate)}|${week}`) % 100) / 1000;
}
/** One step of the weekly election for the switched-on residents. Mutates the ballot; returns whether it changed. */
export function electionStep(scope: GovScope, active: readonly Resident[], now: number): boolean {
  const phase = phaseAt(now), week = phase.week;
  if (!active.length || phase.phase === 'results') return false;
  let changed = false;
  const election = (): GovScope['gov']['elections'][string] | undefined => scope.gov.elections[week];
  const byId = new Map(active.map((who) => [residentId(who), who]));
  if (phase.phase === 'nominations') {
    for (const who of active) if (!Object.hasOwn(election()?.candidates ?? {}, residentId(who)) && stands(who, week)) { declare(scope, now, { id: residentId(who), name: who.name }, slogan(who)); changed = true; }
  }
  // Somebody always stands: with nobody on the ballot (a quiet week, one resident, a late start) the one the week's draw ranks first is put forward.
  if (!Object.keys(election()?.candidates ?? {}).some((id) => byId.has(id))) {
    const first = [...active].sort((a, b) => rank(a, week) - rank(b, week) || (residentId(a) < residentId(b) ? -1 : 1))[0]!;
    declare(scope, now, { id: residentId(first), name: first.name }, slogan(first)); changed = true;
  }
  if (phase.phase === 'voting') {
    const candidates = Object.keys(election()?.candidates ?? {}).map((id) => byId.get(id) ?? RESIDENTS.find((who) => residentId(who) === id)).filter((who): who is Resident => who !== undefined);
    for (const who of active) {
      const id = residentId(who);
      if (Object.hasOwn(election()?.votes ?? {}, id)) continue;
      const choice = [...candidates].sort((a, b) => affinity(who, b, week) - affinity(who, a, week) || (residentId(a) < residentId(b) ? -1 : 1))[0];
      if (choice && !voteBlock(scope, now, id, residentId(choice))) { vote(scope, now, id, residentId(choice)); changed = true; }
    }
  }
  return changed;
}
/** The president now: the winner of the sitting term; else the winner of a recent week; else (a caretaker) the resident the week's draw ranks first. */
export function presidentAt(scope: GovScope, active: readonly Resident[], now: number): { who: Resident; caretaker: boolean } | null {
  const named = (id: string | undefined): Resident | undefined => (id ? RESIDENTS.find((who) => residentId(who) === id) ?? active.find((who) => residentId(who) === id) : undefined);
  const sitting = named(governorAt(scope, now, 1)?.id);
  if (sitting) return { who: sitting, caretaker: false };
  const week = lagosTime(now).week;
  for (let back = 1; back <= 4; back++) {
    const election = scope.gov.elections[week - back];
    const top = election ? tally(election)[0] : undefined;
    const old = top && top.votes > 0 ? named(top.id) : undefined;
    if (old) return { who: old, caretaker: false };
  }
  const first = [...active].sort((a, b) => rank(a, week) - rank(b, week) || (residentId(a) < residentId(b) ? -1 : 1))[0];
  return first ? { who: first, caretaker: true } : null;
}

// ---- the letter ------------------------------------------------------------------------------------------------------------------------------------
/** The president's letter: addressed to the Founders, in character, within the word rules, of a bounded length. */
export function judgeLetter(raw: unknown): { ok: true; text: string } | { ok: false; slip: 'character' | 'words' | 'invalid' } {
  const text = String(raw ?? '').replace(/\r/g, '').replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length < LETTER_MIN || text.length > LETTER_MAX + 300 || !/founders/i.test(text)) return { ok: false, slip: 'invalid' };
  if (OUT_OF_CHARACTER.test(text)) return { ok: false, slip: 'character' };
  if (!agentWords(text, { toMinor: true }).ok) return { ok: false, slip: 'words' };
  if (text.length <= LETTER_MAX) return { ok: true, text };
  const cut = text.slice(0, LETTER_MAX), end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'));
  return { ok: true, text: end > LETTER_MIN ? cut.slice(0, end + 1) : cut.trimEnd() };
}
/** The letter written without a model: the week's asks in a plain list, signed. Passes the same checks (the tests prove it). */
export function writtenLetter(who: Resident, wishes: readonly string[], needs: readonly string[]): string {
  const list = (items: readonly string[]): string => items.slice(0, TOP_N).map((item) => item.replace(/[.!?]+$/, '')).join('; ');
  const body = !wishes.length && !needs.length ? 'It was a quiet week among us, and nobody asked for anything new.' : [wishes.length ? `This week we asked most for this: ${list(wishes)}.` : '', needs.length ? `What we most lack: ${list(needs)}.` : ''].filter(Boolean).join(' ');
  return `To the Founders,\n\n${body} We ask you to think kindly on it, and we thank you for reading.\n\nWith respect,\n${who.name}, for the residents`.slice(0, LETTER_MAX);
}
const lettersSystem = (who: Resident): string => `${who.story}\n\nThe other residents of the towns have chosen you to speak for them this week. You are ${who.name}. Answer only with the letter itself. You never ask anyone for money, for their private details, or to meet you anywhere but where you both already are.`;
function lettersUser(wishes: readonly Cluster[], needs: readonly Cluster[]): string {
  const rows = (items: readonly Cluster[]): string => (items.length ? items.map((item) => `- ${item.text} (${item.count} asked)`).join('\n') : '- nothing new');
  return `It is Sunday. Write a short letter (under 150 words, plain words, in the first person) "To the Founders", the people who began this place and look over it. Tell them, as the person the residents chose to speak for them, what people wished for most this week, what they most lack, and one thing you ask them to think about.\n\nWhat people wished for:\n${rows(wishes)}\n\nWhat people lack:\n${rows(needs)}\n\nBegin with "To the Founders," and end with your name.`;
}

// ---- the owner's answer, as the residents will hear it ------------------------------------------------------------------------------------------
/** The gist line of an answer: the world's own wording, cut to fit the ledger. */
export function gistWords(kind: Reply['kind'], text: string): string {
  const lead = kind === 'decree' ? 'The Founders have decreed: ' : 'News from the Founders: ';
  const room = 120 - lead.length, first = clean(text, 400), sentence = /^.*?[.!?](?:\s|$)/.exec(first)?.[0]?.trim() ?? first;
  const pick = sentence.length >= 20 && sentence.length <= room ? sentence : first;
  if (pick.length <= room) return lead + pick;
  const cut = pick.slice(0, room - 1), space = cut.lastIndexOf(' ');
  return `${lead}${(space > 30 ? cut.slice(0, space) : cut).replace(/[\s,;:.-]+$/, '')}…`;
}
/** What a resident is told: word from the Founders in the last few days, in the kind's own words. Reads only; creates nothing. */
export function newsFromFounders(db: Db, now: number): string[] {
  const stored = (db as unknown as Record<string, unknown>)['residentVoice'];
  const replies = record(stored) && Array.isArray(stored['replies']) ? stored['replies'] as Reply[] : [];
  return replies.filter((reply) => record(reply) && typeof reply.text === 'string' && now - reply.at < NEWS_DAYS * DAY_MS).slice(-NEWS_SHOWN)
    .map((reply) => `${reply.kind === 'decree' ? 'They have decreed' : 'Word has come'}: "${clean(reply.text, NEWS_CHARS)}"`);
}
/** The words the owner may send: short, in the world's own terms, and clean enough for a resident to read. */
export function judgeReply(raw: unknown, kind: unknown): { ok: true; text: string; kind: Reply['kind'] } | { ok: false; code: string; reason: string } {
  const text = clean(String(raw ?? ''), REPLY_MAX + 1);
  if (kind !== undefined && kind !== 'news' && kind !== 'decree') return { ok: false, code: 'invalid_kind', reason: 'Send it as news or as a decree.' };
  if (text.length < REPLY_MIN) return { ok: false, code: 'too_short', reason: `Write at least ${REPLY_MIN} characters.` };
  if (text.length > REPLY_MAX) return { ok: false, code: 'too_long', reason: `Keep it to ${REPLY_MAX} characters.` };
  if (OUT_OF_CHARACTER.test(text)) return { ok: false, code: 'out_of_world', reason: 'Residents live in a real world: leave out words like game, player, AI, model or prompt.' };
  const words = agentWords(text, { toMinor: true });
  if (!words.ok) return { ok: false, code: 'not_allowed', reason: `Residents are never asked for money or contact details, or given links: ${words.reason}` };
  return { ok: true, text, kind: kind === 'decree' ? 'decree' : 'news' };
}

// ---- the service ------------------------------------------------------------------------------------------------------------------------------------
export interface VoiceDeps {
  ask?: (input: AskInput) => Promise<AskResult>
  residents?: readonly Resident[]
}
export function voiceOf(ctx: RouteContext, deps: VoiceDeps = {}) {
  const roster = deps.residents ?? RESIDENTS;
  const ask = deps.ask ?? ((input: AskInput): Promise<AskResult> => routerOf(ctx).ask(input));
  const setting = (key: string): boolean | number | string | undefined => ctx.checks?.setting?.(key) ?? ctx.checks?.text?.(key);
  const on = (): boolean => setting('residentOn') === true;
  const active = (): readonly Resident[] => { const value = setting('residentCount'); const count = typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.min(roster.length, Math.round(value))) : 1; return roster.slice(0, count); };
  const gist = gistService(ctx);
  const voiceFor = (db: Db): Voice => {
    const found = ctx.collection(db, 'residentVoice', emptyVoice()) as unknown as Partial<Voice>;
    if (!record(found.days)) found.days = {};
    if (!record(found.tops)) found.tops = {};
    if (!Array.isArray(found.letters)) found.letters = [];
    if (!Array.isArray(found.replies)) found.replies = [];
    if (typeof found.seq !== 'number') found.seq = 0;
    if (!record(found.assembly) || !record((found.assembly as GovScope).gov) || !record((found.assembly as GovScope).gov.elections)) found.assembly = { gov: { elections: {}, announcements: [] } };
    found.v = 1;
    return found as Voice;
  };
  /** What a read sees: nothing is created. */
  const peekVoice = (db: Db): Voice => { const found = (db as unknown as Record<string, unknown>)['residentVoice']; return record(found) && record(found['days']) && record(found['tops']) && record(found['assembly']) && Array.isArray(found['letters']) && Array.isArray(found['replies']) ? found as unknown as Voice : emptyVoice(); };

  /** One wish or need from a resident's night. At most one of each kind per resident per Lagos day. */
  async function collect(idea: IdeaIn): Promise<boolean> {
    const checked = judgeIdea(idea.text);
    if (!checked.ok) return false;
    return ctx.store.transact((db) => {
      const voice = voiceFor(db), now = ctx.now(), day = lagosTime(now).day, key = String(day);
      const list = voice.days[key] ??= [];
      if (list.some((other) => other.id === idea.id && other.kind === idea.kind)) return false;
      list.push({ id: idea.id, name: clean(idea.name, 30), city: clean(idea.city, 24), kind: idea.kind, text: checked.text, at: now });
      voice.tops[key] = { wishes: topOfDay(list, 'wish'), needs: topOfDay(list, 'need') };
      for (const old of Object.keys(voice.days).map(Number).sort((a, b) => a - b).slice(0, -RAW_DAYS)) delete voice.days[String(old)];
      for (const old of Object.keys(voice.tops).map(Number).sort((a, b) => a - b).slice(0, -TOP_DAYS)) delete voice.tops[String(old)];
      return true;
    }, { durable: false });
  }
  /** The week's asks: the last seven days' tops merged again, weighted by how many asked each day. */
  function weekTops(voice: Voice, now: number): DayTop {
    const today = lagosTime(now).day, merge = (pick: (top: DayTop) => Cluster[]): Cluster[] => clusterIdeas(
      Object.entries(voice.tops).filter(([day]) => today - Number(day) < 7).sort((a, b) => Number(a[0]) - Number(b[0])).flatMap(([, top]) => pick(top).map((cluster) => ({ text: cluster.text, by: cluster.by[0] ?? '', city: cluster.cities[0] ?? '', count: cluster.count })))).slice(0, TOP_N);
    return { wishes: merge((top) => top.wishes), needs: merge((top) => top.needs) };
  }

  /** The election, once in CHECK_MS: stand, then vote. */
  async function elect(): Promise<void> {
    const now = ctx.now();
    await ctx.store.transact((db) => {
      const voice = voiceFor(db);
      electionStep(voice.assembly, active(), now);
    });
  }
  let writing = false;
  /** Sunday, Lagos time: the president's letter, once for the week. */
  async function letter(): Promise<Letter | null> {
    const now = ctx.now(), time = lagosTime(now);
    if (time.weekday !== 0 || writing) return null;
    const seen = await ctx.store.read((db) => { const voice = peekVoice(db); return { done: voice.letters.some((item) => item.week === time.week), voice: structuredClone(voice) }; });
    if (seen.done) return null;
    const president = presidentAt(seen.voice.assembly, active(), now);
    if (!president) return null;
    writing = true;
    try {
      const tops = weekTops(seen.voice, now), { who } = president;
      let text: string | null = null, model: string | null = null, tries = 0, costMicro = 0;
      const messages = [{ role: 'system' as const, content: lettersSystem(who) }, { role: 'user' as const, content: lettersUser(tops.wishes, tops.needs) }];
      for (let attempt = 0; attempt < 2 && text === null; attempt++) {
        let answer: AskResult;
        tries += 1;
        try { answer = await ask({ purpose: 'resident', messages: attempt === 0 ? messages : [...messages, { role: 'user', content: 'That was not what I needed. Write the letter again in your own words, as yourself: plain text, beginning "To the Founders,".' }], maxTokens: LETTER_TOKENS, carriesPlayerWords: false, timeoutMs: 12000 }); }
        catch { break; }
        if (!answer.ok) break;
        costMicro += answer.costMicro; model = answer.model;
        const checked = judgeLetter(answer.text);
        if (checked.ok) text = checked.text;
      }
      const wishes = tops.wishes.map((item) => item.text), needs = tops.needs.map((item) => item.text);
      const made: Letter = { week: time.week, at: ctx.now(), by: { id: residentId(who), name: who.name, city: who.city }, caretaker: president.caretaker, text: text ?? writtenLetter(who, wishes, needs), source: text === null ? 'rules' : 'model', model: text === null ? null : model, tries, costMicro, wishes, needs };
      return await ctx.store.transact((db) => {
        const voice = voiceFor(db);
        if (voice.letters.some((item) => item.week === made.week)) return null;
        voice.letters.push(made);
        if (voice.letters.length > LETTERS_KEPT) voice.letters.splice(0, voice.letters.length - LETTERS_KEPT);
        return made;
      });
    } finally { writing = false; }
  }

  let lastCheck = -Infinity, running = false;
  /** Called on the host's heartbeat; looks at most every CHECK_MS, only while residents are on. */
  function tick(): void {
    try {
      const now = ctx.now();
      if (running || !on() || (now - lastCheck < CHECK_MS && now >= lastCheck)) return;
      lastCheck = now; running = true;
      void (async () => { try { await elect(); await letter(); } catch { /* the next look tries again */ } finally { running = false; } })();
    } catch { /* a bad beat must never stop the host's heartbeat */ }
  }
  ctx.on?.('heartbeat', tick);

  /** The owner's answer (inside a transaction): kept, put into the gist, and later read into the residents' thoughts. */
  function reply(db: Db, adminName: string, body: { text: unknown; kind?: unknown; letter?: unknown }): { ok: true; reply: Reply } | { ok: false; code: string; reason: string } {
    const checked = judgeReply(body.text, body.kind);
    if (!checked.ok) return checked;
    const voice = voiceFor(db), week = typeof body.letter === 'number' && voice.letters.some((item) => item.week === body.letter) ? body.letter : null;
    const made = gist.add(db, { city: WORLD, kind: 'owner', text: gistWords(checked.kind, checked.text), refs: { key: `founders:${voice.seq + 1}` } });
    const item: Reply = { n: ++voice.seq, at: ctx.now(), kind: checked.kind, text: checked.text, admin: clean(adminName, 24), gist: made?.n ?? null, letter: week };
    voice.replies.push(item);
    if (voice.replies.length > REPLIES_KEPT) voice.replies.splice(0, voice.replies.length - REPLIES_KEPT);
    return { ok: true, reply: item };
  }

  /** The admin page: today's and the week's asks, the assembly, the president, the letters, the answers. Reads only. */
  function view(db: Db) {
    const voice = peekVoice(db), now = ctx.now(), time = lagosTime(now), phase = phaseAt(now), election = voice.assembly.gov.elections[phase.week];
    const president = presidentAt(voice.assembly, active(), now);
    const day = voice.tops[String(time.day)] ?? { wishes: [], needs: [] };
    return {
      on: on(), residents: active().length,
      today: day, week: weekTops(voice, now),
      days: Object.entries(voice.tops).sort((a, b) => Number(b[0]) - Number(a[0])).slice(0, 7).map(([key, top]) => ({ day: Number(key), ...top })),
      assembly: { week: phase.week, phase: phase.phase, endsAt: phase.endsAt, candidates: tally(election).map((c) => ({ id: c.id, name: c.name, slogan: c.slogan, votes: c.votes })), votes: Object.keys(election?.votes ?? {}).length },
      president: president ? { id: residentId(president.who), name: president.who.name, city: president.who.city, caretaker: president.caretaker } : null,
      letters: voice.letters.slice().reverse().slice(0, 8), replies: voice.replies.slice().reverse().slice(0, 10),
      sunday: time.weekday === 0, nextLetterDue: !voice.letters.some((item) => item.week === time.week),
    };
  }

  return { collect, tick, elect, letter, reply, view, peekVoice, weekTops };
}
export type ResidentVoice = ReturnType<typeof voiceOf>;
const services = new WeakMap<object, ResidentVoice>();
export function voiceService(ctx: RouteContext): ResidentVoice {
  let found = services.get(ctx);
  if (!found) services.set(ctx, found = voiceOf(ctx));
  return found;
}
