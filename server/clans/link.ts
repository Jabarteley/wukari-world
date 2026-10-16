/**
 * OWNER: admin
 * What clans put into the admin section: two runtime settings (the clan size, the season length in days; a new season length applies from
 * the next season) and a few dashboard numbers. Called from server/admin/links.ts.
 */
import { registerAdminSetting } from '../admin/settings.ts';
import { registerAdminStat } from '../admin/tools.ts';
import { CLAN } from '../../src/clans/clan.ts';
import { LADDER } from '../../src/clans/ladder.ts';
import { peekClans } from './data.ts';
import type { Db, RouteContext } from '../types.ts';

const linked = new WeakSet<object>();
export function linkClans(ctx: RouteContext): void {
  if (linked.has(ctx)) return;
  linked.add(ctx);
  registerAdminSetting(ctx, { key: 'clanSize', label: 'Clans: most people in a clan', help: 'The most people one clan holds (5 to 50, default 25). A clan already larger keeps its people; nobody new can join it until it is under the number.', kind: 'number', min: CLAN.sizeMin, max: CLAN.sizeMax, default: () => CLAN.size });
  registerAdminSetting(ctx, { key: 'seasonDays', label: 'Ladders: days in a season', help: 'How long a ladder season lasts (7 to 90, default 28). A new length applies from the next season, which starts with a soft reset (one or two sub-tiers down, never to zero).', kind: 'number', min: 7, max: 90, default: () => LADDER.seasonDays });
  const stat = (id: string, label: string, read: (db: Db) => number | string): void => registerAdminStat(ctx, { id: `clans-${id}`, group: 'Clans', label, cost: 'one key list of the clans collection', read });
  stat('count', 'Clans', (db) => Object.keys(peekClans(db)?.clans ?? {}).length);
  stat('players', 'Players with a ladder', (db) => Object.keys(peekClans(db)?.players ?? {}).length);
  stat('season', 'Season now', (db) => peekClans(db)?.meta.season.n ?? 0);
}
