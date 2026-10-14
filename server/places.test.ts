// Places: the Square and the rooms of group chats (server/social/places.ts, server/ws/rooms.ts `join` with `place`,
// src/places/model.ts). A place is a room a player stands in without their life moving.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fixture } from './test-fixture.ts';
import { PLACES, PLACES_MS, SQUARE_ROOM, editRoom, placeOfRoom, readRoomLink, roomKeyOf, roomLinkPath, roomTokenOf, starterRoomItems } from '../src/places/model.ts';
import type { Device, TestSocket } from './test-fixture.ts';
import type { PlacedItem } from '../src/types/life.ts';

type Fixture = Awaited<ReturnType<typeof fixture>>;
interface Frame { type: string; code?: string; body?: string; members: { id: string; name: string; enabled: boolean; muted: boolean }[]; from: { id: string }; data?: unknown }
interface RoomReply { id: string; name: string; role: string; members: number; grid: number; items: PlacedItem[]; rev: number; link?: { on: boolean; path?: string }; here: { id: string; member: boolean }[] }
interface Reply {
  status: number; ok?: boolean; code?: string; reason?: string; error?: string
  conv: { id: string }; room: RoomReply; rooms: { id: string; name: string; here: number; link: boolean }[]
  square: { here: number; people: { id: string }[] }
}
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const reply = async (res: Response): Promise<Reply> => { const body: unknown = await res.json(); return { ...(isRecord(body) ? body : {}), status: res.status } as Reply; };
const get = async (f: Fixture, path: string, who?: Device): Promise<Reply> => reply(await f.request(path, null, who?.cookie));
const post = async (f: Fixture, path: string, body: object, who?: Device): Promise<Reply> => reply(await f.request(path, body, who?.cookie));
const next = async (peer: TestSocket): Promise<Frame> => (await peer.next()) as unknown as Frame;
async function until(peer: TestSocket, type: string, code?: string): Promise<Frame> {
  for (let i = 0; i < 300; i++) { const message = await next(peer); if (message.type === type && (code === undefined || message.code === code)) return message; }
  throw Error(`No ${type} message`);
}
const say = (peer: TestSocket, message: object) => peer.ws.send(JSON.stringify(message));
const cid = () => `c-${randomUUID()}`;
const piece = () => `p${randomUUID().replace(/-/g, '').slice(0, 16)}`;

/** `names` have opened the game and are known to the social module. */
async function people(t: Parameters<typeof fixture>[0], names: string[]) {
  const f = await fixture(t);
  const devices: Device[] = [];
  // Each has a life (as a page that tapped Play does) and is known to the social module.
  for (const name of names) { const device = await f.device(name); await get(f, '/api/life?city=lagos', device); await get(f, '/api/social/me', device); devices.push(device); }
  return { f, devices };
}
async function befriend(f: Fixture, a: Device, b: Device) {
  const asked = await post(f, '/api/social/friends/request', { to: b.id, cityId: 'lagos' }, a);
  assert.equal(asked.ok, true, asked.reason ?? asked.error);
  const answered = await post(f, '/api/social/friends/answer', { from: a.id, accept: true, cityId: 'lagos' }, b);
  assert.equal(answered.ok, true, answered.reason ?? answered.error);
}
/** A group of `owner` and `members` (friends of the owner). Answers its id. */
async function group(f: Fixture, owner: Device, members: Device[], name = 'Night shift') {
  for (const member of members) await befriend(f, owner, member);
  const made = await post(f, '/api/social/groups', { name, members: members.map((member) => member.id), clientId: f.id() }, owner);
  assert.equal(made.code, 'created', made.reason ?? made.error);
  return made.conv.id;
}

// ---- the pure model -------------------------------------------------------------------------------------------------------
test('room keys name a place, and nothing else does', () => {
  assert.deepEqual(placeOfRoom(SQUARE_ROOM), { kind: 'square' });
  assert.deepEqual(placeOfRoom(roomKeyOf('g.12')), { kind: 'room', id: 'g.12' });
  for (const room of ['lagos:park', 'lagos:home:someone', 'world:room:h.abc', 'world:room', 'world:square:extra', 'world:other', '', null]) assert.equal(placeOfRoom(room), null, String(room));
});

test('a room link carries the group number and a 22-character key, and nothing malformed is read', () => {
  const key = 'A'.repeat(22), path = roomLinkPath('g.7', key);
  assert.equal(path, `/r/7-${key}`);
  assert.deepEqual(readRoomLink(path.slice(3)), { roomId: 'g.7', key });
  assert.equal(roomTokenOf(path), `7-${key}`);
  for (const token of ['7-short', `0-${key}`, `-${key}`, `7-${key}x`, `7_${key}`, 7, null, undefined]) assert.equal(readRoomLink(token), null, String(token));
  assert.equal(roomTokenOf('/h/abc'), null);
});

test('furniture changes follow the home placement rule, and a repeat changes nothing', () => {
  const start = starterRoomItems();
  assert.ok(start.length >= 3);
  const id = 'pabcdefgh1';
  const added = editRoom(start, { op: 'add', id, itemId: 'potted-plant' });
  assert.ok('items' in added && !added.same && added.items.length === start.length + 1);
  if (!('items' in added)) return;
  const again = editRoom(added.items, { op: 'add', id, itemId: 'potted-plant' });
  assert.ok('items' in again && again.same && again.items.length === added.items.length, 'the same piece is not added twice');
  const clash = editRoom(added.items, { op: 'add', id, itemId: 'plastic-chair' });
  assert.ok('code' in clash && clash.code === 'invalid_placement');
  const first = start[0]!;
  const onto = editRoom(added.items, { op: 'move', id, x: first.x, y: first.y, rot: 0 });
  assert.ok('code' in onto && onto.code === 'invalid_placement', 'two pieces cannot share a tile');
  const outside = editRoom(added.items, { op: 'move', id, x: PLACES.roomGrid + 3, y: 0, rot: 0 });
  assert.ok('code' in outside, 'a piece cannot leave the room');
  const removed = editRoom(added.items, { op: 'remove', id });
  assert.ok('items' in removed && !removed.same && removed.items.length === start.length);
  const gone = editRoom(start, { op: 'remove', id });
  assert.ok('items' in gone && gone.same);
  let items = start;
  for (let i = 0; i < PLACES.roomItems + 5; i++) { const more = editRoom(items, { op: 'add', id: `pfill${String(i).padStart(6, '0')}`, itemId: 'potted-plant' }); if ('items' in more) items = more.items; else { assert.ok(more.code === 'room_full' || more.code === 'no_space'); break; } }
  assert.ok(items.length <= PLACES.roomItems);
});

// ---- the Square -----------------------------------------------------------------------------------------------------------
test('anyone who plays can stand in the Square from any venue, and their life does not move', async (t) => {
  const { f, devices: [ada, bola] } = await people(t, ['Ada', 'Bola']);
  const where = async (): Promise<unknown> => { const life = await get(f, '/api/life?city=lagos', ada!) as unknown as { state?: { location?: unknown } }; return life.state?.location; };
  const before = await where();
  assert.equal(typeof before, 'string');
  const a = await f.socket(ada!), b = await f.socket(bola!);
  say(a, { type: 'join', place: 'square' });
  assert.deepEqual((await until(a, 'presence')).members.map((member) => member.id), [ada!.id]);
  say(b, { type: 'join', place: 'square' });
  await until(b, 'presence');
  assert.deepEqual((await until(a, 'presence')).members.map((member) => member.id).sort(), [ada!.id, bola!.id].sort());
  // chat and moves are the venue's
  say(a, { type: 'chat', body: 'hello from the square', clientId: cid() });
  assert.equal((await until(b, 'chat')).body, 'hello from the square');
  say(a, { type: 'move', x: 2, z: 3 });
  await until(b, 'presence');
  // the life going somewhere (a trek home) does not put them out of the Square: a place is not where the life is
  await f.action(ada!.cookie, { type: 'travel', id: 'home', mode: 'trek' });
  f.advance(20000);
  await get(f, '/api/life?city=lagos', ada!);
  say(a, { type: 'chat', body: 'still here', clientId: cid() });
  assert.equal((await until(b, 'chat')).body, 'still here');
  assert.notEqual(await where(), undefined);
  const seen = await get(f, '/api/places/square', bola!);
  assert.equal(seen.square.here, 2);
  assert.deepEqual(seen.square.people.map((person) => person.id), [ada!.id]);
  assert.equal((await get(f, '/api/places', ada!)).square.here, 2);
});

test('voice in the Square: off and muted on join, signalling only between people standing near each other', async (t) => {
  const { f, devices: [ada, bola] } = await people(t, ['Ada', 'Bola']);
  const a = await f.socket(ada!), b = await f.socket(bola!);
  say(a, { type: 'join', place: 'square' }); await until(a, 'presence');
  say(b, { type: 'join', place: 'square' }); const first = await until(b, 'presence');
  assert.ok(first.members.every((member) => member.enabled === false && member.muted === true));
  say(a, { type: 'move', x: 1, z: 1 }); say(b, { type: 'move', x: 2, z: 1 });
  say(a, { type: 'voice-state', enabled: true, muted: false });
  say(a, { type: 'signal', to: bola!.id, data: { probe: 1 } });
  assert.deepEqual((await until(b, 'signal')).data, { probe: 1 });
  say(b, { type: 'move', x: 19, z: 19 });
  say(a, { type: 'move', x: -19, z: -19 });
  say(a, { type: 'signal', to: bola!.id, data: { probe: 2 } });
  assert.equal((await until(a, 'error', 'peer_out_of_range')).code, 'peer_out_of_range');
});

test('a malformed place join is refused, and a venue join still works as before', async (t) => {
  const { f, devices: [ada] } = await people(t, ['Ada']);
  const a = await f.socket(ada!);
  for (const bad of [{ place: 'room' }, { place: 'room', roomId: 'h.abc' }, { place: 'room', roomId: 'g.0' }, { place: 'moon' }]) {
    say(a, { type: 'join', ...bad });
    assert.equal((await until(a, 'error')).code, 'invalid_room', JSON.stringify(bad));
  }
  say(a, { type: 'join', place: 'room', roomId: 'g.999' });
  assert.equal((await until(a, 'error')).code, 'not_admitted', 'a room that is not there admits nobody');
  say(a, { type: 'join', cityId: 'lagos', venueId: 'park' });
  assert.deepEqual((await until(a, 'presence')).members.map((member) => member.id), [ada!.id]);
});

// ---- a group's room ---------------------------------------------------------------------------------------------------------
test('a group has a room its members stand in and furnish together; a stranger is not admitted', async (t) => {
  const { f, devices: [ada, bola, chidi] } = await people(t, ['Ada', 'Bola', 'Chidi']);
  const id = await group(f, ada!, [bola!]);
  const listed = await get(f, '/api/places', bola!);
  assert.deepEqual(listed.rooms.map((room) => [room.id, room.name, room.link]), [[id, 'Night shift', false]]);

  const seen = await get(f, `/api/places/room?id=${id}`, ada!);
  assert.equal(seen.code, 'ok', seen.reason);
  assert.equal(seen.room.role, 'member'); assert.equal(seen.room.rev, 0); assert.equal(seen.room.grid, PLACES.roomGrid);
  assert.deepEqual(seen.room.items, starterRoomItems(), 'a room nobody has changed shows the starter pieces');
  assert.deepEqual(seen.room.link, { on: false });
  assert.equal((await get(f, `/api/places/room?id=${id}`, chidi!)).code, 'not_admitted');

  // both members stand in it; the stranger's socket is refused
  const a = await f.socket(ada!), b = await f.socket(bola!), c = await f.socket(chidi!);
  say(a, { type: 'join', place: 'room', roomId: id }); await until(a, 'presence');
  say(b, { type: 'join', place: 'room', roomId: id }); await until(b, 'presence');
  say(c, { type: 'join', place: 'room', roomId: id });
  assert.equal((await until(c, 'error')).code, 'not_admitted');
  assert.deepEqual((await get(f, `/api/places/room?id=${id}`, ada!)).room.here.map((person) => [person.id, person.member]), [[bola!.id, true]]);

  // Bola adds a plant; Ada moves it; the same request again changes nothing
  const plant = piece();
  const added = await post(f, '/api/places/room/edit', { id, edit: { op: 'add', id: plant, itemId: 'potted-plant' } }, bola!);
  assert.equal(added.code, 'changed', added.reason); assert.equal(added.room.rev, 1);
  assert.equal((await post(f, '/api/places/room/edit', { id, edit: { op: 'add', id: plant, itemId: 'potted-plant' } }, bola!)).code, 'same');
  const at = added.room.items.find((item) => item.id === plant)!;
  const free = [...Array(PLACES.roomGrid * PLACES.roomGrid).keys()].map((n) => ({ x: n % PLACES.roomGrid, y: Math.floor(n / PLACES.roomGrid) }))
    .find((cell) => { const moved = editRoom(added.room.items, { op: 'move', id: plant, x: cell.x, y: cell.y, rot: 0 }); return 'items' in moved && !moved.same; })!;
  const moved = await post(f, '/api/places/room/edit', { id, edit: { op: 'move', id: plant, x: free.x, y: free.y, rot: 0 } }, ada!);
  assert.equal(moved.code, 'changed', moved.reason); assert.equal(moved.room.rev, 2);
  assert.notDeepEqual(moved.room.items.find((item) => item.id === plant), at);
  assert.equal((await get(f, `/api/places/room?id=${id}`, bola!)).room.rev, 2, 'both members see the same room');

  // refusals: a stranger, an unknown object, a malformed change
  assert.equal((await post(f, '/api/places/room/edit', { id, edit: { op: 'remove', id: plant } }, chidi!)).code, 'not_a_member');
  assert.equal((await post(f, '/api/places/room/edit', { id, edit: { op: 'add', id: piece(), itemId: 'time-machine' } }, ada!)).status, 400);
  assert.equal((await post(f, '/api/places/room/edit', { id, edit: { op: 'move', id: plant, x: -1, y: 0, rot: 0 } }, ada!)).status, 400);
  assert.equal((await post(f, '/api/places/room/edit', { id: 'h.x', edit: { op: 'remove', id: plant } }, ada!)).status, 400);

  // what is stored is the group's own record: the pieces and the count of changes
  await f.flush();
  const stored = await f.server.store.read((db) => db.social?.convs[id]?.room);
  assert.equal(stored?.rev, 2);
  assert.deepEqual(stored?.items, moved.room.items);
});

test('a room link lets a visitor stand in the room, never read or build; switching it off or asking them to leave ends it at once', async (t) => {
  const { f, devices: [ada, bola, chidi] } = await people(t, ['Ada', 'Bola', 'Chidi']);
  const id = await group(f, ada!, [bola!]);
  assert.equal((await post(f, '/api/places/room/link', { id, on: true }, chidi!)).code, 'not_a_member');
  const on = await post(f, '/api/places/room/link', { id, on: true }, ada!);
  assert.equal(on.code, 'on', on.reason);
  const path = on.room.link!.path!, token = path.slice(3);
  assert.match(path, /^\/r\/\d+-[A-Za-z0-9_-]{22}$/);
  assert.equal((await post(f, '/api/places/room/link', { id, on: true }, bola!)).room.link!.path, path, 'switching on again keeps the same link');

  // no session: only the name and the headcount
  const peek = await post(f, '/api/places/room/peek', { token });
  assert.equal(peek.code, 'open'); assert.deepEqual(peek.room, { name: 'Night shift', here: 0 } as unknown as RoomReply);
  assert.equal((await post(f, '/api/places/room/peek', { token: `${token.slice(0, -1)}_` })).code, 'ended');

  // Chidi comes in by the link: a visitor
  const a = await f.socket(ada!), c = await f.socket(chidi!);
  say(a, { type: 'join', place: 'room', roomId: id }); await until(a, 'presence');
  const inside = await post(f, '/api/places/room/enter', { token }, chidi!);
  assert.equal(inside.code, 'inside', inside.reason); assert.equal(inside.room.role, 'visitor'); assert.equal(inside.room.link, undefined, 'a visitor is not told the link');
  say(c, { type: 'join', place: 'room', roomId: id });
  assert.deepEqual((await until(c, 'presence')).members.map((member) => member.id).sort(), [ada!.id, chidi!.id].sort());
  say(c, { type: 'chat', body: 'thanks for having me', clientId: cid() });
  assert.equal((await until(a, 'chat')).body, 'thanks for having me');
  assert.equal((await post(f, '/api/places/room/edit', { id, edit: { op: 'add', id: piece(), itemId: 'potted-plant' } }, chidi!)).code, 'not_a_member');
  assert.equal((await get(f, `/api/social/conversations/${id}`, chidi!)).ok === true, false, 'a visitor does not read the group chat');
  assert.deepEqual((await get(f, `/api/places/room?id=${id}`, ada!)).room.here.map((person) => [person.id, person.member]), [[chidi!.id, false]]);

  // a member asks the visitor to leave: dropped at once, and the link does not let them back
  assert.equal((await post(f, '/api/places/room/remove', { id, player: bola!.id }, ada!)).code, 'is_member');
  assert.equal((await post(f, '/api/places/room/remove', { id, player: chidi!.id }, bola!)).code, 'removed');
  assert.equal((await until(c, 'error', 'place_ended')).code, 'place_ended');
  assert.equal((await post(f, '/api/places/room/enter', { token }, chidi!)).code, 'barred');
  f.advance(PLACES_MS.barred + 1000);
  assert.equal((await post(f, '/api/places/room/enter', { token }, chidi!)).code, 'inside');
  say(c, { type: 'join', place: 'room', roomId: id }); await until(c, 'presence');

  // a new link ends the passes the old one gave; the old link is dead
  const fresh = await post(f, '/api/places/room/link', { id, on: true, fresh: true }, ada!);
  assert.notEqual(fresh.room.link!.path, path);
  assert.equal((await until(c, 'error', 'place_ended')).code, 'place_ended');
  assert.equal((await post(f, '/api/places/room/enter', { token }, chidi!)).code, 'link_ended');
  assert.equal((await post(f, '/api/places/room/enter', { token: fresh.room.link!.path!.slice(3) }, chidi!)).code, 'inside');
  say(c, { type: 'join', place: 'room', roomId: id }); await until(c, 'presence');

  // switching the link off sends every visitor out; members stay
  assert.equal((await post(f, '/api/places/room/link', { id, on: false }, ada!)).code, 'off');
  assert.equal((await until(c, 'error', 'place_ended')).code, 'place_ended');
  say(a, { type: 'chat', body: 'members only again', clientId: cid() });
  assert.equal((await until(a, 'chat')).body, 'members only again');
  assert.equal((await post(f, '/api/places/room/peek', { token: fresh.room.link!.path!.slice(3) })).code, 'ended');
});

test('a pass runs out, and somebody who leaves the group loses the room at the next look', async (t) => {
  const { f, devices: [ada, bola, chidi] } = await people(t, ['Ada', 'Bola', 'Chidi']);
  const id = await group(f, ada!, [bola!]);
  const token = (await post(f, '/api/places/room/link', { id, on: true }, ada!)).room.link!.path!.slice(3);
  assert.equal((await post(f, '/api/places/room/enter', { token }, chidi!)).code, 'inside');
  const b = await f.socket(bola!), c = await f.socket(chidi!);
  say(c, { type: 'join', place: 'room', roomId: id }); await until(c, 'presence');
  f.advance(PLACES_MS.pass + 1000);
  say(c, { type: 'chat', body: 'am I still here?', clientId: cid() });
  assert.equal((await until(c, 'error', 'place_ended')).code, 'place_ended');

  say(b, { type: 'join', place: 'room', roomId: id }); await until(b, 'presence');
  const left = await post(f, `/api/social/groups/${id}`, { op: 'leave', clientId: f.id() }, bola!);
  assert.equal(left.ok, true, left.reason ?? left.error);
  f.advance(20000);
  say(b, { type: 'chat', body: 'I left the group', clientId: cid() });
  assert.equal((await until(b, 'error', 'place_ended')).code, 'place_ended');
});

test('a group saved before rooms existed reads as a room with the starter pieces', async (t) => {
  const { f, devices: [ada] } = await people(t, ['Ada']);
  const id = await group(f, ada!, []);
  assert.equal((await f.server.store.read((db) => db.social?.convs[id]))?.room, undefined);
  const seen = await get(f, `/api/places/room?id=${id}`, ada!);
  assert.deepEqual(seen.room.items, starterRoomItems());
  assert.equal(await f.server.store.read((db) => db.social?.convs[id]?.room), undefined, 'looking at a room writes nothing');
});
