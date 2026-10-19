/**
 * OWNER: world events (docs/WORLD-EVENTS.md "Stage mode")
 * STAGES: one open stage per room, kept in `worldEvents.stages[roomKey]` and in memory for the voice checks. The rules are
 * src/world-events/stage.ts; this asks what they need (adult, in the room, admin), screens the words and applies the step.
 *
 * VOICE. The room module (server/ws/rooms.ts) asks two checks set here, on every voice change and every signal:
 *   ctx.checks.stageMayTalk(room, id)   false for a listener of an open stage: their unmute is refused ('stage_listener').
 *   ctx.checks.stagePair(room, a, b)    true when one of the pair is on the stage: signalling ignores the 12-step radius, so the
 *                                       speakers reach everyone in their group of the room.
 * The page plays only the people on the stage (src/community.ts stageVoice). Voice is still the room's circle: MAX_VOICE_MEMBERS (8) in
 * a group. A bigger audience follows the stage, the queue and the chat; an audio relay for crowds is later work.
 *
 * WHO OPENS ONE. The game (election night's debate and the winner's speech, server/world-events/night.ts), an admin anywhere, and an adult
 * member of a group chat in that group's room (Phase 8's stage rooms). Who speaks is always an adult (ctx.checks.adult) or an AI character
 * the game labels.
 */
import { STAGE, applyStage, autoStep, mayTalk, newStage, stageRefusal, stageView, STAGE_OPS } from '../../src/world-events/stage.ts';
import type { Stage, StageKind, StageOp, StagePerson, StageView } from '../../src/world-events/stage.ts';
import { placeOfRoom } from '../../src/places/model.ts';
import { screenText } from '../moderation/text.ts';
import { screenFee } from '../../src/game/trust/fees.ts';
import { isAiCharacter } from '../gist/ledger.ts';
import { peekWorldEvents, worldEventsOf } from './data.ts';
import type { WorldLiveFrame } from '../../src/types/world-events.ts';
import type { ServerFrame } from '../../src/types/protocol.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';

const ROOM = /^[a-z0-9-]{1,40}:[a-z0-9.:-]{1,80}$/;
/** A room key a stage may be in: a public venue, the Square or a group room (never a home or a street). */
export const stageRoom = (value: unknown): string | null => (typeof value === 'string' && ROOM.test(value) && !value.includes(':home:') && !value.includes('neighbourhood') ? value : null);
type Refused = { ok: false; code: string; reason: string };
const no = (code: string, reason: string): Refused => ({ ok: false, code, reason });
/** Ended stages stay readable this long ("the stage has ended"), then go. */
const KEEP_ENDED_MS = 10 * 60000, TICK_MS = 10000;

const services = new WeakMap<RouteContext, ReturnType<typeof build>>();
export function stagesService(ctx: RouteContext) {
  let found = services.get(ctx);
  if (!found) services.set(ctx, found = build(ctx));
  return found;
}

function build(ctx: RouteContext) {
  const mem = new Map<string, Stage>();
  const live = (room: string): Stage | null => { const stage = mem.get(room); return stage && stage.endsAt > ctx.now() ? stage : null; };
  const remember = (room: string, stage: Stage | null | undefined): void => { if (stage && stage.endsAt > ctx.now()) mem.set(room, JSON.parse(JSON.stringify(stage)) as Stage); else mem.delete(room); };
  if (ctx.checks) {
    ctx.checks.stageMayTalk = (room, id) => { const stage = live(room); return stage ? mayTalk(stage, id) : true; };
    ctx.checks.stagePair = (room, a, b) => { const stage = live(room); return Boolean(stage && (mayTalk(stage, a) || mayTalk(stage, b))); };
  }
  const inRoom = (id: string, room: string): boolean => ctx.checks?.inRoom?.(id, room) === true;
  /** An adult, or a character an AI plays (the game labels it; the age rule is about people). */
  const mayStand = (db: Db, id: string): boolean => ctx.checks?.adult?.(db, id) === true || isAiCharacter(db, id);

  function push(room: string, stage: Stage | null): void {
    const frame: WorldLiveFrame = { type: 'world-live', kind: 'stage', room, rev: stage?.rev ?? 0 };
    for (const id of ctx.checks?.roomMembers?.(room) ?? []) ctx.push(id, frame as unknown as ServerFrame);
  }
  /** After a committed change: memory and the people in the room. */
  function committed(room: string, stage: Stage | null | undefined): void { remember(room, stage); push(room, stage ?? null); }

  /** May this person open a stage in this room? An admin anywhere; an adult member in their group's room. */
  function canOpen(db: Db, room: string, id: string, admin: boolean): boolean {
    if (admin) return true;
    const place = placeOfRoom(room);
    return place?.kind === 'room' && ctx.checks?.placeUntil?.(db, id, place.id) === Infinity && ctx.checks?.adult?.(db, id) === true;
  }
  function view(db: Db, room: string, viewer: string | null): StageView | null {
    const stage = peekWorldEvents(db).stages[room];
    return stage && typeof stage === 'object' && stage.endsAt + KEEP_ENDED_MS > ctx.now() ? stageView(stage, viewer) : null;
  }
  /** Open a stage (inside a transaction). An open one in the room is replaced. */
  function open(db: Db, room: string, fields: { kind: StageKind; title: string; minutes: number; moderator: string | null; invited?: StagePerson[]; seat?: string }): Stage {
    const col = worldEventsOf(ctx, db), now = ctx.now();
    const stage = newStage({ id: ctx.randomId(), room, now, ...fields });
    col.stages[room] = stage;
    for (const [key, item] of Object.entries(col.stages)) if (!item || item.endsAt + KEEP_ENDED_MS <= now) delete col.stages[key];
    return stage;
  }
  /** End the stage of a room (inside a transaction). */
  function close(db: Db, room: string): Stage | null {
    const stage = worldEventsOf(ctx, db).stages[room];
    if (!stage || stage.endsAt <= ctx.now()) return null;
    stage.endsAt = ctx.now(); stage.rev += 1;
    return stage;
  }
  /** One step by a person (inside a transaction). */
  function act(db: Db, session: SessionRecord, room: string, op: StageOp, body: Record<string, unknown>, admin: boolean): { ok: true; stage: Stage } | Refused {
    if (!(STAGE_OPS as readonly string[]).includes(op)) return no('invalid_op', 'That is not something a stage does.');
    const stage = worldEventsOf(ctx, db).stages[room], now = ctx.now();
    if (!stage || stage.endsAt <= now) return no('no_stage', 'There is no stage open here.');
    const id = session.publicId;
    const actor = { id, name: session.name, adult: mayStand(db, id), present: inRoom(id, room), admin };
    const target = typeof body.target === 'string' ? body.target : undefined, question = typeof body.question === 'string' ? body.question : undefined;
    let text = typeof body.text === 'string' ? body.text.replace(/\s+/g, ' ').trim() : undefined;
    if (op === 'ask') {
      const muted = ctx.checks?.muted?.(id);
      if (muted) return no('muted', muted.reason);
      const verdict = screenFee(text ?? '', { what: 'Your question' }) ?? screenText(text ?? '', { contact: true, what: 'Your question' });
      if (verdict) return no(verdict.code, verdict.reason);
      text = text?.slice(0, STAGE.textMax);
    }
    const args = { ...(target ? { target, targetAdult: mayStand(db, target) } : {}), ...(question ? { question } : {}), ...(text !== undefined ? { text } : {}) };
    const refusal = stageRefusal(stage, actor, op, args, now);
    if (refusal) return { ok: false, ...refusal };
    applyStage(stage, actor, op, args, now, ctx.randomId().slice(0, 12));
    return { ok: true, stage };
  }

  // A stage the game runs moves on by itself; ended ones are dropped from memory.
  let lastTick = 0, ticking = false;
  async function tick(now: number): Promise<void> {
    if (ticking || now - lastTick < TICK_MS) return;
    ticking = true; lastTick = now;
    try {
      for (const [room, stage] of [...mem]) if (stage.endsAt <= now) { mem.delete(room); push(room, null); }
      const due = [...mem.values()].filter((stage) => autoStep(JSON.parse(JSON.stringify(stage)) as Stage, now)).map((stage) => stage.room);
      if (!due.length) return;
      const changed = await ctx.store.transact((db) => {
        const col = worldEventsOf(ctx, db), out: [string, Stage][] = [];
        for (const room of due) { const stage = col.stages[room]; if (stage && autoStep(stage, now)) out.push([room, JSON.parse(JSON.stringify(stage)) as Stage]); }
        return out;
      }, { durable: false });
      for (const [room, stage] of changed) committed(room, stage);
    } catch { /* the next beat tries again */ } finally { ticking = false; }
  }
  ctx.on?.('heartbeat', ({ now }) => { void tick(now); });

  return {
    load: (): Promise<void> => ctx.store.read((db) => JSON.parse(JSON.stringify(peekWorldEvents(db).stages)) as Record<string, Stage>).then((all) => { for (const [room, stage] of Object.entries(all)) remember(room, stage); }),
    live, canOpen, view, open, close, act, committed, tick,
  };
}
