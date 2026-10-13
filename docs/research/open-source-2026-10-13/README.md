> **Ready for local testing — 13 October 2026.** Food data is compacted; both remaining Ayo expectations are fixed. All 150 focused checks, full typecheck (5 projects, zero errors), production build and all measured download budgets pass. The shared scene bundle is 188,216 bytes raw / 70,638 gzip, below the unchanged 192,000 / 71,000 limits. Preview: http://127.0.0.1:5173/. No deployment was performed. The old allowance continuation remains paused.

# Allworld: open-source research and playable improvements

Started 13 October 2026 from `5179285a25cb616e9c8ef5b137150a5a6f6e05e7` in `/Users/anthonyakpan/Desktop/JoinAllworld`.

The user requested research across gameplay, rendering, animation, characters and physics, then asked for an implementation they could test after sleeping. This folder separates research recommendations from implemented and verified behavior. The existing hand edits in `src/scene/characters.ts` belong to the user and are preserved.

## Current implementation

- Character locomotion: bounded blends between idle, walk, jog and stairs, using the existing rig and host frame loop. See [motion implementation](motion-implementation.md).
- Ayo: a server-authoritative two-player board with a house opponent, explicitly using Oware rules. Human moves, bot replies, reload continuity, mobile controls and the park table were exercised in the browser.
- Scene artwork: an original twelve-cup wooden Ayo table, merged into the existing venue batch; no new dependency or downloaded asset.
- Imported artwork: one CC0 Kenney stew pot is baked into the buka counter's existing vertex-colour mesh. The source model and atlas are converted offline, with a measured colour approximation; the game loads no new texture or model decoder. The buka gains 298 triangles with unchanged draw calls. See [food integration](food-integration.md).
- NPCs: continuous walking and short pose blends on one merged mesh, bounded blink/speech, four nearby animated characters, and authored appearance preserved through the crowd pipeline. Lagos's Amaka, Baba Sege, Kunle and Mama Ronke have distinct authored looks. Their low-detail faces now have differing shapes, smaller eyes, a projected nose and a mouth opening; Mama Ronke wears a fitted folded gele with her owambe outfit. The four authored figures cost 483–519 triangles each.
- Faces and wardrobe: visible player eyes, saved expressions and bounded blinking use the existing body shader. Hair and eyewear fit the measured male/female head bounds. Player braids, locs and ponytails use tapered strands over the fitted base scalp, with their added triangle costs measured. Player shoulders, collars, waist overlap and long-robe seams passed the documented browser fit checks. The male collar follows the raised trapezius and dips at the front instead of intersecting the shoulder. The real profile's Face view fits the shipped body's smaller head. See [wardrobe implementation](wardrobe-implementation.md) and [TESTING.md](TESTING.md).

Local open-mode preview: <http://127.0.0.1:5173/>. It runs this checkout and uses `.data-open`, with local test funds. The separate service at port 4400 runs the `integ-n` checkout and is not this implementation. This batch is verified locally. Pushing its source does not deploy it.

## Research map

| Area | Findings and implementation guidance |
| --- | --- |
| User's X post | [Verified project assessment](post-assessment.md) |
| Gameplay | [Repository findings](gameplay.md), [first-play design](first-play-proposal.md) |
| Rendering | [Repository findings](rendering.md), [measurable rendering experiments](visual-rendering-plan.md) |
| Character and animation | [Repository findings](characters-physics.md), [motion implementation plan](character-motion-plan.md) |
| Physics | [Authority, collision and fixed-step contract](physics-adoption-contract.md) |
| Open social worlds | [Source patterns from Hyperfy and Hubs](worlds-reference.md) |
| Source identity | [Pinned repository snapshots](repository-snapshots.json) |
| Imported food asset | [Source inventory](kenney-food-kit-prop.md), [accepted pot bake](food-integration.md) |

The research does not recommend replacing Three.js, the existing asset optimizer, or the current movement authority. Allworld already ships Quaternius bodies and animation clips, Meshopt compression, contact IK, batched scene geometry, NPC schedules, and demand-driven rendering. The next useful additions build on those systems.

## Work and usage boundary

The original allowance-driven run stopped when the account returned to 100% remaining at 08:03 Lagos on 13 October. Its continuation heartbeat is paused. Anthony then explicitly authorized this finite follow-up: compact the food asset, fix the two Ayo expectations, inspect characters/NPCs and make the local game testable. That follow-up is complete at the local source/build/browser level. Anthony subsequently authorized pushing the implementation to main; deployment remains separate.

Two existing Sol workers handled the bounded asset encoding and eyewear-fit units. The parent inspected the actual geometry, source, browser views and final checks. Worker token/cost figures were unavailable; no cost saving is claimed. The local preview was restarted on port 5173 because it was no longer running.
