/** Shared native53 character boundary. No alternate rig or procedural wardrobe. */
import type * as THREE from 'three';
import type { BodyKey } from './manifest.ts';
import type { BodyPose } from './poses.ts';
import type { WardrobeMetrics, WardrobePresentation } from '../wardrobe/renderer.ts';
import type { FootContact, FootSolveResult } from './foot-contact.ts';
export type { BodyPose };
export type BodyDetail = 'full' | 'lod';
export const SIT = Object.freeze({ contact: .45, back: .423 });
export const LIFT = 0;
/** World unit conversion only; native proportions and shape are unchanged. */
export const fitScale = (_key: BodyKey, sceneScale: number): number => 1.4 * sceneScale;
export interface SkinnedBody {
  /** Add this to the scene; move it with place(). */
  readonly object: THREE.Group;
  readonly ready: Promise<void>;
  readonly key: BodyKey;
  /** Scene units per body unit. */
  readonly scale: number;
  /** Effective local-axis scales; scale remains the vertical factor for older callers. */
  readonly scaleX: number;
  readonly scaleZ: number;
  /** Multiply the existing authored stride distance by this relative proportion factor. */
  readonly strideScale: number;
  /** Full native left/right cycle in this actor's scene units. */
  cycleDistance(jog: boolean): number;
  readonly wardrobe: WardrobeMetrics;
  readonly wardrobeError: string | null;
  setPresentation(presentation: WardrobePresentation): boolean;
  sampleFootContacts(): readonly FootContact[];
  solveFeet(heightAt: (contact: FootContact) => number): FootSolveResult;
  /** True while a bounded pose or locomotion blend still needs host frames. */
  readonly easing: boolean;
  /** True when the current raw animation sample can receive standing foot correction. */
  readonly contactSolvable: boolean;
  readonly pose: BodyPose;
  /** True while seated, lying, soaking or entering/leaving a furniture pose. */
  readonly seated: boolean;
  /** Show a pose: a still frame, or, into and out of `sit` and `lie` with `animate`, the bounded transition first. */
  show(pose: BodyPose, animate?: boolean): void;
  /** Sample a known use loop after entry; the scene owns its bounded duration and motion loop. */
  sampleUse(pose: BodyPose, seconds: number): void;
  /** Just came in through a door: with `animate`, the push-and-step-through clip, then idle; else idle. */
  enter(animate: boolean): void;
  /**
   * One walking frame: the walk (or jog) clip at the stride phase (radians; 2π is a full left-right cycle). `climb`
   * > 0 walking up a stair or ramp, < 0 down it: the stairs clips (same length as the walk, so the phase holds).
   */
  stride(phase: number, jog: boolean, climb?: number, animate?: boolean): void;
  /** Advance a bounded pose or locomotion transition. True while more frames are needed. */
  step(dt: number): boolean;
  /** Jump to the end of a transition. */
  settle(): void;
  /** Stand (or walk) with the feet on a floor at height y; retain this destination while resting on furniture. */
  place(x: number, y: number, z: number, ry: number): void;
  /**
   * Sit with the pelvis over (x, z) on a seat whose top is at height `top`, facing ry. Lying: the hips over (x, z) on
   * a mattress whose top is `top`, the feet toward ry (the head the other way). Transitions blend from the current
   * placement to this resting anchor, or back to the last place() destination when getting up.
   */
  sitOn(x: number, top: number, z: number, ry: number): void;
  /** A standing/crouched object-use anchor, with feet over its floor; keep the separate place() exit destination. */
  workOn(x: number, floor: number, z: number, ry: number): void;
  fit(sceneScale: number): void;
  /** Wear another look. False when it needs the other body file (load again). */
  wear(look: unknown, seed?: unknown): boolean;
  /** Transient facial response supplied by an active scene frame; settle() clears it. */
  setAmbientFace(blink: number, speech: number): void;
  /** Owned material snapshots for a CPU-baked crowd figure; safe after this body is disposed. */
  staticMaterials(): { forMesh(mesh: THREE.Mesh): THREE.Material | THREE.Material[]; dispose(): void };
  dispose(): void;
}

export { createNativeBody as createBody, loadNativeBody as loadBody, preloadNativeBodies as preloadCanonicalBodies, preloadLooks, nativeSystem, recipeForLook } from '../character-lab/native-body.ts';
