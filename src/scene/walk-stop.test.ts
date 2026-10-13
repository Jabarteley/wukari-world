import { loadCityContent as preloadCityContent } from '../game/cities/registry.ts';
await preloadCityContent('lagos');
import test from 'node:test';
import assert from 'node:assert/strict';
import { createKit } from './kit.ts';
import { buildVenueScene } from './venue-scenes.ts';
import { rigOf } from './avatar-rig.ts';
import { buildAvatar, poseAvatar } from './characters.ts';

test('a stopped walk settles: the legs ease to standing and have no phase velocity within 250 ms', () => {
  const kit = createKit();
  const entry = buildVenueScene(kit, { id: 'park', label: 'Park', scene: { kind: 'park' } });
  const built = entry.walk.avatar.children[0]!;
  if (!rigOf(built)) return; // no rig: the two prebuilt figures alternate, there is no stride to settle
  const { legL, legR } = built.userData.parts;
  entry.walk.drive(true);
  entry.walk.gait(true, Math.PI / 2);
  const stride = Math.abs(legL.rotation.x - legR.rotation.x);
  assert.ok(stride > 0.4, 'mid-stride');
  entry.walk.pose('stand');
  const spread: number[] = [];
  for (let ms = 0; ms <= 250; ms += 16) { entry.stepAmbient!(0.016); spread.push(Math.abs(legL.rotation.x - legR.rotation.x)); }
  assert.ok(spread[6]! < stride * 0.25, `feet are nearly together by 100 ms (${spread[6]} of ${stride})`);
  const last = spread.slice(-3);
  assert.ok(Math.abs(last[2]! - last[1]!) < 1e-6 && Math.abs(last[1]! - last[0]!) < 1e-6, `no leg movement left at 250 ms (${last})`);
  assert.ok(last[2]! < 0.1, 'standing');
});

test('the walk twists the torso against the hips, and a look rides on top of the twist', () => {
  const kit = createKit();
  const figure = buildAvatar(kit, { body: 'man' }, { rig: true, detail: 'medium' });
  poseAvatar(figure, { pose: 'walk', stride: 0.25 });
  assert.ok(Math.abs(figure.userData.parts.torso.rotation.y) > 0.03);
  poseAvatar(figure, { pose: 'stand' });
  assert.equal(figure.userData.parts.torso.rotation.y, 0);
});

test('tap-to-walk: a goTo moves the walker at least a metre-equivalent (1 unit) within one second', async () => {
  const { createWalker, createWalkGrid, WALK_SPEED } = await import('./movement.ts');
  const grid = createWalkGrid({ bounds: [-10, -10, 10, 10], block: [] });
  const walker = createWalker();
  walker.setGrid(grid); walker.place(0, 0, 0);
  assert.ok(walker.goTo(6, 0, {}));
  for (let i = 0; i < 60; i++) walker.step(1 / 60, 0);
  assert.ok(walker.x >= Math.min(1, WALK_SPEED * 0.9), `moved ${walker.x}`);
});
