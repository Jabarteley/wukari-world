/**
 * OWNER: ws
 * THE VOICE SEED of a character: a stable number (FNV-1a of its id) from which a phone picks one voice for it. The same id gives the same number everywhere, so an AI
 * character sounds the same in a place's chat (server/ws/rooms.ts), in room voice and on a call (server/house/call-routes.ts). Portable and pure.
 */
export function voiceSeedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
