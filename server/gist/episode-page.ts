/**
 * The public page of a city's weekly episode: /episode/<city> (this week so far) and /episode/<city>/<monday> (a past week). Small HTML with no
 * script and no cookie, written by the server with its own head tags so a link previews well in a chat or on a feed. Every word comes from
 * the gist (public lines only) and is escaped. A week with too little to say says so and is not indexed.
 */
import { esc, shell } from '../agents/pages.ts';
import { episodeFacts } from '../../src/episode/text.ts';
import type { EpisodeView } from '../../src/types/world.ts';

const monthDay = (name: string): string => new Date(`${name}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const AI = ' <span class="tag">AI</span>';

export const episodePath = (episode: Pick<EpisodeView, 'city' | 'week' | 'current'>): string => (episode.current ? `/episode/${episode.city}` : `/episode/${episode.city}/${episode.week}`);

export function episodePageHtml(episode: EpisodeView, origin: unknown): string {
  const title = episode.current ? episode.headline : `${episode.quiet ? 'A quiet week' : 'The week'} of ${monthDay(episode.week)} in ${episode.cityName}`;
  const lines = episode.lines.map((line) => `<li>${esc(line.text)}${line.ai ? AI : ''}</li>`).join('');
  const facts = episodeFacts(episode).map((fact) => `<li>${esc(fact)}</li>`).join('');
  const body = `<h1>${esc(title)}</h1><p class="note">${episode.current ? 'So far this week' : `Week of ${esc(monthDay(episode.week))}`}, from what everyone could already see in the game.</p>
${lines ? `<ul>${lines}</ul>` : `<p>Nothing has happened that the city could see. A quiet week in ${esc(episode.cityName)}.</p>`}${facts ? `<ul class="note">${facts}</ul>` : ''}
<p><a class="btn" href="/?ref=episode">Open Allworld</a></p>`;
  return shell(origin, episodePath(episode), title, episode.description, body, { index: !episode.quiet });
}

/** The plain page for a city or week that does not exist. */
export const noEpisodeHtml = (origin: unknown): string => shell(origin, '/episode', 'Allworld weekly episode', 'A weekly recap of one city in Allworld.', '<h1>No such episode</h1><p class="note">Episodes are kept for the current week and the seven before it.</p><p><a class="btn" href="/?ref=episode">Open Allworld</a></p>', { index: false });
