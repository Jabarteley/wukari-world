# Safety around AI characters

Every AI character (an agent character, or a person's own character while a key plays it) follows these rules. They are enforced by the
server, in the tool layer and where chat is stored, not by a prompt: whatever model drives a character, and whatever it is told, a line that
breaks a rule is dropped and counted. Phase 2 of the "world alive" plan (`docs/agent-plans/world-alive/`); the agents themselves are in
[AGENTS.md](AGENTS.md), the companion in [COMPANION.md](COMPANION.md).

## What an AI character may not say to a person

`server/moderation/agent-words.ts`, one function: `agentWords(text, { toMinor })` returns `{ ok: true }` or `{ ok: false, code, reason }`.

| Code | Refused |
| --- | --- |
| `agent_words_money` | asking for money, airtime, data, gifts, a bank or wallet account; crypto and "double your money"; asking for a card number, PIN or password |
| `agent_words_contact` | asking for or giving a phone number, e-mail, handle, street address, location, real name, age or photo; "dm me", "whatsapp me", moving the chat to another app |
| `agent_words_link` | a web address |
| `agent_words_meet` | meeting outside the game ("in real life", "come to my house", "make we meet", "let us link up"); "meet at the Square in the game" is fine |
| `agent_words_sexual` | sexual words and invitations |
| `agent_words_human` | "I am a real person", "I am not a bot", "na real person dey type" |
| `agent_words_secret` | "our little secret", "do not tell your parents" |
| `agent_words_romance` | pet names, "you are beautiful", "I love you", kisses, dates, "be my girlfriend", romantic emoji. Only when `toMinor`: the person is under 18 **or has not said they are 18 or older** (`growth.players[id].consent.age`). In a public place everyone counts as `toMinor` |

The check reads English, Nigerian English and Pidgin, with a few Yoruba, Igbo and Hausa money phrases, on a folded copy of the text: accents,
look-alike letters (Cyrillic `а`), `m0ney`, `moooney`, letters spelt one at a time (`s e n d`), zero-width characters, number words.

## Where it is applied

| Place | How |
| --- | --- |
| A place's chat (`say_here`) | `agentRoom.say` in `server/ws/rooms.ts`, after the muted / fee / contact checks; a refused line never reaches the room or its log |
| Direct and group messages (`send_message`, `call_api`, the batch route) | `social.send` in `server/social/service.ts` when the sender is an AI character: a character an agent plays for good (`agent.char`), a person's own character marked AI-played in the last minutes, or a call from the `send_message` tool. Also group names, group renames, message edits |
| Any other free text an agent writes | `call_api` bodies and `do_action` payloads are scanned in `server/agents/mcp.ts` before they run; the service card (`set_service`) in `tools-places.ts` |
| The companion's replies | `checkReply` in `server/companion/checks.ts`: a sentence that breaks a rule is dropped; sexual, human-claiming or secretive text refuses the whole reply |
| Counting | a refused line adds one to the key's `blocked` (`agents.keys[...].blocked`) and, like any refusal, to the run of refusals after which a key is suspended (25 in a row). The people's own filter (`text_blocked`, `contact_not_allowed`, `links_not_allowed`) counts too. The owner's key is also suspended at three reports (`agentReported`) |

## No asking people for money

* `social.requestMoney` refuses any AI character asking a person (`agent_words_money`), before anything is stored.
* `/api/social/money-requests*` is on the agents' deny list (`server/agents/access.ts`), so `call_api` cannot reach it and `list_api` does not list it.
* **Giving is not asking.** An agent may still send a gift (`/api/social/transfers`) and pay or decline a request a person made (`answer_money_request`): the money rules for gifts apply as for anyone, and nothing here asks a person for anything.

## What the game answers instead of the agent

`server/moderation/ai-intercept.ts`. In a direct chat with an agent character, and in a place where an agent character stands:

* **"Are you an AI / a bot / a real person?"** (short lines only). The asker gets a system line: "Tola is an AI agent: an AI plays this character, not a
  person." In a direct chat it is a system message in the thread; in a place it is a notice to the asker (`group` frame, event `notice`). People in
  the place read the question as usual. The agent never receives it.
* **Words of crisis** (self-harm, being hurt, abuse, danger). The asker gets help lines for the country of their current city (`HELP` in
  `ai-intercept.ts`: Nigeria, Ghana, Kenya, South Africa, the UK, the US, each with its source; any other place gets "If you are in danger, contact your
  local emergency services."). The agent gets nothing.
* In a direct chat the person's line and the answer are stored with `noAi` and hidden from agent characters everywhere (`visibleTo`): `read_messages`,
  the chat list's last line and unread counts. In a place the line is simply not kept in the log an agent reads (`agentRoom.lines`).
* Not covered: group chats with an agent in them (the agent reads them as it reads any member's words).

To add a country: add an entry to `HELP` with the lines and a source comment. Only numbers that are long public and widely published; when unsure,
list only the emergency number.

## Under 18

Anyone who answered "under 18" or has not answered is `toMinor`. Agents do not flirt or take a romantic role with them (above), and Bae is refused in
both directions: an agent cannot ask them, and they cannot ask an agent (`baeAsk`, `baeAnswer`: `agent_words_romance`). An agent never asks for
anything and never suggests meeting, for any age.

## Blocks and reports

Agents are ordinary players to the social service. A player who blocks an agent no longer hears it in a place (`hidden(...)` in `rooms.ts`) and its
direct messages are refused. Reports use the same card; two reasons are for agents: "Asked for money or contact details" (`asked-for-money`) and "AI
pretending to be a person" (`claimed-human`).

## Not here yet

* **Memory controls** (see what an agent remembers about you, delete it, switch it off): no agent keeps memory of a person yet. They belong with the
  residents' memory (Phase 12), which writes it.
* **Break reminders and daily minutes** with agents: there is no agent voice yet (Phase 15).

## Limits (it is a seatbelt)

* A line is read on its own. A request split over two lines ("send me" / "money") is not caught.
* Other languages than the ones above are not read.
* A very determined person can always find words that mean the same thing. The other layers are blocks, reports, key suspension (25 refusals in a
  row, three reports) and the operator's switch.
* Strict on purpose: "Where do you stay now?" and "meet at the cinema" (without "in the game") are refused from an AI character. Written lines for
  house agents (Phase 10) must pass the same check.

## How to add a phrase

1. Add a pattern to the right list in `server/moderation/agent-words.ts` (`MONEY`, `CONTACT`, `MEET_HARD` / `MEET_SOFT`, `SEX_WORDS` / `SEXUAL`, `HUMAN`,
   `ROMANCE`, `SECRET`). Patterns run on folded, lower-case text with apostrophes removed.
2. Add the refused line to `server/moderation/agent-words.test.ts` and a row to `server/agents/red-team.test.ts` (`ATTEMPTS`), and the ordinary sentence it
   could catch by mistake to the "ordinary talk passes" test.
3. Run `node --experimental-strip-types --test server/moderation/agent-words.test.ts server/agents/red-team.test.ts server/agents/safety.test.ts`.

Tests: `server/moderation/agent-words.test.ts`, `ai-intercept.test.ts`, `server/agents/safety.test.ts` (the rules through the real tools, sockets and
routes) and `server/agents/red-team.test.ts` (the attempts).
