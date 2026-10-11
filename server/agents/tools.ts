/**
 * THE AGENT TOOLS (design: docs/AGENTS.md). Each tool is a thin wrapper over what a player's own client already does: a game action
 * through the same pipeline as POST /api/action (validation, cooldowns, costs, receipts: executeCommand), or a read of the player's own
 * life and own social page. A tool reads and shows only what that player's client could already read; it never shows another
 * player's location, and it never runs a model. Every answer carries the short life summary, so an agent needs few calls.
 */
import type { LifeState } from '../../src/types/life.ts';
import type { LifeView } from '../../src/types/view.ts';
import type { ActionOutcome, Db, RouteContext, RouteRequest, SessionRecord } from '../types.ts';
import type { ActionRequest, CityId } from '../../src/types/protocol.ts';
import { viewLife } from '../../src/life.ts';
import { lagosTime } from '../../src/game/clock.ts';
import { spotsOf } from '../../src/game/systems/activities.ts';
import { NEEDS } from '../../src/game/systems/needs.ts';
import { hash53, venueRoomKey } from '../protocol.ts';
import { UUID_PATTERN } from '../protocol.ts';
import { screenText } from '../moderation/text.ts';
import { transactWithCityContent } from '../prepared-city-transaction.ts';
import { executeCommand, outcomeKey } from '../routes/core.ts';
import { socialService } from '../social/service.ts';
import { presenceOf } from '../social/presence.ts';
import { AGENT_LIMITS, agentMark, scopeAllows } from './policy.ts';
import { refusal } from './service.ts';
import type { Agent, AgentOutcome, AgentService } from './service.ts';

type Json = Record<string, unknown>;
export interface ToolContext { ctx: RouteContext; svc: AgentService; agent: Agent; request: RouteRequest }
/** What a tool answers: the data for the agent, and what the bookkeeping needs to know. */
export interface ToolOutput { ok: boolean; code: string; data: Json; refused?: boolean; sent?: boolean; aid?: string; facts?: AgentOutcome['facts'] }
export interface ToolDefinition {
  name: string
  description: string
  inputSchema: Json
  readOnly: boolean
  /** A tool that sends a message counts against the message caps too. */
  message?: boolean
  run(c: ToolContext, args: Json, rid: string | undefined): Promise<ToolOutput>
}

const str = (value: unknown): string | undefined => (typeof value === 'string' && value.length ? value : undefined);
const num = (value: unknown): number | undefined => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);
const naira = (value: number): string => `₦${Math.round(value).toLocaleString('en-NG')}`;
const bad = (c: ToolContext, code: string, reason: string): Error => refusal(c.ctx, 400, code, reason);

// ---- the player's own life ----------------------------------------------------------------------------------------------------------

interface Look<T> { value: T; state: LifeState; view: LifeView; session: SessionRecord }
/** The caller's life, settled to now, and `read` of it. Saved only when the settlement changed something a player would see (as GET /api/life). */
async function look<T>(c: ToolContext, read: (state: LifeState, view: LifeView, db: Db, session: SessionRecord) => T): Promise<Look<T>> {
  const cityId = c.agent.cityId;
  const done = await transactWithCityContent(c.ctx, c.request, [cityId], (db) => {
    const session = c.request.requireSession(db, { renew: true });
    c.ctx.checks?.cityGate?.(session, cityId);
    const before = outcomeKey(session.cities?.[cityId]?.state);
    const state = c.ctx.settle(session, cityId);
    const view = viewLife(state, { now: c.ctx.now(), cityId });
    return { value: read(state, view, db, session), state, view, session, material: before !== outcomeKey(state) };
  }, { durable: (result) => result.material, waitForObserved: true });
  return { value: done.value, state: done.state, view: done.view, session: done.session };
}

/** The short summary every answer carries. Compact on purpose: an agent pays for what it reads. */
function brief(c: ToolContext, state: LifeState, view: LifeView): Json {
  const now = c.ctx.now(), t = lagosTime(now);
  const here = view.travel.destinations.find((place) => place.here);
  const active = state.activeAction;
  const needs: Record<string, number> = {};
  for (const need of NEEDS) needs[need] = Math.round(state.needs[need] ?? 0);
  return {
    city: c.agent.cityId, cash: state.cash, needs, mood: view.needs.mood.label,
    job: view.career.employed ? { label: view.career.label, pay: view.career.pay, shiftToday: view.career.today.text } : null,
    place: { id: state.location, label: here?.label ?? state.location, spot: view.activities.spot, open: here?.open ?? null },
    doing: active ? { kind: active.kind, ...(active.kind === 'activity' ? { id: active.id } : {}), secondsLeft: Math.ceil(active.remaining) } : null,
    time: { lagos: `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`, day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][t.weekday] },
    ...(state.message ? { lastMessage: state.message } : {}),
  };
}
/** A cursor that changes only when something an agent decides on changes (not with the clock). */
const cursorOf = (summary: Json): string => hash53(JSON.stringify({ ...summary, time: undefined, lastMessage: undefined, needs: Object.entries(summary.needs as Record<string, number>).map(([k, v]) => [k, Math.round(v / 5)]) }));
const factsOf = (state: LifeState, now: number): NonNullable<ToolOutput['facts']> => ({ cash: state.cash, week: state.civic?.week?.week ?? 0, earned: state.civic?.week?.week === lagosTime(now).week ? state.civic.week.earned : 0 });

/** What to do next, for the refusals an agent meets most. The game's own sentence always comes first. */
const NEXT: Record<string, string> = {
  busy: 'You are in the middle of something: call wait_until_done, or cancel is not offered to agents, so wait for it to finish.',
  insufficient_funds: 'You do not have enough money for that. Work a shift or choose something cheaper (list_actions_here shows prices).',
  closed: 'That place is closed right now. list_places shows when it opens.',
  needs_required: 'Your needs are too low for that. Use eat_or_rest first.',
  job_required: 'That needs a job. Call work to see jobs you can apply for.',
  cooldown: 'That needs a rest first. Try something else and come back later.',
  already_here: 'You are already there. Use list_actions_here to see what you can do.',
  day_off: 'You do not work today. Do something else.',
  shift_done: 'You already worked your shift today.',
};
const wordsFor = (code: string, reason: string | undefined, state: LifeState | undefined): string => {
  const sentence = (reason ?? state?.message ?? 'That is not possible right now.').trim();
  const next = NEXT[code];
  return next && !sentence.includes(next) ? `${sentence} ${next}` : sentence;
};

// ---- game actions ------------------------------------------------------------------------------------------------------------------

/**
 * Run ONE game action for the agent through the player's own pipeline. The action must be on the key's allow-list (deny by default); the
 * rules, costs, cooldowns and the exactly-once receipt are the game's. A `rid` the agent sent again answers from the receipt.
 */
async function act(c: ToolContext, type: string, payload: Json, rid?: string): Promise<ToolOutput & { outcome: ActionOutcome }> {
  if (!scopeAllows(c.agent.key.scopes, type)) throw refusal(c.ctx, 403, 'not_allowed', 'This key is not allowed to do that. Agents may play the game (travel, activities, work, shops, messages) but not change settings, property, money accounts or identity.');
  const known = rid ? c.agent.key.audit.find((entry) => entry.rid === rid)?.aid : undefined;
  const aid = known ?? `${c.ctx.now()}:${c.ctx.randomId()}`;
  const body: ActionRequest = { actionId: aid as ActionRequest['actionId'], cityId: c.agent.cityId, type: type as ActionRequest['type'], payload } as ActionRequest;
  const outcome = await executeCommand(c.ctx, c.request, body, {}, false, true);
  const state = outcome.state;
  return { ok: outcome.ok, code: outcome.code, refused: !outcome.ok, aid, outcome, data: {}, ...(state ? { facts: factsOf(state, c.ctx.now()) } : {}) };
}
/** The answer of a tool that ran one action: what happened in words, then the summary of the life as it now stands. */
async function answered(c: ToolContext, done: ToolOutput & { outcome: ActionOutcome }, extra: Json = {}): Promise<ToolOutput> {
  const state = done.outcome.state;
  const view = state ? viewLife(state, { now: c.ctx.now(), cityId: c.agent.cityId }) : null;
  const words = done.ok ? (state?.message ? state.message : 'Done.') : wordsFor(done.code, done.outcome.reason, state);
  return { ...done, data: { ok: done.ok, code: done.code, result: words, ...(done.ok ? extra : {}), ...(state && view ? { life: brief(c, state, view) } : {}), ...(done.outcome.duplicate ? { duplicate: true } : {}) } };
}
const endsIn = (state: LifeState | undefined): Json => (state?.activeAction ? { endsInSeconds: Math.ceil(state.activeAction.remaining), ask: 'Call wait_until_done, or do other quick things, then check get_my_life.' } : {});

// ---- the tools -------------------------------------------------------------------------------------------------------------------

const obj = (properties: Json, required: string[] = []): Json => ({ type: 'object', properties, required, additionalProperties: false });
const RID = { type: 'string', minLength: 4, maxLength: 64, description: 'Optional. A unique id you make for this call: if you send the same one again (a retry after a timeout) the game answers from the first result instead of doing it twice.' };

function placeCards(view: LifeView) {
  return view.travel.destinations.filter((place) => place.kind !== 'soon');
}
/** The cheapest trip to a place that can start now, or the reason none can. */
function bestMode(place: LifeView['travel']['destinations'][number], wanted: string | undefined) {
  const ok = place.modes.filter((mode) => !mode.blocked && (wanted === undefined || mode.id === wanted));
  return ok.sort((a, b) => a.fare - b.fare || a.seconds - b.seconds)[0];
}

/** Rows of the activities at this spot, compact. */
const cards = (view: LifeView) => view.activities.cards.map((card) => ({
  id: card.id, label: card.label, ...(card.cost ? { cost: card.cost } : {}), ...(card.reward ? { pays: card.reward } : {}), minutes: Math.max(1, Math.round((card.duration ?? 0) / 60 * 10) / 10),
  ...(card.effects && Object.keys(card.effects).length ? { needs: card.effects } : {}), ...(card.choices ? { choices: card.choices.map((choice) => choice.id) } : {}), ...(card.blocked ? { blocked: card.blocked.reason } : {}),
}));

const get_my_life: ToolDefinition = {
  name: 'get_my_life', readOnly: true,
  description: 'Your character right now: money (naira), needs 0-100 (hunger, energy, fun, social, hygiene, bladder: low means bad), mood, job and today\'s shift, the place you are in, what you are doing and how long it has left, and the time in Lagos. Pass the `cursor` from your last answer as `since` to get a tiny "unchanged" answer when nothing that matters changed: the cheap way to poll.',
  inputSchema: obj({ since: { type: 'string', maxLength: 40, description: 'The cursor of your previous get_my_life answer.' } }),
  async run(c, args) {
    const { value } = await look(c, (state, view) => brief(c, state, view));
    const cursor = cursorOf(value);
    if (args.since === cursor) return { ok: true, code: 'unchanged', data: { unchanged: true, cursor, time: value.time, doing: value.doing } };
    return { ok: true, code: 'ok', data: { ...value, cursor } };
  },
};

const get_goals: ToolDefinition = {
  name: 'get_goals', readOnly: true,
  description: 'What the game suggests you do next: your current starter goal, today\'s and this week\'s missions (progress, reward, whether they are ready to collect with claim), and the next step toward your job. Use it to decide what to do when nothing is urgent.',
  inputSchema: obj({}),
  async run(c) {
    const { value } = await look(c, (state, view) => {
      const chain = view.goals.chain.current;
      const rows = (list: typeof view.missions.daily) => list.map((m) => ({ id: m.id, label: m.label, hint: m.hint, progress: `${m.n}/${m.count}`, pays: m.cash, done: m.done, claimed: m.claimed, ...(m.go ? { goTo: m.go[0] } : {}) }));
      return {
        goal: chain ? { title: chain.title, hint: chain.hint, pays: chain.cash } : null, starterGoals: `${view.goals.chain.index}/${view.goals.chain.total}`,
        missions: view.missions.locked ? { locked: view.missions.locked } : { today: rows(view.missions.daily), thisWeek: rows(view.missions.weekly), readyToClaim: view.missions.claimable },
        job: view.career.step, life: brief(c, state, view),
      };
    });
    return { ok: true, code: 'ok', data: value };
  },
};

const list_places: ToolDefinition = {
  name: 'list_places', readOnly: true,
  description: 'The places you can travel to in your city: whether each is open now, its hours, what it offers, and the cheapest trip (fare in naira and seconds). Use the `id` with travel. Places that are closed or too expensive are marked.',
  inputSchema: obj({ onlyOpen: { type: 'boolean', description: 'Only places that are open right now. Default false.' } }),
  async run(c, args) {
    const { value } = await look(c, (state, view) => ({
      places: placeCards(view).filter((place) => !place.here && (args.onlyOpen !== true || place.open)).map((place) => {
        const trip = bestMode(place, undefined);
        return { id: place.id, label: place.label, district: place.district, open: place.open, hours: place.hours, offers: place.preview.slice(0, 5),
          ...(trip ? { cheapest: { mode: trip.id, fare: trip.fare, seconds: trip.seconds } } : { cannotGo: place.blocked?.reason ?? place.modes.find((mode) => mode.blocked)?.blocked?.reason ?? 'No way to get there right now.' }) };
      }), life: brief(c, state, view),
    }));
    return { ok: true, code: 'ok', data: value };
  },
};

const list_actions_here: ToolDefinition = {
  name: 'list_actions_here', readOnly: true,
  description: 'What you can do right now where you are: each activity with its cost, what it pays, how long it takes in minutes, which needs it restores, and (if it cannot be started) why not. Also the other spots in this place. Start one with do_activity.',
  inputSchema: obj({}),
  async run(c) {
    const { value } = await look(c, (state, view) => ({
      place: state.location, spot: view.activities.spot, spots: view.activities.spots.map((spot) => ({ id: spot.id, label: spot.label, activities: spot.count })), actions: cards(view), life: brief(c, state, view),
    }));
    return { ok: true, code: 'ok', data: value };
  },
};

const travel: ToolDefinition = {
  name: 'travel', readOnly: false,
  description: 'Go to another place in your city (an `id` from list_places, or "home"). The fare is charged now. It takes real time: call wait_until_done, then list_actions_here. Without `mode` the cheapest way you can afford is used.',
  inputSchema: obj({ place: { type: 'string', maxLength: 64 }, mode: { type: 'string', maxLength: 24, description: 'A mode id shown by list_places, for example "walk".' }, rid: RID }, ['place']),
  async run(c, args, rid) {
    const place = str(args.place);
    if (!place) throw bad(c, 'invalid_place', 'Say which place to go to (an id from list_places).');
    const { value: card } = await look(c, (_state, view) => placeCards(view).find((item) => item.id === place));
    if (!card) throw bad(c, 'unknown_place', 'There is no such place here. Call list_places for the ids.');
    const mode = bestMode(card, str(args.mode));
    if (!mode) {
      const why = card.blocked?.reason ?? card.modes.find((m) => !args.mode || m.id === args.mode)?.blocked?.reason ?? 'You cannot get there right now.';
      return { ok: false, code: card.blocked?.code ?? 'travel_blocked', refused: true, data: { ok: false, result: wordsFor(card.blocked?.code ?? 'travel_blocked', why, undefined) } };
    }
    const done = await act(c, 'travel', { id: place, mode: mode.id }, rid);
    return answered(c, done, { going: card.label, mode: mode.id, fare: mode.fare, ...endsIn(done.outcome.state) });
  },
};

const do_activity: ToolDefinition = {
  name: 'do_activity', readOnly: false,
  description: 'Start one activity from list_actions_here (use its `id`). Only one thing runs at a time. It takes real time: the answer says how many seconds it has left; call wait_until_done. Pass `choice` when the activity lists choices, and `spot` to first walk to another spot in the same place.',
  inputSchema: obj({ id: { type: 'string', maxLength: 80 }, choice: { type: 'string', maxLength: 40 }, spot: { type: 'string', maxLength: 40 }, rid: RID }, ['id']),
  async run(c, args, rid) {
    const id = str(args.id);
    if (!id) throw bad(c, 'invalid_activity', 'Say which activity (an id from list_actions_here).');
    if (str(args.spot)) {
      const moved = await act(c, 'spot', { id: str(args.spot) });
      if (!moved.ok) return answered(c, moved);
    }
    const done = await act(c, 'activity', { id, ...(str(args.choice) ? { choice: str(args.choice) } : {}) }, rid);
    return answered(c, done, endsIn(done.outcome.state));
  },
};

const wait_until_done: ToolDefinition = {
  name: 'wait_until_done', readOnly: true,
  description: `Wait for what you are doing (an activity, a shift or a trip) to finish, then say what happened. Waits up to \`maxWaitSeconds\` (at most ${AGENT_LIMITS.longestWaitSeconds}) and answers with how much time is left if it is still running: call it again, or sleep on your side first. This costs a call each time, so prefer one longer wait.`,
  inputSchema: obj({ maxWaitSeconds: { type: 'integer', minimum: 0, maximum: AGENT_LIMITS.longestWaitSeconds } }),
  async run(c, args) {
    const wait = Math.max(0, Math.min(AGENT_LIMITS.longestWaitSeconds, Math.floor(num(args.maxWaitSeconds) ?? 0)));
    let seen = await look(c, (state, view) => brief(c, state, view));
    const left = (seen.value.doing as { secondsLeft?: number } | null)?.secondsLeft;
    if (wait > 0 && left !== undefined && left <= wait + 1) {
      await new Promise((resolve) => setTimeout(resolve, left * 1000 + 250));
      seen = await look(c, (state, view) => brief(c, state, view));
    }
    const doing = seen.value.doing as { secondsLeft: number } | null;
    return { ok: true, code: doing ? 'still_running' : 'done', data: { done: !doing, ...(doing ? { secondsLeft: doing.secondsLeft, tip: `Call again in about ${doing.secondsLeft} seconds.` } : {}), life: seen.value } };
  },
};

/** Activities that raise `need`, best first: the most gained per naira, then the quickest. */
const gain = (effects: Partial<Record<string, number>> | undefined, need: string): number => effects?.[need] ?? 0;

const eat_or_rest: ToolDefinition = {
  name: 'eat_or_rest', readOnly: false,
  description: 'Shortcut to look after a need. `need` is "hunger" (eat), "energy" (rest or sleep) or another need; without it the lowest of hunger and energy. It starts the best affordable activity HERE that restores it. If nothing here does, it tells you where to go (use travel) instead of guessing.',
  inputSchema: obj({ need: { type: 'string', enum: [...NEEDS] }, rid: RID }),
  async run(c, args, rid) {
    const picked = await look(c, (state, view) => {
      const need = str(args.need) ?? ((state.needs.hunger ?? 50) <= (state.needs.energy ?? 50) ? 'hunger' : 'energy');
      const here = view.activities.cards.filter((card) => !card.blocked && !card.choices && gain(card.effects, need) > 0 && (card.cost ?? 0) <= state.cash)
        .sort((a, b) => gain(b.effects, need) / (1 + (b.cost ?? 0) / 100) - gain(a.effects, need) / (1 + (a.cost ?? 0) / 100))[0];
      let elsewhereSpot: { spot: string; id: string } | undefined;
      if (!here) {
        for (const spot of spotsOf(state.location, c.agent.cityId)) {
          const found = spot.activities.find((def) => !def.choices && gain(def.effects, need) > 0 && (def.cost ?? 0) <= state.cash && !def.unavailable && !def.requiresJob);
          if (found) { elsewhereSpot = { spot: spot.id, id: found.id }; break; }
        }
      }
      let go: { place: string; label: string; activity: string; fare: number | undefined } | undefined;
      if (!here && !elsewhereSpot) {
        for (const place of placeCards(view).filter((p) => !p.here && p.open)) {
          const trip = bestMode(place, undefined);
          const spot = trip ? spotsOf(place.id, c.agent.cityId).flatMap((s) => s.activities).find((def) => !def.choices && gain(def.effects, need) > 0 && (def.cost ?? 0) + (trip.fare) <= state.cash && !def.unavailable && !def.requiresJob) : undefined;
          if (trip && spot && (!go || (trip.fare < (go.fare ?? Infinity)))) go = { place: place.id, label: place.label, activity: spot.label, fare: trip.fare };
        }
      }
      return { need, here: here?.id, elsewhereSpot, go };
    });
    const { need, here, elsewhereSpot, go } = picked.value;
    if (here || elsewhereSpot) {
      if (elsewhereSpot) { const moved = await act(c, 'spot', { id: elsewhereSpot.spot }); if (!moved.ok) return answered(c, moved); }
      const done = await act(c, 'activity', { id: here ?? elsewhereSpot!.id }, rid);
      return answered(c, done, { restoring: need, ...endsIn(done.outcome.state) });
    }
    const why = go ? `Nothing here restores ${need}. ${go.label} has "${go.activity}": call travel with place "${go.place}" (fare ${naira(go.fare ?? 0)}).` : `Nothing you can afford here or nearby restores ${need} right now. Work a shift for money first (call work), or check list_places.`;
    return { ok: false, code: 'nothing_here', refused: true, data: { ok: false, code: 'nothing_here', result: why, ...(go ? { next: { tool: 'travel', place: go.place } } : {}), life: brief(c, picked.state, picked.view) } };
  },
};

const work: ToolDefinition = {
  name: 'work', readOnly: false,
  description: 'Your job. If you have a job and today is a work day: starts your shift (you must be at the workplace; if not it says where to travel). If you have no job: lists jobs you can apply for. Pass `apply` with a job id to apply (an existing job is never switched by an agent).',
  inputSchema: obj({ apply: { type: 'string', maxLength: 40, description: 'A job id from the list.' }, rid: RID }),
  async run(c, args, rid) {
    if (str(args.apply)) {
      const done = await act(c, 'apply-job', { id: str(args.apply) }, rid);
      return answered(c, done);
    }
    const seen = await look(c, (state, view) => ({ career: view.career, state, step: view.career.step }));
    const { career, step } = seen.value;
    const life = brief(c, seen.state, seen.view);
    if (!career.employed) return { ok: true, code: 'jobs', data: { employed: false, jobs: career.jobs.slice(0, 12).map((job) => ({ id: job.id, label: job.label, paysPerShift: job.pay, schedule: job.schedule, hours: job.hours })), next: 'Call work with apply set to a job id.', life } };
    if (step.kind === 'go') return { ok: false, code: 'go_first', refused: true, data: { ok: false, code: 'go_first', result: step.text, next: { tool: 'travel', place: step.venue, then: 'work' }, life } };
    if (!career.today.canWork) return { ok: false, code: career.today.code, refused: true, data: { ok: false, code: career.today.code, result: wordsFor(career.today.code, career.today.text, undefined), life } };
    if (!career.shift) return { ok: false, code: 'no_shift', refused: true, data: { ok: false, code: 'no_shift', result: 'There is no shift to start right now.', life } };
    if (seen.view.activities.spot !== career.workplace?.spot && career.workplace) {
      const moved = await act(c, 'spot', { id: career.workplace.spot });
      if (!moved.ok) return answered(c, moved);
    }
    const done = await act(c, 'activity', { id: career.shift.id }, rid);
    return answered(c, done, { shift: career.shift.label, ...endsIn(done.outcome.state) });
  },
};

const claim_mission: ToolDefinition = {
  name: 'claim_mission', readOnly: false,
  description: 'Collect the reward of a finished mission (an `id` from get_goals with done true and claimed false). The reward is paid into your money.',
  inputSchema: obj({ id: { type: 'string', maxLength: 60 }, rid: RID }, ['id']),
  async run(c, args, rid) {
    const id = str(args.id);
    if (!id) throw bad(c, 'invalid_mission', 'Give the mission id from get_goals.');
    return answered(c, await act(c, 'missions.claim', { id }, rid));
  },
};

const buy: ToolDefinition = {
  name: 'buy', readOnly: false,
  description: 'Buy groceries for your kitchen (kind "grocery", an ingredient `id`, optional `packs`) or a wardrobe item from the boutique (kind "boutique", an item `id`). Call it with only `kind` to list what is for sale and the prices. Food you can eat at a place is bought with do_activity there instead.',
  inputSchema: obj({ kind: { type: 'string', enum: ['grocery', 'boutique'] }, id: { type: 'string', maxLength: 80 }, packs: { type: 'integer', minimum: 1, maximum: 3 }, rid: RID }, ['kind']),
  async run(c, args, rid) {
    const kind = args.kind;
    if (kind !== 'grocery' && kind !== 'boutique') throw bad(c, 'invalid_kind', 'kind is "grocery" or "boutique".');
    const id = str(args.id);
    if (!id) {
      const { value } = await look(c, (state, view) => ({
        kind, items: kind === 'grocery' ? Object.entries(view.home.groceries).map(([item, packs]) => ({ id: item, onePack: packs[1]?.price, threePacks: packs[3]?.price })).slice(0, 30)
          : view.onboarding.boutique.filter((item) => !item.owned && !item.blocked).slice(0, 30).map((item) => ({ id: item.id, label: item.label, price: item.price, kind: item.kind })), life: brief(c, state, view),
      }));
      return { ok: true, code: 'ok', data: value };
    }
    if (kind === 'grocery') return answered(c, await act(c, 'home.grocery-buy', { id, packs: Math.floor(num(args.packs) ?? 1) }, rid));
    const { value: item } = await look(c, (_state, view) => view.onboarding.boutique.find((entry) => entry.id === id));
    if (!item) throw bad(c, 'unknown_item', 'The boutique has no such item. Call buy with kind "boutique" to list items.');
    return answered(c, await act(c, 'onboarding.boutique-buy', { kind: item.kind, id }, rid));
  },
};

// ---- people and messages --------------------------------------------------------------------------------------------------------------

type Social = ReturnType<typeof socialService>;
interface PlayerPage { players: Record<string, { name: string; friends: Record<string, number>; agent?: { char?: true; at?: number } } | undefined> }
const playersOf = (db: Db): PlayerPage['players'] => ((db.social as unknown as PlayerPage | undefined)?.players ?? {});
const dmKey = (a: string, b: string): string => `dm.${[a, b].sort().join('.')}`;

/** Run a social call for the agent in one saved transaction, as the social routes do (finish, commit hooks, then deliver). */
async function inSocial<T extends object>(c: ToolContext, social: Social, call: (db: Db, session: SessionRecord) => T): Promise<T> {
  const result = await transactWithCityContent(c.ctx, c.request, [], (db) => {
    const session = c.request.requireSession(db, { renew: true });
    return social.finish(db, call(db, session));
  }, { durable: true, waitForObserved: true, committed: (value) => social.committed(value) });
  return social.deliver(result) as T;
}
const who = (players: PlayerPage['players'], id: string) => { const p = players[id]; return { id, name: p?.name ?? 'Former player', ...agentMark(p?.agent) }; };

const list_friends: ToolDefinition = {
  name: 'list_friends', readOnly: true,
  description: 'Your friends: id, name, whether they are online now, and whether an AI plays them. Only friends and people who have messaged you first can be messaged by an agent.',
  inputSchema: obj({}),
  async run(c) {
    const social = socialService(c.ctx);
    const out = await inSocial(c, social, (db, session) => {
      const players = playersOf(db), mine = players[session.publicId];
      return { ok: true as const, friends: Object.keys(mine?.friends ?? {}).slice(0, 60).map((id) => ({ ...who(players, id), online: c.ctx.online(id) })) };
    });
    return { ok: true, code: 'ok', data: { friends: out.friends, total: out.friends.length } };
  },
};

const list_people_here: ToolDefinition = {
  name: 'list_people_here', readOnly: true,
  description: 'Other players in the same place right now: id, name, and whether an AI plays them. Nothing else about them (no location beyond "here"). Use an id with send_message only if they are your friend or messaged you first.',
  inputSchema: obj({}),
  async run(c) {
    const { value } = await look(c, (state, _view, db, session) => {
      if (state.location === 'home' || state.location === 'neighbourhood') return { here: state.location, players: [] as Json[], note: 'Nobody is listed in a home or on the street.' };
      const room = venueRoomKey(c.agent.cityId, state.location, session.publicId), players = playersOf(db);
      const members = presenceOf(c.ctx).inRoom(room).filter((member) => member.id !== session.publicId && players[member.id] && !c.ctx.checks?.blocked?.(session.publicId, member.id));
      return { here: state.location, players: members.slice(0, 20).map((member) => ({ id: member.id, name: member.name, ...agentMark(players[member.id]?.agent), friend: players[session.publicId]?.friends[member.id] !== undefined })), count: members.length };
    });
    return { ok: true, code: 'ok', data: value };
  },
};

const read_messages: ToolDefinition = {
  name: 'read_messages', readOnly: true,
  description: 'Your messages. Without `with`: your recent direct chats, newest first, with unread counts and the last line. With `with` (a player id): that chat\'s lines after the cursor `since` (a sequence number from an earlier answer; leave it out for the latest few). Money requests appear as lines with a `request`; answer them with answer_money_request. Reading marks the chat read.',
  inputSchema: obj({ with: { type: 'string', maxLength: 40 }, since: { type: 'integer', minimum: 0 } }),
  async run(c, args) {
    const social = socialService(c.ctx), partner = str(args.with)?.toLowerCase();
    if (partner !== undefined && !UUID_PATTERN.test(partner)) throw bad(c, 'invalid_player', 'with must be a player id from list_friends or list_people_here.');
    const out = await inSocial(c, social, (db, session) => {
      const players = playersOf(db);
      if (!partner) {
        const list = social.conversations(db, session, { limit: 12 });
        return { ok: true as const, chats: list.conversations.filter((conv) => conv.kind === 'dm').map((conv) => ({ with: conv.with ? who(players, conv.with) : null, unread: conv.unread, last: conv.last ? { seq: conv.last.seq, from: conv.last.from?.name ?? null, text: conv.last.body, at: conv.last.at } : null })), unread: list.unread };
      }
      const history = social.history(db, session, dmKey(session.publicId, partner), num(args.since) ?? 0, { limit: 15 });
      if (!history.ok) return { ok: false as const, code: history.code, reason: history.reason };
      const lines = history.messages.map((line) => ({ seq: line.seq, from: line.from?.id === session.publicId ? 'me' : line.from?.name ?? 'game', text: line.body, at: line.at, ...(line.request ? { request: { id: line.request.id, amount: line.request.amount, state: line.request.state, payable: line.request.payable } } : {}), ...(line.gift ? { gift: line.gift.amount } : {}) }));
      social.read(db, session, { conv: dmKey(session.publicId, partner) });
      return { ok: true as const, with: who(players, partner), lines, cursor: history.messages.at(-1)?.seq ?? num(args.since) ?? 0 };
    });
    return out.ok ? { ok: true, code: 'ok', data: out } : { ok: false, code: out.code, refused: true, data: { ok: false, code: out.code, result: out.reason } };
  },
};

const send_message: ToolDefinition = {
  name: 'send_message', readOnly: false, message: true,
  description: `Send a short direct message (up to 300 characters, no links, phone numbers or contact details) to a friend, or to someone who has already messaged you. Agents cannot message strangers first, cannot message groups, and may send ${AGENT_LIMITS.messagesPerDay} messages a day. Be kind: people can see an AI plays this character.`,
  inputSchema: obj({ to: { type: 'string', maxLength: 40 }, text: { type: 'string', minLength: 1, maxLength: 300 }, rid: RID }, ['to', 'text']),
  async run(c, args, rid) {
    const to = str(args.to)?.toLowerCase(), text = str(args.text);
    if (!to || !UUID_PATTERN.test(to)) throw bad(c, 'invalid_player', 'to must be a player id from list_friends or read_messages.');
    if (!text || text.length > 300) throw bad(c, 'invalid_message', 'Write between 1 and 300 characters.');
    const verdict = screenText(text, { contact: true, what: 'An agent message' });
    if (verdict) return { ok: false, code: 'message_refused', refused: true, data: { ok: false, code: 'message_refused', result: `${verdict.reason} Agents may not send links or contact details.` } };
    const social = socialService(c.ctx);
    const out = await inSocial(c, social, (db, session) => {
      const players = playersOf(db), me = players[session.publicId], mine = session.publicId;
      const accountPlayer = c.agent.character ? db.accounts?.[c.agent.key.account]?.publicId : undefined;
      const ownerFriends = accountPlayer ? players[accountPlayer]?.friends ?? {} : {};
      const friend = me?.friends[to] !== undefined && players[to]?.friends[mine] !== undefined;
      const ownersFriend = ownerFriends[to] !== undefined;
      const conv = (db.social as unknown as { convs?: Record<string, { messages: { from: string | null }[] } | undefined> } | undefined)?.convs?.[dmKey(mine, to)];
      const wroteFirst = Boolean(conv?.messages.some((line) => line.from === to));
      if (!friend && !ownersFriend && !wroteFirst) return { ok: false as const, code: 'not_allowed_to_message', reason: 'Agents may only message friends, the owner\'s friends, and people who messaged first. Ask a friend to message you, then answer.' };
      const sent = social.send(db, session, { to, body: text, clientId: `agent-${(rid ?? c.ctx.randomId()).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60).padEnd(8, '0')}` });
      return sent;
    });
    if (out.ok === true) return { ok: true, code: 'sent', sent: true, data: { ok: true, code: 'sent', result: 'Message sent.' } };
    const code = String(out.code ?? 'refused'), reason = 'reason' in out ? String(out.reason) : 'That message could not be sent.';
    return { ok: false, code, refused: true, data: { ok: false, code, result: reason } };
  },
};

const answer_money_request: ToolDefinition = {
  name: 'answer_money_request', readOnly: false,
  description: `Answer a friend's request for money (the \`request.id\` from read_messages): "pay" gives them the amount from your money under the game's usual gift rules, or "decline". Agents may pay requests of up to ${naira(AGENT_LIMITS.payRequestMax)}; ask your owner about anything larger.`,
  inputSchema: obj({ id: { type: 'string', pattern: '^MR-[0-9]{1,12}$' }, op: { type: 'string', enum: ['pay', 'decline'] }, rid: RID }, ['id', 'op']),
  async run(c, args, rid) {
    const id = str(args.id), op = args.op;
    if (!id || !/^MR-[0-9]{1,12}$/.test(id) || (op !== 'pay' && op !== 'decline')) throw bad(c, 'invalid_request', 'Give the request id from read_messages and op "pay" or "decline".');
    const social = socialService(c.ctx);
    const clientId = `${c.ctx.now()}:${c.ctx.randomId()}`;
    const out = await inSocial(c, social, (db, session) => {
      const requests = (db.social as unknown as { moneyRequests?: Record<string, { n: number; to: string } | undefined> } | undefined)?.moneyRequests;
      const found = requests?.[id];
      if (op === 'pay' && found && found.to === session.publicId && found.n > AGENT_LIMITS.payRequestMax) return { ok: false as const, code: 'too_large_for_agent', reason: `That is more than an agent may pay (${naira(AGENT_LIMITS.payRequestMax)}). Ask your owner to pay it themselves.` };
      return social.answerMoneyRequest(db, session, { id, op, cityId: c.agent.cityId, clientId });
    });
    const code = String(out.code ?? ''), reason = 'reason' in out ? String(out.reason) : '';
    return out.ok === true ? { ok: true, code, data: { ok: true, code, result: code === 'paid' ? 'Paid.' : 'Declined.' } } : { ok: false, code, refused: true, data: { ok: false, code, result: reason || 'That request could not be answered.' } };
  },
};

export const TOOLS: readonly ToolDefinition[] = Object.freeze([
  get_my_life, get_goals, claim_mission, list_places, list_actions_here, travel, do_activity, wait_until_done, eat_or_rest, work, buy, list_people_here, list_friends, read_messages, send_message, answer_money_request,
]);
export const TOOL_NAMES: readonly string[] = TOOLS.map((tool) => tool.name);
