// OWNER: agents — agent missions on a real server (docs/AGENT-MISSIONS.md): a task given in person, the triggers (talk to an agent, hand over items, bring a friend), the
// collect, and the hand-over that completes a haggled price. Written lines only (the test server has no model key). Setup of a life goes through the store, as a save would.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixture } from '../test-fixture.ts';
import type { Device, TestSocket } from '../test-fixture.ts';
import type { ServerFrame } from '../../src/types/protocol.ts';
import type { LifeState } from '../../src/types/life.ts';

const HOUR = 3600000;
const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
type Fixture = Awaited<ReturnType<typeof fixture>>;
interface Page { device: Device; socket: TestSocket; frames: ServerFrame[] }

async function start(t: Parameters<typeof fixture>[0]) {
  const f = await fixture(t);
  f.advance(9 * HOUR - f.now()); // 10:00 in Lagos: the seller is at the market and the guide in the park
  return f;
}
async function player(f: Fixture, name: string, venue: string): Promise<Page> {
  const device = await f.device(name);
  await f.request('/api/life?city=lagos', undefined, device.cookie);
  await seed(f, { device } as Page, (state) => { state.location = venue; });
  const socket = await f.socket(device), frames: ServerFrame[] = [];
  socket.ws.on('message', (data) => { frames.push(JSON.parse(data.toString()) as ServerFrame); });
  socket.ws.send(JSON.stringify({ type: 'join', cityId: 'lagos', venueId: venue }));
  await pause(60);
  return { device, socket, frames };
}
const lifeOf = async (f: Fixture, page: Page): Promise<LifeState> => ((await (await f.request('/api/life?city=lagos', undefined, page.device.cookie)).json()) as { state: LifeState }).state;
/** Change a stored life the way a save would be: through the store, then settled and sanitised on its next use. */
async function seed(f: Fixture, page: Page, change: (state: LifeState) => void): Promise<void> {
  await f.server.store.transact((db) => {
    const session = Object.values(db.sessions).find((item) => item.publicId === page.device.id);
    const state = session?.cities?.['lagos']?.state;
    assert.ok(state, 'the life exists');
    change(state);
  });
}
let n = 0;
/** Say something in the venue and return what house agents said back. */
async function say(page: Page, body: string): Promise<string[]> {
  const before = page.frames.length;
  page.socket.ws.send(JSON.stringify({ type: 'chat', clientId: `c${++n}-${Date.now()}`, body }));
  await pause(220);
  return page.frames.slice(before).filter((frame): frame is Extract<ServerFrame, { type: 'chat' }> => frame.type === 'chat' && frame.from.id.startsWith('house.')).map((frame) => frame.body);
}
const task = (over: Record<string, unknown>) => ({ id: 'ag-seed-1', kind: 'talk', label: 'Say hello to Tunji', brief: 'Please say hello to Tunji for me.', n: 0, count: 1, cash: 150, marks: [], claimed: false,
  by: { id: 'house.lagos.tolani', name: 'Mama Tolani', city: 'lagos', venue: 'market', hours: '9 AM to 6 PM' }, with: { id: 'house.lagos.tunji', name: 'Tunji', city: 'lagos', venue: 'park' }, at: 0, until: 0, ...over });
const withTimes = (f: Fixture, over: Record<string, unknown>) => ({ ...task(over), at: f.now(), until: f.now() + 20 * HOUR });

test('a seller gives a task in person, once a day, and it shows in the life with the agent and where to find it', async (t) => {
  const f = await start(t);
  const ada = await player(f, 'Ada', 'market');
  f.server.beat(); await pause(60);
  const said = await say(ada, 'Mama Tolani, any task for me?');
  assert.equal(said.length, 1, JSON.stringify(said));
  assert.match(said[0]!, /Goals/);
  const life = await lifeOf(f, ada);
  const entries = life.missions.agent ?? [];
  assert.equal(entries.length, 1);
  const [entry] = entries;
  assert.equal(entry!.by.name, 'Mama Tolani');
  assert.equal(entry!.by.venue, 'market');
  assert.ok(entry!.cash > 0 && entry!.cash <= (entry!.big ? 1000 : 250), 'the reward is inside the mission limits');
  assert.ok(said[0]!.startsWith(entry!.brief), 'the agent said what is stored');
  assert.ok(entry!.until > f.now());
  // The Missions app is given the same tasks with the growth hello (the first download's engine does not carry them).
  const hello = (await (await f.request('/api/growth/hello', { cityId: 'lagos' }, ada.device.cookie)).json()) as { ok: boolean; agentTasks?: { id: string; by: { name: string } }[] };
  assert.equal(hello.ok, true);
  assert.deepEqual(hello.agentTasks?.map((task) => [task.id, task.by.name]), [[entry!.id, 'Mama Tolani']]);
  const bob = await player(f, 'Bob', 'market');
  const none = (await (await f.request('/api/growth/hello', { cityId: 'lagos' }, bob.device.cookie)).json()) as { ok: boolean; agentTasks?: unknown };
  assert.equal(none.ok, true);
  assert.equal(none.agentTasks, undefined, 'a life with no task has no list');
  // The same person asking again the same day is told so, and nothing more is given.
  f.advance(15000);
  const again = await say(ada, 'any other work for me?');
  assert.match(again[0] ?? '', /today|Goals/);
  assert.equal(((await lifeOf(f, ada)).missions.agent ?? []).length, 1);
});

test('talk to an agent: a greeting for another agent is counted when the person speaks to it, and the reward is collected from Goals', async (t) => {
  const f = await start(t);
  const ada = await player(f, 'Ada', 'park');
  await seed(f, ada, (state) => { state.missions.agent = [withTimes(f, {}) as never]; });
  f.server.beat(); await pause(60);
  const cash = (await lifeOf(f, ada)).cash;
  const said = await say(ada, 'hello Tunji');
  assert.match(said.join(' '), /done|Goals/i);
  const life = await lifeOf(f, ada);
  assert.equal(life.missions.agent?.[0]?.n, 1);
  const paid = await f.action(ada.device.cookie, { type: 'missions.claim', payload: { id: 'ag-seed-1' } });
  assert.equal(paid.ok, true, JSON.stringify(paid));
  assert.equal((await lifeOf(f, ada)).cash, cash + 150);
  const twice = await f.action(ada.device.cookie, { type: 'missions.claim', payload: { id: 'ag-seed-1' } });
  assert.equal(twice.ok, false);
  assert.equal((await lifeOf(f, ada)).cash, cash + 150, 'paid once');
});

test('hand an item to an agent: the items leave the kitchen when the person says so, and not before', async (t) => {
  const f = await start(t);
  const ada = await player(f, 'Ada', 'market');
  await seed(f, ada, (state) => { state.inventory['rice'] = 1; state.missions.agent = [withTimes(f, { kind: 'hand', item: 'rice', units: 3, with: undefined, label: 'Bring 3 long-grain rice to Mama Tolani' }) as never]; });
  f.server.beat(); await pause(60);
  const short = await say(ada, 'Mama Tolani, here you go, I brought the rice');
  assert.match(short.join(' '), /3|rice/i, 'told what is still missing');
  assert.equal((await lifeOf(f, ada)).inventory['rice'], 1);
  await seed(f, ada, (state) => { state.inventory['rice'] = 4; });
  f.advance(15000);
  const done = await say(ada, 'Mama Tolani, here you go, I brought the rice');
  assert.match(done.join(' '), /Goals/);
  const life = await lifeOf(f, ada);
  assert.equal(life.inventory['rice'], 1);
  assert.equal(life.missions.agent?.[0]?.n, 1);
});

test('bring a friend: the task counts when a friend of the person stands there and the person speaks to the agent', async (t) => {
  const f = await start(t);
  const ada = await player(f, 'Ada', 'market');
  const bob = await player(f, 'Bob', 'market');
  const stranger = await player(f, 'Cleo', 'market');
  await seed(f, ada, (state) => {
    state.social.rel[stranger.device.id] = { p: 1, d: 0, n: 0, npc: false, at: 1, name: 'Cleo' } as never; // met, not a friend
    state.missions.agent = [withTimes(f, { id: 'ag-friend-1', kind: 'bring', big: true, cash: 600, with: undefined, label: 'Bring a friend to Mama Tolani' }) as never];
  });
  f.server.beat(); await pause(60);
  const none = await say(ada, 'hello Mama Tolani');
  assert.doesNotMatch(none.join(' '), /Goals/, 'a person who is not a friend does not count');
  assert.equal((await lifeOf(f, ada)).missions.agent?.[0]?.n, 0);
  await seed(f, ada, (state) => { state.social.rel[bob.device.id] = { p: 30, d: 0, n: 0, npc: false, at: 1, name: 'Bob', friend: true } as never; });
  f.advance(15000);
  const done = await say(ada, 'hello again Mama Tolani');
  assert.match(done.join(' '), /Goals/);
  assert.equal((await lifeOf(f, ada)).missions.agent?.[0]?.n, 1);
  assert.deepEqual((await lifeOf(f, ada)).missions.agent?.[0]?.marks, [bob.device.id]);
});

test('the hand-over completes a held quote: it pays exactly the price agreed, never below the floor, and the item arrives; no quote, no sale', async (t) => {
  const f = await start(t);
  const ada = await player(f, 'Ada', 'market');
  f.server.beat(); await pause(60);
  const cash = (await lifeOf(f, ada)).cash;
  // Saying "I'll take it" with nothing agreed sells nothing.
  await say(ada, "Mama Tolani, I'll take it");
  assert.equal((await lifeOf(f, ada)).cash, cash);
  // A price below the floor is refused: no quote is held, so there is nothing to pay.
  const low = await say(ada, 'Mama Tolani, ankara for 900');
  assert.match(low.join(' '), /low|no|₦2,000|try/i);
  f.advance(15000);
  await say(ada, "Mama Tolani, I'll take it");
  assert.equal((await lifeOf(f, ada)).cash, cash, 'a refused offer holds no price');
  assert.deepEqual((await lifeOf(f, ada)).business.bag, {});
  // A fair offer is accepted and held.
  f.advance(15000);
  const deal = await say(ada, 'Mama Tolani, ankara for 1900');
  assert.match(deal.join(' '), /Deal|₦1,900/);
  assert.equal((await lifeOf(f, ada)).cash, cash, 'agreeing takes no money; the hand-over does');
  f.advance(15000);
  const sold = await say(ada, "ok I'll take it");
  assert.match(sold.join(' '), /1,900/);
  const life = await lifeOf(f, ada);
  assert.equal(life.cash, cash - 1900, 'exactly the held price');
  assert.deepEqual(life.business.bag, { ankara: 1 });
  assert.ok(life.ledger.some((line) => line.reason.startsWith('Bought at Mama Tolani') && line.amount === -1900));
  // Once is once: the quote is spent.
  f.advance(15000);
  await say(ada, "I'll take it");
  assert.equal((await lifeOf(f, ada)).cash, cash - 1900);
});

test('a quote that ran out is not paid, and a person who cannot afford the price keeps the quote', async (t) => {
  const f = await start(t);
  const ada = await player(f, 'Ada', 'market');
  f.server.beat(); await pause(60);
  await say(ada, 'Mama Tolani, adire for 2400');
  const cash = (await lifeOf(f, ada)).cash;
  await seed(f, ada, (state) => { state.cash = 500; });
  f.advance(15000);
  const short = await say(ada, "I'll take it");
  assert.match(short.join(' '), /2,400|short|need/i);
  assert.equal((await lifeOf(f, ada)).cash, 500);
  await seed(f, ada, (state) => { state.cash = cash; });
  f.advance(11 * 60000);
  f.server.beat(); await pause(60);
  await say(ada, "I'll take it");
  assert.equal((await lifeOf(f, ada)).cash, cash, 'ten minutes later the quote is gone');
});
