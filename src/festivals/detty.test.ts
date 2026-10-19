// OWNER: growth - Detty December (docs/DETTY-DECEMBER.md): the season's dates in WAT and their edges, the preview, the nights and owambe
// Saturdays, the daily drop by date, the Returnee rule (and that no position is an input), the season card, the skin on and off, and the
// December words of /visit/<city> by date.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { DETTY_CITIES, dettyOn, isDettyCity, seasonDay, seasonSpan, seasonYear, watMidnight } from './detty-dates.ts';
import { DEFAULT_DROPS, DEFAULT_NIGHTS, LIST_LIMITS, OWAMBE, SEASON_CITIES, cardOpen, cardWords, dropFor, liveEvents, nightsText, parseDrops, parseNights, returneeEarned, returneeLabel, seasonEvents, seasonFacts, seasonKey, skinFor, venueIdsOf, venueOf } from './detty.ts';
import type { SeasonRecord } from './detty.ts';
import { buildSkin, perimeter } from './detty-skin.ts';
import { resetDettyClient, scenePlan, sceneSkin } from './detty-client.ts';
import type { DettyFeed } from './detty-client.ts';
import { DECEMBER_CITIES, ENTRY_VARIANTS, placeWords, variantOf } from '../entry-variants.ts';

const HOUR = 3600000, MIN = 60000;
/** Server ms of a WAT wall-clock time. */
const wat = (y: number, m: number, d: number, h = 12, min = 0): number => watMidnight(y, m, d) + h * HOUR + min * MIN;
const feedOf = (change: Partial<DettyFeed> = {}): DettyFeed => ({ now: 0, on: true, preview: false, day: 1, year: 2026, key: '2026', cities: DETTY_CITIES, nights: [...DEFAULT_NIGHTS], drops: [...DEFAULT_DROPS], card: false, at: Date.now(), ...change });

test('the season runs from 00:00 WAT on 1 December to 24:00 WAT on 31 December, whatever the UTC date says', () => {
  const { start, end } = seasonSpan(2026);
  assert.equal(new Date(start).toISOString(), '2026-11-30T23:00:00.000Z', '00:00 WAT is 23:00 UTC the day before');
  assert.equal(new Date(end).toISOString(), '2026-12-31T23:00:00.000Z');
  assert.equal(dettyOn(start - 1), false, '23:59:59.999 WAT on 30 November: not yet');
  assert.equal(dettyOn(start), true, 'the first moment of 1 December, WAT');
  assert.equal(dettyOn(end - 1), true, 'the last moment of 31 December, WAT');
  assert.equal(dettyOn(end), false, 'New Year in Lagos: over (still 31 December in UTC and in Accra)');
  assert.equal(new Date(end).getUTCDate(), 31, 'the UTC date alone would have said December');
  assert.equal(dettyOn(Number.NaN), false);
  assert.equal(seasonDay(start), 1);
  assert.equal(seasonDay(wat(2026, 12, 18)), 18);
  assert.equal(seasonDay(end - 1), 31);
  assert.equal(seasonDay(end), null);
  assert.equal(seasonDay(wat(2026, 10, 19)), null);
  // Every year, by itself.
  assert.equal(dettyOn(wat(2027, 12, 10)), true);
  assert.equal(dettyOn(wat(2027, 6, 10)), false);
});

test('the preview turns the season on now, with today’s day of the month, and keeps what it records apart', () => {
  const october = wat(2026, 10, 19);
  assert.equal(dettyOn(october), false);
  assert.equal(dettyOn(october, true), true);
  assert.equal(seasonDay(october, true), 19);
  assert.equal(seasonDay(wat(2026, 11, 30, 23), true), 30);
  assert.equal(seasonKey(october, true), 'preview-2026');
  assert.equal(seasonKey(wat(2026, 12, 5), true), '2026', 'a preview in December is the real season');
  assert.equal(seasonKey(wat(2026, 12, 5), false), '2026');
  assert.equal(seasonYear(wat(2027, 1, 10)), 2026, 'January belongs to the season that just ended');
  assert.equal(seasonKey(wat(2027, 1, 10), false), '2026');
});

test('the cities: Lagos, Accra and Abuja, with their countries, and day venues that fall back in order', () => {
  assert.deepEqual([...DETTY_CITIES], ['lagos', 'accra', 'abuja']);
  assert.equal(isDettyCity('kano'), false);
  assert.deepEqual(DETTY_CITIES.map((id) => SEASON_CITIES[id].country), ['ng', 'gh', 'ng']);
  assert.equal(venueOf('lagos', 'beach')?.id, 'beach');
  // Labadi Beach is preferred in Accra the moment the city has it; until then its park, and the words follow ("Park day").
  assert.equal(venueOf('accra', 'beach', (id) => id === 'accra-labadi-beach' || id === 'accra-recreation')?.id, 'accra-labadi-beach');
  assert.deepEqual(venueOf('accra', 'beach', (id) => id === 'accra-recreation'), { id: 'accra-recreation', word: 'Park' });
  assert.equal(venueOf('abuja', 'beach')?.word, 'Lake');
  assert.equal(venueOf('lagos', 'owambe')?.id, 'home');
  assert.deepEqual(venueIdsOf('accra', 'beach'), ['accra-labadi-beach', 'accra-recreation']);
  assert.equal(venueOf('lagos', 'concert', () => false), null);
});

test('one event a night: the list goes round, Saturdays are Owambe Saturday, hours are the city’s own', () => {
  // 1 December 2026 is a Tuesday; 5 December a Saturday.
  const week = seasonEvents(wat(2026, 12, 1, 0), wat(2026, 12, 8, 0), 'lagos');
  assert.equal(week.length, 7);
  assert.deepEqual(week.map((e) => e.kind), ['concert', 'beach', 'street', 'concert', 'owambe', 'street', 'concert']);
  assert.deepEqual(week.map((e) => e.day), [1, 2, 3, 4, 5, 6, 7]);
  const saturday = week[4]!;
  assert.equal(saturday.title, OWAMBE.title);
  assert.equal(saturday.venue, 'home');
  assert.equal(saturday.start, wat(2026, 12, 5, OWAMBE.from));
  assert.equal(week[0]!.venue, 'shrine');
  assert.equal(week[0]!.start, wat(2026, 12, 1, 20));
  assert.equal(week[1]!.title, 'Beach day');
  assert.equal(week[0]!.key, 'detty:lagos:2026-12-01:concert');
  // Accra keeps GMT: its 20:00 is 21:00 in Lagos. Abuja has no sea: "Lake day".
  assert.equal(seasonEvents(wat(2026, 12, 1, 0), wat(2026, 12, 2, 0), 'accra')[0]!.start, wat(2026, 12, 1, 21));
  assert.equal(seasonEvents(wat(2026, 12, 2, 0), wat(2026, 12, 3, 0), 'abuja')[0]!.title, 'Lake day');
  // Nothing before the season, nothing after, nothing outside the three cities.
  assert.deepEqual(seasonEvents(wat(2026, 11, 20), wat(2026, 11, 30, 23, 59), 'lagos'), []);
  assert.deepEqual(seasonEvents(wat(2027, 1, 1, 0), wat(2027, 1, 5), 'lagos'), []);
  assert.deepEqual(seasonEvents(wat(2026, 12, 1), wat(2026, 12, 8), 'kano'), []);
  assert.equal(seasonEvents(wat(2026, 12, 31, 0), wat(2027, 1, 2), 'lagos').length, 1, 'the last night is the 31st');
  // Live: on at a moment inside it only.
  assert.equal(liveEvents(wat(2026, 12, 3, 20, 30), 'lagos')[0]?.kind, 'street');
  assert.deepEqual(liveEvents(wat(2026, 12, 3, 18, 59), 'lagos'), []);
  // A preview in October shows tonight's night as 19 December would.
  assert.equal(seasonEvents(wat(2026, 10, 19, 0), wat(2026, 10, 20, 0), 'lagos', { preview: true, nights: DEFAULT_NIGHTS }).length, 1);
});

test('the admin’s list of nights: one per line, bad lines left out, nothing usable means the defaults', () => {
  assert.deepEqual(parseNights(nightsText(DEFAULT_NIGHTS)), [...DEFAULT_NIGHTS]);
  assert.deepEqual(parseNights('concert | Fuji night | 21-24\nnonsense\nbeach | <b>x</b> | 10-12\nstreet | Road party | 22-20\nstreet | Visit www.x.com | 19-23\nbeach | {day} picnic | 12-16'),
    [{ kind: 'concert', title: 'Fuji night', from: 21, to: 24 }, { kind: 'beach', title: '{day} picnic', from: 12, to: 16 }]);
  assert.equal(parseNights(''), null);
  assert.equal(parseNights(42), null);
  assert.equal(parseNights(Array.from({ length: 30 }, () => 'concert | Night | 20-23').join('\n'))!.length, LIST_LIMITS.nights);
  const custom = parseNights('street | Carnival | 18-22')!;
  assert.deepEqual(seasonEvents(wat(2026, 12, 1, 0), wat(2026, 12, 3, 0), 'lagos', { preview: false, nights: custom }).map((e) => e.title), ['Carnival', 'Carnival']);
});

test('the daily drop: 31 by default, one a day by date, an admin’s shorter list goes round', () => {
  assert.equal(DEFAULT_DROPS.length, 31);
  assert.equal(new Set(DEFAULT_DROPS).size, 31);
  for (const line of DEFAULT_DROPS) assert.ok(line.length >= 3 && line.length <= LIST_LIMITS.drop && !/https?:|www\./.test(line), line);
  assert.equal(dropFor(1), DEFAULT_DROPS[0]);
  assert.equal(dropFor(25), DEFAULT_DROPS[24]);
  assert.match(dropFor(25)!, /Christmas Day/);
  assert.equal(dropFor(31), DEFAULT_DROPS[30]);
  assert.equal(dropFor(seasonDay(wat(2026, 12, 24, 23, 59))!), DEFAULT_DROPS[23]);
  assert.equal(dropFor(seasonDay(wat(2026, 12, 25, 0, 0))!), DEFAULT_DROPS[24], 'the drop changes at midnight WAT');
  assert.equal(dropFor(0), null);
  const mine = parseDrops('Eat suya\n\nhttps://spam.example\nDance')!;
  assert.deepEqual(mine, ['Eat suya', 'Dance']);
  assert.equal(dropFor(3, mine), 'Eat suya');
  assert.equal(parseDrops('  \n '), null);
});

test('the Returnee rule: a badge in another country, a season city, during the season; ids only, never a position', () => {
  const dec = wat(2026, 12, 10);
  assert.equal(returneeEarned({ now: dec, visited: 'lagos', badgeCountry: 'gb' }), true, 'London badge, in Lagos');
  assert.equal(returneeEarned({ now: dec, visited: 'accra', badgeCountry: 'ng' }), true, 'Lagos badge, in Accra');
  assert.equal(returneeEarned({ now: dec, visited: 'abuja', badgeCountry: 'NG' }), false, 'a badge at home is not a return');
  assert.equal(returneeEarned({ now: dec, visited: 'kano', badgeCountry: 'gb' }), false, 'not a season city');
  assert.equal(returneeEarned({ now: dec, visited: 'lagos', badgeCountry: null }), false, 'no badge, no Returnee');
  assert.equal(returneeEarned({ now: wat(2026, 11, 30, 23, 59), visited: 'lagos', badgeCountry: 'gb' }), false, 'before the season');
  assert.equal(returneeEarned({ now: wat(2026, 10, 19), preview: true, visited: 'lagos', badgeCountry: 'us' }), true, 'in a preview');
  assert.equal(returneeLabel(2026), 'Returnee · Detty December 2026');
  // The rule takes ids and codes: an input carrying coordinates changes nothing, and none of them are read.
  const withPosition = { now: dec, visited: 'lagos', badgeCountry: 'ng', lat: 51.5, lon: -0.12 } as Parameters<typeof returneeEarned>[0];
  assert.equal(returneeEarned(withPosition), false);
  assert.equal(/lat|lon|position|coords/i.test(returneeEarned.toString()), false);
});

test('the season card: counts and city names, the words, and when it is offered', () => {
  const record: SeasonRecord = { s: '2026', cities: ['accra', 'lagos'], events: ['detty:lagos:2026-12-01:concert', 'detty:lagos:2026-12-03:street', 'detty:accra:2026-12-05:owambe'], parties: ['1796500000000'], returnee: { 2026: { city: 'lagos', at: 1 } } };
  const facts = seasonFacts(record, '2026');
  assert.deepEqual(facts, { year: 2026, nights: 3, parties: 1, cities: ['Lagos', 'Accra'], returnee: true });
  assert.deepEqual(cardWords(facts), { title: 'I did Detty December in Allworld', line: '3 nights out · 1 owambe · Lagos and Accra · Returnee', text: 'I did Detty December in Allworld 2026: 3 nights out · 1 owambe · Lagos and Accra · Returnee.' });
  assert.equal(cardWords({ year: 2026, nights: 1, parties: 2, cities: ['Lagos', 'Accra', 'Abuja'], returnee: false }).line, '1 night out · 2 owambes · Lagos, Accra and Abuja');
  // Another season's record counts nothing (its badge of that season is not this one's).
  assert.deepEqual(seasonFacts(record, '2027'), { year: 2027, nights: 0, parties: 0, cities: [], returnee: false });
  assert.deepEqual(seasonFacts({ ...record, s: 'preview-2026', returnee: {} }, 'preview-2026'), { year: 2026, nights: 3, parties: 1, cities: ['Lagos', 'Accra'], returnee: false });
  assert.deepEqual(seasonFacts(undefined, '2026'), { year: 2026, nights: 0, parties: 0, cities: [], returnee: false });
  assert.equal(JSON.stringify(facts).includes('detty:'), false, 'no event keys or ids on the card');
  assert.equal(cardOpen(wat(2026, 12, 23, 23, 59)), false);
  assert.equal(cardOpen(wat(2026, 12, 24, 0)), true);
  assert.equal(cardOpen(wat(2027, 1, 15, 23)), true);
  assert.equal(cardOpen(wat(2027, 1, 16, 0)), false);
  assert.equal(cardOpen(wat(2026, 10, 19), true), true);
});

test('the skin is on only during the season, in the three cities, at the season’s venues; a weak phone gets half', () => {
  const dec = wat(2026, 12, 10, 21), oct = wat(2026, 10, 19, 21);
  assert.equal(skinFor(false, 'lagos', 'beach', 'park', false), null, 'off season: nothing');
  assert.equal(skinFor(true, 'kano', 'park', 'park', false), null, 'another city: nothing');
  assert.equal(skinFor(true, 'lagos', 'hospital', 'park', false), null, 'a venue with no part in the season');
  assert.deepEqual(skinFor(true, 'lagos', 'park', 'park', false)?.parts, ['lights']);
  assert.deepEqual(skinFor(true, 'lagos', 'beach', 'park', false)?.parts, ['beach', 'lights']);
  assert.deepEqual(skinFor(true, 'lagos', 'shrine', 'park', false)?.parts, ['stage']);
  const full = skinFor(true, 'abuja', 'jabi-lake-park', 'kubwa-garden', false)!, light = skinFor(true, 'abuja', 'jabi-lake-park', 'kubwa-garden', true)!;
  assert.ok(light.bulbs * 2 <= full.bulbs + 4 && light.umbrellas * 2 === full.umbrellas, 'the light plan halves the pieces');
  // The page's decision with the season it holds: by date, or the preview.
  assert.equal(scenePlan(feedOf({ preview: false }), oct, 'lagos', 'beach', false), null);
  assert.ok(scenePlan(feedOf({ preview: true }), oct, 'lagos', 'beach', false));
  assert.ok(scenePlan(feedOf({ preview: false }), dec, 'lagos', 'beach', false));
  assert.equal(scenePlan(null, dec, 'lagos', 'beach', false), null, 'no answer yet: nothing');
  assert.equal(scenePlan(feedOf(), wat(2027, 1, 1, 0, 5), 'lagos', 'beach', false), null, 'off at midnight on New Year (WAT)');
});

test('the skin builds a few instanced meshes, and the scene hook adds it while on and takes it away when the season ends', async () => {
  const plan = skinFor(true, 'lagos', 'beach', 'park', false)!;
  const skin = buildSkin(THREE, plan, { bounds: [-12, -10, 12, 10] });
  assert.ok(skin.drawCalls <= 6, `${skin.drawCalls} draw calls`);
  assert.ok(skin.group.children.every((child) => (child as THREE.InstancedMesh).isInstancedMesh));
  assert.equal(skin.pieces, plan.bulbs + Math.max(2, Math.round(plan.bulbs / 6)) + plan.umbrellas * 3);
  for (const [, z] of perimeter([-12, -10, 12, 10], 36)) assert.ok(z < 10 - 0.5, 'never across the camera’s side');
  const light = buildSkin(THREE, skinFor(true, 'lagos', 'beach', 'park', true)!, { bounds: [-12, -10, 12, 10] });
  assert.ok(light.pieces < skin.pieces);
  skin.dispose(); light.dispose();
  assert.equal(skin.group.children.length, 0);

  resetDettyClient();
  let preview = true, fetched = 0, checkins = 0;
  const fetchJson = async (path: string): Promise<unknown> => { if (path.endsWith('/checkin')) { checkins += 1; return null } fetched += 1; return { ...feedOf({ preview }), at: undefined } };
  const group = new THREE.Group(), settle = (): Promise<void> => new Promise((done) => setTimeout(done, 5));
  let redraws = 0;
  const hook = sceneSkin({ THREE, group, cityId: 'lagos', venueId: 'beach', place: () => ({ bounds: [-12, -10, 12, 10] }), redraw: () => { redraws += 1 } }, { fetchJson, light: false, load: async () => import('./detty-skin.ts') });
  hook.tick(wat(2026, 10, 19, 21));
  await settle(); await settle();
  assert.deepEqual(hook.plan()?.parts, ['beach', 'lights'], 'the preview is on: the beach is dressed');
  assert.equal(group.children.length, 1);
  assert.equal(redraws, 1, 'an idle scene is drawn again when the props arrive');
  assert.equal(checkins, 1, 'a check-in on arrival');
  hook.tick(wat(2026, 10, 19, 21) + 30000);
  await settle();
  assert.equal(fetched, 1, 'once a minute at most, and the answer is kept');
  preview = false; resetDettyClient();
  hook.tick(wat(2026, 10, 19, 21) + 2 * MIN);
  await settle(); await settle();
  assert.equal(hook.plan(), null, 'the preview went off: the props go');
  assert.equal(group.children.length, 0);
  assert.equal(redraws, 2, 'and again when they go');
  hook.tick(wat(2026, 12, 1, 0, 1));
  await settle(); await settle();
  assert.ok(hook.plan(), '1 December, 00:01 WAT: on by itself');
  hook.tick(wat(2027, 1, 1, 0, 1));
  await settle(); await settle();
  assert.equal(hook.plan(), null, 'New Year, WAT: off by itself');
  hook.dispose();
  const kano = sceneSkin({ THREE, group, cityId: 'kano', venueId: 'park', place: () => ({ bounds: [-12, -10, 12, 10] }) }, { fetchJson, light: false });
  kano.tick(wat(2026, 12, 10, 21)); await settle(); await settle();
  assert.equal(kano.plan(), null);
  resetDettyClient();
});

test('the entry variant: /visit/lagos, /visit/accra and /visit/abuja read Detty December in December only; /detty is its own address', () => {
  const visit = ENTRY_VARIANTS.find((variant) => variant.id === 'visit')!;
  for (const city of DETTY_CITIES) {
    assert.equal(placeWords(visit, city, wat(2026, 12, 1, 0))?.headline, 'Detty December in {city}', city);
    assert.equal(placeWords(visit, city, wat(2026, 11, 30, 23, 59))?.headline, 'Visit home to {city}', city);
    assert.equal(placeWords(visit, city, wat(2027, 1, 1, 0))?.headline, 'Visit home to {city}', city);
  }
  assert.equal(placeWords(visit, 'kano', wat(2026, 12, 10))?.headline, 'Visit home to {city}', 'another city keeps the visit words');
  assert.equal(placeWords(visit, null, wat(2026, 12, 10))?.headline, 'Visit home to {city}');
  const street = ENTRY_VARIANTS.find((variant) => variant.id === 'street')!;
  assert.equal(placeWords(street, 'lagos', wat(2026, 12, 10)), street.place, 'a street keeps its own words');
  for (const words of [visit.december!.description.replace('{city}', 'Lagos'), visit.december!.title.replace('{city}', 'Lagos')]) assert.ok(words.length <= 155 && !/[<>"]/.test(words));
  // The entry page keeps its own copy of the rule (so its chunk loads nothing more): it must agree with the season's, hour by hour.
  assert.deepEqual([...DECEMBER_CITIES], [...DETTY_CITIES]);
  for (let at = wat(2026, 11, 29, 0); at <= wat(2027, 1, 2, 0); at += HOUR) assert.equal(placeWords(visit, 'lagos', at) === visit.december, dettyOn(at), new Date(at).toISOString());
  assert.equal(variantOf('/detty')?.id, 'detty');
  assert.equal(variantOf('/detty/')?.id, 'detty');
});
