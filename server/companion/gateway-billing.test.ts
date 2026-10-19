import test from 'node:test';
import assert from 'node:assert/strict';
import { once, type Target } from './gateway.ts';

const target: Target = { key: 'synthetic', baseUrl: 'https://provider.invalid', kind: 'openrouter', maxOutputTokens: 16, private: true };
const messages = [{ role: 'user' as const, content: 'Synthetic check.' }];
const call = (fetcher: Parameters<typeof once>[0], timeout = 100) => once(fetcher, target, 'test/paid', 'primary', messages, 'synthetic', timeout);

test('empty visible answer retains reasoning usage and provider-reported charge', async () => {
  const got = await call(async () => new Response(JSON.stringify({ choices: [{ message: { content: null }, finish_reason: 'length' }], usage: { prompt_tokens: 58, completion_tokens: 16, completion_tokens_details: { reasoning_tokens: 16 }, cost: 0.0000308 } })));
  assert.equal(got.ok, false);
  assert.ok(got.billing?.kind === 'observed');
  assert.deepEqual(got.billing.usage, { input: 58, output: 16 });
  assert.ok(Math.abs((got.billing.providerCostMicro ?? NaN) - 30.8) < 1e-9);
});

test('malformed, missing, or partial usage never manufactures a zero receipt', async () => {
  for (const body of ['not json', JSON.stringify({ choices: [] }), JSON.stringify({ usage: { prompt_tokens: 58 } }), JSON.stringify({ usage: { prompt_tokens: -1, completion_tokens: 16, cost: '0' } })]) {
    const got = await call(async () => new Response(body));
    assert.equal(got.ok, false);
    assert.deepEqual(got.billing, { kind: 'unknown' });
  }
});

test('explicit request rejections differ from uncertain server failures', async () => {
  for (const status of [400, 401, 402, 403, 404, 429, 500, 503]) {
    const got = await call(async () => new Response('{}', { status }));
    assert.equal(got.ok, false);
    assert.equal(got.billing?.kind, status < 500 ? 'unbilled' : 'unknown');
  }
});

test('transport rejection and unfinished response body have unknown billing', async () => {
  const network = await call(async () => { throw new Error('synthetic transport failure'); });
  assert.deepEqual(network.billing, { kind: 'unknown' });
  const timeout = await call(async () => ({ status: 200, text: () => new Promise<string>(() => {}) }), 5);
  assert.ok(!timeout.ok && timeout.why === 'timeout');
  assert.deepEqual(timeout.billing, { kind: 'unknown' });
});

test('compatibility retry preserves privacy and accounts only the admitted successful attempt', async () => {
  const bodies: Record<string, unknown>[] = [];
  const got = await call(async (_url, init) => {
    bodies.push(JSON.parse(String((init as { body: string }).body)));
    return bodies.length === 1 ? new Response('unsupported max_tokens', { status: 400 }) : new Response(JSON.stringify({ choices: [{ message: { content: 'Hello.' } }], usage: { prompt_tokens: 10, completion_tokens: 2, cost: 0.000003 } }));
  });
  assert.ok(got.ok);
  assert.equal(bodies.length, 2);
  assert.equal(bodies[1]?.max_completion_tokens, 16);
  assert.deepEqual(bodies[1]?.provider, { data_collection: 'deny' });
  assert.deepEqual(got.billing, { kind: 'observed', usage: { input: 10, output: 2 }, providerCostMicro: 3 });
});


test('invalid message shape cannot erase a valid billing receipt', async () => {
  const got = await call(async () => new Response(JSON.stringify({ choices: [{ message: 'invalid' }], usage: { prompt_tokens: 58, completion_tokens: 16, cost: 0.0000308 } })));
  assert.ok(!got.ok && got.why === 'body');
  assert.ok(got.billing?.kind === 'observed');
  assert.deepEqual(got.billing.usage, { input: 58, output: 16 });
  assert.ok(Math.abs((got.billing.providerCostMicro ?? NaN) - 30.8) < 1e-9);
});
