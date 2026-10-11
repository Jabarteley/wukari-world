// The house a packed number draws (game/content/world.ts packStyle writes it): read by the map, the neighbourhood scene and the house
// card, never by the rules engine, so it is not part of the engine's chunk.
import { DEFAULT_STYLE, HOUSE_STYLE, STYLE_BITS, STYLE_FIELDS, TIER_ORDER } from '../game/content/world.ts';
import type { HouseStyle, HouseTierId } from '../types/life.ts';

export function unpackStyle(bits: unknown): { tier: HouseTierId; style: HouseStyle } {
  const value = typeof bits === 'number' && Number.isSafeInteger(bits) && bits >= 0 ? bits : 0;
  const style: HouseStyle = { ...DEFAULT_STYLE };
  let shift = 3;
  for (const field of STYLE_FIELDS) { const index = (value >>> shift) & ((1 << STYLE_BITS[field]) - 1); style[field] = index < HOUSE_STYLE[field].length ? index : 0; shift += STYLE_BITS[field]; }
  // The index is clamped into TIER_ORDER, so the fallback is never used.
  return { tier: TIER_ORDER[Math.min(value & 7, TIER_ORDER.length - 1)] ?? 'starter', style };
}
