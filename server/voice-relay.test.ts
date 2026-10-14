// Room voice gets the calls' relay (server/voice-relay.ts): a player standing in a room is given relay servers when the relay is on and a
// limit allows, STUN only when it is off or limited, and nothing at all while they stand in no room.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import type { CallRelay, RelayIssue } from './call-relay.ts';

function stubRelay(answer: () => RelayIssue): CallRelay & { asked: string[] } {
  const asked: string[] = [];
  return { asked, configured: true, limits: { perPlayerPerDay: 30, perAddressPerHour: 120, dailyCeiling: 3000 }, mintsToday: () => asked.length,
    async issue(player) { asked.push(player); return answer(); } };
}
interface Voice { status: number; turnConfigured?: boolean; mode?: string; iceServers?: { urls: string | string[]; username?: string }[]; error?: string }
const voiceOf = async (f: Awaited<ReturnType<typeof fixture>>, cookie: string): Promise<Voice> => { const res = await f.request('/api/voice-config', null, cookie); return { status: res.status, ...(await res.json() as object) }; };

test('a player in the Square is given the relay when it is on, STUN only when it is limited, and nothing outside a room', async (t) => {
  let limited = false, clock = (): number => 0;
  const relay = stubRelay(() => (limited ? { relay: 'limited' } : { relay: 'on', iceServers: [{ urls: ['turn:turn.example.test:3478?transport=udp', 'turns:turn.example.test:443?transport=tcp'], username: 'user', credential: 'secret' }], expiresAt: clock() + 3600000 }));
  const f = await fixture(t, { callRelay: relay });
  clock = f.now; // the relay's credentials expire by the server's own clock
  const ada = await f.device('Ada');
  await f.request('/api/life?city=lagos', null, ada.cookie); await f.request('/api/social/me', null, ada.cookie);
  assert.equal((await voiceOf(f, ada.cookie)).status, 403, 'no room, no voice settings');
  assert.equal(relay.asked.length, 0, 'and the relay is not asked');
  const socket = await f.socket(ada);
  socket.ws.send(JSON.stringify({ type: 'join', place: 'square' }));
  await socket.next();
  const on = await voiceOf(f, ada.cookie);
  assert.equal(on.status, 200);
  assert.deepEqual([on.turnConfigured, on.mode], [true, 'turn']);
  assert.ok(on.iceServers?.some((server) => [server.urls].flat().some((url) => url.startsWith('turn'))), 'relay servers are in the answer');
  assert.ok(on.iceServers?.some((server) => [server.urls].flat().some((url) => url.startsWith('stun'))), 'and STUN still comes first for a direct path');
  assert.deepEqual(relay.asked, [ada.id]);
  limited = true;
  const off = await voiceOf(f, ada.cookie);
  assert.deepEqual([off.status, off.turnConfigured, off.mode], [200, false, 'stun-only'], 'a limit reached is not an error: voice goes on with STUN only');
});
