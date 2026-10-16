import { loadCityContent as preloadCityContent } from '../../src/game/cities/registry.ts';
await preloadCityContent('lagos');
// The agent arena against a real server on a fake clock (docs/AGENT-ARENA.md): a week of a game cup played by four people's agents through their
// keys, settled on the heartbeat with prizes in game money within the limits, a badge and a card for the winner's owner, a gist line and the
// standings on the Agent league page; who may enter; a life cup measured from the game's own records.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lagosTime } from '../../src/game/clock.ts';
import { world, HOUR } from '../agents/test-world.ts';
import type { Json, Owner, World } from '../agents/test-world.ts';
import { ARENA, COLLECTION, weekOf } from './book.ts';
import type { ArenaBook } from './book.ts';

const DAY = 24 * HOUR;
const text = (value: unknown): string => JSON.stringify(value);
const bookOf = (w: World): Promise<ArenaBook> => w.stored((db) => JSON.parse(text((db as Record<string, unknown>)[COLLECTION] ?? null)) as ArenaBook);
/** Move the fake clock to `day` (0 = Monday) of the next Lagos week, at `hour`. */
function toNextWeek(w: World, day = 0, hour = 1): number {
  const week = weekOf(lagosTime(w.f.now()).week + 1);
  w.f.advance(week.start + day * DAY + hour * HOUR - w.f.now());
  return week.week;
}
/** Move the clock forward to `day`, `hour` of the week `week`. */
function toDay(w: World, week: number, day: number, hour = 0): void {
  const at = weekOf(week).start + day * DAY + hour * HOUR;
  if (at > w.f.now()) w.f.advance(at - w.f.now());
}
/** A person with an agent character of its own, claimed by them (made in Settings), and its key. */
async function agentOwner(w: World, subject: string, name: string, agent: string): Promise<{ owner: Owner; key: string; id: string }> {
  const owner = await w.owner(subject, name);
  const made = await w.makeAgentKey(owner, { mode: 'agent', name: 'arena', characterName: agent });
  assert.equal(made.status, 200, text(made));
  await w.tool(made.key, 'get_my_life');
  const id = await w.stored((db) => Object.values(db.sessions).find((s) => s.name === agent)?.publicId ?? '');
  assert.ok(id);
  return { owner, key: made.key, id };
}
/** Play a fight: `hitter` walks at the other and punches, `idler` stands still. Returns the final view. */
async function fight(w: World, match: string, hitter: string, idler: string): Promise<Json> {
  let view: Json = {};
  for (let i = 0; i < 200; i++) {
    // A tenth of a second of the fake clock a window, so the agents' shared call rate (AGENT_RATE) refills as it would.
    w.f.advance(100);
    const look = await w.tool(hitter, 'tournament_match', { match });
    assert.equal(look.ok, true, text(look.data));
    view = look.data;
    if (view.status === 'done') return view;
    const reading = view.reading as { you: { x: number }; them: { x: number }; apart: number };
    const towards = reading.them.x > reading.you.x ? 'right' : 'left';
    const plan = reading.apart > 70 ? [[towards], [towards, 'punch'], [towards], [towards, 'punch']] : [['punch'], [], ['punch'], []];
    const sent = await w.tool(hitter, 'tournament_move', { match, plan });
    assert.equal(sent.ok, true, text(sent.rpc));
    const idle = await w.tool(idler, 'tournament_move', { match, plan: [] });
    if (!idle.ok && idle.data.code === 'match_over') continue;
    assert.equal(idle.ok, true, text(idle.data));
    view = idle.data;
    if (view.status === 'done') return view;
  }
  return view;
}

test('a game cup: four people\'s agents enter, play through their keys, and the heartbeat settles the week with prizes within the limits', async (t) => {
  const w = await world(t);
  const ada = await agentOwner(w, 'Ada1', 'Ada', 'Robo Ada'), ben = await agentOwner(w, 'Ben1', 'Ben', 'Robo Ben'), cy = await agentOwner(w, 'Cy1', 'Cyra', 'Robo Cy'), dee = await agentOwner(w, 'Dee1', 'Dele', 'Robo Dee');
  const week = toNextWeek(w, 0, 1);
  const cups = await w.tool(ada.key, 'tournament_cups');
  assert.equal(cups.ok, true, text(cups.data));
  assert.ok((cups.data.cups as Json[]).some((c) => c.key === 'fight' && c.open === true));
  for (const a of [ada, ben, cy, dee]) { const entered = await w.tool(a.key, 'tournament_enter', { cup: 'fight' }); assert.equal(entered.ok, true, text(entered.data)); }
  assert.equal((await w.tool(ada.key, 'tournament_enter', { cup: 'fight' })).data.code, 'already_in');

  // Wednesday: the entries closed, round one opens. Ada's agent plays the agents it meets; the others meet nobody but Ada's.
  toDay(w, week, 2, 0);
  const rounds = new Set<number>();
  for (let round = 0; round < 3; round++) {
    const mine = ((await w.tool(ada.key, 'tournament_cups')).data.matches as Json[]).filter((m) => m.status !== 'done');
    assert.equal(mine.length, 1, `round ${round + 1}: one open match for Ada's agent, ${text(mine)}`);
    const match = String(mine[0]?.match), against = (mine[0]?.against as { name: string; ai: boolean });
    assert.equal(against.ai, true);
    const other = [ben, cy, dee].find((a) => against.name === `Robo ${a === ben ? 'Ben' : a === cy ? 'Cy' : 'Dee'}`);
    assert.ok(other, against.name);
    const done = await fight(w, match, ada.key, other.key);
    assert.equal(done.status, 'done', text(done));
    assert.equal((done.result as { winner: number }).winner, (done.players as { name: string }[]).findIndex((p) => p.name === 'Robo Ada'), text(done.result));
    assert.ok(!['no_show', 'no_answer', 'deadline', 'time'].includes(String((done.result as { reason: string }).reason)), `won by fighting: ${text(done.result)}`);
    rounds.add(Number(done.round));
    // On to the next round.
    const cup = (await bookOf(w)).cups[`w${week}-fight`];
    const next = cup?.rounds?.[round + 1];
    if (next) w.f.advance(Math.max(0, next.start - w.f.now()) + 60000);
  }
  assert.deepEqual([...rounds].sort(), [1, 2, 3]);

  // Sunday 00:00: only the heartbeat runs (no request), and it settles the cup and pays the prizes.
  const before = await w.stored((db) => Object.values(db.sessions).find((s) => s.publicId === ada.id)?.cities?.lagos?.state?.cash ?? 0);
  toDay(w, week, 6, 0);
  w.f.advance(1000);
  for (let i = 0; i < 100; i++) {
    w.f.server.beat();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const book = await bookOf(w);
    if (book.cups[`w${week}-fight`]?.status === 'settled' && Object.values(book.prizes).every((p) => p.paid)) break;
  }
  const book = await bookOf(w), cup = book.cups[`w${week}-fight`];
  assert.equal(cup?.status, 'settled', text(cup));
  assert.equal(cup?.format, 'roundrobin');
  assert.deepEqual(cup?.results?.map((r) => [r.name, r.rank]).slice(0, 1), [['Robo Ada', 1]]);
  const paid = Object.values(book.prizes);
  assert.ok(paid.length >= 1 && paid.every((p) => p.paid), text(paid));
  for (const p of paid) assert.ok(p.amount <= Math.max(...ARENA.prizes) && p.amount <= ARENA.weeklyPrizeCeiling);
  assert.equal(paid.find((p) => p.char === ada.id)?.amount, ARENA.prizes[0]);
  const after = await w.stored((db) => Object.values(db.sessions).find((s) => s.publicId === ada.id)?.cities?.lagos?.state);
  assert.equal(after?.cash, before + (ARENA.prizes[0] ?? 0), 'the prize went to the agent\'s character, once');
  assert.ok(after?.ledger?.some((line) => /^Agent cup prize: Fight cup, week \d+$/.test(line.reason)), text(after?.ledger?.slice(-3)));
  // Beating again pays nothing twice.
  w.f.server.beat(); await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(await w.stored((db) => Object.values(db.sessions).find((s) => s.publicId === ada.id)?.cities?.lagos?.state?.cash), after?.cash);

  // The owner's badge and card; the gist line; the league page.
  const mine = await w.json('/api/agents/arena', undefined, ada.owner.cookie) as unknown as Json & { badges: Json[]; prizes: Json[] };
  assert.equal(mine.badges[0]?.label, 'Fight cup');
  assert.equal(mine.badges[0]?.rank, 1);
  const card = await (await fetch(`${w.f.base}${String(mine.badges[0]?.card)}`)).text();
  assert.match(card, /<title>Robo Ada \(AI\) won the Fight cup for agents<\/title>/);
  assert.match(card, /Robo Ada <span class="tag">AI<\/span>/);
  assert.ok(!/<script/i.test(card));
  const gist = await w.stored((db) => JSON.parse(text((db as Record<string, unknown>).gist ?? {})) as { cities?: Record<string, { text: string }[]> });
  assert.ok(gist.cities?.world?.some((item) => item.text === 'Robo Ada (AI) won this week\'s agent Fight cup.'), text(gist.cities?.world));
  const league = await (await fetch(`${w.f.base}/agents/league`)).text();
  assert.match(league, /Latest winners/);
  assert.match(league, /Fight cup, week \d+<\/a>: Robo Ada <span class="tag">AI<\/span> \(prize ₦2,000 in game money\)/);
  assert.match(league, /Agents playing now/);
});

test('who may enter: an agent character claimed by a person, one for each person, before entries close; fewer than four people pay no prize', async (t) => {
  const w = await world(t);
  const ada = await agentOwner(w, 'Ada1', 'Ada', 'Robo Ada');
  const second = await w.makeAgentKey(ada.owner, { mode: 'agent', name: 'two', characterName: 'Robo Two' });
  assert.equal(second.status, 200, text(second));
  const own = await w.makeAgentKey(ada.owner, { mode: 'own', name: 'mine' });
  const ben = await agentOwner(w, 'Ben1', 'Ben', 'Robo Ben');
  const self = await w.signup('Robo Self');
  const week = toNextWeek(w, 0, 1);
  assert.equal((await w.tool(ada.key, 'tournament_enter', { cup: 'chess' })).ok, true);
  assert.equal((await w.tool(second.key, 'tournament_enter', { cup: 'chess' })).data.code, 'one_per_owner');
  assert.equal((await w.tool(own.key, 'tournament_enter', { cup: 'chess' })).data.code, 'not_an_agent');
  assert.equal((await w.tool(self.key, 'tournament_enter', { cup: 'chess' })).data.code, 'claim_first');
  assert.equal((await w.tool(ada.key, 'tournament_enter', { cup: 'tennis' })).data.code, 'unknown_cup');
  assert.equal((await w.tool(ben.key, 'tournament_enter', { cup: 'chess' })).ok, true);
  // A person enters their own agent from Settings, and cannot enter somebody else's.
  const viaSettings = await w.post('/api/agents/arena/enter', { agent: ben.id, cup: 'life-missions' }, ben.owner.cookie);
  assert.equal(viaSettings.code, 'entered', text(viaSettings));
  const notMine = await w.post('/api/agents/arena/enter', { agent: ben.id, cup: 'whot' }, ada.owner.cookie);
  assert.deepEqual([notMine.status, notMine.error], [404, 'unknown_agent']);
  // An agent character its person removes leaves the cups it is in.
  const cy = await agentOwner(w, 'Cy1', 'Cyra', 'Robo Cy');
  assert.equal((await w.tool(cy.key, 'tournament_enter', { cup: 'whot' })).ok, true);
  assert.equal((await w.post(`/api/agents/characters/${cy.id}/remove`, {}, cy.owner.cookie)).code, 'removed');
  assert.deepEqual((await bookOf(w)).cups[`w${week}-whot`]?.entrants, []);
  toDay(w, week, 2, 1);
  const late = await w.tool(ada.key, 'tournament_enter', { cup: 'whot' });
  assert.equal(late.data.code, 'entries_closed');
  assert.match(String(late.data.result), /closed on Tuesday night/);
  // Nobody plays: every match is a draw by no-show, and with two people entered nothing is paid and no badge is given.
  toDay(w, week, 6, 1);
  await w.tool(ada.key, 'tournament_cups');
  const cup = (await bookOf(w)).cups[`w${week}-chess`];
  assert.equal(cup?.status, 'settled');
  assert.match(String(cup?.note), /Fewer than 4 people entered/);
  assert.ok(cup?.results?.every((r) => r.prize === 0));
  assert.deepEqual((await bookOf(w)).badges, {}, 'an agent that never played wins nothing');
});

test('a life cup is measured from the game\'s records: missions collected after entering count, a friend counts only when a real person on another account', async (t) => {
  const w = await world(t);
  const ada = await agentOwner(w, 'Ada1', 'Ada', 'Robo Ada'), ben = await agentOwner(w, 'Ben1', 'Ben', 'Robo Ben');
  const pal = await w.owner('Pal1', 'Pal');
  const week = toNextWeek(w, 0, 1);
  const bump = (id: string, by: number) => w.change((db) => { const s = Object.values(db.sessions).find((x) => x.publicId === id); const m = s?.cities?.lagos?.state?.missions; if (m) m.claimed += by; });
  await bump(ada.id, 5);
  for (const a of [ada, ben]) { assert.equal((await w.tool(a.key, 'tournament_enter', { cup: 'life-missions' })).ok, true); assert.equal((await w.tool(a.key, 'tournament_enter', { cup: 'life-friends' })).ok, true); }
  await bump(ada.id, 2); await bump(ben.id, 3);
  // Friends: Pal (a real person, a different account, more than a day old) befriends both agents; Ada's own character and the other agent do not count.
  await w.change((db) => {
    const players = (db.social as unknown as { players: Record<string, { friends: Record<string, number> }> }).players;
    const at = w.f.now();
    (players[ada.id] ??= { friends: {} } as never).friends = { [pal.id]: at, [ada.owner.id]: at, [ben.id]: at };
    (players[ben.id] ??= { friends: {} } as never).friends = { [pal.id]: at - 30 * DAY };
  });
  const live = await w.json(`/api/agents/arena/cup/w${week}-life-missions`) as unknown as Json & { cup: { scores: { name: string; score: number }[] } };
  assert.deepEqual(live.cup.scores.map((s) => [s.name, s.score]), [['Robo Ben', 3], ['Robo Ada', 2]], 'only what happened after entering counts');
  const friends = await w.json(`/api/agents/arena/cup/w${week}-life-friends`) as unknown as Json & { cup: { scores: { name: string; score: number }[] } };
  assert.deepEqual(friends.cup.scores.map((s) => [s.name, s.score]), [['Robo Ada', 1], ['Robo Ben', 0]], 'one real person; the owner, another agent and a friendship from before do not count');
  // The last reading before the end (the heartbeat takes one every ten minutes while a life cup runs), then the end passes unattended for an hour.
  toDay(w, week, 6, 23);
  await w.tool(ada.key, 'tournament_cups');
  toDay(w, week, 7, 1);
  await bump(ada.id, 10);
  await w.tool(ada.key, 'tournament_cups');
  const book = await bookOf(w);
  assert.equal(book.cups[`w${week}-life-missions`]?.status, 'settled');
  assert.deepEqual(book.cups[`w${week}-life-missions`]?.results?.map((r) => [r.name, r.score, r.prize]), [['Robo Ben', 3, 0], ['Robo Ada', 2, 0]]);
  assert.equal(book.badges[ben.id]?.[0]?.label, 'Most missions done cup');
  const page = await (await fetch(`${w.f.base}/agents/cup/w${week}-life-missions`)).text();
  assert.match(page, /Robo Ben \(AI\) won the Most missions done cup for agents/);
});

test('seven agents play a knockout seeded by rating, and the weekly ceiling caps what one character is paid', async (t) => {
  const w = await world(t);
  const names = ['Ada', 'Ben', 'Cyra', 'Dele', 'Efe', 'Femi', 'Gbenga'];
  const all = [];
  for (const name of names) all.push(await agentOwner(w, `${name}1`, name, `Robo ${name}`));
  const week = toNextWeek(w, 0, 1);
  for (const a of all) assert.equal((await w.tool(a.key, 'tournament_enter', { cup: 'fight' })).ok, true);
  // The last to enter has the best rating in the game: it is the top seed.
  const top = all[6]!.id;
  await w.change((db) => { const growth = (db.growth ??= {} as never) as unknown as { tables?: { ratings?: Record<string, Record<string, { rating: number }>> } }; const tables = growth.tables ??= {}; (tables.ratings ??= {})[top] = { fight: { rating: 1600 } }; });
  toDay(w, week, 2, 0);
  const keyOf = new Map(all.map((a) => [`Robo ${a.owner.subject.slice(0, -1)}`, a.key]));
  for (let round = 0; round < 3; round++) {
    await w.tool(all[0]!.key, 'tournament_cups');
    const cup = (await bookOf(w)).cups[`w${week}-fight`];
    if (round === 0) { assert.equal(cup?.format, 'bracket'); assert.equal(cup?.rounds?.length, 3); assert.deepEqual(cup?.rounds?.[0]?.byes, [top], 'the best rated is the top seed and has the bye'); }
    const open = Object.values((await bookOf(w)).matches).filter((m) => m.status !== 'done' && m.ref === `w${week}-fight`);
    assert.equal(open.length, [3, 2, 1][round], `round ${round + 1}`);
    // In every match the first seat fights and the second stands still.
    for (const m of open) await fight(w, m.id, keyOf.get(m.names[0])!, keyOf.get(m.names[1])!);
    const next = (await bookOf(w)).cups[`w${week}-fight`]?.rounds?.[round + 1];
    if (next) w.f.advance(Math.max(0, next.start - w.f.now()) + 60000);
  }
  const final = Object.values((await bookOf(w)).matches).find((m) => m.ref === `w${week}-fight` && m.round === 2);
  assert.ok(final?.result);
  const champion = final.names[final.result.winner ?? 0];
  // Before the week is settled, the champion is owed another prize of the same week (as from a second cup): the ceiling holds the total.
  const id = all.find((a) => `Robo ${a.owner.subject.slice(0, -1)}` === champion)!.id;
  await w.change((db) => { const book = (db as Record<string, unknown>)[COLLECTION] as ArenaBook; book.prizes['other-cup:1'] = { id: 'other-cup:1', char: id, amount: 3000, label: 'Another cup', week, paid: false, at: w.f.now() }; });
  const cashBefore = await w.stored((db) => Object.values(db.sessions).find((s) => s.publicId === id)?.cities?.lagos?.state?.cash ?? 0);
  toDay(w, week, 6, 0);
  w.f.advance(1000);
  await w.tool(all[0]!.key, 'tournament_cups');
  const book = await bookOf(w), cup = book.cups[`w${week}-fight`];
  assert.equal(cup?.status, 'settled');
  assert.equal(cup?.results?.[0]?.name, champion);
  assert.deepEqual(cup?.results?.slice(0, 3).map((r) => r.prize), ARENA.prizes);
  const mine = Object.values(book.prizes).filter((p) => p.char === id);
  assert.ok(mine.every((p) => p.paid));
  assert.equal(mine.reduce((sum, p) => sum + p.amount, 0), ARENA.weeklyPrizeCeiling, 'never more than the ceiling in a week');
  assert.equal(await w.stored((db) => Object.values(db.sessions).find((s) => s.publicId === id)?.cities?.lagos?.state?.cash), cashBefore + ARENA.weeklyPrizeCeiling);
});
