> **Ready for local testing — 13 October 2026.** Food data is compacted; both remaining Ayo expectations are fixed. All 150 focused checks, full typecheck (5 projects, zero errors), production build and all measured download budgets pass. The shared scene bundle is 188,216 bytes raw / 70,633 gzip, below the unchanged 192,000 / 71,000 limits. Preview: http://127.0.0.1:5173/. No deployment was performed. The old allowance continuation remains paused.

# Test the local Allworld improvements

This checkout: `/Users/anthonyakpan/Desktop/JoinAllworld`, starting commit `5179285a25cb616e9c8ef5b137150a5a6f6e05e7`. These changes were verified locally and have not been deployed.

## Open the game

Use **http://127.0.0.1:5173/games/ayo** on this Mac. Choose **Play the computer**, then choose a glowing cup on your bottom row. The top row belongs to the opponent. The board explicitly uses **Oware rules**; other Ayo house rules vary.

You can also open the Phone → Games → Ayo, or in Lagos Freedom Park tap **Ayo · Ayo board under the trees**, let your character walk to it, choose **Sit down**, then **+ 1 bot**. Public tables support the existing friend/player flow.

The local preview uses `.data-open`, gives new guests local test funds, and advances the game clock faster. The existing service on port 4400 is a different checkout. No production account or deployment is needed.

If this Mac or the terminal has restarted, start this exact checkout with:

```sh
cd /Users/anthonyakpan/Desktop/JoinAllworld
npm run dev:open -- --port 5173
```

Keep that terminal open. Table matches follow the existing timeout rules: 45 seconds per turn, automatic moves for missed turns, and eventual forfeit after repeated misses. A browser refresh during an active match retains the seat and board; restarting the local server clears in-memory matches.

## Faces, hair and clothes

Open **http://127.0.0.1:5173/**, click your character name, and use **Profile → Face**. In the Body tab, compare **Calm**, **Smile** and **Grin**; Hair, Outfit, Extras and Layers use the existing wardrobe controls. Save only the changes you want on this local guest. The player now has visible eyes, saved expressions and blinks during existing motion, using the existing body material. Sleeping closes the eyes and relaxes the mouth.

For detailed inspection, open **http://127.0.0.1:5173/scripts/body/wardrobe-preview.html**. Try **everyday-glasses**, **traditional-man**, **covered-woman** and **work-carry**; switch between idle, walk and sit, and use the face, angled-face, side-face and rear-face views. Hair and headwear follow measured head bounds; frames sit in front of the eyes. Braids, locs and ponytails now have tapered, varied strands rooted in the shipped fitted scalp. Garment shoulders, waist overlap and robe hems are fitted to the shipped skeleton. This inspection page uses the shipped body and wardrobe geometry and tints the retained scalp; its base texture is not the game's complete lighting/material presentation.

Open **http://127.0.0.1:5173/scripts/body/npc-preview.html** to inspect Amaka, Baba Sege, Kunle and Mama Ronke. Select **Face close-up**, then compare the expression, blink and speaking controls. **Play 8-second comparison** is finite. Both comparison columns use the improved geometry: the left shows the discrete pose and the right the smoothly animated version, so this is not an old-face/new-face comparison. The same faces and authored appearances are integrated into the game when those NPCs' schedules place them nearby.

## Character motion

Walk between Freedom Park spots to see the player blend into walking and settle at arrival. For a close comparison, open **http://127.0.0.1:5173/scripts/body/motion-preview.html**. Choose Woman or Man, then **Walk → jog → stop**. The sequence is finite; its on-page diagnostics should finish with `easing=false`, `loopActive=false`, and `rafQueued=false`.

## Imported food artwork

The buka's fourth counter pot now has handles and visible stew ingredients from the CC0 Kenney Food Kit. Open **http://127.0.0.1:5173/src/scene/harness.html?kind=buka&time=day&crowd=6** for a direct scene inspection, or visit a buka that uses the common scene in the game. The source model is baked into the existing scene mesh; no new texture, runtime model loader, dependency or draw call is needed. The ladle is lowered to reach the stew.

The reference GLB and baked model passed three-quarter, top and side comparisons. At six visitors, the harness changed from 12,347 to 12,645 rendered triangles; calls and geometries stayed at 16 each. The compact generated module is 4,298 bytes when gzipped on its own. The final complete shared scene bundle is 188,216 bytes raw / 70,633 gzip; both limits pass without budget changes. Desktop and 390-pixel harness screenshots and a close-up are saved in `evidence/`; this is visual coverage, not physical-phone performance proof. See [food-integration.md](food-integration.md) for the source hashes, reproducible conversion and approximation error.

The actual guest journey also passed: travel from Freedom Park to **Amala Shitta**, approach the counter, complete **Efo Riro, Ponmo & Semo**, and receive the hunger increase. The pot is visible in that live local scene. After the activity and ambient window settled, a 16-second observation recorded no additional render or ambient frames (`loop.running=false` throughout). This single-resident scene measured 12 calls and 13,964 rendered triangles; it is not a maximum-crowd phone benchmark.

## Verification

- Ayo: real human move, computer reply, legal/empty cup states, immediate active-match reload, and the physical park table entry.
- Responsive board: all 12 cups visible at 320 CSS pixels; measured touch targets are approximately 44.7 × 54 pixels with no overlap. Reduced-motion sowing shows the accepted result immediately.
- Both player body variants finish the walk/jog/stop sequence without a continuing animation loop.
- Actual profile: the skinned body's closer Face view was accepted, and a local guest's Grin saved successfully and remained selected after a full reload. Existing profile-preview checks passed 12/12, including finite animation and disposal behavior.
- Wardrobe browser acceptance: everyday glasses/braids and facial expressions; work outfit/backpack when seated; covered blouse/wrapper when walking; kaftan when walking and seated. The robe and trouser seam now uses matching bone weights, removing the raised-knee overlap. A close-up also verified the casual short-sleeve cuff after its weights were matched to the shipped arm; the camera keeps the face framed when changing poses. Accepted kaftan: 908 garment triangles, 60,744 bytes, one wardrobe draw and the shared skeleton.
- NPC preview: an eight-second run settled to `loopActive=false` and `rafQueued=false`. Reduced motion disables the motion run. NPC speech reaches the real venue through the campus adapter; the earlier missing-method integration error was fixed.
- Close-up NPC revision: oval, round and long faces now differ; small almond eyes, a projected nose and mouth opening retain stable morph topology. Mama Ronke's folded gele and coordinated owambe outfit passed front and angled views. Kunle's blink fits his glasses. Final authored costs: Amaka 483, Baba Sege 487, Kunle 517 and Mama Ronke 519 triangles. All four retain identical topology through standing, walking, blink, speech and sleep.
- Hair revision: female braids passed front/angled/rear walking views; ponytail passed the side view; male locs passed the angled glasses view. The fitted base scalp avoids bare roots and floating crown ridges. It restores 620 female or 592 male body triangles in the existing body draw; these are additional to the wardrobe overlay cost.
- Collar revision: male casual idle/walk/sit and rear views now clear the trapezius; the female angled walking view remains clean. The revised collar adds no triangles. Male casual with lowcut/glasses: 1,020 overlay triangles, 4,350 hidden body triangles, 5,672 viewer triangles. Female casual with braids/glasses: 1,596 overlay, 4,472 hidden and 6,126 viewer triangles. Each uses one wardrobe draw and the existing skeleton. The real profile also displays the retained scalp with its saved blonde tint and Grin.
- Live Freedom Park: reduced motion settled the renderer, with no actor easing left. Latest single-resident sample: 11 draw calls and 12,498 triangles. Scene composition changes with the accelerated local clock, so this is a sample, not a fixed budget for every visit.
- Final Ayo/venue/routes/table-component checks: **53/53 passed**, including both corrected expectations in `src/venue-world.test.ts`. Only the requested expectations and the stale table-count comment were changed in this follow-up. Log: `/tmp/allworld-ayo-final.log`.
- Final scene/movement/parametric/ambient checks: **55/55 passed**. Final body/avatar checks: **42/42 passed**. Logs: `/tmp/allworld-scenes-final.log` and `/tmp/allworld-ready-body.log`.
- Full typecheck: **5 projects, zero errors**, no baselined JavaScript errors. Log: `/tmp/allworld-ready-typecheck.log`.
- Production build: **passed**, including all 86 city content assets and the dictionary. Command: `NODE_OPTIONS=--max-old-space-size=8192 npm run build:slot`. Log: `/tmp/allworld-ready-build.log`. Existing chunk-size/circular-chunk warnings remain; no dependency or lockfile change was made.
- `npm run size:download`: **passed every measured budget**. Shared scene: 188,216 raw / 70,633 gzip, down from 254,958 / 74,525. Startup across 86 cities: 604,543 raw / 218,564 gzip / 191,499 Brotli. Wardrobe-item and street-tile standalone asset patterns report not measured because these files do not exist. Log: `/tmp/allworld-ready-download.log`.
- Final browser pass: Ayo legal sowing move, house opponent reply and active seat/board after reload; actual profile face view; woman glasses front/side/walk and man glasses seated plus sunglasses walking; NPC blink/speech and reduced-motion disabling; compact buka pot unchanged at 12,645 rendered triangles, 16 calls and 16 geometries. In a 20-second live-venue probe, the animation window ended; samples at 16 and 20 seconds stayed at 10,127 renders / 9,902 ambient frames with `running=false` and no avatar movement/easing. Events can open another bounded animation window.
- Final eyewear fit: frames now sit 6 mm beyond the measured bridge instead of roughly 33 mm beyond it. Rims align with measured eye centers and side arms join the outer edges. Glasses use 156 triangles, sunglasses 52, eight fewer each; the same skeleton and wardrobe draw are retained. Female casual/braids/glasses: 1,588 overlay triangles; male casual/lowcut/glasses: 1,012.

## Performance boundaries

Player facial features add no material or draw call. Nearby NPC pose and facial targets share one merged mesh; at most four controllers are active, with at most one controller construction attempt in an animated frame. Distant/light-tier people retain the existing discrete-pose geometry and do not acquire morph controllers. Light tier is selected for reported low memory/core counts or Data Saver/2G; a capable compact phone can still use the full NPC path with the separate phone rendering budget. NPCs use the existing finite ambient window, and neither facial system owns a timer or requests frames. Hidden and reduced-motion transitions settle the ambient window immediately.

The four authored NPCs measure 483–519 triangles each, within the 600-triangle full-figure ceiling; the exhaustive low-detail sweep ranges from 399 to 599. Earlier scene/ambient/crowd geometry sampling found a busiest scene of 16,684 triangles / 29 calls; the highest call count was 39. The regulars/market assertion passed at 13,463 triangles / 44 calls. All are below their 17,000/60 limits. The wardrobe sweep covered 232 generated variants: all finite, sharing the base skeleton, at most 1,812 overlay triangles and 107,424 bytes, below the 3,000-triangle garment budget. A desktop Kunle preview sampled p95 CPU update plus render submission at 0.90 ms over 958 samples; this excludes GPU time and does not establish low-end-phone performance.

A further Chrome 4× CPU-throttled Kunle run completed all eight seconds and settled with no queued frame: 517 triangles per figure, three viewer calls and 1.50 ms p95 CPU update/render submission over 958 samples. An Amaka controller built under the same throttle in 14.8 ms. These are isolated, warm-code desktop simulations, not measurements from a physical phone or a full four-character scene; GPU completion is excluded. CPU throttling was restored to normal after capture.

These are stylized characters, not photorealistic replacements. One downloaded CC0 food prop is now integrated as baked geometry; no new runtime dependency, physics engine or paid generation service was added. The repository/asset shortlist and the linked X-post assessment are in [README.md](README.md). Browser evidence is in `evidence/`.

## Remaining validation

The requested food-size and Ayo-expectation fixes are complete and accepted for local testing. Character and NPC appearance passed the browser checks above. Physical low-end-phone performance and deployed behavior remain unverified; no promise of zero lag on every device is implied. Other downloaded assets and physics-engine adoption remain research, outside this finished batch.

Final screenshots: `evidence/character-face-final.png`, `male-glasses-final.png`, `glasses-side-before-final.png`, `glasses-side-after-final.png`, `npc-face-final.png`, `profile-final.png`, `ayo-final-reload.png`, and `buka-compact-final.png`.
