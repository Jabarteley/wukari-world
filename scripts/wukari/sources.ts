import { createHash } from 'node:crypto';

export const SOURCE_CONFIG = {
  adm1: {
    url: 'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/NGA/ADM1/geoBoundaries-NGA-ADM1.geojson',
    bytes: 2289696, sha256: '64fa218ac3d453cc1e66412ff461c5dfa1a4a1ade0da93b239a9891b587d28f9',
  },
  adm2: {
    url: 'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/NGA/ADM2/geoBoundaries-NGA-ADM2.geojson',
    bytes: 9422551, sha256: 'bef7f2cfa45e012f4772eaa61c7b99e5188aeba4d5c6badae7e9f9aae8c02fcd',
  },
  osm: { url: 'https://overpass-api.de/api/interpreter', license: 'ODbL-1.0' },
} as const;
export function checkedBytes(bytes: Uint8Array, expected: { bytes: number; sha256: string }): void {
  if (bytes.length !== expected.bytes || createHash('sha256').update(bytes).digest('hex') !== expected.sha256) throw new Error('Source byte count or SHA-256 mismatch (Git LFS pointers are not geographic data)');
}
