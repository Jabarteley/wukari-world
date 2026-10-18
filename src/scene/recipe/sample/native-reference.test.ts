import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { imageHeaderBitmap } from '../image-header-fixture.ts';
import { fixtureFetch } from '../runtime.test-support.ts';
import { DEFAULT_LOOK } from '../../../game/content/traits.ts';
import { preloadLooks } from '../../character-lab/native-body.ts';
import { prepareNativeReferences } from './native-reference.ts';

test('real native public APIs prepare all twelve LOD/full references and the complete morph-bearing player', async () => {
  // The shared FixtureImage invokes its load listener without the browser's `this` binding.
  // THREE.ImageLoader consequently supplies undefined to standalone TextureLoader callbacks.
  // Repair only that test seam before its preload runs; these stable descriptors contain no pixels.
  const originalTextureLoad = THREE.TextureLoader.prototype.loadAsync;
  const headerImages = new Map<string, Promise<Awaited<ReturnType<typeof imageHeaderBitmap>>>>();
  THREE.TextureLoader.prototype.loadAsync = async function (url, progress) {
    const texture = await originalTextureLoad.call(this, url, progress);
    if (texture.image !== undefined && texture.image !== null) return texture;
    const source = this.manager.resolveURL(this.path + url);
    let image = headerImages.get(source);
    if (!image) {
      image = (async () => {
        const response = await fetch(source); assert.equal(response.status, 200, `Native image fixture source ${source}`);
        return Object.assign(await imageHeaderBitmap(await response.blob()), { source, scope: 'geometry-header-only; no pixels' });
      })();
      headerImages.set(source, image);
    }
    texture.image = await image;
    return texture;
  };
  let assets: Awaited<ReturnType<typeof fixtureFetch>> | undefined;
  const people = Array.from({ length: 12 }, (_, i) => ({ id: `recipe-resident-${i}`, look: DEFAULT_LOOK, seed: `recipe-resident-${i}` }));
  const player = { look: DEFAULT_LOOK, seed: 'recipe-player' };
  let references: Awaited<ReturnType<typeof prepareNativeReferences>> | undefined;
  try {
    await import('../node-test-fixture.ts');
    assets = await fixtureFetch();
    await preloadLooks([player, ...people]);
    references = await prepareNativeReferences(people, player, () => true);
    assert.equal(references.members.size, 12);
    for (const person of people) for (const detail of ['lod', 'full'] as const) {
      const surfaces = references.members.get(person.id)![detail];
      assert.ok(surfaces.length > 0 && surfaces.every(surface => surface.triangles > 0 && surface.corners.length === surface.triangles * 24));
    }
    assert.ok(headerImages.size > 0, 'Actual standalone native image fixture boundary exercised');
    const actual = references.player;
    assert.ok(actual.some(surface => surface.kind === 'skinned' && surface.bones.includes('head')));
    for (const name of ['Eye_L', 'Eye_R']) {
      const eye = actual.find(surface => surface.name === name); assert.ok(eye);
      assert.equal(eye.kind, 'rigid'); assert.equal(eye.anchor?.bones[0], 'head');
      assert.deepEqual(Object.keys(eye.morphDictionary).sort(), ['Feature_EastAsianHead', 'Feature_EyeWidth_Negative', 'Feature_EyeWidth_Positive'].sort());
      assert.equal(eye.morphInfluences.length, 3); assert.equal(eye.morphs.position?.length, 3);
      assert.ok(eye.morphInfluences.every(Number.isFinite)); assert.ok(eye.count > 0);
    }
    console.log(JSON.stringify({ scope: 'Actual shipped native GLBs and public CPU reference preparation; existing Node image/header substitutes, no pixels or actual render submission',
      geometryOnlyImageSources: [...headerImages.keys()], residents: references.members.size, details: ['lod', 'full'], playerSurfaces: actual.map(s => ({ name: s.name, kind: s.kind, triangles: s.count / 3, morphs: Object.keys(s.morphDictionary).length, anchor: s.anchor?.bones[0] ?? null })) }));
    references.dispose(); references.dispose(); assert.equal(references.members.size, 0); assert.equal(references.player.length, 0);
  } finally { references?.dispose(); assets?.restore(); THREE.TextureLoader.prototype.loadAsync = originalTextureLoad; headerImages.clear(); }
});
