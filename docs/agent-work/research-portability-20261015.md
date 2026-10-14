# Research portability checkpoint

- **Work ID:** `20261015-research-portability`
- **Scope:** copy the missing retention research corpus into this implementation checkout so another computer can inspect the research without the primary checkout.
- **Owner:** `world_journey_pattern`
- **Status:** `verified-local`
- **Implementation state:** documentation only; no source or runtime change.

## Copied corpus

Copied from the primary research corpus into the same repo-relative paths:

- `docs/research/allworld-retention-and-progression-2026-10-14.md`
- `docs/research/retention-source-inventory-2026-10-14.md`
- `docs/research/human-desires-evidence-2026-10-14.md`
- `docs/research/retention-game-evidence-2026-10-14.md`
- the complete `docs/research/retention-catalogue-2026-10-14/` directory (28 files, including the two reference PNGs)

All 32 requested files were absent in the implementation checkout. No requested file was divergent or skipped. The primary checkout was not edited. Existing implementation-worktree research files were left untouched.

## Link portability

Only Markdown link targets that pointed at the primary repository were changed. They now use repository-relative paths such as `../../src/...`, `../../server/...`, or `retention-catalogue-2026-10-14/...`. External source URLs, citations, prose, data files, and image bytes were preserved.

Evidence:

- 18 copied Markdown files have matching non-link content against the primary files.
- The link scan found 46 local Markdown targets; 45 resolve in this checkout.
- One intentionally uncopied target remains: `docs/research/allworld-differentiation-and-marketing-2026-10-14.md`, linked from `allworld-retention-and-progression-2026-10-14.md`. It was outside the requested corpus and is absent here.
- No copied Markdown retains a primary-checkout absolute link target.

## Takeover note

Another computer should recheck the current branch/SHA and resolve the one missing research reference from its own checkout or an authorized corpus sync. Local `/tmp` artifacts and primary-machine paths are not portable evidence. This checkpoint does not claim deployment, commit, push, or runtime validation.

## Joined-runtime evidence archive

On 15 October 2026, the same portability owner archived the completed current-main artifacts under `docs/research/retention-evidence-2026-10-15/`. The source state is joined runtime `899c60439022b2cb7082a1e88c930a3e4c41db36` (`899c`) with the fetched agent-play integration at `c921b8d9`; retention changes remain uncommitted. `README.md` and `manifest.json` classify direct-engine fixtures, local server/Worker fixtures, and actual local HTTP probes separately, with SHA-256 and byte counts.

The archived current evidence includes the 5-project typecheck, 84 focused tests, 74 agent-play tests, deterministic progression diagnostics, and project/cadence/season HTTP checks. Build, budget, browser, production, cohort, and phone gates remain open. Existing artifacts from the earlier `8ac05891` base remain explicitly older-base evidence.
