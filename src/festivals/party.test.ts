// OWNER: social - owambe party rules: dress colours, titles, MC and DJ roles, the spray limits, the view a guest gets.
import test from 'node:test';
import assert from 'node:assert/strict';
import { COLOURS, PARTY, assignRole, cleanTitle, colourOf, isRole, maySpray, partyOn, partyView } from './party.ts';
import type { PartyRecord } from './party.ts';

const party = (change: Partial<PartyRecord> = {}): PartyRecord => ({ title: 'Tola’s owambe', colour: 'gold', startedAt: 1000, until: 1000 + PARTY.minutes * 60000, sprays: 0, ...change });

test('aso-ebi colours are unique, #rrggbb and findable; unknown ones are refused', () => {
  assert.equal(new Set(COLOURS.map((item) => item.id)).size, COLOURS.length);
  assert.ok(COLOURS.length >= 8);
  for (const item of COLOURS) assert.match(item.hex, /^#[0-9a-f]{6}$/i);
  assert.equal(colourOf('gold')?.label, 'Gold');
  assert.equal(colourOf('mauve'), null);
  assert.equal(colourOf(undefined), null);
});

test('a party title is plain, short, link-free; empty means the default', () => {
  assert.equal(cleanTitle(undefined), 'Owambe at my place');
  assert.equal(cleanTitle(''), 'Owambe at my place');
  assert.equal(cleanTitle('  Ada   turns 30  '), 'Ada turns 30');
  assert.equal(cleanTitle('x'.repeat(PARTY.title + 1)), null);
  assert.equal(cleanTitle('x'), null);
  assert.equal(cleanTitle('<b>hi</b>'), null);
  assert.equal(cleanTitle('come to www.example.com'), null);
  assert.equal(cleanTitle(42), null);
});

test('the party is on until its end time', () => {
  assert.equal(partyOn(party(), 1000 + 60000), true);
  assert.equal(partyOn(party(), party().until), false);
  assert.equal(partyOn(undefined, 5), false);
});

test('roles: only people inside, one role each, a role can be cleared, only mc and dj exist', () => {
  assert.ok(isRole('mc') && isRole('dj') && !isRole('host') && !isRole(undefined));
  const inside = ['ada', 'bola', 'chidi'];
  assert.deepEqual(assignRole({}, 'mc', 'ada', inside), { mc: 'ada' });
  assert.deepEqual(assignRole({ mc: 'ada' }, 'dj', 'bola', inside), { mc: 'ada', dj: 'bola' });
  assert.deepEqual(assignRole({ mc: 'ada' }, 'dj', 'ada', inside), { dj: 'ada' }, 'naming the MC as DJ takes the MC role away');
  assert.deepEqual(assignRole({ mc: 'ada', dj: 'bola' }, 'mc', 'chidi', inside), { mc: 'chidi', dj: 'bola' }, 'a new MC replaces the old one');
  assert.deepEqual(assignRole({ mc: 'ada', dj: 'bola' }, 'dj', null, inside), { mc: 'ada' });
  assert.ok('reason' in assignRole({}, 'mc', 'stranger', inside));
});

test('spraying is counted per guest and ends with the party; no money is involved', () => {
  const now = 2000;
  assert.deepEqual(maySpray(party(), 'ada', now), { ok: true });
  assert.equal(maySpray(party({ sprayed: { ada: PARTY.sprayPerGuest } }), 'ada', now).ok, false);
  assert.deepEqual(maySpray(party({ sprayed: { ada: PARTY.sprayPerGuest } }), 'bola', now), { ok: true });
  assert.equal(maySpray(party(), 'ada', party().until + 1).ok, false);
  assert.ok(!('amount' in (maySpray(party(), 'ada', now))), 'no amount: spraying here moves no money');
});

test('the view: the colour, the role holders still inside, and the sprays this viewer has left', () => {
  const card = (id: string) => ({ id, name: id });
  const view = partyView(party({ mc: 'ada', dj: 'gone', sprays: 3, sprayed: { bola: 2 } }), 'bola', (id) => (id === 'gone' ? null : card(id)));
  assert.equal(view.colour.hex, colourOf('gold')!.hex);
  assert.equal(view.mc?.id, 'ada');
  assert.equal(view.dj, null, 'a DJ who left holds no role');
  assert.equal(view.sprays, 3);
  assert.equal(view.sprayLeft, PARTY.sprayPerGuest - 2);
  assert.equal(partyView(party({ colour: 'mauve' }), 'ada', card).colour.id, COLOURS[0]!.id, 'a damaged colour falls back');
});
