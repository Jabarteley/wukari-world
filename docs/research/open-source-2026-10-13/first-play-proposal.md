# First playable moment: an Ayo move in the park

Design proposal, 13 October 2026. No gameplay implementation or rules acceptance is claimed.

## Why this is a useful first slice

Allworld already promises Ayo as a starter goal but implements that goal through a seven-second activity (`src/game/content/goals.ts:32`). Its actual table games are Whot, Penalties, Chess and Weave (`src/tables/games.ts:11`). A playable board would connect the Nigerian social setting, visible characters and game rules in a feature a new guest can understand immediately.

The smallest honest onboarding objective is **“Make your first Ayo move.”** Show legal cups, let the player choose one, animate sowing, then show the house player's response. Do not call one move a completed full round. A full match remains available afterward. Keep settlement and account claim optional at this point.

## Two usable source references

| Source | What was inspected | Value and limit |
| --- | --- | --- |
| [OMerkel/Oware](https://github.com/OMerkel/Oware/tree/47519713a5dc13b56a8e115e8b3c697d5698fc27) | README, LICENSE, `html5/src/js/board.js`; commit 20 September 2026. | JavaScript Oware/Ouril implementation with pure state transitions and incremental sowing helpers. Code is MIT; default graphics license is CC BY-NC-SA 4.0, with some individual image notices different. Study/adapt eligible code with notices; create Allworld's own board and seed art. |
| [OpenSpiel Oware](https://github.com/google-deepmind/open_spiel/tree/48401890ee9857e611678302371378175a8e4c6b/open_spiel/games/oware) | `oware.cc`, `oware_board.cc`, game registry documentation; repository commit 31 August 2026, Apache-2.0. | Independent reference for legal moves, feeding an empty opponent row and terminal state. C++ research engine: use as a rules reference, not a browser runtime dependency. |

The mixed license is explicit in [OMerkel's pinned LICENSE](https://github.com/OMerkel/Oware/blob/47519713a5dc13b56a8e115e8b3c697d5698fc27/LICENSE). GitHub's metadata labels the repository `NOASSERTION`; reading the actual file is necessary. It does not mean all contents are MIT, nor that all reuse is forbidden.

Both repositories are examples of particular rules. They do not establish that every game called Ayo, Oware or Ouril uses the same rules. Before implementation, choose and name the variant, document its starvation/grand-slam/endgame rules, and validate the terminology and play expectations for the intended Nigerian audience. Do not import an unrelated mancala ruleset under the Ayo name.

## Proposed game shape

Keep the current `TableRules` interface. The engine state contains cups, captured counts, current seat, variant, completion state and the information needed for endgame/repetition handling. All state and views stay plain JSON. `parseMove` accepts a cup choice; `apply` verifies ownership and legality and calculates the entire accepted turn. The server's existing move number remains the ordering/retry boundary.

[OMerkel's board code](https://github.com/OMerkel/Oware/blob/47519713a5dc13b56a8e115e8b3c697d5698fc27/html5/src/js/board.js) separates pickup, one-seed sowing, harvesting and turn advancement. That separation is useful for presentation, but the authoritative server should commit a whole move atomically. The client can replay a bounded visual sequence from the accepted before/after state without making one network request per seed.

[OpenSpiel's legal-action implementation](https://github.com/google-deepmind/open_spiel/blob/48401890ee9857e611678302371378175a8e4c6b/open_spiel/games/oware/oware.cc#L76) explicitly handles the opponent having no seeds. Include this and the chosen capture/terminal variants in the rules decision record rather than implementing only the opening board.

For the tutorial opponent, start with a simple deterministic legal choice appropriate to the tutorial. The reference repository's MCTS is not required for the first move. A stronger bot can be added later without changing game state or the table protocol. Bound any search by a documented CPU budget; do not run it on every render frame.

## Visual interaction

Use original procedural geometry consistent with the current scene kit: a readable board, selectable cup areas and a small instanced seed set. A separate screen-space board may be easier to use on a phone; the in-world table and seated avatars should still communicate what is happening. Compare both before committing to fine 3D picking.

The sowing animation should be short and bounded, with a reduced-motion path that immediately displays the accepted result. Do not wait for an animation callback to grant a reward. If a move result arrives after the player leaves, update saved state without restarting the abandoned scene.

Existing `sit-enter`, `sit`, `sit-exit` and `interact` clips can establish the first version. A hand-to-cup reach would be an optional later use of the current 23-bone rig and targeted IK, after seat/table anchors are measured. There is no need to add Rapier for seeds that only illustrate an already accepted move; deterministic visual trajectories avoid networking a physics puzzle that is not part of the rules.

## Save, reward and migration boundary

- The new first-move goal is completed from a server-accepted human move tied to this table session and character, not from time spent watching an animation.
- A reconnect resumes the same session or shows its accepted result. Retried/stale moves follow existing table-service semantics.
- Keep existing starter progress and rewards for older saves. Changing a goal's condition must not pay historical characters twice or retract progress already earned.
- A saved passive `play-ayo` activity needs an explicit finish/convert policy. Do not remove its activity handler while old saves can still contain it.
- The tutorial and full-match result are different events. A tutorial reward must not count as winning a ranked match, and a bot-only demonstration must not count as a human move.

## Source change map for a future authorized implementation

| Responsibility | Existing boundary |
| --- | --- |
| Pure game rules, bot and per-seat view | `src/tables/rules.ts`, `src/tables/games.ts`; new game module would live beside the current four |
| Known game IDs and placement | `src/types/growth.ts:294`, `src/tables/city-places.ts:8`, `src/tables/places.ts` |
| Ordered moves and room lifecycle | `server/growth/tables.ts`, `server/ws/tables.ts` |
| Starter condition and reward | `src/game/content/goals.ts`, `src/game/systems/goals.ts` |
| Table UI and reconnect | `src/app/features/tables/BoardTable.vue`, `useTables.ts`, `tablesModel.ts` |
| World seating and body pose | `src/venue-world.ts`, `src/scene/body/stand-in.ts`, `src/scene/body/skinned.ts` |

This is a cross-module feature, not an isolated change to a label. The first version should use the current table infrastructure and one park placement before propagation to every city.

## Acceptance journey

Fresh guest arrives at the park → opens the board → chooses a legal cup → sees the accepted sow/capture → sees one house response → leaves or continues → reloads with progress intact. Exercise an illegal cup, double submission, delayed response, disconnect, reduced motion and an old save with the passive activity still running.

Record first accepted input time, interaction failures, reward count, mobile readability and whether animation stops at rest. These are future acceptance observations; this research has not measured them or modified the game.
