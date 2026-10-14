/**
 * OWNER: scenes
 * On-screen controls for the scene, for touch and for anyone who prefers buttons: zoom in, zoom
 * out, recentre the camera, a virtual joystick (shown on touch devices only) and a one-time hint.
 * They live inside the scene container, under the HUD overlay, and are placed with the same
 * insets the host uses to centre the scene — so they sit in the part of the screen the HUD
 * leaves free and never under the bottom sheet.
 *
 * Clean screen (the shell's `is-clean` class) hides everything here except the joystick.
 * Nothing here runs on a timer: the joystick only reports pointer events to the host.
 *
 * THE HINT teaches one thing at a time and then leaves. teach([{ id, text }, …]) gives the lessons
 * in order (walk, then look); the first one not yet learned is shown, and learned(id) — called by
 * the host the moment the player actually does that thing — retires it and brings up the next.
 * Each lesson is remembered on the device, so it is never shown again; × retires them all. On a
 * wide screen it is a pill under the top bar; on a phone it sits in the free band at the bottom of
 * the scene, between the joystick and the zoom buttons — next to the control it talks about, and
 * never over the avatar or the HUD's rows.
 *
 * createSceneControls(container, { onZoom(direction), onRecentre(), onStick(x, forward, jog) })
 *   → { place({ top, bottom, wide, hintTop }), touch(on), teach(lessons), learned(id), hint(text | null), dispose() }, or null without a DOM.
 *
 * Its styles are ./controls.css, imported by the two hosts that create these controls (the venue scene's adapter and the street host),
 * so they ship as a stylesheet, not as text in the script.
 */
const HINT_KEY = 'joinallworld-move-hint';
const ICON_HOME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/></svg>';

export interface SceneLesson { id: string; text: string }
export interface SceneControlsOptions {
  onZoom?: (direction: number) => void;
  onRecentre?: () => void;
  onStick?: (right: number, forward: number, jog: boolean) => void;
}
export interface SceneControls {
  root: HTMLElement;
  place(insets?: { top?: number; bottom?: number; wide?: boolean; hintTop?: number }): void;
  touch(on: unknown): void;
  readonly isTouch: boolean;
  hint(text: string | null | undefined): void;
  teach(list: Array<SceneLesson | null | undefined> | null | undefined): void;
  learned(id: string): void;
  readonly lesson: string | null;
  release(): void;
  dispose(): void;
}

export function createSceneControls(container: HTMLElement | null | undefined, { onZoom, onRecentre, onStick }: SceneControlsOptions = {}): SceneControls | null {
  const doc = globalThis.document;
  if (!doc?.createElement || !container?.appendChild) return null;
  const root = doc.createElement('div');
  root.className = 'scene-controls';
  root.innerHTML = `<div class="scene-stick" aria-hidden="true"><i></i></div>
    <div class="scene-pad" role="group" aria-label="Camera">
      <button type="button" data-scene="zoom-in" aria-label="Zoom in" title="Zoom in (+)">+</button>
      <button type="button" data-scene="zoom-out" aria-label="Zoom out" title="Zoom out (−)">−</button>
      <button type="button" data-scene="recentre" aria-label="Reset the camera view" title="Reset view (0)">${ICON_HOME}</button>
    </div>
    <p class="scene-hint" role="note" hidden><span></span><button type="button" data-scene="hint-off" aria-label="Hide this tip">×</button></p>`;
  container.appendChild(root);
  const stick = root.querySelector<HTMLElement>('.scene-stick')!, knob = stick.firstElementChild as HTMLElement, hint = root.querySelector<HTMLElement>('.scene-hint')!;
  let seen = false;
  try { seen = globalThis.localStorage?.getItem(HINT_KEY) === '1'; } catch { seen = false; }

  const remember = (key: string) => { try { globalThis.localStorage?.setItem(key, '1'); } catch { /* shown again next visit */ } };
  const known = (key: string) => { try { return globalThis.localStorage?.getItem(key) === '1'; } catch { return false; } };
  let lessons: SceneLesson[] = [], showing: string | null = null;
  /** Retire every lesson for good (the × button, or hint(null)). */
  function hideHint() {
    for (const lesson of lessons) remember(`${HINT_KEY}:${lesson.id}`);
    lessons = []; showing = null;
    if (hint.hidden) return;
    hint.hidden = true; seen = true;
    remember(HINT_KEY);
  }
  /** Show the first lesson that has not been learned, or nothing. */
  function showLesson() {
    const next = seen ? null : lessons.find((lesson) => !known(`${HINT_KEY}:${lesson.id}`)) || null;
    showing = next?.id ?? null;
    if (!next) { hint.hidden = true; return; }
    hint.firstElementChild!.textContent = next.text;
    hint.hidden = false;
  }
  root.addEventListener('click', (event) => {
    const action = (event.target as Element | null)?.closest?.<HTMLElement>('[data-scene]')?.dataset.scene;
    if (action === 'zoom-in') onZoom?.(1);
    else if (action === 'zoom-out') onZoom?.(-1);
    else if (action === 'recentre') onRecentre?.();
    else if (action === 'hint-off') hideHint();
  });

  // The joystick: a drag from its centre, reported as right / forward in −1…1. Full deflection jogs.
  let stickPointer: number | null = null;
  const REACH = 36;
  function stickMove(event: PointerEvent) {
    if (event.pointerId !== stickPointer) return;
    const box = stick.getBoundingClientRect();
    let dx = event.clientX - (box.left + box.width / 2), dy = event.clientY - (box.top + box.height / 2);
    const size = Math.hypot(dx, dy);
    if (size > REACH) { dx *= REACH / size; dy *= REACH / size; }
    knob.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`;
    const dead = size < 6;
    onStick?.(dead ? 0 : dx / REACH, dead ? 0 : -dy / REACH, size >= REACH * 0.97);
    event.preventDefault();
  }
  function stickEnd(event: PointerEvent) {
    if (event.pointerId !== stickPointer) return;
    stickPointer = null;
    try { stick.releasePointerCapture?.(event.pointerId); } catch { /* already released */ }
    knob.style.transform = '';
    onStick?.(0, 0, false);
  }
  stick.addEventListener('pointerdown', (event) => {
    if (stickPointer !== null) return;
    stickPointer = event.pointerId;
    try { stick.setPointerCapture?.(event.pointerId); } catch { /* not capturable */ }
    stickMove(event);
  });
  stick.addEventListener('pointermove', stickMove);
  stick.addEventListener('pointerup', stickEnd);
  stick.addEventListener('pointercancel', stickEnd);
  stick.addEventListener('lostpointercapture', stickEnd);

  const controls: SceneControls = {
    root,
    /** Where the HUD leaves room: CSS pixels covered at the top and the bottom; wide = the bottom corners are free. */
    place({ top = 0, bottom = 0, wide = false, hintTop = 0 } = {}) {
      root.style.setProperty('--sc-top', `${Math.round(top + 8)}px`);
      root.style.setProperty('--sc-hint-top', `${Math.round(Math.max(top, hintTop) + 8)}px`);
      root.style.setProperty('--sc-bottom', `${Math.round(wide ? 16 : bottom + 10)}px`);
      root.classList.toggle('is-narrow', !wide);
    },
    touch(on) { root.classList.toggle('is-touch', Boolean(on)); },
    get isTouch() { return root.classList.contains('is-touch'); },
    /** Show the one-time hint (never again once dismissed or once the player has moved). */
    hint(text) {
      if (!text) { hideHint(); return; }
      if (seen) return;
      hint.firstElementChild!.textContent = text;
      hint.hidden = false;
    },
    /** The lessons, in the order they are taught: [{ id, text }]. Shows the first one not yet learned. */
    teach(list) { lessons = Array.isArray(list) ? list.filter((lesson): lesson is SceneLesson => Boolean(lesson?.id && lesson.text)) : []; showLesson(); },
    /** The player just did this: retire that lesson and bring up the next. A lesson that is not the one showing is simply remembered. */
    learned(id) {
      if (!lessons.some((lesson) => lesson.id === id) || known(`${HINT_KEY}:${id}`)) return;
      remember(`${HINT_KEY}:${id}`);
      if (showing === id) showLesson();
    },
    get lesson() { return showing; },
    release() { if (stickPointer !== null) { stickPointer = null; knob.style.transform = ''; } },
    dispose() { root.remove(); },
  };
  return controls;
}
