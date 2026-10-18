# Allworld as a social platform: research and phased plan

18 October 2026. Written for the owner and for the agents who will build it. Work record: `docs/agent-work/social-platform-plan-20261018.md`.
Companion pages that already describe parts of the social system: [FRIENDSHIP.md](FRIENDSHIP.md), [MESSAGES.md](MESSAGES.md),
[CALLS.md](CALLS.md), [PLACES.md](PLACES.md), [CHAT-PICTURES.md](CHAT-PICTURES.md), [GIST.md](GIST.md), [SHARE-CARDS.md](SHARE-CARDS.md),
[POLITICS.md](POLITICS.md), [AGENTS.md](AGENTS.md), and the retention research in
[agent-plans/world-alive/FEATURES.md](agent-plans/world-alive/FEATURES.md).

The brief: make Allworld social the way LinkedIn, Instagram and TikTok are social, inside a 3D world, and let a person who never
opens the 3D world use all of it anyway. Missions, gameplay and performance are other agents' work and are not planned here.

## 1. Where we are (live data, 5 to 18 October)

Read on 18 October from the operator metrics (aggregates only; the admin dashboard shows the same).

| Measure | Value | What it says |
| --- | --- | --- |
| New lives in 14 days | 174 (40, 44 and 30 on the three launch days, then 0 to 14 a day) | No organic loop. Arrivals stop when posting stops. |
| Day-1 return, launch cohorts | 24% and 22% | Normal for a game, not for a social app. |
| Day-7 return, launch cohorts | 10% and 4% | People do not have a reason to come back. |
| Lives that made a friend in their first two days | 0 of 189 followed | **The graph is empty.** Nobody has anyone here. |
| Calls placed | 0 | Calls work; there is nobody to call. |
| People who played at a table | 22 | The one shared activity reaches an eighth of players. |
| Share links made / opened / referral linked / welcomed | 52 / 31 / 6 / 1 | Sharing is tried; almost nobody it reaches stays. |
| Landings whose browser has no WebGL | 76 (against 192 onboarded) | Roughly a quarter to a third of arrivals cannot see the 3D world at all. |
| Push opt-ins / comeback e-mails sent | 6 / 106 | Return channels exist and are almost unused. |
| AI residents / agent characters | about 30 / 1 | The agents are the only people reliably "in" the world. |

Two conclusions drive everything below.

1. **Allworld has identity and places but no graph, no content and no distribution.** A social network is five things: an
   identity people recognise, a graph of relations, content people make, a way content reaches people (feed, presence,
   notification), and a reason to return daily. Allworld has a rich identity (a character, a passport of accomplishments, a
   home, a job, a city) and rich places (venues, homes, the Square, group rooms), but nothing a player publishes, no follow
   relation, no feed, and a first session that ends alone.
2. **A third of arrivals never see the world.** Whatever we build must work as a phone-shaped web app first and a 3D world
   second. This is also what the outside evidence says: Meta moved Horizon to mobile for product-market fit; Zepeto's growth
   surface was its 2D feed and photo booth, not its rooms; Rec Room, which bet on every device running the 3D client, shut
   down in June 2026.

## 2. What the inventory found (what exists, what does not)

Built and reusable (file paths in [research/social-platform-2026-10-18/inventory.md](research/social-platform-2026-10-18/inventory.md) and the linked docs):

- Mutual friends (200 cap), blocks (200), reports with reasons, operator mutes, text filter that strips links and contacts.
- Direct and group messages (12 per group, 20 groups, 200 messages per thread), reactions, replies, mentions, voice notes
  (60 s), pictures (friends only, off by default), gifts and money requests in game naira, group spray packets.
- One-to-one voice calls with relay; room voice circles of 8 by proximity; "ping: I am here, come" for friends.
- Presence (online, away, offline), friends' live location on the map, who is in the venue, the online pill with a people/AI split.
- Places: the Square (one room for the whole world), a 3D room per group with a 24-hour guest link, home visits with knock,
  invite and house link, owambe parties with MC, DJ and spraying.
- Public profile `/p/<id>` (server-rendered HTML, no script): name, Human or Agent, counts, badges, accomplishment history.
- Share cards `/s/<code>` with Open Graph previews for WhatsApp, X and Telegram; QR; referral rewards; utm attribution.
- The Gist: a system-written public ledger of what happened in each city (200 lines per city, 14 days), each line shareable;
  a weekly episode page per city.
- Communities: clans (25, code or link to join, their own venue and leagues), families (four slots), Bae, political parties,
  elections, neighbours directory, campus, festivals calendar, tables (Whot, Ayo, chess, penalty, weave), arena with spectators.
- Agents: MCP endpoint for any AI to play, AI-played mark everywhere, about 30 residents with routines and bonds, house agents,
  agents as services (quiz, guide, shop, translate, games, help), the companion Lumo.
- Growth: double opt-in e-mail, web push, comeback mail, message push, announcements; the admin dashboard with funnel,
  cohorts and return split by source, by friend, by clan and by talked-to-an-agent.
- The phone UI already holds about 51 apps, of which about 24 are social. It is the natural 2D client.

Does not exist: posts, status, photos outside chat, comments, any follow or one-way relation, profile bio or portrait,
contact import or handles, persistent venue chat, player-created events, public groups or discovery, a no-WebGL playable mode,
server-verified age, real-money anything.

## 3. What the outside evidence says

Full briefs are summarised in section 9; the lessons that bind the plan:

- **Friends decide retention; the first days decide friends.** Facebook's "7 friends in 10 days" was a correlation turned
  into a target, and Roblox's own filing names friends inviting friends as its engine (6.8 billion friendships formed in 2023).
  A study of 51,104 players found friend count the best predictor of staying. Our number is zero.
- **Empty worlds kill.** Meta's internal memo: about 9% of Horizon worlds ever reached 50 visitors, most visitors never
  returned. Concentrate people, show who is where before asking anyone to go there, and let AI residents keep rooms warm.
- **The shareable artefact is the strongest cheap loop.** Wordle's grid took it from 90 to 2 million players; Spotify Wrapped
  had 200 million people engage on its first day in 2025; Zepeto's visibility on TikTok and Instagram came from its photo booth.
  A 3D world can render a card or clip for free, and the card works for someone with no 3D.
- **Small circles join; global graphs do not.** Locket caps friends at 20, Yope reported 70 to 80% of users arriving by
  invite and 40% day-7 return; Discord is 32 million servers, 90% under 15 members; Strava clubs quadrupled to a million.
  VRChat added Groups and "Mutuals" years after launch because instances alone did not carry community.
- **Game-made media travels.** Roblox clips drew 13 billion and Fortnite 11 billion TikTok views in 2024. Skits and music
  challenges dominate Nigerian TikTok. Nothing is cheaper to make than a moment the world already produced.
- **One-trick loops die.** BeReal's timing window, Clubhouse's invite scarcity, Gas's school polls, Ayoba's zero-rated data:
  each spiked and fell. Build on durable units (a crew, a place, a profile) and treat rituals as features.
- **Nigeria is WhatsApp, Android and data-priced.** WhatsApp is on about 95% of Nigerian smartphones, Android is 83% of mobile
  web, 1 GB costs about ₦800 and median age is 18. TikTok ad reach (48 million) and Snapchat (23 million, growing) outrank
  Instagram (10 million, shrinking). Everything should share to WhatsApp Status and groups and show its download size.
- **Safety can end the company.** Habbo lost its investors after a chat investigation; Bondee lost 85% of downloads in a
  month on a data rumour. Teen defaults (private, no stranger DMs), a report button with a recorded response time, and a
  published data practice come before growth marketing.

## 4. First principles: what Allworld can be that nobody else is

LinkedIn is a graph of *work*. Instagram is a graph of *faces*. TikTok is a graph of *interests* with no friends needed. Snap
Map and BeReal are *presence*. Discord is *rooms*. None of them has a **place and a clock**. Allworld does: every person is
somewhere, at some time, in a world that keeps happening while they are away, with AI residents who remember them. That is the
primitive to build the network on.

**The organising idea: a post is a place.** On Instagram a post belongs to a person. In Allworld a post belongs to a person
*and a spot in the world*: the stall where it was taken, the Square at 9 pm, the street you live on. Walk past the spot in
3D and the post is there. Open the Lite app and the same post is on the map and in the feed. Replies pile up at the spot, so
spots become hangouts and hangouts become places people meet. This gives a stranger with zero friends a feed that is never
empty (their city today, the world today), gives the 3D world a reason to be visited (things left there by people), and gives
a non-3D user a complete product (feed, map, chat, calls, profile) that is the same data.

Eight consequences:

1. **The world writes half your posts.** Every public thing the Gist already records (you were elected, won at Whot, opened a
   shop, moved to Abuja, got married) becomes a draft post with a rendered card; one tap publishes it with your caption. Zero
   production cost, and the feed is alive from day one because the AI residents' public acts are drafted the same way and
   published under their AI-played mark.
2. **Your character is your face.** The avatar renders to a portrait, a sticker and a share card; it is the profile picture on
   `/p/`, in chat and on a WhatsApp Status. Snap's Bitmoji reaches 200 million people a day without a 3D client; the same
   avatar standing in a room is the 3D version of the same identity.
3. **Presence is content.** "Ada is in the Square with 11 people" is a feed item you can tap to join, by walking in or by
   joining the voice circle from the Lite app. The Square, group rooms and parties are live posts, not hidden rooms.
4. **Crews, not followers, first.** The unit of joining is a crew of 2 to 20 (a group chat with a wall, a room, a widget-like
   card on the phone's home screen, a private feed). Follow is added later for public figures: governors, shop owners,
   residents, creators.
5. **Work is already here.** The sim already knows your job, shifts worked, businesses, titles, skills, deliveries and the
   thanks you received. A work profile is a view, not a new system; gigs between people and agents are the LinkedIn layer.
6. **Agents are the warm bodies.** Residents host the Square when it is empty, DM you back, comment on your posts (labelled),
   and a personal assistant agent can answer friends while you are away and draft your weekly recap. Agents lead people to
   people; the research warns against agents replacing them.
7. **Events are the invitation that converts.** A player-made event at a place and time with a plain RSVP page that previews
   in WhatsApp (Partiful's loop) is the thing a Nigerian friend group will actually forward.
8. **The same object everywhere.** One post, one profile, one event, one room: rendered as a card in Lite, as a board or
   crowd in 3D, as a static HTML page for a crawler. Never two products.

### Lite: Allworld without 3D

Lite is the phone UI mounted full screen in the browser with no engine, at `/app` (and automatically for a browser without
WebGL or on the data saver). It has: Home feed (Friends, My city, World), Map (2D, friends' pins, live rooms, posts as pins),
Messages and calls, People (here now first, one tap to talk), Profile and post composer, Events, Gist, Work. A "Step in"
button on any place, post or person opens the 3D world at that spot for a browser that can. Nothing in Lite is a lesser copy:
feed, chat, calls, voice circles, events and profiles are the same routes and sockets the 3D client uses. Walking, driving,
venues as 3D scenes, homes and furniture stay 3D only; a Lite user still has a home, a job and money through the existing
phone apps, as the life sim already runs without rendering.

## 5. The plan in phases

Order follows the data: first make a newcomer meet people, then give everyone a face and a non-3D door, then content, then
graph growth, then events, work, agents and media. Each phase is shippable and measured on its own. "Paths" are the files an
implementer should register in their work record before writing; most new files sit beside the modules they extend. Effort is
in focused agent-days and assumes the integration owner's existing gates (tests, scripted upgrade check, short smoke).

### Phase 0: Stop people arriving alone (1 week)

Goal: a new life's first ten minutes contain another person or a resident, and the first friend is measured.

- **Land where people are.** When the world has anyone online (people or residents), a new life's first stop after
  character creation is the Square (or the busiest open venue), not an empty street. The Square's scene gets a few residents
  on a schedule so it is never empty (world-alive programme owns resident behaviour; this phase only asks for a "host the
  Square" routine). `src/quick-start/entry.ts`, `src/app/features/start/`, `server/residents/` (coordinate with AGENT.md).
- **One tap to talk.** From any name tag, people list or online sheet: Say hi (room chat line), Call, Add. Already partly
  there; make it one tap and the same everywhere (`OnlineSheet.vue`, `PlayerCard.vue`, `src/app/features/hud/`).
- **Measure the graph.** Funnel steps `first-friend`, `first-message`, `first-voice`, `first-post` in `server/growth/metrics.ts`;
  a "friends per life at day 1, 7" row on the dashboard; a North Star tile: lives with 3 or more friends by day 7.
- **No-WebGL door.** Until Lite ships, a browser without WebGL lands on a static page that explains, offers the profile and
  invite link, and collects an e-mail or push for "when the light version opens" (`src/app/features/landing/`).
- Effort: 4 to 6 agent-days. Gate: first-friend rate measured; Square never empty while anyone is online.

### Phase 1: A face and a handle (2 weeks)

Goal: a profile someone would put in their WhatsApp bio.

- **Profile 2.0** on `/p/<id>` and in the app: `@handle` (unique, filtered, 3 to 20 characters, changeable once a month),
  portrait, one-line bio (80 characters, filtered), status line with a place ("in Yaba, open to Whot"), places lived, friends
  and crews count, the existing accomplishments, and (from Phase 3) posts. Open Graph tags so the link previews with the
  portrait. `/p/@handle` resolves. `server/public-profile*.ts`, `server/routes/profiles.ts`, `src/app/features/social/PublicProfile.vue`,
  new `server/social/handles.ts`.
- **Avatar portrait and sticker.** The client renders the character to PNG (head and shoulders, full body, three poses) with
  the existing renderer off screen; uploaded through the image store pattern of `server/social/images.ts` to a new public
  `portraits` table (one current portrait per player, 60 kB cap, replaced not appended). Stickers for chat and WhatsApp
  (WebP, transparent). New `src/app/features/avatar/portrait.ts`, `server/social/portraits.ts`.
- **Share card v2.** Every share kind gets the portrait and the Lite link; a "my card" share from the profile.
  `server/growth/share.ts`, `src/game/share-model.ts`.
- **Search by handle**, and the person card shows mutual friends and shared crews (`server/social/pages.ts` pattern).
- Effort: 8 to 10 agent-days. Gate: share.opened to new-life conversion measured per card kind; handle collisions and filter
  tests; portrait render under 2 s on a mid Android.

### Phase 2: Lite, the app without the world (3 weeks)

Goal: everything social works in a browser with no WebGL and under 1 MB first download; the 3D world becomes "Step in".

- **Engine-less bootstrap** at `/app`: mounts `PhoneDevice.vue` full screen with a Lite shell (bottom tabs: Home, Map, Messages,
  People, Me). Reuses the registered phone panels; the engine chunk is never requested. Automatic for no-WebGL, data saver
  and the `?lite` flag; a setting to prefer it. `src/lite/` (new), `src/app/features/phone/`, `vite.config.ts` chunk rule
  (coordinate with the integration owner: first-paint budget still applies to Lite).
- **2D map** (the existing world map and city outlines, no 3D tiles): friends' pins from the live socket, live rooms with
  headcounts, home pins, later posts. `src/map3d/geo/friends.ts` is the data; a new `src/lite/LiteMap.vue`.
- **Voice from Lite.** Join a room's voice circle without rendering the room: the room socket `join` with a `lite: true`
  flag places the person at the room's centre for proximity; the Square shows them as a standing figure to 3D users.
  `server/ws/rooms.ts`, `src/community.ts`.
- **Calls, messages, pictures, people, gist, events, profile** already work inside the phone; test and fix each panel for a
  full-screen width (the phone layout is portrait; add a tablet two-column layout).
- **PWA**: add caching for the Lite shell to `public/sw.js` so repeat opens are instant; install prompt after a good moment.
- Effort: 12 to 15 agent-days. Gate: Lite passes the social component checks; a session on a no-WebGL browser can add a
  friend, chat, call and join Square voice; first download measured and under budget.

### Phase 3: Posts, and the feed that is never empty (4 weeks)

Goal: people publish, strangers see a living world, and every post has a place.

- **Post model.** New `posts` collection or Worker table, never inside `social`: `{ id, author, at, place: { city, venue?,
  spot? }, kind: text | photo | moment | event | live, body (500 chars, filtered), media?: { id, w, h }, vis: public | friends |
  crew:<id> | city, rx: counts, replies: count, gone? }`. Replies are a capped thread row per post (200, the conversation
  shape). Cursor paging from `server/social/pages.ts`. New `server/posts/` (service, routes `/api/posts/*`, moderation hooks),
  `src/types/posts.ts`, `src/app/features/feed/`.
- **Three feeds, one ranking.** Friends (chronological), My city (posts, live rooms, gist, events in that city, ranked by
  recency and replies), World (public posts and the gist of every city, light ranking: nearness in time, replies, friends-of-
  friends, language). No machine learning at first; the ranking is a scored list of a few hundred candidates.
- **Moments: the world drafts your post.** Every gist line about you (election, win, shop, wedding, move, title) becomes a
  draft with its share card attached; one tap publishes. Residents' public acts are published the same way under their mark,
  rate limited (a few a day per resident) so the feed is seeded without drowning people. `server/gist/ledger.ts` emits a
  hook; `server/posts/moments.ts`.
- **Photos.** The existing capture feature gains Post (it never uploaded; now it can, with the same re-encode, 250 kB,
  metadata stripped). Public pictures need the owner's decision on scanning (CHAT-PICTURES.md item 1); until then photos are
  friends-and-crew visibility only, public photos need a trust tier (phone-checked) and two reports hide them.
- **Posts in 3D.** A post with a place is a small board at that venue's entrance or the spot where it was taken; the newest
  few are drawn, tap to open the thread. Replies left in 3D are the same thread. `src/game/` scene hook, coordinate with the
  graphics owner for the board asset; keep the data in `src/app/features/feed/`.
- **Reactions and replies** reuse the message emoji set and the mention rules. Report on every post and reply; a post with
  two reports from different people hides until an operator looks (`/api/mod/content`).
- **Minors**: posts friends-only by default, no public photos, no replies from strangers, not named in moments (the gist
  already does not name them). Adults: public by default, changeable per post.
- **Notifications**: reply, reaction and mention lines in Updates; message push rules apply (only if unseen after a delay).
- Effort: 18 to 22 agent-days. Gate: posting from Lite and 3D; feed under 150 ms per page on the Worker; moderation route
  and tests; first-post funnel measured; the ranking is explained on one page (`docs/FEED.md`).

### Phase 4: Growing the graph (3 weeks)

Goal: a newcomer has three real connections within a week, and existing people bring their people.

- **Crews.** A group chat becomes a crew when its members say so: a name, a colour, a wall (crew-visibility posts), its room,
  a crew card on the phone's home screen showing the latest crew photo (Locket's widget), one join link with a preview page
  `/c/<code>` that lands a stranger inside the crew's room as a guest and makes joining one tap. Cap 20 members (the group
  cap rises from 12 for crews only; one row per crew stays under the row limit because the wall lives in `posts`).
  `server/social/service.ts` (group fields, additive), `server/social/places.ts`, new `src/app/features/crews/`.
- **Follow.** One-way follow for public figures only at first: office holders, shop owners, residents, players who opted in
  as creators (adult, phone-checked). Followers see their public posts in Friends; no follower counts shown under 100.
  `server/social/follow.ts`, additive fields.
- **People you may know.** Mutual friends, same crew, same table or voice circle in the last week, same city and street,
  came through the same invite link; never device contacts without an explicit opt-in. Shown as a card in People and after
  the first session. `server/social/suggest.ts`.
- **Friend code and nearby.** A 6-character code and QR on the profile; "Nearby" is the existing room presence, not GPS.
- **WhatsApp-first sharing.** Share to Status (image sized 1080 by 1920 with the Lite link in the caption), share to a group,
  invite that lands in your crew room or beside you in the Square, and the invited person's first screen shows who invited
  them and offers the friendship in one tap. `src/app/features/share/`, `server/growth/referral.ts` (welcome step).
- **Contact import** only as an opt-in that hashes phone numbers on the device and matches against players who also opted in;
  needs NDPA review first. Ship behind a flag, off.
- Effort: 14 to 18 agent-days. Gate: friends per life at day 7 rises; crew join conversion from `/c/` links measured;
  suggestions precision checked by hand on the first hundred.

### Phase 5: Events and live (2 weeks)

Goal: the invitation people forward.

- **Player-made events** at a place and a time: a title, cover (share card), host, guests, RSVP page `/ev/<code>` with Open
  Graph preview and Add to calendar, reminders by push and mail at opt-in, the event as a post in My city, and the room or
  venue decorated for it (parties in homes already have MC, DJ and spray). Co-hosts; capacity; a guest becomes a host of
  the next one in one tap. `server/events/`, `src/app/features/events/` (extend the festivals app).
- **Live rooms in the feed.** The Square, group rooms, parties and tables with people in them appear as live cards with a
  headcount and the portraits of friends inside; Join from Lite goes to voice, Step in goes to 3D.
- **Watch parties and match nights** (FEATURES.md #12): a scheduled room at the fixture time, text and voice only, no broadcast.
- Effort: 8 to 10 agent-days. Gate: an event made in Lite, shared to WhatsApp, joined from the preview by a new life.

### Phase 6: Work and services, the LinkedIn layer (3 weeks)

Goal: a profile that shows what you can do and a way to be hired, by people and by agents.

- **Work profile** tab on `/p/`: current job and employer, shifts worked, businesses owned (with the showcase photos),
  titles and skills the sim already tracks, deliveries completed, thanks received, agent services offered. Everything is
  verified by the sim, so there is nothing to type and nothing to fake. `server/public-profile.ts`, `src/app/features/passport/`.
- **Gigs.** A board per city: a person or an agent posts a gig (game naira, the existing transfer limits and the agent
  money rules apply: an agent may pay, never ask), applicants, acceptance, delivery, a review from each side (1 to 5 and 60
  characters, filtered). Reviews feed the work profile. `server/gigs/`, `src/app/features/gigs/`. Adults and phone-checked
  for posting; anyone may apply.
- **Vouches.** A friend can vouch for one skill, once; shown as "vouched by 4 people". No scores, no endorsements market.
- **Agent services directory** promoted into Work and the city feed; a service can be booked for a time in a room.
- Effort: 12 to 14 agent-days. Gate: gigs completed with reviews; money rules unchanged and tested.

### Phase 7: Agents as the social fabric (3 weeks, with the world-alive owner)

Goal: nobody is ever alone, and agents lead people to people.

- **Residents you can keep in touch with.** Residents get a stored social record so they can be friends, be messaged and
  reply (within the companion's budget and rules), and appear in People under their mark. Today only claimed agent
  characters can. `server/residents/`, `server/social/service.ts`.
- **Residents post and reply** in the feed (moments from their acts, a comment on your post when it is about their city or
  a shared event), capped per day and always marked.
- **Hosts for empty rooms.** A resident on duty in the Square and in any public venue with fewer than 3 people, with a
  routine (greet, introduce two people, start a table).
- **Your assistant.** An opt-in personal agent that answers friends' messages while you are away ("Ada is at work until 6,
  want me to tell her?"), drafts your weekly recap post, and reminds you of events; never spends money or accepts friends.
- **Introductions at scale.** The existing regular-introduces-two-players rule becomes a resident's job across venues.
- Effort: 12 to 15 agent-days plus model budget review (US$2 a day cap stands). Gate: talked-to-an-agent return split rises
  without the agent-replaces-friends pattern (friend count also rises).

### Phase 8: Clips, recaps and the creator layer (3 to 4 weeks)

Goal: the media that travels to TikTok, Snapchat and WhatsApp and brings people in.

- **Clips.** Record the 3D canvas for up to 15 s (MediaRecorder, WebM, muted or room voice with everyone's consent as the
  capture feature already requires), trimmed on device, uploaded (4 MB cap) as a post; a Lite viewer plays it. Vertical
  export with the Allworld watermark and the Lite link for TikTok and Status.
- **Weekly recap.** "Your week in Allworld" card and short clip from your gist lines, posts and places, Wrapped-style, every
  Sunday with the episode page; the city's week the same.
- **Sticker packs** from your avatar for WhatsApp (FEATURES.md #15).
- **Creator programme**: owner decision; needs payouts and moderation. Plan only: a share of cosmetic sales for player-made
  furniture and clothes, published terms, the Second Life and Roblox figures as the reference.
- Effort: 15 to 20 agent-days. Gate: clip posts measured by outside opens; storage cost per clip under the owner's ceiling.

### Across all phases

- **Safety pack before Phase 3 goes live**: teen defaults (private, no stranger DMs, no public photos, no live), a report
  button on every object with a recorded 48-hour target and an operator inbox view, a published data page, Nigerian counsel
  on NDPA registration and the NITDA platform code, and a UK and EU risk-assessment note before marketing there.
- **Storage**: posts, replies, portraits, events and gigs each get their own collection or table and cursor paging; nothing
  new is written into `social`. Row cost and budgets are recorded per phase in the work record.
- **Measurement**: every phase adds its funnel steps and a return split (by posted, by crew, by event) in
  `server/growth/metrics.ts`, and the dashboard shows friends per life and the North Star.
- **Copy**: lead with the world and people together (the standing rule), never "life sim". Everything is game naira.
- **Owner decisions needed** (none blocks Phase 0 to 2): public pictures without automatic scanning; moderation staffing;
  handles and name changes; opt-in contact import; creators and payouts; whether residents may initiate messages.

### Effort and order at a glance

| Phase | Weeks | Depends on | North Star effect |
| --- | --- | --- | --- |
| 0 Not alone | 1 | residents hosting routine | first-friend rate exists and moves |
| 1 Face and handle | 2 | 0 | share links convert |
| 2 Lite | 3 | 1 | the no-WebGL third can use the product |
| 3 Posts and feed | 4 | 1, 2 | a reason to open daily |
| 4 Graph growth | 3 | 3 | 3 friends by day 7 |
| 5 Events and live | 2 | 3, 4 | invitations that convert |
| 6 Work and gigs | 3 | 1, 3 | adult and diaspora reason to stay |
| 7 Agents as fabric | 3 | 3, world-alive | nobody alone, rooms never empty |
| 8 Clips and recaps | 3 to 4 | 3 | outside reach |

About 24 weeks of single-agent work; Phases 1 and 2, 5 and 6, and 7 and 8 can run in parallel with separate owners.

## 6. Ideas held back (and why)

- **Graph-free video feed as the front door** (TikTok): needs a volume of clips and a ranking we do not have; Phase 8 earns it.
- **Live video**: cost and moderation; voice circles and watch parties cover the need.
- **Anonymous polls and compliments** (Gas, NGL): died within a year and invite harm among teens.
- **Real-money tips or payments between players**: owner decision, regulatory weight; game naira everywhere until then.
- **GPS or real location**: never; the world's places are the location layer (docs/LOCATION.md).
- **Streak and guilt mechanics**: the research is clear they raise the wish to quit.

## 7. How to pick this up

An implementer takes one phase, registers a work record naming the paths above, reads the linked design docs for the module
they extend, and adds a `docs/<FEATURE>.md` page in the style of MESSAGES.md when the phase ships. The integration owner
keeps the first-paint budget and the deploy gates. Phase 0 can start now.

## 8. Sources used

Live operator metrics of 18 October 2026 (aggregates); the codebase inventory of the same day; the retention desk research of 14
October (FEATURES.md); and two outside briefs run on 18 October whose main sources are: Roblox 10-K 2025 and Q3 2025 call; Meta
Horizon memos as reported by the Wall Street Journal and TechCrunch (March 2026); UploadVR on Rec Room's closure (June 2026);
Bloomberg on Bondee (April 2023); Appfigures on Clubhouse (2022); KED and Daum on Zepeto; TechCrunch on Locket (2022, 2025), Yope
(2025), BeReal, Partiful and Strava (2025); Sacra on Discord; TechCrunch on Wordle and Spotify Wrapped 2025; Statista on video-game
TikTok views 2024; DataReportal Digital 2026 Nigeria; StatCounter Nigeria; TechCabal on Ayoba (March 2026); Meta and TechCrunch
on Instagram teen accounts (2024 to 2025); Reed Smith and RPC on the UK Online Safety Act; DLA Piper and ALN on the NDPA and GAID
2025; Mondaq on the NITDA platform code. Unverified claims were dropped or marked in the briefs. The briefs, the inventory and the metrics table are kept in
[docs/research/social-platform-2026-10-18/](research/social-platform-2026-10-18/README.md).
