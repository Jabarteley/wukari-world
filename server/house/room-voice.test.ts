// OWNER: agents — an AI character's line in a place is also sent as speakable text to the people in the place's voice circle, and only to them (Phase 15). On a real server:
// the person in voice gets a `voice-text` frame with the character's voice seed and where it stands; the person who is not in voice gets the chat line only; the seed is the one the
// character has on a call; and an AI character receives nothing from room voice.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixture } from '../test-fixture.ts';
import { voiceSeedOf } from '../voice-seed.ts';
import type { ServerFrame } from '../../src/types/protocol.ts';

const HOUR = 3600000;
const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
type Chat = Extract<ServerFrame, { type: 'chat' }>;
type Spoken = Extract<ServerFrame, { type: 'voice-text' }>;

test('a house agent’s reply reaches the voice circle as speakable text with its voice seed and place, and not the people outside voice', async (t) => {
  const f = await fixture(t);
  f.advance(9 * HOUR - f.now()); // 10:00 Lagos
  const listen = async (name: string) => {
    const device = await f.device(name);
    await f.request('/api/life?city=lagos', undefined, device.cookie);
    const page = await f.socket(device);
    const frames: ServerFrame[] = [];
    page.ws.on('message', (data) => { frames.push(JSON.parse(data.toString()) as ServerFrame); });
    page.ws.send(JSON.stringify({ type: 'join', cityId: 'lagos', venueId: 'park' }));
    return { page, frames, device };
  };
  const ada = await listen('Ada'), ben = await listen('Ben');
  await pause(80);
  f.server.beat(); await pause(80);
  ada.page.ws.send(JSON.stringify({ type: 'voice-state', enabled: true, muted: true }));
  await pause(60);
  ada.page.ws.send(JSON.stringify({ type: 'chat', clientId: 'c1', body: 'hello Tunji' }));
  await pause(200);
  const chatOf = (frames: ServerFrame[]): Chat | undefined => frames.find((frame): frame is Chat => frame.type === 'chat' && frame.from.id.startsWith('house.') && /Ada/.test(frame.body));
  const reply = chatOf(ada.frames);
  assert.ok(reply, 'the agent answered in the place');
  assert.ok(chatOf(ben.frames), 'and the person outside voice reads the same line');
  const spokenAda = ada.frames.filter((frame): frame is Spoken => frame.type === 'voice-text');
  assert.equal(spokenAda.length, 1);
  assert.deepEqual([spokenAda[0]!.body, spokenAda[0]!.id, spokenAda[0]!.from.id, spokenAda[0]!.voiceSeed], [reply.body, reply.id, reply.from.id, voiceSeedOf(reply.from.id)]);
  assert.equal(reply.voiceSeed, spokenAda[0]!.voiceSeed, 'the same voice in chat and in voice');
  assert.equal((spokenAda[0]!.from as { agent?: boolean }).agent, true, 'still marked AI-played');
  assert.ok(Number.isFinite(spokenAda[0]!.x) && Number.isFinite(spokenAda[0]!.z), 'with where the agent stands, for near and far');
  assert.equal(ben.frames.filter((frame) => frame.type === 'voice-text').length, 0, 'not to people who are not in voice');
  // Ben joins voice: the next line reaches him too. A person's own line is never a voice-text frame (people speak with their own voices).
  ben.page.ws.send(JSON.stringify({ type: 'voice-state', enabled: true, muted: true }));
  await pause(60);
  const before = ben.frames.filter((frame) => frame.type === 'voice-text').length;
  ada.page.ws.send(JSON.stringify({ type: 'chat', clientId: 'c2', body: 'hello again Tunji' }));
  await pause(250);
  assert.equal(ben.frames.filter((frame) => frame.type === 'voice-text').length, before + 1);
  assert.ok(ada.frames.filter((frame): frame is Spoken => frame.type === 'voice-text').every((frame) => frame.from.id.startsWith('house.')), 'only AI characters’ lines');
});
