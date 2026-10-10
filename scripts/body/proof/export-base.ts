// Writes a shipped base body (meshopt-compressed, quantised) as a plain float .glb that Blender can import: one skinned
// mesh in metres with feet near zero, the 23-bone skeleton with its rest transforms, weights and the region colours.
// Arguments: <female|male> <output.glb>
//   node --experimental-strip-types scripts/body/proof/export-base.ts female /tmp/base-female.glb
import { writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { loadBodyData } from './body-data.ts';
import type { BodyKey } from './body-data.ts';
import { exportGlb } from './glb-export.ts';

const [key, output] = process.argv.slice(2);
if ((key !== 'female' && key !== 'male') || !output) throw new Error('usage: export-base.ts <female|male> <output.glb>');
const body = await loadBodyData(key as BodyKey);

const bones: THREE.Bone[] = body.skeleton.bones.map((b) => {
  const n = new THREE.Bone();
  n.name = b.name; n.position.copy(b.position); n.quaternion.copy(b.quaternion); n.scale.copy(b.scale);
  return n;
});
body.skeleton.bones.forEach((b, i) => {
  const p = b.parent ? body.skeleton.bones.indexOf(b.parent as THREE.Bone) : -1;
  if (p >= 0) bones[p]!.add(bones[i]!);
});
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(body.pos, 3));
geo.setAttribute('normal', new THREE.BufferAttribute(body.nrm, 3));
geo.setAttribute('uv', new THREE.BufferAttribute(body.uv, 2));
geo.setAttribute('color', new THREE.BufferAttribute(body.region, 4));
geo.setAttribute('skinIndex', new THREE.BufferAttribute(body.joints, 4));
geo.setAttribute('skinWeight', new THREE.BufferAttribute(body.weights, 4));
geo.setIndex(new THREE.BufferAttribute(body.index, 1));
const mesh = new THREE.SkinnedMesh(geo, new THREE.MeshStandardMaterial({ name: 'body' }));
mesh.name = 'Body';
const root = new THREE.Group();
root.name = 'Scene';
const rootBone = bones.find((b) => !b.parent)!;
root.add(rootBone, mesh);
root.updateMatrixWorld(true);
mesh.bind(new THREE.Skeleton(bones), new THREE.Matrix4());
writeFileSync(output, await exportGlb(root));
console.log('written', output);
