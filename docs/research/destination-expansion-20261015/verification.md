# Final combined verification — 2026-10-15

Source commit `ed0357a1` includes original batch001 `1054d570` and the clean main reconciliation `8462b96` (main `bc113b55`). This receipt adds no runtime source changes. All work ran in the supplied remote environment, not the Mac. No paid services, new credentials, PR, main write or deployment.

## Accepted scope

- Eight added stops, sixteen beta activities across five cities. Five stops/ten activities are new in batch002.
- `npm run typecheck` (3584MB heap): five projects, zero errors.
- `node --experimental-strip-types --test src/scene/destination-expansion.test.ts`:8/8, covering unique IDs, navigation in both directions,16 real engine dispatch/completion cases and estate preservation.
- Ibadan/Kano/Port Harcourt city contracts:12/12.
- Ibadan map/travel/journey, Kano placement/journey/outing, Port Harcourt placement/journey:21/21.
- Baseline comparison in preservation-batch002.json:408 pre-existing activities and all existing spots/defaults, housing definitions, positions and local routes unchanged across five cities.
- Catalogue and progression generator `--check` pass;284 cities/243 country identities; no story-seed changes. Generated content manifest updated only for the five cities; payload-deltas.json records exact byte increases.
- `NODE_OPTIONS=--max-old-space-size=6144 npm run build`:PASS (2m56s), including prebuild checks and emitted city/dictionary assets. Existing navigation/campus-rules circular-chunk warning remains; no build error.
- Chromium production VenueHost browser harness:32/32 activity checks over1280×800 and390×800, every return route, source hashes stable, zero console/HTTP errors. Sixteen screenshots. Independent receipt validation confirms all32 avatar locations within0.15host units of their intended anchors. Real pointer/touch and shipped phone-quality tier; synthetic accepted activity state. Full application/HTTP flow and physical-phone performance are **not** claimed.
- Visual review of the output confirms distinct existing scene compositions and usable controls. Photo fidelity is not accepted: Mapo's clock-tower/rust roof and Kano's generic palace palette remain explicit Blender replacement requests. No new reference photo pixels shipped.
- `git diff --check`:PASS.

## Download budgets

The initial full `npm run size:download` entered the expensive optional lazy-group inventory after checking gates. It was stopped after the final exact gates were obtained independently through the same repository function:

```js
import { checks, readDist } from './scripts/download-budget.ts'
const report = checks(readDist('dist'))
if (report.some(row => row.status === 'over')) process.exitCode = 1
```

No budget, compression setting, artifact filter or assertion was changed. Quality11 Brotli remains in effect. `download-budgets.json` records every named check:10 measurable gates pass,0 exceed; wardrobe/street tiles report not measured because no matching artifacts exist. Optional all-asset lazy-group ranking is omitted, not represented as a successful full CLI run.

| Gate | Bytes | Result |
|---|---:|---|
| Loading raw / gzip | 90,541 /35,259 | pass |
| First paint Brotli | 35,392 | pass |
| Largest startup raw / gzip /Brotli (284cities) | 602,211 /218,656 /191,930 | pass |
| Shared scene host raw /gzip | 187,304 /70,718 | pass |
| Largest base body Brotli | 138,098 | pass |
| Clip pack Brotli | 55,111 | pass |

## Integration handoff

Source commits to serialize through the existing integration owner: `1054d570` (original three stops) and `ed0357a1` (five next-city stops, combined tests/browser evidence). The reconciliation merge `8462b96` carries main's existing source; do not duplicate it when cherry-picking onto current main. This final evidence commit follows separately.

Runtime paths changed relative to main:

- src/game/cities/lagos/venues.ts
- src/game/cities/abuja/content.ts and scenes.ts
- src/game/cities/ibadan/content.ts
- src/game/cities/kano/content.ts and scenes.ts
- src/game/cities/port-harcourt/content.ts and scenes.ts
- src/game/cities/content-assets.generated.ts
- src/scene/destination-expansion.test.ts

Supporting changes: progression coverage fingerprints; this lane's work record; docs/research/destination-expansion-20261015/ (source citations, preservation/payload reports, metric Blender requests, reproducible browser harness/receipt/screenshots and this verification).

Integration/deployment remain pending with the parent-designated owner. Full-app smoke verification belongs in serialized integration. Eight art requests remain proposed, not produced/integrated; Okrika landing geometry and the Nembe terminal/photo-point identity remain unverified. Broader city/district expansion is ongoing work, not claimed complete.
