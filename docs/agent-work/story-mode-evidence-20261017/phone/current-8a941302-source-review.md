# Built repair review

Compared origin/main with 8a94130206815cf8905e7a48402a6e82a7c70f37 for journeys.ts, progression-slices.ts and the CI artifact condition. Read provider/gate and StoryModePanel implementation. No source edits or tests run.

- journeys.ts: lazy nullish assignment avoids reading the progression proxy during module evaluation. If JOURNEYS.map throws before the provider is ready, the assignment never completes and the cache remains null for a later retry. Provider installation is validated before its installed pointer changes and replacement is rejected, supporting the persistent lookup cache. This does not replace startup barriers: client progressionFor, story-capability loading and passport loading remain necessary.
- progression-slices.ts: freshSlice still validates before the state write; FRESH creates independent objects and trackingSince behavior remains unchanged. Object.assign uses a closed system-id union, not an input-controlled key. It loses the explicit generic write helper but introduces no observed runtime behavior change. This is per-slice validation-before-write, not a transaction across all systems. Existing tests cover independent containers and saved-data classification; no new execution claimed.
- CI: the changed predicate adds codex/story- branches to the existing Story bundle artifact upload. It changes neither build behavior nor deployment. Exact CI39094348275 green was supplied by the parent; this review did not independently query CI.

## Performance recommendation

Keep the 300ms acceptance gate open. The single current pair was315/293ms from locator-click call start through returned DOM observation. Automation transport/actionability/observation overhead is included; actual application latency is unknown. Do not relabel315 as passing or repeat until a fast sample appears.

StoryModePanel renders284 keyed city rows while native details is closed. Conditional mounting based on native details.open is a reasonable small optional optimization, retaining the summary and native keyboard toggle with current rows on each open. The present timing evidence does not establish those rows as the root cause, so a performance fix is not justified solely by the315ms result.

A separately authorized observational development proxy can measure trusted click event.timeStamp to target aria-pressed plus matching successful announcement and two animation frames, emitting only timing output for read-only DOM inspection. Report it as instrumented event-to-DOM-plus-frame timing, not actual paint proof or unchanged-origin proof. Preserve the original pair, use one ordered pair, ensure same performance time origin, expected source/target, one outstanding click, and bounded failures. No hidden application state or page-scope evaluate listeners. Faithful WebSocket/session/origin forwarding must be verified or limitations stated.
