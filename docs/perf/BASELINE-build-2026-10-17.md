# Build and download baseline, 2026-10-17

Branch `perf` (= origin/main), `/Users/anthonyakpan/Documents/Allworld-notes/work/perf`. Build output in `/tmp/allworld-build/perf-main`. Sizes are as emitted; brotli is quality 11.

## Budget report (as printed)

```
Download budgets (src/budgets.ts)
ok   LOADING_RAW               90568  budget 92,000 raw bytes (max)  first-paint JavaScript
ok   LOADING_GZIP              35259  budget 37,000 gzip bytes (max)  first-paint JavaScript
ok   FIRST_PAINT_BROTLI        35432  budget 36,800 brotli bytes (max) [provisional]  5 files: index.html, stylesheet and JavaScript
ok   STARTUP_RAW              613952  budget 615,000 raw bytes (max)  largest over 284 cities (lagos)
ok   STARTUP_GZIP             222446  budget 223,000 gzip bytes (max)  largest over 284 cities (lagos)
ok   STARTUP_BROTLI           195292  budget 195,600 brotli bytes (max) [provisional]  largest over 284 cities (lagos)
ok   SCENE_HOST_RAW           188818  budget 192,000 raw bytes (max)  shared scene chunk (world-adapter)
ok   SCENE_HOST_GZIP           70864  budget 71,000 gzip bytes (max)  shared scene chunk (world-adapter)
n/a  BASE_BODY_BROTLI              -  budget 300,000 brotli bytes (max) [provisional]  no file matches /(^|\/)base-body[^/]*\.(glb|gltf|bin)$/
n/a  CLIP_PACK_BROTLI              -  budget 200,000 brotli bytes (max) [provisional]  no file matches /(^|\/)clip-pack[^/]*\.(glb|gltf|bin|json)$/
n/a  WARDROBE_ITEM_BROTLI          -  budget 60,000 brotli bytes (max) [provisional]  no file matches /(^|\/)wardrobe\/[^/]+\.(glb|gltf)$/


First paint (5 files) and lagos startup (20 files): kB raw / gzip / brotli
   101.1     39.8     35.4  first paint
```

The script exited 0 (`overBudget: 0`, `errors: 0`). The four `n/a` budgets have no matching file in the build.

## Lazy groups

The script lists 1,581 groups with `--all`; the 40 largest by brotli are shown (full output was saved to `/tmp/allworld-build/budget.txt`). The world city network is a lazy group, outside startup:

```
    53.6     19.8     14.1  city-network                       1  assets/city-network-de08fd1.js (14.1 kB)

Lazy groups, largest brotli first (1581 of 1581): kB raw / gzip / brotli, files, largest file
 63191.4  50947.2  48091.9  *.glb files                      252  character-lab/models/round12/male/garments/fitted-skirt-01.glb (2537.2 kB)
 84644.5  12714.7   9751.6  *.txt files                      5388  world-country-detail/bee6c7d0392d1db177eb28be5313173ce88ff92fe59e595c03805ebab6069ee7.txt (524.8 kB)
  1652.5   1604.2   1593.2  *.jpg files                       25  character-lab/models/round2/male/textures/skin-light.jpg (186.1 kB)
  1039.7   1038.6   1038.0  *.webp files                      13  assets/house-catalogue-28dfc24.webp (295.7 kB)
  4905.9   1186.4    620.9  city-wellington-terrain            1  assets/city-wellington-terrain-112ccac.js (620.9 kB)
   541.8    535.0    534.2  *.png files                       10  og/allworld.png (154.3 kB)
  3470.7   1003.2    525.6  city-auckland-terrain              1  assets/city-auckland-terrain-ad7edcd.js (525.6 kB)
  2991.9    746.2    403.9  city-stockholm-geometry            1  assets/city-stockholm-geometry-3294476.js (403.9 kB)
   676.5    469.7    378.1  rivers                             1  assets/rivers-25db21e.js (378.1 kB)
  2882.5    701.7    372.1  city-new-york-geometry             1  assets/city-new-york-geometry-71196cf.js (372.1 kB)
  2674.8    663.0    365.0  city-amsterdam-geometry            1  assets/city-amsterdam-geometry-d03e59f.js (365.0 kB)
  2791.1    656.9    352.9  city-auckland-geometry             1  assets/city-auckland-geometry-fd97c82.js (352.9 kB)
  1616.7    526.2    329.0  city-macau-terrain                 1  assets/city-macau-terrain-af73786.js (329.0 kB)
  2443.2    582.8    315.1  city-mariehamn-geometry            1  assets/city-mariehamn-geometry-7ec2e40.js (315.1 kB)
  1490.9    378.3    305.6  progression-rules                  1  assets/progression-rules-ed6d13a.js (305.6 kB)
  2208.1    534.5    290.6  city-seoul-geometry                1  assets/city-seoul-geometry-ffbff68.js (290.6 kB)
  1280.5    378.6    235.9  city-oslo-geometry                 1  assets/city-oslo-geometry-dfa058a.js (235.9 kB)
  1310.9    420.0    227.8  city-serekunda-terrain             1  assets/city-serekunda-terrain-ac01f7b.js (227.8 kB)
  2392.7    715.1    225.5  city-oslo-terrain                  1  assets/city-oslo-terrain-a3fe377.js (225.5 kB)
  1714.3    417.8    208.6  city-suva-terrain                  1  assets/city-suva-terrain-db5d0eb.js (208.6 kB)
  1133.0    322.4    200.4  city-hong-kong-geometry            1  assets/city-hong-kong-geometry-53ad1c1.js (200.4 kB)
  2201.1    629.4    199.1  city-hong-kong-terrain             1  assets/city-hong-kong-terrain-648c8ba.js (199.1 kB)
  1555.1    355.9    198.2  city-serekunda-geometry            1  assets/city-serekunda-geometry-2faaaa6.js (198.2 kB)
  1056.4    296.3    195.2  city-nuuk-geometry                 1  assets/city-nuuk-geometry-bb802bb.js (195.2 kB)
  2101.3    590.2    194.5  city-nuuk-terrain                  1  assets/city-nuuk-terrain-5f6de35.js (194.5 kB)
  1508.8    403.5    192.2  city-bsb-terrain                   1  assets/city-bsb-terrain-e4cc054.js (192.2 kB)
  1409.9    332.4    180.3  city-macau-geometry                1  assets/city-macau-geometry-78a15d4.js (180.3 kB)
  1294.6    319.4    169.4  city-koror-geometry                1  assets/city-koror-geometry-8f6a4ef.js (169.4 kB)
   713.1    239.7    168.2  city-willemstad-terrain            1  assets/city-willemstad-terrain-2c3c793.js (168.2 kB)
   929.6    267.4    167.2  city-helsinki-geometry             1  assets/city-helsinki-geometry-a0f8ab3.js (167.2 kB)
  1818.1    524.1    167.0  city-helsinki-terrain              1  assets/city-helsinki-terrain-cffafd9.js (167.0 kB)
  1166.5    293.7    157.5  city-torshavn-geometry             1  assets/city-torshavn-geometry-2d0eb2e.js (157.5 kB)
   695.9    187.9    157.5  *.css files                      193  assets/startApp-1d01c11.css (14.2 kB)
   481.5    182.7    155.1  city-*-content                   285  assets/city-ibadan-content-eafa1a8.js (9.6 kB)
  1499.9    456.3    148.7  city-stockholm-terrain             1  assets/city-stockholm-terrain-314f422.js (148.7 kB)
  1105.4    274.9    148.0  city-singapore-geometry            1  assets/city-singapore-geometry-efbd334.js (148.0 kB)
   713.5    178.4    142.8  three                              1  assets/three-c660faa.js (142.8 kB)
   574.8    196.5    141.5  city-roseau-terrain                1  assets/city-roseau-terrain-e2d209d.js (141.5 kB)
   670.9    219.5    140.4  city-charlotte-amalie-terrain      1  assets/city-charlotte-amalie-terrain-850a8ea.js (140.4 kB)
   369.9    150.6    137.1  city-*-rules                     283  assets/city-ibadan-rules-fe02934.js (1.5 kB)
```

## Size by category (whole build, 8,348 files)

| Category | Files | Bytes | MB |
|---|---|---|---|
| JS | 2458 | 148,639,551 | 148.64 |
| street packs (assets/street) | 5122 | 67,351,665 | 67.35 |
| GLB/bin models | 252 | 63,191,440 | 63.19 |
| other (.txt) | 266 | 17,292,826 | 17.29 |
| images | 49 | 3,234,437 | 3.23 |
| CSS | 194 | 699,515 | 0.70 |
| other (.json) | 2 | 582,031 | 0.58 |
| other (.html) | 3 | 9,476 | 0.01 |
| other (.md) | 2 | 4,565 | 0.00 |
| Total | 8348 | 301,005,506 | 301.01 |

"Street packs" is everything under `assets/street/`. The `.txt` row is the other 266 text files (country detail data). Ibadan has 3,618 files (44.3 MB on disk) and Lagos 1,504 files (29.4 MB) in the build.

## 20 largest files

| # | File | Bytes | Brotli q11 |
|---|---|---|---|
| 1 | assets/city-wellington-terrain-112ccac.js | 4,905,869 | 620,924 |
| 2 | assets/street/ibadan/manifest-street-v1-00aaade16e7690e4.txt | 3,826,637 | 475,663 |
| 3 | assets/street/ibadan/manifest-street-v1-25a019ef30689d00.txt | 3,826,635 | 475,663 |
| 4 | assets/city-auckland-terrain-ad7edcd.js | 3,470,740 | 525,628 |
| 5 | character-lab/models/round4/male/base.glb | 3,460,568 | 1,647,480 |
| 6 | assets/street/lagos/manifest-street-v1-c0dd6f6101f6f562.txt | 3,401,548 | 315,146 |
| 7 | assets/street/lagos/manifest-street-v1-4966974ce7ed72ff.txt | 3,401,540 | 315,113 |
| 8 | assets/city-stockholm-geometry-3294476.js | 2,991,945 | 403,863 |
| 9 | assets/city-new-york-geometry-71196cf.js | 2,882,480 | 372,077 |
| 10 | assets/city-auckland-geometry-fd97c82.js | 2,791,083 | 352,904 |
| 11 | character-lab/models/round4/female/garments/male-worksuit-01.glb | 2,746,684 | 2,464,368 |
| 12 | character-lab/models/round4/male/garments/male-worksuit-01.glb | 2,730,260 | 2,449,123 |
| 13 | character-lab/models/round12/male/garments/female-elegant-01.glb | 2,725,880 | 1,870,156 |
| 14 | character-lab/models/round12/female/garments/female-elegant-01.glb | 2,720,644 | 1,861,732 |
| 15 | character-lab/models/round12/female/garments/fitted-skirt-01.glb | 2,713,188 | 2,535,833 |
| 16 | character-lab/models/round12/male/garments/fitted-skirt-01.glb | 2,711,260 | 2,537,185 |
| 17 | assets/city-amsterdam-geometry-d03e59f.js | 2,674,777 | 365,045 |
| 18 | character-lab/models/round4/female/base.glb | 2,632,124 | 855,476 |
| 19 | assets/city-mariehamn-geometry-7ec2e40.js | 2,443,185 | 315,149 |
| 20 | assets/city-oslo-terrain-a3fe377.js | 2,392,746 | 225,486 |


## Lagos street packs (`public/assets/street/lagos`)

| Item | Value |
|---|---|
| Files in folder | 1,504 |
| `pack-*.txt` files | 1,500 |
| Manifests | `manifest.txt` (67 bytes, pointer to `street-v1-c0dd6f6101f6f562`), two `manifest-street-v1-*.txt` (3,401,540 and 3,401,548 bytes; 315,113 and 315,146 brotli), `retained.txt` |
| Folder size | about 29.4 MB |

## Times

| Step | Wall clock |
|---|---|
| `vite build` (via agent-slot heavy) | 57.55 s reported by Vite, 59 s measured around the command |
| `typecheck.ts --serial` | 75 s, clean: 5 projects, 0 errors |

## Commands

```
cd /Users/anthonyakpan/Documents/Allworld-notes/work/perf
AGENT_SLOT_DIR=/tmp/allworld-slots node --experimental-strip-types scripts/agent-slot.ts heavy -- npx vite build --outDir /tmp/allworld-build/perf-main --emptyOutDir
node --experimental-strip-types scripts/download-budget.ts --dist /tmp/allworld-build/perf-main --all
node --experimental-strip-types scripts/typecheck.ts --serial
node /tmp/allworld-build/stats.mjs /tmp/allworld-build/perf-main   # category totals and 20 largest files (brotli via zlib.brotliCompressSync, quality 11)
```
