# Social glue: close friends, talks, the gist board, group trips and family life

Phase 8 of [WOW-PLAN.md](WOW-PLAN.md) (19 October 2026), with its decision 5: marriage between two adult players and a shared home, and no
child arc. Five things that give friends a reason to be in the world together.

| What | Where |
| --- | --- |
| The rules, pure (limits, words, the names screen, who may share, who may marry, a trip's readiness) | `src/glue/model.ts` |
| Wire shapes | `src/types/glue.ts` |
| What is stored; the shared-home and married-badge reads | `server/glue/data.ts` (collection `glue`) |
| Close friends | `server/glue/close.ts` |
| Talks (stage rooms) | `server/glue/talks.ts`, on Phase 2's `server/world-events/stages.ts` |
| The gist board | `server/glue/board.ts`, with the reviewer of `server/feed/review.ts` |
| Group trips | `server/glue/trips.ts` |
| Marriage | `server/glue/marriage.ts` |
| Inbox lines; erasure | `server/glue/inbox.ts`; `server/glue/forget.ts` |
| Routes (`/api/glue/`) | `server/routes/glue.ts` |
| The page (all lazy) | `src/app/features/glue/` |
| Tests | `src/glue/model.test.ts`, `server/glue.test.ts`, `src/app/features/glue/glue.test.ts` |

**Where people find it** (no new phone app; one small HUD line):

| Part | Screen |
| --- | --- |
| Close friends: the list, the switch, and where the ones sharing with you are | People (a fold under "Find a player"); Messages (a strip above the chats); the HUD line |
| Talks | Plans → Talks |
| Gist board | Communities → a community → Gist board; Campus → Community → Campus gist board |
| Group trips and the trip card | Communities → a crew or community → Group trips |
| Marriage, the shared home, the married badge | Family → Marriage; the badge on a person's card |

Only the HUD line is a panel of its own (`close-now`, in `src/app/features/panels.ts`). Every screen reaches the glue through ONE lazy file,
`src/app/features/glue/GluePart.vue` (`<GluePart part="close|strip|talks|board|community|marriage" />`; no part is the HUD line), which holds
every glue component statically: each extra lazy chunk would add its file name to the dependency table of the first download. The talk's
stage is shown through Phase 2's `PlaceLive` (outside the Square it is only the stage), a chunk that already exists. So the first download
carries one panel entry and one file name.

## Close-friends presence

A person picks up to 30 close friends among their friends and, if they turn it on, those close friends see a line such as "Tunde is in the
Square now" or "Ada is at Freedom Park, Lagos". **Off by default.**

- **What is told** is a place in the game only, read from the server's own room registry (`server/social/presence.ts`): the Square; "a
  group room" (never which one); a public venue and its city; "at home" and the city; only the city while visiting someone (never whose home).
  Someone offline, or connected but in no room (on a trip), has no line. There is no map pin, and nothing about a real position exists anywhere
  in this feature: the page never asks the device for one and the server has none to give.
- **Who is told.** A viewer sees a line only when, at the moment of the read, all of these hold (`mayShare`): sharing is on; the viewer is on
  the sharer's list; they are ordinary friends (both listed each other, never the founder's automatic friendship); there is no block either
  way. The index of "who listed me" only says whose records to look at, so a stale entry reveals nothing.
- **At once.** Turning it off, taking someone off the list, unfriending or blocking stops it on the next read, and the viewers concerned are
  sent a `world-live` frame of kind `glue` (`what: 'close'`) so an open page drops the line immediately rather than on its next minute.
- **The HUD line** asks `GET /api/glue/close/now` once a minute while the page is visible (and at once on that frame). It answers from memory and
  the sharers' records; nothing is written.

## Talks (stage rooms)

A hosted talk on Phase 2's stage mode ([WORLD-EVENTS.md](WORLD-EVENTS.md) "Stage mode").

- **Plan.** An adult picks a title, a start (10 minutes to 14 days ahead), a length (30, 60, 90 or 120 minutes), up to five speakers among
  their friends (adults, or AI characters, labelled), and where: the Square, the public venue they are standing in, or the 3D world of a
  community they belong to. Three a day. The talk is an ordinary feed event, so it has a post, "Remind me" is going, and the feed's own
  reminder goes out half an hour before. A community's talk is kept off the city's list and its join code, its post is for the community's
  members only, and the glue sends its half-hour reminder itself (on the heartbeat).
- **Open.** From 15 minutes before the start until the end, the host standing in the room (or an admin) opens the stage: the host moderates,
  the speakers are invited to take their seats, and the audience raises hands, asks one written question at a time and votes, under the
  stage's own rules (adults to speak; questions screened). Everyone going, and the speakers, get an inbox line that it is live. The stage is
  shown by Phase 2's `StagePanel`, inside the talk's card in Plans → Talks as well as in the Square and group rooms.
- **Recording is not built.** The voice is the room's peer-to-peer circle; nothing of it reaches the server, so there is nothing safe to record.
  A recording would need a server-side audio relay with consent from every speaker; that is later work, not this phase.
- Voice is still the room's circle (8 people in a group of a public room); a bigger audience follows the stage, the queue and the chat.

## The gist board

A confessions-style board per **community** (a community, not a crew of friends: `crew:<id>`) and per **campus** (`campus:unilag`). NGL and Yik
Yak showed what an anonymous board without guardrails becomes (bullying of named classmates), so it is built the other way round:

| Guardrail | How |
| --- | --- |
| Members only | A community's members read it (a locals-only community's members all hold the location badge); current UNILAG students (matriculated, studying or deferred, from the stored life) read the campus board. Nobody else can see it exists. Adults post. |
| Anonymous to readers only | A reader's answer never contains the author's id or name (a test checks the raw answer). The author sees "yours". The community's founder and moderators, and an admin, see who wrote each post. The AI reviewer is told the author's name and how many of their posts were taken down. |
| No names | A post naming a member of the board (whole name, first name of three letters or more, or handle, any case, accents ignored) or any @mention is refused before anything is stored: "Gist here is about things, not named people." On the campus board the names screened are those of the students who opened it lately. It errs on the side of refusing (a member called Joy blocks "pure joy"). |
| The reviewer on every post | `judge` of `server/feed/review.ts`, told it is an anonymous board where anything aimed at a person (even without a name: a description, initials, a room) is hide or remove. Keep: it shows. Otherwise it is refused, with the reason, and the author gets a strike. No answer: it waits and is tried again every five minutes, three times, then waits for a moderator. |
| Reports | Two members reporting a post take it off and back to the reviewer. **"This is about me"** takes it off at once and back to the reviewer; if the reviewer keeps it, it stays off until a moderator puts it back (3 such reports a person a day, so it cannot empty a board). |
| Fast removal | The author removes their own; a moderator or admin removes any (a strike) or restores it. A removal by the reviewer of a post someone said was about them is told to the author. |
| Limits | 8 to 280 characters, the game's text filter with contacts and links refused, the sender's mute, 5 posts a Lagos day, one a minute, no repeat within an hour. Three strikes in 30 days bar an author from that board for a week. Posts end after a week. |
| No side channel | The board is not filtered by blocks: hiding a blocked person's posts would tell the reader who wrote them. There are no replies (where pile-ons happen); "Same" is the one reaction. |

## Group trips

A crew or community books **one** trip together.

- **Plan.** A member picks who comes (everyone when the crew has 12 or fewer, else up to 11 people they choose; never an AI-played character
  and nobody in a block with them) and the trip: a **danfo** from the venue they stand in to another venue of the city, or a **flight** from
  their city to another city. Each person invited gets an inbox line. An open trip lapses after a day.
- **Answer.** Each says yes or no; the organiser can go without someone who has not answered, or call it off.
- **Go.** When everyone has answered and at least two are going, the organiser presses Go. Every one going must be online, in the trip's city,
  free, and for a danfo standing at the meeting point; otherwise the answer names who is missing. Then in **one transaction** the game's own
  travel runs for each of them: `travel` with mode `danfo`, or `estate.relocate` with mode `air` (the same actions as the Ride and Travel
  apps; each pays their own fare by the same rules). If the rules refuse anyone (no money, a ride debt), the whole transaction is undone:
  nobody leaves and nobody pays, and the organiser is told who and why. Everyone leaves from the same place at the same moment by the same
  route, so they arrive together.
- **The trip card**: the route, "4 of us flew from Lagos to Abuja, together", the names of who went, with the share sheet and WhatsApp.

## Family life

Marriage between two adult players and a shared home. **No children**: the child arc of the plan was dropped by decision 5.

- **Propose.** A confirmed adult asks an ordinary friend who is a confirmed adult, with a ring (gold band, silver band, rose gold, coral beads:
  for looks only, nothing is bought). Never an AI-played character, never across a block, never someone married, engaged or with a proposal
  out. Three a day. A proposal waits a week; the one who asked can take it back.
- **Both consent.** Only the person asked can say yes, and every rule is checked again when they do. Then they are engaged.
- **The ceremony.** Either of them, when **both** stand in the same place in the game (a venue, the Square or a group room; never a home): the
  people in the room are the guests (named, up to eight), everyone in the room sees the moment ("Ada and Bola just got married at Freedom Park,
  Lagos with Chidi and Dayo as witnesses"), and both get it in their inbox. An engagement lapses after 30 days without one.
- **A shared home.** Each spouse may offer their own home as the couple's (Family → Marriage). The other then walks in at any time, even while
  its owner is out and whatever the door is set to (`server/social/visit.ts`), stays while the owner is away (`pruneHouse`), and may arrange it
  in 3D (`server/spaces/world.ts`). The furniture of a life stays its owner's (the houses rules: a life is only changed by its owner's actions).
- **The married badge** on a person's card: "Married to Bola since 19 October 2026". Nothing is shown about a proposal or an engagement.
- **Ending it.** Either spouse ends it alone, at once, and the other is told. Nothing is paid or split: no money moves beyond what the existing
  rules move. A shared home stops being shared.

## Routes

`/api/glue/` (`server/routes/glue.ts`), all with a session, answers `{ ok: true, … }` or `{ ok: false, code, reason }`, writes limited to 40 a
minute a person:

| Route | What |
| --- | --- |
| `GET /api/glue/close`, `GET /api/glue/close/now`, `POST /api/glue/close { on?, add?, remove?, ids? }` | close friends |
| `GET /api/glue/talks`, `POST /api/glue/talks`, `/talks/remind`, `/talks/open`, `/talks/cancel` | talks |
| `GET /api/glue/board?key=`, `POST /api/glue/board/posts`, `/board/same`, `/board/report { id, aboutMe? }`, `/board/moderate { id, action }` | the gist board |
| `GET /api/glue/trips?crew=`, `POST /api/glue/trips`, `/trips/answer`, `/trips/manage`, `/trips/go` | group trips |
| `GET /api/glue/family`, `POST /api/glue/family/propose`, `/answer`, `/withdraw`, `/ceremony`, `/home`, `/divorce` | family life |

A change someone else should see at once is a `world-live` frame of kind `glue` with `what` (`close`, `trip`, `family`, `talk`): the page reads
again. Inbox lines use the feed's own inbox and `feed-inbox` frames.

## Stored data

A new keyed collection `glue` (`server/keyed.ts`), created by the first write: `close[id]` (list and switch), `seen[viewer]` (who listed them),
`talks[event]` and root `talkList`, `boards[key]` (post ids, strikes, bars, a campus board's recent readers), `posts[id]` (with the author, for
moderators and the reviewer), `days[id]`, `trips[id]` and `crewTrips[crew]`, `marriages[id]`, `wed[id]`, `asked[id]`, root `queue` (posts
waiting for the reviewer) and `seq`. The social record gains one optional field, `homeFor` (the spouse a home is shared with). Erasure
(`forgetGluePlayers`, called by `server/admin/erasure-data.ts`) removes a person's close-friends list and their place in others', their talks,
their gist posts (and takes back their reactions and reports), their trips (and takes them off others'), and every proposal, engagement and
marriage they are in.

## Measures

Close-friends opt-ins and lists (`close` entries with `on`), talks planned, opened and their going counts, gist posts kept versus refused,
removed and held by "about me", trips booked versus gone, marriages, divorces and shared homes.

## Not built, or weaker

- **No recording of talks** (see above), and no audio relay for crowds: Phase 2's limit holds.
- **Venue talks are planned where you stand.** To host at Freedom Park, stand in Freedom Park first; the Square and community worlds can be
  chosen from anywhere.
- **The campus board is UNILAG only** (the one campus the game has); its names screen covers the students who opened it lately, not every
  student, and the reviewer covers the rest.
- **No admin screen of its own** for the gist boards: an admin reads any board (`GET /api/glue/board?key=`) and acts with
  `POST /api/glue/board/moderate`, as a moderator does.
- **Trips need everyone online.** A trip does not wait for someone to come online; the organiser presses Go again.
- **No children**, by decision.
