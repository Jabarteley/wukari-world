// OWNER: scenes — which roster character an old look is read as, table-driven, and that a regular always looks the same.
import test from 'node:test';
import assert from 'node:assert/strict';
import { TABLE, pickOf, regularPick, regularSex, seededPick, skinStepOf, SKIN_HEX } from './map.ts';
import { ROSTER, rosterEntry, rosterOn } from '../../game/roster.ts';

const base = { fabric: 'plain', skin: 'skin-4', hairColor: 'black', outfitColor: 'blue', bottomsColor: 'navy' };
const CASES: [string, Record<string, unknown>, string][] = [
  ['man casual', { body: 'man', outfit: 'casual', hair: 'low-cut' }, 'm1'],
  ['man casual curls', { body: 'man', outfit: 'casual', hair: 'curls' }, 'm1'],
  ['man hoodie', { body: 'man', outfit: 'hoodie', hair: 'low-cut' }, 'm4'],
  ['man chill locs', { body: 'man', outfit: 'chill', hair: 'locs' }, 'm4'],
  ['man jersey', { body: 'man', outfit: 'jersey', hair: 'fade' }, 'm1'],
  ['man office', { body: 'man', outfit: 'office', hair: 'classic' }, 'm5'],
  ['man office low cut', { body: 'man', outfit: 'office', hair: 'low-cut' }, 'm5'],
  ['man site work', { body: 'man', outfit: 'site-work', hair: 'low-cut' }, 'm1'],
  ['man kaftan', { body: 'man', outfit: 'kaftan', hair: 'low-cut' }, 'm2'],
  ['man agbada (m3 is off: the next nearest)', { body: 'man', outfit: 'agbada', hair: 'bald', fabric: 'aso-oke' }, 'm2'],
  ['man in ankara', { body: 'man', outfit: 'casual', hair: 'low-cut', fabric: 'ankara' }, 'm6'],
  ['man with a fila', { body: 'man', outfit: 'casual', hair: 'low-cut', accessories: ['fila'] }, 'm6'],
  ['woman casual', { body: 'woman', outfit: 'casual', hair: 'braids' }, 'w3'],
  ['woman casual in ankara with braids', { body: 'woman', outfit: 'casual', hair: 'braids', fabric: 'ankara' }, 'w1'],
  ['woman office', { body: 'woman', outfit: 'office', hair: 'bun' }, 'w4'],
  ['woman owambe with a gele', { body: 'woman', outfit: 'owambe', hair: 'gele', fabric: 'aso-oke' }, 'w2'],
  ['woman gown', { body: 'woman', outfit: 'gown', hair: 'long' }, 'w2'],
  ['woman kaftan', { body: 'woman', outfit: 'kaftan', hair: 'classic', accessories: ['headwrap'] }, 'w6'],
  ['woman afro', { body: 'woman', outfit: 'casual', hair: 'afro' }, 'w3'],
  ['legacy keys: gender and hairstyle', { gender: 'female', outfit: 'office', hairstyle: 'lowcut' }, 'w4'],
];

test('an old look is read as the nearest character that is on (table-driven)', () => {
  for (const [name, look, id] of CASES) {
    const pick = pickOf({ ...base, ...look }, 'someone');
    assert.equal(pick?.id, id, name);
    assert.equal(rosterEntry(pick?.id)?.on, 1, `${name}: the character is on`);
  }
});

test('the old skin tone maps to the nearest of the six steps, only for characters that have steps', () => {
  assert.deepEqual(['skin-1', 'skin-2', 'skin-3', 'skin-4', 'skin-5', 'skin-6', 'skin-7'].map(skinStepOf), [1, 1, 2, 3, 4, 5, 6]);
  assert.equal(skinStepOf('#3a2317'), 6); assert.equal(skinStepOf('nonsense'), 0); assert.equal(skinStepOf(null), 0);
  assert.equal(pickOf({ ...base, body: 'man', outfit: 'casual', skin: 'skin-7' }, 'x')?.skin, 6);
  assert.equal(pickOf({ ...base, body: 'woman', outfit: 'casual', fabric: 'ankara', hair: 'braids', skin: 'skin-7' }, 'x')?.skin, 0, 'w1 has no skin steps');
  assert.equal(SKIN_HEX.length, 6);
});

test('a look that names a character wears it (outfit and skin step in range), and one switched off is read by its words', () => {
  assert.deepEqual(pickOf({ body: 'man', character: 'm6', characterOutfit: 2, characterSkin: 4 }, 'x'), { id: 'm6', outfit: 2, skin: 4 });
  assert.deepEqual(pickOf({ body: 'man', character: 'm6', characterOutfit: 9, characterSkin: 40 }, 'x'), { id: 'm6', outfit: 0, skin: 0 });
  assert.deepEqual(pickOf({ body: 'woman', character: 'w1', characterSkin: 3 }, 'x'), { id: 'w1', outfit: 0, skin: 0 });
  assert.notEqual(pickOf({ body: 'man', character: 'm3', outfit: 'agbada' }, 'x')?.id, 'm3');
  assert.notEqual(pickOf({ body: 'woman', character: 'm1' }, 'x')?.id, 'm1', 'the wrong sex is ignored');
});

test('no look, junk, or no body: the seed alone gives a stable character; nothing throws', () => {
  for (const junk of [null, undefined, 7, 'text', [], {}, { body: 'alien' }, { outfit: 'office' }]) {
    const first = pickOf(junk, 'seed-1'), again = pickOf(junk, 'seed-1');
    assert.deepEqual(first, again);
    assert.ok(first && rosterEntry(first.id)?.on === 1);
  }
  assert.notDeepEqual(new Set(Array.from({ length: 60 }, (_, i) => seededPick(`p${i}`)?.id)).size, 1, 'the seeds spread over the roster');
  const ids = new Set(Array.from({ length: 400 }, (_, i) => seededPick(`crowd:${i}`)?.id));
  assert.deepEqual([...ids].sort(), rosterOn().map((entry) => entry.id).sort(), 'only characters that are on, and all of them');
});

test('a regular is always the same character, chosen by their description', () => {
  const amaka = { id: 'amaka', name: 'Amaka', role: 'Serving', emoji: '\u{1F469}\u{1F3FE}‍\u{1F373}' };
  assert.equal(regularSex(amaka), 'woman');
  assert.equal(regularSex({ id: 'baba-sege', name: 'Baba Sege', emoji: '\u{1F474}\u{1F3FE}' }), 'man');
  assert.equal(regularSex({ id: 'x', name: 'Mama Ronke' }), 'woman');
  assert.equal(regularSex({ id: 'x', name: 'Oga Tunde', emoji: '\u{1F4FA}' }), 'man');
  assert.equal(regularSex({ id: 'x', name: 'Kunle', look: { body: 'woman' } }), 'woman', 'a look field wins');
  assert.equal(regularSex({ id: 'x', name: 'Kunle', emoji: '\u{1F9D1}' }), null);
  for (const regular of [amaka, { id: 'baba-sege', name: 'Baba Sege', age: 'elder', emoji: '\u{1F474}' }, { id: 'tega', name: 'Tega', emoji: '\u{1F9D1}' }]) {
    const a = regularPick(regular), b = regularPick({ ...regular });
    assert.deepEqual(a, b, `${regular.id} is stable`);
    assert.ok(a && rosterEntry(a.id)?.on === 1);
  }
  assert.equal(rosterEntry(regularPick(amaka)?.id)?.sex, 'woman');
  assert.ok(['m5', 'm2'].includes(regularPick({ id: 'baba-sege', name: 'Baba Sege', age: 'elder', emoji: '\u{1F474}' })!.id), 'an elder man is one of the older men');
});

test('the table names only characters of the manifest, and every character that is on has words', () => {
  for (const id of Object.keys(TABLE)) assert.ok(rosterEntry(id), id);
  for (const entry of ROSTER) assert.ok(TABLE[entry.id], `${entry.id} has words`);
});
