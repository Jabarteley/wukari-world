/**
 * OWNER: games (real-time)
 * A game room's code names its game: `g-<game>-<6 characters>` (`g-fight-k7m2qp`). It is the invite link's `table` value
 * (`/?table=g-fight-k7m2qp`), so the landing can open the right screen before any socket is open. Tiny and import-safe anywhere.
 */
export const ROOM_CODE = /^g-([a-z]{2,16})-([a-hj-km-np-z2-9]{6})$/
export const ROOM_CODE_ANYWHERE = /g-[a-z]{2,16}-[a-hj-km-np-z2-9]{6}/
/** The game id inside a room code, or null when it is not one. */
export const gameOfRoom = (code: unknown): string | null => (typeof code === 'string' ? ROOM_CODE.exec(code)?.[1] ?? null : null)
/** The first room code found in pasted text (a whole link, or the bare code), or null. */
export const roomFromText = (text: string): string | null => ROOM_CODE_ANYWHERE.exec(text.trim().toLowerCase())?.[0] ?? null
