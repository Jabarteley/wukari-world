import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyPhotoRecipe, centreFace, isSkinPixel, nearestColor, photoChangedSomething, recipeFromPhoto } from './fromPhoto.ts'
import type { FaceBox, PixelData } from './fromPhoto.ts'
import { HAIR_COLOR, SKIN, nativeRecipeForLook } from '../../../character/native-migration.ts'

type Rgb = [number, number, number]
const rgb = (hex: string): Rgb => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]

/** A synthetic selfie: a plain wall, a hair block above a skin block (the face), with a little deterministic noise. */
function selfie(opts: { w?: number; h?: number; skin?: Rgb; hair?: Rgb | null; wall?: Rgb; face?: FaceBox }): PixelData {
  const w = opts.w ?? 120, h = opts.h ?? 160
  const face = opts.face ?? { x: w * 0.3, y: h * 0.3, width: w * 0.4, height: h * 0.4 }
  const wall = opts.wall ?? [226, 226, 222], skin = opts.skin ?? [176, 118, 76]
  const data = new Uint8ClampedArray(w * h * 4)
  let seed = 7
  const noise = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed % 9) - 4 }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let c: Rgb = wall
      const inX = x >= face.x - face.width * 0.1 && x < face.x + face.width * 1.1
      if (inX && y >= face.y && y < face.y + face.height * 1.2) c = skin
      else if (opts.hair !== null && inX && y >= face.y - face.height * 0.45 && y < face.y) c = opts.hair ?? [42, 33, 29]
      const n = noise(), at = (y * w + x) * 4
      data[at] = c[0] + n; data[at + 1] = c[1] + n; data[at + 2] = c[2] + n; data[at + 3] = 255
    }
  }
  return { width: w, height: h, data }
}

test('the skin test passes every catalogue tone and rejects a wall, black and green', () => {
  for (const hex of Object.values(SKIN)) assert.ok(isSkinPixel(...rgb(hex)), hex)
  assert.equal(isSkinPixel(226, 226, 222), false)
  assert.equal(isSkinPixel(10, 10, 10), false)
  assert.equal(isSkinPixel(60, 160, 70), false)
})

test('nearest colour: a tone near a catalogue tone maps to it, in both palettes', () => {
  assert.equal(nearestColor([180, 120, 80], SKIN).id, 'skin-3')
  assert.equal(nearestColor([232, 180, 135], SKIN).id, 'skin-1')
  assert.equal(nearestColor([90, 52, 32], SKIN).id, 'skin-6')
  assert.equal(nearestColor([12, 10, 10], HAIR_COLOR).id, 'black')
  assert.equal(nearestColor([95, 60, 38], HAIR_COLOR).id, 'brown')
})

test('a selfie with a face box gives the nearest skin tone, hair colour and complexion', () => {
  const recipe = recipeFromPhoto(selfie({ skin: rgb('#b0764c'), hair: rgb('#3d2a1e') }), { face: { x: 36, y: 48, width: 48, height: 64 } })
  assert.equal(recipe.colors.skin, '#b0764c')
  assert.equal(recipe.colors.hair, '#3d2a1e')
  assert.equal(recipe.complexion, 'medium')
  assert.equal(recipe.glasses, undefined)
  assert.ok(photoChangedSomething(recipe))
})

test('without a face box the middle of the picture is read; light and very dark skin map to the ends of the range', () => {
  const light = recipeFromPhoto(selfie({ skin: rgb('#e0ac7e'), hair: rgb('#d9b45f') }))
  assert.equal(light.colors.skin, '#e0ac7e'); assert.equal(light.complexion, 'light'); assert.equal(light.colors.hair, '#d9b45f')
  const dark = recipeFromPhoto(selfie({ skin: rgb('#3f2416'), hair: rgb('#15110f') }))
  assert.equal(dark.colors.skin, '#3f2416'); assert.equal(dark.complexion, 'deep'); assert.equal(dark.colors.hair, '#15110f')
  const face = centreFace(120, 160)
  assert.ok(face.x > 0 && face.x + face.width < 120 && face.y > 0 && face.y + face.height < 160)
})

test('a bald head against a pale wall gives a skin tone and no hair colour', () => {
  const recipe = recipeFromPhoto(selfie({ skin: rgb('#96603c'), hair: null }), { face: { x: 36, y: 48, width: 48, height: 64 } })
  assert.equal(recipe.colors.skin, '#96603c')
  assert.equal(recipe.colors.hair, undefined)
})

test('a picture with no skin in it changes nothing; empty or short data is safe', () => {
  const green = recipeFromPhoto(selfie({ skin: [60, 160, 70], hair: [20, 20, 20] }))
  assert.equal(green.colors.skin, undefined); assert.equal(green.complexion, undefined)
  assert.equal(photoChangedSomething(recipeFromPhoto({ width: 0, height: 0, data: [] })), false)
  assert.equal(photoChangedSomething(recipeFromPhoto({ width: 10, height: 10, data: new Uint8Array(12) })), false)
})

test('glasses are in the recipe only when the caller passes a detector result', () => {
  const pixels = selfie({})
  assert.equal(recipeFromPhoto(pixels).glasses, undefined)
  assert.equal(recipeFromPhoto(pixels, { glasses: false }).glasses, undefined)
  assert.equal(recipeFromPhoto(pixels, { glasses: true }).glasses, true)
})

test('transparent pixels are not read', () => {
  const pixels = selfie({ skin: rgb('#b0764c') })
  const data = pixels.data as Uint8ClampedArray
  for (let i = 3; i < data.length; i += 4) data[i] = 0
  assert.equal(recipeFromPhoto(pixels).colors.skin, undefined)
})

test('applying the recipe sets the native colours and complexion and keeps everything else', () => {
  const look = { body: 'woman', hair: 'braids', outfit: 'casual', fabric: 'plain', skin: 'skin-2', hairColor: 'black', outfitColor: 'blue', bottomsColor: 'blue', accessories: ['glasses'] } as never
  const before = nativeRecipeForLook(look, 'x')
  const next = applyPhotoRecipe(look, { colors: { skin: '#5e3620', hair: '#3d2a1e' }, complexion: 'deep', glasses: true })
  const native = next.native!
  assert.equal(native.appearance.colors.skin, '#5e3620')
  assert.equal(native.appearance.colors.hair, '#3d2a1e')
  assert.equal(native.appearance.complexion, 'deep')
  assert.equal(native.appearance.hair, before.appearance.hair)
  assert.deepEqual(native.appearance.garments, before.appearance.garments)
  assert.equal(native.appearance.body, 'female'); assert.equal(next.body, 'woman')
  assert.equal(next.accessories, undefined)
  const same = applyPhotoRecipe(look, { colors: {} })
  assert.equal(same.native!.appearance.colors.skin, before.appearance.colors.skin)
})
