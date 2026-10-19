/**
 * OWNER: social
 * PLACES: the Square and the rooms of group chats. Rooms a player stands in without their life moving, so reaching one is
 * free and instant from any city, for a guest who has only tapped Play as much as for a settled player. The numbers, the room
 * keys and the furniture rule are src/places/model.ts; the design is docs/PLACES.md. Standing in a place is the room socket's
 * `join` with `place` (server/ws/rooms.ts), which asks `placeUntil` here and nothing else.
 *
 * WHO MAY STAND WHERE
 *   the Square     everybody who has tapped Play. Chat, blocks, mutes, reports and the voice circle are the venue rules.
 *   a group room   the group's members, always. Anybody else only while the room's link is on and they hold a pass: a pass
 *                  is given by opening the link (`enter`), lasts PLACES.passHours from the last time they came in, and ends at
 *                  once when a member switches the link off, makes a new link, or asks that visitor to leave.
 * A visitor stands in the room, is seen and heard, and can speak in the room's live chat. A visitor never reads the group's
 * conversation, never appears in its member list and cannot change the furniture: those are the members'.
 * BLOCKS ALWAYS WIN at the door too: somebody the group's owner has a block with gets no pass.
 *
 * FURNITURE IS THE GROUP'S, NOT ANYBODY'S LIFE. A room's pieces come from the furniture catalogue and cost nothing: no life is
 * charged, nothing is owned and nothing can be sold, so there is no money to move exactly once. A change is one `RoomEdit`
 * (src/places/model.ts) applied by the same placement rule a home uses. The page names the id of a piece it adds, so a
 * repeated request adds it once; a repeated remove is answered `same`.
 *
 * WHAT IS STORED (additive: a group saved before this has no `room`, and reads as a room with the starter pieces and no link)
 *   social.convs[g.N].room   { items, rev, link?, passes?, barred? }   written by the first change or the first link
 * Row cost on the Worker: every write here is one row of `social` (the conversation). Reads write nothing.
 */
import { socialService } from './service.ts';
import { presenceOf } from './presence.ts';
import { PLACES, PLACES_MS, ROOM_ITEM_ID, SERVICE, SQUARE_ROOM, editRoom, isServiceKind, isRoomId, readRoomLink, roomKeyOf, roomLinkPath, roomStyle, starterRoomItems } from '../../src/places/model.ts';
import type { RoomEdit } from '../../src/places/model.ts';
import { FURNITURE } from '../../src/game/content/furniture.ts';
import { UUID_PATTERN } from '../protocol.ts';
import type { PlacePerson, RoomSummary, RoomView, SquareView } from '../../src/types/places.ts';
import type { FurnitureId } from '../../src/types/life.ts';
import type { ConversationRecord, Db, GroupRoomRecord, RouteContext, SessionRecord, SocialCollection } from '../types.ts';

const no = <Code extends string>(code: Code, reason: string): { ok: false; code: Code; reason: string } => ({ ok: false, code, reason });
const yes = <Code extends string, const Extra extends object = object>(code: Code, extra?: Extra): { ok: true; code: Code } & Extra => ({ ok: true, code, ...extra } as { ok: true; code: Code } & Extra);

type PlacesService = ReturnType<typeof build>;
const services = new WeakMap<RouteContext, PlacesService>();
export function placesService(ctx: RouteContext): PlacesService {
  const known = services.get(ctx);
  if (known) return known;
  const built = build(ctx);
  services.set(ctx, built);
  return built;
}

/** 22 url-safe characters from 16 random bytes. */
function newKey(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/** Compare two keys without stopping at the first difference. */
function sameKey(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function build(ctx: RouteContext) {
  const social = socialService(ctx), kit = social.kit, presence = presenceOf(ctx);
  const now = (): number => ctx.now();
  const bad = (code: string) => ctx.fail(400, code);
  const roomId = (value: unknown): string => { if (!isRoomId(value)) throw bad('invalid_room'); return value; };

  /** A group conversation by id, whoever asks. */
  const groupOf = (s: SocialCollection | undefined, id: string): ConversationRecord | null => {
    const conv = s && Object.hasOwn(s.convs, id) ? s.convs[id] ?? null : null;
    return conv && conv.kind === 'group' ? conv : null;
  };
  const isMember = (s: SocialCollection, conv: ConversationRecord, id: string): boolean => conv.members.includes(id) && Boolean(s.players[id]?.convs[conv.id]);
  /** Drop what has run out, so a pass or a bar is never read past its time. Changes the record only in a transaction that writes. */
  function live(room: GroupRoomRecord | undefined, t: number): { passes: Record<string, number>; barred: Record<string, number> } {
    const passes: Record<string, number> = {}, barred: Record<string, number> = {};
    for (const [id, until] of Object.entries(room?.passes ?? {})) if (until > t) passes[id] = until;
    for (const [id, until] of Object.entries(room?.barred ?? {})) if (until > t) barred[id] = until;
    return { passes, barred };
  }
  /** The stored room of a group, made on the first write: until then a group has the starter pieces and no link. */
  const roomOf = (conv: ConversationRecord): GroupRoomRecord => conv.room ??= { items: starterRoomItems(), rev: 0 };
  const itemsOf = (conv: ConversationRecord) => (conv.room ? conv.room.items.filter((item) => Object.hasOwn(FURNITURE, item.itemId)) : starterRoomItems());

  /** Until when may this player stand in this place (see the top of the file). Reads only. */
  function placeUntil(db: Db, publicId: string, id: string | null): number {
    if (id === null) return Infinity;
    const s = db.social, conv = groupOf(s, id);
    if (!s || !conv) return 0;
    if (isMember(s, conv, publicId)) return Infinity;
    if (!conv.room?.link) return 0;
    const t = now(), { passes, barred } = live(conv.room, t);
    if (barred[publicId] !== undefined) return 0;
    if (conv.owner && kit.blockedEither(s, publicId, conv.owner)) return 0;
    return passes[publicId] ?? 0;
  }

  const card = (s: SocialCollection, me: string, conv: ConversationRecord | null) => (member: { id: string; look: PlacePerson['look'] }): PlacePerson => {
    // Saved data is untrusted: a card of the wrong shape is no card (the agents module writes it, server/agents/tools-places.ts).
    const stored = s.players[member.id]?.service;
    const service = stored && isServiceKind(stored.kind) && typeof stored.title === 'string' && typeof stored.about === 'string' && stored.title.length <= SERVICE.title && stored.about.length <= SERVICE.about ? { kind: stored.kind, title: stored.title, about: stored.about } : null;
    return { ...kit.pub(s, member.id), look: member.look, friend: kit.areFriends(s, me, member.id), member: conv ? conv.members.includes(member.id) : false, ...(service ? { service } : {}) };
  };
  /** Who stands in a room right now, as `me` may see them (never somebody either has blocked, never themselves). */
  function peopleIn(s: SocialCollection, me: string, room: string, conv: ConversationRecord | null, only: readonly string[] | null = null): PlacePerson[] {
    const list = only ? presence.among(only, room) : presence.inRoom(room);
    const seen = new Set<string>();
    return list.filter((member) => member.id !== me && !seen.has(member.id) && Boolean(seen.add(member.id)) && s.players[member.id] !== undefined && !kit.blockedEither(s, me, member.id)).map(card(s, me, conv));
  }
  const hereCount = (room: string): number => new Set(presence.inRoom(room).map((member) => member.id)).size;

  function view(s: SocialCollection, conv: ConversationRecord, me: string): RoomView {
    const member = isMember(s, conv, me), room = conv.room;
    return {
      id: conv.id, name: conv.name ?? 'Group', role: member ? 'member' : 'visitor', members: conv.members.length,
      grid: PLACES.roomGrid, style: roomStyle(), items: itemsOf(conv).map((item) => ({ id: item.id, itemId: item.itemId, x: item.x, y: item.y, rot: item.rot })), rev: room?.rev ?? 0,
      ...(member ? { link: room?.link ? { on: true, path: roomLinkPath(conv.id, room.link.key) } : { on: false } } : {}),
      here: [...peopleIn(s, me, roomKeyOf(conv.id), conv), ...(ctx.checks?.roomCast?.(conv.id) ?? []).map((cast) => ({ ...cast, look: null, friend: false, member: false }))],
    };
  }
  /** The caller's own group, or the refusal every member-only route answers. */
  function mine(s: SocialCollection, me: string, id: string): { conv: ConversationRecord } | { refusal: ReturnType<typeof no> } {
    const conv = groupOf(s, id);
    return conv && isMember(s, conv, me) ? { conv } : { refusal: no('not_a_member', 'Only members of the group can do that.') };
  }

  return {
    placeUntil,
    /** The Square's headcount and the caller's group rooms, for the door of each. */
    summary(db: Db, session: SessionRecord) {
      const { s, p, id } = kit.enter(db, session);
      const rooms: RoomSummary[] = [];
      for (const convId of Object.keys(p.convs)) {
        const conv = groupOf(s, convId);
        if (conv && isMember(s, conv, id)) rooms.push({ id: conv.id, name: conv.name ?? 'Group', members: conv.members.length, here: hereCount(roomKeyOf(conv.id)), link: Boolean(conv.room?.link) });
      }
      rooms.sort((a, b) => b.here - a.here || a.name.localeCompare(b.name));
      return yes('ok', { square: { here: ctx.checks?.venueCounts?.(SQUARE_ROOM)?.total ?? 0 }, rooms });
    },
    /** The people in the caller's part of the Square (their group of it), with what the scene needs to draw them. */
    square(db: Db, session: SessionRecord) {
      const { s, id } = kit.enter(db, session);
      const mates = ctx.checks?.groupPeers?.(id, SQUARE_ROOM) ?? null, counts = ctx.checks?.venueCounts?.(SQUARE_ROOM) ?? null;
      const square: SquareView = { here: counts?.total ?? 0, groups: counts?.groups ?? 0, people: mates ? peopleIn(s, id, SQUARE_ROOM, null, mates) : [] };
      return yes('ok', { square });
    },
    /** A room as a member or a pass holder sees it. Reads only: a group nobody has changed yet shows the starter pieces. */
    room(db: Db, session: SessionRecord, rawId: unknown) {
      const id = roomId(rawId), { s, id: me } = kit.enter(db, session);
      const conv = groupOf(s, id);
      if (!conv || !placeUntil(db, me, id)) return no('not_admitted', 'You need to be a member of this group, or to open its link, to see its room.');
      return yes('ok', { room: view(s, conv, me) });
    },
    /** body: { id, edit }. One change to the furniture, by a member. */
    edit(db: Db, session: SessionRecord, body: Record<string, unknown>) {
      const id = roomId(body.id), edit = readEdit(body.edit);
      if (!edit) throw bad('invalid_edit');
      const { s, id: me } = kit.enter(db, session);
      const found = mine(s, me, id);
      if ('refusal' in found) return found.refusal;
      if (!ctx.allow(`places:edit:${me}`, PLACES.editsPerMinute)) return no('rate_limited', 'You are changing the room too fast. Wait a moment.');
      const done = editRoom(itemsOf(found.conv), edit);
      if ('code' in done) return no(done.code, done.reason);
      if (done.same) return yes('same', { room: view(s, found.conv, me) });
      const room = roomOf(found.conv);
      room.items = done.items; room.rev += 1;
      return yes('changed', { room: view(s, found.conv, me) });
    },
    /** body: { id, on, fresh? }. Switch the room's link on or off; `fresh` makes a new one, which ends every pass given by the old. */
    link(db: Db, session: SessionRecord, body: Record<string, unknown>) {
      const id = roomId(body.id);
      if (typeof body.on !== 'boolean' || (body.fresh !== undefined && typeof body.fresh !== 'boolean')) throw bad('invalid_link');
      const { s, id: me } = kit.enter(db, session);
      const found = mine(s, me, id);
      if ('refusal' in found) return found.refusal;
      const refusal = ctx.checks?.muted?.(me);
      if (refusal && body.on) return no(refusal.code, refusal.reason);
      if (!ctx.allow(`places:link:${me}`, 10)) return no('rate_limited', 'You are changing the link too fast. Wait a minute.');
      const room = roomOf(found.conv);
      if (!body.on) { delete room.link; delete room.passes; return yes('off', { room: view(s, found.conv, me), ended: true as const }); }
      const fresh = body.fresh === true && room.link !== undefined;
      if (!room.link || fresh) { room.link = { key: newKey(), at: now(), by: me }; delete room.passes; }
      return yes('on', { room: view(s, found.conv, me), ...(fresh ? { ended: true as const } : {}) });
    },
    /** body: { id, player }. A member asks a visitor to leave: their pass ends and the link will not let them back for a while. */
    remove(db: Db, session: SessionRecord, body: Record<string, unknown>) {
      const id = roomId(body.id);
      if (typeof body.player !== 'string' || !UUID_PATTERN.test(body.player)) throw bad('invalid_player');
      const player = body.player.toLowerCase(), { s, id: me } = kit.enter(db, session);
      const found = mine(s, me, id);
      if ('refusal' in found) return found.refusal;
      if (isMember(s, found.conv, player)) return no('is_member', 'They are a member of the group. Remove them from the group instead.');
      const room = roomOf(found.conv), t = now(), kept = live(room, t);
      delete kept.passes[player];
      kept.barred[player] = t + PLACES_MS.barred;
      room.passes = kept.passes; room.barred = kept.barred;
      return yes('removed', { room: view(s, found.conv, me), player });
    },
    /** What a link is, for a browser with no session: whether it works, the room's name and how many are inside. Reads only. */
    peek(db: Db, token: unknown) {
      const claim = readRoomLink(token), conv = claim ? groupOf(db.social, claim.roomId) : null, link = conv?.room?.link;
      if (!claim || !conv || !link || !sameKey(link.key, claim.key)) return yes('ended', {});
      return yes('open', { room: { name: conv.name ?? 'Group', here: hereCount(roomKeyOf(conv.id)) } });
    },
    /** Come in through a room's link, as the signed-in caller: a member is simply told the room; anybody else is given a pass. */
    enter(db: Db, session: SessionRecord, token: unknown) {
      const claim = readRoomLink(token), { s, id: me } = kit.enter(db, session);
      const conv = claim ? groupOf(s, claim.roomId) : null, link = conv?.room?.link;
      if (!claim || !conv || !link || !sameKey(link.key, claim.key)) return no('link_ended', 'That link has ended. Ask for a new one.');
      if (isMember(s, conv, me)) return yes('inside', { room: view(s, conv, me) });
      const room = roomOf(conv), t = now(), kept = live(room, t);
      if (kept.barred[me] !== undefined) return no('barred', 'You were asked to leave this room. You can come back later.');
      if (conv.owner && kit.blockedEither(s, me, conv.owner)) return no('link_ended', 'That link has ended. Ask for a new one.');
      if (kept.passes[me] === undefined && Object.keys(kept.passes).length >= PLACES.passes) {
        const oldest = Object.entries(kept.passes).sort((a, b) => a[1] - b[1])[0];
        if (oldest) delete kept.passes[oldest[0]];
      }
      kept.passes[me] = t + PLACES_MS.pass;
      room.passes = kept.passes;
      if (Object.keys(kept.barred).length) room.barred = kept.barred; else delete room.barred;
      return yes('inside', { room: view(s, conv, me) });
    },
  };
}

const isFurnitureId = (value: unknown): value is FurnitureId => typeof value === 'string' && Object.hasOwn(FURNITURE, value);
/** A furniture change as the page sent it, or null when it is not one. Positions are checked by the placement rule itself. */
function readEdit(value: unknown): RoomEdit | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>, id = raw.id;
  if (typeof id !== 'string' || !ROOM_ITEM_ID.test(id)) return null;
  const whole = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n < 64;
  if (raw.op === 'remove') return { op: 'remove', id };
  if (raw.op === 'move') return whole(raw.x) && whole(raw.y) && whole(raw.rot) ? { op: 'move', id, x: raw.x, y: raw.y, rot: raw.rot } : null;
  const itemId = raw.itemId;
  if (raw.op !== 'add' || !isFurnitureId(itemId)) return null;
  if (raw.x === undefined) return { op: 'add', id, itemId };
  return whole(raw.x) && whole(raw.y) && (raw.rot === undefined || whole(raw.rot)) ? { op: 'add', id, itemId, x: raw.x, y: raw.y, ...(whole(raw.rot) ? { rot: raw.rot } : {}) } : null;
}
