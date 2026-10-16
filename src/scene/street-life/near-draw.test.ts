// Native near-street hand-off without WebGL: the far snapshot remains until one full actor is ready and affordable.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createKit } from '../kit.ts';
import type { SkinnedBody } from '../body/skinned.ts';
import { createNearCrowd } from './near-draw.ts';
import type { NearFrame } from './near-draw.ts';
import { nearCrowdFor, nearDress } from './near.ts';
import type { NearDress } from './near.ts';
import { planPeople } from './crowd.ts';
import type { PersonPose } from './crowd.ts';
import type { Lane } from './plan.ts';

const lanes: Lane[] = [{ ax: -60, az: 0, bx: 60, bz: 0, width: 2.4 }];
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

interface FakeBody extends SkinnedBody {
  calls: string[]
  worn: unknown[]
  phases: number[]
  positiveSteps: number
  zeroSteps: number
  disposed: boolean
}

function fakeBody(dress: NearDress, metrics = { triangles: 30_000, drawCalls: 8 }, cycle = 2): FakeBody {
  const object = new THREE.Group();
  const neck = new THREE.Object3D(), head = new THREE.Object3D();
  neck.name = 'neck_01'; head.name = 'head'; neck.add(head); object.add(neck);
  object.userData.triangles = metrics.triangles;
  object.userData.drawCalls = metrics.drawCalls;
  const body = {
    object,
    ready: Promise.resolve(),
    key: dress.look.native.appearance.body,
    scale: 1,
    scaleX: 1,
    scaleZ: 1,
    strideScale: 1,
    cycleDistance: () => cycle,
    wardrobe: {
      triangles: Math.max(0, metrics.triangles - 1_000), hiddenTriangles: 0,
      addedDrawCalls: Math.max(0, metrics.drawCalls - 1), bytes: 0, itemTriangles: {},
    },
    wardrobeError: null,
    easing: false,
    contactSolvable: true,
    pose: 'idle' as const,
    seated: false,
    calls: [] as string[],
    worn: [] as unknown[],
    phases: [] as number[],
    positiveSteps: 0,
    zeroSteps: 0,
    disposed: false,
    setPresentation: () => true,
    sampleFootContacts: () => [],
    solveFeet: () => ({}) as never,
    show(pose: string) { body.calls.push(`show:${pose}`); head.quaternion.identity(); neck.quaternion.identity(); },
    sampleUse: () => undefined,
    enter: () => undefined,
    stride(phase: number) { body.calls.push('stride'); body.phases.push(phase); head.quaternion.identity(); neck.quaternion.identity(); },
    step(dt: number) { if (dt > 0) body.positiveSteps += 1; else body.zeroSteps += 1; return false; },
    settle: () => undefined,
    place(x: number, y: number, z: number, ry: number) { object.position.set(x, y, z); object.rotation.y = ry; },
    sitOn: () => undefined,
    workOn: () => undefined,
    fit(scale: number) { body.calls.push(`fit:${scale.toFixed(3)}`); },
    wear(look: NearDress['look']) {
      if (look.native.appearance.body !== body.key) return false;
      body.worn.push(look);
      return true;
    },
    setAmbientFace: () => undefined,
    staticMaterials: () => ({ forMesh: () => new THREE.MeshBasicMaterial(), dispose: () => undefined }),
    dispose() { body.disposed = true; object.removeFromParent(); },
  };
  return body as FakeBody;
}

function sparseFrame(length: number, entries: readonly [number, PersonPose][], dt = .1): NearFrame {
  const poses: (PersonPose | null)[] = Array.from({ length }, () => null);
  for (const [index, pose] of entries) poses[index] = pose;
  return {
    poses,
    heights: new Float32Array(length),
    count: length,
    eye: { x: 0, z: 0 },
    player: { x: 0, z: 0 },
    seconds: 20,
    dt,
  };
}

const walking = (x: number, travelled = 1): PersonPose => ({
  x, z: 1, ry: Math.PI, phase: 0, fade: 1, mode: 0, lift: 0, travelled,
});

test('one native actor replaces its far snapshot only after readiness and exact scene-room admission', async () => {
  const kit = createKit(), parent = new THREE.Group();
  const people = planPeople('near-native|room', { lanes }, 80);
  const choice = nearCrowdFor('full')!;
  const first = 0, frame = sparseFrame(people.length, [[first, walking(1)]]);
  let release!: (body: FakeBody) => void;
  const request = new Promise<FakeBody>((resolve) => { release = resolve; });
  let remaining = { triangles: 30_000, drawCalls: 8 }, changed = 0;
  const made = fakeBody(nearDress(people[first]!, first, 'near-native|room'));
  const near = createNearCrowd(kit, {
    parent, seed: 'near-native|room', people, choice, walkable: () => true,
    room: () => remaining, changed: () => { changed += 1; }, make: async () => request,
  });

  assert.deepEqual([...near.update(frame)], [], 'the far snapshot remains while the full body is pending');
  assert.equal(near.bodies, 0);
  release(made); await settle();
  assert.equal(changed, 1);
  assert.equal(near.bodies, 1);
  assert.equal(made.object.visible, false, 'ready is not enough: update owns the hand-off');

  remaining = { triangles: 29_999, drawCalls: 8 };
  assert.deepEqual([...near.update(frame)], [], 'one missing triangle keeps the far snapshot');
  remaining = { triangles: 30_000, drawCalls: 7 };
  assert.deepEqual([...near.update(frame)], [], 'one missing draw call keeps the far snapshot');
  remaining = { triangles: 30_000, drawCalls: 8 };
  assert.deepEqual([...near.update(frame)], [first], 'the exact measured room admits it');
  assert.equal(near.triangles, 30_000);
  assert.equal(near.drawCalls, 8);
  assert.equal(near.shown, 1);
  assert.equal(made.object.visible, true);
  assert.ok(Math.abs(made.phases.at(-1)! - Math.PI) < 1e-9, 'travelled distance uses the body cycle distance');
  assert.equal(made.positiveSteps, 1, 'one positive native clock tick per admitted update');
  assert.equal(made.zeroSteps, 0);
  assert.equal(made.object.getObjectByName('head')!.scale.x, 1, 'the native head is not reshaped');

  near.setCap(99);
  const two = sparseFrame(people.length, [[first, walking(1)], [1, walking(2)]]);
  assert.equal(near.update(two).size, 1, 'the hard cap stays one even when callers request more');
  const beforeZero = made.positiveSteps;
  near.update(sparseFrame(people.length, [[first, walking(1)]], 0));
  assert.equal(made.positiveSteps, beforeZero);
  assert.equal(made.zeroSteps, 0, 'zero dt is not forwarded to the native clock');

  remaining = { triangles: 29_999, drawCalls: 8 };
  assert.equal(near.update(frame).size, 0);
  assert.equal(made.object.visible, false, 'room loss restores the far snapshot');
  assert.equal(near.triangles, 0);
  assert.equal(near.drawCalls, 0);

  near.dispose();
  assert.equal(made.disposed, true);
  assert.equal(parent.children.length, 0);
  kit.dispose();
});

test('an admitted body is re-dressed for a same-body person and can re-enter without loading another actor', async () => {
  const kit = createKit(), parent = new THREE.Group();
  const people = planPeople('near-native|reuse', { lanes }, 120);
  const dresses = people.map((person, index) => nearDress(person, index, 'near-native|reuse'));
  let first = -1, second = -1;
  for (let i = 0; i < dresses.length && second < 0; i++) for (let j = i + 1; j < dresses.length; j++) {
    if (dresses[i]!.look.native.appearance.body === dresses[j]!.look.native.appearance.body) { first = i; second = j; break; }
  }
  assert.ok(first >= 0 && second >= 0);
  const made: FakeBody[] = [];
  const near = createNearCrowd(kit, {
    parent, seed: 'near-native|reuse', people, choice: nearCrowdFor('full')!, walkable: () => true,
    room: () => ({ triangles: 30_000, drawCalls: 8 }), changed: () => undefined,
    make: async (dress) => { const body = fakeBody(dress); made.push(body); return body; },
  });
  const frame = (index: number, travelled: number) => sparseFrame(people.length, [[index, walking(1, travelled)]]);

  assert.equal(near.update(frame(first, .5)).size, 0);
  await settle();
  assert.deepEqual([...near.update(frame(first, .5))], [first]);
  const body = made[0]!;
  const ticks = body.positiveSteps;

  assert.deepEqual([...near.update(frame(second, 1.5))], [second]);
  assert.equal(made.length, 1, 'same native body is reused');
  assert.equal(body.worn.length, 1, 'the reused actor receives the next full native look');
  assert.equal(body.positiveSteps, ticks + 1);
  assert.ok(Math.abs(body.phases.at(-1)! - 1.5 * Math.PI) < 1e-9);

  assert.deepEqual([...near.update(frame(first, 2))], [first], 'the first identity can re-enter');
  assert.equal(made.length, 1);
  assert.equal(body.worn.length, 2);
  assert.equal(body.positiveSteps, ticks + 2);

  near.dispose(); kit.dispose();
});

test('dispose during a pending load disposes the late body and never removes a far snapshot', async () => {
  const kit = createKit(), parent = new THREE.Group();
  const people = planPeople('near-native|dispose', { lanes }, 20);
  let release!: (body: FakeBody) => void;
  const request = new Promise<FakeBody>((resolve) => { release = resolve; });
  let changed = 0;
  const near = createNearCrowd(kit, {
    parent, seed: 'near-native|dispose', people, choice: nearCrowdFor('full')!, walkable: () => true,
    changed: () => { changed += 1; }, make: async () => request,
  });
  const frame = sparseFrame(people.length, [[0, walking(1)]]);
  assert.equal(near.update(frame).size, 0);
  near.dispose();
  const late = fakeBody(nearDress(people[0]!, 0, 'near-native|dispose'));
  release(late); await settle();
  assert.equal(late.disposed, true);
  assert.equal(changed, 0);
  assert.equal(parent.children.length, 0);
  assert.equal(near.update(frame).size, 0);
  kit.dispose();
});

test('a load failure is sticky and keeps every far snapshot visible', async () => {
  const kit = createKit(), parent = new THREE.Group();
  const people = planPeople('near-native|failure', { lanes }, 20);
  let attempts = 0, changed = 0;
  const near = createNearCrowd(kit, {
    parent, seed: 'near-native|failure', people, choice: nearCrowdFor('full')!, walkable: () => true,
    changed: () => { changed += 1; }, make: async () => { attempts += 1; throw new Error('fixture load failure'); },
  });
  const warn = console.warn; console.warn = () => undefined;
  try {
    const frame = sparseFrame(people.length, [[0, walking(1)]]);
    assert.equal(near.update(frame).size, 0);
    await settle();
    assert.equal(near.failed, true);
    assert.equal(changed, 1);
    assert.equal(near.update(frame).size, 0);
    assert.equal(attempts, 1);
    assert.equal(near.bodies, 0);
  } finally {
    console.warn = warn;
    near.dispose(); kit.dispose();
  }
});

test('without a walkable floor no native load starts', async () => {
  const kit = createKit(), parent = new THREE.Group();
  const people = planPeople('near-native|floor', { lanes }, 20);
  let attempts = 0;
  const near = createNearCrowd(kit, {
    parent, seed: 'near-native|floor', people, choice: nearCrowdFor('full')!, changed: () => undefined,
    make: async (dress) => { attempts += 1; return fakeBody(dress); },
  });
  assert.equal(near.update(sparseFrame(people.length, [[0, walking(1)]])).size, 0);
  await settle();
  assert.equal(attempts, 0);
  assert.equal(near.bodies, 0);
  near.dispose(); kit.dispose();
});
