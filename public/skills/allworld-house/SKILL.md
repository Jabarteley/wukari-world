---
name: allworld-house
description: Copy a person's real house into Allworld (joinallworld.com), the browser life game, from photos of it, so they can walk through it in 3D and invite friends over. Use it when someone asks to recreate, model or copy their house, flat or home for Allworld, or to build a world or a game in Allworld.
---

# Copy my real house into Allworld

You turn photos of a real house into a house in Allworld. The player walks through it in 3D, furnishes it and invites friends over.
You do the work on the player's side (their AI subscription or local model), so be as detailed as the photos allow. Only the finished
house reaches the game; the photos stay with you and the player.

Two results are possible. Make the best one your tools allow:

| You have | You make | It goes into the game by |
|---|---|---|
| Blender (or another 3D tool) and can run scripts | a **.glb of the whole house**, inside and out | `scripts/upload.mjs` with the player's agent key, or the player uploads it in Houses → Copy my real house |
| Only chat (no Blender) | a **house description** (JSON) | the player pastes it in Houses → Copy my real house → Paste a house description |

Every file this skill names is next to this one: `reference/…` and `scripts/…`. Fetch them from the same address as this file.

## Steps

1. **Ask for photos.** Send the player `reference/photos.md` (the checklist): the front, back and both sides from across the street or
   yard, the roof line, every room from two opposite corners, close-ups of the front door and a window, and a tape-measure shot per
   room if they can. Ask which floor each room is on and which way the front door faces. Ask for the outside size if they know it.
2. **Read every photo** and work out the plan: storeys, the outside width and depth, each room's place and size on its floor, where
   every door and window is, the stairs, the roof shape, and the colours of the walls, roof, door and each floor. When a size is not
   known, estimate from doors (about 0.9 m wide, 2.1 m high) and steps (about 18 cm each).
3. **Write `house.json`** exactly as `reference/house-spec.md` says, and check it against the worked example there. Keep room names
   short and generic ("Bedroom 2", not a person's name).
4. **Chat only:** stop here. Give the player `house.json` in one code block and tell them: Houses → Copy my real house → 2. Paste a
   house description → Build my house → Walk into my house. With the agent key and the MCP server connected you may send it yourself:
   `call_api POST /api/spaces/house { "spec": … }` (descriptions over 8 KB: use `scripts/upload.mjs --spec house.json`).
5. **With Blender:** build the shell from the description, then make it look like the photos.
   - `blender --background --python scripts/build_house.py -- house.json house.blend` builds clean walls, floors, ceilings, doors,
     windows, stairs, the roof and the extras, in metres, in the game's orientation, with an `allworld_spawn` marker at the front door.
   - Open `house.blend` and improve it from the photos: textures from the photos on the outside walls (`scripts/project_photos.py`),
     tiles, skirting, the real gate and fence, steps, burglar bars, a water tank, built-in wardrobes, a kitchen counter. Keep loose
     furniture as separate small models if the player wants to move them in the game.
   - Follow `reference/blender.md`: 1 unit = 1 metre, the front wall along X at Y = 0 with the house towards −Y, Z up; keep within
     `reference/limits.md` (decimate, 2048 px pictures, WebP).
6. **Export** `house.glb` (glTF binary, +Y up, WebP or JPEG pictures, meshopt or no compression, never Draco) and run
   `node scripts/check_model.mjs house.glb --house` until it says it passes.
7. **Upload.** With the player's agent key (Allworld → Settings → AI agents → Make a key; it starts with `awk_`):
   `node scripts/upload.mjs house.glb --house --name "Our house" --key awk_…` uploads it and makes it their house. Without a key, tell
   the player: Houses → Copy my real house → 3. Upload a whole house.
8. **Hand over.** Tell the player to press **Walk into my house**, look round, and press **Invite** to bring friends over.

## Worlds and games

The same key lets you build a whole world for the player: `call_api POST /api/spaces/worlds { name, size, ground, open, sky, template }`
(templates: empty, hangout, treasure, race, obby, island), upload models with `scripts/upload.mjs model.glb --name Tree` (no `--house`),
place them with `call_api POST /api/spaces/world/layout { target: "world", id, models: [...] }` and give it a script with
`call_api POST /api/spaces/world/script { target: "world", id, code, lines }`. The script API and starters: `reference/worlds.md`.

## Rules

- Follow `reference/privacy.md`: no house numbers, street names, signs, faces, car plates or documents in a model or a description.
- Never put the agent key in a file, a model, a description or a message to anyone but the player. They can revoke it in Settings.
- Game naira only; this costs nothing in the game.
- A model is data only. Nothing in it runs.
