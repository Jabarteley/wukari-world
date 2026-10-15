# Bespoke local missions and stories

Status: in progress. This directory is a handoff and review trail, not a release certificate. The previously deployed shared-template runtime remains the production baseline. No bespoke authored batch has yet passed the complete semantic, gameplay, save, agent and UI acceptance gates.

## What changes

The intended catalogue has two separately authored tales and six local mission entries per supported city, plus a distinct country arc for each authoritative game country/territory identity. The audited scope is 284 cities and 243 identities: 568 new tales, 1,704 mission entries, and 243 arc profiles. Original stories and their rewards remain registered; new stories receive separate permanent identities and collections. Fundamental human desires describe the individual story's motivation, never a national character.

A batch activates only after all cities for every included country are present and reviewed. Cities outside accepted batches retain their existing playable content while authoring continues. Incremental activation must be reported with exact accepted counts; it must not be described as complete worldwide bespoke coverage.

## Portable inputs and checkpoints

- `authoring-input.json`: audited existing game hosts, places and supported activities. Game context, not independently verified geographic fact.
- `assignments.json` and `input-01.json` through `input-08.json`: whole-country ownership partitions.
- `AUTHORING.md`: literal-data contract, plot quality, grounding and mission proof rules.
- `legacy-save.json`: synthetic completed save containing all 568 original world story receipts.
- `legacy-engine-baseline.json`: the old engine matrix captured at c42a4757 before integration changes.
- `draft-batches/`: interrupted, incomplete and partly rejected work, kept outside compilation. Read its README before restoring anything.
- `batch-01-validation.json`: structural/exact-uniqueness checkpoint only; does not establish semantic or runtime acceptance.

Primary coordinator: `docs/agent-work/unique-local-content-20261015.md`. Each worker has its own `docs/agent-work/local-tales-NN-20261015.md`; integration has a separate work record. Only the coordinator maintains `docs/AGENT-COORDINATION.md` and publishes combined changes.

## Required gates

1. Run `node --experimental-strip-types scripts/city/check-local-tales.ts <explicit accepted batch paths> --output <report.json>`; do not include draft snapshots. This checks country completeness, supported identities, actual named seed anchors, tuple/task/count rules, desires, missing values and normalized exact duplicate fields.
2. Review actual setup, constraint, decision and resolution. Unique strings can still encode a shared plot. Repeated props, a different city name, or reworded moral advice do not prove uniqueness.
3. Mission labels must describe real observed actions. `people` counts greetings with distinct game regulars; it does not prove questions were asked or that regulars are fictional performers. `places` accepts any distinct eligible venues, not a specific named pair. Activity rows prove the registered activity, not a performed fictional scene. Put story motivation in purpose text.
4. Exercise work/study/help, activity-only night introduction/help, both finales, wrong-city/missing proof, duplicate grants, saved branch/reload and travel. Legacy generic stories must not auto-start for a new player in an accepted city, while saved old histories remain usable.
5. Reload `legacy-save.json`: preserve all 568 receipt values and all 527 completed city/country collections; never reinterpret old awards as new authored awards. The separate Akoka collection remains unchanged.
6. Run relevant existing mission/retention/agent checks, typecheck, build, city download budgets and smoke. Inspect actual lazy graph; keep authored catalogue bytes outside initial downloads. No new tracked tests are authorized for this task.
7. Inspect representative new city and country stories through the actual UI, including beyond Nigeria. Record exact revision and scope. A script injecting valid proof events does not establish real activity or browser behavior.

## Usage and publication

Stop all workers and all task work at 5% account usage remaining. Last checked weekly usage was 90% used / 10% remaining; re-read the live tool rather than relying on this note. Six authoring batches were held after the cap clarification; batches01/02 and a bounded implementation worker are the only active lanes at this checkpoint. Monetary cost and per-worker token usage are unknown.

Contract/inventory/baseline milestone is on main at9b76461a; checker and paused draft archives at313e8c26. These are preparation milestones, not gameplay releases. Fetch current main before publishing the next checked unit. Preserve the other computer's startup and agent-play work; do not merge unreleased programme branches automatically. No new production deployment is requested in this task.

## Empty-registry implementation checkpoint

The factories, lookup preservation, separate collections and lazy chunk routing are implemented with zero accepted batches. Sol's five-project typecheck passes. Parent's serial existing checks pass48/48, and the legacy save reload preserves568runs,568exactmementos and527completedcity/countrycollections. See empty-registry-focused.log and empty-registry-save-check.json. These checks do not exercise authored activation; content and its UI are still pending.
