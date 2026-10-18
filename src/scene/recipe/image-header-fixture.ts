import { imageSize } from '../../../scripts/assets/glb.ts';

/** Geometry-only descriptor. Dimensions come from bytes; no pixel decoding or rendering is claimed. */
export async function imageHeaderBitmap(blob: Blob): Promise<{ width: number; height: number; close(): void }> {
  const [width, height] = imageSize(Buffer.from(await blob.arrayBuffer()));
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) throw new Error('Invalid image header dimensions');
  return { width, height, close() {} };
}
export function recipeGeometryCanvas() {
  return { width: 1, height: 1, getContext: () => ({
    drawImage() {}, putImageData() {}, fillRect() {}, fillText() {},
    measureText: (text: string) => ({ width: Array.from(text).length * 24 }),
    getImageData: () => ({ data: new Uint8ClampedArray([128, 128, 128, 255]) }),
  }) };
}
