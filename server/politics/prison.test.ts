// OWNER: politics — the pure rules of jail you can play (docs/JAIL.md): caps, service, parole, visiting hours, old records.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lagosTime } from '../../src/game/clock.ts';
import type { JailRecord } from '../../src/types/politics.ts';
import { jailOf } from './justice.ts';
import { PRISON, capLeft, doJob, doService, doVisit, jobBlock, paroleAt, paroleHearing, prisonView, serviceBlock, visitBlock, visitingOpen } from './prison.ts';

const MIN = 60000;
/** A Lagos midnight plus `hour` hours, so the clock is easy to read. */
const lagosAt = (hour: number, day = 20000): number => { let ms = day * 86400000 - 3600000 + hour * 3600000; while (lagosTime(ms).hour !== hour) ms += 3600000; return ms; };
const NOW = lagosAt(11);
const sentence = (minutes: number, at = NOW, extra: Partial<JailRecord> = {}): JailRecord => ({ until: at + minutes * MIN, at, minutes, offence: 'o1', by: { id: 'chi', name: 'Chi' }, tier: 'city', scope: 'city:lagos', ...extra });

test('a job takes its minutes off, waits before a repeat, and is capped per Lagos day', () => {
  const record = sentence(100);
  assert.equal(jobBlock(record, NOW, 'kitchen'), null);
  assert.equal(doJob(record, NOW, 'kitchen'), 3);
  assert.equal(record.until, NOW + 97 * MIN);
  assert.equal(jobBlock(record, NOW + MIN, 'kitchen')?.code, 'job_wait');
  assert.equal(jobBlock(record, NOW, 'sweep')?.code, 'no_such_job');
  let t = NOW + 5 * MIN;
  const ids = ['laundry', 'library', 'kitchen'];
  for (let i = 0; i < 30 && !jobBlock(record, t, ids[i % 3] ?? 'kitchen'); i++) { doJob(record, t, ids[i % 3] ?? 'kitchen'); t += 5 * MIN; }
  assert.equal(PRISON.dailyCapMin - capLeft(record, t), record.cutMin, 'the cap counts what was cut');
  assert.ok((record.cutMin ?? 0) <= PRISON.dailyCapMin);
  const rest = 100 * MIN - (record.cutMin ?? 0) * MIN;
  assert.equal(record.until - NOW, rest);
  assert.equal(jobBlock(record, t + 10 * MIN, 'library')?.code, 'job_cap', 'capped today');
  record.until = t + 26 * 60 * MIN; // a long sentence, still running tomorrow
  assert.equal(jobBlock(record, t + 24 * 60 * MIN, 'library'), null, 'a new Lagos day starts again');
  const tomorrow = t + 24 * 60 * MIN;
  assert.equal(doJob(record, tomorrow, 'library'), 4);
  assert.equal(record.cutMin, 4, 'yesterday\'s minutes are not carried into the new day');
  assert.equal(capLeft(record, tomorrow), PRISON.dailyCapMin - 4);
});

test('a job never takes the sentence below the last minute', () => {
  const record = sentence(3);
  assert.equal(jobBlock(record, NOW, 'kitchen')?.code, undefined, 'there is still room for some');
  const taken = doJob(record, NOW, 'kitchen');
  assert.ok(taken <= 2);
  assert.ok(record.until - NOW >= PRISON.keepMs);
  assert.equal(jobBlock(sentence(1), NOW, 'laundry')?.code, 'nearly_done');
});

test('community service is for short sentences, once, and halves what is left without using the daily cap', () => {
  assert.equal(serviceBlock(sentence(PRISON.serviceMaxMin + 1), NOW)?.code, 'service_long');
  const record = sentence(PRISON.serviceMaxMin);
  assert.equal(serviceBlock(record, NOW), null);
  const taken = doService(record, NOW);
  assert.ok(taken >= 8 && taken <= 10);
  assert.equal(record.service, true);
  assert.equal(record.cutMin, undefined, 'the cap is for jobs and visits');
  assert.equal(serviceBlock(record, NOW)?.code, 'service_done');
});

test('parole opens at half the sentence, is granted for a clean record and refused after trouble, once per sentence', () => {
  const record = sentence(40);
  assert.equal(paroleAt(record), NOW + 20 * MIN);
  assert.deepEqual(paroleHearing(record, NOW + 19 * MIN, 0), { state: 'too_early', inMs: 1 * MIN });
  assert.deepEqual(paroleHearing(record, NOW + 20 * MIN, 0), { state: 'granted' });
  assert.equal(paroleHearing(record, NOW + 20 * MIN, 1).state, 'denied');
  assert.equal(paroleHearing(record, NOW + 5 * MIN, 1).state, 'too_early', 'no hearing is used up by asking early');
  record.parole = 'denied';
  assert.equal(paroleHearing(record, NOW + 39 * MIN, 0).state, 'denied');
  assert.equal(prisonView(record, NOW + 39 * MIN, 0).parole.state, 'denied');
});

test('visitors are let in only inside visiting hours, and not again at once', () => {
  assert.equal(visitingOpen(lagosAt(9)), false);
  assert.equal(visitingOpen(lagosAt(PRISON.visitFromHour)), true);
  assert.equal(visitingOpen(lagosAt(PRISON.visitToHour - 1)), true);
  assert.equal(visitingOpen(lagosAt(PRISON.visitToHour)), false);
  assert.equal(visitingOpen(lagosAt(23)), false);
  const record = sentence(100, lagosAt(10));
  assert.equal(visitBlock(record, lagosAt(PRISON.visitToHour), 'bola')?.code, 'visiting_closed');
  const at = lagosAt(11);
  assert.equal(visitBlock(record, at, 'bola'), null);
  assert.equal(doVisit(record, at, 'bola'), PRISON.visitCutMin);
  assert.equal(visitBlock(record, at + MIN, 'bola')?.code, 'visit_wait');
  assert.equal(visitBlock(record, at + MIN, 'chi'), null, 'another friend may come');
  assert.equal(visitBlock(record, at + PRISON.visitWaitMs, 'bola'), null);
});

test('a sentence saved before this feature (none of the new fields) loads, shows, and ends by time as before', () => {
  const old: JailRecord = { until: NOW + 30 * MIN, at: NOW, minutes: 30, offence: 'o1', by: { id: 'chi', name: 'Chi' }, tier: 'city' };
  const justice = { offences: {}, jail: { ada: old }, police: {}, judges: {}, lawyers: {}, cases: {}, fights: {}, pairs: {} };
  assert.equal(jailOf(justice, 'ada', NOW + 29 * MIN)?.minutes, 30);
  assert.equal(jailOf(justice, 'ada', NOW + 30 * MIN + 1), null, 'ends by time');
  const view = prisonView(old, NOW + MIN, 0);
  assert.equal(view.capLeftMin, PRISON.dailyCapMin);
  assert.deepEqual(view.jobs.map((job) => job.waitMs), [0, 0, 0]);
  assert.equal(view.parole.state, 'wait');
  assert.equal(view.service, null, 'a 30-minute sentence is too long for service');
  assert.equal(serviceBlock({ ...old, minutes: 10 }, NOW)?.code, undefined);
});
