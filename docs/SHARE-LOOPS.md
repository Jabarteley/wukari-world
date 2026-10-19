# Share loops: things people screenshot and post

Phase 4 of the [wow plan](WOW-PLAN.md), built 19 October 2026. Seven things a player makes and posts to WhatsApp Status, TikTok or a
group chat, each drawn **on the device** from facts the player can already see, with the `@handle · joinallworld.com` mark, and sent only
when the person picks a target in the phone's own share sheet (or the Allworld sheet's WhatsApp link). Nothing is uploaded to make a card.

Where to find them: **My Life → Share** (`src/app/features/shareloops/LoopsHub.vue`) for the street video, the start card, the passport,
the month and street fame; the **Gist** app for the city front page; a clip in the **feed** for duets; the first-minute strip of a new life
and the creator's "All set" screen for the start card.

## The pieces

| Loop | What a person sees | Made from | Code |
| --- | --- | --- | --- |
| Childhood-street video | "Find my old street": pick a city and a local government or district by name (or "Use where I am now"), pick a caption, and the dive from space to the street plays full screen while it is recorded. "Where I grew up · Surulere, Lagos" at the top, the mark in the corner. | the entry page's dive (`src/map3d/entry-dive.ts`, `dive-host.ts`) | `StreetVideo.vue`, `streetRecorder.ts`, `streetVideoModel.ts` |
| "What did you get" | A Status-sized card: job (or "Open to offers"), starter house and area, start cash in game naira, the birth lottery and the dream, under a light title. | the game's view of the player | `StartCard.vue`, `startCardModel.ts` |
| Monthly Wrapped | This month (or the two before): places visited, friends made, game naira earned, elections voted in, the AI resident seen most (marked AI), the most-reacted post. Only figures above zero are shown. | `GET /api/loops/wrapped` | `server/shareloops/wrapped.ts`, `loopCards.ts` |
| Passport stamps | A page per continent with round ink stamps (city, country, date), "3 of 41 cities in Africa"; more pages when a continent fills. | `GET /api/loops/passport` | `server/shareloops/passport.ts`, `stamp.ts` |
| City front page | Each morning, "The Lagos Gist": a headline and up to four stories from yesterday's public gist lines, in the Gist app and as a newspaper picture. | `GET /api/loops/frontpage` | `server/shareloops/frontpage.ts`, `FrontPageCard.vue` |
| Street fame | This week's most-visited homes and the communities whose posts got the most reactions, per city; a badge for last week's top three homes. | `GET /api/loops/fame` | `server/shareloops/fame.ts` |
| Duets | "Duet" on a clip: record your own clip and it shows beside the first. "Share the duet" makes one side-by-side video. | the feed (`POST /api/feed/post` with `duet`) | `server/feed/service.ts`, `PostCard.vue`, `DuetSheet.vue`, `duetComposite.ts` |

## Links and measuring

Every card's link carries its loop as the ad-source words: `utm_source=<loop>&utm_medium=card&utm_campaign=<loop>` with `<loop>` one of
`street-video`, `start`, `wrapped`, `passport`, `frontpage`, `fame`, `duet` (`loopLink`, `loopsModel.ts`). The landing is counted by the
growth metrics under that source, as Capture's clips are under `clip`. Where a card leads:

* the street video: the street's own entry page, `/street/<city>/<place>` (or `/visit/<city>`), which plays the same dive for the visitor;
* the front page: `/visit/<city>`; street fame without a badge: `/visit/<city>`;
* every other card: the player's profile, `/p/@handle` (or `/p/<id>`, or the front door).

Opening a card counts `share_card_created` with the loop as `kind`, the sheet `share_opened` with `surface: loop-<loop>`, and the phone's
sheet `share_channel: native`. **Measure** (the plan): cards and clips shared per weekly active, landings by `utm_source`.

There is no `/s/<code>` share record for these: the file is the card. (The server share cards are in [SHARE-CARDS.md](SHARE-CARDS.md).)

## The server records

One small collection, `loops` (`server/shareloops/store.ts`):

* `visits[week][city][host] = { n, g }`: visitors to a home that week. Fed by the social service's `visit-ended` event, which now carries
  the visit's `cityId`. A guest counts once a week per home: `g` holds one-way marks (`sha256(guest|host|week)`, 12 characters), never the
  guest's id, at most 200. Three weeks are kept.
* `guests[player][month]`: homes the player went into as a guest (Wrapped). Three months are kept.
* `pages[city]`: the last three front pages, words only.
* `made`: the Lagos day and how many front pages a model wrote that day, in all and per city (the caps).

Passport stamps live on the character: `SessionRecord.passport` (city id → the server time it first arrived). `stampPassport` runs where an
intercity trip is filed (`server/character.ts fileCharacter`, the arrival's own transaction): the city arrived in and, if it had none, the
city left. The city a life begins in is stamped by the first settlement after this release, or by the first `GET /api/loops/passport`.

**Erasure.** `forgetLoopsPlayers` (called by `server/admin/erasure-data.ts`) drops a player's months and their home from every board; the
stamps go with the session. `loops` is a known collection of the erasure preflight.

## Wrapped, exactly

From records the game already keeps, for the caller only (`no-store`): stamps first made in the month; the share loops' home tally;
`social.players[id].friends` with a `since` in the month; positive wallet entries of the month (the wallet journal, at most 40 pages), with
refunds and loans left out; elections (city, state, nation) whose week's Monday falls in the month and whose votes hold the player's id
(who they voted for is never read); the house agent with the closest standing among those seen in the month (its name only, from the
cast: no fact it remembers); the player's own post of the month with the most reactions. "Top AI rival" in the plan: there is no rival yet;
when the AI-residents phase adds one, it can take the place of `ai`. Game naira is always called game naira.

## The front page, exactly

* **Source:** only the city's own gist lines of the previous Lagos day (`server/gist/ledger.ts`), which already follow the gist's privacy:
  adults named, minors "a resident", hidden players and private facts never in it, no ids, no amounts unless public.
* **Template:** the most important line leads (election, removal, law, party, jail, business, event, notice, busy), the next four are the
  stories with their kind and time. Any reader of a city with lines gets this, made on the fly, until a model page exists.
* **Model:** on a live host (`ctx.worldFeed`) the heartbeat writes at most one page a minute after 06:00 Lagos, for the city with the most
  lines (at least three) that has no page for that day: purpose `newspaper` (paid models only: the lines carry players' shown names),
  one model page per city a day and 40 in all a day, under the router's own spend cap.
* **No invention:** the model answers JSON that names the line each story comes from. A story is kept only if every number and every
  capitalised name it wrote appears in the lines (`staysWithin`); a headline that adds one drops the whole page and the template is used. A
  story told from a line about an AI character says "(AI)". The page says "Written by AI from N public gist lines" or "From N public gist lines".

## Street fame, exactly

Homes rank by visitors this week; a home is on the board only if its owner is a confirmed adult who has not hidden themselves from the
directory (the gist's rule), named by their shown name. Communities rank by the reactions their posts in the city got this week (not removed,
not hidden; banned communities and private crews of friends left out). The badge: the player's home was in the top three of a city last week
("Street famous · #2 in Lagos"), shown in My Life and on the card.

## Duets

A clip post may name `duet: <post id>` of a clip the author can see and reply to; the new post must be a clip too (`invalid_duet`
otherwise). It is stored as its own post with `duet` set, and the first clip's author is told ("… answered your clip with a duet"). The view
of a duet carries `duet: { id, by, media, poster }` when the viewer may still see the first clip, else `duet: null` (the answer stands alone).
In the feed the two play side by side; "Share the duet" composites both into one 1280x720 video on the device (each half filled, both
handles at the top, the mark in the corner), as long as the longer clip (at most 16 s).

## The street video, exactly

The entry page's own backdrop is started in a full-screen box (the world, the country, then the dive with its clouds; a mid-range device a
shorter path; reduced motion the fade). Each frame of the atlas canvas is taken from the canvas's stream (WebGL keeps no picture between
frames), cropped to a 9:16 story at half size (540x960), the dive host's clouds are painted over it as it moves them, and the caption and
Capture's mark (`captureMark.ts`) are drawn on; `MediaRecorder` records it (MP4 where the browser can, else WebM). About 10 seconds (about 7 on a mid-range device).
A device that keeps things light (save-data, a weak device) gets "Share the link" instead: the link plays the same dive.

**Location privacy.** Nothing in `src/app/features/shareloops/` reads where the device is (a test checks it). "Use where I am now" is the
entry page's own finder (`streetEntry.ts findStreet` → `findCity.ts`), which hands back a city id and a local unit's id and name. Nothing about
the chosen place is stored or sent: it leaves the device only inside the video and its link, and only if the person shares them.

## Tests

`server/shareloops/shareloops.test.ts` (stamps and the trip filing, the passport view, months, Wrapped from each record, the visit tally,
the board and badge, erasure, the template, the no-invention check, the routes, the morning job and its caps and fallback),
`server/shareloops/duet.test.ts` (answering, refusals, a first clip that is gone) and `src/app/features/shareloops/shareloops.test.ts`
(links and words, the start card and its titles, passport pages, Wrapped and fame cards, the front page words, the street video's caption,
search, timing and crop, the duet layout, and location privacy).

## Check by hand (cannot be tested here)

On a phone: My Life → Share → Find my old street → Lagos, Surulere → Make my video; the dive plays, then Share opens the phone's sheet with
an MP4 (iPhone) or WebM (Android Chrome) that WhatsApp accepts; the caption and mark are in the frame. Share a passport page and a month to
a chat. Answer a clip with Duet, then Share the duet. Open the Gist app the morning after a busy day and look at the front page.
