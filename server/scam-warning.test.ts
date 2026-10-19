import { loadCityContent as preloadCityContent } from '../src/game/cities/registry.ts';
await preloadCityContent('lagos');
// OWNER: moderation — the scam warning (docs/WOW-PLAN.md Phase 0): a line that asks for money, a withdrawal, an account number or a code is delivered as typed but
// flagged `scam: true` for the people who read it, in room chat, direct messages and feed replies; the sender's own copy and ordinary lines carry no flag; a post
// the existing rules refuse is still refused.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fixture } from './test-fixture.ts';
import type { Device, TestSocket } from './test-fixture.ts';

type Json = Record<string, any>;
const SCAM = 'send me 5k make I help you withdraw';
const FRIENDLY = 'How far? The Square is full tonight';
const json = async (res: Response): Promise<Json> => ({ status: res.status, ...((await res.json()) as Json) });
const say = (peer: TestSocket, message: object) => peer.ws.send(JSON.stringify(message));
async function until(peer: TestSocket, type: string, match: (frame: Json) => boolean = () => true): Promise<Json> {
  for (let i = 0; i < 300; i++) { const frame = (await peer.next()) as Json; if (frame.type === type && match(frame)) return frame; }
  throw Error(`No ${type} message`);
}

test('scam warning: direct messages carry the flag for the reader only, and ordinary lines carry none', async (t) => {
  const f = await fixture(t);
  const post = async (path: string, body: unknown, who?: Device): Promise<Json> => json(await f.request(path, body, who?.cookie));
  const get = async (path: string, who?: Device): Promise<Json> => json(await f.request(path, null, who?.cookie));
  const ada = await f.device('Ada'), bola = await f.device('Bola');
  await get('/api/social/me', ada); await get('/api/social/me', bola);
  const sent = await post('/api/social/messages', { to: bola.id, body: SCAM, clientId: `c-${randomUUID()}` }, ada);
  assert.equal(sent.code, 'sent');
  assert.equal(sent.message.body, SCAM, 'delivered as typed, never altered');
  assert.equal(sent.message.scam, undefined, 'the sender is not warned about their own line');
  await post('/api/social/messages', { conv: sent.conv.id, body: FRIENDLY, clientId: `c-${randomUUID()}` }, ada);
  const read = await get(`/api/social/conversations/${sent.conv.id}`, bola);
  assert.deepEqual(read.messages.map((m: Json) => [m.body, m.scam]), [[SCAM, true], [FRIENDLY, undefined]]);
  const mine = await get(`/api/social/conversations/${sent.conv.id}`, ada);
  assert.deepEqual(mine.messages.map((m: Json) => m.scam), [undefined, undefined], 'the sender never sees the banner on their own lines');
  // A reply from Bola that warns against scams is not flagged.
  const warn = await post('/api/social/messages', { conv: sent.conv.id, body: 'Nobody can withdraw game naira, this is a scam', clientId: `c-${randomUUID()}` }, bola);
  assert.equal((await get(`/api/social/conversations/${sent.conv.id}`, ada)).messages.at(-1).scam, undefined);
  assert.equal(warn.message.scam, undefined);
});

test('scam warning: a feed reply that asks for money is flagged for other readers, not for its author', async (t) => {
  const f = await fixture(t);
  const post = async (path: string, body: unknown, who?: Device): Promise<Json> => json(await f.request(path, body, who?.cookie));
  const get = async (path: string, who?: Device): Promise<Json> => json(await f.request(path, null, who?.cookie));
  async function player(name: string): Promise<Device> {
    const who = await f.device(name);
    await f.request('/api/life?city=lagos', null, who.cookie);
    await post('/api/growth/hello', { cityId: 'lagos' }, who);
    await post('/api/growth/consent', { cityId: 'lagos', age: 'adult' }, who);
    await get('/api/social/me', who);
    return who;
  }
  const ada = await player('Ada'), chi = await player('Chi');
  const pub = await post('/api/feed/post', { body: 'Owambe this Saturday', vis: 'public' }, ada);
  assert.equal(pub.ok, true);
  assert.equal((await post('/api/feed/reply', { id: pub.post.id, body: FRIENDLY }, chi)).ok, true);
  const replied = await post('/api/feed/reply', { id: pub.post.id, body: SCAM }, chi);
  assert.equal(replied.ok, true, 'a flagged reply is still posted');
  assert.deepEqual(replied.post.thread.map((r: Json) => [r.body, r.scam]), [[FRIENDLY, undefined], [SCAM, undefined]], 'its author does not see the banner');
  const thread = await get(`/api/feed/post?id=${pub.post.id}`, ada);
  assert.deepEqual(thread.post.thread.map((r: Json) => [r.body, r.scam]), [[FRIENDLY, undefined], [SCAM, true]]);
  const stranger = await get(`/api/feed/post?id=${pub.post.id}`);
  assert.equal(stranger.post.thread[1].scam, undefined, 'a reader with no session gets no flag');
});

test('scam warning: a room chat line is flagged for the others in the room and unflagged lines are not', async (t) => {
  const f = await fixture(t);
  const get = async (path: string, who?: Device): Promise<Json> => json(await f.request(path, null, who?.cookie));
  const post = async (path: string, body: unknown, who?: Device): Promise<Json> => json(await f.request(path, body, who?.cookie));
  const host = await f.device('Host'), guest = await f.device('Guest');
  await get('/api/social/me', host); await get('/api/social/me', guest);
  await f.action(host.cookie, { type: 'travel', id: 'home', mode: 'trek' });
  f.advance(20000);
  const h = await f.socket(host), g = await f.socket(guest);
  say(h, { type: 'join', cityId: 'lagos', venueId: 'home' });
  await until(h, 'presence');
  assert.equal((await post('/api/social/house/knock', { host: host.id, cityId: 'lagos' }, guest)).code, 'knocking');
  assert.equal((await post('/api/social/house/answer', { visitor: guest.id, answer: 'accept' }, host)).code, 'accepted');
  say(g, { type: 'join', cityId: 'lagos', venueId: 'home', hostId: host.id });
  await until(g, 'presence');
  say(g, { type: 'chat', body: FRIENDLY, clientId: 'friendly-1' });
  assert.equal((await until(h, 'chat', (m) => m.clientId === 'friendly-1')).scam, undefined);
  say(g, { type: 'chat', body: SCAM, clientId: 'scam-1' });
  const heard = await until(h, 'chat', (m) => m.clientId === 'scam-1');
  assert.equal(heard.body, SCAM, 'delivered as typed');
  assert.equal(heard.scam, true);
  // Fee requests stay refused by the rules that already refuse them.
  say(g, { type: 'chat', body: 'pay 5k to register first', clientId: 'fee-1' });
  assert.equal((await until(g, 'error')).code, 'fee_request');
});
