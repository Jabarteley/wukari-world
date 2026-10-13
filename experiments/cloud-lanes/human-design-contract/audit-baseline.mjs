// Read-only GLB JSON metadata audit. Does not decode Meshopt or claim vertex/visual validation.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = new URL('../../../', import.meta.url);
const sha = (data) => createHash('sha256').update(data).digest('hex');
const sourcePaths = [
  'src/types/avatar.ts', 'src/types/life.ts', 'src/scene/characters.ts',
  'src/scene/body/manifest.ts', 'src/scene/body/skinned.ts', 'src/scene/body/appearance.ts',
  'src/scene/body/facial.ts', 'src/scene/body/animation-pose.ts', 'src/scene/body/foot-contact.ts',
  'src/game/wardrobe/catalogue.ts', 'src/game/wardrobe/rules.ts', 'src/game/wardrobe/look.ts',
  'src/scene/wardrobe/geometry.ts', 'src/scene/wardrobe/renderer.ts',
];
export function auditBaseline() {
  const assets = ['base-body-male', 'base-body-female', 'clip-pack'].map((name) => {
    const path = `src/scene/body/assets/${name}.glb`;
    const bytes = readFileSync(new URL(path, root));
    if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2
      || bytes.readUInt32LE(8) !== bytes.length || bytes.readUInt32LE(16) !== 0x4e4f534a) {
      throw new Error(`Invalid GLB container: ${path}`);
    }
    const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
    const parents = new Map();
    (doc.nodes ?? []).forEach((node, index) => (node.children ?? []).forEach((child) => parents.set(child, index)));
    return {
      path, bytes: bytes.length, sha256: sha(bytes), extensionsRequired: doc.extensionsRequired ?? [],
      skins: (doc.skins ?? []).map((skin) => ({
        joints: skin.joints.map((index) => ({
          name: doc.nodes[index].name,
          parent: doc.nodes[parents.get(index)]?.name ?? null,
        })),
        inverseBindAccessor: skin.inverseBindMatrices,
        // Hashes the actual node transform metadata, not decompressed inverse-bind bytes.
        jointNodeMetadataSha256: sha(JSON.stringify(skin.joints.map((index) => doc.nodes[index]))),
      })),
      primitives: (doc.meshes ?? []).flatMap((mesh) => mesh.primitives.map((p) => ({
        mode: p.mode ?? 4, vertices: doc.accessors[p.attributes.POSITION]?.count,
        indexCount: doc.accessors[p.indices]?.count ?? null,
        trianglesFromMetadata: (p.mode ?? 4) === 4 ? (doc.accessors[p.indices]?.count ?? doc.accessors[p.attributes.POSITION]?.count) / 3 : null,
        attributes: Object.keys(p.attributes), morphTargetCount: p.targets?.length ?? 0,
      }))),
      animationNames: (doc.animations ?? []).map((a) => a.name),
      animationTargetNames: [...new Set((doc.animations ?? []).flatMap((a) => a.channels.map((c) => doc.nodes[c.target.node]?.name)))].sort(),
    };
  });
  return {
    baselineCommit: '81d9f599d87dfb34adf49cd9337a0b05678e5e0d',
    evidenceLevel: 'Read-only GLB JSON metadata and source SHA-256; no Meshopt decode, render, rest-matrix or deformation certification.',
    sourceHashes: Object.fromEntries(sourcePaths.map((path) => [path, sha(readFileSync(new URL(path, root)))])),
    assets,
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) process.stdout.write(`${JSON.stringify(auditBaseline(), null, 2)}\n`);
