/** Diagnostic CPU references. Never attach these objects to the scene or treat this preloading as cold-load evidence. */
import * as THREE from 'three';
import { createKit } from '../../kit.ts';
import { createCanonicalStaticAvatar } from '../../body/canonical-crowd.ts';
import { createBody } from '../../body/skinned.ts';
import { SAMPLE_EXPECTATION } from './expectation.ts';
import { captureSurface, capturePlayer, check } from './surfaces.ts';
import type { Surface, PlayerSurface } from './surfaces.ts';

export interface NativeReferences {
  members: Map<string, { lod: Surface[]; full: Surface[] }>;
  player: PlayerSurface[]; playerRecipe: unknown;
  scope: string; dispose(): void;
}
export async function prepareNativeReferences(people: readonly { id: string; look: unknown; seed: string }[], player: { look: unknown; seed: string }, current: () => boolean): Promise<NativeReferences> {
  const kit = createKit(), members: NativeReferences['members'] = new Map(), surfaces: PlayerSurface[] = []; let disposed = false;
  const dispose = () => { if (!disposed) { disposed = true; kit.dispose(); members.clear(); surfaces.length = 0; } };
  try {
    check(people.length === 12 && new Set(people.map(p => p.id)).size === 12, 'Expected twelve independent reference residents');
    for (const person of people) {
      const placement = SAMPLE_EXPECTATION.crowd.find(p => p.id === person.id); check(placement && placement.seed === person.seed, 'Reference resident identity differs');
      const result: { lod: Surface[]; full: Surface[] } = { lod: [], full: [] };
      for (const detail of ['lod', 'full'] as const) {
        check(current(), 'Sample disposed during reference preparation');
        const figure = createCanonicalStaticAvatar(kit, person.look, { seed: person.seed, detail, wardrobeDetail: 'ambient', pose: 'stand', sceneScale: 1,
          x: placement.x, y: placement.y, z: placement.z, ry: placement.ry });
        try {
          await figure.userData.ready; check(current() && figure.userData.characterStatus === 'ready', 'Native reference failed'); figure.updateMatrixWorld(true);
          figure.traverseVisible(node => { if (node instanceof THREE.Mesh) result[detail].push(captureSurface(node, node.matrixWorld)); });
          check(result[detail].length > 0, 'Empty native reference');
        } finally { figure.userData.dispose(); }
      }
      members.set(person.id, result);
    }
    check(current(), 'Sample disposed before player reference');
    const body = createBody(kit, player.look, player.seed, 1);
    try {
      await body.ready; check(current(), 'Sample disposed during player reference'); body.show('idle'); body.settle();
      body.object.traverseVisible(node => { if (node instanceof THREE.Mesh) surfaces.push(capturePlayer(node)); });
      check(surfaces.length > 0 && surfaces.some(surface => surface.kind === 'skinned'), 'Empty or unskinned player reference');
      const playerRecipe: unknown = structuredClone(body.object.userData.nativeRecipe);
      // Retain native source textures independently until the diagnostic is disposed.
      const retained = body.staticMaterials(); kit.onDispose(() => retained.dispose());
      body.object.traverseVisible(node => { if (node instanceof THREE.Mesh) retained.forMesh(node); });
      return { members, player: surfaces, playerRecipe, dispose,
        scope: 'Serial CPU-only public native API reference preload for exact look/seed: both ambient-wardrobe LOD/full residents and complete player (skinned surfaces plus rigid bone-attached surfaces). Extra diagnostic memory/preloading; not cold-load, frame-time or production performance evidence.' };
    } finally { body.dispose(); }
  } catch (error) { dispose(); throw error; }
}
