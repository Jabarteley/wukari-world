// OWNER: social — clans, ladders, city leagues and clan wars against a real server (src/clans/, server/clans/, docs/CLANS.md):
// create, join by code, leave, kick (and the day's ban), roles (agents never lead), the clan room; a venue room once the clan is big
// enough; arena results feeding the ladder (+30 / -12, pairs a day); boards in the right order and under 4 KB gzipped; a city league
// week settling with a gist line; a clan war settling on the top 80% with a prize claimed once.
import { loadCityContent as preloadCityContent } from '../src/game/cities/registry.ts';
await preloadCityContent('lagos');
import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import type { TestContext } from 'node:test';
import type WebSocket from 'ws';
import { fixture } from './test-fixture.ts';
import type { Device } from './test-fixture.ts';
import { TUNING } from './growth/arena.ts';
import { CLAN } from '../src/clans/clan.ts';
import { LADDER } from '../src/clans/ladder.ts';
import type { ArenaStateFrame } from '../src/types/arena.ts';

Object.assign(TUNING, { speed: 10, sweepMs: 20, awayForfeitMs: 150, awaySeatMs: 150, emptyMs: 150 });
type Json = Record<string, any>;

async function harness(t: TestContext) {
  const f = await fixture(t, { env: { NEW_SESSIONS_PER_ADDRESS: '1000' } });
  const call = async (who: Device, path: string, body?: unknown): Promise<Json> => (await f.request(path, body, who.cookie)).json() as Promise<Json>;
  const person = async (name: string): Promise<Device> => { const who = await f.device(name); await f.request('/api/life?city=lagos', null, who.cookie); return who; };
  async function arenaPeer(who: Device) {
    const sock = await f.socket(who);
    const p = { who, ws: sock.ws as WebSocket, state: null as ArenaStateFrame | null };
    sock.ws.on('message', (data) => { const frame = JSON.parse(data.toString()) as { type: string }; if (frame.type === 'arena-state') p.state = frame as unknown as ArenaStateFrame; });
    return p;
  }
  async function until(done: () => boolean | Promise<boolean>, what: string, ms = 8000): Promise<void> {
    const end = Date.now() + ms;
    while (!(await done())) { if (Date.now() > end) throw new Error('Timed out waiting for ' + what); await new Promise((r) => setTimeout(r, 10)); }
  }
  /** A real arena match that `winner` wins because `loser` walks away after both pressed something. */
  async function match(winner: Device, loser: Device, game = 'fight') {
    const [a, b] = [await arenaPeer(winner), await arenaPeer(loser)];
    a.ws.send(JSON.stringify({ type: 'arena-create', game, ...(game === 'fight' ? { options: { rounds: 1, seconds: 30 } } : {}) }));
    await until(() => Boolean(a.state), 'room');
    const room = a.state!.room;
    b.ws.send(JSON.stringify({ type: 'arena-join', room }));
    await until(() => a.state?.status === 'playing' && b.state?.status === 'playing', 'start');
    a.ws.send(JSON.stringify({ type: 'arena-input', room, i: 1 })); b.ws.send(JSON.stringify({ type: 'arena-input', room, i: 1 }));
    await new Promise((r) => setTimeout(r, 60));
    b.ws.send(JSON.stringify({ type: 'arena-leave', room }));
    await until(() => a.state?.status === 'over', 'result');
    a.ws.close(); b.ws.close();
    await new Promise((r) => setTimeout(r, 40));
  }
  return { f, call, person, match, until };
}

test('a clan is made, joined by its code, and run by its leader; agents and the day ban follow the rules', async (t) => {
  const h = await harness(t);
  const [ada, bola, cara] = [await h.person('Ada'), await h.person('Bola'), await h.person('Cara')];
  assert.equal((await h.call(ada, '/api/clans/me')).clan, null);
  const made = await h.call(ada, '/api/clans/create', { name: 'Eko Lions', colour: 'gold', clientId: h.f.id() });
  assert.equal(made.ok, true, JSON.stringify(made));
  const code = made.clan.code as string;
  assert.match(code, /^[A-HJKMNP-Z]{6}$/);
  assert.equal(made.clan.role, 'leader'); assert.equal(made.clan.size, 1);
  assert.equal((await h.call(bola, '/api/clans/create', { name: 'eko  LIONS', colour: 'gold', clientId: h.f.id() })).code, 'name_taken');
  const preview = await (await h.f.request(`/api/clans/preview?code=${code}`)).json() as Json;
  assert.equal(preview.clan.name, 'Eko Lions'); assert.equal(preview.clan.code, undefined, 'a visitor does not see the code');
  assert.equal((await h.call(bola, '/api/clans/join', { code: code.toLowerCase() })).ok, true);
  assert.equal((await h.call(cara, '/api/clans/join', { code })).ok, true);
  const mine = await h.call(ada, '/api/clans/me');
  assert.equal(mine.clan.size, 3); assert.equal(mine.clan.members.length, 3);
  // Roles: a deputy, then the leader hands over; a member cannot kick.
  assert.equal((await h.call(ada, '/api/clans/role', { id: bola.id, role: 'deputy' })).clan.deputies, 1);
  assert.equal((await h.call(cara, '/api/clans/kick', { id: bola.id })).code, 'leader_only');
  // Kick: out, and not back for a day.
  assert.equal((await h.call(ada, '/api/clans/kick', { id: cara.id })).ok, true);
  assert.equal((await h.call(cara, '/api/clans/join', { code })).code, 'recently_removed');
  h.f.advance(CLAN.kickBanMs + 1000);
  assert.equal((await h.call(cara, '/api/clans/join', { code })).ok, true);
  // The leader leaves: the deputy leads.
  assert.equal((await h.call(ada, '/api/clans/leave', {})).ok, true);
  assert.equal((await h.call(bola, '/api/clans/me')).clan.role, 'leader');
  // A new code: the old one stops working.
  const fresh = await h.call(bola, '/api/clans/code', {});
  assert.notEqual(fresh.clan.code, code);
  assert.equal((await h.call(ada, '/api/clans/join', { code })).code, 'unknown_code');
});

test('a clan of ten holds a room in a venue: members are seated together there under its name', async (t) => {
  const h = await harness(t);
  const lead = await h.person('Lead');
  const made = await h.call(lead, '/api/clans/create', { name: 'Yaba Ten', colour: 'gold', clientId: h.f.id() });
  assert.equal((await h.call(lead, '/api/clans/venue', { city: 'lagos', venue: 'park' })).code, 'clan_small');
  const people: Device[] = [];
  for (let i = 1; i < CLAN.venueMin; i++) { const p = await h.person(`Mate${i}`); people.push(p); assert.equal((await h.call(p, '/api/clans/join', { code: made.clan.code })).ok, true); }
  assert.equal((await h.call(lead, '/api/clans/venue', { city: 'lagos', venue: 'home' })).ok, undefined, 'a home is never a clan room');
  const held = await h.call(lead, '/api/clans/venue', { city: 'lagos', venue: 'park' });
  assert.equal(held.ok, true, JSON.stringify(held)); assert.equal(held.clan.venue.venue, 'park');
  // Two members join the park: they are in one group, and the group list names the clan.
  const a = await h.f.joinRoom(lead), b = await h.f.joinRoom(people[0]!);
  a.ws.send(JSON.stringify({ type: 'groups' }));
  let list: Json | null = null;
  for (let i = 0; i < 20 && !list; i++) { const frame = await a.next() as Json; if (frame.type === 'groups') list = frame; }
  assert.ok(list, 'a groups list');
  const ours = (list!.groups as Json[]).find((g) => g.mine);
  assert.equal(ours?.size, 2); assert.equal(ours?.clan?.name, 'Yaba Ten');
  void b;
});

test('arena results feed the ladder: +30 a win, -12 a loss, and the same pair counts three times a day', async (t) => {
  const h = await harness(t);
  const [ada, bola] = [await h.person('Ada2'), await h.person('Bola2')];
  await h.match(ada, bola);
  await h.until(async () => ((await h.call(ada, '/api/clans/boards')).me?.pts ?? 0) > 0, 'the ladder');
  const a = await h.call(ada, '/api/clans/boards'), b = await h.call(bola, '/api/clans/boards');
  assert.equal(a.me.pts, LADDER.win); assert.equal(a.me.games[0].game, 'fight'); assert.equal(a.me.rank, 'Bronze III');
  assert.equal(b.me.pts, 0, 'a loss never goes below the floor');
  for (let i = 0; i < 3; i++) await h.match(ada, bola);
  await new Promise((r) => setTimeout(r, 100));
  const later = await h.call(ada, '/api/clans/boards');
  assert.equal(later.me.pts, LADDER.win * LADDER.pairPerDay, 'only three games a day between the same two count');
  // The boards come in order and stay small.
  const ids = (later.boards as Json[]).map((x) => x.k);
  assert.deepEqual(ids.filter((k) => ['city', 'cohort', 'country', 'global'].includes(k)), ['city', 'cohort', 'country', 'global']);
  assert.ok(gzipSync(JSON.stringify(later)).length < 4096, 'under 4 KB gzipped');
});

test('a city league week settles into the gist, and a clan war settles on its members with a prize claimed once', async (t) => {
  const h = await harness(t);
  const lions: Device[] = [], eagles: Device[] = [];
  const mk = async (name: string, list: Device[], n: number) => {
    const lead = await h.person(`${name}0`); list.push(lead);
    const made = await h.call(lead, '/api/clans/create', { name, colour: 'gold', clientId: h.f.id() });
    for (let i = 1; i < n; i++) { const p = await h.person(`${name}${i}`); list.push(p); await h.call(p, '/api/clans/join', { code: made.clan.code }); }
  };
  await mk('Lions', lions, 3); await mk('Eagles', eagles, 3);
  // Lions beat Eagles in three different pairs.
  for (let i = 0; i < 3; i++) await h.match(lions[i]!, eagles[i]!);
  await h.until(async () => (await h.call(lions[0]!, '/api/clans/me')).clan.war?.vs != null, 'the war to be matched');
  const war = (await h.call(lions[0]!, '/api/clans/me')).clan.war;
  assert.equal(war.vs.name, 'Eagles');
  // A week later the next result settles last week: the league's gist line and the war.
  h.f.advance(8 * 86400000);
  const [x, y] = [await h.person('Late1'), await h.person('Late2')];
  await h.match(x, y);
  await h.until(async () => (await h.call(lions[0]!, '/api/clans/me')).clan.last != null, 'the war to settle');
  const last = (await h.call(lions[0]!, '/api/clans/me')).clan.last;
  assert.equal(last.outcome, 'win'); assert.ok(last.prize > 0, 'a counted member has a prize to claim');
  const claimed = await h.call(lions[0]!, '/api/clans/prize', { cityId: 'lagos' });
  assert.equal(claimed.ok, true, JSON.stringify(claimed));
  assert.equal((await h.call(lions[0]!, '/api/clans/prize', { cityId: 'lagos' })).duplicate, true, 'once');
  assert.equal((await h.call(eagles[0]!, '/api/clans/me')).clan.last.outcome, 'loss');
});

test('a city league week: results roll up to the home city (the pin counts abroad), and the winning city is in the gist', async (t) => {
  const h = await harness(t);
  h.f.advance(Date.UTC(2026, 9, 12, 9) - h.f.now()); // a Monday morning in Lagos, so the weeks are real ones
  const lagos = [await h.person('Lagos A'), await h.person('Lagos B'), await h.person('Lagos C')];
  const ibadan = [await h.person('Ibadan A'), await h.person('Ibadan B'), await h.person('Ibadan C')];
  // Ibadan's three play for Ibadan through their home-city pin, wherever their character lives.
  await h.f.server.store.transact((db) => { for (const p of ibadan) { const s = Object.values(db.sessions).find((x) => x.publicId === p.id); if (s) s.homeCity = { city: 'ibadan', name: 'Ibadan', tz: 'Africa/Lagos' }; } });
  await h.match(lagos[0]!, lagos[1]!); await h.match(lagos[1]!, lagos[2]!); await h.match(lagos[2]!, lagos[0]!);
  await h.match(ibadan[0]!, ibadan[1]!); await h.match(ibadan[2]!, ibadan[1]!);
  await new Promise((r) => setTimeout(r, 150));
  const standing = await (await h.f.request('/api/clans/league', null, lagos[0]!.cookie)).json() as Json;
  assert.deepEqual((standing.cities as Json[]).map((c) => c.id), ['ibadan', 'lagos'], 'Ibadan 60, Lagos 54');
  assert.equal(standing.home.id, 'lagos');
  h.f.advance(8 * 86400000);
  await h.match(await h.person('Late One'), await h.person('Late Two'));
  await new Promise((r) => setTimeout(r, 150));
  const gist = await (await h.f.request('/api/world/gist?id=ibadan')).json() as Json;
  assert.ok((gist.items as Json[]).some((i) => /Ibadan took the week/.test(i.text)), JSON.stringify(gist.items));
  const after = await (await h.f.request('/api/clans/league', null, lagos[0]!.cookie)).json() as Json;
  assert.equal(after.lastWinner?.id, 'ibadan');
});
