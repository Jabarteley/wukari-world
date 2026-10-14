// OWNER: politics — jail you can play (docs/JAIL.md). Pure over a JailRecord and a time, like justice.ts: prison jobs that take
// minutes off a sentence (with a cap a day), community service for short sentences, parole at half, and visiting hours.
// The sentence itself, bail and appeals are untouched (justice.ts). Everything added to a stored JailRecord is optional, so a
// sentence made before this existed loads, shows the same time and ends the same way. Nothing here reads a clock.
import { lagosTime } from '../../src/game/clock.ts';
import type { JailRecord, PrisonView } from '../../src/types/politics.ts';

type Block = { code: string; reason: string };
const no = (code: string, reason: string): Block => ({ code, reason });
const MIN = 60000;

export const PRISON = Object.freeze({
  /** Short tasks, each takes minutes off. Waits keep one task from being repeated at once. */
  jobs: Object.freeze({
    kitchen: { label: 'Help in the kitchen', cutMin: 3, waitMs: 2 * MIN },
    laundry: { label: 'Do the laundry', cutMin: 2, waitMs: 90000 },
    library: { label: 'Sort the library shelves', cutMin: 4, waitMs: 3 * MIN },
  } as Readonly<Record<string, { label: string; cutMin: number; waitMs: number }>>),
  /** Most that jobs and visits may take off one sentence in one Lagos day. */
  dailyCapMin: 20,
  /** A job or visit never leaves less than this: the end of a sentence comes by time, bail, a court or parole. */
  keepMs: MIN,
  /** Community service: open to a sentence of at most this many minutes, once, and it takes this share of what is left. */
  serviceMaxMin: 20,
  serviceShare: 0.5,
  /** Parole hearing once this share of the sentence has been served. */
  paroleShare: 0.5,
  /** Visiting hours, Lagos time: from the first hour up to (not including) the second. */
  visitFromHour: 10, visitToHour: 16,
  /** A friend may visit the same prisoner this often, and the visit takes this much off. */
  visitWaitMs: 30 * MIN, visitCutMin: 1,
});

/** Minutes already cut today. A new Lagos day starts again at 0. */
export const cutToday = (record: JailRecord, now: number): number => (record.cutDay === lagosTime(now).day ? record.cutMin ?? 0 : 0);
export const capLeft = (record: JailRecord, now: number): number => Math.max(0, PRISON.dailyCapMin - cutToday(record, now));

/** Take up to `wanted` minutes off, within the daily cap and the minimum that stays. Returns the minutes taken (0 if none). */
function cut(record: JailRecord, now: number, wanted: number): number {
  const room = Math.floor((record.until - now - PRISON.keepMs) / MIN);
  const taken = Math.max(0, Math.min(wanted, capLeft(record, now), room));
  if (!taken) return 0;
  const before = cutToday(record, now); // read before the day is written: on a new day yesterday's minutes do not count
  record.until -= taken * MIN;
  record.cutDay = lagosTime(now).day;
  record.cutMin = before + taken;
  return taken;
}

/** Why `job` cannot be done now, or null. */
export function jobBlock(record: JailRecord, now: number, job: string): Block | null {
  const found = Object.hasOwn(PRISON.jobs, job) ? PRISON.jobs[job] : undefined;
  if (!found) return no('no_such_job', 'There is no such job here.');
  const last = record.jobs?.[job];
  if (last !== undefined && now - last < found.waitMs) return no('job_wait', `You have just done that. Try something else, or wait ${Math.ceil((found.waitMs - (now - last)) / 1000)} seconds.`);
  if (capLeft(record, now) <= 0) return no('job_cap', `You have earned the most you can today (${PRISON.dailyCapMin} minutes). Jobs open again tomorrow.`);
  if (record.until - now <= PRISON.keepMs + MIN) return no('nearly_done', 'Your sentence is nearly over. There is nothing left to work off.');
  return null;
}
/** Do the job: minutes taken off (at least 1 after jobBlock said yes). */
export function doJob(record: JailRecord, now: number, job: string): number {
  const found = PRISON.jobs[job];
  if (!found) return 0;
  (record.jobs ||= {})[job] = now;
  return cut(record, now, found.cutMin);
}

/** Community service: open to short sentences, once. */
export function serviceCut(record: JailRecord, now: number): number {
  return Math.floor(Math.max(0, record.until - now - PRISON.keepMs) * PRISON.serviceShare / MIN);
}
export function serviceBlock(record: JailRecord, now: number): Block | null {
  if (record.minutes > PRISON.serviceMaxMin) return no('service_long', `Community service is for sentences of ${PRISON.serviceMaxMin} minutes or less. Prison jobs can still shorten this one.`);
  if (record.service) return no('service_done', 'You have already done community service for this sentence.');
  if (serviceCut(record, now) < 1) return no('nearly_done', 'Your sentence is nearly over. There is nothing left to work off.');
  return null;
}
/** Does not count against the daily cap: the short sentence is what bounds it. */
export function doService(record: JailRecord, now: number): number {
  const taken = serviceCut(record, now);
  record.until -= taken * MIN;
  record.service = true;
  return taken;
}

// ---- parole ------------------------------------------------------------------------------------------------------------
/** When parole opens: half of the sentence served, counted from the arrest. */
export const paroleAt = (record: JailRecord): number => record.at + Math.ceil(record.minutes * MIN * PRISON.paroleShare);
export type ParoleOutcome = { state: 'too_early'; inMs: number } | { state: 'granted' } | { state: 'denied'; reason: string };
/** The hearing. `incidents` counts what the prisoner did wrong since the arrest: offences recorded against them and reports made about them while inside. */
export function paroleHearing(record: JailRecord, now: number, incidents: number): ParoleOutcome {
  if (record.parole === 'denied') return { state: 'denied', reason: 'Your parole hearing was held for this sentence. Serve the rest or ask for bail or an appeal.' };
  if (now < paroleAt(record)) return { state: 'too_early', inMs: paroleAt(record) - now };
  if (incidents > 0) return { state: 'denied', reason: 'The board saw trouble on your record while inside, so parole is refused. Your time goes on as before.' };
  return { state: 'granted' };
}

// ---- visitors ----------------------------------------------------------------------------------------------------------
export const visitingOpen = (now: number): boolean => { const hour = lagosTime(now).hour; return hour >= PRISON.visitFromHour && hour < PRISON.visitToHour; };
/** Why a friend may not visit now, or null. The route has checked friendship, blocks and that the visitor is free. */
export function visitBlock(record: JailRecord, now: number, visitorId: string): Block | null {
  if (!visitingOpen(now)) return no('visiting_closed', `Visiting hours are ${PRISON.visitFromHour}:00 to ${PRISON.visitToHour}:00, Lagos time.`);
  const last = record.visits?.[visitorId];
  if (last !== undefined && now - last < PRISON.visitWaitMs) return no('visit_wait', 'You have just visited. Come again a little later.');
  return null;
}
export function doVisit(record: JailRecord, now: number, visitorId: string): number {
  const visits = (record.visits ||= {});
  visits[visitorId] = now;
  const keep = Object.entries(visits).sort((a, b) => b[1] - a[1]).slice(0, 20);
  record.visits = Object.fromEntries(keep);
  return cut(record, now, PRISON.visitCutMin);
}

/** What the jailed player is shown. */
export function prisonView(record: JailRecord, now: number, incidents: number): PrisonView {
  const hearing = paroleHearing(record, now, incidents);
  return {
    jobs: Object.entries(PRISON.jobs).map(([id, job]) => ({ id, label: job.label, cutMin: job.cutMin, waitMs: Math.max(0, job.waitMs - (record.jobs?.[id] === undefined ? job.waitMs : now - record.jobs[id])) })),
    capLeftMin: capLeft(record, now),
    service: serviceBlock(record, now) ? null : { cutMin: serviceCut(record, now) },
    parole: hearing.state === 'too_early' ? { state: 'wait', inMs: hearing.inMs } : record.parole === 'denied' || hearing.state === 'denied' ? { state: 'denied', inMs: 0 } : { state: 'ready', inMs: 0 },
    visiting: { fromHour: PRISON.visitFromHour, toHour: PRISON.visitToHour, open: visitingOpen(now) },
  };
}
