/** Sample/audit instrumentation only; the game does not import this module. */
import * as THREE from 'three';
import { createGround, createSky } from '../look.ts';

export interface DrawReceipt {
  objectId: string; geometryId: string; name: string; material: string;
  main: boolean; calls: number; triangles: number;
}
export interface FrameReceipt {
  sceneId: string; draws: DrawReceipt[];
  mainCalls: number; shadowCalls: number; submittedTriangles: number;
  rendererMainCalls: number; rendererMainTriangles: number;
}
export interface ObservedFrame { scene: THREE.Scene; camera: THREE.Camera; receipt: FrameReceipt; objects: ReadonlyMap<string, THREE.Object3D> }

/** Count actual submissions, including shadow calls discarded by THREE's later info.reset(). */
export function observeRenderer(renderer: THREE.WebGLRenderer) {
  const originalRender = renderer.render, originalDirect = renderer.renderBufferDirect;
  let active: { camera: THREE.Camera; draws: DrawReceipt[]; objects: Map<string, THREE.Object3D> } | undefined;
  let last: ObservedFrame | undefined, disposed = false;
  const direct: THREE.WebGLRenderer['renderBufferDirect'] = function (camera, scene, geometry, material, object, group) {
    const before = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
    originalDirect.call(renderer, camera, scene, geometry, material, object, group);
    if (!active) return;
    const calls = renderer.info.render.calls - before.calls, triangles = renderer.info.render.triangles - before.triangles;
    if (calls === 0) return;
    if (calls < 0 || triangles < 0) throw new Error('Renderer counters reset inside one submission');
    active.objects.set(object.uuid, object);
    active.draws.push({ objectId: object.uuid, geometryId: geometry.uuid, name: object.name, material: material.name,
      main: camera === active.camera, calls, triangles });
  };
  const render: THREE.WebGLRenderer['render'] = function (scene, camera) {
    const previous = active, frame = { camera, draws: [] as DrawReceipt[], objects: new Map<string, THREE.Object3D>() };
    active = frame;
    try {
      originalRender.call(renderer, scene, camera);
      if (scene instanceof THREE.Scene) {
        last = { scene, camera, objects: frame.objects, receipt: { sceneId: scene.uuid, draws: frame.draws,
          mainCalls: frame.draws.filter(d => d.main).reduce((n, d) => n + d.calls, 0),
          shadowCalls: frame.draws.filter(d => !d.main).reduce((n, d) => n + d.calls, 0),
          submittedTriangles: frame.draws.reduce((n, d) => n + d.triangles, 0),
          rendererMainCalls: renderer.info.render.calls, rendererMainTriangles: renderer.info.render.triangles } };
      }
    } finally { active = previous; }
  };
  renderer.renderBufferDirect = direct;
  renderer.render = render;
  return {
    latest: () => last,
    dispose() {
      if (disposed) return;
      disposed = true;
      if (renderer.render === render) renderer.render = originalRender;
      if (renderer.renderBufferDirect === direct) renderer.renderBufferDirect = originalDirect;
      last = undefined;
    },
  };
}

/** Actual unchanged outer resources, not a replacement approximation of their geometry. */
export function createOuterHostFixture(scene: THREE.Scene) {
  const ground = createGround(THREE), sky = createSky(THREE, false), previous = scene.background;
  ground.place(0, 0, 12); ground.tint('#9d8768'); sky.set('#cbd5d8', '#779bb9');
  scene.add(ground.mesh); scene.background = sky.texture;
  let disposed = false;
  return { ground, sky, dispose() {
    if (disposed) return;
    disposed = true;
    ground.mesh.removeFromParent();
    if (scene.background === sky.texture) scene.background = previous;
    ground.dispose(); sky.dispose();
  } };
}

export interface OuterCalibration {
  schema: 'allworld-outer-host-calibration'; version: 1;
  ground: { triangles: number; meshes: number; mainPasses: number; shadowPasses: number };
  background: { triangles: number; meshes: number; mainPasses: number; shadowPasses: number };
  total: { triangles: number; meshes: number; mainPasses: number; shadowPasses: number };
  frame: FrameReceipt;
}

/** Fail closed on missing submissions; this function cannot certify browser pixels on its own. */
export function readOuterCalibration(frame: FrameReceipt, groundId: string, groundTriangles: number): OuterCalibration {
  const ground = frame.draws.filter(d => d.objectId === groundId);
  const background = frame.draws.filter(d => d.objectId !== groundId && d.material === 'BackgroundMaterial');
  const fail = (condition: boolean, message: string) => { if (!condition) throw new Error(`Outer calibration: ${message}`); };
  fail(groundTriangles > 0 && Number.isSafeInteger(groundTriangles), 'invalid actual ground geometry');
  fail(ground.length > 0 && ground.every(d => d.triangles === groundTriangles), 'ground was not fully submitted');
  fail(background.length > 0 && new Set(background.map(d => d.objectId)).size === 1, 'missing or ambiguous renderer background');
  fail(background.every(d => d.triangles === background[0]!.triangles), 'inconsistent background submissions');
  fail(frame.draws.length === ground.length + background.length, 'unexpected object in isolated calibration');
  fail(frame.mainCalls === frame.rendererMainCalls, 'main draw counters disagree');
  fail(frame.draws.filter(d => d.main).reduce((sum, d) => sum + d.triangles, 0) === frame.rendererMainTriangles, 'main triangle counters disagree');
  const part = (draws: DrawReceipt[], triangles: number) => ({ triangles, meshes: new Set(draws.map(d => d.objectId)).size,
    mainPasses: draws.filter(d => d.main).reduce((n, d) => n + d.calls, 0), shadowPasses: draws.filter(d => !d.main).reduce((n, d) => n + d.calls, 0) });
  const g = part(ground, groundTriangles), b = part(background, background[0]!.triangles);
  return { schema: 'allworld-outer-host-calibration', version: 1, ground: g, background: b,
    total: { triangles: g.triangles + b.triangles, meshes: g.meshes + b.meshes, mainPasses: g.mainPasses + b.mainPasses, shadowPasses: g.shadowPasses + b.shadowPasses }, frame };
}

export function assertExpectedOuterCalibration(value: OuterCalibration): void {
  const { ground: g, background: b, total: t } = value;
  if (g.triangles !== 144 || g.meshes !== 1 || g.mainPasses !== 2 || g.shadowPasses !== 0 ||
      b.triangles !== 2 || b.meshes !== 1 || b.mainPasses !== 1 || b.shadowPasses !== 0 ||
      t.triangles !== 146 || t.meshes !== 2 || t.mainPasses !== 3 || t.shadowPasses !== 0) {
    throw new Error('Actual outer-host calibration differs from the proposed allowance; canonical measurements must remain unchanged');
  }
}
