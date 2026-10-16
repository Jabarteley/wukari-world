// The weekly city episode on the phone (docs/EPISODES.md): the path and a defensive reading of GET /api/world/episode. Pure: no fetch, no Vue.
// Loaded only with the Gist app's episode card, never at first paint.
import type { EpisodeLeague, EpisodeLine, EpisodeView } from '../../../types/world.ts'

const row = (value: unknown): Record<string, unknown> | null => (value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null)
const text = (value: unknown, max: number): string => (typeof value === 'string' ? value.slice(0, max) : '')
const whole = (value: unknown): number => (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0)

export const episodeApiPath = (city: string): string => `/api/world/episode?id=${encodeURIComponent(city)}`
/** The public page address of the city's week so far (what Share sends). */
export const episodeSharePath = (city: string): string => `/episode/${encodeURIComponent(city)}`

export function readEpisode(answer: unknown): EpisodeView | null {
  const body = row(row(answer)?.episode)
  if (!body || !Array.isArray(body.lines)) return null
  const lines: EpisodeLine[] = []
  for (const value of body.lines.slice(0, 5)) {
    const line = row(value)
    if (line && text(line.text, 160)) lines.push({ text: text(line.text, 160), kind: text(line.kind, 20), at: whole(line.at), ...(line.ai === true ? { ai: true as const } : {}) })
  }
  const league = row(body.league), leader = row(league?.leader), office = row(body.office)
  const place: EpisodeLeague | null = league && whole(league.rank) > 0 ? { rank: whole(league.rank), of: whole(league.of), final: league.final === true, leader: leader && text(leader.id, 40) ? { id: text(leader.id, 40), name: text(leader.name, 40) } : null } : null
  return {
    city: text(body.city, 40), cityName: text(body.cityName, 60), week: text(body.week, 10), from: whole(body.from), to: whole(body.to), current: body.current === true,
    quiet: body.quiet === true || lines.length < 2, headline: text(body.headline, 100), description: text(body.description, 300), lines, league: place,
    office: office && text(office.name, 24) ? { title: text(office.title, 24), name: text(office.name, 24), ...(office.ai === true ? { ai: true as const } : {}) } : null,
    stalls: whole(body.stalls),
  }
}
