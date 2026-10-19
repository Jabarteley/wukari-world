# Copy my real house: from photos to a house in the game

A player takes a few photos of their real house. An AI turns them into a 3D house. The house stands on their plot in the game, they
can open it in Blender to touch it up, and their friends come over to it. Owner's request, 19 Oct 2026: "model my real house by taking
pictures and giving it to an AI model ... recreate the house in Blender or whatever tool ... import it to the game and invite my
friends over."

## Two ways to build it, and why both

| | A. Photo to plan (default) | B. Photo to model (detailed) |
|---|---|---|
| How | A vision model reads the photos and fills a house description: storeys, width and depth, roof shape, colours, windows per side, door, porch, fence and gate. The game builds the house from it with the clean geometry it already draws (`src/spaces/world/space.ts`). | Meshy's multi-image-to-3D API (the owner's account, `MESHY_API_KEY`) turns the photos into a textured .glb of the outside of the house. |
| Looks | Straight walls and clean edges, in the game's style; the colours and shape of the real house, not its every detail. | Close to the photos, but generated meshes have soft, lumpy edges (the owner rejected that look for street buildings on 11 Oct). |
| Inside | Real rooms the player walks into and furnishes; physics and stairs work. | A shell. The player walks round it; the inside is the game's own house, entered by the door. |
| Edit | Change any field in a form, or in Blender after export. | Download the .glb, edit in Blender, upload it again. |
| Cost and time | A fraction of a US cent, a few seconds. | Meshy credits per house, one to three minutes. Measured on the first runs. |

Recommendation: A for everyone, B as "More detail" for signed-up players, a few a day.

## The flow

1. Houses → **Copy my real house**. A sheet asks for one to four photos: the front (needed), a side, the back, and optionally a wide shot. Tips on screen: stand back, daylight, no people or car plates.
2. On the phone, before anything is sent: each photo is shrunk to 1024 px and re-encoded as JPEG, which drops the location and camera data (EXIF).
3. The server makes a job and answers at once. The sheet shows "Building your house…" and the player can close it; a notice says when it is ready.
4. **A** returns a house description. The sheet shows the house built from it (the same photo-style picture the Houses page already draws), with a form to fix anything, then **Use this house**.
5. **B** returns a .glb. It goes into My 3D models (it counts as one of the player's 30), and **Put it on my plot** sets it down where the house stands, with the game's own house hidden under it.
6. **Open in Blender**: every model in My 3D models gets **Download .glb**. The player edits it in Blender (or any tool) and uploads it again with **Replace**: everywhere it stands updates.
7. **Invite friends over**: the existing Invite on the Houses page and the 3D screen. Visitors see the copied house; the owner hosts, as today.

## Implementation

**Shared (pure)**
- `src/spaces/house-spec.ts` (new): `HouseSpecV1` (storeys 1 to 3; width and depth in metres within the plot; roof flat, gable or hip; wall, roof, door, window and trim colours as hex; windows per side; door side and offset; porch, balcony, fence, gate) and `cleanHouseSpec`, which clamps every field and fills safe defaults. Tests.

**Server**
- `server/models/router.ts`: `AskInput.images?` (JPEG bytes) for vision-capable paid models that keep no data; refused with "resting" when none is configured. Tests with a fake provider.
- `server/spaces/house-scan.ts` (new): `POST /api/spaces/house-scan?mode=plan|model` (up to four JPEGs, 600 KB each), `GET /api/spaces/house-scan` (the player's jobs), `POST /api/spaces/house-scan/use { id }`. Jobs in `spaces.scans[id]` `{ by, mode, status, at, spec?, model?, why? }`. Photos are held only while the job runs and deleted when it ends; never stored with the player, never shown to anyone.
  - Plan: one router call with the photos and a prompt that asks for `HouseSpecV1` JSON; `cleanHouseSpec` checks it.
  - Model: Meshy multi-image-to-3D with a target of about 100,000 triangles; the server polls the task (on the heartbeat, as the model sweep does), downloads the .glb, runs `checkGlb` and stores it as the player's model through the existing upload path.
- `spaces.homes[publicId].spec` (optional field): the house description in use. `server/spaces/world.ts` sends it with the home.
- `POST /api/spaces/models/replace { id }` with a new .glb: same id, new hash, so every placement updates.
- Limits: plan 5 a day, model 2 a day per player, a server-wide daily cap; model mode needs a trusted account (as uploads do). Settings `spacesHouseScan` and `spacesHouseScanModel`, off by default. `MESHY_API_KEY` as a Worker secret, read only by this module, never logged.
- Erasure: scans and the spec go with the player (`eraseSpaces`).

**Page**
- `src/app/features/spaces/ScanSheet.vue` (new): photo picker with the four slots, shrink and re-encode, progress, the result and the form.
- `src/spaces/world/space.ts`: build the outside from a `HouseSpecV1` when the home has one (storeys, footprint, roof shapes, window rows, porch, fence); the rooms inside follow the existing plan for that size.
- `housePhoto.ts`: the Houses picture uses the spec, so the page shows the copied house.
- My 3D models: **Download .glb** and **Replace**; Walk in 3D: **Use as my house** on a placed model hides the game's shell under it.
- Events: `house_scan_started { mode }`, `house_scan_done { mode, ok }`, `house_scan_used { mode }`.

**Privacy (SECURITY.md gains a section)**
- A real house can identify where someone lives. Photos are stripped of location on the phone, kept only while the job runs, and sent only to the configured model provider (and Meshy in model mode). The finished house is shown only where the player's game house already is. The sheet says this in plain words before the first photo.

## Checks before release
- Unit tests for the spec, the router images path, the scan routes (fake provider, fake Meshy), replace and erasure.
- On an open-mode server: three real houses photographed by the owner, both modes, timed and costed; the result walked in 3D with a second player visiting.

## Decisions for the owner
1. Default mode: A (clean, cheap) with B as "More detail", or B for everyone?
2. Meshy credits: how many a day the game may spend, and whether model mode needs a paid boost later.
3. Vision model: which provider the router may send house photos to (paid, keeps no data).
