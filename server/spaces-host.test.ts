// The AI host of a home (server/spaces/host.ts): chosen with a persona that passes the filters, standing in the home with the AI mark while
// people are there, greeting each guest once a visit by name and as a returning guest after, MCing a party every few minutes, written lines
// when no model is available, and its guest book erased with the people in it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { agentWords } from './moderation/agent-words.ts';
import { hostMemberId, hostService, HOST, HOSTS, writtenLine } from './spaces/host.ts';
import { eraseSpaces, spacesOf } from './spaces/store.ts';
import type { AgentRoom, Db, RouteContext, SessionRecord } from './types.ts';

const OWNER = '11111111-1111-4111-8111-111111111111', GUEST = '22222222-2222-4222-8222-222222222222';
const ROOM = `lagos:home:${OWNER}`;

function rig(settings: Record<string, boolean> = { spacesHosts: true }) {
  const clock = { t: 1_800_000_000_000 };
  const db = { social: { players: { [OWNER]: { name: 'Ada Lovelace' }, [GUEST]: { name: 'Tunde Bakare' } }, houses: {} as Record<string, unknown>, convs: {} } } as unknown as Db;
  const present = new Map<string, { id: string; name: string; mark: { agent?: true }; room: string }>();
  const said: { id: string; room: string; body: string }[] = [];
  const agentRoom = {
    present(member: { id: string; name: string; mark: { agent?: true }; room: string }) { present.set(member.id, member); },
    absent(id: string) { present.delete(id); },
    async say(from: { id: string }, room: string, body: string) {
      const gate = agentWords(body, { toMinor: true });
      if (!gate.ok) return { ok: false as const, code: gate.code, reason: gate.reason };
      said.push({ id: from.id, room, body });
      return { ok: true as const, seq: said.length };
    },
    lines: () => [], members: () => [], count: () => present.size, rooms: () => [],
  } as unknown as AgentRoom;
  const listeners: Record<string, ((data: never) => void)[]> = {};
  const windows = new Map<string, number[]>();
  const ctx = {
    now: () => clock.t,
    allow: (key: string, count = 120, windowMs = 60000) => { const list = (windows.get(key) ?? []).filter((time) => clock.t - time < windowMs); windows.set(key, list); if (list.length >= count) return false; list.push(clock.t); return true; },
    fail: (status: number, code: string) => Object.assign(new Error(code), { status, code }),
    checks: { agentRoom, setting: (key: string) => settings[key] },
    on: (event: string, listener: (data: never) => void) => { (listeners[event] ??= []).push(listener); },
    emit: (event: string, data: unknown) => { for (const listener of listeners[event] ?? []) listener(data as never); },
    store: { read: async <T>(fn: (d: Db) => T): Promise<T> => fn(db), transact: async <T>(fn: (d: Db) => T): Promise<T> => fn(db) },
    collection: () => ({}),
  } as unknown as RouteContext & { emit(event: string, data: unknown): void };
  const host = hostService(ctx);
  const session = { publicId: OWNER } as SessionRecord;
  const settle = () => new Promise((resolve) => setTimeout(resolve, 5));
  return { clock, db, present, said, ctx, host, session, settle };
}

test('choosing a host: a persona with contact details or flirting is refused, a good one is kept, and none removes it', () => {
  const { host, db, session } = rig();
  assert.equal(host.write(db, session, { kind: 'dj', persona: 'call me on 08031234567', on: true }).ok, false);
  assert.equal(host.write(db, session, { kind: 'dj', persona: 'sexy and wants to date the guests', on: true }).ok, false);
  assert.throws(() => host.write(db, session, { kind: 'pirate', on: true }), /invalid_kind/);
  const saved = host.write(db, session, { kind: 'dj', persona: 'Loud, funny, loves Afrobeats', on: true });
  assert.equal(saved.ok, true);
  assert.deepEqual(host.read(db, session).host.kind, 'dj');
  assert.equal(host.write(db, session, { kind: null, on: false }).ok, true);
  assert.equal(host.read(db, session).host.kind, null);
});

test('a guest comes in: the host stands there with the AI mark and greets them by name once; the next visit is a welcome back', async () => {
  const { host, db, session, ctx, present, said, settle } = rig();
  host.write(db, session, { kind: 'butler', persona: '', on: true });
  ctx.emit('room-changed', { room: ROOM, members: [OWNER], cause: OWNER });
  await settle();
  assert.equal(said.length, 0, 'nobody to greet: the owner alone');
  ctx.emit('room-changed', { room: ROOM, members: [OWNER, GUEST], cause: GUEST });
  await settle();
  assert.equal(said.length, 1);
  assert.match(said[0]!.body, /Tunde/);
  assert.equal(said[0]!.id, hostMemberId(OWNER));
  assert.deepEqual(present.get(hostMemberId(OWNER))?.mark, { agent: true }, 'the host carries the AI mark');
  ctx.emit('room-changed', { room: ROOM, members: [OWNER, GUEST, hostMemberId(OWNER)], cause: hostMemberId(OWNER) });
  await settle();
  assert.equal(said.length, 1, 'greeted once a visit, and the host itself is not a guest');
  assert.equal(spacesOf(db).hosts[OWNER]?.guests?.[GUEST]?.n, 1);
  ctx.emit('room-changed', { room: ROOM, members: [OWNER], cause: GUEST });
  ctx.emit('room-changed', { room: ROOM, members: [OWNER, GUEST], cause: GUEST });
  await settle();
  assert.equal(said.length, 2);
  assert.match(said[1]!.body, /Tunde/);
  assert.ok(HOSTS.butler.back.some((line) => said[1]!.body === line.replace('{who}', 'Tunde').replace('{n}', '2')), said[1]!.body);
  ctx.emit('room-changed', { room: ROOM, members: [], cause: OWNER });
  await settle();
  assert.equal(present.has(hostMemberId(OWNER)), false, 'an empty home has no host standing in it');
});

test('a party: the host MCs every few minutes, not more often', async () => {
  const { host, db, session, ctx, said, clock, settle } = rig();
  host.write(db, session, { kind: 'dj', persona: '', on: true });
  (db.social!.houses as Record<string, unknown>)[OWNER] = { knocks: {}, guests: {}, party: { title: 'Owambe Friday', colour: 'gold', startedAt: clock.t, until: clock.t + 7200000, sprays: 0 } };
  ctx.emit('room-changed', { room: ROOM, members: [OWNER, GUEST], cause: GUEST });
  await settle();
  const greeted = said.length;
  await host.beat();
  assert.equal(said.length, greeted + 1);
  assert.match(said.at(-1)!.body, /Owambe Friday|floor|Spinz|Spray|dance/i);
  clock.t += 60000; await host.beat();
  assert.equal(said.length, greeted + 1, 'not again within the minutes between lines');
  clock.t += HOST.mcMinutes * 60000; await host.beat();
  assert.equal(said.length, greeted + 2);
});

test('switched off, a host says nothing; every written line passes the AI words rule', async () => {
  const { host, db, session, ctx, said, settle } = rig({ spacesHosts: false });
  assert.equal(host.write(db, session, { kind: 'dj', on: true }).ok, false);
  ctx.emit('room-changed', { room: ROOM, members: [OWNER, GUEST], cause: GUEST });
  await settle();
  assert.equal(said.length, 0);
  for (const kind of ['butler', 'dj', 'quizmaster', 'gateman'] as const) for (const moment of ['welcome', 'back', 'mc'] as const) for (let seed = 0; seed < 4; seed++) {
    const line = writtenLine(kind, moment, { who: 'Tunde', host: 'Ada', title: 'Owambe', n: 3 }, seed);
    assert.equal(agentWords(line, { toMinor: true }).ok, true, line);
    assert.doesNotMatch(line, /\{\w+\}/, line);
  }
});

test('erasure: a host goes with its owner, and a guest’s visits go from every host’s book', () => {
  const { db } = rig();
  spacesOf(db).hosts[OWNER] = { kind: 'dj', persona: '', on: true, at: 1, guests: { [GUEST]: { n: 2, at: 1 } } };
  assert.equal(eraseSpaces(db, [GUEST]), 1);
  assert.deepEqual(spacesOf(db).hosts[OWNER]?.guests, {});
  assert.equal(eraseSpaces(db, [OWNER]), 1);
  assert.equal(spacesOf(db).hosts[OWNER], undefined);
});

test('a model line cut short is not said: the host says its written line instead', async () => {
  const { writtenLine: line } = await import('./spaces/host.ts');
  assert.ok(line('dj', 'mc', { host: 'Ada', title: 'Owambe' }, 1).split(' ').length >= 3);
});
