// Street life's liveries (./livery.ts): a small table by country id, a default for the rest, keke where a country has them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LIVERY, LIVERIES, countryKey, liveryFor, paintTraffic } from './livery.ts';
import { CAR_LENGTH, planTraffic } from './plan.ts';
import type { Road } from './plan.ts';

const road: Road = { ax: -84, az: 6.875, bx: 84, bz: 6.875, speed: 5.5 };
const hex = /^#[0-9a-f]{6}$/;

test('the table: yellow cabs in the US, black cabs in Britain, green and white keke in Nigeria; anything else the default', () => {
  assert.equal(liveryFor('us').taxi[0]!.body, '#f7c600');
  assert.equal(liveryFor('gb').taxi[0]!.body, '#17191c');
  assert.equal(liveryFor('gb').bus[0]!.body, '#c8102e');
  assert.ok(liveryFor('ng').trike!.some((p) => p.body === '#2f8f4e' && p.trim === '#f4f4ef'));
  assert.equal(liveryFor('NG'), LIVERIES.ng);
  assert.equal(liveryFor('nigeria'), LIVERIES.ng, "Nigeria's old id");
  assert.equal(countryKey(' Gb '), 'gb');
  for (const unknown of ['zz', '', null, undefined]) assert.equal(liveryFor(unknown), DEFAULT_LIVERY);
  for (const livery of [...Object.values(LIVERIES), DEFAULT_LIVERY]) for (const paint of [...livery.taxi, ...livery.bus, ...(livery.trike ?? [])]) assert.ok(hex.test(paint.body) && hex.test(paint.trim));
});

test('painting: taxis and buses take the livery, a share of cars become keke (shorter, so nothing touches), the same every time', () => {
  const vehicles = planTraffic('p', [road], 12);
  const ng = paintTraffic(vehicles, 'ng', 'p'), gb = paintTraffic(vehicles, 'gb', 'p');
  assert.deepEqual(paintTraffic(vehicles, 'ng', 'p'), ng);
  assert.equal(ng.length, vehicles.length);
  ng.forEach((v, i) => {
    const was = vehicles[i]!;
    assert.equal(v.offset, was.offset); assert.equal(v.road, was.road);
    assert.ok(v.length <= was.length, 'never longer than what was planned there');
    if (v.kind === 'keke') assert.equal(was.kind, 'car');
    if (v.kind === 'taxi') assert.ok(LIVERIES.ng!.taxi.some((p) => p.body === v.colour) && v.sign);
  });
  assert.ok(gb.every((v) => v.kind !== 'keke'), 'no keke in London');
  assert.ok(gb.filter((v) => v.kind === 'taxi').every((v) => v.colour === '#17191c'));
  const many = paintTraffic(planTraffic('q', [{ ...road, bx: 2000 }], 12), 'ng', 'q');
  assert.ok(many.some((v) => v.kind === 'keke' && v.length < CAR_LENGTH), 'keke on a Nigerian street');
});
