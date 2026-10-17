# Runtime baseline, 2026-10-17

Branch `perf` (= origin/main), dev server http://127.0.0.1:5191 (open-dev), `/?diagnostics`.
GPU: `ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Pro, Unspecified Version)`, headless Chromium (chrome-headless-shell 145), deviceScaleFactor 1.

## Method
- Each tier was run twice, each on a fresh life. Cells are `run1 / run2 (median)`; the median of two is their mean. A few runs failed partway (the street step returned nothing), so some cells use run 3 in place of the failed second run.
- Each scene is measured with a requestAnimationFrame loop for 5 s: fps = frames / elapsed, worst = longest frame gap in ms.
- Triangles and draw calls come from `__jaw.venue.diagnostics()`.
- Heap is `performance.memory.usedJSHeapSize` in MB. It was identical for every scene within a run (202, 307, 190, ...) and differed between runs, so it behaves as a coarse, stale reading. It is listed once per run below, not per scene.
- Scenes: (a) travel home, `home.door` outside; (b) `walkStreetGate()`, wait for the street, `walkTo(x+30, z)`, wait until stopped (confirmed 30 m moved); (c) travel to market; (d) travel home (interior); (e) `__jaw.shell.open('map')`. In (e) the venue canvas keeps its previous scene (home), so the map's own triangles come from `__jaw.map.diagnostics().triangles`. Its draw-call count was not captured.
- First 3D frame (street): after the street was reached, the page was reloaded at `/?diagnostics`. A script injected before load (`Page.addScriptToEvaluateOnNewDocument`) polls requestAnimationFrame and records `performance.now()` (ms from navigation start) at the first `diagnostics().renderCount > 0`. In all runs that frame was `location: city-street`. The browser HTTP cache was warm, since the street had just been visited.

## Desktop 1280x800, no throttle
| Scene | fps | worst ms | triangles | draw calls |
|---|---|---|---|---|
| a neighbourhood | 119.8 / 120.1 (120) | 22 / 12 (17) | 48610 / 46970 (47790) | 29 / 27 (28) |
| b street, after 30 m | 120.1 / 120.0 (120) | 17 / 10 (13.5) | 33890 / 29198 (31544) | 9 / 9 |
| c market | 120.1 / 114.9 (117.5) | 17 / 51 (34) | 72798 / 68151 (70475) | 47 / 46 (46.5) |
| d home interior | 120.2 / 120.1 (120) | 13 / 10 (11.5) | 35510 / 34188 (34849) | 22 / 22 |
| e map screen | 120.0 / 120.1 (120) | 16 / 13 (14.5) | map 84535 / 83955 (84245) | not captured |

Street first 3D frame: 669 / 670 ms (670). Heap: 202, 257 MB (per run).

## Phone 412x915 (mobile emulation), CPU throttle 4
| Scene | fps | worst ms | triangles | draw calls |
|---|---|---|---|---|
| a | 120.2 / 120.2 (120.2) | 10 / 10 | 45438 / 45904 (45671) | 27 / 26 (26.5) |
| b | 120.2 / 120.1 (120.2) | 10 / 10 | 31608 / 31083 (31346) | 9 / 9 |
| c | 117.7 / 120.2 (119) | 121 / 12 (66.5) | 37988 / 62204 (50096) | 25 / 25 |
| d | 120.1 / 120.0 (120.1) | 10 / 10 | 33180 / 33180 | 20 / 20 |
| e | 120.0 / 119.9 (120) | 10 / 24 (17) | map 84200 / 84200 | not captured |

Street first 3D frame: 728 / 646 ms (687). Heap: 307, 190, 228 MB (runs 1, 2, 3).

## Phone 412x915, CPU throttle 6
| Scene | fps | worst ms | triangles | draw calls |
|---|---|---|---|---|
| a | 120.2 / 120.0 (120.1) | 10 / 27 (18.5) | 71492 / 44012 (57752) | 34 / 25 (29.5) |
| b | 120.2 / 120.2 | 10 / 10 | 30684 / 32568 (31626) | 9 / 9 |
| c | 120.0 / 119.9 (120) | 12 / 22 (17) | 61280 / 63164 (62222) | 25 / 25 |
| d | 120.2 / 120.2 | 10 / 10 | 32256 / 34140 (33198) | 20 / 20 |
| e | 120.0 / 120.1 (120) | 18 / 15 (16.5) | map 83850 / 83955 (83902) | not captured |

Street first 3D frame: 858 / 696 ms (777). Heap: 347, 228 MB (runs 1, 2).

## Observations of the data
- Frame rate sits at the display's 120 Hz in every scene and tier. The only dips are single frames of 22 to 121 ms (market desktop run 3, market phone x4 run 1, neighbourhood phone x6 run 2).
- Triangle counts for the same scene vary between runs, most in the market (37988 to 72798) and neighbourhood (44012 to 71492).
- Diagnostics fields on this branch: `triangles`, `drawCalls`, `location`, `avatar`, `people`, `crowd`, `tier`, `pixelRatio` exist on the venue. The map has `triangles`, `calls`, `cityTriangles` and `overlayTriangles`.
- Console showed repeated `409 Conflict` resource errors during the neighbourhood and street steps, from the harness's own `/api/action` calls.

## Commands and files
Created for this baseline (in /tmp/allworld-probes): `perf-shot.mjs` (a copy of `shot-phone.mjs` with the first-frame poller, default 1280x800), `perf-steps.mjs` (the steps), `perf-run.sh`. Copies are in the screenshot folder.
```
VW=1280 VH=800 node /tmp/allworld-probes/perf-shot.mjs http://127.0.0.1:5191 /tmp/allworld-shots/perf-baseline/desktop-rN /tmp/allworld-probes/perf-steps.mjs
THROTTLE=4 VW=412 VH=915 node /tmp/allworld-probes/perf-shot.mjs http://127.0.0.1:5191 /tmp/allworld-shots/perf-baseline/phone4-rN /tmp/allworld-probes/perf-steps.mjs
THROTTLE=6 VW=412 VH=915 node ... phone6-rN ...
```
Runs: desktop r1-r3, phone4 r1-r3, phone6 r1-r2, with `perf-run.sh` driving r1 and r2 and r3 run by hand for desktop and phone4.

Screenshots: `/tmp/allworld-shots/perf-baseline/<tier>-r<N>-<scene>.png`, with tier `desktop|phone4|phone6` and scene `a-neighbourhood|b-street|b2-street-reload|c-market|d-home|e-map`. Raw logs sit beside them as `<tier>-r<N>.log`.
