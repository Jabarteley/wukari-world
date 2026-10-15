import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { housingAssetManifest, HOUSING_ASSET_TOTAL_BYTES } from './asset-manifest.ts';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { FURNITURE } from '../game/content/furniture.ts';
import { footprint } from '../game/home-layout.ts';
import { bumpsOf, stairsOn } from '../game/home-plan.ts';
import { createKit } from '../scene/kit.ts';
import { RECIPES, recipePlan } from './fixtures.ts';
import { buildHousingFurnishings } from './furnishings.ts';
import { buildHousingDoors } from './doors.ts';
import { edge, STOREY } from './shell.ts';

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


function renderedBounds(root: THREE.Object3D): THREE.Box3 {
  const result = new THREE.Box3();
  root.updateWorldMatrix(true, true);
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    for (let at: THREE.Object3D | null = object; at; at = at.parent) if (!at.visible) return;
    object.geometry.computeBoundingBox();
    if (object.geometry.boundingBox) result.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
  });
  return result;
}
const overlaps = (a: THREE.Box3, b: THREE.Box3) => !a.isEmpty() && !b.isEmpty()
  && Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x) > 0.002
  && Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y) > 0.002
  && Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z) > 0.002;

function volume(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
  return new THREE.Box3(new THREE.Vector3(Math.min(x0,x1), Math.min(y0,y1), Math.min(z0,z1)),
    new THREE.Vector3(Math.max(x0,x1), Math.max(y0,y1), Math.max(z0,z1)));
}

test('real loaded furniture, fixtures and open door leaves occupy separate usable spaces', async () => {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  for (const recipe of RECIPES) {
    const kit = createKit(), plan = recipePlan(recipe);
    const furnishings = buildHousingFurnishings(kit, recipe, () => {}, async entry => {
      const bytes = readFileSync(new URL(entry.url));
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      return (await loader.parseAsync(buffer, '')).scene;
    });
    const doors = buildHousingDoors(kit, recipe);
    try {
      await furnishings.ready;
      assert.deepEqual(furnishings.failures, [], `${recipe.id}: actual GLBs must load`);
      assert.ok(furnishings.loaded > 0);
      for (let floor = 0; floor < plan.floors.length; floor++) {
        furnishings.visible(floor, true); doors.visible(floor, true);
        const items = recipe.items.filter(item => (item.floor ?? 0) === floor).flatMap(item => {
          const def = FURNITURE[item.itemId];
          if (!def || def.wall || def.shape === 'rug' || def.shape === 'mat') return [];
          const object = furnishings.group.getObjectByName(`housing-item-${item.id}`);
          assert.ok(object, `${recipe.id}/${item.id}: rendered mount`);
          const bounds = renderedBounds(object), size = footprint(def, item.rot);
          assert.ok(bounds.min.x >= edge(item.x, recipe.grid) - 0.001 && bounds.max.x <= edge(item.x + size.w, recipe.grid) + 0.001
            && bounds.min.z >= edge(item.y, recipe.grid) - 0.001 && bounds.max.z <= edge(item.y + size.h, recipe.grid) + 0.001,
          `${recipe.id}/${item.id}: visible geometry escapes its footprint`);
          return [{ id: item.id, bounds }];
        });
        for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++)
          assert.ok(!overlaps(items[a]!.bounds, items[b]!.bounds), `${recipe.id}: ${items[a]!.id} intersects ${items[b]!.id}`);
        const walls = bumpsOf(plan, floor).map(wall => volume(
          edge(wall.x0, recipe.grid) - 0.06, floor * STOREY, edge(wall.y0, recipe.grid) - 0.06,
          edge(wall.x1, recipe.grid) + 0.06, (floor + 1) * STOREY, edge(wall.y1, recipe.grid) + 0.06));
        const stairs = stairsOn(plan, floor).map(stair => volume(edge(stair.x, recipe.grid), floor * STOREY, edge(stair.y, recipe.grid),
          edge(stair.x + stair.w, recipe.grid), (floor + 1) * STOREY, edge(stair.y + stair.h, recipe.grid)));
        const leafGroups = doors.group.children[floor]!.children.filter(child => child instanceof THREE.Group);
        for (const item of items) {
          assert.ok(walls.every(wall => !overlaps(item.bounds, wall)), `${recipe.id}/${item.id}: intersects a room wall or stair rail`);
          assert.ok(stairs.every(stair => !overlaps(item.bounds, stair)), `${recipe.id}/${item.id}: intersects the reserved stairwell`);
          for (const leaf of leafGroups) assert.ok(!overlaps(item.bounds, renderedBounds(leaf)),
            `${recipe.id}/${item.id}: intersects open door ${String(leaf.userData.doorId ?? leaf.name)}`);
          for (const solid of doors.solids(floor)) assert.ok(!overlaps(item.bounds, volume(solid[0]!, solid[1]!, solid[2]!, solid[3]!, solid[4]!, solid[5]!)),
            `${recipe.id}/${item.id}: intersects a door leaf or filled doorway wall`);
        }
        for (const door of doors.doors.filter(door => door.floor === floor)) {
          let closed = false;
          for (let step = 0; step < 24 && !closed; step++) {
            const angle = step * Math.PI / 12, x = door.x + Math.cos(angle) * 1.85, z = door.z + Math.sin(angle) * 1.85;
            if (doors.nearest(x, z, floor)?.id === door.id) closed = doors.toggleNearest(x, z, floor);
          }
          assert.ok(closed && !door.open, `${recipe.id}/${door.id}: close from clear space`);
        }
        for (const item of items) for (const leaf of leafGroups) assert.ok(!overlaps(item.bounds, renderedBounds(leaf)),
          `${recipe.id}/${item.id}: intersects closed door ${String(leaf.userData.doorId)}`);
        for (let a = 0; a < leafGroups.length; a++) for (let b = a + 1; b < leafGroups.length; b++)
          assert.ok(!overlaps(renderedBounds(leafGroups[a]!), renderedBounds(leafGroups[b]!)), `${recipe.id}: closed door leaves intersect`);
      }
    } finally { doors.dispose(); furnishings.dispose(); kit.dispose(); await new Promise(resolve => setTimeout(resolve, 0)); }
  }
});
