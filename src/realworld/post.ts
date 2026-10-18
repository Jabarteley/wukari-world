import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';

/** HDR scene -> ground-truth ambient occlusion -> bloom -> tone mapping (AgX) and sRGB -> SMAA. */
export function createPost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, options: { ao?: boolean; msaa?: number } = {}) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: options.msaa ?? 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  // Ambient occlusion at half resolution (it is soft; full resolution cost three quarters of the frame at a 2x pixel ratio).
  const gtao = new GTAOPass(scene, camera, Math.ceil(size.x / 2), Math.ceil(size.y / 2));
  const fullSize = gtao.setSize.bind(gtao);
  gtao.setSize = (w: number, h: number) => fullSize(Math.ceil(w / 2), Math.ceil(h / 2));
  gtao.blendIntensity = 0.9;
  gtao.updateGtaoMaterial({ radius: 3, distanceExponent: 1.4, thickness: 3, scale: 1, samples: 8, distanceFallOff: 1, screenSpaceRadius: false });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 8 });
  if (options.ao !== false) composer.addPass(gtao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.18, 0.55, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  composer.addPass(new SMAAPass());
  return {
    composer, gtao, bloom,
    setSize(w: number, h: number) { composer.setSize(w, h); },
    render() { composer.render(); },
  };
}
