# Housing studio local acceptance

Recorded 15 October 2026. This is an isolated playable candidate on `codex/housing-studio-20261015`, based on first-person dependency `73f66122c42c70bba4e4128cde901865d2a39c7b`. It is not merged, deployed or user-approved visual work.

## Try it

The built preview is running on this Mac at <http://127.0.0.1:4435/housing-studio.html>. Choose a home, select **Walk inside**, then use WASD/arrows or the on-screen movement controls. Room buttons walk along the existing navigation grid and stair routes. Switch camera mode and drag the scene to look. Approach an internal door and press F or the room-door button. **Walk outside** follows the route to the existing front-door transition.

## Browser journeys

Primary-agent inspection used the actual built page in Chrome, without injecting gameplay state. All four recipes were entered from the compound and visited in both camera modes.

| Home | Observed journey | Loaded model instances |
| --- | --- | ---: |
| Lagos Family Duplex | Entry, dining, internal door close/F reopen, master bedroom at y=3.43, downstairs parlour at y=0.03, front-door exit | 16; zero failed |
| Lagos Two-room Apartment | Entry, second room, both views, phone-width movement and exit | 6; zero failed |
| Lagos Two-bedroom Apartment | Entry, dining, both views and exit; phone-width layout | 12; zero failed |
| Abuja Courtyard Mansion | Entry, both stair flights to roof terrace at y=6.83, master bedroom at y=3.43, return through front door | 21; zero failed |

Final roof arrival was repeated against `housing-studio-DPYkFblY.js`: floor 2, position (2.50, 6.83, 1.43), standing, 21 loaded models, no failed models. The final browser console capture contained no warning/error entries. These observations establish the exercised paths, not exhaustive navigation or sustained device performance.

Phone checks used a 390×844 Chrome viewport and pointer-held walk controls. Movement changed the two-room apartment avatar position from (7.85, 0.03, -1.91) to (7.74, 0.03, -1.28), then stopped on release. This is desktop emulation, not physical-phone acceptance.

Inspection led to fixes for floating terrace facade bands, missing interior-door lintels, wall art crossing window openings, TV console support, phone heading overlap, and missing shared control/tag positioning. Final zoom-button clicks kept the canvas at y=0 with scene scrollTop=0; the earlier misplaced tag SVG no longer pushed the canvas out of view.

## Automated checks and package

- `node --experimental-strip-types --test src/housing-studio/*.test.ts`: **10 passed, 0 failed**, final duration about 0.71 seconds. Coverage includes valid fixtures, legacy floor representation, room/stair reachability, exterior collision/door lifecycle, internal door reopening and floor changes, actual Home adapter contracts, asset hashes and scenery budgets.
- Scoped TypeScript project: `scripts/housing/tsconfig.json` — **passed, exit 0** after the integration owner released its heavy slot.
- Scoped Vite build: **passed**, 2.48 seconds. No production entry/configuration/package/lockfile changed. The generic large-chunk warning remains: this standalone preview includes the shared runtime in one large entry.
- Conservative scenery maximum: **14,244 / 15,000 triangles**, mansion first floor in first person. The audit includes the built shell, furnishings, internal doors and retained Home scenery; it adds near-LOD asset triangles on top of their fallbacks conservatively. Existing avatar geometry belongs to the separately approved character allowance. The on-screen renderer counter includes characters and can therefore exceed 15,000.
- Selected furniture: **12 GLBs, 164,752 bytes**; hashes match the pinned owned asset library. No external photos or downloaded third-party models are shipped.
- Standalone package: **40 files, 4,627,436 bytes**. Largest entry: **3,341,364 bytes**, **930,059 bytes gzip at level 9**. Exact output hashes are in [package-receipt.json](package-receipt.json). These are studio-package figures, not a production startup-budget certificate.

## Preserved boundaries and remaining acceptance

Only additive housing paths and their records are included. The studio uses an in-memory visit and does not write saved homes, inventory, ownership or customization. Existing shared Home, venue-world, first-person and avatar files are unchanged. No new PR, main push or deployment was created.

Closed internal doors block their openings; rooms with another entrance may still be reached by an alternative route. Opening is instantaneous. Leaving the house returns to the compound entrance through the existing scene callback rather than continuous interior streaming. This is a compact game treatment informed by real Lagos/Abuja references, not a photoreal architectural reconstruction.

Integration into the main game, hosted CI, final production download budgets, physical-device performance and release remain with the integration owner. The full 530-asset integration remains in its existing phase-one lane; the 12-file studio subset can be deduplicated when that adapter is adopted.

## Captured views

![Duplex third-person cutaway](screenshots/duplex-third-person.jpg)
![Duplex first-person bedroom](screenshots/duplex-first-person.jpg)
![Duplex phone-width preview](screenshots/duplex-phone.jpg)
![Mansion exterior](screenshots/mansion-exterior.jpg)
![Mansion roof terrace](screenshots/mansion-roof.jpg)
