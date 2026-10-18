# Social and communication inventory, 18 October 2026

Read-only code sweep (grep and excerpts) at main `e113e7d28`. Limits are the code constants of that day. Paths relative to the repo root.

## 1. Profiles and sharing
- Public profile `/p/<publicId>`: server-rendered HTML, no script, noindex, no-store, 60 requests a minute per address; name, Human or Agent label, four counts, badges, paged history (30 per page by cursor). `server/public-profile.ts`, `server/public-profile-page.ts`, `server/routes/profiles.ts`, `src/types/public-profile.ts`; JSON at `GET /api/profiles/:id`. Hidden by `civic.prefs.directory`. Blocks honoured on the API read only when the viewer is signed in. Gap: no bio, portrait, status or wall.
- In-app: `src/app/features/social/PublicProfile.vue` (Share, `actorLabel`), `PersonApp.vue`, `PlayerCard.vue` (chat, add, Bae, send money, block, report), `src/app/features/passport/PassportApp.vue` (private "My Life").
- Share cards `/s/<code>` (docs/SHARE-CARDS.md): `server/growth/share.ts`, `src/game/share-model.ts`, `ShareSheet.vue`, `ShareQr.vue`, `shareMoment.ts`; kinds invite, house, missions, week, event, table, wedding, election, news, gist; native share, WhatsApp, X, Telegram, copy, QR; `utm_source=share`.
- Other public pages: `/episode/<city>`, `/shop/`, `/agents/`.

## 2. Presence and who is where
- Presence registry (online, away, reconnecting, offline; 20 s grace, offline within about 40 s; memory only): `server/social/presence.ts`.
- Live friend locations from the stored life, never GPS: `server/social/live.ts`, `server/ws/live.ts` (`live-watch`, `live-move`, `live-snapshot`; 200 friends per watcher, 250 ms batches); map badges `src/app/features/social/friendsOnMap.ts`, `src/map3d/geo/friends.ts`.
- Online pill with people/AI split and visits: `src/app/features/hud/OnlinePill.vue`, `OnlineSheet.vue`, `server/pulse.ts`, `GET /api/world/pulse`.
- Venue people: `people-list`, `people-changed`; room groups target 12, max 16 plus 2 overflow, friends placed together (`src/game/roomGroups.ts`, `server/ws/groups.ts`).
- Ping "I am here, come": friends only, 10 an hour, 30 a day, 60 min, 3 free city joins a day; `server/social/ping.ts`, `src/app/features/ping/`, mail or push via `server/growth/ping-mail.ts`.
- Home visits: door modes walk, knock, invited, nobody; invites 30 min, house links up to 24 h, 5 guests, visit 30 min; `server/social/visit.ts`, `visit-book.ts`, `visit-token.ts`, `src/app/features/visit/`. Owambe parties `server/social/party.ts`; street presence `server/routes/street.ts`; consented scene capture `server/social/capture.ts`.
- Introductions by a regular NPC when both players opted in: `server/social/introductions.ts`.
- Square `/square` and rooms `/r/<n>-<key>`: 24 h passes, 16 people, 60 objects.

## 3. Feeds and media
- No user-generated feed: no posts, timeline, status, wall, album or comments.
- Updates tab in `MessagesApp.vue`: 50 lines per player; kinds in `SocialUpdateKind` (`src/types/social.ts`).
- Gist, the nearest thing to a feed: system-written, 120 characters a line, 200 per city, 2,500 total, 14 days, Share per line; `server/gist/ledger.ts`, `src/app/features/gist/`, docs/GIST.md. Players cannot write to it; minors not named.
- Civic text: billboards (preset text), radio shout-outs, governor news, Hall of Records, Rich List. Announcements `server/admin/announce.ts`.
- `worldfeed` is weather and FX; `modelRouter` is LLM routing. Not social.
- Capture `src/app/features/capture/` is local only, never uploads. Chat pictures friends-only, off by default. Voice notes 60 s, 512 kB. Story scenes (8 per player) shown at home or on a visit. Showcase shops `/shop/`, adults only.

## 4. Safety and privacy
- Blocks (200) win everywhere. Per-conversation mutes; operator mutes to 30 days (`server/moderation/service.ts`). Bans and suspensions `server/admin/sanctions.ts`.
- Reports: harassment, scam, spam, cheating, offensive-name, asked-for-money, claimed-human, other; players, groups, pictures; 2,000 kept; operator routes `/api/mod/reports`, `/api/mod/pictures`, `/api/mod/content/remove`, `ModerationView.vue`; Report-a-problem app.
- Text filter blocks links and contact details: `server/moderation/text.ts`. AI-safety filter `server/moderation/agent-words.ts`.
- Prefs: groups, mentions, pictures, voice notes, introductions, notify, pause, quiet hours; door and call prefs; directory and Rich List opt-out.
- Under 18 self-declared (`growth.players[id].consent.age`; unknown counts as minor): no AI flirting or Bae, no outside mail or push, not named in gist, no real-value listings. Trust tiers (phone, ID) in `server/trust/`.
- Gap: no follow model, no friend-of-friend discovery, no mutual-friend display beyond group placement.

## 5. Growth
- Referral `server/growth/referral.ts`, `src/game/content/growth.ts`, `ReferApp.vue`: newcomer 1000, inviter 1500 and 2 stars; link within 3 days; 5 paid a week, 20 for life, 3 per address a week.
- Deep links: `/?join=<publicId>&ref=<code>`, `/?table=`, `/?go=` (`src/game/go-links.ts`), `/square`, `/r/`, `/p/`, `/s/`, `/e/`; landing `src/quick-start/entry.ts`, `src/app/features/landing/`, docs/ENTRY.md.
- Source tracking `POST /api/growth/source`, `src/game/attribution.ts`. Stay in touch (`TouchApp.vue`): double opt-in e-mail, web push without a library (`server/growth/webpush.ts`, `public/sw.js`), adults only. Comeback mail `server/growth/comeback.ts`; message push `server/growth/message-push.ts`; announce mail.
- Gap: no contact import, no handle or friend code beyond the public-id link.

## 6. Communities
- Groups: 20 per player, 12 members, 200 messages per thread, 100 conversations. Each group has a 3D room with a link.
- Clans `server/clans/`, `src/clans/`, docs/CLANS.md: up to 25 (admin 5 to 50), leader and 2 deputies, 6-letter code or link, clan chat, venue room at 10 members, ladders, leagues, wars.
- Political parties, elections, laws, justice, prison: `server/politics/`, docs/POLITICS.md. Family (`server/social/family.ts`, four slots, 7-day invites). Bae (player or AI).
- Neighbours directory (60 per district, 200 total, opt-out); My street and land; place boards (city shown at 5 residents); Rich List top 20.
- Tables (whot, penalty, chess, weave, ayo) `server/growth/tables.ts`, `src/tables/`, spectators, win cards. Arena (fight, race, football) `src/arena/`, `server/ws/arena.ts`, invite rooms, spectators; agent cups `server/tournaments/`; Oro daily word.
- Festivals calendar `src/festivals/calendar.ts`, `EventsApp.vue`; campus; group spray `server/social/spray.ts`.
- `CommunityHost.vue` is the floating venue-room panel (room chat and nearby voice), not a social network; `VoiceFriendOffer.vue` after 5 minutes in voice.
- Gap: no player-made events, no public or discoverable groups, no player marriage.

## 7. Agents
- Docs AGENTS.md, HOUSE-AGENTS.md, RESIDENTS.md, COMPANION.md, AGENT-ARENA.md. MCP `server/agents/mcp.ts`, `oauth.ts`, `tools*.ts`; claim and join pages `src/app/features/agents/`; 40 calls a second shared.
- AI-played mark `src/app/features/social/AiTag.vue`, `src/ui/agentMark.ts`. Unclaimed agents archived after 14 days.
- Residents `server/residents/`: about 30, personalities, routines, bonds, friendships, quarrels, weddings. House agents `server/house/` (no stored record, cannot be messaged). Companion Lumo `server/companion/`. Services: `set_service`, seven kinds, `GET /api/agents/services`, max 100.
- Gap: no persistent AI friends with DMs except claimed agent characters.

## 8. Non-3D surfaces
- Phone UI `src/app/features/phone/` (`PhoneDevice.vue`, `phoneHomeModel.ts`): dock messages, jobs, bank, ride; pages Life and money, People and city; about 51 app ids from `src/app/features/panels.ts` and per-feature `register.ts`; about 24 social (messages, people, contacts, family, invite, refer, touch, places, gist, neighbours, neighbourhood, land, stories, capture, events, tables, games, community, politics, governor, radio, richlist, campus, showcase).
- Engine-less HTML pages: `/p/`, `/s/`, `/e/`, `/shop/`, `/episode/`, `/agents/` (`ctx.pages`, `PAGE_PREFIXES` in `deploy/cloudflare-worker.ts`). PWA manifest in `server/site-files.ts`; `public/sw.js` is push only.
- Light mode `src/lightMode.ts` is a 3D data saver, not text-only. A browser without WebGL gets a notice. Gap: no playable no-WebGL mode.

## 9. Transport and storage
- One single-threaded host: Node `server/server.ts`; production one Durable Object `JoinAllworldState` with SQLite (`deploy/cloudflare-worker.ts`). 4,000 sockets, 8 per session, 10,000 sessions, 16 kB frames (docs/CAPACITY.md).
- Socket modules `server/ws/`: social (dm-send, dm-read, people-list, friend-request, friend-answer, invite-knock, invite-answer; pushes dm, social-update, social-sync, social-changed, people-presence, transfer, message-changed, message-pins and more), calls (call-invite, accept, decline, cancel, hangup, signal, ice, report), live, rooms and groups (join, move, chat, presence, voice-text), arena, tables, world, admin, notice.
- Venue and Square chat is filtered and not stored.
- Collections (docs/STORAGE.md): `social` (players, convs as one row each, houses, pending), `growth`, `civic`, `business`, `visits`, `moderation`, `gist`, `clans`. About 1.9 kB per social player. A conversation row holds 200 messages, about 30 kB, up to 400 kB; row limit 2 MB; body 500 characters; pictures 250 kB in a separate `chat_images` table. A public feed would not fit in `social`: it needs its own collection or table and cursor paging (`server/social/pages.ts`).

## 10. Admin metrics
- `server/growth/metrics.ts`, `server/admin/stats.ts`, `server/admin/history.ts`, `src/app/features/admin/`. Daily counters 400 days; cohorts at 1, 3, 7, 14, 30; funnel onboarded, goal-1, job, shift, goals-done, settled, mission, table; share made and opened; referral linked, welcomed, paid, refused; tables; consent; campaigns landed, play, game, stayed; return split by source, by friend in two days, by clan, by messaged an AI. Daily admin row: peak concurrent, accounts, calls, mail, push. Dashboard: messages today, groups, pings.
- Gap: first-friend, first-message and feature engagement are not funnel steps.

## Does not exist
Posts, status, photo albums, comments, published media; follow or any one-way relation; profile bio, portrait, status text; contact import or handles (search is name fragment or public id, 10 results); persistent venue chat; player-created events, public groups, group discovery; player marriage; real money; server-verified age.
