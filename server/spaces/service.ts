/**
 * OWNER: spaces
 * AI SPACES on the server: design a home or a group room from a player's words, check a pasted plan, and apply a plan. The contract
 * is src/spaces/plan.ts; the words the model reads are ./design-prompt.ts; the design is docs/SPACES.md.
 *
 * DESIGN   the player's words pass the text filter first (a blocked description never reaches a model), then one request to the model
 *          router (routerOf(ctx).ask, purpose agent-talk, carriesPlayerWords: true, so only paid models that keep no data see it), at
 *          most one retry when the answer is not a plan. The answer is normalised, fitted into the real plot and its title checked
 *          (agentWords: the title is the model's words, shown on a share card). Nothing is stored: the description is never kept.
 * CHECK    the same, for a plan the player pasted (the Import box, the Allworld skill): no model.
 * APPLY    a home: in ONE store transaction, every placed piece goes to storage, then each piece of the plan is placed from storage or
 *          bought (the ordinary actions 'home.furniture-store', 'home.furniture-place', 'home.furniture-buy'), then the look
 *          ('estate.style'). Every shop rule, price, MAX_PLACED and achievement holds as for a tap in Buy mode. If any step is refused,
 *          the whole transaction is thrown away and the save is exactly as before. Nothing is sold.
 *          A group room: its members only; the room's pieces become the plan's in one write (rev + 1). Room furniture is free.
 *
 * SETTINGS (admin World page, no release): spacesAi (off until an operator turns it on), spacesDesignsPerHour (10).
 * STORAGE: a home applies through the life, a room through social.convs[g.N].room (server/social/places.ts); the applied home's
 * title is kept for its share card (./store.ts).
 */
import { registerAdminSetting } from '../admin/settings.ts';
import { routerOf } from '../models/service.ts';
import { screenText } from '../moderation/text.ts';
import { agentWords } from '../moderation/agent-words.ts';
import { gatewayUser } from '../companion/service.ts';
import { characterCity } from '../character.ts';
import { socialService } from '../social/service.ts';
import { plotFor } from '../../src/game/systems/home.ts';
import { ruledPlot } from '../../src/game/home-plan.ts';
import { isRoomId, PLACES, starterRoomItems } from '../../src/places/model.ts';
import { firstJsonObject, fitSpacePlan, layoutBrief, readBrief, fittedPlan, normalizeSpacePlan, oneLine, roomPlot, SPACE_LIMITS, spacePlanDiff, stylePriceOf, type SpacePlanV1, type SpaceProblem, type SpaceTarget } from '../../src/spaces/plan.ts';
import { designMessages } from './design-prompt.ts';
import { allowanceOf, weigh } from './weight.ts';
import { spacesOf } from './store.ts';
import type { Refusal } from '../models/router.ts';
import type { ConversationRecord, Db, RouteContext, RouteRequest, SessionRecord, SocialCollection } from '../types.ts';
import type { FurnitureId, HouseStyle, HouseTierId, LifeState, PlacedItem } from '../../src/types/life.ts';
import type { Plot } from '../../src/game/home-layout.ts';
import type { CityId } from '../../src/types/protocol.ts';

const HOUR = 3600000;
/** What the player reads for each way the router can refuse, and for the designer failing twice. */
export const REFUSAL_WORDS: Readonly<Record<Refusal, string>> = Object.freeze({
  'off': 'AI design is resting today. You can still buy pieces from the Buy catalogue, or paste a plan in Import.',
  'no-model': 'AI design is resting today. You can still buy pieces from the Buy catalogue, or paste a plan in Import.',
  'budget': 'Everyone is designing right now. Try again in a few minutes.',
  'rate': 'Everyone is designing right now. Try again in a few minutes.',
  'player-cap': 'You have used today’s AI designs. Try again tomorrow, or paste a plan in Import.',
  'failed': 'The designer could not draw that. Try fewer things or a simpler room.',
});
export const DESIGN_TOKENS = 1600;
export const DESIGN_TIMEOUT_MS = 20000;

type No = { ok: false; code: string; reason: string };
const no = (code: string, reason: string): No => ({ ok: false, code, reason });
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const REQUEST_ID = /^\d{1,16}:[0-9a-f-]{36}$/i;

/** A refusal thrown out of a transaction so that everything it changed is discarded. */
/** Where a plan is going: the plot, what stands there, and (for a home) the cash, tier, look and storage. */
interface Place { ok: true; publicId: string; plot: Plot; owned: boolean; size: HouseTierId | 'room'; items: PlacedItem[]; cash: number | null; tier: HouseTierId | undefined; style: HouseStyle | undefined; storage: Partial<Record<FurnitureId, number>> }
class Undo extends Error { readonly answer: No; constructor(answer: No) { super(answer.code); this.answer = answer; } }

/** `space`: the plot the plan was fitted into (src/game/home-layout.ts plotOf(grid, owned)), for the page's drawing. */
export interface DesignAnswer { ok: true; code: 'designed' | 'checked'; plan: SpacePlanV1; problems: SpaceProblem[]; cost: number; cash: number | null; space: { grid: number; owned: boolean }; model?: string; costMicro?: number }

const services = new WeakMap<RouteContext, ReturnType<typeof build>>();
export function spacesService(ctx: RouteContext) {
  const found = services.get(ctx);
  if (found) return found;
  const made = build(ctx);
  services.set(ctx, made);
  return made;
}

function build(ctx: RouteContext) {
  registerAdminSetting(ctx, { key: 'spacesAi', label: 'AI space design', help: 'Players describe a home or a group room and a language model lays it out (docs/SPACES.md). Off until an operator turns it on; it also needs a model key (without one the router answers "resting"). Pasting a plan works either way. A design costs about US$0.0006 from the shared US$2 day.', kind: 'boolean', default: () => false });
  registerAdminSetting(ctx, { key: 'spacesDesignsPerHour', label: 'AI designs per player per hour', help: 'On top of the model router’s own daily limits.', kind: 'number', min: 1, max: 100, default: () => 10 });
  const setting = (key: string): boolean | number | string | undefined => ctx.checks?.setting?.(key);
  const aiOn = (): boolean => setting('spacesAi') === true;
  const perHour = (): number => { const n = setting('spacesDesignsPerHour'); return typeof n === 'number' && n >= 1 ? n : 10; };
  const social = socialService(ctx);
  /** The house size whose scene a life's home is drawn with: its own tier, or the starter's for a rented room. */
  const sizeOf = (state: LifeState): HouseTierId => (state.estate.living === 'own' ? state.estate.tier : 'starter');

  /** The caller's life in the city their character is in, as stored (not settled: a design only reads it). */
  function storedLife(session: SessionRecord): { cityId: CityId; state: LifeState } | null {
    const cityId = characterCity(session), state = cityId ? session.cities?.[cityId]?.state : undefined;
    return cityId && state ? { cityId, state: state as LifeState } : null;
  }
  /** The group the caller is a member of, or a refusal. */
  function memberGroup(db: Db, session: SessionRecord, roomId: unknown): { refusal: No } | { s: SocialCollection; conv: ConversationRecord } {
    if (!isRoomId(roomId)) throw ctx.fail(400, 'invalid_room');
    const { s, id } = social.kit.enter(db, session);
    const conv = Object.hasOwn(s.convs, roomId) ? s.convs[roomId] : undefined;
    if (!conv || conv.kind !== 'group' || !conv.members.includes(id) || !s.players[id]?.convs[conv.id]) return { refusal: no('not_member', 'Only members of the group can design its room.') };
    return { s, conv };
  }
  const roomItemsOf = (conv: { room?: { items: PlacedItem[] } }): PlacedItem[] => conv.room?.items ?? starterRoomItems();

  /** Where a plan goes and what is there now, read in one snapshot. */
  async function where(request: RouteRequest, target: SpaceTarget, roomId: unknown): Promise<Place | No> {
    return ctx.store.read((db): Place | No => {
      const session = request.requireSession(db);
      if (target === 'room') {
        const found = memberGroup(db, session, roomId);
        if ('refusal' in found) return found.refusal;
        return { ok: true, publicId: session.publicId, plot: roomPlot(), owned: false, size: 'room', items: roomItemsOf(found.conv).map((item) => ({ ...item })), cash: null, tier: undefined, style: undefined, storage: {} };
      }
      const life = storedLife(session);
      if (!life) return no('no_home', 'Start your life in a city first.');
      const { state } = life;
      return { ok: true, publicId: session.publicId, plot: ruledPlot(plotFor(state)), owned: plotFor(state).w > plotFor(state).grid, size: sizeOf(state), items: state.home.items.map((item) => ({ ...item })), cash: state.cash, tier: state.estate.living === 'own' ? state.estate.tier : undefined, style: { ...state.estate.style }, storage: { ...state.home.storage } };
    });
  }

  /** Fit a plan into the place, clean its title, and price it. */
  function finish(plan: SpacePlanV1, place: Place, problems: SpaceProblem[], code: DesignAnswer['code']): DesignAnswer {
    const fit = fitSpacePlan(plan, place.plot, { weigh, allowance: allowanceOf(place.size) });
    const fitted = fittedPlan(plan, fit);
    if (place.tier) fitted.tier = place.tier; else delete fitted.tier;
    if (fitted.title && (screenText(fitted.title, { contact: true }) || !agentWords(fitted.title).ok)) delete fitted.title;
    delete fitted.notes;
    const cost = place.cash === null ? 0 : spacePlanDiff(place.items, place.storage, fit.items).cost + (place.style ? stylePriceOf(place.style, fitted.style) : 0);
    return { ok: true, code, plan: fitted, problems: [...problems, ...fit.problems], cost, cash: place.cash, space: { grid: place.plot.grid, owned: place.owned } };
  }

  const targetOf = (value: unknown): SpaceTarget => { if (value !== 'home' && value !== 'room') throw ctx.fail(400, 'invalid_target'); return value; };

  return {
    aiOn,
    /** POST /api/spaces/design { target, roomId?, prompt, keep? } */
    async design(request: RouteRequest): Promise<DesignAnswer | No> {
      const body = await request.json();
      const target = targetOf(body.target), prompt = oneLine(body.prompt, SPACE_LIMITS.prompt);
      if (!prompt) throw ctx.fail(400, 'invalid_prompt');
      if (!aiOn()) return no('off', REFUSAL_WORDS.off);
      const blocked = screenText(prompt, { contact: true, what: 'That description' });
      if (blocked) return no(blocked.code, blocked.reason);
      const place = await where(request, target, body.roomId);
      if (!place.ok) return place;
      const muted = ctx.checks?.muted?.(place.publicId);
      if (muted) return no(muted.code, muted.reason);
      if (!ctx.allow(`spaces:design:${place.publicId}`, perHour(), HOUR)) return no('rate', `You can make ${perHour()} AI designs an hour. Try again later, or change this one by hand.`);
      const router = routerOf(ctx);
      const brief = { target, prompt, plot: place.plot, tier: place.tier, cash: place.cash ?? undefined, style: place.style, current: body.keep === true ? place.items : undefined };
      let retry: { answer: string; problem: string } | undefined;
      let costMicro = 0;
      for (let attempt = 0; attempt < 2; attempt++) {
        const result = await router.ask({ purpose: 'agent-talk', messages: designMessages({ ...brief, retry }), maxTokens: DESIGN_TOKENS, playerId: gatewayUser(place.publicId), carriesPlayerWords: true, timeoutMs: DESIGN_TIMEOUT_MS });
        if (!result.ok) return no(result.why, REFUSAL_WORDS[result.why]);
        costMicro += result.costMicro;
        const problems: SpaceProblem[] = [];
        const parsed = firstJsonObject(result.text), rooms = readBrief(parsed);
        // The designer answers a brief (pieces by room) and the code lays it out; a whole plan with positions is read as well.
        const plan = rooms ? layoutBrief(rooms, place.plot, target, problems, body.keep === true ? place.items : []) : normalizeSpacePlan(parsed, problems, target);
        if (plan && plan.items.length) return { ...finish({ ...plan, target }, place, problems, 'designed'), model: result.model, costMicro };
        retry = { answer: result.text, problem: plan ? 'It named no pieces from the catalogue.' : 'It was not one JSON object with "rooms".' };
      }
      return no('failed', REFUSAL_WORDS.failed);
    },

    /** POST /api/spaces/check { target, roomId?, plan }: a pasted plan, normalised, fitted and priced. No model. */
    async check(request: RouteRequest): Promise<DesignAnswer | No> {
      const body = await request.json();
      const target = targetOf(body.target);
      const problems: SpaceProblem[] = [];
      const plan = normalizeSpacePlan(body.plan, problems, target);
      if (!plan) return no('invalid_plan', 'That is not an Allworld space plan. It needs "schema": "allworld-space" and a list of "items".');
      if (plan.target !== target) return no('wrong_target', plan.target === 'room' ? 'That plan is for a group room. Open your group’s room to import it.' : 'That plan is for a home. Open the Houses app to import it.');
      const place = await where(request, target, body.roomId);
      if (!place.ok) return place;
      if (!ctx.allow(`spaces:check:${place.publicId}`, 60, HOUR)) return no('rate', 'You are checking plans too fast. Wait a little.');
      return finish(plan, place, problems, 'checked');
    },

    /** POST /api/spaces/apply { target, roomId?, plan, requestId } */
    async apply(request: RouteRequest) {
      const body = await request.json();
      const target = targetOf(body.target);
      if (typeof body.requestId !== 'string' || !REQUEST_ID.test(body.requestId)) throw ctx.fail(400, 'invalid_request_id');
      const problems: SpaceProblem[] = [];
      const plan = normalizeSpacePlan(body.plan, problems, target);
      if (!plan || plan.target !== target) return no('invalid_plan', 'That plan cannot be used here.');
      try {
        return await ctx.store.transact((db) => {
          const session = request.requireSession(db, { renew: true });
          if (!ctx.allow(`spaces:apply:${session.publicId}`, 20, HOUR)) return no('rate', 'You have changed your space many times this hour. Wait a little.');
          if (target === 'room') {
            const found = memberGroup(db, session, body.roomId);
            if ('refusal' in found) return found.refusal;
            const fit = fitSpacePlan(plan, roomPlot(), { limit: PLACES.roomItems, weigh, allowance: allowanceOf('room') });
            const room = found.conv.room ??= { items: starterRoomItems(), rev: 0 };
            const stamp = (ctx.now() % 1e9).toString(36).padStart(6, '0');
            room.items = fit.items.map((item, index) => ({ ...item, id: `p${stamp}${index.toString(36).padStart(3, '0')}`.slice(0, 25) }));
            room.rev += 1;
            return { ok: true as const, code: 'applied', placed: fit.items.length, spent: 0, problems: [...problems, ...fit.problems], rev: room.rev };
          }
          return ctx.once(db, session, { id: body.requestId as string, kind: 'spaces.apply', fingerprint: [JSON.stringify(body.plan).length, plan.items.length] }, () => {
            const done = applyHome(session, plan, problems);
            // The title is what a share card says: kept only when it passes the filters again (it came back from the page).
            const homes = spacesOf(db).homes, title = plan.title && !screenText(plan.title, { contact: true }) && agentWords(plan.title).ok ? plan.title : '';
            if (title) homes[session.publicId] = { title, at: ctx.now() };
            else delete homes[session.publicId];
            return done;
          });
        });
      } catch (error) {
        if (error instanceof Undo) return error.answer;
        throw error;
      }
    },
  };

  /** Inside a transaction and its receipt: store everything, then place or buy each piece, then the look. Any refusal undoes it all. */
  function applyHome(session: SessionRecord, plan: SpacePlanV1, problems: SpaceProblem[]) {
    const cityId = characterCity(session);
    if (!cityId || !session.cities?.[cityId]) throw new Undo(no('no_home', 'Start your life in a city first.'));
    const life = ctx.settle(session, cityId);
    if (life.location !== 'home') throw new Undo(no('not_home', 'Go home first: furniture is arranged at home.'));
    const fit = fitSpacePlan(plan, ruledPlot(plotFor(life)), { weigh, allowance: allowanceOf(sizeOf(life)) });
    const startCash = life.cash;
    const act = (type: 'home.furniture-store' | 'home.furniture-place' | 'home.furniture-buy' | 'estate.style', payload: Record<string, unknown>) => {
      const done = ctx.act(life, { type, cityId, payload });
      if (!done.ok) {
        const short = done.code === 'insufficient_funds';
        throw new Undo(no(done.code, short ? `${done.reason ?? 'Not enough cash.'} Nothing was bought; remove some pieces or choose cheaper ones.` : done.reason ?? 'That could not be done.'));
      }
    };
    for (const item of [...life.home.items]) act('home.furniture-store', { id: item.id });
    for (const item of fit.items) {
      const payload = { item: item.itemId, x: item.x, y: item.y, rot: item.rot, ...(item.floor ? { floor: item.floor } : {}) };
      act((life.home.storage[item.itemId] ?? 0) > 0 ? 'home.furniture-place' : 'home.furniture-buy', payload);
    }
    if (plan.style) act('estate.style', { style: plan.style });
    return { ok: true as const, code: 'applied', placed: fit.items.length, spent: startCash - life.cash, problems: [...problems, ...fit.problems] };
  }
}

export const isDesignAnswer = (value: unknown): value is DesignAnswer => isRecord(value) && value.ok === true && isRecord(value.plan);
