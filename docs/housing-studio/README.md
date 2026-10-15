# Allworld housing studio

An additive playable housing studio using the existing Home plan, movement, collision, stair, front-door and first-person host. It supplies a furnished Lagos duplex, two Lagos apartment layouts and an Abuja mansion with a roof terrace.

## Run and verify

From the housing checkout:

```sh
node node_modules/vite/bin/vite.js --config scripts/housing/vite.config.ts
node --experimental-strip-types --test src/housing-studio/*.test.ts
NODE_OPTIONS=--max-old-space-size=3584 node --experimental-strip-types scripts/agent-slot.ts heavy -- node node_modules/typescript/bin/tsc --project scripts/housing/tsconfig.json --pretty false
NODE_OPTIONS=--max-old-space-size=3584 node --experimental-strip-types scripts/agent-slot.ts heavy -- node node_modules/vite/bin/vite.js build --config scripts/housing/vite.config.ts
node node_modules/vite/bin/vite.js preview --config scripts/housing/vite.config.ts --host 127.0.0.1 --port 4435 --strictPort
```

Open `http://127.0.0.1:4435/housing-studio.html`. Use **Walk inside / Walk outside** to travel through the front entrance. **Open / Close front door** changes the door while you stay where you are. Use room buttons to walk via the real staircase, WASD/arrows or touch direction buttons to explore, and F/the room-door button beside an internal doorway. Switch between first and third person; drag to look, or use brackets to turn in first person. Normal third person retains room-height partitions. **Floor overview** explicitly lowers the partitions and resets the camera to fit the current floor; use upstairs room buttons for other floors. Closed doors alter the shared walk grid; a room with another entrance may remain reachable by an alternative route.

The studio creates an in-memory visit. It never persists fixtures or changes the player's saved home, inventory, ownership or appearance. It uses the existing shipped avatar and first-person controller. No new character customization work is integrated.

## Integration contract

Original base `bc113b55a135c7a37592d264764407627263aafc`; current reviewed first-person dependency `73f66122c42c70bba4e4128cde901865d2a39c7b`. Only new housing paths are owned here. The retention integration owner controls adoption into the game and release. No PR, main push or deployment is created by this lane.

- `fixtures.ts` uses the existing `HouseStyle`, `PlacedItem`, `plotOf` and `planOf` contracts. Ground-floor placements retain the legacy omitted `floor` representation.
- `interior.ts` delegates to the actual `buildHomeScene`; only its static visual batches are replaced. The existing host remains authoritative for movement, furniture footprints, stairs, avatar pose and the animated front door.
- `doors.ts` derives internal openings from shared room boundaries and `wallsOf`. Social spaces use open passages; privacy rooms retain a small connected set of doors. Redundant privacy openings are filled and blocked consistently. A stable grid facade lets existing walkers observe door/floor changes. Closing is rejected while the avatar occupies the closing leaf footprint.
- `shell.ts` and `furnishings.ts` cull unused floors, retain far facades and full-height interior partitions in normal third person, and enclose the active floor in first person. Floor overview is an explicit cutaway. Stair landing caps keep the top of a visible flight attached to a landing. Missing model loads retain procedural fallbacks.
- `front-door.ts` retains the existing named Home door leaf and keeps manual open/close state separate from travel. The adapter yields to the host animation during entry/exit, then returns the door to its closed position.
- `exterior.ts` supplies a navigable gated compound and blocks the building footprint. Enter/leave uses the existing host door callback and scene transition. Leaving currently returns to the compound entrance; it is not a continuous streaming interior.
- `scripts/housing/vite.config.ts` builds only this studio and Lagos/Abuja data, with no public-directory copy. Existing production entry points, budgets, dependencies and runtime files remain unchanged.

## Appearance and provenance

Real completed Lekki-apartment and Abuja-villa photography informed warm neutral finishes, POP ceiling details, black window frames, restrained glazing and layered massing. This is a compact game rendering, not a photoreal reconstruction or architectural plan. See [references and asset provenance](references.md). Existing Blender-generated Allworld furniture was reused after online reuse research; no third-party imagery is shipped.

The 12 selected near-LOD GLBs total 164,752 bytes. The 530-asset integration remains in its existing phase-one lane; this standalone subset can be deduplicated against that asset adapter when its owner integrates the library. Domestic sanitary pieces and rugs use small procedural fallback meshes where the existing catalogue lacks the right model.

## Acceptance

See [verification](verification.md) for exact checks and browser journeys. Hosted CI, integration into the main game, physical-device performance and production release are separate gates owned by the integration/release lane.
