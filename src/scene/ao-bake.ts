/**
 * OWNER: scenes
 * Baked ambient occlusion in vertex colours. Zero runtime cost: it multiplies the colour of each
 * vertex once, when a batch is built (src/scene/build.ts calls it for every scene), so the same
 * flat-lit geometry reads as grounded and as having corners.
 *
 * Three terms, all multiplicative and clamped so thin props never blacken (AO_FLOOR):
 *   ground    side and under faces darken towards the floor plane (exp falloff with height)
 *   under     faces that look down are a little darker
 *   probes    a few points along hemisphere directions are tested against the batch's own primitive
 *             boxes through a coarse grid: a point inside another primitive counts as occluded.
 *             Capped by a vertex budget (not a clock) so the result is deterministic.
 *
 * For a mesh built outside a batch (the campus), call bakeVertexAO(pos, nor, col) with plain arrays;
 * with no primitives only the ground and under terms apply.
 */
export interface AoPrim { id: number; start: number; count: number; min: [number, number, number]; max: [number, number, number] }
export interface AoOptions { groundY?: number; strength?: number; probeBudget?: number }
export const AO_FLOOR = 0.58;
const CELL = 0.8, BIG_CELLS = 48;
// Fixed unit directions, spread over a sphere; flipped into the vertex's hemisphere.
const DIRS: readonly [number, number, number][] = [
  [0.577, 0.577, 0.577], [-0.577, 0.577, -0.577], [0.707, 0.2, -0.68], [-0.69, 0.3, 0.66], [0.15, 0.95, 0.27], [0.93, 0.1, 0.35],
];
const PROBE_T = [0.2, 0.55] as const;

export interface Occluders { hit(x: number, y: number, z: number, skip: number): boolean }
/** Index primitives by grid cell; very large ones (floors, long walls) go in a short list tested every time. */
export function createOccluders(prims: readonly AoPrim[]): Occluders {
  const grid = new Map<number, AoPrim[]>(), big: AoPrim[] = [];
  const key = (i: number, j: number, k: number) => ((i + 512) * 1024 + (j + 512)) * 1024 + (k + 512);
  for (const p of prims) {
    const i0 = Math.floor(p.min[0] / CELL), i1 = Math.floor(p.max[0] / CELL), j0 = Math.floor(p.min[1] / CELL), j1 = Math.floor(p.max[1] / CELL), k0 = Math.floor(p.min[2] / CELL), k1 = Math.floor(p.max[2] / CELL);
    if ((i1 - i0 + 1) * (j1 - j0 + 1) * (k1 - k0 + 1) > BIG_CELLS) { big.push(p); continue; }
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) {
      const id = key(i, j, k); const cell = grid.get(id); if (cell) cell.push(p); else grid.set(id, [p]);
    }
  }
  const inside = (p: AoPrim, x: number, y: number, z: number) => x > p.min[0] && x < p.max[0] && y > p.min[1] && y < p.max[1] && z > p.min[2] && z < p.max[2];
  return {
    hit(x, y, z, skip) {
      const cell = grid.get(key(Math.floor(x / CELL), Math.floor(y / CELL), Math.floor(z / CELL)));
      if (cell) for (const p of cell) if (p.id !== skip && inside(p, x, y, z)) return true;
      for (const p of big) if (p.id !== skip && inside(p, x, y, z)) return true;
      return false;
    },
  };
}

/** Multiply `col` (rgb per vertex) by the occlusion at each vertex. Returns how many vertices were probed. */
export function bakeVertexAO(pos: ArrayLike<number>, nor: ArrayLike<number>, col: number[] | Float32Array, prims: readonly AoPrim[] = [], occluders?: Occluders, { groundY = 0, strength = 1, probeBudget = 30000 }: AoOptions = {}): number {
  let probed = 0;
  for (const prim of prims.length ? prims : [{ id: -1, start: 0, count: pos.length / 3, min: [0, 0, 0], max: [0, 0, 0] } as AoPrim]) {
    // Small props get less of the ground term so a pot or a sign is shaded, not blackened.
    const extent = Math.max(prim.max[0] - prim.min[0], prim.max[1] - prim.min[1], prim.max[2] - prim.min[2]);
    const scale = prims.length ? Math.min(1, 0.4 + extent * 0.6) : 1;
    const probe = !!occluders && probed < probeBudget && extent > 0.1;
    for (let v = prim.start; v < prim.start + prim.count; v++) {
      const x = pos[v * 3]!, y = pos[v * 3 + 1]!, z = pos[v * 3 + 2]!, nx = nor[v * 3]!, ny = nor[v * 3 + 1]!, nz = nor[v * 3 + 2]!;
      const side = 1 - Math.max(0, ny);
      let f = 1 - 0.24 * Math.exp(-Math.max(0, y - groundY) / 0.45) * side * scale;
      f *= 1 - 0.16 * Math.max(0, -ny) * scale;
      if (probe) {
        let occ = 0;
        for (const d of DIRS) {
          let dx = d[0], dy = d[1], dz = d[2];
          if (dx * nx + dy * ny + dz * nz < 0) { dx = -dx; dy = -dy; dz = -dz; }
          if (occluders!.hit(x + dx * PROBE_T[0] + nx * 0.02, y + dy * PROBE_T[0] + ny * 0.02, z + dz * PROBE_T[0] + nz * 0.02, prim.id)) occ += 1;
          else if (occluders!.hit(x + dx * PROBE_T[1], y + dy * PROBE_T[1], z + dz * PROBE_T[1], prim.id)) occ += 0.5;
        }
        f *= 1 - 0.34 * (occ / DIRS.length) * scale;
        probed++;
      }
      f = Math.max(strength > 1 ? 0.42 : AO_FLOOR, 1 - (1 - Math.max(AO_FLOOR, f)) * strength);
      col[v * 3] = col[v * 3]! * f; col[v * 3 + 1] = col[v * 3 + 1]! * f; col[v * 3 + 2] = col[v * 3 + 2]! * f;
    }
  }
  return probed;
}
