# The city gist and the world ledger

Small stories form when a system shows what it did. The gist is a short list of **public** things that happened in each city, one plain
line each ("Ada opened a food stall in Yaba Market", "Tunde was elected governor of Lagos", "The Square is packed right now"). People read
it in the Gist app and in the Square, share a line as a card, and AI agents look a claim up in it before they repeat it, so a rumour is not
passed on as news. Code: `server/gist/ledger.ts` (the ledger), `server/routes/gist.ts` (the route), `src/app/features/gist/` (the phone).

## The ledger

`ctx.collection(db, 'gist')` = `{ v: 1, seq, cursor, cities: { <cityId | 'world'>: item[] } }`, oldest first. An item is
`{ n, at, city, kind, text, refs? }`:

| Field | Meaning |
| --- | --- |
| `n` | counts up for the whole world, never reused; the number a share card and `since=` use |
| `city` | a city id, or `world` for what belongs to every city (the Square, the nation, an announcement for everyone) |
| `kind` | `election`, `law`, `party`, `removal`, `business`, `jail`, `busy`, `event`, `notice`, `owner`, `other` |
| `text` | one line, at most 120 characters, first letter capital |
| `refs` | at most four small keys: a record number, a de-duplication `key`. Never a player id |

**Limits.** At most 200 items a city (`CITY_MAX`), 2,500 in all (`TOTAL_MAX`), none older than 14 days (`KEEP_MS`); pruned on every write.
Writes are `{ durable: false }` (the heartbeat) or ride on the transaction that made the event: losing the last second of gossip costs nothing.

**The one door.** Every source calls `gistService(ctx).add(db, entry)` inside its own transaction. Later phases do the same
(Phase 14's "a fever is going round Yaba" is `add(db, { city, kind: 'owner', text })`).

```ts
add(db, { city: 'lagos', kind: 'business', text: '{0} opened a food stall in Yaba Market', people: [{ id, name }], refs: { key: 'shop:...' } })
```

`{0}`, `{1}` stand for `people[0]`, `people[1]`. `minors: 'skip'` leaves the whole item out when a named person is not a known adult
(default: the name becomes "a resident"). `refs.key` makes the line appear once however often the source runs.

## Privacy rules (tested in `server/gist/gist.test.ts`)

1. **Only facts that were already public.** The sources are the public record, shops (shown to everyone in their market), arrests in a
   city, the calendar, the public counts and operator announcements for everyone or one city.
2. **Names.** A person is named only when `ctx.checks.adult(db, id)` is true. A minor, or a player whose age is not known, is "a resident"
   (or the line is dropped when it would be about their arrest, removal, election or party).
3. **Hidden players.** Anyone who hid themselves from the directory (civic prefs `directory`) is in no line at all.
4. **No money.** A line with a money sign, "naira" or "kobo" is dropped unless the source says the amount is already public (a law of the
   public record). Stalls never show a price, a takings figure or the stall's own name.
5. **Never the private.** Messages, reports, blocks, moderation, rulings of a court (they name the tried), the officer in an arrest, the
   sentence, votes by person and the operator's reasons do not call `add`, and the tests prove none of it appears.
6. **No ids.** Nothing stored can be turned back into a person.
7. **Friendships.** The game has no public partners or weddings, and who is whose friend is private, so friendships are not a source.

## Sources

| Source | When | Line |
| --- | --- | --- |
| Public record: term won, law, party, removal | heartbeat reads new entries (a cursor), at most 40 a look | "Tunde was elected governor of Lagos", "The City House passed a law: ...", "Chi founded the Good Road Party", "Tunde was removed from office in Ibadan by petition" |
| Business opened (`server/business/service.ts`) | when the stall opens | "Ada opened a food stall in Lagos Market" |
| Arrest (`server/routes/politics.ts`) | when the officer arrests; adults only | "Bully was arrested in Lagos" |
| Busy city, packed Square | heartbeat; 8 people in a city / 6 in the Square, at most every 6 hours each | "Lagos is buzzing: 12 people out right now", "The Square is packed right now" |
| Calendar event begun (`src/game/calendar.ts`) | heartbeat, in cities someone is in | "Owambe night has started at Quilox" |
| Announcement (`server/admin/announce.ts`) | when it goes out, for everyone or one city (not "online now") | "From the Allworld team: Weekend market" |

The heartbeat runs at most every 20 seconds, reads memory first and writes only when there is something new.

## The route

`GET /api/world/gist?id=<city>[&since=<n>][&limit=1..50]`: public (no session), limited per address, cached 15 seconds. Answers
`{ city, items: [{ n, at, city, kind, text }], latest }`, newest first: the city's own lines and the world's. It is public because every line was
public when written and holds no id; nothing in it is about the caller. (`id`, not `city`, so the host does not load the city first.)

## On the phone

* **Gist app** (Phone, People): the newest lines with "how long ago" and a **Share** button each. It is a lazy chunk (`gistPanel` in
  `src/app/features/panels.ts`); the store reads the route at most every 20 seconds.
* **The Square** shows one fresh line at a time in the place panel as "Gist: ..." (the three newest of the last six hours, changing every nine
  seconds). It is never posted in chat.
* **Share.** Kind `gist` of the share cards (docs/SHARE-CARDS.md): the browser sends only the line's number, `createShare` reads the line from the
  ledger, and the card's headline is its words (`card-news.png`, lands beside the sharer). An expired or unknown number gives "nothing to share".

## For agents

`check_gist { query }` (server/agents/tools-more.ts) is read-only: it returns at most five matching lines of the agent's city and the world,
newest first, with `n`, `text`, `where` and `minutesAgo`; with no query, the latest five. Its description tells an agent to use it **before it
repeats a claim**, to say "I heard" when nothing backs it, and that "not found" only means "not in the public gist". See docs/AGENTS.md.
