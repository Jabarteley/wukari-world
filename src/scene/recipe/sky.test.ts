import assert from 'node:assert/strict';
import test from 'node:test';
import { Color } from 'three';
import { recipeSkyTint } from './sky.ts';
import type { RecipeSky } from './contract.ts';

const neutral: RecipeSky = { horizon: [1, 1, 1], zenith: [1, 1, 1] };
const art: RecipeSky = { horizon: [1, 0.98, 0.95], zenith: [0.94, 0.98, 1] };
test('sky grading preserves neutral, black night, incoming weather and caller ownership', () => {
  const identity = recipeSkyTint(neutral), tint = recipeSkyTint(art);
  const day = Object.freeze(['#e6efe6', '#5fa8e4'] as const), night = Object.freeze(['#2c3c6a', '#0c1226'] as const);
  assert.deepEqual(identity(day), day); assert.deepEqual(tint(['#000000', '#000000']), ['#000000', '#000000']);
  const a = tint(day), b = tint(night);
  assert.notDeepEqual(a, b); assert.notDeepEqual(a, day);
  for (const [input, output] of [[day, a], [night, b]] as const) for (let i = 0; i < 2; i++) {
    const original = new Color(input[i]!), changed = new Color(output[i]!);
    assert.ok(changed.r <= original.r && changed.g <= original.g && changed.b <= original.b, 'cannot brighten channels');
  }
  assert.deepEqual(day, ['#e6efe6', '#5fa8e4']);
  a[0] = '#000000'; assert.notEqual(tint(day)[0], '#000000');
});

test('sky owners isolate captured gains and cached output, and reject invalid caller gains', () => {
  const gains: RecipeSky = { horizon: [0.9, 1, 1], zenith: [1, 1, 0.9] };
  const owner = recipeSkyTint(gains), other = recipeSkyTint(neutral), sky = ['#ffffff', '#eeeeee'] as const;
  const before = owner(sky); gains.horizon[0] = 1; gains.zenith[2] = 1;
  assert.deepEqual(owner(sky), before); assert.deepEqual(other(sky), sky);
  assert.throws(() => recipeSkyTint({ horizon: [1.01, 1, 1], zenith: [1, 1, 1] }), /multipliers/);
});
