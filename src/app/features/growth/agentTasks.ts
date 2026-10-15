// The tasks house agents gave a life, as the Missions app shows them (docs/AGENT-MISSIONS.md). The server sends the life's own list with the growth hello (server/routes/growth.ts)
// and the rows are made here, not in the engine: the first download carries only what the first page needs, and only this panel draws them. A lapsed task is not shown unless it was finished; a collected one is shown for a day.
import type { AgentMission } from '../../../types/life.ts'
import type { AgentMissionRow } from '../../../types/view.ts'

const DAY_MS = 86400000

/** `place` names a venue of a city (null when unknown); `city` is the city the life is in now. */
export function agentRows(missions: { agent?: readonly AgentMission[] | undefined }, now: number, city: string, place: (city: string, venue: string) => string | null): AgentMissionRow[] {
  return (missions.agent ?? []).filter((e) => !e.claimed && (e.n >= e.count || e.until > now) || e.claimed && e.at > now - DAY_MS).map((e) => ({
    id: e.id, kind: e.kind, label: e.label, brief: e.brief, n: e.n, count: e.count, done: e.n >= e.count, claimed: e.claimed, cash: e.cash, until: e.until,
    by: { id: e.by.id, name: e.by.name, place: place(e.by.city, e.by.venue) ?? e.by.venue, hours: e.by.hours },
    go: e.by.city === city && place(e.by.city, e.by.venue) ? [e.by.venue] : null,
  }))
}
