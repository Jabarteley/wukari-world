// Speech to text through the gateway with a fake fetch: the request shape, the size and type checks, the no-training model rule, the router's budget and person caps, and
// that nothing of the recording is kept. No test here reaches a provider.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRouter, HARD_CAP_MICRO, type Limits, type Stored } from './router.ts';
import { DEFAULT_STT_MODEL, MAX_AUDIO_BYTES, NO_TRAINING, checkAudio, cleanTranscript, sttModel, transcribe } from './transcribe.ts';

/** A 16 kHz mono 16-bit WAV of `seconds` seconds of silence, as base64. */
function wav(seconds: number): string {
  const data = Math.round(seconds * 32000), bytes = new Uint8Array(44 + data), view = new DataView(bytes.buffer);
  const text = (at: number, value: string): void => { for (let i = 0; i < value.length; i++) bytes[at + i] = value.charCodeAt(i); };
  text(0, 'RIFF'); view.setUint32(4, 36 + data, true); text(8, 'WAVE'); text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, data, true);
  for (let i = 0; i < data; i += 2) bytes[44 + i] = 7;
  return Buffer.from(bytes).toString('base64');
}
interface Call { url: string; headers: Record<string, string>; body: { audio: string; mediaType: string } }
function world(options: { reply?: () => Response | Promise<Response>; key?: boolean; limits?: Partial<Limits> } = {}) {
  const clock = { now: Date.UTC(2026, 9, 15, 12, 0, 0) }, calls: Call[] = [], saves: Stored[] = [];
  const limits: Limits = { dailyCapMicro: HARD_CAP_MICRO, playerRequests: 200, playerMicro: 50000, freePerMinute: { openrouter: 20, gateway: 20 }, freePerDay: {}, ...options.limits };
  const fetcher = async (url: string, init?: object): Promise<unknown> => {
    const { headers, body } = init as { headers: Record<string, string>; body: string };
    calls.push({ url, headers, body: JSON.parse(body) as Call['body'] });
    return options.reply ? options.reply() : new Response(JSON.stringify({ text: ' Good  morning,\nMama Tolani. ', segments: [], language: 'en', durationInSeconds: 4.2, warnings: [] }), { status: 200 });
  };
  const router = createRouter({ now: () => clock.now, fetch: fetcher, provider: (name) => (name === 'gateway' && options.key !== false ? { key: 'secret-gateway-key', baseUrl: 'https://ai-gateway.vercel.sh' } : null), setting: () => undefined, limits: () => limits, load: async () => undefined, save: async (stored) => { saves.push(structuredClone(stored)); } });
  return { router, calls, saves, fetcher, clock };
}

test('the request is the gateway documented one: the model in a header, base64 audio and its type in the body, the key only in Authorization', async () => {
  const w = world(), audio = wav(3);
  const got = await transcribe(w.router, w.fetcher, { audioBase64: audio, mediaType: 'audio/wav', playerId: 'p_1' });
  assert.ok(got.ok);
  assert.equal(got.ok && got.text, 'Good morning, Mama Tolani.', 'the transcript is made plain');
  assert.equal(w.calls.length, 1);
  const call = w.calls[0]!;
  assert.equal(call.url, 'https://ai-gateway.vercel.sh/v4/ai/transcription-model');
  assert.deepEqual([call.headers['ai-model-id'], call.headers['ai-gateway-protocol-version'], call.headers['ai-transcription-model-specification-version'], call.headers['Authorization']], [DEFAULT_STT_MODEL, '0.0.1', '4', 'Bearer secret-gateway-key']);
  assert.deepEqual(call.body, { audio, mediaType: 'audio/wav' });
  assert.ok(!JSON.stringify(got).includes('secret-gateway-key'));
});

test('the cost is the seconds the provider reported at the model price, booked under the day cap; nothing of the audio is kept', async () => {
  const w = world(), audio = wav(4);
  const got = await transcribe(w.router, w.fetcher, { audioBase64: audio, mediaType: 'audio/wav', playerId: 'p_1' });
  assert.ok(got.ok);
  // 4.2 s at 27.78 millionths of a dollar a second = 117 (US$0.10 an hour).
  assert.equal(got.ok && got.costMicro, Math.round(4.2 * NO_TRAINING[DEFAULT_STT_MODEL]!));
  const today = w.router.today();
  assert.equal(today.ledger.micro, got.ok ? got.costMicro : -1);
  assert.deepEqual(today.ledger.byPurpose['transcribe'], { n: 1, micro: got.ok ? got.costMicro : -1 });
  assert.equal(today.ledger.players['p_1']?.n, 1);
  assert.equal(today.reservedMicro, 0, 'the reservation is released');
  // The ledger that is saved holds numbers only: no audio, no words.
  const saved = JSON.stringify(w.saves.at(-1) ?? w.router.stored());
  assert.ok(!saved.includes(audio.slice(0, 40)) && !saved.includes('Mama Tolani'));
});

test('only a model the gateway lists as not training on audio is used: a setting naming any other is replaced by the default', async () => {
  assert.equal(sttModel('some/free-transcriber'), DEFAULT_STT_MODEL);
  assert.equal(sttModel(undefined), DEFAULT_STT_MODEL);
  assert.equal(sttModel('openai/gpt-4o-transcribe'), 'openai/gpt-4o-transcribe');
  assert.ok(!Object.keys(NO_TRAINING).some((id) => /free|fish-audio/.test(id)), 'no free model and none that keeps data by default');
  const w = world(), audio = wav(2);
  await transcribe(w.router, w.fetcher, { audioBase64: audio, mediaType: 'audio/wav', playerId: 'p_1', model: 'fish-audio/transcribe-1' });
  assert.equal(w.calls[0]?.headers['ai-model-id'], DEFAULT_STT_MODEL);
});

test('size and type: too long, too big, not base64, an unknown type and a tiny file are refused before anything is spent or sent', async () => {
  const w = world();
  const run = (audioBase64: string, mediaType = 'audio/wav') => transcribe(w.router, w.fetcher, { audioBase64, mediaType, playerId: 'p_1' });
  assert.deepEqual(await run(wav(60)), { ok: false, why: 'too_big' }, 'a minute of 16 kHz WAV is over the byte limit');
  assert.deepEqual(await run(wav(22)), { ok: false, why: 'too_long' }, 'under the byte limit but over the seconds');
  assert.deepEqual(await run(Buffer.alloc(MAX_AUDIO_BYTES + 10).toString('base64'), 'audio/ogg'), { ok: false, why: 'too_big' });
  assert.deepEqual(await run('not base64 !!!'), { ok: false, why: 'bad_audio' });
  assert.deepEqual(await run(wav(2), 'audio/webm'), { ok: false, why: 'bad_audio' }, 'WebM is not accepted by the model, so not by the route');
  assert.deepEqual(await run(Buffer.from('RIFFxxxxWAVE' + 'x'.repeat(300)).toString('base64')), { ok: false, why: 'bad_audio' });
  assert.deepEqual(await run(Buffer.alloc(40).toString('base64')), { ok: false, why: 'empty' });
  assert.equal(w.calls.length, 0);
  assert.equal(w.router.today().ledger.micro, 0);
  assert.equal(checkAudio(wav(10), 'audio/wav').ok, true);
});

test('the budget and the person caps are the router ones: the day cap, the person cap, a failure costs nothing, and no key is off', async () => {
  const audio = wav(2);
  const ask = (w: ReturnType<typeof world>, playerId = 'p_1') => transcribe(w.router, w.fetcher, { audioBase64: audio, mediaType: 'audio/wav', playerId });
  // The day's cap: the worst case (20 s) must fit.
  const capped = world({ limits: { dailyCapMicro: 100 } });
  assert.deepEqual(await ask(capped), { ok: false, why: 'budget' });
  assert.equal(capped.calls.length, 0, 'refused before a request is sent');
  // The person's cap.
  const poor = world({ limits: { playerMicro: 100 } });
  assert.deepEqual(await ask(poor), { ok: false, why: 'player-cap' });
  const few = world({ limits: { playerRequests: 1 } });
  assert.ok((await ask(few)).ok);
  assert.deepEqual(await ask(few), { ok: false, why: 'player-cap' });
  assert.ok((await ask(few, 'p_2')).ok, 'another person is not affected');
  // A provider failure books nothing.
  const down = world({ reply: () => new Response('no', { status: 500 }) });
  assert.deepEqual(await ask(down), { ok: false, why: 'failed' });
  assert.equal(down.router.today().ledger.micro, 0);
  const odd = world({ reply: () => new Response('<html>', { status: 200 }) });
  assert.deepEqual(await ask(odd), { ok: false, why: 'failed' });
  const throws = world({ reply: () => { throw new Error('socket'); } });
  assert.deepEqual(await ask(throws), { ok: false, why: 'failed' });
  // No gateway key: off.
  assert.deepEqual(await ask(world({ key: false })), { ok: false, why: 'off' });
  // Silence comes back as an empty transcript.
  const silent = world({ reply: () => new Response(JSON.stringify({ text: '   ', durationInSeconds: 2 }), { status: 200 }) });
  assert.deepEqual(await ask(silent), { ok: false, why: 'empty' });
});

test('parallel recordings cannot all pass the same check: money in flight counts', async () => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  // The cap leaves room for one worst case (20 s * 27.78 = 556) and a little more.
  const w = world({ limits: { dailyCapMicro: 700 }, reply: async () => { await gate; return new Response(JSON.stringify({ text: 'hi', durationInSeconds: 2 }), { status: 200 }); } });
  const audio = wav(2), one = transcribe(w.router, w.fetcher, { audioBase64: audio, mediaType: 'audio/wav', playerId: 'p_1' });
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.deepEqual(await transcribe(w.router, w.fetcher, { audioBase64: audio, mediaType: 'audio/wav', playerId: 'p_2' }), { ok: false, why: 'budget' });
  release();
  assert.ok((await one).ok);
});

test('transcripts are made safe to show: control characters and angle brackets go, one line, 300 characters', () => {
  assert.equal(cleanTranscript('hello\u0000 <b>there</b>\n\nfriend'), 'hello b there /b friend');
  assert.equal(cleanTranscript('x'.repeat(500)).length, 300);
  assert.equal(cleanTranscript(42), '');
});
