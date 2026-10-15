/**
 * OWNER: world
 * LEGACY, THE SERVICE (design: docs/LEGACY.md). Passing property to an heir (the account's own next character) at once, or to a friend
 * through an offer the friend accepts. Every method runs INSIDE one ctx.store.transact and, for writes, inside ctx.once with the
 * caller's request id; the move itself (server/legacy/move.ts) is all-or-nothing because a throw discards the whole transaction.
 *
 * STORED   ctx.collection(db, 'legacy') = { v: 1, seq, offers: { [id]: Offer }, done: Done[], people: { [publicId]: { out?, in?, worth? } } }.
 *          A new top-level collection made by the first hand-over; nothing existing changes shape. Only public ids.
 *          An Offer holds the MANIFEST (exactly what was offered) and nothing moves until it is accepted.
 * RETURNS  { ok, code, ... } with a plain `reason` on a refusal. A refusal changes nothing (ctx.once keeps no receipt for it).
 *          `push` is what to send after the commit (route: after: () => deliver(push)); `changed` are the open characters whose life
 *          changed outside a settlement (their other devices are told).
 * Portable: no Node imports.
 */
import { cityName } from '../../src/game/cities/registry.ts';
import { characterCity } from '../character.ts';
import { gistService } from '../gist/ledger.ts';
import { peekJustice, peekPolitics } from '../politics/data.ts';
import { jailOf } from '../politics/justice.ts';
import { socialService } from '../social/service.ts';
import type { BusinessCollection, ShopRecord } from '../../src/types/business.ts';
import type { CityId } from '../../src/types/protocol.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';
import { INCLUDE_KEYS, LEGACY, apply, describe, isEmpty, offerOf, partition, sideOf, verify, worthOf } from './move.ts';
import type { Holder, Include, Kind, Manifest, Moved, Side, Stays } from './move.ts';
import { empty, peekLegacy } from './data.ts';
import type { Done, LegacyCollection, Offer } from './data.ts';

type Push = [string, unknown][];
type Refusal = { ok: false; code: string; reason: string };

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = <T>(map: Record<string, T> | undefined, key: string): T | undefined => (map && Object.hasOwn(map, key) ? map[key] : undefined);
const no = (code: string, reason: string): Refusal => ({ ok: false, code, reason });
const idOf = (value: unknown): string => (typeof value === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(value) ? value : '');

/** What a request may tick: only known keys, only `true` counts. */
export function readInclude(value: unknown): Include {
  const out: Include = {};
  if (record(value)) for (const key of INCLUDE_KEYS) if (value[key] === true) out[key] = true;
  return out;
}

export function legacyService(ctx: RouteContext) {
  const social = socialService(ctx);
  const now = (): number => ctx.now();

  /** The collection inside a transaction (created on first use). */
  function data(db: Db): LegacyCollection {
    const found = ctx.collection(db, 'legacy', empty()) as unknown as LegacyCollection;
    if (found.v !== 1) Object.assign(found, empty());
    if (!record(found.offers)) found.offers = {};
    if (!Array.isArray(found.done)) found.done = [];
    if (!record(found.people)) found.people = {};
    if (!Number.isSafeInteger(found.seq)) found.seq = 0;
    return found;
  }
  const businessOf = (db: Db): BusinessCollection | undefined => (record(db.business) && record(db.business.shops) ? db.business : undefined);
  const shopOf = (db: Db, id: string): ShopRecord | null => { const shop = own(businessOf(db)?.shops, id); return shop && shop.by?.id === id ? shop : null; };
  const log = (d: LegacyCollection, offer: { id: string; from: string; to: string }, kind: Kind, result: Done['result']): void => {
    d.done.push({ n: d.seq, id: offer.id, kind, result, at: now(), from: offer.from, to: offer.to });
    if (d.done.length > LEGACY.doneMax) d.done.splice(0, d.done.length - LEGACY.doneMax);
  };
  const tell = (db: Db, to: string, text: string, push: Push): void => {
    if (!social.modKnows(db, to)) return;
    push.push(...social.legacyNote(db, to, text).push);
  };

  // ---- who is who ---------------------------------------------------------------------------------------------------------
  interface Party { id: string; holder: Holder; session: SessionRecord | null; account: string | undefined }
  /** A character that can be reached now: an open session, or (with `archived`) a set-aside life of an account. */
  function partyOf(db: Db, id: string, archived: boolean): Party | null {
    const session = ctx.core.sessionByPublicId(db, id);
    if (session && session.expiresAt > now()) return { id, holder: session, session, account: session.account };
    const entry = archived ? own(db.archivedLives, id) : undefined;
    return entry ? { id, holder: entry, session: null, account: entry.account } : null;
  }
  /** The set-aside characters of the caller's account that hold a life: the possible heirs. */
  function heirsOf(db: Db, session: SessionRecord): { id: string; name: string }[] {
    const account = session.account ? own(db.accounts, session.account) : undefined;
    if (!account) return [];
    return account.parked.flatMap((item) => {
      const entry = own(db.archivedLives, item.id);
      return entry && entry.account === account.id && sideOf(entry, null, false) ? [{ id: item.id, name: entry.name }] : [];
    });
  }
  const isAgent = (db: Db, id: string, session?: SessionRecord | null): boolean => session?.agent?.char === true || social.kit.col(db).players[id]?.agent?.char === true;
  const befriended = (db: Db, a: string, b: string): boolean => { const players = social.kit.col(db).players; return players[a]?.friends[b] !== undefined && players[b]?.friends[a] !== undefined; };
  const sharedDevice = (db: Db, a: string, b: string): boolean => { const mine = db.growth?.players?.[a]?.devices, theirs = db.growth?.players?.[b]?.devices; return Array.isArray(mine) && Array.isArray(theirs) && mine.some((hash) => theirs.includes(hash)); };

  /** Every rule for a hand-over to a DIFFERENT character, except the contents. Null when it may go ahead. */
  function otherRefusal(db: Db, giver: SessionRecord, receiver: Party, d: LegacyCollection, ignore?: string): Refusal | null {
    const g = giver.publicId, r = receiver.id, t = now();
    if (isAgent(db, g, giver) || isAgent(db, r, receiver.session)) return no('agents_excluded', 'An AI-played character cannot give or be given property.');
    if (ctx.checks?.adult?.(db, g) !== true) return no('adults_only', 'Passing things to another player is for players who said they are 18 or older (Phone → Stay in touch).');
    if (ctx.checks?.adult?.(db, r) !== true) return no('receiver_not_adult', 'That player has not said they are 18 or older, so you cannot pass things to them.');
    if (!receiver.session) return no('receiver_away', 'That player is not playing right now.');
    if (!befriended(db, g, r)) return no('friends_only', 'You can only pass things to friends.');
    if (ctx.checks?.blocked?.(g, r)) return no('blocked', 'You cannot pass things to this player.');
    if (sharedDevice(db, g, r)) return no('same_device', 'You and this player have used the same device, so you cannot pass things to each other.');
    if (ctx.checks?.muted?.(g)) return no('muted', 'You cannot do this while you are muted.');
    if (ctx.checks?.banned?.(r, receiver.account)) return no('receiver_unavailable', 'That player cannot receive things right now.');
    const first = social.kit.col(db).players[g]?.first ?? t;
    if (t - first < LEGACY.minAgeMs) return no('too_new', 'Passing things to another player opens after a few days of playing.');
    if (jailOf(peekJustice(peekPolitics(db)), g, t)) return no('jailed', 'You cannot pass things on while you are in jail.');
    const mine = d.people[g]?.out, theirs = d.people[r]?.in;
    if (mine !== undefined && t - mine < LEGACY.gapMs) return no('too_soon', 'You can pass things to another player once every 14 days.');
    if (theirs !== undefined && t - theirs < LEGACY.gapMs) return no('receiver_too_soon', 'That player received things from someone within the last 14 days. Try again later.');
    if (Object.values(d.offers).some((o) => o.id !== ignore && o.from === g)) return no('offer_open', 'You already have an offer waiting. Cancel it or wait for an answer.');
    if (Object.values(d.offers).filter((o) => o.id !== ignore && o.to === r).length >= LEGACY.incomingMax) return no('receiver_busy', 'That player has too many offers waiting.');
    return null;
  }
  /** The worth ceiling: lifetime hand-overs plus gifts of money may not exceed what the giver earned from work. */
  function worthRefusal(giver: Side, d: LegacyCollection, worth: number): Refusal | null {
    const earned = giver.state.social.earned, spent = (d.people[giver.id]?.worth ?? 0) + giver.state.social.transfer.total;
    return spent + worth > earned ? no('over_allowance', 'What you can give away is limited to what you have earned from work, together with the money you have already given. This is more than that.') : null;
  }

  /** Remove offers past their time. Inside a write. */
  function sweep(d: LegacyCollection, push: Push, db: Db): void {
    const t = now();
    for (const offer of Object.values(d.offers)) {
      if (offer.expires > t) continue;
      delete d.offers[offer.id]; d.seq += 1; log(d, offer, 'other', 'expired');
      tell(db, offer.from, `Your offer to ${offer.toName} ran out. Nothing was passed.`, push);
    }
  }

  // ---- views ------------------------------------------------------------------------------------------------------------
  const offerView = (offer: Offer, me: string) => ({ id: offer.id, mine: offer.from === me, from: { id: offer.from, name: offer.fromName }, to: { id: offer.to, name: offer.toName }, lines: describe(offer.manifest), expires: offer.expires });
  const KINDS: { key: keyof Include; label: string }[] = [
    { key: 'houses', label: 'Houses' }, { key: 'cars', label: 'Cars' }, { key: 'shop', label: 'Shop' }, { key: 'furniture', label: 'Furniture' },
    { key: 'belongings', label: 'Belongings' }, { key: 'goodwill', label: 'Goodwill' }, { key: 'titles', label: 'Titles' },
  ];

  /** The whole Pass on screen. Reads only. */
  function view(db: Db, session: SessionRecord): Record<string, unknown> {
    const me = session.publicId, d = peekLegacy(db), t = now();
    const side = sideOf(session, shopOf(db, me), true);
    const kinds = side ? KINDS.flatMap(({ key, label }) => {
      const part = offerOf(side, { [key]: true });
      const lines = describe(part.manifest);
      return lines.length || part.stays.length ? [{ key, label, lines, stays: part.stays, heirOnly: key === 'titles' }] : [];
    }) : [];
    const players = social.kit.col(db).players;
    const adult = ctx.checks?.adult?.(db, me) === true && !isAgent(db, me, session);
    const friends = adult ? Object.keys(players[me]?.friends ?? {}).flatMap((id) => (befriended(db, me, id) && ctx.checks?.adult?.(db, id) === true && !isAgent(db, id) && !ctx.checks?.blocked?.(me, id) ? [{ id, name: players[id]?.name ?? 'Player' }] : [])).slice(0, 50) : [];
    const offers = Object.values(d.offers).filter((o) => o.expires > t);
    return {
      heirs: isAgent(db, me, session) ? [] : heirsOf(db, session),
      friends, kinds, adult,
      outgoing: offers.filter((o) => o.from === me).map((o) => offerView(o, me))[0] ?? null,
      incoming: offers.filter((o) => o.to === me).map((o) => offerView(o, me)),
      nextGiftAt: d.people[me]?.out !== undefined ? d.people[me]!.out! + LEGACY.gapMs : null,
    };
  }

  /** A trial run for the confirm screen: what would move, what would stay and why, or the refusal. Reads only. */
  function preview(db: Db, session: SessionRecord, to: string, include: Include): Record<string, unknown> {
    const me = session.publicId, d = peekLegacy(db);
    const giver = sideOf(session, shopOf(db, me), true);
    if (!giver) return no('no_life', 'You have no life to pass on yet.');
    const picked = parties(db, session, to);
    if ('code' in picked) return picked;
    const offer = offerOf(giver, include);
    const receiver = sideOf(picked.party.holder, shopOf(db, to), picked.party.session !== null);
    if (!receiver) return no('receiver_no_life', 'They have no life to receive things yet.');
    const cut = partition(giver, receiver, offer.manifest, picked.kind);
    const refusal = picked.kind === 'other' ? (otherRefusal(db, session, picked.party, d) ?? worthRefusal(giver, d, worthOf(cut.manifest, giver.shop))) : null;
    return { ok: !refusal && !isEmpty(cut.manifest), kind: picked.kind, to: { id: to, name: picked.party.holder.name }, lines: describe(cut.manifest), stays: [...offer.stays, ...cut.stays].slice(0, 12), ...(refusal ? { code: refusal.code, reason: refusal.reason } : isEmpty(cut.manifest) ? { code: 'nothing_to_pass', reason: 'Nothing you ticked can go to them.' } : {}) };
  }
  /** Who `to` is for this caller: an heir (a set-aside character of the same account) or a friend. */
  function parties(db: Db, session: SessionRecord, to: string): { party: Party; kind: Kind } | Refusal {
    if (!idOf(to) || to === session.publicId) return no('invalid_player', 'Choose who to pass things to.');
    if (heirsOf(db, session).some((heir) => heir.id === to)) { const party = partyOf(db, to, true); return party ? { party, kind: 'heir' } : no('heir_unavailable', 'That character cannot be reached.'); }
    const party = partyOf(db, to, false);
    return party ? { party, kind: 'other' } : no('receiver_away', 'That player is not playing right now.');
  }

  // ---- the writes -------------------------------------------------------------------------------------------------------------
  /** Bumps a character's revision so its other devices fetch the new life; the route reports it after the commit. */
  function touched(session: SessionRecord | null, changed: [string, number][]): void {
    if (!session) return;
    session.rev = Math.max((session.rev ?? 0) + 1, Math.floor(now()));
    changed.push([session.publicId, session.rev]);
  }
  /** The public lines for a finished hand-over: a house or a shop only, no names, no amounts, no contents. */
  function announce(db: Db, m: Manifest, giver: Side, key: string): void {
    const gist = gistService(ctx);
    if (m.houses.length) gist.add(db, { city: m.houses[0]!.city, kind: 'other', text: 'A family house was passed on in {city}.'.replace('{city}', cityName(m.houses[0]!.city) ?? 'the city'), refs: { key: `${key}:house` } });
    if (m.shop !== null && giver.shop) gist.add(db, { city: giver.shop.city, kind: 'business', text: `A stall in ${cityName(giver.shop.city) ?? 'the city'} has a new owner.`, refs: { key: `${key}:shop` } });
  }
  const live = (session: SessionRecord): CityId | null => { const city = characterCity(session); if (city) ctx.settle(session, city); return city; };
  const summary = (m: Manifest, stays: Stays[], moved: Moved | null) => ({ lines: describe(m), stays: stays.slice(0, 8), ...(moved ? { moved } : {}) });

  /** Pass on: to an heir at once, or an offer to a friend. */
  function pass(db: Db, session: SessionRecord, body: Record<string, unknown>): Record<string, unknown> & { push: Push; changed: [string, number][] } {
    const push: Push = [], changed: [string, number][] = [];
    const include = readInclude(body.include), to = typeof body.to === 'string' ? body.to : '';
    const run = (): Record<string, unknown> => {
      if (!ctx.allow(`legacy:${session.publicId}`, LEGACY.perMinute)) return no('rate_limited', 'Too many tries in a minute. Wait, then try again.');
      if (!Object.keys(include).length) return no('nothing_chosen', 'Choose what to pass on.');
      if (isAgent(db, session.publicId, session)) return no('agents_excluded', 'An AI-played character cannot give or be given property.');
      const city = live(session);
      const giver = city ? sideOf(session, shopOf(db, session.publicId), true) : null;
      if (!giver) return no('no_life', 'You have no life to pass on yet.');
      if (jailOf(peekJustice(peekPolitics(db)), giver.id, now())) return no('jailed', 'You cannot pass things on while you are in jail.');
      const busy = giver.state.activeAction?.kind;
      if (busy === 'travel' || busy === 'commute' || busy === 'intercity' || busy === 'homeward') return no('busy', 'A trip is in progress. Finish it first.');
      const picked = parties(db, session, to);
      if ('code' in picked) return picked;
      const { party, kind } = picked, d = data(db);
      sweep(d, push, db);
      if (party.session) live(party.session);
      const receiver = sideOf(party.holder, shopOf(db, party.id), party.session !== null);
      if (!receiver) return no('receiver_no_life', 'They have no life to receive things yet.');
      if (receiver.state.activeAction && party.session && ['travel', 'commute', 'intercity', 'homeward'].includes(receiver.state.activeAction.kind)) return no('receiver_busy', 'They are on a trip. Try again when they arrive.');
      // Who may give to whom comes before what: the reason a person is refused is the first thing to say.
      const people = kind === 'other' ? otherRefusal(db, session, party, d) : null;
      if (people) return people;
      const offer = offerOf(giver, include), cut = partition(giver, receiver, offer.manifest, kind), stays = [...offer.stays, ...cut.stays];
      if (isEmpty(cut.manifest)) return { ...no('nothing_to_pass', stays[0] ? `${stays[0].what}: ${stays[0].why}` : 'Nothing you ticked can be passed.'), stays: stays.slice(0, 8) };
      if (kind === 'heir') {
        d.seq += 1;
        const business = businessOf(db), moved = apply(giver, receiver, cut.manifest, 'heir', business);
        log(d, { id: `L-${d.seq}`, from: giver.id, to: receiver.id }, 'heir', 'passed');
        touched(party.session, changed); touched(session, changed);
        announce(db, cut.manifest, giver, `legacy:${d.seq}`);
        tell(db, receiver.id, `${giver.name} passed things on to you: ${describe(cut.manifest).join(', ')}.`, push);
        return { ok: true, code: 'passed', kind, to: { id: receiver.id, name: receiver.name }, ...summary(cut.manifest, stays, moved) };
      }
      const refusal = worthRefusal(giver, d, worthOf(cut.manifest, giver.shop));
      if (refusal) return refusal;
      if (Object.keys(d.offers).length >= LEGACY.offersMax) return no('busy', 'Too many offers are waiting on the server. Try again later.');
      d.seq += 1;
      const offerRecord: Offer = { id: `L-${d.seq}`, from: giver.id, fromName: giver.name, to: receiver.id, toName: receiver.name, at: now(), expires: now() + LEGACY.offerMs, manifest: cut.manifest, worth: worthOf(cut.manifest, giver.shop) };
      d.offers[offerRecord.id] = offerRecord;
      tell(db, receiver.id, `${giver.name} has offered you ${describe(cut.manifest).join(', ')}. Open Houses → Pass on to answer.`, push);
      return { ok: true, code: 'offered', kind, offer: offerView(offerRecord, giver.id), ...summary(cut.manifest, stays, null) };
    };
    const result = ctx.once(db, session, { id: body.requestId as never, kind: 'legacy.pass', fingerprint: [to, Object.keys(include).sort()] }, run as never) as Record<string, unknown>;
    return { ...result, push, changed };
  }

  /** The receiver accepts: re-checked against both lives as they are now, then moved, in this one transaction. */
  function accept(db: Db, session: SessionRecord, body: Record<string, unknown>): Record<string, unknown> & { push: Push; changed: [string, number][] } {
    const push: Push = [], changed: [string, number][] = [];
    const run = (): Record<string, unknown> => {
      if (!ctx.allow(`legacy:${session.publicId}`, LEGACY.perMinute)) return no('rate_limited', 'Too many tries in a minute. Wait, then try again.');
      const d = data(db), offer = own(d.offers, typeof body.offer === 'string' ? body.offer : '');
      if (!offer || offer.to !== session.publicId) return no('unknown_offer', 'That offer is not there any more.');
      const voided = (why: string): Record<string, unknown> => {
        delete d.offers[offer.id]; d.seq += 1; log(d, offer, 'other', 'void');
        tell(db, offer.from, `Your offer to ${offer.toName} could not go ahead: ${why} Nothing was passed.`, push);
        return { ok: true, code: 'offer_void', reason: `${why} Nothing was passed.` };
      };
      if (offer.expires <= now()) return voided('It ran out.');
      const giverParty = partyOf(db, offer.from, false);
      if (!giverParty?.session) return voided('The giver is not playing right now.');
      const refusal = otherRefusal(db, giverParty.session, { id: session.publicId, holder: session, session, account: session.account }, d, offer.id);
      if (refusal) return voided(refusal.reason);
      const gcity = live(giverParty.session), rcity = live(session);
      const giver = gcity ? sideOf(giverParty.session, shopOf(db, offer.from), true) : null, receiver = rcity ? sideOf(session, shopOf(db, session.publicId), true) : null;
      if (!giver || !receiver) return voided('A life is missing.');
      const business = businessOf(db), check = verify(giver, receiver, offer.manifest, 'other', business);
      if (!check.ok && check.code === 'receiver_blocked') return no(check.code, check.reason);
      if (!check.ok) return voided(check.reason);
      const worth = worthOf(offer.manifest, giver.shop), ceiling = worthRefusal(giver, d, worth);
      if (ceiling) return voided(ceiling.reason);
      const moved = apply(giver, receiver, offer.manifest, 'other', business);
      delete d.offers[offer.id]; d.seq += 1; log(d, offer, 'other', 'accepted');
      const mine = (d.people[offer.from] ||= {}), theirs = (d.people[offer.to] ||= {});
      mine.out = now(); mine.worth = (mine.worth ?? 0) + worth; theirs.in = now();
      if (Object.keys(d.people).length > LEGACY.peopleMax) for (const id of Object.keys(d.people).slice(0, Object.keys(d.people).length - LEGACY.peopleMax)) delete d.people[id];
      touched(giverParty.session, changed); touched(session, changed);
      announce(db, offer.manifest, giver, `legacy:${offer.id}`);
      tell(db, offer.from, `${receiver.name} accepted what you passed on.`, push);
      return { ok: true, code: 'accepted', ...summary(offer.manifest, [], moved) };
    };
    const result = ctx.once(db, session, { id: body.requestId as never, kind: 'legacy.accept', fingerprint: [typeof body.offer === 'string' ? body.offer : ''] }, run as never) as Record<string, unknown>;
    return { ...result, push, changed };
  }

  /** The receiver declines (`by` = to) or the giver cancels (`by` = from). Nothing moved, nothing to undo. Answering an offer that is gone is fine. */
  function end(db: Db, session: SessionRecord, body: Record<string, unknown>, by: 'to' | 'from'): Record<string, unknown> & { push: Push; changed: [string, number][] } {
    const push: Push = [], changed: [string, number][] = [];
    const offerId = typeof body.offer === 'string' ? body.offer : '';
    const run = (): Record<string, unknown> => {
      const d = data(db), offer = own(d.offers, offerId);
      if (!offer || offer[by] !== session.publicId) return { ok: true, code: 'gone' };
      delete d.offers[offer.id]; d.seq += 1;
      if (by === 'to') { log(d, offer, 'other', 'declined'); tell(db, offer.from, `${offer.toName} turned down your offer. Nothing was passed.`, push); }
      else { log(d, offer, 'other', 'cancelled'); tell(db, offer.to, `${offer.fromName} took back the offer.`, push); }
      return { ok: true, code: by === 'to' ? 'declined' : 'cancelled' };
    };
    const result = ctx.once(db, session, { id: body.requestId as never, kind: `legacy.${by === 'to' ? 'decline' : 'cancel'}`, fingerprint: [offerId] }, run as never) as Record<string, unknown>;
    return { ...result, push, changed };
  }

  return {
    view, preview, pass, accept,
    decline: (db: Db, session: SessionRecord, body: Record<string, unknown>) => end(db, session, body, 'to'),
    cancel: (db: Db, session: SessionRecord, body: Record<string, unknown>) => end(db, session, body, 'from'),
    deliver(push: Push, changed: [string, number][]): void {
      for (const [to, frame] of push) { try { ctx.push(to, frame as never); } catch { /* a socket that went away */ } }
      for (const [id, rev] of changed) { try { ctx.core.lifeChanged?.(id, rev); } catch { /* a device that went away */ } }
    },
  };
}
