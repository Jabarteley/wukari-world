/** Street routes and traffic retain their authored behavior. People use only native53 source snapshots,
 * with an optional native live actor nearby. Actual geometry and draw costs admit a bounded visible subset;
 * pending appearances hold the last ready native pose and never substitute procedural people.
 * The host owns all frame scheduling. */
import type * as THREE from 'three';
import type { Kit } from '../kit.ts';
import { CAR_LENGTH, PERSON_TRIANGLES as PERSON_TRIS, VEHICLE_KINDS, VEHICLE_TRIANGLES as CAR_TRIS, planTraffic } from './plan.ts';
import type { Lane, Road } from './plan.ts';
import { personAt, planPeople } from './crowd.ts';
import { createGiveWay, flavourTraffic, giveWayFrame, planSchedule, vehiclePose } from './traffic.ts';
import { AVATAR_RADIUS, bodyRadius, giveWay, insideFigure } from './spacing.ts';
import type { Figure, Obstacle } from './spacing.ts';
import type { TrafficPlan } from './traffic.ts';
import type { PeopleWorld, Person, PersonPose, Signal } from './crowd.ts';
import { paintTraffic } from './livery.ts';
import type { PaintedVehicle } from './livery.ts';
import { createAdaptiveCaps, pagePerf, readoutText } from './adaptive.ts';
import type { Caps } from './adaptive.ts';
import { childrenAllowed, nearCap, nearCrowdFor, pageNear } from './near.ts';
import type { Eye, NearChoice } from './near.ts';
import type { NearCrowd, NearCrowdOptions } from './near-draw.ts';
import type { StreetTier } from './plan.ts';
import { createNativeStreetPeople } from './native-people.ts';
import { measureRenderCost, totalRenderCost } from '../body/render-cost.ts';
import { SCENE_CHARACTER_TRIANGLES, SCENE_TRIANGLES, SCENE_DRAW_CALLS } from '../../budgets.ts';

export interface StreetLifeOptions {
  parent: THREE.Object3D
  /** The street's own seed (a place, a street): the same seed gives the same people and cars everywhere. */
  seed: string
  lanes: readonly Lane[]
  roads: readonly Road[]
  /** Crossings of the roads (kerb to kerb): with them, the roads get lights and people cross on them. */
  crossings?: readonly Lane[]
  /** The scene's walkable bounds [minX, minZ, maxX, maxZ]: anyone or anything whose place falls outside is not drawn (the final guard). */
  bounds?: readonly [number, number, number, number]
  /** Vehicles drawn this much narrower (default 1): a narrow street's two lanes. */
  narrow?: number
  /** The city's country id: the taxis' and buses' livery. */
  country?: string | null
  crowd: number
  vehicles: number
  /** The ground's height (default 0). */
  heightAt?(x: number, z: number): number
  /** The final guard for a venue (plan.ts walkableFloor): a person, near body or vehicle anywhere this says no is not drawn (scaled to
   * nothing). It is also the near bodies' floor unless bodyFloor is given. */
  walkable?: ((x: number, z: number) => boolean) | null
  /** Wall-clock milliseconds to place everyone at first. */
  at: number
  /** Where this street is: a venue kind, or 'street' for the home street. Children walk only where near.ts childrenAllowed says. */
  context?: string | null
  /** The street's tier (plan.ts streetLifeFor): with it, the near crowd may be drawn (near.ts nearCrowdFor). */
  tier?: StreetTier | null
  /** Something changed between frames (a near body came in): draw one frame. */
  ready?(): void
  /** Where near bodies may stand (the scene's walk grid; default `walkable`), always inside the final guard too. Neither: no bodies. */
  bodyFloor?: ((x: number, z: number) => boolean) | null
  /** Tests: make the near crowd's bodies without the body module. */
  bodies?: NearCrowdOptions['make']
  /** Other players' figures standing in the street (live places): the crowd gives way to them as to the player. */
  others?(): readonly { x: number; z: number }[]
}
export interface StreetLife {
  readonly group: THREE.Group
  /** Put everyone where they are at this wall-clock time (ms), giving way to the player (and options.others) when given: walkers bend
   * round and slow, standers step aside, vehicles stop short. With the frame's gap (seconds), it is counted toward the adaptive caps
   * and the vehicles' braking. */
  step(at: number, player?: { x: number; z: number } | null, dt?: number): void
  /** The people standing near the player as drawn (refilled each step), each with the least distance the player's centre keeps
   * from theirs (their radius and the avatar's). */
  readonly figures: readonly Figure[]
  /**
   * Is (x, z) inside one of those figures, for a player now at `player`? The host's walk grid asks this on top of its own floor
   * (src/scene/neighbourhood-scene.ts), so the avatar is blocked by, or slides round, the people near it as by a moving circle. A figure
   * the player already overlaps never blocks (nobody can trap the player; the people step aside anyway).
   */
  blocks(x: number, z: number, player: { x: number; z: number } | null | undefined): boolean
  /** Draw at most this many people and vehicles (never more than planned). */
  setCaps(caps: Caps): void
  readonly people: number
  readonly vehicles: number
  /** The lights on the roads, when they have crossings that the stopped traffic keeps clear of. */
  readonly signal: Signal | null
  /** The traffic's schedule (traffic.ts): its lights, each road's path in time, each vehicle's start and roll. */
  readonly schedule: TrafficPlan
  readonly triangles: number
  readonly drawCalls: number
  /** The near crowd (bodies): its choice, how many are drawn, their triangles and draw calls; null where there is none. */
  near(): { tier: string; cap: number; people: number; bodies: number; triangles: number; drawCalls: number; failed: boolean } | null
  dispose(): void
}

/** A colour as linear RGB, the way the renderer wants vertex data. */
function linear(kit: Kit, colour: string): [number, number, number] {
  const c = new kit.THREE.Color(colour);
  return [c.r, c.g, c.b];
}



/**
 * The five boxes of a car, along +z, its wheels on the ground. Vertex colour is a shade; `aPart` says what takes it: 0 the paint (the
 * instance colour), 1 the trim (the livery's stripe), 2 the roof sign (its own light colour, and folded away on all but taxis), 3 the cabin
 * (the paint, shaded; on a motorbike or bicycle it is drawn upright and short: the rider).
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
  box(0, 1.36, -0.2, 1.6, 0.6, length * 0.55, 0.3, 3);              // the cabin: its glass reads as a darker band of the paint (a two-wheeler's rider)
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
// After <color_vertex>: the trim takes the livery's colour, the sign its own light; a car that is no taxi folds its sign away (to a point:
// no pixels). aTrim.w: 1 a taxi's sign, 2 a two-wheeler, whose cabin becomes a rider (short, upright, in dark clothes) and whose stripe folds.
const TRAFFIC_COLOUR = /* glsl */`
#include <color_vertex>
float sKind = floor(aTrim.w + 0.5);
if (aPart > 2.5) { if (sKind > 1.5) vColor = vec3(0.16, 0.15, 0.17); }
else if (aPart > 1.5) vColor = vec3(0.96, 0.93, 0.78); else if (aPart > 0.5) vColor = color * aTrim.rgb;
`;
const TRAFFIC_FOLD = /* glsl */`
#include <begin_vertex>
float sWheels = floor(aTrim.w + 0.5);
if (aPart > 1.5 && aPart < 2.5 && (sWheels < 0.5 || sWheels > 1.5)) transformed = vec3(0.0);
if (aPart > 0.5 && aPart < 1.5 && sWheels > 1.5) transformed = vec3(0.0);
if (aPart > 2.5 && sWheels > 1.5) transformed = vec3(transformed.x * 0.8, 1.06 + (transformed.y - 1.06) * 1.9, -0.25 + (transformed.z + 0.2) * 0.3);
`;

function trafficMesh(kit: Kit, vehicles: readonly PaintedVehicle[]): THREE.InstancedMesh {
  const { THREE } = kit;
  const geometry = carGeometry(kit), trim = new Float32Array(Math.max(1, vehicles.length) * 4);
  vehicles.forEach((vehicle, i) => trim.set([...linear(kit, vehicle.trim), vehicle.kind === 'okada' || vehicle.kind === 'bike' ? 2 : vehicle.sign ? 1 : 0], i * 4));
  geometry.setAttribute('aTrim', new THREE.InstancedBufferAttribute(trim, 4));
  const material = new THREE.MeshLambertMaterial({ color: '#ffffff', vertexColors: true });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${TRAFFIC_PARS}`)
      .replace('#include <color_vertex>', TRAFFIC_COLOUR)
      .replace('#include <begin_vertex>', TRAFFIC_FOLD);
  };
  material.customProgramCacheKey = () => 'street-traffic-3';
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
/** Who counts as near the player for its walker (scene units): the crowd's people inside this are walked round. */
const FIGURE_RADIUS = 6;

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
  const heightAt = options.heightAt ?? (() => 0), walkable = options.walkable, narrow = options.narrow ?? 1;
  const group = new THREE.Group();
  group.name = 'street-life';
  options.parent.add(group);
  const vehicles = flavourTraffic(paintTraffic(planTraffic(options.seed, options.roads, options.vehicles), options.country, options.seed), options.country, options.seed);
  // Lights on the roads when they have crossings and their stopped traffic can be kept off all of them (traffic.ts).
  const crossings = options.crossings ?? [];
  const schedule = planSchedule(vehicles, options.roads, crossings), signal = schedule.signal;
  // The vehicles' give-way to the player (traffic.ts): the seconds of driving each has lost, braking for someone on the road.
  const yielding = createGiveWay(vehicles.length);
  let lastSeconds = NaN;
  const world: PeopleWorld = { lanes: options.lanes, crossings, signal };
  const people = planPeople(options.seed, world, options.crowd, { children: childrenAllowed(options.context) });
  const crowd = people.length ? createNativeStreetPeople(kit, people, options.seed, () => { if (!disposed) { step(last.at,last.player); options.ready?.(); } }) : null;
  const traffic = vehicles.length ? trafficMesh(kit, vehicles) : null;
  if (crowd) group.add(crowd.group);
  if (traffic) group.add(traffic);
  // The final guard: a place outside the walkable bounds is drawn as nothing (a zero matrix: no pixels).
  // A venue's walkable floor (plan.ts walkableFloor) narrows it further: off the floor is drawn as nothing too.
  const bounds = options.bounds, inside = (x: number, z: number): boolean => Number.isFinite(x) && Number.isFinite(z)
    && (!bounds || (x >= bounds[0] && x <= bounds[2] && z >= bounds[1] && z <= bounds[3])) && (!walkable || walkable(x, z) === true);
  const nothing = new THREE.Matrix4().makeScale(0, 0, 0);
  // Near bodies stand only on their floor AND inside the final guard; with no floor at all, there are none (near.ts nearCandidates).
  const floor = options.bodyFloor ?? walkable ?? null, bodyFloor = floor ? (x: number, z: number): boolean => inside(x, z) && floor(x, z) === true : null;
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3(), turn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), still = new THREE.Quaternion();
  const adaptive = createAdaptiveCaps({ crowd: people.length, vehicles: vehicles.length });
  let shownPeople = people.length, shownVehicles = vehicles.length, disposed = false, frames = 0;
  const readout = perfReadout();
  // The near crowd: decided here, drawn by a chunk of its own once it is fetched (until then, and wherever it is off, all are cut-outs).
  const nearChoice: NearChoice | null = crowd ? nearCrowdFor(options.tier ?? null, pageNear()) : null;
  let near: NearCrowd | null = null, last: { at: number; player: { x: number; z: number } | null } = { at: options.at, player: null };
  const poses: (PersonPose | null)[] = people.map(() => null), heights = new Float32Array(people.length);
  const radii = people.map((person) => bodyRadius(person.height, person.width)), figures: Figure[] = [];
  // Giving way keeps people on the near bodies' floor where there is one, else inside the final guard.
  const yieldFloor = bodyFloor ?? inside;

  function remaining(): {triangles:number;drawCalls:number} {
    let root: THREE.Object3D=group;while(root.parent)root=root.parent;
    const cost=measureRenderCost(root,group), trafficCost=traffic?totalRenderCost(traffic):{triangles:0,drawCalls:0};
    return {triangles:Math.max(0,Math.min(SCENE_CHARACTER_TRIANGLES.value-cost.characters.triangles,SCENE_TRIANGLES.value-cost.characters.triangles-cost.scenery.triangles-trafficCost.triangles)),drawCalls:Math.max(0,SCENE_DRAW_CALLS.value-cost.characters.drawCalls-cost.scenery.drawCalls-trafficCost.drawCalls)};
  }

  function setCaps(caps: Caps): void {
    if (disposed) return;
    shownPeople = Math.max(0, Math.min(people.length, Math.floor(caps.crowd)));
    shownVehicles = Math.max(0, Math.min(vehicles.length, Math.floor(caps.vehicles)));
    if (traffic) traffic.count = shownVehicles;
    if (near && nearChoice) near.setCap(nearCap(nearChoice, shownPeople, people.length));
  }

  function step(at: number, player?: { x: number; z: number } | null, dt?: number): void {
    if (disposed) return;
    last = { at, player: player ?? null };
    if (dt !== undefined) {
      const caps = adaptive.frame(dt);
      if (caps) setCaps(caps);
      frames += 1;
      if (readout && frames % 15 === 0) readout.show(`${readoutText({ average: adaptive.average, people: shownPeople, vehicles: shownVehicles, shrinks: adaptive.shrinks, triangles: shownPeople * PERSON_TRIS + shownVehicles * CAR_TRIS + (near?.triangles ?? 0) })}${near ? ` · near ${near.shown}/${near.cap}` : ''}`);
    }
    const seconds = at / 1000;
    if (!Number.isFinite(lastSeconds) || seconds < lastSeconds) lastSeconds = seconds;
    const obstacles: Obstacle[] = [...(player ? [{ x: player.x, z: player.z }] : []), ...(options.others?.() ?? [])].filter((o) => Number.isFinite(o.x) && Number.isFinite(o.z));
    figures.length = 0;
    if (crowd) {
      for (let i = 0; i < people.length; i++) {
        if (i >= shownPeople) { poses[i] = null; continue; }
        const pose = personAt(people[i]!, world, seconds);
        const spot = obstacles.length ? giveWay({ x: pose.x, z: pose.z, ry: pose.ry, radius: radii[i]!, moving: pose.mode === 0 }, obstacles, yieldFloor) : pose;
        poses[i] = spot.x === pose.x && spot.z === pose.z ? pose : { ...pose, x: spot.x, z: spot.z };
        heights[i] = heightAt(spot.x, spot.z);
      }
      // Who is a body this frame: their cut-outs collapse to nothing (zero size: no pixels), everyone else is drawn as before.
      const bodies = near ? near.update({ poses, heights, count: shownPeople, eye: player ? { x: player.x, z: player.z } : null, player: player ?? null, obstacles, seconds, dt: dt ?? 0 }) : null;
      const room=remaining();
      const farVisible=crowd.update(poses,heights,bodies,player??null,{triangles:Math.max(0,room.triangles-(near?.triangles??0)),drawCalls:Math.max(0,room.drawCalls-(near?.drawCalls??0))},inside);
      for (let i = 0; i < shownPeople; i++) {
        const pose=poses[i];if(!pose||(!bodies?.has(i)&&!farVisible.has(i)))continue;
        const here=bodies?.has(i)?near?.spot(i)??pose:pose;
        if(player&&Math.hypot(here.x-player.x,here.z-player.z)<FIGURE_RADIUS)figures.push({x:here.x,z:here.z,r:radii[i]!+AVATAR_RADIUS});
      }
    }
    if (traffic) {
      const halfOf = (i: number): number => 0.9 * (VEHICLE_KINDS[vehicles[i]!.kind].wide ?? 1) * narrow;
      // Giving way to the player (traffic.ts createGiveWay), over the wall-clock seconds since the last step: a street that slept while the
      // player stood on the road does not wake with a vehicle inside them.
      if (seconds > lastSeconds && (obstacles.length || yielding.lost.some((value) => value > 0))) {
        yielding.advance(giveWayFrame(schedule, vehicles, options.roads, lastSeconds, seconds, shownVehicles, halfOf, obstacles));
      }
      for (let i = 0; i < shownVehicles; i++) {
        const vehicle = vehicles[i]!, spec = VEHICLE_KINDS[vehicle.kind];
        const pose = vehiclePose(schedule, vehicles, options.roads, i, seconds, yielding.lost[i] ?? 0);
        position.set(pose.x, heightAt(pose.x, pose.z), pose.z);
        scale.set((spec.wide ?? 1) * narrow, spec.tall, spec.length);
        const reach = vehicle.length / 2, ends = inside(pose.x, pose.z) && inside(pose.x + Math.sin(pose.ry) * reach, pose.z + Math.cos(pose.ry) * reach) && inside(pose.x - Math.sin(pose.ry) * reach, pose.z - Math.cos(pose.ry) * reach);
        traffic.setMatrixAt(i, ends ? matrix.compose(position, turn.setFromAxisAngle(up, pose.ry), scale) : nothing);
      }
      traffic.instanceMatrix.needsUpdate = true;
    }
    lastSeconds = seconds;
  }
  step(options.at);
  if (nearChoice) {
    void import('./near-draw.ts').then((module) => {
      if (disposed || near) return;
      near = module.createNearCrowd(kit, { parent: group, seed: options.seed, people, choice: nearChoice, walkable: bodyFloor, room: remaining, changed: () => { if (disposed) return; step(last.at, last.player); options.ready?.(); }, ...(options.bodies ? { make: options.bodies } : {}) });
      near.setCap(nearCap(nearChoice, shownPeople, people.length));
      step(last.at, last.player);
    }).catch(() => undefined);
  }

  return {
    group, step, setCaps, signal, schedule, figures,
    blocks: (x, z, player) => !disposed && insideFigure(x, z, player, figures),
    near: () => (near && nearChoice ? { tier: nearChoice.tier, cap: near.cap, people: near.shown, bodies: near.bodies, triangles: near.triangles, drawCalls: near.drawCalls, failed: near.failed } : null),
    get people() { return (crowd?.shown ?? 0) + (near?.shown ?? 0); },
    get vehicles() { return shownVehicles; },
    get triangles() { return disposed ? 0 : totalRenderCost(group).triangles; },
    get drawCalls() { return disposed ? 0 : totalRenderCost(group).drawCalls; },
    dispose() {
      if (disposed) return;
      disposed = true;
      readout?.dispose();
      near?.dispose(); near = null;
      crowd?.dispose();
      for (const mesh of [traffic]) {
        if (!mesh) continue;
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        mesh.dispose();
      }
      group.parent?.remove(group);
    },
  };
}
