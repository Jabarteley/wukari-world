import type { Group, Object3D } from 'three';
interface Applied { ok: boolean; stale?: boolean; reason?: string }
interface ForegroundActor {
  actor: { root: Group; snapshot(): { appearance: { height: number } } };
  setLook(look: unknown): Promise<Applied>;
  dispose(): void;
}
export function createForegroundCharacters(options: {
  scene: Object3D; groundHeight: (x: number, z: number) => number; maxActors?: number;
}): Promise<{
  spawn(options: { id: string; look: unknown }): Promise<ForegroundActor>;
  update(dt: number): void;
  dispose(): void;
}>;
