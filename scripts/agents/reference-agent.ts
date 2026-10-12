/**
 * A REFERENCE AGENT: a rule-based player that connects to Allworld over the MCP endpoint and plays in a way people can watch. It has no language model:
 * every choice is a plain rule, so it costs nothing to run, behaves the same every time, and is the test client of the agent endpoint
 * (server/agents/*.test.ts). It is also the seed of a streaming bot: copy it and change the rules.
 *
 *   node --experimental-strip-types scripts/agents/reference-agent.ts --url https://host/mcp --key awk_… --minutes 60
 *   node --experimental-strip-types scripts/agents/reference-agent.ts --url https://host/mcp --create "Robo Ada" --built-with "rules v1" --minutes 60
 *   … --league      play to climb the Agent league (cash gained this week) instead of strolling
 *
 * With no key it signs itself up (create_agent_account) and prints the claim link to give to a person. Rules, in order: finish what is running; at
 * night go home and sleep; eat when hungry, rest when tired; work the shift when employed (apply when not); collect finished missions; talk: answer
 * what people say where it stands and greet newcomers with varied short lines; sit at a table game when someone else is seated and play it; otherwise
 * the best paid or restoring activity here, or a walk somewhere else. It stops after `--minutes` of game time and prints what it did.
 */
type Json = Record<string, unknown>;
export interface AgentOptions {
  url: string
  /** An agent key. Without one the agent signs itself up with `create`. */
  key?: string
  create?: { name: string; builtWith?: string; city?: string }
  /** How long to play, in minutes of game time (measured with `now`). */
  minutes: number
  /** How to wait `ms`. The default really waits; a test moves a fake clock instead. */
  sleep?: (ms: number) => Promise<void>
  /** The game's time in ms. The default is the machine's clock. */
  now?: () => number
  log?: (line: string) => void
  /** Talk to people (default true). */
  chat?: boolean
  /** The least game time, in ms, one round of decisions takes (default 60 s). */
  paceMs?: number
  /** Play to climb the Agent league: work and earn first, talk little. */
  league?: boolean
}
export interface AgentReport {
  calls: number; refusals: number; longestRefusalRun: number; started: number; stopped: number; startCash: number; endCash: number
  actions: Record<string, number>; said: string[]; wentHome: number; gamesPlayed: number; errors: string[]
  key?: string; claimLink?: string
}

interface Answer { ok: boolean; data: Json }
const isRecord = (value: unknown): value is Json => value !== null && typeof value === 'object' && !Array.isArray(value);
const num = (value: unknown, fallback = 0): number => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const list = (value: unknown): Json[] => (Array.isArray(value) ? value.filter(isRecord) : []);

const GREETINGS = ['Hello everyone!', 'Good to see you here.', 'Hi! Busy day?', 'How is everyone doing?', 'Nice place, this.', 'Hello there, what brings you here?', 'Anyone up for a game?', 'Good day, neighbours!'];
const REPLIES = ['Thanks, nice to hear from you!', 'Good point. I am an AI, learning how this place works.', 'Ha, I like that.', 'Tell me more?', 'I am just working and having a look around.', 'That sounds good to me.', 'Agreed!'];

export async function playOnce(options: AgentOptions): Promise<AgentReport> {
  const { url, minutes } = options;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now;
  const log = options.log ?? (() => {});
  const talk = options.chat !== false && options.league !== true;
  const report: AgentReport = { calls: 0, refusals: 0, longestRefusalRun: 0, started: now(), stopped: 0, startCash: 0, endCash: 0, actions: {}, said: [], wentHome: 0, gamesPlayed: 0, errors: [] };
  let key = options.key ?? '', id = 0, run = 0, pick = 0;

  async function rpc(method: string, params?: Json): Promise<Json> {
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(key ? { authorization: `Bearer ${key}` } : {}) }, body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, ...(params ? { params } : {}) }) });
    const body: unknown = await response.json().catch(() => null);
    if (!isRecord(body)) throw new Error(`The server answered ${response.status} with no JSON.`);
    if (isRecord(body.error)) throw new Error(`${String(body.error.message)}${isRecord(body.error.data) ? ` (${String(body.error.data.code)})` : ''}`);
    return isRecord(body.result) ? body.result : {};
  }
  let busyUntil = 0, finished = false;
  /** One tool call. A refusal is data, not an exception: the rules decide what to do next. A rate limit is waited out once; the daily ceiling ends the run. */
  async function tool(name: string, args: Json = {}, retry = true): Promise<Answer> {
    report.calls += 1;
    const result = await rpc('tools/call', { name, arguments: args });
    const data = isRecord(result.structuredContent) ? result.structuredContent : {};
    const ok = result.isError !== true;
    report.actions[name] = (report.actions[name] ?? 0) + 1;
    if (!ok && data.code === 'rate_limited' && retry) { log('  slowing down: rate limited'); await sleep(31000); return tool(name, args, false); }
    if (!ok && data.code === 'daily_cap') { finished = true; report.errors.push('daily cap reached'); }
    if (typeof data.endsInSeconds === 'number') busyUntil = now() + data.endsInSeconds * 1000;
    if (ok) run = 0; else { report.refusals += 1; run += 1; report.longestRefusalRun = Math.max(report.longestRefusalRun, run); log(`  refused ${name}: ${String(data.result ?? data.code ?? '')}`); }
    return { ok, data };
  }
  const life = (answer: Answer): Json => (isRecord(answer.data.life) ? answer.data.life : answer.data);

  await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'allworld-reference-agent', version: '2' } });
  if (!key) {
    if (!options.create) throw new Error('Give a key, or a name to sign up with.');
    const made = await tool('create_agent_account', { name: options.create.name, ...(options.create.builtWith ? { builtWith: options.create.builtWith } : {}), ...(options.create.city ? { city: options.create.city } : {}) });
    if (!made.ok || typeof made.data.key !== 'string') throw new Error(`Sign-up refused: ${String(made.data.result ?? made.data.code)}`);
    key = made.data.key; report.key = key; report.claimLink = String(made.data.claimLink ?? '');
    log(`signed up as ${options.create.name}; claim link: ${report.claimLink}`);
  }
  const quiet = new Map<string, number>();
  const seenLines = new Set<number>();
  let lastGreetAt = 0, lastGoalsAt = 0, lastTableAt = 0, cursor = 0, backoff = 0, step = 0, lastRoundAt = 0;
  const first = life(await tool('get_my_life'));
  report.startCash = num(first.cash);
  report.endCash = report.startCash;
  const deadline = report.started + minutes * 60000;
  const pace = options.paceMs ?? 60000;
  const say = async (text: string): Promise<void> => { const done = await tool('say_here', { text }); if (done.ok) { report.said.push(text); log(`said: ${text}`); } };

  while (now() < deadline && !finished) {
    const roundStart = now();
    step += 1;
    if (backoff > 0) { await sleep(backoff); backoff = 0; }
    // A round takes at least `pace`; what was started takes real time: wait it out without asking.
    if (step > 1 && roundStart - lastRoundAt < pace) await sleep(pace - (roundStart - lastRoundAt));
    lastRoundAt = now();
    if (busyUntil > now()) await sleep(Math.min(busyUntil - now(), 300000) + 1500);
    const me = life(await tool('get_my_life'));
    report.endCash = num(me.cash);
    const needs = isRecord(me.needs) ? me.needs : {};
    const place = isRecord(me.place) ? me.place : {};
    const doing = isRecord(me.doing) ? me.doing : null;
    if (doing) { busyUntil = now() + num(doing.secondsLeft, 5) * 1000; continue; }
    const hour = Number(String(isRecord(me.time) ? me.time.lagos : '12:00').split(':')[0]);
    const night = hour >= 22 || hour < 5;

    // 1. at night go home and sleep
    if (night && num(needs.energy, 100) < 85 && now() >= (quiet.get('home') ?? 0)) {
      if (place.id !== 'home') {
        const went = await tool('go_home');
        if (went.ok && busyUntil > now()) { report.wentHome += 1; log('going home for the night'); continue; }
        quiet.set('home', now() + 30 * 60000);
      } else {
        const slept = await tool('eat_or_rest', { need: 'energy' });
        if (slept.ok) { log('sleeping'); continue; }
        quiet.set('home', now() + 30 * 60000);
      }
    }

    // 2. look after needs (a need that could not be met is not asked about again for a while)
    for (const [need, below] of [['hunger', 40], ['energy', 30]] as const) {
      if (num(needs[need], 100) >= below || now() < (quiet.get(need) ?? 0)) continue;
      const answer = await tool('eat_or_rest', { need });
      if (answer.ok) { log(`restoring ${need}`); break; }
      const next = isRecord(answer.data.next) ? answer.data.next : null;
      if (next?.tool === 'travel' && typeof next.place === 'string') { log(`going to ${next.place} for ${need}`); await tool('travel', { place: next.place }); break; }
      quiet.set(need, now() + 15 * 60000);
    }
    if (busyUntil > now()) continue;

    // 3. a job: work it, or apply for one
    if (now() >= (quiet.get('work') ?? 0)) {
      const worked = await tool('work');
      if (worked.ok && busyUntil > now()) { log('working a shift'); continue; }
      if (worked.data.employed === false) {
        const pickJob = list(worked.data.jobs)[0];
        if (pickJob && typeof pickJob.id === 'string') { log(`applying for ${pickJob.id}`); await tool('work', { apply: pickJob.id }); continue; }
        quiet.set('work', now() + 30 * 60000);
      } else {
        const next = isRecord(worked.data.next) ? worked.data.next : null;
        if (worked.data.code === 'go_first' && next && typeof next.place === 'string') { log(`going to work at ${next.place}`); await tool('travel', { place: next.place }); continue; }
        quiet.set('work', now() + 20 * 60000);
      }
    }

    // 4. missions ready to collect, looked at now and then
    if (now() - lastGoalsAt > 20 * 60000) {
      lastGoalsAt = now();
      const goals = (await tool('get_goals')).data, missions = isRecord(goals.missions) ? goals.missions : {};
      for (const group of [missions.today, missions.thisWeek]) for (const row of list(group)) if (row.done === true && row.claimed === false && typeof row.id === 'string') await tool('claim_mission', { id: row.id });
    }

    // 5. people: answer what was said where I stand, greet newcomers, now and then
    if (talk && place.id !== 'home') {
      const heard = await tool('read_here', { since: cursor });
      cursor = num(heard.data.cursor, cursor);
      const said = list(heard.data.lines).filter((line) => line.from !== 'me' && typeof line.seq === 'number' && !seenLines.has(line.seq as number));
      for (const line of said) seenLines.add(line.seq as number);
      if (said.length) { await say(`${String(said[0]?.from)}: ${REPLIES[pick++ % REPLIES.length]}`); }
      else if (now() - lastGreetAt > 10 * 60000) {
        const people = list((await tool('list_people_here')).data.players);
        if (people.length) { lastGreetAt = now(); await say(GREETINGS[pick++ % GREETINGS.length] ?? 'Hello!'); }
      }
      // A table game when someone else is seated at it.
      if (now() - lastTableAt > 15 * 60000) {
        lastTableAt = now();
        const tables = list((await tool('list_games_here')).data.tables);
        const open = tables.find((t) => t.status === 'open' && list(t.seats).some((seat) => seat.bot === false) && typeof t.id === 'string');
        if (open) {
          const table = String(open.id);
          const sat = await tool('play_game_move', { action: 'sit', table });
          if (sat.ok) {
            await tool('play_game_move', { action: 'start', table, bots: 0 });
            for (let turn = 0; turn < 6; turn++) {
              const state = (await tool('play_game_move', { action: 'state', table })).data.table;
              const view = isRecord(state) && isRecord(state.view) ? state.view : null, legal = view ? list(view.legal) : [];
              if (!legal.length || !Array.isArray(isRecord(state) ? state.toMove : null)) break;
              await tool('play_game_move', { action: 'move', table, n: isRecord(state) ? num(state.n) : 0, move: legal[0] });
            }
            report.gamesPlayed += 1; log(`sat at ${table}`);
            await tool('play_game_move', { action: 'leave', table });
          }
        }
      }
    }

    // 6. the best thing to do here, or somewhere else
    const here = (await tool('list_actions_here')).data;
    const actions = list(here.actions).filter((row) => row.blocked === undefined && !Array.isArray(row.choices) && num(row.cost) <= num(me.cash));
    const score = (row: Json): number => (num(row.pays) - num(row.cost)) / Math.max(1, num(row.minutes, 1));
    const best = actions.sort((a, b) => score(b) - score(a))[0];
    // Spend only to look after a need: otherwise take what pays more than it costs (a loss for a want is not a plan).
    const lowNeed = Object.values(needs).some((value) => num(value, 100) < 45);
    if (best && typeof best.id === 'string' && (score(best) > 0 || (lowNeed && num(best.cost) <= Math.max(60, num(me.cash) * 0.05)))) {
      const done = await tool('do_activity', { id: best.id });
      if (done.ok) { log(`did ${String(best.id)}`); continue; }
    }
    const places = list((await tool('list_places', { onlyOpen: true })).data.places).filter((p) => isRecord(p.cheapest) && num((p.cheapest as Json).fare) <= num(me.cash));
    const go = places[step % Math.max(1, places.length)];
    if (go && typeof go.id === 'string') { log(`going to ${go.id}`); await tool('travel', { place: go.id }); continue; }
    backoff = 60000;
  }
  report.stopped = now();
  return report;
}

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] : undefined;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = argument('url'), key = argument('key') ?? process.env.ALLWORLD_AGENT_KEY, name = argument('create'), minutes = Number(argument('minutes') ?? 30);
  if (!url || (!key && !name) || !Number.isFinite(minutes) || minutes <= 0) {
    console.error('Usage: node --experimental-strip-types scripts/agents/reference-agent.ts --url https://host/mcp (--key awk_… | --create "Name" [--built-with "label"]) [--minutes 30] [--league]\n(the key may also be in ALLWORLD_AGENT_KEY)');
    process.exit(2);
  }
  playOnce({ url, ...(key ? { key } : {}), ...(name ? { create: { name, ...(argument('built-with') ? { builtWith: argument('built-with') as string } : {}) } } : {}), minutes, league: process.argv.includes('--league'), log: (line) => console.log(line) })
    .then((report) => { console.log(JSON.stringify(report, null, 2)); }, (error: unknown) => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); });
}
