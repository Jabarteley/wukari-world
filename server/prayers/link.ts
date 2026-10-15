/**
 * OWNER: agents (prayers, docs/PRAYERS.md)
 * The Prayers numbers on the admin dashboard (a card "Prayers"): read from the two collections the page itself reads, one read of each, nothing written.
 */
import { registerAdminStat } from '../admin/tools.ts';
import { lagosTime } from '../../src/game/clock.ts';
import { prayersOf } from './service.ts';
import type { RouteContext } from '../types.ts';

export function linkPrayers(ctx: RouteContext): void {
  const prayers = prayersOf(ctx);
  const stat = (id: string, label: string, read: (db: Parameters<typeof prayers.peekPrayers>[0]) => number | string): void => registerAdminStat(ctx, { id: `prayers-${id}`, group: 'Prayers', label, cost: 'one read of the prayers collection', read });
  stat('kept', 'Prayers kept', (db) => prayers.peekPrayers(db).items.length);
  stat('open', 'Not answered yet', (db) => prayers.peekPrayers(db).items.filter((item) => !item.answered).length);
  stat('today', 'Prayed today', (db) => { const day = lagosTime(ctx.now()).day; return prayers.peekPrayers(db).items.filter((item) => lagosTime(item.at).day === day).length; });
  stat('acts', 'Acts taken (all time)', (db) => prayers.peekActs(db).seq);
}
