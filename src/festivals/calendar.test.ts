// OWNER: growth - the festival calendar: multi-day spans, country matching, the lunar table, the dressing decision, main events.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FESTIVALS, LUNAR, activeFestivals, dayNo, dayOfIso, dressingFor, easterDay, festivalList, isoOfDay, localAt, mainOccurrences, nextSpan, noticeLine, spansOf } from './calendar.ts';
import { cleanFestival } from './custom.ts';

/** Server ms of noon UTC on a date: inside the same local day in every country the calendar names. */
const noon = (iso: string): number => dayOfIso(iso)! * 86400000 + 12 * 3600000;
const ids = (iso: string, country: string, extras = {}): string[] => activeFestivals(noon(iso), country, extras).map((item) => item.id);

test('every festival runs at least three days wherever its rule falls, in every year of the table', () => {
  for (const def of FESTIVALS) {
    for (const year of [2025, 2026, 2027, 2028]) {
      for (const span of spansOf(def.rule, year)) {
        assert.ok(span.end - span.start + 1 >= 3, `${def.id} ${year} runs ${span.end - span.start + 1} days`);
        assert.ok(span.focal >= span.start && span.focal <= span.end, `${def.id} ${year}: the main day is inside the run`);
      }
    }
  }
});

test('the built-in table is well formed: unique ids, two #rrggbb colours, hours in order, only known countries', () => {
  assert.equal(new Set(FESTIVALS.map((item) => item.id)).size, FESTIVALS.length);
  for (const def of FESTIVALS) {
    assert.ok(def.colours.every((colour) => /^#[0-9a-f]{6}$/i.test(colour)), def.id);
    assert.ok(def.main.from >= 0 && def.main.to <= 24 && def.main.to > def.main.from, def.id);
    assert.ok(def.countries.every((country) => country === '*' || ['ng', 'gh', 'ke', 'za'].includes(country)), def.id);
    assert.equal(def.main.host, null, 'no house agent hosts yet (Phase 10 hook)');
  }
});

test('countries match: each country sees its own national days, not the others', () => {
  assert.deepEqual(ids('2026-10-01', 'ng'), ['ng-independence']);
  assert.deepEqual(ids('2026-10-01', 'gh'), []);
  assert.ok(ids('2027-03-06', 'gh').includes('gh-independence'));
  assert.ok(!ids('2027-03-06', 'ng').includes('gh-independence'));
  assert.ok(ids('2026-06-01', 'ke').includes('ke-madaraka'));
  assert.ok(ids('2026-10-20', 'ke').includes('ke-mashujaa'));
  assert.ok(ids('2026-12-12', 'ke').includes('ke-jamhuri'));
  assert.ok(ids('2026-04-27', 'za').includes('za-freedom'));
  assert.ok(ids('2026-09-24', 'za').includes('za-heritage'));
  assert.ok(ids('2026-12-16', 'za').includes('za-reconciliation'));
  assert.ok(ids('2026-06-12', 'ng').includes('ng-democracy'));
  assert.ok(ids('2026-07-01', 'gh').includes('gh-republic'));
  assert.ok(ids('2026-08-29', 'gh').includes('gh-homowo'));
  // Global festivals reach every country, named by code or by the older name of the city rules.
  for (const country of ['ng', 'gh', 'ke', 'za', 'nigeria', 'fr', 'xx']) assert.ok(ids('2026-12-25', country).includes('christmas'), country);
  assert.ok(ids('2027-02-14', 'ng').includes('valentines'));
  assert.ok(ids('2027-01-01', 'za').includes('new-year'));
});

test('a window across New Year works: Detty December, 15 December to 2 January, and New Year on 31 December', () => {
  assert.ok(ids('2026-12-15', 'ng').includes('ng-detty-december'));
  assert.ok(ids('2027-01-02', 'ng').includes('ng-detty-december'));
  assert.ok(!ids('2027-01-03', 'ng').includes('ng-detty-december'));
  assert.ok(!ids('2026-12-14', 'ng').includes('ng-detty-december'));
  assert.ok(!ids('2026-12-20', 'gh').includes('ng-detty-december'));
  assert.ok(ids('2026-12-31', 'ng').includes('new-year'));
  assert.ok(ids('2027-01-02', 'ng').includes('new-year'));
  const detty = activeFestivals(noon('2027-01-01'), 'ng').find((item) => item.id === 'ng-detty-december')!;
  assert.equal(isoOfDay(detty.span.start), '2026-12-15');
  assert.equal(isoOfDay(detty.span.end), '2027-01-02');
  assert.equal(detty.days, 19);
  assert.equal(detty.dayOf, 18);
});

test('every time zone sees a festival: each country has it on from local midnight of the first day to the last minute of the last', () => {
  for (const [country, iso, id] of [['ng', '2026-10-01', 'ng-independence'], ['gh', '2027-03-06', 'gh-independence'], ['ke', '2026-10-20', 'ke-mashujaa'], ['za', '2026-09-24', 'za-heritage']] as const) {
    const focal = dayOfIso(iso)!;
    for (const from of [focal - 1, focal, focal + 1]) {
      const until = from;
      for (const hour of [0, 6, 12, 18, 23.9]) assert.ok(activeFestivals(localAt(from, hour, country), country).some((item) => item.id === id), `${country} ${isoOfDay(until)} ${hour}`);
    }
    assert.ok(!activeFestivals(localAt(focal - 1, 0, country) - 60000, country).some((item) => item.id === id), `${country} the minute before`);
    assert.ok(!activeFestivals(localAt(focal + 2, 0, country), country).some((item) => item.id === id), `${country} the day after`);
  }
  // Midnight local in Nairobi (UTC+3) starts the local day there.
  const kenyaMidnight = localAt(dayOfIso('2026-06-01')!, 0, 'ke');
  assert.ok(activeFestivals(kenyaMidnight, 'ke').some((item) => item.id === 'ke-madaraka' && item.focalToday));
  assert.ok(!activeFestivals(kenyaMidnight - 1, 'ke').some((item) => item.id === 'ke-madaraka' && item.focalToday));
});

test('Easter is computed: the known Sundays, and Good Friday to Easter Monday', () => {
  assert.equal(isoOfDay(easterDay(2026)), '2026-04-05');
  assert.equal(isoOfDay(easterDay(2027)), '2027-03-28');
  assert.equal(isoOfDay(easterDay(2028)), '2028-04-16');
  assert.equal(isoOfDay(easterDay(2025)), '2025-04-20');
  assert.ok(ids('2026-04-03', 'ng').includes('easter'));
  assert.ok(ids('2026-04-06', 'ng').includes('easter'));
  assert.ok(!ids('2026-04-07', 'ng').includes('easter'));
  assert.ok(!ids('2026-04-02', 'ng').includes('easter'));
});

test('the lunar table: exact rows for 2026 to 2028, Eid inside Ramadan\'s end, nothing guessed after the table', () => {
  const row = (table: typeof LUNAR.ramadan, year: number) => table[year]!;
  assert.deepEqual(row(LUNAR.ramadan, 2026), ['2026-02-18', '2026-03-19', '2026-02-18']);
  assert.deepEqual(row(LUNAR.eidFitr, 2026), ['2026-03-19', '2026-03-22', '2026-03-20']);
  assert.deepEqual(row(LUNAR.eidAdha, 2026), ['2026-05-26', '2026-05-29', '2026-05-27']);
  assert.equal(row(LUNAR.eidFitr, 2027)[2], '2027-03-09');
  assert.equal(row(LUNAR.eidAdha, 2027)[2], '2027-05-16');
  assert.equal(row(LUNAR.ramadan, 2028)[0], '2028-01-28');
  assert.equal(row(LUNAR.eidFitr, 2028)[2], '2028-02-26');
  assert.equal(row(LUNAR.eidAdha, 2028)[2], '2028-05-05');
  for (const year of [2026, 2027, 2028]) {
    const ramadan = row(LUNAR.ramadan, year), fitr = row(LUNAR.eidFitr, year), adha = row(LUNAR.eidAdha, year);
    assert.ok(dayOfIso(fitr[2])! - dayOfIso(ramadan[0])! >= 28 && dayOfIso(fitr[2])! - dayOfIso(ramadan[0])! <= 30, `Ramadan is 29 or 30 days long in ${year}`);
    assert.ok(dayOfIso(ramadan[1])! >= dayOfIso(fitr[0])! - 1, 'Ramadan runs up to Eid al-Fitr');
    for (const [start, end, focal] of [ramadan, fitr, adha]) assert.ok(dayOfIso(start)! <= dayOfIso(focal)! && dayOfIso(focal)! <= dayOfIso(end)!);
    // Eid al-Adha is about 70 days after Eid al-Fitr.
    assert.ok(dayOfIso(adha[2])! - dayOfIso(fitr[2])! >= 68 && dayOfIso(adha[2])! - dayOfIso(fitr[2])! <= 71, String(year));
  }
  assert.ok(ids('2027-03-09', 'ng').includes('eid-fitr'));
  assert.ok(ids('2027-02-20', 'ke').includes('ramadan'));
  assert.ok(!ids('2029-03-01', 'ng').includes('ramadan'), 'past the table there is no festival rather than a guessed one');
  assert.equal(nextSpan(FESTIVALS.find((item) => item.id === 'eid-fitr')!, noon('2028-03-10')), null);
});

test('faiths are treated alike: the Christian and Muslim festivals share countries, shape and wording', () => {
  const christian = FESTIVALS.filter((item) => ['christmas', 'easter'].includes(item.id)), muslim = FESTIVALS.filter((item) => ['eid-fitr', 'eid-adha', 'ramadan'].includes(item.id));
  assert.equal(christian.length, 2); assert.equal(muslim.length, 3);
  for (const def of [...christian, ...muslim]) {
    assert.deepEqual(def.countries, ['*'], def.id);
    assert.equal(def.main.what, 'at the Square');
    assert.ok(def.blurb.length > 20 && def.blurb.length < 140);
    assert.ok(def.main.to - def.main.from >= 2 && def.main.to - def.main.from <= 4);
  }
  // Two festivals that overlap are ordered only by distance from their main day, then by id: never by faith.
  const both = activeFestivals(noon('2027-03-08'), 'ng').map((item) => item.id);
  assert.ok(both.includes('eid-fitr') && both.includes('ramadan'));
  const sorted = activeFestivals(noon('2027-03-08'), 'ng');
  for (let i = 1; i < sorted.length; i++) assert.ok(Math.abs(dayNo(2027, 3, 8) - sorted[i - 1]!.span.focal) <= Math.abs(dayNo(2027, 3, 8) - sorted[i]!.span.focal));
});

test('overlapping festivals never break anything: every day of 2026 to 2028 in every country lists them in a stable order with one dressing', () => {
  for (const country of ['ng', 'gh', 'ke', 'za', 'gb']) {
    let busiest = 0;
    for (let day = dayNo(2026, 1, 1); day <= dayNo(2028, 12, 31); day += 1) {
      const list = activeFestivals(day * 86400000 + 36000000, country);
      busiest = Math.max(busiest, list.length);
      assert.equal(new Set(list.map((item) => item.id)).size, list.length);
      const dressing = dressingFor(day * 86400000 + 36000000, country);
      assert.equal(dressing?.id ?? null, list[0]?.id ?? null);
      for (const item of list) assert.ok(item.dayOf >= 1 && item.dayOf <= item.days);
    }
    assert.ok(busiest >= 2 && busiest <= 6, `${country}: ${busiest}`);
  }
});

test('the dressing decision: the festival nearest its main day wins, none outside a run, colours come from the festival', () => {
  assert.equal(dressingFor(noon('2026-10-14'), 'ng'), null, 'no festival in mid October');
  assert.equal(dressingFor(noon('2026-10-01'), 'ng')!.id, 'ng-independence');
  assert.deepEqual(dressingFor(noon('2026-10-01'), 'ng'), { id: 'ng-independence', name: 'Independence Day', colour: '#008751', second: '#ffffff' });
  // 18 December: Detty December only; 25 December: Christmas is nearer its main day than Detty December is to its own.
  assert.equal(dressingFor(noon('2026-12-18'), 'ng')!.id, 'ng-detty-december');
  assert.equal(dressingFor(noon('2026-12-25'), 'ng')!.id, 'christmas');
  assert.equal(dressingFor(noon('2026-12-18'), 'gh')?.id ?? null, null);
  assert.equal(dressingFor(Number.NaN, 'ng'), null);
});

test('main events: a focal-day event at its local hour, a daily one on every day of the run, none outside', () => {
  const week = mainOccurrences(noon('2026-09-28'), noon('2026-10-05'), 'ng');
  const independence = week.filter((item) => item.id === 'ng-independence');
  assert.equal(independence.length, 1, 'one on the focal day');
  assert.equal(independence[0]!.start, localAt(dayOfIso('2026-10-01')!, 17, 'ng'));
  assert.equal(independence[0]!.end, localAt(dayOfIso('2026-10-01')!, 20, 'ng'));
  assert.equal(independence[0]!.host, null);
  assert.equal(independence[0]!.key, 'fest:ng-independence:2026-10-01');
  const ramadan = mainOccurrences(noon('2027-02-08'), noon('2027-02-13'), 'ng').filter((item) => item.id === 'ramadan');
  assert.equal(ramadan.length, 5, 'iftar evening every day');
  assert.ok(ramadan.every((item) => item.end - item.start === 3 * 3600000));
  // The same moment is a different local hour in each country: Accra's evening is Nairobi's night.
  const ghana = mainOccurrences(noon('2027-03-05'), noon('2027-03-08'), 'gh').find((item) => item.id === 'gh-independence')!;
  assert.equal(ghana.start, localAt(dayOfIso('2027-03-06')!, 17, 'gh'));
  assert.deepEqual(mainOccurrences(noon('2026-10-14'), noon('2026-10-20'), 'ng'), []);
  assert.deepEqual(mainOccurrences(5, 5, 'ng'), []);
  const live = mainOccurrences(localAt(dayOfIso('2026-10-01')!, 18, 'ng'), localAt(dayOfIso('2026-10-01')!, 19, 'ng'), 'ng')[0]!;
  assert.equal(live.live, true);
});

test('the notice line says the day of the run, or today', () => {
  const active = activeFestivals(noon('2027-03-09'), 'ng').find((item) => item.id === 'eid-fitr')!;
  assert.equal(noticeLine(active), 'Eid al-Fitr today');
  const before = activeFestivals(noon('2027-03-08'), 'ng').find((item) => item.id === 'eid-fitr')!;
  assert.equal(noticeLine(before), 'Eid al-Fitr, day 1 of 4');
});

test('an admin can add a festival, replace a built-in one (fix a moon-sighting date) and hide one', () => {
  const made = cleanFestival({ id: 'eid-fitr', name: 'Eid al-Fitr', blurb: 'Announced a day late.', countries: ['ng'], start: '2027-03-10', end: '2027-03-12', focal: '2027-03-11', colours: ['#1B7F5C', '#E9C46A'], main: { from: 17, to: 20 } });
  assert.ok(made.ok);
  const extras = { festivals: [made.ok ? made.festival : (undefined as never)] };
  assert.ok(ids('2027-03-11', 'ng', extras).includes('eid-fitr'));
  assert.ok(!ids('2027-03-09', 'ng', extras).includes('eid-fitr'), 'the built-in dates are replaced');
  assert.ok(!ids('2027-03-11', 'gh', extras).includes('eid-fitr'), 'the replacement names only Nigeria');
  assert.equal(festivalList(extras).filter((item) => item.id === 'eid-fitr').length, 1);
  assert.ok(!ids('2026-10-01', 'ng', { hidden: ['ng-independence'] }).includes('ng-independence'));
  const mine = cleanFestival({ id: 'harvest-fair', name: 'Harvest fair', blurb: 'Stalls, music and food.', countries: ['ke', 'GH'], start: '2026-11-06', end: '2026-11-09', colours: ['#aa5500', '#ffcc00'], main: { from: 12, to: 16, daily: true } });
  assert.ok(mine.ok);
  assert.deepEqual(mine.ok && mine.festival.countries, ['ke', 'gh']);
  const withMine = { festivals: [mine.ok ? mine.festival : (undefined as never)] };
  assert.equal(mainOccurrences(noon('2026-11-06'), noon('2026-11-10'), 'ke', withMine).filter((item) => item.id === 'harvest-fair').length, 4);
});

test('custom festival checks: three days at least, two colours, dates real, no links, hours in order', () => {
  const good = { id: 'harvest-fair', name: 'Harvest fair', blurb: 'Stalls and music.', start: '2026-11-06', end: '2026-11-09', colours: ['#aa5500', '#ffcc00'], main: { from: 12, to: 16 } };
  assert.ok(cleanFestival(good).ok);
  for (const [bad, why] of [[{ ...good, end: '2026-11-07' }, 'two days'], [{ ...good, end: '2027-03-01' }, 'too long'], [{ ...good, start: '2026-02-30' }, 'not a date'], [{ ...good, focal: '2026-12-01' }, 'main day outside'],
    [{ ...good, colours: ['red', '#ffffff'] }, 'colour'], [{ ...good, colours: ['#ffffff'] }, 'one colour'], [{ ...good, blurb: 'See https://example.com' }, 'link'], [{ ...good, main: { from: 16, to: 12 } }, 'hours'], [{ ...good, id: 'A' }, 'id'],
    [{ ...good, name: '<b>x</b>' }, 'markup'], [{ ...good, countries: ['nigeria'] }, 'countries'], [{ ...good, countries: [] }, 'no countries']] as const) assert.equal(cleanFestival(bad).ok, false, why);
  assert.equal(cleanFestival(null).ok, false);
});
