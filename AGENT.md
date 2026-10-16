# AGENT.md: the "world alive" work in flight

If you are an agent taking this over: this page says what is being worked on **right now**, where each piece stopped, and how to
continue. The full brief is in [docs/agent-plans/world-alive/](docs/agent-plans/world-alive/): read its README.md (rules), then
STATUS.md (what is live, the log, the questions for the owner), then PHASES.md. Repository-wide coordination is in
[AGENTS.md](AGENTS.md). When everything below is done, empty the "In flight" and "Still to do" sections and say so in STATUS.md.

Last updated: 16 October 2026 (spread programme planned; its first branches stopped mid-way, to be continued).

## In flight

Nothing is running. The "spread" programme is planned in [docs/agent-plans/viral/](docs/agent-plans/viral/) (README.md, PLAN.md,
RESEARCH.md, PHASES.md, STATUS.md). Four of its phases were started on 16 October 2026 and stopped mid-way; their unreviewed work is
on `claude/viral-cartridge`, `claude/viral-clans`, `claude/viral-agent-arena` and `claude/viral-assets` (viral/STATUS.md says exactly
where each stopped). The next agent continues those branches as viral/PHASES.md describes.

## Still to do

Everything in viral/PHASES.md, starting with Phase 0. Nothing else for an agent to start on its own.

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
