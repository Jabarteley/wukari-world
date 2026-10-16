# AGENT.md: the "world alive" work in flight

If you are an agent taking this over: this page says what is being worked on **right now**, where each piece stopped, and how to
continue. The full brief is in [docs/agent-plans/world-alive/](docs/agent-plans/world-alive/): read its README.md (rules), then
STATUS.md (what is live, the log, the questions for the owner), then PHASES.md. Repository-wide coordination is in
[AGENTS.md](AGENTS.md). When everything below is done, empty the "In flight" and "Still to do" sections and say so in STATUS.md.

Last updated: 16 October 2026 (nothing in flight).

## In flight

Nothing. The owner's decisions of 15 and 16 October are live (releases 14 and 15) and main's tests were repaired (release 16).

## Still to do

A new programme is planned but not started: [docs/agent-plans/viral/PLAN.md](docs/agent-plans/viral/PLAN.md) (games within
the game, clans and city leagues, the agent arena, clips and videos). It waits on the owner's research (PROMPTS.md) and answers
(viral/STATUS.md). Nothing else for an agent to start on its own. Eleven tests are left failing on purpose because they need the owner's judgement
(market scene anchors, ambient crowd size, two Abuja scenes, sedan geometry hashes, the country count, one remote homeward
route): see "Failing on `main` before us" in [docs/agent-plans/world-alive/STATUS.md](docs/agent-plans/world-alive/STATUS.md).
If you are given new work, add it here.

## How the work is done (learned the hard way)

- **Clone outside iCloud.** On the owner's Mac the Desktop is synced by iCloud, and `git push`/`fetch` hang forever in a checkout
  there. Work in a fresh clone outside the Desktop. Never touch the Desktop checkout: other agents keep uncommitted drafts in it.
- **One branch per piece of work**, from `origin/main` (or `origin/claude/world-alive` when it needs unreleased work), reviewed,
  merged into the integration branch `claude/world-alive`, checked, then pushed to `main` (fast-forward only) and released.
- **Builds run on CI, not locally.** The build needs about 5 GB of memory. Check builds and download sizes with
  `gh workflow run CI -R kromate/joinallworld --ref <branch> -f full_checks=false`, then
  `gh run view <id> -R kromate/joinallworld --log | grep -E "(ok|OVER) +(STARTUP|SCENE_HOST|LOADING)"`. Every line must be ok;
  the limits in `src/budgets.ts` are never raised.
- **The first download is nearly full.** `vite.config.ts` puts every file under `src/game/` into the `engine` chunk, which is in the
  first download, even when only lazy code or the server imports it; such a module gets an exception there. To see what is in a
  chunk, push a throwaway branch whose `.github/workflows/ci.yml` uploads `dist/assets/<chunk>-*.js` as an artifact, download it,
  compare with `main`, and delete the branch afterwards.
- **Locally:** typecheck with `NODE_OPTIONS=--max-old-space-size=3584 npm run typecheck`. Before server tests run
  `npm run cities:assets` and `npm run words:assets`, or they answer 503. Run heavy commands through
  `node --experimental-strip-types scripts/agent-slot.ts heavy -- <command>` when several agents share the machine. Never use
  `git stash` (it is shared by every worktree). In zsh, a list of test files in a variable needs `${=LIST}` to split.
- **Releasing:** `gh workflow run joinallworld-release.yml -R kromate/joinallworld --ref main -f source_sha=<40-hex sha> -f deploy=true -f publish_staging=false`,
  then `gh run watch`. Since 14 October the workflow deploys by itself (`CLOUDFLARE_API_TOKEN` secret and `ALLWORLD_CF_ACCOUNT_ID`
  variable are set in the `production` environment). The live commit is in `https://joinallworld.com/api/health`; it can take a few
  minutes to change. If the deploy job fails at "Refuse stale deployment policy", `main` moved during the run: release the new
  tip. Always merge `origin/main` before releasing: other agents release too, and your commit must contain what is live.
- **Subagents** each get: the rules of README.md, their phase, a branch and worktree, the size facts above, "commit with the
  Co-Authored-By line, push your branch, do not push to main or deploy", and a report of commits, tests, deviations and questions.
  Review what they report before merging: in this programme reviews caught a jail cap bug, a missing route module, a duplicated
  component and stale tests.
