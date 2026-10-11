import { loadCityContent as preloadCityContent } from './cities/registry.ts';
await Promise.all(['lagos'].map(preloadCityContent));
// OWNER: character — the roster in the saved look: the manifest, server validation of the three new fields, and old lives loading unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, dispatch } from '../life.ts';
import { makeContext } from './util.ts';
import { checkLook } from './systems/onboarding.ts';
import { APPEARANCE } from './content/traits.ts';
import { ROSTER, SKIN_STEPS, checkRosterFields, rosterEntry, rosterOn, tidyRosterFields } from './roster.ts';
import type { ActionBody, ActionResult, ActionType } from '../types/actions.ts';
import type { LifeContext, LifeState, Look } from '../types/life.ts';

const START = Date.UTC(2026, 0, 5, 8);
let tick = 0;
const at = (now = START, seed = `roster-${tick++}`): LifeContext => makeContext({ now, cityId: 'lagos', seed });
const act = <T extends ActionType>(state: LifeState, type: T, payload?: unknown, context: LifeContext = at()): ActionResult<T> =>
  dispatch(state, { type, payload } as unknown as ActionBody<T>, context);
const OLD: Look = { body: 'man', hair: 'afro', outfit: 'hoodie', fabric: 'ankara', skin: 'skin-6', hairColor: 'auburn', outfitColor: 'teal', bottomsColor: 'cream' };

test('the manifest: twelve characters, six of each sex, unique ids, sensible counts, four off (m3, m6, w2, w5) until their files are fixed', () => {
  assert.equal(ROSTER.length, 12);
  assert.deepEqual(new Set(ROSTER.map((entry) => entry.id)).size, 12);
  for (const entry of ROSTER) {
    assert.match(entry.id, entry.sex === 'man' ? /^m[1-6]$/ : /^w[1-6]$/);
    assert.ok(entry.outfits >= 3 && entry.outfits <= 4, `${entry.id} has 3 or 4 outfits`);
    assert.ok(entry.name.length > 2);
    // The stand-in styles for the old figure exist for the body and are free at creation (a roster look must be accepted with them).
    const [hair, outfit, fabric] = entry.as, body = entry.sex;
    assert.ok([...APPEARANCE.hair[body], ...APPEARANCE.extra.hair[body]].includes(hair), `${entry.id} hair`);
    assert.ok([...APPEARANCE.outfits[body], ...APPEARANCE.extra.outfits[body]].includes(outfit), `${entry.id} outfit`);
    assert.ok(APPEARANCE.fabrics.includes(fabric), `${entry.id} fabric`);
    for (const [kind, id] of [['hair', hair], ['outfit', outfit]] as const) assert.ok(!(APPEARANCE.boutiqueOnly[kind] as readonly string[]).includes(id), `${entry.id} ${kind} ${id} is free at creation`);
  }
  assert.deepEqual(ROSTER.filter((entry) => entry.on === 0).map((entry) => entry.id), ['m3', 'm6', 'w2', 'w5']);
  assert.equal(rosterOn('man').length, 4); assert.equal(rosterOn('woman').length, 4); assert.equal(rosterEntry('zz'), null);
});

test('checkRosterFields: ids, sex, outfit and skin step ranges; defaults are not stored', () => {
  assert.deepEqual(checkRosterFields({}, 'man'), { fields: {} });
  assert.deepEqual(checkRosterFields({ character: 'm1' }, 'man'), { fields: { character: 'm1' } });
  assert.deepEqual(checkRosterFields({ character: 'm1', characterOutfit: 0, characterSkin: 0 }, 'man'), { fields: { character: 'm1' } });
  assert.deepEqual(checkRosterFields({ character: 'm4', characterOutfit: 3, characterSkin: SKIN_STEPS }, 'man'), { fields: { character: 'm4', characterOutfit: 3, characterSkin: 6 } });
  for (const bad of [
    { character: 'w1' }, { character: 'q9' }, { character: 7 }, { character: 'm1', characterOutfit: 4 }, { character: 'm1', characterOutfit: -1 }, { character: 'm1', characterOutfit: 1.5 },
    { character: 'm1', characterSkin: 7 }, { character: 'm1', characterOutfit: '1' }, { characterOutfit: 1 }, { character: 'w1', characterSkin: 1 },
  ]) assert.ok('reason' in checkRosterFields(bad, 'man'), JSON.stringify(bad));
  assert.ok('reason' in checkRosterFields({ character: 'w1', characterSkin: 1 }, 'woman'), 'w1 has no skin steps');
  assert.deepEqual(checkRosterFields({ character: 'w3', characterSkin: 2 }, 'woman'), { fields: { character: 'w3', characterSkin: 2 } });
  // A saved look is tidied, never refused: a switched-off character stays named, bad numbers fall to the defaults.
  assert.deepEqual(tidyRosterFields({ character: 'm3', characterOutfit: 2 }, 'man'), { character: 'm3', characterOutfit: 2 });
  assert.deepEqual(tidyRosterFields({ character: 'm1', characterOutfit: 99 }, 'man'), { character: 'm1' });
  assert.deepEqual(tidyRosterFields({ character: 'nobody' }, 'man'), {});
  assert.deepEqual(tidyRosterFields({ character: 'w1' }, 'man'), {});
});

test('checkLook (the server): a roster look is accepted with the old fields, a bad one is refused with a reason', () => {
  const good = checkLook({ ...OLD, character: 'm4', characterOutfit: 2, characterSkin: 3 }, { starter: true });
  assert.deepEqual(good.look, { ...OLD, character: 'm4', characterOutfit: 2, characterSkin: 3 });
  assert.deepEqual(checkLook(OLD).look, OLD, 'a look without a character is exactly what it was');
  for (const bad of [{ character: 'w1' }, { character: 'm1', characterOutfit: 9 }, { character: 'm1', characterSkin: 'dark' }, { character: ['m1'] }]) {
    const refused = checkLook({ ...OLD, ...bad });
    assert.equal(refused.look, undefined, JSON.stringify(bad));
    assert.ok(refused.reason && refused.reason.length > 4);
  }
});

test('a roster look is a finished look: set-look needs no owned styles for it, and wearing it grants none', () => {
  const state = createLife(null, at());
  assert.equal(act(state, 'onboarding.look', { look: { ...OLD, outfit: 'office', hair: 'low-cut', fabric: 'plain', character: 'm5' } }).code, 'look_saved');
  const stored = structuredClone(state.onboarding.look);
  assert.equal(stored.character, 'm5');
  assert.deepEqual(createLife(structuredClone(state), at()).onboarding.look, stored, 'reloading changes nothing');
  assert.deepEqual(createLife(structuredClone(state), at()).onboarding.wardrobe, { hair: ['low-cut'], outfit: ['casual'], fabric: ['plain'] }, 'the stand-in styles are not owned by wearing a character');
});

test('lives saved before the roster load unchanged: no character is written, and a bad character is dropped, not the look', () => {
  const old = createLife(null, at());
  act(old, 'onboarding.look', { look: OLD });
  assert.deepEqual(old.onboarding.look, OLD);
  const reloaded = createLife(structuredClone(old), at());
  assert.deepEqual(reloaded.onboarding.look, OLD);
  assert.ok(!('character' in reloaded.onboarding.look), 'nothing is rewritten until the player next saves a look');
  const damaged = structuredClone(old);
  damaged.onboarding.look = { ...OLD, character: 'w2', characterOutfit: 'x', characterSkin: 99 } as unknown as Look;
  assert.deepEqual(createLife(damaged, at()).onboarding.look, OLD, 'a character of the other sex is dropped, the look survives');
  const off = structuredClone(old);
  off.onboarding.look = { ...OLD, character: 'm3', characterOutfit: 9 } as unknown as Look;
  assert.deepEqual(createLife(off, at()).onboarding.look, { ...OLD, character: 'm3' }, 'a switched-off character stays named, with its defaults');
});

test('the shuffle gives a roster character that is on, with the free stand-in styles', () => {
  const state = createLife(null, at());
  for (let i = 0; i < 30; i++) {
    act(state, 'onboarding.look', { shuffle: true }, at(START, `shuffle-${i}`));
    const look = state.onboarding.look, entry = rosterEntry(look.character);
    assert.ok(entry && entry.on === 1, `shuffle ${i} chose ${String(look.character)}`);
    assert.equal(entry.sex, look.body);
    assert.deepEqual([look.hair, look.outfit, look.fabric], [...entry.as]);
    assert.equal(checkLook(look, { starter: true }).look?.character, entry.id);
  }
});
