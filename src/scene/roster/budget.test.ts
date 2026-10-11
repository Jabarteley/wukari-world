// OWNER: scenes — the hero / crowd choice and the per-scene budget of roster figures.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CROWD_TRIANGLES, FIGURES_MAX, HERO_MAX, HERO_PLAYERS, HERO_TRIANGLES, LITE_FIGURES, TRIANGLES_MAX, createRosterBudget } from './budget.ts';

test('the player and other players get the hero model near the camera, regulars the crowd model', () => {
  const budget = createRosterBudget('full');
  assert.equal(budget.request('self'), 'hero');
  assert.equal(budget.request('peer'), 'hero');
  assert.equal(budget.request('npc'), 'crowd');
  assert.deepEqual(budget.used, { hero: 2, crowd: 1, triangles: 2 * HERO_TRIANGLES + CROWD_TRIANGLES });
});

test('the hero model goes to the player and the next two players only, and the figures never go over the scene\'s roster triangles', () => {
  const budget = createRosterBudget('full');
  const got = Array.from({ length: 12 }, () => budget.request('peer'));
  assert.equal(got.filter((detail) => detail === 'hero').length, HERO_PLAYERS, 'three heroes, the rest crowd or none');
  assert.ok(budget.used.triangles <= TRIANGLES_MAX && budget.used.hero <= HERO_MAX);
  assert.ok(got.includes(null), 'a crowd of players beyond the budget stays procedural');
  const own = createRosterBudget('full');
  assert.equal(own.request('self'), 'hero');
  assert.deepEqual([own.request('peer'), own.request('peer'), own.request('peer')], ['hero', 'hero', 'crowd'], 'the player and two others are heroes');
  const crowd = createRosterBudget('full');
  const npcs = Array.from({ length: 30 }, () => crowd.request('npc'));
  const fits = Math.min(FIGURES_MAX, Math.floor(TRIANGLES_MAX / CROWD_TRIANGLES));
  assert.equal(npcs.filter(Boolean).length, fits, 'a crowd of regulars is capped by the figure count and the triangle budget');
  assert.ok(crowd.used.triangles <= TRIANGLES_MAX);
  assert.equal(npcs[fits], null, 'beyond it the procedural figure stays');
  assert.ok(HERO_MAX * HERO_TRIANGLES > TRIANGLES_MAX, 'the triangle budget, not the hero count, is what binds');
});

test('a lite device has no hero model and only a few figures; releasing a figure makes room', () => {
  const budget = createRosterBudget('lite');
  assert.equal(budget.request('self'), 'crowd');
  const rest = Array.from({ length: 6 }, () => budget.request('peer'));
  assert.deepEqual(rest, ['crowd', 'crowd', 'crowd', null, null, null]);
  assert.equal(budget.used.crowd, LITE_FIGURES);
  budget.release('crowd');
  assert.equal(budget.request('npc'), 'crowd');
  assert.equal(budget.request('npc'), null);
  budget.release('hero');
  assert.ok(budget.used.hero === 0 && budget.used.triangles >= 0);
});
