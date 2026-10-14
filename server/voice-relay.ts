/**
 * OWNER: foundation
 * RELAY SERVERS FOR ROOM VOICE. Voice in a room (a venue, a home with guests, the Square, a group's room) is peer to peer, like a
 * call. On mobile data two phones usually cannot reach each other directly (carrier networks put many phones behind one address
 * and refuse unsolicited packets), so without a relay they never hear each other. Room voice asks the same relay as one-to-one
 * calls (server/call-relay.ts), under the same limits and the same daily ceiling: one credential when a page joins voice, which
 * lasts an hour (docs/CALLS.md has the limits and the cost). A refused or failed request is not an error for voice: the page goes
 * on with STUN only, as before, and direct connections still work.
 */
import { STUN_ONLY_CONFIG, validateVoiceConfig } from './protocol.ts';
import type { CallRelay } from './call-relay.ts';

/** Relay servers for one player joining room voice, or null to answer with STUN only. Never throws. */
export async function roomVoiceRelay(relay: CallRelay | undefined, player: string, address: string, now: number) {
  if (!relay?.configured) return null;
  try {
    const issued = await relay.issue(player, address);
    if (issued.relay !== 'on') return null;
    return validateVoiceConfig({ iceServers: [...STUN_ONLY_CONFIG.iceServers.map((server) => ({ ...server })), ...issued.iceServers], expiresAt: issued.expiresAt }, now);
  } catch { return null; }
}
