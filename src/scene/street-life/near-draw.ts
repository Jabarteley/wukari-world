/**
 * OWNER: scenes
 * One live native53 street actor near the camera. The far native snapshot stays visible until the full actor is loaded,
 * measured and admitted by both the street cap and the host's remaining scene budget.
 */
import type * as THREE from 'three';
import type { Kit } from '../kit.ts';
import { importBody } from '../body/gate.ts';
import { measureRenderCost } from '../body/render-cost.ts';
import type { BodyKey } from '../body/manifest.ts';
import type { SkinnedBody } from '../body/skinned.ts';
import type { Person, PersonPose } from './crowd.ts';
import { easeGlance, glanceYaw, nearAction, nearCandidates, nearDress, selectNear } from './near.ts';
import type { Eye, NearAction, NearChoice, NearDress } from './near.ts';
import { placed, spaceNear } from './spacing.ts';
import type { Obstacle, Spot } from './spacing.ts';

export interface NearCrowdRoom { triangles: number; drawCalls: number }
export interface NearCrowdOptions {
  /** The street-life group: the body is drawn in its coordinates. */
  parent: THREE.Object3D
  seed: string
  people: readonly Person[]
  choice: NearChoice
  /** The scene's walkable floor. None given: no live body. */
  walkable?: ((x: number, z: number) => boolean) | null
  /** Current room left in the whole scene, excluding this street group. */
  room?: () => NearCrowdRoom
  /** A body became ready between frames. */
  changed(): void
  /** Tests may provide the body boundary directly. */
  make?(dress: NearDress): Promise<SkinnedBody>
}

export interface NearFrame {
  poses: readonly (PersonPose | null)[]
  heights: ArrayLike<number>
  count: number
  eye: Eye | null
  player: { x: number; z: number } | null
  obstacles?: readonly Obstacle[]
  seconds: number
  /** The native clock advances exactly once when this is positive. */
  dt: number
}

export interface NearCrowd {
  /** Returns the one person, if any, whose far snapshot may be hidden. */
  update(frame: NearFrame): ReadonlySet<number>
  setCap(cap: number): void
  spot(index: number): Spot | undefined
  readonly cap: number
  readonly shown: number
  readonly bodies: number
  readonly triangles: number
  readonly drawCalls: number
  readonly failed: boolean
  dispose(): void
}

export const CREATE_GAP_MS = 180;

interface Slot {
  body: SkinnedBody
  key: BodyKey
  person: number | null
  dressed: number
  head: THREE.Object3D | null
  neck: THREE.Object3D | null
  glance: number
  triangles: number
  calls: number
}

const finiteRoom = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;

export function createNearCrowd(kit: Kit, options: NearCrowdOptions): NearCrowd {
  const { people, choice } = options;
  const group = new kit.THREE.Group();
  group.name = 'near-crowd';
  options.parent.add(group);

  const dresses = new Map<number, NearDress>();
  let slot: Slot | null = null;
  let pending: number | null = null;
  let failed = false, disposed = false, cap = Math.min(1, choice.people), rest = 0;
  let drawn = new Set<number>(), spots = new Map<number, Spot>();
  const now = (): number => globalThis.performance?.now?.() ?? Date.now();

  const dressOf = (index: number): NearDress => {
    let dress = dresses.get(index);
    if (!dress) { dress = nearDress(people[index]!, index, options.seed); dresses.set(index, dress); }
    return dress;
  };
  const keyOf = (index: number): BodyKey => dressOf(index).look.native.appearance.body;

  const worldTurn = new kit.THREE.Quaternion(), axis = new kit.THREE.Vector3(), spin = new kit.THREE.Quaternion(), up = new kit.THREE.Vector3(0, 1, 0);
  function yawBone(bone: THREE.Object3D | null, yaw: number): void {
    if (!bone || !yaw) return;
    bone.getWorldQuaternion(worldTurn);
    axis.copy(up).applyQuaternion(worldTurn.invert());
    bone.quaternion.multiply(spin.setFromAxisAngle(axis, yaw));
  }

  function cost(body: SkinnedBody): Pick<Slot, 'triangles' | 'calls'> {
    const measured = measureRenderCost(body.object);
    const measuredTriangles = measured.scenery.triangles + measured.characters.triangles;
    const measuredCalls = measured.scenery.drawCalls + measured.characters.drawCalls;
    const reportedTriangles = finiteRoom(body.object.userData.triangles);
    const reportedCalls = finiteRoom(body.object.userData.drawCalls);
    return {
      triangles: Math.max(measuredTriangles, reportedTriangles, finiteRoom(body.wardrobe.triangles)),
      calls: Math.max(measuredCalls, reportedCalls, 1 + finiteRoom(body.wardrobe.addedDrawCalls)),
    };
  }

  function bones(body: SkinnedBody): Pick<Slot, 'head' | 'neck'> {
    const find = (name: string) => body.object.getObjectByName(name) ?? null;
    return { head: find('head'), neck: find('neck_01') };
  }

  function create(index: number): void {
    pending = index;
    const dress = dressOf(index);
    const request = options.make
      ? options.make(dress)
      : importBody().then((module) => module.loadBody(kit, dress.look, dress.seed, dress.scale, { detail: 'full' }));
    request.then((body) => {
      pending = null;
      rest = now() + CREATE_GAP_MS;
      if (disposed) { body.dispose(); return; }
      body.object.visible = true;
      const metrics = cost(body);
      body.object.visible = false;
      group.add(body.object);
      slot = { body, key: body.key, person: null, dressed: index, ...bones(body), glance: 0, ...metrics };
      options.changed();
    }).catch((error: unknown) => {
      pending = null;
      failed = true;
      console.warn('Near native crowd unavailable; keeping the far snapshots:', error);
      options.changed();
    });
  }

  function redress(current: Slot, index: number): boolean {
    const dress = dressOf(index);
    if (!current.body.wear(dress.look, dress.seed)) return false;
    current.body.fit(dress.scale);
    current.dressed = index;
    Object.assign(current, cost(current.body));
    return true;
  }

  function pose(current: Slot, index: number, frame: NearFrame, action: NearAction, spot: Spot): void {
    const place = { ...frame.poses[index]!, x: spot.x, z: spot.z }, body = current.body;
    if (action.kind === 'walk') {
      const distance = Math.max(1e-6, body.cycleDistance(false));
      body.stride((2 * Math.PI * action.travelled) / distance, false, 0, false);
    } else body.show('idle');
    body.place(place.x, frame.heights[index] ?? 0, place.z, place.ry);
    if (frame.dt > 0) body.step(frame.dt);

    const target = glanceYaw({ x: place.x, z: place.z, ry: place.ry }, frame.player);
    current.glance = frame.dt > 0 ? easeGlance(current.glance, target, frame.dt) : target;
    if (Math.abs(current.glance) > 1e-3) {
      body.object.updateMatrixWorld(true);
      yawBone(current.neck, current.glance * 0.35);
      yawBone(current.head, current.glance * 0.65);
    }
  }

  function limits(): NearCrowdRoom {
    const room = options.room?.();
    if (!room) return { triangles: choice.triangles, drawCalls: choice.drawCalls };
    return {
      triangles: Math.min(choice.triangles, finiteRoom(room.triangles)),
      drawCalls: Math.min(choice.drawCalls, finiteRoom(room.drawCalls)),
    };
  }

  function clear(): void {
    if (slot) { slot.person = null; slot.body.object.visible = false; }
    drawn = new Set();
  }

  function update(frame: NearFrame): ReadonlySet<number> {
    if (disposed || failed) { clear(); return drawn; }
    const wanted = selectNear(nearCandidates(people, frame.poses, frame.count, options.walkable), frame.eye, drawn, cap).slice(0, 1);
    if (!wanted.length) { clear(); spots = new Map(); return drawn; }
    const index = wanted[0]!;
    const spaced = spaceNear([placed(index, people[index]!, frame.poses[index]!)], options.walkable, frame.obstacles ?? []);
    const spot = spaced[0]!;
    spots = new Map([[index, spot]]);

    if (slot?.person !== null && slot?.person !== index) clear();
    const key = keyOf(index);
    if (slot && slot.person === null && slot.key !== key) {
      slot.body.dispose();
      slot = null;
    }
    if (!slot) {
      if (pending === null && now() >= rest) create(index);
      drawn = new Set();
      return drawn;
    }
    if (slot.dressed !== index && !redress(slot, index)) {
      slot.body.dispose();
      slot = null;
      if (pending === null && now() >= rest) create(index);
      drawn = new Set();
      return drawn;
    }

    const room = limits();
    if (slot.triangles > room.triangles || slot.calls > room.drawCalls) {
      clear();
      return drawn;
    }

    slot.person = index;
    const action = nearAction(people[index]!, frame.poses[index]!, dressOf(index), frame.seconds);
    pose(slot, index, frame, action, spot);
    slot.body.object.visible = true;
    drawn = new Set([index]);
    return drawn;
  }

  return {
    update,
    setCap(value) { cap = Math.max(0, Math.min(1, choice.people, Math.floor(value))); },
    spot: (index) => drawn.has(index) ? spots.get(index) : undefined,
    get cap() { return cap; },
    get shown() { return drawn.size; },
    get bodies() { return slot ? 1 : 0; },
    get triangles() { return slot?.person === null || !slot ? 0 : slot.triangles; },
    get drawCalls() { return slot?.person === null || !slot ? 0 : slot.calls; },
    get failed() { return failed; },
    dispose() {
      if (disposed) return;
      disposed = true;
      slot?.body.dispose();
      slot = null;
      group.parent?.remove(group);
      drawn = new Set();
    },
  };
}
