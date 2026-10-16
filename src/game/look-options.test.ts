import { loadCityContent as preloadCityContent } from './cities/registry.ts';
await Promise.all(['lagos', 'ibadan'].map(preloadCityContent));
// OWNER: character — the beta look options: extra hairstyles and outfits, accessories, face and expression.
// They are add-only: a look or a wardrobe that uses none of them is stored exactly as it always was.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, dispatch, viewLife } from '../life.ts';
import { makeContext } from './util.ts';
import { checkLook } from './systems/onboarding.ts';
import { APPEARANCE, BOUTIQUE_PRICES, ACCESSORY_BASICS, DEFAULT_LOOK } from './content/traits.ts';
import type { ActionBody, ActionResult, ActionType } from '../types/actions.ts';
import type { LifeContext, LifeState, Look } from '../types/life.ts';
import { LOOK_OPTIONS, ACCESSORY_SLOTS } from '../scene/characters.ts';
import { NATIVE_BOUTIQUE_PRICES, NATIVE_STARTER_ITEMS, nativeRecipeForLook, normalizeNativeRecipe } from '../character/native-recipe.ts';
import { NATIVE_CHARACTER_CATALOG } from '../character/native-catalog.ts';
import { withWearableBoutique } from '../app/features/life/boutiqueModel.ts';

const START = Date.UTC(2026, 0, 5, 8);
let tick = 0;
const at = (now = START, seed = `look-${tick++}`): LifeContext => makeContext({ now, cityId: 'lagos', seed });
// The payload is deliberately `unknown`: several tests send hostile (malformed) input to prove the server-side validation.
const act = <T extends ActionType>(state: LifeState, type: T, payload?: unknown, context: LifeContext = at()): ActionResult<T> =>
  dispatch(state, { type, payload } as unknown as ActionBody<T>, context);
/** The reason of a refused action ('' for a success or a refusal without one). */
const why = (result: { ok: boolean; reason?: string }): string => result.reason ?? '';
/** Narrows a lookup that must have found something. */
function need<T>(value: T | null | undefined, what = 'expected a value'): T { assert.ok(value, what); return value; }
const LOOK: Look = { body: 'man', hair: 'afro', outfit: 'hoodie', fabric: 'ankara', skin: 'skin-6', hairColor: 'auburn', outfitColor: 'teal', bottomsColor: 'cream' };
const NATIVE_FEATURES = Object.fromEntries(NATIVE_CHARACTER_CATALOG.features.map((feature, index) => [feature.id, index % 2 ? feature.min * .75 : feature.max * .75]));
const NATIVE_RECIPE = normalizeNativeRecipe({ ...nativeRecipeForLook(LOOK, 'native-contract'), appearance: { ...nativeRecipeForLook(LOOK, 'native-contract').appearance,
  body: 'male', hair: 'braid01', garments: ['formal-suit-01'], shoes: 'shoes03', eyeColor: 'green', complexion: 'medium', height: 1.09, features: NATIVE_FEATURES,
  colors: { skin: '#6f402c', hair: '#271b16', upper: '#a1b2c3', lower: '#304050', shoes: '#607080' }, handPose: 'point' }, emotion: 'surprised', emotionStrength: .63 });
const NATIVE_LOOK: Look = { ...LOOK, native: NATIVE_RECIPE };

function started(look: Look = LOOK, house = 'yaba'): LifeState {
  let state = createLife(null, at());
  assert.equal(act(state, 'onboarding.look', { look }).code, 'look_saved');
  act(state, 'onboarding.traits', { traits: ['hustler', 'foodie'] }); act(state, 'onboarding.dream', { dream: 'yaba-unicorn' });
  for (let i = 0; i < 500; i++) {
    const trial = structuredClone(state);
    act(trial, 'onboarding.lottery', {}, at(START + i, `look-roll-${i}`));
    if (need(trial.onboarding.lottery).id === 'civil-servant') { state = trial; break; }
  }
  assert.equal(act(state, 'onboarding.home', { house }).code, 'life_started');
  return state;
}

test('the beta options are add-only, priced, labelled and known to the scene', () => {
  const ids = <I extends string>(list: { id: I }[]): I[] => list.map((item) => item.id);
  for (const body of ids(APPEARANCE.bodies)) {
    const rows: ['hair' | 'outfit', readonly string[], readonly string[]][] = [['hair', APPEARANCE.hair[body], APPEARANCE.extra.hair[body]], ['outfit', APPEARANCE.outfits[body], APPEARANCE.extra.outfits[body]]];
    for (const [kind, base, extra] of rows) {
      assert.ok(extra.length >= 2, `${body} has at least two more ${kind} options`);
      assert.equal(new Set([...base, ...extra]).size, base.length + extra.length, 'no id is offered twice');
      for (const id of extra) {
        assert.ok(Number.isSafeInteger(BOUTIQUE_PRICES[kind][id]) && (BOUTIQUE_PRICES[kind][id] ?? 0) > 0, `${id} has a price`);
        assert.ok(APPEARANCE.labels[id], `${id} has a label`);
        assert.ok(LOOK_OPTIONS[kind][body].includes(id.replace(/[^a-z0-9]/g, '')), `the scene can draw ${id}`);
      }
    }
  }
  assert.ok(APPEARANCE.accessories.length >= 9);
  for (const { id, slot } of APPEARANCE.accessories) {
    assert.ok(Number.isSafeInteger(BOUTIQUE_PRICES.accessories[id]) && APPEARANCE.labels[id], id);
    assert.equal(ACCESSORY_SLOTS[id], slot, `the scene agrees on the slot of ${id}`);
    assert.equal(BOUTIQUE_PRICES.accessories[id] === 0, ACCESSORY_BASICS.includes(id), `${id}: free exactly when it is a starter`);
    assert.equal(APPEARANCE.boutiqueOnly.accessories.includes(id), !ACCESSORY_BASICS.includes(id), `${id}: a starter or sold in the Boutique`);
  }
  assert.deepEqual([APPEARANCE.faces, APPEARANCE.expressions], [LOOK_OPTIONS.face, LOOK_OPTIONS.expression]);
  for (const [kind, list] of Object.entries(APPEARANCE.boutiqueOnly)) {
    assert.ok(kind === 'hair' || kind === 'outfit' || kind === 'accessories', `${kind} is a priced kind`);
    for (const id of list) assert.ok((BOUTIQUE_PRICES[kind][id] ?? 0) > 0, `${id} is for sale`);
  }
});

test('the native recipe round-trips all 35 controls and malformed recipes are refused', () => {
  const checked = need(checkLook(JSON.parse(JSON.stringify(NATIVE_LOOK))).look);
  assert.deepEqual(checked.native, NATIVE_RECIPE);
  assert.equal(Object.keys(need(checked.native).appearance.features).length, 35);
  for (const feature of NATIVE_CHARACTER_CATALOG.features) assert.equal(checked.native!.appearance.features[feature.id], NATIVE_FEATURES[feature.id], feature.id);

  const invalid: [string, (look: Look) => void, RegExp][] = [
    ['version', (look) => { look.native!.version = 1 as 2 }, /version 2/],
    ['body type', (look) => { look.native!.appearance.body = ['male'] as never }, /supported native body/],
    ['garment', (look) => { look.native!.appearance.garments = ['not-a-garment' as never] }, /supported native outfit/],
    ['range', (look) => { look.native!.appearance.features['nose-width'] = 2 }, /Nose width/],
    ['missing control', (look) => { delete look.native!.appearance.features['nose-width'] }, /every supported native face and body control/],
    ['colour', (look) => { look.native!.appearance.colors.skin = '#fff' }, /five native colours/],
  ];
  for (const [label, change, pattern] of invalid) {
    const look = structuredClone(NATIVE_LOOK); change(look);
    const result = checkLook(look);
    assert.equal(result.look, undefined, label); assert.match(result.reason ?? '', pattern);
  }
  assert.deepEqual(checkLook(LOOK).look?.native, nativeRecipeForLook(LOOK, JSON.stringify(LOOK)), 'a legacy save receives one deterministic native recipe');
  assert.equal(checkLook({ ...LOOK, accessories: ['glasses', 'sunglasses'] }).look, undefined, 'legacy hostile fields remain validated during migration');
});

test('character creation accepts a complete native recipe and every shuffle remains a complete supported recipe', () => {
  const state = createLife(null, at());
  assert.equal(act(state, 'onboarding.look', { look: NATIVE_LOOK }).code, 'look_saved');
  assert.deepEqual(state.onboarding.look.native, NATIVE_RECIPE, 'creation keeps exact full-catalog native selections');
  assert.equal(state.onboarding.step, 1);
  const malformed = structuredClone(NATIVE_LOOK);
  malformed.native!.appearance.height = 1.5;
  const refused = act(createLife(null, at()), 'onboarding.look', { look: malformed });
  assert.equal(refused.code, 'invalid_look'); assert.match(why(refused), /height from 0.85 to 1.15/);

  for (let i = 0; i < 300; i++) {
    const trial = createLife(null, at());
    act(trial, 'onboarding.look', { shuffle: true }, at(START, `shuffle-${i}`));
    const look = trial.onboarding.look;
    const native = need(look.native);
    assert.equal(Object.keys(native.appearance.features).length, 35);
    assert.ok(NATIVE_CHARACTER_CATALOG.bodies.some((item) => item.id === native.appearance.body));
    assert.ok(NATIVE_CHARACTER_CATALOG.hair.some((item) => item.id === native.appearance.hair));
    assert.ok(NATIVE_CHARACTER_CATALOG.garments.some((item) => item.id === native.appearance.garments[0]));
    assert.ok(NATIVE_CHARACTER_CATALOG.shoes.some((item) => item.id === native.appearance.shoes));
    assert.equal(act(trial, 'onboarding.look', { look }).code, 'look_saved', 'a shuffled look can always be saved');
  }
  assert.deepEqual(state.onboarding.wardrobe, { hair: ['low-cut'], outfit: ['casual'], fabric: ['plain'], native: [...NATIVE_STARTER_ITEMS] }, 'creation starts with only the bounded native starter set');
});

test('native recipes and ownership survive save reload while invalid native data is refused without resetting progress', () => {
  const saved = started(NATIVE_LOOK);
  const reloaded = createLife(structuredClone(saved), at());
  assert.deepEqual(reloaded, saved, 'the complete recipe and settled life survive a reload unchanged');
  assert.deepEqual(reloaded.onboarding.look.native, NATIVE_RECIPE);
  assert.equal(Object.keys(reloaded.onboarding.look.native!.appearance.features).length, 35);
  assert.ok(NATIVE_STARTER_ITEMS.every((id) => reloaded.onboarding.wardrobe.native?.includes(id)));
  for (const id of ['braid01', 'formal-suit-01', 'shoes03']) assert.ok(reloaded.onboarding.wardrobe.native?.includes(id), `${id} remains owned`);

  const legacy = started(LOOK);
  assert.deepEqual(legacy.onboarding.look.native, nativeRecipeForLook(LOOK, JSON.stringify(LOOK)), 'an old look is upgraded deterministically');
  assert.deepEqual(createLife(structuredClone(legacy), at()).onboarding.look.native, legacy.onboarding.look.native, 'the upgrade is persisted rather than reseeded');

  const damaged = structuredClone(saved);
  damaged.cash = 4321; damaged.name = 'Still Here';
  delete damaged.onboarding.look.native!.appearance.features['nose-width'];
  const loaded = createLife(damaged, at());
  assert.equal(loaded.cash, 4321); assert.equal(loaded.name, 'Still Here'); assert.equal(loaded.onboarding.done, true);
  assert.equal(loaded.onboarding.look.native, undefined, 'an incomplete recipe never reaches a consumer');
  assert.deepEqual(loaded.onboarding.look, DEFAULT_LOOK, 'only the damaged look returns to the safe saved default');
});

test('an owned native hairstyle survives the Profile action payload and save reload', () => {
  const state = started(NATIVE_LOOK);
  assert.equal(state.onboarding.look.native?.appearance.hair, 'braid01');
  assert.ok(state.onboarding.wardrobe.native?.includes('short01'), 'the starter hairstyle is owned');
  const current = need(state.onboarding.look.native);
  const short = normalizeNativeRecipe({ ...current, appearance: { ...current.appearance, hair: 'short01' } });
  const payload = JSON.parse(JSON.stringify({ look: { ...state.onboarding.look, native: short } })) as { look: Look };
  assert.equal(payload.look.native?.appearance.hair, 'short01', 'the browser JSON boundary keeps the chosen hairstyle');
  assert.equal(act(state, 'onboarding.set-look', payload).code, 'look_saved');
  assert.equal(state.onboarding.look.native?.appearance.hair, 'short01', 'the action stores the chosen hairstyle');
  assert.equal(createLife(structuredClone(state), at()).onboarding.look.native?.appearance.hair, 'short01', 'save sanitation keeps it');
});

test('the Boutique lists only native goods and purchases charge, equip, persist and explain refusals', () => {
  const state = started(NATIVE_LOOK);
  const shop = () => viewLife(state, at()).onboarding.boutique;
  const item = (kind: string, id: string) => need(shop().find((entry) => entry.kind === kind && entry.id === id));
  assert.deepEqual([...new Set(shop().map((entry) => entry.kind))].sort(), ['native-garment', 'native-hair', 'native-shoes']);
  assert.equal(shop().length, NATIVE_CHARACTER_CATALOG.hair.length + NATIVE_CHARACTER_CATALOG.garments.length + NATIVE_CHARACTER_CATALOG.shoes.length);
  assert.deepEqual([item('native-shoes', 'shoes01').owned, item('native-shoes', 'shoes01').price], [true, 0], 'native starters are owned and never charged');
  assert.equal(item('native-shoes', 'shoes02').owned, false);

  const before = state.cash, price = NATIVE_BOUTIQUE_PRICES['native-shoes'].shoes02!;
  const bought = act(state, 'onboarding.boutique-buy', { kind: 'native-shoes', id: 'shoes02' });
  assert.equal(bought.code, 'bought'); assert.equal(state.cash, before - price);
  assert.deepEqual([need(state.ledger.at(-1)).amount, need(state.ledger.at(-1)).reason], [-price, 'Boutique: Shoes 02']);
  assert.equal(state.onboarding.look.native?.appearance.shoes, 'shoes02', 'a purchase is equipped in the authoritative recipe');
  assert.ok(state.onboarding.wardrobe.native?.includes('shoes02'));
  assert.deepEqual([item('native-shoes', 'shoes02').owned, item('native-shoes', 'shoes02').wearing], [true, true]);
  const again = act(state, 'onboarding.boutique-buy', { kind: 'native-shoes', id: 'shoes02' });
  assert.equal(again.code, 'already_owned'); assert.match(why(again), /already own Shoes 02/);

  state.cash = 10;
  const dear = act(state, 'onboarding.boutique-buy', { kind: 'native-garment', id: 'female-elegant-01' });
  assert.equal(dear.code, 'insufficient_funds'); assert.match(why(dear), /Blouse and skirt costs ₦8,000; you have ₦10/);
  assert.match(need(item('native-garment', 'female-elegant-01').blocked), /Costs ₦8,000/);
  for (const payload of [{ kind: 'native-hair', id: 'constructor' }, { kind: 'native-garment' }, { kind: 'native-shoes', id: 'shoe99' }]) {
    assert.equal(act(state, 'onboarding.boutique-buy', payload).code, 'invalid_item');
  }
  const reloaded = createLife(structuredClone(state), at());
  assert.ok(reloaded.onboarding.wardrobe.native?.includes('shoes02'), 'purchased ownership survives reload');
  assert.equal(reloaded.onboarding.look.native?.appearance.shoes, 'shoes02', 'the equipped native item survives reload');
});

test('the lazy browser Boutique projection matches the authoritative server projection', () => {
  const state = started(NATIVE_LOOK);
  state.cash = 4321;
  const server = viewLife(state, at()).onboarding;
  const browser = withWearableBoutique({ ...server, boutique: [] }, state);
  assert.deepEqual(browser.boutique, server.boutique);
});
