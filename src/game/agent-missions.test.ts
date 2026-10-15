import { loadCityContent as preloadCityContent } from './cities/registry.ts';
await Promise.all(['lagos', 'ibadan'].map(preloadCityContent));
// OWNER: growth — the life's half of agent missions (systems/agent-missions.ts): the server-only 'missions.server' action, the triggers (talk, hand over,
// bring a friend, a table game with another person), the collect, the limits on rewards, the hand-over of a held quote, and old saves.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, dispatch, viewLife } from '../life.ts';
import { makeContext } from './util.ts';
import { AGENT_MISSIONS, MISSION_REWARDS } from './content/missions.ts';
import type { ActionBody, ActionType } from '../types/actions.ts';
import type { LifeContext, LifeContextInit, LifeState } from '../types/life.ts';
import { agentRows } from '../app/features/growth/agentTasks.ts';
import { venueFor } from './cities/runtime.ts';

const DAY = 86400000;
const NOW = Date.UTC(2026, 0, 5, 8); // Monday 09:00 Lagos
let seq = 0;
const ctxAt = (now = NOW, extra: LifeContextInit = {}): LifeContext => { const actionId = `a-${++seq}`; return makeContext({ now, cityId: 'lagos', seed: actionId, actionId, ...extra }); };
const life = (saved: Record<string, unknown> = {}, now = NOW): LifeState => { const state = createLife({ cash: 20000, ...saved }, ctxAt(now)); state.t = now; return state; };
/** The server's door: only 'internal' may run the server-only action. */
const server = (state: LifeState, payload: unknown, now = NOW) => dispatch(state, { type: 'missions.server', payload } as unknown as ActionBody<'missions.server'>, { ...ctxAt(now), internal: true });
const act = (state: LifeState, type: ActionType, payload?: unknown, now = NOW) => dispatch(state, { type, payload } as unknown as ActionBody, ctxAt(now));
const BABA = { id: 'house.lagos.ade', name: 'Baba Ade', city: 'lagos', venue: 'cchub', hours: '10:00 to 17:00' };
const TOLANI = { id: 'house.lagos.tolani', name: 'Mama Tolani', city: 'lagos', venue: 'market', hours: '9:00 to 18:00' };
const task = (over: Record<string, unknown> = {}) => ({ id: 'ag-greet-ade-1', kind: 'talk', label: 'Say hello to Mama Tolani', brief: 'Please say hello for me.', count: 1, cash: 150, by: BABA, with: TOLANI, ...over });
const give = (state: LifeState, over: Record<string, unknown> = {}, now = NOW) => server(state, { op: 'give', entry: task(over) }, now);
const entryOf = (state: LifeState, id: string) => state.missions.agent?.find((item) => item.id === id);
const FRIEND = '11111111-2222-4333-8444-555555555555';
const withFriend = (state: LifeState) => { state.social.rel[FRIEND] = { p: 10, d: 0, n: 0, npc: false, at: NOW, name: 'Bola', friend: true }; return state; };

test('missions.server is the server\'s: a player cannot run it, and an unknown step changes nothing', () => {
  const state = life();
  assert.equal(act(state, 'missions.server' as ActionType, { op: 'give', entry: task() }).code, 'server_only');
  assert.equal(state.missions.agent, undefined);
  for (const hostile of [undefined, null, 7, {}, { op: 'rob' }, { op: '__proto__' }]) assert.equal(server(state, hostile).code, 'invalid_operation');
  assert.equal(server(state, { op: 'give', entry: 'x' }).code, 'invalid_operation');
});

test('a task is given, stored with the agent who gave it, and loads again from a save', () => {
  const state = life();
  const done = give(state);
  assert.equal(done.code, 'given');
  const entry = entryOf(state, 'ag-greet-ade-1')!;
  assert.deepEqual([entry.kind, entry.n, entry.count, entry.cash, entry.claimed, entry.by.name, entry.with?.id], ['talk', 0, 1, 150, false, 'Baba Ade', TOLANI.id]);
  assert.ok(entry.until > NOW && entry.until - NOW <= DAY, 'a task of a day lapses at the next Lagos midnight');
  const back = createLife(JSON.parse(JSON.stringify(state)), ctxAt());
  assert.deepEqual(back.missions.agent, state.missions.agent, 'a save keeps it exactly');
  assert.equal(state.message.includes('Baba Ade'), true);
});

test('old saves load: a life without agent tasks gets no new fields, and what is stored only ever gains optional fields', () => {
  const state = life();
  const saved = JSON.parse(JSON.stringify(state)) as { missions: Record<string, unknown> };
  assert.equal('agent' in saved.missions, false);
  assert.equal('deal' in saved.missions, false);
  const loaded = createLife(saved, ctxAt());
  assert.equal(Object.hasOwn(loaded.missions, 'agent'), false);
  assert.equal(Object.hasOwn(loaded.missions, 'deal'), false);
  assert.deepEqual(Object.keys(loaded.missions).sort(), Object.keys(state.missions).sort());
  // Junk in the optional fields is dropped, not trusted.
  const junk = createLife({ ...saved, missions: { ...saved.missions, agent: [{ id: 'X Y', kind: 'rob', cash: 1e9 }, 7, null, { id: 'ag-ok', kind: 'talk', by: { id: 'h', name: 'N' }, cash: 1e9, count: 1 }], deal: 12 } }, ctxAt());
  assert.equal(junk.missions.agent?.length, 1);
  assert.equal(junk.missions.agent?.[0]?.cash, MISSION_REWARDS.daily.cash, 'a stored reward is clamped to the daily figure');
  assert.equal(Object.hasOwn(junk.missions, 'deal'), false);
  const big = createLife({ ...saved, missions: { ...saved.missions, agent: [{ id: 'ag-big', kind: 'bring', big: true, by: { id: 'h', name: 'N' }, cash: 1e9, count: 1 }] } }, ctxAt());
  assert.equal(big.missions.agent?.[0]?.cash, MISSION_REWARDS.weekly.cash, 'a weekly-sized task is clamped to the weekly figure');
});

test('a reward above the limit is refused, never trimmed; a big task may pay up to the weekly figure and lasts a week', () => {
  const state = life();
  assert.equal(give(state, { cash: MISSION_REWARDS.daily.cash + 1 }).code, 'too_big');
  assert.equal(give(state, { cash: MISSION_REWARDS.weekly.cash + 1, big: true }).code, 'too_big');
  assert.equal(give(state, { cash: 0 }).code, 'invalid_operation');
  assert.equal(give(state, { kind: 'talk', with: undefined }).code, 'invalid_operation', 'a talk task needs someone to greet');
  assert.equal(give(state, { kind: 'hand', item: undefined, with: undefined }).code, 'invalid_operation', 'a hand task needs an item');
  assert.equal(state.missions.agent, undefined);
  assert.equal(give(state, { id: 'ag-big-1', big: true, cash: MISSION_REWARDS.weekly.cash }).code, 'given');
  assert.equal(entryOf(state, 'ag-big-1')!.until, NOW + AGENT_MISSIONS.bigDays * DAY);
});

test('limits: three open at once, two a Lagos day, one big a week, no repeats, nothing for a guest of the quick start', () => {
  const state = life();
  assert.equal(give(state, { id: 'ag-a-1' }).code, 'given');
  assert.equal(give(state, { id: 'ag-a-1' }).code, 'already_given');
  assert.equal(give(state, { id: 'ag-a-2' }).code, 'given');
  assert.equal(give(state, { id: 'ag-a-3' }).code, 'too_many', 'two a day');
  assert.match(state.message, /tomorrow/);
  assert.equal(give(state, { id: 'ag-a-3' }, NOW + DAY).code, 'given', 'tomorrow is a new day (yesterday\'s two have lapsed)');
  const open = life({ missions: { agent: [1, 2, 3].map((n) => ({ ...task({ id: `ag-o-${n}` }), n: 0, claimed: false, marks: [], at: NOW - DAY, until: NOW + DAY })) } });
  assert.equal(open.missions.agent?.length, 3);
  assert.equal(give(open, { id: 'ag-o-4' }).code, 'too_many', 'three open at once');
  const week = life();
  assert.equal(give(week, { id: 'ag-b-1', big: true, cash: 600 }).code, 'given');
  assert.equal(give(week, { id: 'ag-b-2', big: true, cash: 600 }, NOW + DAY).code, 'too_many', 'one big task a week');
  assert.match(week.message, /next week/);
  assert.equal(give(week, { id: 'ag-b-2', big: true, cash: 600 }, NOW + 7 * DAY).code, 'given', 'and a new one the week after');
  const guest = life({ onboarding: { stage: 'guest', done: false } });
  assert.equal(guest.onboarding.stage, 'guest');
  assert.equal(give(guest).code, 'missions_locked');
});

test('talk: only the agent named counts, once, and then the task can be collected for exactly its reward', () => {
  const state = life();
  give(state);
  assert.equal(server(state, { op: 'talk', agent: 'house.lagos.dayo' }).code, 'nothing_to_do');
  assert.equal(act(state, 'missions.claim', { id: 'ag-greet-ade-1' }).code, 'not_done');
  assert.equal(server(state, { op: 'talk', agent: TOLANI.id }).code, 'greeted');
  assert.equal(entryOf(state, 'ag-greet-ade-1')!.n, 1);
  assert.equal(server(state, { op: 'talk', agent: TOLANI.id }).code, 'nothing_to_do', 'a second hello counts nothing');
  const cash = state.cash, claimed = state.missions.claimed;
  const paid = act(state, 'missions.claim', { id: 'ag-greet-ade-1' });
  assert.equal(paid.code, 'claimed');
  assert.equal(state.cash, cash + 150, 'it pays exactly what was set');
  assert.equal(state.missions.claimed, claimed + 1);
  assert.ok(state.ledger.some((line) => line.reason === 'Mission: Say hello to Mama Tolani' && line.amount === 150));
  assert.equal(act(state, 'missions.claim', { id: 'ag-greet-ade-1' }).code, 'already_claimed');
  assert.equal(state.cash, cash + 150, 'paid once');
});

test('a collected reward never exceeds the limit, even if a stored task was tampered with', () => {
  for (const [big, limit] of [[false, MISSION_REWARDS.daily.cash], [true, MISSION_REWARDS.weekly.cash]] as const) {
    const state = life();
    give(state, { id: 'ag-t-1', big, cash: limit });
    const entry = entryOf(state, 'ag-t-1')!;
    entry.cash = limit * 10; // not reachable by sanitize, but the collect clamps too
    entry.n = entry.count;
    const cash = state.cash;
    assert.equal(act(state, 'missions.claim', { id: 'ag-t-1' }).code, 'claimed');
    assert.equal(state.cash - cash, limit);
  }
});

test('hand: the items leave the kitchen and the task is done; too few changes nothing', () => {
  const state = life({ inventory: { rice: 1 } });
  give(state, { id: 'ag-fetch-1', kind: 'hand', item: 'rice', units: 3, with: undefined, by: TOLANI });
  assert.equal(server(state, { op: 'hand', agent: BABA.id }).code, 'nothing_to_do', 'only the agent who asked');
  const short = server(state, { op: 'hand', agent: TOLANI.id });
  assert.equal(short.code, 'item_short');
  assert.equal(state.inventory['rice'], 1, 'nothing taken');
  assert.equal(entryOf(state, 'ag-fetch-1')!.n, 0);
  state.inventory['rice'] = 4;
  assert.equal(server(state, { op: 'hand', agent: TOLANI.id }).code, 'handed');
  assert.equal(state.inventory['rice'], 1);
  assert.equal(entryOf(state, 'ag-fetch-1')!.n, 1);
  assert.equal(server(state, { op: 'hand', agent: TOLANI.id }).code, 'nothing_to_do', 'handed once');
  assert.equal(act(state, 'missions.claim', { id: 'ag-fetch-1' }).code, 'claimed');
});

test('bring: only a friend who is a person counts, once each', () => {
  const state = withFriend(life());
  state.social.rel['npc-ada'] = { p: 50, d: 0, n: 0, npc: true, at: NOW };
  give(state, { id: 'ag-friend-1', kind: 'bring', big: true, cash: 600, with: undefined, by: TOLANI });
  assert.equal(server(state, { op: 'bring', agent: TOLANI.id, friend: '99999999-2222-4333-8444-555555555555' }).code, 'not_a_friend');
  assert.equal(server(state, { op: 'bring', agent: TOLANI.id, friend: 'npc-ada' }).code, 'not_a_friend', 'a character of the game is not a friend brought');
  assert.equal(server(state, { op: 'bring', agent: TOLANI.id, friend: '__proto__' }).code, 'not_a_friend');
  assert.equal(server(state, { op: 'bring', agent: BABA.id, friend: FRIEND }).code, 'nothing_to_do');
  assert.equal(server(state, { op: 'bring', agent: TOLANI.id, friend: FRIEND }).code, 'brought');
  assert.equal(entryOf(state, 'ag-friend-1')!.n, 1);
  assert.equal(server(state, { op: 'bring', agent: TOLANI.id, friend: FRIEND }).code, 'nothing_to_do');
});

test('a table game with another person moves a table task on; a game against the computer does not', () => {
  const state = life();
  give(state, { id: 'ag-table-1', kind: 'table', with: undefined, by: BABA, cash: 250 });
  const result = { game: 'whot', label: 'Whot', won: false, human: false, counted: false };
  const table = (over: Record<string, unknown>) => dispatch(state, { type: 'growth.table-result', payload: { ...result, ...over } } as unknown as ActionBody, { ...ctxAt(), internal: true });
  table({ human: false });
  assert.equal(entryOf(state, 'ag-table-1')!.n, 0, 'the computer is not another person');
  table({ human: true, counted: true });
  assert.equal(entryOf(state, 'ag-table-1')!.n, 1);
  assert.equal(act(state, 'missions.claim', { id: 'ag-table-1' }).code, 'claimed');
});

test('a lapsed task is not offered and cannot be finished; a finished one can still be collected', () => {
  const state = life();
  give(state, { id: 'ag-late-1' });
  const place = (city: string, venue: string) => venueFor(city, venue)?.label ?? null;
  assert.deepEqual(agentRows(state.missions, NOW + 2 * DAY, 'lagos', place), [], 'a lapsed task is not shown');
  assert.equal(server(state, { op: 'talk', agent: TOLANI.id }, NOW + 2 * DAY).code, 'nothing_to_do');
  const done = life();
  give(done, { id: 'ag-done-1' });
  server(done, { op: 'talk', agent: TOLANI.id });
  assert.equal(agentRows(done.missions, NOW + 2 * DAY, 'lagos', place).length, 1, 'finished and not collected: still there');
  assert.equal(viewLife(done, ctxAt(NOW + 2 * DAY)).missions.claimable, 0, 'the first download does not count them: only the daily and weekly rewards');
});

test('the Missions view shows the agent, where to find it, and a Go for a venue in this city', () => {
  const state = life();
  give(state);
  const place = (city: string, venue: string) => venueFor(city, venue)?.label ?? null;
  const row = agentRows(state.missions, NOW, 'lagos', place)[0];
  assert.ok(row);
  assert.deepEqual([row.by.name, row.by.hours, row.kind, row.cash, row.done, row.claimed], ['Baba Ade', '10:00 to 17:00', 'talk', 150, false, false]);
  assert.ok(row.by.place.length > 0);
  assert.deepEqual(row.go, ['cchub']);
  assert.equal(agentRows(state.missions, NOW, 'ibadan', place)[0]?.go, null, 'in another city there is no walk');
});

const SALE = { op: 'sale', shop: 'Mama Tolani', product: 'ankara', label: 'Ankara wax print', price: 1900, list: 2000, ref: 'house.lagos.tolani|ankara|1', kind: 'goods' };
test('sale: pays exactly the price held, puts the goods in the bag, and a repeat of the same hand-over is refused', () => {
  const state = life({ cash: 10000 });
  const done = server(state, SALE);
  assert.equal(done.code, 'bought');
  assert.equal(state.cash, 10000 - 1900, 'exactly the held price');
  assert.deepEqual(state.business.bag, { ankara: 1 });
  assert.ok(state.ledger.some((line) => line.reason === 'Bought at Mama Tolani: 1 × Ankara wax print' && line.amount === -1900));
  assert.equal(server(state, SALE).code, 'already_done');
  assert.equal(state.cash, 10000 - 1900);
  assert.equal(server(state, { ...SALE, ref: 'house.lagos.tolani|ankara|2' }).code, 'bought', 'a new agreement is a new purchase');
});

test('sale: never below the floor, never above the list, never without the money or room', () => {
  const state = life({ cash: 10000 });
  const floor = Math.ceil((2000 * AGENT_MISSIONS.floorShare) / 10) * 10;
  assert.equal(floor, 1400);
  assert.equal(server(state, { ...SALE, price: floor - 10, ref: 'r1' }).code, 'bad_price');
  assert.equal(server(state, { ...SALE, price: 1, ref: 'r2' }).code, 'bad_price');
  assert.equal(server(state, { ...SALE, price: 0, ref: 'r2b' }).code, 'bad_price');
  assert.equal(server(state, { ...SALE, price: 2010, ref: 'r3' }).code, 'bad_price');
  assert.equal(server(state, { ...SALE, price: 1900.5, ref: 'r4' }).code, 'bad_price');
  assert.equal(server(state, { ...SALE, price: -5, ref: 'r5' }).code, 'bad_price');
  assert.equal(server(state, { ...SALE, product: 'Not A Slug', ref: 'r6' }).code, 'unknown_product');
  assert.equal(server(state, { ...SALE, ref: '' }).code, 'unknown_product');
  assert.equal(state.cash, 10000, 'nothing was charged');
  assert.equal(server(state, { ...SALE, price: floor, ref: 'r7' }).code, 'bought', 'the floor itself is a fair price');
  const poor = life({ cash: 500 });
  assert.equal(server(poor, SALE).code, 'insufficient_funds');
  assert.equal(poor.cash, 500);
  const loaded = life({ cash: 90000, business: { bag: { ankara: 24 } } });
  assert.equal(server(loaded, SALE).code, 'bag_full');
  assert.equal(loaded.cash, 90000);
});

test('sale of food is eaten: hunger goes up, and a full stomach is refused before any money moves', () => {
  const food = { op: 'sale', shop: 'Bro Dayo', product: 'local-plate', label: 'Plate of the day', price: 450, list: 500, ref: 'f1', kind: 'food', effects: { hunger: 50 }, need: 'hunger', mood: { id: 'plate', label: 'Good plate', value: 3, hours: 1 } };
  const state = life({ cash: 5000 });
  state.needs.hunger = 20;
  assert.equal(server(state, food).code, 'bought');
  assert.equal(state.needs.hunger, 70);
  assert.equal(state.cash, 4550);
  assert.deepEqual(state.business.bag, {}, 'food does not go in the bag');
  state.needs.hunger = 99;
  assert.equal(server(state, { ...food, ref: 'f2' }).code, 'not_needed');
  assert.equal(state.cash, 4550);
});
