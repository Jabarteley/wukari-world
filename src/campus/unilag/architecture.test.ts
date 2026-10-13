import test from 'node:test';
import assert from 'node:assert/strict';
import { createKit } from '../../scene/kit.ts';
import { createBatch } from '../../scene/build.ts';
import { CAMPUS_MAP } from './map.generated.ts';
import { LANDMARK_MAPPINGS } from './layout.ts';
import { architectureOf, drawLandmarkCrowns, drawSenateTower, isSenateTower, landmarkHeight, paintBuilding } from './architecture.ts';
import { landmarkBuildingIds, standalones } from './standalone.ts';

test('every landmark building, standalone and the Senate tower paint without throwing', () => {
  const { THREE } = createKit();
  const byId = new Map(CAMPUS_MAP.buildings.map((b) => [b.osm.id, b]));
  const buildings = [...landmarkBuildingIds()].map(([id, osm]) => ({ id, b: byId.get(osm)! })).concat(standalones().map((s) => ({ id: s.id, b: s.building })));
  assert.ok(buildings.length >= 25, `${buildings.length} landmark buildings resolved`);
  for (const { id, b } of buildings) {
    const sized = { ...b, height: landmarkHeight(b) }, info = architectureOf(sized);
    assert.ok(info.id, `${id} resolves to a landmark`);
    const batch = createBatch(THREE);
    assert.doesNotThrow(() => paintBuilding(batch, sized, { left: 20000 }), `${id} (${info.style}) paints`);
    assert.ok(batch.triangles > 0, `${id} draws something`);
  }
  const tower = { ...byId.get(653186158)!, height: 43 };
  assert.ok(isSenateTower(tower));
  for (const rich of [true, false]) { const batch = createBatch(THREE); assert.doesNotThrow(() => drawSenateTower(batch, tower, rich)); assert.ok(batch.triangles > 0); }
  const batch = createBatch(THREE);
  assert.doesNotThrow(() => drawLandmarkCrowns(batch, CAMPUS_MAP.buildings, CAMPUS_MAP.surfaces.filter((s) => s.kind === 'pitch')));
  for (const id of Object.keys(LANDMARK_MAPPINGS)) assert.ok(typeof id === 'string');
});
