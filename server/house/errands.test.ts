// OWNER: agents — the templates of agent missions (server/house/errands.ts): they fill in from a life, different lives get different tasks, rewards stay inside
// the mission limits, every brief passes the AI word rules, and the model's rephrasing is held to the written brief's tokens.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadCityContent } from '../../src/game/cities/registry.ts';
import { createLife } from '../../src/life.ts';
import { makeContext } from '../../src/game/util.ts';
import { MISSION_REWARDS } from '../../src/game/content/missions.ts';
import { INGREDIENTS } from '../../src/game/content/food.ts';
import { agentWords } from '../moderation/agent-words.ts';
import { castOf } from './cast.ts';
import type { Role } from './cast.ts';
import { TEMPLATES, briefPrompt, cleanBrief, offerFor, profileOf, sayBrief, tokensOf, writtenBrief } from './errands.ts';
import type { AgentRef, Profile, Template } from './errands.ts';
import type { LifeState } from '../../src/types/life.ts';

await loadCityContent('lagos');
const NOW = Date.UTC(2026, 0, 5, 8);
const refOf = (spec: ReturnType<typeof castOf>[number], city = 'lagos'): AgentRef => ({ id: `house.${city}.${spec.key}`, key: spec.key, name: spec.name, role: spec.role, voice: spec.voice, card: spec.card, city,
  venue: spec.post[0] ?? 'market', place: (spec.post[0] ?? 'market').replace(/-/g, ' '), hours: '10 AM to 5 PM' });
const CAST = castOf('lagos').map((spec) => refOf(spec));
const byKey = (key: string): AgentRef => CAST.find((agent) => agent.key === key)!;
const life = (saved: Record<string, unknown> = {}): LifeState => { const state = createLife({ cash: 5000, ...saved }, makeContext({ now: NOW, cityId: 'lagos', seed: 'e', actionId: 'e' })); state.t = NOW; return state; };
const profile = (over: Partial<Profile> = {}): Profile => ({ city: 'lagos', cityName: 'Lagos', job: null, band: 'steady', friends: 0, seen: 0, tables: 0, stall: false, kitchen: {}, seed: 7, day: 20458, week: 2922, ...over });

// Two different lives: a tech worker with money, friends, a stall and a table habit; and a newcomer with nothing.
const regular = (): Profile => profileOf(life({ cash: 40000, job: 'tech', business: { opened: 1 }, growth: { tables: { played: 12 } }, social: { rel: { '11111111-2222-4333-8444-555555555555': { p: 20, d: 0, n: 0, npc: false, at: NOW, name: 'Bola', friend: true } } }, missions: { seed: 11, visited: { week: 2922, list: ['lagos:market', 'lagos:park', 'lagos:library', 'lagos:cchub', 'lagos:office', 'lagos:rooftop', 'lagos:palms'] } } }), NOW, 'Lagos');
const newcomer = (): Profile => profileOf(life({ cash: 300, missions: { seed: 5 } }), NOW, 'Lagos');

test('a life is read into a profile: job, money band, friends, stall, tables, places and the kitchen', () => {
  const a = regular(), b = newcomer();
  assert.deepEqual([a.job, a.band, a.friends, a.stall, a.tables, a.seen], ['Tech', 'comfortable', 1, true, 12, 7]);
  assert.deepEqual([b.job, b.band, b.friends, b.stall, b.tables, b.seen], [null, 'lean', 0, false, 0, 0]);
  assert.equal(profileOf(life({ cash: 5000 }), NOW, 'Lagos').band, 'steady');
});

test('templates are filled in from the life: names, places, the job and the city are in the words, and no token is left over', () => {
  const peers = CAST.filter((agent) => agent.key !== 'ade');
  const work = offerFor(regular(), byKey('ade'), peers, ['greet', 'newhere', 'stallswap', 'fetchbig', 'friend', 'tableweek', 'table', 'stallask']);
  assert.equal(work?.template.id, 'work', 'with everything else taken, a tech worker is asked about their job');
  assert.match(work!.label, /^Tell .+ you work in tech$/);
  assert.match(sayBrief(work!, null, 'pidgin'), /Lagos/);
  assert.doesNotMatch(sayBrief(work!, null, 'pidgin'), /[{}]/);
  const fetch = offerFor(regular(), byKey('tolani'), peers, ['greet', 'fetchsmall', 'friend', 'table']);
  assert.equal(fetch?.template.id, 'fetchbig');
  const item = INGREDIENTS[String(fetch!.entry['item'])]!;
  assert.equal(fetch!.entry['units'], item.pack);
  assert.match(fetch!.label, new RegExp(`Bring ${item.pack} ${item.label.toLowerCase()} to Mama Tolani`));
  assert.ok((fetch!.entry['cash'] as number) >= item.price, 'the reward covers the pack that is asked for');
});

test('two lives with different jobs, cities, money and progress get different tasks from the same agents on the same day', () => {
  const peers = CAST.filter((agent) => agent.key !== 'ade');
  const a = regular(), b = newcomer(), c = profile({ job: 'banking', band: 'steady', friends: 2, seed: 99, cityName: 'Lagos' });
  const seen = new Map<string, Set<string>>();
  for (const [name, who] of [['regular', a], ['newcomer', b], ['banker', c]] as const) {
    for (const giver of [byKey('ade'), byKey('tolani'), byKey('tunji'), byKey('kofo')]) {
      const offer = offerFor(who, giver, peers.filter((agent) => agent.id !== giver.id));
      assert.ok(offer, `${name} gets something from ${giver.key}`);
      (seen.get(name) ?? seen.set(name, new Set()).get(name)!).add(`${giver.key}:${offer.template.id}:${offer.label}`);
    }
  }
  const [x, y, z] = [...seen.values()].map((set) => [...set].sort().join('|'));
  assert.notEqual(x, y); assert.notEqual(x, z); assert.notEqual(y, z);
  // The newcomer is never asked for what needs money, friends or a habit they do not have.
  const asked = new Set([...(seen.get('newcomer') ?? [])].map((line) => line.split(':')[1]));
  for (const id of ['fetchbig', 'friend', 'tableweek', 'stallask', 'stallswap', 'work']) assert.ok(!asked.has(id), `a newcomer is not offered ${id}`);
  // Same life, same agent, same day: the same task, every time. Another day may differ.
  assert.deepEqual(offerFor(a, byKey('tolani'), peers)?.entry, offerFor(a, byKey('tolani'), peers)?.entry);
  const days = new Set(Array.from({ length: 12 }, (_, n) => offerFor({ ...a, day: a.day + n }, byKey('tolani'), peers)?.template.id));
  assert.ok(days.size > 1, 'over a fortnight a life is given a variety');
});

test('a task that cannot be done in this city or by this life is not offered', () => {
  assert.equal(offerFor(profile({ friends: 0 }), byKey('kofo'), [])?.template.kind === 'bring', false, 'no friends: no bring-a-friend');
  const none = offerFor(profile({ tables: 99, friends: 0, band: 'lean' }), byKey('tunji'), [], []);
  assert.equal(none, null, 'a guide with nobody to send people to, and a life that has done it all, has nothing');
  assert.equal(offerFor(profile(), byKey('tolani'), [byKey('tolani')]) !== null, true, 'a seller can always ask for a table game');
  const alone = offerFor(profile({ band: 'comfortable', friends: 3, tables: 20, seen: 3 }), byKey('ade'), [], []);
  assert.ok(alone && alone.template.kind !== 'talk', 'with no one else standing, no greeting is asked for');
});

test('rewards of every template, for every life shape, stay inside the mission limits and the task fits its kind', () => {
  const peers = CAST;
  let checked = 0;
  for (const band of ['lean', 'steady', 'comfortable'] as const) for (const friends of [0, 2]) for (const tables of [0, 10]) for (const stall of [false, true]) for (const job of [null, 'Tech']) for (let seed = 0; seed < 6; seed++) for (const giver of CAST) {
    const p = profile({ band, friends, tables, stall, job, seed, seen: seed });
    const offer = offerFor(p, giver, peers.filter((agent) => agent.id !== giver.id));
    if (!offer) continue;
    checked += 1;
    const entry = offer.entry as { cash: number; big?: true; kind: string; count: number; id: string; with?: object; item?: string };
    assert.ok(entry.cash > 0 && entry.cash <= MISSION_REWARDS[entry.big ? 'weekly' : 'daily'].cash, `${offer.template.id}: ${entry.cash}`);
    assert.equal(Boolean(entry.big), Boolean(offer.template.big));
    assert.ok(entry.count >= 1 && entry.count <= 4);
    assert.ok(/^ag-[a-z0-9-]{3,36}$/.test(entry.id) && entry.id.length <= 40, entry.id);
    if (entry.kind === 'talk') assert.ok(entry.with, 'a greeting names its agent'); else assert.equal(entry.with, undefined);
    if (entry.kind === 'hand') assert.ok(entry.item && INGREDIENTS[entry.item]); else assert.equal(entry.item, undefined);
    assert.doesNotMatch(offer.label, /[{}]/);
  }
  assert.ok(checked > 300);
});

test('every written brief, label and Pidgin brief passes the AI word rules for an adult and for a minor, in every voice and for every giver', () => {
  const roles: Role[] = ['seller', 'guide', 'marketer', 'mission', 'quiz'];
  let spoken = 0;
  for (const template of TEMPLATES) {
    assert.ok(template.roles.every((role) => roles.includes(role)));
    for (const voice of ['plain', 'pidgin'] as const) {
      const vars = { giver: 'Mama Tolani', place: 'Freedom Park', other: 'Tunji', city: 'Lagos', job: 'banking', item: 'long-grain rice', units: '3' };
      for (const text of [writtenBrief(template, voice).replace(/\{(\w+)\}/g, (_, key: string) => (vars as Record<string, string>)[key] ?? 'x'), template.label.replace(/\{(\w+)\}/g, (_, key: string) => (vars as Record<string, string>)[key] ?? 'x')]) {
        for (const toMinor of [true, false]) { const verdict = agentWords(text, { toMinor }); assert.ok(verdict.ok, `${template.id}/${voice} "${text}": ${JSON.stringify(verdict)}`); }
        spoken += 1;
      }
      // Every token of the written brief is one the filler can make.
      for (const token of tokensOf(writtenBrief(template, voice))) assert.ok(token in vars, `${template.id}: unknown token ${token}`);
    }
  }
  // And the filled briefs of real offers, for every giver, for a minor.
  const peers = CAST;
  for (const giver of CAST) for (const p of [regular(), newcomer(), profile({ friends: 2, tables: 6, band: 'comfortable', stall: true, job: 'Tech' })]) {
    const offer = offerFor(p, giver, peers.filter((agent) => agent.id !== giver.id));
    if (!offer) continue;
    for (const text of [sayBrief(offer, null, giver.voice), offer.label]) { assert.ok(agentWords(text, { toMinor: true }).ok, text); assert.ok(text.length <= 230, text); }
  }
  assert.ok(spoken >= 2 * TEMPLATES.length * 2);
});

test('the model is asked only to rephrase: its prompt carries the written brief and no player or reward', () => {
  const template: Template = TEMPLATES.find((item) => item.id === 'fetchbig')!;
  const messages = briefPrompt(template, byKey('tolani'));
  const text = JSON.stringify(messages);
  assert.equal(messages.length, 2);
  assert.match(messages[1]!.content, /\{units\}/);
  assert.doesNotMatch(text, /₦|\bnaira\b|reward|\b\d{3,}\b(?! characters)/i, 'no price, no reward, no number of the task');
  assert.doesNotMatch(messages[1]!.content, /\d/, 'the written brief itself has no digit');
  assert.match(messages[0]!.content, /Mama Tolani/);
  assert.match(messages[0]!.content, /Add no numbers/);
});

test('a rephrasing is kept only if it keeps exactly the tokens of the written brief and adds no number, link or length', () => {
  const template = TEMPLATES.find((item) => item.id === 'fetchbig')!;
  const good = 'Ehen, this week I am short of {item}: please bring {units} when you can, and tell me you have them.';
  assert.equal(cleanBrief(good, template, 'plain'), good);
  assert.equal(cleanBrief(`"${good}"`, template, 'plain'), good, 'quotes are stripped');
  const bad: [string, string][] = [
    ['a token dropped', 'I need some {item} this week, please bring them to me.'],
    ['a token added', 'This week I need {units} {item} from {other}, bring them please.'],
    ['a token invented', 'This week I need {units} {item} and {price} to match.'],
    ['a number', 'This week I need {units} {item}, about 3 of them, bring them when you can.'],
    ['a price', 'This week I need {units} {item} and I will pay ₦900 for them gladly.'],
    ['a link', 'This week I need {units} {item}, see https://example.com for more details.'],
    ['too long', `This week I need {units} {item}. ${'Bring them when you can. '.repeat(10)}`],
    ['too short', '{units} {item}'],
    ['markup', 'This week I need {units} {item} <b>please</b> bring them when you can.'],
  ];
  for (const [why, text] of bad) assert.equal(cleanBrief(text, template, 'plain'), null, why);
});
