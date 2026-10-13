import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createSave, readSave, encodeSave, migrateSave, withControl, withClampedControl, expressionChannels,
  readAnchorBindings, CONTROL_GROUPS, CHANNELS, ANCHORS, REQUIRED_ANCHORS, ContractError,
} from './contract.mjs';
import { auditBaseline } from './audit-baseline.mjs';

const fixture = (name) => JSON.parse(readFileSync(new URL(`fixtures/${name}.json`, import.meta.url), 'utf8'));
const reject = (fn, code) => assert.throws(fn, (error) => error instanceof ContractError && (!code || error.code === code));
const clone = (value) => structuredClone(value);

test('actual pinned GLB and source audit is reproducible; no independent facial rig is present', () => {
  const actual = auditBaseline();
  const recorded = JSON.parse(readFileSync(new URL('../../../docs/agent-plans/cloud-lanes/human-design-contract/baseline-audit.json', import.meta.url), 'utf8'));
  assert.deepEqual(actual, recorded);
  for (const asset of actual.assets.slice(0, 2)) {
    assert.equal(asset.skins[0].joints.length, 23);
    assert.equal(asset.primitives[0].morphTargetCount, 0);
    assert.equal(asset.primitives[0].trianglesFromMetadata, 9002);
    assert.ok(!asset.skins[0].joints.some((j) => /jaw|eye|ear|nose/i.test(j.name)));
  }
  assert.equal(actual.assets[2].animationNames.length, 60);
  for (const anchor of Object.values(ANCHORS)) assert.ok(actual.assets[0].skins[0].joints.some((joint) => joint.name === anchor.joint));
});

test('legacy migration preserves exact categories, colours, expression, omissions and wearables', () => {
  const look = fixture('legacy-v0');
  const raw = JSON.stringify(look);
  const result = migrateSave(raw);
  assert.equal(result.fromVersion, 0);
  assert.deepEqual(result.save.legacyLook, look);
  assert.equal(JSON.stringify(look), raw);
  assert.ok(Object.values(result.save.design.morphology).every((group) => Object.values(group).every((value) => value === 0)));
  assert.deepEqual(result.save.design.expression, { preset: 'inherit', intensity: 1 });
  assert.deepEqual(migrateSave('{}').save.legacyLook, {}); // keep the current normalizer's seeded path
  assert.equal(Object.hasOwn(migrateSave('{}').save.legacyLook, 'body'), false);
  const colors = { skin: 4, hairColor: '#abcdef', seed: 'fixture-id', appearance: { height: 'short' } };
  assert.deepEqual(migrateSave(JSON.stringify(colors)).save.legacyLook, colors);
});

test('prototype v1 migrates bilateral ears to independent copies and round trips idempotently', () => {
  const v1 = fixture('prototype-v1');
  const result = migrateSave(JSON.stringify(v1));
  assert.equal(result.fromVersion, 1);
  assert.deepEqual(result.save.design.morphology.earLeft, v1.morphology.ears);
  assert.deepEqual(result.save.design.morphology.earRight, v1.morphology.ears);
  result.save.design.morphology.earLeft.width = 0.75;
  assert.notEqual(result.save.design.morphology.earRight.width, 0.75);
  assert.deepEqual(migrateSave(encodeSave(result.save)).save, result.save);
});

test('future, corrupted and ambiguous versions are refused without producing a replacement save', () => {
  for (const value of [3, -1, '2', null]) reject(() => migrateSave(JSON.stringify({ schemaVersion: value })), 'unsupported_version');
  for (const raw of ['[]', 'null', '42', '{', '"hello"']) reject(() => migrateSave(raw));
  reject(() => migrateSave('{"schemaVersion":1}'), 'required');
  reject(() => migrateSave('{"appearance":{"height":"giant"}}'), 'enum');
  reject(() => migrateSave('{"accountEmail":"private@example.invalid"}'), 'unknown_field');
});

test('all 38 scalar controls support both endpoints independently; no preset/gender/skin coupling', () => {
  const original = fixture('fictional-05');
  let count = 0;
  for (const [group, keys] of Object.entries(CONTROL_GROUPS)) for (const key of keys) {
    count++;
    for (const value of [-1, 0, 1]) {
      const next = withControl(original, group, key, value);
      assert.equal(next.design.morphology[group][key], value);
      next.design.morphology[group][key] = original.design.morphology[group][key];
      assert.deepEqual(next, original);
    }
  }
  assert.equal(count, 38);
  reject(() => withControl(original, 'nose', 'earSize', 0), 'control');
  reject(() => withControl(original, '__proto__', 'width', 0), 'control');
});

test('UI reports finite-value clamping; persisted writes still reject the same out-of-range value', () => {
  const save = createSave();
  const result = withClampedControl(save, 'earRight', 'width', 1.5);
  assert.equal(result.applied, 1); assert.equal(result.clamped, true);
  assert.equal(save.design.morphology.earRight.width, 0);
  assert.equal(withClampedControl(save, 'earRight', 'width', 0.5).clamped, false);
  reject(() => withControl(save, 'earRight', 'width', 1.5), 'range');
  for (const value of [NaN, Infinity, '1']) reject(() => withClampedControl(save, 'earRight', 'width', value), 'type');
});

test('serialization is stable across key insertion order and hair/clothing swaps preserve design', () => {
  const original = fixture('fictional-02');
  const reordered = Object.fromEntries(Object.entries(original).reverse());
  reordered.legacyLook = Object.fromEntries(Object.entries(original.legacyLook).reverse());
  assert.equal(encodeSave(original), encodeSave(reordered));
  const changed = clone(original);
  Object.assign(changed.legacyLook, { hair: 'afro', outfit: 'office', wearables: ['sneakers'], skin: 'skin-3' });
  assert.deepEqual(readSave(encodeSave(changed)).design, original.design);
});

test('reject invalid numbers, unknown controls, inherited prototype keys and missing groups', () => {
  const original = createSave();
  for (const value of [NaN, Infinity, -Infinity, 1.001, -1.001, '0.5', null, [], {}]) reject(() => withControl(original, 'nose', 'projection', value));
  const unknown = clone(original); unknown.design.morphology.nose.ethnicity = 'x';
  reject(() => readSave(JSON.stringify(unknown)), 'unknown_field');
  const missing = clone(original); delete missing.design.morphology.earRight;
  reject(() => readSave(JSON.stringify(missing)), 'required');
  reject(() => migrateSave('{"__proto__":{"height":"tall"}}'), 'unknown_field');
  reject(() => migrateSave('{"seed":1e999}'), 'type');
  reject(() => readSave(' '.repeat(16385)), 'size');
  reject(() => migrateSave(JSON.stringify({ skin: 'x'.repeat(129) })), 'string');
  reject(() => createSave(new Date()), 'type');
  reject(() => createSave(Object.create({ hair: 'afro' })), 'type');
  let invoked = false;
  reject(() => createSave({ get hair() { invoked = true; return 'afro'; } }), 'type');
  assert.equal(invoked, false);
});

test('seven inclusive fictional fixtures round trip without imposing demographic relationships', () => {
  const presets = fixture('index').presets.map(({ id }) => fixture(id));
  assert.equal(presets.length, 7);
  assert.equal(new Set(presets.map((p) => p.legacyLook.skin)).size, 7);
  assert.equal(new Set(presets.map((p) => p.legacyLook.appearance.ageAppearance)).size, 3);
  assert.equal(new Set(presets.map((p) => p.legacyLook.appearance.height)).size, 3);
  assert.equal(new Set(presets.map((p) => p.legacyLook.appearance.build)).size, 3);
  for (const saved of presets) {
    assert.deepEqual(readSave(encodeSave(saved)), saved);
    const next = clone(saved); next.legacyLook.skin = 'skin-1'; next.legacyLook.body = 'man';
    assert.deepEqual(readSave(encodeSave(next)).design, saved.design);
  }
});

test('inherit maps the normalized legacy expression, neutral restores every channel exactly', () => {
  assert.equal(expressionChannels({ preset: 'inherit', intensity: 1 }, 'smile').smileLeft, 0.58);
  assert.equal(expressionChannels({ preset: 'inherit', intensity: 1 }, 'grin').smileRight, 1);
  const posed = expressionChannels({ preset: 'grin', intensity: 1 }, 'neutral', { blinkLeft: 1, speechOpen: 0.8 });
  assert.equal(posed.blinkLeft, 1);
  const neutral = expressionChannels({ preset: 'neutral', intensity: 1 });
  assert.equal(Object.keys(neutral).length, CHANNELS.length);
  assert.ok(Object.values(neutral).every((v) => v === 0));
  assert.equal(posed.blinkLeft, 1); // fresh sample, no aliasing
});

test('expression composition bounds channels, preserves unilateral blink, resolves seal and sleep', () => {
  const expression = { preset: 'grin', intensity: 0.8 };
  const channels = expressionChannels(expression, 'smile', { blinkLeft: 1, blinkRight: 0.2, speechOpen: 1, lipSeal: 1 });
  assert.equal(channels.jawOpen, 0);
  assert.equal(channels.blinkRight, 0.2);
  assert.ok(Object.values(channels).every((v) => v >= 0 && v <= 1));
  const asleep = expressionChannels(expression, 'smile', { sleeping: 1, speechOpen: 1 });
  assert.equal(asleep.jawOpen, 0); assert.equal(asleep.smileLeft, 0); assert.equal(asleep.blinkLeft, 1);
  for (const amount of [-0.1, 1.1, NaN]) reject(() => expressionChannels(expression, 'smile', { speechOpen: amount }));
  reject(() => expressionChannels(expression, 'smile', { arbitrary: 0 }));
  reject(() => expressionChannels(expression, 'unknown'));
  const save = createSave(); save.design.expression.blinkLeft = 1;
  reject(() => encodeSave(save), 'unknown_field');
});

test('gaze and basic speech shapes compose without accumulating and leave identity intact', () => {
  const save = fixture('fictional-03'), before = encodeSave(save);
  const channels = expressionChannels(save.design.expression, 'smile', { gazeYaw: -0.8, gazePitch: 0.3, lipPucker: 1, lipWide: 1, speechOpen: 0.4 });
  assert.equal(channels.gazeYaw, -0.8); assert.equal(channels.gazePitch, 0.3);
  assert.equal(channels.lipPucker + channels.lipWide, 1);
  assert.equal(encodeSave(save), before);
  const asleep = expressionChannels(save.design.expression, 'smile', { gazeYaw: 1, lipPucker: 1, lipSeal: 1, sleeping: 1 });
  for (const [key, value] of Object.entries(asleep)) assert.equal(value, key.startsWith('blink') ? 1 : 0);
  assert.equal(expressionChannels(save.design.expression).gazeYaw, 0);
  reject(() => expressionChannels(save.design.expression, 'smile', { gazePitch: -1.01 }));
});

test('schema covers all current wardrobe slots with explicit surface anchors', () => {
  assert.deepEqual(Object.keys(REQUIRED_ANCHORS).sort(), ['head', 'hair', 'neck', 'ears', 'wrist', 'face', 'top', 'bottom', 'full', 'shoes', 'carry'].sort());
  const hair = fixture('synthetic-hair-bindings');
  for (const [slot, ids] of Object.entries(REQUIRED_ANCHORS)) {
    const packet = { ...hair, slot, bindings: ids.map((anchorId) => ({ anchorId, joint: ANCHORS[anchorId].joint, triangle: 0, barycentric: [1, 0, 0], normalOffsetMetres: 0 })) };
    assert.deepEqual(readAnchorBindings(JSON.stringify(packet), hair.target), packet);
  }
});

test('bindings reject stale mesh/rig/topology/anchor revisions, missing sides and bad frames', () => {
  const original = fixture('synthetic-hair-bindings');
  assert.deepEqual(readAnchorBindings(JSON.stringify(original), original.target), original);
  for (const [key, value] of [['bodySha256', 'c'.repeat(64)], ['topologySha256', 'd'.repeat(64)], ['topologyId', 'changed@1'], ['anchorRevision', 2], ['triangleCount', 5]]) {
    const packet = clone(original); packet.target[key] = value;
    reject(() => readAnchorBindings(JSON.stringify(packet), original.target), 'target_mismatch');
  }
  const badRig = clone(original); badRig.target.skeletonId = 'other-rig@1';
  reject(() => readAnchorBindings(JSON.stringify(badRig), original.target));
  const missing = clone(original); missing.bindings.pop();
  reject(() => readAnchorBindings(JSON.stringify(missing), original.target), 'anchor_missing');
  const badFrame = clone(original); badFrame.frame = 'world';
  reject(() => readAnchorBindings(JSON.stringify(badFrame), original.target));
});

test('bindings reject invalid triangle, barycentric sum, offset, joint, slot and duplicate anchors', () => {
  const original = fixture('synthetic-hair-bindings');
  for (const mutate of [
    (p) => { p.bindings[0].triangle = 4; }, (p) => { p.bindings[0].triangle = -1; },
    (p) => { p.bindings[0].barycentric = [0.4, 0.4, 0.4]; },
    (p) => { p.bindings[0].barycentric = [-0.1, 0.5, 0.6]; },
    (p) => { p.bindings[0].normalOffsetMetres = 0.031; },
    (p) => { p.bindings[0].joint = 'pelvis'; }, (p) => { p.slot = 'shoes'; },
    (p) => { p.bindings.push(clone(p.bindings[0])); },
  ]) { const packet = clone(original); mutate(packet); reject(() => readAnchorBindings(JSON.stringify(packet), original.target)); }
});
