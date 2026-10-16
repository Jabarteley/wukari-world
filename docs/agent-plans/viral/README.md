# Making Allworld spread: start here

This folder is a complete brief for an agent that builds and releases the "spread" programme for Allworld on its own, from any
computer with access to GitHub. It assumes nothing else: no notes, no earlier chat, no other machine. It follows the "world alive"
programme (docs/agent-plans/world-alive/), which built the living world and is finished and live.

| File | What it is |
| --- | --- |
| [README.md](README.md) | This page: the goal, how to work, check and release, the rules. |
| [PLAN.md](PLAN.md) | The design the owner agreed on 16 October 2026 and the bet behind it. |
| [RESEARCH.md](RESEARCH.md) | The owner's research findings (16 October) that shaped the design. |
| [PHASES.md](PHASES.md) | The order of work: one phase at a time, each with scope, where the code is, acceptance and release. |
| [STATUS.md](STATUS.md) | The progress record and where each branch stopped. Read it first in every session; update it after every phase. |
| [PROMPTS.md](PROMPTS.md) | The research prompts the owner ran, kept for re-runs. |

## The goal

Allworld is a browser game (no install) at https://joinallworld.com: a life in 284 real-shaped cities, Lagos first, with homes,
jobs, money in each city's currency, real weather, festivals, table games, voice, AI house agents and about 850 AI residents who live
their own lives. People and their own AI assistants both play. The owner's question now: why should someone anywhere use it, tell a
friend and come back? PLAN.md answers with three things no other platform has together (a real world on a cheap phone; your own AI
living here; games inside a life) and a sharing machine around them. The owner decided on 16 October 2026: polish all three arena
games (Fight, Race, Football); stakes in game money only; first videos for Nigeria on TikTok and WhatsApp status.

## The repository and the live site

- Source: `https://github.com/kromate/joinallworld` (public, AGPL-3.0-or-later). Branch `main` is what is live or about to be.
- **Never use any other repository** for this game (`kromate/v1-allworld`, once `kromate/allworld`, is a discontinued older game).
- Live build: `curl -s https://joinallworld.com/api/health` shows `"build":"joinallworld-<first 27 characters of the commit>"`.
- Other agents push to `main` many times a day. Your work must sit on top of theirs, and **`main` must always be releasable**.
  Unfinished work stays on a branch or behind a setting that is off by default.
- The release workflow (`.github/workflows/joinallworld-release.yml`) builds, checks, seals and deploys by itself: the Cloudflare
  token and account id are set in the repository's `production` environment (since 14 October 2026).

## Before you write code

1. `git clone https://github.com/kromate/joinallworld.git && cd joinallworld`, Node.js 24 (`.nvmrc`), `npm ci`, then
   `npm run cities:assets` and `npm run words:assets` (server tests answer 503 without them).
2. Read, in order: `README.md`, `CONTRIBUTING.md`, `docs/DEVELOPING.md`, `docs/REFERENCE.md` (skim), `AGENT.md` at the repository
   root ("How the work is done": the lessons of the last programme), then this folder, then the docs each phase names
   (`docs/REALTIME-GAMES.md`, `docs/GAMES.md`, `docs/AGENTS.md`, `docs/SHARE-CARDS.md`, `docs/GIST.md`, `docs/FESTIVALS.md`,
   `docs/RESIDENTS.md`, `docs/HOUSE-AGENTS.md`, `docs/CLANS.md` if it exists).
3. `npm run typecheck` (clean on `main`); run the tests of the areas you touch. The full `npm test` and `npm run build` need about
   5 GB of memory; on a small machine use CI for them (below). STATUS.md lists tests that fail on `main` for reasons that are the
   owner's to decide; they are not yours to fix and must not block you.

## How to check a change

- `npm run typecheck` must be clean (`NODE_OPTIONS=--max-old-space-size=3584` on an 8 GB machine).
- Builds and the first-download limits are checked by CI: `gh workflow run CI -R kromate/joinallworld --ref <branch> -f full_checks=false`,
  then `gh run view <id> -R kromate/joinallworld --log | grep -E "(ok|OVER) +(STARTUP|SCENE_HOST|LOADING)"`. Every line must be
  `ok`. The limits in `src/budgets.ts` are **never raised**: new code goes in lazy chunks (`defineAsyncComponent`, dynamic
  `import()`). `vite.config.ts` puts every file under `src/game/` into the startup `engine` chunk unless it is exempted there.
- Tests next to the code you changed; `server/registry.test.ts` lists route modules and their namespaces: a new route module needs
  an entry there and in `HTTP_ROUTE_KEYS` (`src/types/protocol.ts`), which the smoke tests check.
- Compare any failure with untouched `origin/main` (a throwaway worktree) before deciding it is yours. Never `git stash` when
  several worktrees share a repository.
- Look at it running: `npm run dev` at http://127.0.0.1:5173/, a phone-sized window, as a new player and a returning one.

## How to release (every phase ends live)

1. `git fetch origin && git merge origin/main`; re-run the checks on the merged commit (CI on your branch).
2. `git push origin HEAD:main` (fast-forward only; never force-push).
3. `gh workflow run joinallworld-release.yml -R kromate/joinallworld --ref main -f source_sha=<40-hex sha of main> -f deploy=true -f publish_staging=false`,
   then `gh run watch <run id> -R kromate/joinallworld --exit-status`. If the deploy job fails at "Refuse stale deployment policy",
   `main` moved during the build: run it again on the new tip. A job cancelled with "not acquired by Runner" is a GitHub delay:
   `gh run rerun <id> --failed`.
4. Wait until `/api/health` shows your commit (up to five minutes), then
   `SMOKE_CITIES=lagos node --experimental-strip-types scripts/smoke.ts https://joinallworld.com` must print PASS.
5. Check the feature on the live site in a phone-sized browser.
6. Update STATUS.md (phase, commit, what a player gains, checks, anything left) and push it.

There is no rollback: player data lives in the Worker's Durable Object. A bad release is fixed forward.

## Rules

**The repository is public.** No secrets, keys, private details, local paths. No names of real people, and no names of other games
or apps in code, docs or commits (data sources and asset libraries may be named where their licence requires). Commit messages say
what changed for the player or the code.

**Assets and code we take in.** Only CC0, CC BY (attribution recorded in the pack's manifest and shown in credits) or our own
(made with Blender from scripts committed in the repository; see PHASES.md, "Making our own assets with Blender"); code
only under MIT, Apache 2.0 or BSD (never GPL in the client). Never copy a commercial game's models, sounds, names or art. Every
asset is listed in a manifest with source, licence and size; CI checks it.

**Players' data.** Stored shapes change only by adding optional fields; old saves keep loading. Game money is never real money and
can never be cashed out. Stakes are game money, capped by the existing table-stakes limits, called "stake" and "prize", with no
odds display and nothing that reads as betting.

**Code.** Strict TypeScript, erasable syntax only, `.ts` extensions in imports, `import type` for types. Code under `server/` that
both hosts use must not import Node-only modules. No new dependencies unless there is no reasonable way without one.

**AI.** The AI-played mark stays on every agent everywhere. Agents never ask people for money, personal details or meetings (the
tool layer enforces it). Under-18s get no romance from agents. Model spend at most US$2 a day; players' words only to paid models
that do not train on them. Agent boards stay apart from people's boards.

**Low-end phones and prepaid data.** Under 60,000–100,000 triangles and 60 draw calls per screen; 1K textures; each game cartridge
under 1.5 MB brotli; a 15-second reconnect window with a bot steering, never an instant forfeit; boards as 2D overlays with payloads
under 4 KB gzipped (RESEARCH.md).

**Live testing.** At most two test players named "Zz Test …"; no real accounts.

**Only the owner may:** set or change a secret, buy credits, spend on or post ads, accept new terms with an outside service, post
videos publicly, open the cartridge standard to outside builders, or decide anything PLAN.md or STATUS.md marks as the owner's.
Ask in your chat and list it in STATUS.md under "Questions for the owner"; carry on with what does not depend on the answer.
