// The few civic rules the panel registry needs before any panel has loaded (the Governor badge): kept apart from
// civicModel.ts so the first download stays small. The wording of a failed request is in ./civicExplain.ts, fetched with the panels.
import type { CivicNotice } from '../../../types/civic.ts'

/**
 * City news that is new to THIS life and that the player has not opened the Governor app for yet.
 * News from before the life began in the city (`since`) never counts, so a brand-new life starts with no badge.
 */
export function unseenNews(notices: readonly Pick<CivicNotice, 'at'>[] | null | undefined, { readAt = 0, since = null }: { readAt?: number; since?: number | null } = {}): number {
  if (!Array.isArray(notices) || since === null || !Number.isFinite(since)) return 0
  const read = Number(readAt) || 0
  return notices.filter((item) => Number.isFinite(item?.at) && item.at >= since && item.at > read).length
}

export const pulseKey = (cityId: string): string => `pulse:${cityId}`
