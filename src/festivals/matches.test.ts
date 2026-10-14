// OWNER: growth - match nights: the generic weekly slot, the admin's fixture list and its validation (a schedule only, never a link or a score).
import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXTURE_LIMITS, MATCH_LIFT, WEEKLY, cleanFixture, crowdLift, fixtureList, matchNightAt, matchNights } from './matches.ts';
import { dayOfIso, localAt } from './calendar.ts';

const NOW = Date.UTC(2026, 9, 14, 12);
const day = (iso: string): number => dayOfIso(iso)!;
const good = { id: 'derby-1', title: 'Red v Blue', start: NOW + 3 * 86400000, minutes: 120, countries: ['NG'] };

test('the weekly slot: Saturday 8pm to 10pm local, in every country, at its own local time', () => {
  const week = (country: string) => matchNights(NOW, NOW + 7 * 86400000, country);
  assert.equal(week('ng').length, 1);
  assert.equal(week('ng')[0]!.start, localAt(day('2026-10-17'), 20, 'ng'), '17 October 2026 is a Saturday');
  assert.equal(week('ke')[0]!.start, localAt(day('2026-10-17'), 20, 'ke'));
  assert.notEqual(week('ke')[0]!.start, week('ng')[0]!.start);
  assert.equal(week('ng')[0]!.weekly, true);
  assert.equal(week('ng')[0]!.title, WEEKLY.title);
  assert.equal(matchNights(NOW, NOW + 86400000, 'ng').length, 0, 'none on a Wednesday');
});

test('a fixture shows in its countries only, soonest first, with the weekly slots', () => {
  const list = [{ ...good, countries: ['ng'] }, { id: 'cup-1', title: 'Gold v Green', start: NOW + 86400000, minutes: 90, countries: ['gh'] }];
  const ng = matchNights(NOW, NOW + 7 * 86400000, 'ng', list), gh = matchNights(NOW, NOW + 7 * 86400000, 'gh', list);
  assert.ok(ng.some((item) => item.title === 'Red v Blue') && !ng.some((item) => item.title === 'Gold v Green'));
  assert.ok(gh.some((item) => item.title === 'Gold v Green') && !gh.some((item) => item.title === 'Red v Blue'));
  for (let i = 1; i < ng.length; i++) assert.ok(ng[i - 1]!.start <= ng[i]!.start);
  const everywhere = matchNights(NOW, NOW + 7 * 86400000, 'za', [{ ...good, countries: [] }]);
  assert.ok(everywhere.some((item) => item.title === 'Red v Blue'), 'no countries = every country');
});

test('a match night is live during the fixture and lifts the crowd; before and after it does not', () => {
  const list = [{ ...good, countries: [] }];
  assert.equal(matchNightAt(good.start - 1, 'ng', list), null);
  assert.equal(matchNightAt(good.start, 'ng', list)?.title, 'Red v Blue');
  assert.equal(crowdLift(good.start + 60000, 'ng', list), MATCH_LIFT);
  assert.equal(crowdLift(good.start + 120 * 60000, 'ng', list), 0);
  const saturday = localAt(day('2026-10-17'), 21, 'ng');
  assert.equal(crowdLift(saturday, 'ng'), MATCH_LIFT, 'the weekly slot lifts it too');
  assert.equal(crowdLift(saturday - 5 * 3600000, 'ng'), 0);
});

test('fixture checks: id, plain title, a time inside the next year, a length, country codes; no links, streams or scores', () => {
  const ok = cleanFixture(good, NOW);
  assert.ok(ok.ok && ok.fixture.countries[0] === 'ng');
  assert.equal(cleanFixture({ ...good, minutes: undefined }, NOW).ok, true);
  const refused = (change: object) => cleanFixture({ ...good, ...change }, NOW);
  for (const change of [{ id: 'X' }, { id: '' }, { title: 'ab' }, { title: 'x'.repeat(FIXTURE_LIMITS.title + 1) }, { title: 'Red v Blue <b>' }, { title: 'Watch free at example.com' }, { title: 'Red v Blue https://x.y' }, { title: 'Red v Blue live stream' }, { title: 'Red v Blue final score 2-1' },
    { start: NOW - 3 * 86400000 }, { start: NOW + 500 * 86400000 }, { start: 'tomorrow' }, { start: 1.5 }, { minutes: 10 }, { minutes: 400 }, { minutes: 90.5 }, { countries: 'ng' }, { countries: ['nigeria'] }, { countries: new Array(9).fill('ng') }]) assert.equal(refused(change).ok, false, JSON.stringify(change));
  assert.equal(cleanFixture(null, NOW).ok, false);
});

test('the stored list is repaired: bad rows and repeats dropped, old ones forgotten, at most the limit', () => {
  const rows = [good, good, { ...good, id: 'bad id' }, 'junk', null, { ...good, id: 'old-one', start: NOW - 30 * 86400000 }];
  assert.deepEqual(fixtureList(rows, NOW).map((item) => item.id), ['derby-1']);
  assert.deepEqual(fixtureList('nope', NOW), []);
  const many = Array.from({ length: FIXTURE_LIMITS.keep + 20 }, (_, i) => ({ ...good, id: `fixture-${i + 100}`, start: NOW + 86400000 }));
  assert.equal(fixtureList(many, NOW).length, FIXTURE_LIMITS.keep);
});
