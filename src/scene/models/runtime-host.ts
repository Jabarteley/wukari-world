/** Runtime-only placement work, imported by the lazy Nigeria scene definitions. */
import type * as THREE from 'three';
import type { Kit } from '../kit.ts';
import type { ContactSurfaceQuery } from '../venue-scenes.ts';
import type { RuntimeRequest } from './runtime-module.ts';

async function startRuntimeHost(kit: Kit, group: THREE.Group, options: {
  open?: NonNullable<Parameters<typeof import('./runtime-module.ts').createRuntimeModule>[2]>['open'];
  current(): boolean;
  cost(excludeRuntime?: boolean): { triangles: number; drawCalls: number };
  budget(): { triangles: number; drawCalls: number };
  readmit(): void;
  request: Omit<RuntimeRequest, 'tier' | 'distance' | 'budget'>;
  bounds: readonly [number, number, number, number];
  fallback: THREE.Object3D[];
  heights: number[];
  index(meshes: readonly THREE.Mesh[], heights: readonly number[]): ContactSurfaceQuery;
  fallbackContact(): ContactSurfaceQuery | null;
  contact(query: ContactSurfaceQuery | null): void;
  changed(): void;
}) {
  const { createRuntimeModule } = await import('./runtime-module.ts');
  if (!options.current()) return null;
  const { THREE } = kit;
  type Tier = 'near' | 'far';
  let selection: Tier | null = null, checking = false, generation = 0, disposed = false;
  let camera: [number, number] | null = null;
  const failures = { near: 0, far: 0 }, retryAt = { near: 0, far: 0 };
  const blocked: Partial<Record<Tier, { triangles: number; drawCalls: number }>> = {};
  const current = () => !disposed && options.current();
  function failed(tier: Tier) {
    selection = null;
    retryAt[tier] = Date.now() + 1000 * 4 ** failures[tier]++;
  }
  const owner = createRuntimeModule(kit, group, { open: options.open, changed(placement) {
    if (!current()) return;
    if (placement) {
      const spent = options.cost(true), budget = options.budget();
      if (spent.triangles + placement.triangles > budget.triangles || spent.drawCalls + placement.drawCalls > budget.drawCalls) throw new Error('Runtime scenery exceeds whole venue budget');
      // Bake transient CPU geometry into venue coordinates; retain authored render meshes.
      group.updateWorldMatrix(true, true);
      const inverse = group.matrixWorld.clone().invert(), meshes: THREE.Mesh[] = [];
      placement.root.traverse(child => {
        if (!(child as THREE.Mesh).isMesh) return;
        const source = child as THREE.Mesh, geometry = source.geometry.clone();
        geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, source.matrixWorld));
        const mesh = new THREE.Mesh(geometry, source.material); mesh.name = 'solid'; meshes.push(mesh);
      });
      try { options.contact(options.index(meshes, options.heights)); }
      finally { for (const mesh of meshes) mesh.geometry.dispose(); }
      for (const object of options.fallback) object.visible = false;
      delete group.userData.runtimeError;
      group.userData.runtimeTier = placement.tier;
      group.userData.runtimeStatus = 'ready';
    } else {
      options.contact(options.fallbackContact());
      for (const object of options.fallback) object.visible = true;
      delete group.userData.runtimeTier;
      group.userData.runtimeStatus = 'fallback';
    }
    options.changed();
  } });
  const dispose = owner.dispose;
  return Object.assign(owner, {
    dispose() { disposed = true; generation++; selection = null; camera = null; dispose(); },
    guard() {
      if (!current() || checking) return;
      if (!owner.placement) { if (camera) this.selectAt(...camera); return; }
      checking = true;
      try {
        const budget = options.budget();
        let spent = options.cost();
        if (spent.triangles <= budget.triangles && spent.drawCalls <= budget.drawCalls) return;
        // A higher-detail hero can arrive after scenery; admit the network crowd again.
        options.readmit();
        spent = options.cost();
        if (spent.triangles > budget.triangles || spent.drawCalls > budget.drawCalls) {
          group.userData.runtimeError = 'Runtime scenery unloaded: whole venue budget exceeded';
          const placement = owner.placement;
          blocked[placement.tier] = { triangles: placement.triangles, drawCalls: placement.drawCalls };
          failed(placement.tier); generation++;
          void owner.select(null);
        }
      } finally { checking = false; }
    },
    selectAt(x: number, z: number) {
      if (!current()) return;
      camera = [x, z];
      const [x0, z0, x1, z1] = options.bounds;
      const distance = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
      const tier = options.request.indoors || distance < 30 ? 'near' : 'far';
      if (tier === selection || failures[tier] >= 3 || Date.now() < retryAt[tier]) return;
      // An evicted tier must regain capacity before doing any actor rebuild or network work.
      const required = blocked[tier];
      if (required) {
        const spent = options.cost(true), budget = options.budget();
        if (spent.triangles + required.triangles > budget.triangles || spent.drawCalls + required.drawCalls > budget.drawCalls) return;
      }
      // A late hero can fit with the far tier while its crowd exceeds the near reservation.
      const wasChecking = checking; checking = true;
      try { options.readmit(); } finally { checking = wasChecking; }
      const spent = options.cost(true), budget = options.budget();
      delete blocked[tier];
      selection = tier;
      const own = ++generation;
      const loading = owner.select({ ...options.request, tier, distance, budget: {
        triangles: Math.max(0, budget.triangles - spent.triangles), drawCalls: Math.max(0, budget.drawCalls - spent.drawCalls), shadowPasses: 1,
      } });
      group.userData.runtimeStatus = 'loading';
      void loading.then(loaded => {
        if (current() && own === generation && !loaded) failed(tier);
      }).catch(error => {
        if (!current() || own !== generation) return;
        failed(tier);
        options.contact(options.fallbackContact());
        for (const object of options.fallback) object.visible = true;
        group.userData.runtimeError = String(error instanceof Error ? error.message : error);
        group.userData.runtimeStatus = 'fallback';
        options.changed();
      });
    },
  });
}

export const createRuntimeHost = Object.assign(startRuntimeHost, {
  solids(kit: Kit, request: Pick<RuntimeRequest, 'position' | 'yaw' | 'navigation'>): [number, number, number, number, number, number][] {
    const { THREE } = kit;
    const transform = new THREE.Matrix4().compose(new THREE.Vector3(...request.position),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), request.yaw), new THREE.Vector3(1.4, 1.4, 1.4));
    return request.navigation.collision.map(({ min, max }) => {
      const box = new THREE.Box3(new THREE.Vector3(...min), new THREE.Vector3(...max)).applyMatrix4(transform);
      return [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z];
    });
  },
  validate(reservation: { triangles: number; drawCalls: number }) {
    if (!Number.isInteger(reservation.triangles) || reservation.triangles <= 0 || reservation.triangles > 11500 ||
      !Number.isInteger(reservation.drawCalls) || reservation.drawCalls <= 0 || reservation.drawCalls > 20) throw new Error('Invalid runtime scenery reservation');
  },
  support(surfaces: readonly { rect: readonly [number, number, number, number]; y: number }[], x: number, z: number): number | null {
    let top: number | null = null;
    for (const { rect: [x0, z0, x1, z1], y } of surfaces) if (x >= x0 && x <= x1 && z >= z0 && z <= z1) top = Math.max(top ?? -Infinity, y);
    return top;
  },
  measure(kit: Kit, group: THREE.Group, fallback: readonly THREE.Object3D[], exclude?: THREE.Object3D | null) {
    let triangles = 0, drawCalls = 0;
    group.traverseVisible(child => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || fallback.includes(child)) return;
      if (exclude) for (let up: THREE.Object3D | null = child; up; up = up.parent) if (up === exclude) return;
      triangles += (mesh.geometry?.index?.count ?? mesh.geometry?.attributes.position?.count ?? 0) / 3 * ((mesh as THREE.InstancedMesh).isInstancedMesh ? (mesh as THREE.InstancedMesh).count : 1);
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const materials = Array.isArray(mesh.material) ? mesh.geometry.groups.map(part => list[part.materialIndex ?? 0]) : list;
      for (const material of materials) if (material) drawCalls += (material.transparent && material.side === kit.THREE.DoubleSide && !material.forceSinglePass ? 2 : 1) + (mesh.castShadow ? 1 : 0);
    });
    return { triangles, drawCalls };
  },
});
