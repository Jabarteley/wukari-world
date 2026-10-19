import * as THREE from 'three';
import type { ObservedFrame } from '../measure-outer-host.ts';

export function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const images = new WeakMap<object, number>(); let nextImage = 0;
function imageKey(image: unknown): number {
  check(image !== null && typeof image === 'object', 'Native source texture has no image');
  let id = images.get(image); if (!id) { id = ++nextImage; images.set(image, id); } return id;
}
/** Native source images and shading properties; names are excluded because the native batch merges equal surfaces across names. */
export function materialKey(material: THREE.Material | THREE.Material[]): string {
  check(!Array.isArray(material) && material instanceof THREE.MeshStandardMaterial, 'Unsupported native material');
  const maps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'aoMap', 'emissiveMap', 'bumpMap', 'displacementMap', 'lightMap', 'envMap'] as const;
  return JSON.stringify([material.type, material.color.toArray(), material.emissive.toArray(), material.roughness, material.metalness,
    material.opacity, material.transparent, material.alphaTest, material.side, material.vertexColors, material.depthWrite, material.depthTest,
    material.blending, material.normalScale.toArray(), material.aoMapIntensity, material.emissiveIntensity, material.bumpScale, material.displacementScale, material.displacementBias, material.envMapIntensity, material.lightMapIntensity, material.alphaHash, material.polygonOffset, material.polygonOffsetFactor, material.polygonOffsetUnits, material.wireframe,
    maps.map(key => { const t = material[key]; return t ? [key, imageKey(t.image), t.colorSpace, t.flipY, t.wrapS, t.wrapT, t.magFilter, t.minFilter, t.anisotropy,
      t.channel, t.mapping, t.offset.toArray(), t.repeat.toArray(), t.center.toArray(), t.rotation, t.premultiplyAlpha, t.unpackAlignment] : [key, null]; })]);
}
export function assertBakedMesh(mesh: THREE.Mesh) {
  check(!(mesh instanceof THREE.InstancedMesh) && !(mesh instanceof THREE.SkinnedMesh), `${mesh.name}: expected ordinary baked mesh`);
  check(Object.keys(mesh.geometry.morphAttributes).length === 0 && !mesh.morphTargetInfluences?.length
    && !mesh.geometry.getAttribute('skinIndex') && !mesh.geometry.getAttribute('skinWeight'), `${mesh.name}: unsupported baked deformation`);
}
export function submittedMesh(frame: ObservedFrame, mesh: THREE.Mesh) {
  const count = mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count;
  check(mesh.geometry.drawRange.start === 0 && mesh.geometry.drawRange.count >= count, `${mesh.name}: partial draw range`);
  const draws = frame.receipt.draws.filter(d => d.main && d.objectId === mesh.uuid && d.geometryId === mesh.geometry.uuid);
  check(draws.length === 1 && draws[0]!.triangles === count / 3, `${mesh.name}: complete geometry was not submitted`);
  return count;
}
export interface Surface { material: string; triangles: number; vertices: number; bounds: number[]; corners: Float32Array }
export function captureSurface(mesh: THREE.Mesh, matrix: THREE.Matrix4, indices?: readonly number[]): Surface {
  assertBakedMesh(mesh);
  const g = mesh.geometry, p = g.getAttribute('position'), n = g.getAttribute('normal'), uv = g.getAttribute('uv');
  check(p && n && uv && p.count === n.count && p.count === uv.count, 'Native surface attributes incomplete');
  const start = g.drawRange.start, count = Math.min(g.index?.count ?? p.count, g.drawRange.count);
  check(start === 0 && count % 3 === 0, 'Unsupported reference draw range');
  const used = indices ?? Array.from({ length: count }, (_, i) => g.index?.getX(i) ?? i);
  const corners = new Float32Array(used.length * 8), bounds = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  const pos = new THREE.Vector3(), normal = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(matrix);
  used.forEach((index, i) => {
    check(Number.isInteger(index) && index >= 0 && index < p.count, 'Invalid native surface index');
    pos.fromBufferAttribute(p, index).applyMatrix4(matrix); normal.fromBufferAttribute(n, index).applyMatrix3(nm).normalize();
    const values = [...pos.toArray(), ...normal.toArray(), uv.getX(index), uv.getY(index)]; check(values.every(Number.isFinite), 'Non-finite native surface');
    corners.set(values, i * 8);
    pos.toArray().forEach((v, axis) => { bounds[axis] = Math.min(bounds[axis]!, v); bounds[axis + 3] = Math.max(bounds[axis + 3]!, v); });
  });
  return { material: materialKey(mesh.material), triangles: used.length / 3, vertices: new Set(used).size, bounds, corners };
}
export function joinSurfaces(parts: Surface[]): Surface[] {
  const groups = new Map<string, Surface[]>();
  for (const p of parts) { const list = groups.get(p.material) ?? []; list.push(p); groups.set(p.material, list); }
  return [...groups].map(([material, list]) => {
    const corners = new Float32Array(list.reduce((n, s) => n + s.corners.length, 0)); let at = 0;
    for (const s of list) { corners.set(s.corners, at); at += s.corners.length; }
    return { material, triangles: list.reduce((n, p) => n + p.triangles, 0), vertices: list.reduce((n, p) => n + p.vertices, 0), corners,
      bounds: Array.from({ length: 6 }, (_, i) => i < 3 ? Math.min(...list.map(p => p.bounds[i]!)) : Math.max(...list.map(p => p.bounds[i]!))) };
  });
}
export function compareSurfaces(actual: Surface[], expected: Surface[], label: string) {
  const a = joinSurfaces(actual), e = joinSurfaces(expected); check(a.length === e.length, `${label}: native surface set differs`);
  for (const wanted of e) {
    const got = a.find(p => p.material === wanted.material); check(got, `${label}: source material/texture substituted`);
    check(got.triangles === wanted.triangles && got.vertices === wanted.vertices && got.corners.length === wanted.corners.length, `${label}: native surface truncated`);
    check(got.bounds.every((n, i) => Math.abs(n - wanted.bounds[i]!) <= 1e-4), `${label}: native bounds differ`);
    check(got.corners.every((n, i) => Math.abs(n - wanted.corners[i]!) <= 1e-4), `${label}: native position/normal/UV differs`);
  }
  return a.map(({ corners: _, ...summary }) => summary);
}

interface AttributeCopy { size: number; normalized: boolean; values: Float64Array }
export interface PlayerSurface {
  name: string; kind: 'skinned' | 'rigid'; material: string; start: number; count: number; index: Uint32Array | null;
  anchor: { bones: string[]; localMatrix: number[] } | null;
  attributes: Record<string, AttributeCopy>; morphs: Record<string, AttributeCopy[]>; bones: string[];
  morphDictionary: Record<string, number>; morphInfluences: number[]; morphTargetsRelative: boolean;
}
function copyAttribute(a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): AttributeCopy {
  check(!(a as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute, 'Unsupported player interleaved attribute');
  return { size: a.itemSize, normalized: a.normalized, values: Float64Array.from((a as THREE.BufferAttribute).array) };
}
function rigidAnchor(mesh: THREE.Mesh) {
  // The native base has rigid Eye_L/Eye_R meshes parented to head. Compare the attachment,
  // not the animated bone's world pose, so ordinary walking and blinking remain enabled.
  check(!(mesh instanceof THREE.InstancedMesh) && !(mesh instanceof THREE.SkinnedMesh)
    && !mesh.geometry.getAttribute('skinIndex') && !mesh.geometry.getAttribute('skinWeight'), `${mesh.name}: invalid rigid player skinning`);
  const local = new THREE.Matrix4(); let node: THREE.Object3D | null = mesh;
  while (node && !(node instanceof THREE.Bone)) { node.updateMatrix(); local.premultiply(node.matrix); node = node.parent; }
  check(node instanceof THREE.Bone, `${mesh.name}: rigid player surface has no bone anchor`);
  const bone = node, bones: string[] = [];
  while (node instanceof THREE.Bone) { bones.push(node.name); node = node.parent; }
  check(local.elements.every(Number.isFinite), `${mesh.name}: invalid rigid anchor transform`);
  return { bone, descriptor: { bones, localMatrix: local.toArray() } };
}
export function capturePlayer(mesh: THREE.Mesh): PlayerSurface {
  check(!(mesh instanceof THREE.InstancedMesh), 'Player surface cannot be instanced');
  const skinned = mesh instanceof THREE.SkinnedMesh;
  const anchor = skinned ? null : rigidAnchor(mesh).descriptor;
  const g = mesh.geometry, available = g.index?.count ?? g.getAttribute('position').count, start = g.drawRange.start, count = Math.min(available - start, g.drawRange.count);
  check(start >= 0 && count > 0 && start % 3 === 0 && count % 3 === 0 && g.groups.length <= 1, 'Unsupported player surface range');
  const morphDictionary = { ...mesh.morphTargetDictionary }, morphInfluences = [...(mesh.morphTargetInfluences ?? [])];
  const targetCount = Math.max(0, ...Object.values(g.morphAttributes).map(list => list?.length ?? 0));
  const targetIndices = Object.values(morphDictionary);
  check(morphInfluences.length === targetCount && targetIndices.length === targetCount
    && new Set(targetIndices).size === targetCount && targetIndices.every(i => Number.isInteger(i) && i >= 0 && i < targetCount)
    && morphInfluences.every(Number.isFinite), `${mesh.name}: incomplete player morph binding`);
  if (skinned) check(g.getAttribute('skinIndex') && g.getAttribute('skinWeight') && mesh.skeleton.bones.length > 0, 'Player skinning absent');
  return { name: mesh.name, kind: skinned ? 'skinned' : 'rigid', anchor, morphDictionary, morphInfluences, morphTargetsRelative: g.morphTargetsRelative, material: materialKey(mesh.material), start, count, index: g.index ? Uint32Array.from(g.index.array) : null,
    attributes: Object.fromEntries(Object.entries(g.attributes).map(([key, a]) => [key, copyAttribute(a)])),
    morphs: Object.fromEntries(Object.entries(g.morphAttributes).map(([key, list]) => [key, list!.map(copyAttribute)])), bones: skinned ? mesh.skeleton.bones.map(b => b.name) : [] };
}
export function comparePlayer(actual: THREE.Mesh[], expected: PlayerSurface[], frame: ObservedFrame) {
  check(actual.length === expected.length && new Set(actual.map(m => m.name)).size === expected.length, 'Player surface set incomplete');
  const rigBones = new Set(actual.flatMap(mesh => mesh instanceof THREE.SkinnedMesh ? mesh.skeleton.bones : []));
  check(rigBones.size > 0 && expected.some(surface => surface.kind === 'skinned'), 'Player skinning absent');
  return actual.map(mesh => {
    const wanted = expected.find(s => s.name === mesh.name); check(wanted, `Unexpected player surface ${mesh.name}`);
    const got = capturePlayer(mesh);
    check(got.kind === wanted.kind, `${mesh.name}: player surface type differs`);
    if (got.kind === 'rigid') {
      check(rigBones.has(rigidAnchor(mesh).bone), `${mesh.name}: rigid anchor is outside player rig`);
      check(wanted.anchor && got.anchor && JSON.stringify(got.anchor.bones) === JSON.stringify(wanted.anchor.bones)
        && got.anchor.localMatrix.every((v, i) => Math.abs(v - wanted.anchor!.localMatrix[i]!) <= 1e-8), `${mesh.name}: rigid player anchor differs`);
    }
    check(got.material === wanted.material && got.start === wanted.start && got.count === wanted.count && JSON.stringify(got.bones) === JSON.stringify(wanted.bones), `${mesh.name}: player material/range/rig differs`);
    const equal = (a: ArrayLike<number>, b: ArrayLike<number>) => a.length === b.length && Array.from(a).every((v, i) => v === b[i]);
    check((got.index === null) === (wanted.index === null) && (!got.index || equal(got.index, wanted.index!)), `${mesh.name}: player index differs`);
    const attributes = (a: Record<string, AttributeCopy>, b: Record<string, AttributeCopy>) => {
      check(JSON.stringify(Object.keys(a).sort()) === JSON.stringify(Object.keys(b).sort()), `${mesh.name}: player attributes missing`);
      for (const key of Object.keys(b)) check(a[key]!.size === b[key]!.size && a[key]!.normalized === b[key]!.normalized && equal(a[key]!.values, b[key]!.values), `${mesh.name}: player ${key} differs`);
    };
    attributes(got.attributes, wanted.attributes);
    check(got.morphTargetsRelative === wanted.morphTargetsRelative
      && JSON.stringify(Object.entries(got.morphDictionary).sort()) === JSON.stringify(Object.entries(wanted.morphDictionary).sort())
      && got.morphInfluences.length === wanted.morphInfluences.length, `${mesh.name}: player morph binding differs`);
    for (const [name, index] of Object.entries(wanted.morphDictionary)) {
      const value = got.morphInfluences[index]!;
      if (wanted.kind === 'skinned' && name.startsWith('Expr_')) check(value >= 0 && value <= 1, `${mesh.name}: native expression outside range`);
      else check(value === wanted.morphInfluences[index], `${mesh.name}: static player look morph differs`);
    }
    check(JSON.stringify(Object.keys(got.morphs).sort()) === JSON.stringify(Object.keys(wanted.morphs).sort()), `${mesh.name}: player morph set differs`);
    for (const key of Object.keys(wanted.morphs)) {
      check(got.morphs[key]!.length === wanted.morphs[key]!.length, `${mesh.name}: player morph missing`);
      got.morphs[key]!.forEach((a, i) => attributes({ value: a }, { value: wanted.morphs[key]![i]! }));
    }
    const draws = frame.receipt.draws.filter(d => d.main && d.objectId === mesh.uuid && d.geometryId === mesh.geometry.uuid);
    check(draws.length === 1 && draws[0]!.triangles === wanted.count / 3, `${mesh.name}: complete player surface not submitted`);
    return { mesh: mesh.uuid, name: mesh.name, kind: got.kind, anchor: got.anchor, triangles: wanted.count / 3, fullExpectedRange: true, material: wanted.material };
  });
}
