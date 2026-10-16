// Pack manifest -> cartridge asset entries (the `assets` list of a cartridge manifest, src/arena/cartridge.ts):
// { path, licence, source, author?, attribution? }, the same names and meanings the pack manifest already uses, so the conversion
// only chooses files and drops the pipeline's own fields. Pure: no file is read.
import type { CartridgeAsset } from '../../src/arena/cartridge.ts'
import type { Game, Manifest } from './pack-types.ts'

/** The contract's own entry type: the compiler checks a pack manifest's fields still fit it. */
export type CartridgeAssetEntry = CartridgeAsset

export interface PickAssets {
  /** Only the files tagged with this game. */
  game?: Game
  /** Only these file names (inside the pack folder), in this order; a name the manifest does not list is an error. */
  files?: readonly string[]
}

/**
 * The cartridge entries for the files a game loads from one pack: every model and texture (never the licence text, never a
 * fetched texture prepare.ts has not folded in), optionally only one game's or only named files.
 */
export function cartridgeAssets(manifest: Manifest, pick: PickAssets = {}): CartridgeAssetEntry[] {
  const prefix = `public/assets/packs/${manifest.pack}/`
  const usable = manifest.assets.filter((a) => !a.temporary && a.kind !== 'licence' && (pick.game === undefined || a.game === pick.game))
  const chosen = pick.files
    ? pick.files.map((name) => {
      const found = usable.find((a) => a.path === prefix + name)
      if (!found) throw new Error(`${manifest.pack} has no usable file ${name}${pick.game ? ` for ${pick.game}` : ''}`)
      return found
    })
    : usable
  return chosen.map((a) => ({
    path: a.path,
    licence: a.licence,
    source: a.source,
    ...(a.author ? { author: a.author } : {}),
    ...(a.licence === 'CC-BY' && a.attribution ? { attribution: a.attribution } : {}),
  }))
}

/** The entries for one game across several packs, in pack order. */
export const gameAssets = (manifests: readonly Manifest[], game: Game): CartridgeAssetEntry[] => manifests.flatMap((m) => cartridgeAssets(m, { game }))
