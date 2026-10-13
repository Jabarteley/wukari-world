# Open-source virtual-world patterns — 2026-10-13

This finite comparison uses the pinned repository snapshots already recorded in [`repository-snapshots.json`](./repository-snapshots.json): Hyperfy `5d20037435a1d86cda088382bb12737e9f18d5f6` (GPL-3.0, repository snapshot checked 2026-10-13) and Hubs Foundation `986d07a758e9d1184cb355385c6460391bd238d0` (MPL-2.0). The links below pin source files to those commits. Code licenses do not grant rights to copy repository art, avatars, or uploaded assets; treat every asset separately. This is research only; no third-party code was cloned or executed.

Allworld already has a smaller, deliberate runtime: on-demand rendering in `src/venue-world.ts:32-40`, on-demand map frames in `src/map3d/map3d.ts:25-31`, lazy Meshopt GLB loading in `src/scene/models/gltf-source.ts:29-42`, model budgets/near-far/stand-ins in `src/scene/models/scene-models.ts:14-25,150-176`, and renderer diagnostics in `src/venue-world.ts:122-159`. The portable patterns below are bounded additions around those seams, not an engine rewrite.

## Patterns worth carrying over

### 1. Amortize population-wide LOD and avatar maintenance

Hyperfy’s pinned [`LODs.js`](https://github.com/hyperfy-xyz/hyperfy/blob/5d20037435a1d86cda088382bb12737e9f18d5f6/src/core/systems/LODs.js#L1-L79) keeps a cursor and checks at most `BATCH_SIZE = 1000` registered nodes per update, rotating the cursor across frames. Its [`Avatars.js`](https://github.com/hyperfy-xyz/hyperfy/blob/5d20037435a1d86cda088382bb12737e9f18d5f6/src/core/systems/Avatars.js#L1-L42) updates one avatar rate per frame. Hyperfy’s [`LOD.js`](https://github.com/hyperfy-xyz/hyperfy/blob/5d20037435a1d86cda088382bb12737e9f18d5f6/src/core/nodes/LOD.js#L14-L62) chooses a distance band and activates the new node immediately while deferring removal of the previous node for one frame.

Portable Allworld seam: `src/scene/models/scene-models.ts:472-484` currently rebuilds when `focus()` crosses a near/far boundary, while crowd/ambient work is stepped by `src/venue-world.ts:225-238` and the motion loop. A bounded cursor could service many crowd-rate checks or future per-placement LOD checks without making every frame scan every actor. **Adopt as a small scheduler only if profiling shows population-wide checks;** keep the existing model-layer budget and idle-loop contract. Acceptance: same visible near/far result, bounded checks per frame, no extra frames while idle, and diagnostics exposing checks/queue depth.

### 2. Cache, deduplicate, and preload with progress

Hyperfy’s [`ClientLoader.js`](https://github.com/hyperfy-xyz/hyperfy/blob/5d20037435a1d86cda088382bb12737e9f18d5f6/src/core/systems/ClientLoader.js#L20-L62) maintains `files`, `promises`, and `results` maps; `preload()` queues typed assets and `execPreload()` loads them with progress events. [`ClientNetwork.onSnapshot`](https://github.com/hyperfy-xyz/hyperfy/blob/5d20037435a1d86cda088382bb12737e9f18d5f6/src/core/systems/ClientNetwork.js#L94-L146) selects environment/avatar/blueprint/emote assets for preload and starts the batch after the initial snapshot.

Portable Allworld seam: `src/scene/models/scene-models.ts:114-145,458-470` already deduplicates model reads and swaps stand-ins after loading; `src/scene/models/gltf-source.ts:29-69` deduplicates atlas loads and disposes textures. **Adopt the pattern as observability and prioritization, not a replacement cache:** add a measured preload manifest for the first venue/city and report progress/failed keys, while preserving stand-ins and lazy chunks. Do not preload all city assets. Acceptance: duplicate requests remain one read, first usable frame is unchanged or improved, failed assets retain stand-ins, and disposal clears retained textures.

Hubs shows the same boundary with different ownership: [`load-model.tsx`](https://github.com/Hubs-Foundation/hubs/blob/986d07a758e9d1184cb355385c6460391bd238d0/src/utils/load-model.tsx#L1-L12) yields a cancelable scene load and attaches animations/mixer, while [`load-texture.js`](https://github.com/Hubs-Foundation/hubs/blob/986d07a758e9d1184cb355385c6460391bd238d0/src/utils/load-texture.js#L8-L76) deduplicates in-flight textures and reference-counts cache entries. This supports studying explicit asset lifetime, but Hubs’s loader/asset contracts should not be imported wholesale.

### 3. Interpolate remote transforms at tick duration, with ownership boundaries

Hubs’s [`networked-transform.js`](https://github.com/Hubs-Foundation/hubs/blob/986d07a758e9d1184cb355385c6460391bd238d0/src/systems/networked-transform.js#L9-L57) writes local-owned transforms back only when they differ by a tolerance; remote changes create `LinearTranslate`, `LinearRotate`, and `LinearScale` components whose duration is `millisecondsBetweenTicks`. Its [`network-receive-system.ts`](https://github.com/Hubs-Foundation/hubs/blob/986d07a758e9d1184cb355385c6460391bd238d0/src/bit-systems/network-receive-system.ts#L34-L39,L208-L243) rejects stale owner updates, queues updates for entities not created yet, then deserializes them when the entity enters the world. Network sends are tick-gated in [`network-send-system.ts`](https://github.com/Hubs-Foundation/hubs/blob/986d07a758e9d1184cb355385c6460391bd238d0/src/bit-systems/network-send-system.ts#L17-L45).

Portable Allworld seam: crowd positions enter through `src/venue-world.ts:270-281`, movement smoothing already has `stepCrowd(dt)` and `settleCrowd()`, and `src/scene/movement.ts` owns local walking. **Adopt only for remote crowd presentation:** interpolate a remote position over the server update interval, reject older snapshots by sequence/timestamp, and never use presentation interpolation for authoritative actions, economy, or local player movement. Acceptance: remote figures move smoothly between updates, stale packets cannot rewind them, local walking remains responsive, and the motion loop stops after convergence.

Hyperfy provides a lighter companion pattern in [`ClientNetwork.js`](https://github.com/hyperfy-xyz/hyperfy/blob/5d20037435a1d86cda088382bb12737e9f18d5f6/src/core/systems/ClientNetwork.js#L38-L46,L69-L91): inbound packets enqueue a method/data pair and `preFixedUpdate()` flushes the queue. Allworld should study the explicit boundary between receive time and simulation/render time, while keeping its existing server contracts.

### 4. Keep scene loading incremental and cancellable

Hubs’s [`scene-loading.ts`](https://github.com/Hubs-Foundation/hubs/blob/986d07a758e9d1184cb355385c6460391bd238d0/src/bit-systems/scene-loading.ts#L74-L108,L214-L233) runs loading as a `JobRunner` coroutine, installs the scene after the model yields, and has rollback/error handling. It then inspects meshes, nav-meshes, reflection probes, and physics density before exposing the scene. Hubs’s [`preload.ts`](https://github.com/Hubs-Foundation/hubs/blob/986d07a758e9d1184cb355385c6460391bd238d0/src/utils/preload.ts#L1-L10) keeps a small explicit set of promises to await.

Portable Allworld seam: `src/scene/models/scene-models.ts:437-470` already draws stand-ins, loads wanted near/far keys, rebuilds once, and calls `changed()` once. **Adopt the lifecycle rule:** every async scene/model request needs an owner token or disposal check, a visible fallback, and one redraw notification after a completed swap. Do not block venue entry on all assets. Acceptance: leave/re-enter during a pending load does not attach a disposed model, failed loads leave procedural stand-ins, and no repeated redraw loop appears.

### 5. Normalize touch input into a small action vocabulary

Hubs’s [`touchscreen-user.js`](https://github.com/Hubs-Foundation/hubs/blob/986d07a758e9d1184cb355385c6460391bd238d0/src/systems/userinput/bindings/touchscreen-user.js#L1-L58,L795-L864) converts pinch delta to character acceleration, separates camera deltas into scaled X/Y values, supports an invert preference, and combines touch and gyro input into a camera action. It also uses rising/falling edge transforms and delayed drawing actions in later bindings (`:881-943`).

Portable Allworld seam: `src/scene/gesture.ts`, `src/scene/controls.ts`, and `src/venue-world.ts:42-76` already own touch orbit, zoom, joystick, tags, and tap-to-walk. **Study and selectively adopt the vocabulary/edge semantics:** keep gesture interpretation in the existing modules, add no Hubs input dependency, and verify pointer, reduced-motion, and HUD-inset behavior. Acceptance: touch camera and joystick remain one continuous action stream, tap-vs-drag stays deterministic, and `prefers-reduced-motion` suppresses easing as currently documented.

### 6. Use cached compressed texture/BVH paths only where measured

Hubs’s pinned [`gltf-model-plus.js`](https://github.com/Hubs-Foundation/hubs/blob/986d07a758e9d1184cb355385c6460391bd238d0/src/components/gltf-model-plus.js#L1-L19,L21-L64,L90-L117) combines `three-mesh-bvh`, KTX2/Basis loaders, GLB range requests, and an explicit reference-counted GLTF cache. Its BVH generator only builds trees for meshes with 1,000–1,000,000 triangles and skips interleaved geometry (`:90-115`). Hubs’s [`load-texture.js`](https://github.com/Hubs-Foundation/hubs/blob/986d07a758e9d1184cb355385c6460391bd238d0/src/utils/load-texture.js#L20-L63) dispatches by Basis/KTX2/image content type.

Portable Allworld seam: this maps to `src/scene/models/gltf-source.ts:44-64` and `src/scene/models/scene-models.ts:340-435`, but Allworld’s current street fixture is only 438 triangles and its body is skinned. **Reject blanket adoption:** benchmark a larger static venue mesh before BVH construction, and treat KTX2 as an asset/runtime experiment with fallback. Hubs’s `MeshBVH` path is not evidence that a BVH belongs on Allworld’s 9,002-triangle skinned body; a specialized `SkinnedMeshBVH` has a separate refit cost and API maturity caveat recorded in `rendering.md`.

## What to reject

Do not port Hyperfy’s or Hubs’s world/entity engine into Allworld. Hyperfy is GPL-3.0 and Hubs is MPL-2.0; their code ownership, asset contracts, networking models, and renderer lifecycle differ from Allworld’s Vue/Three scene modules. Do not copy avatars, sample worlds, GLBs, textures, or uploaded media without separate asset-license review. Do not replace Allworld’s on-demand render loop with a permanent world tick: both Allworld and its current mobile constraints depend on sleeping at rest.

## Finite validation plan

Use existing diagnostics and temporary fixtures only:

1. Add a temporary cursor benchmark around current crowd/model checks: compare all-per-frame scans with a bounded cursor while recording checks, render count, frame-loop duration, and visible transitions.
2. Feed a recorded remote-crowd update sequence through the existing `setCrowd` seam and compare stepped interpolation, stale-update rejection, convergence, and idle-loop shutdown.
3. Exercise one venue load with a deliberately delayed model promise and verify stand-in visibility, disposal, one redraw notification, and re-entry.
4. Run touch/pinch/joystick acceptance on the existing scene harness and record camera/position diagnostics; include reduced motion and the map/2D fallback.
5. Keep adoption conditional on measured improvement and gameplay-visible parity. The source patterns are design references, not FPS or latency claims.

## Evidence limits

The snapshots provide source and repository-license evidence, not permission for third-party assets or proof of current production behavior. Hyperfy’s snapshot is GPL-3.0 and last pushed in the recorded metadata on 2026-04-21; Hubs is MPL-2.0 and last pushed 2026-08-23. Their internal APIs may change after the pins. No Allworld runtime trace, network packet capture, or device matrix was available for this research unit, so no performance gain is claimed.
