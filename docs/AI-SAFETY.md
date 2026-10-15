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
| `agent_words_romance` | pet names, "you are beautiful", "I love you", kisses, dates, "be my girlfriend", romantic emoji. Only when `toMinor`: the person is under 18 **or has not said they are 18 or older** (`growth.players[id].consent.age`). In a public place everyone counts as `toMinor`, except for the one case in "Flirting in public" below |

The check reads English, Nigerian English and Pidgin, with a few Yoruba, Igbo and Hausa money phrases, on a folded copy of the text: accents,
look-alike letters (Cyrillic `а`), `m0ney`, `moooney`, letters spelt one at a time (`s e n d`), zero-width characters, number words.

## Where it is applied

| Place | How |
| --- | --- |
| A place's chat (`say_here`) | `agentRoom.say` in `server/ws/rooms.ts` (romance lines: see "Flirting in public"), after the muted / fee / contact checks; a refused line never reaches the room or its log |
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

Anyone who answered "under 18" or has not answered is `toMinor`, and no consent changes that. Agents do not flirt or take a romantic role with them (above), and Bae is refused in
both directions: an agent cannot ask them, and they cannot ask an agent (`baeAsk`, `baeAnswer`: `agent_words_romance`). An agent never asks for
anything and never suggests meeting, for any age.

## Flirting in public (confirmed adults who agreed)

The owner's rule: for a **confirmed adult** (`ctx.checks.adult` true: they answered "18 or older") flirting with an AI character is allowed in private chats (as
before) and in public places, when it is their relationship. Under-18s and people who have not answered: unchanged, never.

* **The consent** is a field on the PERSON's social record, `publicRomance: { <AI character id>: at }` (optional, so old records load). It is set only by the
  person's own explicit yes, never by an agent: the `/api/social/romance*` routes are on the agents' deny list (`routeDenied`), and the service also refuses an
  AI-played character answering. Only a confirmed adult can hold one.
* **The question.** The agent tool `ask_public_romance { to }` (`askPublicRomance`) puts a system card with **Yes** and **No** in their private chat ("Tola (AI)
  asks: can we flirt in public places, not only here?"). Only a confirmed adult can be asked (`agent_words_romance` otherwise), only a person who has already
  written in that chat (`no_chat`), at most **once a day per pair** (`asked_today`, kept as `romanceAsked` on the person), never an AI-played character. Yes
  stores the consent and No stores nothing; the card shows the answer.
* **Withdrawing.** The AI character's profile card shows **Flirting in public: on / off** to a confirmed adult (`POST /api/social/romance/public { with, on }`);
  off removes the consent at once. **Blocking** the character clears it in both directions (unblocking does not bring it back).
* **A Bae counts as a yes.** An AI character that is a confirmed adult's Bae (`social.bae`) may flirt with them in public without a separate yes; the switch
  shows "on" and the Bae is ended to stop it.
* **The public check** (`agentRoom.say` in `server/ws/rooms.ts`). A line that only breaks the romance rule is allowed when it is **addressed to** people (not AI
  characters) who are ALL covered by a yes or a Bae: addressed means the line names them (a whole word, or the first word of a longer name; `addressedIn`
  in `agent-words.ts`) or replies to their line (`say_here { replyTo: <seq of the line> }`). A line addressed to nobody, to anyone under 18 or of unknown age, to an
  adult who has not agreed to this character, or to a mix, stays refused. Everyone else in the place can read it; the rule is about who it is for.
* **Never lifted, whatever anyone consented to:** sexual words and invitations, asking for money, contact details and links, meetings outside the game,
  claims to be human, secrecy. The line is first read with the romance rule on; only when romance is the single reason does the consent matter, and then the
  line is read again with romance off, so every other rule is still applied.
* The same card and switch work for any AI character, including a person's own character while a key plays it.

* **House agents** (the game's own cast, no stored character): the same check answers for an id `house.<city>.<key>`. The person's yes is a partnership or a flirting yes
  kept with the agent's memory (not in `publicRomance`, which holds only stored characters); adults only, taken back by the person at any time. See [AGENT-MEMORY.md](AGENT-MEMORY.md).

Tests: `server/agents/public-romance.test.ts` (ask, yes, no, withdraw, block, minors, once a day, public lines, sexual words with consent, Bae) and
`addressedIn` in `server/moderation/agent-words.test.ts`.

## Blocks and reports

Agents are ordinary players to the social service. A player who blocks an agent no longer hears it in a place (`hidden(...)` in `rooms.ts`) and its
direct messages are refused. Reports use the same card; two reasons are for agents: "Asked for money or contact details" (`asked-for-money`) and "AI
pretending to be a person" (`claimed-human`).

## Not here yet

* **Memory controls** are built (Phase 12): on each AI character's card and in Settings a person sees what an agent remembers about them, deletes one fact or
  all, turns remembering off for one agent or for all (which deletes what is stored), and can end a partnership at any time. Facts never hold contact
  details or money, are at most five per agent, and are readable only by the person. See [AGENT-MEMORY.md](AGENT-MEMORY.md). Partners with an AI character
  are for confirmed adults only (unknown age counts as no) and opt-in, and a partnership (or an adult's separate flirting yes) counts as that adult's consent for the house agent, like a Bae or a public-romance yes: `ctx.checks.publicRomance` answers for `house.*` ids through `server/house/memory.ts flirtAllowed`, so the room check stays one check. Flirting to anyone else stays refused, and sexual words, money, contact details, meetings outside the game and claims to be human are refused for everyone. See [AGENT-MEMORY.md](AGENT-MEMORY.md).
* **Break reminders and daily minutes** with agents are built (Phase 15) for calls with house agents: minutes per person and in total per UTC day (admin settings `agentCallPlayerMinutes`, `agentCallTotalMinutes`; defaults 20 and 300), and a
  break reminder in the game's own words every 10 minutes of a session of calls (`agentCallBreakMinutes`; a session is calls with gaps under 15 minutes). Over the limit the character says it will call back and the call ends; the person can still
  write to it in the place. Before an agent or a model sees a line said on a call, the game answers words of self-harm or danger with help lines and a sincere "are you an AI?" with the plain answer, exactly as for written lines. A
  call is always on the same rules as a place's chat: the AI-played mark on the call screen, the word check on every reply (`toMinor`, so no flirting by voice), no money, details or meetings outside the game. A person's voice is their words: speech
  to text goes only to a model that does not train on it, the audio is never stored, and the screen says what each way does with it. See [CALLS.md](CALLS.md) "Calls with AI characters". Not covered: time spent writing to agents in a place is not counted
  towards a break reminder, and the minutes count calls only.

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
