# Agent work record

## Identity

- **Work ID:** `2026-10-18-earn-bachs`
- **Owner:** Claude (social platform thread)
- **Model / effort:** claude-opus-5-5 / default
- **Thread:** local, T3 Code
- **UTC updated:** 2026-10-18
- **Status:** active
- **Work state:** implementation

## Goal and boundaries

- **Goal:** pay through Bachs (bachs.io): business boosts paid to Allworld; buyers paying earners directly (event tickets, gigs) through Bachs Connect direct charges with an Allworld platform fee; a monthly creator pool from Allworld's real revenue, paid by Bachs transfer after an admin approves.
- **In scope:** server/promote/*, server/routes/promote*.ts, server/payments/bachs.ts, server/earn/*, server/routes/earn*.ts, src/earn/*, src/types/earn.ts, src/types/promote.ts, src/app/features/earn/*, src/app/features/promote/BusinessesApp.vue, small hooks in server/feed/service.ts (event price), server/routes/feed.ts (pool points), src/app/features/feed/{PlansApp,WorkApp}.vue, admin view, docs/EARN.md, docs/PROMOTE.md.
- **Out of scope:** Goalmatic stores (docs/COMMERCE.md), game money, wrangler configuration.
- **Exclusive file ownership:** the new earn paths above; promote paths (own since 2026-10-18).
- **Dependencies:** Worker secret `BACHS_API_KEY` (owner), Bachs Connect enabled on the owner's Bachs organisation (owner).

## Repository state

- **Branch / worktree:** `claude/promote-bachs` at ~/Documents/Allworld-notes/work/promote-bachs
- **Base:** c16fb841c

## Progress

- Boosts switched from Paystack to Bachs; server/promote.test.ts 3/3.
- Production: `spaces3d`, `spacesModels`, `spacesScripts` confirmed on by the operator switch. Firebase phone provider enabled with an SMS allowlist (NG GH KE ZA GB US CA); SMS blocked on BILLING_NOT_ENABLED until the owner links billing; `TRUST_FIREBASE_PHONE_ENABLED` not set yet.

- Earn built: server/payments/bachs.ts, server/earn/{data,service}.ts, routes earn + earn-admin, Earn app, tickets in Plans, real-money gig pay in Work, Admin → Moderation → Earn, docs/EARN.md. server/earn.test.ts 4/4; typecheck clean; build ok.

## Next step

Full suite, browser pass (shots/earn-pass.mjs), release per relay/DEPLOY.md.
