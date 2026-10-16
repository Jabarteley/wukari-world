// Pure policy for the native near-street actor: gate, one-actor selection, stable bounded recipes,
// family planning, native-distance actions and glances.
import test from 'node:test';
import assert from 'node:assert/strict';
import { NATIVE_CROWD_DEFAULTS } from '../../character/native-migration.ts';
import { NATIVE_CHARACTER_CATALOG } from '../../character/native-catalog.ts';
import { ADULT_CONTEXTS, CHILD_CONTEXTS, GLANCE, NEAR_CAPS, NEAR_HARD_CAP, NEAR_RADIUS, AVATAR_UNITS, childrenAllowed, easeGlance, forcedNear, glanceYaw, nearAction, nearCap, nearCrowdFor, nearDress, selectNear } from './near.ts';
import type { NearCandidate } from './near.ts';
import { ADULT_HEIGHT, CHILD_HEIGHT, CHILD_SHARE, CHILD_SIDE, FAMILY_PACE, OUTFITS, personAt, planPeople } from './crowd.ts';
import { STREET_KINDS, venueLanes } from './plan.ts';
import type { Lane } from './plan.ts';

const lanes = venueLanes([-14, -12, 14, 12], true, () => true);
const street: Lane[] = [{ ax: -80, az: 0, bx: 80, bz: 0, width: 2.4 }, { ax: -80, az: 14, bx: 80, bz: 14, width: 3, browse: Math.PI }];

test('the gate retains its historic tier ceilings but native live admission is at most one', () => {
  assert.equal(nearCrowdFor(null), null);
  assert.deepEqual(nearCrowdFor('full'), { tier: 'full', ...NEAR_CAPS.full });
  assert.deepEqual(nearCrowdFor('lite'), { tier: 'lite', ...NEAR_CAPS.lite });
  assert.equal(nearCrowdFor('full', 'off'), null);
  assert.equal(nearCrowdFor(null, 'on')?.tier, 'full');
  assert.equal(forcedNear('?nearcrowd=off'), 'off');
  assert.equal(forcedNear('', 'on'), 'on');
  assert.equal(forcedNear('?x=1'), null);
  assert.equal(NEAR_HARD_CAP, 1);
  assert.deepEqual(NEAR_CAPS, { full: { people: 12, triangles: 72_000, drawCalls: 28 }, lite: { people: 6, triangles: 36_000, drawCalls: 14 } });
  const choice = nearCrowdFor('full')!;
  assert.equal(nearCap(choice, 240, 240), 1);
  assert.equal(nearCap(choice, 168, 240), 1);
  assert.equal(nearCap(choice, 0, 240), 0);
  assert.equal(nearCap(choice, 300, 240), 1);
});

test('selectNear keeps hysteresis and deterministic nearest selection inside the one-actor cap', () => {
  const eye = { x: 0, z: 0 };
  const at = (id: number, x: number, fade = 1): NearCandidate => ({ id, x, z: 0, fade });
  const none = new Set<number>();
  assert.deepEqual(selectNear([at(1, 5), at(2, 13), at(3, 15), at(4, 3)], eye, none, 10), [4]);
  assert.deepEqual(selectNear([at(3, 15)], eye, none, 10), []);
  assert.deepEqual(selectNear([at(3, 15)], eye, new Set([3]), 10), [3]);
  assert.deepEqual(selectNear([at(3, NEAR_RADIUS.leave + .1)], eye, new Set([3]), 10), []);
  assert.deepEqual(selectNear([at(1, 9), at(3, 2)], eye, new Set([1]), 10), [1], 'the current actor wins over a nearer newcomer inside hysteresis');
  assert.deepEqual(selectNear([at(1, 9), at(3, 2)], eye, none, 10), [3]);
  assert.deepEqual(selectNear([at(1, 3, .5)], eye, new Set([1]), 4), []);
  assert.deepEqual(selectNear([at(1, -5), at(2, 5)], { x: 0, z: 0, fx: 1, fz: 0 }, none, 4), [2]);
  assert.deepEqual(selectNear([at(1, -.5)], { x: 0, z: 0, fx: 1, fz: 0 }, none, 4), [1]);
  assert.deepEqual(selectNear([at(1, 3)], eye, none, 0), []);
  assert.deepEqual(selectNear([at(7, 4), at(2, 4)], eye, none, 99), [2]);
  assert.deepEqual(selectNear([at(1, 3)], null, none, 4), []);
});

test('hysteresis in motion does not flicker at the boundary', () => {
  let kept = new Set<number>(), changes = 0;
  for (let k = 0; k < 200; k++) {
    const x = 15.5 + Math.sin(k / 3) * 1.6;
    const next = new Set(selectNear([{ id: 1, x, z: 0, fade: 1 }], { x: 0, z: 0 }, kept, 4));
    if (next.has(1) !== kept.has(1)) changes += 1;
    kept = next;
  }
  assert.ok(changes <= 1, `${changes} changes`);
});

test('nearDress materializes one deterministic bounded native recipe and preserves far-person colours and height', () => {
  const people = planPeople('lagos|street', { lanes: street }, 200);
  const dresses = people.map((person, i) => nearDress(person, i, 'lagos|street'));
  assert.deepEqual(nearDress(people[3]!, 3, 'lagos|street'), dresses[3]);
  const bodies = new Set<string>();
  for (const [i, dress] of dresses.entries()) {
    const person = people[i]!, recipe = dress.look.native, appearance = recipe.appearance;
    assert.equal(recipe.schema, 'allworld-character');
    assert.equal(recipe.version, 2);
    assert.equal(appearance.hair, NATIVE_CROWD_DEFAULTS[appearance.body].hair);
    assert.deepEqual(appearance.garments, [NATIVE_CROWD_DEFAULTS[appearance.body].garment]);
    assert.equal(appearance.shoes, NATIVE_CROWD_DEFAULTS[appearance.body].shoes);
    assert.equal(appearance.colors.skin, person.skin);
    assert.equal(appearance.colors.upper, person.jacket ?? person.shirt);
    assert.equal(appearance.colors.lower, person.legs);
    assert.equal(Object.keys(appearance.features).length, NATIVE_CHARACTER_CATALOG.features.length);
    for (const feature of NATIVE_CHARACTER_CATALOG.features) assert.ok(appearance.features[feature.id]! >= feature.min && appearance.features[feature.id]! <= feature.max, feature.id);
    assert.ok(appearance.height >= .85 && appearance.height <= 1.15);
    assert.ok(Math.abs(AVATAR_UNITS * dress.scale * appearance.height - person.height) < 1e-9);
    assert.equal(dress.look.body, appearance.body === 'female' ? 'woman' : 'man');
    bodies.add(appearance.body);
  }
  assert.deepEqual([...bodies].sort(), ['female', 'male'], 'the bounded pool contains both native bodies');
});

test('children remain family-bound and use uniformly scaled native source proportions', () => {
  const plain = planPeople('lagos|park', { lanes: street }, 200);
  assert.ok(plain.every((person) => !person.child));
  const people = planPeople('lagos|park', { lanes: street }, 200, { children: true });
  const children = people.filter((person) => person.child);
  assert.equal(children.length, Math.floor(200 * CHILD_SHARE));
  assert.deepEqual(planPeople('lagos|park', { lanes: street }, 200, { children: true }), people);
  for (const child of children) {
    const at = people.indexOf(child), parent = people[at - 1]!;
    assert.equal(parent.family, child.family);
    assert.ok(!parent.child && parent.habit === 'walk' && !parent.phone);
    assert.equal(child.speed, parent.speed); assert.ok(parent.speed <= FAMILY_PACE);
    assert.equal(child.lane, parent.lane); assert.equal(child.dir, parent.dir);
    assert.deepEqual([child.cycle, child.pause, child.shift], [parent.cycle, parent.pause, parent.shift]);
    assert.ok(child.height >= ADULT_HEIGHT * CHILD_HEIGHT[0] - 1e-9 && child.height <= ADULT_HEIGHT * CHILD_HEIGHT[1] + 1e-9);
    assert.ok(child.height < parent.height);
    assert.ok(['casual', 'sport', 'summer'].includes(OUTFITS[child.outfit]!.name) && child.jacket === null && !child.phone);
    assert.ok(Math.abs(Math.abs(child.across - parent.across) - CHILD_SIDE) < 1e-9);
    for (let t = 0; t < 3_600; t += 37) {
      const a = personAt(parent, { lanes: street }, t), b = personAt(child, { lanes: street }, t);
      if (a.fade < 1) continue;
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 1);
      assert.equal(a.mode === 0, b.mode === 0);
    }
    const dress = nearDress(child, at, 'lagos|park');
    assert.equal(dress.child, true);
    assert.equal(dress.look.appearance.build, 'slim');
    assert.equal(dress.look.appearance.ageAppearance, 'adult');
    assert.ok(Math.abs(AVATAR_UNITS * dress.scale * dress.look.native.appearance.height - child.height) < 1e-9);
  }
  for (let n = 1; n <= people.length; n += 7) {
    const prefix = people.slice(0, n);
    for (const child of prefix.filter((person) => person.child)) assert.ok(prefix.some((person) => !person.child && person.family === child.family));
  }
});

test('the family-place allow-list excludes adult venues', () => {
  for (const context of CHILD_CONTEXTS) assert.ok(childrenAllowed(context), context);
  for (const context of ADULT_CONTEXTS) { assert.ok(!CHILD_CONTEXTS.has(context)); assert.equal(childrenAllowed(context), false); }
  for (const context of ['bar', 'club', 'casino', 'lounge', 'statehouse', 'polling', 'shrine', 'buka', 'quad', 'generic', 'room', undefined, null, '']) assert.equal(childrenAllowed(context), false, String(context));
  for (const context of CHILD_CONTEXTS) assert.ok(context === 'street' || STREET_KINDS.has(context));
});

test('nearAction carries travelled distance for native cycle calibration and treats phone stops as ordinary stands', () => {
  const people = planPeople('lagos|market', { lanes }, 120);
  const walker = people.findIndex((person) => person.habit === 'walk');
  const person = people[walker]!, dress = nearDress(person, walker, 'lagos|market');
  const a = personAt(person, { lanes }, 100), b = personAt(person, { lanes }, 101);
  const first = nearAction(person, a, dress, 100), second = nearAction(person, b, dress, 101);
  assert.equal(first.kind, 'walk'); assert.equal(second.kind, 'walk');
  if (first.kind === 'walk' && second.kind === 'walk') assert.ok(Math.abs(second.travelled - first.travelled - person.speed) < 1e-9);
  const stand = { ...a, mode: 1 as const }, phone = { ...a, mode: 2 as const };
  assert.deepEqual(nearAction(person, stand, dress, 5), { kind: 'stand', seconds: 5 + dress.idle });
  assert.deepEqual(nearAction(person, phone, dress, 5), { kind: 'stand', seconds: 5 + dress.idle });
});

test('the glance is bounded, directional and eased', () => {
  const self = { x: 0, z: 0, ry: 0 };
  assert.equal(glanceYaw(self, { x: 0, z: 4 }), 0);
  assert.ok(glanceYaw(self, { x: 2, z: 3 }) > .5);
  assert.ok(glanceYaw(self, { x: -2, z: 3 }) < -.5);
  assert.equal(glanceYaw(self, { x: 4, z: .1 }), GLANCE.max);
  assert.equal(glanceYaw(self, { x: 0, z: -3 }), 0);
  assert.equal(glanceYaw(self, { x: 0, z: GLANCE.radius + .5 }), 0);
  assert.equal(glanceYaw(self, null), 0);
  assert.equal(easeGlance(.2, 1, 0), .2);
  const half = easeGlance(0, 1, .1);
  assert.ok(half > 0 && half < 1);
  assert.ok(Math.abs(easeGlance(0, 1, 10) - 1) < 1e-6);
});
