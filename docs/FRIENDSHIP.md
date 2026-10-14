# Friendship after shared play

The number of friends a player has predicts who stays; generosity predicts who comes back (docs/agent-plans/world-alive/FEATURES.md, #1).
This is how the game turns a table game or a long talk in room voice into a friendship, and how it measures whether that works.

## The card

One compact, dismissible card (`src/app/features/social/FriendOfferCard.vue`, a lazy chunk) lists up to three people:

- **Add as friend** (an AI-played character may be asked like anyone, always with the AI-played mark). If they already asked you it reads "Accept".
- Once you are friends: **Send ₦200** (a small gift of game naira, never real money) and **Invite to your room**.

It uses the routes that already exist, so every rule still holds: `POST /api/social/friends/request`, `POST /api/social/transfers` (friends only,
₦100 to ₦5,000 a gift, three gifts and ₦10,000 a day, earned money only, rate limited) and `POST /api/social/visit/invite` (friends only).
Nothing was loosened: gifts and invitations were friends-only before, so the card offers them as soon as the friend request is accepted.

### After a table game

The server decides who is offered (`server/social/friend-offers.ts`), when a game that counted ends (`finish()` in `server/growth/tables.ts`):
the other people at the table who are not your friend (the founder's welcome friendship counts as one), not blocked either way, not someone you
already asked, and who have a social record. The list rides that player's own result (`result.mine.offers = { match, people }`), so it is sent
once per game. A game called off offers nothing; the house bots of a table are not players and are never offered.
The browser puts the card up once per match id, and "Not now" (or the cross) keeps those people off the next card for a day.

### After five minutes together in room voice

`VoiceFriendOffer.vue` (mounted by `CommunityHost.vue` only while the player is in voice) watches who is in the voice circle. After five
minutes without a break it asks the server for the person's card (`/api/social/players/:id`) and offers only someone who is not a friend, not
asked, not blocked. At most once per pair per day; "Not now" also holds it for a day. The memory is in `localStorage` (`aw-friend-offers`),
rules in `friendOfferModel.ts`.

## Closeness unlocks more: shown, not tightened

Today: messages work for anyone (a few new chats a day with non-friends), calls follow each player's own setting (default everyone), gifts and
visits to a home are friends only, and "Ask to be my Bae" opens at 40 closeness points ("Paddy Mi"). Raising any of these would remove
something existing players use, so **nothing was tightened**. The profile shows the ladder as information (`ladderLine()` in
`friendOfferModel.ts`) under the closeness bar.

## Thanks and gifts on the profile

`social.players[id].thanks = { given, got, recent: [{ who, dir, at }] }` (optional; at most 5 recent). Written in `performTransfer`, after the
money has moved, so a refused gift leaves no trace; a paid money request is a gift and counts too. The profile card (`thanks`, in
`GET /api/social/players/:id`) shows the two counts to anyone who can see the card and the recent list only to the player and their friends.
**No amounts** are shown.

## Return by friend and by ad source

`GET /api/admin/history` carries `returns` (`returnSplit()` in `server/growth/metrics.ts`); the admin dashboard shows it as "Coming back".

- The browser sends the visit's cleaned `utm_` words once with `POST /api/growth/hello` (`source`); the server keeps `src` on the followed life.
- `noteFriend()` records the Lagos day of a life's first real friend when a friend request is accepted (`fr`); `ret` records day 1, 7 and 30 seen.
- Once a life is old enough (hourly, in `prune`), it is counted once into `metrics.split[cohortDay]`: by `src:<source|medium|campaign>` and by
  `friend:yes|no` ("made a friend in the first two days"). A day nobody is old enough for is `null` ("too early"), never 0.
- Aggregates only: no player id. Lives that began before this was added count as source `unknown`; they have no friend day either.
- Day 30 can only be settled for lives still followed at age 31 (`KEEP.window`), which is exactly when it is counted.

## Tests

`server/friendship.test.ts` (offers, gift limits, the thanks record, the return split), the last test of `server/tables.test.ts` (offers in a
real game's result) and `src/app/features/social/friendOfferModel.test.ts` (once per pair per game, not-now, once per day after voice).
