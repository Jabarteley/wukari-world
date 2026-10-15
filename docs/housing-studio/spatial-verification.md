# Housing object clearance

Base: `48932aab4fe022d51f688ab5392ae18a12c7d5c7`. Scope is the isolated housing studio, with existing saved homes and shared runtime preserved.

## Reproduced defect

The open upstairs duplex bathroom door intersected the bathtub. The door used the full 1.667 m plan opening as its leaf width and always swung in one direction. Catalogue placement validity alone did not detect that moving-panel intersection. Actual browser inspection confirmed it. An initial temporary audit used an obsolete multi-leaf assembly; that door result was rejected and superseded by an absolute-current-worktree audit and the real rendered-geometry checks below.

## Correction

- Leaves are at most 0.9 m. The adapter chooses the opening endpoint, hinge and swing direction using sampled leaf sweeps against furnishings, walls, stair rails and prior door sweeps. The unused opening width becomes a matching wall.
- Both open and closed panels contribute walking blockers and camera solids. The avatar must stand clear of the swept area before toggling.
- Imported model X/Z centres are normalized, and procedural fixtures are fitted inside their allocated footprints. The furniture layout itself is unchanged.
- Collision solids for filled doorway walls match the rendered 0.12 m wall thickness. The walk grid retains its additional safety margin.

## Automated evidence

`node --experimental-strip-types --test src/housing-studio/*.test.ts` passes 12 checks. The asset check parses all 12 compressed GLBs with the real GLTFLoader and Meshopt decoder, mounts them through the production furnishing adapter, and waits for loading to finish.

The four recipes contain 73 furnishing placements. The geometry checks cover 64 solid items, including 55 imported-model instances and nine procedural sanitary pieces. Rugs beneath furniture and art mounted on walls intentionally use their existing nonblocking decorative rules. Each solid item is checked against its allocated footprint, the other items on its floor, room walls, stair reservations, open/closed rendered door leaves and filled doorway solids. The remaining checks preserve all furnished room/stair routes, door state changes, sweep guards, floor projection and geometry cleanup. All four recipes report zero door-clearance failures.

The doorway counts remain 4, 2, 4 and 6 for the duplex, compact apartment, two-bedroom apartment and mansion. No new model or texture was needed. The conservative scenery maximum is 13,920 / 15,000 triangles.

Final scoped TypeScript passes, Vite builds in 1.91 seconds, and all 12 checks pass in 0.99 seconds. The built entry is `housing-studio-DYmVz1Sz.js`. Package hashes are in `package-receipt.json`. Interactive verification waits for the integration owner's explicit release of the shared Chrome session. The earlier browser inspection proves the defect and the previous framing/front-door correction, not the new clearance result.

The shared third-person camera currently snapshots collision solids on scene entry. The adapter exposes updated door solids, but refreshing that camera snapshot after a toggle needs a shared-host API change owned by the first-person/integration lane. Walking blockers and first-person occlusion queries already use live state. This camera limitation is separate from object-placement and door-sweep clearance.
