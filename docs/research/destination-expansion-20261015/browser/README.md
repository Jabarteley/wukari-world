# Browser acceptance harness

This exercises the **real production VenueHost** through pointer/touch presses at 1280×800 and 390×800 using the shipped `?quality=phone` diagnostic tier. Chromium uses software WebGL in the supplied cloud runner. This proves rendered host movement, selected stop/activity state and return traversal; it is not a full application/server/HTTP journey, high-quality desktop acceptance or a physical-phone performance result. The separate Node test dispatches and completes all16 activities against the real engine.

Run from repository root on this cloud runner:

1. `mkdir -p .destination-review`
2. `cp docs/research/destination-expansion-20261015/browser/fixture.html .destination-review/index.html`
3. Start `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5197 --strictPort` in an owned process.
4. `CHROME_BIN=/usr/bin/chromium node docs/research/destination-expansion-20261015/browser/driver.mjs`
5. Stop only that owned Vite process and remove `.destination-review` after the run.

Existing `scripts/journeys/cdp.ts` supplies the browser driver. No external testing service, new dependency or credential. The harness uses production scene styles to avoid invalid unstyled overlays. The 60-second movement timeout accommodates software rendering without bypassing traversal or teleporting the actor. The driver checks real settled/locked state, source hashes, console errors and HTTP failures, saves screenshots, and kills its own Chromium process tree.

Earlier nonaccepted attempts: missing scene CSS produced an oversized icon; initial 30-second timeout was too short for a return walk under software rendering; focused Jabi then completed its return but the harness favicon404 failed error acceptance. These were harness fixes, not application fixes. Only the final receipt and matching screenshots should be used for scoped acceptance.

The synthetic accepted state is intentional: no user save, account or housing is touched. Asset photographs remain outside this harness and are not shipped pixels. The screenshot geometry is the existing stylised scene, not photo-matched finished Blender work.
