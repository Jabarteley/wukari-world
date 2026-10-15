import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { housingAssetManifest, HOUSING_ASSET_TOTAL_BYTES } from './asset-manifest.ts';

interface GlbAccessor {
  readonly count: number;
  readonly min?: readonly number[];
  readonly max?: readonly number[];
}

interface GlbPrimitive {
  readonly indices?: number;
  readonly attributes: { readonly POSITION: number };
}

interface GlbDocument {
  readonly accessors: readonly GlbAccessor[];
  readonly meshes: readonly { readonly primitives: readonly GlbPrimitive[] }[];
  readonly nodes: readonly {
    readonly mesh?: number;
    readonly translation?: readonly number[];
    readonly scale?: readonly number[];
    readonly children?: readonly number[];
  }[];
  readonly extensionsUsed?: readonly string[];
}

function readGlb(name: string): GlbDocument {
  const bytes = readFileSync(new URL(`./assets/${name}`, import.meta.url));
  assert.equal(bytes.toString('latin1', 0, 4), 'glTF', `${name} has a GLB header`);
  assert.equal(bytes.readUInt32LE(4), 2, `${name} is glTF 2.0`);
  const jsonLength = bytes.readUInt32LE(12);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, `${name} begins with a JSON chunk`);
  return JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength)) as GlbDocument;
}

function geometryStats(document: GlbDocument): { triangles: number; bounds: readonly [number, number, number, number, number, number] } {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let triangles = 0;
  const parent = new Map<number, number>();
  document.nodes.forEach((node, index) => node.children?.forEach((child) => parent.set(child, index)));
  const transform = (index: number): { translation: readonly number[]; scale: readonly number[] } => {
    const node = document.nodes[index]!;
    const translation = node.translation ?? [0, 0, 0];
    const scale = node.scale ?? [1, 1, 1];
    const parentIndex = parent.get(index);
    if (parentIndex === undefined) return { translation, scale };
    const outer = transform(parentIndex);
    return {
      translation: translation.map((value, axis) => outer.translation[axis]! + outer.scale[axis]! * value),
      scale: scale.map((value, axis) => outer.scale[axis]! * value),
    };
  };
  for (const node of document.nodes) {
    if (node.mesh === undefined) continue;
    const index = document.nodes.indexOf(node);
    const { translation, scale } = transform(index);
    for (const primitive of document.meshes[node.mesh]!.primitives) {
      const positions = document.accessors[primitive.attributes.POSITION]!;
      const indices = primitive.indices === undefined ? positions : document.accessors[primitive.indices]!;
      triangles += indices.count / 3;
      assert.ok(positions.min && positions.max, 'quantized position bounds are present');
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis]!, translation[axis]! + scale[axis]! * positions.min[axis]!);
        max[axis] = Math.max(max[axis]!, translation[axis]! + scale[axis]! * positions.max[axis]!);
      }
    }
  }
  return { triangles, bounds: [min[0]!, min[1]!, min[2]!, max[0]!, max[1]!, max[2]!] };
}

test('housing subset has real compressed GLBs, matching metadata, and a finite budget', () => {
  assert.equal(housingAssetManifest.length, 12);
  assert.ok(HOUSING_ASSET_TOTAL_BYTES < 250 * 1024);
  const ids = housingAssetManifest.map((asset) => asset.id);
  assert.deepEqual(ids, [
    'two-seat-sofa', 'single-bed', 'wardrobe', 'wood-armchair', 'dining-chair', 'dining-table',
    'flat-panel-television', 'broadleaf-planter', 'knee-clearance-public-washbasin', 'display-fridge',
    'floor-lamp', 'four-burner-stove',
  ]);
  for (const asset of housingAssetManifest) {
    const name = `${asset.id}-near.glb`;
    const bytes = readFileSync(new URL(`./assets/${name}`, import.meta.url));
    assert.equal(bytes.byteLength, asset.bytes, `${name} byte metadata`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, `${name} hash metadata`);
    const document = readGlb(name);
    assert.ok(document.extensionsUsed?.includes('EXT_meshopt_compression'), `${name} uses meshopt compression`);
    const measured = geometryStats(document);
    assert.equal(measured.triangles, asset.triangles, `${name} triangle metadata`);
    // Quantized accessors expose conservative decoded bounds; the manifest records
    // the source measurements, so allow a 1 cm quantization envelope.
    measured.bounds.forEach((value, index) => assert.ok(Math.abs(value - asset.bounds[index]!) < 0.01, `${name} bounds[${index}]`));
  }
});
