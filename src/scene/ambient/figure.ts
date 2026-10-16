/** Canonical characters for the ambient venue layer. The planner owns who appears and when. */
import type * as THREE from 'three';
import type { AvatarGroup } from '../characters.ts';
import type { Kit } from '../kit.ts';
import { createCanonicalStaticAvatar, buildCanonicalCrowd } from '../body/canonical-crowd.ts';
import { createBody } from '../body/skinned.ts';
import { normalizeLook } from '../characters.ts';
import type { AmbientPose } from './plan.ts';
import { AMBIENT_STRIDE_DISTANCE } from './plan.ts';

export interface FigureSpec { seed: string; look?: unknown; pose: AmbientPose; step: number; stride?:number; seat: number; lean?: boolean }
export type MotionPose = Exclude<AmbientPose, 'sit'>;
export interface MotionFigure {
  readonly group: AvatarGroup;
  pose(pose: MotionPose, stride?: number, instant?: boolean): void;
  face(blink: number, speech: number): void;
  step(dt: number): boolean;
  settle(): void;
  dispose(): void;
}

function trianglesIn(root: THREE.Object3D): number {
  let total = 0;
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const geometry = mesh.geometry;
    const available = geometry.index?.count ?? geometry.getAttribute('position')?.count ?? 0;
    total += Math.floor(Math.min(available, geometry.drawRange.count) / 3);
  });
  return total;
}

/** One movable posed figure. Nearby ambient people retain the same source body and clothing as the wider crowd. */
export function makeFigure(kit: Kit, spec: FigureSpec): AvatarGroup {
  return createCanonicalStaticAvatar(kit, spec.look, {
    seed: spec.seed,
    pose: spec.pose,
    stride: spec.pose === 'walk' ? spec.stride??(spec.step ? 0.75 : 0.25) : undefined,
    seat: spec.pose === 'sit' ? spec.seat : undefined,
    detail: 'lod', wardrobeDetail: 'ambient',
  });
}

/** A small bounded set of nearby people retains a live rig so walking and pose transitions stay smooth. */
export function makeMotionFigure(kit: Kit, spec: Omit<FigureSpec, 'lean'>): MotionFigure {
  if (spec.pose === 'sit') throw new Error('Sitting ambient figures use a canonical static pose');
  const body = createBody(kit, spec.look, spec.seed, 1, { detail: 'lod', wardrobeDetail: 'ambient' });
  body.place(0,0,0,0);
  const group = body.object as AvatarGroup;
  group.name = 'canonical-ambient-motion';
  group.userData = {
    ...group.userData,
    look: normalizeLook(spec.look, spec.seed),
    top: (group.userData.top ?? 1.85 * body.scale),
    triangles: trianglesIn(group),
    dispose: () => body.dispose(),
  };
  let previousStride:number|undefined, nativePhase=0;
  const pose = (next: MotionPose, stride = 0, instant = false): void => {
    if (next === 'walk') {
      if(previousStride===undefined||instant)nativePhase=stride;
      else nativePhase+=((stride-previousStride+1)%1)*AMBIENT_STRIDE_DISTANCE/body.cycleDistance(false);
      previousStride=stride;
      body.stride(nativePhase * Math.PI * 2, false, 0, !instant);
    }
    else {previousStride=undefined;body.show(next === 'work' || next === 'wave' ? 'interact' : 'idle', !instant);}
    if (instant) body.settle();
  };
  const controller: MotionFigure = {
    group,
    pose,
    face(blink, speech) { body.setAmbientFace(blink, speech); },
    step(dt) { return body.step(dt); },
    settle() { body.settle(); },
    dispose() { body.dispose(); },
  };
  pose(spec.pose, spec.pose === 'walk' ? (spec.step ? 0.75 : 0.25) : 0, true);
  return controller;
}

export interface FarSpec { x: number; z: number; ry: number; seed: string }
export interface FarFigures { group: THREE.Group; triangles: number; dispose(): void }

/** The far population uses instances of the same rig and clothing, baked once per shared look and pose. */
export function makeFarFigures(kit: Kit, people: readonly FarSpec[]): FarFigures {
  const crowd = buildCanonicalCrowd(kit, people.map((person) => ({
    id: person.seed, seed: person.seed, x: person.x, z: person.z, ry: person.ry, kind: 'npc' as const, pose: 'stand' as const,
  })), { detail: 'lod' });
  crowd.group.name = 'ambient-far';
  return { group: crowd.group, triangles: crowd.triangles, dispose: crowd.dispose };
}
