import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { assertBakedMesh, captureSurface, compareSurfaces, capturePlayer, comparePlayer, submittedMesh } from './surfaces.ts';
import { assertSampleExpectation, SAMPLE_EXPECTATION } from './expectation.ts';
import type { ObservedFrame } from '../measure-outer-host.ts';
import type { RecipeRuntimeMetadata } from '../pack.ts';

function mesh(name = 'Skin') {
  const geometry = new THREE.BoxGeometry(0.5, 2, 0.4), material = new THREE.MeshStandardMaterial({ roughness: 0.8 }); material.name = name;
  geometry.clearGroups(); const result = new THREE.Mesh(geometry, material); result.name = name; return result;
}
function frame(meshes: THREE.Mesh[]): ObservedFrame {
  return { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(), objects: new Map(meshes.map(m => [m.uuid, m])), receipt: {
    sceneId: 'synthetic-proof-only', draws: meshes.map(m => ({ objectId: m.uuid, geometryId: m.geometry.uuid, name: m.name, material: '', main: true, calls: 1,
      triangles: Math.min(m.geometry.index?.count ?? m.geometry.getAttribute('position').count, m.geometry.drawRange.count) / 3 })),
    mainCalls: meshes.length, shadowCalls: 0, submittedTriangles: 0, rendererMainCalls: meshes.length, rendererMainTriangles: 0,
  } };
}
function free(m: THREE.Mesh) { m.geometry.dispose(); for (const material of Array.isArray(m.material) ? m.material : [m.material]) material.dispose(); }

test('independent native surfaces accept complete streams and reject truncation retaining exact extrema', () => {
  const source = mesh(), altered = mesh();
  try {
    const expected = captureSurface(source, new THREE.Matrix4());
    assert.deepEqual(compareSurfaces([captureSurface(altered, new THREE.Matrix4())], [expected], 'resident').map(s => s.triangles), [12]);
    // Two opposite box faces retain all six bounds while deleting eight triangles.
    altered.geometry.setIndex([...source.geometry.index!.array.slice(0, 6), ...source.geometry.index!.array.slice(6, 12)]);
    const partial = captureSurface(altered, new THREE.Matrix4()); assert.deepEqual(partial.bounds, expected.bounds);
    assert.throws(() => compareSurfaces([partial], [expected], 'resident'), /truncated/);
  } finally { free(source); free(altered); }
});

test('native material identity includes properties and source textures beyond the material name', () => {
  const source = mesh(), changed = mesh();
  const first = new THREE.DataTexture(new Uint8Array([1, 2, 3, 255]), 1, 1), second = new THREE.DataTexture(new Uint8Array([4, 5, 6, 255]), 1, 1);
  try {
    const a = source.material as THREE.MeshStandardMaterial, b = changed.material as THREE.MeshStandardMaterial;
    a.map = first; b.map = first;
    const expected = captureSurface(source, new THREE.Matrix4()); compareSurfaces([captureSurface(changed, new THREE.Matrix4())], [expected], 'resident');
    b.roughness = 0.1; assert.throws(() => compareSurfaces([captureSurface(changed, new THREE.Matrix4())], [expected], 'resident'), /substituted/);
    b.roughness = a.roughness; b.map = second;
    assert.throws(() => compareSurfaces([captureSurface(changed, new THREE.Matrix4())], [expected], 'resident'), /substituted/);
  } finally { free(source); free(changed); first.dispose(); second.dispose(); }
});

test('ordinary merged proof rejects one transformed instance, skinning and active morphs', () => {
  const base = mesh(), instance = new THREE.InstancedMesh(base.geometry, base.material, 1), skinned = new THREE.SkinnedMesh(base.geometry, base.material);
  try {
    assertBakedMesh(base);
    instance.setMatrixAt(0, new THREE.Matrix4().makeTranslation(20, 0, 0));
    assert.throws(() => assertBakedMesh(instance), /ordinary baked/); assert.throws(() => assertBakedMesh(skinned), /ordinary baked/);
    base.geometry.morphAttributes.position = [base.geometry.getAttribute('position').clone()]; base.updateMorphTargets(); base.morphTargetInfluences![0] = 1;
    assert.throws(() => assertBakedMesh(base), /deformation/);
  } finally { instance.dispose(); free(base); }
});

function player(name: string) {
  const base = mesh(name), count = base.geometry.getAttribute('position').count;
  base.geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(count * 4), 4));
  const weights = new Float32Array(count * 4); for (let i = 0; i < count; i++) weights[i * 4] = 1;
  base.geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  const result = new THREE.SkinnedMesh(base.geometry, base.material), bone = new THREE.Bone(); bone.name = 'root'; result.name = name; result.add(bone); result.bind(new THREE.Skeleton([bone])); return result;
}
test('complete player surface set and intended draw ranges are required', () => {
  const body = player('Body'), shoes = player('Shoes');
  try {
    const expected = [capturePlayer(body), capturePlayer(shoes)]; assert.equal(comparePlayer([body, shoes], expected, frame([body, shoes])).length, 2);
    assert.throws(() => comparePlayer([body], expected, frame([body])), /set incomplete/);
    shoes.geometry.setDrawRange(0, 3); assert.throws(() => comparePlayer([body, shoes], expected, frame([body, shoes])), /range/);
    shoes.geometry.setDrawRange(0, Infinity); const missing = frame([body]); assert.throws(() => comparePlayer([body, shoes], expected, missing), /not submitted/);
  } finally { body.skeleton.dispose(); shoes.skeleton.dispose(); free(body); free(shoes); }
});

test('native rigid eyes retain complete geometry, type and animated head attachment beside skinned body', async () => {
  // Actual shipped native base: these ordinary eye nodes are directly attached to a skin joint.
  const bytes = await readFile(new URL('../../../../public/character-lab/models/round4/female/base.glb', import.meta.url));
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString()) as {
    nodes: { name?: string; mesh?: number; skin?: number; children?: number[] }[]; skins: { joints: number[] }[];
    meshes: { extras: { targetNames: string[] }; weights: number[]; primitives: { targets: unknown[] }[] }[];
  };
  for (const name of ['Eye_L', 'Eye_R']) {
    const index = gltf.nodes.findIndex(node => node.name === name), eye = gltf.nodes[index]!;
    assert.ok(index >= 0 && eye.mesh !== undefined); assert.equal(eye.skin, undefined);
    const parent = gltf.nodes.findIndex(node => node.children?.includes(index));
    assert.equal(gltf.nodes[parent]!.name, 'head'); assert.ok(gltf.skins.some(skin => skin.joints.includes(parent)));
    const source = gltf.meshes[eye.mesh!]!;
    assert.deepEqual(source.extras.targetNames, ['Feature_EastAsianHead', 'Feature_EyeWidth_Negative', 'Feature_EyeWidth_Positive']);
    assert.deepEqual(source.weights, [0, 0, 0]); assert.equal(source.primitives[0]!.targets.length, 3);
  }
  const body = player('Body'), left = mesh('Eye_L'), right = mesh('Eye_R'), head = body.skeleton.bones[0]!;
  head.name = 'head'; head.add(left, right); left.position.set(-0.03, 0.02, 0.07); right.position.set(0.03, 0.02, 0.07);
  const addMorphs = (target: THREE.Mesh, names: string[]) => {
    target.geometry.morphAttributes.position = names.map(name => { const attribute = target.geometry.getAttribute('position').clone(); attribute.name = name; return attribute; });
    target.geometry.morphTargetsRelative = true; target.updateMorphTargets();
  };
  for (const eye of [left, right]) addMorphs(eye, ['Feature_EastAsianHead', 'Feature_EyeWidth_Negative', 'Feature_EyeWidth_Positive']);
  addMorphs(body, ['Expr_BlinkLeft']);
  const all = [body, left, right];
  try {
    const expected = all.map(capturePlayer);
    assert.deepEqual(comparePlayer(all, expected, frame(all)).map(s => s.kind), ['skinned', 'rigid', 'rigid']);
    body.morphTargetInfluences![0] = 0.5;
    head.rotation.y = 0.4; head.position.y = 2;
    assert.equal(comparePlayer(all, expected, frame(all)).length, 3, 'normal animated head motion preserves the rigid attachment');
    right.morphTargetInfluences![0] = 0.25;
    assert.throws(() => comparePlayer(all, expected, frame(all)), /static player look morph/); right.morphTargetInfluences![0] = 0;
    const dict = right.morphTargetDictionary!; delete dict.Feature_EastAsianHead; dict.Expr_Foreign = 0; right.morphTargetInfluences![0] = 0.5;
    assert.throws(() => comparePlayer(all, expected, frame(all)), /morph binding/); delete dict.Expr_Foreign; dict.Feature_EastAsianHead = 0; right.morphTargetInfluences![0] = 0;
    right.geometry.morphTargetsRelative = false; assert.throws(() => comparePlayer(all, expected, frame(all)), /morph binding/); right.geometry.morphTargetsRelative = true;
    const morph = right.geometry.morphAttributes.position![0]!; const first = morph.getX(0); morph.setX(0, first + 1);
    assert.throws(() => comparePlayer(all, expected, frame(all)), /player value differs/); morph.setX(0, first);
    const removed = right.geometry.morphAttributes.position!.pop()!;
    assert.throws(() => comparePlayer(all, expected, frame(all)), /incomplete player morph/); right.geometry.morphAttributes.position!.push(removed);
    body.morphTargetInfluences![0] = 2; assert.throws(() => comparePlayer(all, expected, frame(all)), /expression outside range/); body.morphTargetInfluences![0] = 0.5;
    assert.throws(() => comparePlayer([body, left], expected, frame([body, left])), /set incomplete/);
    right.position.z += 0.1; assert.throws(() => comparePlayer(all, expected, frame(all)), /anchor differs/); right.position.z -= 0.1;
    const foreign = new THREE.Bone(); foreign.name = 'head'; foreign.add(right);
    assert.throws(() => comparePlayer(all, expected, frame(all)), /outside player rig/); head.add(right);
    const impostor = player('Eye_R');
    try { assert.throws(() => comparePlayer([body, left, impostor], expected, frame([body, left, impostor])), /type differs/); }
    finally { impostor.skeleton.dispose(); free(impostor); }
    const material = right.material as THREE.MeshStandardMaterial; material.roughness = 0.1;
    assert.throws(() => comparePlayer(all, expected, frame(all)), /material/); material.roughness = 0.8;
    right.geometry.setDrawRange(0, 3); assert.throws(() => comparePlayer(all, expected, frame(all)), /range/); right.geometry.setDrawRange(0, Infinity);
    assert.throws(() => comparePlayer(all, expected, frame([body, left])), /not submitted/);
    right.removeFromParent(); assert.throws(() => capturePlayer(right), /no bone anchor/);
  } finally { body.skeleton.dispose(); all.forEach(free); }
});

test('sign-plane submission cannot pass from allocation or a shadow draw alone', () => {
  const sign = mesh('recipe:signs');
  try {
    submittedMesh(frame([sign]), sign); const shadowOnly = frame([sign]); shadowOnly.receipt.draws[0]!.main = false;
    assert.throws(() => submittedMesh(shadowOnly, sign), /not submitted/);
  } finally { free(sign); }
});

function expectedSelection() {
  const e = SAMPLE_EXPECTATION, bounds = { min: [0, 0, 0] as [number, number, number], max: [1, 1, 1] as [number, number, number] };
  const value: Parameters<typeof assertSampleExpectation>[0] = { recipe: { city: e.city, venue: e.venue, crowd: e.crowd.map(p => [p.x, p.z, p.ry] as [number, number, number]) },
    placements: e.placements.map(p => ({ ...p, assetSha256: e[p.source], bounds, footprint: [0, 0, 1, 1] as [number, number, number, number], triangles: 1 })) };
  const asset = (kind: 'kit' | 'hero') => ({ url: '', measurement: { version: 1 as const, kind, id: kind === 'kit' ? 'gulf-guinea' : 'accra', sha256: e[kind], rawBytes: 1, brotliBytes: 1, triangles: 1, parts: [],
    atlas: { width: 1024 as const, height: 1024 as const, mimeType: 'image/webp' as const, sha256: e.atlas } } });
  const metadata: RecipeRuntimeMetadata = { schema: 'allworld-recipe-runtime', version: 1, city: 'accra', region: 'gulf-guinea', recipeSha256: '', recipeBytes: 1, targetVenueIds: [e.venue], assets: { kit: asset('kit'), hero: asset('hero') }, hostScenery: {} };
  return { value, metadata };
}
test('independent V8 selection rejects dropped, substituted and moved placements', () => {
  const { value, metadata } = expectedSelection(); assertSampleExpectation(value, metadata);
  assert.throws(() => assertSampleExpectation({ ...value, placements: value.placements.slice(0, -1) }, metadata), /identity/);
  const substitute = structuredClone(value); substitute.placements[0]!.node = 'other';
  assert.throws(() => assertSampleExpectation(substitute, metadata), /changed/);
  const moved = structuredClone(value); moved.placements[1]!.x += 1;
  assert.throws(() => assertSampleExpectation(moved, metadata), /changed/);
  const wrongAsset = structuredClone(metadata); wrongAsset.assets.hero!.measurement.sha256 = '0'.repeat(64);
  assert.throws(() => assertSampleExpectation(value, wrongAsset), /identity/);
});
