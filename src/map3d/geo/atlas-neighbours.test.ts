// Every open country is drawn open at every atlas level that draws it: the world's flat land, each continent's plates,
// and the neighbours the Nigeria level draws itself around the states (they were once a fixed grey, whatever their status).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { WORLD } from './data/world.ts';
import { AROUND } from './data/nigeria.ts';
import { decodeTopology } from './topo.ts';
import { ATLAS_INK, countryInk, createAtlas } from './atlas.ts';
import { ATLAS_LEVELS, regionEntry } from '../regions.ts';

const NIGERIA_NEIGHBOURS = ['ne', 'bj', 'td', 'cm', 'bf', 'gh', 'tg', 'gq', 'ga', 'cf', 'st'];

/** Each level's country features, and whether that level draws them flat (as the world's land) or as raised plates. */
async function levelCountries() {
  const out: { level: string; flat: boolean; features: { id: string; index: number; k?: string; sub?: never }[] }[] = [];
  for (const level of ATLAS_LEVELS) {
    const module = await level.data() as Record<string, unknown>;
    if (level.id === 'world') out.push({ level: level.id, flat: true, features: decodeTopology(WORLD).features });
    else if (level.id === 'nigeria') out.push({ level: `${level.id} (around)`, flat: true, features: decodeTopology(module.AROUND as typeof AROUND).features });
    else out.push({ level: level.id, flat: false, features: decodeTopology((module.AFRICA ?? module.WORLD) as typeof WORLD).features as never });
  }
  return out;
}

test('every world country that regionEntry calls open is drawn with the open ink at every level that draws it, tint on or off', async () => {
  const levels = await levelCountries();
  const drawnAt = new Map<string, string[]>();
  for (const { level, flat, features } of levels) {
    for (const feature of features) {
      if (regionEntry('country', feature.id).status !== 'open') continue;
      for (const tint of [false, true]) assert.equal(countryInk('open', feature, flat, tint), ATLAS_INK.openCountry, `${feature.id} at ${level} (tint ${tint})`);
      drawnAt.set(feature.id, [...(drawnAt.get(feature.id) ?? []), level]);
    }
  }
  assert.ok(drawnAt.size >= 195, `all open countries were checked (${drawnAt.size})`);
  // Every open country in world.ts is drawn by at least the world level and was checked there.
  for (const feature of decodeTopology(WORLD).features) {
    if (regionEntry('country', feature.id).status === 'open') assert.ok(drawnAt.get(feature.id)?.includes('world'), `${feature.id} is checked at the world level`);
  }
});

test('the Nigeria level draws every neighbour, and each open one in the open ink', async () => {
  const around = decodeTopology(AROUND).features;
  assert.deepEqual(new Set(NIGERIA_NEIGHBOURS.filter(id => around.some(feature => feature.id === id))), new Set(NIGERIA_NEIGHBOURS));
  for (const id of NIGERIA_NEIGHBOURS) {
    const status = regionEntry('country', id).status;
    assert.equal(status, 'open', `${id} is open`);
    assert.equal(countryInk(status, around.find(feature => feature.id === id)!, true), ATLAS_INK.openCountry, `${id} is drawn open around Nigeria`);
  }
  // A neighbour that is not open stays grey: the rule follows status, not the level.
  assert.notEqual(countryInk('soon', { index: 0 }, true), ATLAS_INK.openCountry);
  assert.notEqual(countryInk(null, { index: 0 }, true), ATLAS_INK.openCountry);
});

test('in the drawn Nigeria level the neighbours’ land is painted the open green, matching the world land it meets', async () => {
  let scene: THREE.Scene | null = null;
  const queue: (() => void)[] = [];
  let clock = 1000;
  const renderer = { domElement: {} as HTMLCanvasElement, info: { render: {} }, setPixelRatio() {}, setSize() {}, setClearColor() {}, dispose() {}, render(drawn: THREE.Scene) { scene = drawn; } };
  const container = { hidden: false, getBoundingClientRect: () => ({ left: 0, top: 0, right: 1280, bottom: 800, width: 1280, height: 800 }) };
  const atlas = createAtlas(container as unknown as HTMLElement, { renderer, reducedMotion: true, load: (id) => ATLAS_LEVELS.find(level => level.id === id)!.data(), raf: (fn) => { queue.push(fn); return queue.length; }, caf: () => { queue.length = 0; }, now: () => clock, tabHidden: () => false });
  try {
    await atlas.ready; atlas.resize();
    for (let i = 0; i < 6; i++) { await new Promise(done => setTimeout(done, 2)); let frames = 0; while (queue.length && frames++ < 2000) { clock += 16; queue.shift()!(); } }
    assert.equal(atlas.diagnostics().levelId, 'nigeria');
    assert.ok(scene, 'the atlas drew a frame');
    // The neighbours' land is the one flat plate mesh lying wholly at the "around" height.
    const flatAt = (mesh: THREE.Mesh, y: number) => { const position = mesh.geometry.getAttribute('position'); for (let i = 0; i < position.count; i++) if (Math.abs(position.getY(i) - y) > 1e-6) return false; return position.count > 0; };
    const lands = (scene as THREE.Scene).children.filter((object): object is THREE.Mesh => object instanceof THREE.Mesh && object.visible && object.material instanceof THREE.MeshBasicMaterial && Boolean(object.geometry.getAttribute('color')) && flatAt(object, 0.02));
    assert.equal(lands.length, 1, 'one neighbours mesh');
    const colour = lands[0]!.geometry.getAttribute('color'), green = new THREE.Color(ATLAS_INK.openCountry);
    for (let i = 0; i < colour.count; i++) {
      assert.ok(Math.abs(colour.getX(i) - green.r) < 1e-4 && Math.abs(colour.getY(i) - green.g) < 1e-4 && Math.abs(colour.getZ(i) - green.b) < 1e-4, `vertex ${i} of the neighbours is the open green`);
    }
  } finally { atlas.destroy(); }
});
