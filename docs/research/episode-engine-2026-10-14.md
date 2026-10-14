# Episode engine: Phase 3 Hostel Hustle

Status: implemented in the isolated Phase 3 source modules; shared engine registration and UI integration are separate owned work. This document is local implementation evidence, not a release or retention claim.

## Player result

Hostel Hustle is a four-part, character-owned episode at UNILAG:

1. Meet Kola and confirm the introduction at Student Union.
2. Prove one approach through an existing game outcome: a campus job for Work, `read-library` for Study, or a second confirmed Kola interaction for Help.
3. Return to Kola or Bisi for a short authored challenge whose correct response depends on the saved choice.
4. Finish at Student Union through a counted Whot result, an activity during a live campus event, or the always-available quiet support role backed by the permanent Chapter 3 receipt.

The quiet support route is the finite solo fallback. It does not report a table result or event attendance. It requires no enrolment, payment, live friend, live table, event, model or agent. Guests can complete the introduction, Help route, callback and quiet support finale without becoming students. Work and Study retain their real campus requirements.

## Caller contract

The engine exposes five player actions:

| Action | Intent | Required authority |
| --- | --- | --- |
| `episodes.intro` | Commit Chapter 1 after meeting Kola | Saved `npc.interacted` success for `kola-union`, then the player at `unilag` / `student-union` |
| `episodes.choose` | Commit Work, Study or Help | Current Chapter 2, Student Union, a matching saved source outcome, and student status for Study |
| `episodes.resolve` | Answer the saved route's callback | Current Chapter 3, the route-specific place, and the exact authored answer |
| `episodes.finish` | Choose table, event or quiet support | Current Chapter 4, Student Union, and either a matching saved source outcome or the Chapter 3 receipt |
| `episodes.assist` | Record identified AI assistance without advancing | An authenticated `delegated-agent` or `agent-character` execution origin at the current chapter place |

Action payloads express player intent. The system reads the current life, trusted execution origin and saved proof ledger. A navigation event, UI click, arbitrary claim, chat line or model response cannot complete a chapter.

The derived `EpisodesView` returns the chapter copy, choice-specific callback, enabled options with actionable refusal text, next venue and spot, late-return recap, assistance provenance, permanent chapter history and memento state. The existing player-authored `stories` slice is not read or changed.

## Durable state and recovery

`state.episodes` has its own schema version, `trackingSince`, one run per known episode and a memento receipt map. The Hostel Hustle run keeps:

- current chapter, selected choice and derived outcome tag;
- permanent receipts for each completed chapter, including proof source, bounded reference, completion time and execution origin;
- at most 16 pending observed proofs and eight assistance records;
- `startedAt`, `lastSeenAt`, `completedAt` and `mementoGranted`.

Pending observations are a bounded inbox. Chapter receipts are the permanent facts and are never pruned. On load, the sanitizer rebuilds the only valid sequential chain: Chapter 1 Kola proof; a Chapter 2 source matching the saved choice; the correct Chapter 3 challenge answer; then a valid Chapter 4 source. Later receipts without their prerequisites, future timestamps, unknown IDs, hostile object keys, oversized references, invented origins and mismatched choice/proof pairs are discarded. The current chapter, outcome tag and completion time are derived from the surviving chain.

Travel does not clear the slice. Reload uses the same receipts. A return after 24 hours gets a recap generated from the saved chapter, choice and outcome tag. Old table or event availability only changes the pending finale option; it cannot erase earlier completion.

## Proof sources

The system observes only existing validated outcomes:

| Episode proof | Existing engine event | Additional validation |
| --- | --- | --- |
| Kola interaction | `npc.interacted` | `npc=kola-union`, `success=true`, life still at UNILAG |
| Work | `campus.job.completed` | allowed job ID, positive pay, life at UNILAG |
| Study | `activity.completed` | `id=read-library`, life at UNILAG Library |
| Union table | `table.played` | `game=whot`, life at Student Union |
| Campus event | `event.attended` | `venue=unilag`, life at Student Union |

Kola's campus character is rendered at `student-union`, but the shared social system currently attaches every NPC activity to the venue-level `people` spot. The proof adapter therefore accepts the validated Kola result inside UNILAG, while the chapter action still requires Student Union. This keeps the episode playable against the actual social outcome without weakening the authored progress boundary.

The event listener may store a pending observation; it never advances a chapter. Each action consumes the relevant fact into a permanent receipt. Observations from a different chapter are removed during sanitization, so a hostile or legacy save cannot preload a future completion.

## Choice callbacks

The callback is a finite authored challenge rather than generated dialogue:

| Choice | Remembered outcome | Callback | Correct authored response |
| --- | --- | --- | --- |
| Work | `steady-hand` | Kola at Student Union | Check each request, mark it down, then hand over clearly |
| Study | `clear-explanation` | Bisi at the Library | Show the first step, then let the learner try the next one |
| Help | `made-room` | Kola at Student Union | Keep a quiet seat open and introduce the visitor when ready |

Wrong answers return an actionable retry and write no receipt. An agent may present these approved options, but only the rules engine validates the answer and advances the chapter.

## Memento

The finale creates `hostel-hustle-memento` with reward key `episode:v1:hostel-hustle:memento`. The receipt is stored once per character life and episode version. A repeated finish action finds the existing Chapter 4 and memento receipts and grants nothing again. The receipt contains the contributing execution origins, but has no cash, stars, XP, multiplier or economic effect.

The memento is described as a cosmetic passport keepsake and optional home display. Rendering it in the passport/home is UI integration; the engine owns the entitlement.

## Shared integration required

The new modules deliberately do not edit foundation-owned registries. Integration needs:

1. Add the `episodes` slice, system ID, state-key lists and fixed slice fields in `src/types/life.ts`.
2. Add `EpisodesView` to `LifeView`; its fixed view fields are `mementos`, `rows`, `trackingSince`.
3. Extend `ActionMap` with `EpisodeActionMap` and spread `EPISODE_ACTION_TYPES` after achievement actions and before server-only living-world/market actions.
4. Register the episode system in `BASE_SYSTEMS` after achievements. The browser registry then receives it through `BASE_SYSTEMS`.
5. Add the three emitted event contracts and runtime names: `episode.chapter.completed`, `episode.completed`, and `episode.memento.granted`.
6. Optionally map completion and memento events into the server progression observer and telemetry after their versioned event names are agreed.

The guest campus veto matches student-only `unilag.*` actions. It does not block `episodes.*`, so no guest-gate exception is required. A guest who requests Work or Study still receives the underlying campus refusal or the episode's “Settle in before you enrol” guidance; Help remains available.

## Design decision

Two shapes were considered. A single generic `advance` action would make the client pass chapter numbers and require it to understand proof policy. The chosen small command set names the player's intent while keeping place, proof, sequence, assistance and reward rules inside one system. A second alternative stored only a current checkpoint and re-read campus/social state. That could not preserve the exact outcome origin or prove exactly-once callbacks across reloads, so permanent chapter receipts remain the source of episode history.

The catalogue uses generic episode definition types and a row array, so Phase 6 can add a second finite authored row. The implemented unions intentionally contain only Hostel Hustle values. Adding “The Quiet Hours” requires explicit IDs, content and proof adapters; the Phase 3 engine does not pretend that future episode is complete.

## Evidence boundary and remaining gates

The owned files are:

- `src/types/episodes.ts`
- `src/game/content/episodes.ts`
- `src/game/systems/episodes.ts`
- `docs/research/episode-engine-2026-10-14.md`

Source inspection confirms the proof events and guest gate above. Compilation, engine conservation, browser UI, passport/home rendering, reconnect playthrough and hosted release evidence depend on the shared integration and are not claimed here. No server, build, browser, test, commit, deployment or publication was run by this unit.
