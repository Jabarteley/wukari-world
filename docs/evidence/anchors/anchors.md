# Anchor screenshots

Taken on 19 October 2026 from the local game at main `090f1e97b`, by `scripts/evidence/shoot.ts` (tools at `1f2ff3bd0`), headless
Chromium on a Mac with an Apple M4 Pro (real GPU, ANGLE Metal), window 1280 x 800 at device pixel ratio 1, quality tier `high`, a
fresh open-mode life (`npm run dev:open -- --port 5211`, a settled life with a free starter house, N50,000,000). They are what a player
sees, HUD on, the clock of the scene pinned. They are the pictures to score against ([../../EVIDENCE.md](../../EVIDENCE.md)).

Each view has two files: `<view>.png` (the whole page) and `<view>-scene.png` (the 3D canvas alone, what the pixel figures are
measured on), and `<view>.json` (the harness's numbers for the run that took them, with 3 seconds of dwell).

| View | Files | How it is reached | In-game clock |
| --- | --- | --- | --- |
| (a) A Lagos street at dusk | `yaba-dusk.png`, `yaba-dusk-scene.png` | New Lagos life; travel home on foot; `home.door` outside: the street in front of the starter house, with its traffic. Camera at the "fit" button's framing | 18:30 Lagos time (dusk is 17:30 to 19:30) |
| (b) A Kano venue at noon | `kano-noon.png`, `kano-noon-scene.png` | New Kano life (city `kano`); travel on foot from the Gama garden to Kurmi Market | 12:00 (day) |
| (c) A home at night | `home-night.png`, `home-night-scene.png` | New Lagos life; travel home on foot: the starter house, indoors | 22:00 (night) |

URL for all three: `http://127.0.0.1:5211/?diagnostics=1` with the session cookie of the life described (the page picks the
city from its saved character; the harness sets it for Kano). To repeat: run
`node --experimental-strip-types scripts/evidence/shoot.ts --view all --scale 1 --out docs/evidence/anchors --dwell 3`.

Notes a critic should know:

- The clock is pinned for the scene's light only (the scene is given the same moment on every update). The HUD's own clock shows the
  real time of the day the pictures were taken.
- **The street is the free starter house's street in Agege, not Yaba.** Open mode settles a new life in the first local
  government of the city (`server/open-dev/life.ts`) and a change of local government waits seven days. The street scene is the same
  code for every Lagos home, so this is the "Yaba street" the plan means, but nothing Yaba-specific is dressed on it. Integrator
  request: an optional open-mode setting for the home local government (for example `lagos-mainland`), read in `server/open-dev/life.ts`, would let the harness
  stand in Yaba itself.
- Kano's market at noon reads as a day scene; the game's text on the Kano HUD says the light is off around the district until
  12:45 AM, a real-time power cut, which does not change the scene's own light.
- The neighbours on the street are houses of other lives on the same server (here, earlier runs of this harness), so a street with more or fewer neighbours is normal.

## Pixel figures (the scene canvas alone)

Measured with `scripts/evidence/inspect.ts`; thresholds in [../../EVIDENCE.md](../../EVIDENCE.md#the-numbers).

| View | Colour entropy (bits) | Dominant colour share | Edge density | Luminance contrast | Verdict |
| --- | ---: | ---: | ---: | ---: | --- |
| yaba-dusk | 5.01 | 0.164 | 0.306 | 100.9 | passes |
| kano-noon | 3.45 | 0.469 | 0.151 | 139.8 | passes (entropy nearest to the line) |
| home-night | 4.08 | 0.245 | 0.088 | 158.8 | passes |

The figures are advisory and all three pass, including the street that is the "1 to 2" anchor by definition: the thresholds catch a flat
or empty picture, not a basic one. Whole-page figures, which include the HUD, are higher (entropy 4.5 to 4.9, edge density 0.30 to 0.40).
