# Spaces in 3D: your own models, a real walk-through, physics and your own code

A player's home or group room (a Space, docs/SPACES.md) becomes a place they can walk through in 3D. They fill it with models they
made themselves (GLB files), objects fall, roll and stack, and they can write small scripts that bring it to life: a door that
opens, a ball game, a light show. Everything below ships behind a setting, off until an operator turns it on.

## What the owner decided (18 Oct 2026)

| Question | Decision |
|---|---|
| Player code | Runs in a sandbox: a frame with no access to the account, money, other players' data or the network. It moves its own objects and reads input through a small API. A runaway script freezes only its own frame and is stopped. |
| Where uploaded models appear | Only in the uploader's own spaces (their home, the group rooms they may edit) and in what those spaces run. The street and the cities are unchanged. |
| Storage | Cloudflare R2, bucket `allworld` (keys `glb/<sha-256>`). The Node host keeps files on disk beside its data. |
| Realism | Image-based lighting, soft shadows, filmic tone mapping and physically based materials; a real physics engine; first- and third-person walking. The 3D space page may be as large as it needs: the first download and the scene host stay where they are. |

## Phases

Each phase is its own branch (`claude/spaces3d-phaseN`), pull request, CI run and release, behind its own setting.

1. **Models library** (`spacesModels`). Upload a `.glb` (at most 20 MB, 200,000 triangles, 16 textures of at most 4096 px),
   checked byte by byte on the server: glTF 2.0 binary only, every buffer and image inside the file (no outside links), only the
   extensions three.js draws, a name that passes the text filter. Stored by content hash, so the same file is kept once. A player
   keeps at most 30 models (300 MB). Players may report a model; an operator can remove it. Erased with the player.
   The flow ends in the house: after an upload, **Put it in my house** opens Walk in 3D with the model set down in front of the
   player, chosen, to drag where it should stand and Save. Walk in 3D's Place models panel has its own **Upload a .glb**, so a
   player already inside never leaves. Houses shows the house as this screen builds it (`housePhoto.ts`), not a drawing of it.
2. **Walk in 3D** (`spaces3d`). A new lazy screen draws a space from its plan: walls, floors, doors, stairs, the furniture
   (the housing studio's models where they exist) and the player's own models, with the realistic renderer. Walk with a stick and
   drag to look (phone) or WASD and the mouse (computer); first or third person. Place, move, turn and scale your own models in
   the space; the layout is saved with the space as optional fields.
3. **Physics**. Rapier (Apache-2.0) in the 3D screen only. Walls, floors and furniture are solid; the walker is a capsule that
   climbs stairs; a model marked "loose" falls, rolls, stacks and can be pushed, picked up and thrown.
4. **Your own code** (`spacesScripts`). A script (JavaScript, at most 32 KB) belongs to a space. It runs in a sandboxed frame
   served with its own strict policy (no network, no storage, opaque origin), inside a worker the frame stops when a tick
   overruns. The API: find objects by name, move and turn them, push them, read the walker's input and position, show a line of
   text (filtered), play a built-in sound, keep a score. Starter scripts show each part.
5. **Together**. Visitors walk the space at the same time: each sees the others, and the space's objects and script state are
   relayed from one host (the owner, or the first visitor) to everyone through a new socket module, at most 10 updates a second.

## Rules that do not change

- Nothing a player uploads or writes runs anywhere but the sandbox, and nothing in a model file is ever run.
- Player words shown to others (model names, script lines) pass `server/moderation/text.ts`.
- No new money: placing a model is free, and nothing is bought with real money.
- Stored data only gains optional fields, and every new record is erased with the player.
- The first download (startup) and the scene host keep their budgets; the 3D space page is its own lazy chunk.
- `src/scene/**` and the other paths owned by the world NPC programme are not edited; `src/housing-studio/**` is read, never changed.

## Writing a space's script (phase 4)

Open a space you own (or a group room you are a member of) in 3D and tap **Code**. Start from a starter, change it, **Run** it to try,
**Save** it so everyone who walks in runs it. A script is JavaScript; it sees one object, `space`:

| Call | What it does |
|---|---|
| `space.find('Chair')` | A placed model by its name (the second copy of a model is `'Chair 2'`), or `null` |
| `space.all()` | Every placed model |
| `space.on('start', fn)` · `space.on('tick', (dt, t) => …)` · `space.on('tap', (thing) => …)` | Run when the script starts, about 30 times a second, and when a player taps a model |
| `thing.moveTo(x, y, z)` · `thing.moveBy(dx, dy, dz)` | Move a model (metres; `x` across the plot, `y` up, `z` down the plot) |
| `thing.turnTo(degrees)` · `thing.turnBy(degrees)` | Turn it |
| `thing.push(x, y, z)` | Push a loose model (metres a second) |
| `thing.color('#ff8800')` · `thing.hide()` · `thing.show()` | Tint, hide or show it |
| `thing.x`, `.y`, `.z`, `.turn`, `.loose`, `thing.distanceToWalker()` | Where it is |
| `space.walker` | Where the player is: `{ x, y, z, yaw }` |
| `space.say(0, 5)` | Show line 0 of the space's lines, with `{1}` filled by 5 |
| `space.score(n)` · `space.sound('ding')` | Show a score; play `ding`, `pop`, `whoosh`, `cheer` or `buzz` |

**Words.** A script can show only the lines saved with it, and the server filters each line when the script is saved (no links, phone
numbers or blocked words). A line may hold up to four numbers, written `{1}` to `{4}`.

**Safety.** The script runs on each visitor's device inside a sandboxed frame (an opaque origin with no cookies or storage) served with
its own policy: no network, no pictures, no frames. It runs in a worker that is stopped when one step takes longer than 300 ms, so an
endless loop stops only the script. Every move it asks for is checked before it happens: only the space's own models, only within
60 metres of the plot, only known sounds. It never sees the player's account, money or messages.

## Worlds

A player's own world — open ground of a chosen size and surface, their models, their script, friends by a link, open worlds listed for
everyone — is the same screen with no house: docs/WORLDS.md.

## Together (phase 5)

Everyone who opens the same space in 3D is in it together (at most 16). Each sees the others walk about, with their names; the space's
models move the same for everyone. One device is the **host**: the owner of a home when they are in it, otherwise whoever came in
first, and the next one when they leave. The host runs the space's script and its physics and sends where the models are, the score
and any line the script shows; the others follow. Only the host can pick up and throw loose models. A newcomer is told where
everything is at once.

Each device sends one small tick at most six times a second, and only when something changed (`server/ws/spaces.ts`; every player
has 600 socket frames a minute in all). Nothing of this is stored: when the last person leaves, the space starts from its saved
layout again.
