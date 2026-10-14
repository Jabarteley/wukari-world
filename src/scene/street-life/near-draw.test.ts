// The near crowd drawn (./near-draw.ts) and its hand-over with the far crowd (./draw.ts): bodies come in one at a time and only then
// does the cut-out go; a body is handed on by re-dressing; caps (people, triangles, draw calls) hold; props sit in the hands; heads turn
// toward a close player; a failed body module leaves the cut-outs; and everything goes with the street. Bodies here are stand-ins
// with the SkinnedBody surface the module uses (the real one needs WebGL and the body files).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createKit } from '../kit.ts';
import { createStreetLife } from './draw.ts';
import { createNearCrowd } from './near-draw.ts';
import type { NearFrame } from './near-draw.ts';
import { CHILD_HEAD, NEAR_CAPS, nearCandidates, nearCrowdFor, nearDress } from './near.ts';
import type { NearDress } from './near.ts';
import { personAt, planPeople } from './crowd.ts';
import type { PersonPose } from './crowd.ts';
import type { Lane } from './plan.ts';
import type { SkinnedBody } from '../body/skinned.ts';
import { CROWD_LOD } from '../body/crowd-lod.ts';

const lanes: Lane[] = [{ ax: -60, az: 0, bx: 60, bz: 0, width: 2.4 }, { ax: -60, az: 9, bx: 60, bz: 9, width: 2.4 }];
const TEN = Date.UTC(2026, 9, 12, 10, 0);
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

interface Fake extends SkinnedBody { calls: string[]; worn: unknown[]; disposed: boolean }
function fakeBody(dress: NearDress, wardrobe = 1_500): Fake {
  const object = new THREE.Group(), head = new THREE.Object3D(), neck = new THREE.Object3D(), hand = new THREE.Object3D(), forearm = new THREE.Object3D();
  head.name = 'Head'; neck.name = 'neck_01'; hand.name = 'hand_r'; forearm.name = 'lowerarm_r';
  neck.position.y = 1.5; head.position.y = 0.1; forearm.position.set(0.3, 1.3, 0.2); hand.position.set(0, -0.3, 0);
  object.add(neck); neck.add(head); object.add(forearm); forearm.add(hand);
  const key = dress.look.body === 'man' ? 'male' : 'female';
  const body = {
    object, key, scale: 1, scaleX: 1, scaleZ: 1, strideScale: 1, easing: false, contactSolvable: true, pose: 'idle', seated: false,
    wardrobe: { triangles: wardrobe, hiddenTriangles: 600, addedDrawCalls: 1, bytes: 0, itemTriangles: {} }, wardrobeError: null,
    calls: [] as string[], worn: [] as unknown[], disposed: false,
    setPresentation: () => true, sampleFootContacts: () => [], solveFeet: () => ({}) as never, show() {}, enter() {}, settle() {}, sitOn() {}, workOn() {},
    sampleUse(pose: string) { body.calls.push(`use:${pose}`); head.scale.setScalar(1); head.quaternion.identity(); neck.quaternion.identity(); },
    stride() { body.calls.push('stride'); head.scale.setScalar(1); head.quaternion.identity(); neck.quaternion.identity(); },
    step() { return false; },
    place(x: number, y: number, z: number, ry: number) { object.position.set(x, y, z); object.rotation.y = ry; },
    fit(scale: number) { body.calls.push(`fit:${scale.toFixed(3)}`); },
    wear(look: { body: string }) { if ((look.body === 'man' ? 'male' : 'female') !== key) return false; body.worn.push(look); return true; },
    dispose() { body.disposed = true; object.removeFromParent(); },
  };
  return body as unknown as Fake;
}

function frameAt(people: ReturnType<typeof planPeople>, seconds: number, eye: { x: number; z: number } | null, dt = 0.1): NearFrame {
  const poses: (PersonPose | null)[] = people.map((person) => personAt(person, { lanes }, seconds));
  return { poses, heights: new Float32Array(people.length), count: people.length, eye, player: eye, seconds, dt };
}

test('bodies come in one at a time; a person is a body only once theirs is in, the nearest first, within the cap', async () => {
  const kit = createKit(), parent = new THREE.Group(), made: Fake[] = [];
  const people = planPeople('lagos|walk', { lanes }, 120);
  const choice = nearCrowdFor('lite')!;
  let changed = 0;
  const near = createNearCrowd(kit, { parent, seed: 'lagos|walk', people, choice, walkable: () => true, changed: () => { changed += 1; }, make: async (dress) => { const body = fakeBody(dress); made.push(body); return body; } });
  const frame = frameAt(people, 50, { x: 0, z: 4 });
  assert.equal(near.update(frame).size, 0, 'nothing until a body is in');
  await settle();
  assert.equal(made.length, 1); assert.equal(changed, 1);
  assert.equal(near.update(frame).size, 1);
  // Every later body waits its breather; force through it by stepping time on.
  for (let k = 0; k < 40 && made.length < choice.people; k++) { await new Promise((resolve) => setTimeout(resolve, 200)); near.update(frame); await settle(); }
  const drawn = near.update(frame);
  assert.equal(drawn.size, choice.people);
  assert.ok(near.bodies <= choice.people);
  // They are the nearest (no one nearer is left a cut-out), and all inside the enter radius.
  const distance = (i: number) => Math.hypot(frame.poses[i]!.x, frame.poses[i]!.z - 4);
  const furthest = Math.max(...[...drawn].map(distance));
  for (let i = 0; i < people.length; i++) if (!drawn.has(i) && frame.poses[i]!.fade >= 1) assert.ok(distance(i) >= furthest - 1e-9, `${i} nearer than a body`);
  // The bodies stand where the cut-outs were, facing the same way.
  for (const index of drawn) {
    const body = made.find((b) => b.object.visible && Math.abs(b.object.position.x - frame.poses[index]!.x) < 1e-9 && Math.abs(b.object.position.z - frame.poses[index]!.z) < 1e-9);
    assert.ok(body, `a body at ${index}`);
    assert.ok(Math.abs(body.object.rotation.y - frame.poses[index]!.ry) < 1e-9);
  }
  // Caps: the drawn triangles and calls never pass the choice.
  assert.ok(near.triangles <= choice.triangles && near.drawCalls <= choice.drawCalls);
  assert.ok(near.triangles >= choice.people * (CROWD_LOD.bodies.female.triangles - 600 + 1_500));
  near.setCap(2);
  assert.equal(near.update(frame).size, 2, 'the adaptive cap shrinks it');
  near.dispose();
  assert.ok(made.every((body) => body.disposed));
  assert.equal(parent.children.length, 0);
  kit.dispose();
});

test('a body is handed on by re-dressing it (or one of the other file is made); the triangle budget holds people back as cut-outs', async () => {
  const kit = createKit(), parent = new THREE.Group(), made: Fake[] = [];
  const people = planPeople('lagos|walk', { lanes }, 120);
  // One person's worth of triangles more than one body: a second never fits.
  const tight = { tier: 'full' as const, people: 4, triangles: CROWD_LOD.bodies.male.triangles + 2_000, drawCalls: 28 };
  const near = createNearCrowd(kit, { parent, seed: 'lagos|walk', people, choice: tight, walkable: () => true, changed: () => undefined, make: async (dress) => { const body = fakeBody(dress); made.push(body); return body; } });
  const first = frameAt(people, 50, { x: 0, z: 4 });
  near.update(first); await settle();
  assert.equal(near.update(first).size, 1);
  for (let k = 0; k < 6; k++) { await new Promise((resolve) => setTimeout(resolve, 200)); near.update(first); await settle(); }
  assert.equal(near.update(first).size, 1, 'the budget holds the rest back as cut-outs');
  // Far along the street: the first person is gone, someone else is near; a free body of their file is re-dressed (no new body made).
  const before = made.length;
  let later: ReadonlySet<number> = new Set();
  for (let t = 60; t < 400 && !later.size; t += 7) {
    const frame = frameAt(people, t, { x: 40, z: 4 });
    for (let k = 0; k < 4; k++) { later = near.update(frame); await new Promise((resolve) => setTimeout(resolve, 200)); await settle(); }
  }
  assert.equal(later.size, 1);
  const worn = made.reduce((sum, body) => sum + body.worn.length, 0);
  assert.ok(worn >= 1 || made.length > before, 'handed on by a re-dress or a body of the other file');
  near.dispose(); kit.dispose();
});

test('poses: walking strides, standing idles at their own point, a coffee sips, a phone is held up; props in the hands; a child\'s head', async () => {
  const kit = createKit(), parent = new THREE.Group(), made = new Map<number, Fake>();
  const people = planPeople('lagos|park', { lanes }, 160, { children: true });
  const dresses = people.map((person, i) => nearDress(person, i, 'lagos|park'));
  const near = createNearCrowd(kit, { parent, seed: 'lagos|park', people, choice: { tier: 'full', people: 20, triangles: 1e9, drawCalls: 1e9 }, walkable: () => true, changed: () => undefined,
    make: async (dress) => { const body = fakeBody(dress); made.set(Number(dress.seed.split('|').pop()), body); return body; } });
  // Hand-built poses: four people right by the camera, one of each kind.
  const pick = (test: (i: number) => boolean) => people.findIndex((_, i) => test(i));
  const walker = pick((i) => !people[i]!.child && dresses[i]!.prop === null);
  const cupper = pick((i) => dresses[i]!.prop === 'cup');
  const phoner = pick((i) => dresses[i]!.prop === 'phone');
  const child = pick((i) => people[i]!.child === true);
  assert.ok(walker >= 0 && cupper >= 0 && phoner >= 0 && child >= 0);
  const base: PersonPose = { x: 0, z: 2, ry: Math.PI, phase: 0, fade: 1, mode: 1, lift: 0, travelled: 3 };
  const poses: (PersonPose | null)[] = people.map(() => null);
  poses[walker] = { ...base, x: -2, mode: 0 }; poses[cupper] = { ...base, x: -1 }; poses[phoner] = { ...base, x: 1, mode: 2 }; poses[child] = { ...base, x: 2, mode: 0 };
  const frame: NearFrame = { poses, heights: new Float32Array(people.length), count: people.length, eye: { x: 0, z: 0 }, player: { x: 0, z: 0 }, seconds: 30, dt: 0.1 };
  for (let k = 0; k < 8 && near.update(frame).size < 4; k++) { await new Promise((resolve) => setTimeout(resolve, 200)); await settle(); }
  const drawn = near.update(frame);
  assert.deepEqual([...drawn].sort((a, b) => a - b), [walker, cupper, phoner, child].sort((a, b) => a - b));
  const last = (i: number) => made.get(i)!.calls.at(-1);
  assert.equal(last(walker), 'stride'); assert.equal(last(child), 'stride');
  assert.equal(last(cupper), 'use:drink'); assert.equal(last(phoner), 'use:drink');
  const cups = parent.getObjectByName('near-cups') as THREE.InstancedMesh, phones = parent.getObjectByName('near-phones') as THREE.InstancedMesh;
  assert.equal(cups.count, 1); assert.equal(phones.count, 1);
  // The cup is in the cup-holder's palm: on from the wrist, away from the elbow, a little under it.
  const hand = new THREE.Vector3(), at = new THREE.Matrix4(), cup = new THREE.Vector3(), elbow = new THREE.Vector3();
  made.get(cupper)!.object.getObjectByName('hand_r')!.getWorldPosition(hand);
  made.get(cupper)!.object.getObjectByName('lowerarm_r')!.getWorldPosition(elbow);
  cups.getMatrixAt(0, at); cup.setFromMatrixPosition(at);
  assert.ok(Math.hypot(cup.x - hand.x, cup.z - hand.z) < 1e-6, 'the forearm hangs straight down here: the palm is under the wrist');
  assert.ok(cup.y < hand.y && hand.y - cup.y < 0.4 && elbow.y > hand.y);
  // The child's head is larger; the others' are not.
  assert.equal(made.get(child)!.object.getObjectByName('Head')!.scale.x, CHILD_HEAD);
  assert.equal(made.get(walker)!.object.getObjectByName('Head')!.scale.x, 1);
  // The player stands close and to one side, in front of them (they face −z, toward the camera at the origin): heads turn.
  const turned = made.get(cupper)!.object.getObjectByName('Head')!.quaternion;
  assert.ok(Math.abs(turned.y) > 1e-3 || Math.abs(turned.x) > 1e-3 || Math.abs(turned.z) > 1e-3, 'the head turned toward the player');
  near.dispose(); kit.dispose();
});

test('in the street: the near people\'s cut-outs collapse while they are bodies, nobody else\'s; a failed body module leaves every cut-out', async () => {
  const kit = createKit(), parent = new THREE.Group();
  let ready = 0;
  const life = createStreetLife(kit, { parent, seed: 'lagos|street', lanes, roads: [], crowd: 120, vehicles: 0, at: TEN, context: 'street', tier: 'full', ready: () => { ready += 1; }, walkable: () => true,
    bodies: async (dress) => fakeBody(dress) });
  // The near chunk is fetched, then bodies come in; the street's step hides the cut-outs of those drawn.
  for (let k = 0; k < 30 && (life.near()?.people ?? 0) < 6; k++) { await new Promise((resolve) => setTimeout(resolve, 200)); life.step(TEN, { x: 0, z: 4 }); }
  const near = life.near()!;
  assert.ok(near.people >= 6, `${near.people} near`);
  assert.equal(near.tier, 'full');
  assert.ok(ready >= 1, 'a body arriving between frames asks for one');
  const crowd = life.group.getObjectByName('street-crowd') as THREE.InstancedMesh, m = new THREE.Matrix4(), s = new THREE.Vector3(), p = new THREE.Vector3(), q = new THREE.Quaternion();
  let hidden = 0;
  for (let i = 0; i < crowd.count; i++) { crowd.getMatrixAt(i, m); m.decompose(p, q, s); if (s.y === 0) hidden += 1; }
  assert.equal(hidden, near.people, 'exactly the bodies\' cut-outs are hidden');
  assert.ok(planPeople('lagos|street', { lanes }, 120, { children: true }).some((person) => person.child), 'the home street has children');
  life.dispose();
  assert.equal(parent.children.length, 0);

  // No bodies (the module fails): every cut-out stays.
  const failing = createStreetLife(kit, { parent, seed: 'lagos|street', lanes, roads: [], crowd: 120, vehicles: 0, at: TEN, context: 'street', tier: 'full', walkable: () => true, bodies: async () => { throw new Error('no body'); } });
  const original = console.warn; console.warn = () => undefined;
  for (let k = 0; k < 5; k++) { await new Promise((resolve) => setTimeout(resolve, 50)); failing.step(TEN, { x: 0, z: 4 }); }
  console.warn = original;
  assert.equal(failing.near()?.failed, true);
  assert.equal(failing.near()?.people, 0);
  const all = failing.group.getObjectByName('street-crowd') as THREE.InstancedMesh;
  for (let i = 0; i < all.count; i++) { all.getMatrixAt(i, m); m.decompose(p, q, s); assert.ok(s.y > 0); }
  failing.dispose();
  // Without a tier (or with the switch off) there is no near crowd at all, and a venue for adults has no children.
  const plain = createStreetLife(kit, { parent, seed: 'x', lanes, roads: [], crowd: 40, vehicles: 0, at: TEN, context: 'club' });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(plain.near(), null);
  plain.dispose();
  assert.equal(NEAR_CAPS.full.people, 12);
  kit.dispose();
});

test('the floor guard: only people standing on the walkable floor become bodies; none without a floor; a family passes together', async () => {
  const kit = createKit(), parent = new THREE.Group();
  const people = planPeople('lagos|park', { lanes }, 160, { children: true });
  const make = async (dress: NearDress) => fakeBody(dress);
  const frame = frameAt(people, 50, { x: 0, z: 4 });
  const fill = async (near: ReturnType<typeof createNearCrowd>) => { for (let k = 0; k < 30; k++) { near.update(frame); await new Promise((resolve) => setTimeout(resolve, 200)); } return near.update(frame); };
  // No floor at all (the fallback): nobody, and no body is ever made.
  let made = 0;
  const none = createNearCrowd(kit, { parent, seed: 'lagos|park', people, choice: nearCrowdFor('full')!, changed: () => undefined, make: async (dress) => { made += 1; return fakeBody(dress); } });
  assert.equal((await fill(none)).size, 0); assert.equal(made, 0);
  none.dispose();
  // A floor that holds only the lane at z = 0 (the venue's floor; the other lane is outside it, behind a wall).
  const floor = (x: number, z: number) => Math.abs(z) < 1.3 && Math.abs(x) < 60;
  const near = createNearCrowd(kit, { parent, seed: 'lagos|park', people, choice: { tier: 'full', people: 20, triangles: 1e9, drawCalls: 1e9 }, walkable: floor, changed: () => undefined, make });
  const drawn = await fill(near);
  assert.ok(drawn.size > 0);
  for (const index of drawn) assert.ok(floor(frame.poses[index]!.x, frame.poses[index]!.z), `${index} is on the floor`);
  near.dispose();
  kit.dispose();
});

test('the final guard covers everyone: off the venue floor no cut-out, child or body is drawn, whatever floor the bodies are given', async () => {
  const kit = createKit(), parent = new THREE.Group(), made: Fake[] = [];
  // The venue's walkable floor holds only the lane at z = 0; the bodies' own floor (wrongly) says yes everywhere: the guard still wins.
  const floor = (x: number, z: number) => Math.abs(z) < 1.3 && Math.abs(x) < 40;
  const life = createStreetLife(kit, { parent, seed: 'lagos|park', lanes, roads: [], crowd: 160, vehicles: 0, at: TEN, context: 'park', tier: 'full', walkable: floor,
    bodyFloor: () => true, bodies: async (dress) => { const body = fakeBody(dress); made.push(body); return body; } });
  for (let k = 0; k < 30 && (life.near()?.people ?? 0) < 6; k++) { await new Promise((resolve) => setTimeout(resolve, 200)); life.step(TEN, { x: 0, z: 2 }); }
  assert.ok((life.near()?.people ?? 0) > 0, 'some bodies on the floor');
  for (const body of made) if (body.object.visible && body.object.parent) assert.ok(floor(body.object.position.x, body.object.position.z), 'a body off the floor');
  const crowd = life.group.getObjectByName('street-crowd') as THREE.InstancedMesh, m = new THREE.Matrix4(), s = new THREE.Vector3(), p = new THREE.Vector3(), q = new THREE.Quaternion();
  let off = 0;
  for (let i = 0; i < crowd.count; i++) { crowd.getMatrixAt(i, m); m.decompose(p, q, s); if (s.y > 0) assert.ok(floor(p.x, p.z), `cut-out ${i} off the floor`); else off += 1; }
  assert.ok(off > 0, 'the people of the lane outside the floor are drawn as nothing');
  life.dispose();
  // No venue floor and no body floor: no bodies at all.
  const bare = createStreetLife(kit, { parent, seed: 'lagos|park', lanes, roads: [], crowd: 80, vehicles: 0, at: TEN, context: 'park', tier: 'full', bodies: async (dress) => fakeBody(dress) });
  for (let k = 0; k < 4; k++) { await new Promise((resolve) => setTimeout(resolve, 50)); bare.step(TEN, { x: 0, z: 2 }); }
  assert.equal(bare.near()?.people ?? 0, 0);
  bare.dispose();
  kit.dispose();
});

test('nearCandidates: shown, placed, on the floor; a child and parent both on it or neither', () => {
  const people = [{ family: 0 }, { family: 0 }, {}, {}] as { family?: number }[];
  const at = (x: number) => ({ x, z: 0, fade: 1 });
  const floor = (x: number) => x < 5;
  assert.deepEqual(nearCandidates(people, [at(1), at(2), at(3), at(9)], 4, floor).map((c) => c.id), [0, 1, 2]);
  assert.deepEqual(nearCandidates(people, [at(1), at(7), at(3), at(4)], 4, floor).map((c) => c.id), [2, 3], 'the child is off the floor: the parent stays a cut-out too');
  assert.deepEqual(nearCandidates(people, [at(1), at(2), at(3), at(4)], 2, floor).map((c) => c.id), [0, 1], 'only those shown');
  assert.deepEqual(nearCandidates(people, [at(1), at(2), null, at(Number.NaN)], 4, floor).map((c) => c.id), [0, 1]);
  assert.deepEqual(nearCandidates(people, [at(1), at(2), at(3), at(4)], 4, null), [], 'no floor: nobody');
});
