// OWNER: scenes — creator selection state: choosing a body, a character, an outfit and a skin step on a look.
import test from 'node:test';
import assert from 'node:assert/strict';
import { characterOf, ensureCharacter, hasCharacter, shuffleCharacter, withCharacter, withOutfit, withSex, withSkinStep } from './look.ts';
import { rosterEntry, rosterOn } from '../../game/roster.ts';
import { checkLook } from '../../game/systems/onboarding.ts';
import type { Look } from '../../types/life.ts';
import { makeRng } from '../../game/util.ts';

const OLD: Look = { body: 'woman', hair: 'braids', outfit: 'casual', fabric: 'ankara', skin: 'skin-5', hairColor: 'black', outfitColor: 'blue', bottomsColor: 'navy', accessories: ['glasses'] };

test('choosing a character sets the body, the stand-in styles and the fields; the server accepts every result', () => {
  for (const entry of rosterOn()) {
    for (let outfit = 0; outfit < entry.outfits; outfit++) for (const skin of entry.skin ? [0, 1, 6] : [0]) {
      const look = withCharacter(OLD, entry.id, outfit, skin);
      assert.equal(look.body, entry.sex);
      assert.deepEqual([look.hair, look.outfit, look.fabric], [...entry.as]);
      assert.deepEqual(characterOf(look), { id: entry.id, outfit, skin });
      const checked = checkLook(look, { starter: true });
      assert.ok(checked.look, `${entry.id} o${outfit} s${skin}: ${checked.reason}`);
      assert.deepEqual(checked.look?.accessories, undefined, 'a character wears no accessories');
    }
  }
  assert.equal(withCharacter(OLD, 'nobody'), OLD);
  assert.ok(!('characterOutfit' in withCharacter(OLD, 'm1', 0, 0)) && !('characterSkin' in withCharacter(OLD, 'm1', 0, 0)), 'defaults are not stored');
});

test('man / woman picks the first character that is on; the same sex keeps the character', () => {
  const man = withSex(OLD, 'man');
  assert.equal(man.body, 'man'); assert.equal(rosterEntry(man.character)?.sex, 'man'); assert.equal(rosterEntry(man.character)?.on, 1);
  assert.equal(man.character, 'm1');
  const w4 = withCharacter(OLD, 'w4', 2, 3);
  assert.equal(withSex(w4, 'woman'), w4);
  assert.equal(withSex(w4, 'man').character, 'm1');
});

test('outfit and skin step change one thing at a time, and a character without steps ignores a step', () => {
  const m1 = withCharacter(OLD, 'm1');
  assert.deepEqual(characterOf(withOutfit(m1, 3)), { id: 'm1', outfit: 3, skin: 0 });
  assert.deepEqual(characterOf(withSkinStep(withOutfit(m1, 3), 4)), { id: 'm1', outfit: 3, skin: 4 });
  assert.deepEqual(characterOf(withOutfit(withSkinStep(m1, 4), 0)), { id: 'm1', outfit: 0, skin: 4 });
  assert.deepEqual(characterOf(withSkinStep(withCharacter(OLD, 'w1'), 5)), { id: 'w1', outfit: 0, skin: 0 }, 'w1 has no skin steps');
  assert.deepEqual(characterOf(withOutfit(withCharacter(OLD, 'w1'), 9)), { id: 'w1', outfit: 2, skin: 0 }, 'an outfit past the last is the last');
});

test('an old look is shown as its mapped character without being changed, and written as one only when ensured', () => {
  assert.equal(hasCharacter(OLD), false);
  assert.equal(characterOf(OLD)?.id, 'w1', 'braids in ankara is the Ankara wrapper');
  const ensured = ensureCharacter(OLD);
  assert.equal(ensured.character, 'w1'); assert.equal(hasCharacter(ensured), true);
  assert.equal(ensureCharacter(ensured), ensured);
  assert.equal(OLD.character, undefined, 'the input is not changed');
});

test('shuffle gives a character that is on, of the sex asked, and varies', () => {
  const random = makeRng('creator-shuffle');
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const look = shuffleCharacter(OLD, random, i % 2 ? 'man' : 'woman');
    assert.equal(look.body, i % 2 ? 'man' : 'woman');
    assert.equal(rosterEntry(look.character)?.on, 1);
    seen.add(`${look.character}:${look.characterOutfit ?? 0}:${look.characterSkin ?? 0}`);
    assert.ok(checkLook(look, { starter: true }).look);
  }
  assert.ok(seen.size > 20);
});
