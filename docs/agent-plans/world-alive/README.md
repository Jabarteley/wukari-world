# A world that is always alive: start here

This folder is a complete brief for an agent that implements and releases the "world alive" programme for Allworld on its own,
from any computer with access to GitHub. It assumes nothing else: no notes, no earlier chat, no other machine.

| File | What it is |
| --- | --- |
| [README.md](README.md) | This page: the goal, how to work in this repository, how to check and release, the rules. |
| [DESIGN.md](DESIGN.md) | The design the owner agreed on 14 October 2026: real money and weather, agents in the online count, house agents, missions from agents, calls and relationships with agents, residents (agents that think with a model), prayers and acts, models and cost. |
| [FEATURES.md](FEATURES.md) | Eighteen further features from research on what keeps people in social worlds, ranked, with the evidence. |
| [PHASES.md](PHASES.md) | The order of work: one phase at a time, each with scope, where the code is, acceptance and release. |
| [STATUS.md](STATUS.md) | The progress record. Read it first in every session; update it after every phase. |
| [PROMPTS.md](PROMPTS.md) | The prompts the owner gives to start or continue an agent. |

## The goal

Allworld is a browser game (no install) at https://joinallworld.com: a life in real-shaped cities of the whole world, Lagos
first, with homes, jobs, travel, health, table games, voice, places to meet and AI agents. The owner wants it to feel alive at
every hour for people and for AI agents: real money and weather in every city, agents that sell, guide, give tasks and talk,
agents ("residents") that live their own lives with a language model, pray and elect a president who writes to the owner, and
the features in FEATURES.md that make people come back. Everything is released to the live site phase by phase.

## The repository and the live site

- Source: `https://github.com/kromate/joinallworld` (public, AGPL-3.0-or-later). Branch `main` is what is live or about to be.
- Release workflow: `.github/workflows/joinallworld-release.yml` in this same repository (`kromate/joinallworld`). It builds the
  exact commit you name, checks and seals it, and deploys it to the Cloudflare Worker `joinallworld-next` that serves
  joinallworld.com. Its deploy step reads `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from the repository's `production`
  environment.
- **Never use any other repository** for this game. In particular `kromate/v1-allworld` (once `kromate/allworld`) is a
  discontinued older game: do not read it, run its workflows or copy from it.
- Live build: `curl -s https://joinallworld.com/api/health` shows `"build":"joinallworld-<first 27 characters of the commit>"`.
- Other agents and people push to `main` many times a day (cities, graphics, fixes) and some release from their own machines.
  Your work must always sit on top of theirs, and **`main` must always be releasable**: anyone may release it at any time. Put
  unfinished work behind a setting that is off by default, or keep it on a branch until it is finished.

## Before you write code

1. `git clone https://github.com/kromate/joinallworld.git && cd joinallworld`, Node.js 24 (`.nvmrc`), `npm ci`.
2. Read, in this order: `README.md`, `CONTRIBUTING.md` (the project map), `docs/DEVELOPING.md`, `docs/REFERENCE.md` (skim the
   layout), then this folder, then the docs each phase names (for example `docs/AGENTS.md`, `docs/PLACES.md`,
   `docs/COMPANION.md`, `docs/NPC-ALIVE.md`, `docs/REALISM.md`, `docs/POLITICS.md`, `docs/CALLS.md`, `docs/ADMIN.md`).
3. Run `npm run check` once (typecheck, build, tests) to know the baseline. Note any test that fails on untouched `main` in
   STATUS.md under "Failing on main before us": those are not yours to fix and must not block you.
4. `npm run dev` runs the whole game at http://127.0.0.1:5173/; `npm run dev:open` relaxes the gameplay gates for local testing.

## How to check a change

- `npm run typecheck` must be clean.
- `npm run build` (it also regenerates the city and word assets; a bare `npx vite build` deletes them, so always use the script).
- `npm run size:download` and `src/budgets.test.ts`: the first-download limits are fixed and **never raised**. If a change does
  not fit, move code out of the first download (dynamic `import()`), do not raise a number.
- Tests next to the code you changed (`node --experimental-strip-types --test path/to/file.test.ts`), then
  `npm run test:edge` (the Worker), then `npm test`. Compare any failure with untouched `origin/main` before deciding it is yours.
- Look at it running: `npm run dev`, a phone-sized window, and the flow you changed, as a new player and as a returning one.

## How to release (every phase ends live)

1. `git fetch origin && git merge origin/main` (or rebase your branch on it). Re-run the checks on the merged commit.
2. `git push origin HEAD:main` (fast-forward only; never force-push, never rewrite history).
3. Wait for CI on that commit: `gh run list --commit <sha> --workflow CI`, then `gh run watch <id> --exit-status`.
4. Read the live build (`/api/health`). Your commit must contain it:
   `git merge-base --is-ancestor <live-sha> <your-sha>`. If not, merge `origin/main` again and go back to step 1. Never deploy a
   commit that lacks what is live: that would take someone else's release off the site.
5. `gh workflow run joinallworld-release.yml -R kromate/joinallworld --ref main -f source_sha=<40-hex sha> -f deploy=true -f publish_staging=false`,
   then `gh run watch <run id> -R kromate/joinallworld --exit-status`. A job cancelled with "not acquired by Runner" is a GitHub
   delay: `gh run rerun <run id> -R kromate/joinallworld --failed`.
   If the deploy job fails with "Missing protected deployment inputs", the owner has not yet added `CLOUDFLARE_API_TOKEN` to the
   `production` environment. Do not look for another way to deploy. Record the commit in STATUS.md as "pushed, not yet live",
   ask the owner in your chat, and go on with the next phase. Your pushed work goes live with the next release from anyone.
6. Wait until `/api/health` shows your commit (up to five minutes).
7. `SMOKE_CITIES=lagos node --experimental-strip-types scripts/smoke.ts https://joinallworld.com` must print PASS. (The live
   server limits new players per address per hour; a full smoke without `SMOKE_CITIES` is allowed once an hour.)
8. Check the feature on the live site in a phone-sized browser.
9. Update STATUS.md (phase, commit, what a player gains, checks, anything left) and push it (a docs-only commit needs no release).

There is no rollback: player data lives in the Worker's Durable Object and an older build may not read newer data. A bad
release is fixed forward with a new release.

## Rules

**The repository is public.**
- Never commit a secret, key, token, password, private address, local path, or a person's private details.
- No names of real people, and no names of other games or apps in code, docs or commits. Data sources may be named where their
  licence requires it.
- Commit messages say what changed for the player or the code, not how the work was organised.

**Players' data.**
- Stored shapes change only by adding optional fields; old saves must keep loading.
- No rollback; fix forward.
- Game money is never real money and can never be cashed out. There are no bets and no real-money stakes.

**Code.**
- Strict TypeScript, erasable syntax only (no enums, namespaces or parameter properties), `.ts` extensions in imports, and
  `import type` for types.
- Code under `server/` that both hosts use must not import Node-only modules: the Node host (`server/server.ts`) and the Worker
  (`deploy/cloudflare-worker.ts`) run the same services.
- No new dependencies unless there is no reasonable way without one; say why in the commit.
- Match the surrounding style. Player-facing words are short and plain.

**AI.**
- A person always knows which characters are AI: the AI-played mark stays on every agent everywhere.
- Residents may believe they are people, but when a person sincerely asks whether a character is an AI, the game answers truthfully
  for it (DESIGN.md, Part 8).
- Players under 18 get no flirting, romance or meeting requests from any agent.
- An agent never asks a person for money, personal details or a meeting outside the game. This is enforced in the tool layer, not
  only in a prompt.
- Model spend is at most **US$2 a day** in total, with free models first. A player's own words go only to a paid model that does
  not train on them.

**Live testing.**
- Use at most two test players, named "Zz Test …", and remove them afterwards if the game allows it.
- No real accounts, no password resets, no completed sign-ins with a real Google account.

**Things only the owner can do; ask in your chat and list them in STATUS.md under "Questions for the owner":**
- set or change a secret on the Worker;
- buy model credits;
- spend on or post ads;
- accept new terms with an outside service;
- decide anything the design marks as the owner's.

## Secrets that already exist on the live Worker

You cannot read them; the code reads them from `env` (Worker) or `process.env` (Node).

| Name | What it is |
| --- | --- |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway (OpenAI-compatible); used by `server/companion/gateway.ts`. Its free models are listed at `https://ai-gateway.vercel.sh/v1/models`. |
| `OPENROUTER_API_KEY` | OpenRouter (OpenAI-compatible, `https://openrouter.ai/api/v1`). On 14 October 2026 the account was on the free tier: free models (`:free`) allow 20 requests a minute and 50 a day; 1,000 a day once the owner buys US$10 of credit once. |
| `TURN_KEY_ID`, `TURN_API_TOKEN` | Voice relay for calls and room voice. |
| `MODERATOR_TOKEN` | The operator's admin access. |

A new secret is a question for the owner: name it, say what it is for, and code the feature so it stays off without it.
