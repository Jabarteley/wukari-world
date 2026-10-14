/**
 * OWNER: admin
 * FESTIVALS AND MATCH NIGHTS, EDITED WITHOUT A RELEASE. The built-in calendar is src/festivals/calendar.ts; this keeps what an admin
 * changed on top of it, in one collection (adminFestivals): festivals added or replaced (a festival with a built-in id replaces it:
 * the way to fix a moon-sighting date), built-in or custom ids HIDDEN, and the football fixtures (a title and a time; a schedule only,
 * src/festivals/matches.ts). The checks are the pure ones in src/festivals/custom.ts and matches.ts.
 *
 * The running copy is held in memory (loaded at start-up, replaced after each committed change), so the public read
 * (GET /api/world/festivals) and the Events app cost no storage read.
 *
 * ACTIONS (POST /api/admin/festivals, body { clientId, action, … }):
 *   festival.save { item }   festival.remove { id }   fixture.save { item }   fixture.remove { id }   hide { id }   show { id }
 * Each writes one row (the collection) and one audit line. Row cost on the Worker: 1 for the collection, 1 for the audit.
 */
import { FESTIVALS, festivalList, nextSpan, isoOfDay } from '../../src/festivals/calendar.ts';
import type { FestivalDef, FestivalExtras } from '../../src/festivals/calendar.ts';
import { CUSTOM_LIMITS, cleanFestival, festivalListOf } from '../../src/festivals/custom.ts';
import { FIXTURE_LIMITS, cleanFixture, fixtureList } from '../../src/festivals/matches.ts';
import type { Fixture } from '../../src/festivals/matches.ts';
import { collectionOf, peek } from './store.ts';
import type { Db, RouteContext } from '../types.ts';

export const FESTIVAL_ACTIONS = ['festival.save', 'festival.remove', 'fixture.save', 'fixture.remove', 'hide', 'show'] as const;
export type FestivalAction = (typeof FESTIVAL_ACTIONS)[number];
const services = new WeakMap<RouteContext, ReturnType<typeof build>>();
export function festivalsOf(ctx: RouteContext) {
  let found = services.get(ctx);
  if (!found) services.set(ctx, found = build(ctx));
  return found;
}

function build(ctx: RouteContext) {
  let live: { festivals: FestivalDef[]; fixtures: Fixture[]; hidden: string[] } = { festivals: [], fixtures: [], hidden: [] };
  const refuse = (code: string, reason: string) => Object.assign(ctx.fail(400, code), { reason });
  const sync = (value: { festivals: unknown; fixtures: unknown; hidden: unknown }): void => {
    live = { festivals: festivalListOf(value.festivals), fixtures: fixtureList(value.fixtures, ctx.now()), hidden: Array.isArray(value.hidden) ? value.hidden.filter((id): id is string => typeof id === 'string').slice(0, CUSTOM_LIMITS.hidden) : [] };
  };
  const service = {
    /** Start-up: read the stored edits once. */
    load: (): Promise<void> => ctx.store.read((db) => { const stored = peek(db, 'adminFestivals'); return { festivals: [...stored.festivals], fixtures: [...stored.fixtures], hidden: [...stored.hidden] }; }).then(sync),
    sync,
    /** What the calendar functions take. */
    extras: (): FestivalExtras => ({ festivals: live.festivals, hidden: live.hidden }),
    fixtures: (): Fixture[] => live.fixtures,
    /** The admin page: every festival in force with its next run, what was changed, the fixtures. */
    list(now: number) {
      const all = festivalList({ festivals: live.festivals });
      return {
        festivals: all.map((item) => { const span = nextSpan(item, now, item.countries[0] === '*' || !item.countries[0] ? 'ng' : item.countries[0]); return { id: item.id, name: item.name, countries: item.countries, builtIn: FESTIVALS.some((b) => b.id === item.id), replaced: live.festivals.some((c) => c.id === item.id) && FESTIVALS.some((b) => b.id === item.id), hidden: live.hidden.includes(item.id), next: span ? { start: isoOfDay(span.start), end: isoOfDay(span.end), focal: isoOfDay(span.focal) } : null }; }),
        custom: live.festivals, fixtures: live.fixtures, hidden: live.hidden,
        limits: { festivals: CUSTOM_LIMITS.keep, fixtures: FIXTURE_LIMITS.keep, minDays: CUSTOM_LIMITS.minDays, maxDays: CUSTOM_LIMITS.maxDays },
      };
    },
    /** Inside a transaction: apply one action. Returns the summary and the stored lists to put in memory after the commit. */
    change(db: Db, action: string, body: Record<string, unknown>) {
      if (!(FESTIVAL_ACTIONS as readonly string[]).includes(action)) throw ctx.fail(400, 'invalid_action');
      const col = collectionOf(ctx, db, 'adminFestivals'), id = typeof body.id === 'string' ? body.id.trim().toLowerCase() : '';
      col.festivals = festivalListOf(col.festivals); col.fixtures = fixtureList(col.fixtures, ctx.now());
      let summary = '';
      if (action === 'festival.save') {
        const done = cleanFestival(body.item);
        if (!done.ok) throw refuse('invalid_festival', done.reason);
        const at = col.festivals.findIndex((item) => item.id === done.festival.id);
        if (at < 0 && col.festivals.length >= CUSTOM_LIMITS.keep) throw refuse('too_many', `At most ${CUSTOM_LIMITS.keep} festivals can be added.`);
        if (at < 0) col.festivals.push(done.festival); else col.festivals[at] = done.festival;
        summary = `festival ${at < 0 ? 'added' : 'changed'}: ${done.festival.id}`;
      } else if (action === 'festival.remove') {
        const before = col.festivals.length;
        col.festivals = col.festivals.filter((item) => item.id !== id);
        if (col.festivals.length === before) throw refuse('unknown_festival', 'No added festival has that id.');
        summary = `festival removed: ${id}`;
      } else if (action === 'fixture.save') {
        const done = cleanFixture(body.item, ctx.now());
        if (!done.ok) throw refuse('invalid_fixture', done.reason);
        const at = col.fixtures.findIndex((item) => item.id === done.fixture.id);
        if (at < 0 && col.fixtures.length >= FIXTURE_LIMITS.keep) throw refuse('too_many', `At most ${FIXTURE_LIMITS.keep} fixtures can be kept.`);
        if (at < 0) col.fixtures.push(done.fixture); else col.fixtures[at] = done.fixture;
        summary = `fixture ${at < 0 ? 'added' : 'changed'}: ${done.fixture.id}`;
      } else if (action === 'fixture.remove') {
        const before = col.fixtures.length;
        col.fixtures = col.fixtures.filter((item) => item.id !== id);
        if (col.fixtures.length === before) throw refuse('unknown_fixture', 'No fixture has that id.');
        summary = `fixture removed: ${id}`;
      } else if (action === 'hide') {
        if (!festivalList({ festivals: col.festivals }).some((item) => item.id === id)) throw refuse('unknown_festival', 'No festival has that id.');
        if (!col.hidden.includes(id)) { if (col.hidden.length >= CUSTOM_LIMITS.hidden) throw refuse('too_many', 'Too many hidden festivals.'); col.hidden.push(id); }
        summary = `festival hidden: ${id}`;
      } else {
        col.hidden = col.hidden.filter((item) => item !== id);
        summary = `festival shown: ${id}`;
      }
      col.seq += 1;
      return { summary, target: id || String((body.item as { id?: unknown } | undefined)?.id ?? ''), stored: { festivals: [...col.festivals], fixtures: [...col.fixtures], hidden: [...col.hidden] } };
    },
  };
  return service;
}
