# Housing studio ownership and acceptance

## Identity
- Work ID: housing-studio-20261015
- Owner: /root; chat 01a13a37-fa90-7140-822a-36e81c1c4794
- Model / effort: primary integration and browser owner; Luna reference/asset research; Sol bounded housing implementation
- UTC updated: 2026-10-15T15:46:57.130204+00:00
- Status: integrating-actual-game
- Work state: standalone verified; production consumer wiring in progress

## Goal and boundaries
- Goal: deliver a playable, furnished Lagos house first, then apartment/duplex/Abuja mansion variants with first/third-person exploration, collisions, doors, stairs and indoor/outdoor transitions.
- Scope: standalone housing studio and additive reusable housing data/render/navigation modules; real architectural photo references and existing licensed Blender assets first.
- Exclusive ownership: housing-studio.html, src/housing-studio/, scripts/housing/, docs/housing-studio/, this record. No existing home/customization/runtime protocol changes without owner agreement.
- Input: current main bc113b55; existing home-plan/home-layout/furniture/save contracts and owned allworld-assets revision e810eb46.
- Output: tested source commit(s), standalone reviewable studio, reference/provenance ledger and exact evidence for integration owner.
- Dependencies: retention chat 01a13bea owns main/deploy; first-person chat 01a13a42 owns home-scene, venue-world, view-extension, camera/body/ScenePane integration until accepted release checkpoint.
- Exclusions: no PR, no main push, no deployment, no production data changes, no overwrite of existing housing/customization or first-person drafts.

## Repository state
- Repo: kromate/joinallworld
- Host: Anthony Mac
- Checkout: /Users/anthonyakpan/.codex/worktrees/housing-studio-20261015/JoinAllworld
- Branch: codex/housing-studio-20261015
- Original base: bc113b55a135c7a37592d264764407627263aafc
- Current dependency: 73f66122c42c70bba4e4128cde901865d2a39c7b, fast-forwarded from the published FP branch with its owner’s explicit agreement; shared source remains unedited.
- Dirty state at start: clean isolated checkout; primary Desktop checkout and earlier asset phase remain untouched.
- Dependencies: node_modules symlink to primary installed dependencies, no lock changes.
- Resources: owned Vite built preview port 4435, session 22501 (dev session 8557 stopped), http://127.0.0.1:4435/housing-studio.html. Browser tab 460560984. No other server/process touched.

## Milestones
| Unit | State | Evidence | Next |
| --- | --- | --- | --- |
| Ownership, existing work, online reuse research | accepted | coordination messages; Luna/Sol audits; completed Lekki apartment and Alexence Villa photos inspected | Preserve additive scope |
| One furnished playable house | verified-local | actual browser gate/inside/dining/upstairs/down/outside journey; door close and F reopen | Integration owner adoption |
| Apartments, duplex, mansion variants | verified-local | all 4 recipes entered in both views; mansion roof reached at y=6.83 | User visual review and integration |
| Tests, browser and budget acceptance | verified-local | current 12/12 tests; conservative scenery 13,920; assets 164,752 bytes; prior browser and phone-width checks; current spatial browser gate passed | Final scoped TypeScript passed after owner lease released |
| Tested commit integration handoff | ready | this committed source and docs/housing-studio/verification.md | Send exact SHA to sole integration owner |

## Decisions / evidence
- User explicitly requests testing, tested commits and coordination, and directs using best judgment without routine questions.
- Current integration owner confirmed isolated new housing modules are clear; overlap with released housing/FP files is held until first-person owner supplies accepted checkpoint.
- Online reuse research: Three.js official PointerLockControls/collision examples; owned 530-asset catalogue preferred over downloading duplicate furniture. Photo references are visual references, not licensed game textures.
- Production remains outside this work. Physical-device performance is separate from browser emulation.

## Immediate resume steps
1. Integration owner reviews the exact housing commit and evidence; review the additive housing stack 5d932f12, 48932aab and 0fff8808 plus its evidence commit when that lane is ready.
2. Keep preview4435 available for user review. Reproduce with the README commands if restarted.
3. Main adoption, hosted CI, physical-device acceptance, production budgets and deployment remain with the existing integration owner; do not create a competing release.

## Checkpoints
- 2026-10-15T13:32:00Z: registered isolated ownership before source edits; latest-main source pinned, both integration and FP owners contacted and acknowledged.

- 2026-10-15T14:08:00Z: four additive housing recipes, compact asset reuse, shell/furnishings/exterior and internal doors implemented. Existing Home and shared FP host own navigation/height/body; stable grid delegation enforces closed doors. Ten focused checks pass. Initial scoped build passed; final package recut with publicDir:false to avoid copying unrelated public assets. Main/FP/customization source unchanged.

- 2026-10-15T14:24:00Z: focused tests10/10 and scoped TypeScript pass; isolated build40files/4,621,442bytes, largest3,341,364bytes. Actual built-browser visits prove both apartments, duplex and mansion, room navigation, both FP/TP, up/down stairs, front-door transitions, 6/12/16/21 model instances without failures, and phone-width touch movement. UI/art/transom/terrace fixes based on live inspection; exact final entry housing-studio-Btcqgvyw.js loaded in browser with no captured console warnings/errors. Saving final evidence before commit.

- 2026-10-15T14:39:17.859462+00:00: final controls/tag CSS verified; zoom no longer scrolls the scene out of view. Final package40files/4,627,436bytes; entry housing-studio-DPYkFblY.js (3,341,364bytes; gzip level9 930,059). Ten final focused tests pass, max14,244scenery triangles including86retained Home triangles. Final mansion roof revisited at(2.50,6.83,1.43),21models/0failed, no captured browser warnings/errors. Screenshots, package hashes and acceptance matrix saved under docs/housing-studio/. Preview4435 remains available for user testing.

## Delegation receipt
- Luna supplied bounded asset inventory/provenance, compact GLBs and budget checks; Sol supplied fixture/exterior/door modules and contract tests. Parent reviewed, integrated and owned browser acceptance. Accepted result: four playable recipes and ten passing focused checks.
- Tokens, monetary cost and exact worker elapsed times are unavailable; no measured savings claim. Parent held repeat TypeScript behind the integration owner heavy lease rather than competing for local build resources.

- 2026-10-15T14:43:28.279992+00:00: final scoped TypeScript exit0 after the integration owner released its heavy slot; final10/10 tests and cached diff check pass. Only additive source/assets/docs staged (dist-housing excluded). Ready for exact tested commit handoff.

## User feedback correction
- 2026-10-15T14:50:12.189452+00:00: user rejects unclear inside cutaway and excessive doors, requests independent front-door open/close. Reopened additive lane from5d932f12. Sol owns doors.ts/doors.test.ts and its own record; Astra owns browser inspection/acceptance; parent owns view framing, explicit overview and front-door adapter in existing additive paths. No shared Home/FP/runtime edits planned.
- Acceptance: recognizable full-height room partitions in normal interior, explicit whole-floor overview, privacy doors instead of every passage, independent front open/close without changing player position/location, retained entry/exit and stair routes, focused checks/budget and actual browser evidence.

- 2026-10-15T15:06:23.718547+00:00: feedback code complete and frozen. Parent replaced the room-graph-only door selector after it sealed a necessary furnished mansion route; redundant gaps now seal only when actual raster-grid room/stair reachability is preserved. Final counts4/2/4/6 internal doors, duplexgroundonlyoneGuesttoilet door. Fullheightpartitions normalTP; explicitflooroverview; higherfullfloorcamera; stairlandingcaps. Separate front-door adapter preservesmanualstate and rejects closing through avatar, yielding duringnativeentry/exit.
- Final11/11focused checks pass (0.93s), scopedTypeScript exit0, isolatedbuild passes1.83s. Newpackage40files/4,632,792bytes; largest3,346,344bytes; entry housing-studio-Cpt9b-AG.js, gzip931,760B. Conservative scenery13,800/15,000 acrossFP/TP/overview/exterior. Screenshot/browser acceptance stillpending: integrationownerrequestedexclusiveChromeproductionQAand2actorcleanup; housingAstraconfirmedHOLD, lastbaselineUI15:48:33Lagos. Preview4435servesnewbuild, no competingbrowser/nativeactions.

- 2026-10-15T15:09:00.866339+00:00: final source hashes still match tested/built source. HousingAstra attempted exactlyoneindependenthiddenIAB entry; IABunavailable, Chrome/native remaineduntouched. Existing integrationowner is waitingforhumanChromehandoff forproductionQA. Finishthisboundedsourcecommitwith11passingchecks, leavingvisualacceptance explicitlypending; do notclaimupdatedscreenshotsorconsoleproof. Next executable step: after integrationowner releasesChrome, resume housing_visual_qa againstCpt9b-AG, capture normalTP/overview/manualdoor and stair/exit evidence, then update acceptance before adoption. No newdeploymentorPR.

## Spatial overlap correction
- 2026-10-15T15:13:51.482625+00:00: user screenshot requests preventing object intersections, particularly upstairsdoor/bathtub/avatar. SameadditivecheckoutHEAD48932aab; Chrome/nativeHOLD persistsperintegrationowner. Solownsdoorgeometry/sweep/gridanddoorchecks; LunaownstemporarystaticGLBboundsinventoryreadonly; parentownsrender-fit/fixtures/spatialvalidationandintegration. Preserveallsaves/sharedHome/characterworkandfixedbudgets. Acceptance: actualrenderedobjectboundsfitallocatedspaces, no unintendedpair/wall/stair/door-swingintersection, furnituredoor/avatarclearancewithallroomroutesretained, focusedchecksandpreviewbuild; interactiveQAafterbrowserrelease.

- 2026-10-15T15:31:18.304583+00:00: spatialsourcebuildverifiedafterFP21255normalrelease. ScopedTypeScript exit0,Vite1.91s,12/12tests0.99s;64solidplacementscheckedwithactualGLBs/fallbacks, open/closedleafgeometry, walls/stairsanddoorfills. Max13,920scenery;40files/4,635,737bytes, largest3,349,289B, gzip932,789B, entryhousing-studio-DYmVz1Sz.js. Noasset/fixturelayoutchanges; newleafwidth.9/hingeswingclearance, bothstateswalkblockers, sweeptoggleguard. Browserbaselineacceptedpreviousframing/manualfront/stairfixandconfirmedbathclash; finalnewclearanceimagependingre-releasedChrome, nowheldforprodTokyoQA.
- HostintegrationlimitationidentifiedandforwardedtoFPowner: TPoccluderssnapshotwalk.solids onenterScene, soadditivegetterchangesarenotlivecameraoccluderupdatesaftertoggle. FPcontextsolidsgetterandwalkinggridaredynamic. No sharedhostAPIchangeattempted; lateradoptionowner canaddpublicinvalidation. Thisdoesnotaffectstaticfurniture/doorgeometryclearanceorlivewalkingblockers.

- 2026-10-15T15:33:56.860111+00:00: retentionownerconfirmednewrelease8affliveandactiveIncognitoTokyoacceptance; no2minuteChromehandoffavailable. Housingkeepsstrictbrowser/nativeHOLD, preservesupdatedartifactDYmVz1Sz. Testedsourcecommitpreparedwith12/12checks,scopedTS/buildandexactpackagehashes; no claimofnewclearancevisualacceptance. NextstepafterexplicitChromerelease: resumehousing_visual_qa, reloadonlylocalhost4435, comparebathopen/closedclearance, attemptwalkthroughopenleaf, stairs/exit, consoleanduniqueimage; thennotifyownerbeforeadoption. ParenthasacceptedSolclearanceimplementationandLuna12GLBstaticboundsauditafterrejecting/correctingobsoleteleafreport; no measuredcostdataavailable.

- 2026-10-15T15:46:57.130204+00:00: exact source0fff8808245da1a2cb698df9489847d2cb7d26c3 / builtDYmVz1Sz accepted in bounded Chrome QA. Open/closed duplex bathroom leaves clear tub; safe toggle preserves(7.17,3.43,4.09); closed approaches stopz4.60. FP enclosure, TP partitions, overview, actual stair up/down and exit pass, finalcompound(-10.10,0,11.68), consoleempty. Current open/closed screenshots saved under docs/housing-studio/screenshots/. Open-leaf approach and occupied-sweep rejection automated-only in this checkpoint. Chrome lease returned immediately to integration owner; no further housing UI. Documentation/screenshots only after tested source, so no redundant rebuild. Preview4435/session22501 remains available. Main adoption, hosted/physical-device/release gates remain open.

## Actual-game adoption
- 2026-10-15T15:57:26.491106+00:00: user explicitly requests integration into the actual game with the existing integration owner, preserving housing/customization, testing and a ready link. Sole integration/deploy owner contacted for current checkout and wiring ownership; FP owner contacted for shared-source availability. Sol performs read-only consumer/seam audit. Existing saved Home remains authoritative; no replacement of saved fixtures or customization, no competing PR/deployment. Acceptance: actual game Home journey reaches the furnished housing experience, retained saved-home/customization semantics, tested room/door/stair/FP/TP/return flows, hosted artifact and ready URL through existing owner. Preview4435 remains available; browser lease remains with integration owner until agreed release.

- Actual-game scope confirmed with integration owner: implement saved owned Home adapter (not tours-only). FP owner released only canonical home-scene render-hook hunks for review. Sol owns those hunks plus src/housing-studio/production*.ts and preservation checks; parent owns documentation/integration review. Canonical loader and TP solids refresh remain retention owner. Critical preserved mechanisms: plinth render camera binding/body startup, native inventory pick targets, TVs, wall items, plaques/mementos, overlays and Buy state. Existing game neighbourhood remains unchanged. No active production QA/browser/deploy overlap.

- 2026-10-15T16:29:18.873912+00:00: parent took over adapter/hook/test ownership after bounded Sol checkpoint. Production adapter uses real saved Home, preserves native TV/wall/display/pick proxies/plinth and Buy lifecycle, adds manual front door/room door/overview controls. Actual GLBs exposed material draw overhead; production-only compact-template utility now preserves per-vertex roughness and ghost shader composition; unsupported materials restore canonical. Final combined housing+Home-lighting CPU checks25/25,1.79s; real decoded models mounted inall4owned tiers within15k/60 with19draws reserved. Scoped TypeScript waits politely behind retention PID24687 heavy slot. Navigation projection hook releasedforproposal byFPowner; partialpath/actionwaiting and blockedhomeDoor behavior explicitly pendingretentionreview. No sharedloader/venueworld source writes, no actualgame/hosted/WebGL acceptance yet. Browserlease remains retention;4435preview preserved. Next: finish scopedTS, commit sourceproposal, send exactSHA for bundled consequential review; mergecurrentmain into sameisolatedbranch aftercheckpoint, newsyntheticDATA_DIR/fullgameQA afterownerwiring andbrowserhandoff.

- 2026-10-15T16:32:02.218067+00:00: final source checkpoint:25/25housing+Home-lighting checks pass1.72s; scopedhousingTypeScript exit0 afterwaitingforownerheavyslot. No sharedhost/loaderwrites. Production compaction tests actual12GLBs + roughness/ghostcompatibility; realmountedmodels checkedall4tiers withfixed15k/60 incl19drawreserve. Parentblockedrouteguard catches partialA* endpoints; closedmasterdoor waitsavataratcurrentposition withunchangedserveraction, reopeningresumesapproach. OptionalhomeDoor.blocked hostconsumer remainsintegrationownerwork. Sourceproposalreadyforonebundledreview; actualgame/hosted/WebGL/release gates remainopen. Standalone4435unchangedbuildevidence preserved. Solutility standaloneTSattempt exhausted4GBoutsideassignedheavyworkflow; no diagnosticsoracceptancefromthatattempt, no repeat; parentnormal scopedTS passes.

- 2026-10-15 resumed production checkpoint: source proposal e98423189e9e380d7d7b03727c927dce1e4abd67, latest-main merge 0c921da4b2aa96dcfe9d84735310024be953c184. Parent owns production.ts, production.test.ts and released home-scene hooks; implementation workers are frozen. Astra reviewed and accepted corrections for two P1 issues: complete final/fallback furnishing draw estimates and full initial/same-floor blocked exit detection. Current 27/27 focused checks pass (2.083s), scoped TypeScript exit0; logs /tmp/housing-production-main-tests.log and /tmp/housing-production-main-ts.log. Host must return handled true plus feedback for blocked homeDoor, because false triggers direct command fallback in both consumers. Owner wiring and combined actual-game acceptance remain open.
- Isolated full-game QA resource: session10498, localhost4441, DATA_DIR /private/tmp/allworld-housing-game-20261015-p9gqt5wn/data. Only synthetic local Operator 5d1416d0-1076-4c57-91fa-829dddad9ab4, owned bq with 13 preserved starter items; actual saved-layout adapter probe enriched:true and zero door-clearance failures. No real/prod account or data touched. Canonical lazy loader remains until owner wiring. Standalone4435/session22501 unchanged. Browser lease remains with integration owner; no housing UI actions. Next executable step: send corrected exact SHA for owner bundled consequential review and loader/TP-solids/blocked-exit wiring; adopt wiring into isolated full-game candidate, then Astra actual-game QA after browser handoff. No housing PR or deployment.
