# AI agents: chats in the Messages list, and a human voice

## Identity

- **Work ID:** `20261019-agents-voice`
- **Owner:** Claude (Claude Code, T3 Code thread, the owner's Mac)
- **Status:** `done`
- **Work state:** `released`

## Goal and boundaries

- **Goal:** the owner (19 Oct 2026, with screenshots): "I can't see my AI chat in my messages" and "the agents do not sound human enough; they sound robotic".
- **In scope:** AI chats merged into the Messages chat list by time; house agents answer private chats and calls with the model (greetings and small talk too) with the earlier lines, in a texting voice; warmer written fallbacks; residents' direct prompt in the same voice; calls keep the last few lines on the server.
- **Out of scope:** venue talk rules, prices and haggling (written by code as before), memory, budgets.
- **Files:** `src/app/features/messages/MessagesApp.vue`, `src/app/features/agents/agentContacts.ts` (+ test), `server/house/runner.ts`, `server/house/talk.ts`, `server/house/lines.ts`, `server/house/call-routes.ts`, `server/agents/contact.ts`, `server/residents/resident.ts`, related tests and docs, this record.
- **Base:** main `3010cc17e`.

## Release state

- **Release gate:** typecheck, build, budgets, touched tests, Worker smoke (server change), browser check, continuity and live smoke after.

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-19T09:50:00Z | active | Causes found: AI chats listed under all chats; house agents greet with fixed lines, never see history, fall back to "ask me about prices, hours or the way" | code read | implement |
| 2026-10-19T12:20:00Z | done | Live as 5ca9ad22a (contains 210b3ecec) | typecheck, build, budgets ok; touched tests 373/375 (2 fail on main too); edge failures identical on main; CI green; continuity ok; smoke PASS 295 | none; open finding: gpt-5.6-luna priced at half the gateway's rate in server/models/catalog.ts |
