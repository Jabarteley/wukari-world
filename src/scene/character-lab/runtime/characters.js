// @ts-nocheck -- Vendored lab runtime; typed integration boundary is foreground-characters.d.mts.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { createFootPlanting } from './foot-planting.js';
import { createKneeAlignment } from './knee-alignment.js';
import { retargetBodyMotion } from './rig-motion.js';
import { retargetBodyMotionWorld } from './rig-motion-world.js';
import { createSeatedDrape, bindSeatedCorrectives } from './seated-drape.js';
import { bindGaitCorrectives } from './gait-cloth.js';
import { createActionSupport } from './action-support.js';
import { createSeatedContact } from './seated-contact.js';

const clamp = (v, lo, hi, fallback = 0) => Math.min(hi, Math.max(lo, Number.isFinite(Number(v)) ? Number(v) : fallback));
const validColor = value => /^#[0-9a-f]{6}$/i.test(value || '');
const materialList = mesh => Array.isArray(mesh.material) ? mesh.material : [mesh.material];
const meshesIn = root => { const result = []; root.traverse(node => { if (node.isMesh) result.push(node); }); return result; };
const paletteDefaults = { skin: '#ffffff', hair: '#ffffff', upper: '#ffffff', lower: '#ffffff', shoes: '#ffffff' };
const recordOrEmpty = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
export const EMOTIONS = {
  neutral: {}, happy: { Smile: .65, BrowUpLeft: .12, BrowUpRight: .12 },
  sad: { Frown: .5, BrowUpLeft: .22, BrowUpRight: .22 },
  angry: { BrowDownLeft: .55, BrowDownRight: .55, Compress: .3 },
  surprised: { EyeOpenLeft: .45, EyeOpenRight: .45, BrowUpLeft: .55, BrowUpRight: .55, MouthOpen: .35 },
  relaxed: { BlinkLeft: .18, BlinkRight: .18, Smile: .18 },
  concerned: { BrowUpLeft: .35, BrowDownRight: .2, Frown: .2 }
};
export const HAND_POSES = ['relaxed', 'open', 'fist', 'point', 'peace'];

export function appearancePresetPatch(catalog, appearance, preset, group) {
  const supplied = recordOrEmpty(preset?.features);
  const features = { ...recordOrEmpty(appearance?.features) };
  for (const feature of catalog.features || []) {
    if (feature.group === group) features[feature.id] = clamp(supplied[feature.id], feature.min ?? -1, feature.max ?? 1);
  }
  return { features };
}

export function appearanceMorphValues(catalog, features) {
  const result = { ...features };
  for (const driver of catalog.features || []) {
    const strength = Math.max(0, features[driver.id] || 0);
    for (const [id, weight] of Object.entries(driver.drives || {})) {
      const target = catalog.features.find(feature => feature.id === id);
      if (target) result[id] = clamp((result[id] || 0) + strength * weight, target.min ?? -1, target.max ?? 1);
    }
  }
  return result;
}

export function normalizeAppearance(catalog, value = {}) {
  value = recordOrEmpty(value);
  const defaults = catalog.defaults || {};
  const choose = (list, requested, fallback) => list.some(item => item.id === requested) ? requested : fallback || list[0]?.id;
  const garmentIds = new Set(catalog.garments.map(item => item.id));
  let garments = Array.isArray(value.garments) ? [...new Set(value.garments)].filter(id => garmentIds.has(id)) : defaults.garments;
  if (!garments?.length) garments = defaults.garments || [catalog.garments[0]?.id].filter(Boolean);
  const onepiece = garments.find(id => catalog.garments.find(g => g.id === id)?.slot === 'onepiece');
  if (onepiece) garments = [onepiece];
  const features = {};
  for (const item of catalog.features || []) features[item.id] = clamp(value.features?.[item.id], item.min ?? -1, item.max ?? 1);
  return {
    version: 2,
    body: choose(catalog.bodies || [{id:'female'}], value.body, defaults.body || 'female'),
    hair: choose(catalog.hair, value.hair, defaults.hair), garments,
    shoes: choose(catalog.shoes, value.shoes, defaults.shoes),
    eyeColor: choose(catalog.eyeColors, value.eyeColor, defaults.eyeColor),
    complexion: ['deep', 'medium', 'light'].includes(value.complexion) ? value.complexion : 'deep',
    height: clamp(value.height, .85, 1.15, 1), features,
    colors: Object.fromEntries(Object.entries(paletteDefaults).map(([key, fallback]) => [key, validColor(value.colors?.[key]) ? value.colors[key] : fallback])),
    handPose: HAND_POSES.includes(value.handPose) ? value.handPose : 'relaxed'
  };
}

function mergeLook(previous, patch) {
  patch = recordOrEmpty(patch);
  return { ...previous, ...patch, features: { ...previous.features, ...recordOrEmpty(patch.features) }, colors: { ...previous.colors, ...recordOrEmpty(patch.colors) } };
}

export function advanceLocomotionState(previous = {}, input = {}) {
  const dt = clamp(input.dt, 0, .1);
  const speed = Math.max(0, Number.isFinite(Number(input.speed)) ? Number(input.speed) : 0);
  const walkDuration = Math.max(.001, Number(input.walkDuration) || 1);
  const runDuration = Math.max(.001, Number(input.runDuration) || 1);
  const walkSpeed = Math.max(.001, Number(input.walkSpeed) || 1.25);
  const runSpeed = Math.max(.001, Number(input.runSpeed) || 2.4);
  const runBlend = THREE.MathUtils.damp(clamp(previous.runBlend, 0, 1), input.gait === 'run' ? 1 : 0, 9, dt);
  const moving = THREE.MathUtils.damp(clamp(previous.moving, 0, 1), clamp(speed / .12, 0, 1), speed > 0 ? 12 : 9, dt);
  const blendedDistancePerCycle = THREE.MathUtils.lerp(walkSpeed * walkDuration, runSpeed * runDuration, runBlend);
  const cyclesPerSecond = speed / blendedDistancePerCycle;
  const phase = ((clamp(previous.phase, 0, 1) + cyclesPerSecond * dt) % 1 + 1) % 1;
  return {
    phase, moving, runBlend, cyclesPerSecond,
    walkTime: phase * walkDuration,
    runTime: phase * runDuration,
    weights: { idle: 1 - moving, walk: moving * (1 - runBlend), run: moving * runBlend }
  };
}

export function footwearOcclusionIndices(positionSource, indexSource) {
  const positions = positionSource.array || positionSource;
  const indices = indexSource.array || indexSource;
  const vertexCount = Math.floor(positions.length / 3);
  const parent = Uint32Array.from({ length: vertexCount }, (_, index) => index);
  const find = index => { while (parent[index] !== index) { parent[index] = parent[parent[index]]; index = parent[index]; } return index; };
  const join = (left, right) => { left = find(left); right = find(right); if (left !== right) parent[right] = left; };
  for (let offset = 0; offset < indices.length; offset += 3) {
    join(indices[offset], indices[offset + 1]); join(indices[offset + 1], indices[offset + 2]);
  }
  const components = new Map();
  for (const vertexIndex of new Set(indices)) {
    const root = find(vertexIndex), x = positions[vertexIndex * 3], y = positions[vertexIndex * 3 + 1], z = positions[vertexIndex * 3 + 2];
    const bounds = components.get(root) || { minY: Infinity, maxY: -Infinity, maxZ: -Infinity };
    bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y); bounds.maxZ = Math.max(bounds.maxZ, z); components.set(root, bounds);
  }
  const hidden = new Set([...components].filter(([, bounds]) => bounds.minY >= .035 && bounds.maxY >= .20 && bounds.maxZ <= .12).map(([root]) => root));
  const kept = []; let hiddenTriangles = 0;
  for (let offset = 0; offset < indices.length; offset += 3) {
    if (hidden.has(find(indices[offset]))) hiddenTriangles++;
    else kept.push(indices[offset], indices[offset + 1], indices[offset + 2]);
  }
  return { indices: kept, hiddenTriangles, hiddenComponents: hidden.size };
}

function gaitContacts(metadata, clipName, phase) {
  const clip = metadata.clips?.[clipName];
  const frame = phase * (clip?.end_frame || 0);
  return Object.fromEntries(['L', 'R'].map(side => [side, Boolean(clip?.contact_windows?.[side]?.contact_windows?.some(([start, end]) => frame >= start && frame <= end))]));
}
function estimateScene(root) {
  const geometry = new Set(), textures = new Set(); let geometryBytes = 0, textureBytes = 0;
  for (const mesh of meshesIn(root)) {
    if (!geometry.has(mesh.geometry)) {
      geometry.add(mesh.geometry);
      const buffers = new Set();
      for (const attribute of [...Object.values(mesh.geometry.attributes), ...Object.values(mesh.geometry.morphAttributes).flat(), mesh.geometry.index].filter(Boolean)) {
        const array = attribute.array || attribute.data?.array;
        if (array && !buffers.has(array.buffer)) { geometryBytes += array.byteLength; buffers.add(array.buffer); }
      }
    }
    for (const material of materialList(mesh)) for (const value of Object.values(material)) if (value?.isTexture && !textures.has(value)) {
      textures.add(value); textureBytes += (value.image?.width || 0) * (value.image?.height || 0) * 4 * 4 / 3;
    }
  }
  return { geometryBytes, textureBytes, decodedBytes: geometryBytes + textureBytes };
}

class AssetStore {
  constructor() { this.loader = new GLTFLoader(); this.entries = new Map(); this.textures = new Map(); this.readyTextures = new Map(); this.bytes = 0; }
  async acquire(url) {
    let entry = this.entries.get(url);
    if (!entry) {
      entry = { refs: 0, used: performance.now(), bytes: 0, value: null };
      entry.promise = fetch(url).then(response => { if (!response.ok) throw new Error(`Asset unavailable: ${url}`); return response.arrayBuffer(); }).then(async bytes => {
        entry.bytes = bytes.byteLength; this.bytes += bytes.byteLength;
        const gltf = await this.loader.parseAsync(bytes, new URL('.', new URL(url, location.href)).href);
        entry.value = gltf; entry.memory = estimateScene(gltf.scene); return gltf;
      }).catch(error => { if (this.entries.get(url) === entry) this.entries.delete(url); throw error; });
      this.entries.set(url, entry);
    }
    entry.refs++; entry.used = performance.now();
    try { return await entry.promise; } catch (error) { entry.refs--; throw error; }
  }
  acquireSync(url) {
    const entry = this.entries.get(url);
    if (!entry?.value) throw new Error(`Native character asset is not ready: ${url}`);
    entry.refs++; entry.used = performance.now(); return entry.value;
  }
  textureSync(url) {
    if (!this.readyTextures.has(url)) throw new Error(`Native character texture is not ready: ${url}`);
    return this.readyTextures.get(url);
  }
  release(url) { const entry = this.entries.get(url); if (entry) { entry.refs = Math.max(0, entry.refs - 1); entry.used = performance.now(); } this.evict(); }
  evict() {
    const unused = [...this.entries.entries()].filter(([, entry]) => entry.refs === 0 && entry.value).sort((a, b) => a[1].used - b[1].used);
    let bytes = [...this.entries.values()].reduce((sum, entry) => sum + (entry.memory?.decodedBytes || 0), 0);
    while (unused.length > 3 || bytes > 80 * 1048576 && unused.length) {
      const [url, entry] = unused.shift();
      const geometries = new Set(), materials = new Set(), textures = new Set();
      for (const mesh of meshesIn(entry.value.scene)) { geometries.add(mesh.geometry); for (const material of materialList(mesh)) { materials.add(material); for (const value of Object.values(material)) if (value?.isTexture) textures.add(value); } }
      for (const value of [...geometries, ...materials, ...textures]) { if (value.isTexture) neutralMaps.get(value)?.forEach(texture => texture.dispose()); value.dispose(); }
      bytes -= entry.memory.decodedBytes; this.entries.delete(url);
    }
  }
  async texture(url) {
    if (!this.textures.has(url)) this.textures.set(url, new THREE.TextureLoader().loadAsync(url).then(texture => { texture.colorSpace = THREE.SRGBColorSpace; texture.flipY = false; texture.anisotropy = 2; this.readyTextures.set(url, texture); return texture; }).catch(error => { this.textures.delete(url); throw error; }));
    return this.textures.get(url);
  }
  stats() { return { loadedBytes: this.bytes, cachedAssets: this.entries.size, leasedAssets: [...this.entries.values()].filter(e => e.refs > 0).length, estimatedDecodedBytes: [...this.entries.values()].reduce((sum, e) => sum + (e.memory?.decodedBytes || 0), 0) }; }
}

// Swatches describe albedo, not a multiplier on an already coloured photograph.
const neutralMaps = new WeakMap();
const linearChannel = value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
const srgbChannel = value => value <= .0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - .055;
const LINEAR_BYTE = Float64Array.from({ length: 256 }, (_, byte) => linearChannel(byte / 255));
// SLICES. A step that yields ['slice'] lets a sliced spawn (spawnSliced, used to bake background people) wait for the next frame
// there. driveSync and driveAsync go straight on, so every other caller runs exactly as before.
const SLICE = Object.freeze(['slice']);
// A sliced recolour reads and writes its texture in bands of rows; one band holds the whole image otherwise. Every pixel gets the
// same bytes either way: the reference samples the same pixels (every 16th of the whole image) and each output byte depends only
// on its input byte.
const RECOLOR_BAND_PIXELS = 1 << 17;
function recoloredTexture(original, swatch) {
  const steps = recolorSteps(original, swatch, false);
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}
function* recolorSteps(original, swatch, sliced) {
  if (!original?.image) return original;
  let variants = neutralMaps.get(original);
  if (!variants) { variants = new Map(); neutralMaps.set(original, variants); }
  if (variants.has(swatch)) return variants.get(swatch);
  const canvas = document.createElement('canvas'); canvas.width = original.image.width; canvas.height = original.image.height;
  const context = canvas.getContext('2d'); context.drawImage(original.image, 0, 0);
  const width = canvas.width, height = canvas.height, rows = sliced ? Math.max(1, Math.floor(RECOLOR_BAND_PIXELS / Math.max(1, width))) : height;
  const bands = [];
  // Per-channel histograms of every 16th pixel stand in for the sorted sample lists: the median byte is the same.
  // Exclude transparent padding and near-black/white atlas background from the reference.
  const channels = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)], opaqueChannels = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  let sampled = 0, opaque = 0;
  for (let top = 0; top < height; top += rows) {
    if (sliced) yield SLICE;
    const pixels = context.getImageData(0, top, width, Math.min(rows, height - top)), data = pixels.data;
    bands.push([top, pixels]);
    // Every 16th pixel of the whole image, counted from its first pixel.
    for (let i = ((16 - (top * width) % 16) % 16) * 4; i < data.length; i += 64) {
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
      const luma = .2126 * r + .7152 * g + .0722 * b;
      if (data[i + 3] < 128 || luma < .035) continue;
      opaqueChannels[0][data[i]]++; opaqueChannels[1][data[i + 1]]++; opaqueChannels[2][data[i + 2]]++; opaque++;
      if (luma > .94) continue;
      channels[0][data[i]]++; channels[1][data[i + 1]]++; channels[2][data[i + 2]]++; sampled++;
    }
  }
  const reference = channels.map((counts, channel) => {
    const histogram = sampled ? counts : opaqueChannels[channel], count = sampled || opaque;
    if (!count) return linearChannel(.5);
    let rank = Math.floor(count * .5), byte = 0;
    while (rank >= histogram[byte]) rank -= histogram[byte++];
    return LINEAR_BYTE[byte];
  });
  // Each output byte depends only on its channel and input byte: one 256-entry table per channel, same arithmetic as per pixel.
  const target = new THREE.Color(swatch).toArray();
  const tables = [0, 1, 2].map(c => Uint8ClampedArray.from(LINEAR_BYTE, linear => Math.round(255 * srgbChannel(Math.min(1, Math.max(0, target[c] * (linear / Math.max(.002, reference[c]))))))));
  const [red, green, blue] = tables;
  for (const [top, pixels] of bands) {
    if (sliced) yield SLICE;
    const data = pixels.data;
    for (let i = 0; i < data.length; i += 4) { data[i] = red[data[i]]; data[i + 1] = green[data[i + 1]]; data[i + 2] = blue[data[i + 2]]; }
    context.putImageData(pixels, 0, top);
  }
  // Another body may have made the same variant while this one waited between slices: keep one texture per variant.
  if (variants.has(swatch)) return variants.get(swatch);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = original.flipY; texture.wrapS = original.wrapS; texture.wrapT = original.wrapT;
  texture.repeat.copy(original.repeat); texture.offset.copy(original.offset); texture.rotation = original.rotation;
  texture.anisotropy = original.anisotropy;
  variants.set(swatch, texture); return texture;
}

const eyeCorrections = new WeakMap();
function naturalEyeTexture(original, id) {
  if (!original?.image || !['brown', 'brown-light'].includes(id)) return original;
  if (eyeCorrections.has(original)) return eyeCorrections.get(original);
  const canvas = document.createElement('canvas'); canvas.width = original.image.width; canvas.height = original.image.height;
  const context = canvas.getContext('2d'); context.drawImage(original.image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const r = pixels.data[i], g = pixels.data[i + 1], b = pixels.data[i + 2];
    if (r > g * 1.3 && r > b * 1.3 && g < 135) {
      const luminance = .2126 * r + .7152 * g + .0722 * b;
      pixels.data[i] = Math.min(255, luminance * 1.35); pixels.data[i + 1] = Math.min(255, luminance * .95); pixels.data[i + 2] = Math.min(255, luminance * .55);
    }
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.flipY = original.flipY; texture.anisotropy = 2;
  eyeCorrections.set(original, texture); return texture;
}

function roleOf(material) {
  const name = material.name.toLowerCase();
  if (/skin|body/.test(name)) return 'skin';
  if (/eye/.test(name)) return 'eyes';
  if (/hair/.test(name)) return 'hair';
  if (/upper|shirt|top/.test(name)) return 'upper';
  if (/lower|pant|trouser/.test(name)) return 'lower';
  if (/shoe/.test(name)) return 'shoes';
  return null;
}
function privateMaterials(root) {
  for (const mesh of meshesIn(root)) {
    const materials = materialList(mesh).map(source => { const material = source.clone(); material.userData.originalMap = source.map; material.userData.originalColor = source.color.clone(); return material; });
    mesh.material = Array.isArray(mesh.material) ? materials : materials[0]; mesh.castShadow = true; mesh.receiveShadow = true;
  }
}
function disposePrivate(root) { for (const mesh of meshesIn(root)) { for (const material of materialList(mesh)) material.dispose(); if (mesh.userData.privateIndex) mesh.geometry.dispose(); } }
function isolateIndex(mesh) {
  const original = mesh.geometry, geometry = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(original.attributes)) geometry.setAttribute(name, attribute);
  geometry.morphAttributes = original.morphAttributes; geometry.morphTargetsRelative = original.morphTargetsRelative;
  geometry.setIndex(original.index); geometry.groups = original.groups.map(group => ({ ...group }));
  geometry.boundingBox = original.boundingBox?.clone() || null; geometry.boundingSphere = original.boundingSphere?.clone() || null;
  mesh.geometry = geometry; mesh.userData.privateIndex = true; mesh.userData.fullIndex = original.index;
}

export async function createCharacterSystem({ scene, catalogUrl = '/models/catalog.json', animationUrl = '/models/animations.glb', motionMetadataUrl = '/motion-report.json', groundHeight, footPlantingEnabled = true, kneeAlignmentEnabled = false, kneeAlignmentOptions = {}, footPlantingOptions = {}, motionTransfer = 'local', groundClamp = false, seatedContactEnabled = false }) {
  const response = await fetch(catalogUrl); if (!response.ok) throw new Error('Character catalogue is unavailable.');
  const catalog = await response.json();
  if (catalog.schemaVersion !== 2 || !catalog.base?.url || !catalog.garments?.length) throw new Error('Character catalogue is incompatible.');
  const store = new AssetStore(), actors = new Map();
  const animationAsset = await store.acquire(animationUrl);
  const motionResponse = await fetch(motionMetadataUrl);
  const motionMetadata = motionResponse.ok ? await motionResponse.json() : {};
  const clips = animationAsset.animations;
  const bodyMotions=new Map();

  function resolvedItem(item, body) {
    if (!item) return item;
    const category=catalog.hair.some(candidate=>candidate.id===item.id)?'hair':catalog.shoes.some(candidate=>candidate.id===item.id)?'shoes':'garments';
    const descriptor=catalog.bodies?.find(candidate=>candidate.id===body)||catalog.base;
    const variant=descriptor.variants?.[category]?.[item.id], fitted=item.bodyVariants?.[body];
    item={...item,...(fitted&&typeof fitted==='object'?fitted:{})};
    if(variant)item={...item,...(typeof variant==='string'?{url:variant}:variant)};
    const mask=item.hideBodyVerticesByBody?.[body];
    return Array.isArray(mask)?{...item,hideBodyVertices:mask}:item;
  }
  function requests(appearance) {
    const look=normalizeAppearance(catalog,appearance), body=catalog.bodies?.find(item=>item.id===look.body)||catalog.base;
    const descriptors=[catalog.hair.find(item=>item.id===look.hair),...look.garments.map(id=>catalog.garments.find(item=>item.id===id)),catalog.shoes.find(item=>item.id===look.shoes)];
    return [...new Set([body.url,...descriptors.map(item=>resolvedItem(item,look.body)?.url)].filter(Boolean))].map(url=>['asset',url]).concat([
      look.complexion==='deep'?null:['texture',body.complexions?.[look.complexion]||`/models/skin-${look.complexion}.jpg`],
      catalog.eyeColors.find(item=>item.id===look.eyeColor)?.url?['texture',catalog.eyeColors.find(item=>item.id===look.eyeColor).url]:null
    ].filter(Boolean));
  }
  async function preload(appearances) {
    // Leases pin only the requested set until the caller constructs its actors.
    const unique=new Map(appearances.flatMap(requests).map(request=>[request.join(':'),request]));
    const leased=[];
    try { await Promise.all([...unique.values()].map(async ([kind,url])=>{
      if(kind==='texture')return store.texture(url);
      await store.acquire(url);leased.push(url);
    })); } catch(error) { leased.forEach(url=>store.release(url));throw error; }
    return ()=>leased.forEach(url=>store.release(url));
  }
  function driveSync(iterator) {
    let step=iterator.next();
    while(!step.done) { if(step.value===SLICE){step=iterator.next();continue;} try { const [kind,url]=step.value;step=iterator.next(kind==='asset'?store.acquireSync(url):store.textureSync(url)); } catch(error) { step=iterator.throw(error); } }
    return step.value;
  }
  async function driveAsync(iterator) {
    let step=iterator.next();
    while(!step.done) { if(step.value===SLICE){step=iterator.next();continue;} try { const [kind,url]=step.value;step=iterator.next(await(kind==='asset'?store.acquire(url):store.texture(url))); } catch(error) { step=iterator.throw(error); } }
    return step.value;
  }
  // driveSync (or, with load, driveAsync) that also waits at each slice point while pause() returns a promise.
  async function driveSliced(iterator, pause, load) {
    let step=iterator.next();
    while(!step.done) {
      if(step.value===SLICE){ const wait=pause?.(); if(wait) await wait; step=iterator.next(); continue; }
      try { const [kind,url]=step.value;step=iterator.next(load?await(kind==='asset'?store.acquire(url):store.texture(url)):kind==='asset'?store.acquireSync(url):store.textureSync(url)); } catch(error) { step=iterator.throw(error); }
    }
    return step.value;
  }
  const systemGroundHeight = groundHeight;
  function* spawnSteps({ id, appearance = {}, position = [0, 0, 0], groundHeight = systemGroundHeight }, sliced = false) {
    if (actors.has(id)) throw new Error(`Character already exists: ${id}`);
    let look = normalizeAppearance(catalog, appearance), desiredLook = look, equipped = [], revision = 0, disposed = false;
    const bodyDescriptor = body => catalog.bodies?.find(item=>item.id===body) || catalog.base;
    let baseUrl = bodyDescriptor(look.body).url;
    function prepareBody(template) {
      const model=cloneSkeleton(template.scene), bones=new Map(); privateMaterials(model);
      model.traverse(node=>{if(node.isBone)bones.set(node.name,node);});
      for(const mesh of meshesIn(model)) if(materialList(mesh).some(mat=>roleOf(mat)==='skin'))isolateIndex(mesh);
      return {model,bones};
    }
    const template = yield ['asset',baseUrl];
    let {model,bones}=prepareBody(template);
    yield SLICE;
    const root = new THREE.Group(); root.name = id; root.position.fromArray(position); root.visible = false; root.add(model); scene.add(root);
    let applySeatedMorphs = () => {}, applyGaitMorphs = () => {};
    let planting, kneeAlignment, actionSupport, seatedContact, seatedDrape, mixer, mixedPose, actions, idle, walk, run, fingerRest, strideScale=1, eyeHeight=1.71, faceOffset=new THREE.Vector3();
    function setupRig() {
      kneeAlignment=kneeAlignmentEnabled ? createKneeAlignment({...kneeAlignmentOptions,root,bones,footRelative:kneeAlignmentEnabled==='foot'}) : null;
      planting=createFootPlanting({...footPlantingOptions,root,bones,groundHeight,walkSupport:motionMetadata.clips?.Walk_InPlace?.planting_support,getKneePole:kneeAlignment?.getPole,groundClamp});
      actionSupport=motionMetadata.clips?.StandUp ? createActionSupport({root,bones,groundHeight,supportWindows:motionMetadata.clips.StandUp.contact_windows,stepWindows:motionMetadata.clips.StandUp.step_windows}) : null;
      seatedContact=seatedContactEnabled ? createSeatedContact({root,bones,groundHeight}) : null;
      seatedDrape=createSeatedDrape(root,bones);
      model.updateWorldMatrix(true,true);
      const eyes=meshesIn(model).filter(mesh=>materialList(mesh).some(material=>roleOf(material)==='eyes'));
      if(eyes.length){
        const center=eyes.reduce((sum,mesh)=>{mesh.geometry.computeBoundingBox();return sum.add(mesh.localToWorld(mesh.geometry.boundingBox.getCenter(new THREE.Vector3())));},new THREE.Vector3()).multiplyScalar(1/eyes.length);
        eyeHeight=root.worldToLocal(center.clone()).y;
        center.y-=.025*root.scale.y;
        faceOffset=bones.get('head').worldToLocal(center);
      }
      if(!bodyMotions.has(baseUrl))bodyMotions.set(baseUrl,(motionTransfer==='world'?retargetBodyMotionWorld:retargetBodyMotion)(clips,animationAsset.scene,bones));
      const transferred=bodyMotions.get(baseUrl);strideScale=transferred.strideScale;
      mixer=new THREE.AnimationMixer(root);actions=new Map(transferred.clips.map(clip=>[clip.name,mixer.clipAction(clip)]));
      idle=actions.get('Idle_Breathe');walk=actions.get('Walk_InPlace');run=actions.get('Run_InPlace');
      mixedPose=[...bones.values()].map(bone=>({bone,position:bone.position.clone(),quaternion:bone.quaternion.clone(),scale:bone.scale.clone()}));
      for(const action of [idle,walk,run].filter(Boolean))action.play().setEffectiveWeight(0);
      fingerRest=new Map([...bones].filter(([name])=>/^(index|middle|ring|pinky|thumb)_/.test(name)).map(([name,bone])=>[name,bone.quaternion.clone()]));
    }
    setupRig();
    yield SLICE;
    let rendered = true, ready = false;
    let motion = { speed: 0, gait: 'walk' }, activity = null, fading = null, actionBlend = 0, emotion = 'neutral', emotionStrength = .7, elapsed = 0;
    let locomotion = advanceLocomotionState({}, {
      dt: 0, speed: 0, gait: 'walk',
      walkDuration: walk?.getClip().duration, runDuration: run?.getClip().duration
    });
    let complexionTexture = null, eyeTexture = null;
    const defaultExpressionNames = catalog.expressions || {};
    const expressionNames = new Map(Object.entries(defaultExpressionNames).map(([key, value]) => [key.toLowerCase(), typeof value === 'string' ? value : value.morph || value.target || value.name]));

    function allMeshes() { return [...meshesIn(model), ...equipped.flatMap(part => meshesIn(part.group))]; }
    function setMorph(name, value) {
      if (!name) return;
      for (const mesh of allMeshes()) { const index = mesh.morphTargetDictionary?.[name]; if (index !== undefined) mesh.morphTargetInfluences[index] = value; }
    }
    function expression(logical, value) { const key = expressionNames.get(logical.toLowerCase()) || `Expr_${logical}`; setMorph(key, value); }
    // The textures applyLook() will recolour, made ahead in slices; applyLook() then finds them made. Same originals, same swatches.
    function* recolorAheadSteps() {
      for (const mesh of allMeshes()) for (const material of materialList(mesh)) {
        const role = roleOf(material);
        if (role === 'skin') { if (look.colors.skin !== '#ffffff') yield* recolorSteps(complexionTexture || material.userData.originalMap, look.colors.skin, true); }
        else if (role === 'eyes' && eyeTexture) continue;
        else if (look.colors[role] && look.colors[role] !== '#ffffff') yield* recolorSteps(material.userData.originalMap, look.colors[role], true);
      }
    }
    function applyLook() {
      applySeatedMorphs = bindSeatedCorrectives(allMeshes());
      applyGaitMorphs = bindGaitCorrectives(allMeshes());
      root.scale.setScalar(look.height);
      const morphValues = appearanceMorphValues(catalog, look.features);
      for (const feature of catalog.features || []) {
        const value = morphValues[feature.id];
        setMorph(feature.negative, Math.max(0, -value)); setMorph(feature.positive, Math.max(0, value));
        if (feature.morph) setMorph(feature.morph, value);
      }
      for (const mesh of allMeshes()) for (const material of materialList(mesh)) {
        const role = roleOf(material);
        material.color.copy(material.userData.originalColor);
        material.map = material.userData.originalMap;
        if (role === 'skin') {
          if (complexionTexture) material.map = complexionTexture;
          if (look.colors.skin !== '#ffffff') {
            material.map = recoloredTexture(material.map, look.colors.skin);
            material.color.set(material.map ? '#ffffff' : look.colors.skin);
          }
        }
        else if (role === 'eyes' && eyeTexture) material.map = naturalEyeTexture(eyeTexture, look.eyeColor);
        else if (look.colors[role] && look.colors[role] !== '#ffffff') { material.map = recoloredTexture(material.userData.originalMap, look.colors[role]); material.color.set(material.map ? '#ffffff' : look.colors[role]); }
        if (role === 'hair') { mesh.receiveShadow = false; material.roughness = .98; if ('specularIntensity' in material) material.specularIntensity = .12; material.alphaToCoverage = true; }
        material.needsUpdate = true;
      }
    }
    function* bodyMaskSteps() {
      const hidden = new Set(equipped.flatMap(part => part.item.hideBodyVertices || []));
      for (const mesh of meshesIn(model).filter(mesh => mesh.userData.privateIndex)) {
        yield SLICE;
        const attribute = mesh.geometry.getAttribute('_source_index') || mesh.geometry.getAttribute('_SOURCE_INDEX') || mesh.geometry.getAttribute('source_index');
        const original = mesh.userData.fullIndex;
        if (!attribute || !hidden.size || !original) { mesh.geometry.setIndex(original); continue; }
        // Which vertices are hidden, once per vertex, then keep the triangles that use none of them.
        const hiddenAt = new Uint8Array(attribute.count);
        for (let v = 0; v < attribute.count; v++) if (hidden.has(Math.round(attribute.getX(v)))) hiddenAt[v] = 1;
        const indices = [];
        for (let i = 0; i < original.count; i += 3) {
          const a = original.getX(i), b = original.getX(i + 1), c = original.getX(i + 2);
          if (!hiddenAt[a] && !hiddenAt[b] && !hiddenAt[c]) indices.push(a, b, c);
        }
        mesh.geometry.setIndex(indices);
      }
    }
    function* loadPart(item, body = look.body, targetRig = bones) {
      item=resolvedItem(item,body);
      if (!item?.url) return { item, url: null, group: new THREE.Group() };
      const gltf = yield ['asset',item.url];
      try {
        const source = cloneSkeleton(gltf.scene); source.updateMatrixWorld(true); privateMaterials(source);
        const group = new THREE.Group(); group.name = `equipment:${item.id}`;
        const sourceMeshes = meshesIn(source);
        const isFootwear = catalog.shoes.some(candidate => candidate.id === item.id);
        for (const mesh of sourceMeshes) {
          if (item.meshNames?.length) { let named = mesh; while (named && !item.meshNames.includes(named.name)) named = named.parent; if (!named) continue; }
          if (isFootwear) isolateIndex(mesh);
          const worldMatrix = mesh.matrixWorld.clone();
          if (mesh.isSkinnedMesh) {
            const targetBones = mesh.skeleton.bones.map(bone => targetRig.get(bone.name));
            if (targetBones.some(bone => !bone)) throw new Error(`Incompatible skeleton on ${item.label}`);
            const skeleton = new THREE.Skeleton(targetBones, mesh.skeleton.boneInverses.map(matrix => matrix.clone()));
            const bindMatrix = mesh.bindMatrix.clone();
            group.add(mesh); worldMatrix.decompose(mesh.position, mesh.quaternion, mesh.scale); mesh.bind(skeleton, bindMatrix);
          } else {
            let sourceBone = mesh.parent;
            while (sourceBone && !sourceBone.isBone) sourceBone = sourceBone.parent;
            if (sourceBone && targetRig.has(sourceBone.name)) {
              const socket = new THREE.Group(); socket.userData.followBone = sourceBone.name;
              const localMatrix = sourceBone.matrixWorld.clone().invert().multiply(worldMatrix);
              socket.add(mesh); localMatrix.decompose(mesh.position, mesh.quaternion, mesh.scale); group.add(socket);
            } else { group.add(mesh); worldMatrix.decompose(mesh.position, mesh.quaternion, mesh.scale); }
          }
        }
        return { item, url: item.url, group };
      } catch (error) { store.release(item.url); throw error; }
    }
    function releaseParts(parts) { for (const part of parts) { disposePrivate(part.group); part.group.removeFromParent(); if (part.url) store.release(part.url); } }

    function footwearMask() {
      const covered = look.garments.some(id => ['female-casual-01', 'female-sport-01', 'male-worksuit-01','formal-suit-01'].includes(id));
      for (const part of equipped.filter(part => catalog.shoes.some(item => item.id === part.item.id))) {
        for (const mesh of meshesIn(part.group).filter(mesh => mesh.userData.privateIndex)) {
          const original = mesh.userData.fullIndex;
          if (!covered || !original) { mesh.geometry.setIndex(original); delete mesh.userData.footwearOcclusion; continue; }
          const result = footwearOcclusionIndices(mesh.geometry.getAttribute('position'), original);
          mesh.geometry.setIndex(result.indices);
          mesh.userData.footwearOcclusion = { hiddenTriangles: result.hiddenTriangles, hiddenComponents: result.hiddenComponents };
        }
      }
    }

    function* appearanceSteps(patch, sliced = false) {
      if (disposed) return { ok: false, reason: 'Character was removed.' };
      desiredLook = normalizeAppearance(catalog, mergeLook(desiredLook, patch));
      const next = desiredLook, request = ++revision;
      const sameBody = next.body===look.body;
      const sameEquipment = ready && sameBody && next.hair === look.hair && next.shoes === look.shoes && JSON.stringify(next.garments) === JSON.stringify(look.garments);
      let nextParts = [], nextBase=null, nextBaseUrl=null;
      try {
        if(!sameBody){nextBaseUrl=bodyDescriptor(next.body).url;nextBase=prepareBody(yield ['asset',nextBaseUrl]);}
        const descriptors = [catalog.hair.find(item => item.id === next.hair), ...next.garments.map(id => catalog.garments.find(item => item.id === id)), catalog.shoes.find(item => item.id === next.shoes)];
        if (!sameEquipment) for(const item of descriptors) { nextParts.push(yield* loadPart(item,next.body,nextBase?.bones||bones)); yield SLICE; }
        const nextComplexion = next.complexion === 'deep' ? null : yield ['texture',bodyDescriptor(next.body).complexions?.[next.complexion] || `/models/skin-${next.complexion}.jpg`];
        const eyeUrl=catalog.eyeColors.find(item=>item.id===next.eyeColor)?.url;
        const nextEye=eyeUrl ? yield ['texture',eyeUrl] : null;
        if (request !== revision || disposed) { releaseParts(nextParts);if(nextBase){disposePrivate(nextBase.model);store.release(nextBaseUrl);}return { ok: false, stale: true }; }
        if(nextBase){
          cancelAction({immediate:true});mixer.stopAllAction();mixer.uncacheRoot(root);activity=null;fading=null;actionBlend=0;
          model.removeFromParent();disposePrivate(model);store.release(baseUrl);
          model=nextBase.model;bones=nextBase.bones;baseUrl=nextBaseUrl;root.add(model);nextBase=null;setupRig();
        }
        if (!sameEquipment) { releaseParts(equipped); equipped = nextParts; for (const part of equipped) root.add(part.group); }
        look = next; complexionTexture = nextComplexion; eyeTexture = nextEye;
        yield* bodyMaskSteps(); yield SLICE; footwearMask();
        if (sliced) yield* recolorAheadSteps();
        yield SLICE; applyLook();
        if(!sameEquipment) {
          const shoes=equipped.filter(part=>catalog.shoes.some(item=>item.id===part.item.id)).flatMap(part=>meshesIn(part.group));
          planting.setFootwear(shoes);actionSupport?.setFootwear(shoes);seatedContact?.setFootwear(shoes);kneeAlignment?.reset();
        }
        if(activity?.id==='standup'&&!activity.reverseSit)actionSupport?.begin();
        ready = true; root.visible = rendered;
        return { ok: true, appearance: structuredClone(look) };
      } catch (error) {
        releaseParts(nextParts);
        if(nextBase){disposePrivate(nextBase.model);store.release(nextBaseUrl);}
        if (request === revision) desiredLook = look;
        return { ok: false, reason: error.message };
      }
    }
    const setAppearance = patch => driveAsync(appearanceSteps(patch));
    const setAppearanceSync = patch => driveSync(appearanceSteps(patch));
    function setAction(id) {
      const clipNames = { talk: 'Talk', wave: 'Wave', play: 'Play', sit: 'Sit', sleep: 'Sleep', hug: 'Hug', kiss: 'Kiss' };
      const action = actions.get(clipNames[id]);
      if (!action) return { ok: false, reason: `The ${id} action is not available.` };
      actionSupport?.reset();seatedContact?.reset();kneeAlignment?.reset();
      if (activity?.action) activity.action.stop(); if (fading) { fading.stop(); fading = null; }
      const loop = ['talk', 'play'].includes(id), hold = ['sit', 'sleep'].includes(id);
      action.reset().setEffectiveWeight(0).setEffectiveTimeScale(1); action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1); action.clampWhenFinished = !loop; action.play();
      activity = { id, action, elapsed: 0, duration: action.getClip().duration, loop, hold, holdTime: motionMetadata.clips?.[clipNames[id]]?.hold_time_seconds ?? (id === 'sit' ? 1.6 : 1.8) }; actionBlend = 0;
      return { ok: true, duration: activity.duration, hold };
    }
    function sampleAction(id, seconds) {
      const result=setAction(id);if(!result.ok)return result;
      const time=Math.max(0,Number(seconds)||0);
      activity.action.time=activity.loop?time%activity.duration:Math.min(time,activity.hold?activity.holdTime:activity.duration);
      activity.elapsed=activity.loop?time%activity.duration:Math.min(time,activity.duration);
      actionBlend=1;update(0);return result;
    }
    function releaseAction() {
      actionSupport?.reset();
      if (activity?.action) { if (fading) fading.stop(); fading = activity.action; }
      activity = null;
    }
    function cancelAction({ immediate = false } = {}) {
      if (!immediate && activity?.id === 'standup') return;
      if (!immediate && activity?.id === 'sit') {
        const seated = activity.action, time = Math.min(seated.time, activity.holdTime);
        const stand = time >= activity.holdTime - .025 ? actions.get('StandUp') : null;
        if (stand) {
          actionSupport?.begin();
          seated.stop();
          stand.reset().setEffectiveWeight(actionBlend).setEffectiveTimeScale(1);
          stand.setLoop(THREE.LoopOnce, 1); stand.clampWhenFinished = true; stand.play();
          activity = { id: 'standup', action: stand, elapsed: 0, duration: stand.getClip().duration, hold: false, loop: false };
        } else {
          // An interrupted descent returns from its current pose, without jumping
          // to the seated start of the full standing action.
          seated.paused = false; seated.time = time; seated.setEffectiveTimeScale(-.9);
          activity = { id: 'standup', action: seated, elapsed: 0, duration: time / .9, hold: false, loop: false, reverseSit: true, initialBlend: actionBlend };
        }
        return;
      }
      releaseAction();
      if (immediate) { seatedContact?.reset();fading?.stop(); fading = null; actionBlend = 0; kneeAlignment?.reset(); }
    }
    function update(dt) {
      if (disposed || !ready) return;
      elapsed += dt;
      const speed = Math.max(0, motion.speed / (look.height*strideScale)), running = motion.gait === 'run';
      const walkSpeed = motionMetadata.clips?.Walk_InPlace?.nominal_speed_mps || 1.25;
      const runSpeed = motionMetadata.clips?.Run_InPlace?.nominal_speed_mps || 2.4;
      locomotion = advanceLocomotionState(locomotion, {
        dt, speed, gait: running ? 'run' : 'walk', walkSpeed, runSpeed,
        walkDuration: walk?.getClip().duration, runDuration: run?.getClip().duration
      });
      // The game host owns distance and stride timing; this path samples without starting another clock.
      if (Number.isFinite(motion.samplePhase)) {
        const phase = ((motion.samplePhase % 1) + 1) % 1;
        const moving = motion.sampleBlend ? locomotion.moving : motion.sampleMoving ? 1 : 0;
        const runBlend = motion.sampleBlend ? locomotion.runBlend : running ? 1 : 0;
        locomotion = { ...locomotion, phase, moving, runBlend,
          walkTime: phase * (walk?.getClip().duration || 1), runTime: phase * (run?.getClip().duration || 1),
          weights: { idle: 1 - moving, walk: moving * (1 - runBlend), run: moving * runBlend } };
      }
      actionBlend = THREE.MathUtils.damp(actionBlend, activity?.reverseSit ? activity.initialBlend : activity ? 1 : 0, 12, dt);
      if (fading) { fading.setEffectiveWeight(actionBlend); if (actionBlend < .005) { fading.stop(); fading = null; } }
      const motionWeight = 1 - actionBlend;
      if (idle) {
        idle.setEffectiveWeight(locomotion.weights.idle * motionWeight);
        const handoff = motionMetadata.clips?.[(activity?.action || fading)?.getClip().name]?.idle_handoff_time_seconds;
        idle.paused = Number.isFinite(handoff);
        if (idle.paused) idle.time = handoff;
      }
      if (walk) { walk.time = locomotion.walkTime; walk.setEffectiveWeight(locomotion.weights.walk * motionWeight).setEffectiveTimeScale(0); }
      if (run) { run.time = locomotion.runTime; run.setEffectiveWeight(locomotion.weights.run * motionWeight).setEffectiveTimeScale(0); }
      if (activity) { activity.action.setEffectiveWeight(actionBlend); activity.elapsed += dt; if (!activity.hold && !activity.loop && activity.elapsed > activity.duration + .15) releaseAction(); }
      // PropertyMixer skips unchanged track values. Remove last frame's IK and
      // finger offsets first so constant animation tracks cannot accumulate them.
      for (const pose of mixedPose) { pose.bone.position.copy(pose.position); pose.bone.quaternion.copy(pose.quaternion); pose.bone.scale.copy(pose.scale); }
      mixer.update(dt);
      if (activity?.hold && activity.action.time >= activity.holdTime) { activity.action.time = activity.holdTime; activity.action.paused = true; mixer.update(0); }
      for (const pose of mixedPose) { pose.position.copy(pose.bone.position); pose.quaternion.copy(pose.bone.quaternion); pose.scale.copy(pose.bone.scale); }
      kneeAlignment?.update({movingWeight:locomotion.moving,actionBlend});
      planting.update({dt,phase:locomotion.phase,runBlend:locomotion.runBlend,movingWeight:locomotion.moving,actionBlend,speed:motion.speed,inPlace:!!motion.inPlace,enabled:footPlantingEnabled});
      if(activity?.id==='standup'&&!activity.reverseSit)actionSupport?.update({time:activity.action.time,duration:activity.duration,weight:actionBlend});
      seatedContact?.update({dt,phase:activity?.id,weight:actionBlend});
      applySeatedMorphs(seatedDrape.influence(['sit','standup'].includes(activity?.id)||['Sit','StandUp'].includes(fading?.getClip().name)));
      applyGaitMorphs({phase:locomotion.phase,walkWeight:locomotion.weights.walk*motionWeight,runWeight:locomotion.weights.run*motionWeight});
      for (const part of equipped) part.group.traverse(node => {
        if (node.userData.followBone) { const bone = bones.get(node.userData.followBone); bone.updateWorldMatrix(true, false); const relative = root.matrixWorld.clone().invert().multiply(bone.matrixWorld); relative.decompose(node.position, node.quaternion, node.scale); }
      });
      for (const name of expressionNames.values()) setMorph(name, 0);
      for (const [name, value] of Object.entries(EMOTIONS[emotion] || {})) expression(name, value * emotionStrength);
      const blinkPhase = (elapsed + id.length * .37) % 4.3;
      const blink = activity?.id === 'sleep' ? 1 : blinkPhase < .16 ? Math.sin(blinkPhase / .16 * Math.PI) : 0;
      if (blink > 0) { expression('BlinkLeft', blink); expression('BlinkRight', blink); }
      if (activity?.id === 'talk') expression('MouthOpen', .12 + .22 * Math.abs(Math.sin(elapsed * 8.1)));
      if (activity?.id === 'kiss') expression('Purse', .5);
      const hand = look.handPose;
      for (const [name, bone] of bones) {
        const match = /^(index|middle|ring|pinky|thumb)_(\d\d)_[lr]$/.exec(name); if (!match) continue;
        let bend = hand === 'relaxed' ? .18 + motionWeight * (.10 * locomotion.weights.walk + .28 * locomotion.weights.run) : hand === 'fist' ? .75 : 0;
        if (hand === 'point') bend = match[1] === 'index' ? 0 : .7;
        if (hand === 'peace') bend = ['index', 'middle'].includes(match[1]) ? 0 : .7;
        if (match[1] === 'thumb') bend *= hand === 'relaxed' ? .6 : .35;
        const jointWeight = [0, 1, 1.15, .85][Number(match[2])] || 1;
        const relaxed = fingerRest.get(name).clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), bend * jointWeight));
        // The gesture owns its fingers; free locomotion blends in a relaxed hand.
        if (hand === 'relaxed') bone.quaternion.slerp(relaxed, motionWeight);
        else bone.quaternion.copy(relaxed);
      }
    }
    function stats() {
      let triangles = 0, draws = 0, footwearOccludedTriangles = 0; const materials = new Set(), morphs = new Set(), textures = new Set();
      for (const mesh of allMeshes()) if (mesh.visible) {
        triangles += (mesh.geometry.index?.count || mesh.geometry.attributes.position.count) / 3; draws += Math.max(1, mesh.geometry.groups.length);
        footwearOccludedTriangles += mesh.userData.footwearOcclusion?.hiddenTriangles || 0;
        for (const material of materialList(mesh)) { materials.add(material); if (material.map) textures.add(material.map); }
        for (const name of Object.keys(mesh.morphTargetDictionary || {})) morphs.add(name);
      }
      const estimatedActiveTextureBytes = [...textures].reduce((sum, texture) => {
        const width = texture.image?.width || 0, height = texture.image?.height || 0;
        return sum + width * height * 4 * (texture.generateMipmaps === false ? 1 : 4 / 3);
      }, 0);
      return { triangles, draws, materials: materials.size, bones: bones.size, morphs: morphs.size, footwearOccludedTriangles, textureCount: textures.size, estimatedActiveTextureBytes, textures: [...textures].map(texture => ({ width: texture.image?.width, height: texture.image?.height })) };
    }
    function inspectPose() {
      root.updateMatrixWorld(true);
      const points = { L: [], R: [] }, local = new THREE.Vector3();
      for (const part of equipped.filter(part => catalog.shoes.some(item => item.id === part.item.id))) {
        for (const mesh of meshesIn(part.group).filter(mesh => mesh.visible)) {
          const position = mesh.geometry.getAttribute('position');
          const renderedIndices = new Set(mesh.geometry.index ? mesh.geometry.index.array : Array.from({ length: position.count }, (_, index) => index));
          for (const index of renderedIndices) {
            const side = position.getX(index) >= 0 ? 'L' : 'R';
            mesh.getVertexPosition(index, local); mesh.localToWorld(local); points[side].push(local.clone());
          }
        }
      }
      const footwear = Object.fromEntries(Object.entries(points).map(([side, values]) => {
        if (!values.length) return [side, { vertices: 0, soleMinY: null, bottomBandCentroid: null }];
        const soleMinY = Math.min(...values.map(point => point.y));
        const band = values.filter(point => point.y <= soleMinY + .012);
        const centroid = band.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / band.length);
        return [side, { vertices: values.length, soleMinY, bottomBandVertices: band.length, bottomBandCentroid: centroid.toArray() }];
      }));
      const footBones = Object.fromEntries([['L', 'foot_l'], ['R', 'foot_r']].map(([side, name]) => {
        const bone = bones.get(name); return [side, bone ? bone.getWorldPosition(new THREE.Vector3()).toArray() : null];
      }));
      const upperBody = Object.fromEntries(['spine_03', 'neck_01', 'head', 'clavicle_l', 'clavicle_r', 'upperarm_l', 'upperarm_r', 'hand_l', 'hand_r'].map(name => {
        const bone = bones.get(name);
        return [name, bone ? root.worldToLocal(bone.getWorldPosition(new THREE.Vector3())).toArray() : null];
      }));
      const rootRotation = root.getWorldQuaternion(new THREE.Quaternion()).invert();
      const upperBodyRotations = Object.fromEntries(['spine_03', 'neck_01', 'head'].map(name => {
        const bone = bones.get(name);
        return [name, bone ? rootRotation.clone().multiply(bone.getWorldQuaternion(new THREE.Quaternion())).toArray() : null];
      }));
      return { footwear, footBones, upperBody, upperBodyRotations, planting:planting.snapshot(), kneeAlignment:kneeAlignment?.snapshot(), actionSupport:actionSupport?.snapshot(), seatedDrape:seatedDrape.snapshot(), seatedContact:seatedContact?.snapshot() };
    }
    const actor = {
      id, root, get model(){return model;}, get bones(){return bones;}, setAppearance, setAppearanceSync, setVisible: value => { rendered = value; root.visible = ready && rendered; }, setMotion: value => { motion = { ...motion, ...value }; }, setAction, sampleAction, cancelAction,
      setEmotion: (id, strength = .7) => { emotion = EMOTIONS[id] ? id : 'neutral'; emotionStrength = clamp(strength, 0, 1, .7); },
      update, stats, inspectPose, getActivity: () => activity?.id || 'idle', getSeatedWeight: () => seatedDrape.snapshot().influence, getStrideScale:()=>strideScale, getEyeHeight:()=>eyeHeight,
      retainAssets:()=>{
        const urls=[baseUrl,...equipped.map(part=>part.url).filter(Boolean)];
        urls.forEach(url=>store.acquireSync(url));let released=false;
        return ()=>{if(released)return;released=true;urls.forEach(url=>store.release(url));};
      },
      resetMotionSupport:()=>{planting.reset();kneeAlignment?.reset();actionSupport?.reset();seatedContact?.reset();},
      getChairOffset:()=>(motionMetadata.clips?.Sit?.chair_offset_gltf_z_m||0)*strideScale,
      getFaceTarget:()=>bones.get('head').localToWorld(faceOffset.clone()),
      snapshot: () => ({
        id, appearance: structuredClone(look), emotion, emotionStrength, activity: activity?.id || 'idle', activityTime: activity?.elapsed || 0,
        position: root.position.toArray(), motion: { ...motion },
        transfer: {method:bodyMotions.get(baseUrl)?.method || 'local', bakeMs:bodyMotions.get(baseUrl)?.bakeMs || 0},
        locomotion: {
          phase: locomotion.phase, cyclesPerSecond: locomotion.cyclesPerSecond, movingWeight: locomotion.moving, runBlend: locomotion.runBlend,
          weights: { ...locomotion.weights },
          contacts: { walk: gaitContacts(motionMetadata, 'Walk_InPlace', locomotion.phase), run: gaitContacts(motionMetadata, 'Run_InPlace', locomotion.phase) }
        },
        planting:planting.snapshot(),
        stats: stats()
      }),
      dispose: () => { if (disposed) return; disposed = true; revision++; cancelAction({immediate:true}); mixer.stopAllAction(); mixer.uncacheRoot(root); releaseParts(equipped); disposePrivate(model); root.removeFromParent(); store.release(baseUrl); actors.delete(id); }
    };
    actors.set(id, actor);
    const result = yield* appearanceSteps(look, sliced); if (!result.ok) { actor.dispose(); throw new Error(result.reason); }
    return actor;
  }
  return { catalog, clips: clips.map(clip => ({ name: clip.name, duration: clip.duration })), motionMetadata, preload, spawn: value=>driveAsync(spawnSteps(value)), spawnSync: value=>driveSync(spawnSteps(value)), spawnSliced: (value, pause, load=false)=>driveSliced(spawnSteps(value, true), pause, load), update: dt => actors.forEach(actor => actor.update(dt)), stats: () => ({ actorCount: actors.size, ...store.stats() }), dispose: () => { actors.forEach(actor => actor.dispose()); store.release(animationUrl); } };
}
