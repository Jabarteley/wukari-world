import * as THREE from 'three';
import type { ValidatedRecipe } from '../contract.ts';
import type { PreparedCityAssets } from '../prepare.ts';
import type { ObservedFrame } from '../measure-outer-host.ts';
import { check, assertBakedMesh, submittedMesh, captureSurface, compareSurfaces, comparePlayer } from './surfaces.ts';
import type { Surface } from './surfaces.ts';
import type { NativeReferences } from './native-reference.ts';
import { SAMPLE_EXPECTATION, assertExpectedPlacements } from './expectation.ts';
import { proveSign } from './sign-proof.ts';
import type { SignWitness } from './sign-proof.ts';

export function proveRecipeGeometry(frame: ObservedFrame, root: THREE.Object3D, checked: ValidatedRecipe, prepared: PreparedCityAssets) {
  assertExpectedPlacements(checked.placements);
  check(root.parent, 'Missing actual venue root'); root.parent.updateWorldMatrix(true, true);
  const venueInverse = new THREE.Matrix4().copy(root.parent.matrixWorld).invert();
  const offsets = new Map<string, { vertices: number; indices: number }>();
  const placements: { id: string; source: string; node: string; assetSha256: string; mesh: string; vertices: number; triangles: number; scale: number }[] = [];
  for (const placement of checked.placements) {
    const asset = placement.source === 'kit' ? prepared.kit : prepared.hero;
    const model = asset?.models.get(placement.node); check(model, `Missing prepared ${placement.node}`);
    for (const part of model.parts) {
      const name = `model:${part.atlas || 'plain'}:near`, offset = offsets.get(name) ?? { vertices: 0, indices: 0 };
      const mesh = root.getObjectByName(name); check(mesh instanceof THREE.Mesh, `Missing merged ${name}`);
      assertBakedMesh(mesh); submittedMesh(frame, mesh);
      const relative = new THREE.Matrix4().multiplyMatrices(venueInverse, mesh.matrixWorld);
      check(relative.elements.every((n, i) => Math.abs(n - (i % 5 === 0 ? 1 : 0)) < 1e-8), `${name}: unexpected second transform`);
      const position = mesh.geometry.getAttribute('position'), uv = mesh.geometry.getAttribute('uv'), index = mesh.geometry.index;
      check(index, `${name}: missing index`);
      const matrix = new THREE.Matrix4().compose(new THREE.Vector3(placement.x, 0, placement.z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), placement.ry), new THREE.Vector3().setScalar(placement.scale));
      const point = new THREE.Vector3(), vertices = part.position.length / 3;
      for (let i = 0; i < vertices; i++) {
        point.fromArray(part.position, i * 3).applyMatrix4(matrix);
        check(Math.abs(position.getX(offset.vertices + i) - point.x) < 1e-5 && Math.abs(position.getY(offset.vertices + i) - point.y) < 1e-5 && Math.abs(position.getZ(offset.vertices + i) - point.z) < 1e-5, `${placement.id}: vertex ${i} differs`);
        if (part.uv) check(uv && uv.getX(offset.vertices + i) === part.uv[i * 2] && uv.getY(offset.vertices + i) === part.uv[i * 2 + 1], `${placement.id}: UV ${i} differs`);
      }
      for (let i = 0; i < part.index.length; i++) check(index.getX(offset.indices + i) === part.index[i]! + offset.vertices, `${placement.id}: index ${i} differs`);
      offsets.set(name, { vertices: offset.vertices + vertices, indices: offset.indices + part.index.length });
      placements.push({ id: placement.id, source: placement.source, node: placement.node, assetSha256: placement.assetSha256, mesh: mesh.uuid, vertices, triangles: part.index.length / 3, scale: placement.scale });
    }
  }
  for (const [name, total] of offsets) {
    const mesh = root.getObjectByName(name) as THREE.Mesh;
    check(mesh.geometry.getAttribute('position').count === total.vertices && mesh.geometry.index?.count === total.indices, `${name}: unexpected/missing merged geometry`);
  }
  check(placements.length === checked.placements.length, 'Expected one measured primitive per placement');
  return { placements, triangles: placements.reduce((n, p) => n + p.triangles, 0), everyVertexUvIndex: true, submitted: true };
}

export function proveNativeResidents(frame: ObservedFrame, venue: THREE.Object3D, people: { id: string; x: number; z: number }[], reference: NativeReferences) {
  check(people.length === 12 && new Set(people.map(p => p.id)).size === 12, 'Expected twelve distinct resident positions');
  const expectedPeople = SAMPLE_EXPECTATION.crowd;
  for (const p of people) { const expected = expectedPeople.find(e => e.id === p.id); check(expected && p.x === expected.x && Math.abs(p.z - expected.z) < 1e-8, `${p.id}: resident position changed`); }
  const radii = people.map((p, i) => Math.min(...people.filter((_, j) => i !== j).map(q => Math.hypot(p.x - q.x, p.z - q.z))) / 2 - 1e-4);
  const groups: THREE.Object3D[] = []; venue.traverseVisible(node => { if (node.name === 'canonical-crowd') groups.push(node); });
  check(groups.length === 1 && groups[0]!.userData.characterFoundation === 'native53' && groups[0]!.userData.characterStatus === 'ready', 'Canonical native crowd is not ready');
  venue.updateWorldMatrix(true, true);
  const inverse = new THREE.Matrix4().copy(venue.matrixWorld).invert(), point = new THREE.Vector3();
  const coverage: Surface[][] = people.map(() => []), batches: { mesh: string; triangles: number }[] = [];
  groups[0]!.traverseVisible(node => {
    if (!(node instanceof THREE.Mesh)) return;
    assertBakedMesh(node); check(node.name === 'canonical-crowd-wardrobe-batch', 'Unexpected native batch layout');
    const count = submittedMesh(frame, node), position = node.geometry.getAttribute('position'), index = node.geometry.index;
    check(index, 'Missing native batch index');
    const matrix = new THREE.Matrix4().multiplyMatrices(inverse, node.matrixWorld), owners = new Map<number, number>(), indices: number[][] = people.map(() => []);
    const owner = (i: number) => {
      const held = owners.get(i); if (held !== undefined) return held;
      point.fromBufferAttribute(position, i).applyMatrix4(matrix);
      const matches = people.flatMap((p, j) => Math.hypot(point.x - p.x, point.z - p.z) < radii[j]! ? [j] : []);
      check(matches.length === 1 && point.toArray().every(Number.isFinite), 'Native vertex has no unique resident cell');
      owners.set(i, matches[0]!); return matches[0]!;
    };
    for (let i = 0; i < count; i += 3) {
      const tri = [index.getX(i), index.getX(i + 1), index.getX(i + 2)], person = owner(tri[0]!);
      check(tri.every(v => owner(v) === person), 'Native triangle crosses resident cells'); indices[person]!.push(...tri);
    }
    indices.forEach((list, i) => { if (list.length) coverage[i]!.push(captureSurface(node, matrix, list)); });
    batches.push({ mesh: node.uuid, triangles: count / 3 });
  });
  const headsValue: unknown = groups[0]!.userData.nearDetailHeads;
  check(typeof headsValue === 'function', 'Missing normal near-detail witness');
  const heads: unknown = headsValue(); check(Array.isArray(heads) && heads.length === people.length, 'Incomplete near-detail witness');
  const members = people.map((person, i) => {
    const matches = heads.filter((head: unknown) => {
      if (!head || typeof head !== 'object' || !('x' in head) || !('y' in head) || !('z' in head)) return false;
      if (![head.x, head.y, head.z].every(v => typeof v === 'number' && Number.isFinite(v))) return false;
      point.set(Number(head.x), Number(head.y), Number(head.z)).applyMatrix4(inverse);
      return Math.hypot(point.x - person.x, point.z - person.z) < radii[i]!;
    });
    check(matches.length === 1 && typeof matches[0].full === 'boolean', `${person.id}: ambiguous near-detail state`);
    const detail = matches[0].full ? 'full' : 'lod', expected = reference.members.get(person.id); check(expected, `Missing independent ${person.id} reference`);
    return { ...person, detail, surfaces: compareSurfaces(coverage[i]!, expected[detail], person.id) };
  });
  const playerRoots: THREE.Object3D[] = []; venue.traverseVisible(node => { if (node.name === 'native-character') playerRoots.push(node); });
  check(playerRoots.length === 1 && playerRoots[0]!.userData.characterFoundation === 'native53' && playerRoots[0]!.userData.characterStatus === 'ready', 'Expected exactly one ready native player');
  check(JSON.stringify(playerRoots[0]!.userData.nativeRecipe) === JSON.stringify(reference.playerRecipe), 'Player native look/seed recipe differs');
  const playerMeshes: THREE.Mesh[] = []; playerRoots[0]!.traverseVisible(node => { if (node instanceof THREE.Mesh) playerMeshes.push(node); });
  return { members, batches, playerMeshes: comparePlayer(playerMeshes, reference.player, frame), scope: reference.scope };
}

export function proveRecipeTextures(frame: ObservedFrame, root: THREE.Object3D, checked: ValidatedRecipe, prepared: PreparedCityAssets, previousSignWitness: SignWitness | null = null) {
  const atlasImages = new Set<unknown>(), maps = new Set<THREE.Texture>();
  const materials: unknown[] = []; let signs = 0, signTextureBytes = 0;
  const signProofs: ReturnType<typeof proveSign>[] = [];
  root.traverseVisible(node => {
    if (!(node instanceof THREE.Mesh)) return;
    check(!Array.isArray(node.material) && node.material instanceof THREE.MeshStandardMaterial, 'Unexpected recipe material');
    const map = node.material.map; check(map, `${node.name}: missing texture`); const image: unknown = map.image;
    if (node.name === 'recipe:signs') {
      check(root.parent, 'Missing sign venue'); signProofs.push(proveSign(frame, node, root.parent, checked.recipe.signs, previousSignWitness));
      signs++; check(map instanceof THREE.CanvasTexture && image instanceof HTMLCanvasElement && image.width === 512 && image.height === 128 * checked.recipe.signs.length, 'Invalid sign canvas allocation');
      check(node.geometry.index?.count === checked.recipe.signs.length * 6, 'Missing sign planes');
      signTextureBytes += Math.ceil(image.width * image.height * 4 * 4 / 3);
    } else {
      check(node.name.startsWith('model:') && map.image === prepared.kit.atlas?.image && prepared.hero?.atlas?.image === prepared.kit.atlas?.image, 'GLB atlas is not the retained canonical shared image');
      const decoded = (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) || (image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0);
      check(decoded && image.width === 1024 && image.height === 1024, 'GLB atlas lacks actual decoded pixels');
      atlasImages.add(image); maps.add(map);
    }
    materials.push({ mesh: node.name, type: node.material.type, map: map.uuid, image: { width: map.image.width, height: map.image.height }, transparent: node.material.transparent, vertexColors: node.material.vertexColors, roughness: node.material.roughness, metalness: node.material.metalness });
  });
  check(signs === Number(checked.recipe.signs.length > 0) && atlasImages.size === 1 && maps.size === 1, 'Unexpected recipe texture sharing');
  const textureBytes = Math.ceil(1024 * 1024 * 4 * 4 / 3) + signTextureBytes;
  check(textureBytes <= 9 * 1024 * 1024, 'Recipe texture budget exceeded');
  return { materials, signCoverage: signProofs[0] ?? null, atlasImageInstances: atlasImages.size, atlasTextureInstances: maps.size, signCanvases: signs, signTextureBytes, textureBytes, signTexts: checked.recipe.signs.map(s => s.text), scope: 'Actual decoded GLB atlas and separate bounded sign canvas; no glyph pixel correctness claim.' };
}
