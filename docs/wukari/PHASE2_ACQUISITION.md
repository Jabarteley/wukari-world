# Phase 2 — acquisition and reproduction

**Result: real Wukari LGA context acquired; FUW campus map blocked, not complete.** Read [PHASE2_CAMPUS_STATUS.md](PHASE2_CAMPUS_STATUS.md) for gaps and checks. The source boundary is administrative context, not the town extent or campus boundary.

## Offline review (no network required)

```sh
cd /workspace/wukari-world
node scripts/wukari/verify-boundary.ts
node --test src/wukari/*.test.ts
npx --no-install vite --config scripts/wukari/preview.config.ts
```

The preview defaults to the committed `data/wukari/verified/context.dataset.json`. It displays only a real administrative silhouette, source identity/attribution, reversible cursor coordinate readout, compass bearing and explicit missing-campus notice. It has no controllable character or fictional campus. The fixed JSON endpoints are read-only. No credentials or outside API calls are used by the browser.

To inspect the unchanged foundation fixture, generate it using `node scripts/wukari/import.ts --synthetic`, then start Vite with `WUKARI_PREVIEW_MODE=foundation`. This explicitly selects the synthetic lab. A missing real snapshot never silently falls back to synthetic data.

## Retrieve and reproduce the boundary

```sh
node scripts/wukari/acquire.ts --boundary-only
```

The command verifies the original national ADM2 **9,422,551-byte / `bef7f2c…c02fcd`** pin, independently records the public license metadata, selects exactly one Wukari feature, checks all its vertices against the existing pinned Taraba ADM1, and writes a timestamped directory under `.cache/wukari/acquired/runs/`. The full source is retained there; it is not shipped in the browser or committed as a national dump. **Exit 2 intentionally means the campus milestone is incomplete**; exit 1 means acquisition/integrity failed. The machine-readable last line identifies the output directory. Boundary-only mode does not request Overpass.

With the exact directory printed above:

```sh
node scripts/wukari/record-boundary.ts ACQUISITION_DIRECTORY
node scripts/wukari/verify-boundary.ts --master ACQUISITION_DIRECTORY/nga-adm2.source.geojson
```

Recording writes the curated `data/wukari/verified/` boundary, receipts, source-derived query, coverage and context dataset. Review the diff: new retrieval timestamps/receipts reflect that acquisition, not an invented original date. The selected boundary must reproduce byte-for-byte from the full pinned source, and must match its separately recorded **7,764-byte / `fdf3cf24…9c7a1fc`** derived pin. No source coordinates are rounded. The committed failure receipt is historical evidence; boundary-only acquisition records discovery as not requested rather than inventing an OSM response. Preserve useful earlier acquisition directories.

`verify-boundary.ts` checks curated bytes, source/metadata identity and attribution, retrieval dates, source-derived query, Taraba membership and honest context/coverage. `--master` additionally proves exact selection from original national bytes. Without it, source attribution/derived pins are verified offline, but national-source reproduction is not claimed. Both forms have been exercised in this environment, including a fresh HTTPS retrieval and repeat selection/curation.

## Acquire FUW features when a provider becomes usable

```sh
node scripts/wukari/acquire.ts
```

This makes one sequential, bounded discovery query derived from the **actual Wukari ADM2 bounds**, retaining query text/hash and successful raw OSM JSON or structured failure receipts. A study bounding box is not represented as a legal campus/town boundary. The pipeline remains incomplete even if discovery succeeds: inspect candidates, corroborate FUW identity/access and obtain a bounded campus feature extract before promoting data to an explorable map. No university/gate position is filled in by hand.

An alternative public Overpass endpoint is supported only by explicit selection after its network access and terms are confirmed:

```sh
node scripts/wukari/acquire.ts --overpass-endpoint https://overpass.private.coffee/api/interpreter
```

There is no automatic provider hopping. The mirror, official OSM API and institutional site are currently denied by the proxy; required domain additions are saved in the environment draft. Existing presets/domain entries are preserved. Applying that draft and retrying is outside what a configuration save itself does. Geofabrik/BBBike were also checked and denied; no 700 MB national extract, proprietary map or unlicensed asset was substituted.

## Failure and integrity behavior

`acquisition.ts` uses public HTTPS only, a truthful project User-Agent, bounded body sizes, explicit timeout/connect limits and the environment's existing proxy/trust configuration. It preserves TLS/checksum verification. A success receipt records exact URL, bytes, hash, actual retrieval time, attribution, license and query; it is **source-backed, not field-verified**.

403/proxy CONNECT denial, 406, TLS verification errors, integrity failures, malformed/partial responses and credential-bearing source URLs are not retried/bypassed. 502/503/504 and timeouts permit at most three attempts with bounded exponential backoff. 429 requires a valid `Retry-After`; longer delays return control without retrying early. Failed receipts say `not-acquired` and have no acquired bytes/hash/date. Overpass `remark`/timeout content is refused. Each run preserves its own timestamped artifacts rather than overwriting a prior failure with a fabricated empty source.

The historical 502 body explicitly said all query workers were busy and the queue full. The final LGA query timed out three times, recorded in `provenance.json`. These observations distinguish provider failures from proxy denials; they do not prove missing FUW coverage.
