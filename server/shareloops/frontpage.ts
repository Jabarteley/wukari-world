/**
 * OWNER: growth (share loops, docs/SHARE-LOOPS.md)
 * THE CITY FRONT PAGE: each morning, a newspaper front page for a city from the previous Lagos day's public gist lines (server/gist/ledger.ts).
 *
 *   SOURCE   only the gist: words that were already public when they were written, with the gist's own privacy (adults named, hidden players
 *            and private facts never in it, no ids). Nothing else is given to the model, and nothing about any reader.
 *   TEMPLATE frontTemplate (pure) puts the lines together as they are: the most important line is the headline (an election before a law
 *            before a party…), the next ones are the stories. It is what a reader gets whenever there is no model page, and it is the
 *            fallback for every refusal and every page that does not pass the check below.
 *   MODEL    on a live host (ctx.worldFeed), the heartbeat writes at most one page a minute, after 06:00 Lagos, for a city with at least
 *            MODEL_MIN_LINES lines that has none for that day yet: one request with purpose 'newspaper' (paid models: the lines carry
 *            players' shown names). Caps: one model page per city a day, MODEL_DAILY in all a day, and the router's own spend cap.
 *   NO NEW FACTS  the model answers JSON naming the line each story comes from (frontPrompt, readModelPage). A page is kept only if every
 *            number and every capitalised name it wrote is in the lines (staysWithin); a story that adds one is dropped, a headline that
 *            does so drops the whole page (the template is used). A story told from a line about an AI character says "(AI)".
 *   KEPT     loops.pages[city], the last FRONT_DAYS pages, words only.
 */
import { LAGOS_OFFSET_MS, lagosDayStart, lagosTime } from '../../src/game/clock.ts';
import { cityName } from '../../src/game/cities/registry.ts';
import { peekGist } from '../gist/ledger.ts';
import { routerOf } from '../models/service.ts';
import { FRONT_DAYS, loopsOf, peekLoops } from './store.ts';
import type { GistItem, GistKind } from '../gist/ledger.ts';
import type { AskResult } from '../models/router.ts';
import type { ChatMessage } from '../companion/gateway.ts';
import type { FrontPageStory, FrontPageView } from '../../src/types/shareloops.ts';
import type { Db, RouteContext } from '../types.ts';

export const MODEL_MIN_LINES = 3, MODEL_DAILY = 40, MORNING_HOUR = 6, MAX_LINES = 24, MAX_STORIES = 4, TICK_MS = 60_000;
/** Which line leads: the order a city editor would choose. */
const WEIGHT: Readonly<Record<GistKind, number>> = { election: 10, removal: 9, law: 8, party: 7, jail: 6, business: 5, event: 4, owner: 3, notice: 3, busy: 2, other: 1 };

const clip = (value: unknown, max: number): string => { const text = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim(); return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text; };
export const dayName = (day: number): string => new Date(lagosDayStart(day) + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
const safeName = (city: string): string => { try { return cityName(city) ?? city; } catch { return city; } };
export const paperName = (name: string): string => `The ${name} Gist`;

/** The lines of one Lagos day for a city (its own, not the world's), oldest first, at most MAX_LINES (the most important kept). */
export function linesOfDay(items: readonly GistItem[], city: string, day: number): GistItem[] {
  const start = lagosDayStart(day), end = lagosDayStart(day + 1);
  const found = items.filter((item) => item.city === city && item.at >= start && item.at < end);
  return found.sort((a, b) => WEIGHT[b.kind] - WEIGHT[a.kind] || a.at - b.at).slice(0, MAX_LINES).sort((a, b) => a.at - b.at);
}
const ai = (item: GistItem): boolean => item.refs?.ai === 1 || item.refs?.ai === '1';
const timeOf = (at: number): string => { const t = lagosTime(at); return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`; };
const KIND_WORDS: Readonly<Record<GistKind, string>> = { election: 'Elections', removal: 'Politics', law: 'Laws', party: 'Parties', jail: 'Justice', business: 'Business', event: 'Events', owner: 'Notice', notice: 'Notice', busy: 'Around town', other: 'Around town' };

/** The page made from the lines as they are. Null when there are none. */
export function frontTemplate(city: string, name: string, day: number, lines: readonly GistItem[]): FrontPageView | null {
  if (!lines.length) return null;
  const order = [...lines].sort((a, b) => WEIGHT[b.kind] - WEIGHT[a.kind] || b.at - a.at);
  const lead = order[0]!;
  const stories: FrontPageStory[] = order.slice(1, 1 + MAX_STORIES).map((item) => ({ head: clip(`${item.text}${ai(item) ? ' (AI)' : ''}`, 120), body: `${KIND_WORDS[item.kind]} · ${timeOf(item.at)} in ${name}.` }));
  return { city, cityName: name, date: dayName(day), paper: paperName(name), headline: clip(`${lead.text}${ai(lead) ? ' (AI)' : ''}`, 120), stories, by: 'template', lines: lines.length };
}

/** The request to the model: the numbered lines and the rules. */
export function frontPrompt(name: string, date: string, lines: readonly GistItem[]): ChatMessage[] {
  const numbered = lines.map((item, index) => `${index + 1}. ${item.text}${ai(item) ? ' [about an AI character]' : ''}`).join('\n');
  return [
    { role: 'system', content: `You write the front page of "${paperName(name)}", a lively newspaper of a city in a game. Write ONLY from the numbered lines you are given: never add a person, a place, a number, an amount, a time or an event that is not in them, and never guess why something happened. Short, punchy, warm, never cruel; sentence case. Answer with JSON only: {"headline":{"line":<number>,"text":"<at most 90 characters>"},"stories":[{"line":<number>,"head":"<at most 70 characters>","body":"<one or two sentences, at most 200 characters>"}]} with at most ${MAX_STORIES} stories, each from a different line than the headline.` },
    { role: 'user', content: `${name}, ${date}. The lines:\n${numbered}` },
  ];
}

/** Words that may start with a capital without being a name. */
const COMMON = new Set(['the', 'a', 'an', 'and', 'but', 'or', 'in', 'on', 'at', 'of', 'for', 'to', 'with', 'from', 'by', 'as', 'is', 'are', 'was', 'were', 'new', 'big', 'city', 'today', 'yesterday', 'tonight', 'this', 'that', 'it', 'its', 'all', 'what', 'who', 'how', 'why', 'after', 'before', 'more', 'no', 'not', 'one', 'two', 'three', 'ai', 'gist', 'breaking', 'also', 'meanwhile', 'plus', 'just', 'now', 'here', 'there', 'they', 'he', 'she', 'we', 'you', 'i', 'governor', 'mayor', 'party', 'law', 'election', 'court', 'market', 'square', 'news', 'people', 'residents', 'resident', 'crowd', 'crowds', 'busy', 'business', 'shop', 'event', 'events', 'notice', 'town']);
/** True when every number and every capitalised word of `text` is in the lines (or the city's name): the model added no fact. */
export function staysWithin(text: string, source: string): boolean {
  const have = source.toLowerCase();
  for (const number of text.match(/\d[\d,.]*/g) ?? []) if (!have.includes(number.replace(/[.,]+$/, '').toLowerCase())) return false;
  for (const word of text.match(/[A-Z][\p{L}'’-]+/gu) ?? []) {
    const plain = word.toLowerCase().replace(/['’]s$/, '');
    if (COMMON.has(plain)) continue;
    if (!have.includes(plain)) return false;
  }
  return true;
}

/** The model's answer as a page, checked line by line; null when it is not usable (the template is used). */
export function readModelPage(text: string, city: string, name: string, day: number, lines: readonly GistItem[]): FrontPageView | null {
  let parsed: unknown;
  try { parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()); } catch { return null; }
  const answer = parsed as { headline?: { line?: unknown; text?: unknown }; stories?: unknown };
  const source = `${lines.map((item) => item.text).join('\n')}\n${name}`;
  const lineOf = (n: unknown): GistItem | null => (typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= lines.length ? lines[n - 1]! : null);
  const lead = lineOf(answer.headline?.line), headline = clip(answer.headline?.text, 90);
  if (!lead || !headline || !staysWithin(headline, source)) return null;
  const used = new Set<GistItem>([lead]), stories: FrontPageStory[] = [];
  for (const raw of Array.isArray(answer.stories) ? answer.stories : []) {
    const story = raw as { line?: unknown; head?: unknown; body?: unknown }, from = lineOf(story.line);
    const head = clip(story.head, 70), body = clip(story.body, 200);
    if (!from || used.has(from) || !head || !body || !staysWithin(`${head} ${body}`, source)) continue;
    used.add(from);
    stories.push({ head: `${head}${ai(from) ? ' (AI)' : ''}`, body });
    if (stories.length >= MAX_STORIES) break;
  }
  return { city, cityName: name, date: dayName(day), paper: paperName(name), headline: `${headline}${ai(lead) ? ' (AI)' : ''}`, stories, by: 'ai', lines: lines.length };
}

/** The page a reader gets for a city now: the stored one for yesterday, else the template of yesterday's lines (made on the fly, not stored). */
export function frontPageOf(db: Db, city: string, now: number): FrontPageView | null {
  const day = lagosTime(now).day - 1, date = dayName(day);
  const kept = peekLoops(db)?.pages?.[city]?.find((page) => page.date === date);
  if (kept) return kept;
  return frontTemplate(city, safeName(city), day, linesOfDay(peekGist(db).cities[city] ?? [], city, day));
}

export interface FrontPageDeps { ask?: (messages: ChatMessage[]) => Promise<AskResult> }

/**
 * The heartbeat's part: at most one model page per TICK_MS. Picks the city with the most lines yesterday that has no page yet, asks the
 * model (outside any transaction), and stores what came back, or the template when the model refused or wrote something it may not.
 */
export function frontPages(ctx: RouteContext, deps: FrontPageDeps = {}) {
  let busy = false, last = -Infinity;
  const ask = deps.ask ?? ((messages: ChatMessage[]) => routerOf(ctx).ask({ purpose: 'newspaper', messages, maxTokens: 600, carriesPlayerWords: true, timeoutMs: 25_000 }));
  async function tick(force = false): Promise<FrontPageView | null> {
    const now = ctx.now();
    if (busy || (!force && now - last < TICK_MS)) return null;
    if (lagosTime(now).hour < MORNING_HOUR) return null;
    busy = true; last = now;
    try {
      const day = lagosTime(now).day - 1, date = dayName(day);
      const pick = await ctx.store.read((db) => {
        const loops = peekLoops(db), made = loops?.made;
        const today = lagosTime(now).day;
        if (made && made.day === today && made.n >= MODEL_DAILY) return null;
        const gist = peekGist(db);
        let best: { city: string; lines: GistItem[] } | null = null;
        for (const city of ctx.cityIds) {
          if (loops?.pages?.[city]?.some((page) => page.date === date)) continue;
          if (made && made.day === today && (made.city[city] ?? 0) >= 1) continue;
          const lines = linesOfDay(gist.cities[city] ?? [], city, day);
          if (lines.length >= MODEL_MIN_LINES && (!best || lines.length > best.lines.length)) best = { city, lines };
        }
        return best;
      });
      if (!pick) return null;
      const name = safeName(pick.city);
      const answer = await ask(frontPrompt(name, date, pick.lines)).catch((): AskResult => ({ ok: false, why: 'failed', attempts: [] }));
      const page = (answer.ok ? readModelPage(answer.text, pick.city, name, day, pick.lines) : null) ?? frontTemplate(pick.city, name, day, pick.lines);
      if (!page) return null;
      await ctx.store.transact((db) => {
        const loops = loopsOf(ctx, db), today = lagosTime(ctx.now()).day;
        if (loops.made.day !== today) loops.made = { day: today, n: 0, city: {} };
        loops.made.n += 1; loops.made.city[pick.city] = (loops.made.city[pick.city] ?? 0) + 1;
        const pages = (loops.pages[pick.city] ?? []).filter((kept) => kept.date !== page.date);
        pages.push(page);
        loops.pages[pick.city] = pages.slice(-FRONT_DAYS);
      }, { durable: false });
      return page;
    } finally { busy = false; }
  }
  return { tick };
}
