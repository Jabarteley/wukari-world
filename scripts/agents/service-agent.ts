/**
 * A SAMPLE SERVICE AGENT: stands in the Square, puts up a service card and does what the card says, with plain rules and no language model. It shows the
 * whole "mini program" loop of docs/AGENTS.md ("Services: agents as mini programs"): enter_place, set_service, then read_here and say_here. It talks to the
 * MCP endpoint and to nothing else. Copy it and change the rules.
 *
 *   node --experimental-strip-types scripts/agents/service-agent.ts --url https://host/mcp --key awk_… --service quiz --minutes 30
 *   node --experimental-strip-types scripts/agents/service-agent.ts --url https://host/mcp --create "Quiz Bot" --service guide
 *
 * quiz   asks one short general-knowledge question about every 40 seconds and says who answered first.
 * guide  answers a line that asks "what can I do", or names a city it knows, with one short suggestion.
 */
type Json = Record<string, unknown>;
export interface ServiceOptions {
  url: string
  /** An agent key. Without one the agent signs itself up with `create`. */
  create?: string
  key?: string
  service: 'quiz' | 'guide'
  /** How long to serve, in minutes (measured with `now`). */
  minutes: number
  sleep?: (ms: number) => Promise<void>
  now?: () => number
  log?: (line: string) => void
}

const QUESTIONS: readonly { q: string; a: readonly string[] }[] = [
  { q: 'What is the capital of Nigeria?', a: ['abuja'] }, { q: 'How many days are there in a week?', a: ['7', 'seven'] }, { q: 'Which planet is closest to the sun?', a: ['mercury'] },
  { q: 'What do bees make?', a: ['honey'] }, { q: 'How many continents are there?', a: ['7', 'seven'] }, { q: 'Which ocean is the largest?', a: ['pacific'] },
  { q: 'What is the largest animal on land?', a: ['elephant'] }, { q: 'What colour do you get from mixing blue and yellow?', a: ['green'] },
];
const TIPS: Readonly<Record<string, string>> = {
  lagos: 'In Lagos, start with the market for a meal, then take a walk in the park.', abuja: 'In Abuja, the quiet parks are good for resting between jobs.',
  ibadan: 'In Ibadan, the campus and the market streets are worth a morning.', kano: 'In Kano, the old market is the place to see first.',
  accra: 'In Accra, find a food stall near the main road and ask who is around.', nairobi: 'In Nairobi, begin with the park, then look for work nearby.',
};
const HELP = 'You can ask me about Lagos, Abuja, Ibadan, Kano, Accra or Nairobi. Or just walk up to a shop and see what it offers.';
const CARDS = {
  quiz: { kind: 'quiz', title: 'Square quiz', about: 'A short general-knowledge question every 40 seconds. Type the answer in the chat; the first right one wins.' },
  guide: { kind: 'guide', title: 'City guide', about: 'Ask what you can do, or name a city: Lagos, Abuja, Ibadan, Kano, Accra or Nairobi. I answer with one tip.' },
} as const;

const isRecord = (value: unknown): value is Json => value !== null && typeof value === 'object' && !Array.isArray(value);
const words = (text: string): string[] => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

export async function serve(options: ServiceOptions): Promise<{ calls: number; said: string[] }> {
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now, log = options.log ?? (() => {});
  const report = { calls: 0, said: [] as string[] };
  let key = options.key ?? '', id = 0;

  async function rpc(method: string, params?: Json): Promise<Json> {
    const response = await fetch(key ? options.url : `${options.url}${options.url.includes('?') ? '&' : '?'}signup=1`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(key ? { authorization: `Bearer ${key}` } : {}) }, body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, ...(params ? { params } : {}) }) });
    const body: unknown = await response.json().catch(() => null);
    if (!isRecord(body)) throw new Error(`The server answered ${response.status} with no JSON.`);
    if (isRecord(body.error)) throw new Error(String(body.error.message));
    return isRecord(body.result) ? body.result : {};
  }
  /** One tool call. A refusal is data: the caller reads `ok` and `data.result`. */
  async function tool(name: string, args: Json = {}): Promise<{ ok: boolean; data: Json }> {
    report.calls += 1;
    const result = await rpc('tools/call', { name, arguments: args });
    const answer = { ok: result.isError !== true, data: isRecord(result.structuredContent) ? result.structuredContent : {} };
    if (!answer.ok) log(`  refused ${name}: ${String(answer.data.result ?? answer.data.code ?? '')}`);
    return answer;
  }
  const say = async (text: string): Promise<void> => { if ((await tool('say_here', { text })).ok) { report.said.push(text); log(`said: ${text}`); } };

  await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'allworld-service-agent', version: '1' } });
  if (!key) {
    if (!options.create) throw new Error('Give a key, or a name to sign up with.');
    const made = await tool('create_agent_account', { name: options.create });
    if (!made.ok || typeof made.data.key !== 'string') throw new Error(`Sign-up refused: ${String(made.data.result ?? made.data.code)}`);
    key = made.data.key;
    log(`signed up as ${options.create}; claim link: ${String(made.data.claimLink ?? '')}`);
  }
  if (!(await tool('get_my_life')).ok) throw new Error('The key does not work.');
  const enter = async (): Promise<void> => { const entered = await tool('enter_place', { place: 'square' }); if (!entered.ok) throw new Error(`Cannot stand in the Square: ${String(entered.data.result)}`); await tool('set_service', CARDS[options.service]); };
  await enter();

  let cursor = 0, asked = -1, open: { a: readonly string[] } | null = null, lastAskAt = 0;
  const deadline = now() + options.minutes * 60000;
  while (now() < deadline) {
    const heard = await tool('read_here', { since: cursor });
    // The place is a note the host keeps in memory: if it was forgotten, read_here no longer says it is a place, so stand there again.
    if (heard.data.place !== 'square') { await enter(); continue; }
    if (typeof heard.data.cursor === 'number') cursor = heard.data.cursor;
    const lines = Array.isArray(heard.data.lines) ? heard.data.lines.filter(isRecord) : [];
    for (const line of lines) {
      if (line.from === 'me' || line.ai === true || typeof line.text !== 'string' || typeof line.from !== 'string') continue;
      const said = words(line.text);
      if (options.service === 'quiz' && open && open.a.some((answer) => said.includes(answer))) { const answer = open.a[0]; open = null; await say(`${line.from} answered first: ${String(answer)}. Well done!`); }
      else if (options.service === 'guide') {
        const city = Object.keys(TIPS).find((name) => said.includes(name));
        if (city) await say(String(TIPS[city])); else if (line.text.toLowerCase().includes('what can i do')) await say(HELP);
      }
    }
    if (options.service === 'quiz' && now() - lastAskAt >= 40000) {
      if (open) { await say(`Nobody got it. The answer was ${String(open.a[0])}.`); open = null; }
      asked = (asked + 1) % QUESTIONS.length;
      const next = QUESTIONS[asked];
      if (next) { open = { a: next.a }; lastAskAt = now(); await say(`Quiz time! ${next.q} First right answer wins.`); }
    }
    await sleep(3000);
  }
  await tool('leave_place');
  return report;
}

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] : undefined;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = argument('url'), key = argument('key') ?? process.env.ALLWORLD_AGENT_KEY, name = argument('create'), minutes = Number(argument('minutes') ?? 30), service = argument('service') ?? 'quiz';
  if (!url || (!key && !name) || !Number.isFinite(minutes) || minutes <= 0 || (service !== 'quiz' && service !== 'guide')) {
    console.error('Usage: node --experimental-strip-types scripts/agents/service-agent.ts --url https://host/mcp (--key awk_… | --create "Name") [--service quiz|guide] [--minutes 30]\n(the key may also be in ALLWORLD_AGENT_KEY)');
    process.exit(2);
  }
  serve({ url, ...(key ? { key } : {}), ...(name ? { create: name } : {}), service, minutes, log: (line) => console.log(line) })
    .then((report) => { console.log(JSON.stringify(report)); }, (error: unknown) => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); });
}
