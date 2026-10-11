// OWNER: scenes — the roster bodies of a scene's other people: the loader's fallback, the hero / crowd choice and the budget, with a stub body.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCrowdBodies, pickFor } from './crowd-bodies.ts';
import type { BodySpec } from './crowd-bodies.ts';
import type { SkinnedBody } from '../body/skinned.ts';
import type { Kit } from '../kit.ts';
import type { Detail } from './budget.ts';
import { CROWD_TRIANGLES, HERO_TRIANGLES, TRIANGLES_MAX } from './budget.ts';

class FakeGL2 {}
const renderer = { getContext: () => new FakeGL2() };
(globalThis as { WebGL2RenderingContext?: unknown }).WebGL2RenderingContext = FakeGL2;

interface Stub { body: SkinnedBody; calls: string[]; detail: Detail }
const made: Stub[] = [];
function stubBody(detail: Detail): Stub {
  const calls: string[] = [];
  const object: { parent: unknown } = { parent: null };
  const body = {
    object, triangles: detail === 'hero' ? HERO_TRIANGLES : CROWD_TRIANGLES,
    place: (...at: number[]) => calls.push(`place ${at.join(',')}`), show: (pose: string) => calls.push(`show ${pose}`), sitOn: () => calls.push('sitOn'),
    stride: () => calls.push('stride'), sampleUse: (pose: string) => calls.push(`use ${pose}`), fit: () => calls.push('fit'), dispose: () => calls.push('dispose'),
  } as unknown as SkinnedBody;
  const stub = { body, calls, detail };
  made.push(stub);
  return stub;
}
const holder = () => { const kids: unknown[] = []; return { kids, add: (child: { parent: unknown }) => { child.parent = holder; kids.push(child); } }; };
const kit = {} as Kit;
const flush = async (): Promise<void> => { for (let i = 0; i < 6; i++) await new Promise((resolve) => setTimeout(resolve, 2)); };
const spec = (id: string, kind: BodySpec['kind'], extra: Partial<BodySpec> = {}): BodySpec => ({ id, kind, seed: id, parent: holder() as unknown as BodySpec['parent'], x: 1, y: 0, z: 2, ry: 0.5, pose: 'stand', ...extra });

test('players get the hero model, regulars the crowd model; the procedural figure stays until the body is in', async () => {
  const loads: Detail[] = [];
  let changes = 0;
  const bodies = createCrowdBodies(kit, () => { changes += 1; }, { tier: 'full', selfFigure: false, load: async (_look, _seed, _pick, detail) => { loads.push(detail); return stubBody(detail).body; } });
  bodies.sync([spec('npc:a', 'npc', { regular: { id: 'a', name: 'Mama Ronke' } }), spec('p1', 'peer', { look: { body: 'man', outfit: 'hoodie' } }), spec('npc:b', 'npc')]);
  assert.equal(bodies.has('p1'), false, 'nothing is shown before a frame has been drawn');
  bodies.start(renderer);
  await flush();
  assert.deepEqual(loads.sort(), ['crowd', 'crowd', 'hero']);
  assert.ok(bodies.has('p1') && bodies.has('npc:a') && bodies.has('npc:b'));
  assert.equal(bodies.ready, 3);
  assert.equal(bodies.triangles, HERO_TRIANGLES + 2 * CROWD_TRIANGLES);
  assert.ok(changes >= 3, 'the scene is told each time a body arrives');
  bodies.dispose();
  assert.ok(made.every((stub) => stub.calls.includes('dispose')), 'every body is freed');
});

test('a failed load keeps the procedural figure, gives the budget back and never throws', async () => {
  const warn = console.warn; console.warn = () => undefined;
  try {
    let attempts = 0;
    const bodies = createCrowdBodies(kit, () => undefined, { tier: 'full', selfFigure: false, load: async () => { attempts += 1; throw new Error('404'); } });
    bodies.sync([spec('p1', 'peer'), spec('npc:a', 'npc')]);
    bodies.start(renderer);
    await flush();
    assert.equal(attempts, 2);
    assert.equal(bodies.has('p1'), false);
    assert.equal(bodies.has('npc:a'), false);
    assert.deepEqual(bodies.budget.used, { hero: 0, crowd: 0, triangles: 0 }, 'the failed figures give their budget back');
    bodies.sync([spec('p1', 'peer')]);
    bodies.start(renderer);
    await flush();
    assert.equal(attempts, 2, 'a failed person is not asked for again');
  } finally { console.warn = warn; }
});

test('no WebGL2, or a device that is not allowed: nothing is ever loaded', async () => {
  let attempts = 0;
  const load = async (): Promise<SkinnedBody> => { attempts += 1; return stubBody('crowd').body; };
  const flat = createCrowdBodies(kit, () => undefined, { tier: 'full', load });
  flat.sync([spec('p1', 'peer')]);
  flat.start({ getContext: () => ({}) });
  const off = createCrowdBodies(kit, () => undefined, { allowed: false, tier: 'full', load });
  off.sync([spec('p1', 'peer')]);
  off.start(renderer);
  await flush();
  assert.equal(attempts, 0);
  assert.ok(!flat.has('p1') && !off.has('p1'));
});

test('the budget caps the figures: two heroes at most fit with their crowd, the rest stay procedural; a lite device has crowd models only', async () => {
  const seen: Detail[] = [];
  const load = async (_l: unknown, _s: unknown, _p: unknown, detail: Detail): Promise<SkinnedBody> => { seen.push(detail); return stubBody(detail).body; };
  const busy = createCrowdBodies(kit, () => undefined, { tier: 'full', load });
  assert.deepEqual(busy.budget.used, { hero: 1, crowd: 0, triangles: HERO_TRIANGLES }, 'the player\'s own figure has its share before anyone else');
  busy.sync([...Array.from({ length: 4 }, (_, i) => spec(`p${i}`, 'peer')), ...Array.from({ length: 12 }, (_, i) => spec(`npc:${i}`, 'npc'))]);
  busy.start(renderer);
  await flush(); await flush();
  assert.ok(seen.filter((d) => d === 'hero').length <= 4);
  assert.ok(busy.triangles + HERO_TRIANGLES <= TRIANGLES_MAX, `${busy.triangles} triangles besides the player's own`);
  assert.ok(busy.ready >= 4 && busy.ready < 16);
  seen.length = 0;
  const weak = createCrowdBodies(kit, () => undefined, { tier: 'lite', selfFigure: false, load });
  weak.sync([spec('p1', 'peer'), ...Array.from({ length: 8 }, (_, i) => spec(`npc:${i}`, 'npc'))]);
  weak.start(renderer);
  await flush(); await flush();
  assert.ok(seen.length > 0 && seen.every((d) => d === 'crowd'));
  assert.ok(weak.ready <= 4, 'a lite device draws at most four');
});

test('a person who leaves is freed; one whose look changes is a new body; the same look only re-poses', async () => {
  const bodies = createCrowdBodies(kit, () => undefined, { tier: 'full', selfFigure: false, load: async (_l, _s, _p, detail) => stubBody(detail).body });
  const first = spec('p1', 'peer', { look: { body: 'man', outfit: 'office' } });
  bodies.sync([first]); bodies.start(renderer); await flush();
  assert.ok(bodies.has('p1'));
  const count = made.length;
  bodies.sync([spec('p1', 'peer', { look: { body: 'man', outfit: 'office' }, pose: 'walk', phase: 1 })]);
  assert.equal(made.length, count, 'the same look is not loaded again');
  bodies.sync([spec('p1', 'peer', { look: { body: 'woman', outfit: 'owambe', hair: 'gele' } })]); bodies.start(renderer); await flush();
  assert.equal(made.length, count + 1, 'a new look is a new body');
  bodies.sync([]);
  assert.equal(bodies.has('p1'), false);
  assert.deepEqual(bodies.budget.used, { hero: 0, crowd: 0, triangles: 0 });
});

test('which character a person wears: a regular by their description, a player by their look, anyone else by the seed', () => {
  const regular = { id: 'mama-ronke', name: 'Mama Ronke', emoji: '\u{1F469}\u{1F3FE}' };
  assert.deepEqual(pickFor({ kind: 'npc', seed: 'x', regular }), pickFor({ kind: 'npc', seed: 'y', regular }), 'the same regular, the same character');
  assert.equal(pickFor({ kind: 'peer', seed: 'q', look: { body: 'woman', character: 'w6', characterOutfit: 1 } })?.id, 'w6');
  assert.deepEqual(pickFor({ kind: 'peer', seed: 'q' }), pickFor({ kind: 'peer', seed: 'q' }));
});
