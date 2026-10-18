/**
 * OWNER: spaces
 * A SPACE IN 3D (docs/SPACES-3D.md, phase 2): what the walk-through screen draws, and where players' own models stand in it.
 *
 *   GET  /api/spaces/world?target=home[&host=<publicId>] | target=room&id=<roomId>
 *        the plot, the furniture as the game keeps it, the placed models (with their hash and size) and whether the caller may edit
 *   POST /api/spaces/world/layout { target, id?, models: Placement[] }   save where models stand (owner of a home, member of a room)
 *
 * Who may look: a home's owner, and a guest whose visit the host accepted (server/social/visit.ts homeProjection decides); a group
 * room's members, and visitors its link let in (server/social/places.ts room decides). The furniture is never changed here.
 * Kept in `spaces.layouts["home:<publicId>" | "room:<roomId>"]` (src/spaces/layout.ts); erased with the player (store.ts).
 */
import { cleanLayout, WORLD, type Placement, type SpaceLayout } from '../../src/spaces/layout.ts';
import { plotOf } from '../../src/game/home-layout.ts';
import { roomPlot } from '../../src/spaces/plan.ts';
import { plotFor } from '../../src/game/systems/home.ts';
import { characterCity } from '../character.ts';
import { registerAdminSetting } from '../admin/settings.ts';
import { placesService } from '../social/places.ts';
import { visitService } from '../social/visit.ts';
import { homeTitleOf, spacesOf, type ModelEntry } from './store.ts';
import { modelView } from './models.ts';
import type { LifeState } from '../../src/types/life.ts';
import type { WorldView } from '../../src/types/spaces.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';

const no = (code: string, reason: string) => ({ ok: false as const, code, reason });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const services = new WeakMap<RouteContext, ReturnType<typeof build>>();
export function worldService(ctx: RouteContext): ReturnType<typeof build> {
  const found = services.get(ctx);
  if (found) return found;
  const made = build(ctx);
  services.set(ctx, made);
  return made;
}

function build(ctx: RouteContext) {
  registerAdminSetting(ctx, { key: 'spaces3d', label: 'Walk through spaces in 3D', help: 'Players walk through their home or group room in a realistic 3D view and place their own models in it (docs/SPACES-3D.md). Off until an operator turns it on.', kind: 'boolean', default: () => false });
  const on = (): boolean => ctx.checks?.setting?.('spaces3d') === true;
  const places = placesService(ctx), visits = visitService(ctx);

  const allModels = (db: Db): Record<string, ModelEntry[]> => (db as { spaces?: { models?: Record<string, ModelEntry[]> } }).spaces?.models ?? {};
  const modelOf = (db: Db, by: string, id: string): ModelEntry | undefined => {
    const list = allModels(db);
    return Object.hasOwn(list, by) ? list[by]!.find((m) => m.id === id) : undefined;
  };
  const layoutOf = (db: Db, key: string): SpaceLayout | undefined => {
    const all = (db as { spaces?: { layouts?: Record<string, SpaceLayout> } }).spaces?.layouts;
    return all && Object.hasOwn(all, key) ? all[key] : undefined;
  };
  const nameOf = (db: Db, id: string): string => db.social?.players[id]?.name ?? 'Player';

  type Where = { key: string; kind: 'home' | 'room'; title: string; owner: { id: string; name: string }; grid: number; owned: boolean; plot: { w: number; d: number; floors: number }; style: object | null; items: { itemId: string; x: number; y: number; rot: number; floor?: number }[]; canEdit: boolean };
  /** The space the caller asked for, if they may see it. */
  function where(db: Db, session: SessionRecord, query: URLSearchParams): Where | ReturnType<typeof no> {
    const target = query.get('target');
    if (target === 'room') {
      const seen = places.room(db, session, query.get('id'));
      if (!seen.ok) return no(seen.code, seen.reason);
      const room = seen.room, plot = roomPlot();
      return { key: `room:${room.id}`, kind: 'room', title: room.name, owner: { id: room.id, name: room.name }, grid: room.grid, owned: false, plot: { w: plot.w, d: plot.d, floors: plot.floors }, style: room.style ?? null, items: room.items.map((i) => ({ itemId: i.itemId, x: i.x, y: i.y, rot: i.rot })), canEdit: room.role === 'member' };
    }
    if (target !== 'home') throw ctx.fail(400, 'invalid_target');
    const host = query.get('host');
    if (host && host !== session.publicId) {
      if (!UUID.test(host)) throw ctx.fail(400, 'invalid_host');
      const seen = visits.homeProjection(db, session, host);
      if (!seen.ok) return no(seen.code, seen.reason);
      const home = seen.home, plot = plotOf(home.grid, home.owned);
      return { key: `home:${home.host.id}`, kind: 'home', title: homeTitleOf(db, home.host.id) || `${home.host.name.split(/\s+/)[0]}'s home`, owner: home.host, grid: home.grid, owned: home.owned, plot: { w: plot.w, d: plot.d, floors: plot.floors }, style: home.style, items: home.items.map((i) => ({ itemId: i.itemId, x: i.x, y: i.y, rot: i.rot, ...(i.floor ? { floor: i.floor } : {}) })), canEdit: false };
    }
    const cityId = characterCity(session), state = cityId ? session.cities?.[cityId]?.state as LifeState | undefined : undefined;
    if (!state) return no('no_home', 'Start your life in a city first.');
    const plot = plotFor(state);
    return { key: `home:${session.publicId}`, kind: 'home', title: homeTitleOf(db, session.publicId) || 'My home', owner: { id: session.publicId, name: session.name }, grid: plot.grid, owned: plot.w > plot.grid, plot: { w: plot.w, d: plot.d, floors: plot.floors }, style: { ...state.estate.style }, items: state.home.items.map((i) => ({ itemId: i.itemId, x: i.x, y: i.y, rot: i.rot, ...('floor' in i && i.floor ? { floor: i.floor } : {}) })), canEdit: true };
  }

  /** Placements whose model is still there; a hidden model shows only to its own owner. */
  function placed(db: Db, key: string, viewer: string) {
    return (layoutOf(db, key)?.models ?? []).flatMap((p) => {
      const model = modelOf(db, p.by, p.m);
      if (!model || (model.hidden && p.by !== viewer)) return [];
      return [{ ...p, hash: model.hash, name: model.name, size: model.size, triangles: model.tris }];
    });
  }

  return {
    on,
    /** GET /api/spaces/world */
    read(db: Db, session: SessionRecord, query: URLSearchParams): WorldView | ReturnType<typeof no> {
      if (!on()) return no('world_off', 'Walking through spaces in 3D is not switched on yet.');
      const found = where(db, session, query);
      if ('ok' in found) return found;
      const { key, canEdit, ...rest } = found;
      const mine = canEdit ? (allModels(db)[session.publicId] ?? []).filter((m) => !m.hidden).map((m) => modelView(m, session.publicId)) : [];
      return { ok: true, code: 'ok', world: { ...rest, key, canEdit, models: placed(db, key, session.publicId), mine, limits: { placements: WORLD.placements, triangles: WORLD.triangles } } };
    },
    /** POST /api/spaces/world/layout */
    save(db: Db, session: SessionRecord, body: Record<string, unknown>) {
      if (!on()) return no('world_off', 'Walking through spaces in 3D is not switched on yet.');
      const query = new URLSearchParams()
      query.set('target', typeof body['target'] === 'string' ? body['target'] : '')
      if (typeof body['id'] === 'string') query.set('id', body['id'])
      const found = where(db, session, query);
      if ('ok' in found) return found;
      if (!found.canEdit) return no('not_allowed', found.kind === 'room' ? 'Only members of the group can arrange its room.' : 'Only the owner can arrange this home.');
      if (!ctx.allow(`spaces:layout:${session.publicId}`, 30)) return no('rate_limited', 'You are saving too fast. Wait a moment.');
      const before = layoutOf(db, found.key)?.models ?? [];
      const checked = cleanLayout(body['models'], found.plot,
        (by, id) => { const m = modelOf(db, by, id); return m ? { id: m.id, by, hash: m.hash, triangles: m.tris, ...(m.hidden ? { hidden: true } : {}) } : null; },
        (by, id) => by === session.publicId || before.some((p) => p.by === by && p.m === id));
      if (!checked.ok) return checked;
      const col = spacesOf(db);
      col.layouts ??= {};
      if (checked.models.length) col.layouts[found.key] = { models: checked.models, at: ctx.now(), by: session.publicId };
      else delete col.layouts[found.key];
      return { ok: true as const, code: 'saved' as const, placed: checked.models.length, triangles: checked.triangles };
    },
  };
}

export type { Placement };
