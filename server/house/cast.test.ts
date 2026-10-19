// OWNER: agents — the cast and the written lines (server/house/cast.ts, lines.ts): authored data is valid, and every written line passes the AI word rules.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkLook } from '../../src/game/systems/onboarding.ts';
import { loadCityContent } from '../../src/game/cities/registry.ts';
import { agentWords } from '../moderation/agent-words.ts';
import { ACTION_IDS, ACTIONS, planAt } from './actions.ts';
import { AUTHORED_CITIES, HOUSE_LOOKS, castOf, itemsOf, venueFor } from './cast.ts';
import type { Spec } from './cast.ts';
import { priceList } from './haggle.ts';
import * as say from './lines.ts';
import { QUIZ, isRight } from './talk.ts';
import type { Verdict } from './haggle.ts';

const HOUR = 3600000;

test('every look is a valid look of the game, every seller item is a real product, names are unique and original', () => {
  for (const [name, look] of Object.entries(HOUSE_LOOKS)) assert.ok(checkLook(look).look, `${name}: ${JSON.stringify(checkLook(look))}`);
  const names = new Set<string>();
  for (const city of ['lagos', 'ibadan', 'accra', 'nairobi', 'abuja']) for (const spec of castOf(city)) {
    assert.ok(spec.name.length >= 3 && spec.name.length <= 24 && !names.has(`${city}:${spec.name}`));
    names.add(`${city}:${spec.name}`);
    if (spec.role === 'seller') { const items = itemsOf(spec); assert.equal(items.length, spec.items?.length, `${spec.key} sells only products that exist`); assert.ok(items.length >= 3); }
    else assert.equal(spec.items, undefined);
    assert.ok(spec.hours.open >= 0 && spec.hours.open < 24 && spec.hours.close >= 0 && spec.hours.close <= 24);
  }
  assert.deepEqual(AUTHORED_CITIES, ['lagos']);
  assert.equal(castOf('lagos').length, 6);
  assert.deepEqual(castOf('lagos').slice(0, 3).map((spec) => spec.role), ['seller', 'guide', 'marketer'], 'the first few are the ones that matter most');
  assert.deepEqual(castOf('not-a-city'), []);
});

test('other countries get their own seller and guide, in a venue the city has', async () => {
  for (const city of ['accra', 'nairobi', 'ibadan']) await loadCityContent(city).catch(() => {});
  for (const city of ['accra', 'nairobi', 'ibadan']) {
    const cast = castOf(city);
    if (!cast.length) continue; // a city that is not open in this build has none
    assert.equal(cast.length, 2);
    assert.deepEqual(cast.map((spec) => spec.role), ['seller', 'guide']);
    for (const spec of cast) assert.ok(venueFor(city, spec.post, spec.role), `${city}/${spec.key} has a venue`);
  }
  assert.notEqual(castOf('accra')[0]?.key, castOf('ibadan')[0]?.key);
});

test('the day plan: one choice at a time, the right place and the right end', () => {
  const day = Date.UTC(2026, 9, 13, 23); // Lagos midnight
  const seller = castOf('lagos')[0]!;
  const slot = (hour: number) => planAt(seller, day + hour * HOUR);
  assert.equal(slot(3).action, 'go_home'); assert.equal(slot(8.5).action, 'go_market'); assert.equal(slot(9).action, 'open_shop');
  assert.equal(slot(13.5).action, 'eat'); assert.equal(slot(14).action, 'open_shop'); assert.equal(slot(18).action, 'go_home');
  assert.equal(slot(10).until, day + 13 * HOUR, 'the shop stays open until lunch');
  const wrapping: Pick<Spec, 'role' | 'hours' | 'market' | 'eatery'> = { role: 'guide', hours: { open: 20, close: 4 } };
  assert.equal(planAt(wrapping, day + 22 * HOUR).action, 'work_shift');
  assert.equal(planAt(wrapping, day + 2 * HOUR).action, 'work_shift');
  assert.equal(planAt(wrapping, day + 12 * HOUR).action, 'go_home');
  const allDay: Pick<Spec, 'role' | 'hours' | 'market' | 'eatery'> = { role: 'seller', hours: { open: 0, close: 24 } };
  assert.ok(['open_shop', 'eat'].includes(planAt(allDay, day + 5 * HOUR).action));
  for (const id of ACTION_IDS) assert.ok(ACTIONS[id].label && ACTIONS[id].doing && ACTIONS[id].id === id);
  for (let minute = 0; minute < 1440; minute += 7) for (const spec of castOf('lagos')) { const planned = planAt(spec, day + minute * 60000); assert.ok(planned.until > day + minute * 60000 && planned.until <= day + minute * 60000 + 25 * HOUR); }
});

test('every written line of every voice, role and verdict passes the word rules, for an adult and for a minor', () => {
  const lines: string[] = [];
  const verdicts: Verdict[] = [{ kind: 'accept', price: 1850 }, { kind: 'counter', price: 1880 }, { kind: 'refuse', price: 2000 }, { kind: 'final', price: 2000 }];
  for (const city of ['lagos', 'accra']) for (const spec of castOf(city)) for (let n = 0; n < 12; n++) {
    const seed = `${spec.key}|${n}`;
    lines.push(say.atPost(spec, 'Freedom Park', seed), say.greet(spec, 'Ada', seed), say.ambient(spec, seed), say.fallback(spec, seed), say.pressure(spec, seed), say.notSeller(spec, seed), say.taskNone(spec, seed), say.taskAgain(spec, seed), say.taskFull(spec, seed), say.taskGreeted(spec, seed), say.taskHanded(spec, seed), say.taskBrought(spec, seed), say.taskShort(spec, 2, "rice", seed), say.sale(spec, { ok: true, label: "Ankara", price: 1800 }, seed), say.sale(spec, { ok: false, code: "insufficient_funds", label: "Ankara", price: 1800 }, seed), say.sale(spec, { ok: false, code: "bag_full", label: "Ankara", price: 1800 }, seed), say.sale(spec, { ok: false, code: "not_needed", label: "Ankara", price: 1800 }, seed), say.sale(spec, { ok: false, code: "x", label: "Ankara", price: 1800 }, seed), say.bye(spec, seed), say.callBack(spec, seed), say.callBusy(spec, seed),
      say.which(spec, ['Ankara wax print', 'Adire cloth'], seed), say.tonight(spec, [], seed), say.tonight(spec, ['The Square is full tonight', 'A quiz starts at the library'], seed), say.hoursLine(spec, true), say.hoursLine(spec, false),
      say.directionsLine(spec, { name: 'Freedom Park', district: 'Lagos Island', status: 'Open now' }, []), say.directionsLine(spec, null, ['the market', 'the park']), say.directionsLine(spec, null, []));
    for (const item of priceList(itemsOf(spec), 15)) { lines.push(say.priceLine(spec, item.label, item.list)); for (const verdict of verdicts) lines.push(say.verdictLine(spec, item.label, verdict, seed)); }
    if (spec.role === 'seller') lines.push(say.pricesLine(spec, priceList(itemsOf(spec), 15)));
  }
  for (const question of QUIZ) lines.push(say.quizAsk(question.q), say.quizWin('Ada', question.a), say.quizEnd(question.a));
  assert.ok(lines.length > 500);
  for (const line of lines) {
    assert.ok(line.length > 3 && line.length <= 240, line);
    for (const toMinor of [true, false]) assert.ok(agentWords(line, { toMinor }).ok, `${toMinor ? 'minor' : 'adult'}: ${line} → ${JSON.stringify(agentWords(line, { toMinor }))}`);
    assert.doesNotMatch(line, /\{\w+\}/, 'every placeholder is filled');
  }
});

test('the quiz bank: every answer is accepted as a whole word and nothing else is', () => {
  assert.ok(QUIZ.length >= 10);
  for (const question of QUIZ) { assert.ok(question.ok.length > 0); for (const answer of question.ok) assert.ok(isRight(question, `I think it is ${answer}!`), `${question.q} / ${answer}`); assert.ok(!isRight(question, 'no idea, abeg')); }
  assert.ok(!isRight(QUIZ.find((q) => q.a === '11')!, 'it is 111'), 'whole words only');
});
