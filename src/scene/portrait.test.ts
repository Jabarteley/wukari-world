import test from 'node:test';
import assert from 'node:assert/strict';
import { portraitKey, portraitOf } from './portrait.ts';

test('a portrait is keyed by the figure it shows: the same look is the same image, another look is another', () => {
  const look = { body: 'woman', hair: 'afro', outfit: 'casual', fabric: 'plain', skin: 'cocoa', outfitColor: 'green' };
  assert.equal(portraitKey(look, { seed: 'a' }), portraitKey({ ...look }, { seed: 'a' }));
  assert.notEqual(portraitKey(look, { seed: 'a' }), portraitKey({ ...look, hair: 'braids' }, { seed: 'a' }));
  assert.notEqual(portraitKey(look, { seed: 'a' }), portraitKey({ ...look, skin: 'honey' }, { seed: 'a' }));
  assert.notEqual(portraitKey(look, { seed: 'a', size: 64 }), portraitKey(look, { seed: 'a', size: 128 }));
});

test('where a portrait cannot be drawn (no page, no WebGL) the answer is null, so the caller keeps its letter', async () => {
  assert.equal(await portraitOf({ body: 'man' }, { seed: 'b' }), null);
});
