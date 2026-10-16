# Native character release continuation

Updated 16 October 2026. Production deployment is authorized. Do not report it complete without the protected workflow receipt, live build check and browser verification.

## Checkouts and running services

- Release: `/Users/anthonyakpan/Desktop/JoinAllworld-native-character-release`, branch `codex/native-character-release-20261016`.
- Preserve the original mixed checkout `/Users/anthonyakpan/Desktop/JoinAllworld`; do not reset, stash or deploy it wholesale.
- Original game remains on port5173. Isolated candidate uses `http://127.0.0.1:5174/`, launched with documented `npm run dev -- --port 5174`. Use exact IPv4; another app owns the IPv6 localhost alias. Do not stop it.
- Character reference lab: `/Users/anthonyakpan/Documents/Codex/2026-10-14/task-2/allworld-character-lab`, `http://localhost.:4428/?view=third`. Baseline4427 remains preserved.
- Reuse running services. Do not start/restart lifecycle commands absent the user's applicable authorization.

## Ownership and current work

Read `docs/AGENT-COORDINATION.md` and the current records before editing. Astra `/root/unified_character_owner` owns integration, browser verification, CI and production release. Sol `/root/unified_consumer_audit` owns the bounded native recipe/catalogue/migration loading split. Root owns asset accounting/notices and read-only production continuity.

Current candidate commits: b6fee270f native replacement;4b1b29ece type/fixture repairs;a7ee6975b startup catalogue split. Follow-on physical migration module split is being finished; obtain final SHA from Git, not this note. Remote main advanced through92c9f8ffa with four documentation-only commits. Merge current origin/main and test the combined revision before release.

## User decisions

- Replace production players, NPCs, street people and previews with the selected native53 lab characters. No cartoon fallback or combined old/new actor.
- User authorizes production deployment after CI passes, including the retained skirts. No further skirt iteration requested.
- Explicit native exception:34,000 triangles/full actor;72,000 character/87,000 total scene triangles;default native assets up to5MB Brotli.60 scene draw calls and existing app startup/first-paint limits remain enforced.
- Physical-phone performance is unverified. Desktop/touch emulation is not physical-device evidence.

## Implementation and selected assets

Shared native body/appearance APIs cover gameplay actors, static native crowd snapshots, street near/far people, previews, campus, driving and map actor consumers. Old renderer code/assets remain archived in source/tooling but have no active production callers. CI rejects emitted retired body assets.

Fixed: height preview framing/reaction, same-actor updates, duplicate outside-home player after appearance replacement, first-person native head handling, blank Ready preview caused by two views sharing a renderer, and home visitor tags copied before native readiness. Home visitor callback guards against disposed/replaced batches.

Exact46 selected public resources are under `public/character-lab`. Runtime resolver precedence selects round12 skirts. Four contradictory catalogue fallback URLs were canonicalized to the same already-selected round12 URLs; model/texture bytes were not replaced. Unselected Franky final-pass research files are not shipped. Inventory and licensing receipts: `docs/character-assets/`, public notices and `selected-asset-inventory.json` in the evidence directory.

Measured defaults: female4,048,407B and male4,835,731B Brotli, excluding JS/decoder/HTTP overhead. Whole optional catalogue37,317,883B Brotli. Inventory passed zero missing files, selector conflicts, extras or exceeded approved native caps.

## Accepted evidence and limitations

Evidence directory: `docs/agent-work/native-character-release-evidence-20261016/`.

- Candidate browser: creator/Ready, Profile body+hair+height save/reload, home/outside movement and reentry single player, native park/airport/club people and movement,390x844 layout. Park55,314tri/42draw;airport62,102tri/53draw;club71,261tri/49draw.
- Actual-asset numerical probes pass height extremes, ownership/reentry, airport/club/park, native street8phase admission/hidden-player/disposal. Image/canvas stubs limit those probes to numerical evidence.
-40 focused recipe/onboarding/Boutique parity checks pass; browser legacy projection check covers18 lives. Preview12/12 and retained Home visitor regression1/1 pass.
- Full client and CI typecheck passed after explicit typed-array/Web Crypto repairs. A broad local scene test slice stalled after keyboard cases; it remains incomplete, not green.
- Fresh candidate campus/driving rendered movement checks, physical-phone performance, recording and exhaustive action/cloth acceptance remain unverified. Some source skirt clipping remains; do not claim all movement/cloth defects fixed.

## CI and remaining release gate

CI38835016230 built successfully but found type errors and startup overage. CI38837264732 passed build/full typecheck but startup remained over2928raw/1039gzip/1118Brotli. First-paint/scene-host/native asset limits passed. No cap increase is authorized for startup.

The remaining repair physically separates legacy conversion/prices from the eager native recipe validation module. Keep strict saved-recipe validation eager; renderer/editor conversion stays deterministic and lazy. Catalogue labels/presets and Boutique rows are lazy with server/client parity. A source size estimate does not prove emitted startup size.

Download accounting now reuses measurements only after SHA256 matches freshly read asset bytes. Independent native inventory CLI still compresses normally. Failed startup checks exit before optional catalogue compression and clearly label inventory not run. No skipped inventory may be reported as passing.

Next executable steps:
1. Finish/review the finite migration split, run focused parity checks and stage exact owned source.
2. Commit, merge latest origin/main, push release branch and dispatch CI on the exact combined SHA.
3. Require green startup/first-paint/host/native asset checks, retired-body artifact rejection and focused native tests.
4. Integrate reviewed tested source into main, respecting concurrent work. Dispatch protected release on current main with exact source SHA.
5. Verify live health/build, repeat read-only continuity for existing test actors and inspect production native appearance, movement, transitions and duplicate prevention. Then update this file and work records with exact receipts.

Builds run in CI, not locally. Commands:
```sh
gh workflow run CI -R kromate/joinallworld --ref codex/native-character-release-20261016 -f full_checks=false
gh workflow run joinallworld-release.yml -R kromate/joinallworld --ref main -f source_sha=<exact40hex> -f deploy=true -f publish_staging=false
```

Production baseline before release: health `joinallworld-c2419edbd4edac17602aa9199ce`, relay/companionAi true. Existing two synthetic actors passed read-only GET session/life identity+cash continuity. Sanitized evidence is `production-continuity-before.json`; private credential receipt remains outside the repository. Helper `/tmp/native-release-continuity.mjs` reuses it without logging credentials, creating identities or replaying actions. Post-release comparison is still pending.
