/**
 * OWNER: social
 * OWAMBE PARTIES in a home. A party is a few fields on the host's house (social.houses[host].party, additive; the rules and the
 * words are src/festivals/party.ts): a title, an aso-ebi colour (the dress code), an end time (PARTY.minutes after it starts), an
 * optional MC and DJ among the guests inside, and a count of sprays. Guests come in the way they always do (the host's door,
 * invitations, links: server/social/visit.ts); the party only adds what they see.
 *
 *   start   { title?, colour }            the host is home; starting again while one runs changes the title and colour and keeps the roles
 *   role    { role: mc | dj, guest|null }  the host names a guest inside (or clears the role); one role per guest
 *   spray   { host? }                      host or guest: a line in the house chat, no money moves; PARTY.sprayPerGuest each, spaced out
 *   end                                    the host ends it; guests stay in the visit
 * Row cost: each is one social row (the house, plus the house chat line it writes). Reads cost nothing: the party rides in the
 * house view the guests already get.
 */
import { COLOURS, PARTY, ROLE_LABEL, assignRole, cleanTitle, colourOf, isRole, maySpray, partyOn } from '../../src/festivals/party.ts';
import { UUID_PATTERN } from '../protocol.ts';
import { socialService } from './service.ts';
import type { PushList } from './service.ts';
import type { RouteContext, SocialCollection, Db, SessionRecord } from '../types.ts';

const no = <Code extends string>(code: Code, reason: string) => ({ ok: false as const, code, reason });
const yes = <Code extends string, const Extra extends object = object>(code: Code, extra?: Extra) => ({ ok: true as const, code, ...extra }) as { ok: true; code: Code } & Extra;

const services = new WeakMap<RouteContext, ReturnType<typeof build>>();
export function partyService(ctx: RouteContext): ReturnType<typeof build> {
  let found = services.get(ctx);
  if (!found) services.set(ctx, found = build(ctx));
  return found;
}

function build(ctx: RouteContext) {
  const kit = socialService(ctx).kit, now = (): number => ctx.now();
  const bad = (code: string) => ctx.fail(400, code);
  /** A line in the house chat, when there is one (it exists while somebody is inside). */
  function say(s: SocialCollection, hostId: string, text: string, push: PushList): void {
    const conv = s.convs[`h.${hostId}`];
    if (conv) kit.fanOut(s, conv, kit.append(s, conv, null, text, null, true), push, null);
  }
  return {
    start(db: Db, session: SessionRecord, body: Record<string, unknown>) {
      const { s, id } = kit.enter(db, session);
      const title = cleanTitle(body.title), colour = colourOf(body.colour);
      if (title === null) throw bad('invalid_title');
      if (!colour) throw bad('invalid_colour');
      if (!kit.hostAtHome(s, id, undefined)) return no('host_not_home', 'You need to be home to throw a party.');
      const house = kit.pruneHouse(s, id) ?? (s.houses[id] = { knocks: {}, guests: {} }), t = now(), push: PushList = [];
      const again = partyOn(house.party, t);
      if (house.party && again) { house.party.title = title; house.party.colour = colour.id; }
      else house.party = { title, colour: colour.id, startedAt: t, until: t + PARTY.minutes * 60000, sprays: 0 };
      say(s, id, again ? `The dress code is now ${colour.label.toLowerCase()}.` : `${s.players[id]?.name ?? 'The host'} is throwing a party: ${title}. Dress code: ${colour.label.toLowerCase()}.`, push);
      kit.housePush(s, id, push);
      return yes('started', { house: kit.houseView(s, id, id), push });
    },
    role(db: Db, session: SessionRecord, body: Record<string, unknown>) {
      const { s, id } = kit.enter(db, session);
      if (!isRole(body.role)) throw bad('invalid_role');
      const guest = body.guest === null ? null : typeof body.guest === 'string' && UUID_PATTERN.test(body.guest) ? body.guest.toLowerCase() : undefined;
      if (guest === undefined) throw bad('invalid_player');
      const house = kit.pruneHouse(s, id);
      if (!house || !partyOn(house.party, now())) return no('no_party', 'Start a party first.');
      const next = assignRole(house.party, body.role, guest, Object.keys(house.guests));
      if ('reason' in next) return no('not_inside', next.reason);
      const party = house.party;
      delete party.mc; delete party.dj;
      if (next.mc) party.mc = next.mc;
      if (next.dj) party.dj = next.dj;
      const push: PushList = [];
      if (guest) say(s, id, `${s.players[guest]?.name ?? 'A guest'} is the ${ROLE_LABEL[body.role]}.`, push);
      kit.housePush(s, id, push);
      return yes('role', { house: kit.houseView(s, id, id), push });
    },
    spray(db: Db, session: SessionRecord, body: Record<string, unknown>) {
      const { s, id } = kit.enter(db, session);
      const hostId = body.host === undefined ? id : typeof body.host === 'string' && UUID_PATTERN.test(body.host) ? body.host.toLowerCase() : null;
      if (hostId === null) throw bad('invalid_player');
      const house = kit.pruneHouse(s, hostId);
      if (!house || !partyOn(house.party, now()) || (hostId !== id && !house.guests[id])) return no('no_party', 'There is no party here.');
      const ok = maySpray(house.party, id, now());
      if (!ok.ok) return no('spray_limit', ok.reason);
      if (!ctx.allow(`party:spray:${id}`, 1, PARTY.sprayEveryMs)) return no('spray_limit', 'Slow down a little.');
      house.party.sprays += 1;
      (house.party.sprayed ||= {})[id] = (house.party.sprayed[id] ?? 0) + 1;
      const push: PushList = [];
      say(s, hostId, `${s.players[id]?.name ?? 'Someone'} sprayed the floor. Make way!`, push);
      kit.housePush(s, hostId, push);
      return yes('sprayed', { house: kit.houseView(s, hostId, id), push });
    },
    end(db: Db, session: SessionRecord) {
      const { s, id } = kit.enter(db, session);
      const house = kit.pruneHouse(s, id);
      if (!house?.party) return yes('ended', { house: kit.houseView(s, id, id), duplicate: true as const });
      const push: PushList = [];
      delete house.party;
      say(s, id, 'The party is over. Thank you for coming.', push);
      kit.housePush(s, id, push);
      kit.pruneHouse(s, id);
      return yes('ended', { house: kit.houseView(s, id, id), push });
    },
    colours: COLOURS,
  };
}
