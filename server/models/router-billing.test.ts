import test from 'node:test';
import assert from 'node:assert/strict';
import { createRouter, type Limits, type Stored } from './router.ts';
import { linkModels, routerOf } from './service.ts';
import { adminStats } from '../admin/tools.ts';

const request = { purpose: 'agent-talk' as const, messages: [{ role: 'user' as const, content: 'x' }], maxTokens: 16, playerId: 'synthetic', carriesPlayerWords: true, timeoutMs: 150 };
const response = (content: string | null, cost?: number, input = 58, output = 16) => new Response(JSON.stringify({ choices: [{ message: { content } }], usage: { prompt_tokens: input, completion_tokens: output, ...(cost === undefined ? {} : { cost }) } }));
function fixture(plan: (n: number) => Promise<unknown>, extra: Partial<Limits> = {}, models = 'openrouter:test/paid', saved?: Stored) {
  let calls = 0;
  const saves: Stored[] = [];
  const router = createRouter({
    now: () => Date.now(), fetch: () => plan(++calls), provider: () => ({ key: 'synthetic', baseUrl: 'https://provider.invalid' }),
    setting: () => models, prices: { 'test/paid': { input: 0.22, output: 1.32 }, 'test/second': { input: 0.22, output: 1.32 } },
    limits: () => ({ dailyCapMicro: 2000000, playerRequests: 200, playerMicro: 50000, freePerMinute: { openrouter: 20, gateway: 20 }, freePerDay: {}, ...extra }),
    load: async () => saved, save: async (value) => { saves.push(structuredClone(value)); },
  });
  return { router, saves, calls: () => calls };
}

test('billed empty response debits model, purpose, player and total without becoming an answer', async () => {
  const w = fixture(async () => response(null, 0.0000308));
  const got = await w.router.ask(request), day = w.router.today().ledger;
  assert.equal(got.ok, false);
  assert.equal(day.micro, 34, 'max(ceil(configured token price), ceil(provider-reported cost))');
  assert.equal(day.requests, 0);
  assert.equal(day.byModel['openrouter:test/paid']?.failed, 1);
  assert.equal(day.byModel['openrouter:test/paid']?.output, 16);
  assert.equal(day.byPurpose['agent-talk']?.micro, 34);
  assert.deepEqual(day.players.synthetic, { n: 1, micro: 34 });
  assert.ok(Math.abs((got.attempts[0]?.providerCostMicro ?? NaN) - 30.8) < 1e-9);
  assert.equal(got.attempts[0]?.chargeBasis, 'provider');
  assert.equal(w.router.today().reservedMicro, 0);
});

test('provider-reported cost above configured price is retained even on invalid output', async () => {
  const w = fixture(async () => response(null, 0.0000701));
  await w.router.ask(request);
  assert.equal(w.router.today().ledger.micro, 71);
});

test('unknown paid failure consumes its reservation and blocks unaffordable fallback and next call', async () => {
  const w = fixture(async () => new Response('not json'), { dailyCapMicro: 36 }, 'openrouter:test/paid, openrouter:test/second');
  const got = await w.router.ask(request);
  assert.equal(got.ok, false);
  assert.equal(w.calls(), 1);
  assert.equal(w.router.today().ledger.micro, 36, 'ceil((1 + 64) * .22 + 16 * 1.32)');
  assert.equal(w.router.today().ledger.estimatedMicro, 36);
  assert.equal(got.attempts[0]?.chargeBasis, 'estimate');
  await w.router.ask(request);
  assert.equal(w.calls(), 1);
  const again = fixture(async () => { throw new Error('must not dispatch'); }, { dailyCapMicro: 36 }, 'openrouter:test/paid', w.saves.at(-1));
  const restored = await again.router.ask(request);
  assert.ok(!restored.ok && restored.why === 'budget');
});

test('timeout keeps estimated debit; free failure and explicit rejection keep zero', async () => {
  const timeout = fixture(async () => new Promise(() => {}));
  const got = await timeout.router.ask(request);
  assert.ok(!got.ok && got.attempts[0]?.why === 'timeout');
  assert.equal(timeout.router.today().ledger.estimatedMicro, 36);
  const rejected = fixture(async () => new Response('{}', { status: 429 }));
  await rejected.router.ask(request);
  assert.equal(rejected.router.today().ledger.micro, 0);
  assert.equal(rejected.router.today().ledger.estimatedMicro ?? 0, 0);
  const free = fixture(async () => new Response('not json'), {}, 'openrouter:test/free:free');
  await free.router.ask({ ...request, carriesPlayerWords: false });
  assert.equal(free.router.today().ledger.micro, 0);
});

test('failed-attempt debit participates in player cap and request-count fallback admission', async () => {
  for (const limits of [{ playerMicro: 50 }, { playerRequests: 1 }]) {
    const w = fixture(async () => response(null, 0.0000308), limits, 'openrouter:test/paid, openrouter:test/second');
    await w.router.ask(request);
    assert.equal(w.calls(), 1);
    assert.equal(w.router.today().ledger.players.synthetic?.micro, 34);
  }
});

test('fallback success returns total booked cost including the failed primary', async () => {
  const w = fixture(async (n) => response(n === 1 ? null : 'Hello.', 0.0000308), {}, 'openrouter:test/paid, openrouter:test/second');
  const got = await w.router.ask(request);
  assert.ok(got.ok);
  assert.equal(got.costMicro, 68);
  assert.equal(w.router.today().ledger.micro, 68);
  assert.equal(w.router.today().ledger.requests, 1);
  assert.equal(got.attempts.length, 2);
});

test('known-usage success keeps visible reply and ledger dimensions', async () => {
  const w = fixture(async () => response('Hello.', undefined, 100, 20));
  const got = await w.router.ask(request);
  assert.ok(got.ok && got.text === 'Hello.');
  assert.equal(got.costMicro, 49);
  assert.equal(got.attempts[0]?.chargeBasis, 'usage');
  assert.equal(w.router.today().ledger.estimatedMicro ?? 0, 0);
});


test('existing admin budget stat distinguishes unresolved estimates and tolerates older ledgers', async () => {
  for (const estimatedMicro of [125000, undefined]) {
    const now = Date.UTC(2026, 9, 19, 12);
    const day = { micro: 300000, requests: 0, byModel: {}, byPurpose: {}, players: {}, free: {}, refused: {}, ...(estimatedMicro === undefined ? {} : { estimatedMicro }) };
    const db = { modelRouter: { days: { [Math.floor(now / 86400000)]: day } } };
    const ctx = {
      now: () => now, env: () => '',
      store: { read: async (read: (value: object) => unknown) => read(db) },
    } as unknown as Parameters<typeof routerOf>[0];
    await routerOf(ctx).ready();
    linkModels(ctx);
    const stat = adminStats(ctx).find((row) => row.id === 'models-spend');
    assert.ok(stat);
    assert.equal(stat.label, 'Budget usage / cap');
    assert.equal(stat.group, 'Models today (UTC day)');
    assert.equal(stat.read(db as never), `US$0.3000 of US$2.0000 (unresolved estimates ${estimatedMicro === undefined ? 'US$0.0000' : 'US$0.1250'}; in flight US$0.0000; not an invoice)`);
  }
});
