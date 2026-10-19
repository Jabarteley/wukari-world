// The model router with a fake fetch and plain objects for the host: no test here reaches a provider.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRouter, HARD_CAP_MICRO, RATE_BACKOFF_MS, retryAfterMs, type Deps, type Limits, type Stored } from './router.ts';
import { formatList, isFree, parseList, priceOf } from './catalog.ts';
import { modelWordsSafe, readVerdict } from './safety.ts';
import { reportDue, weeklyReport } from './weekly.ts';
import { readModelList } from './report.ts';

interface Call { url: string; model: string; key: string; body: Record<string, unknown> }
type Plan = (call: Call, index: number) => { status?: number; headers?: Record<string, string>; text?: string; usage?: { prompt_tokens: number; completion_tokens: number } | null; delayMs?: number };
const answer = (status: number, body: unknown): Response => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });

function world(options: { plan?: Plan; keys?: Partial<Record<'gateway' | 'openrouter', boolean>>; settings?: Record<string, boolean | number | string>; limits?: Partial<Limits>; prices?: Deps['prices']; saved?: Stored } = {}) {
  const clock = { now: Date.UTC(2026, 9, 14, 12, 0, 0) };
  const calls: Call[] = [], saves: Stored[] = [];
  const settings = options.settings ?? {};
  const plan: Plan = options.plan ?? ((): ReturnType<Plan> => ({}));
  const limits: Limits = { dailyCapMicro: HARD_CAP_MICRO, playerRequests: 200, playerMicro: 50000, freePerMinute: { openrouter: 20, gateway: 20 }, freePerDay: { openrouter: 50 }, ...options.limits };
  const fetchList: Deps['fetch'] = async (url, init) => {
    const body = JSON.parse(String((init as { body?: string }).body ?? '{}')) as Record<string, unknown>;
    const headers = (init as { headers: Record<string, string> }).headers;
    const call: Call = { url, model: String(body['model']), key: headers['Authorization'] ?? '', body };
    calls.push(call);
    const chosen = plan(call, calls.length - 1);
    if (chosen.delayMs) await new Promise((resolve) => setTimeout(resolve, chosen.delayMs));
    const status = chosen.status ?? 200;
    if (status >= 400) return new Response(JSON.stringify({ error: { message: 'no' } }), { status, headers: chosen.headers });
    return answer(status, { choices: [{ message: { content: chosen.text ?? 'Hello there.' } }], ...(chosen.usage === null ? {} : { usage: chosen.usage ?? { prompt_tokens: 100, completion_tokens: 20 } }) });
  };
  const keys = { gateway: true, openrouter: true, ...options.keys };
  const router = createRouter({
    now: () => clock.now, fetch: fetchList,
    provider: (name) => (keys[name] ? { key: `key-${name}`, baseUrl: name === 'gateway' ? 'https://ai-gateway.vercel.sh' : '' } : null),
    setting: (key) => settings[key], limits: () => limits, prices: options.prices,
    load: async () => options.saved, save: async (stored) => { saves.push(structuredClone(stored)); },
  });
  return { router, clock, calls, saves, settings };
}
const say = (purpose: 'companion' | 'agent-talk' | 'resident' | 'safety', extra: { carriesPlayerWords?: boolean; playerId?: string; maxTokens?: number; timeoutMs?: number } = {}) => ({ purpose, messages: [{ role: 'user' as const, content: 'hello' }], maxTokens: 100, carriesPlayerWords: false, ...extra });

test('lists: parsed, bad entries dropped, free recognised, prices default high for unknown paid models', () => {
  assert.deepEqual(parseList('openrouter:google/gemma-4-31b-it:free, openai/gpt-6-luna\nnonsense, gateway:openai/gpt-6-luna'), [{ provider: 'openrouter', id: 'google/gemma-4-31b-it:free' }, { provider: 'gateway', id: 'openai/gpt-6-luna' }]);
  assert.equal(formatList(parseList('a/b')), 'gateway:a/b');
  assert.ok(isFree('google/gemma-4-31b-it:free') && isFree('stealth/glyph-cluster') && !isFree('openai/gpt-6-luna'));
  assert.deepEqual(priceOf('openai/gpt-6-luna'), { input: 0.1, output: 0.5 });
  assert.deepEqual(priceOf('openai/gpt-5.6-luna'), { input: 0.2, output: 1.2 });
  assert.ok(priceOf('some/unknown-paid').input >= 1);
});

test('fallback order: free first, then paid; a failing model rests and is skipped next time', async () => {
  const w = world({ plan: (call) => (call.model.includes('laguna') || call.model.includes('nemotron-3.5-lightning') ? { status: 500 } : {}), settings: { modelsResident: 'gateway:nvidia/nemotron-3.5-lightning-free, gateway:poolside/laguna-s-2.1-free, openrouter:google/gemma-4-31b-it:free, gateway:openai/gpt-6-luna' } });
  const first = await w.router.ask(say('resident'));
  assert.ok(first.ok);
  assert.deepEqual(w.calls.map((call) => call.model), ['nvidia/nemotron-3.5-lightning-free', 'poolside/laguna-s-2.1-free', 'google/gemma-4-31b-it:free']);
  assert.equal(first.ok && first.model, 'google/gemma-4-31b-it:free');
  assert.equal(first.ok && first.costMicro, 0);
  w.calls.length = 0;
  await w.router.ask(say('resident'));
  assert.deepEqual(w.calls.map((call) => call.model), ['google/gemma-4-31b-it:free'], 'the two that failed rest for a few minutes');
  w.clock.now += 6 * 60000; w.calls.length = 0;
  await w.router.ask(say('resident'));
  assert.equal(w.calls[0]?.model, 'nvidia/nemotron-3.5-lightning-free', 'tried again after the rest');
});

test('a provider with no key is skipped; with no key at all the answer is off', async () => {
  const w = world({ keys: { openrouter: false }, settings: { modelsResident: 'openrouter:google/gemma-4-31b-it:free, gateway:nvidia/nemotron-3.5-lightning-free' } });
  const got = await w.router.ask(say('resident'));
  assert.ok(got.ok && got.provider === 'gateway');
  assert.ok(w.calls.every((call) => call.url.startsWith('https://ai-gateway.vercel.sh/v1/chat/completions')));
  const none = world({ keys: { gateway: false, openrouter: false } });
  const off = await none.router.ask(say('companion'));
  assert.deepEqual(off.ok ? null : off.why, 'off');
  assert.equal(none.calls.length, 0);
});

test('the no-training rule: a request with a person’s words never reaches a free model', async () => {
  const w = world({ settings: { modelsAgentTalk: 'openrouter:google/gemma-4-31b-it:free, gateway:nvidia/nemotron-3.5-lightning-free, gateway:openai/gpt-6-luna' } });
  const got = await w.router.ask(say('agent-talk', { carriesPlayerWords: true }));
  assert.ok(got.ok);
  assert.deepEqual(w.calls.map((call) => call.model), ['openai/gpt-6-luna']);
  // Only free models in the list, and a person's words: nothing is sent.
  const only = world({ settings: { modelsAgentTalk: 'openrouter:google/gemma-4-31b-it:free' } });
  const refused = await only.router.ask(say('agent-talk', { carriesPlayerWords: true }));
  assert.equal(refused.ok ? 'ok' : refused.why, 'no-model');
  assert.equal(only.calls.length, 0);
  // The same free list is fine for a line with no player data.
  assert.ok((await only.router.ask(say('agent-talk'))).ok);
  assert.equal(only.calls.length, 1);
  // OpenRouter: a paid model with a person's words asks for providers that keep no data; a line without them does not.
  const paid = world({ settings: { modelsAgentTalk: 'openrouter:vendor/paid-model' } });
  await paid.router.ask(say('agent-talk', { carriesPlayerWords: true }));
  await paid.router.ask(say('agent-talk'));
  assert.deepEqual(paid.calls[0]?.body['provider'], { data_collection: 'deny' });
  assert.equal(paid.calls[1]?.body['provider'], undefined);
  assert.equal(paid.calls[0]?.url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(paid.calls[0]?.key, 'Bearer key-openrouter');
});

test('the default lists keep the rule: companion and agent-talk hold paid models only, residents free first', async () => {
  const w = world();
  await w.router.ask(say('companion', { carriesPlayerWords: true }));
  assert.equal(w.calls[0]?.model, 'openai/gpt-6-luna');
  w.calls.length = 0;
  await w.router.ask(say('resident'));
  assert.ok(isFree(w.calls[0]!.model), 'a resident starts on a free model');
  w.calls.length = 0;
  await w.router.ask(say('safety', { maxTokens: 12 }));
  assert.equal(w.calls[0]?.model, 'nvidia/nemotron-3.5-content-safety:free');
});

test('the US$2 stop: refused before calling, and a burst of parallel requests cannot overshoot', async () => {
  const prices = { 'vendor/pricey': { input: 100, output: 200 } };
  // Worst case of one request: about 1,000 tokens out at US$200 a million = US$0.20, so at most nine of twenty fit under US$2.
  const w = world({ prices, settings: { modelsCompanion: 'vendor/pricey' }, plan: () => ({ delayMs: 5, usage: { prompt_tokens: 100, completion_tokens: 900 } }) });
  const results = await Promise.all(Array.from({ length: 20 }, () => w.router.ask(say('companion', { carriesPlayerWords: true, maxTokens: 1000 }))));
  const done = results.filter((result) => result.ok).length;
  assert.ok(done >= 8 && done <= 9, `answered ${done}`);
  assert.equal(w.calls.length, done, 'the rest were refused before any call');
  assert.ok(results.filter((result) => !result.ok).every((result) => !result.ok && result.why === 'budget'));
  const today = w.router.today();
  assert.ok(today.ledger.micro <= HARD_CAP_MICRO, `spent ${today.ledger.micro}`);
  assert.equal(today.reservedMicro, 0);
  // Sequential: spend up to the edge, then no more calls today; tomorrow is a new day.
  w.calls.length = 0;
  for (let i = 0; i < 30; i++) await w.router.ask(say('companion', { carriesPlayerWords: true, maxTokens: 1000 }));
  assert.ok(w.router.today().ledger.micro <= HARD_CAP_MICRO);
  const before = w.calls.length;
  const refused = await w.router.ask(say('companion', { carriesPlayerWords: true, maxTokens: 1000 }));
  assert.equal(refused.ok ? 'ok' : refused.why, 'budget');
  assert.equal(w.calls.length, before);
  w.clock.now += 86400000;
  assert.ok((await w.router.ask(say('companion', { carriesPlayerWords: true, maxTokens: 1000 }))).ok, 'a new UTC day');
});

test('a setting can lower the cap but the code never lets it pass US$2', async () => {
  const w = world({ limits: { dailyCapMicro: 10 } });
  const got = await w.router.ask(say('companion', { carriesPlayerWords: true }));
  assert.equal(got.ok ? 'ok' : got.why, 'budget');
  assert.equal(w.calls.length, 0);
});

test('without usage in the answer the conservative reservation remains a budget debit', async () => {
  const w = world({ plan: () => ({ usage: null, text: 'x'.repeat(400) }), settings: { modelsCompanion: 'openai/gpt-6-luna' } });
  const got = await w.router.ask({ ...say('companion', { carriesPlayerWords: true }), messages: [{ role: 'user', content: 'y'.repeat(800) }] });
  assert.ok(got.ok && got.usage === null);
  // 800 UTF-8 bytes + 64 framing allowance, and all 100 permitted output tokens.
  assert.equal(got.ok && got.costMicro, 137);
  assert.equal(w.router.today().ledger.estimatedMicro, 137);
});

test('per-person caps: requests a day and paid spend a day; other people are not affected', async () => {
  const w = world({ limits: { playerRequests: 2 } });
  assert.ok((await w.router.ask(say('companion', { carriesPlayerWords: true, playerId: 'p_a' }))).ok);
  assert.ok((await w.router.ask(say('companion', { carriesPlayerWords: true, playerId: 'p_a' }))).ok);
  const third = await w.router.ask(say('companion', { carriesPlayerWords: true, playerId: 'p_a' }));
  assert.equal(third.ok ? 'ok' : third.why, 'player-cap');
  assert.ok((await w.router.ask(say('companion', { carriesPlayerWords: true, playerId: 'p_b' }))).ok);
  assert.equal(w.calls.length, 3);
  const spend = world({ limits: { playerMicro: 100 } });
  const big = await spend.router.ask(say('companion', { carriesPlayerWords: true, playerId: 'p_c', maxTokens: 1000 }));
  assert.equal(big.ok ? 'ok' : big.why, 'player-cap', 'one person’s paid day is capped');
  assert.equal(spend.calls.length, 0);
});

test('free provider rates: per minute and per day, each provider on its own', async () => {
  const w = world({ limits: { freePerMinute: { openrouter: 2, gateway: 20 }, freePerDay: { openrouter: 3 } }, settings: { modelsResident: 'openrouter:google/gemma-4-31b-it:free' } });
  assert.ok((await w.router.ask(say('resident'))).ok);
  assert.ok((await w.router.ask(say('resident'))).ok);
  const third = await w.router.ask(say('resident'));
  assert.equal(third.ok ? 'ok' : third.why, 'rate', 'two a minute');
  assert.equal(w.calls.length, 2);
  w.clock.now += 61000;
  assert.ok((await w.router.ask(say('resident'))).ok, 'a minute later there is room');
  w.clock.now += 61000;
  const fourth = await w.router.ask(say('resident'));
  assert.equal(fourth.ok ? 'ok' : fourth.why, 'rate', 'three a day');
  // Falls to the gateway's free model, which has its own room.
  const mixed = world({ limits: { freePerMinute: { openrouter: 1, gateway: 20 }, freePerDay: { openrouter: 50 } }, settings: { modelsResident: 'openrouter:google/gemma-4-31b-it:free, gateway:stealth/glyph-cluster' } });
  await mixed.router.ask(say('resident'));
  const next = await mixed.router.ask(say('resident'));
  assert.equal(next.ok && next.model, 'stealth/glyph-cluster');
  assert.equal(next.ok && next.costMicro, 0);
});

test('a free model out of room falls to a paid one when the request allows it', async () => {
  const w = world({ limits: { freePerMinute: { openrouter: 0, gateway: 0 }, freePerDay: { openrouter: 0, gateway: 0 } }, settings: { modelsResident: 'openrouter:google/gemma-4-31b-it:free, gateway:openai/gpt-6-luna' } });
  const got = await w.router.ask(say('resident'));
  assert.equal(got.ok && got.model, 'openai/gpt-6-luna');
  assert.ok(got.ok && got.costMicro > 0);
});

test('a model that disappears (404) falls to the next and is not asked for half an hour; 429 and timeouts fall too', async () => {
  const w = world({ plan: (call) => (call.model === 'gone/model-x' ? { status: 404 } : call.model === 'busy/model-y' ? { status: 429 } : call.model === 'slow/model-z' ? { delayMs: 1500 } : {}), settings: { modelsResident: 'gone/model-x, busy/model-y, slow/model-z, openai/gpt-6-luna' } });
  const got = await w.router.ask({ ...say('resident'), timeoutMs: 1000 });
  assert.equal(got.ok && got.model, 'openai/gpt-6-luna');
  assert.deepEqual(got.attempts.map((attempt) => attempt.ok ? 'ok' : attempt.why), ['model', 'rate', 'timeout', 'ok']);
  w.calls.length = 0; w.clock.now += 10 * 60000;
  await w.router.ask({ ...say('resident'), timeoutMs: 1000 });
  assert.ok(!w.calls.some((call) => call.model === 'gone/model-x'), 'a gone model rests longer');
  assert.ok(w.calls.some((call) => call.model === 'busy/model-y'), 'a busy one is tried again after a few minutes');
  w.calls.length = 0; w.clock.now += 40 * 60000;
  await w.router.ask({ ...say('resident'), timeoutMs: 1000 });
  assert.equal(w.calls[0]?.model, 'gone/model-x');
});

test('every model failing is a refusal the caller handles; a key refused stops that provider', async () => {
  const w = world({ plan: () => ({ status: 500 }), settings: { modelsCompanion: 'openai/gpt-6-luna, xai/grok-4.1-fast-non-reasoning' } });
  const got = await w.router.ask(say('companion', { carriesPlayerWords: true }));
  assert.equal(got.ok ? 'ok' : got.why, 'failed');
  assert.equal(w.calls.length, 2);
  assert.equal(w.router.today().reservedMicro, 0);
  assert.ok(w.router.today().ledger.micro > 0, 'ambiguous paid failures retain conservative debits');
  assert.equal(w.router.today().ledger.estimatedMicro, w.router.today().ledger.micro);
  const bad = world({ plan: () => ({ status: 401 }), settings: { modelsCompanion: 'openai/gpt-6-luna, xai/grok-4.1-fast-non-reasoning' } });
  await bad.router.ask(say('companion', { carriesPlayerWords: true }));
  assert.equal(bad.calls.length, 1, 'the same key would fail again');
});

test('the ledger is stored and comes back after a restart; spend by model and by purpose', async () => {
  const w = world();
  await w.router.ask(say('companion', { carriesPlayerWords: true, playerId: 'p_a' }));
  await w.router.ask(say('resident'));
  await new Promise((resolve) => setTimeout(resolve, 5));
  const last = w.saves.at(-1)!;
  const day = Object.values(last.days)[0]!;
  assert.ok(day.micro > 0 && day.requests === 2);
  assert.ok(day.byModel['gateway:openai/gpt-6-luna']!.micro > 0);
  assert.deepEqual(Object.keys(day.byPurpose).sort(), ['companion', 'resident']);
  assert.equal(JSON.stringify(last).includes('hello'), false, 'no words are stored');
  const again = world({ saved: last });
  again.clock.now = w.clock.now;
  assert.equal(again.router.today().ledger.micro === 0, true, 'before it is loaded it reads nothing');
  await again.router.ready();
  assert.equal(again.router.today().ledger.micro, day.micro);
});

test('the safety model: an explicit unsafe blocks; anything else is unknown, never a block', async () => {
  assert.deepEqual(readVerdict('unsafe'), { safe: false, reason: 'safety_model' });
  assert.deepEqual(readVerdict('Safe.'), { safe: true });
  assert.deepEqual(readVerdict('maybe?'), { safe: 'unknown' });
  const w = world({ plan: () => ({ text: 'unsafe' }) });
  assert.equal((await modelWordsSafe(w.router, 'some model line')).safe, false);
  assert.equal(w.calls[0]?.model, 'nvidia/nemotron-3.5-content-safety:free');
  const down = world({ plan: () => ({ status: 500 }) });
  assert.equal((await modelWordsSafe(down.router, 'x')).safe, 'unknown');
});

const listsFor = (state: { openrouter: object[]; gateway: object[]; fail?: string }) => async (url: string): Promise<unknown> => {
  const which = url.includes('openrouter') ? 'openrouter' : 'gateway';
  if (state.fail === which) return answer(503, 'no');
  return answer(200, { data: state[which] });
};
test('the weekly report: new and departing free models, once a week, and a failing provider keeps its old list', async () => {
  const w = world();
  const state = { openrouter: [{ id: 'a/one:free', pricing: { prompt: '0', completion: '0' } }, { id: 'b/paid', pricing: { prompt: '0.1', completion: '0.2' } }] as object[], gateway: [{ id: 'g/free-thing', pricing: { input: '0', output: '0' } }, { id: 'openai/gpt-6-luna', pricing: { input: '0.1' } }] as object[], fail: undefined as string | undefined };
  const fetcher = listsFor(state);
  assert.equal(reportDue(w.router, w.clock.now), true);
  const first = await weeklyReport(w.router, fetcher, () => w.clock.now);
  assert.ok(first && first.openrouter.first && first.openrouter.free === 1 && first.gateway.free === 1);
  assert.deepEqual(first.openrouter.appeared, []);
  assert.equal(await weeklyReport(w.router, fetcher, () => w.clock.now), null, 'not again within the week');
  assert.equal(reportDue(w.router, w.clock.now + 6 * 86400000), false);
  state.openrouter = [{ id: 'a/two:free' }, { id: 'a/three:free' }];
  state.gateway = [{ id: 'openai/gpt-6-luna' }];
  w.clock.now += 8 * 86400000;
  const second = await weeklyReport(w.router, fetcher, () => w.clock.now);
  assert.deepEqual(second?.openrouter.appeared, ['a/two:free', 'a/three:free']);
  assert.deepEqual(second?.openrouter.left, ['a/one:free']);
  assert.deepEqual(second?.gateway.left, ['g/free-thing']);
  assert.ok(second?.missing.includes('gateway:nvidia/nemotron-3.5-lightning-free'), 'configured free models that vanished are named');
  assert.equal(w.router.stored().report?.at, w.clock.now);
  // One provider down: its earlier free list stays, the other is compared.
  w.clock.now += 8 * 86400000; state.fail = 'gateway'; state.openrouter = [{ id: 'a/two:free' }];
  const third = await weeklyReport(w.router, fetcher, () => w.clock.now);
  assert.equal(third?.gateway.ok, false);
  assert.deepEqual(third?.openrouter.left, ['a/three:free']);
  assert.deepEqual(w.router.stored().freeSeen?.gateway, []);
  assert.equal(readModelList({ nope: 1 }), null);
});

test('the weekly report: both providers down is tried again only after six hours', async () => {
  const w = world();
  let asked = 0;
  const fetcher = async (): Promise<unknown> => { asked++; return answer(500, 'no'); };
  assert.equal(await weeklyReport(w.router, fetcher, () => w.clock.now), null);
  assert.equal(asked, 2);
  assert.equal(await weeklyReport(w.router, fetcher, () => w.clock.now + 3600000), null);
  assert.equal(asked, 2, 'not before six hours');
  w.clock.now += 7 * 3600000;
  await weeklyReport(w.router, fetcher, () => w.clock.now);
  assert.equal(asked, 4);
});

// ---- the gateway has no daily cap of ours; a 429 rests that model for its retry-after ----

test('the gateway free models have no daily cap of ours: many requests in a day all go out (a per-minute safety limit still applies)', async () => {
  const w = world({ limits: { freePerMinute: { openrouter: 20, gateway: 10000 } }, settings: { modelsResident: 'gateway:stealth/glyph-cluster' } });
  for (let i = 0; i < 700; i += 1) assert.ok((await w.router.ask(say('resident'))).ok, `request ${i}`);
  assert.equal(w.calls.length, 700, 'past the old 500 a day');
  const tight = world({ limits: { freePerMinute: { openrouter: 20, gateway: 2 } }, settings: { modelsResident: 'gateway:stealth/glyph-cluster' } });
  await tight.router.ask(say('resident')); await tight.router.ask(say('resident'));
  const third = await tight.router.ask(say('resident'));
  assert.equal(third.ok ? 'ok' : third.why, 'rate', 'the per-minute safety limit still holds');
  // OpenRouter keeps its daily number.
  const open = world({ limits: { freePerDay: { openrouter: 2 } }, settings: { modelsResident: 'openrouter:google/gemma-4-31b-it:free' } });
  await open.router.ask(say('resident')); open.clock.now += 61000; await open.router.ask(say('resident')); open.clock.now += 61000;
  const over = await open.router.ask(say('resident'));
  assert.equal(over.ok ? 'ok' : over.why, 'rate');
});

test('retryAfterMs reads seconds, an HTTP date, and gives null for nothing or junk', () => {
  const now = Date.UTC(2026, 9, 14, 12, 0, 0);
  assert.equal(retryAfterMs('30', now), 30000);
  assert.equal(retryAfterMs(' 1.5 ', now), 1500);
  assert.equal(retryAfterMs('Wed, 14 Oct 2026 12:02:00 GMT', now), 120000);
  assert.equal(retryAfterMs('Wed, 14 Oct 2026 11:00:00 GMT', now), 1000, 'a date already past: a second');
  assert.equal(retryAfterMs('0', now), 1000);
  assert.equal(retryAfterMs('999999', now), 3600000, 'obeyed up to an hour at a time');
  for (const bad of [undefined, null, '', 'soon', '-5', '12abc', 'banana 12', 42, 'Wed, 99 Foo 2026 99:99:99 GMT']) assert.equal(retryAfterMs(bad, now), null, String(bad));
});

const tried = (w: ReturnType<typeof world>) => { const models = w.calls.map((call) => call.model); w.calls.length = 0; return models; };

test('a 429 with retry-after in seconds rests that model for that long, and only that model', async () => {
  const w = world({ plan: (call) => (call.model === 'busy/model-y-free' ? { status: 429, headers: { 'retry-after': '90' } } : {}), settings: { modelsResident: 'gateway:busy/model-y-free, gateway:stealth/glyph-cluster' } });
  const first = await w.router.ask(say('resident'));
  assert.equal(first.ok && first.model, 'stealth/glyph-cluster');
  assert.deepEqual(tried(w), ['busy/model-y-free', 'stealth/glyph-cluster']);
  w.clock.now += 89000; await w.router.ask(say('resident'));
  assert.deepEqual(tried(w), ['stealth/glyph-cluster'], 'still resting after 89 s');
  w.clock.now += 2000; await w.router.ask(say('resident'));
  assert.deepEqual(tried(w), ['busy/model-y-free', 'stealth/glyph-cluster'], 'tried again after 90 s (and the other model was never held back)');
});

test('a 429 with retry-after as an HTTP date rests the model until then', async () => {
  const w = world({ plan: (call) => (call.model === 'busy/model-y-free' ? { status: 429, headers: { 'retry-after': 'Wed, 14 Oct 2026 12:10:00 GMT' } } : {}), settings: { modelsResident: 'gateway:busy/model-y-free, gateway:stealth/glyph-cluster' } });
  await w.router.ask(say('resident')); w.calls.length = 0;
  w.clock.now = Date.UTC(2026, 9, 14, 12, 9, 59); await w.router.ask(say('resident'));
  assert.deepEqual(tried(w), ['stealth/glyph-cluster'], 'a second before the date');
  w.clock.now = Date.UTC(2026, 9, 14, 12, 10, 1); await w.router.ask(say('resident'));
  assert.deepEqual(tried(w), ['busy/model-y-free', 'stealth/glyph-cluster']);
});

test('a 429 with no retry-after, or an unreadable one, backs off 1, 2 then 5 minutes and starts again after a success', async () => {
  for (const headers of [undefined, { 'retry-after': 'soon' }]) {
    let busy = true;
    const w = world({ plan: (call) => (call.model === 'busy/model-y-free' && busy ? { status: 429, headers } : {}), settings: { modelsResident: 'gateway:busy/model-y-free, gateway:stealth/glyph-cluster' } });
    const rest = async (expected: number): Promise<void> => {
      w.calls.length = 0; await w.router.ask(say('resident'));
      assert.deepEqual(tried(w), ['busy/model-y-free', 'stealth/glyph-cluster']); // it was tried and failed again
      w.clock.now += expected - 1000; await w.router.ask(say('resident'));
      assert.deepEqual(tried(w), ['stealth/glyph-cluster'], `resting ${expected / 1000} s less a second`);
      w.clock.now += 2000;
    };
    assert.deepEqual(RATE_BACKOFF_MS, [60000, 120000, 300000]);
    await rest(RATE_BACKOFF_MS[0]); await rest(RATE_BACKOFF_MS[1]); await rest(RATE_BACKOFF_MS[2]); await rest(RATE_BACKOFF_MS[2]);
    busy = false; await w.router.ask(say('resident'));
    assert.deepEqual(tried(w), ['busy/model-y-free'], 'it answers after its rest, and the backoff starts again');
    busy = true; w.calls.length = 0; await w.router.ask(say('resident'));
    w.clock.now += 59000; await w.router.ask(say('resident')); tried(w);
    w.clock.now += 2000; await w.router.ask(say('resident'));
    assert.equal(w.calls[0]?.model, 'busy/model-y-free', 'one minute again, not five');
  }
});

test('prefer: a model named by the caller is tried first when it is usable, the others stay as fallbacks', async () => {
  const w = world({ settings: { modelsResident: 'gateway:nvidia/nemotron-3.5-lightning-free, gateway:poolside/laguna-s-2.1-free, gateway:stealth/glyph-cluster' } });
  const first = await w.router.ask({ ...say('resident'), prefer: 'gateway:stealth/glyph-cluster' });
  assert.ok(first.ok && first.model === 'stealth/glyph-cluster');
  const bare = await w.router.ask({ ...say('resident'), prefer: 'poolside/laguna-s-2.1-free' });
  assert.ok(bare.ok && bare.model === 'poolside/laguna-s-2.1-free');
  const gone = await w.router.ask({ ...say('resident'), prefer: 'gateway:not/in-the-list' });
  assert.ok(gone.ok && gone.model === 'nvidia/nemotron-3.5-lightning-free');
  // A preferred model that fails falls to the next as usual.
  const failing = world({ settings: { modelsResident: 'gateway:nvidia/nemotron-3.5-lightning-free, gateway:stealth/glyph-cluster' }, plan: (call) => (call.model === 'stealth/glyph-cluster' ? { status: 500 } : {}) });
  const fell = await failing.router.ask({ ...say('resident'), prefer: 'stealth/glyph-cluster' });
  assert.ok(fell.ok && fell.model === 'nvidia/nemotron-3.5-lightning-free' && fell.attempts.length === 2);
});
