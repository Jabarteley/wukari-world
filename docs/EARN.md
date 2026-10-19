# Earn: real money for players, through Bachs

Built 18 October 2026 on the owner's choice of two of the three designs in
[the earning research](research/earning-2026-10-18/README.md): **the buyer pays the earner directly**, and **a creator pool from real
revenue**. Code: `src/earn/model.ts` (rules), `server/earn/` (service), `server/payments/bachs.ts` (the one Bachs client),
`server/routes/earn.ts` and `earn-admin.ts`, the Earn phone app (`src/app/features/earn/EarnApp.vue`), tickets in Plans, gig pay in Work,
and Admin → Moderation → Earn. Tests: `server/earn.test.ts`.

Bachs (bachs.io) is the provider the owner already uses in Goalmatic; the business boosts in [PROMOTE.md](PROMOTE.md) are paid through
it too. Game money is never part of any of this, and Allworld never holds a player's money. The public page `/money` (`server/money-page.ts`) says this for players,
and lists tickets, gig pay and the creator pool; change it when these rules change.

## Payout account

An adult with an Allworld account opens a Bachs **connected account** (Bachs Connect, `POST /v1/accounts`, Nigeria, individual) with
the merchant capabilities `ngn_card_collection` and `bank_transfer` (to be paid by buyers) and the recipient capabilities `transfers`
and `payouts` (to receive the creator pool and withdraw). Bachs's own hosted page (`account-links`) checks who they are and takes their
bank details: Allworld never sees an ID document or a bank number. Allworld keeps only the Bachs account id, the e-mail and a status:
`setup` (Bachs still needs something), `review` (Bachs is checking), `ready` (all four capabilities active). The status is re-read from
Bachs when the player comes back from its page, when they open Earn, and on "Check again".

## Paid by the buyer

- **Tickets.** A host with a ready account sets a price on their event (₦200 to ₦200,000, or free again). Going to a priced event needs
  a ticket. Buying one opens a Bachs checkout that is a **direct charge on the host's account** (`X-Account-Id`): the host is the
  merchant of record, the money lands in their Bachs balance, and Allworld's fee (5%, admin setting `earnTicketFee`) is taken by Bachs
  as the `platform_fee`. When Bachs confirms the payment the buyer is on the going list.
  A monthly "Meet your neighbours" meetup ([NEIGHBOURHOOD.md](NEIGHBOURHOOD.md)) can be ticketed the same way; its tickets are sold only to people whose
  location badge is in the meetup's local government.
- **Gigs.** The poster of a gig someone is doing (or has done) can pay the worker in real money (₦500 to ₦500,000), once, the same way,
  with a 10% fee (`earnGigFee`). The game-money reward of a gig is unchanged.
- **Confirmation.** Never from the browser: the server asks Bachs for the checkout and its payment (succeeded, in naira, for this
  reference and checkout), when the buyer comes back (`/?earn=<ref>`) and every five minutes on the heartbeat for two days.
- **Refunds and disputes** are the earner's, from their Bachs balance, as for any merchant. Allworld does not hold anything to refund.

## Creator pool

- **Points.** A creator gets a point when an adult with an account reacts to or replies to their public post: one point per person and
  creator a day; a person gives at most 20 points a day. Friends-only posts, minors, guests and self-reactions give nothing.
- **The pool** is `poolShare` (30%) of the month's business-boost revenue (`promote.revenue.months`). When the month ends it is split by
  points among creators with at least 20, each capped at 10% of the pool; what the cap or rounding leaves stays with Allworld.
- **Payouts** start at `poolThreshold` (₦10,000); a smaller share is carried to the next month (for up to 12 months). A month is
  payable 30 days after it ends, so reactions bought or swapped can be found first. The **founder only** presses Send in Admin: one Bachs
  transfer per creator with a ready account, idempotency key `aw-pool-<month>-<player>`, never twice, in the audit log. Bachs then pays
  it out to their bank.
- The pool is paid from money Allworld has already earned. It never takes money from players, never promises a return, and is not
  game money.

## Owner setup (not done by code)

1. Set the Worker secret `BACHS_API_KEY` (a `sk_sandbox_…` key first, then `sk_live_…`). Without it, Earn and card boosts say
   "opens soon"; bank-transfer boosts still work if `promoteBankDetails` is set.
2. Ask Bachs to enable **Connect** (platform) on the organisation; connected accounts, direct charges with `platform_fee`, and
   transfers need it.
3. Keep enough naira in Allworld's Bachs balance before pressing Send on a pool month.
4. Legal: the research's notes stand (a lawyer on the pool and on gigs, tax on creator income, published refund rules for tickets).
