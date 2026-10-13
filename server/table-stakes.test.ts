import { loadCityContent as preloadCityContent } from '../src/game/cities/registry.ts';
await Promise.all(['lagos', 'ibadan'].map(preloadCityContent));
// OWNER: growth — table stakes against a real server and real sockets (docs/GAMES.md, "Stakes"): both stakes taken once, in one
// transaction; the winner takes the pot; a draw or a game nobody moved in refunds; a player who leaves has lost; the limits (per
// game, per pair, per player, per day); the gift allowance; 18+; never against a bot; blocks and shared devices; repeats change
// nothing; and a restart in the middle of a game returns both stakes. The pure rules are in src/game/table-stakes.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { TestContext } from 'node:test';
import { fixture } from './test-fixture.ts';
import type { Device, TestSocket } from './test-fixture.ts';
import { createServer } from './server.ts';
import { lagosTime } from '../src/game/clock.ts';
import { FORBIDDEN_WORDS } from '../src/game/table-stakes.ts';
import { TABLE_STAKES } from '../src/game/content/growth.ts';
import type { TableStateFrame } from '../src/types/growth.ts';
import type { LifeState } from '../src/types/life.ts';
import type { TablePotRecord } from './types.ts';

type State = Omit<TableStateFrame, 'view' | 'result'> & { view: { history: string[] } | null; result: { text: string; calledOff: boolean; winners: number[]; mine: { won: boolean; draw: boolean; counted: boolean; stake?: { amount: number; pot: number; outcome: string } } | null } | null };
interface Frame { type: string; repeat?: boolean; [field: string]: unknown }
interface Peer { who: Device; ws: TestSocket['ws']; state: State; errors: { code: string; reason?: string }[]; all: Frame[]; waiting: (() => void)[] }
const TABLE = 'park-chess';
const CASH = 30000, EARNED = 20000;

async function harness(t: TestContext) {
  const f = await fixture(t);
  const json = async <T extends object = object>(res: Response): Promise<T & { status: number }> => ({ status: res.status, ...(await res.json()) });
  const post = async <T extends object = object>(path: string, body: unknown, who: Device) => json<T>(await f.request(path, body, who.cookie));
  const life = async (who: Device): Promise<LifeState> => (await json<{ state: LifeState }>(await f.request('/api/life?city=lagos', null, who.cookie))).state;
  const cookieOf = (who: Device | Peer): string => ('who' in who ? who.who.cookie : who.cookie);
  const edit = (who: Device | Peer, change: (state: LifeState) => void) => f.server.store.transact((db) => { const state = db.sessions[cookieOf(who).slice(4)]?.cities.lagos?.state; assert.ok(state); change(state); });
  const pots = (): Promise<Record<string, TablePotRecord>> => f.server.store.read((db) => JSON.parse(JSON.stringify(db.growth?.tables?.pots ?? {})) as Record<string, TablePotRecord>);
  const stakeBook = () => f.server.store.read((db) => JSON.parse(JSON.stringify(db.growth?.tables?.stakes ?? null)) as { day: number; players: Record<string, number>; pairs: Record<string, number> } | null);
  async function connect(who: Device): Promise<Peer> {
    const sock = await f.socket(who);
    const peer: Peer = { who, ws: sock.ws, state: null as unknown as State, errors: [], all: [], waiting: [] };
    sock.ws.on('message', (data) => {
      const message: Frame = JSON.parse(data.toString());
      peer.all.push(message);
      if (message.type === 'table-state') peer.state = message as unknown as State;
      if (message.type === 'error') peer.errors.push(message as unknown as Peer['errors'][number]);
      if (message.type === 'tables') for (const done of peer.waiting.splice(0)) done();
    });
    return peer;
  }
  /** A player with a life in the park, money, work behind them and (unless told otherwise) the answer "18 or older". */
  async function player(name: string, { earned = EARNED, cash = CASH, adult = true }: { earned?: number; cash?: number; adult?: boolean } = {}): Promise<Peer> {
    const who = await f.device(name);
    await life(who);
    await post('/api/growth/hello', { cityId: 'lagos' }, who);
    await edit(who, (state) => { state.cash = cash; state.social.earned = earned; state.ledger = []; state.ledgerDays = []; });
    if (adult) assert.equal((await post('/api/growth/consent', { cityId: 'lagos', age: 'adult' }, who)).status, 200);
    return connect(who);
  }
  const send = (peer: Peer, type: string, body: Record<string, unknown> = {}) => peer.ws.send(JSON.stringify({ type, cityId: 'lagos', table: TABLE, ...body }));
  const settled = (peer: Peer) => new Promise<void>((done) => { peer.waiting.push(done); peer.ws.send(JSON.stringify({ type: 'table-list', cityId: 'lagos', venue: 'park' })); });
  const all = async (...peers: Peer[]) => { for (const peer of peers) await settled(peer); };
  const act = async (peer: Peer, type: string, body?: Record<string, unknown>, ...others: Peer[]): Promise<State> => { send(peer, type, body); await all(peer, ...others); return peer.state; };
  const play = (peer: Peer, text: string, ...others: Peer[]) => act(peer, 'table-move', { n: peer.state.n, move: { t: 'move', from: text.slice(0, 2), to: text.slice(2, 4) } }, ...others);
  const last = (peer: Peer) => peer.errors.at(-1)?.code;
  /** Ada opens the table at `stake`, Bola sits knowing it, and Ada starts. Returns once the game is on (or the first refusal). */
  async function open(ada: Peer, bola: Peer, stake: number) {
    await act(ada, 'table-sit', {});
    if (stake > 0) await act(ada, 'table-stake', { stake }, bola);
    await act(bola, 'table-sit', { stake }, ada);
    await act(ada, 'table-start', {}, bola);
  }
  /** Both players get up (a finished table opens empty) so the next game's stake is agreed afresh. */
  async function clear(...peers: Peer[]) { for (const peer of peers) await act(peer, 'table-leave', {}, ...peers.filter((other) => other !== peer)); }
  const cash = async (...peers: Peer[]) => Promise.all(peers.map(async (peer) => (await life(peer.who)).cash));
  const staked = async (peer: Peer) => (await life(peer.who)).growth.tables.staked;
  const lines = async (peer: Peer) => (await life(peer.who)).ledger.map((line) => `${line.reason} ${line.amount}`);
  return { f, post, life, edit, pots, stakeBook, player, connect, send, settled, all, act, play, last, open, clear, cash, staked, lines };
}

test('stakes: both stakes are taken once when the game starts, the pot is held, and the winner takes all of it; a stake pays no table reward', async (t) => {
  const { f, act, play, player, all, open, pots, cash, staked, lines, life, post, stakeBook } = await harness(t);
  const ada = await player('Ada'), bola = await player('Bola');
  await open(ada, bola, 500);
  assert.deepEqual([ada.state.table.status, ada.state.table.stake, ada.state.stakes.pot, ada.state.table.max], ['playing', 500, 1000, 2]);
  // Taken from both lives, once, with the wallet's words; the allowance shrinks by the stake while it is on the table.
  assert.deepEqual(await cash(ada, bola), [CASH - 500, CASH - 500]);
  assert.deepEqual(await lines(ada), ['Table stake: Chess with Bola -500']);
  assert.deepEqual(await lines(bola), ['Table stake: Chess with Ada -500']);
  assert.deepEqual([await staked(ada), await staked(bola)], [500, 500]);
  const held = Object.values(await pots());
  assert.deepEqual(held.map((pot) => [pot.stake, pot.game, pot.seats.map((seat) => seat.name)]), [[500, 'chess', ['Ada', 'Bola']]], 'the pot is in the saved record, with both players');
  assert.equal((await stakeBook())?.day, lagosTime(f.now()).day);
  // Nothing is paid again however often the clock and the heartbeat run while the game is on.
  for (let i = 0; i < 3; i++) { f.server.beat(); await all(ada, bola); }
  assert.deepEqual(await cash(ada, bola), [CASH - 500, CASH - 500]);
  assert.equal(Object.keys(await pots()).length, 1);

  // Fool's mate: Bola wins and takes the whole pot, ₦1,000, once.
  await play(ada, 'f2f3', bola); await play(bola, 'e7e5', ada); await play(ada, 'g2g4', bola); await play(bola, 'd8h4', ada);
  assert.deepEqual([ada.state.table.status, ada.state.result?.winners, bola.state.result?.mine?.stake, ada.state.result?.mine?.stake], ['over', [1], { amount: 500, pot: 1000, outcome: 'won' }, { amount: 500, pot: 1000, outcome: 'lost' }]);
  assert.deepEqual(await cash(ada, bola), [CASH - 500, CASH + 500]);
  assert.deepEqual(await lines(bola), ['Table stake: Chess with Ada -500', 'Won the pot: Chess with Ada 1000']);
  assert.deepEqual(await pots(), {}, 'the record is the receipt: gone once paid');
  // The winner's own stake is no longer at risk; the loser's is gone for good and keeps counting against what they may give or stake.
  assert.deepEqual([await staked(bola), await staked(ada)], [0, 500]);
  // Winnings are not "worked for": the work total is untouched on both lives, so a win cannot be given onward.
  assert.deepEqual([(await life(bola.who)).social.earned, (await life(ada.who)).social.earned], [EARNED, EARNED]);
  // A repeat of everything changes nothing: heartbeats, a second claim, the same result asked for again.
  for (let i = 0; i < 3; i++) { f.server.beat(); await all(ada, bola); }
  assert.deepEqual(await cash(ada, bola), [CASH - 500, CASH + 500]);
  // The ₦150 table reward is not paid on top, and the game is not a counted win for missions.
  const claim = (peer: Peer) => post<{ results: { code: string }[] }>('/api/growth/tables/claim', { cityId: 'lagos' }, peer.who);
  assert.deepEqual((await claim(bola)).results.map((item) => item.code), ['counted'], 'a chess win still counts for the chess mission, as against a bot, but it never pays');
  assert.deepEqual(await cash(ada, bola), [CASH - 500, CASH + 500]);
  assert.equal((await life(bola.who)).ledger.some((line) => line.reason.startsWith('Table win')), false);
  // The ledger groups the new lines under their own names.
  assert.equal(bola.state.table.stake, 500);
});

test('stakes: a drawn game gives both stakes back', async (t) => {
  const { act, play, player, open, cash, staked, lines, pots } = await harness(t);
  const ada = await player('Ada'), bola = await player('Bola');
  await open(ada, bola, 1000);
  await play(ada, 'e2e4', bola); await play(bola, 'e7e5', ada);
  await act(ada, 'table-move', { n: ada.state.n, move: { t: 'offer-draw' } }, bola);
  await act(bola, 'table-move', { n: bola.state.n, move: { t: 'accept-draw' } }, ada);
  assert.equal(ada.state.table.status, 'over');
  assert.deepEqual([ada.state.result?.mine?.draw, ada.state.result?.mine?.stake?.outcome], [true, 'refunded']);
  assert.deepEqual(await cash(ada, bola), [CASH, CASH]);
  assert.deepEqual([await staked(ada), await staked(bola)], [0, 0], 'a stake that came back counts for nothing against the allowance');
  assert.deepEqual(await lines(ada), ['Table stake: Chess with Bola -1000', 'Table stake returned: Chess with Bola 1000']);
  assert.deepEqual(await pots(), {});
});

test('stakes: a game called off before any move refunds both and gives the day’s limit back', async (t) => {
  const { act, player, open, cash, stakeBook, pots } = await harness(t);
  const ada = await player('Ada'), bola = await player('Bola');
  await open(ada, bola, 2000);
  assert.deepEqual((await stakeBook())?.players && Object.values((await stakeBook())?.players ?? {}), [2000, 2000]);
  // Bola resigns before anyone has moved: nothing was played, so nothing is lost.
  await act(bola, 'table-move', { n: bola.state.n, move: { t: 'resign' } }, ada);
  assert.deepEqual([ada.state.table.status, ada.state.result?.calledOff, ada.state.result?.mine?.stake], ['over', true, { amount: 2000, pot: 4000, outcome: 'refunded' }]);
  assert.deepEqual(await cash(ada, bola), [CASH, CASH]);
  assert.deepEqual(Object.values((await stakeBook())?.players ?? {}), [0, 0], 'a stake that never played does not use up the day’s limit');
  assert.deepEqual(await pots(), {});
});

test('stakes: a player who leaves after play began has lost, as at any table', async (t) => {
  const { act, play, player, open, cash, staked } = await harness(t);
  const ada = await player('Ada'), bola = await player('Bola');
  await open(ada, bola, 500);
  await play(ada, 'e2e4', bola); await play(bola, 'e7e5', ada);
  await act(bola, 'table-leave', {}, ada);
  assert.deepEqual([ada.state.table.status, ada.state.result?.winners, ada.state.result?.calledOff, ada.state.result?.mine?.stake?.outcome], ['over', [0], false, 'won']);
  assert.deepEqual(await cash(ada, bola), [CASH + 500, CASH - 500]);
  assert.deepEqual([await staked(ada), await staked(bola)], [0, 500]);
  // The one who left does not get to leave again for a refund.
  await act(bola, 'table-leave', {}, ada);
  assert.deepEqual(await cash(ada, bola), [CASH + 500, CASH - 500]);
});

test('stakes: a table is for two, the stake is chosen by the first to sit, and nothing changes once two have sat', async (t) => {
  const { act, send, all, player, last, cash } = await harness(t);
  const ada = await player('Ada'), bola = await player('Bola'), chidi = await player('Chidi');
  // The choices are the owner's: free, 100, 500, 1,000 and 2,000; nothing else, and only by the first to sit.
  await act(ada, 'table-stake', { stake: 500 });
  assert.equal(last(ada), 'not_host', 'nobody has sat yet');
  await act(ada, 'table-sit', {});
  for (const stake of [3000, 250, -100, 2001, '500', null]) { const before = ada.errors.length; await act(ada, 'table-stake', { stake }); assert.equal(ada.errors.length, before + 1, String(stake)); assert.equal(ada.errors.at(-1)?.code, 'invalid_stake'); }
  assert.deepEqual(ada.state.stakes.choices.map((choice) => [choice.amount, choice.why]), [[100, null], [500, null], [1000, null], [2000, null]], 'the host is shown what she may pick');
  await act(bola, 'table-watch', {}, ada);
  assert.deepEqual(bola.state.stakes.choices, [], 'a watcher is not offered the picker');
  await act(bola, 'table-stake', { stake: 100 });
  assert.equal(last(bola), 'not_host');
  await act(ada, 'table-stake', { stake: 500 }, bola);
  assert.deepEqual([ada.state.table.stake, bola.state.table.stake, bola.state.stakes.pot, bola.state.stakes.why, bola.state.table.max], [500, 500, 1000, null, 2]);
  // A player who saw another stake (or none) is refused, and so is one who names no stake at all.
  await act(bola, 'table-sit', {});
  assert.equal(last(bola), 'stake_changed');
  await act(bola, 'table-sit', { stake: 100 });
  assert.equal(last(bola), 'stake_changed');
  assert.equal(bola.state.you, null);
  await act(bola, 'table-sit', { stake: 500 }, ada);
  assert.deepEqual([bola.state.you, ada.state.table.seats.length], [1, 2]);
  // Now both have sat: the stake, the rules and the seats are fixed.
  await act(ada, 'table-stake', { stake: 100 }, bola);
  assert.equal(last(ada), 'stake_locked');
  await act(ada, 'table-options', { options: { colour: 'black' } });
  assert.equal(last(ada), 'stake_locked');
  await act(chidi, 'table-sit', { stake: 500 });
  assert.equal(last(chidi), 'table_full', 'a staked table is for two');
  // The same stake name twice, or the start sent twice at the same moment (both players press Start), takes the stakes once.
  send(ada, 'table-start'); send(bola, 'table-start'); send(ada, 'table-start');
  await all(ada, bola);
  assert.deepEqual([ada.state.table.status, await cash(ada, bola)], ['playing', [CASH - 500, CASH - 500]]);
  assert.equal([ada, bola].flatMap((peer) => peer.errors.map((error) => error.code)).filter((code) => code === 'game_on').length, 2, 'the other two Starts were refused');
  await act(ada, 'table-stake', { stake: 0 });
  assert.equal(last(ada), 'game_on');
});

test('stakes: never against a bot, never fewer than two, never on the Phone, never a game of chance', async (t) => {
  const { act, player, last, cash } = await harness(t);
  const ada = await player('Ada');
  await act(ada, 'table-sit', {});
  await act(ada, 'table-stake', { stake: 500 });
  await act(ada, 'table-start', { bots: 1 });
  assert.equal(last(ada), 'stake_needs_players');
  await act(ada, 'table-start', {});
  assert.equal(last(ada), 'need_players', 'one player cannot start a staked game');
  assert.deepEqual([ada.state.table.status, ada.state.table.seats.length, await cash(ada)], ['open', 1, [CASH]]);
  // A Phone table is the computer's: nothing can be staked there.
  await act(ada, 'table-leave', {});
  await act(ada, 'table-sit', { table: 'phone-chess' });
  await act(ada, 'table-stake', { table: 'phone-chess', stake: 500 });
  assert.equal(last(ada), 'no_stake_here');
  assert.match(ada.errors.at(-1)?.reason ?? '', /against the computer/);
  assert.deepEqual(ada.state.stakes.allowed, false);
  assert.deepEqual(TABLE_STAKES.games, ['whot', 'ayo', 'chess', 'penalty', 'weave'], 'only skill games may ever be staked: this list is the whole of it');
});

test('stakes: Whot at a four-seat table is staked between two players, and Ayo and penalties can be too', async (t) => {
  const { act, player, cash, all } = await harness(t);
  const ada = await player('Ada'), bola = await player('Bola'), chidi = await player('Chidi');
  for (const [table, game] of [['park-bench', 'whot'], ['park-ayo', 'ayo'], ['park-goal', 'penalty']] as const) {
    await act(ada, 'table-sit', { table }); await act(ada, 'table-stake', { table, stake: 100 }, bola);
    await act(bola, 'table-sit', { table, stake: 100 }, ada);
    if (game === 'whot') { await act(chidi, 'table-sit', { table, stake: 100 }, ada); assert.equal(chidi.errors.at(-1)?.code, 'table_full', 'two seats, though the bench has four'); }
    await act(ada, 'table-start', { table }, bola);
    assert.deepEqual([ada.state.table.game, ada.state.table.status, ada.state.table.stake], [game, 'playing', 100]);
    await act(bola, 'table-leave', { table }, ada); // nobody moved: called off, refunded
    await act(ada, 'table-leave', { table }, bola);
    await all(ada, bola);
    assert.deepEqual(await cash(ada, bola), [CASH, CASH], game);
  }
});

test('stakes: the limits — per game, per pair per day, per player per day', async (t) => {
  const { f, act, edit, player, last, open, cash, clear, stakeBook, play } = await harness(t);
  const ada = await player('Ada'), bola = await player('Bola'), chidi = await player('Chidi'), dayo = await player('Dayo');
  const day = lagosTime(f.now()).day;
  const key = (a: Peer, b: Peer) => [a.who.id, b.who.id].sort().join('|');
  type Peer = typeof ada;
  // Pair: ₦5,000 a day between the same two players. Two games of ₦2,000 have been played; a third ₦2,000 would be ₦6,000.
  await f.server.store.transact((db) => { const g = db.growth; assert.ok(g); g.tables.stakes = { day, players: { [ada.who.id]: 4000, [bola.who.id]: 4000 }, pairs: { [key(ada, bola)]: 4000 } }; });
  await act(ada, 'table-sit', {}); await act(ada, 'table-stake', { stake: 2000 }, bola);
  await act(bola, 'table-sit', { stake: 2000 }, ada);
  assert.equal(last(bola), 'pair_day_cap');
  assert.match(bola.errors.at(-1)?.reason ?? '', /midnight/);
  await clear(ada);
  await act(ada, 'table-sit', {}); await act(ada, 'table-stake', { stake: 500 }, bola); // ₦4,500: still within the pair's ₦5,000
  await act(bola, 'table-sit', { stake: 500 }, ada);
  assert.equal(bola.state.you, 1);
  await act(ada, 'table-start', {}, bola);
  assert.deepEqual([ada.state.table.status, (await stakeBook())?.pairs[key(ada, bola)]], ['playing', 4500]);
  await act(bola, 'table-move', { n: bola.state.n, move: { t: 'resign' } }, ada); // called off: the ₦500 comes back to the limit
  assert.equal((await stakeBook())?.pairs[key(ada, bola)], 4000);
  await clear(ada, bola);
  // A different partner is a different pair; but Ada's own day is ₦10,000 in all.
  await f.server.store.transact((db) => { const g = db.growth; assert.ok(g?.tables.stakes); g.tables.stakes.players[ada.who.id] = 9000; });
  await act(ada, 'table-sit', {}); await act(ada, 'table-stake', { stake: 2000 }, chidi);
  assert.equal(last(ada), 'player_day_cap', 'the host cannot even pick a stake that would take their day past the limit');
  assert.match(ada.errors.at(-1)?.reason ?? '', /₦1,000 is left today/);
  assert.deepEqual(ada.state.stakes.choices.map((choice) => [choice.amount, choice.why === null]), [[100, true], [500, true], [1000, true], [2000, false]]);
  await act(ada, 'table-leave', {}, chidi);
  // The same check is made again when the game starts, on the settled lives; the opponent is told only that the other player cannot, not why.
  await act(chidi, 'table-sit', {}); await act(chidi, 'table-stake', { stake: 500 }, ada);
  await act(ada, 'table-sit', { stake: 500 }, chidi);
  await f.server.store.transact((db) => { const g = db.growth; assert.ok(g?.tables.stakes); g.tables.stakes.players[ada.who.id] = 9800; });
  await act(chidi, 'table-start', {}, ada);
  assert.deepEqual([last(chidi), chidi.errors.at(-1)?.reason], ['player_day_cap', 'Ada cannot play for a stake right now.']);
  // The next Lagos day starts clean.
  await act(ada, 'table-leave', {}, chidi); await act(chidi, 'table-leave', {}, ada);
  f.advance(86400000);
  await edit(ada, (state) => { state.needs.hunger = 100; });
  await open(dayo, ada, 2000);
  assert.equal(dayo.state.table.status, 'playing');
  await play(dayo, 'e2e4', ada);
});

test('stakes: the gift allowance — worked-for money only, a lost stake counts against it, and a new player must have worked first', async (t) => {
  const { act, edit, player, last, open, clear, cash, staked, life, play } = await harness(t);
  const ada = await player('Ada', { earned: 1500 }), bola = await player('Bola', { earned: 500 }), chidi = await player('Chidi');
  // Bola has worked for ₦500: less than the ₦1,000 that opens gifts and shop purchases, so the table says so.
  await act(ada, 'table-sit', {});
  await act(bola, 'table-watch', {}, ada);
  await act(ada, 'table-stake', { stake: 500 }, bola);
  assert.equal(ada.state.table.stake, 500);
  await act(bola, 'table-sit', { stake: 500 }, ada);
  assert.equal(last(bola), 'work_first');
  assert.match(bola.errors.at(-1)?.reason ?? '', /worked for ₦1,000 \(you have worked for ₦500\)/);
  assert.equal(bola.state.stakes.code, 'work_first', 'and the table shows the same to a player who has not sat');
  // Ada has worked for ₦1,500 but gave ₦1,000 away: ₦500 is left to play for, and ₦1,000 is not.
  await edit(ada, (state) => { state.social.transfer.total = 1000; });
  await act(ada, 'table-leave', {}, bola);
  await act(ada, 'table-sit', {});
  await act(ada, 'table-watch', {}, bola);
  assert.deepEqual(ada.state.stakes.choices.map((choice) => [choice.amount, choice.why === null]), [[100, true], [500, true], [1000, false], [2000, false]]);
  await act(ada, 'table-stake', { stake: 1000 });
  assert.equal(last(ada), 'stake_exceeds_work');
  assert.match(ada.errors.at(-1)?.reason ?? '', /You can still stake ₦500/);
  // Spending at a player's shop is the same allowance (business.spent); so is a stake already on a table.
  await edit(ada, (state) => { state.business.spent = 400; });
  await act(ada, 'table-stake', { stake: 500 });
  assert.equal(last(ada), 'stake_exceeds_work');
  await act(ada, 'table-stake', { stake: 100 });
  assert.equal(ada.state.table.stake, 100);
  await edit(ada, (state) => { state.business.spent = 0; });
  await act(ada, 'table-leave', {}, bola);
  // A lost stake stays counted, like shop spending: Ada works for ₦1,500 in all, so after losing ₦500 only ₦1,000 is left, then ₦500.
  await edit(ada, (state) => { state.social.transfer.total = 0; });
  await open(chidi, ada, 500);
  await play(chidi, 'e2e4', ada); await act(ada, 'table-move', { n: ada.state.n, move: { t: 'resign' } }, chidi);
  assert.deepEqual([chidi.state.result?.mine?.stake?.outcome, await staked(ada), await staked(chidi)], ['won', 500, 0]);
  const afterLoss = await life(ada.who);
  assert.deepEqual([afterLoss.social.earned, afterLoss.growth.tables.staked, afterLoss.cash], [1500, 500, CASH - 500]);
  await clear(chidi, ada);
  await act(ada, 'table-sit', {}); await act(ada, 'table-watch', {});
  assert.deepEqual(ada.state.stakes.choices.map((choice) => [choice.amount, choice.why === null]), [[100, true], [500, true], [1000, true], [2000, false]], 'ₓ ₦1,000 of work is still free to play for');
  await edit(ada, (state) => { state.growth.tables.staked = 1500; });
  await act(ada, 'table-stake', { stake: 100 });
  assert.equal(last(ada), 'stake_exceeds_work', 'nothing left to play for: work another shift');
  assert.match(ada.errors.at(-1)?.reason ?? '', /Work a shift/);
  // The money must be there too.
  await edit(ada, (state) => { state.growth.tables.staked = 0; state.cash = 50; });
  await act(ada, 'table-stake', { stake: 100 });
  assert.equal(last(ada), 'insufficient_funds');
});

test('stakes: only players who said they are 18 or older may play for a stake; free tables stay open to everyone', async (t) => {
  const { act, post, player, last, cash } = await harness(t);
  const ada = await player('Ada'), kid = await player('Kemi', { adult: false }), teen = await player('Tobi', { adult: false });
  assert.equal((await post('/api/growth/consent', { cityId: 'lagos', age: 'minor' }, teen.who)).status, 200);
  // Nobody has answered for Kemi: not knowing is not being an adult.
  await act(kid, 'table-sit', {});
  await act(kid, 'table-stake', { stake: 100 });
  assert.equal(last(kid), 'adults_only');
  assert.match(kid.errors.at(-1)?.reason ?? '', /18 or older/);
  assert.match(kid.errors.at(-1)?.reason ?? '', /Free games are open to everyone/);
  assert.equal(kid.state.stakes.choices.every((choice) => choice.why !== null), true, 'the picker says why for every stake');
  // Free tables are open to them: Kemi sits and plays with Ada at no stake.
  await act(kid, 'table-leave', {});
  await act(ada, 'table-sit', {}); await act(ada, 'table-stake', { stake: 500 }, kid);
  await act(kid, 'table-sit', { stake: 500 }, ada);
  assert.deepEqual([last(kid), kid.errors.at(-1)?.reason?.includes('18')], ['adults_only', true]);
  await act(teen, 'table-sit', { stake: 500 }, ada);
  assert.equal(last(teen), 'adults_only', 'a player who said they are under 18 is refused the same way');
  await act(ada, 'table-stake', { stake: 0 }, kid);
  await act(kid, 'table-sit', {}, ada);
  assert.deepEqual([kid.state.you, kid.state.table.stake], [1, 0]);
  await act(ada, 'table-start', {}, kid);
  assert.deepEqual([ada.state.table.status, await cash(ada, kid)], ['playing', [CASH, CASH]]);
});

test('stakes: players who blocked each other, or share a device, cannot stake against each other', async (t) => {
  const { f, act, post, player, last, cash, stakeBook } = await harness(t);
  const ada = await player('Ada'), bola = await player('Bola'), chidi = await player('Chidi');
  // A shared device (the growth module's salted hashes): refused when sitting, and when starting if it was learned in between.
  await act(ada, 'table-sit', {}); await act(ada, 'table-stake', { stake: 500 }, bola);
  for (const who of [ada.who, bola.who]) assert.equal((await post('/api/growth/hello', { cityId: 'lagos', device: 'device-0000-0000-0001' }, who)).status, 200);
  await act(bola, 'table-sit', { stake: 500 }, ada);
  assert.deepEqual([last(bola), bola.errors.at(-1)?.reason], ['stake_refused', 'You cannot play for a stake against this player.']);
  // A free game between the same two is fine.
  await act(ada, 'table-stake', { stake: 0 }, bola);
  await act(bola, 'table-sit', {}, ada);
  assert.equal(bola.state.you, 1);
  await act(ada, 'table-leave', {}, bola); await act(bola, 'table-leave', {}, ada);
  // A block made after both have sat still stops the start, and nothing is taken.
  await act(chidi, 'table-sit', {}); await act(chidi, 'table-stake', { stake: 500 }, ada);
  await act(ada, 'table-sit', { stake: 500 }, chidi);
  assert.equal(ada.state.you, 1, 'the shared device is Ada’s and Bola’s, not Chidi’s: Ada may sit with him');
  for (const peer of [ada, chidi]) await f.request('/api/social/me', null, peer.who.cookie); // players are known to the social service once they have looked
  assert.equal((await post<{ ok: boolean }>('/api/social/block', { id: ada.who.id, cityId: 'lagos' }, chidi.who)).ok, true);
  await act(chidi, 'table-start', {}, ada);
  assert.equal(last(chidi), 'stake_refused');
  assert.deepEqual([chidi.state.table.status, await cash(ada, chidi), await stakeBook()], ['open', [CASH, CASH], null]);
});

test('stakes: a player cannot call the stake action, and a stake that fails halfway takes nothing from either', async (t) => {
  const { f, act, player, cash, edit, pots, last } = await harness(t);
  const ada = await player('Ada'), bola = await player('Bola');
  for (const payload of [{ op: 'pot', amount: 99999, stake: 0 }, { op: 'refund', amount: 50000 }, { op: 'stake', amount: 100 }]) {
    const answer = await f.action(ada.who.cookie, { type: 'tables.server', payload });
    assert.equal(answer.code, 'server_only', JSON.stringify(payload));
  }
  assert.deepEqual(await cash(ada, bola), [CASH, CASH]);
  // Bola's money goes between the check at the table and the start (a purchase elsewhere): the start is refused, and Ada keeps hers.
  await act(ada, 'table-sit', {}); await act(ada, 'table-stake', { stake: 500 }, bola);
  await act(bola, 'table-sit', { stake: 500 }, ada);
  await edit(bola, (state) => { state.cash = 100; });
  await act(ada, 'table-start', {}, bola);
  assert.deepEqual([last(ada), ada.errors.at(-1)?.reason], ['insufficient_funds', 'Bola cannot play for a stake right now.']);
  assert.deepEqual([await cash(ada, bola), await pots(), (await f.server.store.read((db) => db.growth?.tables?.stakes ?? null))], [[CASH, 100], {}, null], 'nothing was taken, nothing is held, no limit was used');
  await edit(bola, (state) => { state.cash = CASH; });
  await act(ada, 'table-start', {}, bola);
  assert.equal(ada.state.table.status, 'playing');
});

test('stakes: a restart in the middle of a game returns both stakes once, and a game that is over is not paid twice', async (t) => {
  const { f, player, open, cash, pots } = await harness(t);
  const ada = await player('Ada'), bola = await player('Bola');
  await open(ada, bola, 1000);
  assert.deepEqual(await cash(ada, bola), [CASH - 1000, CASH - 1000]);
  assert.equal(Object.keys(await pots()).length, 1);
  // The process stops with the game on. The pot is in the saved record; the game is not in anyone's memory.
  await f.flush();
  ada.ws.terminate(); bola.ws.terminate();
  f.server.closeAllConnections(); await new Promise((resolve) => f.server.close(resolve));
  const again = await createServer({ dataDir: f.dir, now: f.now, sessionTtlMs: 2592000000 });
  again.listen(0, '127.0.0.1'); await once(again, 'listening');
  t.after(async () => { again.closeAllConnections(); await new Promise((resolve) => again.close(resolve)); await again.store.close?.().catch(() => {}); });
  const call = async (who: Device, path: string): Promise<{ state: LifeState }> => (await fetch(`http://127.0.0.1:${(again.address() as AddressInfo).port}${path}`, { headers: { Cookie: who.cookie } })).json() as Promise<{ state: LifeState }>;
  const ledger = async (who: Device) => (await call(who, '/api/life?city=lagos')).state;
  const [a, b] = [await ledger(ada.who), await ledger(bola.who)];
  assert.deepEqual([a.cash, b.cash, a.growth.tables.staked, b.growth.tables.staked], [CASH, CASH, 0, 0], 'both stakes came back at start-up, and nothing is counted against the allowance');
  assert.deepEqual([a.ledger.map((line) => line.reason), b.ledger.map((line) => line.reason)], [['Table stake: Chess with Bola', 'Table stake returned: Chess with Bola'], ['Table stake: Chess with Ada', 'Table stake returned: Chess with Ada']]);
  assert.deepEqual(await again.store.read((db) => db.growth?.tables?.pots ?? {}), {}, 'the pot is gone with its refund');
  // Starting up again finds nothing to return: not paid twice.
  again.beat();
  await new Promise((done) => setTimeout(done, 50));
  assert.deepEqual([(await ledger(ada.who)).cash, (await ledger(bola.who)).cash], [CASH, CASH]);
});

test('stakes: every sentence a stake makes avoids the words of a betting site, and says what it is', async (t) => {
  const { act, player } = await harness(t);
  const ada = await player('Ada', { earned: 0 }), kid = await player('Kemi', { adult: false });
  const words: string[] = [];
  await act(ada, 'table-sit', {});
  words.push(...ada.state.stakes.choices.map((choice) => choice.why ?? ''));
  await act(kid, 'table-sit', {}); await act(kid, 'table-stake', { stake: 100 });
  words.push(kid.errors.at(-1)?.reason ?? '', ...kid.state.stakes.choices.map((choice) => choice.why ?? ''));
  await act(kid, 'table-stake', { table: 'phone-chess', stake: 100 });
  words.push(kid.errors.at(-1)?.reason ?? '');
  assert.ok(words.filter(Boolean).length >= 5);
  for (const text of words) assert.equal(FORBIDDEN_WORDS.test(text), false, text);
});
