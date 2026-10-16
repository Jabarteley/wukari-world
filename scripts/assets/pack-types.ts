// Shapes shared by the asset scripts: the "want list" a person edits (scripts/assets/wants/<pack>.json) and the
// manifest the scripts write next to the files (public/assets/packs/<pack>/manifest.json).
//
// The manifest is deliberately plain JSON: { "assets": [{ "path", "source", "url", "licence", "attribution"?, "bytes" }] }
// plus a few optional facts. `path` is relative to public/ (so the page URL is "/" + path), which lets a game manifest
// or a checker join on it. Licences are SPDX-style ids; only CC0-1.0 and CC-BY-* are allowed (see ALLOWED_LICENCES).
import type { Kind } from './prepare.ts';

export const GAMES = ['fight', 'race', 'football'] as const;
export type Game = (typeof GAMES)[number];
/** CC0 needs no attribution; CC BY needs the attribution text recorded and shown. Nothing else may enter the repository. */
export const ALLOWED_LICENCES = ['CC0-1.0', 'CC-BY-3.0', 'CC-BY-4.0'] as const;
export type Licence = (typeof ALLOWED_LICENCES)[number];
export const PACKS_ROOT = 'assets/packs';

export interface WantItem {
  /** Path inside the downloaded archive (archive sources). */
  from?: string;
  /** Model page (Poly Pizza): the script reads the file link, author and licence from it. */
  page?: string;
  /** File name written into the pack folder. */
  as: string;
  game: Game;
  /** What the file is, which sets the triangle cap. "raw" files (texts, sounds) are kept as they are. */
  kind: Kind | 'raw';
  /** Multiply the model by this to get metres. */
  scale?: number;
  /** Or scale so one axis of the bounds is this many metres. */
  fit?: { axis: 'x' | 'y' | 'z'; metres: number };
  /** The source is Z-up: turn it upright. */
  zUp?: boolean;
  /** Keep only these animations, old name -> game name. */
  clips?: Record<string, string>;
  /** Animation-only file: remove meshes and skins, keep the joints. */
  dropMeshes?: boolean;
  /** Per-item overrides, for lists whose items come from different authors. */
  licence?: Licence;
  attribution?: string;
  note?: string;
}

export interface WantList {
  pack: string;
  source: string;
  /** How the archive is obtained. */
  kind: 'kenney' | 'itch' | 'polypizza';
  /** Pack page; the licence is checked on it (or in the archive's licence file) at fetch time. */
  page: string;
  licence: Licence;
  licenceUrl: string;
  attribution?: string;
  /** Regular expression for the itch.io upload name to take (default: the first one). */
  itchUpload?: string;
  /** Licence text file inside the archive, kept next to the files as LICENSE.txt. */
  licenceFile?: string;
  want: WantItem[];
}

export interface ManifestAsset {
  path: string;
  source: string;
  url: string;
  licence: Licence;
  attribution?: string;
  bytes: number;
  game?: Game;
  kind?: string;
  triangles?: number;
  /** Where the file sat in the downloaded archive, and the SHA-256 of the unprepared bytes. */
  sourcePath?: string;
  sourceSha256?: string;
  prepared?: boolean;
  /** A texture or buffer a model points at: kept only until prepare.ts has folded it in, then deleted. */
  temporary?: boolean;
  licenceUrl?: string;
}
export interface Manifest { pack: string; page: string; fetched: string; assets: ManifestAsset[] }

/** Problems with a manifest, as plain sentences (empty when it is fine). */
export function manifestProblems(m: unknown, pack = ''): string[] {
  const out: string[] = [];
  const o = m as Partial<Manifest> | null;
  if (!o || typeof o !== 'object' || !Array.isArray(o.assets)) return ['manifest has no assets list'];
  const seen = new Set<string>();
  o.assets.forEach((a, i) => {
    const at = `assets[${i}]${a && typeof a.path === 'string' ? ` (${a.path})` : ''}`;
    if (!a || typeof a !== 'object') { out.push(`${at}: not an object`); return; }
    for (const k of ['path', 'source', 'url', 'licence'] as const) if (typeof a[k] !== 'string' || !a[k]) out.push(`${at}: missing ${k}`);
    if (!Number.isInteger(a.bytes) || a.bytes < 0) out.push(`${at}: bytes must be a whole number`);
    if (typeof a.url === 'string' && !/^https:\/\//.test(a.url)) out.push(`${at}: url must be https`);
    if (typeof a.licence === 'string' && !(ALLOWED_LICENCES as readonly string[]).includes(a.licence)) out.push(`${at}: licence ${a.licence} is not allowed (CC0-1.0 or CC-BY only)`);
    if (typeof a.licence === 'string' && a.licence.startsWith('CC-BY') && !a.attribution) out.push(`${at}: CC BY needs the attribution text`);
    if (typeof a.path === 'string') {
      if (seen.has(a.path)) out.push(`${at}: listed twice`);
      seen.add(a.path);
      if (pack && !a.path.startsWith(`${PACKS_ROOT}/${pack}/`)) out.push(`${at}: path is outside ${PACKS_ROOT}/${pack}/`);
    }
  });
  return out;
}
