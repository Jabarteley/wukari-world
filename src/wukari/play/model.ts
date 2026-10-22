import type { Position } from '../geography.ts';

export interface Point { x: number; z: number }
export function bearingOf(direction: Point): number {
  return (Math.atan2(direction.x, -direction.z) * 180 / Math.PI + 360) % 360;
}
export interface Feature {
  id: number; nodes: number[]; tags: Record<string, string>; coordinates: Position[]; points: Point[];
  version?: number; timestamp?: string; distanceM: number; component?: number;
  association: 'nearby-only; FUW ownership unverified';
}
export interface Study {
  roadSurface?: import('./roads.ts').RoadPiece[];
  roadConflicts?: import('./roads.ts').RoadConflict[];
  schemaVersion: 1; id: string; title: string; origin: Position; halfSize: number;
  roads: Feature[]; buildings: Feature[]; sources: { title: string; url: string; note: string }[];
  candidates: { label: string; position: Position; point: Point; confidence: string }[];
  spawn: { point: Point; nodeId: number; roadId: number; review: string; eligible: boolean } | null;
  coverage: { roads: number; buildings: number; components: number; sourceSha256: string; policy: string };
}

export function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
  const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / length)) : 0;
  return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz);
}
export function lineDistance(p: Point, points: Point[]): number {
  let distance = Infinity;
  for (let i = 1; i < points.length; i++) distance = Math.min(distance, segmentDistance(p, points[i - 1]!, points[i]!));
  return distance;
}
export function inside(p: Point, ring: Point[]): boolean {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!, b = ring[j]!;
    if ((a.z > p.z) !== (b.z > p.z) && p.x < (b.x - a.x) * (p.z - a.z) / (b.z - a.z) + a.x) result = !result;
  }
  return result;
}
export function buildingCollision(p: Point, buildings: Pick<Feature, 'points'>[], radius = .4): boolean {
  return buildings.some(b => inside(p, b.points) || lineDistance(p, b.points) < radius);
}
export function permittedForSimulation(tags: Record<string, string>): boolean {
  return ['residential', 'service', 'footway', 'path', 'pedestrian', 'living_street','primary','secondary','tertiary','unclassified'].includes(tags.highway ?? '') &&
    !['no', 'private', 'customers', 'permit', 'military'].includes(tags.access ?? '') &&
    !['no', 'private', 'use_sidepath'].includes(tags.foot ?? '') && !tags.bridge && !tags.tunnel && !tags.ford && !tags.construction;
}
export function canStand(p: Point, study: Study): boolean {
  if (Math.abs(p.x) > study.halfSize - 2 || Math.abs(p.z) > study.halfSize - 2 || buildingCollision(p, study.buildings)) return false;
  // A narrow virtual corridor is a play rule, not a measured road width or access declaration.
  if(study.roadSurface){
    const eligible=new Set(study.roads.filter(r=>permittedForSimulation(r.tags)).map(r=>r.id));
    return study.roadSurface.some(s=>eligible.has(s.roadId)&&segmentDistance(p,s.a,s.b)<=Math.min(2,s.halfWidth-.4));
  }
  return study.roads.some(r => permittedForSimulation(r.tags) && lineDistance(p, r.points) <= 2);
}
export interface Motion extends Point { yaw: number; moving: boolean; sprinting: boolean; blocked: boolean; distance: number }
export function advance(state: Motion, input: Point, yaw: number, sprint: boolean, seconds: number, study: Study, allowed: (p:Point)=>boolean = p=>canStand(p,study)): Motion {
  if (![input.x, input.z, yaw, seconds].every(Number.isFinite) || seconds < 0) return state;
  const size = Math.hypot(input.x, input.z);
  if (!size) return { ...state, moving: false, sprinting: false, blocked: false };
  const speed = sprint ? 6 : 2.4, dt = Math.min(seconds, .05), scale = Math.min(size, 1) / size;
  const dx = (input.x * Math.cos(yaw) + input.z * Math.sin(yaw)) * scale * speed * dt;
  const dz = (-input.x * Math.sin(yaw) + input.z * Math.cos(yaw)) * scale * speed * dt;
  // Substeps prevent sprint/frame gaps tunnelling through thin footprints or corridor gaps.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .1));
  let x = state.x, z = state.z, blocked = false;
  for (let i = 0; i < steps; i++) {
    const next = { x: x + dx / steps, z: z + dz / steps };
    if (allowed(next)) { x = next.x; z = next.z; }
    else {
      blocked = true;
      if (allowed({ x: next.x, z })) x = next.x;
      if (allowed({ x, z: next.z })) z = next.z;
    }
  }
  const moved = Math.hypot(x - state.x, z - state.z);
  return { x, z, yaw: moved > .001 ? Math.atan2(dx, dz) : state.yaw, moving: moved > .001, sprinting: sprint && moved > .001, blocked, distance: state.distance + moved };
}
