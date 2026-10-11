/**
 * The roster bodies of a scene's other people: other players and the regulars and passers-by (the player's own figure is the stand-in,
 * src/scene/body/stand-in.ts). A scene tells this module who stands where; each person who is given a body (the budget decides, see
 * budget.ts) keeps the procedural figure until the model has arrived, then the scene hides that figure (`covered`) and this body stands
 * in its place. Any failure (a file that does not load, no WebGL2, a weak device) leaves the procedural figure for good.
 *
 * No Three.js here: the body module is fetched after a scene's first frame (gate.ts importBody), and the objects are made through
 * the kit. Poses are still frames of the shared clips (the battery rule: nothing here asks for a frame of its own).
 */
import type * as THREE from 'three';
import type { Kit } from '../kit.ts';
import { drawsWebGL2, heroAllowed, importBody } from '../body/gate.ts';
import type { SkinnedBody } from '../body/skinned.ts';
import { BODY_POSE } from '../body/stand-in.ts';
import { createRosterBudget } from './budget.ts';
import type { Detail, RosterBudget, RosterKind, RosterTier } from './budget.ts';
import { pickOf, regularPick, seedNumber, seededPick } from './map.ts';
import type { Regular, RosterPick } from './map.ts';

/** Who is to stand in the scene, and where. `parent` is the object the body is added to; x, y, z, ry are in its coordinates. */
export interface BodySpec {
  id: string;
  kind: RosterKind;
  look?: unknown;
  seed: unknown;
  /** What the game knows of a regular (a regular's character comes from it, not from a look). */
  regular?: Regular | undefined;
  parent: THREE.Object3D;
  x: number; y: number; z: number; ry: number;
  /** A scene pose name (characters.ts Pose): stand, relax, sit, walk, wave, work, dance. */
  pose: string;
  /** Seat height above y, scene units, when sitting. */
  seat?: number | undefined;
  /** Walking: the stride phase in radians. */
  phase?: number | undefined;
}

interface Entry {
  spec: BodySpec;
  key: string;
  pick: RosterPick;
  detail: Detail;
  state: 'wanted' | 'loading' | 'ready' | 'failed';
  body: SkinnedBody | null;
}

export interface CrowdBodies {
  /** The people now in the scene (everyone who may get a body). Bodies of people no longer listed are freed. */
  sync(specs: readonly BodySpec[]): void;
  /** After a frame was drawn: start fetching what is wanted. */
  start(renderer: { getContext?: () => unknown } | null | undefined): void;
  /** Whether a person's body is in and shown (their procedural figure is hidden). */
  has(id: string): boolean;
  /** Move or pose a person who has a body (a peer walking). A change of look is a new person: call sync. */
  update(id: string, patch: Partial<Pick<BodySpec, 'x' | 'y' | 'z' | 'ry' | 'pose' | 'seat' | 'phase'>>): boolean;
  /** The bodies that are in, for the scene's stats and the tests. */
  readonly ready: number;
  readonly triangles: number;
  readonly budget: RosterBudget;
  dispose(): void;
}

const PARALLEL = 2;
/** The character a person wears: a regular by their description, anyone else by their saved look, else the seed alone. */
export function pickFor(spec: Pick<BodySpec, 'kind' | 'look' | 'seed' | 'regular'>): RosterPick | null {
  if (spec.regular) return regularPick(spec.regular);
  return spec.look ? pickOf(spec.look, spec.seed) : seededPick(spec.seed);
}

export function createCrowdBodies(kit: Kit, onChange: () => void, options: { allowed?: boolean; tier?: RosterTier; load?: (look: unknown, seed: unknown, pick: RosterPick, detail: Detail) => Promise<SkinnedBody> } = {}): CrowdBodies {
  const tier: RosterTier = options.tier ?? (heroAllowed() ? 'full' : 'lite');
  const budget = createRosterBudget(tier);
  const entries = new Map<string, Entry>();
  let failed = options.allowed === false, gone = false, loading = 0;

  const key = (spec: BodySpec, pick: RosterPick): string => `${pick.id}:${pick.outfit}:${pick.skin}:${spec.kind === 'peer' ? 'p' : 'n'}`;
  function show(entry: Entry): void {
    const body = entry.body, spec = entry.spec;
    if (!body) return;
    const pose = BODY_POSE[spec.pose] ?? 'idle', h = seedNumber(spec.id);
    body.place(spec.x, spec.y, spec.z, spec.ry);
    if (pose === 'sit') { body.show('sit', false); body.sitOn(spec.x, spec.y + (spec.seat ?? 0.6), spec.z, spec.ry); }
    else if (pose === 'walk' || pose === 'jog') body.stride(spec.phase ?? (h % 628) / 100, pose === 'jog');
    else if (pose === 'dance' || pose === 'interact') body.sampleUse(pose, (h % 100) / 40);
    else body.show('idle', false);
    body.place(spec.x, spec.y, spec.z, spec.ry);
    if (pose === 'sit') body.sitOn(spec.x, spec.y + (spec.seat ?? 0.6), spec.z, spec.ry);
  }
  function drop(entry: Entry): void {
    entry.body?.dispose();
    entry.body = null;
    if (entry.state !== 'failed') budget.release(entry.detail);
  }
  function load(entry: Entry): void {
    entry.state = 'loading'; loading += 1;
    const spec = entry.spec;
    setTimeout(() => {
      const request = options.load ? options.load(spec.look, spec.seed, entry.pick, entry.detail)
        : importBody().then((module) => module.loadBody(kit, spec.look, spec.seed, 1, { lod: entry.detail, pick: entry.pick }));
      request.then((body) => {
        loading -= 1;
        if (gone || entries.get(spec.id) !== entry) { body.dispose(); pump(); return; }
        entry.body = body; entry.state = 'ready';
        entry.spec.parent.add(body.object);
        body.fit(1);
        show(entry);
        onChange();
        pump();
      }).catch((error: unknown) => {
        loading -= 1;
        if (entries.get(spec.id) === entry) { budget.release(entry.detail); entry.state = 'failed'; }
        console.warn('Roster body unavailable; keeping the drawn figure:', error);
        pump();
      });
    }, 0);
  }
  /** Start the next wanted loads, a couple at a time. */
  function pump(): void {
    if (gone || failed) return;
    for (const entry of entries.values()) {
      if (loading >= PARALLEL) return;
      if (entry.state === 'wanted') load(entry);
    }
  }
  let renderer: { getContext?: () => unknown } | null | undefined;
  return {
    budget,
    get ready() { let n = 0; for (const entry of entries.values()) if (entry.state === 'ready') n++; return n; },
    get triangles() { let sum = 0; for (const entry of entries.values()) if (entry.body) sum += entry.body.triangles; return sum; },
    sync(specs) {
      const wanted = new Set(specs.map((spec) => spec.id));
      for (const [id, entry] of [...entries]) if (!wanted.has(id)) { drop(entry); entries.delete(id); onChange(); }
      // Players first (they are looked at), then the regulars and the rest, in the order the scene gave them.
      const order = [...specs].sort((a, b) => Number(b.kind === 'peer') - Number(a.kind === 'peer'));
      for (const spec of order) {
        const pick = pickFor(spec);
        if (!pick) continue;
        const had = entries.get(spec.id), same = had && had.key === key(spec, pick);
        if (had && same) {
          had.spec = spec;
          if (had.body) { if (had.body.object.parent !== spec.parent) spec.parent.add(had.body.object); show(had); }
          continue;
        }
        if (had) { drop(had); entries.delete(spec.id); }
        const detail = budget.request(spec.kind);
        if (!detail) continue;
        entries.set(spec.id, { spec, key: key(spec, pick), pick, detail, state: 'wanted', body: null });
      }
    },
    start(next) {
      renderer = next;
      if (gone || failed) return;
      if (!drawsWebGL2(renderer)) { failed = true; return; }
      pump();
    },
    has(id) { return entries.get(id)?.state === 'ready'; },
    update(id, patch) {
      const entry = entries.get(id);
      if (!entry) return false;
      Object.assign(entry.spec, patch);
      if (entry.state === 'ready') show(entry);
      return entry.state === 'ready';
    },
    dispose() {
      gone = true;
      for (const entry of entries.values()) drop(entry);
      entries.clear();
    },
  };
}
