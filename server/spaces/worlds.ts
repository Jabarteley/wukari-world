/**
 * OWNER: spaces
 * WORLDS (docs/WORLDS.md): spaces players make from nothing. A world is open ground of a chosen size and surface; its maker fills it
 * with their own models and gives it a script (server/spaces/world.ts does both, with `target=world&id=`), walks it with friends
 * (server/ws/spaces.ts) and sends them its link. A world open to everyone is listed for anyone to find and join.
 *
 *   GET  /api/spaces/worlds?list=mine|new|popular     my worlds, the newest open ones, the most visited open ones
 *   POST /api/spaces/worlds { name, blurb?, size?, ground?, open? }   make one (at most WORLDS.perPlayer)
 *   POST /api/spaces/worlds/update { id, …fields }      change its name, words, surface or who may come (its size stays)
 *   POST /api/spaces/worlds/delete { id }               delete it, with its layout, script and cover
 *   POST /api/spaces/worlds/cover?id=  (body: image/webp)   a cover picture the maker's device drew from the world itself
 *   GET  /api/spaces/world-cover/:id                    the cover's bytes
 *
 * Kept in `spaces.worlds[id]` (./store.ts); the cover's bytes in the model store under their hash, like a model's. Visits are
 * counted when someone else joins the world live (at most one a visitor an hour). Erased with the player (./store.ts eraseSpaces).
 */
import { cleanWorld, isWebp, isWorldId, WORLDS, type WorldInput, type WorldOpen } from '../../src/spaces/worlds.ts';
import type { WorldCard } from '../../src/types/spaces.ts';
import { registerAdminSetting } from '../admin/settings.ts';
import { screenText } from '../moderation/text.ts';
import { spacesOf, type WorldEntry } from './store.ts';
import type { Db, RouteContext, RouteRequest, SessionRecord } from '../types.ts';

const no = (code: string, reason: string) => ({ ok: false as const, code, reason });
const COVER_TYPES = Object.freeze(['image/webp']);

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const services = new WeakMap<RouteContext, ReturnType<typeof build>>();
export function worldsService(ctx: RouteContext): ReturnType<typeof build> {
  const found = services.get(ctx);
  if (found) return found;
  const made = build(ctx);
  services.set(ctx, made);
  return made;
}

function build(ctx: RouteContext) {
  registerAdminSetting(ctx, { key: 'spacesWorlds', label: 'Players make their own worlds', help: 'A player makes worlds of their own (open ground, their models, their script), sends friends a link, and browses and joins the worlds others opened to everyone (docs/WORLDS.md). Needs "Walk through spaces in 3D". Off until an operator turns it on.', kind: 'boolean', default: () => false });
  const on = (): boolean => ctx.checks?.setting?.('spaces3d') === true && ctx.checks?.setting?.('spacesWorlds') === true;
  /** How many are in each world right now (server/ws/spaces.ts tells us); nothing stored. */
  const live = new Map<string, number>();
  const all = (db: Db): Record<string, WorldEntry> => (db as { spaces?: { worlds?: Record<string, WorldEntry> } }).spaces?.worlds ?? {};
  const nameOf = (db: Db, id: string): string => db.social?.players[id]?.name ?? 'Player';
  const newId = (): string => `w${ctx.randomId().replace(/[^0-9a-z]/gi, '').toLowerCase().padEnd(12, '0').slice(-12)}`;
  const card = (db: Db, world: WorldEntry, viewer: string): WorldCard => ({
    id: world.id, name: world.name, blurb: world.blurb, by: { id: world.by, name: nameOf(db, world.by) }, size: world.size, ground: world.ground, open: world.open,
    visits: world.visits, here: live.get(world.id) ?? 0, cover: world.cover ? world.cover.slice(0, 12) : null, at: world.at, updated: world.updated, mine: world.by === viewer,
  });
  /** The words a world shows other people pass the text filter. */
  const screened = (input: WorldInput): ReturnType<typeof no> | null => {
    const name = screenText(input.name, { contact: true, what: 'The world name' });
    if (name) return no(name.code, name.reason);
    const blurb = input.blurb ? screenText(input.blurb, { contact: true, what: 'The description' }) : null;
    return blurb ? no(blurb.code, blurb.reason) : null;
  };
  /** Newest first; made in the same moment, the later one first (a stable sort over the reversed insertion order). */
  const newest = (worlds: WorldEntry[]): WorldEntry[] => worlds.reverse().sort((a, b) => b.updated - a.updated);
  const mineOf = (db: Db, id: string): WorldEntry[] => newest(Object.values(all(db)).filter((w) => w.by === id));
  const own = (db: Db, session: SessionRecord, id: unknown): WorldEntry | ReturnType<typeof no> => {
    const world = isWorldId(id) ? all(db)[id] : undefined;
    if (!world) return no('unknown_world', 'That world is gone.');
    if (world.by !== session.publicId) return no('not_yours', 'Only the maker of a world can change it.');
    return world;
  };

  return {
    on,
    /** The world, if it exists (whoever asks: a link-only world is reached by anyone who has its link). */
    entry(db: Db, id: unknown): WorldEntry | undefined { return isWorldId(id) ? all(db)[id] : undefined; },
    /** server/ws/spaces.ts: how many are in a world now. */
    setLive(id: string, count: number): void { if (count > 0) live.set(id, count); else live.delete(id); },
    /** server/ws/spaces.ts: someone other than the maker came in (counted at most once an hour per visitor). */
    visited(db: Db, id: string, visitor: string): void {
      const world = all(db)[id];
      if (!world || world.by === visitor || !ctx.allow(`spaces:world-visit:${id}:${visitor}`, 1, 3_600_000)) return;
      world.visits += 1;
    },
    /** GET /api/spaces/worlds */
    list(db: Db, session: SessionRecord, which: string | null) {
      if (!on()) return no('worlds_off', 'Worlds are not switched on yet.');
      const me = session.publicId;
      let worlds: WorldEntry[];
      if (which === 'mine') worlds = mineOf(db, me);
      else {
        const open = newest(Object.values(all(db)).filter((w) => w.open === 'everyone'));
        worlds = which === 'popular' ? open.sort((a, b) => (live.get(b.id) ?? 0) - (live.get(a.id) ?? 0) || b.visits - a.visits) : open;
      }
      return { ok: true as const, code: 'ok' as const, worlds: worlds.slice(0, WORLDS.list).map((w) => card(db, w, me)), mine: mineOf(db, me).length, limit: WORLDS.perPlayer };
    },
    /** POST /api/spaces/worlds */
    create(db: Db, session: SessionRecord, body: Record<string, unknown>) {
      if (!on()) return no('worlds_off', 'Worlds are not switched on yet.');
      if (mineOf(db, session.publicId).length >= WORLDS.perPlayer) return no('too_many', `You have ${WORLDS.perPlayer} worlds, the most you can keep. Delete one first.`);
      if (!ctx.allow(`spaces:world-make:${session.publicId}`, 20, 3_600_000)) return no('rate_limited', 'You are making worlds too fast. Wait a moment.');
      const checked = cleanWorld(body);
      if (!checked.ok) return checked;
      const blocked = screened(checked.world);
      if (blocked) return blocked;
      const col = spacesOf(db);
      col.worlds ??= {};
      let id = newId();
      while (Object.hasOwn(col.worlds, id)) id = newId();
      const now = ctx.now();
      const world: WorldEntry = { id, by: session.publicId, ...checked.world, at: now, updated: now, visits: 0 };
      col.worlds[id] = world;
      return { ok: true as const, code: 'created' as const, world: card(db, world, session.publicId) };
    },
    /** POST /api/spaces/worlds/update */
    update(db: Db, session: SessionRecord, body: Record<string, unknown>) {
      if (!on()) return no('worlds_off', 'Worlds are not switched on yet.');
      const world = own(db, session, body['id']);
      if ('ok' in world) return world;
      const checked = cleanWorld(body, { name: world.name, blurb: world.blurb, size: world.size, ground: world.ground, open: world.open });
      if (!checked.ok) return checked;
      const blocked = screened(checked.world);
      if (blocked) return blocked;
      // The size stays: the models stand where they were placed within it.
      Object.assign(world, { name: checked.world.name, blurb: checked.world.blurb, ground: checked.world.ground, open: checked.world.open as WorldOpen, updated: ctx.now() });
      return { ok: true as const, code: 'saved' as const, world: card(db, world, session.publicId) };
    },
    /** POST /api/spaces/worlds/delete */
    remove(db: Db, session: SessionRecord, body: Record<string, unknown>) {
      const world = own(db, session, body['id']);
      if ('ok' in world) return world;
      const col = spacesOf(db);
      delete col.worlds![world.id];
      if (col.layouts) delete col.layouts[`world:${world.id}`];
      if (col.scripts) delete col.scripts[`world:${world.id}`];
      if (world.cover) (col.modelTrash ??= []).push(world.cover);
      return { ok: true as const, code: 'deleted' as const };
    },
    /** A world's maker bumps it to the top of "new" when its layout or script changes (server/spaces/world.ts). */
    touched(db: Db, id: string): void { const world = all(db)[id]; if (world) world.updated = ctx.now(); },
    /** POST /api/spaces/worlds/cover?id= */
    async cover(request: RouteRequest) {
      const session = await ctx.store.read((db) => request.requireSession(db));
      if (!on()) return no('worlds_off', 'Worlds are not switched on yet.');
      const id = request.query.get('id');
      const owned = await ctx.store.read((db) => own(db, session, id));
      if ('ok' in owned) return owned;
      if (!request.binaryBody || !ctx.models) return no('not_ready', 'Covers are not ready on this server yet.');
      if (!ctx.allow(`spaces:world-cover:${session.publicId}`, 30, 3_600_000)) return no('rate_limited', 'Too many covers. Wait a moment.');
      const bytes = await request.binaryBody(WORLDS.coverBytes, COVER_TYPES);
      if (!isWebp(bytes)) return no('invalid_cover', 'The cover must be a WebP picture.');
      const hash = await sha256(bytes);
      await ctx.models.put(hash, bytes);
      return ctx.store.transact((db) => {
        const world = own(db, session, id);
        if ('ok' in world) { (spacesOf(db).modelTrash ??= []).push(hash); return world; }
        if (world.cover && world.cover !== hash) (spacesOf(db).modelTrash ??= []).push(world.cover);
        world.cover = hash;
        return { ok: true as const, code: 'saved' as const, cover: hash.slice(0, 12) };
      });
    },
    /** GET /api/spaces/world-cover/:id */
    async coverFile(request: RouteRequest) {
      const id = request.params['id'] ?? '';
      const hash = await ctx.store.read((db) => { request.requireSession(db); return (isWorldId(id) ? all(db)[id] : undefined)?.cover ?? null; });
      if (!hash || !ctx.models) throw ctx.fail(404, 'unknown_world');
      const bytes = await ctx.models.get(hash);
      if (!bytes) throw ctx.fail(404, 'unknown_world');
      return { file: { bytes, type: 'image/webp', cache: 'immutable' as const } };
    },
    /** The hashes a sweep must keep (server/spaces/models.ts). */
    coverHashes(db: Db): string[] { return Object.values(all(db)).flatMap((w) => (w.cover ? [w.cover] : [])); },
  };
}
