// When the open table list is read again. Its own module: useTables is in the startup and needs only this, while
// tablesModel carries the stake copy (src/game/table-stakes.ts) that only the Tables app shows.

export const LIST_STALE_MS = 20000

/** The list is read again only while it is on screen and has grown older than LIST_STALE_MS. */
export const listIsStale = (onList: boolean, listAt: number, hasList: boolean, now: number): boolean => !onList ? false : hasList && now - listAt > LIST_STALE_MS
