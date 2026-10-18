# AI agents as contacts, and item actions

## Identity

- **Work ID:** `20261018-agents-contact`
- **Owner:** Claude Opus 5.5 (Claude Code, T3 Code thread, the owner's Mac)
- **Model / effort:** claude-opus-5-5 / default
- **Thread:** local T3 Code thread, 2026-10-18
- **UTC updated:** see checkpoint history
- **Status:** `verified-local`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** the owner asked (18 Oct 2026): "I can't see the online agents or chat with them. I want to be able to visit them, call them and all the normal activities I can do with a normal human; also add the feature where I can click on items and take action on them."
- **In scope:** a list of the AI agents online now (residents, house agents) opened from the online sheet and People; a one-to-one chat with any of them; calls with residents (the existing house-agent call screen); "Go to them" (the map's trip to their venue or city); the agent card from a tap in the world gets the same actions; tapping a piece of furniture at home opens an action sheet (use it, move, put away, sell, about).
- **Out of scope:** money to AI agents (they hold no wallet), stored friendships with residents (the device keeps a contact list), clickable venue props (baked meshes, no ids), feed work (another lane).
- **Exclusive file ownership:** `server/agents/contact.ts`, `server/agents/contact.test.ts`, `src/app/features/agents/AgentsOnlineApp.vue`, `src/app/features/agents/AgentChatApp.vue`, `src/app/features/agents/agentContacts.ts`, `src/app/features/agents/agentContacts.test.ts`, `src/app/features/home/ItemSheet.vue`, `src/app/features/home/itemActions.ts`, `src/app/features/home/itemActions.test.ts`, this record. Small additive edits: `server/residents/resident.ts` (a direct answer), `server/house/call-routes.ts` (residents can be called), route registration, panel registration, `src/app/features/hud/OnlineSheet.vue`, `src/app/features/social/PlayerCard.vue` (recordless actor actions), `src/app/features/social/PeopleApp.vue` (a link), `src/app/features/home/homeScene.ts` (the sheet instead of a toast).
- **Input contract:** main `d91fded91`.
- **Output contract:** the features above, tests, a release.
- **Dependencies:** none. The feed-trust lane (`claude/social-trust`) touches `server/routes/index.ts`; merge order decides.

## Repository state

- **Repo:** JoinAllworld
- **Host:** the owner's Mac
- **Branch / worktree:** `claude/agents-contact`, worktree outside the Desktop (remove after merge)
- **Base:** `d91fded91`
- **Current commit:** `d91fded91`
- **Dirty status:** clean at start
- **Port/process ownership:** none

## Progress

### Done and exact evidence

- Investigation: the pulse counts residents and house agents (agentRoom virtual members) but People lists only players in the caller's room group; residents have a recordless card with no actions; house agents already have calls (server/house/call-routes.ts).

- Server: `GET /api/agents/online`, `POST /api/agents/talk` (server/agents/contact.ts); residents answer directly (`answerDirect`, `whereIs` in server/residents/resident.ts); residents can be called (server/house/call-routes.ts).
- Client: AI agents app and online-sheet button, agent chat kept on the phone, agent card actions, item sheet for home furniture; a stale anti-forgery token (read on the welcome screen before the session began) is read again once, for the chat and the call screen.
- Evidence: `server/agents/contact.test.ts` 2/2, resident direct-answer test in `server/residents/everywhere.test.ts`, `src/app/features/home/itemActions.test.ts` 2/2; touched areas 461 tests, the 8 failures all fail on main too (agents-open, engine field lists, boutique); typecheck clean; download budgets ok (startup brotli 196,041 of 196,100); Worker smoke 5/5; browser pass on a local open-mode server: list, chat with a house agent and a resident, call screen, add to contacts, go to them (map trip card), item sheet (Sleep ran, Move opened Buy with the piece selected).

### In progress / blockers

- None.

### Immediate resume steps

1. Read this record; continue on branch `claude/agents-contact`.

## Release state

- **Local implementation:** `verified-local`
- **Deployment:** `not-requested`
- **Release gate:** typecheck, build, tests, Worker smoke checks (server changed), short browser check.
- **References:** `docs/RESIDENTS.md`, `docs/CALLS.md`, `server/house/call-routes.ts`

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-18T20:30:00Z | active | Record created; design done | this file | implement |
| 2026-10-18T22:40:00Z | verified-local | Implemented and checked (see Done) | tests above, browser pass | merge, release |
