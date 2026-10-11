// The reference agent (scripts/agents/reference-agent.ts) plays for a few simulated game hours against a real server, in both modes. It has no
// language model: it must earn, eat, never loop on a refusal, and never be suspended. Time is the server's fake clock, which the agent's sleeps advance.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world } from './test-world.ts';
import type { World, Owner } from './test-world.ts';
import { playOnce } from '../../scripts/agents/reference-agent.ts';
import type { AgentReport } from '../../scripts/agents/reference-agent.ts';

const MONDAY_8AM = Date.UTC(2026, 0, 5, 7);
const HOURS = 3;

interface Played { report: AgentReport; earned: number; hunger: number; suspended: boolean; log: string[] }
async function play(w: World, key: string, publicId: string): Promise<Played> {
  const log: string[] = [];
  const report = await playOnce({ url: `${w.f.base}/mcp`, key, minutes: HOURS * 60, sleep: async (ms) => { w.f.advance(ms); }, now: () => w.f.now(), log: (line) => log.push(line) });
  const state = await w.stored((db) => { const session = Object.values(db.sessions).find((item) => item.publicId === publicId); return session?.cities.lagos?.state; });
  const suspended = await w.stored((db) => Object.values(db.agents?.keys ?? {}).some((item) => Boolean((item as { suspended?: unknown }).suspended)));
  return { report, earned: state?.social.earned ?? 0, hunger: state?.needs.hunger ?? 0, suspended, log };
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
  assert.equal(report.errors.length, 0);
}

test('reference agent, own-character mode: plays three game hours, earns, eats, never loops on a refusal', { timeout: 120000 }, async (t) => {
  const w = await world(t);
  w.f.advance(MONDAY_8AM - w.f.now());
  const ada: Owner = await w.owner('Ada1', 'Ada');
  const key = (await w.makeAgentKey(ada, { mode: 'own', name: 'reference' })).key;
  const played = await play(w, key, ada.id);
  check('own character', played);
  // What the agent did is the owner's life: the same earnings show in the owner's own view.
  const human = await w.json('/api/life?city=lagos', undefined, ada.cookie) as unknown as { state: { social: { earned: number } } };
  assert.equal(human.state.social.earned, played.earned);
});

test('reference agent, agent-character mode: the same play on an independent, marked character', { timeout: 120000 }, async (t) => {
  const w = await world(t);
  w.f.advance(MONDAY_8AM - w.f.now());
  const ada: Owner = await w.owner('Ada1', 'Ada');
  await w.checkPhone(ada);
  const made = await w.makeAgentKey(ada, { mode: 'agent', name: 'reference', characterName: 'Reference Bot' });
  assert.equal(made.status, 200);
  const id = await w.stored((db) => Object.values(db.sessions).find((item) => item.name === 'Reference Bot')?.publicId ?? '');
  const played = await play(w, made.key as string, id);
  check('agent character', played);
  const board = await w.json('/api/agents/board');
  const row = (board.rows as { name: string; earned: number }[]).find((item) => item.name === 'Reference Bot');
  assert.ok(row && row.earned > 0, 'it is on the agents board with what it earned');
});
