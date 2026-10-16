// Shapes shared by the asset scripts: the "want list" a person edits (scripts/assets/wants/<pack>.json) and the manifest the
// scripts write next to the files (public/assets/packs/<pack>/manifest.json). docs/ASSET-PIPELINE.md explains both.
//
// A manifest asset carries the cartridge asset fields (src/arena/cartridge.ts on the cartridge branch: path, licence, source,
// author, attribution) under the same names and meanings, so a cartridge manifest can list pack files as they are
// (./cartridge-assets.ts does the conversion), plus bytes, triangles and the facts the pipeline needs to rebuild a file.

export const GAMES = ['fight', 'race', 'football'] as const
export type Game = (typeof GAMES)[number]

/** The cartridge contract's licence words. CC0 and MIT need no credit; CC BY needs `attribution`; `ours` is made for Allworld. */
export type AssetLicence = 'CC0' | 'CC-BY' | 'MIT' | 'ours'
/** The exact licence (SPDX id) behind each word. Nothing else may enter the repository. */
export const LICENCE_IDS = {
  'CC0-1.0': 'CC0',
  'CC-BY-3.0': 'CC-BY',
  'CC-BY-4.0': 'CC-BY',
  'AGPL-3.0-or-later': 'ours',
} as const satisfies Record<string, AssetLicence>
export type LicenceId = keyof typeof LICENCE_IDS
export const LICENCE_URLS: Record<LicenceId, string> = {
  'CC0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  'CC-BY-3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'AGPL-3.0-or-later': 'https://www.gnu.org/licenses/agpl-3.0.html',
}
/** `source` of an asset made for Allworld (the cartridge contract's word). */
export const OWN_SOURCE = 'Allworld'
export const MANIFEST_FORMAT = 1
/** Where packs live, from the repository root. The page address of a file is its path without `public`. */
export const PACKS_ROOT = 'public/assets/packs'
export const packPath = (pack: string, file: string): string => `${PACKS_ROOT}/${pack}/${file}`
export const assetUrl = (path: string): string => path.replace(/^public\//, '/')

/** Triangle caps (counted over everything a file's scene draws). A refusal, not a warning: pick a lighter model. */
export const CAPS = { character: 3000, vehicle: 1500, prop: 1500 } as const
export type ModelKind = keyof typeof CAPS
/** `texture`: an image models share; `licence`: the pack's own licence text (kept, never loaded by a game). */
export type AssetKind = ModelKind | 'texture' | 'licence'
export const MAX_TEXTURE_PX = 1024

/** How a pack's files are obtained. `own`: built by Blender from a committed script (docs/ASSET-PIPELINE.md). */
export type SourceKind = 'kenney' | 'github' | 'itch' | 'polypizza' | 'own'

export interface WantItem {
  /** Path inside the downloaded archive or repository (kenney, itch, github). */
  from?: string
  /** Model page (polypizza): the script reads the file link, author and licence from it. */
  page?: string
  /** own: the Blender script under scripts/assets/blender/ (without .py) and its arguments. */
  blender?: { script: string; args?: string[] }
  /** File name written into the pack folder. */
  as: string
  game: Game
  kind: ModelKind
  /** Multiply the model by this to get metres. */
  scale?: number
  /** Or scale so one axis of the bounds is this many metres. */
  fit?: { axis: 'x' | 'y' | 'z'; metres: number }
  /** The source is Z-up: turn it upright. */
  zUp?: boolean
  /** Keep only these animations, source name -> game name. */
  clips?: Record<string, string>
  /** Keep only the meshes on these nodes (weapons, hats and the like go); the nodes themselves stay. */
  keepMeshes?: string[]
  /** gltfpack simplification (-si ratio, -se error) for a model over its cap. */
  simplify?: { ratio: number; error?: number }
  /** Per-item overrides, for lists whose items come from different authors (polypizza). */
  licenceId?: LicenceId
  author?: string
  attribution?: string
  note?: string
}

export interface WantList {
  pack: string
  /** Name shown in the credits, e.g. "Racing Kit". */
  name: string
  kind: SourceKind
  /** The pack's page; for `own`, the repository folder of its scripts. */
  page: string
  author: string
  licenceId: LicenceId
  /** CC BY only: the credit line exactly as it must appear (also written in NOTICE.md). */
  attribution?: string
  /** github: owner/name and a pinned 40-hex commit. */
  repo?: string
  ref?: string
  /** itch: regular expression for the upload name to take (default: the first one). */
  itchUpload?: string
  /** Licence text inside the archive or repository, kept next to the files as LICENSE.txt. */
  licenceFile?: string
  /** Keep only these 1-based line ranges of it (a licence file that also thanks people by name keeps just the licence). */
  licenceLines?: [number, number][]
  want: WantItem[]
}

export interface ManifestAsset {
  /** From the repository root: public/assets/packs/<pack>/<file>. */
  path: string
  licence: AssetLicence
  /** The page it came from, or `Allworld` for ours. */
  source: string
  author?: string
  /** CC BY only: the credit line exactly as it must appear. */
  attribution?: string
  bytes: number
  /** Triangles the file's scene draws (models only). */
  triangles?: number
  game?: Game
  kind: AssetKind
  licenceId: LicenceId
  /** Where the file sat in the archive or repository, and the SHA-256 of the bytes as fetched. */
  from?: string
  sourceSha256?: string
  /** own: the script that builds it. */
  made?: string
  /** Set by prepare.ts; a model without it fails the budget. */
  prepared?: boolean
  /** A texture or buffer a fetched model points at: kept only until prepare.ts has folded it in, then deleted. */
  temporary?: boolean
  note?: string
}

export interface Manifest {
  format: typeof MANIFEST_FORMAT
  pack: string
  name: string
  kind: SourceKind
  page: string
  author: string
  licenceId: LicenceId
  /** Day the files were fetched or built (YYYY-MM-DD). */
  fetched: string
  assets: ManifestAsset[]
}

const isLicenceId = (x: unknown): x is LicenceId => typeof x === 'string' && Object.hasOwn(LICENCE_IDS, x)
const KINDS: readonly string[] = [...Object.keys(CAPS), 'texture', 'licence']

/** Problems with a manifest, as plain sentences (empty when it is fine). Pure: the files are checked by budget.ts. */
export function manifestProblems(m: unknown, pack = ''): string[] {
  const out: string[] = []
  const o = m as Partial<Manifest> | null
  if (!o || typeof o !== 'object' || !Array.isArray(o.assets)) return ['manifest has no assets list']
  if (o.format !== MANIFEST_FORMAT) out.push(`format must be ${MANIFEST_FORMAT}`)
  for (const k of ['pack', 'name', 'kind', 'page', 'author', 'fetched'] as const) if (typeof o[k] !== 'string' || !o[k]) out.push(`missing ${k}`)
  if (pack && o.pack !== pack) out.push(`pack is ${String(o.pack)}, folder is ${pack}`)
  if (!isLicenceId(o.licenceId)) out.push(`licenceId ${String(o.licenceId)} is not allowed`)
  const seen = new Set<string>()
  o.assets.forEach((a, i) => {
    const at = `assets[${i}]${a && typeof a.path === 'string' ? ` (${a.path})` : ''}`
    if (!a || typeof a !== 'object') { out.push(`${at}: not an object`); return }
    for (const k of ['path', 'source', 'licence', 'kind', 'licenceId'] as const) if (typeof a[k] !== 'string' || !a[k]) out.push(`${at}: missing ${k}`)
    if (!Number.isInteger(a.bytes) || a.bytes < 0) out.push(`${at}: bytes must be a whole number`)
    if (typeof a.kind === 'string' && !KINDS.includes(a.kind)) out.push(`${at}: unknown kind ${a.kind}`)
    if (a.licenceId !== undefined && !isLicenceId(a.licenceId)) out.push(`${at}: licence ${String(a.licenceId)} is not allowed (CC0, CC BY or ours only)`)
    if (isLicenceId(a.licenceId) && a.licence !== LICENCE_IDS[a.licenceId]) out.push(`${at}: licence ${String(a.licence)} does not match ${a.licenceId}`)
    if (a.licence === 'ours' ? a.source !== OWN_SOURCE : typeof a.source === 'string' && !/^https:\/\//.test(a.source)) out.push(`${at}: source must be an https page (or ${OWN_SOURCE} for ours)`)
    if (a.licence === 'ours' && !a.made) out.push(`${at}: ours needs the script that makes it (made)`)
    if (a.licence === 'CC-BY' && !a.attribution?.trim()) out.push(`${at}: CC BY needs the attribution text`)
    if (a.licence !== 'CC-BY' && a.attribution !== undefined) out.push(`${at}: only CC BY carries an attribution`)
    if (a.kind && a.kind in CAPS && !a.temporary && !(Number.isInteger(a.triangles) && a.triangles! >= 0)) out.push(`${at}: a model needs its triangle count`)
    if (a.kind && a.kind in CAPS && !a.temporary && !a.game) out.push(`${at}: a model needs its game`)
    if (a.game !== undefined && !(GAMES as readonly string[]).includes(a.game)) out.push(`${at}: unknown game ${a.game}`)
    if (typeof a.path === 'string') {
      if (seen.has(a.path)) out.push(`${at}: listed twice`)
      seen.add(a.path)
      if (pack && !a.path.startsWith(`${PACKS_ROOT}/${pack}/`)) out.push(`${at}: path is outside ${PACKS_ROOT}/${pack}/`)
      if (a.path.includes('..')) out.push(`${at}: path must not climb out of the pack`)
    }
  })
  return out
}
