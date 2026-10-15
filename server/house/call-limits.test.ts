// The minutes of calls with agents and the break reminder: per person and in total, charged by the time between a call's requests, the idle end of a call,
// the break reminder once per period of a session, and what is stored (numbers only).
import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY_MS, GAP_MS, IDLE_MS, SESSION_GAP_MS, createCallLedger, personKey, type Limits, type Stored } from './call-limits.ts';

function world(limits: Partial<Limits> = {}) {
  const clock = { now: Date.UTC(2026, 9, 15, 8, 0, 0) }, saves: Stored[] = [];
  let n = 0;
  const set: Limits = { playerSeconds: 600, totalSeconds: 3600, breakSeconds: 1200, ...limits };
  const ledger = createCallLedger({ now: () => clock.now, limits: () => set, load: async () => undefined, save: async (stored) => { saves.push(structuredClone(stored)); }, newId: () => `call-id-${++n}-xxxxxxxx` });
  const wait = (seconds: number): void => { clock.now += seconds * 1000; };
  return { ledger, clock, wait, saves, set };
}
const AGENT = 'house.lagos.tolani';

test('time is charged between the requests of a call, at most a minute and a half at a time, and counted per person and in total', async () => {
  const w = world();
  const a = await w.ledger.start('ada', AGENT);
  assert.ok(a.ok);
  const id = a.ok ? a.call : '';
  w.wait(30); assert.deepEqual([w.ledger.touch(id)?.leftSeconds, w.ledger.secondsUsed('ada')], [570, 30]);
  w.wait(60); w.ledger.touch(id);
  assert.equal(w.ledger.secondsUsed('ada'), 90);
  // A phone put down without hanging up is charged one gap, not the time away.
  w.wait(120); w.ledger.touch(id);
  assert.equal(w.ledger.secondsUsed('ada'), 90 + GAP_MS / 1000);
  w.wait(10); w.ledger.end(id);
  assert.equal(w.ledger.secondsUsed('ada'), 190);
  assert.equal(w.ledger.usage().total, 190);
  assert.equal(w.ledger.find('ada', id), null, 'an ended call is gone');
  assert.equal(w.ledger.touch(id), null);
});

test('over the person limit the call is over and the next one is refused with the reason; another person is unaffected; the day ends the count', async () => {
  const w = world({ playerSeconds: 100 });
  const a = await w.ledger.start('ada', AGENT);
  const id = a.ok ? a.call : '';
  w.wait(60); assert.equal(w.ledger.touch(id)?.over, null);
  w.wait(60);
  const over = w.ledger.touch(id);
  assert.equal(over?.over, 'player');
  assert.equal(over?.leftSeconds, 0);
  assert.equal(w.ledger.touch(id), null, 'the call is closed once it went over');
  assert.deepEqual(await w.ledger.start('ada', AGENT), { ok: false, over: 'player' });
  assert.ok((await w.ledger.start('ben', AGENT)).ok);
  w.wait(DAY_MS / 1000);
  assert.ok((await w.ledger.start('ada', AGENT)).ok, 'a new UTC day');
});

test('the total for everyone is its own limit', async () => {
  const w = world({ playerSeconds: 1000, totalSeconds: 100 });
  const a = await w.ledger.start('ada', AGENT), b = await w.ledger.start('ben', AGENT);
  w.wait(50); w.ledger.touch(a.ok ? a.call : ''); w.ledger.touch(b.ok ? b.call : '');
  assert.equal(w.ledger.usage().total, 100);
  assert.deepEqual(await w.ledger.start('cy', AGENT), { ok: false, over: 'total' });
  assert.deepEqual(w.ledger.usage(), { day: String(Math.floor(w.clock.now / DAY_MS)), total: 100, players: 2, open: 1 });
});

test('a call with no request for three minutes is over; a person has one call at a time; a call belongs to its person', async () => {
  const w = world();
  const a = await w.ledger.start('ada', AGENT);
  const id = a.ok ? a.call : '';
  assert.equal(w.ledger.find('ben', id), null, 'not another person’s');
  const b = await w.ledger.start('ada', AGENT);
  assert.equal(w.ledger.find('ada', id), null, 'a new call ends the old one');
  w.wait(IDLE_MS / 1000 + 1);
  assert.equal(w.ledger.find('ada', b.ok ? b.call : ''), null);
  assert.equal(w.ledger.touch(b.ok ? b.call : ''), null);
});

test('the break reminder comes once per period of a session, a long gap starts a new session, and zero turns it off', async () => {
  const w = world({ playerSeconds: 100000, totalSeconds: 100000, breakSeconds: 600 });
  const a = await w.ledger.start('ada', AGENT);
  let id = a.ok ? a.call : '';
  const due: number[] = [];
  for (let minute = 1; minute <= 25; minute++) { w.wait(60); const t = w.ledger.touch(id); if (t?.breakDue) due.push(minute); }
  assert.deepEqual(due, [10, 20], 'every ten minutes of the session, not before and not on every request');
  // Hanging up and calling again soon is the same session.
  w.ledger.end(id); w.wait(120);
  id = (await w.ledger.start('ada', AGENT) as { call: string }).call;
  w.wait(60); assert.equal(w.ledger.touch(id)?.breakDue, false);
  assert.ok((w.ledger.touch(id)?.sessionSeconds ?? 0) > 25 * 60, 'the session carries on');
  // A gap over the session gap makes a fresh one.
  w.ledger.end(id); w.wait(SESSION_GAP_MS / 1000 + 60);
  id = (await w.ledger.start('ada', AGENT) as { call: string }).call;
  w.wait(30);
  assert.ok((w.ledger.touch(id)?.sessionSeconds ?? 999) < 60);
  const off = world({ breakSeconds: 0, playerSeconds: 100000, totalSeconds: 100000 });
  const o = await off.ledger.start('ada', AGENT); const oid = o.ok ? o.call : '';
  for (let i = 0; i < 30; i++) { off.wait(60); assert.equal(off.ledger.touch(oid)?.breakDue, false); }
});

test('what is stored is numbers under a one-way key: no id of a person, no agent, no words', async () => {
  const w = world();
  const a = await w.ledger.start('player-public-id-123', AGENT);
  w.wait(30); w.ledger.touch(a.ok ? a.call : '');
  await new Promise((resolve) => setTimeout(resolve, 5));
  const saved = JSON.stringify(w.saves.at(-1));
  assert.ok(saved.includes(personKey('player-public-id-123')));
  assert.ok(!saved.includes('player-public-id-123') && !saved.includes('tolani'));
  // Loaded again after a restart, the day's use is still there.
  const again = createCallLedger({ now: () => w.clock.now, limits: () => w.set, load: async () => w.saves.at(-1), save: async () => {}, newId: () => 'x-xxxxxxxxx' });
  await again.ready();
  assert.equal(again.secondsUsed('player-public-id-123'), 30);
});
