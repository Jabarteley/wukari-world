# Legacy: passing property on

Decision of the owner, 15 October 2026: a player can pass property and reputation to a next character, including a different
character. Phase 19 (docs/SMALLER-FEATURES.md) left it out because "a house, stall or plot belongs to one session's life and its
city record, and a half-finished hand-over could lose or duplicate a house; there is no rollback". This page maps what is held
where, then designs a hand-over that cannot be half finished. Code: `server/legacy/` (rules and the move), `server/routes/legacy.ts`,
`src/app/features/home/PassOn.vue`, tests in `server/legacy.test.ts`.

## 1. Where each thing is held today

Two kinds of store, which matters more than anything else here.

**The main store** (`ctx.store`, one transaction, all-or-nothing: a throw discards every change, see `server/store.ts`). It holds
`db.sessions[secret]` (a character: its lives per city, `cities[city].state`), `db.archivedLives[publicId]` (a character an account
set aside), `db.accounts`, `db.business`, `db.social` and every other collection. One `ctx.store.transact` can change any number of
sessions, archived lives and collections together, and a thrown error leaves all of them as they were.

**The world shards** (`server/world/`, one append-only log per local government). They hold which plot each house stands on and the
extra land parcels. They are a separate store: nothing is ever written to a shard and the main store in one step, which is why the
world service says "every step is made safe to repeat" (`server/world/service.ts`). A shard cannot be part of `ctx.store.transact`.

| Thing | Where | In one main transaction? |
| --- | --- | --- |
| Cash, ledger, deposits, loan, rent, ground rent | the life: `wallet`, `economy` | yes, but **never passed** |
| The house: size (tier), look (style), a build in progress | the life: `estate` (`estate.tier/style/upgrade`, and `estate.away[city]` for homes in other cities) | yes |
| The plot the house stands on | the shard of the local government, keyed by the owner's PUBLIC ID; the life holds a copy (`estate.plot`) | **no** (shard) |
| Extra land parcels next to a house | the shard only (`land` claims, with a purchase journal in `db.civic.landPurchases`) | **no** (shard) |
| Rented homes (`property.house`, `estate.living = 'rent'`) | the life, and a landlord's rules | not property: never passed |
| Cars (`property.cars`, `property.car`) | the life | yes |
| Furniture (`home.items` placed, `home.storage`, `home.overflow`) | the life | yes |
| Belongings (`inventory`) and trade goods (`business.bag`) | the life | yes |
| A shop or stall | `db.business.shops[ownerPublicId]` (one per player, keyed by its owner, with its stock, price list, rating and `paid`) and `db.business.reports` | yes |
| Commodity-market holdings | `db.market` accounts (free naira and goods per city) | money: never passed |
| Showcase listings, purchases, real-money items | `db.showcase`, `db.commerce` (by account) | never passed |
| Closeness | the life: `social.rel[npcId or playerId].p` (0 to 100) | yes |
| Titles | the life: `missions.titles` (four titles for active days) | yes |
| A shop's reputation | on the shop record (`rep`, `ratings`) | yes, with the shop |
| Offices, votes, sentences, jail | `db.politics`, the life `civic` | never passed |
| Friends, blocks, Bae, family | `db.social`, `social.rel[player].friend` | never passed |

**Accounts and characters** (`server/accounts/service.ts`). An account has ONE active character (a session record under a key no
browser holds, `account.sessionKey`) and up to `MAX_PARKED` (5) characters set aside: archive entries of `db.archivedLives`, listed
in `account.parked`, which only that account may bring back (`switchCharacter`, which needs a fresh proof). `takeOverCharacter`
turns an agent character the account claimed into the active one. An agent character is a session record marked
`agent.char = true` with an `owner` account. A parked character is stored, not running: its lives sit in the archive entry and are
settled up to date when it is next played. Both an active session and an archive entry carry `cities` (the lives), `character`
(which city it is in) and a public id, so a hand-over can read and change either inside one transaction.

## 2. The central problem, and how this design avoids it

Moving a plot between two people is a shard operation, and a shard cannot take part in the main transaction. So the design never
moves a plot or a parcel. **What passes is the house itself (its size and look), not the ground under it.** The receiver's house
in that city takes the size and look; the giver's falls back to the free starter house, which everyone has
("EVERYONE HAS A HOUSE", `src/game/systems/estate.ts`: a house that was paid for is property, the free starter is not). Both lives
change in one main-store transaction. The shards follow by themselves, exactly as they already do for any upgrade: the next
settlement of each life sees a different `tier` and `style` (the world service's `sigOf`) and brings that player's plot in line, and
a repeat does nothing. A crash after the commit changes nothing the registry cannot repair, because the life, not the shard, is
the truth about the look and size of a house.

**Extra land parcels are not passed in this release.** They exist only in the shard, so moving one is two stores, and the
rule of this design is one transaction. It is left as a second phase with the same shape as `server/world/land.ts`: a journal
record, an idempotent shard step keyed by a token, a finish step, with the parcels frozen while it runs. It is named here so
nobody thinks it was forgotten; the Pass on screen says that land stays with its owner.

## 3. The hand-over: all or nothing, exactly once, recoverable

### What is in a hand-over (the six kinds)

A player chooses which of these to pass; each one is optional.

1. **Houses.** For each city where the giver holds a house bigger than the free starter, and not building an upgrade: the receiver's
   residence in that city takes the giver's size and look, if the receiver's is smaller (or the same size); the giver's residence
   becomes the starter house with the default look. The receiver needs a home in that city (their main or an away home). A
   receiver whose house is already as big keeps theirs and that house simply stays with the giver (the summary says so).
2. **Cars.** Each car moves if the receiver does not own that kind of car (a life holds each car at most once). The giver's driven
   car is put away if it moved.
3. **A shop.** The giver's shop record is re-keyed to the receiver (its stock, prices, rating and reputation come with it; reports about
   it follow). The receiver must have no shop (a closed one does not count). The cash box must be empty and no rent overdue: the
   giver collects and pays first, because the cash box is money.
4. **Furniture.** Everything placed and stored, as pieces in the receiver's storage (they place them as they like). A kind that
   would take the receiver's storage past its limit of 99 stays with the giver.
5. **Belongings** (inventory and trade goods), within the receiver's stack and bag limits; what does not fit stays.
6. **Goodwill and titles** (reputation, section 5).

### Atomic: one transaction, plan first, then move

`server/legacy/move.ts` has two phases, run inside ONE `ctx.store.transact`:

1. **Plan** (read only). From the giver's life and the receiver's life it computes exactly what moves and what stays and why. No
   state is touched. If a rule is broken it returns a refusal and nothing was changed.
2. **Apply**. Moves the planned items, by removing from the giver and adding to the receiver, one kind after another. It re-checks
   every precondition first (the plan is recomputed in the same transaction, never trusted from earlier). If anything throws
   in this step (an invariant, a bug, a failing disk), the store discards ALL changes: neither life, nor the shop collection, nor
   the offer has changed. This is the store's own guarantee and is tested by throwing in the middle of an apply.

Items are *moved*, not copied: the giver's copy is removed in the same step the receiver's is added, per item, and a test checks
that every kind has exactly one holder before and after, including after a repeat.

### Idempotent

Every write takes a `requestId` (`<ms>:<uuid>`) and runs in `ctx.once` (receipt in the caller's own session record, saved in the
same transaction). The same id again answers the stored result with `duplicate: true` and moves nothing. A different id for the
same hand-over is a new request and is judged on the lives as they are NOW: the pieces are gone from the giver, so it can only
move what is left. For an offer, accepting twice moves once because the offer is removed in the transaction that accepts it.

### Recoverable: an offer is a record that either side can finish or end

- **(a) An heir needs no waiting**: it is the same person on the same account, so it runs in a single transaction at once.
  No half state can exist, so nothing needs recovery.
- **(b) A different character** first makes an OFFER: a record in the new collection `legacy` (`ctx.collection(db, 'legacy')`)
  holding the giver, the receiver and a MANIFEST of exactly what was offered (house city + size, car ids, shop opening time,
  furniture and belongings counts, the NPC ids and the title ids). Nothing moves when the offer is made. The receiver sees it in the Pass on
  screen and as a line in Messages -> Updates, and may **accept** or **decline**; the giver may **cancel**. An offer that nobody answers
  expires after 7 days (removed on the next request that touches the collection). Accepting runs the plan and the apply above in one transaction
  and removes the offer in the same step. So at every moment an item is either wholly the giver's or wholly the receiver's, and an
  unanswered offer holds nothing in limbo.
- **The giver's life changes between offer and accept** (they sold the car, upgraded the house, closed the shop, spent the
  furniture): accept re-checks the manifest against the giver as they are now. If anything offered is gone or different, **nothing
  moves, the offer is voided** and both are told ("This offer changed. Ask them again."). The giver may not hold two open offers (one at a
  time), so two offers cannot compete for one house; and even a second one would find the house already gone.
- **The receiver's life changes** (they now own the car, opened a shop, filled the storage): accept refuses with the reason and the offer
  STAYS, so they can fix it and accept, or decline.
- **The receiver refuses**: the offer is removed, nothing moved, the giver is told.
- **Either account is deleted or the character is erased**: its open offers are removed (`eraseLegacy`) in the same transaction.

### Who may receive (the cases)

**(a) The player's own next character (an heir).** The caller is the account's active character; the heir is one of the account's
set-aside characters that has a life. No acceptance: the account is the consent. No money, no limit on how often (it is one person); the
only bound is what a life can hold. The giver's account binding is enough, as for any other action on the character (the proof
that switching characters needs protects the account itself, and here nothing leaves the account). Because the heir is parked,
its life is not settled; it is brought to date when the player next plays it.

**(b) A different character (another player).** All of this must hold, or the offer is not made:

- both are people: neither is an agent character (see c), neither is muted, banned or in jail, and neither has blocked the other;
- **both are confirmed adults** (the age answer, `ctx.checks.adult`; not answered counts as not adult). A minor can pass things
  to their own heir but cannot give property to, or receive it from, another player. Reason: a gift of valuable property between
  a child and an unrelated person is exactly what the gift rules are there to prevent, and there is no way to check a relationship;
- they are **friends** (a gift needs friendship too) and not on the same device (the shop rule `sharedDevice`);
- **the existing transfer limits apply to the value**. Money is not passed at all (see below), but a house or car is money's worth, and
  without a bound a rich character could hand everything to a second character. So the worth of what is offered
  (house price by size, car price, the `paid` of the shop, furniture list price) is counted like a gift: the giver's lifetime gifts
  plus the worth of lifetime hand-overs may never exceed what they **earned from work** (`social.earned`, the same rule as
  `transfer.total`), a giver makes **one hand-over to a different character every 14 days** and a receiver accepts **one every
  14 days**, and the offer is made in the same rate limit as a gift (5 a minute). The daily gift caps (₦5,000 a gift) are not used,
  because they would make a house impossible to give; the 14 days and the earned-from-work ceiling do their job at this scale;
- belongings are at most 100 units in a hand-over to a different character.

**Money is not passed in either case.** The owner said property and reputation for an heir, and that is kept. For (b) the existing
gift (`POST /api/social/...transfer`) already moves money between friends under its limits, so a second way to move money would only be
a way around them. Passing a shop requires its cash box to be collected first, so no money moves hidden inside a shop.

### (c) What is never passed

- Real money and anything bought with it: purchases, commerce records, the account, its sign-in, its address, the device bindings,
  the commodity-market holdings, showcase listings, subscriptions and the launch bonus.
- Cash, deposits, loans and anything owed (rent, ground rent, ride debt, bills): debts are not property and stay where they are.
- Rented homes, jobs and careers, licences, offices, votes, sentences, friendships, family and Bae links, and the memories an NPC holds.
- Land parcels (this release; section 2).
- **Agent characters**: an AI-played character cannot give, and cannot be given property. It keeps the AI-played mark; an agent
  never receives things from people or sends things on, and is never asked to. The one door that is open is an agent character
  the owner already took over (`takeOverCharacter`): it is then the account's own and can pass to its own heirs like any character.
- Anything of a character whose life is in a trip (`intercity`), is in jail, or has an upgrade being built (for the house).

## 4. Notices and the gist

- The receiver gets a line in Messages -> Updates ("Ada has offered you a house, a car and a stall. Open Houses -> Pass on."), the
  giver gets one when it is answered, and the open game is told (`social-update`, a push after the commit, not before).
- **Gist.** Only for what is already public by its nature (a house, a stall): "A family house was passed on in Lagos." or
  "A stall in Yaba Market has a new owner." No names, no amounts, no list of contents, never for furniture, belongings,
  reputation or an offer that was declined. One line per completed hand-over of a house or shop, de-duplicated by key.

## 5. Reputation: what carries, bounded

- **Goodwill** with characters of the city (the NPCs): the giver's five closest (closeness 20 or more) carry a share of their closeness:
  an heir gets half (at most 40 points), a different character a quarter (at most 20). The receiver's value becomes the larger of what they
  had and the carried share, so it never lowers anyone's and a chain of hand-overs can only lose, not gain. The giver keeps their own: a
  relationship is not a thing that can be handed over, only introduced. Memories (`m`, `tags`) never carry.
- **Titles.** An heir may take up to two titles of the four day-titles the giver holds and the heir lacks (copied; the
  giver keeps theirs). A different character takes none.
- **Closeness with real players, friendships, Bae, family, the vote** never carry: they belong to the other person too.
- **A shop's rating and reputation** travel with the shop; they belong to the stall, not to the person.

## 6. The screen

Houses app -> **Pass on** (a card that loads only when the app opens; `defineAsyncComponent`). Steps: choose who (my next character,
or a friend), tick what to pass (each kind with its exact contents), see **the summary** (what moves, what stays and why, what the
receiver needs to accept) and **confirm**. An heir hand-over completes at once with a receipt; a friend gets an offer and the
screen shows "Waiting for Ada" with a **Cancel**. Incoming offers show the same summary with **Accept** and **Decline**. All text is
plain: no money amounts for the receiver, just what comes.

## 7. Compatibility

Old saves load: nothing in a life, a session or an account gains a required field. The only new stored thing is the optional
top-level collection `legacy = { v: 1, seq, offers: {}, done: [], people: {} }`, created by the first offer or hand-over, bounded
(`done` at most 200 lines, offers at most 500, `people` pruned to those with a recent hand-over).

## 8. Decisions that need the owner's eye

1. The house passes, the plot does not: the receiver's house takes the size and look on the receiver's own plot (land parcels wait).
2. A different character: friends, adults, one hand-over per 14 days each way, worth bounded by earned-from-work; no money.
3. Goodwill is copied at a bounded share, not moved, and only with NPCs.
4. The giver ends with the free starter house, never homeless.
