// Regression (14 Oct 2026, the Square showed lines of people outside its trees): a venue's street-life crowd stands only on that venue's
// own walkable floor. Built on the real venue scenes (the Square is the Lagos park), across seeds and a day of wall-clock times.
import { loadCityContent as preloadCityContent } from '../../game/cities/registry.ts';
await preloadCityContent('lagos');
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createKit } from '../kit.ts';
import { buildVenueScene } from '../venue-scenes.ts';
import { loadAllCityScenes } from '../city-scenes.ts';
import { createStreetLife } from './draw.ts';
import { STREET_KINDS, VENUE_MARGIN, insideFloor, streetLifeFor, venueCrowd, venueLanes, walkableFloor } from './plan.ts';
import type { Bounds } from './plan.ts';
import { personAt, planPeople } from './crowd.ts';
await loadAllCityScenes();

const TEN = Date.UTC(2026, 9, 14, 9, 0);
const SEEDS = ['lagos|park', 'world|square', 'lagos|market', 'abuja|hub', 'x|1', 'x|2', 'x|3'];
const choice = streetLifeFor({ ambientTier: 'full', kind: 'park', webgl: true, forced: 'on' })!;
const room = { triangles: 9_000, meshes: 40 };

function floorOf(kind: string) {
  const kit = createKit();
  const entry = buildVenueScene(kit, { id: kind, label: kind, scene: { kind } } as never);
  const grid = entry.walk.grid!;
  const bounds = grid.bounds as unknown as Bounds, free = (x: number, z: number) => grid.free(x, z);
  return { kit, entry, bounds, free };
}

test('on every open venue kind, the crowd stands on the venue\'s own floor: inside its bounds, on free floor, across seeds and a day', () => {
  let crowded = 0;
  for (const kind of [...STREET_KINDS].sort()) {
    const { kit, entry, bounds, free } = floorOf(kind);
    try {
      const lanes = venueLanes(bounds, true, free), walkable = walkableFloor(bounds, free)!;
      assert.ok(walkable, `${kind}: has a floor`);
      for (const lane of lanes) for (let t = 0; t <= 1; t += 0.02) {
        const x = lane.ax + (lane.bx - lane.ax) * t, z = lane.az + (lane.bz - lane.az) * t;
        assert.ok(walkable(x, z), `${kind}: lane ${JSON.stringify(lane)} at ${t.toFixed(2)} is on the floor`);
      }
      const crowd = venueCrowd(choice, room, lanes);
      assert.ok(crowd <= 32, `${kind}: a light crowd (${crowd})`);
      if (crowd) crowded += 1;
      for (const seed of SEEDS) {
        const world = { lanes, crossings: [], signal: null };
        const people = planPeople(seed, world, crowd);
        for (let hour = 0; hour < 24; hour += 1.7) {
          const seconds = (TEN + hour * 3_600_000) / 1000;
          for (const person of people) {
            const pose = personAt(person, world, seconds);
            // A walker on a lane is on the floor; anyone else (a group a little off the line) must be, or the draw guard hides them (below).
            if (person.habit === 'walk' || person.habit === 'browse') assert.ok(walkable(pose.x, pose.z), `${kind} ${seed}: a walker at ${pose.x.toFixed(2)},${pose.z.toFixed(2)} is on the floor`);
          }
        }
      }
    } finally { entry.dispose(); kit.dispose(); }
  }
  assert.ok(crowded >= 3, `some open venues have floor to spare for a crowd (${crowded}); the rest get none`);
});

test('the draw guard: no person or vehicle is ever drawn off the floor (scaled to nothing), even when the lanes ask for it', () => {
  const { kit, entry, bounds, free } = floorOf('quad');
  try {
    const walkable = walkableFloor(bounds, free)!;
    const [x0, z0, x1] = bounds;
    // The old (pre-fix) lanes: pavements beyond the back edge and down the left side, and a road behind the place.
    const outside = [{ ax: x0 - 16, az: z0 - 2, bx: x1 + 16, bz: z0 - 2, width: 1.6 }, { ax: x0 - 2.4, az: 0, bx: x0 - 2.4, bz: z0 - 9, width: 1.6 }];
    const lanes = [...venueLanes(bounds, true, free), ...outside];
    const road = { ax: x0 - 20, az: z0 - 6, bx: x1 + 20, bz: z0 - 6, speed: 5 };
    const life = createStreetLife(kit, { parent: new THREE.Group(), seed: 'world|square', lanes, roads: [road], crowd: 120, vehicles: 4, walkable, at: TEN });
    const [crowd, cars] = life.group.children as THREE.InstancedMesh[];
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    let shown = 0, hidden = 0;
    for (let k = 0; k < 40; k++) {
      life.step(TEN + k * 7_919, { x: 0, z: 0 });
      for (const mesh of [crowd!, cars!]) for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, m); m.decompose(p, q, s);
        if (s.y === 0) { hidden += 1; continue; }
        shown += 1;
        assert.ok(insideFloor(bounds, p.x, p.z, VENUE_MARGIN) && free(p.x, p.z), `drawn at ${p.x.toFixed(2)},${p.z.toFixed(2)}: on the floor`);
      }
    }
    assert.ok(shown > 0 && hidden > 0, `some drawn (${shown}), the ones off the floor hidden (${hidden})`);
    life.dispose();
  } finally { entry.dispose(); kit.dispose(); }
});

test('no walk grid or no floor: no crowd at all (the hard fallback)', () => {
  assert.equal(walkableFloor([-10, -8, 10, 8], null), null);
  assert.equal(venueCrowd(choice, room, venueLanes([-10, -8, 10, 8], true, null)), 0);
  assert.equal(venueCrowd(choice, room, venueLanes([-10, -8, 10, 8], true, () => false)), 0);
  for (const kind of ['club', 'office', 'rooftop', 'beach', 'hilltop', 'salon']) assert.equal(streetLifeFor({ ambientTier: 'full', kind, webgl: true, forced: 'on' }), null, `${kind}: rooms, rooftops, beaches and hills get none`);
});
