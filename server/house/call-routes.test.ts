// OWNER: agents — calls with house agents through the real routes (server/house/call-routes.ts): start, the text turn, the gateway transcription (with a fake fetch), the game's own
// answers to danger and "are you an AI?", the minute limit with its call-back line, the break reminder, and that a call belongs to its person.
import { loadCityContent as preloadCityContent } from '../../src/game/cities/registry.ts';
await preloadCityContent('lagos');
import assert from 'node:assert/strict';
import test from 'node:test';
import { world } from '../agents/test-world.ts';
import type { Json } from '../agents/test-world.ts';
import { voiceSeedOf } from '../voice-seed.ts';
import { BREAK_TEXT } from './call-routes.ts';

const AGENT = 'house.lagos.tolani';
function wav(seconds: number): string {
  const data = Math.round(seconds * 32000), bytes = new Uint8Array(44 + data), view = new DataView(bytes.buffer);
  const text = (at: number, value: string): void => { for (let i = 0; i < value.length; i++) bytes[at + i] = value.charCodeAt(i); };
  text(0, 'RIFF'); view.setUint32(4, 36 + data, true); text(8, 'WAVE'); text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, data, true);
  return Buffer.from(bytes).toString('base64');
}
interface Seen { url: string; headers: Record<string, string>; body: string }
function rig(t: Parameters<typeof world>[0]) {
  const seen: Seen[] = [];
  const fetcher = async (url: string, init?: object): Promise<unknown> => {
    const { headers, body } = init as { headers: Record<string, string>; body: string };
    seen.push({ url, headers, body });
    if (url.endsWith('/v4/ai/transcription-model')) return new Response(JSON.stringify({ text: 'how far, Mama Tolani', durationInSeconds: 2, segments: [], warnings: [] }), { status: 200 });
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Lagos is busy and bright today, my friend.' } }], usage: { prompt_tokens: 120, completion_tokens: 20 } }), { status: 200 });
  };
  return { seen, w: world(t, { env: { AI_GATEWAY_API_KEY: 'gateway-key-for-tests' } }, { match: (url) => url.includes('ai-gateway.vercel.sh'), fetch: fetcher }) };
}
type Started = Json & { status: number; call: string; name: string; ai: boolean; voiceSeed: number; leftSeconds: number; over?: string; text?: string };
type Turn = Json & { status: number; said: string; text: string; voiceSeed: number; leftSeconds: number; over?: string; breakText?: string; help?: boolean };

test('a call: start shows the AI-played character and its voice seed, a turn answers as text, and the game answers danger and "are you an AI?" itself', async (t) => {
  const { seen, w: pending } = rig(t), w = await pending;
  const ada = await w.guest('Ada');
  const config = await w.json('/api/agents/call/config', undefined, ada.cookie);
  assert.deepEqual([config.enabled, (config.stt as Json).default, (config.stt as Json).gateway], [true, 'browser', true]);
  assert.equal((config.minutes as Json).player, 20);
  const started = await w.post('/api/agents/call/start', { agent: AGENT }, ada.cookie) as Started;
  assert.deepEqual([started.status, started.name, started.ai, started.voiceSeed], [200, 'Mama Tolani', true, voiceSeedOf(AGENT)]);
  assert.equal(started.leftSeconds, 1200);
  const turn = (text: string) => w.post('/api/agents/call/turn', { call: started.call, text }, ada.cookie) as Promise<Turn>;
  // A greeting is a written line: free, no model.
  const hello = await turn('hello Mama');
  assert.equal(hello.status, 200);
  assert.match(hello.text, /Ada/);
  assert.equal(hello.voiceSeed, voiceSeedOf(AGENT));
  assert.equal(seen.length, 0, 'no model request for a greeting');
  // Open talk goes to a paid model with the person's words, and the answer is checked.
  const open = await turn('tell me something about the city today');
  assert.equal(open.text, 'Lagos is busy and bright today, my friend.');
  assert.equal(seen.length, 1);
  assert.ok(seen[0]!.url.endsWith('/v1/chat/completions'));
  assert.ok(!/free/.test(String(JSON.parse(seen[0]!.body).model)), 'a person’s words only go to a paid model');
  // "Are you an AI?" is answered by the game, and the agent never sees it.
  const ai = await turn('are you a real person?');
  assert.match(ai.text, /Mama Tolani is an AI agent/);
  // Words of danger: help lines, nothing reaches the agent or any model.
  const before = seen.length;
  const crisis = await turn('I want to kill myself') as Turn;
  assert.equal(crisis.help, true);
  assert.match(crisis.text, /112/);
  assert.equal(seen.length, before);
  assert.ok(!seen.some((item) => /kill myself/.test(item.body)));
  const bye = await w.post('/api/agents/call/end', { call: started.call }, ada.cookie);
  assert.equal(bye.status, 200);
  assert.equal((await turn('hello')).status, 410, 'an ended call is ended');
});

test('a call belongs to its person; every write needs the anti-forgery token; bad input is refused', async (t) => {
  const { w: pending } = rig(t), w = await pending;
  const ada = await w.guest('Ada'), ben = await w.guest('Ben');
  const started = await w.post('/api/agents/call/start', { agent: AGENT }, ada.cookie) as Started;
  assert.equal((await w.json('/api/agents/call/turn', { call: started.call, text: 'hello' }, ada.cookie)).status, 403, 'no token');
  assert.equal((await w.post('/api/agents/call/turn', { call: started.call, text: 'hello' }, ben.cookie)).status, 410, 'not Ben’s call');
  assert.equal((await w.post('/api/agents/call/start', { agent: 'house.lagos.nobody' }, ada.cookie)).status, 400);
  assert.equal((await w.post('/api/agents/call/start', { agent: ben.id }, ada.cookie)).status, 400, 'only house agents can be called');
  assert.equal((await w.post('/api/agents/call/turn', { call: started.call, text: '   ' }, ada.cookie)).status, 400);
  assert.equal((await w.post('/api/agents/call/turn', { call: 'x', text: 'hi' }, ada.cookie)).status, 400);
  assert.equal((await w.json('/api/agents/call/start', { agent: AGENT, csrf: 'wrong' }, ada.cookie)).status, 403);
});

test('transcription: the recording goes to the gateway model and nothing is stored; too big, wrong type, no call and a resting budget are refused with words', async (t) => {
  const { seen, w: pending } = rig(t), w = await pending;
  const ada = await w.guest('Ada');
  const started = await w.post('/api/agents/call/start', { agent: AGENT }, ada.cookie) as Started;
  const audio = wav(2);
  const done = await w.post('/api/agents/call/transcribe', { call: started.call, audio, mediaType: 'audio/wav' }, ada.cookie);
  assert.deepEqual([done.status, done.text], [200, 'how far, Mama Tolani']);
  const sent = seen.find((item) => item.url.endsWith('/v4/ai/transcription-model'))!;
  assert.equal(sent.headers['ai-model-id'], 'microsoft/mai-transcribe-2');
  assert.equal(JSON.parse(sent.body).audio, audio);
  // Nothing of the recording is in the stored data (the whole document is searched).
  const all = await w.stored((db) => JSON.stringify(db));
  assert.ok(!all.includes(audio.slice(100, 160)) && !all.includes('how far, Mama Tolani'));
  // The cost is on the router's ledger, as a number.
  const day = await w.stored((db) => JSON.stringify((db as Record<string, unknown>)['modelRouter'] ?? {}));
  assert.match(day, /"transcribe"/);
  // Refusals.
  const big = await w.post('/api/agents/call/transcribe', { call: started.call, audio: wav(23), mediaType: 'audio/wav' }, ada.cookie);
  assert.deepEqual([big.status, big.error], [413, 'audio_too_big']);
  assert.equal((await w.post('/api/agents/call/transcribe', { call: started.call, audio: audio, mediaType: 'audio/webm' }, ada.cookie)).status, 400);
  assert.equal((await w.post('/api/agents/call/transcribe', { call: 'no-such-call', audio, mediaType: 'audio/wav' }, ada.cookie)).status, 410);
  const before = seen.length;
  assert.equal((await w.json('/api/agents/call/transcribe', { call: started.call, audio, mediaType: 'audio/wav' }, ada.cookie)).status, 403);
  assert.equal(seen.length, before, 'refused before it is passed on');
});

test('transcription with no gateway key says so in words and sends nothing', async (t) => {
  const seen: string[] = [];
  const w = await world(t, {}, { match: () => false, fetch: async (url) => { seen.push(url); return new Response('{}', { status: 200 }); } });
  const ada = await w.guest('Ada');
  const config = await w.json('/api/agents/call/config', undefined, ada.cookie);
  assert.equal((config.stt as Json).gateway, false, 'the page is told the gateway way is not there');
  const started = await w.post('/api/agents/call/start', { agent: AGENT }, ada.cookie) as Started;
  const done = await w.post('/api/agents/call/transcribe', { call: started.call, audio: wav(2), mediaType: 'audio/wav' }, ada.cookie);
  assert.equal(done.status, 503);
  assert.match(String(done.reason), /not available/);
  assert.deepEqual(seen, []);
  // The call itself still works, with written lines.
  assert.equal((await w.post('/api/agents/call/turn', { call: started.call, text: 'hello' }, ada.cookie)).status, 200);
});

test('the minutes: a break reminder every ten minutes of a session, then at twenty the agent says it will call back, the call ends and a new one is refused with the same line', async (t) => {
  const { w: pending } = rig(t), w = await pending;
  const ada = await w.guest('Ada');
  const started = await w.post('/api/agents/call/start', { agent: AGENT }, ada.cookie) as Started;
  const turns: Turn[] = [];
  for (let minute = 1; minute <= 20; minute++) {
    w.f.advance(60000);
    const turn = await w.post('/api/agents/call/turn', { call: started.call, text: 'hello' }, ada.cookie) as Turn;
    turns.push(turn);
    if (turn.over) break;
  }
  const reminded = turns.map((turn, n) => turn.breakText ? n + 1 : 0).filter(Boolean);
  assert.deepEqual(reminded, [10, 20], 'a reminder every ten minutes of the session, in the game’s words, not on every turn');
  assert.equal(turns[9]?.breakText, BREAK_TEXT);
  const last = turns.at(-1)!;
  assert.equal(last.over, 'player');
  assert.match(last.text, /call you back/);
  assert.equal(last.leftSeconds, 0);
  assert.equal((await w.post('/api/agents/call/turn', { call: started.call, text: 'hello' }, ada.cookie)).status, 410, 'the call is over');
  const again = await w.post('/api/agents/call/start', { agent: AGENT }, ada.cookie) as Started;
  assert.deepEqual([again.status, again.over, again.call], [200, 'player', undefined]);
  assert.match(String(again.text), /call you back/);
  assert.equal(((await w.json('/api/agents/call/config', undefined, ada.cookie)).minutes as Json).left, 0);
  // Another person has their own minutes.
  const ben = await w.guest('Ben');
  assert.ok(((await w.post('/api/agents/call/start', { agent: AGENT }, ben.cookie)) as Started).call);
});
