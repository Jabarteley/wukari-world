// A photograph of a house: the same house Walk in 3D builds (src/spaces/world/space.ts), drawn once from the yard on the door's
// side and kept as a picture, so the Houses page shows the house a visitor sees and not a drawing that only resembles it.
// three is fetched only here (the same lazy chunk Walk in 3D uses); one picture per house, kept for the session.
import type { SpaceInput } from '../../../spaces/world/space.ts'

const photos = new Map<string, string>()

/** What changes the outside of the house: the plot, who owns it and the colours. Furniture inside does not. */
export const photoKey = (input: Pick<SpaceInput, 'grid' | 'owned' | 'style' | 'house'>): string => JSON.stringify([input.grid, input.owned, input.style, input.house ?? null])

/** Where the camera stands for a plot `w` by `d` metres and `h` tall: in the yard, on the front door's side (x = 0), looking at the middle. */
export function photoCamera(w: number, d: number, h: number, front: 'left' | 'near' = 'left'): { from: [number, number, number]; at: [number, number, number] } {
  const dist = Math.max(w, d, h * 1.8) * 1.15 + 4
  // The game's house has its door on the left wall (x = 0); a copied house faces the street from its near wall (z = 0).
  if (front === 'near') return { from: [w / 2 - dist * 0.55, h * 0.55 + dist * 0.38, -dist * 0.75], at: [w / 2, Math.max(0.9, h * 0.38), d / 2] }
  return { from: [-dist * 0.7, h * 0.55 + dist * 0.38, d / 2 + dist * 0.62], at: [w / 2, Math.max(0.9, h * 0.38), d / 2] }
}

export async function photographHouse(input: SpaceInput, width = 720, height = 400): Promise<string> {
  const key = photoKey(input)
  const had = photos.get(key)
  if (had) return had
  const [{ buildSpace }, { createLook, aimSun, THREE }] = await Promise.all([import('../../../spaces/world/space.ts'), import('../../../spaces/world/look.ts')])
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const look = createLook(canvas, { quality: 'normal', background: '#d9e6ef' })
  look.renderer.setPixelRatio(1)
  look.renderer.setSize(width, height, false)
  const space = buildSpace({ ...input, items: input.items }, 4)
  try {
    space.show(space.plan.floors.length - 1, false, true)
    look.scene.add(space.root)
    const box = new THREE.Box3()
    for (const child of space.root.children) if (child.name !== 'ground') box.expandByObject(child)
    const size = box.getSize(new THREE.Vector3())
    const centre = box.getCenter(new THREE.Vector3())
    aimSun(look, centre, Math.max(size.x, size.z) / 2 + 3)
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 300)
    const { from, at } = photoCamera(size.x, size.z, size.y, input.house?.kind === 'spec' ? 'near' : 'left')
    camera.position.set(box.min.x + from[0], from[1], box.min.z + from[2])
    camera.lookAt(box.min.x + at[0], at[1], box.min.z + at[2])
    look.renderer.render(look.scene, camera)
    const url = canvas.toDataURL('image/webp', 0.86)
    photos.set(key, url)
    return url
  } finally {
    look.scene.remove(space.root)
    space.dispose()
    look.dispose()
  }
}
