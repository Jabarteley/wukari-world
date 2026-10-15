# Nigeria runtime adapter checkpoint

This is an isolated adapter diagnostic, **not actual game integration or production acceptance**. No game entry imports the adapter. Existing scenes, customization, loaders and deployment policy remain unchanged.

Source base: `81a94cbbd6b5024ae87fb2d1d6b3d11239637ddb`. Assets: private `kromate/allworld-assets` commit `8d01a5b83ab23a64b621def4784ffd0c93684c81`. `asset-contract.json` independently verifies all three supplied batch manifest hashes, six module payload chains, 12 GLBs and navigation extracts.

## Executed checks

- Baseline: 20/20 scene/model/contact/lifecycle/budget tests.
- Candidate: same selection plus eight adapter regressions, 28/28 passed. Command: `node --experimental-strip-types --test --test-concurrency=1 src/scene/models/*.test.ts src/scene/venue-contact.test.ts src/scene/context-release.test.ts src/budgets.test.ts`.
- Baseline CI succeeded: https://github.com/kromate/joinallworld/actions/runs/38674324832 . Candidate full checks are separate.
- Actual Chromium 151 / Linux SwiftShader run, 1100×800 viewport, Node 24.19.0. `browser.json` records eight real near/far day/night captures using `createHostLights`, `lightingFor`, and `applyRendererLook` from the game. Every image was visually inspected: retained PBR surfaces and city silhouettes; far tiers visibly omit detail; night facades are dark. No gameplay/camera/lighting parity acceptance is inferred.
- Four near/far/unload cycles returned geometry to zero and retained only the host shadow texture; full disposal returned both geometry and textures to zero. Requested far indoors produced near. No reported console errors or HTTP failures. This is an instantaneous software-renderer diagnostic, not physical-device performance or a long soak.
- Renderer counters describe the diagnostic's rendered passes only. The adapter conservatively reserves main plus the explicitly declared host shadow passes. Aggregate game budgets remain unverified.
- Initial full typecheck found two synthetic texture fixture typing errors; corrected to DataTexture. A direct tsc attempt without the repository's data-stub loader exhausted its default heap; stopped the other owned direct compiler attempts and returned to the supported serial repository command. No passing typecheck is inferred from a partial run.

The harness is preserved as text alongside its HTML and CDP driver. It imports the actual repository modules through Vite, expects private batch-001 files under its `assets/` directory, and exposes diagnostics only. It never starts a player or certifies navigation. The saved driver contains originating cloud paths; adapt those paths when reproducing elsewhere. No GLB or private source payload is republished here.

## Remaining gates

1. Deliberate host placement and terrain/camera/grid design. The mosque is 154×113.4 game units at scale 1.4, not an ordinary venue-sized replacement. Broad Street's approved walk area is the sidewalk; do not invent shop interiors from its appearance.
2. Actual game navigation, entrance/exit/actions, collision/contact alignment, fallbacks/customization, day/night/weather, cancellation under venue changes and total scene budgets.
3. Full candidate CI/build/download-size checks and exact-source release. Batches 002/003 stay gated on a verified first batch.
4. Restore cloud environment access to GitHub Actions API and production health. `gh workflow run ci.yml ... --ref main -f full_checks=false` fails while reading the workflow with `Forbidden`; no workflow was dispatched. `curl https://joinallworld.com/api/health` returns 403, including an observed CONNECT-proxy rejection. Supported elevated-network retry also fails. Existing Git read/push and connected GitHub read APIs are separate capabilities; no new credentials were requested and no release guard was changed.

No deployment or production match is claimed.
