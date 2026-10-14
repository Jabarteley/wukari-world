// OWNER: agents — house agents on a real server: they stand in a real venue room, the pulse counts them as AI, a person's line wakes one, and the
// admin switch removes them. Written lines only (the test server has no model key).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixture } from '../test-fixture.ts';
import type { ServerFrame } from '../../src/types/protocol.ts';

const HOUR = 3600000;
const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

test('on a real server: the cast appears at its hours, shows in the venue and in the pulse AI count, answers a person with a written line, and goes home after hours', async (t) => {
  const f = await fixture(t);
  f.advance(9 * HOUR - f.now()); // 10:00 Lagos (UTC+1) on the first day
  const ada = await f.device('Ada');
  await f.request('/api/life?city=lagos', undefined, ada.cookie);
  const page = await f.socket(ada);
  const frames: ServerFrame[] = [];
  page.ws.on('message', (data) => { frames.push(JSON.parse(data.toString()) as ServerFrame); });
  page.ws.send(JSON.stringify({ type: 'join', cityId: 'lagos', venueId: 'park' }));
  await pause(60);
  f.server.beat(); await pause(60);

  const pulse = async (): Promise<{ ai?: number; aiCities?: Record<string, number> }> => { f.advance(4000); return await (await f.request('/api/world/pulse', undefined, ada.cookie)).json() as { ai?: number; aiCities?: Record<string, number> }; };
  const seen = await pulse();
  assert.equal(seen.ai, 2, 'the seller and the guide are counted as AI');
  assert.equal(seen.aiCities?.['lagos'], 2);

  const presence = frames.filter((frame) => frame.type === 'presence' || frame.type === 'presence-delta');
  const members = JSON.stringify(presence);
  assert.match(members, /Tunji/, 'the guide stands in the park and is listed with the people');
  assert.match(members, /"agent":true/, 'with the AI-played mark');

  page.ws.send(JSON.stringify({ type: 'chat', clientId: 'c1', body: 'hello Tunji' }));
  await pause(150);
  const chats = frames.filter((frame): frame is Extract<ServerFrame, { type: 'chat' }> => frame.type === 'chat');
  const mine = chats.find((chat) => chat.from.name === 'Ada');
  const theirs = chats.find((chat) => chat.from.id.startsWith('house.') && /Ada/.test(chat.body));
  assert.ok(mine && theirs, JSON.stringify(chats));
  assert.equal(theirs.from.name, 'Tunji');
  assert.equal((theirs.from as { agent?: boolean }).agent, true);
  assert.equal(theirs.speaker, 'agent');
  assert.match(theirs.body, /Ada/);

  // Asking "are you an AI?" is answered by the game itself, and does not wake the agent.
  const before = chats.length;
  page.ws.send(JSON.stringify({ type: 'chat', clientId: 'c2', body: 'are you an AI?' }));
  await pause(150);
  assert.equal(frames.filter((frame) => frame.type === 'chat').length, before + 1, 'only the person\'s own line is shown; the game answers with a notice');

  // The hours: the guide goes home at eight in the evening, the cast is gone by midnight.
  f.advance(10.5 * HOUR); f.server.beat(); await pause(60);
  assert.equal((await pulse()).ai ?? 0, 0);

  // And back in the morning they are there again.
  f.advance(14 * HOUR); f.server.beat(); await pause(60);
  assert.equal((await pulse()).ai, 2);
});
