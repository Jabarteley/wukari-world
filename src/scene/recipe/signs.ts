import type * as THREE from 'three';
import type { Kit } from '../kit.ts';
import type { SceneRecipeV1 } from './contract.ts';
import { requireRecipe } from './pack.ts';

export function createRecipeSigns(kit: Kit, recipe: SceneRecipeV1): { mesh: THREE.Mesh; textureBytes: number; dispose(): void } | null {
  if (!recipe.signs.length) return null;
  const { THREE } = kit, canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128 * recipe.signs.length;
  const ctx = canvas.getContext('2d'); requireRecipe(ctx, 'sign canvas unavailable');
  const positions: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (const [i, sign] of recipe.signs.entries()) {
    ctx.fillStyle = recipe.palette.wall; ctx.fillRect(0, i * 128, 512, 128);
    ctx.fillStyle = recipe.palette.trim; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 48px sans-serif';
    const measured = ctx.measureText(sign.text).width;
    requireRecipe(Number.isFinite(measured) && measured > 0, 'sign text cannot be measured');
    ctx.font = `600 ${Math.min(48, 48 * 472 / measured)}px sans-serif`;
    ctx.fillText(sign.text, 256, i * 128 + 64, 472);
    const c = Math.cos(sign.ry), s = Math.sin(sign.ry), base = positions.length / 3;
    for (const [x, y, u, v] of [[-0.5, -0.5, 0, 0], [0.5, -0.5, 1, 0], [0.5, 0.5, 1, 1], [-0.5, 0.5, 0, 1]]) {
      positions.push(sign.position[0] + x! * sign.width * c, sign.position[1] + y! * sign.height, sign.position[2] - x! * sign.width * s);
      normals.push(s, 0, c); uvs.push(u!, 1 - (i + 1 - v!) / recipe.signs.length);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.92, metalness: 0 }); kit.adopt(material);
  const mesh = new THREE.Mesh(geometry, material); mesh.name = 'recipe:signs'; mesh.castShadow = true; mesh.receiveShadow = true;
  let disposed = false;
  return { mesh, textureBytes: Math.ceil(canvas.width * canvas.height * 4 * 4 / 3), dispose() {
    if (disposed) return; disposed = true; mesh.removeFromParent(); geometry.dispose(); material.dispose(); texture.dispose();
  } };
}
