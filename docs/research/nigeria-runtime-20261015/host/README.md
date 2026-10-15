# Actual venue host evidence — batch001

These are cloud Linux Chromium/SwiftShader checks against the actual `createVenueHost`, production city definitions, canonical female player, network-style crowd input, renderer, navigation and camera. They are development-host evidence, not full application UI or production certification. No paid service or new credential was used.

Run the supported local dev server, then:

```
NIGERIA_HOST_CITY=abuja CHROME_BIN=/usr/bin/chromium node --experimental-strip-types scripts/nigeria-runtime-host-check.ts
NIGERIA_HOST_CITY=abuja NIGERIA_HOST_REENTRY=1 CHROME_BIN=/usr/bin/chromium node --experimental-strip-types scripts/nigeria-runtime-host-check.ts
```

The main receipt records exact source SHA256s before and after, screenshot hashes, actual GPU allocations, visible mesh inventory and host diagnostics. It proves only its assertions. Shader rendering here is software emulation, not physical-phone performance.

Abuja: near and far use scale1.4. Eight input crowd members are budget-admitted to fewer visible figures alongside the unchanged player. Near visible scene inventory peaks at16,566 triangles; sampled GPU submissions peak at15 calls and11,708 triangles after culling. The player walks from(0,39.2) to(8,39.2), then through the central crossing to median(8,21), with measured height0.25 matching0.252 support. Day/night lighting differs; both use the host's three lights. The separate weather receipt loads city rules and records actual `lookAt` results: sampled wet/harmattan flags remain false (Abuja rules have no climate field), so weather visual differences are **not certified**. Rotation was exercised; exhaustive collision angles are not certified. Near/far changes and three exits/reentries were exercised; the separate reentry receipt forces a render and captures each return. Final renderer disposal reports zero geometries and textures.

Lagos is **rejected**: canonical female body+wardrobe10,078 triangles plus imported near7,618 exceeds the17,000 whole-venue budget before crowd/overhead. Its retained failure receipt demonstrates the guard returning to fallback. Do not deploy it on the strength of the Abuja pass. The earlier Abuja crowd admission failure is retained separately and superseded by the successful source-pinned run.

The full application baseline reached the real Freedom Park guest HUD via creator/Play now with one canvas. Its screenshot timed out; the development manifest produced syntax errors. This is not full application integration acceptance, and no Abuja application-UI journey or live deployment was verified.

`failures/invalidated-hmr-*` are incomplete runs interrupted by source hot reload; their screenshots and results cannot certify the final source. Root-provided test/access receipts in this directory retain their own scope and failures; they do not upgrade the browser evidence to release readiness.
