# Nigeria actual host acceptance

- Owner: /root/host_acceptance; delegated by /root, cloud Linux only.
- State: active; branch codex/nigeria-runtime-release-20261015, initial HEAD 60c3dff925fc9a2f5a5d995b1f6ab92997e36f7e.
- Owned paths: scripts/nigeria-runtime-host-check.ts; docs/research/nigeria-runtime-20261015/host/; this record; temporary harness /workspace/nigeria-release-evidence/host/.
- Scope: actual venue host player, navigation, camera, lighting/weather, crowd and lifecycle browser evidence. Distinguish host harness from full application UI.
- Dependencies: root owns definitions/camera/assets; host_runtime owns host hooks. Wait for ready signal before execution.
- Resources: none yet; intended owned Vite port 5189 and Chromium CDP port 9398. No local full build, paid services, or new credentials.
- Instructions: read AGENTS.md and current coordination index; preserve all unrelated dirty files. Commit only on root request.
- Next: inspect host APIs and supported local UI workflow; author reproducible acceptance harness.

## 2026-10-15 03:50 UTC checkpoint
- Supported local dev server active port5189, session25192; isolated data outsiderepo. No secrets/newservices.
- Actual UI baseline reached Freedom Park guest HUD via creator/Play now; screenshot timed out. Development manifest syntax errors; no full UI acceptance.
- Actual host found Lagos budget violation with canonical female player10078tri + near7618tri >17k even before othergeometry. Failure receipts in /workspace/nigeria-release-evidence/host/player-budget-failure.json.
- Actual host found Abuja near transition failed with8inputcrowd; hostowner fixed latebody crowd readmission.
- Stable Abuja run passed implemented15checks: actualhost player/crowd, near/far, firstwalk, raisedmedianwalk y.25, day/night,3exit/reentry, fullGPUdispose0/0. Wholevisible16566tri near; maximumsampledGPU15draw11708tri withculling. Sourcepinsbefore/after equal. Screenshotday/night/median/far visuallyinspected.
- Not certified: wet/harmattaninputs gaveunchangedlighting; reentryvisual needs explicitrender+screenshot because importedholderpresent buttextureuploadstillpending. Scriptimprovedfornextreentrycapture. No Lagos/production/fullUIpassclaim.

## 2026-10-15 03:52 UTC final browser checkpoint
- Reentry-only receipt `docs/research/nigeria-runtime-20261015/host/reentry/receipt.json`:7checks pass, sourceStabletrue, no console/HTTP errors. Explicit world.update renders eachreentry; runtimePBRtexturesresident7, exit4, finaldispose0/0. All3returnPNG recorded; last visuallyinspected and correctlyshowsPBRscene/player.
- Weather-only receipt `host/weather/receipt.json`:5checks pass forloading/daynight/dateinputs; explicitlyloadedCityRules then recordedlookAt. Wet/harmattan remainfalse forallselecteddates; Abujarulesdonotdeclareclimate. Weatherdifference notcertified. Host lightingdaynightdoeschange.
- Browserclosed and owneddevserverPID4688 stoppedSIGTERM; session25192 terminal143. Temporaryfixture removed. Sourcefreeze released to root.
- Scopefinal: Abuja actualhost scopedacceptance; Lagosnear failsbudget; fullUI onlyguestentrybaseline, noactualAbujaUI orproductionclaims. Awaitrootrequestbeforecommittingownedfiles.

## Lazy-host extraction verification resumed
- Parent requested refreshed browser proof after shared-host gzip CI failed71409/71000; host runtime owner extracting callback/contact code into lazy runtime-host.ts.
- Own dev server restarted port5189 session35547 with existing isolated data directory. Wait for frozen-ready signal before execution.
- Harness source pins extended to runtime-host.ts and types.ts so extraction is covered. No product source ownership changes.

## Recovery and lighter Lagos verification resumed
- Re-read AGENTS and current coordination. No lingering owned servers/browser on5189/9398 after remote environment recovery; prior tool sessions unavailable.
- Pending extraction run on disk completed04:09:17Z PASS/sourceStabletrue; preserve as historical while root changes lighter Lagos near4174tri5primitives and runtime_recovery fixes selection.
- Scope now adds real ambient layer, deliberately delayed canonical hero, fresh whole-scene budgets, and both cities. Wait root freeze before final execution. No commits until requested.

## 2026-10-15 resumed remote environment — ambient diagnostics
- No retained oldprocesses found. Restarted supported devserver5189 session72391.
- New4174tri Lagos near + actual fullambient layer/noon-drydensity and heldcanonicalfemale fetch tested. Canonicalbody appears afterrelease; ambientlayer reducespopulation. Wholevisible counters include materialgroups/doublepass/shadows andinstancecount.
- Stable Lagos diagnostic completedroute/nearfar/3reentries but failedfinaldisposal5textures. A prior60swalktimeout wassoftwarethroughput (~1fps, dtclamped.05); 120scompletedroute. Progress samples keptoutside repository; no mobileperformanceclaim.
- Ordinarypark ambientbaseline at480x640: canonicalhero21906tri/25whole draws (inheritedordinaryvenue budgetviolation), finalrenderer0geometries/0textures after250ms andnoaliveGLallocations. Nigeria5textureleak isnotbaselineambientcleanup behavior.
- Failurehandler fixed toavoidworld.updateafterdispose; addedGLallocationcreate/delete/materialownership audit and render-during-disposal counter. Runtimeowner investigating stale callback causingreentrancy; rootauthorizedfix afterbaselinebrowserterminal. Awaitnewfrozenready. No commits.

## Shadow leak and exact navigation diagnosis
- Earlier “completed route” meant stopped/moved, not arrival. Strict endpoint checks now required. Actual no-crowd host grid returned nearest reachable (-0.68,2.71) for Lagos requested (6,2.8), while pure NAV grid passed. Root fixed visual marker rings erroneously recorded as collision; browser exact-route proof pending.
- Reentrant-disposal guards alone did not fix texture leak: full stable run retained5 textures with zero render calls during dispose. Archived `host/failures/lagos-after-reentrant-guards.json`.
- Direct renderBufferDirect instrumentation confirms shared MeshDepthMaterial with map=null retained disposed runtime texture in uniforms.map.value, reuploaded on ordinary solid/actors-solid shadows (allocation15→22). Stable 3-reentry diagnostic retained3 textures. Archived `host/failures/lagos-shadow-uniform-reupload.json`; runtime owner implementing explicitly owned shadow materials.
- Browser closed after diagnostic; supported devserver5189 session72391 remains owned/running. No commit. Next: after frozen-ready, strict Lagos/Abuja ambient full checks and final0/0 lifecycle; mobile viewport emulation is software rendering, not phone performance evidence.

## Final lifecycle candidate and camera finding
- Shadow ownership fix has direct A/B proof: Lagos strict full run16checks and Abuja17checks pass/sourceStabletrue; final renderer0geometries/0textures, no aliveGLtextures and no disposedshadowuniform reuse. ExactLagos(6,2.8)y.26; Abuja(8,39.2) then median(8,21)y.25. Canonicalfemale+actualambient verified.
- Imported-active sampled Lagos max16882tri/45draw, Abuja16774tri/43draw (draw maxima prehero); ordinarypark exits still inherited21906tri, explicitly outside imported pass. Tests measure fullvisiblemesh budgets andactualculledsubmissions separately.
- Visually inspected Lagosday/walk and Abujaday/median. LagosPIrotation entirely obscuresplayer behinddecorativebuilding; automaticrotation exercise was NOT camera acceptance. Parent fixing scene-specific orbitlimits. Both pre-camera receipts archived `host/before-camera-limit/`.
- Supported normaldevserver now session83730 port5189 (old72391 stopped; short open-dev42959 stopped before UIbrowserlaunch). Awaitcamera frozenready then refresh both hosts and actualapp localopenmode smoke. Harness pins now include camera-controls.ts; properviewportmeta saves software work, no physicalphone claims.

## Final camera and actual application acceptance — ready for parent integration
- Final source-pinned camera runs: `host/ambient-lagos/receipt.json`16 assertions PASS; `host/ambient-abuja/receipt.json`17 assertions PASS. Product/GLB hashes match published536347f93da308cf6235d3586af843c17e22f4c8 (parent independently verified). Each sourceStabletrue, renderer0/0, liveGL0, disposed-shadow-uniform0. Both exactrequestedroutes and Abuja medianheight pass; actualcanonicalfemale andproductionambient layer exercised.
- Proper480x640viewport/coarsepointer recorded; softwareSwiftShader only. Imported-active sampled peaks Lagos16882tri/45draw; Abuja16590tri/43draw. Ordinarypark21906tri inherited and explicitly excluded from imported-active pass.
- Visually inspected final Lagos day/night/camera and Abuja day/camera/median. Boundedcamera[-1.2,1.2] fixes rearwallocclusion; Lagos yaw1.19 player visible withpartialumbrella overlap. No exhaustivecamera or photoreal claim. Bothcityclimate definitions absent: dateinputs remain dry/noharmattan, no seasonalvisualcertification.
- Server transport failure invalidated one Abuja startup (0checks), archived `failures/abuja-devserver-connection-refused.json`; recovered rerun passes.
- Actual application smoke `host/application-ui/receipt.json` PASS/sourceStabletrue: actualcreator/Playnow, realHUD, authenticatedtravelAPI200started, locationmarket, revisednear+farGLB200, onecanvas, screenshot visuallyshowsfrontage/player/crowd. Supportedloopbackopen-dev fixture relaxedonboarding andclock1000; not normalprogression/prod. Manifestsyntaxerrors and session401/street409 remain recorded. Earlier malformed timedaction driver archived andcorrected; no productfailureclaim. Fullsyntheticplayerstate omittedfromreceipts.
- All browsers closed. Owned normalserver98256 stopped; ownedUIserver29604/PID9238 stoppedSIGTERM terminal143. No runningownedresources. Temporaryhostpage removed. Parent authorized ownedcommit; no push by thisagent.
