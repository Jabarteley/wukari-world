import type { Group, Object3D, Bone } from 'three';
import type { NativeAppearanceV2 } from '../../../character/native-recipe.ts';
export interface NativeActor {
  id: string;
  root: Group;
  readonly model: Object3D;
  readonly bones: Map<string, Bone>;
  setAppearance(patch: NativeAppearanceV2): Promise<{ok:boolean;reason?:string}>;
  setAppearanceSync(patch: NativeAppearanceV2): {ok:boolean;reason?:string};
  setMotion(motion: Record<string, unknown>): void;
  setAction(id: string): {ok:boolean;duration?:number;hold?:boolean};
  sampleAction(id:string,seconds:number): {ok:boolean};
  cancelAction(options?: {immediate?:boolean}): void;
  setEmotion(id: string, strength?: number): void;
  setVisible(value: boolean): void;
  update(dt: number): void;
  getStrideScale(): number;
  getEyeHeight(): number;
  getChairOffset(): number;
  getFaceTarget(): import('three').Vector3;
  retainAssets(): ()=>void;
  resetMotionSupport(): void;
  snapshot(): Record<string, unknown>;
  stats(): Record<string, number>;
  dispose(): void;
}
export interface NativeSpawn {id:string;appearance?:Partial<NativeAppearanceV2>;position?:number[];groundHeight?:(x:number,z:number)=>number}
export interface NativeSystem {
  catalog: Record<string, unknown>;
  clips: {name:string;duration:number}[];
  motionMetadata: {clips?:Record<string,Record<string,unknown>>};
  preload(appearances: Partial<NativeAppearanceV2>[]): Promise<()=>void>;
  spawn(options: NativeSpawn): Promise<NativeActor>;
  spawnSync(options: NativeSpawn): NativeActor;
  /**
   * spawnSync() (with load, spawn()) that, at each slice point, awaits pause() when it returns a promise: a body built over several
   * frames (baking background people). Without load it fails, as spawnSync() does, when an asset is not loaded yet.
   */
  spawnSliced(options: NativeSpawn, pause?: () => Promise<void> | null | undefined, load?: boolean): Promise<NativeActor>;
  update(dt:number):void;
  stats():Record<string,number>;
  /** Dispose the cached files' geometries and textures on every renderer (they upload again when next drawn): see scene/shared-gpu.ts. */
  releaseGpu():void;
  dispose():void;
}
export function createCharacterSystem(options: Record<string, unknown> & {scene:Group}): Promise<NativeSystem>;
export function normalizeAppearance(catalog: unknown, value?: unknown): NativeAppearanceV2;
export function advanceLocomotionState(previous?:Record<string,unknown>,input?:Record<string,unknown>): Record<string,unknown>;
export const EMOTIONS: Record<string, Record<string,number>>;
export const HAND_POSES: string[];
