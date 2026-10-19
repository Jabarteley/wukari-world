/**
 * OWNER: agents (AI residents, docs/AI-RESIDENTS.md "Spot the AI")
 * SPOT THE AI: a weekly game of "which of these lines did an AI character say?", built from lines that were really said in public venues. Portable (no Node imports).
 *
 * WHY LINES AND NOT A LIVE ROOM. The plan's first idea was a room where five people chat with their names shown neutrally and players guess which are AI. That would
 * hide the AI-played mark for a while, and docs/AI-SAFETY.md and docs/HOUSE-AGENTS.md say an AI character ALWAYS carries it (no expiry; "AI pretending to be a person" is a
 * report reason). So the game shows lines, not characters: nobody is ever talked to under a hidden mark, and the answer reveals the same label the game shows everywhere.
 *
 * WHERE THE LINES COME FROM
 *   - AI lines: what a house agent said in a venue (runner.ts `speak` calls noteAiLine after the room accepted it).
 *   - People's lines: ONLY of people who opted in (an adult's choice, POST /api/agents/spot/opt), said in a public venue where an AI character stood (rooms.ts raises
 *     'venue-line' there). A line of a character an agent plays, or of a person whose character a key played in the last minutes, is never taken as a person's line.
 *   - Every line must pass spotLine: 12 to 140 characters, three words or more, no long number, no link, no handle, nothing the chat filter refuses for contact details,
 *     nothing the AI word rules refuse for a minor, and no capitalised word after the first but "I" and the city's own name (so a line naming someone is left out).
 *   - A person's line is kept with a one-way key, never their id or name; turning the choice off deletes their lines at once, from the pool and from this week's game.
 *
 * THE GAME. One a Lagos week, built on its first read from last week's lines (this week's too when there are not enough), frozen once built: up to 5 rounds of 5 lines,
 * 1 to 3 of them AI in each round, at most 3 lines of any one person in a game, and only when there are at least 6 people's lines from at least 3 people and 6 AI lines.
 * Each person plays once a week: the score is the lines told right (AI or person) out of all of them; the answer shows "Mama Tolani (AI-played)" or "A player who
 * opted in" for each line, never a player's name. A share card is drawn on the phone (AiLifePanel.vue) from the score alone.
 *
 * STORED: ctx.collection(db, 'spotAi') = { v: 1, seq, opt: { [publicId]: at }, lines: Line[], games: { [week]: Game }, plays: { [week]: { [key]: Play } } }, bounded
 * (SPOT.linesKept lines of each kind, two weeks of games and plays, SPOT.players plays a week). Writes are lazy ({ durable: false }): losing a minute of lines costs nothing.
 */
import { lagosTime } from '../../src/game/clock.ts';
import { sha256Hex } from '../../src/game/util.ts';
import { cityName } from '../../src/game/cities/registry.ts';
import { agentWords } from '../moderation/agent-words.ts';
import { screenText } from '../moderation/text.ts';
import type { Db, RouteContext } from '../types.ts';

export const SPOT = Object.freeze({ rounds: 5, perRound: 5, minRounds: 2, minHuman: 6, minPeople: 3, minAi: 6, perPerson: 3, lineMin: 12, lineMax: 140, linesKept: 400, buffer: 200, flushMs: 60000, players: 5000 });
const AGENT_WINDOW_MS = 5 * 60000;

export interface SpotLine { n: number; at: number; w: number; ai: 0 | 1; text: string; city: string; by: string }
export interface SpotItem { n: number; text: string; ai: 0 | 1; label: string; by: string }
export interface SpotGame { w: number; at: number; rounds: SpotItem[][] }
export interface SpotPlay { s: number; of: number; at: number }
export interface SpotCollection { v: 1; seq: number; opt: Record<string, number>; lines: SpotLine[]; games: Record<string, SpotGame>; plays: Record<string, Record<string, SpotPlay>> }

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
export const weekOf = (t: number): number => lagosTime(t).week;
export const emptySpot = (): SpotCollection => ({ v: 1, seq: 0, opt: {}, lines: [], games: {}, plays: {} });
export function spotOf(ctx: Pick<RouteContext, 'collection'>, db: Db): SpotCollection {
  const found = ctx.collection(db, 'spotAi', emptySpot()) as Partial<SpotCollection>;
  if (typeof found.seq !== 'number') found.seq = 0;
  if (!record(found.opt)) found.opt = {};
  if (!Array.isArray(found.lines)) found.lines = [];
  if (!record(found.games)) found.games = {};
  if (!record(found.plays)) found.plays = {};
  found.v = 1;
  return found as SpotCollection;
}
const peekSpot = (db: Db): SpotCollection | null => { const found = (db as unknown as Record<string, unknown>)['spotAi']; return record(found) && Array.isArray(found.lines) ? found as unknown as SpotCollection : null; };
/** The one-way key a person's lines and plays are kept under. */
export const personKey = (publicId: string): string => `s_${sha256Hex(`allworld-spot-v1|${publicId}`).slice(0, 24)}`;
const hash = (text: string): number => { let h = 2166136261; for (const char of text) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

const placeWords = (city: string): Set<string> => { let name = city; try { name = cityName(city) ?? city; } catch { /* the id stands */ } return new Set(`${name} ${city} Allworld`.toLowerCase().split(/[^a-z]+/).filter(Boolean)); };
/** Common first words of a line, in English and Pidgin. A capitalised first word not on this list is most likely a name, and the line is left out. */
const STARTERS = new Set(('i i\'m i\'ll i\'ve i\'d a an the this that these those there here it it\'s its we you your my our they he she who what where when why how which whose is are was were do does did can could will would should shall may might must ' +
  'have has had come let let\'s go look see buy take make give tell ask think try wait fresh fair new old looking hello hi hey welcome thanks thank please good great nice wow ah oh ehn eh ehen ooh yes yeah no not nobody ' +
  'everyone everybody anybody anyone someone somebody any some all just so but and or if then today tonight tomorrow yesterday morning now soon later again always never only maybe one two three plenty price quiz ' +
  'cloth abeg wetin na una oya omo e no make dey wan don sha jare biko well okay ok alright sorry congratulations happy merry mama papa aunty auntie uncle bro sis oga madam chai haba').split(' '));

/** A line made ready for the game, or null when it may not be used. The same rules for AI lines and people's lines. Pure. */
export function spotLine(raw: unknown, city: string): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length < SPOT.lineMin || text.length > SPOT.lineMax || text.split(' ').length < 3) return null;
  if (/\d{3,}|@|https?:|www\.|\.com\b/i.test(text)) return null;
  if (screenText(text, { contact: true, what: 'line' })) return null;
  if (!agentWords(text, { toMinor: true }).ok) return null;
  const place = placeWords(city);
  const words = text.split(' ');
  for (const [at, word] of words.entries()) {
    const bare = word.replace(/^[^\p{L}]+|[^\p{L}']+$/gu, '');
    if (!/^\p{Lu}/u.test(bare)) continue;
    // The first word may be capitalised only when it is a common way to start a line ("The", "Who", "Abeg"); "Tunde come and see" names someone.
    if (at === 0) { if (STARTERS.has(bare.toLowerCase()) || place.has(bare.toLowerCase())) continue; return null; }
    if (/^I(?:'m|'ll|'ve|'d)?$/.test(bare) || place.has(bare.toLowerCase())) continue;
    if (/[.!?]$/.test(words[at - 1] ?? '')) continue; // a new sentence
    return null; // a name, most likely: left out
  }
  return text;
}

/** A shuffle that is the same for the same seed. */
const shuffled = <T>(list: readonly T[], seed: string, key: (item: T) => string): T[] => [...list].sort((a, b) => hash(`${seed}|${key(a)}`) - hash(`${seed}|${key(b)}`));

/** Build the week's game from the pool, or null when there are not enough lines yet. Pure. */
export function buildGame(lines: readonly SpotLine[], w: number, now: number): SpotGame | null {
  const pool = lines.filter((line) => line.w === w - 1 || line.w === w).sort((a, b) => (a.w === b.w ? 0 : a.w === w - 1 ? -1 : 1));
  const ai = shuffled(pool.filter((line) => line.ai === 1), `ai${w}`, (line) => String(line.n));
  const perPerson = new Map<string, number>(), human: SpotLine[] = [];
  for (const line of shuffled(pool.filter((entry) => entry.ai === 0), `p${w}`, (entry) => String(entry.n))) {
    const used = perPerson.get(line.by) ?? 0;
    if (used >= SPOT.perPerson) continue;
    perPerson.set(line.by, used + 1); human.push(line);
  }
  // The same words twice (a greeting said every day) would give the answer away: once each.
  const unique = (list: SpotLine[]): SpotLine[] => list.filter((line, at) => list.findIndex((other) => other.text.toLowerCase() === line.text.toLowerCase()) === at);
  const ais = unique(ai), people = unique(human);
  if (people.length < SPOT.minHuman || new Set(people.map((line) => line.by)).size < SPOT.minPeople || ais.length < SPOT.minAi) return null;
  const rounds: SpotItem[][] = [];
  let a = 0, p = 0;
  for (let r = 0; r < SPOT.rounds; r++) {
    const want = 1 + (hash(`${w}|round|${r}`) % 3);
    const takeAi = Math.min(want, ais.length - a), takePeople = SPOT.perRound - takeAi;
    if (takeAi < 1 || people.length - p < takePeople) break;
    const items: SpotItem[] = [
      ...ais.slice(a, a + takeAi).map((line) => ({ n: line.n, text: line.text, ai: 1 as const, label: `${line.by} (AI-played)`, by: line.by })),
      ...people.slice(p, p + takePeople).map((line) => ({ n: line.n, text: line.text, ai: 0 as const, label: 'A player who opted in', by: line.by })),
    ];
    a += takeAi; p += takePeople;
    rounds.push(shuffled(items, `${w}|items|${r}`, (item) => String(item.n)));
  }
  return rounds.length >= SPOT.minRounds ? { w, at: now, rounds } : null;
}

/** A play scored: each line told right (AI or a person) is a point. `aiPicks` are the line numbers the player says an AI said. Pure. */
export function score(game: SpotGame, aiPicks: readonly number[]): { s: number; of: number; rounds: (SpotItem & { picked: boolean; right: boolean })[][] } {
  const picked = new Set(aiPicks);
  let s = 0, of = 0;
  const rounds = game.rounds.map((round) => round.map((item) => { const said = picked.has(item.n), right = said === (item.ai === 1); of += 1; if (right) s += 1; return { ...item, picked: said, right }; }));
  return { s, of, rounds };
}

export type SpotView =
  | { ok: true; week: number; state: 'open'; rounds: { n: number; text: string }[][]; opted: boolean; adult: boolean; played: null }
  | { ok: true; week: number; state: 'played'; opted: boolean; adult: boolean; played: SpotResult }
  | { ok: true; week: number; state: 'not_enough'; opted: boolean; adult: boolean; need: { people: number; ai: number } };
export interface SpotResult { s: number; of: number; better: number; players: number; rounds: { n: number; text: string; ai: boolean; label: string; picked: boolean; right: boolean }[][] }

export function spotService(ctx: RouteContext) {
  const pending: { ai: boolean; id: string; name: string; text: string; city: string }[] = [];
  let lastFlush = -Infinity, flushing = false;
  const adult = (db: Db, id: string): boolean => ctx.checks?.adult?.(db, id) === true;
  /** A character an agent plays for good, or a person's character a key played in the last minutes: its lines are never a person's. */
  function aiPlayed(db: Db, id: string): boolean {
    const players = (db as unknown as { social?: { players?: Record<string, { agent?: { char?: true; at?: number } }> } }).social?.players;
    const agent = players?.[id]?.agent;
    const chars = (db as unknown as { agents?: { chars?: Record<string, unknown> } }).agents?.chars;
    return agent?.char === true || (typeof agent?.at === 'number' && ctx.now() - agent.at < AGENT_WINDOW_MS) || Boolean(chars && Object.hasOwn(chars, id));
  }

  function note(entry: (typeof pending)[number]): void {
    if (pending.length >= SPOT.buffer) pending.shift();
    pending.push(entry);
  }
  /** Write what was heard since the last flush: AI lines that pass, and people's lines only of people who opted in and are confirmed adults. */
  async function flush(force = false): Promise<number> {
    const t = ctx.now();
    if (flushing || !pending.length || (!force && t - lastFlush < SPOT.flushMs)) return 0;
    flushing = true; lastFlush = t;
    const batch = pending.splice(0, pending.length);
    try {
      return await ctx.store.transact((db) => {
        const peek = peekSpot(db);
        if (!batch.some((entry) => entry.ai) && !batch.some((entry) => peek?.opt[entry.id] !== undefined)) return 0; // nobody opted in said anything, and no AI line: no write
        const spot = spotOf(ctx, db), w = weekOf(t);
        let added = 0;
        for (const entry of batch) {
          if (!entry.ai && (!Object.hasOwn(spot.opt, entry.id) || !adult(db, entry.id) || aiPlayed(db, entry.id))) continue;
          const text = spotLine(entry.text, entry.city);
          if (!text) continue;
          const by = entry.ai ? entry.name.slice(0, 40) : personKey(entry.id);
          if (spot.lines.some((line) => line.w === w && line.text.toLowerCase() === text.toLowerCase())) continue;
          spot.lines.push({ n: ++spot.seq, at: t, w, ai: entry.ai ? 1 : 0, text, city: entry.city, by });
          added += 1;
        }
        prune(spot, w);
        return added;
      }, { durable: false });
    } catch { return 0; } finally { flushing = false; }
  }
  function prune(spot: SpotCollection, w: number): void {
    spot.lines = spot.lines.filter((line) => line.w >= w - 1);
    for (const kind of [0, 1] as const) {
      const mine = spot.lines.filter((line) => line.ai === kind);
      if (mine.length > SPOT.linesKept) { const drop = new Set(mine.slice(0, mine.length - SPOT.linesKept).map((line) => line.n)); spot.lines = spot.lines.filter((line) => !drop.has(line.n)); }
    }
    for (const key of Object.keys(spot.games)) if (Number(key) < w - 1) delete spot.games[key];
    for (const key of Object.keys(spot.plays)) if (Number(key) < w - 1) delete spot.plays[key];
  }

  function onLine(event: { room: string; group: string | null; from: { id: string; name: string; agent?: boolean }; body: string }): void {
    try {
      if (event.from.agent === true || event.from.id.startsWith('house.') || event.from.id.startsWith('resident.')) return;
      const parts = event.room.split(':');
      if (parts.length !== 2 || !parts[1] || parts[1] === 'home') return; // a venue of a city: public
      note({ ai: false, id: event.from.id, name: '', text: event.body.slice(0, 300), city: parts[0]! });
    } catch { /* never reaches the room */ }
  }
  ctx.on?.('venue-line', onLine);
  ctx.on?.('heartbeat', () => { void flush().catch(() => {}); });

  /** The week's game for one person, built on the first read of the week. Inside a transaction. */
  function view(db: Db, publicId: string): SpotView {
    const t = ctx.now(), w = weekOf(t), spot = spotOf(ctx, db), key = personKey(publicId);
    const opted = Object.hasOwn(spot.opt, publicId), grown = adult(db, publicId);
    let game = spot.games[String(w)];
    if (!game) { const made = buildGame(spot.lines, w, t); if (made) { game = made; spot.games[String(w)] = made; } }
    const play = spot.plays[String(w)]?.[key];
    if (game && play) return { ok: true, week: w, state: 'played', opted, adult: grown, played: resultOf(spot, game, w, play, null) };
    if (!game) {
      const pool = spot.lines.filter((line) => line.w >= w - 1), people = pool.filter((line) => line.ai === 0);
      return { ok: true, week: w, state: 'not_enough', opted, adult: grown, need: { people: Math.max(0, SPOT.minPeople - new Set(people.map((line) => line.by)).size), ai: Math.max(0, SPOT.minAi - pool.filter((line) => line.ai === 1).length) } };
    }
    return { ok: true, week: w, state: 'open', rounds: game.rounds.map((round) => round.map((item) => ({ n: item.n, text: item.text }))), opted, adult: grown, played: null };
  }
  function resultOf(spot: SpotCollection, game: SpotGame, w: number, play: SpotPlay, picks: readonly number[] | null): SpotResult {
    const all = Object.values(spot.plays[String(w)] ?? {});
    const scored = score(game, picks ?? []);
    return {
      s: play.s, of: play.of, players: all.length, better: all.length > 1 ? Math.round((100 * all.filter((other) => other.s < play.s).length) / (all.length - 1)) : 100,
      rounds: scored.rounds.map((round) => round.map((item) => ({ n: item.n, text: item.text, ai: item.ai === 1, label: item.label, picked: picks ? item.picked : false, right: picks ? item.right : false }))),
    };
  }
  /** One play a week. Inside a transaction. */
  function guess(db: Db, publicId: string, picks: unknown): { ok: true; result: SpotResult } | { ok: false; code: string; reason: string } {
    if (!Array.isArray(picks) || picks.length > SPOT.rounds * SPOT.perRound || !picks.every((n) => Number.isSafeInteger(n))) return { ok: false, code: 'invalid_picks', reason: 'Pick the lines you think an AI said.' };
    const t = ctx.now(), w = weekOf(t), spot = spotOf(ctx, db), key = personKey(publicId), game = spot.games[String(w)];
    if (!game) return { ok: false, code: 'not_open', reason: 'There is no game this week yet. Come back later.' };
    const plays = (spot.plays[String(w)] ??= {});
    if (Object.hasOwn(plays, key)) return { ok: false, code: 'played', reason: 'You have played this week. A new game opens on Monday.' };
    if (Object.keys(plays).length >= SPOT.players) return { ok: false, code: 'full', reason: 'This week\'s game is full. A new one opens on Monday.' };
    const scored = score(game, picks as number[]);
    const play: SpotPlay = { s: scored.s, of: scored.of, at: t };
    plays[key] = play;
    return { ok: true, result: resultOf(spot, game, w, play, picks as number[]) };
  }
  /** Opt in (adults only) or out. Out deletes every line kept of this person, in the pool and in this week's game. Inside a transaction. */
  function opt(db: Db, publicId: string, on: boolean): { ok: true; opted: boolean; deleted: number } | { ok: false; code: string; reason: string } {
    const spot = spotOf(ctx, db);
    if (on) {
      if (!adult(db, publicId)) return { ok: false, code: 'adults_only', reason: 'Only players who have said they are 18 or older can put their lines in Spot the AI.' };
      if (aiPlayed(db, publicId)) return { ok: false, code: 'ai_played', reason: 'A character an AI plays cannot put lines in as a person.' };
      spot.opt[publicId] ??= ctx.now();
      return { ok: true, opted: true, deleted: 0 };
    }
    delete spot.opt[publicId];
    return { ok: true, opted: false, deleted: forget(spot, personKey(publicId)) };
  }
  return {
    view, guess, opt, flush, onLine,
    /** Runner hook (noteAiLine): a line a house agent said in public. */
    noteAi: (line: { name: string; text: string; city: string }): void => note({ ai: true, id: '', name: line.name, text: line.text.slice(0, 300), city: line.city }),
    pending: (): number => pending.length,
  };
}
export type Spot = ReturnType<typeof spotService>;

/** Take one person's lines out of everything: the pool and every built game (opting out, or an erased account). Returns how many lines went. */
function forget(spot: SpotCollection, key: string): number {
  const before = spot.lines.length;
  spot.lines = spot.lines.filter((line) => line.ai === 1 || line.by !== key);
  let deleted = before - spot.lines.length;
  for (const game of Object.values(spot.games)) for (const round of game.rounds) { const left = round.filter((item) => item.ai === 1 || item.by !== key); deleted += round.length - left.length; round.splice(0, round.length, ...left); }
  for (const game of Object.values(spot.games)) game.rounds = game.rounds.filter((round) => round.length > 0);
  return deleted;
}
/** Erasure: a person's lines, plays and choice go with the account. */
export function eraseSpot(db: Db, publicId: string): void {
  const spot = peekSpot(db);
  if (!spot) return;
  delete spot.opt[publicId];
  const key = personKey(publicId);
  forget(spot, key);
  for (const plays of Object.values(spot.plays)) delete plays[key];
}

const services = new WeakMap<object, Spot>();
/** The one Spot the AI service of a host. */
export function spotFor(ctx: RouteContext): Spot {
  let found = services.get(ctx);
  if (!found) services.set(ctx, found = spotService(ctx));
  return found;
}
/** A line a house agent said in public (runner.ts calls it after the room accepted the line). Cheap: kept in memory until the next flush. */
export function noteAiLine(ctx: RouteContext, line: { name: string; text: string; city: string }): void {
  try { spotFor(ctx).noteAi(line); } catch { /* the line was said; the game can miss it */ }
}
