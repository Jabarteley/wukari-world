// Pure clan, ladder, league and war rules (docs/CLANS.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { CLAN, cleanClanName, cleanCode, codeFrom, joinBlock, kickBlock, roleChange, withoutMember, nameKey } from './clan.ts';
import { LADDER, TIER_BASE, applyPoints, bestOfDay, chooseCohort, floorOf, pointsFor, rankName, seasonAt, softReset, tierOf } from './ladder.ts';
import { cityScore, rollupCity, weekWinner, gistLine } from './league.ts';
import { counted, matchClan, outcomeOf, ratings, warScore } from './war.ts';

const clan = () => ({ leader: 'a', deputies: ['b'], members: ['a', 'b', 'c'] });

test('clan names: shape, codes, uniqueness key', () => {
  assert.equal(cleanClanName('  Eko   Lions '), 'Eko Lions');
  for (const bad of ['ab', 'x'.repeat(21), '<b>hi</b>', '123', 'www.x.com!', 42]) assert.equal(cleanClanName(bad), null, String(bad));
  assert.equal(nameKey('Eko  Lions'), nameKey('eko-lions'));
  assert.equal(cleanCode('abc-def'), 'ABCDEF'); assert.equal(cleanCode('ABCDEI'), null); assert.equal(cleanCode('ABC'), null);
  assert.equal(codeFrom([0, 1, 2, 3, 4, 5]).length, CLAN.codeLength);
});
test('joining, kicking, roles and leaving', () => {
  const c = clan();
  assert.equal(joinBlock(c, { id: 'z', agent: false }, false, 0, 25), null);
  assert.equal(joinBlock(c, { id: 'z', agent: false }, true, 0, 25)?.code, 'already_in_clan');
  assert.equal(joinBlock(c, { id: 'z', agent: false }, false, 0, 3)?.code, 'clan_full');
  assert.equal(joinBlock({ ...c, kicked: { z: 100 } }, { id: 'z', agent: false }, false, 50, 25)?.code, 'recently_removed');
  assert.equal(joinBlock({ ...c, kicked: { z: 100 } }, { id: 'z', agent: false }, false, 150, 25), null);
  assert.equal(kickBlock(c, 'b', 'c')?.code, 'leader_only'); assert.equal(kickBlock(c, 'a', 'c'), null); assert.equal(kickBlock(c, 'a', 'q')?.code, 'not_member');
  const r = roleChange(c, 'a', 'c', 'deputy', false); assert.ok(r.ok && r.clan.deputies.length === 2);
  assert.equal(roleChange(r.ok ? { ...r.clan, members: [...r.clan.members, 'd'] } : c, 'a', 'd', 'deputy', false).ok, false, 'two deputies at most');
  assert.equal((roleChange(c, 'a', 'c', 'leader', true) as { code: string }).code, 'agent_role');
  const lead = roleChange(c, 'a', 'c', 'leader', false); assert.ok(lead.ok && lead.clan.leader === 'c' && lead.clan.deputies.includes('a'));
  const gone = withoutMember(c, 'a', new Set()); assert.equal(gone?.leader, 'b'); assert.deepEqual(gone?.deputies, []);
  assert.equal(withoutMember({ leader: 'a', deputies: [], members: ['a'] }, 'a', new Set()), null);
  assert.equal(withoutMember({ leader: 'a', deputies: [], members: ['a', 'bot'] }, 'a', new Set(['bot'])), null, 'an AI cannot inherit');
  assert.ok((withoutMember(c, 'c', new Set(), 99)?.kicked?.['c'] ?? 0) === 99);
});
test('ladder: asymmetric points, floors, top-tier rating', () => {
  assert.equal(pointsFor(0, 1, 0), 30); assert.equal(pointsFor(0, 0, 0), -12); assert.equal(pointsFor(0, 0.5, 0), 0);
  assert.equal(tierOf(299), 0); assert.equal(tierOf(300), 1); assert.equal(rankName(0), 'Bronze III'); assert.equal(rankName(250), 'Bronze I'); assert.equal(rankName(1600), 'Master');
  const top = TIER_BASE[5] ?? 0;
  assert.ok(pointsFor(top, 1, top) === 12 && pointsFor(top, 0, top) === -12); assert.ok(pointsFor(top, 1, top + 400) > pointsFor(top, 1, top - 400));
  assert.equal(applyPoints(305, -12, 1), 300, 'tier floor'); assert.equal(applyPoints(300, -12, 1), 300); assert.equal(floorOf(9), TIER_BASE[5]);
  assert.equal(applyPoints(10, -12, 0), 0);
});
test('ladder: soft reset drops one or two sub-tiers and never reaches zero', () => {
  assert.equal(softReset(0), LADDER.resetMin); assert.equal(softReset(150), 50); assert.equal(softReset(450), 300);
  assert.equal(softReset(620), 400); assert.equal(softReset(2000), 1300); // Master drops two sub-tiers
  for (let p = 0; p < 2500; p += 7) assert.ok(softReset(p) > 0 && softReset(p) <= p || p < LADDER.resetMin, String(p));
});
test('ladder: only the best 10 matches a day count', () => {
  let day: number[] = [], total = 0;
  for (let i = 0; i < 10; i++) { const r = bestOfDay(day, -12); day = r.day; total += r.net; }
  assert.equal(total, -120);
  const w = bestOfDay(day, 30); assert.deepEqual([w.counted, w.net], [true, 42]);
  const l = bestOfDay(w.day, -12); assert.deepEqual([l.counted, l.net], [false, 0], 'an 11th loss is not counted');
  let vol = [] as number[], sum = 0; for (let i = 0; i < 40; i++) { const r = bestOfDay(vol, 30); vol = r.day; sum += r.net; }
  assert.equal(sum, 300, 'volume does not pay past ten');
});
test('seasons and cohorts', () => {
  assert.deepEqual(seasonAt(100, 100, 28), { n: 1, start: 100, end: 128 }); assert.equal(seasonAt(128, 100, 28).n, 2); assert.equal(seasonAt(99, 100, 28).n, 1);
  assert.equal(chooseCohort([], 5), null);
  assert.equal(chooseCohort([['a', 5, 20], ['b', 5, 40]], 5), 'b', 'same hour, fullest with room');
  assert.equal(chooseCohort([['a', 5, 50]], 5), null, 'full');
  assert.equal(chooseCohort([['a', 7, 10]], 5), 'a', 'a small one nearby is filled first');
  assert.equal(chooseCohort([['a', 7, 35]], 5), null); assert.equal(chooseCohort([['a', 20, 10]], 5), null);
});
test('city league roll-up and winners', () => {
  assert.equal(rollupCity('lagos', 'london'), 'lagos', 'the home pin counts'); assert.equal(rollupCity(null, 'london'), 'london'); assert.equal(rollupCity(undefined, null), 'lagos');
  assert.equal(cityScore([5, 9, -3, 1]), 15); assert.equal(cityScore(Array.from({ length: 30 }, () => 1)), 20, 'best 20 only');
  assert.equal(weekWinner([{ id: 'lagos', score: 90, players: 20 }, { id: 'accra', score: 70, players: 9 }])?.id, 'lagos');
  assert.equal(weekWinner([{ id: 'lagos', score: 90, players: 20 }]), null, 'no contest');
  assert.equal(weekWinner([{ id: 'lagos', score: 90, players: 20 }, { id: 'accra', score: 90, players: 9 }]), null, 'a tie');
  assert.equal(weekWinner([{ id: 'lagos', score: 90, players: 20 }, { id: 'accra', score: 200, players: 2 }]), null, 'too few players do not count');
  assert.equal(gistLine('Lagos', 'football'), 'Lagos took the week in football.');
});
test('clan war: top 80% and matching', () => {
  assert.equal(counted(25), 20); assert.equal(counted(5), 4); assert.equal(counted(1), 1);
  assert.deepEqual(warScore([10, 10, 10, 10, 0]), { score: 40, used: 4 }, 'the quietest 20% is left out');
  assert.equal(warScore([100, 0, 0, 0, 0]).score, 100); assert.equal(warScore([-30, -5]).score, 0);
  const pool = [['x', 25, 1000], ['y', 10, 1000], ['z', 24, 1300]] as const;
  assert.equal(matchClan(pool, ['m', 24, 1010])?.[0], 'x'); assert.equal(matchClan([['y', 8, 1000]], ['m', 25, 1000]), null, 'too different in size');
  assert.equal(outcomeOf(3, 2), 'win'); const [a, b] = ratings(1000, 1000, 'win'); assert.deepEqual([a, b], [1012, 988]);
});
