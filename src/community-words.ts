// The sentences the Community panel says about the room it is in. Only the panel (src/community.ts, fetched on demand) reads them, so
// they are not part of the rules the first download carries (src/game/roomGroups.ts: the sizes and the notice the server sends).
import type { RoomCounts } from './types/protocol.ts';

/** "12 here with you · 128 in this place" (a venue that is one group says only the first part). */
export function groupHeader(counts: Pick<RoomCounts, 'here' | 'total'> | null | undefined): string {
  if (!counts || !Number.isFinite(counts.here) || !Number.isFinite(counts.total)) return '';
  const others = Math.max(0, counts.here - 1);
  const near = others === 0 ? 'Nobody else here with you' : `${others} here with you`;
  return counts.total > counts.here ? `${near} · ${counts.total} in this place` : near;
}
/** The first line said about venue chat: it is the people around you. */
export const GROUP_CHAT_NOTE = 'You are chatting with the people around you.';
