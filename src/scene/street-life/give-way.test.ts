// Street life on the home street (14 Oct 2026): a believable number of people, in parties with gaps, who give way to the player (and
// the player's walker to them), and traffic that stops short of a player standing on the road.
import test from 'node:test';
import assert from 'node:assert/strict';
import { AVATAR_RADIUS as GRID_AVATAR_RADIUS, createWalkGrid } from '../walk-grid.ts';
import { createWalker } from '../movement.ts';
import { HARD_CAP, STREET_PEOPLE, planCrowd, planTraffic, streetCrowd, walkerAt } from './plan.ts';
import type { Lane } from './plan.ts';
import { personAt, planPeople } from './crowd.ts';
import type { PeopleWorld, Person } from './crowd.ts';
import { AVATAR_RADIUS, BODY_GAP, IGNORE_BEYOND, bodyRadius, clearOf, giveWay, insideFigure, placed, spaceNear } from './spacing.ts';
import type { Figure, Obstacle } from './spacing.ts';
import { FOLLOW_SHORT, STOP_SHORT, createGiveWay, giveWayFrame, planSchedule, roomAhead, twoWayRoads, vehiclePose } from './traffic.ts';
import { VEHICLE_KINDS } from './plan.ts';

// The home street (src/scene/neighbourhood-scene.ts STREET_LANES and STREET_CROSSINGS, street/street-plan.ts Z): 168 units long.
const HALF = 84, Z = { pavement0: -1.45, kerb: 3.0, road0: 3.25, road1: 10.5, farKerb: 10.75, pavement1: 14.2 };
const LANES: Lane[] = [
  { ax: -HALF, az: Z.kerb - 0.7, bx: HALF, bz: Z.kerb - 0.7, width: 0.9 },
  { ax: -HALF, az: Z.farKerb + 1.55, bx: HALF, bz: Z.farKerb + 1.55, width: 1.1 },
  { ax: -HALF, az: Z.pavement1 - 0.55, bx: HALF, bz: Z.pavement1 - 0.55, width: 0.9, browse: 0 },
];
const CROSSINGS: Lane[] = [78, 10].map((x) => ({ ax: x, az: Z.kerb - 0.35, bx: x, bz: Z.farKerb + 0.35, width: 2.4 }));
const ROADS = twoWayRoads({ ax: -HALF, az: (Z.road0 + Z.road1) / 2, bx: HALF, bz: (Z.road0 + Z.road1) / 2 }, 'right', 0.78, 5.5);
/** The street's floor: the pavements and the road, in from the fence and the far frontage. */
const floor = (x: number, z: number): boolean => Math.abs(x) <= HALF && z >= Z.pavement0 + 0.25 && z <= Z.pavement1 - 0.2;
const T0 = Date.UTC(2026, 9, 14, 16, 42) / 1000;
const SEEDS = ['lagos|ikeja|0|3', 'lagos|yaba|2|7', 'kano|0|1', 'accra|5|5', 'x'];

function street(seed: string): { people: Person[]; world: PeopleWorld } {
  const vehicles = planTraffic(seed, ROADS, 8), schedule = planSchedule(vehicles, ROADS, CROSSINGS);
  const world: PeopleWorld = { lanes: LANES, crossings: CROSSINGS, signal: schedule.signal };
  return { people: planPeople(seed, world, streetCrowd({ tier: 'full', crowd: 240 }, 2 * HALF), { children: true }), world };
}

test('the walk grid\'s avatar radius is the one the crowd keeps clear of', () => {
  assert.equal(AVATAR_RADIUS, GRID_AVATAR_RADIUS);
});

test('a street\'s crowd: 10 to 18 for a typical street\'s length, half on a lite device, never more than the choice', () => {
  for (let length = 100; length <= 260; length += 4) {
    const n = streetCrowd({ tier: 'full', crowd: 240 }, length);
    assert.ok(n >= 10 && n <= 18, `${length} units: ${n}`);
    const lite = streetCrowd({ tier: 'lite', crowd: 120 }, length);
    assert.ok(lite >= 5 && lite <= 9 && lite < n, `lite ${length}: ${lite}`);
  }
  assert.equal(streetCrowd({ tier: 'full', crowd: 240 }, 2 * HALF), 15, 'the home street (168 units)');
  assert.equal(streetCrowd({ tier: 'full', crowd: 240 }, 2000), STREET_PEOPLE[1]);
  assert.equal(streetCrowd({ tier: 'full', crowd: 240 }, 20), STREET_PEOPLE[0]);
  assert.equal(streetCrowd({ tier: 'full', crowd: 6 }, 168), 6, 'never past what the choice (and its caps) allow');
  assert.equal(streetCrowd({ tier: 'full', crowd: 240 }, 0), 0);
  assert.equal(streetCrowd({ tier: 'full', crowd: 0 }, 168), 0);
  assert.ok(STREET_PEOPLE[1] <= HARD_CAP.crowd);
});

test('the home street shows 10 to 18 people at a time, in parties with gaps between them, not a file', () => {
  for (const seed of SEEDS) {
    const { people, world } = street(seed);
    assert.ok(people.length >= 10 && people.length <= 18, `${seed}: ${people.length} planned`);
    for (let s = 0; s < 600; s += 37) {
      const seen = people.filter((person) => { const pose = personAt(person, world, T0 + s); return pose.fade > 0 && floor(pose.x, pose.z); }).length;
      assert.ok(seen >= 8 && seen <= 18, `${seed} +${s}s: ${seen} in view`);
    }
  }
  // Parties: some walk together (the same way, at one pace, a step and a bit apart), and the lane has gaps far longer than the mean.
  const walkers = planCrowd('lagos|ikeja|0|3', LANES, 40);
  const together = walkers.filter((w, i) => walkers.some((v, j) => j !== i && v.lane === w.lane && v.dir === w.dir && v.speed === w.speed));
  assert.ok(together.length >= 6, `walking together: ${together.length}`);
  const lane0 = walkers.filter((w) => w.lane === 0).map((w) => walkerAt(w, LANES[0]!, T0).x).sort((a, b) => a - b);
  const gaps = lane0.slice(1).map((x, i) => x - lane0[i]!), mean = (2 * HALF) / lane0.length;
  assert.ok(Math.max(...gaps) > 2 * mean && Math.min(...gaps) < 0.5 * mean, `clusters and gaps: ${gaps.map((g) => g.toFixed(1)).join(' ')}`);
});

test('giving way: a walker bends round the player and slows; a stander steps aside; nobody inside the clearance; far ones ignored', () => {
  const player: Obstacle = { x: 0, z: 0 };
  // Head on, slightly to one side: bends further that way, and falls behind schedule while passing.
  const body = { x: -1, z: 0.1, ry: Math.PI / 2, radius: 0.29, moving: true };
  const spot = giveWay(body, [player]);
  assert.ok(spot.z > body.z && Math.hypot(spot.x, spot.z) >= clearOf(0.29, player) - 1e-9, 'round the player, on their own side');
  assert.ok(spot.x < body.x, 'behind schedule (slowing)');
  // Exactly in line: still clear (to their right), and off the floor to one side they take the other.
  const inline = giveWay({ ...body, z: 0 }, [player]);
  assert.ok(Math.hypot(inline.x, inline.z) >= clearOf(0.29, player) - 1e-9);
  const narrow = giveWay({ ...body, z: 0 }, [player], (_x, z) => z >= -0.05);
  assert.ok(narrow.z >= -0.05 && Math.hypot(narrow.x, narrow.z) >= clearOf(0.29, player) - 1e-9, 'the side with floor');
  const stander = giveWay({ x: 0.3, z: 0, ry: 0, radius: 0.29, moving: false }, [player]);
  assert.ok(Math.abs(Math.hypot(stander.x, stander.z) - clearOf(0.29, player)) < 1e-5 && stander.x > 0, 'straight out');
  const far = { x: IGNORE_BEYOND + 1, z: 0, ry: 0, radius: 0.29, moving: true };
  assert.deepEqual(giveWay(far, [player]), { x: far.x, z: far.z });
  assert.deepEqual(giveWay(body, []), { x: body.x, z: body.z });
  assert.deepEqual(giveWay(body, [null, { x: NaN, z: 0 }]), { x: body.x, z: body.z });
  // The pace while passing stays between 0.75 and 1.25 of their own: never a stop dead, never walking backwards.
  let last = giveWay({ ...body, x: -4, z: 0.5 }, [player]);
  for (let x = -3.99; x <= 4; x += 0.01) {
    const now = giveWay({ ...body, x, z: 0.5 }, [player]), step = now.x - last.x;
    assert.ok(step > 0.01 * 0.7 && step < 0.01 * 1.3, `pace at ${x.toFixed(2)}: ${(step / 0.01).toFixed(3)}`);
    last = now;
  }
});

test('the player can be walked round, never through: figures block from outside only', () => {
  const figures: Figure[] = [{ x: 2, z: 0, r: 0.63 }];
  assert.equal(insideFigure(2.2, 0, { x: 0, z: 0 }, figures), true);
  assert.equal(insideFigure(1, 0, { x: 0, z: 0 }, figures), false);
  assert.equal(insideFigure(2.2, 0, { x: 2.1, z: 0 }, figures), false, 'already overlapping: never trapped');
  assert.equal(insideFigure(2.2, 0, null, figures), false);
});

/** One frame of the home street with a player at `player`: everyone's place after giving way, and the near ones spaced as bodies. */
function frame(people: readonly Person[], world: PeopleWorld, seconds: number, player: Obstacle) {
  const out = people.map((person, i) => {
    const pose = personAt(person, world, seconds), radius = bodyRadius(person.height, person.width);
    const spot = giveWay({ x: pose.x, z: pose.z, ry: pose.ry, radius, moving: pose.mode === 0 }, [player], floor);
    return { i, radius, pose: { ...pose, x: spot.x, z: spot.z } };
  });
  const near = out.filter(({ pose }) => pose.fade >= 1 && floor(pose.x, pose.z) && Math.hypot(pose.x - player.x, pose.z - player.z) < 14);
  const spaced = spaceNear(near.map(({ i, pose }) => placed(i, people[i]!, pose)), floor, [player]);
  return { out, near: near.map(({ i, radius }, k) => ({ i, radius, ...spaced[k]! })) };
}

test('600 s of a player walking the home street (several seeds): nobody, cut-out or body, comes inside the avatar\'s clearance', () => {
  for (const seed of SEEDS) {
    const { people, world } = street(seed);
    // Up the near pavement's walking line and back, with a stand by the gate and a stroll on the far pavement.
    const route = (s: number): Obstacle => {
      const u = s % 300;
      if (u < 90) return { x: -80 + 1.82 * u, z: 2.3 };
      if (u < 120) return { x: -80 + 1.82 * 90, z: 2.3 };
      if (u < 210) return { x: -80 + 1.82 * (210 - u), z: 2.3 + 0.2 * Math.sin(u) };
      return { x: -80 + 1.7 * (u - 210), z: 12.3 };
    };
    let worst = Infinity, bodies = 0;
    for (let s = 0; s < 600; s += 0.1) {
      const player = route(s), { out, near } = frame(people, world, T0 + s, player);
      for (const { radius, pose } of out) {
        if (!(pose.fade > 0)) continue;
        const d = Math.hypot(pose.x - player.x, pose.z - player.z);
        worst = Math.min(worst, d - radius - AVATAR_RADIUS);
        assert.ok(d >= clearOf(radius, player) - 1e-6, `${seed} +${s.toFixed(1)}s: a cut-out ${d.toFixed(3)} from the player`);
      }
      for (const body of near) {
        bodies += 1;
        const d = Math.hypot(body.x - player.x, body.z - player.z);
        assert.ok(d >= body.radius + AVATAR_RADIUS + BODY_GAP - 1e-4, `${seed} +${s.toFixed(1)}s: a body ${d.toFixed(3)} from the player`);
      }
    }
    assert.ok(bodies > 1000 && worst >= BODY_GAP - 1e-6, `${seed}: ${bodies} body-frames, closest edge ${worst.toFixed(3)}`);
  }
});

test('no deadlock: the player\'s walker always gets down the busy pavement, the people giving way and the figures never trapping it', () => {
  for (const seed of SEEDS) {
    const { people, world } = street(seed);
    const base = createWalkGrid({ bounds: [-HALF, -1.45, HALF, 14.2], cell: 0.3, radius: 0.32 });
    let figures: Figure[] = [];
    const walker = createWalker();
    walker.setGrid({ ...base, free: (x: number, z: number) => base.free(x, z) && !insideFigure(x, z, walker, figures) });
    walker.place(-78, 2.3, Math.PI / 2);
    walker.reach = 0.66;
    let s = 0, touched = 0;
    for (; s < 120 && walker.x < 78; s += 1 / 30) {
      walker.input(0, 1);
      // The camera behind the player, looking along +x: forward is +x.
      walker.step(1 / 30, -Math.PI / 2);
      const player = { x: walker.x, z: walker.z }, { out } = frame(people, world, T0 + s, player);
      figures = out.filter(({ pose }) => pose.fade > 0 && Math.hypot(pose.x - player.x, pose.z - player.z) < 6).map(({ radius, pose }) => ({ x: pose.x, z: pose.z, r: radius + AVATAR_RADIUS }));
      walker.others = figures;
      if (out.some(({ radius, pose }) => pose.fade > 0 && Math.hypot(pose.x - player.x, pose.z - player.z) < radius + AVATAR_RADIUS)) touched += 1;
    }
    assert.ok(walker.x >= 78, `${seed}: got to ${walker.x.toFixed(1)} in ${s.toFixed(1)} s`);
    assert.ok(s < (156 / 1.82) * 1.2, `${seed}: ${s.toFixed(1)} s (no hold-ups worth the name)`);
    assert.equal(touched, 0, `${seed}: never touching anyone`);
  }
});

test('traffic stops short of a player standing on the road, and catches up once they leave', () => {
  for (const seed of SEEDS) {
    const vehicles = planTraffic(seed, ROADS, 8), schedule = planSchedule(vehicles, ROADS, CROSSINGS);
    const yielding = createGiveWay(vehicles.length);
    const half = (i: number) => 0.9 * (VEHICLE_KINDS[vehicles[i]!.kind].wide ?? 1) * 0.8;
    // Where the player stands: in road 0's lane, then road 1's, then on the centre line by a crossing (both lanes), 150 s each, stepping
    // out only when nothing is within 6 units of the spot; then off the road.
    const SPOTS: Obstacle[] = [{ x: -20, z: ROADS[0]!.az }, { x: 30, z: ROADS[1]!.az }, { x: 10, z: 6.9 }];
    const footprint = (i: number, pose: { x: number; z: number; ry: number }, p: Obstacle): number => {
      // The distance from the player's centre to the vehicle's rectangle.
      const ux = Math.sin(pose.ry), uz = Math.cos(pose.ry), dx = p.x - pose.x, dz = p.z - pose.z;
      const a = Math.max(0, Math.abs(dx * ux + dz * uz) - vehicles[i]!.length / 2), b = Math.max(0, Math.abs(dx * uz - dz * ux) - half(i));
      return Math.hypot(a, b);
    };
    const lostOf = (i: number) => yielding.lost[i] ?? 0;
    const clearAt = (time: number, p: Obstacle) => vehicles.every((_, i) => footprint(i, vehiclePose(schedule, vehicles, ROADS, i, time, lostOf(i)), p) > 6);
    let phase = 0, since = -1, last = 0, held = 0;
    for (let s = 0; s < 900; s += 1 / 30) {
      if (phase < SPOTS.length && since < 0 && clearAt(T0 + s, SPOTS[phase]!)) since = s;
      if (since >= 0 && s - since >= 150) { phase += 1; since = -1; }
      const p = phase < SPOTS.length && since >= 0 ? SPOTS[phase]! : null, obstacles = p ? [p] : [];
      if (s > last) yielding.advance(giveWayFrame(schedule, vehicles, ROADS, T0 + last, T0 + s, vehicles.length, half, obstacles));
      last = s;
      if (!p) continue;
      const poses = vehicles.map((_, i) => vehiclePose(schedule, vehicles, ROADS, i, T0 + s, lostOf(i)));
      vehicles.forEach((v, i) => {
        const pose = poses[i]!;
        // No two vehicles of a road ever overlap.
        vehicles.forEach((w, k) => {
          if (k === i || w.road !== v.road) return;
          const gap = Math.abs(poses[k]!.x - pose.x) - (v.length + w.length) / 2;
          assert.ok(gap >= Math.min(FOLLOW_SHORT, 1.1) - 1e-6 || Math.abs(poses[k]!.x - pose.x) > 150, `${seed} +${s.toFixed(2)}s: vehicles ${i} and ${k} ${gap.toFixed(2)} apart`);
        });
        assert.ok(footprint(i, pose, p) >= AVATAR_RADIUS, `${seed} +${s.toFixed(2)}s: vehicle ${i} at ${footprint(i, pose, p).toFixed(3)} from the player`);
        const room = roomAhead(pose, v.length, half(i), [p]);
        assert.ok(room >= STOP_SHORT - 1e-6, `${seed} +${s.toFixed(2)}s: vehicle ${i} only ${room.toFixed(2)} short`);
      });
      if (yielding.lost.some((value) => value > 0)) held += 1;
    }
    assert.equal(phase, SPOTS.length, `${seed}: stood on all three spots`);
    assert.ok(held > 0, `${seed}: the traffic was held up`);
    assert.ok(yielding.lost.every((value) => value === 0), `${seed}: caught up again (${yielding.lost.map((v) => v.toFixed(2)).join(', ')})`);
  }
});
