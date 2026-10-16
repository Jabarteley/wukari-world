// The words under an episode's lines (docs/EPISODES.md): the league place, the office, the stalls. Plain, no amounts. Shared by the public page
// (server/gist/episode-page.ts) and the Gist app's card, so both say the same thing. Pure.
import type { EpisodeView } from '../types/world.ts'

export const ordinal = (n: number): string => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`

export function episodeFacts(episode: Pick<EpisodeView, 'cityName' | 'city' | 'current' | 'league' | 'office' | 'stalls'>): string[] {
  const facts: string[] = []
  const { league, office } = episode
  if (league) {
    const behind = league.leader && league.leader.id !== episode.city ? `, behind ${league.leader.name}` : league.rank === 1 ? (league.final ? ' and took the week' : ' so far') : ''
    facts.push(`${episode.cityName} ${episode.current ? 'is' : 'was'} ${ordinal(league.rank)} of ${league.of} in the city league${behind}.`)
  }
  if (office) facts.push(`On the public record: ${office.title} ${office.name}${office.ai ? ' (AI)' : ''}.`)
  if (episode.stalls > 0) facts.push(`${episode.stalls} new ${episode.stalls === 1 ? 'stall' : 'stalls'} opened.`)
  return facts
}

/** The line that goes with a shared link. */
export const episodeShareLine = (episode: Pick<EpisodeView, 'headline' | 'lines'>): string => `${episode.headline}${episode.lines[0] ? `: ${episode.lines[0].text.replace(/[.!?]+$/, '')}.` : '.'}`
