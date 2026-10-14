export interface SeasonState {
  id: 'akoka-first-season-v1'
  joinedAt: number
  startDay: number
  /** First meaningful human day after enrollment, inside the published season window. */
  playedDay: number | null
  earnedAt: number | null
  reminder: string | null
}

export interface SeasonView {
  id: SeasonState['id']
  title: string
  startsAt: number
  endsAt: number
  status: 'upcoming' | 'open' | 'ended'
  joined: boolean
  played: boolean
  keepsakes: number
  target: 2
  canClaim: boolean
  earnedAt: number | null
  reward: string
  reminder: string | null
  reminderOptions: { id: string; title: string }[]
}

export interface SeasonEvidence { id: string; title: string; earnedAt: number | null }
