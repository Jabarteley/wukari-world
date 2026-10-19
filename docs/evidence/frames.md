# Frame table

One row per view, kept up to date by the graphics phases (1 to 9): re-run `shoot.ts` and replace the rows, keeping the old row
and its date underneath when a phase changes a number. How to run it: [../EVIDENCE.md](../EVIDENCE.md#running-the-tools).

**What is measured.** Over a 10-second dwell the page is asked to draw the scene on every animation frame (the worst case; the game
itself draws nothing while a street is still), and the gap between frames is recorded. Draw calls and triangles are
`renderer.info.render` after the dwell, read through the `?diagnostics` hook. Source: `scripts/evidence/shoot.ts` at `1f2ff3bd0`,
game source of main `090f1e97b`, 19 October 2026, open-mode life, quality tier `high`.

## Mac Chrome at 2x

Headless Chromium on a Mac with an Apple M4 Pro (ANGLE Metal renderer, real GPU), window 1280 x 800 at device pixel ratio 2
(2560 x 1600 pixels), fresh open-mode life.

| View | In-game clock | Draw calls | Triangles | Frame gap p50 / p95 / max, held to 60 Hz (ms) | Frame gap p50 / p95 / max, uncapped (ms) | Console errors |
| --- | --- | ---: | ---: | --- | --- | --- |
| Lagos street at dusk (`yaba-dusk`) | 18:30 | 37 | 46,185 | 16.7 / 16.8 / 33.4 | 4.2 / 6.9 / 17.7 | 0 |
| Kano venue at noon (`kano-noon`, Kurmi Market) | 12:00 | 23 | 45,847 | 16.7 / 16.8 / 16.8 | 3.0 / 5.0 / 8.3 | 0 |
| Home at night (`home-night`, starter house) | 22:00 | 22 | 32,304 | 16.7 / 16.7 / 16.8 | 2.2 / 3.1 / 12.2 | 0 |

Reading it: "held to 60 Hz" is what a player on a 60 Hz screen gets (16.7 ms means every frame was on time; the one 33.4 ms
frame on the street is a single missed frame). "Uncapped" removes that ceiling and is the headroom: the cost of a frame on this
GPU, and the scene was drawn about twice per frame (the harness asks for a draw on each frame and the game's own loop also draws). A phone
is several times slower than this computer; do not read these as phone numbers. Draw calls and triangles move a little from run
to run (traffic and walkers), for example the street read 43 calls in the uncapped run.

Triangles and calls are what the renderer reports for its last draw (probably shadow passes included), so they are higher than the scene's own
budget counts in `src/venue-world.ts` (`setHostBudget`); compare a phase's numbers with these rows, not with those budgets.

## Software drawing (no GPU), for reference

The same street drawn by the CPU (`--gpu swiftshader`): about 850 ms a frame at 2x, 13 frames in 10 seconds. It is a way to take
pictures and count draw calls on a computer without a GPU; its frame times are not evidence of anything.

## Android emulator

Not measured. Next step: serve the same build to the Android emulator (`adb reverse`), drive it over `adb forward tcp:9333
localabstract:chrome_devtools_remote`, and record the three views at the phone tier. The harness's `--base`, `--size` and `--scale`
(for example `--size 412x915 --scale 2.625`) are the starting point; `shoot.ts` needs a small change to attach to a remote
browser instead of launching one.

| View | Draw calls | Triangles | Frame gap p50 / p95 (ms) |
| --- | --- | --- | --- |
| `yaba-dusk` | not measured | not measured | not measured |
| `kano-noon` | not measured | not measured | not measured |
| `home-night` | not measured | not measured | not measured |

## The walk

`walk.ts`, same machine, 10 s per scene, 19 October 2026 (evening Lagos time, so the walk went to the street kitchen):

| Scene | Time to first frame (ms) | Frames | Stalls over 42 ms | Frames over 100 ms | Worst gap (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| home | 2708 | 586 | 3 | 0 | 50 |
| gate (stepping out to the street) | 420 | 582 | 3 | 1 | 233 |
| street (walking along it) | 23 | 600 | 0 | 0 | 17 |
| market (street kitchen, market shut) | 2715 | 590 | 2 | 0 | 50 |
| back home | 2561 | 596 | 0 | 0 | 34 |

First load to first frame: 1,694 ms. Console errors: none unexpected. Stalls: 8. The longest, 233 ms, is the street scene being
built as the player steps out of the house. Times to first frame for a trip include the trip itself (about 2.5 s in open mode).
