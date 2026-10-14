/**
 * OWNER: world
 * Runs the zoom ladder (./zoom-ladder.ts) for the Map: the one place that knows both maps. The maps only say what zoom they could
 * not take (a LadderPort each); this turns enough of it into a hand-over:
 *
 *   city map, zoom out past its widest view  → the atlas, arriving close over the city and going on out to its level
 *   atlas, zoom in past its closest view     → on the player's own city: the city map; on another open city: its overview card (a look, never a move)
 *   any other change between the two maps    → the same fade (`fadeTo`), so the dropdown and the "Open city" button are not a hard cut
 *
 * A hand-over is a cross-fade of the two map boxes (opacity only, no layout) while the atlas flies; it waits for the next map's data
 * (with a chip that says so), turns back if the player turns back, and leaves the map it came from to be released (src/map3d/index.ts).
 * It never moves the player: nothing here calls a game action or reads the player's place.
 */
import './zoom-host.css';
import { bodyAllowed } from '../scene/body/gate.ts';
import type { CityView } from './index.ts';
import type { WorldMap } from '../world-map.ts';
import { cityEntry } from './regions.ts';
import { COOLDOWN_MS, RUNGS, createHandoff, createPressure, crossfade, limitHint } from './zoom-ladder.ts';
import type { Edge, Handoff, LadderPort, Rung } from './zoom-ladder.ts';

export type Layer = 'city' | 'world';
export interface ZoomHostOptions {
  /** The two boxes the maps are drawn in (siblings). */
  city: HTMLElement
  world: HTMLElement
  /** The maps, once they exist (the host is made before them: their options carry its ports). */
  maps: () => { city: CityView | null; world: WorldMap | null }
  cityId: () => string
  cityName: () => string
  /** Make a map the screen: the host of the boxes flips the layer and tells the Map panel. The leaving box stays drawn until the host is done with it. */
  setLayer: (layer: Layer) => void
  reduced?: () => boolean
  now?: () => number
  raf?: (run: () => void) => number
  caf?: (handle: number) => void
}
export interface ZoomHost {
  readonly cityPort: LadderPort
  readonly worldPort: LadderPort
  /**
   * Change which map is in front with the fade; false when a hand-over is already going or nothing needs doing. `descend` (seconds) brings
   * the city map down from straight above (the dive, ./dive-host.ts); `after` hears which map ended in front (also when it gave up).
   */
  fadeTo(layer: Layer, options?: { carry?: number; descend?: number; after?: (front: Layer) => void }): boolean
  /** True from the start of a hand-over to its end. */
  readonly busy: boolean
  destroy(): void
}

const RELEASE_AFTER_MS = 20000;
const CHIP_MS = 1500, REVERSE_BY = 0.12;
const RUNG = (id: Rung['id']): Rung => RUNGS.find((rung) => rung.id === id)!;

export function createZoomHost(options: ZoomHostOptions): ZoomHost {
  const { city: cityBox, world: worldBox } = options;
  const now = options.now ?? (() => globalThis.performance.now());
  const raf = options.raf ?? ((run) => globalThis.requestAnimationFrame(run)), caf = options.caf ?? ((handle) => globalThis.cancelAnimationFrame(handle));
  const reduced = (): boolean => options.reduced?.() ?? Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const doc = cityBox.ownerDocument, parent = cityBox.parentElement ?? cityBox;
  const pressure = createPressure();
  let handoff: Handoff = createHandoff();
  let token = 0, frame = 0, pollFrame = 0, opposed = 0, destroyed = false, chipTimer: ReturnType<typeof setTimeout> | null = null, push: { box: HTMLElement } | null = null;
  let session: { from: Layer; to: Layer; edge: Edge; carry: number; after?: (front: Layer) => void } | null = null;

  // ---- the chip and the screen reader's line ------------------------------------------------------------------------------
  const chip = doc.createElement('div');
  chip.className = 'zl-chip'; chip.hidden = true; chip.setAttribute('aria-hidden', 'true');
  chip.innerHTML = '<span class="zl-text"></span><span class="zl-bar"><i></i></span>';
  const text = chip.querySelector<HTMLElement>('.zl-text')!, bar = chip.querySelector<HTMLElement>('.zl-bar i')!;
  const polite = doc.createElement('div');
  polite.className = 'ui-sr'; polite.setAttribute('role', 'status'); polite.setAttribute('aria-live', 'polite');
  parent.append(chip, polite);
  /** What the host is doing, for the page's own tests: 'idle', 'loading' (waiting for the next map) or 'fading'. */
  const phase = (value: 'idle' | 'loading' | 'fading'): void => { parent.dataset.ladder = value; };
  phase('idle');
  let said = '';
  const announce = (words: string): void => { if (words === said) return; said = words; polite.textContent = words; };
  function show(words: string, amount = 0, busy = false): void {
    text.textContent = words;
    bar.style.transform = `scaleX(${Math.max(0, Math.min(1, amount))})`;
    chip.classList.toggle('is-busy', busy); chip.hidden = false;
    if (chipTimer) clearTimeout(chipTimer);
    chipTimer = busy ? null : setTimeout(hide, CHIP_MS);
  }
  function hide(): void { if (chipTimer) clearTimeout(chipTimer); chipTimer = null; chip.hidden = true; }
  /** The give at the limit: the map in front leans a little into the zoom, in proportion to the pressure, and settles back. */
  function lean(box: HTMLElement | null, edge: Edge | null, amount: number): void {
    if (push && push.box !== box) { push.box.style.removeProperty('--zl-lean'); push = null; }
    if (!box || reduced()) return;
    if (edge && amount > 0) { box.style.setProperty('--zl-lean', String(1 + (edge === 'in' ? 1 : -1) * 0.022 * amount)); box.classList.add('zl-lean'); push = { box }; }
    else { box.style.removeProperty('--zl-lean'); push = null; }
  }

  // ---- what lies beyond a limit ---------------------------------------------------------------------------------------------
  const countryName = (): string => cityEntry(options.cityId())?.countryName ?? 'Nigeria';
  interface Beyond { label: string | null; look?: boolean; name?: string; /** `carry` is the zoom the gesture had left over. */ go?: (carry: number) => void }
  function beyondOf(surface: Layer, edge: Edge, at: readonly [number, number] | null): Beyond {
    const { world } = options.maps();
    if (surface === 'city') return edge === 'out' ? { label: countryName(), go: (carry) => leaveCity(carry) } : { label: null, name: options.cityName() };
    if (edge === 'out') return { label: null, name: 'the whole world' };
    const target = world?.ladderTarget(at) ?? null;
    if (!target) return { label: null, name: 'the map' };
    if (target.own) return { label: target.name, go: (carry) => enterOwn(target.id, carry) };
    return { label: target.name, look: true, go: () => lookAt(target.id, target.name) };
  }

  // ---- the hand-over ------------------------------------------------------------------------------------------------------------
  const boxOf = (layer: Layer): HTMLElement => (layer === 'city' ? cityBox : worldBox);
  function tidy(): void {
    for (const box of [cityBox, worldBox]) { box.classList.remove('zl-fading', 'zl-leaving', 'zl-entering'); box.style.removeProperty('opacity'); box.style.removeProperty('--zl-lean'); }
  }
  function stop(): void { if (frame) caf(frame); frame = 0; if (pollFrame) caf(pollFrame); pollFrame = 0; }
  /** The fade: runs until it ends. `then` says which map is in front when it does (the one entered, or the one left if it was turned back). */
  function fade(): void {
    stop();
    const { from, to } = session!, leaving = boxOf(from), entering = boxOf(to);
    leaving.classList.add('zl-fading', 'zl-leaving'); entering.classList.add('zl-fading', 'zl-entering'); phase('fading'); hide();
    const step = (): void => {
      frame = 0;
      if (destroyed) return;
      const going = handoff.tick(now()), { leaving: out, entering: inn } = crossfade(handoff.view.progress);
      leaving.style.opacity = String(out); entering.style.opacity = String(inn);
      if (going) { frame = raf(step); return; }
      finish(handoff.returned);
    };
    step();
  }
  function finish(returned: boolean): void {
    const done = session!;
    session = null; tidy(); hide(); phase('idle');
    const front = returned ? done.from : done.to, left = returned ? done.to : done.from;
    done.after?.(front);
    if (returned) options.setLayer(done.from);
    const maps = options.maps();
    // Let the map that is no longer in front go: its GPU memory is the largest part of what a hand-over keeps alive.
    if (left === 'city') maps.city?.releaseIn(RELEASE_AFTER_MS);
    pressure.settled(now());
    const levelId = maps.world?.diagnostics().levelId;
    announce(front === 'city' ? `Now showing ${options.cityName()}` : `Now showing ${levelId === 'africa' ? 'Africa' : levelId === 'world' ? 'the world' : countryName()}`);
  }
  /** The player went back: before the fade there is nothing to undo on screen; during it the fade runs backwards from where it is. */
  function turnBack(): void {
    const outcome = handoff.reverse(now());
    if (outcome !== 'cancelled') return;
    token += 1; stop(); hide(); phase('idle');
    const was = session; session = null;
    if (layerFlipped && was) { layerFlipped = false; tidy(); options.setLayer(was.from); }
    was?.after?.(was.from);
    pressure.settled(now());
  }
  let layerFlipped = false, entryCarry = 0;
  /** Wait until `ready()` says so, a frame at a time (a map that has to be mounted first), then go on; gives up after `limit` ms. */
  function until(ready: () => boolean, then: () => void, mine: number, limit = 8000): void {
    const began = now();
    const poll = (): void => {
      pollFrame = 0;
      if (destroyed || mine !== token) return;
      if (ready()) { then(); return; }
      if (now() - began > limit) { give(); return; }
      pollFrame = raf(poll);
    };
    poll();
  }
  /** Let the map just entered draw a couple of frames before the fade starts, so its first (heaviest) frame is not part of the fade. */
  function afterFrames(count: number, mine: number, then: () => void): void {
    const step = (): void => {
      pollFrame = 0;
      if (destroyed || mine !== token) return;
      if (count-- <= 0) then(); else pollFrame = raf(step);
    };
    pollFrame = raf(step);
  }
  /** The next map did not arrive: stay where we were, and say so. */
  function give(): void {
    const was = session; session = null; handoff = createHandoff({ reduced: reduced() });
    if (layerFlipped && was) { layerFlipped = false; tidy(); options.setLayer(was.from); }
    was?.after?.(was.from);
    token += 1; pressure.settled(now()); phase('idle');
    show('That map could not be loaded. Check your connection and try again.');
  }

  /** Begin: both maps are alive, `from` in front. */
  function begin(from: Layer, to: Layer, edge: Edge, carry: number): number {
    token += 1; opposed = 0; stop();
    session = { from, to, edge, carry };
    handoff = createHandoff({ reduced: reduced() });
    handoff.begin(from === 'city' ? RUNG('city') : RUNG('country'), to === 'city' ? RUNG('city') : RUNG('country'), edge, false, now());
    layerFlipped = false; phase('loading');
    return token;
  }
  /** Flip the screen to `to`, with the one entered at no opacity until it is ready, the one left kept drawn. */
  function flip(): void {
    const { from, to } = session!;
    layerFlipped = true;
    boxOf(from).classList.add('zl-fading', 'zl-leaving'); boxOf(to).classList.add('zl-fading', 'zl-entering'); boxOf(to).style.opacity = '0';
    options.setLayer(to);
  }

  function leaveCity(carry: number): void {
    const { world } = options.maps(), id = options.cityId();
    if (!world || session) return;
    const mine = begin('city', 'world', 'out', carry);
    const go = (): void => {
      if (mine !== token || !session) return;
      flip();
      // The atlas is measured once it is on screen: arrive over the city after that, then fade.
      until(() => !worldBox.hidden && worldBox.getBoundingClientRect().width > 0, () => {
        world.resize(); world.arriveFrom(id, carry); announce(`Zooming out of ${options.cityName()}`);
        afterFrames(2, mine, () => { handoff.arrived(now()); fade(); });
      }, mine);
    };
    if (world.loaded(id)) { go(); return; }
    show(`Loading the map of ${countryName()}…`, 0, true);
    void world.prepare(id).then((ok) => { if (mine !== token) return; if (ok) { hide(); go(); } else give(); });
  }
  function enterOwn(id: string, carry: number): void {
    const { world } = options.maps();
    if (!world || session) return;
    announce(`Zooming in on ${options.cityName()}`);
    entryCarry = carry;
    world.enterCity(id, { dive: false });       // flies down over it (a gesture: no dive), then the host of the boxes calls fadeTo('city')
  }
  function lookAt(id: string, name: string): void {
    const { world } = options.maps();
    if (!world) return;
    // Looking, not travelling: the overview card of the city, and nothing about the player changes.
    world.lookAt(id);
    pressure.settled(now());
    show(`${name}: looking from afar. You are still in ${options.cityName()}.`);
    announce(`Showing ${name} from afar. You are still in ${options.cityName()}.`);
  }
  function fadeTo(layer: Layer, { carry = entryCarry, descend = 0, after }: { carry?: number; descend?: number; after?: (front: Layer) => void } = {}): boolean {
    if (session || destroyed) return false;
    entryCarry = 0;
    const maps = options.maps(), from: Layer = layer === 'city' ? 'world' : 'city';
    if (layer === 'world') { options.setLayer('world'); return false; }
    const mine = begin(from, layer, 'in', carry);
    if (after) session!.after = after;
    flip();
    // The city map is mounted when it is first shown (or again, if it was let go): wait for it, then come in from its wide end.
    if (!maps.city?.map) show(`Loading ${options.cityName()}…`, 0, true);
    void Promise.resolve(maps.city?.started).then(() => {
      until(() => Boolean(maps.city?.map) && cityBox.getBoundingClientRect().width > 0, () => {
        if (mine !== token || !session) return;
        maps.city?.resize(); maps.city?.enter('in', carry, descend);
        afterFrames(2, mine, () => { hide(); handoff.arrived(now()); fade(); });
      }, mine);
    });
    return true;
  }

  // ---- the ports -----------------------------------------------------------------------------------------------------------------
  /** The player went the other way: back out of a hand-over that is loading or fading (it takes about a notch, so a jitter does not undo it). */
  function intent(direction: Edge, amount = 0): void {
    if (!session) return;
    if (direction === session.edge) { opposed = 0; return; }
    opposed += amount;
    if (opposed >= REVERSE_BY) { opposed = 0; turnBack(); }
  }
  function port(surface: Layer): LadderPort {
    const box = boxOf(surface);
    return {
      intent,
      refused(edge, overflow, at) {
        if (session || destroyed) return;
        const t = now(), beyond = beyondOf(surface, edge, at), state = pressure.push(edge, overflow, t);
        if (state.fired) {
          lean(box, null, 0);
          if (beyond.go) { show(limitHint(edge, beyond.label, beyond.name, beyond.look), 1); beyond.go(state.carry); }
          else { pressure.settled(t - COOLDOWN_MS + 400); show(limitHint(edge, null, beyond.name), 1); announce(limitHint(edge, null, beyond.name)); }
          return;
        }
        lean(box, edge, state.amount);
        show(limitHint(edge, beyond.label, beyond.name, beyond.look), state.amount);
      },
      stepped(edge, at) {
        if (session || destroyed) return;
        const t = now(), beyond = beyondOf(surface, edge, at), state = pressure.step(edge, t);
        if (!state.fired) return;
        if (beyond.go) beyond.go(0);
        else { pressure.settled(t - COOLDOWN_MS + 400); const words = limitHint(edge, null, beyond.name); show(words, 1); announce(words); }
      },
      near(edge) {
        if (session || destroyed) return;
        pressure.relax(); lean(box, null, 0);
        if (!edge) return;
        const beyond = beyondOf(surface, edge, null);
        if (!beyond.label) return;
        // Come close to a limit and the next map is fetched ahead of need, unless the device is weak or saving data.
        if (bodyAllowed()) { const maps = options.maps(); if (surface === 'city' && edge === 'out') void maps.world?.prepare(options.cityId()); else if (surface === 'world' && edge === 'in') maps.city?.warm(); }
        show(limitHint(edge, beyond.label, beyond.name, beyond.look), 0);
      },
      level(words) { announce(words); },
    };
  }
  const cityPort = port('city'), worldPort = port('world');
  return {
    cityPort, worldPort, fadeTo,
    get busy() { return session !== null; },
    destroy() { destroyed = true; stop(); token += 1; delete parent.dataset.ladder; if (chipTimer) clearTimeout(chipTimer); tidy(); chip.remove(); polite.remove(); },
  };
}
