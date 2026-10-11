/**
 * A REFERENCE AGENT: a tiny rule-based player that connects to Allworld with an agent key over the MCP endpoint and plays sensibly in a loop.
 * It has no language model: every choice is a plain rule, so it costs nothing to run, behaves the same every time, and is the test client of
 * the agent endpoint (server/agents/agents.test.ts). It is also the seed of a streaming bot: copy it and change the rules.
 *
 *   node --experimental-strip-types scripts/agents/reference-agent.ts --url https://your.host/mcp --key awk_… --minutes 60
 *
 * Rules, in order: finish what is running; eat when hungry; rest when tired; if employed go to work and work the shift; if not, apply for the
 * first job offered; collect finished missions; otherwise do the best paid or restoring activity here, or go somewhere that has one; now and then
 * greet a friend (at most one message a person every few hours). It stops after `--minutes` of game time and prints what it did.
 * If the game keeps refusing, it waits instead of repeating itself.
 */
type Json = Record<string, unknown>;
export interface AgentOptions {
  url: string
  key: string
  /** How long to play, in minutes of game time (measured with `now`). */
  minutes: number
  /** How to wait `ms`. The default really waits; a test moves a fake clock instead. */
  sleep?: (ms: number) => Promise<void>
  /** The game's time in ms. The default is the machine's clock. */
  now?: () => number
  log?: (line: string) => void
  /** Say hello to a friend now and then (default true). */
  greet?: boolean
  /** The least game time, in ms, one round of decisions takes. A polite agent does not spend its daily allowance of calls on 20-second tasks (default 90 s). */
  paceMs?: number
}
export interface AgentReport { calls: number; refusals: number; longestRefusalRun: number; started: number; stopped: number; startCash: number; endCash: number; actions: Record<string, number>; greeted: number; errors: string[] }

interface Answer { ok: boolean; data: Json; protocolError?: string }
const isRecord = (value: unknown): value is Json => value !== null && typeof value === 'object' && !Array.isArray(value);
const num = (value: unknown, fallback = 0): number => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);

export async function playOnce(options: AgentOptions): Promise<AgentReport> {
  const { url, key, minutes } = options;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now;
  const log = options.log ?? (() => {});
  const report: AgentReport = { calls: 0, refusals: 0, longestRefusalRun: 0, started: now(), stopped: 0, startCash: 0, endCash: 0, actions: {}, greeted: 0, errors: [] };
  let id = 0, run = 0;

  async function rpc(method: string, params?: Json): Promise<Json> {
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${key}` }, body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, ...(params ? { params } : {}) }) });
    const body: unknown = await response.json().catch(() => null);
    if (!isRecord(body)) throw new Error(`The server answered ${response.status} with no JSON.`);
    if (isRecord(body.error)) throw new Error(`${String(body.error.message)}${isRecord(body.error.data) ? ` (${String(body.error.data.code)})` : ''}`);
    return isRecord(body.result) ? body.result : {};
  }
  let busyUntil = 0, finished = false;
  /** One tool call. A refusal is data, not an exception: the rules decide what to do next. A rate limit is waited out once; the daily cap ends the run. */
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

  await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'allworld-reference-agent', version: '1' } });
  const lastGreeting = new Map<string, number>();
  let lastGreetAt = now(), lastGoalsAt = 0, backoff = 0, step = 0;
  const quiet = new Map<string, number>();
  const first = life(await tool('get_my_life'));
  report.startCash = num(first.cash);
  report.endCash = report.startCash;
  const deadline = report.started + minutes * 60000;

  const pace = options.paceMs ?? 90000;
  let lastRoundAt = 0;
  while (now() < deadline && !finished) {
    const roundStart = now();
    step += 1;
    if (backoff > 0) { await sleep(backoff); backoff = 0; }
    // A round takes at least `pace`; what was started takes real time: wait it out without asking.
    if (step > 1 && roundStart - lastRoundAt < pace) await sleep(pace - (roundStart - lastRoundAt));
    lastRoundAt = now();
    // What was started takes real time: wait it out without asking.
    if (busyUntil > now()) { await sleep(Math.min(busyUntil - now(), 300000) + 1500); }
    const me = life(await tool('get_my_life'));
    report.endCash = num(me.cash);
    const needs = isRecord(me.needs) ? me.needs : {};
    const doing = isRecord(me.doing) ? me.doing : null;
    if (doing) { const left = num(doing.secondsLeft, 5); log(`doing ${String(doing.id ?? doing.kind)} for ${left}s`); busyUntil = now() + left * 1000; continue; }

    // 1. look after needs (a need that could not be met is not asked about again for a while)
    for (const [need, below] of [['hunger', 40], ['energy', 30]] as const) {
      if (num(needs[need], 100) >= below || now() < (quiet.get(need) ?? 0)) continue;
      const answer = await tool('eat_or_rest', { need });
      if (answer.ok) { log(`restoring ${need}`); break; }
      const next = isRecord(answer.data.next) ? answer.data.next : null;
      if (next?.tool === 'travel' && typeof next.place === 'string') { log(`going to ${next.place} for ${need}`); await tool('travel', { place: next.place }); break; }
      quiet.set(need, now() + 15 * 60000);
    }
    if (busyUntil > now()) continue;

    // 2. a job: work it, or apply for one
    if (now() >= (quiet.get('work') ?? 0)) {
      const worked = await tool('work');
      if (worked.ok && busyUntil > now()) { log('working a shift'); continue; }
      if (worked.data.employed === false) {
        const jobs = Array.isArray(worked.data.jobs) ? worked.data.jobs.filter(isRecord) : [];
        const pick = jobs[0];
        if (pick && typeof pick.id === 'string') { log(`applying for ${pick.id}`); await tool('work', { apply: pick.id }); continue; }
        quiet.set('work', now() + 30 * 60000);
      } else {
        const next = isRecord(worked.data.next) ? worked.data.next : null;
        if (worked.data.code === 'go_first' && next && typeof next.place === 'string') { log(`going to work at ${next.place}`); await tool('travel', { place: next.place }); continue; }
        // No shift today, or it is done, or something to fix first: do other things and try again later.
        quiet.set('work', now() + 20 * 60000);
      }
    }

    // 3. missions ready to collect, looked at now and then
    if (now() - lastGoalsAt > 20 * 60000) {
      lastGoalsAt = now();
      const goals = (await tool('get_goals')).data;
      const missions = isRecord(goals.missions) ? goals.missions : {};
      for (const list of [missions.today, missions.thisWeek]) for (const row of Array.isArray(list) ? list.filter(isRecord) : []) if (row.done === true && row.claimed === false && typeof row.id === 'string') await tool('claim_mission', { id: row.id });
    }

    // 4. say hello to a friend now and then
    if (options.greet !== false && now() - lastGreetAt > 45 * 60000) {
      lastGreetAt = now();
      const friends = (await tool('list_friends')).data.friends;
      for (const friend of Array.isArray(friends) ? friends.filter(isRecord) : []) {
        const who = String(friend.id);
        if (now() - (lastGreeting.get(who) ?? 0) < 6 * 3600000) continue;
        lastGreeting.set(who, now());
        const sent = await tool('send_message', { to: who, text: `Hello ${String(friend.name)}! How is your day going?` });
        if (sent.ok) { report.greeted += 1; log(`greeted ${String(friend.name)}`); }
        break;
      }
    }

    // 5. the best thing to do here, or somewhere else
    const here = (await tool('list_actions_here')).data;
    const actions = (Array.isArray(here.actions) ? here.actions.filter(isRecord) : []).filter((row) => row.blocked === undefined && !Array.isArray(row.choices) && num(row.cost) <= num(me.cash));
    const best = actions.sort((a, b) => (num(b.pays) - num(b.cost)) / Math.max(1, num(b.minutes, 1)) - (num(a.pays) - num(a.cost)) / Math.max(1, num(a.minutes, 1)))[0];
    if (best && typeof best.id === 'string' && (num(best.pays) > 0 || Object.keys(isRecord(best.needs) ? best.needs : {}).length > 0)) {
      const done = await tool('do_activity', { id: best.id });
      if (done.ok) { log(`did ${String(best.id)}`); continue; }
    }
    const places = (await tool('list_places', { onlyOpen: true })).data.places;
    const options2 = (Array.isArray(places) ? places.filter(isRecord) : []).filter((place) => isRecord(place.cheapest) && num((place.cheapest as Json).fare) <= num(me.cash));
    const go = options2[step % Math.max(1, options2.length)];
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
  const url = argument('url'), key = argument('key') ?? process.env.ALLWORLD_AGENT_KEY, minutes = Number(argument('minutes') ?? 30);
  if (!url || !key || !Number.isFinite(minutes) || minutes <= 0) {
    console.error('Usage: node --experimental-strip-types scripts/agents/reference-agent.ts --url https://host/mcp --key awk_… [--minutes 30]\n(the key may also be in ALLWORLD_AGENT_KEY)');
    process.exit(2);
  }
  playOnce({ url, key, minutes, log: (line) => console.log(line) }).then((report) => { console.log(JSON.stringify(report, null, 2)); }, (error: unknown) => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); });
}
