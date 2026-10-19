# The feed: posts, profiles, crews, plans, gigs, and Lite

How Allworld became social in the way people expect of a social app, inside a 3D world and without it. The why and the phases are in
[SOCIAL-PLATFORM-PLAN.md](SOCIAL-PLATFORM-PLAN.md); this page is what was built and the rules it keeps.

Code: `src/feed/model.ts` (the rules both sides share), `src/types/feed.ts` (wire shapes and routes), `server/feed/` (stored shape, service,
pages), `server/routes/feed.ts` and `server/routes/feed-mod.ts`, `src/app/features/feed/` (the apps), `src/app/features/lite/` and
`src/app/state/lite.ts` (Lite). Tests: `server/feed.test.ts`, `server/feed-located.test.ts` (the badge, Near you, locals only),
`src/feed/near.test.ts`, `src/app/features/feed/locateCity.test.ts`, `src/app/state/lite.test.ts`.

## The idea: a post is a place

A post belongs to a person and to the place their character was in when they wrote it: the city and the venue from the stored life (never
from the client), with an optional label ("Yaba Market"). The feed has four tabs, and none of them is ever empty:

| Tab | What | Order |
| --- | --- | --- |
| Near you | with a location badge: public and city posts of your badge city, then the world's, neighbours first (see "Near you"); without one, as My city | ranked |
| Friends | your friends, the people you follow, your crews | newest first |
| My city | public and city posts made in your city, with the city's gist | ranked |
| World | every public post, with the world's gist | ranked |

Ranking (`score` in `src/feed/model.ts`): freshness with a six-hour half-life, lifted gently by replies and reactions, by a friend's hand
(x1.6), in Near you by how near the author is (`NEAR`: x3 the same local government, x1.6 the same city), and a little lower for AI-played
posts (x0.7) and moments (x0.9), so people stay on top. Ranked tabs page by position (`r20`,
`r40`), chronological ones by a cursor (`<at>.<id>`), so nothing repeats and nothing is skipped.

## Who sees what

One function decides (`canSee`, `canReply`), from what the server knows: self, friend, crew member, blocked either way, adult, player.

| Audience | Who sees it |
| --- | --- |
| Everyone (`public`) | anyone, also a visitor with no session and the `/p/` page |
| My city (`city`) | anyone with a session |
| Friends | mutual friends (the founder's welcome counts as a friendship, as in chat) |
| Crew | that crew's members |

- **Blocks win everywhere**: a blocked person's posts, replies, reactions and crew rows are not shown either way.
- **Under 18 or age not given**: posts go to friends and crews only; replies only where they are a friend or crew member, never to a stranger;
  they get no moment drafts (the gist does not name them); they cannot open their profile to followers or post gigs.
- **Photos and clips** may be public for adults (the owner's decision of 18 Oct 2026; admin setting `feedPublicMedia`, or
  `FEED_PUBLIC_MEDIA=off` to go back to friends and crews). Every new public photo, clip (by its still) and portrait is looked at by
  the AI reviewer when it is posted. `FEED_MEDIA=off` switches uploads off.
- **Text** passes the game's text filter with contacts and links refused, and the sender's mute. An AI character's words also pass the AI
  safety check (`agentWords`: no asking for money, contact details or a meeting), stricter where a minor may read.
- **Reports and the AI reviewer** (`server/feed/review.ts`, the owner's decision of 18 Oct 2026: "an AI agent reviews and can act
  immediately; we can undo"). Every post, reply, crew, event, gig and profile can be reported. The reviewer decides at once: keep
  (reports closed, anything reports hid comes back), hide, or remove, with a category and a sentence the author is told. It reads the
  words and, where there is one, the picture (a photo, a clip's still, a portrait), through the model router's `moderation` purpose:
  paid models only, inside the US$2 daily cap. Anything sexual involving a minor is always removed. A failure decides nothing (two
  reporters still hide a post meanwhile). Every decision is logged with what it changed; admins see the log in Moderation → Feed
  decisions and press Undo to put a thing back (`GET /api/admin/feed`, `POST /api/admin/feed/undo`, `POST /api/admin/feed/act`).
  Removal is soft for 30 days, then the thing and its bytes are deleted.

## Profiles

`@handle` (3 to 20, a letter first, letters, digits and single dots or underscores, unique, changeable once a month, reserved words refused),
a bio (80), a status (60) with the city you are in, a portrait (512 x 512, from the scene or a photo, re-encoded on the device and checked by
the server), a six-letter friend code, and "let anyone follow my public posts" (adults). `/p/@handle` is the same page as `/p/<id>`, now with
the portrait, handle, bio, status, work and latest public posts. The person card in the game shows the same, with Follow and Vouch.

**Work** is a view of what the world verifies: gigs done, the reviews of finished gigs (1 to 5 stars and 60 characters), friends' vouches for
one of twelve skills (once per skill), and an AI agent's service card. Nothing to type, nothing to fake.

**The game's own AI cast** (house agents and residents, `server/house/cast-ids.ts`) are feed authors too: AI-played, followable, with their work and city as the bio.
A followed one posts a written daily line and a weekly highlight; one that is leaving or changing tells its followers in their inbox (kind `ai`) seven days ahead.
See [AI-RESIDENTS.md](AI-RESIDENTS.md).

## Moments and recaps

When the gist records a public line that names someone (an election, a shop, a wedding), the gist calls `ctx.checks.moment`
(`server/gist/ledger.ts` add). A confirmed adult gets it as a draft, posted in one tap with their own words; an AI character's moment is
posted for it, marked, at most three a day. Once a Lagos week, a person who posted, went to an event or finished a gig gets a recap draft
("My week on Allworld: 5 posts, 2 events (…), 1 gig done. Mostly around Yaba Market.").

## Communities: your own city, state, estate, campus or club

The Communities app (it was Crews) starts any of: a crew of friends (20), or a city, a state, a neighbourhood or estate, a campus, a club
or another community (up to 1,000 members, adults to found one). A community is based on a real city or state of the game's world
catalogue (bringing in any of its places, with its state and country), on a place someone imagines, or on no place. It is open (listed in
Discover for its city, joined in one tap) or by link only (`/c/<code>`, previewed in WhatsApp). The founder names up to 11 moderators,
who remove members and help build.

**Its 3D world and group chat.** One tap makes a group chat the founder owns, switches its room's link on and gives it to the community
(`POST /api/feed/crews/world`, which checks the group is the founder's own). That room is the community's world: the group's members
(the founder and the friends they add, at most 12) build it with AI Spaces (docs/SPACES.md and SPACES-3D.md): describe it, import a
Space Plan, place their own models, give it a script and games. Every other member walks in through the room's link as a visitor, talks
and joins voice there; the link is shown only to members. In Lite the world is its room panel; "Step into the 3D world" walks it.

## Crews, plans and gigs

- **Crews**: up to 20, a name, a colour, a wall only members read, one join link `/c/<code>` (a page with Open Graph tags; the game opens
  with `?crew=<code>` and joining is one tap). The founder can ask someone to leave (they cannot rejoin for a week). Ten crews per person.
- **Plans**: an event at a place and a time (up to 60 days ahead, up to 12 hours), with a cap, RSVP going or maybe, friends going, an
  invitation page `/ev/<code>` (`?event=<code>` opens it), a post in the city feed, a reminder in the inbox about 30 minutes before, and
  "Plan the next one" for a guest to become a host.
- **Gigs**: adults (and AI characters) post a job with a reward in game money; anyone applies; the poster chooses, marks it done, and both
  review. The reward is paid as an ordinary gift between friends: the gift rules and caps hold, and nothing here moves money.

## Contacts

Find friends from your phone's contacts (`server/feed/contacts.ts`, `src/feed/phone.ts`), built so that it cannot leak numbers:

- Numbers never leave the device: the browser turns each into E.164 and sends the first half of its SHA-256.
- The server blinds every hash again with HMAC-SHA-256 under a pepper it made for itself and keeps outside the data (`ctx.keyFile`),
  so a copy of every collection holds only opaque tokens. Nothing is logged.
- An address book is not kept: each contact becomes one opaque pair token, kept 30 days so a friend who joins later still matches.
- Mutual only: two people see each other only when both added their own number and each has the other's. Confirmed adults only.
- Limits: 1,000 numbers an upload, three uploads a day, three changes of your own number a month. A taken number is refused with
  words that say nothing about its holder. Forget deletes your number, your tokens and your matches at once; erasure does the same.
- Known limit: until phone checks are live, a number is declared, not proven. Someone who declares another person's number first
  blocks that person from adding it, and is matched only with people who have that number and whom they have in turn. When the phone
  check is switched on, a proven number should replace a declared one.

## The inbox

Replies, reactions, mentions (`@handle` of someone who can see the post), follows, crew joins, RSVPs, gig steps, vouches and reviews: at most
50 lines on the person's own feed record, pushed live as `feed-inbox` frames on the social socket (the Feed app's badge).

## Lite: Allworld without the 3D world

`src/app/state/lite.ts` decides once, before anything is drawn: Lite is on at `/app` or `?lite=1` (both kept on the device), when the
device chose it before, or when the browser cannot make a WebGL context. `?lite=0` turns it off. Lite never mounts the scene or the 3D map;
the screen is five tabs over the same panels the phone uses (Feed, Here, Chats, People, Me), with All apps (the phone) and "Step into the
3D world" where the browser can draw it. Calls, room voice, pings, notices and the life sim work as they do beside the scene. My profile
has the switch both ways.

## Stored data

A new keyed collection `feed` (`server/keyed.ts`): `authors[id]`, `posts[id]` (with at most 100 replies), `cities[city]` (newest 300 post
ids, 60 events, 80 gigs), `handles[key]`, `codes[CODE]`, `crews[id]`, `events[id]`, `gigs[id]`; root `seq`, `world` (newest 400 public
posts), `reports` (newest 500), `trash`, `here` (this month's badge counts, "Near you"). Nothing is written into `social`. Media bytes are in the host's model store (`ctx.models`: files on
Node, R2 on the Worker), by content hash; a removed post's bytes are deleted after the commit, an erased player's on the next heartbeat.

| Limit | Value |
| --- | --- |
| Post / reply / bio / status | 500 / 280 / 80 / 60 characters |
| Posts / replies a day | 20 / 120 |
| Photo / portrait / clip | 250 kB / 160 kB / 4 MB and 15 seconds |
| Crew size / crews per person | 20 / 10 |
| Events / gigs a day | 3 / 3 |
| Follows | 300; follower counts shown from 100 |

Additive: a store without `feed` reads as empty, and the growth record gains `po` (first post) and `f3` (three friends) days. Erasure
(`forgetFeedPlayers`) removes a person's profile, posts, replies, reactions, follows, crew rows, events, gigs, reviews and reports.

## Measures

Daily counters `feed.post`, `feed.reply`, `feed.follow`, `crew.made`, `crew.joined`, `event.made`, `event.going`, `gig.posted`, `gig.done`.
The return split has `byPosted` (posted in the first two days). The operator metrics carry `northStar`: of the followed lives at least
eight days old, how many had three real friends within their first week.

## What is not built yet, and why

- **Residents as feed authors**: residents are the world-alive programme's (AGENT.md); their public acts already reach the City and World
  tabs as gist news. Giving them a social record is that owner's step.
- **Contact import**: needs a privacy review under the NDPA first.
- **Public photos and clips**: the owner's decision on scanning and moderation staffing.
- **Creator payouts**: the owner's decision.

## Location badge and locals-only communities

Optional, for adults (18+), in My profile → Location badge. "Check where I am" asks the browser for a position **once** (high accuracy
off, no watching); `src/app/features/feed/locateCity.ts` tests it on the device against the city boundaries of the city packs and, for a
city without them, its centre (within `LOCATED.km`, 25 km), and refuses a fix worse than 5 km. Inside a city pack's boundaries it also
finds the **local government** the device is in (`resolveLga` of `src/map3d/lga.ts`, the same finder as the game's "Find my local
government"; only when the position is surely inside one, never a nearest guess). The position is a local value of that function, never
stored, logged or sent (the source scan in `src/app/features/locate/locate.test.ts` lists it with the other readers). The card then
says "Ikeja, Lagos — show it?"; only when the player presses "Show it" is `POST /api/feed/located { city, lga? }` sent: a city id and a
local government id, nothing else ("City only" sends the city alone).

The server keeps `authors[id].located = { city, at, net?, lga? }`: the city, the server's time, `net` when the request's network country
(Cloudflare's `cf-ipcountry`) is the city's country, and `lga` when it is one of that city's own local units (the route loads the city's
rules first; any other id is refused with `unknown_area`, and a client's coordinates, if any were sent, are ignored). It shows as
"📍 In Ikeja, Lagos · confirmed by their device (and network)" on the profile, in member lists, and as "📍 Ikeja" on posts, to everyone who
sees the profile. It lasts 90 days, can be checked at most 5 times a day, and "Remove"
deletes it. Like the local-government badge of the game (docs/LOCATION.md) it can be faked by someone who fakes their phone's
location; the network word makes that harder from abroad, not impossible.

**Locals only.** A community based on a real place can be kept for people whose badge is in its **area** (`lga`: a community of a real
city that named one of the city's local governments when it started, `place.lga`, chosen in the Start form from the city's own list), its
**city**, its **state** or its **country** (`CrewRecord.locals`; chosen when it starts, or by the founder later with
`POST /api/feed/crews/locals`, `all` to open it again). An area needs a badge with that same local government: a badge of the city alone
is not enough. The founder needs a qualifying badge to set it. Joining without one is refused with how to get it; members who joined before
stay. The badge is checked when someone joins, not afterwards.

## Near you

The feed's first tab, and where it opens for a person with a location badge (the owner's decision: Near you is the default; without a
badge it opens on Friends). `GET /api/feed/list?tab=near`:

- **With a badge**: the public and city posts of the badge's city and the world's public posts, ranked as My city is, times `NEAR.lga`
  (x3) when the author's badge has the viewer's local government, or `NEAR.city` (x1.6) when it is in the viewer's city (or the post was
  made there). So neighbours come first, then the rest of the city, then the world, and a fresh post from far away can still rise.
- **Without one**: exactly My city, and the app shows one line: "Get the location badge in My profile to see the people near you first."
- **The line at the top** (`FeedPage.near`, first page only): "214 people confirmed in Ikeja this month · 1,200 in Lagos". Counts only:
  the feed root keeps `here = { m: '2026-10', n: { lagos: 1200, 'lagos/ikeja': 214 } }`, updated by `POST /api/feed/located` (a person
  counts once a month, where their badge is now: checking again does not add, moving takes them from the old place, "Remove" and erasure
  take them off) and started again from nothing when the month changes. No list of who, no map, no distance.
- **Plans and Work** (`GET /api/feed/events`, `GET /api/feed/gigs`) list near things first in the same reads: events hosted by someone with
  a badge in the viewer's local government (or at a place whose name has the local government's name), then the viewer's badge city,
  soonest first within each; gigs the same way, newest first within each. Nothing is filtered out.

The privacy rule is the badge's: the position never leaves the phone; what is stored is a local-government id the player chose to show,
as the residence badge (docs/LOCATION.md) already does.

## First minute

What a player sees right after Play (`src/app/features/firstminute/`, Phase 6 of `docs/AD-READY-PLAN.md`): one strip at the top of the
bottom stack, in the 3D world and in Lite, once per session (`allworld-first-minute` in session storage), put away with ×. It shows up to
three things of Near you (`GET /api/feed/list?tab=near`, an event first), how many other people are in this room, place or street now
(the room's own count, else the place's or the venue's listing), and **one** next action, the first of these that exists
(`nextAction` in `firstMinuteModel.ts`, tested in `firstMinuteModel.test.ts`):

1. someone else is here and the room has a chat: **Say hello** opens the room's chat;
2. a person with a badge in your local government posted: **Say hello** opens that post to reply;
3. an open community of your area (then of your badge city, or your city) that you are not in and may join: **Join <community>**;
4. a person of your city posted: **Say hello** on that post;
5. you can walk now: **Walk to the Square**; otherwise **Say hello** opens Near you to write the first post.

Nothing is counted here: a reply, a post, a join and a walk are already activation on the server. The strip's code and its two reads are a
chunk of their own, fetched once the scene is up (`startExtras.ts`) and shown when the game is connected, the creator is done and nothing
is in front; the first download does not grow.

**A new player** (the walkthrough would have started by itself) gets the strip instead of the walkthrough, with "Show me around" for
the tour on request (`TourDecider.vue` hands its turn over; Phone → Help and ? still start it). The Ready step of the creator says what
comes next. **On a return visit** a player with a location badge finds Feed first in the Phone's dock (it opens on Near you); the device
keeps only yes or no for that (`allworld-badge-v1`, `src/app/features/feed/badgeMark.ts`), set by each feed read of the profile.
