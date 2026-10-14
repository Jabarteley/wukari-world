/** Operator-owned rollout and incident settings. Request payloads never set these values. */
export interface RetentionPolicy {
  dailyMilestones: boolean
  rhythm: boolean
  verifiedOutageDays: readonly number[]
  seasonStartDay: number | null
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = Object.freeze({ dailyMilestones: false, rhythm: false, verifiedOutageDays: Object.freeze([]), seasonStartDay: null })

export function retentionPolicy(env: Readonly<Record<string, unknown>>): RetentionPolicy {
  const raw = typeof env.RETENTION_OUTAGE_DAYS === 'string' ? env.RETENTION_OUTAGE_DAYS : ''
  const verifiedOutageDays = [...new Set(raw.split(',').filter(value => /^\d{1,8}$/.test(value.trim())).map(Number)
    .filter(value => Number.isSafeInteger(value) && value >= 0 && value <= 10_000_000))].sort((a, b) => a - b).slice(-62)
  const start = typeof env.RETENTION_SEASON_START_DAY === 'string' && /^\d{1,8}$/.test(env.RETENTION_SEASON_START_DAY) ? Number(env.RETENTION_SEASON_START_DAY) : NaN
  return { dailyMilestones: env.RETENTION_DAILY_MILESTONES === '1', rhythm: env.RETENTION_RHYTHM === '1', verifiedOutageDays,
    seasonStartDay: Number.isSafeInteger(start) && start >= 0 && start < 10_000_000 ? start : null }
}
