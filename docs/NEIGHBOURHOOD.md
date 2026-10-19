# The neighbourhood: noticeboard, Meet your neighbours, and the city's economy

Phase 5 of [WOW-PLAN.md](WOW-PLAN.md) (19 October 2026), "real-world value in the world". The billboards and the business street are in
[PROMOTE.md](PROMOTE.md); this page is the other three: the noticeboard of an area, the monthly meetup, and the economy dashboard.

Code: `src/neighbourhood/model.ts` (the pure rules), `src/types/neighbourhood.ts` (wire shapes), `server/neighbourhood/` (stored shape and
service), `server/routes/neighbourhood.ts` and `neighbourhood-admin.ts`, `server/economy/` and `server/routes/economy.ts`,
`src/app/features/neighbourhood/` (the Noticeboard and Economy screens), `src/app/features/admin/NeighbourhoodAdmin.vue`. Tests: `server/neighbourhood.test.ts`,
`src/neighbourhood/model.test.ts`, `server/economy.test.ts`, `src/app/features/neighbourhood/neighbourhood.test.ts`, and the Worker test in `deploy/cloudflare.test.ts`.

## An area is what a badge names

Everything below is for **people with a location badge** ([FEED.md](FEED.md), "Location badge"): the device found itself in a city and,
optionally, a local government, and sent only that place name. The position never left the phone. An **area** is the badge's local
government, or its city when the badge has none (`areaOf`). A local government needs a badge with that same local government (a badge of the
city alone is not enough); a city area needs the same city (`badgeIn`, the `lga` and `city` rule of the locals-only communities). The badge
lasts 90 days; when it lapses the person is out of the area again. Badges are for adults, so everyone on a board is 18 or older.

## The noticeboard

Phone → Plans → **Neighbours** (the Plans app's second side; no app of its own, so the phone and the first download do not grow). A board per area, of notices in four kinds: **power** ("NEPA don bring light?"), **water**, **lost and found** and
**roadworks and traffic**.

- **Who.** A reader needs a badge in the area. An adult with such a badge posts (`adults_only` / `badge_needed` otherwise).
- **Words.** 8 to 240 characters, the game's text filter with contacts and links refused, the sender's mute, five notices a day, and the same
  words twice within an hour are refused. The notice shows the poster's character name: it is a place for neighbours, not for anonymity.
- **The AI reviewer reads every notice** before it is up (`judge` of `server/feed/review.ts`, told it is a neighbourhood board: no naming or
  accusing a person, no rumours about crimes, no addresses or numbers, no selling, no politics). On "keep" it goes up; otherwise it is refused
  and its author is told why; when no model can answer it waits and is tried again every five minutes, three times, then is left for an admin.
- **"Still true?"** Anyone in the area (not the poster) says still true or not true, and can change their mind. Each notice has a life by kind
  (power 6 hours, water 12, roadworks 24, lost and found 7 days). A *still true* pushes the end out by half a life from now, never past three
  lives from when it was posted. When **three more people** say *not true* than *still true*, it ends at once. So the board is current without
  anyone tending it, and nothing stays up for ever.
- **Report and remove.** Anyone in the area can report a notice; two different people send it back to the reviewer, who reads it again knowing
  that, and it is off the board meanwhile. The author removes their own. An admin removes or restores any notice (Admin → Neighbourhood,
  `GET /api/admin/neighbourhood`, `POST /api/admin/neighbourhood/act`), audited like every admin action.

Routes (`server/routes/neighbourhood.ts`): `GET /api/neighbourhood/board`; `POST /api/neighbourhood/notices`, `/vote`, `/report`, `/remove`.

## Meet your neighbours

Phone → Plans → Neighbours → Meet your neighbours. **One meetup a month per local government**, on the first Saturday at 16:00 West Africa Time for
two hours (`nextMeetupStart`: this month's if it is still more than two hours away, else next month's).

- **A meetup is an ordinary feed event** ([FEED.md](FEED.md) "Plans"): a post in the city, a going list, a reminder half an hour before. It is
  *marked* in the `neighbourhood` collection (`meetups[eventId]`), and that mark is what locks it.
- **Who may plan it.** An **admin** for any local government of any city (`POST /api/admin/neighbourhood/meetup { city, lga }`, hosted as the
  admin's own character), or the **founder of a community** of that local government (a community started with that local government as its
  area, whose founder's own badge is in it): `POST /api/neighbourhood/meetups/plan { crew }`. One a month an area (`already_planned`).
- **The template.** What the host wrote (title, description, place, price) is kept per area, so next month's is one tap. The date comes from
  the rule above, not the host. It is a template in that sense; nothing plans itself (see "Not built" below).
- **Open to badge holders of that area.** Going needs a badge in the same local government. The check is `meetupRefusal`
  (`server/neighbourhood/data.ts`), called by the feed's RSVP **and** by Earn's ticket sale, so an outsider cannot go and cannot buy a ticket
  (they are refused before any checkout is opened). The host and cohosts are exempt (an admin hosts any area). People of the same city,
  with another local government, see the meetup and the lock.
- **Free or ticketed.** Free by default. A host with a ready Earn account can set a price ([EARN.md](EARN.md)): `price` on the plan calls Earn's
  own `setPrice`; if the host has no payout account the meetup stays free and the answer says why (`priceNote`). Tickets, fees and refunds are
  Earn's, unchanged. Game money is not involved.

## The economy dashboard

Phone → Rich List → **Economy** (a third tab beside Players and Places), and a public page **`/economy/<city>`** (plain HTML, no script and no cookie, link-preview tags, every value escaped; served
through `ctx.pages` on the Node host and the Worker, which lists the `/economy/` prefix) and `GET /api/economy?city=`. It prints what the game
already records and adds nothing:

| Shown | From | Notes |
| --- | --- | --- |
| Rich list (top 10 balances, top 10 earners of the week) | the civic residents registry, `richListView` | The same rows and the same opt-out as the game's Rich List: a person who left it (Settings) is not named here either. Ids are never sent. |
| Median prices | the Market's trades (`market.tape`) | The middle price of the day's trades per commodity when at least three traded; otherwise the Market's reference price, marked as such. Absent until the city's market opens. |
| The Governor, the treasury, this week's levies, fees and bail, what was paid out, the term's accounts | the politics scope `city:<id>` and the sitting Governor | Levies and fees are the ledger's lines of the last seven days. |
| Game naira in circulation | wallets of the city's recent residents, Market account cash, the city treasury | A total of three parts. With fewer than five players, someone who left the rich list is also left out of the wallets, so a total never reveals one person's balance. |

It says on the page that game naira is never real money. Nothing here can take in, pay out or stand in for real money
([REAL-VALUE.md](REAL-VALUE.md)).

## Stored data

A new keyed collection `neighbourhood` (`server/keyed.ts`): `notices[id]`, `areas[key].notices` (newest 300 per area), `meetups[eventId]`,
`months["<area>:<month>"]`, `templates[area]`, `days[player]`, and `seq`. It is created by the first notice or meetup, so a store without it
reads as empty. Erasure (`forgetNeighbourhoodPlayers`) removes a person's notices, takes their votes and reports back, and drops the
meetups and templates they hosted; a neighbour's notice they voted on stays.

## Measures

Noticeboard posts, votes and reports, notices ended by votes versus time, meetups planned and going, tickets sold for meetups, billboard and
street taps (`boardTaps`, `streetTaps` on the admin's listing rows), visits to `/economy/<city>`.

## Not built, on purpose or for later

- **Meetups do not plan themselves.** The host presses Plan once a month; the heartbeat has no player session to host an event with. A
  later step is a reminder in the host's inbox a fortnight before.
- **No app icon of its own.** The Noticeboard and the Economy sit inside Plans and the Rich List, because every phone app adds to the first download (the startup budget has a few hundred bytes of room). `shell.open('plans', { tab: 'neighbours' })` and `shell.open('richlist', { tab: 'economy' })` open them directly.
- **The noticeboard has no photos and no map pin**, and notices do not appear in the feed. It is a board, not a post.
- **Meetups are one per local government a month**, not one per community.
- **The economy page has no history.** It is today's numbers; a weekly snapshot would need a stored series.
