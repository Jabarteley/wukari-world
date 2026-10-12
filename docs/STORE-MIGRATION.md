# Moving the live store to per-entry storage

The live server keeps each big collection (`social`, `agents`, `civic`, `growth` …) as ONE stored value: a request that touches one
reads it whole and writes it back. [STORAGE.md](STORAGE.md) describes the per-entry layout that removes this and
[PERFORMANCE.md](PERFORMANCE.md) why it is needed now (an AI agent's call rewrites the whole `agents` collection). This page is the
way from one to the other on the one live object, which has real accounts in it and no way back to an earlier build.

## What exists, in one screen

- **Three layouts** of the collections listed in `KEYED_SPECS` (`server/keyed.ts`): `legacy` (one stored value each; what is live),
  `shadow` (the stored value is still the truth, and a per-entry copy is written beside it in the same SQLite transaction and compared
  with it), `entries` (the per-entry rows are the truth; the stored values of before are left as they were, as a safety copy).
- **Twelve collections are covered**: `social`, `growth`, `civic`, `business`, `commerce`, `records`, `realValue`, `showcase`,
  `trustChecks`, `street`, `livingWorld`, `agents`. `agents` is already among them (`keys`, `owners`, `chars`, `claims`, `names`).
  `politics` is not: see "What stays whole".
- **Never part of the move**: sessions (saved lives), action and other receipts, accounts and their devices, archived lives, the wallet
  history, pictures, voice notes, the world registry and the limiter. Each is a table of its own, read and written by key in every
  layout. Exactly-once therefore behaves the same in every layout: a receipt is a row written in the same SQLite transaction as the
  change it stands for.
- **The layout is a row in the store** (`store_meta.layout`), not a setting of the deployment. Whatever build holds the object reads
  that row first and behaves as it says. The build that is live today already does (its store code is the same as this build's but
  for what is described below), which is what makes the overlap of a deploy safe.
- **A build's word**: `deploy/store-release.ts` holds one word, `legacy`, `shadow` or `entries`. It is where this build takes the
  store. The Worker variable `STORE_LAYOUT`, if somebody has set one, stands in its place (the release package sets no variable but
  `BUILD_ID`, so on the live site the word in the file is what counts).
- **The operator's routes** (`GET /api/mod/store`, `/compare`, `/hashes`; `POST …/migrate`, `/layout`, `/safety`; moderator token)
  already existed and still do everything by hand. The releases below need only the three `GET`s.

## The path

Three releases. Each changes one word and nothing else.

| Release | `RELEASE_STORE_LAYOUT` | What the store does | What is the truth |
| --- | --- | --- | --- |
| A | `shadow` | Makes a per-entry copy of each collection, a bounded amount before each transaction; from the moment a collection's copy exists every write to it goes both ways in one SQLite transaction; one load in fifty compares a whole copy with its stored value. When every copy exists, writes `layout = shadow` | The stored values, as today |
| B | `entries` | At its first transaction: if shadow never found a difference AND every copy equals its stored value now (every entry compared), writes `layout = entries` and reads and writes per entry from then on. Otherwise changes nothing and says why | The per-entry rows. The stored values of before are not written again and not deleted |
| C (not before 14 days after B) | `entries` | Nothing by itself. The operator deletes the stored values of before (`POST /api/mod/store/safety {"action":"drop"}`) | The per-entry rows |

Why this path and not one step: the code supports going straight from `legacy` to `entries` (a store that has no data, or a test,
does), and each copy is checked against its stored value to the character when it is made. What one step would not give is days of
real traffic written both ways and compared before anything is read from the new rows. Shadow costs CPU (see "Proof", the load
model), so A and B
should be days apart, not weeks.

### The rules the store follows

1. **Only forwards.** A build whose word is behind what the store has reached changes nothing. A later release cannot undo a step
   by carrying an old word, and a hotfix cut from an older commit is safe.
2. **The operator's choice is left alone.** A layout set with `POST /api/mod/store/layout` is marked as the operator's
   (`store_meta.layout-by = operator`), and no build moves a store so marked. That is the hold switch: `{"layout":"legacy"}` or
   `{"layout":"shadow"}` stops the releases from moving the store until the operator sets the next layout by hand.
3. **Bounded steps.** One collection is copied in one SQLite transaction (cut from its text without parsing it, written, read back,
   compared to the character; anything else rolls that collection back). Before one transaction the store copies at most 4,000,000
   characters of collections (`STEP_CHARS`; the variable `STORE_STEP_CHARS` changes it), or one collection when that one is
   larger. A collection longer than 24,000,000 characters (`MAX_STEP_CHARS`, about 12,000 stored players' `social`) is not copied
   unasked: it stays as it was, the status names it, and nothing is switched while any copy is missing. The requests that arrive
   meanwhile wait in the store's queue for that one step and then run.
4. **What triggers a step**: any transaction once the object has started (a request, the heartbeat, the alarm). Never the start
   itself: a start must not wait for a copy, and the writes of a start are confirmed together, so a copy made then would be
   neither bounded nor resumable. Nothing runs in the background and nothing needs an alarm of its own: a store that nobody asks
   anything of has nothing to be slow for.
5. **Stopped at any point** (the object evicted, a deploy, a failed write): a collection is either copied and marked
   (`store_meta.synced:<name>`) or not; the next start goes on from the marks. `shadow` is written down only when every mark
   exists; `entries` in one transaction of its own. Each try at a copy is written down before it begins
   (`store_meta.copying:<name>`); a collection whose copy was cut off twice is not tried a third time unasked, so a copy that
   takes the object down (memory, CPU time) cannot do so at every start. The status names it and the operator decides.
6. **Findings outlive the object.** A difference found by shadow is counted in the store (`store_meta.shadow-found`), with the
   first twenty lines of what differed, and the copy that differed is made again from the stored value at once. The count stays,
   and holds back release B, until the operator has every copy made afresh (`POST /api/mod/store/migrate` with no collection named).
7. **Nothing is deleted** by A or B. The entry rows are extra rows in A; the stored values are untouched rows in B.

### A build of before, during a deploy

For some seconds or minutes around a deploy the previous build may still hold the object, or take it back. What it does:

| The store says | The previous build (no word of its own) | Safe because |
| --- | --- | --- |
| nothing yet, some copies marked (A began) | Writes the stored values only, and first deletes every `synced:` mark | No copy that missed a write is ever trusted: A starts the copies again |
| `shadow` | Goes on in shadow: writes both ways | Same code path |
| `entries` | Reads and writes per entry | Same code path; it does not go back to the stored values |

Proved two ways: `deploy/sqlite-release.test.ts` (the two builds take turns on one store through A and B with random requests,
against a store that never moved; three seeds) and `scripts/store-switch-proof.ts` (the real live build and this build take turns
under the Worker runtime; see "Proof").

One real defect of the live build shows up here and is why A also carries a fix. A stored value longer than 400,000 units was cut
into rows every 400,000, and when a cut fell inside an emoji the storage kept U+FFFD in place of each half (the emoji reads back as a run of �). It has been doing this on
the live site to any collection past that length, at random, a character at a time. This build never cuts inside a character. If
the previous build damages a character during the minutes it overlaps with A, shadow finds it (the copy has the character whole,
the stored value does not), the copy is made again from the stored value, and the count stays at 1: see "Stop conditions".

## Release steps

Only read routes are used for the checks. `$T` is the moderator token; every call is
`curl -s -H "Authorization: Bearer $T" https://joinallworld.com/api/mod/store` (or `/compare`, `/hashes`).

### Before A

`GET /api/mod/store` on the build that is live. Healthy: `"requested":"legacy"`, `"stored":null`, every collection
`"entries":0`. If `stored` is anything else the operator set a layout by hand at some time: the releases will not move the store
until the operator sets the next layout by hand too (rule 2). Note `GET /api/mod/overview` → `store.collections` for the sizes: no
collection may be near 24,000,000 characters.

### Release A

1. Release the commit whose `deploy/store-release.ts` says `shadow`. Nothing else in it.
2. After `/api/health` shows the build, `GET /api/mod/store`. Healthy, within a minute of traffic:
   - `"requested":"shadow"`, `"stored":"shadow"`, `release.target = "shadow"`, `release.by = "release"`, `release.pending = []`,
     `release.moving = null`;
   - every collection `"synced":true`, `"mode":"legacy"`, `"error":null`;
   - `shadow.mismatches = 0`, `shadow.errors = 0`.
   While `release.pending` still lists collections, `stored` is `null`: that is the copies being made. Ask again.
3. `GET /api/mod/store/compare`: every collection `"equal":true`, `legacyEntries = entryRows`, `legacyHash = entryHash`.
   (This reads every collection once; do it at a quiet time, not in a loop.)
4. Leave it for at least a day of ordinary traffic, better two or three. Each day: `GET /api/mod/store` → `shadow.mismatches = 0`,
   `shadow.errors = 0`, `shadow.compared` above zero (it counts since the object last started, so it is small after a deploy).

### Release B

1. `GET /api/mod/store` and `GET /api/mod/store/compare` once more, healthy as above. Keep the answer of
   `GET /api/mod/store/hashes`.
2. Release the commit whose word is `entries`. Nothing else in it. `KEYED_SPECS` must be the same as in A.
3. `GET /api/mod/store`. Healthy at once: `"requested":"entries"`, `"stored":"entries"`, `cutoverAt` a time just now,
   `release.refusal = null`, every collection `"mode":"entries"`.
4. `GET /api/mod/store/hashes`: for a collection nobody wrote to between the two calls, the same fingerprint as in step 1. (Busy
   collections differ because they were written to; equal ones are the proof that the same text is read from the other layout.)
5. The game itself: open a conversation, send a message, look at the rich list, call an agent tool. `GET /api/mod/overview` →
   `store.writeFailures` not rising.

If step 3 shows `"requested":"shadow"` with `release.refusal` set, nothing was switched and nothing is wrong with what players
see: the stored values are still the truth. See "Stop conditions".

### Release C (optional, 14 days after B at the earliest)

The stored values of before are dead weight (their size at the day of B) and the only way to restore that day's state exactly.
`POST /api/mod/store/safety {"action":"drop"}` deletes them; it refuses before 14 days. This is the only destructive step and it is
the operator's, by hand. There is no hurry: they cost storage, not CPU.

## Stop conditions, and what to do at each

There is no rollback of a build. Every answer below is "stay where the truth still is, fix, go on".

| What is seen | Where the truth is | What to do |
| --- | --- | --- |
| After A: `release.pending` never empties, a collection has `error` | Stored values | Read the error. `too large to copy unasked`: copy it by hand at a quiet time (`POST /api/mod/store/migrate {"collections":["<name>"]}`) or raise the limit in a release. `its copy was cut off 2 times`: the object went away twice while copying it. Once or twice by chance (a deploy, an eviction) is harmless: ask for it by hand as above. If the object is being killed BY the copy (look for exceeded-limit errors in the Worker's log at those moments), do not ask again: the collection stays as it was, which is safe, and the step size or the copy needs work. Anything else is a defect in the copy. Do not release B while any collection is pending |
| After A: `shadow.mismatches` above 0 | Stored values (the copy was already made again) | Read `shadow.first`. A single finding dated within minutes of the deploy of A, on a collection longer than 400,000 characters, is the previous build's cut character (above). Anything else is a defect in the both-ways write: find it before B. Either way B will refuse until `POST /api/mod/store/migrate {}` has made every copy afresh, which also sets the count to 0; then let it run a day again |
| After A: the server is slower than can be borne | Stored values | `POST /api/mod/store/layout {"layout":"legacy"}`: shadow stops at once, the copies are forgotten, and no build starts it again until the operator sets a layout by hand |
| After B: `release.refusal` is set, `requested` still `shadow` | Stored values | Nothing was switched. `shadow_mismatch`: as two rows above. `not_equal: <collection>/…`: a copy differs now; it was counted and will be made again; investigate as a mismatch. The switch is tried again at each start of the object once the count is 0 |
| After B: wrong data seen by players, traced to the per-entry rows | Per-entry rows (stored values are B-day old) | Fix forward in code if the rows are right and the reading is wrong. To leave the layout while keeping every write since B: `POST /api/mod/store/layout {"layout":"shadow"}` rewrites the stored values from the rows (one large transaction) and carries on in shadow under the operator's hold. Only if the rows themselves cannot be trusted: `POST /api/mod/store/safety {"action":"restore"}` goes back to the stored values as they were at B and gives up what was written since |
| Any time: `store.failing = true` in the overview | Unknown for the last write only | The existing rule: the object refuses everything until it restarts; a retry then meets its receipt if the write had been kept |

## What stays whole afterwards, and how far it can grow

Stored as one value each in every layout. A request that touches one still reads and writes all of it.

| Collection | Grows with | Limit in the code | When to key it |
| --- | --- | --- | --- |
| `politics` (parties, members, bills, justice) | players who join a party or go to court | none on members | First. One pass per overview already; a few thousand members make it the next `social`. Needs `KEYED_SPECS` entries for its member and case maps and the same A/B pair (or riding C as a new collection in shadow) |
| `pulse`, `campus` | open cities, boards | per city | When cities pass a few hundred |
| `support`, `moderation`, `trust`, `guestbook`, the five `admin*` | reports and operator work | capped lists (2,000 reports) | Not needed |
| `launchBonus`, `launchBonusSeen` | accounts that took the bonus | the bonus's own cap | Not needed |
| The **roots** of keyed collections | `growth.metrics.lives` holds every life of the last 31 days (477 KB at 10,000 players); `social` root 50 KB at 10,000 | 31 days | `growth.metrics` when stored players pass about 20,000 |
| One **conversation** | 200 messages | about 30 KB, 400 KB at the very worst | By design one row |
| A city's **election** of one week | voters | one entry per week (114 KB at 10,000 players) | When one city passes about 50,000 voters |

## The follow-ups the audit asked for

### A rate for agents as a whole (done in this change)

With per-entry storage a tool call costs about seven player requests. Measured here: see "Proof", load model. About 1,500 agents at
their daily ceiling (104 calls a second) would fill the one thread by themselves.

- `AGENT_RATE` (`server/agents/policy.ts`): 40 tool calls a second for all keys together, two seconds' worth at once. In memory,
  one bucket a server.
- Over the rate: HTTP 429, `Retry-After: <seconds>`, code `agents_busy`, "Allworld is answering as many agent calls as it can right
  now. Wait N seconds, then send the same call again. Nothing was done, and nothing was counted against your key." The refusal comes
  before the tool runs and before the write that records a call: it costs the one read that found the key.
- The operator's setting, no release needed: `POST /api/mod/agents/settings {"rate": N}`; `GET /api/mod/agents` shows `rate` and
  `busyRefusals` (calls told to wait since the object started).
- Not done: writing the audit line lazily in batches (PERFORMANCE.md). It changes what an agent's owner can rely on in the trail and
  wants its own change.

### Two indexes (designed, not in these releases)

- **`chat_receipts(at)`**. The table is made by the Worker at start, outside the versioned schema, so
  `CREATE INDEX IF NOT EXISTS chat_receipts_at ON chat_receipts(at)` beside it is additive: a previous build ignores it and it could
  ride any release. It costs one more row written per chat line (an index entry is a billed row) to save a scan of one day's
  receipts once a sweep. It is left out of A and B so that anything seen after them has one cause; it can go with any ordinary
  release.
- **`sessions(expires_at)`**. Not safe to ride: `sessions` is in the versioned schema, whose check a previous build fails on a
  version it does not know (it refuses to start), so it cannot overlap with that build during a deploy. It needs schema version 3
  in `deploy/sqlite-schema.ts`, the index added to `assertCurrent`, and a release whose previous build already accepts version 3
  (two releases: first "accept 3", then "make 3"). And the column must first be written coarsely: today every renewal of a session
  rewrites `expires_at`, so an index would add a billed row to nearly every request. Write the column only when the true expiry
  has moved a day past it (the sweep already judges each candidate by its record, so a column that lags is only a wider net), and
  count sessions with `SELECT COUNT(*)`. Needed at about 10,000 stored sessions.

## Proof

Everything here was run on 12 October 2026 on one computer (Apple M4 Pro) under the local Workers runtime, while other work ran
on the same machine. The times compare one layout with another; they are not production's.

### What was run

- `deploy/sqlite-release.test.ts` (node:sqlite stand-in): the bounded copy, the switch and its refusals, the operator's hold, a
  finding kept across restarts, a copy too large, a copy cut off twice, a stop at every statement of the whole move (the next start
  always finishes and reads back equal), the two builds taking turns on one store against a store that never moved (three
  seeds), and a character at every position across a cut.
- `deploy/storage.edge.test.ts` on the Worker runtime: release A in small steps, the previous build taking the object back, release
  B, and later builds with an older word.
- `scripts/store-switch-proof.ts --old <checkout of the build that is live> --players 2000 --sleepers 2000 --agents 300
  --requests 4000`: the rehearsal described at the head of that file. The seed was written by the build that is live
  (`6360a685`) through its own routes: 2,000 players with lives, friends and messages, 300 agents that signed themselves up and
  made 24 tool calls each (audit trails full), then aged with what a store a few weeks old holds and a run of minutes cannot
  make through the routes: 2,000 players who came and went, long conversations, gifts waiting, shops, two more cities with
  residents and an election each, 1,500 receipts and 1,200 wallet rows.
- `npm run capacity`, the audit's load model (busy players, 40 s a step), in each layout.

### The store that was moved

2,301 saved lives, 1,400 action receipts, 1,501 other receipts, 1,200 wallet rows. `social` 9,032,136 characters in 7,124 entries;
`growth` 1,574,318 in 5,117; `civic` 867,454 in 4,052 (three cities); `agents` 730,169 in 1,200; `business` 29,478 in 61. The other
seven collections were empty. 12.2 million characters in all, the largest store this page has numbers for.

### Release A and B, as they would run

| | Measured |
| --- | --- |
| A: every copy made | 887 ms after the first request arrived, 12 collections, 35,113 table rows (each entry row also writes one index entry) |
| A: the slowest request while copying | 758 ms (the first one: it waited for `social`) |
| A: the largest single transaction | `social`: 9,032,136 characters, 7,124 entries, 14,249 table rows, 376 ms |
| A: counts and fingerprints, old against new | every collection `equal`, entries counted in the stored value = rows kept (7,124 / 5,117 / 4,052 / 61 / 1,200), fingerprint equal on both sides; and read from the SQLite file itself, the SHA-256 of each collection put together from its rows equals that of its stored value and that of the value the live build left |
| B: the switch | 145 ms (every entry of every collection compared, then one small transaction); the first request took 266 ms |
| B: after it | every collection reads per entry with the same SHA-256 as the live build left; the stored values of before unchanged |

### Stopped while copying

The runtime was killed (SIGKILL) 60, 120, 240, 480 and 480 ms after its start. The first came before anything was copied. The next
two landed inside the copy of `social`: nothing
of it was kept, the stored value was what it had been (SHA-256), and the try was on record. After the second the store left
`social` alone, as designed, and copied the other eleven; two more kills landed with eleven copies made and one not. The operator's
route then copied `social`, the next start wrote down `shadow`, and every copy equalled its stored value; every receipt and 2,261
of the 2,261 lives nobody had asked for were byte for byte what the live build left.

### The two builds taking turns, and every answer compared

4,000 recorded requests (34 kinds: lives, actions, messages, gifts, friend requests, the lists read from everybody, searches,
civic and politics reads, agent tool calls, new players; 420 of them a write sent a second time with its first id) were sent one
at a time to the store being moved and to a copy that stayed on the live build. The object of the moved store was held, turn by
turn, by: A, the live build, A, the live build, A, B, A, the live build, B, the live build, B, B.

- **4,000 of 4,000 answers equal** once clock values are set aside (times of day, and the fractions of a point a life has not
  yet lost to the clock). 2 of them differed in one character that the live build had cut in two in its own store.
- Writes sent again: messages 212 of 212, actions 121 of 121, gifts 87 of 87 answered alike, and at the end both stores held the
  same 1,787 action receipts, 1,501 other receipts and 1,200 wallet rows.
- At the end, read from the files: all twelve collections equal (`social` but for the cut characters; the public record but for
  the digests it makes over the time of each entry), `pulse` equal, 2,299 of 2,301 lives equal. The two that differ do so in one
  field, `needs.energy`, which falls with the clock; it was not looked into further.
- Shadow found nothing in any turn held by this build. In both turns that the live build held the object in shadow it cut
  characters in two in `social` (12 entries in all): shadow found each, the copies were made afresh through the operator's route,
  and the run went on. That is the stop condition and its remedy, exercised.
- These turns ran with every write durable at once. The live site holds some changes in memory for up to ten minutes (a poll, a
  check-in, the count of an agent's read-only call) and loses what is held when the object is replaced, in every layout; per
  entry it holds them per entry, so which of them a given replacement loses is not the same set as today. That is the existing
  rule for such changes, not a new loss, and it is why they were kept out of an exact comparison.

### The load model, before and after

1,000 connected busy players; action latency p50 / p95 / p99 in ms; the host's share of one core.

| Layout | No agents | With 1,000 agents at their daily ceiling (69 calls a second) |
| --- | --- | --- |
| `legacy` (live) | 2.4 / 26 / 49 · 0.44 | 5,841 / 12,521 / 16,911 · 1.01, saturated; agent call 5,943 / 12,741 / 16,861; requests dropped |
| `shadow` (release A) | 2.8 / 36 / 69 · 0.50 | 6,307 / 13,927 / 19,941 · 1.01, saturated; agent call 6,828 / 15,799 / 19,910; requests dropped |
| `entries` (release B) | 2.1 / 7.8 / 42 · 0.27 | 39 / 259 / 347 · 0.91; agent call 49 / 296 / 387; nothing dropped |

So: shadow costs about a seventh more CPU than today and does not make the agent problem better (it is the same whole-collection
write plus the copy); entries takes two fifths off the CPU of players alone and turns the swarm from seconds into tens of
milliseconds. The audit measured 11 / 117 / 205 at 0.77 of a core for the last cell earlier the same day on a quieter machine; this
run was slower, and at 0.91 of a core it says the same thing more loudly: 1,000 agents at the ceiling nearly fill the thread even
per entry.

**The agent rate.** 1,000 players and 2,000 agents at their ceiling (139 calls a second), per entry:

| Rate | Action p50 / p95 / p99 | Agent call p50 / p95 / p99 | Host |
| --- | --- | --- | --- |
| lifted | 4,220 / 8,158 / 12,755 | 4,247 / 8,154 / 12,985 | 1.03 of a core, saturated, requests dropped |
| 40 a second (the default) | 7.6 / 127 / 515 | 9.7 / 105 / 502 | 0.73 of a core; 3,981 calls told to wait, none dropped |

### Gates

`npm run typecheck`, `npm run build`, `npm run size:download`; `npm run test:edge` with the build's own word (`shadow`), with
`STORE_LAYOUT=legacy` and with `STORE_LAYOUT=entries`; `npm test`. The numbers are in the commit that set the word.

### Not shown

- Production: its CPU is not this computer's, time does not advance there while code runs, and it bills rows. The copy is about
  35,000 table rows and as many index entries for the store above.
- Signed-in accounts: the local runtime has no identity provider, so `accounts` and `account_devices` were empty. They are tables
  of their own that the move does not read or write.
- Sockets: the rehearsal speaks HTTP. The load model holds two sockets a player in every layout.
- A store larger than 12 million characters. The time grew in step with the size (290 ms for 6.0 million, 890 ms for 12.2).
