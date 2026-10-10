import { loadCityContent as preloadCityContent } from '../game/cities/registry.ts';
await preloadCityContent('lagos');
// One figure everywhere: the same look is the same person on every surface (the creator, the player in a scene, other players,
// the regulars, the portraits), the levels are one model at three costs, every pose the game uses has a pose of the figure, the
// HUD moods have faces, the figure is alive between poses, and a portrait is drawn from the same figure and cached.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createKit } from './kit.ts';
import { createBatch } from './build.ts';
import { DETAILS, POSES, buildAvatar, buildCrowdFigures, drawAvatar, moodExpression, normalizeLook, poseAvatar } from './characters.ts';
import type { CrowdPerson, DetailLevel, Pose } from './characters.ts';
import { applyIdle, applyLife, blinking, figurePhase, mouthOpening } from './figure-life.ts';
import { BODY_FOR_FIGURE, FIGURE_FOR_BODY_POSE } from './figure-poses.ts';
import { STILL } from './body/poses.ts';
import { REST_POSE } from './home-scene.ts';
import { PLAYER_DETAIL, playerOptions } from './avatar-rig.ts';
import { moodWordOf } from './figure-mood.ts';
import { clearPortraits, portraitKey, portraitOf, portraitStats } from './portrait.ts';
import type { PortraitRenderer } from './portrait.ts';
import { SKINNED_BODY, bodyAllowed } from './body/gate.ts';
import { AVATAR_LOW_TRIANGLES, AVATAR_MEDIUM_TRIANGLES, AVATAR_MEDIUM_TRIANGLES_MIN } from '../budgets.ts';
import { SCENES } from './venue-scenes.ts';

const WOMAN = { body: 'woman', skin: 'skin-6', hair: 'braids', hairColor: 'black', outfit: 'owambe', fabric: 'ankara', outfitColor: 'orange', bottomsColor: 'violet', accessories: ['earrings'] };
const MAN = { body: 'man', skin: 'skin-1', hair: 'lowcut', outfit: 'casual', fabric: 'plain', outfitColor: 'navy', bottomsColor: 'cream', accessories: ['glasses', 'cap', 'watch'] };

test('the skinned body is off: no device is asked for another body, so no surface swaps figures', () => {
  assert.equal(SKINNED_BODY, false);
  assert.equal(bodyAllowed({ hardwareConcurrency: 8, deviceMemory: 8 }), false);
});

test('the same look is the same figure on every surface and at every level', () => {
  const kit = createKit();
  for (const look of [WOMAN, MAN]) {
    const expected = normalizeLook(look, 'seed');
    for (const detail of DETAILS) for (const rig of [false, true]) {
      const figure = buildAvatar(kit, look, { detail, rig, seed: 'seed' });
      assert.deepEqual(figure.userData.look, expected, `${detail}${rig ? ' rig' : ''}: the same normalised look`);
      const scale = figure.scale;
      const again = buildAvatar(kit, look, { detail, rig, seed: 'seed' });
      assert.deepEqual([again.scale.x, again.scale.y, again.scale.z], [scale.x, scale.y, scale.z], 'the same proportions');
    }
    // another player or a regular: a crowd figure, from the look the server holds (or the id's own)
    const crowd = buildCrowdFigures(kit, [{ id: 'p', name: 'P', kind: 'player', look, seed: 'seed' }]);
    assert.deepEqual(crowd.figures[0]!.userData.look, expected, 'a crowd figure');
    crowd.dispose();
    // a drawn avatar (a merged crowd, the street) and a portrait key agree too
    const batch = createBatch(THREE);
    assert.deepEqual(drawAvatar(batch, look, { seed: 'seed', detail: 'medium' }).look, expected, 'drawAvatar');
    assert.equal(portraitKey(look, { seed: 'seed' }), portraitKey(expected, { seed: 'seed' }), 'the portrait is of the same look');
  }
  // a regular has no stored look: their id makes one, and every surface makes the same one
  const regular = normalizeLook(null, 'npc-ada');
  assert.deepEqual(buildAvatar(kit, null, { detail: 'low', seed: 'npc-ada' }).userData.look, regular);
  assert.deepEqual(buildCrowdFigures(kit, [{ id: 'npc:ada', kind: 'npc', name: 'Ada', seed: 'npc-ada' }]).figures[0]!.userData.look, regular);
  assert.equal(portraitKey(null, { seed: 'npc-ada' }), portraitKey(regular, { seed: 'npc-ada' }));
  kit.dispose();
});

test('level of detail: the player in a scene is medium and rigged, everyone else low; one model, three costs', () => {
  assert.equal(PLAYER_DETAIL, 'medium');
  assert.deepEqual(playerOptions('stand'), { detail: 'medium', rig: true });
  const kit = createKit();
  for (const look of [WOMAN, MAN]) {
    const triangles = Object.fromEntries(DETAILS.map((detail) => [detail, buildAvatar(kit, look, { detail }).userData.triangles])) as Record<DetailLevel, number>;
    assert.ok(triangles.low < triangles.medium && triangles.medium < triangles.high, `${JSON.stringify(triangles)}`);
    assert.ok(triangles.low <= AVATAR_LOW_TRIANGLES.value, 'low: the crowd budget');
    assert.ok(triangles.medium >= AVATAR_MEDIUM_TRIANGLES_MIN.value && triangles.medium <= AVATAR_MEDIUM_TRIANGLES.value, 'medium: the player budget');
  }
  // a rig costs one draw call per part that is shown; a crowd figure, one
  const rig = buildAvatar(kit, WOMAN, { detail: 'medium', rig: true });
  const seen = (child: THREE.Object3D): boolean => child.visible && (!child.parent || seen(child.parent));
  const shown = (object: THREE.Object3D) => { let n = 0; object.traverse((child) => { if ((child as THREE.Mesh).isMesh && seen(child)) n += 1; }); return n; };
  assert.equal(shown(rig), 6, 'six parts at rest (the eyelids and the open mouth are hidden)');
  assert.equal(shown(buildAvatar(kit, WOMAN, { detail: 'low' })), 1);
  kit.dispose();
});

test('every pose the game uses has a pose of the figure, and the figure poses are all distinct', () => {
  for (const pose of Object.keys(STILL) as (keyof typeof STILL)[]) {
    const figure = FIGURE_FOR_BODY_POSE[pose];
    assert.ok((POSES as readonly string[]).includes(figure), `${pose} → ${figure}`);
    assert.equal(BODY_FOR_FIGURE[figure], pose, `${pose} comes back as itself`);
  }
  for (const pose of POSES) assert.ok(BODY_FOR_FIGURE[pose], `${pose} maps to a body pose`);
  // the poses the home picks for its furniture, and the stove, the table, the door
  for (const body of [...Object.values(REST_POSE), 'cook', 'cookLow', 'eat', 'drink', 'bucket', 'homeDoor'] as const) assert.ok(body && FIGURE_FOR_BODY_POSE[body], `${body}`);
  const kit = createKit(), seen = new Set<string>();
  for (const pose of POSES) {
    const figure = buildAvatar(kit, MAN, { detail: 'medium', rig: true });
    poseAvatar(figure, { pose, stride: pose === 'walk' || pose === 'jog' ? 0.25 : undefined });
    const { torso, body } = figure.userData.parts;
    seen.add([armSignature(figure), torso.rotation.x.toFixed(3), body.rotation.x.toFixed(3), body.position.y.toFixed(3)].join('|'));
    figure.userData.dispose();
  }
  assert.equal(seen.size, POSES.length, 'every pose sets the joints differently');
  const lying = buildAvatar(kit, MAN, { detail: 'medium', rig: true });
  poseAvatar(lying, { pose: 'lie' });
  assert.ok(Math.abs(lying.userData.parts.body.rotation.x + Math.PI / 2) < 1e-9, 'lying turns the body onto its back');
  kit.dispose();
});
function armSignature(figure: { userData: { parts: Record<string, THREE.Object3D> } }): string {
  const { armL, armR, legL, legR } = figure.userData.parts;
  return [armL, armR, legL, legR].map((part) => `${part!.rotation.x.toFixed(3)},${part!.rotation.z.toFixed(3)}`).join(';');
}

test('the HUD moods have faces, and a face is drawn differently for each', () => {
  assert.equal(moodExpression('Very Happy', 'neutral'), 'grin');
  assert.equal(moodExpression('Happy', 'neutral'), 'smile');
  assert.equal(moodExpression('Happy', 'grin'), 'grin');
  assert.equal(moodExpression('Okay', 'neutral'), 'neutral', 'a content mood keeps the face that was chosen');
  assert.equal(moodExpression('Fine', 'smile'), 'smile');
  assert.equal(moodExpression('Uneasy', 'smile'), 'worried');
  assert.equal(moodExpression('Miserable', 'grin'), 'sad');
  assert.equal(moodExpression(undefined, 'grin'), 'grin');
  assert.equal(moodExpression('???', 'neutral'), 'neutral');
  const signature = (mood?: string, detail: DetailLevel = 'medium') => { const batch = createBatch(THREE); drawAvatar(batch, WOMAN, { detail, ...(mood ? { mood } : {}) }); const built = batch.build({ solid: null, glow: null, glass: null } as never); const a = built.meshes[0]!.geometry.attributes.position!.array; let sum = 0; for (let i = 0; i < a.length; i++) sum += a[i]! * (i % 7 + 1); return sum.toFixed(4); };
  for (const detail of ['medium', 'low'] as const) {
    const faces = ['Very Happy', 'Uneasy', 'Miserable'].map((mood) => signature(mood, detail));
    assert.equal(new Set([...faces, signature(undefined, detail)]).size, 4, `${detail}: grin, worried, sad and the chosen face differ`);
  }
  assert.equal(moodWordOf(null), '', 'no state, no mood');
});

test('life: blinks come on each figure\'s own period, a beat starts and ends at rest, speech moves the mouth, a group is not in unison', () => {
  const kit = createKit();
  const figure = buildAvatar(kit, WOMAN, { detail: 'medium', rig: true, seed: 'one' });
  const { parts } = figure.userData;
  assert.ok(parts.lids && parts.mouth, 'the eyelids and the mouth are parts of their own');
  assert.equal(parts.lids.visible, false); assert.equal(parts.mouth.visible, false);
  // blinking: a short closed spell in every few seconds
  let closed = 0, openRuns = 0, last = false;
  for (let t = 0; t < 20; t += 0.01) { const now = blinking(t, 0.3); if (now) closed += 1; if (last && !now) openRuns += 1; last = now; }
  assert.ok(closed > 20 && closed < 300, `closed for ${closed * 10} ms of 20 s`);
  assert.ok(openRuns >= 4 && openRuns <= 9, `${openRuns} blinks in 20 s`);
  assert.notEqual(JSON.stringify(Array.from({ length: 300 }, (_, i) => blinking(i * 0.02, 0.1))), JSON.stringify(Array.from({ length: 300 }, (_, i) => blinking(i * 0.02, 0.6))), 'two figures blink at different times');
  // a beat: amount 0 is the rest pose, whatever the time
  poseAvatar(figure, { pose: 'stand' });
  const rest = [parts.torso.scale.y, parts.body.rotation.z, parts.head.rotation.x, parts.armR.rotation.x];
  poseAvatar(figure, { pose: 'stand', time: 1.7, amount: 0, blink: false });
  assert.deepEqual([parts.torso.scale.y, parts.body.rotation.z, parts.head.rotation.x, parts.armR.rotation.x], rest, 'a beat at amount 0 leaves the figure at rest');
  poseAvatar(figure, { pose: 'stand', time: 1.7, amount: 1, blink: true });
  assert.notEqual(parts.torso.scale.y, 1, 'breathing');
  assert.equal(parts.lids.visible, true, 'blink: the lids close');
  poseAvatar(figure, { pose: 'stand', time: 1.7, amount: 1, blink: false });
  assert.equal(parts.lids.visible, false);
  // speaking: the mouth is shown and opens and closes
  const openings = new Set<string>();
  for (let t = 0; t < 1; t += 0.05) { poseAvatar(figure, { pose: 'talk', time: t, speaking: true }); assert.equal(parts.mouth.visible, true); openings.add(parts.mouth.scale.y.toFixed(2)); }
  assert.ok(openings.size > 5, 'the mouth moves');
  assert.ok(mouthOpening(0.4, 0.2) >= 0.12 && mouthOpening(0.4, 0.2) <= 1);
  poseAvatar(figure, { pose: 'talk', time: 3, speaking: false });
  assert.equal(parts.mouth.visible, false);
  // a walking figure keeps its own swing: no sway on top of it
  poseAvatar(figure, { pose: 'walk', stride: 0.25, time: 4 });
  assert.equal(parts.torso.scale.y, 1);
  // a group is not in unison: twelve phases at the same time give twelve different breaths
  const breaths = new Set<string>();
  for (let i = 0; i < 12; i++) { const f = buildAvatar(kit, MAN, { detail: 'low', seed: `person-${i}` }); applyIdle(f, 5, 1); breaths.add(f.scale.y.toFixed(5)); f.userData.dispose(); }
  assert.ok(breaths.size >= 10, `${breaths.size} different breaths among 12 figures`);
  assert.notEqual(figurePhase(12345), figurePhase(54321));
  void applyLife;
  figure.userData.dispose(); kit.dispose();
});

test('every figure in a scene gets life from the scene entry, and a beat ends at rest', () => {
  const kit = createKit();
  const entry = SCENES.park!(kit, { id: 'park', label: 'Park', scene: { kind: 'park' } } as never);
  const people: CrowdPerson[] = [{ id: 'npc:a', name: 'A', kind: 'npc', seed: 'a', x: 2, z: 3 }, { id: 'npc:b', name: 'B', kind: 'npc', seed: 'b', x: -2, z: 3 }];
  entry.setCrowd(people);
  assert.equal(typeof entry.life, 'function');
  assert.equal(entry.life!(1.5, 1), true);
  const mid = JSON.stringify(entry.group.children.map((child) => [child.scale.y.toFixed(5), child.rotation.z.toFixed(5)]));
  entry.life!(1.5, 0);
  const rest = JSON.stringify(entry.group.children.map((child) => [child.scale.y.toFixed(5), child.rotation.z.toFixed(5)]));
  assert.notEqual(mid, rest, 'the beat moves them');
  entry.life!(9.9, 0);
  assert.equal(JSON.stringify(entry.group.children.map((child) => [child.scale.y.toFixed(5), child.rotation.z.toFixed(5)])), rest, 'and at amount 0 they are where they were at rest, whatever the time');
  entry.dispose(); kit.dispose();
});

/** A stand-in renderer: records what a portrait asks of it. */
function stub(): PortraitRenderer & { renders: number; size: number } {
  const renderer = {
    renders: 0, size: 0, outputColorSpace: '', toneMapping: 0, toneMappingExposure: 1,
    domElement: { toDataURL: () => `data:image/png;base64,PORTRAIT${renderer.renders}` },
    setSize(width: number) { renderer.size = width; }, setPixelRatio() {}, setClearColor() {}, dispose() {},
    render() { renderer.renders += 1; },
  };
  return renderer;
}

test('a portrait is drawn from the same figure, cached, and null where nothing can be drawn', async () => {
  clearPortraits();
  const renderer = stub(), drawn = portraitStats.drawn;
  const first = await portraitOf(WOMAN, { seed: 's', size: 96, renderer });
  assert.match(first ?? '', /^data:image\/png/);
  assert.equal(renderer.renders, 1); assert.equal(renderer.size, 96);
  assert.equal(await portraitOf(normalizeLook(WOMAN, 's'), { seed: 's', size: 96, renderer }), first, 'the same figure: the cached picture');
  assert.equal(renderer.renders, 1, 'not drawn twice');
  const mood = await portraitOf(WOMAN, { seed: 's', size: 96, mood: 'Miserable', renderer });
  assert.notEqual(mood, first, 'a mood is its own picture');
  assert.equal(renderer.renders, 2);
  assert.equal(portraitStats.drawn - drawn, 2);
  assert.notEqual(portraitKey(WOMAN, { size: 96 }), portraitKey(MAN, { size: 96 }));
  clearPortraits();
  assert.equal(await portraitOf(MAN, { seed: 'x' }), null, 'no document, no WebGL: the letter stays');
});
