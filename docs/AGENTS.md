# AI agents

A player can connect their own AI agent, and it plays Allworld for them through the Model Context Protocol (MCP). This is stage one: the
server side and a small Settings section. Code: `server/agents/`, `server/routes/agents.ts`, `src/app/features/agents/`,
`scripts/agents/reference-agent.ts`. Tests: `server/agents/*.test.ts`, `deploy/agents.edge.test.ts`.

## Design constraints

These hold everywhere; each is enforced in code and by a test (the table at the end names them).

1. **An agent is never given a password or a browser session.** A signed-in player creates an AGENT KEY in Settings. It is shown once and
   stored only as a hash. It can be revoked, is listed with when it was created and last used, and an account holds at most 3. Guests cannot
   create keys. (An account must also be older than a day: the same wait every action strangers act on has.)
2. **Two modes.** (a) The key plays the player's OWN character. (b) The key gets its OWN independent character, an "agent character": a normal
   life in the world, owned by the creating account and permanently marked as agent-played. An account owns at most 2 agent characters.
   **There is no anonymous agent sign-up in stage one.** Every agent traces to an accountable account, which is what stops unlimited bot
   accounts. An agent character also needs an account with a checked phone number (the same check a stall needs); a key for the player's own
   character needs only the account.
3. **Agents use the same rules as people.** Every tool call goes through the existing action validation, cooldowns, costs and receipts. On top:
   a per-key rate limit (30 calls a minute) and a daily cap (600 calls a day), tighter chat limits (only the owner's friends and people who
   messaged first, no first-contact messages, 40 messages a day, no links or contact details), and NO access to account settings, sign-in,
   trust or identity checks, creating or publishing a shop, seller contact or payment links, reporting, moderation, admin routes or voice. A
   key is scoped by an allow-list of action types, deny by default (`AGENT_ACTIONS` in `server/agents/policy.ts`). All the numbers are in
   `AGENT_LIMITS` in that file and nowhere else.
4. **Honesty.** While a key has acted for a character in the last five minutes, that character's public view carries `agent: true` (with
   `agentUntil`, when the mark lapses), and the client shows a small "AI-played" tag on its name tag, in the People panel and in chat. An agent
   character always carries it. Agent-played time does not count towards the normal rankings: agent characters are excluded from every board
   and counted on a separate agents board. For a player's OWN character played by an agent, the weekly earnings could not be separated cleanly
   from what the person earned themselves (a shift an agent starts is paid at a later settlement, which may be the person's own poll), so
   the rule is coarser and exact: **in a Lagos week in which a key acted for that character, its earnings for that week are left out of the
   rankings and the place totals, and its balance row on the rich list carries the AI-played mark.** The next week it counts again unless an
   agent plays again.
5. **Privacy.** A tool returns only what that player's own client could already read. Nothing about other players beyond their existing public
   view (id, name, AI-played mark, friend or not), and no coordinates.
6. **Safety valves.** One operator switch disables all agent access at once (`POST /api/mod/agents/switch { "off": true }`, with the operator
   token, like the other operator routes). Each key can be revoked. A key is suspended automatically after 25 refusals in a row, and after 3
   reports about the character it plays. Every key keeps an audit trail (call count and the last 20 calls), readable by its owner.
7. **Cost.** No model runs on our side. Responses are compact JSON. `get_my_life` takes a `since` cursor, so an agent polls for a few bytes.

## The endpoint

`POST /mcp`, JSON-RPC 2.0 over the streamable HTTP transport, stateless per request, no event stream and no session id. `Authorization: Bearer awk_…`
on every request. CORS is closed: agents are programs, so a request that carries an `Origin` header (a browser) is refused and no
`Access-Control-*` header is ever sent. `GET` and `DELETE` answer 405. It implements `initialize`, `notifications/initialized`, `ping`,
`tools/list` and `tools/call`. The answer is exactly the JSON-RPC object (the host adds nothing to it).

Errors: a missing, wrong or revoked key is HTTP 401; a suspended key, the operator switch, a browser origin are 403; too many wrong keys from
one address is 429. A tool that the game refuses answers normally with `isError: true` and the game's own sentence plus what to do next (for
example "You are too hungry to work: eat first").

### Tools

| Tool | What it does |
| --- | --- |
| `get_my_life` | money, needs, mood, job, place, what you are doing and how long it has left, Lagos time. `since` returns "unchanged" cheaply. |
| `get_goals` | the starter goal, today's and this week's missions, the next job step. |
| `claim_mission` | collect a finished mission. |
| `list_places` | places in the city: open now, hours, what each offers, the cheapest trip (fare, seconds). |
| `list_actions_here` | what you can do now, cost, pay, minutes, needs restored, or why not. |
| `travel` | go to a place, cheapest mode unless one is named. |
| `do_activity` | start an activity (optionally first moving to another spot). |
| `wait_until_done` | wait up to 20 seconds for the running action to finish, or say how long is left. |
| `eat_or_rest` | start the best affordable activity here that restores a need, or say where to go. |
| `work` | start the shift where employed, list jobs when not, or apply (`apply`). |
| `buy` | groceries or boutique items; with only `kind` it lists them. |
| `list_people_here` | other players in the same place: id, name, AI-played mark. |
| `list_friends` | friends: id, name, online, AI-played mark. |
| `read_messages` | recent direct chats, or one chat after a `since` sequence number. |
| `send_message` | a short direct message, under the chat limits above. |
| `answer_money_request` | pay (up to ₦5,000) or decline a friend's request. |

Every result carries the updated short life summary. Any tool that changes something accepts `rid`, a unique id the agent makes: sending the
same one again answers from the first result instead of doing it twice.

## Managing keys

Settings, AI agents (lazy: nothing in the first download beyond the Settings menu entry). `GET /api/agents` lists keys and agent characters;
`POST /api/agents/keys` makes one (`mode: "own"` or `"agent"`, with `characterName` for a new agent character) and answers with the key once;
`POST /api/agents/keys/:id/revoke`; `GET /api/agents/keys/:id/audit`; `POST /api/agents/characters/:id/remove`. The write routes need an
Origin naming this host and the anti-forgery token, like the account routes. Removing an agent character ends its keys and keeps its life in
the archive. Deleting the account ends all of them and the data export lists them (names, times, counts; never a key).

A configuration for a generic MCP client:

```json
{
  "mcpServers": {
    "allworld": {
      "type": "http",
      "url": "https://YOUR-HOST/mcp",
      "headers": { "Authorization": "Bearer awk_YOUR_KEY" }
    }
  }
}
```

## The reference agent

`scripts/agents/reference-agent.ts` is a rule-based player with no language model: it eats when hungry, rests when tired, goes to work when
employed, applies when not, collects missions, otherwise does the best paid or restoring activity, and now and then greets a friend.

```
node --experimental-strip-types scripts/agents/reference-agent.ts --url https://YOUR-HOST/mcp --key awk_… --minutes 60
```

## How it is built

- Storage: the `agents` collection (keyed: one entry per key hash, per account and per agent character). A key is filed under the SHA-256 of
  itself. An agent character is an ordinary session record with no account and a secret nobody holds, marked `agent: { char: true, owner }`.
- Routing: both hosts serve `/mcp` as the route `POST /api/agents/mcp` (`server/server.ts`, `deploy/cloudflare-worker.ts`), without the page
  origin check and with the answer sent bare. The route resolves the key to a session and runs each tool through `executeCommand`, the same
  function as `POST /api/action`, inside the same city-content preload (`transactWithCityContent`), so a cold city is loaded before it is read.
- The mark: `session.agent` (public view, sockets) and the social player record (chat, lists). `agentMark()` in `server/agents/policy.ts` is the
  one place that decides it.

## Where each constraint is enforced

| Constraint | Code | Test |
| --- | --- | --- |
| Key shown once, hashed, listed, revoked, 3 at most | `server/agents/service.ts` `createKey`, `revoke`, `view` | `key lifecycle` |
| Guests refused; account age; Origin and token | `accountFor`; `server/routes/agents.ts` `guard` | `who may make a key` |
| Two modes, 2 agent characters, phone check | `createKey`, `authenticate` | `modes` |
| Allow-list, deny by default | `policy.ts` `scopeAllows`; `tools.ts` `act` | `scope` |
| Same rules as people | `tools.ts` `act` calls `executeCommand` | `reference agent` tests, `every tool answers` |
| Rate and daily caps | `service.ts` `admit` | `limits` |
| Chat limits | `tools.ts` `send_message` | `chat` |
| The AI-played mark | `policy.ts` `agentMark`, `protocol.ts` `publicSession`, `social/service.ts` `pub`, `ws/index.ts` | `honesty` |
| Ranking exclusion | `civic/residents.ts` `checkIn`, `routes/civic.ts` `enter`, `service.ts` `board` | `rankings`, `modes` |
| Privacy | `tools.ts` (no positions; public views only) | `privacy` |
| Operator switch, suspension, audit | `service.ts` `setSwitch`, `record`, `reported`; `routes/agents.ts` | `safety valves`, `audit` |
| Old data reads the same | nothing is created on read | `a life saved before this change` |
| The Worker | `deploy/cloudflare-worker.ts` | `deploy/agents.edge.test.ts` |

## Not in stage one

Anonymous or self-registered agents; a fresh-sign-in proof before a key is made (a key is made with the signed-in browser, as playing is);
agent characters appearing in venue rooms (an agent holds no socket, so it is met in chat, friends and the people lists, not standing in a
scene); streaming; per-key custom scopes in the interface (a key carries the default list; narrowing is supported by the server).
