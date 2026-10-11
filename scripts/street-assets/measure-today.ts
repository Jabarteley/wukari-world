import * as THREE from 'three';
import { buildVehicle } from '../../src/models/vehicles/index.ts';
for (const t of ['danfo','keke'] as const) for (const d of ['map','street','showcase'] as const) {
  const m = buildVehicle(t,{detail:d}); const b = new THREE.Box3().setFromObject(m.object3D); const s=b.getSize(new THREE.Vector3());
  console.log(t,d,s.toArray().map(v=>+v.toFixed(2)), b.min.toArray().map(v=>+v.toFixed(2)), JSON.stringify(m.userData.triangles), m.userData.drawCalls);
}
