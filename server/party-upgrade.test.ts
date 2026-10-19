// OWNER: social - the owambe upgrade over HTTP (WOW-PLAN Phase 7, docs/FESTIVALS.md): everyone who came is remembered for the "who came"
// card (a guest let in during the party, the guests inside when it starts), the house view names them, and ending the party answers the
// card's facts. Spraying stays a counted cheer: no money moves (server/party.test.ts checks the cash).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import type { Device } from './test-fixture.ts';

type Json = Record<string, any>;

async function world(t: Parameters<typeof fixture>[0]) {
  const f = await fixture(t);
  const read = async (response: Response): Promise<Json> => ({ ...(await response.json() as object), status: response.status });
  const get = async (path: string, who: Device): Promise<Json> => read(await f.request(path, null, who.cookie));
  const post = async (path: string, body: object, who: Device): Promise<Json> => read(await f.request(path, body, who.cookie));
  const player = async (name: string): Promise<Device> => { const who = await f.device(name); await get('/api/life?city=lagos', who); await get('/api/social/me', who); return who; };
  async function host(name: string): Promise<Device> {
    const who = await player(name);
    const trip = await post('/api/action', { actionId: f.id(), cityId: 'lagos', type: 'travel', id: 'home', mode: 'trek' }, who);
    assert.equal(trip.ok, true, JSON.stringify(trip));
    f.advance((trip.state.activeAction.duration + 1) * 1000);
    await get('/api/life?city=lagos', who);
    const { ws } = await f.socket(who);
    ws.removeAllListeners('message');
    const seen: { type: string }[] = [];
    ws.on('message', (data) => seen.push(JSON.parse(data.toString()) as { type: string }));
    ws.send(JSON.stringify({ type: 'join', cityId: 'lagos', venueId: 'home' }));
    for (let i = 0; i < 600 && !seen.some((m) => m.type === 'presence'); i++) await new Promise((resolve) => setTimeout(resolve, 5));
    return who;
  }
  const befriend = async (a: Device, b: Device): Promise<void> => {
    assert.equal((await post('/api/social/friends/request', { to: a.id, cityId: 'lagos' }, b)).ok, true);
    assert.equal((await post('/api/social/friends/answer', { from: b.id, accept: true, cityId: 'lagos' }, a)).code, 'accepted');
  };
  return { f, get, post, player, host, befriend };
}

test('who came: guests inside at the start and guests let in later are named; the end answers the card; a spray moves no money', async (t) => {
  const w = await world(t);
  const ada = await w.host('Ada'), bola = await w.player('Bola'), tunde = await w.player('Tunde');
  await w.befriend(ada, bola); await w.befriend(ada, tunde);
  assert.equal((await w.post('/api/social/visit/enter', { host: ada.id }, bola)).code, 'inside');
  const started = await w.post('/api/social/visit/party/start', { title: 'Ada turns 30', colour: 'gold' }, ada);
  assert.deepEqual(started.house.party.came, ['Bola'], 'a guest already inside came');
  const entered = await w.post('/api/social/visit/enter', { host: ada.id }, tunde);
  assert.equal(entered.code, 'inside');
  assert.deepEqual(entered.house.party.came, ['Bola', 'Tunde'], 'a guest let in during the party came');
  const cash = (await w.get('/api/life?city=lagos', tunde)).state.cash;
  assert.equal((await w.post('/api/social/visit/party/spray', { host: ada.id }, tunde)).ok, true);
  assert.equal((await w.get('/api/life?city=lagos', tunde)).state.cash, cash, 'the notes fly; no money moves');
  assert.equal((await w.post('/api/social/visit/end', {}, bola)).ok, true, 'Bola goes home');
  const ended = await w.post('/api/social/visit/party/end', {}, ada);
  assert.equal(ended.ok, true, JSON.stringify(ended));
  assert.deepEqual(ended.card, { title: 'Ada turns 30', colour: { id: 'gold', label: 'Gold', hex: '#d9a21b' }, sprays: 1, came: ['Bola', 'Tunde'] }, 'someone who left still came');
  assert.equal(ended.house.party, undefined);
});
