/**
 * OWNER: minigames (docs/MINI-GAMES.md)
 * JAMB SEASON, the server half: a two-week revision game for Nigeria. Daily practice (five original questions, jamb-questions.ts), a mock exam (twenty questions
 * in twenty minutes, once), and a results-day card from the seventh day. It is a game about revising, not an exam and not a promise about one.
 *
 *   SEASON  an admin switch (`jambOn`) and a year label (`jambYear`); a person joins once a season, in Nigeria only (the character's city decides).
 *   TRUST   the server draws each day's questions from the person's own seed and sends them without answers; the right answer is checked on the server, the order
 *           of the four options is the server's, and nothing the browser says about a score is read. A question is paid once.
 *   MONEY   game naira only, through the living-world server action: PAY_PER_CORRECT for each right practice answer (at most PRACTICE_DAY_CAP a day), MOCK_PAY
 *           for a mock with at least half right (MOCK_PAY_LOW for one with fewer), once a season; the day's whole season pay is capped at SEASON_DAY_CAP.
 */
import { countryOfCity } from '../moderation/ai-intercept.ts';
import { hash } from '../house/lines.ts';
import type { JambAnswerResult, JambCard, JambMockResult, JambMockView, JambPracticeView, JambQuestionView, JambSubject, JambView } from '../../src/types/minigames.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';
import { SEASON_DAY_CAP, dayOf, no, reward, whole, workerOf } from './common.ts';
import type { Refused, Small } from './common.ts';
import { minigamesOf, peekMinigames } from './store.ts';
import type { DayRow, JambRow, MiniGamesCollection } from './store.ts';
import { BANK, SUBJECTS, idsOf, optionsOf } from './jamb-questions.ts';

export const PRACTICE_PER_DAY = 5, PRACTICE_MIX: Readonly<Record<JambSubject, number>> = { english: 2, maths: 2, general: 1 };
export const PAY_PER_CORRECT = 50, PRACTICE_DAY_CAP = PRACTICE_PER_DAY * PAY_PER_CORRECT;
export const MOCK_MIX: Readonly<Record<JambSubject, number>> = { english: 7, maths: 7, general: 6 };
export const MOCK_TOTAL = 20, MOCK_MINUTES = 20, MOCK_GRACE_MS = 60_000, MOCK_NEEDS_DAYS = 3, MOCK_PAY = 1000, MOCK_PAY_LOW = 200;
export const SEASON_DAYS = 14, RESULTS_DAY = 7;
export { SEASON_DAY_CAP };

const bandOf = (score: number): string => (score >= 320 ? 'Strong' : score >= 240 ? 'Good' : score >= 160 ? 'Almost there' : 'Keep reading');

/** Question ids by hash order for this person and day, unseen first. Pure. */
export function draw(seed: string, day: number, subject: JambSubject, want: number, seen: ReadonlySet<number>): number[] {
  const all = idsOf(subject);
  const order = (ids: number[]): number[] => ids.map((id) => ({ id, key: hash(`${seed}|${day}|${id}`) })).sort((a, b) => a.key - b.key || a.id - b.id).map((entry) => entry.id);
  const fresh = order(all.filter((id) => !seen.has(id))).slice(0, want);
  return fresh.length >= want ? fresh : [...fresh, ...order(all.filter((id) => !fresh.includes(id))).slice(0, want - fresh.length)];
}

export function jambService(ctx: RouteContext) {
  const worker = workerOf(ctx);
  const on = (): boolean => ctx.checks?.setting?.('jambOn') === true;
  const yearLabel = (): string => { const value = ctx.checks?.text?.('jambYear'); return typeof value === 'string' && value.trim() ? value.trim().slice(0, 12) : '2027'; };
  const dayRow = (c: MiniGamesCollection, me: string, day: number): DayRow => { const row = c.days[me]; return row && row.day === day ? row : (c.days[me] = { day, buys: 0, rephrased: 0, earned: 0 }); };

  const rowOf = (c: MiniGamesCollection | null, me: string): JambRow | null => { const row = c?.jamb[me]; return row && row.year === yearLabel() ? row : null; };
  const dayNumber = (row: JambRow, now: number): number => Math.max(0, dayOf(now) - row.joinedDay);
  const question = (id: number, seed: string): JambQuestionView | null => { const row = BANK[id], opts = optionsOf(id, seed); return row && opts ? { id, subject: row[0], text: row[1], options: opts.options } : null; };
  const resultOf = (row: JambRow, id: number): JambAnswerResult | null => {
    const given = row.today?.answered[String(id)], bank = BANK[id], opts = optionsOf(id, row.seed);
    return given && bank && opts ? { id, choice: given.choice, correct: given.correct, answer: opts.answer, why: bank[4], paid: given.correct ? PAY_PER_CORRECT : 0 } : null;
  };

  function practiceView(row: JambRow, now: number): JambPracticeView | null {
    const today = row.today;
    if (!today || today.day !== dayOf(now)) return null;
    const answered = today.ids.flatMap((id) => resultOf(row, id) ?? []);
    return { day: dayNumber(row, now), questions: today.ids.flatMap((id) => question(id, row.seed) ?? []), answered, paid: answered.reduce((sum, item) => sum + item.paid, 0) };
  }
  function mockView(row: JambRow, now: number): JambMockView {
    const day = dayNumber(row, now), mock = row.mock;
    const base = { questions: [] as JambQuestionView[], endsAt: null as number | null, minutes: MOCK_MINUTES, result: null as JambMockResult | null };
    if (mock?.result) return { ...base, state: 'done', result: { ...mock.result, bySubject: mock.result.bySubject as JambMockResult['bySubject'] } };
    if (mock && now <= mock.startedAt + MOCK_MINUTES * 60_000 + MOCK_GRACE_MS) return { ...base, state: 'running', questions: mock.ids.flatMap((id) => question(id, row.seed) ?? []), endsAt: mock.startedAt + MOCK_MINUTES * 60_000 };
    if (day >= SEASON_DAYS) return { ...base, state: 'locked', need: 'The season is over.' };
    if (row.days.length < MOCK_NEEDS_DAYS) return { ...base, state: 'locked', need: `Practise on ${MOCK_NEEDS_DAYS} different days first: ${row.days.length} so far.` };
    return { ...base, state: 'ready' };
  }
  function cardOf(row: JambRow, name: string): JambCard | null {
    const result = row.mock?.result;
    if (!result) return null;
    const ratio = (subject: JambSubject): number => { const part = result.bySubject[subject]; return part && part.total ? part.correct / part.total : 0; };
    const best = [...SUBJECTS].sort((a, b) => ratio(b) - ratio(a) || SUBJECTS.indexOf(a) - SUBJECTS.indexOf(b))[0]!;
    return { name: name.slice(0, 24), year: row.year, score: result.score, correct: result.correct, total: result.total, best, practiceDays: row.days.length, practiceCorrect: row.correct, practiceAnswered: row.answered, streak: row.streak, band: bandOf(result.score) };
  }
  function view(db: Db | null, session: SessionRecord, now: number): JambView {
    const c = db ? peekMinigames(db) : null, row = rowOf(c, session.publicId);
    const empty: JambMockView = { state: 'locked', questions: [], endsAt: null, minutes: MOCK_MINUTES, result: null, need: 'Join the season first.' };
    const common = { on: on(), year: yearLabel(), resultsDay: RESULTS_DAY, caps: { practiceDay: PRACTICE_DAY_CAP, mock: MOCK_PAY } };
    if (!row) return { ...common, joined: false, day: 0, practice: null, mock: empty, streak: 0, resultsReady: false, card: null, earned: 0 };
    const day = dayNumber(row, now);
    return { ...common, joined: true, day, practice: practiceView(row, now), mock: mockView(row, now), streak: row.streak, resultsReady: day >= RESULTS_DAY && Boolean(row.mock?.result),
      card: day >= RESULTS_DAY ? cardOf(row, ctx.publicSession(session).name) : null, earned: row.earned };
  }

  /** The common checks of a write: the switch, Nigeria, the life. */
  function gate(session: SessionRecord, body: Record<string, unknown>) {
    const cityId = typeof body.cityId === 'string' ? body.cityId : '';
    if (!on()) return no('season_closed', 'JAMB season is not open right now.');
    if (countryOfCity(cityId) !== 'ng') return no('nigeria_only', 'JAMB season is for Nigeria only.');
    const life = worker(session, cityId);
    return { ok: true as const, cityId, life };
  }
  /** Pays within the day's season cap; the amount that reached the wallet. */
  function pay(c: MiniGamesCollection, me: string, life: Parameters<typeof reward>[1], city: string, amount: number, now: number): number {
    const day = dayRow(c, me, dayOf(now)), room = Math.max(0, SEASON_DAY_CAP - day.earned), allowed = Math.min(amount, room);
    const paid = reward(ctx, life, city, allowed, 'jamb');
    day.earned += paid;
    return paid;
  }

  return {
    view: (db: Db, session: SessionRecord, now: number): JambView => view(db, session, now),

    /** Inside ctx.once: join this season's revision. Joining again in the same season changes nothing. */
    join(db: Db, session: SessionRecord, body: Record<string, unknown>, now: number): Small | Refused {
      const g = gate(session, body);
      if (!g.ok) return g;
      const c = minigamesOf(ctx, db), me = session.publicId;
      if (rowOf(c, me)) return { ok: true };
      c.jamb[me] = { year: yearLabel(), city: g.cityId, joinedDay: dayOf(now), seed: ctx.randomId().replace(/-/g, ''), seen: [], today: null, days: [], correct: 0, answered: 0, mock: null, earned: 0, streak: 0, lastDay: -1 };
      return { ok: true };
    },

    /** Today's five questions, drawn on the first ask of the day and kept for the day. */
    today(db: Db, session: SessionRecord, body: Record<string, unknown>, now: number): { ok: true; jamb: JambView } | Refused {
      const g = gate(session, body);
      if (!g.ok) return g;
      const c = minigamesOf(ctx, db), row = rowOf(c, session.publicId), day = dayOf(now);
      if (!row) return no('not_joined', 'Join the season first.');
      if (dayNumber(row, now) >= SEASON_DAYS) return no('season_over', 'The season is over. Your results card is still here.');
      if (!row.today || row.today.day !== day) {
        const seen = new Set(row.seen);
        const ids = SUBJECTS.flatMap((subject) => draw(row.seed, day, subject, PRACTICE_MIX[subject], seen));
        row.today = { day, ids, answered: {} };
      }
      return { ok: true, jamb: view(db, session, now) };
    },

    /** Inside ctx.once: one practice answer. The server says whether it is right; a question pays once. */
    answer(db: Db, session: SessionRecord, body: Record<string, unknown>, now: number): Small | Refused {
      const g = gate(session, body);
      if (!g.ok) return g;
      const c = minigamesOf(ctx, db), me = session.publicId, row = rowOf(c, me), day = dayOf(now);
      if (!row) return no('not_joined', 'Join the season first.');
      const id = typeof body.id === 'number' && Number.isSafeInteger(body.id) ? body.id : -1, choice = typeof body.choice === 'number' && Number.isSafeInteger(body.choice) ? body.choice : -1;
      if (!row.today || row.today.day !== day || !row.today.ids.includes(id)) return no('not_today', 'That question is not one of today\'s.');
      if (choice < 0 || choice > 3) return no('invalid_request', 'Pick one of the four answers.');
      if (row.today.answered[String(id)]) return { ok: true, paid: 0 };
      const opts = optionsOf(id, row.seed);
      if (!opts) return no('not_today', 'That question is not one of today\'s.');
      const correct = opts.answer === choice;
      row.today.answered[String(id)] = { choice, correct };
      row.answered += 1; if (correct) row.correct += 1;
      if (!row.seen.includes(id)) row.seen.push(id);
      if (row.seen.length > BANK.length) row.seen = row.seen.slice(-BANK.length);
      if (!row.days.includes(day)) row.days.push(day);
      row.streak = row.lastDay === day ? row.streak : row.lastDay === day - 1 ? row.streak + 1 : 1; row.lastDay = day;
      const paid = correct ? pay(c, me, g.life, g.cityId, PAY_PER_CORRECT, now) : 0;
      row.earned += paid;
      return { ok: true, paid };
    },

    /** Inside ctx.once: opens the mock exam, once a season, after a few days of practice. */
    mockStart(db: Db, session: SessionRecord, body: Record<string, unknown>, now: number): Small | Refused {
      const g = gate(session, body);
      if (!g.ok) return g;
      const c = minigamesOf(ctx, db), row = rowOf(c, session.publicId);
      if (!row) return no('not_joined', 'Join the season first.');
      const mock = mockView(row, now);
      if (mock.state === 'running' || mock.state === 'done') return { ok: true };
      if (mock.state === 'locked') return no('mock_locked', mock.need ?? 'The mock is not open yet.');
      const ids = SUBJECTS.flatMap((subject) => draw(`${row.seed}|mock`, 0, subject, MOCK_MIX[subject], new Set()));
      row.mock = { startedAt: now, ids, result: null };
      return { ok: true };
    },

    /** Inside ctx.once: the mock is marked on the server from the answers sent. After the time and the grace, the unanswered count as wrong. */
    mockSubmit(db: Db, session: SessionRecord, body: Record<string, unknown>, now: number): Small | Refused {
      const g = gate(session, body);
      if (!g.ok) return g;
      const c = minigamesOf(ctx, db), me = session.publicId, row = rowOf(c, me);
      if (!row) return no('not_joined', 'Join the season first.');
      const mock = row.mock;
      if (!mock) return no('mock_not_started', 'Start the mock first.');
      if (mock.result) return { ok: true, paid: 0 };
      const sent = Array.isArray(body.answers) ? body.answers.slice(0, mock.ids.length) : [];
      const late = now > mock.startedAt + MOCK_MINUTES * 60_000 + MOCK_GRACE_MS;
      const bySubject: Record<string, { correct: number; total: number }> = {};
      let correct = 0;
      mock.ids.forEach((id, at) => {
        const subject = BANK[id]![0], part = bySubject[subject] ??= { correct: 0, total: 0 };
        part.total += 1;
        const choice = whole(sent[at], 3), given = typeof sent[at] === 'number' && Number.isSafeInteger(sent[at]) && (sent[at] as number) >= 0 && (sent[at] as number) <= 3;
        if (!late && given && optionsOf(id, row.seed)?.answer === choice) { part.correct += 1; correct += 1; }
      });
      const total = mock.ids.length, score = Math.round((correct / total) * 400);
      const paid = pay(c, me, g.life, g.cityId, correct * 2 >= total ? MOCK_PAY : MOCK_PAY_LOW, now);
      row.earned += paid;
      mock.result = { correct, total, score, bySubject, paid };
      return { ok: true, paid };
    },
    answerResult(db: Db, session: SessionRecord, id: unknown): JambAnswerResult | null {
      const row = rowOf(peekMinigames(db), session.publicId);
      return row && typeof id === 'number' ? resultOf(row, id) : null;
    },
  };
}
export type JambService = ReturnType<typeof jambService>;
