import * as THREE from 'three';
import { applyRendererLook, renderTier } from '../../look.ts';
import { createOuterHostFixture, observeRenderer, readOuterCalibration, assertExpectedOuterCalibration } from '../measure-outer-host.ts';
import type { SceneVenue } from '../../types.ts';
import type { OuterCalibration } from '../measure-outer-host.ts';
import type { NativeReferences } from './native-reference.ts';
import type { SignWitness } from './sign-proof.ts';
import type { VenueWorld } from '../../../venue-world.ts';

function requiredElement(id: string): HTMLElement {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing sample element ${id}`);
  return value;
}
const container = requiredElement('viewport'), status = requiredElement('status'), output = requiredElement('evidence');
let host: VenueWorld | undefined, renderer: THREE.WebGLRenderer | undefined;
let observer: ReturnType<typeof observeRenderer> | undefined, outer: ReturnType<typeof createOuterHostFixture> | undefined;
let calibration: OuterCalibration | undefined, disposed = false;
let refresh = async () => {}, reset = () => {}, walkToMarket = async () => {};
let walkReceipt: unknown = null, nativeReferences: NativeReferences | undefined;
const errors: string[] = [];
let evidence: unknown;
function publish(value: unknown) { evidence = value; output.textContent = JSON.stringify(value, null, 2); }
function fail(error: unknown) { errors.push(String(error)); status.textContent = `Sample failed: ${String(error)}`; publish({ status: 'failed', errors, previous: evidence }); }
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
async function bounded<T>(promise: Promise<T>, label: string, ms = 120_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms); })]); }
  finally { if (timer !== undefined) clearTimeout(timer); }
}
async function json(url: string): Promise<unknown> {
  const response = await fetch(url); check(response.ok, `${url}: HTTP ${response.status}`); return response.json();
}
function modeOf(value: unknown): 'calibration' | 'scene' {
  check(value !== null && typeof value === 'object' && 'mode' in value, 'Invalid sample manifest');
  check(value.mode === 'calibration' || value.mode === 'scene', 'Invalid sample mode');
  return value.mode;
}
function dispose() {
  if (disposed) return;
  disposed = true; window.removeEventListener('resize', resize);
  host?.dispose(); nativeReferences?.dispose(); nativeReferences = undefined; outer?.dispose(); observer?.dispose();
  if (!host) renderer?.dispose();
  renderer?.forceContextLoss(); renderer?.domElement.remove();
}
function resize() { if (!disposed && host) host.resize(); }
window.addEventListener('pagehide', dispose, { once: true });
window.addEventListener('resize', resize);
window.addEventListener('error', event => { errors.push(event.message); });
window.addEventListener('unhandledrejection', event => { errors.push(String(event.reason)); });
requiredElement('refresh').addEventListener('click', () => { void refresh().catch(fail); });
requiredElement('reset').addEventListener('click', () => reset());
requiredElement('walk').addEventListener('click', () => { void walkToMarket().catch(fail); });
Object.defineProperty(window, 'recipeSample', { value: { evidence: () => evidence, refresh: () => refresh(), dispose }, configurable: true });

function canvasSizing(value: THREE.WebGLRenderer, camera: THREE.Camera) {
  const box = container.getBoundingClientRect(), canvas = value.domElement, rect = canvas.getBoundingClientRect(), ratio = value.getPixelRatio();
  const expectedBuffer = [Math.floor(container.clientWidth * ratio), Math.floor(container.clientHeight * ratio)];
  const aspect = camera instanceof THREE.PerspectiveCamera ? camera.aspect : null;
  const matches = Math.abs(rect.width - box.width) < 1 && Math.abs(rect.height - box.height) < 1
    && canvas.width === expectedBuffer[0] && canvas.height === expectedBuffer[1]
    && aspect !== null && Math.abs(aspect - container.clientWidth / container.clientHeight) < 1e-8;
  return { container: { width: box.width, height: box.height }, css: { width: rect.width, height: rect.height },
    buffer: [canvas.width, canvas.height], expectedBuffer, pixelRatio: ratio, cameraAspect: aspect, matches };
}
function createRenderer() {
  const value = new THREE.WebGLRenderer({ antialias: true });
  applyRendererLook(THREE, value, renderTier());
  value.setSize(container.clientWidth, container.clientHeight, false);
  renderer = value; observer = observeRenderer(value);
  return value;
}
async function runCalibration(manifest: unknown) {
  status.textContent = 'Rendering the actual outer ground and background…';
  const value = createRenderer(), scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(43, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(10, 12, 16); camera.lookAt(0, 0, 0);
  outer = createOuterHostFixture(scene);
  // Light affects calibration pixels only; neither the sky plane nor ground casts a shadow.
  scene.add(new THREE.HemisphereLight('#ffffff', '#655a49', 2));
  container.appendChild(value.domElement);
  refresh = async () => {
    check(!disposed, 'Sample disposed');
    value.setSize(container.clientWidth, container.clientHeight, false);
    camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix();
    value.render(scene, camera);
    const frame = observer?.latest(); check(frame && outer, 'No actual renderer frame');
    calibration = readOuterCalibration(frame.receipt, outer.ground.mesh.uuid, (outer.ground.mesh.geometry.index?.count ?? 0) / 3);
    publish({ status: 'rendered-calibration', scope: 'Actual WebGL outer-host resources only; no recipe/native/visual approval', manifest, calibration,
      sizing: canvasSizing(value, camera), render: { three: THREE.REVISION, tier: renderTier(), contextLost: value.getContext().isContextLost(), memory: { ...value.info.memory } }, errors });
    assertExpectedOuterCalibration(calibration);
    status.textContent = 'Actual outer-host counters match the proposed allowance. Canonical input has not been changed.';
  };
  reset = () => { camera.position.set(10, 12, 16); camera.lookAt(0, 0, 0); void refresh().catch(fail); };
  await refresh();
}

async function settleNative(scene: THREE.Scene) {
  const seen = new Set<Promise<unknown>>();
  let idle = 0;
  for (let cycle = 0; cycle < 32 && idle < 2; cycle++) {
    check(!disposed, 'Sample disposed while preparing native actors');
    const tasks: Promise<unknown>[] = [];
    scene.traverse(node => {
      const ready: unknown = node.userData.ready;
      if (ready instanceof Promise && !seen.has(ready)) { seen.add(ready); tasks.push(ready); }
    });
    if (tasks.length) {
      idle = 0; await bounded(Promise.all(tasks), 'Native actor readiness');
      check(!disposed, 'Sample disposed while settling native actors');
      scene.traverse(node => { const update: unknown = node.userData.refreshCharacterCosts; if (typeof update === 'function') update(); });
    } else { idle++; await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }
  }
  check(idle >= 2, 'Native readiness did not settle within 32 passes');
}

async function freshHostFrame() {
  check(host && observer && !disposed, 'No active sample host');
  const previous = observer.latest();
  host.captureCanvas();
  // Shader warmup may defer the real render; never certify counters from the preceding frame.
  for (let attempt = 0; attempt < 600; attempt++) {
    check(!disposed, 'Sample disposed while awaiting a rendered frame');
    const frame = observer.latest();
    if (frame && frame !== previous && frame.scene.getObjectByName('recipe:accra-market-game')) return frame;
    await new Promise<void>(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Actual host did not produce a fresh recipe frame within 30 seconds');
}

async function runScene(manifest: unknown) {
  status.textContent = 'Validating the complete Accra pack and decoding the selected real assets…';
  const [{ loadCityContent, cityContent }, { loadCityScenes }, { parseRecipePack }, { preloadLooks }, { DEFAULT_LOOK }, { createVenueHost }, { measureRenderCost }, { parseCityRecipes }, { recipeAssets }, { spotsOf }, { screenText }, { createWalkGrid }, { assertSampleExpectation }, { prepareNativeReferences }, { proveRecipeGeometry, proveNativeResidents, proveRecipeTextures }] = await Promise.all([
    import('../../../game/cities/registry.ts'), import('../../city-scenes.ts'), import('../pack.ts'),
    import('../../character-lab/native-body.ts'), import('../../../game/content/traits.ts'), import('../../../venue-world.ts'), import('../../body/render-cost.ts'),
    import('../contract.ts'), import('../prepare.ts'), import('../../../life.ts'), import('../../../../server/moderation/text.ts'), import('../../walk-grid.ts'),
    import('./expectation.ts'), import('./native-reference.ts'), import('./proof.ts'),
  ]);
  const pack = await parseRecipePack(await json('/__recipe-sample/pack.json'), 'accra');
  await loadCityContent('accra'); await bounded(loadCityScenes('accra'), 'Actual recipe and image preparation');
  const targets: SceneVenue[] = cityContent('accra').venues.filter(v => pack.metadata.targetVenueIds.includes(v.id)).map(v => ({ ...v.definition,
    scene: { ...v.definition.scene, spots: spotsOf(v.id, 'accra').map(s => ({ id: s.id, label: s.label })) } }));
  const parsed = parseCityRecipes(pack.text, { city: 'accra', venues: targets, assets: { kit: pack.metadata.assets.kit.measurement, hero: pack.metadata.assets.hero!.measurement }, hostScenery: pack.metadata.hostScenery, screenText });
  const checked = parsed.recipes.find(v => v.recipe.venue === 'accra-market-game'); check(checked, 'Missing actual Makola recipe'); assertSampleExpectation(checked, pack.metadata);
  const prepared = await recipeAssets.prepareCity(pack.metadata), walkGrid = createWalkGrid(checked.walk);
  const people = Array.from({ length: 12 }, (_, i) => ({ id: `recipe-resident-${i}`, name: `Resident ${i}`, kind: 'player', look: DEFAULT_LOOK, seed: `recipe-resident-${i}` }));
  const player = { name: 'Sample player', look: DEFAULT_LOOK, seed: 'recipe-player' };
  await bounded(preloadLooks([player, ...people]), 'Actual native preload');
  status.textContent = 'Preparing independent native geometry references (diagnostic preload, not cold-load evidence)…';
  nativeReferences = await bounded(prepareNativeReferences(people, player, () => !disposed), 'Independent native references');
  check(!disposed, 'Sample disposed before host creation');
  const value = createRenderer();
  host = createVenueHost(container, { cityId: 'accra', location: 'accra-market-game', renderer: value });
  host.setAmbient(null); host.setPlayer(player); host.setCrowd(people);
  const first = await freshHostFrame();
  await bounded(settleNative(first.scene), 'Complete native settlement'); check(!disposed, 'Sample disposed before evidence');
  const ids = new Set(people.map(p => p.id));
  let signWitness: SignWitness | null = null;
  refresh = async () => {
    check(host && observer && !disposed, 'No active sample host');
    const frame = await freshHostFrame(), sizing = canvasSizing(value, frame.camera);
    const imported = frame.scene.getObjectByName('recipe:accra-market-game'); check(imported, 'Actual recipe geometry is absent');
    const diagnostics = host.diagnostics(), cost = measureRenderCost(frame.scene);
    const native = { foundationGroups: [] as { name: string; detail: unknown }[], pending: 0, statusScope: 'All scene branches, including hidden native work', errors: [] as string[], skinnedMeshes: 0 };
    let lights = 0;
    frame.scene.traverseVisible(node => {
      if (node instanceof THREE.Light) lights++;
      if (node instanceof THREE.SkinnedMesh) native.skinnedMeshes++;
      if (node.userData.characterFoundation === 'native53') native.foundationGroups.push({ name: node.name, detail: node.userData.characterDetail });
    });
    frame.scene.traverse(node => { if (node.userData.characterStatus === 'loading') native.pending++; if (node.userData.characterError) native.errors.push(String(node.userData.characterError)); });
    const backgroundDraws = frame.receipt.draws.filter(d => d.material === 'BackgroundMaterial' && d.main);
    check(new Set(backgroundDraws.map(d => d.objectId)).size === 1 && backgroundDraws.length === 1, 'Unexpected actual background submissions');
    const background = backgroundDraws[0]!;
    // Traversal already counts the actual outer ground. Only the renderer-owned background is added here.
    const scenery = { ...cost.scenery, triangles: cost.scenery.triangles + background.triangles, meshes: cost.scenery.meshes + 1 };
    let actualGeometryTriangles = background.triangles;
    frame.scene.traverseVisible(node => {
      if (!(node instanceof THREE.Mesh)) return;
      const available = node.geometry.index?.count ?? node.geometry.getAttribute('position').count;
      actualGeometryTriangles += Math.max(0, Math.min(available - node.geometry.drawRange.start, node.geometry.drawRange.count)) / 3 * (node instanceof THREE.InstancedMesh ? node.count : 1);
    });
    const full = { uniqueTriangles: actualGeometryTriangles, actualDrawCalls: frame.receipt.mainCalls + frame.receipt.shadowCalls,
      admissionReservations: { triangles: cost.reservedTriangles, draws: cost.reservedDrawCalls }, scope: 'Actual visible geometry including normal near-detail upgrades; reservation counters remain a separate gate.' };
    const residentIds = diagnostics.people.filter(p => ids.has(p.id)).map(p => p.id).sort();
    const tagIds = diagnostics.tags.filter(t => ids.has(t.id)).map(t => t.id).sort();
    const proofFailures: string[] = [];
    const prove = <T>(label: string, run: () => T): T | null => { try { return run(); } catch (error) { proofFailures.push(`${label}: ${String(error)}`); return null; } };
    const recipeGeometry = prove('Recipe membership', () => proveRecipeGeometry(frame, imported, checked, prepared));
    const textures = prove('Recipe textures', () => proveRecipeTextures(frame, imported, checked, prepared, signWitness));
    signWitness = textures?.signCoverage?.witness ?? null;
    const pendingCoverage = textures?.signCoverage?.coverage === 'pending-main-view' ? ['Declared sign is outside the current main camera; complete main submission has not yet been observed'] : [];
    const nativeGeometry = prove('Resident geometry', () => { check(imported.parent, 'Missing venue parent'); check(nativeReferences, 'Missing independent native references'); return proveNativeResidents(frame, imported.parent, diagnostics.people.filter(p => ids.has(p.id)), nativeReferences); });
    const failures = [
      ...proofFailures,
      ...(sizing.matches ? [] : ['Canvas CSS, drawing buffer or camera aspect differs from its viewport']),
      ...(!value.getContext().isContextLost() ? [] : ['WebGL context is lost']),
      ...(residentIds.length === 12 && tagIds.length === 12 && people.every(p => residentIds.includes(p.id) && tagIds.includes(p.id)) ? [] : ['Not all twelve supplied residents and tags are present']),
      ...(native.pending === 0 && native.errors.length === 0 && native.skinnedMeshes > 0 && nativeGeometry?.members.length === 12 ? [] : ['Native geometry is not fully ready']),
      ...(cost.reservedTriangles === 0 && cost.reservedDrawCalls === 0 ? [] : ['Native admission reservations remain (including normal near-detail upgrades); no zero-reservation acceptance']),
      ...(scenery.triangles <= 15_000 && scenery.meshes <= 13 && lights <= 4 ? [] : ['Full scenery exceeds fixed caps']),
      ...(full.uniqueTriangles <= 87_000 && full.actualDrawCalls <= 60 ? [] : ['Full host exceeds fixed caps']),
      ...errors,
    ];
    publish({ status: failures.length ? 'rendered-with-failed-gates' : pendingCoverage.length ? 'rendered-with-pending-coverage' : 'rendered-awaiting-visual-review', scope: 'One real Accra sample, not fleet/gameplay/material approval',
      manifest, pack: pack.metadata, recipeText: pack.text, people, player, residentIds, tagIds, native, cost, scenery, lights, full,
      frame: frame.receipt, diagnostics, recipeGeometry, textures, nativeGeometry, walkReceipt, failures, pendingCoverage, sizing,
      render: { three: THREE.REVISION, toneMapping: value.toneMapping, exposure: value.toneMappingExposure, contextLost: value.getContext().isContextLost() },
      assets: performance.getEntriesByType('resource').map(e => e.name).filter(name => /\.(?:glb|webp|bin|wasm)(?:\?|$)/.test(name)),
    });
    status.textContent = failures.length ? `Actual scene rendered; ${failures.length} acceptance gate(s) failed. See evidence.` : pendingCoverage.length ? 'Actual scene rendered; sign main-camera coverage remains pending. Ordinary movement can bring it into view.' : 'Actual scene and twelve residents rendered. Visual review remains open.';
  };
  reset = () => { host?.recentre(); void refresh().catch(fail); };
  walkToMarket = async () => {
    check(host && !disposed, 'No active sample host');
    const before = host.diagnostics(); check(!before.avatar.locked && !before.avatar.moving, 'Wait for an idle, unlocked avatar');
    const target = checked.recipe.spots.find(s => s.key === 'work'); check(target, 'No recipe work spot');
    const actual = before.spots.find(s => s.id === target.key);
    check(actual && actual.x === target.x && actual.z === target.z && before.things.length === 0, 'Sample work route differs from validated recipe');
    check(walkGrid.free(before.avatar.x, before.avatar.z) && walkGrid.free(target.x, target.z), 'Work route endpoint is blocked');
    const route = walkGrid.path(before.avatar.x, before.avatar.z, target.x, target.z), end = route?.at(-1) ?? before.avatar;
    check(route && Math.hypot(end.x - target.x, end.z - target.z) < 1e-8, 'No exact reachable work route');
    check(host.walkTo(target.x, target.z), 'Host rejected normal walking request');
    walkReceipt = { from: before.avatar, target: { x: target.x, z: target.z }, route, method: 'existing host.walkTo; validated exact free endpoint', afterRequest: host.diagnostics().avatar };
    status.textContent = 'Walking to the market work spot. Orbit or zoom normally; refresh evidence after arrival.';
  };
  requiredElement('walk').removeAttribute('disabled');
  await refresh();
}

async function main() {
  const manifest = await json('/__recipe-sample/manifest.json');
  if (modeOf(manifest) === 'calibration') await runCalibration(manifest);
  else await runScene(manifest);
}
void main().catch(error => { fail(error); dispose(); });
