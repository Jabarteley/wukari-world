/** Diagnostic sign geometry and camera coverage; never changes rendering or camera state. */
import * as THREE from 'three';
import type { SceneRecipeV1 } from '../contract.ts';
import type { DrawReceipt, ObservedFrame } from '../measure-outer-host.ts';
import { assertBakedMesh, check, submittedMesh } from './surfaces.ts';

type Signs = SceneRecipeV1['signs'];
export interface SignWitness {
  objectId: string; geometryId: string; layout: string; worldMatrix: number[]; draw: DrawReceipt;
  camera: { projection: number[]; worldInverse: number[]; coordinateSystem: number; reversedDepth: boolean };
}
export function proveSign(frame: ObservedFrame, mesh: THREE.Mesh, venue: THREE.Object3D, signs: Signs, previous: SignWitness | null = null) {
  assertBakedMesh(mesh);
  check(signs.length > 0 && mesh.name === 'recipe:signs', 'Missing declared sign mesh');
  let attached = false;
  for (let node: THREE.Object3D | null = mesh; node; node = node.parent) {
    check(node.visible, 'Declared sign or parent is hidden'); if (node === venue) attached = true;
  }
  check(attached && frame.scene.getObjectById(mesh.id) === mesh, 'Sign is outside the actual venue/scene');
  check(!Array.isArray(mesh.material) && mesh.material.visible && mesh.layers.test(frame.camera.layers), 'Sign material or camera layer disabled');
  check(mesh.frustumCulled && !('boundingSphere' in mesh), 'Sample sign culling changed');
  const relative = new THREE.Matrix4().multiplyMatrices(new THREE.Matrix4().copy(venue.matrixWorld).invert(), mesh.matrixWorld);
  check(relative.elements.every((v, i) => Math.abs(v - (i % 5 === 0 ? 1 : 0)) < 1e-8), 'Sign has unexpected second transform');
  const g = mesh.geometry, p = g.getAttribute('position'), n = g.getAttribute('normal'), uv = g.getAttribute('uv'), index = g.index;
  check(p?.itemSize === 3 && n?.itemSize === 3 && uv?.itemSize === 2 && p.count === signs.length * 4 && n.count === p.count && uv.count === p.count && index?.count === signs.length * 6, 'Incomplete sign quad buffers');
  check(g.drawRange.start === 0 && g.drawRange.count >= index.count && g.groups.length === 0, 'Partial sign geometry range');
  const corners = [[-0.5, -0.5, 0, 0], [0.5, -0.5, 1, 0], [0.5, 0.5, 1, 1], [-0.5, 0.5, 0, 1]] as const;
  signs.forEach((sign, i) => {
    // Declaration is scene-unit geometry, not the observed mesh's own extent or placement.
    const c = Math.cos(sign.ry), s = Math.sin(sign.ry);
    corners.forEach(([x, y, u, v], j) => {
      const vertex = i * 4 + j;
      const position = [sign.position[0] + x * sign.width * c, sign.position[1] + y * sign.height, sign.position[2] - x * sign.width * s];
      const normal = [s, 0, c], texcoord = [u, 1 - (i + 1 - v) / signs.length];
      for (let axis = 0; axis < 3; axis++) check(p.getComponent(vertex, axis) === Math.fround(position[axis]!) && n.getComponent(vertex, axis) === Math.fround(normal[axis]!), `Sign ${i} position/normal differs`);
      for (let axis = 0; axis < 2; axis++) check(uv.getComponent(vertex, axis) === Math.fround(texcoord[axis]!), `Sign ${i} UV differs`);
    });
    [0, 1, 2, 0, 2, 3].forEach((v, j) => check(index.getX(i * 6 + j) === i * 4 + v, `Sign ${i} index differs`));
  });
  // Use the same main-camera frustum/sphere test as THREE.WebGLRenderer.projectObject.
  // A cached sphere must enclose the validated actual vertices; otherwise it could fake culling.
  const expectedSphere = new THREE.Sphere();
  new THREE.Box3().setFromBufferAttribute(p as THREE.BufferAttribute).getCenter(expectedSphere.center);
  const point = new THREE.Vector3(); let radiusSq = 0;
  for (let i = 0; i < p.count; i++) radiusSq = Math.max(radiusSq, point.fromBufferAttribute(p, i).distanceToSquared(expectedSphere.center));
  expectedSphere.radius = Math.sqrt(radiusSq);
  if (g.boundingSphere === null) g.computeBoundingSphere();
  check(g.boundingSphere && g.boundingSphere.center.distanceTo(expectedSphere.center) < 1e-8 && Math.abs(g.boundingSphere.radius - expectedSphere.radius) < 1e-8, 'Sign culling sphere differs from complete geometry');
  const camera = { projection: frame.camera.projectionMatrix.toArray(), worldInverse: frame.camera.matrixWorldInverse.toArray(), coordinateSystem: THREE.WebGLCoordinateSystem, reversedDepth: frame.camera.reversedDepth };
  const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(frame.camera.projectionMatrix, frame.camera.matrixWorldInverse), THREE.WebGLCoordinateSystem, frame.camera.reversedDepth);
  const inFrustum = frustum.intersectsObject(mesh), draws = frame.receipt.draws.filter(d => d.main && d.objectId === mesh.uuid && d.geometryId === g.uuid);
  const layout = JSON.stringify(signs), worldMatrix = mesh.matrixWorld.toArray();
  let witness = previous?.objectId === mesh.uuid && previous.geometryId === g.uuid && previous.layout === layout && previous.worldMatrix.every((v, i) => v === worldMatrix[i]) ? previous : null;
  if (draws.length) {
    submittedMesh(frame, mesh); check(draws[0]!.calls === 1, 'Sign has unexpected main pass count');
    witness = { objectId: mesh.uuid, geometryId: g.uuid, layout, worldMatrix, draw: { ...draws[0]! }, camera };
  } else check(!inFrustum, 'Eligible sign has no complete main submission');
  return { geometryComplete: true, everyVertexNormalUvIndex: true, triangles: index.count / 3, inFrustum,
    currentSubmission: draws.length ? 'complete-main' : 'outside-view-unobserved', coverage: witness ? 'main-witnessed' : 'pending-main-view',
    camera, witness, scope: 'Geometry and actual renderer submission only; no glyph readability or unoccluded pixel claim.' };
}
