# Agent work record

## Identity

- **Work ID:** `2026-10-19-photo-worlds`
- **Owner:** Claude (integration session with the owner)
- **Model / effort:** see session
- **Thread:** local
- **UTC updated:** 2026-10-19T13:30:00Z (live 13:25Z)
- **Status:** `complete`
- **Work state:** `deployment`

## Goal and boundaries

- **Goal:** "Walk into a photo": a player picks a photo; their own device estimates its depth and builds a solid 3D model of the scene; a link-only world is made around it and they walk in where the camera stood.
- **In scope:** depth on the device (Depth Anything V2 Small, Apache-2.0, run by onnxruntime-web, MIT), both served from the model store by hash; the photo-to-mesh and GLB writer; solid (trimesh) models and a start point in a world; the Worlds app button and sheet; the setting `spacesPhotoWorlds`; telemetry `photo_world`; docs.
- **Out of scope:** 360° photos (next step), server-side depth, any paid service, `src/scene/**`, `src/street/**` and the other NPC-thread paths.
- **Exclusive file ownership:** `src/spaces/photo/**`, `server/spaces/depth.ts`, `server/spaces-depth.test.ts`, `src/app/features/worlds/PhotoWorldSheet.vue`, `scripts/spaces/depth-assets.ts`; shared edits in `src/spaces/world/physics.ts`, `src/spaces/world/space.ts`, `src/spaces/world/engine.ts`, `src/app/features/worlds/WorldsApp.vue`, `server/routes/spaces.ts`, `server/routes/spaces-mod.ts`, `server/routes/growth-mod.ts` (operator check split out, no behaviour change), `server/spaces/worlds.ts`, `src/types/*.ts`, `src/telemetry/events.ts`, `docs/WORLDS.md`, `NOTICE.md` (new lines only).
- **Input contract:** main at `5ca9ad22a`; Worlds (docs/WORLDS.md) live.
- **Output contract:** a PR, CI green, released behind the setting; the depth files in R2 under `glb/<sha256>`.
- **Dependencies:** `spacesWorlds`, `spacesModels`, R2 bucket `allworld`.

## Repository state

- **Repo:** kromate/joinallworld, a separate clone (not the owner's main checkout)
- **Host:** owner's Mac
- **Branch / worktree:** `claude/photo-worlds`
- **Base:** `5ca9ad22a`
- **Port/process ownership:** dev server on 5210 when testing; stopped when done.

## Progress

### Done and exact evidence

- Photo to place: `src/spaces/photo/mesh.ts` (ground fit, level, scale, flat ground, coarse collider), `exif.ts` (lens angle), `glb-write.ts`, `depth.ts` (onnxruntime-web from `/api/spaces/depth/*`). Tests: `src/spaces/photo/photo.test.ts` (7), `server/spaces-depth.test.ts` (3).
- Browser, open-mode server on 5211: a room photo of a wall says "ground is a guess"; a living room and a street both build in about 4 to 6 s (41 MB from the local store), a Huge link-only world is made, the visitor starts at the photo's near edge, walks about 7 m up the street and is stopped by the right-hand building (Rapier contact normal -0.99 x on the photo's collider).
- Problems found and fixed on the way: re-centring of models put the start outside the world's fence (photo now placed in the middle); the start hook ran before the layout arrived (now also after `setModels`); the walker snagged on the photo's ground (the ground is now the world's own; only what stands up collides, with internal-edge fixing).
- Typecheck clean; build and `size:download` pass with no change to startup budgets; no `.wasm`/`.onnx` in `dist`.
- R2 through wrangler failed (the OAuth login has no R2 write scope), so the operator route `POST /api/mod/spaces/depth/:name` stores the files on the live server after checking their SHA-256.

### Live (19 Oct)

- PR #54 merged as `d6c1655db`; release 39256737401 passed; `/api/health` shows `joinallworld-d6c1655db…`.
- The three files stored through `POST /api/mod/spaces/depth/:name` (each answered `stored`); `spacesPhotoWorlds` switched on (200).
- Private tab on joinallworld.com: the worlds list answers `photo: true`; `ort.mjs` and `ort.wasm` answer 200 with their types, kept a week; onnxruntime-web and the model ran on a test picture (depth 280×392) in 33 s including the first 41 MB download; the Worlds app shows Walk into a photo and tells a guest to sign in.
- Release continuity: ok for both identities. Live smoke: blocked by the new-session limit for this network (rerun queued); not a code failure.
- Local full `npm test`: the failures seen (agents doc list, multi-city saves, civic, comeback digest, cartridges, Worker city references, crowd positions) also fail on the base commit locally; CI's full plan passes on main.

### Next steps

- Owner: sign in on joinallworld.com, Phone → Worlds → Walk into a photo, pick a phone photo, walk in.
- Later: 360° photos; a cover drawn for photo worlds.

## Release state

- **Local implementation:** `verified-local`
- **Deployment:** `verified` (behind `spacesPhotoWorlds`, on)

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-19T12:30Z | active | Registered; owner said "implement it" | — | build |
| 2026-10-19T13:30Z | verified-local | Built and walked in the browser | tests above, screenshots in T3 browser artifacts | PR, release, files, switch |
| 2026-10-19T13:25Z | live | d6c1655db live, files stored, setting on, model ran on live | release 39256737401, continuity ok | owner's signed-in try; smoke rerun |
