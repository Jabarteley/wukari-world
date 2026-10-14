/**
 * OWNER: world
 * The aerial city of the dive, drawn (the plan is ./aerial-plan.ts). Loaded on its own (map3d.ts imports it dynamically when a dive
 * starts), drawn only while the city map's camera comes down from the clouds, and disposed when the dive ends.
 *
 *   createAerial(THREE, pack, options) → null on a device that gets no dive, else {
 *     group                 four meshes: the massing (one InstancedMesh of boxes, buildings and tree crowns), the parks (one
 *                           InstancedMesh of flat patches), the road ribbons (one merged mesh) and the clouds (one InstancedMesh)
 *     triangles, calls      what it adds to a frame (inside AERIAL_TRIANGLES with the city, AERIAL_DRAW_CALLS)
 *     setClouds(from, to, startY, endY)   lay the clouds for this dive's path
 *     update(k, street, rise)             where the dive is (0..1): the massing dissolves out before the end, the clouds thin as the
 *                                         camera passes them; `rise` dissolves it all in when the chunk arrived after the dive began
 *     dispose()
 *   }
 * The massing and ribbons dissolve with a screen-door (no sorting, no transparency); floors read as bands on the walls. No textures
 * are downloaded: the cloud puff is painted into a 64 px DataTexture from the city's seed.
 */
import type { BufferGeometry, Group, InstancedMesh, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import type { XZ } from './types.ts';
import { aerialFade, aerialTier, cloudFade, planAerial, planClouds, AERIAL_CAPS, AERIAL_RESERVE, AERIAL_TRIANGLES, seedOf } from './aerial-plan.ts';
import type { AerialPack, AerialPlan, AerialTier, AerialVenue, Cloud } from './aerial-plan.ts';
import { lightOn } from '../lightMode.ts';

type Three = typeof import('three');

export interface AerialDrawOptions {
  /** Reduced motion: no aerial city (the dive is cut anyway). */
  reduced?: boolean;
  /** The device tier; read from the browser (as ./dive-host.ts does) when not given. */
  tier?: AerialTier | 'cut';
  /** Triangles the city already draws. */
  cityTriangles?: number;
  /** Venue parks, kept green. */
  parks?: readonly XZ[];
  /** The dive's destination: a sub-centre, so the swoop comes down over a built-up quarter. */
  hubs?: readonly XZ[];
  /** The venues with their kinds: where the downtown is (./aerial-plan.ts downtownOf). */
  venues?: readonly AerialVenue[];
  /** The city's catalogue point in map units; the pack's frame origin (the same point for a generated city) when not given. */
  prior?: XZ;
  /** The height of the ground (the city's relief), 0 when not given. */
  ground?: (x: number, z: number) => number;
}
export interface Aerial {
  readonly group: Group;
  readonly plan: AerialPlan;
  readonly tier: AerialTier;
  /** Everything it can draw at once (at the top of the dive). */
  readonly triangles: number;
  readonly calls: number;
  /** What it draws this frame: the dissolve at the ends draws fewer boxes, the edge going first. */
  readonly drawn: number;
  readonly clouds: readonly Cloud[];
  /** True while it and a city of `cityTriangles` (all of it, the fabric too) would pass AERIAL_TRIANGLES: the map leaves its own fabric out until then. */
  crowds(cityTriangles: number): boolean;
  setClouds(from: XZ, to: XZ, startY: number, endY: number): number;
  update(k: number, street: boolean, rise?: number): void;
  dispose(): void;
}

/** What the browser says of the device (./dive-host.ts deviceHints, repeated: this chunk imports nothing it does not own). */
export function readTier(reduced: boolean, nav: unknown = globalThis.navigator): AerialTier | 'cut' {
  const n = (nav ?? {}) as { hardwareConcurrency?: number; deviceMemory?: number; connection?: { saveData?: boolean } };
  return aerialTier({ reduced, cores: n.hardwareConcurrency, memory: n.deviceMemory, saveData: n.connection?.saveData === true || lightOn() });
}

const DISSOLVE = `if (uAerialFade < 0.999) { float aerialNoise = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))); if (aerialNoise >= uAerialFade) discard; }`;
/** The screen-door dissolve, and for the massing the floors: darker bands up the walls, so a tower reads as a tower from above. */
function patch(material: Material, fade: { value: number }, key: string, floors: boolean): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uAerialFade = fade;
    if (floors) {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vAerialY;\nvarying float vAerialWall;')
        .replace('#include <project_vertex>', '#include <project_vertex>\n#ifdef USE_INSTANCING\nvAerialY = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).y;\n#else\nvAerialY = (modelMatrix * vec4(transformed, 1.0)).y;\n#endif\nvAerialWall = 1.0 - abs(objectNormal.y);');
    }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uAerialFade;${floors ? '\nvarying float vAerialY;\nvarying float vAerialWall;' : ''}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${DISSOLVE}`);
    if (floors) shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nif (vAerialWall > 0.5 && vAerialY > 0.12) diffuseColor.rgb *= mix(1.0, 0.72, step(0.62, fract(vAerialY * 3.3)));');
  };
  material.customProgramCacheKey = () => key;
}

/** A unit box standing on y = 0 (top and four sides, no bottom), its walls darker towards the ground (a soft occlusion). */
function boxGeometry(THREE: Three): BufferGeometry {
  const pos: number[] = [], nor: number[] = [], col: number[] = [], idx: number[] = [];
  const face = (points: number[][], normal: number[]) => {
    const base = pos.length / 3;
    for (const point of points) { pos.push(...point); nor.push(...normal); const shade = normal[1] === 1 ? 1.06 : 0.66 + point[1]! * 0.3; col.push(shade, shade, shade); }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const a = -0.5, b = 0.5;
  face([[a, 1, b], [b, 1, b], [b, 1, a], [a, 1, a]], [0, 1, 0]);
  face([[a, 0, b], [b, 0, b], [b, 1, b], [a, 1, b]], [0, 0, 1]); face([[b, 0, a], [a, 0, a], [a, 1, a], [b, 1, a]], [0, 0, -1]);
  face([[b, 0, b], [b, 0, a], [b, 1, a], [b, 1, b]], [1, 0, 0]); face([[a, 0, a], [a, 0, b], [a, 1, b], [a, 1, a]], [-1, 0, 0]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  geometry.setIndex(idx);
  return geometry;
}
/** A flat unit square facing up. */
function flatGeometry(THREE: Three): BufferGeometry {
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
/** The cloud puff: a few soft blobs from the seed, white with a grey underside, alpha falling to nothing at the edge. */
export function cloudPixels(seed: number, size = 64): Uint8Array {
  let a = seed >>> 0;
  const rng = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const blobs = Array.from({ length: 7 }, (_, i) => ({ x: 0.5 + (rng() - 0.5) * (i ? 0.5 : 0), y: 0.5 + (rng() - 0.5) * (i ? 0.5 : 0), r: i ? 0.12 + rng() * 0.12 : 0.26 }));
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x + 0.5) / size, v = (y + 0.5) / size;
    let density = 0;
    for (const blob of blobs) { const q = ((u - blob.x) ** 2 + (v - blob.y) ** 2) / (blob.r * blob.r); density += Math.exp(-q * 1.6); }
    const edge = Math.min(1, Math.min(u, v, 1 - u, 1 - v) * 6), alpha = Math.max(0, Math.min(1, (density - 0.25) * 1.4)) * edge;
    const tone = 235 + Math.round(20 * v), i = (y * size + x) * 4;
    data[i] = tone; data[i + 1] = tone; data[i + 2] = Math.min(255, tone + 4); data[i + 3] = Math.round(alpha * 255);
  }
  return data;
}

export function createAerial(THREE: Three, pack: AerialPack, options: AerialDrawOptions = {}): Aerial | null {
  const tier = options.tier ?? readTier(Boolean(options.reduced));
  if (tier === 'cut' || options.reduced) return null;
  const plan = planAerial(pack, { tier, cityTriangles: options.cityTriangles ?? 0, parks: options.parks ?? [], hubs: options.hubs ?? [], ...(options.venues ? { venues: options.venues } : {}), ...(options.prior ? { prior: options.prior } : {}) });
  const ground = options.ground ?? (() => 0);
  const group = new THREE.Group();
  group.name = 'aerial';
  const own: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(thing: T): T => { own.push(thing); return thing; };
  const fade = { value: 1 };
  const dummy = new THREE.Object3D(), tint = new THREE.Color();
  let triangles = 0, calls = 0;
  /** The ground layers that have something to draw (the clouds are handled on their own). */
  const filled: (Mesh | InstancedMesh)[] = [];
  const add = (mesh: Mesh | InstancedMesh, name: string, perItem: number, items: number) => {
    mesh.name = name; mesh.frustumCulled = false; mesh.matrixAutoUpdate = false; mesh.updateMatrix(); group.add(mesh);
    if (items) { triangles += perItem * items; calls += 1; }
    mesh.visible = items > 0;
    return mesh;
  };

  // The massing: buildings and tree crowns, one instanced box.
  const massMaterial: MeshStandardMaterial = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.02 }));
  patch(massMaterial, fade, 'aerial-massing-1', true);
  const massing = new THREE.InstancedMesh(keep(boxGeometry(THREE)), massMaterial, Math.max(1, plan.masses.length));
  plan.masses.forEach((mass, i) => {
    dummy.position.set(mass.x, ground(mass.x, mass.z), mass.z); dummy.rotation.set(0, mass.ry, 0); dummy.scale.set(mass.w, mass.h, mass.d); dummy.updateMatrix();
    massing.setMatrixAt(i, dummy.matrix); massing.setColorAt(i, tint.set(mass.colour));
  });
  massing.count = plan.masses.length;
  if (plan.masses.length) filled.push(add(massing, 'aerial-massing', 10, plan.masses.length)); else add(massing, 'aerial-massing', 10, 0);

  // The parks: flat green patches laid over the ground.
  const parkMaterial: MeshStandardMaterial = keep(new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  patch(parkMaterial, fade, 'aerial-parks-1', false);
  const parks = new THREE.InstancedMesh(keep(flatGeometry(THREE)), parkMaterial, Math.max(1, plan.parks.length));
  plan.parks.forEach((item, i) => {
    dummy.position.set(item.x, ground(item.x, item.z) + 0.05, item.z); dummy.rotation.set(0, item.ry, 0); dummy.scale.set(item.w, 1, item.d); dummy.updateMatrix();
    parks.setMatrixAt(i, dummy.matrix); parks.setColorAt(i, tint.set(item.colour));
  });
  parks.count = plan.parks.length;
  if (plan.parks.length) filled.push(add(parks, 'aerial-parks', 2, plan.parks.length)); else add(parks, 'aerial-parks', 2, 0);

  // The roads: kerb, asphalt, kerb across, wider than the map draws them.
  const pos: number[] = [], col: number[] = [], nor: number[] = [], idx: number[] = [];
  const kerb = new THREE.Color('#d9d3c3'), asphalt = new THREE.Color('#454a52'), trunk = new THREE.Color('#383c44');
  let segments = 0;
  for (const ribbon of plan.ribbons) {
    const points = ribbon.points, base = pos.length / 3, across = [-0.5, -0.36, 0.36, 0.5];
    for (let i = 0; i < points.length; i++) {
      const prev = points[Math.max(0, i - 1)]!, next = points[Math.min(points.length - 1, i + 1)]!, dx = next.x - prev.x, dz = next.z - prev.z, length = Math.hypot(dx, dz) || 1;
      const nx = -dz / length, nz = dx / length, p = points[i]!;
      for (const [j, t] of across.entries()) {
        const x = p.x + nx * t * ribbon.width, z = p.z + nz * t * ribbon.width, colour = j === 0 || j === 3 ? kerb : ribbon.trunk ? trunk : asphalt;
        pos.push(x, ground(x, z) + 0.09, z); nor.push(0, 1, 0); col.push(colour.r, colour.g, colour.b);
      }
    }
    for (let i = 0; i + 1 < points.length; i++) {
      for (let j = 0; j < 3; j++) {
        const a = base + i * 4 + j, b = a + 1, c = a + 4, d = a + 5;
        idx.push(a, c, b, b, c, d);
      }
      segments += 1;
    }
  }
  const roadGeometry = keep(new THREE.BufferGeometry());
  roadGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  roadGeometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
  roadGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  roadGeometry.setIndex(idx);
  const roadMaterial: MeshStandardMaterial = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  patch(roadMaterial, fade, 'aerial-roads-1', false);
  const roads = add(new THREE.Mesh(roadGeometry, roadMaterial), 'aerial-roads', 6, segments);
  if (segments) filled.push(roads);

  // The clouds: flat puffs facing up, thinned by their distance to the camera (the ones it flies through) and by the dive.
  const cloudFadeUniform = { value: 1 }, near = { value: new THREE.Vector2(10, 60) };
  const texture = keep(new THREE.DataTexture(cloudPixels(seedOf(pack.id)), 64, 64, THREE.RGBAFormat));
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearFilter; texture.generateMipmaps = false; texture.needsUpdate = true;
  const cloudMaterial: MeshBasicMaterial = keep(new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  cloudMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uCloudFade = cloudFadeUniform; shader.uniforms.uCloudNear = near;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying float vCloudDepth;').replace('#include <project_vertex>', '#include <project_vertex>\nvCloudDepth = -mvPosition.z;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uCloudFade;\nuniform vec2 uCloudNear;\nvarying float vCloudDepth;')
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.a *= uCloudFade * smoothstep(uCloudNear.x, uCloudNear.y, vCloudDepth);');
  };
  cloudMaterial.customProgramCacheKey = () => 'aerial-clouds-1';
  const cloudCap = AERIAL_CAPS[tier].clouds;
  const cloudMesh = new THREE.InstancedMesh(keep(flatGeometry(THREE)), cloudMaterial, cloudCap);
  cloudMesh.count = 0; cloudMesh.renderOrder = 6;
  add(cloudMesh, 'aerial-clouds', 2, 0);
  let clouds: Cloud[] = [];

  return {
    group, plan, tier,
    get triangles() { return triangles; },
    get calls() { return calls; },
    get clouds() { return clouds; },
    setClouds(from: XZ, to: XZ, startY: number, endY: number) {
      const had = cloudMesh.count;
      clouds = planClouds(seedOf(pack.id), from, to, startY, endY, cloudCap);
      clouds.forEach((cloud, i) => { dummy.position.set(cloud.x, cloud.y, cloud.z); dummy.rotation.set(0, cloud.ry, 0); dummy.scale.set(cloud.size, 1, cloud.size); dummy.updateMatrix(); cloudMesh.setMatrixAt(i, dummy.matrix); });
      cloudMesh.count = clouds.length; cloudMesh.instanceMatrix.needsUpdate = true; cloudMesh.visible = clouds.length > 0;
      near.value.set(startY * 0.03, startY * 0.14);
      triangles += (clouds.length - had) * 2; calls += (clouds.length ? 1 : 0) - (had ? 1 : 0);
      return clouds.length;
    },
    update(k: number, street: boolean, rise = 1) {
      const r = Math.max(0, Math.min(1, rise));
      fade.value = aerialFade(k, street) * r;
      cloudFadeUniform.value = cloudFade(k) * r;
      for (const mesh of filled) mesh.visible = fade.value > 0.002;
      cloudMesh.visible = clouds.length > 0 && cloudFadeUniform.value > 0.002;
      // The dissolve also draws fewer boxes and patches, the least dense first, so the frame gets lighter as the map's own fabric comes back.
      massing.count = Math.ceil(plan.masses.length * fade.value); parks.count = Math.ceil(plan.parks.length * fade.value);
    },
    get drawn() {
      if (!(fade.value > 0.002)) return cloudMesh.visible ? cloudMesh.count * 2 : 0;
      return massing.count * 10 + parks.count * 2 + plan.triangles.ribbons + (cloudMesh.visible ? cloudMesh.count * 2 : 0);
    },
    crowds(cityTriangles: number) { return this.drawn + cityTriangles + AERIAL_RESERVE > AERIAL_TRIANGLES; },
    dispose() {
      group.parent?.remove(group);
      for (const thing of own) thing.dispose();
      massing.dispose(); parks.dispose(); cloudMesh.dispose();
      own.length = 0;
    },
  };
}
