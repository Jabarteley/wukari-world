/**
 * OWNER: social
 * THE CLAN'S VENUE ROOM (docs/CLANS.md). A clan of CLAN.venueMin or more may hold a room in one public venue of a city. It is not a
 * new place: in that venue the clan's members are seated together in one of the venue's groups (server/ws/groups.ts treats them like
 * friends), and that group carries the clan's name and colour in the venue's group list. The venue stays open to everyone else, who
 * are seated in its other groups as usual. Read by server/ws/rooms.ts when a player joins a venue. Portable: no Node imports.
 */
import { COLOURS, colourOf } from '../../src/clans/clan.ts';
import { peekClans } from './data.ts';
import type { Db } from '../types.ts';

export interface VenueHold { clan: string; name: string; hex: string; members: string[] }

/** The clan room this player's clan holds in this venue, or null. */
export function clanVenueOf(db: Db, player: string, city: string, venue: string): VenueHold | null {
  const c = peekClans(db), key = c?.players?.[player]?.clan, clan = key ? c?.clans?.[key] : undefined;
  if (!clan?.venue || clan.venue.city !== city || clan.venue.venue !== venue || !clan.members.includes(player)) return null;
  return { clan: clan.id, name: clan.name, hex: (colourOf(clan.colour) ?? COLOURS[0])?.hex ?? '#888888', members: [...clan.members] };
}
