# Native character release continuation

Updated 16 October 2026. **Deployed and live:** runtime source `051efef0d1b4ca8f696e48cb568d4523f3beeb0b`, protected release [38842913386](https://github.com/kromate/joinallworld/actions/runs/38842913386), trusted policy `228443371`. Live health reports `joinallworld-051efef0d1b4ca8f696e48cb568`. Production: https://joinallworld.com/ .

Production home→outside reentry and keyboard walking/turning/stopping show one native crowned player without a stationary duplicate. A native street pedestrian was observed walking with intact limbs/clothing. Production Airport also passes: the native office player moves/turns/stops, seated/standing/counter NPCs remain intact, and one crowned player is visible without a duplicate. No recent browser errors were observed. Existing two synthetic actors retain identical identities and balances after release. Sanitized before/after/comparison receipts are in the evidence directory; private credentials are outside the repository.

## Checkouts and running services

- Release: `/Users/anthonyakpan/Desktop/JoinAllworld-native-character-release`, branch `codex/native-character-release-20261016`.
- Preserve the original mixed checkout `/Users/anthonyakpan/Desktop/JoinAllworld`; do not reset, stash or deploy it wholesale.
- Original game remains on port5173. Isolated candidate uses `http://127.0.0.1:5174/`, launched with documented `npm run dev -- --port 5174`. Use exact IPv4; another app owns the IPv6 localhost alias. Do not stop it.
- Character reference lab: `/Users/anthonyakpan/Documents/Codex/2026-10-14/task-2/allworld-character-lab`, `http://localhost.:4428/?view=third`. Baseline4427 remains preserved.
- Reuse running services. Do not start/restart lifecycle commands absent the user's applicable authorization.

## Ownership and current work

Read `docs/AGENT-COORDINATION.md` and the current records before editing. Astra `/root/unified_character_owner` owns integration, browser verification, CI and production release. Sol `/root/unified_consumer_audit` owns the bounded native recipe/catalogue/migration loading split. Root owns asset accounting/notices and read-only production continuity.

Runtime changes were assembled on current main and passed CI. Physical native migration/catalogue splitting fixed startup size without changing strict recipe validation or server/lazy-client migration parity. Latest deployed source is the exact full-CI-green revision above. Newer upstream documentation and trusted package-policy fixes were preserved on main. Inspect Git for current branch/HEAD rather than treating this note as a lock.

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

## Final verification

- Exact source main CI [38841897554](https://github.com/kromate/joinallworld/actions/runs/38841897554) fully passed. Prior combined runtime CI [38839594272](https://github.com/kromate/joinallworld/actions/runs/38839594272) also passed.
- Startup:614449raw/222873gzip/195479Brotli against unchanged615000/223000/195600 caps. Scene host188888raw/70897gzip passes. Native inventory46resources passed; retired-body artifact rejection passed.
-53 focused native integration tests and4actual-asset probes pass; protected Worker5/5 and source smoke17/17 pass. Guard27/27 includes a sealed fixture containing all selected actual native assets, identity tampering, unknown models, malformed models and oversize rejection.
- The native GLB packaging allowance is only for exact reviewed paths+SHA256+rawlength from the trusted source receipt, within the existing5MiB overall file cap. Other models retain2MiB. Exactly two metadata JSON and two licence Markdown paths are allowed. No blanket extension exception.
- Read-only production catalogue GET200 exactly matches selected source bytes. Live API health reports the deployed source with relay/companionAi true. Two existing synthetic actors passed GET session/life identity+cash continuity with identical before/after hashes. No new accounts or replayed actions.

Two protected attempts stopped before deployment on stale preset fixtures and the historical2MiB model guard. Those were repaired with literal supported-preset test data and the reviewed native-specific guard. The final release above passed all gates. Do not describe the stopped attempts as deployments.

Download accounting reuses compression measurements only after SHA256 matches freshly read bytes. Independent native inventory CLI still compresses normally. Startup failures exit before optional compression with inventory explicitly not run. The release build+size timeout is15minutes based on measured~10.5minutes; byte limits are unchanged.

## Running and checking the local candidate

The already-running isolated preview is `http://127.0.0.1:5174/`. To launch later from this checkout when authorized:
```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run dev -- --port 5174
```

Native numerical probe commands:
```sh
node --experimental-strip-types docs/agent-work/native-character-release-evidence-20261016/native-height-probe.mjs
node --experimental-strip-types docs/agent-work/native-character-release-evidence-20261016/neighbourhood-player-ownership-probe.mjs
node --experimental-strip-types docs/agent-work/native-character-release-evidence-20261016/native-scenes-probe.mjs
node --experimental-strip-types docs/agent-work/native-character-release-evidence-20261016/native-street-probe.mjs
```
These probes write numerical JSON receipts. Preserve prior evidence when rerunning. Use the exact locked dependencies, preserve other running previews and read the current coordination records before new source work.

## Remaining limitations and next work

Production home/street/Airport browser acceptance is complete and recorded. Physical-phone performance, fresh candidate campus/driving rendered movement, short recording, exhaustive action/cloth checks and the stalled broad local scene slice remain unverified. Some source skirt clipping is known; no further skirt iteration was requested. Do not claim every animation/cloth condition is flawless or that desktop/touch emulation proves phone performance.

No further runtime changes or redeployment are needed for this completed startup/native replacement release unless production verification finds a new defect. Preserve all unrelated work, private credentials, namespace/bindings and archived lab/baseline assets.
