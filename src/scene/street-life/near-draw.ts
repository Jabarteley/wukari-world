/**
 * OWNER: scenes
 * Street life, the near crowd drawn (the rules are ./near.ts). A chunk of its own, fetched by ./draw.ts only when near.ts nearCrowdFor
 * says yes; it fetches the skinned body module the same way the player's body does (src/scene/body/gate.ts importBody), so none of
 * this is in the first download or the shared scene chunk.
 *
 *   bodies   a POOL of skinned bodies (src/scene/body/skinned.ts createCrowdBodies: one parse and one texture per body file, a simplified
 *            index of about 2,430 triangles each), made one at a time and kept for the scene. A body is handed from one person to the
 *            next by re-dressing it (wear: the look's colours and the wardrobe layer), at most one re-dress a frame. A person whose body
 *            is not ready stays a cut-out, so nothing ever pops out of sight.
 *   people   each frame, near.ts nearCandidates keeps only people standing on the scene's walkable floor (a final point-in-bounds
 *            guard: no floor given, no bodies; a child and parent pass together or not at all), selectNear picks who is near, draw.ts
 *            hides their cut-outs (the instance collapses to nothing) and this
 *            puts the body where the cut-out was, facing the same way: walking at the stride their pace gives, standing (the idle clip,
 *            each at their own point in it), sipping a coffee, or looking at a phone; heads turn toward the player when close.
 *   props    ONE InstancedMesh of cups and ONE of phones, placed at the hands each frame: two draw calls for every prop there is.
 *
 * Caps: the choice's people, triangles (each body's simplified index, less what its clothes hide, plus its wardrobe layer) and draw
 * calls; the far crowd's adaptive caps shrink it (setCap). No frames of its own: update() runs inside the far crowd's step(); a body
 * that arrives between frames asks for one (changed). A body that fails to load ends the near crowd for the scene; the cut-outs stay.
 */
import type * as THREE from 'three';
import type { Kit } from '../kit.ts';
import { importBody } from '../body/gate.ts';
import type { BodyKey } from '../body/manifest.ts';
import { CROWD_LOD } from '../body/crowd-lod.ts';
import type { CrowdBodies, SkinnedBody } from '../body/skinned.ts';
import type { Person, PersonPose } from './crowd.ts';
import { CHILD_HEAD, PROP_CALLS, easeGlance, glanceYaw, nearAction, nearCandidates, nearDress, selectNear } from './near.ts';
import type { Eye, NearAction, NearChoice, NearDress } from './near.ts';

export interface NearCrowdOptions {
  /** The street-life group: the bodies and props are drawn in its coordinates. */
  parent: THREE.Object3D
  seed: string
  people: readonly Person[]
  choice: NearChoice
  /** The scene's walkable floor (its walk grid): only people standing on it may be bodies. None given: no bodies at all. */
  walkable?: ((x: number, z: number) => boolean) | null
  /** A body came in between frames: put everyone again at the last instant and draw one frame. */
  changed(): void
  /** Tests: make a body without the body module. */
  make?(dress: NearDress): Promise<SkinnedBody>
}
/** What the far crowd's step hands over: everyone's pose and ground height this instant (index = person), how many are shown. */
export interface NearFrame {
  poses: readonly (PersonPose | null)[]
  heights: ArrayLike<number>
  count: number
  eye: Eye | null
  player: { x: number; z: number } | null
  seconds: number
  /** Seconds since the last frame; 0 when placing still (settle, reduced motion). */
  dt: number
}
export interface NearCrowd {
  /** Pose the near people; returns who is drawn as a body (their cut-outs are to be hidden). */
  update(frame: NearFrame): ReadonlySet<number>
  setCap(cap: number): void
  readonly cap: number
  readonly shown: number
  readonly bodies: number
  readonly triangles: number
  readonly drawCalls: number
  readonly failed: boolean
  dispose(): void
}

/**
 * Stills of the 2 s drink loop (each body has its own) that hold a phone: by the chin (on a call) and in front of the belly (reading it).
 * Read off headless captures of both bodies; the woman's loop lowers the hand from about 1.0 s, the man's later.
 */
export const PHONE_SECONDS: Readonly<Record<BodyKey, { call: number; look: number }>> = Object.freeze({ female: { call: 0.4, look: 0.9 }, male: { call: 0.5, look: 1.45 } });
/** How far the palm is from the wrist, as a share of the person's height. */
const PALM = 0.04;
/** How many bodies a scene may ever make, as a multiple of its cap (a pool turned over by re-dressing; this only bounds churn). */
const MADE_FACTOR = 3;
/** The least time between one body coming in and the next being made (ms). */
export const CREATE_GAP_MS = 180;

interface Slot {
  body: SkinnedBody
  key: BodyKey
  /** Who it is drawn as now, and who it is dressed as (kept while free, so the same person coming back needs no re-dress). */
  person: number | null
  dressed: number
  head: THREE.Object3D | null
  neck: THREE.Object3D | null
  hand: THREE.Object3D | null
  forearm: THREE.Object3D | null
  glance: number
  triangles: number
  calls: number
}

export function createNearCrowd(kit: Kit, options: NearCrowdOptions): NearCrowd {
  const { THREE } = kit, { people, choice } = options;
  const group = new THREE.Group();
  group.name = 'near-crowd';
  options.parent.add(group);
  const slots: Slot[] = [], dresses = new Map<number, NearDress>();
  let crowd: CrowdBodies | null = null, pending: number | null = null, made = 0, failed = false, disposed = false, cap = choice.people, rest = 0;
  const now = (): number => globalThis.performance?.now?.() ?? Date.now();
  let drawn = new Set<number>(), short = false;
  const dressOf = (index: number): NearDress => {
    let dress = dresses.get(index);
    if (!dress) { dress = nearDress(people[index]!, index, options.seed); dresses.set(index, dress); }
    return dress;
  };
  const keyOf = (index: number): BodyKey => (dressOf(index).look.body === 'man' ? 'male' : 'female');

  // ---- props: cups and phones, one instanced mesh each -----------------------------------------------------------------------------
  const cupGeometry = new THREE.CylinderGeometry(0.5, 0.4, 1, 10, 1);
  cupGeometry.translate(0, 0.5, 0);
  const phoneGeometry = new THREE.BoxGeometry(1, 1, 1);
  const propMaterial = kit.matte ? new THREE.MeshLambertMaterial({ color: '#ffffff' }) : new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, metalness: 0 });
  const capacity = Math.max(1, choice.people);
  const cups = new THREE.InstancedMesh(cupGeometry, propMaterial, capacity), phones = new THREE.InstancedMesh(phoneGeometry, propMaterial, capacity);
  cups.name = 'near-cups'; phones.name = 'near-phones';
  for (const mesh of [cups, phones]) { mesh.count = 0; mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(mesh); }
  const cupColours = ['#f4f1ea', '#b98a5a', '#c43b2f', '#f4f1ea', '#2f5d3a'].map((hex) => new THREE.Color(hex)), phoneColour = new THREE.Color('#15171b');
  for (let i = 0; i < capacity; i++) { cups.setColorAt(i, cupColours[i % cupColours.length]!); phones.setColorAt(i, phoneColour); }

  const matrix = new THREE.Matrix4(), at = new THREE.Vector3(), toward = new THREE.Vector3(), size = new THREE.Vector3(), turn = new THREE.Quaternion();
  const worldTurn = new THREE.Quaternion(), axis = new THREE.Vector3(), spin = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), basis = new THREE.Matrix4();

  /** Turn a bone about the world's vertical (whatever its own axes are) by `yaw`. */
  function yawBone(bone: THREE.Object3D | null, yaw: number): void {
    if (!bone || !yaw) return;
    bone.getWorldQuaternion(worldTurn);
    axis.copy(up).applyQuaternion(worldTurn.invert());
    bone.quaternion.multiply(spin.setFromAxisAngle(axis, yaw));
  }
  function cost(body: SkinnedBody): { triangles: number; calls: number } {
    const lod = crowd?.triangles(body.key) ?? CROWD_LOD.bodies[body.key].triangles, metrics = body.wardrobe;
    return { triangles: Math.max(0, lod - metrics.hiddenTriangles) + metrics.triangles, calls: 1 + metrics.addedDrawCalls };
  }
  function bones(body: SkinnedBody): Pick<Slot, 'head' | 'neck' | 'hand' | 'forearm'> {
    const find = (name: string) => body.object.getObjectByName(name) ?? null;
    return { head: find('Head'), neck: find('neck_01'), hand: find('hand_r'), forearm: find('lowerarm_r') };
  }

  function create(index: number): void {
    pending = index; made += 1;
    const dress = dressOf(index);
    const request = options.make ? options.make(dress)
      : (crowd ? Promise.resolve(crowd) : importBody().then((module) => (crowd = module.createCrowdBodies(kit)))).then((bodies) => bodies.make(dress.look, dress.seed, dress.scale));
    request.then((body) => {
      // A breather before the next body, so the work of making them is spread over frames (the frame guard watches the gaps).
      pending = null; rest = now() + CREATE_GAP_MS;
      if (disposed) { body.dispose(); return; }
      body.object.visible = false;
      group.add(body.object);
      slots.push({ body, key: body.key, person: null, dressed: index, ...bones(body), glance: 0, ...cost(body) });
      options.changed();
      // More are wanted than there are bodies: after the breather, one more step (and frame) makes the next.
      if (short) setTimeout(() => { if (!disposed && short) options.changed(); }, CREATE_GAP_MS + 10);
    }).catch((error: unknown) => {
      pending = null; failed = true;
      console.warn('Near crowd unavailable; keeping the cut-outs:', error);
      options.changed();
    });
  }

  /** Re-dress a free body as `index`: the look's colours and wardrobe, and the body's fit for their height. */
  function redress(slot: Slot, index: number): boolean {
    const dress = dressOf(index);
    if (!slot.body.wear(dress.look, dress.seed)) return false;
    slot.body.fit(dress.scale);
    slot.dressed = index;
    Object.assign(slot, cost(slot.body));
    return true;
  }

  function pose(slot: Slot, index: number, frame: NearFrame, action: NearAction): void {
    const place = frame.poses[index]!, dress = dressOf(index), body = slot.body;
    if (action.kind === 'walk') body.stride(action.phase, false, 0, false);
    else if (action.kind === 'phone') body.sampleUse('drink', PHONE_SECONDS[slot.key][action.call ? 'call' : 'look']);
    else body.sampleUse(action.kind === 'drink' ? 'drink' : 'idle', action.seconds);
    body.place(place.x, frame.heights[index] ?? 0, place.z, place.ry);
    if (frame.dt > 0) body.step(frame.dt);
    if (dress.child && slot.head) slot.head.scale.setScalar(CHILD_HEAD);
    const target = glanceYaw({ x: place.x, z: place.z, ry: place.ry }, frame.player);
    slot.glance = frame.dt > 0 ? easeGlance(slot.glance, target, frame.dt) : target;
    if (Math.abs(slot.glance) > 1e-3) {
      body.object.updateMatrixWorld(true);
      yawBone(slot.neck, slot.glance * 0.35);
      yawBone(slot.head, slot.glance * 0.65);
    }
  }

  function props(frame: NearFrame): void {
    let cupCount = 0, phoneCount = 0;
    group.updateWorldMatrix(true, false);
    for (const slot of slots) {
      if (slot.person === null || !slot.hand) continue;
      const index = slot.person, dress = dressOf(index), place = frame.poses[index];
      if (!dress.prop || !place) continue;
      const action = nearAction(people[index]!, place, dress, frame.seconds);
      if (dress.prop === 'phone' && action.kind !== 'phone') continue;
      const height = people[index]!.height;
      slot.body.object.updateMatrixWorld(true);
      slot.hand.getWorldPosition(at); group.worldToLocal(at);
      // The palm: on from the wrist (the hand bone) along the forearm, whatever way the bones' own axes point.
      if (slot.forearm) { slot.forearm.getWorldPosition(toward); group.worldToLocal(toward); at.addScaledVector(toward.sub(at).normalize(), -PALM * height); }
      if (dress.prop === 'cup') {
        size.set(0.042 * height, 0.06 * height, 0.042 * height);
        at.y -= 0.035 * height;
        cups.setMatrixAt(cupCount++, matrix.compose(at, turn.identity(), size));
      } else {
        // The phone faces the eyes: its long side up, its screen toward the head.
        (slot.head ?? slot.hand).getWorldPosition(toward); group.worldToLocal(toward);
        basis.lookAt(at, toward, up);
        size.set(0.04 * height, 0.085 * height, 0.006 * height);
        phones.setMatrixAt(phoneCount++, matrix.compose(at, turn.setFromRotationMatrix(basis), size));
      }
    }
    cups.count = cupCount; phones.count = phoneCount;
    cups.instanceMatrix.needsUpdate = true; phones.instanceMatrix.needsUpdate = true;
  }

  function update(frame: NearFrame): ReadonlySet<number> {
    if (disposed || failed) return (drawn = new Set());
    const wanted = selectNear(nearCandidates(people, frame.poses, frame.count, options.walkable), frame.eye, drawn, cap);
    const keep = new Set(wanted);
    for (const slot of slots) if (slot.person !== null && !keep.has(slot.person)) { slot.person = null; slot.body.object.visible = false; }
    let triangles = 0, calls = PROP_CALLS, redressed = false;
    for (const slot of slots) if (slot.person !== null) { triangles += slot.triangles; calls += slot.calls; }
    const next = new Set<number>();
    short = false;
    for (const index of wanted) {
      let slot = slots.find((s) => s.person === index);
      if (!slot) {
        const key = keyOf(index), free = slots.filter((s) => s.person === null && s.key === key);
        slot = free.find((s) => s.dressed === index);
        if (!slot && free.length && !redressed) { redressed = true; slot = free.find((s) => redress(s, index)); }
        if (!slot) {
          short = true;
          if (pending === null && now() >= rest && made < MADE_FACTOR * Math.max(1, choice.people)) {
            // A pool as large as the cap; past it, a free body of the other file makes way.
            if (slots.length >= choice.people) {
              const spare = slots.findIndex((s) => s.person === null && s.key !== key);
              if (spare >= 0) { slots[spare]!.body.dispose(); slots.splice(spare, 1); create(index); }
            } else create(index);
          }
          continue;
        }
        if (triangles + slot.triangles > choice.triangles || calls + slot.calls > choice.drawCalls) continue;
        triangles += slot.triangles; calls += slot.calls;
        slot.person = index; slot.glance = 0;
      }
      const action = nearAction(people[index]!, frame.poses[index]!, dressOf(index), frame.seconds);
      pose(slot, index, frame, action);
      slot.body.object.visible = true;
      next.add(index);
    }
    drawn = next;
    props(frame);
    return drawn;
  }

  return {
    update,
    setCap(value) { cap = Math.max(0, Math.min(choice.people, Math.floor(value))); },
    get cap() { return cap; },
    get shown() { return drawn.size; },
    get bodies() { return slots.length; },
    get triangles() {
      let total = 0;
      for (const slot of slots) if (slot.person !== null) total += slot.triangles;
      return total + (cups.count ? cups.count * 40 : 0) + (phones.count ? phones.count * 12 : 0);
    },
    get drawCalls() {
      let total = (cups.count ? 1 : 0) + (phones.count ? 1 : 0);
      for (const slot of slots) if (slot.person !== null) total += slot.calls;
      return total;
    },
    get failed() { return failed; },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const slot of slots) slot.body.dispose();
      slots.length = 0;
      crowd?.dispose(); crowd = null;
      for (const mesh of [cups, phones]) mesh.dispose();
      cupGeometry.dispose(); phoneGeometry.dispose(); propMaterial.dispose();
      group.parent?.remove(group);
      drawn = new Set();
    },
  };
}
