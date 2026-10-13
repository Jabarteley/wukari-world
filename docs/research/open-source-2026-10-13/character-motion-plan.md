# Character motion plan: continuous player locomotion

Date: 2026-10-13
Repository baseline: `5179285a25cb616e9c8ef5b137150a5a6f6e05e7`
Scope: one concrete upgrade proposal for the shipped player body and its procedural fallback. This is a read-only plan; it makes no source, asset, dependency, test, or build changes.

## Proposed upgrade

Upgrade the player presentation from direct walk/jog phase selection to a small, visual-only locomotion layer: acceleration/deceleration blend, a short turn-in-place transition, and terrain-aware foot correction where street/neighbourhood surfaces actually expose raised or sloped support. The visual output remains the current 23-bone GLB body when available and `characters.ts`'s procedural rig when it is not. `Walker` remains the movement and network authority; this first slice must not change its displacement, speed constants, or server-report cadence.

This is one player-facing upgrade because it targets a source-derived visual hypothesis: direct clip selection may look abrupt at start/stop, and a stationary heading change has no authored foot pivot. No runtime observation is claimed here. It does not claim that flat streets currently clip feet. A concrete first target is the street journey: spawn at the walking journey point, hold the joystick toward a streamed tile, release, turn 90 degrees, cross a tile seam, then enter a venue.

## Shipped body facts

The committed body assets are [base-body-male.glb](/Users/anthonyakpan/Desktop/JoinAllworld/src/scene/body/assets/base-body-male.glb), [base-body-female.glb](/Users/anthonyakpan/Desktop/JoinAllworld/src/scene/body/assets/base-body-female.glb), and [clip-pack.glb](/Users/anthonyakpan/Desktop/JoinAllworld/src/scene/body/assets/clip-pack.glb). The generated manifest records 9,002 triangles and 23 bones for each base body; the male is 159,916 bytes raw / 138,098 Brotli and the female is 157,992 / 137,296 ([manifest](/Users/anthonyakpan/Desktop/JoinAllworld/src/scene/body/manifest.ts:3)). The clip pack is 338,060 bytes raw / 55,111 Brotli and contains no mesh. Its tracks retain rotations on the 23 bones plus pelvis translation; scale tracks are dropped ([asset pipeline](/Users/anthonyakpan/Desktop/JoinAllworld/docs/ASSETS.md:71)).

The exact shared skeleton convention is:

`root → pelvis → spine_01 → spine_02 → spine_03 → neck_01 → Head`, with left and right `clavicle`, `upperarm`, `lowerarm`, `hand`, `thigh`, `calf`, `foot`, and `ball` chains. The full order is in [manifest.ts](/Users/anthonyakpan/Desktop/JoinAllworld/src/scene/body/manifest.ts:126). Both bodies use this same 23-bone order, which is a useful hard contract for any added turn or IK clip.

The clip pack's actual GLB animation sampler durations, read directly from the shipped file, are:

| Group | Clips and duration |
| --- | --- |
| Locomotion | `idle` 2.50 s; `walk` 1.35 s; `jog` 0.95 s; `stairs-up` 1.35 s; `stairs-down` 1.35 s |
| Sit/door/bed | `sit-enter` 1.30 s; `sit` 1.70 s; `sit-exit` 1.05 s; `home-door` 2.40 s; `door` 1.80 s; `lie-down` 2.20 s; `get-up` 2.20 s; `sleep` 4.00 s |
| Interaction | `interact` 2.00 s; `dance` 1.00 s; `bathe-sit` 2.40 s; `bathe-stand` 3.20 s |
| Use loops | `cook`, `cook-low`, `bucket-wash`, `eat`, `drink`, `shower-wash`, `soak-wash`: 2.00 s each |
| Use entry/exit | `cook`, `cook-low`, `bucket-wash`, `eat`, `drink`, `shower-wash` entry and exit: 0.80 s each; `soak-wash-enter` and `soak-wash-exit`: 1.40 s each |
| Female variants | Female copies exist for the cooking, low-cooking, bucket, eat, drink, shower, and soak clips with the same durations |

The manifest list also includes `bathe-sit` and `bathe-stand`; [poses.ts](/Users/anthonyakpan/Desktop/JoinAllworld/src/scene/body/poses.ts:5) currently maps the gameplay `soak`/`wash` names to the `soak-wash`/`shower-wash` clips. The authoritative source-to-game table and the note that authored door, bathing, stairs, and lying clips were built from UAL1 are in [ASSETS.md](/Users/anthonyakpan/Desktop/JoinAllworld/docs/ASSETS.md:86).

## Existing motion seams

`SkinnedBody.stride(phase, jog, climb)` chooses `walk`/`jog` or `stairs-up`/`stairs-down`, samples the clip at `phase / 2π`, and cancels any transition ([skinned.ts](/Users/anthonyakpan/Desktop/JoinAllworld/src/scene/body/skinned.ts:304)). There is no speed blend: `Walker` advances at fixed `WALK_SPEED = 1.82` or `JOG_SPEED = 3.92` ([movement.ts](/Users/anthonyakpan/Desktop/JoinAllworld/src/scene/movement.ts:39)), and the host derives phase from distance. `stand-in.ts` computes climb from the last and current floor positions, chooses the stair clip above `CLIMB = 0.3`, and solves supported feet after gait ([stand-in.ts](/Users/anthonyakpan/Desktop/JoinAllworld/src/scene/body/stand-in.ts:192)).

Bounded transitions are already safe and explicit. `AnimationMixer` samples clips on demand; transitions carry a start placement and are advanced only by the host's motion loop ([skinned.ts](/Users/anthonyakpan/Desktop/JoinAllworld/src/scene/body/skinned.ts:227)). A 0.16-second bone crossfade is used when an exit clip starts from an interrupted use pose ([skinned.ts](/Users/anthonyakpan/Desktop/JoinAllworld/src/scene/body/skinned.ts:204)). `motion-loop.ts` stops when the host reports no movement, so a locomotion state machine must not create its own timer or RAF ([motion-loop.ts](/Users/anthonyakpan/Desktop/JoinAllworld/src/scene/motion-loop.ts:1)).

The procedural fallback is intentionally separate: `poseAvatar()` rotates six movable groups and receives a normalized stride phase, while crowd figures may remain merged and static ([characters.ts](/Users/anthonyakpan/Desktop/JoinAllworld/src/scene/characters.ts:1501)). The current dirty diff is limited to high-detail procedural hand geometry in [characters.ts](/Users/anthonyakpan/Desktop/JoinAllworld/src/scene/characters.ts:992); it must be preserved and is outside this plan.

## Three missing transitions or integration gaps

### 1. Start/stop has no visual acceleration blend

`Walker.step()` moves with a fixed speed as soon as input or a path is active and stops when input is released ([movement.ts](/Users/anthonyakpan/Desktop/JoinAllworld/src/scene/movement.ts:258)). The body then changes directly between idle and sampled walk/jog. The source supports a missing visual blend, but whether this reads as abrupt must be measured in a runtime probe. The existing 0.16-second bone crossfade applies to use exits, not locomotion starts/stops.

Plan seam: derive a presentation-only normalized locomotion speed (`0…1`) from the walker’s existing moving/jogging state and elapsed host `dt`; let the body blend idle↔walk and walk↔jog over a bounded window while preserving distance-derived phase. The procedural path can scale joint angles by the same factor. Do not add acceleration to `Walker` or alter its authoritative position, speed, or network reporting in this first slice; a physical acceleration redesign is a separate movement-budget decision.

### 2. There is no turn-in-place transition

The walker turns toward movement with `TURN_RATE = 14` and `SkinnedBody.stride()` immediately samples a locomotion clip ([movement.ts](/Users/anthonyakpan/Desktop/JoinAllworld/src/scene/movement.ts:48), [skinned.ts](/Users/anthonyakpan/Desktop/JoinAllworld/src/scene/body/skinned.ts:304)). The clip pack has no `turn-left`, `turn-right`, or pivot clip. A stationary 90-degree change therefore rotates the root/scene placement while the body remains in idle, or starts a walk phase without a planted pivot.

Plan seam: implement a procedural turn-in-place pose from the existing leg/foot bones first, with a short blend threshold for turns while speed is near zero. If the result is visibly weak, author two 23-bone turn clips into the existing clip pack using the same UAL1/CC0 pipeline, rather than importing a different skeleton.

### 3. Street and neighbourhood have no sampled support surface

Venue scenes and home already expose `contactHeightAt()` and feed it to the body solver when the player is supported ([venue-scenes.ts](/Users/anthonyakpan/Desktop/JoinAllworld/src/scene/venue-scenes.ts:916), [home-scene.ts](/Users/anthonyakpan/Desktop/JoinAllworld/src/scene/home-scene.ts:1105)). The neighbourhood host reports `heightAt() { return 0; }` ([neighbourhood-scene.ts](/Users/anthonyakpan/Desktop/JoinAllworld/src/scene/neighbourhood-scene.ts:218)); street tiles rebuild a 2D occupancy grid but do not expose rendered foot support ([street/host.ts](/Users/anthonyakpan/Desktop/JoinAllworld/src/street/host.ts:94)). This is a concrete integration gap only for street/neighbourhood surfaces that later prove to have raised, sloped, or otherwise non-flat support; it is not evidence that the current flat street clips feet.

Plan seam: if the raised/sloped-surface probe finds a real need, extend the streamed street scenery's tile contract with a cheap support-height sampler for approved road/sidewalk surfaces, and give the neighbourhood scene a corresponding sampler. Feed it only when the player is not hopping, seated, in an activity, or transitioning. Keep `WalkGrid` as path/obstacle authority and use support height solely for root Y and foot correction. This remains optional until the named journey demonstrates a support mismatch.

Seat/car boarding is also absent from the current clip vocabulary: there are chair/bed/use clips and door clips, but no vehicle seat/boarding pair. It is a later interaction upgrade, not part of the first locomotion slice. Tool hand contact is likewise approximate: `interact`/`cook`/`work` clips exist, but no generic hand-target IK contract is exposed by `SkinnedBody`.

## Open asset source comparison

These sources are candidates for offline reference or retargeting experiments. The current shipped body already comes from Quaternius' Universal Base Characters (UBC) and its base clips from the Universal Animation Library (UAL1); the plan extends that existing source pipeline rather than proposing a generic replacement. None of the sources below is approved as a runtime drop-in replacement, and code license does not grant rights to every model, texture, or motion file in a bundle.

### Quaternius

Quaternius is the existing source for the shipped bodies and base clips: [Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html) and [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) are the official pack pages, and [ASSETS.md](/Users/anthonyakpan/Desktop/JoinAllworld/docs/ASSETS.md:9) records the Standard downloads as CC0 1.0. The current rebuild keeps the UBC skeleton, trims it to 23 bones, uses UAL1 clips without root motion, then authors missing door/bathing/stairs/lying clips from UAL1 ([build pipeline](/Users/anthonyakpan/Desktop/JoinAllworld/scripts/body/build-body.ts:1), [ASSETS.md](/Users/anthonyakpan/Desktop/JoinAllworld/docs/ASSETS.md:18)). Extend this pipeline with turn clips or presentation probes before considering another asset source. UBC/UAL1 are generic stylized assets, so culturally credible Lagos hair, textiles, garments, and accessories still come from Allworld's own art and wardrobe layers; do not present Quaternius' visual identity as the Nigerian character direction.

### Kenney

Kenney's official support page states that its game assets are CC0 ([official support/licensing](https://kenney.nl/support)). Kenney is strong for clean low-poly prototypes, props, and readable interaction markers, but its generic mini/toon character sets do not provide the body proportions, natural hair, headwear, Ankara/adire/asooke garments, or Nigerian accessory vocabulary already represented by Allworld's look options. It is suitable for a motion harness or placeholder prop, not for the shipped Lagos player body. Preserve the specific pack's license text with any experiment.

### MakeHuman / MPFB

MakeHuman separates AGPL source code from CC0 core graphical assets, including base mesh, targets, textures, clothes, poses, and expressions ([official license](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md), [community license explanation](https://static.makehumancommunity.org/about/license.html)). Exported output from an official unmodified MakeHuman build is intended to be usable commercially; third-party asset repositories can carry different terms. MPFB/MakeHuman offers the best of these three for offline authoring of varied human base shapes, but it is still generic and needs deliberate Nigerian hair, facial, textile, and garment design. The exported skeleton and animation conventions would need retargeting to Allworld's exact 23-bone order; adding it at runtime would also threaten the existing body download and triangle budgets.

Mixamo is retained only as a non-open comparison: its service and assets are not an open-source repository or a CC0 source, so it cannot be treated as the licensing baseline for this plan. The current repository documents UAL1 as the CC0 source for its base clips and uses authored clips from that same source ([ASSETS.md](/Users/anthonyakpan/Desktop/JoinAllworld/docs/ASSETS.md:99)).

## Asset and history boundary

The current shipped files are the two `base-body-*.glb` meshes and `clip-pack.glb` above. A repository search found no Meshy reference in the active body pipeline; the source-backed asset documentation identifies UAL1 and local authored clips instead. Any prior Meshy exploration or samples must therefore be treated as historical candidate art, not integrated/shipped character evidence. Do not retarget or publish a Meshy sample until its model, texture, and motion rights and exact source version are recorded separately.

## Recommended implementation order and acceptance storyboard

1. Add a pure presentation state at the host/body seam: visual speed, desired heading, turn-in-place flag, and optional support height. Keep movement authority, displacement, and server position reports unchanged.
2. Drive both `SkinnedBody` and the procedural rig from the same presentation speed/phase. Blend idle↔walk and walk↔jog; preserve existing `stride()` phase and `CROSSFADE` rules for bounded actions.
3. Probe the street/neighbourhood journey for actual raised/sloped support mismatch. Add a support sampler only if the probe finds one; reject corrections during hops, seats, activities, and transitions. Do not add a general physics dependency for this first upgrade.
4. Add procedural turn-in-place. Only author new UAL1-derived 23-bone turn clips if the procedural result fails the visual probe; keep the manifest and female clip naming convention.

Acceptance storyboard, for a local or focused harness journey:

- Start at a streamed Lagos street tile with the skinned body and the procedural fallback in separate runs.
- Hold forward for 0.5 seconds, release, then hold a diagonal for 1 second. The body should visibly ease into walk, maintain a consistent planted stride, and ease to idle without sliding.
- While stationary, turn 90 degrees and 180 degrees. Feet should pivot or take a bounded turn pose; the root must not snap and the camera/marker should remain attached.
- Cross a streamed tile boundary. If the selected street fixture includes an actual raised/sloped support, the root support height must follow its sampler and foot correction must remain bounded; a flat-street fixture must pass without inventing a terrain correction.
- Click a venue doorway while moving. The locomotion blend must hand off to the existing `door`/`home-door` path, then to the venue's existing `sit`/`interact` path, with no second frame loop and no wardrobe/body reload.
- Repeat with reduced motion and with the skinned-body gate disabled. The static/fallback path must still render and the idle motion loop must stop.

The plan is accepted only when this journey is evidenced for both body families and the fallback, with source/asset hashes, exact clip durations, no dirty-file overwrite, and no claim that an open asset bundle is culturally suitable without a separate art review.
