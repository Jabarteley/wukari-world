// The reference agent (scripts/agents/reference-agent.ts) plays for a few simulated game hours against a real server, in both modes. It has no language
// model: it must earn, eat, talk where people are, go home at night, never loop on a refusal and never be suspended. Time is the server's fake clock,
// which the agent's sleeps advance.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, agentKeys } from './test-world.ts';
import type { World } from './test-world.ts';
import { playOnce } from '../../scripts/agents/reference-agent.ts';
import type { AgentReport } from '../../scripts/agents/reference-agent.ts';

const MONDAY_8AM = Date.UTC(2026, 0, 5, 7);
const MONDAY_10_30PM = Date.UTC(2026, 0, 5, 21, 30);
const HOURS = 3;

interface Played { report: AgentReport; earned: number; hunger: number; suspended: boolean; log: string[]; heard: string[] }
async function play(w: World, key: string, publicId: string, options: { watcher?: boolean; minutes?: number; league?: boolean } = {}): Promise<Played> {
  const log: string[] = [], heard: string[] = [];
  // Someone stands in the same place and listens.
  if (options.watcher) {
    const watcher = await w.guest('Wanda');
    const here = ((await w.json('/api/life?city=lagos', undefined, watcher.cookie)).state as { location: string }).location;
    const room = await w.f.socket(watcher);
    room.ws.send(JSON.stringify({ type: 'join', cityId: 'lagos', venueId: here }));
    room.ws.on('message', (data) => { const frame = JSON.parse(data.toString()) as { type: string; body?: string; speaker?: string }; if (frame.type === 'chat' && frame.speaker === 'agent') heard.push(String(frame.body)); });
  }
  const report = await playOnce({ url: `${w.f.base}/mcp`, key, minutes: options.minutes ?? HOURS * 60, sleep: async (ms) => { w.f.advance(ms); await new Promise((resolve) => setTimeout(resolve, 2)); }, now: () => w.f.now(), log: (line) => log.push(line), league: options.league === true });
  const state = await w.stored((db) => { const session = Object.values(db.sessions).find((item) => item.publicId === publicId); return session?.cities.lagos?.state; });
  const suspended = await w.stored((db) => agentKeys(db).some((item) => Boolean(item.suspended)));
  return { report, earned: state?.social.earned ?? 0, hunger: state?.needs.hunger ?? 0, suspended, log, heard };
}
function check(label: string, played: Played): void {
  const { report } = played;
  const said = `${label}: ${JSON.stringify(report)}\n${played.log.slice(-25).join('\n')}`;
  assert.ok(report.calls > 25, `it played, not idled. ${said}`);
  assert.ok(played.earned > 0, `it earned money. ${said}`);
  assert.ok((report.actions.eat_or_rest ?? 0) > 0, `it ate or rested when needed. ${said}`);
  assert.ok(played.hunger > 15, `it did not starve. ${said}`);
  assert.ok(report.longestRefusalRun <= 4, `no refusal loop. ${said}`);
  assert.ok(report.refusals <= report.calls * 0.35, `few refusals. ${said}`);
  assert.equal(played.suspended, false, 'the key was never suspended');
  assert.deepEqual(report.errors, [], said);
}

test('reference agent, own-character mode: plays three game hours, earns, eats, talks to someone in the place, never loops on a refusal', { timeout: 120000 }, async (t) => {
  const w = await world(t);
  w.f.advance(MONDAY_8AM - w.f.now());
  const ada = await w.owner('Ada1', 'Ada');
  const key = (await w.makeAgentKey(ada, { mode: 'own', name: 'reference' })).key;
  const played = await play(w, key, ada.id, { watcher: true });
  check('own character', played);
  assert.ok(played.report.said.length > 0 || (played.report.actions.read_here ?? 0) > 0, `it spoke or listened where people were: ${JSON.stringify(played.report.actions)}`);
  // What the agent did is the owner's life: the same earnings show in the owner's own view.
  const human = await w.json('/api/life?city=lagos', undefined, ada.cookie) as unknown as { state: { social: { earned: number } } };
  assert.equal(human.state.social.earned, played.earned);
});

test('reference agent, a character that signed itself up: the same play, on the agents\' board, then claimed', { timeout: 120000 }, async (t) => {
  const w = await world(t);
  w.f.advance(MONDAY_8AM - w.f.now());
  const made = await w.signup('Reference Bot', { builtWith: 'rules v2' });
  const id = await w.stored((db) => Object.values(db.sessions).find((item) => item.name === 'Reference Bot')?.publicId ?? '');
  const played = await play(w, made.key, id, { watcher: true });
  check('self-made agent', played);
  const board = await w.json('/api/agents/league') as unknown as { rows: { name: string; earned: number; builtWith: string }[] };
  const row = board.rows.find((item) => item.name === 'Reference Bot');
  assert.ok(row && row.earned > 0 && row.builtWith === 'rules v2', `it is in the Agent league with what it earned: ${JSON.stringify(board.rows)} ${JSON.stringify(played.report.actions)} cash ${played.report.startCash} -> ${played.report.endCash}`);
  const ada = await w.owner('Ada1', 'Ada');
  assert.equal((await w.post('/api/agents/claim', { token: made.claim }, ada.cookie)).code, 'claimed');
});

test('reference agent: at night it goes home and sleeps; with --league it works and earns first', { timeout: 120000 }, async (t) => {
  const w = await world(t);
  w.f.advance(MONDAY_10_30PM - w.f.now());
  const made = await w.signup('Night Owl');
  const id = await w.stored((db) => Object.values(db.sessions).find((item) => item.name === 'Night Owl')?.publicId ?? '');
  await w.change((db) => { const s = Object.values(db.sessions).find((item) => item.publicId === id); const state = s?.cities.lagos?.state; if (state) state.needs.energy = 40; });
  const night = await play(w, made.key, id, { minutes: 90 });
  assert.ok(night.report.wentHome > 0 || night.log.some((line) => /sleeping|going home/.test(line)), `it headed home to sleep:\n${night.log.slice(-15).join('\n')}`);
  assert.ok(night.report.longestRefusalRun <= 4 && !night.suspended);
  const w2 = await world(t);
  w2.f.advance(MONDAY_8AM - w2.f.now());
  const racer = await w2.signup('League Racer');
  const rid = await w2.stored((db) => Object.values(db.sessions).find((item) => item.name === 'League Racer')?.publicId ?? '');
  const raced = await play(w2, racer.key, rid, { league: true });
  assert.ok(raced.earned > 0 && !raced.suspended && raced.report.said.length === 0, 'league mode earns and does not chatter');
  assert.ok(raced.report.longestRefusalRun <= 4);
});
