/**
 * OWNER: spaces
 * COPY MY REAL HOUSE (docs/HOUSE-FROM-PHOTOS.md): what a home is built from in 3D. Either a house description a player's own AI wrote
 * from photos (src/spaces/house-spec.ts; the game builds it with clean walls), or one of the player's models standing as the whole house
 * (a .glb their AI made in Blender), or, by default, the game's own house for their tier.
 *
 *   POST /api/spaces/house { spec } | { model: id } | { clear: true }
 *
 * Kept on `spaces.homes[publicId]` as `spec` or `house` (optional fields). Visitors see it with the home. The setting `spacesHouseCopy`
 * (and `spaces3d`) switch it on; off, homes are the game's own and nothing stored is lost.
 */
import { cleanHouseSpec, type HouseSpecV1 } from '../../src/spaces/house-spec.ts';
import { registerAdminSetting } from '../admin/settings.ts';
import { screenText } from '../moderation/text.ts';
import { modelView } from './models.ts';
import { spacesOf, type ModelEntry, type SpaceHome } from './store.ts';
import type { ModelView } from '../../src/types/spaces.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';

const no = (code: string, reason: string) => ({ ok: false as const, code, reason });

export type HomeHouse = { kind: 'spec'; spec: HouseSpecV1 } | { kind: 'model'; model: ModelView }

const services = new WeakMap<RouteContext, ReturnType<typeof build>>();
export function homeHouseService(ctx: RouteContext): ReturnType<typeof build> {
  const found = services.get(ctx);
  if (found) return found;
  const made = build(ctx);
  services.set(ctx, made);
  return made;
}

function build(ctx: RouteContext) {
  registerAdminSetting(ctx, { key: 'spacesHouseCopy', label: 'Copy my real house', help: 'A player gives their home the house their own AI made from photos: a house description the game builds, or a .glb model standing as the whole house (up to 50 MB). The house skill for players\' AIs is at /skills/allworld-house/ (docs/HOUSE-FROM-PHOTOS.md). Needs "Walk through spaces in 3D". Off until an operator turns it on.', kind: 'boolean', default: () => false });
  const on = (): boolean => ctx.checks?.setting?.('spaces3d') === true && ctx.checks?.setting?.('spacesHouseCopy') === true;
  const homeOf = (db: Db, id: string): SpaceHome | undefined => {
    const homes = (db as { spaces?: { homes?: Record<string, SpaceHome> } }).spaces?.homes;
    return homes && Object.hasOwn(homes, id) ? homes[id] : undefined;
  };
  const modelOf = (db: Db, by: string, id: string): ModelEntry | undefined => {
    const list = (db as { spaces?: { models?: Record<string, ModelEntry[]> } }).spaces?.models?.[by];
    return Array.isArray(list) ? list.find((m) => m.id === id) : undefined;
  };
  /** Set a model as `by`'s house (also used by an upload link made for a house). */
  function useModel(db: Db, by: string, id: string): void {
    const col = spacesOf(db), home = col.homes[by] ??= { title: '', at: ctx.now() };
    home.house = { m: id, by }; delete home.spec; home.at = ctx.now();
  }

  return {
    on, useModel,
    /** What `publicId`'s home is built from, for anyone who may see it (null: the game's own house). */
    houseOf(db: Db, publicId: string): HomeHouse | null {
      if (!on()) return null;
      const home = homeOf(db, publicId);
      if (home?.spec) return { kind: 'spec', spec: home.spec };
      if (home?.house) {
        const model = modelOf(db, home.house.by, home.house.m);
        if (model && !model.hidden) return { kind: 'model', model: modelView(model, home.house.by) };
      }
      return null;
    },
    /** POST /api/spaces/house */
    set(db: Db, session: SessionRecord, body: Record<string, unknown>) {
      if (!on()) return no('house_off', 'Copying your real house is not switched on yet.');
      if (!ctx.allow(`spaces:house:${session.publicId}`, 30, 3_600_000)) return no('rate_limited', 'You are changing your house too fast. Wait a while.');
      const col = spacesOf(db);
      if (body['clear'] === true) {
        const home = col.homes[session.publicId];
        if (home) { delete home.spec; delete home.house; }
        return { ok: true as const, code: 'cleared' as const };
      }
      if (typeof body['model'] === 'string') {
        const model = modelOf(db, session.publicId, body['model']);
        if (!model || model.hidden) return no('unknown_model', 'That model is not yours or is gone.');
        useModel(db, session.publicId, model.id);
        return { ok: true as const, code: 'saved' as const, kind: 'model' as const };
      }
      const checked = cleanHouseSpec(body['spec']);
      if (!checked.ok) return checked;
      // Words other people see pass the filter: the house's name and every room's.
      for (const text of [checked.spec.name ?? '', ...checked.spec.rooms.map((r) => r.name)]) {
        const blocked = text ? screenText(text, { contact: true, what: 'A name in the house description' }) : null;
        if (blocked) return no(blocked.code, blocked.reason);
      }
      const home = col.homes[session.publicId] ??= { title: '', at: ctx.now() };
      home.spec = checked.spec; delete home.house; home.at = ctx.now();
      return { ok: true as const, code: 'saved' as const, kind: 'spec' as const, notes: checked.notes, rooms: checked.spec.rooms.length };
    },
  };
}
