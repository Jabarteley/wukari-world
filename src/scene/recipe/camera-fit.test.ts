import assert from 'node:assert/strict';
import test from 'node:test';
import { PerspectiveCamera, Vector3 } from 'three';
import type { SceneCameraFitFrame } from '../types.ts';
import type { Bounds3 } from './contract.ts';
import { fitRecipeBounds } from './camera-fit.ts';

const box = (min: Bounds3['min'], max: Bounds3['max']): Bounds3 => ({ min, max });
const corners = (boxes: readonly Bounds3[]) => boxes.flatMap(b => [b.min[0], b.max[0]].flatMap(x =>
  [b.min[1], b.max[1]].flatMap(y => [b.min[2], b.max[2]].map(z => new Vector3(x, y, z)))));

function frame(width: number, height: number, top: number, bottom: number, preset: number[], entrance: number): SceneCameraFitFrame {
  const portrait = width / height < .85;
  const zoom = portrait ? 1 : Math.max(.74, Math.min(1, Math.max(160, height - top - bottom) / (height * .6)));
  return { width, height, top, bottom, fov: portrait ? 48 : 43, zoom,
    shift: Math.round((bottom - top) / 2 - height * .06 * zoom),
    preset, pivot: [0, .7 + (1.55 - .7) * .35, entrance * .35], player: [0, 0, entrance], scale: 1, solids: [] };
}
function projected(boxes: Bounds3[], f: SceneCameraFitFrame, distance: number) {
  const camera = new PerspectiveCamera(f.fov, f.width / f.height, .1, 1000);
  const direction = new Vector3(f.preset[0], f.preset[1]! - .7, f.preset[2]).normalize();
  const pivot = new Vector3(...f.pivot as [number, number, number]);
  camera.position.copy(pivot).addScaledVector(direction, distance);
  camera.lookAt(pivot); camera.zoom = f.zoom;
  camera.setViewOffset(f.width, f.height, 0, f.shift, f.width, f.height);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  return corners(boxes).map(p => { p.project(camera); return { x: (p.x + 1) * f.width / 2, y: (1 - p.y) * f.height / 2, z: p.z }; });
}

for (const [name, w, d, entrance, preset] of [
  ['Makola', 28, 22, 8.5, [0, 20.9, 20.68]],
  ['Tokyo airport', 31, 23, 9, [-.7, 21.85, 21.62]],
  ['Nairobi garden', 26, 23, 9, [-.7, 21.85, 21.62]],
  ['Paris meal stop', 24, 19, 7, [0, 19, 17.86]],
] as const) {
  test(`${name}: actual projection fits rear height, perimeter props and entrance body at phone sizes`, () => {
    // Source-layout dimensions; no empty foreground floor is included in the fitting envelope.
    const boxes = [box([-w / 2 + .5, 0, -d / 2], [w / 2 - .5, 3.6, -d / 2 + .4]),
      box([-w * .4, 0, -d * .3], [-w * .3, 7.5, d * .2]),
      box([w * .3, 0, -d * .3], [w * .4, 4, d * .2]),
      box([-.65, 0, entrance - .65], [.65, 2.65, entrance + .65])];
    for (const width of [320, 390]) {
      const f = frame(width, 740, 108, 324, [...preset], entrance);
      const distance = fitRecipeBounds(boxes, f); assert.ok(distance !== null);
      const pixels = projected(boxes, f, distance);
      for (const p of pixels) {
        assert.ok(p.x >= 12 - 1e-7 && p.x <= width - 12 + 1e-7, `horizontal ${p.x}`);
        assert.ok(p.y >= 120 - 1e-7 && p.y <= 404 + 1e-7, `vertical ${p.y}`);
        assert.ok(p.z > -1 && p.z < 1);
      }
      const old = projected(boxes, f, Math.hypot(preset[0], preset[1] - .7, preset[2]));
      assert.ok(old.some(p => p.x < 0 || p.x > width || p.y < 108 || p.y > 416), 'fixture must expose the rejected preset');
      const tighter = projected(boxes, f, distance * .99);
      assert.ok(tighter.some(p => p.x < 12 || p.x > width - 12 || p.y < 120 || p.y > 404), 'fit must be tight, not arbitrarily distant');
    }
  });
}

test('fit uses both asymmetric vertical limits, real zoom, raised player and short landscape', () => {
  const boxes = [box([-8, 0, -7], [7, 9, 1]), box([3.35, 4, 7.35], [4.65, 6.65, 8.65])];
  for (const [width, height, top, bottom] of [[740, 320, 48, 100], [1200, 800, 60, 180], [390, 740, 180, 240]]) {
    const f = frame(width!, height!, top!, bottom!, [12, 18, 24], 8);
    f.pivot = [1.4, 2.3975, 2.8]; f.player = [4, 4, 8];
    const distance = fitRecipeBounds(boxes, f); assert.ok(distance !== null);
    for (const p of projected(boxes, f, distance)) {
      assert.ok(p.x >= 12 - 1e-7 && p.x <= width! - 12 + 1e-7);
      assert.ok(p.y >= top! + 12 - 1e-7 && p.y <= height! - bottom! - 12 + 1e-7);
    }
  }
});

test('unusable viewport or invalid numeric bounds explicitly decline fitting', () => {
  const boxes = [box([-1, 0, -1], [1, 2, 1])], f = frame(390, 740, 108, 324, [0, 20, 20], 8);
  for (const invalid of [{ width: 0 }, { fov: NaN }, { zoom: 0 }, { pivot: [Infinity, 0, 0] }, { top: 700 }, { bottom: 700 }]) {
    assert.equal(fitRecipeBounds(boxes, { ...f, ...invalid }), null);
  }
  assert.equal(fitRecipeBounds([box([2, 0, 0], [1, 1, 1])], f), null);
});
