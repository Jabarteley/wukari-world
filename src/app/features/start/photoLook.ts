// "Start from a photo", on the device: read the file the person chose, shrink it on a canvas, find the face
// where the browser can (FaceDetector), hand the pixels to fromPhoto.ts and let go of everything. The photo is
// never uploaded, stored or logged: it lives in a bitmap and a small canvas for the length of this call, and
// both are emptied before it returns. Fetched with a dynamic import when the button is pressed, so the
// first download does not grow.
import { recipeFromPhoto } from './fromPhoto.ts'
import type { FaceBox, PhotoRecipe } from './fromPhoto.ts'

/** The long edge the picture is shrunk to: plenty for a median of skin pixels, little to keep in memory. */
const LONG_EDGE = 512

interface FaceDetectorLike { detect(image: CanvasImageSource): Promise<{ boundingBox: DOMRectReadOnly }[]> }
type FaceDetectorCtor = new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike

/** The largest face the browser finds, or null (no FaceDetector, no face, or it failed): the caller then reads the middle of the picture. */
async function findFace(canvas: HTMLCanvasElement): Promise<FaceBox | null> {
  const Detector = (globalThis as { FaceDetector?: FaceDetectorCtor }).FaceDetector
  if (!Detector) return null
  try {
    const faces = await new Detector({ fastMode: true, maxDetectedFaces: 3 }).detect(canvas)
    let best: FaceBox | null = null
    for (const { boundingBox: b } of faces) if (!best || b.width * b.height > best.width * best.height) best = { x: b.x, y: b.y, width: b.width, height: b.height }
    return best
  } catch { return null }
}

/** What the photo says about the look, or null when the file is not a picture this browser can read. */
export async function readPhotoRecipe(file: Blob): Promise<PhotoRecipe | null> {
  let bitmap: ImageBitmap | null = null
  const canvas = document.createElement('canvas')
  try {
    bitmap = await createImageBitmap(file)
    const scale = Math.min(1, LONG_EDGE / Math.max(bitmap.width, bitmap.height))
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const face = await findFace(canvas)
    return recipeFromPhoto(ctx.getImageData(0, 0, canvas.width, canvas.height), { face })
  } catch { return null } finally {
    bitmap?.close()
    canvas.width = 0; canvas.height = 0
  }
}
