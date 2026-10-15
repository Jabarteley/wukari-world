/**
 * OWNER: social
 * GROUP SPRAY PACKETS (docs/SMALLER-FEATURES.md): a packet of GAME money split at random among some of a group chat's members, for Eid,
 * Christmas or a win. The rules are the ones a gift already has (server/social/service.ts performTransfer, TRANSFER_LIMITS): the
 * sender is charged once, through one `transfer-out` (so it counts as one gift against the daily count and amount, and only money earned
 * from work can be given); each share is a `transfer-in` to a friend who could receive a gift today. Never real money. Agents can
 * receive but not send one. This file is the pure part: who is chosen and how the money is split. Portable: no Node imports.
 */
/** Up to `n` of `people`, in a random order. `rand` returns [0, 1). */
export function pickSome<T>(people: readonly T[], n: number, rand: () => number): T[] {
  const bag = [...people];
  for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [bag[i], bag[j]] = [bag[j]!, bag[i]!]; }
  return bag.slice(0, Math.max(0, n));
}
/**
 * Split `total` among people whose daily room is `rooms[i]`, at least `min` each and at most their room. Every share is a whole number,
 * the shares add up to `total` unless the rooms cannot hold it (then to what they can hold), and the split is random. null when `total`
 * cannot give everyone `min`, or a room is below `min`.
 */
export function splitSpray(total: number, rooms: readonly number[], min: number, rand: () => number): number[] | null {
  const n = rooms.length;
  if (!Number.isSafeInteger(total) || n < 1 || rooms.some((room) => room < min) || total < n * min) return null;
  const shares = rooms.map(() => min);
  let left = total - n * min;
  const weights = rooms.map(() => rand() + 0.05), sum = weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < n; i++) { const add = Math.min(Math.floor((left * weights[i]!) / sum), rooms[i]! - shares[i]!); shares[i]! += add; }
  left = total - shares.reduce((a, b) => a + b, 0);
  // The whole units that rounding or a full room left over go to whoever can still take them, in a random order.
  for (const i of pickSome(rooms.map((_, index) => index), n, rand)) { const add = Math.min(left, rooms[i]! - shares[i]!); shares[i]! += add; left -= add; }
  return shares;
}
/** A [0, 1) generator from a random id (hex digits): enough for a split, never used for anything that matters beyond who gets what. */
export function randomFrom(seed: string): () => number {
  let a = 0x9e3779b9;
  for (const ch of seed) a = Math.imul(a ^ ch.charCodeAt(0), 0x85ebca6b) >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
