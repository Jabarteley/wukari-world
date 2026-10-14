/**
 * OWNER: scenes
 * Street life, personal space for the near crowd (zoom polish). Pure: no Three.js, no DOM. The far crowd's lanes are bands, and people
 * keep to a random place across them, so two skinned bodies (which are solid, unlike cut-outs) can meet: walkers who pass head on, a
 * quick walker overtaking a slow one in the same half of a band, a family pair beside a stranger. The cut-out never showed it. This
 * keeps every pair of near bodies at least `minGap` apart (their two body radii plus a margin), as plain functions of where they stand:
 *
 *   - Walkers who meet (headings parallel or head on, or one standing still) SIDESTEP: sideways to their own heading, each to the side
 *     they already are on, starting before they touch (the sideways room needed grows from nothing at 1.5 gaps along to a whole gap
 *     when level), so a pair bends round each other rather than being shoved along the lane. Pairs crossing at an angle, and people
 *     standing, are simply pushed apart along the line between them.
 *   - A parent and child keep a small fixed margin (FAMILY_GAP), the plan's own spacing already clears it; they never touch each other
 *     or anyone else.
 *   - A body that would be pushed off the scene's floor stays where it is and the other gives way (spaceNear).
 *
 * It depends only on the positions (sorted by id, so the order they come in is no matter) and is continuous in them: no one jumps as
 * a pair closes, so it is safe to run every frame, on every device, with no state.
 */

/** Scene units to a metre (a person is about 2.6 tall: 1.8 m). */
export const METRE = 2.6 / 1.8;
/** The room kept between two bodies' edges: 25 cm between strangers, 5 cm between a parent and child who walk together. */
export const BODY_GAP = 0.25 * METRE, FAMILY_GAP = 0.05 * METRE;
/** A person's footprint radius from their height and the cut-out's width factor (about 20 cm for an adult). */
export const bodyRadius = (height: number, width: number): number => 0.11 * height * (0.6 + 0.4 * width);

export interface Placed {
  id: number
  x: number
  z: number
  /** Facing (a rotation.y: they look along (sin ry, cos ry)). */
  ry: number
  radius: number
  /** Walking (the pose's mode 0). */
  moving: boolean
  family?: number | undefined
}
export interface Spot { x: number; z: number }

/** The least distance between the centres of two bodies. */
export const minGap = (a: Placed, b: Placed): number => a.radius + b.radius + (a.family !== undefined && a.family === b.family ? FAMILY_GAP : BODY_GAP);

/** How far in front or behind (in gaps) a sidestep begins, and how much of their way a standing person gives (a walker gives the rest). */
export const REACH = 1.5, STILL_GIVE = 0.3;
const PASSES = 16, FINISH = 60, EPS = 1e-9, SLACK = 1e-7;
/** Headings this close to parallel (or head on) take the sidestep; the cosine of the angle. */
const PARALLEL = 0.9;

/**
 * Where each body stands once no two are closer than minGap (the same order as `items`; positions that are not finite are left alone).
 * `fixed` ids do not move (the others give way for them). Relaxation: the sidestep pass for walkers, then straight pushes to finish;
 * with room to move it ends with every pair clear, and a pair only ever moves if it is within reach of touching.
 */
export function separate(items: readonly Placed[], fixed: ReadonlySet<number> = new Set()): Spot[] {
  const pos = items.map((p) => ({ x: p.x, z: p.z }));
  const order = items.map((p, i) => i).filter((i) => Number.isFinite(items[i]!.x) && Number.isFinite(items[i]!.z)).sort((a, b) => items[a]!.id - items[b]!.id);
  const weight = (i: number): number => (fixed.has(items[i]!.id) ? 0 : items[i]!.moving ? 1 : STILL_GIVE);
  /** Move a and b along (dx, dz) (a unit vector from a to b) by `amount` in all, shared by weight. */
  const push = (a: number, b: number, dx: number, dz: number, amount: number): boolean => {
    const wa = weight(a), wb = weight(b), sum = wa + wb;
    if (!(sum > 0) || !(amount > EPS)) return false;
    pos[a]!.x -= (dx * amount * wa) / sum; pos[a]!.z -= (dz * amount * wa) / sum;
    pos[b]!.x += (dx * amount * wb) / sum; pos[b]!.z += (dz * amount * wb) / sum;
    return true;
  };
  /** The pair's straight push when they overlap. */
  const radial = (a: number, b: number): boolean => {
    const pa = pos[a]!, pb = pos[b]!, need = minGap(items[a]!, items[b]!);
    let dx = pb.x - pa.x, dz = pb.z - pa.z;
    const d = Math.hypot(dx, dz);
    if (d >= need) return false;
    if (d > 1e-6) { dx /= d; dz /= d; } else { const ry = items[a]!.ry; dx = Math.cos(ry); dz = -Math.sin(ry); }
    return push(a, b, dx, dz, need - d + SLACK);
  };
  /** The pair's sidestep: across the heading of whoever walks, for as long as they are within reach of touching. */
  const sidestep = (a: number, b: number): boolean => {
    const A = items[a]!, B = items[b]!;
    if (!A.moving && !B.moving) return radial(a, b);
    if (A.moving && B.moving && Math.abs(Math.sin(A.ry) * Math.sin(B.ry) + Math.cos(A.ry) * Math.cos(B.ry)) < PARALLEL) return radial(a, b);
    const lead = A.moving ? A : B, ux = Math.sin(lead.ry), uz = Math.cos(lead.ry);
    const need = minGap(A, B), pa = pos[a]!, pb = pos[b]!, dx = pb.x - pa.x, dz = pb.z - pa.z;
    const along = dx * ux + dz * uz, side = dx * uz - dz * ux;
    if (Math.abs(along) >= REACH * need) return false;
    // The sideways room wanted: a whole gap when level, less as they are further apart along (never less than a touch needs).
    const room = need * (1 - (along / (REACH * need)) ** 2), short = room - Math.abs(side);
    if (!(short > EPS)) return false;
    // Each keeps to the side they are on; level and exactly beside, the lower id goes to the heading's left.
    const sign = Math.abs(side) > 1e-6 ? Math.sign(side) : A.id < B.id ? 1 : -1;
    return push(a, b, sign * uz, -sign * ux, short);
  };
  for (let pass = 0; pass < PASSES; pass++) {
    let moved = false;
    for (let x = 0; x < order.length; x++) for (let y = x + 1; y < order.length; y++) if (sidestep(order[x]!, order[y]!)) moved = true;
    if (!moved) break;
  }
  for (let pass = 0; pass < FINISH; pass++) {
    let moved = false;
    for (let x = 0; x < order.length; x++) for (let y = x + 1; y < order.length; y++) if (radial(order[x]!, order[y]!)) moved = true;
    if (!moved) break;
  }
  return pos;
}

/** The body's footprint of a person (crowd.ts Person: height and width), placed. */
export function placed(id: number, person: { height: number; width: number; family?: number | undefined }, pose: { x: number; z: number; ry: number; mode: number }): Placed {
  return { id, x: pose.x, z: pose.z, ry: pose.ry, radius: bodyRadius(person.height, person.width), moving: pose.mode === 0, family: person.family };
}

/**
 * The same, kept on the floor: whoever the first answer would put off the walkable floor stays where they are (they are on it now:
 * near.ts nearCandidates) and the others give way; anyone still off it after that stays put too.
 */
export function spaceNear(items: readonly Placed[], walkable: ((x: number, z: number) => boolean) | null | undefined): Spot[] {
  let out = separate(items);
  if (!walkable) return out;
  const off = (i: number): boolean => (out[i]!.x !== items[i]!.x || out[i]!.z !== items[i]!.z) && !walkable(out[i]!.x, out[i]!.z);
  const first = new Set(items.flatMap((p, i) => (off(i) ? [p.id] : [])));
  if (!first.size) return out;
  out = separate(items, first);
  return out.map((spot, i) => (first.has(items[i]!.id) || (!walkable(spot.x, spot.z)) ? { x: items[i]!.x, z: items[i]!.z } : spot));
}
