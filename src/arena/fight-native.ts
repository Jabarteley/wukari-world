/**
 * OWNER: games (real-time)
 * THE PLAYERS' OWN CHARACTERS IN THE FIGHT RING: a native actor (the world's CC0 MakeHuman body, hair, outfit and shoes, dressed from a
 * seat's public look) whose skeleton is driven only by our own fight clips (scripts/assets/blender/native-fight-clips.py): the native
 * system's locomotion and actions are never run for it. A lazy chunk beside fight-3d.ts; the native runtime comes through
 * native-body.ts, which the world already loads, so a player who has been in the world has most of these files cached.
 */
import { THREE, lambertise } from './three/kit.ts'
import { nativeSystem } from '../scene/character-lab/native-body.ts'
import type { NativeAppearanceV2 } from '../character/native-recipe.ts'

/** The Blender script's clip names, as the 3D view calls them. */
export const CLIP_NAMES: Readonly<Record<string, string>> = Object.freeze({
  idle: 'idle', 'walk-forward': 'walk', 'walk-back': 'walk-back', jab: 'punch', cross: 'punch-2', kick: 'kick', block: 'blocking',
  'block-hit': 'block-hit', hit: 'hit', 'hit-2': 'hit-2', down: 'down', cheer: 'cheer',
})
/** A real person's height is 1.78 m with these rigs at height 1; fighters keep to 1.8 m, give or take a little. */
export const BASE_HEIGHT = 1.78
export const fighterScale = (height: number): number => (1.8 / BASE_HEIGHT) * Math.min(1.05, Math.max(0.96, height))

export interface NativeFighter {
  /** What goes in the scene. */
  group: THREE.Group
  /** The skeleton the mixer drives, and the names of its bones. */
  model: THREE.Object3D
  bones: ReadonlySet<string>
  dispose(): void
}

/** The loader renames a bone that shares its name with one of the file's other skeleton (the second body's `pelvis` is `pelvis_1`): put it back. */
export function boneTrackName(track: string, bones: ReadonlySet<string>): string {
  const dot = track.lastIndexOf('.')
  const node = track.slice(0, dot)
  if (bones.has(node)) return track
  const plain = node.replace(/_\d+$/, '')
  return bones.has(plain) ? plain + track.slice(dot) : track
}

/** The clips of one body out of the clips file, under the 3D view's own names. */
export function clipsFor(animations: readonly THREE.AnimationClip[], body: string, bones: ReadonlySet<string>): THREE.AnimationClip[] {
  const out: THREE.AnimationClip[] = []
  for (const clip of animations) {
    const dot = clip.name.lastIndexOf('.')
    if (dot < 0 || clip.name.slice(dot + 1) !== body) continue
    const name = CLIP_NAMES[clip.name.slice(0, dot)]
    if (name) { const copy = clip.clone(); copy.name = name; for (const track of copy.tracks) track.name = boneTrackName(track.name, bones); out.push(copy) }
  }
  return out
}

let serial = 0
/** Warm the shared native system (its catalogue and motion files). */
export async function warmNative(): Promise<void> { await nativeSystem() }

/** Dress and spawn one fighter. Rejects when the native files are not there. */
export async function spawnNativeFighter(appearance: NativeAppearanceV2): Promise<NativeFighter> {
  const system = await nativeSystem()
  const actor = await system.spawn({ id: `fight-native-${++serial}`, appearance })
  const group = new THREE.Group()
  group.add(actor.root)
  actor.root.scale.setScalar(fighterScale(appearance.height))
  actor.root.visible = true
  lambertise(actor.root)
  return { group, model: actor.model, bones: new Set(actor.bones.keys()), dispose() { group.removeFromParent(); actor.dispose() } }
}
