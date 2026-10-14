// Personal space for the near crowd (./spacing.ts): no two skinned bodies closer than their radii plus a margin, over many seeds and 600
// seconds at 10 Hz of the real far crowd; opposite walkers pass with a body-width between; families keep their small gap and never
// touch anyone; the floor is kept; it depends on where people stand, not on the order given.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BODY_GAP, FAMILY_GAP, METRE, bodyRadius, minGap, placed, separate, spaceNear } from './spacing.ts';
import type { Placed } from './spacing.ts';
import { personAt, planPeople, signalFor } from './crowd.ts';
import type { Person } from './crowd.ts';
import { selectNear, nearCandidates } from './near.ts';
import { FADE_UNITS } from './plan.ts';
import type { Lane, Road } from './plan.ts';

const lanes: Lane[] = [
  { ax: -84, az: 2.3, bx: 84, bz: 2.3, width: 0.9 },
  { ax: -84, az: 12.3, bx: 84, bz: 12.3, width: 1.1 },
  { ax: -84, az: 13.65, bx: 84, bz: 13.65, width: 0.9, browse: 0 },
];
const road: Road = { ax: -84, az: 6.875, bx: 84, bz: 6.875, speed: 5.5 };
const crossings: Lane[] = [{ ax: 10, az: 2.65, bx: 10, bz: 11.1, width: 2.4 }, { ax: 78, az: 2.65, bx: 78, bz: 11.1, width: 2.4 }];
const world = { lanes, crossings, signal: signalFor(road)! };
/** The home street's pavements and the road between them (a floor wide enough to step aside on). */
const floor = (x: number, z: number): boolean => z > -1.6 && z < 16.5 && Math.abs(x) < 90;

const person = (over: Partial<Placed> = {}): Placed => ({ id: 0, x: 0, z: 0, ry: 0, radius: 0.3, moving: true, ...over });
const gap = (a: { x: number; z: number }, b: { x: number; z: number }): number => Math.hypot(a.x - b.x, a.z - b.z);

test('the numbers: 25 cm between strangers, 5 cm in a family, an adult about 0.3 units across', () => {
  assert.ok(Math.abs(BODY_GAP - 0.25 * METRE) < 1e-12 && FAMILY_GAP < BODY_GAP);
  assert.ok(bodyRadius(2.6, 1) > 0.25 && bodyRadius(2.6, 1) < 0.33);
  assert.ok(bodyRadius(1.8, 0.9) < bodyRadius(2.8, 1.2));
  assert.equal(minGap(person({ family: 1 }), person({ family: 1 })), 0.6 + FAMILY_GAP);
  assert.equal(minGap(person({ family: 1 }), person({ family: 2 })), 0.6 + BODY_GAP);
});

test('two walkers heading the same way, level: one sidesteps each way; apart already: untouched', () => {
  const [a, b] = separate([person({ id: 1, x: 0, z: 0 }), person({ id: 2, x: 0.1, z: 0 })]);
  assert.ok(gap(a!, b!) >= minGap(person(), person()) - 1e-6);
  const far = separate([person({ id: 1, x: 0, z: 0 }), person({ id: 2, x: 5, z: 0 })]);
  assert.deepEqual(far, [{ x: 0, z: 0 }, { x: 5, z: 0 }]);
});

test('head-on: they bend round each other sideways, never shoved back along the lane', () => {
  const need = minGap(person(), person());
  for (const side of [0, 0.05, -0.2, 0.3]) {
    let last: { x: number; z: number } | null = null;
    for (let along = -2 * need; along <= 2 * need; along += 0.05) {
      // a walks +z (ry 0) and b walks -z (ry π); b is `side` to the lane's across axis.
      const [a, b] = separate([person({ id: 1, x: 0, z: -along / 2 }), person({ id: 2, x: side, z: along / 2, ry: Math.PI })]);
      assert.ok(gap(a!, b!) >= need - 1e-6, `along ${along.toFixed(2)} side ${side}`);
      assert.ok(Math.abs(a!.z - -along / 2) < 1e-6 && Math.abs(b!.z - along / 2) < 1e-6, 'moved only sideways');
      if (last) assert.ok(gap(last, a!) < 0.2, 'a smooth path (no jump)');
      last = a!;
    }
  }
});

test('walkers bend round someone standing still; two standers are pushed apart along the line between them', () => {
  const need = minGap(person(), person());
  const [walker, stander] = separate([person({ id: 1, x: 0, z: -0.3 }), person({ id: 2, x: 0, z: 0, moving: false })]);
  assert.ok(gap(walker!, stander!) >= need - 1e-6);
  assert.ok(Math.abs(walker!.z + 0.3) < 1e-6 && Math.abs(stander!.z) < 1e-6, 'sideways only');
  assert.ok(Math.abs(walker!.x) > Math.abs(stander!.x), 'the walker gives most of it');
  const [p, q] = separate([person({ id: 1, x: 0, z: 0, moving: false }), person({ id: 2, x: 0.2, z: 0, moving: false })]);
  assert.ok(gap(p!, q!) >= need - 1e-6 && p!.z === 0 && q!.z === 0);
});

test('a pair crossing at a right angle never touch; a fixed body does not move; the order given makes no difference', () => {
  const need = minGap(person(), person());
  for (let k = -20; k <= 20; k++) {
    const [a, b] = separate([person({ id: 1, x: -k * 0.05, z: 0, ry: Math.PI / 2 }), person({ id: 2, x: 0, z: k * 0.05, ry: 0 })]);
    assert.ok(gap(a!, b!) >= need - 1e-6, `k ${k}`);
  }
  const items = [person({ id: 5, x: 0, z: 0 }), person({ id: 3, x: 0.2, z: 0.1 }), person({ id: 9, x: 0.1, z: -0.3, ry: 2 })];
  const forward = separate(items), backward = separate([...items].reverse()).reverse();
  assert.deepEqual(forward, backward);
  const held = separate([person({ id: 1, x: 0, z: 0 }), person({ id: 2, x: 0.1, z: 0 })], new Set([1]));
  assert.deepEqual(held[0], { x: 0, z: 0 });
  assert.ok(gap(held[0]!, held[1]!) >= need - 1e-6);
  assert.deepEqual(separate([person({ x: NaN }), person({ id: 1, x: 1 })]).map((s) => s.z), [0, 0], 'not finite: left alone');
});

test('the floor: a body that would be pushed off it stays put and the other gives way', () => {
  const edge = (x: number): boolean => x >= -0.1;
  const items = [person({ id: 1, x: 0, z: 0 }), person({ id: 2, x: 0.05, z: 0.4 })];
  const out = spaceNear(items, edge);
  assert.ok(out.every((s) => edge(s.x)), 'both stay on the floor');
  assert.ok(gap(out[0]!, out[1]!) >= minGap(items[0]!, items[1]!) - 1e-6);
  assert.deepEqual(spaceNear(items, null), separate(items));
});

/** The crowd of a street at `seconds`: who would be bodies for an eye walking along it (the 12 nearest), placed. */
function bodiesAt(people: readonly Person[], seconds: number, eyeX: number, cap = 12): { items: Placed[]; people: Person[] } {
  const poses = people.map((p) => personAt(p, world, seconds));
  const candidates = nearCandidates(people, poses, people.length, () => true);
  const ids = selectNear(candidates, { x: eyeX, z: 7 }, new Set(), cap, { enter: 30, leave: 30 });
  return { items: ids.map((i) => placed(i, people[i]!, poses[i]!)), people: ids.map((i) => people[i]!) };
}

test('600 s at 10 Hz over several streets: no two near bodies closer than their radii plus the margin; families keep theirs', () => {
  let worst = Infinity, pairs = 0, moved = 0, families = 0, touching = 0;
  for (const seed of ['lagos/ikeja/0/3', 'abuja/wuse', 'kano/sabon-gari', 'accra/osu', 'nairobi/cbd', 'ibadan/mokola']) {
    const people = planPeople(seed, world, 180, { children: true });
    for (let step = 0; step <= 6000; step++) {
      const seconds = step / 10, eye = -60 + ((seconds * 0.4) % 120);
      const { items } = bodiesAt(people, seconds, eye);
      const out = separate(items);
      for (let i = 0; i < items.length; i++) {
        if (gap(out[i]!, items[i]!) > 1e-9) moved += 1;
        for (let j = i + 1; j < items.length; j++) {
          const margin = gap(out[i]!, out[j]!) - minGap(items[i]!, items[j]!);
          worst = Math.min(worst, margin); pairs += 1;
          if (gap(items[i]!, items[j]!) < minGap(items[i]!, items[j]!) - 1e-6) touching += 1;
          if (items[i]!.family !== undefined && items[i]!.family === items[j]!.family) families += 1;
          assert.ok(margin >= -1e-6, `${seed} t=${seconds}: ${items[i]!.id} and ${items[j]!.id} closer than ${minGap(items[i]!, items[j]!).toFixed(2)} by ${(-margin).toFixed(3)}`);
        }
      }
    }
  }
  assert.ok(pairs > 100_000 && families > 1000 && moved > 0, `${pairs} pairs, ${families} family pairs, ${moved} moves`);
  assert.ok(worst > -1e-6);
  assert.ok(touching > 50, `the plan alone does put bodies inside each other (${touching} pair-steps), which is what this fixes`);
});

test('the same, with a dense crowd (every near person at once, the hard cap) and a floor to stay on', () => {
  for (const seed of ['dense-a', 'dense-b', 'dense-c']) {
    const people = planPeople(seed, world, 320, { children: true });
    for (let step = 0; step <= 6000; step += 5) {
      const seconds = step / 10, eye = -60 + ((seconds * 0.9) % 120);
      const { items } = bodiesAt(people, seconds, eye, 20);
      const out = spaceNear(items, floor);
      assert.ok(out.every((s) => floor(s.x, s.z)), 'on the floor');
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        assert.ok(gap(out[i]!, out[j]!) >= minGap(items[i]!, items[j]!) - 1e-6, `${seed} t=${seconds}`);
      }
    }
  }
});

test('a parent and child as planned already clear their small gap, and a family is untouched when alone', () => {
  for (const seed of ['a', 'b', 'c', 'd', 'e']) {
    const people = planPeople(seed, world, 320, { children: true }), kids = people.filter((p) => p.child);
    assert.ok(kids.length >= 10);
    for (const child of kids) {
      const parent = people.find((p) => p.family === child.family && !p.child)!;
      for (const seconds of [0, 37.3, 211.7, 419.1]) {
        const a = personAt(parent, world, seconds), b = personAt(child, world, seconds);
        const alone = separate([placed(0, parent, a), placed(1, child, b)]);
        assert.ok(gap(alone[0]!, a) < 1e-9 && gap(alone[1]!, b) < 1e-9, `family ${child.family} untouched`);
      }
    }
  }
  assert.ok(FADE_UNITS > 0);
});
