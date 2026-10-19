# Copy my real house: your own AI builds it, the game hosts it

A player photographs their real house, outside and every room inside, and hands the photos to **their own AI** (Claude, ChatGPT, Codex,
a local model) with the **Allworld house skill**. The skill tells the AI exactly what to do: read the photos, build the house in Blender,
check it against the game's limits, and put it on the player's plot. Then the player invites friends over, as today.

Owner's direction, 19 Oct 2026: "copy a script or skill and have their local AI or local sub handle it. This would lead to better
models and games and save us the cost. The skill file would instruct the agent on what to do. They can be as detailed as possible
about their house, with multiple pictures of the interior."

## Why the player's own AI

- **Cost.** The player's subscription or local model does the expensive work (vision, modelling, many tries). Allworld pays only to
  store and serve the .glb, as it does for any upload.
- **Quality.** An agent with Blender and time can take 30 photos, measure rooms, model every wall and door, project the photos onto the
  walls as textures, and try again until it looks right. A one-shot server call cannot.
- **Privacy.** Photos of a real home stay on the player's computer. Only the finished model reaches the game.
- **The same skill makes games.** The existing skill (`skills/allworld-spaces/`) already teaches an AI to design rooms and make lite
  games; this adds houses and worlds, so players' AIs build the content.

## Three ways in, cheapest for Allworld first

| Way | Who it is for | What the AI produces | What the game does |
|---|---|---|---|
| **1. Full build** | Claude Code, Codex or a local agent on a computer with Blender | A finished `.glb` of the whole house, inside and out | Uploads it through the agent key, sets it as the house |
| **2. Chat only** | Claude or ChatGPT in the app or browser, no Blender | A **house description** (JSON: storeys, rooms with sizes, doors, windows, roof, colours) | The player pastes it; the game builds the house from it with its own clean walls |
| **3. In the game** (later, optional) | Players with no AI of their own | The same house description, made by Allworld's server from up to four photos | Same as 2; costs Allworld a fraction of a cent a house |

Ways 1 and 2 cost Allworld nothing beyond storage. Way 3 waits until 1 and 2 are live and measured.

## The skill: `skills/allworld-house/`

```
skills/allworld-house/
  SKILL.md                    what to do, step by step (below)
  reference/
    photos.md                 the photo checklist: front, back, both sides, roof line; every room from two corners; doors and windows close up; a tape-measure photo per room if possible
    house-spec.md             the house description format with a worked example (generated from src/spaces/house-spec.ts; drift-tested)
    limits.md                 the game's model limits and allowed glTF extensions (generated from src/spaces/glb.ts; drift-tested)
    blender.md                scale (1 unit = 1 metre), origin at the front-left corner at ground level, +Y up in glTF, the spawn marker, export settings, how to stay under the limits (decimate, 2048 px textures, WebP, meshopt)
    privacy.md                what never goes into a model: house numbers, street signs, faces, car plates, documents on walls
  scripts/
    build_house.py            Blender script: house.json → clean walls, floors, ceilings, stairs, door and window openings, roof, materials with UVs, the spawn marker; the AI then refines by hand
    project_photos.py         Blender script: projects a chosen photo onto a wall as its texture
    check_model.mjs           Node, no install: checks a .glb against limits.md exactly as the server does (same code, bundled)
    upload.mjs                Node: asks the game for a one-time upload link with the agent key, sends the .glb, sets it as the house
```

**What SKILL.md tells the agent to do**

1. Ask for the photos (send `reference/photos.md` to the player) and any measurements. Ask which floor is which and where the front door is.
2. Read every photo. Write `house.json` (`reference/house-spec.md`): storeys, each room with its size and floor, doors, windows, stairs, roof, colours.
3. **Chat-only AI:** stop here. Give the player `house.json` to paste in the game: Houses → Copy my real house → Paste a description.
4. **Agent with Blender:** run `build_house.py house.json` in Blender (`blender --background --python`), then improve the model with the
   photos: textures from `project_photos.py`, mouldings, the gate, the real roof. Keep it within `limits.md`. Put an empty named
   `allworld_spawn` just outside the front door.
5. Export `house.glb` (glTF binary, +Y up, WebP textures, meshopt or no compression, never Draco) and run `check_model.mjs house.glb` until it passes.
6. Upload: `upload.mjs house.glb --as-house` with the player's agent key (Settings → Agents), or tell the player to upload it in Houses → My 3D models → Upload, then **Use as my house**.
7. Optional: furniture as separate small models (`--as-model`) so the player can move them in the game.
8. Tell the player to open Houses → Walk in, check it, and press **Invite**.

## What the game must add

**Shared (pure)**
- `src/spaces/house-spec.ts`: `HouseSpecV1` and `cleanHouseSpec` (storeys 1 to 3; rooms as rectangles in metres with a floor and a name; doors and windows on walls; stairs; roof flat, gable or hip; colours as hex). Checked against the player's plot. Tests.
- `scripts/skills/build-skill-reference.ts` also writes `house-spec.md` and `limits.md`; the drift test covers them.

**Server**
- **One-time upload link**: `POST /api/spaces/models/upload-link` (session or agent key) → `{ url, expires }`, valid 10 minutes, one use, bound to the player; `POST /api/spaces/models/upload/:token` takes the bytes with no cookie (the token is the permission). Same checks, limits and hourly cap as a normal upload. MCP tool `model_upload_link`.
- **House model**: `POST /api/spaces/house-model { model | null }` sets or clears `spaces.homes[publicId].house = { m, by }` (optional field). MCP tool `set_house_model`; `list_my_models` for the agent.
- **House description**: `POST /api/spaces/house-spec { spec | null }` stores `spaces.homes[publicId].spec`. MCP tool `set_house_spec`.
- **Bigger limits for a house model** (owner's decision): today 20 MB and 200,000 triangles a model; a whole house with its rooms needs more. Proposal: a model used as a house may be 50 MB and 500,000 triangles, one per player.
- `server/spaces/world.ts` sends `house` and `spec` with the home; visitors get them too.

**3D screen**
- **House model mode**: the game's own house shell is not drawn; the model stands at the plot's corner; the walker starts at `allworld_spawn`.
  Collision must follow the real mesh (a triangle mesh, as the shell has), not the convex hull placed models get today, or the house would be
  one solid block. Game furniture is hidden in 3D in this mode; the player's own models still place as usual.
- **House description mode**: `space.ts` builds the walls, rooms, doors, windows, stairs and roof from `HouseSpecV1` with the same clean
  materials it uses now. The Houses picture (`housePhoto.ts`) follows.

**App**
- Houses → **Copy my real house** sheet with three cards:
  - **With your own AI (free)**: "Copy the instructions" (a short prompt that names the skill's address), "Download the skill" (zip served from the game), "Make an agent key" (Settings → Agents), and a link to a one-page guide with screenshots.
  - **Paste a description**: a box for `house.json`, checked by the server, shown as a picture before **Use this house**.
  - **Let Allworld do it**: way 3, shown only when its setting is on.
- My 3D models: **Use as my house** and **Download .glb** on each model.
- Events: `house_skill_copied { what }`, `house_spec_used { from }`, `house_model_used {}`.

**Settings** (off by default): `spacesHouseCopy` (the sheet, the spec and house-model modes), `spacesHouseScan` (way 3).

**Docs**: `docs/SKILLS.md` gains the house skill; `docs/AGENTS.md` the new tools; `SECURITY.md` the upload link and the privacy of house models.

## Worlds and games from the same skill

`skills/allworld-spaces/` grows a **world** section: make a world through MCP (`create_world`), upload its models with the same upload link,
save the layout and the world script (`reference/world-script.md`, the script API in docs/SPACES-3D.md), set the cover, and send the link.
A player's AI can then build a treasure hunt, a race or an obby world end to end.

## Order of work

1. `HouseSpecV1`, the paste path and the description-built house (way 2): the cheapest complete loop. About 2 days.
2. Upload link, house model mode with mesh collision, bigger house limits, Download .glb. About 2 days.
3. The skill folder: SKILL.md, references, the two Blender scripts, check and upload scripts; tried end to end with Claude Code and Blender on the owner's own house photos. About 2 days.
4. World section of the skill and the MCP world tools. About 1 day.
5. Way 3 (server photos), only if 1 to 3 leave a gap.

## Decisions for the owner

1. House model limits: 50 MB and 500,000 triangles for one house model per player?
2. Should the skill and its scripts be public (the repository is AGPL and public, so anyone can read them anyway) and linked from the landing page as a selling point ("build your real house with your own AI")?
3. Way 3 later, or not at all?
