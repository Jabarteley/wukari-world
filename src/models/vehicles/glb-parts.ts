/**
 * The authored vehicle models (the .glb files in ./assets) made ready to use: wheels that turn with the distance travelled,
 * riders at the seat empties, and head and tail lights at the light empties that are lit at dusk and at night.
 *
 * This file is pure three.js on an already parsed scene (no loader, no files, no network), so it is the part the unit tests exercise.
 * glb-library.ts loads and caches the parsed scenes; glb.ts is the one module that knows the file addresses and the glTF loader.
 *
 * Every model faces +z, stands on y = 0 and is in metres, like the procedural vehicles in index.ts. A model's named nodes:
 *   wheel_*        turned about the vehicle's x axis (the near model only; the far model has its wheels baked in)
 *   seat_driver    the driver's seat; seat_1 … seat_n the others, each at the height of the seat cushion
 *   light_head_*   headlights (l, r, or c for one in the centre); light_tail_* tail lights
 */
import * as THREE from 'three';
import { box, mergeColored } from './geometry.ts';
import type { ColoredGeometry } from './geometry.ts';

export type GlbKind = 'danfo' | 'keke' | 'okada' | 'bus' | 'saloon' | 'suv' | 'pickup' | 'van';
/** The near model is for views that fill the screen with the vehicle; the far one (one mesh, wheels baked in) for the map and trips seen from a distance. */
export type GlbLod = 'near' | 'far';
export interface GlbRequest { kind: GlbKind; variant?: string; lod: GlbLod }

export const GLB_KINDS: readonly GlbKind[] = Object.freeze(['danfo', 'keke', 'okada', 'bus', 'saloon', 'suv', 'pickup', 'van'] as const);

/** The variant files that exist for each kind: '' is the plain file; a kind with no plain file starts at its first entry. */
export const GLB_VARIANTS: Readonly<Record<GlbKind, readonly string[]>> = Object.freeze({
  danfo: ['', 'blue-white', 'white-green'],
  keke: [''],
  okada: [''],
  bus: [''],
  saloon: ['', 'black', 'blue', 'green', 'red'],
  suv: ['', 'black', 'red', 'white'],
  pickup: ['white', 'blue'],
  van: ['white', 'blue'],
});

/** Wheel radius in metres (a wheel turns once per 2π r of travel). */
export const GLB_WHEEL_RADIUS: Readonly<Record<GlbKind, number>> = Object.freeze({
  danfo: 0.331, keke: 0.3, okada: 0.346, bus: 0.42, saloon: 0.346, suv: 0.423, pickup: 0.45, van: 0.42,
});

/** The file name (without extension) for a request; an unknown variant falls back to the kind's first one. */
export function glbKey({ kind, variant = '', lod }: GlbRequest): string {
  const known = GLB_VARIANTS[kind];
  const chosen = known.includes(variant) ? variant : known[0] ?? '';
  return `${kind}${chosen ? `-${chosen}` : ''}${lod === 'far' ? '-far' : ''}`;
}

export interface GlbTemplate {
  readonly key: string;
  readonly kind: GlbKind;
  readonly lod: GlbLod;
  /** The parsed scene. Never added to a scene itself: instances are cloned from it and share its geometry and materials. */
  readonly scene: THREE.Object3D;
  readonly triangles: number;
  readonly drawCalls: number;
}

function meshesOf(root: THREE.Object3D): THREE.Mesh[] {
  const found: THREE.Mesh[] = [];
  root.traverse((object) => { if ((object as THREE.Mesh).isMesh) found.push(object as THREE.Mesh); });
  return found;
}

const trianglesOf = (mesh: THREE.Mesh): number => (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.getAttribute('position').count) / 3;

/** Wrap a parsed scene as a template. Throws when the scene is not a model of the kind (no mesh), so a broken file falls back to the procedural vehicle. */
export function createTemplate(request: GlbRequest, scene: THREE.Object3D): GlbTemplate {
  const meshes = meshesOf(scene);
  if (!meshes.length) throw new Error(`${glbKey(request)} has no mesh`);
  let triangles = 0;
  for (const mesh of meshes) {
    mesh.castShadow = false; mesh.receiveShadow = false; mesh.frustumCulled = true;
    triangles += trianglesOf(mesh);
  }
  // Each wheel is its own node but shares the one wheel mesh: count what is drawn once per node that holds one.
  return { key: glbKey(request), kind: request.kind, lod: request.lod, scene, triangles, drawCalls: meshes.length };
}

export interface GlbVehicle {
  readonly key: string;
  readonly kind: GlbKind;
  readonly lod: GlbLod;
  /** Facing +z, wheels on y = 0, the origin at the middle of the footprint. */
  readonly object3D: THREE.Group;
  readonly wheels: readonly THREE.Object3D[];
  readonly wheelRadius: number;
  /** The seat nodes by name (seat_driver, seat_1 …), positions in the vehicle's own frame. */
  readonly seats: ReadonlyMap<string, THREE.Object3D>;
  /** The lit head and tail lights, one mesh; hidden by day. Null when the model has no light empties. */
  readonly lights: THREE.Mesh | null;
  readonly triangles: number;
  readonly drawCalls: number;
  readonly night: boolean;
  /** Turn the wheels to this distance travelled (metres). True when anything moved. */
  spin(distance: number): boolean;
  /** Light the lights (dusk and night) or put them out. True when that changed. */
  setNight(on: boolean): boolean;
  /** Put riders at these seats (replacing any there already). One mesh however many riders. */
  seat(riders: readonly Rider[]): void;
  /** The seat's position in the vehicle's frame. */
  seatPosition(name: string): THREE.Vector3 | null;
  dispose(): void;
}

export interface Rider { seat: string; shirt: THREE.ColorRepresentation; skin: THREE.ColorRepresentation; hair?: THREE.ColorRepresentation; helmet?: THREE.ColorRepresentation; straddle?: boolean }

const HEAD = new THREE.Color('#fff4c2');
const TAIL = new THREE.Color('#ff3a2c');
const _world = new THREE.Vector3();

/** A seated figure of boxes, the pelvis at (x, y, z), the face toward +z: about 84 triangles (108 astride a bike). */
export function seatedFigure(target: ColoredGeometry[], x: number, y: number, z: number, rider: Omit<Rider, 'seat'>): void {
  const { shirt, skin, hair = '#1c1715', helmet, straddle = false } = rider;
  const trousers = '#2f3744';
  const chest = 0.4;
  box(target, x, y + 0.3, z, chest, 0.6, 0.22, shirt);
  box(target, x, y + 0.8, z, 0.22, 0.24, 0.22, skin);
  box(target, x, y + 0.94, z - 0.01, helmet ? 0.28 : 0.24, helmet ? 0.16 : 0.1, helmet ? 0.28 : 0.25, helmet ?? hair);
  for (const side of [-1, 1]) {
    box(target, x + side * (chest / 2 + 0.05), y + 0.26, z + 0.1, 0.1, 0.46, 0.12, shirt, { rx: -0.5 });
    if (straddle) {
      box(target, x + side * 0.12, y - 0.02, z + 0.12, 0.16, 0.16, 0.4, trousers, { rx: 0.35 });
      box(target, x + side * 0.16, y - 0.3, z + 0.3, 0.14, 0.44, 0.14, trousers);
    } else {
      box(target, x + side * 0.1, y + 0.02, z + 0.26, 0.17, 0.15, 0.52, trousers);
    }
  }
}

function lightGeometry(root: THREE.Object3D): THREE.BufferGeometry | null {
  const parts: ColoredGeometry[] = [];
  root.updateWorldMatrix(true, true);
  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  root.traverse((node) => {
    const head = node.name.startsWith('light_head_'), tail = node.name.startsWith('light_tail_');
    if (!head && !tail) return;
    _world.setFromMatrixPosition(node.matrixWorld).applyMatrix4(inverse);
    // A lamp that stands a little proud of the body: a lit lens, and a pale halo behind it.
    const size = head ? 0.34 : 0.28;
    const out = head ? 0.03 : -0.03;
    box(parts, _world.x, _world.y, _world.z + out, size * 1.25, size * 0.8, 0.06, head ? HEAD : TAIL);
    if (head) box(parts, _world.x, _world.y, _world.z + 0.06, size * 0.6, size * 0.4, 0.04, '#ffffff');
  });
  return parts.length ? mergeColored(parts) : null;
}

/**
 * One vehicle from a template: a clone sharing the template's geometry and materials (so disposing it frees only what it owns:
 * the lamps and the riders).
 */
export function createGlbVehicle(template: GlbTemplate, { night = false }: { night?: boolean } = {}): GlbVehicle {
  const object3D = new THREE.Group();
  object3D.name = `glb-vehicle:${template.key}`;
  const body = template.scene.clone(true);
  object3D.add(body);
  object3D.updateMatrixWorld(true);
  const wheels: THREE.Object3D[] = [];
  const seats = new Map<string, THREE.Object3D>();
  body.traverse((node) => {
    if (node.name.startsWith('wheel_')) wheels.push(node);
    else if (node.name.startsWith('seat_')) seats.set(node.name, node);
  });
  const base = wheels.map((wheel) => wheel.quaternion.clone());
  const radius = GLB_WHEEL_RADIUS[template.kind];
  const axis = new THREE.Vector3(1, 0, 0), turn = new THREE.Quaternion();
  let angle = 0, riders: THREE.Mesh | null = null, disposed = false, lit = false;

  const geometry = lightGeometry(body);
  let lights: THREE.Mesh | null = null;
  if (geometry) {
    const material = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    lights = new THREE.Mesh(geometry, material);
    lights.name = 'lights';
    lights.visible = false;
    lights.frustumCulled = false;
    object3D.add(lights);
  }
  const everyDraw = (): number => { let count = 0; object3D.traverse((node) => { if ((node as THREE.Mesh).isMesh && node.visible) count += 1; }); return count; };

  const vehicle: GlbVehicle = {
    key: template.key, kind: template.kind, lod: template.lod, object3D, wheels, wheelRadius: radius, seats,
    get lights() { return lights; },
    get triangles() { let total = template.triangles; for (const extra of [lights, riders]) if (extra) total += trianglesOf(extra); return total; },
    get drawCalls() { return everyDraw(); },
    get night() { return lit; },
    spin(distance) {
      const next = Number.isFinite(distance) ? distance / radius : 0;
      if (Math.abs(next - angle) < 1e-6) return false;
      angle = next;
      // Turn about the vehicle's x axis, whatever each wheel node's own orientation is (a rotation in the parent's frame).
      turn.setFromAxisAngle(axis, angle);
      wheels.forEach((wheel, i) => { wheel.quaternion.copy(turn).multiply(base[i]!); });
      return true;
    },
    setNight(on) {
      const next = Boolean(on);
      if (next === lit) return false;
      lit = next;
      if (lights) lights.visible = next;
      return true;
    },
    seatPosition(name) {
      const node = seats.get(name);
      if (!node) return null;
      object3D.updateMatrixWorld(true);
      return object3D.worldToLocal(node.getWorldPosition(new THREE.Vector3()));
    },
    seat(next) {
      if (riders) { object3D.remove(riders); riders.geometry.dispose(); (riders.material as THREE.Material).dispose(); riders = null; }
      const parts: ColoredGeometry[] = [];
      for (const rider of next) {
        const at = vehicle.seatPosition(rider.seat);
        if (!at) continue;
        seatedFigure(parts, at.x, at.y, at.z, rider);
      }
      if (!parts.length) return;
      riders = new THREE.Mesh(mergeColored(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }));
      riders.name = 'riders';
      object3D.add(riders);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const own of [lights, riders]) if (own) { own.removeFromParent(); own.geometry.dispose(); (own.material as THREE.Material).dispose(); }
      lights = null; riders = null;
      object3D.removeFromParent();
      object3D.clear();
    },
  };
  vehicle.setNight(night);
  return vehicle;
}

/**
 * The model's single mesh with its node transform applied, as plain float attributes, for instancing (the far models are one mesh with the
 * body's quantised positions and a scale on the node; an instanced mesh has no node of its own). Null when the model is not one mesh.
 */
export function instancingParts(template: GlbTemplate): { geometry: THREE.BufferGeometry; material: THREE.Material } | null {
  const meshes = meshesOf(template.scene);
  const only = meshes.length === 1 ? meshes[0]! : null;
  if (!only || Array.isArray(only.material)) return null;
  template.scene.updateWorldMatrix(true, true);
  const source = only.geometry;
  const geometry = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv'] as const) {
    const attribute = source.getAttribute(name);
    if (!attribute) continue;
    const values = new Float32Array(attribute.count * attribute.itemSize);
    for (let i = 0; i < attribute.count; i += 1) {
      values[i * attribute.itemSize] = attribute.getX(i);
      values[i * attribute.itemSize + 1] = attribute.getY(i);
      if (attribute.itemSize > 2) values[i * attribute.itemSize + 2] = attribute.getZ(i);
    }
    geometry.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize));
  }
  if (source.index) geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from(source.index.array), 1));
  geometry.applyMatrix4(only.matrixWorld);
  geometry.computeBoundingSphere();
  return { geometry, material: only.material };
}

/** The nearest variant file for a colour (any CSS colour): the saloon and SUV come in a few paints. Hue decides; low saturation is black or white. */
export function paintFor(kind: GlbKind, colour: THREE.ColorRepresentation): string {
  const options = GLB_VARIANTS[kind];
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(colour).getHSL(hsl);
  const want = hsl.s < 0.18 ? (hsl.l < 0.35 ? 'black' : hsl.l > 0.7 ? 'white' : '') : hsl.h < 0.05 || hsl.h > 0.92 ? 'red' : hsl.h > 0.25 && hsl.h < 0.5 ? 'green' : hsl.h >= 0.5 && hsl.h < 0.75 ? 'blue' : '';
  return options.includes(want) ? want : options[0] ?? '';
}
