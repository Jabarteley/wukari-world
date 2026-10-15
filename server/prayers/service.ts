/**
 * OWNER: agents (prayers, docs/PRAYERS.md)
 * PRAYERS AND THE OWNER'S ACTS: what is kept, what may be done, and the checks that bound it. Portable (no Node imports).
 *
 * KEPT      two collections, both bounded, both created by the first write (reading creates nothing):
 *             prayers   { v, seq, items }   the last LIMITS.prayersKept prayers, newest last. A prayer is read by admins only.
 *             ownerActs { v, seq, lines, sickened, blessed, dreamt, fates }   the APPEND-ONLY LOG of acts (the last LIMITS.logKept lines;
 *                       a line is never edited, only marked into the gist by its number), the once-a-week sickness table, the
 *                       blessing and dream tables, and what residents were given (`fates`: a resident has no life record to change).
 * ACTS      eight, each checked here and written to the log in the same transaction as the change and as one line of the admin audit:
 *             heal · sicken · give · take · bless · weather · dream · cross · silence
 *           A person is a player (a public id) or a resident (a resident id). The act is the admin's; the person meets only its
 *           RESULT in the world's own voice (PERSON_WORDS): never a message "from the owner", never the word prayer.
 * NEVER     real money, purchases, accounts, chat. Money goes through the wallet's own server-only action ('wallet.admin') under the
 *           admin limits (server/admin/config.ts) and is audited like any admin credit or debit. A minor, or a player whose age is
 *           unknown, is never sickened and never crossed with anyone. One person is sickened at most once a week.
 * IN THE WORLD  every act that is news makes one line in the gist (kind 'owner'), through the gist's own door (server/gist/ledger.ts):
 *           a fever "going round Yaba", never a person, unless the person is a confirmed adult and the line is kind (heal, give).
 *           The weather is laid over the real weather (server/world-feed/service.ts) for a few hours.
 */
import { addMoodlet, removeMoodlet } from '../../src/game/api.ts';
import { HEALTH } from '../../src/game/content/health.ts';
import { cityContent, cityRules } from '../../src/game/cities/index.ts';
import { lagosTime } from '../../src/game/clock.ts';
import { venueDistrict, venueLabel } from '../../src/game/content/venues.ts';
import { naira } from '../../src/game/util.ts';
import { characterCity } from '../character.ts';
import { agentWords } from '../moderation/agent-words.ts';
import { screenText } from '../moderation/text.ts';
import { socialService } from '../social/service.ts';
import { gistService } from '../gist/ledger.ts';
import { businessOf } from '../business/service.ts';
import { worldFeedOf } from '../world-feed/service.ts';
import { OUT_OF_CHARACTER } from '../residents/life.ts';
import { residentById } from '../residents/world.ts';
import { limitsOf } from '../admin/config.ts';
import { movedToday } from '../admin/actions.ts';
import { mayAct, shortRef } from '../admin/gate.ts';
import { audit } from '../admin/store.ts';
import type { Admin } from '../admin/gate.ts';
import { UUID_PATTERN } from '../protocol.ts';
import { ACT_KINDS, LIMITS, PERSON_WORDS, SKIES, clean, emptyActs, emptyPrayers, fateIn, gistWords, prayerText } from './model.ts';
import type { ActKind, ActLine, ActsCollection, Fate, PrayerItem, PrayersCollection, Sky } from './model.ts';
import type { CityId } from '../../src/types/protocol.ts';
import type { LifeState } from '../../src/types/life.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const DAY_MS = 86400000;
/** What a request to take an act holds (parsed by `parseAct`). */
export interface ActInput {
  kind: ActKind
  reason: string
  prayer: number | null
  target: string
  other: string
  city: string
  venue: string
  amount: number
  hours: number
  sky: Sky | null
  text: string
  form: 'dream' | 'sign'
}
/** What an act wants done once its transaction has committed (the push to the person, the weather). */
export interface ActEffects { push?: unknown[]; after?: (() => Promise<void> | void)[] }

export function prayersOf(ctx: RouteContext) {
  const social = socialService(ctx), gist = gistService(ctx);
  const refuse = (status: number, code: string, reason: string) => Object.assign(ctx.fail(status, code), { reason });

  // ---- the collections ------------------------------------------------------------------------------------------------------
  const prayersFor = (db: Db): PrayersCollection => {
    const found = ctx.collection(db, 'prayers', emptyPrayers()) as unknown as Partial<PrayersCollection>;
    if (!Array.isArray(found.items)) found.items = [];
    if (typeof found.seq !== 'number') found.seq = 0;
    found.v = 1;
    return found as PrayersCollection;
  };
  const actsFor = (db: Db): ActsCollection => {
    const found = ctx.collection(db, 'ownerActs', emptyActs()) as unknown as Partial<ActsCollection>;
    if (!Array.isArray(found.lines)) found.lines = [];
    if (typeof found.seq !== 'number') found.seq = 0;
    for (const key of ['sickened', 'blessed', 'dreamt', 'fates'] as const) if (!record(found[key])) found[key] = {};
    found.v = 1;
    return found as ActsCollection;
  };
  /** For reads: the collection if it exists, else an empty one that is not stored. */
  const peekPrayers = (db: Db): PrayersCollection => (record(db['prayers']) && Array.isArray((db['prayers'] as { items?: unknown }).items) ? db['prayers'] as unknown as PrayersCollection : emptyPrayers());
  const peekActs = (db: Db): ActsCollection => (record(db['ownerActs']) && Array.isArray((db['ownerActs'] as { lines?: unknown }).lines) ? db['ownerActs'] as unknown as ActsCollection : emptyActs());

  // ---- prayers -------------------------------------------------------------------------------------------------------------
  function keep(db: Db, item: Omit<PrayerItem, 'n' | 'at'>): PrayerItem {
    const col = prayersFor(db);
    const made: PrayerItem = { n: ++col.seq, at: ctx.now(), ...item };
    col.items.push(made);
    if (col.items.length > LIMITS.prayersKept) col.items.splice(0, col.items.length - LIMITS.prayersKept);
    return made;
  }
  const lifeOf = (session: SessionRecord): { city: CityId; life: LifeState } | null => {
    const city = characterCity(session), life = city ? session.cities[city]?.state : undefined;
    return city && life && !(life.onboarding?.required === true && life.onboarding.done !== true) ? { city, life } : null;
  };

  /** A player's prayer (inside a transaction): bounded per day. Returns the item or a refusal. */
  function playerPrays(db: Db, session: SessionRecord, input: { text: unknown; venue?: unknown }): { ok: true; item: PrayerItem } | { ok: false; code: string; reason: string } {
    const text = prayerText(input.text);
    if (!text.ok) return text;
    const since = ctx.now() - DAY_MS, items = peekPrayers(db).items;
    if (items.filter((item) => item.by === 'player' && item.who === session.publicId && item.at > since).length >= LIMITS.playerPerDay) return { ok: false, code: 'too_many_prayers', reason: `You can pray ${LIMITS.playerPerDay} times a day. Come back tomorrow.` };
    if (screenText(text.text, { contact: true, what: 'A prayer' })) return { ok: false, code: 'invalid_prayer', reason: 'Leave out contact details and links.' };
    const here = lifeOf(session), life = here?.life;
    const venue = typeof input.venue === 'string' && /^[a-z0-9-]{1,40}$/.test(input.venue) ? input.venue : life?.location ?? null;
    const age = ctx.checks?.minor?.(db, session.publicId) ? 'under 18' : ctx.checks?.adult?.(db, session.publicId) ? 'adult' : 'age not given';
    const situation = life ? `${life.health.sick ? 'sick' : 'well'} · cash ${naira(life.cash)} · ${age}` : age;
    return { ok: true, item: keep(db, { by: 'player', who: session.publicId, name: clean(session.name, 24), city: here?.city ?? '', venue, text: text.text, situation, ...(ctx.checks?.minor?.(db, session.publicId) ? { minor: true as const } : {}) }) };
  }
  /** A resident's prayer (inside a transaction). The text was already checked (resident.ts judge); this checks it again, so no door skips it. */
  function residentPrays(db: Db, input: { id: string; name: string; city: string; text: string; situation: string }): PrayerItem | null {
    const text = prayerText(input.text);
    if (!text.ok || !agentWords(text.text, { toMinor: true }).ok || OUT_OF_CHARACTER.test(text.text)) return null;
    return keep(db, { by: 'resident', who: input.id, name: clean(input.name, 24), city: input.city, venue: null, text: text.text, situation: clean(input.situation, 160) });
  }

  // ---- people -----------------------------------------------------------------------------------------------------------------
  type Person =
    | { kind: 'player'; id: string; name: string; city: CityId; session: SessionRecord; life: LifeState }
    | { kind: 'resident'; id: string; name: string; city: string };
  function person(db: Db, id: string): Person {
    const who = residentById(id);
    if (who) return { kind: 'resident', id, name: who.name, city: who.city };
    if (!UUID_PATTERN.test(id)) throw refuse(400, 'invalid_target', 'Name a player (their id) or a resident.');
    const session = ctx.core.sessionByPublicId?.(db, id.toLowerCase());
    if (!session || !(session.expiresAt > ctx.now())) throw refuse(404, 'unknown_player', 'No live player has that id.');
    const here = lifeOf(session);
    if (!here) throw refuse(409, 'no_life', 'This player has no life in a city yet.');
    return { kind: 'player', id: session.publicId, name: session.name, city: here.city, session, life: ctx.settle(session, here.city) };
  }
  const adultPlayer = (db: Db, p: Person): boolean => p.kind === 'resident' || ctx.checks?.adult?.(db, p.id) === true;
  /** A line in the person's Updates, in the world's voice. Nothing for a resident (it reads its fate instead). */
  function tell(db: Db, effects: ActEffects, p: Person, text: string): void {
    if (p.kind !== 'player' || !social.modKnows(db, p.id)) return;
    (effects.push ??= []).push(...social.modNote(db, p.id, text).push);
  }
  const placeOf = (p: Person): string => (p.kind === 'player' ? venueDistrict(p.life.location, p.city) || cityRules(p.city)?.name || p.city : cityRules(p.city)?.name ?? p.city);
  const cityName = (city: string): string => cityRules(city)?.name ?? city;
  const fateOf = (acts: ActsCollection, id: string): Fate => (acts.fates[id] ??= {});

  // ---- the acts -----------------------------------------------------------------------------------------------------------------
  function cure(life: LifeState, now: number): boolean {
    const was = life.health.sick;
    life.health.sick = false; life.health.cause = null; life.health.since = null; life.health.strain = 0;
    life.health.immuneUntil = Math.max(life.health.immuneUntil, now + HEALTH.illness.immunitySeconds.cure * 1000);
    if (was) { removeMoodlet(life, HEALTH.feelings.sick.id); addMoodlet(life, HEALTH.feelings.recovered, { now }); }
    return was;
  }
  function sicken(life: LifeState, now: number): void {
    life.health.sick = true; life.health.cause = 'rain'; life.health.since = now; life.health.strain = 0;
    addMoodlet(life, HEALTH.feelings.sick, { now });
  }

  /** Everything one act needs and may change, inside the transaction. Returns what it did, in words, for the log. */
  function perform(db: Db, admin: Admin, input: ActInput, acts: ActsCollection, effects: ActEffects, found: PrayerItem | null): Omit<ActLine, 'n' | 'at' | 'admin' | 'adminName' | 'reason' | 'prayer' | 'gist'> & { gist: { text: string; city: string; people?: { id: string; name: string }[] } | null } {
    const now = ctx.now();
    const targetId = input.target || found?.who || '';
    const named = (p: Person) => ({ id: p.id, name: p.name });
    switch (input.kind) {
      case 'heal': {
        const p = person(db, targetId); if (p.kind === 'player') mayAct(ctx, db, admin, p.session);
        let summary: string;
        if (p.kind === 'player') {
          const was = cure(p.life, now);
          const outcome = ctx.act(p.life, { type: 'needs.admin', payload: { op: 'heal' }, cityId: p.city });
          if (!outcome.ok) throw refuse(409, outcome.code, 'The person could not be helped just now.');
          tell(db, effects, p, PERSON_WORDS.heal);
          summary = was ? 'Illness cured and needs lifted' : 'Needs lifted (was not sick)';
        } else { const fate = fateOf(acts, p.id); const was = (fate.sickUntil ?? 0) > now; delete fate.sickUntil; summary = was ? 'Resident well again' : 'Resident was not sick'; }
        const words = gistWords('heal', placeOf(p));
        return { kind: 'heal', targetKind: p.kind, target: p.id, targetName: p.name, city: p.city, params: {}, summary, gist: words ? { text: words.text, city: p.city, people: [named(p)] } : null };
      }
      case 'sicken': {
        const p = person(db, targetId); if (p.kind === 'player') mayAct(ctx, db, admin, p.session);
        if (!adultPlayer(db, p)) throw refuse(409, 'minor_protected', 'Never on a minor, or on someone whose age is not known.');
        const last = acts.sickened[p.id] ?? -Infinity;
        if (now - last < LIMITS.sickGapMs) throw refuse(409, 'sick_too_soon', 'This person was made ill within the last week. Once a week at most.');
        if (p.kind === 'player') {
          if (p.life.health.sick) throw refuse(409, 'already_sick', 'This person is already sick.');
          if (p.life.health.immuneUntil > now) throw refuse(409, 'person_immune', 'This person is protected from illness right now.');
          sicken(p.life, now);
          tell(db, effects, p, PERSON_WORDS.sicken);
        } else {
          const fate = fateOf(acts, p.id);
          if ((fate.sickUntil ?? 0) > now) throw refuse(409, 'already_sick', 'This person is already sick.');
          fate.sickUntil = now + LIMITS.residentSickMs;
        }
        acts.sickened[p.id] = now;
        for (const [id, at] of Object.entries(acts.sickened)) if (now - at >= LIMITS.sickGapMs) delete acts.sickened[id];
        return { kind: 'sicken', targetKind: p.kind, target: p.id, targetName: p.name, city: p.city, params: {}, summary: 'Taken ill (a fever)', gist: { text: gistWords('sicken', placeOf(p))!.text, city: p.city } };
      }
      case 'give': case 'take': {
        const p = person(db, targetId);
        if (p.kind !== 'player') throw refuse(409, 'resident_no_purse', 'A resident has no purse to change.');
        mayAct(ctx, db, admin, p.session);
        const limits = limitsOf(ctx), give = input.kind === 'give', amount = input.amount;
        if (!Number.isSafeInteger(amount) || amount < 1 || amount > LIMITS.moneyMax || amount > limits.maxAmount) throw refuse(400, 'invalid_amount', `Game money only, from 1 to ${naira(Math.min(LIMITS.moneyMax, limits.maxAmount))}.`);
        if (!admin.root) {
          const toTarget = movedToday(ctx, db, { target: p.id }), byAdmin = movedToday(ctx, db, { admin: admin.accountId });
          if (toTarget + amount > limits.perTargetDay) throw refuse(409, 'over_target_day_limit', `At most ${naira(limits.perTargetDay)} a day may be moved on one player.`);
          if (byAdmin + amount > limits.perAdminDay) throw refuse(409, 'over_admin_day_limit', `You may move at most ${naira(limits.perAdminDay)} a day.`);
        }
        const before = p.life.cash;
        const outcome = ctx.act(p.life, { type: 'wallet.admin', payload: { op: give ? 'credit' : 'debit', amount, reason: give ? 'Luck' : 'A loss', }, cityId: p.city });
        if (!outcome.ok) throw refuse(409, outcome.code, 'The balance could not be changed.');
        const applied = Math.abs(p.life.cash - before);
        if (applied === 0) throw refuse(409, 'nothing_to_take', 'There was nothing to take.');
        audit(ctx, db, { admin: admin.accountId, adminName: admin.name, action: give ? 'credit' : 'debit', target: p.id, targetName: p.name, params: { amount, via: 'prayer-act' }, summary: `${give ? 'Credit' : 'Debit'} ${naira(applied)} as an act`, reason: input.reason, amount: give ? applied : -applied });
        tell(db, effects, p, give ? PERSON_WORDS.give(naira(applied)) : PERSON_WORDS.take(naira(applied)));
        const words = gistWords(input.kind, placeOf(p));
        return { kind: input.kind, targetKind: 'player', target: p.id, targetName: p.name, city: p.city, params: { amount: applied }, summary: `${give ? 'Gave' : 'Took'} ${naira(applied)}: cash ${naira(before)} to ${naira(p.life.cash)}`, gist: words ? { text: words.text, city: p.city, ...(words.named ? { people: [named(p)] } : {}) } : null };
      }
      case 'bless': {
        const p = person(db, targetId);
        if (p.kind !== 'player') throw refuse(409, 'no_stall', 'Only a player can own a stall.');
        const shop = businessOf(ctx, db).shops[p.id];
        if (!shop || shop.status !== 'open') throw refuse(409, 'no_stall', 'This person has no open stall.');
        const day = lagosTime(now).day;
        if (acts.blessed[p.id] === day) throw refuse(409, 'blessed_today', 'This stall was blessed today.');
        const amount = Math.max(1, Math.min(input.amount || LIMITS.blessMax, LIMITS.blessMax));
        shop.till += amount; acts.blessed[p.id] = day;
        for (const [id, d] of Object.entries(acts.blessed)) if (d < day - 1) delete acts.blessed[id];
        if (social.modKnows(db, p.id)) (effects.push ??= []).push(...social.shopNote(db, p.id, PERSON_WORDS.bless).push);
        return { kind: 'bless', targetKind: 'shop', target: p.id, targetName: shop.name, city: shop.city, params: { amount }, summary: `Customers for a day: ${naira(amount)} into the till of ${shop.name}`, gist: { text: gistWords('bless', cityName(shop.city))!.text, city: shop.city } };
      }
      case 'weather': {
        const city = input.city || found?.city || '';
        if (!ctx.cityIds.some((id) => id === city)) throw refuse(400, 'invalid_city', 'Name a city.');
        const sky = input.sky;
        if (!sky || !SKIES.includes(sky)) throw refuse(400, 'invalid_sky', `The sky is one of: ${SKIES.join(', ')}.`);
        if (!Number.isSafeInteger(input.hours) || input.hours < LIMITS.weatherHoursMin || input.hours > LIMITS.weatherHoursMax) throw refuse(400, 'invalid_hours', `From ${LIMITS.weatherHoursMin} to ${LIMITS.weatherHoursMax} hours.`);
        const feed = worldFeedOf(ctx);
        if (feed.overrideOf(city)) throw refuse(409, 'weather_active', 'The weather over this city is already set. Wait for it to end.');
        const hours = input.hours;
        (effects.after ??= []).push(() => { feed.override(city, sky === 'hot' ? 'clear' : sky, hours, sky === 'hot' ? 35 : null); });
        return { kind: 'weather', targetKind: 'city', target: city, targetName: cityName(city), city, params: { sky, hours }, summary: `${sky} over ${cityName(city)} for ${hours} hour${hours === 1 ? '' : 's'}`, gist: { text: gistWords('weather', cityName(city), { sky })!.text, city } };
      }
      case 'dream': {
        const p = person(db, targetId); if (p.kind === 'player') mayAct(ctx, db, admin, p.session);
        const text = clean(input.text, LIMITS.dreamMax + 1);
        if (text.length < LIMITS.dreamMin || text.length > LIMITS.dreamMax) throw refuse(400, 'invalid_text', `A dream or a sign is ${LIMITS.dreamMin} to ${LIMITS.dreamMax} characters.`);
        if (screenText(text, { contact: true, what: 'The line' }) || !agentWords(text, { toMinor: true }).ok || (p.kind === 'resident' && OUT_OF_CHARACTER.test(text))) throw refuse(400, 'text_blocked', 'Keep it gentle: no contact details, links, money, or words about the game.');
        if (now - (acts.dreamt[p.id] ?? -Infinity) < DAY_MS / LIMITS.dreamsPerDay) throw refuse(409, 'dream_too_soon', 'This person had a dream or a sign in the last day.');
        acts.dreamt[p.id] = now;
        for (const [id, at] of Object.entries(acts.dreamt)) if (now - at >= DAY_MS) delete acts.dreamt[id];
        if (p.kind === 'player') tell(db, effects, p, PERSON_WORDS[input.form](text));
        else { const fate = fateOf(acts, p.id); fate.dreams = [...(fate.dreams ?? []), { at: now, text }].slice(-LIMITS.dreamsKept); }
        return { kind: 'dream', targetKind: p.kind, target: p.id, targetName: p.name, city: p.city, params: { form: input.form, length: text.length }, summary: `A ${input.form} for ${p.name} (${text.length} characters)`, gist: null };
      }
      case 'cross': {
        const a = person(db, targetId), b = person(db, input.other);
        if (a.id === b.id) throw refuse(400, 'invalid_target', 'Name two different people.');
        if (a.kind === 'player') mayAct(ctx, db, admin, a.session);
        if (b.kind === 'player') mayAct(ctx, db, admin, b.session);
        if (!adultPlayer(db, a) || !adultPlayer(db, b)) throw refuse(409, 'minor_protected', 'Paths are crossed only between confirmed adults.');
        if (a.kind === 'player' && b.kind === 'player' && ctx.checks?.blocked?.(a.id, b.id)) throw refuse(409, 'blocked', 'One of them has blocked the other.');
        if (a.city !== b.city) throw refuse(409, 'different_cities', 'They live in different cities.');
        const venue = input.venue;
        if (!/^[a-z0-9-]{1,40}$/.test(venue) || venue === 'home' || venue === 'neighbourhood' || venue === 'city-street' || !cityContent(a.city as CityId)?.venues.some((v: { id: string }) => v.id === venue)) throw refuse(400, 'invalid_venue', 'Name a public place in their city.');
        const label = venueLabel(venue, a.city);
        for (const p of [a, b]) {
          if (p.kind === 'player') tell(db, effects, p, PERSON_WORDS.cross(label));
          else fateOf(acts, p.id).cross = { venue, city: p.city, until: now + LIMITS.crossingMs };
        }
        return { kind: 'cross', targetKind: 'pair', target: a.id, targetName: `${a.name} and ${b.name}`, city: a.city, params: { other: b.id, venue }, summary: `${a.name} and ${b.name} drawn towards ${label}`, gist: null };
      }
      case 'silence': {
        if (!found) throw refuse(400, 'prayer_required', 'Silence answers a prayer: choose one.');
        return { kind: 'silence', targetKind: 'none', target: found.who, targetName: found.name, city: found.city, params: {}, summary: 'Answered with silence', gist: null };
      }
    }
  }

  /** Parse and bound a request body. Pure: reads nothing. */
  function parseAct(body: Record<string, unknown>): ActInput {
    const kind = ACT_KINDS.find((k) => k === body.kind);
    if (!kind) throw refuse(400, 'unknown_act', `An act is one of: ${ACT_KINDS.join(', ')}.`);
    const reason = clean(body.reason, LIMITS.reasonMax);
    if (reason.length < LIMITS.reasonMin) throw refuse(400, 'reason_required', 'Give a reason (it is written to the log).');
    const whole = (value: unknown): number => (typeof value === 'number' && Number.isSafeInteger(value) ? value : 0);
    const id = (value: unknown): string => (typeof value === 'string' && /^[A-Za-z0-9._-]{1,64}$/.test(value) ? value.toLowerCase() : '');
    const sky = SKIES.find((s) => s === body.sky) ?? null;
    return { kind, reason, prayer: whole(body.prayer) > 0 ? whole(body.prayer) : null, target: id(body.target), other: id(body.other), city: id(body.city), venue: id(body.venue), amount: whole(body.amount), hours: whole(body.hours), sky, text: typeof body.text === 'string' ? body.text : '', form: body.form === 'sign' ? 'sign' : 'dream' };
  }

  return {
    peekPrayers, peekActs, parseAct, playerPrays, residentPrays, fateOf: (db: Db, id: string) => fateIn(db, id),
    /** Inside a transaction, inside ctx.once: take one act. Throws to refuse (nothing is kept). */
    act(db: Db, admin: Admin, input: ActInput, effects: ActEffects): { ok: true; code: string; summary: string; line: number; gist: number | null } {
      const acts = actsFor(db), prayers = prayersFor(db);
      const found = input.prayer === null ? null : prayers.items.find((item) => item.n === input.prayer) ?? null;
      if (input.prayer !== null && !found) throw refuse(404, 'unknown_prayer', 'That prayer is no longer kept.');
      if (found?.answered) throw refuse(409, 'already_answered', 'That prayer has been answered.');
      const done = perform(db, admin, input, acts, effects, found);
      const n = ++acts.seq, now = ctx.now();
      // The gist line: its own door decides about names, hidden players and money signs. The act stands even when the gist says nothing.
      const made = done.gist ? gist.add(db, { city: done.gist.city, kind: 'owner', text: done.gist.text, ...(done.gist.people ? { people: done.gist.people, minors: 'skip' as const } : {}), refs: { key: `act:${n}` } }) : null;
      const line: ActLine = { n, at: now, admin: shortRef(admin.accountId), adminName: clean(admin.name, 24), kind: done.kind, targetKind: done.targetKind, target: done.target, targetName: clean(done.targetName, 40), city: done.city, prayer: found?.n ?? null, params: done.params, summary: clean(done.summary, 240), reason: input.reason, gist: made?.n ?? null };
      acts.lines.push(line);
      if (acts.lines.length > LIMITS.logKept) acts.lines.splice(0, acts.lines.length - LIMITS.logKept);
      if (found) found.answered = { at: now, act: done.kind, line: n };
      audit(ctx, db, { admin: admin.accountId, adminName: admin.name, action: `act-${done.kind}`, target: done.target, targetName: line.targetName, params: { act: n, prayer: found?.n ?? null, ...done.params } as Record<string, string | number | boolean | null>, summary: line.summary, reason: input.reason });
      return { ok: true, code: 'done', summary: line.summary, line: n, gist: line.gist };
    },
    /** The Prayers page: newest first, filtered. `answered` is 'yes', 'no' or anything else for both. */
    list(db: Db, filter: { by?: string; city?: string; answered?: string; before?: number; limit?: number }) {
      const all = peekPrayers(db).items;
      const rows = all.filter((item) => (filter.by === 'resident' || filter.by === 'player' ? item.by === filter.by : true) && (filter.city ? item.city === filter.city : true)
        && (filter.answered === 'yes' ? item.answered !== undefined : filter.answered === 'no' ? item.answered === undefined : true) && (filter.before ? item.n < filter.before : true));
      const limit = Math.max(1, Math.min(filter.limit ?? 30, 100));
      const items = rows.slice().reverse().slice(0, limit);
      return { items, total: all.length, unanswered: all.filter((item) => !item.answered).length, next: rows.length > limit ? items[items.length - 1]!.n : null };
    },
    /** The log, newest first. */
    log(db: Db, before?: number, limit = 30) {
      const lines = peekActs(db).lines.filter((line) => (before ? line.n < before : true)).reverse();
      return { lines: lines.slice(0, Math.max(1, Math.min(limit, 100))), total: peekActs(db).seq };
    },
  };
}
export type Prayers = ReturnType<typeof prayersOf>;
