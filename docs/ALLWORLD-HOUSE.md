# Shared watching: match nights, Allworld House and artist premieres

Phase 7 of [WOW-PLAN.md](WOW-PLAN.md), with its decisions: football is **voice rooms and predictions only** (no stream, no score feed, the
result is typed in by an admin); **Allworld House** has AI housemates only for the first season and adults vote; **artists** are unsigned
artists who apply, an admin approves, and no artist's name appears anywhere before that. The owambe upgrade of the same phase is in
[FESTIVALS.md](FESTIVALS.md) ("Owambe parties").

| What | Where |
| --- | --- |
| The rules, pure (picks, points, seasons; the house's times, tally, diary lines and words; applications, the front row) | `src/watch/predictions.ts`, `src/watch/house.ts`, `src/watch/premiere.ts` |
| What is stored; erasure | `server/watch/data.ts` (collection `watch`) |
| Services | `server/watch/predictions.ts`, `server/watch/house.ts`, `server/watch/premieres.ts` |
| Routes | `server/routes/watch.ts` (`/api/watch/…`), `server/routes/watch-admin.ts` (`/api/admin/watch`) |
| Wire types | `src/types/watch.ts` |
| The page | Phone → **Watch** (`src/app/features/watch/`: `WatchApp.vue` with three lazy tabs, `PremiereBar.vue` inside a world, `watchCards.ts`) |
| Admin | Admin → World → "Watch" (`src/app/features/admin/WatchAdmin.vue`) |

None of it is in the first download: the phone app is one panel entry (`bodyLoader('watch/WatchApp')`) and every tab is its own chunk.

## Match predictions

* **Fixtures** are the admin's list of match nights ([FESTIVALS.md](FESTIVALS.md) "Match nights"). A fixture whose title names two sides
  ("Arsenal v Chelsea", "Super Eagles vs Black Stars") can be predicted; a plain "Match night" cannot.
* **A pick** is the winner (home, away or draw) and, if you like, the score, which must agree with the winner. Picks open two weeks before
  kick-off and close at kick-off; a pick can be changed until then. Anyone with a character may pick: there is nothing to win but a badge.
* **Never money.** A pick has no amount: the server keeps `{ w, s?, at }` and ignores anything else in the request (a test sends
  `amount` and `stake` and checks nothing is kept). No game naira, no Earn, no odds, no word "bet" anywhere.
* **The result** is typed in by an admin after kick-off (Admin → World → Watch, or `result.save`). It scores every pick once: the exact
  score is **3 points** and the "Spot on" badge, the right winner **1 point** and "Called it". A second save **corrects** the result: the
  old points and badges are taken back first, so the board is always the stored picks against the stored result.
* **The board** is per football season (1 August to 31 July, Lagos date: "2026/27"): the best 20 and your own place. A name on it is a
  confirmed adult who is not hidden from the directory; anyone else is "A fan".
* **Cards.** The result is a public gist line ("Full time: Arsenal 2–1 Chelsea. 3 of 10 fans at the viewing centres called it."), shared
  as the gist card (`shareGist`). A right pick also gets a personal "I called it" card drawn on the phone (`watchCards.ts`, share loop
  `called-it`).
* **Watching together.** The Watch tab sends people to the city's viewing centre (the venue whose scene is `viewing`, fuller on match nights).
  Its room has voice, as every venue room does: up to 8 people in a group hear each other. Allworld never shows the match.

## Allworld House

A reality season of **four weeks** in a house, with **6 to 8 housemates who are AI residents** (`server/residents/world.ts`), two from each
city the admin names (or Lagos, Abuja, Port Harcourt, Ibadan, Kano, Enugu, Accra, Nairobi, Johannesburg, Kumasi), different first names,
spread over as many cities as possible. Every housemate is shown as "Ada (AI)" everywhere: the app, the stage, the room and the gist.

| When (Lagos time) | What |
| --- | --- |
| Season start (a Monday) | a gist line: "Allworld House season 1 has begun: 8 AI housemates. Adults vote weekly; eviction is Sunday 20:00." |
| Every day from 12:00 | each housemate's diary-room line in the app; one of them is also a gist line |
| Monday to Sunday 20:00 | voting: an **adult** saves one housemate, **once a week** (the first vote stands) |
| Sunday 20:00 | eviction night: the votes close and a stage opens in the house's room (stage mode, [WORLD-EVENTS.md](WORLD-EVENTS.md)) with the housemates on it, when the room's stage is free |
| Sunday 20:30 | the reveal: the housemate with the **fewest saves** leaves; a tie is broken by a stable hash of the season, the week and the housemate, never by list order. The tally is kept, the ballots are dropped. The gist line is the share card: "Allworld House: Tolu (AI) leaves the house in week 2, with 8% of the save votes." |
| The fourth Sunday | the finale: nobody leaves, the **most saves wins** ("Allworld House season 1: Ada (AI) wins, with 41% of the final vote.") |

* **Starting and stopping.** An admin starts a season (`house.start { room?, cities?, mates?, now? }`): it begins on the Monday of this
  week when started Monday to Wednesday (`now: true` forces this week), else next Monday. `house.stop` ends it at once: nobody is evicted,
  the ballots are dropped. A new season can start once the last is over or stopped; the last four seasons are listed with their winners.
* **The house in 3D** is the room the admin names: a group's room (`world:room:g.N`, [PLACES.md](PLACES.md)), furnished like any room and
  entered by its link. The housemates still in stand in it for everyone who comes in (`ctx.checks.roomCast`, read by
  `server/social/places.ts`), named "Ada (AI)". Without a room the house is the Square: the stage opens there and nobody is drawn.
* **Diary lines are written** from sixteen templates (free, no model; `diaryLine`): a line names only the housemate and another housemate,
  never a person. A model-written diary within caps (as `server/house/follow.ts` does for highlights) is a later step.
* **Not in season one:** player housemates (decision 3: later), a live 24-hour feed of the house, tasks set by viewers.

## Artist premieres

1. **Apply** (adults only): an artist name (2 to 40 plain characters, not a link), a few words, up to three `https://` links, and **one
   track as a YouTube or YouTube Music link**. Nothing is uploaded. Words pass the chat filter. A pending application can be changed; after
   a decline, a new one after a week.
2. **Approval.** Until an admin approves, the name is shown only to the artist and the admins: no list, gist line or card names them.
3. **Schedule.** An approved artist turns **one of their own Plans events** into the premiere (`POST /api/watch/premiere { event, world? }`),
   one at a time. The time, the place, the going list and the reminders are the event's. A gist line announces it ("New music: Ada Sings
   premieres "Lagos Love" on Saturday at 20:00. Come and listen together.").
4. **Tickets** are Earn's ([EARN.md](EARN.md)): the artist sets a price on the event in Plans as any host does (or leaves it free); a
   fan buys from the artist through Bachs. No new money path.
5. **The front row** is the first 12 ticket holders of a priced premiere (in the order they bought), or the first 12 who said they are
   going to a free one, never the artist.
6. **The shared screen.** With a world named, "Go in and listen" opens it; the artist, hosting, taps **Play the premiere** and the track
   plays on the world's screen for everyone inside at the same second ([WORLDS.md](WORLDS.md) phase 2). The track's id is shown to fans
   only once the premiere is live.
7. **A clip of the moment.** "Clip 6 s" in the world records six seconds of the 3D view with the caption ("Front row at Ada Sings's premiere
   of "Lagos Love" on Allworld") and the @handle mark, with the share-loop recorder (`shareloops/streetRecorder.ts`), and shares it from
   the phone (share loop `premiere`). The YouTube frame itself cannot be recorded (it is another site's).

An admin can decline an approved artist (their premieres go) or take one premiere down.

## Routes

```
GET  /api/watch/matches?city=                  fixtures for the city's country, my picks, results, my badges
POST /api/watch/predict { fixture, winner, score? }
GET  /api/watch/board?season=                  the season's board (default: this season)
GET  /api/watch/house                          the season, the housemates (AI), diary lines, weeks, my vote
POST /api/watch/house/vote { mate }
GET  /api/watch/premieres                      premieres, my application, my events (an approved artist)
POST /api/watch/artist/apply { name, about?, links?, track }
POST /api/watch/premiere { event, world? }
POST /api/watch/premiere/cancel { id }
GET  /api/admin/watch                          fixtures with pick counts, the season, the artists' queue, premieres
POST /api/admin/watch { action, … }            result.save | house.start | house.stop | artist.approve | artist.decline | premiere.remove
```

Answers are `{ ok: true, … }` or `{ ok: false, code, reason }` (HTTP 200); malformed is 400; writes are rate limited per player.

## Stored

`watch` = `{ v, seq, picks, results, board, badges, house, votes, artists, premieres }` (`server/watch/data.ts`). Keyed: each fixture's
picks, each season's board, badges, each week's votes, artists, premieres. Public ids only. An erased player's picks, points, badges,
votes, application and premieres go (`forgetWatchPlayers`); a result's counts and a tallied week stay as numbers.

## Tests

`src/watch/predictions.test.ts`, `house.test.ts`, `premiere.test.ts` (the rules), `server/watch.test.ts` (predictions with no amount kept,
the admin's result, badges, board and correction, erasure; the house's adult votes once a week, the eviction stage, the reveal, the room
cast, stop; premieres' approval before any name, own event only, the front row, the track at the premiere, a decline).
