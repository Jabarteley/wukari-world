/**
 * OWNER: agents (residents, docs/RESIDENTS.md "Phase 20")
 * THE WIRING of the residents' relationships (bonds.ts) to the host: the heartbeat, the resident runner's hooks (resident.ts `hooks`), the gist, the stored collection
 * `bonds` (lazily, never durable, like `residents`), the setting `residentFarewell` and the admin page (group "Residents: relationships").
 * Nothing here runs unless the residents run (`residentOn`); with `residentCount` 1 the engine does nothing at all.
 */
import { venueLabel } from '../../src/game/content/venues.ts';
import { registerAdminSetting } from '../admin/settings.ts';
import { registerAdminStat } from '../admin/tools.ts';
import { gistService } from '../gist/ledger.ts';
import { venueFor } from '../house/cast.ts';
import { venueRoomKey } from '../protocol.ts';
import type { Db, RouteContext } from '../types.ts';
import { bondsOf, emptyBonds } from './bonds.ts';
import type { Bonds, BondsStored } from './bonds.ts';
import { residentService } from './resident.ts';

const wired = new WeakMap<object, Bonds>();
/** The engine of this host, once linked (tests and the admin page read it). */
export const bondsService = (ctx: RouteContext): Bonds | undefined => wired.get(ctx);

const loadFrom = (value: unknown): BondsStored => {
  const base = emptyBonds();
  if (typeof value !== 'object' || value === null) return base;
  const found = value as Partial<BondsStored>;
  return { ...base, ...found, v: 1, pairs: typeof found.pairs === 'object' && found.pairs !== null ? found.pairs : {}, events: Array.isArray(found.events) ? found.events : [], log: Array.isArray(found.log) ? found.log : [], departed: Array.isArray(found.departed) ? found.departed : [], calls: found.calls ?? base.calls };
};

export function linkBonds(ctx: RouteContext): void {
  registerAdminSetting(ctx, { key: 'residentFarewell', label: 'Residents: farewell (keys, comma separated)', help: 'The keys (for example "bisi,tunde") of residents who leave the roster. Each one stops living for good and a quiet notice of a gathering to remember them goes in the gist (two a week at most). An owner act only; never for a person.', kind: 'text', max: 200, default: () => '' });
  const runner = residentService(ctx);
  const setting = (key: string): boolean | number | string | undefined => ctx.checks?.setting?.(key) ?? ctx.checks?.text?.(key);
  const settings = () => runner.settings();
  let engine: Bonds | null = null;
  const stat = (id: string, label: string, read: (db: Db) => number | string): void => registerAdminStat(ctx, { id: `bonds-${id}`, group: 'Residents: relationships', label, cost: 'memory', read });
  const need = (): Bonds | null => engine;
  void ctx.store.read((db) => { const col = (db as Record<string, unknown>)['bonds']; return col ? structuredClone(col) : undefined; }).catch(() => undefined).then((found) => {
    engine = bondsOf({
      roster: runner.roster, now: () => ctx.now(),
      active: () => { const s = settings(); return s.on ? Math.min(s.count, runner.roster.length) : 0; },
      shadow: () => settings().shadow,
      presence: () => runner.presence(),
      decide: async (id, messages) => {
        const model = runner.modelOf(id), answer = await runner.askBudgeted({ purpose: 'resident', messages, maxTokens: 40, carriesPlayerWords: false, timeoutMs: 8000, ...(model ? { prefer: model } : {}) });
        return answer.ok ? answer.text : null;
      },
      venue: (city) => { const id = venueFor(city, ['square', 'park', 'market'], 'guide'); return id ? { room: venueRoomKey(city, id, ''), label: venueLabel(id, city) } : null; },
      announce: async ({ city, kind, text, key }) => { await ctx.store.transact((db) => { gistService(ctx).add(db, { city, kind, text, refs: { key } }); }, { durable: false }); },
      say: async (id, room, text) => { const who = runner.roster.find((item) => `resident.${item.city}.${item.key}` === id); if (who) await ctx.checks?.agentRoom?.say({ id, name: who.name, mark: { agent: true } }, room, text, null); },
      farewells: () => String(setting('residentFarewell') ?? '').split(',').map((key) => key.trim().toLowerCase()).filter(Boolean),
      save: (value) => ctx.store.transact((db) => { Object.assign(ctx.collection(db, 'bonds', emptyBonds()), structuredClone(value)); }, { durable: false }),
    }, loadFrom(found));
    wired.set(ctx, engine);
    runner.hooks.profile = (id) => (settings().shadow ? null : engine?.profile(id) ?? null);
    runner.hooks.talked = (a, b, t) => engine?.talked(a, b, t);
    runner.hooks.hold = (id) => engine?.hold(id) ?? null;
    runner.hooks.retired = (id) => engine?.retired(id) ?? false;
  });
  ctx.on?.('heartbeat', () => { need()?.tick(); });

  const rows = (): string[] => need()?.report().pairs.slice(0, 25).map((p) => `${p.a} and ${p.b}: ${p.stage ?? 'acquainted'}, closeness ${p.closeness}${p.quarrel ? ', quiet between them' : ''}${p.asked ? `, ${p.asked} has asked` : ''}, ${p.high} days near the marriage line`) ?? [];
  stat('summary', 'Relationships: bonds, marriages, weddings set', () => { const r = need()?.report(); return !r ? 'not loaded' : `${r.pairs.length} bonds · ${r.pairs.filter((p) => p.stage === 'married').length} married · ${r.events.filter((e) => e.kind === 'wedding' && !e.done).length} weddings set · ${r.departed.length} farewells · ${r.calls.n} choices asked today`; });
  stat('pairs', 'Relationships: closest pairs (admin only; the game shows only "Married to" and "Friends with")', () => rows().join('\n') || 'none yet');
  stat('events', 'Relationships: weddings and farewells (UTC)', () => need()?.report().events.slice(-10).map((e) => `${e.id} ${e.kind}: ${e.names.join(' and ')} at ${e.label} ${new Date(e.at).toISOString().slice(0, 16).replace('T', ' ')} UTC${e.announced ? ' · announced in the gist' : ' · not public'}${e.opened ? ' · opened' : ''}${e.done ? ' · over' : ''}`).join('\n') || 'none yet');
  stat('log', 'Relationships: what happened (newest last; in shadow nothing is seen by anyone)', () => need()?.report().log.slice(-20).map((l) => `${new Date(l.at).toISOString().slice(5, 16).replace('T', ' ')} ${l.text}`).join('\n') || 'none yet');
}
