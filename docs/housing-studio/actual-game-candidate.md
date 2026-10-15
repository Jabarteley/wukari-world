# Saved Home candidate

Reviewed housing wiring commit: `c9947af3c8ee0246e90899503cbcf6d5767481a5`. Current tested combined source: `f8bbaab7d6b7fefdde20d07c062b6bcd98752002`, including main Share fix `6695f00c`. Astra confirmed the reviewed housing/host paths are unchanged in that merge.

## Adoption stack

The standalone assets/modules are `5d932f12`, `48932aab`, `0fff8808`; standalone evidence is `25ccb89a`. Production adapter/compaction/hooks are `e9842318`, corrected by `f26a21a0`; actual lazy loading, host handling and final wall-preservation fixes are `c9947af3`. Integration owner must inspect/cherry-pick the owned commits in dependency order; merge commits merely synchronize main. No new PR, main push or deployment from the housing lane.

## Final local evidence

- 76/76 combined housing, Home lighting, venue host and first-person runtime checks pass, 16.837 seconds. `/tmp/housing-final-combined-tests.log`.
- Scoped strict TypeScript includes every housing module/test, new venue host tests and actual world adapter. Exit0, 4.361 seconds. `/tmp/housing-final-scoped-typecheck.log`.
- Full serial five-project TypeScript gate is incomplete locally: the test compiler exhausted the explicit 3072MB cap. The other four projects reported no new failures. No baseline, source guard or budget was relaxed. Existing CI config uses 8192MB; full hosted qualification remains required. `/tmp/housing-final-typecheck.log`.
- Full production npm build exit0, 62.630 seconds; Vite 50.21 seconds. `/tmp/housing-final-build.log`. Emitted `production-81e1e125.js` and `world-adapter-f35d4145.js`.
- Final download-budget gate passes (exit0,217.998 seconds). Startup609,092/615,000 raw and220,828/223,000 gzip bytes; sharedhost186,608/192,000 raw and70,545/71,000 gzip; every measurable unchanged gate passes. `/tmp/housing-final-size.log`. Heavy lease returned to first-person owner.

## Browser fixture and pending acceptance

Actual game: `http://127.0.0.1:4441`, dedicated synthetic DATA_DIR `/private/tmp/allworld-housing-game-20261015-p9gqt5wn/data`, session10498. Only local Operator public ID `5d1416d0-1076-4c57-91fa-829dddad9ab4`, owned bq with13 original items, currently Home. Normal local recovery is GET `/api/account/open-dev/operator`, then game root. Private cookie and save baseline remain outside Git. No production guests or real accounts created/modified.

The integration owner explicitly released one isolated Astra-owned headless session against localhost4441 with a fresh temporary profile and the existing synthetic operator. User Chrome, Incognito, CDP/native interaction, production requests and real saves are excluded; standalone4435 is preserved. Astra is verifying actual enhanced Home/asset loading and shader compile, default third person and first person, manual front/room doors, blocked exit feedback with no travel command, normal exit/reentry, furniture actions/native TV, Buy selection/ghost/move/store and saved look/layout persistence. Upgrade the same synthetic actor through bungalow, duplex and villa to cover stairs and retained items; do not create extra production players. Record exact viewport/source and console/render counters.

Visitor/story/rental/starter/unsupported/constrained or over-budget saves keep canonical Home. This behavior has component evidence; hosted/physical-device acceptance is separate. The view-only furniture-action waiting tradeoff leaves the authoritative server action/timer unchanged while a closed room prevents approach. Integration owner must accept that behavior before adoption.

Final owner adoption, full hosted CI, protected release, served artifact and actual hosted journey remain OPEN. No ready production link is claimed by this receipt. Standalone localhost4435 remains a separate preserved preview.
