/**
 * OWNER: scenes
 * Street life: the city's own taxis and buses (zoom phase 3b). Pure. A small table keyed by the city's country id (ISO 3166 two
 * letters, lower case, as the city rules carry it: 'ng', 'gb', 'us'), with a default for every country not in it. A livery is a body
 * colour and a trim (the stripe round the body; the roof sign shows on taxis), and for some countries a share of the cars are tricycle
 * taxis (keke, auto, tuk-tuk) in their own colours. Generic colours only: no operator's marks or names.
 */
import { makeRng } from '../../game/util.ts';
import { CAR_LENGTH, VEHICLE_KINDS } from './plan.ts';
import type { Vehicle, VehicleKind } from './plan.ts';

export interface Paint { body: string; trim: string }
export interface Livery {
  taxi: readonly Paint[]
  bus: readonly Paint[]
  /** Tricycle taxis and the share of the cars they replace. */
  trike?: readonly Paint[]
  trikeShare?: number
}

export const DEFAULT_LIVERY: Livery = Object.freeze({
  taxi: [{ body: '#f2c12e', trim: '#1d1f22' }],
  bus: [{ body: '#e9edf2', trim: '#2b5c9a' }],
});

export const LIVERIES: Readonly<Record<string, Livery>> = Object.freeze({
  // Nigeria: yellow taxis with a black band (Lagos) and green and white ones (Abuja); yellow danfo buses; green and white keke.
  ng: { taxi: [{ body: '#f2c12e', trim: '#1d1f22' }, { body: '#2f8f4e', trim: '#f4f4ef' }], bus: [{ body: '#e5b52b', trim: '#1d1f22' }], trike: [{ body: '#2f8f4e', trim: '#f4f4ef' }, { body: '#f2c12e', trim: '#2f8f4e' }], trikeShare: 0.45 },
  // United States: yellow cabs; white and blue city buses.
  us: { taxi: [{ body: '#f7c600', trim: '#1d1f22' }], bus: [{ body: '#eef0f2', trim: '#1f4f9a' }] },
  // Britain: black cabs; red buses.
  gb: { taxi: [{ body: '#17191c', trim: '#17191c' }], bus: [{ body: '#c8102e', trim: '#c8102e' }] },
  ie: { taxi: [{ body: '#d9dde2', trim: '#f2c12e' }], bus: [{ body: '#f2c12e', trim: '#1f6f4a' }] },
  ca: { taxi: [{ body: '#f4f4ef', trim: '#2b5c9a' }], bus: [{ body: '#d8232a', trim: '#f4f4ef' }] },
  fr: { taxi: [{ body: '#1d1f22', trim: '#1d1f22' }, { body: '#f1efe9', trim: '#f1efe9' }], bus: [{ body: '#eef0f2', trim: '#3a8f6a' }] },
  de: { taxi: [{ body: '#f1e7c3', trim: '#f1e7c3' }], bus: [{ body: '#f2c12e', trim: '#f2c12e' }] },
  it: { taxi: [{ body: '#f4f4ef', trim: '#f4f4ef' }], bus: [{ body: '#d9822b', trim: '#eef0f2' }] },
  es: { taxi: [{ body: '#f4f4ef', trim: '#c8102e' }, { body: '#1d1f22', trim: '#f2c12e' }], bus: [{ body: '#c8102e', trim: '#eef0f2' }] },
  jp: { taxi: [{ body: '#1b1c20', trim: '#1b1c20' }, { body: '#2f7a4e', trim: '#f2c12e' }], bus: [{ body: '#eef0f2', trim: '#2f7a4e' }] },
  kr: { taxi: [{ body: '#f08a24', trim: '#f08a24' }, { body: '#e9ebee', trim: '#e9ebee' }], bus: [{ body: '#1f5fa8', trim: '#f4f4ef' }, { body: '#3aa655', trim: '#f4f4ef' }] },
  cn: { taxi: [{ body: '#f2c12e', trim: '#2b5c9a' }, { body: '#2f8f6e', trim: '#f4f4ef' }], bus: [{ body: '#eef0f2', trim: '#c8102e' }] },
  in: { taxi: [{ body: '#1d1f22', trim: '#f2c12e' }], bus: [{ body: '#c8102e', trim: '#eef0f2' }], trike: [{ body: '#2f7d32', trim: '#f2c12e' }], trikeShare: 0.5 },
  th: { taxi: [{ body: '#e8458b', trim: '#e8458b' }, { body: '#8fd14f', trim: '#f2c12e' }], bus: [{ body: '#d9822b', trim: '#eef0f2' }], trike: [{ body: '#2b5c9a', trim: '#f2c12e' }], trikeShare: 0.3 },
  ph: { taxi: [{ body: '#f4f4ef', trim: '#f2c12e' }], bus: [{ body: '#c9ccd1', trim: '#d92b2b' }], trike: [{ body: '#d92b2b', trim: '#f4f4ef' }], trikeShare: 0.35 },
  id: { taxi: [{ body: '#2f7fd1', trim: '#2f7fd1' }], bus: [{ body: '#1f5fa8', trim: '#eef0f2' }], trike: [{ body: '#2f8f4e', trim: '#f4f4ef' }], trikeShare: 0.2 },
  sg: { taxi: [{ body: '#1f6fb5', trim: '#1f6fb5' }, { body: '#f2c12e', trim: '#f2c12e' }], bus: [{ body: '#8a2a8f', trim: '#eef0f2' }] },
  mx: { taxi: [{ body: '#e04a8a', trim: '#f4f4ef' }], bus: [{ body: '#c8102e', trim: '#eef0f2' }] },
  br: { taxi: [{ body: '#f2c12e', trim: '#2b5c9a' }, { body: '#f4f4ef', trim: '#f4f4ef' }], bus: [{ body: '#eef0f2', trim: '#2f8f4e' }] },
  ar: { taxi: [{ body: '#1d1f22', trim: '#f2c12e' }], bus: [{ body: '#2b5c9a', trim: '#f2c12e' }] },
  eg: { taxi: [{ body: '#f1efe9', trim: '#1d1f22' }], bus: [{ body: '#eef0f2', trim: '#c8102e' }], trike: [{ body: '#c8102e', trim: '#f4f4ef' }], trikeShare: 0.2 },
  gh: { taxi: [{ body: '#d9d6cf', trim: '#e07a2e' }], bus: [{ body: '#eef0f2', trim: '#2f8f4e' }] },
  ke: { taxi: [{ body: '#f4f4ef', trim: '#f2c12e' }], bus: [{ body: '#2b2b2b', trim: '#e5b52b' }, { body: '#7b4b94', trim: '#f2c12e' }] },
  za: { taxi: [{ body: '#f4f4ef', trim: '#f4f4ef' }], bus: [{ body: '#eef0f2', trim: '#2f8f4e' }] },
  tr: { taxi: [{ body: '#f2c12e', trim: '#f2c12e' }], bus: [{ body: '#eef0f2', trim: '#2b5c9a' }] },
  ru: { taxi: [{ body: '#f2c12e', trim: '#1d1f22' }], bus: [{ body: '#eef0f2', trim: '#2b5c9a' }] },
  ua: { taxi: [{ body: '#f2c12e', trim: '#2b5c9a' }], bus: [{ body: '#2b5c9a', trim: '#f2c12e' }] },
  au: { taxi: [{ body: '#f4f4ef', trim: '#f2c12e' }], bus: [{ body: '#eef0f2', trim: '#2f7fd1' }] },
});

/** The table's key for a country id: lower case, and the old 'nigeria' id of Nigeria's cities. */
export function countryKey(country: string | null | undefined): string {
  const key = (country ?? '').trim().toLowerCase();
  return key === 'nigeria' ? 'ng' : key;
}
export const liveryFor = (country: string | null | undefined): Livery => LIVERIES[countryKey(country)] ?? DEFAULT_LIVERY;

/** A planned vehicle in its city's paint: its trim, and whether it carries a taxi's roof sign. */
export interface PaintedVehicle extends Vehicle { trim: string; sign: boolean }

/**
 * The traffic in its country's livery. Taxis and buses take the livery's paints; cars and trucks keep theirs (trim = body). Where the
 * country has tricycle taxis a share of the cars become one, shorter than the car they replace, so no two vehicles can touch.
 */
export function paintTraffic(vehicles: readonly Vehicle[], country: string | null | undefined, seed: string): PaintedVehicle[] {
  const livery = liveryFor(country), next = makeRng(`street-life|livery|${seed}|${countryKey(country)}`);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(next() * list.length) % list.length] as T;
  return vehicles.map((vehicle) => {
    const roll = next();
    if (vehicle.kind === 'taxi') { const paint = pick(livery.taxi); return { ...vehicle, colour: paint.body, trim: paint.trim, sign: true }; }
    if (vehicle.kind === 'bus') { const paint = pick(livery.bus); return { ...vehicle, colour: paint.body, trim: paint.trim, sign: false }; }
    if (vehicle.kind === 'car' && livery.trike?.length && roll < (livery.trikeShare ?? 0)) {
      const paint = pick(livery.trike), kind: VehicleKind = 'keke';
      return { ...vehicle, kind, length: CAR_LENGTH * VEHICLE_KINDS.keke.length, colour: paint.body, trim: paint.trim, sign: false };
    }
    return { ...vehicle, trim: vehicle.colour, sign: false };
  });
}
