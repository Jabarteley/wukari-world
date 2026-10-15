# Worldwide progression production verification

Worldwide missions, stories and journeys are live on joinallworld.com at `ac407c2c251c196e3539885d23df0143ac67bd51`. Public health confirms the final version. Actual Tokyo missions, both stories and permanent city/country collections passed, including a reload of the same player after the final deployment.

## Releases

| Gate | Source | Evidence |
| --- | --- | --- |
| Initial production release | `abec6f54ba42f1d9d2afb55c053019bc1b3b9567` | [Release38660509771](https://github.com/kromate/joinallworld/actions/runs/38660509771), [provider identity](provider-release.json), [live health](live-health-initial.json) |
| City-entry retry repair | `ac407c2c251c196e3539885d23df0143ac67bd51` | [Release38662285932](https://github.com/kromate/joinallworld/actions/runs/38662285932), [provider identity](provider-final.json), [final live health](live-health-final.json), [CI38662221371](https://github.com/kromate/joinallworld/actions/runs/38662221371) |

Both protected releases passed build, unchanged download limits, 17 source smoke checks and five Worker runtime checks before deployment. The final CI also passed the five-project typecheck and repository policy. Provider version `812d203a-a942-43b6-84aa-ce12af815f52` serves 100% and preserves `JOINALLWORLD` namespace `6b84e715f6c444f69971a0b6cde7868b`. No secrets, domain routes, storage namespace or migration identity were replaced. Public build IDs are truncated to 40 characters; provider metadata retains the full source identity.

Final CI startup bytes: raw 614,987/615,000, gzip 221,727/223,000, Brotli 194,265/195,600. Only 13 raw bytes remain. Future work must preserve lazy loading and the existing limits. The other computer is already working on startup room; do not duplicate that work or raise the cap.

## What was played in production

Astra used an isolated Chrome incognito session and disposable TokyoLiveQA player. Existing player sessions were preserved. Normal Start in Tokyo and settlement produced a Tokyo character and unlocked missions. Ordinary in-game transport and authored activities were used, with no admin grants, proof injection or external money.

- The local daily visit to Higahi Ohgishima East Park completed and paid its reward. It remained Collected after reload. Weekly Tokyo visits reached 2/3.
- First Steps in Tokyo and A Place Kept Open in Tokyo completed through four real eight-second Look around activities, fresh proof for each introduction and Help choice, authored challenges, and quiet-support finales.
- The first reload retained the first note, showed 1/2 and unlocked the sequel. The later reload retained both permanent notes and showed Tokyo 2/2, Familiar face in Tokyo, Japan 2/2 and Japan connections.
- The host was asleep. Only the explicit activity-note alternative was played; no real NPC conversation is claimed.
- The operator verified CSS 375×812 after compensating for browser zoom and inspected the exact screenshot bytes saved. This is a browser viewport check, not physical-phone performance evidence.

[Exact UI actions and session boundaries](../../agent-work/world-production-ui-20261015.md), [mission reward](ui-mission-reward.png), [completed Tokyo and Japan collections](ui-tokyo-complete-375.png).

## Live HTTP and city-file coverage

[Canonical live smoke](live-smoke.log) passed 16/16 checks against the adopted initial build: 1,992 requests in 223.5 seconds. It loaded separate synthetic lives in Lagos, Tokyo, Accra, Nairobi and Suva; fetched 1,910 files across all 284 open cities; and checked world pulse, socket, private Weave/dictionary and an ordinary action with its duplicate receipt. This is release/integration evidence, not 284 actual human story playthroughs. The later repair changes only the lazy creator entry component, not city content or game rules.

[Implementation and all-city engine/mission fixtures](../worldwide-progression-2026-10-15/README.md) cover 284 cities and 243 country/territory identities. Those are not 243 sovereign states. Stories use two shared structures grounded in existing local game content, not 568 independently researched plots.

## City-entry repair

A disposable guest clicked Start in Tokyo during the rollout while its page encountered missing city chunks. Its name and balance survived adoption/reload, but it had been created in Lagos. CreatorApp.startIn caught the failed download and silently fell back to the current city. A fresh post-adoption entry correctly created TokyoLiveQA in Tokyo.

The repair stops before character creation when the named city fails to load and displays a retry error. [46 existing start-flow checks](city-start-checks.log) pass. The [temporary source-function probe](city-start-probe.log) reports a rejected city load with zero character starts, and a successful Tokyo load with one start. This is not an actual browser offline simulation. No tests were added or modified.

## Agent-play compatibility and continuation

[Compatibility audit](../../agent-work/world-release-compat-20261015.md), [40 focused cases](agent-compat.log). Agent access remains derived from the runtime registry; server-only actions stay denied. Trusted origins distinguish humans, delegated agents and independent agents. Agent activity cannot count as meaningful human return. get_goals includes episode options and progress. Existing mission amounts, receipt IDs and claiming behavior remain intact.

The fresh Phase 11 branch at `c4d157d6` already contains worldwide runtime commit `6e5f4fd8`. No overlapping game/server source changes since common base `c4e93ee7` were identified. Its new agent errands remain unqualified and unmerged here. Phases 12/13a are on the other computer's integration branch, waiting for startup room. Read [its current programme record](../../../AGENT.md) before shared source edits; this release does not qualify those unreleased features.

Full Node/Worker suites were not rerun by the fast release workflow. Prior broad-suite limitations remain documented in the implementation handoff. Inter-city travel history, NPC conversation, physical devices and measured retention were not verified by this production playthrough.

[Current release work record](../../agent-work/worldwide-production-20261015.md) owns exact publication state, running resources and next action. QA tab 460560748 is preserved, viewport restored; existing local services were not changed.

## Final acceptance and preserved resources

On final build `ac407c2c`, one reload preserved TokyoLiveQA in Tokyo, balance ¥8,840, both completed stories and permanent notes, Tokyo/Japan 2/2 with both titles, the local daily visit Collected, and weekly visits 2/3. No gameplay was performed for this final check. Viewport reset succeeded and tab 460560748 remains on Missions. The earlier collected-mission and mobile collection screenshots were independently inspected by the parent.

The final retry component is also served at its new production URL with the error message, HTTP200 and a recorded hash: [compiled city-entry asset](city-entry-asset.json). Deployment logs, check logs, metadata and screenshots are covered by the [verification manifest](verification-manifest.json). Cloudflare's documented [eventually consistent code updates](https://developers.cloudflare.com/durable-objects/platform/known-issues/#code-updates) informed the wait for public runtime identity; acceptance came from actual health and player reload, not elapsed time.

Main's later `8e91106d` updates only the other computer's programme documentation. It was fast-forwarded into the integration checkout without changing released runtime source. This final evidence publication is documentation only. No local service, existing production actor, paid provider configuration or unmerged agent-play branch was changed.
