// OWNER: social — the client's memory of how players look (what gives a friend a face in the contacts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { known, rememberLook } from './looks.ts';

test('a look seen in a room is kept by its few face-choosing fields, once, and unusable input is ignored', () => {
  rememberLook('p1', { body: 'woman', character: 'w3', characterOutfit: 2, characterSkin: 4, hair: 'afro', outfit: 'casual', fabric: 'plain', skin: 'skin-3', accessories: ['glasses'], wearables: ['kaftan'], secret: 'x' });
  assert.deepEqual(known.p1, { body: 'woman', character: 'w3', characterOutfit: 2, characterSkin: 4, hair: 'afro', outfit: 'casual', fabric: 'plain', skin: 'skin-3', accessories: ['glasses'] });
  rememberLook('p2', { body: 'man', outfit: 'hoodie' });
  assert.equal(known.p2?.character, undefined, 'an old look is kept as it is; it is read as a character when a face is drawn');
  for (const bad of [null, undefined, 7, 'text', [], {}, { hair: 'x'.repeat(30) }, { characterOutfit: -1 }]) rememberLook('bad', bad);
  assert.equal(known.bad, undefined);
  rememberLook('', { body: 'man' });
  assert.equal(known[''], undefined);
});

test('the memory is capped so it cannot grow without end', () => {
  for (let i = 0; i < 260; i++) rememberLook(`cap-${i}`, { body: 'man', character: 'm1' });
  assert.ok(Object.keys(known).length <= 200);
  assert.ok(known['cap-259'], 'the newest are kept');
  assert.equal(known['cap-0'], undefined, 'the oldest go first');
});
