/**
 * OWNER: agents (AI residents, docs/AI-RESIDENTS.md)
 * WHO AN AI CHARACTER OF THE GAME'S OWN CAST IS, from its id alone: a house agent (`house.<city>.<key>`, server/house/cast.ts), a resident (`resident.<city>.<key>`,
 * server/residents/world.ts), or one that has left the cast after its notice (continuity-data.ts CHANGES). The feed (server/feed/service.ts) asks this to give
 * them a profile people can follow, always with the AI-played mark; the memory routes ask it so a character that left keeps its card and its memory export.
 * Pure and portable (no Node imports, no store). A cheap prefix test comes first, so the ids of people cost nothing.
 */
import { cityName } from '../../src/game/cities/registry.ts';
import { residentById } from '../residents/world.ts';
import { castOf } from './cast.ts';
import type { Role } from './cast.ts';
import { CHANGES, lagosDate } from './continuity-data.ts';
import type { Change } from './continuity-data.ts';

export type CastKind = 'house' | 'resident';
export interface CastMember {
  id: string
  name: string
  kind: CastKind
  city: string
  /** One short line for the profile ("Cloth seller at the market in Lagos"): the bio, at most 80 characters. */
  about: string
  role: Role
  voice: 'pidgin' | 'plain'
  /** Set when the character left the cast after its notice: server ms of the day it left. It keeps its card and its memory export. */
  left?: number
}

const ROLE_WORDS: Record<Role, string> = { seller: 'Trader at the market', guide: 'Guide to the city', marketer: 'Tells people what is on tonight', mission: 'Gives out small tasks', quiz: 'Hosts the evening quiz' };
const placeName = (city: string): string => { try { return cityName(city) ?? city; } catch { return city; } };
const cut = (text: string, max: number): string => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

const known = new Map<string, CastMember | null>();
/** The cast member of this id, or null for anybody else (a person, an agent-played character, an unknown id). Remembered (a generated resident is rebuilt once). */
export function castMember(id: unknown): CastMember | null {
  if (typeof id !== 'string' || id.length > 80 || !(id.startsWith('house.') || id.startsWith('resident.'))) return null;
  if (known.has(id)) return known.get(id)!;
  const found = lookUp(id);
  if (known.size >= 4000) known.clear();
  // A city's content or the catalogue may not be loaded yet: an unknown answer is not remembered, so it is asked again later.
  if (found) known.set(id, found);
  return found;
}
function lookUp(id: string): CastMember | null {
  const parts = id.split('.');
  if (parts.length !== 3) return null;
  const city = parts[1]!, key = parts[2]!;
  if (parts[0] === 'house') {
    const spec = castOf(city).find((entry) => entry.key === key);
    if (spec) return { id, name: spec.name, kind: 'house', city, role: spec.role, voice: spec.voice, about: cut(`${spec.role === 'seller' && spec.items?.length ? 'Trader' : ROLE_WORDS[spec.role]} in ${placeName(city)}`, 80) };
  } else {
    let who = null;
    try { who = residentById(id); } catch { who = null; }
    if (who) return { id, name: who.name, kind: 'resident', city: who.city, role: who.work.role, voice: 'plain', about: cut(`${who.doing ?? 'Lives and works'} in ${placeName(who.city)}`, 80) };
  }
  return leftMember(id);
}

/** A character that left the cast after its notice (continuity-data.ts): its name and the day it left, so its card and memory export stay. */
export function leftMember(id: string, changes: readonly Change[] = CHANGES): CastMember | null {
  const change = changes.find((entry) => entry.what === 'leave' && entry.id === id);
  if (!change) return null;
  const parts = id.split('.');
  return { id, name: change.name, kind: parts[0] === 'resident' ? 'resident' : 'house', city: parts[1] ?? '', role: 'guide', voice: 'plain', about: cut(`Left ${placeName(parts[1] ?? '')}`, 80), left: lagosDate(change.effective) };
}

/** Is this the id of one of the game's own AI characters (still in the cast, or left after its notice)? */
export const isCastId = (id: unknown): boolean => castMember(id) !== null;
