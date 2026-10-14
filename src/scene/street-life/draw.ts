/**
 * OWNER: scenes
 * Street life, drawn (the plan, the gate and the caps are ./plan.ts). Fetched only on a device that passed the gate, after the scene's
 * first frame: never part of the first download or of the shared scene chunk.
 *
 *   crowd    ONE InstancedMesh of camera-facing quads (two triangles a person). Each instance's matrix carries where the person stands and
 *            how tall and wide they are; the shader turns the quad to the camera about the vertical and cuts a person out of it (head,
 *            hair or wrap, shirt and arms, trousers or a skirt, shoes) in that person's colours, the legs and arms swinging with the stride.
 *            Lit by the scene's own lights (Lambert) and fogged like the rest. No shadow: one draw call.
 *            Phase 3b (crowd.ts): bodies vary in width, outfits, open jackets and bags (per-instance attributes of the same mesh: the
 *            attachments cost no draw call), a bob at each step, stops at shop windows, groups standing with phones, and people who
 *            cross the road only while the lights stop the traffic.
 *   traffic  ONE InstancedMesh of a car of five boxes (wheels, body, cabin and glass, a livery stripe, a taxi's roof sign): a per-instance
 *            paint and trim in the city's livery (livery.ts), and a matrix that stretches it into a bus, a truck or a keke. One draw call.
 *
 * It asks for no frames of its own: step() is called by whoever owns the frame loop, inside their window (the battery rule). Given the
 * frame's gap, step() also feeds the adaptive caps (adaptive.ts): a mean frame over 24 ms across 60 frames draws fewer people and
 * vehicles. `?streetperf=1` shows the measured frame time and the counts.
 */
import type * as THREE from 'three';
import type { Kit } from '../kit.ts';
import { CAR_LENGTH, PERSON_TRIANGLES as PERSON_TRIS, VEHICLE_KINDS, VEHICLE_TRIANGLES as CAR_TRIS, planTraffic, stepAside, vehicleAt } from './plan.ts';
import type { Lane, Road } from './plan.ts';
import { BAG_TONES, clearShift, crossingSpans, driveSeconds, personAt, planPeople, signalFor } from './crowd.ts';
import type { PeopleWorld, Person, Signal } from './crowd.ts';
import { paintTraffic } from './livery.ts';
import type { PaintedVehicle } from './livery.ts';
import { createAdaptiveCaps, pagePerf, readoutText } from './adaptive.ts';
import type { Caps } from './adaptive.ts';

export interface StreetLifeOptions {
  parent: THREE.Object3D
  /** The street's own seed (a place, a street): the same seed gives the same people and cars everywhere. */
  seed: string
  lanes: readonly Lane[]
  roads: readonly Road[]
  /** Crossings of the first road (kerb to kerb): with them, the road gets lights and people cross on them. */
  crossings?: readonly Lane[]
  /** The city's country id: the taxis' and buses' livery. */
  country?: string | null
  crowd: number
  vehicles: number
  /** The ground's height (default 0). */
  heightAt?(x: number, z: number): number
  /** Wall-clock milliseconds to place everyone at first. */
  at: number
}
export interface StreetLife {
  readonly group: THREE.Group
  /** Put everyone where they are at this wall-clock time (ms), stepping aside round the player when given. With the frame's gap
   * (seconds), it is counted toward the adaptive caps. */
  step(at: number, player?: { x: number; z: number } | null, dt?: number): void
  /** Draw at most this many people and vehicles (never more than planned). */
  setCaps(caps: Caps): void
  readonly people: number
  readonly vehicles: number
  /** The lights on the first road, when it has crossings that the stopped traffic keeps clear of. */
  readonly signal: Signal | null
  readonly triangles: number
  readonly drawCalls: number
  dispose(): void
}

const CROWD_PARS_VERTEX = /* glsl */`
attribute vec4 aGait;
attribute vec3 aShirt;
attribute vec3 aLegs;
attribute vec4 aSkin;
attribute vec4 aKit;
uniform vec3 uCam;
varying vec2 vBody;
varying vec4 vGait;
varying vec3 vShirt;
varying vec3 vLegs;
varying vec4 vSkin;
varying vec4 vKit;
`;
// Replaces <defaultnormal_vertex>: the quad's centre, size and turn to the camera, and a normal that leans up so the sun lights the crowd as it does the ground.
const CROWD_NORMAL = /* glsl */`
vec3 sCentre = instanceMatrix[3].xyz;
float sWide = length(instanceMatrix[0].xyz);
float sTall = length(instanceMatrix[1].xyz);
vec2 sTo = uCam.xz - sCentre.xz;
float sLen = length(sTo);
vec2 sDir = sLen > 0.0001 ? sTo / sLen : vec2(0.0, 1.0);
vec3 sRight = vec3(sDir.y, 0.0, -sDir.x);
vec3 transformedNormal = normalize(normalMatrix * normalize(vec3(sDir.x, 0.9, sDir.y)));
// The quad is half as wide as tall times the body's width, so the body (drawn in heights) widens with it.
vBody = vec2(position.x * 0.5, position.y);
vGait = vec4(aGait.x * 6.2831853, dot(vec2(sRight.x, sRight.z), vec2(sin(aGait.y), cos(aGait.y))), aGait.z, aGait.w);
vShirt = aShirt; vLegs = aLegs; vSkin = aSkin; vKit = aKit;
`;
const CROWD_PROJECT = /* glsl */`
transformed = sCentre + sRight * (position.x * sWide) + vec3(0.0, position.y * sTall, 0.0);
vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
gl_Position = projectionMatrix * mvPosition;
`;
const CROWD_PARS_FRAGMENT = /* glsl */`
varying vec2 vBody;
varying vec4 vGait;
varying vec3 vShirt;
varying vec3 vLegs;
varying vec4 vSkin;
varying vec4 vKit;
uniform vec3 uBags[4];
float sBox(vec2 p, vec2 c, vec2 h) { vec2 d = abs(p - c) - h; return max(d.x, d.y); }
float sSeg(vec2 p, vec2 a, vec2 b, float r) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
`;
// Replaces <color_fragment>. The body is drawn in heights (0 at the feet, 1 at the top of the head) and cut out of the quad.
const CROWD_COLOUR = /* glsl */`
vec2 p = vBody;
float sw = sin(vGait.x), across = vGait.y, facing = 1.0 - abs(across);
float mode = vGait.w, kit = floor(vKit.w + 0.5);
float bag = mod(kit, 4.0), coated = mod(floor(kit / 4.0), 2.0);
vec3 bagColour = uBags[int(mod(floor(kit / 8.0), 4.0))];
float stride = 0.085 * sw * across;
float legA = sSeg(p, vec2(-0.042, 0.47), vec2(-0.045 + stride, 0.035 + 0.03 * facing * max(sw, 0.0)), 0.034);
float legB = sSeg(p, vec2(0.042, 0.47), vec2(0.045 - stride, 0.035 + 0.03 * facing * max(-sw, 0.0)), 0.034);
float legs = min(legA, legB);
// The packed values arrive through a varying: rounded, since perspective interpolation can leave 4.0 a hair under (speckled skirts).
float packed = floor(vSkin.w + 0.5);
float skirt = packed >= 4.0 ? sBox(p, vec2(0.0, 0.38), vec2(0.07 + (0.5 - p.y) * 0.22, 0.13)) : 1.0;
float torso = sBox(p, vec2(0.0, 0.665), vec2(0.082 + (p.y - 0.5) * 0.13, 0.17));
float coat = coated > 0.5 ? sBox(p, vec2(0.0, 0.64), vec2(0.093 + (p.y - 0.5) * 0.1, 0.195)) : 1.0;
float swing = -0.065 * sw * across;
vec2 handA = vec2(-0.135 + swing, 0.5), handB = vec2(0.135 - swing, 0.5);
float armA = sSeg(p, vec2(-0.118, 0.8), handA, 0.029);
float armB = sSeg(p, vec2(0.118, 0.8), handB, 0.029);
// Looking at a phone: the right forearm comes up to the face, the phone in the hand.
if (mode > 1.5) { handB = vec2(0.045, 0.83); armB = min(sSeg(p, vec2(0.118, 0.8), vec2(0.13, 0.66), 0.029), sSeg(p, vec2(0.13, 0.66), handB, 0.027)); }
float hands = min(length(p - handA), length(p - handB)) - 0.031;
float phone = mode > 1.5 ? sBox(p, handB + vec2(-0.012, 0.012), vec2(0.016, 0.026)) : 1.0;
float neck = sBox(p, vec2(0.0, 0.85), vec2(0.026, 0.035));
float head = length((p - vec2(0.0, 0.915)) * vec2(1.0, 0.86)) - 0.066;
// Bags: a shoulder bag on its strap, a backpack (its straps from the front, the pack itself side-on), a tote in the left hand.
float bags = 1.0;
if (bag > 0.5 && bag < 1.5) bags = min(sSeg(p, vec2(-0.07, 0.82), vec2(0.115, 0.52), 0.008), sBox(p, vec2(0.13, 0.48), vec2(0.045, 0.05)));
else if (bag > 1.5 && bag < 2.5) bags = min(min(sSeg(p, vec2(-0.055, 0.82), vec2(-0.06, 0.6), 0.011), sSeg(p, vec2(0.055, 0.82), vec2(0.06, 0.6), 0.011)) + (1.0 - facing),
  sBox(p, vec2(-across * 0.13, 0.68), vec2(0.042 * abs(across) + 0.0001, 0.095)));
else if (bag > 2.5) bags = min(sBox(p, handA + vec2(0.0, -0.065), vec2(0.048, 0.055)), sSeg(p, handA + vec2(-0.03, -0.01), handA + vec2(0.03, -0.01), 0.006));
float body = min(min(min(legs, skirt), min(min(torso, coat), min(armA, armB))), min(min(min(hands, neck), min(head, phone)), bags));
if (body > 0.0) discard;
// At a lane's ends a person dissolves in or out (a screen-door pattern: still one opaque pass, no sorting).
if (vGait.z < 0.999 && fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) > vGait.z) discard;
vec3 sColour = vLegs;
if (torso <= 0.0 || armA <= 0.0 || armB <= 0.0) sColour = vShirt;
// An open jacket: over the arms and the sides of the body, the shirt showing down the middle from the front.
if ((coat <= 0.0 || armA <= 0.0 || armB <= 0.0) && coated > 0.5 && !(abs(p.x) < 0.024 * facing && p.y > 0.52 && p.y < 0.82)) sColour = vKit.rgb;
if (skirt <= 0.0 && p.y < 0.5) sColour = vLegs;
if (hands <= 0.0 || neck <= 0.0 || head <= 0.0) sColour = vSkin.rgb;
float style = mod(packed, 4.0);
if (head <= 0.0 && p.y > 0.925 - (style > 0.5 && style < 1.5 ? 0.012 : 0.0)) sColour = style > 1.5 ? vec3(0.62, 0.6, 0.57) : style > 0.5 ? vShirt * 0.85 : vec3(0.07, 0.06, 0.055);
if (p.y < 0.04 && legs <= 0.0) sColour = vec3(0.09, 0.08, 0.075);
if (bags <= 0.0) sColour = bagColour;
if (phone <= 0.0) sColour = vec3(0.06, 0.07, 0.08);
diffuseColor.rgb *= sColour;
`;

/** A colour as linear RGB, the way the renderer wants vertex data. */
function linear(kit: Kit, colour: string): [number, number, number] {
  const c = new kit.THREE.Color(colour);
  return [c.r, c.g, c.b];
}

function crowdMesh(kit: Kit, people: readonly Person[]): { mesh: THREE.InstancedMesh; gait: THREE.InstancedBufferAttribute } {
  const { THREE } = kit, n = people.length;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const shirt = new Float32Array(n * 3), legs = new Float32Array(n * 3), skin = new Float32Array(n * 4), kitData = new Float32Array(n * 4), gaitData = new Float32Array(n * 4);
  people.forEach((person, i) => {
    shirt.set(linear(kit, person.shirt), i * 3);
    legs.set(linear(kit, person.legs), i * 3);
    skin.set([...linear(kit, person.skin), person.style + (person.skirt ? 4 : 0)], i * 4);
    // The attachments: the jacket's colour, and packed in w the bag (0–3), whether there is a jacket (4) and the bag's tone (8 × 0–3).
    kitData.set([...(person.jacket ? linear(kit, person.jacket) : [0, 0, 0]), person.bag + (person.jacket ? 4 : 0) + 8 * person.bagTone], i * 4);
  });
  geometry.setAttribute('aShirt', new THREE.InstancedBufferAttribute(shirt, 3));
  geometry.setAttribute('aLegs', new THREE.InstancedBufferAttribute(legs, 3));
  geometry.setAttribute('aSkin', new THREE.InstancedBufferAttribute(skin, 4));
  geometry.setAttribute('aKit', new THREE.InstancedBufferAttribute(kitData, 4));
  const gait = new THREE.InstancedBufferAttribute(gaitData, 4);
  gait.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aGait', gait);
  const material = new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide });
  const uCam = { value: new THREE.Vector3(0, 10, 20) }, uBags = { value: BAG_TONES.map((tone) => new THREE.Color(tone)) };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCam = uCam;
    shader.uniforms.uBags = uBags;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${CROWD_PARS_VERTEX}`)
      .replace('#include <defaultnormal_vertex>', CROWD_NORMAL)
      .replace('#include <project_vertex>', CROWD_PROJECT);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${CROWD_PARS_FRAGMENT}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${CROWD_COLOUR}`);
  };
  material.customProgramCacheKey = () => 'street-crowd-2';
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, n));
  mesh.count = n;
  mesh.name = 'street-crowd';
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  // The shader places every quad itself, so the mesh's own bounds mean nothing: it is never culled (it spans the street anyway).
  mesh.frustumCulled = false;
  mesh.castShadow = false; mesh.receiveShadow = false;
  const camera = new THREE.Vector3();
  mesh.onBeforeRender = (_renderer, _scene, view) => { camera.setFromMatrixPosition(view.matrixWorld); uCam.value.copy(mesh.worldToLocal(camera)); };
  return { mesh, gait };
}

/**
 * The five boxes of a car, along +z, its wheels on the ground. Vertex colour is a shade; `aPart` says what takes it: 0 the paint (the
 * instance colour), 1 the trim (the livery's stripe), 2 the roof sign (its own light colour, and folded away on all but taxis).
 */
function carGeometry(kit: Kit): THREE.BufferGeometry {
  const { THREE } = kit, positions: number[] = [], normals: number[] = [], colours: number[] = [], parts: number[] = [], index: number[] = [];
  const box = (cx: number, cy: number, cz: number, w: number, h: number, d: number, shade: number, part: number): void => {
    const faces: [number[], number[], number[]][] = [
      [[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [1, 0, 0], [0, 0, -1]],
      [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
    ];
    for (const [n, u, v] of faces) {
      const base = positions.length / 3;
      for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
        const px = n[0]! * 0.5 + u[0]! * su * 0.5 + v[0]! * sv * 0.5, py = n[1]! * 0.5 + u[1]! * su * 0.5 + v[1]! * sv * 0.5, pz = n[2]! * 0.5 + u[2]! * su * 0.5 + v[2]! * sv * 0.5;
        positions.push(cx + px * w, cy + py * h, cz + pz * d);
        normals.push(n[0]!, n[1]!, n[2]!);
        colours.push(shade, shade, shade);
        parts.push(part);
      }
      index.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  };
  const length = CAR_LENGTH;
  box(0, 0.22, 0, 1.7, 0.44, length * 0.84, 0.12, 0);               // the wheels and the shadow under the car
  box(0, 0.75, 0, 1.8, 0.62, length, 1, 0);                         // the body
  box(0, 1.36, -0.2, 1.6, 0.6, length * 0.55, 0.3, 0);              // the cabin: its glass reads as a darker band of the paint
  box(0, 0.8, 0, 1.83, 0.16, length * 1.004, 1, 1);                 // the livery's stripe round the body
  box(0, 1.76, -0.2, 0.7, 0.2, 0.32, 1, 2);                         // a taxi's roof sign
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setAttribute('aPart', new THREE.Float32BufferAttribute(parts, 1));
  geometry.setIndex(index);
  return geometry;
}

const TRAFFIC_PARS = /* glsl */`
attribute float aPart;
attribute vec4 aTrim;
`;
// After <color_vertex>: the trim takes the livery's colour, the sign its own light; a car that is no taxi folds its sign away (to a point: no pixels).
const TRAFFIC_COLOUR = /* glsl */`
#include <color_vertex>
if (aPart > 1.5) vColor = vec3(0.96, 0.93, 0.78); else if (aPart > 0.5) vColor = color * aTrim.rgb;
`;
const TRAFFIC_FOLD = /* glsl */`
#include <begin_vertex>
if (aPart > 1.5 && aTrim.w < 0.5) transformed = vec3(0.0);
`;

function trafficMesh(kit: Kit, vehicles: readonly PaintedVehicle[]): THREE.InstancedMesh {
  const { THREE } = kit;
  const geometry = carGeometry(kit), trim = new Float32Array(Math.max(1, vehicles.length) * 4);
  vehicles.forEach((vehicle, i) => trim.set([...linear(kit, vehicle.trim), vehicle.sign ? 1 : 0], i * 4));
  geometry.setAttribute('aTrim', new THREE.InstancedBufferAttribute(trim, 4));
  const material = new THREE.MeshLambertMaterial({ color: '#ffffff', vertexColors: true });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${TRAFFIC_PARS}`)
      .replace('#include <color_vertex>', TRAFFIC_COLOUR)
      .replace('#include <begin_vertex>', TRAFFIC_FOLD);
  };
  material.customProgramCacheKey = () => 'street-traffic-2';
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, vehicles.length));
  mesh.count = vehicles.length;
  mesh.name = 'street-traffic';
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.castShadow = false; mesh.receiveShadow = false;
  const colour = new THREE.Color();
  vehicles.forEach((vehicle, i) => mesh.setColorAt(i, colour.set(vehicle.colour)));
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/** The readout `?streetperf=1` shows (a fixed line at the top left of the page; nothing without a document). */
function perfReadout(): { show(text: string): void; dispose(): void } | null {
  const doc = globalThis.document;
  if (!pagePerf() || !doc?.createElement || !doc.body) return null;
  const line = doc.createElement('div');
  line.setAttribute('data-street-perf', '');
  line.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99999;padding:3px 7px;border-radius:6px;background:rgba(0,0,0,.66);color:#9effa8;font:11px/1.4 ui-monospace,Menlo,monospace;pointer-events:none';
  doc.body.appendChild(line);
  return { show(text) { line.textContent = text; }, dispose() { line.remove(); } };
}

export function createStreetLife(kit: Kit, options: StreetLifeOptions): StreetLife {
  const { THREE } = kit;
  const heightAt = options.heightAt ?? (() => 0);
  const group = new THREE.Group();
  group.name = 'street-life';
  options.parent.add(group);
  const vehicles = paintTraffic(planTraffic(options.seed, options.roads, options.vehicles), options.country, options.seed);
  // Lights on the first road when it has crossings and its stopped traffic can be kept off all of them.
  const road0 = options.roads[0], crossings = options.crossings ?? [];
  let signal: Signal | null = null, shift = 0;
  if (road0 && crossings.length) {
    const lights = signalFor(road0), clear = clearShift(vehicles.filter((v) => v.road === 0), road0, crossingSpans(road0, crossings));
    if (lights && clear !== null) { signal = lights; shift = clear; }
  }
  const world: PeopleWorld = { lanes: options.lanes, crossings, signal };
  const people = planPeople(options.seed, world, options.crowd);
  const crowd = people.length ? crowdMesh(kit, people) : null;
  const traffic = vehicles.length ? trafficMesh(kit, vehicles) : null;
  if (crowd) group.add(crowd.mesh);
  if (traffic) group.add(traffic);
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3(), turn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), still = new THREE.Quaternion();
  const adaptive = createAdaptiveCaps({ crowd: people.length, vehicles: vehicles.length });
  let shownPeople = people.length, shownVehicles = vehicles.length, disposed = false, frames = 0;
  const readout = perfReadout();

  function setCaps(caps: Caps): void {
    if (disposed) return;
    shownPeople = Math.max(0, Math.min(people.length, Math.floor(caps.crowd)));
    shownVehicles = Math.max(0, Math.min(vehicles.length, Math.floor(caps.vehicles)));
    if (crowd) crowd.mesh.count = shownPeople;
    if (traffic) traffic.count = shownVehicles;
  }

  function step(at: number, player?: { x: number; z: number } | null, dt?: number): void {
    if (disposed) return;
    if (dt !== undefined) {
      const caps = adaptive.frame(dt);
      if (caps) setCaps(caps);
      frames += 1;
      if (readout && frames % 15 === 0) readout.show(readoutText({ average: adaptive.average, people: shownPeople, vehicles: shownVehicles, shrinks: adaptive.shrinks, triangles: shownPeople * PERSON_TRIS + shownVehicles * CAR_TRIS }));
    }
    const seconds = at / 1000;
    if (crowd) {
      const gait = crowd.gait.array as Float32Array;
      for (let i = 0; i < shownPeople; i++) {
        const person = people[i]!, pose = personAt(person, world, seconds), spot = stepAside(pose, player);
        position.set(spot.x, heightAt(spot.x, spot.z) + pose.lift, spot.z);
        scale.set(person.height * 0.5 * person.width, person.height, 1);
        crowd.mesh.setMatrixAt(i, matrix.compose(position, still, scale));
        gait[i * 4] = pose.phase; gait[i * 4 + 1] = pose.ry; gait[i * 4 + 2] = pose.fade; gait[i * 4 + 3] = pose.mode;
      }
      crowd.mesh.instanceMatrix.needsUpdate = true;
      crowd.gait.needsUpdate = true;
    }
    if (traffic) {
      for (let i = 0; i < shownVehicles; i++) {
        const vehicle = vehicles[i]!, road = options.roads[vehicle.road]!, spec = VEHICLE_KINDS[vehicle.kind];
        const lit = vehicle.road === 0 && signal !== null;
        const pose = vehicleAt(vehicle, road, lit ? driveSeconds(signal, seconds) + shift / road.speed : seconds);
        position.set(pose.x, heightAt(pose.x, pose.z), pose.z);
        scale.set(spec.wide ?? 1, spec.tall, spec.length);
        traffic.setMatrixAt(i, matrix.compose(position, turn.setFromAxisAngle(up, pose.ry), scale));
      }
      traffic.instanceMatrix.needsUpdate = true;
    }
  }
  step(options.at);

  return {
    group, step, setCaps, signal,
    get people() { return shownPeople; },
    get vehicles() { return shownVehicles; },
    get triangles() { return disposed ? 0 : shownPeople * PERSON_TRIS + shownVehicles * CAR_TRIS; },
    get drawCalls() { return disposed ? 0 : (crowd && shownPeople ? 1 : 0) + (traffic && shownVehicles ? 1 : 0); },
    dispose() {
      if (disposed) return;
      disposed = true;
      readout?.dispose();
      for (const mesh of [crowd?.mesh, traffic]) {
        if (!mesh) continue;
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        mesh.dispose();
      }
      group.parent?.remove(group);
    },
  };
}
