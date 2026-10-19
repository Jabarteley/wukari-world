// The entry page's backdrop (./entry-dive.ts, ./dive.ts entryBackdrop and entryDivePlan): which device gets the picture, the fade or
// the dive; the timed path from space to the country to the city, carried out with the atlas's own calls on a fake atlas and fake timers;
// the clouds parting once the flight lands; Find my street starting the path again; and that nothing of it can hold up Play: it starts
// on its own timers, never throws, and goes away at once.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ENTRY_COUNTRY_MS, ENTRY_WORLD_MS, LITE, entryBackdrop, entryDivePlan } from './dive.ts';
import { startEntryDive } from './entry-dive.ts';
import type { EntryAtlas, EntryDiveOptions } from './entry-dive.ts';
import type { WorldMapOptions } from '../world-map.ts';

test('the backdrop per device: save-data and weak devices keep the picture, reduced motion fades, the rest dive', () => {
  assert.equal(entryBackdrop({ saveData: true }), 'still');
  assert.equal(entryBackdrop({ cores: 2 }), 'still');
  assert.equal(entryBackdrop({ memory: 1 }), 'still');
  assert.equal(entryBackdrop({ saveData: true, reduced: true }), 'still', 'a device that saves data is never sent the maps');
  assert.equal(entryBackdrop({ reduced: true, cores: 8 }), 'fade');
  assert.equal(entryBackdrop({ cores: 8, memory: 8 }), 'dive');
  assert.equal(entryBackdrop({}), 'dive');
})

test('the timed path: the world, then the country, then the dive to the city; shorter on a mid-range device; the city at once for the fade', () => {
  assert.deepEqual(entryDivePlan('still'), []);
  assert.deepEqual(entryDivePlan('fade'), [{ at: 0, go: 'settle' }]);
  assert.deepEqual(entryDivePlan('dive'), [{ at: 0, go: 'world' }, { at: ENTRY_WORLD_MS, go: 'country' }, { at: ENTRY_WORLD_MS + ENTRY_COUNTRY_MS, go: 'city' }]);
  const lite = entryDivePlan('dive', 'lite');
  assert.deepEqual(lite.map((step) => step.go), ['world', 'country', 'city']);
  assert.equal(lite[2]?.at, Math.round(ENTRY_WORLD_MS * LITE) + Math.round(ENTRY_COUNTRY_MS * LITE));
  for (const plan of [entryDivePlan('dive'), lite]) for (let i = 1; i < plan.length; i++) assert.ok((plan[i]?.at ?? 0) > (plan[i - 1]?.at ?? 0), 'in order');
})

// ---- the driver on a fake page --------------------------------------------------------------------------------------------------
class Box {
  children: Box[] = []; parent: Box | null = null; className = ''; style: Record<string, string> = {};
  classes = new Set<string>();
  classList = { add: (name: string) => { this.classes.add(name); }, contains: (name: string) => this.classes.has(name) };
  ownerDocument = { createElement: () => new Box() };
  append(child: Box) { child.parent = this; this.children.push(child); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this); this.parent = null; }
}
function harness(over: Partial<EntryDiveOptions> & { ready?: Promise<boolean>; fail?: boolean } = {}) {
  const calls: string[] = [], timers: { run: () => void; ms: number; live: boolean }[] = [];
  let options: NonNullable<WorldMapOptions> = {}, landed = 0, skipped = 0;
  const readied: boolean[] = [], destroyed = { atlas: 0, dives: 0 };
  const box = new Box();
  const atlas: EntryAtlas = {
    ready: over.ready ?? Promise.resolve(true),
    setCity: (id) => { calls.push(`city:${id}`); }, resize: () => {}, goLevel: (index) => { calls.push(`level:${index}`); },
    enterCity: (id) => { calls.push(`enter:${id}`); const answer = options.dive?.(id, true, () => { landed += 1; }, { nearKm: 5, farKm: 200 }); calls.push(`flight:${typeof answer === 'object' && answer ? answer.seconds : answer}`); },
    lookAt: (id) => { calls.push(`look:${id}`); }, destroy: () => { destroyed.atlas += 1; },
  };
  const dive = startEntryDive({
    box: box as unknown as HTMLElement, target: { city: 'lagos', name: 'Yaba, Lagos' }, backdrop: 'dive', levelOf: (city) => (city === 'lagos' ? 2 : 3),
    createMap: (_box, given) => { if (over.fail) throw new Error('no WebGL'); options = given ?? {}; return atlas; },
    dives: () => ({ start: () => ({ cityId: 'lagos', tier: 'full', flightSeconds: 1.6, revealSeconds: 3, live: true, outcome: null, covered: Promise.resolve(), done: Promise.resolve('arrived' as const), ready: (ok: boolean) => { readied.push(ok); }, skip: () => { skipped += 1; } }), destroy: () => { destroyed.dives += 1; } }),
    setTimer: (run, ms) => { const timer = { run, ms, live: true }; timers.push(timer); return timer; },
    clearTimer: (timer) => { (timer as { live: boolean }).live = false; },
    ...over,
  });
  /** Run every live timer due by `ms`, in order. */
  const until = (ms: number) => { for (const timer of [...timers].sort((a, b) => a.ms - b.ms)) if (timer.live && timer.ms <= ms) { timer.live = false; timer.run(); } };
  return { dive, box, calls, timers, until, open: () => options.onOpenCity?.('lagos'), state: () => ({ landed, readied, skipped, destroyed }) };
}
const settle = () => new Promise((done) => setTimeout(done, 0));

test('the dive: faded in once the atlas is ready, then from space to the country to the city on its own timers; the clouds part when the flight lands', async () => {
  const h = harness();
  assert.equal(h.box.children.length, 1, 'its own box, under the card');
  const layer = h.box.children[0]!;
  assert.equal(layer.classes.has('is-on'), false, 'nothing shows before the first level is drawn');
  await settle();
  assert.equal(layer.classes.has('is-on'), true);
  assert.deepEqual(h.timers.map((timer) => timer.ms), [0, ENTRY_WORLD_MS, ENTRY_WORLD_MS + ENTRY_COUNTRY_MS]);
  h.until(0); h.until(ENTRY_WORLD_MS);
  assert.deepEqual(h.calls, ['city:lagos', 'city:lagos', 'level:0', 'level:2']);
  h.until(ENTRY_WORLD_MS + ENTRY_COUNTRY_MS);
  assert.deepEqual(h.calls.slice(4), ['enter:lagos', 'flight:1.6'], 'the atlas flies for as long as the clouds take to close');
  h.open();
  assert.deepEqual(h.state().readied, [true], 'landed over the city: the clouds part');
})

test('Find my street: the path starts again from space for the new city; the same city changes only the name', async () => {
  const h = harness();
  await settle();
  h.until(10000);
  h.dive.retarget({ city: 'lagos', name: 'Ikeja, Lagos' });
  assert.equal(h.timers.filter((timer) => timer.live).length, 0, 'the same city: nothing restarts');
  h.dive.retarget({ city: 'accra', name: 'Accra' });
  assert.equal(h.state().skipped, 1, 'the dive that was going is skipped');
  h.until(20000);
  assert.deepEqual(h.calls.slice(-5), ['city:accra', 'level:0', 'level:3', 'enter:accra', 'flight:1.6']);
})

test('never in the way: no WebGL leaves the picture, a level that never loads shows nothing, and destroy is at once and final', async () => {
  const broken = harness({ fail: true });
  assert.equal(broken.box.children.length, 0, 'the picture stays as it was');
  assert.equal(broken.state().destroyed.dives, 1);
  broken.dive.retarget({ city: 'accra', name: 'Accra' }); broken.dive.destroy();
  const stuck = harness({ ready: new Promise<boolean>(() => {}) });
  await settle();
  assert.deepEqual([stuck.timers.length, stuck.box.children[0]?.classes.has('is-on')], [0, false]);
  const h = harness();
  await settle();
  h.dive.destroy();
  assert.equal(h.box.children.length, 0);
  assert.deepEqual(h.state().destroyed, { atlas: 1, dives: 1 });
  assert.equal(h.timers.filter((timer) => timer.live).length, 0, 'no step is left to run');
  h.dive.destroy(); h.dive.retarget({ city: 'accra', name: 'Accra' });
  assert.deepEqual(h.state().destroyed, { atlas: 1, dives: 1 }, 'once');
})

test('Play is never blocked: the entry page starts nothing of the dive before the first paint, and no Play path waits on it', () => {
  const page = readFileSync(new URL('../app/features/start/EntryPage.vue', import.meta.url), 'utf8');
  const script = page.slice(page.indexOf('<script setup'), page.indexOf('</script>'));
  // The street, the dive and Find my street are one lazy module, asked for after the card has drawn or on a tap.
  assert.ok(!/^import [^\n]*streetEntry\.ts'/m.test(script.replace(/^import type [^\n]*$/gm, '')), 'no static import of the street module');
  assert.ok(!/^import [^\n]*map3d\/(?!entry-dive\.ts'$)/m.test(script.replace(/^import type [^\n]*$/gm, '')), 'nothing of the maps in the page itself');
  assert.match(script, /requestAnimationFrame\(\(\) => \{[^\n]*readStreet/, 'the street is read after the first frame');
  // The Play buttons: the plain one starts at once; a street waits only for its city's content (asked for when the card learnt the street), never for the backdrop.
  const playStreet = script.slice(script.indexOf('async function playStreet'), script.indexOf('function act('));
  assert.ok(playStreet.length > 0 && !/backdrop|goDown|startBackdrop|readStreet/.test(playStreet), 'Play on a street never touches the dive');
  const play = script.slice(script.indexOf('function play('), script.indexOf('async function playStreet'));
  assert.ok(!/await|backdrop/.test(play), 'Play now is synchronous and knows nothing of the dive');
  assert.match(page, /class="en-stage" inert/, 'the dive is drawn in a box that takes no input');
  assert.match(page, /\.en-stage \{[^}]*pointer-events: none/);
})
