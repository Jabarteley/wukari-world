// "Start from a photo", without a DOM: a picture's pixels in, a partial look out. The skin tone is the median
// of the skin-coloured pixels in the middle of the face; the hair colour is the median of the band above
// the face; each is mapped to the nearest colour of the character catalogue (the seven skin tones and seven
// hair colours of native-migration.ts). This is a likeness of tones, not a face scan: nothing here finds a
// face, measures one or keeps a picture. The caller reads the file, downscales it, hands the pixels in and
// drops them (photoLook.ts); this file never touches the DOM, the network or storage.
import { normalizeNativeRecipe } from '../../../character/native-recipe.ts'
import type { NativeComplexionId } from '../../../character/native-recipe.ts'
import { HAIR_COLOR, SKIN, nativeRecipeForLook } from '../../../character/native-migration.ts'
import type { Look } from '../../../types/life.ts'

/** RGBA bytes, row by row: what `ImageData` holds. */
export interface PixelData { readonly width: number; readonly height: number; readonly data: ArrayLike<number> }
/** A face rectangle in the picture's own pixels (what the browser's FaceDetector reports). */
export interface FaceBox { x: number; y: number; width: number; height: number }
export interface PhotoOptions {
  /** Where the face is; without it the middle of the picture is taken as the face. */
  face?: FaceBox | null
  /** Set only by a detector that saw glasses. A skin and hair sample cannot tell. */
  glasses?: boolean
}
/** What the photo decided. A missing colour means the picture gave no clear answer: the look keeps what it had. */
export interface PhotoRecipe {
  colors: { skin?: string; hair?: string }
  complexion?: NativeComplexionId
  /** Only when the caller said so. The native figure has no glasses yet, so applyPhotoRecipe does not draw them. */
  glasses?: true
}

type Rgb = readonly [number, number, number]
const luma = (r: number, g: number, b: number): number => 0.299 * r + 0.587 * g + 0.114 * b

/** A simple skin-chroma test (YCbCr box, after Chai and Ngan) that also admits the darkest catalogue tone. */
export function isSkinPixel(r: number, g: number, b: number): boolean {
  const y = luma(r, g, b)
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
  return y >= 30 && y <= 245 && cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173 && r > g && r > b
}

const median = (values: number[]): number => {
  values.sort((a, b) => a - b)
  const mid = values.length >> 1
  return values.length % 2 ? values[mid]! : (values[mid - 1]! + values[mid]!) / 2
}
const medianColor = (pixels: readonly Rgb[]): Rgb => [median(pixels.map((p) => p[0])), median(pixels.map((p) => p[1])), median(pixels.map((p) => p[2]))]
const rgbOf = (color: string): Rgb => [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)]

/** sRGB to CIE Lab (D65), so "nearest" is nearest to the eye and not to the arithmetic of the bytes. */
function lab([r, g, b]: Rgb): Rgb {
  const lin = (v: number): number => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  const R = lin(r), G = lin(g), B = lin(b)
  const f = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047), y = f(0.2126 * R + 0.7152 * G + 0.0722 * B), z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883)
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}
const labDistance = (a: Rgb, b: Rgb): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
/** The id and colour in `palette` nearest to `color`. */
export function nearestColor(color: Rgb, palette: Readonly<Record<string, string>>): { id: string; hex: string } {
  const target = lab(color)
  let best = { id: '', hex: '' }, bestDistance = Infinity
  for (const [id, value] of Object.entries(palette)) {
    const c = lab(rgbOf(value))
    const distance = labDistance(c, target)
    if (distance < bestDistance) { best = { id, hex: value }; bestDistance = distance }
  }
  return best
}

/** The face to read when the browser cannot find one: the middle of the picture, where a selfie holds it. */
export const centreFace = (w: number, h: number): FaceBox => ({ x: w * 0.3, y: h * 0.25, width: w * 0.4, height: h * 0.4 })

interface Area { x0: number; y0: number; x1: number; y1: number }
function clampBox(box: FaceBox, w: number, h: number): Area {
  return { x0: Math.max(0, Math.floor(box.x)), y0: Math.max(0, Math.floor(box.y)), x1: Math.min(w, Math.ceil(box.x + box.width)), y1: Math.min(h, Math.ceil(box.y + box.height)) }
}
function sample(pixels: PixelData, area: Area, keep: (r: number, g: number, b: number) => boolean): { kept: Rgb[]; seen: number } {
  const kept: Rgb[] = []
  let seen = 0
  const { width, data } = pixels
  for (let y = area.y0; y < area.y1; y++) {
    for (let x = area.x0; x < area.x1; x++) {
      const at = (y * width + x) * 4
      if ((data[at + 3] ?? 255) < 200) continue
      seen += 1
      const r = data[at]!, g = data[at + 1]!, b = data[at + 2]!
      if (keep(r, g, b)) kept.push([r, g, b])
    }
  }
  return { kept, seen }
}
/** Enough of a region has to agree before it counts: a few stray pixels are not a skin tone. */
const enough = (kept: number, seen: number): boolean => kept >= 6 && kept >= seen * 0.12
const complexionOf = (skinId: string): NativeComplexionId => (skinId === 'skin-1' || skinId === 'skin-2' ? 'light' : skinId === 'skin-3' || skinId === 'skin-4' ? 'medium' : 'deep')

/** Read a skin tone and a hair colour from the pixels of a selfie; either may be missing when the picture is unclear. */
export function recipeFromPhoto(pixels: PixelData, options: PhotoOptions = {}): PhotoRecipe {
  const { width, height } = pixels
  const recipe: PhotoRecipe = { colors: {} }
  if (options.glasses === true) recipe.glasses = true
  if (width < 4 || height < 4 || pixels.data.length < width * height * 4) return recipe
  const face = options.face && options.face.width > 1 && options.face.height > 1 ? options.face : centreFace(width, height)

  // Skin: the middle of the face (cheeks, nose, forehead), away from hair, beard line and background.
  const inner = clampBox({ x: face.x + face.width * 0.25, y: face.y + face.height * 0.3, width: face.width * 0.5, height: face.height * 0.5 }, width, height)
  const skin = sample(pixels, inner, isSkinPixel)
  let skinLab: Rgb | null = null
  if (enough(skin.kept.length, skin.seen)) {
    const median3 = medianColor(skin.kept)
    skinLab = lab(median3)
    const near = nearestColor(median3, SKIN)
    recipe.colors.skin = near.hex
    recipe.complexion = complexionOf(near.id)
  }

  // Hair: the band just above the face. Forehead skin (within a small Lab distance of the face's own tone) and a pale, plain wall behind the head are left out.
  const band = clampBox({ x: face.x + face.width * 0.2, y: face.y - face.height * 0.4, width: face.width * 0.6, height: face.height * 0.5 }, width, height)
  const hair = sample(pixels, band, (r, g, b) => {
    const y = luma(r, g, b), spread = Math.max(r, g, b) - Math.min(r, g, b)
    if (y > 235 || (y > 170 && spread < 28)) return false
    return !(skinLab !== null && isSkinPixel(r, g, b) && labDistance(lab([r, g, b]), skinLab) < 12)
  })
  if (face.y >= 2 && enough(hair.kept.length, hair.seen)) recipe.colors.hair = nearestColor(medianColor(hair.kept), HAIR_COLOR).hex
  return recipe
}

/**
 * The look with the photo's colours put on, as the look editor would put them: the figure is the native
 * one, so a colour choice is a native colour. Glasses are not applied: the native figure has none to wear.
 */
export function applyPhotoRecipe(look: Look, recipe: PhotoRecipe): Look {
  const native = nativeRecipeForLook(look, 'from-photo')
  const appearance = { ...native.appearance, complexion: recipe.complexion ?? native.appearance.complexion, colors: { ...native.appearance.colors, ...recipe.colors } }
  return { ...look, body: appearance.body === 'male' ? 'man' : 'woman', accessories: undefined, wearables: undefined, appearance: undefined, native: normalizeNativeRecipe({ ...native, appearance }) }
}

/** Whether the photo set anything at all. */
export const photoChangedSomething = (recipe: PhotoRecipe): boolean => Boolean(recipe.colors.skin || recipe.colors.hair)
