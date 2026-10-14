# Jail you can play

A sentence (docs/POLITICS.md section 5) used to be a wait. Now there is something to do inside, none of it needed: the sentence still
ends by time, by bail, by a court's ruling or by an operator, exactly as before.

| What | Rule |
| --- | --- |
| Prison jobs | Kitchen (3 min off), laundry (2), library (4). One tap each. The same job cannot be repeated for 90 seconds to 3 minutes. Jobs and visits together take at most **20 minutes a Lagos day** off a sentence, and never the last minute. |
| Community service | For sentences of **20 minutes or less**, once per sentence: half of what is left comes off. It does not use the daily cap (the short sentence is the bound). |
| Parole | Opens when **half the sentence** (counted from the arrest) is served. A hearing is a plain check: no offence recorded against the prisoner and no report made about them since the arrest. Granted: free at once. Refused: one hearing per sentence. Asking early costs nothing. |
| Visitors | A **friend** (both ways, neither blocking) may visit a prisoner **10:00 to 16:00 Lagos time**, once per half hour per visitor. The prisoner is told; the visit takes 1 minute off (inside the daily cap). Messages and calls were never stopped, so the visit is a gesture, the talk happens there. A prisoner cannot visit. |

## Where it lives

* Rules, numbers, pure: `server/politics/prison.ts` (tests `server/politics/prison.test.ts`). Nothing reads a clock.
* Routes (`server/routes/politics.ts`): `POST /api/politics/justice/prison/work` `{ cityId, job, requestId }` (`job` is `kitchen`, `laundry`, `library` or `service`), `…/prison/parole` `{ cityId, requestId }`, `…/prison/visit` `{ cityId, to }`. Host tests: `server/politics-prison.test.ts`.
* The Justice overview carries `you.jail.prison` (jobs, what is left of today's cap, service, parole state, visiting hours) and, for someone who is free, `you.visitable` (their jailed friends).
* UI: `src/app/features/politics/PrisonCard.vue` (words in `prisonModel.ts`), fetched with the Justice tab; the visit buttons sit in `PoliticsApp.vue` under the jail notice.
* The gate that stops travel and work (`server/politics/gate.ts`) is unchanged: the prison routes are not in `JAIL_STOPS`.

## Stored data

Only optional fields were added to `JailRecord` (`src/types/politics.ts`): `cutDay`, `cutMin`, `jobs`, `service`, `parole`, `visits`. A sentence saved earlier has none of them: it shows the same time, offers the same jobs and ends by time (tested in both test files). Nothing is stored for a player who is free.

## Not done

Mood or need effects of a visit, a prison room to walk in, and a paid fine instead of service. Each would be additive.
