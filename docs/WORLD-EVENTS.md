# The weekly world event, stage mode and election night

Phase 2 of [WOW-PLAN.md](WOW-PLAN.md): a reason to come back every week. One world event at a fixed time, everyone working toward one goal
in one city; a stage for talks and debates over the voice rooms; and election night for the weekly terms of [POLITICS.md](POLITICS.md).

| What | Where |
| --- | --- |
| The rules, pure (schedule, rotation, goals, drops, AI share, words) | `src/world-events/model.ts` |
| Stage mode, pure (roles, permissions, the queue) | `src/world-events/stage.ts` |
| Election night, pure (times, board numbers, debate choice, card words) | `src/world-events/election-night.ts` |
| What is stored; erasure | `server/world-events/data.ts` (collection `worldEvents`) |
| The event engine (steps, the counter, badges, the heartbeat, frames) | `server/world-events/service.ts` |
| Stages (and the two voice checks) | `server/world-events/stages.ts` |
| Election night on the server | `server/world-events/night.ts` |
| Routes | `server/routes/world-events.ts`, `server/routes/world-events-admin.ts` |
| Wire types | `src/types/world-events.ts` |
| The page | `src/app/features/world-events/` (chip, phone app, the place panel's part, stage panel, board) |
| The scene's dressing | `src/world-events/client.ts`, the fallback of `src/festivals/client.ts` `dressingNow` |
| Admin | Admin → World → World event (`src/app/features/admin/WorldEventsAdmin.vue`) |

None of it is under `src/game/`: the chip, the app, the Square's part and the scene's dressing are lazy chunks, so the first paint and the
startup download do not carry it (the only eager lines are two panel entries, one frame case and the stage hook in `src/community.ts`).

## The weekly event

**When.** Saturday 20:00 Lagos time by default, for an hour, after an hour of warm-up. An admin changes the day, time, length and warm-up
(or switches it off) without a release. The phases of a week:

| Phase | From | What a person sees |
| --- | --- | --- |
| announced | the Monday of the week | a gist line for every city ("This Saturday at 20:00: …"); the HUD chip from a day before the warm-up |
| warm-up | an hour before | "The admins are in town": a surprise drop lands in the Square every 15 minutes (20 people each); an admin can drop one any time |
| live | the start | the goal; the bar in the Square, the chip and Phone → World event |
| done | the end | the result line and its card; the city's change if the goal was reached |

**Which event.** A dated event (an admin's, with `on: YYYY-MM-DD`, the Lagos date of the event day) wins its week. Otherwise the rotation:
the built-in list (`BUILT_IN`: the Lagos footbridge, the Lagos quiz, Accra's street festival, the Lagos flood, Nairobi's lost matatu signs) by
Lagos week number, then events an admin added. An added event with a built-in id replaces it in its place; any event can be hidden.

**Three goals, fed only by what the server saw** (never a number from the page):

| Goal | A step is | Checked by |
| --- | --- | --- |
| gather | arriving in a venue room of the city (the event's venues, or any public venue). Once per person and venue. | the room module's `room-changed` and `ctx.checks.inRoom`: a person is admitted to a venue only where their stored life stands |
| deliver | picking up a load while in the first venue's room, putting it down in the second's, 20 s to 20 min later | `ctx.checks.inRoom` at both ends; a load held too long slips |
| answer | a right answer to one of the event's questions, while connected. One try a question. | the accepted answers never leave the server (`normalAnswer`) |

A warm-up drop is a step too (while standing in the Square). One person adds at most 12 steps (`PER_PERSON_MAX`), so nobody fills the bar alone.
A person's first step gives them the event's **badge**, once (`badges[publicId]`, the newest 26 kept; Phone → World event lists them).

**AI residents help, labelled.** So the bar always moves, the city's AI residents (`server/residents/world.ts`, three per city) add their share
during the hour: `worldEventAiShare` per cent of the target (an admin setting, 0 to 60, default 35), spread evenly. They are named and always
marked AI ("Adaeze (AI, 4)"). A character an AI agent plays counts as AI too. The AI alone never reach the goal: people finish it.

**The city changes.** When the counter reaches the target, `changes[city]` holds the event's label and two colours until a week after the
event ends. The city's gathering venue (where a new player arrives) leans toward those colours, the same light-only dressing as a festival
(no geometry, nothing to draw), whenever no festival is dressing it. Phone → World event lists the cities that look different.

**Words.** Gist lines (world list, so every city reads them): announced, warm-up, live, and the result, which is also the **share card**
("Lagos did it: Rebuild the footbridge at Freedom Park. 214 people and 3 AI residents helped", or "Lagos got 61% of the way: …"). The card is
the gist card (`server/growth/share.ts` kind `gist`): the server writes its words from the line's number.

**Live.** The people in the Square and at the event's venues get `world-live` frames when the bar moves (at most every 4 seconds); the page also
reads `GET /api/world/event` (public, cached 5 seconds) every minute, every ten seconds while it runs.

## Stage mode

A stage is a layer over the voice circle of one room: the Square, a public venue, or a group's room. One stage per room.

| Role | May |
| --- | --- |
| moderator | bring up a raised hand, take a speaker down, take or skip a question, end the stage. `null`: the game runs it (the most-voted question is taken by itself every 4 minutes). An admin is always a moderator. |
| speaker | talk (unmute). At most 6. |
| invited | take their own seat (a debate's candidates) |
| audience | listen, raise a hand, ask one written question at a time, vote once for others' questions |

**Adults only to speak:** raising a hand, taking a seat and being brought up need `ctx.checks.adult` (or an AI character, always labelled).
Anyone in the room may ask in writing; a question passes the chat filters (text, no fees, no contact details, the sender's mute).

**Voice.** The room module asks two checks: `stageMayTalk` (a listener's unmute is refused with `stage_listener`) and `stagePair` (a pair
with someone on the stage signals whatever the distance, so the speakers reach the whole group). The page plays only the people on the stage
and will not unmute a listener (`stageVoice` in `src/community.ts`); a listener who was talking when the stage opened is muted.

**Who opens one.** The game (election night), an admin anywhere (Admin → World event, or `POST /api/world/stage { op: 'open' }`), and an
adult member of a group in its own room. That is the hook Phase 7 (Allworld House, premieres) and Phase 8 (stage rooms) reuse.

**Not done, or weaker.** Voice is still the room's peer-to-peer circle: 8 people in a group of a public room hear each other. A bigger
audience follows the stage, the queue and the chat; an audio relay for crowds is later work. A listener's gain is reapplied when presence
next changes, so it can take a moment after a stage opens.

## Election night

Election night dresses the civic cycle (voting Thursday to Saturday, polls close at 00:00 on Sunday, Lagos time). It counts nothing itself:
the tally, the quorum and the winner are the stored ballot's.

| When | What |
| --- | --- |
| Friday 19:00 | the game picks up to four races for the debate (`pickDebates`: the people's ballot, two or more candidates; the nation, then states, then cities; most candidates first) and writes "Debate tonight in the Square" gist lines |
| Friday 20:00 to 22:00 | a debate stage in the Square for each half hour: the candidates are invited to take their seats; the agents' ballot's candidates for the same seat may sit too, labelled AI; the game moderates unless an admin names a person |
| Thursday to Saturday | the board: the live tally of the viewer's seats (city, state, nation; the people's and the agents', marked AI) in Phone → World event |
| Saturday 18:00 | "Results live" on the board in the Square |
| Sunday | the result with its percentage; the result card ("Ada wins Lagos with 61%", an AI winner marked "(AI)"), written once per seat as a gist line (the debated races by the game, any other when someone shares it); the winner's speech |

**The winner's speech.** The winner (an adult, or an AI character) sends one short text (3 to 280 characters, screened like chat) on Sunday.
It reaches everyone in the Square at once as a banner, a gist line says they gave it, and a stage opens in the Square for them for ten minutes
when it is free.

## Routes

```
GET  /api/world/event                         public: the week's event, its bar, AI helpers, the open drop, the cities that look different
GET  /api/world/event/me                      your steps, badge, load, answered questions, grabbed drops, badges
POST /api/world/event/step  { op, question?, answer? }        pickup | drop | answer | grab
GET  /api/world/stage?room=                   the stage in a room as you see it, and whether you may open one
POST /api/world/stage       { room, op, target?, question?, text?, title?, minutes? }   open | hand | unhand | invite | seat | down | ask | upvote | pick | dismiss | end
GET  /api/world/election-night?city=          the board of your seats, the debates, the speeches
POST /api/world/election-night/speech  { city, scope, text }
POST /api/world/election-night/card    { city, scope }            the result's gist line number, for the share card
GET  /api/admin/world-events                  admin: schedule, built-in and added events, hidden, the next four weeks
POST /api/admin/world-events  { action, … }   schedule.save | event.save | event.remove | hide | show | drop | stage.moderator | stage.end
```

## Editing without a release

`POST /api/admin/world-events` with `event.save` and an item:

```json
{ "id": "lagos-market-day", "title": "Get the market ready", "blurb": "Carry stock from the motor park to the market.",
  "city": "lagos", "goal": "deliver", "target": 80, "venues": ["park", "market"],
  "change": { "label": "Market day bunting", "colours": ["#e63946", "#f1c40f"] }, "on": "2026-11-07" }
```

An `answer` event carries `questions: [{ "q": "…", "answers": ["…"] }]` (up to 20, up to 8 accepted answers each). Every change is one audit line.

## Stored

`worldEvents` = `{ v, admin, runs, badges, changes, stages, nights }` (see `server/world-events/data.ts`). Keyed: `badges` and each run's
`by` and `keys`. Public ids only. An erased player's badges, steps record, stage places and speech go (`forgetWorldEventPlayers`); the counts
they added stay as numbers.

## Tests

`src/world-events/model.test.ts` (schedule, rotation, phases, admin checks, drops, the AI share, the card's words), `stage.test.ts` (roles and
permissions, adults only, the queue, the game-run stage), `election-night.test.ts` (times, the board's numbers, the card, the debate choice),
`src/app/features/world-events/eventWords.test.ts` (the chip's words, the scene's dressing), `server/world-events.test.ts` (the schedule an admin
edits, no answer leaves the server, the counter only for what the server saw, the badge once, gather, answers, the AI share and the city change,
drops, the board and the card and the speech, the debate stage and voice).
