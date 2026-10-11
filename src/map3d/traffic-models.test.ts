// The street traffic drawn with authored vehicle models: only when they arrive, never more than the budget allows, and still parked until the Moving layer is on.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createKit } from '../scene/kit.ts';
import pack from './cities/lagos.ts';
import { buildNetwork } from './roads.ts';
import { TRAFFIC_MODEL_LIMITS, TRAFFIC_PAINTS, buildCity } from './city-build.ts';
import type { TrafficModel, TrafficModels } from './city-build.ts';
import { COMING_SOON } from '../game/content/venues.ts';
import { VENUES } from '../game/cities/lagos/venues.ts';
import { loadCityLinks } from '../game/cities/registry.ts';

await loadCityLinks();
const kit = createKit();
const model = (triangles: number): TrafficModel => ({ geometry: new THREE.SphereGeometry(1, 2 + triangles, 4), material: new THREE.MeshStandardMaterial() });
const models = (): TrafficModels => { const paints = [model(1), model(2), model(3)]; return { danfo: model(5), cars: TRAFFIC_PAINTS.map((_, i) => paints[i % 3]!), scale: 0.5 }; };
const fleet = (city: ReturnType<typeof buildCity>): THREE.InstancedMesh[] => { const found: THREE.InstancedMesh[] = []; city.group.traverse((object) => { if ((object as THREE.InstancedMesh).isInstancedMesh && object.name.startsWith('traffic-') && object.visible) found.push(object as THREE.InstancedMesh); }); return found; };

test('the traffic keeps its few-box stand-ins until models arrive, then draws the models, capped, and not twice', () => {
  const city = buildCity(kit, pack, buildNetwork(pack), { venues: VENUES, soon: COMING_SOON as Record<string, unknown> });
  const before = fleet(city);
  assert.deepEqual(before.map((mesh) => mesh.name), ['traffic-danfo', 'traffic-car']);
  assert.equal(city.setTrafficModels(null), false, 'no models: nothing changes');
  assert.equal(city.setTrafficModels(models()), true);
  assert.equal(city.setTrafficModels(models()), false, 'once');
  const after = fleet(city);
  assert.equal(after[0]!.name, 'traffic-danfo');
  assert.ok(after.slice(1).every((mesh) => mesh.name === 'traffic-car-model'), 'the cars are one instanced mesh per distinct model');
  assert.ok(after.length >= 2 && after.length <= 4, `${after.length} fleets (draw calls)`);
  city.setTraffic(true);
  const shown = (mesh: THREE.InstancedMesh): number => mesh.count;
  assert.ok(shown(after[0]!) <= TRAFFIC_MODEL_LIMITS.danfo && shown(after[0]!) > 0);
  assert.ok(after.slice(1).reduce((sum, mesh) => sum + shown(mesh), 0) <= TRAFFIC_MODEL_LIMITS.cars + after.length, 'about as many cars as the limit');
  // Parked (Moving layer off): half are drawn, none moves.
  city.setTraffic(false);
  assert.ok(shown(after[0]!) <= Math.ceil(TRAFFIC_MODEL_LIMITS.danfo / 2));
  // Every instance is scaled by the model scale and stands on the road.
  const matrix = new THREE.Matrix4(); after[0]!.getMatrixAt(0, matrix);
  assert.ok(Math.abs(new THREE.Vector3().setFromMatrixScale(matrix).x - 0.5 * Math.min(1, Math.max(0.5, (pack.roadScale ?? 1) * 1.3))) < 1e-6);
  city.dispose();
});

test('the models\' triangles stay inside what is left of the city budget', () => {
  // Far models: danfo 855, saloon 1,377 triangles. The limits keep them to about 10,000 of the city\'s 90,000.
  const worst = TRAFFIC_MODEL_LIMITS.danfo * 855 + TRAFFIC_MODEL_LIMITS.cars * 1377;
  assert.ok(worst < 11000, `${worst} triangles`);
});
