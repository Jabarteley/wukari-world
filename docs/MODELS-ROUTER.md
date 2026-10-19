# The model router and the US$2 a day budget

Every language-model call in the game goes through one module, `server/models/` (`ask()` in `router.ts`). Today the only caller is the
hosted guide (docs/COMPANION.md); house agents (Phase 10) and residents (Phase 13) use the same door. Design: docs/agent-plans/world-alive
DESIGN.md Part 7 and Part 8, "A mix of models". (docs/MODELS.md is something else: the 3D model library.)

## Calling it

```ts
const answer = await routerOf(ctx).ask({ purpose: 'agent-talk', messages, maxTokens: 220, playerId, carriesPlayerWords: true });
// { ok: true, text, model, provider, free, usage, costMicro, attempts } or { ok: false, why }
```

`why` is one of `off` (no provider has a key), `no-model` (nothing in the list is usable for this request), `budget`, `player-cap`,
`rate` (free room used up), `failed` (every model tried failed). Every caller must have words of its own for all of them; the guide
answers from its built-in replies.

## Providers (each optional)

| Provider | Secret | Address |
| --- | --- | --- |
| `gateway`, the Vercel AI Gateway | `AI_GATEWAY_API_KEY` (`AI_GATEWAY_BASE_URL` optional) | `https://ai-gateway.vercel.sh/v1/chat/completions` |
| `openrouter`, OpenRouter | `OPENROUTER_API_KEY` | `https://openrouter.ai/api/v1/chat/completions` |

A provider with no key is skipped. With only `AI_GATEWAY_API_KEY` the guide works exactly as before.

## Model lists are settings

A list is text, free models first, then paid: `openrouter:google/gemma-4-31b-it:free, gateway:openai/gpt-6-luna` (a bare id means the
gateway). The defaults are in `server/models/catalog.ts` (as of 14 Oct 2026); the admin page, World, Settings, edits one list per
purpose without a release. An empty or unreadable list means the default.

| Purpose | Setting | Default | Carries player words |
| --- | --- | --- | --- |
| `companion` | `modelsCompanion` | `COMPANION_MODEL`, then `COMPANION_FALLBACK_MODEL` (gpt-6-luna, grok-4.1-fast) | yes |
| `agent-talk` | `modelsAgentTalk` | the same two, paid | yes |
| `resident` | `modelsResident` | four free gateway models, five free OpenRouter models, then gpt-6-luna | no |
| `safety` | `modelsSafety` | `nvidia/nemotron-3.5-content-safety:free` on OpenRouter | no |

## The no-training rule

A request with `carriesPlayerWords: true` is only sent to PAID models (a model is free when its id ends in `:free` or `-free`, or the
price table says 0), and an OpenRouter request also carries `provider.data_collection: "deny"`. If a list holds only free models the
answer is `no-model`; nothing is sent. Free models see only lines with no player data.

## Money

- **The day** is the UTC day (as the providers' own free limits and invoices are). Old days are kept for 14 days.
- **The ledger** records, per day, the dollars spent (in millionths), requests, tokens, and the same by model and by purpose, free
  requests per provider, refusals, and per person. It is one stored collection, `modelRouter`, written lazily (`durable: false`);
  no words are stored in it. A person's id in it is the one-way id the guide already sends to the gateway.
- **Speech to text** is the one paid request that is not a chat: `router.spend(...)` (used by `server/models/transcribe.ts`) reserves a worst case against the same day cap and the same person caps before the request is sent, and books the real cost
  (seconds times the model's price) under the purpose `transcribe`. Only models the gateway lists as not training on audio are used (docs/CALLS.md).
- **Cost** comes from the answer's `usage` (tokens in and out) times the price table (`PRICES` in `catalog.ts`, US$ per million tokens;
  free is 0; a paid model missing from the table is priced US$1 / US$4 so the budget errs safe). With no `usage`, from the characters
  (4 per token). A failed request costs nothing.
- **The hard stop is US$2.00 for the day across everything.** Before calling a paid model the router adds the request's worst case
  (its whole prompt and every allowed output token) to the day's spend and the money already promised to requests in flight; if that
  passes the cap the request is refused as `budget` without calling. The check and the promise are one synchronous step, so a burst of
  parallel requests cannot all pass the same check. The setting `modelBudgetCents` can lower the cap, never raise it above 200. At the cap,
  free models still answer lines with no player words.
- **Per person per day:** `modelPlayerRequests` (default 200, `COMPANION_PLAYER_DAILY`) requests and `modelPlayerCents` (default 5) US
  cents of paid model. The guide keeps its own per-minute and per-day limiter as before.

## Free providers' rates

**OpenRouter** (official page: <https://openrouter.ai/docs/api-reference/limits>): free models are limited to 20 requests a minute, and to 50 a day
while less than US$10 of credit has ever been bought on the account, 1,000 a day from US$10. So `openrouterFreePerMinute` is 20 and
`openrouterFreePerDay` is 1,000: the owner bought US$15 of OpenRouter credit on 14 October 2026. (Without credit it would be 50.)

**Vercel AI Gateway** (official page: <https://vercel.com/docs/ai-gateway/rate-limits>, updated 2026-09-08): it publishes **no fixed numbers**. The free tier has
"lower per-model limits", the paid tier has none from the gateway (only the providers' own), and a 429 may carry a `retry-after` header, in seconds or as an
HTTP date. So the router has **no daily cap of its own for the gateway** (the old guessed 500 a day is gone, and so is the `gatewayFreePerDay` setting). It keeps one
generous safety limit, `gatewayFreePerMinute` (60), so a bug cannot flood the gateway; the gateway itself tells us when a model needs rest.

A free model is tried only while its provider has room; otherwise the next in the list is tried.

## Failures

A model that fails (5xx or any bad status, timeout, a bad answer, 404 "model gone") falls to the next in the list and rests for 5
minutes (30 for a gone model). **A 429 rests that one model for the time in its `retry-after` header** (whole or decimal seconds, or an HTTP date; at least a
second, at most an hour at a time: `retryAfterMs` in `server/models/router.ts`); the other models go on. When the header is missing or cannot be read, the model
backs off 1, then 2, then 5 minutes on consecutive 429s, and starts again at 1 minute after it answers once. A rejected key (401/403) rests the whole provider for 10 minutes. If every model is resting they are tried
anyway. The total time of a request is `timeoutMs` (the guide: `COMPANION_TIMEOUT_MS`); each model but the last gets 60 percent of what is left.

## The weekly report

On the heartbeat, at most once a week (and again after 6 hours if both lists failed), `weekly.ts` reads
`https://openrouter.ai/api/v1/models` and `https://ai-gateway.vercel.sh/v1/models` (no key needed) and stores which free models appeared
or left, and which configured models no list shows any more. Only on a host with `worldFeed` (the real hosts; a test opts in with a fake fetch).

## The free safety model

`safety.ts` `modelWordsSafe(router, text)`: one optional extra check on words a MODEL wrote, after the rule-based `agentWords` gate (which
stays the first and main one). Only an explicit "unsafe" blocks; a failure or unreadable answer is "unknown". Off by default (setting
`modelSafetyCheck`) because it adds a request to every reply; the guide calls it when on.

## On the admin page

The dashboard group "Models today (UTC day)" shows spend against the cap (and money in flight), answered requests, spend by model and by
purpose, free requests, refusals, which providers have keys, models resting and the weekly report. The model lists and numbers above
are under World, Settings (docs/ADMIN.md).

## Tests

`server/models/router.test.ts` (fake fetch only: fallback order, the no-training rule, the budget stop with a parallel burst, caps, rates,
a disappearing model, the weekly report), `server/companion.test.ts` (the guide through the router), `server/admin/links.test.ts`.
