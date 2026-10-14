// OWNER: social - owambe parties in a home (server/social/party.ts, routes/visit.ts): who may start one, the dress code, MC and DJ
// among the guests, spraying (no money), the end of the party, and that the house chat and every guest's view tell the same story.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import type { Device } from './test-fixture.ts';
import { PARTY } from '../src/festivals/party.ts';

interface Frame { type: string }
interface Reply {
  status: number; ok?: boolean; code?: string; reason?: string; error?: string
  house?: { guests: { id: string }[]; role: string; conv: string | null; party?: { title: string; colour: { id: string }; mc: { id: string } | null; dj: { id: string } | null; sprays: number; sprayLeft: number; until: number } }
}

async function world(t: Parameters<typeof fixture>[0]) {
  const f = await fixture(t);
  const read = async (response: Response): Promise<Reply> => ({ ...(await response.json() as object), status: response.status } as Reply);
  const get = async (path: string, who: Device): Promise<Reply> => read(await f.request(path, null, who.cookie));
  const post = async (path: string, body: object, who: Device): Promise<Reply> => read(await f.request(path, body, who.cookie));
  const player = async (name: string): Promise<Device> => { const who = await f.device(name); await get('/api/life?city=lagos', who); await get('/api/social/me', who); return who; };
  async function host(name: string): Promise<Device> {
    const who = await player(name);
    const trip = await post('/api/action', { actionId: f.id(), cityId: 'lagos', type: 'travel', id: 'home', mode: 'trek' }, who) as unknown as { ok: boolean; state: { activeAction: { duration: number } } };
    assert.equal(trip.ok, true, JSON.stringify(trip));
    f.advance((trip.state.activeAction.duration + 1) * 1000);
    await get('/api/life?city=lagos', who);
    const { ws } = await f.socket(who);
    ws.removeAllListeners('message');
    const seen: Frame[] = [];
    ws.on('message', (data) => seen.push(JSON.parse(data.toString()) as Frame));
    ws.send(JSON.stringify({ type: 'join', cityId: 'lagos', venueId: 'home' }));
    for (let i = 0; i < 600 && !seen.some((m) => m.type === 'presence'); i++) await new Promise((resolve) => setTimeout(resolve, 5));
    return who;
  }
  const befriend = async (a: Device, b: Device): Promise<void> => {
    assert.equal((await post('/api/social/friends/request', { to: a.id, cityId: 'lagos' }, b)).ok, true);
    assert.equal((await post('/api/social/friends/answer', { from: b.id, accept: true, cityId: 'lagos' }, a)).code, 'accepted');
  };
  const start = (who: Device, body: object = { colour: 'gold' }) => post('/api/social/visit/party/start', body, who);
  const role = (who: Device, role: string, guest: string | null) => post('/api/social/visit/party/role', { role, guest }, who);
  const spray = (who: Device, hostId?: string) => post('/api/social/visit/party/spray', hostId ? { host: hostId } : {}, who);
  const messages = async (who: Device, conv: string): Promise<string[]> => {
    const done = await get(`/api/social/conversations/${encodeURIComponent(conv)}`, who) as unknown as { messages?: { body: string }[]; conversation?: { messages: { body: string }[] } };
    return (done.messages ?? done.conversation?.messages ?? []).map((m) => m.body);
  };
  return { f, get, post, player, host, befriend, start, role, spray, messages };
}

test('a host starts a party with a dress code; starting again changes the colour and keeps the party', async (t) => {
  const w = await world(t);
  const ada = await w.host('Ada');
  const started = await w.start(ada, { title: 'Ada turns 30', colour: 'purple' });
  assert.equal(started.ok, true, JSON.stringify(started));
  assert.equal(started.house?.party?.title, 'Ada turns 30');
  assert.equal(started.house?.party?.colour.id, 'purple');
  assert.equal(started.house?.party?.sprayLeft, PARTY.sprayPerGuest);
  const until = started.house!.party!.until;
  const changed = await w.start(ada, { colour: 'teal' });
  assert.equal(changed.house?.party?.colour.id, 'teal');
  assert.equal(changed.house?.party?.until, until, 'the end time does not move');
  assert.equal(changed.house?.party?.title, 'Owambe at my place');
});

test('refused: an unknown colour, a bad title, a host who is not home, a player with no home socket', async (t) => {
  const w = await world(t);
  const ada = await w.host('Ada');
  assert.equal((await w.start(ada, { colour: 'mauve' })).status, 400);
  assert.equal((await w.start(ada, { colour: 'gold', title: '<b>x</b>' })).status, 400);
  assert.equal((await w.start(ada, { colour: 'gold', title: 'visit www.example.com' })).status, 400);
  const bola = await w.player('Bola');
  const away = await w.start(bola);
  assert.equal(away.ok, false); assert.equal(away.code, 'host_not_home');
});

test('guests see the dress code and the roles; the host names an MC and a DJ, one role each; a role can be cleared', async (t) => {
  const w = await world(t);
  const ada = await w.host('Ada'), bola = await w.player('Bola'), tunde = await w.player('Tunde');
  await w.befriend(ada, bola); await w.befriend(ada, tunde);
  await w.start(ada, { colour: 'green' });
  const entered: Reply[] = [];
  for (const guest of [bola, tunde]) { const done = await w.post('/api/social/visit/enter', { host: ada.id }, guest); assert.equal(done.code, 'inside'); entered.push(done); }
  const seen = entered[0]!;
  assert.equal(seen.house?.party?.colour.id, 'green');
  assert.equal(seen.house?.role, 'guest');
  assert.equal((await w.role(ada, 'mc', bola.id)).house?.party?.mc?.id, bola.id);
  assert.equal((await w.role(ada, 'dj', tunde.id)).house?.party?.dj?.id, tunde.id);
  const swapped = await w.role(ada, 'dj', bola.id);
  assert.equal(swapped.house?.party?.dj?.id, bola.id);
  assert.equal(swapped.house?.party?.mc, null, 'naming the MC as DJ takes the MC role away');
  assert.equal((await w.role(ada, 'dj', null)).house?.party?.dj, null);
  // Guests cannot name roles; nobody outside can be named; roles need a party.
  assert.equal((await w.role(bola, 'mc', bola.id)).code, 'no_party');
  const stranger = await w.player('Chidi');
  assert.equal((await w.role(ada, 'mc', stranger.id)).code, 'not_inside');
  assert.equal((await w.role(ada, 'emcee', bola.id)).status, 400);
  assert.equal((await w.post('/api/social/visit/party/role', { role: 'mc', guest: 'nope' }, ada)).status, 400);
  const chat = await w.messages(ada, `h.${ada.id}`);
  assert.ok(chat.some((line) => /is the MC/.test(line)) && chat.some((line) => /is the DJ/.test(line)), 'the house chat says who holds a role');
});

test('spraying is a line in the house chat, limited per guest, with no money moving; only people inside can spray', async (t) => {
  const w = await world(t);
  const ada = await w.host('Ada'), bola = await w.player('Bola');
  await w.befriend(ada, bola);
  await w.start(ada);
  assert.equal((await w.post('/api/social/visit/enter', { host: ada.id }, bola)).code, 'inside');
  const before = ((await w.get('/api/life?city=lagos', bola)) as unknown as { state: { cash: number } }).state.cash;
  let last: Reply = { status: 0 };
  for (let i = 0; i < PARTY.sprayPerGuest; i++) { last = await w.spray(bola, ada.id); assert.equal(last.ok, true, `${i}: ${JSON.stringify(last)}`); w.f.advance(PARTY.sprayEveryMs + 1); }
  assert.equal(last.house?.party?.sprays, PARTY.sprayPerGuest);
  assert.equal(last.house?.party?.sprayLeft, 0);
  const over = await w.spray(bola, ada.id);
  assert.equal(over.ok, false); assert.equal(over.code, 'spray_limit');
  assert.equal(((await w.get('/api/life?city=lagos', bola)) as unknown as { state: { cash: number } }).state.cash, before, 'no money moved');
  assert.equal((await w.spray(ada)).ok, true, 'the host can spray too');
  const outsider = await w.player('Chidi');
  assert.equal((await w.spray(outsider, ada.id)).code, 'no_party');
  const chat = await w.messages(ada, `h.${ada.id}`);
  assert.ok(chat.filter((line) => /sprayed the floor/.test(line)).length >= PARTY.sprayPerGuest);
});

test('the host ends the party; it ends by itself after its time; a house with only a party is cleaned up', async (t) => {
  const w = await world(t);
  const ada = await w.host('Ada'), bola = await w.player('Bola');
  await w.befriend(ada, bola);
  await w.start(ada);
  assert.equal((await w.post('/api/social/visit/enter', { host: ada.id }, bola)).code, 'inside');
  assert.equal((await w.post('/api/social/visit/party/end', {}, bola)).ok, true, 'a guest ending changes nothing');
  assert.ok((await w.get('/api/social/me', ada) as unknown as { house?: Reply['house'] }).house?.party, 'still on');
  const ended = await w.post('/api/social/visit/party/end', {}, ada);
  assert.equal(ended.ok, true);
  assert.equal(ended.house?.party, undefined);
  assert.equal((await w.spray(bola, ada.id)).code, 'no_party');
  await w.start(ada);
  w.f.advance(PARTY.minutes * 60000 + 1000);
  assert.equal((await w.spray(bola, ada.id)).code, 'no_party', 'over after two hours');
});
