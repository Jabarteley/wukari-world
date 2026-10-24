# FUW main gate fidelity review

Press Play at http://127.0.0.1:5196/ after `npm run wukari:play`. FUW remains the default destination; Wukari town remains selectable. WASD/arrows walk, Shift sprints, drag/Q/E turns the camera and scroll zooms. Touch controls remain available. Settings offers persisted Daylight/Evening lighting and the existing graphics presets. Map Information includes front, side, inward and canopy inspection views.

The original reusable Three.js gate now follows the supplied photographs: cream walls, a wide open vehicle passage, arched pedestrian openings, folded metal bars, split FEDERAL / UNIVERSITY WUKARI lettering, Established in 2011 sign zone, roof trusses and structural depth. Landscaping, curbs and lighting complete the immediate entrance. The existing anonymous OSM building 1523019420 supplies the interior view with illustrative cream finish, red roof and windows; its footprint is unchanged and its institutional identity remains unknown.

This is a photo-guided likeness with approximate dimensions, not an architectural survey. No supplied photo, poster, watermark or Google imagery is embedded or redistributed. One reference bears a PostUTMENews watermark; receiving a reference does not establish redistribution rights. The code-generated mesh, lettering and materials are original. No campus layout or gatehouse was invented.

The deeper piers require a documented 2m outward virtual gate adjustment. Walking corridors flare locally to 5.3m offsets through 1.9m side openings, then reconnect to the existing network. The 7.1m central opening remains clear for traffic. Pier/building/road/path checks pass; source roads, building footprints, vehicle surfaces and the approved virtual bypass remain unchanged. Spawn stays on pedestrian space facing inward. Placement and real-world access remain unverified.

## Visual review

- [Front gate](evidence/phase10d-front.png), [player spawn](evidence/phase10d-spawn.png), [walk inward](evidence/phase10d-entry-walk.png).
- [Side and depth](evidence/phase10d-side.png), [inside view](evidence/phase10d-inward.png), [roof/truss detail](evidence/phase10d-canopy.png).
- [Evening](evidence/phase10d-evening.png), [mobile controls](evidence/phase10d-mobile.png), [reference overview](evidence/phase10d-reference-overview.png).

Screenshots were inspected, including normal gameplay distance. This remains stylized game geometry; fine plaque text is small on a phone. The owner should review resemblance before treating appearance as accepted.

## Reference comparison and next section

The updated owner Google Earth points remain separate from provider geometry in the interactive campus overview. They are not GPS observations. The main point is 6.11m from the earlier pin and inside OSM footprint 1523025009; it is about 19.10m from the new virtual gate. The gate was not snapped onto that footprint. ICT and the earlier unnamed point lie inside anonymous footprint 1523023150, which does not independently prove building identity. Its nearest mapped road is about 90.14m away: no final access path was traced or invented.

The smallest next section is the existing gate approach/junction and roughly 100m of mapped branch 673416543 toward node 6306383692. Obtain firsthand gate-threshold GPS observations, ICT doorway/access observations and permission-cleared original photographs before extending a named ICT route. See the [full comparison, IDs, provenance and GPS/photo checklist](../../data/wukari/reference-20261024/README.md). Original source records and hashes remain preserved. The outward source conflict between road 673416541 and building 1523025373 remains documented; the separately disclosed virtual bypass is retained.

## Validation and performance

All 89 Wukari tests passed; the final gate-focused six tests passed again after the canopy refinement. Focused TypeScript and Wukari production build pass. Eight browser acceptance groups pass: default FUW spawn, inward pedestrian movement, inspection views, evening controls, separate reference layers, mobile controls, performance and town/FUW round trip. No browser runtime errors were recorded. Full-project TypeScript is not certified; inherited broader failures remain outside this focused check. The build retains its existing large-chunk advisory.

Latest hardware sample: Intel HD Graphics 620, ANGLE Direct3D11, Medium graphics/daylight, 1440×884, DPR1, 6s warm-up and 20s foreground sample. **59.93 FPS, median 16.6ms, p95 17.5ms**, one of 1,200 frames over 33.3ms. Sixteen moving vehicles included ten motorcycles; 944 footprint records loaded. Sample-end render counters: 43 draw calls, 412,499 triangles, 35.8MB geometry buffers and 19.9MB estimated texture storage. CPU update/submission timings are not GPU duration or driver memory measurements. Physical-phone performance and sustained thermal behavior were not measured.

The earlier first pass measured 55.29 FPS/p95 32.8ms, refined pre-canopy pass 60.03/p95 16.9ms, and Phase10C approximately 56.94/p95 21.6ms. Views and geometry differ; these are observations, not a controlled speedup comparison. Raw evidence: [final browser sample](evidence/phase10d-browser.json), [first pass](evidence/phase10d-first-pass-browser.json), [pre-canopy refinement](evidence/phase10d-refined-browser.json), [tests](evidence/phase10d-tests.txt), [focused tests](evidence/phase10d-focused-tests.txt), [build](evidence/phase10d-build.txt).

Reproduce with `node --test --test-concurrency=1 src/wukari/*.test.ts`, `npx tsc --noEmit -p scripts/wukari/tsconfig.json`, `npm run wukari:build`, and, with the server running, `node scripts/wukari/fuw10d-browser.ts`. Use the existing in-game performance tool for another local sample.

Requested base `feat/fuw-gate-default-play` was absent locally and remotely. This branch instead preserves PR14's actual head `feat/fuw-provisional-entrance-play` at 8bedb97f4ef862d618cc6525c50176c69e9f2e09 and targets that branch. No merge, deployment, database or economy change occurred.
