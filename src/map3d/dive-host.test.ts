// The dive's veil (./dive-host.ts) on a fake page with a hand-cranked frame queue: the hand-off waits for the chunks and the clouds,
// skip (button, Escape, a tap) ends at once and lands the atlas, reduced motion is a short plain fade, and the loop stops itself.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDiveHost } from './dive-host.ts';
import { FLIGHT_MS, REDUCED_MS } from './dive.ts';

type Listener = (event: { key?: string; preventDefault(): void }) => void;
class FakeElement {
  className = ''; hidden = false; textContent = ''; type = '';
  style: Record<string, string> = {};
  children: FakeElement[] = []; parent: FakeElement | null = null; listeners = new Map<string, Listener[]>(); attributes = new Map<string, string>();
  classList = { set: new Set<string>(), toggle: (name: string, on: boolean) => { if (on) this.classList.set.add(name); else this.classList.set.delete(name); }, contains: (name: string) => this.classList.set.has(name) };
  ownerDocument: FakeDocument; tag: string;
  constructor(ownerDocument: FakeDocument, tag: string) { this.ownerDocument = ownerDocument; this.tag = tag; }
  append(...items: FakeElement[]) { for (const item of items) { item.parent = this; this.children.push(item); } }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this); this.parent = null; }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  addEventListener(type: string, run: Listener) { this.listeners.set(type, [...(this.listeners.get(type) ?? []), run]); }
  fire(type: string, event: { key?: string } = {}) { for (const run of this.listeners.get(type) ?? []) run({ ...event, preventDefault() {} }); }
  find(cls: string): FakeElement | null { for (const child of this.children) { if (child.className.split(' ').includes(cls)) return child; const deep = child.find(cls); if (deep) return deep; } return null; }
}
class FakeDocument {
  listeners = new Map<string, Listener[]>();
  createElement(tag: string) { return new FakeElement(this, tag); }
  addEventListener(type: string, run: Listener) { this.listeners.set(type, [...(this.listeners.get(type) ?? []), run]); }
  removeEventListener(type: string, run: Listener) { this.listeners.set(type, (this.listeners.get(type) ?? []).filter((item) => item !== run)); }
  fire(type: string, event: { key?: string }) { for (const run of [...(this.listeners.get(type) ?? [])]) run({ ...event, preventDefault() {} }); }
}

function harness(reduced = false) {
  const doc = new FakeDocument(), root = doc.createElement('body'), queue: (() => void)[] = [], clock = { now: 0 };
  const host = createDiveHost({ root: root as unknown as HTMLElement, reduced: () => reduced, now: () => clock.now, raf: (run) => { queue.push(run); return queue.length; }, caf: () => { queue.length = 0; } });
  /** Run frames `step` ms apart until nothing asks for another, or until `until` ms of page time. */
  const frames = (until = 20000, step = 16) => { let count = 0; const end = clock.now + until; while (queue.length && clock.now < end) { clock.now += step; queue.shift()!(); count += 1; } return count; };
  const veil = () => root.find('dv-veil')!;
  return { doc, root, host, queue, clock, frames, veil };
}
const flush = () => new Promise((done) => setTimeout(done, 0));

test('a dive: the hand-off waits for opaque clouds and the chunks, the clouds part once the city is ready, then the loop stops', async () => {
  const { host, frames, clock, veil, queue } = harness();
  let loaded!: () => void;
  const prefetch = new Promise<void>((done) => { loaded = done; });
  const run = host.start('ibadan', 'Ibadan', { prefetch });
  assert.equal(run.flightSeconds, FLIGHT_MS / 1000); assert.ok(run.revealSeconds > 2);
  assert.equal(veil().hidden, false); assert.equal(host.current, run);
  let covered = false, outcome: string | null = null;
  void run.covered.then(() => { covered = true; }); void run.done.then((value) => { outcome = value; });
  frames(FLIGHT_MS + 300); await flush();
  assert.equal(covered, false, 'the chunks are not in: the hand-off waits under the clouds');
  assert.equal(veil().find('dv-left')!.style.opacity, '1');
  loaded(); await flush(); frames(32); await flush();
  assert.equal(covered, true);
  assert.equal(outcome, null, 'still covered until what is underneath says it is ready');
  run.ready(true); frames(); await flush();
  assert.equal(outcome, 'arrived'); assert.equal(veil().hidden, true); assert.equal(host.current, null);
  assert.equal(queue.length, 0, 'no frames once it is over (battery rule)');
  assert.ok(clock.now < 10000);
  host.destroy();
});

test('skip: the button, Escape or a tap ends at once, lands the atlas and lets the hand-off go', async () => {
  for (const how of ['button', 'escape', 'tap'] as const) {
    const { host, frames, veil, doc, queue } = harness();
    let landed = 0;
    const run = host.start('lagos', 'Lagos', { prefetch: new Promise(() => {}), onSkip: () => { landed += 1; } });
    frames(300);
    if (how === 'button') veil().find('dv-skip')!.fire('click');
    else if (how === 'escape') doc.fire('keydown', { key: 'Escape' });
    else veil().fire('pointerdown');
    assert.equal(await run.done, 'skipped', how); await run.covered;
    assert.equal(landed, 1); assert.equal(veil().hidden, true); assert.equal(queue.length, 0);
    assert.equal(doc.listeners.get('keydown')?.length ?? 0, 0, 'Escape is listened for only during a dive');
    host.destroy();
  }
});

test('a refusal clears the clouds quickly; a second dive replaces the first', async () => {
  const { host, frames } = harness();
  const first = host.start('kano', 'Kano');
  frames(200);
  const second = host.start('abuja', 'Abuja');
  assert.equal(await first.done, 'skipped');
  second.ready(false);
  const count = frames();
  assert.equal(await second.done, 'refused'); assert.ok(count < 40, `${count} frames`);
  host.destroy();
});

test('reduced motion: no flight, no clouds, a plain veil that comes and goes within about 200 ms', async () => {
  const { host, frames, veil } = harness(true);
  const run = host.start('lagos', 'Lagos', { prefetch: Promise.resolve() });
  assert.equal(run.flightSeconds, 0); assert.equal(run.revealSeconds, 0);
  assert.ok(veil().classList.contains('is-reduced'));
  await flush(); frames(REDUCED_MS + 20, 10); await run.covered;
  run.ready(true);
  const before = Date.now();
  frames(400, 10);
  assert.equal(await run.done, 'arrived'); assert.ok(Date.now() - before < 1000);
  assert.equal(veil().find('dv-left')!.style.transform ?? '', '', 'the clouds never move');
  host.destroy();
});
