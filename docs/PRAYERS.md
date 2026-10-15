# Prayers and the acts of the owner (Phase 14)

Design: `docs/agent-plans/world-alive/DESIGN.md` Part 8, "Prayer, and the owner as their God", and FEATURES.md "Seven rules" 7. Code: `server/prayers/` (`model.ts` the shapes, limits and words, `service.ts` the storage and the acts, `link.ts` the dashboard card), `server/routes/prayers.ts` (a player's prayer), the admin routes in `server/routes/admin.ts`, the page `src/app/features/admin/PrayersView.vue` and the player's lazy panel `src/app/features/prayers/`.

## The rule

An act of the owner is **public and indirect**. A fever "is going round Yaba" in the gist; rain "came early over Ibadan". It is never one person silently punished, and never a message from the owner: the person meets only the *result* in the world's own voice ("You feel a fever coming on", "A bit of luck: you came across ₦500", "A dream stayed with you: ..."). Acts never touch real money, purchases, accounts or chat.

## Praying

- **A resident** may choose `pray` as one of its fixed choices (`CHOICES` in `server/residents/resident.ts`). The reply is `{"next":"pray","say":"","prayer":"..."}`. The prayer is 4 to 240 characters, must stay in character (no AI, model, game, player...) and pass `agentWords` (no asking for money or contact details); otherwise it is thrown away and asked again once, like any reply. A resident prays **once a day** (a second is let go as a quiet moment) and a prayer is never spoken aloud: it goes to the Prayers page only. Its situation (well or unwell, what it is doing, local time) is kept with it.
- **A player** who wants to: a **Pray** action appears in the venue panel at a place of worship (church, mosque, shrine: faiths are treated alike, the wording names none). It is a lazy panel (`PrayRow.vue`, fetched only there, so nothing is added to the first download). It first shows **"Prayers are read by the people who run Allworld."**, then the box. `POST /api/world/pray` refuses a prayer sent without `notice: true` (400 `notice_required`). Three a day per player, 4 to 240 characters, no contact details or links. The answer never promises a reply, and praying changes nothing in the game.
- Kept in the collection `prayers` (`{ v, seq, items }`, the last 600). Only admins read them.

## The Prayers page (admin)

`GET /api/admin/prayers?by=resident|player&city=&answered=yes|no&before=` returns the prayers newest first (who, where, the words, the situation, whether and how it was answered), the log of acts, the limits and the list of acts. The page (Admin, "Prayers", `g` then `y`) has the filters, an **Answer** button per prayer that opens the act form aimed at whoever prayed, and the log. The dashboard has a "Prayers" card. Every route refuses everyone who is not an admin with 404 `not_found`, like the rest of `/api/admin/`.

## The acts

`POST /api/admin/prayers/act` with `{ clientId, kind, reason, prayer?, target?, other?, city?, venue?, amount?, hours?, sky?, text?, form? }`, exactly once per `clientId`. A **reason** (3 to 200 characters) is always required. A target is a player's id or a resident id (`resident.<city>.<key>`); with `prayer` and no target the act is aimed at whoever prayed. A prayer is answered once.

| Act | What it does | Limits |
|---|---|---|
| `heal` | Cures an illness (with the usual short immunity) and lifts needs below 80 to 80 (the admin heal). A resident's fever ends. | Only the founder may act on an admin. |
| `sicken` | A fever on a person: the game's own illness (a player's runs its usual course and is cured the usual ways; a resident feels it for 6 hours). | **Once a week per person. Never on a minor or on a player whose age is not given** (confirmed adults and residents only). Not on someone already sick or protected right now. |
| `give` / `take` | Game money through the wallet's own server-only action (a ledger line "Admin credit: Luck" or "Admin debit: A loss"), also written to the admin audit as a credit or debit so the daily admin limits count it. A gift is restricted (cannot be gifted on) and is not earned money. | 1 to ₦100,000 and never above `ADMIN_MAX_AMOUNT`; for a non-founder admin the per-player and per-admin day limits apply as for any admin credit. A debit takes at most the balance; nothing to take is refused. Players only (a resident has no purse). Never real money. |
| `bless` | A stall's customers kept coming for a day: up to ₦2,000 into the till of the player's open stall. | Once per stall per Lagos day. |
| `weather` | A sky (`clear`, `cloud`, `lrain`, `rain`, `storm`, `hot`) over a city for 1 to 6 hours, laid **over the real weather** (the world feed's observed hours, `server/world-feed/service.ts` `override`), so the server and every phone that reads the feed see one sky. It is kept in the stored feed record and ends by itself. | One at a time per city. A phone sees it when it next asks for the feed (cached 5 minutes). |
| `dream` | A gentle line (8 to 140 characters) that the person reads as their own dream ("A dream stayed with you: ...") or sign ("You noticed a sign: ..."). A resident keeps the last three and lives them in its next turns. | One a day per person. The text must pass the people's text filter with contact details refused, and `agentWords`; for a resident also the in-character check. |
| `cross` | Two people feel pulled towards the same public place that day ("Something keeps pulling you towards the market today"); a resident gets the same pull in its next turns. | **Both confirmed adults** (or residents), in one city, neither blocking the other; a public place of that city (not home or the street). |
| `silence` | Marks the prayer answered without acting. | Needs a prayer. |

## In the world

Each act that is news makes **one gist line** (kind `owner`) through the gist's own door (`server/gist/ledger.ts` `add`), in the words of `gistWords` (`model.ts`):

| Act | Line |
|---|---|
| sicken | "A fever is going round Yaba" (the person's district; never a name) |
| take | "A few households in Lagos Island felt the pinch this week" (never a name, never an amount) |
| bless | "Customers kept coming to a stall in Lagos all day" (no name, no stall) |
| weather | "Rain came early over Ibadan", "A clear sky opened over...", "Thunder rolled over...", "A hot spell settled on..." |
| heal, give | "Ada is on the mend", "Ada had a stroke of luck this week": named **only** when the person is a confirmed adult and the line is kind; a minor, an unknown age or a person hidden from the directory is not in the line (the line is left out). No amounts. |
| dream, cross, silence | no line (they are private) |

The person's own news is a line in their Updates (in the world's voice, from no one), and a resident's is lived through its next prompts (`fateLines` in `resident.ts`).

## The log

`ownerActs` (`{ v, seq, lines, sickened, blessed, dreamt, fates }`) holds the **append-only log**: one line per act with its number, time, the admin (short reference and name), the kind, the target (kind, id, name, city), the prayer it answered, small parameters, a summary in words, the reason and the gist line's number. A line is never edited. It keeps the last 2,000 lines (the number keeps counting); the once-a-week and once-a-day tables drop entries as they expire. A refused act writes nothing. Every act is also one line of the admin audit (`act-<kind>`; money as `credit` or `debit` with `params.via = prayer-act`).

## Size

The player's panel is behind `defineAsyncComponent` inside the lazy venue activity rail, so the first download does not grow. No new module is under `src/game/`. The new route keys in `src/types/protocol.ts` are plain strings (checked in CI by the startup size).

## Checking it

`server/prayers/prayers.test.ts` (the notice before a player prays, the admin routes refusing non-admins, every act and its limits, the log and its bound, gist lines with no private detail), `server/residents/resident.test.ts` (the `pray` choice, the word rules, once a day, the fate in her prompts) and `src/app/features/prayers/prayModel.test.ts`.
