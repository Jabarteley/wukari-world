/**
 * OWNER: scenes
 * Street life, drawn (the plan, the gate and the caps are ./plan.ts). Fetched only on a device that passed the gate, after the scene's
 * first frame: never part of the first download or of the shared scene chunk.
 *
 *   crowd    ONE InstancedMesh of camera-facing quads (two triangles a person). Each instance's matrix carries where the person stands and
 *            how tall and wide they are; the shader turns the quad to the camera about the vertical and cuts a person out of it (head,
 *            hair or wrap, shirt and arms, trousers or a skirt, shoes) in that person's colours, the legs and arms swinging with the stride.
 *            Lit by the scene's own lights (Lambert) and fogged like the rest. No shadow: one draw call.
 *   traffic  ONE InstancedMesh of a car of three boxes (body, cabin and glass, wheels): a per-instance colour and a matrix that stretches it
 *            into a bus or a truck. No shadow: one draw call.
 *
 * It asks for no frames of its own: step() is called by whoever owns the frame loop, inside their window (the battery rule).
 */
import type * as THREE from 'three';
import type { Kit } from '../kit.ts';
import { CAR_LENGTH, VEHICLE_KINDS, planCrowd, planTraffic, stepAside, vehicleAt, walkerAt } from './plan.ts';
import type { Lane, Road, Vehicle, Walker } from './plan.ts';

export interface StreetLifeOptions {
  parent: THREE.Object3D
  /** The street's own seed (a place, a street): the same seed gives the same people and cars everywhere. */
  seed: string
  lanes: readonly Lane[]
  roads: readonly Road[]
  crowd: number
  vehicles: number
  /** The ground's height (default 0). */
  heightAt?(x: number, z: number): number
  /** Wall-clock milliseconds to place everyone at first. */
  at: number
}
export interface StreetLife {
  readonly group: THREE.Group
  /** Put everyone where they are at this wall-clock time (ms), stepping aside round the player when given. */
  step(at: number, player?: { x: number; z: number } | null): void
  readonly people: number
  readonly vehicles: number
  readonly triangles: number
  readonly drawCalls: number
  dispose(): void
}

const CROWD_PARS_VERTEX = /* glsl */`
attribute vec3 aGait;
attribute vec3 aShirt;
attribute vec3 aLegs;
attribute vec4 aSkin;
uniform vec3 uCam;
varying vec2 vBody;
varying vec3 vGait;
varying vec3 vShirt;
varying vec3 vLegs;
varying vec4 vSkin;
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
vBody = vec2(position.x * sWide / sTall, position.y);
vGait = vec3(aGait.x * 6.2831853, dot(vec2(sRight.x, sRight.z), vec2(sin(aGait.y), cos(aGait.y))), aGait.z);
vShirt = aShirt; vLegs = aLegs; vSkin = aSkin;
`;
const CROWD_PROJECT = /* glsl */`
transformed = sCentre + sRight * (position.x * sWide) + vec3(0.0, position.y * sTall, 0.0);
vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
gl_Position = projectionMatrix * mvPosition;
`;
const CROWD_PARS_FRAGMENT = /* glsl */`
varying vec2 vBody;
varying vec3 vGait;
varying vec3 vShirt;
varying vec3 vLegs;
varying vec4 vSkin;
float sBox(vec2 p, vec2 c, vec2 h) { vec2 d = abs(p - c) - h; return max(d.x, d.y); }
float sSeg(vec2 p, vec2 a, vec2 b, float r) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
`;
// Replaces <color_fragment>. The body is drawn in heights (0 at the feet, 1 at the top of the head) and cut out of the quad.
const CROWD_COLOUR = /* glsl */`
vec2 p = vBody;
float sw = sin(vGait.x), across = vGait.y, facing = 1.0 - abs(across);
float stride = 0.085 * sw * across;
float legA = sSeg(p, vec2(-0.042, 0.47), vec2(-0.045 + stride, 0.035 + 0.03 * facing * max(sw, 0.0)), 0.034);
float legB = sSeg(p, vec2(0.042, 0.47), vec2(0.045 - stride, 0.035 + 0.03 * facing * max(-sw, 0.0)), 0.034);
float legs = min(legA, legB);
float skirt = vSkin.w >= 4.0 ? sBox(p, vec2(0.0, 0.38), vec2(0.07 + (0.5 - p.y) * 0.22, 0.13)) : 1.0;
float torso = sBox(p, vec2(0.0, 0.665), vec2(0.082 + (p.y - 0.5) * 0.13, 0.17));
float swing = -0.065 * sw * across;
float armA = sSeg(p, vec2(-0.118, 0.8), vec2(-0.135 + swing, 0.5), 0.029);
float armB = sSeg(p, vec2(0.118, 0.8), vec2(0.135 - swing, 0.5), 0.029);
float hands = min(length(p - vec2(-0.135 + swing, 0.5)), length(p - vec2(0.135 - swing, 0.5))) - 0.031;
float neck = sBox(p, vec2(0.0, 0.85), vec2(0.026, 0.035));
float head = length((p - vec2(0.0, 0.915)) * vec2(1.0, 0.86)) - 0.066;
float body = min(min(min(legs, skirt), min(torso, min(armA, armB))), min(min(hands, neck), head));
if (body > 0.0) discard;
// At a lane's ends a person dissolves in or out (a screen-door pattern: still one opaque pass, no sorting).
if (vGait.z < 0.999 && fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) > vGait.z) discard;
vec3 sColour = vLegs;
if (torso <= 0.0 || armA <= 0.0 || armB <= 0.0) sColour = vShirt;
if (skirt <= 0.0 && p.y < 0.5) sColour = vLegs;
if (hands <= 0.0 || neck <= 0.0 || head <= 0.0) sColour = vSkin.rgb;
float style = mod(vSkin.w, 4.0);
if (head <= 0.0 && p.y > 0.925 - (style > 0.5 && style < 1.5 ? 0.012 : 0.0)) sColour = style > 1.5 ? vec3(0.62, 0.6, 0.57) : style > 0.5 ? vShirt * 0.85 : vec3(0.07, 0.06, 0.055);
if (p.y < 0.04 && legs <= 0.0) sColour = vec3(0.09, 0.08, 0.075);
diffuseColor.rgb *= sColour;
`;

/** A colour as linear RGB, the way the renderer wants vertex data. */
function linear(kit: Kit, colour: string): [number, number, number] {
  const c = new kit.THREE.Color(colour);
  return [c.r, c.g, c.b];
}

function crowdMesh(kit: Kit, walkers: readonly Walker[]): { mesh: THREE.InstancedMesh; gait: THREE.InstancedBufferAttribute } {
  const { THREE } = kit, n = walkers.length;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const shirt = new Float32Array(n * 3), legs = new Float32Array(n * 3), skin = new Float32Array(n * 4), gaitData = new Float32Array(n * 3);
  walkers.forEach((walker, i) => {
    shirt.set(linear(kit, walker.shirt), i * 3);
    legs.set(linear(kit, walker.legs), i * 3);
    skin.set([...linear(kit, walker.skin), walker.style + (walker.skirt ? 4 : 0)], i * 4);
  });
  geometry.setAttribute('aShirt', new THREE.InstancedBufferAttribute(shirt, 3));
  geometry.setAttribute('aLegs', new THREE.InstancedBufferAttribute(legs, 3));
  geometry.setAttribute('aSkin', new THREE.InstancedBufferAttribute(skin, 4));
  const gait = new THREE.InstancedBufferAttribute(gaitData, 3);
  gait.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aGait', gait);
  const material = new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide });
  const uCam = { value: new THREE.Vector3(0, 10, 20) };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCam = uCam;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${CROWD_PARS_VERTEX}`)
      .replace('#include <defaultnormal_vertex>', CROWD_NORMAL)
      .replace('#include <project_vertex>', CROWD_PROJECT);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${CROWD_PARS_FRAGMENT}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${CROWD_COLOUR}`);
  };
  material.customProgramCacheKey = () => 'street-crowd-1';
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

/** The three boxes of a car, along +z, its wheels on the ground: vertex colour 1 takes the instance's paint, the darker ones are glass and tyres. */
function carGeometry(kit: Kit): THREE.BufferGeometry {
  const { THREE } = kit, positions: number[] = [], normals: number[] = [], colours: number[] = [], index: number[] = [];
  const box = (cx: number, cy: number, cz: number, w: number, h: number, d: number, shade: number): void => {
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
      }
      index.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  };
  const length = CAR_LENGTH;
  box(0, 0.22, 0, 1.7, 0.44, length * 0.84, 0.12);                  // the wheels and the shadow under the car
  box(0, 0.75, 0, 1.8, 0.62, length, 1);                            // the body
  box(0, 1.36, -0.2, 1.6, 0.6, length * 0.55, 0.3);                 // the cabin: its glass reads as a darker band of the paint
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setIndex(index);
  return geometry;
}

function trafficMesh(kit: Kit, vehicles: readonly Vehicle[]): THREE.InstancedMesh {
  const { THREE } = kit;
  const mesh = new THREE.InstancedMesh(carGeometry(kit), new THREE.MeshLambertMaterial({ color: '#ffffff', vertexColors: true }), Math.max(1, vehicles.length));
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

export function createStreetLife(kit: Kit, options: StreetLifeOptions): StreetLife {
  const { THREE } = kit;
  const heightAt = options.heightAt ?? (() => 0);
  const group = new THREE.Group();
  group.name = 'street-life';
  options.parent.add(group);
  const walkers = planCrowd(options.seed, options.lanes, options.crowd);
  const vehicles = planTraffic(options.seed, options.roads, options.vehicles);
  const crowd = walkers.length ? crowdMesh(kit, walkers) : null;
  const traffic = vehicles.length ? trafficMesh(kit, vehicles) : null;
  if (crowd) group.add(crowd.mesh);
  if (traffic) group.add(traffic);
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3(), turn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), still = new THREE.Quaternion();
  let disposed = false;

  function step(at: number, player?: { x: number; z: number } | null): void {
    if (disposed) return;
    const seconds = at / 1000;
    if (crowd) {
      const gait = crowd.gait.array as Float32Array;
      walkers.forEach((walker, i) => {
        const pose = walkerAt(walker, options.lanes[walker.lane]!, seconds), at = stepAside(pose, player);
        position.set(at.x, heightAt(at.x, at.z), at.z);
        scale.set(walker.height * 0.5, walker.height, 1);
        crowd.mesh.setMatrixAt(i, matrix.compose(position, still, scale));
        gait[i * 3] = pose.phase; gait[i * 3 + 1] = pose.ry; gait[i * 3 + 2] = pose.fade;
      });
      crowd.mesh.instanceMatrix.needsUpdate = true;
      crowd.gait.needsUpdate = true;
    }
    if (traffic) {
      vehicles.forEach((vehicle, i) => {
        const pose = vehicleAt(vehicle, options.roads[vehicle.road]!, seconds), spec = VEHICLE_KINDS[vehicle.kind];
        position.set(pose.x, heightAt(pose.x, pose.z), pose.z);
        scale.set(1, spec.tall, spec.length);
        traffic.setMatrixAt(i, matrix.compose(position, turn.setFromAxisAngle(up, pose.ry), scale));
      });
      traffic.instanceMatrix.needsUpdate = true;
    }
  }
  step(options.at);

  const triangles = walkers.length * 2 + vehicles.length * 36;
  return {
    group, step,
    get people() { return walkers.length; },
    get vehicles() { return vehicles.length; },
    get triangles() { return disposed ? 0 : triangles; },
    get drawCalls() { return disposed ? 0 : (crowd ? 1 : 0) + (traffic ? 1 : 0); },
    dispose() {
      if (disposed) return;
      disposed = true;
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
