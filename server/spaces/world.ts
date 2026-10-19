/**
 * OWNER: spaces
 * A SPACE IN 3D (docs/SPACES-3D.md, phase 2): what the walk-through screen draws, and where players' own models stand in it.
 *
 *   GET  /api/spaces/world?target=home[&host=<publicId>] | target=room&id=<roomId> | target=world&id=<worldId>
 *        the plot, the furniture as the game keeps it, the placed models (with their hash and size) and whether the caller may edit
 *   POST /api/spaces/world/layout { target, id?, models: Placement[] }   save where models stand (owner of a home, member of a room)
 *   POST /api/spaces/world/script { target, id?, code, lines }   save the space's own script (phase 4); { code: '' } removes it
 *
 * Who may look: a home's owner, and a guest whose visit the host accepted (server/social/visit.ts homeProjection decides); a group
 * room's members, and visitors its link let in (server/social/places.ts room decides); a world (./worlds.ts, docs/WORLDS.md) by anyone
 * who has its link, and anyone at all when it is open to everyone. The furniture is never changed here.
 * Kept in `spaces.layouts["home:<publicId>" | "room:<roomId>" | "world:<worldId>"]` (src/spaces/layout.ts); erased with the player (store.ts).
 */
import { cleanLayout, type Placement, type SpaceLayout } from '../../src/spaces/layout.ts';
import { cleanScript, type SpaceScript } from '../../src/spaces/script.ts';
import { SPACE_LIMITS_BY_KIND, worldPlot, type SpaceKind } from '../../src/spaces/worlds.ts';
import { propOf, propView } from '../../src/spaces/props.ts';
import { screenText } from '../moderation/text.ts';
import { plotOf } from '../../src/game/home-layout.ts';
import { roomPlot } from '../../src/spaces/plan.ts';
import { plotFor } from '../../src/game/systems/home.ts';
import { characterCity } from '../character.ts';
import { registerAdminSetting } from '../admin/settings.ts';
import { placesService } from '../social/places.ts';
import { visitService } from '../social/visit.ts';
import { homeTitleOf, spacesOf, type ModelEntry } from './store.ts';
import { modelView } from './models.ts';
import { worldsService } from './worlds.ts';
import { homeHouseService, type HomeHouse } from './home-house.ts';
import { sharesHome } from '../glue/data.ts';
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
  registerAdminSetting(ctx, { key: 'spacesScripts', label: 'Players\' own code in spaces', help: 'The owner of a home or a member of a group room may give it a script (JavaScript) that moves its models, shows its own filtered lines and keeps a score. Scripts run only in a sandbox on each visitor\'s device, with no network and no account (docs/SPACES-3D.md). Off until an operator turns it on.', kind: 'boolean', default: () => false });
  const on = (): boolean => ctx.checks?.setting?.('spaces3d') === true;
  const scriptsOn = (): boolean => ctx.checks?.setting?.('spacesScripts') === true;
  const scriptOf = (db: Db, key: string): (SpaceScript & { at: number; by: string }) | undefined => {
    const all = (db as { spaces?: { scripts?: Record<string, SpaceScript & { at: number; by: string }> } }).spaces?.scripts;
    return all && Object.hasOwn(all, key) ? all[key] : undefined;
  };
  const places = placesService(ctx), visits = visitService(ctx), worlds = worldsService(ctx), houses = homeHouseService(ctx);
  /** A copied house replaces the game's own: its own plot, and the game's furniture is not drawn in it. */
  const copied = (house: HomeHouse | null, plot: { w: number; d: number; floors: number }) => {
    if (!house) return null;
    if (house.kind === 'spec') return { house, plot: { w: house.spec.width, d: house.spec.depth, floors: house.spec.storeys } };
    const [w, h, d] = house.model.size;
    return { house, plot: { w: Math.max(plot.w, Math.ceil(w)), d: Math.max(plot.d, Math.ceil(d)), floors: Math.min(3, Math.max(1, Math.round(h / 3))) } };
  };

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

  type Where = { key: string; kind: SpaceKind; title: string; owner: { id: string; name: string }; grid: number; owned: boolean; plot: { w: number; d: number; floors: number }; style: object | null; items: { itemId: string; x: number; y: number; rot: number; floor?: number }[]; canEdit: boolean; terrain?: { ground: string; size: string; open: string; blurb: string; sky: string; game?: { id: string; title: string } }; house?: HomeHouse };
  /** The space the caller asked for, if they may see it. */
  function where(db: Db, session: SessionRecord, query: URLSearchParams): Where | ReturnType<typeof no> {
    const target = query.get('target');
    if (target === 'world') {
      if (!worlds.on()) return no('worlds_off', 'Worlds are not switched on yet.');
      const world = worlds.entry(db, query.get('id'));
      if (!world) return no('unknown_world', 'That world is gone, or its link is wrong.');
      if (!worlds.mayEnter(db, world, session.publicId)) return no('friends_only', `Only ${nameOf(db, world.by)}'s friends can come into this world.`);
      const plot = worldPlot(world.size);
      return { key: `world:${world.id}`, kind: 'world', title: world.name, owner: { id: world.by, name: nameOf(db, world.by) }, grid: plot.w, owned: false, plot, style: null, items: (world.items ?? []).map((i) => ({ ...i })), canEdit: worlds.mayBuild(world, session.publicId), terrain: { ground: world.ground, size: world.size, open: world.open, blurb: world.blurb, sky: world.sky ?? 'day', ...(world.game ? { game: { ...world.game } } : {}) } };
    }
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
      const home = seen.home, plot = plotOf(home.grid, home.owned), copy = copied(houses.houseOf(db, home.host.id), plot);
      return { key: `home:${home.host.id}`, kind: 'home', title: homeTitleOf(db, home.host.id) || `${home.host.name.split(/\s+/)[0]}'s home`, owner: home.host, grid: home.grid, owned: home.owned, plot: copy?.plot ?? { w: plot.w, d: plot.d, floors: plot.floors }, style: home.style, items: copy ? [] : home.items.map((i) => ({ itemId: i.itemId, x: i.x, y: i.y, rot: i.rot, ...(i.floor ? { floor: i.floor } : {}) })), canEdit: sharesHome(db, home.host.id, session.publicId), ...(copy ? { house: copy.house } : {}) };
    }
    const cityId = characterCity(session), state = cityId ? session.cities?.[cityId]?.state as LifeState | undefined : undefined;
    if (!state) return no('no_home', 'Start your life in a city first.');
    const plot = plotFor(state), copy = copied(houses.houseOf(db, session.publicId), plot);
    return { key: `home:${session.publicId}`, kind: 'home', title: homeTitleOf(db, session.publicId) || 'My home', owner: { id: session.publicId, name: session.name }, grid: plot.grid, owned: plot.w > plot.grid, plot: copy?.plot ?? { w: plot.w, d: plot.d, floors: plot.floors }, style: { ...state.estate.style }, items: copy ? [] : state.home.items.map((i) => ({ itemId: i.itemId, x: i.x, y: i.y, rot: i.rot, ...('floor' in i && i.floor ? { floor: i.floor } : {}) })), canEdit: true, ...(copy ? { house: copy.house } : {}) };
  }

  /** Placements whose model is still there; a hidden model shows only to its own owner. */
  function placed(db: Db, key: string, viewer: string) {
    return (layoutOf(db, key)?.models ?? []).flatMap((p) => {
      const prop = propOf(p.m);
      if (prop) return [{ ...p, ...propView(prop) }];
      const model = modelOf(db, p.by, p.m);
      if (!model || (model.hidden && p.by !== viewer)) return [];
      return [{ ...p, hash: model.hash, name: model.name, size: model.size, triangles: model.tris }];
    });
  }

  return {
    on,
    /** Who may be in this space live (server/ws/spaces.ts): the same rule as reading it. */
    access(db: Db, session: SessionRecord, query: URLSearchParams): { ok: true; key: string; kind: SpaceKind; owner: string } | ReturnType<typeof no> {
      if (!on()) return no('world_off', 'Walking through spaces in 3D is not switched on yet.');
      const found = where(db, session, query);
      if ('ok' in found) return found;
      return { ok: true, key: found.key, kind: found.kind, owner: found.owner.id };
    },
    /** GET /api/spaces/world */
    read(db: Db, session: SessionRecord, query: URLSearchParams): WorldView | ReturnType<typeof no> {
      if (!on()) return no('world_off', 'Walking through spaces in 3D is not switched on yet.');
      const found = where(db, session, query);
      if ('ok' in found) return found;
      const { key, canEdit, ...rest } = found;
      const mine = canEdit ? (allModels(db)[session.publicId] ?? []).filter((m) => !m.hidden).map((m) => modelView(m, session.publicId)) : [];
      const script = scriptsOn() ? scriptOf(db, key) : undefined;
      return { ok: true, code: 'ok', world: { ...rest, key, canEdit, models: placed(db, key, session.publicId), mine, limits: SPACE_LIMITS_BY_KIND[found.kind], scripts: scriptsOn(), screen: worlds.screenOn(), ...(script ? { script: { code: script.code, lines: [...script.lines] } } : {}) } };
    },
    /** POST /api/spaces/world/script */
    saveScript(db: Db, session: SessionRecord, body: Record<string, unknown>) {
      if (!on() || !scriptsOn()) return no('scripts_off', 'Scripts in spaces are not switched on yet.');
      const query = new URLSearchParams();
      query.set('target', typeof body['target'] === 'string' ? body['target'] : '');
      if (typeof body['id'] === 'string') query.set('id', body['id']);
      const found = where(db, session, query);
      if ('ok' in found) return found;
      if (!found.canEdit) return no('not_allowed', found.kind === 'room' ? 'Only members of the group can give its room a script.' : found.kind === 'world' ? 'Only the maker of a world can give it a script.' : 'Only the owner can give this home a script.');
      if (!ctx.allow(`spaces:script:${session.publicId}`, 20)) return no('rate_limited', 'You are saving too fast. Wait a moment.');
      const col = spacesOf(db);
      if (body['code'] === '') { if (col.scripts) delete col.scripts[found.key]; return { ok: true as const, code: 'removed' as const }; }
      const checked = cleanScript(body, (text) => screenText(text, { contact: true, what: 'That line' })?.reason ?? null);
      if (!checked.ok) return checked;
      (col.scripts ??= {})[found.key] = { ...checked.script, at: ctx.now(), by: session.publicId };
      if (found.kind === 'world') worlds.touched(db, found.key.slice(6));
      return { ok: true as const, code: 'saved' as const, lines: checked.script.lines.length };
    },
    /** POST /api/spaces/world/layout */
    save(db: Db, session: SessionRecord, body: Record<string, unknown>) {
      if (!on()) return no('world_off', 'Walking through spaces in 3D is not switched on yet.');
      const query = new URLSearchParams()
      query.set('target', typeof body['target'] === 'string' ? body['target'] : '')
      if (typeof body['id'] === 'string') query.set('id', body['id'])
      const found = where(db, session, query);
      if ('ok' in found) return found;
      if (!found.canEdit) return no('not_allowed', found.kind === 'room' ? 'Only members of the group can arrange its room.' : found.kind === 'world' ? 'Only the maker of a world can arrange it.' : 'Only the owner can arrange this home.');
      if (!ctx.allow(`spaces:layout:${session.publicId}`, 30)) return no('rate_limited', 'You are saving too fast. Wait a moment.');
      const before = layoutOf(db, found.key)?.models ?? [];
      const checked = cleanLayout(body['models'], found.plot,
        (by, id) => { const m = modelOf(db, by, id); return m ? { id: m.id, by, hash: m.hash, triangles: m.tris, ...(m.hidden ? { hidden: true } : {}) } : null; },
        (by, id) => by === session.publicId || before.some((p) => p.by === by && p.m === id), SPACE_LIMITS_BY_KIND[found.kind]);
      if (!checked.ok) return checked;
      const col = spacesOf(db);
      col.layouts ??= {};
      if (checked.models.length) col.layouts[found.key] = { models: checked.models, at: ctx.now(), by: session.publicId };
      else delete col.layouts[found.key];
      if (found.kind === 'world') worlds.touched(db, found.key.slice(6));
      return { ok: true as const, code: 'saved' as const, placed: checked.models.length, triangles: checked.triangles };
    },
  };
}

export type { Placement };
