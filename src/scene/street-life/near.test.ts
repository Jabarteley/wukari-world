// The near crowd's rules (./near.ts) and the children of the crowd plan (./crowd.ts planPeople { children }): the gate and caps, who is
// near (hysteresis, caps, no one fading or behind the camera), how they are dressed from the avatar's look options, what they do, the
// glance, and where children may walk (an allow-list that never holds a venue for adults).
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLook, LOOK_OPTIONS } from '../characters.ts';
import { normalizeAvatarWearables } from '../../game/wardrobe/rules.ts';
import { avatarProportions } from '../../types/avatar.ts';
import { ADULT_CONTEXTS, CHILD_CONTEXTS, GLANCE, NEAR_CAPS, NEAR_HARD_CAP, NEAR_RADIUS, WALK_CYCLE, AVATAR_UNITS, childrenAllowed, easeGlance, forcedNear, glanceYaw, nearAction, nearCap, nearCrowdFor, nearDress, selectNear } from './near.ts';
import type { NearCandidate } from './near.ts';
import { ADULT_HEIGHT, CHILD_HEIGHT, CHILD_SHARE, CHILD_SIDE, FAMILY_PACE, OUTFITS, personAt, planPeople } from './crowd.ts';
import type { Person } from './crowd.ts';
import { STREET_KINDS, venueLanes } from './plan.ts';
import type { Lane } from './plan.ts';

const lanes = venueLanes([-14, -12, 14, 12], true, () => true);
const street: Lane[] = [{ ax: -80, az: 0, bx: 80, bz: 0, width: 2.4 }, { ax: -80, az: 14, bx: 80, bz: 14, width: 3, browse: Math.PI }];

test('the gate: only on top of a far crowd, the tier sets the caps, the switch turns it off or forces the full tier', () => {
  assert.equal(nearCrowdFor(null), null, 'no far crowd, no near crowd');
  assert.deepEqual(nearCrowdFor('full'), { tier: 'full', ...NEAR_CAPS.full });
  assert.deepEqual(nearCrowdFor('lite'), { tier: 'lite', ...NEAR_CAPS.lite });
  assert.equal(nearCrowdFor('full', 'off'), null);
  assert.equal(nearCrowdFor(null, 'on')?.tier, 'full');
  assert.equal(forcedNear('?nearcrowd=off'), 'off');
  assert.equal(forcedNear('', 'on'), 'on');
  assert.equal(forcedNear('?x=1'), null);
  for (const tier of ['full', 'lite'] as const) {
    const caps = NEAR_CAPS[tier];
    assert.ok(caps.people >= 6 && caps.people <= NEAR_HARD_CAP);
    // A body at its level of detail with a full wardrobe layer is well under 6,000 triangles: the cap holds the people it says.
    assert.ok(caps.triangles / caps.people >= 5_000 && caps.drawCalls >= caps.people * 2 + 2, tier);
  }
  assert.ok(NEAR_CAPS.lite.people <= NEAR_CAPS.full.people / 2);
  // The adaptive caps: the same share as the far crowd, never above the choice.
  const choice = nearCrowdFor('full')!;
  assert.equal(nearCap(choice, 240, 240), 12);
  assert.equal(nearCap(choice, 168, 240), 8);
  assert.equal(nearCap(choice, 0, 240), 0);
  assert.equal(nearCap(choice, 300, 240), 12);
});

test('selectNear: the nearest inside enter, kept until past leave (hysteresis), members before newcomers, capped, deterministic', () => {
  const eye = { x: 0, z: 0 };
  const at = (id: number, x: number, fade = 1): NearCandidate => ({ id, x, z: 0, fade });
  const none = new Set<number>();
  assert.deepEqual(selectNear([at(1, 5), at(2, 13), at(3, 15), at(4, 3)], eye, none, 10), [4, 1, 2], 'inside enter only, nearest first');
  // Someone at 15 (between enter and leave): a newcomer is not taken, a member is kept.
  assert.deepEqual(selectNear([at(3, 15)], eye, none, 10), []);
  assert.deepEqual(selectNear([at(3, 15)], eye, new Set([3]), 10), [3]);
  assert.deepEqual(selectNear([at(3, NEAR_RADIUS.leave + 0.1)], eye, new Set([3]), 10), [], 'past leave: a cut-out again');
  // A full set: members stay, a nearer newcomer waits.
  assert.deepEqual(selectNear([at(1, 9), at(2, 10), at(3, 2)], eye, new Set([1, 2]), 2), [1, 2]);
  assert.deepEqual(selectNear([at(1, 9), at(2, 10), at(3, 2)], eye, none, 2), [3, 1]);
  // Fading at a lane's end, or behind the camera: never a body.
  assert.deepEqual(selectNear([at(1, 3, 0.5)], eye, new Set([1]), 4), []);
  assert.deepEqual(selectNear([at(1, -5), at(2, 5)], { x: 0, z: 0, fx: 1, fz: 0 }, none, 4), [2]);
  assert.deepEqual(selectNear([at(1, -0.5)], { x: 0, z: 0, fx: 1, fz: 0 }, none, 4), [1], 'just beside the camera still counts');
  // Caps: zero, and never past the hard cap; ties to the lower id.
  assert.deepEqual(selectNear([at(1, 3)], eye, none, 0), []);
  const many = Array.from({ length: 40 }, (_, i) => at(i, 1 + (i % 5)));
  assert.equal(selectNear(many, eye, none, 99).length, NEAR_HARD_CAP);
  assert.deepEqual(selectNear([at(7, 4), at(2, 4)], eye, none, 1), [2]);
  assert.deepEqual(selectNear([at(1, 3)], null, none, 4), [], 'no camera yet');
});

test('hysteresis in motion: a walker crossing the edge back and forth near it does not flicker', () => {
  let kept = new Set<number>(), changes = 0;
  for (let k = 0; k < 200; k++) {
    const x = 15.5 + Math.sin(k / 3) * 1.6; // wanders between 13.9 and 17.1
    const next = new Set(selectNear([{ id: 1, x, z: 0, fade: 1 }], { x: 0, z: 0 }, kept, 4));
    if (next.has(1) !== kept.has(1)) changes += 1;
    kept = next;
  }
  assert.ok(changes <= 1, `${changes} changes`);
});

test('nearDress: a look in the avatar\'s own terms, taken from the cut-out, varied, deterministic, and as tall as the cut-out', () => {
  const people = planPeople('lagos|street', { lanes: street }, 200);
  const dresses = people.map((person, i) => nearDress(person, i, 'lagos|street'));
  assert.deepEqual(nearDress(people[3]!, 3, 'lagos|street'), dresses[3], 'the same person, the same dress');
  const hairs = new Set<string>(), outfits = new Set<string>(), bodies = new Set<string>(), props = new Set<string | null>(), ages = new Set<string>();
  for (const [i, dress] of dresses.entries()) {
    const person = people[i]!, look = dress.look, read = normalizeLook(look, dress.seed);
    // normalizeLook keeps every choice: the near look is a valid look, not a fallback.
    assert.equal(read.body, look.body); assert.equal(read.hair, look.hair); assert.equal(read.outfit, look.outfit);
    assert.equal(read.skin, person.skin, 'the cut-out\'s skin');
    assert.equal(read.bottomsColor, person.legs, 'the cut-out\'s trousers or skirt');
    assert.equal(read.outfitColor, person.jacket ?? person.shirt);
    assert.ok((LOOK_OPTIONS.hair[look.body] as readonly string[]).includes(look.hair));
    assert.ok((LOOK_OPTIONS.outfit[look.body] as readonly string[]).includes(look.outfit));
    assert.deepEqual(normalizeAvatarWearables(look.wearables ?? []), look.wearables ?? [], 'only real catalogue wearables');
    if (person.skirt && !person.child) assert.equal(look.body, 'woman');
    if (person.bag === 2) assert.ok(look.accessories.includes('backpack'));
    if (person.phone && !person.child) assert.equal(dress.prop, 'phone');
    // The body's own height factor is taken out: it stands as tall as the cut-out it replaces.
    assert.ok(Math.abs(AVATAR_UNITS * dress.scale * avatarProportions(look.appearance).height - person.height) < 1e-9);
    hairs.add(look.hair); outfits.add(look.outfit); bodies.add(look.body); props.add(dress.prop); ages.add(look.appearance.ageAppearance);
  }
  assert.ok(hairs.has('braids') && hairs.has('afro') && hairs.size >= 10, [...hairs].join());
  assert.ok(outfits.size >= 6, [...outfits].join());
  assert.deepEqual([...bodies].sort(), ['man', 'woman']);
  assert.ok(props.has('cup') && props.has('phone') && props.has(null));
  assert.ok(ages.has('adult') && ages.has('mature'));
  // Head coverings for the cut-outs drawn with a wrap: a gele, a hijab, a turban or a cap.
  const wrapped = dresses.filter((_, i) => people[i]!.style === 1 && !people[i]!.child);
  assert.ok(wrapped.length > 3 && wrapped.every((d) => d.look.hair === 'gele' || d.look.wearables?.some((id) => /hijab|turban/.test(id)) || d.look.accessories.includes('cap')));
});

test('children: only where asked, beside a parent on the parent\'s schedule, after the parent in the order, small and plainly dressed', () => {
  const plain = planPeople('lagos|park', { lanes: street }, 200);
  assert.ok(plain.every((person) => !person.child), 'none unless the place allows them');
  const people = planPeople('lagos|park', { lanes: street }, 200, { children: true });
  assert.equal(people.length, 200);
  const children = people.filter((person) => person.child);
  assert.equal(children.length, Math.floor(200 * CHILD_SHARE));
  assert.deepEqual(planPeople('lagos|park', { lanes: street }, 200, { children: true }), people, 'deterministic');
  for (const child of children) {
    const at = people.indexOf(child), parent = people[at - 1]!;
    assert.equal(parent.family, child.family, 'the parent comes right before the child');
    assert.ok(!parent.child && parent.habit === 'walk' && !parent.phone);
    assert.equal(child.speed, parent.speed); assert.ok(parent.speed <= FAMILY_PACE);
    assert.equal(child.lane, parent.lane); assert.equal(child.dir, parent.dir);
    assert.deepEqual([child.cycle, child.pause, child.shift], [parent.cycle, parent.pause, parent.shift], 'they stop and go together');
    assert.ok(child.height >= ADULT_HEIGHT * CHILD_HEIGHT[0] - 1e-9 && child.height <= ADULT_HEIGHT * CHILD_HEIGHT[1] + 1e-9);
    assert.ok(child.height < parent.height);
    assert.ok(['casual', 'sport', 'summer'].includes(OUTFITS[child.outfit]!.name) && child.jacket === null && !child.phone && (child.bag === 0 || child.bag === 2));
    assert.ok(Math.abs(Math.abs(child.across - parent.across) - CHILD_SIDE) < 1e-9);
    assert.ok(Math.abs(child.across) <= street[child.lane]!.width / 2 + 0.2, 'on the pavement');
    // Walking together all day: never more than an arm's length or so apart, the same pose (walking or stopped) at the same time.
    for (let t = 0; t < 3_600; t += 37) {
      const a = personAt(parent, { lanes: street }, t), b = personAt(child, { lanes: street }, t);
      if (a.fade < 1) continue;
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 1.0, `apart at ${t}`);
      assert.equal(a.mode === 0, b.mode === 0);
    }
    const dress = nearDress(child, at, 'lagos|park');
    assert.equal(dress.child, true); assert.equal(dress.prop, null);
    assert.equal(dress.look.appearance.build, 'slim'); assert.equal(dress.look.appearance.ageAppearance, 'adult');
    assert.ok(['casual', 'jersey', 'gown', 'hoodie'].includes(dress.look.outfit), dress.look.outfit);
    assert.ok(dress.look.accessories.every((id) => id === 'backpack'));
    assert.ok((dress.look.wearables ?? []).every((id) => id === 'school-uniform'));
  }
  // Any prefix the adaptive caps draw that holds a child holds its parent.
  for (let n = 1; n <= people.length; n += 7) {
    const prefix = people.slice(0, n);
    for (const child of prefix.filter((p) => p.child)) assert.ok(prefix.some((p) => !p.child && p.family === child.family));
  }
});

test('where children may be: an allow-list of family places, never a venue for adults, and only places with a street', () => {
  for (const context of CHILD_CONTEXTS) assert.ok(childrenAllowed(context), context);
  for (const context of ADULT_CONTEXTS) { assert.ok(!CHILD_CONTEXTS.has(context), context); assert.equal(childrenAllowed(context), false, context); }
  for (const context of ['bar', 'club', 'casino', 'lounge', 'statehouse', 'polling', 'shrine', 'buka', 'quad', 'generic', 'room', undefined, null, '']) assert.equal(childrenAllowed(context), false, String(context));
  for (const context of CHILD_CONTEXTS) assert.ok(context === 'street' || STREET_KINDS.has(context), `${context} has a street crowd`);
});

test('nearAction: walking at the player\'s own stride for their height, standing at their own point of the idle, a coffee, a phone', () => {
  const people = planPeople('lagos|market', { lanes }, 120);
  const dresses = people.map((person, i) => nearDress(person, i, 'lagos|market'));
  const walker = people.findIndex((person) => person.habit === 'walk');
  const person = people[walker]!, a = personAt(person, { lanes }, 100), b = personAt(person, { lanes }, 101);
  const first = nearAction(person, a, dresses[walker]!, 100), second = nearAction(person, b, dresses[walker]!, 101);
  if (first.kind === 'walk' && second.kind === 'walk') {
    // One second at their pace is pace / (WALK_CYCLE × height) cycles of the walk.
    assert.ok(Math.abs((second.phase - first.phase) / (2 * Math.PI) - person.speed / (WALK_CYCLE * person.height)) < 1e-6);
  } else assert.fail('a walker walks');
  const stand = { ...a, mode: 1 as const }, phone = { ...a, mode: 2 as const };
  const cupper = dresses.findIndex((dress) => dress.prop === 'cup'), plain = dresses.findIndex((dress) => dress.prop === null && !dress.child);
  assert.equal(nearAction(people[cupper]!, stand, dresses[cupper]!, 5).kind, 'drink');
  assert.deepEqual(nearAction(people[plain]!, stand, dresses[plain]!, 5), { kind: 'stand', seconds: 5 + dresses[plain]!.idle });
  const phoner = dresses.findIndex((dress) => dress.prop === 'phone');
  assert.deepEqual(nearAction(people[phoner]!, phone, dresses[phoner]!, 5), { kind: 'phone', call: dresses[phoner]!.call });
  const phones = dresses.filter((dress) => dress.prop === 'phone');
  assert.ok(phones.some((dress) => dress.call) && phones.some((dress) => !dress.call), 'some on a call, some reading');
  assert.ok(dresses.every((dress) => !dress.call || dress.prop === 'phone'));
  assert.ok(new Set(dresses.map((dress) => dress.idle.toFixed(2))).size > 50, 'nobody sways in step');
});

test('the glance: toward the player when close and in front, at most a natural turn, eased', () => {
  const self = { x: 0, z: 0, ry: 0 }; // looking along +z
  assert.equal(glanceYaw(self, { x: 0, z: 4 }), 0, 'straight ahead: no turn');
  assert.ok(glanceYaw(self, { x: 2, z: 3 }) > 0.5, 'to the +x side');
  assert.ok(glanceYaw(self, { x: -2, z: 3 }) < -0.5);
  assert.equal(glanceYaw(self, { x: 4, z: 0.1 }), GLANCE.max, 'clamped');
  assert.equal(glanceYaw(self, { x: 0, z: -3 }), 0, 'behind: no turn');
  assert.equal(glanceYaw(self, { x: 0, z: GLANCE.radius + 0.5 }), 0, 'too far');
  assert.equal(glanceYaw(self, null), 0);
  assert.equal(easeGlance(0.2, 1, 0), 0.2, 'no time, no change');
  const half = easeGlance(0, 1, 0.1);
  assert.ok(half > 0 && half < 1);
  assert.ok(Math.abs(easeGlance(0, 1, 10) - 1) < 1e-6);
});
