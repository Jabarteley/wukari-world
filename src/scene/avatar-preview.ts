/**
 * OWNER: character
 * The 3D character preview: one canonical skinned avatar on a ground disc,
 * on its own small WebGL canvas. Used wherever a look is edited (character creation, Sim →
 * Profile, the Boutique) through src/ui/panels/look-ui.js, which loads this file — and with it
 * Three.js — only when a preview is first shown.
 *
 *   const preview = createAvatarPreview(host, { look, focus, label, onSpin, onLost });
 *   preview.setLook(look, { react })   rebuild the avatar; one frame (plus a short turn if react)
 *   preview.setFocus('body' | 'head' | 'outfit')  full body, head and shoulders, or the outfit (hips to shoulders, legs to the ankles)
 *   preview.turnBy(radians)            turn the character with a short ease (turnBy(Math.PI) turns it around)
 *   preview.setLabel(text)             the canvas' text alternative
 *   preview.setInset(px)               keep the bottom `px` of the view free of the character (a stage puts its buttons there)
 *   preview.rotate(radians)            turn the character (arrow keys do this when the canvas has focus)
 *   preview.resize()                   re-measure the host; one frame if the size changed
 *   preview.attach(host)               move the canvas into another host element
 *   preview.snapshot()                 a copy of the figure, full length and facing front, drawn at once (a share card); null when nothing can be drawn
 *   preview.diagnostics()              { renderCount, frames, animating, live, lost, disposed, triangles, yaw, focus, lastRenderMs }
 *   preview.dispose()                  free the renderer, geometry, materials and the WebGL context
 *
 * BATTERY RULE: there is no render loop. A frame is drawn when the look, the focus or the size
 * changes and once per pointer or key event while turning. Three things animate, each for a
 * bounded time and then stop by themselves: the ease to rest after a drag is released, the
 * zoom between body and head, and the little turn when an option changes (ANIMATION_LIMIT_MS
 * caps every one of them). They are stepped by one-shot timers, FRAME_MS apart, that are only
 * re-armed while one of them is still running — nothing is ever scheduled while the preview is
 * at rest, and no frame callback or repeating timer is used anywhere. With `reducedMotion` none
 * of them run: the final state is drawn once. diagnostics().renderCount proves it
 * (src/scene/avatar-preview.test.ts).
 *
 * CANONICAL BODY: the preview waits for the shared body and clip assets, then displays only the skinned character.
 * Load failures are shown with an explicit retry action; there is no alternate character renderer.
 *
 * ONE CONTEXT: creating a preview disposes the previous one, so at most one preview WebGL
 * context is alive (previewStats.live). A lost context stops drawing and displays a stage error.
 * The 2D illustration is hidden while this preview owns it. If WebGL cannot be created, the stage
 * shows an error before PreviewUnavailable is thrown.
 */
import type * as THREE from 'three';
import { createKit } from './kit.ts';
import { nativeRecipeForLook } from '../character/native-migration.ts';
import { lazyEnvironment, renderTier } from './look.ts';
import { normalizeLook } from './characters.ts';
import type { ThreeModule } from './types.ts';
import type { SkinnedBody } from './body/skinned.ts';

export const ANIMATION_LIMIT_MS = 600;
const FRAME_MS = 16;
export const previewStats = { live: 0, created: 0, disposed: 0 };
export class PreviewUnavailable extends Error {}

/** Where the camera looks: the height of the centre of the view, and how much must fit. */
export interface PreviewFrame { y: number; height: number; width: number }
export type PreviewFocus = 'body' | 'head' | 'outfit';
/** The options of createAvatarPreview (renderer, raf, caf and now are injected by tests). */
export interface PreviewOptions {
  look?: unknown;
  focus?: PreviewFocus;
  label?: string;
  reducedMotion?: boolean;
  /** Pixels at the bottom of the view kept clear of the character and its ground (see setInset). */
  inset?: number;
  onSpin?: () => void;
  onLost?: () => void;
  renderer?: THREE.WebGLRenderer;
  raf?: (fn: () => void) => number;
  caf?: (id: number) => void;
  now?: () => number;
}
export interface PreviewDiagnostics {
  renderCount: number; frames: number; animating: boolean; live: number; lost: boolean; disposed: boolean;
  triangles: number; yaw: number; focus: PreviewFocus; lastRenderMs: number;
}
/** What createAvatarPreview returns. */
export interface AvatarPreview {
  canvas: HTMLCanvasElement;
  setLook(look: unknown, options?: { react?: boolean }): boolean;
  setFocus(next: string): boolean;
  setInset(px: number): boolean;
  rotate(delta: number): void;
  turnBy(delta: number): void;
  resize(): boolean;
  attach(target: HTMLElement | null | undefined): void;
  setLabel(text: unknown): void;
  snapshot(): HTMLCanvasElement | null;
  diagnostics(): PreviewDiagnostics;
  dispose(): void;
}
/** An animation step: `t` runs 0 … 1, `dt` is ms since the last step; returning false stops it early. */
interface Tween { start: number; last: number; duration: number; step: (t: number, dt: number) => boolean | void }
interface Drag { id: number; x: number; time: number; speed: number; moved?: boolean }

const FRAMES: Record<PreviewFocus, PreviewFrame> = {
  body: { y: 1.47, height: 3.22, width: 1.9 },
  head: { y: 2.26, height: 1.62, width: 1.5 }, // head and shoulders, with room for the tallest hair, a gele or a hat
  outfit: { y: 1.5, height: 2.5, width: 1.9 }, // shoulders to the shoes: what is worn, without the empty space above the hair
};
/** The shipped body's head is much smaller than the procedural figure's; include its face, hair/headwear and shoulders. */
const SKINNED_HEAD_FRAME: PreviewFrame = { y: 2.15, height: 1.05, width: 1.2 };
const FOV = 26, START_YAW = -0.42, DRAG_SPEED = 0.011, KEY_STEP = Math.PI / 12, MAX_PIXEL_RATIO = 2.5;
const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));
const ease = (t: number): number => 1 - (1 - t) ** 3;
let current: AvatarPreview | null = null;

function hideIllustrations(host: HTMLElement | null | undefined): void {
  host?.querySelectorAll<HTMLElement>('.look-avatar').forEach((element) => { element.hidden = true; element.style.display = 'none'; });
}

function showStageMessage(host: HTMLElement | null | undefined, message: string, retry?: () => void): HTMLElement | null {
  if (!host) return null;
  let panel = host.querySelector<HTMLElement>('[data-character-preview-status]');
  if (!panel) {
    panel = document.createElement('div');
    panel.dataset.characterPreviewStatus = '';
    Object.assign(panel.style, {
      position: 'absolute', inset: '12px', zIndex: '3', display: 'grid', placeContent: 'center', justifyItems: 'center',
      gap: '10px', padding: '16px', borderRadius: '12px', color: '#fff', background: 'rgba(18, 25, 32, .88)',
      textAlign: 'center', font: '600 14px/1.45 system-ui, sans-serif',
    });
    if (globalThis.getComputedStyle?.(host).position === 'static') host.style.position = 'relative';
    host.append(panel);
  }
  panel.replaceChildren();
  panel.setAttribute('role', retry ? 'alert' : 'status');
  const text = document.createElement('span'); text.textContent = message; panel.append(text);
  if (retry) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Retry character load';
    button.addEventListener('click', retry, { once: true });
    Object.assign(button.style, { padding: '8px 14px', borderRadius: '8px', border: '1px solid #d6dedf', background: '#fff', color: '#18212a', font: 'inherit', cursor: 'pointer' });
    panel.append(button);
  }
  panel.hidden = false;
  panel.style.display = 'grid';
  return panel;
}

function clearStageMessage(host: HTMLElement | null | undefined): void {
  const panel = host?.querySelector<HTMLElement>('[data-character-preview-status]');
  if (panel) { panel.hidden = true; panel.style.display = 'none'; }
}

/** Key, fill and rim lights for a character on a pale backdrop. Returns the lights it added. */
export function lightStage(THREE: ThreeModule, scene: THREE.Scene): THREE.Light[] {
  // Tuned on the whole skin range: enough light from the front that the darkest tones keep their features.
  const hemi = new THREE.HemisphereLight('#ffffff', '#e6d2bb', 1.85);
  const key = new THREE.DirectionalLight('#ffeedb', 2.5); key.position.set(2.4, 3.6, 5);
  const fill = new THREE.DirectionalLight('#d6e4ff', 1.1); fill.position.set(-4, 2.4, 3.4);
  const rim = new THREE.DirectionalLight('#f4f8ff', 2.4); rim.position.set(-1.8, 3.8, -4.2);
  const lights = [hemi, key, fill, rim];
  lights.forEach((light) => scene.add(light));
  return lights;
}

/** The ground disc and a soft baked contact shadow (a generated texture; no shadow map). */
export function buildGround(THREE: ThreeModule): { group: THREE.Group; dispose(): void } {
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(item: T): T => { disposables.push(item); return item; };
  // Two soft blobs: a wide faint one for the body and a tight dark one where the feet touch.
  const size = 96, data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const d = Math.hypot((i + 0.5) / size - 0.5, (j + 0.5) / size - 0.5) * 2;
    const wide = clamp(1 - d, 0, 1) ** 1.8 * 95, tight = clamp(1 - d / 0.42, 0, 1) ** 1.3 * 120;
    data.set([14, 18, 24, Math.round(Math.min(215, wide * 1.15 + tight * 1.2))], (j * size + i) * 4);
  }
  const texture = keep(new THREE.DataTexture(data, size, size, THREE.RGBAFormat));
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearFilter; texture.needsUpdate = true;
  const shadow = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.9, 1.5)), keep(new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, 0.006, 0.03);
  // A pedestal that melts into the backdrop: warm stone, opaque in the middle, fading to nothing at the edge.
  const fade = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const d = Math.hypot((i + 0.5) / size - 0.5, (j + 0.5) / size - 0.5) * 2, v = Math.round(255 * clamp((1 - d) / 0.32, 0, 1) ** 1.2);
    fade.set([v, v, v, 255], (j * size + i) * 4);
  }
  const alpha = keep(new THREE.DataTexture(fade, size, size, THREE.RGBAFormat));
  alpha.magFilter = THREE.LinearFilter; alpha.minFilter = THREE.LinearFilter; alpha.needsUpdate = true;
  const disc = new THREE.Mesh(keep(new THREE.CircleGeometry(1.5, 56)), keep(new THREE.MeshStandardMaterial({ color: '#d8d0c6', roughness: 1, alphaMap: alpha, transparent: true, opacity: 0.92, depthWrite: false })));
  disc.rotation.x = -Math.PI / 2;
  const rim = new THREE.Mesh(keep(new THREE.RingGeometry(1.0, 1.04, 64)), keep(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, depthWrite: false })));
  rim.rotation.x = -Math.PI / 2; rim.position.y = 0.004;
  disc.renderOrder = 0; shadow.renderOrder = 1; rim.renderOrder = 2; // the transparent layers draw bottom to top
  group.add(rim, disc, shadow);
  return { group, dispose() { group.parent?.remove(group); disposables.forEach((item) => item.dispose()); disposables.length = 0; } };
}

/** Place a camera so a frame (FRAMES entry, or a blend of two) fits the given aspect ratio. */
export function frameCamera(camera: THREE.PerspectiveCamera, frame: PreviewFrame, aspect: number): void {
  const half = Math.tan(camera.fov * Math.PI / 360);
  const distance = Math.max(frame.height / 2 / half, frame.width / 2 / (half * aspect));
  camera.aspect = aspect;
  camera.position.set(0, frame.y + distance * 0.1, distance);
  camera.lookAt(0, frame.y, 0);
  camera.updateProjectionMatrix();
}

function makeRenderer(THREE: ThreeModule): THREE.WebGLRenderer {
  const canvas = document.createElement('canvas');
  const options: WebGLContextAttributes = { alpha: true, antialias: true, powerPreference: 'low-power' };
  let context: WebGL2RenderingContext | null = null;
  try { context = canvas.getContext('webgl2', options); } catch { context = null; }
  if (!context) throw new PreviewUnavailable('WebGL is not available');
  return new THREE.WebGLRenderer({ canvas, context, ...options });
}

/**
 * options: { look, focus, label, reducedMotion, onSpin(), onLost(),
 *            renderer, raf, caf, now (injected by tests) }
 */
export function createAvatarPreview(host: HTMLElement | null | undefined, options: PreviewOptions = {}): AvatarPreview {
  hideIllustrations(host);
  current?.dispose();
  const kit = createKit();
  const { THREE } = kit;
  let renderer: THREE.WebGLRenderer;
  try { renderer = options.renderer || makeRenderer(THREE); } catch (error) {
    kit.dispose();
    showStageMessage(host, 'The character preview could not start. Check WebGL support and retry.', () => globalThis.location?.reload());
    throw error;
  }
  // The next step of a running animation: a one-shot timer (tests inject a hand-cranked one).
  const raf = options.raf || ((fn: () => void) => globalThis.setTimeout(fn, FRAME_MS) as unknown as number);
  const caf = options.caf || ((id: number) => globalThis.clearTimeout(id));
  const now = options.now || (() => globalThis.performance.now());
  const reduced = options.reducedMotion ?? !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  previewStats.live += 1; previewStats.created += 1;

  const canvas = renderer.domElement;
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // The same tone mapping as the scenes (src/scene/look.ts), so the figure made here is the figure seen there.
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1;
  if (canvas.style) Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%', touchAction: 'pan-y', cursor: 'grab', outline: 'none' });
  canvas.setAttribute?.('tabindex', '0');
  canvas.setAttribute?.('role', 'img');
  canvas.setAttribute?.('aria-roledescription', '3D preview; use the left and right arrow keys to turn it');
  canvas.classList?.add('look-canvas');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
  lightStage(THREE, scene);
  // High tier: the generated environment map gives skin and cloth a softer response; one redraw when it lands, no idle loop.
  if (renderTier().env) lazyEnvironment(THREE, scene, () => render(), 0.15);
  const ground = buildGround(THREE);
  const turntable = new THREE.Group();
  scene.add(ground.group, turntable);

  let lookKey = '', renderCount = 0, frames = 0, disposed = false, lost = false, lastMs = 0;
  const asFocus = (value: unknown): PreviewFocus => (value === 'head' || value === 'outfit' ? value : 'body');
  let inset = Math.max(0, options.inset ?? 0), yaw = START_YAW, focus: PreviewFocus = asFocus(options.focus), shown: PreviewFrame = { ...FRAMES[focus] };
  let size = { width: 0, height: 0 }, frameId = 0;
  const tweens = new Map<string, Tween>(); // name → { start, duration, step(t, dt) → false to stop early, last }
  let previewProportions = {height:1,width:1};
  let activeHost = host;
  let body: SkinnedBody | null = null, bodyLook: unknown = null, lookGeneration = 0;
  let bodyModule: typeof import('./body/skinned.ts') | null = null;
  let bodyModulePromise: Promise<typeof import('./body/skinned.ts')> | null = null;

  let dressTask: Promise<void> = Promise.resolve();

  const targetFrame = (next: PreviewFocus): PreviewFrame => next === 'head' && body ? SKINNED_HEAD_FRAME : FRAMES[next];
  function moveFrame(to: PreviewFrame): void {
    const from = { ...shown };
    animate('zoom', 340, (t: number) => {
      const k = ease(t);
      shown = { y: from.y + (to.y - from.y) * k, height: from.height + (to.height - from.height) * k, width: from.width + (to.width - from.width) * k };
    });
  }

  /** Preview the same dressed body and action rig used throughout the world. */
  function dress(look: unknown, generation: number): void {
    bodyLook = look;
    previewProportions = {height:nativeRecipeForLook(look,'preview').appearance.height,width:1};
    // Serialize swaps so a rapidly edited preview owns only one rig.
    dressTask = dressTask.then(async () => {
      if (disposed || generation !== lookGeneration) return;
      if (body && body.wear(look, 'preview')) {
        body.place(0, 0, 0, 0);
        clearStageMessage(activeHost);
        render();
        return;
      }
      body?.dispose(); body = null;
      showStageMessage(activeHost, 'Loading the shared character model and animation assets…');
      render();
      bodyModulePromise ??= import('./body/skinned.ts').then((module) => { bodyModule = module; return module; });
      const loaded = await (await bodyModulePromise).loadBody(kit, look, 'preview', 1);
      if (disposed || generation !== lookGeneration) { loaded.dispose(); return; }
      body = loaded;
      turntable.add(body.object);
      body.place(0, 0, 0, 0);
      clearStageMessage(activeHost);
      if (focus === 'head') moveFrame(targetFrame(focus)); else render();
    }).catch((error: unknown) => {
      if (disposed || generation !== lookGeneration) return;
      if (!bodyModule) bodyModulePromise = null;
      const detail = error instanceof Error ? error.message : String(error);
      showStageMessage(activeHost, `The shared character assets could not load. ${detail}`, () => dress(bodyLook, lookGeneration));
    });
  }

  function frame() {
    // The subject sits in the top part of the view; the inset below it is left empty (the ground's front edge and a stage's buttons).
    const reserved = clamp(inset / Math.max(1, size.height), 0, 0.45);
    const height = shown.height / (1 - reserved);
    // Keep a shared body ruler: refitting to every height edit hides its effect.
    const framingScale = focus === 'head' ? 1 : 1.15;
    const centreScale = focus === 'head' ? previewProportions.height : framingScale;
    frameCamera(camera, { y: (shown.y + shown.height / 2 - height / 2) * centreScale, height: height * framingScale, width: shown.width * framingScale }, size.width / Math.max(1, size.height) || 1);
  }
  function render() {
    if (disposed || lost || !size.width || !size.height) return;
    turntable.rotation.y = yaw + (turntable.userData.swing || 0);
    frame();
    const started = now();
    renderer.render(scene, camera);
    lastMs = now() - started;
    renderCount += 1;
    if (canvas.dataset) canvas.dataset.renders = String(renderCount);
  }
  function tick() {
    frameId = 0;
    if (disposed) return;
    const time = now();
    for (const [name, tween] of tweens) {
      const t = clamp((time - tween.start) / tween.duration, 0, 1);
      const more = tween.step(t, Math.min(48, time - tween.last));
      tween.last = time;
      if (t >= 1 || more === false) tweens.delete(name);
    }
    frames += 1;
    render();
    if (tweens.size) frameId = raf(tick);
  }
  /** Run `step` for at most `duration` ms (never more than ANIMATION_LIMIT_MS), then stop. */
  function animate(name: string, duration: number, step: Tween['step']): void {
    if (reduced) { step(1, 0); tweens.delete(name); render(); return; }
    const start = now();
    tweens.set(name, { start, last: start, duration: Math.min(duration, ANIMATION_LIMIT_MS), step });
    if (!frameId) frameId = raf(tick);
  }
  function stop(name: string): void {
    tweens.delete(name);
    if (!tweens.size && frameId) { caf(frameId); frameId = 0; }
  }

  function resize() {
    if (disposed) return false;
    const box = canvas.parentElement || host;
    const width = Math.round(box?.clientWidth || 0), height = Math.round(box?.clientHeight || 0);
    if (!width || !height || (width === size.width && height === size.height)) return false;
    size = { width, height };
    renderer.setSize(width, height, false);
    render();
    return true;
  }
  function setLook(look: unknown, { react = false }: { react?: boolean } = {}): boolean {
    if (disposed) return false;
    const key = JSON.stringify(look ?? null);
    if (key === lookKey) return false;
    const previousRecipe = nativeRecipeForLook(bodyLook, 'preview');
    const nextRecipe = nativeRecipeForLook(look, 'preview');
    const heightOnly = previousRecipe.appearance.height !== nextRecipe.appearance.height
      && JSON.stringify({ ...previousRecipe, appearance: { ...previousRecipe.appearance, height: 1 } })
        === JSON.stringify({ ...nextRecipe, appearance: { ...nextRecipe.appearance, height: 1 } });
    lookKey = key;
    const generation = ++lookGeneration;
    dress(look, generation);
    if (heightOnly) { stop('react'); turntable.userData.swing = 0; turntable.position.y = 0; }
    if (react && !reduced && !heightOnly) {
      // A small turn and settle, so a change is felt as well as seen.
      animate('react', 420, (t: number) => { turntable.userData.swing = Math.sin(t * Math.PI) * (1 - t) * 0.55; turntable.position.y = Math.sin(t * Math.PI) * 0.035; });
    } else render();
    return true;
  }
  function setFocus(next: string): boolean {
    const wanted = asFocus(next);
    if (disposed || wanted === focus) return false;
    focus = wanted;
    moveFrame(targetFrame(wanted));
    return true;
  }
  function setInset(px: number): boolean {
    const next = Math.max(0, Math.round(px));
    if (disposed || next === inset) return false;
    inset = next;
    render();
    return true;
  }
  function rotate(delta: number): void {
    if (disposed || !delta) return;
    stop('inertia');
    yaw += delta;
    render();
  }

  /** Turn by `delta` radians with a short ease (bounded like every animation here); with reduced motion, at once. */
  function turnBy(delta: number): void {
    if (disposed || !delta) return;
    stop('inertia');
    const from = yaw;
    animate('turn', 420, (t: number) => { yaw = from + delta * ease(t); });
  }

  // Drag to spin: one frame per pointer event, then a short ease to rest.
  let drag: Drag | null = null;
  const listeners: [string, EventListener, AddEventListenerOptions | undefined][] = [];
  const on = <E extends Event>(type: string, fn: (event: E) => void, opts?: AddEventListenerOptions) => { canvas.addEventListener?.(type, fn as EventListener, opts); listeners.push([type, fn as EventListener, opts]); };
  on<PointerEvent>('pointerdown', (event) => {
    if (event.button > 0 || drag) return;
    stop('inertia');
    drag = { id: event.pointerId, x: event.clientX, time: now(), speed: 0 };
    try { canvas.setPointerCapture?.(event.pointerId); } catch { /* not capturable */ }
    if (canvas.style) canvas.style.cursor = 'grabbing';
  });
  on<PointerEvent>('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x, time = now(), dt = Math.max(1, time - drag.time);
    if (!dx) return;
    drag.speed = drag.speed * 0.4 + (dx * DRAG_SPEED / dt) * 0.6;
    drag.x = event.clientX; drag.time = time;
    if (!drag.moved) { drag.moved = true; options.onSpin?.(); }
    yaw += dx * DRAG_SPEED;
    render();
  });
  const release = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    try { canvas.releasePointerCapture?.(event.pointerId); } catch { /* already released */ }
    if (canvas.style) canvas.style.cursor = 'grab';
    let speed = now() - drag.time > 90 ? 0 : clamp(drag.speed, -0.02, 0.02); // radians per ms
    drag = null;
    if (reduced || event.type === 'pointercancel' || Math.abs(speed) < 0.0012) return;
    animate('inertia', 520, (t: number, dt: number) => {
      yaw += speed * dt;
      speed *= Math.exp(-dt / 130);
      return Math.abs(speed) > 0.0002;
    });
  };
  on<PointerEvent>('pointerup', release); on<PointerEvent>('pointercancel', release);
  on<KeyboardEvent>('keydown', (event) => {
    const turn = event.key === 'ArrowLeft' ? -KEY_STEP : event.key === 'ArrowRight' ? KEY_STEP : 0;
    if (turn) { event.preventDefault(); options.onSpin?.(); rotate(turn); }
    else if (event.key === 'Home') { event.preventDefault(); stop('inertia'); yaw = START_YAW; render(); }
  });
  on<Event>('webglcontextlost', (event) => {
    event.preventDefault?.();
    lost = true; tweens.clear();
    if (frameId) { caf(frameId); frameId = 0; }
    showStageMessage(activeHost, 'The character preview lost its WebGL context. Retry when the browser is ready.', () => {
      const extension = renderer.getContext().getExtension('WEBGL_lose_context') as { restoreContext?: () => void } | null;
      if (extension?.restoreContext) extension.restoreContext(); else globalThis.location?.reload();
    });
    options.onLost?.();
  });
  on('webglcontextrestored', () => { lost = false; clearStageMessage(activeHost); render(); });

  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => resize()) : null;
  function attach(target: HTMLElement | null | undefined): void {
    if (disposed || !target) return;
    if (activeHost !== target) activeHost?.querySelector<HTMLElement>('[data-character-preview-status]')?.remove();
    activeHost = target;
    hideIllustrations(target);
    if (canvas.parentElement !== target) target.appendChild(canvas);
    observer?.disconnect();
    observer?.observe(target);
    resize();
  }

  /** The figure as it stands, full length and facing front, copied into a 2D canvas straight after a frame is drawn (a WebGL canvas is blank once the task ends). Whatever is on screen is drawn again afterwards. */
  function snapshot(): HTMLCanvasElement | null {
    if (disposed || lost || !size.width || !size.height) return null;
    const keep = { shown, inset, focus, yaw };
    shown = { ...FRAMES.body }; inset = 0; focus = 'body'; yaw = START_YAW;
    try {
      render();
      const copy = document.createElement('canvas');
      copy.width = canvas.width; copy.height = canvas.height;
      const ctx = copy.getContext('2d');
      if (!ctx || !copy.width) return null;
      ctx.drawImage(canvas, 0, 0);
      return copy;
    } finally {
      shown = keep.shown; inset = keep.inset; focus = keep.focus; yaw = keep.yaw;
      render();
    }
  }

  const api: AvatarPreview = {
    canvas, setLook, setFocus, setInset, rotate, turnBy, resize, attach, snapshot,
    setLabel(text: unknown) { canvas.setAttribute?.('aria-label', String(text ?? '')); },
    diagnostics: () => ({ renderCount, frames, animating: tweens.size > 0 || frameId !== 0, live: previewStats.live, lost, disposed, triangles: renderer.info.render.triangles, yaw, focus, lastRenderMs: Math.round(lastMs * 10) / 10 }),
    dispose() {
      if (disposed) return;
      disposed = true;
      lookGeneration += 1;
      if (current === api) current = null;
      tweens.clear();
      if (frameId) { caf(frameId); frameId = 0; }
      observer?.disconnect();
      for (const [type, fn, opts] of listeners) canvas.removeEventListener?.(type, fn, opts);
      listeners.length = 0;
      body?.dispose(); body = null;
      activeHost?.querySelector<HTMLElement>('[data-character-preview-status]')?.remove();
      ground.dispose();
      kit.dispose(); // the avatar's geometry and the shared materials
      renderer.dispose();
      try { renderer.forceContextLoss?.(); } catch { /* the context is already gone */ }
      canvas.remove?.();
      previewStats.live -= 1; previewStats.disposed += 1;
    },
  };
  current = api;
  api.setLabel(options.label ?? 'Preview of your character');
  setLook(options.look);
  if (host) attach(host);
  return api;
}
