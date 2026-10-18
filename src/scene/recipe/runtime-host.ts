import type * as THREE from 'three';
import { createRuntimeHost } from '../models/runtime-host.ts';
import type { RuntimePlacement } from '../models/runtime-module.ts';
import { createModelLayer } from '../models/scene-models.ts';
import type { ValidatedRecipe } from './contract.ts';
import type { PreparedCityAssets } from './prepare.ts';
import { preparedCacheFor } from './cache.ts';
import { createRecipeSigns } from './signs.ts';
import { requireRecipe } from './pack.ts';

type Owner = NonNullable<Awaited<ReturnType<typeof createRuntimeHost>>>;
type HostArguments = Parameters<typeof createRuntimeHost>;
type Cost = { triangles: number; drawCalls: number };
export function recipeRuntimeHost(value: ValidatedRecipe, prepared: PreparedCityAssets, reservation: Cost): typeof createRuntimeHost {
  const start: typeof createRuntimeHost = Object.assign((kit: HostArguments[0], group: HostArguments[1], options: HostArguments[2]) => {
    if (!options.current()) return Promise.resolve(null);
    const { THREE } = kit;
    const spent = options.cost(true), budget = options.budget();
    requireRecipe(spent.triangles + reservation.triangles <= budget.triangles && spent.drawCalls + reservation.drawCalls <= budget.drawCalls, 'complete recipe exceeds host budget');
    const layer = createModelLayer(kit, preparedCacheFor(kit, prepared));
    const root = new THREE.Group(); root.name = `recipe:${value.recipe.venue}`;
    let signs: ReturnType<typeof createRecipeSigns> = null, disposed = false, checking = false, registered = false;
    let placement: RuntimePlacement | null = null;
    let forget: (() => boolean) | undefined;
    const current = () => !disposed && options.current();
    function dispose() {
      if (disposed) return; disposed = true; layer.dispose(); signs?.dispose(); root.removeFromParent(); root.clear(); placement = null; forget?.();
    }
    function fail(message: string): never {
      group.userData.runtimeError = message; group.userData.runtimeStatus = 'error'; dispose(); throw new Error(message);
    }
    const owner: Owner = {
      get placement() { return placement; },
      select(request) { if (!request) { dispose(); return Promise.resolve(false); } return Promise.resolve(current() && placement !== null); },
      dispose,
      guard() {
        if (!current() || checking) return;
        let pending = false;
        group.traverseVisible(node => { if (node.userData.characterStatus === 'loading' || node.userData.characterReservedTriangles > 0 || node.userData.characterReservedDrawCalls > 0) pending = true; });
        if (pending) return;
        checking = true;
        try {
          const fits = () => {
            const cost = options.cost(true), room = options.budget();
            return cost.triangles + reservation.triangles <= room.triangles && cost.drawCalls + reservation.drawCalls <= room.drawCalls;
          };
          if (fits()) return;
          options.readmit();
          if (!fits()) fail(`Complete recipe exceeds whole venue budget: ${JSON.stringify({ spent: options.cost(true), reservation, budget: options.budget() })}`);
        } finally { checking = false; }
      },
      selectAt() {
        if (!current()) return;
        if (!registered) {
          registered = true; checking = true;
          try { options.readmit(); } finally { checking = false; }
          options.changed(); kit.requestRender?.();
        }
        owner.guard();
      },
    };
    try {
      for (const p of value.placements) layer.add({ near: `${p.assetSha256}:${p.node}`, x: p.x, z: p.z, ry: p.ry, scale: p.scale, mode: 'merge' });
      layer.build();
      const stats = layer.stats();
      requireRecipe(stats.placements === value.placements.length && stats.dropped === 0 && stats.standIns === 0 && stats.triangles === value.placements.reduce((sum, p) => sum + p.triangles, 0), 'incomplete prepared recipe geometry');
      root.add(layer.group); signs = createRecipeSigns(kit, value.recipe); if (signs) root.add(signs.mesh);
      const cost = createRuntimeHost.measure(kit, root, []);
      // Fallback objects belong to the host. Measure them without reparenting.
      let supportTriangles = 0, supportDraws = 0;
      for (const object of options.fallback) {
        const measured = createRuntimeHost.measure(kit, object as THREE.Group, []);
        supportTriangles += measured.triangles; supportDraws += measured.drawCalls;
      }
      requireRecipe(cost.triangles + supportTriangles <= reservation.triangles && cost.drawCalls + supportDraws <= reservation.drawCalls, 'actual geometry exceeds recipe reservation');
      const navigation = options.request.navigation;
      const point = (p: readonly number[]) => new THREE.Vector3(p[0]! * 1.4, p[1]! * 1.4, p[2]! * 1.4);
      placement = { root, tier: 'near', ...cost,
        textureBytes: (prepared.kit.atlas ? Math.ceil(1024 * 1024 * 4 * 4 / 3) : 0) + (signs?.textureBytes ?? 0),
        entrance: { position: new THREE.Vector3(value.recipe.entrance[0], 0, value.recipe.entrance[1]), yaw: value.recipe.entrance[2] },
        anchors: navigation.anchors.map(a => ({ id: a.id, kind: a.kind, position: point(a.position) })),
        collision: navigation.collision.map(b => ({ id: b.id, box: new THREE.Box3(point(b.min), point(b.max)) })),
        walkable: navigation.walkable.map(([x0, z0, x1, z1]) => [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]].map(point)),
      };
      requireRecipe(placement.textureBytes <= 9 * 1024 * 1024, 'recipe texture allocation exceeds limit');
      group.add(root);
      options.contact(options.fallbackContact());
      group.userData.runtimeStatus = 'ready'; group.userData.runtimeTier = 'near'; delete group.userData.runtimeError;
      forget = kit.onDispose(dispose);
      return Promise.resolve(owner);
    } catch (error) { dispose(); throw error; }
  }, { solids: createRuntimeHost.solids, support: createRuntimeHost.support, validate: createRuntimeHost.validate, measure: createRuntimeHost.measure });
  return start;
}
