/**
 * OWNER: agents (calls with house agents, docs/CALLS.md "Calls with AI characters")
 * CALLS WITH HOUSE AGENTS AND RESIDENTS (`resident.<city>.<key>`, server/residents/, since 18 October 2026): the routes the phone's call screen uses, under /api/agents/call/.
 * A resident answers through its own direct answer (resident.ts answerDirect); asleep, the call does not start and the game says so. Registered with the agent routes (server/routes/agents.ts), so every write needs an
 * Origin that names this host and the anti-forgery token of the session cookie, and every route is about the signed-in session's own call.
 *
 *   GET  /api/agents/call/config      { ok, enabled, stt: { default, gateway, model }, minutes: { player, left, total }, maxRecordSeconds, breakMinutes, cast: [the AI characters standing in a place now] }
 *   POST /api/agents/call/start       { agent, csrf }          → { ok, call, leftSeconds, voiceSeed, name, ai: true, stt } or { ok, over, text, voiceSeed } when the day's minutes are used up
 *   POST /api/agents/call/transcribe  { call, audio, mediaType, csrf } → { ok, text }    the gateway's transcription (server/models/transcribe.ts); the audio is passed on, never stored
 *   POST /api/agents/call/turn        { call, text, csrf }     → { ok, text, voiceSeed, leftSeconds, over?, breakText?, help? }   what the agent says, as TEXT: the phone speaks it
 *   POST /api/agents/call/end         { call, csrf }
 *
 * NO AUDIO OF THE AGENT CROSSES THE NETWORK: the agent's side is text; the caller's phone speaks it with the voice for the agent's `voiceSeed` (the same seed its lines have in a place).
 * THE PERSON'S SIDE is either text the phone made itself (the browser's recognition) or a short recording sent to /transcribe, which passes it to the gateway under the model
 * router's budget and no-training rule and keeps nothing.
 * BEFORE THE AGENT SEES A LINE the game reads it: words of self-harm or danger are answered with help lines (the agent is not told), and a sincere "are you an AI?" is answered by the game.
 * LIMITS (call-limits.ts): daily minutes per person and in total, a break reminder after a long session; over the limit the agent says it will call back and the call ends.
 */
import { sha256Hex } from '../../src/game/util.ts';
import { aiAnswer, asksIfAi, countryOfCity, crisisWords, helpText } from '../moderation/ai-intercept.ts';
import { registerAdminSetting } from '../admin/settings.ts';
import { registerAdminStat } from '../admin/tools.ts';
import { routerOf } from '../models/service.ts';
import { DEFAULT_STT_MODEL, MAX_SECONDS, NO_TRAINING, sttModel, transcribe } from '../models/transcribe.ts';
import { voiceSeedOf } from '../voice-seed.ts';
import type { RouteContext, RouteHandler, RouteKey, RouteRequest } from '../types.ts';
import { castOf } from './cast.ts';
import { createCallLedger, type CallLedger, type Limits, type Stored } from './call-limits.ts';
import * as say from './lines.ts';
import { agentInfo, houseService } from './runner.ts';
import { residentService } from '../residents/resident.ts';

const NO_STORE = { 'Cache-Control': 'no-store' };
export const DEFAULTS = Object.freeze({ on: true, playerMinutes: 20, totalMinutes: 300, breakMinutes: 10, stt: 'browser', gatewayStt: true });
/** What the game says, in its own voice, when a session with AI characters has gone on a while. */
export const BREAK_TEXT = 'You have been talking with AI characters for a while. This is a good time for a break: stretch, drink some water, or talk to someone you know.';
const MAX_TEXT = 300;
/** Lines of a call kept for the agent's next answer, and the most calls kept at once. */
const CALL_LINES = 6, CALLS_HEARD = 500;

const clamp = (value: unknown, least: number, most: number, fallback: number): number => (typeof value === 'number' && Number.isFinite(value) ? Math.max(least, Math.min(most, Math.round(value))) : fallback);
const settingOf = (ctx: RouteContext, key: string): boolean | number | string | undefined => ctx.checks?.setting?.(key) ?? ctx.checks?.text?.(key);
export const callSettings = (ctx: RouteContext) => ({
  on: settingOf(ctx, 'agentCallsOn') !== false,
  playerMinutes: clamp(settingOf(ctx, 'agentCallPlayerMinutes'), 0, 240, DEFAULTS.playerMinutes),
  totalMinutes: clamp(settingOf(ctx, 'agentCallTotalMinutes'), 0, 100000, DEFAULTS.totalMinutes),
  breakMinutes: clamp(settingOf(ctx, 'agentCallBreakMinutes'), 0, 240, DEFAULTS.breakMinutes),
  stt: settingOf(ctx, 'agentCallStt') === 'gateway' ? 'gateway' as const : 'browser' as const,
  gatewayStt: settingOf(ctx, 'agentCallGatewayStt') !== false,
  model: sttModel(settingOf(ctx, 'agentCallSttModel')),
});

const ledgers = new WeakMap<RouteContext, CallLedger>();
/** The one ledger of a host. */
export function callLedgerOf(ctx: RouteContext): CallLedger {
  let found = ledgers.get(ctx);
  if (!found) {
    const limits = (): Limits => { const s = callSettings(ctx); return { playerSeconds: s.playerMinutes * 60, totalSeconds: s.totalMinutes * 60, breakSeconds: s.breakMinutes * 60 }; };
    found = createCallLedger({
      now: () => ctx.now(), limits, newId: () => ctx.core?.newId?.() ?? globalThis.crypto.randomUUID(),
      load: () => ctx.store.read((db) => { const col = (db as Record<string, unknown>)['agentCalls']; return col && typeof col === 'object' ? structuredClone(col) as Stored : undefined; }),
      save: (stored) => ctx.store.transact((db) => { Object.assign(ctx.collection(db, 'agentCalls', { days: {} }), structuredClone(stored)); }, { durable: false }),
    });
    ledgers.set(ctx, found);
  }
  return found;
}

/** The router's one-way id of a person (the same as the house agents' own, so a person's model caps are one count). */
const modelKey = (publicId: string): string => `p_${sha256Hex(`allworld-house-v1|${publicId}`).slice(0, 32)}`;

export function callRoutes(ctx: RouteContext, guard: (request: RouteRequest, body: Record<string, unknown>) => Promise<void>): Record<RouteKey, RouteHandler> {
  const ledger = callLedgerOf(ctx), router = routerOf(ctx);
  const who = (request: RouteRequest): Promise<{ id: string; name: string }> => ctx.store.read((db) => { const session = request.requireSession(db); return { id: session.publicId, name: session.name }; });
  const rate = (id: string, kind: string, n: number): void => { if (!ctx.allow(`agentcall:${kind}:${id}`, n, 60000)) throw ctx.fail(429, 'rate_limited'); };
  const enabled = (): void => { if (!callSettings(ctx).on) throw Object.assign(ctx.fail(503, 'calls_off'), { reason: 'Calls with AI characters are off for now. You can still write to them.' }); };
  /** Who can be called: a house agent of the cast, or a resident of an open city. Lines use the voice only. */
  const specOf = (agent: string): { name: string; voice: 'pidgin' | 'plain'; city: string; resident: boolean } | null => {
    const info = agentInfo(agent);
    if (info) { const spec = castOf(info.city).find((entry) => `house.${info.city}.${entry.key}` === agent); return spec ? { name: spec.name, voice: spec.voice, city: info.city, resident: false } : null; }
    if (!agent.startsWith('resident.')) return null;
    const where = residentService(ctx).whereIs(agent);
    return where ? { name: where.name, voice: 'plain', city: where.city, resident: true } : null;
  };
  const agentOf = (value: unknown): string => { if (typeof value !== 'string' || value.length > 120 || !specOf(value)) throw ctx.fail(400, 'invalid_agent'); return value; };
  const callOf = (value: unknown): string => { if (typeof value !== 'string' || value.length < 8 || value.length > 80) throw ctx.fail(400, 'invalid_call'); return value; };
  const gone = (): Error => Object.assign(ctx.fail(410, 'call_ended'), { reason: 'The call has ended.' });
  const secondsLeft = (id: string): number => Math.max(0, callSettings(ctx).playerMinutes * 60 - ledger.secondsUsed(id));
  // The last lines of each call (`me` true = said by the agent, as both services read it), so the agent answers the conversation and not one line at a time. Memory only, dropped when the call ends.
  const heard = new Map<string, { me: boolean; text: string }[]>();
  const remember = (call: string, said: string, reply: string): void => {
    const lines = [...(heard.get(call) ?? []), { me: false, text: said.slice(0, 200) }, { me: true, text: reply.slice(0, 200) }].slice(-CALL_LINES);
    heard.delete(call); heard.set(call, lines);
    if (heard.size > CALLS_HEARD) heard.delete(heard.keys().next().value!);
  };

  return {
    'GET /api/agents/call/config': async (request) => {
      const me = await who(request);
      await ledger.ready();
      const s = callSettings(ctx);
      const keyed = router.hasKey('gateway');
      return { body: { ok: true, enabled: s.on, stt: { default: s.stt, gateway: s.gatewayStt && keyed, model: s.model }, minutes: { player: s.playerMinutes, left: Math.floor(secondsLeft(me.id) / 60), total: s.totalMinutes }, maxRecordSeconds: Math.min(15, MAX_SECONDS), breakMinutes: s.breakMinutes, cast: houseService(ctx).agents().filter((who) => who.room !== null).slice(0, 12).map((who) => ({ id: who.id, name: who.name, role: who.role, city: who.city })) }, headers: NO_STORE };
    },
    'POST /api/agents/call/start': async (request) => {
      const body = await request.json();
      await guard(request, body);
      enabled();
      const agent = agentOf(body.agent), spec = specOf(agent), me = await who(request);
      rate(me.id, 'start', 10);
      if (!spec) throw ctx.fail(400, 'invalid_agent');
      const base = { ok: true, name: spec.name, ai: true, voiceSeed: voiceSeedOf(agent), voice: spec.voice };
      // A resident who is asleep does not pick up: no minutes are used.
      if (spec.resident && residentService(ctx).whereIs(agent)?.awake === false) return { body: { ...base, text: `${spec.name.split(' ')[0]} is asleep now. Try again in the morning, their time.` }, headers: NO_STORE };
      const started = await ledger.start(me.id, agent), s = callSettings(ctx);
      if (!started.ok) return { body: { ...base, over: started.over, text: say.callBusy(spec, `${agent}|${me.id}|${Math.floor(ctx.now() / 3600000)}`) }, headers: NO_STORE };
      return { body: { ...base, call: started.call, leftSeconds: started.leftSeconds, stt: { default: s.stt, gateway: s.gatewayStt && router.hasKey('gateway') }, breakMinutes: s.breakMinutes }, headers: NO_STORE };
    },
    'POST /api/agents/call/transcribe': async (request) => {
      // A recording is base64 in JSON (the gateway takes no multipart): 20 seconds of 16 kHz mono WAV is under 700 KB, so the body is bounded at 1 MB.
      const body = await request.json(1_000_000);
      await guard(request, body);
      enabled();
      const me = await who(request), call = callOf(body.call);
      rate(me.id, 'stt', 30);
      if (!ledger.find(me.id, call)) throw gone();
      const s = callSettings(ctx);
      if (!s.gatewayStt) throw Object.assign(ctx.fail(503, 'transcription_off'), { reason: 'Voice to text is off for now. Type, or use your browser’s own.' });
      // The call's time is charged whatever happens to the recording.
      const touched = ledger.touch(call);
      if (!touched) throw gone();
      if (touched.over) return { body: { ok: true, over: touched.over }, headers: NO_STORE };
      const done = await transcribe(router, (url, init) => ctx.fetch(url, init), { audioBase64: body.audio as string, mediaType: body.mediaType as string, playerId: modelKey(me.id), model: s.model });
      if (!done.ok) {
        if (done.why === 'too_big' || done.why === 'too_long') throw Object.assign(ctx.fail(413, 'audio_too_big'), { reason: 'That recording is too long. Hold the button for a shorter time.' });
        if (done.why === 'bad_audio') throw Object.assign(ctx.fail(400, 'invalid_audio'), { reason: 'That recording could not be read.' });
        if (done.why === 'empty') return { body: { ok: true, text: '' }, headers: NO_STORE };
        if (done.why === 'off') throw Object.assign(ctx.fail(503, 'transcription_off'), { reason: 'Voice to text is not available. Type, or use your browser’s own.' });
        if (done.why === 'budget' || done.why === 'player-cap') throw Object.assign(ctx.fail(503, 'transcription_resting'), { reason: 'Voice to text is resting for today. Type, or use your browser’s own.' });
        throw Object.assign(ctx.fail(502, 'transcription_failed'), { reason: 'That did not come through. Try again, or type.' });
      }
      return { body: { ok: true, text: done.text }, headers: NO_STORE };
    },
    'POST /api/agents/call/turn': async (request) => {
      const body = await request.json();
      await guard(request, body);
      enabled();
      const me = await who(request), call = callOf(body.call);
      rate(me.id, 'turn', 30);
      const text = typeof body.text === 'string' ? body.text.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT) : '';
      if (!text) throw ctx.fail(400, 'invalid_text');
      const found = ledger.find(me.id, call);
      if (!found) throw gone();
      const spec = specOf(found.agent);
      if (!spec) throw gone();
      const touched = ledger.touch(call);
      if (!touched) throw gone();
      const seed = `${found.agent}|${me.id}|${ctx.now()}`, voiceSeed = voiceSeedOf(found.agent);
      const out = (reply: string, extra: Record<string, unknown> = {}) => ({ body: { ok: true, said: text, text: reply, voiceSeed, leftSeconds: touched.leftSeconds, ...(touched.breakDue ? { breakText: BREAK_TEXT } : {}), ...extra }, headers: NO_STORE });
      // The limit: the agent says it will call back, and the call is over.
      if (touched.over) return out(say.callBack(spec, seed), { over: touched.over });
      // Before any agent or model sees the line: the game answers words of danger, and a sincere "are you an AI?".
      if (crisisWords(text)) return out(helpText(countryOfCity(spec.city)), { help: true });
      if (asksIfAi(text)) return out(aiAnswer([spec.name]));
      const history = heard.get(call) ?? [];
      const answered = spec.resident ? await residentService(ctx).answerDirect(found.agent, me, text, history) : await houseService(ctx).answerCall(found.agent, me, text, history);
      const reply = answered?.text ?? say.fallback(spec, seed);
      remember(call, text, reply);
      return out(reply);
    },
    'POST /api/agents/call/end': async (request) => {
      const body = await request.json();
      await guard(request, body);
      const me = await who(request), call = callOf(body.call);
      if (ledger.find(me.id, call)) ledger.end(call);
      heard.delete(call);
      return { body: { ok: true, leftSeconds: secondsLeft(me.id) }, headers: NO_STORE };
    },
  };
}

/** Settings and operator numbers. Called from linkHouse (runner.ts). */
export function linkAgentCalls(ctx: RouteContext): void {
  registerAdminSetting(ctx, { key: 'agentCallsOn', label: 'Calls with AI characters: on', help: 'Off: the Call button on an AI character answers that calls are off. Writing to them is unaffected.', kind: 'boolean', default: () => DEFAULTS.on });
  registerAdminSetting(ctx, { key: 'agentCallPlayerMinutes', label: 'Calls with AI characters: minutes per person per day', help: 'UTC day. Over it the character says it will call back and carries on by text. 0 turns calls off.', kind: 'number', min: 0, max: 240, default: () => DEFAULTS.playerMinutes });
  registerAdminSetting(ctx, { key: 'agentCallTotalMinutes', label: 'Calls with AI characters: minutes in total per day', help: 'UTC day, everyone together.', kind: 'number', min: 0, max: 100000, default: () => DEFAULTS.totalMinutes });
  registerAdminSetting(ctx, { key: 'agentCallBreakMinutes', label: 'Calls with AI characters: break reminder after (minutes)', help: 'A session of calls with gaps under 15 minutes shows a break reminder every this many minutes. 0 is off.', kind: 'number', min: 0, max: 240, default: () => DEFAULTS.breakMinutes });
  registerAdminSetting(ctx, { key: 'agentCallStt', label: 'Calls with AI characters: speech to text by default', help: 'browser (the phone’s own recognition, free; the browser may send audio to its maker) or gateway (our transcription, paid, nothing kept). A person can switch. Set it to the winner of the measurements in docs/CALLS.md.', kind: 'text', max: 20, default: () => DEFAULTS.stt });
  registerAdminSetting(ctx, { key: 'agentCallGatewayStt', label: 'Calls with AI characters: gateway transcription on', help: 'Off: the transcription route answers that it is off and phones use their browser’s own.', kind: 'boolean', default: () => DEFAULTS.gatewayStt });
  registerAdminSetting(ctx, { key: 'agentCallSttModel', label: 'Calls with AI characters: transcription model', help: `One of: ${Object.keys(NO_TRAINING).join(', ')} (models the gateway lists as not training on audio). Anything else uses ${DEFAULT_STT_MODEL}.`, kind: 'text', max: 60, default: () => DEFAULT_STT_MODEL });
  const ledger = callLedgerOf(ctx);
  const stat = (id: string, label: string, read: () => number | string): void => registerAdminStat(ctx, { id: `agentcalls-${id}`, group: 'Calls with AI characters (UTC day)', label, cost: 'memory', read });
  stat('minutes', 'Minutes used / allowed', () => { void ledger.ready(); return `${Math.round(ledger.usage().total / 60)} of ${callSettings(ctx).totalMinutes}`; });
  stat('people', 'People who called', () => ledger.usage().players);
  stat('open', 'Calls open now', () => ledger.usage().open);
}
