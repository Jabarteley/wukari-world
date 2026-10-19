/**
 * OWNER: spaces
 * What AI Spaces keeps: the collection `spaces`, additive (a server without it reads as empty).
 *
 *   spaces.homes[publicId]   { title, at }   the title of the plan a player last applied to their home (it passed the text filter
 *                                            and agentWords); read by the `space` share card (server/growth/share.ts)
 *   spaces.hosts[publicId]   { kind, persona, on, at, guests?: { [guestId]: { n, at } } }   the AI host of a player's home (./host.ts):
 *                                            how many times each guest came, for "welcome back"; at most 50 guests, 90 days
 *   spaces.games[id]         { def, by, at, title }   a lite game a player imported (./games.ts)
 *   spaces.models[publicId]  ModelEntry[]           a player's 3D models (./models.ts); spaces.modelTrash: hashes whose bytes may go
 *   spaces.layouts[key]      SpaceLayout            where models stand in "home:<publicId>" or "room:<roomId>" (./world.ts)
 *   spaces.scripts[key]      { code, lines, at, by } a space's own script (./world.ts, src/spaces/script.ts)
 *   spaces.worlds[id]        WorldEntry             a world a player made (./worlds.ts, docs/WORLDS.md); its cover's bytes under `cover` in the model store
 *
 * Erased with the player (eraseSpaces, called from server/admin/erasure-data.ts): their own records, and their visits in other hosts' books.
 */
import type { Db } from '../types.ts';
import { forgetLite } from '../../src/arena/lite/rules.ts';
import type { SpaceLayout } from '../../src/spaces/layout.ts';
import type { SpaceScript } from '../../src/spaces/script.ts';
import type { WorldInput } from '../../src/spaces/worlds.ts';

export interface SpaceHome { title: string; at: number }
export interface SpaceHost { kind: string; persona: string; on: boolean; at: number; guests?: Record<string, { n: number; at: number }> }
/** A player's 3D model (./models.ts): the facts only; the bytes are in ctx.models under `hash`. */
export interface ModelEntry {
  id: string; name: string; hash: string; bytes: number; tris: number; tex: number
  size: [number, number, number]; min: [number, number, number]; anims: number; skinned?: true; at: number
  /** Who reported it (at most 10), whether reports hid it, and whether an operator cleared it for good. */
  reports?: string[]; hidden?: true; cleared?: true
}
/** A world (./worlds.ts): what its maker chose, when, how many visits it had, and the hash of its cover picture (in the model store). */
export interface WorldEntry extends WorldInput { id: string; by: string; at: number; updated: number; visits: number; cover?: string }
export interface SpacesCollection { homes: Record<string, SpaceHome>; hosts: Record<string, SpaceHost>; models?: Record<string, ModelEntry[]>; modelTrash?: string[]; layouts?: Record<string, SpaceLayout>; scripts?: Record<string, SpaceScript & { at: number; by: string }>; worlds?: Record<string, WorldEntry> }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
/** The collection, made on first write. */
export function spacesOf(db: Db): SpacesCollection {
  const found = (db as Record<string, unknown>)['spaces'];
  if (isRecord(found) && isRecord(found['homes'])) {
    if (!isRecord(found['hosts'])) found['hosts'] = {};
    return found as unknown as SpacesCollection;
  }
  const made: SpacesCollection = { homes: {}, hosts: {} };
  (db as Record<string, unknown>)['spaces'] = made;
  return made;
}
/** Read only: a player's home title, or ''. */
export function homeTitleOf(db: Db, publicId: string): string {
  const homes = (db as Record<string, { homes?: Record<string, SpaceHome> } | undefined>)['spaces']?.homes;
  const found = homes && Object.hasOwn(homes, publicId) ? homes[publicId] : undefined;
  return typeof found?.title === 'string' ? found.title : '';
}
/** A model leaves every space it stood in (deleted by its owner, or removed by an operator). */
export function forgetPlacements(col: SpacesCollection, by: string, id: string): void {
  for (const [key, layout] of Object.entries(col.layouts ?? {})) {
    const kept = layout.models.filter((p) => !(p.by === by && p.m === id));
    if (kept.length === layout.models.length) continue;
    if (kept.length) layout.models = kept; else delete col.layouts![key];
  }
}
/** Forget players (erasure). Returns how many records went. */
export function eraseSpaces(db: Db, ids: Iterable<string>): number {
  const col = (db as Record<string, { homes?: Record<string, SpaceHome>; hosts?: Record<string, SpaceHost>; games?: Record<string, { by: string }>; models?: Record<string, ModelEntry[]>; modelTrash?: string[]; layouts?: Record<string, SpaceLayout>; scripts?: Record<string, { by: string }>; worlds?: Record<string, WorldEntry> } | undefined>)['spaces'];
  if (!col) return 0;
  let gone = 0;
  const list = [...ids];
  for (const id of list) {
    if (col.homes && Object.hasOwn(col.homes, id)) { delete col.homes[id]; gone++; }
    if (col.hosts && Object.hasOwn(col.hosts, id)) { delete col.hosts[id]; gone++; }
    for (const host of Object.values(col.hosts ?? {})) if (host.guests && Object.hasOwn(host.guests, id)) { delete host.guests[id]; gone++; }
    for (const [gameId, game] of Object.entries(col.games ?? {})) if (game.by === id) { delete col.games![gameId]; forgetLite(gameId); gone++; }
    if (col.models && Object.hasOwn(col.models, id)) {
      // The bytes go on the next heartbeat (./models.ts sweep), unless another player keeps the same file.
      (col.modelTrash ??= []).push(...col.models[id]!.map((m) => m.hash));
      gone += col.models[id]!.length;
      delete col.models[id];
    }
    for (const list of Object.values(col.models ?? {})) for (const m of list) if (m.reports?.includes(id)) m.reports = m.reports.filter((r) => r !== id);
    // Their worlds, with their layouts, scripts and covers.
    for (const [worldId, world] of Object.entries(col.worlds ?? {})) if (world.by === id) {
      delete col.worlds![worldId]; gone++;
      if (col.layouts && Object.hasOwn(col.layouts, `world:${worldId}`)) delete col.layouts[`world:${worldId}`];
      if (col.scripts && Object.hasOwn(col.scripts, `world:${worldId}`)) delete col.scripts[`world:${worldId}`];
      if (world.cover) (col.modelTrash ??= []).push(world.cover);
    }
    // Their home's script, and any script they wrote for a room.
    for (const [key, script] of Object.entries(col.scripts ?? {})) if (key === `home:${id}` || script.by === id) { delete col.scripts![key]; gone++; }
    if (col.layouts) {
      if (Object.hasOwn(col.layouts, `home:${id}`)) { delete col.layouts[`home:${id}`]; gone++; }
      // Their models leave every room they stood in.
      for (const [key, layout] of Object.entries(col.layouts)) {
        const kept = layout.models.filter((p) => p.by !== id);
        if (kept.length === layout.models.length) continue;
        gone += layout.models.length - kept.length;
        if (kept.length) layout.models = kept; else delete col.layouts[key];
      }
    }
  }
  return gone;
}
