# Character locomotion blend implementation

Date: 2026-10-13
Scope: local source implementation only. Browser acceptance remains with the parent task.

## Result

The skinned player body now blends the existing `idle`, `walk`, `jog`, `stairs-up`, and `stairs-down` clips over a bounded 0.18-second window. The blend is presentation-only: `Walker` position, speed, pathfinding, facing, and reporting cadence are unchanged. The normalized distance-derived stride phase remains the time source for every moving clip.

The host still owns all frames. `SkinnedBody.easing` is true only while an authored pose transition or locomotion blend is unfinished; `step(dt)` advances either one, and `settle()` takes it to its exact destination. Venue, home, street, and driving hosts opt into locomotion animation only when motion is allowed. Direct `stride()` and `gait()` calls remain instant by default, preserving the body motion preview and other snapshot callers. Reduced-motion paths pass `animate = false` and therefore sample the destination immediately.

The mixer restores its last raw animation checkpoint before every single-clip or weighted multi-clip sample, then captures the new raw blended pose before foot correction. This removes the prior IK result before the next mix and prevents per-frame IK accumulation. Standing locomotion blends remain eligible for foot contact solving; furniture and authored pose transitions remain excluded.

## Source files

- `src/scene/body/skinned.ts`: bounded locomotion weights, multi-action mixer sampling, exact settle behavior, raw-pose checkpoint ordering, and standing contact eligibility.
- `src/scene/body/stand-in.ts`: animation intent at the body seam and foot solving after each eligible blended sample.
- `src/scene/home-scene.ts`: host animation flag and post-blend foot solve.
- `src/scene/types.ts`: optional host gait animation argument.
- `src/venue-world.ts`: normal-motion versus reduced-motion intent for home and venue gait.
- `src/street/host.ts`: bounded start/stop stepping, reduced-motion instant sampling, and hidden-state settling.
- `src/app/features/living-world/drivingScene.ts`: explicit motion intent for the other `StandIn` locomotion caller and its walk-to-idle handoff.

`src/scene/characters.ts` and the table modules were not edited by this implementation.

## Checks

- Focused existing checks: `node --experimental-strip-types --test --test-concurrency=1 src/scene/body/animation-pose.test.ts src/scene/body/stand-in.test.ts src/scene/body/poses.test.ts src/scene/motion-loop.test.ts src/venue-world.test.ts` — 37 passed, 0 failed.
- One-off Three.js `AnimationMixer` probe — weights of 0.75 idle / 0.25 walk produced `0.25`; 0.25 idle / 0.75 walk produced `0.75`, confirming exact zero-delta weighted resampling.
- `git diff --check` — passed.
- A direct `tsc -p tsconfig/client.json` was not the repository's baseline-aware typecheck and exited 2 with diagnostics only in imported server and Vite configuration files (`server/admin/confirm.ts`, `server/commerce/service.ts`, `server/growth/webpush.ts`, `server/notice.ts`, and `vite.config.ts`); it reported no diagnostics in the changed files. The parent task is coordinating the repository's full `npm run typecheck` after concurrent source work settles.

## Remaining proof

Interactive browser acceptance is still required for start, stop, walk-to-jog, flat-to-stairs, reduced-motion, hidden/resume, and the driving entry/exit path. The local implementation does not claim that visual acceptance is complete.

## Dev preview control

`scripts/body/motion-preview.html` now includes a finite **Walk → jog → stop** control. It holds walk for 0.9 seconds, jog for 0.9 seconds, then drives the loaded body through `stride(phase, jog, 0, true)`, `show('idle', true)`, and `step(dt)` until the idle blend settles. The existing pose selector, phase slider, continuous walk preview, and sit/lie controls retain their instant sampling behavior. The on-page stats expose the current phase, authored transition, locomotion demo stage, body easing state, loop-active state, and queued-frame state for browser acceptance. The inline module passed `node --input-type=module --check`, and the two-file diff passed `git diff --check`.

## Parent integration checkpoint

See [TESTING.md](TESTING.md) for the verified browser journeys and final integration checks. Full typecheck is clean and the production build passes with the documented heap setting. Existing source changes in `characters.ts` remain preserved.

## Bounded ambient NPC motion

Nearby full-detail ambient people now keep one merged low-detail mesh and interpolate continuous walk phases and 0.18-second stand, relax, work, and wave changes with relative position and normal morph targets. Blink and speech use two independent facial morph targets on that mesh. The layer advances them only inside its existing finite frame window; it creates no timer or frame source, settles exact weights when the window closes, and leaves fresh light/off or reduced-motion placement on the existing static figures. At most four residents and ambient people combined receive controllers, selected by player distance with a 1.5-unit retention margin.

Authored resident appearance reaches the base mesh and every target. A sorted JSON-shaped appearance key reuses geometry when an equivalent look is reconstructed with a different property order and disposes the old cache/controller when the seed or actual appearance changes. Sitting and lean people retain their existing discrete figures. The layer's speech hook only records a clock-based deadline; existing chatter and ambient frame ownership decide whether any frames run.

The current curated Lagos samples built as one mesh with nine position and nine normal targets: Mama Ronke 504 triangles, Baba Sege 488, Kunle 518, and Amaka 484. One cold-process sample measured 2.7–11.1 ms per controller across those four; browser GPU upload/shader timing remains part of interactive acceptance. The existing venue suite's busiest measured scene was 16,700 triangles, and its three-resident market reached 44 draw calls, within the existing 17,000-triangle and 60-call limits. `FIGURE_COST.full` is now the sound 600-triangle planning ceiling.

Existing ambient checks passed: `node --experimental-strip-types --test src/scene/ambient/density.test.ts src/scene/ambient/plan.test.ts src/scene/ambient/layer.test.ts` — 18 passed, 0 failed. One-off controller probes confirmed one mesh, matching position/normal topology, correct midpoint and settled blend weights, independent facial weights, no morph creation on a fresh light tier, stable equivalent-look reuse, and replacement on a changed look. `git diff --check` passed for the three ambient source files.

## Final integration and faces

The parent added shader-based player eyes, expression and blinking in `body/facial.ts`, using measured UV coordinates from both shipped GLBs. The original atlases contained painted eye sockets without eyeballs; the existing body material now supplies sclera, iris, pupil and a small highlight in the aperture. Saved expressions affect the mouth; sleep closes the eyes and relaxes expression. No facial material or draw call is added. Neck/arm skin-region boundaries no longer inherit clothing tint from interpolated bone-weight masks.

Low-detail NPC geometry now has pupils, eyebrows, expression-aware mouths and separate blink/speech targets. Low-detail glasses have open frames and temples, preserving visible eyes. Chatter invokes a bounded speech deadline through the real campus world adapter; the hook does not own a timer or wake the scene independently.

Review capped synchronous morph construction at one attempt per animated frame, including failed attempts. Hiding the venue or enabling reduced motion closes the ambient window immediately. Resuming a still venue draws one settled frame without restarting ambient motion. The existing player walk/jog/stop sequence settles on both bodies. An eight-second browser NPC run also stops; its desktop p95 CPU update plus render submission was 0.70 ms, excluding GPU completion.

The final full typecheck passed all five projects; the final production build passed with the documented 8 GiB heap. The later movement/ambient/venue/crowd batch has 44 passes and two unchanged pre-Ayo list expectations failing in `venue-world.test.ts`; it supersedes the older pre-Ayo 37-pass checkpoint above. Browser acceptance and limitations are recorded in [TESTING.md](TESTING.md).

## Low-detail face and gele refinement

The low-detail character path now respects the saved `oval`, `round`, and `long` face shape while keeping the skull top aligned with existing hair, glasses, and headwear. Eyes use a small six-sided sclera with a separate iris/lid and brow; blink still collapses the same vertices. A shallow three-sided nose projects from the face, and the mouth keeps a dark cavity, smile corners, and fixed teeth while speech changes the opening. The neck cylinder omits its buried end caps to fund the visible face geometry. The result remains one merged mesh and adds no draw call.

The legacy gele hairstyle now uses a fitted dome and band with five alternating folded fan panels. It replaces the tall cylinder and two wide boxes, so its silhouette stays near the head and costs less. Medium/high heads, wardrobe geometry, and the authored high-detail hands were not changed.

The exhaustive low-detail range moved from 400–600 to 399–599 triangles. On the same pre-outfit looks, Amaka moved from 484 to 483 triangles, Baba Sege 488 to 487, Kunle 518 to 517, and Mama Ronke's casual look 504 to 471. Her final authored `owambe` blouse/wrapper plus gele and earrings is 519 triangles. The four final authored figures are 483, 487, 517, and 519 triangles respectively.

Existing checks passed: `npm exec -- tsx --test src/scene/avatar-preview.test.ts` — 12 passed; `npm exec -- tsx --test src/scene/ambient/plan.test.ts src/scene/ambient/layer.test.ts` — 18 passed. A temporary geometry sweep verified identical indices, vertex counts, and colour ordering for stand, both walk samples, blink, speech, and sleep on all four curated NPCs. A separate low-detail signature sweep confirmed that oval, round, and long produce distinct geometry at the same 445-triangle cost. Browser appearance acceptance remains with the parent task.
