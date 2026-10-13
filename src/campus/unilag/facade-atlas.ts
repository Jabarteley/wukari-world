/**
 * One small facade atlas for every OSM building wall: generated once on a canvas at campus start (no download).
 * 256x128 px = 4x2 cells of 64 px (about 128 KB, 170 KB with mips). Walls get UVs counted in tiles (one tile is one
 * bay by one floor) and a per-vertex cell index; a patched shader repeats the cell with fract() and samples with
 * explicit gradients so mip selection does not glitch at tile seams. It rides on a clone of the solid material for
 * the already-separate body mesh, so it adds no draw call. In Node (tests) there is no canvas: no atlas, no UVs.
 */
import type { BufferGeometry, CanvasTexture, Material, MeshLambertMaterial, MeshStandardMaterial } from 'three';
import type * as ThreeNamespace from 'three';
import type { CampusMapBuilding, MetreRing } from './geo.ts';
import { architectureOf, baysOf, floorsOf } from './architecture.ts';
import { renderTier } from '../../scene/look.ts';

/** Logical drawing grid is 64 px per cell; the canvas is drawn at 2x (128 px per cell, 512x384 = 12 cells, about 790 KB raw and 1 MB with mips). */
export const ATLAS = Object.freeze({ cols: 4, rows: 3, cell: 64, scale: 2, bytes: 512 * 384 * 4 });
const PLAIN = 4;
/** Wall cells by style. */
const STYLE_CELLS = [0, 1, 2, 3, 5, 6, 7, 11];


/** Which atlas cell a building's walls use. Landmarks and the Senate tower are plain: their geometry draws the windows. */
export function wallCell(b: CampusMapBuilding): number {
  // Window-style landmarks use the punched cell and their geometric panes cover it exactly (same floor and bay grid);
  // the rest draw their whole facade in geometry over plain render.
  const info = architectureOf(b);
  if (info.id) {
    // Faculty styles keep a matching texture underneath their own geometry so a budget-starved view is never a bare box.
    const FACULTY: Record<string, number> = { engineering: 2, arts: 5, law: 7, social: 1, science: 0 };
    if (FACULTY[info.style] !== undefined) return FACULTY[info.style]!;
    if (info.style === 'library' || info.style === 'podium' || info.style === 'tower') return 10; // board-marked concrete
    return info.style === 'institutional' || info.style === 'hall' || info.style === 'auditorium' ? 0 : PLAIN;
  }
  if (b.height < 3.4) return PLAIN;
  const h = Math.imul(b.osm.id | 0, 2654435761) >>> 0, pick = STYLE_CELLS[(h >>> 7) % STYLE_CELLS.length]!;
  return b.height >= 11 && (pick === 6 || pick === 2) ? 0 : pick;
}

export function createFacadeAtlas(THREE: typeof ThreeNamespace): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS.cols * ATLAS.cell * ATLAS.scale; canvas.height = ATLAS.rows * ATLAS.cell * ATLAS.scale;
  const g = canvas.getContext('2d');
  if (!g) return null;
  g.scale(ATLAS.scale, ATLAS.scale);
  const S = ATLAS.cell;
  const glass = (x: number, y: number, w: number, h: number) => {
    g.fillStyle = '#35505a'; g.fillRect(x, y, w, h);
    g.fillStyle = '#86a9b4'; g.fillRect(x, y, w, h * .5);
  };
  const frame = (x: number, y: number, w: number, h: number) => { g.fillStyle = '#d4cdb9'; g.fillRect(x - 2, y - 2, w + 4, h + 4); };
  const sill = (x: number, y: number, w: number) => { g.fillStyle = '#ffffff'; g.fillRect(x - 3, y, w + 6, 3); g.fillStyle = '#a39d90'; g.fillRect(x - 3, y + 3, w + 6, 2); };
  const cells: Array<(ox: number, oy: number) => void> = [];
  // 0 punched window with frame and sill (canvas y is flipped: tile bottom is the floor line).
  cells[0] = (ox, oy) => { frame(ox + 11, oy + 11, 42, 36); glass(ox + 11, oy + 11, 42, 36); g.fillStyle = '#c9c3b2'; g.fillRect(ox + 31, oy + 11, 2, 36); sill(ox + 11, oy + 47, 42); };
  // 1 ribbon band with mullions.
  cells[1] = (ox, oy) => { frame(ox, oy + 17, S, 26); glass(ox, oy + 17, S, 26); g.fillStyle = '#d4cdb9'; for (let x = 0; x < S; x += 16) g.fillRect(ox + x, oy + 17, 2, 26); sill(ox - 3, oy + 43, S + 6); };
  // 2 louvred bay: window filled with slats.
  cells[2] = (ox, oy) => { frame(ox + 11, oy + 12, 42, 36); g.fillStyle = '#69787a'; g.fillRect(ox + 11, oy + 12, 42, 36); for (let y = 13; y < 48; y += 4) { g.fillStyle = '#b9c2bd'; g.fillRect(ox + 11, oy + y, 42, 2); g.fillStyle = '#4b5a5c'; g.fillRect(ox + 11, oy + y + 2, 42, 1); } sill(ox + 11, oy + 48, 42); };
  // 3 balcony bay: slab with dark underside, railing bars, glazed door and window behind.
  cells[3] = (ox, oy) => {
    frame(ox + 15, oy + 10, 34, 30); glass(ox + 15, oy + 10, 34, 30);
    g.fillStyle = '#ffffff'; g.fillRect(ox, oy + 52, S, 6); g.fillStyle = '#8f897c'; g.fillRect(ox, oy + 58, S, 4);
    g.fillStyle = 'rgba(70,64,56,.75)'; g.fillRect(ox, oy + 40, S, 2); for (let x = 3; x < S; x += 6) g.fillRect(ox + x, oy + 40, 2, 12);
  };
  // 4 plain render with faint speckle.
  cells[4] = (ox, oy) => {
    g.fillStyle = '#ffffff'; g.fillRect(ox, oy, S, S);
    for (let y = 8; y < S; y += 8) { g.fillStyle = 'rgba(120,110,95,.05)'; g.fillRect(ox, oy + y, S, 1); }
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(130,120,104,${.015 + rnd() * .03})`; g.fillRect(ox + rnd() * S, oy + rnd() * S, 1 + rnd() * 3, 1 + rnd() * 2); }
    g.fillStyle = '#d2ccbb'; g.fillRect(ox, oy, S, 2);
  };
  // 5 two small windows.
  cells[5] = (ox, oy) => { for (const x of [6, 36]) { frame(ox + x, oy + 13, 22, 32); glass(ox + x, oy + 13, 22, 32); sill(ox + x, oy + 45, 22); } };
  // 6 shopfront: tall glazing with transom.
  cells[6] = (ox, oy) => { frame(ox + 6, oy + 12, 52, 38); glass(ox + 6, oy + 12, 52, 38); g.fillStyle = '#d4cdb9'; g.fillRect(ox + 30, oy + 12, 3, 38); g.fillRect(ox + 6, oy + 24, 52, 2); g.fillStyle = '#b9b2a0'; g.fillRect(ox, oy + 52, S, 10); };
  // 7 wide punched window with a deep head shadow.
  cells[7] = (ox, oy) => { frame(ox + 6, oy + 14, 52, 30); glass(ox + 6, oy + 14, 52, 30); g.fillStyle = 'rgba(60,55,45,.35)'; g.fillRect(ox + 4, oy + 10, 56, 4); sill(ox + 6, oy + 44, 52); };
  // 8 blind panel: solid wall with a small high vent.
  cells[8] = (ox, oy) => { g.fillStyle = '#ece6d6'; g.fillRect(ox + 6, oy + 6, S - 12, S - 12); g.fillStyle = '#b8b2a0'; g.fillRect(ox + 6, oy + 6, S - 12, 2); g.fillStyle = '#6f7a78'; g.fillRect(ox + 24, oy + 16, 16, 7); for (let y = 17; y < 23; y += 2) { g.fillStyle = '#b9c2bd'; g.fillRect(ox + 24, oy + y, 16, 1); } };
  // 9 window with an air-conditioner box under the sill.
  cells[9] = (ox, oy) => { frame(ox + 11, oy + 9, 42, 28); glass(ox + 11, oy + 9, 42, 28); sill(ox + 11, oy + 37, 42); g.fillStyle = '#d8dcd8'; g.fillRect(ox + 36, oy + 44, 18, 10); g.fillStyle = '#7d8683'; g.fillRect(ox + 38, oy + 47, 14, 5); g.fillStyle = '#9a948a'; g.fillRect(ox + 36, oy + 54, 18, 2); };
  // 10 board-marked concrete: horizontal formwork boards with grain.
  cells[10] = (ox, oy) => { g.fillStyle = '#ffffff'; g.fillRect(ox, oy, S, S); for (let y = 0; y < S; y += 5) { g.fillStyle = `rgba(110,100,86,${y % 10 ? .12 : .2})`; g.fillRect(ox, oy + y, S, 1); } let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(120,108,90,${.05 + rnd() * .06})`; g.fillRect(ox + rnd() * S, oy + rnd() * S, 6 + rnd() * 16, 1); } g.fillStyle = '#cfc8b6'; g.fillRect(ox, oy, S, 2); };
  // 11 shuttered window: frame, glass and two louvred shutters folded back.
  cells[11] = (ox, oy) => { frame(ox + 17, oy + 13, 30, 33); glass(ox + 17, oy + 13, 30, 33); for (const x of [6, 47]) { g.fillStyle = '#6e8a7c'; g.fillRect(ox + x, oy + 13, 11, 33); for (let y = 15; y < 46; y += 3) { g.fillStyle = '#4f6a5d'; g.fillRect(ox + x, oy + y, 11, 1); } } sill(ox + 14, oy + 46, 36); };
  for (let i = 0; i < 12; i++) {
    const ox = (i % ATLAS.cols) * S, oy = Math.floor(i / ATLAS.cols) * S;
    g.fillStyle = '#ffffff'; g.fillRect(ox, oy, S, S);
    g.fillStyle = '#d2ccbb'; g.fillRect(ox, oy, S, 2); // ledge shadow at the top of each floor
    cells[i]?.(ox, oy);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.generateMipmaps = true; texture.anisotropy = renderTier().name === 'high' ? 16 : renderTier().name === 'phone' ? 2 : 4; // three clamps to the renderer's maximum
  texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
  return texture;
}

/** A clone of the solid material that repeats atlas cells per wall tile. */
export function facadeMaterial<M extends MeshLambertMaterial | MeshStandardMaterial>(base: M, texture: CanvasTexture): M {
  const m = base.clone() as M;
  m.map = texture;
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float aCell;\nvarying float vCell;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvCell = aCell;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vCell;').replace('#include <map_fragment>', `
      // Per-tile variation: now and then a blind panel, an AC bay or a shuttered window; per-storey and per-bay tint.
      vec2 tileId = floor(vMapUv);
      float hh = fract(sin(dot(tileId + vCell * 3.1, vec2(12.9898, 78.233))) * 43758.5453);
      float cellId = vCell;
      bool windowed = (vCell < 3.5 || (vCell > 4.5 && vCell < 7.5) || vCell > 10.5);
      if (windowed && tileId.y > .5) { if (hh > .86) cellId = 8.; else if (hh > .78) cellId = 9.; else if (hh > .72 && vCell != 11.) cellId = 11.; }
      vec2 atlasSize = vec2(4., 3.);
      vec2 cellOrigin = vec2(mod(cellId + .5, 4.), atlasSize.y - 1. - floor((cellId + .5) / 4.));
      vec2 tile = fract(vMapUv) * .9375 + .03125;
      // Distance fade: past ~70 m the cell is sampled from ever blurrier mips, then eased toward storey bands of wall tone, so far blocks read as banded facades.
      float far = smoothstep(30., 150., length(vViewPosition));
      float blur = 1. + 9. * far;
      vec4 facade = textureGrad(map, (cellOrigin + tile) / atlasSize, dFdx(vMapUv) * blur * .9375 / atlasSize, dFdy(vMapUv) * blur * .9375 / atlasSize);
      float band = mix(.74, .93, step(.36, fract(vMapUv.y)));
      facade = mix(facade, vec4(vec3(band), 1.), far * .72);
      facade.rgb *= .95 + .05 * fract(sin(tileId.y * 91.7 + vCell) * 437.58) + .03 * hh;
      facade.rgb *= mix(.76, 1., smoothstep(0., .45, vMapUv.y)); // base-of-wall occlusion on the ground storey
      diffuseColor *= facade;`);
  };
  m.customProgramCacheKey = () => 'unilag-facade-atlas';
  return m;
}

/** Add tile-space UVs and the cell index to an extruded body (non-indexed, y up). Caps and short walls get the plain cell. */
export function addWallUvs(geometry: BufferGeometry, ring: MetreRing, height: number, cell: number, seed = 0): void {
  const seedU = Math.abs(Math.imul(seed | 0, 2654435761) >>> 8) % 61; // integer tile offset: adjacent buildings never share a pattern
  const pos = geometry.attributes.position!, n = pos.count, uv = new Float32Array(n * 2), cells = new Float32Array(n).fill(PLAIN);
  const segs = [] as Array<{ ax: number; az: number; dx: number; dz: number; len: number; step: number }>;
  for (let i = 1; i < ring.length; i++) {
    const [ax, az] = ring[i - 1]!, [bx, bz] = ring[i]!, len = Math.hypot(bx - ax, bz - az);
    if (len > .01) segs.push({ ax, az, dx: (bx - ax) / len, dz: (bz - az) / len, len, step: len / baysOf(len, height) });
  }
  const fh = height / floorsOf(height);
  for (let t = 0; t < n; t += 3) {
    const p = [0, 1, 2].map((k) => [pos.getX(t + k), pos.getY(t + k), pos.getZ(t + k)] as const);
    const ny = (p[1]![2] - p[0]![2]) * (p[2]![0] - p[0]![0]) - (p[1]![0] - p[0]![0]) * (p[2]![2] - p[0]![2]); // x-z area: zero for a vertical triangle
    if (Math.abs(ny) > 1e-3) continue; // a cap, not a wall
    const cx = (p[0]![0] + p[1]![0] + p[2]![0]) / 3, cz = (p[0]![2] + p[1]![2] + p[2]![2]) / 3;
    let best = segs[0], bd = Infinity;
    for (const s of segs) {
      const along = Math.max(0, Math.min(s.len, (cx - s.ax) * s.dx + (cz - s.az) * s.dz)), d = Math.hypot(cx - s.ax - s.dx * along, cz - s.az - s.dz * along);
      if (d < bd) { bd = d; best = s; }
    }
    if (!best) continue;
    for (let k = 0; k < 3; k++) {
      const along = (p[k]![0] - best.ax) * best.dx + (p[k]![2] - best.az) * best.dz;
      uv[(t + k) * 2] = along / best.step + seedU; uv[(t + k) * 2 + 1] = p[k]![1] / fh; cells[t + k] = cell;
    }
  }
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.setAttribute('aCell', new Float32BufferAttribute(cells, 1));
}
import { Float32BufferAttribute } from 'three';
export type { Material };
