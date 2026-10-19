import { loadCityContent } from '../../src/game/cities/registry.ts';
await Promise.all(['lagos', 'ibadan', 'accra', 'nairobi'].map((city) => loadCityContent(city)));
// OWNER: minigames — the rules of the local mini-games that need no server (docs/MINI-GAMES.md): the market haggle's prices, words and memory, the JAMB
// question bank, the NYSC arc, and the caps that keep the money honest.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BUSINESS_PRODUCTS } from '../../src/game/content/business.ts';
import { MINIGAME_PAY_CAP } from '../../src/game/systems/living-world.ts';
import { agentWords } from '../moderation/agent-words.ts';
import { HAGGLE, decide, freshTalk } from '../house/haggle.ts';
import { BUYS_PER_DAY, GRADE_WORDS, REGULAR_AFTER, cleanRephrase, gradeOf, marketOf, memoryOf, pricedToday, tradersOf } from './haggle.ts';
import { LINE_KINDS, allGreetings, allTemplates, greeting, say, templatesOf } from './haggle-lines.ts';
import type { Mood, Voice } from './haggle-lines.ts';
import { BANK, BANK_SIZE, SUBJECTS, idsOf, optionsOf } from './jamb-questions.ts';
import { MOCK_MIX, MOCK_TOTAL, PAY_PER_CORRECT, PRACTICE_DAY_CAP, PRACTICE_MIX, PRACTICE_PER_DAY, RESULTS_DAY, SEASON_DAYS, draw } from './jamb.ts';
import { ARC_DAYS, DUTIES, DUTY_PAY, PASS_OUT_PAY, STAGES, STAGE_DAYS, campOf, honourFor } from './nysc.ts';
import { SEASON_DAY_CAP } from './common.ts';
import { SKIT_CAPTION_MAX, tidy } from './skit.ts';

const up10 = (value: number): number => Math.ceil(value / 10 - 1e-9) * 10;

test('the traders: Lagos has two of its own at Balogun Market, every other market has its country\'s seller, and everything they sell is a real product', () => {
  assert.deepEqual(marketOf('lagos'), { venue: 'market', name: 'Balogun Market' });
  const lagos = tradersOf('lagos');
  assert.deepEqual(lagos.map((trader) => trader.key), ['sade', 'emeka']);
  assert.deepEqual(lagos.map((trader) => trader.voice), ['pidgin', 'pidgin']);
  for (const city of ['lagos', 'ibadan', 'accra', 'nairobi']) {
    const traders = tradersOf(city);
    assert.ok(traders.length >= 1, city);
    for (const trader of traders) {
      assert.ok(trader.items.length >= 3, `${city}/${trader.key} sells several things`);
      for (const item of trader.items) { const product = BUSINESS_PRODUCTS.get(item.id); assert.ok(product && ['fabric', 'crafts'].includes(product.type), `${item.id} is a real bag good`); assert.equal(item.base, product.base, 'at the game\'s own list price'); }
    }
  }
  assert.deepEqual(tradersOf('ibadan').map((trader) => trader.voice), ['pidgin'], 'a Nigerian market speaks Pidgin');
  assert.deepEqual(tradersOf('accra').map((trader) => trader.voice), ['plain']);
  assert.deepEqual(tradersOf('not-a-city'), []);
  assert.equal(marketOf('not-a-city'), null);
});

test('the floor: never below 70% of the list (what the purchase step accepts), never above it, moved by the day, and no offer ever gets a price under it', () => {
  const seen = new Set<number>();
  for (const trader of tradersOf('lagos')) for (const base of trader.items) for (let day = 20000; day < 20030; day++) {
    const item = pricedToday(trader, base.id, day)!;
    assert.equal(item.list, up10(base.base));
    assert.ok(item.floor >= up10(item.list * 0.7), `${base.id} floor ${item.floor} is at least 70% of ${item.list}`);
    assert.ok(item.floor <= item.list && item.fair >= item.floor && item.fair <= item.list);
    if (base.id === 'ankara') seen.add(item.floor);
    // Every offer in a talk: the verdict price is never under the floor and never over the list.
    const talk = freshTalk(item);
    for (let offer = 10; offer <= item.list + 200; offer += 10) {
      const verdict = decide(item, talk, offer);
      assert.ok(verdict.price >= item.floor && verdict.price <= item.list, `${base.id} day ${day}: ${verdict.kind} at ${verdict.price} for an offer of ${offer}`);
      if (verdict.kind === 'accept') { assert.ok(offer >= item.floor); break; }
    }
  }
  assert.ok(seen.size >= 3, 'tomorrow\'s floor is not always today\'s');
  assert.equal(pricedToday(tradersOf('lagos')[0]!, 'indigo-cloth-that-does-not-exist', 1), null);
  assert.equal(pricedToday(tradersOf('lagos')[0]!, 'cap', 1), null, 'a trader sells only their own things');
});

test('a grade never names the floor: coarse bands from the share of the room that was won', () => {
  const item = { id: 'x', label: 'X', list: 2000, floor: 1600, fair: 1800 };
  assert.equal(gradeOf(item, 2000), 'fair');
  assert.equal(gradeOf(item, 1900), 'fair');
  assert.equal(gradeOf(item, 1800), 'good');
  assert.equal(gradeOf(item, 1700), 'sharp');
  assert.equal(gradeOf(item, 1600), 'floor');
  assert.deepEqual(Object.keys(GRADE_WORDS).sort(), ['fair', 'floor', 'good', 'sharp']);
});

test('the trader remembers: a first visit, the same day after a purchase, another day, and a regular after three purchases', () => {
  const day = 20000;
  assert.equal(memoryOf({ deals: 0, dealDay: 0, dealsToday: 0 }, day), 'new');
  assert.equal(memoryOf({ deals: 1, dealDay: day, dealsToday: 1 }, day), 'again');
  assert.equal(memoryOf({ deals: 1, dealDay: day - 1, dealsToday: 1 }, day), 'returning');
  assert.equal(memoryOf({ deals: REGULAR_AFTER, dealDay: day - 3, dealsToday: 1 }, day), 'regular');
  assert.equal(memoryOf({ deals: REGULAR_AFTER, dealDay: day, dealsToday: 2 }, day), 'again', 'the same day comes first: last prices');
  assert.equal(BUYS_PER_DAY, 3);
});

test('every written line, in both voices and both moods, passes the AI word rules for a minor; "You again? Last price." is there', () => {
  const lines = allTemplates();
  assert.ok(lines.length >= 80);
  for (const voice of ['pidgin', 'plain'] as Voice[]) for (const mood of ['warm', 'tough'] as Mood[]) for (const kind of LINE_KINDS) {
    assert.ok(templatesOf(voice, mood, kind).length >= 2, `${voice}/${mood}/${kind} has a choice of lines`);
    for (let seed = 0; seed < 6; seed++) {
      const text = say(voice, mood, kind, { item: 'Ankara wax print', price: 1640, name: 'Ada' }, `s${seed}`);
      assert.ok(text.length > 0 && text.length <= 200, text);
      assert.ok(!text.includes('{') && !text.includes('}'), `no token left in: ${text}`);
      assert.equal(agentWords(text, { toMinor: true }).ok, true, text);
    }
  }
  for (const text of allGreetings()) assert.equal(agentWords(text.replace('{name}', 'Ada'), { toMinor: true }).ok, true, text);
  assert.ok(templatesOf('pidgin', 'warm', 'again').some((line) => /You again\?/.test(line) && /[Ll]ast price/.test(line)));
  assert.match(say('pidgin', 'warm', 'again', { item: 'Adire cloth', price: 2300 }, 'x'), /₦2,300/);
  assert.match(greeting('plain', 'warm', 'regular', 'Ada'), /Ada/);
  assert.ok(!/\bfree\b|%|discount/i.test(lines.join(' ')), 'no line promises something free');
});

test('a model\'s rephrase is kept only if it carries the same amounts and the same verdict', () => {
  const written = 'Better, but small small. ₦1,700 for Ankara wax print, e fit work.';
  assert.equal(cleanRephrase(written, 'You dey try! ₦1,700 for the Ankara, we dey close.', 'counter'), 'You dey try! ₦1,700 for the Ankara, we dey close.');
  assert.equal(cleanRephrase(written, 'Ok, ₦1,600 and it is yours.', 'counter'), null, 'a new amount');
  assert.equal(cleanRephrase(written, 'You dey try, we dey close.', 'counter'), null, 'the amount dropped');
  assert.equal(cleanRephrase(written, 'Take it for free at ₦1,700, my friend!', 'counter'), null, 'a promise of free');
  assert.equal(cleanRephrase(written, 'That is 10% off, ₦1,700, my friend, fine.', 'counter'), null, 'a percent');
  assert.equal(cleanRephrase(written, 'Deal! ₦1,700 and it is yours, my friend.', 'counter'), null, 'agrees to what was only countered');
  assert.equal(cleanRephrase('Deal! Adire cloth for ₦2,300.', 'No, ₦2,300 is too low for me.', 'accept'), null, 'refuses what was agreed');
  assert.equal(cleanRephrase('Deal! Adire cloth for ₦2,300.', 'We have a bargain at ₦2,300, it is held for you.', 'accept')?.includes('₦2,300'), true);
  assert.equal(cleanRephrase(written, written, 'counter'), null, 'the same line is not a rephrase');
  assert.equal(cleanRephrase(written, 'x'.repeat(300), 'counter'), null);
  assert.equal(cleanRephrase('Hello there, welcome.', 'Call me on 08012345678 now ok', 'accept'), null);
});

test('the JAMB bank: 120 original questions, 40 of each subject, four distinct answers each, the right one among them, and the order of the four is the person\'s own', () => {
  assert.equal(BANK_SIZE, 120);
  for (const subject of SUBJECTS) assert.equal(idsOf(subject).length, 40, subject);
  const texts = new Set<string>();
  BANK.forEach((row, id) => {
    const [subject, text, right, wrong, why] = row;
    assert.ok(SUBJECTS.includes(subject) && text.length > 10 && text.length <= 200 && why.length > 8, `${id}`);
    assert.ok(!texts.has(text), `no repeated question: ${text}`); texts.add(text);
    const all = [right, ...wrong];
    assert.equal(new Set(all).size, 4, `${id} has four different answers`);
    assert.ok(all.every((answer) => answer.length > 0 && answer.length <= 60), `${id} answers are short`);
    const shown = optionsOf(id, 'seed-a')!;
    assert.deepEqual([...shown.options].sort(), [...all].sort());
    assert.equal(shown.options[shown.answer], right, `${id}: the index points at the right answer`);
    assert.deepEqual(optionsOf(id, 'seed-a'), shown, 'the same person sees the same order');
  });
  const positions = new Set(BANK.map((_, id) => optionsOf(id, 'seed-b')!.answer));
  assert.equal(positions.size, 4, 'the right answer sits in every position across the bank');
  const orders = new Set(Array.from({ length: 20 }, (_, n) => optionsOf(0, `person-${n}`)!.options.join('|')));
  assert.ok(orders.size > 3, 'different people see different orders');
  assert.equal(optionsOf(999, 'x'), null);
});

test('the day\'s practice: five questions in the mix, drawn from the person\'s own seed, new ones first, repeatable', () => {
  assert.equal(Object.values(PRACTICE_MIX).reduce((a, b) => a + b, 0), PRACTICE_PER_DAY);
  assert.equal(Object.values(MOCK_MIX).reduce((a, b) => a + b, 0), MOCK_TOTAL);
  const seen = new Set<number>();
  const days: number[][] = [];
  for (let day = 0; day < 8; day++) {
    const ids = SUBJECTS.flatMap((subject) => draw('seed', day, subject, PRACTICE_MIX[subject], seen));
    assert.equal(ids.length, PRACTICE_PER_DAY);
    assert.deepEqual(ids, SUBJECTS.flatMap((subject) => draw('seed', day, subject, PRACTICE_MIX[subject], seen)), 'drawing twice gives the same set');
    assert.equal(new Set(ids).size, PRACTICE_PER_DAY);
    for (const id of ids) { assert.ok(!seen.has(id), `question ${id} is new`); seen.add(id); }
    days.push(ids);
  }
  assert.notDeepEqual(days[0], days[1]);
  // When a subject is used up, questions come round again rather than the day running short.
  const all = new Set(idsOf('general'));
  assert.equal(draw('seed', 99, 'general', 5, all).length, 5);
});

test('the NYSC arc: nine duties in three stages, three choices of 2, 1 and 0 points each, three weeks, an honour from the points, and a camp for every city', () => {
  assert.equal(STAGES.length, 3);
  assert.equal(DUTIES.length, 9);
  assert.equal(ARC_DAYS, 3 * STAGE_DAYS);
  const ids = new Set<string>();
  for (const duty of DUTIES) {
    assert.ok(!ids.has(duty.id)); ids.add(duty.id);
    assert.deepEqual(duty.options.map((option) => option.points).sort(), [0, 1, 2], duty.id);
    for (const option of duty.options) {
      for (const text of [duty.title, duty.scene, option.text, option.result]) assert.equal(agentWords(text, { toMinor: true }).ok, true, text);
      assert.ok(option.result.length > 20);
    }
  }
  assert.equal(honourFor(18), 'Distinction');
  assert.equal(honourFor(14), 'Distinction');
  assert.equal(honourFor(13), 'Credit');
  assert.equal(honourFor(9), 'Credit');
  assert.equal(honourFor(8), 'Pass');
  assert.deepEqual(campOf('lagos'), { name: 'Iyana-Ipaja Orientation Camp', state: 'Lagos State' });
  assert.deepEqual(campOf('abuja').state, 'FCT');
  assert.match(campOf('ibadan').name, /Ibadan Orientation Camp/);
});

test('the money: small, capped, and equal to what the wallet action accepts', () => {
  assert.equal(MINIGAME_PAY_CAP, PASS_OUT_PAY, 'the wallet action refuses a season payment above the passing out');
  assert.ok(DUTY_PAY <= MINIGAME_PAY_CAP && 1000 <= MINIGAME_PAY_CAP);
  assert.equal(PRACTICE_DAY_CAP, PRACTICE_PER_DAY * PAY_PER_CORRECT);
  assert.ok(PASS_OUT_PAY + DUTY_PAY <= SEASON_DAY_CAP, 'the biggest day of the camp fits under the day\'s cap');
  assert.ok(RESULTS_DAY < SEASON_DAYS);
  assert.equal(HAGGLE.rounds, 4);
});

test('the skit studio\'s words are tidied: control characters out, spaces collapsed, cut to length', () => {
  assert.equal(tidy('  hello \n\t  world  ', 40), 'hello world');
  assert.equal(tidy('x'.repeat(200), SKIT_CAPTION_MAX).length, SKIT_CAPTION_MAX);
  assert.equal(tidy(42, 10), '');
  assert.equal(tidy('a\u2028b', 10), 'a b');
});
