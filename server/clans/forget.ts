/**
 * OWNER: admin
 * ERASURE: take erased players out of every clan record, board and prize list (called by server/admin/erasure-data.ts). Their clan room
 * conversation is handled by the social erasure like any group. A clan left without a human who can lead it ends.
 */
import { nameKey } from '../../src/clans/clan.ts';
import { withoutMember } from '../../src/clans/clan.ts';
import { peekClans } from './data.ts';
import type { Db } from '../types.ts';

export function forgetClanPlayers(db: Db, ids: ReadonlySet<string>): void {
  const c = peekClans(db);
  if (!c) return;
  for (const id of ids) {
    const key = c.players[id]?.clan, clan = key ? c.clans[key] : undefined;
    if (clan) {
      const next = withoutMember(clan, id, new Set(clan.members.filter((m) => c.players[m]?.ai)));
      if (!next) { for (const m of clan.members) { const r = c.players[m]; if (r && !ids.has(m)) { delete r.clan; delete r.joined; } } delete c.names[nameKey(clan.name)]; delete c.codes[clan.code]; delete c.clans[clan.id]; }
      else { clan.leader = next.leader; clan.deputies = next.deputies; clan.members = next.members; if (clan.wk) delete clan.wk.s[id]; }
    }
    delete c.players[id];
  }
  for (const board of Object.values(c.boards)) if (board.rows) board.rows = board.rows.filter((r) => !ids.has(r[0]));
  for (const clan of Object.values(c.clans)) for (const id of ids) { delete clan.kicked?.[id]; if (clan.last?.prize) clan.last.prize.ids = clan.last.prize.ids.filter((x) => x !== id); }
}
