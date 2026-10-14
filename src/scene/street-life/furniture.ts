/**
 * OWNER: scenes
 * Street life: street furniture (zoom phase 3b). Pure. Along one pavement's kerb line: lamp posts, trees in pits, bins, benches, the
 * flag on its pole, bollards at the crossings and the zebra stripes of a crossing the street does not paint itself; planters between
 * the shop bays. Planned as instanced parts (parts.ts), kept clear of what the street already has there (`avoid`), off the crossings,
 * and off the pedestrian lanes (the line is the kerb's edge; planters stand against the shop walls).
 */
import { makeRng } from '../../game/util.ts';
import { FLAG_CELL, emptyParts } from './parts.ts';
import type { Parts } from './parts.ts';
import type { Bay } from './shopfronts.ts';
import { countryKey } from './livery.ts';

export type FurnitureKind = 'lamp' | 'tree' | 'bin' | 'bench' | 'flag' | 'bollard' | 'planter';
export interface FurnitureItem { kind: FurnitureKind; x: number; z: number }
/** A crossing of the road: at x, from the near kerb z0 to the far kerb z1; `paint` when its stripes are ours to draw. */
export interface CrossingSpec { x: number; z0: number; z1: number; paint: boolean }
export interface FurnitureInput {
  /** The street runs from −half to +half along x. */
  half: number
  /** The kerb line the furniture stands on, and which way the road lies from it (−1: toward −z). */
  lineZ: number
  road: 1 | -1
  /** The ground's height there. */
  base?: number
  crossings: readonly CrossingSpec[]
  /** What already stands on the pavement (poles, kiosks, palms): kept clear by r plus SLOT_CLEAR. */
  avoid: readonly { x: number; z: number; r: number }[]
  /** Where the flag would best stand (the nearest free slot takes it). */
  flagX: number
  seed: string
}
/** The slots' spacing along the line, the room kept from anything there already, and from a crossing's centre. */
export const SLOT = 8, SLOT_CLEAR = 1.4, CROSSING_CLEAR = 2.6;
const PATTERN: readonly FurnitureKind[] = ['lamp', 'tree', 'bench', 'tree'];
const CANOPIES = ['#4f7a3a', '#5d8a44', '#46703a', '#6a9450'] as const;

/** The furniture's places: one slot every SLOT along the line, by a repeating pattern, skipping any slot too near something. */
export function planFurniture(input: FurnitureInput): FurnitureItem[] {
  const { half, lineZ, road, crossings, avoid } = input, out: FurnitureItem[] = [];
  const free = (x: number, z: number): boolean => avoid.every((a) => Math.hypot(a.x - x, a.z - z) >= a.r + SLOT_CLEAR) && crossings.every((c) => Math.abs(c.x - x) >= CROSSING_CLEAR);
  const slots: number[] = [];
  for (let x = -half + 4; x <= half - 4; x += SLOT) if (free(x, lineZ)) slots.push(x);
  const flagAt = slots.length ? slots.reduce((best, x) => Math.abs(x - input.flagX) < Math.abs(best - input.flagX) ? x : best, slots[0]!) : null;
  slots.forEach((x, i) => {
    const kind: FurnitureKind = x === flagAt ? 'flag' : PATTERN[Math.round((x + half - 4) / SLOT) % PATTERN.length]!;
    out.push({ kind, x, z: lineZ });
    if (kind === 'lamp' && i % 2 === 0 && free(x + 1.3, lineZ)) out.push({ kind: 'bin', x: x + 1.3, z: lineZ });
  });
  // Bollards each side of every crossing, on both kerbs (just inside the kerb edge).
  for (const c of crossings) for (const side of [-1, 1]) for (const z of [c.z0 - 0.15, c.z1 + 0.15]) out.push({ kind: 'bollard', x: c.x + side * 1.8, z });
  void road;
  return out;
}

/** Planters against the shop walls between bays (at most one per bay, on the side away from its door). */
export function planters(bays: readonly Bay[]): FurnitureItem[] {
  return bays.filter((_, i) => i % 2 === 1).map((bay) => ({ kind: 'planter' as const, x: bay.x - bay.door * (bay.width / 2 - 0.55), z: bay.z + bay.facing * 0.3 }));
}

/** A flag of plain bands (and a disc), for the countries whose flag is that simple; any other gets the Allworld banner. */
export interface FlagSpec { bands: readonly string[]; vertical: boolean; disc?: string }
export const FLAGS: Readonly<Record<string, FlagSpec>> = Object.freeze({
  ng: { bands: ['#008751', '#ffffff', '#008751'], vertical: true },
  fr: { bands: ['#002395', '#ffffff', '#ed2939'], vertical: true },
  it: { bands: ['#009246', '#ffffff', '#ce2b37'], vertical: true },
  ie: { bands: ['#169b62', '#ffffff', '#ff883e'], vertical: true },
  be: { bands: ['#000000', '#fdda24', '#ef3340'], vertical: true },
  td: { bands: ['#002664', '#fecb00', '#c60c30'], vertical: true },
  ml: { bands: ['#14b53a', '#fcd116', '#ce1126'], vertical: true },
  gn: { bands: ['#ce1126', '#fcd116', '#009460'], vertical: true },
  ci: { bands: ['#f77f00', '#ffffff', '#009e60'], vertical: true },
  ro: { bands: ['#002b7f', '#fcd116', '#ce1126'], vertical: true },
  de: { bands: ['#000000', '#dd0000', '#ffce00'], vertical: false },
  nl: { bands: ['#ae1c28', '#ffffff', '#21468b'], vertical: false },
  ru: { bands: ['#ffffff', '#0039a6', '#d52b1e'], vertical: false },
  ua: { bands: ['#0057b7', '#ffd700'], vertical: false },
  id: { bands: ['#ff0000', '#ffffff'], vertical: false },
  mc: { bands: ['#ce1126', '#ffffff'], vertical: false },
  pl: { bands: ['#ffffff', '#dc143c'], vertical: false },
  at: { bands: ['#ed2939', '#ffffff', '#ed2939'], vertical: false },
  ee: { bands: ['#0072ce', '#000000', '#ffffff'], vertical: false },
  lt: { bands: ['#fdb913', '#006a44', '#c1272d'], vertical: false },
  ga: { bands: ['#009e60', '#fcd116', '#3a75c4'], vertical: false },
  jp: { bands: ['#ffffff'], vertical: false, disc: '#bc002d' },
  bd: { bands: ['#006a4e'], vertical: false, disc: '#f42a41' },
  pw: { bands: ['#4aadd6'], vertical: false, disc: '#ffde00' },
});
export const ALLWORLD_FLAG: FlagSpec = Object.freeze({ bands: ['#1f4f9a'], vertical: false, disc: '#ffffff' });
export const flagFor = (country: string | null | undefined): FlagSpec => FLAGS[countryKey(country)] ?? ALLWORLD_FLAG;

/** The furniture as parts, plus the stripes of the crossings it paints. */
export function furnitureParts(items: readonly FurnitureItem[], crossings: readonly CrossingSpec[], road: 1 | -1, seed: string, base = 0.05): Parts {
  const p = emptyParts(), next = makeRng(`street-life|furniture|${seed}`);
  for (const item of items) {
    const { x, z } = item;
    switch (item.kind) {
      case 'lamp':
        p.boxes.push({ x, y: base + 0.2, z, w: 0.3, h: 0.4, d: 0.3, ry: 0, colour: '#2b2f33' });
        p.boxes.push({ x, y: base + 2.6, z, w: 0.14, h: 5.2, d: 0.14, ry: 0, colour: '#3a3f44' });
        p.boxes.push({ x, y: base + 5.12, z: z + road * 0.6, w: 0.1, h: 0.1, d: 1.2, ry: 0, colour: '#3a3f44' });
        p.glows.push({ x, y: base + 5.02, z: z + road * 1.15, w: 0.34, h: 0.12, d: 0.5, ry: 0, colour: '#fff1c9' });
        break;
      case 'tree': {
        const r = 1.3 + next() * 0.5, colour = CANOPIES[Math.floor(next() * CANOPIES.length) % CANOPIES.length]!;
        p.boxes.push({ x, y: base + 0.015, z, w: 1.1, h: 0.03, d: 1.1, ry: 0, colour: '#3a3d3a' });
        p.boxes.push({ x, y: base + 1.4, z, w: 0.22, h: 2.8, d: 0.22, ry: 0, colour: '#6b4a2f' });
        p.blobs.push({ x, y: base + 3.4 + r * 0.5, z, r, colour });
        p.blobs.push({ x: x + 0.5, y: base + 3.0 + r * 0.3, z: z - 0.3, r: r * 0.7, colour });
        break;
      }
      case 'bin':
        p.boxes.push({ x, y: base + 0.45, z, w: 0.5, h: 0.9, d: 0.5, ry: 0, colour: '#2f4f3a' });
        p.boxes.push({ x, y: base + 0.94, z, w: 0.56, h: 0.08, d: 0.56, ry: 0, colour: '#1f2a22' });
        break;
      case 'bench':
        // A bench along the kerb, its back to the road: people sit facing the shops.
        p.boxes.push({ x, y: base + 0.45, z, w: 1.7, h: 0.07, d: 0.45, ry: 0, colour: '#8a6a4a' });
        p.boxes.push({ x, y: base + 0.75, z: z + road * 0.2, w: 1.7, h: 0.4, d: 0.06, ry: 0, colour: '#8a6a4a' });
        for (const side of [-1, 1]) p.boxes.push({ x: x + side * 0.7, y: base + 0.22, z, w: 0.08, h: 0.44, d: 0.42, ry: 0, colour: '#2b2f33' });
        break;
      case 'flag':
        p.boxes.push({ x, y: base + 0.15, z, w: 0.5, h: 0.3, d: 0.5, ry: 0, colour: '#b9b09b' });
        p.boxes.push({ x, y: base + 3.6, z, w: 0.12, h: 7.2, d: 0.12, ry: 0, colour: '#d9d9d9' });
        p.quads.push({ x: x + 0.98, y: base + 6.5, z, w: 1.8, h: 1.2, ry: 0, cell: FLAG_CELL });
        break;
      case 'bollard':
        p.boxes.push({ x, y: base + 0.45, z, w: 0.16, h: 0.9, d: 0.16, ry: 0, colour: '#2b2b2b' });
        p.boxes.push({ x, y: base + 0.82, z, w: 0.18, h: 0.1, d: 0.18, ry: 0, colour: '#e8b923' });
        break;
      case 'planter':
        p.boxes.push({ x, y: base + 0.25, z, w: 0.9, h: 0.5, d: 0.4, ry: 0, colour: '#8f8a80' });
        p.blobs.push({ x, y: base + 0.75, z, r: 0.42, colour: '#4f7a3a' });
        break;
    }
  }
  // Zebra stripes across the road, like the junction's (road surface at 0).
  for (const c of crossings) if (c.paint) for (let z = Math.min(c.z0, c.z1) + 1.25; z < Math.max(c.z0, c.z1) - 1.05; z += 1.1) {
    p.boxes.push({ x: c.x, y: 0.012, z: z + 0.32, w: 2.8, h: 0.012, d: 0.65, ry: 0, colour: '#e9e6d6' });
  }
  return p;
}
