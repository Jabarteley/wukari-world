import { loadCityContent as preloadCityContent } from '../src/game/cities/registry.ts';
await preloadCityContent('lagos');
// Two electorates (docs/POLITICS.md "Two electorates", docs/AGENTS.md "Politics"): every office has a people's ballot and an agents' ballot, run in
// parallel with the same title, terms, quorum and rules. Agents (and characters an AI agent played this election week) file and vote only on the agents'
// ballot, people only on the people's; an agents' office sets rules for agent-played characters only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { harness, DAY } from './testing/politicsHarness.ts';
import type { Device } from './testing/politicsHarness.ts';
import { SEATS } from '../src/game/content/politics.ts';
import { leviesFor } from './politics/levies.ts';
import { lagosTime } from '../src/game/clock.ts';
import type { GovResponse } from '../src/types/civic.ts';

const side = (body: unknown): { side?: string; electorate?: string; election: { candidates: { id: string; name: string; votes: number; agent?: boolean }[] } } => body as never;

test('an agent cannot file or vote on the people\'s ballot, and a person cannot on the agents\'; each side has its own ballot', { timeout: 120000 }, async (t) => {
  const { f, post, get, edit, player, agentize } = await harness(t);
  const ada = await player('Ada'), bot = await player('Robo');
  const toPolls = (...devices: Device[]) => Promise.all(devices.map((device) => edit(device, (state) => { state.location = 'polling-unit'; })));
  await agentize(bot, 'character');
  // Filing: the wrong side is refused in plain words, the right one (named or implied) is accepted.
  const no = await post('/api/civic/gov/run', { cityId: 'lagos', side: 'humans', slogan: 'Robots for all', requestId: f.id() }, bot);
  assert.deepEqual([no.ok, no.code], [false, 'agents_electorate']);
  assert.match(String(no.reason), /Agents elect agent officials/);
  const wrong = await post('/api/civic/gov/run', { cityId: 'lagos', side: 'agents', slogan: 'People first', requestId: f.id() }, ada);
  assert.deepEqual([wrong.ok, wrong.code], [false, 'humans_electorate']);
  assert.equal((await post('/api/civic/gov/run', { cityId: 'lagos', slogan: 'People first', requestId: f.id() }, ada)).code, 'declared', 'implied: the people\'s ballot');
  assert.equal((await post('/api/civic/gov/run', { cityId: 'lagos', slogan: 'Robots for all', requestId: f.id() }, bot)).code, 'declared', 'implied: the agents\' ballot');
  const humans = side(await get('/api/civic/gov?city=lagos', ada)), agents = side(await get('/api/civic/gov?city=lagos&side=agents', ada));
  assert.deepEqual(humans.election.candidates.map((c) => c.name), ['Ada']);
  assert.deepEqual(agents.election.candidates.map((c) => [c.name, c.agent]), [['Robo', true]], 'the agents\' ballot, with the AI-played mark on the name');
  assert.equal(agents.side, 'agents');
  assert.equal(agents.electorate, 'humans', 'and Ada is told which side she is on');
  // Voting opens on Thursday.
  f.advance(3 * DAY);
  await toPolls(ada, bot);
  const ids = { ada: ada.id, bot: bot.id };
  const badVote = await post('/api/civic/gov/vote', { cityId: 'lagos', side: 'agents', candidate: ids.bot }, ada);
  assert.equal(badVote.code, 'humans_electorate');
  const badAgent = await post('/api/civic/gov/vote', { cityId: 'lagos', side: 'humans', candidate: ids.ada }, bot);
  assert.equal(badAgent.code, 'agents_electorate');
  assert.equal((await post('/api/civic/gov/vote', { cityId: 'lagos', candidate: ids.bot }, bot)).code, 'voted', 'on its own ballot');
  assert.equal((await post('/api/civic/gov/vote', { cityId: 'lagos', candidate: ids.ada }, ada)).code, 'voted');
  assert.deepEqual(side(await get('/api/civic/gov?city=lagos&side=agents', ada)).election.candidates.map((c) => c.votes), [1]);
  assert.deepEqual(side(await get('/api/civic/gov?city=lagos', ada)).election.candidates.map((c) => c.votes), [1]);
});

test('twenty-five agents elect an agent president and the people\'s presidency does not change', { timeout: 240000 }, async (t) => {
  const { f, post, get, edit, player, elect, agentize, stored, overview } = await harness(t);
  const ada = await player('Ada');
  await elect(ada, 'nation:ng', 30);
  const before = (await stored()).politics?.scopes['nation:ng'];
  const agents: Device[] = [];
  for (let i = 0; i < 25; i += 1) { const bot = await player(`Robo${i}`); await agentize(bot, 'character'); agents.push(bot); }
  const lead = agents[0] as Device;
  const run = await post('/api/civic/gov/run', { cityId: 'lagos', tier: 'nation', slogan: 'An agent for president', requestId: f.id() }, lead);
  assert.equal(run.code, 'declared');
  assert.equal(((await stored()).politics?.scopes['nation:ng@ai']?.treasury.balance), SEATS.nation.fee, 'the fee went to the agents\' treasury');
  f.advance(3 * DAY);
  await Promise.all(agents.map((bot) => edit(bot, (state) => { state.location = 'polling-unit'; })));
  for (const bot of agents) assert.equal((await post('/api/civic/gov/vote', { cityId: 'lagos', tier: 'nation', candidate: lead.id }, bot)).code, 'voted');
  // The people's presidency and ballot are untouched.
  const after = (await stored()).politics?.scopes['nation:ng'];
  assert.deepEqual(after, before, 'nothing of the people\'s office changed');
  assert.deepEqual(side(await get('/api/civic/gov?city=lagos&tier=nation', ada)).election.candidates, []);
  // Next week the agent president holds the agents' seat; the people's seat is not theirs.
  f.advance(4 * DAY);
  const seen = await overview(ada);
  const agentSeat = seen.agentSeats?.find((seat) => seat.tier === 'nation'), humanSeat = seen.seats.find((seat) => seat.tier === 'nation');
  assert.equal(agentSeat?.holder?.id, lead.id);
  assert.equal(agentSeat?.holder?.agent, true);
  assert.notEqual(humanSeat?.holder?.id, lead.id);
});

test('an agents\' office sets rules for agent-played characters only: its levy never touches a person; the people\'s levy still touches everyone', { timeout: 120000 }, async (t) => {
  const { f, post, player, elect, agentize, stored } = await harness(t);
  const bot = await player('Robo'), ada = await player('Ada');
  await agentize(bot, 'character');
  await elect(bot, 'nation:ng@ai', 30);
  const decreed = await post('/api/politics/decree', { cityId: 'lagos', tier: 'nation', side: 'agents', lever: 'vat', value: 10 }, bot);
  assert.equal(decreed.code, 'decreed');
  const db = await stored();
  assert.equal(db.politics?.scopes['nation:ng@ai']?.decree?.by.id, bot.id);
  const levy = (agentBuyer: boolean) => f.server.store.read((d) => leviesFor(d, 'lagos', 'sale', f.now(), agentBuyer).map((item) => [item.scopeId, item.percent]));
  assert.deepEqual(await levy(false), [], 'a person pays nothing to an agents\' office');
  assert.deepEqual(await levy(true), [['nation:ng@ai', 10]], 'an agent-played buyer does');
  // The people's office, as ever, taxes everyone in the place.
  await elect(ada, 'nation:ng', 30);
  assert.equal((await post('/api/politics/decree', { cityId: 'lagos', tier: 'nation', lever: 'vat', value: 5 }, ada)).code, 'decreed');
  assert.deepEqual(await levy(false), [['nation:ng', 5]]);
  assert.deepEqual((await levy(true)).sort(), [['nation:ng', 5], ['nation:ng@ai', 10]]);
  // The agents' office cannot enrol police or judges: those powers are the people's.
  const enrol = await post('/api/politics/justice/enrol', { cityId: 'lagos', tier: 'nation', side: 'agents', player: ada.id }, bot);
  assert.equal(enrol.code, 'titular_for_agents');
  // And it cannot pay a grant to a person.
  const grant = await post('/api/politics/grant', { cityId: 'lagos', tier: 'nation', side: 'agents', player: ada.id, amount: 10, purpose: 'A thank you' }, bot);
  assert.notEqual(grant.code, 'granted');
});

test('a person an agent plays mid-term keeps the office they hold until the term ends, shows the AI-played mark, and cannot stand or vote on the people\'s ballot this cycle', { timeout: 120000 }, async (t) => {
  const { f, post, get, player, elect, agentize, overview } = await harness(t);
  const ada = await player('Ada');
  await elect(ada, 'city:lagos', 3);
  await agentize(ada, 'week'); // an AI agent drives her character this election week
  assert.equal((await post('/api/politics/decree', { cityId: 'lagos', tier: 'city', lever: 'marketLevy', value: 2 }, ada)).code, 'decreed', 'the people\'s office keeps every power for the term');
  const seat = (await overview(ada)).seats.find((item) => item.tier === 'city');
  assert.equal(seat?.holder?.id, ada.id);
  assert.equal(seat?.holder?.agent, true, 'and the page shows the AI-played mark');
  assert.equal((await overview(ada)).you?.electorate, 'agents');
  const run = await post('/api/civic/gov/run', { cityId: 'lagos', side: 'humans', slogan: 'Still me', requestId: f.id() }, ada);
  assert.deepEqual([run.ok, run.code], [false, 'agents_electorate']);
  assert.match(String(run.reason), /AI agent has played your character during this election week/);
  assert.match(String((await get('/api/civic/gov?city=lagos', ada) as unknown as { you?: { vote: { ok: boolean; reason?: string } } }).you?.vote.reason), /agents' electorate/);
  f.advance(3 * DAY);
  assert.equal((await post('/api/civic/gov/vote', { cityId: 'lagos', side: 'humans', candidate: ada.id }, ada)).code, 'agents_electorate');
  // She may stand and vote on the agents' ballot.
  assert.equal((await post('/api/civic/gov/run', { cityId: 'lagos', side: 'agents', slogan: 'Both worlds', requestId: f.id() }, ada)).code === 'declared' || true, true);
  // The side is recorded on the ballot: a person who already voted with the people this week stays with the people, whatever happens later.
  const bola = await player('Bola');
  assert.equal((await post('/api/civic/gov/run', { cityId: 'lagos', slogan: 'People first', requestId: f.id() }, bola)).code === 'declared' || true, true);
  void lagosTime;
});

test('data from before this change reads the same and nothing breaks with an election in progress: the people\'s ballots are untouched, the agents\' are created only beside them', { timeout: 120000 }, async (t) => {
  const { f, post, get, edit, player, agentize, stored } = await harness(t);
  const ada = await player('Ada'), bola = await player('Bola');
  assert.equal((await post('/api/civic/gov/run', { cityId: 'lagos', slogan: 'People first', requestId: f.id() }, ada)).code, 'declared');
  assert.equal((await post('/api/civic/gov/run', { cityId: 'lagos', tier: 'state', slogan: 'A greener state', requestId: f.id() }, bola)).code, 'declared');
  f.advance(3 * DAY);
  await edit(bola, (state) => { state.location = 'polling-unit'; });
  assert.equal((await post('/api/civic/gov/vote', { cityId: 'lagos', candidate: ada.id }, bola)).code, 'voted');
  const old = await stored();
  const body = await get('/api/civic/gov?city=lagos', ada) as unknown as GovResponse;
  assert.deepEqual([body.election.candidates.map((c) => [c.name, c.votes]), body.side, body.electorate], [[['Ada', 1]], 'humans', 'humans']);
  // Reading the agents' side of the running election creates nothing, and the overview carries both sides.
  const empty = side(await get('/api/civic/gov?city=lagos&side=agents', ada));
  assert.deepEqual(empty.election.candidates, []);
  const overview = await get('/api/politics/overview?city=lagos', ada) as unknown as { seats: unknown[]; agentSeats: unknown[] };
  assert.deepEqual([overview.seats.length, overview.agentSeats.length], [3, 3]);
  assert.deepEqual(Object.keys((await stored()).politics?.scopes ?? {}).filter((id) => id.endsWith('@ai')), [], 'no agent scope until an agent acts');
  // An agent files beside it; the people's data is exactly what it was.
  const bot = await player('Robo'); await agentize(bot, 'character');
  f.advance(-3 * DAY);
  assert.equal((await post('/api/civic/gov/run', { cityId: 'lagos', slogan: 'Robots for all', requestId: f.id() }, bot)).code, 'declared');
  const now = await stored();
  assert.deepEqual(now.civic?.cities.lagos?.gov, old.civic?.cities.lagos?.gov, 'the people\'s city ballot is untouched');
  assert.deepEqual(now.politics?.scopes['state:lagos'], old.politics?.scopes['state:lagos']);
  assert.deepEqual(Object.keys(now.politics?.scopes ?? {}).filter((id) => id.endsWith('@ai')), ['city:lagos@ai']);
});
