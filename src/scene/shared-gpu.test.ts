import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { onReleaseSharedGpu, releaseSharedGpu } from './shared-gpu.ts';

test('releasing shared objects detaches every renderer listener; a failing cache does not stop the others', () => {
  const texture = new THREE.Texture(), geometry = new THREE.BufferGeometry();
  let detached = 0;
  // What a renderer does when it first draws an object: it listens for the object's disposal (and is kept alive by it).
  for (const object of [texture, geometry]) object.addEventListener('dispose', function listener() { detached++; object.removeEventListener('dispose', listener); });
  onReleaseSharedGpu(() => { throw new Error('a cache that cannot release'); });
  onReleaseSharedGpu(() => { texture.dispose(); geometry.dispose(); });
  releaseSharedGpu();
  assert.equal(detached, 2);
  assert.equal(texture.hasEventListener('dispose', () => {}), false);
  releaseSharedGpu();
  assert.equal(detached, 2, 'nothing left to detach');
});
