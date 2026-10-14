/**
 * OWNER: social
 * The sentences of the people screens: what a person's status reads as, and the line above a list of people.
 * Apart from social-model.ts on purpose: only screens that are fetched on demand read them, so they are not part of
 * the first download (vite.config.ts). Pure; tested with the model in social.test.ts and live.test.ts.
 */
import type { PeopleListing, PresenceStatus } from '../types/social.ts';

/** One definition of each presence word, used everywhere a player's status is shown. */
/** One presence word: what it says, the dot class and the hint. */
export interface PresenceEntry {
  label: string
  dot: string
  hint: string
}
export const PRESENCE: Readonly<Record<PresenceStatus, PresenceEntry>> = Object.freeze({
  online: { label: 'Online', dot: 'on', hint: 'Connected and in a venue right now.' },
  away: { label: 'Away', dot: 'away', hint: 'Connected, but travelling or between places.' },
  reconnecting: { label: 'Reconnecting…', dot: 'wait', hint: 'Their connection dropped a moment ago. They may be back within seconds.' },
  offline: { label: 'Offline', dot: 'off', hint: 'Not connected.' },
});

/** How long ago a server time was, from the server's `now`: "just now", "5 min ago", "3 h ago", "2 days ago". */
export function agoText(at: number, now: number): string {
  const minutes = Math.floor(Math.max(0, now - at) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} h ago`;
  const days = Math.floor(minutes / 1440);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** PRESENCE read by an arbitrary status word, as the people list reports it. */
const presenceByStatus: Readonly<Record<string, PresenceEntry | undefined>> = PRESENCE;

/**
 * "Online · Freedom Park", "Online · at home", "Online · visiting a friend", "Away", "Reconnecting…",
 * "Offline". Given the server's `now`, an offline player whose listing carries `seenAt` (the time
 * their last connection closed) reads "Offline · last seen 5 min ago".
 * With live location a friend on the move reads "On the way to Freedom Park", "On the way home" or
 * "Travelling to Ibadan". `place` names the reader's own city: a friend in another one reads
 * "Online · in Ibadan" — the city only, never a venue of it.
 */
export function presenceText(person: { status?: string; seenAt?: number; venue?: string; cityId?: string; going?: string; journey?: string } | null | undefined, venueName: (id: string) => string = (id) => id, now: number | null = null,
  place: { cityId?: string; cityName?: (id: string) => string } | null = null): string {
  const entry = presenceByStatus[person?.status ?? ''] || PRESENCE.offline;
  if (entry === PRESENCE.offline && typeof person?.seenAt === 'number' && Number.isFinite(person.seenAt) && typeof now === 'number' && Number.isFinite(now)) return `${entry.label} · last seen ${agoText(person.seenAt, now)}`;
  const cityName = (id: string): string => place?.cityName?.(id) ?? id;
  // A place of no city (the pseudo-city `world`): the Square, or a group's room.
  if (person?.cityId === 'world' && (person.status === 'online' || person.status === 'away')) return `${entry.label} · ${person.venue === 'square' ? 'in the Square' : 'in a group room'}`;
  const elsewhere = person?.cityId && place?.cityId && person.cityId !== place.cityId ? person.cityId : null;
  if (person?.status === 'away' && person.journey) return `Travelling to ${cityName(person.journey)}`;
  if (person?.status === 'away' && person.going) return elsewhere ? `On the move in ${cityName(elsewhere)}` : `On the way ${person.going === 'home' ? 'home' : `to ${venueName(person.going)}`}`;
  if (elsewhere && (person?.status === 'online' || person?.status === 'away')) return `${entry.label} · in ${cityName(elsewhere)}`;
  if (person?.status !== 'online' || !person.venue) return entry.label;
  return `${entry.label} · ${person.venue === 'home' ? 'at home' : person.venue === 'visit' ? 'visiting a friend' : venueName(person.venue)}`;
}

/** The line above the people list: what the count means and why it may be empty. */
export function roomSummary(list: Pick<PeopleListing, 'venue' | 'self' | 'count' | 'here' | 'total'> | null | undefined, venueName: string): string {
  if (!list) return 'Checking who is here…';
  if (list.venue === 'home') return list.count ? `${list.count} guest${list.count === 1 ? '' : 's'} in your home` : 'Your home is private. Only guests you let in appear here.';
  if (list.self === 'travelling') return 'You are on the move. People appear when you arrive.';
  if (list.self === 'not_joined') return `Connecting you to ${venueName}… other players cannot see you here yet.`;
  // A busy venue is split into groups: the list, the scene and the chat are the people around you, and the venue's own total is said beside it.
  const around = `${list.count} other player${list.count === 1 ? '' : 's'} here with you — the same people who see this venue’s chat.`;
  return typeof list.total === 'number' && typeof list.here === 'number' && list.total > list.here ? `${around} ${list.total} ${list.total === 1 ? 'person is' : 'people are'} in this place.` : around;
}
