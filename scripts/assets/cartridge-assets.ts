// Pack manifest -> cartridge asset entries (the `assets` list of a cartridge manifest, src/arena/cartridge.ts on the cartridge
// branch): { path, licence, source, author?, attribution? }, the same names and meanings the pack manifest already uses, so the
// conversion only chooses files and drops the pipeline's own fields. Pure: no file is read.
//
// The type is restated here (structurally the contract's CartridgeAsset) because the contract is not on this branch yet; once it
// is, `import type { CartridgeAsset } from '../../src/arena/cartridge.ts'` can replace it and the compiler checks they agree.
import type { AssetLicence, Game, Manifest } from './pack-types.ts'

export interface CartridgeAssetEntry {
  /** From the repository root, e.g. public/assets/packs/allworld-arenas/ring.glb. */
  path: string
  licence: AssetLicence
  /** A page address for third-party work, `Allworld` for ours. */
  source: string
  author?: string
  /** CC BY only: the credit line exactly as it must appear (and as NOTICE.md must contain it). */
  attribution?: string
}

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
