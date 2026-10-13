# Gameplay improvements from open-source projects

Researched 13 October 2026 against Allworld `5179285a25cb616e9c8ef5b137150a5a6f6e05e7`. This is a source-based design proposal. It does not establish what is deployed or what players currently experience. Repository snapshots, including default-branch commit dates and licenses, are in [repository-snapshots.json](./repository-snapshots.json).

## Best first gameplay change

Give a new guest a short activity with a meaningful move, visible consequence, and persistent result. The current starter goal is “Play a round of Ayo,” completed by `play-ayo`, with a seven-second hint and a 500 game-cash reward (`src/game/content/goals.ts:32`). Meanwhile, the existing table engine already supports interactive Whot, Penalties, Chess and Weave (`src/tables/games.ts:11`). Its `TableRules` contract has pure move validation, state transitions, per-seat views, bots, timeouts and outcomes (`src/tables/rules.ts:48`). The service numbers moves and handles repeated/stale requests (`server/growth/tables.ts:12`).

The implementation opportunity is therefore to connect a satisfying first move to this existing authority. It is not necessary to add another multiplayer engine to make the first minute interactive. This is a product hypothesis, not a measured retention claim.

Two distinct options need to be compared in a later implementation unit:

- Route the guest to an existing very short Penalties round with a house player. This reuses real gameplay quickly but changes the Ayo-specific starter promise.
- Implement one explicitly named, locally appropriate Ayo rules variant behind `TableRules`. This preserves the theme but requires rules research, a board, a bot, timeout behavior and reward integration. Do not silently treat all mancala variants as identical.

A suggested first-session sequence is arrive → make a move → see the result → greet the opponent → discover one nearby activity → choose whether to settle. Settlement should not be required before the initial playable moment. Existing rewards must remain server-owned and once-only.

## Repository shortlist and decisions

| Project | Evidence checked | Useful idea for Allworld | Decision |
| --- | --- | --- | --- |
| [boardgame.io](https://github.com/boardgameio/boardgame.io/tree/5e9a2c94bde803fae8b081958c406c4d0a7be8ae) | MIT; not archived; default-branch commit 10 August 2026. Pure game rules, phases, turns and multiplayer engine. | Explicit phases for a playable tutorial or job: instruction → player choice → consequence → result. | Study the rules structure; retain Allworld's existing table service. |
| [Yuka](https://github.com/Mugen87/yuka/tree/10591304811222d6856020d5de129b39ef43b58d) | MIT; not archived. Latest default-branch commit returned by GitHub is 16 January 2023, despite repository `pushed_at` being October 2026. | Goal scoring, finite-state NPC behavior, steering and arrival. | Study first; add only for a bounded interactive NPC need. Do not label it recently developed from `pushed_at` alone. |
| [inkjs](https://github.com/y-lohse/inkjs/tree/6b1153410ab1c4bcfd9ef04eb2f0107f36be7778) | MIT; not archived; default-branch commit 1 September 2026; source package version 2.4.0. Ink narrative runtime with choices and serialized story state. | Authored conversations, recurring residents and branching small quests. | Candidate for an optional, separately loaded narrative feature; not a prerequisite for a single small quest. |
| [Colyseus](https://github.com/colyseus/colyseus/tree/67f203aba558ce4a1090618bff01d01a3aa27099) | MIT; not archived; default-branch commit 9 October 2026. Authoritative rooms, reconnection and state synchronization. | Reference for snapshot boundaries, remote movement and room lifecycle. | Study; replacing the existing Node/Worker room system has a large migration cost. |
| [bitECS](https://github.com/NateTheGreatt/bitECS/tree/1585cdb4ae9a6586aef5e4d9d30d7039e22cd543) | MPL-2.0; not archived; default-branch commit 6 December 2025. Data-oriented ECS library. | A possible representation for large, measured actor workloads. | Defer. An ECS rewrite is not evidence of faster gameplay; Allworld has bounded crowds already. |

These are repository declarations, not blanket permission for unrelated sample assets. A chosen dependency must be pinned and its specific license/notice files retained.

## Four bounded gameplay proposals

### 1. Interactive first minute

Use [boardgame.io's phase design](https://github.com/boardgameio/boardgame.io/blob/5e9a2c94bde803fae8b081958c406c4d0a7be8ae/docs/documentation/phases.md) as a reference. Phases determine which moves and turn rules are valid, with explicit transitions. Allworld can express this in its own pure rules without adopting the engine.

For a short starter round, the rules should distinguish tutorial explanation, an accepted human move, a house response, and a completed round. A timer expiring is not proof that the player performed a move. Keep a skip/leave route, reconnect to the existing session, and award the existing goal only from an accepted result. Preserve historical `play-ayo` saves until the migration behavior is explicitly designed.

Relevant source: `src/game/content/goals.ts`, `src/game/systems/goals.ts`, `src/tables/rules.ts`, `src/tables/games.ts`, `server/growth/tables.ts`, `src/app/features/tables/`.

Acceptance: a fresh guest can make an actual move; an invalid move gives a usable correction; backgrounding or reconnecting restores the same round; replaying completion cannot repeat the reward; a player can leave without becoming stuck. Compare actual time to first accepted move and round completion before claiming improvement.

### 2. One resident with an observable daily purpose

Allworld's ambient planner already derives people and tracks from city, venue and time, routes around furniture, and uses stable waves (`src/scene/ambient/plan.ts:3`). The layer caps foreground figures and limits animation to a 12-second wake window (`src/scene/ambient/layer.ts:7`). Generic wandering, basic schedules and pathfinding are therefore not missing features.

The new opportunity is a named resident whose activity connects to player action: a market seller walks to a stall, waits for a fictional restock, acknowledges delivery, then serves customers. Use a small explicit state model such as `travelling | ready | serving | closing`; render it through the existing ambient actor layer.

Yuka's [`Think.arbitrate()`](https://github.com/Mugen87/yuka/blob/10591304811222d6856020d5de129b39ef43b58d/src/goal/Think.js#L105) selects a goal using desirability and a character bias. Its [`ArriveBehavior`](https://github.com/Mugen87/yuka/blob/10591304811222d6856020d5de129b39ef43b58d/src/steering/behaviors/ArriveBehavior.js) slows an agent near a destination. Borrow this separation of decision, route and movement only where authored states become difficult to maintain. One scripted seller does not justify a new AI dependency.

Background ambience may continue to be derived independently on clients. An NPC's shared inventory, quest progress or payout must have a server owner. Two clients running Yuka locally will not automatically agree about shared outcomes. Use the existing fictional NPC inventory/restock service boundary; never route free NPC deliveries into merchant stock that can be cashed out.

Acceptance: two players see the same named resident outcome; arrival and leaving are legible; the resident can be interacted with; no idle perpetual render loop is introduced; retries do not duplicate inventory or wages.

### 3. Short authored conversations that lead to actions

Allworld already has personal home scenes with published revisions and a current moment index (`src/game/systems/stories.ts:60`). That system serves player-authored home scenes. It is not a branching quest runtime and should not be silently repurposed as one.

For a larger authored dialogue catalogue, [inkjs](https://github.com/y-lohse/inkjs/blob/6b1153410ab1c4bcfd9ef04eb2f0107f36be7778/README.md) offers story continuation and choices; [`StoryState.ToJson()` and `LoadJson()`](https://github.com/y-lohse/inkjs/blob/6b1153410ab1c4bcfd9ef04eb2f0107f36be7778/src/engine/StoryState.ts#L37) support story-state serialization. An initial use could be a three-choice conversation with a park regular that points the guest to a nearby game or a fictional errand.

Keep a narrative session identified by story ID, content revision and session ID. The player sends a choice ID and expected revision; the server validates the active choice and commits any game effects through existing actions. Narrative text must not directly call arbitrary wallet or inventory functions. Save/load support in Ink does not by itself solve Allworld content-version migration, reward replay or moderation.

Start with hand-authored typed content for one conversation if that is simpler. Introduce inkjs only when authors benefit from its branching workflow enough to justify runtime and save-version complexity. Compile content offline; load narrative code only when the feature is opened.

Acceptance: a choice visibly changes the next response; interrupted conversations resume correctly; a changed content version has a defined recovery path; rewards remain once-only; guest users can leave freely; mobile choices fit without hiding the world.

### 4. Shared activities with convincing remote movement

Allworld already reports local positions and interpolates neighbourhood peers (`src/scene/movement.ts:416`, `src/scene/neighbourhood-scene.ts:204`). The source also has a street movement receipt sequence and position correction (`src/street/client.ts:49`, `src/street/host.ts:105`). Avoid describing multiplayer, interpolation or retry handling as absent.

[Colyseus](https://github.com/colyseus/colyseus/blob/67f203aba558ce4a1090618bff01d01a3aa27099/README.md) is useful as an authoritative-room reference, while [Hubs's transform ownership and interpolation](./worlds-reference.md) provides concrete presentation patterns. Study stale-update rejection, teleport versus ordinary motion, latency-aware interpolation and reconnect handoff. Keep the existing backend until measured requirements justify migration.

A practical social activity would be two players sitting at the same game table, seeing the same turn and result, then standing and walking away smoothly. This combines current game rules, presence and animations into one readable experience. It does not require a whole-world MMO architecture.

Acceptance: two sessions agree on turn and outcome; reconnect neither duplicates rewards nor creates a second seat; remote avatars do not rewind on stale packets; teleport changes do not animate through buildings; interpolation stops after convergence. Network delay targets must be measured and documented before choosing a new transport.

## Suggested sequence

1. Design and validate the interactive first minute using existing table infrastructure.
2. Improve player locomotion using the current body/clip/terrain seams; see [character-motion-plan.md](./character-motion-plan.md).
3. Connect one resident to one fictional errand, with real player decisions and a persistent outcome.
4. Improve two-player presence and animation around that interaction.
5. Consider Ink/Yuka only when authoring or behavior complexity exceeds a small typed content model.

Navigation meshes, rigid-body physics, a different networking framework or an ECS should enter only when their specific feature or measurement warrants the cost. The source inspection identifies opportunities; it does not prove a retention gain, improved FPS, or a shipped gameplay result.
