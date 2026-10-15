// Spray packets in a group chat (docs/SMALLER-FEATURES.md): the amounts offered and the words for a refusal. Pure. The rules are the server's
// (server/social/spray.ts, the same limits as a gift: src/game/content/npcs.ts TRANSFER_LIMITS); this only keeps the buttons inside them. The two numbers
// are copied here, not imported, so this lazy sheet adds nothing to the engine chunk's exports; sprayModel.test.ts checks they still match.
export const SPRAY_LIMITS = { min: 100, maxPerTransfer: 5000 } as const
const TRANSFER_LIMITS = SPRAY_LIMITS
/** The packets the sheet offers: small to the largest single gift. */
export const SPRAY_CHOICES: readonly number[] = [500, 1000, 2500, TRANSFER_LIMITS.maxPerTransfer]
/** The words under the amount box ('' when the amount is fine). `friends` counts the friends in the group who could get a share. */
export function sprayWhy(amount: number, friends: number): string {
  if (!Number.isSafeInteger(amount) || amount < TRANSFER_LIMITS.min) return `A packet is at least ${TRANSFER_LIMITS.min}.`
  if (amount > TRANSFER_LIMITS.maxPerTransfer) return `A packet is at most ${TRANSFER_LIMITS.maxPerTransfer}.`
  if (friends < 1) return 'Only friends in the group get a share. Add them as friends first.'
  return ''
}
/** How many people a packet reaches: a share is at least the smallest gift. */
export const sprayReach = (amount: number, friends: number): number => Math.max(0, Math.min(friends, Math.floor(amount / TRANSFER_LIMITS.min)))
export const sprayLine = (amount: number, friends: number): string => {
  const reach = sprayReach(amount, friends)
  return reach < 1 ? '' : `Split at random among ${reach} ${reach === 1 ? 'friend' : 'friends'} in this group. Game money only.`
}
